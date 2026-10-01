import {mkdir,readFile,writeFile,copyFile,cp} from 'node:fs/promises';
import {loadPolicies} from '../lib/policies.mjs';
const root=new URL('../',import.meta.url);
const student=JSON.parse(await readFile(new URL('student.json',root),'utf8'));
const comparison=(await readFile(new URL('COMPARISON.md',root),'utf8')).trim().split(/\r?\n\s*\r?\n/);
if(comparison.length!==2)throw new Error('COMPARISON.md must have exactly two paragraphs');
await mkdir(new URL('public/',root),{recursive:true});
await writeFile(new URL('public/data.json',root),JSON.stringify({student:process.env.STUDENT_NAME||student.name||'',policies:await loadPolicies(),comparison},null,2));
await copyFile(new URL('lib/rules.mjs',root),new URL('public/rules.js',root));
try{await readFile(new URL('public/benchmark.json',root));}catch{await writeFile(new URL('public/benchmark.json',root),JSON.stringify({created_at:null,runs:[],methodology:'No benchmark has been run yet.'}));}
await mkdir(new URL('dist/',root),{recursive:true});
for(const name of ['index.html','app.js','rules.js','style.css','favicon.svg','data.json','benchmark.json'])await copyFile(new URL('public/'+name,root),new URL('dist/'+name,root));
console.log('Built dist: static comparison website, without API keys or server files.');
