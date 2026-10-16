/* stock-smooth v137 — parallel proxy race, retry missing, no full repaint lag */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}

  var KNOWN = {
    AAPL:'Apple',MSFT:'Microsoft',GOOGL:'Alphabet',AMZN:'Amazon',NVDA:'NVIDIA',
    TSLA:'Tesla',META:'Meta',AMD:'AMD',NFLX:'Netflix',JPM:'JPMorgan',
    V:'Visa',MA:'Mastercard',BABA:'Alibaba',DIS:'Disney',CRM:'Salesforce',
    ORCL:'Oracle',ADBE:'Adobe',INTC:'Intel',PYPL:'PayPal',UBER:'Uber',
    COIN:'Coinbase',PLTR:'Palantir',KO:'Coca-Cola',PEP:'Pepsi',NKE:'Nike',
    BA:'Boeing',WMT:'Walmart',XOM:'Exxon',JNJ:'J&J',COST:'Costco',
    SPY:'S&P 500',QQQ:'Nasdaq 100',IBM:'IBM',QCOM:'Qualcomm',AVGO:'Broadcom'
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
    if (Date.now() - fxAt < 180000) return fx;
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

  function parseYahoo(d) {
    if (!d) return null;
    if (d.contents && typeof d.contents === 'string') {
      try { d = JSON.parse(d.contents); } catch (e) { return null; }
    }
    var res = d.chart && d.chart.result && d.chart.result[0];
    if (!res || !res.meta) return null;
    var m = res.meta;
    var p = m.regularMarketPrice;
    var prev = m.chartPreviousClose || m.previousClose || p;
    if (p == null) return null;
    return { price: +p, ch: prev ? ((p - prev) / prev * 100) : 0, name: m.shortName || m.symbol, at: Date.now() };
  }

  async function fetchOne(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var urls = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(yurl),
      'https://corsproxy.org/?' + encodeURIComponent(yurl)
    ];
    return await new Promise(function (resolve) {
      var done = false;
      var left = urls.length;
      urls.forEach(function (url) {
        fetch(url, { signal: AbortSignal.timeout(8000) })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) {
            if (done) return;
            var p = parseYahoo(d);
            if (p) { done = true; resolve(p); }
          })
          .catch(function () {})
          .finally(function () {
            left--;
            if (!done && left === 0) resolve(null);
          });
      });
    });
  }

  function ensureRows() {
    var body = $('stockBody');
    if (!body) return null;
    var tickers = allTickers();
    var sample = body.querySelector('tr[data-s]');
    if (sample && !sample.querySelector('.s-price')) body.innerHTML = '';
    var existing = {};
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      existing[tr.getAttribute('data-s')] = tr;
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
          '<td class="s-price">\u2014</td><td class="s-ch">\u2014</td>';
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
      if (!priceEl) {
        var tds = tr.querySelectorAll('td');
        if (tds.length >= 4) {
          tds[2].className = 's-price';
          tds[3].className = 's-ch';
          priceEl = tds[2];
          chEl = tds[3];
        }
      }
      if (!priceEl || !chEl || !d || d.price == null) return;
      var nextP = money(d.price);
      if (priceEl.textContent !== nextP) priceEl.textContent = nextP;
      var nextC = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
      if (chEl.textContent !== nextC) {
        chEl.textContent = nextC;
        chEl.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
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
    list.sort(function (a, b) {
      var am = !cache[a] || cache[a].price == null ? 0 : 1;
      var bm = !cache[b] || cache[b].price == null ? 0 : 1;
      return am - bm;
    });

    for (var i = 0; i < list.length; i += 3) {
      var batch = list.slice(i, i + 3);
      await Promise.all(batch.map(async function (s) {
        var age = cache[s] ? Date.now() - (cache[s].at || 0) : 1e12;
        if (!force && age < 60000 && cache[s] && cache[s].price != null) return;
        var res = await fetchOne(s);
        if (res) {
          cache[s] = res;
          if (res.name) KNOWN[s] = res.name;
        }
      }));
      try { localStorage.setItem('ct_stocks_v3', JSON.stringify(cache)); } catch (e) {}
      patchNumbers();
      await new Promise(function (r) { setTimeout(r, 80); });
    }

    var missing = list.filter(function (s) { return !cache[s] || cache[s].price == null; });
    for (var j = 0; j < missing.length; j++) {
      var res2 = await fetchOne(missing[j]);
      if (res2) {
        cache[missing[j]] = res2;
        patchNumbers();
      }
      await new Promise(function (r) { setTimeout(r, 200); });
    }
    try { localStorage.setItem('ct_stocks_v3', JSON.stringify(cache)); } catch (e) {}
    loading = false;
  }

  function addTicker(sym) {
    sym = (sym || '').toUpperCase().replace(/[^A-Z.]/g, '');
    if (!sym) return;
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
  }

  function wireSearch() {
    var q = $('stockQ');
    if (!q || q.__s137) return;
    q.__s137 = true;
    q.setAttribute('placeholder', lang() === 'en' ? 'Search ticker\u2026' : '\u041f\u043e\u0438\u0441\u043a \u0442\u0438\u043a\u0435\u0440\u0430\u2026');
    q.addEventListener('input', function () {
      var f = (q.value || '').toLowerCase().trim();
      var body = $('stockBody');
      if (!body) return;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        var s = tr.getAttribute('data-s') || '';
        var n = (tr.querySelector('.s-name') || {}).textContent || '';
        tr.style.display = (!f || s.toLowerCase().indexOf(f) >= 0 || n.toLowerCase().indexOf(f) >= 0) ? '' : 'none';
      });
    });
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var v = (q.value || '').trim().toUpperCase();
      if (v) addTicker(v);
    });
  }

  function installOverrides() {
    window.__ct_paintStocks = function () { ensureRows(); patchNumbers(); };
    window.__ct_loadStocks = function () { softRefresh(false); };
  }

  var newsTimer = null;
  function forceNewsLoop() {
    if (newsTimer) clearInterval(newsTimer);
    newsTimer = setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) {
        if (window.__ct_loadNews) window.__ct_loadNews(true);
      }
    }, 20000);
  }

  function boot() {
    installOverrides();
    wireSearch();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          installOverrides();
          wireSearch();
          ensureRows();
          softRefresh(true);
        }, 200);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        softRefresh(true);
      }
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(function () {
          if (window.__ct_loadNews) window.__ct_loadNews(true);
          forceNewsLoop();
        }, 300);
      }
    }, true);

    var body = $('stockBody');
    if (body) {
      var obs = new MutationObserver(function () {
        var tr = body.querySelector('tr[data-s]');
        if (tr && !tr.querySelector('.s-price')) {
          body.querySelectorAll('tr[data-s]').forEach(function (row) {
            var tds = row.querySelectorAll('td');
            if (tds.length >= 4) {
              tds[0].classList.add('s-rank');
              tds[2].classList.add('s-price');
              tds[3].classList.add('s-ch');
              var span = tds[1].querySelector('span');
              if (span) span.classList.add('s-name');
            }
          });
          patchNumbers();
        }
      });
      obs.observe(body, { childList: true, subtree: true });
    }

    var curSel = $('curSel');
    if (curSel && !curSel.__s137) {
      curSel.__s137 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(patchNumbers);
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) softRefresh(false);
    }, 40000);

    forceNewsLoop();

    setTimeout(function () {
      installOverrides();
      wireSearch();
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) softRefresh(true);
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
