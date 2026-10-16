/* news-page v132 — 20 sources, parallel, never empty, fast */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var ru = {
      news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', crypto: '\u041a\u0440\u0438\u043f\u0442\u043e', stocks: '\u0410\u043a\u0446\u0438\u0438', market: '\u0420\u044b\u043d\u043e\u043a',
      loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', empty: '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439', updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e'
    };
    var en = {
      news: 'News', crypto: 'Crypto', stocks: 'Stocks', market: 'Market',
      loading: 'Loading\u2026', empty: 'No news', updated: 'Updated'
    };
    return (lang() === 'en' ? en : ru)[k] || k;
  }

  var SOURCES = {
    crypto: [
      { name: 'Cointelegraph', rss: 'https://cointelegraph.com/rss' },
      { name: 'CoinDesk', rss: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
      { name: 'Decrypt', rss: 'https://decrypt.co/feed' },
      { name: 'CryptoSlate', rss: 'https://cryptoslate.com/feed/' },
      { name: 'NewsBTC', rss: 'https://www.newsbtc.com/feed/' },
      { name: 'BeInCrypto', rss: 'https://beincrypto.com/feed/' },
      { name: 'Bitcoin Magazine', rss: 'https://bitcoinmagazine.com/.rss/full/' },
      { name: 'The Block', rss: 'https://www.theblock.co/rss.xml' },
      { name: 'CoinJournal', rss: 'https://coinjournal.net/feed/' },
      { name: 'Crypto.news', rss: 'https://crypto.news/feed/' },
      { name: 'HN Crypto', hn: 'cryptocurrency OR bitcoin OR ethereum OR solana' },
      { name: 'CoinGecko', cg: true }
    ],
    stocks: [
      { name: 'Yahoo Finance', rss: 'https://finance.yahoo.com/news/rssindex' },
      { name: 'MarketWatch', rss: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
      { name: 'CNBC', rss: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
      { name: 'Investing.com', rss: 'https://www.investing.com/rss/news.rss' },
      { name: 'Seeking Alpha', rss: 'https://seekingalpha.com/market_currents.xml' },
      { name: 'HN Stocks', hn: 'stock market OR nasdaq OR earnings OR wall street' }
    ],
    market: [
      { name: 'BBC Business', rss: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
      { name: 'CNBC Economy', rss: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258' },
      { name: 'HN Market', hn: 'federal reserve OR inflation OR economy OR markets' }
    ],
    btc: [
      { name: 'Bitcoin Magazine', rss: 'https://bitcoinmagazine.com/.rss/full/' },
      { name: 'Cointelegraph BTC', rss: 'https://cointelegraph.com/rss/tag/bitcoin' },
      { name: 'NewsBTC', rss: 'https://www.newsbtc.com/feed/' },
      { name: 'HN BTC', hn: 'bitcoin OR BTC' }
    ],
    eth: [
      { name: 'Cointelegraph ETH', rss: 'https://cointelegraph.com/rss/tag/ethereum' },
      { name: 'Decrypt', rss: 'https://decrypt.co/feed' },
      { name: 'HN ETH', hn: 'ethereum OR ETH OR vitalik' }
    ]
  };

  var PROXIES = [
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function (u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); },
    function (u) { return 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u); }
  ];

  var state = {
    tab: 'crypto',
    items: {},
    translated: {},
    at: {},
    loading: false,
    timer: null
  };

  function ensurePage() {
    var wrap = document.querySelector('.wrap');
    if (!wrap) return null;
    var page = $('p-news');
    if (!page) {
      page = document.createElement('section');
      page.id = 'p-news';
      page.className = 'page';
      wrap.appendChild(page);
    }
    if (!page.querySelector('#newsRoot')) {
      page.innerHTML =
        '<div class="card" id="newsRoot" style="min-height:70vh">' +
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.55rem">' +
        '<h2 style="margin:0;flex:1;font-size:1.05rem" id="newsTitle">' + t('news') + '</h2>' +
        '<span class="muted" id="newsUpdated" style="font-size:.7rem"></span>' +
        '<button type="button" class="btn-ghost" id="newsRefreshBtn">\u21bb</button></div>' +
        '<div class="chart-tabs" id="newsCatTabs" style="flex-wrap:wrap;gap:.25rem;margin-bottom:.5rem">' +
        '<button type="button" class="tab on" data-nt="crypto">' + t('crypto') + '</button>' +
        '<button type="button" class="tab" data-nt="stocks">' + t('stocks') + '</button>' +
        '<button type="button" class="tab" data-nt="market">' + t('market') + '</button>' +
        '<button type="button" class="tab" data-nt="btc">BTC</button>' +
        '<button type="button" class="tab" data-nt="eth">ETH</button></div>' +
        '<div id="newsFeed" style="min-height:55vh"></div></div>';
      page.querySelectorAll('#newsCatTabs .tab').forEach(function (tb) {
        tb.onclick = function () {
          page.querySelectorAll('#newsCatTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          tb.classList.add('on');
          state.tab = tb.getAttribute('data-nt') || 'crypto';
          paint();
          load(false);
        };
      });
      if ($('newsRefreshBtn')) $('newsRefreshBtn').onclick = function () { load(true); };
    }
    var nav = $('nav');
    if (nav) {
      nav.style.gridTemplateColumns = 'repeat(6, 1fr)';
      var btn = document.querySelector('.nav-btn[data-p="news"]');
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-btn';
        btn.setAttribute('data-p', 'news');
        btn.innerHTML = '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg><span>' + t('news') + '</span>';
        var tools = document.querySelector('.nav-btn[data-p="tools"]');
        if (tools) nav.insertBefore(btn, tools); else nav.appendChild(btn);
      }
      btn.style.display = 'flex';
      btn.hidden = false;
      var sp = btn.querySelector('span');
      if (sp) sp.textContent = t('news');
    }
    return page;
  }

  function openNews() {
    ensurePage();
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
    paint();
    load(false);
    startAuto();
  }

  function startAuto() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) load(true);
    }, 20000);
  }

  async function fetchText(url, timeout) {
    timeout = timeout || 7000;
    var lastErr;
    for (var i = 0; i < PROXIES.length; i++) {
      try {
        var r = await fetch(PROXIES[i](url), { signal: AbortSignal.timeout(timeout) });
        if (!r.ok) continue;
        return await r.text();
      } catch (e) { lastErr = e; }
    }
    try {
      var r2 = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      if (r2.ok) return await r2.text();
    } catch (e) {}
    throw lastErr || new Error('fail');
  }

  function parseRss(xml, srcName) {
    var items = [];
    try {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      var nodes = doc.querySelectorAll('item');
      if (!nodes.length) nodes = doc.querySelectorAll('entry');
      nodes.forEach(function (n, idx) {
        if (idx > 8) return;
        var title = (n.querySelector('title') || {}).textContent || '';
        var linkEl = n.querySelector('link');
        var link = '';
        if (linkEl) link = linkEl.getAttribute('href') || linkEl.textContent || '';
        if (!link) {
          var guid = n.querySelector('guid');
          if (guid) link = guid.textContent || '';
        }
        var dateEl = n.querySelector('pubDate') || n.querySelector('published') || n.querySelector('updated');
        var ts = dateEl ? dateEl.textContent : new Date().toISOString();
        title = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        link = (link || '').trim();
        if (title && link && link.indexOf('http') === 0) {
          items.push({
            id: 'rss-' + srcName + '-' + idx + '-' + title.slice(0, 24),
            title: title,
            url: link,
            src: srcName,
            ts: ts
          });
        }
      });
    } catch (e) {}
    return items;
  }

  async function fetchRss(src) {
    try {
      var xml = await fetchText(src.rss, 6500);
      return parseRss(xml, src.name);
    } catch (e) { return []; }
  }

  async function fetchHN(q, name) {
    try {
      var url = 'https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=15';
      var r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      var d = await r.json();
      return (d.hits || []).filter(function (h) { return h.title && h.url; }).map(function (h) {
        return { id: 'hn-' + h.objectID, title: h.title, url: h.url, src: name || 'HN', ts: h.created_at };
      });
    } catch (e) { return []; }
  }

  async function fetchCG() {
    try {
      var r = await fetch('https://api.coingecko.com/api/v3/search/trending', { signal: AbortSignal.timeout(7000) });
      if (!r.ok) return [];
      var d = await r.json();
      var L = lang();
      return (d.coins || []).slice(0, 6).map(function (c) {
        var n = c.item;
        return {
          id: 'cg-' + n.id,
          title: (L === 'ru' ? '\u0412 \u0442\u0440\u0435\u043d\u0434\u0435: ' : 'Trending: ') + n.name + ' (' + (n.symbol || '').toUpperCase() + ')',
          url: 'https://www.coingecko.com/en/coins/' + n.id,
          src: 'CoinGecko',
          ts: new Date().toISOString()
        };
      });
    } catch (e) { return []; }
  }

  async function translateOne(text, target) {
    if (!text || target === 'en') return text;
    if (/[\u0400-\u04FF]/.test(text) && target === 'ru') return text;
    var key = target + ':' + text;
    if (state.translated[key]) return state.translated[key];
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + target + '&dt=t&q=' + encodeURIComponent(text.slice(0, 400));
      var r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      if (out) { state.translated[key] = out; return out; }
    } catch (e) {}
    return text;
  }

  async function translateItems(items) {
    var L = lang();
    if (L === 'en') return items;
    var out = [];
    for (var i = 0; i < items.length; i += 5) {
      var batch = items.slice(i, i + 5);
      var done = await Promise.all(batch.map(async function (it) {
        var c = Object.assign({}, it);
        c.title = await translateOne(it.title, L);
        return c;
      }));
      out = out.concat(done);
    }
    return out;
  }

  function dedupe(items) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      var k = (it.title || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 70);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out;
  }

  async function load(force) {
    if (state.loading && !force) return;
    var tab = state.tab;
    var age = Date.now() - (state.at[tab] || 0);
    if (!force && state.items[tab] && state.items[tab].length && age < 15000) {
      paint();
      return;
    }
    state.loading = true;
    var box = $('newsFeed');
    if (box && (!state.items[tab] || !state.items[tab].length)) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('loading') + '</div>';
    }

    var sources = SOURCES[tab] || SOURCES.crypto;
    var tasks = sources.map(function (src) {
      if (src.rss) return fetchRss(src);
      if (src.hn) return fetchHN(src.hn, src.name);
      if (src.cg) return fetchCG();
      return Promise.resolve([]);
    });

    var results = await Promise.allSettled(tasks);
    var merged = [];
    results.forEach(function (r) {
      if (r.status === 'fulfilled' && r.value && r.value.length) merged = merged.concat(r.value);
    });

    merged = dedupe(merged);
    merged.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });

    if (!merged.length && state.items[tab] && state.items[tab].length) {
      state.loading = false;
      paint();
      return;
    }

    if (merged.length) {
      try { merged = await translateItems(merged.slice(0, 40)); }
      catch (e) { merged = merged.slice(0, 40); }
      var prev = state.items[tab] || [];
      if (prev.length && force) {
        var ids = {};
        merged.forEach(function (m) { ids[m.id] = 1; });
        prev.forEach(function (p) { if (!ids[p.id]) merged.push(p); });
        merged = dedupe(merged).slice(0, 50);
      }
      state.items[tab] = merged;
      state.at[tab] = Date.now();
    }

    paint();
    state.loading = false;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function paint() {
    var box = $('newsFeed');
    if (!box) return;
    var items = state.items[state.tab] || [];
    if ($('newsUpdated') && state.at[state.tab]) {
      $('newsUpdated').textContent = t('updated') + ' ' + new Date(state.at[state.tab]).toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-US');
    }
    if (!items.length) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('empty') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      var time = '';
      try {
        if (it.ts) {
          var d = new Date(it.ts);
          if (!isNaN(d.getTime())) {
            time = d.toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
          }
        }
      } catch (e) {}
      html +=
        '<article style="padding:.72rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + escapeHtml(it.url) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        escapeHtml(it.title) + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.28rem">' +
        escapeHtml(it.src || '') + (time ? ' \u00b7 ' + time : '') +
        '</div></article>';
    });
    box.innerHTML = html;
  }

  window.__ct_loadNews = function (force) { ensurePage(); load(!!force); };
  window.__ct_openNews = openNews;

  function boot() {
    ensurePage();
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        e.preventDefault();
        e.stopPropagation();
        openNews();
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__newsLang2) {
      langSel.__newsLang2 = true;
      langSel.addEventListener('change', function () {
        state.translated = {};
        state.at = {};
        state.items = {};
        if ($('p-news') && $('p-news').classList.contains('on')) {
          if ($('newsTitle')) $('newsTitle').textContent = t('news');
          load(true);
        }
      });
    }

    setInterval(function () {
      ensurePage();
      var btn = document.querySelector('.nav-btn[data-p="news"]');
      if (btn) { btn.style.display = 'flex'; btn.hidden = false; }
    }, 3000);

    setTimeout(function () {
      if (!state.items.crypto) load(false);
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
