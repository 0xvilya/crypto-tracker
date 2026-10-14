/* Crypto Tracker v10 - full refactor */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function lang() {
    var s = $('langSel');
    return (s && s.value) || localStorage.getItem('ct_lang') || 'ru';
  }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function toast(m, ms) {
    var e = $('toast');
    if (!e) return;
    e.textContent = m;
    e.classList.add('show');
    clearTimeout(e._t);
    e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 2200);
  }

  // Data
  var COINS = {
    bitcoin: { sym: 'BTC', pair: 'BTCUSDT', name: 'Bitcoin', color: '#f7931a', img: '1/small/bitcoin.png', apy: 0 },
    ethereum: { sym: 'ETH', pair: 'ETHUSDT', name: 'Ethereum', color: '#627eea', img: '279/small/ethereum.png', apy: 3.2 },
    solana: { sym: 'SOL', pair: 'SOLUSDT', name: 'Solana', color: '#14f195', img: '4128/small/solana.png', apy: 6.8 },
    binancecoin: { sym: 'BNB', pair: 'BNBUSDT', name: 'BNB', color: '#f3ba2f', img: '825/small/bnb-icon2_2x.png', apy: 2.5 },
    ripple: { sym: 'XRP', pair: 'XRPUSDT', name: 'XRP', color: '#00aae4', img: '44/small/xrp-symbol-white_2x.png', apy: 0 },
    cardano: { sym: 'ADA', pair: 'ADAUSDT', name: 'Cardano', color: '#0033ad', img: '975/small/cardano.png', apy: 3.1 },
    dogecoin: { sym: 'DOGE', pair: 'DOGEUSDT', name: 'Dogecoin', color: '#c2a633', img: '5/small/dogecoin.png', apy: 0 },
    litecoin: { sym: 'LTC', pair: 'LTCUSDT', name: 'Litecoin', color: '#345d9d', img: '2/small/litecoin.png', apy: 0 },
    chainlink: { sym: 'LINK', pair: 'LINKUSDT', name: 'Chainlink', color: '#2a5ada', img: '877/small/chainlink-new-logo.png', apy: 0 },
    polkadot: { sym: 'DOT', pair: 'DOTUSDT', name: 'Polkadot', color: '#e6007a', img: '12171/small/polkadot.png', apy: 12.5 },
    'avalanche-2': { sym: 'AVAX', pair: 'AVAXUSDT', name: 'Avalanche', color: '#e84142', img: '12559/small/Avalanche_Circle_RedWhite_Trans.png', apy: 5.4 },
    tron: { sym: 'TRX', pair: 'TRXUSDT', name: 'TRON', color: '#ff0013', img: '1094/small/tron-logo.png', apy: 4.1 },
    'matic-network': { sym: 'POL', pair: 'POLUSDT', name: 'Polygon', color: '#8247e5', img: '4713/small/polygon.png', apy: 3.8 },
    'shiba-inu': { sym: 'SHIB', pair: 'SHIBUSDT', name: 'Shiba Inu', color: '#ffa409', img: '11939/small/shiba.png', apy: 0 },
    pepe: { sym: 'PEPE', pair: 'PEPEUSDT', name: 'Pepe', color: '#3d9a3d', img: '29850/small/pepe-token.jpeg', apy: 0 },
    toncoin: { sym: 'TON', pair: null, name: 'Toncoin', color: '#0098ea', img: '17980/small/ton_symbol.png', apy: 3.5 }
  };
  var PAIR = {}, DEFAULTS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
  Object.keys(COINS).forEach(function (id) { if (COINS[id].pair) PAIR[COINS[id].pair] = id; });
  var prices = {}, fx = { usd: 1, eur: 0.92, pln: 4, rub: 92 }, fxT = 0, wlBusy = false, chartData = [], currentChartId = null;

  function coinImg(id) {
    var c = COINS[id];
    return c && c.img ? 'https://assets.coingecko.com/coins/images/' + c.img : '';
  }
  function money(v, c) {
    if (v == null || isNaN(v)) return '\u2014';
    c = (c || cur()).toLowerCase();
    var s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1e9) return s + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return s + (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return s + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return s + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return s + n.toFixed(6);
  }
  function pct(v) {
    if (v == null || isNaN(v)) return '\u2014';
    return '<span class="' + (v >= 0 ? 'up' : 'down') + '">' + (v >= 0 ? '+' : '') + (+v).toFixed(2) + '%</span>';
  }
  function toCur(u) { return u == null ? null : u * (fx[cur()] || 1); }

  async function loadFx() {
    if (Date.now() - fxT < 36e5) return;
    try {
      var d = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function (r) { return r.json(); });
      if (d && d.rates) {
        fx.eur = d.rates.EUR || fx.eur;
        fx.pln = d.rates.PLN || fx.pln;
        fx.rub = d.rates.RUB || fx.rub;
        fxT = Date.now();
      }
    } catch (e) {}
  }
  async function fetchPrices() {
    try {
      var d = await fetch('https://api.binance.us/api/v3/ticker/24hr').then(function (r) { return r.json(); });
      (d || []).forEach(function (t) {
        var id = PAIR[t.symbol];
        if (id) prices[id] = { usd: +t.lastPrice, ch: +t.priceChangePercent };
      });
    } catch (e) {}
    try {
      var ids = Object.keys(COINS).join(',');
      var t = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true').then(function (r) { return r.json(); });
      Object.keys(t || {}).forEach(function (id) {
        if (t[id] && t[id].usd != null) prices[id] = { usd: t[id].usd, ch: t[id].usd_24h_change };
      });
    } catch (e) {}
  }
  async function ensure() { await loadFx(); await fetchPrices(); }
  function gp(id) { return prices[id] ? prices[id].usd : null; }
  function gc(id) { return prices[id] ? prices[id].ch : null; }
  function getList() {
    try {
      var a = JSON.parse(localStorage.getItem('ct_wl') || 'null');
      if (Array.isArray(a) && a.length) return a;
    } catch (e) {}
    return DEFAULTS.slice();
  }

  async function renderWatch() {
    var body = $('wBody');
    if (!body || wlBusy) return;
    wlBusy = true;
    body.innerHTML = '<tr><td colspan="6" class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</td></tr>';
    try {
      var list = getList();
      await ensure();
      body.innerHTML = list.map(function (id, i) {
        var c = COINS[id] || { sym: id, color: '#a855f7', apy: 0 };
        var apy = c.apy ? '<span class="apy">' + c.apy + '%</span>' : '\u2014';
        return '<tr data-id="' + id + '" class="row-anim" style="cursor:pointer"><td>' + (i + 1) + '</td><td><div class="coin-cell"><img class="cicon" src="' + coinImg(id) + '" width="22" height="22" onerror="this.style.display=\'none\'"/><b>' + c.sym + '</b></div></td><td>' + money(toCur(gp(id))) + '</td><td>' + pct(gc(id)) + '</td><td>' + apy + '</td><td><button type="button" class="btn-ghost wl-rm" data-id="' + id + '" style="font-size:.7rem;padding:.15rem .35rem">\u00d7</button></td></tr>';
      }).join('');
      body.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.onclick = function (e) {
          if (e.target.closest('.wl-rm')) return;
          openDetail(tr.getAttribute('data-id'));
        };
      });
      body.querySelectorAll('.wl-rm').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          localStorage.setItem('ct_wl', JSON.stringify(getList().filter(function (x) { return x !== btn.getAttribute('data-id'); })));
          renderWatch();
        };
      });
    } catch (e) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Error</td></tr>';
    }
    wlBusy = false;
  }

  function openDetail(id) {
    var det = $('detail');
    if (!det) return;
    det.style.display = 'block';
    currentChartId = id;
    var c = COINS[id] || { sym: id, name: id };
    if ($('dName')) $('dName').textContent = c.name || id;
    if ($('dSym')) $('dSym').textContent = c.sym || id;
    if ($('dPrice')) $('dPrice').textContent = money(toCur(gp(id)));
    if ($('dCh')) $('dCh').innerHTML = pct(gc(id));
    if ($('dImg')) { $('dImg').src = coinImg(id); $('dImg').style.display = coinImg(id) ? 'block' : 'none'; }
    loadChart(id, c);
    loadCoinNews(id);
    aiSummary(id);
    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadChart(id, meta) {
    var box = $('tv');
    if (!box) return;
    var days = 1;
    var tab = document.querySelector('#chartTabs .tab.on');
    if (tab) days = +tab.getAttribute('data-d') || 1;
    var interval = days <= 1 ? '15m' : days <= 7 ? '1h' : days <= 30 ? '4h' : '1d';
    var limit = days <= 1 ? 96 : days <= 7 ? 168 : days <= 30 ? 180 : 90;
    box.innerHTML = '<canvas id="cgChart" width="360" height="260" style="width:100%;height:260px;display:block;touch-action:none"></canvas>';
    chartData = [];
    try {
      if (meta && meta.pair) {
        var k = await fetch('https://api.binance.us/api/v3/klines?symbol=' + meta.pair + '&interval=' + interval + '&limit=' + limit).then(function (r) { return r.json(); });
        if (Array.isArray(k) && k.length) {
          chartData = k.map(function (row) {
            return { t: row[0], o: +row[1], h: +row[2], l: +row[3], c: +row[4], v: +row[5] };
          });
        }
      }
    } catch (e) {}
    if (!chartData.length) {
      try {
        var cg = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=usd&days=' + days).then(function (r) { return r.json(); });
        if (cg && cg.prices) chartData = cg.prices.map(function (p) { return { t: p[0], o: p[1], h: p[1], l: p[1], c: p[1], v: 0 }; });
      } catch (e) {}
    }
    if (!chartData.length) {
      if ($('chartTip')) $('chartTip').textContent = lang() === 'ru' ? '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445' : 'No data';
      return;
    }
    drawChart(null);
    bindChart();
  }

  function drawChart(hi) {
    var canvas = $('cgChart');
    if (!canvas || !chartData.length) return;
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, pad = 16;
    ctx.clearRect(0, 0, w, h);
    var vals = chartData.map(function (p) { return p.c; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), range = max - min || 1, n = chartData.length, cw = Math.max(2, (w - 2 * pad) / n * 0.7);
    chartData.forEach(function (p, i) {
      var x = pad + (w - 2 * pad) * i / Math.max(1, n - 1);
      var yO = h - pad - ((p.o - min) / range) * (h - 2 * pad);
      var yC = h - pad - ((p.c - min) / range) * (h - 2 * pad);
      var yH = h - pad - ((p.h - min) / range) * (h - 2 * pad);
      var yL = h - pad - ((p.l - min) / range) * (h - 2 * pad);
      var up = p.c >= p.o;
      ctx.strokeStyle = up ? '#22c55e' : '#ef4444';
      ctx.fillStyle = up ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();
      var top = Math.min(yO, yC), bot = Math.max(yO, yC);
      ctx.fillRect(x - cw / 2, top, cw, Math.max(1, bot - top));
    });
    if (hi != null && chartData[hi]) {
      var p = chartData[hi];
      var x = pad + (w - 2 * pad) * hi / Math.max(1, n - 1);
      ctx.strokeStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
      if ($('chartTip')) {
        var dt = new Date(p.t).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        $('chartTip').textContent = dt + '  O:' + money(toCur(p.o)) + ' H:' + money(toCur(p.h)) + ' L:' + money(toCur(p.l)) + ' C:' + money(toCur(p.c));
      }
    }
  }

  function bindChart() {
    var canvas = $('cgChart');
    if (!canvas) return;
    function idx(ev) {
      var rect = canvas.getBoundingClientRect();
      var cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      return Math.max(0, Math.min(chartData.length - 1, Math.round(((cx - rect.left) / rect.width) * (chartData.length - 1))));
    }
    function move(ev) { ev.preventDefault(); drawChart(idx(ev)); }
    canvas.onclick = function (ev) { drawChart(idx(ev)); };
    canvas.onmousemove = function (ev) { drawChart(idx(ev)); };
    canvas.ontouchstart = move;
    canvas.ontouchmove = move;
  }

  async function renderTrends() {
    var gBox = $('gainers'), lBox = $('losers');
    if (!gBox && !lBox) return;
    await ensure();
    var ids = Object.keys(COINS).filter(function (id) { return prices[id]; });
    var sorted = ids.slice().sort(function (a, b) { return (gc(b) || 0) - (gc(a) || 0); });
    var gainers = sorted.filter(function (id) { return (gc(id) || 0) > 0; }).slice(0, 6);
    var losers = sorted.filter(function (id) { return (gc(id) || 0) < 0; }).slice(-6).reverse();
    function paint(box, arr) {
      if (!box) return;
      box.innerHTML = arr.map(function (id) {
        return '<button type="button" class="tab trend-row" data-id="' + id + '"><img class="cicon" src="' + coinImg(id) + '" width="16" height="16" onerror="this.style.display=\'none\'"/>' + COINS[id].sym + ' ' + pct(gc(id)) + '</button>';
      }).join('') || '\u2014';
      box.querySelectorAll('.trend-row').forEach(function (row) {
        row.onclick = function () { openDetail(row.getAttribute('data-id')); };
      });
    }
    paint(gBox, gainers);
    paint(lBox, losers);
  }

  function getHold() {
    try { return JSON.parse(localStorage.getItem('ct_mh') || '[]') || []; } catch (e) { return []; }
  }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }

  async function renderPort() {
    var box = $('mhList');
    if (!box) return;
    await ensure();
    var holds = getHold();
    if (!holds.length) {
      box.innerHTML = '<div class="empty muted">' + (lang() === 'ru' ? 'Добавьте монеты ниже' : 'Add coins below') + '</div>';
      if ($('mhTotal')) { $('mhTotal').style.display = 'none'; }
      return;
    }
    var total = 0, cost = 0;
    box.innerHTML = holds.map(function (h, i) {
      var v = (gp(h.id) || 0) * h.qty;
      total += v;
      if (h.buy > 0) cost += h.buy * h.qty;
      var c = COINS[h.id] || { sym: h.id };
      var pnl = (h.buy > 0 && gp(h.id) != null) ? v - h.buy * h.qty : null;
      return '<div class="hold-row" data-i="' + i + '">' +
        '<img class="cicon" src="' + coinImg(h.id) + '" width="20" height="20" onerror="this.style.display=\'none\'"/> ' +
        '<b>' + c.sym + '</b> \u00d7 ' + h.qty + ' = <b>' + money(toCur(v)) + '</b>' +
        (pnl != null ? ' <span class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + money(toCur(pnl)) + '</span>' : '') +
        ' <button type="button" class="btn-ghost mh-rm" data-i="' + i + '">\u00d7</button></div>';
    }).join('');
    if ($('mhTotal')) {
      $('mhTotal').style.display = 'block';
      if ($('mhVal')) $('mhVal').textContent = money(toCur(total));
      var pe = $('mhPnl');
      if (pe && cost > 0) {
        var pr = total - cost;
        pe.textContent = (pr >= 0 ? '+' : '') + money(toCur(pr)) + ' (' + ((pr / cost) * 100).toFixed(2) + '%)';
        pe.className = pr >= 0 ? 'up' : 'down';
      }
    }
    box.querySelectorAll('.mh-rm').forEach(function (btn) {
      btn.onclick = function () {
        var a = getHold();
        a.splice(+btn.getAttribute('data-i'), 1);
        setHold(a);
        renderPort();
      };
    });
  }

  function showPage(p) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('on'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
    var page = document.getElementById('p-' + p);
    if (page) page.classList.add('on');
    if (p === 'home') setTimeout(function () { renderWatch(); renderTrends(); }, 40);
    if (p === 'port') setTimeout(renderPort, 40);
    if (p === 'tools') setTimeout(function () { setupConverter(); wireTools(); buildGas(); }, 40);
    if (p === 'news') setTimeout(function () { loadNews(true); }, 40);
  }

  async function softRefresh() {
    await ensure();
    await renderWatch();
    await renderTrends();
    await renderPort();
    loadMeta();
  }

  async function loadMeta() {
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/global').then(function (r) { return r.json(); });
      var g = d && d.data;
      if (!g) return;
      if ($('mcapChip') && g.total_market_cap) $('mcapChip').textContent = 'Cap: ' + money(toCur(g.total_market_cap.usd));
      if ($('domChip') && g.market_cap_percentage) $('domChip').textContent = 'BTC: ' + g.market_cap_percentage.btc.toFixed(1) + '%';
      if ($('ethDomChip') && g.market_cap_percentage) $('ethDomChip').textContent = 'ETH: ' + g.market_cap_percentage.eth.toFixed(1) + '%';
    } catch (e) {}
  }

  function setupConverter() {
    var from = $('convFrom'), to = $('convTo');
    if (!from || !to) return;
    var opts = Object.keys(COINS).map(function (id) { return '<option value="' + id + '">' + COINS[id].sym + '</option>'; }).join('') + '<option value="usd">USD</option>';
    if (!from.options.length) { from.innerHTML = opts; to.innerHTML = opts; to.value = 'usd'; }
    function calc() {
      var amt = parseFloat(($('convAmt') || {}).value) || 0;
      var f = from.value, t = to.value;
      var pf = f === 'usd' ? 1 : gp(f);
      var pt = t === 'usd' ? 1 : gp(t);
      if (!pf || !pt) { if ($('convOut')) $('convOut').textContent = '\u2014'; return; }
      var res = amt * pf / pt;
      if ($('convOut')) $('convOut').textContent = t === 'usd' ? money(toCur(res)) : res.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + (COINS[t] ? COINS[t].sym : t);
    }
    ['convAmt', 'convFrom', 'convTo'].forEach(function (id) {
      var el = $(id);
      if (el) { el.oninput = calc; el.onchange = calc; }
    });
    calc();
  }

  async function buildGas() {
    var box = $('gasBox');
    if (!box) return;
    try {
      var eth = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      var r = eth.result || {};
      box.innerHTML = '<div class="hold-row"><span>Safe</span><b>' + (r.SafeGasPrice || '\u2014') + ' gwei</b></div><div class="hold-row"><span>Propose</span><b>' + (r.ProposeGasPrice || '\u2014') + ' gwei</b></div><div class="hold-row"><span>Fast</span><b>' + (r.FastGasPrice || '\u2014') + ' gwei</b></div>';
    } catch (e) { box.textContent = '\u2014'; }
  }

  function wireTools() {
    // populate selects
    var opts = Object.keys(COINS).map(function (id) { return '<option value="' + id + '">' + COINS[id].sym + ' - ' + COINS[id].name + '</option>'; }).join('');
    if ($('dcaCoin') && !$('dcaCoin').options.length) $('dcaCoin').innerHTML = opts;
    if ($('stakeCoin') && !$('stakeCoin').options.length) {
      $('stakeCoin').innerHTML = opts;
      $('stakeCoin').onchange = function () {
        var c = COINS[$('stakeCoin').value];
        if (c && $('stakeApy')) $('stakeApy').value = c.apy || 5;
        stakeCalc();
      };
    }
    if ($('mhCoinSel') && !$('mhCoinSel').options.length) {
      $('mhCoinSel').innerHTML = opts;
      $('mhCoinSel').onchange = function () { if ($('mhCoin')) $('mhCoin').value = $('mhCoinSel').value; };
    }

    function dca() {
      var monthly = parseFloat(($('dcaAmt') || {}).value) || 0;
      var months = parseInt(($('dcaMonths') || {}).value, 10) || 0;
      var growth = (parseFloat(($('dcaGrowth') || {}).value) || 0) / 100;
      var r = growth / 12, total = 0;
      for (var i = 0; i < months; i++) total = (total + monthly) * (1 + r);
      if ($('dcaOut')) $('dcaOut').textContent = money(toCur(total)) + ' (invested ' + money(toCur(monthly * months)) + ')';
    }
    function stakeCalc() {
      var amt = parseFloat(($('stakeAmt') || {}).value) || 0;
      var apy = parseFloat(($('stakeApy') || {}).value) || 0;
      if ($('stakeOut')) $('stakeOut').textContent = money(toCur(amt * (1 + apy / 100))) + ' / year (+' + money(toCur(amt * apy / 100)) + ')';
    }
    function tp() {
      var a = parseFloat(($('tpInv') || {}).value) || 0;
      var p = parseFloat(($('tpPct') || {}).value) || 0;
      if ($('tpOut')) $('tpOut').textContent = a ? money(toCur(a * (1 + p / 100))) : '\u2014';
    }
    ['dcaAmt', 'dcaMonths', 'dcaGrowth', 'dcaCoin'].forEach(function (id) {
      var el = $(id); if (el) { el.oninput = dca; el.onchange = dca; }
    });
    ['stakeAmt', 'stakeApy', 'stakeCoin'].forEach(function (id) {
      var el = $(id); if (el) { el.oninput = stakeCalc; el.onchange = stakeCalc; }
    });
    if ($('tpInv')) $('tpInv').oninput = tp;
    if ($('tpPct')) $('tpPct').oninput = tp;
    dca(); stakeCalc(); tp();

    if ($('mhAdd')) {
      $('mhAdd').onclick = function (e) {
        e.preventDefault();
        var id = ($('mhCoinSel') && $('mhCoinSel').value) || ($('mhCoin') || {}).value;
        var qty = parseFloat(($('mhQty') || {}).value);
        var buy = parseFloat(($('mhBuy') || {}).value) || 0;
        if (!id || !qty || qty <= 0) { toast(lang() === 'ru' ? 'Выберите монету' : 'Pick coin'); return; }
        var h = getHold();
        h.push({ id: id, qty: qty, buy: buy });
        setHold(h);
        if ($('mhQty')) $('mhQty').value = '';
        if ($('mhBuy')) $('mhBuy').value = '';
        toast(lang() === 'ru' ? 'Добавлено' : 'Added');
        renderPort();
      };
    }
  }

  var newsCache = { at: 0, items: [] }, newsFilter = 'all';
  async function loadNews(force) {
    var box = $('newsList');
    if (!box) return;
    if (!force && newsCache.items.length && Date.now() - newsCache.at < 6e4) { paintNews(newsCache.items); return; }
    box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    try {
      var feeds = [
        { n: 'Cointelegraph', u: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss') },
        { n: 'CoinDesk', u: 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') }
      ];
      var all = [];
      await Promise.all(feeds.map(async function (f) {
        try {
          var d = await fetch(f.u).then(function (r) { return r.json(); });
          (d.items || []).forEach(function (it) {
            var title = String(it.title || '').trim();
            if (title) all.push({ title: title, link: it.link, date: it.pubDate, src: f.n });
          });
        } catch (e) {}
      }));
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      newsCache = { at: Date.now(), items: all.slice(0, 30) };
      paintNews(newsCache.items);
    } catch (e) { box.innerHTML = '<div class="empty">Error</div>'; }
  }
  function paintNews(items) {
    var box = $('newsList');
    if (!box) return;
    var f = items;
    if (newsFilter && newsFilter !== 'all' && newsFilter !== 'market') {
      var re = new RegExp(newsFilter, 'i');
      f = items.filter(function (n) { return re.test(n.title); });
    }
    box.innerHTML = f.map(function (n) {
      var d = '';
      try { d = new Date(n.date).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>';
    }).join('') || '<div class="empty">\u2014</div>';
  }

  async function loadCoinNews(id) {
    var box = $('coinNews');
    if (!box) return;
    var name = (COINS[id] || {}).name || id;
    box.innerHTML = '<div class="news-head">' + (lang() === 'ru' ? 'Новости по ' : 'News for ') + name + '</div><div class="muted">...</div>';
    try {
      var all = newsCache.items.length ? newsCache.items : [];
      if (!all.length) await loadNews(true);
      all = newsCache.items;
      var re = new RegExp(name.split(' ')[0] + '|' + (COINS[id] || {}).sym, 'i');
      var f = all.filter(function (n) { return re.test(n.title); }).slice(0, 5);
      box.innerHTML = '<div class="news-head">' + (lang() === 'ru' ? 'Новости по ' : 'News for ') + name + '</div>' +
        (f.map(function (n) { return '<div class="news-item"><a href="' + n.link + '" target="_blank">' + n.title + '</a></div>'; }).join('') || '<div class="muted">No recent news</div>');
    } catch (e) {}
  }

  function aiSummary(id) {
    var box = $('aiBox');
    if (!box) return;
    var ch = gc(id) || 0;
    var txt;
    if (ch > 5) txt = lang() === 'ru' ? 'Сильный рост (+' + ch.toFixed(1) + '%). Высокий интерес покупателей.' : 'Strong rally (+' + ch.toFixed(1) + '%). High buyer interest.';
    else if (ch > 1) txt = lang() === 'ru' ? 'Умеренный рост. Позитивный фон.' : 'Moderate growth. Positive sentiment.';
    else if (ch < -5) txt = lang() === 'ru' ? 'Сильное давление продавцов (' + ch.toFixed(1) + '%). Осторожность.' : 'Heavy selling pressure (' + ch.toFixed(1) + '%). Caution.';
    else if (ch < -1) txt = lang() === 'ru' ? 'Небольшой откат. Возможен боковик.' : 'Slight pullback. Sideways possible.';
    else txt = lang() === 'ru' ? 'Боковик. Ждём импульса.' : 'Sideways. Waiting for a catalyst.';
    box.style.display = 'block';
    box.innerHTML = '<b>AI:</b> ' + txt;
  }

  function setupSearch() {
    var q = $('q'), sr = $('sr');
    if (!q || !sr) return;
    q.oninput = function () {
      var v = (q.value || '').trim().toLowerCase();
      if (v.length < 1) { sr.style.display = 'none'; return; }
      var hits = Object.keys(COINS).filter(function (id) {
        var c = COINS[id];
        return c.sym.toLowerCase().indexOf(v) >= 0 || c.name.toLowerCase().indexOf(v) >= 0 || id.indexOf(v) >= 0;
      }).slice(0, 8);
      if (!hits.length) { sr.style.display = 'none'; return; }
      sr.style.display = 'block';
      sr.innerHTML = hits.map(function (id) {
        return '<div class="sr-item" data-id="' + id + '"><img class="cicon" src="' + coinImg(id) + '" width="20" height="20" onerror="this.style.display=\'none\'"/><b>' + COINS[id].sym + '</b> <span class="muted">' + COINS[id].name + '</span></div>';
      }).join('');
      sr.querySelectorAll('.sr-item').forEach(function (el) {
        el.onclick = function () {
          q.value = '';
          sr.style.display = 'none';
          openDetail(el.getAttribute('data-id'));
        };
      });
    };
    document.addEventListener('click', function (e) {
      if (!q.contains(e.target) && !sr.contains(e.target)) sr.style.display = 'none';
    });
  }

  var HELP = {
    dca: { ru: 'DCA (Dollar Cost Averaging) - регулярные покупки на фиксированную сумму независимо от цены. Снижает риск входа на пике.', en: 'DCA (Dollar Cost Averaging) - regular fixed-amount purchases regardless of price. Reduces timing risk.' },
    staking: { ru: 'Стейкинг - блокировка монет для поддержки сети и получения дохода (APY). Риски: слэшинг, lock-up.', en: 'Staking - locking coins to support the network and earn yield (APY). Risks: slashing, lock-up periods.' },
    port: { ru: 'Ручной портфель - добавляйте свои позиции с количеством и ценой покупки для расчёта P&L.', en: 'Manual portfolio - add your holdings with quantity and buy price to track P&L.' },
    wallet: { ru: 'Вставьте адрес кошелька (ETH/BSC/Polygon/SOL/TON/BTC) чтобы увидеть баланс и стоимость в выбранной валюте.', en: 'Paste a wallet address (ETH/BSC/Polygon/SOL/TON/BTC) to see balance and value in your currency.' },
    mcap: { ru: 'Market Cap - общая капитализация рынка. BTC Dominance - доля Bitcoin в общей капитализации.', en: 'Market Cap - total crypto market capitalization. BTC Dominance - Bitcoin share of total market.' }
  };
  function openHelp(key) {
    var h = HELP[key] || { ru: 'Подсказка', en: 'Help' };
    var t = lang() === 'ru' ? h.ru : h.en;
    if ($('helpTitle')) $('helpTitle').textContent = key.toUpperCase();
    if ($('helpBody')) $('helpBody').textContent = t;
    if ($('helpModal')) $('helpModal').style.display = 'flex';
  }

  function applyLang() {
    var L = lang();
    var map = {
      nav_home: L === 'ru' ? 'Главная' : 'Home',
      nav_port: L === 'ru' ? 'Портфель' : 'Portfolio',
      nav_wallet: L === 'ru' ? 'Кошелёк' : 'Wallet',
      nav_news: L === 'ru' ? 'Новости' : 'News',
      nav_tools: L === 'ru' ? 'Инструменты' : 'Tools',
      watchlist: L === 'ru' ? 'Список' : 'Watchlist',
      th_coin: L === 'ru' ? 'Монета' : 'Coin',
      th_price: L === 'ru' ? 'Цена' : 'Price',
      trending_up: L === 'ru' ? 'Рост' : 'Gainers',
      trending_down: L === 'ru' ? 'Падение' : 'Losers',
      manual_port: L === 'ru' ? 'Ручной портфель' : 'Manual portfolio',
      port_hint: L === 'ru' ? 'Выберите монету → количество → Добавить' : 'Select coin → qty → Add',
      lbl_coin: L === 'ru' ? 'Монета' : 'Coin',
      lbl_qty: L === 'ru' ? 'Кол-во' : 'Qty',
      lbl_buy: L === 'ru' ? 'Цена покупки' : 'Buy price',
      btn_add: L === 'ru' ? '+ Добавить' : '+ Add',
      total: L === 'ru' ? 'Итого' : 'Total',
      man_addr: L === 'ru' ? 'Адрес кошелька' : 'Wallet address',
      wallet_hint: L === 'ru' ? 'Вставьте адрес - баланс и стоимость' : 'Paste address - balance & value',
      chain: L === 'ru' ? 'Сеть' : 'Chain',
      address: L === 'ru' ? 'Адрес' : 'Address',
      show_bal: L === 'ru' ? 'Показать аналитику' : 'Show analytics',
      news: L === 'ru' ? 'Новости' : 'News',
      converter: L === 'ru' ? 'Конвертер' : 'Converter',
      amount: L === 'ru' ? 'Сумма' : 'Amount',
      from: L === 'ru' ? 'Из' : 'From',
      to: L === 'ru' ? 'В' : 'To',
      months: L === 'ru' ? 'Месяцы' : 'Months',
      growth: L === 'ru' ? 'Рост %/год' : 'Growth %/yr',
      staking: L === 'ru' ? 'Стейкинг' : 'Staking',
      profit_t: L === 'ru' ? 'Цель прибыли' : 'Profit target',
      invested: L === 'ru' ? 'Вложено' : 'Invested',
      target_pct: L === 'ru' ? 'Цель %' : 'Target %',
      gas: 'Gas'
    };
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (map[k]) el.textContent = map[k];
    });
    var tb = $('themeBtn');
    if (tb) tb.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? (L === 'ru' ? 'Тёмная' : 'Dark') : (L === 'ru' ? 'Светлая' : 'Light');
  }

  var RPCS = { eth: 'https://ethereum.publicnode.com', bsc: 'https://bsc.publicnode.com', polygon: 'https://polygon-bor.publicnode.com', arb: 'https://arbitrum-one.publicnode.com', op: 'https://optimism.publicnode.com', base: 'https://base.publicnode.com' };
  var NATIVE = { eth: { id: 'ethereum', sym: 'ETH', dec: 18 }, bsc: { id: 'binancecoin', sym: 'BNB', dec: 18 }, polygon: { id: 'matic-network', sym: 'POL', dec: 18 }, arb: { id: 'ethereum', sym: 'ETH', dec: 18 }, op: { id: 'ethereum', sym: 'ETH', dec: 18 }, base: { id: 'ethereum', sym: 'ETH', dec: 18 } };

  async function analyzeWallet() {
    var chain = ($('manChain') || {}).value, addr = ((($('manAddr') || {}).value) || '').trim(), box = $('manRes');
    if (!box) return;
    if (!addr) { toast(lang() === 'ru' ? 'Введите адрес' : 'Enter address'); return; }
    box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</div>';
    try {
      var tokens = [];
      if (RPCS[chain]) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) { box.innerHTML = '<div class="empty">Invalid address</div>'; return; }
        var r = await fetch(RPCS[chain], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] }) }).then(function (x) { return x.json(); });
        var meta = NATIVE[chain];
        tokens.push({ id: meta.id, sym: meta.sym, amount: parseInt(r.result, 16) / Math.pow(10, meta.dec) });
      } else if (chain === 'sol') {
        var rs = await fetch('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] }) }).then(function (x) { return x.json(); });
        tokens.push({ id: 'solana', sym: 'SOL', amount: (rs.result && rs.result.value || 0) / 1e9 });
      } else if (chain === 'ton') {
        var rt = await fetch('https://tonapi.io/v2/accounts/' + encodeURIComponent(addr)).then(function (x) { return x.json(); });
        tokens.push({ id: 'toncoin', sym: 'TON', amount: (rt.balance || 0) / 1e9 });
      } else if (chain === 'btc') {
        var rb = await fetch('https://blockstream.info/api/address/' + encodeURIComponent(addr)).then(function (x) { return x.json(); });
        tokens.push({ id: 'bitcoin', sym: 'BTC', amount: (rb.chain_stats.funded_txo_sum - rb.chain_stats.spent_txo_sum) / 1e8 });
      }
      await ensure();
      var html = tokens.map(function (tk) {
        return '<div class="hold-row"><div><b>' + tk.sym + '</b><div class="muted">' + tk.amount + '</div></div><div style="text-align:right">' + (tk.amount != null ? '<b>' + money(toCur(gp(tk.id) * tk.amount)) + '</b>' : '\u2014') + '</div></div>';
      }).join('');
      box.innerHTML = html || '<div class="empty">No data</div>';
    } catch (e) { box.innerHTML = '<div class="empty">Error: ' + (e.message || e) + '</div>'; }
  }

  function boot() {
    try {
      // theme
      var themeBtn = $('themeBtn');
      if (themeBtn) {
        themeBtn.onclick = function () {
          var isLight = document.documentElement.getAttribute('data-theme') === 'light';
          document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
          localStorage.setItem('ct_theme', isLight ? 'dark' : 'light');
          applyLang();
        };
        if (localStorage.getItem('ct_theme') === 'light') document.documentElement.setAttribute('data-theme', 'light');
      }
      // nav
      document.querySelectorAll('.nav-btn').forEach(function (b) {
        b.onclick = function () { showPage(b.getAttribute('data-p')); };
      });
      // chart tabs
      document.querySelectorAll('#chartTabs .tab').forEach(function (t) {
        t.onclick = function () {
          document.querySelectorAll('#chartTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          if (currentChartId) openDetail(currentChartId);
        };
      });
      // help
      document.querySelectorAll('.help-btn').forEach(function (b) {
        b.onclick = function (e) { e.preventDefault(); openHelp(b.getAttribute('data-help')); };
      });
      if ($('helpClose')) $('helpClose').onclick = function () { $('helpModal').style.display = 'none'; };
      if ($('helpModal')) $('helpModal').onclick = function (e) { if (e.target === $('helpModal')) $('helpModal').style.display = 'none'; };
      // buttons
      if ($('refBtn')) $('refBtn').onclick = function () { softRefresh(); loadNews(true); toast(lang() === 'ru' ? 'Обновлено' : 'Refreshed'); };
      if ($('addTop')) $('addTop').onclick = function () {
        localStorage.setItem('ct_wl', JSON.stringify(DEFAULTS.slice()));
        renderWatch();
      };
      if ($('manBtn')) $('manBtn').onclick = function (e) { e.preventDefault(); analyzeWallet(); };
      if ($('mcapChip')) $('mcapChip').onclick = function () { openHelp('mcap'); };
      if ($('domChip')) $('domChip').onclick = function () { openHelp('mcap'); };

      var curSel = $('curSel');
      if (curSel) {
        curSel.value = cur();
        curSel.onchange = function () { localStorage.setItem('ct_cur', curSel.value); softRefresh(); };
      }
      var langSel = $('langSel');
      if (langSel) {
        langSel.value = lang();
        langSel.onchange = function () { localStorage.setItem('ct_lang', langSel.value); applyLang(); softRefresh(); };
      }

      applyLang();
      setupSearch();
      setupConverter();
      wireTools();
      buildGas();
      softRefresh();
      loadNews(true);
      setTimeout(softRefresh, 1800);
      setTimeout(softRefresh, 5000);
    } catch (e) { console.error(e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(); });
  } else {
    boot();
  }
  setInterval(softRefresh, 30000);
  setInterval(function () { loadNews(true); }, 120000);
})();
