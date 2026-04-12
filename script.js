/* =============================================
   FIREBASE
============================================= */
const firebaseConfig = {
  apiKey: "AIzaSyBkmrbF-V9gNQiFhEjynULsYjpr5EQWErA",
  authDomain: "studiostore-4bf29.firebaseapp.com",
  projectId: "studiostore-4bf29",
  storageBucket: "studiostore-4bf29.firebasestorage.app",
  messagingSenderId: "693847220052",
  appId: "1:693847220052:web:f2a863bd3bbef1087932c1"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* =============================================
   ★ 관리자 이메일 — 여기 수정 ★
============================================= */
const ADMIN_EMAILS = ["sumin150130@gmail.com"];

/* =============================================
   STATE
============================================= */
let products = [], newsArr = [];
let currentUser = null, isAdmin = false;
let currentFilter = "all", orderFilter = "all";
let detailItem = null;
let nickMandatory = false;
let newsFileData = null; // base64

const CAT = { script:"스크립트", plugin:"플러그인", map:"맵", ui:"UI", free:"무료" };

/* =============================================
   HELPERS
============================================= */
const $ = id => document.getElementById(id);
const isAdminUser = u => u && ADMIN_EMAILS.includes((u.email||"").toLowerCase().trim());

// LocalStorage 닉네임
const LS = "rsstore_nicks_v1";
function getNick(uid){ try{ return (JSON.parse(localStorage.getItem(LS)||"{}")[uid]||{}).n||""; }catch{ return ""; } }
function setNick(uid,n){ try{ const d=JSON.parse(localStorage.getItem(LS)||"{}"); d[uid]={n}; localStorage.setItem(LS,JSON.stringify(d)); }catch{} }
function displayName(u){ if(!u) return ""; const n=getNick(u.uid); return n.length>=2?n:(u.displayName||u.email.split("@")[0]||"회원"); }

function toast(msg, type=""){
  const t=$("toast"); t.textContent=msg; t.className=`toast show ${type}`;
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),3200);
}
function setStatus(id,msg,type){
  const el=$(id); el.textContent=msg; el.className="status-msg "+type;
  if(type==="ok") setTimeout(()=>el.textContent="",4000);
}

/* =============================================
   PAGE NAV
============================================= */
function showPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const pg=$("page-"+name); if(pg) pg.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l=>l.classList.toggle("active",l.dataset.page===name));
  if(name==="assets") renderAssets();
  if(name==="news")   renderNews();
}
document.querySelectorAll(".nav-link").forEach(l=>{
  l.addEventListener("click",e=>{ e.preventDefault(); showPage(l.dataset.page); });
});

/* =============================================
   AUTH
============================================= */
$("loginBtn").addEventListener("click",()=>{
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e=>toast("로그인 실패: "+e.message,"err"));
});
$("logoutBtn").addEventListener("click",()=>{
  auth.signOut().then(()=>toast("로그아웃 됐어요!"));
});
$("editNickBtn").addEventListener("click",()=>{ if(currentUser) openNickModal(false); });

auth.onAuthStateChanged(user=>{
  currentUser=user;
  if(user){
    isAdmin=isAdminUser(user);
    // 로그인 UI
    $("loginBtn").style.display="none";
    const um=$("userMenu"); um.classList.add("visible");
    // 아바타
    $("userAvatar").src=user.photoURL||"https://placehold.co/64x64/1e2235/00d4ff?text=U";
    $("userName").textContent=displayName(user);
    // 역할 뱃지
    const rb=$("userRoleBadge");
    rb.textContent=isAdmin?"관리자":"회원";
    rb.className="user-role-badge show "+(isAdmin?"role-admin":"role-member");
    // 관리자 버튼
    const ab=$("adminPanelBtn");
    if(isAdmin) ab.classList.add("show"); else ab.classList.remove("show");
    // 닉네임 없으면 모달
    if(getNick(user.uid).length<2) queueMicrotask(()=>openNickModal(true));
  } else {
    isAdmin=false;
    $("loginBtn").style.display="";
    $("userMenu").classList.remove("visible");
    $("adminPanelBtn").classList.remove("show");
    nickMandatory=false; closeM("nickModal");
  }
  renderProducts(filtered());
});

/* =============================================
   NICK MODAL
============================================= */
function openNickModal(mandatory){
  nickMandatory=mandatory;
  if(currentUser){ const s=getNick(currentUser.uid); $("nickInp").value=s||currentUser.displayName||""; }
  $("nickHint").textContent="";
  openM("nickModal");
  $("nickBg").onclick=()=>{
    if(nickMandatory){ $("nickHint").textContent="닉네임을 저장해야 계속할 수 있어요."; return; }
    closeM("nickModal");
  };
}
$("nickSave").addEventListener("click",()=>{
  const v=$("nickInp").value.trim();
  if(v.length<2){ $("nickHint").textContent="닉네임은 2자 이상 입력해주세요."; return; }
  if(currentUser){ setNick(currentUser.uid,v); $("userName").textContent=v; }
  nickMandatory=false; closeM("nickModal"); toast("닉네임 저장됐어요!","ok");
});

/* =============================================
   LOAD DATA
============================================= */
async function loadProducts(){
  try{
    const snap=await db.collection("products").get();
    products=[]; snap.forEach(d=>products.push({id:d.id,...d.data()}));
    renderTop4(); renderProducts(filtered());
  }catch(e){ toast("상품 로드 실패: "+e.message,"err"); }
}
async function loadNews(){
  try{
    const snap=await db.collection("news").get();
    newsArr=[]; snap.forEach(d=>newsArr.push({id:d.id,...d.data()}));
    newsArr.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  }catch(e){ console.error(e); }
}

/* =============================================
   FILTER
============================================= */
function filtered(){
  let d=[...products];
  const kw=$("searchInput").value.toLowerCase();
  if(kw) d=d.filter(p=>(p.name||"").toLowerCase().includes(kw)||(p.description||"").toLowerCase().includes(kw));
  switch(currentFilter){
    case "popular":  d.sort((a,b)=>(b.sales||0)-(a.sales||0)); $("gridTitle").textContent="🔥 인기 에셋"; break;
    case "free":     d=d.filter(p=>!p.price||p.price===0||p.categories?.includes("free")); $("gridTitle").textContent="🎁 무료 에셋"; break;
    case "lowprice": d.sort((a,b)=>(a.price||0)-(b.price||0)); $("gridTitle").textContent="↓ 낮은 가격순"; break;
    case "highprice":d.sort((a,b)=>(b.price||0)-(a.price||0)); $("gridTitle").textContent="↑ 높은 가격순"; break;
    case "script":   d=d.filter(p=>p.categories?.includes("script")||p.category==="script"); $("gridTitle").textContent="📜 스크립트"; break;
    case "plugin":   d=d.filter(p=>p.categories?.includes("plugin")||p.category==="plugin"); $("gridTitle").textContent="🔧 플러그인"; break;
    case "map":      d=d.filter(p=>p.categories?.includes("map")||p.category==="map"); $("gridTitle").textContent="🗺 맵"; break;
    case "ui":       d=d.filter(p=>p.categories?.includes("ui")||p.category==="ui"); $("gridTitle").textContent="🖼 UI"; break;
    default: $("gridTitle").textContent="전체 에셋";
  }
  return d;
}
window.setFilter=f=>{
  currentFilter=f;
  document.querySelectorAll(".cat-btn").forEach(b=>b.classList.toggle("active",b.dataset.filter===f));
  renderProducts(filtered()); showPage("store");
};
document.querySelectorAll(".cat-btn").forEach(b=>{
  b.addEventListener("click",()=>{ window.setFilter(b.dataset.filter); });
});
$("searchInput").addEventListener("input",()=>renderProducts(filtered()));

/* =============================================
   RENDER PRODUCTS
============================================= */
function renderProducts(data){
  const g=$("productGrid"), e=$("emptyState"), c=$("gridCount");
  g.innerHTML=""; c.textContent=`총 ${data.length}개의 에셋`;
  e.style.display=data.length===0?"block":"none";
  data.forEach(item=>g.appendChild(makeCard(item,true)));
}
function renderAssets(){
  const g=$("assetsGrid"),e=$("assetsEmpty"),c=$("assetsCount");
  g.innerHTML=""; c.textContent=`총 ${products.length}개의 에셋`;
  e.style.display=products.length===0?"block":"none";
  products.forEach(item=>g.appendChild(makeCard(item,false)));
}
function makeCard(item, showDel){
  const isFree=!item.price||item.price===0||item.categories?.includes("free");
  const cats=(item.categories||(item.category?[item.category]:[]));
  const catLabel=cats.map(c=>CAT[c]||c).join(", ")||"에셋";
  const el=document.createElement("div"); el.className="card";
  el.innerHTML=`
    <div class="card-img">
      <img src="${item.image||"https://placehold.co/400x225/1e2235/00d4ff?text=RSStore"}" alt="${item.name}" loading="lazy">
      <span class="cat-tag">${catLabel}</span>
      ${isFree?'<span class="free-tag">FREE</span>':""}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.description||"로블록스 스튜디오 에셋"}</div>
      <div class="card-footer">
        <span class="card-price ${isFree?"fp":""}">${isFree?"FREE":"₩ "+Number(item.price).toLocaleString()}</span>
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="card-sales">${item.sales?item.sales+" 판매":""}</span>
          <button class="btn-card-buy">구매</button>
        </div>
      </div>
    </div>
    ${showDel&&isAdmin?'<button class="del-btn">🗑</button>':""}
  `;
  el.querySelector(".btn-card-buy").addEventListener("click",e=>{e.stopPropagation();openPurchase(item);});
  el.addEventListener("click",()=>openDetail(item));
  if(showDel&&isAdmin) el.querySelector(".del-btn").addEventListener("click",e=>{e.stopPropagation();deleteProduct(item.id);});
  return el;
}

/* =============================================
   TOP 4
============================================= */
function renderTop4(){
  const g=$("top4Grid"); g.innerHTML="";
  const top=[...products].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,4);
  ["🥇","🥈","🥉","4"].forEach((m,i)=>{
    if(!top[i]) return;
    const it=top[i], isFree=!it.price||it.price===0||it.categories?.includes("free");
    const el=document.createElement("div"); el.className="top4-card";
    el.innerHTML=`
      <span class="top4-rank ${["rank-1","rank-2","rank-3",""][i]}">${m}</span>
      <img class="top4-img" src="${it.image||"https://placehold.co/48x48/1e2235/00d4ff?text=RS"}" alt="${it.name}">
      <div class="top4-info">
        <div class="top4-name">${it.name}</div>
        <div class="top4-price">${isFree?"FREE":"₩ "+Number(it.price).toLocaleString()}</div>
        <div class="top4-sales">${it.sales?it.sales+" 판매":"신규"}</div>
      </div>`;
    el.addEventListener("click",()=>openDetail(it));
    g.appendChild(el);
  });
}

/* =============================================
   NEWS
============================================= */
async function renderNews(){
  await loadNews();
  const g=$("newsGrid"),e=$("newsEmpty"),c=$("newsCount");
  g.innerHTML=""; c.textContent=`총 ${newsArr.length}개의 뉴스`;
  e.style.display=newsArr.length===0?"block":"none";
  newsArr.forEach(item=>{
    const el=document.createElement("div"); el.className="news-card";
    const date=item.createdAt?new Date(item.createdAt).toLocaleDateString("ko-KR"):"";
    el.innerHTML=`
      ${item.imageURL?`<img class="news-card-img" src="${item.imageURL}" alt="${item.title}">`:""}
      <div class="news-card-body">
        <div class="news-date">${date}</div>
        <div class="news-title">${item.title}</div>
        <div class="news-excerpt">${item.body||""}</div>
      </div>
      ${isAdmin?`<div class="news-card-footer"><button class="news-del-btn">🗑 삭제</button></div>`:""}
    `;
    el.addEventListener("click",()=>openNewsModal(item));
    if(isAdmin) el.querySelector(".news-del-btn").addEventListener("click",ev=>{ev.stopPropagation();deleteNews(item.id);});
    g.appendChild(el);
  });
}
function openNewsModal(item){
  const date=item.createdAt?new Date(item.createdAt).toLocaleDateString("ko-KR"):"";
  $("nmDate").textContent=date; $("nmTitle").textContent=item.title; $("nmBody").textContent=item.body||"";
  const img=$("nmImg");
  if(item.imageURL){img.src=item.imageURL;img.style.display="block";}else{img.style.display="none";}
  openM("newsModal");
}
async function deleteNews(id){
  if(!isAdmin||!confirm("정말 삭제할까요?")) return;
  try{ await db.collection("news").doc(id).delete(); toast("🗑 뉴스 삭제됐어요.","ok"); renderNews(); }
  catch(e){ toast("삭제 실패: "+e.message,"err"); }
}

/* =============================================
   DETAIL PANEL
============================================= */
function openDetail(item){
  detailItem=item;
  const isFree=!item.price||item.price===0||item.categories?.includes("free");
  const cats=(item.categories||(item.category?[item.category]:[]));
  $("dImg").src=item.image||"https://placehold.co/430x242/1e2235/00d4ff?text=RSStore";
  $("dCat").textContent=cats.map(c=>CAT[c]||c).join(" · ")||"에셋";
  $("dName").textContent=item.name;
  $("dDesc").textContent=item.description||"로블록스 스튜디오 에셋입니다.";
  $("dPrice").textContent=isFree?"FREE":"₩ "+Number(item.price).toLocaleString();
  $("dPrice").style.color=isFree?"var(--green)":"var(--accent)";
  $("dSales").textContent=item.sales?`${item.sales}명 구매`:"";
  $("detailPanel").classList.add("on"); $("overlay").classList.add("on");
}
window.closeDetail=()=>{ $("detailPanel").classList.remove("on"); $("overlay").classList.remove("on"); };
$("dBuyBtn").addEventListener("click",()=>{ if(detailItem) openPurchase(detailItem); });

/* =============================================
   PURCHASE
============================================= */
function openPurchase(item){
  const isFree=!item.price||item.price===0||item.categories?.includes("free");
  $("pName").textContent=item.name;
  $("pPrice").textContent=isFree?"FREE":"₩ "+Number(item.price).toLocaleString();
  $("buyDiscord").value=""; $("buyPhone").value="";
  $("buyBtn").dataset.id=item.id; $("buyBtn").dataset.name=item.name; $("buyBtn").dataset.price=item.price||0;
  openM("purchaseModal");
}
$("buyBtn").addEventListener("click",async()=>{
  if(!currentUser){ toast("구매하려면 로그인이 필요해요!","err"); return; }
  const discord=$("buyDiscord").value.trim(), phone=$("buyPhone").value.trim();
  if(!discord&&!phone){ toast("디스코드 ID 또는 전화번호를 입력해주세요!","err"); return; }
  const btn=$("buyBtn"); btn.disabled=true; btn.textContent="처리 중…";
  try{
    await db.collection("orders").add({
      productId:btn.dataset.id, productName:btn.dataset.name, price:Number(btn.dataset.price),
      buyerEmail:currentUser.email, buyerName:displayName(currentUser),
      discord, phone, status:"pending", createdAt:new Date().toISOString()
    });
    await db.collection("products").doc(btn.dataset.id).update({sales:firebase.firestore.FieldValue.increment(1)});
    toast("✅ 구매 요청 완료! 곧 연락드릴게요.","ok");
    closeM("purchaseModal"); loadProducts();
  }catch(e){ toast("구매 요청 실패: "+e.message,"err"); }
  finally{ btn.disabled=false; btn.textContent="✅ 구매 요청하기"; }
});

/* =============================================
   ADMIN PANEL
============================================= */
$("adminPanelBtn").addEventListener("click",()=>{ openM("adminPanel"); switchTab("addProduct"); });

document.querySelectorAll(".a-tab").forEach(tab=>{
  tab.addEventListener("click",()=>{
    const t=tab.dataset.tab;
    document.querySelectorAll(".a-tab").forEach(x=>x.classList.remove("on"));
    document.querySelectorAll(".a-content").forEach(x=>x.classList.remove("on"));
    tab.classList.add("on"); $("tab-"+t).classList.add("on");
    if(t==="orderList") loadOrders();
    if(t==="manageProduct") loadManage();
  });
});
function switchTab(name){
  document.querySelectorAll(".a-tab").forEach(t=>t.classList.toggle("on",t.dataset.tab===name));
  document.querySelectorAll(".a-content").forEach(c=>c.classList.toggle("on",c.id==="tab-"+name));
}

// Image URL preview
$("adminImage").addEventListener("input",()=>{
  const url=$("adminImage").value.trim();
  const prev=$("imgPreview"), img=$("previewImg");
  if(url){ img.src=url; prev.style.display="block"; img.onerror=()=>prev.style.display="none"; }
  else prev.style.display="none";
});

// Add product
$("adminUpload").addEventListener("click",async()=>{
  if(!isAdmin){ toast("관리자만 사용할 수 있어요.","err"); return; }
  const name=$("adminName").value.trim();
  const price=Number($("adminPrice").value)||0;
  const image=$("adminImage").value.trim();
  const desc=$("adminDesc").value.trim();
  const cats=[...$("adminPanel").querySelectorAll(".cat-cbs input:checked")].map(cb=>cb.value);
  if(!name){ setStatus("uploadStatus","제목을 입력해주세요!","err"); return; }
  if(!cats.length){ setStatus("uploadStatus","카테고리를 선택해주세요!","err"); return; }
  const btn=$("adminUpload"); btn.disabled=true; btn.textContent="등록 중…";
  setStatus("uploadStatus","등록 중…","loading");
  try{
    const isFree=price===0||cats.includes("free");
    if(isFree&&!cats.includes("free")) cats.push("free");
    await db.collection("products").add({ name,price,image,description:desc,categories:cats,category:cats[0],sales:0,createdAt:new Date().toISOString() });
    setStatus("uploadStatus","✅ 상품이 등록됐어요!","ok");
    toast("✅ 상품 등록 완료!","ok");
    $("adminName").value=""; $("adminPrice").value=""; $("adminImage").value=""; $("adminDesc").value="";
    $("adminPanel").querySelectorAll(".cat-cbs input").forEach(cb=>cb.checked=false);
    $("imgPreview").style.display="none";
    await loadProducts();
  }catch(e){ setStatus("uploadStatus","오류: "+e.message,"err"); toast("등록 실패: "+e.message,"err"); }
  finally{ btn.disabled=false; btn.textContent="✅ 상품 등록하기"; }
});

// Manage products
async function loadManage(){
  const list=$("manageList"); list.innerHTML="<p style='color:var(--text3);text-align:center;padding:24px;'>불러오는 중…</p>";
  await loadProducts();
  if(!products.length){ list.innerHTML="<p style='color:var(--text3);text-align:center;padding:36px;'>등록된 상품이 없어요.</p>"; return; }
  list.innerHTML="";
  products.forEach(item=>{
    const isFree=!item.price||item.price===0||item.categories?.includes("free");
    const cats=(item.categories||(item.category?[item.category]:[]));
    const el=document.createElement("div"); el.className="m-item";
    el.innerHTML=`
      <img class="m-img" src="${item.image||"https://placehold.co/52x36/1e2235/00d4ff?text=RS"}" alt="">
      <div class="m-info">
        <div class="m-name">${item.name}</div>
        <div class="m-meta">${cats.map(c=>CAT[c]||c).join(", ")} | ${isFree?"FREE":"₩ "+Number(item.price).toLocaleString()} | ${item.sales||0}판매</div>
      </div>
      <button class="btn-del-item">🗑 삭제</button>`;
    el.querySelector(".btn-del-item").addEventListener("click",async()=>{ await deleteProduct(item.id); loadManage(); });
    list.appendChild(el);
  });
}

// Delete product
async function deleteProduct(id){
  if(!isAdmin||!confirm("정말 삭제할까요?")) return;
  try{ await db.collection("products").doc(id).delete(); toast("🗑 삭제됐어요.","ok"); await loadProducts(); renderProducts(filtered()); }
  catch(e){ toast("삭제 실패: "+e.message,"err"); }
}

// Orders
async function loadOrders(){
  const list=$("orderList"); list.innerHTML="<p style='color:var(--text3);text-align:center;padding:28px;'>불러오는 중…</p>";
  try{
    const snap=await db.collection("orders").get();
    let orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
    orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const fil=orderFilter==="all"?orders:orders.filter(o=>o.status===orderFilter);
    if(!fil.length){ list.innerHTML="<p style='color:var(--text3);text-align:center;padding:36px;'>구매 요청이 없어요.</p>"; return; }
    list.innerHTML="";
    fil.forEach(o=>{
      const date=o.createdAt?new Date(o.createdAt).toLocaleString("ko-KR"):"";
      const contacts=[o.discord?`💬 ${o.discord}`:null,o.phone?`📱 ${o.phone}`:null].filter(Boolean).join("  |  ");
      const el=document.createElement("div"); el.className="o-item";
      el.innerHTML=`
        <div class="o-hdr">
          <span class="o-product">${o.productName}</span>
          <span class="o-status ${o.status==="done"?"done":"pending"}">${o.status==="done"?"✅ 완료":"⏳ 대기 중"}</span>
        </div>
        <div class="o-contact">${contacts}</div>
        <div class="o-detail">👤 ${o.buyerName||o.buyerEmail} | 💰 ${o.price===0?"FREE":"₩ "+Number(o.price).toLocaleString()} | 📅 ${date}</div>
        ${o.status!=="done"?`<button class="btn-done" data-id="${o.id}">✅ 완료 처리</button>`:""}`;
      if(o.status!=="done"){
        el.querySelector(".btn-done").addEventListener("click",async ev=>{
          const b=ev.currentTarget; b.disabled=true; b.textContent="처리 중…";
          try{ await db.collection("orders").doc(o.id).update({status:"done"}); toast("✅ 완료 처리됐어요!","ok"); loadOrders(); }
          catch(e){ toast("오류: "+e.message,"err"); b.disabled=false; b.textContent="✅ 완료 처리"; }
        });
      }
      list.appendChild(el);
    });
  }catch(e){ list.innerHTML=`<p style='color:var(--red);text-align:center;'>오류: ${e.message}</p>`; }
}
document.querySelectorAll(".o-filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".o-filter").forEach(b=>b.classList.remove("on"));
    btn.classList.add("on"); orderFilter=btn.dataset.status; loadOrders();
  });
});

// News upload
const fileZone=$("fileZone"), newsFileInp=$("newsFile");
newsFileInp.addEventListener("change",e=>handleFile(e.target.files[0]));
fileZone.addEventListener("dragover",e=>{e.preventDefault();fileZone.style.borderColor="var(--accent)";});
fileZone.addEventListener("dragleave",()=>fileZone.style.borderColor="");
fileZone.addEventListener("drop",e=>{
  e.preventDefault(); fileZone.style.borderColor="";
  const f=e.dataTransfer.files[0];
  if(f&&f.type.startsWith("image/")) handleFile(f);
  else toast("이미지 파일만 업로드 가능해요!","err");
});
function handleFile(file){
  if(!file) return;
  if(file.size>500*1024){ toast("500KB 이하 파일만 직접 저장돼요.","err"); return; }
  const reader=new FileReader();
  reader.onload=e=>{ newsFileData=e.target.result; $("filePreviewImg").src=newsFileData; $("filePreview").style.display="block"; $("fileUI").style.display="none"; };
  reader.readAsDataURL(file);
}
$("rmFile").addEventListener("click",()=>{
  newsFileData=null; newsFileInp.value="";
  $("filePreview").style.display="none"; $("fileUI").style.display="block";
});
$("newsUpload").addEventListener("click",async()=>{
  if(!isAdmin){ toast("관리자만 사용할 수 있어요.","err"); return; }
  const title=$("newsTitle").value.trim(), body=$("newsBody").value.trim();
  if(!title){ setStatus("newsStatus","제목을 입력해주세요!","err"); return; }
  if(!body){ setStatus("newsStatus","내용을 입력해주세요!","err"); return; }
  const btn=$("newsUpload"); btn.disabled=true; btn.textContent="등록 중…";
  setStatus("newsStatus","등록 중…","loading");
  try{
    await db.collection("news").add({ title,body,imageURL:newsFileData||"",createdAt:new Date().toISOString() });
    setStatus("newsStatus","✅ 뉴스가 등록됐어요!","ok");
    toast("📰 뉴스 등록 완료!","ok");
    $("newsTitle").value=""; $("newsBody").value=""; $("rmFile").click();
    await loadNews();
  }catch(e){ setStatus("newsStatus","오류: "+e.message,"err"); toast("뉴스 등록 실패: "+e.message,"err"); }
  finally{ btn.disabled=false; btn.textContent="📰 뉴스 등록하기"; }
});

/* =============================================
   SLIDER
============================================= */
let slide=0; const total=3;
const sw=$("slidesWrapper");
function goSlide(n){ slide=n; sw.style.transform=`translateX(-${n*100}%)`; document.querySelectorAll(".dot").forEach((d,i)=>d.classList.toggle("active",i===n)); }
window.goSlide=goSlide;
window.nextSlide=()=>goSlide((slide+1)%total);
window.prevSlide=()=>goSlide((slide-1+total)%total);
setInterval(()=>window.nextSlide(),5000);

/* =============================================
   THEME
============================================= */
let dark=true;
$("themeToggle").addEventListener("click",()=>{
  dark=!dark;
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  $("themeToggle").textContent=dark?"🌙":"☀️";
});

/* =============================================
   MODAL HELPERS
============================================= */
function openM(id){ $(id).classList.add("on"); }
function closeM(id){ $(id).classList.remove("on"); }
window.closeM=closeM;
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape") return;
  if($("nickModal").classList.contains("on")&&nickMandatory) return;
  document.querySelectorAll(".modal.on").forEach(m=>m.classList.remove("on"));
  closeDetail();
});

/* =============================================
   INIT
============================================= */
loadProducts();
loadNews();
