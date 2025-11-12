// === Firebase 初始化 ===
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } 
  from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ⚙️ 你的 Firebase Config（從 Console 複製）
const firebaseConfig = {
    apiKey: "AIzaSyCcbtsjKSFRBg66x-nVyOB0wljwilxTVqY",
    authDomain: "mood-gacha.firebaseapp.com",
    projectId: "mood-gacha",
    storageBucket: "mood-gacha.firebasestorage.app",
    messagingSenderId: "439343502117",
    appId: "1:439343502117:web:a09add8afb9de07ed5c0cc",
    measurementId: "G-7HCLV1Y6H8"
};
// ✅ 初始化
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
console.log("✅ Firebase initialized:", app.name);
const auth = getAuth(app);
const db = getFirestore(app);

// === 全域狀態 ===
let userDocRef = null;
let userData = { logs: [], favs: [], pending: [] };

// === 登入狀態監聽 ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("❌ 未登入，導向 login.html");
    window.location.href = "login.html";
    return;
  }

  console.log("✅ 登入中使用者：", user.email);
  const titleEl = document.querySelector(".h1");
  if (titleEl) titleEl.textContent = "心情卡片";
  const emailEl = document.getElementById("userEmail");
  if (emailEl) emailEl.textContent = `🔐 ${user.email}`;

  userDocRef = doc(db, "users", user.uid);

  // 確保使用者文件存在
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) {
    await setDoc(userDocRef, { logs: [], favs: [], pending: [] });
  }

  // 載入雲端資料
  const data = (await getDoc(userDocRef)).data();
  userData = { ...userData, ...data };

  // 若本地有舊 localStorage 資料 → 搬上雲端一次
  await migrateLocalToCloud();

  // 更新畫面
  updateAll();
});

// 將舊 localStorage 資料上傳一次後清除
async function migrateLocalToCloud() {
  const oldLogs = JSON.parse(localStorage.getItem("mh.logs") || "[]");
  const oldFavs = JSON.parse(localStorage.getItem("mh.favs") || "[]");
  const oldPending = JSON.parse(localStorage.getItem("mh.pending") || "[]");
  if (oldLogs.length || oldFavs.length || oldPending.length) {
    console.log("☁️ 偵測到舊本地資料，開始上傳至雲端...");
    await updateDoc(userDocRef, { logs: oldLogs, favs: oldFavs, pending: oldPending });
    localStorage.removeItem("mh.logs");
    localStorage.removeItem("mh.favs");
    localStorage.removeItem("mh.pending");
  }
}

// ✅ 登出功能
window.logout = async () => {
  console.log("🚪 嘗試登出中...");
  try {
    await signOut(auth);
    userData = { logs: [], favs: [], pending: [] };
    console.log("✅ 已登出");
    setTimeout(() => window.location.href = "login.html", 100);
  } catch (error) {
    console.error("❌ 登出失敗：", error);
    alert("登出失敗：" + error.message);
  }
};

// === Modal 操作 ===
const modal = document.getElementById("gachaModal");
const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");

if (openModal && closeModal && modal) {
  openModal.onclick = () => modal.classList.add('show');
  closeModal.onclick = () => modal.classList.remove('show');
  window.onclick = e => { if (e.target === modal) modal.classList.remove('show'); }
}

// === 任務清單 ===
const tasks = [
  { t: "深呼吸 30 秒", d: "找個安靜角落，慢吸慢吐 5 次。", c: "放鬆" },
  { t: "三件感恩", d: "寫下今天你感謝的三件小事。", c: "感恩" },
  { t: "傳一句鼓勵", d: "把一句鼓勵話傳給朋友或自己。", c: "自我鼓勵" },
  { t: "十分鐘散步", d: "到戶外或走廊走 10 分鐘。", c: "放鬆" },
  { t: "喝一杯水", d: "慢慢喝完一杯水，觀察身體感受。", c: "自我照顧" },
  { t: "拉伸 2 分鐘", d: "伸展肩頸與手臂，放鬆緊繃。", c: "放鬆" },
  { t: "今日亮點", d: "寫下一件讓你有成就感的小事。", c: "自我鼓勵" }
];

// === 選擇心情 ===
let chosenEmotion = null;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

$$('.emotions button').forEach(b => {
  b.addEventListener('click', () => {
    chosenEmotion = b.dataset.emotion;
    $$('.emotions button').forEach(x => x.style.filter = 'grayscale(60%)');
    b.style.filter = 'none';
  });
});

// === 🎰 扭蛋動畫 ===
const gachaAnim = lottie.loadAnimation({
  container: document.getElementById('gachaAnim'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'Generator.json'
});

$('#spin').addEventListener('click', () => {
  if (!chosenEmotion) { alert("請先選擇心情！"); return; }

  gachaAnim.goToAndPlay(0, true);
  gachaAnim.removeEventListener('complete');
  gachaAnim.addEventListener('complete', async () => {
    const x = pickTask(chosenEmotion);
    $('#resultTitle').textContent = x.t;
    $('#resultDesc').textContent = x.d;
    $('#resultCat').textContent = x.c;
    $('#resultBadge').textContent = chosenEmotion;
    $('#result').style.display = 'block';

    setTimeout(async () => {
      await addPending(x);
      modal.classList.remove('show');
      $('#result').style.display = 'none';
      chosenEmotion = null;
      $$('.emotions button').forEach(x => x.style.filter = 'none');
      updateAll();
    }, 1500);
  });
});

// === 任務邏輯 ===
function pickTask(emotion) {
  const pool = [...tasks];
  if (emotion === '壓力') pool.push({ t: "3 分鐘寫下困擾", d: "把腦中擔心的事寫下來。", c: "覺察" });
  if (emotion === '焦慮') pool.push({ t: "方形呼吸×4", d: "吸 4 秒、停 4 秒、吐 4 秒、停 4 秒。", c: "放鬆" });
  if (emotion === '開心') pool.push({ t: "與人分享喜悅", d: "把今天開心的事分享給一個人。", c: "感恩" });
  const last = userData.logs.slice(-1)[0];
  let pick;
  do { pick = pool[Math.floor(Math.random() * pool.length)]; }
  while (last && pick.t === last.t && pool.length > 1);
  return pick;
}

// === 雲端資料操作 ===
async function saveLog(x) {
  const a = [...userData.logs, x];
  if (a.length > 500) a.shift();
  userData.logs = a;
  await updateDoc(userDocRef, { logs: a });
}

async function saveFav(x) {
  const a = [...userData.favs];
  if (!a.find(y => y.t === x.t)) a.push(x);
  userData.favs = a;
  await updateDoc(userDocRef, { favs: a });
}

async function savePending(x) {
  const a = [...userData.pending, x];
  userData.pending = a;
  await updateDoc(userDocRef, { pending: a });
}

async function addPending(x) {
  await savePending({ ...x, emotion: chosenEmotion, ts: Date.now() });
  renderPending();
}

// === 資料存取器 ===
function logs() { return userData.logs; }
function favs() { return userData.favs; }
function pendings() { return userData.pending; }

// === 畫面渲染 ===
function renderPending() {
  const box = $('#pendingTasks');
  const data = pendings();
  box.innerHTML = data.length ? "" : "<div class='small'>尚無任務</div>";
  data.forEach((x, i) => {
    const el = document.createElement('div');
    el.className = "pending-item";
    el.innerHTML = `<div><b>${x.t}</b><br><small>${x.c}｜${x.d}</small></div>
      <div class="pending-actions">
        <button class="btn-done">已完成</button>
        <button class="btn-fav">加入清單</button>
      </div>`;
    el.querySelector('.btn-done').onclick = async () => {
      const arr = pendings(); arr.splice(i, 1);
      userData.pending = arr;
      await updateDoc(userDocRef, { pending: arr });
      await saveLog(x);
      renderPending(); renderLog(); summarizeWeek(); calcStreak();
    };
    el.querySelector('.btn-fav').onclick = async () => { await saveFav(x); renderFavs(); };
    box.appendChild(el);
  });
}

function renderLog() {
  const box = $('#log');
  box.innerHTML = '';
  const data = logs().slice(-30).reverse();
  if (data.length === 0) {
    box.innerHTML = '<div class="small">尚無紀錄</div>';
    return;
  }
  const countMap = {};
  data.forEach(x => { countMap[x.t] = (countMap[x.t] || 0) + 1; });
  data.forEach(x => {
    const el = document.createElement('div');
    el.className = 'item';
    const times = countMap[x.t];
    el.innerHTML = `
      <div>
        <div><b>${x.t}</b> <span class="small">（已完成 ${times} 次）</span></div>
        <div class="meta">${x.c}｜${x.emotion}｜${fmtDate(x.ts)}</div>
      </div>
      <div class="log-actions">
        <button class="btn-fav">加入清單</button>
      </div>`;
    el.querySelector('.btn-fav').onclick = async () => { await saveFav(x); renderFavs(); };
    box.appendChild(el);
  });
}

function renderFavs() {
  const box = $('#favorites'); box.innerHTML = '';
  const data = favs();
  if (data.length === 0) { box.innerHTML = '<div class="small">尚無清單</div>'; return }
  data.forEach(x => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div>
      <div>${x.t}</div>
      <div class="meta">${x.c}｜${x.d}</div>
    </div><button class="btn-fav-remove">✕</button>`;
    el.querySelector('.btn-fav-remove').onclick = async () => {
      const newFavs = favs().filter(f => f.t !== x.t);
      userData.favs = newFavs;
      await updateDoc(userDocRef, { favs: newFavs });
      renderFavs();
    };
    box.appendChild(el);
  });
}

function summarizeWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const data = logs().filter(x => x.ts >= start.getTime());
  const total = data.length;
  const reds = data.filter(x => x.emotion === '壓力').length;
  const blues = data.filter(x => x.emotion === '焦慮').length;
  const yellows = data.filter(x => x.emotion === '開心').length;
  const max = Math.max(1, reds, blues, yellows, total);
  $('#barTasks').style.width = (total / max * 100) + '%';
  $('#barRed').style.width = (reds / max * 100) + '%';
  $('#barBlue').style.width = (blues / max * 100) + '%';
  $('#barYellow').style.width = (yellows / max * 100) + '%';
  $('#barTasks').textContent = total;
  $('#barRed').textContent = reds;
  $('#barBlue').textContent = blues;
  $('#barYellow').textContent = yellows;
  const todayCount = data.filter(x => {
    const d = new Date(x.ts);
    return d.toDateString() === new Date().toDateString();
  }).length;
  const s = start.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
  const e = now.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
  $('#weekRange').textContent = `區間 ${s}–${e} ｜ 本週完成 ${total} ｜ 今日完成 ${todayCount}`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function calcStreak() {
  const data = logs();
  const days = new Set(data.map(x => new Date(x.ts).toDateString()));
  let streak = 0;
  const check = new Date();
  while (days.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  $('#streak').textContent = `連續天數 ${streak}`;
}

function updateAll() {
  renderLog(); renderFavs(); renderPending(); summarizeWeek(); calcStreak();
}

// 清除資料
const clearBtn = $('#clear');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    if (!confirm('確定清除所有資料？')) return;
    userData = { logs: [], favs: [], pending: [] };
    await updateDoc(userDocRef, userData);
    updateAll();
  });
}

// 匯出紀錄
const exportBtn = document.createElement('button');
exportBtn.className = 'btn ghost';
exportBtn.id = 'export';
exportBtn.textContent = '匯出紀錄';
$('.footer').appendChild(exportBtn);
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(logs(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mood-log.json';
  a.click();
});

updateAll();
