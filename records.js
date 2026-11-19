'use strict';
const PATENT_CATEGORIES=['大模型','计算机视觉','计算机体系结构','通用AI'];
const PATENT_REGION_NAMES = {CN:'中国', US:'美国', EP:'欧洲', WO:'PCT 国际申请', JP:'日本', KR:'韩国'};
function patentApplications(patent) {
 const applications = new Map();
 const members = patent.members?.length ? patent.members : [{publication:patent.publication}];
 for (const member of members) {
  const region = String(member.publication || '').match(/^([A-Z]{2})/)?.[1];
  if (!region) continue;
  const number = member.application
   ? member.application.toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/A$/,'')
   : member.publication.replace(/[A-Z][0-9]*$/,'');
  const key = region + ':' + number;
  if (!applications.has(key)) applications.set(key, {key,region,application:member.application || '',members:[]});
  applications.get(key).members.push(member);
 }
 return [...applications.values()];
}

function patentRegionSummary(patents) {
 const applications = new Map(patents.flatMap(patent => patentApplications(patent).map(application => [application.key, application])));
 const domestic = [...applications.values()].filter(application => application.region === 'CN').length;
 return `${applications.size} 件 · 国内 ${domestic} 件 · 海外 ${applications.size-domestic} 件`;
}

function researchCount(rows) {
 const papers = rows.filter(row => row.type === 'paper').length;
 const patents = rows.filter(row => row.type === 'patent');
 return [papers ? `论文 ${papers} 篇` : '',patents.length ? `专利 ${patentRegionSummary(patents)}（${patents.length} 个同族）` : ''].filter(Boolean).join(' · ');
}

function patentApplicationMarkup(application) {
 const region = PATENT_REGION_NAMES[application.region] || application.region;
 const statuses = [...new Set(application.members.map(member => member.statusLabel || member.status).filter(Boolean))].join(' / ');
 return `<li><div><strong>${application.region === 'CN' ? '国内' : '海外'} · ${escapeHtml(region)}</strong> · ${escapeHtml(application.application)}</div><p>${application.members.map(member => external(member.sourceUrl,escapeHtml(member.publication)+' ↗')).join(' · ')}</p><p>${escapeHtml(statuses)}</p></li>`;
}

const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};
const citationNumber=p=>parseInt(p.citations,10)||0;
const recordSearchText=p=>[p.title,p.authors,p.venue,p.year,p.category,p.publication,...(p.type==='patent'?patentApplications(p).map(application=>PATENT_REGION_NAMES[application.region]||application.region):[]),...(p.members||[]).map(m=>[m.publication,m.application,...(m.inventors||[]),...(m.assignees||[])].join(' ')),p.type==='paper'?JSON.stringify(p.details||{}):''].filter(Boolean).join(' ').toLowerCase();
const recordDate=p=>p.applicationDate||p.year||'';
const dateOrder=(a,b)=>recordDate(b).localeCompare(recordDate(a))||citationNumber(b)-citationNumber(a)||a.title.localeCompare(b.title);
const external=(url,label,cls='')=>`<a class="${cls}" href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener">${label}</a>`;
function recordMarkup(p){
 const authors=escapeHtml(p.authors).replace(/\bT Wang\b|\bTao Wang\b|\bWang Tao\b|汪涛/g,'<strong>$&</strong>');
 if(p.type==='patent'){
  const applications = patentApplications(p);
  return `<article class="publication patent-record" id="${escapeHtml(p.id)}"><div class="pub-year">${escapeHtml(p.year||'—')}<small>${escapeHtml((p.applicationDate||'').slice(5))}</small></div><div><h3>${external(p.url,escapeHtml(p.title))}</h3><p class="authors">发明人：${authors}</p><p class="venue">${escapeHtml((p.applicants||[]).join('；'))}</p><div class="patent-meta"><span class="status-badge ${p.status==='active'?'status-active':'status-pending'}">${escapeHtml(p.statusLabel)}</span><span class="region-badge">${applications.map(application => escapeHtml(PATENT_REGION_NAMES[application.region] || application.region)).filter((name,i,all)=>all.indexOf(name)===i).join(" / ")}</span>${p.category?`<span class="category-badge">${escapeHtml(p.category)}</span>`:''}<span>${escapeHtml(p.dateBasis)}：${escapeHtml(p.applicationDate)}</span></div><div class="pub-bottom">${external(p.url,'专利原文 ↗')}<span class="cite">状态核对：${escapeHtml(p.checkedAt)}</span></div><details class="family-details"><summary>地区申请 · ${patentRegionSummary([p])}</summary><ul>${applications.map(patentApplicationMarkup).join('')}</ul><p class="source-note">同一申请的公开、授权版本计为一件。</p></details></div><div class="pub-arrow">${external(p.url,'↗')}</div></article>`;
 }
 const details=p.details||{};
 const publicationName = ['研讨会论文','会议','Conference','Booktitle','期刊','Journal','图书','Book','来源','Source']
  .map(key => details[key]).find(value => typeof value === 'string' && value.trim());
 const venue = publicationName || p.venue || details['出版商'] || details.Publisher || '来源未列出出版信息';
 return `<article class="publication"><div class="pub-year">${escapeHtml(p.year||'—')}</div><div><h3>${external(p.scholarUrl,escapeHtml(p.title))}</h3><p class="authors">${authors}</p><p class="venue">${escapeHtml(venue)}</p><div class="pub-bottom"><span class="tag">PUBLICATION</span>${p.citations?`<span class="cite">引用 ${escapeHtml(p.citations)}</span>`:''}${external(p.scholarUrl,'Scholar ↗')}${p.url?external(p.url,'来源详情 ↗'):''}</div></div><div class="pub-arrow">${external(p.url||p.scholarUrl,'↗')}</div></article>`;
}
