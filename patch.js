/* v113 — TradingView for ALL coins, loading state, no white flash */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() { var s = $('langSel'); return (s && s.value) || localStorage.getItem('ct_lang') || 'ru'; }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function money(v) {
    if (v == null || isNaN(v)) return '\u2014';
    var c = cur(), s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1000) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return s + n.toFixed(2);
    if (Math.abs(n) >= 0.01) return s + n.toFixed(4);
    return s + n.toFixed(6);
  }

  var TV_SYM = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', litecoin: 'BINANCE:LTCUSDT', chainlink: 'BINANCE:LINKUSDT',
    polkadot: 'BINANCE:DOTUSDT', 'avalanche-2': 'BINANCE:AVAXUSDT', tron: 'BINANCE:TRXUSDT',
    'matic-network': 'BINANCE:POLUSDT', 'shiba-inu': 'BINANCE:SHIBUSDT', pepe: 'BINANCE:PEPEUSDT',
    monero: 'BINANCE:XMRUSDT', 'the-open-network': 'BINANCE:TONUSDT', toncoin: 'BINANCE:TONUSDT',
    'usd-coin': 'BINANCE:USDCUSDT', tether: 'BINANCE:USDTUSDT', 'bitcoin-cash': 'BINANCE:BCHUSDT',
    stellar: 'BINANCE:XLMUSDT', near: 'BINANCE:NEARUSDT', aptos: 'BINANCE:APTUSDT',
    arbitrum: 'BINANCE:ARBUSDT', optimism: 'BINANCE:OPUSDT', sui: 'BINANCE:SUIUSDT',
    render: 'BINANCE:RENDERUSDT', 'internet-computer': 'BINANCE:ICPUSDT',
    uniswap: 'BINANCE:UNIUSDT', aave: 'BINANCE:AAVEUSDT', cosmos: 'BINANCE:ATOMUSDT',
    filecoin: 'BINANCE:FILUSDT', injective: 'BINANCE:INJUSDT', hedera: 'BINANCE:HBARUSDT'
  };
  var SYM_TO_ID = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
    ADA: 'cardano', DOGE: 'dogecoin', LTC: 'litecoin', LINK: 'chainlink', DOT: 'polkadot',
    AVAX: 'avalanche-2', TRX: 'tron', POL: 'matic-network', MATIC: 'matic-network',
    SHIB: 'shiba-inu', PEPE: 'pepe', XMR: 'monero', TON: 'the-open-network'
  };

  function tvSymbol(id) {
    if (TV_SYM[id]) return TV_SYM[id];
    try {
      var c = (window.COINS && window.COINS[id]) || {};
      var sym = (c.sym || '').toUpperCase();
      if (sym) return 'BINANCE:' + sym + 'USDT';
    } catch (e) {}
    return 'BINANCE:BTCUSDT';
  }

  function currentCoinId() {
    var sy = (($('dSym') || {}).textContent || '').trim().toUpperCase();
    if (SYM_TO_ID[sy]) return SYM_TO_ID[sy];
    try {
      var coins = window.COINS || {};
      for (var k in coins) {
        if ((coins[k].sym || '').toUpperCase() === sy) return k;
      }
    } catch (e) {}
    return null;
  }

  var tvReady = null, lastTVId = null, loadingTV = false;
  function ensureTV() {
    if (window.TradingView) return Promise.resolve();
    if (tvReady) return tvReady;
    tvReady = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { tvReady = null; res(); };
      document.head.appendChild(s);
    });
    return tvReady;
  }

  function showChartLoading() {
    var box = $('tv');
    if (!box) return;
    box.style.background = '#12101c';
    box.style.minHeight = '360px';
    box.style.height = '360px';
    box.style.borderRadius = '12px';
    box.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8;font-size:.85rem">' +
      (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0433\u0440\u0430\u0444\u0438\u043a\u0430\u2026' : 'Loading chart\u2026') + '</div>';
  }

  async function loadTV(id, force) {
    if (!id) return;
    var box = $('tv');
    if (!box) return;
    if (!force && lastTVId === id && box.querySelector('iframe')) return;
    if (loadingTV && lastTVId === id) return;
    loadingTV = true;
    lastTVId = id;
    showChartLoading();
    await ensureTV();
    if (!window.TradingView) {
      box.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">' +
        (lang() === 'ru' ? '\u0413\u0440\u0430\u0444\u0438\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d' : 'Chart unavailable') + '</div>';
      loadingTV = false;
      return;
    }
    box.innerHTML = '';
    box.style.background = '#12101c';
    box.style.minHeight = '360px';
    box.style.height = '360px';
    var cid = 'tvw_' + Date.now();
    var el = document.createElement('div');
    el.id = cid;
    el.style.cssText = 'height:100%;width:100%';
    box.appendChild(el);

    var interval = '15';
    var tab = document.querySelector('#chartTabs .tab.on');
    if (tab) {
      var d = +tab.getAttribute('data-d') || 1;
      interval = d <= 1 ? '15' : d <= 7 ? '60' : d <= 30 ? '240' : 'D';
    }
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    try {
      new TradingView.widget({
        autosize: true,
        symbol: tvSymbol(id),
        interval: interval,
        timezone: 'Etc/UTC',
        theme: theme,
        style: '1',
        locale: lang() === 'ru' ? 'ru' : 'en',
        toolbar_bg: theme === 'dark' ? '#12101c' : '#f5f3fb',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: cid,
        backgroundColor: theme === 'dark' ? '#12101c' : '#ffffff',
        gridColor: theme === 'dark' ? 'rgba(42,37,64,0.45)' : 'rgba(224,219,235,0.8)',
        allow_symbol_change: false,
        withdateranges: true,
        details: false,
        hotlist: false,
        calendar: false,
        studies: []
      });
    } catch (e) {
      console.warn('TV', e);
      box.innerHTML = '<div style="color:#8b83a8;text-align:center;padding:2rem">' +
        (lang() === 'ru' ? '\u041e\u0448\u0438\u0431\u043a\u0430 \u0433\u0440\u0430\u0444\u0438\u043a\u0430' : 'Chart error') + '</div>';
    }
    if ($('chartTip')) $('chartTip').textContent = '';
    loadingTV = false;
  }

  function scheduleTV(id) {
    if (!id) return;
    setTimeout(function () { loadTV(id, true); }, 500);
    setTimeout(function () { loadTV(id, true); }, 1500);
  }

  var newsCache = { at: 0, items: [], filter: 'all', tr: {} };
  async function hn(q) {
    var d = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=12').then(function (r) { return r.json(); });
    return (d.hits || []).map(function (h) {
      return { title: h.title || h.story_title || '', link: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID), date: h.created_at || '', src: 'HN' };
    }).filter(function (x) { return x.title; });
  }
  async function trRu(t) {
    if (!t || lang() !== 'ru') return t;
    if (newsCache.tr[t]) return newsCache.tr[t];
    try {
      var d = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(t.slice(0, 400)) + '&langpair=en|ru').then(function (r) { return r.json(); });
      var o = d && d.responseData && d.responseData.translatedText;
      if (o && o.indexOf('MYMEMORY') === -1) { newsCache.tr[t] = o; return o; }
    } catch (e) {}
    return t;
  }
  async function loadNews() {
    var box = $('newsList');
    if (!box) return;
    if (newsCache.items.length && Date.now() - newsCache.at < 60000) { await paintNews(); return; }
    box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    var all = [];
    try {
      var parts = await Promise.all([hn('bitcoin OR crypto OR ethereum'), hn('solana OR ripple OR blockchain'), hn('cryptocurrency')]);
      parts.forEach(function (a) { all = all.concat(a); });
    } catch (e) {}
    var seen = {};
    all = all.filter(function (n) {
      var k = n.title.toLowerCase().slice(0, 70);
      if (seen[k]) return false; seen[k] = 1; return true;
    }).sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    newsCache.items = all.slice(0, 40);
    newsCache.at = Date.now();
    await paintNews();
  }
  async function paintNews() {
    var box = $('newsList'); if (!box) return;
    var f = newsCache.items;
    if (newsCache.filter && newsCache.filter !== 'all') {
      var keys = { bitcoin: /bitcoin|btc/i, ethereum: /ethereum|\beth\b/i, solana: /solana|\bsol\b/i, xrp: /\bxrp\b|ripple/i, market: /market|crypto|bitcoin|eth|sol|xrp|etf|blockchain/i };
      var re = keys[newsCache.filter] || /./i;
      f = newsCache.items.filter(function (n) { return re.test(n.title); });
    }
    var L = lang(), html = [], limit = Math.min(f.length, 20);
    for (var i = 0; i < limit; i++) {
      var n = f[i], d = '';
      try { d = new Date(n.date).toLocaleString(L === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      html.push('<div class="news-item" data-i="' + i + '"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>');
    }
    box.innerHTML = html.join('') || '<div class="empty">\u2014</div>';
    if (L === 'ru') {
      for (var i = 0; i < limit; i++) {
        try {
          var title = await trRu(f[i].title);
          var el = box.querySelector('.news-item[data-i="' + i + '"] a');
          if (el) el.textContent = title;
        } catch (e) {}
      }
    }
  }

  function fmtN(n) {
    if (n == null || isNaN(n)) return '\u2014';
    if (n >= 0.01) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    if (n >= 1e-8) return n.toFixed(8);
    return n.toFixed(10);
  }
  async function gas() {
    var box = $('gasBox'); if (!box) return;
    box.innerHTML = '<div class="muted">\u2026</div>';
    var GL = 21000;
    var chains = [
      { n: 'Ethereum', u: 'https://ethereum.publicnode.com', id: 'ethereum', sym: 'ETH' },
      { n: 'BSC', u: 'https://bsc-dataseed.binance.org', id: 'binancecoin', sym: 'BNB' },
      { n: 'Polygon', u: 'https://polygon-bor.publicnode.com', id: 'matic-network', sym: 'POL' },
      { n: 'Arbitrum', u: 'https://arbitrum-one.publicnode.com', id: 'ethereum', sym: 'ETH' },
      { n: 'Optimism', u: 'https://optimism.publicnode.com', id: 'ethereum', sym: 'ETH' },
      { n: 'Base', u: 'https://base.publicnode.com', id: 'ethereum', sym: 'ETH' }
    ];
    var prices = {}, fx = 1;
    try {
      var t = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network&vs_currencies=usd').then(function (r) { return r.json(); });
      Object.keys(t || {}).forEach(function (k) { if (t[k]) prices[k] = t[k].usd; });
    } catch (e) {}
    try {
      var fxD = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function (r) { return r.json(); });
      var c = cur();
      if (fxD && fxD.rates) {
        if (c === 'eur') fx = fxD.rates.EUR;
        else if (c === 'rub') fx = fxD.rates.RUB;
        else if (c === 'pln') fx = fxD.rates.PLN;
      }
    } catch (e) {}
    var rows = [];
    await Promise.all(chains.map(async function (ch) {
      try {
        var res = await fetch(ch.u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }) }).then(function (r) { return r.json(); });
        if (res && res.result) {
          var gwei = parseInt(res.result, 16) / 1e9;
          var amt = (gwei * 1e9 * GL) / 1e18;
          var usd = amt * (prices[ch.id] || 0) * fx;
          rows.push({ n: ch.n, t: fmtN(amt) + ' ' + ch.sym + (usd > 0 ? ' \u2248 ' + money(usd) : ''), o: ch.n === 'Ethereum' ? 0 : 1 });
        }
      } catch (e) {}
    }));
    rows.sort(function (a, b) { return a.o - b.o; });
    box.innerHTML = rows.length ? rows.map(function (r) { return '<div class="hold-row"><b>' + r.n + '</b><span class="muted">' + r.t + '</span></div>'; }).join('') : '<div class="muted">\u2014</div>';
  }

  function boot() {
    ensureTV();

    document.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr && !e.target.closest('.wl-rm')) {
        scheduleTV(tr.getAttribute('data-id'));
      }
      var trend = e.target.closest('.trend-row, [data-id].tab');
      if (trend && trend.getAttribute('data-id')) {
        scheduleTV(trend.getAttribute('data-id'));
      }
      if (e.target.closest('#chartTabs .tab')) {
        setTimeout(function () {
          var id = currentCoinId();
          if (id) loadTV(id, true);
        }, 200);
      }
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(loadNews, 500);
        setTimeout(loadNews, 2000);
      }
      if (e.target.closest('#newsTabs .tab')) {
        var tab = e.target.closest('.tab');
        newsCache.filter = tab.getAttribute('data-f') || 'all';
        setTimeout(paintNews, 50);
      }
      if (e.target.closest('.nav-btn[data-p="tools"]')) setTimeout(gas, 300);
    }, true);

    setInterval(function () {
      var det = $('detail');
      if (!det || det.style.display === 'none') return;
      var box = $('tv');
      if (!box) return;
      if (!box.querySelector('iframe') && !loadingTV) {
        var id = currentCoinId();
        if (id) loadTV(id, true);
      }
    }, 2500);

    var langSel = $('langSel');
    if (langSel) langSel.addEventListener('change', function () { setTimeout(paintNews, 400); });

    setTimeout(loadNews, 2500);
    setInterval(function () {
      var pn = document.getElementById('p-news');
      if (pn && pn.classList.contains('on')) loadNews();
    }, 90000);
    setInterval(function () {
      var pt = document.getElementById('p-tools');
      if (pt && pt.classList.contains('on')) gas();
    }, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
