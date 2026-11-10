'use strict';
let profile,activeType=typeof location!=='undefined'&&new URLSearchParams(location.search).get('view')==='patents'?'patent':'all',activeCategory='all';
const $=id=>document.getElementById(id);
const visibleRecords=()=>profile.publications.filter(p=>p.type!=='patent'||p.status!=='excluded');
function chooseType(type){activeType=type;if(type!=='patent')activeCategory='all';document.querySelectorAll('[data-type]').forEach(b=>{b.classList.toggle('active',b.dataset.type===type);b.setAttribute('aria-pressed',b.dataset.type===type?'true':'false');});render();}
function chooseCategory(category){activeCategory=category;chooseType('patent');}
function render(){
 if(!profile)return;
 const query=$('search').value.trim().toLowerCase(),year=$('year').value,sort=$('sort').value,status=$('patent-status').value;
 const rows=visibleRecords().filter(p=>(activeType==='all'||p.type===activeType)&&(year==='all'||(p.year||'unknown')===year)&&(p.type!=='patent'||status==='all'||p.status===status)&&(p.type!=='patent'||activeCategory==='all'||p.category===activeCategory)&&(!query||recordSearchText(p).includes(query)));
 rows.sort(sort==='citations'?(a,b)=>citationNumber(b)-citationNumber(a)||dateOrder(a,b):sort==='title'?(a,b)=>a.title.localeCompare(b.title):dateOrder);
 $('result-count').textContent=`显示 ${rows.length} 条记录`;
 $('publication-list').innerHTML=rows.length?(activeType==='patent'&&activeCategory==='all'?PATENT_CATEGORIES.map(category=>{const group=rows.filter(p=>p.category===category);return group.length?`<section class="patent-category-section"><h3 class="patent-category-heading">${escapeHtml(category)}<span>${group.length} 组</span></h3>${group.map(recordMarkup).join('')}</section>`:'';}).join(''):rows.map(recordMarkup).join('')):'<p class="empty">没有找到匹配的记录。试试其他关键词、状态或年份。</p>';
 $('patent-status-wrap').hidden=activeType==='paper';
 $('category-filters').hidden=activeType==='paper';
 document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===activeCategory);b.setAttribute('aria-pressed',String(b.dataset.category===activeCategory));});
}
const dataRevision=Date.now().toString(36);
const dataUrl=path=>{const version=document.documentElement?.dataset?.siteVersion||'current';return path+(path.includes('?')?'&':'?')+'v='+encodeURIComponent(version)+'&revision='+dataRevision;};
const fetchData=path=>fetch(dataUrl(path),{cache:'no-store'});
const readJson=async (path,optional=false)=>{const r=await fetchData(path);if(optional&&r.status===404)return null;if(!r.ok)throw Error(path+': '+r.status);return r.json();};
async function loadContent(){
 const names=['contact','site','interests'];
 const values=await Promise.allSettled(names.map(async name=>{const r=await fetchData('content/'+name+'.json');if(r.status===404)return null;if(!r.ok)throw Error(r.status);const text=await r.text();try{return JSON.parse(text);}catch(error){return JSON.parse(text.replace(/“([^“”\r\n]+)”\s*:/g,(_,key)=>JSON.stringify(key)+':'));}}));
 const basic=await fetchData('content/basic-info.md');if(!basic.ok&&basic.status!==404)throw Error('Cannot load basic information');
 const c=Object.fromEntries(names.map((name,i)=>[name,values[i].status==='fulfilled'?values[i].value:null]));applyContent(mergeBasicInfo(c,basic.status===404?'':await basic.text()));
}
async function loadRecords(){
 const [metadata,patentIndex,paperIndex]=await Promise.all([readJson('profile.json',true),readJson('patents/index.json',true),readJson('publications/index.json',true)]);
 const p=metadata||{};
 const index=patentIndex||{files:[]};
 if(!Array.isArray(index.files)||!index.files.every(f=>/^patents\/family-\d+\.json$/.test(f)))throw Error('Invalid patent index');
 const patents=(await Promise.all(index.files.map(f=>readJson(f,true)))).filter(Boolean);
 const paperFiles=paperIndex?.files||[];
 if(!paperFiles.every(f=>/^publications\/paper-\d+\.json$/.test(f)))throw Error('Invalid paper index');
 const papers=(await Promise.all(paperFiles.map(f=>readJson(f,true)))).filter(Boolean).filter(p=>p.hidden!==true);
 if(patents.some(p=>!p.id||!Array.isArray(p.members)||typeof p.title!=='string'))throw Error('Invalid patent data');
 p.publications=[...papers,...patents];profile=p;
 if(!p.metrics){const n=$('scholar-metrics');if(n)n.hidden=true;}
 const rows=visibleRecords();$('record-count').textContent=rows.length;$('citation-count').textContent=Number(p.metrics?.citations||0).toLocaleString('en-US');$('h-index').textContent=p.metrics?.hIndex||'—';
 const sync = p.metricsSync || {};
 const stamp = sync.succeededAt || p.retrievedAt;
 const note = document.getElementById('scholar-sync-note');
 if (note) {
  const date = stamp ? new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai', dateStyle:'short', timeStyle:'short'}).format(new Date(stamp)) : '待同步';
  note.textContent = (sync.status === 'error' ? '同步暂未成功 · 上次更新 ' : '最近更新 ') + date;
 }
 for(const [id,type] of [['paper-n','paper'],['patent-n','patent'],['all-n','all']])$(id).textContent=type==='all'?rows.length:rows.filter(r=>r.type===type).length;
 for(const [i,category] of PATENT_CATEGORIES.entries())$('category-count-'+i).textContent=rows.filter(r=>r.type==='patent'&&r.category===category).length;
 const years=[...new Set(rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a);years.forEach(y=>$('year').add(new Option(y,y)));if(rows.some(r=>!r.year))$('year').add(new Option('年份未列出','unknown'));
 chooseType(activeType);
}
loadRecords().catch(()=>{$('result-count').textContent='已显示核验快照，筛选功能暂不可用';});
loadContent().catch(()=>{});

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stats') === '1') {
 const counterScript = document.querySelector('#goatcounter-config');
 if (counterScript) {
  const dashboard = new URL('/', counterScript.dataset.goatcounter);
  const totals = new URL('/api/v0/stats/total', dashboard);
  // Analytics started on 2026-11-06. Include the full first day.
  totals.searchParams.set('start', '2026-11-05T16:00:00Z');
  const panel = document.createElement('section');
  panel.id = 'visitor-stats';
  panel.className = 'section visitor-stats';
  panel.setAttribute('aria-labelledby', 'visitor-stats-heading');
  panel.innerHTML = `<h2 id="visitor-stats-heading">访问统计</h2>
   <form class="stats-unlock" autocomplete="off">
    <label>GoatCounter 只读统计密钥 <input type="password" required autocomplete="off" spellcheck="false"></label>
    <button class="button" type="submit">查看访问量</button>
    <a class="text-link stats-backend" target="_blank" rel="noopener noreferrer">打开 GoatCounter ↗</a>
   </form>
   <p class="stats-status" role="status"></p>
   <div class="stats-summary" hidden>
    <p><span>累计访问量</span><strong aria-live="polite">—</strong></p>
    <button class="button stats-details-toggle" type="button" aria-expanded="false" aria-controls="visit-details">详细信息</button>
   </div>
   <div id="visit-details" class="stats-details" hidden>
    <p>最近 7 天有访问的时段，按 GoatCounter 后台时区显示。</p>
    <table><thead><tr><th scope="col">访问时段</th><th scope="col">访问量</th></tr></thead><tbody></tbody></table>
    <p class="stats-empty" hidden>最近 7 天没有访问记录。</p>
    <p>如需逐条时间，可在 GoatCounter 开启 Individual pageviews 后导出。<a class="text-link stats-backend" target="_blank" rel="noopener noreferrer">打开统计后台 ↗</a></p>
   </div>`;
  panel.querySelectorAll('.stats-backend').forEach(link => { link.href = dashboard.href; });
  const form = panel.querySelector('form');
  const input = form.querySelector('input');
  const submit = form.querySelector('button');
  const status = panel.querySelector('.stats-status');
  const summary = panel.querySelector('.stats-summary');
  const details = panel.querySelector('.stats-details');
  const toggle = panel.querySelector('.stats-details-toggle');
  toggle.addEventListener('click', () => {
   details.hidden = !details.hidden;
   toggle.setAttribute('aria-expanded', String(!details.hidden));
  });
  form.addEventListener('submit', async event => {
   event.preventDefault();
   const key = input.value.trim();
   input.value = '';
   if (!key || submit.disabled) return;
   submit.disabled = true;
   status.textContent = '正在读取访问量…';
   try {
    const response = await fetch(totals, {
     headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
     credentials: 'omit', redirect: 'error', cache: 'no-store',
     signal: AbortSignal.timeout(15000)
    });
    if (response.status === 401 || response.status === 403) {
     status.textContent = '请检查密钥是否有效，并确认已勾选 Read statistics。';
     return;
    }
    if (!response.ok) throw new Error('Statistics request failed');
    const data = await response.json();
    if (!Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid total');
    const rows = [];
    const days = Array.isArray(data.stats) ? data.stats.slice(-7).reverse() : [];
    for (const day of days) {
     if (!Array.isArray(day.hourly)) continue;
     for (let hour = 23; hour >= 0; hour--) {
      const count = day.hourly[hour];
      if (!Number.isSafeInteger(count) || count <= 0) continue;
      const row = document.createElement('tr');
      const timeCell = row.insertCell();
      timeCell.textContent = day.day + ' ' + String(hour).padStart(2, '0') + ':00';
      row.insertCell().textContent = count.toLocaleString('zh-CN');
      rows.push(row);
     }
    }
    details.querySelector('tbody').replaceChildren(...rows);
    details.querySelector('table').hidden = rows.length === 0;
    details.querySelector('.stats-empty').hidden = rows.length > 0;
    summary.querySelector('strong').textContent = data.total.toLocaleString('zh-CN');
    form.hidden = true;
    summary.hidden = false;
    status.textContent = '';
   } catch {
    status.textContent = '暂时无法读取访问量，请重试或打开统计后台。';
   } finally {
    submit.disabled = false;
   }
  });
  $('research').before(panel);
 }
}

let checkingPublication=false;
async function checkPublishedVersion(){
 if(checkingPublication||document.visibilityState==='hidden'||!document.documentElement?.dataset?.siteVersion)return;
 checkingPublication=true;
 try{
  const r=await fetch('version.json?check='+Date.now(),{cache:'no-store'});if(!r.ok)return;
  const latest=await r.json();if(!/^[a-f0-9]{12}$/.test(latest.version))return;
  const current=document.documentElement.dataset.siteVersion;
  if(latest.version!==current){const url=new URL(window.location.href);if(url.searchParams.get('v')!==latest.version){url.searchParams.set('v',latest.version);window.location.replace(url.href);}}
 }catch{}finally{checkingPublication=false;}
}
if(typeof window!=='undefined'){
 checkPublishedVersion();
 window.addEventListener('focus',checkPublishedVersion);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkPublishedVersion();});
 window.setInterval(checkPublishedVersion,60000);
}
document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>chooseType(b.dataset.type)));
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>chooseCategory(b.dataset.category)));
['search','year','sort','patent-status'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('show-patents').addEventListener('click',()=>{$('search').value='';$('year').value='all';$('patent-status').value='all';activeCategory='all';chooseType('patent');$('research').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
