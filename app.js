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
    { id: 'phantom', name: 'Phantom', badge: 'PH', deep: 'https://phantom.app/ul/browse/' + encodeURIComponent(SITE) },
    { id: 'rabby', name: 'Rabby', badge: 'RB', deep: SITE },
    { id: 'brave', name: 'Brave', badge: 'BR', deep: SITE },
    { id: 'injected', name: 'Browser Web3', badge: 'W3', deep: null }
  ];

  var list = JSON.parse(localStorage.getItem('ct_wl') || 'null') || DEFAULTS.slice();
  var savedPnL = JSON.parse(localStorage.getItem('ct_pnl') || '[]');
  var selected = null, lastFetch = 0, account = null, provider = null;
  var newsCache = [];
  var newsFilter = 'all';
  var currency = localStorage.getItem('ct_cur') || 'usd';
  if (!CUR[currency]) currency = 'usd';
  var lang = localStorage.getItem('ct_lang') || 'ru';
  var theme = localStorage.getItem('ct_theme') || 'dark';

  function $(id) { return document.getElementById(id); }
  function toast(m) {
    var e = $('toast');
    if (!e) return;
    e.textContent = m;
    e.classList.add('show');
    clearTimeout(e._t);
    e._t = setTimeout(function () { e.classList.remove('show'); }, 2400);
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
      var r = localStorage.getItem('c4_' + k);
      if (!r) return null;
      var o = JSON.parse(r);
      if (o.t && Date.now() - o.t > (o.ttl || 120000)) { localStorage.removeItem('c4_' + k); return null; }
      return o.d;
    } catch (e) { return null; }
  }
  function cacheSet(k, d, ttl) {
    try { localStorage.setItem('c4_' + k, JSON.stringify({ t: Date.now(), ttl: ttl || 120000, d: d })); } catch (e) {}
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function api(url, retries) {
    retries = retries == null ? 3 : retries;
    var err;
    for (var i = 0; i <= retries; i++) {
      try {
        var g = 900 - (Date.now() - lastFetch);
        if (g > 0) await sleep(g);
        lastFetch = Date.now();
        var res = await fetch(url);
        if (res.status === 429) {
          if (i < retries) { await sleep(Math.min(3000 * Math.pow(1.5, i), 10000)); continue; }
          throw new Error('429');
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) { err = e; if (i < retries) await sleep(600 * (i + 1)); }
    }
    throw err || new Error('net');
  }

  function go(p) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.toggle('on', el.id === 'p-' + p); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
    if (p === 'news') loadNews();
    if (p === 'port') { fillPnlCoins(); renderHoldings(); }
    if (p === 'wallet') renderWallets();
    if (p === 'tools') { loadFG(); renderDom(); }
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
      cacheSet('global', d);
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
      cacheSet(key, d);
      d.forEach(function (x) { cacheSet('coin_' + currency + '_' + x.id, x); });
      renderWatch(d);
      fillConv(d);
    } catch (e) {
      console.error(e);
      if (!c && body) body.innerHTML = '<tr><td colspan="5" class="empty">Error \u2014 tap refresh</td></tr>';
    }
  }
  function renderWatch(data) {
    var body = $('wBody');
    if (!body) return;
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
      loadWatch();
      return;
    }
    var tr = e.target.closest('tr[data-id]');
    if (tr) selectCoin(tr.getAttribute('data-id'));
  });
  function updateDetail(coin) {
    var det = $('detail');
    if (!det) return;
    det.style.display = 'block';
    $('dImg').src = coin.image || '';
    $('dName').textContent = coin.name;
    $('dSym').textContent = (coin.symbol || '').toUpperCase();
    $('dPrice').textContent = fmt(coin.current_price);
    $('dCh').innerHTML = '<span class="' + pc(coin.price_change_percentage_24h) + '">' + pct(coin.price_change_percentage_24h) + ' / 24h</span>';
    $('ex').innerHTML = EX.map(function (x) { return '<a href="' + x.u(coin.symbol) + '" target="_blank" rel="noopener">' + x.n + '</a>'; }).join('');
  }
  function loadTV(id) {
    var box = $('tv');
    if (!box) return;
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
    $('q').value = '';
    sr.style.display = 'none';
    loadWatch().then(function () { selectCoin(id); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-wrap')) { var box = $('sr'); if (box) box.style.display = 'none'; }
  });

  async function loadTrend() {
    try {
      var c = cacheGet('trend');
      if (c) renderTrend(c);
      var d = await api(API + '/search/trending');
      cacheSet('trend', d);
      renderTrend(d);
    } catch (e) {}
  }
  function renderTrend(d) {
    var el = $('trends');
    if (!el) return;
    var coins = (d.coins || []).slice(0, 8);
    el.innerHTML = coins.map(function (x, i) {
      var c = x.item;
      return '<div class="sr-item" style="border:none;padding:.4rem 0;cursor:pointer" data-tid="' + c.id + '"><span class="muted" style="width:1.1rem">' + (i + 1) + '</span><img src="' + c.small + '" width="20" height="20" style="border-radius:50%"/><span>' + c.name + '</span></div>';
    }).join('');
  }
  var trends = $('trends');
  if (trends) trends.addEventListener('click', function (e) {
    var it = e.target.closest('[data-tid]');
    if (!it) return;
    var id = it.getAttribute('data-tid');
    if (!list.includes(id)) { list.unshift(id); localStorage.setItem('ct_wl', JSON.stringify(list)); }
    loadWatch().then(function () { selectCoin(id); });
  });

  async function loadNews() {
    var box = $('newsList');
    var cached = cacheGet('news');
    if (cached) { newsCache = cached; renderNews(); }
    else if (box) box.innerHTML = '<div class="empty">...</div>';
    try {
      var all = [];
      for (var i = 0; i < RSS.length; i++) {
        try {
          var data = await fetch(RSS[i].url).then(function (r) { return r.json(); });
          if (data && data.items) {
            data.items.forEach(function (it) {
              all.push({
                title: it.title,
                link: it.link,
                date: it.pubDate,
                source: RSS[i].name,
                desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 160)
              });
            });
          }
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      newsCache = all.slice(0, 40);
      cacheSet('news', newsCache, 600000);
      renderNews();
    } catch (e) {
      if (!cached && box) box.innerHTML = '<div class="empty">Load error</div>';
    }
  }
  function renderNews() {
    var f = newsFilter;
    var items = newsCache.filter(function (n) {
      if (f === 'all') return true;
      var t = (n.title + ' ' + n.desc).toUpperCase();
      if (f === 'market') return /MARKET|CRYPTO|FED|ETF|REGULATION|SEC|RATE/.test(t);
      return t.indexOf(f) !== -1;
    });
    var box = $('newsList');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="empty">No news</div>'; updateOutlook([]); return; }
    box.innerHTML = items.slice(0, 25).map(function (n) {
      var d = '';
      try { d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.source + '</span>' + d + '</div>' + (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '\u2026</div>' : '') + '</div>';
    }).join('');
    updateOutlook(items);
  }
  function updateOutlook(items) {
    var text = items.map(function (n) { return n.title; }).join(' ').toLowerCase();
    var bull = (text.match(/surge|rally|soar|record|approve|etf|bull|\u0440\u043e\u0441\u0442|\u0440\u0430\u043b\u043b\u0438|\u0440\u0435\u043a\u043e\u0440\u0434/g) || []).length;
    var bear = (text.match(/crash|drop|ban|hack|lawsuit|bear|\u043f\u0430\u0434\u0435\u043d\u0438\u0435|\u0437\u0430\u043f\u0440\u0435\u0442|\u0445\u0430\u043a|\u0438\u0441\u043a/g) || []).length;
    var msg;
    if (bull > bear + 2) msg = '\ud83d\udcf0 News tone is rather positive (growth/ETF mentions). Not financial advice.';
    else if (bear > bull + 2) msg = '\ud83d\udcf0 News tone is cautious/negative (risks/regulation). Watch volatility.';
    else msg = '\ud83d\udcf0 Mixed news tone. Market can move either way.';
    var ol = $('outlook');
    if (ol) ol.textContent = msg;
  }
  var nt = $('newsTabs');
  if (nt) nt.addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t) return;
    document.querySelectorAll('#newsTabs .tab').forEach(function (x) { x.classList.remove('on'); });
    t.classList.add('on');
    newsFilter = t.getAttribute('data-f');
    renderNews();
  });

  function fillPnlCoins() {
    var sel = $('pnlCoin');
    if (!sel) return;
    var opts = list.slice();
    DEFAULTS.forEach(function (id) { if (!opts.includes(id)) opts.push(id); });
    sel.innerHTML = opts.map(function (id) {
      var c = cacheGet('coin_' + currency + '_' + id);
      return '<option value="' + id + '">' + (c ? c.name + ' (' + c.symbol.toUpperCase() + ')' : id) + '</option>';
    }).join('');
    var pd = $('pnlDate');
    if (pd && !pd.value) {
      var d = new Date();
      d.setMonth(d.getMonth() - 6);
      pd.value = d.toISOString().slice(0, 10);
    }
    renderSavedPnL();
  }
  var pnlBtn = $('pnlBtn');
  if (pnlBtn) pnlBtn.addEventListener('click', async function () {
    var id = $('pnlCoin').value;
    var dateStr = $('pnlDate').value;
    var mode = $('pnlMode').value;
    var amount = parseFloat($('pnlAmt').value);
    if (!id || !dateStr || !(amount > 0)) { toast('Fill fields'); return; }
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
        var md = await api(API + '/coins/markets?vs_currency=' + currency + '&ids=' + encodeURIComponent(id));
        nowCoin = md[0];
        cacheSet('coin_' + currency + '_' + id, nowCoin);
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
    } catch (e) { toast('History error'); console.error(e); }
    finally { pnlBtn.disabled = false; }
  });
  function renderSavedPnL() {
    var box = $('pnlSaved');
    if (!box) return;
    if (!savedPnL.length) { box.innerHTML = '<div class="empty">Empty</div>'; return; }
    box.innerHTML = savedPnL.map(function (x) {
      return '<div class="hold-row"><div><b>' + x.name + '</b><div class="muted">' + x.date + '</div></div><div class="' + (x.profit >= 0 ? 'up' : 'down') + '" style="font-weight:700;text-align:right">' + (x.profit >= 0 ? '+' : '') + fmt(x.profit) + '<div class="muted">' + pct(x.pct) + '</div></div></div>';
    }).join('');
  }
  function renderHoldings() {
    var box = $('holdings');
    if (!box) return;
    if (!account) {
      box.innerHTML = '<div class="empty">Connect wallet on Wallet tab</div>';
      return;
    }
    var bal = $('wBal') ? $('wBal').textContent : '\u2014';
    var chain = $('wChain') ? $('wChain').textContent : '';
    box.innerHTML = '<div class="hold-row"><div><b>Native</b><div class="muted">' + chain + '</div></div><div class="pr">' + bal + '</div></div><div class="muted" style="margin-top:.5rem;word-break:break-all">' + account + '</div>';
  }

  function renderWallets() {
    var g = $('wGrid');
    if (!g) return;
    g.innerHTML = WALLETS.map(function (w) {
      return '<div class="w-card" data-wid="' + w.id + '"><div class="badge">' + w.badge + '</div><div class="name">' + w.name + '</div><div class="sub">' + (w.deep ? 'Open app' : 'In browser') + '</div></div>';
    }).join('');
  }
  var wg = $('wGrid');
  if (wg) wg.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card');
    if (!card) return;
    connectWallet(card.getAttribute('data-wid'));
  });
  function getProvider(prefer) {
    if (prefer === 'okx' && window.okxwallet) return window.okxwallet;
    if (prefer === 'phantom' && window.phantom && window.phantom.ethereum) return window.phantom.ethereum;
    if (window.ethereum && window.ethereum.providers) {
      var arr = window.ethereum.providers;
      if (prefer === 'metamask') {
        var m = arr.find(function (p) { return p.isMetaMask && !p.isBraveWallet; });
        if (m) return m;
      }
      if (prefer === 'trust') {
        var t = arr.find(function (p) { return p.isTrust; });
        if (t) return t;
      }
      if (prefer === 'coinbase') {
        var c = arr.find(function (p) { return p.isCoinbaseWallet; });
        if (c) return c;
      }
      return arr[0];
    }
    return window.ethereum || null;
  }
  async function connectWallet(wid) {
    var w = WALLETS.find(function (x) { return x.id === wid; });
    provider = getProvider(wid);
    if (!provider && w && w.deep) {
      toast('Opening ' + w.name + '\u2026');
      window.location.href = w.deep;
      setTimeout(function () { toast('After approve, return and tap wallet again'); }, 2500);
      return;
    }
    if (wid === 'phantom' && window.solana && window.solana.isPhantom && !(window.phantom && window.phantom.ethereum)) {
      try {
        var res = await window.solana.connect();
        account = res.publicKey.toString();
        provider = { type: 'sol' };
        showWallet(account, 'Solana', '\u2014');
        toast('Phantom connected');
        return;
      } catch (e) { toast(e.message || 'Error'); return; }
    }
    if (!provider) {
      toast('Install wallet or open site inside wallet browser');
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
      toast('Connected \u2014 see Portfolio');
      if (provider.on) {
        provider.on('accountsChanged', function (a) {
          if (!a.length) disconnect();
          else { account = a[0]; refreshBal(); }
        });
        provider.on('chainChanged', function () { refreshBal(); });
      }
    } catch (e) { toast(e.message || 'Error'); }
  }
  function showWallet(addr, chain, bal) {
    var wi = $('wInfo');
    if (!wi) return;
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
    account = null;
    provider = null;
    localStorage.removeItem('ct_wallet');
    var wi = $('wInfo');
    if (wi) wi.style.display = 'none';
    renderHoldings();
  }
  var wd = $('wDisc');
  if (wd) wd.addEventListener('click', disconnect);
  var manBtn = $('manBtn');
  if (manBtn) manBtn.addEventListener('click', async function () {
    var addr = $('manAddr').value.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) { toast('Need 0x address'); return; }
    try {
      var res = await fetch('https://cloudflare-eth.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
      });
      var j = await res.json();
      $('manRes').textContent = (parseInt(j.result, 16) / 1e18).toFixed(6) + ' ETH';
    } catch (e) { $('manRes').textContent = 'Error'; }
  });
  async function tryAutoConnect() {
    if (!window.ethereum) return;
    try {
      var accs = await window.ethereum.request({ method: 'eth_accounts' });
      if (accs && accs[0]) {
        provider = window.ethereum;
        account = accs[0];
        await refreshBal();
      }
    } catch (e) {}
  }

  function fillConv(markets) {
    var sel = $('cFrom');
    if (!sel) return;
    var items = markets || list.map(function (id) { return cacheGet('coin_' + currency + '_' + id); }).filter(Boolean);
    if (!items.length) return;
    sel.innerHTML = items.map(function (c) {
      return '<option value="' + c.id + '" data-price="' + c.current_price + '">' + c.symbol.toUpperCase() + '</option>';
    }).join('');
    doConv();
  }
  function doConv() {
    var amt = parseFloat($('cAmt').value) || 0;
    var opt = $('cFrom').selectedOptions[0];
    var price = opt ? parseFloat(opt.getAttribute('data-price')) : 0;
    if (!price) { $('cOut').textContent = '\u2014'; return; }
    if ($('cTo').value === 'btc') {
      var btc = cacheGet('coin_' + currency + '_bitcoin');
      $('cOut').textContent = btc ? ((amt * price) / btc.current_price).toFixed(8) + ' BTC' : '\u2014';
      return;
    }
    $('cOut').textContent = fmt(amt * price);
  }
  var cAmt = $('cAmt'); if (cAmt) cAmt.addEventListener('input', doConv);
  var cFrom = $('cFrom'); if (cFrom) cFrom.addEventListener('change', doConv);
  var cTo = $('cTo'); if (cTo) cTo.addEventListener('change', doConv);

  async function loadFG() {
    try {
      var c = cacheGet('fg');
      if (c) renderFG(c);
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      cacheSet('fg', d, 600000);
      renderFG(d);
    } catch (e) {}
  }
  function renderFG(d) {
    var v = d && d.data && d.data[0];
    if (!v) return;
    var n = +v.value;
    var fv = $('fgV'); if (fv) fv.textContent = n;
    var fc = $('fgC'); if (fc) fc.textContent = v.value_classification;
    var fn = $('fgN'); if (fn) fn.style.left = n + '%';
    var sf = $('stFG'); if (sf) sf.textContent = n + ' \u00b7 ' + v.value_classification;
  }
  function renderDom() {
    var d = window._domData || {};
    var keys = Object.keys(d).slice(0, 6);
    var el = $('domList');
    if (!el) return;
    if (!keys.length) { el.textContent = '\u2014'; return; }
    el.innerHTML = keys.map(function (k) {
      return '<div class="hold-row"><span>' + k.toUpperCase() + '</span><b>' + (+d[k]).toFixed(2) + '%</b></div>';
    }).join('');
  }

  var curSel = $('curSel');
  if (curSel) {
    curSel.value = currency;
    curSel.addEventListener('change', async function () {
      currency = this.value;
      localStorage.setItem('ct_cur', currency);
      var body = $('wBody');
      if (body) body.innerHTML = '<tr><td colspan="5" class="empty">...</td></tr>';
      await loadGlobal();
      await loadWatch();
    });
  }
  var langSel = $('langSel');
  if (langSel) {
    langSel.value = lang;
    langSel.addEventListener('change', function () {
      lang = this.value;
      localStorage.setItem('ct_lang', lang);
    });
  }
  var themeBtn = $('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme();
    if (selected) loadTV(selected);
  });
  var refBtn = $('refBtn');
  if (refBtn) refBtn.addEventListener('click', async function () {
    await loadGlobal();
    await loadWatch();
    await loadTrend();
    loadFG();
    toast('OK');
  });
  var addTop = $('addTop');
  if (addTop) addTop.addEventListener('click', function () {
    DEFAULTS.forEach(function (id) { if (!list.includes(id)) list.push(id); });
    localStorage.setItem('ct_wl', JSON.stringify(list));
    loadWatch();
  });

  applyTheme();
  loadGlobal();
  loadWatch();
  loadTrend();
  loadFG();
  tryAutoConnect();
})();
