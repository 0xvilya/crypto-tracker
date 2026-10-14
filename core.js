(function(){
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  var REFRESH_INTERVAL = 8000;
  var PRICE_REFS = { usd: '$', eur: '€', rub: '₽', pln: 'zł' };
  var REQUEST_SEQ = 0;

  window.PRICES = window.PRICES || {};
  window.prices = window.prices || {};
  window.cur = window.cur || (localStorage.getItem('ct_cur') || 'usd');

  function normalizeCurrency(value){
    var cur = String(value || 'usd').toLowerCase();
    return (cur === 'usd' || cur === 'eur' || cur === 'rub' || cur === 'pln') ? cur : 'usd';
  }

  function getCurSel(){
    var s = document.getElementById('curSel');
    var cur = (s && s.value) ? s.value : (localStorage.getItem('ct_cur') || 'usd');
    return normalizeCurrency(cur);
  }

  function setCurSel(v){
    var cur = normalizeCurrency(v);
    try { localStorage.setItem('ct_cur', cur); } catch (e) {}
    var s = document.getElementById('curSel'); if (s) s.value = cur;
    window.cur = cur;
    document.dispatchEvent(new CustomEvent('ct:currency-change', { detail: { currency: cur } }));
  }

  function formatMoney(value, cur){
    if (value === null || value === undefined || isNaN(Number(value))) return '—';
    var safeCur = normalizeCurrency(cur || window.cur || getCurSel());
    var num = Number(value);
    var maxDigits = (Math.abs(num) >= 1) ? 2 : 4;
    return (PRICE_REFS[safeCur] || '$') + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
  }

  function setLegacyData(id, info, cur){
    if (!id || !info) return;
    window.prices[id] = window.prices[id] || {};
    window.prices[id][cur] = info.current_price;
    if (info.price_change_percentage_24h != null) {
      window.prices[id][cur + '_24h_change'] = info.price_change_percentage_24h;
    }
  }

  async function refreshPrices(){
    var cur = getCurSel();
    window.cur = cur;
    var chips = Array.from(document.querySelectorAll('.mh-chip')).map(function(b){ return b.getAttribute('data-id'); }).filter(Boolean);
    var defaults = ['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','toncoin','tron','avalanche-2','chainlink','polkadot','polygon','litecoin'];
    var ids = Array.from(new Set(chips.concat(defaults))).slice(0, 90);
    if (!ids.length) return [];

    var seq = ++REQUEST_SEQ;
    var url = API + '/coins/markets?vs_currency=' + encodeURIComponent(cur) + '&ids=' + encodeURIComponent(ids.join(',')) + '&price_change_percentage=24h';
    try {
      var res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('status ' + res.status);
      var list = await res.json();
      if (seq !== REQUEST_SEQ) return [];
      list.forEach(function(item){
        if (!item || !item.id) return;
        window.PRICES[item.id] = item;
        window.PRICES[item.id].__cur = cur;
        setLegacyData(item.id, item, cur);
      });

      // Update watchlist prices for current currency
      document.querySelectorAll('#wBody tr[data-id]').forEach(function(tr){
        var id = tr.getAttribute('data-id');
        var entry = (window.prices[id] && window.prices[id][cur] != null) ? window.prices[id][cur] : (window.PRICES[id] && window.PRICES[id].current_price != null ? window.PRICES[id].current_price : null);
        if (entry != null) {
          var priceEl = tr.querySelector('td:nth-child(3)');
          if (priceEl) {
            var prefix = PRICE_REFS[cur] || '$';
            priceEl.textContent = prefix + Number(entry).toLocaleString('en-US', { maximumFractionDigits: 2 });
            priceEl.dataset.updated = Date.now();
          }
        }
      });

      if (typeof window.refreshPriceUI === 'function') {
        try { window.refreshPriceUI(); } catch (e) {}
      }
      if (typeof enhanceTrending === 'function') {
        try { enhanceTrending(); } catch (e) {}
      }
      if (typeof renderPort === 'function') {
        try { renderPort(); } catch (e) {}
      }
      if (typeof initConv === 'function') {
        try { initConv(); } catch (e) {}
      }
      return list;
    } catch (e) {
      console.warn('refreshPrices failed', e);
      return [];
    }
  }

  function updatePriceFromWS(id, price){
    if (!id || price == null || isNaN(Number(price))) return;
    var cur = getCurSel();
    // Binance WS provides USD (USDT) prices. Store as current_price and mark __cur = 'usd'
    window.PRICES[id] = window.PRICES[id] || {};
    window.PRICES[id].current_price = Number(price);
    window.PRICES[id].__cur = 'usd';
    window.PRICES[id].last_update = Date.now();
    // legacy store
    window.prices[id] = window.prices[id] || {};
    window.prices[id]['usd'] = Number(price);
    // update watchlist DOM if user is viewing USD
    try{
      var priceEl = document.querySelector('#wBody tr[data-id="'+id+'"] td:nth-child(3)');
      if (priceEl && getCurSel()==='usd'){
        priceEl.textContent = (PRICE_REFS['usd']||'$') + Number(price).toLocaleString('en-US',{maximumFractionDigits:2});
        priceEl.dataset.updated = Date.now();
      }
    }catch(e){}
    // notify listeners
    document.dispatchEvent(new CustomEvent('ct:price-update',{detail:{id:id,price:Number(price),source:'ws'}}));
    // light-weight port refresh
    try{ if (typeof renderPort === 'function') renderPort(); } catch(e){}
  }

  function getPrice(id, cur){
    cur = normalizeCurrency(cur || getCurSel());
    if (window.PRICES[id] && window.PRICES[id].current_price != null && window.PRICES[id].__cur === cur) {
      return Promise.resolve(window.PRICES[id].current_price);
    }
    return fetch(API + '/simple/price?ids=' + encodeURIComponent(id) + '&vs_currencies=' + encodeURIComponent(cur) + '&include_24hr_change=true', { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
      .then(function(data){
        var val = data && data[id] ? data[id][cur] : null;
        if (val != null) {
          window.PRICES[id] = window.PRICES[id] || {};
          window.PRICES[id].current_price = val;
          window.PRICES[id].__cur = cur;
          setLegacyData(id, { current_price: val, price_change_percentage_24h: data[id] && data[id][cur+'_24h_change'] }, cur);
        }
        return val;
      })
      .catch(function(err){
        console.warn('getPrice failed', err);
        return null;
      });
  }

  function bindSelector(){
    var curSel = document.getElementById('curSel');
    if (!curSel) return;
    try {
      var saved = localStorage.getItem('ct_cur');
      if (saved) curSel.value = normalizeCurrency(saved);
    } catch (e) {}
    curSel.value = normalizeCurrency(curSel.value || window.cur || 'usd');
    curSel.addEventListener('change', function(){
      var value = normalizeCurrency(curSel.value);
      setCurSel(value);
      // immediate UI refresh using already available data
      document.querySelectorAll('#wBody tr[data-id]').forEach(function(tr){
        var id = tr.getAttribute('data-id');
        var entry = (window.prices[id] && window.prices[id][value] != null) ? window.prices[id][value] : (window.PRICES[id] && window.PRICES[id].current_price != null && window.PRICES[id].__cur===value ? window.PRICES[id].current_price : null);
        var priceEl = tr.querySelector('td:nth-child(3)');
        if (priceEl){
          if (entry!=null){ priceEl.textContent = (PRICE_REFS[value]||'$') + Number(entry).toLocaleString('en-US',{maximumFractionDigits:2}); }
          else { priceEl.textContent = '—'; }
        }
      });
      // request fresh prices in background
      refreshPrices();
      try { if (typeof toast === 'function') toast('Currency: ' + value.toUpperCase()); } catch (e) {}
    });
  }

  function ensurePolygonSymbols(){
    if (!window.SYM) window.SYM = {};
    window.SYM.polygon = 'POL';
    window.SYM['matic-network'] = 'POL';
    window.SYM['polygon-pos'] = 'POL';
  }

  function startPolling(){
    if (window.__ctPollTimer) return;
    refreshPrices();
    window.__ctPollTimer = setInterval(refreshPrices, REFRESH_INTERVAL);
  }

  window.CryptoTrackerCore = {
    API: API,
    getCur: getCurSel,
    setCur: setCurSel,
    formatMoney: formatMoney,
    getPrice: getPrice,
    refreshPrices: refreshPrices,
    startPolling: startPolling,
    ensurePolygonSymbols: ensurePolygonSymbols,
    updatePriceFromWS: updatePriceFromWS
  };
  window.getCryptoPrice = getPrice;
  window.getCurrency = getCurSel;
  window.setCurrency = setCurSel;
  window.formatCryptoMoney = formatMoney;
  window.ensurePolygonSymbols = ensurePolygonSymbols;

  ensurePolygonSymbols();
  bindSelector();
  startPolling();
})();
