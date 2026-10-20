export type CatalogWorkspace = 'stream' | 'live' | 'magxtv';
export type NativeChannel = {id:string;name:string;country:string;categories:string[];logo:string;sources:{url:string;quality:string}[]};
const ORIGINS:Record<CatalogWorkspace,{url:string;origin:string}>={
 stream:{url:'https://stream.playbeattv.buzz/api/catalog',origin:'https://stream.playbeattv.buzz'},
 live:{url:'https://playbeat.live/api/tv/catalog',origin:'https://playbeat.live'},
 magxtv:{url:'https://magxtv.click/api/tv/catalog',origin:'https://magxtv.click'},
};
export function publicHttps(value:unknown,origin?:string):string|null{
 if(typeof value!=='string'||!value||value.length>4096)return null;
 try{const u=new URL(value,origin);const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||u.username||u.password||h==='localhost'||h.endsWith('.localhost')||h.startsWith('[')||h.endsWith('.local')||h.endsWith('.internal')||h==='::1'||h==='[::1]'||/^(0\.|127\.|10\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return null;if([...u.searchParams.keys()].some(k=>/^(password|passwd|username|api_?key|access_token|token)$/i.test(k)))return null;return u.href;}catch{return null;}
}
export function normalizeCatalog(workspace:CatalogWorkspace,body:any):NativeChannel[]{
 const root=ORIGINS[workspace];const list=body?.channels||body?.items;
 if(!Array.isArray(list))throw Error('INVALID_CATALOG');
 const seen=new Set<string>();return list.slice(0,20000).flatMap((row:any)=>{
  if(!row||typeof row!=='object')return [];
  const id=String(row.id??'').slice(0,160),name=String(row.name??'').slice(0,180);if(!id||!name||seen.has(id))return [];
  const values=Array.isArray(row.srcs)?row.srcs:Array.isArray(row.sources)?row.sources:[{u:row.url||row.streamUrl||row.hlsUrl,q:row.quality}];
  const sources=values.slice(0,8).flatMap((s:any)=>{const url=publicHttps(typeof s==='string'?s:s?.u||s?.url,root.origin);return url?[{url,quality:String(s?.q||s?.quality||'Auto').slice(0,40)}]:[];});
  if(!sources.length)return [];seen.add(id);
  return [{id,name,country:String(row.country||'Global').slice(0,80),categories:(Array.isArray(row.cats)?row.cats:Array.isArray(row.categories)?row.categories:[row.group||row.category||'General']).slice(0,8).map((v:any)=>String(v).slice(0,80)),logo:publicHttps(row.logo,root.origin)||'',sources}];
 });
}
const cache=new Map<CatalogWorkspace,{expires:number;channels:NativeChannel[];source:any}>();
export async function organizationCatalog(workspace:CatalogWorkspace,query:Record<string,unknown>){
 if(!(workspace in ORIGINS))throw Error('UNKNOWN_CATALOG');let entry=cache.get(workspace);const now=Date.now();
 if(!entry||entry.expires<now){
  const r=await fetch(ORIGINS[workspace].url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(18000)});
  if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw Error('CATALOG_UNAVAILABLE');
  if(Number(r.headers.get('content-length'))>6000000)throw Error('CATALOG_TOO_LARGE');
  const reader=r.body?.getReader();if(!reader)throw Error('CATALOG_UNAVAILABLE');const chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>6000000){await reader.cancel();throw Error('CATALOG_TOO_LARGE');}chunks.push(part.value);}}finally{reader.releaseLock();}
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));const channels=normalizeCatalog(workspace,value);
  entry={channels,expires:now+300000,source:{workspace,url:ORIGINS[workspace].url,checkedAt:new Date().toISOString(),catalogGeneratedAt:typeof value.meta?.generatedAt==='string'?value.meta.generatedAt:null,catalogAttribution:typeof value.meta?.source==='string'?value.meta.source.slice(0,400):null,streamHealthVerifiedNow:false}};cache.set(workspace,entry);
 }
 const q=String(query.q||'').trim().toLowerCase().slice(0,100),country=String(query.country||''),category=String(query.category||'');
 const countries=[...new Set(entry.channels.map(c=>c.country))].sort();const categories=[...new Set(entry.channels.flatMap(c=>c.categories))].sort();
 const filtered=entry.channels.filter(c=>(!q||(c.name+' '+c.country+' '+c.categories.join(' ')).toLowerCase().includes(q))&&(!country||c.country===country)&&(!category||c.categories.includes(category)));
 const page=Math.max(1,Math.min(1000,Math.floor(Number(query.page))||1)),pageSize=Math.max(1,Math.min(100,Math.floor(Number(query.pageSize))||40)),offset=(page-1)*pageSize;
 return {success:true,workspace,total:filtered.length,catalogTotal:entry.channels.length,page,pageSize,hasMore:offset+pageSize<filtered.length,countries,categories,channels:filtered.slice(offset,offset+pageSize),source:entry.source};
}

export async function catalogChannelsByIds(workspace:CatalogWorkspace,ids:string[]):Promise<NativeChannel[]>{
 await organizationCatalog(workspace,{pageSize:1});const wanted=new Set(ids.slice(0,7000));return (cache.get(workspace)?.channels||[]).filter(c=>wanted.has(c.id));
}
