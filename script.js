import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

/* ===================================================
   FIREBASE 설정
=================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBkmrbF-V9gNQiFhEjynULsYjpr5EQWErA",
  authDomain: "studiostore-4bf29.firebaseapp.com",
  projectId: "studiostore-4bf29",
  storageBucket: "studiostore-4bf29.firebasestorage.app",
  messagingSenderId: "693847220052",
  appId: "1:693847220052:web:f2a863bd3bbef1087932c1"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

/* ===================================================
   ★ 관리자 이메일 — 여기에 본인 Gmail 주소 입력 ★
=================================================== */
const ADMIN_EMAILS = [
  "sumin150130@gmail.com"
];

/* ===================================================
   상태
=================================================== */
let productsData = [];
let newsData     = [];
let currentUser  = null;
let isAdmin      = false;
let currentFilter      = "all";
let currentDetailItem  = null;
let orderStatusFilter  = "all";
let newsImageDataURL   = null;   // 뉴스 이미지 (base64 or blob URL)
let newsImageFile      = null;   // 실제 File 객체

/* ===================================================
   카테고리 레이블
=================================================== */
const CAT_LABELS = {
  script:"스크립트", plugin:"플러그인",
  map:"맵", ui:"UI", free:"무료"
};

/* ===================================================
   DOM
=================================================== */
const loginBtn      = document.getElementById("loginBtn");
const logoutBtn     = document.getElementById("logoutBtn");
const userMenu      = document.getElementById("userMenu");
const userAvatar    = document.getElementById("userAvatar");
const userNameEl    = document.getElementById("userName");
const adminPanelBtn = document.getElementById("adminPanelBtn");
const searchInput   = document.getElementById("searchInput");
const productGrid   = document.getElementById("productGrid");
const top4Grid      = document.getElementById("top4Grid");
const gridTitle     = document.getElementById("gridTitle");
const gridCount     = document.getElementById("gridCount");
const emptyState    = document.getElementById("emptyState");

/* ===================================================
   페이지 전환
=================================================== */
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === name);
  });
  if (name === "assets") renderAssetsPage();
  if (name === "news")   renderNewsPage();
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  };
});

/* ===================================================
   AUTH
=================================================== */
const provider = new GoogleAuthProvider();
loginBtn.onclick = () =>
  signInWithPopup(auth, provider).catch(e => showToast("로그인 실패: " + e.message, "error"));
logoutBtn.onclick = () => signOut(auth).then(() => showToast("로그아웃 됐어요!"));

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    isAdmin = ADMIN_EMAILS.includes(user.email);
    loginBtn.style.display = "none";
    userMenu.style.display = "flex";
    if (user.photoURL) userAvatar.src = user.photoURL;
    userNameEl.textContent = user.displayName || user.email.split("@")[0];
    adminPanelBtn.style.display = isAdmin ? "inline-flex" : "none";
  } else {
    isAdmin = false;
    loginBtn.style.display = "inline-block";
    userMenu.style.display = "none";
    adminPanelBtn.style.display = "none";
  }
  renderProducts(filterProducts());
});

/* ===================================================
   상품 불러오기
=================================================== */
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    productsData = [];
    snap.forEach(d => productsData.push({ id: d.id, ...d.data() }));
    renderTop4();
    renderProducts(filterProducts());
  } catch (e) {
    showToast("상품 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   뉴스 불러오기
=================================================== */
async function loadNews() {
  try {
    const snap = await getDocs(collection(db, "news"));
    newsData = [];
    snap.forEach(d => newsData.push({ id: d.id, ...d.data() }));
    newsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("뉴스 로드 오류:", e);
  }
}

/* ===================================================
   필터
=================================================== */
function filterProducts() {
  let data = [...productsData];
  const kw = searchInput.value.toLowerCase();
  if (kw) data = data.filter(p =>
    p.name?.toLowerCase().includes(kw) ||
    p.description?.toLowerCase().includes(kw)
  );

  switch (currentFilter) {
    case "popular":  data.sort((a,b)=>(b.sales||0)-(a.sales||0)); gridTitle.textContent="🔥 인기 에셋"; break;
    case "free":     data=data.filter(p=>!p.price||p.price===0||p.categories?.includes("free")); gridTitle.textContent="🎁 무료 에셋"; break;
    case "lowprice": data.sort((a,b)=>(a.price||0)-(b.price||0)); gridTitle.textContent="↓ 낮은 가격순"; break;
    case "highprice":data.sort((a,b)=>(b.price||0)-(a.price||0)); gridTitle.textContent="↑ 높은 가격순"; break;
    case "script":   data=data.filter(p=>p.categories?.includes("script")||p.category==="script"); gridTitle.textContent="📜 스크립트"; break;
    case "plugin":   data=data.filter(p=>p.categories?.includes("plugin")||p.category==="plugin"); gridTitle.textContent="🔧 플러그인"; break;
    case "map":      data=data.filter(p=>p.categories?.includes("map")||p.category==="map"); gridTitle.textContent="🗺 맵"; break;
    case "ui":       data=data.filter(p=>p.categories?.includes("ui")||p.category==="ui"); gridTitle.textContent="🖼 UI"; break;
    default:         gridTitle.textContent="전체 에셋";
  }
  return data;
}

window.setFilter = (f) => {
  currentFilter = f;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === f));
  renderProducts(filterProducts());
  showPage("store");
};

/* ===================================================
   상품 렌더링
=================================================== */
function renderProducts(data) {
  productGrid.innerHTML = "";
  gridCount.textContent = `총 ${data.length}개의 에셋`;
  emptyState.style.display = data.length === 0 ? "block" : "none";

  data.forEach(item => {
    const card = makeProductCard(item, true);
    productGrid.appendChild(card);
  });
}

/* 에셋 페이지 */
function renderAssetsPage() {
  const grid  = document.getElementById("assetsGrid");
  const empty = document.getElementById("assetsEmpty");
  const count = document.getElementById("assetsCount");
  grid.innerHTML = "";
  count.textContent = `총 ${productsData.length}개의 에셋`;
  empty.style.display = productsData.length === 0 ? "block" : "none";
  productsData.forEach(item => {
    const card = makeProductCard(item, false);
    grid.appendChild(card);
  });
}

/* 카드 생성 공통 함수 */
function makeProductCard(item, showDelete) {
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  const cats   = item.categories || (item.category ? [item.category] : []);
  const catLabel = cats.map(c => CAT_LABELS[c] || c).join(", ") || "에셋";

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${item.image || 'https://placehold.co/400x225/1e2235/00d4ff?text=RSStore'}" alt="${item.name}" loading="lazy">
      <span class="card-category-tag">${catLabel}</span>
      ${isFree ? '<span class="card-free-tag">FREE</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.description || '로블록스 스튜디오 에셋'}</div>
      <div class="card-footer">
        <span class="card-price ${isFree?'free-price':''}">${isFree ? 'FREE' : '₩ '+Number(item.price).toLocaleString()}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="card-sales">${item.sales ? item.sales+' 판매' : ''}</span>
          <button class="btn-buy-card">구매</button>
        </div>
      </div>
    </div>
    ${(showDelete && isAdmin) ? '<button class="deleteBtn" title="삭제">🗑</button>' : ''}
  `;

  card.querySelector(".btn-buy-card").onclick = e => { e.stopPropagation(); openPurchaseModal(item); };
  card.onclick = () => openDetail(item);
  if (showDelete && isAdmin) {
    card.querySelector(".deleteBtn").onclick = e => { e.stopPropagation(); deleteProduct(item.id); };
  }
  return card;
}

/* ===================================================
   TOP 4
=================================================== */
function renderTop4() {
  const top4 = [...productsData].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,4);
  top4Grid.innerHTML = "";
  ["🥇","🥈","🥉","4"].forEach((medal, i) => {
    if (!top4[i]) return;
    const item = top4[i];
    const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
    const el = document.createElement("div");
    el.className = "top4-card";
    el.innerHTML = `
      <span class="top4-rank ${["rank-1","rank-2","rank-3",""][i]}">${medal}</span>
      <img class="top4-img" src="${item.image||'https://placehold.co/52x52/1e2235/00d4ff?text=RS'}" alt="${item.name}">
      <div class="top4-info">
        <div class="top4-name">${item.name}</div>
        <div class="top4-price">${isFree?'FREE':'₩ '+Number(item.price).toLocaleString()}</div>
        <div class="top4-sales">${item.sales ? item.sales+' 판매':'신규'}</div>
      </div>
    `;
    el.onclick = () => openDetail(item);
    top4Grid.appendChild(el);
  });
}

/* ===================================================
   뉴스 페이지 렌더링
=================================================== */
async function renderNewsPage() {
  await loadNews();
  const grid  = document.getElementById("newsGrid");
  const empty = document.getElementById("newsEmpty");
  const count = document.getElementById("newsCount");
  grid.innerHTML = "";
  count.textContent = `총 ${newsData.length}개의 뉴스`;
  empty.style.display = newsData.length === 0 ? "block" : "none";

  newsData.forEach(item => {
    const el = document.createElement("div");
    el.className = "news-card";
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "";
    el.innerHTML = `
      ${item.imageURL ? `<img class="news-card-img" src="${item.imageURL}" alt="${item.title}">` : ''}
      <div class="news-card-body">
        <div class="news-card-date">${date}</div>
        <div class="news-card-title">${item.title}</div>
        <div class="news-card-body-text">${item.body || ''}</div>
      </div>
      ${isAdmin ? `<div class="news-card-footer"><button class="news-delete-btn" data-id="${item.id}">🗑 삭제</button></div>` : ''}
    `;
    el.onclick = () => openNewsModal(item);
    if (isAdmin) {
      el.querySelector(".news-delete-btn").onclick = e => { e.stopPropagation(); deleteNews(item.id); };
    }
    grid.appendChild(el);
  });
}

/* ===================================================
   뉴스 상세 모달
=================================================== */
function openNewsModal(item) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "";
  document.getElementById("newsModalDate").textContent  = date;
  document.getElementById("newsModalTitle").textContent = item.title;
  document.getElementById("newsModalBody").textContent  = item.body || "";
  const img = document.getElementById("newsModalImage");
  if (item.imageURL) { img.src = item.imageURL; img.style.display = "block"; }
  else img.style.display = "none";
  openModal("newsModal");
}

/* ===================================================
   상품 상세 슬라이드 패널
=================================================== */
function openDetail(item) {
  currentDetailItem = item;
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  const cats = item.categories || (item.category ? [item.category] : []);
  const catLabel = cats.map(c => CAT_LABELS[c] || c).join(" · ") || "에셋";

  document.getElementById("detailImage").src = item.image || 'https://placehold.co/440x248/1e2235/00d4ff?text=RSStore';
  document.getElementById("detailCatBadge").textContent = catLabel;
  document.getElementById("detailName").textContent = item.name;
  document.getElementById("detailDesc").textContent = item.description || "로블록스 스튜디오 에셋입니다.";
  document.getElementById("detailPrice").textContent = isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString();
  document.getElementById("detailPrice").style.color = isFree ? "var(--green)" : "var(--accent)";
  document.getElementById("detailSales").textContent = item.sales ? `${item.sales}명 구매` : "";

  document.getElementById("detailPanel").classList.add("active");
  document.getElementById("detailOverlay").classList.add("active");
}

window.closeDetail = () => {
  document.getElementById("detailPanel").classList.remove("active");
  document.getElementById("detailOverlay").classList.remove("active");
};
document.getElementById("detailBuyBtn").onclick = () => {
  if (currentDetailItem) openPurchaseModal(currentDetailItem);
};

/* ===================================================
   구매 모달
=================================================== */
function openPurchaseModal(item) {
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  document.getElementById("purchaseProductName").textContent = item.name;
  document.getElementById("purchasePrice").textContent = isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString();
  document.getElementById("buyerDiscord").value = "";
  document.getElementById("buyerPhone").value   = "";
  document.getElementById("modalBuy").dataset.id    = item.id;
  document.getElementById("modalBuy").dataset.name  = item.name;
  document.getElementById("modalBuy").dataset.price = item.price || 0;
  openModal("purchaseModal");
}

document.getElementById("modalBuy").onclick = async () => {
  if (!currentUser) { showToast("구매하려면 로그인이 필요해요!", "error"); return; }
  const discord = document.getElementById("buyerDiscord").value.trim();
  const phone   = document.getElementById("buyerPhone").value.trim();
  if (!discord && !phone) { showToast("디스코드 ID 또는 전화번호 중 하나는 필수예요!", "error"); return; }

  const btn = document.getElementById("modalBuy");
  btn.textContent = "처리 중…"; btn.disabled = true;

  try {
    await addDoc(collection(db, "orders"), {
      productId:   btn.dataset.id,
      productName: btn.dataset.name,
      price:       Number(btn.dataset.price),
      buyerEmail:  currentUser.email,
      buyerName:   currentUser.displayName || currentUser.email,
      discord:     discord || "",
      phone:       phone   || "",
      status:      "pending",
      createdAt:   new Date().toISOString()
    });
    await updateDoc(doc(db, "products", btn.dataset.id), { sales: increment(1) });
    showToast("✅ 구매 요청 완료! 곧 연락드릴게요.", "success");
    closeModal("purchaseModal");
    loadProducts();
  } catch (e) {
    showToast("구매 요청 실패: " + e.message, "error");
  } finally {
    btn.textContent = "✅ 구매 요청하기"; btn.disabled = false;
  }
};

/* ===================================================
   관리자 패널
=================================================== */
adminPanelBtn.onclick = () => {
  openModal("adminPanel");
  switchAdminTab("addProduct");
};

document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.onclick = () => {
    const t = tab.dataset.tab;
    document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + t).classList.add("active");
    if (t === "orderList")     loadOrders();
    if (t === "manageProduct") loadManageProducts();
  };
});

function switchAdminTab(name) {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-"+name));
}

/* 이미지 URL 미리보기 */
document.getElementById("adminImage").oninput = () => {
  const url = document.getElementById("adminImage").value.trim();
  const preview = document.getElementById("imagePreview");
  const img     = document.getElementById("previewImg");
  if (url) {
    img.src = url; preview.style.display = "block";
    img.onerror = () => preview.style.display = "none";
  } else { preview.style.display = "none"; }
};

/* ===================================================
   상품 등록
=================================================== */
document.getElementById("adminUpload").onclick = async () => {
  const name  = document.getElementById("adminName").value.trim();
  const price = Number(document.getElementById("adminPrice").value) || 0;
  const image = document.getElementById("adminImage").value.trim();
  const desc  = document.getElementById("adminDesc").value.trim();

  // 체크박스로 카테고리 수집
  const checkedCats = [...document.querySelectorAll(".cat-checkbox-group input:checked")].map(cb => cb.value);

  const status = document.getElementById("uploadStatus");

  if (!name) { setStatus(status, "제목을 입력해주세요!", "error"); return; }
  if (checkedCats.length === 0) { setStatus(status, "카테고리를 하나 이상 선택해주세요!", "error"); return; }

  const btn = document.getElementById("adminUpload");
  btn.disabled = true; btn.textContent = "등록 중…";
  setStatus(status, "등록 중…", "loading");

  try {
    // 가격이 0이거나 "free" 카테고리 선택 시 자동으로 free 추가
    const isFree = price === 0 || checkedCats.includes("free");
    if (isFree && !checkedCats.includes("free")) checkedCats.push("free");

    await addDoc(collection(db, "products"), {
      name,
      price,
      image: image || "",
      description: desc,
      categories:  checkedCats,
      category:    checkedCats[0], // 하위 호환용
      sales:    0,
      createdAt: new Date().toISOString()
    });

    setStatus(status, "✅ 상품이 등록됐어요!", "success");
    showToast("✅ 상품 등록 완료!", "success");

    // 폼 초기화
    document.getElementById("adminName").value = "";
    document.getElementById("adminPrice").value = "";
    document.getElementById("adminImage").value = "";
    document.getElementById("adminDesc").value = "";
    document.querySelectorAll(".cat-checkbox-group input").forEach(cb => cb.checked = false);
    document.getElementById("imagePreview").style.display = "none";

    await loadProducts();
  } catch (e) {
    setStatus(status, "오류: " + e.message, "error");
    showToast("등록 실패: " + e.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "✅ 상품 등록하기";
  }
};

/* ===================================================
   상품 관리 (관리자 탭)
=================================================== */
async function loadManageProducts() {
  const list = document.getElementById("manageProductList");
  list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">불러오는 중…</p>';
  await loadProducts();

  if (productsData.length === 0) {
    list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">등록된 상품이 없어요.</p>';
    return;
  }

  list.innerHTML = "";
  productsData.forEach(item => {
    const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
    const cats   = item.categories || (item.category ? [item.category] : []);
    const el = document.createElement("div");
    el.className = "manage-item";
    el.innerHTML = `
      <img class="manage-item-img" src="${item.image || 'https://placehold.co/56x40/1e2235/00d4ff?text=RS'}" alt="">
      <div class="manage-item-info">
        <div class="manage-item-name">${item.name}</div>
        <div class="manage-item-meta">
          ${cats.map(c => CAT_LABELS[c] || c).join(", ")} &nbsp;|&nbsp;
          ${isFree ? 'FREE' : '₩ ' + Number(item.price).toLocaleString()} &nbsp;|&nbsp;
          ${item.sales || 0}판매
        </div>
      </div>
      <div class="manage-item-actions">
        <button class="btn-item-delete">🗑 삭제</button>
      </div>
    `;
    el.querySelector(".btn-item-delete").onclick = async () => {
      await deleteProduct(item.id);
      loadManageProducts();
    };
    list.appendChild(el);
  });
}

/* ===================================================
   상품 삭제
=================================================== */
async function deleteProduct(id) {
  if (!confirm("정말 이 상품을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    showToast("🗑 삭제됐어요.", "success");
    await loadProducts();
    renderProducts(filterProducts());
  } catch (e) {
    showToast("삭제 실패: " + e.message, "error");
  }
}

/* ===================================================
   구매 목록
=================================================== */
async function loadOrders() {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:30px;">불러오는 중…</p>';
  try {
    const snap = await getDocs(collection(db, "orders"));
    let orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filtered = orderStatusFilter === "all" ? orders : orders.filter(o => o.status === orderStatusFilter);
    if (filtered.length === 0) {
      orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">구매 요청이 없어요.</p>';
      return;
    }
    orderList.innerHTML = "";
    filtered.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleString("ko-KR") : "";
      const contacts = [
        order.discord ? `💬 ${order.discord}` : null,
        order.phone   ? `📱 ${order.phone}`   : null
      ].filter(Boolean).join("  |  ");

      const el = document.createElement("div");
      el.className = "order-item";
      el.innerHTML = `
        <div class="order-item-header">
          <span class="order-product">${order.productName}</span>
          <span class="order-status ${order.status==='done'?'done':'pending'}">${order.status==='done'?'✅ 완료':'⏳ 대기 중'}</span>
        </div>
        <div class="order-contact">${contacts}</div>
        <div class="order-detail">
          👤 ${order.buyerName||order.buyerEmail} &nbsp;|&nbsp;
          💰 ${order.price===0?'FREE':'₩ '+Number(order.price).toLocaleString()} &nbsp;|&nbsp;
          📅 ${date}
        </div>
        ${order.status!=='done' ? `<button class="btn-done" data-id="${order.id}">✅ 완료 처리</button>` : ''}
      `;
      if (order.status !== 'done') {
        el.querySelector(".btn-done").onclick = async (e) => {
          const b = e.currentTarget; b.disabled=true; b.textContent="처리 중…";
          try {
            await updateDoc(doc(db,"orders",order.id),{status:"done"});
            showToast("✅ 완료 처리됐어요!","success");
            loadOrders();
          } catch(err) { showToast("오류: "+err.message,"error"); b.disabled=false; b.textContent="✅ 완료 처리"; }
        };
      }
      orderList.appendChild(el);
    });
  } catch (e) {
    orderList.innerHTML = `<p style="color:var(--red);text-align:center;">오류: ${e.message}</p>`;
  }
}

document.querySelectorAll(".order-filter-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".order-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    orderStatusFilter = btn.dataset.status;
    loadOrders();
  };
});

/* ===================================================
   뉴스 추가 (파일 업로드)
=================================================== */
const newsFileInput = document.getElementById("newsImageFile");
const newsFileArea  = document.getElementById("newsFileArea");

// 파일 선택
newsFileInput.onchange = (e) => handleNewsFile(e.target.files[0]);

// 드래그 앤 드롭
newsFileArea.ondragover  = (e) => { e.preventDefault(); newsFileArea.style.borderColor="var(--accent)"; };
newsFileArea.ondragleave = ()  => { newsFileArea.style.borderColor=""; };
newsFileArea.ondrop = (e) => {
  e.preventDefault(); newsFileArea.style.borderColor="";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleNewsFile(file);
  else showToast("이미지 파일만 업로드할 수 있어요!", "error");
};

function handleNewsFile(file) {
  if (!file) return;
  newsImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    newsImageDataURL = e.target.result;
    document.getElementById("newsPreviewImg").src = newsImageDataURL;
    document.getElementById("newsImagePreview").style.display = "block";
    document.getElementById("newsFileUI").style.display = "none";
  };
  reader.readAsDataURL(file);
}

document.getElementById("removeNewsImg").onclick = () => {
  newsImageFile    = null;
  newsImageDataURL = null;
  document.getElementById("newsImagePreview").style.display = "none";
  document.getElementById("newsFileUI").style.display = "block";
  newsFileInput.value = "";
};

document.getElementById("newsUpload").onclick = async () => {
  const title = document.getElementById("newsTitle").value.trim();
  const body  = document.getElementById("newsBody").value.trim();
  const status = document.getElementById("newsUploadStatus");

  if (!title) { setStatus(status, "제목을 입력해주세요!", "error"); return; }
  if (!body)  { setStatus(status, "내용을 입력해주세요!", "error"); return; }

  const btn = document.getElementById("newsUpload");
  btn.disabled = true; btn.textContent = "등록 중…";
  setStatus(status, "등록 중…", "loading");

  try {
    let imageURL = "";

    // 이미지가 있으면 Firebase Storage에 업로드
    if (newsImageFile) {
      setStatus(status, "이미지 업로드 중…", "loading");
      const storageRef = ref(storage, `news/${Date.now()}_${newsImageFile.name}`);
      const snapshot   = await uploadBytes(storageRef, newsImageFile);
      imageURL         = await getDownloadURL(snapshot.ref);
    }

    await addDoc(collection(db, "news"), {
      title, body, imageURL,
      createdAt: new Date().toISOString()
    });

    setStatus(status, "✅ 뉴스가 등록됐어요!", "success");
    showToast("📰 뉴스 등록 완료!", "success");

    // 폼 초기화
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsBody").value  = "";
    document.getElementById("removeNewsImg").click();

    await loadNews();
  } catch (e) {
    setStatus(status, "오류: " + e.message, "error");
    showToast("뉴스 등록 실패: " + e.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "📰 뉴스 등록하기";
  }
};

/* ===================================================
   뉴스 삭제
=================================================== */
async function deleteNews(id) {
  if (!confirm("정말 이 뉴스를 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "news", id));
    showToast("🗑 뉴스가 삭제됐어요.", "success");
    renderNewsPage();
  } catch (e) {
    showToast("삭제 실패: " + e.message, "error");
  }
}

/* ===================================================
   카테고리 버튼
=================================================== */
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProducts(filterProducts());
  };
});

searchInput.oninput = () => renderProducts(filterProducts());

/* ===================================================
   히어로 슬라이더
=================================================== */
let currentSlide = 0;
const totalSlides = 3;
const slidesWrapper = document.getElementById("slidesWrapper");

function goSlide(n) {
  currentSlide = n;
  slidesWrapper.style.transform = `translateX(-${n*100}%)`;
  document.querySelectorAll(".dot").forEach((d,i) => d.classList.toggle("active",i===n));
}
window.goSlide   = goSlide;
window.nextSlide = () => goSlide((currentSlide+1) % totalSlides);
window.prevSlide = () => goSlide((currentSlide-1+totalSlides) % totalSlides);
setInterval(() => window.nextSlide(), 5000);

/* ===================================================
   테마 토글
=================================================== */
let isDark = true;
document.getElementById("themeToggle").onclick = () => {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark?"dark":"light");
  document.getElementById("themeToggle").textContent = isDark ? "🌙" : "☀️";
};

/* ===================================================
   모달 & 유틸
=================================================== */
function openModal(id)  { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }
window.closeModal = closeModal;

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));
    closeDetail();
  }
});

function setStatus(el, msg, type) {
  el.textContent = msg;
  el.className   = "upload-status " + type;
  if (type === "success") setTimeout(() => el.textContent="", 4000);
}

let toastTimer;
function showToast(msg, type="") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ===================================================
   초기화
=================================================== */
loadProducts();
loadNews();
