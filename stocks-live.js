/* stocks-live v150 — clean multi-proxy Yahoo, dividends, TradingView, full responsive */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var map = {
      ru: { ticker: 'Тикер', price: 'Цена', ch24: '24H', div: 'Див.%', search: 'Поиск акции…', gainers: 'Рост', losers: 'Падение', list: 'Список акций' },
      en: { ticker: 'Ticker', price: 'Price', ch24: '24H', div: 'Div%', search: 'Search stock…', gainers: 'Gainers', losers: 'Losers', list: 'Stock list' }
    };
    return (map[lang()] || map.ru)[k] || k;
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
  var TV = {
    AAPL:'NASDAQ:AAPL',MSFT:'NASDAQ:MSFT',GOOGL:'NASDAQ:GOOGL',AMZN:'NASDAQ:AMZN',
    NVDA:'NASDAQ:NVDA',TSLA:'NASDAQ:TSLA',META:'NASDAQ:META',AMD:'NASDAQ:AMD',
    NFLX:'NASDAQ:NFLX',JPM:'NYSE:JPM',V:'NYSE:V',MA:'NYSE:MA',BABA:'NYSE:BABA',
    DIS:'NYSE:DIS',CRM:'NYSE:CRM',ORCL:'NYSE:ORCL',ADBE:'NASDAQ:ADBE',
    INTC:'NASDAQ:INTC',PYPL:'NASDAQ:PYPL',UBER:'NYSE:UBER',COIN:'NASDAQ:COIN',
    PLTR:'NYSE:PLTR',KO:'NYSE:KO',PEP:'NASDAQ:PEP',NKE:'NYSE:NKE',BA:'NYSE:BA',
    WMT:'NYSE:WMT',XOM:'NYSE:XOM',JNJ:'NYSE:JNJ',COST:'NASDAQ:COST'
  };

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v10') || '{}'); } catch (e) {}

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
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
      var d = await r.json();
      fx = c === 'eur' ? (d.rates.EUR || 1) : c === 'rub' ? (d.rates.RUB || 1) : c === 'pln' ? (d.rates.PLN || 1) : 1;
      fxAt = Date.now();
    } catch (e) {}
    return fx;
  }
  function money(v) {
    if (v == null || isNaN(+v)) return '—';
    var c = cur();
    var s = c === 'eur' ? '€' : c === 'rub' ? '₽' : c === 'pln' ? 'zł' : '$';
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
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(y2),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(y2)
    ];
    return await new Promise(function (resolve) {
      var left = proxies.length, done = false;
      proxies.forEach(function (url) {
        var ctrl = new AbortController();
        var to = setTimeout(function () { ctrl.abort(); }, 8000);
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
    var page = $('p-stocks');
    if (!page) {
      var wrap = document.querySelector('.wrap');
      if (!wrap) return;
      page = document.createElement('section');
      page.className = 'page';
      page.id = 'p-stocks';
      page.innerHTML =
        '<div class="search-wrap"><input type="search" id="stockQ" placeholder="' + t('search') + '" autocomplete="off"/></div>' +
        '<div class="card"><div class="card-head"><h2>' + t('list') + '</h2>' +
        '<button type="button" class="btn-ghost" id="stockRef">↻</button></div>' +
        '<div class="table-x"><table><thead><tr>' +
        '<th>#</th><th>' + t('ticker') + '</th><th>' + t('price') + '</th><th>' + t('ch24') + '</th><th>' + t('div') + '</th>' +
        '</tr></thead><tbody id="stockBody"></tbody></table></div></div>' +
        '<div class="card" id="stockDetail" style="display:none">' +
        '<div class="coin"><div><div class="nm" id="sdName">—</div><div class="sy" id="sdSym">—</div></div>' +
        '<div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">—</div><div id="sdCh">—</div></div></div>' +
        '<div id="stockTv" style="height:min(420px,55vh);width:100%;border-radius:12px;overflow:hidden;background:var(--card2);margin-top:.5rem"></div>' +
        '<div id="stockNews" style="margin-top:.65rem"></div></div>' +
        '<div class="card"><h2>' + t('gainers') + '</h2><div id="stockGainers" class="trend-grid"></div></div>' +
        '<div class="card"><h2>' + t('losers') + '</h2><div id="stockLosers" class="trend-grid"></div></div>';
      wrap.appendChild(page);
    }

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
          '<td class="s-price">—</td><td class="s-ch">—</td><td class="s-div">—</td></tr>';
      });
      body.innerHTML = html;
      body.querySelectorAll('tr[data-s]').forEach(function (tr) {
        tr.onclick = function () { openStock(tr.getAttribute('data-s')); };
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
        var ds = dy > 0 ? (+dy).toFixed(2) + '%' : '—';
        if (de.textContent !== ds) de.textContent = ds;
      }
    });

    var sorted = all().map(function (s) {
      return { s: s, ch: (cache[s] && cache[s].ch) || 0, price: cache[s] && cache[s].price };
    }).filter(function (x) { return x.price != null; });

    function gl(id, arr) {
      var box = $(id);
      if (!box) return;
      box.innerHTML = arr.map(function (x) {
        return '<div class="s-gl" data-s="' + x.s + '"><b>' + x.s + '</b> <span class="' +
          (x.ch >= 0 ? 'up' : 'dn') + '">' + (x.ch >= 0 ? '+' : '') + (+x.ch).toFixed(2) + '%</span></div>';
      }).join('') || '<div class="muted">—</div>';
      box.querySelectorAll('.s-gl').forEach(function (el) {
        el.onclick = function () { openStock(el.getAttribute('data-s')); };
      });
    }
    gl('stockGainers', sorted.slice().sort(function (a, b) { return b.ch - a.ch; }).slice(0, 6));
    gl('stockLosers', sorted.slice().sort(function (a, b) { return a.ch - b.ch; }).slice(0, 6));
  }

  var tvReady = null;
  function ensureTV() {
    if (window.TradingView) return Promise.resolve();
    if (tvReady) return tvReady;
    tvReady = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload = function () { res(); };
      s.onerror = function () { res(); };
      document.head.appendChild(s);
    });
    return tvReady;
  }

  async function openStock(sym) {
    var det = $('stockDetail');
    if (!det) return;
    det.style.display = 'block';
    var d = cache[sym] || {};
    if ($('sdName')) $('sdName').textContent = d.name || NAMES[sym] || sym;
    if ($('sdSym')) $('sdSym').textContent = sym;
    if ($('sdPrice')) $('sdPrice').textContent = d.price != null ? money(d.price) : '—';
    if ($('sdCh')) {
      $('sdCh').textContent = ((d.ch || 0) >= 0 ? '+' : '') + (+(d.ch || 0)).toFixed(2) + '%';
      $('sdCh').className = (d.ch || 0) >= 0 ? 'up' : 'dn';
    }
    var box = $('stockTv');
    if (box) {
      box.innerHTML = '';
      await ensureTV();
      if (window.TradingView) {
        var cid = 'stv_' + Date.now();
        var el = document.createElement('div');
        el.id = cid;
        el.style.cssText = 'height:100%;width:100%';
        box.appendChild(el);
        var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        try {
          new TradingView.widget({
            autosize: true,
            symbol: TV[sym] || ('NASDAQ:' + sym),
            interval: '15',
            theme: theme,
            style: '1',
            locale: lang() === 'ru' ? 'ru' : 'en',
            enable_publishing: false,
            container_id: cid,
            backgroundColor: theme === 'dark' ? '#12101c' : '#fff',
            allow_symbol_change: true,
            withdateranges: true,
            hide_side_toolbar: false
          });
        } catch (e) {}
      }
    }
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.openStock = openStock;

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
        try { localStorage.setItem('ct_stocks_v10', JSON.stringify(cache)); } catch (e) {}
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
            de.textContent = dy > 0 ? (+dy).toFixed(2) + '%' : '—';
          }
        }
      }
      await new Promise(function (r) { setTimeout(r, 80); });
    }
    paint();
    busy = false;
  }

  function search() {
    var q = $('stockQ');
    if (!q) return;
    if (q.__v150) return;
    q.__v150 = true;
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
      openStock(v);
      refresh(true);
    });
  }

  function boot() {
    window.__ct_paintStocks = paint;
    window.__ct_loadStocks = function () {
      ensureBoard();
      paint();
      refresh(false);
    };

    ensureBoard();
    search();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          built = false;
          ensureBoard();
          search();
          refresh(true);
        }, 100);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        refresh(true);
      }
    }, true);

    var body = $('stockBody');
    if (body && !body.__v150) {
      body.__v150 = true;
      new MutationObserver(function () {
        if (!body.querySelector('.s-price')) {
          built = false;
          setTimeout(function () { ensureBoard(); paint(); }, 40);
        }
      }).observe(body, { childList: true });
    }

    var curSel = $('curSel');
    if (curSel && !curSel.__v150) {
      curSel.__v150 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(paint);
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) refresh(false);
    }, 60000);

    setTimeout(function () { refresh(true); }, 400);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
