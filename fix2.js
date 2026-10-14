/* v5.6 converter + news lang lock */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function getLang() {
    var sel = $('langSel');
    if (sel && sel.value) return sel.value;
    return localStorage.getItem('ct_lang') || 'en';
  }

  var CONV_COINS = [
    { id: 'bitcoin', s: 'BTC' }, { id: 'ethereum', s: 'ETH' }, { id: 'solana', s: 'SOL' },
    { id: 'binancecoin', s: 'BNB' }, { id: 'ripple', s: 'XRP' }, { id: 'cardano', s: 'ADA' },
    { id: 'dogecoin', s: 'DOGE' }, { id: 'toncoin', s: 'TON' }, { id: 'litecoin', s: 'LTC' },
    { id: 'polkadot', s: 'DOT' }, { id: 'chainlink', s: 'LINK' }, { id: 'avalanche-2', s: 'AVAX' }
  ];
  var convPrices = {};

  async function initConverter() {
    var from = $('convFrom') || $('cFrom');
    var to = $('convTo') || $('cTo');
    var amt = $('convAmt') || $('cAmt');
    var out = $('convOut') || $('cOut');
    if (!from || !to) return;

    var ids = CONV_COINS.map(function (c) { return c.id; }).join(',');
    var cur = localStorage.getItem('ct_cur') || 'usd';
    try {
      var data = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=' + cur +
        '&ids=' + encodeURIComponent(ids)).then(function (r) { return r.json(); });
      (data || []).forEach(function (c) { convPrices[c.id] = c.current_price; });
    } catch (e) {}

    var opts = CONV_COINS.map(function (c) {
      var p = convPrices[c.id] || 0;
      return '<option value="' + c.id + '" data-price="' + p + '">' + c.s + '</option>';
    }).join('');
    from.innerHTML = opts;
    to.innerHTML = opts + '<option value="usd">USD</option><option value="eur">EUR</option><option value="rub">RUB</option>';
    if (!from.value) from.value = 'bitcoin';
    if (!to.value) to.value = 'ethereum';

    function doConv() {
      var a = parseFloat((amt && amt.value) || 0) || 0;
      var fid = from.value, tid = to.value;
      var fp = convPrices[fid] || 0;
      if (!fp || !out) { if (out) out.textContent = '\u2014'; return; }
      if (tid === 'usd' || tid === 'eur' || tid === 'rub') {
        var sym = tid === 'eur' ? '\u20ac' : tid === 'rub' ? '\u20bd' : '$';
        out.textContent = sym + (a * fp).toLocaleString('en-US', { maximumFractionDigits: 2 });
      } else {
        var tp = convPrices[tid] || 0;
        if (!tp) { out.textContent = '\u2014'; return; }
        var toSym = (CONV_COINS.find(function (c) { return c.id === tid; }) || {}).s || tid;
        out.textContent = ((a * fp) / tp).toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + toSym;
      }
    }
    if (amt) { amt.oninput = doConv; }
    from.onchange = doConv;
    to.onchange = doConv;
    doConv();
  }
  setTimeout(initConverter, 500);
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'tools') setTimeout(initConverter, 150);
    });
  });

  var newsBusy = false, lastLang = null;
  async function gTranslate(text, to) {
    if (!text || to === 'en') return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
        encodeURIComponent(to) + '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 400));
      var r = await fetch(url).then(function (x) { return x.json(); });
      if (r && r[0]) {
        var out = r[0].map(function (x) { return x[0]; }).join('');
        if (out && !/MYMEMORY|YOU USED ALL AVAILABLE/i.test(out)) return out;
      }
    } catch (e) {}
    return text;
  }
  async function loadNewsLocked() {
    var box = $('newsList'); if (!box || newsBusy) return;
    var lang = getLang();
    newsBusy = true;
    box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    try {
      var feeds = [
        { name: 'Cointelegraph', url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss') },
        { name: 'CoinDesk', url: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') }
      ];
      var all = [];
      for (var i = 0; i < feeds.length; i++) {
        try {
          var data = await fetch(feeds[i].url).then(function (r) { return r.json(); });
          (data.items || []).forEach(function (it) {
            var title = String(it.title || '').trim();
            if (!title || /MYMEMORY|YOU USED ALL AVAILABLE/i.test(title)) return;
            all.push({ title: title, link: it.link, date: it.pubDate, source: feeds[i].name,
              desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 140) });
          });
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      all = all.slice(0, 14);
      if (lang === 'ru') {
        for (var j = 0; j < all.length; j++) {
          all[j].title = await gTranslate(all[j].title, 'ru');
          if (all[j].desc) all[j].desc = await gTranslate(all[j].desc, 'ru');
          if (j % 4 === 3) await new Promise(function (r) { setTimeout(r, 30); });
        }
      }
      if (getLang() !== lang) { newsBusy = false; loadNewsLocked(); return; }
      box.innerHTML = all.map(function (n) {
        var d = '';
        try { d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
        return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title +
          '</a><div class="news-meta"><span class="news-src">' + n.source + '</span> ' + d + '</div>' +
          (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '\u2026</div>' : '') + '</div>';
      }).join('') || '<div class="empty">\u2014</div>';
      lastLang = lang;
    } catch (e) { box.innerHTML = '<div class="empty">Error</div>'; }
    newsBusy = false;
  }
  setInterval(function () {
    var box = $('newsList');
    if (!box) return;
    var lang = getLang();
    if (lang === 'en' && box.querySelector('.news-item')) {
      var first = box.querySelector('.news-item a');
      if (first && /[\u0400-\u04FF]{4,}/.test(first.textContent || '')) {
        lastLang = null;
        loadNewsLocked();
        return;
      }
    }
    if (lang !== lastLang && !newsBusy) loadNewsLocked();
  }, 2000);
  var ls = $('langSel');
  if (ls) ls.addEventListener('change', function () {
    localStorage.setItem('ct_lang', ls.value);
    lastLang = null;
    loadNewsLocked();
  });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'news') { lastLang = null; setTimeout(loadNewsLocked, 100); }
    });
  });
  setTimeout(loadNewsLocked, 700);

  async function loadFGChip() {
    var chip = $('fgChip');
    if (!chip) return;
    try {
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      var v = d && d.data && d.data[0]; if (!v) return;
      var n = +v.value;
      var col = n <= 25 ? '#ef4444' : n <= 45 ? '#f59e0b' : n <= 55 ? '#eab308' : n <= 75 ? '#84cc16' : '#22c55e';
      chip.innerHTML = 'FG: <b style="color:' + col + '">' + n + '</b>';
    } catch (e) {}
  }
  setTimeout(loadFGChip, 400);

  var COIN_COLOR = { bitcoin: '#f7931a', BTC: '#f7931a', ethereum: '#627eea', ETH: '#627eea', solana: '#14f195', SOL: '#14f195', binancecoin: '#f3ba2f', BNB: '#f3ba2f' };
  function getHold() { try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; } }
  function setHold(arr) { localStorage.setItem('ct_mh', JSON.stringify(arr)); }
  function money(v, cur) {
    if (v == null || isNaN(v)) return '\u2014';
    var s = cur === 'eur' ? '\u20ac' : cur === 'rub' ? '\u20bd' : '$';
    var n = +v;
    return n >= 1 ? s + n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : s + n.toPrecision(4);
  }
  async function fetchPrice(id) {
    var cur = localStorage.getItem('ct_cur') || 'usd';
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=' + cur + '&ids=' + encodeURIComponent(id)).then(function (r) { return r.json(); });
      return d && d[0] ? d[0] : null;
    } catch (e) { return null; }
  }
  async function renderMerged() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box) return;
    var hold = getHold(), cur = localStorage.getItem('ct_cur') || 'usd';
    if (!hold.length) return;
    var map = {}, merged = [];
    hold.forEach(function (h, i) {
      var buy = h.buy > 0 ? +(+h.buy).toFixed(8) : 0;
      var key = h.id + '|' + buy;
      if (map[key] != null) { merged[map[key]].qty += h.qty; merged[map[key]].indices.push(i); }
      else { map[key] = merged.length; merged.push({ id: h.id, qty: h.qty, buy: buy, indices: [i] }); }
    });
    var totalVal = 0, totalCost = 0, rows = [], byCoin = {};
    for (var i = 0; i < merged.length; i++) {
      var h = merged[i];
      var c = await fetchPrice(h.id);
      var price = c && c.current_price != null ? +c.current_price : null;
      var sym = c ? (c.symbol || '').toUpperCase() : h.id.toUpperCase();
      var val = price != null ? price * h.qty : null;
      if (val != null) totalVal += val;
      var cost = h.buy > 0 ? h.buy * h.qty : null;
      if (cost != null) totalCost += cost;
      var pnl = (val != null && cost != null) ? val - cost : null;
      rows.push({ indices: h.indices, id: h.id, sym: sym, qty: h.qty, price: price, val: val, pnl: pnl, buy: h.buy });
      if (!byCoin[h.id]) byCoin[h.id] = { id: h.id, sym: sym, val: 0 };
      if (val != null) byCoin[h.id].val += val;
    }
    box.innerHTML = rows.map(function (r) {
      var right = r.val != null ? ('<b>' + money(r.val, cur) + '</b>' + (r.pnl != null ? '<div class="' + (r.pnl >= 0 ? 'up' : 'down') + '">' + (r.pnl >= 0 ? '+' : '') + money(r.pnl, cur) + '</div>' : '')) : '\u2014';
      return '<div class="hold-row"><div><b>' + r.sym + '</b><div class="muted">' + r.qty +
        (r.price != null ? ' \u00b7 ' + money(r.price, cur) : '') + (r.buy > 0 ? ' \u00b7 buy ' + money(r.buy, cur) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-indices="' + r.indices.join(',') +
        '" style="font-size:.65rem;padding:.15rem .4rem;margin-top:.2rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      var mv = $('mhVal'); if (mv) mv.textContent = money(totalVal, cur);
      var pe = $('mhPnl');
      if (pe && totalCost > 0 && totalVal > 0) {
        var p = totalVal - totalCost;
        pe.textContent = (p >= 0 ? '+' : '') + money(p, cur) + ' (' + ((p / totalCost) * 100).toFixed(2) + '%)';
        pe.className = p >= 0 ? 'up' : 'down';
      }
    }
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14;
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2;
      var fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b'];
      slices.forEach(function (s, idx) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = COIN_COLOR[s.id] || COIN_COLOR[s.sym] || fb[idx % fb.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        var mid = start + ang / 2;
        if (ang > 0.3) {
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.sym, cx + Math.cos(mid) * R * 0.7, cy + Math.sin(mid) * R * 0.7);
        }
        start += ang; s._col = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#12121a';
      ctx.fill();
      if (leg) leg.innerHTML = slices.map(function (s) {
        return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin-right:.5rem"><span style="width:8px;height:8px;border-radius:50%;background:' +
          s._col + ';display:inline-block"></span>' + s.sym + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
      }).join('');
    }
  }
  var mhList = $('mhList');
  if (mhList) {
    mhList.addEventListener('click', function (e) {
      var btn = e.target.closest('.mh-rm'); if (!btn) return;
      var indices = (btn.getAttribute('data-indices') || '').split(',').map(Number).filter(function (n) { return !isNaN(n); });
      if (!indices.length) return;
      e.stopPropagation();
      var hold = getHold();
      indices.sort(function (a, b) { return b - a; }).forEach(function (i) { hold.splice(i, 1); });
      setHold(hold);
      renderMerged();
    }, true);
  }
  setTimeout(renderMerged, 1000);
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'port') setTimeout(renderMerged, 200);
    });
  });
})();
