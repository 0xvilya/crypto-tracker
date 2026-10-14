/* v5.5 overlay */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function getLang() {
    var sel = $('langSel');
    if (sel && sel.value) return sel.value;
    return localStorage.getItem('ct_lang') || 'ru';
  }

  async function loadFGChip() {
    var chip = $('fgChip');
    if (!chip) {
      var actions = document.querySelector('.top-actions');
      if (actions) {
        chip = document.createElement('span');
        chip.className = 'chip';
        chip.id = 'fgChip';
        chip.textContent = 'FG: \u2014';
        var dom = $('domChip');
        if (dom) actions.insertBefore(chip, dom.nextSibling);
        else actions.appendChild(chip);
      }
    }
    try {
      var d = await fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); });
      var v = d && d.data && d.data[0];
      if (!v) return;
      var n = +v.value;
      var col = n <= 25 ? '#ef4444' : n <= 45 ? '#f59e0b' : n <= 55 ? '#eab308' : n <= 75 ? '#84cc16' : '#22c55e';
      if (chip) {
        chip.innerHTML = 'FG: <b style="color:' + col + '">' + n + '</b>';
        chip.title = n + ' \u00b7 ' + (v.value_classification || '');
      }
      var fgBox = $('fgBox');
      if (fgBox) { var card = fgBox.closest('.card'); if (card) card.style.display = 'none'; }
    } catch (e) {}
  }
  setTimeout(loadFGChip, 400);
  setInterval(loadFGChip, 300000);

  var newsBusy = false, lastLang = null;
  async function gTranslate(text, to) {
    if (!text || to === 'en') return text;
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
  async function reloadNewsForLang() {
    var box = $('newsList'); if (!box || newsBusy) return;
    var lang = getLang();
    if (lastLang === lang && box.querySelector('.news-item') && !/MYMEMORY/i.test(box.innerHTML)) return;
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
      all = all.slice(0, 16);
      if (lang === 'ru') {
        for (var j = 0; j < all.length; j++) {
          all[j].title = await gTranslate(all[j].title, 'ru');
          if (all[j].desc) all[j].desc = await gTranslate(all[j].desc, 'ru');
          if (j % 4 === 3) await new Promise(function (r) { setTimeout(r, 40); });
        }
      }
      if (getLang() !== lang) { newsBusy = false; reloadNewsForLang(); return; }
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
  var ls = $('langSel');
  if (ls) ls.addEventListener('change', function () {
    localStorage.setItem('ct_lang', ls.value);
    lastLang = null;
    setTimeout(reloadNewsForLang, 50);
  });
  setInterval(function () {
    if (lastLang && lastLang !== getLang()) { lastLang = null; reloadNewsForLang(); }
  }, 1500);

  var COIN_COLOR = {
    bitcoin: '#f7931a', BTC: '#f7931a', ethereum: '#627eea', ETH: '#627eea',
    solana: '#14f195', SOL: '#14f195', binancecoin: '#f3ba2f', BNB: '#f3ba2f',
    dogecoin: '#c2a633', DOGE: '#c2a633', toncoin: '#0098ea', TON: '#0098ea',
    ripple: '#00aae4', XRP: '#00aae4', cardano: '#0033ad', ADA: '#0033ad'
  };
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
      var hold = getHold();
      indices.sort(function (a, b) { return b - a; }).forEach(function (i) { hold.splice(i, 1); });
      setHold(hold);
      renderMerged();
    }, true);
  }
  var mhAdd = $('mhAdd');
  if (mhAdd) mhAdd.addEventListener('click', function () { setTimeout(renderMerged, 800); });
  setTimeout(renderMerged, 900);
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'port') setTimeout(renderMerged, 200);
      if (b.getAttribute('data-p') === 'news') setTimeout(reloadNewsForLang, 150);
    });
  });

  if (!$('legalBar')) {
    var footer = document.createElement('div');
    footer.id = 'legalBar';
    footer.style.cssText = 'text-align:center;padding:1rem .8rem 5rem;font-size:.72rem;color:var(--muted)';
    footer.innerHTML = '<a href="#" id="aboutLink" style="color:var(--accent);margin:0 .5rem">\u041e \u043d\u0430\u0441</a>\u00b7<a href="#" id="privacyLink" style="color:var(--accent);margin:0 .5rem">\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c</a>';
    (document.querySelector('.wrap') || document.body).appendChild(footer);
    var modal = document.createElement('div');
    modal.id = 'legalModal';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.65);align-items:flex-end;justify-content:center';
    modal.innerHTML = '<div style="background:var(--card,#12121a);border-radius:16px 16px 0 0;padding:1.2rem;max-height:70vh;overflow:auto;width:100%;max-width:520px;border:1px solid var(--border,#2a2a35)"><div style="display:flex;justify-content:space-between;margin-bottom:.8rem"><h2 id="legalTitle" style="margin:0;font-size:1.05rem"></h2><button type="button" id="legalClose" class="btn-ghost">\u00d7</button></div><div id="legalBody" style="font-size:.85rem;line-height:1.5;color:var(--muted)"></div></div>';
    document.body.appendChild(modal);
    function openL(t, h) { $('legalTitle').textContent = t; $('legalBody').innerHTML = h; modal.style.display = 'flex'; }
    $('aboutLink').onclick = function (e) {
      e.preventDefault();
      openL(getLang() === 'ru' ? '\u041e \u043d\u0430\u0441' : 'About',
        getLang() === 'ru'
          ? '<p><b>Crypto Tracker</b> \u2014 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0439 \u0442\u0440\u0435\u043a\u0435\u0440 \u043a\u0440\u0438\u043f\u0442\u043e\u0432\u0430\u043b\u044e\u0442.</p><p>\u0426\u0435\u043d\u044b: CoinGecko. \u0413\u0440\u0430\u0444\u0438\u043a\u0438: TradingView. \u041d\u043e\u0432\u043e\u0441\u0442\u0438: Cointelegraph / CoinDesk. Fear & Greed: alternative.me.</p><p>\u041d\u0435 \u0444\u0438\u043d\u0430\u043d\u0441\u043e\u0432\u0430\u044f \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u044f.</p>'
          : '<p><b>Crypto Tracker</b> \u2014 free crypto tracker.</p><p>Prices: CoinGecko. Charts: TradingView. News: Cointelegraph / CoinDesk. F&G: alternative.me.</p><p>Not financial advice.</p>');
    };
    $('privacyLink').onclick = function (e) {
      e.preventDefault();
      openL(getLang() === 'ru' ? '\u041a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c' : 'Privacy',
        getLang() === 'ru'
          ? '<p>\u041c\u044b <b>\u043d\u0435 \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u043c</b> \u043b\u0438\u0447\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0432 localStorage \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430. \u0421\u0435\u0440\u0432\u0435\u0440\u0430 \u043d\u0435\u0442 \u2014 \u0437\u0430\u043f\u0440\u043e\u0441\u044b \u0438\u0434\u0443\u0442 \u043a \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u043c API.</p>'
          : '<p>We <b>do not collect</b> personal data. Portfolio is stored only in browser localStorage. No server \u2014 requests go to public APIs.</p>');
    };
    $('legalClose').onclick = function () { modal.style.display = 'none'; };
    modal.onclick = function (e) { if (e.target === modal) modal.style.display = 'none'; };
  }
})();
