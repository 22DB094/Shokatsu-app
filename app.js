// ✅ app.js：チャット相手一覧機能付き（完全なコード）

const firebaseConfig = {
  apiKey: "AIzaSyCJwlA-t2Cm-YS5LNEIDdst-3Nudd-xAe0",
  authDomain: "chat-tokumei.firebaseapp.com",
  projectId: "chat-tokumei",
  storageBucket: "chat-tokumei.firebasestorage.app",
  messagingSenderId: "376405206608",
  appId: "1:376405206608:web:f2117d4b31435cbb581355"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const nicknameInput = document.getElementById("nickname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const logoutBtn = document.getElementById("logout-btn");
const welcomeName = document.getElementById("welcome-name");
const authSection = document.getElementById("auth-section");
const mainContent = document.getElementById("main-content");
const authMessage = document.getElementById("auth-message");

const postForm = document.getElementById("post-form");
const postsContainer = document.getElementById("posts");
const chatPage = document.getElementById("chat-page");
const chatBox = document.getElementById("chat-box");
const chatMessageInput = document.getElementById("chat-message");
const sendChatBtn = document.getElementById("send-chat");
const backBtn = document.getElementById("back-btn");

const showChatListBtn = document.getElementById("show-chat-list");
const chatListSection = document.getElementById("chat-list-section");
const chatList = document.getElementById("chat-list");
const chatListClose = document.getElementById("chat-list-close");

let currentChatPostId = "";
let unsubscribeChat = null;

// 🔐 新規登録
registerBtn.onclick = async () => {
  authMessage.textContent = "";
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const nickname = nicknameInput.value.trim();
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection("users").doc(cred.user.uid).set({ nickname });
  } catch (err) {
    authMessage.textContent = err.message;
  }
};

// 🔐 ログイン
loginBtn.onclick = async () => {
  authMessage.textContent = "";
  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    authMessage.textContent = err.message;
  }
};

// 🔓 ログアウト
logoutBtn.onclick = () => auth.signOut();

// ログイン状態の監視
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const doc = await db.collection("users").doc(user.uid).get();
    const nickname = doc.data()?.nickname || "匿名さん";
    authSection.style.display = "none";
    mainContent.style.display = "block";
    welcomeName.textContent = nickname;
    loadPosts();
  } else {
    authSection.style.display = "block";
    mainContent.style.display = "none";
    welcomeName.textContent = "";
  }
});

// 投稿送信
postForm.onsubmit = async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  const doc = await db.collection("users").doc(user.uid).get();
  const nickname = doc.data()?.nickname;

  const industry = document.getElementById("industry").value;
  const company = document.getElementById("company-name").value;
  const title = document.getElementById("post-title").value;
  const content = document.getElementById("post-content").value;

  await db.collection("posts").add({
    uid: user.uid,
    nickname,
    industry,
    company,
    title,
    content,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  postForm.reset();
  alert("投稿が完了しました！");
};

// 投稿一覧表示
function loadPosts() {
  db.collection("posts").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const time = data.createdAt?.toDate().toLocaleString("ja-JP") || "";
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <h3>${data.title}</h3>
        <p><strong>${data.company}（${data.industry}）</strong></p>
        <p>${data.content}</p>
        <p><small>投稿者: ${data.nickname} ｜ ${time}</small></p>
        <button onclick="openChat('${doc.id}', '${data.uid}')">この投稿者とチャット</button>
      `;
      postsContainer.appendChild(div);
    });
  });
}

// チャットを開く
window.openChat = async function(postId, partnerUid) {
  const user = auth.currentUser;
  if (!user) return;

  currentChatPostId = postId;
  mainContent.style.display = "none";
  chatPage.style.display = "block";

  if (unsubscribeChat) unsubscribeChat();
  unsubscribeChat = db.collection("chats").doc(postId).collection("messages").orderBy("timestamp")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";
      snapshot.forEach(doc => {
        const msg = doc.data();
        const isSelf = msg.uid === user.uid;
        const time = msg.timestamp?.toDate().toLocaleTimeString("ja-JP") || "";
        const div = document.createElement("div");
        div.className = `chat-message ${isSelf ? "self" : "other"}`;
        div.innerHTML = `<span>${msg.message}</span><br><small>${time}</small>`;
        chatBox.appendChild(div);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
};

// メッセージ送信とチャットルーム記録
sendChatBtn.onclick = async () => {
  const user = auth.currentUser;
  const message = chatMessageInput.value.trim();
  if (!user || !message || !currentChatPostId) return;

  const nicknameDoc = await db.collection("users").doc(user.uid).get();
  const nickname = nicknameDoc.data()?.nickname || "匿名さん";

  await db.collection("chats").doc(currentChatPostId).collection("messages").add({
    uid: user.uid,
    sender: nickname,
    message,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await db.collection("users").doc(user.uid).collection("chatRooms").doc(currentChatPostId).set({
    lastMessage: message,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  chatMessageInput.value = "";
};

// 戻るボタン
backBtn.onclick = () => {
  chatPage.style.display = "none";
  mainContent.style.display = "block";
};

// ✅ チャット相手一覧表示
showChatListBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  chatListSection.style.display = "block";
  mainContent.style.display = "none";

  const snapshot = await db.collection("users").doc(user.uid).collection("chatRooms").orderBy("updatedAt", "desc").get();
  chatList.innerHTML = "";

  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>投稿ID: ${doc.id}</strong><br>
      最後のメッセージ: ${data.lastMessage || ""}<br>
      更新: ${data.updatedAt?.toDate().toLocaleString("ja-JP") || ""}<br>
      <button onclick="openChat('${doc.id}')">チャットを開く</button>
      <hr>
    `;
    chatList.appendChild(div);
  });
};

chatListClose.onclick = () => {
  chatListSection.style.display = "none";
  mainContent.style.display = "block";
};