// gen_products_ts.js — generate src/data/products.ts from catalog_new.json + image_manifest.json
// 178 products, real images, brand metadata, projector specs harvested from live DB
import fs from 'fs';

const catalog = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/catalog_new.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/image_manifest.json', 'utf8'));
const projDesc = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/db_projector_desc.json', 'utf8'));

// ---------- helpers ----------
const slugify = (s) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const round500 = (n) => Math.round(n / 500) * 500;
const originalPriceOf = (price) => {
  const bump = Math.round(price * (price >= 2000 ? 1.15 : 1.18));
  if (price < 1000) return Math.ceil(bump / 50) * 50;
  return Math.round(bump / 500) * 500;
}
const discountOf = (price, orig) => Math.round(((orig - price) / orig) * 100);

function detectRegion(name) {
  const n = name.toLowerCase();
  if (n.includes('pakistan')) return 'Pakistan';
  if (n.includes('usa') || /\bus\b/.test(n) || n.includes('united states')) return 'USA';
  if (n.includes('europe') || n.includes('france') || n.includes('netherlands')) return 'Europe';
  if (n.includes('uk')) return 'UK';
  if (n.includes('japan')) return 'Japan';
  if (n.includes('india')) return 'Asia';
  if (n.includes('australia')) return 'Australia';
  return 'Global';
}

function detectDuration(name) {
  const m = name.match(/(\d+)\s*(month|year|week)s?\b/i);
  if (m) return `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}${m[1] === '1' ? '' : 's'}`;
  return '';
}

const isPrivate = (n) => /full private|private/i.test(n);
const isShared = (n) => /shared/i.test(n);
const isOwnEmail = (n) => /own email/i.test(n);

// ---------- projector spec parsing (real specs from live DB descriptions) ----------
function projectorSpecFor(name) {
  const db = projDesc.find((p) => {
    const a = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    if (b.includes(a) || a.includes(b)) return true;
    // loose model match: first token (model id)
    const model = name.split(/[\s+]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return model.length > 3 && b.includes(model);
  });
  if (!db) return undefined;
  const d = db.description || '';
  const spec = {};
  const res = d.match(/(\d{3,4}x\d{3,4}P?)\s*Native/i);
  if (res) spec.nativeResolution = res[1] + ' Native';
  const ansi = d.match(/(\d+)\s*ANSI/i);
  if (ansi) spec.brightnessAnsi = parseInt(ansi[1], 10);
  const os = d.match(/(Android\s*[\d.]*)/i);
  if (os) spec.os = os[1].replace(/\s+/g, ' ').trim();
  const wifi = d.match(/(WiFi\s*6?)/i);
  if (wifi) spec.wifi = wifi[1].replace(/\s+/g, ' ').trim();
  const special = [];
  if (/4K/i.test(d)) special.push('4K Decoding');
  if (/8K/i.test(d)) special.push('8K Decoding');
  if (/Netflix/i.test(d) || /NTV/i.test(name)) special.push('Netflix Licensed');
  if (special.length) spec.specialFeatures = special;
  return Object.keys(spec).length ? spec : undefined;
}

// ---------- brand profiles ----------
const BRANDS = {
  // Streaming
  'youtube-premium': { brand: 'YouTube Premium', desc: (n) => `Official YouTube Premium plan${isOwnEmail(n) ? ' activated directly on your own Google account' : ''} — ad-free videos, background and offline playback, plus YouTube Music Premium included. Delivered by PlayBeat with a full-duration stability warranty.`, features: (n) => ['Ad-free videos across YouTube and YouTube Music', 'Background play and offline downloads', isOwnEmail(n) ? 'Activation on your own email' : 'Private access credentials provided'] },
  'prime-video': { brand: 'Amazon Prime Video', desc: () => 'Amazon Prime Video subscription with thousands of movies, award-winning Originals and live sports. Stream on up to three devices at once in Full HD and 4K where available.', features: (n) => ['Hollywood movies, series and Amazon Originals', 'Watch on TV, mobile, tablet or console', 'Full-duration warranty handled by PlayBeat'] },
  netflix: { brand: 'Netflix', desc: (n) => `Netflix subscription plan${n.toLowerCase().includes('international') ? ' (international catalog)' : ' (Pakistan local catalog)'} with HD/4K streaming of series, films and mobile games. ${isPrivate(n) ? 'Fully private account — only you use it.' : isShared(n) ? 'Shared profile on a PlayBeat-managed line.' : 'Private profile with watching history kept separate.'}`, features: (n) => ['HD / 4K streaming where plan allows', 'TV, mobile, tablet and web supported', 'Replacement warranty for full plan duration'] },
  'netflix-prime-combo': { brand: 'Netflix + Prime Video Combo', desc: () => 'Bundle pairing a Netflix plan with Amazon Prime Video for one month — double the entertainment at a combo price. Both activations delivered together with warranty support.', features: (n) => ['Two top streaming services in one order', 'Delivered together within minutes', 'Full-duration warranty on both plans'] },
  'appletv-plus': { brand: 'Apple TV+', desc: () => 'Apple TV+ subscription featuring Apple Originals — Ted Lasso, Severance, Silo and more — in stunning 4K HDR with Dolby Atmos on supported devices.', features: (n) => ['All Apple Originals in 4K HDR', 'Up to six family profiles', 'Warranty for the full subscription period'] },
  spotify: { brand: 'Spotify Premium', desc: () => 'Spotify Premium Individual plan — ad-free music, offline downloads, unlimited skips and high-quality audio on your existing account.', features: (n) => ['Ad-free listening with offline mode', 'Works on your own Spotify account', 'Full-duration subscription warranty'] },
  sonyliv: { brand: 'SonyLIV', desc: () => 'SonyLIV premium subscription for Indian entertainment — live sports, Sony TV shows, Originals and movies in HD.', features: (n) => ['Live cricket and sports events', 'Latest Sony TV serials and Originals', 'HD streaming on two devices'] },
  ullu: { brand: 'ULLU', desc: () => 'ULLU app subscription unlocking the complete library of ULLU Originals, web series and films on Android, iOS and Smart TV.', features: (n) => ['Complete ULLU Originals catalog', 'Android, iOS and Smart TV apps', 'Instant activation with warranty'] },
  crunchyroll: { brand: 'Crunchyroll', desc: () => 'Crunchyroll single-screen premium plan — stream the world\'s largest anime library ad-free in HD, with new episodes straight from Japan.', features: (n) => ['Ad-free HD anime streaming', 'New episodes hours after Japan broadcast', 'Single-screen private plan'] },
  chaupal: { brand: 'Chaupal', desc: () => 'Chaupal single-screen subscription for Punjabi, Haryanvi and Bhojpuri movies and Originals — regional entertainment in HD.', features: (n) => ['Punjabi, Haryanvi and Bhojpuri content', 'HD streaming on one screen', 'Instant delivery and full warranty'] },
  'disney-plus': { brand: 'Disney+', desc: () => 'Disney+ subscription (with VPN access guide) unlocking Disney, Pixar, Marvel, Star Wars and National Geographic in 4K UHD.', features: (n) => ['Marvel, Star Wars, Pixar and Disney classics', '4K UHD with Dolby Atmos', 'VPN usage guide included for access'] },
  'hbo-max': { brand: 'HBO Max', desc: () => 'HBO Max subscription (with VPN guide) — HBO Originals, Warner Bros. movies same-day, and DC universe titles in 4K HDR.', features: (n) => ['HBO Originals and Warner Bros. films', '4K HDR streaming', 'VPN access guide included'] },
  jiohotstar: { brand: 'JioHotstar', desc: () => 'JioHotstar premium subscription (with VPN) — live sports including IPL and cricket, Disney+ content and Indian Originals in up to 4K.', features: (n) => ['Live IPL, cricket and global sports', 'Hollywood, Bollywood and Originals', 'VPN usage guide included'] },
  hulu: { brand: 'Hulu', desc: () => 'Hulu subscription (with VPN) — next-day US TV episodes, Hulu Originals and a massive on-demand library in HD.', features: (n) => ['Next-day US network TV', 'Hulu Originals and FX on Hulu', 'VPN usage guide included'] },
  zee5: { brand: 'ZEE5', desc: () => 'ZEE5 premium subscription (with VPN) — Zee serials, movies, Live TV and Originals across 12 languages in HD.', features: (n) => ['12 Indian languages content', 'Live TV channels included', 'HD streaming with full warranty'] },
  // Subscriptions / productivity
  helium10: { brand: 'Helium 10', desc: () => 'Helium 10 Platinum plan for Amazon sellers — product research (Black Box), keyword research (Magnet, Cerebro) and listing optimization in one suite.', features: (n) => ['Full Platinum toolset for 1 month', 'Keyword and product research suite', 'Private credentials, instant setup'] },
  zoom: { brand: 'Zoom Pro', desc: (n) => `Zoom Pro license${n.includes('100') ? ' for meetings up to 100 participants' : ''} — unlimited group meetings, cloud recording and advanced meeting controls.${n.includes('No Trial') ? ' Officially paid plan, not a trial.' : ''}`, features: (n) => ['Pro host license with cloud recording', 'HD video meetings with breakout rooms', n.includes('No Trial') ? 'Officially paid — no trial limitations' : 'Reliable activation with warranty'] },
  'office-365': { brand: 'Microsoft 365', desc: () => 'Microsoft Office 365 Pro Plus for 1 year on 5 devices — Word, Excel, PowerPoint, Outlook, OneNote, Access and Publisher with 1 TB OneDrive.', features: (n) => ['Genuine Office apps on 5 devices', '1 TB OneDrive cloud storage', 'Renewable yearly license with support'] },
  'adobe-cc': { brand: 'Adobe Creative Cloud', desc: (n) => `Adobe Creative Cloud Pro plan${n.includes('Photography') ? ' (Photography Plan with Lightroom + Photoshop)' : ' with all apps — Photoshop, Illustrator, Premiere Pro, After Effects and more'}. ${/PC Mac/i.test(n) ? 'Works on both Windows and macOS.' : 'For Windows PC.'}`, features: (n) => ['Genuine Adobe activation', /PC Mac/i.test(n) ? 'Windows + macOS supported' : 'Windows PC supported', 'Full-duration warranty with replacement'] },
  capcut: { brand: 'CapCut Pro', desc: (n) => `CapCut Pro plan${isPrivate(n) ? ' (full private — your own activated seat)' : ' on up to 3 devices'} — pro video editing with 4K export, premium effects, templates and cloud space.`, features: (n) => ['All Pro effects, filters and templates', '4K export with no watermark', isPrivate(n) ? 'Fully private activation' : 'Works on 3 of your devices'] },
  freepik: { brand: 'Freepik', desc: () => 'Freepik Premium 1-month plan — unlimited downloads of stock photos, vectors, PSDs, icons and AI-generated assets with full commercial license.', features: (n) => ['Unlimited premium downloads', 'Commercial-use license included', 'Instant activation on your email'] },
  quillbot: { brand: 'QuillBot', desc: () => 'QuillBot Premium 1-month plan — unlimited paraphrasing, grammar checking, plagiarism checker and summarizer for flawless writing.', features: (n) => ['Unlimited words in paraphraser', 'Grammar, plagiarism and summarizer tools', 'Activated on your own account'] },
  grammarly: { brand: 'Grammarly', desc: () => 'Grammarly Premium 1-month plan — advanced grammar, clarity and tone suggestions plus plagiarism detection, activated on your own account.', features: (n) => ['Premium writing suggestions everywhere', 'Tone and clarity rewrites', 'Plagiarism checker included'] },
  nordvpn: { brand: 'NordVPN', desc: (n) => `NordVPN plan${isPrivate(n) ? ' (full private account — only you use it)' : ' (shared line)'}${n.includes('NordPass') ? ' with NordPass password manager included' : ''} — 6,000+ servers in 111 countries with Threat Protection and Meshnet.`, features: (n) => ['6,000+ RAM-only servers worldwide', 'Threat Protection malware blocker', isPrivate(n) ? 'Full private credentials' : 'Managed shared access'] },
  surfshark: { brand: 'Surfshark', desc: (n) => `Surfshark VPN plan${isPrivate(n) ? ' (full private — unlimited devices)' : ' (shared)'} — CleanWeb ad blocking, NoBorders mode and 3,200+ servers in 100 countries.`, features: (n) => ['Unlimited simultaneous devices', 'CleanWeb ads and tracker blocker', '24/7 protection with warranty'] },
  expressvpn: { brand: 'ExpressVPN', desc: (n) => `ExpressVPN plan${n.includes('PC') ? ' for Windows PC' : ' (single device)'} — Lightning-fast servers in 105 countries with TrustedServer technology and full privacy audit.`, features: (n) => ['Servers in 105 countries', 'TrustedServer RAM-only technology', 'Works on PC and mobile'] },
  protonvpn: { brand: 'Proton VPN', desc: () => 'Proton VPN 1-month premium — Secure Core servers, NetShield ad-blocker and strict Swiss no-logs privacy policy.', features: (n) => ['Swiss privacy, no-logs policy', 'NetShield ad and malware blocking', 'Secure Core double-hop routing'] },
  ipvanish: { brand: 'IPVanish', desc: () => 'IPVanish VPN 1-month plan — unlimited device connections, 2,400+ servers and zero-traffic-logs policy.', features: (n) => ['Unlimited simultaneous devices', '2,400+ servers in 90+ locations', 'Strict no-logs policy'] },
  'hotspot-shield': { brand: 'Hotspot Shield', desc: () => 'Hotspot Shield Premium 1-month — Catapult Hydra protocol for blazing speeds on 115+ virtual locations with military-grade encryption.', features: (n) => ['Catapult Hydra speed protocol', '115+ virtual locations', 'Automatic kill switch'] },
  chatgpt: { brand: 'ChatGPT', desc: (n) => `ChatGPT plan${n.includes('Go') ? ' (Go tier)' : ' (Plus tier)'}${isPrivate(n) ? ' on a fully private account' : ' semi-private with guaranteed seat'} — GPT-5 access, advanced reasoning, file analysis, image generation and custom GPTs.`, features: (n) => ['GPT-5 with advanced reasoning', 'File uploads, vision and data analysis', isPrivate(n) ? 'Fully private account' : 'Semi-private managed access'] },
  perplexity: { brand: 'Perplexity', desc: () => 'Perplexity Pro subscription — unlimited Pro searches with GPT-5, Claude and Sonar models, file uploads and dedicated AI inference.', features: (n) => ['Unlimited Pro-tier AI searches', 'Choose GPT-5, Claude or Sonar models', 'Private activation with warranty'] },
  'google-veo': { brand: 'Google Veo 3', desc: () => 'Google Veo 3 access for 1 month — Google\'s most advanced AI video generation with native audio, 4K-quality output via Gemini and Flow.', features: (n) => ['Text-to-video with native audio', 'Cinematic 1080p+ AI video generation', 'Activated on provided Google account'] },
  elevenlabs: { brand: 'ElevenLabs', desc: () => 'ElevenLabs 1-month plan — the most realistic AI voice generation with 3,000+ voices in 32 languages, voice cloning and dubbing studio.', features: (n) => ['Ultra-realistic AI text-to-speech', 'Voice cloning and dubbing studio', 'Commercial usage license'] },
  'leonardo-ai': { brand: 'Leonardo AI', desc: () => 'Leonardo AI Unlimited official plan for 1 month — unlimited AI image generations, Phoenix model, canvas editing and upscaling.', features: (n) => ['Unlimited daily image generations', 'Phoenix and Flux pro models', 'Official plan activated on your email'] },
  turnitin: { brand: 'Turnitin', desc: () => 'Turnitin Instructor account for 1 month — full instructor dashboard with similarity reports, AI-writing detection and grading tools.', features: (n) => ['Genuine instructor (teacher) account', 'AI-writing detection included', 'Similarity reports for student papers'] },
  'hailio-ai': { brand: 'Hailuo AI', desc: () => 'Hailuo AI (MiniMax) 1-month subscription — state-of-the-art AI video generation with smooth motion, image-to-video and director-grade camera controls.', features: (n) => ['Text-to-video and image-to-video', 'Cinematic camera movement controls', 'Private activation with warranty'] },
  // Gaming
  'xbox-game-pass': { brand: 'Xbox Game Pass Ultimate', desc: (n) => `Xbox Game Pass Ultimate${isPrivate(n) ? ' — full private membership for one month' : ' shared slot for one device'} — 500+ high-quality games on console, PC and cloud including day-one releases.`, features: (n) => ['Day-one Xbox and Bethesda releases', 'EA Play and cloud gaming included', isPrivate(n) ? 'Full private membership' : 'Shared slot on one device'] },
  // Gift cards
  'xbox-giftcard': { brand: 'Xbox Live', desc: (n) => { const usd = n.match(/([\d.]+)\s*USD/i); return `Xbox Live gift card${usd ? ` ($${usd[1]} USD)` : ''} — official Microsoft digital code to top up any Xbox or Microsoft account for games, DLC, Game Pass and add-ons.`; }, features: (n) => ['Official Microsoft code — never expires', 'Redeem on Xbox console or Microsoft Store', 'Region-locked to USA accounts'] },
  'playstation-giftcard': { brand: 'PlayStation Network', desc: (n) => { const usd = n.match(/([\d.]+)\s*USD/i); return `PlayStation Network gift card${usd ? ` ($${usd[1]} USD)` : ''} — official Sony digital code for PS5 and PS4 wallet top-up: games, add-ons, PS Plus and media.`; }, features: (n) => ['Official Sony USA code', 'Redeem on PS5 / PS4 store', 'Funds never expire once redeemed'] },
  'steam-giftcard': { brand: 'Steam', desc: (n) => { const usd = n.match(/([\d.]+)\s*USD/i); const region = n.toLowerCase().includes('pakistan') ? 'Pakistan region' : 'Global'; return `Steam wallet gift card${usd ? ` ($${usd[1]} USD)` : ''} — ${region} digital code redeemable on Steam for games, DLC, in-game items and Market purchases.`; }, features: (n) => [n && n.toLowerCase().includes('pakistan') ? 'Works with Pakistan-region Steam wallets' : 'Global redeem code', 'Instant code delivery by email', 'Funds never expire on Steam wallet'] },
  'razer-gold': { brand: 'Razer Gold', desc: (n) => { const usd = n.match(/([\d.]+)\s*USD/i); return `Razer Gold gift card${usd ? ` ($${usd[1]} USD)` : ''} — unified virtual credit for 42,000+ games and entertainment content, with Razer Silver rewards on every spend.`; }, features: (n) => ['42,000+ supported games and apps', 'Earn Razer Silver loyalty points', 'Instant code delivery'] },
  'apple-giftcard': { brand: 'Apple', desc: (n) => { const usd = n.match(/([\d.]+)\s*USD/i); return `Apple Gift Card${usd ? ` ($${usd[1]} USD)` : ''} — official Apple digital code for App Store, iCloud+, Apple Music, accessories and everything Apple (USA store).`; }, features: (n) => ['Official Apple USA code', 'App Store, iCloud+, Music and more', 'Never expires'] },
  // Software
  office: { brand: 'Microsoft Office', desc: (n) => `Genuine Microsoft Office retail license${n.includes('2024') ? ' (2024 LTSC edition)' : n.includes('2021') ? ' (2021 edition)' : ' (2019 edition)'}${/Mac/i.test(n) ? ' for Windows and macOS' : ' for Windows PC'} — lifetime activation with Word, Excel, PowerPoint, Outlook and more.`, features: (n) => ['Lifetime retail key — one-time purchase', 'Instant digital delivery by email', 'Official Microsoft activation with updates'] },
  'windows-11': { brand: 'Windows 11', desc: (n) => `Genuine Microsoft Windows 11 ${n.toLowerCase().includes('pro') ? 'Pro' : 'Home'} retail license${n.includes('OEM') ? ' (OEM)' : ' (retail)'}${n.includes('x4') ? ' — bundle of 4 activation keys' : ''} for one PC, with lifetime activation and official updates.`, features: (n) => ['Lifetime activation key', 'All official Windows Update features', n.includes('x4') ? '4 keys included in bundle' : 'Instant email delivery'] },
  cyberghost: { brand: 'CyberGhost VPN', desc: (n) => `CyberGhost VPN plan${n.match(/(\d+)\s*Devices/i) ? ` for ${n.match(/(\d+)\s*Devices/i)[1]} devices` : ''} — 11,000+ servers worldwide, NoSpy servers and strict no-logs policy, audited by Deloitte.`, features: (n) => ['11,000+ servers in 100 countries', 'Up to 7 devices per subscription', 'Deloitte-audited no-logs policy'] },
  bitdefender: { brand: 'Bitdefender', desc: (n) => `Bitdefender ${n.toLowerCase().includes('internet security') ? 'Internet Security' : n.toLowerCase().includes('antivirus') ? 'Antivirus Plus' : 'Total Security'} license${n.match(/(\d+)\s*Device/i) ? ` for ${n.match(/(\d+)\s*Device/i)[1]} device(s)` : ''} — multi-layer ransomware protection, web attack prevention and anti-fraud for the full term.`, features: (n) => ['Multi-layer ransomware protection', 'Anti-phishing and anti-fraud guard', n.match(/(\d+)\s*Device/i) ? `Covers ${n.match(/(\d+)\s*Device/i)[1]} device(s)` : 'Covers all major platforms'] },
  mcafee: { brand: 'McAfee', desc: (n) => `McAfee Total Protection license${n.match(/(\d+)\s*Device/i) ? ` for ${n.match(/(\d+)\s*Device/i)[1]} device(s)` : ''} — antivirus, identity monitoring, safe web browsing and a password manager included.`, features: (n) => ['Real-time antivirus protection', 'Identity and privacy monitoring', 'Secure VPN on unlimited devices'] },
  kaspersky: { brand: 'Kaspersky', desc: (n) => `Kaspersky ${n.toLowerCase().includes('premium') ? 'Premium' : 'Standard'} license for 5 devices — award-winning malware engine, safe banking tools and performance optimization.`, features: (n) => ['Top-rated antivirus engine', 'Safe online banking mode', n.toLowerCase().includes('premium') ? 'Premium VPN and identity tools' : 'Essential protection suite'] },
  'projector-stand': { brand: 'PlayBeat Accessories', desc: () => 'Universal 190 cm floor stand for projectors — heavy-duty height-adjustable aluminum tripod with 360° rotating mount plate, anti-slip feet and cable management.', features: (n) => ['Adjustable height up to 190 cm', 'Universal projector mounting plate', 'Sturdy aluminum tripod, anti-slip base'] },
  // Projectors get desc from DB specs
};

function projectorDescription(name) {
  const db = projDesc.find((p) => {
    const a = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    if (b.includes(a) || a.includes(b)) return true;
    const model = name.split(/[\s+]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return model.length > 3 && b.includes(model);
  });
  const d = db ? (db.description || '') : '';
  const cleanName = name
    .replace(/^Magcubic\s+/i, '')
    .replace(/^Zerobyte\s+/i, '')
    .replace(/^Hongtop\s+/i, 'Hongtop ')
    .trim();
  const base = `PlayBeat ${cleanName} smart projector — genuine ${/F18|HY320PRO|HY310|HY350|HCS350/i.test(name) ? '1080P Full HD' : '720P HD-ready'} LED projection with smart TV experience, screen mirroring and HDMI/USB connectivity. Backed by PlayBeat hardware warranty and local support.`;
  if (!d) return base;
  const specs = d.split(',').slice(0, 3).join(' · ').replace(/·\s*-\s*ANSI Lumens/g, '').trim();
  return `${cleanName} smart projector — ${specs}. ${/Netflix/i.test(d) || /NTV/i.test(name) ? 'Official Netflix-licensed model with built-in apps. ' : ''}Includes remote, power adapter and full PlayBeat warranty with local after-sales support.`;
}

function projectorFeatures(name) {
  const f = [];
  const spec = projectorSpecFor(name);
  if (spec) {
    if (spec.nativeResolution) f.push(spec.nativeResolution);
    if (spec.brightnessAnsi) f.push(`${spec.brightnessAnsi} ANSI lumens`);
    if (spec.os) f.push(spec.os);
    if (spec.wifi) f.push(spec.wifi + ' wireless');
    if (spec.specialFeatures) f.push(...spec.specialFeatures);
  }
  if (!f.length) f.push('Smart LED projection', 'Screen mirroring', 'HDMI + USB');
  f.push('1-year PlayBeat hardware warranty');
  return f;
}

// ---------- build products ----------
const seenSlug = new Map();
const products = catalog.map((p) => {
  const b = BRANDS[p.imageKey] || {};
  const isProj = p.category === 'Smart Projectors';
  const digital = !isProj;
  const originalPrice = originalPriceOf(p.price);
  const desc = isProj && !b.desc ? projectorDescription(p.name) : (b.desc ? b.desc(p.name) : `${p.name} — official product from PlayBeat with instant delivery and full warranty.`);
  const features = isProj ? projectorFeatures(p.name) : ((b.features ? b.features(p.name) : []));
  const tags = isProj
    ? ['Projector', 'Home Cinema', 'PlayBeat Warranty']
    : p.category === 'Gift Cards'
      ? ['Instant', 'Gift Card', detectRegion(p.name) === 'Global' ? 'Global' : detectRegion(p.name)]
      : ['Instant', b.brand || 'Official', detectDuration(p.name) || 'Digital'].filter(Boolean);

  let slug = slugify(p.name);
  const n = seenSlug.get(slug) || 0;
  seenSlug.set(slug, n + 1);
  if (n > 0) slug = `${slug}-${p.sku.toLowerCase().replace(/_/g, '-')}`;

  // merchandising selection (which products surface on the homepage)
  const FEATURED = new Set(['PB-STR-008', 'PB-STR-001', 'PB-AIT-001', 'PB-GFT-010', 'PB-GAM-001', 'PB-ZBP-010', 'PB-ZBP-008', 'PB-ZBP-002', 'PB-STU-005', 'PB-SWF-012']);
  const HOT = new Set(['PB-STR-008', 'PB-STR-001', 'PB-AIT-002', 'PB-GFT-010', 'PB-GFT-020', 'PB-ZBP-010', 'PB-ZBP-008', 'PB-STU-007']);

  return {
    id: p.sku.toLowerCase(),
    sku: p.sku,
    name: p.name,
    slug,
    category: p.category,
    description: desc,
    price: p.price,
    originalPrice,
    currency: 'PKR',
    discountPercent: discountOf(p.price, originalPrice),
    image: manifest[p.imageKey] || '/assets/images/products/netflix.jpg',
    galleryImages: [manifest[p.imageKey]].filter(Boolean),
    tags,
    digital,
    productType: digital ? 'digital' : 'physical',
    stock: digital ? 999 : 10,
    status: 'in_stock',
    active: true,
    rating: 0,
    reviewCount: 0,
    isFeatured: FEATURED.has(p.sku),
    isHot: HOT.has(p.sku),
    isFlashDeal: false,
    deliveryType: digital ? 'Instant Auto-Email' : 'Courier Shipping (1-3 Days)',
    deliveryInfo: digital
      ? 'Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.'
      : 'Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).',
    region: detectRegion(p.name),
    features,
    ...(isProj ? { projectorSpec: projectorSpecFor(p.name) } : {}),
    brand: b.brand || (isProj ? 'PlayBeat Projectors' : 'PlayBeat'),
    imageKey: p.imageKey,
  };
});

// sanity: all images exist in manifest
const missingImg = products.filter((p) => !manifest[p.imageKey]);
if (missingImg.length) console.error('MISSING IMAGES:', missingImg.map((p) => p.sku));

const ts = `// products.ts — AUTO-GENERATED from Playbeat_Combined_Catalog.xlsx (CLSC file).
// 178 products · 6 categories · real official web images in /assets/images/products/.
// Regenerate with: node scripts/gen_products_ts.js
import { Product, CategoryMeta } from '../types'
import { ensureProductSlug } from '../lib/slug'

export const CATEGORIES_DATA: CategoryMeta[] = [
  {
    name: 'All Products',
    slug: 'all',
    iconName: 'LayoutGrid',
    description: 'The complete PlayBeat catalog — streaming, subscriptions, software, gift cards, gaming and smart projectors',
    accentColor: 'text-amber-400',
    glowColor: 'glow-amber',
    image: '/assets/images/products/netflix.jpg',
  },
  {
    name: 'Streaming',
    slug: 'Streaming',
    iconName: 'PlaySquare',
    description: 'Netflix, YouTube Premium, Prime Video, Disney+, HBO Max & 15+ official streaming plans',
    accentColor: 'text-rose-400',
    glowColor: 'glow-red',
    badgeText: 'Hot',
    image: '/assets/images/products/netflix.jpg',
  },
  {
    name: 'Subscriptions',
    slug: 'Subscriptions',
    iconName: 'Layers',
    description: 'ChatGPT, Perplexity, Office 365, Adobe CC, CapCut, VPNs & premium productivity tools',
    accentColor: 'text-emerald-400',
    glowColor: 'glow-emerald',
    badgeText: 'Trending',
    image: '/assets/images/products/chatgpt.jpg',
  },
  {
    name: 'Gift Cards',
    slug: 'Gift Cards',
    iconName: 'Gift',
    description: 'Xbox, PlayStation, Steam, Razer Gold & Apple gift cards — instant official codes',
    accentColor: 'text-yellow-400',
    glowColor: 'glow-amber',
    badgeText: 'Instant',
    image: '/assets/images/products/playstation-giftcard.jpg',
  },
  {
    name: 'Gaming',
    slug: 'Gaming',
    iconName: 'Gamepad2',
    description: 'Xbox Game Pass Ultimate & gaming wallet top-ups',
    accentColor: 'text-indigo-400',
    glowColor: 'glow-indigo',
    badgeText: 'Play',
    image: '/assets/images/products/xbox-game-pass.jpg',
  },
  {
    name: 'Software',
    slug: 'Software',
    iconName: 'CreditCard',
    description: 'Windows 11, Office 2024/2021/2019, Adobe CC, antivirus & genuine retail keys',
    accentColor: 'text-purple-400',
    glowColor: 'glow-purple',
    badgeText: 'Genuine',
    image: '/assets/images/products/windows-11.jpg',
  },
  {
    name: 'Smart Projectors',
    slug: 'Smart Projectors',
    iconName: 'Projector',
    description: 'Magcubic, HCS350, Hongtop & HY-series smart projectors — full home cinema lineup',
    accentColor: 'text-cyan-400',
    glowColor: 'glow-cyan',
    badgeText: '4K Cinema',
    image: '/assets/images/products/proj-hy320-ntv.jpg',
  },
]

const RAW_PRODUCTS_CATALOG: any[] = ${JSON.stringify(products, null, 2)}

export const PRODUCTS_CATALOG: Product[] = RAW_PRODUCTS_CATALOG.map((item) => ({
  ...item,
  slug: item.slug || ensureProductSlug(item),
  shortDescription: item.shortDescription || item.description?.slice(0, 120) + (item.description?.length > 120 ? '...' : ''),
  status: item.stock > 0 ? 'in_stock' : 'out_of_stock',
  featured: item.featured !== undefined ? item.featured : Boolean(item.isFeatured),
  deliveryInfo: item.deliveryInfo || (item.digital !== false ? 'Instant automated digital delivery with full warranty support.' : 'Inspected & dispatched via insured express courier (1-3 days).'),
  gallery: item.gallery || item.galleryImages || (item.image ? [item.image] : []),
  additionalImages: item.additionalImages || item.galleryImages || [],
}))
`;

fs.writeFileSync('/home/z/my-project/izoko/src/data/products.ts', ts);
console.log(`Wrote products.ts with ${products.length} products`);
const byCat = {};
products.forEach((p) => (byCat[p.category] = (byCat[p.category] || 0) + 1));
console.log('By category:', byCat);
console.log('Featured:', products.filter((p) => p.isFeatured).length, '| Hot:', products.filter((p) => p.isHot).length);
const specs = products.filter((p) => p.projectorSpec).length;
console.log('Projectors with parsed specs:', specs);
