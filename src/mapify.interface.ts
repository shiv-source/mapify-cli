export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface IPage {
    path: string
    priority: number
    changeFreq?: ChangeFreq
    componentPath?: string
}

export interface MapifyConfig {
    baseUrl: string
    outputPaths: string[]
    pages: IPage[]
    defaultPriority?: number
    defaultChangeFreq?: ChangeFreq
    forceLastModificationDate?: boolean
}

export interface MapifyCliOption {
    config: string
    init: boolean
    generate: boolean
}

export type PageArray = Array<IPage & { lastmod: string }>
