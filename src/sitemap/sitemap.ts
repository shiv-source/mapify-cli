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

    async detectFileChangeWithGit() {
        const hasGit = await this.git.checkIsRepo()
        if (hasGit && (await this.gitHasAnyFileModified()) && !this.config.force) {
            for (const page of this.config.pages) {
                if (page.componentPath) {
                    const componentFiles = (await glob(page.componentPath)).filter(file => statSync(file).isFile())
                    const changedFiles = componentFiles.filter(f => this.filesHaveChanges.includes(f))
                    if (componentFiles.length && !changedFiles.length) {
                        const componentPathPromises = componentFiles
                            .map(f => path.resolve(this.config.appDir, f))
                            .map(p => this.gitFileLastModifiedDate(p))
                        const filesModifiedDates = await (await Promise.all(componentPathPromises)).filter(v => v != null)
                        const [latestModifiedDate] = this.sortDatesInDescendingOrder(filesModifiedDates)
                        if (latestModifiedDate) page.lastmod = latestModifiedDate.toISOString()
                    }
                }
            }
        }
        await this.createSitemap()
    }

    async writeFileIntoDirs(dirs: string[], text: string): Promise<void> {
        try {
            const dirPaths = dirs.map(dir => path.resolve(this.config.appDir, dir))
            const results = await Promise.all(dirPaths.map(p => fs.exists(p)))

            const [existsDir, notExistsDir] = results.reduce<[string[], string[]]>(
                (acc, exists, index) => {
                    if (exists) {
                        acc[0].push(dirPaths[index])
                    } else {
                        acc[1].push(dirPaths[index])
                    }
                    return acc
                },
                [[], []]
            )

            notExistsDir.forEach(dir => console.warn(`The directory "${path.relative(this.config.appDir, dir)}" does not exist.`))

            const filePromises = existsDir.map(async dir => {
                const filePath = path.resolve(dir, this.sitemapFileName)
                const outputDirPath = path.relative(this.config.appDir, dir)
                try {
                    await fs.writeFile(filePath, text, { encoding: 'utf-8' })
                    console.info(
                        `The file "${this.sitemapFileName}" has been successfully generated in "${outputDirPath}" location.`
                    )
                } catch (error) {
                    console.error(`Failed to generate the file in "${outputDirPath}":`, error)
                }
            })

            await Promise.all(filePromises)
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
