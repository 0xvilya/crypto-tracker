/* stock-smooth v136 — in-place price updates, search add+chart, news date sort */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}

  var KNOWN = {
    AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', NVDA: 'NVIDIA',
    TSLA: 'Tesla', META: 'Meta', AMD: 'AMD', NFLX: 'Netflix', JPM: 'JPMorgan',
    V: 'Visa', MA: 'Mastercard', BABA: 'Alibaba', DIS: 'Disney', CRM: 'Salesforce',
    ORCL: 'Oracle', ADBE: 'Adobe', INTC: 'Intel', PYPL: 'PayPal', UBER: 'Uber',
    COIN: 'Coinbase', PLTR: 'Palantir', KO: 'Coca-Cola', PEP: 'Pepsi', NKE: 'Nike',
    BA: 'Boeing', WMT: 'Walmart', XOM: 'Exxon', JNJ: 'J&J', COST: 'Costco',
    SPY: 'S&P 500', QQQ: 'Nasdaq 100', IBM: 'IBM', QCOM: 'Qualcomm', AVGO: 'Broadcom',
    MU: 'Micron', SMCI: 'Super Micro', ARM: 'ARM', MSTR: 'MicroStrategy', HOOD: 'Robinhood'
  };

  function allTickers() {
    var base = Object.keys(KNOWN);
    EXTRA.forEach(function (s) { if (base.indexOf(s) < 0) base.push(s); });
    return base;
  }

  function cur() {
    return (localStorage.getItem('ct_cur') || ($('curSel') && $('curSel').value) || 'usd').toLowerCase();
  }
  var fx = 1, fxAt = 0;
  async function loadFx() {
    if (Date.now() - fxAt < 120000) return fx;
    var c = cur();
    if (c === 'usd') { fx = 1; fxAt = Date.now(); return 1; }
    try {
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
      var d = await r.json();
      fx = c === 'eur' ? (d.rates.EUR || 1) : c === 'rub' ? (d.rates.RUB || 1) : c === 'pln' ? (d.rates.PLN || 1) : 1;
      fxAt = Date.now();
    } catch (e) {}
    return fx;
  }
  function money(v) {
    if (v == null || isNaN(+v)) return '\u2014';
    var c = cur();
    var s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v * fx;
    return Math.abs(n) >= 1000 ? s + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : s + n.toFixed(2);
  }

  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v3') || '{}'); } catch (e) {}

  async function fetchOne(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var proxies = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < proxies.length; i++) {
      try {
        var r = await fetch(proxies[i], { signal: AbortSignal.timeout(6500) });
        if (!r.ok) continue;
        var d = await r.json();
        var res = d.chart && d.chart.result && d.chart.result[0];
        if (!res && d.contents) {
          try { d = JSON.parse(d.contents); res = d.chart && d.chart.result && d.chart.result[0]; } catch (e) {}
        }
        if (!res || !res.meta) continue;
        var m = res.meta;
        var p = m.regularMarketPrice;
        var prev = m.chartPreviousClose || m.previousClose || p;
        if (p == null) continue;
        return { price: +p, ch: prev ? ((p - prev) / prev * 100) : 0, name: m.shortName || KNOWN[sym] || sym, at: Date.now() };
      } catch (e) {}
    }
    return null;
  }

  function ensureRows() {
    var body = $('stockBody');
    if (!body) return null;
    var tickers = allTickers();
    var existing = {};
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      existing[tr.getAttribute('data-s')] = tr;
    });
    Object.keys(existing).forEach(function (s) {
      if (tickers.indexOf(s) < 0) existing[s].remove();
    });
    tickers.forEach(function (s, idx) {
      var tr = existing[s];
      if (!tr) {
        tr = document.createElement('tr');
        tr.className = 's-tr';
        tr.setAttribute('data-s', s);
        tr.innerHTML =
          '<td class="s-rank">' + (idx + 1) + '</td>' +
          '<td><b>' + s + '</b> <span class="muted s-name">' + (KNOWN[s] || s) + '</span></td>' +
          '<td class="s-price">\u2014</td>' +
          '<td class="s-ch">\u2014</td>';
        tr.onclick = function () { openChart(s); };
        body.appendChild(tr);
      } else {
        var rank = tr.querySelector('.s-rank');
        if (rank) rank.textContent = String(idx + 1);
      }
    });
    tickers.forEach(function (s) {
      var tr = body.querySelector('tr[data-s="' + s + '"]');
      if (tr) body.appendChild(tr);
    });
    return body;
  }

  function patchNumbers() {
    var body = $('stockBody');
    if (!body) return;
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      var s = tr.getAttribute('data-s');
      var d = cache[s];
      var priceEl = tr.querySelector('.s-price');
      var chEl = tr.querySelector('.s-ch');
      if (!priceEl || !chEl) return;
      if (d && d.price != null) {
        var nextP = money(d.price);
        if (priceEl.textContent !== nextP) priceEl.textContent = nextP;
        var nextC = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
        if (chEl.textContent !== nextC) {
          chEl.textContent = nextC;
          chEl.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
        }
        var nameEl = tr.querySelector('.s-name');
        if (nameEl && d.name && nameEl.textContent !== d.name) nameEl.textContent = d.name;
      }
    });
  }

  var loading = false;
  async function softRefresh(force) {
    if (loading && !force) return;
    loading = true;
    await loadFx();
    ensureRows();
    patchNumbers();
    var list = allTickers();
    for (var i = 0; i < list.length; i += 5) {
      var batch = list.slice(i, i + 5);
      await Promise.all(batch.map(async function (s) {
        var age = cache[s] ? Date.now() - (cache[s].at || 0) : 1e12;
        if (!force && age < 45000) return;
        var res = await fetchOne(s);
        if (res) {
          cache[s] = res;
          if (!KNOWN[s] && res.name) KNOWN[s] = res.name;
        }
      }));
      try { localStorage.setItem('ct_stocks_v3', JSON.stringify(cache)); } catch (e) {}
      patchNumbers();
      await new Promise(function (r) { setTimeout(r, 100); });
    }
    loading = false;
  }

  function addTicker(sym) {
    sym = (sym || '').toUpperCase().replace(/[^A-Z.]/g, '');
    if (!sym || sym.length < 1) return;
    if (EXTRA.indexOf(sym) < 0) {
      EXTRA.unshift(sym);
      try { localStorage.setItem('ct_stock_extra', JSON.stringify(EXTRA)); } catch (e) {}
    }
    ensureRows();
    softRefresh(true);
    openChart(sym);
  }

  function openChart(sym) {
    if (typeof window.openStock === 'function') {
      try { window.openStock(sym); return; } catch (e) {}
    }
    var det = $('stockDetail');
    if (det) {
      det.style.display = '';
      if ($('sdName')) $('sdName').textContent = KNOWN[sym] || sym;
      if ($('sdSym')) $('sdSym').textContent = sym;
      var d = cache[sym];
      if (d) {
        if ($('sdPrice')) $('sdPrice').textContent = money(d.price);
        if ($('sdCh')) {
          $('sdCh').textContent = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
          $('sdCh').className = d.ch >= 0 ? 'up' : 'dn';
        }
      }
      det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function wireSearch() {
    var q = $('stockQ');
    if (!q || q.__smooth) return;
    q.__smooth = true;
    q.setAttribute('placeholder', lang() === 'en' ? 'Search ticker or name\u2026' : '\u041f\u043e\u0438\u0441\u043a \u0442\u0438\u043a\u0435\u0440\u0430 \u0438\u043b\u0438 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f\u2026');
    q.addEventListener('input', function () {
      var f = (q.value || '').toLowerCase().trim();
      var body = $('stockBody');
      if (!body) return;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        var s = tr.getAttribute('data-s') || '';
        var n = (tr.querySelector('.s-name') || {}).textContent || '';
        var show = !f || s.toLowerCase().indexOf(f) >= 0 || n.toLowerCase().indexOf(f) >= 0;
        tr.style.display = show ? '' : 'none';
      });
    });
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var v = (q.value || '').trim().toUpperCase();
      if (!v) return;
      var body = $('stockBody');
      var hit = null;
      if (body) {
        body.querySelectorAll('tr[data-s]').forEach(function (tr) {
          if (tr.style.display === 'none') return;
          if (!hit) hit = tr.getAttribute('data-s');
          if (tr.getAttribute('data-s') === v) hit = v;
        });
      }
      if (KNOWN[v] || (cache[v] && cache[v].price) || hit === v) addTicker(v);
      else if (hit) openChart(hit);
      else addTicker(v);
    });
  }

  function installOverrides() {
    window.__ct_paintStocks = function () { ensureRows(); patchNumbers(); };
    window.__ct_loadStocks = function () { softRefresh(false); };
  }

  function boot() {
    installOverrides();
    wireSearch();
    ensureRows();
    patchNumbers();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () { wireSearch(); ensureRows(); softRefresh(false); }, 150);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        softRefresh(true);
      }
    }, true);

    var curSel = $('curSel');
    if (curSel && !curSel.__smooth) {
      curSel.__smooth = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(function () { patchNumbers(); });
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) softRefresh(false);
      if ($('p-news') && $('p-news').classList.contains('on') && window.__ct_loadNews) {
        window.__ct_loadNews(true);
      }
    }, 35000);

    setTimeout(function () {
      installOverrides();
      wireSearch();
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) softRefresh(false);
    }, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
