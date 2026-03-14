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
deleteDoc,
addDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

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

const ADMIN_EMAIL="[sumin150130@gmail.com](mailto:sumin150130@gmail.com)";

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const userEmail=document.getElementById("userEmail");

const adminBtn=document.getElementById("adminBtn");
const adminPanelBtn=document.getElementById("adminPanelBtn");

const productGrid=document.querySelector(".product-grid");
const searchInput=document.getElementById("searchInput");

const modal=document.getElementById("productModal");
const modalImage=document.getElementById("modalImage");
const modalName=document.getElementById("modalName");
const modalPrice=document.getElementById("modalPrice");
const modalClose=document.getElementById("modalClose");
const modalBuy=document.getElementById("modalBuy");

const buyerPhone=document.getElementById("buyerPhone");
const buyerDiscord=document.getElementById("buyerDiscord");

const provider=new GoogleAuthProvider();

loginBtn.onclick=()=>signInWithPopup(auth,provider);
logoutBtn.onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{
if(user){
userEmail.textContent=user.email;
loginBtn.style.display="none";
logoutBtn.style.display="inline-block";

if(user.email===ADMIN_EMAIL){
adminBtn.style.display="inline-block";
adminPanelBtn.style.display="inline-block";
}

}else{
loginBtn.style.display="inline-block";
logoutBtn.style.display="none";
}
});

let productsData=[];
let currentProduct=null;

async function loadProducts(){

const querySnapshot=await getDocs(collection(db,"products"));

productsData=[];

querySnapshot.forEach(docItem=>{
productsData.push({id:docItem.id,...docItem.data()});
});

renderProducts(productsData);

}

function renderProducts(data){

productGrid.innerHTML="";

data.forEach(item=>{

const card=document.createElement("div");
card.className="card";

card.innerHTML=` <img src="${item.image}">

<h3>${item.name}</h3>
<p class="price">₩ ${item.price}</p>
`;

card.onclick=()=>{

currentProduct=item;

modal.style.display="block";

modalImage.src=item.image;
modalName.textContent=item.name;
modalPrice.textContent="₩ "+item.price;

};

if(auth.currentUser && auth.currentUser.email===ADMIN_EMAIL){

const del=document.createElement("button");
del.textContent="삭제";
del.className="deleteBtn";

del.onclick=async(e)=>{

e.stopPropagation();

await deleteDoc(doc(db,"products",item.id));

loadProducts();

};

card.appendChild(del);

}

productGrid.appendChild(card);

});

}

searchInput.oninput=()=>{

const keyword=searchInput.value.toLowerCase();

renderProducts(productsData.filter(p=>p.name.toLowerCase().includes(keyword)));

};

modalBuy.onclick=async()=>{

await addDoc(collection(db,"orders"),{

phone:buyerPhone.value,
discord:buyerDiscord.value,
product:currentProduct.name

});

alert("구매 요청 완료");

modal.style.display="none";

};

modalClose.onclick=()=>modal.style.display="none";

loadProducts();





