/* v125-stocks compact */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function t(k){return window.__ct_t?window.__ct_t(k):k;}
function lang(){return window.__ct_lang?window.__ct_lang():'ru';}
function cur(){var s=$('curSel');return(localStorage.getItem('ct_cur')||(s&&s.value)||'usd').toLowerCase();}
var fxRate=1,fxAt=0;
async function getFx(){
  if(Date.now()-fxAt<120000)return fxRate;
  var c=cur();if(c==='usd'){fxRate=1;fxAt=Date.now();return 1;}
  try{var d=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json();});
    fxRate=c==='eur'?(d.rates.EUR||1):c==='rub'?(d.rates.RUB||1):c==='pln'?(d.rates.PLN||1):1;fxAt=Date.now();}catch(e){}
  return fxRate;
}
function money(v){
  if(v==null||isNaN(+v))return '\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v*fxRate;
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  return s+n.toFixed(2);
}
var STOCKS=[{s:'AAPL',n:'Apple'},{s:'MSFT',n:'Microsoft'},{s:'GOOGL',n:'Alphabet'},{s:'AMZN',n:'Amazon'},{s:'NVDA',n:'NVIDIA'},{s:'TSLA',n:'Tesla'},{s:'META',n:'Meta'},{s:'AMD',n:'AMD'},{s:'NFLX',n:'Netflix'},{s:'JPM',n:'JPMorgan'},{s:'V',n:'Visa'},{s:'BABA',n:'Alibaba'},{s:'DIS',n:'Disney'},{s:'KO',n:'Coca-Cola'},{s:'INTC',n:'Intel'},{s:'PEP',n:'Pepsi'},{s:'NKE',n:'Nike'},{s:'BA',n:'Boeing'},{s:'CRM',n:'Salesforce'},{s:'ORCL',n:'Oracle'},{s:'ADBE',n:'Adobe'},{s:'PYPL',n:'PayPal'},{s:'UBER',n:'Uber'}];
var STOCK_TV={AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',NFLX:'NASDAQ:NFLX',AMD:'NASDAQ:AMD',INTC:'NASDAQ:INTC',BABA:'NYSE:BABA',JPM:'NYSE:JPM',V:'NYSE:V',DIS:'NYSE:DIS',KO:'NYSE:KO',PEP:'NASDAQ:PEP',NKE:'NYSE:NKE',BA:'NYSE:BA',CRM:'NYSE:CRM',ORCL:'NYSE:ORCL',ADBE:'NASDAQ:ADBE',PYPL:'NASDAQ:PYPL',UBER:'NYSE:UBER'};
var stockData={};
try{var sc=JSON.parse(localStorage.getItem('ct_stocks_v2')||'{}');if(sc)stockData=sc;}catch(e){}
function saveStocks(){try{localStorage.setItem('ct_stocks_v2',JSON.stringify(stockData));}catch(e){}}
async function fetchOne(sym){
  var yurl='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(sym)+'?interval=1d&range=5d';
  function parse(d){var m=d.chart.result[0].meta;var p=m.regularMarketPrice,prev=m.chartPreviousClose||m.previousClose||p;return{price:+p,ch:prev?((p-prev)/prev*100):0,name:m.shortName||sym,at:Date.now()};}
  var urls=[yurl,'https://api.allorigins.win/raw?url='+encodeURIComponent(yurl),'https://corsproxy.io/?'+encodeURIComponent(yurl)];
  for(var i=0;i<urls.length;i++){try{var r=await fetch(urls[i],{signal:AbortSignal.timeout(7000)});if(!r.ok)continue;var d=await r.json();if(d&&d.chart)return parse(d);if(d&&d.contents)return parse(JSON.parse(d.contents));}catch(e){}}
  try{var td=await fetch('https://api.twelvedata.com/quote?symbol='+sym+'&apikey=demo',{signal:AbortSignal.timeout(5000)}).then(function(r){return r.json();});if(td&&td.close){var p=+td.close,prev=+(td.previous_close||td.close);return{price:p,ch:prev?((p-prev)/prev*100):0,name:td.name||sym,at:Date.now()};}}catch(e){}
  return null;
}
var stockLoading=false;
async function loadStocks(){
  if(stockLoading)return;stockLoading=true;await getFx();paintStocks();
  for(var i=0;i<STOCKS.length;i+=3){
    var batch=STOCKS.slice(i,i+3);
    await Promise.all(batch.map(async function(st){var q=await fetchOne(st.s);if(q)stockData[st.s]=q;else if(!stockData[st.s])stockData[st.s]={price:null,ch:0,name:st.n,at:0};}));
    saveStocks();paintStocks();
  }
  var miss=STOCKS.filter(function(st){return!stockData[st.s]||stockData[st.s].price==null;});
  for(var j=0;j<miss.length;j++){var q2=await fetchOne(miss[j].s);if(q2)stockData[miss[j].s]=q2;}
  saveStocks();paintStocks();stockLoading=false;
}
window.__ct_loadStocks=loadStocks;
function paintStocks(){
  var body=$('stockBody');if(!body)return;
  var q=(($('stockQ')||{}).value||'').trim().toLowerCase();
  var rows=STOCKS.filter(function(st){return!q||st.s.toLowerCase().indexOf(q)>=0||st.n.toLowerCase().indexOf(q)>=0;});
  var html='';
  rows.forEach(function(st,i){var d=stockData[st.s]||{},price=d.price!=null?money(d.price):'\u2014',ch=d.ch||0;var cls=ch>0.05?'up':ch<-0.05?'dn':'';html+='<tr class="s-tr" data-s="'+st.s+'"><td>'+(i+1)+'</td><td><b>'+st.s+'</b> <span class="muted">'+st.n+'</span></td><td>'+price+'</td><td class="'+cls+'">'+(ch>=0?'+':'')+(+ch).toFixed(2)+'%</td></tr>';});
  body.innerHTML=html;
  body.querySelectorAll('.s-tr').forEach(function(tr){tr.onclick=function(){openStock(tr.getAttribute('data-s'));};});
  var sorted=STOCKS.map(function(st){return{s:st.s,ch:(stockData[st.s]||{}).ch||0,price:(stockData[st.s]||{}).price};}).filter(function(x){return x.price!=null;});
  function gl(id,arr){var box=$(id);if(!box)return;box.innerHTML=arr.map(function(x){return '<div class="s-gl" data-s="'+x.s+'"><b>'+x.s+'</b> <span class="'+(x.ch>=0?'up':'dn')+'">'+(x.ch>=0?'+':'')+(+x.ch).toFixed(2)+'%</span></div>';}).join('')||'<div class="muted">\u2014</div>';box.querySelectorAll('.s-gl').forEach(function(el){el.onclick=function(){openStock(el.getAttribute('data-s'));};});}
  gl('stockGainers',sorted.slice().sort(function(a,b){return b.ch-a.ch;}).slice(0,6));
  gl('stockLosers',sorted.slice().sort(function(a,b){return a.ch-b.ch;}).slice(0,6));
  paintStockPort();
}
window.__ct_paintStocks=paintStocks;
var tvReady=null;
function ensureTV(){if(window.TradingView)return Promise.resolve();if(tvReady)return tvReady;tvReady=new Promise(function(res){var s=document.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.onload=function(){res();};s.onerror=function(){res();};document.head.appendChild(s);});return tvReady;}
async function openStock(sym){
  var det=$('stockDetail');if(!det)return;det.style.display='block';
  var d=stockData[sym]||{};
  if($('sdName'))$('sdName').textContent=d.name||sym;if($('sdSym'))$('sdSym').textContent=sym;
  if($('sdPrice'))$('sdPrice').textContent=d.price!=null?money(d.price):'\u2014';
  if($('sdCh')){$('sdCh').textContent=((d.ch||0)>=0?'+':'')+(+(d.ch||0)).toFixed(2)+'%';$('sdCh').className=(d.ch||0)>=0?'up':'dn';}
  var box=$('stockTv');
  if(box){box.innerHTML='';await ensureTV();if(window.TradingView){var cid='stv_'+Date.now(),el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';try{new TradingView.widget({autosize:true,symbol:STOCK_TV[sym]||('NASDAQ:'+sym),interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#fff',allow_symbol_change:true,withdateranges:true});}catch(e){}}}
  if(window.__ct_itemNews)window.__ct_itemNews(sym,'stock');
  det.scrollIntoView({behavior:'smooth',block:'start'});
}
function getSP(){try{return JSON.parse(localStorage.getItem('ct_sport')||'[]');}catch(e){return[];}}
function setSP(a){localStorage.setItem('ct_sport',JSON.stringify(a));}
function paintStockPort(){
  var list=$('spList'),total=$('spTotal'),an=$('spAnalysis');if(!list)return;
  var holds=getSP();
  if(!holds.length){list.innerHTML='<div class="muted">\u2014</div>';if(total)total.textContent=money(0);if(an)an.innerHTML='';return;}
  var sum=0,html='',parts=[];
  holds.forEach(function(h,idx){var d=stockData[h.s]||{},px=d.price||h.buy||0,val=px*h.qty;sum+=val;parts.push({s:h.s,val:val});html+='<div class="hold-row"><div><b>'+h.s+'</b> \u00d7'+h.qty+'</div><span>'+money(val)+' <button type="button" class="btn-ghost sp-rm" data-i="'+idx+'" style="padding:.1rem .35rem">\u00d7</button></span></div>';});
  list.innerHTML=html;if(total)total.textContent=money(sum);
  list.querySelectorAll('.sp-rm').forEach(function(b){b.onclick=function(){var a=getSP();a.splice(+b.getAttribute('data-i'),1);setSP(a);paintStockPort();};});
  if(an&&sum>0)an.innerHTML=parts.sort(function(a,b){return b.val-a.val;}).map(function(p){return '<div class="hold-row"><span>'+p.s+'</span><span>'+(p.val/sum*100).toFixed(1)+'%</span></div>';}).join('');
}
function ensureStocksPage(){
  if(window.__ct_kill)window.__ct_kill();
  var nav=$('nav');
  if(nav&&!document.querySelector('.nav-btn[data-p="stocks"]')){
    var tools=document.querySelector('.nav-btn[data-p="tools"]');
    var btn=document.createElement('button');btn.type='button';btn.className='nav-btn';btn.setAttribute('data-p','stocks');
    btn.innerHTML='<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg><span>'+t('stocks')+'</span>';
    if(tools)nav.insertBefore(btn,tools);else nav.appendChild(btn);
    btn.addEventListener('click',function(){document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});var page=$('p-stocks');if(page){page.classList.add('on');if(window.__ct_applyLang)window.__ct_applyLang();loadStocks();}});
  }
  if($('p-stocks')){paintStocks();return;}
  var wrap=document.querySelector('.wrap');if(!wrap)return;
  var sec=document.createElement('section');sec.className='page';sec.id='p-stocks';
  sec.innerHTML='<div class="search-wrap"><input type="search" id="stockQ" placeholder="'+t('searchStock')+'" autocomplete="off"/></div><div class="card"><div class="card-head"><h2>'+t('stockList')+'</h2><button type="button" class="btn-ghost" id="stockRef">\u21bb</button></div><div class="table-x"><table><thead><tr><th>#</th><th>'+t('ticker')+'</th><th>'+t('price')+'</th><th>24h</th></tr></thead><tbody id="stockBody"></tbody></table></div></div><div class="card" id="stockDetail" style="display:none"><div class="coin"><div><div class="nm" id="sdName">\u2014</div><div class="sy" id="sdSym">\u2014</div></div><div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">\u2014</div><div id="sdCh">\u2014</div></div></div><div id="stockTv" style="height:360px;width:100%;border-radius:12px;overflow:hidden;background:#12101c;margin-top:.5rem"></div><div id="stockNews" style="margin-top:.65rem"></div></div><div class="card"><h2>'+t('gainers')+'</h2><div id="stockGainers" class="trend-grid"></div></div><div class="card"><h2>'+t('losers')+'</h2><div id="stockLosers" class="trend-grid"></div></div><div class="card"><h2>'+t('stockPort')+'</h2><div class="form"><div class="field"><label>Ticker</label><select id="spSym">'+STOCKS.map(function(s){return '<option value="'+s.s+'">'+s.s+'</option>';}).join('')+'</select></div><div class="field"><label>'+t('qty')+'</label><input type="number" id="spQty" min="0" step="any" value="1"/></div><div class="field"><label>'+t('buy')+'</label><input type="number" id="spBuy" min="0" step="any"/></div></div><button type="button" class="btn" id="spAdd" style="margin-top:.5rem">+ '+t('add')+'</button><div id="spList" style="margin-top:.7rem"></div><div class="pnl-box" style="margin-top:.5rem"><div class="muted">'+t('total')+'</div><div style="font-size:1.2rem;font-weight:700" id="spTotal">\u2014</div></div><div style="margin-top:.6rem"><b>'+t('analysis')+'</b><div id="spAnalysis"></div></div></div>';
  wrap.appendChild(sec);
  if($('stockRef'))$('stockRef').onclick=function(){loadStocks();};
  if($('stockQ'))$('stockQ').addEventListener('input',paintStocks);
  if($('spAdd'))$('spAdd').onclick=function(){var s=($('spSym')||{}).value,qty=parseFloat(($('spQty')||{}).value),buy=parseFloat(($('spBuy')||{}).value);if(!s||!qty||qty<=0)return;var a=getSP();a.push({s:s,qty:qty,buy:buy||(stockData[s]&&stockData[s].price)||0});setSP(a);paintStockPort();};
  paintStocks();
}
function boot(){
  var curSel=$('curSel');
  if(curSel){var sc=localStorage.getItem('ct_cur');if(sc)curSel.value=sc;curSel.addEventListener('change',function(){localStorage.setItem('ct_cur',curSel.value);fxAt=0;getFx().then(function(){paintStocks();});});}
  setTimeout(function(){ensureStocksPage();loadStocks();},600);
  setInterval(function(){if($('p-stocks')&&$('p-stocks').classList.contains('on'))loadStocks();},28000);
  document.addEventListener('click',function(e){if(e.target.closest('.nav-btn[data-p="stocks"]'))setTimeout(function(){ensureStocksPage();loadStocks();},40);},true);
  if(!$('ct-v125css')){var s=document.createElement('style');s.id='ct-v125css';s.textContent='.wrap{max-width:1100px!important;width:100%!important}#aiBox,.ai-box{display:none!important}.bottom-nav{grid-template-columns:repeat(6,1fr)!important}.nav-btn{font-size:.58rem!important}.s-tr{cursor:pointer}.s-tr:hover{background:rgba(168,85,247,.1)}.s-gl{display:inline-flex;gap:.35rem;padding:.35rem .55rem;border-radius:10px;background:rgba(168,85,247,.08);margin:.15rem;cursor:pointer}.up{color:#22c55e}.dn{color:#ef4444}';document.head.appendChild(s);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
