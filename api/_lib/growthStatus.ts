import { getTrackingConfig } from './trackingConfig.js';
import { PUBLIC_TRAFFIC_FILTER } from './reporting.js';
export function pakistanDay(now = new Date()) {
  const date = new Date(now.getTime() + 5 * 3600000).toISOString().slice(0,10);
  const start = new Date(new Date(date + 'T00:00:00Z').getTime() - 5 * 3600000);
  return { date, start, end:new Date(start.getTime()+86400000), timezone:'Asia/Karachi' };
}
export async function growthStatus(db:any) {
  const {date,start,end,timezone}=pakistanDay();
  const count = async (name:string) => {
    const rows = await db.collection(name).distinct('sessionId',{type:'page_view',...PUBLIC_TRAFFIC_FILTER,createdAt:{$gte:start,$lt:end},isTest:{$ne:true}});
    return rows.filter(Boolean).length;
  };
  const [digital,live,tracking,promotion] = await Promise.all([count('analytics_events'),count('playbeat_live_events'),getTrackingConfig(),(async()=>{
    try { const res=await fetch('https://playbeat.live/promotion-status.json',{signal:AbortSignal.timeout(10000),redirect:'error'}); if(!res.ok)return null; const text=await res.text(); if(text.length>64000)return null; const body=JSON.parse(text); return body.schemaVersion===1?body:null; }catch{return null;}
  })()]);
  return { fetchedAt:new Date(),date,timezone,goalPerSite:1000,measure:'Recorded unique browser sessions; not verified people or GA4 users',sites:[{domain:'playbeat.digital',sessions:digital,target:1000},{domain:'playbeat.live',sessions:live,target:1000}],
    google:{ga4:tracking.config.ga4MeasurementId,gtm:tracking.config.gtmContainerId,adsense:tracking.config.adsenseClientId,adsEnabled:tracking.config.adsEnabled,reportsConnected:false,revenueConnected:false,adsenseApproval:'Not verified'},promotion };
}
