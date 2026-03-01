import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const provider = new GoogleAuthProvider();

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(window.auth, provider);
  } catch (error) {
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(window.auth);
});

onAuthStateChanged(window.auth, (user) => {
  if (user) {
    console.log("로그인됨:", user.email);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
});

