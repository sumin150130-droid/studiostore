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
  getDocs 
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

/* ---------------- Firebase ---------------- */

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

console.log("🔥 Firebase 연결 완료");

/* ---------------- DOM ---------------- */

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

const productGrid = document.querySelector(".product-grid");

const sortAll = document.getElementById("sortAll");
const sortLow = document.getElementById("sortLow");
const sortHigh = document.getElementById("sortHigh");
const sortPopular = document.getElementById("sortPopular");

/* ----------- 모달 요소 ----------- */

const modal = document.getElementById("productModal");
const modalImage = document.getElementById("modalImage");
const modalName = document.getElementById("modalName");
const modalPrice = document.getElementById("modalPrice");
const modalSales = document.getElementById("modalSales");
const modalClose = document.getElementById("modalClose");

/* ---------------- 로그인 ---------------- */

const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userEmail.textContent = user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userEmail.textContent = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

/* ---------------- 상품 데이터 ---------------- */

let productsData = [];

/* ---------------- 상품 불러오기 ---------------- */

async function loadProducts() {

  const querySnapshot = await getDocs(collection(db, "products"));

  productsData = [];

  querySnapshot.forEach((doc) => {
    productsData.push(doc.data());
  });

  renderProducts(productsData);

}

/* ---------------- 상품 렌더링 ---------------- */

function renderProducts(data) {

  productGrid.innerHTML = "";

  data.forEach((item) => {

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.image}">
      <h3>${item.name}</h3>
      <p class="price">₩ ${item.price.toLocaleString()}</p>
      <p style="font-size:12px;color:gray;">판매 ${item.sales || 0}회</p>
      <button>장바구니 담기</button>
    `;

    /* ---- 카드 클릭 → 모달 ---- */

    card.addEventListener("click", () => {

      modal.style.display = "block";

      modalImage.src = item.image;
      modalName.textContent = item.name;
      modalPrice.textContent = "₩ " + item.price.toLocaleString();
      modalSales.textContent = "판매 " + (item.sales || 0) + "회";

    });

    productGrid.appendChild(card);

  });

}

/* ---------------- 정렬 ---------------- */

sortAll?.addEventListener("click", () => {
  renderProducts(productsData);
});

sortLow?.addEventListener("click", () => {

  const sorted = [...productsData].sort((a, b) => a.price - b.price);
  renderProducts(sorted);

});

sortHigh?.addEventListener("click", () => {

  const sorted = [...productsData].sort((a, b) => b.price - a.price);
  renderProducts(sorted);

});

sortPopular?.addEventListener("click", () => {

  const sorted = [...productsData].sort((a, b) => (b.sales || 0) - (a.sales || 0));
  renderProducts(sorted);

});

/* ---------------- 모달 닫기 ---------------- */

modalClose.onclick = () => {
  modal.style.display = "none";
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

/* ---------------- 시작 ---------------- */

loadProducts();





