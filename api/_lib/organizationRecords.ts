import type { Db } from 'mongodb';
import { createHash } from 'node:crypto';
import type { OrganizationAccount } from './organizationPolicy.js';

/** Organization-owned records, separate from legacy demo marketplace state. */
export const RECORDS = {
  'deal-records': { workspace: 'deals', fields: ['title','description','stage','currency','askingPrice','contact'], stages: ['draft','review','negotiating','won','lost'] },
  'mystic-projects': { workspace: 'mystic', fields: ['title','description','stage'], stages: ['active','paused','completed'] },
  'visual-designs': { workspace: 'visual', fields: ['title','description','heading','caption','accent','textY','stage'], stages: ['draft','approved','archived'] },
} as const;
export class RecordError extends Error { constructor(public status:number,message:string){super(message);} }
export function recordChanges(section:keyof typeof RECORDS,body:any) {
 const spec=RECORDS[section],changes:Record<string,unknown>={};
 if(!body||typeof body!=='object'||Array.isArray(body))throw new RecordError(400,'Invalid record.');
 for(const field of spec.fields)if(body[field]!==undefined){
  if(field==='askingPrice'){const v=Number(body[field]);if(!Number.isFinite(v)||v<0||v>1e12)throw new RecordError(400,'Enter a valid asking price.');changes[field]=v;}
  else if(field==='textY'){const v=Number(body[field]);if(!Number.isFinite(v)||v<.25||v>.8)throw new RecordError(400,'Invalid text position.');changes[field]=v;}
  else{if(typeof body[field]!=='string')throw new RecordError(400,'Invalid '+field+'.');const value=body[field].trim();if(value.length>(field==='description'?12000:field==='caption'?500:field==='heading'?300:field==='contact'?300:180))throw new RecordError(400,field+' is too long.');changes[field]=value;}
 }
 if(changes.title!==undefined&&!changes.title)throw new RecordError(400,'A title is required.');
 if(changes.stage!==undefined&&!(spec.stages as readonly string[]).includes(String(changes.stage)))throw new RecordError(400,'Invalid stage.');
 if(changes.currency!==undefined&&!/^[A-Z]{3}$/.test(String(changes.currency)))throw new RecordError(400,'Use a three-letter currency.');
 if(changes.accent!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(String(changes.accent)))throw new RecordError(400,'Invalid accent color.');
 return changes;
}
const identity=(user:OrganizationAccount)=>String(user.email||'').toLowerCase();
export async function organizationRecords(db:Db,section:keyof typeof RECORDS,user:OrganizationAccount,method:string,query:Record<string,unknown>,body:any){
 const spec=RECORDS[section],actor=identity(user);if(!actor)throw new RecordError(403,'An account identity is required.');
 const collection=db.collection<{_id:string;events:Record<string,unknown>[];workspace:string;revision:number;createdBy:string;createdAt:Date;updatedAt:Date}>('organization_workspace_records');
 const access:any={workspace:spec.workspace,...(user.role==='admin'?{}:{createdBy:actor})};
 if(method==='GET'){
  const page=Math.max(1,Math.min(10000,Math.floor(Number(query.page))||1)),limit=30;
  const filter:any={...access};if(query.id)filter._id=String(query.id);
  const items=await collection.find(filter).sort({updatedAt:-1,_id:1}).skip((page-1)*limit).limit(limit+1).toArray();
  return {items:items.slice(0,limit).map(({_id,events,...record})=>({id:_id,...record})),page,hasMore:items.length>limit,source:{name:'Playbeat organization records',checkedAt:new Date().toISOString(),legacyMarketplaceSync:false}};
 }
 if(method!=='POST')throw new RecordError(405,'Unsupported record action.');
 const changes=recordChanges(section,body),now=new Date();
 if(!body.id){
  if(!changes.title)throw new RecordError(400,'A title is required.');
  if(typeof body.operationId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.operationId))throw new RecordError(400,'A unique operation identifier is required.');
  const id=createHash('sha256').update(section+'|'+actor+'|'+body.operationId).digest('hex');
  const record={_id:id,workspace:spec.workspace,...changes,stage:changes.stage||spec.stages[0],revision:1,createdBy:actor,createdAt:now,updatedAt:now,events:[{action:'created',actor,at:now}]};
  const existing=await collection.findOne({_id:id});
  if(!existing){try{await collection.insertOne(record);}catch(e:any){if(e?.code!==11000)throw e;}}
  const saved=await collection.findOne({_id:id});const {_id,events,...value}=saved;return {success:true,record:{id:_id,...value}};
 }
 if(typeof body.id!=='string'||!Number.isInteger(body.revision)||body.revision<1)throw new RecordError(400,'Record identifier and revision are required.');
 const saved=await collection.findOneAndUpdate({...access,_id:body.id,revision:body.revision},{$set:{...changes,updatedAt:now},$inc:{revision:1},$push:{events:{$each:[{action:'updated',actor,at:now,fields:Object.keys(changes)}],$slice:-100}}},{returnDocument:'after',includeResultMetadata:false});
 if(!saved)throw new RecordError(409,'This record changed or is unavailable. Refresh before editing.');
 const {_id,events,...value}=saved;return {success:true,record:{id:_id,...value}};
}
