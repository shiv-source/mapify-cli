import { ChangeFreq } from './changeFreq.interface'

export interface IPage {
    path: string
    priority: number
    changeFreq?: ChangeFreq
    componentPath?: string
}

export interface SitemapConfig {
    defaultChangeFreq?: ChangeFreq
    defaultPriority?: number
    force?: boolean
    baseUrl: string
    outputPaths: string[]
    pages: IPage[]
}
