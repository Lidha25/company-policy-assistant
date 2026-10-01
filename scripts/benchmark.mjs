import {readFile,writeFile,copyFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {setTimeout as wait} from 'node:timers/promises';
import {loadPolicies} from '../lib/policies.mjs';
import {answer,model} from '../lib/engine.mjs';
import {runBenchmark} from '../lib/benchmark-runner.mjs';
import cases from './cases.mjs';
const root=new URL('../',import.meta.url),file=new URL('public/benchmark.json',root);
const policies=await loadPolicies();
const fingerprint=createHash('sha256').update(JSON.stringify({policies,cases,model:model(),embedding:process.env.GEMINI_EMBEDDING_MODEL||'gemini-embedding-001'})).digest('hex');
let data;
try{data=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(data){
 await mkdir(new URL('.cache/benchmark-backups/',root),{recursive:true});
 await copyFile(file,new URL(`.cache/benchmark-backups/${Date.now()}.json`,root));
 if(data.fingerprint&&data.fingerprint!==fingerprint)throw new Error('Model, policies or test cases changed. Existing results backed up; do not mix different configurations.');
 if(!data.fingerprint){
  const compatible=data.runs.length===cases.length&&data.runs.every((r,i)=>r.question===cases[i].question&&r.results.every(x=>x.status!=='ok'||(x.policies||[]).every(p=>policies.some(q=>JSON.stringify(p)===JSON.stringify(q)))&&(x.method==='rules'||x.model===model())&&(x.method!=='vector'||x.index?.model===(process.env.GEMINI_EMBEDDING_MODEL||'gemini-embedding-001'))));
  if(!compatible)throw new Error('Existing results do not match this configuration; preserved without overwriting.');
 }
}else data={created_at:new Date().toISOString(),csv_rows:policies.length,runs:cases.map(c=>({...c,results:[]}))};
data.fingerprint=fingerprint;
data.methodology='12 shared questions. Successful answers are preserved across resumptions; failed attempts remain in history. Sequential calls with a 30-second default delay between AI answers; two AI answers per invocation by default. Inter-answer delays and one-time index construction are excluded from response times. Gemini usage is reported when available; missing counts are not zero. Runs may span different service conditions. Review support, relevance and completeness separately.';
const delayMs=Number(process.env.BENCHMARK_DELAY_MS||30000),maxAiCalls=Number(process.env.BENCHMARK_MAX_AI_CALLS||2);
if(!Number.isFinite(delayMs)||delayMs<0||!Number.isInteger(maxAiCalls)||maxAiCalls<1)throw new Error('Invalid delay or batch size.');
if(!process.env.GEMINI_API_KEY)throw new Error('GEMINI_API_KEY missing. Existing results are preserved.');
const save=async value=>{const temp=new URL('public/benchmark.json.tmp',root);await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,file);};
const result=await runBenchmark({data,policies,answer,save,wait,log:console.log,delayMs,maxAiCalls});
if(Object.values(result.counts).some(n=>n<cases.length))console.log('Comparison is incomplete. Do not submit yet.');
