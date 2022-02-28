import React from 'react'
import {
    compose,
    crawl,
    mount,
    resolve,
    route,
    withContext,
    withCrawlerPatterns,
    Route,
} from 'navi'
import { join } from 'path'
import { fromPairs } from 'lodash'
import TagIndexPage from '../components/TagIndexPage'
import TagPage from '../components/TagPage'
import routes from './index'

async function crawlRoutes(root): Promise<Route[]> {
    if (!crawlRoutes.cache[root]) {
        const { paths } = await crawl({
            context: {
                crawlingRoutes: true,
            },
            root,
            routes,
        })
        crawlRoutes.cache[root] = await resolve({
            method: 'HEAD',
            routes,
            urls: paths,
        })
    }
    return crawlRoutes.cache[root]
}
crawlRoutes.cache = {} as { [root: string]: Route[] }

interface TagsNavContext {
    blogRoot: string
    tagsRoot: string
    crawlingRoutes?: boolean
}

const tagRoutes = compose(
    withContext(
        (req, context): TagsNavContext => ({
            ...context,
            tagsRoot: req.mountpath,
        })
    ),
    withCrawlerPatterns({
        '/:tag': async (req, context: TagsNavContext) => {
            if (!context.crawlingRoutes) {
                return getAvailableTagsFromRoutes(
                    await crawlRoutes(context.blogRoot)
                ).map((tag) => '/' + tag)
            }
            return []
        },
    }),
    mount({
        '/': route<TagsNavContext>({
            title: 'Tags',

            getView: async (req, context) => {
                // Build a list of pages for each tag
                const routes = await crawlRoutes(context.blogRoot)
                const tags = getAvailableTagsFromRoutes(routes)
                const tagRoutes = fromPairs(
                    tags.map((name) => [name.toLowerCase(), []])
                )
                routes.forEach((route) => {
                    const data = route.data
                    if (data && data.tags) {
                        data.tags.forEach((tag) => {
                            tag = tag.toLowerCase()
                            if (tagRoutes[tag]) {
                                tagRoutes[tag].push(route)
                            }
                        })
                    }
                })

                return (
                    <TagIndexPage
                        tags={tags.map((name) => ({
                            name,
                            href: join(req.mountpath, name.toLowerCase()),
                            count: (tagRoutes[name] || []).length,
                        }))}
                    />
                )
            },
        }),

        '/:tag': route<TagsNavContext>({
            getTitle: (req) => req.params.tag,
            getView: async (req, context) => {
                const lowerCaseTag = req.params.tag.toLowerCase()
                const routes = await crawlRoutes(context.blogRoot)

                // Build a list of pages that include the tag from the site map
                const tagRoutes = [] as Route[]
                routes.forEach((route: Route) => {
                    const tags = (route.data && route.data.tags) || []
                    if (
                        tags.find(
                            (metaTag) => metaTag.toLowerCase() === lowerCaseTag
                        )
                    ) {
                        tagRoutes.push(route)
                    }
                })

                return (
                    <TagPage
                        blogRoot={context.blogRoot}
                        name={req.params.tag}
                        routes={tagRoutes}
                    />
                )
            },
        }),
    })
)

function getAvailableTagsFromRoutes(routes: Route[]): string[] {
    return Array.from(
        new Set(
            [].concat(
                ...routes.map((route) => (route.data && route.data.tags) || [])
            )
        )
    )
}

export default tagRoutes
