/* stocks-board v139 — sole owner of stock table; digit-only updates; search; dividends always visible */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var d = {
      ru: { list: '\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439', ticker: '\u0422\u0438\u043a\u0435\u0440', price: '\u0426\u0435\u043d\u0430', ch24: '24H', div: '\u0414\u0438\u0432.%', search: '\u041f\u043e\u0438\u0441\u043a \u0442\u0438\u043a\u0435\u0440\u0430 \u0438\u043b\u0438 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f\u2026', updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e', loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' },
      en: { list: 'Stocks', ticker: 'Ticker', price: 'Price', ch24: '24H', div: 'Div%', search: 'Search ticker or name\u2026', updated: 'Updated', loading: 'Loading\u2026' }
    };
    return (d[lang()] || d.ru)[k] || k;
  }

  var TICKERS = [
    'AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','AMD','NFLX','JPM',
    'V','MA','BABA','DIS','CRM','ORCL','ADBE','INTC','PYPL','UBER',
    'COIN','PLTR','KO','PEP','NKE','BA','WMT','XOM','JNJ','COST'
  ];
  var NAMES = {
    AAPL:'Apple',MSFT:'Microsoft',GOOGL:'Alphabet',AMZN:'Amazon',NVDA:'NVIDIA',
    TSLA:'Tesla',META:'Meta',AMD:'AMD',NFLX:'Netflix',JPM:'JPMorgan',
    V:'Visa',MA:'Mastercard',BABA:'Alibaba',DIS:'Disney',CRM:'Salesforce',
    ORCL:'Oracle',ADBE:'Adobe',INTC:'Intel',PYPL:'PayPal',UBER:'Uber',
    COIN:'Coinbase',PLTR:'Palantir',KO:'Coca-Cola',PEP:'Pepsi',NKE:'Nike',
    BA:'Boeing',WMT:'Walmart',XOM:'Exxon',JNJ:'J&J',COST:'Costco'
  };
  var DIV = {
    AAPL:0.43,MSFT:0.72,GOOGL:0.32,AMZN:0,NVDA:0.03,TSLA:0,META:0.32,
    AMD:0,NFLX:0,JPM:2.1,V:0.70,MA:0.55,BABA:1.80,DIS:0.80,CRM:0,
    ORCL:1.20,ADBE:0,INTC:1.50,PYPL:0,UBER:0,COIN:0,PLTR:0,KO:2.90,
    PEP:3.10,NKE:1.50,BA:0,WMT:1.10,XOM:3.30,JNJ:3.00,COST:0.55
  };
  var SEED = {
    NVDA:{price:217.23,ch:1.2},TSLA:{price:362.44,ch:0.8},
    AAPL:{price:342,ch:-0.28},MSFT:{price:539.44,ch:3.22},
    GOOGL:{price:349.22,ch:0.27},AMZN:{price:254.76,ch:0.28},
    META:{price:736.72,ch:2.2},AMD:{price:562.23,ch:-9.42}
  };

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v5') || '{}'); } catch (e) {}
  Object.keys(SEED).forEach(function (s) {
    if (!cache[s] || cache[s].price == null) {
      cache[s] = { price: SEED[s].price, ch: SEED[s].ch, div: DIV[s] || 0, at: 0, seed: true };
    }
  });

  function allTickers() {
    var base = TICKERS.slice();
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
    if (Math.abs(n) >= 1000) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return s + n.toFixed(2);
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
    return { price: +p, ch: prev ? ((p - prev) / prev * 100) : 0, name: m.shortName || m.symbol, div: divY, at: Date.now() };
  }

  async function fetchSym(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=1y&events=div';
    var urls = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { signal: AbortSignal.timeout(8000) });
        if (!r.ok) continue;
        var txt = await r.text();
        var d; try { d = JSON.parse(txt); } catch (e) { continue; }
        var p = parseChart(d);
        if (p) return p;
      } catch (e) {}
    }
    return null;
  }

  function buildBoard() {
    var body = $('stockBody');
    if (!body) return;
    var thead = body.parentElement && body.parentElement.querySelector('thead tr');
    if (thead) {
      thead.innerHTML =
        '<th>#</th><th>' + t('ticker') + '</th><th>' + t('price') + '</th><th>' + t('ch24') + '</th><th class="th-div">' + t('div') + '</th>';
    }
    var list = allTickers();
    var needRebuild = !body.querySelector('tr[data-s] .s-price') || body.querySelectorAll('tr[data-s]').length < list.length * 0.5;
    if (needRebuild) {
      var html = '';
      list.forEach(function (s, idx) {
        html += '<tr class="s-tr" data-s="' + s + '">' +
          '<td class="s-rank">' + (idx + 1) + '</td>' +
          '<td><b>' + s + '</b> <span class="muted s-name">' + (NAMES[s] || s) + '</span></td>' +
          '<td class="s-price">\u2014</td>' +
          '<td class="s-ch">\u2014</td>' +
          '<td class="s-div">\u2014</td></tr>';
      });
      body.innerHTML = html;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        tr.onclick = function () {
          var s = tr.getAttribute('data-s');
          if (typeof window.openStock === 'function') window.openStock(s);
        };
      });
    }
    patchDigits();
  }

  function patchDigits() {
    var body = $('stockBody');
    if (!body) return;
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      var s = tr.getAttribute('data-s');
      var d = cache[s];
      var priceEl = tr.querySelector('.s-price');
      var chEl = tr.querySelector('.s-ch');
      var divEl = tr.querySelector('.s-div');
      if (d && d.price != null && priceEl) {
        var mp = money(d.price);
        if (priceEl.textContent !== mp) priceEl.textContent = mp;
      }
      if (d && d.ch != null && chEl) {
        var mc = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
        if (chEl.textContent !== mc) {
          chEl.textContent = mc;
          chEl.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
        }
      }
      if (divEl) {
        var dy = (d && d.div != null && d.div > 0) ? d.div : (DIV[s] || 0);
        var ds = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
        if (divEl.textContent !== ds) divEl.textContent = ds;
      }
      var nameEl = tr.querySelector('.s-name');
      if (nameEl && d && d.name && nameEl.textContent !== d.name) nameEl.textContent = d.name;
    });
  }

  var busy = false;
  async function softRefresh(force) {
    if (busy && !force) return;
    busy = true;
    await loadFx();
    buildBoard();
    var list = allTickers();
    list.sort(function (a, b) {
      function score(s) {
        if (!cache[s] || cache[s].price == null) return 0;
        if (cache[s].seed) return 1;
        return 2;
      }
      return score(a) - score(b);
    });
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var age = cache[s] && !cache[s].seed ? Date.now() - (cache[s].at || 0) : 1e12;
      if (!force && age < 120000 && cache[s] && cache[s].price != null && !cache[s].seed) continue;
      var res = await fetchSym(s);
      if (res) {
        if (res.div == null || res.div <= 0) res.div = DIV[s] || 0;
        cache[s] = res;
        if (res.name) NAMES[s] = res.name;
        try { localStorage.setItem('ct_stocks_v5', JSON.stringify(cache)); } catch (e) {}
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
            var dy = res.div > 0 ? res.div : (DIV[s] || 0);
            de.textContent = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
          }
        }
      }
      await new Promise(function (r) { setTimeout(r, 120); });
    }
    busy = false;
  }

  function wireSearch() {
    var q = $('stockQ');
    if (!q) {
      var page = $('p-stocks');
      if (page && !$('stockQ')) {
        var parent = page.querySelector('.card') || page;
        var inp = document.createElement('input');
        inp.type = 'search';
        inp.id = 'stockQ';
        inp.placeholder = t('search');
        inp.autocomplete = 'off';
        inp.style.cssText = 'width:100%;margin:.5rem 0;padding:.55rem .75rem;border-radius:12px;border:1px solid rgba(168,85,247,.25);background:rgba(0,0,0,.25);color:inherit';
        parent.insertBefore(inp, parent.firstChild);
        q = inp;
      }
    }
    if (!q || q.__v139) return;
    q.__v139 = true;
    q.placeholder = t('search');
    q.addEventListener('input', function () {
      var f = (q.value || '').toLowerCase().trim();
      var body = $('stockBody');
      if (!body) return;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
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
      if (EXTRA.indexOf(v) < 0 && TICKERS.indexOf(v) < 0) {
        EXTRA.unshift(v);
        try { localStorage.setItem('ct_stock_extra', JSON.stringify(EXTRA)); } catch (e) {}
        var body = $('stockBody');
        if (body && !body.querySelector('tr[data-s="' + v + '"]')) {
          var tr = document.createElement('tr');
          tr.className = 's-tr';
          tr.setAttribute('data-s', v);
          tr.innerHTML = '<td class="s-rank">+</td><td><b>' + v + '</b> <span class="muted s-name">' + v + '</span></td><td class="s-price">\u2014</td><td class="s-ch">\u2014</td><td class="s-div">\u2014</td>';
          tr.onclick = function () { if (typeof window.openStock === 'function') window.openStock(v); };
          body.insertBefore(tr, body.firstChild);
        }
      }
      softRefresh(true);
      if (typeof window.openStock === 'function') window.openStock(v);
    });
  }

  function installOverrides() {
    window.__ct_paintStocks = function () { patchDigits(); };
    window.__ct_loadStocks = function () { softRefresh(false); };
  }

  function watchBody() {
    var body = $('stockBody');
    if (!body || body.__watched) return;
    body.__watched = true;
    var obs = new MutationObserver(function () {
      if (!body.querySelector('.s-price') || !body.querySelector('.s-div')) {
        setTimeout(function () { buildBoard(); patchDigits(); }, 50);
      }
    });
    obs.observe(body, { childList: true });
  }

  function boot() {
    installOverrides();
    buildBoard();
    patchDigits();
    wireSearch();
    watchBody();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          installOverrides();
          buildBoard();
          wireSearch();
          watchBody();
          softRefresh(true);
        }, 180);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        softRefresh(true);
      }
    }, true);

    var curSel = $('curSel');
    if (curSel && !curSel.__v139) {
      curSel.__v139 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(patchDigits);
      });
    }
    var langSel = $('langSel');
    if (langSel && !langSel.__v139) {
      langSel.__v139 = true;
      langSel.addEventListener('change', function () {
        var body = $('stockBody');
        var thead = body && body.parentElement && body.parentElement.querySelector('thead tr');
        if (thead) {
          thead.innerHTML = '<th>#</th><th>' + t('ticker') + '</th><th>' + t('price') + '</th><th>' + t('ch24') + '</th><th class="th-div">' + t('div') + '</th>';
        }
        if ($('stockQ')) $('stockQ').placeholder = t('search');
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) softRefresh(false);
    }, 45000);

    setTimeout(function () {
      installOverrides();
      buildBoard();
      softRefresh(true);
    }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
