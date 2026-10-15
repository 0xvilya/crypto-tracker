/* v110 — news wins over core (MutationObserver), TV, APY, gas */
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

  var myNews = { at: 0, items: [], filter: 'all', painting: false, tr: {} };
  var EMPTY_RE = /^(\u2014|\u2013|-|\u2026|\.\.\.|Error|\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439|No news|\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026|Loading\u2026)?$/;

  async function fetchHN(q) {
    var d = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=15').then(function (r) { return r.json(); });
    return (d.hits || []).map(function (h) {
      return {
        title: h.title || h.story_title || '',
        link: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
        date: h.created_at || '',
        src: 'HN'
      };
    }).filter(function (x) { return x.title; });
  }

  async function translateRu(text) {
    if (!text || lang() !== 'ru') return text;
    if (myNews.tr[text]) return myNews.tr[text];
    try {
      var d = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 400)) + '&langpair=en|ru').then(function (r) { return r.json(); });
      var out = d && d.responseData && d.responseData.translatedText;
      if (out && out.indexOf('MYMEMORY') === -1) { myNews.tr[text] = out; return out; }
    } catch (e) {}
    return text;
  }

  async function loadMyNews(force) {
    if (!force && myNews.items.length && Date.now() - myNews.at < 60000) {
      await paintMyNews();
      return;
    }
    var box = $('newsList');
    if (box) box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    var all = [];
    try {
      var parts = await Promise.all([
        fetchHN('bitcoin OR crypto OR ethereum'),
        fetchHN('solana OR ripple OR blockchain'),
        fetchHN('cryptocurrency')
      ]);
      parts.forEach(function (a) { all = all.concat(a); });
    } catch (e) { console.warn(e); }
    var seen = {};
    all = all.filter(function (n) {
      var k = n.title.toLowerCase().slice(0, 70);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    all.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    myNews.items = all.slice(0, 40);
    myNews.at = Date.now();
    await paintMyNews();
  }

  async function paintMyNews() {
    var box = $('newsList');
    if (!box) return;
    myNews.painting = true;
    var items = myNews.items;
    var f = items;
    if (myNews.filter && myNews.filter !== 'all') {
      var keys = {
        bitcoin: /bitcoin|btc/i, ethereum: /ethereum|\beth\b/i, solana: /solana|\bsol\b/i,
        xrp: /\bxrp\b|ripple/i, market: /market|crypto|bitcoin|eth|sol|xrp|etf|blockchain/i
      };
      var re = keys[myNews.filter] || /./i;
      f = items.filter(function (n) { return re.test(n.title); });
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
          var title = await translateRu(f[i].title);
          var el = box.querySelector('.news-item[data-i="' + i + '"] a');
          if (el) el.textContent = title;
        } catch (e) {}
      }
    }
    setTimeout(function () { myNews.painting = false; }, 50);
  }

  function isEmptyNews() {
    var box = $('newsList');
    if (!box) return false;
    var t = (box.textContent || '').replace(/\s+/g, ' ').trim();
    return !t || EMPTY_RE.test(t) || box.querySelectorAll('.news-item').length === 0;
  }

  function guardNews() {
    var box = $('newsList');
    if (!box) return;
    var obs = new MutationObserver(function () {
      if (myNews.painting) return;
      if (isEmptyNews() && myNews.items.length) {
        paintMyNews();
      } else if (isEmptyNews() && Date.now() - myNews.at > 3000) {
        loadMyNews(true);
      }
    });
    obs.observe(box, { childList: true, subtree: true, characterData: true });
  }

  function wireNewsUI() {
    var tabs = $('newsTabs');
    if (tabs && !tabs._myWired) {
      tabs._myWired = true;
      tabs.addEventListener('click', function (e) {
        var tab = e.target.closest('.tab');
        if (!tab) return;
        tabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        tab.classList.add('on');
        myNews.filter = tab.getAttribute('data-f') || 'all';
        paintMyNews();
      }, true);
    }
    var langSel = $('langSel');
    if (langSel && !langSel._myWired) {
      langSel._myWired = true;
      langSel.addEventListener('change', function () {
        setTimeout(function () { paintMyNews(); }, 300);
      });
    }
  }

  var TV_SYM = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', monero: 'BINANCE:XMRUSDT', 'the-open-network': 'BINANCE:TONUSDT',
    toncoin: 'BINANCE:TONUSDT', polkadot: 'BINANCE:DOTUSDT', 'avalanche-2': 'BINANCE:AVAXUSDT',
    'matic-network': 'BINANCE:POLUSDT', pepe: 'BINANCE:PEPEUSDT', tron: 'BINANCE:TRXUSDT'
  };
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
  async function loadTVChart(id) {
    var box = $('tv'); if (!box) return;
    await ensureTV();
    if (!window.TradingView) return;
    box.innerHTML = '';
    box.style.height = '360px';
    var cid = 'tvw_' + Date.now();
    var el = document.createElement('div');
    el.id = cid; el.style.cssText = 'height:100%;width:100%';
    box.appendChild(el);
    var interval = '60', tab = document.querySelector('#chartTabs .tab.on');
    if (tab) { var d = +tab.getAttribute('data-d') || 1; interval = d <= 1 ? '15' : d <= 7 ? '60' : d <= 30 ? '240' : 'D'; }
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    try {
      new TradingView.widget({
        autosize: true, symbol: TV_SYM[id] || 'BINANCE:BTCUSDT', interval: interval,
        timezone: 'Etc/UTC', theme: theme, style: '1', locale: lang() === 'ru' ? 'ru' : 'en',
        toolbar_bg: theme === 'dark' ? '#12101c' : '#f5f3fb', enable_publishing: false,
        container_id: cid, allow_symbol_change: false, withdateranges: true,
        backgroundColor: theme === 'dark' ? '#12101c' : '#ffffff'
      });
    } catch (e) {}
  }

  var apyCache = {}, APY_FALLBACK = {
    ethereum: 2.2, solana: 4.6, binancecoin: 0.8, cardano: 2.5, polkadot: 3.9,
    'avalanche-2': 5.5, tron: 4.0, 'matic-network': 3.5, 'the-open-network': 3.8, toncoin: 3.8
  };
  async function fetchAPYs() {
    try {
      var d = await fetch('https://yields.llama.fi/pools').then(function (r) { return r.json(); });
      var bySym = {};
      (d.data || []).forEach(function (p) {
        var sym = (p.symbol || '').toUpperCase().split(' ')[0];
        var apy = p.apy || p.apyBase || 0, tvl = p.tvlUsd || 0;
        if (apy > 0 && apy < 50 && tvl > 1e6 && (!bySym[sym] || tvl > bySym[sym].tvl))
          bySym[sym] = { apy: apy, tvl: tvl };
      });
      [['ethereum', 'ETH'], ['solana', 'SOL'], ['binancecoin', 'BNB'], ['the-open-network', 'TON'], ['toncoin', 'TON'], ['polkadot', 'DOT'], ['matic-network', 'POL'], ['avalanche-2', 'AVAX'], ['tron', 'TRX']].forEach(function (pair) {
        if (bySym[pair[1]]) apyCache[pair[0]] = +bySym[pair[1]].apy.toFixed(2);
      });
    } catch (e) {}
    Object.keys(APY_FALLBACK).forEach(function (id) { if (apyCache[id] == null) apyCache[id] = APY_FALLBACK[id]; });
    document.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id'), apy = apyCache[id], cells = tr.querySelectorAll('td');
      if (apy != null && cells.length >= 5) cells[4].innerHTML = apy > 0 ? '<span class="apy">' + apy + '%</span>' : '\u2014';
    });
  }

  function fmtNative(n) {
    if (n == null || isNaN(n)) return '\u2014';
    if (n >= 0.01) return n.toFixed(4);
    if (n >= 0.0001) return n.toFixed(6);
    if (n >= 1e-8) return n.toFixed(8);
    return n.toFixed(10);
  }
  async function buildGasFixed() {
    var box = $('gasBox'); if (!box) return;
    box.innerHTML = '<div class="muted">\u2026</div>';
    var GL = 21000, chains = [
      { n: 'Ethereum', u: 'https://ethereum.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'BSC', u: 'https://bsc-dataseed.binance.org', priceId: 'binancecoin', sym: 'BNB' },
      { n: 'Polygon', u: 'https://polygon-bor.publicnode.com', priceId: 'matic-network', sym: 'POL' },
      { n: 'Arbitrum', u: 'https://arbitrum-one.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'Optimism', u: 'https://optimism.publicnode.com', priceId: 'ethereum', sym: 'ETH' },
      { n: 'Base', u: 'https://base.publicnode.com', priceId: 'ethereum', sym: 'ETH' }
    ];
    var prices = {}, fx = 1;
    try {
      var t = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network&vs_currencies=usd').then(function (r) { return r.json(); });
      Object.keys(t || {}).forEach(function (k) { if (t[k]) prices[k] = t[k].usd; });
    } catch (e) {}
    try {
      var fxD = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function (r) { return r.json(); });
      var c = cur();
      if (fxD && fxD.rates) { if (c === 'eur') fx = fxD.rates.EUR; else if (c === 'rub') fx = fxD.rates.RUB; else if (c === 'pln') fx = fxD.rates.PLN; }
    } catch (e) {}
    var rows = [];
    await Promise.all(chains.map(async function (ch) {
      try {
        var res = await fetch(ch.u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }) }).then(function (r) { return r.json(); });
        if (res && res.result) {
          var gwei = parseInt(res.result, 16) / 1e9;
          var nativeAmt = (gwei * 1e9 * GL) / 1e18;
          var usd = (nativeAmt * (prices[ch.priceId] || 0)) * fx;
          var t = fmtNative(nativeAmt) + ' ' + ch.sym + (usd > 0 ? ' \u2248 ' + money(usd) : '');
          rows.push({ n: ch.n, t: t, o: ch.n === 'Ethereum' ? 0 : 1 });
        }
      } catch (e) {}
    }));
    rows.sort(function (a, b) { return a.o - b.o; });
    box.innerHTML = rows.length ? rows.map(function (r) { return '<div class="hold-row"><b>' + r.n + '</b><span class="muted">' + r.t + '</span></div>'; }).join('') : '<div class="muted">\u2014</div>';
  }

  function boot() {
    wireNewsUI();
    guardNews();
    setTimeout(function () { loadMyNews(true); }, 800);
    setInterval(function () { loadMyNews(true); }, 90000);

    document.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr && !e.target.closest('.wl-rm')) setTimeout(function () { loadTVChart(tr.getAttribute('data-id')); }, 400);
      if (e.target.closest('.nav-btn[data-p="news"]')) setTimeout(function () { loadMyNews(true); }, 200);
      if (e.target.closest('.nav-btn[data-p="tools"]')) setTimeout(buildGasFixed, 300);
    }, true);

    fetchAPYs();
    setInterval(fetchAPYs, 300000);
    setInterval(function () {
      var pt = document.getElementById('p-tools');
      if (pt && pt.classList.contains('on')) buildGasFixed();
    }, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
