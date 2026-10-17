/* news-live v141 — category filter + translate before paint */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }

  var CAT = 'crypto';
  var cache = { items: [], at: 0, lang: '', cat: '' };
  var busy = false;

  var FILTERS = {
    crypto: /bitcoin|btc|ethereum|eth|crypto|blockchain|token|coin|defi|nft|solana|binance|wallet|mining|altcoin|stablecoin|web3/i,
    stocks: /stock|nasdaq|nyse|s&p|dow |equity|share|earnings|dividend|ipo|wall street|tesla|apple|microsoft|nvidia|fed |interest rate/i,
    market: /market|fed |inflation|treasury|economy|gdp|rate cut|rate hike|recession|bull|bear|index/i,
    btc: /bitcoin|btc\b|satoshi|microstrategy|etf.*bitcoin|bitcoin.*etf/i,
    eth: /ethereum|eth\b|ether|vitalik|solidity|layer.?2|rollup/i
  };

  function isFinance(title) {
    if (!title || title.length < 20) return false;
    if (/\b(cyprus hotel|son died|football score|recipe|celebrity)\b/i.test(title)) return false;
    return /bitcoin|btc|ethereum|eth|crypto|blockchain|stock|nasdaq|market|token|coin|trading|etf|fed |dividend|earnings|wallet|binance|sec /i.test(title);
  }

  async function translate(text, L) {
    if (!text || L === 'en') return text;
    if (/[\u0400-\u04FF]/.test(text)) return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + L +
        '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 380));
      var r = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      return out || text;
    } catch (e) { return text; }
  }

  async function load(force) {
    if (busy && !force) return;
    if (!$('p-news') || !$('p-news').classList.contains('on')) return;
    var L = lang();
    if (!force && cache.items.length && cache.lang === L && cache.cat === CAT && Date.now() - cache.at < 20000) {
      paint(cache.items);
      return;
    }
    busy = true;
    var box = $('newsFeed');
    if (box && !cache.items.length) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + (L === 'en' ? 'Loading\u2026' : '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026') + '</div>';
    }

    var arts = [];
    try {
      var r = await fetch('https://cryptocurrency.cv/api/news?limit=60&_=' + Date.now(), { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        var d = await r.json();
        (d.articles || []).forEach(function (a) {
          if (a.title && isFinance(a.title)) {
            arts.push({ title: a.title, url: a.link || '#', src: a.source || 'News', ts: a.pubDate || '' });
          }
        });
      }
    } catch (e) {}

    if (CAT === 'crypto' || CAT === 'btc' || CAT === 'eth') {
      try {
        var q = CAT === 'btc' ? 'bitcoin' : CAT === 'eth' ? 'ethereum' : 'cryptocurrency OR bitcoin OR ethereum';
        var hr = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=20', {
          signal: AbortSignal.timeout(7000)
        });
        if (hr.ok) {
          var hd = await hr.json();
          (hd.hits || []).forEach(function (h) {
            if (h.title && h.url && isFinance(h.title)) {
              arts.push({ title: h.title, url: h.url, src: 'HN', ts: h.created_at || '' });
            }
          });
        }
      } catch (e) {}
    }

    var re = FILTERS[CAT] || FILTERS.crypto;
    arts = arts.filter(function (a) { return re.test(a.title); });

    var seen = {};
    arts = arts.filter(function (a) {
      var k = a.title.toLowerCase().slice(0, 48);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    arts.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });
    arts = arts.slice(0, 30);

    if (L === 'ru') {
      for (var i = 0; i < arts.length; i++) {
        arts[i].titleRu = await translate(arts[i].title, 'ru');
        if (i % 5 === 4) await new Promise(function (r) { setTimeout(r, 50); });
      }
    }

    cache = { items: arts, at: Date.now(), lang: L, cat: CAT };
    paint(arts);
    if ($('newsUpdated')) {
      $('newsUpdated').textContent = (L === 'en' ? 'Updated ' : '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e ') +
        new Date().toLocaleTimeString(L === 'ru' ? 'ru-RU' : 'en-US');
    }
    busy = false;
  }

  function paint(items) {
    var box = $('newsFeed');
    if (!box) return;
    var L = lang();
    if (!items.length) {
      box.innerHTML = '<div class="muted">' + (L === 'en' ? 'No news' : '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      var title = (L === 'ru' && it.titleRu) ? it.titleRu : it.title;
      var time = '';
      try {
        var d = new Date(it.ts);
        if (!isNaN(d.getTime())) {
          time = d.toLocaleString(L === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {}
      html += '<article style="padding:.7rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + String(it.url).replace(/"/g, '') + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        String(title).replace(/</g, '&lt;') + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.25rem">' +
        String(it.src).replace(/</g, '&lt;') + (time ? ' \u00b7 ' + time : '') + '</div></article>';
    });
    box.innerHTML = html;
  }

  function boot() {
    window.__ct_loadNews = function (force) { load(!!force); };
    window.__ct_openNews = function () { load(true); };

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('#newsCatTabs .tab');
      if (tab) {
        e.preventDefault();
        document.querySelectorAll('#newsCatTabs .tab').forEach(function (t) { t.classList.remove('on'); });
        tab.classList.add('on');
        CAT = tab.getAttribute('data-nt') || 'crypto';
        cache = { items: [], at: 0, lang: '', cat: '' };
        load(true);
      }
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(function () { load(true); }, 200);
      }
      if (e.target.closest('#newsRefreshBtn')) {
        e.preventDefault();
        load(true);
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__nl141) {
      langSel.__nl141 = true;
      langSel.addEventListener('change', function () {
        cache = { items: [], at: 0, lang: '', cat: '' };
        if ($('p-news') && $('p-news').classList.contains('on')) load(true);
      });
    }

    setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) load(false);
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
