/**
 * RSStore — Firebase 연동 (Compat 방식)
 * index.html 에 firebase-*-compat.js 가 먼저 로드된 뒤 이 파일이 실행됩니다.
 */

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
const db = firebase.firestore();
const storage = firebase.storage();

const ADMIN_EMAILS = ["sumin150130@gmail.com"];
const ADMIN_EMAILS_NORMALIZED = ADMIN_EMAILS.map(e => String(e).toLowerCase().trim()).filter(Boolean);

function userIsAdmin(user) {
  const email = user?.email;
  if (!email) return false;
  return ADMIN_EMAILS_NORMALIZED.includes(email.toLowerCase().trim());
}

function formatFirebaseError(err) {
  const code = err?.code || "";
  const msg = err?.message || String(err);
  if (code === "permission-denied" || /permission/i.test(msg)) {
    return "권한 없음: Firestore·Storage 규칙을 확인하세요.";
  }
  if (code === "unauthenticated") return "로그인이 필요해요.";
  if (code === "storage/unauthorized") return "스토리지 업로드 권한이 없어요.";
  return msg;
}

function requireAdminAction() {
  if (!currentUser) {
    showToast("로그인 후 관리자 계정으로 사용해 주세요.", "error");
    return false;
  }
  if (!userIsAdmin(currentUser)) {
    showToast("관리자만 사용할 수 있어요.", "error");
    return false;
  }
  return true;
}

let productsData = [];
let newsData = [];
let currentUser = null;
let isAdmin = false;
let currentFilter = "all";
let currentDetailItem = null;
let orderStatusFilter = "all";
let newsImageDataURL = null;
let newsImageFile = null;

const CAT_LABELS = {
  script: "스크립트", plugin: "플러그인",
  map: "맵", ui: "UI", free: "무료"
};

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userMenu = document.getElementById("userMenu");
const userAvatar = document.getElementById("userAvatar");
const userNameEl = document.getElementById("userName");
const adminPanelBtn = document.getElementById("adminPanelBtn");
const searchInput = document.getElementById("searchInput");
const productGrid = document.getElementById("productGrid");
const top4Grid = document.getElementById("top4Grid");
const gridTitle = document.getElementById("gridTitle");
const gridCount = document.getElementById("gridCount");
const emptyState = document.getElementById("emptyState");

function setAdminButtonVisible(visible) {
  if (!adminPanelBtn) return;
  adminPanelBtn.style.display = visible ? "inline-flex" : "none";
  adminPanelBtn.setAttribute("aria-hidden", visible ? "false" : "true");
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById("page-" + name);
  if (page) page.classList.add("active");
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === name);
  });
  if (name === "assets") renderAssetsPage();
  if (name === "news") renderNewsPage();
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

const provider = new firebase.auth.GoogleAuthProvider();
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    auth.signInWithPopup(provider).catch(e => showToast("로그인 실패: " + e.message, "error"));
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => showToast("로그아웃 됐어요!"));
  });
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    isAdmin = userIsAdmin(user);
    if (loginBtn) loginBtn.style.display = "none";
    if (userMenu) userMenu.style.display = "flex";
    if (userAvatar) {
      userAvatar.src = user.photoURL || "https://placehold.co/64x64/1e2235/00d4ff?text=U";
      userAvatar.onerror = () => { userAvatar.src = "https://placehold.co/64x64/1e2235/00d4ff?text=U"; };
    }
    if (userNameEl) userNameEl.textContent = user.displayName || user.email.split("@")[0];
    setAdminButtonVisible(isAdmin);
  } else {
    isAdmin = false;
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (userMenu) userMenu.style.display = "none";
    setAdminButtonVisible(false);
  }
  renderProducts(filterProducts());
});

async function loadProducts() {
  try {
    const snap = await db.collection("products").get();
    productsData = [];
    snap.forEach(doc => productsData.push({ id: doc.id, ...doc.data() }));
    renderTop4();
    renderProducts(filterProducts());
  } catch (e) {
    showToast("상품 로드 실패: " + formatFirebaseError(e), "error");
  }
}

async function loadNews() {
  try {
    const snap = await db.collection("news").get();
    newsData = [];
    snap.forEach(doc => newsData.push({ id: doc.id, ...doc.data() }));
    newsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (e) {
    console.error("뉴스 로드:", e);
  }
}

function filterProducts() {
  let data = [...productsData];
  const kw = searchInput.value.toLowerCase();
  if (kw) {
    data = data.filter(p =>
      p.name?.toLowerCase().includes(kw) ||
      p.description?.toLowerCase().includes(kw)
    );
  }
  switch (currentFilter) {
    case "popular": data.sort((a, b) => (b.sales || 0) - (a.sales || 0)); gridTitle.textContent = "🔥 인기 에셋"; break;
    case "free": data = data.filter(p => !p.price || p.price === 0 || p.categories?.includes("free")); gridTitle.textContent = "🎁 무료 에셋"; break;
    case "lowprice": data.sort((a, b) => (a.price || 0) - (b.price || 0)); gridTitle.textContent = "↓ 낮은 가격순"; break;
    case "highprice": data.sort((a, b) => (b.price || 0) - (a.price || 0)); gridTitle.textContent = "↑ 높은 가격순"; break;
    case "script": data = data.filter(p => p.categories?.includes("script") || p.category === "script"); gridTitle.textContent = "📜 스크립트"; break;
    case "plugin": data = data.filter(p => p.categories?.includes("plugin") || p.category === "plugin"); gridTitle.textContent = "🔧 플러그인"; break;
    case "map": data = data.filter(p => p.categories?.includes("map") || p.category === "map"); gridTitle.textContent = "🗺 맵"; break;
    case "ui": data = data.filter(p => p.categories?.includes("ui") || p.category === "ui"); gridTitle.textContent = "🖼 UI"; break;
    default: gridTitle.textContent = "전체 에셋";
  }
  return data;
}

window.setFilter = (f) => {
  currentFilter = f;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === f));
  renderProducts(filterProducts());
  showPage("store");
};

function renderProducts(data) {
  productGrid.innerHTML = "";
  gridCount.textContent = `총 ${data.length}개의 에셋`;
  emptyState.style.display = data.length === 0 ? "block" : "none";
  data.forEach(item => productGrid.appendChild(makeProductCard(item, true)));
}

function renderAssetsPage() {
  const grid = document.getElementById("assetsGrid");
  const empty = document.getElementById("assetsEmpty");
  const count = document.getElementById("assetsCount");
  grid.innerHTML = "";
  count.textContent = `총 ${productsData.length}개의 에셋`;
  empty.style.display = productsData.length === 0 ? "block" : "none";
  productsData.forEach(item => grid.appendChild(makeProductCard(item, false)));
}

function makeProductCard(item, showDelete) {
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  const cats = item.categories || (item.category ? [item.category] : []);
  const catLabel = cats.map(c => CAT_LABELS[c] || c).join(", ") || "에셋";

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${item.image || "https://placehold.co/400x225/1e2235/00d4ff?text=RSStore"}" alt="${item.name}" loading="lazy">
      <span class="card-category-tag">${catLabel}</span>
      ${isFree ? '<span class="card-free-tag">FREE</span>' : ""}
    </div>
    <div class="card-body">
      <div class="card-name">${item.name}</div>
      <div class="card-desc">${item.description || "로블록스 스튜디오 에셋"}</div>
      <div class="card-footer">
        <span class="card-price ${isFree ? "free-price" : ""}">${isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString()}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="card-sales">${item.sales ? item.sales + " 판매" : ""}</span>
          <button type="button" class="btn-buy-card">구매</button>
        </div>
      </div>
    </div>
    ${showDelete && isAdmin ? '<button type="button" class="deleteBtn" title="삭제">🗑</button>' : ""}
  `;

  card.querySelector(".btn-buy-card").addEventListener("click", e => { e.stopPropagation(); openPurchaseModal(item); });
  card.addEventListener("click", () => openDetail(item));
  if (showDelete && isAdmin) {
    card.querySelector(".deleteBtn").addEventListener("click", e => { e.stopPropagation(); deleteProduct(item.id); });
  }
  return card;
}

function renderTop4() {
  const top4 = [...productsData].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 4);
  top4Grid.innerHTML = "";
  ["🥇", "🥈", "🥉", "4"].forEach((medal, i) => {
    if (!top4[i]) return;
    const item = top4[i];
    const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
    const el = document.createElement("div");
    el.className = "top4-card";
    el.innerHTML = `
      <span class="top4-rank ${["rank-1", "rank-2", "rank-3", ""][i]}">${medal}</span>
      <img class="top4-img" src="${item.image || "https://placehold.co/52x52/1e2235/00d4ff?text=RS"}" alt="${item.name}">
      <div class="top4-info">
        <div class="top4-name">${item.name}</div>
        <div class="top4-price">${isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString()}</div>
        <div class="top4-sales">${item.sales ? item.sales + " 판매" : "신규"}</div>
      </div>
    `;
    el.addEventListener("click", () => openDetail(item));
    top4Grid.appendChild(el);
  });
}

async function renderNewsPage() {
  await loadNews();
  const grid = document.getElementById("newsGrid");
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
      ${item.imageURL ? `<img class="news-card-img" src="${item.imageURL}" alt="${item.title}">` : ""}
      <div class="news-card-body">
        <div class="news-card-date">${date}</div>
        <div class="news-card-title">${item.title}</div>
        <div class="news-card-body-text">${item.body || ""}</div>
      </div>
      ${isAdmin ? `<div class="news-card-footer"><button type="button" class="news-delete-btn" data-id="${item.id}">🗑 삭제</button></div>` : ""}
    `;
    el.addEventListener("click", () => openNewsModal(item));
    if (isAdmin) {
      const del = el.querySelector(".news-delete-btn");
      if (del) del.addEventListener("click", e => { e.stopPropagation(); deleteNews(item.id); });
    }
    grid.appendChild(el);
  });
}

function openNewsModal(item) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "";
  document.getElementById("newsModalDate").textContent = date;
  document.getElementById("newsModalTitle").textContent = item.title;
  document.getElementById("newsModalBody").textContent = item.body || "";
  const img = document.getElementById("newsModalImage");
  if (item.imageURL) { img.src = item.imageURL; img.style.display = "block"; }
  else img.style.display = "none";
  openModal("newsModal");
}

function openDetail(item) {
  currentDetailItem = item;
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  const cats = item.categories || (item.category ? [item.category] : []);
  const catLabel = cats.map(c => CAT_LABELS[c] || c).join(" · ") || "에셋";

  document.getElementById("detailImage").src = item.image || "https://placehold.co/440x248/1e2235/00d4ff?text=RSStore";
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

document.getElementById("detailBuyBtn").addEventListener("click", () => {
  if (currentDetailItem) openPurchaseModal(currentDetailItem);
});

function openPurchaseModal(item) {
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  document.getElementById("purchaseProductName").textContent = item.name;
  document.getElementById("purchasePrice").textContent = isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString();
  document.getElementById("buyerDiscord").value = "";
  document.getElementById("buyerPhone").value = "";
  document.getElementById("modalBuy").dataset.id = item.id;
  document.getElementById("modalBuy").dataset.name = item.name;
  document.getElementById("modalBuy").dataset.price = item.price || 0;
  openModal("purchaseModal");
}

document.getElementById("modalBuy").addEventListener("click", async () => {
  if (!currentUser) { showToast("구매하려면 로그인이 필요해요!", "error"); return; }
  const discord = document.getElementById("buyerDiscord").value.trim();
  const phone = document.getElementById("buyerPhone").value.trim();
  if (!discord && !phone) { showToast("디스코드 ID 또는 전화번호 중 하나는 필수예요!", "error"); return; }

  const btn = document.getElementById("modalBuy");
  btn.textContent = "처리 중…";
  btn.disabled = true;

  try {
    await db.collection("orders").add({
      productId: btn.dataset.id,
      productName: btn.dataset.name,
      price: Number(btn.dataset.price),
      buyerEmail: currentUser.email,
      buyerName: currentUser.displayName || currentUser.email,
      discord: discord || "",
      phone: phone || "",
      status: "pending",
      createdAt: new Date().toISOString()
    });
    await db.collection("products").doc(btn.dataset.id).update({
      sales: firebase.firestore.FieldValue.increment(1)
    });
    showToast("✅ 구매 요청 완료! 곧 연락드릴게요.", "success");
    closeModal("purchaseModal");
    loadProducts();
  } catch (e) {
    showToast("구매 요청 실패: " + formatFirebaseError(e), "error");
  } finally {
    btn.textContent = "✅ 구매 요청하기";
    btn.disabled = false;
  }
});

if (adminPanelBtn) {
  adminPanelBtn.addEventListener("click", () => {
    openModal("adminPanel");
    switchAdminTab("addProduct");
  });
}

document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const t = tab.dataset.tab;
    document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + t).classList.add("active");
    if (t === "orderList") loadOrders();
    if (t === "manageProduct") loadManageProducts();
  });
});

function switchAdminTab(name) {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-" + name));
}

document.getElementById("adminImage").addEventListener("input", () => {
  const url = document.getElementById("adminImage").value.trim();
  const preview = document.getElementById("imagePreview");
  const img = document.getElementById("previewImg");
  if (url) {
    img.src = url;
    preview.style.display = "block";
    img.onerror = () => { preview.style.display = "none"; };
  } else preview.style.display = "none";
});

document.getElementById("adminUpload").addEventListener("click", async () => {
  if (!requireAdminAction()) return;

  const name = document.getElementById("adminName").value.trim();
  const price = Number(document.getElementById("adminPrice").value) || 0;
  const image = document.getElementById("adminImage").value.trim();
  const desc = document.getElementById("adminDesc").value.trim();
  const checkedCats = [...document.querySelectorAll(".cat-checkbox-group input:checked")].map(cb => cb.value);
  const status = document.getElementById("uploadStatus");

  if (!name) { setStatus(status, "제목을 입력해주세요!", "error"); return; }
  if (!checkedCats.length) { setStatus(status, "카테고리를 하나 이상 선택해주세요!", "error"); return; }

  const btn = document.getElementById("adminUpload");
  btn.disabled = true;
  btn.textContent = "등록 중…";
  setStatus(status, "등록 중…", "loading");

  try {
    const isFree = price === 0 || checkedCats.includes("free");
    if (isFree && !checkedCats.includes("free")) checkedCats.push("free");

    await db.collection("products").add({
      name,
      price,
      image: image || "",
      description: desc,
      categories: checkedCats,
      category: checkedCats[0],
      sales: 0,
      createdAt: new Date().toISOString()
    });

    setStatus(status, "✅ 상품이 등록됐어요!", "success");
    showToast("✅ 상품 등록 완료!", "success");
    document.getElementById("adminName").value = "";
    document.getElementById("adminPrice").value = "";
    document.getElementById("adminImage").value = "";
    document.getElementById("adminDesc").value = "";
    document.querySelectorAll(".cat-checkbox-group input").forEach(cb => { cb.checked = false; });
    document.getElementById("imagePreview").style.display = "none";
    await loadProducts();
  } catch (e) {
    setStatus(status, "오류: " + formatFirebaseError(e), "error");
    showToast("등록 실패: " + formatFirebaseError(e), "error");
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ 상품 등록하기";
  }
});

async function loadManageProducts() {
  const list = document.getElementById("manageProductList");
  list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">불러오는 중…</p>';
  await loadProducts();

  if (!productsData.length) {
    list.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">등록된 상품이 없어요.</p>';
    return;
  }

  list.innerHTML = "";
  productsData.forEach(item => {
    const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
    const cats = item.categories || (item.category ? [item.category] : []);
    const el = document.createElement("div");
    el.className = "manage-item";
    el.innerHTML = `
      <img class="manage-item-img" src="${item.image || "https://placehold.co/56x40/1e2235/00d4ff?text=RS"}" alt="">
      <div class="manage-item-info">
        <div class="manage-item-name">${item.name}</div>
        <div class="manage-item-meta">
          ${cats.map(c => CAT_LABELS[c] || c).join(", ")} &nbsp;|&nbsp;
          ${isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString()} &nbsp;|&nbsp;
          ${item.sales || 0}판매
        </div>
      </div>
      <div class="manage-item-actions">
        <button type="button" class="btn-item-delete">🗑 삭제</button>
      </div>
    `;
    el.querySelector(".btn-item-delete").addEventListener("click", async () => {
      await deleteProduct(item.id);
      loadManageProducts();
    });
    list.appendChild(el);
  });
}

async function deleteProduct(id) {
  if (!confirm("정말 이 상품을 삭제할까요?")) return;
  try {
    await db.collection("products").doc(id).delete();
    showToast("🗑 삭제됐어요.", "success");
    await loadProducts();
    renderProducts(filterProducts());
  } catch (e) {
    showToast("삭제 실패: " + formatFirebaseError(e), "error");
  }
}

async function loadOrders() {
  const orderList = document.getElementById("orderList");
  orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:30px;">불러오는 중…</p>';
  try {
    const snap = await db.collection("orders").get();
    let orders = [];
    snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filtered = orderStatusFilter === "all" ? orders : orders.filter(o => o.status === orderStatusFilter);
    if (!filtered.length) {
      orderList.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">구매 요청이 없어요.</p>';
      return;
    }
    orderList.innerHTML = "";
    filtered.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleString("ko-KR") : "";
      const contacts = [
        order.discord ? `💬 ${order.discord}` : null,
        order.phone ? `📱 ${order.phone}` : null
      ].filter(Boolean).join("  |  ");

      const el = document.createElement("div");
      el.className = "order-item";
      el.innerHTML = `
        <div class="order-item-header">
          <span class="order-product">${order.productName}</span>
          <span class="order-status ${order.status === "done" ? "done" : "pending"}">${order.status === "done" ? "✅ 완료" : "⏳ 대기 중"}</span>
        </div>
        <div class="order-contact">${contacts}</div>
        <div class="order-detail">
          👤 ${order.buyerName || order.buyerEmail} &nbsp;|&nbsp;
          💰 ${order.price === 0 ? "FREE" : "₩ " + Number(order.price).toLocaleString()} &nbsp;|&nbsp;
          📅 ${date}
        </div>
        ${order.status !== "done" ? `<button type="button" class="btn-done" data-id="${order.id}">✅ 완료 처리</button>` : ""}
      `;
      if (order.status !== "done") {
        el.querySelector(".btn-done").addEventListener("click", async (e) => {
          const b = e.currentTarget;
          b.disabled = true;
          b.textContent = "처리 중…";
          try {
            await db.collection("orders").doc(order.id).update({ status: "done" });
            showToast("✅ 완료 처리됐어요!", "success");
            loadOrders();
          } catch (err) {
            showToast("오류: " + formatFirebaseError(err), "error");
            b.disabled = false;
            b.textContent = "✅ 완료 처리";
          }
        });
      }
      orderList.appendChild(el);
    });
  } catch (e) {
    orderList.innerHTML = `<p style="color:var(--red);text-align:center;">오류: ${formatFirebaseError(e)}</p>`;
  }
}

document.querySelectorAll(".order-filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".order-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    orderStatusFilter = btn.dataset.status;
    loadOrders();
  });
});

const newsFileInput = document.getElementById("newsImageFile");
const newsFileArea = document.getElementById("newsFileArea");

newsFileInput.addEventListener("change", (e) => handleNewsFile(e.target.files[0]));
newsFileArea.addEventListener("dragover", (e) => { e.preventDefault(); newsFileArea.style.borderColor = "var(--accent)"; });
newsFileArea.addEventListener("dragleave", () => { newsFileArea.style.borderColor = ""; });
newsFileArea.addEventListener("drop", (e) => {
  e.preventDefault();
  newsFileArea.style.borderColor = "";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleNewsFile(file);
  else showToast("이미지 파일만 업로드할 수 있어요!", "error");
});

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

document.getElementById("removeNewsImg").addEventListener("click", () => {
  newsImageFile = null;
  newsImageDataURL = null;
  document.getElementById("newsImagePreview").style.display = "none";
  document.getElementById("newsFileUI").style.display = "block";
  newsFileInput.value = "";
});

document.getElementById("newsUpload").addEventListener("click", async () => {
  if (!requireAdminAction()) return;

  const title = document.getElementById("newsTitle").value.trim();
  const body = document.getElementById("newsBody").value.trim();
  const status = document.getElementById("newsUploadStatus");

  if (!title) { setStatus(status, "제목을 입력해주세요!", "error"); return; }
  if (!body) { setStatus(status, "내용을 입력해주세요!", "error"); return; }

  const btn = document.getElementById("newsUpload");
  btn.disabled = true;
  btn.textContent = "등록 중…";
  setStatus(status, "등록 중…", "loading");

  try {
    let imageURL = "";
    if (newsImageFile) {
      setStatus(status, "이미지 업로드 중…", "loading");
      const storageRef = storage.ref(`news/${Date.now()}_${newsImageFile.name}`);
      const task = await storageRef.put(newsImageFile);
      imageURL = await task.ref.getDownloadURL();
    }

    await db.collection("news").add({
      title,
      body,
      imageURL,
      createdAt: new Date().toISOString()
    });

    setStatus(status, "✅ 뉴스가 등록됐어요!", "success");
    showToast("📰 뉴스 등록 완료!", "success");
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsBody").value = "";
    document.getElementById("removeNewsImg").click();
    await loadNews();
  } catch (e) {
    setStatus(status, "오류: " + formatFirebaseError(e), "error");
    showToast("뉴스 등록 실패: " + formatFirebaseError(e), "error");
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = "📰 뉴스 등록하기";
  }
});

async function deleteNews(id) {
  if (!confirm("정말 이 뉴스를 삭제할까요?")) return;
  try {
    await db.collection("news").doc(id).delete();
    showToast("🗑 뉴스가 삭제됐어요.", "success");
    renderNewsPage();
  } catch (e) {
    showToast("삭제 실패: " + formatFirebaseError(e), "error");
  }
}

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProducts(filterProducts());
  });
});

searchInput.addEventListener("input", () => renderProducts(filterProducts()));

let currentSlide = 0;
const totalSlides = 3;
const slidesWrapper = document.getElementById("slidesWrapper");

function goSlide(n) {
  currentSlide = n;
  slidesWrapper.style.transform = `translateX(-${n * 100}%)`;
  document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("active", i === n));
}
window.goSlide = goSlide;
window.nextSlide = () => goSlide((currentSlide + 1) % totalSlides);
window.prevSlide = () => goSlide((currentSlide - 1 + totalSlides) % totalSlides);
setInterval(() => window.nextSlide(), 5000);

let isDark = true;
document.getElementById("themeToggle").addEventListener("click", () => {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.getElementById("themeToggle").textContent = isDark ? "🌙" : "☀️";
});

function openModal(id) { document.getElementById(id).classList.add("active"); }
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
  el.className = "upload-status " + type;
  if (type === "success") setTimeout(() => { el.textContent = ""; }, 4000);
}

let toastTimer;
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

loadProducts();
loadNews();
