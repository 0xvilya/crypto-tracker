/* stocks-news-fix v138 — reliable prices, dividends, smooth news */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var ru = { div: '\u0414\u0438\u0432.%', price: '\u0426\u0435\u043d\u0430', loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e', empty: '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439' };
    var en = { div: 'Div%', price: 'Price', loading: 'Loading\u2026', updated: 'Updated', empty: 'No news' };
    return (lang() === 'en' ? en : ru)[k] || k;
  }

  var TICKERS = [
    'AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','AMD','NFLX','JPM',
    'V','MA','BABA','DIS','CRM','ORCL','ADBE','INTC','PYPL','UBER',
    'COIN','PLTR','KO','PEP','NKE','BA','WMT','XOM','JNJ','COST'
  ];
  var NAMES = {
    AAPL:'Apple',MSFT:'Microsoft',GOOGL:'Alphabet',AMZN:'Amazon',NVDA:'NVIDIA',
    TSLA:'Tesla',META:'Meta',AMD:'AMD',NFLX:'Netflix',JPM:'JPMorgan',
    V:'Visa',MA:'Mastercard',BABA:'Alibaba',DIS:'Disney',CRM:'Salesforce',
    ORCL:'Oracle',ADBE:'Adobe',INTC:'Intel',PYPL:'PayPal',UBER:'Uber',
    COIN:'Coinbase',PLTR:'Palantir',KO:'Coca-Cola',PEP:'Pepsi',NKE:'Nike',
    BA:'Boeing',WMT:'Walmart',XOM:'Exxon',JNJ:'J&J',COST:'Costco'
  };
  var DIV_FALLBACK = {
    AAPL:0.43,MSFT:0.72,GOOGL:0.32,AMZN:0,NVDA:0.03,TSLA:0,META:0.32,
    AMD:0,NFLX:0,JPM:2.1,V:0.7,MA:0.55,BABA:1.8,DIS:0.8,CRM:0,
    ORCL:1.2,ADBE:0,INTC:1.5,PYPL:0,UBER:0,COIN:0,PLTR:0,KO:2.9,
    PEP:3.1,NKE:1.5,BA:0,WMT:1.1,XOM:3.3,JNJ:3.0,COST:0.55
  };

  var cache = {};
  try { cache = JSON.parse(localStorage.getItem('ct_stocks_v4') || '{}'); } catch (e) {}

  function cur() {
    return (localStorage.getItem('ct_cur') || ($('curSel') && $('curSel').value) || 'usd').toLowerCase();
  }
  var fx = 1, fxAt = 0;
  async function loadFx() {
    if (Date.now() - fxAt < 180000) return fx;
    var c = cur();
    if (c === 'usd') { fx = 1; fxAt = Date.now(); return 1; }
    try {
      var r = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
      var d = await r.json();
      fx = c === 'eur' ? (d.rates.EUR || 1) : c === 'rub' ? (d.rates.RUB || 1) : c === 'pln' ? (d.rates.PLN || 1) : 1;
      fxAt = Date.now();
    } catch (e) {}
    return fx;
  }
  function money(v) {
    if (v == null || isNaN(+v)) return '\u2014';
    var c = cur();
    var s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v * fx;
    return Math.abs(n) >= 1000 ? s + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : s + n.toFixed(2);
  }

  function parseChart(d) {
    if (!d) return null;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return null; } }
    if (d.contents) { try { d = JSON.parse(d.contents); } catch (e) { return null; } }
    var res = d.chart && d.chart.result && d.chart.result[0];
    if (!res || !res.meta) return null;
    var m = res.meta;
    var p = m.regularMarketPrice;
    var prev = m.chartPreviousClose || m.previousClose || p;
    if (p == null) return null;
    var divY = null;
    try {
      var divs = res.events && res.events.dividends;
      if (divs) {
        var yearAgo = Date.now() / 1000 - 365 * 86400;
        var sum = 0;
        Object.keys(divs).forEach(function (k) {
          var ev = divs[k];
          if (ev && ev.date >= yearAgo && ev.amount) sum += +ev.amount;
        });
        if (sum > 0 && p > 0) divY = (sum / p) * 100;
      }
    } catch (e) {}
    return {
      price: +p,
      ch: prev ? ((p - prev) / prev * 100) : 0,
      name: m.shortName || m.symbol,
      div: divY,
      at: Date.now()
    };
  }

  async function fetchSym(sym) {
    var yurl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) +
      '?interval=1d&range=1y&events=div';
    var urls = [
      'https://corsproxy.io/?' + encodeURIComponent(yurl),
      'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(yurl),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(yurl)
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { signal: AbortSignal.timeout(9000) });
        if (!r.ok) continue;
        var txt = await r.text();
        var d;
        try { d = JSON.parse(txt); } catch (e) { continue; }
        var p = parseChart(d);
        if (p) return p;
      } catch (e) {}
    }
    return null;
  }

  function ensureTable() {
    var body = $('stockBody');
    if (!body) return null;
    var thead = body.parentElement && body.parentElement.querySelector('thead tr');
    if (thead && !thead.querySelector('.th-div')) {
      var th = document.createElement('th');
      th.className = 'th-div';
      th.textContent = t('div');
      thead.appendChild(th);
    }
    var have = {};
    body.querySelectorAll('tr[data-s]').forEach(function (tr) { have[tr.getAttribute('data-s')] = tr; });
    TICKERS.forEach(function (s, idx) {
      var tr = have[s];
      if (!tr) {
        tr = document.createElement('tr');
        tr.className = 's-tr';
        tr.setAttribute('data-s', s);
        tr.innerHTML =
          '<td class="s-rank">' + (idx + 1) + '</td>' +
          '<td><b>' + s + '</b> <span class="muted s-name">' + (NAMES[s] || s) + '</span></td>' +
          '<td class="s-price">\u2014</td>' +
          '<td class="s-ch">\u2014</td>' +
          '<td class="s-div">\u2014</td>';
        tr.onclick = function () {
          if (typeof window.openStock === 'function') window.openStock(s);
        };
        body.appendChild(tr);
      } else {
        if (!tr.querySelector('.s-div')) {
          var td = document.createElement('td');
          td.className = 's-div';
          td.textContent = '\u2014';
          tr.appendChild(td);
        }
        if (!tr.querySelector('.s-price')) {
          var tds = tr.querySelectorAll('td');
          if (tds.length >= 4) {
            tds[2].classList.add('s-price');
            tds[3].classList.add('s-ch');
          }
        }
      }
    });
    return body;
  }

  function patchRow(s) {
    var tr = document.querySelector('#stockBody tr[data-s="' + s + '"]');
    if (!tr) return;
    var d = cache[s];
    var priceEl = tr.querySelector('.s-price');
    var chEl = tr.querySelector('.s-ch');
    var divEl = tr.querySelector('.s-div');
    if (d && d.price != null && priceEl) {
      var mp = money(d.price);
      if (priceEl.textContent !== mp) priceEl.textContent = mp;
    }
    if (d && d.ch != null && chEl) {
      var mc = (d.ch >= 0 ? '+' : '') + (+d.ch).toFixed(2) + '%';
      if (chEl.textContent !== mc) {
        chEl.textContent = mc;
        chEl.className = 's-ch ' + (d.ch > 0 ? 'up' : d.ch < 0 ? 'dn' : '');
      }
    }
    if (divEl) {
      var dy = (d && d.div != null) ? d.div : DIV_FALLBACK[s];
      if (dy != null && dy > 0) {
        var ds = (+dy).toFixed(2) + '%';
        if (divEl.textContent !== ds) divEl.textContent = ds;
      } else if (divEl.textContent !== '\u2014') {
        divEl.textContent = '\u2014';
      }
    }
  }

  function patchAll() { TICKERS.forEach(patchRow); }

  var busy = false;
  async function refresh(force) {
    if (busy && !force) return;
    busy = true;
    await loadFx();
    ensureTable();
    patchAll();

    var order = TICKERS.slice().sort(function (a, b) {
      var am = cache[a] && cache[a].price != null ? 1 : 0;
      var bm = cache[b] && cache[b].price != null ? 1 : 0;
      return am - bm;
    });

    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      var age = cache[s] ? Date.now() - (cache[s].at || 0) : 1e12;
      if (!force && age < 90000 && cache[s] && cache[s].price != null) {
        patchRow(s);
        continue;
      }
      var res = await fetchSym(s);
      if (res) {
        if (res.div == null && DIV_FALLBACK[s] != null) res.div = DIV_FALLBACK[s];
        cache[s] = res;
        if (res.name) NAMES[s] = res.name;
        try { localStorage.setItem('ct_stocks_v4', JSON.stringify(cache)); } catch (e) {}
        patchRow(s);
      } else if (cache[s]) {
        patchRow(s);
      }
      await new Promise(function (r) { setTimeout(r, 150); });
    }
    busy = false;
  }

  var newsCache = { items: [], at: 0, lang: '' };
  var newsBusy = false;

  function isFinance(title) {
    if (!title || title.length < 25) return false;
    if (/\b(cyprus|hotel|son died|football|soccer|recipe|movie|actor)\b/i.test(title)) return false;
    return /bitcoin|btc|ethereum|eth|crypto|blockchain|stock|nasdaq|fed|inflation|market|token|coin|trading|dividend|earnings|sec |etf|wallet|binance|coinbase/i.test(title);
  }

  async function translateTitle(text, L) {
    if (L === 'en' || !text) return text;
    if (/[\u0400-\u04FF]/.test(text)) return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + L + '&dt=t&q=' + encodeURIComponent(text.slice(0, 350));
      var r = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      return out || text;
    } catch (e) { return text; }
  }

  async function loadNewsSmooth(force) {
    if (newsBusy && !force) return;
    if (!$('p-news') || !$('p-news').classList.contains('on')) return;
    var L = lang();
    var age = Date.now() - newsCache.at;
    if (!force && newsCache.items.length && age < 15000 && newsCache.lang === L) return;

    newsBusy = true;
    var box = $('newsFeed');
    if (box && !newsCache.items.length) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('loading') + '</div>';
    }

    try {
      var r = await fetch('https://cryptocurrency.cv/api/news?limit=50&_=' + Date.now(), {
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) throw new Error('news');
      var d = await r.json();
      var arts = (d.articles || []).filter(function (a) {
        return isFinance(a.title || '');
      }).map(function (a) {
        return {
          id: (a.link || a.title || '').slice(-40),
          title: a.title || '',
          url: a.link || '#',
          src: a.source || 'News',
          ts: a.pubDate || new Date().toISOString()
        };
      });

      try {
        var hr = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=cryptocurrency%20OR%20bitcoin&tags=story&hitsPerPage=15', {
          signal: AbortSignal.timeout(7000)
        });
        if (hr.ok) {
          var hd = await hr.json();
          (hd.hits || []).forEach(function (h) {
            if (h.title && h.url && isFinance(h.title)) {
              arts.push({ id: 'hn-' + h.objectID, title: h.title, url: h.url, src: 'HN', ts: h.created_at });
            }
          });
        }
      } catch (e) {}

      var seen = {};
      arts = arts.filter(function (a) {
        var k = a.title.toLowerCase().slice(0, 50);
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      });
      arts.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
      arts = arts.slice(0, 35);

      if (L === 'ru') {
        for (var i = 0; i < arts.length; i++) {
          arts[i].title = await translateTitle(arts[i].title, 'ru');
          if (i % 6 === 5) await new Promise(function (r) { setTimeout(r, 30); });
        }
      }

      newsCache = { items: arts, at: Date.now(), lang: L };
      paintNewsSmooth();
    } catch (e) {
      if (box && !newsCache.items.length) {
        box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      }
    }
    newsBusy = false;
  }

  function paintNewsSmooth() {
    var box = $('newsFeed');
    if (!box) return;
    var items = newsCache.items;
    if ($('newsUpdated') && newsCache.at) {
      $('newsUpdated').textContent = t('updated') + ' ' + new Date(newsCache.at).toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-US');
    }
    if (!items.length) {
      box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      var time = '';
      try {
        var d = new Date(it.ts);
        if (!isNaN(d.getTime())) {
          time = d.toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
          });
        }
      } catch (e) {}
      html += '<article style="padding:.7rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + String(it.url).replace(/"/g, '') + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        String(it.title).replace(/</g, '&lt;') + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.25rem">' +
        String(it.src).replace(/</g, '&lt;') + (time ? ' \u00b7 ' + time : '') + '</div></article>';
    });
    box.innerHTML = html;
  }

  function boot() {
    window.__ct_loadStocks = function () { refresh(false); };
    window.__ct_paintStocks = function () { ensureTable(); patchAll(); };
    window.__ct_loadNews = function (force) { loadNewsSmooth(!!force); };

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="stocks"]')) {
        setTimeout(function () { ensureTable(); refresh(true); }, 200);
      }
      if (e.target.closest('#stockRef')) {
        e.preventDefault();
        e.stopPropagation();
        refresh(true);
      }
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(function () { loadNewsSmooth(true); }, 250);
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__v138) {
      langSel.__v138 = true;
      langSel.addEventListener('change', function () {
        newsCache = { items: [], at: 0, lang: '' };
        if ($('p-news') && $('p-news').classList.contains('on')) loadNewsSmooth(true);
        var th = document.querySelector('.th-div');
        if (th) th.textContent = t('div');
      });
    }

    var curSel = $('curSel');
    if (curSel && !curSel.__v138) {
      curSel.__v138 = true;
      curSel.addEventListener('change', function () {
        fxAt = 0;
        loadFx().then(patchAll);
      });
    }

    setInterval(function () {
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) refresh(false);
      if ($('p-news') && $('p-news').classList.contains('on')) loadNewsSmooth(false);
    }, 22000);

    setTimeout(function () {
      ensureTable();
      if ($('p-stocks') && $('p-stocks').classList.contains('on')) refresh(true);
    }, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
