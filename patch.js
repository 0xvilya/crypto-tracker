/* v108 — TradingView charts, live APY, readable gas, auto-refresh */
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
    monero: 'BINANCE:XMRUSDT', 'the-open-network': 'BINANCE:TONUSDT', toncoin: 'BINANCE:TONUSDT'
  };
  function tvSymbol(id) {
    if (TV_SYM[id]) return TV_SYM[id];
    var c = (window.COINS && window.COINS[id]) || {};
    var sym = (c.sym || id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (sym) return 'BINANCE:' + sym + 'USDT';
    return 'BINANCE:BTCUSDT';
  }

  var tvReady = null;
  function ensureTV() {
    if (window.TradingView) return Promise.resolve();
    if (tvReady) return tvReady;
    tvReady = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
    return tvReady;
  }

  var tvWidget = null;
  async function loadTVChart(id) {
    var box = $('tv');
    if (!box) return;
    await ensureTV();
    if (!window.TradingView) return;
    box.innerHTML = '';
    box.style.height = '360px';
    var cid = 'tvw_' + Date.now();
    var el = document.createElement('div');
    el.id = cid;
    el.style.height = '100%';
    el.style.width = '100%';
    box.appendChild(el);
    var interval = '60';
    var tab = document.querySelector('#chartTabs .tab.on');
    if (tab) {
      var d = +tab.getAttribute('data-d') || 1;
      interval = d <= 1 ? '15' : d <= 7 ? '60' : d <= 30 ? '240' : 'D';
    }
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    try {
      tvWidget = new TradingView.widget({
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
        gridColor: theme === 'dark' ? 'rgba(42,37,64,0.5)' : 'rgba(224,219,235,0.8)',
        allow_symbol_change: false,
        withdateranges: true,
        details: false,
        hotlist: false,
        calendar: false,
        studies: []
      });
    } catch (e) { console.warn('TV widget', e); }
    if ($('chartTip')) $('chartTip').textContent = '';
  }

  function hookCharts() {
    document.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr && !e.target.closest('.wl-rm')) {
        var id = tr.getAttribute('data-id');
        setTimeout(function () { loadTVChart(id); }, 400);
      }
      var trend = e.target.closest('.trend-row');
      if (trend) {
        var id2 = trend.getAttribute('data-id');
        setTimeout(function () { loadTVChart(id2); }, 400);
      }
      var tab = e.target.closest('#chartTabs .tab');
      if (tab) {
        setTimeout(function () {
          var sid = null;
          if ($('dSym')) {
            var sy = $('dSym').textContent.trim().toUpperCase();
            var map = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', TON: 'the-open-network', XMR: 'monero', LINK: 'chainlink', DOT: 'polkadot', AVAX: 'avalanche-2', TRX: 'tron', POL: 'matic-network', PEPE: 'pepe' };
            sid = map[sy] || null;
          }
          if (sid) loadTVChart(sid);
        }, 200);
      }
    }, true);
  }

  var apyCache = {}, apyAt = 0;
  var APY_FALLBACK = {
    ethereum: 2.2, solana: 4.6, binancecoin: 0.8, cardano: 2.5, polkadot: 3.9,
    'avalanche-2': 5.5, tron: 4.0, 'matic-network': 3.5, 'the-open-network': 3.8,
    toncoin: 3.8, bitcoin: 0, ripple: 0, dogecoin: 0, litecoin: 0, pepe: 0, monero: 0
  };
  async function fetchAPYs() {
    if (Date.now() - apyAt < 300000 && Object.keys(apyCache).length) return apyCache;
    try {
      var d = await fetch('https://yields.llama.fi/pools').then(function (r) { return r.json(); });
      var pools = d.data || [];
      var bySym = {};
      pools.forEach(function (p) {
        var sym = (p.symbol || '').toUpperCase().split(' ')[0];
        var apy = p.apy || p.apyBase || 0;
        var tvl = p.tvlUsd || 0;
        if (apy > 0 && apy < 50 && tvl > 1e6) {
          if (!bySym[sym] || tvl > bySym[sym].tvl) bySym[sym] = { apy: apy, tvl: tvl };
        }
      });
      var map = {
        ethereum: bySym.ETH || bySym.STETH,
        solana: bySym.SOL || bySym.JITOSOL,
        binancecoin: bySym.BNB || bySym.SLISBNB,
        polkadot: bySym.DOT,
        'avalanche-2': bySym.AVAX || bySym.SAVAX,
        tron: bySym.TRX,
        'matic-network': bySym.MATIC || bySym.POL,
        'the-open-network': bySym.TON,
        toncoin: bySym.TON,
        cardano: bySym.ADA
      };
      Object.keys(map).forEach(function (id) {
        if (map[id] && map[id].apy) apyCache[id] = +map[id].apy.toFixed(2);
      });
      Object.keys(APY_FALLBACK).forEach(function (id) {
        if (apyCache[id] == null) apyCache[id] = APY_FALLBACK[id];
      });
      apyAt = Date.now();
    } catch (e) {
      Object.keys(APY_FALLBACK).forEach(function (id) {
        if (apyCache[id] == null) apyCache[id] = APY_FALLBACK[id];
      });
    }
    applyAPYToUI();
    return apyCache;
  }
  function applyAPYToUI() {
    document.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id');
      var apy = apyCache[id];
      if (apy == null) return;
      var cells = tr.querySelectorAll('td');
      if (cells.length >= 5) {
        var cell = cells[4];
        if (apy > 0) cell.innerHTML = '<span class="apy">' + apy + '%</span>';
        else cell.textContent = '\u2014';
      }
    });
    var sc = $('stakeCoin'), sa = $('stakeApy');
    if (sc && sa && apyCache[sc.value] != null) {
      if (document.activeElement !== sa) sa.value = apyCache[sc.value];
    }
  }

  function fmtNative(n) {
    if (n == null || isNaN(n)) return '\u2014';
    if (n >= 0.01) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    if (n >= 1e-8) return n.toFixed(8);
    if (n >= 1e-10) return n.toFixed(10);
    return n.toFixed(12).replace(/\.?0+$/, '') || '0';
  }
  async function buildGasFixed() {
    var box = $('gasBox'); if (!box) return;
    box.innerHTML = '<div class="muted">\u2026</div>';
    var GL = 21000;
    var chains = [
      { n: 'Ethereum', u: 'https://ethereum.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'BSC', u: 'https://bsc-dataseed.binance.org', priceId: 'binancecoin', sym: 'BNB' },
      { n: 'Polygon', u: 'https://polygon-bor.publicnode.com', priceId: 'matic-network', sym: 'POL' },
      { n: 'Arbitrum', u: 'https://arbitrum-one.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'Optimism', u: 'https://optimism.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'Base', u: 'https://base.publicnode.com', priceId: 'ethereum', sym: 'ETH' }
    ];
    var prices = {};
    try {
      var ids = chains.map(function (c) { return c.priceId; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(',');
      var t = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd').then(function (r) { return r.json(); });
      Object.keys(t || {}).forEach(function (k) { if (t[k]) prices[k] = t[k].usd; });
    } catch (e) {}
    var fx = 1;
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
        var res = await fetch(ch.u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] })
        }).then(function (r) { return r.json(); });
        if (res && res.result) {
          var gwei = parseInt(res.result, 16) / 1e9;
          var nativeAmt = (gwei * 1e9 * GL) / 1e18;
          var usd = (nativeAmt * (prices[ch.priceId] || 0)) * fx;
          var t = fmtNative(nativeAmt) + ' ' + ch.sym;
          if (usd > 0) t += ' \u2248 ' + money(usd);
          rows.push({ n: ch.n, t: t, o: ch.n === 'Ethereum' ? 0 : 1 });
        }
      } catch (e) {}
    }));
    rows.sort(function (a, b) { return a.o - b.o; });
    box.innerHTML = rows.length
      ? rows.map(function (r) { return '<div class="hold-row"><b>' + r.n + '</b><span class="muted">' + r.t + '</span></div>'; }).join('')
      : '<div class="muted">\u2014</div>';
  }

  async function loadNewsFixed() {
    var box = $('newsList'); if (!box) return;
    box.innerHTML = '<div class="empty">\u2026</div>';
    try {
      var feeds = [
        { n: 'Cointelegraph', u: 'https://feed2json.org/convert?url=' + encodeURIComponent('https://cointelegraph.com/rss') },
        { n: 'CoinDesk', u: 'https://feed2json.org/convert?url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') },
        { n: 'Decrypt', u: 'https://feed2json.org/convert?url=' + encodeURIComponent('https://decrypt.co/feed') }
      ];
      var all = [];
      await Promise.all(feeds.map(async function (f) {
        try {
          var d = await fetch(f.u).then(function (r) { return r.json(); });
          (d.items || []).forEach(function (it) {
            var t = String(it.title || '').trim();
            if (t) all.push({ title: t, link: it.url || it.link || '#', date: it.date_published || '', src: f.n });
          });
        } catch (e) {}
      }));
      all.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
      var L = lang(), html = [];
      for (var i = 0; i < Math.min(all.length, 18); i++) {
        var n = all[i], title = n.title;
        if (L === 'ru') {
          try {
            var tr = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(title.slice(0, 350)) + '&langpair=en|ru').then(function (r) { return r.json(); });
            var out = tr && tr.responseData && tr.responseData.translatedText;
            if (out && out.indexOf('MYMEMORY') === -1) title = out;
          } catch (e) {}
        }
        var d = '';
        try { d = new Date(n.date).toLocaleString(L === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
        html.push('<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + title + '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>');
      }
      box.innerHTML = html.join('') || '<div class="empty">\u2014</div>';
    } catch (e) { box.innerHTML = '<div class="empty">Error</div>'; }
  }

  function enhanceStaking() {
    var coin = $('stakeCoin'), apy = $('stakeApy'), amt = $('stakeAmt'), out = $('stakeOut');
    if (!coin || !out) return;
    function calc() {
      var a = parseFloat((amt || {}).value) || 0;
      var p = parseFloat((apy || {}).value) || 0;
      var days = parseInt(($('stakeDays') || {}).value, 10) || 365;
      var compound = (($('stakeCompound') || {}).value) === '1';
      var final, profit;
      if (compound) { final = a * Math.pow(1 + p / 100 / 365, days); profit = final - a; }
      else { profit = a * (p / 100) * (days / 365); final = a + profit; }
      out.textContent = money(final) + '  (+' + money(profit) + ')';
      var hint = $('stakeHint');
      if (hint) hint.textContent = (lang() === 'ru' ? '\u0417\u0430 ' : 'For ') + days + (lang() === 'ru' ? ' \u0434\u043d. \u00b7 APY ' : ' days \u00b7 APY ') + p + '%';
    }
    coin.addEventListener('change', function () {
      var id = coin.value;
      if (apy && apyCache[id] != null) apy.value = apyCache[id];
      else if (apy && APY_FALLBACK[id] != null) apy.value = APY_FALLBACK[id];
      calc();
    });
    ['stakeAmt', 'stakeApy', 'stakeDays', 'stakeCompound'].forEach(function (id) {
      var el = $(id);
      if (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); }
    });
    if (apy && coin.value && apyCache[coin.value] != null) apy.value = apyCache[coin.value];
    calc();
  }

  function boot() {
    hookCharts();
    fetchAPYs();
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-p');
        if (p === 'news') setTimeout(loadNewsFixed, 300);
        if (p === 'tools') { setTimeout(buildGasFixed, 300); setTimeout(enhanceStaking, 500); }
        if (p === 'home') setTimeout(applyAPYToUI, 800);
      });
    });
    setInterval(function () {
      var pt = document.getElementById('p-tools');
      if (pt && pt.classList.contains('on')) buildGasFixed();
    }, 30000);
    setInterval(function () {
      var pn = document.getElementById('p-news');
      if (pn && pn.classList.contains('on')) loadNewsFixed();
    }, 90000);
    setInterval(fetchAPYs, 300000);
    setTimeout(function () { fetchAPYs().then(applyAPYToUI); }, 2500);
    setTimeout(enhanceStaking, 2000);
    setTimeout(function () {
      if ($('detail') && $('detail').style.display !== 'none' && $('dSym')) {
        var sy = ($('dSym').textContent || '').trim().toUpperCase();
        var map = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', TON: 'the-open-network', XMR: 'monero' };
        if (map[sy]) loadTVChart(map[sy]);
      }
    }, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
