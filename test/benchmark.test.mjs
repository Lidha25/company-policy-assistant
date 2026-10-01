import test from 'node:test';
import assert from 'node:assert/strict';
import {runBenchmark} from '../lib/benchmark-runner.mjs';
const make=()=>({runs:[{question:'Test',results:[{method:'rules',status:'ok',answer:'Saved rule'}]}]});
test('Resume preserves successes and stops on quota or service errors',async()=>{
 for(const status of [429,503]){
 const data=make();data.runs[0].results.push({method:'vector',status:'ok',answer:'Saved AI'});let calls=0,saves=0;
 await runBenchmark({data,policies:[],answer:async()=>{calls++;throw Object.assign(new Error('Failure'),{status});},save:async()=>saves++,wait:async()=>{},log:()=>{}});
 assert.equal(calls,1);assert.equal(saves,1);assert.equal(data.runs[0].results.find(r=>r.method==='vector').answer,'Saved AI');assert.equal(data.runs[0].results.find(r=>r.method==='full').http_status,status);
 }});
test('Successful calls are paced and old failures retained',async()=>{
 const data=make();data.runs[0].results.push({method:'full',status:'error',answer:'Old failure'});const waits=[];
 const r=await runBenchmark({data,policies:[],answer:async method=>({method,status:'ok'}),save:async()=>{},wait:async ms=>waits.push(ms),log:()=>{}});
 assert.deepEqual(waits,[30000]);assert.equal(data.runs[0].history[0].answer,'Old failure');assert.deepEqual(r.counts,{rules:1,full:1,vector:1});
});
