/* v121 compact: news + stocks */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function lang(){var s=$('langSel');return(s&&s.value)||localStorage.getItem('ct_lang')||'ru';}
function cur(){var s=$('curSel');return(localStorage.getItem('ct_cur')||(s&&s.value)||'usd').toLowerCase();}
function money(v){
  if(v==null||isNaN(v))return '\u2014';
  var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
  var n=+v;
  if(Math.abs(n)>=1e12)return s+(n/1e12).toFixed(2)+'T';
  if(Math.abs(n)>=1e9)return s+(n/1e9).toFixed(2)+'B';
  if(Math.abs(n)>=1e6)return s+(n/1e6).toFixed(2)+'M';
  if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
  if(Math.abs(n)>=1)return s+n.toFixed(2);
  return s+n.toFixed(4);
}
var I18N={
  ru:{search:'\u041f\u043e\u0438\u0441\u043a \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043d\u0435\u0442\u044b\u2026',light:'\u0421\u0432\u0435\u0442\u043b\u0430\u044f',dark:'\u0422\u0451\u043c\u043d\u0430\u044f',home:'\u0413\u043b\u0430\u0432\u043d\u0430\u044f',port:'\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c',wallet:'\u041a\u043e\u0448\u0435\u043b\u0451\u043a',tools:'\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b',heatmap:'\u0422\u0435\u043f\u043b\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430',heatHint:'\u0420\u0430\u0437\u043c\u0435\u0440 \u2014 \u043a\u0430\u043f., \u0446\u0432\u0435\u0442 \u2014 24\u0447',connect:'\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a',noWallet:'\u041a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d',switchW:'\u0421\u043c\u0435\u043d\u0438\u0442\u044c',loading:'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',emptyTok:'\u0411\u0430\u043b\u0430\u043d\u0441 0 \u043d\u0430 \u0430\u0434\u0440\u0435\u0441\u0435. \u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437 Walt',est:'\u041e\u0446\u0435\u043d\u043a\u0430',chartSimple:'\u041e\u0431\u044b\u0447\u043d\u044b\u0439',chartPro:'Pro TV',coinNews:'\u041d\u043e\u0432\u043e\u0441\u0442\u0438',stocks:'\u0410\u043a\u0446\u0438\u0438',stocksHint:'\u041a\u0440\u0443\u043f\u043d\u044b\u0435 \u0430\u043a\u0446\u0438\u0438 \u00b7 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u0434\u043b\u044f \u0433\u0440\u0430\u0444\u0438\u043a\u0430'},
  en:{search:'Search any coin\u2026',light:'Light',dark:'Dark',home:'Home',port:'Portfolio',wallet:'Wallet',tools:'Tools',heatmap:'Market heatmap',heatHint:'Size = mcap, color = 24h',connect:'Connect wallet',noWallet:'No wallet connected',switchW:'Switch',loading:'Loading\u2026',emptyTok:'Balance 0 on this address. Paste address from Walt',est:'Estimate',chartSimple:'Simple',chartPro:'Pro TV',coinNews:'News',stocks:'Stocks',stocksHint:'Major stocks \u00b7 tap for chart'}
};
function t(k){return(I18N[lang()]||I18N.en)[k]||k;}
function applyUILang(){
  localStorage.setItem('ct_lang',lang());
  if($('q'))$('q').placeholder=t('search');
  var tb=$('themeBtn');
  if(tb)tb.textContent=document.documentElement.getAttribute('data-theme')==='light'?t('dark'):t('light');
  var map={home:'home',port:'port',wallet:'wallet',tools:'tools'};
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    var p=btn.getAttribute('data-p'),span=btn.querySelector('span');
    if(span&&map[p])span.textContent=t(map[p]);
  });
  [['#heatmapCard h2','heatmap'],['#heatmapCard .muted','heatHint'],['#walletConnectCard h2','connect'],['#stocksCard h2','stocks'],['#stocksCard .muted','stocksHint']].forEach(function(x){
    var el=document.querySelector(x[0]);if(el)el.textContent=t(x[1]);
  });
  if($('btnReconnect'))$('btnReconnect').textContent=t('switchW');
  if($('btnProChart'))$('btnProChart').textContent=chartMode==='tv'?t('chartSimple'):t('chartPro');
  if(lastNewsItems.length)paintCoinNews(lastNewsItems);
  updateWS();
}
function hideNewsTab(){
  var btn=document.querySelector('.nav-btn[data-p="news"]');if(btn)btn.style.display='none';
  var page=$('p-news');if(page)page.style.display='none';
}
var fxRate=1,lastMcapUsd=0;
async function refreshGlobal(){
  try{
    var fxD=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json();});
    var c=cur();
    fxRate=c==='eur'?(fxD.rates.EUR||1):c==='rub'?(fxD.rates.RUB||1):c==='pln'?(fxD.rates.PLN||1):1;
  }catch(e){fxRate=1;}
  try{
    var d=await fetch('https://api.coingecko.com/api/v3/global').then(function(r){return r.json();});
    var g=d&&d.data;if(!g)return;
    lastMcapUsd=(g.total_market_cap&&g.total_market_cap.usd)||0;
    var btc=g.market_cap_percentage&&g.market_cap_percentage.btc;
    if($('mcapChip')&&lastMcapUsd)$('mcapChip').textContent='Cap: '+money(lastMcapUsd*fxRate);
    if($('domChip')&&btc!=null)$('domChip').textContent='BTC: '+(+btc).toFixed(1)+'%';
  }catch(e){}
}
setInterval(function(){
  if($('mcapChip')&&lastMcapUsd){
    var want='Cap: '+money(lastMcapUsd*fxRate);
    if($('mcapChip').textContent!==want)$('mcapChip').textContent=want;
  }
},2000);
var heatData=[],heatAt=0;
async function loadHeatmap(){
  if(Date.now()-heatAt<60000&&heatData.length){paintHeatmap();return;}
  try{
    var d=await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=28&page=1&sparkline=false&price_change_percentage=24h').then(function(r){return r.json();});
    heatData=(d||[]).map(function(c){
      var sym=(c.symbol||'').toUpperCase();if(sym==='TON')sym='GRAM';
      return{id:c.id,sym:sym,ch:c.price_change_percentage_24h||0,mcap:c.market_cap||0};
    });
    heatAt=Date.now();paintHeatmap();
  }catch(e){}
}
function paintHeatmap(){
  var box=$('heatmapBox');if(!box||!heatData.length)return;
  var maxM=1;heatData.forEach(function(x){if(x.mcap>maxM)maxM=x.mcap;});
  var html='';
  heatData.forEach(function(c){
    var ch=c.ch,size=Math.max(0.08,Math.min(0.28,Math.sqrt(c.mcap/maxM)*0.28));
    var bg=ch>3?'rgba(34,197,94,0.75)':ch>0.3?'rgba(34,197,94,0.4)':ch>-0.3?'rgba(100,90,120,0.35)':ch>-3?'rgba(239,68,68,0.4)':'rgba(239,68,68,0.75)';
    html+='<div class="heat-cell" data-id="'+c.id+'" style="flex:'+(size*100).toFixed(1)+' 1 '+(size*90).toFixed(0)+'px;background:'+bg+'"><div class="heat-sym">'+c.sym+'</div><div class="heat-ch">'+(ch>=0?'\u2191':'\u2193')+' '+Math.abs(ch).toFixed(2)+'%</div></div>';
  });
  box.innerHTML=html;
  box.querySelectorAll('.heat-cell').forEach(function(el){
    el.addEventListener('click',function(){
      var row=document.querySelector('#wBody tr[data-id="'+el.getAttribute('data-id')+'"]');
      if(row)row.click();
    });
  });
}
function ensureHeatmapUI(){
  if($('heatmapCard')){loadHeatmap();return;}
  var home=$('p-home');if(!home)return;
  var card=document.createElement('div');
  card.className='card';card.id='heatmapCard';
  card.innerHTML='<h2>'+t('heatmap')+'</h2><div id="heatmapBox" class="heatmap"></div><p class="muted" style="margin-top:.4rem;font-size:.7rem">'+t('heatHint')+'</p>';
  var cards=home.querySelectorAll('.card');
  if(cards.length>=1)home.insertBefore(card,cards[0].nextSibling);else home.appendChild(card);
  loadHeatmap();
}
function renameTonToGram(){
  document.querySelectorAll('#wBody tr[data-id="the-open-network"],#wBody tr[data-id="toncoin"]').forEach(function(tr){
    tr.querySelectorAll('td').forEach(function(td){
      if(/\bTON\b/.test(td.textContent||''))td.innerHTML=td.innerHTML.replace(/\bTON\b/g,'GRAM');
    });
  });
  if($('dSym')&&($('dSym').textContent||'').trim().toUpperCase()==='TON')$('dSym').textContent='GRAM';
}
var coinNewsCache={},trCache={},currentCoin={id:'',sym:'',name:''},lastNewsItems=[];
var NEWS_Q={bitcoin:'bitcoin OR BTC',ethereum:'ethereum OR ETH',solana:'solana OR SOL',ripple:'XRP OR ripple',binancecoin:'BNB OR binance',cardano:'cardano OR ADA',dogecoin:'dogecoin OR DOGE',monero:'monero OR XMR','the-open-network':'Toncoin OR "Open Network"',toncoin:'Toncoin OR "Open Network"'};
async function translate(text){
  if(!text||lang()!=='ru')return text;
  if(trCache[text])return trCache[text];
  try{
    var d=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q='+encodeURIComponent(text.slice(0,450))).then(function(r){return r.json();});
    if(Array.isArray(d)&&d[0]){var o=d[0].map(function(x){return x[0];}).join('');if(o){trCache[text]=o;return o;}}
  }catch(e){}
  return text;
}
async function fetchCoinNews(sym,name,id){
  var q=NEWS_Q[id]||(sym+' crypto');
  var items=[],cut=Date.now()-30*864e5;
  try{
    var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(q)+'&tags=story&hitsPerPage=25').then(function(r){return r.json();});
    (d.hits||[]).forEach(function(h){
      var title=(h.title||'').trim();
      if(!title||/^(Show HN|Ask HN|Tell HN)/i.test(title))return;
      var ts=h.created_at_i?h.created_at_i*1000:Date.parse(h.created_at||0);
      if(ts&&ts<cut)return;
      items.push({title:title,link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN'});
    });
  }catch(e){}
  try{
    var d2=await fetch('https://hn.algolia.com/api/v1/search?query='+encodeURIComponent(sym+' crypto')+'&tags=story&hitsPerPage=12').then(function(r){return r.json();});
    (d2.hits||[]).forEach(function(h){
      var title=(h.title||'').trim();
      if(!title||/^(Show HN|Ask HN|Tell HN)/i.test(title))return;
      var ts=h.created_at_i?h.created_at_i*1000:Date.parse(h.created_at||0);
      if(ts&&ts<cut)return;
      items.push({title:title,link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN'});
    });
  }catch(e){}
  try{
    var cc=await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories='+encodeURIComponent(sym)+'&limit=15').then(function(r){return r.json();});
    ((cc&&cc.Data)||[]).forEach(function(n){
      var title=(n.title||'').trim();if(!title)return;
      var ts=(n.published_on||0)*1000;if(ts&&ts<cut)return;
      items.push({title:title,link:n.url||n.guid||'#',date:ts?new Date(ts).toISOString():'',src:n.source||'CC'});
    });
  }catch(e){}
  var seen={},out=[];
  items.forEach(function(n){var k=n.title.toLowerCase().slice(0,55);if(seen[k])return;seen[k]=1;out.push(n);});
  out.sort(function(a,b){return Date.parse(b.date||0)-Date.parse(a.date||0);});
  return out.slice(0,18);
}
function detectCoinFromUI(){
  var sym=(($('dSym')||{}).textContent||'').trim().toUpperCase();
  var name=(($('dName')||{}).textContent||'').trim();
  var id=window.__lastCoinId||'';
  var MAP={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',GRAM:'the-open-network',TON:'the-open-network',XMR:'monero',ADA:'cardano',DOGE:'dogecoin'};
  if(!id&&MAP[sym])id=MAP[sym];
  if(sym==='GRAM'||sym==='TON')id='the-open-network';
  currentCoin={id:id,sym:sym,name:name};
  return currentCoin;
}
async function loadCoinNews(force){
  var box=$('coinNews');if(!box)return;
  detectCoinFromUI();
  if(!currentCoin.sym&&!currentCoin.id)return;
  var key=currentCoin.id||currentCoin.sym;
  var cache=coinNewsCache[key];
  if(!force&&cache&&Date.now()-cache.at<40000&&cache.items.length){
    lastNewsItems=cache.items;await paintCoinNews(cache.items);return;
  }
  box.innerHTML='<div class="muted" style="margin-top:.5rem">'+t('loading')+'</div>';
  var items=await fetchCoinNews(currentCoin.sym,currentCoin.name,currentCoin.id);
  coinNewsCache[key]={at:Date.now(),items:items};
  lastNewsItems=items;
  await paintCoinNews(items);
}
async function paintCoinNews(items){
  var box=$('coinNews');if(!box)return;
  var L=lang(),label=currentCoin.sym||currentCoin.name||'';
  var title=t('coinNews')+' \u2014 '+label;
  if(!items||!items.length){
    box.innerHTML='<div style="margin-top:.65rem"><b style="color:var(--accent)">'+title+'</b><div class="muted" style="margin-top:.35rem">\u2014</div></div>';
    return;
  }
  if(L==='ru'){
    var need=items.filter(function(n){return!trCache[n.title];}).slice(0,12);
    await Promise.all(need.map(function(n){return translate(n.title);}));
  }
  var html='<div style="margin-top:.65rem"><b style="color:var(--accent)">'+title+'</b>';
  items.forEach(function(n){
    var d='';try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){}
    var tt=n.title;if(L==='ru'&&trCache[n.title])tt=trCache[n.title];
    html+='<div class="news-item" style="margin-top:.45rem"><a href="'+n.link+'" target="_blank" rel="noopener">'+tt+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>';
  });
  html+='</div>';
  box.innerHTML=html;
}
var chartMode='simple',lastChartId='bitcoin';
var TV_MAP={bitcoin:'BINANCE:BTCUSDT',ethereum:'BINANCE:ETHUSDT',solana:'BINANCE:SOLUSDT',binancecoin:'BINANCE:BNBUSDT',ripple:'BINANCE:XRPUSDT',cardano:'BINANCE:ADAUSDT',dogecoin:'BINANCE:DOGEUSDT',monero:'BINANCE:XMRUSDT','the-open-network':'OKX:TONUSDT',toncoin:'OKX:TONUSDT'};
var SYM_ID={BTC:'bitcoin',ETH:'ethereum',SOL:'solana',BNB:'binancecoin',XRP:'ripple',TON:'the-open-network',GRAM:'the-open-network',XMR:'monero',ADA:'cardano',DOGE:'dogecoin'};
var STOCK_TV={AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',META:'NASDAQ:META',NFLX:'NASDAQ:NFLX',AMD:'NASDAQ:AMD',INTC:'NASDAQ:INTC',BABA:'NYSE:BABA',JPM:'NYSE:JPM',V:'NYSE:V',DIS:'NYSE:DIS',KO:'NYSE:KO',PEP:'NASDAQ:PEP'};
function ensureProBtn(){
  var tabs=$('chartTabs');if(!tabs)return;
  var b=$('btnProChart');
  if(!b){
    b=document.createElement('button');b.type='button';b.id='btnProChart';b.className='tab';b.style.marginLeft='auto';
    tabs.appendChild(b);
    b.onclick=function(e){
      e.preventDefault();e.stopPropagation();
      var sy=(($('dSym')||{}).textContent||'').trim().toUpperCase();
      lastChartId=SYM_ID[sy]||window.__lastCoinId||lastChartId||'bitcoin';
      if(chartMode==='tv'){
        chartMode='simple';b.textContent=t('chartPro');
        var box=$('tv');if(box){box.innerHTML='';box.style.height='280px';}
        setTimeout(function(){var day=tabs.querySelector('.tab[data-d].on')||tabs.querySelector('.tab[data-d="1"]');if(day){day.classList.remove('on');day.click();}},50);
      }else{chartMode='tv';b.textContent=t('chartSimple');loadTV(lastChartId);}
    };
  }
  b.textContent=chartMode==='tv'?t('chartSimple'):t('chartPro');
}
var tvReady=null;
function ensureTV(){
  if(window.TradingView)return Promise.resolve();
  if(tvReady)return tvReady;
  tvReady=new Promise(function(res){var s=document.createElement('script');s.src='https://s3.tradingview.com/tv.js';s.onload=function(){res();};s.onerror=function(){res();};document.head.appendChild(s);});
  return tvReady;
}
async function loadTV(idOrSymbol){
  var box=$('tv');if(!box)return;
  var symbol=TV_MAP[idOrSymbol]||STOCK_TV[idOrSymbol]||idOrSymbol||'BINANCE:BTCUSDT';
  if(TV_MAP[idOrSymbol])lastChartId=idOrSymbol;
  box.style.background='#12101c';box.style.height='360px';
  box.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">\u2026</div>';
  await ensureTV();if(!window.TradingView)return;
  box.innerHTML='';
  var cid='tvw_'+Date.now(),el=document.createElement('div');el.id=cid;el.style.cssText='height:100%;width:100%';box.appendChild(el);
  var theme=document.documentElement.getAttribute('data-theme')==='light'?'light':'dark';
  try{new TradingView.widget({autosize:true,symbol:symbol,interval:'15',theme:theme,style:'1',locale:lang()==='ru'?'ru':'en',toolbar_bg:theme==='dark'?'#12101c':'#f5f3fb',enable_publishing:false,container_id:cid,backgroundColor:theme==='dark'?'#12101c':'#ffffff',allow_symbol_change:true,withdateranges:true});}catch(e){}
}
var STOCKS=[{s:'AAPL',n:'Apple'},{s:'MSFT',n:'Microsoft'},{s:'GOOGL',n:'Alphabet'},{s:'AMZN',n:'Amazon'},{s:'NVDA',n:'NVIDIA'},{s:'TSLA',n:'Tesla'},{s:'META',n:'Meta'},{s:'AMD',n:'AMD'},{s:'NFLX',n:'Netflix'},{s:'JPM',n:'JPMorgan'},{s:'V',n:'Visa'},{s:'BABA',n:'Alibaba'},{s:'DIS',n:'Disney'},{s:'KO',n:'Coca-Cola'},{s:'INTC',n:'Intel'},{s:'PEP',n:'Pepsi'}];
var stockData={},stockAt=0;
async function loadStocks(){
  if(Date.now()-stockAt<60000&&Object.keys(stockData).length){paintStocks();return;}
  for(var i=0;i<STOCKS.length;i++){
    var sym=STOCKS[i].s;
    try{
      var p=await fetch('https://api.twelvedata.com/price?symbol='+sym+'&apikey=demo').then(function(r){return r.json();});
      if(p&&p.price)stockData[sym]={price:parseFloat(p.price),ch:0,name:STOCKS[i].n};
    }catch(e){}
  }
  stockAt=Date.now();paintStocks();
}
function paintStocks(){
  var box=$('stocksBox');if(!box)return;
  var html='';
  STOCKS.forEach(function(st){
    var d=stockData[st.s]||{},price=d.price!=null?money(d.price*fxRate):'\u2014';
    html+='<div class="stock-row" data-stock="'+st.s+'"><div class="stock-left"><b>'+st.s+'</b> <span class="muted">'+st.n+'</span></div><div class="stock-right"><span class="stock-px">'+price+'</span></div></div>';
  });
  box.innerHTML=html||'<div class="muted">'+t('loading')+'</div>';
  box.querySelectorAll('.stock-row').forEach(function(el){
    el.addEventListener('click',function(){openStockChart(el.getAttribute('data-stock'));});
  });
}
function openStockChart(sym){
  var detail=$('detail');if(!detail)return;
  detail.style.display='block';
  if($('dName'))$('dName').textContent=(stockData[sym]&&stockData[sym].name)||sym;
  if($('dSym'))$('dSym').textContent=sym;
  if($('dPrice'))$('dPrice').textContent=stockData[sym]&&stockData[sym].price!=null?money(stockData[sym].price*fxRate):'\u2014';
  if($('dCh')){$('dCh').textContent='';}
  if($('dImg')){$('dImg').src='https://assets.parqet.com/logos/symbol/'+sym+'?format=png';$('dImg').onerror=function(){this.style.display='none';};}
  window.__lastCoinId='';
  currentCoin={id:'',sym:sym,name:(stockData[sym]&&stockData[sym].name)||sym};
  chartMode='tv';ensureProBtn();
  if($('btnProChart'))$('btnProChart').textContent=t('chartSimple');
  loadTV(STOCK_TV[sym]||('NASDAQ:'+sym));
  loadStockNews(sym);
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}
async function loadStockNews(sym){
  var box=$('coinNews');if(!box)return;
  box.innerHTML='<div class="muted" style="margin-top:.5rem">'+t('loading')+'</div>';
  var items=[],cut=Date.now()-30*864e5;
  try{
    var d=await fetch('https://hn.algolia.com/api/v1/search_by_date?query='+encodeURIComponent(sym)+'&tags=story&hitsPerPage=15').then(function(r){return r.json();});
    (d.hits||[]).forEach(function(h){
      var title=(h.title||'').trim();if(!title||/^(Show HN|Ask HN)/i.test(title))return;
      var ts=h.created_at_i?h.created_at_i*1000:Date.parse(h.created_at||0);if(ts&&ts<cut)return;
      items.push({title:title,link:h.url||('https://news.ycombinator.com/item?id='+h.objectID),date:h.created_at||'',src:'HN'});
    });
  }catch(e){}
  lastNewsItems=items.slice(0,12);
  currentCoin={id:'',sym:sym,name:sym};
  await paintCoinNews(lastNewsItems);
}
function ensureStocksUI(){
  if($('stocksCard')){loadStocks();return;}
  var home=$('p-home');if(!home)return;
  var card=document.createElement('div');card.className='card';card.id='stocksCard';
  card.innerHTML='<h2>'+t('stocks')+'</h2><div id="stocksBox" class="stocks-list"></div><p class="muted" style="margin-top:.4rem;font-size:.7rem">'+t('stocksHint')+'</p>';
  var heat=$('heatmapCard');
  if(heat&&heat.nextSibling)home.insertBefore(card,heat.nextSibling);else home.appendChild(card);
  loadStocks();
}
var connected={type:null,address:null};
function shortAddr(a){if(!a||a.length<12)return a||'\u2014';return a.slice(0,6)+'\u2026'+a.slice(-4);}
function setNavWalletIcon(on){
  var btn=document.querySelector('.nav-btn[data-p="wallet"]');if(!btn)return;
  var badge=btn.querySelector('.w-badge');
  if(on){if(!badge){badge=document.createElement('span');badge.className='w-badge';badge.textContent='\u2713';btn.style.position='relative';btn.appendChild(badge);}badge.style.display='flex';}
  else if(badge)badge.style.display='none';
}
function enhanceWalletUI(){
  var page=$('p-wallet');if(!page)return;
  if(!page._enh){
    page._enh=1;
    var card=document.createElement('div');card.className='card';card.id='walletConnectCard';
    card.innerHTML='<h2>'+t('connect')+'</h2><p class="muted" style="margin-bottom:.5rem">Tonkeeper / Walt \u00b7 MetaMask \u00b7 Phantom</p><div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem"><button type="button" class="btn" id="btnTon" style="width:auto;flex:1;min-width:100px;padding:.5rem;font-size:.8rem">GRAM</button><button type="button" class="btn-ghost" id="btnEvm" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">MetaMask</button><button type="button" class="btn-ghost" id="btnSol" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">Phantom</button></div><div id="walletStatus" class="muted" style="font-size:.8rem;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem">\u2014</div><button type="button" class="btn-ghost" id="btnReconnect" style="display:none;padding:.35rem .6rem;font-size:.78rem">'+t('switchW')+'</button><div id="walletAnalytics" style="display:none;margin-top:.5rem"></div>';
    var first=page.querySelector('.card');if(first)page.insertBefore(card,first);else page.appendChild(card);
    $('btnTon').onclick=connectTON;$('btnEvm').onclick=connectEVM;$('btnSol').onclick=connectSol;
    $('btnReconnect').onclick=function(){connected={type:null,address:null};try{if(window.__tonUI)window.__tonUI.disconnect();}catch(e){}updateWS();};
  }
  updateWS();
}
function updateWS(){
  var el=$('walletStatus'),rb=$('btnReconnect');if(!el)return;
  if(!connected.address){el.innerHTML=t('noWallet');if(rb)rb.style.display='none';if($('walletAnalytics'))$('walletAnalytics').style.display='none';setNavWalletIcon(false);return;}
  var label=connected.type==='TON'?'GRAM':connected.type;
  el.innerHTML='<span class="w-dot">\u2713</span><span style="color:var(--accent);font-weight:600">'+label+'</span>: <b>'+shortAddr(connected.address)+'</b>';
  if(rb)rb.style.display='inline-block';setNavWalletIcon(true);loadWA();
}
async function connectTON(){
  var st=$('walletStatus');if(st)st.textContent=t('loading');
  try{
    if(!window.TON_CONNECT_UI){await new Promise(function(res,rej){var s=document.createElement('script');s.src='https://unpkg.com/@tonconnect/ui@2.0.9/dist/tonconnect-ui.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
    if(!window.TON_CONNECT_UI){window.open('https://tonkeeper.com/download','_blank');return;}
    if(!window.__tonUI)window.__tonUI=new window.TON_CONNECT_UI.TonConnectUI({manifestUrl:'https://0xvilya.github.io/crypto-tracker/tonconnect-manifest.json'});
    if(!window.__tonUI.wallet)await window.__tonUI.connectWallet();
    var w=window.__tonUI.wallet;
    if(w&&w.account){connected={type:'TON',address:w.account.address};if($('manChain'))$('manChain').value='ton';if($('manAddr'))$('manAddr').value=w.account.address;updateWS();}
  }catch(e){if(st)st.textContent=lang()==='ru'?'\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437 Walt':'Paste address from Walt';}
}
async function connectEVM(){
  try{if(!window.ethereum){window.open('https://metamask.app.link/dapp/'+location.host+location.pathname,'_blank');return;}
    var acc=await window.ethereum.request({method:'eth_requestAccounts'});
    if(acc&&acc[0]){connected={type:'EVM',address:acc[0]};if($('manChain'))$('manChain').value='eth';if($('manAddr'))$('manAddr').value=acc[0];updateWS();}
  }catch(e){}
}
async function connectSol(){
  try{var sol=window.solana||(window.phantom&&window.phantom.solana);if(!sol){window.open('https://phantom.app/','_blank');return;}
    var r=await sol.connect();var pk=r&&r.publicKey?r.publicKey.toString():(sol.publicKey&&sol.publicKey.toString());
    if(pk){connected={type:'Solana',address:pk};if($('manChain'))$('manChain').value='sol';if($('manAddr'))$('manAddr').value=pk;updateWS();}
  }catch(e){}
}
async function loadWA(){
  var box=$('walletAnalytics');if(!box||!connected.address)return;
  box.style.display='block';box.innerHTML='<div class="muted">'+t('loading')+'</div>';
  var rows=[],addr=(connected.address||'').replace(/['"]/g,'').trim();
  try{
    if(connected.type==='TON'||/^[0EU]Q/i.test(addr)||addr.indexOf('0:')===0){
      var forms=[addr],tonBal=0,jets=[];
      try{var parsed=await fetch('https://tonapi.io/v2/address/'+encodeURIComponent(addr)+'/parse').then(function(r){return r.json();});
        if(parsed){if(parsed.raw_form)forms.push(parsed.raw_form);if(parsed.bounceable&&parsed.bounceable.b64url)forms.push(parsed.bounceable.b64url);if(parsed.non_bounceable&&parsed.non_bounceable.b64url)forms.push(parsed.non_bounceable.b64url);}
      }catch(e){}
      for(var fi=0;fi<forms.length;fi++){
        try{var acc=await fetch('https://tonapi.io/v2/accounts/'+encodeURIComponent(forms[fi])).then(function(r){return r.json();});
          if(acc&&acc.balance!=null){var b=Number(acc.balance)/1e9;if(b>tonBal)tonBal=b;}
          var jres=await fetch('https://tonapi.io/v2/accounts/'+encodeURIComponent(forms[fi])+'/jettons?limit=50').then(function(r){return r.json();});
          if(jres&&jres.balances&&jres.balances.length>jets.length)jets=jres.balances;
        }catch(e){}
      }
      var tonPrice=0;
      try{var p=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd').then(function(r){return r.json();});tonPrice=(p['the-open-network']&&p['the-open-network'].usd)||0;}catch(e){}
      rows.push({sym:'GRAM',name:'Gram',bal:tonBal,usd:tonBal*tonPrice});
      jets.forEach(function(j){
        var meta=j.jetton||{},dec=+(meta.decimals!=null?meta.decimals:9),bal=Number(j.balance||0)/Math.pow(10,dec);
        if(bal<=0)return;
        var sym=(meta.symbol||'JETTON').toUpperCase();if(sym==='TON')sym='GRAM';
        var price=(j.price&&j.price.prices&&j.price.prices.USD)?+j.price.prices.USD:0;
        rows.push({sym:sym,name:meta.name||sym,bal:bal,usd:bal*price});
      });
    }
  }catch(e){}
  var total=rows.reduce(function(s,r){return s+(r.usd||0);},0);
  if(!rows.length||total===0){box.innerHTML='<div class="muted" style="line-height:1.4">'+t('emptyTok')+'</div>';if($('manRes'))$('manRes').innerHTML=box.innerHTML;return;}
  var html='<div class="pnl-box" style="margin-bottom:.45rem"><div class="muted">'+t('est')+'</div><div style="font-size:1.15rem;font-weight:700">'+money(total*fxRate)+'</div></div>';
  rows.sort(function(a,b){return(b.usd||0)-(a.usd||0);});
  rows.forEach(function(r){var balStr=r.bal>=1?r.bal.toLocaleString('en-US',{maximumFractionDigits:4}):r.bal.toFixed(6);html+='<div class="hold-row"><div><b>'+r.sym+'</b> <span class="muted" style="font-size:.72rem">'+r.name+'</span></div><span>'+balStr+(r.usd?' \u00b7 '+money(r.usd*fxRate):'')+'</span></div>';});
  box.innerHTML=html;if($('manRes'))$('manRes').innerHTML=html;
}
function injectCSS(){
  if($('ct-extra-css'))return;
  var s=document.createElement('style');s.id='ct-extra-css';
  s.textContent='.heatmap{display:flex;flex-wrap:wrap;gap:4px;min-height:120px}.heat-cell{border-radius:8px;padding:8px 6px;min-width:56px;min-height:48px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center}.heat-sym{font-weight:700;font-size:.78rem;color:#fff}.heat-ch{font-size:.65rem;color:rgba(255,255,255,.9);margin-top:2px}#btnProChart{border:1px solid rgba(168,85,247,.4)!important}.w-dot{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#22c55e;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}.w-badge{position:absolute;top:2px;right:8px;width:14px;height:14px;border-radius:50%;background:#22c55e;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center}.nav-btn[data-p="news"]{display:none!important}.stocks-list{display:flex;flex-direction:column;gap:2px}.stock-row{display:flex;justify-content:space-between;align-items:center;padding:.55rem .4rem;border-radius:10px;cursor:pointer}.stock-row:active,.stock-row:hover{background:rgba(168,85,247,.12)}.stock-left b{font-size:.9rem;margin-right:.35rem}.stock-right{text-align:right;font-size:.85rem}.stock-px{font-weight:600}';
  document.head.appendChild(s);
}
function boot(){
  injectCSS();hideNewsTab();applyUILang();refreshGlobal();
  setInterval(refreshGlobal,45000);
  setTimeout(function(){ensureHeatmapUI();ensureStocksUI();},500);
  setInterval(loadHeatmap,90000);setInterval(loadStocks,120000);setInterval(renameTonToGram,2500);
  document.addEventListener('click',function(e){
    var tr=e.target.closest('tr[data-id]');
    if(tr&&!e.target.closest('.wl-rm')){
      window.__lastCoinId=tr.getAttribute('data-id')||'';chartMode='simple';
      setTimeout(function(){ensureProBtn();renameTonToGram();detectCoinFromUI();if(window.__lastCoinId)currentCoin.id=window.__lastCoinId;loadCoinNews(true);},350);
    }
    if(e.target.closest('.nav-btn[data-p="wallet"]'))setTimeout(enhanceWalletUI,120);
    if(e.target.closest('.nav-btn[data-p="home"]'))setTimeout(function(){ensureHeatmapUI();ensureStocksUI();},150);
    if(e.target.closest('#manBtn')){
      setTimeout(function(){
        var addr=(($('manAddr')||{}).value||'').replace(/['"]/g,'').trim(),chain=(($('manChain')||{}).value||'');
        if((chain==='ton'||!chain)&&addr&&(/^[0EU]Q/i.test(addr)||addr.indexOf('0:')===0)){connected={type:'TON',address:addr};enhanceWalletUI();loadWA();}
      },500);
    }
  },true);
  var curSel=$('curSel');if(curSel)curSel.addEventListener('change',function(){localStorage.setItem('ct_cur',curSel.value);setTimeout(function(){refreshGlobal();paintStocks();},100);});
  var langSel=$('langSel');if(langSel)langSel.addEventListener('change',function(){applyUILang();});
  setTimeout(function(){
    if($('p-wallet')&&$('p-wallet').classList.contains('on'))enhanceWalletUI();
    ensureProBtn();ensureHeatmapUI();ensureStocksUI();applyUILang();hideNewsTab();
    var detail=$('detail');if(detail&&detail.style.display!=='none'){detectCoinFromUI();loadCoinNews(true);}
  },700);
  setInterval(function(){var detail=$('detail');if(detail&&detail.style.display!=='none'&&currentCoin.sym&&!STOCK_TV[currentCoin.sym])loadCoinNews(false);},50000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
