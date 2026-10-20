import assert from 'node:assert/strict';
import {Query} from 'mingo';
import {streamingHandler} from '../api/_lib/streamingCustomer.js';
const collections=new Map<string,any[]>();
let fail=false;
let beforeSessionInsert:((doc:any)=>Promise<void>)|undefined;
let beforeProfileReplace:(()=>Promise<void>)|undefined;
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};};
const db:any={collection(name:string){if(!collections.has(name))collections.set(name,[]);const docs=collections.get(name)!;const find=(q:any)=>docs.find(d=>new Query(q).test(d));return {
 findOne:async(q:any)=>structuredClone(find(q)||null),
 insertOne:async(d:any)=>{if(name==='streaming_customer_sessions'&&beforeSessionInsert)await beforeSessionInsert(d);if(docs.some(v=>v._id===d._id))throw Object.assign(Error(),{code:11000});docs.push(structuredClone(d));},
 deleteOne:async(q:any)=>{const d=find(q);if(d)docs.splice(docs.indexOf(d),1);},
 deleteMany:async(q:any)=>{for(let i=docs.length-1;i>=0;i--)if(new Query(q).test(docs[i]))docs.splice(i,1);},
 findOneAndUpdate:async(q:any,u:any)=>{if(fail)throw Error('Database offline');let d=find(q);if(!d){d={...q,...u.$setOnInsert};docs.push(d);}for(const k in u.$inc)d[k]=(d[k]||0)+u.$inc[k];return structuredClone(d);},
 updateOne:async(q:any,u:any)=>{if(u.$set?.['profiles.$']&&beforeProfileReplace)await beforeProfileReplace();const d=find(q);if(!d)return {matchedCount:0};for(const k in u.$set){if(k==='profiles.$'){const index=d.profiles.findIndex((p:any)=>p.id===q.profiles.$elemMatch.id);d.profiles[index]=structuredClone(u.$set[k]);}else if(k.startsWith('profiles.$.')){const p=d.profiles.find((p:any)=>p.id===q['profiles.id']);p[k.slice(11)]=u.$set[k];}else d[k]=u.$set[k];}for(const k in u.$inc){if(k.startsWith('profiles.$.')){const p=d.profiles.find((p:any)=>p.id===q['profiles.id']);p[k.slice(11)]=(p[k.slice(11)]||0)+u.$inc[k];}else d[k]=(d[k]||0)+u.$inc[k];}if(u.$push)d.profiles.push(structuredClone(u.$push.profiles));return {matchedCount:1};}
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
// Pause a library replacement after it read its profile, then rename that
// profile. The stale whole-profile replacement must lose its CAS and retain
// the concurrently committed name/avatar and revision.
const renameStarted=deferred(),renameContinue=deferred();
beforeProfileReplace=async()=>{renameStarted.resolve();await renameContinue.promise;};
const racingLibrary=request('live','favorite',{profileId:p,channelId:'channel-b',enabled:true},login.data.token);
await renameStarted.promise;beforeProfileReplace=undefined;
assert.equal((await request('live','profiles',{profileId:p,name:'Renamed viewer',avatar:3},login.data.token)).status,200);
renameContinue.resolve();assert.equal((await racingLibrary).status,409);
const persistedProfile=collections.get('streaming_customer_accounts')!.find(row=>row._id===a.data.account.id).profiles.find((row:any)=>row.id===p);
assert.equal(persistedProfile.name,'Renamed viewer');assert.equal(persistedProfile.avatar,3);assert(!persistedProfile.favorites.includes('channel-b'));

// Pause login immediately before session insertion. A password change can
// finish its bulk deletion before that insertion; the captured authVersion
// must still make the late-inserted old-password session unusable.
const race=await request('stream','register',{email:'race@example.test',name:'Race verifier',password});assert.equal(race.status,201);
const insertionStarted=deferred(),insertionContinue=deferred();
beforeSessionInsert=async()=>{insertionStarted.resolve();await insertionContinue.promise;};
const staleLogin=request('stream','login',{email:'race@example.test',password});
await insertionStarted.promise;beforeSessionInsert=undefined;
const changedPassword='New verification password 73!';
assert.equal((await request('stream','password',{currentPassword:password,password:changedPassword},race.data.token)).status,200);
insertionContinue.resolve();const stale=await staleLogin;assert.equal(stale.status,200);
assert.equal((await request('stream','me',null,stale.data.token)).status,401,'Late old-password login cannot survive revocation');
const fresh=await request('stream','login',{email:'race@example.test',password:changedPassword});assert.equal(fresh.status,200);
assert.equal((await request('stream','me',null,fresh.data.token)).status,200);
assert.equal((await request('stream','delete-account',{password:changedPassword},fresh.data.token)).status,200);

// Accounts created before versioning can continue using matching unversioned
// sessions. New legacy logins omit the field rather than serializing null.
const legacy=await request('stream','register',{email:'legacy@example.test',name:'Legacy verifier',password});assert.equal(legacy.status,201);
const legacyAccount=collections.get('streaming_customer_accounts')!.find(row=>row._id===legacy.data.account.id);delete legacyAccount.authVersion;
const legacySession=collections.get('streaming_customer_sessions')!.find(row=>row.accountId===legacyAccount._id);delete legacySession.authVersion;
assert.equal((await request('stream','me',null,legacy.data.token)).status,200);
const legacyLogin=await request('stream','login',{email:'legacy@example.test',password});assert.equal(legacyLogin.status,200);assert.equal((await request('stream','me',null,legacyLogin.data.token)).status,200);
assert(collections.get('streaming_customer_sessions')!.filter(row=>row.accountId===legacyAccount._id).every(row=>!Object.hasOwn(row,'authVersion')));
legacyAccount.authVersion='rotated-test-version';assert.equal((await request('stream','me',null,legacyLogin.data.token)).status,401,'Missing session version cannot match a versioned account');

assert.equal((await request('live','delete-account',{password},login.data.token)).status,200);assert.equal((await request('live','me',null,login.data.token)).status,401);assert.equal((await request('magxtv','me',null,b.data.token)).status,200,'Deleting one entity leaves another entity intact');
console.log('PASS: customer signup/login, cross-entity/account/profile/device isolation, catalog validation, persisted favorites/playlists/history, logout, deletion, fail-closed database limits, concurrent profile rename protection, in-flight login revocation, and legacy version compatibility.');
