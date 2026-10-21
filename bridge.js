/* bridge.js v128 — wire CTData, currency, chart abort, status */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function cur() {
    var s = $('curSel');
    return (localStorage.getItem('ct_cur') || (s && s.value) || 'usd').toLowerCase();
  }

  function ensureStatusChip() {
    if ($('dataStatus')) return $('dataStatus');
    var bar = document.querySelector('.top-actions');
    if (!bar) return null;
    var el = document.createElement('span');
    el.id = 'dataStatus';
    el.className = 'chip';
    el.style.fontSize = '0.65rem';
    el.textContent = '\u2026';
    bar.insertBefore(el, bar.firstChild);
    return el;
  }

  async function refreshStatus() {
    var el = ensureStatusChip();
    if (!el || !window.CTData) return;
    try {
      var g = await window.CTData.fetchGlobal();
      window.CTData.paintStatus(el, g);
      if (g.mcap && $('mcapChip')) {
        var c = cur();
        $('mcapChip').textContent = 'Cap: ' + window.CTData.formatMoney(g.mcap, c).replace(/(\.[\d])\d+/, '$1');
      }
      if (g.btcDom != null && $('domChip')) {
        $('domChip').textContent = 'BTC: ' + (+g.btcDom).toFixed(1) + '%';
      }
    } catch (e) {
      if (el) el.textContent = 'offline';
    }
  }

  async function onCurrencyChange() {
    var s = $('curSel');
    if (s) localStorage.setItem('ct_cur', s.value);
    if (window.CTData) {
      await window.CTData.loadFx();
      window.CTData.invalidate('cg:');
    }
    try { if (typeof softRefresh === 'function') softRefresh(); } catch (e) {}
    if (window.__ct_paintStocks) window.__ct_paintStocks();
    if (window.__ct_loadStocks) window.__ct_loadStocks();
    refreshStatus();
  }

  var chartAbort = null;
  var chartSeq = 0;

  function wrapChartLoads() {
    if (window.__ct_chartWrapped) return;
    window.__ct_chartWrapped = true;
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var isChart = /klines|market_chart|ohlc/i.test(url);
      if (isChart) {
        chartSeq += 1;
        var mySeq = chartSeq;
        if (chartAbort) {
          try { chartAbort.abort(); } catch (e) {}
        }
        chartAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
        init = init || {};
        if (chartAbort) init.signal = chartAbort.signal;
        return origFetch.call(this, input, init).then(function (res) {
          return res;
        }).catch(function (err) {
          if (err && err.name === 'AbortError') {
            return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          throw err;
        });
      }
      return origFetch.call(this, input, init);
    };
  }

  function patchMoneyIfPossible() {
    if (!window.CTData || !window.CTData.formatMoney) return;
    window.__ct_money = function (usd) {
      return window.CTData.formatMoney(usd, cur());
    };
  }

  async function boostStockPrices() {
    return;
    if (!window.CTData || !window.CTData.cachedFetch) return;
    var need = ['DIS', 'CRM', 'ORCL', 'ADBE', 'UBER', 'AAPL', 'MSFT'];
    for (var i = 0; i < need.length; i++) {
      var sym = need[i];
      var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1d&range=5d';
      try {
        var r = await window.CTData.cachedFetch('yahoo:' + sym, 'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl), {
          ttl: 20000,
          timeout: 8000
        });
        var d = r.data;
        if (typeof d === 'string') d = JSON.parse(d);
        if (d && d.chart && d.chart.result && d.chart.result[0]) {
          var m = d.chart.result[0].meta;
          var p = m.regularMarketPrice;
          var prev = m.chartPreviousClose || m.previousClose || p;
          try {
            var cache = JSON.parse(localStorage.getItem('ct_stocks_v2') || '{}');
            cache[sym] = {
              price: +p,
              ch: prev ? ((p - prev) / prev * 100) : 0,
              name: m.shortName || sym,
              at: Date.now()
            };
            localStorage.setItem('ct_stocks_v2', JSON.stringify(cache));
          } catch (e) {}
        }
      } catch (e) {}
    }
    if (window.__ct_paintStocks) window.__ct_paintStocks();
  }

  function boot() {
    wrapChartLoads();
    patchMoneyIfPossible();
    ensureStatusChip();

    if (window.CTData) {
      window.CTData.loadFx().then(function () {
        refreshStatus();
        patchMoneyIfPossible();
      });
    }

    var curSel = $('curSel');
    if (curSel && !curSel.__ctBridge) {
      curSel.__ctBridge = true;
      curSel.addEventListener('change', function () { onCurrencyChange(); });
    }

    setInterval(refreshStatus, 45000);
    setTimeout(boostStockPrices, 2500);
    setInterval(boostStockPrices, 60000);

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(boostStockPrices, 300);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 600); });
  } else {
    setTimeout(boot, 600);
  }
})();
