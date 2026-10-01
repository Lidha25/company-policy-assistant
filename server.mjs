import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { loadPolicies } from './lib/policies.mjs';
import { answer } from './lib/engine.mjs';
const policies=await loadPolicies(); let busy=false;
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml'};
const files={'/':'index.html','/app.js':'app.js','/rules.js':'rules.js','/style.css':'style.css','/favicon.svg':'favicon.svg','/data.json':'data.json','/benchmark.json':'benchmark.json'};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET' && url.pathname==='/api/status') return send(res,200,{live:true,ai_ready:!!process.env.GEMINI_API_KEY,student:process.env.STUDENT_NAME||'',count:policies.length});
    if(req.method==='POST' && url.pathname==='/api/answer') {
      // Local-only service; disallow browser cross-origin calls to the paid API.
      if(req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res,403,{error:'Origin not allowed'});
      if(busy) return send(res,429,{error:'Another answer is running. Please wait.'});
      let data=''; for await(const chunk of req){ data+=chunk; if(data.length>8000) return send(res,413,{error:'Question too long'}); }
      let body; try{body=JSON.parse(data);}catch{return send(res,400,{error:'Invalid request'});}
      if(!body||typeof body.question!=='string'||!body.question.trim()||body.question.length>1500||!['rules','full','vector'].includes(body.method)) return send(res,400,{error:'Enter a question under 1,500 characters and a valid approach.'});
      busy=true; try {return send(res,200,await answer(body.method,body.question.trim(),policies));} finally{busy=false;}
    }
    if(req.method!=='GET'||!files[url.pathname]) return send(res,404,{error:'Not found'});
    const name=files[url.pathname], ext=name.slice(name.lastIndexOf('.'));
    const content=await readFile(new URL(`./public/${name}`,import.meta.url));
    res.writeHead(200,{'Content-Type':types[ext]+'; charset=utf-8'});res.end(content);
  }catch(e){if(!res.headersSent)send(res,500,{error:e.message});else res.end();}
});
server.listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Policy Assistant: http://localhost:${process.env.PORT||3000}`));
