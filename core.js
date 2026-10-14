/* Crypto Tracker Core v8.1 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    var s = $('langSel');
    return (s && s.value) || localStorage.getItem('ct_lang') || 'en';
  }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function toast(m, ms) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t);
    e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 2000);
  }
  (function () {
    var e = $('toast'); if (!e) return;
    new MutationObserver(function () {
      var t = e.textContent || '';
      if (/updated|\u043e\u0431\u043d\u043e\u0432\u043b/i.test(t)) {
        e.classList.remove('show'); e.textContent = '';
      }
    }).observe(e, { childList: true, characterData: true, subtree: true });
  })();

  var COINS = {
    bitcoin: { sym: 'BTC', pair: 'BTCUSDT', name: 'Bitcoin', color: '#f7931a' },
    ethereum: { sym: 'ETH', pair: 'ETHUSDT', name: 'Ethereum', color: '#627eea' },
    solana: { sym: 'SOL', pair: 'SOLUSDT', name: 'Solana', color: '#14f195' },
    binancecoin: { sym: 'BNB', pair: 'BNBUSDT', name: 'BNB', color: '#f3ba2f' },
    ripple: { sym: 'XRP', pair: 'XRPUSDT', name: 'XRP', color: '#00aae4' },
    cardano: { sym: 'ADA', pair: 'ADAUSDT', name: 'Cardano', color: '#0033ad' },
    dogecoin: { sym: 'DOGE', pair: 'DOGEUSDT', name: 'Dogecoin', color: '#c2a633' },
    litecoin: { sym: 'LTC', pair: 'LTCUSDT', name: 'Litecoin', color: '#345d9d' },
    chainlink: { sym: 'LINK', pair: 'LINKUSDT', name: 'Chainlink', color: '#2a5ada' },
    polkadot: { sym: 'DOT', pair: 'DOTUSDT', name: 'Polkadot', color: '#e6007a' },
    'avalanche-2': { sym: 'AVAX', pair: 'AVAXUSDT', name: 'Avalanche', color: '#e84142' },
    tron: { sym: 'TRX', pair: 'TRXUSDT', name: 'TRON', color: '#ff0013' },
    'matic-network': { sym: 'POL', pair: 'POLUSDT', name: 'Polygon', color: '#8247e5' },
    'shiba-inu': { sym: 'SHIB', pair: 'SHIBUSDT', name: 'Shiba Inu', color: '#ffa409' },
    pepe: { sym: 'PEPE', pair: 'PEPEUSDT', name: 'Pepe', color: '#3d9a3d' },
    sui: { sym: 'SUI', pair: 'SUIUSDT', name: 'Sui', color: '#4da2ff' },
    near: { sym: 'NEAR', pair: 'NEARUSDT', name: 'NEAR', color: '#00c08b' },
    toncoin: { sym: 'TON', pair: null, name: 'Toncoin', color: '#0098ea' }
  };
  var PAIR_TO_ID = {};
  Object.keys(COINS).forEach(function (id) {
    if (COINS[id].pair) PAIR_TO_ID[COINS[id].pair] = id;
  });
  var DEFAULTS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
  var prices = {};
  var fx = { usd: 1, eur: 0.89, pln: 3.91, rub: 83.7 };
  var fxT = 0;

  function money(v, c) {
    if (v == null || isNaN(v)) return '\u2014';
    c = (c || cur()).toLowerCase();
    var sym = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1e6) return sym + (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return sym + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return sym + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (Math.abs(n) >= 0.0001) return sym + n.toFixed(6);
    return sym + n.toPrecision(4);
  }
  function pct(v) {
    if (v == null || isNaN(v)) return '\u2014';
    return (v >= 0 ? '+' : '') + (+v).toFixed(2) + '%';
  }
  function toCur(usd) {
    if (usd == null) return null;
    return usd * (fx[cur()] || 1);
  }

  async function loadFx() {
    if (Date.now() - fxT < 3600000) return;
    try {
      var d = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function (r) { return r.json(); });
      if (d && d.rates) {
        fx.usd = 1;
        fx.eur = d.rates.EUR || fx.eur;
        fx.pln = d.rates.PLN || fx.pln;
        fx.rub = d.rates.RUB || fx.rub;
        fxT = Date.now();
      }
    } catch (e) {}
  }

  async function fetchBinancePrices() {
    try {
      var d = await fetch('https://api.binance.us/api/v3/ticker/24hr').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      (d || []).forEach(function (t) {
        var id = PAIR_TO_ID[t.symbol];
        if (!id) return;
        prices[id] = { usd: parseFloat(t.lastPrice), ch: parseFloat(t.priceChangePercent), t: Date.now() };
      });
    } catch (e) { console.warn('binance.us', e); }
  }

  async function fetchTonPrice() {
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=toncoin&vs_currencies=usd&include_24hr_change=true').then(function (r) {
        if (!r.ok) return null;
        return r.json();
      });
      if (d && d.toncoin) {
        prices.toncoin = { usd: d.toncoin.usd, ch: d.toncoin.usd_24h_change, t: Date.now() };
      }
    } catch (e) {}
  }

  async function ensurePrices(ids) {
    await loadFx();
    var need = false;
    (ids || Object.keys(COINS)).forEach(function (id) {
      var p = prices[id];
      if (!p || Date.now() - p.t > 25000) need = true;
    });
    if (need) await fetchBinancePrices();
    if ((!prices.toncoin || Date.now() - prices.toncoin.t > 60000) && (!ids || ids.indexOf('toncoin') >= 0)) {
      await fetchTonPrice();
    }
  }

  function getPrice(id) {
    var p = prices[id];
    if (!p) return null;
    return toCur(p.usd);
  }
  function getCh(id) {
    var p = prices[id];
    return p ? p.ch : null;
  }
  function getList() {
    try {
      var l = JSON.parse(localStorage.getItem('ct_wl') || 'null');
      if (l && l.length) return l;
    } catch (e) {}
    return DEFAULTS.slice();
  }

  var wlBusy = false;
  async function renderWatch() {
    var body = $('wBody'); if (!body || wlBusy) return;
    wlBusy = true;
    var list = getList();
    try {
      await ensurePrices(list);
      body.innerHTML = list.map(function (id, i) {
        var meta = COINS[id] || { sym: id.slice(0, 4).toUpperCase(), name: id };
        var p = getPrice(id);
        var ch = getCh(id);
        var chCls = ch == null ? '' : (ch >= 0 ? 'up' : 'down');
        return '<tr data-id="' + id + '" style="cursor:pointer">' +
          '<td class="muted">' + (i + 1) + '</td>' +
          '<td><div class="coin"><div><div class="nm">' + meta.name + '</div>' +
          '<div class="sy">' + meta.sym + '</div></div></div></td>' +
          '<td class="pr" style="white-space:nowrap;font-weight:600">' + (p != null ? money(p) : '\u2026') + '</td>' +
          '<td class="' + chCls + '">' + pct(ch) + '</td>' +
          '<td><button type="button" class="btn-ghost wl-rm" data-id="' + id + '" style="padding:.1rem .35rem">\u00d7</button></td></tr>';
      }).join('') || '<tr><td colspan="5" class="empty">\u2014</td></tr>';
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
          localStorage.setItem('ct_wl', JSON.stringify(getList().filter(function (x) { return x !== id; })));
          renderWatch();
        };
      });
    } catch (e) { console.warn(e); }
    wlBusy = false;
  }

  var chartData = [];
  function openDetail(id) {
    var det = $('detail'); if (!det) return;
    det.style.display = 'block';
    var meta = COINS[id] || { sym: id, name: id, color: '#a855f7' };
    var p = getPrice(id);
    var ch = getCh(id);
    if ($('dName')) $('dName').textContent = meta.name;
    if ($('dSym')) $('dSym').textContent = meta.sym;
    if ($('dPrice')) $('dPrice').textContent = p != null ? money(p) : '\u2026';
    if ($('dCh')) {
      $('dCh').textContent = ch == null ? '' : pct(ch) + ' / 24h';
      $('dCh').className = ch == null ? '' : (ch >= 0 ? 'up' : 'down');
    }
    if ($('ex')) {
      $('ex').innerHTML =
        '<a href="https://www.binance.com/en/trade/' + meta.sym + '_USDT" target="_blank" rel="noopener">Binance</a> ' +
        '<a href="https://www.coingecko.com/en/coins/' + id + '" target="_blank" rel="noopener">CoinGecko</a>';
    }
    loadChart(id, meta);
    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadChart(id, meta) {
    var box = $('tv'); if (!box) return;
    box.innerHTML = '<div style="position:relative;height:300px;width:100%">' +
      '<canvas id="cgChart" width="360" height="280" style="width:100%;height:280px;display:block;touch-action:none"></canvas>' +
      '<div id="cgTip" style="display:none;position:absolute;top:8px;left:8px;background:rgba(0,0,0,.8);color:#fff;padding:.3rem .55rem;border-radius:8px;font-size:.75rem;pointer-events:none;z-index:2"></div>' +
      '<div class="muted" style="text-align:center;font-size:.68rem;margin-top:.2rem">' +
      (lang() === 'ru' ? '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043d\u0430 \u0433\u0440\u0430\u0444\u0438\u043a' : 'Tap chart for price') + '</div></div>';
    chartData = [];
    if (meta && meta.pair) {
      try {
        var k = await fetch('https://api.binance.us/api/v3/klines?symbol=' + meta.pair + '&interval=1h&limit=168').then(function (r) { return r.json(); });
        if (Array.isArray(k) && k.length) {
          chartData = k.map(function (row) {
            var closePx = parseFloat(row[4]);
            return { t: row[0], v: toCur(closePx) };
          });
        }
      } catch (e) {}
    }
    if (!chartData.length) {
      try {
        var cg = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=usd&days=7').then(function (r) {
          if (!r.ok) return null; return r.json();
        });
        if (cg && cg.prices) {
          chartData = cg.prices.map(function (p) {
            return { t: p[0], v: toCur(p[1]) };
          });
        }
      } catch (e) {}
    }
    if (!chartData.length) {
      var tip = box.querySelector('.muted');
      if (tip) tip.textContent = lang() === 'ru' ? '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445' : 'No chart data';
      return;
    }
    drawChart(); bindChart();
  }

  function drawChart(hi) {
    var canvas = $('cgChart'); if (!canvas || !chartData.length) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, pad = 24;
    ctx.clearRect(0, 0, w, h);
    var vals = chartData.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max === min) { max += 1; min -= 1; }
    var up = chartData[chartData.length - 1].v >= chartData[0].v;
    var col = up ? '#22c55e' : '#ef4444';
    ctx.strokeStyle = 'rgba(168,85,247,0.1)'; ctx.lineWidth = 1;
    for (var g = 0; g < 5; g++) {
      var gy = pad + (h - 2 * pad) * g / 4;
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(w - pad, gy); ctx.stroke();
    }
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    chartData.forEach(function (p, i) {
      var x = pad + (w - 2 * pad) * i / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / (max - min)) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(w - pad, h - pad); ctx.lineTo(pad, h - pad); ctx.closePath();
    var grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, up ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px system-ui';
    ctx.fillText(money(max), 2, pad + 2); ctx.fillText(money(min), 2, h - pad + 2);
    if (hi != null && chartData[hi]) {
      var p = chartData[hi];
      var x = pad + (w - 2 * pad) * hi / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / (max - min)) * (h - 2 * pad);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      var tip = $('cgTip');
      if (tip) {
        var dt = new Date(p.t);
        tip.style.display = 'block';
        tip.textContent = money(p.v) + ' \u00b7 ' + dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
  }
  function bindChart() {
    var canvas = $('cgChart'); if (!canvas) return;
    function idx(ev) {
      var rect = canvas.getBoundingClientRect();
      var cx = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
      var rel = (cx - rect.left) / rect.width;
      return Math.max(0, Math.min(chartData.length - 1, Math.round(rel * (chartData.length - 1))));
    }
    function move(ev) { ev.preventDefault(); drawChart(idx(ev)); }
    canvas.addEventListener('click', function (ev) { drawChart(idx(ev)); });
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('touchstart', move, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
  }

  async function renderTrends() {
    var box = $('trends'); if (!box) return;
    await ensurePrices(Object.keys(COINS));
    var list = Object.keys(COINS).filter(function (id) { return prices[id]; })
      .sort(function (a, b) { return Math.abs(getCh(b) || 0) - Math.abs(getCh(a) || 0); }).slice(0, 8);
    if (!list.length) { box.innerHTML = '<div class="muted">\u2014</div>'; return; }
    box.innerHTML = list.map(function (id, i) {
      var meta = COINS[id]; var p = getPrice(id); var ch = getCh(id);
      return '<div class="hold-row trend-row" data-id="' + id + '" style="cursor:pointer;padding:.45rem 0">' +
        '<div style="display:flex;align-items:center;gap:.4rem">' +
        '<span class="muted" style="width:1rem">' + (i + 1) + '</span>' +
        '<div><b style="font-size:.82rem">' + meta.name + '</b>' +
        '<div class="muted" style="font-size:.65rem">' + meta.sym + '</div></div></div>' +
        '<div style="text-align:right"><b style="font-size:.8rem">' + (p != null ? money(p) : '\u2026') + '</b>' +
        (ch != null ? '<div class="' + (ch >= 0 ? 'up' : 'down') + '" style="font-size:.7rem">' + pct(ch) + '</div>' : '') +
        '</div></div>';
    }).join('');
    box.querySelectorAll('.trend-row').forEach(function (row) {
      row.onclick = function () {
        var home = document.querySelector('.nav-btn[data-p="home"]');
        if (home) home.click();
        setTimeout(function () { openDetail(row.getAttribute('data-id')); }, 100);
      };
    });
  }

  function getHold() {
    try { return JSON.parse(localStorage.getItem('ct_mh') || '[]'); } catch (e) { return []; }
  }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }

  async function renderPort() {
    var box = $('mhList'), tot = $('mhTotal'); if (!box) return;
    var hold = getHold();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u041f\u0443\u0441\u0442\u043e' : 'Empty') + '</div>';
      if (tot) tot.style.display = 'none';
      var cw = $('portChartWrap'); if (cw) cw.style.display = 'none';
      return;
    }
    var ids = [];
    hold.forEach(function (h) { if (ids.indexOf(h.id) < 0) ids.push(h.id); });
    await ensurePrices(ids);
    var map = {}, merged = [];
    hold.forEach(function (h, i) {
      var buy = (h.buy > 0) ? +(+h.buy).toFixed(8) : 0;
      var k = h.id + '|' + buy;
      if (map[k] != null) { merged[map[k]].qty += +h.qty; merged[map[k]].idx.push(i); }
      else { map[k] = merged.length; merged.push({ id: h.id, qty: +h.qty, buy: buy, idx: [i] }); }
    });
    var totalVal = 0, totalCost = 0, hasPrice = false, byCoin = {};
    box.innerHTML = merged.map(function (h) {
      var meta = COINS[h.id] || { sym: h.id, name: h.id, color: '#a855f7' };
      var price = getPrice(h.id);
      var val = price != null ? price * h.qty : null;
      if (val != null) { totalVal += val; hasPrice = true; }
      var cost = h.buy > 0 ? h.buy * h.qty : 0;
      if (cost > 0) totalCost += cost;
      var pnl = (price != null && cost > 0) ? val - cost : null;
      if (!byCoin[h.id]) byCoin[h.id] = { id: h.id, sym: meta.sym, name: meta.name, color: meta.color, val: 0 };
      if (val != null) byCoin[h.id].val += val;
      var right = price == null ? '<span class="muted">\u2026</span>' :
        ('<b>' + money(val) + '</b>' + (pnl != null ? '<div class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + money(pnl) + '</div>' : ''));
      return '<div class="hold-row"><div><b>' + meta.sym + '</b><div class="muted">' + h.qty +
        (price != null ? ' \u00b7 ' + money(price) : ' \u00b7 \u2026') +
        (h.buy > 0 ? ' \u00b7 buy ' + money(h.buy) : '') +
        '</div></div><div style="text-align:right">' + right +
        '<button type="button" class="btn-ghost mh-rm" data-indices="' + h.idx.join(',') +
        '" style="font-size:.7rem;padding:.1rem .3rem">\u00d7</button></div></div>';
    }).join('');
    if (tot) {
      tot.style.display = 'block';
      var mv = $('mhVal');
      if (mv) mv.textContent = hasPrice ? money(totalVal) : '\u2026';
      var pe = $('mhPnl');
      if (pe) {
        if (hasPrice && totalCost > 0) {
          var p = totalVal - totalCost;
          pe.textContent = (p >= 0 ? '+' : '') + money(p) + ' (' + ((p / totalCost) * 100).toFixed(2) + '%)';
          pe.className = p >= 0 ? 'up' : 'down';
        } else { pe.textContent = ''; pe.className = 'muted'; }
      }
    }
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 16;
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2;
      var fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#14f195'];
      slices.forEach(function (s, i) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = s.color || fb[i % fb.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (ang > 0.3) {
          var mid = start + ang / 2;
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(s.sym, cx + Math.cos(mid) * R * 0.6, cy + Math.sin(mid) * R * 0.6 + 4);
        }
        start += ang; s._c = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#160f28';
      ctx.fill();
      if (leg) {
        leg.innerHTML = slices.map(function (s) {
          return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin:.15rem .4rem;font-size:.75rem">' +
            '<span style="width:9px;height:9px;border-radius:50%;background:' + s._c + ';display:inline-block"></span>' +
            '<b>' + s.sym + '</b> ' + s.name + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
        }).join('');
      }
    } else if (wrap) wrap.style.display = 'none';
  }

  var lastGas = '';
  async function buildGas() {
    var box = $('gasBox'); if (!box) return;
    var rows = [];
    try {
      var eth = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      if (eth && eth.result && eth.result.ProposeGasPrice)
        rows.push({ c: 'Ethereum', l: eth.result.SafeGasPrice, a: eth.result.ProposeGasPrice, h: eth.result.FastGasPrice, u: 'gwei ETH' });
    } catch (e) {}
    try {
      var poly = await fetch('https://gasstation.polygon.technology/v2').then(function (r) { return r.json(); });
      if (poly && poly.standard)
        rows.push({ c: 'Polygon', l: Math.round((poly.safeLow && poly.safeLow.maxFee) || 30), a: Math.round((poly.standard && poly.standard.maxFee) || 50), h: Math.round((poly.fast && poly.fast.maxFee) || 80), u: 'gwei POL' });
    } catch (e) {}
    rows.push({ c: 'BNB Chain', l: '~3', a: '~5', h: '~8', u: 'gwei BNB*' });
    rows.push({ c: 'Arbitrum', l: '~0.01', a: '~0.1', h: '~0.3', u: 'gwei ETH*' });
    rows.push({ c: 'Optimism', l: '~0.001', a: '~0.01', h: '~0.05', u: 'gwei ETH*' });
    rows.push({ c: 'Base', l: '~0.001', a: '~0.01', h: '~0.05', u: 'gwei ETH*' });
    rows.push({ c: 'Solana', l: '~0.00001', a: '~0.00005', h: '~0.0002', u: 'SOL*' });
    lastGas = '<div style="font-size:.68rem;color:var(--muted);margin-bottom:.35rem">Low / Avg / Fast *approx</div>' +
      rows.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;gap:.4rem;padding:.35rem 0;border-bottom:1px solid var(--border);font-size:.78rem">' +
          '<b>' + r.c + '</b><span style="text-align:right">' + r.l + ' / <b style="color:var(--accent2)">' + r.a + '</b> / ' + r.h +
          ' <span style="color:var(--muted);font-size:.65rem">' + r.u + '</span></span></div>';
      }).join('');
    box.innerHTML = lastGas;
  }

  function setupConverter() {
    var from = $('convFrom'), to = $('convTo');
    if (!from || !to) return;
    var opts = Object.keys(COINS).map(function (id) {
      return '<option value="' + id + '">' + COINS[id].sym + '</option>';
    }).join('');
    from.innerHTML = opts; to.innerHTML = opts;
    from.value = 'bitcoin'; to.value = 'ethereum';
    function calc() {
      var amt = parseFloat(($('convAmt') || {}).value) || 0;
      var a = getPrice(from.value), b = getPrice(to.value);
      var out = $('convOut'); if (!out) return;
      if (a == null || b == null || !b) { out.textContent = '\u2026'; return; }
      var res = amt * a / b;
      var meta = COINS[to.value];
      out.textContent = res.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + (meta ? meta.sym : '');
    }
    ['convAmt', 'convFrom', 'convTo'].forEach(function (id) {
      var el = $(id); if (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); }
    });
    setInterval(calc, 15000);
  }

  async function softRefresh() {
    await ensurePrices(getList().concat(Object.keys(COINS)));
    await renderWatch(); await renderTrends(); await renderPort();
  }

  var curSel = $('curSel');
  if (curSel) {
    curSel.value = cur();
    curSel.addEventListener('change', function () {
      localStorage.setItem('ct_cur', curSel.value);
      softRefresh();
    });
  }

  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var p = b.getAttribute('data-p');
      if (p === 'home') setTimeout(function () { renderWatch(); renderTrends(); }, 60);
      if (p === 'port') setTimeout(renderPort, 80);
      if (p === 'tools') setTimeout(function () { buildGas(); setupConverter(); }, 60);
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

  document.querySelectorAll('.mh-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var id = chip.getAttribute('data-id');
      var sym = chip.getAttribute('data-sym');
      var hidden = $('mhCoin'), q = $('mhQ'), picked = $('mhPicked');
      if (hidden) hidden.value = id;
      if (q) q.value = sym || '';
      if (picked) picked.textContent = (COINS[id] ? COINS[id].name : id) + ' (' + (sym || '') + ')';
      document.querySelectorAll('.mh-chip').forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
    });
  });

  var mhAdd = $('mhAdd');
  if (mhAdd) {
    mhAdd.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var id = ($('mhCoin') || {}).value;
      var qty = parseFloat(($('mhQty') || {}).value);
      var buy = parseFloat(($('mhBuy') || {}).value) || 0;
      if (!id || !qty || qty <= 0) {
        toast(lang() === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u0443' : 'Pick coin and quantity');
        return;
      }
      var hold = getHold();
      hold.push({ id: id, qty: qty, buy: buy });
      setHold(hold);
      if ($('mhQty')) $('mhQty').value = '';
      if ($('mhBuy')) $('mhBuy').value = '';
      renderPort();
      toast(lang() === 'ru' ? '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e' : 'Added');
    }, true);
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card[data-wid="tonkeeper"]');
    if (!card) return;
    e.preventDefault(); e.stopPropagation();
    toast(lang() === 'ru' ? '\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 TON-\u0430\u0434\u0440\u0435\u0441' : 'Paste TON address below', 3500);
    var chain = $('manChain'); if (chain) chain.value = 'ton';
    var addr = $('manAddr'); if (addr) { addr.focus(); addr.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }, true);

  function wireTools() {
    var inv = $('tpInv'), pctEl = $('tpPct'), out = $('tpOut');
    function tp() {
      if (!out) return;
      var a = parseFloat(inv && inv.value) || 0;
      var p = parseFloat(pctEl && pctEl.value) || 0;
      out.textContent = money(a * (1 + p / 100));
    }
    if (inv) inv.addEventListener('input', tp);
    if (pctEl) pctEl.addEventListener('input', tp);
    var da = $('dcaAmt'), dm = $('dcaMonths'), dg = $('dcaGrowth'), dout = $('dcaOut');
    function dca() {
      if (!dout) return;
      var monthly = parseFloat(da && da.value) || 0;
      var months = parseInt(dm && dm.value, 10) || 0;
      var growth = (parseFloat(dg && dg.value) || 0) / 100;
      var r = growth / 12, total = 0;
      for (var i = 0; i < months; i++) total = (total + monthly) * (1 + r);
      dout.textContent = money(total) + ' (invested ' + money(monthly * months) + ')';
    }
    if (da) da.addEventListener('input', dca);
    if (dm) dm.addEventListener('input', dca);
    if (dg) dg.addEventListener('input', dca);
  }

  var refBtn = $('refBtn');
  if (refBtn) refBtn.addEventListener('click', function () { softRefresh(); });

  setTimeout(async function () {
    await softRefresh();
    setupConverter();
    buildGas();
    wireTools();
  }, 300);
  setInterval(softRefresh, 30000);
  setInterval(buildGas, 180000);

  var I18N = {
    en: { nav_home: 'Home', nav_port: 'Portfolio', nav_news: 'News', nav_wallet: 'Wallet', nav_tools: 'Tools', watchlist: 'Watchlist', trending: 'Trending', manual_port: 'Manual portfolio', total: 'Total', converter: 'Converter', gas: 'Gas fees', btn_add: '+ Add' },
    ru: { nav_home: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f', nav_port: '\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c', nav_news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', nav_wallet: '\u041a\u043e\u0448\u0435\u043b\u0451\u043a', nav_tools: '\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b', watchlist: '\u0421\u043f\u0438\u0441\u043e\u043a', trending: '\u0412 \u0442\u0440\u0435\u043d\u0434\u0435', manual_port: '\u0420\u0443\u0447\u043d\u043e\u0439 \u043f\u043e\u0440\u0442\u0444\u0435\u043b\u044c', total: '\u0418\u0442\u043e\u0433\u043e', converter: '\u041a\u043e\u043d\u0432\u0435\u0440\u0442\u0435\u0440', gas: '\u041a\u043e\u043c\u0438\u0441\u0441\u0438\u0438', btn_add: '+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c' }
  };
  function applyLang() {
    var L = I18N[lang()] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (L[k]) el.textContent = L[k];
    });
  }
  var langSel = $('langSel');
  if (langSel) {
    langSel.value = lang();
    langSel.addEventListener('change', function () {
      localStorage.setItem('ct_lang', langSel.value);
      applyLang();
    });
  }
  applyLang();
})();
