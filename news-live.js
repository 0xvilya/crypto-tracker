/* news-live v160 — real headlines via GDELT + Hacker News. English only. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }

  function signal(ms) {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
    var c = new AbortController();
    setTimeout(function () { try { c.abort(); } catch (e) {} }, ms);
    return c.signal;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function cleanTitle(t) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s+[-|–—]\s+[A-Za-z0-9 .&']{2,42}$/, '');
    if (t.length > 24 && t === t.toUpperCase()) {
      t = t.toLowerCase().replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); });
    }
    return t;
  }

  function junk(title, strict) {
    if (!title || title.length < (strict ? 24 : 16)) return true;
    if (/\b(ask hn|tell hn|show hn|gwei|etherscan|gas tracker|obituary|recipe|celebrity gossip|olympics)\b/i.test(title)) return true;
    if (!strict) return false;
    return !/bitcoin|\bbtc\b|ethereum|\beth\b|crypto|blockchain|solana|nasdaq|nyse|s&p|stock|earnings|inflation|federal reserve|wall street|\bsec\b|\betf\b|defi|token|binance|coinbase|tesla|nvidia|dividend|market|trading|investor|shares|ipo\b/i.test(title);
  }

  function parseWhen(s) {
    if (!s) return '';
    var m = String(s).match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])).toISOString();
    var d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  function rel(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (sec < 90) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    if (sec < 86400 * 6) return Math.floor(sec / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  var CAT = 'crypto';
  var cache = {};
  var busy = false;

  var QUERIES = {
    crypto: { g: 'cryptocurrency', h: ['bitcoin', 'ethereum'] },
    stocks: { g: '"stock market"', h: ['nasdaq', 'earnings'] },
    market: { g: '"federal reserve"', h: ['inflation'] },
    btc: { g: 'bitcoin', h: ['bitcoin'] },
    eth: { g: 'ethereum', h: ['ethereum'] }
  };

  async function fetchGdelt(q) {
    var url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent(q + ' sourcelang:english') +
      '&mode=artlist&maxrecords=25&format=json&sort=datedesc';
    try {
      var r = await fetch(url, { signal: signal(12000) });
      if (!r.ok) return [];
      var txt = await r.text();
      var cut = txt.indexOf('{');
      if (cut < 0) return [];
      var d = JSON.parse(txt.slice(cut));
      return (d.articles || []).map(function (a) {
        var domain = String(a.domain || 'News').replace(/^www\./, '');
        return {
          title: cleanTitle(a.title),
          url: a.url,
          src: domain,
          ts: parseWhen(a.seendate || a.seenDate || '')
        };
      }).filter(function (a) { return a.url && a.title && !junk(a.title, false); });
    } catch (e) { return []; }
  }

  async function fetchHN(q) {
    try {
      var r = await fetch(
        'https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=18',
        { signal: signal(8000) }
      );
      if (!r.ok) return [];
      var d = await r.json();
      return (d.hits || []).filter(function (h) {
        return h.title && h.url && !junk(h.title, true);
      }).map(function (h) {
        return { title: cleanTitle(h.title), url: h.url, src: 'Hacker News', ts: h.created_at || '' };
      });
    } catch (e) { return []; }
  }

  function dedupe(items) {
    var seen = {};
    var out = [];
    items.forEach(function (it) {
      var k = it.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 72);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out;
  }

  function paint(items) {
    var box = $('newsFeed');
    if (!box) return;
    if (!items || !items.length) {
      box.innerHTML = '<div class="muted" style="padding:1.1rem 0">No headlines yet. Tap refresh to try again.</div>';
      return;
    }
    box.innerHTML = items.map(function (it) {
      var when = rel(it.ts);
      return '<article class="news-item">' +
        '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + esc(it.title) + '</a>' +
        '<div class="news-meta"><span class="news-src">' + esc(it.src) + '</span>' +
        (when ? ' · ' + esc(when) : '') + '</div></article>';
    }).join('');
  }

  async function load(force) {
    var spec = QUERIES[CAT] || QUERIES.crypto;
    var hit = cache[CAT];
    if (!force && hit && hit.items.length && Date.now() - hit.at < 90000) {
      paint(hit.items);
      if ($('newsUpdated')) $('newsUpdated').textContent = 'Updated ' + new Date(hit.at).toLocaleTimeString('en-US');
      return;
    }
    if (busy && !force) return;
    busy = true;
    var box = $('newsFeed');
    if (box && !(hit && hit.items.length)) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">Loading headlines…</div>';
    }
    try {
      var jobs = [fetchGdelt(spec.g)].concat((spec.h || []).map(fetchHN));
      var parts = await Promise.all(jobs);
      var arts = [];
      parts.forEach(function (p) { arts = arts.concat(p); });
      arts = dedupe(arts);
      arts.sort(function (a, b) {
        var ah = a.src === 'Hacker News' ? 1 : 0;
        var bh = b.src === 'Hacker News' ? 1 : 0;
        if (ah !== bh) return ah - bh;
        return new Date(b.ts || 0) - new Date(a.ts || 0);
      });
      arts = arts.slice(0, 28);
      if (!arts.length && hit && hit.items.length) {
        paint(hit.items);
      } else {
        if (arts.length) cache[CAT] = { items: arts, at: Date.now() };
        paint(arts);
        if ($('newsUpdated')) {
          $('newsUpdated').textContent = arts.length
            ? ('Updated ' + new Date().toLocaleTimeString('en-US'))
            : 'Could not reach news sources';
        }
      }
    } catch (e) {
      if (hit && hit.items.length) paint(hit.items);
      else paint([]);
    }
    busy = false;
  }

  function boot() {
    window.__ct_loadNews = function (force) { load(!!force); };
    window.__ct_openNews = function () { load(true); };

    document.addEventListener('click', function (e) {
      var tab = e.target.closest && e.target.closest('#newsCatTabs .tab');
      if (tab) {
        document.querySelectorAll('#newsCatTabs .tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        CAT = tab.getAttribute('data-nt') || 'crypto';
        load(false);
      }
      if (e.target.closest && e.target.closest('#newsRefreshBtn')) {
        e.preventDefault();
        load(true);
      }
    });

    setInterval(function () {
      if (document.visibilityState === 'hidden') return;
      if ($('p-news') && $('p-news').classList.contains('on')) load(false);
    }, 60000);

    setTimeout(function () { load(true); }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
