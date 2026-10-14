/* v105: CoinGecko search for any coin + add to watchlist */
(function(){
  function $(id){ return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      var q=$('q'), sr=$('sr');
      if(!q||!sr) return;
      var timer=null;
      q.addEventListener('input', function(){
        clearTimeout(timer);
        var v=(q.value||'').trim();
        if(v.length<2) return;
        timer=setTimeout(async function(){
          try{
            var d=await fetch('https://api.coingecko.com/api/v3/search?query='+encodeURIComponent(v)).then(function(r){return r.json()});
            var coins=(d.coins||[]).slice(0,12);
            if(!coins.length) return;
            sr.style.display='block';
            sr.innerHTML=coins.map(function(c){
              return '<div class="sr-item" data-cg="'+c.id+'" data-sym="'+(c.symbol||'').toUpperCase()+'" data-name="'+c.name+'" data-thumb="'+(c.thumb||'')+'">'+(c.thumb?'<img class="cicon" src="'+c.thumb+'" width="20" height="20"/>':'')+'<b>'+(c.symbol||'').toUpperCase()+'</b> <span class="muted">'+c.name+'</span></div>';
            }).join('');
            sr.querySelectorAll('[data-cg]').forEach(function(el){
              el.onclick=function(){
                var id=el.getAttribute('data-cg');
                var wl=[];
                try{ wl=JSON.parse(localStorage.getItem('ct_wl')||'[]'); }catch(e){}
                if(wl.indexOf(id)<0){ wl.push(id); localStorage.setItem('ct_wl', JSON.stringify(wl)); }
                var custom=[];
                try{ custom=JSON.parse(localStorage.getItem('ct_custom')||'[]'); }catch(e){}
                custom=custom.filter(function(x){return x.id!==id});
                custom.push({id:id,sym:el.getAttribute('data-sym'),name:el.getAttribute('data-name'),thumb:el.getAttribute('data-thumb')});
                localStorage.setItem('ct_custom', JSON.stringify(custom));
                q.value=''; sr.style.display='none';
                location.reload();
              };
            });
          }catch(e){}
        }, 450);
      });
    }, 1200);
  });
})();
