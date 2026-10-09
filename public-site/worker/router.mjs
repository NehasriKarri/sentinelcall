const buckets=new Map();
const json=(o,status=200,extra={})=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
const error=(status,code,message)=>json({error:{code,message}},status);
export default {async fetch(request,env={}){
 const p=new URL(request.url).pathname;
 if(request.method==='GET'&&p==='/health')return json({status:'ok'});
 if(request.method==='GET'&&p==='/samples')return json(data.samples);
 if(request.method==='GET'&&p.startsWith('/samples/')){const s=data.samples.find(x=>x.id===p.slice(9));return s?json(s):error(404,'not_found','Sample not found');}
 if(p==='/analyze'&&request.method==='POST'){
  const now=Date.now(),key=request.headers.get('CF-Connecting-IP')||'unknown';const b=(buckets.get(key)||[]).filter(t=>t>now-60000);if(b.length>=30)return json({error:{code:'rate_limited',message:'Too many checks. Please wait a minute.'}},429,{'Retry-After':'60'});b.push(now);buckets.set(key,b);if(buckets.size>10000)buckets.delete(buckets.keys().next().value);
  try{let size=0;const chunks=[];if(request.body){const reader=request.body.getReader();while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>128000){await reader.cancel();return error(413,'body_too_large','Request body is too large.');}chunks.push(value);}}
   const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}let q;try{q=JSON.parse(new TextDecoder().decode(buffer));}catch{return error(422,'validation_error','Provide valid JSON.');}
   if(!q||typeof q.transcript!=='string'||!q.transcript.trim()||Array.from(q.transcript).length>10000||q.language_hint!=null&&!['en','hi'].includes(q.language_hint)||q.use_llm!==undefined&&typeof q.use_llm!=='boolean')return error(422,'validation_error','Provide a nonblank transcript of at most 10000 characters and language_hint en or hi.');
   return json(await engine.analyze(q.transcript,q.use_llm??false,q.language_hint||'en',env));
  }catch{return error(500,'internal_error','Something went wrong. Please try again.');}
 }
 if(!['GET','HEAD'].includes(request.method))return error(405,'method_not_allowed','Method not allowed');
 const asset=assets[p==='/'?'/index.html':p];if(!asset)return error(404,'not_found','Not found');const bytes=Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'public, max-age=300'}});
}};
