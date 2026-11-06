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
 for(const [id,type] of [['paper-n','paper'],['patent-n','patent'],['all-n','all']])$(id).textContent=type==='all'?rows.length:rows.filter(r=>r.type===type).length;
 for(const [i,category] of PATENT_CATEGORIES.entries())$('category-count-'+i).textContent=rows.filter(r=>r.type==='patent'&&r.category===category).length;
 const years=[...new Set(rows.map(r=>r.year).filter(Boolean))].sort((a,b)=>b-a);years.forEach(y=>$('year').add(new Option(y,y)));if(rows.some(r=>!r.year))$('year').add(new Option('年份未列出','unknown'));
 chooseType(activeType);
}
loadRecords().catch(()=>{$('result-count').textContent='已显示核验快照，筛选功能暂不可用';});
loadContent().catch(()=>{});

if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stats') === '1') {
 const counterScript = document.querySelector('script[data-goatcounter]');
 if (counterScript) {
  const dashboard = new URL('/', counterScript.dataset.goatcounter);
  const panel = document.createElement('section');
  panel.id = 'visitor-stats';
  panel.className = 'section';
  panel.setAttribute('aria-labelledby', 'visitor-stats-heading');
  panel.innerHTML = `<h2 id="visitor-stats-heading">访问统计</h2>
   <p>登录 GoatCounter 后查看。<a class="text-link" target="_blank" rel="noopener noreferrer">在统计后台打开 ↗</a></p>
   <iframe title="GoatCounter 访问统计" style="display:block;width:100%;height:75vh;min-height:420px;border:1px solid #dce0d8"></iframe>`;
  panel.querySelector('a').href = dashboard.href;
  panel.querySelector('iframe').src = dashboard.href;
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
