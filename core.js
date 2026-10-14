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

      document.querySelectorAll('#wBody tr[data-id]').forEach(function(tr){
        var id = tr.getAttribute('data-id');
        var entry = (window.prices[id] && window.prices[id][cur] != null) ? window.prices[id][cur] : (window.PRICES[id] && window.PRICES[id].current_price != null ? window.PRICES[id].current_price : null);
        if (entry != null) {
          var priceEl = tr.querySelector('td:nth-child(3)');
          if (priceEl) {
            var prefix = PRICE_REFS[cur] || '$';
            priceEl.textContent = prefix + Number(entry).toLocaleString('en-US', { maximumFractionDigits: 2 });
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
          setLegacyData(id, { current_price: val }, cur);
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
      refreshPrices();
      try {
        if (typeof toast === 'function') toast('Currency: ' + value.toUpperCase());
      } catch (e) {}
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
    ensurePolygonSymbols: ensurePolygonSymbols
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
