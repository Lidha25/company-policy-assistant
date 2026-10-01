// Run manually: two small API calls at most. Does not modify benchmark results.
const key=process.env.GEMINI_API_KEY;
const generation=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const embedding=process.env.GEMINI_EMBEDDING_MODEL||'gemini-embedding-001';
const safe=value=>String(value).split(key||'__no_key__').join('[REDACTED]').replace(/AIza[\w-]+/g,'[REDACTED]');
async function check(model,method,body){
 console.log(`Testing ${safe(JSON.stringify(model))} / ${method}`);
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}`,{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)
 });
 const data=await response.json();
 console.log(`HTTP ${response.status}`);
 if(!response.ok){console.log(safe(data.error?.message||'No error message returned.'));process.exitCode=1;return false;}
 if(method==='generateContent'){
  console.log(`Finish reason: ${safe(data.candidates?.[0]?.finishReason||'none')}`);
  console.log(`Usage: ${JSON.stringify(data.usageMetadata||{})}`);
  if(data.candidates?.[0]?.finishReason!=='STOP'){process.exitCode=1;return false;}
 }else{
  console.log(`Embedding dimensions: ${data.embedding?.values?.length||0}`);
  if(!data.embedding?.values?.length){process.exitCode=1;return false;}
 }
 return true;
}
if(!key?.trim()){console.error('GEMINI_API_KEY is missing.');process.exitCode=1;}
else try{
 const ok=await check(generation,'generateContent',{
  contents:[{role:'user',parts:[{text:'Reply with OK.'}]}],
  generationConfig:{maxOutputTokens:1024}
 });
 if(ok)await check(embedding,'embedContent',{content:{parts:[{text:'Company policy diagnostic.'}]},taskType:'RETRIEVAL_QUERY'});
 else console.log('Stopped after the first failure. No embedding call made.');
}catch{console.error('Diagnostic could not finish: network, timeout, or invalid response. No credentials printed.');process.exitCode=1;}
