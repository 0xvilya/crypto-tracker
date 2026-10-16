/* finance-ui v130 — brand, i18n, news tab, full lists, chart fix */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() { return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase(); }

  var I18N = {
    ru: {
      brand: 'Finance Tracker', allCrypto: '\u0412\u0441\u044f \u043a\u0440\u0438\u043f\u0442\u0430', allStocks: '\u0412\u0441\u0435 \u0430\u043a\u0446\u0438\u0438',
      news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', searchStock: '\u041f\u043e\u0438\u0441\u043a \u0430\u043a\u0446\u0438\u0438\u2026', searchCoin: '\u041f\u043e\u0438\u0441\u043a \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043d\u0435\u0442\u044b\u2026',
      add: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c', added: '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e', close: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c', loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026',
      stockList: '\u0421\u043f\u0438\u0441\u043e\u043a \u0430\u043a\u0446\u0438\u0439', coinList: '\u0421\u043f\u0438\u0441\u043e\u043a', browseAll: '\u0412\u0441\u0435 \u0430\u043a\u0442\u0438\u0432\u044b',
      addToBoard: '\u0412 \u0441\u043f\u0438\u0441\u043e\u043a', inBoard: '\u0423\u0436\u0435 \u0432 \u0441\u043f\u0438\u0441\u043a\u0435', noData: '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445',
      cryptoNews: '\u041a\u0440\u0438\u043f\u0442\u043e', stockNews: '\u0410\u043a\u0446\u0438\u0438', marketNews: '\u0420\u044b\u043d\u043e\u043a',
      searchPlaceholder: '\u0422\u0438\u043a\u0435\u0440 \u0438\u043b\u0438 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435\u2026', results: '\u041d\u0430\u0439\u0434\u0435\u043d\u043e',
      light: '\u0421\u0432\u0435\u0442\u043b\u0430\u044f', dark: '\u0422\u0451\u043c\u043d\u0430\u044f'
    },
    en: {
      brand: 'Finance Tracker', allCrypto: 'All crypto', allStocks: 'All stocks',
      news: 'News', searchStock: 'Search stock\u2026', searchCoin: 'Search any coin\u2026',
      add: 'Add', added: 'Added', close: 'Close', loading: 'Loading\u2026',
      stockList: 'Stock list', coinList: 'Watchlist', browseAll: 'All assets',
      addToBoard: 'Add to list', inBoard: 'In list', noData: 'No data',
      cryptoNews: 'Crypto', stockNews: 'Stocks', marketNews: 'Market',
      searchPlaceholder: 'Ticker or name\u2026', results: 'Found',
      light: 'Light', dark: 'Dark'
    }
  };
  function t(k) {
    var L = I18N[lang()] || I18N.ru;
    return L[k] || k;
  }

  function applyBrand() {
    var logo = document.querySelector('.logo');
    if (logo) {
      var span = logo.querySelector('span');
      logo.innerHTML = (span ? span.outerHTML + ' ' : '') + t('brand');
    }
    document.title = t('brand');
  }

  function paintI18n() {
    applyBrand();
    var q = $('q');
    if (q) q.placeholder = t('searchCoin');
    var sq = $('stockQ');
    if (sq) sq.placeholder = t('searchStock');
    var b1 = $('btnAllCrypto');
    if (b1) b1.textContent = t('allCrypto');
    var b2 = $('btnAllStocks');
    if (b2) b2.textContent = t('allStocks');
    document.querySelectorAll('button, .nav-btn span, h2, label').forEach(function (el) {
      var tx = (el.textContent || '').trim();
      if (tx === 'allStocks' || tx === 'allCrypto') el.textContent = t(tx === 'allStocks' ? 'allStocks' : 'allCrypto');
    });
    var nb = document.querySelector('.nav-btn[data-p="news"] span');
    if (nb) nb.textContent = t('news');
    var theme = $('themeBtn');
    if (theme) {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      theme.textContent = isLight ? t('dark') : t('light');
    }
    document.querySelectorAll('#newsTabs .tab').forEach(function (tb) {
      var k = tb.getAttribute('data-nt');
      if (k === 'crypto') tb.textContent = t('cryptoNews');
      if (k === 'stocks') tb.textContent = t('stockNews');
      if (k === 'market') tb.textContent = t('marketNews');
    });
    if (window.__ct_applyLang) { try { window.__ct_applyLang(); } catch (e) {} }
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
    btn.style.display = 'flex';
    btn.hidden = false;
    var sp = btn.querySelector('span');
    if (sp) sp.textContent = t('news');
  }

  function ensureNewsPage() {
    forceNewsNav();
    var wrap = document.querySelector('.wrap');
    if (!wrap) return null;
    var page = $('p-news');
    if (!page) {
      page = document.createElement('section');
      page.className = 'page';
      page.id = 'p-news';
      page.innerHTML =
        '<div class="card" style="min-height:65vh">' +
        '<div class="chart-tabs" id="newsTabs" style="flex-wrap:wrap">' +
        '<button type="button" class="tab on" data-nt="crypto">' + t('cryptoNews') + '</button>' +
        '<button type="button" class="tab" data-nt="stocks">' + t('stockNews') + '</button>' +
        '<button type="button" class="tab" data-nt="market">' + t('marketNews') + '</button>' +
        '<button type="button" class="btn-ghost" id="newsRefBtn" style="margin-left:auto">\u21bb</button>' +
        '</div>' +
        '<div id="newsFeed" data-tab="crypto" style="margin-top:.65rem;min-height:50vh"></div></div>';
      wrap.appendChild(page);
      page.querySelectorAll('#newsTabs .tab').forEach(function (tb) {
        tb.onclick = function () {
          page.querySelectorAll('#newsTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          tb.classList.add('on');
          $('newsFeed').setAttribute('data-tab', tb.getAttribute('data-nt'));
          loadNewsFeed(true);
        };
      });
      if ($('newsRefBtn')) $('newsRefBtn').onclick = function () { loadNewsFeed(true); };
    }
    return page;
  }

  var newsCache = { crypto: [], stocks: [], market: [], at: 0, lang: '' };

  async function loadNewsFeed(force) {
    var box = $('newsFeed');
    if (!box) return;
    var tab = box.getAttribute('data-tab') || 'crypto';
    var L = lang();
    if (!force && newsCache[tab] && newsCache[tab].length && newsCache.lang === L && Date.now() - newsCache.at < 60000) {
      paintNewsItems(box, newsCache[tab]);
      return;
    }
    box.innerHTML = '<div class="muted">' + t('loading') + '</div>';
    var queries = {
      crypto: 'cryptocurrency OR bitcoin OR ethereum OR solana',
      stocks: 'stock market OR nasdaq OR earnings',
      market: 'financial markets OR fed OR inflation'
    };
    var q = queries[tab] || queries.crypto;
    var items = [];
    try {
      var d = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=25', {
        signal: AbortSignal.timeout(10000)
      }).then(function (r) { return r.json(); });
      (d.hits || []).forEach(function (h) {
        if (h.title && h.url) items.push({ title: h.title, url: h.url, src: 'HN', ts: h.created_at });
      });
    } catch (e) {}
    if (tab === 'crypto' && items.length < 8) {
      try {
        var cg = await fetch('https://api.coingecko.com/api/v3/search/trending', { signal: AbortSignal.timeout(8000) }).then(function (r) { return r.json(); });
        (cg.coins || []).slice(0, 6).forEach(function (c) {
          var n = c.item;
          items.push({
            title: (L === 'ru' ? '\u0412 \u0442\u0440\u0435\u043d\u0434\u0435: ' : 'Trending: ') + n.name + ' (' + n.symbol + ')',
            url: 'https://www.coingecko.com/en/coins/' + n.id,
            src: 'CoinGecko',
            ts: new Date().toISOString()
          });
        });
      } catch (e) {}
    }
    if (L === 'ru' && items.length) items = await translateTitles(items);
    newsCache[tab] = items;
    newsCache.at = Date.now();
    newsCache.lang = L;
    paintNewsItems(box, items);
  }

  async function translateTitles(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = Object.assign({}, items[i]);
      try {
        if (!/[\u0400-\u04FF]/.test(it.title)) {
          var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=' + encodeURIComponent(it.title);
          var r = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (r.ok) {
            var j = await r.json();
            if (j && j[0] && j[0][0] && j[0][0][0]) it.title = j[0][0][0];
          }
        }
      } catch (e) {}
      out.push(it);
      if (i > 0 && i % 5 === 0) await new Promise(function (res) { setTimeout(res, 80); });
    }
    return out;
  }

  function paintNewsItems(box, items) {
    if (!items || !items.length) {
      box.innerHTML = '<div class="muted">' + t('noData') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      html += '<div class="news-item" style="padding:.55rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + it.url + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600">' +
        it.title + '</a>' +
        '<div class="muted" style="font-size:.7rem;margin-top:.2rem">' + (it.src || '') +
        (it.ts ? ' \u00b7 ' + new Date(it.ts).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US') : '') +
        '</div></div>';
    });
    box.innerHTML = html;
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
    paintI18n();
    loadNewsFeed(false);
  }

  function ensureModal() {
    if ($('assetModal')) return $('assetModal');
    var m = document.createElement('div');
    m.id = 'assetModal';
    m.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);padding:max(12px,env(safe-area-inset-top)) 12px 80px;overflow:auto';
    m.innerHTML =
      '<div style="max-width:560px;margin:0 auto;background:var(--card,#12101c);border:1px solid rgba(168,85,247,.25);border-radius:16px;padding:1rem">' +
      '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem">' +
      '<b id="assetModalTitle" style="font-size:1.05rem;flex:1"></b>' +
      '<button type="button" class="btn-ghost" id="assetModalClose">\u2715</button></div>' +
      '<input type="search" id="assetModalQ" placeholder="" style="width:100%;padding:.55rem .7rem;border-radius:10px;border:1px solid var(--line,#2a2540);background:var(--bg2,#0b0a14);color:inherit;margin-bottom:.65rem"/>' +
      '<div id="assetModalList" style="max-height:60vh;overflow:auto"></div></div>';
    document.body.appendChild(m);
    $('assetModalClose').onclick = function () { m.style.display = 'none'; };
    m.addEventListener('click', function (e) { if (e.target === m) m.style.display = 'none'; });
    return m;
  }

  var CRYPTO_TOP = [];
  var STOCKS_ALL = [
    ['AAPL','Apple'],['MSFT','Microsoft'],['GOOGL','Alphabet'],['AMZN','Amazon'],['NVDA','NVIDIA'],
    ['TSLA','Tesla'],['META','Meta'],['AMD','AMD'],['NFLX','Netflix'],['JPM','JPMorgan'],
    ['V','Visa'],['MA','Mastercard'],['BABA','Alibaba'],['DIS','Disney'],['CRM','Salesforce'],
    ['ORCL','Oracle'],['ADBE','Adobe'],['INTC','Intel'],['PYPL','PayPal'],['UBER','Uber'],
    ['COIN','Coinbase'],['PLTR','Palantir'],['SHOP','Shopify'],['SQ','Block'],['SNOW','Snowflake'],
    ['CRWD','CrowdStrike'],['PANW','Palo Alto'],['ABNB','Airbnb'],['SPOT','Spotify'],['NKE','Nike'],
    ['BA','Boeing'],['CAT','Caterpillar'],['GS','Goldman'],['WMT','Walmart'],['KO','Coca-Cola'],
    ['PEP','Pepsi'],['MCD','McDonalds'],['COST','Costco'],['XOM','Exxon'],['CVX','Chevron'],
    ['JNJ','J&J'],['PFE','Pfizer'],['MRNA','Moderna'],['TSM','TSMC'],['ASML','ASML'],
    ['SAP','SAP'],['NVO','Novo Nordisk'],['TM','Toyota'],['SONY','Sony'],['SPY','S&P 500 ETF'],
    ['QQQ','Nasdaq 100'],['IWM','Russell 2000'],['DIA','Dow ETF'],['VOO','Vanguard 500'],
    ['HOOD','Robinhood'],['SOFI','SoFi'],['RIVN','Rivian'],['F','Ford'],['GM','GM'],
    ['SNAP','Snap'],['PINS','Pinterest'],['ZM','Zoom'],['DKNG','DraftKings'],['MELI','MercadoLibre'],
    ['SE','Sea'],['JD','JD.com'],['PDD','PDD'],['IBM','IBM'],['QCOM','Qualcomm'],
    ['AVGO','Broadcom'],['TXN','Texas Instruments'],['AMAT','Applied Materials'],['NOW','ServiceNow'],
    ['INTU','Intuit'],['BKNG','Booking'],['SBUX','Starbucks'],['AXP','Amex'],['BLK','BlackRock'],
    ['C','Citigroup'],['WFC','Wells Fargo'],['UNH','UnitedHealth'],['LLY','Eli Lilly'],['ABBV','AbbVie']
  ];

  async function openCryptoBrowser() {
    var m = ensureModal();
    $('assetModalTitle').textContent = t('allCrypto');
    $('assetModalQ').placeholder = t('searchPlaceholder');
    $('assetModalQ').value = '';
    m.style.display = 'block';
    var list = $('assetModalList');
    list.innerHTML = '<div class="muted">' + t('loading') + '</div>';
    if (!CRYPTO_TOP.length) {
      try {
        var d = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false', {
          signal: AbortSignal.timeout(12000)
        }).then(function (r) { return r.json(); });
        CRYPTO_TOP = (d || []).map(function (c) {
          return { id: c.id, sym: (c.symbol || '').toUpperCase(), name: c.name, price: c.current_price, ch: c.price_change_percentage_24h, img: c.image };
        });
      } catch (e) {
        CRYPTO_TOP = [
          { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin' }, { id: 'ethereum', sym: 'ETH', name: 'Ethereum' },
          { id: 'solana', sym: 'SOL', name: 'Solana' }, { id: 'binancecoin', sym: 'BNB', name: 'BNB' },
          { id: 'ripple', sym: 'XRP', name: 'XRP' }, { id: 'cardano', sym: 'ADA', name: 'Cardano' },
          { id: 'dogecoin', sym: 'DOGE', name: 'Dogecoin' }, { id: 'the-open-network', sym: 'TON', name: 'Toncoin' }
        ];
      }
    }
    function render(filter) {
      var f = (filter || '').toLowerCase();
      var html = '';
      CRYPTO_TOP.forEach(function (c) {
        if (f && (c.sym + ' ' + c.name + ' ' + c.id).toLowerCase().indexOf(f) < 0) return;
        var price = c.price != null ? (window.CTData ? window.CTData.formatMoney(c.price, localStorage.getItem('ct_cur') || 'usd') : '$' + c.price) : '\u2014';
        var ch = c.ch != null ? ((c.ch >= 0 ? '+' : '') + (+c.ch).toFixed(2) + '%') : '';
        var cls = c.ch > 0 ? 'up' : c.ch < 0 ? 'dn' : '';
        html += '<div class="asset-row" data-id="' + c.id + '" data-sym="' + c.sym + '" style="display:flex;align-items:center;gap:.5rem;padding:.5rem 0;border-bottom:1px solid rgba(168,85,247,.1);cursor:pointer">' +
          (c.img ? '<img src="' + c.img + '" width="22" height="22" style="border-radius:50%"/>' : '') +
          '<div style="flex:1"><b>' + c.sym + '</b> <span class="muted">' + c.name + '</span></div>' +
          '<div style="text-align:right"><div>' + price + '</div><div class="' + cls + '" style="font-size:.72rem">' + ch + '</div></div>' +
          '<button type="button" class="btn-ghost asset-add" data-id="' + c.id + '" data-sym="' + c.sym + '" style="margin-left:.3rem">+</button></div>';
      });
      list.innerHTML = html || '<div class="muted">\u2014</div>';
      list.querySelectorAll('.asset-row').forEach(function (row) {
        row.onclick = function (e) {
          if (e.target.classList.contains('asset-add')) return;
          addCoinToBoard(row.getAttribute('data-id'), row.getAttribute('data-sym'));
          m.style.display = 'none';
        };
      });
      list.querySelectorAll('.asset-add').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          addCoinToBoard(btn.getAttribute('data-id'), btn.getAttribute('data-sym'));
          btn.textContent = '\u2713';
        };
      });
    }
    render('');
    $('assetModalQ').oninput = function () { render(this.value); };
  }

  function addCoinToBoard(id, sym) {
    try { if (typeof addToWatch === 'function') { addToWatch(id); return; } } catch (e) {}
    try {
      var key = 'ct_watch';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      if (list.indexOf(id) < 0) { list.push(id); localStorage.setItem(key, JSON.stringify(list)); }
    } catch (e) {}
    if ($('refBtn')) $('refBtn').click();
    else if (typeof softRefresh === 'function') softRefresh();
    try { if (typeof openCoin === 'function') openCoin(id); } catch (e) {}
  }

  function openStockBrowser() {
    var m = ensureModal();
    $('assetModalTitle').textContent = t('allStocks');
    $('assetModalQ').placeholder = t('searchPlaceholder');
    $('assetModalQ').value = '';
    m.style.display = 'block';
    var list = $('assetModalList');
    function render(filter) {
      var f = (filter || '').toLowerCase();
      var html = '';
      STOCKS_ALL.forEach(function (pair) {
        var s = pair[0], n = pair[1];
        if (f && (s + ' ' + n).toLowerCase().indexOf(f) < 0) return;
        html += '<div class="asset-row" data-s="' + s + '" style="display:flex;align-items:center;gap:.5rem;padding:.5rem 0;border-bottom:1px solid rgba(168,85,247,.1);cursor:pointer">' +
          '<div style="flex:1"><b>' + s + '</b> <span class="muted">' + n + '</span></div>' +
          '<button type="button" class="btn-ghost asset-add" data-s="' + s + '">+</button></div>';
      });
      list.innerHTML = html || '<div class="muted">\u2014</div>';
      list.querySelectorAll('.asset-row').forEach(function (row) {
        row.onclick = function (e) {
          if (e.target.classList.contains('asset-add')) return;
          openAnyStock(row.getAttribute('data-s'));
          m.style.display = 'none';
        };
      });
      list.querySelectorAll('.asset-add').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          openAnyStock(btn.getAttribute('data-s'));
          btn.textContent = '\u2713';
        };
      });
    }
    render('');
    $('assetModalQ').oninput = function () { render(this.value); };
  }

  function openAnyStock(sym) {
    sym = (sym || '').toUpperCase();
    if (!sym) return;
    if (typeof openStock === 'function') { try { openStock(sym); return; } catch (e) {} }
    var inp = $('stockCustom');
    if (inp) { inp.value = sym; if ($('stockCustomAdd')) $('stockCustomAdd').click(); }
  }

  function fixChartMapping() {
    if (window.__ct_chartMapFixed) return;
    window.__ct_chartMapFixed = true;
  }

  function wireButtons() {
    var b1 = $('btnAllCrypto');
    if (b1) {
      b1.textContent = t('allCrypto');
      b1.onclick = function (e) { e.preventDefault(); openCryptoBrowser(); };
    } else {
      var home = $('p-home');
      if (home && !$('btnAllCrypto')) {
        var bar = document.createElement('div');
        bar.style.cssText = 'margin:.35rem 0';
        bar.innerHTML = '<button type="button" class="btn" id="btnAllCrypto" style="width:100%;padding:.55rem;font-size:.9rem">' + t('allCrypto') + '</button>';
        var sw = home.querySelector('.search-wrap');
        if (sw) sw.appendChild(bar);
        else home.insertBefore(bar, home.firstChild);
        $('btnAllCrypto').onclick = function () { openCryptoBrowser(); };
      }
    }
    var b2 = $('btnAllStocks');
    if (b2) {
      b2.textContent = t('allStocks');
      b2.onclick = function (e) { e.preventDefault(); openStockBrowser(); };
    } else {
      var stocks = $('p-stocks');
      if (stocks && !$('btnAllStocks')) {
        var bar2 = document.createElement('div');
        bar2.style.cssText = 'margin:.35rem 0';
        bar2.innerHTML = '<button type="button" class="btn" id="btnAllStocks" style="width:100%;padding:.55rem;font-size:.9rem">' + t('allStocks') + '</button>';
        stocks.insertBefore(bar2, stocks.firstChild);
        $('btnAllStocks').onclick = function () { openStockBrowser(); };
      }
    }
  }

  function boot() {
    applyBrand();
    forceNewsNav();
    ensureNewsPage();
    paintI18n();
    wireButtons();
    fixChartMapping();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        e.preventDefault();
        e.stopPropagation();
        openNews();
      }
      if (e.target.closest('#btnAllCrypto')) {
        e.preventDefault();
        openCryptoBrowser();
      }
      if (e.target.closest('#btnAllStocks')) {
        e.preventDefault();
        openStockBrowser();
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__finUi) {
      langSel.__finUi = true;
      langSel.addEventListener('change', function () {
        localStorage.setItem('ct_lang', langSel.value);
        paintI18n();
        newsCache.at = 0;
        if ($('p-news') && $('p-news').classList.contains('on')) loadNewsFeed(true);
      });
    }

    setInterval(function () {
      forceNewsNav();
      paintI18n();
      wireButtons();
    }, 2500);

    setTimeout(function () {
      forceNewsNav();
      paintI18n();
      wireButtons();
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
