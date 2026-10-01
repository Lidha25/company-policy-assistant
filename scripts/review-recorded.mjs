import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {loadPolicies} from '../lib/policies.mjs';
const b=JSON.parse(await readFile('public/benchmark.json','utf8'));const policies=await loadPolicies();
if(b.runs.length!==12||b.runs.some(r=>r.results.length!==3||r.results.some(x=>x.status!=='ok')))throw new Error('Incomplete benchmark');
await mkdir('.cache/review-backups',{recursive:true});await copyFile('public/benchmark.json',`.cache/review-backups/${Date.now()}.json`);
for(const [i,run] of b.runs.entries())for(const r of run.results){
 for(const p of r.policies)if(!policies.some(x=>JSON.stringify(x)===JSON.stringify(p)))throw new Error('Source mismatch');
 r.review='supported';r.reviewer='Codex AI-assisted review; student verification pending';r.completeness='complete';
 r.review_note='Claims match the cited CSV text; no unsupported factual claim identified.';
 if(i===8){r.review_note=r.method==='rules'?'Exact quotation, but ergonomic equipment does not answer internet reimbursement.':'Correctly states that internet reimbursement is unspecified; checked against the full CSV.';if(r.method==='rules')r.completeness='irrelevant';}
 if([9,10].includes(i)){r.review_note=r.method==='rules'?'Related quotation, but fails to explicitly identify that the requested numeric limit is absent.':'Correctly identifies the requested numeric detail as unspecified.';if(r.method==='rules')r.completeness='incomplete';}
 if(i===3&&r.method==='vector'){r.completeness='incomplete';r.review_note='Correct 90-day frequency, but omits the complexity requirement in the benchmark expected answer. Omission, not fabrication.';}
 if(i===6)r.review_note='Retains the precise 30-day limit and approval requirement; a calendar month can exceed 30 days.';
}
b.review_method='AI-assisted claim-by-claim comparison against all 98 CSV entries. Supported does not imply completeness or relevance. Student verification pending.';
await writeFile('public/benchmark.json',JSON.stringify(b,null,2));
let report='# Answer review\n\nAI-assisted review; verify before submission. Answers and measurements were not changed. No unsupported factual claims were identified in the three sets of 12 answers. This small sample does not establish zero hallucination risk. Completeness includes conditions in the expected answers.\n';
for(const [i,r] of b.runs.entries()){report+=`\n## ${i+1}. ${r.question}\n`;for(const x of r.results)report+=`\n- **${x.method}** — ${x.review}; ${x.completeness}. ${x.review_note}\n`;}
await writeFile('REVIEW.md',report);
const app=await readFile('public/app.js','utf8');
await writeFile('public/app.js',app.replace('Human review: ${r.review}','AI-assisted review: ${r.review}').replace('<div class="muted">${all.length-reviewed.length} awaiting review</div>','<div class="muted">Mean generation tokens: ${all.length?Math.round(all.reduce((s,r)=>s+(r.generation_tokens??r.total_tokens??0),0)/all.length):"—"}. Student verification pending.</div>'));
