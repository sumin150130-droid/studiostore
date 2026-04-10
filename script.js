import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// ===== FIREBASE CONFIG =====
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

// ===== ADMIN UIDS (파이어베이스 UID를 여기에 추가) =====
const ADMIN_UIDS = ["REPLACE_WITH_YOUR_UID"];

// ===== DOM REFS =====
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const userMenu = document.getElementById("userMenu");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const adminPanelBtn = document.getElementById("adminPanelBtn");
const searchInput = document.getElementById("searchInput");
const productGrid = document.getElementById("productGrid");
const top4Grid = document.getElementById("top4Grid");
const gridTitle = document.getElementById("gridTitle");
const gridCount = document.getElementById("gridCount");
const emptyState = document.getElementById("emptyState");

// ===== STATE =====
let productsData = [];
let currentUser = null;
let isAdmin = false;
let currentFilter = "all";

// ===== AUTH =====
const provider = new GoogleAuthProvider();

loginBtn.onclick = () =>
  signInWithPopup(auth, provider).catch(err => showToast("로그인 실패: " + err.message, "error"));

logoutBtn.onclick = () => signOut(auth).then(() => showToast("로그아웃 되었어요!"));

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    isAdmin = ADMIN_UIDS.includes(user.uid);
    loginBtn.style.display = "none";
    userMenu.style.display = "flex";
    if (user.photoURL) userAvatar.src = user.photoURL;
    userName.textContent = user.displayName || user.email.split("@")[0];
    if (isAdmin) adminPanelBtn.style.display = "inline-flex";
    showToast(`👋 ${user.displayName || "유저"}님 환영해요!`, "success");
  } else {
    isAdmin = false;
    loginBtn.style.display = "inline-block";
    userMenu.style.display = "none";
    adminPanelBtn.style.display = "none";
  }
  renderProducts(filterProducts());
});

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    productsData = [];
    snap.forEach(d => productsData.push({ id: d.id, ...d.data() }));
    renderTop4();
    renderProducts(filterProducts());
  } catch (err) {
    showToast("상품 로드 실패: " + err.message, "error");
  }
}

// ===== FILTER =====
function filterProducts() {
  let data = [...productsData];
  const keyword = searchInput.value.toLowerCase();
  if (keyword) data = data.filter(p => p.name?.toLowerCase().includes(keyword));

  switch (currentFilter) {
    case "popular":
      data.sort((a, b) => (b.sales || 0) - (a.sales || 0));
      gridTitle.textContent = "🔥 인기 에셋";
      break;
    case "free":
      data = data.filter(p => !p.price || p.price === 0);
      gridTitle.textContent = "🎁 무료 에셋";
      break;
    case "lowprice":
      data.sort((a, b) => (a.price || 0) - (b.price || 0));
      gridTitle.textContent = "↓ 낮은 가격순";
      break;
    case "highprice":
      data.sort((a, b) => (b.price || 0) - (a.price || 0));
      gridTitle.textContent = "↑ 높은 가격순";
      break;
    case "script":
      data = data.filter(p => p.category === "script");
      gridTitle.textContent = "📜 스크립트";
      break;
    case "plugin":
      data = data.filter(p => p.category === "plugin");
      gridTitle.textContent = "🔧 플러그인";
      break;
    case "map":
      data = data.filter(p => p.category === "map");
      gridTitle.textContent = "🗺 맵";
      break;
    case "ui":
      data = data.filter(p => p.category === "ui");
      gridTitle.textContent = "🖼 UI";
      break;
    default:
      gridTitle.textContent = "전체 에셋";
  }
  return data;
}

// ===== RENDER PRODUCTS =====
function renderProducts(data) {
  productGrid.innerHTML = "";
  gridCount.textContent = `총 ${data.length}개의 에셋`;

  if (data.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  data.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${i * 0.04}s`;

    const isFree = !item.price || item.price === 0;
    const categoryLabel = {
      script: "스크립트", plugin: "플러그인", map: "맵", ui: "UI"
    }[item.category] || "에셋";

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.image || 'https://placehold.co/400x225/1e2235/00d4ff?text=RSStore'}" alt="${item.name}" loading="lazy">
        <span class="card-category-tag">${categoryLabel}</span>
        ${isFree ? '<span class="card-free-tag">FREE</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-desc">${item.description || '로블록스 스튜디오 에셋'}</div>
        <div class="card-footer">
          <span class="card-price ${isFree ? 'free-price' : ''}">${isFree ? 'FREE' : '₩ ' + Number(item.price).toLocaleString()}</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="card-sales">${item.sales ? item.sales + ' 판매' : ''}</span>
            <button class="btn-buy-card">구매</button>
          </div>
        </div>
      </div>
      ${isAdmin ? `<button class="deleteBtn" title="삭제">🗑</button>` : ''}
    `;

    card.querySelector(".btn-buy-card").onclick = (e) => {
      e.stopPropagation();
      openProductModal(item);
    };

    card.onclick = () => openProductModal(item);

    if (isAdmin) {
      card.querySelector(".deleteBtn").onclick = (e) => {
        e.stopPropagation();
        deleteProduct(item.id);
      };
    }

    productGrid.appendChild(card);
  });
}

// ===== RENDER TOP 4 =====
function renderTop4() {
  const top4 = [...productsData]
    .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 4);

  top4Grid.innerHTML = "";
  const medals = ["🥇", "🥈", "🥉", "4"];
  const rankClasses = ["rank-1", "rank-2", "rank-3", ""];

  top4.forEach((item, i) => {
    const isFree = !item.price || item.price === 0;
    const card = document.createElement("div");
    card.className = "top4-card";
    card.innerHTML = `
      <span class="top4-rank ${rankClasses[i]}">${medals[i]}</span>
      <img class="top4-img" src="${item.image || 'https://placehold.co/52x52/1e2235/00d4ff?text=RS'}" alt="${item.name}">
      <div class="top4-info">
        <div class="top4-name">${item.name}</div>
        <div class="top4-price">${isFree ? 'FREE' : '₩ ' + Number(item.price).toLocaleString()}</div>
        <div class="top4-sales">${item.sales ? item.sales + ' 판매' : '신규'}</div>
      </div>
    `;
    card.onclick = () => openProductModal(item);
    top4Grid.appendChild(card);
  });
}

// ===== PRODUCT MODAL =====
function openProductModal(item) {
  const isFree = !item.price || item.price === 0;
  const categoryLabel = { script: "스크립트", plugin: "플러그인", map: "맵", ui: "UI" }[item.category] || "에셋";

  document.getElementById("modalImage").src = item.image || 'https://placehold.co/480x270/1e2235/00d4ff?text=RSStore';
  document.getElementById("modalBadge").textContent = categoryLabel;
  document.getElementById("modalName").textContent = item.name;
  document.getElementById("modalPrice").textContent = isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString();
  document.getElementById("modalSales").textContent = item.sales ? `${item.sales}명 구매` : "";
  document.getElementById("modalBuy").dataset.id = item.id;
  document.getElementById("modalBuy").dataset.name = item.name;
  document.getElementById("modalBuy").dataset.price = item.price || 0;

  const desc = document.getElementById("modalPrice").closest(".modal-body");
  const descEl = document.getElementById("modalDesc") || document.createElement("p");
  descEl.id = "modalDesc";
  descEl.className = "modal-desc";
  descEl.textContent = item.description || "로블록스 스튜디오 에셋입니다.";

  openModal("productModal");
}

document.getElementById("modalBuy").onclick = async () => {
  if (!currentUser) {
    showToast("구매하려면 로그인이 필요해요!", "error");
    closeModal("productModal");
    return;
  }

  const phone = document.getElementById("buyerPhone").value.trim();
  const discord = document.getElementById("buyerDiscord").value.trim();

  if (!phone || !discord) {
    showToast("전화번호와 디스코드 ID를 입력해주세요!", "error");
    return;
  }

  const btn = document.getElementById("modalBuy");
  btn.textContent = "처리 중…";
  btn.disabled = true;

  try {
    await addDoc(collection(db, "orders"), {
      productId: btn.dataset.id,
      productName: btn.dataset.name,
      price: Number(btn.dataset.price),
      buyerEmail: currentUser.email,
      buyerName: currentUser.displayName,
      phone,
      discord,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    // 판매 수 증가
    await updateDoc(doc(db, "products", btn.dataset.id), {
      sales: increment(1)
    });

    showToast("✅ 구매 요청이 접수됐어요! 디스코드로 연락드릴게요.", "success");
    closeModal("productModal");
    document.getElementById("buyerPhone").value = "";
    document.getElementById("buyerDiscord").value = "";
    loadProducts();
  } catch (err) {
    showToast("구매 요청 실패: " + err.message, "error");
  } finally {
    btn.textContent = "🛒 구매 요청하기";
    btn.disabled = false;
  }
};

// ===== ADMIN PANEL =====
adminPanelBtn.onclick = async () => {
  openModal("adminPanel");
  await loadOrders();
};

document.getElementById("openAddProduct").onclick = () => {
  closeModal("adminPanel");
  openModal("adminModal");
};

async function loadOrders() {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = '<p style="color:var(--text3);font-size:13px;">불러오는 중…</p>';
  try {
    const snap = await getDocs(collection(db, "orders"));
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (orders.length === 0) {
      orderList.innerHTML = '<p style="color:var(--text3);font-size:13px;text-align:center;padding:20px;">구매 요청이 없어요.</p>';
      return;
    }

    orderList.innerHTML = "";
    orders.forEach(order => {
      const el = document.createElement("div");
      el.className = "order-item";
      const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString("ko-KR") : "";
      el.innerHTML = `
        <div class="order-item-header">
          <span class="order-product">${order.productName}</span>
          <span class="order-status ${order.status === 'done' ? 'done' : 'pending'}">
            ${order.status === 'done' ? '✅ 완료' : '⏳ 대기 중'}
          </span>
        </div>
        <div class="order-detail">
          👤 ${order.buyerName || order.buyerEmail} &nbsp;|&nbsp;
          📱 ${order.phone} &nbsp;|&nbsp;
          💬 ${order.discord} &nbsp;|&nbsp;
          💰 ${order.price === 0 ? 'FREE' : '₩ ' + Number(order.price).toLocaleString()} &nbsp;|&nbsp;
          📅 ${date}
        </div>
        ${order.status !== 'done' ? `<button class="btn-admin-action" style="margin-top:10px;font-size:11px;padding:5px 12px;" onclick="markDone('${order.id}', this)">완료 처리</button>` : ''}
      `;
      orderList.appendChild(el);
    });
  } catch (err) {
    orderList.innerHTML = `<p style="color:var(--red);">오류: ${err.message}</p>`;
  }
}

window.markDone = async (orderId, btn) => {
  try {
    await updateDoc(doc(db, "orders", orderId), { status: "done" });
    showToast("✅ 완료 처리됐어요!", "success");
    await loadOrders();
  } catch (err) {
    showToast("오류: " + err.message, "error");
  }
};

// ===== ADD PRODUCT =====
document.getElementById("adminUpload").onclick = async () => {
  const name = document.getElementById("adminName").value.trim();
  const price = Number(document.getElementById("adminPrice").value);
  const image = document.getElementById("adminImage").value.trim();
  const desc = document.getElementById("adminDesc").value.trim();
  const category = document.getElementById("adminCategory").value;

  if (!name) { showToast("상품 이름을 입력해주세요!", "error"); return; }

  try {
    await addDoc(collection(db, "products"), {
      name, price, image, description: desc, category,
      sales: 0,
      createdAt: new Date().toISOString()
    });
    showToast("✅ 상품이 등록됐어요!", "success");
    closeModal("adminModal");
    ["adminName","adminPrice","adminImage","adminDesc"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("adminCategory").value = "";
    loadProducts();
  } catch (err) {
    showToast("등록 실패: " + err.message, "error");
  }
};

// ===== DELETE PRODUCT =====
async function deleteProduct(id) {
  if (!confirm("정말 이 상품을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    showToast("🗑 상품이 삭제됐어요.", "success");
    loadProducts();
  } catch (err) {
    showToast("삭제 실패: " + err.message, "error");
  }
}

// ===== CATEGORY BUTTONS =====
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProducts(filterProducts());
  };
});

// ===== SEARCH =====
searchInput.oninput = () => renderProducts(filterProducts());

// ===== HERO SLIDER =====
let currentSlide = 0;
const totalSlides = 3;
const wrapper = document.getElementById("slidesWrapper");

function goSlide(n) {
  currentSlide = n;
  wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
  document.querySelectorAll(".dot").forEach((d, i) => {
    d.classList.toggle("active", i === currentSlide);
  });
}

window.goSlide = goSlide;
window.nextSlide = () => goSlide((currentSlide + 1) % totalSlides);
window.prevSlide = () => goSlide((currentSlide - 1 + totalSlides) % totalSlides);

// Auto-advance slider
setInterval(() => window.nextSlide(), 5000);

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById("themeToggle");
let isDark = true;

themeToggle.onclick = () => {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "🌙" : "☀️";
};

// ===== MODAL HELPERS =====
function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

window.closeModal = closeModal;

// Close modal on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal.active").forEach(m => m.classList.remove("active"));
  }
});

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// ===== INIT =====
loadProducts();
