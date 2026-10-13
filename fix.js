/* v5.4 — news without MyMemory, portfolio chips, tonkeeper UX */
(function () {
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  var TOP = [
    { id: 'bitcoin', s: 'BTC' }, { id: 'ethereum', s: 'ETH' }, { id: 'solana', s: 'SOL' },
    { id: 'binancecoin', s: 'BNB' }, { id: 'ripple', s: 'XRP' }, { id: 'cardano', s: 'ADA' },
    { id: 'dogecoin', s: 'DOGE' }, { id: 'toncoin', s: 'TON' }, { id: 'tron', s: 'TRX' },
    { id: 'avalanche-2', s: 'AVAX' }, { id: 'chainlink', s: 'LINK' }, { id: 'polkadot', s: 'DOT' },
    { id: 'polygon', s: 'MATIC' }, { id: 'litecoin', s: 'LTC' }, { id: 'shiba-inu', s: 'SHIB' },
    { id: 'pepe', s: 'PEPE' }, { id: 'uniswap', s: 'UNI' }, { id: 'near', s: 'NEAR' },
    { id: 'cosmos', s: 'ATOM' }, { id: 'stellar', s: 'XLM' }
  ];
  function $(id) { return document.getElementById(id); }
  function toast(m) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, 2800);
  }
  function money(v, cur) {
    if (v == null || isNaN(v)) return '\u2014';
    var s = cur === 'eur' ? '\u20ac' : cur === 'rub' ? '\u20bd' : cur === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (n >= 1) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (n >= 0.01) return s + n.toFixed(4);
    return s + n.toPrecision(4);
  }
  function getCur() { return localStorage.getItem('ct_cur') || 'usd'; }
  function getHold() { try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; } }
  function setHold(arr) { localStorage.setItem('ct_mh', JSON.stringify(arr)); }

  function wipeNewsCache() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /news/i.test(k)) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }
  wipeNewsCache();

  async function gTranslate(text, to) {
    if (!text || to === 'en') return text;
    if (/MYMEMORY|YOU USED ALL AVAILABLE|TRANSLATED\.NET/i.test(text)) return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
        encodeURIComponent(to) + '&dt=t&q=' + encodeURIComponent(String(text).slice(0, 400));
      var r = await fetch(url).then(function (x) { return x.json(); });
      if (r && r[0]) {
        var out = r[0].map(function (x) { return x[0]; }).join('');
        if (out && !/MYMEMORY|YOU USED ALL AVAILABLE/i.test(out)) return out;
      }
    } catch (e) {}
    return text;
  }

  var newsBusy = false;
  var newsDone = false;

  async function loadCleanNews(force) {
    var box = $('newsList'); if (!box) return;
    if (newsBusy) return;
    var html = box.innerHTML || '';
    var dirty = /MYMEMORY|YOU USED ALL AVAILABLE|TRANSLATED\.NET/i.test(html);
    if (!force && !dirty && newsDone && box.querySelector('.news-item')) return;

    newsBusy = true;
    var lang = localStorage.getItem('ct_lang') || 'ru';
    box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439\u2026' : 'Loading news\u2026') + '</div>';

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
            all.push({
              title: title,
              link: it.link,
              date: it.pubDate,
              source: feeds[i].name,
              desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 140)
            });
          });
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      all = all.slice(0, 16);

      if (lang === 'ru') {
        for (var j = 0; j < all.length; j++) {
          try {
            all[j].title = await gTranslate(all[j].title, 'ru');
            if (all[j].desc) all[j].desc = await gTranslate(all[j].desc, 'ru');
          } catch (e) {}
          if (j % 4 === 3) await new Promise(function (r) { setTimeout(r, 50); });
        }
      }

      if (!all.length) {
        box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u041d\u0435\u0442 \u043d\u043e\u0432\u043e\u0441\u0442\u0435\u0439' : 'No news') + '</div>';
      } else {
        box.innerHTML = all.map(function (n) {
          var d = '';
          try {
            d = new Date(n.date).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });
          } catch (e) {}
          return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' +
            n.title + '</a><div class="news-meta"><span class="news-src">' + n.source +
            '</span> ' + d + '</div>' +
            (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '\u2026</div>' : '') +
            '</div>';
        }).join('');
      }
      var ol = $('outlook');
      if (ol) {
        ol.textContent = lang === 'ru'
          ? '\ud83d\udcf0 \u041d\u043e\u0432\u043e\u0441\u0442\u0438 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b. \u041d\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u044b\u0439 \u0441\u043e\u0432\u0435\u0442.'
          : '\ud83d\udcf0 News updated. Not financial advice.';
      }
      newsDone = true;
    } catch (e) {
      box.innerHTML = '<div class="empty">' + (lang === 'ru' ? '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438' : 'Load error') + '</div>';
    }
    newsBusy = false;
  }

  setInterval(function () {
    var box = $('newsList');
    if (box && /MYMEMORY|YOU USED ALL AVAILABLE/i.test(box.innerHTML || '')) {
      newsDone = false;
      loadCleanNews(true);
    }
  }, 1500);

  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'news') {
        wipeNewsCache();
        newsDone = false;
        setTimeout(function () { loadCleanNews(true); }, 100);
      }
      if (b.getAttribute('data-p') === 'port') setTimeout(initPortUI, 80);
    });
  });

  var langSel = $('langSel');
  if (langSel) {
    langSel.addEventListener('change', function () {
      wipeNewsCache();
      newsDone = false;
      setTimeout(function () { loadCleanNews(true); }, 200);
    });
  }

  setTimeout(function () { loadCleanNews(true); }, 600);
  setTimeout(function () { loadCleanNews(true); }, 2500);

  async function fetchPrice(id) {
    var cur = getCur();
    var key = 'c5_coin_' + cur + '_' + id;
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var o = JSON.parse(raw);
        if (o.t && Date.now() - o.t < 120000 && o.d && o.d.current_price) return o.d;
      }
    } catch (e) {}
    try {
      var d = await fetch(API + '/coins/markets?vs_currency=' + cur + '&ids=' + encodeURIComponent(id))
        .then(function (r) { return r.json(); });
      if (d && d[0]) {
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), ttl: 120000, d: d[0] })); } catch (e) {}
        return d[0];
      }
    } catch (e) {}
    return null;
  }

  async function renderHoldFixed() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box) return;
    var hold = getHold(), cur = getCur();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">\u041f\u0443\u0441\u0442\u043e \u2014 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 BTC / ETH / SOL\u2026 \u0438 +</div>';
      if (tot) tot.style.display = 'none';
      var cw = $('portChartWrap'); if (cw) cw.style.display = 'none';
      return;
    }
    box.innerHTML = '<div class="empty">\u0421\u0447\u0438\u0442\u0430\u044e\u2026</div>';
    var totalVal = 0, totalCost = 0, rows = [];
    for (var i = 0; i < hold.length; i++) {
      var h = hold[i];
      var c = await fetchPrice(h.id);
      var price = c && c.current_price != null ? +c.current_price : null;
      var sym = c ? (c.symbol || '').toUpperCase() : (h.id || '').toUpperCase();
      var val = price != null ? price * h.qty : null;
      if (val != null) totalVal += val;
      var cost = (h.buy > 0) ? h.buy * h.qty : null;
      if (cost != null) totalCost += cost;
      var pnl = (val != null && cost != null) ? val - cost : null;
      rows.push({ i: i, sym: sym, qty: h.qty, price: price, val: val, pnl: pnl, buy: h.buy });
    }
    box.innerHTML = rows.map(function (r) {
      var right = r.val != null
        ? ('<b>' + money(r.val, cur) + '</b>' + (r.pnl != null
          ? '<div class="' + (r.pnl >= 0 ? 'up' : 'down') + '">' + (r.pnl >= 0 ? '+' : '') + money(r.pnl, cur) + '</div>'
          : ''))
        : '<span class="muted">\u043d\u0435\u0442 \u0446\u0435\u043d\u044b</span>';
      return '<div class="hold-row"><div><b>' + r.sym + '</b><div class="muted">' +
        r.qty + (r.price != null ? ' \u00b7 ' + money(r.price, cur) : '') +
        (r.buy > 0 ? ' \u00b7 buy ' + money(r.buy, cur) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-i="' + r.i +
        '" style="font-size:.65rem;padding:.15rem .4rem;margin-top:.2rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      var mv = $('mhVal'); if (mv) mv.textContent = money(totalVal, cur);
      var pe = $('mhPnl');
      if (pe) {
        if (totalCost > 0 && totalVal > 0) {
          var p = totalVal - totalCost;
          pe.textContent = (p >= 0 ? '+' : '') + money(p, cur) + ' (' + ((p / totalCost) * 100).toFixed(2) + '%)';
          pe.className = p >= 0 ? 'up' : 'down';
        } else {
          pe.textContent = totalCost > 0 ? '\u041d\u0443\u0436\u043d\u0430 \u0442\u0435\u043a\u0443\u0449\u0430\u044f \u0446\u0435\u043d\u0430 \u0434\u043b\u044f P&L' : '';
          pe.className = 'muted';
        }
      }
    }
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    if (canvas && wrap && totalVal > 0) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12;
      var cols = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8b5cf6'];
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2;
      rows.forEach(function (r, idx) {
        if (r.val == null || r.val <= 0) return;
        var ang = (r.val / totalVal) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = cols[idx % cols.length]; ctx.fill();
        start += ang;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#12121a';
      ctx.fill();
      if (leg) {
        leg.innerHTML = rows.filter(function (r) { return r.val > 0; }).map(function (r, idx) {
          return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin-right:.55rem"><span style="width:8px;height:8px;border-radius:50%;background:' +
            cols[idx % cols.length] + ';display:inline-block"></span>' + r.sym + ' ' + ((r.val / totalVal) * 100).toFixed(0) + '%</span>';
        }).join('');
      }
    } else if (wrap) wrap.style.display = 'none';
  }

  function initPortUI() {
    if (!$('mhChips')) {
      var form = document.querySelector('#p-port .card .form');
      if (form) {
        var chips = document.createElement('div');
        chips.id = 'mhChips';
        chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:.35rem;margin:.5rem 0 .6rem';
        chips.innerHTML = TOP.map(function (c) {
          return '<button type="button" class="tab mh-chip" data-id="' + c.id + '" data-sym="' + c.s +
            '" style="padding:.28rem .55rem;font-size:.72rem">' + c.s + '</button>';
        }).join('');
        form.parentNode.insertBefore(chips, form.nextSibling);
        chips.addEventListener('click', function (e) {
          var t = e.target.closest('.mh-chip'); if (!t) return;
          chips.querySelectorAll('.mh-chip').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          var hid = $('mhCoin'); if (hid) hid.value = t.getAttribute('data-id');
          var q = $('mhQ'); if (q) q.value = t.getAttribute('data-sym');
          var host = $('mhPicked'); if (host) host.innerHTML = '<b>' + t.getAttribute('data-sym') + '</b> \u0432\u044b\u0431\u0440\u0430\u043d\u0430';
        });
      }
    }
    renderHoldFixed();
  }

  var mhAdd = $('mhAdd');
  if (mhAdd) {
    var neu = mhAdd.cloneNode(true);
    mhAdd.parentNode.replaceChild(neu, mhAdd);
    neu.addEventListener('click', async function () {
      var id = ($('mhCoin') || {}).value;
      var qty = parseFloat(($('mhQty') || {}).value);
      var buy = parseFloat(($('mhBuy') || {}).value) || 0;
      if (!id) { toast('\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u0443 (BTC ETH SOL\u2026)'); return; }
      if (!(qty > 0)) { toast('\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e'); return; }
      neu.disabled = true; neu.textContent = '\u2026';
      await fetchPrice(id);
      var hold = getHold();
      hold.push({ id: id, qty: qty, buy: buy });
      setHold(hold);
      if ($('mhQty')) $('mhQty').value = '';
      if ($('mhBuy')) $('mhBuy').value = '';
      if ($('mhCoin')) $('mhCoin').value = '';
      if ($('mhQ')) $('mhQ').value = '';
      if ($('mhPicked')) $('mhPicked').textContent = '';
      var chips = $('mhChips');
      if (chips) chips.querySelectorAll('.mh-chip').forEach(function (x) { x.classList.remove('on'); });
      await renderHoldFixed();
      neu.disabled = false; neu.textContent = '+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0430\u043a\u0442\u0438\u0432';
      toast('\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e');
    });
  }
  var mhList = $('mhList');
  if (mhList) {
    mhList.addEventListener('click', function (e) {
      var btn = e.target.closest('.mh-rm'); if (!btn) return;
      var hold = getHold();
      hold.splice(+btn.getAttribute('data-i'), 1);
      setHold(hold);
      renderHoldFixed();
    });
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card[data-wid="tonkeeper"]');
    if (!card) return;
    e.stopPropagation();
    e.preventDefault();
    toast('\u0421\u043a\u043e\u043f\u0438\u0440\u0443\u0439\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0432 Tonkeeper \u2192 \u0432\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u043d\u0438\u0436\u0435 (\u0441\u0435\u0442\u044c TON)');
    var mc = $('manChain'); if (mc) mc.value = 'ton';
    var inp = $('manAddr');
    if (inp) {
      inp.placeholder = 'EQ\u2026 \u0438\u043b\u0438 UQ\u2026 \u0430\u0434\u0440\u0435\u0441 TON';
      setTimeout(function () { inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150);
    }
  }, true);

  setTimeout(initPortUI, 500);
})();
