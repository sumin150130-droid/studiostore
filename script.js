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
updateDoc,
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

const ADMIN_EMAIL="sumin150130@gmail.com";

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const userEmail=document.getElementById("userEmail");

const adminBtn=document.getElementById("adminBtn");
const adminPanelBtn=document.getElementById("adminPanelBtn");

const productGrid=document.querySelector(".product-grid");

const searchInput=document.getElementById("searchInput");

const sortAll=document.getElementById("sortAll");
const sortLow=document.getElementById("sortLow");
const sortHigh=document.getElementById("sortHigh");
const sortPopular=document.getElementById("sortPopular");

const modal=document.getElementById("productModal");
const modalImage=document.getElementById("modalImage");
const modalName=document.getElementById("modalName");
const modalPrice=document.getElementById("modalPrice");
const modalSales=document.getElementById("modalSales");
const modalClose=document.getElementById("modalClose");
const modalBuy=document.getElementById("modalBuy");

const buyerPhone=document.getElementById("buyerPhone");
const buyerDiscord=document.getElementById("buyerDiscord");

const adminModal=document.getElementById("adminModal");
const adminClose=document.getElementById("adminClose");

const adminName=document.getElementById("adminName");
const adminPrice=document.getElementById("adminPrice");
const adminImage=document.getElementById("adminImage");
const adminUpload=document.getElementById("adminUpload");

const adminPanel=document.getElementById("adminPanel");
const adminPanelClose=document.getElementById("adminPanelClose");
const orderList=document.getElementById("orderList");

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

card.innerHTML=`
<img src="${item.image}">
<h3>${item.name}</h3>
<p class="price">₩ ${item.price.toLocaleString()}</p>
<p style="font-size:12px;color:gray;">판매 ${item.sales||0}회</p>
`;

card.onclick=()=>{

currentProduct=item;

modal.style.display="block";

modalImage.src=item.image;
modalName.textContent=item.name;
modalPrice.textContent="₩ "+item.price.toLocaleString();
modalSales.textContent="판매 "+(item.sales||0)+"회";

};

productGrid.appendChild(card);

});

}

searchInput.oninput=()=>{

const keyword=searchInput.value.toLowerCase();

renderProducts(productsData.filter(p=>p.name.toLowerCase().includes(keyword)));

};

sortLow.onclick=()=>renderProducts([...productsData].sort((a,b)=>a.price-b.price));
sortHigh.onclick=()=>renderProducts([...productsData].sort((a,b)=>b.price-a.price));
sortPopular.onclick=()=>renderProducts([...productsData].sort((a,b)=>(b.sales||0)-(a.sales||0)));
sortAll.onclick=()=>renderProducts(productsData);

modalBuy.onclick=async()=>{

const phone=buyerPhone.value;
const discord=buyerDiscord.value;

if(!phone||!discord){

alert("전화번호와 디코 입력");

return;

}

await addDoc(collection(db,"orders"),{

phone,
discord,
product:currentProduct.name,
date:Date.now()

});

alert("구매 요청 완료");

modal.style.display="none";

};

adminBtn.onclick=()=>adminModal.style.display="block";

adminUpload.onclick=async()=>{

await addDoc(collection(db,"products"),{

name:adminName.value,
price:Number(adminPrice.value),
image:adminImage.value,
sales:0

});

adminModal.style.display="none";

loadProducts();

};

adminPanelBtn.onclick=async()=>{

adminPanel.style.display="block";

const querySnapshot=await getDocs(collection(db,"orders"));

orderList.innerHTML="";

querySnapshot.forEach(doc=>{

const data=doc.data();

const div=document.createElement("div");

div.innerHTML=`${data.phone} , ${data.discord} : ${data.product}`;

orderList.appendChild(div);

});

};

modalClose.onclick=()=>modal.style.display="none";
adminClose.onclick=()=>adminModal.style.display="none";
adminPanelClose.onclick=()=>adminPanel.style.display="none";

loadProducts();





