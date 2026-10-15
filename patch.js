/* v116: Gram rename, heatmap, jettons, news translate, wallet icon */
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
    lastMcap=mcap*(fx||1);
    if($('mcapChip')&&mcap!=null)$('mcapChip').textContent='Cap: '+money(lastMcap);
    if($('domChip')&&btc!=null)$('domChip').textContent='BTC: '+(+btc).toFixed(1)+'%';
  }catch(e){}
}
setInterval(function(){
  var el=$('mcapChip');
  if(el&&lastMcap>=1e12&&(el.textContent||'').indexOf('B')!==-1)el.textContent='Cap: '+money(lastMcap);
},2500);
function renameTonToGram(){
  document.querySelectorAll('#wBody tr[data-id]').forEach(function(tr){
    var id=tr.getAttribute('data-id')||'';
    if(id!=='the-open-network'&&id!=='toncoin')return;
    var cells=tr.querySelectorAll('td');
    cells.forEach(function(td){
      if(td.textContent&&/\bTON\b/.test(td.textContent))td.innerHTML=td.innerHTML.replace(/\bTON\b/g,'GRAM');
    });
  });
  var sy=$('dSym');
  if(sy&&(sy.textContent||'').trim().toUpperCase()==='TON')sy.textContent='GRAM';
  var nm=$('dName');
  if(nm&&/toncoin/i.test(nm.textContent||''))nm.textContent='Gram';
  document.querySelectorAll('select option').forEach(function(o){
    if(/toncoin|the-open-network/i.test(o.value)&&/\bTON\b/.test(o.textContent))o.textContent=o.textContent.replace(/\bTON\b/g,'GRAM');
  });
}
var heatData=[],heatAt=0;
async function loadHeatmap(){
  if(Date.now()-heatAt<60000&&heatData.length){paintHeatmap();return}
  try{
    var d=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=28&page=1&sparkline=false&price_change_percentage=24h').then(function(r){return r.json()});
    heatData=(d||[]).map(function(c){
      var sym=(c.symbol||'').toUpperCase();
      if(sym==='TON')sym='GRAM';
      return{id:c.id,sym:sym,ch:c.price_change_percentage_24h||0,mcap:c.market_cap||0,vol:c.total_volume||0};
    });
    heatAt=Date.now();
    paintHeatmap();
  }catch(e){}
}
function paintHeatmap(){
  var box=$('heatmapBox');if(!box||!heatData.length)return;
  var maxM=Math.max.apply(null,heatData.map(function(x){return x.mcap}))||1;
  var html='';
  heatData.forEach(function(c){
    var ch=c.ch;
    var size=Math.max(0.08,Math.min(0.28,Math.sqrt(c.mcap/maxM)*0.28));
    var bg;
    if(ch>3)bg='rgba(34,197,94,0.75)';
    else if(ch>0.3)bg='rgba(34,197,94,0.4)';
    else if(ch>-0.3)bg='rgba(100,90,120,0.35)';
    else if(ch>-3)bg='rgba(239,68,68,0.4)';
    else bg='rgba(239,68,68,0.75)';
    var arrow=ch>=0?'\u2191':'\u2193';
    html+='<div class="heat-cell" data-id="'+c.id+'" style="flex:'+(size*100).toFixed(1)+' 1 '+(size*90).toFixed(0)+'px;background:'+bg+'">'+'
      '<div class="heat-sym">'+c.sym+'</div>'+'
      '<div class="heat-ch">'+arrow+' '+Math.abs(ch).toFixed(2)+'%</div></div>';
  });
  box.innerHTML=html;
  box.querySelectorAll('.heat-cell').forEach(function(el){
    el.addEventListener('click',function(){
      var id=el.getAttribute('data-id');
      var row=document.querySelector('#wBody tr[data-id="'+id+'"]');
      if(row)row.click();
    });
  });
}
function ensureHeatmapUI(){
  if($('heatmapCard'))return;
  var home=$('p-home');if(!home)return;
  var card=document.createElement('div');
  card.className='card';card.id='heatmapCard';
  card.innerHTML='<h2>'+(lang()==='ru'?'\u0422\u0435\u043f\u043b\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430 \u0440\u044b\u043d\u043a\u0430':'Market heatmap')+'</h2>'+
    '<div id="heatmapBox" class="heatmap"></div>'+
    '<p class="muted" style="margin-top:.4rem;font-size:.7rem">'+(lang()==='ru'?'\u0420\u0430\u0437\u043c\u0435\u0440 \u2014 \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f, \u0446\u0432\u0435\u0442 \u2014 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u0437\u0430 24\u0447':'Size = market cap, color = 24h change')+'</p>';
  var cards=home.querySelectorAll('.card');
  if(cards.length>=1)home.insertBefore(card,cards[0].nextSibling);
  else home.appendChild(card);
  loadHeatmap();
}
var connected={type:null,address:null};
function shortAddr(a){if(!a||a.length<12)return a||'\u2014';return a.slice(0,6)+'\u2026'+a.slice(-4)}
function enhanceWalletUI(){
  var page=$('p-wallet');if(!page||page._enh)return;page._enh=1;
  var card=document.createElement('div');card.className='card';card.id='walletConnectCard';
  card.innerHTML='<h2>'+(lang()==='ru'?'\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a':'Connect wallet')+'</h2>'+
    '<p class="muted" style="margin-bottom:.5rem">Tonkeeper \u00b7 MetaMask \u00b7 Phantom</p>'+
    '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">'+
    '<button type="button" class="btn" id="btnTon" style="width:auto;flex:1;min-width:100px;padding:.5rem;font-size:.8rem">GRAM</button>'+
    '<button type="button" class="btn-ghost" id="btnEvm" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">MetaMask</button>'+
    '<button type="button" class="btn-ghost" id="btnSol" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">Phantom</button></div>'+
    '<div id="walletStatus" class="muted" style="font-size:.8rem;margin-bottom:.35rem;display:flex;align-items:center;gap:.35rem">\u2014</div>'+
    '<button type="button" class="btn-ghost" id="btnReconnect" style="display:none;padding:.35rem .6rem;font-size:.78rem">'+(lang()==='ru'?'\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a':'Switch wallet')+'</button>'+
    '<div id="walletAnalytics" style="display:none;margin-top:.5rem"></div>';
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
    el.innerHTML=lang()==='ru'?'\u041a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d':'No wallet connected';
    if(rb)rb.style.display='none';
    if($('walletAnalytics'))$('walletAnalytics').style.display='none';
    return;
  }
  var label=connected.type==='TON'?'GRAM':connected.type;
  el.innerHTML='<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#22c55e;color:#fff;font-size:11px;font-weight:700">\u2713</span>'+
    '<span style="color:var(--accent)">'+label+'</span>: <b>'+shortAddr(connected.address)+'</b>';
  if(rb)rb.style.display='inline-block';
  loadWA();
}
async function connectTON(){
  var st=$('walletStatus');
  if(st)st.textContent=lang()==='ru'?'\u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0435 \u043a\u043e\u0448\u0435\u043b\u044c\u043a\u0430\u2026':'Opening wallet\u2026';
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
  }catch(e){if(st)st.textContent=lang()==='ru'?'\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0432\u0440\u0443\u0447\u043d\u0443\u044e':'Paste address'}
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
  box.innerHTML='<div class="muted">'+(lang()==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0442\u043e\u043a\u0435\u043d\u043e\u0432\u2026':'Loading tokens\u2026')+'</div>';
  var rows=[];
  try{
    if(connected.type==='TON'||(connected.address||'').indexOf('0:')===0||(connected.address||'').indexOf('EQ')===0||(connected.address||'').indexOf('UQ')===0){
      var addr=connected.address;
      var acc=await fetch('https://tonapi.io/v2/accounts/'+encodeURIComponent(addr)).then(function(r){return r.json()}).catch(function(){return null});
      var tonBal=0;
      if(acc&&acc.balance!=null)tonBal=Number(acc.balance)/1e9;
      var tonPrice=0;
      try{
        var p=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd').then(function(r){return r.json()});
        tonPrice=(p['the-open-network']&&p['the-open-network'].usd)||0;
      }catch(e){}
      rows.push({sym:'GRAM',name:'Gram',bal:tonBal,usd:tonBal*tonPrice});
      var jets=await fetch('https://tonapi.io/v2/accounts/'+encodeURIComponent(addr)+'/jettons?limit=50').then(function(r){return r.json()}).catch(function(){return null});
      var balances=(jets&&jets.balances)||[];
      balances.forEach(function(j){
        var meta=j.jetton||{};
        var dec=+(meta.decimals!=null?meta.decimals:9);
        var bal=Number(j.balance||0)/Math.pow(10,dec);
        if(bal<=0)return;
        var sym=(meta.symbol||'JETTON').toUpperCase();
        if(sym==='TON')sym='GRAM';
        var name=meta.name||sym;
        var price=0;
        if(j.price&&j.price.prices&&j.price.prices.USD)price=+j.price.prices.USD;
        rows.push({sym:sym,name:name,bal:bal,usd:bal*price});
      });
    }else if(connected.type==='EVM'||(connected.address||'').indexOf('0x')===0){
      var res=await fetch('https://ethereum.publicnode.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getBalance',params:[connected.address,'latest']})}).then(function(r){return r.json()});
      var eth=(res&&res.result?parseInt(res.result,16):0)/1e18;
      var p=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(function(r){return r.json()});
      rows.push({sym:'ETH',name:'Ethereum',bal:eth,usd:eth*((p.ethereum&&p.ethereum.usd)||0)});
    }
  }catch(e){console.warn(e)}
  if(!rows.length){box.innerHTML='<div class="muted">\u2014</div>';return}
  var total=rows.reduce(function(s,r){return s+(r.usd||0)},0);
  var html='<div class="pnl-box" style="margin-bottom:.45rem"><div class="muted">'+(lang()==='ru'?'\u041e\u0446\u0435\u043d\u043a\u0430 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044f':'Portfolio est.')+'</div><div style="font-size:1.15rem;font-weight:700">'+money(total)+'</div></div>';
  rows.sort(function(a,b){return(b.usd||0)-(a.usd||0)});
  rows.forEach(function(r){
    var balStr=r.bal>=1?r.bal.toFixed(4):r.bal.toFixed(6);
    html+='<div class="hold-row"><div><b>'+r.sym+'</b> <span class="muted" style="font-size:.72rem">'+r.name+'</span></div><span>'+balStr+(r.usd?' \u00b7 '+money(r.usd):'')+'</span></div>';
  });
  box.innerHTML=html;
  if($('manRes'))$('manRes').innerHTML=html;
}
var nCache={at:0,items:[],seen:{},tr:{}};
async function hn(q){
  var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage=10').then(function(r){return r.json()});
  return(d.hits||[]).map(function(h){return{title:h.title||h.story_title||'',link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN',id:'hn_'+h.objectID}}).filter(function(x){return x.title});
}
async function trTitle(t){
  if(!t||lang()!=='ru')return t;
  if(nCache.tr[t])return nCache.tr[t];
  try{
    var o=null;
    try{
      var d=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(t.slice(0,400))+'&langpair=en|ru').then(function(r){return r.json()});
      o=d&&d.responseData&&d.responseData.translatedText;
      if(o&&(o.indexOf('MYMEMORY')!==-1||o.indexOf('QUERY LENGTH')!==-1))o=null;
    }catch(e){}
    if(!o){
      try{
        var d2=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q='+encodeURIComponent(t.slice(0,400))).then(function(r){return r.json()});
        if(Array.isArray(d2)&&d2[0])o=d2[0].map(function(x){return x[0]}).join('');
      }catch(e){}
    }
    if(o){nCache.tr[t]=o;return o}
  }catch(e){}
  return t;
}
async function loadNews(force){
  var box=$('newsList');if(!box)return;
  if(!force&&nCache.items.length&&Date.now()-nCache.at<25000){await paintNews();return}
  var all=[];
  try{
    var parts=await Promise.all([hn('bitcoin OR crypto'),hn('ethereum OR solana OR blockchain')]);
    parts.forEach(function(a){all=all.concat(a)});
  }catch(e){}
  var merged=[];
  all.forEach(function(n){
    var k=(n.id||n.title).toLowerCase().slice(0,70);
    if(nCache.seen[k]||!n.title)return;
    nCache.seen[k]=1;merged.push(n);
  });
  var prev=nCache.items.slice();
  var ids={};prev.forEach(function(n){ids[n.id||n.title]=1});
  var fresh=merged.filter(function(n){return!ids[n.id||n.title]});
  nCache.items=fresh.concat(prev).slice(0,40);
  nCache.at=Date.now();
  await paintNews();
}
async function paintNews(){
  var box=$('newsList');if(!box)return;
  var L=lang(),limit=Math.min(nCache.items.length,18);
  var html=[];
  for(var i=0;i<limit;i++){
    var n=nCache.items[i],d='';
    try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
    html.push('<div class="news-item" data-i="'+i+'"><a href="'+n.link+'" target="_blank" rel="noopener">'+(nCache.tr[n.title]||n.title)+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>');
  }
  box.innerHTML=html.join('')||'<div class="empty">\u2014</div>';
  if(L==='ru'){
    for(var i=0;i<limit;i++){
      try{
        var t=await trTitle(nCache.items[i].title);
        var a=box.querySelector('.news-item[data-i="'+i+'"] a');
        if(a)a.textContent=t;
      }catch(e){}
    }
  }
}
var TV_MAP={bitcoin:'BINANCE:BTCUSDT',ethereum:'BINANCE:ETHUSDT',solana:'BINANCE:SOLUSDT',binancecoin:'BINANCE:BNBUSDT',ripple:'BINANCE:XRPUSDT',cardano:'BINANCE:ADAUSDT',dogecoin:'BINANCE:DOGEUSDT',monero:'BINANCE:XMRUSDT','the-open-network':'OKX:TONUSDT',toncoin:'OKX:TONUSDT'};
var SYM_ID={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',TON:'the-open-network',GRAM:'the-open-network',XMR:'monero',ADA:'cardano',DOGE:'dogecoin'};
function ensureProBtn(){
  var tabs=$('chartTabs');if(!tabs||$('btnProChart'))return;
  var b=document.createElement('button');b.type='button';b.id='btnProChart';b.className='tab';b.textContent='Pro TV';b.style.marginLeft='auto';
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
  box.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">\u2026</div>';
  await ensureTV();
  if(!window.TradingView)return;
  box.innerHTML='';
  var cid='tvw_'+Date.now();
  var el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
  var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  try{
    new TradingView.widget({autosize:true,symbol:TV_MAP[id]||'BINANCE:BTCUSDT',interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',toolbar_bg:theme==='dark'?'#12101c':'#f5f3fb',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#ffffff',allow_symbol_change:true,withdateranges:true});
  }catch(e){}
}
function injectCSS(){
  if($('ct-extra-css'))return;
  var s=document.createElement('style');s.id='ct-extra-css';
  s.textContent=
    '.heatmap{display:flex;flex-wrap:wrap;gap:4px;min-height:120px}'+
    '.heat-cell{border-radius:8px;padding:8px 6px;min-width:56px;min-height:48px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center;transition:transform .15s}'+
    '.heat-cell:active{transform:scale(.97)}'+
    '.heat-sym{font-weight:700;font-size:.78rem;color:#fff}'+
    '.heat-ch{font-size:.65rem;color:rgba(255,255,255,.9);margin-top:2px}'+
    '.news-item a{line-height:1.35}'+
    '#btnProChart{border:1px solid rgba(168,85,247,.4)!important}';
  document.head.appendChild(s);
}
function boot(){
  injectCSS();
  refreshGlobal();setInterval(refreshGlobal,45000);
  ensureHeatmapUI();setInterval(loadHeatmap,90000);
  setInterval(renameTonToGram,2000);
  setTimeout(renameTonToGram,800);
  document.addEventListener('click',function(e){
    if(e.target.closest('tr[data-id]')&&!e.target.closest('.wl-rm')){setTimeout(ensureProBtn,250);setTimeout(renameTonToGram,400)}
    if(e.target.closest('.nav-btn[data-p="wallet"]'))setTimeout(enhanceWalletUI,200);
    if(e.target.closest('.nav-btn[data-p="news"]'))setTimeout(function(){loadNews(true)},300);
    if(e.target.closest('.nav-btn[data-p="home"]'))setTimeout(function(){ensureHeatmapUI();loadHeatmap()},200);
    if(e.target.closest('#manBtn')){
      setTimeout(function(){
        var addr=(($('manAddr')||{}).value||'').trim();
        var chain=(($('manChain')||{}).value||'');
        if(chain==='ton'&&addr){connected={type:'TON',address:addr};loadWA()}
      },800);
    }
  },true);
  setTimeout(function(){
    var pw=$('p-wallet');if(pw&&pw.classList.contains('on'))enhanceWalletUI();
    ensureProBtn();ensureHeatmapUI();
  },1000);
  setTimeout(function(){loadNews(true)},2000);
  setInterval(function(){var pn=$('p-news');if(pn&&pn.classList.contains('on'))loadNews(false)},20000);
  var langSel=$('langSel');
  if(langSel)langSel.addEventListener('change',function(){setTimeout(function(){loadNews(true)},300)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
