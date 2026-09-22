// Local smoke test for the dynamic sitemap generator (no serverless runtime).
// Verifies XML validity + real DB-backed URL counts before deployment.
import 'dotenv/config'

async function main() {
  const { getDb } = await import('../api/_lib/mongo.ts')
  const { buildSitemapIndex, buildProductsSitemap, buildCategoriesSitemap, buildPagesSitemap, sitemapStats } = await import('../api/_lib/sitemap.ts')

  const db = await getDb()
  const index = await buildSitemapIndex(db)
  console.log('--- sitemap index ---')
  console.log(index)

  const pages = await buildPagesSitemap()
  console.log('--- pages sitemap URLs:', (pages.match(/<loc>/g) || []).length)

  const cats = await buildCategoriesSitemap(db)
  console.log('--- categories sitemap URLs:', cats.count)
  console.log(cats.xml.split('\n').slice(0, 14).join('\n'))

  const prods = await buildProductsSitemap(db)
  console.log('--- products sitemap URLs:', prods.count, '· lastmod:', prods.lastmod?.toISOString?.() || prods.lastmod)
  console.log(prods.xml.split('\n').slice(0, 12).join('\n'))

  const stats = await sitemapStats(db)
  console.log('--- stats:', JSON.stringify(stats))

  // Sanity: XML must only contain sitemap-namespace tags (skip the <?xml?> decl)
  for (const [name, xml] of [['index', index], ['pages', pages], ['categories', cats.xml], ['products', prods.xml]]) {
    const bad = /<(?!\/?(urlset|url|loc|lastmod|changefreq|priority|sitemapindex|sitemap)\b|\?xml)/.test(xml)
    console.log(`XML tag sanity [${name}]:`, bad ? 'SUSPICIOUS TAGS' : 'ok')
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('FAILED:', e?.message || e)
  process.exit(1)
})
