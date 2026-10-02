import {rulesAnswer} from './rules.js';
const $=id=>document.getElementById(id), names={rules:'Rules-based search',full:'LLM without a vector index',vector:'LLM with a vector index'};
const descriptions={rules:'Matches the question with keywords and returns policy text directly.',full:'Gemini receives all 98 policy entries for every question; no vector retrieval is used.',vector:'Gemini Embedding finds the five closest policy entries before Gemini writes an answer.'};
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let source,benchmark,live=false,ai=false,busy=false;
function reviewSummary(method){
  const saved=(benchmark?.runs||[]).flatMap(run=>run.results||[]).filter(r=>r.method===method&&r.status==='ok'&&['supported','unsupported'].includes(r.review));
  if(!saved.length)return 'Quantitative unsupported-claim review is unavailable for the saved test sample.';
  const unsupported=saved.filter(r=>r.review==='unsupported').length;
  const percent=Math.round(unsupported/saved.length*100);
  return `Saved ${benchmark.runs.length}-question sample: ${unsupported}/${saved.length} answers (${percent}%) flagged for unsupported factual claims`;
}
function render(results){$('results').innerHTML=['rules','full','vector'].map((method,i)=>{
  const r=results.find(x=>x.method===method)||{status:'pending',answer:'Ask a question to see this approach’s answer.',policies:[]};
  const ms=r.response_ms==null?'—':r.response_ms<1?'<1 ms':`${Math.round(r.response_ms).toLocaleString()} ms`;
  const citations=(r.policies||[]).map(p=>`<div class="citation"><strong>Relevant policy: ${escape(p.title)}</strong>${escape(p.department)} · ${escape(p.id)} · CSV row ${p.csv_row}<blockquote>${escape(p.policy_text)}</blockquote></div>`).join('')||'<p class="muted">No relevant policy returned yet.</p>';
  const partialVector=method==='vector'&&r.total_tokens==null&&r.generation_tokens!=null;
  const tokenMetric=r.total_tokens!=null?Number(r.total_tokens).toLocaleString():partialVector?Number(r.generation_tokens).toLocaleString():'—';
  const tokenLabel=partialVector?'GENERATION TOKENS':'TOKENS USED';
  return `<article class="card"><div class="card-top"><small>APPROACH 0${i+1}</small><h3>${names[method]}</h3><p>${descriptions[method]}</p></div><div class="card-body"><p class="answer">${escape(r.answer)}</p>${citations}<details class="token-details"><summary>Measurement details</summary><p><strong>Unsupported-claim tendency from reviewed test answers:</strong> ${escape(reviewSummary(method))}.</p></details></div><dl class="metrics"><div><dt>RESPONSE TIME</dt><dd>${escape(ms)}</dd></div><div><dt>${tokenLabel}</dt><dd>${escape(tokenMetric)}</dd></div></dl></article>`;
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
  try{benchmark=await(await fetch('benchmark.json')).json();}catch{benchmark=null;}
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
