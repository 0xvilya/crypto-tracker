/* v114 compact: instant chart, mcap, wallets */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function lang(){var s=$('langSel');return(s&&s.value)||localStorage.getItem('ct_lang')||'ru'}
function cur(){return(localStorage.getItem('ct_cur')||'usd').toLowerCase()}
function money(v){
  if(v==null||isNaN(v))return'\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v;
  if(Math.abs(n)>=1e12)return s+(n/1e12).toFixed(2)+'T';
  if(Math.abs(n)>=1e9)return s+(n/1e9).toFixed(2)+'B';
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  if(Math.abs(n)>=1)return s+n.toFixed(2);
  return s+n.toFixed(4);
}
async function refreshGlobal(){
  try{
    var d=await fetch('https://api.coingecko.com/api/v3/global').then(function(r){return r.json()});
    var g=d&&d.data;if(!g)return;
    var fx=1;
    try{
      var fxD=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json()});
      var c=cur();
      if(fxD&&fxD.rates){if(c==='eur')fx=fxD.rates.EUR;else if(c==='rub')fx=fxD.rates.RUB;else if(c==='pln')fx=fxD.rates.PLN}
    }catch(e){}
    var mcap=g.total_market_cap&&g.total_market_cap.usd;
    var btc=g.market_cap_percentage&&g.market_cap_percentage.btc;
    if($('mcapChip')&&mcap!=null)$('mcapChip').textContent='Cap: '+money(mcap*fx);
    if($('domChip')&&btc!=null)$('domChip').textContent='BTC: '+(+btc).toFixed(1)+'%';
  }catch(e){}
}
window.__noAutoTV=true;
var connected={type:null,address:null};
function shortAddr(a){if(!a||a.length<12)return a||'\u2014';return a.slice(0,6)+'\u2026'+a.slice(-4)}
function enhanceWalletUI(){
  var page=$('p-wallet');if(!page||page._enh)return;page._enh=1;
  var card=document.createElement('div');card.className='card';card.id='walletConnectCard';
  card.innerHTML='<h2>'+(lang()==='ru'?'\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a':'Connect wallet')+'</h2>'+
    '<p class="muted" style="margin-bottom:.55rem">'+(lang()==='ru'?'Tonkeeper, MetaMask, Phantom. \u0414\u0430\u043d\u043d\u044b\u0435 \u0442\u043e\u043b\u044c\u043a\u043e \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.':'Tonkeeper, MetaMask, Phantom. Data stays in browser.')+'</p>'+
    '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.55rem">'+
    '<button type="button" class="btn" id="btnTon" style="width:auto;flex:1;min-width:120px;padding:.5rem;font-size:.8rem">TON / Tonkeeper</button>'+
    '<button type="button" class="btn-ghost" id="btnEvm" style="flex:1;min-width:120px;padding:.5rem;font-size:.8rem">MetaMask</button>'+
    '<button type="button" class="btn-ghost" id="btnSol" style="flex:1;min-width:120px;padding:.5rem;font-size:.8rem">Phantom</button></div>'+
    '<div id="walletStatus" class="muted" style="font-size:.8rem">\u2014</div><div id="walletAnalytics" style="display:none"></div>';
  var first=page.querySelector('.card');
  if(first)page.insertBefore(card,first);else page.appendChild(card);
  $('btnTon').onclick=connectTON;$('btnEvm').onclick=connectEVM;$('btnSol').onclick=connectSol;
  updateWS();
}
function updateWS(){
  var el=$('walletStatus');if(!el)return;
  if(!connected.address){el.textContent=lang()==='ru'?'\u041a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d':'No wallet connected';return}
  el.innerHTML='<span style="color:var(--accent)">'+connected.type+'</span>: <b>'+shortAddr(connected.address)+'</b>';
  loadWA();
}
async function connectTON(){
  var st=$('walletStatus');
  if(st)st.textContent=lang()==='ru'?'\u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0435 Tonkeeper\u2026':'Opening Tonkeeper\u2026';
  try{
    if(!window.TON_CONNECT_UI){
      await new Promise(function(res,rej){var s=document.createElement('script');s.src='https://unpkg.com/@tonconnect/ui@2.0.9/dist/tonconnect-ui.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
    }
    var UI=window.TON_CONNECT_UI;
    if(!UI){window.open('https://tonkeeper.com/download','_blank');if(st)st.textContent='Tonkeeper';return}
    if(!window.__tonUI)window.__tonUI=new UI.TonConnectUI({manifestUrl:'https://0xvilya.github.io/crypto-tracker/tonconnect-manifest.json'});
    await window.__tonUI.connectWallet();
    var w=window.__tonUI.wallet;
    if(w&&w.account){
      connected={type:'TON',address:w.account.address};
      if($('manChain'))$('manChain').value='ton';
      if($('manAddr'))$('manAddr').value=w.account.address;
      updateWS();
    }
  }catch(e){
    if(st)st.textContent=lang()==='ru'?'\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 TON \u0432\u0440\u0443\u0447\u043d\u0443\u044e \u043d\u0438\u0436\u0435':'Paste TON address below';
  }
}
async function connectEVM(){
  var st=$('walletStatus');
  try{
    if(!window.ethereum){window.open('https://metamask.app.link/dapp/'+location.host+location.pathname,'_blank');return}
    var acc=await window.ethereum.request({method:'eth_requestAccounts'});
    if(acc&&acc[0]){
      connected={type:'EVM',address:acc[0]};
      if($('manChain'))$('manChain').value='eth';
      if($('manAddr'))$('manAddr').value=acc[0];
      updateWS();
    }
  }catch(e){if(st)st.textContent=String(e.message||e)}
}
async function connectSol(){
  var st=$('walletStatus');
  try{
    var sol=window.solana||(window.phantom&&window.phantom.solana);
    if(!sol){window.open('https://phantom.app/','_blank');return}
    var r=await sol.connect();
    var pk=r&&r.publicKey?r.publicKey.toString():(sol.publicKey&&sol.publicKey.toString());
    if(pk){
      connected={type:'Solana',address:pk};
      if($('manChain'))$('manChain').value='sol';
      if($('manAddr'))$('manAddr').value=pk;
      updateWS();
    }
  }catch(e){if(st)st.textContent=String(e.message||e)}
}
async function loadWA(){
  var box=$('walletAnalytics');if(!box||!connected.address)return;
  box.style.display='block';
  var html='<div class="pnl-box" style="margin-top:.4rem"><div class="muted">'+(lang()==='ru'?'\u0410\u0434\u0440\u0435\u0441':'Address')+'</div><div style="font-size:.72rem;word-break:break-all">'+connected.address+'</div></div>';
  if(connected.type==='EVM'||(connected.address||'').indexOf('0x')===0){
    try{
      var res=await fetch('https://ethereum.publicnode.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getBalance',params:[connected.address,'latest']})}).then(function(r){return r.json()});
      var eth=(res&&res.result?parseInt(res.result,16):0)/1e18;
      var p=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(function(r){return r.json()});
      var usd=eth*((p.ethereum&&p.ethereum.usd)||0);
      html+='<div class="hold-row"><b>ETH</b><span>'+eth.toFixed(6)+' \u2248 '+money(usd)+'</span></div>';
    }catch(e){}
  }
  html+='<div class="muted" style="margin-top:.4rem;font-size:.75rem">'+(lang()==='ru'?'\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c\u00bb \u043d\u0438\u0436\u0435 \u0434\u043b\u044f \u043f\u043e\u043b\u043d\u043e\u0433\u043e \u0430\u043d\u0430\u043b\u0438\u0437\u0430 \u0441\u0435\u0442\u0438.':'Press Show below for full network analysis.')+'</div>';
  box.innerHTML=html;
  if($('manBtn')&&$('manAddr')&&$('manAddr').value){try{$('manBtn').click()}catch(e){}}
}
function ensureProBtn(){
  var tabs=$('chartTabs');if(!tabs||$('btnProChart'))return;
  var b=document.createElement('button');b.type='button';b.id='btnProChart';b.className='tab';
  b.textContent='Pro TV';b.style.marginLeft='auto';
  b.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    var sy=(($('dSym')||{}).textContent||'').trim().toUpperCase();
    var map={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',TON:'the-open-network',XMR:'monero',ADA:'cardano',DOGE:'dogecoin'};
    var id=map[sy];if(id)loadTV(id);
  };
  tabs.appendChild(b);
}
var tvReady=null;
function ensureTV(){
  if(window.TradingView)return Promise.resolve();
  if(tvReady)return tvReady;
  tvReady=new Promise(function(res){var s=document.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.onload=function(){res()};s.onerror=function(){res()};document.head.appendChild(s)});
  return tvReady;
}
async function loadTV(id){
  var box=$('tv');if(!box)return;
  box.style.background='#12101c';box.style.height='360px';
  box.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">'+(lang()==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 TradingView\u2026':'Loading TradingView\u2026')+'</div>';
  await ensureTV();
  if(!window.TradingView){box.innerHTML='<div class="muted" style="text-align:center;padding:2rem">TV N/A</div>';return}
  box.innerHTML='';
  var cid='tvw_'+Date.now();
  var el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
  var map={bitcoin:'BINANCE:BTCUSDT',ethereum:'BINANCE:ETHUSDT',solana:'BINANCE:SOLUSDT',binancecoin:'BINANCE:BNBUSDT',ripple:'BINANCE:XRPUSDT','the-open-network':'BINANCE:TONUSDT',monero:'BINANCE:XMRUSDT',cardano:'BINANCE:ADAUSDT',dogecoin:'BINANCE:DOGEUSDT'};
  var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  try{
    new TradingView.widget({autosize:true,symbol:map[id]||'BINANCE:BTCUSDT',interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',toolbar_bg:theme==='dark'?'#12101c':'#f5f3fb',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#ffffff',allow_symbol_change:false,withdateranges:true});
  }catch(e){}
}
var nCache={at:0,items:[],filter:'all',tr:{}};
async function loadNews(){
  var box=$('newsList');if(!box)return;
  if(nCache.items.length&&Date.now()-nCache.at<60000){await paintNews();return}
  box.innerHTML='<div class="empty">\u2026</div>';
  var all=[];
  try{
    async function hn(q){var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage=12').then(function(r){return r.json()});return(d.hits||[]).map(function(h){return{title:h.title||'',link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN'}}).filter(function(x){return x.title})}
    var parts=await Promise.all([hn('bitcoin OR crypto'),hn('ethereum OR solana'),hn('blockchain')]);
    parts.forEach(function(a){all=all.concat(a)});
  }catch(e){}
  var seen={};all=all.filter(function(n){var k=n.title.toLowerCase().slice(0,60);if(seen[k])return false;seen[k]=1;return true});
  all.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0)});
  nCache={at:Date.now(),items:all.slice(0,30),filter:nCache.filter,tr:nCache.tr};
  await paintNews();
}
async function paintNews(){
  var box=$('newsList');if(!box)return;
  var f=nCache.items,L=lang(),html=[],limit=Math.min(f.length,18);
  for(var i=0;i<limit;i++){
    var n=f[i],t=n.title,d='';
    try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
    if(L==='ru'){try{if(nCache.tr[t])t=nCache.tr[t];else{var tr=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(n.title.slice(0,300))+'&langpair=en|ru').then(function(r){return r.json()});var o=tr&&tr.responseData&&tr.responseData.translatedText;if(o&&o.indexOf('MYMEMORY')===-1){t=o;nCache.tr[n.title]=o}}}catch(e){}}
    html.push('<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener">'+t+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>');
  }
  box.innerHTML=html.join('')||'<div class="empty">\u2014</div>';
}
function boot(){
  refreshGlobal();setInterval(refreshGlobal,60000);
  var curSel=$('curSel');if(curSel)curSel.addEventListener('change',function(){setTimeout(refreshGlobal,300)});
  document.addEventListener('click',function(e){
    if(e.target.closest('tr[data-id]')&&!e.target.closest('.wl-rm'))setTimeout(ensureProBtn,300);
    if(e.target.closest('.nav-btn[data-p="wallet"]'))setTimeout(enhanceWalletUI,200);
    if(e.target.closest('.nav-btn[data-p="news"]')){setTimeout(loadNews,500);setTimeout(loadNews,2000)}
  },true);
  setTimeout(function(){var pw=$('p-wallet');if(pw&&pw.classList.contains('on'))enhanceWalletUI();ensureProBtn()},1200);
  setTimeout(loadNews,2500);
  setInterval(function(){var pn=$('p-news');if(pn&&pn.classList.contains('on'))loadNews()},90000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
