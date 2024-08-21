# mapify-cli

`mapify-cli` is a CLI tool for generating `sitemap.xml` files for various frontend frameworks such as Angular, React, Vue, and more. It simplifies the creation of sitemaps by using a configuration file and automatically detects changes in your project files to update the `lastmod` attribute.

## Features

- **Framework Agnostic**: Works with Angular, React, Vue, and other frontend frameworks.
- **Automatic Last Modified Dates**: Detects the latest modifications of component files to update the `lastmod` attribute in your sitemap.
- **Customizable Config**: Provides options to configure default change frequencies, priorities, and more.
- **Multiple Builds Support**: Handles multiple build outputs seamlessly. You can specify different output paths for various builds like SSR and serverless.
- **Force Option**: Allows you to bypass Git detection for `lastmod` updates.

## Installation

To install `mapify-cli`, run:

```bash
npm install -g mapify-cli
```

## Usage

### Commands

- `--init`: Initializes a sample config file (`mapify-cli.js`).
- `--config <path>`: Uses a custom configuration file.
- `--generate`: Generates the `sitemap.xml` file based on the config.

### Example

To generate the `sitemap.xml`, use:

```bash
npx mapify-cli --generate
```

### Configuration

Create a configuration file (`mapify.config.js`) in your project root. The configuration should look like this:

```js
/** @type {import('mapify-cli').SitemapConfig} */

module.exports = {
    baseUrl: "http://example.com",
    outputPaths: ['./dist/angular-ui/browser', './dist/angular-ui-serverless/browser'],
    pages: [
        {
            path: '/',
            priority: 1,
            componentPath: './src/app/pages/home/**'
        },
        {
            path: '/about',
            priority: 0.8,
            componentPath: './src/app/pages/about/**'
        },
        {
            path: '/contact',
            priority: 0.8,
            componentPath: './src/app/pages/contact/**'
        },
        {
            path: '/login',
            priority: 0.9,
            changeFreq: 'weekly',
            componentPath: './src/app/pages/login/**'
        }
    ],
};
```

### Options

- `baseUrl` (string): The base URL of your site.
- `outputPaths` (string[]): Array of output paths where the `sitemap.xml` will be saved. Supports multiple builds, such as SSR and serverless builds.
- `pages` (IPage[]): Array of page configurations.
  - `path` (string): The URL path of the page.
  - `priority` (number): The priority of the page (0.0 to 1.0).
  - `changeFreq` (ChangeFreq): Optional. How frequently the page is likely to change (e.g., 'daily', 'weekly').
  - `componentPath` (string): Path to the components used to detect the last modified date.
- `defaultChangeFreq` (ChangeFreq): Default change frequency for all pages.
- `defaultPriority` (number): Default priority for all pages.
- `force` (boolean): If true, skips Git detection for `lastmod` and uses the current date.

### GitHub Action

To automate sitemap generation using GitHub Actions, add the following workflow to your `.github/workflows/` directory:

```yaml
name: Generate Sitemap

on:
  push:
    branches:
      - main

jobs:
  generate-sitemap:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Generate Sitemap
        run: npx mapify-cli --generate
```

## License

This project is licensed under the [MIT License](https://github.com/shiv-source/mapify-cli/blob/master/LICENSE).

## Contributing

We welcome contributions to improve `mapify-cli`. Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## Support

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/shiv-source/mapify-cli/issues).

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) to understand our community standards and expectations.
