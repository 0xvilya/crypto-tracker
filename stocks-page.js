/* stocks-page v122 — separate stocks tab like crypto */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function lang(){var s=$('langSel');return(s&&s.value)||localStorage.getItem('ct_lang')||'ru';}
function cur(){var s=$('curSel');return(localStorage.getItem('ct_cur')||(s&&s.value)||'usd').toLowerCase();}
function money(v){
  if(v==null||isNaN(v))return '\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v;
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  return s+n.toFixed(2);
}
function t(k){
  var R={stocks:'\u0410\u043a\u0446\u0438\u0438',stockList:'\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439',gainers:'\u0420\u043e\u0441\u0442',losers:'\u041f\u0430\u0434\u0435\u043d\u0438\u0435',loading:'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',searchStock:'\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u0446\u0438\u0438\u2026',news:'\u041d\u043e\u0432\u043e\u0441\u0442\u0438'};
  var E={stocks:'Stocks',stockList:'Stock list',gainers:'Gainers',losers:'Losers',loading:'Loading\u2026',searchStock:'Search stock\u2026',news:'News'};
  return (lang()==='ru'?R:E)[k]||k;
}
var STOCKS=[
  {s:'AAPL',n:'Apple'},{s:'MSFT',n:'Microsoft'},{s:'GOOGL',n:'Alphabet'},{s:'AMZN',n:'Amazon'},
  {s:'NVDA',n:'NVIDIA'},{s:'TSLA',n:'Tesla'},{s:'META',n:'Meta'},{s:'AMD',n:'AMD'},
  {s:'NFLX',n:'Netflix'},{s:'JPM',n:'JPMorgan'},{s:'V',n:'Visa'},{s:'BABA',n:'Alibaba'},
  {s:'DIS',n:'Disney'},{s:'KO',n:'Coca-Cola'},{s:'INTC',n:'Intel'},{s:'PEP',n:'Pepsi'},
  {s:'NKE',n:'Nike'},{s:'BA',n:'Boeing'},{s:'CRM',n:'Salesforce'},{s:'ORCL',n:'Oracle'},
  {s:'ADBE',n:'Adobe'},{s:'PYPL',n:'PayPal'},{s:'UBER',n:'Uber'}
];
var STOCK_TV={AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',NFLX:'NASDAQ:NFLX',AMD:'NASDAQ:AMD',INTC:'NASDAQ:INTC',BABA:'NYSE:BABA',JPM:'NYSE:JPM',V:'NYSE:V',DIS:'NYSE:DIS',KO:'NYSE:KO',PEP:'NASDAQ:PEP',NKE:'NYSE:NKE',BA:'NYSE:BA',CRM:'NYSE:CRM',ORCL:'NYSE:ORCL',ADBE:'NASDAQ:ADBE',PYPL:'NASDAQ:PYPL',UBER:'NYSE:UBER'};
var stockData={},stockAt=0,tvReady=null;

async function fetchYahoo(sym){
  var url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range=5d';
  try{
    var r=await fetch(url);if(r.ok){var d=await r.json();var m=d.chart.result[0].meta;var p=m.regularMarketPrice,prev=m.chartPreviousClose||m.previousClose||p;return{price:p,ch:prev?((p-prev)/prev*100):0,name:m.shortName||sym};}
  }catch(e){}
  try{
    var r2=await fetch('https://api.allorigins.win/get?url='+encodeURIComponent(url));
    var j=await r2.json();var d2=JSON.parse(j.contents);var m2=d2.chart.result[0].meta;
    var p2=m2.regularMarketPrice,prev2=m2.chartPreviousClose||m2.previousClose||p2;
    return{price:p2,ch:prev2?((p2-prev2)/prev2*100):0,name:m2.shortName||sym};
  }catch(e){}
  return null;
}

async function loadStocks(force){
  if(!force&&Date.now()-stockAt<50000&&Object.keys(stockData).length>8){paint();return;}
  for(var i=0;i<STOCKS.length;i+=5){
    var batch=STOCKS.slice(i,i+5);
    await Promise.all(batch.map(async function(st){
      var q=await fetchYahoo(st.s);
      if(q)stockData[st.s]={price:q.price,ch:q.ch,name:q.name||st.n};
      else if(!stockData[st.s])stockData[st.s]={price:null,ch:0,name:st.n};
    }));
    paint();
  }
  stockAt=Date.now();paint();
}

function paint(){
  var body=$('stockBody');if(!body)return;
  var q=(($('stockQ')||{}).value||'').trim().toLowerCase();
  var fx=1;
  try{if(typeof fxRate==='number')fx=fxRate;}catch(e){}
  var rows=STOCKS.filter(function(st){return !q||st.s.toLowerCase().indexOf(q)>=0||st.n.toLowerCase().indexOf(q)>=0;});
  var html='';
  rows.forEach(function(st,i){
    var d=stockData[st.s]||{},price=d.price!=null?money(d.price*fx):'\u2014',ch=d.ch||0;
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
  if($('sdPrice'))$('sdPrice').textContent=d.price!=null?money(d.price):'\u2014';
  if($('sdCh')){$('sdCh').textContent=((d.ch||0)>=0?'+':'')+(d.ch||0).toFixed(2)+'%';$('sdCh').className=(d.ch||0)>=0?'up':'dn';}
  var box=$('stockTv');if(box){
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
      var res=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(sym)+'&tags=story&hitsPerPage=10');
      var data=await res.json();var cut=Date.now()-30*864e5,items=[];
      (data.hits||[]).forEach(function(h){
        var title=(h.title||'').trim();if(!title||/^(Show HN|Ask HN)/i.test(title))return;
        var ts=h.created_at_i?h.created_at_i*1000:0;if(ts&&ts<cut)return;
        items.push({title:title,link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at});
      });
      var html='<b style="color:var(--accent)">'+t('news')+' \u2014 '+sym+'</b>';
      items.slice(0,10).forEach(function(n){
        html+='<div class="news-item" style="margin-top:.4rem"><a href="'+n.link+'" target="_blank" rel="noopener">'+n.title+'</a></div>';
      });
      nb.innerHTML=html;
    }catch(e){nb.innerHTML='\u2014';}
  }
  det.scrollIntoView({behavior:'smooth',block:'start'});
}

function ensurePage(){
  var hc=$('stocksCard');if(hc)hc.remove();
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
  if($('p-stocks'))return;
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-stocks';
  sec.innerHTML=
    '<div class="search-wrap"><input type="search" id="stockQ" placeholder="'+t('searchStock')+'" autocomplete="off"/></div>'+
    '<div class="card"><div class="card-head"><h2 id="stockListTitle">'+t('stockList')+'</h2><button type="button" class="btn-ghost" id="stockRef">\u21bb</button></div>'+
    '<div class="table-x"><table><thead><tr><th>#</th><th>Ticker</th><th>Price</th><th>24h</th></tr></thead><tbody id="stockBody"><tr><td colspan="4" class="empty">'+t('loading')+'</td></tr></tbody></table></div></div>'+
    '<div class="card" id="stockDetail" style="display:none">'+
    '<div class="coin"><div><div class="nm" id="sdName">\u2014</div><div class="sy" id="sdSym">\u2014</div></div>'+
    '<div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">\u2014</div><div id="sdCh">\u2014</div></div></div>'+
    '<div id="stockTv" style="height:360px;width:100%;border-radius:12px;overflow:hidden;background:#12101c;margin-top:.5rem"></div>'+
    '<div id="stockNews" style="margin-top:.65rem"></div></div>'+
    '<div class="card"><h2>'+t('gainers')+'</h2><div id="stockGainers" class="trend-grid"></div></div>'+
    '<div class="card"><h2>'+t('losers')+'</h2><div id="stockLosers" class="trend-grid"></div></div>';
  wrap.appendChild(sec);
  if($('stockRef'))$('stockRef').onclick=function(){loadStocks(true);};
  if($('stockQ'))$('stockQ').addEventListener('input',paint);
  var st=document.createElement('style');
  st.textContent='.s-tr{cursor:pointer}.s-tr:active,.s-tr:hover{background:rgba(168,85,247,.1)}.s-gl{display:inline-flex;gap:.4rem;padding:.4rem .65rem;border-radius:10px;background:rgba(168,85,247,.08);margin:.2rem;cursor:pointer}.up{color:#22c55e}.dn{color:#ef4444}';
  document.head.appendChild(st);
}

function boot(){
  setTimeout(ensurePage,600);
  setInterval(function(){if($('p-stocks')&&$('p-stocks').classList.contains('on'))loadStocks(false);},60000);
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav-btn[data-p="stocks"]'))setTimeout(function(){ensurePage();loadStocks(false);},80);
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
