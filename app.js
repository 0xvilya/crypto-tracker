/* Crypto Tracker v102 - LightweightCharts + portfolio analysis */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() { var s = $('langSel'); return (s && s.value) || localStorage.getItem('ct_lang') || 'ru'; }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function toast(m, ms) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 2200);
  }
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
  var prices = {}, fx = { usd: 1, eur: 0.92, pln: 4, rub: 92 }, fxT = 0, wlBusy = false, chartData = [], currentChartId = null, lwChart = null, lwSeries = null;

  function coinImg(id) { var c = COINS[id]; return c && c.img ? 'https://assets.coingecko.com/coins/images/' + c.img : ''; }
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
      if (d && d.rates) { fx.eur = d.rates.EUR || fx.eur; fx.pln = d.rates.PLN || fx.pln; fx.rub = d.rates.RUB || fx.rub; fxT = Date.now(); }
    } catch (e) {}
  }
  async function fetchPrices() {
    try {
      var d = await fetch('https://api.binance.us/api/v3/ticker/24hr').then(function (r) { return r.json(); });
      (d || []).forEach(function (t) { var id = PAIR[t.symbol]; if (id) prices[id] = { usd: +t.lastPrice, ch: +t.priceChangePercent }; });
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
    try { var a = JSON.parse(localStorage.getItem('ct_wl') || 'null'); if (Array.isArray(a) && a.length) return a; } catch (e) {}
    return DEFAULTS.slice();
  }

  async function renderWatch() {
    var body = $('wBody'); if (!body || wlBusy) return; wlBusy = true;
    body.innerHTML = '<tr><td colspan="6" class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</td></tr>';
    try {
      var list = getList(); await ensure();
      body.innerHTML = list.map(function (id, i) {
        var c = COINS[id] || { sym: id, color: '#a855f7', apy: 0 };
        var apy = c.apy ? '<span class="apy">' + c.apy + '%</span>' : '\u2014';
        return '<tr data-id="' + id + '" class="row-anim" style="cursor:pointer"><td>' + (i + 1) + '</td><td><div class="coin-cell"><img class="cicon" src="' + coinImg(id) + '" width="22" height="22" onerror="this.style.display=\'none\'"/><b>' + c.sym + '</b></div></td><td>' + money(toCur(gp(id))) + '</td><td>' + pct(gc(id)) + '</td><td>' + apy + '</td><td><button type="button" class="btn-ghost wl-rm" data-id="' + id + '" style="font-size:.7rem;padding:.15rem .35rem">\u00d7</button></td></tr>';
      }).join('');
      body.querySelectorAll('tr[data-id]').forEach(function (tr) {
        tr.onclick = function (e) { if (e.target.closest('.wl-rm')) return; openDetail(tr.getAttribute('data-id')); };
      });
      body.querySelectorAll('.wl-rm').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          localStorage.setItem('ct_wl', JSON.stringify(getList().filter(function (x) { return x !== btn.getAttribute('data-id'); })));
          renderWatch();
        };
      });
    } catch (e) { body.innerHTML = '<tr><td colspan="6" class="empty">Error</td></tr>'; }
    wlBusy = false;
  }

  function openDetail(id) {
    var det = $('detail'); if (!det) return;
    det.style.display = 'block'; currentChartId = id;
    var c = COINS[id] || { sym: id, name: id };
    if ($('dName')) $('dName').textContent = c.name || id;
    if ($('dSym')) $('dSym').textContent = c.sym || id;
    if ($('dPrice')) $('dPrice').textContent = money(toCur(gp(id)));
    if ($('dCh')) $('dCh').innerHTML = pct(gc(id));
    if ($('dImg')) { $('dImg').src = coinImg(id); $('dImg').style.display = coinImg(id) ? 'block' : 'none'; }
    loadChart(id, c); loadCoinNews(id); aiSummary(id);
    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadChart(id, meta) {
    var box = $('tv'); if (!box) return;
    currentChartId = id;
    var days = 1;
    var tab = document.querySelector('#chartTabs .tab.on');
    if (tab) days = +tab.getAttribute('data-d') || 1;
    var interval = days <= 1 ? '15m' : days <= 7 ? '1h' : days <= 30 ? '4h' : '1d';
    var limit = days <= 1 ? 96 : days <= 7 ? 168 : days <= 30 ? 180 : 90;
    box.innerHTML = ''; chartData = [];
    try {
      if (meta && meta.pair) {
        var k = await fetch('https://api.binance.us/api/v3/klines?symbol=' + meta.pair + '&interval=' + interval + '&limit=' + limit).then(function (r) { return r.json(); });
        if (Array.isArray(k) && k.length) {
          chartData = k.map(function (row) {
            return { time: Math.floor(row[0] / 1000), open: +row[1], high: +row[2], low: +row[3], close: +row[4] };
          });
        }
      }
    } catch (e) {}
    if (!chartData.length) {
      try {
        var cg = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/ohlc?vs_currency=usd&days=' + days).then(function (r) { return r.json(); });
        if (Array.isArray(cg) && cg.length) {
          chartData = cg.map(function (row) {
            return { time: Math.floor(row[0] / 1000), open: +row[1], high: +row[2], low: +row[3], close: +row[4] };
          });
        }
      } catch (e) {}
    }
    if (!chartData.length) {
      if ($('chartTip')) $('chartTip').textContent = lang() === 'ru' ? 'Нет данных' : 'No data';
      return;
    }
    if (typeof LightweightCharts === 'undefined') {
      box.innerHTML = '<div class="muted">Chart library loading...</div>';
      return;
    }
    if (lwChart) { try { lwChart.remove(); } catch (e) {} lwChart = null; lwSeries = null; }
    lwChart = LightweightCharts.createChart(box, {
      width: box.clientWidth || 340, height: 280,
      layout: { background: { color: 'transparent' }, textColor: '#9b92b5' },
      grid: { vertLines: { color: 'rgba(42,35,64,0.5)' }, horzLines: { color: 'rgba(42,35,64,0.5)' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#2a2340' },
      timeScale: { borderColor: '#2a2340', timeVisible: true, secondsVisible: false }
    });
    lwSeries = lwChart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444'
    });
    lwSeries.setData(chartData);
    lwChart.timeScale().fitContent();
    lwChart.subscribeCrosshairMove(function (param) {
      if (!param || !param.time || !param.seriesData) { if ($('chartTip')) $('chartTip').textContent = ''; return; }
      var d = param.seriesData.get(lwSeries);
      if (!d) return;
      var dt = new Date(param.time * 1000).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      if ($('chartTip')) $('chartTip').textContent = dt + '  O:' + money(toCur(d.open)) + ' H:' + money(toCur(d.high)) + ' L:' + money(toCur(d.low)) + ' C:' + money(toCur(d.close));
    });
    if (window._chartRO) window._chartRO.disconnect();
    window._chartRO = new ResizeObserver(function () { if (lwChart && box) lwChart.applyOptions({ width: box.clientWidth }); });
    window._chartRO.observe(box);
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
    paint(gBox, gainers); paint(lBox, losers);
  }

  function getHold() { try { return JSON.parse(localStorage.getItem('ct_mh') || '[]') || []; } catch (e) { return []; } }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }

  async function renderPort() {
    var box = $('mhList'); if (!box) return;
    await ensure();
    var holds = getHold();
    if (!holds.length) {
      box.innerHTML = '<div class="empty muted">' + (lang() === 'ru' ? 'Добавьте монеты ниже' : 'Add coins below') + '</div>';
      if ($('mhTotal')) $('mhTotal').style.display = 'none';
      if ($('portChartWrap')) $('portChartWrap').style.display = 'none';
      return;
    }
    var total = 0, cost = 0, items = [];
    holds.forEach(function (h) {
      var p = gp(h.id) || 0; var v = p * h.qty; total += v;
      if (h.buy > 0) cost += h.buy * h.qty;
      items.push({ id: h.id, qty: h.qty, value: v, buy: h.buy, sym: (COINS[h.id] || {}).sym || h.id, color: (COINS[h.id] || {}).color || '#a855f7' });
    });
    box.innerHTML = items.map(function (it, i) {
      var pctShare = total > 0 ? (it.value / total * 100).toFixed(1) : 0;
      var pnl = (it.buy > 0) ? it.value - it.buy * it.qty : null;
      return '<div class="hold-row"><img class="cicon" src="' + coinImg(it.id) + '" width="20" height="20" onerror="this.style.display=\'none\'"/> <b>' + it.sym + '</b> \u00d7 ' + it.qty + ' <span class="muted">(' + pctShare + '%)</span> = <b>' + money(toCur(it.value)) + '</b>' + (pnl != null ? ' <span class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + money(toCur(pnl)) + '</span>' : '') + ' <button type="button" class="btn-ghost mh-rm" data-i="' + i + '">\u00d7</button></div>';
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
      btn.onclick = function () { var a = getHold(); a.splice(+btn.getAttribute('data-i'), 1); setHold(a); renderPort(); };
    });
    var wrap = $('portChartWrap');
    if (wrap && total > 0) {
      wrap.style.display = 'block';
      var canvas = $('portChart');
      if (canvas) {
        var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
        ctx.clearRect(0, 0, w, h);
        var start = -Math.PI / 2;
        items.forEach(function (it) {
          var ang = (it.value / total) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + ang); ctx.closePath();
          ctx.fillStyle = it.color; ctx.fill(); start += ang;
        });
        var leg = $('portLegend');
        if (leg) leg.innerHTML = items.map(function (it) {
          return '<span style="display:inline-block;margin:2px 6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + it.color + ';margin-right:3px"></span>' + it.sym + ' ' + (it.value / total * 100).toFixed(1) + '%</span>';
        }).join('');
      }
      var analysis = $('portAnalysis');
      if (!analysis) { analysis = document.createElement('div'); analysis.id = 'portAnalysis'; analysis.className = 'ai-box'; analysis.style.marginTop = '0.7rem'; wrap.appendChild(analysis); }
      var hhi = 0; items.forEach(function (it) { var s = it.value / total; hhi += s * s; }); hhi = Math.round(hhi * 10000);
      var conc = hhi > 2500 ? (lang() === 'ru' ? 'Высокая концентрация' : 'High concentration') : hhi > 1500 ? (lang() === 'ru' ? 'Средняя концентрация' : 'Moderate') : (lang() === 'ru' ? 'Хорошая диверсификация' : 'Well diversified');
      var top = items.slice().sort(function (a, b) { return b.value - a.value; })[0];
      var topPct = (top.value / total * 100).toFixed(1);
      var risk = topPct > 50 ? (lang() === 'ru' ? 'Высокий риск (одна монета >50%)' : 'High risk (one coin >50%)') : topPct > 35 ? (lang() === 'ru' ? 'Умеренный риск' : 'Moderate risk') : (lang() === 'ru' ? 'Низкий риск концентрации' : 'Low concentration risk');
      var advice = items.length < 3 ? (lang() === 'ru' ? 'Рекомендуется добавить 2–3 монеты.' : 'Add 2–3 more coins.') : topPct > 60 ? (lang() === 'ru' ? 'Слишком большой вес ' + top.sym + '.' : 'Too heavy on ' + top.sym + '.') : (lang() === 'ru' ? 'Портфель выглядит сбалансированным.' : 'Portfolio looks balanced.');
      analysis.innerHTML = '<b>' + (lang() === 'ru' ? 'Анализ портфеля' : 'Portfolio analysis') + '</b><br>HHI: ' + hhi + ' → ' + conc + '<br>' + (lang() === 'ru' ? 'Крупнейшая позиция' : 'Largest') + ': ' + top.sym + ' (' + topPct + '%)<br>' + risk + '<br>' + advice;
    }
  }

  function showPage(p) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('on'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === p); });
    var page = document.getElementById('p-' + p); if (page) page.classList.add('on');
    if (p === 'home') setTimeout(function () { renderWatch(); renderTrends(); }, 40);
    if (p === 'port') setTimeout(renderPort, 40);
    if (p === 'tools') setTimeout(function () { setupConverter(); wireTools(); buildGas(); }, 40);
    if (p === 'news') setTimeout(function () { loadNews(true); }, 40);
  }

  async function softRefresh() { await ensure(); await renderWatch(); await renderTrends(); await renderPort(); loadMeta(); }
  async function loadMeta() {
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/global').then(function (r) { return r.json(); });
      var g = d && d.data; if (!g) return;
      if ($('mcapChip') && g.total_market_cap) $('mcapChip').textContent = 'Cap: ' + money(toCur(g.total_market_cap.usd));
      if ($('domChip') && g.market_cap_percentage) $('domChip').textContent = 'BTC: ' + g.market_cap_percentage.btc.toFixed(1) + '%';
      if ($('ethDomChip') && g.market_cap_percentage) $('ethDomChip').textContent = 'ETH: ' + g.market_cap_percentage.eth.toFixed(1) + '%';
    } catch (e) {}
  }

  function setupConverter() {
    var from = $('convFrom'), to = $('convTo'); if (!from || !to) return;
    var opts = Object.keys(COINS).map(function (id) { return '<option value="' + id + '">' + COINS[id].sym + '</option>'; }).join('') + '<option value="usd">USD</option>';
    if (!from.options.length) { from.innerHTML = opts; to.innerHTML = opts; to.value = 'usd'; }
    function calc() {
      var amt = parseFloat(($('convAmt') || {}).value) || 0;
      var f = from.value, t = to.value;
      var pf = f === 'usd' ? 1 : gp(f); var pt = t === 'usd' ? 1 : gp(t);
      if (!pf || !pt) { if ($('convOut')) $('convOut').textContent = '\u2014'; return; }
      var res = amt * pf / pt;
      if ($('convOut')) $('convOut').textContent = t === 'usd' ? money(toCur(res)) : res.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + (COINS[t] ? COINS[t].sym : t);
    }
    ['convAmt', 'convFrom', 'convTo'].forEach(function (id) { var el = $(id); if (el) { el.oninput = calc; el.onchange = calc; } });
    calc();
  }

  async function buildGas() {
    var box = $('gasBox'); if (!box) return;
    box.innerHTML = '<div class="muted">...</div>';
    var rows = [];
    try {
      var eth = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      var r = eth.result || {};
      if (r.SafeGasPrice) rows.push({ name: 'Ethereum', safe: r.SafeGasPrice, propose: r.ProposeGasPrice, fast: r.FastGasPrice, unit: 'gwei' });
    } catch (e) {}
    try {
      var rpc = await fetch('https://ethereum.publicnode.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }) }).then(function (r) { return r.json(); });
      if (rpc.result && !rows.length) {
        var gwei = (parseInt(rpc.result, 16) / 1e9).toFixed(2);
        rows.push({ name: 'Ethereum', safe: gwei, propose: gwei, fast: gwei, unit: 'gwei' });
      }
    } catch (e) {}
    if (!rows.length) { box.innerHTML = '<div class="muted">' + (lang() === 'ru' ? 'Не удалось загрузить' : 'Failed') + '</div>'; return; }
    box.innerHTML = rows.map(function (r) {
      return '<div class="hold-row"><span><b>' + r.name + '</b></span><span>S:' + r.safe + ' P:' + r.propose + ' F:' + r.fast + ' ' + r.unit + '</span></div>';
    }).join('');
  }

  function wireTools() {
    var opts = Object.keys(COINS).map(function (id) { return '<option value="' + id + '">' + COINS[id].sym + ' - ' + COINS[id].name + '</option>'; }).join('');
    if ($('dcaCoin') && !$('dcaCoin').options.length) $('dcaCoin').innerHTML = opts;
    if ($('stakeCoin') && !$('stakeCoin').options.length) {
      $('stakeCoin').innerHTML = opts;
      $('stakeCoin').onchange = function () { var c = COINS[$('stakeCoin').value]; if (c && $('stakeApy')) $('stakeApy').value = c.apy || 5; stakeCalc(); };
    }
    if ($('mhCoinSel') && !$('mhCoinSel').options.length) {
      $('mhCoinSel').innerHTML = opts;
      $('mhCoinSel').onchange = function () { if ($('mhCoin')) $('mhCoin').value = $('mhCoinSel').value; };
    }
    function dca() {
      var monthly = parseFloat(($('dcaAmt') || {}).value) || 0, months = parseInt(($('dcaMonths') || {}).value, 10) || 0, growth = (parseFloat(($('dcaGrowth') || {}).value) || 0) / 100, r = growth / 12, total = 0;
      for (var i = 0; i < months; i++) total = (total + monthly) * (1 + r);
      if ($('dcaOut')) $('dcaOut').textContent = money(toCur(total)) + ' (invested ' + money(toCur(monthly * months)) + ')';
    }
    function stakeCalc() {
      var amt = parseFloat(($('stakeAmt') || {}).value) || 0, apy = parseFloat(($('stakeApy') || {}).value) || 0;
      if ($('stakeOut')) $('stakeOut').textContent = money(toCur(amt * (1 + apy / 100))) + ' / year (+' + money(toCur(amt * apy / 100)) + ')';
    }
    function tp() {
      var a = parseFloat(($('tpInv') || {}).value) || 0, p = parseFloat(($('tpPct') || {}).value) || 0;
      if ($('tpOut')) $('tpOut').textContent = a ? money(toCur(a * (1 + p / 100))) : '\u2014';
    }
    ['dcaAmt', 'dcaMonths', 'dcaGrowth', 'dcaCoin'].forEach(function (id) { var el = $(id); if (el) { el.oninput = dca; el.onchange = dca; } });
    ['stakeAmt', 'stakeApy', 'stakeCoin'].forEach(function (id) { var el = $(id); if (el) { el.oninput = stakeCalc; el.onchange = stakeCalc; } });
    if ($('tpInv')) $('tpInv').oninput = tp; if ($('tpPct')) $('tpPct').oninput = tp;
    dca(); stakeCalc(); tp();
    if ($('mhAdd')) {
      $('mhAdd').onclick = function (e) {
        e.preventDefault();
        var id = ($('mhCoinSel') && $('mhCoinSel').value) || ($('mhCoin') || {}).value;
        var qty = parseFloat(($('mhQty') || {}).value); var buy = parseFloat(($('mhBuy') || {}).value) || 0;
        if (!id || !qty || qty <= 0) { toast(lang() === 'ru' ? 'Выберите монету' : 'Pick coin'); return; }
        var h = getHold(); h.push({ id: id, qty: qty, buy: buy }); setHold(h);
        if ($('mhQty')) $('mhQty').value = ''; if ($('mhBuy')) $('mhBuy').value = '';
        toast(lang() === 'ru' ? 'Добавлено' : 'Added'); renderPort();
      };
    }
  }

  var newsCache = { at: 0, items: [] }, newsFilter = 'all';
  async function loadNews(force) {
    var box = $('newsList'); if (!box) return;
    if (!force && newsCache.items.length && Date.now() - newsCache.at < 3e4) { paintNews(newsCache.items); return; }
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
    var box = $('newsList'); if (!box) return;
    var f = items;
    if (newsFilter && newsFilter !== 'all') {
      var keys = {
        bitcoin: /bitcoin|btc|\bbit\b/i,
        ethereum: /ethereum|eth\b|ether/i,
        solana: /solana|\bsol\b/i,
        xrp: /\bxrp\b|ripple/i,
        market: /market|crypto|bitcoin|ethereum|solana|xrp|etf|fed|inflation/i
      };
      var re = keys[newsFilter] || new RegExp(newsFilter, 'i');
      f = items.filter(function (n) { return re.test(n.title); });
    }
    box.innerHTML = f.map(function (n) {
      var d = '';
      try { d = new Date(n.date).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>';
    }).join('') || '<div class="empty">\u2014</div>';
  }

  async function loadCoinNews(id) {
    var box = $('coinNews'); if (!box) return;
    var name = (COINS[id] || {}).name || id;
    box.innerHTML = '<div class="news-head">' + (lang() === 'ru' ? 'Новости по ' : 'News for ') + name + '</div><div class="muted">...</div>';
    try {
      if (!newsCache.items.length) await loadNews(true);
      var re = new RegExp(name.split(' ')[0] + '|' + (COINS[id] || {}).sym, 'i');
      var f = newsCache.items.filter(function (n) { return re.test(n.title); }).slice(0, 5);
      box.innerHTML = '<div class="news-head">' + (lang() === 'ru' ? 'Новости по ' : 'News for ') + name + '</div>' +
        (f.map(function (n) { return '<div class="news-item"><a href="' + n.link + '" target="_blank">' + n.title + '</a></div>'; }).join('') || '<div class="muted">No recent news</div>');
    } catch (e) {}
  }

  function aiSummary(id) {
    var box = $('aiBox'); if (!box) return;
    var ch = gc(id) || 0; var txt;
    if (ch > 5) txt = lang() === 'ru' ? 'Сильный рост (+' + ch.toFixed(1) + '%). Высокий интерес покупателей.' : 'Strong rally (+' + ch.toFixed(1) + '%).';
    else if (ch > 1) txt = lang() === 'ru' ? 'Умеренный рост. Позитивный фон.' : 'Moderate growth.';
    else if (ch < -5) txt = lang() === 'ru' ? 'Сильное давление продавцов (' + ch.toFixed(1) + '%).' : 'Heavy selling (' + ch.toFixed(1) + '%).';
    else if (ch < -1) txt = lang() === 'ru' ? 'Небольшой откат. Возможен боковик.' : 'Slight pullback. Sideways possible.';
    else txt = lang() === 'ru' ? 'Боковик. Ждём импульса.' : 'Sideways. Waiting for a catalyst.';
    box.style.display = 'block'; box.innerHTML = '<b>AI:</b> ' + txt;
  }

  function setupSearch() {
    var q = $('q'), sr = $('sr'); if (!q || !sr) return;
    q.oninput = function () {
      var v = (q.value || '').trim().toLowerCase();
      if (v.length < 1) { sr.style.display = 'none'; return; }
      var hits = Object.keys(COINS).filter(function (id) {
        var c = COINS[id]; return c.sym.toLowerCase().indexOf(v) >= 0 || c.name.toLowerCase().indexOf(v) >= 0 || id.indexOf(v) >= 0;
      }).slice(0, 8);
      if (!hits.length) { sr.style.display = 'none'; return; }
      sr.style.display = 'block';
      sr.innerHTML = hits.map(function (id) {
        return '<div class="sr-item" data-id="' + id + '"><img class="cicon" src="' + coinImg(id) + '" width="20" height="20" onerror="this.style.display=\'none\'"/><b>' + COINS[id].sym + '</b> <span class="muted">' + COINS[id].name + '</span></div>';
      }).join('');
      sr.querySelectorAll('.sr-item').forEach(function (el) {
        el.onclick = function () { q.value = ''; sr.style.display = 'none'; openDetail(el.getAttribute('data-id')); };
      });
    };
    document.addEventListener('click', function (e) { if (!q.contains(e.target) && !sr.contains(e.target)) sr.style.display = 'none'; });
  }

  var HELP = {
    dca: { ru: 'DCA — регулярные покупки на фиксированную сумму. Снижает риск входа на пике.', en: 'DCA — regular fixed-amount purchases. Reduces timing risk.' },
    staking: { ru: 'Стейкинг — блокировка монет для дохода (APY). Риски: слэшинг, lock-up.', en: 'Staking — locking coins for yield (APY). Risks: slashing, lock-up.' },
    port: { ru: 'Ручной портфель — добавляйте позиции с количеством и ценой покупки для P&L.', en: 'Manual portfolio — add holdings with qty and buy price for P&L.' },
    wallet: { ru: 'Вставьте адрес кошелька (ETH/BSC/SOL/TON/BTC) чтобы увидеть баланс.', en: 'Paste wallet address to see balance and value.' },
    mcap: { ru: 'Market Cap — общая капитализация. BTC Dominance — доля Bitcoin.', en: 'Market Cap — total market. BTC Dominance — Bitcoin share.' }
  };
  function openHelp(key) {
    var h = HELP[key] || { ru: 'Подсказка', en: 'Help' };
    if ($('helpTitle')) $('helpTitle').textContent = key.toUpperCase();
    if ($('helpBody')) $('helpBody').textContent = lang() === 'ru' ? h.ru : h.en;
    if ($('helpModal')) $('helpModal').style.display = 'flex';
  }

  function applyLang() {
    var L = lang();
    var map = { nav_home: L==='ru'?'Главная':'Home', nav_port: L==='ru'?'Портфель':'Portfolio', nav_wallet: L==='ru'?'Кошелёк':'Wallet', nav_news: L==='ru'?'Новости':'News', nav_tools: L==='ru'?'Инструменты':'Tools', watchlist: L==='ru'?'Список':'Watchlist', th_coin: L==='ru'?'Монета':'Coin', th_price: L==='ru'?'Цена':'Price', trending_up: L==='ru'?'Рост':'Gainers', trending_down: L==='ru'?'Падение':'Losers', manual_port: L==='ru'?'Ручной портфель':'Manual portfolio', port_hint: L==='ru'?'Выберите монету → количество → Добавить':'Select coin → qty → Add', lbl_coin: L==='ru'?'Монета':'Coin', lbl_qty: L==='ru'?'Кол-во':'Qty', lbl_buy: L==='ru'?'Цена покупки':'Buy price', btn_add: L==='ru'?'+ Добавить':'+ Add', total: L==='ru'?'Итого':'Total', man_addr: L==='ru'?'Адрес кошелька':'Wallet address', wallet_hint: L==='ru'?'Вставьте адрес — баланс и стоимость':'Paste address — balance & value', chain: L==='ru'?'Сеть':'Chain', address: L==='ru'?'Адрес':'Address', show_bal: L==='ru'?'Показать аналитику':'Show analytics', news: L==='ru'?'Новости':'News', converter: L==='ru'?'Конвертер':'Converter', amount: L==='ru'?'Сумма':'Amount', from: L==='ru'?'Из':'From', to: L==='ru'?'В':'To', months: L==='ru'?'Месяцы':'Months', growth: L==='ru'?'Рост %/год':'Growth %/yr', staking: L==='ru'?'Стейкинг':'Staking', profit_t: L==='ru'?'Цель прибыли':'Profit target', invested: L==='ru'?'Вложено':'Invested', target_pct: L==='ru'?'Цель %':'Target %', gas: 'Gas' };
    document.querySelectorAll('[data-i18n]').forEach(function (el) { var k = el.getAttribute('data-i18n'); if (map[k]) el.textContent = map[k]; });
    var tb = $('themeBtn'); if (tb) tb.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? (L === 'ru' ? 'Тёмная' : 'Dark') : (L === 'ru' ? 'Светлая' : 'Light');
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
      document.querySelectorAll('.nav-btn').forEach(function (b) { b.onclick = function () { showPage(b.getAttribute('data-p')); }; });
      document.querySelectorAll('#chartTabs .tab').forEach(function (t) {
        t.onclick = function () {
          document.querySelectorAll('#chartTabs .tab').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          if (currentChartId) openDetail(currentChartId);
        };
      });
      document.querySelectorAll('.help-btn').forEach(function (b) {
        b.onclick = function (e) { e.preventDefault(); openHelp(b.getAttribute('data-help')); };
      });
      if ($('helpClose')) $('helpClose').onclick = function () { $('helpModal').style.display = 'none'; };
      if ($('helpModal')) $('helpModal').onclick = function (e) { if (e.target === $('helpModal')) $('helpModal').style.display = 'none'; };
      if ($('refBtn')) $('refBtn').onclick = function () { softRefresh(); loadNews(true); toast(lang() === 'ru' ? 'Обновлено' : 'Refreshed'); };
      if ($('addTop')) $('addTop').onclick = function () { localStorage.setItem('ct_wl', JSON.stringify(DEFAULTS.slice())); renderWatch(); };
      if ($('manBtn')) $('manBtn').onclick = function (e) { e.preventDefault(); analyzeWallet(); };
      if ($('mcapChip')) $('mcapChip').onclick = function () { openHelp('mcap'); };
      if ($('domChip')) $('domChip').onclick = function () { openHelp('mcap'); };
      var curSel = $('curSel'); if (curSel) { curSel.value = cur(); curSel.onchange = function () { localStorage.setItem('ct_cur', curSel.value); softRefresh(); }; }
      var langSel = $('langSel'); if (langSel) { langSel.value = lang(); langSel.onchange = function () { localStorage.setItem('ct_lang', langSel.value); applyLang(); softRefresh(); }; }
      var newsTabs = $('newsTabs');
      if (newsTabs) newsTabs.onclick = function (e) {
        var tab = e.target.closest('.tab'); if (!tab) return;
        newsTabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        tab.classList.add('on');
        newsFilter = tab.getAttribute('data-f') || 'all';
        paintNews(newsCache.items);
      };
      applyLang(); setupSearch(); setupConverter(); wireTools(); buildGas();
      softRefresh(); loadNews(true);
      setTimeout(softRefresh, 1500); setTimeout(softRefresh, 4000);
    } catch (e) { console.error(e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(); });
  else boot();
  setInterval(softRefresh, 8000);
  setInterval(function () { loadNews(true); }, 45000);
})();
