const tasks=[
  {t:"深呼吸 30 秒",d:"找個安靜角落，慢吸慢吐 5 次。",c:"放鬆"},
  {t:"三件感恩",d:"寫下今天你感謝的三件小事。",c:"感恩"},
  {t:"傳一句鼓勵",d:"把一句鼓勵話傳給朋友或自己。",c:"自我鼓勵"},
  {t:"十分鐘散步",d:"到戶外或走廊走 10 分鐘。",c:"放鬆"},
  {t:"喝一杯水",d:"慢慢喝完一杯水，觀察身體感受。",c:"自我照顧"},
  {t:"拉伸 2 分鐘",d:"伸展肩頸與手臂，放鬆緊繃。",c:"放鬆"},
  {t:"今日亮點",d:"寫下一件讓你有成就感的小事。",c:"自我鼓勵"}
]
let chosenEmotion=null
const $=s=>document.querySelector(s)
const $$=s=>document.querySelectorAll(s)
$$('.emotions button').forEach(b=>b.addEventListener('click',()=>{
  chosenEmotion=b.dataset.emotion;
  $$('.emotions button').forEach(x=>x.style.filter='grayscale(60%)');
  b.style.filter='none'
}))
$('#spin').addEventListener('click',()=>{
  if(!chosenEmotion)return;
  const x=pickTask(chosenEmotion);
  renderTask(x)
})
$('#done').addEventListener('click',()=>{
  const t=$('#taskTitle').textContent;
  if(!t)return;
  saveLog({t,emotion:chosenEmotion,cat:$('#taskTag').textContent,ts:Date.now()});
  $('#kudos').classList.add('show');
  setTimeout(()=>$('#kudos').classList.remove('show'),1500);
  updateAll()
})
$('#fav').addEventListener('click',()=>{
  const t=$('#taskTitle').textContent;
  const d=$('#taskDesc').textContent;
  const c=$('#taskTag').textContent;
  if(!t)return;
  saveFav({t,d,c});
  renderFavs()
})
$('#clear').addEventListener('click',()=>{
  localStorage.removeItem('mh.logs');
  localStorage.removeItem('mh.favs');
  updateAll()
})
function pickTask(emotion){
  const pool=tasks.slice();
  if(emotion==='壓力'){
    pool.push({t:"3 分鐘寫下困擾",d:"把腦中擔心的事寫下來。",c:"覺察"})
  }
  if(emotion==='焦慮'){
    pool.push({t:"方形呼吸×4",d:"吸 4 秒、停 4 秒、吐 4 秒、停 4 秒。",c:"放鬆"})
  }
  if(emotion==='開心'){
    pool.push({t:"與人分享喜悅",d:"把今天開心的事分享給一個人。",c:"感恩"})
  }
  return pool[Math.floor(Math.random()*pool.length)]
}
function renderTask(x){
  $('#task').style.display='grid';
  $('#taskTitle').textContent=x.t;
  $('#taskDesc').textContent=x.d;
  $('#taskTag').textContent=x.c
}
function logs(){return JSON.parse(localStorage.getItem('mh.logs')||'[]')}
function favs(){return JSON.parse(localStorage.getItem('mh.favs')||'[]')}
function saveLog(x){
  const a=logs();a.push(x);
  localStorage.setItem('mh.logs',JSON.stringify(a))
}
function saveFav(x){
  const a=favs();
  if(!a.find(y=>y.t===x.t))a.push(x);
  localStorage.setItem('mh.favs',JSON.stringify(a))
}
function fmtDate(ts){
  const d=new Date(ts);
  return d.toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
}
function updateStreak(){
  const a=logs().map(x=>new Date(x.ts));
  if(a.length===0){$('#streak').textContent='連續天數 0';return}
  a.sort((p,q)=>q-p);
  let streak=1;
  let cur=new Date();cur.setHours(0,0,0,0);
  for(let i=0;i<a.length;i++){
    const d=new Date(a[i]);d.setHours(0,0,0,0);
    if(i===0){
      if((cur-d)/(1000*60*60*24)>1){streak=0;break}
    }else{
      const prev=new Date(a[i-1]);prev.setHours(0,0,0,0);
      const gap=(prev-d)/(1000*60*60*24);
      if(gap>=1&&gap<=2)streak++;
      else if(gap>2)break
    }
  }
  $('#streak').textContent='連續天數 '+streak
}
function summarizeWeek(){
  const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
  const data=logs().filter(x=>x.ts>=start.getTime());
  const total=data.length;
  const reds=data.filter(x=>x.emotion==='壓力').length;
  const blues=data.filter(x=>x.emotion==='焦慮').length;
  const yellows=data.filter(x=>x.emotion==='開心').length;
  const max=Math.max(1,total,reds,blues,yellows);
  $('#barTasks').style.width=(total/max*100)+'%';
  $('#barRed').style.width=(reds/max*100)+'%';
  $('#barBlue').style.width=(blues/max*100)+'%';
  $('#barYellow').style.width=(yellows/max*100)+'%';
  const s=start.toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'});
  const e=now.toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'});
  $('#weekRange').textContent='區間 '+s+'–'+e+' ｜ 本週完成 '+total
}
function renderLog(){
  const box=$('#log');box.innerHTML='';
  const data=logs().slice(-30).reverse();
  if(data.length===0){box.innerHTML='<div class="small">尚無紀錄</div>';return}
  data.forEach(x=>{
    const el=document.createElement('div');
    el.className='item';
    el.innerHTML=`<div><div>${x.t}</div><div class="meta">${x.cat}｜${x.emotion}｜${fmtDate(x.ts)}</div></div><button class="reset">刪除</button>`;
    el.querySelector('button').onclick=()=>{
      const a=logs().filter(y=>!(y.ts===x.ts&&y.t===x.t));
      localStorage.setItem('mh.logs',JSON.stringify(a));
      updateAll()
    };
    box.appendChild(el)
  })
}
function renderFavs(){
  const box=$('#favorites');box.innerHTML='';
  const data=favs();
  if(data.length===0){box.innerHTML='<div class="small">尚無清單</div>';return}
  data.forEach(x=>{
    const el=document.createElement('div');
    el.className='item';
    el.innerHTML=`<div><div>${x.t}</div><div class="meta">${x.c}｜${x.d}</div></div><button class="reset">移除</button>`;
    el.querySelector('button').onclick=()=>{
      const a=favs().filter(y=>y.t!==x.t);
      localStorage.setItem('mh.favs',JSON.stringify(a));
      renderFavs()
    };
    box.appendChild(el)
  })
}
function updateAll(){
  renderLog();renderFavs();summarizeWeek();updateStreak()
}
updateAll()
