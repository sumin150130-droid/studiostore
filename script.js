import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc,
  doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===================================================
   ★ 관리자 이메일 목록 — 여기에 본인 이메일 추가 ★
=================================================== */
const ADMIN_EMAILS = [
  "sumin150130@gmail.com"
  // 여러 명: "admin2@gmail.com"
];

/* ===================================================
   상태
=================================================== */
let productsData = [];
let currentUser = null;
let isAdmin = false;
let currentFilter = "all";
let currentDetailItem = null; // 상세 패널에 열린 상품
let orderStatusFilter = "all";

/* ===================================================
   DOM 참조
=================================================== */
const loginBtn        = document.getElementById("loginBtn");
const logoutBtn       = document.getElementById("logoutBtn");
const userMenu        = document.getElementById("userMenu");
const userAvatar      = document.getElementById("userAvatar");
const userName        = document.getElementById("userName");
const adminPanelBtn   = document.getElementById("adminPanelBtn");
const searchInput     = document.getElementById("searchInput");
const productGrid     = document.getElementById("productGrid");
const top4Grid        = document.getElementById("top4Grid");
const gridTitle       = document.getElementById("gridTitle");
const gridCount       = document.getElementById("gridCount");
const emptyState      = document.getElementById("emptyState");

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
    userName.textContent = user.displayName || user.email.split("@")[0];
    // 관리자만 버튼 표시
    adminPanelBtn.style.display = isAdmin ? "inline-flex" : "none";
    showToast(`👋 ${user.displayName || "유저"}님 환영해요!`, "success");
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
   필터 & 정렬
=================================================== */
const CAT_LABELS = { script:"스크립트", plugin:"플러그인", map:"맵", ui:"UI" };

function filterProducts() {
  let data = [...productsData];
  const kw = searchInput.value.toLowerCase();
  if (kw) data = data.filter(p => p.name?.toLowerCase().includes(kw) || p.description?.toLowerCase().includes(kw));

  switch (currentFilter) {
    case "popular":  data.sort((a,b)=>(b.sales||0)-(a.sales||0)); gridTitle.textContent="🔥 인기 에셋"; break;
    case "free":     data=data.filter(p=>!p.price||p.price===0); gridTitle.textContent="🎁 무료 에셋"; break;
    case "lowprice": data.sort((a,b)=>(a.price||0)-(b.price||0)); gridTitle.textContent="↓ 낮은 가격순"; break;
    case "highprice":data.sort((a,b)=>(b.price||0)-(a.price||0)); gridTitle.textContent="↑ 높은 가격순"; break;
    case "script":   data=data.filter(p=>p.category==="script"); gridTitle.textContent="📜 스크립트"; break;
    case "plugin":   data=data.filter(p=>p.category==="plugin"); gridTitle.textContent="🔧 플러그인"; break;
    case "map":      data=data.filter(p=>p.category==="map"); gridTitle.textContent="🗺 맵"; break;
    case "ui":       data=data.filter(p=>p.category==="ui"); gridTitle.textContent="🖼 UI"; break;
    default:         gridTitle.textContent="전체 에셋";
  }
  return data;
}

/* ===================================================
   상품 렌더링
=================================================== */
function renderProducts(data) {
  productGrid.innerHTML = "";
  gridCount.textContent = `총 ${data.length}개의 에셋`;
  emptyState.style.display = data.length === 0 ? "block" : "none";

  data.forEach(item => {
    const isFree = !item.price || item.price === 0;
    const catLabel = CAT_LABELS[item.category] || "에셋";
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
      ${isAdmin ? '<button class="deleteBtn" title="삭제">🗑</button>' : ''}
    `;

    // 카드 클릭 → 상세 패널 오픈
    card.onclick = () => openDetail(item);
    // 구매 버튼 클릭 → 바로 구매 모달
    card.querySelector(".btn-buy-card").onclick = e => { e.stopPropagation(); openPurchaseModal(item); };
    // 삭제 버튼 (관리자만)
    if (isAdmin) {
      card.querySelector(".deleteBtn").onclick = e => { e.stopPropagation(); deleteProduct(item.id); };
    }
    productGrid.appendChild(card);
  });
}

/* ===================================================
   TOP 4
=================================================== */
function renderTop4() {
  const top4 = [...productsData].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,4);
  top4Grid.innerHTML = "";
  const medals = ["🥇","🥈","🥉","4"];
  const rankCls = ["rank-1","rank-2","rank-3",""];
  top4.forEach((item,i) => {
    const isFree = !item.price || item.price === 0;
    const el = document.createElement("div");
    el.className = "top4-card";
    el.innerHTML = `
      <span class="top4-rank ${rankCls[i]}">${medals[i]}</span>
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
   상품 상세 슬라이드 패널
=================================================== */
function openDetail(item) {
  currentDetailItem = item;
  const isFree = !item.price || item.price === 0;
  const catLabel = CAT_LABELS[item.category] || "에셋";

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

// 상세 패널 내 구매 버튼
document.getElementById("detailBuyBtn").onclick = () => {
  if (currentDetailItem) openPurchaseModal(currentDetailItem);
};

/* ===================================================
   구매 모달
=================================================== */
function openPurchaseModal(item) {
  const isFree = !item.price || item.price === 0;
  document.getElementById("purchaseProductName").textContent = item.name;
  document.getElementById("purchasePrice").textContent = isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString();
  document.getElementById("buyerDiscord").value = "";
  document.getElementById("buyerPhone").value = "";
  document.getElementById("modalBuy").dataset.id = item.id;
  document.getElementById("modalBuy").dataset.name = item.name;
  document.getElementById("modalBuy").dataset.price = item.price || 0;
  openModal("purchaseModal");
}

document.getElementById("modalBuy").onclick = async () => {
  if (!currentUser) {
    showToast("구매하려면 로그인이 필요해요!", "error");
    return;
  }
  const discord = document.getElementById("buyerDiscord").value.trim();
  const phone   = document.getElementById("buyerPhone").value.trim();

  // 하나만 입력해도 됨
  if (!discord && !phone) {
    showToast("디스코드 ID 또는 전화번호 중 하나는 필수예요!", "error");
    return;
  }

  const btn = document.getElementById("modalBuy");
  btn.textContent = "처리 중…";
  btn.disabled = true;

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
    btn.textContent = "✅ 구매 요청하기";
    btn.disabled = false;
  }
};

/* ===================================================
   관리자 패널
=================================================== */
adminPanelBtn.onclick = () => {
  openModal("adminPanel");
  switchAdminTab("addProduct");
  loadOrders();
};

// 탭 전환
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.onclick = () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + target).classList.add("active");
    if (target === "orderList") loadOrders();
  };
});

function switchAdminTab(tabName) {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-"+tabName));
}

// 이미지 URL 미리보기
document.getElementById("adminImage").oninput = () => {
  const url = document.getElementById("adminImage").value.trim();
  const preview = document.getElementById("imagePreview");
  const img = document.getElementById("previewImg");
  if (url) {
    img.src = url;
    preview.style.display = "block";
    img.onerror = () => { preview.style.display = "none"; };
  } else {
    preview.style.display = "none";
  }
};

// 상품 등록
document.getElementById("adminUpload").onclick = async () => {
  const name     = document.getElementById("adminName").value.trim();
  const price    = Number(document.getElementById("adminPrice").value) || 0;
  const image    = document.getElementById("adminImage").value.trim();
  const desc     = document.getElementById("adminDesc").value.trim();
  const category = document.getElementById("adminCategory").value;

  if (!name)     { showToast("제목을 입력해주세요!", "error"); return; }
  if (!category) { showToast("카테고리를 선택해주세요!", "error"); return; }

  const btn = document.getElementById("adminUpload");
  btn.textContent = "등록 중…";
  btn.disabled = true;

  try {
    await addDoc(collection(db, "products"), {
      name, price, image, description: desc, category,
      sales: 0,
      createdAt: new Date().toISOString()
    });
    showToast("✅ 상품이 등록됐어요!", "success");
    ["adminName","adminPrice","adminImage","adminDesc"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("adminCategory").value = "";
    document.getElementById("imagePreview").style.display = "none";
    loadProducts();
  } catch (e) {
    showToast("등록 실패: " + e.message, "error");
  } finally {
    btn.textContent = "✅ 상품 등록하기";
    btn.disabled = false;
  }
};

// 상품 삭제
async function deleteProduct(id) {
  if (!confirm("정말 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    showToast("🗑 삭제됐어요.", "success");
    loadProducts();
  } catch (e) {
    showToast("삭제 실패: " + e.message, "error");
  }
}

/* ===================================================
   구매 목록 불러오기
=================================================== */
async function loadOrders() {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:30px;">불러오는 중…</p>';

  try {
    const snap = await getDocs(collection(db, "orders"));
    let orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 필터
    const filtered = orderStatusFilter === "all" ? orders : orders.filter(o => o.status === orderStatusFilter);

    if (filtered.length === 0) {
      orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">구매 요청이 없어요.</p>';
      return;
    }

    orderList.innerHTML = "";
    filtered.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleString("ko-KR") : "";
      const contactLine = [
        order.discord ? `💬 ${order.discord}` : null,
        order.phone   ? `📱 ${order.phone}`   : null
      ].filter(Boolean).join(" &nbsp;|&nbsp; ");

      const el = document.createElement("div");
      el.className = "order-item";
      el.innerHTML = `
        <div class="order-item-header">
          <span class="order-product">${order.productName}</span>
          <span class="order-status ${order.status === 'done' ? 'done' : 'pending'}">
            ${order.status === 'done' ? '✅ 완료' : '⏳ 대기 중'}
          </span>
        </div>
        <div class="order-contact">${contactLine}</div>
        <div class="order-detail">
          👤 ${order.buyerName || order.buyerEmail} &nbsp;|&nbsp;
          💰 ${order.price === 0 ? 'FREE' : '₩ '+Number(order.price).toLocaleString()} &nbsp;|&nbsp;
          📅 ${date}
        </div>
        ${order.status !== 'done' ? `<button class="btn-done" data-id="${order.id}">✅ 완료 처리</button>` : ''}
      `;

      if (order.status !== 'done') {
        el.querySelector(".btn-done").onclick = async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true; btn.textContent = "처리 중…";
          try {
            await updateDoc(doc(db, "orders", order.id), { status: "done" });
            showToast("✅ 완료 처리됐어요!", "success");
            loadOrders();
          } catch (err) {
            showToast("오류: " + err.message, "error");
            btn.disabled = false; btn.textContent = "✅ 완료 처리";
          }
        };
      }

      orderList.appendChild(el);
    });
  } catch (e) {
    orderList.innerHTML = `<p style="color:var(--red);text-align:center;">오류: ${e.message}</p>`;
  }
}

// 구매 목록 상태 필터
document.querySelectorAll(".order-filter-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".order-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    orderStatusFilter = btn.dataset.status;
    loadOrders();
  };
});

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
  slidesWrapper.style.transform = `translateX(-${n * 100}%)`;
  document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === n));
}
window.goSlide  = goSlide;
window.nextSlide = () => goSlide((currentSlide + 1) % totalSlides);
window.prevSlide = () => goSlide((currentSlide - 1 + totalSlides) % totalSlides);
setInterval(() => window.nextSlide(), 5000);

/* ===================================================
   테마 토글
=================================================== */
let isDark = true;
document.getElementById("themeToggle").onclick = () => {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.getElementById("themeToggle").textContent = isDark ? "🌙" : "☀️";
};

/* ===================================================
   모달 헬퍼
=================================================== */
function openModal(id) { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }
window.closeModal = closeModal;

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));
    closeDetail();
  }
});

/* ===================================================
   토스트
=================================================== */
let toastTimer;
function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ===================================================
   초기화
=================================================== */
loadProducts();
