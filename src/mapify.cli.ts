#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Mapify } from './mapify'
import { changeFreqList, mapifyInitConfigTemplate } from './mapify.constant'
import { IPage, MapifyCliOption, MapifyConfig } from './mapify.interface'

export const mapifyCli = () => {
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
        }).argv as MapifyCliOption

    const configFilePath = path.resolve(appDir, argv.config)

    if (argv.init) {
        // Generate the default configuration file if `init` flag is provided
        fs.writeFileSync(configFilePath, mapifyInitConfigTemplate, 'utf8')
        console.info(`The configuration file "${argv.config}" has been created successfully.`)
        return
    }

    if (argv.generate) {
        try {
            const isConfigFileExist = fs.existsSync(configFilePath)
            if (isConfigFileExist) {
                const mapifyConfig: MapifyConfig = require(configFilePath)
                // Validate the user-provided configuration
                validateConfig(mapifyConfig)

                //Initialize mapify app
                const mapify = new Mapify(mapifyConfig)
                mapify.initialize()
            } else {
                throw new Error(`The configuration file "${argv.config}" was not found at the path "${configFilePath}".`)
            }
        } catch (error) {
            console.error('Error:', (error as Error).message || error)
            process.exit(1)
        }
    }
}

// Validation function to ensure the required fields are present in the configuration
const validateConfig = (config: MapifyConfig) => {
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
            throw new Error(`"path" is required for page at index ${index + 1}.`)
        }
        if (
            typeof page.priority !== 'number' ||
            page.priority < 0 ||
            page.priority > 1 ||
            !Number.isFinite(page.priority) ||
            page.priority !== Number(page.priority.toFixed(2))
        ) {
            throw new Error(
                `"priority" should be a number between 0 and 1, with no more than two decimal places, for page at index ${index + 1} at ${page.path}.`
            )
        }
        if (page.changeFreq && !changeFreqList.includes(page.changeFreq)) {
            throw new Error(
                `Invalid "changeFreq" value at page index ${index + 1}. Expected one of: ${changeFreqList.join(', ')}, But received: "${page.changeFreq}".`
            )
        }
    })
}
