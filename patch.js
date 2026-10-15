/* v107 patch: news + gas native + staking period */
(function(){
  function $(id){return document.getElementById(id)}
  function lang(){var s=$('langSel');return (s&&s.value)||localStorage.getItem('ct_lang')||'ru'}
  function cur(){return (localStorage.getItem('ct_cur')||'usd').toLowerCase()}
  function money(v){
    if(v==null||isNaN(v))return '\u2014';
    var c=cur(),s=c==='eur'?'\u20ac':c==='rub'?'\u20bd':c==='pln'?'z\u0142':'$';
    var n=+v;
    if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});
    if(Math.abs(n)>=1)return s+n.toFixed(4);
    return s+n.toFixed(6);
  }

  async function loadNewsFixed(force){
    var box=$('newsList');if(!box)return;
    box.innerHTML='<div class="empty">\u2026</div>';
    try{
      var feeds=[
        {n:'Cointelegraph',u:'https://feed2json.org/convert?url='+encodeURIComponent('https://cointelegraph.com/rss')},
        {n:'CoinDesk',u:'https://feed2json.org/convert?url='+encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')},
        {n:'Decrypt',u:'https://feed2json.org/convert?url='+encodeURIComponent('https://decrypt.co/feed')}
      ];
      var all=[];
      await Promise.all(feeds.map(async function(f){
        try{
          var d=await fetch(f.u).then(function(r){return r.json()});
          (d.items||[]).forEach(function(it){
            var t=String(it.title||'').trim();
            if(t)all.push({title:t,link:it.url||it.link||'#',date:it.date_published||it.published||'',src:f.n});
          });
        }catch(e){}
      }));
      if(!all.length){
        try{
          var gx=await fetch('https://feed2json.org/convert?url='+encodeURIComponent('https://news.google.com/rss/search?q=cryptocurrency+OR+bitcoin&hl=en-US&gl=US&ceid=US:en')).then(function(r){return r.json()});
          (gx.items||[]).forEach(function(it){
            var t=String(it.title||'').trim();
            if(t)all.push({title:t,link:it.url||'#',date:it.date_published||'',src:'Google'});
          });
        }catch(e){}
      }
      all.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0)});
      var L=lang(),html=[];
      for(var i=0;i<Math.min(all.length,20);i++){
        var n=all[i],title=n.title;
        if(L==='ru'){
          try{
            var tr=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(title.slice(0,350))+'&langpair=en|ru').then(function(r){return r.json()});
            var out=tr&&tr.responseData&&tr.responseData.translatedText;
            if(out&&out.indexOf('MYMEMORY')===-1)title=out;
          }catch(e){}
        }
        var d='';try{d=new Date(n.date).toLocaleString(L==='ru'?'ru-RU':'en-US',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){}
        html.push('<div class="news-item"><a href="'+n.link+'" target="_blank" rel="noopener">'+title+'</a><div class="news-meta"><span class="news-src">'+n.src+'</span> '+d+'</div></div>');
      }
      box.innerHTML=html.join('')||'<div class="empty">\u2014</div>';
    }catch(e){box.innerHTML='<div class="empty">Error</div>'}
  }

  async function buildGasFixed(){
    var box=$('gasBox');if(!box)return;
    box.innerHTML='<div class="muted">\u2026</div>';
    var GL=21000;
    var chains=[
      {n:'Ethereum',u:'https://ethereum.publicnode.com',priceId:'ethereum',sym:'ETH'},
      {n:'BSC',u:'https://bsc-dataseed.binance.org',priceId:'binancecoin',sym:'BNB'},
      {n:'Polygon',u:'https://polygon-bor.publicnode.com',priceId:'matic-network',sym:'POL'},
      {n:'Arbitrum',u:'https://arbitrum-one.publicnode.com',priceId:'ethereum',sym:'ETH'},
      {n:'Optimism',u:'https://optimism.publicnode.com',priceId:'ethereum',sym:'ETH'},
      {n:'Base',u:'https://base.publicnode.com',priceId:'ethereum',sym:'ETH'}
    ];
    var prices={};
    try{
      var ids=chains.map(function(c){return c.priceId}).filter(function(v,i,a){return a.indexOf(v)===i}).join(',');
      var t=await fetch('https://api.coingecko.com/api/v3/simple/price?ids='+ids+'&vs_currencies=usd').then(function(r){return r.json()});
      Object.keys(t||{}).forEach(function(k){if(t[k])prices[k]=t[k].usd});
    }catch(e){}
    var fx=1;
    try{
      var fxD=await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function(r){return r.json()});
      var c=cur();
      if(fxD&&fxD.rates){if(c==='eur')fx=fxD.rates.EUR;else if(c==='rub')fx=fxD.rates.RUB;else if(c==='pln')fx=fxD.rates.PLN;}
    }catch(e){}
    var rows=[];
    await Promise.all(chains.map(async function(ch){
      try{
        var res=await fetch(ch.u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_gasPrice',params:[]})}).then(function(r){return r.json()});
        if(res&&res.result){
          var gwei=parseInt(res.result,16)/1e9;
          var nativeAmt=(gwei*1e9*GL)/1e18;
          var usd=(nativeAmt*(prices[ch.priceId]||0))*fx;
          var amtStr=nativeAmt>=0.001?nativeAmt.toFixed(5):nativeAmt>=1e-6?nativeAmt.toFixed(7):nativeAmt.toExponential(2);
          var t=amtStr+' '+ch.sym;
          if(usd>0)t+=' \u2248 '+money(usd);
          rows.push({n:ch.n,t:t,o:ch.n==='Ethereum'?0:1});
        }
      }catch(e){}
    }));
    rows.sort(function(a,b){return a.o-b.o});
    box.innerHTML=rows.length?rows.map(function(r){return '<div class="hold-row"><b>'+r.n+'</b><span class="muted">'+r.t+'</span></div>'}).join(''):'<div class="muted">\u2014</div>';
  }

  function enhanceStaking(){
    var coin=$('stakeCoin'),apy=$('stakeApy'),amt=$('stakeAmt'),out=$('stakeOut');
    if(!coin||!out)return;
    if(!$('stakeDays')){
      var form=coin.closest('.form')||coin.parentElement;
      if(form){
        var d1=document.createElement('div');d1.className='field';
        d1.innerHTML='<label>\u0421\u0440\u043e\u043a (\u0434\u043d\u0435\u0439)</label><input type="number" id="stakeDays" value="365" min="1"/>';
        var d2=document.createElement('div');d2.className='field';
        d2.innerHTML='<label>\u0420\u0435\u0438\u043d\u0432\u0435\u0441\u0442</label><select id="stakeCompound"><option value="0">\u041d\u0435\u0442</option><option value="1">\u0414\u0430 (\u0435\u0436\u0435\u0434\u043d.)</option></select>';
        form.appendChild(d1);form.appendChild(d2);
      }
    }
    function calc(){
      var a=parseFloat((amt||{}).value)||0;
      var p=parseFloat((apy||{}).value)||0;
      var days=parseInt(($('stakeDays')||{}).value,10)||365;
      var compound=(($('stakeCompound')||{}).value)==='1';
      var final,profit;
      if(compound){final=a*Math.pow(1+p/100/365,days);profit=final-a;}
      else{profit=a*(p/100)*(days/365);final=a+profit;}
      out.textContent=money(final)+'  (+'+money(profit)+')';
      var hint=$('stakeHint');
      if(hint)hint.textContent=(lang()==='ru'?'\u0417\u0430 ':'For ')+days+(lang()==='ru'?' \u0434\u043d. \u00b7 APY ':' days \u00b7 APY ')+p+'%';
    }
    coin.addEventListener('change',function(){
      var map={ethereum:3.2,solana:6.8,binancecoin:2.5,cardano:3.1,polkadot:12.5,'avalanche-2':5.4,tron:4.1,'matic-network':3.8,'the-open-network':3.5,toncoin:3.5};
      var id=coin.value;
      if(apy&&map[id]!=null)apy.value=map[id];
      calc();
    });
    ['stakeAmt','stakeApy','stakeDays','stakeCompound'].forEach(function(id){
      var el=$(id);if(el){el.addEventListener('input',calc);el.addEventListener('change',calc);}
    });
    calc();
  }

  function bootPatch(){
    document.querySelectorAll('.nav-btn').forEach(function(b){
      b.addEventListener('click',function(){
        var p=b.getAttribute('data-p');
        if(p==='news')setTimeout(function(){loadNewsFixed(true)},300);
        if(p==='tools'){setTimeout(buildGasFixed,400);setTimeout(enhanceStaking,500);}
      });
    });
    setTimeout(function(){
      if(document.getElementById('p-news')&&document.getElementById('p-news').classList.contains('on'))loadNewsFixed(true);
    },1500);
    setInterval(function(){
      var pn=document.getElementById('p-news');
      if(pn&&pn.classList.contains('on'))loadNewsFixed(false);
    },90000);
    setTimeout(enhanceStaking,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPatch);
  else bootPatch();
})();
