import type {VercelRequest,VercelResponse} from '@vercel/node';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {getDb} from './mongo.js';
import {clientIp} from './rateLimit.js';
import {organizationCatalog, catalogChannelsByIds, type CatalogWorkspace} from './organizationCatalog.js';
const entities=new Set(['live','magxtv','stream']);
const sha=(v:string)=>createHash('sha256').update(v).digest('hex');
const text=(v:unknown,max=80)=>typeof v==='string'?v.trim().slice(0,max):'';
const problem=(status:number,message:string)=>Object.assign(new Error(message),{status});
const accountView=(a:any)=>({id:a._id,entity:a.entity,email:a.email,name:a.name,emailVerified:false,profiles:a.profiles.map((p:any)=>({id:p.id,name:p.name,avatar:p.avatar}))});
export async function streamingHandler(req:VercelRequest,res:VercelResponse,db:any){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const entity=text(req.query.entity,16) as CatalogWorkspace,action=text(req.query.action,32)||'me';
  if(!entities.has(entity))throw problem(400,'Unknown streaming service.');
  if(!['GET','POST'].includes(req.method||''))throw problem(405,'Method not allowed.');
  const body=req.body&&typeof req.body==='object'&&!Array.isArray(req.body)?req.body:{};
  if(JSON.stringify(body).length>12000)throw problem(413,'Request too large.');
  const device=text(req.headers['x-playbeat-device'],80);if(!/^[a-zA-Z0-9-]{16,80}$/.test(device))throw problem(400,'Valid device identifier required.');
  const write=req.method==='POST';
  if(write&&!String(req.headers['content-type']||'').includes('application/json'))throw problem(415,'JSON required.');
  if(write&&req.headers.origin&&!['https://playbeat.digital','https://playbeat.live','https://magxtv.click','https://stream.playbeattv.buzz'].includes(String(req.headers.origin)))throw problem(403,'Origin denied.');
  const accounts=db.collection('streaming_customer_accounts'),sessions=db.collection('streaming_customer_sessions');
  const now=new Date();
  // Security rate limits are atomic and deliberately fail closed on database errors.
  const limit=['register','login'].includes(action)?12:180;
  const key=sha(`${entity}:${clientIp(req)}:${['register','login'].includes(action)?'auth':'api'}:${Math.floor(Date.now()/600000)}`);
  const hit=await db.collection('streaming_customer_limits').findOneAndUpdate({_id:key},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+1200000)}},{upsert:true,returnDocument:'after'});
  if(Number(hit?.count||0)>limit){res.setHeader('Retry-After','600');throw problem(429,'Too many requests. Please try again later.');}
  if(['register','login'].includes(action)){
   if(!write)throw problem(405,'POST required.');
   const email=text(body.email,254).toLowerCase(),password=typeof body.password==='string'?body.password:'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||Buffer.byteLength(password)>72)throw problem(400,'Enter a valid email and a password of 12–72 bytes.');
   const id=entity+':'+sha(email);let account=await accounts.findOne({_id:id});
   if(action==='register'){
    if(account)throw problem(409,'Unable to create this account. Try signing in.');
    const name=text(body.name,60);if(!name)throw problem(400,'Your name is required.');
    account={_id:id,entity,email,name,authVersion:randomUUID(),passwordHash:await bcrypt.hash(password,12),createdAt:now,profiles:[{id:randomUUID(),name,avatar:0,favorites:[],playlists:[],history:[]}]};
    try{await accounts.insertOne(account);}catch(e:any){if(e.code===11000)throw problem(409,'Unable to create this account. Try signing in.');throw e;}
   }else{
    const valid=await bcrypt.compare(password,account?.passwordHash||'$2b$12$QvvBGhjkW9noHk.4azkgXe9rLSf1BKQNUfHKEqhL9fR6Pfysvbh/i');
    if(!account||!valid)throw problem(401,'Email or password is incorrect.');
   }
   const token=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+30*86400000);
   await sessions.insertOne({_id:sha(token),entity,accountId:id,device,createdAt:now,expiresAt,...(typeof account.authVersion==='string'?{authVersion:account.authVersion}:{})});
   return res.status(action==='register'?201:200).json({success:true,token,expiresAt,account:accountView(account)});
  }
  const authorization=String(req.headers.authorization||'');
  const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw problem(401,'Please sign in.');
  const session=await sessions.findOne({_id:sha(token),entity,device,expiresAt:{$gt:now}});
  if(!session)throw problem(401,'Your session expired. Please sign in again.');
  const account=await accounts.findOne({_id:session.accountId,entity});if(!account)throw problem(401,'Account unavailable.');
  // Legacy sessions remain valid only while both documents lack a version. A
  // password change rotates the account version, invalidating even a login
  // that finished inserting its old-version session after bulk revocation.
  const versionMatches=typeof account.authVersion==='string'?session.authVersion===account.authVersion:account.authVersion===undefined&&session.authVersion===undefined;
  if(!versionMatches)throw problem(401,'Your session expired. Please sign in again.');
  if(action==='me'&&!write)return res.status(200).json({success:true,account:accountView(account)});
  if(action==='logout'&&write){await sessions.deleteOne({_id:session._id});return res.status(200).json({success:true});}
  if(action==='password'&&write){
   if(!await bcrypt.compare(String(body.currentPassword||''),account.passwordHash))throw problem(403,'Current password is incorrect.');
   const p=typeof body.password==='string'?body.password:'';if(p.length<12||Buffer.byteLength(p)>72)throw problem(400,'Use a password of 12–72 bytes.');
   const changed=await accounts.updateOne({_id:account._id,...(typeof account.authVersion==='string'?{authVersion:account.authVersion}:{authVersion:{$exists:false}})},{$set:{passwordHash:await bcrypt.hash(p,12),authVersion:randomUUID()}});
   if(!changed.matchedCount)throw problem(409,'Your account changed. Please sign in again.');
   await sessions.deleteMany({accountId:account._id});return res.status(200).json({success:true,signedOut:true});
  }
  if(action==='delete-account'&&write){
   if(!await bcrypt.compare(String(body.password||''),account.passwordHash))throw problem(403,'Password is incorrect.');
   await accounts.deleteOne({_id:account._id});await sessions.deleteMany({accountId:account._id});return res.status(200).json({success:true});
  }
  if(action==='profiles'&&write){
   const name=text(body.name,60);if(!name)throw problem(400,'Profile name required.');
   if(body.profileId){
    const id=text(body.profileId);const out=await accounts.updateOne({_id:account._id,'profiles.id':id},{$set:{'profiles.$.name':name,'profiles.$.avatar':Math.max(0,Math.min(5,Number(body.avatar)||0))},$inc:{'profiles.$.revision':1}});if(!out.matchedCount)throw problem(404,'Profile not found.');
   }else{
    const out=await accounts.updateOne({_id:account._id,'profiles.4':{$exists:false}},{$push:{profiles:{id:randomUUID(),name,avatar:Math.max(0,Math.min(5,Number(body.avatar)||0)),favorites:[],playlists:[],history:[]}}});if(!out.matchedCount)throw problem(409,'Maximum five profiles.');
   }
   return res.status(200).json({success:true,account:accountView(await accounts.findOne({_id:account._id}))});
  }
  const profileId=text(write?body.profileId:req.query.profileId);const p=account.profiles.find((p:any)=>p.id===profileId);if(!p)throw problem(404,'Choose a profile belonging to this account.');
  if(action==='catalog'&&!write)return res.status(200).json(await organizationCatalog(entity,req.query));
  if(action==='library'&&!write){
   const ids=[...new Set<string>([...p.favorites,...p.history.map((h:any)=>h.channelId),...p.playlists.flatMap((l:any)=>l.channelIds)])];
   return res.status(200).json({success:true,profile:{id:p.id,name:p.name,avatar:p.avatar},favorites:p.favorites,playlists:p.playlists,history:p.history,channels:await catalogChannelsByIds(entity,ids)});
  }
  if(!write)throw problem(405,'POST required.');
  // Compare-and-swap the complete bounded profile. Concurrent changes never silently overwrite.
  const revision=Number(p.revision)||0;const next=structuredClone(p);next.revision=revision+1;
  if(['favorite','history','playlist-item'].includes(action)){
   const channelId=text(body.channelId,160);const rows=await catalogChannelsByIds(entity,[channelId]);if(!rows.length)throw problem(404,'Channel unavailable in this service.');
   if(action==='favorite'){next.favorites=next.favorites.filter((id:string)=>id!==channelId);if(body.enabled===true){if(next.favorites.length>=500)throw problem(409,'Favorite limit reached.');next.favorites.push(channelId);}}
   if(action==='history'){next.history=next.history.filter((h:any)=>h.channelId!==channelId);next.history.unshift({channelId,watchedAt:now.toISOString()});next.history=next.history.slice(0,40);}
   if(action==='playlist-item'){const l=next.playlists.find((l:any)=>l.id===body.playlistId);if(!l)throw problem(404,'Playlist not found.');l.channelIds=l.channelIds.filter((id:string)=>id!==channelId);if(body.enabled===true){if(l.channelIds.length>=200)throw problem(409,'Playlist limit reached.');l.channelIds.push(channelId);}}
  }else if(action==='playlist'){
   if(body.remove===true){if(!next.playlists.some((l:any)=>l.id===body.playlistId))throw problem(404,'Playlist not found.');next.playlists=next.playlists.filter((l:any)=>l.id!==body.playlistId);}
   else{const name=text(body.name,60);if(!name)throw problem(400,'Playlist name required.');if(body.playlistId){const l=next.playlists.find((l:any)=>l.id===body.playlistId);if(!l)throw problem(404,'Playlist not found.');l.name=name;}else{if(next.playlists.length>=30)throw problem(409,'Playlist limit reached.');next.playlists.push({id:randomUUID(),name,channelIds:[]});}}
  }else throw problem(404,'Unknown action.');
  const filter:any={_id:account._id,profiles:{$elemMatch:{id:p.id,...(revision?{revision}:{revision:{$exists:false}})}}};
  const result=await accounts.updateOne(filter,{$set:{'profiles.$':next}});if(!result.matchedCount)throw problem(409,'Your library changed. Refresh and try again.');
  return res.status(200).json({success:true,revision:next.revision});
 }catch(e:any){return res.status(e.status||503).json({success:false,error:e.status?e.message:'Service temporarily unavailable. Please try again.'});}
}
let indexes:Promise<unknown>|undefined;
export default async function handler(req:VercelRequest,res:VercelResponse){try{const db=await getDb();
 if(!indexes)indexes=Promise.all([
  db.collection('streaming_customer_sessions').createIndex({expiresAt:1},{expireAfterSeconds:0}),
  db.collection('streaming_customer_sessions').createIndex({accountId:1,device:1}),
  db.collection('streaming_customer_limits').createIndex({expiresAt:1},{expireAfterSeconds:0}),
 ]).catch(e=>{indexes=undefined;throw e;});await indexes;
 return await streamingHandler(req,res,db);}catch{return res.status(503).json({success:false,error:'Service temporarily unavailable.'});}}
