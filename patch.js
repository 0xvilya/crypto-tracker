/* v115: TON symbol, mcap T, APY real, news multi, wallet switch */
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
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:0});
  if(Math.abs(n)>=1)return s+n.toFixed(2);
  return s+n.toFixed(4);
}
var lastMcap=0;
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
    lastMcap=mcap;
    if($('mcapChip')&&mcap!=null){
      $('mcapChip').textContent='Cap: '+money(mcap*fx);
      $('mcapChip').title=(mcap/1e12).toFixed(3)+'T USD';
    }
    if($('domChip')&&btc!=null)$('domChip').textContent='BTC: '+(+btc).toFixed(1)+'%';
  }catch(e){}
}
setInterval(function(){
  var el=$('mcapChip');
  if(!el||!lastMcap)return;
  var t=el.textContent||'';
  if(t.indexOf('B')!==-1&&lastMcap>=1e12){
    el.textContent='Cap: '+money(lastMcap);
  }
},3000);
var apyMap={},apyAt=0;
async function refreshAPY(){
  if(Date.now()-apyAt<50*60*1000&&Object.keys(apyMap).length)return;
  try{
    var d=await fetch('https://yields.llama.fi/pools').then(function(r){return r.json()});
    var pools=d&&d.data||[];
    var bySym={};
    pools.forEach(function(p){
      var sym=(p.symbol||'').toUpperCase().split(' ')[0].split('-')[0];
      if(!sym||sym.length>6)return;
      var apy=+p.apy||0;
      var tvl=+p.tvlUsd||0;
      if(apy<0.3||apy>40||tvl<5e5)return;
      var cat=(p.category||'').toLowerCase();
      var proj=(p.project||'').toLowerCase();
      var score=tvl;
      if(cat.indexOf('liquid staking')!==-1||cat.indexOf('staking')!==-1)score*=3;
      if(proj.indexOf('lido')!==-1||proj.indexOf('marinade')!==-1||proj.indexOf('jito')!==-1||proj.indexOf('rocket')!==-1)score*=2;
      if(!bySym[sym]||score>bySym[sym].score)bySym[sym]={apy:apy,score:score,proj:p.project};
    });
    var idMap={ETH:'ethereum',SOL:'solana',BNB:'binancecoin',ADA:'cardano',DOT:'polkadot',AVAX:'avalanche-2',ATOM:'cosmos',NEAR:'near',TRX:'tron',TON:'the-open-network',MATIC:'matic-network',POL:'matic-network',LINK:'chainlink'};
    Object.keys(bySym).forEach(function(sym){
      var id=idMap[sym];
      if(id)apyMap[id]=bySym[sym].apy;
      apyMap[sym]=bySym[sym].apy;
    });
    if(!apyMap.ethereum)apyMap.ethereum=3.2;
    if(!apyMap.solana)apyMap.solana=6.5;
    if(!apyMap['the-open-network'])apyMap['the-open-network']=3.5;
    if(!apyMap.cardano)apyMap.cardano=2.8;
    if(!apyMap.polkadot)apyMap.polkadot=10;
    if(!apyMap.cosmos)apyMap.cosmos=14;
    apyAt=Date.now();
    applyAPYToTable();
  }catch(e){}
}
function applyAPYToTable(){
  var rows=document.querySelectorAll('#wBody tr[data-id]');
  rows.forEach(function(tr){
    var id=tr.getAttribute('data-id');
    var td=tr.querySelector('td:nth-child(5)');
    if(!td)return;
    var a=apyMap[id];
    if(a==null){
      var sy=(tr.querySelector('.sy, .nm')||{}).textContent||'';
      a=apyMap[sy.trim().toUpperCase()];
    }
    if(a!=null&&a>0)td.textContent=(+a).toFixed(1)+'%';
  });
  var sc=$('stakeCoin');
  if(sc&&apyMap[sc.value]){
    var apyEl=$('stakeApy');
    if(apyEl&&!apyEl._user)apyEl.value=(+apyMap[sc.value]).toFixed(2);
  }
}
var TV_MAP={
  bitcoin:'BINANCE:BTCUSDT',ethereum:'BINANCE:ETHUSDT',solana:'BINANCE:SOLUSDT',
  binancecoin:'BINANCE:BNBUSDT',ripple:'BINANCE:XRPUSDT',cardano:'BINANCE:ADAUSDT',
  dogecoin:'BINANCE:DOGEUSDT',monero:'BINANCE:XMRUSDT','the-open-network':'OKX:TONUSDT',
  toncoin:'OKX:TONUSDT',litecoin:'BINANCE:LTCUSDT',polkadot:'BINANCE:DOTUSDT',
  'avalanche-2':'BINANCE:AVAXUSDT','matic-network':'BINANCE:POLUSDT',pepe:'BINANCE:PEPEUSDT',
  chainlink:'BINANCE:LINKUSDT',tron:'BINANCE:TRXUSDT',cosmos:'BINANCE:ATOMUSDT',
  near:'BINANCE:NEARUSDT','shiba-inu':'BINANCE:SHIBUSDT'
};
var SYM_ID={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',TON:'the-open-network',XMR:'monero',ADA:'cardano',DOGE:'dogecoin',DOT:'polkadot',AVAX:'avalanche-2',LINK:'chainlink',TRX:'tron',ATOM:'cosmos',NEAR:'near'};
function ensureProBtn(){
  var tabs=$('chartTabs');if(!tabs||$('btnProChart'))return;
  var b=document.createElement('button');b.type='button';b.id='btnProChart';b.className='tab';
  b.textContent='Pro TV';b.style.marginLeft='auto';
  b.onclick=function(e){e.preventDefault();e.stopPropagation();
    var sy=(($('dSym')||{}).textContent||'').trim().toUpperCase();
    loadTV(SYM_ID[sy]||'bitcoin');
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
  box.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">'+(lang()==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 TradingView\u2026':'Loading\u2026')+'</div>';
  await ensureTV();
  if(!window.TradingView){box.innerHTML='<div class="muted" style="text-align:center;padding:2rem">TV N/A</div>';return}
  box.innerHTML='';
  var cid='tvw_'+Date.now();
  var el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
  var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  try{
    new TradingView.widget({autosize:true,symbol:TV_MAP[id]||'BINANCE:BTCUSDT',interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',toolbar_bg:theme==='dark'?'#12101c':'#f5f3fb',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#ffffff',allow_symbol_change:true,withdateranges:true});
  }catch(e){}
}
var connected={type:null,address:null};
function shortAddr(a){if(!a||a.length<12)return a||'\u2014';return a.slice(0,6)+'\u2026'+a.slice(-4)}
function enhanceWalletUI(){
  var page=$('p-wallet');if(!page||page._enh)return;page._enh=1;
  var card=document.createElement('div');card.className='card';card.id='walletConnectCard';
  card.innerHTML='<h2>'+(lang()==='ru'?'\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a':'Connect wallet')+'</h2>'+
    '<p class="muted" style="margin-bottom:.5rem">Tonkeeper \u00b7 MetaMask \u00b7 Phantom</p>'+
    '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">'+
    '<button type="button" class="btn" id="btnTon" style="width:auto;flex:1;min-width:110px;padding:.5rem;font-size:.8rem">TON</button>'+
    '<button type="button" class="btn-ghost" id="btnEvm" style="flex:1;min-width:110px;padding:.5rem;font-size:.8rem">MetaMask</button>'+
    '<button type="button" class="btn-ghost" id="btnSol" style="flex:1;min-width:110px;padding:.5rem;font-size:.8rem">Phantom</button></div>'+
    '<div id="walletStatus" class="muted" style="font-size:.8rem;margin-bottom:.35rem">\u2014</div>'+
    '<button type="button" class="btn-ghost" id="btnReconnect" style="display:none;padding:.35rem .6rem;font-size:.78rem">'+(lang()==='ru'?'\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a':'Switch wallet')+'</button>'+
    '<div id="walletAnalytics" style="display:none"></div>';
  var first=page.querySelector('.card');
  if(first)page.insertBefore(card,first);else page.appendChild(card);
  $('btnTon').onclick=connectTON;$('btnEvm').onclick=connectEVM;$('btnSol').onclick=connectSol;
  $('btnReconnect').onclick=function(){
    connected={type:null,address:null};
    try{if(window.__tonUI)window.__tonUI.disconnect()}catch(e){}
    updateWS();
  };
  updateWS();
}
function updateWS(){
  var el=$('walletStatus'),rb=$('btnReconnect');if(!el)return;
  if(!connected.address){
    el.textContent=lang()==='ru'?'\u041a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d':'No wallet connected';
    if(rb)rb.style.display='none';
    if($('walletAnalytics'))$('walletAnalytics').style.display='none';
    return;
  }
  el.innerHTML='<span style="color:var(--accent)">'+connected.type+'</span>: <b>'+shortAddr(connected.address)+'</b>';
  if(rb)rb.style.display='inline-block';
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
    if(!UI){window.open('https://tonkeeper.com/download','_blank');return}
    if(!window.__tonUI)window.__tonUI=new UI.TonConnectUI({manifestUrl:'https://0xvilya.github.io/crypto-tracker/tonconnect-manifest.json'});
    await window.__tonUI.connectWallet();
    var w=window.__tonUI.wallet;
    if(w&&w.account){
      connected={type:'TON',address:w.account.address};
      if($('manChain'))$('manChain').value='ton';
      if($('manAddr'))$('manAddr').value=w.account.address;
      updateWS();
    }
  }catch(e){if(st)st.textContent=lang()==='ru'?'\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 TON':'Paste TON address'}
}
async function connectEVM(){
  var st=$('walletStatus');
  try{
    if(!window.ethereum){window.open('https://metamask.app.link/dapp/'+location.host+location.pathname,'_blank');return}
    var acc=await window.ethereum.request({method:'eth_requestAccounts'});
    if(acc&&acc[0]){connected={type:'EVM',address:acc[0]};if($('manChain'))$('manChain').value='eth';if($('manAddr'))$('manAddr').value=acc[0];updateWS()}
  }catch(e){if(st)st.textContent=String(e.message||e)}
}
async function connectSol(){
  var st=$('walletStatus');
  try{
    var sol=window.solana||(window.phantom&&window.phantom.solana);
    if(!sol){window.open('https://phantom.app/','_blank');return}
    var r=await sol.connect();
    var pk=r&&r.publicKey?r.publicKey.toString():(sol.publicKey&&sol.publicKey.toString());
    if(pk){connected={type:'Solana',address:pk};if($('manChain'))$('manChain').value='sol';if($('manAddr'))$('manAddr').value=pk;updateWS()}
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
      html+='<div class="hold-row"><b>ETH</b><span>'+eth.toFixed(6)+' \u2248 '+money(eth*((p.ethereum&&p.ethereum.usd)||0))+'</span></div>';
    }catch(e){}
  }
  box.innerHTML=html;
  if($('manBtn')&&$('manAddr')&&$('manAddr').value){try{$('manBtn').click()}catch(e){}}
}
var nCache={at:0,items:[],seen:{},tr:{}};
async function hn(q){
  var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage=8').then(function(r){return r.json()});
  return(d.hits||[]).map(function(h){return{title:h.title||h.story_title||'',link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN',id:String(h.objectID)}}).filter(function(x){return x.title});
}
async function redditCrypto(){
  try{
    var d=await fetch('https://www.reddit.com/r/cryptocurrency/new.json?limit=10').then(function(r){return r.json()});
    return((d.data&&d.data.children)||[]).map(function(c){
      var x=c.data||{};
      return{title:x.title||'',link:'https://reddit.com'+x.permalink,date:new Date((x.created_utc||0)*1000).toISOString(),src:'Reddit',id:'rd_'+x.id};
    }).filter(function(x){return x.title});
  }catch(e){return[]}
}
async function trRu(t){
  if(!t||lang()!=='ru')return t;
  if(nCache.tr[t])return nCache.tr[t];
  try{
    var d=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(t.slice(0,350))+'&langpair=en|ru').then(function(r){return r.json()});
    var o=d&&d.responseData&&d.responseData.translatedText;
    if(o&&o.indexOf('MYMEMORY')===-1){nCache.tr[t]=o;return o}
  }catch(e){}
  return t;
}
async function loadNews(force){
  var box=$('newsList');if(!box)return;
  if(!force&&nCache.items.length&&Date.now()-nCache.at<20000){await paintNews(false);return}
  var all=[];
  try{
    var parts=await Promise.all([hn('bitcoin OR crypto OR ethereum'),hn('solana OR ripple OR toncoin OR blockchain'),redditCrypto()]);
    parts.forEach(function(a){all=all.concat(a)});
  }catch(e){}
  var merged=[];
  all.forEach(function(n){
    var k=(n.id||n.title).toLowerCase().slice(0,80);
    if(nCache.seen[k]||!n.title)return;
    nCache.seen[k]=1;
    merged.push(n);
  });
  var prev=nCache.items.slice();
  var ids={};prev.forEach(function(n){ids[n.id||n.title]=1});
  var fresh=merged.filter(function(n){return!ids[n.id||n.title]});
  nCache.items=fresh.concat(prev).slice(0,50);
  nCache.at=Date.now();
  await paintNews(fresh.length>0);
}
async function paintNews(animate){
  var box=$('newsList');if(!box)return;
  var L=lang(),html=[],limit=Math.min(nCache.items.length,22);
  for(var i=0;i<limit;i++){
    var n=nCache.items[i],t=n.title,d='';
    try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
    if(L==='ru')t=await trRu(n.title);
    var cls=animate&&i<3?'news-item news-new':'news-item';
    html.push('<div class="'+cls+'"><a href="'+n.link+'" target="_blank" rel="noopener">'+t+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>');
  }
  box.innerHTML=html.join('')||'<div class="empty">\u2014</div>';
}
function injectCSS(){
  if($('ct-extra-css'))return;
  var s=document.createElement('style');s.id='ct-extra-css';
  s.textContent='.news-new{animation:ctFade .55s ease}.news-item{transition:opacity .3s}'+
    '@keyframes ctFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}'+
    '.topbar .chip{font-variant-numeric:tabular-nums;letter-spacing:.02em}'+
    '#btnProChart{border:1px solid rgba(168,85,247,.45)!important}'+
    '#walletConnectCard .btn{box-shadow:0 0 0 1px rgba(168,85,247,.25)}';
  document.head.appendChild(s);
}
function boot(){
  injectCSS();
  refreshGlobal();setInterval(refreshGlobal,45000);
  refreshAPY();setInterval(refreshAPY,60*60*1000);
  setInterval(applyAPYToTable,8000);
  var curSel=$('curSel');if(curSel)curSel.addEventListener('change',function(){setTimeout(refreshGlobal,200)});
  document.addEventListener('click',function(e){
    if(e.target.closest('tr[data-id]')&&!e.target.closest('.wl-rm')){
      setTimeout(ensureProBtn,250);
      setTimeout(applyAPYToTable,500);
    }
    if(e.target.closest('.nav-btn[data-p="wallet"]'))setTimeout(enhanceWalletUI,200);
    if(e.target.closest('.nav-btn[data-p="news"]')){setTimeout(function(){loadNews(true)},300)}
    if(e.target.closest('#stakeCoin')){
      setTimeout(function(){
        var sc=$('stakeCoin'),apyEl=$('stakeApy');
        if(sc&&apyEl&&apyMap[sc.value]){apyEl.value=(+apyMap[sc.value]).toFixed(2)}
      },100);
    }
  },true);
  setTimeout(function(){
    var pw=$('p-wallet');if(pw&&pw.classList.contains('on'))enhanceWalletUI();
    ensureProBtn();applyAPYToTable();
  },1000);
  setTimeout(function(){loadNews(true)},2000);
  setInterval(function(){
    var pn=$('p-news');
    if(pn&&pn.classList.contains('on'))loadNews(false);
  },15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
