/* fix v124 — remove home stocks, live prices cache, news tab, stock portfolio */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function lang(){var s=$('langSel');return(s&&s.value)||localStorage.getItem('ct_lang')||'ru';}
function cur(){var s=$('curSel');return(localStorage.getItem('ct_cur')||(s&&s.value)||'usd').toLowerCase();}
var I18N={
  ru:{crypto:'\u041a\u0440\u0438\u043f\u0442\u043e',news:'\u041d\u043e\u0432\u043e\u0441\u0442\u0438',stocks:'\u0410\u043a\u0446\u0438\u0438',port:'\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c',wallet:'\u041a\u043e\u0448\u0435\u043b\u0451\u043a',tools:'\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b',
    allCrypto:'\u0412\u0441\u044f \u043a\u0440\u0438\u043f\u0442\u0430',stockMkt:'\u0424\u043e\u043d\u0434\u043e\u0432\u044b\u0439 \u0440\u044b\u043d\u043e\u043a',loading:'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',
    stockPort:'\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u0430\u043a\u0446\u0438\u0439',add:'\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c',qty:'\u041a\u043e\u043b-\u0432\u043e',buy:'\u0426\u0435\u043d\u0430 \u043f\u043e\u043a\u0443\u043f\u043a\u0438',
    total:'\u0418\u0442\u043e\u0433\u043e',analysis:'\u0410\u043d\u0430\u043b\u0438\u0437',gainers:'\u0420\u043e\u0441\u0442',losers:'\u041f\u0430\u0434\u0435\u043d\u0438\u0435',
    stockList:'\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439',search:'\u041f\u043e\u0438\u0441\u043a\u2026',price:'\u0426\u0435\u043d\u0430',ticker:'\u0422\u0438\u043a\u0435\u0440'},
  en:{crypto:'Crypto',news:'News',stocks:'Stocks',port:'Portfolio',wallet:'Wallet',tools:'Tools',
    allCrypto:'All crypto',stockMkt:'Stock market',loading:'Loading\u2026',
    stockPort:'Stock portfolio',add:'Add',qty:'Qty',buy:'Buy price',
    total:'Total',analysis:'Analysis',gainers:'Gainers',losers:'Losers',
    stockList:'Stock list',search:'Search\u2026',price:'Price',ticker:'Ticker'}
};
function t(k){return(I18N[lang()]||I18N.en)[k]||k;}
var fxRate=1,fxAt=0;
async function getFx(){
  if(Date.now()-fxAt<180000)return fxRate;
  var c=cur();if(c==='usd'){fxRate=1;fxAt=Date.now();return 1;}
  try{var d=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json();});
    fxRate=c==='eur'?(d.rates.EUR||1):c==='rub'?(d.rates.RUB||1):c==='pln'?(d.rates.PLN||1):1;fxAt=Date.now();
  }catch(e){}
  return fxRate;
}
function money(v){
  if(v==null||isNaN(v))return '\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v*fxRate;
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  return s+n.toFixed(2);
}

function killHomeStocks(){
  var c=$('stocksCard');if(c)c.remove();
  document.querySelectorAll('#p-home .card').forEach(function(card){
    var h=card.querySelector('h2');
    var txt=(h&&h.textContent||'').trim();
    if(/^(Акции|Stocks)$/i.test(txt))card.remove();
    if(/Крупные акции|нажмите для графика|Major stocks/i.test(card.textContent||''))card.remove();
  });
  var ai=$('aiBox');if(ai){ai.style.display='none';ai.innerHTML='';}
}
setInterval(killHomeStocks,800);
try{
  var home=$('p-home');
  if(home){
    var mo=new MutationObserver(function(){killHomeStocks();});
    mo.observe(home,{childList:true,subtree:true});
  }
}catch(e){}

var STOCKS=[
  {s:'AAPL',n:'Apple'},{s:'MSFT',n:'Microsoft'},{s:'GOOGL',n:'Alphabet'},{s:'AMZN',n:'Amazon'},
  {s:'NVDA',n:'NVIDIA'},{s:'TSLA',n:'Tesla'},{s:'META',n:'Meta'},{s:'AMD',n:'AMD'},
  {s:'NFLX',n:'Netflix'},{s:'JPM',n:'JPMorgan'},{s:'V',n:'Visa'},{s:'BABA',n:'Alibaba'},
  {s:'DIS',n:'Disney'},{s:'KO',n:'Coca-Cola'},{s:'INTC',n:'Intel'},{s:'PEP',n:'Pepsi'},
  {s:'NKE',n:'Nike'},{s:'BA',n:'Boeing'},{s:'CRM',n:'Salesforce'},{s:'ORCL',n:'Oracle'},
  {s:'ADBE',n:'Adobe'},{s:'PYPL',n:'PayPal'},{s:'UBER',n:'Uber'}
];
var STOCK_TV={AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',NFLX:'NASDAQ:NFLX',AMD:'NASDAQ:AMD',INTC:'NASDAQ:INTC',BABA:'NYSE:BABA',JPM:'NYSE:JPM',V:'NYSE:V',DIS:'NYSE:DIS',KO:'NYSE:KO',PEP:'NASDAQ:PEP',NKE:'NYSE:NKE',BA:'NYSE:BA',CRM:'NYSE:CRM',ORCL:'NYSE:ORCL',ADBE:'NASDAQ:ADBE',PYPL:'NASDAQ:PYPL',UBER:'NYSE:UBER'};
var stockData={};
try{var cached=JSON.parse(localStorage.getItem('ct_stocks')||'{}');if(cached&&typeof cached==='object')stockData=cached;}catch(e){}
function saveStocks(){try{localStorage.setItem('ct_stocks',JSON.stringify(stockData));}catch(e){}}

async function fetchOne(sym){
  var yurl='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range=5d';
  function parse(d){
    var m=d.chart.result[0].meta;
    var p=m.regularMarketPrice,prev=m.chartPreviousClose||m.previousClose||p;
    return{price:p,ch:prev?((p-prev)/prev*100):0,name:m.shortName||m.longName||sym,at:Date.now()};
  }
  try{var r=await fetch(yurl,{signal:AbortSignal.timeout(5000)});if(r.ok)return parse(await r.json());}catch(e){}
  try{var r2=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(yurl),{signal:AbortSignal.timeout(7000)});if(r2.ok)return parse(await r2.json());}catch(e){}
  try{var r3=await fetch('https://corsproxy.io/?'+encodeURIComponent(yurl),{signal:AbortSignal.timeout(7000)});if(r3.ok)return parse(await r3.json());}catch(e){}
  return null;
}

var stockLoading=false;
async function loadStocks(force){
  if(stockLoading)return;stockLoading=true;
  await getFx();
  paintStocks();
  for(var i=0;i<STOCKS.length;i+=6){
    var batch=STOCKS.slice(i,i+6);
    await Promise.all(batch.map(async function(st){
      var q=await fetchOne(st.s);
      if(q){stockData[st.s]=q;if(!q.name)q.name=st.n;}
      else if(!stockData[st.s])stockData[st.s]={price:null,ch:0,name:st.n,at:0};
    }));
    saveStocks();
    paintStocks();
  }
  stockLoading=false;
}

function paintStocks(){
  var body=$('stockBody');if(!body)return;
  var q=(($('stockQ')||{}).value||'').trim().toLowerCase();
  var rows=STOCKS.filter(function(st){return!q||st.s.toLowerCase().indexOf(q)>=0||st.n.toLowerCase().indexOf(q)>=0;});
  var html='';
  rows.forEach(function(st,i){
    var d=stockData[st.s]||{},price=d.price!=null?money(d.price):'\u2014',ch=d.ch||0;
    var cls=ch>0.05?'up':ch<-0.05?'dn':'';
    html+='<tr class="s-tr" data-s="'+st.s+'"><td>'+(i+1)+'</td><td><b>'+st.s+'</b> <span class="muted">'+st.n+'</span></td><td class="s-price">'+price+'</td><td class="'+cls+'">'+(ch>=0?'+':'')+ch.toFixed(2)+'%</td></tr>';
  });
  body.innerHTML=html;
  body.querySelectorAll('.s-tr').forEach(function(tr){tr.onclick=function(){openStock(tr.getAttribute('data-s'));};});
  var sorted=STOCKS.map(function(st){return{s:st.s,ch:(stockData[st.s]||{}).ch||0,price:(stockData[st.s]||{}).price};}).filter(function(x){return x.price!=null;});
  function gl(id,arr){
    var box=$(id);if(!box)return;
    box.innerHTML=arr.map(function(x){return '<div class="s-gl" data-s="'+x.s+'"><b>'+x.s+'</b> <span class="'+(x.ch>=0?'up':'dn')+'">'+(x.ch>=0?'+':'')+x.ch.toFixed(2)+'%</span></div>';}).join('')||'<div class="muted">\u2014</div>';
    box.querySelectorAll('.s-gl').forEach(function(el){el.onclick=function(){openStock(el.getAttribute('data-s'));};});
  }
  gl('stockGainers',sorted.slice().sort(function(a,b){return b.ch-a.ch;}).slice(0,6));
  gl('stockLosers',sorted.slice().sort(function(a,b){return a.ch-b.ch;}).slice(0,6));
  paintStockPort();
}

var tvReady=null;
function ensureTV(){
  if(window.TradingView)return Promise.resolve();
  if(tvReady)return tvReady;
  tvReady=new Promise(function(res){var s=document.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.onload=function(){res();};s.onerror=function(){res();};document.head.appendChild(s);});
  return tvReady;
}
async function openStock(sym){
  var det=$('stockDetail');if(!det)return;
  det.style.display='block';
  var d=stockData[sym]||{};
  if($('sdName'))$('sdName').textContent=d.name||sym;
  if($('sdSym'))$('sdSym').textContent=sym;
  if($('sdPrice'))$('sdPrice').textContent=d.price!=null?money(d.price):'\u2014';
  if($('sdCh')){$('sdCh').textContent=((d.ch||0)>=0?'+':'')+(d.ch||0).toFixed(2)+'%';$('sdCh').className=(d.ch||0)>=0?'up':'dn';}
  var box=$('stockTv');
  if(box){
    box.innerHTML='';
    await ensureTV();
    if(window.TradingView){
      var cid='stv_'+Date.now(),el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
      var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
      try{new TradingView.widget({autosize:true,symbol:STOCK_TV[sym]||('NASDAQ:'+sym),interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#fff',allow_symbol_change:true,withdateranges:true});}catch(e){}
    }
  }
  loadStockNews(sym);
  det.scrollIntoView({behavior:'smooth',block:'start'});
}

function getSP(){try{return JSON.parse(localStorage.getItem('ct_sport')||'[]');}catch(e){return[];}}
function setSP(a){localStorage.setItem('ct_sport',JSON.stringify(a));}
function paintStockPort(){
  var list=$('spList'),total=$('spTotal'),an=$('spAnalysis');if(!list)return;
  var holds=getSP();
  if(!holds.length){list.innerHTML='<div class="muted">\u2014</div>';if(total)total.textContent=money(0);if(an)an.innerHTML='';return;}
  var sum=0,html='',parts=[];
  holds.forEach(function(h,idx){
    var d=stockData[h.s]||{},px=d.price||h.buy||0,val=px*h.qty,pnl=h.buy?(px-h.buy)*h.qty:0;
    sum+=val;parts.push({s:h.s,val:val,pnl:pnl});
    html+='<div class="hold-row"><div><b>'+h.s+'</b> <span class="muted">\u00d7'+h.qty+'</span></div><span>'+money(val)+' <span class="'+(pnl>=0?'up':'dn')+'">'+(pnl>=0?'+':'')+'</span> <button type="button" class="btn-ghost sp-rm" data-i="'+idx+'" style="padding:.1rem .35rem">\u00d7</button></span></div>';
  });
  list.innerHTML=html;
  if(total)total.textContent=money(sum);
  list.querySelectorAll('.sp-rm').forEach(function(b){b.onclick=function(){var a=getSP();a.splice(+b.getAttribute('data-i'),1);setSP(a);paintStockPort();};});
  if(an&&sum>0){
    var h='';
    parts.sort(function(a,b){return b.val-a.val;});
    parts.forEach(function(p){
      var pct=(p.val/sum*100).toFixed(1);
      h+='<div class="hold-row"><span>'+p.s+'</span><span>'+pct+'%</span></div>';
    });
    an.innerHTML=h;
  }
}

var trCache={},newsCache={crypto:null,stocks:null,at:0};
async function tr(text){
  if(!text||lang()!=='ru')return text;
  if(trCache[text])return trCache[text];
  try{
    var d=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q='+encodeURIComponent(text.slice(0,400))).then(function(r){return r.json();});
    if(Array.isArray(d)&&d[0]){var o=d[0].map(function(x){return x[0];}).join('');if(o){trCache[text]=o;return o;}}
  }catch(e){}
  return text;
}
async function fetchHN(q,limit){
  var items=[],cut=Date.now()-30*864e5;
  try{
    var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage='+(limit||15)).then(function(r){return r.json();});
    (d.hits||[]).forEach(function(h){
      var title=(h.title||'').trim();if(!title||/^(Show HN|Ask HN|Tell HN)/i.test(title))return;
      var link=h.url;if(!link||!/^https?:\/\//i.test(link))return;
      var ts=h.created_at_i?h.created_at_i*1000:0;if(ts&&ts<cut)return;
      items.push({title:title,link:link,date:h.created_at||'',src:'HN'});
    });
  }catch(e){}
  return items;
}
async function fetchCC(limit){
  var items=[];
  try{
    var d=await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&limit='+(limit||20)).then(function(r){return r.json();});
    ((d&&d.Data)||[]).forEach(function(n){
      var title=(n.title||'').trim();if(!title)return;
      items.push({title:title,link:n.url||n.guid||'#',date:n.published_on?new Date(n.published_on*1000).toISOString():'',src:n.source||'CC'});
    });
  }catch(e){}
  return items;
}
async function loadNewsPage(force){
  var box=$('newsFeed');if(!box)return;
  if(!force&&newsCache.at&&Date.now()-newsCache.at<45000&&newsCache.crypto){await paintNewsPage();return;}
  box.innerHTML='<div class="muted">'+t('loading')+'</div>';
  var c1=await fetchHN('cryptocurrency OR bitcoin OR ethereum',20);
  var c2=await fetchCC(20);
  var s1=await fetchHN('stock market OR nasdaq OR "wall street" OR S&P',15);
  var seen={},crypto=[];
  c1.concat(c2).forEach(function(n){var k=n.title.toLowerCase().slice(0,50);if(seen[k])return;seen[k]=1;crypto.push(n);});
  crypto.sort(function(a,b){return Date.parse(b.date||0)-Date.parse(a.date||0);});
  newsCache={crypto:crypto.slice(0,25),stocks:s1.slice(0,15),at:Date.now()};
  await paintNewsPage();
}
async function paintNewsPage(){
  var box=$('newsFeed');if(!box)return;
  var tab=box.getAttribute('data-tab')||'crypto';
  var items=tab==='stocks'?(newsCache.stocks||[]):(newsCache.crypto||[]);
  if(lang()==='ru'){
    await Promise.all(items.slice(0,18).map(async function(n){n._t=await tr(n.title);}));
  }
  var html='';
  items.forEach(function(n){
    var title=lang()==='ru'?(n._t||n.title):n.title;
    var d='';try{d=new Date(n.date).toLocaleString(lang()==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){}
    html+='<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+title+'</a><div class="news-meta"><span class="news-src">'+(n.src||'')+'</span> '+d+'</div></div>';
  });
  box.innerHTML=html||'<div class="muted">\u2014</div>';
}
async function loadStockNews(sym){
  var nb=$('stockNews');if(!nb)return;
  nb.innerHTML='<div class="muted">'+t('loading')+'</div>';
  var items=await fetchHN(sym+' stock OR shares',12);
  if(lang()==='ru'){for(var i=0;i<items.length;i++)items[i]._t=await tr(items[i].title);}
  var html='<b style="color:var(--accent)">'+t('news')+' \u2014 '+sym+'</b>';
  items.forEach(function(n){
    html+='<div class="news-item" style="margin-top:.4rem"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+(lang()==='ru'?(n._t||n.title):n.title)+'</a></div>';
  });
  nb.innerHTML=html;
}

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
      var page=$('p-news');if(page){page.classList.add('on');loadNewsPage(false);}
    });
  }
  if($('p-news'))return;
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-news';
  sec.innerHTML=
    '<div class="card"><div class="chart-tabs" id="newsTabs">'+
    '<button type="button" class="tab on" data-nt="crypto">'+t('allCrypto')+'</button>'+
    '<button type="button" class="tab" data-nt="stocks">'+t('stockMkt')+'</button>'+
    '<button type="button" class="btn-ghost" id="newsRef" style="margin-left:auto">\u21bb</button></div>'+
    '<div id="newsFeed" data-tab="crypto" style="margin-top:.5rem"><div class="muted">'+t('loading')+'</div></div></div>';
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

function ensureStocksPage(){
  killHomeStocks();
  var nav=$('nav');
  if(nav&&!document.querySelector('.nav-btn[data-p="stocks"]')){
    var tools=document.querySelector('.nav-btn[data-p="tools"]');
    var btn=document.createElement('button');
    btn.type='button';btn.className='nav-btn';btn.setAttribute('data-p','stocks');
    btn.innerHTML='<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg><span>'+t('stocks')+'</span>';
    if(tools)nav.insertBefore(btn,tools);else nav.appendChild(btn);
    btn.addEventListener('click',function(){
      document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('on');});
      btn.classList.add('on');
      document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
      var page=$('p-stocks');if(page){page.classList.add('on');loadStocks(false);}
    });
  }
  if($('p-stocks')){paintStocks();return;}
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-stocks';
  sec.innerHTML=
    '<div class="search-wrap"><input type="search" id="stockQ" placeholder="'+t('search')+'" autocomplete="off"/></div>'+
    '<div class="card"><div class="card-head"><h2>'+t('stockList')+'</h2><button type="button" class="btn-ghost" id="stockRef">\u21bb</button></div>'+
    '<div class="table-x"><table><thead><tr><th>#</th><th>'+t('ticker')+'</th><th>'+t('price')+'</th><th>24h</th></tr></thead><tbody id="stockBody"></tbody></table></div></div>'+
    '<div class="card" id="stockDetail" style="display:none">'+
    '<div class="coin"><div><div class="nm" id="sdName">\u2014</div><div class="sy" id="sdSym">\u2014</div></div>'+
    '<div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">\u2014</div><div id="sdCh">\u2014</div></div></div>'+
    '<div id="stockTv" style="height:360px;width:100%;border-radius:12px;overflow:hidden;background:#12101c;margin-top:.5rem"></div>'+
    '<div id="stockNews" style="margin-top:.65rem"></div></div>'+
    '<div class="card"><h2>'+t('gainers')+'</h2><div id="stockGainers" class="trend-grid"></div></div>'+
    '<div class="card"><h2>'+t('losers')+'</h2><div id="stockLosers" class="trend-grid"></div></div>'+
    '<div class="card"><h2>'+t('stockPort')+'</h2>'+
    '<div class="form"><div class="field"><label>Ticker</label><select id="spSym">'+STOCKS.map(function(s){return '<option value="'+s.s+'">'+s.s+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>'+t('qty')+'</label><input type="number" id="spQty" min="0" step="any" value="1"/></div>'+
    '<div class="field"><label>'+t('buy')+'</label><input type="number" id="spBuy" min="0" step="any"/></div></div>'+
    '<button type="button" class="btn" id="spAdd" style="margin-top:.5rem">+ '+t('add')+'</button>'+
    '<div id="spList" style="margin-top:.7rem"></div>'+
    '<div class="pnl-box" style="margin-top:.5rem"><div class="muted">'+t('total')+'</div><div style="font-size:1.2rem;font-weight:700" id="spTotal">\u2014</div></div>'+
    '<div style="margin-top:.6rem"><b>'+t('analysis')+'</b><div id="spAnalysis"></div></div></div>';
  wrap.appendChild(sec);
  if($('stockRef'))$('stockRef').onclick=function(){loadStocks(true);};
  if($('stockQ'))$('stockQ').addEventListener('input',paintStocks);
  if($('spAdd'))$('spAdd').onclick=function(){
    var s=($('spSym')||{}).value,qty=parseFloat(($('spQty')||{}).value),buy=parseFloat(($('spBuy')||{}).value);
    if(!s||!qty||qty<=0)return;
    var a=getSP();a.push({s:s,qty:qty,buy:buy||(stockData[s]&&stockData[s].price)||0});setSP(a);paintStockPort();
  };
  paintStocks();
}

function renameNav(){
  document.querySelectorAll('.nav-btn[data-p="home"] span').forEach(function(sp){sp.textContent=t('crypto');});
  document.querySelectorAll('.nav-btn[data-p="stocks"] span').forEach(function(sp){sp.textContent=t('stocks');});
  document.querySelectorAll('.nav-btn[data-p="news"] span').forEach(function(sp){sp.textContent=t('news');});
}

function injectCSS(){
  if($('ct-v124'))return;
  var s=document.createElement('style');s.id='ct-v124';
  s.textContent=
    '.wrap{max-width:1100px!important;width:100%!important;margin:0 auto!important;padding:.75rem 1rem 1.4rem!important;box-sizing:border-box}'+
    '@media(min-width:900px){.wrap{padding:1rem 1.5rem 2rem!important}.card{max-width:none!important}}'+
    '#aiBox,.ai-box{display:none!important}'+
    '.bottom-nav{grid-template-columns:repeat(6,1fr)!important}'+
    '.nav-btn{font-size:.58rem!important;padding:.25rem .1rem!important}'+
    '.topbar{will-change:transform;transform:translateZ(0)}'+
    '.top-actions .select,#themeBtn,#ghLink{padding:.18rem .35rem!important;font-size:.68rem!important}'+
    '.s-tr{cursor:pointer}.s-tr:hover{background:rgba(168,85,247,.1)}'+
    '.s-gl{display:inline-flex;gap:.35rem;padding:.35rem .55rem;border-radius:10px;background:rgba(168,85,247,.08);margin:.15rem;cursor:pointer}'+
    '.up{color:#22c55e}.dn{color:#ef4444}body{min-height:100vh}';
  document.head.appendChild(s);
}

function boot(){
  injectCSS();
  killHomeStocks();
  setTimeout(function(){
    killHomeStocks();
    ensureStocksPage();
    ensureNewsTab();
    renameNav();
    loadStocks(false);
  },500);
  setInterval(function(){
    killHomeStocks();
    if($('p-stocks')&&$('p-stocks').classList.contains('on'))loadStocks(true);
    else loadStocks(false);
  },25000);
  setInterval(function(){
    if($('p-news')&&$('p-news').classList.contains('on'))loadNewsPage(false);
  },50000);
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav-btn[data-p="stocks"]'))setTimeout(function(){ensureStocksPage();loadStocks(false);},50);
    if(e.target.closest('.nav-btn[data-p="news"]'))setTimeout(function(){ensureNewsTab();loadNewsPage(false);},50);
    if(e.target.closest('.nav-btn[data-p="home"]'))setTimeout(killHomeStocks,50);
  },true);
  var langSel=$('langSel');
  if(langSel)langSel.addEventListener('change',function(){
    setTimeout(function(){renameNav();paintStocks();paintNewsPage();},40);
  });
  var curSel=$('curSel');
  if(curSel)curSel.addEventListener('change',function(){
    fxAt=0;getFx().then(function(){paintStocks();});
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
