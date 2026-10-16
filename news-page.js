/* news-page v131 — solid news section, multi-source, live translate, auto-refresh */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var ru = {
      news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', crypto: '\u041a\u0440\u0438\u043f\u0442\u043e', stocks: '\u0410\u043a\u0446\u0438\u0438', market: '\u0420\u044b\u043d\u043e\u043a',
      btc: 'Bitcoin', eth: 'Ethereum', loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', empty: '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439',
      updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e', source: '\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a', refresh: '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c'
    };
    var en = {
      news: 'News', crypto: 'Crypto', stocks: 'Stocks', market: 'Market',
      btc: 'Bitcoin', eth: 'Ethereum', loading: 'Loading\u2026', empty: 'No news',
      updated: 'Updated', source: 'Source', refresh: 'Refresh'
    };
    return (lang() === 'en' ? en : ru)[k] || k;
  }

  var state = {
    tab: 'crypto',
    items: { crypto: [], stocks: [], market: [], btc: [], eth: [] },
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
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.6rem">' +
        '<h2 style="margin:0;flex:1;font-size:1.05rem" id="newsTitle">' + t('news') + '</h2>' +
        '<span class="muted" id="newsUpdated" style="font-size:.7rem"></span>' +
        '<button type="button" class="btn-ghost" id="newsRefreshBtn" title="refresh">\u21bb</button>' +
        '</div>' +
        '<div class="chart-tabs" id="newsCatTabs" style="flex-wrap:wrap;gap:.25rem;margin-bottom:.55rem">' +
        '<button type="button" class="tab on" data-nt="crypto">' + t('crypto') + '</button>' +
        '<button type="button" class="tab" data-nt="stocks">' + t('stocks') + '</button>' +
        '<button type="button" class="tab" data-nt="market">' + t('market') + '</button>' +
        '<button type="button" class="tab" data-nt="btc">BTC</button>' +
        '<button type="button" class="tab" data-nt="eth">ETH</button>' +
        '</div>' +
        '<div id="newsFeed" style="min-height:55vh"></div>' +
        '</div>';

      page.querySelectorAll('#newsCatTabs .tab').forEach(function (tb) {
        tb.addEventListener('click', function () {
          page.querySelectorAll('#newsCatTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          tb.classList.add('on');
          state.tab = tb.getAttribute('data-nt') || 'crypto';
          paint();
          load(false);
        });
      });
      if ($('newsRefreshBtn')) {
        $('newsRefreshBtn').onclick = function () { load(true); };
      }
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
        if (tools) nav.insertBefore(btn, tools);
        else nav.appendChild(btn);
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
    }, 15000);
  }

  function queries(tab) {
    return {
      crypto: 'cryptocurrency OR bitcoin OR ethereum OR solana OR crypto',
      stocks: 'stock market OR nasdaq OR s&p OR earnings OR wall street',
      market: 'federal reserve OR inflation OR economy OR markets',
      btc: 'bitcoin OR BTC',
      eth: 'ethereum OR ETH'
    }[tab] || 'cryptocurrency';
  }

  async function fetchHN(q) {
    var url = 'https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=20';
    var r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    var d = await r.json();
    return (d.hits || []).filter(function (h) { return h.title && h.url; }).map(function (h) {
      return { id: 'hn-' + h.objectID, title: h.title, url: h.url, src: 'HN', ts: h.created_at };
    });
  }

  async function fetchCGTrending() {
    try {
      var r = await fetch('https://api.coingecko.com/api/v3/search/trending', { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return [];
      var d = await r.json();
      var L = lang();
      return (d.coins || []).slice(0, 8).map(function (c) {
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

  async function fetchRedditProxy(sub) {
    try {
      var url = 'https://www.reddit.com/r/' + sub + '/hot.json?limit=12';
      var proxies = [
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
        url
      ];
      for (var i = 0; i < proxies.length; i++) {
        try {
          var r = await fetch(proxies[i], { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } });
          if (!r.ok) continue;
          var d = await r.json();
          var children = (d.data && d.data.children) || [];
          return children.map(function (c) {
            var p = c.data;
            if (!p || !p.title) return null;
            return {
              id: 'rd-' + p.id,
              title: p.title,
              url: p.url && p.url.indexOf('http') === 0 ? p.url : ('https://reddit.com' + p.permalink),
              src: 'r/' + sub,
              ts: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
            };
          }).filter(Boolean);
        } catch (e) {}
      }
    } catch (e) {}
    return [];
  }

  async function translateOne(text, target) {
    if (!text) return text;
    if (target === 'en') return text;
    if (/[\u0400-\u04FF]/.test(text) && target === 'ru') return text;
    var key = target + ':' + text;
    if (state.translated[key]) return state.translated[key];
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + target + '&dt=t&q=' + encodeURIComponent(text);
      var r = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) {
        for (var i = 0; i < j[0].length; i++) {
          if (j[0][i] && j[0][i][0]) out += j[0][i][0];
        }
      }
      if (out) {
        state.translated[key] = out;
        return out;
      }
    } catch (e) {}
    return text;
  }

  async function translateItems(items) {
    var L = lang();
    if (L === 'en') return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = Object.assign({}, items[i]);
      it.title = await translateOne(it.title, L);
      out.push(it);
      if (i % 4 === 3) await new Promise(function (r) { setTimeout(r, 60); });
    }
    return out;
  }

  function dedupe(items) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      var k = (it.title || '').toLowerCase().slice(0, 80);
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
    if (!force && state.items[tab] && state.items[tab].length && age < 12000) {
      paint();
      return;
    }
    state.loading = true;
    var box = $('newsFeed');
    if (box && (!state.items[tab] || !state.items[tab].length)) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('loading') + '</div>';
    }
    try {
      var q = queries(tab);
      var parts = await Promise.all([
        fetchHN(q),
        tab === 'crypto' || tab === 'btc' || tab === 'eth' ? fetchCGTrending() : Promise.resolve([]),
        tab === 'crypto' ? fetchRedditProxy('cryptocurrency') : tab === 'stocks' ? fetchRedditProxy('stocks') : Promise.resolve([])
      ]);
      var merged = dedupe([].concat(parts[0] || [], parts[1] || [], parts[2] || []));
      merged.sort(function (a, b) {
        return new Date(b.ts || 0) - new Date(a.ts || 0);
      });
      merged = await translateItems(merged.slice(0, 30));
      var prev = state.items[tab] || [];
      if (prev.length && !force) {
        var ids = {};
        prev.forEach(function (p) { ids[p.id] = 1; });
        var fresh = merged.filter(function (m) { return !ids[m.id]; });
        state.items[tab] = dedupe(fresh.concat(prev)).slice(0, 40);
      } else {
        state.items[tab] = merged;
      }
      state.at[tab] = Date.now();
      paint();
    } catch (e) {
      if (box && (!state.items[tab] || !state.items[tab].length)) {
        box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      }
    }
    state.loading = false;
  }

  function paint() {
    var box = $('newsFeed');
    if (!box) return;
    var items = state.items[state.tab] || [];
    if ($('newsUpdated') && state.at[state.tab]) {
      var d = new Date(state.at[state.tab]);
      $('newsUpdated').textContent = t('updated') + ' ' + d.toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-US');
    }
    if (!items.length) {
      box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it, idx) {
      var time = '';
      try {
        if (it.ts) time = new Date(it.ts).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {}
      html +=
        '<article class="news-item" data-id="' + (it.id || idx) + '" style="padding:.7rem 0;border-bottom:1px solid rgba(168,85,247,.12);animation:fadeIn .35s ease">' +
        '<a href="' + it.url + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        escapeHtml(it.title) + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.28rem;display:flex;gap:.5rem;flex-wrap:wrap">' +
        '<span>' + escapeHtml(it.src || '') + '</span>' +
        (time ? '<span>\u00b7 ' + time + '</span>' : '') +
        '</div></article>';
    });
    box.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function injectStyle() {
    if ($('newsPageStyle')) return;
    var s = document.createElement('style');
    s.id = 'newsPageStyle';
    s.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}' +
      '#p-news .news-item a:active{opacity:.7}' +
      '.nav-btn[data-p="news"]{display:flex!important}';
    document.head.appendChild(s);
  }

  window.__ct_loadNews = function (force) {
    ensurePage();
    load(!!force);
  };
  window.__ct_openNews = openNews;

  function boot() {
    injectStyle();
    ensurePage();

    document.addEventListener('click', function (e) {
      var nb = e.target.closest('.nav-btn[data-p="news"]');
      if (nb) {
        e.preventDefault();
        e.stopPropagation();
        openNews();
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__newsLang) {
      langSel.__newsLang = true;
      langSel.addEventListener('change', function () {
        state.translated = {};
        state.at = {};
        Object.keys(state.items).forEach(function (k) { state.items[k] = []; });
        if ($('p-news') && $('p-news').classList.contains('on')) {
          if ($('newsTitle')) $('newsTitle').textContent = t('news');
          load(true);
        }
      });
    }

    setInterval(function () {
      ensurePage();
      var btn = document.querySelector('.nav-btn[data-p="news"]');
      if (btn) {
        btn.style.display = 'flex';
        btn.hidden = false;
      }
    }, 3000);

    setTimeout(function () {
      if (!state.items.crypto.length) {
        state.tab = 'crypto';
        load(false);
      }
    }, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
