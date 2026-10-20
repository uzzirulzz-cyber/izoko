import assert from 'node:assert/strict';
import {Query} from 'mingo';
import {streamingHandler} from '../api/_lib/streamingCustomer.js';
const collections=new Map<string,any[]>();
let fail=false;
const db:any={collection(name:string){if(!collections.has(name))collections.set(name,[]);const docs=collections.get(name)!;const find=(q:any)=>docs.find(d=>new Query(q).test(d));return {
 findOne:async(q:any)=>structuredClone(find(q)||null),
 insertOne:async(d:any)=>{if(docs.some(v=>v._id===d._id))throw Object.assign(Error(),{code:11000});docs.push(structuredClone(d));},
 deleteOne:async(q:any)=>{const d=find(q);if(d)docs.splice(docs.indexOf(d),1);},
 deleteMany:async(q:any)=>{for(let i=docs.length-1;i>=0;i--)if(new Query(q).test(docs[i]))docs.splice(i,1);},
 findOneAndUpdate:async(q:any,u:any)=>{if(fail)throw Error('Database offline');let d=find(q);if(!d){d={...q,...u.$setOnInsert};docs.push(d);}for(const k in u.$inc)d[k]=(d[k]||0)+u.$inc[k];return structuredClone(d);},
 updateOne:async(q:any,u:any)=>{const d=find(q);if(!d)return {matchedCount:0};for(const k in u.$set){if(k==='profiles.$'){const index=d.profiles.findIndex((p:any)=>p.id===q.profiles.$elemMatch.id);d.profiles[index]=structuredClone(u.$set[k]);}else if(k.startsWith('profiles.$.')){const p=d.profiles.find((p:any)=>p.id===q['profiles.id']);p[k.slice(11)]=u.$set[k];}else d[k]=u.$set[k];}if(u.$push)d.profiles.push(structuredClone(u.$push.profiles));return {matchedCount:1};}
 };}};
// Owned fixture tests only; no external broadcaster is contacted.
globalThis.fetch=(async()=>Response.json({channels:[{id:'channel-a',name:'Fixture A',country:'PK',categories:['News'],sources:[{url:'https://media.example.test/a.m3u8'}]},{id:'channel-b',name:'Fixture B',country:'US',categories:['Music'],sources:[{url:'https://media.example.test/b.m3u8'}]}]})) as typeof fetch;
async function request(entity:string,action:string,body:any=null,token='',profileId='',device='device-test-123456789'){
 let status=0,data:any;const req:any={query:{entity,action,profileId},method:body?'POST':'GET',body,headers:{'x-playbeat-device':device,'content-type':'application/json','x-forwarded-for':'192.0.2.42',authorization:token?'Bearer '+token:''}};
 const res:any={setHeader(){},status(n:number){status=n;return this;},json(v:any){data=v;return this;}};await streamingHandler(req,res,db);return {status,data};
}
const password='Owned verification password 42!';
const a=await request('live','register',{email:'a@example.test',name:'Owner A',password});assert.equal(a.status,201);assert(!JSON.stringify(a.data).includes('passwordHash'));const token=a.data.token,p=a.data.account.profiles[0].id;
assert.equal((await request('magxtv','me',null,token)).status,401,'Sessions must be entity-bound');
assert.equal((await request('live','me',null,token,'','another-device-123456789')).status,401,'Sessions must be device-bound');
const b=await request('magxtv','register',{email:'a@example.test',name:'Independent account',password});assert.equal(b.status,201);assert.notEqual(a.data.account.id,b.data.account.id);
const other=await request('live','register',{email:'b@example.test',name:'Owner B',password});assert.equal(other.status,201);
assert.equal((await request('live','library',null,other.data.token,p)).status,404,'Other account profile denied');
assert.equal((await request('live','profiles',{name:'Second viewer'},token)).status,200);
const second=collections.get('streaming_customer_accounts')![0].profiles[1].id;
assert.equal((await request('live','favorite',{profileId:p,channelId:'channel-a',enabled:true},token)).status,200);
assert.equal((await request('live','favorite',{profileId:p,channelId:'unknown',enabled:true},token)).status,404);
assert.equal((await request('live','playlist',{profileId:p,name:'My news'},token)).status,200);
let library=await request('live','library',null,token,p);assert.deepEqual(library.data.favorites,['channel-a']);const playlist=library.data.playlists[0].id;
assert.equal((await request('live','playlist-item',{profileId:p,playlistId:playlist,channelId:'channel-b',enabled:true},token)).status,200);
assert.equal((await request('live','history',{profileId:p,channelId:'channel-a'},token)).status,200);
library=await request('live','library',null,token,p);assert.deepEqual(library.data.playlists[0].channelIds,['channel-b']);assert.equal(library.data.history[0].channelId,'channel-a');
assert.deepEqual((await request('live','library',null,token,second)).data.favorites,[],'Profiles must have independent libraries');
assert.equal((await request('live','logout',{},token)).status,200);assert.equal((await request('live','me',null,token)).status,401);
const login=await request('live','login',{email:'a@example.test',password});assert.equal(login.status,200);assert.deepEqual((await request('live','library',null,login.data.token,p)).data.favorites,['channel-a'],'Library persists after login');
assert.equal((await request('live','login',{email:'a@example.test',password:'incorrect password'})).status,401);
fail=true;assert.equal((await request('live','login',{email:'a@example.test',password})).status,503,'Auth rate limiting must fail closed');fail=false;
assert.equal((await request('live','delete-account',{password},login.data.token)).status,200);assert.equal((await request('live','me',null,login.data.token)).status,401);assert.equal((await request('magxtv','me',null,b.data.token)).status,200,'Deleting one entity leaves another entity intact');
console.log('PASS: customer signup/login, cross-entity/account/profile/device isolation, catalog validation, persisted favorites/playlists/history, logout, deletion, and fail-closed database limits.');
