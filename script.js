ㅍimport { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
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

const provider=new GoogleAuthProvider();

const loginBtn=document.getElementById("loginBtn");
const logoutBtn=document.getElementById("logoutBtn");
const userEmail=document.getElementById("userEmail");

loginBtn.onclick=()=>signInWithPopup(auth,provider);
logoutBtn.onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{
if(user){
userEmail.textContent=user.email;
loginBtn.style.display="none";
logoutBtn.style.display="inline-block";
}else{
loginBtn.style.display="inline-block";
logoutBtn.style.display="none";
}
});




