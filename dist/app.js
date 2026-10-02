import {rulesAnswer} from './rules.js';
const $=id=>document.getElementById(id), names={rules:'Rules-based search',full:'LLM · full policy database',vector:'LLM · vector index'};
const descriptions={rules:'Keyword matching. Returns the best matching policy text.',full:'The model receives all 98 policy entries for every question.',vector:'Semantic search retrieves five entries before the model answers.'};
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let source,live=false,ai=false,busy=false;
function render(results){$('results').innerHTML=['rules','full','vector'].map((method,i)=>{
  const r=results.find(x=>x.method===method)||{status:'pending',answer:'Ask a question to see this approach’s answer.',policies:[]};
  const ms=r.response_ms==null?'—':r.response_ms<1?'<1 ms':`${Math.round(r.response_ms).toLocaleString()} ms`;
  const supportCheck=r.invalid_citation?'Invalid policy citation; answer needs review.':r.status==='ok'?'Not independently verified. Compare each claim with the cited policy text.':r.support||'Not measured';
  return `<article class="card"><div class="card-top"><small>APPROACH 0${i+1}</small><h3>${names[method]}</h3><p>${descriptions[method]}</p></div><div class="card-body"><p class="answer">${escape(r.answer)}</p>${(r.policies||[]).map(p=>`<div class="citation"><strong>${escape(p.title)}</strong>${escape(p.department)} · ${escape(p.id)} · CSV row ${p.csv_row}<blockquote>${escape(p.policy_text)}</blockquote></div>`).join('')}${r.status==='ok'?`<details class="token-details"><summary>Measurement details</summary><p>Policy support: ${escape(supportCheck)}</p><p>Input: ${r.input_tokens??"not reported"}; output: ${r.output_tokens??"not reported"}; query embedding: ${r.embedding_tokens??"not reported"}. Thinking: ${r.thinking_tokens??0}; generation total: ${r.generation_tokens??r.total_tokens??"not reported"}. Model: ${escape(r.model??"not reported")}.</p>${r.index?`<p>Separate index build: ${r.index.build_tokens??"not reported"} tokens, ${Math.round(r.index.build_ms)} ms. Excluded from per-question figures.</p>`:''}</details>`:''}</div><dl class="metrics"><div><dt>RESPONSE TIME</dt><dd>${escape(ms)}</dd></div><div><dt>TOKENS USED</dt><dd>${r.total_tokens==null?'—':Number(r.total_tokens).toLocaleString()}</dd></div></dl><div class="support">${escape(r.review?`AI-assisted review: ${r.review}`:r.support||'Not measured')}</div></article>`;
}).join('');}
function library(query=''){const matches=source.policies.filter(p=>JSON.stringify(p).toLowerCase().includes(query.toLowerCase()));$('policy-list').innerHTML=matches.map(p=>`<article class="policy"><h3>${escape(p.title)}</h3><div class="muted">${escape(p.id)} · ${escape(p.department)} · ${escape(p.category)}</div><p>${escape(p.policy_text)}</p></article>`).join('')||'<p>No policies match your search.</p>';}
async function compare(question){
  if(busy)return;busy=true;$('ask').disabled=true;const results=[];render(results);
  try{for(const method of ['rules','full','vector']){
    $('status').textContent=`Running ${names[method]}…`;
    if(method==='rules'&&!live)results.push(rulesAnswer(question,source.policies));
    else if(!live||(!ai&&method!=='rules'))results.push({method,status:'unavailable',answer:'Live AI answers are unavailable here. Open the hosted server version to compare all three approaches.',policies:[],support:'Not run; no metrics estimated'});
    else{try{const response=await fetch('api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,question})});const body=await response.json();if(!response.ok)throw new Error(body.error);results.push(body);}catch(e){results.push({method,status:'error',answer:e.message,policies:[],support:'Request failed; excluded from measurements'});}}
    render(results);
  }$('status').textContent=live&&ai?'Comparison complete. Check each answer against its policy evidence.':'Keyword search is live. AI measurements are pending an API connection.';
  }finally{busy=false;$('ask').disabled=false;}
}
try{
  source=await(await fetch('data.json')).json();
  try{const response=await fetch('api/status');if(response.ok){const status=await response.json();live=status.live;ai=status.ai_ready;if(status.student)$('student').textContent=status.student;}}catch{}
  if(source.student)$('student').textContent=source.student;
  $('policy-count').textContent=source.policies.length;library();
  $('comparison-text').innerHTML=source.comparison.map(p=>`<p>${escape(p)}</p>`).join('');
  $('question-form').addEventListener('submit',e=>{e.preventDefault();compare($('question').value.trim());});
  document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{$('question').value=button.dataset.question;compare(button.dataset.question);}));
  $('policy-search').addEventListener('input',e=>library(e.target.value));
  render([]);
  $('status').textContent=live&&ai?'Enter a policy question to compare the three approaches.':'Live AI answers are available on the hosted server version.';
}catch(e){$('status').textContent='Unable to load policies: '+e.message;}
