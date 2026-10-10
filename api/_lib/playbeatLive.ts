import { getTrackingConfig } from './trackingConfig.js';
import { reportingWindow, trafficSource } from './reporting.js';

export const LIVE_DASHBOARD_ORIGIN = 'https://playbeat-storefront.crdbixx.workers.dev';
export async function liveDashboardSummary(db: any, rawDays: unknown) {
  const { days, start, end } = reportingWindow(rawDays);
  const filter = { createdAt: { $gte: start, $lt: end } };
  const col = db.collection('playbeat_live_events');
  const [views, sessions, plays, sources, daily, tracking, upstream, observation] = await Promise.all([
    col.countDocuments({ ...filter, type: 'page_view' }),
    col.distinct('sessionId', { ...filter, type: 'page_view' }),
    col.countDocuments({ ...filter, type: 'play_request' }),
    col.aggregate([{ $match: { ...filter, type: 'page_view' } }, { $group: { _id: '$source', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray(),
    col.aggregate([{ $match: filter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, views: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } }, plays: { $sum: { $cond: [{ $eq: ['$type', 'play_request'] }, 1, 0] } } } }, { $sort: { _id: 1 } }]).toArray(),
    getTrackingConfig(),
    (async () => {
      if (!process.env.LIVE_DASHBOARD_TOKEN) return { connected: false, error: 'Live dashboard bridge is not configured.' };
      try { const res = await fetch(LIVE_DASHBOARD_ORIGIN + '/api/digital-dashboard', { headers: { Authorization: 'Bearer ' + process.env.LIVE_DASHBOARD_TOKEN }, signal: AbortSignal.timeout(15000), redirect: 'error' });
        if (!res.ok) return { connected: false, error: `Live source returned HTTP ${res.status}.` };
        const text = await res.text(); if (text.length > 1000000) throw new Error('Unexpected response');
        const data = JSON.parse(text); if (data.schemaVersion !== 1) throw new Error('Unexpected schema');
        return { connected: true, ...data }; } catch { return { connected: false, error: 'Live source could not be reached. Retry to refresh.' }; }
    })(),
    col.findOne({type:'tracking_status'},{sort:{createdAt:-1},projection:{tracking:1,createdAt:1,_id:0}}),
  ]);
  const first = await col.findOne({}, { sort: { createdAt: 1 }, projection: { createdAt: 1 } });
  return { fetchedAt: new Date(), days, timezone: 'UTC', autoRefreshSeconds: 60, source: upstream,
    traffic: { connected: Boolean(first), startedAt: first?.createdAt || null, views, sessions: sessions.filter(Boolean).length, playRequests: plays, sources: sources.map((s: any) => ({ source: s._id || '(direct)', count: s.count })), daily },
    google: { ga4: tracking.config.ga4MeasurementId, gtm: tracking.config.gtmContainerId, adsense: tracking.config.adsenseClientId, adsEnabled: tracking.config.adsEnabled, source: 'PlayBeat Digital central settings', ga4ReportsConnected: false, adsenseRevenueConnected: false, liveInstallation:(upstream as any).google||null, observation:observation ? {at:observation.createdAt,...observation.tracking}:null },
    commerce: { connected: false, reason: 'PlayBeat.live checkout is not connected yet; Digital orders remain separate.' },
    inquiries: { connected: false, reason: 'No PlayBeat.live inquiry or messaging source is connected yet.' },
    rule: 'Digital is the main admin. Refresh latest Live release/settings and real activity automatically; never substitute Digital figures for Live reports.' };
}
export function cleanLiveEvent(body: any) {
  if (!['page_view', 'play_request','tracking_status'].includes(body?.type) || typeof body.sessionId !== 'string' || !/^[\w-]{8,80}$/.test(body.sessionId)) throw new Error('Invalid Live event.');
  const path = typeof body.path === 'string' ? body.path.split(/[?#]/)[0].slice(0,300) : '/';
  if (/^\/(?:admin|crm)(?:\/|$)/i.test(path)) return null;
  let source = trafficSource(typeof body.referrer === 'string' ? body.referrer : '');
  if (source === 'playbeat.live') source = '(internal)';
  const campaign = Object.fromEntries(['utm_source','utm_medium','utm_campaign'].map(key=>[key,typeof body.campaign?.[key]==='string'?body.campaign[key].replace(/[^\w .-]/g,'').slice(0,160):'']));
  return { type: body.type, sessionId: body.sessionId, path, source, campaign, tracking:body.type==='tracking_status'?{ga4:body.tracking?.ga4===true,adsense:body.tracking?.adsense===true}:undefined, channelId: typeof body.channelId === 'string' ? body.channelId.slice(0,120) : undefined, createdAt: new Date() };
}
