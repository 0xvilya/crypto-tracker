(function(){
  function $(id){return document.getElementById(id);}
  function getLang(){var s=$('langSel');return (s&&s.value)?s.value:(localStorage.getItem('ct_lang')||'en');}
  async function loadNews(){
    var box=$('newsList');if(!box)return;
    var lang=getLang();
    box.innerHTML='<div class="empty">'+(lang==='ru'?'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026':'Loading\u2026')+'</div>';
    try{
      var feeds=[
        'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://cointelegraph.com/rss'),
        'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')
      ];
      var names=['Cointelegraph','CoinDesk'],all=[];
      for(var i=0;i<feeds.length;i++){
        try{
          var d=await fetch(feeds[i]).then(function(r){return r.json();});
          (d.items||[]).forEach(function(it){
            var t=String(it.title||'').trim();
            if(!t||/MYMEMORY/i.test(t))return;
            all.push({title:t,link:it.link,date:it.pubDate,src:names[i],desc:(it.description||'').replace(/<[^>]+>/g,'').slice(0,120)});
          });
        }catch(e){}
      }
      all.sort(function(a,b){return new Date(b.date)-new Date(a.date);});
      all=all.slice(0,12);
      if(lang==='ru'){
        for(var j=0;j<all.length;j++){
          try{
            var url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q='+encodeURIComponent(all[j].title.slice(0,350));
            var r=await fetch(url).then(function(x){return x.json();});
            if(r&&r[0]){var o=r[0].map(function(x){return x[0];}).join('');if(o&&!/MYMEMORY/i.test(o))all[j].title=o;}
          }catch(e){}
        }
      }
      box.innerHTML=all.map(function(n){
        var d='';try{d=new Date(n.date).toLocaleString(lang==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){}
        return '<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener">'+n.title+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>';
      }).join('')||'<div class="empty">\u2014</div>';
    }catch(e){box.innerHTML='<div class="empty">Error</div>';}
  }
  setInterval(function(){
    var box=$('newsList');if(!box)return;
    if(/MYMEMORY|YOU USED ALL AVAILABLE/i.test(box.innerHTML||'')){
      try{for(var i=localStorage.length-1;i>=0;i--){var k=localStorage.key(i);if(k&&/news/i.test(k))localStorage.removeItem(k);}}catch(e){}
      loadNews();
    }
  },1000);
  var ls=$('langSel');if(ls)ls.addEventListener('change',function(){localStorage.setItem('ct_lang',ls.value);loadNews();});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.addEventListener('click',function(){if(b.getAttribute('data-p')==='news')setTimeout(loadNews,100);});});
  setTimeout(loadNews,800);
  setTimeout(async function(){
    var chip=$('fgChip');if(!chip)return;
    try{var d=await fetch('https://api.alternative.me/fng/?limit=1').then(function(r){return r.json();});
      var v=d&&d.data&&d.data[0];if(!v)return;var n=+v.value;
      var col=n<=25?'#ef4444':n<=45?'#f59e0b':n<=55?'#eab308':n<=75?'#84cc16':'#22c55e';
      chip.innerHTML='FG: <b style="color:'+col+'">'+n+'</b>';
    }catch(e){}
  },500);
  setTimeout(async function(){
    var from=$('convFrom'),to=$('convTo'),amt=$('convAmt'),out=$('convOut');if(!from||!to)return;
    var coins=[['bitcoin','BTC'],['ethereum','ETH'],['solana','SOL'],['binancecoin','BNB'],['ripple','XRP'],['dogecoin','DOGE'],['toncoin','TON']];
    var prices={};
    try{var ids=coins.map(function(c){return c[0];}).join(',');
      var d=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=usd').then(function(r){return r.json();});
      coins.forEach(function(c){if(d[c[0]])prices[c[0]]=d[c[0]].usd;});
    }catch(e){}
    from.innerHTML=coins.map(function(c){return '<option value="'+c[0]+'">'+c[1]+'</option>';}).join('');
    to.innerHTML=from.innerHTML+'<option value="usd">USD</option>';
    function go(){var a=parseFloat((amt&&amt.value)||0)||0,fp=prices[from.value]||0,tid=to.value;
      if(!fp||!out){if(out)out.textContent='\u2014';return;}
      if(tid==='usd')out.textContent='$'+(a*fp).toLocaleString('en-US',{maximumFractionDigits:2});
      else{var tp=prices[tid]||0;if(!tp){out.textContent='\u2014';return;}
        var ts=(coins.find(function(c){return c[0]===tid;})||[])[1]||tid;
        out.textContent=((a*fp)/tp).toLocaleString('en-US',{maximumFractionDigits:8})+' '+ts;}}
    if(amt)amt.oninput=go;from.onchange=go;to.onchange=go;go();
  },700);
  setTimeout(function(){
    if($('legalBar'))return;
    var bar=document.createElement('div');bar.id='legalBar';
    bar.style.cssText='text-align:center;padding:1rem .8rem 5rem;font-size:.75rem;color:var(--muted)';
    bar.innerHTML='<a href="#" id="aboutLink" style="color:var(--accent);margin:0 .5rem">About</a>\u00b7<a href="#" id="privacyLink" style="color:var(--accent);margin:0 .5rem">Privacy</a>';
    (document.querySelector('.wrap')||document.body).appendChild(bar);
    var modal=document.createElement('div');modal.id='legalModal';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.6);align-items:flex-end;justify-content:center';
    modal.innerHTML='<div style="background:var(--card,#12121a);border-radius:16px 16px 0 0;padding:1.2rem;width:100%;max-width:520px;max-height:70vh;overflow:auto;border:1px solid var(--border)"><div style="display:flex;justify-content:space-between;margin-bottom:.7rem"><h2 id="legalTitle" style="margin:0;font-size:1.05rem"></h2><button type="button" id="legalClose" class="btn-ghost">\u00d7</button></div><div id="legalBody" style="font-size:.88rem;line-height:1.5;color:var(--muted)"></div></div>';
    document.body.appendChild(modal);
    function open(t,h){$('legalTitle').textContent=t;$('legalBody').innerHTML=h;modal.style.display='flex';}
    $('aboutLink').onclick=function(e){e.preventDefault();open('About','<p><b>Crypto Tracker</b> \u2014 free crypto tracker.</p><p>Prices: CoinGecko. Charts: TradingView. News: Cointelegraph/CoinDesk.</p><p>Not financial advice.</p>');};
    $('privacyLink').onclick=function(e){e.preventDefault();open('Privacy','<p>We do not collect personal data. Portfolio is stored only in browser localStorage.</p>');};
    $('legalClose').onclick=function(){modal.style.display='none';};
    modal.onclick=function(e){if(e.target===modal)modal.style.display='none';};
  },500);
})();
