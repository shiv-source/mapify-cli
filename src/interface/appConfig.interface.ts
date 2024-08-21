import { IPage, SitemapConfig } from './sitemapConfig.interface'

export interface IAppPage extends IPage {
    lastmod: string
}

export interface AppConfig extends SitemapConfig {
    config: string
    init: boolean
    generate: boolean
    configFilePath: string
    appDir: string
    pages: IAppPage[]
}
