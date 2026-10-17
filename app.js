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
  _c.forEach(function(id){if(!COINS[id])COINS[id]={sym:id.slice(0,6).toUpperCase(),pair:null,name:id,color:'#a855f7',img:'',apy:0}});
}catch(e){}

var prices={}, chart=null, series=null, currentId=null, watch=JSON.parse(localStorage.getItem('ct_watch')||'null')||Object.keys(COINS).filter(function(k){return k!=='toncoin'}), fx={usd:1,eur:0.92,rub:90,pln:4},
    portfolio=JSON.parse(localStorage.getItem('ct_port')||'[]'), chartAbort=null;

function money(n,c){c=c||cur();if(n==null||isNaN(+n))return'\u2014';var r=fx[c]||1,v=+n*r,s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';if(Math.abs(v)>=1e9)return s+(v/1e9).toFixed(2)+'B';if(Math.abs(v)>=1e6)return s+(v/1e6).toFixed(2)+'M';if(Math.abs(v)>=1000)return s+v.toLocaleString('en-US',{maximumFractionDigits:2});if(Math.abs(v)>=1)return s+v.toFixed(2);if(Math.abs(v)>=0.0001)return s+v.toFixed(6);return s+v.toExponential(2)}
function pct(n){if(n==null||isNaN(+n))return'\u2014';var v=+n;return (v>=0?'+':'')+v.toFixed(2)+'%'}
function imgUrl(id){var c=COINS[id];if(c&&c.img)return 'https://assets.coingecko.com/coins/images/'+c.img;return 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'}

async function loadFx(){try{var r=await fetch('https://api.exchangerate-api.com/v4/latest/USD');var d=await r.json();fx={usd:1,eur:d.rates.EUR||0.92,rub:d.rates.RUB||90,pln:d.rates.PLN||4}}catch(e){}}

async function fetchPrices(){
  var ids=Object.keys(COINS).join(',');
  try{
    var r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=usd&include_24hr_change=true');
    var d=await r.json();
    Object.keys(d).forEach(function(id){prices[id]={p:d[id].usd,ch:d[id].usd_24h_change||0}});
  }catch(e){}
  // Binance fallback for pairs
  var pairs=Object.keys(COINS).filter(function(k){return COINS[k].pair}).map(function(k){return COINS[k].pair});
  try{
    var br=await fetch('https://api.binance.us/api/v3/ticker/24hr');
    var bd=await br.json();
    var map={};
    bd.forEach(function(t){map[t.symbol]=t});
    Object.keys(COINS).forEach(function(id){
      var pair=COINS[id].pair;
      if(pair&&map[pair]){
        var t=map[pair];
        prices[id]={p:+t.lastPrice,ch:+t.priceChangePercent};
      }
    });
  }catch(e){}
}

function paintWatch(){
  var body=$('wBody');if(!body)return;
  var html='';
  watch.forEach(function(id,i){
    var c=COINS[id]||{sym:id,name:id,apy:0};
    var pr=prices[id]||{};
    var chCls=pr.ch>0?'up':pr.ch<0?'dn':'';
    html+='<tr class="s-tr" data-id="'+id+'" style="cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent">'+
      '<td>'+(i+1)+'</td>'+
      '<td><img src="'+imgUrl(id)+'" width="22" height="22" style="border-radius:50%;vertical-align:middle;margin-right:6px" onerror="this.style.display=\'none\'"/><b>'+c.sym+'</b> <span class="muted" style="font-size:.75rem">'+c.name+'</span></td>'+
      '<td>'+money(pr.p)+'</td>'+
      '<td class="'+chCls+'">'+pct(pr.ch)+'</td>'+
      '<td>'+(c.apy?c.apy+'%':'\u2014')+'</td>'+
      '<td><button type="button" class="btn-ghost rm" data-id="'+id+'" style="padding:.15rem .4rem">\u00d7</button></td></tr>';
  });
  if(!watch.length)html='<tr><td colspan="6" class="empty">'+ (lang()==='en'?'Empty watchlist':'Список пуст') +'</td></tr>';
  body.innerHTML=html;
  body.querySelectorAll('tr[data-id]').forEach(function(tr){
    tr.onclick=function(e){if(e.target.closest('.rm'))return;openDetail(tr.getAttribute('data-id'))};
  });
  body.querySelectorAll('.rm').forEach(function(b){
    b.onclick=function(e){e.stopPropagation();var id=b.getAttribute('data-id');watch=watch.filter(function(x){return x!==id});localStorage.setItem('ct_watch',JSON.stringify(watch));paintWatch();toast(lang()==='en'?'Removed':'Удалено')};
  });
}

function openDetail(id){
  currentId=id;
  var card=$('detail');if(!card)return;
  card.style.display='block';
  var c=COINS[id]||{sym:id,name:id};
  var pr=prices[id]||{};
  if($('dImg')){$('dImg').src=imgUrl(id);$('dImg').onerror=function(){this.style.display='none'};}
  if($('dName'))$('dName').textContent=c.name;
  if($('dSym'))$('dSym').textContent=c.sym;
  if($('dPrice'))$('dPrice').textContent=money(pr.p);
  if($('dCh')){$('dCh').textContent=pct(pr.ch);$('dCh').className=pr.ch>0?'up':pr.ch<0?'dn':'';}
  loadChart(id,1);
  loadCoinNews(id);
  card.scrollIntoView({behavior:'smooth',block:'start'});
}

async function loadChart(id,days){
  var el=$('tv');if(!el||!window.LightweightCharts)return;
  if(chart){try{chart.remove()}catch(e){}chart=null;series=null}
  chart=LightweightCharts.createChart(el,{width:el.clientWidth,height:280,layout:{background:{color:'#12101c'},textColor:'#a78bfa'},grid:{vertLines:{color:'rgba(168,85,247,.08)'},horzLines:{color:'rgba(168,85,247,.08)'}},rightPriceScale:{borderVisible:false},timeScale:{borderVisible:false,timeVisible:true}});
  series=chart.addCandlestickSeries({upColor:'#22c55e',downColor:'#ef4444',borderVisible:false,wickUpColor:'#22c55e',wickDownColor:'#ef4444'});
  var data=[];
  try{
    if(COINS[id]&&COINS[id].pair){
      var interval=days<=1?'15m':days<=7?'1h':days<=30?'4h':'1d';
      var limit=days<=1?96:days<=7?168:days<=30?180:90;
      var r=await fetch('https://api.binance.us/api/v3/klines?symbol='+COINS[id].pair+'&interval='+interval+'&limit='+limit);
      var k=await r.json();
      data=k.map(function(c){return{time:Math.floor(c[0]/1000),open:+c[1],high:+c[2],low:+c[3],close:+c[4]}});
    }else{
      var r2=await fetch('https://api.coingecko.com/api/v3/coins/'+id+'/ohlc?vs_currency=usd&days='+days);
      var o=await r2.json();
      data=o.map(function(c){return{time:Math.floor(c[0]/1000),open:c[1],high:c[2],low:c[3],close:c[4]}});
    }
  }catch(e){}
  if(data.length){series.setData(data);chart.timeScale().fitContent()}
  if($('chartTip'))$('chartTip').textContent=data.length?(lang()==='en'?'Hover for OHLC':'Наведите для OHLC'):(lang()==='en'?'No chart data':'Нет данных графика');
  window.addEventListener('resize',function(){if(chart)chart.applyOptions({width:el.clientWidth})});
}

async function loadCoinNews(id){
  var box=$('coinNews');if(!box)return;
  box.innerHTML='<div class="muted">...</div>';
  try{
    var q=(COINS[id]&&COINS[id].name)||id;
    var r=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q+' crypto')+'&tags=story&hitsPerPage=5');
    var d=await r.json();
    var html='';
    (d.hits||[]).slice(0,5).forEach(function(h){
      if(!h.title||!h.url)return;
      html+='<div style="padding:.4rem 0;border-bottom:1px solid rgba(168,85,247,.1)"><a href="'+h.url+'" target="_blank" rel="noopener" style="color:inherit;font-size:.85rem">'+h.title+'</a></div>';
    });
    box.innerHTML=html||'<div class="muted">'+ (lang()==='en'?'No news':'Нет новостей') +'</div>';
  }catch(e){box.innerHTML='';}
}

function paintGainersLosers(){
  var arr=Object.keys(prices).map(function(id){return{id:id,ch:prices[id].ch||0,p:prices[id].p}}).filter(function(x){return x.p});
  arr.sort(function(a,b){return b.ch-a.ch});
  var g=$('gainers'),l=$('losers');
  if(g){g.innerHTML=arr.slice(0,6).map(function(x){var c=COINS[x.id]||{sym:x.id};return '<div class="s-gl" data-id="'+x.id+'"><b>'+c.sym+'</b> <span class="up">'+pct(x.ch)+'</span></div>'}).join('')}
  if(l){l.innerHTML=arr.slice(-6).reverse().map(function(x){var c=COINS[x.id]||{sym:x.id};return '<div class="s-gl" data-id="'+x.id+'"><b>'+c.sym+'</b> <span class="dn">'+pct(x.ch)+'</span></div>'}).join('')}
  document.querySelectorAll('.s-gl').forEach(function(el){el.onclick=function(){openDetail(el.getAttribute('data-id'))}});
}

async function softRefresh(){
  await fetchPrices();
  paintWatch();
  paintGainersLosers();
  if(currentId&&prices[currentId]){
    var pr=prices[currentId];
    if($('dPrice'))$('dPrice').textContent=money(pr.p);
    if($('dCh')){$('dCh').textContent=pct(pr.ch);$('dCh').className=pr.ch>0?'up':pr.ch<0?'dn':'';}
  }
  paintPortfolio();
  paintConverter();
}

function paintPortfolio(){
  var list=$('mhList'),tot=$('mhTotal'),val=$('mhVal'),pnl=$('mhPnl');
  if(!list)return;
  var html='',sum=0,cost=0;
  portfolio.forEach(function(it,i){
    var pr=prices[it.id]?prices[it.id].p:0;
    var curV=pr*it.qty;sum+=curV;cost+=it.buy*it.qty;
    var diff=curV-(it.buy*it.qty);
    html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem 0;border-bottom:1px solid rgba(168,85,247,.1)">'+
      '<div><b>'+(COINS[it.id]?COINS[it.id].sym:it.id)+'</b> \u00d7 '+it.qty+' @ '+money(it.buy)+'</div>'+
      '<div style="text-align:right">'+money(curV)+' <span class="'+(diff>=0?'up':'dn')+'">'+(diff>=0?'+':'')+money(diff)+'</span> <button type="button" class="btn-ghost" data-i="'+i+'" style="padding:.1rem .3rem">\u00d7</button></div></div>';
  });
  list.innerHTML=html||'<div class="muted">'+ (lang()==='en'?'Empty':'Пусто') +'</div>';
  list.querySelectorAll('button[data-i]').forEach(function(b){b.onclick=function(){portfolio.splice(+b.getAttribute('data-i'),1);localStorage.setItem('ct_port',JSON.stringify(portfolio));paintPortfolio()}});
  if(tot){tot.style.display=portfolio.length?'block':'none';if(val)val.textContent=money(sum);if(pnl){var d=sum-cost;pnl.textContent=(d>=0?'+':'')+money(d)+' ('+pct(cost?d/cost*100:0)+')';pnl.className=d>=0?'up':'dn'}}
}

function paintConverter(){
  var from=$('convFrom'),to=$('convTo'),amt=$('convAmt'),out=$('convOut');
  if(!from||!to)return;
  if(!from.options.length){
    Object.keys(COINS).forEach(function(id){var o=document.createElement('option');o.value=id;o.textContent=(COINS[id].sym||id);from.appendChild(o);to.appendChild(o.cloneNode(true))});
    from.value='bitcoin';to.value='ethereum';
  }
  var a=+ (amt&&amt.value)||0,fp=prices[from.value]?prices[from.value].p:0,tp=prices[to.value]?prices[to.value].p:0;
  if(out)out.textContent=tp?(a*fp/tp).toFixed(6)+' '+(COINS[to.value]?COINS[to.value].sym:to.value):'\u2014';
}

function fillSelects(){
  ['mhCoinSel','dcaCoin','stakeCoin'].forEach(function(sid){
    var s=$(sid);if(!s||s.options.length>1)return;
    Object.keys(COINS).forEach(function(id){var o=document.createElement('option');o.value=id;o.textContent=(COINS[id].sym||id)+' — '+COINS[id].name;s.appendChild(o)});
  });
}

function boot(){
  loadFx().then(function(){
    fetchPrices().then(function(){
      paintWatch();
      paintGainersLosers();
      paintPortfolio();
      fillSelects();
      paintConverter();
    });
  });

  // nav
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      var p=btn.getAttribute('data-p');
      document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('on')});
      btn.classList.add('on');
      document.querySelectorAll('.page').forEach(function(pg){pg.classList.remove('on');pg.style.display='none'});
      var el=$('p-'+p);if(el){el.classList.add('on');el.style.display=''}
      if(p==='port')paintPortfolio();
      if(p==='tools'){paintConverter();calcDca();calcStake();calcTp();loadGas()}
    });
  });

  // currency / lang / theme
  var curSel=$('curSel');if(curSel){curSel.value=cur();curSel.addEventListener('change',function(){localStorage.setItem('ct_cur',curSel.value);softRefresh()})}
  var langSel=$('langSel');if(langSel){langSel.value=lang();langSel.addEventListener('change',function(){localStorage.setItem('ct_lang',langSel.value);location.reload()})}
  var themeBtn=$('themeBtn');if(themeBtn){themeBtn.onclick=function(){document.body.classList.toggle('light');themeBtn.textContent=document.body.classList.contains('light')?(lang()==='en'?'Dark':'Тёмная'):(lang()==='en'?'Light':'Светлая');localStorage.setItem('ct_theme',document.body.classList.contains('light')?'light':'dark')};if(localStorage.getItem('ct_theme')==='light'){document.body.classList.add('light');themeBtn.textContent=lang()==='en'?'Dark':'Тёмная'}}

  // search
  var q=$('q'),sr=$('sr');
  if(q){q.addEventListener('input',function(){
    var v=q.value.trim().toLowerCase();
    if(!v){sr.style.display='none';return}
    var hits=Object.keys(COINS).filter(function(id){var c=COINS[id];return c.sym.toLowerCase().indexOf(v)>=0||c.name.toLowerCase().indexOf(v)>=0||id.indexOf(v)>=0}).slice(0,8);
    if(!hits.length){sr.innerHTML='<div class="muted" style="padding:.5rem">...</div>';sr.style.display='block';return}
    sr.innerHTML=hits.map(function(id){var c=COINS[id];return '<div class="sr-item" data-id="'+id+'" style="padding:.45rem .6rem;cursor:pointer;touch-action:manipulation">'+c.sym+' <span class="muted">'+c.name+'</span></div>'}).join('');
    sr.style.display='block';
    sr.querySelectorAll('.sr-item').forEach(function(el){el.onclick=function(){q.value='';sr.style.display='none';if(watch.indexOf(el.getAttribute('data-id'))<0){watch.push(el.getAttribute('data-id'));localStorage.setItem('ct_watch',JSON.stringify(watch));paintWatch()}openDetail(el.getAttribute('data-id'))}});
  })}

  // buttons
  if($('addTop'))$('addTop').onclick=function(){Object.keys(COINS).slice(0,12).forEach(function(id){if(watch.indexOf(id)<0)watch.push(id)});localStorage.setItem('ct_watch',JSON.stringify(watch));paintWatch();toast('+ Top')};
  if($('refBtn'))$('refBtn').onclick=function(){softRefresh();toast(lang()==='en'?'Refreshed':'Обновлено')};
  if($('mhAdd'))$('mhAdd').onclick=function(){
    var id=$('mhCoinSel')?$('mhCoinSel').value:($('mhCoin')&&$('mhCoin').value);
    var qty=+$('mhQty').value,buy=+$('mhBuy').value;
    if(!id||!qty)return toast(lang()==='en'?'Fill fields':'Заполните поля');
    portfolio.push({id:id,qty:qty,buy:buy||(prices[id]?prices[id].p:0)});
    localStorage.setItem('ct_port',JSON.stringify(portfolio));paintPortfolio();toast('+');
  };
  if($('manBtn'))$('manBtn').onclick=async function(){
    var chain=$('manChain').value,addr=$('manAddr').value.trim();
    if(!addr)return toast('Address?');
    var res=$('manRes');res.innerHTML='...';
    try{
      if(chain==='ton'){
        var r=await fetch('https://tonapi.io/v2/accounts/'+addr);
        var d=await r.json();
        res.innerHTML='<div><b>TON</b>: '+((d.balance||0)/1e9).toFixed(4)+'</div>';
      }else if(chain==='sol'){
        var r2=await fetch('https://api.mainnet-beta.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[addr]})});
        var d2=await r2.json();
        res.innerHTML='<div><b>SOL</b>: '+((d2.result&&d2.result.value||0)/1e9).toFixed(4)+'</div>';
      }else if(chain==='btc'){
        var r3=await fetch('https://blockstream.info/api/address/'+addr);
        var d3=await r3.json();
        res.innerHTML='<div><b>BTC</b>: '+((d3.chain_stats.funded_txo_sum-d3.chain_stats.spent_txo_sum)/1e8).toFixed(8)+'</div>';
      }else{
        var rpc={eth:'https://eth.llamarpc.com',bsc:'https://bsc-dataseed.binance.org',polygon:'https://polygon-rpc.com',arb:'https://arb1.arbitrum.io/rpc',op:'https://mainnet.optimism.io',base:'https://mainnet.base.org'}[chain];
        var r4=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getBalance',params:[addr,'latest']})});
        var d4=await r4.json();
        var bal=parseInt(d4.result||'0x0',16)/1e18;
        res.innerHTML='<div><b>'+chain.toUpperCase()+'</b>: '+bal.toFixed(6)+'</div>';
      }
    }catch(e){res.innerHTML='<div class="muted">Error</div>'}
  };

  // chart tabs
  document.querySelectorAll('#chartTabs .tab').forEach(function(tb){
    tb.onclick=function(){document.querySelectorAll('#chartTabs .tab').forEach(function(x){x.classList.remove('on')});tb.classList.add('on');if(currentId)loadChart(currentId,+tb.getAttribute('data-d'))};
  });

  // tools calcs
  function calcDca(){
    var amt=+$('dcaAmt').value||0,m=+$('dcaMonths').value||1,g=+$('dcaGrowth').value||0;
    var total=amt*m,fv=0,r=g/100/12;
    for(var i=0;i<m;i++)fv=(fv+amt)*(1+r);
    if($('dcaOut'))$('dcaOut').textContent=money(fv)+' (invested '+money(total)+')';
  }
  function calcStake(){
    var amt=+$('stakeAmt').value||0,apy=+$('stakeApy').value||0,days=+$('stakeDays').value||365,comp=$('stakeCompound')&&$('stakeCompound').value==='1';
    var earn=comp?amt*Math.pow(1+apy/100/365,days)-amt:amt*(apy/100)*(days/365);
    if($('stakeOut'))$('stakeOut').textContent=money(amt+earn)+' (+'+money(earn)+')';
  }
  function calcTp(){
    var inv=+$('tpInv').value||0,pct=+$('tpPct').value||0;
    if($('tpOut'))$('tpOut').textContent=money(inv*(1+pct/100));
  }
  ['dcaAmt','dcaMonths','dcaGrowth'].forEach(function(id){var e=$(id);if(e)e.addEventListener('input',calcDca)});
  ['stakeAmt','stakeApy','stakeDays','stakeCompound'].forEach(function(id){var e=$(id);if(e)e.addEventListener('input',calcStake);if(e&&e.tagName==='SELECT')e.addEventListener('change',calcStake)});
  ['tpInv','tpPct'].forEach(function(id){var e=$(id);if(e)e.addEventListener('input',calcTp)});
  ['convAmt','convFrom','convTo'].forEach(function(id){var e=$(id);if(e)e.addEventListener('input',paintConverter);if(e&&e.tagName==='SELECT')e.addEventListener('change',paintConverter)});

  async function loadGas(){
    var box=$('gasBox');if(!box)return;
    try{
      var r=await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
      var d=await r.json();
      if(d.result)box.innerHTML='ETH: Slow '+d.result.SafeGasPrice+' / Std '+d.result.ProposeGasPrice+' / Fast '+d.result.FastGasPrice+' Gwei';
      else box.textContent='—';
    }catch(e){box.textContent='—'}
  }

  // help
  document.querySelectorAll('.help-btn').forEach(function(b){
    b.onclick=function(){
      var k=b.getAttribute('data-help');
      var texts={port:{ru:'Добавьте монеты вручную с количеством и ценой покупки. P&L считается автоматически.',en:'Add coins manually with quantity and buy price. P&L is calculated automatically.'},wallet:{ru:'Вставьте адрес — баланс подтянется из публичных RPC. Ключи никуда не уходят.',en:'Paste address — balance is fetched from public RPCs. Keys never leave your device.'},dca:{ru:'Симуляция регулярных покупок с предполагаемым ростом.',en:'Simulation of regular purchases with assumed growth.'},staking:{ru:'Расчёт дохода от стейкинга с/без компаундинга.',en:'Staking yield calculation with/without compounding.'}};
      var t=texts[k]||{ru:'',en:''};
      if($('helpTitle'))$('helpTitle').textContent='?';
      if($('helpBody'))$('helpBody').textContent=t[lang()]||t.ru;
      if($('helpModal'))$('helpModal').style.display='flex';
    };
  });
  if($('helpClose'))$('helpClose').onclick=function(){$('helpModal').style.display='none'};

  setInterval(softRefresh,30000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
