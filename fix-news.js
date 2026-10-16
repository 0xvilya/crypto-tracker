/* v125-news */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function t(k){return window.__ct_t?window.__ct_t(k):k;}
function lang(){return window.__ct_lang?window.__ct_lang():'ru';}
var trCache={},newsCache={crypto:[],coins:{},stocks:[],at:0};
var COIN_NEWS_LIST=['BTC','ETH','SOL','XRP','BNB','GRAM','DOGE','ADA','AVAX','LINK'];
async function tr(text){
  if(!text||lang()!=='ru')return text;
  if(trCache[text])return trCache[text];
  try{
    var d=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q='+encodeURIComponent(String(text).slice(0,400))).then(function(r){return r.json();});
    if(Array.isArray(d)&&d[0]){var o=d[0].map(function(x){return x[0];}).join('');if(o){trCache[text]=o;return o;}}
  }catch(e){}
  return text;
}
async function fetchHN(q,n){
  var items=[],cut=Date.now()-40*864e5;
  try{
    var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage='+(n||12)).then(function(r){return r.json();});
    (d.hits||[]).forEach(function(h){
      var title=(h.title||'').trim();if(!title||/^(Show HN|Ask HN)/i.test(title))return;
      var link=h.url;if(!link||!/^https?:\/\//i.test(link))return;
      var ts=h.created_at_i?h.created_at_i*1000:0;if(ts&&ts<cut)return;
      items.push({title:title,link:link,date:h.created_at||'',src:'HN'});
    });
  }catch(e){}
  return items;
}
async function fetchCC(n){
  var items=[];
  try{
    var d=await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&limit='+(n||20)).then(function(r){return r.json();});
    ((d&&d.Data)||[]).forEach(function(x){if(!x.title)return;items.push({title:x.title,link:x.url||x.guid||'#',date:x.published_on?new Date(x.published_on*1000).toISOString():'',src:x.source||'CC'});});
  }catch(e){}
  return items;
}
async function loadNewsPage(force){
  var box=$('newsFeed');if(!box)return;
  if(!force&&newsCache.at&&Date.now()-newsCache.at<40000&&newsCache.crypto.length){await paintNewsPage();return;}
  box.innerHTML='<div class="muted">'+t('loading')+'</div>';
  var gen=await fetchHN('cryptocurrency OR bitcoin OR ethereum OR solana',18);
  var cc=await fetchCC(18);
  var st=await fetchHN('stock market OR nasdaq OR "S&P" OR wallstreet',14);
  var seen={},crypto=[];
  gen.concat(cc).forEach(function(n){var k=n.title.toLowerCase().slice(0,48);if(seen[k])return;seen[k]=1;crypto.push(n);});
  crypto.sort(function(a,b){return Date.parse(b.date||0)-Date.parse(a.date||0);});
  var coins={};
  await Promise.all(COIN_NEWS_LIST.slice(0,6).map(async function(sym){
    coins[sym]=await fetchHN(sym+(sym==='GRAM'?' OR toncoin OR "open network"':' crypto'),8);
  }));
  newsCache={crypto:crypto.slice(0,30),coins:coins,stocks:st.slice(0,18),at:Date.now()};
  await paintNewsPage();
}
async function paintNewsPage(){
  var box=$('newsFeed');if(!box)return;
  var tab=box.getAttribute('data-tab')||'crypto';
  if(tab==='coins'){
    var html='';
    for(var i=0;i<COIN_NEWS_LIST.length;i++){
      var sym=COIN_NEWS_LIST[i],arr=newsCache.coins[sym]||[];
      if(!arr.length)continue;
      html+='<div style="margin:.7rem 0 .35rem;font-weight:700;color:var(--accent)">'+sym+'</div>';
      for(var j=0;j<Math.min(4,arr.length);j++){
        var n=arr[j],title=n.title;if(lang()==='ru')title=await tr(n.title);
        html+='<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+title+'</a></div>';
      }
    }
    box.innerHTML=html||'<div class="muted">—</div>';return;
  }
  var items=tab==='stocks'?(newsCache.stocks||[]):(newsCache.crypto||[]);
  if(lang()==='ru')await Promise.all(items.slice(0,20).map(async function(n){n._t=await tr(n.title);}));
  var html='';
  items.forEach(function(n){
    var title=lang()==='ru'?(n._t||n.title):n.title;
    var d='';try{d=new Date(n.date).toLocaleString(lang()==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){}
    html+='<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+title+'</a><div class="news-meta"><span class="news-src">'+(n.src||'')+'</span> '+d+'</div></div>';
  });
  box.innerHTML=html||'<div class="muted">—</div>';
}
window.__ct_paintNews=paintNewsPage;
window.__ct_loadNews=loadNewsPage;

async function itemNews(sym,kind){
  var nb=kind==='stock'?$('stockNews'):$('coinNews');if(!nb)return;
  nb.innerHTML='<div class="muted">'+t('loading')+'</div>';
  var q=kind==='stock'?(sym+' stock OR shares'):(sym+' crypto OR '+sym);
  var items=await fetchHN(q,12);
  if(lang()==='ru'){for(var i=0;i<items.length;i++)items[i]._t=await tr(items[i].title);}
  var html='<b style="color:var(--accent)">'+t('coinNews')+' — '+sym+'</b>';
  items.forEach(function(n){html+='<div class="news-item" style="margin-top:.4rem"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+(lang()==='ru'?(n._t||n.title):n.title)+'</a></div>';});
  nb.innerHTML=html||'<div class="muted">—</div>';
}
window.__ct_itemNews=itemNews;

function ensureNewsTab(){
  var nav=$('nav');if(!nav)return;
  nav.style.gridTemplateColumns='repeat(6,1fr)';
  if(!document.querySelector('.nav-btn[data-p="news"]')){
    var tools=document.querySelector('.nav-btn[data-p="tools"]');
    var btn=document.createElement('button');
    btn.type='button';btn.className='nav-btn';btn.setAttribute('data-p','news');
    btn.innerHTML='<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg><span>'+t('news')+'</span>';
    if(tools)nav.insertBefore(btn,tools);else nav.appendChild(btn);
    btn.addEventListener('click',function(){
      document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
      var page=$('p-news');if(page){page.classList.add('on');if(window.__ct_applyLang)window.__ct_applyLang();loadNewsPage(false);}
    });
  }
  if($('p-news'))return;
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-news';
  sec.innerHTML='<div class="card"><div class="chart-tabs" id="newsTabs">'+
    '<button type="button" class="tab on" data-nt="crypto">'+t('allCrypto')+'</button>'+
    '<button type="button" class="tab" data-nt="coins">'+t('byCoin')+'</button>'+
    '<button type="button" class="tab" data-nt="stocks">'+t('stockMkt')+'</button>'+
    '<button type="button" class="btn-ghost" id="newsRef" style="margin-left:auto">↻</button></div>'+
    '<div id="newsFeed" data-tab="crypto" style="margin-top:.5rem"></div></div>';
  wrap.appendChild(sec);
  sec.querySelectorAll('#newsTabs .tab').forEach(function(tb){
    tb.onclick=function(){
      sec.querySelectorAll('#newsTabs .tab').forEach(function(x){x.classList.remove('on');});
      tb.classList.add('on');
      var feed=$('newsFeed');if(feed)feed.setAttribute('data-tab',tb.getAttribute('data-nt'));
      paintNewsPage();
    };
  });
  if($('newsRef'))$('newsRef').onclick=function(){loadNewsPage(true);};
}

function boot(){
  setTimeout(ensureNewsTab,700);
  setInterval(function(){if($('p-news')&&$('p-news').classList.contains('on'))loadNewsPage(false);},55000);
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav-btn[data-p="news"]'))setTimeout(function(){ensureNewsTab();loadNewsPage(false);},40);
    var tr=e.target.closest('tr[data-id]');
    if(tr){setTimeout(function(){var sym=(($('dSym')||{}).textContent||'').trim();if(sym)itemNews(sym,'coin');},400);}
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
