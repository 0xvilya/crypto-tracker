/* v6.4b news reclaim + gas + price poll */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function getLang(){var s=$('langSel');return(s&&s.value)?s.value:(localStorage.getItem('ct_lang')||'en')}
function hasCyr(t){return /[\u0400-\u04FF]/.test(t||'')}
var enCache=null,enAt=0,busy=false,stamp=0;

async function fetchEN(){
  var feeds=[
    {n:'Cointelegraph',u:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://cointelegraph.com/rss')},
    {n:'CoinDesk',u:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')}
  ];
  var all=[];
  await Promise.all(feeds.map(async function(f){
    try{
      var d=await fetch(f.u).then(function(r){return r.json()});
      (d.items||[]).forEach(function(it){
        var t=String(it.title||'').trim();
        if(!t||/MYMEMORY/i.test(t)||hasCyr(t))return;
        all.push({title:t,link:it.link,date:it.pubDate,src:f.n,desc:(it.description||'').replace(/<[^>]+>/g,'').slice(0,120)});
      });
    }catch(e){}
  }));
  all.sort(function(a,b){return new Date(b.date)-new Date(a.date)});
  return all.slice(0,12);
}
async function gTr(text,to){
  if(!text||to==='en')return text;
  try{
    var r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='+encodeURIComponent(to)+'&dt=t&q='+encodeURIComponent(String(text).slice(0,400))).then(function(x){return x.json()});
    if(r&&r[0]){var o=r[0].map(function(x){return x[0]}).join('');if(o&&!/MYMEMORY/i.test(o))return o}
  }catch(e){}
  return text;
}
function paint(items,lang){
  var box=$('newsList');if(!box)return;
  box.setAttribute('data-fix-lang',lang);
  box.innerHTML=items.map(function(n){
    var d='';try{d=new Date(n.date).toLocaleString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
    return '<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener">'+n.title+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div>'+(n.desc?'<div class="muted" style="margin-top:.15rem;font-size:.75rem">'+n.desc+'\u2026</div>':'')+'</div>';
  }).join('')||'<div class="empty">\u2014</div>';
}
async function loadNews(force){
  var box=$('newsList');if(!box||(busy&&!force))return;
  var lang=getLang(),my=++stamp;busy=true;
  box.innerHTML='<div class="empty">'+(lang==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026':'Loading\u2026')+'</div>';
  try{
    try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&/news/i.test(k))localStorage.removeItem(k)}}catch(e){}
    if(!enCache||force||Date.now()-enAt>240000){enCache=await fetchEN();enAt=Date.now()}
    if(my!==stamp){busy=false;return}
    var items=enCache.map(function(x){return{title:x.title,link:x.link,date:x.date,src:x.src,desc:x.desc}});
    if(lang==='ru'){
      for(var j=0;j<items.length;j++){if(my!==stamp){busy=false;return}items[j].title=await gTr(items[j].title,'ru');if(items[j].desc)items[j].desc=await gTr(items[j].desc,'ru')}
    }
    if(my!==stamp||getLang()!==lang){busy=false;return}
    paint(items,lang);
  }catch(e){box.innerHTML='<div class="empty">Error</div>'}
  busy=false;
}

setInterval(function(){
  var box=$('newsList');if(!box)return;
  var html=box.innerHTML||'',lang=getLang();
  if(/MYMEMORY/i.test(html)){enCache=null;loadNews(true);return}
  if(lang==='en'&&hasCyr(html)&&html.indexOf('Loading')<0){
    if(enCache&&enCache.length)paint(enCache.map(function(x){return{title:x.title,link:x.link,date:x.date,src:x.src,desc:x.desc}}),'en');
    else loadNews(true);
  }
},600);

var ls=$('langSel');
if(ls){
  ls.addEventListener('change',function(){
    localStorage.setItem('ct_lang',ls.value);
    stamp++;busy=false;loadNews(true);
  });
}
document.querySelectorAll('.nav-btn').forEach(function(b){
  b.addEventListener('click',function(){
    if(b.getAttribute('data-p')==='news')setTimeout(function(){loadNews(false)},80);
    if(b.getAttribute('data-p')==='tools')setTimeout(loadGas,100);
  });
});

async function loadGas(){
  var box=$('gasBox');if(!box)return;
  box.innerHTML='<div class="muted">Loading gas\u2026</div>';
  var rows=[];
  try{
    var eth=await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function(r){return r.json()});
    if(eth&&eth.result&&eth.result.ProposeGasPrice)
      rows.push({c:'Ethereum',l:eth.result.SafeGasPrice,a:eth.result.ProposeGasPrice,h:eth.result.FastGasPrice,u:'gwei'});
  }catch(e){}
  try{
    var poly=await fetch('https://gasstation.polygon.technology/v2').then(function(r){return r.json()});
    if(poly&&poly.standard)
      rows.push({c:'Polygon',l:Math.round(poly.safeLow&&poly.safeLow.maxFee||30),a:Math.round(poly.standard.maxFee||50),h:Math.round(poly.fast&&poly.fast.maxFee||80),u:'gwei'});
  }catch(e){}
  try{
    var bsc=await fetch('https://api.bscscan.com/api?module=gastracker&action=gasoracle').then(function(r){return r.json()});
    if(bsc&&bsc.result&&bsc.result.ProposeGasPrice)
      rows.push({c:'BNB Chain',l:bsc.result.SafeGasPrice,a:bsc.result.ProposeGasPrice,h:bsc.result.FastGasPrice,u:'gwei'});
  }catch(e){}
  rows.push({c:'Arbitrum',l:'0.01',a:'0.1',h:'0.3',u:'gwei'});
  rows.push({c:'Optimism',l:'0.001',a:'0.01',h:'0.05',u:'gwei'});
  rows.push({c:'Base',l:'0.001',a:'0.01',h:'0.05',u:'gwei'});
  rows.push({c:'Solana',l:'~0.00001',a:'~0.00005',h:'~0.0002',u:'SOL'});
  box.innerHTML='<div style="font-size:.68rem;color:var(--muted);margin-bottom:.35rem">Low / Avg / Fast</div>'+
    rows.map(function(r){return '<div style="display:flex;justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.8rem"><b>'+r.c+'</b><span>'+r.l+' / <b style="color:var(--accent2)">'+r.a+'</b> / '+r.h+' <span style="color:var(--muted)">'+r.u+'</span></span></div>'}).join('');
}

setInterval(function(){var b=$('refBtn');if(b)b.click()},40000);

document.addEventListener('click',function(e){
  var row=e.target.closest('.trend-row');if(!row)return;
  setTimeout(function(){
    var tv=$('tv');if(!tv)return;
    setTimeout(function(){
      if(tv.innerText&&tv.innerText.indexOf("doesn't exist")>=0){
        var sym=(row.querySelector('.muted')||{}).textContent||'';
        tv.innerHTML='<div class="empty">No Binance chart for '+sym+'. Price is shown above.</div>';
      }
    },2500);
  },500);
},true);

setTimeout(function(){loadNews(true)},600);
setTimeout(function(){loadNews(true)},1800);
setTimeout(loadGas,1000);
})();
