(function () {
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  var SITE = 'https://0xvilya.github.io/crypto-tracker/';
  var DEFAULTS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
  var TV = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', toncoin: 'BINANCE:TONUSDT', pepe: 'BINANCE:PEPEUSDT'
  };
  var EX = [
    { n: 'Binance', u: function (s) { return 'https://www.binance.com/en/trade/' + s.toUpperCase() + '_USDT'; } },
    { n: 'Bybit', u: function (s) { return 'https://www.bybit.com/trade/usdt/' + s.toUpperCase() + 'USDT'; } },
    { n: 'OKX', u: function (s) { return 'https://www.okx.com/trade-spot/' + s.toLowerCase() + '-usdt'; } }
  ];
  var CHAINS = { '0x1': 'Ethereum', '0x38': 'BNB Chain', '0x89': 'Polygon', '0xa4b1': 'Arbitrum', '0xa': 'Optimism', '0x2105': 'Base' };
  var CUR = { usd: { s: '$', l: 'en-US' }, eur: { s: '\u20ac', l: 'de-DE' }, rub: { s: '\u20bd', l: 'ru-RU' }, pln: { s: 'z\u0142', l: 'pl-PL' } };
  var RSS = [
    { name: 'Cointelegraph', url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss') },
    { name: 'CoinDesk', url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') }
  ];
  var WALLETS = [
    { id: 'metamask', name: 'MetaMask', badge: 'MM', deep: 'https://metamask.app.link/dapp/' + SITE.replace(/^https?:\/\//, '') },
    { id: 'trust', name: 'Trust Wallet', badge: 'TW', deep: 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(SITE) },
    { id: 'coinbase', name: 'Coinbase', badge: 'CB', deep: 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(SITE) },
    { id: 'okx', name: 'OKX Wallet', badge: 'OKX', deep: 'okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(SITE) },
    { id: 'phantom', name: 'Phantom', badge: 'PH', deep: 'https://phantom.app/ul/browse/' + encodeURIComponent(SITE) + '?ref=https://phantom.app' },
    { id: 'tonkeeper', name: 'Tonkeeper', badge: 'TK', deep: 'https://app.tonkeeper.com/ton-connect?v=2&id=&r=' + encodeURIComponent(JSON.stringify({manifestUrl: SITE + 'tonconnect-manifest.json', items: [{name: 'ton_addr'}]})) },
    { id: 'solflare', name: 'Solflare', badge: 'SF', deep: 'https://solflare.com/ul/v1/browse/' + encodeURIComponent(SITE) },
    { id: 'rabby', name: 'Rabby', badge: 'RB', deep: SITE },
    { id: 'brave', name: 'Brave', badge: 'BR', deep: SITE },
    { id: 'injected', name: 'Browser Web3', badge: 'W3', deep: null }
  ];
  var CHAIN_RPC = {
    eth: { rpc: 'https://cloudflare-eth.com', native: 'ETH', explorer: 'https://etherscan.io/address/' },
    bsc: { rpc: 'https://bsc-dataseed.binance.org', native: 'BNB', explorer: 'https://bscscan.com/address/' },
    polygon: { rpc: 'https://polygon-rpc.com', native: 'MATIC', explorer: 'https://polygonscan.com/address/' },
    arb: { rpc: 'https://arb1.arbitrum.io/rpc', native: 'ETH', explorer: 'https://arbiscan.io/address/' },
    op: { rpc: 'https://mainnet.optimism.io', native: 'ETH', explorer: 'https://optimistic.etherscan.io/address/' },
    base: { rpc: 'https://mainnet.base.org', native: 'ETH', explorer: 'https://basescan.org/address/' }
  };
  var COLORS = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316', '#06b6d4'];

  var list = JSON.parse(localStorage.getItem('ct_wl') || 'null') || DEFAULTS.slice();
  var savedPnL = JSON.parse(localStorage.getItem('ct_pnl') || '[]');
  var manualHold = JSON.parse(localStorage.getItem('ct_mh') || '[]');
  var selected = null, lastFetch = 0, account = null, provider = null;
  var newsCache = [], newsOrig = [], newsFilter = 'all';
  var currency = localStorage.getItem('ct_cur') || 'usd';
  if (!CUR[currency]) currency = 'usd';
  var lang = localStorage.getItem('ct_lang') || 'ru';
  var theme = localStorage.getItem('ct_theme') || 'dark';

  function $(id) { return document.getElementById(id); }
  function toast(m) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, 2600);
  }
  function cs() { return CUR[currency] || CUR.usd; }
  function fmt(v) {
    if (v == null || isNaN(v)) return '\u2014';
    var n = +v, m = cs(), d = n >= 1 ? 2 : n >= 0.01 ? 4 : n >= 1e-4 ? 6 : 8;
    try { return m.s + n.toLocaleString(m.l, { minimumFractionDigits: n >= 1 ? 2 : 0, maximumFractionDigits: d }); }
    catch (e) { return m.s + n.toFixed(Math.min(d, 6)); }
  }
  function pct(v) { if (v == null || isNaN(v)) return '\u2014'; return (v >= 0 ? '+' : '') + (+v).toFixed(2) + '%'; }
  function pc(v) { return v == null || isNaN(v) ? '' : (v >= 0 ? 'up' : 'down'); }
  function cacheGet(k) {
    try {
      var r = localStorage.getItem('c5_' + k); if (!r) return null;
      var o = JSON.parse(r);
      if (o.t && Date.now() - o.t > (o.ttl || 120000)) { localStorage.removeItem('c5_' + k); return null; }
      return o.d;
    } catch (e) { return null; }
  }
  function cacheSet(k, d, ttl) {
    try { localStorage.setItem('c5_' + k, JSON.stringify({ t: Date.now(), ttl: ttl || 120000, d: d })); } catch (e) {}
  }
  function cacheClear() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('c5_') === 0) keys.push(k);
    }
    keys.forEach(function (k) { localStorage.removeItem(k); });
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function api(url, retries) {
    retries = retries == null ? 3 : retries;
    var err;
    for (var i = 0; i <= retries; i++) {
      try {
        var g = 800 - (Date.now() - lastFetch);
        if (g > 0) await sleep(g);
        lastFetch = Date.now();
        var res = await fetch(url);
        if (res.status === 429) {
          if (i < retries) { await sleep(Math.min(2500 * Math.pow(1.5, i), 9000)); continue; }
          throw new Error('429');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) { err = e; if (i < retries) await sleep(500 * (i + 1)); }
    }
    throw err || new Error('net');
  }

  function go(p) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.toggle('on', el.id === 'p-' + p); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
    if (p === 'news') loadNews();
    if (p === 'port') { fillPnlCoins(); fillMhCoins(); renderHoldings(); renderManual(); }
    if (p === 'wallet') renderWallets();
    if (p === 'tools') { loadFG(); renderDom(); loadGas(); calcTP(); calcDCA(); }
  }
  var nav = $('nav');
  if (nav) nav.addEventListener('click', function (e) {
    var b = e.target.closest('.nav-btn');
    if (b) go(b.getAttribute('data-p'));
  });

  function applyTheme() {
    document.documentElement.classList.toggle('light', theme === 'light');
    var tb = $('themeBtn');
    if (tb) tb.textContent = theme === 'light' ? 'Light' : 'Dark';
    localStorage.setItem('ct_theme', theme);
  }

  async function loadGlobal() {
    try {
      var c = cacheGet('global');
      if (c) renderGlobal(c);
      var d = await api(API + '/global');
      cacheSet('global', d, 180000);
      renderGlobal(d);
    } catch (e) { console.error(e); }
  }
  function renderGlobal(data) {
    var g = (data && data.data) || {};
    var m = (g.total_market_cap && g.total_market_cap[currency]) || (g.total_market_cap && g.total_market_cap.usd) || 0;
    var ch = g.market_cap_change_percentage_24h_usd;
    var dom = (g.market_cap_percentage && g.market_cap_percentage.btc) || 0;
    var cap = m >= 1e12 ? (m / 1e12).toFixed(2) + 'T' : m >= 1e9 ? (m / 1e9).toFixed(2) + 'B' : (m / 1e6).toFixed(0) + 'M';
    var mc = $('mcapChip'); if (mc) mc.innerHTML = 'Cap: <b>' + cs().s + cap + '</b>';
    var dc = $('domChip'); if (dc) dc.innerHTML = 'BTC: <b>' + (+dom).toFixed(1) + '%</b>';
    var s24 = $('st24'); if (s24) s24.innerHTML = '<span class="' + pc(ch) + '">' + pct(ch) + '</span>';
    window._domData = g.market_cap_percentage || {};
  }

  async function loadWatch() {
    var body = $('wBody');
    if (!list.length) { if (body) body.innerHTML = '<tr><td colspan="5" class="empty">+</td></tr>'; return; }
    var key = 'wl_' + currency + '_' + list.slice().sort().join(',');
    var c = cacheGet(key);
    if (c) renderWatch(c);
    try {
      var d = await api(API + '/coins/markets?vs_currency=' + currency + '&ids=' + encodeURIComponent(list.join(',')) + '&order=market_cap_desc&sparkline=false&price_change_percentage=24h');
      cacheSet(key, d, 90000);
      d.forEach(function (x) { cacheSet('coin_' + currency + '_' + x.id, x, 90000); });
      renderWatch(d);
      fillConv(d);
    } catch (e) {
      console.error(e);
      if (!c && body) body.innerHTML = '<tr><td colspan="5" class="empty">Error \u2014 tap \u21bb</td></tr>';
    }
  }
  function renderWatch(data) {
    var body = $('wBody'); if (!body) return;
    var map = {};
    (data || []).forEach(function (c) { map[c.id] = c; });
    var rows = list.map(function (id) { return map[id]; }).filter(Boolean);
    body.innerHTML = rows.map(function (c, i) {
      return '<tr data-id="' + c.id + '"><td>' + (c.market_cap_rank || i + 1) + '</td><td><div class="coin"><img src="' + c.image + '" alt=""/><div><div class="nm">' + c.name + '</div><div class="sy">' + c.symbol + '</div></div></div></td><td class="pr">' + fmt(c.current_price) + '</td><td class="' + pc(c.price_change_percentage_24h) + '">' + pct(c.price_change_percentage_24h) + '</td><td><button type="button" class="xbtn" data-rm="' + c.id + '">\u00d7</button></td></tr>';
    }).join('');
    if (!selected && rows[0]) selectCoin(rows[0].id);
    else if (selected && map[selected]) updateDetail(map[selected]);
  }
  var wb = $('wBody');
  if (wb) wb.addEventListener('click', function (e) {
    var rm = e.target.getAttribute('data-rm');
    if (rm) {
      e.stopPropagation();
      list = list.filter(function (x) { return x !== rm; });
      localStorage.setItem('ct_wl', JSON.stringify(list));
      if (selected === rm) { selected = null; var det = $('detail'); if (det) det.style.display = 'none'; }
      loadWatch(); return;
    }
    var tr = e.target.closest('tr[data-id]');
    if (tr) selectCoin(tr.getAttribute('data-id'));
  });
  function updateDetail(coin) {
    var det = $('detail'); if (!det) return;
    det.style.display = 'block';
    $('dImg').src = coin.image || '';
    $('dName').textContent = coin.name;
    $('dSym').textContent = (coin.symbol || '').toUpperCase();
    $('dPrice').textContent = fmt(coin.current_price);
    $('dCh').innerHTML = '<span class="' + pc(coin.price_change_percentage_24h) + '">' + pct(coin.price_change_percentage_24h) + ' / 24h</span>';
    $('ex').innerHTML = EX.map(function (x) { return '<a href="' + x.u(coin.symbol) + '" target="_blank" rel="noopener">' + x.n + '</a>'; }).join('');
  }
  function loadTV(id) {
    var box = $('tv'); if (!box) return;
    box.innerHTML = '';
    var sym = TV[id];
    var coin = cacheGet('coin_' + currency + '_' + id);
    if (!sym && coin && coin.symbol) sym = 'BINANCE:' + coin.symbol.toUpperCase() + 'USDT';
    if (!sym) sym = 'BINANCE:BTCUSDT';
    if (typeof TradingView === 'undefined') { box.innerHTML = '<div class="empty">TV N/A</div>'; return; }
    try {
      new TradingView.widget({
        autosize: true, symbol: sym, interval: 'D',
        theme: theme === 'light' ? 'light' : 'dark', style: '1',
        locale: lang === 'ru' ? 'ru' : 'en',
        toolbar_bg: theme === 'light' ? '#f4f4f8' : '#12121a',
        enable_publishing: false, container_id: 'tv', height: 380, width: '100%'
      });
    } catch (e) {}
  }
  async function selectCoin(id) {
    selected = id;
    document.querySelectorAll('#wBody tr').forEach(function (tr) {
      tr.style.outline = tr.getAttribute('data-id') === id ? '1px solid var(--accent)' : '';
    });
    var coin = cacheGet('coin_' + currency + '_' + id);
    if (coin) updateDetail(coin);
    else {
      try {
        var d = await api(API + '/coins/markets?vs_currency=' + currency + '&ids=' + encodeURIComponent(id) + '&price_change_percentage=24h');
        if (d[0]) { cacheSet('coin_' + currency + '_' + id, d[0]); updateDetail(d[0]); }
      } catch (e) {}
    }
    loadTV(id);
  }

  var st;
  var qEl = $('q');
  if (qEl) qEl.addEventListener('input', function (e) {
    clearTimeout(st);
    var q = e.target.value.trim();
    var box = $('sr');
    if (!q) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = '<div class="empty">...</div>';
    st = setTimeout(function () {
      api(API + '/search?query=' + encodeURIComponent(q), 2).then(function (d) {
        var coins = (d.coins || []).slice(0, 12);
        box.innerHTML = coins.map(function (c) {
          return '<div class="sr-item" data-id="' + c.id + '" data-name="' + String(c.name).replace(/"/g, '') + '"><img src="' + (c.thumb || '') + '" alt=""/><div><div class="nm">' + c.name + '</div><div class="sy">' + (c.symbol || '') + '</div></div></div>';
        }).join('') || '<div class="empty">\u2014</div>';
      }).catch(function () { box.innerHTML = '<div class="empty">Error</div>'; });
    }, 320);
  });
  var sr = $('sr');
  if (sr) sr.addEventListener('click', function (e) {
    var it = e.target.closest('.sr-item');
    if (!it) return;
    var id = it.getAttribute('data-id'), name = it.getAttribute('data-name');
    if (!list.includes(id)) { list.unshift(id); localStorage.setItem('ct_wl', JSON.stringify(list)); toast(name + ' +'); }
    $('q').value = ''; sr.style.display = 'none';
    loadWatch().then(function () { selectCoin(id); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-wrap')) { var box = $('sr'); if (box) box.style.display = 'none'; }
  });

  async function loadTrend() {
    try {
      var c = cacheGet('trend'); if (c) renderTrend(c);
      var d = await api(API + '/search/trending');
      cacheSet('trend', d, 300000);
      renderTrend(d);
    } catch (e) {}
  }
  function renderTrend(d) {
    var el = $('trends'); if (!el) return;
    var coins = (d.coins || []).slice(0, 8);
    el.innerHTML = coins.map(function (x, i) {
      var c = x.item;
      return '<div class="sr-item" style="border:none;padding:.4rem 0;cursor:pointer" data-tid="' + c.id + '"><span class="muted" style="width:1.1rem">' + (i + 1) + '</span><img src="' + c.small + '" width="20" height="20" style="border-radius:50%"/><span>' + c.name + '</span></div>';
    }).join('');
  }
  var trends = $('trends');
  if (trends) trends.addEventListener('click', function (e) {
    var it = e.target.closest('[data-tid]'); if (!it) return;
    var id = it.getAttribute('data-tid');
    if (!list.includes(id)) { list.unshift(id); localStorage.setItem('ct_wl', JSON.stringify(list)); }
    loadWatch().then(function () { selectCoin(id); });
  });

  async function translateText(text, to) {
    if (!text || to === 'en') return text;
    try {
      var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 450)) + '&langpair=en|' + to;
      var r = await fetch(url).then(function (x) { return x.json(); });
      if (r && r.responseData && r.responseData.translatedText) return r.responseData.translatedText;
    } catch (e) {}
    return text;
  }
  async function loadNews() {
    var box = $('newsList');
    var cached = cacheGet('news');
    if (cached) { newsOrig = cached; await applyNewsLang(); }
    else if (box) box.innerHTML = '<div class="empty">...</div>';
    try {
      var all = [];
      for (var i = 0; i < RSS.length; i++) {
        try {
          var data = await fetch(RSS[i].url).then(function (r) { return r.json(); });
          if (data && data.items) {
            data.items.forEach(function (it) {
              all.push({
                title: it.title, link: it.link, date: it.pubDate, source: RSS[i].name,
                desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 160)
              });
            });
          }
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      newsOrig = all.slice(0, 40);
      cacheSet('news', newsOrig, 600000);
      await applyNewsLang();
    } catch (e) {
      if (!cached && box) box.innerHTML = '<div class="empty">Load error</div>';
    }
  }
  async function applyNewsLang() {
    if (lang === 'en') {
      newsCache = newsOrig.map(function (n) { return Object.assign({}, n); });
      renderNews(); return;
    }
    var box = $('newsList');
    if (box) box.innerHTML = '<div class="empty">\u041f\u0435\u0440\u0435\u0432\u043e\u0434...</div>';
    var out = [];
    for (var i = 0; i < Math.min(newsOrig.length, 20); i++) {
      var n = newsOrig[i];
      var t = await translateText(n.title, lang);
      var d = n.desc ? await translateText(n.desc, lang) : '';
      out.push({ title: t, link: n.link, date: n.date, source: n.source, desc: d });
      if (i % 4 === 3) await sleep(200);
    }
    newsCache = out;
    renderNews();
  }
  function renderNews() {
    var f = newsFilter;
    var KW = {
      BTC: /BITCOIN|\bBTC\b/, ETH: /ETHEREUM|\bETH\b/, SOL: /SOLANA|\bSOL\b/,
      XRP: /\bXRP\b|RIPPLE/, BNB: /\bBNB\b|BINANCE/, DOGE: /DOGE/, ADA: /CARDANO|\bADA\b/,
      TON: /\bTON\b|TONCOIN|TELEGRAM/, market: /MARKET|CRYPTO|FED|ETF|REGULATION|SEC|RATE|\u0420\u042b\u041d\u041e\u041a|\u041a\u0420\u0418\u041f\u0422\u041e/
    };
    var items = newsCache.filter(function (n) {
      if (f === 'all') return true;
      var t = (n.title + ' ' + (n.desc || '')).toUpperCase();
      var re = KW[f]; return re ? re.test(t) : t.indexOf(f) !== -1;
    });
    var box = $('newsList'); if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="empty">No news</div>'; updateOutlook([]); return; }
    box.innerHTML = items.slice(0, 25).map(function (n, idx) {
      var d = '';
      try { d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      return '<div class="news-item" style="animation-delay:' + (idx * 0.03) + 's"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.source + '</span>' + d + '</div>' + (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '\u2026</div>' : '') + '</div>';
    }).join('');
    updateOutlook(items);
  }
  function updateOutlook(items) {
    var text = items.map(function (n) { return n.title; }).join(' ').toLowerCase();
    var bull = (text.match(/surge|rally|soar|record|approve|etf|bull|\u0440\u043e\u0441\u0442|\u0440\u0430\u043b\u043b\u0438|\u0440\u0435\u043a\u043e\u0440\u0434|\u043e\u0434\u043e\u0431\u0440/g) || []).length;
    var bear = (text.match(/crash|drop|ban|hack|lawsuit|bear|\u043f\u0430\u0434\u0435\u043d\u0438|\u0437\u0430\u043f\u0440\u0435\u0442|\u0445\u0430\u043a|\u0438\u0441\u043a|\u0448\u0442\u0440\u0430\u0444/g) || []).length;
    var msg;
    if (bull > bear + 2) msg = lang === 'ru' ? '\ud83d\udcf0 \u0422\u043e\u043d \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439 \u0441\u043a\u043e\u0440\u0435\u0435 \u043f\u043e\u0437\u0438\u0442\u0438\u0432\u043d\u044b\u0439 (\u0440\u043e\u0441\u0442/ETF). \u041d\u0435 \u0444\u0438\u043d\u0441\u043e\u0432\u0435\u0442.' : '\ud83d\udcf0 News tone rather positive (growth/ETF). Not financial advice.';
    else if (bear > bull + 2) msg = lang === 'ru' ? '\ud83d\udcf0 \u0422\u043e\u043d \u043e\u0441\u0442\u043e\u0440\u043e\u0436\u043d\u044b\u0439/\u043d\u0435\u0433\u0430\u0442\u0438\u0432\u043d\u044b\u0439. \u0421\u043b\u0435\u0434\u0438\u0442\u0435 \u0437\u0430 \u0432\u043e\u043b\u0430\u0442\u0438\u043b\u044c\u043d\u043e\u0441\u0442\u044c\u044e.' : '\ud83d\udcf0 Cautious/negative tone. Watch volatility.';
    else msg = lang === 'ru' ? '\ud83d\udcf0 \u0421\u043c\u0435\u0448\u0430\u043d\u043d\u044b\u0439 \u0442\u043e\u043d. \u0420\u044b\u043d\u043e\u043a \u043c\u043e\u0436\u0435\u0442 \u043f\u043e\u0439\u0442\u0438 \u0432 \u043b\u044e\u0431\u0443\u044e \u0441\u0442\u043e\u0440\u043e\u043d\u0443.' : '\ud83d\udcf0 Mixed tone. Market can move either way.';
    var ol = $('outlook'); if (ol) ol.textContent = msg;
    var coins = ['BTC', 'ETH', 'SOL', 'XRP', 'TON'];
    var co = $('coinOutlook'); if (!co) return;
    co.innerHTML = coins.map(function (c) {
      var re = new RegExp(c === 'BTC' ? 'BITCOIN|\\bBTC\\b' : c === 'ETH' ? 'ETHEREUM|\\bETH\\b' : c === 'SOL' ? 'SOLANA|\\bSOL\\b' : c === 'TON' ? '\\bTON\\b|TONCOIN' : '\\b' + c + '\\b', 'i');
      var sub = items.filter(function (n) { return re.test(n.title); });
      if (!sub.length) return '';
      var t = sub.map(function (n) { return n.title; }).join(' ').toLowerCase();
      var b = (t.match(/surge|rally|soar|approve|etf|\u0440\u043e\u0441\u0442|\u0440\u0430\u043b\u043b\u0438/g) || []).length;
      var r = (t.match(/crash|drop|ban|hack|\u043f\u0430\u0434\u0435\u043d\u0438|\u0437\u0430\u043f\u0440\u0435\u0442/g) || []).length;
      var tone = b > r ? (lang === 'ru' ? '\u0440\u043e\u0441\u0442' : 'bullish') : r > b ? (lang === 'ru' ? '\u0440\u0438\u0441\u043a\u0438' : 'bearish') : (lang === 'ru' ? '\u043d\u0435\u0439\u0442\u0440.' : 'neutral');
      return '<div class="hold-row"><b>' + c + '</b><span class="muted">' + sub.length + ' news \u00b7 ' + tone + '</span></div>';
    }).join('');
  }
  var nt = $('newsTabs');
  if (nt) nt.addEventListener('click', function (e) {
    var t = e.target.closest('.tab'); if (!t) return;
    document.querySelectorAll('#newsTabs .tab').forEach(function (x) { x.classList.remove('on'); });
    t.classList.add('on'); newsFilter = t.getAttribute('data-f'); renderNews();
  });

  function fillPnlCoins() {
    var sel = $('pnlCoin'); if (!sel) return;
    var opts = list.slice();
    DEFAULTS.forEach(function (id) { if (opts.indexOf(id) < 0) opts.push(id); });
    sel.innerHTML = opts.map(function (id) {
      var c = cacheGet('coin_' + currency + '_' + id);
      return '<option value="' + id + '">' + (c ? c.name + ' (' + c.symbol.toUpperCase() + ')' : id) + '</option>';
    }).join('');
    var pd = $('pnlDate');
    if (pd && !pd.value) {
      var d = new Date(); d.setMonth(d.getMonth() - 6);
      pd.value = d.toISOString().slice(0, 10);
    }
    renderSavedPnL();
  }
  var pnlBtn = $('pnlBtn');
  if (pnlBtn) pnlBtn.addEventListener('click', async function () {
    var id = $('pnlCoin').value, dateStr = $('pnlDate').value, mode = $('pnlMode').value, amount = parseFloat($('pnlAmt').value);
    if (!id || !dateStr || !(amount > 0)) { toast(lang === 'ru' ? '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u043f\u043e\u043b\u044f' : 'Fill fields'); return; }
    pnlBtn.disabled = true;
    try {
      var parts = dateStr.split('-');
      var cgDate = parts[2] + '-' + parts[1] + '-' + parts[0];
      var hist = await api(API + '/coins/' + id + '/history?date=' + cgDate + '&localization=false', 2);
      var buyPrice = null;
      if (hist && hist.market_data && hist.market_data.current_price) {
        buyPrice = hist.market_data.current_price[currency] || hist.market_data.current_price.usd;
      }
      if (buyPrice == null) {
        var from = Math.floor(new Date(dateStr).getTime() / 1000);
        var ch = await api(API + '/coins/' + id + '/market_chart/range?vs_currency=' + currency + '&from=' + from + '&to=' + (from + 86400), 2);
        if (ch && ch.prices && ch.prices.length) buyPrice = ch.prices[0][1];
      }
      if (buyPrice == null) throw new Error('no price');
      var nowCoin = cacheGet('coin_' + currency + '_' + id);
      if (!nowCoin) {
        var md = await api(API + '/coins/markets?vs_currency=' + currency + '&ids=' + id);
        nowCoin = md[0]; cacheSet('coin_' + currency + '_' + id, nowCoin);
      }
      var nowPrice = nowCoin.current_price;
      var qty, invested;
      if (mode === 'qty') { qty = amount; invested = qty * buyPrice; }
      else { invested = amount; qty = invested / buyPrice; }
      var nowValue = qty * nowPrice;
      var profit = nowValue - invested;
      var profitPct = (profit / invested) * 100;
      var days = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 864e5));
      $('pnlBox').style.display = 'block';
      var el = $('pnlProfit');
      el.textContent = (profit >= 0 ? '+' : '') + fmt(profit);
      el.className = 'pnl-big ' + (profit >= 0 ? 'up' : 'down');
      $('pnlPct').textContent = pct(profitPct);
      $('pnlPct').className = pc(profitPct);
      $('pnlBuy').textContent = fmt(buyPrice);
      $('pnlNow').textContent = fmt(nowPrice);
      $('pnlInv').textContent = fmt(invested);
      $('pnlVal').textContent = fmt(nowValue);
      $('pnlQty').textContent = qty > 1 ? qty.toFixed(4) : qty.toPrecision(4);
      $('pnlDays').textContent = String(days);
      savedPnL.unshift({ name: nowCoin.name, date: dateStr, profit: profit, pct: profitPct });
      savedPnL = savedPnL.slice(0, 10);
      localStorage.setItem('ct_pnl', JSON.stringify(savedPnL));
      renderSavedPnL();
    } catch (e) { toast(lang === 'ru' ? '\u041e\u0448\u0438\u0431\u043a\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u0438' : 'History error'); console.error(e); }
    finally { pnlBtn.disabled = false; }
  });
  function renderSavedPnL() {
    var box = $('pnlSaved'); if (!box) return;
    if (!savedPnL.length) { box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u041f\u0443\u0441\u0442\u043e' : 'Empty') + '</div>'; return; }
    box.innerHTML = savedPnL.map(function (x) {
      return '<div class="hold-row"><div><b>' + x.name + '</b><div class="muted">' + x.date + '</div></div><div class="' + (x.profit >= 0 ? 'up' : 'down') + '" style="font-weight:700;text-align:right">' + (x.profit >= 0 ? '+' : '') + fmt(x.profit) + '<div class="muted">' + pct(x.pct) + '</div></div></div>';
    }).join('');
  }
  function renderHoldings() {
    var box = $('holdings'); if (!box) return;
    if (!account) {
      box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u043a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0430 \u0432\u043a\u043b\u0430\u0434\u043a\u0435 \u00ab\u041a\u043e\u0448\u0435\u043b\u0451\u043a\u00bb' : 'Connect wallet on Wallet tab') + '</div>';
      return;
    }
    var bal = $('wBal') ? $('wBal').textContent : '\u2014';
    var chain = $('wChain') ? $('wChain').textContent : '';
    box.innerHTML = '<div class="hold-row"><div><b>Native</b><div class="muted">' + chain + '</div></div><div class="pr">' + bal + '</div></div><div class="muted" style="margin-top:.5rem;word-break:break-all">' + account + '</div>';
  }

  function renderWallets() {
    var g = $('wGrid'); if (!g) return;
    g.innerHTML = WALLETS.map(function (w) {
      return '<div class="w-card" data-wid="' + w.id + '"><div class="badge">' + w.badge + '</div><div class="name">' + w.name + '</div><div class="sub">' + (w.deep ? (lang === 'ru' ? '\u041e\u0442\u043a\u0440\u044b\u0442\u044c' : 'Open app') : (lang === 'ru' ? '\u0412 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435' : 'In browser')) + '</div></div>';
    }).join('');
  }
  var wg = $('wGrid');
  if (wg) wg.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card');
    if (card) connectWallet(card.getAttribute('data-wid'));
  });
  function getProvider(prefer) {
    if (prefer === 'okx' && window.okxwallet) return window.okxwallet;
    if (prefer === 'phantom' && window.phantom && window.phantom.ethereum) return window.phantom.ethereum;
    if (window.ethereum && window.ethereum.providers) {
      var arr = window.ethereum.providers;
      if (prefer === 'metamask') { var m = arr.find(function (p) { return p.isMetaMask && !p.isBraveWallet; }); if (m) return m; }
      if (prefer === 'trust') { var t = arr.find(function (p) { return p.isTrust; }); if (t) return t; }
      if (prefer === 'coinbase') { var c = arr.find(function (p) { return p.isCoinbaseWallet; }); if (c) return c; }
      return arr[0];
    }
    return window.ethereum || null;
  }
  async function connectWallet(wid) {
    var w = WALLETS.find(function (x) { return x.id === wid; });
    provider = getProvider(wid);
    if (!provider && w && w.deep) {
      localStorage.setItem('ct_pending_w', wid || '');
      toast((lang === 'ru' ? '\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u044e ' : 'Opening ') + w.name + '\u2026');
      window.location.href = w.deep;
      setTimeout(function () { toast(lang === 'ru' ? '\u041f\u043e\u0441\u043b\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0432\u0435\u0440\u043d\u0438\u0442\u0435\u0441\u044c \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u0441\u043d\u043e\u0432\u0430' : 'After approve, return and tap again'); }, 2500);
      return;
    }
    if (wid === 'phantom' || wid === 'solflare') {
      var sol = window.solana || (window.phantom && window.phantom.solana) || (window.solflare && window.solflare);
      if (sol && (sol.isPhantom || sol.isSolflare || sol.connect)) {
        try {
          var res = await sol.connect();
          account = (res.publicKey && res.publicKey.toString()) || (sol.publicKey && sol.publicKey.toString());
          provider = { type: 'sol' };
          showWallet(account, 'Solana', '\u2014');
          toast('Solana connected');
          localStorage.removeItem('ct_pending_w');
          return;
        } catch (e) { toast(e.message || 'Error'); return; }
      }
    }
    if (wid === 'tonkeeper') {
      toast(lang === 'ru' ? '\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 Tonkeeper \u0438 \u0432\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0432\u0440\u0443\u0447\u043d\u0443\u044e \u043d\u0438\u0436\u0435' : 'Open Tonkeeper and paste address below');
      if (w && w.deep) window.open(w.deep, '_blank');
      return;
    }
    if (!provider) {
      toast(lang === 'ru' ? '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u0435 \u043a\u043e\u0448\u0435\u043b\u0451\u043a \u0438\u043b\u0438 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0441\u0430\u0439\u0442 \u0432\u043d\u0443\u0442\u0440\u0438 \u0435\u0433\u043e \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430' : 'Install wallet or open site inside wallet browser');
      return;
    }
    try {
      var accs = await provider.request({ method: 'eth_requestAccounts' });
      if (!accs.length) return;
      account = accs[0];
      var chainId = await provider.request({ method: 'eth_chainId' });
      var balHex = await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] });
      var eth = parseInt(balHex, 16) / 1e18;
      showWallet(account, CHAINS[chainId] || chainId, eth.toFixed(6) + ' native');
      localStorage.setItem('ct_wallet', account);
      localStorage.removeItem('ct_pending_w');
      toast(lang === 'ru' ? '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u043e \u2014 \u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435 \u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c' : 'Connected \u2014 see Portfolio');
      if (provider.on) {
        provider.on('accountsChanged', function (a) {
          if (!a.length) disconnect(); else { account = a[0]; refreshBal(); }
        });
        provider.on('chainChanged', function () { refreshBal(); });
      }
    } catch (e) { toast(e.message || 'Error'); }
  }
  function showWallet(addr, chain, bal) {
    var wi = $('wInfo'); if (!wi) return;
    wi.style.display = 'block';
    $('wAddr').textContent = addr;
    $('wChain').textContent = chain;
    $('wBal').textContent = bal;
    renderHoldings();
  }
  async function refreshBal() {
    if (!account || !provider || provider.type === 'sol') return;
    try {
      var chainId = await provider.request({ method: 'eth_chainId' });
      var balHex = await provider.request({ method: 'eth_getBalance', params: [account, 'latest'] });
      showWallet(account, CHAINS[chainId] || chainId, (parseInt(balHex, 16) / 1e18).toFixed(6) + ' native');
    } catch (e) {}
  }
  function disconnect() {
    account = null; provider = null;
    localStorage.removeItem('ct_wallet');
    var wi = $('wInfo'); if (wi) wi.style.display = 'none';
    renderHoldings();
  }
  var wd = $('wDisc'); if (wd) wd.addEventListener('click', disconnect);

  var manBtn = $('manBtn');
  if (manBtn) manBtn.addEventListener('click', async function () {
    var addr = ($('manAddr') || {}).value.trim();
    var chain = ($('manChain') || {}).value || 'eth';
    var resEl = $('manRes'); if (!resEl) return;
    if (!addr) { toast(lang === 'ru' ? '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441' : 'Enter address'); return; }
    resEl.textContent = '...';
    try {
      if (chain === 'sol') {
        var sr = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] })
        }).then(function (x) { return x.json(); });
        if (sr.result && sr.result.value != null) {
          resEl.innerHTML = (sr.result.value / 1e9).toFixed(4) + ' SOL \u00b7 <a href="https://solscan.io/account/' + addr + '" target="_blank" rel="noopener">Solscan</a>';
        } else resEl.textContent = 'Error / invalid';
        return;
      }
      if (chain === 'ton') {
        var tr = await fetch('https://tonapi.io/v2/accounts/' + encodeURIComponent(addr)).then(function (x) { return x.json(); });
        if (tr && tr.balance != null) {
          resEl.innerHTML = (tr.balance / 1e9).toFixed(4) + ' TON \u00b7 <a href="https://tonviewer.com/' + addr + '" target="_blank" rel="noopener">TON Viewer</a>';
        } else resEl.textContent = 'Error / invalid';
        return;
      }
      if (chain === 'btc') {
        var br = await fetch('https://blockstream.info/api/address/' + encodeURIComponent(addr)).then(function (x) { return x.json(); });
        if (br && br.chain_stats) {
          var sat = (br.chain_stats.funded_txo_sum || 0) - (br.chain_stats.spent_txo_sum || 0);
          resEl.innerHTML = (sat / 1e8).toFixed(8) + ' BTC \u00b7 <a href="https://mempool.space/address/' + addr + '" target="_blank" rel="noopener">Mempool</a>';
        } else resEl.textContent = 'Error / invalid';
        return;
      }
      var info = CHAIN_RPC[chain];
      if (!info) { resEl.textContent = 'Unknown chain'; return; }
      if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) { toast('Need 0x address'); resEl.textContent = ''; return; }
      var rr = await fetch(info.rpc, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
      }).then(function (x) { return x.json(); });
      if (rr.result) {
        resEl.innerHTML = (parseInt(rr.result, 16) / 1e18).toFixed(6) + ' ' + info.native + ' \u00b7 <a href="' + info.explorer + addr + '" target="_blank" rel="noopener">Explorer</a>';
      } else resEl.textContent = 'Error';
    } catch (e) { resEl.textContent = 'Error'; }
  });

  async function tryAutoConnect() {
    if (!window.ethereum) return;
    try {
      var accs = await window.ethereum.request({ method: 'eth_accounts' });
      if (accs && accs[0]) {
        provider = window.ethereum; account = accs[0];
        await refreshBal();
      }
    } catch (e) {}
  }

  function fillConv(markets) {
    var sel = $('cFrom'); if (!sel) return;
    var items = markets || list.map(function (id) { return cacheGet('coin_' + currency + '_' + id); }).filter(Boolean);
    if (!items.length) return;
    sel.innerHTML = items.map(function (c) {
      return '<option value="' + c.id + '" data-price="' + c.current_price + '">' + c.symbol.toUpperCase() + '</option>';
    }).join('');
    doConv();
  }
  function doConv() {
    var amt = parseFloat(($('cAmt') || {}).value) || 0;
    var opt = $('cFrom') && $('cFrom').selectedOptions[0];
    var price = opt ? parseFloat(opt.getAttribute('data-price')) : 0;
    if (!price) { if ($('cOut')) $('cOut').textContent = '\u2014'; return; }
    if ($('cTo') && $('cTo').value === 'btc') {
      var btc = cacheGet('coin_' + currency + '_bitcoin');
      $('cOut').textContent = btc ? ((amt * price) / btc.current_price).toFixed(8) + ' BTC' : '\u2014';
      return;
    }
    if ($('cOut')) $('cOut').textContent = fmt(amt * price);
  }
  var cAmt = $('cAmt'); if (cAmt) cAmt.addEventListener('input', doConv);
  var cFrom = $('cFrom'); if (cFrom) cFrom.addEventListener('change', doConv);
  var cTo = $('cTo'); if (cTo) cTo.addEventListener('change', doConv);

  async function loadFG() {
    try {
      var c = cacheGet('fg'); if (c) renderFG(c);
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      cacheSet('fg', d, 600000);
      renderFG(d);
    } catch (e) {}
  }
  function renderFG(d) {
    var v = d && d.data && d.data[0]; if (!v) return;
    var n = +v.value;
    var fv = $('fgV'); if (fv) fv.textContent = n;
    var fc = $('fgC'); if (fc) fc.textContent = v.value_classification;
    var sf = $('stFG'); if (sf) sf.textContent = n + ' \u00b7 ' + v.value_classification;
    var arc = $('fgArc');
    if (arc) {
      var circ = 2 * Math.PI * 52;
      var offset = circ - (n / 100) * circ;
      arc.style.strokeDasharray = String(circ);
      arc.style.strokeDashoffset = String(offset);
      var col = n <= 25 ? '#ef4444' : n <= 45 ? '#f59e0b' : n <= 55 ? '#eab308' : n <= 75 ? '#84cc16' : '#22c55e';
      arc.style.stroke = col;
      if (fv) fv.style.color = col;
    }
  }
  function renderDom() {
    var d = window._domData || {};
    var keys = Object.keys(d).slice(0, 6);
    var el = $('domList'); if (!el) return;
    el.innerHTML = keys.map(function (k) {
      return '<div class="hold-row"><span>' + k.toUpperCase() + '</span><b>' + (+d[k]).toFixed(2) + '%</b></div>';
    }).join('') || '\u2014';
  }

  function fillMhCoins() {
    var sel = $('mhCoin'); if (!sel) return;
    var opts = list.slice();
    DEFAULTS.forEach(function (id) { if (opts.indexOf(id) < 0) opts.push(id); });
    sel.innerHTML = opts.map(function (id) {
      var c = cacheGet('coin_' + currency + '_' + id);
      return '<option value="' + id + '">' + (c ? c.symbol.toUpperCase() + ' \u2014 ' + c.name : id) + '</option>';
    }).join('');
  }
  function renderManual() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box) return;
    if (!manualHold.length) {
      box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u041f\u0443\u0441\u0442\u043e \u2014 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0430\u043a\u0442\u0438\u0432\u044b \u0432\u044b\u0448\u0435' : 'Empty \u2014 add assets above') + '</div>';
      if (tot) tot.style.display = 'none';
      var cw = $('portChartWrap'); if (cw) cw.style.display = 'none';
      return;
    }
    var totalVal = 0, totalCost = 0;
    var slices = [];
    box.innerHTML = manualHold.map(function (h, i) {
      var c = cacheGet('coin_' + currency + '_' + h.id);
      var price = c ? c.current_price : 0, val = price * h.qty;
      totalVal += val; var cost = (h.buy || 0) * h.qty; totalCost += cost;
      var pnl = cost > 0 ? val - cost : null, sym = c ? c.symbol.toUpperCase() : h.id;
      slices.push({ sym: sym, val: val, color: COLORS[i % COLORS.length] });
      return '<div class="hold-row" style="animation-delay:' + (i * 0.04) + 's"><div><b>' + sym + '</b><div class="muted">' + h.qty + ' \u00b7 ' + (price ? fmt(price) : '\u2014') + '</div></div><div style="text-align:right"><b>' + (price ? fmt(val) : '\u2014') + '</b>' +
        (pnl != null ? '<div class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + fmt(pnl) + '</div>' : '') +
        '<button type="button" class="btn-ghost mh-rm" data-i="' + i + '" style="font-size:.65rem;padding:.15rem .4rem;margin-top:.2rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      $('mhVal').textContent = fmt(totalVal);
      var pnlEl = $('mhPnl');
      if (totalCost > 0) {
        var p = totalVal - totalCost;
        pnlEl.textContent = (p >= 0 ? '+' : '') + fmt(p) + ' (' + pct((p / totalCost) * 100) + ')';
        pnlEl.className = pc(p);
      } else pnlEl.textContent = '';
    }
    drawPortChart(slices, totalVal);
  }
  function drawPortChart(slices, total) {
    var wrap = $('portChartWrap'), canvas = $('portChart'), leg = $('portLegend');
    if (!wrap || !canvas || !total) { if (wrap) wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 12;
    ctx.clearRect(0, 0, w, h);
    var start = -Math.PI / 2;
    slices.forEach(function (s) {
      if (s.val <= 0) return;
      var angle = (s.val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      start += angle;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#12121a';
    ctx.fill();
    if (leg) {
      leg.innerHTML = slices.filter(function (s) { return s.val > 0; }).map(function (s) {
        var p = ((s.val / total) * 100).toFixed(1);
        return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin-right:.6rem"><span style="width:8px;height:8px;border-radius:50%;background:' + s.color + ';display:inline-block"></span>' + s.sym + ' ' + p + '%</span>';
      }).join('');
    }
  }
  var mhAdd = $('mhAdd');
  if (mhAdd) mhAdd.addEventListener('click', function () {
    var id = $('mhCoin').value, qty = parseFloat($('mhQty').value), buy = parseFloat($('mhBuy').value) || 0;
    if (!id || !(qty > 0)) { toast(lang === 'ru' ? '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u0443 \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e' : 'Set coin and qty'); return; }
    manualHold.push({ id: id, qty: qty, buy: buy });
    localStorage.setItem('ct_mh', JSON.stringify(manualHold));
    $('mhQty').value = ''; $('mhBuy').value = '';
    renderManual();
    toast(lang === 'ru' ? '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e' : 'Added');
  });
  var mhList = $('mhList');
  if (mhList) mhList.addEventListener('click', function (e) {
    var btn = e.target.closest('.mh-rm'); if (!btn) return;
    manualHold.splice(+btn.getAttribute('data-i'), 1);
    localStorage.setItem('ct_mh', JSON.stringify(manualHold));
    renderManual();
  });

  async function loadGas() {
    var box = $('gasBox'); if (!box) return;
    try {
      var r = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (x) { return x.json(); });
      if (r && r.result && r.result.SafeGasPrice) {
        var g = r.result;
        box.innerHTML = '<div class="hold-row"><span>Safe</span><b>' + g.SafeGasPrice + ' Gwei</b></div><div class="hold-row"><span>Propose</span><b>' + g.ProposeGasPrice + ' Gwei</b></div><div class="hold-row"><span>Fast</span><b>' + g.FastGasPrice + ' Gwei</b></div>';
        return;
      }
    } catch (e) {}
    try {
      var r2 = await fetch('https://cloudflare-eth.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }) }).then(function (x) { return x.json(); });
      if (r2 && r2.result) { box.innerHTML = '<div class="hold-row"><span>Current</span><b>' + (parseInt(r2.result, 16) / 1e9).toFixed(1) + ' Gwei</b></div>'; return; }
    } catch (e2) {}
    box.innerHTML = '<div class="muted"><a href="https://etherscan.io/gastracker" target="_blank" rel="noopener">Etherscan Gas</a></div>';
  }
  function calcTP() {
    var inv = parseFloat(($('tpInv') || {}).value) || 0, pctV = parseFloat(($('tpPct') || {}).value) || 0, out = $('tpOut');
    if (!out) return; if (!(inv > 0)) { out.textContent = '\u2014'; return; }
    var target = inv * (1 + pctV / 100);
    out.textContent = (lang === 'ru' ? '\u041d\u0443\u0436\u043d\u043e: ' : 'Need: ') + fmt(target) + ' \u00b7 ' + (lang === 'ru' ? '\u043f\u0440\u0438\u0431\u044b\u043b\u044c ' : 'profit ') + fmt(target - inv);
  }
  function calcDCA() {
    var amt = parseFloat(($('dcaAmt') || {}).value) || 0, months = parseInt(($('dcaMonths') || {}).value, 10) || 0, growth = parseFloat(($('dcaGrowth') || {}).value) || 0, out = $('dcaOut');
    if (!out) return; if (!(amt > 0) || !(months > 0)) { out.textContent = '\u2014'; return; }
    var monthlyRate = Math.pow(1 + growth / 100, 1 / 12) - 1, total = 0;
    for (var i = 0; i < months; i++) total = (total + amt) * (1 + monthlyRate);
    var invested = amt * months;
    out.textContent = (lang === 'ru' ? '\u0412\u043b\u043e\u0436\u0435\u043d\u043e ' : 'Invested ') + fmt(invested) + ' \u2192 \u2248 ' + fmt(total) + ' (' + pct(((total - invested) / invested) * 100) + ')';
  }
  ['tpInv', 'tpPct'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', calcTP); });
  ['dcaAmt', 'dcaMonths', 'dcaGrowth'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', calcDCA); });

  var curSel = $('curSel');
  if (curSel) {
    curSel.value = currency;
    curSel.addEventListener('change', async function () {
      currency = this.value;
      localStorage.setItem('ct_cur', currency);
      var body = $('wBody');
      if (body) body.innerHTML = '<tr><td colspan="5" class="empty">...</td></tr>';
      await loadGlobal(); await loadWatch();
      renderManual();
    });
  }
  var langSel = $('langSel');
  if (langSel) {
    langSel.value = lang;
    langSel.addEventListener('change', function () {
      lang = this.value;
      localStorage.setItem('ct_lang', lang);
      if (newsOrig.length) applyNewsLang();
      toast(lang === 'ru' ? '\u042f\u0437\u044b\u043a: RU' : 'Language: EN');
    });
  }
  var themeBtn = $('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    if (selected) loadTV(selected);
    renderManual();
  });
  var refBtn = $('refBtn');
  if (refBtn) refBtn.addEventListener('click', async function () {
    refBtn.classList.add('spinning');
    refBtn.disabled = true;
    try {
      cacheClear();
      await loadGlobal();
      await loadWatch();
      await loadTrend();
      await loadFG();
      if (manualHold.length) renderManual();
      toast(lang === 'ru' ? '\u0426\u0435\u043d\u044b \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b' : 'Prices updated');
    } catch (e) {
      toast(lang === 'ru' ? '\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f' : 'Refresh error');
      console.error(e);
    } finally {
      refBtn.classList.remove('spinning');
      refBtn.disabled = false;
    }
  });
  var addTop = $('addTop');
  if (addTop) addTop.addEventListener('click', function () {
    DEFAULTS.forEach(function (id) { if (!list.includes(id)) list.push(id); });
    localStorage.setItem('ct_wl', JSON.stringify(list));
    loadWatch();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      tryAutoConnect();
      var pend = localStorage.getItem('ct_pending_w');
      if (pend && window.ethereum && !account) setTimeout(function () { connectWallet(pend); }, 600);
    }
  });
  window.addEventListener('focus', function () { tryAutoConnect(); });

  applyTheme();
  loadGlobal();
  loadWatch();
  loadTrend();
  loadFG();
  tryAutoConnect();
})();
