#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { AppConfig, IAppPage, IPage, SitemapConfig } from '../interface'
import { defaultInitConfigTemplate, SiteMapGenerator } from '../sitemap'

interface YargsOption {
    config: string
    init: boolean
    generate: boolean
}

export const cliArgs = (): Partial<AppConfig> => {
    const appDir: string = path.resolve('./')

    const argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 [options]')
        .options({
            config: {
                alias: 'c',
                describe: "The path to the JavaScript configuration file, default is 'mapify.config.js'.",
                type: 'string',
                default: 'mapify.config.js'
            },
            init: {
                alias: 'i',
                describe: 'Generate a mapify.config.js file for project configuration',
                type: 'boolean',
                default: false
            },
            generate: {
                alias: 'g',
                describe: 'Generate the sitemap based on the configuration',
                type: 'boolean',
                default: false
            }
        }).argv as YargsOption

    const configFilePath = path.resolve(appDir, argv.config)

    let appConfig: Partial<AppConfig> = {
        config: argv.config,
        init: argv.init,
        generate: argv.generate,
        configFilePath,
        defaultChangeFreq: 'monthly',
        defaultPriority: 0.7,
        force: false,
        appDir
    }

    if (argv.init) {
        // Generate the default configuration file if `init` flag is provided
        fs.writeFileSync(configFilePath, defaultInitConfigTemplate, 'utf8')
        console.info(`The configuration file "${argv.config}" has been created successfully.`)
        return appConfig
    }

    if (argv.generate) {
        try {
            if (fs.existsSync(configFilePath)) {
                const userConfig: SitemapConfig = require(configFilePath)

                // Validate the user-provided configuration
                validateConfig(userConfig)

                const pages: IAppPage[] = userConfig.pages.map((p: IPage) => ({ ...p, lastmod: new Date().toISOString() }))

                appConfig = {
                    ...appConfig,
                    baseUrl: userConfig.baseUrl,
                    outputPaths: userConfig.outputPaths,
                    pages,
                    defaultChangeFreq: userConfig.defaultChangeFreq ?? appConfig.defaultChangeFreq,
                    defaultPriority: userConfig.defaultPriority ?? appConfig.defaultPriority,
                    force: userConfig.force ?? appConfig.force
                }

                // Proceed with the sitemap generation logic...
                const siteMapGenerator = new SiteMapGenerator(appConfig as AppConfig)
                siteMapGenerator.init()
            } else {
                throw new Error(`The configuration file "${argv.config}" was not found at the path "${configFilePath}".`)
            }
        } catch (error) {
            console.error('Error:', (error as Error).message || error)
            process.exit(1)
        }
    }

    return appConfig
}

// Validation function to ensure the required fields are present in the configuration
const validateConfig = (config: SitemapConfig) => {
    if (!config.baseUrl) {
        throw new Error(`"baseUrl" is required. e.g., 'http://example.com'`)
    }

    if (!config.outputPaths || config.outputPaths.length === 0) {
        throw new Error(`"outputPaths" is required. e.g., ['./dist']`)
    }

    if (!config.pages || config.pages.length === 0) {
        throw new Error(
            `"pages" is required. e.g.,\n{\n  path: '/',\n  priority: 0.8,\n  componentPath: './src/app/pages/home/**'\n}`
        )
    }

    // Validate each page entry in the configuration
    config.pages.forEach((page: IPage, index: number) => {
        if (!page.path) {
            throw new Error(`"path" is required for page at index ${index}.`)
        }
        if (typeof page.priority !== 'number' || page.priority < 0 || page.priority > 1) {
            throw new Error(`"priority" should be a number between 0 and 1 for page at index ${index} at ${page.path}.`)
        }
        if (!page.componentPath) {
            throw new Error(`"componentPath" is required for page at index ${index}.`)
        }
    })
}
