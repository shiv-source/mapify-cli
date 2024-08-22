// prettier-ignore
export const defaultInitConfigTemplate  = 
`/** @type {import('mapify-cli').SitemapConfig} */

module.exports = {
    baseUrl: "http://example.com",
    outputPaths : ['./dist/angular-ssr/browser'],
    pages: [
        {
            path : '/',                                 // required value
            priority: 1,                                // required value
            changeFreq: 'weekly',                       // optional value
            componentPath: './src/app/pages/home/**'    // optional value
        },
        {
            path : '/about',
            priority: 0.8,
            changeFreq: 'monthly',
            componentPath: './src/app/pages/about/**'
        },
        {
            path : '/contact',
            priority: 0.8,
            changeFreq: 'monthly',
            componentPath: './src/app/pages/contact/**'
        },
        {
            path: '/login',
            priority: 0.75,
            changeFreq: 'monthly',
            componentPath: './src/app/pages/login/**'
        }
    ],
};
`