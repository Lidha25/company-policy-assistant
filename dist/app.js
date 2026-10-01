import {rulesAnswer} from './rules.js';
const $=id=>document.getElementById(id), names={rules:'Rules-based search',full:'LLM · full policy database',vector:'LLM · vector index'};
const descriptions={rules:'Keyword matching. Returns the best matching policy text.',full:'The model receives all 98 policy entries for every question.',vector:'Semantic search retrieves five entries before the model answers.'};
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let source,benchmark,live=false,ai=false,busy=false;
function reviewStats(method){
  const all=(benchmark?.runs||[]).flatMap(run=>run.results).filter(r=>r.method===method&&r.status==='ok');
  const reviewed=all.filter(r=>r.review==='supported'||r.review==='unsupported');
  const unsupported=reviewed.filter(r=>r.review==='unsupported').length;
  return reviewed.length?`${unsupported}/${reviewed.length} (${Math.round(unsupported/reviewed.length*100)}%)`:'Not reviewed';
}
function render(results){$('results').innerHTML=['rules','full','vector'].map((method,i)=>{
  const r=results.find(x=>x.method===method)||{status:'pending',answer:'Ask a question to see this approach’s answer.',policies:[]};
  const ms=r.response_ms==null?'—':r.response_ms<1?'<1 ms':`${Math.round(r.response_ms).toLocaleString()} ms`;
  return `<article class="card"><div class="card-top"><small>APPROACH 0${i+1}</small><h3>${names[method]}</h3><p>${descriptions[method]}</p></div><div class="card-body"><p class="answer">${escape(r.answer)}</p>${(r.policies||[]).map(p=>`<div class="citation"><strong>${escape(p.title)}</strong>${escape(p.department)} · ${escape(p.id)} · CSV row ${p.csv_row}<blockquote>${escape(p.policy_text)}</blockquote></div>`).join('')}${r.status==='ok'?`<details class="token-details"><summary>Measurement details</summary><p>Unsupported claims in recorded test: ${escape(reviewStats(method))}.</p><p>Input: ${r.input_tokens}; output: ${r.output_tokens}; query embedding: ${r.embedding_tokens??"not reported"}. Thinking: ${r.thinking_tokens??0}; generation total: ${r.generation_tokens??r.total_tokens??"not reported"}. Model: ${escape(r.model)}.</p>${r.index?`<p>Separate index build: ${r.index.build_tokens??"not reported"} tokens, ${Math.round(r.index.build_ms)} ms. Excluded from per-question figures.</p>`:''}</details>`:''}</div><dl class="metrics"><div><dt>RESPONSE TIME</dt><dd>${escape(ms)}</dd></div><div><dt>TOKENS USED</dt><dd>${r.total_tokens==null?'—':Number(r.total_tokens).toLocaleString()}</dd></div></dl><div class="support">${escape(r.review?`AI-assisted review: ${r.review}`:r.support||'Not measured')}</div></article>`;
}).join('');}
function library(query=''){const matches=source.policies.filter(p=>JSON.stringify(p).toLowerCase().includes(query.toLowerCase()));$('policy-list').innerHTML=matches.map(p=>`<article class="policy"><h3>${escape(p.title)}</h3><div class="muted">${escape(p.id)} · ${escape(p.department)} · ${escape(p.category)}</div><p>${escape(p.policy_text)}</p></article>`).join('')||'<p>No policies match your search.</p>';}
function summary(){
  const rows=['rules','full','vector'].map(method=>{
    const all=(benchmark.runs||[]).flatMap(r=>r.results).filter(r=>r.method===method&&r.status==='ok');
    const average=key=>all.length&&all.every(r=>Number.isFinite(r[key]))?Math.round(all.reduce((s,r)=>s+r[key],0)/all.length).toLocaleString():'—';
    const generation=all.length&&all.every(r=>Number.isFinite(r.generation_tokens??r.total_tokens))?Math.round(all.reduce((s,r)=>s+(r.generation_tokens??r.total_tokens),0)/all.length).toLocaleString():'—';
    return `<tr><th scope="row">${names[method]}</th><td>${all.length}/${benchmark.runs.length}</td><td>${average('response_ms')} ms</td><td>${average('total_tokens')}</td><td>${generation}</td><td>${escape(reviewStats(method))}</td></tr>`;
  }).join('');
  $('benchmark-summary').innerHTML=`<div class="table-wrap"><table class="results-table"><thead><tr><th scope="col">Approach</th><th scope="col">Successful answers</th><th scope="col">Mean response time</th><th scope="col">Mean total tokens</th><th scope="col">Mean generation tokens</th><th scope="col">Unsupported claims</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
async function compare(question){
  if(busy)return;busy=true;$('ask').disabled=true;const results=[];render(results);
  try{for(const method of ['rules','full','vector']){
    $('status').textContent=`Running ${names[method]}…`;
    if(method==='rules'&&!live)results.push(rulesAnswer(question,source.policies));
    else if(!live||(!ai&&method!=='rules'))results.push({method,status:'unavailable',answer:'Live AI answers require the local server with a Gemini API key. Use the saved comparison picker to view recorded answers.',policies:[],support:'Not run; no metrics estimated'});
    else{try{const response=await fetch('api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,question})});const body=await response.json();if(!response.ok)throw new Error(body.error);results.push(body);}catch(e){results.push({method,status:'error',answer:e.message,policies:[],support:'Request failed; excluded from measurements'});}}
    render(results);
  }$('status').textContent=live&&ai?'Comparison complete. Check each answer against its policy evidence.':'Keyword search is live. AI measurements are pending an API connection.';
  }finally{busy=false;$('ask').disabled=false;}
}
try{
  source=await(await fetch('data.json')).json(); benchmark=await(await fetch('benchmark.json')).json();
  try{const response=await fetch('api/status');if(response.ok){const status=await response.json();live=status.live;ai=status.ai_ready;if(status.student)$('student').textContent=status.student;}}catch{}
  if(source.student)$('student').textContent=source.student;
  $('policy-count').textContent=source.policies.length;library();summary();
  $('comparison-text').innerHTML=source.comparison.map(p=>`<p>${escape(p)}</p>`).join('');
  $('methodology').textContent=`${benchmark.runs.length} identical questions · Gemini ${escape(benchmark.runs.flatMap(r=>r.results).find(r=>r.method==='full'&&r.status==='ok')?.model||'')}`;
  $('review-note').textContent=`Unsupported means a factual claim absent from or contradicted by the CSV. Relevant but incomplete answers are tracked separately. This is an AI-assisted review of a small sample; student verification is pending.`;
  $('test-case').innerHTML='<option value="">Choose a recorded question</option>'+(benchmark.runs||[]).map((r,i)=>`<option value="${i}">${escape(r.question)}</option>`).join('');
  $('test-case').addEventListener('change',e=>{if(e.target.value==='')return;const run=benchmark.runs[Number(e.target.value)];$('question').value=run.question;render(run.results);$('status').textContent=`Recorded run: ${benchmark.created_at}. ${run.expected}`;});
  $('question-form').addEventListener('submit',e=>{e.preventDefault();compare($('question').value.trim());});
  document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{$('question').value=button.dataset.question;compare(button.dataset.question);}));
  $('policy-search').addEventListener('input',e=>library(e.target.value));
  await compare($('question').value);
}catch(e){$('status').textContent='Unable to load policies: '+e.message;}
