/* stocks-page v123 — fast parallel, i18n, currency, news */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function lang(){var s=$('langSel');return(s&&s.value)||localStorage.getItem('ct_lang')||'ru';}
function cur(){var s=$('curSel');return(localStorage.getItem('ct_cur')||(s&&s.value)||'usd').toLowerCase();}
var fxCache={rate:1,at:0};
async function getFx(){
  if(Date.now()-fxCache.at<300000&&fxCache.rate)return fxCache.rate;
  var c=cur();if(c==='usd'){fxCache={rate:1,at:Date.now()};return 1;}
  try{
    var d=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json();});
    var map={eur:'EUR',rub:'RUB',pln:'PLN'};
    fxCache.rate=(d.rates&&d.rates[map[c]||'USD'])||1;
    fxCache.at=Date.now();
  }catch(e){fxCache.rate=1;}
  return fxCache.rate;
}
function money(v,rate){
  if(v==null||isNaN(v))return '\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v*(rate||1);
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  return s+n.toFixed(2);
}
var I18N={
  ru:{stocks:'\u0410\u043a\u0446\u0438\u0438',stockList:'\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439',gainers:'\u0420\u043e\u0441\u0442',losers:'\u041f\u0430\u0434\u0435\u043d\u0438\u0435',loading:'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',searchStock:'\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u0446\u0438\u0438\u2026',news:'\u041d\u043e\u0432\u043e\u0441\u0442\u0438',price:'\u0426\u0435\u043d\u0430',crypto:'\u041a\u0440\u0438\u043f\u0442\u043e',ticker:'\u0422\u0438\u043a\u0435\u0440'},
  en:{stocks:'Stocks',stockList:'Stock list',gainers:'Gainers',losers:'Losers',loading:'Loading\u2026',searchStock:'Search stock\u2026',news:'News',price:'Price',crypto:'Crypto',ticker:'Ticker'}
};
function t(k){return(I18N[lang()]||I18N.en)[k]||k;}

var STOCKS=[
  {s:'AAPL',n:'Apple'},{s:'MSFT',n:'Microsoft'},{s:'GOOGL',n:'Alphabet'},{s:'AMZN',n:'Amazon'},
  {s:'NVDA',n:'NVIDIA'},{s:'TSLA',n:'Tesla'},{s:'META',n:'Meta'},{s:'AMD',n:'AMD'},
  {s:'NFLX',n:'Netflix'},{s:'JPM',n:'JPMorgan'},{s:'V',n:'Visa'},{s:'BABA',n:'Alibaba'},
  {s:'DIS',n:'Disney'},{s:'KO',n:'Coca-Cola'},{s:'INTC',n:'Intel'},{s:'PEP',n:'Pepsi'},
  {s:'NKE',n:'Nike'},{s:'BA',n:'Boeing'},{s:'CRM',n:'Salesforce'},{s:'ORCL',n:'Oracle'},
  {s:'ADBE',n:'Adobe'},{s:'PYPL',n:'PayPal'},{s:'UBER',n:'Uber'}
];
var STOCK_TV={AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',NFLX:'NASDAQ:NFLX',AMD:'NASDAQ:AMD',INTC:'NASDAQ:INTC',BABA:'NYSE:BABA',JPM:'NYSE:JPM',V:'NYSE:V',DIS:'NYSE:DIS',KO:'NYSE:KO',PEP:'NASDAQ:PEP',NKE:'NYSE:NKE',BA:'NYSE:BA',CRM:'NYSE:CRM',ORCL:'NYSE:ORCL',ADBE:'NASDAQ:ADBE',PYPL:'NASDAQ:PYPL',UBER:'NYSE:UBER'};
var stockData={},stockAt=0,tvReady=null,fxRate=1;

async function fetchOne(sym){
  var yurl='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range=5d';
  function parse(d){
    var m=d.chart.result[0].meta;
    var p=m.regularMarketPrice,prev=m.chartPreviousClose||m.previousClose||p;
    return{price:p,ch:prev?((p-prev)/prev*100):0,name:m.shortName||m.longName||sym};
  }
  try{var r=await fetch(yurl,{signal:AbortSignal.timeout(6000)});if(r.ok)return parse(await r.json());}catch(e){}
  try{
    var r2=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(yurl),{signal:AbortSignal.timeout(8000)});
    if(r2.ok)return parse(await r2.json());
  }catch(e){}
  try{
    var r3=await fetch('https://api.allorigins.win/get?url='+encodeURIComponent(yurl),{signal:AbortSignal.timeout(8000)});
    var j=await r3.json();return parse(JSON.parse(j.contents));
  }catch(e){}
  try{
    var r4=await fetch('https://corsproxy.io/?'+encodeURIComponent(yurl),{signal:AbortSignal.timeout(8000)});
    if(r4.ok)return parse(await r4.json());
  }catch(e){}
  return null;
}

async function loadStocks(force){
  if(!force&&Date.now()-stockAt<40000&&Object.keys(stockData).length>10){await paint();return;}
  fxRate=await getFx();
  await Promise.all(STOCKS.map(async function(st){
    var q=await fetchOne(st.s);
    if(q)stockData[st.s]={price:q.price,ch:q.ch,name:q.name||st.n};
    else if(!stockData[st.s])stockData[st.s]={price:null,ch:0,name:st.n};
  }));
  stockAt=Date.now();
  await paint();
  var missing=STOCKS.filter(function(st){return!stockData[st.s]||stockData[st.s].price==null;});
  if(missing.length){
    await Promise.all(missing.map(async function(st){
      var q=await fetchOne(st.s);
      if(q)stockData[st.s]={price:q.price,ch:q.ch,name:q.name||st.n};
    }));
    await paint();
  }
}

async function paint(){
  fxRate=await getFx();
  var body=$('stockBody');if(!body)return;
  var q=(($('stockQ')||{}).value||'').trim().toLowerCase();
  var rows=STOCKS.filter(function(st){return!q||st.s.toLowerCase().indexOf(q)>=0||st.n.toLowerCase().indexOf(q)>=0;});
  var html='';
  rows.forEach(function(st,i){
    var d=stockData[st.s]||{},price=d.price!=null?money(d.price,fxRate):'\u2014',ch=d.ch||0;
    var cls=ch>0.05?'up':ch<-0.05?'dn':'';
    html+='<tr class="s-tr" data-s="'+st.s+'"><td>'+(i+1)+'</td><td><b>'+st.s+'</b> <span class="muted">'+st.n+'</span></td><td>'+price+'</td><td class="'+cls+'">'+(ch>=0?'+':'')+ch.toFixed(2)+'%</td></tr>';
  });
  body.innerHTML=html||'<tr><td colspan="4" class="empty">'+t('loading')+'</td></tr>';
  body.querySelectorAll('.s-tr').forEach(function(tr){tr.onclick=function(){openDetail(tr.getAttribute('data-s'));};});
  var sorted=STOCKS.map(function(st){return{s:st.s,n:st.n,ch:(stockData[st.s]||{}).ch||0,price:(stockData[st.s]||{}).price};}).filter(function(x){return x.price!=null;});
  function gl(id,arr){
    var box=$(id);if(!box)return;
    box.innerHTML=arr.map(function(x){return '<div class="s-gl" data-s="'+x.s+'"><b>'+x.s+'</b> <span class="'+(x.ch>=0?'up':'dn')+'">'+(x.ch>=0?'+':'')+x.ch.toFixed(2)+'%</span></div>';}).join('')||'<div class="muted">\u2014</div>';
    box.querySelectorAll('.s-gl').forEach(function(el){el.onclick=function(){openDetail(el.getAttribute('data-s'));};});
  }
  gl('stockGainers',sorted.slice().sort(function(a,b){return b.ch-a.ch;}).slice(0,6));
  gl('stockLosers',sorted.slice().sort(function(a,b){return a.ch-b.ch;}).slice(0,6));
  if($('stockListTitle'))$('stockListTitle').textContent=t('stockList');
  var th=document.querySelector('#p-stocks thead');
  if(th)th.innerHTML='<tr><th>#</th><th>'+t('ticker')+'</th><th>'+t('price')+'</th><th>24h</th></tr>';
}

function ensureTV(){
  if(window.TradingView)return Promise.resolve();
  if(tvReady)return tvReady;
  tvReady=new Promise(function(res){var s=document.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.onload=function(){res();};s.onerror=function(){res();};document.head.appendChild(s);});
  return tvReady;
}

async function openDetail(sym){
  var det=$('stockDetail');if(!det)return;
  det.style.display='block';
  var d=stockData[sym]||{};
  if($('sdName'))$('sdName').textContent=d.name||sym;
  if($('sdSym'))$('sdSym').textContent=sym;
  if($('sdPrice'))$('sdPrice').textContent=d.price!=null?money(d.price,fxRate):'\u2014';
  if($('sdCh')){$('sdCh').textContent=((d.ch||0)>=0?'+':'')+(d.ch||0).toFixed(2)+'%';$('sdCh').className=(d.ch||0)>=0?'up':'dn';}
  var box=$('stockTv');
  if(box){
    box.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">\u2026</div>';
    await ensureTV();
    if(window.TradingView){
      box.innerHTML='';
      var cid='stv_'+Date.now(),el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
      var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
      try{new TradingView.widget({autosize:true,symbol:STOCK_TV[sym]||('NASDAQ:'+sym),interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#fff',allow_symbol_change:true,withdateranges:true});}catch(e){}
    }
  }
  var nb=$('stockNews');if(nb){
    nb.innerHTML='<div class="muted">'+t('loading')+'</div>';
    try{
      var res=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(sym+' stock OR shares')+'&tags=story&hitsPerPage=20');
      var data=await res.json();var cut=Date.now()-45*864e5,items=[];
      (data.hits||[]).forEach(function(h){
        var title=(h.title||'').trim();if(!title||/^(Show HN|Ask HN|Tell HN)/i.test(title))return;
        var ts=h.created_at_i?h.created_at_i*1000:0;if(ts&&ts<cut)return;
        var link=h.url;
        if(!link||!/^https?:\/\//i.test(link))return;
        items.push({title:title,link:link,date:h.created_at});
      });
      if(lang()==='ru'&&items.length){
        await Promise.all(items.slice(0,10).map(async function(n){
          try{
            var td=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q='+encodeURIComponent(n.title.slice(0,400))).then(function(r){return r.json();});
            if(Array.isArray(td)&&td[0])n.title=td[0].map(function(x){return x[0];}).join('');
          }catch(e){}
        }));
      }
      var html='<b style="color:var(--accent)">'+t('news')+' \u2014 '+sym+'</b>';
      if(!items.length)html+='<div class="muted" style="margin-top:.4rem">\u2014</div>';
      items.slice(0,12).forEach(function(n){
        html+='<div class="news-item" style="margin-top:.45rem"><a href="'+n.link+'" target="_blank" rel="noopener noreferrer">'+n.title+'</a></div>';
      });
      nb.innerHTML=html;
    }catch(e){nb.innerHTML='<div class="muted">\u2014</div>';}
  }
  det.scrollIntoView({behavior:'smooth',block:'start'});
}

function renameHomeToCrypto(){
  document.querySelectorAll('.nav-btn[data-p="home"] span').forEach(function(sp){sp.textContent=t('crypto');});
}

function removeHomeStocksAndAI(){
  var hc=$('stocksCard');if(hc)hc.remove();
  document.querySelectorAll('#p-home .card').forEach(function(card){
    var h=card.querySelector('h2');
    if(h&&/^(Акции|Stocks)$/i.test((h.textContent||'').trim()))card.remove();
  });
  var ai=$('aiBox');if(ai){ai.style.display='none';ai.innerHTML='';}
}

function ensurePage(){
  removeHomeStocksAndAI();
  renameHomeToCrypto();
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
  var sb=document.querySelector('.nav-btn[data-p="stocks"] span');if(sb)sb.textContent=t('stocks');
  if($('p-stocks')){paint();return;}
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-stocks';
  sec.innerHTML=
    '<div class="search-wrap"><input type="search" id="stockQ" placeholder="'+t('searchStock')+'" autocomplete="off"/></div>'+
    '<div class="card"><div class="card-head"><h2 id="stockListTitle">'+t('stockList')+'</h2><button type="button" class="btn-ghost" id="stockRef">\u21bb</button></div>'+
    '<div class="table-x"><table><thead><tr><th>#</th><th>'+t('ticker')+'</th><th>'+t('price')+'</th><th>24h</th></tr></thead><tbody id="stockBody"><tr><td colspan="4" class="empty">'+t('loading')+'</td></tr></tbody></table></div></div>'+
    '<div class="card" id="stockDetail" style="display:none">'+
    '<div class="coin"><div><div class="nm" id="sdName">\u2014</div><div class="sy" id="sdSym">\u2014</div></div>'+
    '<div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">\u2014</div><div id="sdCh">\u2014</div></div></div>'+
    '<div id="stockTv" style="height:360px;width:100%;border-radius:12px;overflow:hidden;background:#12101c;margin-top:.5rem"></div>'+
    '<div id="stockNews" style="margin-top:.65rem"></div></div>'+
    '<div class="card"><h2 id="sgTitle">'+t('gainers')+'</h2><div id="stockGainers" class="trend-grid"></div></div>'+
    '<div class="card"><h2 id="slTitle">'+t('losers')+'</h2><div id="stockLosers" class="trend-grid"></div></div>';
  wrap.appendChild(sec);
  if($('stockRef'))$('stockRef').onclick=function(){loadStocks(true);};
  if($('stockQ'))$('stockQ').addEventListener('input',function(){paint();});
}

function injectLayoutCSS(){
  if($('ct-layout-css'))return;
  var s=document.createElement('style');s.id='ct-layout-css';
  s.textContent=
    '.wrap{max-width:1100px!important;width:100%!important;margin:0 auto!important;padding:.75rem 1rem 1.4rem!important;box-sizing:border-box}'+
    '@media(min-width:900px){.wrap{max-width:1100px!important;padding:1rem 1.5rem 2rem!important}.table-x{overflow-x:auto}.card{max-width:none!important}}'+
    '@media(min-width:700px){.trend-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.4rem}}'+
    '#aiBox,.ai-box{display:none!important}'+
    '.s-tr{cursor:pointer}.s-tr:active,.s-tr:hover{background:rgba(168,85,247,.1)}'+
    '.s-gl{display:inline-flex;gap:.4rem;padding:.4rem .65rem;border-radius:10px;background:rgba(168,85,247,.08);margin:.2rem;cursor:pointer}'+
    '.up{color:#22c55e}.dn{color:#ef4444}'+
    'body{min-height:100vh}';
  document.head.appendChild(s);
}

function boot(){
  injectLayoutCSS();
  setTimeout(function(){ensurePage();removeHomeStocksAndAI();renameHomeToCrypto();},400);
  setInterval(function(){
    removeHomeStocksAndAI();
    renameHomeToCrypto();
    if($('p-stocks')&&$('p-stocks').classList.contains('on'))loadStocks(false);
  },55000);
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav-btn[data-p="stocks"]'))setTimeout(function(){ensurePage();loadStocks(false);},60);
    if(e.target.closest('.nav-btn[data-p="home"]'))setTimeout(function(){removeHomeStocksAndAI();renameHomeToCrypto();},80);
  },true);
  var langSel=$('langSel');
  if(langSel)langSel.addEventListener('change',function(){
    setTimeout(function(){
      renameHomeToCrypto();
      var sb=document.querySelector('.nav-btn[data-p="stocks"] span');if(sb)sb.textContent=t('stocks');
      if($('stockQ'))$('stockQ').placeholder=t('searchStock');
      if($('sgTitle'))$('sgTitle').textContent=t('gainers');
      if($('slTitle'))$('slTitle').textContent=t('losers');
      paint();
    },50);
  });
  var curSel=$('curSel');
  if(curSel)curSel.addEventListener('change',function(){
    fxCache.at=0;
    setTimeout(function(){getFx().then(function(r){fxRate=r;paint();});},80);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
