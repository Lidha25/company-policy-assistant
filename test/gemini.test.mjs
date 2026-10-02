import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {answer} from '../lib/engine.mjs';
test('Gemini vector flow retrieves top five, reports unavailable usage, and keeps keys out of URLs (offline)',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldCache=process.env.POLICY_CACHE_DIR,oldIndex=process.env.VECTOR_INDEX_FILE;
 const cache=await mkdtemp(join(tmpdir(),'policy-gemini-test-'));
 process.env.POLICY_CACHE_DIR=cache;process.env.VECTOR_INDEX_FILE=join(cache,'no-index.json');process.env.GEMINI_API_KEY='test-only';
 const policies=Array.from({length:6},(_,i)=>({id:`TEST${i}`,title:`Policy ${i}`,policy_text:'Offline fixture'}));
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push(url);assert.ok(!url.includes('test-only'));const b=JSON.parse(options.body);
  if(url.endsWith(':batchEmbedContents')){assert.equal(b.requests[0].taskType,'RETRIEVAL_DOCUMENT');return {ok:true,json:async()=>({embeddings:policies.map((_,i)=>({values:i===0?[0,1]:[1,0]}))})};}
  if(url.endsWith(':embedContent')){assert.equal(b.taskType,'RETRIEVAL_QUERY');return {ok:true,json:async()=>({embedding:{values:[1,0]}})};}
  const selected=JSON.parse(b.contents[0].parts[0].text).policies;assert.equal(selected.length,5);assert.ok(selected.every(p=>p.id!=='TEST0'));
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'Offline test',policy_ids:['TEST1'],abstained:false})}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}})};
 };
 try{const r=await answer('vector','Offline question',policies);assert.equal(r.total_tokens,null);assert.equal(r.generation_tokens,15);assert.equal(r.embedding_tokens,null);assert.equal(r.index.build_tokens,null);assert.equal(r.policies[0].id,'TEST1');assert.equal(calls.length,3);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldCache===undefined)delete process.env.POLICY_CACHE_DIR;else process.env.POLICY_CACHE_DIR=oldCache;if(oldIndex===undefined)delete process.env.VECTOR_INDEX_FILE;else process.env.VECTOR_INDEX_FILE=oldIndex;await rm(cache,{recursive:true,force:true});}
});
test('Blocked Gemini responses and quota failures are errors, not fabricated answers (offline)',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only';
 try{globalThis.fetch=async()=>({ok:true,json:async()=>({candidates:[{finishReason:'SAFETY'}]})});await assert.rejects(answer('full','test',[]),/complete answer/);
 globalThis.fetch=async()=>({ok:false,status:429});await assert.rejects(answer('full','test',[]),/quota/i);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
test('Retries one temporary Gemini 503 and returns the successful answer (offline)',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only';let attempts=0;
 try{
  globalThis.fetch=async()=>{attempts++;if(attempts===1)return {ok:false,status:503};return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'Recovered answer',policy_ids:[],abstained:true})}]}}],usageMetadata:{promptTokenCount:1,candidatesTokenCount:1,totalTokenCount:2}})};};
  const result=await answer('full','Temporary outage test',[]);assert.equal(result.status,'ok');assert.equal(result.answer,'Recovered answer');assert.equal(attempts,2);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
test('Uses a matching packaged Gemini vector index without rebuilding policy embeddings (offline)',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY,oldIndex=process.env.VECTOR_INDEX_FILE,oldCache=process.env.POLICY_CACHE_DIR;
 const cache=await mkdtemp(join(tmpdir(),'policy-packaged-index-test-'));
 process.env.GEMINI_API_KEY='test-only';process.env.VECTOR_INDEX_FILE=join(cache,'vector-index.json');process.env.POLICY_CACHE_DIR=join(cache,'api-cache');
 const policies=Array.from({length:6},(_,i)=>({id:`PACK${i}`,title:`Policy ${i}`,policy_text:'Packaged fixture'}));
 const signature=createHash('sha256').update('gemini-retrieval-v1'+JSON.stringify(policies)+'gemini-embedding-001').digest('hex');
 await writeFile(process.env.VECTOR_INDEX_FILE,JSON.stringify({signature,model:'gemini-embedding-001',vectors:policies.map(()=>[1,0]),build_ms:12,build_tokens:null}));
 let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.ok(!url.endsWith(':batchEmbedContents'));if(url.endsWith(':embedContent'))return {ok:true,json:async()=>({embedding:{values:[1,0]}})};assert.ok(url.endsWith(':generateContent'));return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'Packaged index answer',policy_ids:['PACK0'],abstained:false})}]}}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:2,totalTokenCount:4}})};};
 try{const result=await answer('vector','Question for packaged index',policies);assert.equal(result.status,'ok');assert.equal(result.index.loaded_from_cache,true);assert.equal(calls,2);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;if(oldIndex===undefined)delete process.env.VECTOR_INDEX_FILE;else process.env.VECTOR_INDEX_FILE=oldIndex;if(oldCache===undefined)delete process.env.POLICY_CACHE_DIR;else process.env.POLICY_CACHE_DIR=oldCache;await rm(cache,{recursive:true,force:true});}
});
