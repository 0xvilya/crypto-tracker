/* Crypto Tracker v106 — in-place updates, any coin, solid gas */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function lang(){var s=$('langSel');return (s&&s.value)||localStorage.getItem('ct_lang')||'ru'}
function cur(){return (localStorage.getItem('ct_cur')||'usd').toLowerCase()}
function toast(m,ms){var e=$('toast');if(!e)return;e.textContent=m;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('show')},ms||2000)}

var COINS={
 bitcoin:{sym:'BTC',pair:'BTCUSDT',name:'Bitcoin',color:'#f7931a',img:'1/small/bitcoin.png',apy:0},
 ethereum:{sym:'ETH',pair:'ETHUSDT',name:'Ethereum',color:'#627eea',img:'279/small/ethereum.png',apy:3.2},
 solana:{sym:'SOL',pair:'SOLUSDT',name:'Solana',color:'#14f195',img:'4128/small/solana.png',apy:6.8},
 binancecoin:{sym:'BNB',pair:'BNBUSDT',name:'BNB',color:'#f3ba2f',img:'825/small/bnb-icon2_2x.png',apy:2.5},
 ripple:{sym:'XRP',pair:'XRPUSDT',name:'XRP',color:'#00aae4',img:'44/small/xrp-symbol-white_2x.png',apy:0},
 cardano:{sym:'ADA',pair:'ADAUSDT',name:'Cardano',color:'#0033ad',img:'975/small/cardano.png',apy:3.1},
 dogecoin:{sym:'DOGE',pair:'DOGEUSDT',name:'Dogecoin',color:'#c2a633',img:'5/small/dogecoin.png',apy:0},
 litecoin:{sym:'LTC',pair:'LTCUSDT',name:'Litecoin',color:'#345d9d',img:'2/small/litecoin.png',apy:0},
 chainlink:{sym:'LINK',pair:'LINKUSDT',name:'Chainlink',color:'#2a5ada',img:'877/small/chainlink-new-logo.png',apy:0},
 polkadot:{sym:'DOT',pair:'DOTUSDT',name:'Polkadot',color:'#e6007a',img:'12171/small/polkadot.png',apy:12.5},
 'avalanche-2':{sym:'AVAX',pair:'AVAXUSDT',name:'Avalanche',color:'#e84142',img:'12559/small/Avalanche_Circle_RedWhite_Trans.png',apy:5.4},
 tron:{sym:'TRX',pair:'TRXUSDT',name:'TRON',color:'#ff0013',img:'1094/small/tron-logo.png',apy:4.1},
 'matic-network':{sym:'POL',pair:'POLUSDT',name:'Polygon',color:'#8247e5',img:'4713/small/polygon.png',apy:3.8},
 'shiba-inu':{sym:'SHIB',pair:'SHIBUSDT',name:'Shiba Inu',color:'#ffa409',img:'11939/small/shiba.png',apy:0},
 pepe:{sym:'PEPE',pair:'PEPEUSDT',name:'Pepe',color:'#3d9a3d',img:'29850/small/pepe-token.jpeg',apy:0},
 monero:{sym:'XMR',pair:null,name:'Monero',color:'#ff6600',img:'69/small/monero_logo.png',apy:0},
 'the-open-network':{sym:'TON',pair:null,name:'Toncoin',color:'#0098ea',img:'17980/small/ton_symbol.png',apy:3.5},
 toncoin:{sym:'TON',pair:null,name:'Toncoin',color:'#0098ea',img:'17980/small/ton_symbol.png',apy:3.5}
};
try{
  var _c=JSON.parse(localStorage.getItem('ct_custom')||'[]');
  (_c||[]).forEach(function(x){
    if(x&&x.id&&!COINS[x.id])COINS[x.id]={sym:x.sym||x.id,pair:null,name:x.name||x.id,color:'#a855f7',img:null,thumb:x.thumb||null,apy:0};
  });
}catch(e){}

var PAIR={},DEFAULTS=['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','the-open-network'];
Object.keys(COINS).forEach(function(id){if(COINS[id].pair)PAIR[COINS[id].pair]=id});
var prices={},fx={usd:1,eur:0.92,pln:4,rub:92},fxT=0;
var currentChartId=null,lwChart=null,lwSeries=null,chartData=[];
var newsCache={at:0,items:[],translated:{}},newsFilter='all',trCache={};
var wlBuilt=false,refreshing=false;

function coinImg(id){
  var c=COINS[id];if(!c)return'';
  if(c.thumb)return c.thumb;
  if(c.img)return 'https://assets.coingecko.com/coins/images/'+c.img;
  return'';
}
function money(v){
  if(v==null||isNaN(v))return '—';
  var c=cur(),s=c==='eur'?'€':c==='rub'?'₽':c==='pln'?'zł':'$';
  var n=+v;
  if(Math.abs(n)>=1e9)return s+(n/1e9).toFixed(2)+'B';
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  if(Math.abs(n)>=1)return s+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
  return s+n.toFixed(6);
}
function pctCls(v){return v==null||isNaN(v)?'—':'<span class="'+(v>=0?'up':'down')+'">'+(v>=0?'+':'')+(+v).toFixed(2)+'%</span>'}
function toCur(u){return u==null?null:u*(fx[cur()]||1)}
function fromCur(v){return v==null?null:v/(fx[cur()]||1)}
function gp(id){
  if(prices[id]&&prices[id].usd!=null)return prices[id].usd;
  if(id==='toncoin'&&prices['the-open-network'])return prices['the-open-network'].usd;
  if(id==='the-open-network'&&prices.toncoin)return prices.toncoin.usd;
  return null;
}
function gc(id){
  if(prices[id]&&prices[id].ch!=null)return prices[id].ch;
  if(id==='toncoin'&&prices['the-open-network'])return prices['the-open-network'].ch;
  if(id==='the-open-network'&&prices.toncoin)return prices.toncoin.ch;
  return null;
}

async function loadFx(){
  if(Date.now()-fxT<3e5)return;
  try{
    var d=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json()});
    if(d&&d.rates){fx.eur=d.rates.EUR||fx.eur;fx.pln=d.rates.PLN||fx.pln;fx.rub=d.rates.RUB||fx.rub;fxT=Date.now()}
  }catch(e){}
}
async function fetchPrices(){
  try{
    var d=await fetch('https://api.binance.us/api/v3/ticker/24hr').then(function(r){return r.json()});
    (d||[]).forEach(function(t){var id=PAIR[t.symbol];if(id)prices[id]={usd:+t.lastPrice,ch:+t.priceChangePercent}});
  }catch(e){}
  try{
    var ids=Object.keys(COINS);
    try{var wl=JSON.parse(localStorage.getItem('ct_wl')||'[]');(wl||[]).forEach(function(id){if(ids.indexOf(id)<0)ids.push(id)})}catch(e){}
    for(var i=0;i<ids.length;i+=40){
      var batch=ids.slice(i,i+40).join(',');
      var t=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+batch+'&vs_currencies=usd&include_24hr_change=true').then(function(r){return r.json()});
      Object.keys(t||{}).forEach(function(id){
        if(t[id]&&t[id].usd!=null)prices[id]={usd:t[id].usd,ch:t[id].usd_24h_change};
      });
    }
  }catch(e){}
}
async function ensure(){await loadFx();await fetchPrices()}

function getList(){
  try{var a=JSON.parse(localStorage.getItem('ct_wl')||'null');if(Array.isArray(a)&&a.length)return a}catch(e){}
  return DEFAULTS.slice();
}
function setList(a){localStorage.setItem('ct_wl',JSON.stringify(a))}

function buildWatch(){
  var body=$('wBody');if(!body)return;
  var list=getList();
  body.innerHTML=list.map(function(id,i){
    var c=COINS[id]||{sym:(id||'').toUpperCase().slice(0,6),apy:0,name:id};
    var apy=c.apy?'<span class="apy">'+c.apy+'%</span>':'—';
    var img=coinImg(id);
    return '<tr data-id="'+id+'" style="cursor:pointer">'+
      '<td class="p-num">'+(i+1)+'</td>'+
      '<td><div class="coin-cell">'+(img?'<img class="cicon" src="'+img+'" width="22" height="22" onerror="this.style.display=\'none\'"/>':'')+'<b>'+c.sym+'</b></div></td>'+
      '<td class="p-price">—</td><td class="p-ch">—</td><td>'+apy+'</td>'+
      '<td><button type="button" class="btn-ghost wl-rm" data-id="'+id+'" style="font-size:.7rem;padding:.15rem .35rem">×</button></td></tr>';
  }).join('');
  body.querySelectorAll('tr[data-id]').forEach(function(tr){
    tr.onclick=function(e){if(e.target.closest('.wl-rm'))return;openDetail(tr.getAttribute('data-id'))};
  });
  body.querySelectorAll('.wl-rm').forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      setList(getList().filter(function(x){return x!==btn.getAttribute('data-id')}));
      wlBuilt=false;buildWatch();updateWatchNumbers();
    };
  });
  wlBuilt=true;
}
function updateWatchNumbers(){
  var body=$('wBody');if(!body)return;
  body.querySelectorAll('tr[data-id]').forEach(function(tr){
    var id=tr.getAttribute('data-id');
    var pe=tr.querySelector('.p-price'),ce=tr.querySelector('.p-ch');
    if(pe){var t=money(toCur(gp(id)));if(pe.textContent!==t)pe.textContent=t}
    if(ce){var h=pctCls(gc(id));if(ce.innerHTML!==h)ce.innerHTML=h}
  });
  if(currentChartId){
    if($('dPrice')){var t=money(toCur(gp(currentChartId)));if($('dPrice').textContent!==t)$('dPrice').textContent=t}
    if($('dCh')){var h=pctCls(gc(currentChartId));if($('dCh').innerHTML!==h)$('dCh').innerHTML=h}
  }
}

async function softRefresh(){
  if(refreshing)return;
  refreshing=true;
  try{
    await ensure();
    if(!wlBuilt)buildWatch();
    updateWatchNumbers();
    updateTrendsInPlace();
    loadMeta();
    if(currentChartId)aiSummary(currentChartId);
  }finally{refreshing=false}
}

function openDetail(id){
  var det=$('detail');if(!det)return;
  det.style.display='block';
  currentChartId=id;
  if(!COINS[id]){
    COINS[id]={sym:(id||'').toUpperCase().slice(0,8),pair:null,name:id,color:'#a855f7',img:null,apy:0};
  }
  var c=COINS[id];
  if($('dName'))$('dName').textContent=c.name||id;
  if($('dSym'))$('dSym').textContent=c.sym||id;
  if($('dPrice'))$('dPrice').textContent=money(toCur(gp(id)));
  if($('dCh'))$('dCh').innerHTML=pctCls(gc(id));
  if($('dImg')){var im=coinImg(id);$('dImg').src=im||'';$('dImg').style.display=im?'block':'none'}
  if(gp(id)==null)fetchOnePrice(id).then(function(){updateWatchNumbers();aiSummary(id)});
  loadChart(id,c);
  loadCoinNews(id);
  aiSummary(id);
  det.scrollIntoView({behavior:'smooth',block:'nearest'});
}

async function fetchOnePrice(id){
  try{
    var ids=id;
    if(id==='toncoin')ids='toncoin,the-open-network';
    if(id==='the-open-network')ids='the-open-network,toncoin';
    var t=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=usd&include_24hr_change=true').then(function(r){return r.json()});
    Object.keys(t||{}).forEach(function(k){
      if(t[k]&&t[k].usd!=null)prices[k]={usd:t[k].usd,ch:t[k].usd_24h_change};
    });
  }catch(e){}
}

async function loadChart(id,meta){
  var box=$('tv');if(!box)return;
  currentChartId=id;
  var days=1,tab=document.querySelector('#chartTabs .tab.on');
  if(tab)days=+tab.getAttribute('data-d')||1;
  var interval=days<=1?'15m':days<=7?'1h':days<=30?'4h':'1d';
  var limit=days<=1?96:days<=7?168:days<=30?180:90;
  chartData=[];
  if($('chartTip'))$('chartTip').textContent=lang()==='ru'?'Загрузка…':'Loading…';
  try{
    if(meta&&meta.pair){
      var k=await fetch('https://api.binance.us/api/v3/klines?symbol='+meta.pair+'&interval='+interval+'&limit='+limit).then(function(r){return r.json()});
      if(Array.isArray(k)&&k.length)chartData=k.map(function(row){return{time:Math.floor(row[0]/1000),open:+row[1],high:+row[2],low:+row[3],close:+row[4]}});
    }
  }catch(e){}
  if(!chartData.length){
    try{
      var cgId=id;
      if(id==='toncoin')cgId='the-open-network';
      var cg=await fetch('https://api.coingecko.com/api/v3/coins/'+encodeURIComponent(cgId)+'/ohlc?vs_currency=usd&days='+days).then(function(r){return r.json()});
      if(Array.isArray(cg)&&cg.length)chartData=cg.map(function(row){return{time:Math.floor(row[0]/1000),open:+row[1],high:+row[2],low:+row[3],close:+row[4]}});
    }catch(e){}
  }
  if(!chartData.length){if($('chartTip'))$('chartTip').textContent=lang()==='ru'?'Нет данных':'No data';return}
  var rate=fx[cur()]||1;
  var displayData=chartData.map(function(p){return{time:p.time,open:p.open*rate,high:p.high*rate,low:p.low*rate,close:p.close*rate}});
  if(typeof LightweightCharts==='undefined'){box.innerHTML='<div class="muted">Chart…</div>';return}
  if(lwChart){try{lwChart.remove()}catch(e){}lwChart=null;lwSeries=null}
  box.innerHTML='';
  lwChart=LightweightCharts.createChart(box,{
    width:box.clientWidth||340,height:280,
    layout:{background:{color:'transparent'},textColor:'#9b92b5',attributionLogo:false},
    grid:{vertLines:{color:'rgba(42,35,64,0.45)'},horzLines:{color:'rgba(42,35,64,0.45)'}},
    crosshair:{mode:1},rightPriceScale:{borderColor:'#2a2340'},
    timeScale:{borderColor:'#2a2340',timeVisible:true,secondsVisible:false},
    handleScroll:true,handleScale:true
  });
  try{lwChart.applyOptions({layout:{attributionLogo:false}})}catch(e){}
  lwSeries=lwChart.addCandlestickSeries({upColor:'#22c55e',downColor:'#ef4444',borderUpColor:'#22c55e',borderDownColor:'#ef4444',wickUpColor:'#22c55e',wickDownColor:'#ef4444'});
  lwSeries.setData(displayData);
  lwChart.timeScale().fitContent();
  if($('chartTip'))$('chartTip').textContent='';
  lwChart.subscribeCrosshairMove(function(param){
    if(!param||!param.time||!param.seriesData){if($('chartTip'))$('chartTip').textContent='';return}
    var d=param.seriesData.get(lwSeries);if(!d)return;
    var dt=new Date(param.time*1000).toLocaleString(lang()==='ru'?'ru-RU':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    if($('chartTip'))$('chartTip').textContent=dt+'  O '+money(d.open)+'  H '+money(d.high)+'  L '+money(d.low)+'  C '+money(d.close);
  });
  if(window._chartRO)window._chartRO.disconnect();
  window._chartRO=new ResizeObserver(function(){if(lwChart&&box)lwChart.applyOptions({width:box.clientWidth})});
  window._chartRO.observe(box);
}

function updateTrendsInPlace(){
  var gBox=$('gainers'),lBox=$('losers');if(!gBox&&!lBox)return;
  var ids=Object.keys(COINS).filter(function(id){return prices[id]&&prices[id].usd!=null});
  var sorted=ids.slice().sort(function(a,b){return(gc(b)||0)-(gc(a)||0)});
  var gainers=sorted.filter(function(id){return(gc(id)||0)>0}).slice(0,6);
  var losers=sorted.filter(function(id){return(gc(id)||0)<0}).slice(-6).reverse();
  function paint(box,arr){
    if(!box)return;
    var key=arr.join(',');
    if(box._key===key){
      box.querySelectorAll('.trend-row').forEach(function(row){
        var id=row.getAttribute('data-id');
        var span=row.querySelector('.t-ch');
        if(span)span.innerHTML=pctCls(gc(id));
      });
      return;
    }
    box._key=key;
    box.innerHTML=arr.map(function(id){
      return '<button type="button" class="tab trend-row" data-id="'+id+'"><img class="cicon" src="'+coinImg(id)+'" width="16" height="16" onerror="this.style.display=\'none\'"/>'+(COINS[id]?COINS[id].sym:id)+' <span class="t-ch">'+pctCls(gc(id))+'</span></button>';
    }).join('')||'—';
    box.querySelectorAll('.trend-row').forEach(function(row){row.onclick=function(){openDetail(row.getAttribute('data-id'))}});
  }
  paint(gBox,gainers);paint(lBox,losers);
}

async function loadMeta(){
  try{
    var d=await fetch('https://api.coingecko.com/api/v3/global').then(function(r){return r.json()});
    var g=d&&d.data;if(!g)return;
    if($('mcapChip')&&g.total_market_cap)$('mcapChip').textContent='Cap: '+money(toCur(g.total_market_cap.usd));
    if($('domChip')&&g.market_cap_percentage)$('domChip').textContent='BTC: '+g.market_cap_percentage.btc.toFixed(1)+'%';
    if($('ethDomChip')&&g.market_cap_percentage)$('ethDomChip').textContent='ETH: '+g.market_cap_percentage.eth.toFixed(1)+'%';
  }catch(e){}
}

function setupSearch(){
  var q=$('q'),sr=$('sr');if(!q||!sr)return;
  var t=null;
  q.oninput=function(){
    clearTimeout(t);
    var v=(q.value||'').trim();
    if(v.length<1){sr.style.display='none';return}
    var local=Object.keys(COINS).filter(function(id){
      var c=COINS[id];return (c.sym||'').toLowerCase().indexOf(v.toLowerCase())>=0||(c.name||'').toLowerCase().indexOf(v.toLowerCase())>=0||id.indexOf(v.toLowerCase())>=0;
    }).slice(0,6);
    sr.style.display='block';
    sr.innerHTML=local.map(function(id){
      return '<div class="sr-item" data-id="'+id+'"><img class="cicon" src="'+coinImg(id)+'" width="20" height="20" onerror="this.style.display=\'none\'"/><b>'+COINS[id].sym+'</b> <span class="muted">'+COINS[id].name+'</span></div>';
    }).join('')+(v.length>=2?'<div class="sr-item muted" id="srMore">'+(lang()==='ru'?'Искать все монеты…':'Search all coins…')+'</div>':'');
    sr.querySelectorAll('.sr-item[data-id]').forEach(function(el){
      el.onclick=function(){q.value='';sr.style.display='none';addCoin(el.getAttribute('data-id'));openDetail(el.getAttribute('data-id'))};
    });
    var more=$('srMore');
    if(more)more.onclick=function(){searchRemote(v)};
    if(v.length>=2)t=setTimeout(function(){searchRemote(v)},400);
  };
  async function searchRemote(v){
    try{
      var d=await fetch('https://api.coingecko.com/api/v3/search?query='+encodeURIComponent(v)).then(function(r){return r.json()});
      var coins=(d.coins||[]).slice(0,12);
      if(!coins.length){sr.innerHTML='<div class="sr-item muted">—</div>';return}
      sr.innerHTML=coins.map(function(c){
        return '<div class="sr-item" data-cg="'+c.id+'" data-sym="'+(c.symbol||'').toUpperCase()+'" data-name="'+(c.name||'').replace(/"/g,'')+'" data-thumb="'+(c.thumb||'')+'">'+
          (c.thumb?'<img class="cicon" src="'+c.thumb+'" width="20" height="20"/>':'')+
          '<b>'+(c.symbol||'').toUpperCase()+'</b> <span class="muted">'+c.name+'</span></div>';
      }).join('');
      sr.querySelectorAll('.sr-item[data-cg]').forEach(function(el){
        el.onclick=function(){
          var id=el.getAttribute('data-cg');
          var sym=el.getAttribute('data-sym');
          var name=el.getAttribute('data-name');
          var thumb=el.getAttribute('data-thumb');
          if(!COINS[id])COINS[id]={sym:sym,pair:null,name:name,color:'#a855f7',img:null,thumb:thumb,apy:0};
          var custom=[];
          try{custom=JSON.parse(localStorage.getItem('ct_custom')||'[]')}catch(e){}
          custom=custom.filter(function(x){return x.id!==id});
          custom.push({id:id,sym:sym,name:name,thumb:thumb});
          localStorage.setItem('ct_custom',JSON.stringify(custom));
          q.value='';sr.style.display='none';
          addCoin(id);openDetail(id);
        };
      });
    }catch(e){}
  }
  document.addEventListener('click',function(e){if(!q.contains(e.target)&&!sr.contains(e.target))sr.style.display='none'});
}
function addCoin(id){
  var list=getList();
  if(list.indexOf(id)<0){list.push(id);setList(list);wlBuilt=false;buildWatch();updateWatchNumbers()}
}

function getHold(){try{return JSON.parse(localStorage.getItem('ct_mh')||'[]')||[]}catch(e){return[]}}
function setHold(a){localStorage.setItem('ct_mh',JSON.stringify(a))}
async function renderPort(){
  var box=$('mhList');if(!box)return;await ensure();
  var holds=getHold();
  if(!holds.length){box.innerHTML='<div class="empty muted">'+(lang()==='ru'?'Добавьте монеты':'Add coins')+'</div>';if($('mhTotal'))$('mhTotal').style.display='none';return}
  var total=0,cost=0,items=[];
  holds.forEach(function(h){var p=gp(h.id)||0,v=p*h.qty;total+=v;if(h.buy>0)cost+=h.buy*h.qty;items.push({id:h.id,qty:h.qty,value:v,buy:h.buy,sym:(COINS[h.id]||{}).sym||h.id,color:(COINS[h.id]||{}).color||'#a855f7'})});
  box.innerHTML=items.map(function(it,i){
    var pctShare=total>0?(it.value/total*100).toFixed(1):0;
    var pnl=it.buy>0?it.value-it.buy*it.qty:null;
    return '<div class="hold-row"><img class="cicon" src="'+coinImg(it.id)+'" width="20" height="20" onerror="this.style.display=\'none\'"/> <b>'+it.sym+'</b> × '+it.qty+' <span class="muted">('+pctShare+'%)</span> = <b>'+money(toCur(it.value))+'</b>'+
      (pnl!=null?' <span class="'+(pnl>=0?'up':'down')+'">'+(pnl>=0?'+':'')+money(toCur(pnl))+'</span>':'')+
      ' <button type="button" class="btn-ghost mh-rm" data-i="'+i+'">×</button></div>';
  }).join('');
  if($('mhTotal')){$('mhTotal').style.display='block';if($('mhVal'))$('mhVal').textContent=money(toCur(total));
    var pe=$('mhPnl');if(pe&&cost>0){var pr=total-cost;pe.textContent=(pr>=0?'+':'')+money(toCur(pr))+' ('+((pr/cost)*100).toFixed(2)+'%)';pe.className=pr>=0?'up':'down'}}
  box.querySelectorAll('.mh-rm').forEach(function(btn){btn.onclick=function(){var a=getHold();a.splice(+btn.getAttribute('data-i'),1);setHold(a);renderPort()}});
  var wrap=$('portChartWrap');
  if(wrap&&total>0){
    wrap.style.display='block';
    var canvas=$('portChart');if(canvas){
      var ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,r=Math.min(w,h)/2-8;
      ctx.clearRect(0,0,w,h);var start=-Math.PI/2;
      items.forEach(function(it){var ang=(it.value/total)*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+ang);ctx.closePath();ctx.fillStyle=it.color;ctx.fill();start+=ang});
      var leg=$('portLegend');if(leg)leg.innerHTML=items.map(function(it){return '<span style="display:inline-block;margin:2px 6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+it.color+';margin-right:3px"></span>'+it.sym+' '+(it.value/total*100).toFixed(1)+'%</span>'}).join('');
    }
  }
}

function showPage(p){
  document.querySelectorAll('.page').forEach(function(el){el.classList.remove('on')});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-p')===p)});
  var page=document.getElementById('p-'+p);if(page)page.classList.add('on');
  if(p==='home'){if(!wlBuilt)buildWatch();updateWatchNumbers();updateTrendsInPlace()}
  if(p==='port')renderPort();
  if(p==='tools'){setupConverter();wireTools();buildGas()}
  if(p==='news')loadNews(true);
}

function setupConverter(){
  var from=$('convFrom'),to=$('convTo');if(!from||!to)return;
  var opts=Object.keys(COINS).map(function(id){return '<option value="'+id+'">'+COINS[id].sym+'</option>'}).join('')+'<option value="usd">USD</option>';
  if(!from.options.length){from.innerHTML=opts;to.innerHTML=opts;to.value='usd'}
  function calc(){
    var amt=parseFloat(($('convAmt')||{}).value)||0,f=from.value,t=to.value;
    var pf=f==='usd'?1:gp(f),pt=t==='usd'?1:gp(t);
    if(!pf||!pt){if($('convOut'))$('convOut').textContent='—';return}
    var res=amt*pf/pt;
    if($('convOut'))$('convOut').textContent=t==='usd'?money(toCur(res)):res.toLocaleString('en-US',{maximumFractionDigits:8})+' '+(COINS[t]?COINS[t].sym:t);
  }
  ['convAmt','convFrom','convTo'].forEach(function(id){var el=$(id);if(el){el.oninput=calc;el.onchange=calc}});calc();
}

async function buildGas(){
  var box=$('gasBox');if(!box)return;
  box.innerHTML='<div class="muted">…</div>';
  var rows=[];
  var chains=[
    {n:'Ethereum',u:'https://ethereum.publicnode.com'},
    {n:'BSC',u:'https://bsc-dataseed.binance.org'},
    {n:'Polygon',u:'https://polygon-bor.publicnode.com'},
    {n:'Arbitrum',u:'https://arbitrum-one.publicnode.com'},
    {n:'Optimism',u:'https://optimism.publicnode.com'},
    {n:'Base',u:'https://base.publicnode.com'}
  ];
  await Promise.all(chains.map(async function(ch){
    try{
      var res=await fetch(ch.u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_gasPrice',params:[]})}).then(function(r){return r.json()});
      if(res&&res.result){
        var g=parseInt(res.result,16)/1e9;
        var txt;
        if(g>=100)txt=Math.round(g)+' gwei';
        else if(g>=1)txt=g.toFixed(1)+' gwei';
        else if(g>=0.01)txt=g.toFixed(3)+' gwei';
        else txt=g.toFixed(5)+' gwei';
        rows.push({n:ch.n,t:txt,g:g});
      }
    }catch(e){}
  }));
  rows.sort(function(a,b){return a.n==='Ethereum'?-1:b.n==='Ethereum'?1:0});
  if(!rows.length){box.innerHTML='<div class="muted">—</div>';return}
  box.innerHTML=rows.map(function(r){return '<div class="hold-row"><b>'+r.n+'</b><span class="muted">'+r.t+'</span></div>'}).join('');
}

function wireTools(){
  var opts=Object.keys(COINS).map(function(id){return '<option value="'+id+'">'+COINS[id].sym+' - '+COINS[id].name+'</option>'}).join('');
  if($('dcaCoin')&&!$('dcaCoin').options.length)$('dcaCoin').innerHTML=opts;
  if($('stakeCoin')&&!$('stakeCoin').options.length){
    $('stakeCoin').innerHTML=opts;
    $('stakeCoin').onchange=function(){var c=COINS[$('stakeCoin').value];if(c&&$('stakeApy'))$('stakeApy').value=c.apy||5;stakeCalc()};
  }
  if($('mhCoinSel')&&!$('mhCoinSel').options.length){
    $('mhCoinSel').innerHTML=opts;
    $('mhCoinSel').onchange=function(){if($('mhCoin'))$('mhCoin').value=$('mhCoinSel').value};
  }
  function dca(){
    var monthly=parseFloat(($('dcaAmt')||{}).value)||0,months=parseInt(($('dcaMonths')||{}).value,10)||0,growth=(parseFloat(($('dcaGrowth')||{}).value)||0)/100;
    var r=growth/12,total=0;for(var i=0;i<months;i++)total=(total+monthly)*(1+r);
    if($('dcaOut'))$('dcaOut').textContent=money(toCur(total));
  }
  function stakeCalc(){
    var amt=parseFloat(($('stakeAmt')||{}).value)||0,apy=parseFloat(($('stakeApy')||{}).value)||0;
    if($('stakeOut'))$('stakeOut').textContent=money(amt*(1+apy/100))+' / year (+'+money(amt*apy/100)+')';
  }
  function tp(){var a=parseFloat(($('tpInv')||{}).value)||0,p=parseFloat(($('tpPct')||{}).value)||0;if($('tpOut'))$('tpOut').textContent=a?money(a*(1+p/100)):'—'}
  ['dcaAmt','dcaMonths','dcaGrowth'].forEach(function(id){var el=$(id);if(el){el.oninput=dca;el.onchange=dca}});
  ['stakeAmt','stakeApy'].forEach(function(id){var el=$(id);if(el){el.oninput=stakeCalc;el.onchange=stakeCalc}});
  if($('tpInv'))$('tpInv').oninput=tp;if($('tpPct'))$('tpPct').oninput=tp;
  dca();stakeCalc();tp();
  if($('mhAdd'))$('mhAdd').onclick=function(e){
    e.preventDefault();
    var id=($('mhCoinSel')&&$('mhCoinSel').value)||($('mhCoin')||{}).value;
    var qty=parseFloat(($('mhQty')||{}).value),buy=parseFloat(($('mhBuy')||{}).value)||0;
    if(!id||!qty||qty<=0){toast(lang()==='ru'?'Выберите монету':'Pick coin');return}
    var h=getHold();h.push({id:id,qty:qty,buy:buy>0?fromCur(buy):0});setHold(h);
    if($('mhQty'))$('mhQty').value='';if($('mhBuy'))$('mhBuy').value='';
    toast(lang()==='ru'?'Добавлено':'Added');renderPort();
  };
}

async function translateText(text,to){
  if(!text||to==='en')return text;
  var key=to+'|'+text;if(trCache[key])return trCache[key];
  try{
    var url='https://api.mymemory.translated.net/get?q='+encodeURIComponent(text.slice(0,400))+'&langpair=en|'+(to==='ru'?'ru':'en');
    var d=await fetch(url).then(function(r){return r.json()});
    var out=(d&&d.responseData&&d.responseData.translatedText)||text;
    if(out&&out.indexOf('MYMEMORY WARNING')===-1){trCache[key]=out;return out}
  }catch(e){}
  return text;
}
async function loadNews(force){
  var box=$('newsList');if(!box)return;
  if(!force&&newsCache.items.length&&Date.now()-newsCache.at<5e4){await paintNews(newsCache.items);return}
  box.innerHTML='<div class="empty">…</div>';
  try{
    var feeds=[
      {n:'Cointelegraph',u:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://cointelegraph.com/rss')},
      {n:'CoinDesk',u:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')}
    ];
    var all=[];
    await Promise.all(feeds.map(async function(f){
      try{var d=await fetch(f.u).then(function(r){return r.json()});(d.items||[]).forEach(function(it){var t=String(it.title||'').trim();if(t)all.push({title:t,link:it.link,date:it.pubDate,src:f.n})})}catch(e){}
    }));
    all.sort(function(a,b){return new Date(b.date)-new Date(a.date)});
    newsCache={at:Date.now(),items:all.slice(0,25),translated:newsCache.translated||{}};
    await paintNews(newsCache.items);
  }catch(e){box.innerHTML='<div class="empty">Error</div>'}
}
async function paintNews(items){
  var box=$('newsList');if(!box)return;
  var f=items;
  if(newsFilter&&newsFilter!=='all'){
    var keys={bitcoin:/bitcoin|btc/i,ethereum:/ethereum|\beth\b/i,solana:/solana|\bsol\b/i,xrp:/\bxrp\b|ripple/i,market:/market|crypto|bitcoin|eth|sol|xrp|etf/i};
    var re=keys[newsFilter]||new RegExp(newsFilter,'i');
    f=items.filter(function(n){return re.test(n.title)});
  }
  var L=lang(),html=[];
  for(var i=0;i<Math.min(f.length,18);i++){
    var n=f[i],title=n.title;
    if(L==='ru'){var ck=n.link||n.title;if(newsCache.translated[ck])title=newsCache.translated[ck];else{title=await translateText(n.title,'ru');newsCache.translated[ck]=title}}
    var d='';try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
    html.push('<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener">'+title+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>');
  }
  box.innerHTML=html.join('')||'<div class="empty">—</div>';
}
async function loadCoinNews(id){
  var box=$('coinNews');if(!box)return;
  var name=(COINS[id]||{}).name||id;
  box.innerHTML='<div class="news-head">'+(lang()==='ru'?'Новости по ':'News for ')+name+'</div><div class="muted">…</div>';
  try{
    if(!newsCache.items.length)await loadNews(true);
    var re=new RegExp((name.split(' ')[0])+'|'+(COINS[id]||{}).sym,'i');
    var f=newsCache.items.filter(function(n){return re.test(n.title)}).slice(0,4);
    var L=lang(),parts=['<div class="news-head">'+(L==='ru'?'Новости по ':'News for ')+name+'</div>'];
    for(var i=0;i<f.length;i++){
      var n=f[i],title=n.title;
      if(L==='ru'){var ck=n.link||n.title;if(newsCache.translated[ck])title=newsCache.translated[ck];else{title=await translateText(n.title,'ru');newsCache.translated[ck]=title}}
      parts.push('<div class="news-item"><a href="'+n.link+'" target="_blank">'+title+'</a></div>');
    }
    if(!f.length)parts.push('<div class="muted">'+(L==='ru'?'Нет свежих новостей':'No recent news')+'</div>');
    box.innerHTML=parts.join('');
  }catch(e){}
}
function aiSummary(id){
  var box=$('aiBox');if(!box)return;
  var ch=gc(id);if(ch==null||isNaN(ch)){box.style.display='none';return}
  var L=lang(),txt;
  if(ch>8)txt=L==='ru'?'Сильный рост (+'+ch.toFixed(1)+'%).':'Strong rally (+'+ch.toFixed(1)+'%).';
  else if(ch>3)txt=L==='ru'?'Уверенный рост (+'+ch.toFixed(1)+'%).':'Solid growth (+'+ch.toFixed(1)+'%).';
  else if(ch>0.5)txt=L==='ru'?'Небольшой плюс (+'+ch.toFixed(1)+'%).':'Slight gain (+'+ch.toFixed(1)+'%).';
  else if(ch>-0.5)txt=L==='ru'?'Почти без изменений ('+ch.toFixed(1)+'%).':'Almost flat ('+ch.toFixed(1)+'%).';
  else if(ch>-3)txt=L==='ru'?'Небольшой откат ('+ch.toFixed(1)+'%).':'Mild pullback ('+ch.toFixed(1)+'%).';
  else if(ch>-8)txt=L==='ru'?'Снижение ('+ch.toFixed(1)+'%).':'Decline ('+ch.toFixed(1)+'%).';
  else txt=L==='ru'?'Сильное падение ('+ch.toFixed(1)+'%).':'Sharp drop ('+ch.toFixed(1)+'%).';
  box.style.display='block';box.innerHTML='<b>AI:</b> '+txt;
}

var HELP={
  dca:{ru:'DCA — регулярные покупки на фиксированную сумму.',en:'DCA — regular fixed-amount purchases.'},
  staking:{ru:'Стейкинг — блокировка монет для дохода (APY).',en:'Staking — locking coins for yield.'},
  port:{ru:'Ручной портфель — добавляйте позиции.',en:'Manual portfolio.'},
  wallet:{ru:'Вставьте адрес кошелька.',en:'Paste wallet address.'},
  mcap:{ru:'Market Cap и BTC Dominance.',en:'Market Cap and BTC Dominance.'}
};
function openHelp(key){
  var h=HELP[key]||{ru:'Подсказка',en:'Help'};
  if($('helpTitle'))$('helpTitle').textContent=key.toUpperCase();
  if($('helpBody'))$('helpBody').textContent=lang()==='ru'?h.ru:h.en;
  if($('helpModal'))$('helpModal').style.display='flex';
}
function applyLang(){
  var L=lang();
  var map={
    nav_home:L==='ru'?'Главная':'Home',nav_port:L==='ru'?'Портфель':'Portfolio',nav_wallet:L==='ru'?'Кошелёк':'Wallet',
    nav_news:L==='ru'?'Новости':'News',nav_tools:L==='ru'?'Инструменты':'Tools',
    watchlist:L==='ru'?'Список':'Watchlist',th_coin:L==='ru'?'Монета':'Coin',th_price:L==='ru'?'Цена':'Price',
    trending_up:L==='ru'?'Рост':'Gainers',trending_down:L==='ru'?'Падение':'Losers',
    manual_port:L==='ru'?'Ручной портфель':'Manual portfolio',port_hint:L==='ru'?'Выберите монету → кол-во → Добавить':'Select coin → qty → Add',
    lbl_coin:L==='ru'?'Монета':'Coin',lbl_qty:L==='ru'?'Кол-во':'Qty',lbl_buy:L==='ru'?'Цена покупки':'Buy price',
    btn_add:L==='ru'?'+ Добавить':'+ Add',total:L==='ru'?'Итого':'Total',
    man_addr:L==='ru'?'Адрес кошелька':'Wallet address',wallet_hint:L==='ru'?'Вставьте адрес':'Paste address',
    chain:L==='ru'?'Сеть':'Chain',address:L==='ru'?'Адрес':'Address',show_bal:L==='ru'?'Показать':'Show',
    news:L==='ru'?'Новости':'News',converter:L==='ru'?'Конвертер':'Converter',amount:L==='ru'?'Сумма':'Amount',
    from:L==='ru'?'Из':'From',to:L==='ru'?'В':'To',months:L==='ru'?'Месяцы':'Months',growth:L==='ru'?'Рост %/год':'Growth %/yr',
    staking:L==='ru'?'Стейкинг':'Staking',profit_t:L==='ru'?'Цель прибыли':'Profit target',
    invested:L==='ru'?'Вложено':'Invested',target_pct:L==='ru'?'Цель %':'Target %',gas:'Gas',
    about:L==='ru'?'О нас':'About',privacy:L==='ru'?'Конфиденциальность':'Privacy',
    about_text:L==='ru'?'Crypto Tracker — бесплатный инструмент. Данные с публичных API. Без регистрации.':'Crypto Tracker — free tool. Public APIs. No registration.',
    privacy_text:L==='ru'?'Данные хранятся только в вашем браузере (localStorage). Адреса кошельков никуда не отправляются.':'Data stays in your browser only. Wallet addresses are not sent to our servers.'
  };
  document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(map[k])el.textContent=map[k]});
  var tb=$('themeBtn');if(tb)tb.textContent=document.documentElement.getAttribute('data-theme')==='light'?(L==='ru'?'Тёмная':'Dark'):(L==='ru'?'Светлая':'Light');
}

var RPCS={eth:'https://ethereum.publicnode.com',bsc:'https://bsc-dataseed.binance.org',polygon:'https://polygon-bor.publicnode.com',arb:'https://arbitrum-one.publicnode.com',op:'https://optimism.publicnode.com',base:'https://base.publicnode.com'};
var NATIVE={eth:{id:'ethereum',sym:'ETH',dec:18},bsc:{id:'binancecoin',sym:'BNB',dec:18},polygon:{id:'matic-network',sym:'POL',dec:18},arb:{id:'ethereum',sym:'ETH',dec:18},op:{id:'ethereum',sym:'ETH',dec:18},base:{id:'ethereum',sym:'ETH',dec:18}};
async function analyzeWallet(){
  var chain=($('manChain')||{}).value,addr=((($('manAddr')||{}).value)||'').trim(),box=$('manRes');
  if(!box)return;if(!addr){toast(lang()==='ru'?'Введите адрес':'Enter address');return}
  box.innerHTML='<div class="empty">…</div>';
  try{
    var tokens=[];
    if(RPCS[chain]){
      if(!/^0x[a-fA-F0-9]{40}$/.test(addr)){box.innerHTML='<div class="empty">Invalid</div>';return}
      var r=await fetch(RPCS[chain],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getBalance',params:[addr,'latest']})}).then(function(x){return x.json()});
      var meta=NATIVE[chain];tokens.push({id:meta.id,sym:meta.sym,amount:parseInt(r.result,16)/Math.pow(10,meta.dec)});
    }else if(chain==='sol'){
      var rs=await fetch('https://api.mainnet-beta.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[addr]})}).then(function(x){return x.json()});
      tokens.push({id:'solana',sym:'SOL',amount:(rs.result&&rs.result.value||0)/1e9});
    }else if(chain==='ton'){
      var rt=await fetch('https://tonapi.io/v2/accounts/'+encodeURIComponent(addr)).then(function(x){return x.json()});
      tokens.push({id:'the-open-network',sym:'TON',amount:(rt.balance||0)/1e9});
    }else if(chain==='btc'){
      var rb=await fetch('https://blockstream.info/api/address/'+encodeURIComponent(addr)).then(function(x){return x.json()});
      tokens.push({id:'bitcoin',sym:'BTC',amount:(rb.chain_stats.funded_txo_sum-rb.chain_stats.spent_txo_sum)/1e8});
    }
    await ensure();
    box.innerHTML=tokens.map(function(tk){return '<div class="hold-row"><div><b>'+tk.sym+'</b><div class="muted">'+tk.amount+'</div></div><div style="text-align:right"><b>'+money(toCur(gp(tk.id)*tk.amount))+'</b></div></div>'}).join('')||'<div class="empty">—</div>';
  }catch(e){box.innerHTML='<div class="empty">Error</div>'}
}

function boot(){
  try{
    var themeBtn=$('themeBtn');
    if(themeBtn){themeBtn.onclick=function(){var isLight=document.documentElement.getAttribute('data-theme')==='light';document.documentElement.setAttribute('data-theme',isLight?'dark':'light');localStorage.setItem('ct_theme',isLight?'dark':'light');applyLang()};if(localStorage.getItem('ct_theme')==='light')document.documentElement.setAttribute('data-theme','light')}
    document.querySelectorAll('.nav-btn').forEach(function(b){b.onclick=function(){showPage(b.getAttribute('data-p'))}});
    document.querySelectorAll('#chartTabs .tab').forEach(function(t){t.onclick=function(){document.querySelectorAll('#chartTabs .tab').forEach(function(x){x.classList.remove('on')});t.classList.add('on');if(currentChartId)openDetail(currentChartId)}});
    document.querySelectorAll('.help-btn').forEach(function(b){b.onclick=function(e){e.preventDefault();openHelp(b.getAttribute('data-help'))}});
    if($('helpClose'))$('helpClose').onclick=function(){$('helpModal').style.display='none'};
    if($('helpModal'))$('helpModal').onclick=function(e){if(e.target===$('helpModal'))$('helpModal').style.display='none'};
    if($('refBtn'))$('refBtn').onclick=function(){softRefresh();loadNews(true);toast(lang()==='ru'?'Обновлено':'Refreshed')};
    if($('addTop'))$('addTop').onclick=function(){setList(DEFAULTS.slice());wlBuilt=false;buildWatch();updateWatchNumbers()};
    if($('manBtn'))$('manBtn').onclick=function(e){e.preventDefault();analyzeWallet()};
    var curSel=$('curSel');if(curSel){curSel.value=cur();curSel.onchange=function(){localStorage.setItem('ct_cur',curSel.value);updateWatchNumbers();if(currentChartId){var c=COINS[currentChartId];if(c)loadChart(currentChartId,c)}}};
    var langSel=$('langSel');if(langSel){langSel.value=lang();langSel.onchange=function(){localStorage.setItem('ct_lang',langSel.value);applyLang();softRefresh();loadNews(true);if(currentChartId)loadCoinNews(currentChartId)}};
    var newsTabs=$('newsTabs');if(newsTabs)newsTabs.onclick=function(e){var tab=e.target.closest('.tab');if(!tab)return;newsTabs.querySelectorAll('.tab').forEach(function(x){x.classList.remove('on')});tab.classList.add('on');newsFilter=tab.getAttribute('data-f')||'all';paintNews(newsCache.items)};
    applyLang();setupSearch();setupConverter();wireTools();
    softRefresh();loadNews(true);
  }catch(e){console.error(e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
setInterval(softRefresh,20000);
setInterval(function(){loadNews(false)},120000);
})();
