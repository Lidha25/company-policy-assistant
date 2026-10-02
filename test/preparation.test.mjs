import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {answer} from '../lib/engine.mjs';
import {loadPolicies} from '../lib/policies.mjs';
const root=new URL('../',import.meta.url);
test('Deployment is manual and never triggered by uploading source',async()=>{
 const workflow=await readFile(new URL('.github/workflows/pages.yml',root),'utf8');
 assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/^\s+(push|pull_request|schedule):/m);
});
test('Written comparison has exactly two paragraphs',async()=>{
 const text=await readFile(new URL('COMPARISON.md',root),'utf8');assert.equal(text.trim().split(/\r?\n\s*\r?\n/).length,2);
});
test('Prepared site retains all policy records and required assets',async()=>{
 const data=JSON.parse(await readFile(new URL('public/data.json',root),'utf8'));
 assert.deepEqual(data.policies,await loadPolicies());
 for(const file of ['index.html','app.js','rules.js','style.css','favicon.svg','data.json','benchmark.json'])assert.ok((await readFile(new URL('public/'+file,root))).length);
 const benchmark=JSON.parse(await readFile(new URL('public/benchmark.json',root),'utf8'));
 assert.equal(benchmark.runs.length,12);
 for(const run of benchmark.runs)for(const result of run.results)if(result.status!=='ok'){assert.equal(result.total_tokens,null);assert.equal(result.response_ms,null);}
});
test('Unsupported-answer rates use only reviewed saved answers, and vector totals stay unavailable without embedding usage',async()=>{
 const benchmark=JSON.parse(await readFile(new URL('public/benchmark.json',root),'utf8'));
 assert.match(benchmark.review_method,/AI-assisted/);
 for(const method of ['rules','full','vector']){
  const results=benchmark.runs.flatMap(run=>run.results).filter(result=>result.method===method);
  assert.equal(results.length,12);
  assert.ok(results.every(result=>result.status==='ok'&&['supported','unsupported'].includes(result.review)));
 }
 const vector=benchmark.runs.flatMap(run=>run.results).filter(result=>result.method==='vector');
 assert.ok(vector.every(result=>result.generation_tokens!=null&&result.embedding_tokens==null&&result.total_tokens==null));
});
test('Full-context integration uses all policies, real usage fields, and flags fabricated IDs (mocked API; no network)',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY;const policies=await loadPolicies();
 process.env.GEMINI_API_KEY='offline-test-placeholder';
 globalThis.fetch=async(url,options)=>{
   assert.match(url,/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/[^/]+:generateContent$/);const body=JSON.parse(options.body);
   assert.equal(options.headers['x-goog-api-key'],'offline-test-placeholder');assert.deepEqual(JSON.parse(body.contents[0].parts[0].text).policies,policies);
   return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({answer:'Example test response',policy_ids:['NONEXISTENT'],abstained:false})}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:15,thoughtsTokenCount:5,totalTokenCount:120}})};
 };
 try{const result=await answer('full','Test question',policies);assert.equal(result.total_tokens,120);assert.equal(result.thinking_tokens,5);assert.equal(result.invalid_citation,true);assert.equal(result.policies.length,0);}
 finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
