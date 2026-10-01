import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { loadPolicies } from './lib/policies.mjs';
import { answer } from './lib/engine.mjs';
const policies=await loadPolicies(); let busy=false;
const aiRequests=new Map();
const rateWindowMs=60_000, maxAiRequestsPerWindow=12;
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'};
const files={'/':'index.html','/app.js':'app.js','/rules.js':'rules.js','/style.css':'style.css','/favicon.svg':'favicon.svg','/data.json':'data.json','/benchmark.json':'benchmark.json'};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
function allowAiRequest(req){
  const forwarded=req.headers['x-forwarded-for'];
  const ip=(typeof forwarded==='string'?forwarded.split(',').at(-1)?.trim():'')||req.socket.remoteAddress||'unknown';
  const now=Date.now();
  for(const [key,entry] of aiRequests)if(now-entry.started>=rateWindowMs)aiRequests.delete(key);
  const entry=aiRequests.get(ip);
  if(entry&&entry.count>=maxAiRequestsPerWindow)return false;
  if(entry)entry.count++;
  else aiRequests.set(ip,{started:now,count:1});
  return true;
}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET' && url.pathname==='/api/status') return send(res,200,{live:true,ai_ready:!!process.env.GEMINI_API_KEY,student:process.env.STUDENT_NAME||'',count:policies.length});
    if(req.method==='POST' && url.pathname==='/api/answer') {
      // The hosted app serves its page and API from one origin; reject browser cross-origin calls.
      if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Origin not allowed'});}catch{return send(res,403,{error:'Origin not allowed'});}}
      if(busy) return send(res,429,{error:'Another answer is running. Please wait.'});
      let data=''; for await(const chunk of req){ data+=chunk; if(data.length>8000) return send(res,413,{error:'Question too long'}); }
      let body; try{body=JSON.parse(data);}catch{return send(res,400,{error:'Invalid request'});}
      if(!body||typeof body.question!=='string'||!body.question.trim()||body.question.length>1500||!['rules','full','vector'].includes(body.method)) return send(res,400,{error:'Enter a question under 1,500 characters and a valid approach.'});
      if(body.method!=='rules'&&!allowAiRequest(req))return send(res,429,{error:'AI request limit reached for this minute. Please wait before asking again.'});
      busy=true; try {return send(res,200,await answer(body.method,body.question.trim(),policies));} finally{busy=false;}
    }
    if(req.method!=='GET'||!files[url.pathname]) return send(res,404,{error:'Not found'});
    const name=files[url.pathname], ext=name.slice(name.lastIndexOf('.'));
    const content=await readFile(new URL(`./public/${name}`,import.meta.url));
    res.writeHead(200,{'Content-Type':types[ext]+'; charset=utf-8'});res.end(content);
  }catch(e){if(!res.headersSent)send(res,500,{error:e.message});else res.end();}
});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log(`Policy Assistant listening on port ${process.env.PORT||3000}`));
