/* v5.7 single fix layer */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function getLang() {
    var s = $('langSel');
    return (s && s.value) ? s.value : (localStorage.getItem('ct_lang') || 'en');
  }
  function getCur() { return localStorage.getItem('ct_cur') || 'usd'; }
  function money(v, cur) {
    if (v == null || isNaN(v)) return '\u2014';
    var s = cur === 'eur' ? '\u20ac' : cur === 'rub' ? '\u20bd' : cur === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return s + n.toPrecision(4);
  }

  var newsBusy = false, newsLang = null;
  async function tr(text, to) {
    if (!text || to === 'en') return text;
    try {
      var r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
        encodeURIComponent(to) + '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 350)))
        .then(function (x) { return x.json(); });
      if (r && r[0]) {
        var o = r[0].map(function (x) { return x[0]; }).join('');
        if (o && !/MYMEMORY/i.test(o)) return o;
      }
    } catch (e) {}
    return text;
  }
  async function loadNews() {
    var box = $('newsList'); if (!box || newsBusy) return;
    var lang = getLang();
    newsBusy = true;
    box.setAttribute('data-lang', lang);
    box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    try {
      var feeds = [
        'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss'),
        'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')
      ];
      var names = ['Cointelegraph', 'CoinDesk'];
      var all = [];
      for (var i = 0; i < feeds.length; i++) {
        try {
          var d = await fetch(feeds[i]).then(function (r) { return r.json(); });
          (d.items || []).forEach(function (it) {
            var t = String(it.title || '').trim();
            if (!t || /MYMEMORY/i.test(t)) return;
            all.push({ title: t, link: it.link, date: it.pubDate, src: names[i],
              desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 130) });
          });
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      all = all.slice(0, 12);
      if (lang === 'ru') {
        for (var j = 0; j < all.length; j++) {
          all[j].title = await tr(all[j].title, 'ru');
          if (all[j].desc) all[j].desc = await tr(all[j].desc, 'ru');
        }
      }
      if (getLang() !== lang) { newsBusy = false; loadNews(); return; }
      box.innerHTML = all.map(function (n) {
        var d = '';
        try { d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
        return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title +
          '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div>' +
          (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '\u2026</div>' : '') + '</div>';
      }).join('') || '<div class="empty">\u2014</div>';
      newsLang = lang;
      box.setAttribute('data-lang', lang);
    } catch (e) { box.innerHTML = '<div class="empty">Error</div>'; }
    newsBusy = false;
  }
  var guardCount = 0;
  setInterval(function () {
    var box = $('newsList'); if (!box || newsBusy) return;
    var lang = getLang();
    if (box.getAttribute('data-lang') === lang && box.querySelector('.news-item')) {
      if (lang === 'en') {
        var a = box.querySelector('.news-item a');
        if (a && /[\u0400-\u04FF]{5,}/.test(a.textContent || '') && guardCount++ < 4) loadNews();
      }
      return;
    }
    loadNews();
  }, 3500);
  var ls = $('langSel');
  if (ls) ls.addEventListener('change', function () {
    localStorage.setItem('ct_lang', ls.value);
    newsLang = null; loadNews();
  });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'news') { newsLang = null; setTimeout(loadNews, 120); }
      if (b.getAttribute('data-p') === 'port') setTimeout(renderPort, 150);
      if (b.getAttribute('data-p') === 'tools') setTimeout(initConv, 150);
    });
  });
  setTimeout(loadNews, 900);

  var COIN_COLOR = {
    bitcoin: '#f7931a', ethereum: '#627eea', solana: '#14f195', binancecoin: '#f3ba2f',
    dogecoin: '#c2a633', toncoin: '#0098ea', ripple: '#00aae4', cardano: '#0033ad',
    litecoin: '#345d9d', polkadot: '#e6007a', chainlink: '#2a5ada', 'avalanche-2': '#e84142'
  };
  var SYM = {
    bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB', dogecoin: 'DOGE',
    toncoin: 'TON', ripple: 'XRP', cardano: 'ADA', litecoin: 'LTC', polkadot: 'DOT',
    chainlink: 'LINK', 'avalanche-2': 'AVAX', 'shiba-inu': 'SHIB', pepe: 'PEPE',
    uniswap: 'UNI', near: 'NEAR', cosmos: 'ATOM', stellar: 'XLM', tron: 'TRX', polygon: 'MATIC'
  };
  var priceCache = {};
  async function getPrice(id) {
    if (priceCache[id] && Date.now() - priceCache[id].t < 60000) return priceCache[id].p;
    var cur = getCur();
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(id) +
        '&vs_currencies=' + cur).then(function (r) { return r.json(); });
      var p = d && d[id] && d[id][cur];
      if (p != null) { priceCache[id] = { t: Date.now(), p: +p }; return +p; }
    } catch (e) {}
    return null;
  }
  function getHold() { try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; } }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }
  var portBusy = false;
  async function renderPort() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box || portBusy) return;
    portBusy = true;
    var hold = getHold(), cur = getCur();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">' + (getLang() === 'ru' ? '\u041f\u0443\u0441\u0442\u043e' : 'Empty \u2014 pick coin & add') + '</div>';
      if (tot) tot.style.display = 'none';
      var cw = $('portChartWrap'); if (cw) cw.style.display = 'none';
      portBusy = false; return;
    }
    var map = {}, merged = [];
    hold.forEach(function (h, i) {
      var buy = h.buy > 0 ? +(+h.buy).toFixed(8) : 0;
      var k = h.id + '|' + buy;
      if (map[k] != null) { merged[map[k]].qty += +h.qty; merged[map[k]].idx.push(i); }
      else { map[k] = merged.length; merged.push({ id: h.id, qty: +h.qty, buy: buy, idx: [i] }); }
    });
    var totalVal = 0, totalCost = 0, rows = [], byCoin = {};
    for (var i = 0; i < merged.length; i++) {
      var h = merged[i];
      var price = await getPrice(h.id);
      var sym = SYM[h.id] || (h.id || '').toUpperCase().slice(0, 6);
      var val = price != null ? price * h.qty : null;
      if (val != null) totalVal += val;
      var cost = h.buy > 0 ? h.buy * h.qty : 0;
      if (cost) totalCost += cost;
      var pnl = (price != null && cost > 0) ? val - cost : null;
      rows.push({ idx: h.idx, id: h.id, sym: sym, qty: h.qty, price: price, val: val, pnl: pnl, buy: h.buy });
      if (!byCoin[h.id]) byCoin[h.id] = { id: h.id, sym: sym, val: 0 };
      if (val != null) byCoin[h.id].val += val;
    }
    box.innerHTML = rows.map(function (r) {
      var right = r.price == null
        ? '<span class="muted">price\u2026</span>'
        : ('<b>' + money(r.val, cur) + '</b>' + (r.pnl != null ? '<div class="' + (r.pnl >= 0 ? 'up' : 'down') + '">' + (r.pnl >= 0 ? '+' : '') + money(r.pnl, cur) + '</div>' : ''));
      return '<div class="hold-row"><div><b>' + r.sym + '</b><div class="muted">' + r.qty +
        (r.price != null ? ' \u00b7 ' + money(r.price, cur) : '') +
        (r.buy > 0 ? ' \u00b7 buy ' + money(r.buy, cur) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-indices="' + r.idx.join(',') +
        '" style="font-size:.7rem;padding:.2rem .45rem;margin-top:.2rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      var mv = $('mhVal'); if (mv) mv.textContent = totalVal > 0 ? money(totalVal, cur) : '\u2014';
      var pe = $('mhPnl');
      if (pe) {
        if (totalCost > 0 && totalVal > 0) {
          var p = totalVal - totalCost;
          pe.textContent = (p >= 0 ? '+' : '') + money(p, cur) + ' (' + ((p / totalCost) * 100).toFixed(2) + '%)';
          pe.className = p >= 0 ? 'up' : 'down';
        } else {
          pe.textContent = totalVal > 0 ? '' : (getLang() === 'ru' ? '\u0416\u0434\u0451\u043c \u0446\u0435\u043d\u044b\u2026' : 'Waiting for prices\u2026');
          pe.className = 'muted';
        }
      }
    }
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12;
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2;
      var fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
      slices.forEach(function (s, idx) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = COIN_COLOR[s.id] || fb[idx % fb.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (ang > 0.28) {
          var mid = start + ang / 2;
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.sym, cx + Math.cos(mid) * R * 0.68, cy + Math.sin(mid) * R * 0.68);
        }
        start += ang; s._c = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#12121a';
      ctx.fill();
      if (leg) leg.innerHTML = slices.map(function (s) {
        return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin-right:.5rem"><span style="width:8px;height:8px;border-radius:50%;background:' +
          s._c + ';display:inline-block"></span>' + s.sym + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
      }).join('');
    } else if (wrap) wrap.style.display = 'none';
    portBusy = false;
  }
  var themeBtn = $('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    setTimeout(renderPort, 300); setTimeout(renderPort, 800);
  });
  var mhList = $('mhList');
  if (mhList) {
    var obs = new MutationObserver(function () {
      if (portBusy) return;
      var html = mhList.innerHTML || '';
      if (/\$\-?\d{3,}/.test(html) && (/\u00b7 \u2014|\u00b7 —|10 \u00b7|5 \u00b7/.test(html) || /price/.test(html) === false && /bitcoin/i.test(html))) {
        /* broken app.js render detected */
        setTimeout(renderPort, 80);
      }
    });
    obs.observe(mhList, { childList: true, subtree: true });
    mhList.addEventListener('click', function (e) {
      var btn = e.target.closest('.mh-rm'); if (!btn) return;
      e.stopPropagation(); e.preventDefault();
      var indices = (btn.getAttribute('data-indices') || btn.getAttribute('data-i') || '')
        .split(',').map(Number).filter(function (n) { return !isNaN(n); });
      if (!indices.length) return;
      var hold = getHold();
      indices.sort(function (a, b) { return b - a; }).forEach(function (i) {
        if (i >= 0 && i < hold.length) hold.splice(i, 1);
      });
      setHold(hold);
      renderPort();
    }, true);
  }
  var mhAdd = $('mhAdd');
  if (mhAdd) mhAdd.addEventListener('click', function () {
    setTimeout(renderPort, 400); setTimeout(renderPort, 1200);
  });
  setTimeout(renderPort, 700);
  setTimeout(renderPort, 2000);

  setTimeout(function () {
    if ($('mhChips')) return;
    var form = document.querySelector('#p-port .form');
    if (!form) return;
    var chips = document.createElement('div');
    chips.id = 'mhChips';
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0';
    var top = [['bitcoin','BTC'],['ethereum','ETH'],['solana','SOL'],['binancecoin','BNB'],['ripple','XRP'],['cardano','ADA'],['dogecoin','DOGE'],['toncoin','TON'],['tron','TRX'],['avalanche-2','AVAX'],['chainlink','LINK'],['polkadot','DOT'],['polygon','MATIC'],['litecoin','LTC'],['shiba-inu','SHIB'],['pepe','PEPE']];
    chips.innerHTML = top.map(function (c) {
      return '<button type="button" class="tab mh-chip" data-id="' + c[0] + '" data-sym="' + c[1] + '" style="padding:.28rem .55rem;font-size:.72rem">' + c[1] + '</button>';
    }).join('');
    form.parentNode.insertBefore(chips, form.nextSibling);
    chips.addEventListener('click', function (e) {
      var t = e.target.closest('.mh-chip'); if (!t) return;
      chips.querySelectorAll('.mh-chip').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      if ($('mhCoin')) $('mhCoin').value = t.getAttribute('data-id');
      if ($('mhQ')) $('mhQ').value = t.getAttribute('data-sym');
      if ($('mhPicked')) $('mhPicked').innerHTML = '<b>' + t.getAttribute('data-sym') + '</b>';
    });
  }, 400);

  var CONV = [
    { id: 'bitcoin', s: 'BTC' }, { id: 'ethereum', s: 'ETH' }, { id: 'solana', s: 'SOL' },
    { id: 'binancecoin', s: 'BNB' }, { id: 'ripple', s: 'XRP' }, { id: 'cardano', s: 'ADA' },
    { id: 'dogecoin', s: 'DOGE' }, { id: 'toncoin', s: 'TON' }, { id: 'litecoin', s: 'LTC' },
    { id: 'polkadot', s: 'DOT' }, { id: 'chainlink', s: 'LINK' }, { id: 'avalanche-2', s: 'AVAX' }
  ];
  var convP = {};
  async function initConv() {
    var from = $('convFrom'), to = $('convTo'), amt = $('convAmt'), out = $('convOut');
    if (!from || !to) return;
    var cur = getCur();
    try {
      var ids = CONV.map(function (c) { return c.id; }).join(',');
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=' + cur).then(function (r) { return r.json(); });
      CONV.forEach(function (c) { if (d[c.id]) convP[c.id] = d[c.id][cur]; });
    } catch (e) {}
    var opts = CONV.map(function (c) { return '<option value="' + c.id + '">' + c.s + '</option>'; }).join('');
    from.innerHTML = opts;
    to.innerHTML = opts + '<option value="usd">USD</option><option value="eur">EUR</option><option value="rub">RUB</option>';
    from.value = 'bitcoin'; to.value = 'ethereum';
    function go() {
      var a = parseFloat((amt && amt.value) || 0) || 0;
      var fp = convP[from.value] || 0, tid = to.value;
      if (!fp || !out) { if (out) out.textContent = '\u2014'; return; }
      if (tid === 'usd' || tid === 'eur' || tid === 'rub') {
        var sy = tid === 'eur' ? '\u20ac' : tid === 'rub' ? '\u20bd' : '$';
        out.textContent = sy + (a * fp).toLocaleString('en-US', { maximumFractionDigits: 2 });
      } else {
        var tp = convP[tid] || 0;
        if (!tp) { out.textContent = '\u2014'; return; }
        var ts = (CONV.find(function (c) { return c.id === tid; }) || {}).s || tid;
        out.textContent = ((a * fp) / tp).toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + ts;
      }
    }
    if (amt) amt.oninput = go;
    from.onchange = go; to.onchange = go; go();
  }
  setTimeout(initConv, 600);

  async function fg() {
    var chip = $('fgChip'); if (!chip) return;
    try {
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      var v = d && d.data && d.data[0]; if (!v) return;
      var n = +v.value;
      var col = n <= 25 ? '#ef4444' : n <= 45 ? '#f59e0b' : n <= 55 ? '#eab308' : n <= 75 ? '#84cc16' : '#22c55e';
      chip.innerHTML = 'FG: <b style="color:' + col + '">' + n + '</b>';
    } catch (e) {}
  }
  setTimeout(fg, 500);

  function legal() {
    if ($('legalBar')) return;
    var bar = document.createElement('div');
    bar.id = 'legalBar';
    bar.style.cssText = 'text-align:center;padding:1.2rem .8rem 5.5rem;font-size:.75rem;color:var(--muted)';
    bar.innerHTML = '<a href="#" id="aboutLink" style="color:var(--accent);margin:0 .6rem">About</a>\u00b7<a href="#" id="privacyLink" style="color:var(--accent);margin:0 .6rem">Privacy</a>';
    (document.querySelector('.wrap') || document.body).appendChild(bar);
    var modal = document.createElement('div');
    modal.id = 'legalModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.6);align-items:flex-end;justify-content:center';
    modal.innerHTML = '<div style="background:var(--card,#12121a);border-radius:16px 16px 0 0;padding:1.25rem;width:100%;max-width:520px;max-height:70vh;overflow:auto;border:1px solid var(--border,#2a2a35)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem"><h2 id="legalTitle" style="margin:0;font-size:1.1rem"></h2><button type="button" id="legalClose" class="btn-ghost" style="font-size:1.2rem">\u00d7</button></div><div id="legalBody" style="font-size:.88rem;line-height:1.55;color:var(--muted)"></div></div>';
    document.body.appendChild(modal);
    function open(t, h) { $('legalTitle').textContent = t; $('legalBody').innerHTML = h; modal.style.display = 'flex'; }
    $('aboutLink').onclick = function (e) {
      e.preventDefault();
      open(getLang() === 'ru' ? '\u041e \u043d\u0430\u0441' : 'About',
        getLang() === 'ru'
          ? '<p><b>Crypto Tracker</b> \u2014 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 \u0442\u0440\u0435\u043a\u0435\u0440.</p><p>\u0426\u0435\u043d\u044b: CoinGecko. \u0413\u0440\u0430\u0444\u0438\u043a\u0438: TradingView. \u041d\u043e\u0432\u043e\u0441\u0442\u0438: Cointelegraph / CoinDesk. F&amp;G: alternative.me.</p><p>\u041d\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u0430\u044f \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u044f.</p>'
          : '<p><b>Crypto Tracker</b> is a free crypto tracker.</p><p>Prices: CoinGecko. Charts: TradingView. News: Cointelegraph / CoinDesk. F&amp;G: alternative.me.</p><p>Not financial advice.</p>');
    };
    $('privacyLink').onclick = function (e) {
      e.preventDefault();
      open(getLang() === 'ru' ? '\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c' : 'Privacy',
        getLang() === 'ru'
          ? '<p>\u041c\u044b <b>\u043d\u0435 \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u043c</b> \u043b\u0438\u0447\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0432 localStorage. \u0421\u0435\u0440\u0432\u0435\u0440\u0430 \u043d\u0435\u0442.</p>'
          : '<p>We <b>do not collect</b> personal data. Portfolio stays in browser localStorage only. No server.</p>');
    };
    $('legalClose').onclick = function () { modal.style.display = 'none'; };
    modal.onclick = function (e) { if (e.target === modal) modal.style.display = 'none'; };
  }
  setTimeout(legal, 500);
})();
