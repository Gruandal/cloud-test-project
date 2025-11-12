const APP_VER = 1;
if (localStorage.getItem('mh.ver') != APP_VER) {
  localStorage.clear();
  localStorage.setItem('mh.ver', APP_VER);
}

const modal = document.getElementById("gachaModal");
const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");

openModal.onclick = () => modal.classList.add('show');
closeModal.onclick = () => modal.classList.remove('show');
window.onclick = e => { if (e.target === modal) modal.classList.remove('show'); }

const tasks = [
  { t: "深呼吸 30 秒", d: "找個安靜角落，慢吸慢吐 5 次。", c: "放鬆" },
  { t: "三件感恩", d: "寫下今天你感謝的三件小事。", c: "感恩" },
  { t: "傳一句鼓勵", d: "把一句鼓勵話傳給朋友或自己。", c: "自我鼓勵" },
  { t: "十分鐘散步", d: "到戶外或走廊走 10 分鐘。", c: "放鬆" },
  { t: "喝一杯水", d: "慢慢喝完一杯水，觀察身體感受。", c: "自我照顧" },
  { t: "拉伸 2 分鐘", d: "伸展肩頸與手臂，放鬆緊繃。", c: "放鬆" },
  { t: "今日亮點", d: "寫下一件讓你有成就感的小事。", c: "自我鼓勵" }
];

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

// === 🎰 扭蛋動畫 (使用 Generator.json) ===
const gachaAnim = lottie.loadAnimation({
  container: document.getElementById('gachaAnim'),
  renderer: 'svg',
  loop: false,
  autoplay: false,
  path: 'Generator.json' // 與 index.html 同層
});

$('#spin').addEventListener('click', () => {
  if (!chosenEmotion) { alert("請先選擇心情！"); return; }

  // 播放扭蛋動畫
  gachaAnim.goToAndPlay(0, true);

  gachaAnim.removeEventListener('complete');
  gachaAnim.addEventListener('complete', () => {
    const x = pickTask(chosenEmotion);
    $('#resultTitle').textContent = x.t;
    $('#resultDesc').textContent = x.d;
    $('#resultCat').textContent = x.c;
    $('#resultBadge').textContent = chosenEmotion;
    $('#result').style.display = 'block';

    setTimeout(() => {
      addPending(x);
      modal.classList.remove('show');
      $('#result').style.display = 'none';
      chosenEmotion = null;
      $$('.emotions button').forEach(x => x.style.filter = 'none');
      updateAll();
    }, 1500);
  });
});

// === 任務選取 ===
function pickTask(emotion) {
  const pool = [...tasks];
  if (emotion === '壓力') pool.push({ t: "3 分鐘寫下困擾", d: "把腦中擔心的事寫下來。", c: "覺察" });
  if (emotion === '焦慮') pool.push({ t: "方形呼吸×4", d: "吸 4 秒、停 4 秒、吐 4 秒、停 4 秒。", c: "放鬆" });
  if (emotion === '開心') pool.push({ t: "與人分享喜悅", d: "把今天開心的事分享給一個人。", c: "感恩" });
  const last = logs().slice(-1)[0];
  let pick;
  do { pick = pool[Math.floor(Math.random() * pool.length)]; }
  while (last && pick.t === last.t && pool.length > 1);
  return pick;
}

// === 儲存與讀取 ===
function logs() { return JSON.parse(localStorage.getItem('mh.logs') || '[]') }
function favs() { return JSON.parse(localStorage.getItem('mh.favs') || '[]') }
function pendings() { return JSON.parse(localStorage.getItem('mh.pending') || '[]') }

function saveLog(x) {
  const a = logs(); a.push(x);
  if (a.length > 500) a.shift();
  localStorage.setItem('mh.logs', JSON.stringify(a));
}
function saveFav(x) {
  const a = favs();
  if (!a.find(y => y.t === x.t)) a.push(x);
  localStorage.setItem('mh.favs', JSON.stringify(a));
}
function savePending(x) {
  const a = pendings(); a.push(x);
  localStorage.setItem('mh.pending', JSON.stringify(a));
}

function addPending(x) {
  savePending({ ...x, emotion: chosenEmotion, ts: Date.now() });
  renderPending();
}

// === 渲染區 ===
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
    el.querySelector('.btn-done').onclick = () => {
      const arr = pendings(); arr.splice(i, 1);
      localStorage.setItem('mh.pending', JSON.stringify(arr));
      saveLog(x);
      renderPending(); renderLog(); summarizeWeek(); calcStreak();
    };
    el.querySelector('.btn-fav').onclick = () => { saveFav(x); renderFavs(); };
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

  // 統計任務次數
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
    el.querySelector('.btn-fav').onclick = () => { saveFav(x); renderFavs(); };
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
    el.querySelector('.btn-fav-remove').onclick = () => {
      const newFavs = favs().filter(f => f.t !== x.t);
      localStorage.setItem('mh.favs', JSON.stringify(newFavs));
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
  clearBtn.addEventListener('click', () => {
    if (!confirm('確定清除所有資料？')) return;
    localStorage.removeItem('mh.logs');
    localStorage.removeItem('mh.favs');
    localStorage.removeItem('mh.pending');
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
