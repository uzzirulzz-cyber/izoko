// Smoke test: seoCrawler against live production
import { loadRobots, isAllowedByRobots, parseSitemapXml, parseHtmlSeo, resolveUrlChain, SEO_SITE } from '../api/_lib/seoCrawler.ts';

const robots = await loadRobots();
console.log('robots ok:', robots.ok, 'status:', robots.status, 'groups:', robots.groups.length, 'sitemaps:', robots.sitemaps.length);
console.log('allow /product/x:', isAllowedByRobots(robots, SEO_SITE + '/product/playstation-plus-deluxe-1-month-global', 'Googlebot'));
console.log('allow /admin:', isAllowedByRobots(robots, SEO_SITE + '/admin', 'Googlebot'));
console.log('allow /api/products:', isAllowedByRobots(robots, SEO_SITE + '/api/products', 'Googlebot'));

const smRes = await fetch(SEO_SITE + '/sitemap-products.xml');
const sm = parseSitemapXml(await smRes.text());
console.log('products sitemap kind:', sm.kind, 'entries:', sm.entries.length, 'dups:', sm.duplicateLocs.length, 'ns:', sm.namespaceOk);
console.log('first entry:', sm.entries[0]);

const idxRes = await fetch(SEO_SITE + '/sitemap.xml');
const idx = parseSitemapXml(await idxRes.text());
console.log('index kind:', idx.kind, 'children:', idx.childSitemaps);

const chain = await resolveUrlChain(SEO_SITE + '/product/playstation-plus-deluxe-1-month-global');
const html = await chain.res!.text();
const p = parseHtmlSeo(html);
console.log('--- product page ---');
console.log('status:', chain.res!.status, 'hops:', chain.hops.length, 'ttfb:', chain.ttfbMs);
console.log('title:', JSON.stringify(p.title));
console.log('metaDesc len:', p.metaDescription.length, 'canonical:', p.canonical);
console.log('robots meta:', JSON.stringify(p.metaRobots));
console.log('h1:', p.h1, 'h2:', p.h2Count, 'h3:', p.h3Count, 'words:', p.wordCount);
console.log('og:title:', JSON.stringify(p.ogTitle.slice(0, 60)), 'og:image:', p.ogImage.slice(0, 60));
console.log('twitter card:', p.twitterCard);
console.log('jsonld:', JSON.stringify(p.jsonLdBlocks.map((b) => ({ valid: b.valid, types: b.types }))).slice(0, 200));
console.log('images:', p.images.length, 'missingAlt:', p.images.filter((i) => i.alt === null).length, 'emptyAlt:', p.images.filter((i) => i.alt === '').length);
console.log('anchors:', p.anchors.length, 'internal:', p.anchors.filter((a) => a.href.startsWith('/') || a.href.includes('playbeat.digital')).length);

const home = await resolveUrlChain(SEO_SITE + '/');
const homeHtml = await home.res!.text();
const hp = parseHtmlSeo(homeHtml);
console.log('--- homepage ---');
console.log('status:', home.res!.status, 'title:', JSON.stringify(hp.title.slice(0, 60)), 'jsonld types:', hp.jsonLdBlocks.flatMap((b) => b.types).join(','));
console.log('home raw anchors:', hp.anchors.length, '(SPA shell expected low)');
