(function(){
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  var REFRESH_INTERVAL = 8000;
  window.PRICES = window.PRICES || {};
  window.prices = window.prices || {}; // backward-compatible alias used by old scripts
  window.cur = window.cur || (localStorage.getItem('ct_cur') || 'usd');

  function getCurSel(){
    var s = document.getElementById('curSel');
    return (s && s.value) ? s.value : (localStorage.getItem('ct_cur') || 'usd');
  }
  function setCurSel(v){
    try{ localStorage.setItem('ct_cur', v); }catch(e){}
    var s = document.getElementById('curSel'); if(s) s.value = v;
    window.cur = v; // keep global compatibility
  }

  async function refreshPrices(){
    var cur = getCurSel();
    window.cur = cur;
    // collect known IDs from UI chips plus a safe default list
    var chips = Array.from(document.querySelectorAll('.mh-chip')).map(function(b){return b.getAttribute('data-id')}).filter(Boolean);
    var defaults = ['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','toncoin','tron','avalanche-2','chainlink','polkadot','polygon','litecoin'];
    var ids = Array.from(new Set(chips.concat(defaults))).slice(0,90);
    if(!ids.length) return;
    var url = API + '/coins/markets?vs_currency=' + encodeURIComponent(cur) + '&ids=' + encodeURIComponent(ids.join(',')) + '&price_change_percentage=24h';
    try{
      var res = await fetch(url);
      if(!res.ok) throw new Error('status '+res.status);
      var list = await res.json();
      list.forEach(function(c){
        // full object for new code
        window.PRICES[c.id] = c; window.PRICES[c.id].__cur = cur;
        // backward-compatible simple map used by older scripts
        window.prices[c.id] = window.prices[c.id] || {};
        window.prices[c.id][cur] = c.current_price;
        try{ window.prices[c.id][cur + '_24h_change'] = c.price_change_percentage_24h; }catch(e){}
      });
      // best-effort updates to existing UI parts (functions may be defined in other scripts)
      if(typeof enhanceTrending === 'function') try{ enhanceTrending(); }catch(e){}
      if(typeof renderPort === 'function') try{ renderPort(); }catch(e){}
      if(typeof initConv === 'function') try{ initConv(); }catch(e){}
      // update watchlist prices directly
      document.querySelectorAll('#wBody tr[data-id]').forEach(function(tr){
        var id = tr.getAttribute('data-id');
        var priceVal = (window.prices && window.prices[id] && window.prices[id][cur] != null) ? window.prices[id][cur] : (window.PRICES[id] && window.PRICES[id].current_price != null ? window.PRICES[id].current_price : null);
        if(priceVal != null){
          var curSign = (cur==='eur' ? '€' : cur==='rub' ? '₽' : cur==='pln' ? 'zł' : '$');
          var priceEl = tr.querySelector('td:nth-child(3)');
          if(priceEl) priceEl.textContent = curSign + Number(priceVal).toLocaleString('en-US',{maximumFractionDigits:2});
        }
      });
    }catch(e){
      console.error('refreshPrices error', e);
    }
  }

  // expose helper used by other modules if they want single-price fetch
  window.getCryptoPrice = function(id, cur){
    cur = cur || getCurSel();
    if(window.PRICES && window.PRICES[id] && window.PRICES[id].current_price != null && window.PRICES[id].__cur === cur){
      return Promise.resolve(window.PRICES[id].current_price);
    }
    return fetch(API + '/simple/price?ids=' + encodeURIComponent(id) + '&vs_currencies=' + encodeURIComponent(cur) + '&include_24hr_change=true')
      .then(function(r){ if(!r.ok) throw new Error('status '+r.status); return r.json(); })
      .then(function(j){
        var v = (j && j[id] && j[id][cur]) ? j[id][cur] : null;
        if(v!=null){
          window.PRICES[id] = window.PRICES[id] || {}; window.PRICES[id].current_price = v; window.PRICES[id].__cur = cur;
          window.prices[id] = window.prices[id] || {}; window.prices[id][cur] = v;
        }
        return v;
      }).catch(function(e){ console.warn('getCryptoPrice failed', e); return null; });
  };

  // ensure polygon mapping is up-to-date if SYM exists
  try{ if(window.SYM) window.SYM['polygon'] = 'POL'; }catch(e){}

  // start polling
  setTimeout(refreshPrices, 500);
  setInterval(refreshPrices, REFRESH_INTERVAL);

  // currency selector
  var curSel = document.getElementById('curSel');
  if(curSel){
    // initialize from localStorage
    try{ var saved = localStorage.getItem('ct_cur'); if(saved) curSel.value = saved; }catch(e){}
    curSel.addEventListener('change', function(){ setCurSel(curSel.value); refreshPrices(); try{ if(typeof toast === 'function') toast('Currency: '+curSel.value.toUpperCase()); }catch(e){} });
  }
})();
