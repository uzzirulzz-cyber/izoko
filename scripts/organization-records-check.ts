import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Query } from 'mingo';
import { organizationRecords,recordChanges } from '../api/_lib/organizationRecords.js';
import { studioAI } from '../api/_lib/organizationStudioAI.js';
import { canReadSection } from '../api/_lib/organizationPolicy.js';
const collections=new Map<string,any[]>();
const db:any={collection(name:string){if(!collections.has(name))collections.set(name,[]);const docs=collections.get(name)!;const match=(q:any)=>docs.filter(d=>new Query(q).test(d));return {
 findOne:async(q:any)=>match(q)[0]||null,
 insertOne:async(d:any)=>{if(docs.some(v=>v._id===d._id))throw Object.assign(Error(),{code:11000});docs.push(structuredClone(d));},
 updateOne:async(q:any,u:any)=>{const d=match(q)[0];if(d)Object.assign(d,u.$set);},
 findOneAndUpdate:async(q:any,u:any)=>{const d=match(q)[0];if(!d)return null;Object.assign(d,u.$set);for(const k in u.$inc)d[k]+=u.$inc[k];if(u.$push)d.events.push(...u.$push.events.$each);return structuredClone(d);},
 find(q:any){let rows=match(q);const cursor:any={sort:()=>cursor,skip:(n:number)=>{rows=rows.slice(n);return cursor;},limit:(n:number)=>{rows=rows.slice(0,n);return cursor;},toArray:async()=>structuredClone(rows)};return cursor;}
};}};
const staff={email:'a@example.test',role:'staff',organizationScopes:['deals','mystic','visual']},other={...staff,email:'b@example.test'},owner={email:'owner@example.test',role:'admin'};
assert(canReadSection(staff,'deal-records'));assert(!canReadSection({...staff,organizationScopes:['digital']},'deal-records'));assert(!canReadSection({role:'customer',organizationScopes:['deals']},'deal-records'));
assert.throws(()=>recordChanges('deal-records',{askingPrice:-1}));assert.throws(()=>recordChanges('deal-records',{stage:'paid'}));assert.throws(()=>recordChanges('visual-designs',{textY:2}));
assert.deepEqual(recordChanges('mystic-projects',{title:'Project',createdBy:'someone-else',revision:999}),{title:'Project'});
const request={title:'Business review',description:'Real user-entered record',askingPrice:120,currency:'PKR',operationId:randomUUID()};
const first:any=await organizationRecords(db,'deal-records',staff,'POST',{},request);
const replay:any=await organizationRecords(db,'deal-records',staff,'POST',{},request);assert.equal(first.record.id,replay.record.id);assert.equal(collections.get('organization_workspace_records')!.length,1);
assert.equal((await organizationRecords(db,'deal-records',other,'GET',{},{} ) as any).items.length,0);
assert.equal((await organizationRecords(db,'deal-records',owner,'GET',{},{} ) as any).items.length,1);
await assert.rejects(()=>organizationRecords(db,'deal-records',other,'POST',{},{id:first.record.id,revision:1,title:'Unauthorized'}),/changed or is unavailable/);
await organizationRecords(db,'deal-records',staff,'POST',{},{id:first.record.id,revision:1,title:'Updated'});
await assert.rejects(()=>organizationRecords(db,'deal-records',staff,'POST',{},{id:first.record.id,revision:1,title:'Stale'}),/changed or is unavailable/);
const stored=collections.get('organization_workspace_records')![0];assert.equal(stored.revision,2);assert.equal(stored.events.length,2);assert.equal(stored.events[1].actor,staff.email);
const project:any=await organizationRecords(db,'mystic-projects',staff,'POST',{},{title:'Plan',description:'Brief',operationId:randomUUID()});
process.env.OPENROUTER_API_KEY='test-key-never-sent-to-client';let calls=0,status=200;
globalThis.fetch=(async()=>{calls++;return Response.json(status===200?{choices:[{message:{content:'Saved deliverable'}}]}:{error:'provider'}, {status});}) as typeof fetch;
const run={projectId:project.record.id,prompt:'Prepare a plan',operationId:randomUUID()};
await assert.rejects(()=>studioAI(db,'mystic-run',other,run),/Project unavailable/);assert.equal(calls,0);
const generated=await studioAI(db,'mystic-run',staff,run);assert.equal(generated.result,'Saved deliverable');await studioAI(db,'mystic-run',staff,run);assert.equal(calls,1);
status=402;await assert.rejects(()=>studioAI(db,'mystic-run',staff,{...run,operationId:randomUUID()}),/funded credits/);assert.equal(collections.get('organization_ai_runs')!.at(-1).status,'failed');
status=200;await assert.rejects(()=>studioAI(db,'visual-assist',staff,{prompt:'Layout',operationId:randomUUID()}),/invalid design plan/);
console.log('Organization record checks passed: ownership, scope isolation, field validation, idempotent creates/generation, optimistic conflicts, atomic record audit, durable AI results and explicit provider failure.');
