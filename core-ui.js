/* core-ui v134 — news (cryptocurrency.cv + HN), full asset browsers */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }
  function t(k) {
    var d = {
      ru: {
        news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', crypto: '\u041a\u0440\u0438\u043f\u0442\u043e', stocks: '\u0410\u043a\u0446\u0438\u0438', market: '\u0420\u044b\u043d\u043e\u043a',
        loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', empty: '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439', updated: '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e',
        allCrypto: '\u0412\u0441\u044f \u043a\u0440\u0438\u043f\u0442\u0430', allStocks: '\u0412\u0441\u0435 \u0430\u043a\u0446\u0438\u0438', search: '\u041f\u043e\u0438\u0441\u043a\u2026',
        add: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c', close: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c', inList: '\u0412 \u0441\u043f\u0438\u0441\u043a\u0435'
      },
      en: {
        news: 'News', crypto: 'Crypto', stocks: 'Stocks', market: 'Market',
        loading: 'Loading\u2026', empty: 'No news', updated: 'Updated',
        allCrypto: 'All crypto', allStocks: 'All stocks', search: 'Search\u2026',
        add: 'Add', close: 'Close', inList: 'In list'
      }
    };
    return (d[lang()] || d.ru)[k] || k;
  }

  var newsState = { tab: 'crypto', items: {}, at: {}, translated: {}, loading: false, timer: null };

  function ensureNewsUI() {
    var wrap = document.querySelector('.wrap');
    if (!wrap) return;
    var page = $('p-news');
    if (!page) {
      page = document.createElement('section');
      page.id = 'p-news';
      page.className = 'page';
      wrap.appendChild(page);
    }
    if (!$('newsFeed')) {
      page.innerHTML =
        '<div class="card" style="min-height:70vh">' +
        '<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">' +
        '<h2 style="margin:0;flex:1" id="newsTitle">' + t('news') + '</h2>' +
        '<span class="muted" id="newsUpdated" style="font-size:.7rem"></span>' +
        '<button type="button" class="btn-ghost" id="newsRefreshBtn">\u21bb</button></div>' +
        '<div class="chart-tabs" id="newsCatTabs" style="flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem">' +
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
          newsState.tab = tb.getAttribute('data-nt');
          paintNews();
          loadNews(false);
        };
      });
      if ($('newsRefreshBtn')) $('newsRefreshBtn').onclick = function () { loadNews(true); };
    }
    var nav = $('nav');
    if (nav) {
      nav.style.setProperty('grid-template-columns', 'repeat(6,minmax(0,1fr))', 'important');
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
      btn.style.setProperty('display', 'flex', 'important');
      btn.hidden = false;
      var sp = btn.querySelector('span');
      if (sp) sp.textContent = t('news');
    }
  }

  function openNews() {
    ensureNewsUI();
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('on'); });
    var nb = document.querySelector('.nav-btn[data-p="news"]');
    if (nb) nb.classList.add('on');
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('on'); });
    var page = $('p-news');
    page.classList.add('on');
    page.style.display = '';
    if ($('newsTitle')) $('newsTitle').textContent = t('news');
    paintNews();
    loadNews(false);
    if (newsState.timer) clearInterval(newsState.timer);
    newsState.timer = setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) loadNews(true);
    }, 25000);
  }

  function isNoise(title) {
    if (!title) return true;
    var t0 = title.toLowerCase();
    if (/gas:|gwei|etherscan|\u26a1|\u26fd/.test(t0)) return true;
    if (t0.length < 20) return true;
    return false;
  }

  async function fetchCV(limit) {
    try {
      var r = await fetch('https://cryptocurrency.cv/api/news?limit=' + (limit || 40), {
        signal: AbortSignal.timeout(9000)
      });
      if (!r.ok) return [];
      var d = await r.json();
      var arts = d.articles || d.data || d || [];
      if (!Array.isArray(arts)) return [];
      return arts.filter(function (a) {
        var title = a.title || a.headline || '';
        return !isNoise(title);
      }).map(function (a) {
        return {
          id: 'cv-' + (a.link || a.url || a.title || '').slice(-40),
          title: a.title || a.headline || '',
          url: a.link || a.url || '#',
          src: a.source || a.sourceKey || 'News',
          ts: a.pubDate || a.publishedAt || a.date || new Date().toISOString()
        };
      });
    } catch (e) { return []; }
  }

  async function fetchHN(q) {
    try {
      var r = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=' + encodeURIComponent(q) + '&tags=story&hitsPerPage=20', {
        signal: AbortSignal.timeout(8000)
      });
      if (!r.ok) return [];
      var d = await r.json();
      return (d.hits || []).filter(function (h) { return h.title && h.url && !isNoise(h.title); }).map(function (h) {
        return { id: 'hn-' + h.objectID, title: h.title, url: h.url, src: 'HN', ts: h.created_at };
      });
    } catch (e) { return []; }
  }

  async function translateBatch(items) {
    var L = lang();
    if (L === 'en') return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = Object.assign({}, items[i]);
      var key = L + ':' + it.title;
      if (newsState.translated[key]) {
        it.title = newsState.translated[key];
      } else if (!/[\u0400-\u04FF]/.test(it.title)) {
        try {
          var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' + L + '&dt=t&q=' + encodeURIComponent(it.title.slice(0, 350));
          var r = await fetch(url, { signal: AbortSignal.timeout(2800) });
          if (r.ok) {
            var j = await r.json();
            var tr = '';
            if (j && j[0]) for (var k = 0; k < j[0].length; k++) if (j[0][k] && j[0][k][0]) tr += j[0][k][0];
            if (tr) { newsState.translated[key] = tr; it.title = tr; }
          }
        } catch (e) {}
      }
      out.push(it);
      if (i % 6 === 5) await new Promise(function (r) { setTimeout(r, 40); });
    }
    return out;
  }

  function dedupe(items) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      var k = (it.title || '').toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push(it);
    });
    return out;
  }

  function filterTab(items, tab) {
    if (tab === 'crypto') return items;
    if (tab === 'btc') return items.filter(function (i) { return /bitcoin|\bbtc\b/i.test(i.title + i.src); });
    if (tab === 'eth') return items.filter(function (i) { return /ethereum|\beth\b|vitalik/i.test(i.title + i.src); });
    if (tab === 'stocks') return items.filter(function (i) { return /stock|nasdaq|s&p|dow|share|equity|earnings|wall street/i.test(i.title); });
    if (tab === 'market') return items.filter(function (i) { return /fed|inflation|economy|market|rate|treasury/i.test(i.title); });
    return items;
  }

  async function loadNews(force) {
    if (newsState.loading && !force) return;
    var tab = newsState.tab;
    var age = Date.now() - (newsState.at[tab] || 0);
    if (!force && newsState.items[tab] && newsState.items[tab].length && age < 18000) {
      paintNews();
      return;
    }
    newsState.loading = true;
    var box = $('newsFeed');
    if (box && (!newsState.items[tab] || !newsState.items[tab].length)) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('loading') + '</div>';
    }
    try {
      var q = tab === 'btc' ? 'bitcoin' : tab === 'eth' ? 'ethereum' : tab === 'stocks' ? 'stock market' : tab === 'market' ? 'economy inflation' : 'cryptocurrency';
      var parts = await Promise.all([fetchCV(50), fetchHN(q)]);
      var merged = dedupe([].concat(parts[0] || [], parts[1] || []));
      merged = filterTab(merged, tab);
      if (!merged.length && tab !== 'crypto') merged = dedupe(parts[0] || []);
      merged.sort(function (a, b) { return new Date(b.ts || 0) - new Date(a.ts || 0); });
      merged = await translateBatch(merged.slice(0, 45));
      if (merged.length) {
        newsState.items[tab] = merged;
        newsState.at[tab] = Date.now();
      }
      paintNews();
    } catch (e) {
      if (box && (!newsState.items[tab] || !newsState.items[tab].length)) {
        box.innerHTML = '<div class="muted">' + t('empty') + '</div>';
      }
    }
    newsState.loading = false;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function paintNews() {
    var box = $('newsFeed');
    if (!box) return;
    var items = newsState.items[newsState.tab] || [];
    if ($('newsUpdated') && newsState.at[newsState.tab]) {
      $('newsUpdated').textContent = t('updated') + ' ' + new Date(newsState.at[newsState.tab]).toLocaleTimeString(lang() === 'ru' ? 'ru-RU' : 'en-US');
    }
    if (!items.length) {
      box.innerHTML = '<div class="muted" style="padding:1rem 0">' + t('empty') + '</div>';
      return;
    }
    var html = '';
    items.forEach(function (it) {
      var time = '';
      try {
        var d = new Date(it.ts);
        if (!isNaN(d.getTime())) time = d.toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch (e) {}
      html += '<article style="padding:.7rem 0;border-bottom:1px solid rgba(168,85,247,.12)">' +
        '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;font-weight:600;line-height:1.35;display:block">' +
        esc(it.title) + '</a>' +
        '<div class="muted" style="font-size:.68rem;margin-top:.25rem">' + esc(it.src) + (time ? ' \u00b7 ' + time : '') + '</div></article>';
    });
    box.innerHTML = html;
  }

  var cryptoCache = [];
  var STOCKS = [
    ['AAPL','Apple'],['MSFT','Microsoft'],['GOOGL','Alphabet'],['AMZN','Amazon'],['NVDA','NVIDIA'],
    ['TSLA','Tesla'],['META','Meta'],['AMD','AMD'],['NFLX','Netflix'],['JPM','JPMorgan'],
    ['V','Visa'],['MA','Mastercard'],['BABA','Alibaba'],['DIS','Disney'],['CRM','Salesforce'],
    ['ORCL','Oracle'],['ADBE','Adobe'],['INTC','Intel'],['PYPL','PayPal'],['UBER','Uber'],
    ['COIN','Coinbase'],['PLTR','Palantir'],['SHOP','Shopify'],['SQ','Block'],['SNOW','Snowflake'],
    ['CRWD','CrowdStrike'],['PANW','Palo Alto'],['ABNB','Airbnb'],['SPOT','Spotify'],['NKE','Nike'],
    ['BA','Boeing'],['CAT','Caterpillar'],['GS','Goldman'],['WMT','Walmart'],['KO','Coca-Cola'],
    ['PEP','Pepsi'],['MCD','McDonalds'],['COST','Costco'],['XOM','Exxon'],['CVX','Chevron'],
    ['JNJ','J&J'],['PFE','Pfizer'],['MRNA','Moderna'],['TSM','TSMC'],['ASML','ASML'],
    ['SAP','SAP'],['NVO','Novo Nordisk'],['TM','Toyota'],['SONY','Sony'],['SPY','S&P 500'],
    ['QQQ','Nasdaq 100'],['IWM','Russell 2000'],['DIA','Dow'],['VOO','Vanguard 500'],
    ['HOOD','Robinhood'],['SOFI','SoFi'],['RIVN','Rivian'],['F','Ford'],['GM','GM'],
    ['SNAP','Snap'],['PINS','Pinterest'],['ZM','Zoom'],['DKNG','DraftKings'],['MELI','MercadoLibre'],
    ['SE','Sea'],['JD','JD.com'],['PDD','PDD'],['IBM','IBM'],['QCOM','Qualcomm'],
    ['AVGO','Broadcom'],['TXN','Texas Instruments'],['AMAT','Applied Materials'],['NOW','ServiceNow'],
    ['INTU','Intuit'],['BKNG','Booking'],['SBUX','Starbucks'],['AXP','Amex'],['BLK','BlackRock'],
    ['C','Citigroup'],['WFC','Wells Fargo'],['UNH','UnitedHealth'],['LLY','Eli Lilly'],['ABBV','AbbVie'],
    ['MU','Micron'],['SMCI','Super Micro'],['ARM','ARM Holdings'],['APP','AppLovin'],['MSTR','MicroStrategy'],
    ['MARA','Marathon Digital'],['RIOT','Riot Platforms'],['DELL','Dell'],['HPQ','HP']
  ];

  function ensureModal() {
    var m = $('assetModal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'assetModal';
    m.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);padding:max(12px,env(safe-area-inset-top)) 12px 90px;overflow:auto';
    m.innerHTML =
      '<div style="max-width:560px;margin:0 auto;background:#12101c;border:1px solid rgba(168,85,247,.3);border-radius:16px;padding:1rem;min-height:70vh">' +
      '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.65rem">' +
      '<b id="assetModalTitle" style="flex:1;font-size:1.1rem"></b>' +
      '<button type="button" class="btn-ghost" id="assetModalClose">\u2715</button></div>' +
      '<input type="search" id="assetModalQ" placeholder="" style="width:100%;box-sizing:border-box;padding:.55rem .7rem;border-radius:10px;border:1px solid #2a2540;background:#0b0a14;color:inherit;margin-bottom:.55rem;font-size:1rem"/>' +
      '<div id="assetModalList" style="max-height:62vh;overflow:auto"></div></div>';
    document.body.appendChild(m);
    $('assetModalClose').onclick = function () { m.style.display = 'none'; };
    m.addEventListener('click', function (e) { if (e.target === m) m.style.display = 'none'; });
    return m;
  }

  async function openCryptoBrowser() {
    var m = ensureModal();
    $('assetModalTitle').textContent = t('allCrypto');
    $('assetModalQ').placeholder = t('search');
    $('assetModalQ').value = '';
    m.style.display = 'block';
    var list = $('assetModalList');
    list.innerHTML = '<div class="muted">' + t('loading') + '</div>';

    if (cryptoCache.length < 100) {
      try {
        var pages = await Promise.all([1, 2, 3].map(function (p) {
          return fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=' + p + '&sparkline=false', {
            signal: AbortSignal.timeout(12000)
          }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
        }));
        cryptoCache = [].concat(pages[0] || [], pages[1] || [], pages[2] || []).map(function (c) {
          return {
            id: c.id, sym: (c.symbol || '').toUpperCase(), name: c.name,
            price: c.current_price, ch: c.price_change_percentage_24h, img: c.image, rank: c.market_cap_rank
          };
        });
      } catch (e) {
        if (!cryptoCache.length) {
          cryptoCache = [
            { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin' },
            { id: 'ethereum', sym: 'ETH', name: 'Ethereum' },
            { id: 'solana', sym: 'SOL', name: 'Solana' }
          ];
        }
      }
    }

    function render(filter) {
      var f = (filter || '').toLowerCase();
      var html = '';
      cryptoCache.forEach(function (c) {
        if (f && (c.sym + ' ' + c.name + ' ' + c.id).toLowerCase().indexOf(f) < 0) return;
        var price = c.price != null
          ? (window.CTData ? window.CTData.formatMoney(c.price, localStorage.getItem('ct_cur') || 'usd') : '$' + Number(c.price).toLocaleString())
          : '\u2014';
        var ch = c.ch != null ? ((c.ch >= 0 ? '+' : '') + (+c.ch).toFixed(2) + '%') : '';
        var cls = c.ch > 0 ? 'up' : c.ch < 0 ? 'dn' : '';
        html += '<div data-id="' + c.id + '" class="asset-row" style="display:flex;align-items:center;gap:.5rem;padding:.55rem 0;border-bottom:1px solid rgba(168,85,247,.1);cursor:pointer">' +
          (c.img ? '<img src="' + c.img + '" width="24" height="24" style="border-radius:50%;flex-shrink:0"/>' : '') +
          '<div style="flex:1;min-width:0"><b>' + c.sym + '</b> <span class="muted" style="font-size:.8rem">' + c.name + '</span></div>' +
          '<div style="text-align:right"><div style="font-weight:600">' + price + '</div><div class="' + cls + '" style="font-size:.72rem">' + ch + '</div></div>' +
          '<button type="button" class="btn-ghost asset-add" data-id="' + c.id + '" style="margin-left:.25rem;font-size:1.1rem">+</button></div>';
      });
      list.innerHTML = html || '<div class="muted">\u2014</div>';
      list.querySelectorAll('.asset-row').forEach(function (row) {
        row.onclick = function (e) {
          if (e.target.classList.contains('asset-add')) return;
          addCoin(row.getAttribute('data-id'));
          m.style.display = 'none';
        };
      });
      list.querySelectorAll('.asset-add').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          addCoin(btn.getAttribute('data-id'));
          btn.textContent = '\u2713';
        };
      });
    }
    render('');
    $('assetModalQ').oninput = function () { render(this.value); };
    $('assetModalQ').focus();
  }

  function addCoin(id) {
    try {
      var key = 'ct_watch';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      if (list.indexOf(id) < 0) { list.push(id); localStorage.setItem(key, JSON.stringify(list)); }
    } catch (e) {}
    try { if (typeof addToWatch === 'function') addToWatch(id); } catch (e) {}
    if ($('refBtn')) $('refBtn').click();
    try { if (typeof openCoin === 'function') openCoin(id); } catch (e) {}
    try { if (typeof softRefresh === 'function') softRefresh(); } catch (e) {}
  }

  function openStockBrowser() {
    var m = ensureModal();
    $('assetModalTitle').textContent = t('allStocks');
    $('assetModalQ').placeholder = t('search');
    $('assetModalQ').value = '';
    m.style.display = 'block';
    var list = $('assetModalList');
    function render(filter) {
      var f = (filter || '').toLowerCase();
      var html = '';
      STOCKS.forEach(function (pair) {
        var s = pair[0], n = pair[1];
        if (f && (s + ' ' + n).toLowerCase().indexOf(f) < 0) return;
        html += '<div data-s="' + s + '" class="asset-row" style="display:flex;align-items:center;gap:.5rem;padding:.55rem 0;border-bottom:1px solid rgba(168,85,247,.1);cursor:pointer">' +
          '<div style="flex:1"><b>' + s + '</b> <span class="muted">' + n + '</span></div>' +
          '<button type="button" class="btn-ghost asset-add" data-s="' + s + '">+</button></div>';
      });
      list.innerHTML = html || '<div class="muted">\u2014</div>';
      list.querySelectorAll('.asset-row').forEach(function (row) {
        row.onclick = function (e) {
          if (e.target.classList.contains('asset-add')) return;
          openStockSym(row.getAttribute('data-s'));
          m.style.display = 'none';
        };
      });
      list.querySelectorAll('.asset-add').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          openStockSym(btn.getAttribute('data-s'));
          btn.textContent = '\u2713';
        };
      });
    }
    render('');
    $('assetModalQ').oninput = function () { render(this.value); };
    $('assetModalQ').focus();
  }

  function openStockSym(sym) {
    if (typeof window.openStock === 'function') {
      try { window.openStock(sym); return; } catch (e) {}
    }
    var inp = $('stockCustom');
    if (inp) { inp.value = sym; if ($('stockCustomAdd')) $('stockCustomAdd').click(); }
  }

  function wireAllButtons() {
    document.querySelectorAll('button').forEach(function (b) {
      var tx = (b.textContent || '').trim();
      if (tx === 'allStocks') b.textContent = t('allStocks');
      if (tx === 'allCrypto') b.textContent = t('allCrypto');
    });

    var b1 = $('btnAllCrypto');
    if (!b1) {
      var home = $('p-home');
      if (home) {
        var bar = document.createElement('div');
        bar.style.cssText = 'margin:.4rem 0';
        bar.innerHTML = '<button type="button" class="btn" id="btnAllCrypto" style="width:100%;padding:.55rem;font-weight:600">' + t('allCrypto') + '</button>';
        var sw = home.querySelector('.search-wrap');
        if (sw) sw.appendChild(bar);
        else home.insertBefore(bar, home.firstChild);
        b1 = $('btnAllCrypto');
      }
    }
    if (b1) {
      b1.textContent = t('allCrypto');
      b1.onclick = function (e) { e.preventDefault(); e.stopPropagation(); openCryptoBrowser(); };
    }

    var b2 = $('btnAllStocks');
    if (!b2) {
      var stocks = $('p-stocks');
      if (stocks) {
        var bar2 = document.createElement('div');
        bar2.style.cssText = 'margin:.4rem 0';
        bar2.innerHTML = '<button type="button" class="btn" id="btnAllStocks" style="width:100%;padding:.55rem;font-weight:600">' + t('allStocks') + '</button>';
        stocks.insertBefore(bar2, stocks.firstChild);
        b2 = $('btnAllStocks');
      }
    }
    if (b2) {
      b2.textContent = t('allStocks');
      b2.onclick = function (e) { e.preventDefault(); e.stopPropagation(); openStockBrowser(); };
    }
  }

  function boot() {
    ensureNewsUI();
    wireAllButtons();

    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        e.preventDefault(); e.stopPropagation(); openNews();
      }
      if (e.target.closest('#btnAllCrypto')) {
        e.preventDefault(); e.stopPropagation(); openCryptoBrowser();
      }
      if (e.target.closest('#btnAllStocks')) {
        e.preventDefault(); e.stopPropagation(); openStockBrowser();
      }
    }, true);

    var langSel = $('langSel');
    if (langSel && !langSel.__coreUi) {
      langSel.__coreUi = true;
      langSel.addEventListener('change', function () {
        newsState.translated = {};
        newsState.at = {};
        newsState.items = {};
        wireAllButtons();
        if ($('p-news') && $('p-news').classList.contains('on')) {
          if ($('newsTitle')) $('newsTitle').textContent = t('news');
          loadNews(true);
        }
      });
    }

    setInterval(function () { ensureNewsUI(); wireAllButtons(); }, 2500);
    setTimeout(function () { ensureNewsUI(); wireAllButtons(); loadNews(false); }, 1200);
  }

  window.__ct_openNews = openNews;
  window.__ct_loadNews = function (f) { ensureNewsUI(); loadNews(!!f); };
  window.__ct_openCryptoBrowser = openCryptoBrowser;
  window.__ct_openStockBrowser = openStockBrowser;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
