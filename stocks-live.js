/* stocks-live v160 — one-shot CNBC quotes, TradingView fallback, live repaint */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  function signal(ms) {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
    var c = new AbortController();
    setTimeout(function () { try { c.abort(); } catch (e) {} }, ms);
    return c.signal;
  }

  var BOARD = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'NFLX', 'JPM',
    'V', 'MA', 'BABA', 'DIS', 'CRM', 'ORCL', 'ADBE', 'INTC', 'PYPL', 'UBER',
    'COIN', 'PLTR', 'KO', 'PEP', 'NKE', 'BA', 'WMT', 'XOM', 'JNJ', 'COST'
  ];
  var NAMES = {
    AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', NVDA: 'NVIDIA',
    TSLA: 'Tesla', META: 'Meta', AMD: 'AMD', NFLX: 'Netflix', JPM: 'JPMorgan',
    V: 'Visa', MA: 'Mastercard', BABA: 'Alibaba', DIS: 'Disney', CRM: 'Salesforce',
    ORCL: 'Oracle', ADBE: 'Adobe', INTC: 'Intel', PYPL: 'PayPal', UBER: 'Uber',
    COIN: 'Coinbase', PLTR: 'Palantir', KO: 'Coca-Cola', PEP: 'Pepsi', NKE: 'Nike',
    BA: 'Boeing', WMT: 'Walmart', XOM: 'Exxon', JNJ: 'J&J', COST: 'Costco'
  };
  var DIV0 = {
    AAPL: 0.44, MSFT: 0.74, GOOGL: 0.32, AMZN: 0, NVDA: 0.03, TSLA: 0, META: 0.32,
    AMD: 0, NFLX: 0, JPM: 2.1, V: 0.7, MA: 0.55, BABA: 1.8, DIS: 0.8, CRM: 0,
    ORCL: 1.2, ADBE: 0, INTC: 1.5, PYPL: 0, UBER: 0, COIN: 0, PLTR: 0, KO: 2.9,
    PEP: 3.1, NKE: 1.5, BA: 0, WMT: 1.1, XOM: 3.3, JNJ: 3.0, COST: 0.55
  };
  var TV = {
    AAPL: 'NASDAQ:AAPL', MSFT: 'NASDAQ:MSFT', GOOGL: 'NASDAQ:GOOGL', AMZN: 'NASDAQ:AMZN',
    NVDA: 'NASDAQ:NVDA', TSLA: 'NASDAQ:TSLA', META: 'NASDAQ:META', AMD: 'NASDAQ:AMD',
    NFLX: 'NASDAQ:NFLX', JPM: 'NYSE:JPM', V: 'NYSE:V', MA: 'NYSE:MA', BABA: 'NYSE:BABA',
    DIS: 'NYSE:DIS', CRM: 'NYSE:CRM', ORCL: 'NYSE:ORCL', ADBE: 'NASDAQ:ADBE',
    INTC: 'NASDAQ:INTC', PYPL: 'NASDAQ:PYPL', UBER: 'NYSE:UBER', COIN: 'NASDAQ:COIN',
    PLTR: 'NASDAQ:PLTR', KO: 'NYSE:KO', PEP: 'NASDAQ:PEP', NKE: 'NYSE:NKE', BA: 'NYSE:BA',
    WMT: 'NYSE:WMT', XOM: 'NYSE:XOM', JNJ: 'NYSE:JNJ', COST: 'NASDAQ:COST'
  };

  var EXTRA = [];
  try { EXTRA = JSON.parse(localStorage.getItem('ct_stock_extra') || '[]'); } catch (e) {}
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v11') || '{}'); } catch (e) {}

  function all() {
    var a = BOARD.slice();
    EXTRA.forEach(function (s) { if (a.indexOf(s) < 0) a.push(s); });
    return a;
  }
  function cur() {
    var c = (localStorage.getItem('ct_cur') || ($('curSel') && $('curSel').value) || 'usd').toLowerCase();
    if (c === 'rub') return 'usd';
    return c;
  }
  var fx = 1, fxAt = 0;
  async function loadFx() {
    var c = cur();
    if (c === 'usd') { fx = 1; fxAt = Date.now(); return 1; }
    if (Date.now() - fxAt < 180000) return fx;
    try {
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: signal(5000) });
      var d = await r.json();
      fx = c === 'eur' ? (d.rates.EUR || 1) : c === 'pln' ? (d.rates.PLN || 1) : 1;
      fxAt = Date.now();
    } catch (e) {}
    return fx;
  }
  function money(v) {
    if (v == null || isNaN(+v)) return '—';
    var c = cur();
    var s = c === 'eur' ? '€' : c === 'pln' ? 'zł' : '$';
    var n = +v * fx;
    return Math.abs(n) >= 1000
      ? s + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : s + n.toFixed(2);
  }
  function num(v) {
    if (v == null || v === '') return null;
    var n = parseFloat(String(v).replace(/[^0-9.+-]/g, ''));
    return isNaN(n) ? null : n;
  }
  function flash(el, dir) {
    if (!el || !dir) return;
    el.classList.remove('tick-up', 'tick-dn');
    void el.offsetWidth;
    el.classList.add(dir > 0 ? 'tick-up' : 'tick-dn');
  }

  function quoteFromCnbc(q) {
    if (!q || q.code) return null;
    var last = num(q.last);
    var ext = q.ExtendedMktQuote || {};
    var extLast = num(ext.last || ext.ExtendedMktLast || ext.lastPrice);
    var price = last != null ? last : extLast;
    if (price == null) return null;
    var ch = num(q.change_pct);
    if (ch == null) ch = num(ext.change_pct);
    if (ch == null) {
      var prev = num(q.previous_day_closing);
      ch = prev ? ((price - prev) / prev * 100) : 0;
    }
    var div = num(q.dividendyield);
    return {
      price: price,
      ch: ch || 0,
      div: div,
      name: q.name || q.shortName || '',
      at: Date.now()
    };
  }

  async function fetchCnbc(symbols) {
    var out = {};
    if (!symbols.length) return out;
    var url = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' +
      symbols.join('|') +
      '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1';
    try {
      var r = await fetch(url, { signal: signal(8000) });
      if (!r.ok) return out;
      var d = await r.json();
      var list = d && d.FormattedQuoteResult && d.FormattedQuoteResult.FormattedQuote;
      if (!list) return out;
      if (!Array.isArray(list)) list = [list];
      list.forEach(function (q) {
        var row = quoteFromCnbc(q);
        if (row && q.symbol) out[String(q.symbol).toUpperCase()] = row;
      });
    } catch (e) {}
    return out;
  }

  async function fetchTV(symbols) {
    var out = {};
    var tickers = symbols.map(function (s) { return TV[s] || ('NASDAQ:' + s); });
    try {
      var r = await fetch('https://scanner.tradingview.com/america/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          symbols: { tickers: tickers, query: { types: [] } },
          columns: ['close', 'change', 'description', 'dividend_yield_recent']
        }),
        signal: signal(8000)
      });
      if (!r.ok) return out;
      var d = await r.json();
      (d.data || []).forEach(function (row) {
        var sym = String(row.s || '').split(':').pop();
        var cols = row.d || [];
        if (!sym || cols[0] == null) return;
        out[sym] = {
          price: +cols[0],
          ch: cols[1] == null ? 0 : +cols[1],
          div: cols[3] != null ? +cols[3] : null,
          name: cols[2] || '',
          at: Date.now()
        };
      });
    } catch (e) {}
    return out;
  }

  function ensurePage() {
    if ($('p-stocks')) return;
    var wrap = document.querySelector('.wrap');
    if (!wrap) return;
    var page = document.createElement('section');
    page.className = 'page';
    page.id = 'p-stocks';
    page.innerHTML =
      '<div class="search-wrap"><input type="search" id="stockQ" placeholder="Search ticker…" autocomplete="off" enterkeyhint="search"/></div>' +
      '<div class="card"><div class="card-head"><h2><span class="live-dot" aria-hidden="true"></span> Stock list</h2>' +
      '<div class="card-actions"><span class="muted" id="stockLive" style="font-size:.68rem"></span>' +
      '<button type="button" class="btn-ghost" id="stockRef">↻</button></div></div>' +
      '<div class="table-x"><table><thead><tr><th>#</th><th>Ticker</th><th>Price</th><th>24h</th><th>Div%</th></tr></thead>' +
      '<tbody id="stockBody"></tbody></table></div></div>' +
      '<div class="card" id="stockDetail" style="display:none">' +
      '<div class="coin"><div><div class="nm" id="sdName">—</div><div class="sy" id="sdSym">—</div></div>' +
      '<div style="margin-left:auto;text-align:right"><div class="pr" id="sdPrice">—</div><div id="sdCh">—</div></div></div>' +
      '<div id="stockTv" style="height:min(420px,55vh);width:100%;border-radius:12px;overflow:hidden;background:#12101c;margin-top:.5rem"></div></div>' +
      '<div class="card"><h2>Gainers</h2><div id="stockGainers" class="trend-grid"></div></div>' +
      '<div class="card"><h2>Losers</h2><div id="stockLosers" class="trend-grid"></div></div>';
    wrap.appendChild(page);
  }

  var builtKey = '';
  function ensureRows() {
    ensurePage();
    var body = $('stockBody');
    if (!body) return;
    var list = all();
    var key = list.join(',');
    if (builtKey === key && body.querySelector('tr[data-s]')) return;
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
    builtKey = key;
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
        if (pe.textContent !== mp) {
          pe.textContent = mp;
          if (d.dir) flash(pe, d.dir);
        }
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
        de.textContent = dy > 0 ? (+dy).toFixed(2) + '%' : '—';
      }
      if (d) d.dir = 0;
    });
    var sorted = all().map(function (s) {
      return { s: s, ch: (cache[s] && cache[s].ch) || 0, price: cache[s] && cache[s].price };
    }).filter(function (x) { return x.price != null; });
    function gl(id, arr) {
      var box = $(id);
      if (!box) return;
      box.innerHTML = arr.map(function (x) {
        return '<button type="button" class="s-gl" data-s="' + x.s + '"><b>' + x.s + '</b> <span class="' +
          (x.ch >= 0 ? 'up' : 'dn') + '">' + (x.ch >= 0 ? '+' : '') + (+x.ch).toFixed(2) + '%</span></button>';
      }).join('') || '<div class="muted">—</div>';
      box.querySelectorAll('.s-gl').forEach(function (el) {
        el.onclick = function () { openStock(el.getAttribute('data-s')); };
      });
    }
    gl('stockGainers', sorted.slice().sort(function (a, b) { return b.ch - a.ch; }).slice(0, 6));
    gl('stockLosers', sorted.slice().sort(function (a, b) { return a.ch - b.ch; }).slice(0, 6));
    var open = $('stockDetail');
    if (open && open.style.display !== 'none' && open.getAttribute('data-s')) {
      var sym = open.getAttribute('data-s');
      var d2 = cache[sym];
      if (d2 && $('sdPrice')) $('sdPrice').textContent = money(d2.price);
      if (d2 && $('sdCh')) {
        $('sdCh').textContent = (d2.ch >= 0 ? '+' : '') + (+d2.ch).toFixed(2) + '%';
        $('sdCh').className = d2.ch >= 0 ? 'up' : 'dn';
      }
    }
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
    det.setAttribute('data-s', sym);
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
            interval: '5',
            timezone: 'America/New_York',
            theme: theme,
            style: '1',
            locale: 'en',
            enable_publishing: false,
            hide_legend: false,
            container_id: cid,
            backgroundColor: theme === 'dark' ? '#12101c' : '#ffffff',
            allow_symbol_change: false,
            withdateranges: true,
            hide_side_toolbar: window.innerWidth < 720
          });
        } catch (e) {}
      }
    }
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.openStock = openStock;

  var busy = false;
  async function refresh(force) {
    ensureRows();
    paint();
    if (busy && !force) return;
    busy = true;
    try {
      await loadFx();
      var list = all();
      var got = await fetchCnbc(list);
      if (Object.keys(got).length < Math.min(8, list.length)) {
        var tv = await fetchTV(list);
        Object.keys(tv).forEach(function (k) { if (!got[k]) got[k] = tv[k]; });
      }
      var any = false;
      Object.keys(got).forEach(function (s) {
        var row = got[s];
        if (!(row.div > 0)) row.div = DIV0[s] || 0;
        if (row.name) NAMES[s] = row.name;
        var prev = cache[s] && cache[s].price;
        row.dir = prev == null ? 0 : (row.price > prev + 0.0001 ? 1 : row.price < prev - 0.0001 ? -1 : 0);
        cache[s] = row;
        any = true;
      });
      if (any) {
        try { localStorage.setItem('ct_stocks_v11', JSON.stringify(cache)); } catch (e) {}
      }
      paint();
      if ($('stockLive')) {
        var n = Object.keys(got).length;
        $('stockLive').textContent = n
          ? ('Live · ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }))
          : 'Reconnecting…';
      }
    } finally {
      busy = false;
    }
  }

  function bindSearch() {
    var q = $('stockQ');
    if (!q || q.__v160) return;
    q.__v160 = true;
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
      if (!v || v.length > 8) return;
      if (EXTRA.indexOf(v) < 0 && BOARD.indexOf(v) < 0) {
        EXTRA.unshift(v);
        EXTRA = EXTRA.slice(0, 12);
        try { localStorage.setItem('ct_stock_extra', JSON.stringify(EXTRA)); } catch (err) {}
        builtKey = '';
        ensureRows();
      }
      openStock(v);
      refresh(true);
    });
  }

  function boot() {
    window.__ct_paintStocks = paint;
    window.__ct_loadStocks = function () { refresh(false); };
    ensureRows();
    paint();
    bindSearch();
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#stockRef')) {
        e.preventDefault();
        refresh(true);
      }
    });
    var curSel = $('curSel');
    if (curSel && !curSel.__v160s) {
      curSel.__v160s = true;
      curSel.addEventListener('change', function () { fxAt = 0; loadFx().then(paint); });
    }
    setTimeout(function () { refresh(true); }, 40);
    setInterval(function () {
      if (document.visibilityState === 'hidden') return;
      refresh(false);
    }, 6000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') refresh(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
