'use strict';
const PATENT_CATEGORIES=['大模型','计算机视觉','计算机体系结构','通用AI'];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};
const citationNumber=p=>parseInt(p.citations,10)||0;
const recordSearchText=p=>[p.title,p.authors,p.venue,p.year,p.category,p.publication,...(p.members||[]).map(m=>[m.publication,m.application,...(m.inventors||[]),...(m.assignees||[])].join(' ')),p.type==='paper'?JSON.stringify(p.details||{}):''].filter(Boolean).join(' ').toLowerCase();
const recordDate=p=>p.applicationDate||p.year||'';
const dateOrder=(a,b)=>recordDate(b).localeCompare(recordDate(a))||citationNumber(b)-citationNumber(a)||a.title.localeCompare(b.title);
const external=(url,label,cls='')=>`<a class="${cls}" href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener">${label}</a>`;
function recordMarkup(p){
 const authors=escapeHtml(p.authors).replace(/\bT Wang\b|\bTao Wang\b|\bWang Tao\b|汪涛/g,'<strong>$&</strong>');
 if(p.type==='patent'){
  const members=p.members||[];
  return `<article class="publication patent-record" id="${escapeHtml(p.id)}"><div class="pub-year">${escapeHtml(p.year||'—')}<small>${escapeHtml((p.applicationDate||'').slice(5))}</small></div><div><h3>${external(p.url,escapeHtml(p.title))}</h3><p class="authors">发明人：${authors}</p><p class="venue">${escapeHtml((p.applicants||[]).join('；'))}</p><div class="patent-meta"><span class="status-badge ${p.status==='active'?'status-active':'status-pending'}">${escapeHtml(p.statusLabel)}</span>${p.category?`<span class="category-badge">${escapeHtml(p.category)}</span>`:''}<span>${escapeHtml(p.dateBasis)}：${escapeHtml(p.applicationDate)}</span></div><div class="pub-bottom">${external(p.url,'专利原文 ↗')}<span class="cite">状态核对：${escapeHtml(p.checkedAt)}</span></div><details class="family-details"><summary>查看地区状态与公开 / 授权版本（${members.length} 条）</summary><ul>${members.map(m=>`<li><div>${external(m.sourceUrl,escapeHtml(m.publication)+' ↗')} <span class="member-status">${escapeHtml(m.statusLabel||m.status)}${m.superseded?' · 较早版本':''}</span></div><p>申请号：${escapeHtml(m.application)} · 申请日：${escapeHtml(m.filingDate||'未列出')} · ${escapeHtml(m.sourceName||'Google Patents')}</p><p>发明人：${escapeHtml((m.inventors||[]).join('、'))}</p></li>`).join('')}</ul><p class="source-note">${escapeHtml(p.deduplicationNote)}${p.categoryReason?` 方向归类：${escapeHtml(p.categoryReason)}`:''} </p></details></div><div class="pub-arrow">${external(p.url,'↗')}</div></article>`;
 }
 const details=p.details||{};
 const publicationName = ['研讨会论文','会议','Conference','Booktitle','期刊','Journal','图书','Book','来源','Source']
  .map(key => details[key]).find(value => typeof value === 'string' && value.trim());
 const venue = publicationName || p.venue || details['出版商'] || details.Publisher || '来源未列出出版信息';
 return `<article class="publication"><div class="pub-year">${escapeHtml(p.year||'—')}</div><div><h3>${external(p.scholarUrl,escapeHtml(p.title))}</h3><p class="authors">${authors}</p><p class="venue">${escapeHtml(venue)}</p><div class="pub-bottom"><span class="tag">PUBLICATION</span>${p.citations?`<span class="cite">引用 ${escapeHtml(p.citations)}</span>`:''}${external(p.scholarUrl,'Scholar ↗')}${p.url?external(p.url,'来源详情 ↗'):''}</div></div><div class="pub-arrow">${external(p.url||p.scholarUrl,'↗')}</div></article>`;
}
