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

// 🔥 Firebase 설정
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

// 🔥 DOM 요소
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");
const productGrid = document.querySelector(".product-grid");

// 🔥 로그인
const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  await signInWithPopup(auth, provider);
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// 🔥 로그인 상태 감지
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

// 🔥 상품 불러오기
async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "products"));
  productGrid.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${data.image}">
      <h3>${data.name}</h3>
      <p class="price">₩ ${data.price.toLocaleString()}</p>
      <button>장바구니 담기</button>
    `;

    productGrid.appendChild(card);
  });
}

loadProducts();




