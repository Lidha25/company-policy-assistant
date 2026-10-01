import {loadPolicies} from './lib/policies.mjs';
import {answer} from './lib/engine.mjs';
// Slack Socket Mode uses native Node WebSocket; no public server or third-party dependency needed.
for(const key of ['SLACK_APP_TOKEN','SLACK_BOT_TOKEN','SLACK_ALLOWED_CHANNEL'])if(!process.env[key])throw new Error(`Set ${key} in .env`);
const policies=await loadPolicies(),seen=new Set();let reconnectTimer,active=false;
async function slack(method,body,token=process.env.SLACK_BOT_TOKEN){
  const response=await fetch(`https://slack.com/api/${method}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!data.ok)throw new Error(`Slack ${method}: ${data.error}`);return data;
}
const safe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
async function connect(){
 const connection=await slack('apps.connections.open',{},process.env.SLACK_APP_TOKEN),socket=new WebSocket(connection.url);
 socket.addEventListener('open',()=>console.log('Policy bot connected to Slack. Mention it in the configured testing channel.'));
 socket.addEventListener('message',async({data})=>{
  let envelope;try{envelope=JSON.parse(data);}catch{return;}
  if(envelope.envelope_id)socket.send(JSON.stringify({envelope_id:envelope.envelope_id}));
  if(envelope.type==='disconnect'){socket.close();return;}
  const event=envelope.payload?.event,eventId=envelope.payload?.event_id;
  if(event?.type!=='app_mention'||event.bot_id||event.channel!==process.env.SLACK_ALLOWED_CHANNEL||seen.has(eventId))return;
  seen.add(eventId);if(seen.size>1000)seen.delete(seen.values().next().value);
  const question=event.text.replace(/<@[A-Z0-9]+>/g,'').trim();
  const post=text=>slack('chat.postMessage',{channel:event.channel,thread_ts:event.thread_ts||event.ts,text,unfurl_links:false,unfurl_media:false});
  if(active){await post('I am answering another question. Please try again shortly.');return;}
  active=true;
  try{
   if(!question||question.length>1500){await post('Please ask a policy question under 1,500 characters.');return;}
   const method=process.env.OPENAI_API_KEY?'full':'rules';const result=await answer(method,question,policies);
   const citations=result.policies.map(p=>`${safe(p.title)} — ${safe(p.department)} (${p.id}, CSV row ${p.csv_row})`).join('\n');
   await post(`${safe(result.answer)}\n\nRelevant policy: ${citations||'No matching policy found'}\nApproach: ${method==='full'?'LLM using the full CSV':'Rules-based search (AI not connected)'} · ${Math.round(result.response_ms)} ms · ${result.total_tokens} tokens`);
  }catch{await post('I could not retrieve an answer. Please try again later.');}finally{active=false;}
 });
 socket.addEventListener('error',()=>console.error('Slack connection error.'));
 socket.addEventListener('close',()=>{clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>connect().catch(()=>{console.error('Reconnect failed. Restart the bot.');}),5000);});
}
await connect();
