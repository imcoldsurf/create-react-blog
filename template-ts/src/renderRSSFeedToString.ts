import { Feed } from 'feed'
import { crawl, resolve } from 'navi'
import path from 'path'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import siteMetadata from './siteMetadata'

async function renderRSSFeed({ routes }) {
    const publicURL = process.env.PUBLIC_URL || '/'
    const { paths } = await crawl({
        routes,
        root: '/posts',
    })
    const feed = new Feed({
        title: siteMetadata.title,
        feed: '',
        feedLinks: [],
        copyright: '',
        description: siteMetadata.description,
        id: publicURL,
        // TODO: set this based on the siteMap slugs
        // updated: new Date(),
        link: publicURL,
        author: {
            name: siteMetadata.author,
        },
    })

    for (const pathname of paths.sort()) {
        const route = await resolve({
            routes,
            url: pathname,
        })
        const meta = route.meta || {}
        const link = path.join(publicURL, pathname)

        // Each post's content is just an MDX component, which can be rendered
        // independently of the rest of the app.
        const content = ReactDOMServer.renderToStaticMarkup(
            React.createElement(
                route.views[route.views.length - 1].MDXComponent
            )
        )

        // todo: add a date
        feed.addItem({
            title: route.title!,
            id: link,
            link: link,
            date: meta.date,
            description: meta.description,
            content,
            author: [
                {
                    name: siteMetadata.author,
                },
            ],
        })
    }

    return feed.rss2()
}

export default renderRSSFeed
