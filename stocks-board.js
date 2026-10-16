/* stocks-board v140 — offline-first, no lag, full seeds, digit-only */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var d = {
      ru: { ticker: '\u0422\u0438\u043a\u0435\u0440', price: '\u0426\u0435\u043d\u0430', ch24: '24H', div: '\u0414\u0438\u0432.%', search: '\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u0446\u0438\u0438\u2026' },
      en: { ticker: 'Ticker', price: 'Price', ch24: '24H', div: 'Div%', search: 'Search stock\u2026' }
    };
    return (d[lang()] || d.ru)[k] || k;
  }

  var BOARD = [
    {s:'AAPL',n:'Apple',p:342.00,c:-0.28,d:0.43},
    {s:'MSFT',n:'Microsoft',p:539.44,c:3.22,d:0.72},
    {s:'GOOGL',n:'Alphabet',p:349.22,c:0.27,d:0.32},
    {s:'AMZN',n:'Amazon',p:254.76,c:0.28,d:0},
    {s:'NVDA',n:'NVIDIA',p:217.23,c:1.15,d:0.03},
    {s:'TSLA',n:'Tesla',p:362.44,c:0.85,d:0},
    {s:'META',n:'Meta',p:736.72,c:2.20,d:0.32},
    {s:'AMD',n:'AMD',p:562.23,c:-9.42,d:0},
    {s:'NFLX',n:'Netflix',p:72.61,c:1.45,d:0},
    {s:'JPM',n:'JPMorgan',p:335.53,c:1.24,d:2.10},
    {s:'V',n:'Visa',p:399.75,c:6.57,d:0.70},
    {s:'MA',n:'Mastercard',p:616.32,c:7.23,d:0.55},
    {s:'BABA',n:'Alibaba',p:111.13,c:5.14,d:1.80},
    {s:'DIS',n:'Disney',p:110.68,c:3.42,d:0.80},
    {s:'CRM',n:'Salesforce',p:246.74,c:8.31,d:0},
    {s:'ORCL',n:'Oracle',p:134.47,c:-0.90,d:1.20},
    {s:'ADBE',n:'Adobe',p:251.67,c:4.41,d:0},
    {s:'INTC',n:'Intel',p:95.37,c:-10.94,d:1.50},
    {s:'PYPL',n:'PayPal',p:57.16,c:3.89,d:0},
    {s:'UBER',n:'Uber',p:78.40,c:1.20,d:0},
    {s:'COIN',n:'Coinbase',p:185.00,c:2.50,d:0},
    {s:'PLTR',n:'Palantir',p:42.50,c:1.80,d:0},
    {s:'KO',n:'Coca-Cola',p:92.00,c:4.82,d:2.90},
    {s:'PEP',n:'Pepsi',p:128.38,c:0.03,d:3.10},
    {s:'NKE',n:'Nike',p:37.14,c:6.91,d:1.50},
    {s:'BA',n:'Boeing',p:188.73,c:0.52,d:0},
    {s:'WMT',n:'Walmart',p:82.50,c:0.90,d:1.10},
    {s:'XOM',n:'Exxon',p:115.20,c:0.40,d:3.30},
    {s:'JNJ',n:'J&J',p:158.00,c:0.30,d:3.00},
    {s:'COST',n:'Costco',p:920.00,c:0.60,d:0.55}
  ];

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}

  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v6') || '{}'); } catch (e) {}

  BOARD.forEach(function (row) {
    if (!cache[row.s] || cache[row.s].price == null) {
      cache[row.s] = { price: row.p, ch: row.c, div: row.d, name: row.n, at: 0, seed: true };
    }
  });

  function cur() {
    return (localStorage.getItem('ct_cur') || ($('curSel') && $('curSel').value) || 'usd').toLowerCase();
  }
  var fx = 1, fxAt = 0;
  async function loadFx() {
    if (Date.now() - fxAt < 300000) return fx;
    var c = cur();
    if (c === 'usd') { fx = 1; fxAt = Date.now(); return 1; }
    try {
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(4000) });
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

  function parseChart(d) {
    if (!d) return null;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return null; } }
    if (d.contents) { try { d = JSON.parse(d.contents); } catch (e) { return null; } }
    var res = d.chart && d.chart.result && d.chart.result[0];
    if (!res || !res.meta) return null;
    var m = res.meta;
    var p = m.regularMarketPrice;
    var prev = m.chartPreviousClose || m.previousClose || p;
    if (p == null) return null;
    var divY = null;
    try {
      var divs = res.events && res.events.dividends;
      if (divs) {
        var yearAgo = Date.now() / 1000 - 365 * 86400;
        var sum = 0;
        Object.keys(divs).forEach(function (k) {
          var ev = divs[k];
          if (ev && ev.date >= yearAgo && ev.amount) sum += +ev.amount;
        });
        if (sum > 0 && p > 0) divY = (sum / p) * 100;
      }
    } catch (e) {}
    return { price: +p, ch: prev ? ((p - prev) / prev * 100) : 0, name: m.shortName || m.symbol, div: divY, at: Date.now(), seed: false };
  }

  async function fetchOne(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var urls = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 6000);
        var r = await fetch(urls[i], { signal: ctrl.signal });
        clearTimeout(to);
        if (!r.ok) continue;
        var txt = await r.text();
        var d; try { d = JSON.parse(txt); } catch (e) { continue; }
        var p = parseChart(d);
        if (p) return p;
      } catch (e) {}
    }
    return null;
  }

  var built = false;
  function buildOnce() {
    var body = $('stockBody');
    if (!body) return false;

    var thead = body.parentElement && body.parentElement.querySelector('thead tr');
    if (thead) {
      thead.innerHTML = '<th>#</th><th>' + t('ticker') + '</th><th>' + t('price') + '</th><th>' + t('ch24') + '</th><th class="th-div">' + t('div') + '</th>';
    }

    if (!built || !body.querySelector('.s-price')) {
      var list = BOARD.slice();
      EXTRA.forEach(function (s) {
        if (!list.some(function (r) { return r.s === s; })) {
          list.push({ s: s, n: s, p: null, c: 0, d: 0 });
        }
      });
      var html = '';
      list.forEach(function (row, idx) {
        html += '<tr class="s-tr" data-s="' + row.s + '">' +
          '<td class="s-rank">' + (idx + 1) + '</td>' +
          '<td><b>' + row.s + '</b> <span class="muted s-name">' + row.n + '</span></td>' +
          '<td class="s-price">\u2014</td><td class="s-ch">\u2014</td><td class="s-div">\u2014</td></tr>';
      });
      body.innerHTML = html;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        tr.onclick = function () {
          var s = tr.getAttribute('data-s');
          if (typeof window.openStock === 'function') try { window.openStock(s); } catch (e) {}
        };
      });
      built = true;
    }
    paintDigits();
    return true;
  }

  function paintDigits() {
    var body = $('stockBody');
    if (!body) return;
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      var s = tr.getAttribute('data-s');
      var d = cache[s];
      if (!d) return;
      var pe = tr.querySelector('.s-price');
      var ce = tr.querySelector('.s-ch');
      var de = tr.querySelector('.s-div');
      if (pe && d.price != null) {
        var mp = money(d.price);
        if (pe.textContent !== mp) pe.textContent = mp;
      }
      if (ce && d.ch != null) {
        var mc = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
        if (ce.textContent !== mc) {
          ce.textContent = mc;
          ce.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
        }
      }
      if (de) {
        var dy = (d.div != null && d.div > 0) ? d.div : 0;
        var ds = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
        if (de.textContent !== ds) de.textContent = ds;
      }
    });
  }

  var busy = false;
  async function backgroundUpdate() {
    if (busy) return;
    busy = true;
    await loadFx();
    var top = BOARD.slice(0, 12).map(function (r) { return r.s; });
    for (var i = 0; i < top.length; i++) {
      var s = top[i];
      var age = cache[s] && !cache[s].seed ? Date.now() - (cache[s].at || 0) : 1e12;
      if (age < 180000) continue;
      var res = await fetchOne(s);
      if (res) {
        var prev = cache[s] || {};
        if (res.div == null || res.div <= 0) res.div = prev.div || 0;
        cache[s] = res;
        var tr = document.querySelector('#stockBody tr[data-s="' + s + '"]');
        if (tr) {
          var pe = tr.querySelector('.s-price');
          var ce = tr.querySelector('.s-ch');
          var de = tr.querySelector('.s-div');
          if (pe) pe.textContent = money(res.price);
          if (ce) {
            ce.textContent = (res.ch >= 0 ? '+' : '') + (+res.ch).toFixed(2) + '%';
            ce.className = 's-ch ' + (res.ch > 0 ? 'up' : res.ch < 0 ? 'dn' : '');
          }
          if (de) {
            var dy = res.div > 0 ? res.div : 0;
            de.textContent = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
          }
        }
        try { localStorage.setItem('ct_stocks_v6', JSON.stringify(cache)); } catch (e) {}
      }
      await new Promise(function (r) { setTimeout(r, 200); });
    }
    busy = false;
  }

  function wireSearch() {
    var q = $('stockQ');
    if (!q) {
      var page = $('p-stocks');
      if (!page) return;
      var card = page.querySelector('.card');
      if (card) {
        q = document.createElement('input');
        q.type = 'search';
        q.id = 'stockQ';
        q.placeholder = t('search');
        q.autocomplete = 'off';
        q.style.cssText = 'width:100%;box-sizing:border-box;margin:0 0 .6rem;padding:.6rem .8rem;border-radius:12px;border:1px solid rgba(168,85,247,.28);background:rgba(0,0,0,.28);color:inherit;font-size:1rem';
        card.insertBefore(q, card.firstChild);
      }
    }
    if (!q || q.__v140) return;
    q.__v140 = true;
    q.placeholder = t('search');
    q.addEventListener('input', function () {
      var f = (q.value || '').toLowerCase().trim();
      document.querySelectorAll('#stockBody tr[data-s]').forEach(function (tr) {
        var s = (tr.getAttribute('data-s') || '').toLowerCase();
        var n = ((tr.querySelector('.s-name') || {}).textContent || '').toLowerCase();
        tr.style.display = (!f || s.indexOf(f) >= 0 || n.indexOf(f) >= 0) ? '' : 'none';
      });
    });
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var v = (q.value || '').trim().toUpperCase().replace(/[^A-Z.]/g, '');
      if (!v) return;
      if (EXTRA.indexOf(v) < 0 && !BOARD.some(function (r) { return r.s === v; })) {
        EXTRA.unshift(v);
        try { localStorage.setItem('ct_stock_extra', JSON.stringify(EXTRA)); } catch (e) {}
        built = false;
        buildOnce();
      }
      if (typeof window.openStock === 'function') try { window.openStock(v); } catch (e) {}
    });
  }

  function takeOver() {
    window.__ct_paintStocks = function () { paintDigits(); };
    window.__ct_loadStocks = function () {
      buildOnce();
      paintDigits();
      setTimeout(backgroundUpdate, 400);
    };
  }

  function watchWipe() {
    var body = $('stockBody');
    if (!body || body.__w140) return;
    body.__w140 = true;
    new MutationObserver(function () {
      if (!body.querySelector('.s-price')) {
        built = false;
        setTimeout(function () { buildOnce(); paintDigits(); }, 30);
      }
    }).observe(body, { childList: true });
  }

  function boot() {
    takeOver();
    buildOnce();
    paintDigits();
    wireSearch();
    watchWipe();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          takeOver();
          built = false;
          buildOnce();
          wireSearch();
          watchWipe();
          setTimeout(backgroundUpdate, 300);
        }, 150);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        backgroundUpdate();
      }
    }, true);

    var curSel = $('curSel');
    if (curSel && !curSel.__v140) {
      curSel.__v140 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(paintDigits);
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) backgroundUpdate();
    }, 120000);

    setTimeout(function () {
      takeOver();
      buildOnce();
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) backgroundUpdate();
    }, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
