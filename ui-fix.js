/* ui-fix v129 — news tab forced, all stocks search, all-crypto/all-stocks buttons */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function t(k) {
    if (window.__ct_t) return window.__ct_t(k);
    var ru = {
      news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', allCrypto: '\u0412\u0441\u0435 \u043a\u0440\u0438\u043f\u0442\u043e', allStocks: '\u0412\u0441\u0435 \u0430\u043a\u0446\u0438\u0438',
      searchStock: '\u0422\u0438\u043a\u0435\u0440 \u0438\u043b\u0438 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435\u2026', loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',
      stockList: '\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439', add: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c'
    };
    var en = {
      news: 'News', allCrypto: 'All crypto', allStocks: 'All stocks',
      searchStock: 'Ticker or name\u2026', loading: 'Loading\u2026',
      stockList: 'Stock list', add: 'Add'
    };
    var lang = (localStorage.getItem('ct_lang') || 'ru');
    return (lang === 'en' ? en : ru)[k] || k;
  }

  function forceNewsNav() {
    var nav = $('nav');
    if (!nav) return;
    nav.style.gridTemplateColumns = 'repeat(6, 1fr)';
    var btn = document.querySelector('.nav-btn[data-p="news"]');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-btn';
      btn.setAttribute('data-p', 'news');
      btn.innerHTML = '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg><span>' + t('news') + '</span>';
      var tools = document.querySelector('.nav-btn[data-p="tools"]');
      if (tools) nav.insertBefore(btn, tools);
      else nav.appendChild(btn);
    }
    btn.style.display = '';
    btn.hidden = false;
    var sp = btn.querySelector('span');
    if (sp) sp.textContent = t('news');

    if (!window.__ct_newsProtected) {
      window.__ct_newsProtected = true;
      var obs = new MutationObserver(function () {
        var b = document.querySelector('.nav-btn[data-p="news"]');
        if (b && (b.style.display === 'none' || b.hidden)) {
          b.style.display = '';
          b.hidden = false;
        }
      });
      obs.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'hidden', 'class'] });
    }
  }

  function ensureNewsPage() {
    forceNewsNav();
    var wrap = document.querySelector('.wrap');
    if (!wrap) return;
    var page = $('p-news');
    if (!page) {
      page = document.createElement('section');
      page.className = 'page';
      page.id = 'p-news';
      page.innerHTML =
        '<div class="card" style="min-height:60vh">' +
        '<div class="chart-tabs" id="newsTabs">' +
        '<button type="button" class="tab on" data-nt="crypto">' + t('allCrypto') + '</button>' +
        '<button type="button" class="tab" data-nt="coins">BTC ETH SOL\u2026</button>' +
        '<button type="button" class="tab" data-nt="stocks">' + t('allStocks') + '</button>' +
        '<button type="button" class="btn-ghost" id="newsRefBtn" style="margin-left:auto">\u21bb</button>' +
        '</div>' +
        '<div id="newsFeed" data-tab="crypto" style="margin-top:.65rem;min-height:50vh">' +
        '<div class="muted">' + t('loading') + '</div></div></div>';
      wrap.appendChild(page);
      page.querySelectorAll('#newsTabs .tab').forEach(function (tb) {
        tb.onclick = function () {
          page.querySelectorAll('#newsTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          tb.classList.add('on');
          var feed = $('newsFeed');
          if (feed) feed.setAttribute('data-tab', tb.getAttribute('data-nt'));
          if (window.__ct_paintNews) window.__ct_paintNews();
          else if (window.__ct_loadNews) window.__ct_loadNews(false);
        };
      });
      if ($('newsRefBtn')) {
        $('newsRefBtn').onclick = function () {
          if (window.__ct_loadNews) window.__ct_loadNews(true);
        };
      }
    }
    return page;
  }

  function openNews() {
    forceNewsNav();
    var page = ensureNewsPage();
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('on'); });
    var nb = document.querySelector('.nav-btn[data-p="news"]');
    if (nb) nb.classList.add('on');
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('on'); });
    page.classList.add('on');
    page.style.display = '';
    if (window.__ct_applyLang) window.__ct_applyLang();
    if (window.__ct_loadNews) window.__ct_loadNews(false);
    else fillNewsFallback();
  }

  async function fillNewsFallback() {
    var box = $('newsFeed');
    if (!box) return;
    box.innerHTML = '<div class="muted">' + t('loading') + '</div>';
    try {
      var d = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=cryptocurrency%20OR%20bitcoin&tags=story&hitsPerPage=20')
        .then(function (r) { return r.json(); });
      var html = '';
      (d.hits || []).forEach(function (h) {
        if (!h.title || !h.url) return;
        html += '<div class="news-item"><a href="' + h.url + '" target="_blank" rel="noopener">' + h.title +
          '</a><div class="news-meta">HN</div></div>';
      });
      box.innerHTML = html || '<div class="muted">\u2014</div>';
    } catch (e) {
      box.innerHTML = '<div class="muted">\u2014</div>';
    }
  }

  var EXTRA_STOCKS = [
    { s: 'SPY', n: 'S&P 500 ETF' }, { s: 'QQQ', n: 'Nasdaq 100 ETF' }, { s: 'IWM', n: 'Russell 2000' },
    { s: 'DIA', n: 'Dow Jones ETF' }, { s: 'VOO', n: 'Vanguard S&P 500' },
    { s: 'NVDA', n: 'NVIDIA' }, { s: 'AAPL', n: 'Apple' }, { s: 'MSFT', n: 'Microsoft' },
    { s: 'GOOGL', n: 'Alphabet' }, { s: 'AMZN', n: 'Amazon' }, { s: 'META', n: 'Meta' },
    { s: 'TSLA', n: 'Tesla' }, { s: 'BRK.B', n: 'Berkshire B' }, { s: 'JPM', n: 'JPMorgan' },
    { s: 'V', n: 'Visa' }, { s: 'MA', n: 'Mastercard' }, { s: 'UNH', n: 'UnitedHealth' },
    { s: 'XOM', n: 'Exxon' }, { s: 'JNJ', n: 'Johnson & Johnson' }, { s: 'WMT', n: 'Walmart' },
    { s: 'PG', n: 'Procter & Gamble' }, { s: 'HD', n: 'Home Depot' }, { s: 'CVX', n: 'Chevron' },
    { s: 'MRK', n: 'Merck' }, { s: 'ABBV', n: 'AbbVie' }, { s: 'KO', n: 'Coca-Cola' },
    { s: 'PEP', n: 'Pepsi' }, { s: 'COST', n: 'Costco' }, { s: 'AVGO', n: 'Broadcom' },
    { s: 'MCD', n: 'McDonalds' }, { s: 'CSCO', n: 'Cisco' }, { s: 'ACN', n: 'Accenture' },
    { s: 'NEE', n: 'NextEra' }, { s: 'PM', n: 'Philip Morris' }, { s: 'UPS', n: 'UPS' },
    { s: 'RTX', n: 'RTX' }, { s: 'CAT', n: 'Caterpillar' }, { s: 'IBM', n: 'IBM' },
    { s: 'QCOM', n: 'Qualcomm' }, { s: 'GE', n: 'GE' }, { s: 'SBUX', n: 'Starbucks' },
    { s: 'BA', n: 'Boeing' }, { s: 'GS', n: 'Goldman Sachs' }, { s: 'AXP', n: 'American Express' },
    { s: 'BLK', n: 'BlackRock' }, { s: 'C', n: 'Citigroup' }, { s: 'TMUS', n: 'T-Mobile' },
    { s: 'CMCSA', n: 'Comcast' }, { s: 'GILD', n: 'Gilead' }, { s: 'AMD', n: 'AMD' },
    { s: 'INTC', n: 'Intel' }, { s: 'NFLX', n: 'Netflix' }, { s: 'DIS', n: 'Disney' },
    { s: 'PYPL', n: 'PayPal' }, { s: 'UBER', n: 'Uber' }, { s: 'CRM', n: 'Salesforce' },
    { s: 'ORCL', n: 'Oracle' }, { s: 'ADBE', n: 'Adobe' }, { s: 'NOW', n: 'ServiceNow' },
    { s: 'INTU', n: 'Intuit' }, { s: 'AMAT', n: 'Applied Materials' }, { s: 'PANW', n: 'Palo Alto' },
    { s: 'CRWD', n: 'CrowdStrike' }, { s: 'SNOW', n: 'Snowflake' }, { s: 'SHOP', n: 'Shopify' },
    { s: 'COIN', n: 'Coinbase' }, { s: 'HOOD', n: 'Robinhood' }, { s: 'PLTR', n: 'Palantir' },
    { s: 'SOFI', n: 'SoFi' }, { s: 'RIVN', n: 'Rivian' }, { s: 'F', n: 'Ford' },
    { s: 'GM', n: 'General Motors' }, { s: 'SPOT', n: 'Spotify' }, { s: 'SNAP', n: 'Snap' },
    { s: 'ABNB', n: 'Airbnb' }, { s: 'DASH', n: 'DoorDash' }, { s: 'MELI', n: 'MercadoLibre' },
    { s: 'BABA', n: 'Alibaba' }, { s: 'JD', n: 'JD.com' }, { s: 'PDD', n: 'PDD Holdings' },
    { s: 'TSM', n: 'TSMC' }, { s: 'ASML', n: 'ASML' }, { s: 'SAP', n: 'SAP' },
    { s: 'NVO', n: 'Novo Nordisk' }, { s: 'SONY', n: 'Sony' }, { s: 'TM', n: 'Toyota' },
    { s: 'NKE', n: 'Nike' }, { s: 'PFE', n: 'Pfizer' }, { s: 'MRNA', n: 'Moderna' }
  ];

  function mergeStocksIntoPage() {
    var sel = $('spSym');
    if (sel && !sel.__expanded) {
      sel.__expanded = true;
      var have = {};
      Array.prototype.forEach.call(sel.options, function (o) { have[o.value] = 1; });
      EXTRA_STOCKS.forEach(function (st) {
        if (have[st.s]) return;
        var o = document.createElement('option');
        o.value = st.s;
        o.textContent = st.s + ' \u2014 ' + st.n;
        sel.appendChild(o);
      });
    }
    if ($('p-stocks') && !$('stockCustomWrap')) {
      var listCard = $('p-stocks').querySelector('.card');
      if (listCard) {
        var wrap = document.createElement('div');
        wrap.id = 'stockCustomWrap';
        wrap.style.cssText = 'display:flex;gap:.4rem;margin:.5rem 0;flex-wrap:wrap;align-items:center';
        wrap.innerHTML =
          '<input type="text" id="stockCustom" placeholder="AAPL, TSLA, SPY\u2026" ' +
          'style="flex:1;min-width:120px;padding:.45rem .6rem;border-radius:10px;border:1px solid var(--line,#2a2540);background:var(--bg2,#0b0a14);color:inherit"/>' +
          '<button type="button" class="btn" id="stockCustomAdd" style="padding:.45rem .8rem">+ ' + t('add') + '</button>';
        var head = listCard.querySelector('.card-head');
        if (head && head.nextSibling) listCard.insertBefore(wrap, head.nextSibling);
        else listCard.appendChild(wrap);
        if ($('stockCustomAdd')) {
          $('stockCustomAdd').onclick = function () {
            var v = (($('stockCustom') || {}).value || '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
            if (!v) return;
            openAnyStock(v);
            if ($('stockCustom')) $('stockCustom').value = '';
          };
        }
        if ($('stockCustom')) {
          $('stockCustom').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              if ($('stockCustomAdd')) $('stockCustomAdd').click();
            }
          });
        }
      }
    }
    var q = $('stockQ');
    if (q && !q.__enhanced) {
      q.__enhanced = true;
      q.placeholder = t('searchStock');
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var v = (q.value || '').trim().toUpperCase();
          if (/^[A-Z][A-Z0-9.\-]{0,9}$/.test(v)) openAnyStock(v);
        }
      });
    }
  }

  function openAnyStock(sym) {
    sym = (sym || '').toUpperCase();
    if (!sym) return;
    try {
      var cache = JSON.parse(localStorage.getItem('ct_stocks_v2') || '{}');
      if (!cache[sym]) cache[sym] = { price: null, ch: 0, name: sym, at: 0 };
      localStorage.setItem('ct_stocks_v2', JSON.stringify(cache));
    } catch (e) {}
    if (typeof openStock === 'function') {
      try { openStock(sym); return; } catch (e) {}
    }
    var det = $('stockDetail');
    if (det) {
      det.style.display = 'block';
      if ($('sdName')) $('sdName').textContent = sym;
      if ($('sdSym')) $('sdSym').textContent = sym;
      if ($('sdPrice')) $('sdPrice').textContent = '\u2026';
      var box = $('stockTv');
      if (box) {
        box.innerHTML = '';
        function mountTV() {
          if (!window.TradingView) return;
          var cid = 'stv_' + Date.now();
          var el = document.createElement('div');
          el.id = cid;
          el.style.cssText = 'height:100%;width:100%';
          box.appendChild(el);
          try {
            new TradingView.widget({
              autosize: true,
              symbol: 'NASDAQ:' + sym,
              interval: '15',
              theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark',
              style: '1',
              locale: (localStorage.getItem('ct_lang') || 'ru') === 'ru' ? 'ru' : 'en',
              enable_publishing: false,
              container_id: cid,
              allow_symbol_change: true,
              withdateranges: true
            });
          } catch (e) {}
        }
        if (window.TradingView) mountTV();
        else {
          var s = document.createElement('script');
          s.src = 'https://s3.tradingview.com/tv.js';
          s.onload = mountTV;
          document.head.appendChild(s);
        }
      }
      det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    fetchStockPrice(sym);
  }

  async function fetchStockPrice(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var urls = [
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl),
      'https://corsproxy.io/?' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { signal: AbortSignal.timeout(8000) });
        if (!r.ok) continue;
        var d = await r.json();
        if (d && d.contents) d = JSON.parse(d.contents);
        if (!d.chart) continue;
        var m = d.chart.result[0].meta;
        var p = m.regularMarketPrice, prev = m.chartPreviousClose || m.previousClose || p;
        var ch = prev ? ((p - prev) / prev * 100) : 0;
        try {
          var cache = JSON.parse(localStorage.getItem('ct_stocks_v2') || '{}');
          cache[sym] = { price: +p, ch: ch, name: m.shortName || sym, at: Date.now() };
          localStorage.setItem('ct_stocks_v2', JSON.stringify(cache));
        } catch (e) {}
        if ($('sdName')) $('sdName').textContent = m.shortName || sym;
        if ($('sdPrice') && window.CTData) $('sdPrice').textContent = window.CTData.formatMoney(p, localStorage.getItem('ct_cur') || 'usd');
        else if ($('sdPrice')) $('sdPrice').textContent = '$' + (+p).toFixed(2);
        if ($('sdCh')) {
          $('sdCh').textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
          $('sdCh').className = ch >= 0 ? 'up' : 'dn';
        }
        if (window.__ct_paintStocks) window.__ct_paintStocks();
        return;
      } catch (e) {}
    }
  }

  function addAllButtons() {
    var home = $('p-home');
    if (home && !$('btnAllCrypto')) {
      var search = home.querySelector('.search-wrap');
      var bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:.4rem;margin:.35rem 0 .5rem;flex-wrap:wrap';
      bar.innerHTML =
        '<button type="button" class="btn" id="btnAllCrypto" style="padding:.4rem .75rem;font-size:.8rem">' + t('allCrypto') + '</button>';
      if (search) search.appendChild(bar);
      else home.insertBefore(bar, home.firstChild);
      $('btnAllCrypto').onclick = function () {
        var q = $('q');
        if (q) { q.focus(); q.placeholder = 'BTC, ETH, SOL, PEPE\u2026'; }
        if ($('addTop')) $('addTop').click();
        var list = home.querySelector('.card');
        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    }

    var stocks = $('p-stocks');
    if (stocks && !$('btnAllStocks')) {
      var sw = stocks.querySelector('.search-wrap') || stocks;
      var bar2 = document.createElement('div');
      bar2.style.cssText = 'display:flex;gap:.4rem;margin:.35rem 0;flex-wrap:wrap';
      bar2.innerHTML =
        '<button type="button" class="btn" id="btnAllStocks" style="padding:.4rem .75rem;font-size:.8rem">' + t('allStocks') + '</button>';
      if (sw.classList && sw.classList.contains('search-wrap')) sw.appendChild(bar2);
      else stocks.insertBefore(bar2, stocks.firstChild);
      $('btnAllStocks').onclick = function () {
        var q = $('stockQ');
        if (q) { q.value = ''; q.focus(); }
        if (window.__ct_paintStocks) window.__ct_paintStocks();
        paintExtraStocks();
      };
    }
  }

  function paintExtraStocks() {
    var body = $('stockBody');
    if (!body) return;
    var existing = {};
    body.querySelectorAll('tr[data-s]').forEach(function (tr) {
      existing[tr.getAttribute('data-s')] = 1;
    });
    var cache = {};
    try { cache = JSON.parse(localStorage.getItem('ct_stocks_v2') || '{}'); } catch (e) {}
    var n = body.querySelectorAll('tr').length;
    EXTRA_STOCKS.forEach(function (st) {
      if (existing[st.s]) return;
      n += 1;
      var d = cache[st.s] || {};
      var price = d.price != null ? (window.CTData ? window.CTData.formatMoney(d.price, localStorage.getItem('ct_cur') || 'usd') : '$' + d.price) : '\u2014';
      var ch = d.ch || 0;
      var cls = ch > 0.05 ? 'up' : ch < -0.05 ? 'dn' : '';
      var tr = document.createElement('tr');
      tr.className = 's-tr';
      tr.setAttribute('data-s', st.s);
      tr.innerHTML = '<td>' + n + '</td><td><b>' + st.s + '</b> <span class="muted">' + st.n + '</span></td><td>' + price +
        '</td><td class="' + cls + '">' + (ch >= 0 ? '+' : '') + (+ch).toFixed(2) + '%</td>';
      tr.onclick = function () { openAnyStock(st.s); };
      body.appendChild(tr);
    });
  }

  function boot() {
    forceNewsNav();
    ensureNewsPage();
    addAllButtons();
    mergeStocksIntoPage();

    document.addEventListener('click', function (e) {
      var nb = e.target.closest('.nav-btn[data-p="news"]');
      if (nb) {
        e.preventDefault();
        e.stopPropagation();
        openNews();
      }
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () {
          mergeStocksIntoPage();
          addAllButtons();
        }, 200);
      }
      if (e.target.closest('.nav-btn[data-p="home"]')) {
        setTimeout(addAllButtons, 200);
      }
    }, true);

    setInterval(function () {
      forceNewsNav();
      if (!$('p-news')) ensureNewsPage();
    }, 2000);

    setTimeout(function () {
      forceNewsNav();
      ensureNewsPage();
      addAllButtons();
      mergeStocksIntoPage();
    }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
