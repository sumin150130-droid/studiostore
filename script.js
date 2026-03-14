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

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const userEmail=document.getElementById("userEmail");

const searchInput=document.getElementById("searchInput");
const productGrid=document.querySelector(".product-grid");

const sortAll=document.getElementById("sortAll");
const sortPopular=document.getElementById("sortPopular");
const sortLow=document.getElementById("sortLow");
const sortHigh=document.getElementById("sortHigh");

const provider=new GoogleAuthProvider();

loginBtn.onclick=()=>signInWithPopup(auth,provider);
logoutBtn.onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{

if(user){

userEmail.textContent=user.email;

loginBtn.style.display="none";
logoutBtn.style.display="inline-block";

}else{

userEmail.textContent="";

loginBtn.style.display="inline-block";
logoutBtn.style.display="none";

}

});

let productsData=[];

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

productGrid.appendChild(card);

});

}

searchInput.oninput=()=>{

const keyword=searchInput.value.toLowerCase();

renderProducts(productsData.filter(p=>p.name.toLowerCase().includes(keyword)));

};

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

loadProducts();





