/* news-live v150 — reliable HN + CryptoCompare, category filters, translate, sorted */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }

  var CAT = 'crypto';
  var cache = {};
  var busy = false;

  var FILTERS = {
    crypto: /bitcoin|btc|ethereum|eth|crypto|blockchain|token|coin|defi|nft|solana|binance|wallet|mining|altcoin|stablecoin|web3|ton|gram/i,
    stocks: /stock|nasdaq|nyse|s&p|dow |equity|share|earnings|dividend|ipo|wall street|tesla|apple|microsoft|nvidia|meta|amazon|fed |interest rate/i,
    market: /market|fed |inflation|treasury|economy|gdp|rate cut|rate hike|recession|bull|bear|index|etf/i,
    btc: /bitcoin|btc\b|satoshi|microstrategy|etf.*bitcoin|bitcoin.*etf/i,
    eth: /ethereum|eth\b|ether|vitalik|solidity|layer.?2|rollup/i
  };

  function isFinance(title) {
    if (!title || title.length < 18) return false;
    if (/\b(cyprus hotel|son died|football score|recipe|celebrity|olympics)\b/i.test(title)) return false;
    return /bitcoin|btc|ethereum|eth|crypto|blockchain|stock|nasdaq|market|token|coin|trading|etf|fed |dividend|earnings|wallet|binance|sec |solana|defi/i.test(title);
  }

  async function translate(text, L) {
    if (!text || L === 'en') return text;
    if (/[\u0400-\u04FF]/.test(text)) return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + L +
        '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 380));
      var r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      return out || text;
    } catch (e) { return text; }
  }

  async function fetchHN(q, n) {
    try {
      var r = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=' + (n || 25), {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return [];
      var d = await r.json();
      return (d.hits || []).filter(function (h) {
        return h.title && h.url && isFinance(h.title);
      }).map(function (h) {
        return { title: h.title, url: h.url, src: 'HN', ts: h.created_at || '' };
      });
    } catch (e) { return []; }
  }

  async function fetchCC(n) {
    try {
      var r = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&limit=' + (n || 30), {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return [];
      var d = await r.json();
      return ((d && d.Data) || []).filter(function (x) {
        return x.title && isFinance(x.title);
      }).map(function (x) {
        return {
          title: x.title,
          url: x.url || x.guid || '#',
          src: x.source || 'CC',
          ts: x.published_on ? new Date(x.published_on * 1000).toISOString() : ''
        };
      });
    } catch (e) { return []; }
  }

  async function load(force) {
    if (busy && !force) return;
    if (!$('p-news') || !$('p-news').classList.contains('on')) return;
    var L = lang();
    var key = CAT + ':' + L;
    if (!force && cache[key] && cache[key].items.length && Date.now() - cache[key].at < 25000) {
      paint(cache[key].items);
      return;
    }
    busy = true;
    var box = $('newsFeed');
    if (box) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + (L === 'en' ? 'Loading…' : 'Загрузка…') + '</div>';
    }

    var qMap = {
      crypto: 'cryptocurrency OR bitcoin OR ethereum OR solana',
      stocks: 'stock market OR nasdaq OR "S&P" OR earnings OR wall street',
      market: 'federal reserve OR inflation OR economy OR interest rate',
      btc: 'bitcoin',
      eth: 'ethereum'
    };

    var parts = await Promise.all([
      fetchHN(qMap[CAT] || qMap.crypto, 25),
      CAT === 'crypto' || CAT === 'btc' || CAT === 'eth' ? fetchCC(25) : Promise.resolve([])
    ]);

    var arts = [].concat(parts[0], parts[1]);
    var re = FILTERS[CAT] || FILTERS.crypto;
    arts = arts.filter(function (a) { return re.test(a.title); });

    var seen = {};
    arts = arts.filter(function (a) {
      var k = a.title.toLowerCase().slice(0, 50);
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    });
    arts.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });
    arts = arts.slice(0, 35);

    if (L === 'ru' && arts.length) {
      for (var i = 0; i < Math.min(arts.length, 25); i++) {
        arts[i].titleRu = await translate(arts[i].title, 'ru');
        if (i % 4 === 3) await new Promise(function (r) { setTimeout(r, 40); });
      }
    }

    cache[key] = { items: arts, at: Date.now() };
    paint(arts);
    if ($('newsUpdated')) {
      $('newsUpdated').textContent = (L === 'en' ? 'Updated ' : 'Обновлено ') +
        new Date().toLocaleTimeString(L === 'ru' ? 'ru-RU' : 'en-US');
    }
    busy = false;
  }

  function paint(items) {
    var box = $('newsFeed');
    if (!box) return;
    var L = lang();
    if (!items || !items.length) {
      box.innerHTML = '<div class="muted" style="padding:1.2rem 0">' + (L === 'en' ? 'No news' : 'Нет новостей') + '</div>';
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
        String(title).replace(/</g, '<') + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.25rem">' +
        String(it.src).replace(/</g, '<') + (time ? ' · ' + time : '') + '</div></article>';
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
        load(true);
      }
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(function () { load(true); }, 180);
      }
      if (e.target.closest('#newsRefreshBtn')) {
        e.preventDefault();
        load(true);
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__nl150) {
      langSel.__nl150 = true;
      langSel.addEventListener('change', function () {
        cache = {};
        if ($('p-news') && $('p-news').classList.contains('on')) load(true);
      });
    }

    setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) load(false);
    }, 35000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
