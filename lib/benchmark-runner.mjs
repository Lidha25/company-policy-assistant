export async function runBenchmark({data,policies,answer,save,wait,log,delayMs=30000,maxAiCalls=2}) {
 let calls=0,stopReason=null;
 outer:for(const [i,run] of data.runs.entries()){
  const methods=['rules','full','vector'];
  for(let j=0;j<3;j++){
   const method=methods[(i+j)%3];
   if(run.results.some(r=>r.method===method&&r.status==='ok'))continue;
   if(method!=='rules'){
    if(calls>=maxAiCalls){stopReason='Batch limit reached. Run again later to continue.';break outer;}
    if(calls){log(`Waiting ${delayMs/1000} seconds…`);await wait(delayMs);}calls++;
   }
   let result;
   try{result=await answer(method,run.question,policies);}catch(e){result={method,status:'error',answer:e.message,http_status:e.status??null,policies:[],response_ms:null,total_tokens:null,support:'Failed request'};}
   result.measured_at=new Date().toISOString();
   const previous=run.results.find(r=>r.method===method);
   if(previous){run.history??=[];run.history.push(previous);}
   run.results=run.results.filter(r=>r.method!==method);run.results.push(result);
   data.updated_at=new Date().toISOString();await save(data);
   log(`Question ${i+1}/${data.runs.length} · ${method}: ${result.status.toUpperCase()}`);
   if(result.status!=='ok'){stopReason=result.answer;break outer;}
  }
 }
 const counts=Object.fromEntries(['rules','full','vector'].map(m=>[m,data.runs.filter(r=>r.results.some(x=>x.method===m&&x.status==='ok')).length]));
 log(`Successful answers: rules ${counts.rules}/${data.runs.length}, full ${counts.full}/${data.runs.length}, vector ${counts.vector}/${data.runs.length}.`);
 if(stopReason)log(`Stopped: ${stopReason} Existing successes are saved.`);
 return {counts,stopReason};
}
