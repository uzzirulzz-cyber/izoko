import {writeAudit} from "./audit.js";
import { ObjectId,type Db } from 'mongodb';
import { RecordError } from './organizationRecords.js';
import type { OrganizationAccount } from './organizationPolicy.js';
const transitions:Record<string,string[]>={pending:['processing','cancelled'],processing:['shipped','delivered','cancelled'],shipped:['delivered']};
export function finiteStock(doc:any){return doc.stockMode==='finite'||(doc.stockMode!=='unlimited'&&(doc.productType==='physical'||doc.digital===false));}
export function validOrderTransition(from:string,to:string){return !!transitions[from]?.includes(to);}
export async function organizationOperation(db:Db,section:string,user:OrganizationAccount,body:any){
 if(typeof body.operationId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.operationId)||!ObjectId.isValid(String(body.id||'')))throw new RecordError(400,'A record and operation identifier are required.');
 const inventory=section==='inventory-adjust',collection=db.collection<any>(inventory?'products':'orders'),_id=new ObjectId(body.id),doc=await collection.findOne({_id});
 if(!doc)throw new RecordError(404,'Record unavailable.');
 const actor=String(user.email||''),history=Array.isArray(doc.organizationOperations)?doc.organizationOperations:[];
 const previous=history.find((op:any)=>op.id===body.operationId&&op.actor===actor);
 if(previous)return {success:true,alreadyApplied:true,stock:doc.stock,status:doc.status};
 let change:any,expected:any,event:any={id:body.operationId,actor,at:new Date()};
 if(inventory){
  if(!finiteStock(doc))throw new RecordError(409,'Unlimited stock cannot be adjusted.');
  if(!Number.isSafeInteger(body.stock)||body.stock<0||body.stock>1e9||!Number.isSafeInteger(body.expectedStock))throw new RecordError(400,'Enter a valid stock quantity.');
  if(Number(doc.stock||0)!==body.expectedStock)throw new RecordError(409,'Stock changed. Refresh before adjusting.');
  if(typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>300)throw new RecordError(400,'An adjustment reason is required.');
  change={stock:body.stock};expected={stock:doc.stock===undefined?{$exists:false}:doc.stock};event={...event,action:'stock.adjust',from:body.expectedStock,to:body.stock,reason:body.reason.trim()};
 }else{
  if(typeof body.expectedStatus!=='string'||doc.status!==body.expectedStatus)throw new RecordError(409,'Order changed. Refresh before updating.');
  if(!validOrderTransition(doc.status,body.status))throw new RecordError(409,'That fulfillment transition is not allowed.');
  change={status:body.status};expected={status:doc.status};event={...event,action:'order.fulfillment',from:doc.status,to:body.status};
 }
 const result=await collection.findOneAndUpdate({_id,...expected,'organizationOperations.id':{$ne:body.operationId}},[{$set:{...change,updatedAt:'$$NOW',organizationOperations:{$slice:[{$concatArrays:[{$ifNull:['$organizationOperations',[]]},[{$literal:event}]]},-100]}}}],{returnDocument:'after',includeResultMetadata:false});
 if(!result)throw new RecordError(409,'The record changed. Refresh before retrying.');
 await writeAudit(db,{actor:user,action:"organization."+event.action,targetType:inventory?"product":"order",targetId:body.id,meta:{operationId:body.operationId,from:event.from,to:event.to}});
 return {success:true,stock:result.stock,status:result.status};
}
