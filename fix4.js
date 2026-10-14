(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    var s = $('langSel');
    return (s && s.value) || localStorage.getItem('ct_lang') || 'en';
  }
  function cur() { return localStorage.getItem('ct_cur') || 'usd'; }
  function toast(m, ms) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 1800);
  }
  function money(v, c) {
    if (v == null || isNaN(v)) return '\u2014';
    c = c || cur();
    var sym = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1000) return sym + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return sym + n.toLocaleString('en-US', { maximumFractionDigits: 4 });
    return sym + n.toPrecision(4);
  }
  function pct(v) {
    if (v == null || isNaN(v)) return '\u2014';
    return (v >= 0 ? '+' : '') + (+v).toFixed(2) + '%';
  }
  (function () {
    var e = $('toast');
    if (!e) return;
    var obs = new MutationObserver(function () {
      var t = e.textContent || '';
      if (/[\u0426\u0446]ены обновл|Prices updated|updated/i.test(t)) {
        e.classList.remove('show');
        e.textContent = '';
      }
    });
    obs.observe(e, { childList: true, characterData: true, subtree: true });
  })();
  var SYM = {
    bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', binancecoin: 'BNB', ripple: 'XRP',
    cardano: 'ADA', dogecoin: 'DOGE', toncoin: 'TON', tron: 'TRX', 'avalanche-2': 'AVAX',
    chainlink: 'LINK', polkadot: 'DOT', 'matic-network': 'POL', polygon: 'POL',
    litecoin: 'LTC', 'shiba-inu': 'SHIB', pepe: 'PEPE', sui: 'SUI', near: 'NEAR'
  };
  var TV = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', toncoin: 'BINANCE:TONUSDT', pepe: 'BINANCE:PEPEUSDT',
    litecoin: 'BINANCE:LTCUSDT', chainlink: 'BINANCE:LINKUSDT', polkadot: 'BINANCE:DOTUSDT',
    'avalanche-2': 'BINANCE:AVAXUSDT', tron: 'BINANCE:TRXUSDT', 'matic-network': 'BINANCE:POLUSDT',
    polygon: 'BINANCE:POLUSDT', sui: 'BINANCE:SUIUSDT', near: 'BINANCE:NEARUSDT',
    'shiba-inu': 'BINANCE:SHIBUSDT'
  };
  var COLORS = {
    bitcoin: '#f7931a', ethereum: '#627eea', solana: '#14f195', binancecoin: '#f3ba2f',
    dogecoin: '#c2a633', toncoin: '#0098ea', ripple: '#00aae4', cardano: '#0033ad', pepe: '#3d9a3d'
  };
  var DEFAULTS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
  var priceMap = {};
  async function fetchPrices(ids) {
    if (!ids || !ids.length) return;
    var c = cur();
    var need = ids.filter(function (id) {
      var x = priceMap[id];
      return !x || !x[c] || Date.now() - x.t > 20000;
    });
    if (!need.length) return;
    try {
      var url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=' + c +
        '&ids=' + encodeURIComponent(need.join(',')) + '&price_change_percentage=24h&per_page=50';
      var d = await fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      (d || []).forEach(function (coin) {
        priceMap[coin.id] = priceMap[coin.id] || {};
        priceMap[coin.id][c] = coin.current_price;
        priceMap[coin.id].ch = coin.price_change_percentage_24h;
        priceMap[coin.id].name = coin.name;
        priceMap[coin.id].sym = (coin.symbol || '').toUpperCase();
        priceMap[coin.id].img = coin.image;
        priceMap[coin.id].rank = coin.market_cap_rank;
        priceMap[coin.id].t = Date.now();
      });
    } catch (e) { console.warn('price fetch', e); }
  }
  function getList() {
    try {
      var l = JSON.parse(localStorage.getItem('ct_wl') || 'null');
      return (l && l.length) ? l : DEFAULTS.slice();
    } catch (e) { return DEFAULTS.slice(); }
  }
  var wlBusy = false;
  async function renderWatch() {
    var body = $('wBody'); if (!body || wlBusy) return;
    wlBusy = true;
    var list = getList();
    var c = cur();
    try {
      await fetchPrices(list);
      var rows = list.map(function (id, i) {
        var x = priceMap[id] || {};
        var p = x[c];
        var ch = x.ch;
        var name = x.name || id;
        var sym = x.sym || SYM[id] || id.slice(0, 6).toUpperCase();
        var img = x.img || '';
        var chCls = ch == null ? '' : (ch >= 0 ? 'up' : 'down');
        var chStr = ch == null ? '\u2014' : pct(ch);
        var pStr = p != null ? money(p, c) : '\u2026';
        return '<tr data-id="' + id + '" style="cursor:pointer">' +
          '<td class="muted">' + (x.rank || (i + 1)) + '</td>' +
          '<td><div class="coin">' +
          (img ? '<img src="' + img + '" width="22" height="22" alt=""/>' : '') +
          '<div><div class="nm">' + name + '</div><div class="sy">' + sym + '</div></div></div></td>' +
          '<td class="pr" style="white-space:nowrap;font-weight:600">' + pStr + '</td>' +
          '<td class="' + chCls + '">' + chStr + '</td>' +
          '<td><button type="button" class="btn-ghost wl-rm" data-id="' + id + '" style="padding:.1rem .35rem">\u00d7</button></td></tr>';
      }).join('');
      body.innerHTML = rows || '<tr><td colspan="5" class="empty">\u2014</td></tr>';
      body.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.onclick = function (e) {
          if (e.target.closest('.wl-rm')) return;
          openDetail(tr.getAttribute('data-id'));
        };
      });
      body.querySelectorAll('.wl-rm').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          var id = btn.getAttribute('data-id');
          var l = getList().filter(function (x) { return x !== id; });
          localStorage.setItem('ct_wl', JSON.stringify(l));
          renderWatch();
        };
      });
    } catch (e) {
      body.innerHTML = '<tr><td colspan="5" class="empty">' +
        (lang() === 'ru' ? '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u0435\u0442\u0438 \u2014 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u21bb' : 'Network error \u2014 tap \u21bb') + '</td></tr>';
    }
    wlBusy = false;
  }
  var chartData = [];
  function openDetail(id) {
    var det = $('detail'); if (!det) return;
    det.style.display = 'block';
    var x = priceMap[id] || {};
    var c = cur();
    if ($('dName')) $('dName').textContent = x.name || id;
    if ($('dSym')) $('dSym').textContent = x.sym || SYM[id] || '';
    if ($('dPrice')) $('dPrice').textContent = x[c] != null ? money(x[c], c) : '\u2026';
    if ($('dCh')) {
      var ch = x.ch;
      $('dCh').textContent = ch == null ? '' : pct(ch) + ' / 24h';
      $('dCh').className = ch == null ? '' : (ch >= 0 ? 'up' : 'down');
    }
    if ($('dImg') && x.img) $('dImg').src = x.img;
    var sym = x.sym || SYM[id] || 'BTC';
    if ($('ex')) {
      $('ex').innerHTML =
        '<a href="https://www.binance.com/en/trade/' + sym + '_USDT" target="_blank" rel="noopener">Binance</a>' +
        '<a href="https://www.bybit.com/trade/usdt/' + sym + 'USDT" target="_blank" rel="noopener">Bybit</a>' +
        '<a href="https://www.coingecko.com/en/coins/' + id + '" target="_blank" rel="noopener">CoinGecko</a>';
    }
    loadChart(id);
    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  async function loadChart(id) {
    var box = $('tv'); if (!box) return;
    box.innerHTML = '<div style="position:relative;height:320px;width:100%">' +
      '<canvas id="cgChart" width="360" height="300" style="width:100%;height:300px;display:block;touch-action:none"></canvas>' +
      '<div id="cgTip" style="display:none;position:absolute;top:8px;left:8px;background:rgba(0,0,0,.75);color:#fff;padding:.25rem .5rem;border-radius:8px;font-size:.75rem;pointer-events:none"></div>' +
      '<div class="muted" style="text-align:center;font-size:.7rem;margin-top:.25rem">' +
      (lang() === 'ru' ? '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043d\u0430 \u0433\u0440\u0430\u0444\u0438\u043a \u2014 \u0446\u0435\u043d\u0430 \u0432 \u0442\u043e\u0447\u043a\u0435' : 'Tap chart for price at point') + '</div></div>';
    var c = cur();
    try {
      var url = 'https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) +
        '/market_chart?vs_currency=' + c + '&days=30';
      var d = await fetch(url).then(function (r) { return r.json(); });
      chartData = (d.prices || []).map(function (p) { return { t: p[0], v: p[1] }; });
      if (!chartData.length) {
        box.querySelector('.muted').textContent = lang() === 'ru' ? '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445' : 'No chart data';
        return;
      }
      drawCGChart();
      bindChartTouch();
    } catch (e) {
      var tip = box.querySelector('.muted');
      if (tip) tip.textContent = lang() === 'ru' ? '\u0413\u0440\u0430\u0444\u0438\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d' : 'Chart unavailable';
    }
  }
  function drawCGChart(highlightIdx) {
    var canvas = $('cgChart'); if (!canvas || !chartData.length) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, pad = 28;
    ctx.clearRect(0, 0, w, h);
    var vals = chartData.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max += 1; min -= 1; }
    var up = chartData[chartData.length - 1].v >= chartData[0].v;
    var col = up ? '#22c55e' : '#ef4444';
    ctx.strokeStyle = 'rgba(168,85,247,0.12)';
    ctx.lineWidth = 1;
    for (var g = 0; g < 5; g++) {
      var gy = pad + (h - 2 * pad) * g / 4;
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    chartData.forEach(function (p, i) {
      var x = pad + (w - 2 * pad) * i / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / (max - min)) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath();
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, up ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px system-ui';
    ctx.fillText(money(max, cur()), 4, pad + 4);
    ctx.fillText(money(min, cur()), 4, h - pad + 4);
    if (highlightIdx != null && chartData[highlightIdx]) {
      var p = chartData[highlightIdx];
      var x = pad + (w - 2 * pad) * highlightIdx / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / (max - min)) * (h - 2 * pad);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      var tip = $('cgTip');
      if (tip) {
        var dt = new Date(p.t);
        tip.style.display = 'block';
        tip.textContent = money(p.v, cur()) + ' \u00b7 ' + dt.toLocaleDateString() + ' ' +
          dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
  }
  function bindChartTouch() {
    var canvas = $('cgChart'); if (!canvas) return;
    function idxFromEvent(ev) {
      var rect = canvas.getBoundingClientRect();
      var clientX = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
      var rel = (clientX - rect.left) / rect.width;
      var i = Math.round(rel * (chartData.length - 1));
      return Math.max(0, Math.min(chartData.length - 1, i));
    }
    function onMove(ev) {
      ev.preventDefault();
      drawCGChart(idxFromEvent(ev));
    }
    canvas.addEventListener('click', function (ev) { drawCGChart(idxFromEvent(ev)); });
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchstart', onMove, { passive: false });
  }
  async function renderTrends() {
    var box = $('trends'); if (!box) return;
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/search/trending').then(function (r) { return r.json(); });
      var coins = (d.coins || []).slice(0, 8).map(function (x) { return x.item; });
      if (!coins.length) return;
      var ids = coins.map(function (c) { return c.id; });
      await fetchPrices(ids);
      var c = cur();
      box.innerHTML = coins.map(function (coin, i) {
        var x = priceMap[coin.id] || {};
        var p = x[c];
        var ch = x.ch;
        return '<div class="hold-row trend-row" data-id="' + coin.id + '" style="cursor:pointer;padding:.45rem 0">' +
          '<div style="display:flex;align-items:center;gap:.4rem;min-width:0">' +
          '<span class="muted" style="width:1rem">' + (i + 1) + '</span>' +
          (coin.small ? '<img src="' + coin.small + '" width="20" height="20" style="border-radius:50%"/>' : '') +
          '<div style="min-width:0"><b style="font-size:.82rem">' + coin.name + '</b>' +
          '<div class="muted" style="font-size:.65rem">' + (coin.symbol || '').toUpperCase() + '</div></div></div>' +
          '<div style="text-align:right"><b style="font-size:.8rem">' + (p != null ? money(p, c) : '\u2026') + '</b>' +
          (ch != null ? '<div class="' + (ch >= 0 ? 'up' : 'down') + '" style="font-size:.7rem">' + pct(ch) + '</div>' : '') +
          '</div></div>';
      }).join('');
      box.querySelectorAll('.trend-row').forEach(function (row) {
        row.onclick = function () {
          var id = row.getAttribute('data-id');
          var home = document.querySelector('.nav-btn[data-p="home"]');
          if (home) home.click();
          setTimeout(function () { openDetail(id); }, 120);
        };
      });
    } catch (e) {}
  }
  function getHold() {
    try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; }
  }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }
  async function renderPort() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box) return;
    var hold = getHold(), c = cur();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u041f\u0443\u0441\u0442\u043e' : 'Empty') + '</div>';
      if (tot) tot.style.display = 'none';
      var cw = $('portChartWrap'); if (cw) cw.style.display = 'none';
      return;
    }
    var ids = [];
    hold.forEach(function (h) { if (ids.indexOf(h.id) < 0) ids.push(h.id); });
    await fetchPrices(ids);
    var map = {}, merged = [];
    hold.forEach(function (h, i) {
      var buy = h.buy > 0 ? +(+h.buy).toFixed(8) : 0;
      var k = h.id + '|' + buy;
      if (map[k] != null) { merged[map[k]].qty += +h.qty; merged[map[k]].idx.push(i); }
      else { map[k] = merged.length; merged.push({ id: h.id, qty: +h.qty, buy: buy, idx: [i] }); }
    });
    var totalVal = 0, totalCost = 0, hasPrice = false, byCoin = {};
    box.innerHTML = merged.map(function (h) {
      var x = priceMap[h.id] || {};
      var price = x[c];
      var sym = x.sym || SYM[h.id] || h.id;
      var name = x.name || sym;
      var val = price != null ? price * h.qty : null;
      if (val != null) { totalVal += val; hasPrice = true; }
      var cost = h.buy > 0 ? h.buy * h.qty : 0;
      if (cost > 0) totalCost += cost;
      var pnl = (price != null && cost > 0) ? val - cost : null;
      if (!byCoin[h.id]) byCoin[h.id] = { id: h.id, sym: sym, name: name, val: 0 };
      if (val != null) byCoin[h.id].val += val;
      var right = price == null ? '<span class="muted">\u2026</span>' :
        ('<b>' + money(val, c) + '</b>' + (pnl != null ? '<div class="' + (pnl >= 0 ? 'up' : 'down') + '">' +
          (pnl >= 0 ? '+' : '') + money(pnl, c) + '</div>' : ''));
      return '<div class="hold-row"><div><b>' + sym + '</b><div class="muted">' + h.qty +
        (price != null ? ' \u00b7 ' + money(price, c) : ' \u00b7 \u2026') +
        (h.buy > 0 ? ' \u00b7 buy ' + money(h.buy, c) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-indices="' + h.idx.join(',') +
        '" style="font-size:.7rem;padding:.1rem .3rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      var mv = $('mhVal');
      if (mv) mv.textContent = hasPrice ? money(totalVal, c) : '\u2026';
      var pe = $('mhPnl');
      if (pe) {
        if (hasPrice && totalCost > 0) {
          var p = totalVal - totalCost;
          pe.textContent = (p >= 0 ? '+' : '') + money(p, c) + ' (' + ((p / totalCost) * 100).toFixed(2) + '%)';
          pe.className = p >= 0 ? 'up' : 'down';
        } else {
          pe.textContent = totalCost > 0 && !hasPrice ? (lang() === 'ru' ? '\u0416\u0434\u0451\u043c \u0446\u0435\u043d\u044b\u2026' : 'Waiting for prices\u2026') : '';
          pe.className = 'muted';
        }
      }
    }
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2 - 4, R = Math.min(w, h) / 2 - 18;
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2, fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
      slices.forEach(function (s, idx) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = COLORS[s.id] || fb[idx % fb.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (ang > 0.25) {
          var mid = start + ang / 2;
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(s.sym, cx + Math.cos(mid) * R * 0.62, cy + Math.sin(mid) * R * 0.62);
        }
        start += ang; s._c = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#160f28';
      ctx.fill();
      if (leg) {
        leg.innerHTML = slices.map(function (s) {
          return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin:.15rem .35rem;font-size:.72rem">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + s._c + ';display:inline-block"></span>' +
            '<b>' + s.sym + '</b> ' + s.name + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
        }).join('');
      }
    } else if (wrap) wrap.style.display = 'none';
    var sc = $('sectorChart'), sleg = $('sectorLeg');
    if (sc && slices.length) {
      var ctx2 = sc.getContext('2d');
      ctx2.clearRect(0, 0, 200, 200);
      var tot2 = slices.reduce(function (a, s) { return a + s.val; }, 0) || 1;
      var st = -Math.PI / 2, fb2 = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
      slices.forEach(function (s, i) {
        var ang = (s.val / tot2) * Math.PI * 2;
        var col = COLORS[s.id] || fb2[i % fb2.length];
        ctx2.beginPath(); ctx2.moveTo(100, 100); ctx2.arc(100, 100, 80, st, st + ang); ctx2.closePath();
        ctx2.fillStyle = col; ctx2.fill(); st += ang; s._c = col;
      });
      ctx2.beginPath(); ctx2.arc(100, 100, 40, 0, Math.PI * 2);
      ctx2.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#160f28';
      ctx2.fill();
      if (sleg) {
        sleg.innerHTML = slices.map(function (s) {
          return '<span style="margin:0 .3rem;font-size:.72rem"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' +
            s._c + '"></span> <b>' + s.sym + '</b> ' + (s.name || '') + '</span>';
        }).join('');
      }
    }
  }
  var lastGas = '';
  async function buildGas() {
    var box = $('gasBox'); if (!box) return;
    var rows = [];
    try {
      var eth = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      if (eth && eth.result && eth.result.ProposeGasPrice)
        rows.push({ c: 'Ethereum', l: eth.result.SafeGasPrice, a: eth.result.ProposeGasPrice, h: eth.result.FastGasPrice, u: 'gwei (ETH)' });
    } catch (e) {}
    try {
      var poly = await fetch('https://gasstation.polygon.technology/v2').then(function (r) { return r.json(); });
      if (poly && poly.standard)
        rows.push({ c: 'Polygon', l: Math.round((poly.safeLow && poly.safeLow.maxFee) || 30), a: Math.round((poly.standard && poly.standard.maxFee) || 50), h: Math.round((poly.fast && poly.fast.maxFee) || 80), u: 'gwei (POL)' });
    } catch (e) {}
    try {
      var bsc = await fetch('https://api.bscscan.com/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      if (bsc && bsc.result && bsc.result.ProposeGasPrice)
        rows.push({ c: 'BNB Chain', l: bsc.result.SafeGasPrice, a: bsc.result.ProposeGasPrice, h: bsc.result.FastGasPrice, u: 'gwei (BNB)' });
    } catch (e) {}
    rows.push({ c: 'Arbitrum', l: '~0.01', a: '~0.1', h: '~0.3', u: 'gwei (ETH)*' });
    rows.push({ c: 'Optimism', l: '~0.001', a: '~0.01', h: '~0.05', u: 'gwei (ETH)*' });
    rows.push({ c: 'Base', l: '~0.001', a: '~0.01', h: '~0.05', u: 'gwei (ETH)*' });
    rows.push({ c: 'Solana', l: '~0.00001', a: '~0.00005', h: '~0.0002', u: 'SOL*' });
    lastGas = '<div style="font-size:.68rem;color:var(--muted);margin-bottom:.35rem">Low / Avg / Fast \u00b7 *approx</div>' +
      rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:.4rem;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.78rem">' +
          '<b style="flex-shrink:0">' + r.c + '</b><span style="text-align:right">' + r.l + ' / <b style="color:var(--accent2)">' + r.a + '</b> / ' + r.h +
          ' <span style="color:var(--muted);font-size:.65rem">' + r.u + '</span></span></div>';
      }).join('');
    box.innerHTML = lastGas;
  }
  setInterval(function () {
    var box = $('gasBox');
    if (box && lastGas && ((box.innerHTML || '').indexOf('Etherscan') >= 0 || (box.innerHTML || '').length < 30))
      box.innerHTML = lastGas;
  }, 500);
  async function softRefresh() {
    await renderWatch();
    await renderTrends();
    await renderPort();
  }
  var curSel = $('curSel');
  if (curSel) {
    curSel.addEventListener('change', function () {
      localStorage.setItem('ct_cur', curSel.value);
      Object.keys(priceMap).forEach(function (id) { if (priceMap[id]) priceMap[id].t = 0; });
      var body = $('wBody');
      if (body) body.innerHTML = '<tr><td colspan="5" class="empty">\u2026</td></tr>';
      softRefresh();
    });
  }
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-p');
      if (p === 'home') setTimeout(function () { renderWatch(); renderTrends(); }, 80);
      if (p === 'port') setTimeout(renderPort, 100);
      if (p === 'tools') setTimeout(buildGas, 80);
    });
  });
  var mhList = $('mhList');
  if (mhList) {
    mhList.addEventListener('click', function (e) {
      var btn = e.target.closest('.mh-rm'); if (!btn) return;
      e.stopPropagation();
      var indices = (btn.getAttribute('data-indices') || '').split(',').map(Number).filter(function (n) { return !isNaN(n); });
      var hold = getHold();
      indices.sort(function (a, b) { return b - a; }).forEach(function (i) {
        if (i >= 0 && i < hold.length) hold.splice(i, 1);
      });
      setHold(hold); renderPort();
    }, true);
  }
  var mhAdd = $('mhAdd');
  if (mhAdd) mhAdd.addEventListener('click', function () { setTimeout(renderPort, 150); });
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card[data-wid="tonkeeper"]');
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    toast(lang() === 'ru'
      ? 'TonConnect \u0432 Safari \u0447\u0430\u0441\u0442\u043e \u0441 \u043e\u0448\u0438\u0431\u043a\u043e\u0439. \u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 TON-\u0430\u0434\u0440\u0435\u0441 \u0432 \u00ab\u0410\u0434\u0440\u0435\u0441 \u0432\u0440\u0443\u0447\u043d\u0443\u044e\u00bb \u043d\u0438\u0436\u0435.'
      : 'TonConnect often fails in Safari. Paste TON address in Manual address below.', 4000);
    var chain = $('manChain');
    if (chain) chain.value = 'ton';
    var addr = $('manAddr');
    if (addr) { addr.focus(); addr.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, true);
  setTimeout(function () { renderWatch(); renderTrends(); }, 400);
  setTimeout(renderPort, 700);
  setTimeout(buildGas, 900);
  setInterval(softRefresh, 30000);
  setInterval(buildGas, 120000);
  setInterval(function () {
    var body = $('wBody');
    if (!body) return;
    var t = body.innerText || '';
    if (/Error|\u041e\u0448\u0438\u0431\u043a\u0430|tap|\u043d\u0430\u0436\u043c\u0438\u0442\u0435/i.test(t) || t.trim() === '\u2026') renderWatch();
  }, 4000);
})();
