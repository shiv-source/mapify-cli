import fs, { statSync } from 'fs-extra'
import { glob } from 'glob'
import path from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { changeFreqList } from './mapify.constant'
import { ChangeFreq, IPage, MapifyConfig, PageArray } from './mapify.interface'

export class Mapify {
    mapifyConfig: MapifyConfig
    git: SimpleGit
    sitemapFile = 'sitemap.xml'
    defaultPriority = 0.7
    defaultChangeFreq: ChangeFreq = 'monthly'
    forceLastModificationDate: boolean = false
    generateRobotsTxt: boolean = true
    appDir: string

    constructor(mapifyConfig: MapifyConfig) {
        this.mapifyConfig = mapifyConfig
        this.mapifyConfig.defaultPriority = this.mapifyConfig?.defaultPriority ?? this.defaultPriority
        this.mapifyConfig.defaultChangeFreq = this.mapifyConfig?.defaultChangeFreq ?? this.defaultChangeFreq
        this.mapifyConfig.forceLastModificationDate =
            this.mapifyConfig?.forceLastModificationDate ?? this.forceLastModificationDate

        this.git = simpleGit()
        this.appDir = path.resolve('./')
    }

    initialize(): void {
        this.detectFileChangeWithGit()
    }

    async gitHaveAnyFileChanges(): Promise<{ isAnyChanges: boolean; filesHaveChanges: string[] }> {
        const status = await this.git.status()
        const filesHaveChanges = status.files.map(file => file.path)
        const isAnyChanges =
            status.modified.length > 0 || status.deleted.length > 0 || status.created.length > 0 || status.renamed.length > 0
        return { isAnyChanges, filesHaveChanges }
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
        const pages: PageArray = this.mapifyConfig.pages.map((page: IPage) => ({
            ...page,
            lastmod: new Date().toISOString()
        }))

        if (isGitRepo && !this.mapifyConfig.forceLastModificationDate) {
            for (const page of pages) {
                if (page.componentPath) {
                    const { filesHaveChanges } = await this.gitHaveAnyFileChanges()
                    const componentFiles = (await glob(page.componentPath)).filter(file => statSync(file).isFile())

                    // Resolve paths to absolute before comparison
                    const resolvedFilesHaveChanges = filesHaveChanges.map(file => path.resolve(this.appDir, file))

                    const changedFiles = componentFiles.filter(file =>
                        resolvedFilesHaveChanges.includes(path.resolve(this.appDir, file))
                    )

                    if (componentFiles.length > 0 && changedFiles.length === 0) {
                        const fileModificationPromises = componentFiles.map(async (file: string) => {
                            const fullPath = path.resolve(this.appDir, file)
                            return this.gitFileLastModifiedDate(fullPath)
                        })

                        const modifiedDates = (await Promise.all(fileModificationPromises)).filter(date => date != null)

                        if (modifiedDates.length) {
                            const [latestModifiedDate] = this.sortDatesInDescendingOrder(modifiedDates)
                            page.lastmod = latestModifiedDate.toISOString()
                        }
                    }
                }
            }
        }

        await this.generateSitemapFile(this.mapifyConfig.baseUrl, pages)
    }

    async writeFileIntoDirs(dirs: string[], fileName: string, text: string): Promise<void> {
        try {
            const dirPaths = dirs.map((dir: string) => path.resolve(this.appDir, dir))
            const dirChecks = await Promise.all(dirPaths.map(async (dir: string) => ({ dir, exists: await fs.exists(dir) })))

            const [existingDirs, missingDirs] = dirChecks.reduce<[string[], string[]]>(
                (acc, { dir, exists }) => {
                    exists ? acc[0].push(dir) : acc[1].push(dir)
                    return acc
                },
                [[], []]
            )

            missingDirs.forEach(dir => console.warn(`The directory "${path.relative(this.appDir, dir)}" does not exist.`))

            const writePromises = existingDirs.map(async (dir: string) => {
                const filePath = path.resolve(dir, fileName)
                const relativePath = path.relative(this.appDir, dir)
                try {
                    await fs.writeFile(filePath, text, { encoding: 'utf-8' })
                    console.info(`The file "${fileName}" has been successfully generated in "${relativePath}".`)
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

    async generateSitemapFile(baseUrl: string, pages: PageArray): Promise<void> {
        const sitemapStr = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages
        .map(
            page => `<url>
        <loc>${baseUrl}${page.path}</loc>
        <lastmod>${page.lastmod}</lastmod>
        <priority>${page.priority}</priority>
        <changefreq>${changeFreqList.includes(page.changeFreq ?? '') ? page.changeFreq : this.defaultChangeFreq}</changefreq>
    </url>`
        )
        .join('')}
</urlset>
<!-- XML sitemap generated by mapify-cli -->
`
        await this.writeFileIntoDirs(this.mapifyConfig.outputPaths, this.sitemapFile, sitemapStr)
    }
}
