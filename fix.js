/* v6.0 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function getLang() {
    var s = $('langSel');
    return (s && s.value) ? s.value : (localStorage.getItem('ct_lang') || 'en');
  }
  function getCur() { return localStorage.getItem('ct_cur') || 'usd'; }
  function toast(m) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, 2600);
  }
  function money(v, cur) {
    if (v == null || isNaN(v)) return '\u2014';
    var s = cur === 'eur' ? '\u20ac' : cur === 'rub' ? '\u20bd' : '$';
    var n = +v;
    if (Math.abs(n) >= 1) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return s + n.toPrecision(4);
  }
  var TOP = [
    ['bitcoin', 'BTC'], ['ethereum', 'ETH'], ['solana', 'SOL'], ['binancecoin', 'BNB'],
    ['ripple', 'XRP'], ['cardano', 'ADA'], ['dogecoin', 'DOGE'], ['toncoin', 'TON'],
    ['tron', 'TRX'], ['avalanche-2', 'AVAX'], ['chainlink', 'LINK'], ['polkadot', 'DOT'],
    ['polygon', 'MATIC'], ['litecoin', 'LTC'], ['shiba-inu', 'SHIB'], ['pepe', 'PEPE']
  ];
  var SYM = {}; TOP.forEach(function (c) { SYM[c[0]] = c[1]; });
  var COIN_COLOR = {
    bitcoin: '#f7931a', ethereum: '#627eea', solana: '#14f195', binancecoin: '#f3ba2f',
    dogecoin: '#c2a633', toncoin: '#0098ea', ripple: '#00aae4', cardano: '#0033ad',
    litecoin: '#345d9d', polkadot: '#e6007a', chainlink: '#2a5ada', 'avalanche-2': '#e84142'
  };
  var newsBusy = false, newsStamp = 0;
  async function gTr(text, to) {
    if (!text || to === 'en') return text;
    try {
      var r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
        encodeURIComponent(to) + '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 380)))
        .then(function (x) { return x.json(); });
      if (r && r[0]) {
        var o = r[0].map(function (x) { return x[0]; }).join('');
        if (o && !/MYMEMORY|YOU USED ALL AVAILABLE/i.test(o)) return o;
      }
    } catch (e) {}
    return text;
  }
  async function loadNews() {
    var box = $('newsList'); if (!box || newsBusy) return;
    var lang = getLang();
    var my = ++newsStamp;
    newsBusy = true;
    box.innerHTML = '<div class="empty">' + (lang === 'ru' ? 'Loading\u2026' : 'Loading\u2026') + '</div>';
    try {
      try {
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var k = localStorage.key(i);
          if (k && /news/i.test(k)) localStorage.removeItem(k);
        }
      } catch (e) {}
      var feeds = [
        { n: 'Cointelegraph', u: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss') },
        { n: 'CoinDesk', u: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') }
      ];
      var all = [];
      await Promise.all(feeds.map(async function (f) {
        try {
          var d = await fetch(f.u).then(function (r) { return r.json(); });
          (d.items || []).forEach(function (it) {
            var t = String(it.title || '').trim();
            if (!t || /MYMEMORY|YOU USED ALL AVAILABLE/i.test(t)) return;
            all.push({ title: t, link: it.link, date: it.pubDate, src: f.n,
              desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 130) });
          });
        } catch (e) {}
      }));
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      all = all.slice(0, 12);
      if (lang === 'ru') {
        for (var j = 0; j < all.length; j++) {
          if (my !== newsStamp) { newsBusy = false; return; }
          all[j].title = await gTr(all[j].title, 'ru');
          if (all[j].desc) all[j].desc = await gTr(all[j].desc, 'ru');
        }
      }
      if (my !== newsStamp || getLang() !== lang) { newsBusy = false; return; }
      box.innerHTML = all.map(function (n, idx) {
        var d = '';
        try {
          d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          });
        } catch (e) {}
        return '<div class="news-item" style="animation-delay:' + (idx * 0.04) + 's"><a href="' + n.link +
          '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' +
          n.src + '</span> ' + d + '</div></div>';
      }).join('') || '<div class="empty">\u2014</div>';
    } catch (e) {
      box.innerHTML = '<div class="empty">Error</div>';
    }
    newsBusy = false;
  }
  setInterval(function () {
    var box = $('newsList'); if (!box || newsBusy) return;
    if (/MYMEMORY|YOU USED ALL AVAILABLE/i.test(box.innerHTML || '')) loadNews();
  }, 1200);
  var ls = $('langSel');
  if (ls) ls.addEventListener('change', function () {
    localStorage.setItem('ct_lang', ls.value);
    loadNews();
  });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-p');
      if (p === 'news') setTimeout(loadNews, 80);
      if (p === 'port') setTimeout(function () { initChips(); renderPort(); }, 100);
      if (p === 'tools') setTimeout(initConv, 100);
    });
  });
  setTimeout(loadNews, 600);

  var priceCache = {}, portBusy = false;
  function getHold() { try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; } }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }
  async function getPrice(id) {
    if (priceCache[id] && Date.now() - priceCache[id].t < 45000) return priceCache[id].p;
    var cur = getCur();
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(id) +
        '&vs_currencies=' + cur).then(function (r) { return r.json(); });
      var p = d && d[id] && d[id][cur];
      if (p != null) { priceCache[id] = { t: Date.now(), p: +p }; return +p; }
    } catch (e) {}
    return null;
  }
  function initChips() {
    if ($('mhChips')) return;
    var form = document.querySelector('#p-port .form');
    if (!form) return;
    var chips = document.createElement('div');
    chips.id = 'mhChips';
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:.35rem;margin:.55rem 0 .2rem';
    chips.innerHTML = TOP.map(function (c) {
      return '<button type="button" class="tab mh-chip" data-id="' + c[0] + '" data-sym="' + c[1] + '">' + c[1] + '</button>';
    }).join('');
    form.parentNode.insertBefore(chips, form.nextSibling);
    chips.addEventListener('click', function (e) {
      var t = e.target.closest('.mh-chip'); if (!t) return;
      chips.querySelectorAll('.mh-chip').forEach(function (x) { x.classList.remove('on'); });
      t.classList.add('on');
      if ($('mhCoin')) $('mhCoin').value = t.getAttribute('data-id');
      if ($('mhQ')) $('mhQ').value = t.getAttribute('data-sym');
      if ($('mhPicked')) $('mhPicked').innerHTML = '<b style="color:var(--accent2)">' + t.getAttribute('data-sym') + '</b>';
    });
  }
  async function renderPort() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box || portBusy) return;
    portBusy = true;
    var hold = getHold(), cur = getCur();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">Empty \u2014 pick coin & +</div>';
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
      var sym = SYM[h.id] || h.id.slice(0, 6).toUpperCase();
      var val = price != null ? price * h.qty : null;
      if (val != null) totalVal += val;
      var cost = h.buy > 0 ? h.buy * h.qty : 0;
      if (cost) totalCost += cost;
      var pnl = (price != null && cost > 0) ? val - cost : null;
      rows.push({ idx: h.idx, id: h.id, sym: sym, qty: h.qty, price: price, val: val, pnl: pnl, buy: h.buy });
      if (!byCoin[h.id]) byCoin[h.id] = { id: h.id, sym: sym, val: 0 };
      if (val != null) byCoin[h.id].val += val;
    }
    box.innerHTML = rows.map(function (r, i) {
      var right = r.price == null
        ? '<span class="muted">\u2026</span>'
        : ('<b>' + money(r.val, cur) + '</b>' + (r.pnl != null
          ? '<div class="' + (r.pnl >= 0 ? 'up' : 'down') + '">' + (r.pnl >= 0 ? '+' : '') + money(r.pnl, cur) + '</div>' : ''));
      return '<div class="hold-row" style="animation-delay:' + (i * 0.05) + 's"><div><b>' + r.sym + '</b><div class="muted">' +
        r.qty + (r.price != null ? ' \u00b7 ' + money(r.price, cur) : '') +
        (r.buy > 0 ? ' \u00b7 buy ' + money(r.buy, cur) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-indices="' + r.idx.join(',') +
        '" style="font-size:.7rem;padding:.15rem .4rem;margin-top:.15rem">\u00d7</button></div></div>';
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
        } else { pe.textContent = ''; pe.className = 'muted'; }
      }
    }
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2 - 4, R = Math.min(w, h) / 2 - 18;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath(); ctx.arc(cx, cy + 6, R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
      var start = -Math.PI / 2;
      var fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
      slices.forEach(function (s, idx) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = COIN_COLOR[s.id] || fb[idx % fb.length];
        ctx.beginPath(); ctx.arc(cx, cy, R + 3, start, start + ang);
        ctx.strokeStyle = col; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (ang > 0.3) {
          var mid = start + ang / 2;
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.sym, cx + Math.cos(mid) * R * 0.65, cy + Math.sin(mid) * R * 0.65);
        }
        start += ang; s._c = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#160f28';
      ctx.fill();
      if (leg) {
        leg.innerHTML = slices.map(function (s) {
          return '<span style="display:inline-flex;align-items:center;gap:.3rem;margin:.2rem .45rem">' +
            '<span style="width:9px;height:9px;border-radius:50%;background:' + s._c +
            ';box-shadow:0 0 6px ' + s._c + ';display:inline-block"></span>' +
            s.sym + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
        }).join('');
      }
    } else if (wrap) wrap.style.display = 'none';
    portBusy = false;
  }
  var mhAdd = $('mhAdd');
  if (mhAdd) {
    mhAdd.addEventListener('click', function () {
      setTimeout(function () {
        var id = ($('mhCoin') || {}).value;
        var qty = parseFloat(($('mhQty') || {}).value);
        var buy = parseFloat(($('mhBuy') || {}).value) || 0;
        if (!id || !(qty > 0)) return;
        var hold = getHold();
        var buyKey = buy > 0 ? +(+buy).toFixed(8) : 0;
        var found = -1;
        for (var i = 0; i < hold.length; i++) {
          var b = hold[i].buy > 0 ? +(+hold[i].buy).toFixed(8) : 0;
          if (hold[i].id === id && b === buyKey) { found = i; break; }
        }
        if (found >= 0) hold[found].qty = (+hold[found].qty) + qty;
        else hold.push({ id: id, qty: qty, buy: buy });
        setHold(hold);
        renderPort();
      }, 50);
      setTimeout(renderPort, 600);
    });
  }
  var mhList = $('mhList');
  if (mhList) {
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
  var themeBtn = $('themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(renderPort, 350); });
  setTimeout(function () { initChips(); renderPort(); }, 500);
  setTimeout(renderPort, 1800);

  async function initConv() {
    var from = $('convFrom'), to = $('convTo'), amt = $('convAmt'), out = $('convOut');
    if (!from || !to) return;
    var cur = getCur();
    var prices = {};
    try {
      var ids = TOP.map(function (c) { return c[0]; }).join(',');
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=' + cur)
        .then(function (r) { return r.json(); });
      TOP.forEach(function (c) { if (d[c[0]]) prices[c[0]] = d[c[0]][cur]; });
    } catch (e) {}
    var opts = TOP.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
    from.innerHTML = opts;
    to.innerHTML = opts + '<option value="usd">USD</option><option value="eur">EUR</option><option value="rub">RUB</option>';
    from.value = 'bitcoin'; to.value = 'ethereum';
    function go() {
      var a = parseFloat((amt && amt.value) || 0) || 0;
      var fp = prices[from.value] || 0, tid = to.value;
      if (!fp || !out) { if (out) out.textContent = '\u2014'; return; }
      if (tid === 'usd' || tid === 'eur' || tid === 'rub') {
        var sy = tid === 'eur' ? '\u20ac' : tid === 'rub' ? '\u20bd' : '$';
        out.textContent = sy + (a * fp).toLocaleString('en-US', { maximumFractionDigits: 2 });
      } else {
        var tp = prices[tid] || 0;
        if (!tp) { out.textContent = '\u2014'; return; }
        out.textContent = ((a * fp) / tp).toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + (SYM[tid] || tid);
      }
    }
    if (amt) amt.oninput = go;
    from.onchange = go; to.onchange = go; go();
  }
  setTimeout(initConv, 700);

  async function loadFG() {
    var chip = $('fgChip'); if (!chip) return;
    try {
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      var v = d && d.data && d.data[0]; if (!v) return;
      var n = +v.value;
      var col = n <= 25 ? '#ef4444' : n <= 45 ? '#f59e0b' : n <= 55 ? '#eab308' : n <= 75 ? '#84cc16' : '#22c55e';
      chip.innerHTML = 'FG: <b style="color:' + col + '">' + n + '</b>';
    } catch (e) {}
  }
  setTimeout(loadFG, 400);

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card[data-wid="tonkeeper"], .w-card[data-wid="ton"]');
    if (!card) return;
    e.preventDefault(); e.stopPropagation();
    toast('Copy address in Tonkeeper and paste below');
    var mc = $('manChain'); if (mc) mc.value = 'ton';
    var inp = $('manAddr'); if (inp) setTimeout(function () { inp.focus(); }, 150);
  }, true);

  setTimeout(function () {
    if ($('legalBar')) return;
    var bar = document.createElement('div');
    bar.id = 'legalBar';
    bar.style.cssText = 'text-align:center;padding:1.2rem .8rem 5.5rem;font-size:.75rem;color:var(--muted)';
    bar.innerHTML = '<a href="#" id="aboutLink" style="color:var(--accent);margin:0 .55rem">About</a>\u00b7<a href="#" id="privacyLink" style="color:var(--accent);margin:0 .55rem">Privacy</a>';
    (document.querySelector('.wrap') || document.body).appendChild(bar);
    var modal = document.createElement('div');
    modal.id = 'legalModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.55);align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)';
    modal.innerHTML = '<div style="background:var(--card);backdrop-filter:blur(20px);border-radius:20px 20px 0 0;padding:1.3rem;width:100%;max-width:520px;max-height:70vh;overflow:auto;border:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem"><h2 id="legalTitle" style="margin:0;font-size:1.1rem"></h2><button type="button" id="legalClose" class="btn-ghost">\u00d7</button></div><div id="legalBody" style="font-size:.88rem;line-height:1.55;color:var(--muted)"></div></div>';
    document.body.appendChild(modal);
    function open(t, h) { $('legalTitle').textContent = t; $('legalBody').innerHTML = h; modal.style.display = 'flex'; }
    $('aboutLink').onclick = function (e) {
      e.preventDefault();
      open('About', '<p><b>Crypto Tracker</b> is a free portfolio &amp; market tracker.</p><p>Prices: CoinGecko. Charts: TradingView. News: Cointelegraph / CoinDesk.</p><p>Not financial advice.</p>');
    };
    $('privacyLink').onclick = function (e) {
      e.preventDefault();
      open('Privacy', '<p>We do not collect personal data. Portfolio lives only in browser localStorage.</p>');
    };
    $('legalClose').onclick = function () { modal.style.display = 'none'; };
    modal.onclick = function (e) { if (e.target === modal) modal.style.display = 'none'; };
  }, 400);
})();
