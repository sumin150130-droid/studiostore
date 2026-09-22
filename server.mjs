import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
const key=process.env.OPENAI_API_KEY;
const password=process.env.CHAT_PASSWORD;
if(!password||password.length<16)throw new Error('CHAT_PASSWORD를 16자 이상으로 설정해 주세요.');
const origins=new Set((process.env.ALLOWED_ORIGINS||`http://localhost:${port},http://127.0.0.1:${port}`).split(',').map(s=>s.trim()));
const assets=new Map([['/',['index.html','text/html']],['/index.html',['index.html','text/html']],['/script.js',['script.js','text/javascript']],['/style.css',['style.css','text/css']]]);
let windowStart=Date.now(),count=0,active=0;
const instructions='너는 Loop AI라는 대화형 AI 도우미야. 한국어를 기본으로 쉽고 명확하게 답해. 모르는 것은 모른다고 말하고 검색이나 실행을 하지 않았는데 했다고 주장하지 마. 사람이나 의식이 있다고 주장하지 마. 청소년도 사용하는 서비스이므로 연령에 적합하게 답하고 위험한 행동을 돕지 마. 코드는 필요하면 코드 블록으로 제공해.';
function authorized(value){const a=Buffer.from(value||''),b=Buffer.from('Bearer '+password);return a.length===b.length&&timingSafeEqual(a,b);}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname!=='/api/chat'){
      const asset=assets.get(pathname);
      if(req.method!=='GET'||!asset)return send(404,{error:'페이지를 찾을 수 없어요.'});
      const bytes=await readFile(fileURLToPath(new URL(asset[0],import.meta.url)));
      res.writeHead(200,{'Content-Type':asset[1]+'; charset=utf-8'});res.end(bytes);return;
    }
    const origin=req.headers.origin;
    if(origin&&!origins.has(origin))return send(403,{error:'허용되지 않은 사이트 주소예요.'});
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){
      res.writeHead(204,{'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'});res.end();return;
    }
    if(req.method!=='POST')return send(405,{error:'POST 요청이 필요해요.'});
    if(!authorized(req.headers.authorization))return send(401,{error:'접속 설정에서 암호를 확인해 주세요.'});
    if(!key)return send(503,{error:'서버에 OPENAI_API_KEY가 설정되지 않았어요.'});
    if(Date.now()-windowStart>=60000){windowStart=Date.now();count=0;}
    if(count>=20||active>=3)return send(429,{error:'잠시 후 다시 보내 주세요. 서버 요청 한도에 도달했어요.'});
    let raw='',size=0;
    for await(const chunk of req){size+=chunk.length;if(size>100000){send(413,{error:'메시지가 너무 길어요.'});return;}raw+=chunk;}
    let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'올바른 JSON이 아니에요.'});}
    const messages=body?.messages;
    if(!Array.isArray(messages)||!messages.length||messages.length>21||messages.some((m,i)=>!m||m.role!==(i%2===0?'user':'assistant')||typeof m.content!=='string'||!m.content.trim()||m.content.length>20000)||messages.at(-1).role!=='user'||messages.at(-1).content.length>4000||messages.reduce((n,m)=>n+m.content.length,0)>20000)return send(400,{error:'대화가 너무 길거나 형식이 잘못됐어요. 새 대화로 시작해 주세요.'});
    count++;active++;
    try{
      const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions,input:messages,max_output_tokens:1800,store:false}),signal:AbortSignal.timeout(60000)});
      if(!upstream.ok){await upstream.arrayBuffer();return send(upstream.status===429?429:502,{error:upstream.status===429?'AI 사용량 또는 요청 한도에 도달했어요. 운영자의 API 설정을 확인해 주세요.':'AI 연결에 실패했어요. 운영자의 API 키와 모델 사용 권한을 확인해 주세요.'});}
      const data=await upstream.json();
      const reply=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text'||x.type==='refusal').map(x=>x.text||x.refusal||'').join('\n');
      if(!reply)return send(502,{error:'AI가 텍스트 답변을 반환하지 않았어요. 다시 시도해 주세요.'});
      send(200,{reply,partial:data.status==='incomplete'});
    }finally{active--;}
  }catch(err){if(!res.headersSent)send(500,{error:err.name==='TimeoutError'?'AI 응답 시간이 초과됐어요.':'서버 연결 중 문제가 생겼어요.'});else res.end();}
});
server.requestTimeout=15000;
server.listen(port,host,()=>console.log(`Loop AI: http://localhost:${port}`));
