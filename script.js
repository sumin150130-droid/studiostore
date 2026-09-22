// 별도 서버를 쓰면 전체 HTTPS 주소로 바꾸세요. API 키는 넣지 마세요.
const API_URL = "https://studiostore.kr//api/chat";
const $ = id => document.getElementById(id);
const list = $("messages"), input = $("prompt"), status = $("status");
let history = [], busy = false, controller;
function scrollDown(){list.scrollTop=list.scrollHeight;}
function addMessage(role,text){
  $("welcome").hidden=true;
  const article=document.createElement("article"); article.className="message "+role;
  const name=document.createElement("div"); name.className="name"; name.textContent=role==="user"?"나":"◈ Loop AI";
  const body=document.createElement("div");body.className="text";body.textContent=text;
  article.append(name,body);
  if(role==="assistant"){
    const copy=document.createElement("button");copy.className="copy";copy.textContent="답변 복사";
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent="복사 완료";}catch{status.textContent="텍스트를 선택해서 복사해 주세요.";}};
    article.append(copy);
  }
  list.append(article);scrollDown();return article;
}
function resize(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,180)+"px";}
$("settings").onclick=()=>$("config").showModal();
$("newChat").onclick=()=>{
  controller?.abort(); history=[];
  list.querySelectorAll(".message").forEach(el=>el.remove());$("welcome").hidden=false;
  status.textContent=""; input.value="";resize();input.focus();
};
input.addEventListener("input",resize);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();$("chatForm").requestSubmit();}});
document.querySelectorAll(".suggestions button").forEach(b=>b.onclick=()=>{input.value=b.textContent;resize();input.focus();});
$("chatForm").onsubmit=async e=>{
  e.preventDefault(); const text=input.value.trim(); if(!text||busy)return;
  if(location.protocol==="file:"){status.textContent="사용법에 따라 서버를 실행하고 http://localhost:3000 으로 열어 주세요.";return;}
  if(!$("password").value){$("config").showModal();return;}
  busy=true;$("send").disabled=true;const userMessage=addMessage("user",text);
  input.value="";resize();status.textContent="답변을 작성하고 있어요…";
  controller=new AbortController();const current=controller;
  const timer=setTimeout(()=>current.abort("timeout"),65000);
  try{
    const recent=history.slice(-18);
    while(recent.reduce((n,m)=>n+m.content.length,0)+text.length>18000)recent.splice(0,2);
    const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+$("password").value},body:JSON.stringify({messages:[...recent,{role:"user",content:text}]}),signal:current.signal});
    const data=await res.json().catch(()=>{throw new Error("서버 주소를 확인해 주세요. JSON 응답을 받지 못했어요.");});
    if(!res.ok)throw new Error(data.error||"답변을 받지 못했어요.");
    if(typeof data.reply!=="string"||!data.reply.trim())throw new Error("답변이 비어 있어요. 다시 시도해 주세요.");
    history.push({role:"user",content:text},{role:"assistant",content:data.reply});history=history.slice(-20);
    addMessage("assistant",data.reply);status.textContent=data.partial?"답변 길이 제한에 도달했어요. 이어서 설명해 달라고 요청할 수 있어요.":"";
  }catch(err){
    userMessage.remove();
    if(!current.signal.aborted||current.signal.reason==="timeout"){
      input.value=text;resize();status.textContent=current.signal.aborted?"응답 시간이 초과됐어요. 다시 시도해 주세요.":err.message||"서버 연결에 실패했어요.";
    }
    if(!history.length&&!list.querySelector(".message"))$("welcome").hidden=false;
  }finally{clearTimeout(timer);busy=false;$("send").disabled=false;input.focus();}
};
