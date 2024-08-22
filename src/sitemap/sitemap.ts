import fs, { statSync } from 'fs-extra'
import { glob } from 'glob'
import path from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { AppConfig, IAppPage } from '../interface'

const changeFreqList = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']

export class SiteMapGenerator {
    config: AppConfig
    git: SimpleGit
    sitemapFileName: string = 'sitemap.xml'
    filesHaveChanges: string[] = []

    constructor(config: AppConfig) {
        this.config = config
        this.git = simpleGit()
    }

    init() {
        this.detectFileChangeWithGit()
    }

    async gitHasAnyFileModified(): Promise<boolean> {
        const status = await this.git.status()
        this.filesHaveChanges = status.files.map(f => f.path)
        return status.modified.length > 0 || status.deleted.length > 0 || status.created.length > 0 || status.renamed.length > 0
    }

    async gitFileLastModifiedDate(filePath: string): Promise<Date | null> {
        const log = await this.git.log({ file: filePath, n: 1 })
        return log.latest ? new Date(log.latest.date) : null
    }

    sortDatesInDescendingOrder(dates: Date[]): Date[] {
        return dates.sort((a, b) => b.getTime() - a.getTime())
    }

    async detectFileChangeWithGit(): Promise<void> {
        const isGitRepo = await this.git.checkIsRepo()
        if (isGitRepo && !this.config.force) {
            await this.gitHasAnyFileModified()
            for (const page of this.config.pages) {
                if (page.componentPath) {
                    const componentFiles = (await glob(page.componentPath)).filter(file => statSync(file).isFile())

                    // Check for changed files
                    const changedFiles = componentFiles.filter(file => this.filesHaveChanges.includes(file))

                    if (componentFiles.length > 0 && changedFiles.length === 0) {
                        const fileModificationPromises = componentFiles.map(async (file: string) => {
                            const fullPath = path.resolve(this.config.appDir, file)
                            return this.gitFileLastModifiedDate(fullPath)
                        })

                        const modifiedDates = (await Promise.all(fileModificationPromises)).filter(date => date != null)
                        const [latestModifiedDate] = this.sortDatesInDescendingOrder(modifiedDates)
                        if (latestModifiedDate) page.lastmod = latestModifiedDate.toISOString()
                    }
                }
            }
        }

        await this.createSitemap()
    }

    async writeFileIntoDirs(dirs: string[], text: string): Promise<void> {
        try {
            const dirPaths = dirs.map((dir: string) => path.resolve(this.config.appDir, dir))
            const dirChecks = await Promise.all(dirPaths.map(async (dir: string) => ({ dir, exists: await fs.exists(dir) })))

            const [existingDirs, missingDirs] = dirChecks.reduce<[string[], string[]]>(
                (acc, { dir, exists }) => {
                    exists ? acc[0].push(dir) : acc[1].push(dir)
                    return acc
                },
                [[], []]
            )

            missingDirs.forEach(dir => console.warn(`The directory "${path.relative(this.config.appDir, dir)}" does not exist.`))

            const writePromises = existingDirs.map(async (dir: string) => {
                const filePath = path.resolve(dir, this.sitemapFileName)
                const relativePath = path.relative(this.config.appDir, dir)
                try {
                    await fs.writeFile(filePath, text, { encoding: 'utf-8' })
                    console.info(`The file "${this.sitemapFileName}" has been successfully generated in "${relativePath}".`)
                } catch (error) {
                    console.error(`Failed to generate the file in "${relativePath}":`, error)
                }
            })

            await Promise.all(writePromises)
        } catch (error) {
            console.error('An error occurred while writing files:', error)
            throw error
        }
    }

    async createSitemap(): Promise<void> {
        const sitemapStr = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${this.config.pages
        .map(
            (page: IAppPage) => `<url>
        <loc>${this.config.baseUrl}${page.path}</loc>
        <lastmod>${page.lastmod}</lastmod>
        <priority>${page?.priority ?? this.config.defaultPriority}</priority>
        <changefreq>${changeFreqList.includes(page.changeFreq ?? '') ? page.changeFreq : this.config.defaultChangeFreq}</changefreq>
    </url>`
        )
        .join('')}
</urlset>
`
        await this.writeFileIntoDirs(this.config.outputPaths, sitemapStr)
    }
}
