import assert from 'node:assert/strict';
import {publicHttps,normalizeCatalog,organizationCatalog} from '../api/_lib/organizationCatalog.js';
import {canReadSection,workspaceScopes,WORKSPACES} from '../api/_lib/organizationPolicy.js';
assert.equal(WORKSPACES.length,9);assert.ok(WORKSPACES.includes('stream'));assert.equal(new Set(WORKSPACES).size,9);
for(const url of ['http://example.test/live.m3u8','https://user:pass@example.test/live.m3u8','https://127.0.0.1/live.m3u8','https://192.168.1.1/a','file:///etc/passwd','https://x.test/a?api_key=secret','https://x.test/a?password=secret'])assert.equal(publicHttps(url),null,url);
assert.equal(publicHttps('/broadcast-player/stream/42?hls=1','https://playbeat.live'),'https://playbeat.live/broadcast-player/stream/42?hls=1');
const fixture={meta:{generatedAt:'2026-10-14T00:00:00Z'},channels:[
{id:'news',name:'News Channel',country:'PK',cats:['news'],logo:'https://cdn.example.test/logo.png',srcs:[{u:'https://cdn.example.test/live.m3u8',q:'1080p'},{u:'http://insecure.test/no.m3u8'}]},
{id:'sports',name:'Sports Channel',country:'GB',cats:['sports'],srcs:[{u:'https://cdn.example.test/sports.m3u8',q:'720p'}]},
{id:'bad',name:'Private URL',srcs:[{u:'https://admin:pass@cdn.example.test/private'}]},
{id:'news',name:'Duplicate',srcs:[{u:'https://cdn.example.test/duplicate.m3u8'}]},
]};
const normalized=normalizeCatalog('stream',fixture);assert.equal(normalized.length,2);assert.equal(normalized[0].sources.length,1);assert.equal(normalized[0].sources[0].quality,'1080p');assert.equal(normalized[0].country,'PK');
assert.throws(()=>normalizeCatalog('live',{message:'HTML fallback'}),/INVALID_CATALOG/);
assert.equal(canReadSection({role:'staff',organizationScopes:['stream']},'catalog-stream'),true);assert.equal(canReadSection({role:'staff',organizationScopes:['stream']},'catalog-live'),false);assert.equal(canReadSection({role:'customer',organizationScopes:['stream']},'catalog-stream'),false);assert.equal(canReadSection({role:'admin'},'catalog-magxtv'),true);
let fetches=0;globalThis.fetch=(async(url:any)=>{fetches++;assert.equal(String(url),'https://stream.playbeattv.buzz/api/catalog');return Response.json(fixture);}) as any;
const first=await organizationCatalog('stream',{page:1,pageSize:1});assert.equal(first.total,2);assert.equal(first.channels.length,1);assert.equal(first.hasMore,true);assert.equal(first.source.streamHealthVerifiedNow,false);
const second=await organizationCatalog('stream',{page:2,pageSize:1});assert.equal(second.channels[0].id,'sports');assert.equal(second.hasMore,false);assert.equal(fetches,1,'public catalog cache');
assert.equal((await organizationCatalog('stream',{country:'PK'})).total,1);assert.equal((await organizationCatalog('stream',{q:'sports'})).channels[0].id,'sports');assert.equal((await organizationCatalog('stream',{category:'missing'})).total,0);
console.log('Catalog checks passed: nine workspaces, provider isolation, malformed/unsafe source rejection, deduplication, pagination, search/filtering and cache provenance.');
