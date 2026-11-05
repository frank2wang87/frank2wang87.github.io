'use strict';
function parseBasicInfo(text){
 const clean=v=>/^[【\[]?待填写/.test(String(v).trim())?'':String(v||'').trim();
 const info={},work=[],education=[],intro=[];let section='',entry=null;
 for(const raw of String(text||'').replace(/\r/g,'').split('\n')){
  const line=raw.trim();if(line.startsWith('>')||/^# /.test(line))continue;
  if(/^## /.test(line)){section=line.slice(3).trim();entry=null;continue;}
  if(/^### /.test(line)){entry={};if(section==='工作经历')work.push(entry);else if(section==='教育经历')education.push(entry);continue;}
  if(section==='个人介绍'){intro.push(raw);continue;}
  const m=line.match(/^([^：:]+)[：:]\s*(.*)$/);if(m){const value=clean(m[2]);if(section==='个人信息')info[m[1].trim()]=value;else if(entry)entry[m[1].trim()]=value;}
 }
 const dates=(a,b)=>a&&b?`${a} — ${b}`:a?`起始：${a}`:b?`结束：${b}`:'';
 const experience=work.filter(x=>x['单位']||x['岗位']||x['工作方向']).map(x=>({title:x['单位']||'',subtitle:x['岗位']||'',startDate:x['开始时间']||'',endDate:x['结束时间']||'',date:dates(x['开始时间'],x['结束时间']),direction:x['工作方向']||'',directionLabel:'工作方向',description:x['工作内容']||''}));
 const schools=education.filter(x=>x['学校']||x['专业']||x['专业方向']).map(x=>({title:x['学校']||'',subtitle:[x['学位'],x['专业']].filter(Boolean).join(' · '),startDate:x['入学时间']||'',endDate:x['毕业时间']||'',date:dates(x['入学时间'],x['毕业时间']),direction:x['专业方向']||'',directionLabel:'专业方向',description:x['学习或研究内容']||''}));
 const names={'深度学习':'Deep Learning','计算机视觉':'Computer Vision','计算机体系结构':'Computer Architecture','大模型':'Large Language Models','通用AI':'General AI','通用 AI':'General AI'};
 return {profile:{name:info['姓名']||'',nameEn:info['英文姓名']||'',affiliation:info['当前机构']||''},about:intro.join('\n').trim(),experience,education:schools,interests:(info['研究方向']||'').split(/[；;、]/).map(x=>x.trim()).filter(Boolean).map(x=>({name:names[x]||x,translation:names[x]?x:''}))};
}
const mergeBasicInfo=(c,text)=>{const basic=parseBasicInfo(text);return {...c,...basic,interests:Array.isArray(c.interests)?c.interests:basic.interests};};
function contactEntries(contact){
 const rows=[];const entries=Object.entries(contact||{}),get=keys=>entries.find(([k,v])=>keys.includes(k.toLowerCase())&&typeof v==='string')?.[1]?.trim()||'';
 const email=get(['email','emailaddress','emailurl','邮箱']).replace(/^mailto:/i,'');
 if(email&&!/[\s<>?&#]/.test(email)&&/^[^@]+@[^@]+\.[^@]+$/.test(email))rows.push({label:'Email',text:email,url:'mailto:'+encodeURIComponent(email).replace(/%40/g,'@')});
 const known=new Set(['scholarurl','githuburl','email','emailaddress','emailurl','邮箱','links']);
 for(const [key,value] of entries)if(!known.has(key.toLowerCase())&&typeof value==='string'&&/^https?:\/\//i.test(value))rows.push({label:key.replace(/Url$/i,''),text:key.replace(/Url$/i,''),url:safeUrl(value)});
 for(const link of Array.isArray(contact?.links)?contact.links:[])if(link&&typeof link.url==='string'&&/^https?:\/\//i.test(link.url))rows.push({label:link.label||'链接',text:link.label||'链接',url:safeUrl(link.url)});
 return rows;
}
function introMarkup(text){
 const inline=line=>escapeHtml(line).replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>');
 return String(text||'').trim().split(/\n\s*\n/).filter(Boolean).map(block=>{
  const lines=block.split('\n'),parts=[];let paragraph=[],bullets=[];
  const flushParagraph=()=>{if(paragraph.length){parts.push(`<p class="intro">${paragraph.map(inline).join('<br>')}</p>`);paragraph=[];}};
  const flushBullets=()=>{if(bullets.length){parts.push(`<ul class="intro intro-list">${bullets.map(line=>`<li>${inline(line)}</li>`).join('')}</ul>`);bullets=[];}};
  for(const line of lines){const bullet=line.match(/^\s*(?:[•·]|[-*]\s)\s*(.+)$/);if(bullet){flushParagraph();bullets.push(bullet[1]);}else{flushBullets();paragraph.push(line);}}
  flushParagraph();flushBullets();return `<div class="intro-group">${parts.join('')}</div>`;
 }).join('');
}
function contentFragments(c){
 const p=c.profile||{},s=c.site||{},contact=c.contact||{},interests=Array.isArray(c.interests)?c.interests:[];
 const e=escapeHtml,link=(u,t,cls='')=>external(u,e(t),cls);
 const contacts=contactEntries(contact),email=contacts.find(x=>x.url.startsWith('mailto:'));
 const emailIcon=email?`<a class="contact-detail email-icon" href="${e(email.url)}" aria-label="发送邮件" title="发送邮件"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg></a>`:'';
 const contactDetails=contacts.filter(x=>!x.url.startsWith('mailto:')).map(x=>`<a class="contact-detail" href="${e(x.url)}" target="_blank" rel="noopener"><span>${e(x.label)}</span>${e(x.text)}</a>`).join('');
 const scholar=contact.scholarUrl?link(contact.scholarUrl,'Google Scholar ↗','scholar-nav'):'';
 const intro=introMarkup(c.about);
 const journey=(items,label)=>!Array.isArray(items)||!items.length?'':`<article><h3 class="journey-heading">${label}</h3>${items.filter(x=>x.hidden!==true).map(x=>`<div class="timeline"><span class="timeline-dot"></span>${x.date?`<small>${e(x.date)}</small>`:''}<h4>${e(x.title||'')}</h4>${x.subtitle?`<p class="journey-subtitle">${e(x.subtitle)}</p>`:''}${x.direction?`<p class="journey-direction">${e(x.directionLabel||'方向')}：${e(x.direction)}</p>`:''}${x.description?`<p>${e(x.description).replace(/\n/g,'<br>')}</p>`:''}</div>`).join('')}</article>`;
 const work=journey(c.experience,'01 / 工作经历'),education=journey(c.education,'02 / 教育经历');
 return {
 header:`<a class="brand" href="#about"><span class="brand-mark">TW<span>↗</span></span><span>${e(p.nameEn||p.name||'')}<span class="brand-sub">个人学术主页</span></span></a><nav aria-label="主导航"><a href="#about">关于</a><a href="#experience">经历</a><a href="#research">研究成果</a><a href="#patents">专利</a></nav>${scholar}`,
 hero:`<div class="hero-copy">${s.eyebrow?`<p class="eyebrow"><span class="dot"></span>${e(s.eyebrow)}</p>`:''}<h1>${e(p.name||'')}<span>${e(p.nameEn||'')}<span class="name-dot">.</span></span></h1>${p.affiliation?`<p class="affiliation">${e(p.affiliation)}</p>`:''}${intro}<div class="hero-actions"><a class="button" href="#research">浏览研究成果 <span>↓</span></a><div class="hero-links">${contact.scholarUrl?link(contact.scholarUrl,'学术档案 ↗','text-link'):''}${contact.githubUrl?link(contact.githubUrl,'GitHub ↗','text-link'):''}${emailIcon}</div></div>${contactDetails?`<div class="contact-details" aria-label="联系方式">${contactDetails}</div>`:''} </div>${interests.length?`<aside class="research-note"><span class="note-top">RESEARCH INTERESTS <span>01—${String(interests.length).padStart(2,'0')}</span></span><ol>${interests.map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><div>${e(x.name||'')}<small>${e(x.translation||'')}</small>${x.description?`<p class="interest-description">${e(x.description).replace(/\n/g,'<br>')}</p>`:''} </div><b>↗</b></li>`).join('')}</ol>${s.interestNote?`<p>${e(s.interestNote)}</p>`:''}</aside>`:''}`,
 experience:work||education?`<div class="section-heading"><div><p class="eyebrow">THE JOURNEY</p><h2>基本信息 · 工作与教育<span>Experience & Education</span></h2></div></div><div class="journey-grid">${work}${education}</div>`:'',
 banner:`<div><p class="eyebrow">IDEAS INTO INVENTIONS</p><h2>${e(s.patentTitle||'专利成果')}</h2><p>${e(s.patentDescription||'')}</p></div><button class="button" id="show-patents">查看专利记录 <span>↗</span></button>`,
 closing:s.closingTitle?`<p class="eyebrow">A CONTINUING JOURNEY</p><h2>${e(s.closingTitle)}</h2>${contact.scholarUrl?link(contact.scholarUrl,'在 Google Scholar 查看最新动态 ↗','text-link'):''}`:'',
 footer:`<a href="#about">${e(p.name||'')} <span>/ ${e(p.nameEn||'')}</span></a><p>${e(s.footerNote||'')}</p><a href="#about">返回顶部 ↑</a>`,
 researchDescription:e(s.researchDescription||'')
 };
}
function applyContent(c){
 const f=contentFragments(c);
 for(const [id,key] of [['site-header','header'],['about','hero'],['experience','experience'],['patents','banner'],['site-closing','closing'],['site-footer','footer'],['research-description','researchDescription']]){
  const n=document.getElementById(id);if(n){n.innerHTML=f[key];if(['experience','closing'].includes(key))n.hidden=!f[key];}
 }
 if(c.profile)document.title=[c.profile.name,c.profile.nameEn,'个人主页'].filter(Boolean).join(' · ');
 const b=document.getElementById('show-patents');if(b)b.addEventListener('click',()=>{document.getElementById('search').value='';document.getElementById('year').value='all';document.getElementById('patent-status').value='all';activeCategory='all';chooseType('patent');document.getElementById('research').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
}
