/* core-ui v135 — finance-only news, working category tabs, stock prices */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var d = {
      ru: { news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', crypto: '\u041a\u0440\u0438\u043f\u0442\u043e', stocks: '\u0410\u043a\u0446\u0438\u0438', market: '\u0420\u044b\u043d\u043e\u043a',
        loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', empty: '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439', updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e',
        allCrypto: '\u0412\u0441\u044f \u043a\u0440\u0438\u043f\u0442\u0430', allStocks: '\u0412\u0441\u0435 \u0430\u043a\u0446\u0438\u0438', search: '\u041f\u043e\u0438\u0441\u043a\u2026' },
      en: { news: 'News', crypto: 'Crypto', stocks: 'Stocks', market: 'Market',
        loading: 'Loading\u2026', empty: 'No news', updated: 'Updated',
        allCrypto: 'All crypto', allStocks: 'All stocks', search: 'Search\u2026' }
    };
    return (d[lang()] || d.ru)[k] || k;
  }

  var FINANCE_OK = /bitcoin|btc|ethereum|eth|crypto|blockchain|defi|nft|token|altcoin|solana|xrp|ripple|binance|coinbase|ledger|wallet|mining|halving|stablecoin|tether|usdt|usdc|web3|satoshi|vitalik|memecoin|dogecoin|market cap|bull market|bear market|stock|nasdaq|nyse|s&p|dow jones|equity|share price|earnings|ipo|sec |cftc|fed |federal reserve|interest rate|inflation|treasury|bond|etf|wall street|fintech|trading|trader|portfolio|dividend|revenue|profit|forex|commodity|gold price|oil price|gdp|recession|bullish|bearish|options|futures|hedge|asset|invest|fund|capital|liquidity|volatility|rally|correction|resistance|support|chart|exchange|broker|ticker/i;
  var FINANCE_BAD = /\b(cyprus|hotel|son died|fell from|murder|celebrity|football|soccer|nba|nfl|recipe|cooking|movie|film|actor|actress|singer|album|olympics|weather|earthquake|flood)\b/i;

  function isFinanceNews(title, src) {
    var text = (title || '') + ' ' + (src || '');
    if (FINANCE_BAD.test(text)) return false;
    if (/gas:|gwei|etherscan/i.test(text)) return false;
    if ((title || '').length < 25) return false;
    return FINANCE_OK.test(text);
  }

  var newsState = { tab: 'crypto', items: {}, at: {}, translated: {}, loading: false, timer: null };

  function ensureNewsUI() {
    var wrap = document.querySelector('.wrap');
    if (!wrap) return;
    var page = $('p-news');
    if (!page) {
      page = document.createElement('section');
      page.id = 'p-news';
      page.className = 'page';
      wrap.appendChild(page);
    }
    if (!$('newsFeed') || !$('newsCatTabs')) {
      page.innerHTML =
        '<div class="card" style="min-height:70vh">' +
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">' +
        '<h2 style="margin:0;flex:1" id="newsTitle">' + t('news') + '</h2>' +
        '<span class="muted" id="newsUpdated" style="font-size:.7rem"></span>' +
        '<button type="button" class="btn-ghost" id="newsRefreshBtn">\u21bb</button></div>' +
        '<div class="chart-tabs" id="newsCatTabs" style="flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem">' +
        '<button type="button" class="tab on" data-nt="crypto">' + t('crypto') + '</button>' +
        '<button type="button" class="tab" data-nt="stocks">' + t('stocks') + '</button>' +
        '<button type="button" class="tab" data-nt="market">' + t('market') + '</button>' +
        '<button type="button" class="tab" data-nt="btc">BTC</button>' +
        '<button type="button" class="tab" data-nt="eth">ETH</button></div>' +
        '<div id="newsFeed" style="min-height:55vh"></div></div>';
    }
    page.querySelectorAll('#newsCatTabs .tab').forEach(function (tb) {
      tb.onclick = function () {
        page.querySelectorAll('#newsCatTabs .tab').forEach(function (x) { x.classList.remove('on'); });
        tb.classList.add('on');
        newsState.tab = tb.getAttribute('data-nt') || 'crypto';
        paintNews();
        loadNews(true);
      };
    });
    if ($('newsRefreshBtn')) $('newsRefreshBtn').onclick = function () { loadNews(true); };
    var nav = $('nav');
    if (nav) {
      nav.style.setProperty('grid-template-columns', 'repeat(6,minmax(0,1fr))', 'important');
      var btn = document.querySelector('.nav-btn[data-p="news"]');
      if (btn) {
        btn.style.setProperty('display', 'flex', 'important');
        btn.hidden = false;
        var sp = btn.querySelector('span');
        if (sp) sp.textContent = t('news');
      }
    }
  }

  function openNews() {
    ensureNewsUI();
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('on'); });
    var nb = document.querySelector('.nav-btn[data-p="news"]');
    if (nb) nb.classList.add('on');
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('on'); });
    var page = $('p-news');
    page.classList.add('on');
    page.style.display = '';
    if ($('newsTitle')) $('newsTitle').textContent = t('news');
    var map = { crypto: t('crypto'), stocks: t('stocks'), market: t('market'), btc: 'BTC', eth: 'ETH' };
    document.querySelectorAll('#newsCatTabs .tab').forEach(function (tb) {
      var k = tb.getAttribute('data-nt');
      if (map[k]) tb.textContent = map[k];
    });
    paintNews();
    loadNews(false);
    if (newsState.timer) clearInterval(newsState.timer);
    newsState.timer = setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) loadNews(true);
    }, 30000);
  }

  async function fetchCV(limit) {
    try {
      var r = await fetch('https://cryptocurrency.cv/api/news?limit=' + (limit || 60), { signal: AbortSignal.timeout(10000) });
      if (!r.ok) return [];
      var d = await r.json();
      var arts = d.articles || d.data || [];
      if (!Array.isArray(arts)) return [];
      return arts.map(function (a) {
        return {
          id: 'cv-' + (a.link || a.title || '').slice(-36),
          title: a.title || '',
          url: a.link || a.url || '#',
          src: a.source || 'News',
          ts: a.pubDate || a.publishedAt || new Date().toISOString()
        };
      }).filter(function (a) { return isFinanceNews(a.title, a.src); });
    } catch (e) { return []; }
  }

  async function fetchHN(q) {
    try {
      var r = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=25', {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return [];
      var d = await r.json();
      return (d.hits || []).filter(function (h) {
        return h.title && h.url && isFinanceNews(h.title, 'HN');
      }).map(function (h) {
        return { id: 'hn-' + h.objectID, title: h.title, url: h.url, src: 'HN', ts: h.created_at };
      });
    } catch (e) { return []; }
  }

  async function translateOne(text) {
    var L = lang();
    if (L === 'en' || !text) return text;
    if (/[\u0400-\u04FF]/.test(text)) return text;
    var key = L + ':' + text;
    if (newsState.translated[key]) return newsState.translated[key];
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + L + '&dt=t&q=' + encodeURIComponent(text.slice(0, 380));
      var r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      if (out) { newsState.translated[key] = out; return out; }
    } catch (e) {}
    return text;
  }

  async function translateBatch(items) {
    if (lang() === 'en') return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = Object.assign({}, items[i]);
      it.title = await translateOne(it.title);
      out.push(it);
      if (i % 5 === 4) await new Promise(function (r) { setTimeout(r, 50); });
    }
    return out;
  }

  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      var k = (it.title || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 55);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out;
  }

  function filterForTab(items, tab) {
    if (tab === 'crypto') {
      return items.filter(function (i) {
        return /bitcoin|btc|ethereum|eth|crypto|blockchain|defi|token|coin|solana|binance|wallet|ledger|nft|web3|altcoin|stablecoin|mining|exchange/i.test(i.title + ' ' + i.src);
      });
    }
    if (tab === 'btc') return items.filter(function (i) { return /bitcoin|\bbtc\b/i.test(i.title); });
    if (tab === 'eth') return items.filter(function (i) { return /ethereum|\beth\b|vitalik/i.test(i.title); });
    if (tab === 'stocks') {
      return items.filter(function (i) {
        return /stock|nasdaq|nyse|s&p|dow|share|equity|earnings|ipo|wall street|apple|tesla|nvidia|microsoft|meta|amazon/i.test(i.title);
      });
    }
    if (tab === 'market') {
      return items.filter(function (i) {
        return /fed|federal reserve|inflation|interest rate|treasury|bond|gdp|recession|economy|macro|etf|commodity|gold|oil price/i.test(i.title);
      });
    }
    return items;
  }

  async function loadNews(force) {
    if (newsState.loading && !force) return;
    var tab = newsState.tab;
    var age = Date.now() - (newsState.at[tab] || 0);
    if (!force && newsState.items[tab] && newsState.items[tab].length && age < 20000) {
      paintNews();
      return;
    }
    newsState.loading = true;
    var box = $('newsFeed');
    if (box && (!newsState.items[tab] || !newsState.items[tab].length)) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('loading') + '</div>';
    }
    try {
      var qMap = {
        crypto: 'cryptocurrency OR bitcoin OR ethereum',
        stocks: 'stock market OR nasdaq OR earnings',
        market: 'federal reserve OR inflation OR economy',
        btc: 'bitcoin',
        eth: 'ethereum'
      };
      var parts = await Promise.all([fetchCV(60), fetchHN(qMap[tab] || qMap.crypto)]);
      var merged = dedupe([].concat(parts[0], parts[1]));
      var filtered = filterForTab(merged, tab);
      if (filtered.length < 3) filtered = merged.slice(0, 30);
      filtered.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });
      filtered = await translateBatch(filtered.slice(0, 40));
      if (filtered.length) {
        newsState.items[tab] = filtered;
        newsState.at[tab] = Date.now();
      }
      paintNews();
    } catch (e) {
      if (box && (!newsState.items[tab] || !newsState.items[tab].length)) {
        box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      }
    }
    newsState.loading = false;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function paintNews() {
    var box = $('newsFeed');
    if (!box) return;
    var items = newsState.items[newsState.tab] || [];
    if ($('newsUpdated') && newsState.at[newsState.tab]) {
      $('newsUpdated').textContent = t('updated') + ' ' + new Date(newsState.at[newsState.tab]).toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-US');
    }
    if (!items.length) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('empty') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      var time = '';
      try {
        var d = new Date(it.ts);
        if (!isNaN(d.getTime())) {
          time = d.toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          });
        }
      } catch (e) {}
      html += '<article style="padding:.7rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        esc(it.title) + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.25rem">' + esc(it.src) + (time ? ' \u00b7 ' + time : '') + '</div></article>';
    });
    box.innerHTML = html;
  }

  var STOCK_LIST = [
    ['AAPL','Apple'],['MSFT','Microsoft'],['GOOGL','Alphabet'],['AMZN','Amazon'],['NVDA','NVIDIA'],
    ['TSLA','Tesla'],['META','Meta'],['AMD','AMD'],['NFLX','Netflix'],['JPM','JPMorgan'],
    ['V','Visa'],['MA','Mastercard'],['BABA','Alibaba'],['DIS','Disney'],['CRM','Salesforce'],
    ['ORCL','Oracle'],['ADBE','Adobe'],['INTC','Intel'],['PYPL','PayPal'],['UBER','Uber'],
    ['COIN','Coinbase'],['PLTR','Palantir'],['KO','Coca-Cola'],['PEP','Pepsi'],['NKE','Nike'],
    ['BA','Boeing'],['WMT','Walmart'],['XOM','Exxon'],['JNJ','J&J'],['COST','Costco']
  ];
  var stockCache = {};
  try { stockCache = JSON.parse(localStorage.getItem('ct_stocks_v3') || '{}'); } catch (e) {}

  function cur() {
    return (localStorage.getItem('ct_cur') || ($('curSel') && $('curSel').value) || 'usd').toLowerCase();
  }
  var fxRate = 1, fxAt = 0;
  async function loadFx() {
    if (Date.now() - fxAt < 180000) return fxRate;
    var c = cur();
    if (c === 'usd') { fxRate = 1; fxAt = Date.now(); return 1; }
    try {
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(6000) });
      var d = await r.json();
      fxRate = c === 'eur' ? (d.rates.EUR || 1) : c === 'rub' ? (d.rates.RUB || 1) : c === 'pln' ? (d.rates.PLN || 1) : 1;
      fxAt = Date.now();
    } catch (e) {}
    return fxRate;
  }
  function fmtMoney(v) {
    if (v == null || isNaN(+v)) return '\u2014';
    var c = cur();
    var s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v * fxRate;
    if (Math.abs(n) >= 1000) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return s + n.toFixed(2);
  }

  async function fetchYahoo(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?interval=1d&range=5d';
    var proxies = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < proxies.length; i++) {
      try {
        var r = await fetch(proxies[i], { signal: AbortSignal.timeout(7000) });
        if (!r.ok) continue;
        var d = await r.json();
        var res = d.chart && d.chart.result && d.chart.result[0];
        if (!res || !res.meta) continue;
        var m = res.meta;
        var p = m.regularMarketPrice;
        var prev = m.chartPreviousClose || m.previousClose || p;
        if (p == null) continue;
        return { price: +p, ch: prev ? ((p - prev) / prev * 100) : 0, at: Date.now() };
      } catch (e) {}
    }
    return null;
  }

  async function refreshStocks(force) {
    await loadFx();
    var page = $('p-stocks');
    var body = $('stocksBody');
    if (!body && page) body = page.querySelector('tbody');
    if (!body) return;

    function paint() {
      var html = '';
      STOCK_LIST.forEach(function (pair, idx) {
        var s = pair[0], n = pair[1];
        var d = stockCache[s];
        var price = d && d.price != null ? fmtMoney(d.price) : '\u2014';
        var ch = d && d.ch != null ? ((d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%') : '\u2014';
        var cls = d && d.ch > 0 ? 'up' : d && d.ch < 0 ? 'dn' : '';
        html += '<tr class="s-tr" data-s="' + s + '"><td>' + (idx + 1) + '</td><td><b>' + s + '</b> <span class="muted">' + n + '</span></td>' +
          '<td>' + price + '</td><td class="' + cls + '">' + ch + '</td></tr>';
      });
      body.innerHTML = html;
    }
    paint();

    for (var i = 0; i < STOCK_LIST.length; i += 4) {
      var batch = STOCK_LIST.slice(i, i + 4);
      await Promise.all(batch.map(async function (pair) {
        var s = pair[0];
        var age = stockCache[s] ? (Date.now() - (stockCache[s].at || 0)) : 1e12;
        if (!force && age < 60000) return;
        var res = await fetchYahoo(s);
        if (res) {
          stockCache[s] = res;
          try { localStorage.setItem('ct_stocks_v3', JSON.stringify(stockCache)); } catch (e) {}
        }
      }));
      paint();
      await new Promise(function (r) { setTimeout(r, 150); });
    }
  }

  window.__ct_loadStocks = function () { refreshStocks(false); };

  function boot() {
    ensureNewsUI();
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        e.preventDefault(); e.stopPropagation(); openNews();
      }
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () { refreshStocks(false); }, 120);
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__cui135) {
      langSel.__cui135 = true;
      langSel.addEventListener('change', function () {
        newsState.translated = {};
        newsState.at = {};
        newsState.items = {};
        if ($('p-news') && $('p-news').classList.contains('on')) {
          if ($('newsTitle')) $('newsTitle').textContent = t('news');
          loadNews(true);
        }
      });
    }
    var curSel = $('curSel');
    if (curSel && !curSel.__cui135) {
      curSel.__cui135 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(function () {
          if ($('p-stocks') && $('p-stocks').classList.contains('on')) refreshStocks(false);
        });
      });
    }

    setInterval(function () {
      ensureNewsUI();
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) refreshStocks(false);
    }, 45000);

    setTimeout(function () { ensureNewsUI(); refreshStocks(false); }, 1500);
  }

  window.__ct_openNews = openNews;
  window.__ct_loadNews = function (f) { ensureNewsUI(); loadNews(!!f); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
