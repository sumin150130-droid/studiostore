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
doc,
addDoc,
deleteDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

/* Firebase */

const firebaseConfig={
apiKey:"AIzaSyBkmrbF-V9gNQiFhEjynULsYjpr5EQWErA",
authDomain:"studiostore-4bf29.firebaseapp.com",
projectId:"studiostore-4bf29",
storageBucket:"studiostore-4bf29.firebasestorage.app",
messagingSenderId:"693847220052",
appId:"1:693847220052:web:f2a863bd3bbef1087932c1"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

/* 관리자 이메일 */

const ADMIN_EMAIL="[sumin150130@gmail.com](mailto:sumin150130@gmail.com)";

/* DOM */

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const userEmail=document.getElementById("userEmail");

const adminPanelBtn=document.getElementById("adminPanelBtn");

const productGrid=document.querySelector(".product-grid");

const searchInput=document.getElementById("searchInput");

const sortAll=document.getElementById("sortAll");
const sortPopular=document.getElementById("sortPopular");
const sortLow=document.getElementById("sortLow");
const sortHigh=document.getElementById("sortHigh");

/* 관리자 패널 */

const adminPanel=document.getElementById("adminPanel");
const adminPanelClose=document.getElementById("adminPanelClose");
const orderList=document.getElementById("orderList");

/* 로그인 */

const provider=new GoogleAuthProvider();

loginBtn.onclick=()=>signInWithPopup(auth,provider);
logoutBtn.onclick=()=>signOut(auth);

/* 로그인 상태 */

onAuthStateChanged(auth,user=>{

if(user){

userEmail.textContent=user.email;

loginBtn.style.display="none";
logoutBtn.style.display="inline-block";

if(user.email===ADMIN_EMAIL){
adminPanelBtn.style.display="inline-block";
}

}else{

userEmail.textContent="";

loginBtn.style.display="inline-block";
logoutBtn.style.display="none";
adminPanelBtn.style.display="none";

}

});

/* 상품 데이터 */

let productsData=[];

/* 상품 로드 */

async function loadProducts(){

const querySnapshot=await getDocs(collection(db,"products"));

productsData=[];

querySnapshot.forEach(docItem=>{
productsData.push({id:docItem.id,...docItem.data()});
});

renderProducts(productsData);

}

/* 상품 렌더 */

function renderProducts(data){

productGrid.innerHTML="";

data.forEach(item=>{

const card=document.createElement("div");
card.className="card";

card.innerHTML=` <img src="${item.image}">

<h3>${item.name}</h3>
<p class="price">₩ ${item.price}</p>
<p style="font-size:12px;color:gray;">판매 ${item.sales||0}</p>
`;

productGrid.appendChild(card);

});

}

/* 검색 */

searchInput.oninput=()=>{

const keyword=searchInput.value.toLowerCase();

renderProducts(productsData.filter(p=>p.name.toLowerCase().includes(keyword)));

};

/* 정렬 */

sortAll.onclick=()=>renderProducts(productsData);

sortLow.onclick=()=>{

const sorted=[...productsData].sort((a,b)=>a.price-b.price);
renderProducts(sorted);

};

sortHigh.onclick=()=>{

const sorted=[...productsData].sort((a,b)=>b.price-a.price);
renderProducts(sorted);

};

sortPopular.onclick=()=>{

const sorted=[...productsData].sort((a,b)=>(b.sales||0)-(a.sales||0));
renderProducts(sorted);

};

/* 관리자 패널 */

adminPanelBtn.onclick=async()=>{

adminPanel.style.display="block";

const querySnapshot=await getDocs(collection(db,"orders"));

orderList.innerHTML="";

querySnapshot.forEach(doc=>{

const data=doc.data();

const div=document.createElement("div");

div.innerHTML=`${data.phone} / ${data.discord} → ${data.product}`;

orderList.appendChild(div);

});

};

adminPanelClose.onclick=()=>adminPanel.style.display="none";

/* 시작 */

loadProducts();





