/* stocks-live v141 — live Yahoo multi-proxy, digit-only, durable cache */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var ru = { ticker: '\u0422\u0438\u043a\u0435\u0440', price: '\u0426\u0435\u043d\u0430', ch24: '24H', div: '\u0414\u0438\u0432.%', search: '\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u0446\u0438\u0438\u2026' };
    var en = { ticker: 'Ticker', price: 'Price', ch24: '24H', div: 'Div%', search: 'Search stock\u2026' };
    return (lang() === 'en' ? en : ru)[k] || k;
  }

  var BOARD = [
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
  var DIV0 = {
    AAPL:0.43,MSFT:0.72,GOOGL:0.32,AMZN:0,NVDA:0.03,TSLA:0,META:0.32,
    AMD:0,NFLX:0,JPM:2.1,V:0.7,MA:0.55,BABA:1.8,DIS:0.8,CRM:0,
    ORCL:1.2,ADBE:0,INTC:1.5,PYPL:0,UBER:0,COIN:0,PLTR:0,KO:2.9,
    PEP:3.1,NKE:1.5,BA:0,WMT:1.1,XOM:3.3,JNJ:3.0,COST:0.55
  };

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v7') || '{}'); } catch (e) {}

  function all() {
    var a = BOARD.slice();
    EXTRA.forEach(function (s) { if (a.indexOf(s) < 0) a.push(s); });
    return a;
  }

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

  function parse(d) {
    if (!d) return null;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return null; } }
    if (d.contents) {
      try { d = typeof d.contents === 'string' ? JSON.parse(d.contents) : d.contents; } catch (e) { return null; }
    }
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
    return {
      price: +p,
      ch: prev ? ((p - prev) / prev * 100) : 0,
      name: m.shortName || m.symbol,
      div: divY,
      at: Date.now()
    };
  }

  async function fetchOne(sym) {
    var y1 = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=1y&events=div';
    var y2 = 'https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var proxies = [
      'https://corsproxy.io/?' + encodeURIComponent(y1),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(y1),
      'https://corsproxy.io/?' + encodeURIComponent(y2),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(y2)
    ];
    return await new Promise(function (resolve) {
      var left = proxies.length, done = false;
      proxies.forEach(function (url) {
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 7000);
        fetch(url, { signal: ctrl.signal })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (txt) {
            if (done || !txt) return;
            var d; try { d = JSON.parse(txt); } catch (e) { return; }
            var p = parse(d);
            if (p) { done = true; clearTimeout(to); resolve(p); }
          })
          .catch(function () {})
          .finally(function () {
            clearTimeout(to);
            left--;
            if (!done && left === 0) resolve(null);
          });
      });
    });
  }

  var built = false;
  function ensureBoard() {
    var body = $('stockBody');
    if (!body) return;
    var thead = body.parentElement && body.parentElement.querySelector('thead tr');
    if (thead) {
      thead.innerHTML = '<th>#</th><th>' + t('ticker') + '</th><th>' + t('price') + '</th><th>' + t('ch24') + '</th><th>' + t('div') + '</th>';
    }
    if (!built || !body.querySelector('.s-price')) {
      var list = all();
      var html = '';
      list.forEach(function (s, i) {
        html += '<tr class="s-tr" data-s="' + s + '">' +
          '<td>' + (i + 1) + '</td>' +
          '<td><b>' + s + '</b> <span class="muted s-name">' + (NAMES[s] || s) + '</span></td>' +
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
    paint();
  }

  function paint() {
    var body = $('stockBody');
    if (!body) return;
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      var s = tr.getAttribute('data-s');
      var d = cache[s];
      var pe = tr.querySelector('.s-price');
      var ce = tr.querySelector('.s-ch');
      var de = tr.querySelector('.s-div');
      if (d && d.price != null && pe) {
        var mp = money(d.price);
        if (pe.textContent !== mp) pe.textContent = mp;
      }
      if (d && d.ch != null && ce) {
        var mc = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
        if (ce.textContent !== mc) {
          ce.textContent = mc;
          ce.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
        }
      }
      if (de) {
        var dy = (d && d.div > 0) ? d.div : (DIV0[s] || 0);
        var ds = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
        if (de.textContent !== ds) de.textContent = ds;
      }
    });
  }

  var busy = false;
  async function refresh(force) {
    if (busy && !force) return;
    busy = true;
    await loadFx();
    ensureBoard();
    var list = all();
    list.sort(function (a, b) {
      var am = (!cache[a] || !cache[a].at) ? 0 : 1;
      var bm = (!cache[b] || !cache[b].at) ? 0 : 1;
      return am - bm;
    });

    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var age = cache[s] && cache[s].at ? Date.now() - cache[s].at : 1e12;
      if (!force && age < 90000) continue;
      var res = await fetchOne(s);
      if (res) {
        if (!(res.div > 0)) res.div = DIV0[s] || 0;
        cache[s] = res;
        if (res.name) NAMES[s] = res.name;
        try { localStorage.setItem('ct_stocks_v7', JSON.stringify(cache)); } catch (e) {}
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
            var dy = res.div > 0 ? res.div : (DIV0[s] || 0);
            de.textContent = dy > 0 ? (+dy).toFixed(2) + '%' : '\u2014';
          }
        }
      }
      await new Promise(function (r) { setTimeout(r, 100); });
    }
    busy = false;
  }

  function search() {
    var q = $('stockQ');
    if (!q) {
      var page = $('p-stocks');
      var card = page && page.querySelector('.card');
      if (card) {
        q = document.createElement('input');
        q.id = 'stockQ';
        q.type = 'search';
        q.placeholder = t('search');
        q.style.cssText = 'width:100%;box-sizing:border-box;margin:0 0 .55rem;padding:.55rem .75rem;border-radius:12px;border:1px solid rgba(168,85,247,.28);background:rgba(0,0,0,.25);color:inherit';
        card.insertBefore(q, card.firstChild);
      }
    }
    if (!q || q.__v141) return;
    q.__v141 = true;
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
      var v = (q.value || '').trim().toUpperCase().replace(/[^A-Z.]/g, '');
      if (!v) return;
      if (EXTRA.indexOf(v) < 0 && BOARD.indexOf(v) < 0) {
        EXTRA.unshift(v);
        try { localStorage.setItem('ct_stock_extra', JSON.stringify(EXTRA)); } catch (e) {}
        built = false;
        ensureBoard();
      }
      if (typeof window.openStock === 'function') try { window.openStock(v); } catch (e) {}
      refresh(true);
    });
  }

  function boot() {
    window.__ct_paintStocks = function () { paint(); };
    window.__ct_loadStocks = function () { ensureBoard(); paint(); refresh(false); };

    ensureBoard();
    search();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          built = false;
          ensureBoard();
          search();
          refresh(true);
        }, 120);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        refresh(true);
      }
    }, true);

    var body = $('stockBody');
    if (body && !body.__v141) {
      body.__v141 = true;
      new MutationObserver(function () {
        if (!body.querySelector('.s-price')) {
          built = false;
          setTimeout(function () { ensureBoard(); paint(); }, 40);
        }
      }).observe(body, { childList: true });
    }

    var curSel = $('curSel');
    if (curSel && !curSel.__v141) {
      curSel.__v141 = true;
      curSel.addEventListener('change', function () { fxAt = 0; loadFx().then(paint); });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) refresh(false);
    }, 60000);

    setTimeout(function () { refresh(true); }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
