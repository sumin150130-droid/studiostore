/**
 * RSStore — 로컬 전용 (Firebase 없음)
 * 데이터는 브라우저 localStorage 에 저장됩니다.
 */

const LS_PRODUCTS = "rsstore_products";
const LS_NEWS = "rsstore_news";
const LS_ORDERS = "rsstore_orders";
const LS_USER = "rsstore_user";

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function escapeHtml(s) {
  if (s == null || s === "") return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function loadJson(key, fallback) {
  try {
    const t = localStorage.getItem(key);
    if (!t) return fallback;
    const v = JSON.parse(t);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

/* ===================================================
   상태
=================================================== */
let productsData = [];
let newsData = [];
let ordersData = [];
let currentUser = { email: "guest@local", displayName: "손님", avatar: "" };
const isAdmin = true;

let currentFilter = "all";
let currentDetailItem = null;
let orderStatusFilter = "all";
let newsImageDataURL = null;
let newsImageFile = null;

const CAT_LABELS = {
  script: "스크립트", plugin: "플러그인",
  map: "맵", ui: "UI", free: "무료"
};

/* ===================================================
   DOM
=================================================== */
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
}

function applyUserUI() {
  if (loginBtn) {
    loginBtn.style.display = "inline-block";
    loginBtn.textContent = "닉네임 변경";
  }
  if (userMenu) userMenu.style.display = "flex";
  if (userAvatar) {
    userAvatar.src = currentUser.avatar || "https://placehold.co/64x64/1e2235/00d4ff?text=U";
    userAvatar.onerror = () => { userAvatar.src = "https://placehold.co/64x64/1e2235/00d4ff?text=U"; };
  }
  if (userNameEl) userNameEl.textContent = currentUser.displayName || "손님";
  setAdminButtonVisible(isAdmin);
}

function seedIfEmpty() {
  if (!loadJson(LS_PRODUCTS, []).length) {
    const demo = [{
      id: newId(),
      name: "샘플 에셋 (삭제하고 등록해 보세요)",
      price: 0,
      image: "https://placehold.co/400x225/1e2235/00d4ff?text=RSStore",
      description: "이 브라우저에만 저장되는 로컬 스토어입니다. Firebase 설정이 필요 없어요.",
      categories: ["free", "script"],
      category: "script",
      sales: 0,
      createdAt: new Date().toISOString()
    }];
    saveJson(LS_PRODUCTS, demo);
  }
}

/* ===================================================
   불러오기 / 저장
=================================================== */
function loadProducts() {
  seedIfEmpty();
  productsData = loadJson(LS_PRODUCTS, []);
  renderTop4();
  renderProducts(filterProducts());
}

function loadNews() {
  newsData = loadJson(LS_NEWS, []);
  newsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function saveProducts() {
  saveJson(LS_PRODUCTS, productsData);
}

function saveNews() {
  saveJson(LS_NEWS, newsData);
}

function saveOrders() {
  saveJson(LS_ORDERS, ordersData);
}

/* ===================================================
   로그인 (닉네임만, 선택)
=================================================== */
function loadSavedUser() {
  const u = loadJson(LS_USER, null);
  if (u && u.displayName) currentUser = { ...currentUser, ...u };
}

function saveUser() {
  saveJson(LS_USER, { displayName: currentUser.displayName, email: currentUser.email, avatar: currentUser.avatar || "" });
}

if (loginBtn) {
  loginBtn.onclick = () => {
    const name = prompt("표시할 닉네임을 입력하세요 (비우면 손님)", currentUser.displayName || "");
    if (name === null) return;
    currentUser.displayName = name.trim() || "손님";
    currentUser.email = (name.trim() || "guest") + "@local";
    saveUser();
    applyUserUI();
    showToast("저장됐어요. 이 브라우저에만 기억해요.", "success");
  };
}
if (logoutBtn) {
  logoutBtn.onclick = () => {
    currentUser = { email: "guest@local", displayName: "손님", avatar: "" };
    localStorage.removeItem(LS_USER);
    applyUserUI();
    showToast("초기화했어요.", "success");
  };
}

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
  if (name === "news") renderNewsPage();
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  };
});

/* ===================================================
   필터
=================================================== */
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

/* ===================================================
   상품 렌더링
=================================================== */
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
  const name = escapeHtml(item.name);
  const desc = escapeHtml(item.description || "로블록스 스튜디오 에셋");
  const img = escapeHtml(item.image || "https://placehold.co/400x225/1e2235/00d4ff?text=RSStore");

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div class="card-img-wrap">
      <img src="${img}" alt="" loading="lazy">
      <span class="card-category-tag">${escapeHtml(catLabel)}</span>
      ${isFree ? '<span class="card-free-tag">FREE</span>' : ""}
    </div>
    <div class="card-body">
      <div class="card-name">${name}</div>
      <div class="card-desc">${desc}</div>
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

  card.querySelector(".btn-buy-card").onclick = e => { e.stopPropagation(); openPurchaseModal(item); };
  card.onclick = () => openDetail(item);
  if (showDelete && isAdmin) {
    card.querySelector(".deleteBtn").onclick = e => { e.stopPropagation(); deleteProduct(item.id); };
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
    const img = escapeHtml(item.image || "https://placehold.co/52x52/1e2235/00d4ff?text=RS");
    el.innerHTML = `
      <span class="top4-rank ${["rank-1", "rank-2", "rank-3", ""][i]}">${medal}</span>
      <img class="top4-img" src="${img}" alt="">
      <div class="top4-info">
        <div class="top4-name">${escapeHtml(item.name)}</div>
        <div class="top4-price">${isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString()}</div>
        <div class="top4-sales">${item.sales ? item.sales + " 판매" : "신규"}</div>
      </div>
    `;
    el.onclick = () => openDetail(item);
    top4Grid.appendChild(el);
  });
}

/* ===================================================
   뉴스
=================================================== */
function renderNewsPage() {
  loadNews();
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
    const imgBlock = item.imageURL
      ? `<img class="news-card-img" src="${escapeHtml(item.imageURL)}" alt="">`
      : "";
    el.innerHTML = `
      ${imgBlock}
      <div class="news-card-body">
        <div class="news-card-date">${escapeHtml(date)}</div>
        <div class="news-card-title">${escapeHtml(item.title)}</div>
        <div class="news-card-body-text">${escapeHtml(item.body || "")}</div>
      </div>
      ${isAdmin ? `<div class="news-card-footer"><button type="button" class="news-delete-btn" data-id="${escapeHtml(item.id)}">🗑 삭제</button></div>` : ""}
    `;
    el.onclick = () => openNewsModal(item);
    if (isAdmin) {
      const del = el.querySelector(".news-delete-btn");
      if (del) del.onclick = e => { e.stopPropagation(); deleteNews(item.id); };
    }
    grid.appendChild(el);
  });
}

function openNewsModal(item) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString("ko-KR") : "";
  document.getElementById("newsModalDate").textContent = date;
  document.getElementById("newsModalTitle").textContent = item.title || "";
  document.getElementById("newsModalBody").textContent = item.body || "";
  const img = document.getElementById("newsModalImage");
  if (item.imageURL) {
    img.src = item.imageURL;
    img.style.display = "block";
  } else img.style.display = "none";
  openModal("newsModal");
}

/* ===================================================
   상세 패널
=================================================== */
function openDetail(item) {
  currentDetailItem = item;
  const isFree = !item.price || item.price === 0 || item.categories?.includes("free");
  const cats = item.categories || (item.category ? [item.category] : []);
  const catLabel = cats.map(c => CAT_LABELS[c] || c).join(" · ") || "에셋";

  document.getElementById("detailImage").src = item.image || "https://placehold.co/440x248/1e2235/00d4ff?text=RSStore";
  document.getElementById("detailCatBadge").textContent = catLabel;
  document.getElementById("detailName").textContent = item.name || "";
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
   구매
=================================================== */
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

document.getElementById("modalBuy").onclick = () => {
  const discord = document.getElementById("buyerDiscord").value.trim();
  const phone = document.getElementById("buyerPhone").value.trim();
  if (!discord && !phone) {
    showToast("디스코드 ID 또는 전화번호 중 하나는 입력해 주세요.", "error");
    return;
  }

  const btn = document.getElementById("modalBuy");
  btn.disabled = true;
  btn.textContent = "처리 중…";

  const id = btn.dataset.id;
  ordersData = loadJson(LS_ORDERS, []);
  ordersData.push({
    id: newId(),
    productId: id,
    productName: btn.dataset.name,
    price: Number(btn.dataset.price),
    buyerEmail: currentUser.email,
    buyerName: currentUser.displayName || currentUser.email,
    discord: discord || "",
    phone: phone || "",
    status: "pending",
    createdAt: new Date().toISOString()
  });
  saveOrders();

  const p = productsData.find(x => x.id === id);
  if (p) {
    p.sales = (p.sales || 0) + 1;
    saveProducts();
  }

  showToast("✅ 구매 요청이 저장됐어요. (이 PC 브라우저에만)", "success");
  closeModal("purchaseModal");
  loadProducts();
  btn.textContent = "✅ 구매 요청하기";
  btn.disabled = false;
};

/* ===================================================
   관리자 패널
=================================================== */
if (adminPanelBtn) {
  adminPanelBtn.onclick = () => {
    openModal("adminPanel");
    switchAdminTab("addProduct");
  };
}

document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.onclick = () => {
    const t = tab.dataset.tab;
    document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-tab-content").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + t).classList.add("active");
    if (t === "orderList") loadOrders();
    if (t === "manageProduct") loadManageProducts();
  };
});

function switchAdminTab(name) {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".admin-tab-content").forEach(c => c.classList.toggle("active", c.id === "tab-" + name));
}

document.getElementById("adminImage").oninput = () => {
  const url = document.getElementById("adminImage").value.trim();
  const preview = document.getElementById("imagePreview");
  const img = document.getElementById("previewImg");
  if (url) {
    img.src = url;
    preview.style.display = "block";
    img.onerror = () => { preview.style.display = "none"; };
  } else preview.style.display = "none";
};

document.getElementById("adminUpload").onclick = () => {
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

  const isFree = price === 0 || checkedCats.includes("free");
  if (isFree && !checkedCats.includes("free")) checkedCats.push("free");

  productsData.push({
    id: newId(),
    name,
    price,
    image: image || "",
    description: desc,
    categories: checkedCats,
    category: checkedCats[0],
    sales: 0,
    createdAt: new Date().toISOString()
  });
  saveProducts();

  setStatus(status, "✅ 상품이 등록됐어요!", "success");
  showToast("✅ 상품 등록 완료!", "success");
  document.getElementById("adminName").value = "";
  document.getElementById("adminPrice").value = "";
  document.getElementById("adminImage").value = "";
  document.getElementById("adminDesc").value = "";
  document.querySelectorAll(".cat-checkbox-group input").forEach(cb => { cb.checked = false; });
  document.getElementById("imagePreview").style.display = "none";
  loadProducts();

  btn.disabled = false;
  btn.textContent = "✅ 상품 등록하기";
};

function loadManageProducts() {
  const list = document.getElementById("manageProductList");
  loadProducts();
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
    const img = escapeHtml(item.image || "https://placehold.co/56x40/1e2235/00d4ff?text=RS");
    el.innerHTML = `
      <img class="manage-item-img" src="${img}" alt="">
      <div class="manage-item-info">
        <div class="manage-item-name">${escapeHtml(item.name)}</div>
        <div class="manage-item-meta">
          ${cats.map(c => escapeHtml(CAT_LABELS[c] || c)).join(", ")} &nbsp;|&nbsp;
          ${isFree ? "FREE" : "₩ " + Number(item.price).toLocaleString()} &nbsp;|&nbsp;
          ${item.sales || 0}판매
        </div>
      </div>
      <div class="manage-item-actions">
        <button type="button" class="btn-item-delete">🗑 삭제</button>
      </div>
    `;
    el.querySelector(".btn-item-delete").onclick = () => {
      deleteProduct(item.id);
      loadManageProducts();
    };
    list.appendChild(el);
  });
}

function deleteProduct(id) {
  if (!confirm("정말 이 상품을 삭제할까요?")) return;
  productsData = productsData.filter(p => p.id !== id);
  saveProducts();
  showToast("🗑 삭제됐어요.", "success");
  loadProducts();
}

function loadOrders() {
  const orderList = document.getElementById("orderList");
  ordersData = loadJson(LS_ORDERS, []);
  ordersData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = orderStatusFilter === "all" ? ordersData : ordersData.filter(o => o.status === orderStatusFilter);
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
        <span class="order-product">${escapeHtml(order.productName)}</span>
        <span class="order-status ${order.status === "done" ? "done" : "pending"}">${order.status === "done" ? "✅ 완료" : "⏳ 대기 중"}</span>
      </div>
      <div class="order-contact">${escapeHtml(contacts)}</div>
      <div class="order-detail">
        👤 ${escapeHtml(order.buyerName || order.buyerEmail)} &nbsp;|&nbsp;
        💰 ${order.price === 0 ? "FREE" : "₩ " + Number(order.price).toLocaleString()} &nbsp;|&nbsp;
        📅 ${escapeHtml(date)}
      </div>
      ${order.status !== "done" ? `<button type="button" class="btn-done" data-id="${escapeHtml(order.id)}">✅ 완료 처리</button>` : ""}
    `;
    if (order.status !== "done") {
      el.querySelector(".btn-done").onclick = (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        const oid = order.id;
        ordersData = loadJson(LS_ORDERS, []);
        const o = ordersData.find(x => x.id === oid);
        if (o) o.status = "done";
        saveOrders();
        showToast("✅ 완료 처리됐어요!", "success");
        loadOrders();
      };
    }
    orderList.appendChild(el);
  });
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
   뉴스 이미지 (data URL 로만 저장)
=================================================== */
const newsFileInput = document.getElementById("newsImageFile");
const newsFileArea = document.getElementById("newsFileArea");

newsFileInput.onchange = (e) => handleNewsFile(e.target.files[0]);
newsFileArea.ondragover = (e) => { e.preventDefault(); newsFileArea.style.borderColor = "var(--accent)"; };
newsFileArea.ondragleave = () => { newsFileArea.style.borderColor = ""; };
newsFileArea.ondrop = (e) => {
  e.preventDefault();
  newsFileArea.style.borderColor = "";
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleNewsFile(file);
  else showToast("이미지 파일만 업로드할 수 있어요!", "error");
};

function handleNewsFile(file) {
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) {
    showToast("이미지는 1.5MB 이하로 올려 주세요 (로컬 저장 용량 때문이에요).", "error");
    return;
  }
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
  newsImageFile = null;
  newsImageDataURL = null;
  document.getElementById("newsImagePreview").style.display = "none";
  document.getElementById("newsFileUI").style.display = "block";
  newsFileInput.value = "";
};

document.getElementById("newsUpload").onclick = () => {
  const title = document.getElementById("newsTitle").value.trim();
  const body = document.getElementById("newsBody").value.trim();
  const status = document.getElementById("newsUploadStatus");
  if (!title) { setStatus(status, "제목을 입력해주세요!", "error"); return; }
  if (!body) { setStatus(status, "내용을 입력해주세요!", "error"); return; }

  const btn = document.getElementById("newsUpload");
  btn.disabled = true;
  btn.textContent = "등록 중…";
  setStatus(status, "등록 중…", "loading");

  loadNews();
  const imageURL = newsImageDataURL || "";
  newsData.push({
    id: newId(),
    title,
    body,
    imageURL,
    createdAt: new Date().toISOString()
  });
  saveNews();

  setStatus(status, "✅ 뉴스가 등록됐어요!", "success");
  showToast("📰 뉴스 등록 완료!", "success");
  document.getElementById("newsTitle").value = "";
  document.getElementById("newsBody").value = "";
  document.getElementById("removeNewsImg").click();

  btn.disabled = false;
  btn.textContent = "📰 뉴스 등록하기";
};

function deleteNews(id) {
  if (!confirm("정말 이 뉴스를 삭제할까요?")) return;
  loadNews();
  newsData = newsData.filter(n => n.id !== id);
  saveNews();
  showToast("🗑 뉴스가 삭제됐어요.", "success");
  renderNewsPage();
}

/* ===================================================
   카테고리 / 검색
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
window.goSlide = goSlide;
window.nextSlide = () => goSlide((currentSlide + 1) % totalSlides);
window.prevSlide = () => goSlide((currentSlide - 1 + totalSlides) % totalSlides);
setInterval(() => window.nextSlide(), 5000);

/* ===================================================
   테마
=================================================== */
let isDark = true;
document.getElementById("themeToggle").onclick = () => {
  isDark = !isDark;
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  document.getElementById("themeToggle").textContent = isDark ? "🌙" : "☀️";
};

/* ===================================================
   모달
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

/* ===================================================
   시작
=================================================== */
loadSavedUser();
applyUserUI();
loadProducts();
loadNews();
