/* Crypto Tracker Core v9.0 - Fixed & Enhanced */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    var s = $('langSel');
    return (s && s.value) || localStorage.getItem('ct_lang') || 'ru';
  }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function toast(m, ms) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t);
    e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 2200);
  }

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
  var fx = { usd: 1, eur: 0.92, pln: 3.85, rub: 90 };
  var fxT = 0;
  var wlBusy = false;
  var chartData = [];
  var searchTimer = null;

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
    var s = (v >= 0 ? '+' : '') + (+v).toFixed(2) + '%';
    return '<span class="' + (v >= 0 ? 'up' : 'down') + '">' + s + '</span>';
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
    } catch (e) { console.warn('fx', e); }
  }

  async function fetchBinancePrices() {
    try {
      var d = await fetch('https://api.binance.us/api/v3/ticker/24hr').then(function (r) {
        if (!r.ok) throw new Error('binance');
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
        prices.toncoin = { usd: d.toncoin.usd, ch: d.toncoin.usd_24h_change || 0, t: Date.now() };
      }
    } catch (e) {}
  }

  async function ensurePrices(ids) {
    await loadFx();
    var need = !Object.keys(prices).length;
    (ids || []).forEach(function (id) {
      var p = prices[id];
      if (!p || Date.now() - (p.t || 0) > 20000) need = true;
    });
    if (need) {
      await fetchBinancePrices();
      await fetchTonPrice();
    }
  }

  function getPrice(id) { return prices[id] ? prices[id].usd : null; }
  function getCh(id) { return prices[id] ? prices[id].ch : null; }

  function getList() {
    try {
      var a = JSON.parse(localStorage.getItem('ct_wl') || 'null');
      if (Array.isArray(a) && a.length) return a;
    } catch (e) {}
    return DEFAULTS.slice();
  }
  function setList(a) { localStorage.setItem('ct_wl', JSON.stringify(a)); }

  /* ===== SEARCH ===== */
  async function doSearch(q) {
    var box = $('sr'); if (!box) return;
    if (!q || q.length < 2) { box.style.display = 'none'; return; }
    box.innerHTML = '<div class="sr-item muted">\u2026</div>';
    box.style.display = 'block';
    try {
      var res = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(q)).then(r => r.json());
      var coins = (res.coins || []).slice(0, 8);
      if (!coins.length) { box.innerHTML = '<div class="sr-item muted">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>'; return; }
      box.innerHTML = coins.map(function (c) {
        return '<div class="sr-item" data-id="' + c.id + '" data-sym="' + (c.symbol || '').toUpperCase() + '">' +
          (c.thumb ? '<img src="' + c.thumb + '" alt=""/>' : '') +
          '<div><b>' + (c.symbol || '').toUpperCase() + '</b> <span class="muted">' + (c.name || '') + '</span></div></div>';
      }).join('');
      box.querySelectorAll('.sr-item[data-id]').forEach(function (el) {
        el.onclick = function () {
          var id = el.getAttribute('data-id');
          var list = getList();
          if (list.indexOf(id) < 0) list.push(id);
          setList(list);
          box.style.display = 'none';
          if ($('q')) $('q').value = '';
          toast(lang() === 'ru' ? '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e \u0432 \u0441\u043f\u0438\u0441\u043e\u043a' : 'Added to watchlist');
          renderWatch();
        };
      });
    } catch (e) {
      box.innerHTML = '<div class="sr-item muted">\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u043e\u0438\u0441\u043a\u0430</div>';
    }
  }

  var qInput = $('q');
  if (qInput) {
    qInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { doSearch(qInput.value.trim()); }, 350);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-wrap')) {
        var b = $('sr'); if (b) b.style.display = 'none';
      }
    });
  }

  /* Portfolio search */
  var mhQ = $('mhQ'), mhSr = $('mhSr');
  if (mhQ && mhSr) {
    mhQ.addEventListener('input', function () {
      var v = mhQ.value.trim();
      if (v.length < 2) { mhSr.style.display = 'none'; return; }
      fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(v))
        .then(r => r.json())
        .then(function (res) {
          var coins = (res.coins || []).slice(0, 6);
          mhSr.innerHTML = coins.map(function (c) {
            return '<div class="sr-item" data-id="' + c.id + '" data-sym="' + (c.symbol || '').toUpperCase() + '">' +
              (c.symbol || '').toUpperCase() + ' \u00b7 ' + (c.name || '') + '</div>';
          }).join('') || '<div class="sr-item muted">\u2014</div>';
          mhSr.style.display = 'block';
          mhSr.querySelectorAll('.sr-item[data-id]').forEach(function (el) {
            el.onclick = function () {
              if ($('mhCoin')) $('mhCoin').value = el.getAttribute('data-id');
              mhQ.value = el.getAttribute('data-sym') || '';
              if ($('mhPicked')) $('mhPicked').textContent = el.textContent;
              mhSr.style.display = 'none';
            };
          });
        }).catch(function () { mhSr.style.display = 'none'; });
    });
  }

  async function renderWatch() {
    var body = $('wBody'); if (!body || wlBusy) return;
    wlBusy = true;
    body.innerHTML = '<tr><td colspan="5" class="empty">' + (lang() === 'ru' ? '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026' : 'Loading\u2026') + '</td></tr>';
    try {
      var list = getList();
      await ensurePrices(list);
      body.innerHTML = list.map(function (id, i) {
        var c = COINS[id] || { sym: id.slice(0,4).toUpperCase(), name: id, color: '#a855f7' };
        var p = getPrice(id);
        var ch = getCh(id);
        return '<tr data-id="' + id + '" style="cursor:pointer">' +
          '<td>' + (i + 1) + '</td>' +
          '<td><div class="coin-cell"><span style="width:10px;height:10px;border-radius:50%;background:' + (c.color||'#a855f7') + ';display:inline-block"></span> <b>' + c.sym + '</b></div></td>' +
          '<td>' + money(toCur(p)) + '</td>' +
          '<td>' + pct(ch) + '</td>' +
          '<td><button type="button" class="btn-ghost wl-rm" data-id="' + id + '" style="font-size:.7rem;padding:.15rem .35rem">\u00d7</button></td></tr>';
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
          var id = btn.getAttribute('data-id');
          setList(getList().filter(function (x) { return x !== id; }));
          renderWatch();
        };
      });
    } catch (e) {
      body.innerHTML = '<tr><td colspan="5" class="empty">Error</td></tr>';
    }
    wlBusy = false;
  }

  function openDetail(id) {
    var det = $('detail'); if (!det) return;
    det.style.display = 'block';
    var c = COINS[id] || { sym: id, name: id };
    var p = getPrice(id);
    var ch = getCh(id);
    if ($('dName')) $('dName').textContent = c.name || id;
    if ($('dSym')) $('dSym').textContent = c.sym || id;
    if ($('dPrice')) $('dPrice').textContent = money(toCur(p));
    if ($('dCh')) $('dCh').innerHTML = pct(ch);
    if ($('dImg')) $('dImg').style.display = 'none';
    loadChart(id, c);
    var ex = $('ex');
    if (ex) {
      var s = (c.sym || '').toUpperCase();
      ex.innerHTML = ['Binance','Bybit','OKX','CoinGecko'].map(function (n) {
        var url = n === 'CoinGecko' ? 'https://www.coingecko.com/en/coins/' + id :
          'https://www.google.com/search?q=' + encodeURIComponent(n + ' ' + s + ' USDT');
        return '<a href="' + url + '" target="_blank" rel="noopener">' + n + '</a>';
      }).join('');
    }
    det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function loadChart(id, meta) {
    var box = $('tv'); if (!box) return;
    box.innerHTML =
      '<canvas id="cgChart" width="360" height="280" style="width:100%;height:280px;display:block;touch-action:none"></canvas>' +
      '<div id="chartTip" class="muted" style="margin-top:.35rem;font-size:.75rem">' +
      (lang() === 'ru' ? '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043d\u0430 \u0433\u0440\u0430\u0444\u0438\u043a' : 'Tap chart for price') + '</div>';
    chartData = [];
    try {
      if (meta && meta.pair) {
        var k = await fetch('https://api.binance.us/api/v3/klines?symbol=' + meta.pair + '&interval=1h&limit=168').then(function (r) { return r.json(); });
        if (Array.isArray(k) && k.length) {
          chartData = k.map(function (row) { return { t: row[0], v: parseFloat(row[4]) }; });
        }
      }
    } catch (e) {}
    if (!chartData.length) {
      try {
        var cg = await fetch('https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=usd&days=7').then(function (r) { return r.json(); });
        if (cg && cg.prices) {
          chartData = cg.prices.map(function (p) { return { t: p[0], v: p[1] }; });
        }
      } catch (e) {}
    }
    if (!chartData.length) {
      var tip = $('chartTip');
      if (tip) tip.textContent = lang() === 'ru' ? '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445' : 'No chart data';
      return;
    }
    drawChart(null);
    bindChart();
  }

  function drawChart(hi) {
    var canvas = $('cgChart'); if (!canvas || !chartData.length) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height, pad = 16;
    ctx.clearRect(0, 0, w, h);
    var vals = chartData.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var range = max - min || 1;
    var up = chartData[chartData.length - 1].v >= chartData[0].v;
    ctx.strokeStyle = up ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    chartData.forEach(function (p, i) {
      var x = pad + (w - 2 * pad) * i / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / range) * (h - 2 * pad);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (hi != null && chartData[hi]) {
      var p = chartData[hi];
      var x = pad + (w - 2 * pad) * hi / Math.max(1, chartData.length - 1);
      var y = h - pad - ((p.v - min) / range) * (h - 2 * pad);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7'; ctx.fill();
      var tip = $('chartTip');
      if (tip) tip.textContent = new Date(p.t).toLocaleString() + ' \u00b7 ' + money(toCur(p.v));
    }
  }

  function bindChart() {
    var canvas = $('cgChart'); if (!canvas) return;
    function idx(ev) {
      var rect = canvas.getBoundingClientRect();
      var clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      var rel = (clientX - rect.left) / rect.width;
      return Math.max(0, Math.min(chartData.length - 1, Math.round(rel * (chartData.length - 1))));
    }
    function move(ev) { ev.preventDefault(); drawChart(idx(ev)); }
    canvas.onclick = function (ev) { drawChart(idx(ev)); };
    canvas.ontouchstart = move;
    canvas.ontouchmove = move;
  }

  async function renderTrends() {
    var box = $('trends'); if (!box) return;
    await ensurePrices(Object.keys(COINS));
    var list = Object.keys(COINS).filter(function (id) { return prices[id]; })
      .sort(function (a, b) { return Math.abs(getCh(b) || 0) - Math.abs(getCh(a) || 0); }).slice(0, 8);
    box.innerHTML = list.map(function (id) {
      var c = COINS[id];
      return '<button type="button" class="tab trend-row" data-id="' + id + '" style="margin:.15rem">' +
        c.sym + ' ' + pct(getCh(id)) + '</button>';
    }).join('') || '\u2014';
    box.querySelectorAll('.trend-row').forEach(function (row) {
      row.onclick = function () { openDetail(row.getAttribute('data-id')); };
    });
  }

  function getHold() {
    try { return JSON.parse(localStorage.getItem('ct_mh') || '[]') || []; } catch (e) { return []; }
  }
  function setHold(a) { localStorage.setItem('ct_mh', JSON.stringify(a)); }

  async function renderPort() {
    var box = $('mhList'); if (!box) return;
    var hold = getHold();
    if (!hold.length) {
      box.innerHTML = '<div class="empty">' + (lang() === 'ru' ? '\u041f\u0443\u0441\u0442\u043e' : 'Empty') + '</div>';
      if ($('mhTotal')) $('mhTotal').style.display = 'none';
      if ($('portChartWrap')) $('portChartWrap').style.display = 'none';
      return;
    }
    var ids = [];
    hold.forEach(function (h) { if (ids.indexOf(h.id) < 0) ids.push(h.id); });
    await ensurePrices(ids);
    var totalVal = 0, totalCost = 0, byCoin = {};
    box.innerHTML = hold.map(function (h, i) {
      var c = COINS[h.id] || { sym: h.id, color: '#a855f7' };
      var p = getPrice(h.id);
      var val = p != null ? p * h.qty : null;
      var pnl = (p != null && h.buy > 0) ? val - h.buy * h.qty : null;
      if (val != null) totalVal += val;
      if (h.buy > 0) totalCost += h.buy * h.qty;
      if (!byCoin[h.id]) byCoin[h.id] = { sym: c.sym, val: 0, color: c.color };
      if (val != null) byCoin[h.id].val += val;
      return '<div class="hold-row"><div><b>' + c.sym + '</b><div class="muted">' + h.qty +
        (p != null ? ' \u00b7 ' + money(toCur(p)) : '') +
        (h.buy > 0 ? ' \u00b7 buy ' + money(toCur(h.buy)) : '') +
        '</div></div><div style="text-align:right">' +
        (val != null ? '<b>' + money(toCur(val)) + '</b>' : '<span class="muted">\u2026</span>') +
        (pnl != null ? '<div class="' + (pnl >= 0 ? 'up' : 'down') + '">' + (pnl >= 0 ? '+' : '') + money(toCur(pnl)) + '</div>' : '') +
        '<button type="button" class="btn-ghost mh-rm" data-i="' + i + '" style="font-size:.7rem;padding:.1rem .3rem">\u00d7</button></div></div>';
    }).join('');
    if ($('mhTotal')) {
      $('mhTotal').style.display = 'block';
      if ($('mhVal')) $('mhVal').textContent = totalVal > 0 ? money(toCur(totalVal)) : '\u2014';
      var pe = $('mhPnl');
      if (pe) {
        if (totalCost > 0 && totalVal > 0) {
          var pr = totalVal - totalCost;
          pe.textContent = (pr >= 0 ? '+' : '') + money(toCur(pr)) + ' (' + ((pr / totalCost) * 100).toFixed(2) + '%)';
          pe.className = pr >= 0 ? 'up' : 'down';
        } else { pe.textContent = ''; pe.className = 'muted'; }
      }
    }
    var canvas = $('portChart'), wrap = $('portChartWrap'), leg = $('portLegend');
    var slices = Object.keys(byCoin).map(function (k) { return byCoin[k]; }).filter(function (s) { return s.val > 0; });
    if (canvas && wrap && totalVal > 0 && slices.length) {
      wrap.style.display = 'block';
      var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
      var cx = w / 2, cy = h / 2 - 4, R = Math.min(w, h) / 2 - 18;
      ctx.clearRect(0, 0, w, h);
      var start = -Math.PI / 2;
      var fb = ['#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
      slices.forEach(function (s, i) {
        var ang = (s.val / totalVal) * Math.PI * 2;
        var col = s.color || fb[i % fb.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, start + ang); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        start += ang; s._c = col;
      });
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#120e1f';
      ctx.fill();
      if (leg) leg.innerHTML = slices.map(function (s) {
        return '<span style="display:inline-flex;align-items:center;gap:.25rem;margin:.1rem .3rem;font-size:.7rem"><span style="width:8px;height:8px;border-radius:50%;background:' + s._c + ';display:inline-block"></span>' + s.sym + ' ' + ((s.val / totalVal) * 100).toFixed(0) + '%</span>';
      }).join('');
    } else if (wrap) wrap.style.display = 'none';
  }

  function showPage(p) {
    document.querySelectorAll('.page').forEach(function (el) { el.classList.remove('on'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-p') === p);
    });
    var page = document.getElementById('p-' + p);
    if (page) page.classList.add('on');
    if (p === 'home') setTimeout(function () { renderWatch(); renderTrends(); }, 30);
    if (p === 'port') setTimeout(renderPort, 30);
    if (p === 'tools') setTimeout(function () { buildGas(); setupConverter(); wireTools(); }, 30);
    if (p === 'news') setTimeout(loadNews, 30);
    if (p === 'wallet') setTimeout(loadSavedWallets, 30);
  }

  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () { showPage(b.getAttribute('data-p')); });
  });

  var curSel = $('curSel');
  if (curSel) {
    curSel.value = cur();
    curSel.addEventListener('change', function () {
      localStorage.setItem('ct_cur', curSel.value);
      softRefresh();
    });
  }

  (function buildChips() {
    var box = $('mhChips'); if (!box) return;
    var ids = ['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','toncoin','tron','avalanche-2','chainlink','polkadot','matic-network','litecoin','shiba-inu','pepe'];
    box.innerHTML = ids.map(function (id) {
      var c = COINS[id]; if (!c) return '';
      return '<button type="button" class="tab mh-chip" data-id="' + id + '" data-sym="' + c.sym + '">' + c.sym + '</button>';
    }).join('');
  })();

  document.querySelectorAll('.mh-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var id = chip.getAttribute('data-id');
      var sym = chip.getAttribute('data-sym');
      if ($('mhCoin')) $('mhCoin').value = id;
      if ($('mhQ')) $('mhQ').value = sym || '';
      if ($('mhPicked')) $('mhPicked').textContent = (COINS[id] ? COINS[id].name : id) + ' (' + (sym || '') + ')';
      document.querySelectorAll('.mh-chip').forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
    });
  });

  var mhAdd = $('mhAdd');
  if (mhAdd) {
    mhAdd.addEventListener('click', function (e) {
      e.preventDefault();
      var id = ($('mhCoin') || {}).value;
      var qty = parseFloat(($('mhQty') || {}).value);
      var buy = parseFloat(($('mhBuy') || {}).value) || 0;
      if (!id || !qty || qty <= 0) {
        toast(lang() === 'ru' ? '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u0443 \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e' : 'Pick coin and quantity');
        return;
      }
      var hold = getHold();
      hold.push({ id: id, qty: qty, buy: buy });
      setHold(hold);
      if ($('mhQty')) $('mhQty').value = '';
      if ($('mhBuy')) $('mhBuy').value = '';
      toast(lang() === 'ru' ? '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e' : 'Added');
      renderPort();
    });
  }

  var mhList = $('mhList');
  if (mhList) {
    mhList.addEventListener('click', function (e) {
      var btn = e.target.closest('.mh-rm'); if (!btn) return;
      e.stopPropagation();
      var i = parseInt(btn.getAttribute('data-i'), 10);
      var hold = getHold();
      if (i >= 0 && i < hold.length) hold.splice(i, 1);
      setHold(hold); renderPort();
    });
  }

  async function softRefresh() {
    try {
      await ensurePrices(getList().concat(Object.keys(COINS)));
      await renderWatch();
      await renderTrends();
      await renderPort();
      try {
        var g = await fetch('https://api.coingecko.com/api/v3/global').then(r => r.json());
        if (g && g.data) {
          if ($('mcapChip')) $('mcapChip').textContent = 'Cap: ' + money(toCur(g.data.total_market_cap.usd / 1e12)) + 'T';
          if ($('domChip')) $('domChip').textContent = 'BTC: ' + (g.data.market_cap_percentage.btc || 0).toFixed(1) + '%';
        }
      } catch (e) {}
      try {
        var fg = await fetch('https://api.alternative.me/fng/').then(r => r.json());
        if (fg && fg.data && fg.data[0]) {
          if ($('fgChip')) $('fgChip').textContent = 'FG: ' + fg.data[0].value;
        }
      } catch (e) {}
    } catch (e) { console.warn(e); }
  }

  function setupConverter() {
    var from = $('convFrom'), to = $('convTo');
    if (!from || !to) return;
    var opts = DEFAULTS.map(function (id) {
      return '<option value="' + id + '">' + (COINS[id] ? COINS[id].sym : id) + '</option>';
    }).join('') + '<option value="usd">USD</option>';
    if (!from.options.length) { from.innerHTML = opts; to.innerHTML = opts; to.value = 'usd'; }
    function calc() {
      var amt = parseFloat(($('convAmt') || {}).value) || 0;
      var f = from.value, t = to.value;
      var pf = f === 'usd' ? 1 : getPrice(f);
      var pt = t === 'usd' ? 1 : getPrice(t);
      if (!pf || !pt) { if ($('convOut')) $('convOut').textContent = '\u2014'; return; }
      var result = amt * pf / pt;
      if ($('convOut')) $('convOut').textContent = t === 'usd' ? money(toCur(result)) : result.toLocaleString('en-US', { maximumFractionDigits: 8 }) + ' ' + (COINS[t] ? COINS[t].sym : t);
    }
    ['convAmt', 'convFrom', 'convTo'].forEach(function (id) {
      var el = $(id); if (el) { el.oninput = calc; el.onchange = calc; }
    });
    calc();
  }

  async function buildGas() {
    var box = $('gasBox'); if (!box) return;
    try {
      var eth = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle').then(function (r) { return r.json(); });
      var r = eth.result || {};
      box.innerHTML = '<div class="hold-row"><span>ETH Safe</span><b>' + (r.SafeGasPrice || '\u2014') + ' gwei</b></div>' +
        '<div class="hold-row"><span>ETH Propose</span><b>' + (r.ProposeGasPrice || '\u2014') + ' gwei</b></div>' +
        '<div class="hold-row"><span>ETH Fast</span><b>' + (r.FastGasPrice || '\u2014') + ' gwei</b></div>';
    } catch (e) {
      box.innerHTML = '<div class="muted">Gas data unavailable</div>';
    }
  }

  function wireTools() {
    var inv = $('tpInv'), pctEl = $('tpPct'), tpOut = $('tpOut');
    function tp() {
      if (!tpOut) return;
      var a = parseFloat(inv && inv.value) || 0;
      var p = parseFloat(pctEl && pctEl.value) || 0;
      tpOut.textContent = a ? money(toCur(a * (1 + p / 100))) : '\u2014';
    }
    if (inv) inv.oninput = tp; if (pctEl) pctEl.oninput = tp;
    var da = $('dcaAmt'), dm = $('dcaMonths'), dg = $('dcaGrowth'), dout = $('dcaOut');
    function dca() {
      if (!dout) return;
      var monthly = parseFloat(da && da.value) || 0;
      var months = parseInt(dm && dm.value, 10) || 0;
      var growth = (parseFloat(dg && dg.value) || 0) / 100;
      var r = growth / 12, total = 0;
      for (var i = 0; i < months; i++) total = (total + monthly) * (1 + r);
      dout.textContent = money(toCur(total)) + ' (invested ' + money(toCur(monthly * months)) + ')';
    }
    if (da) da.oninput = dca; if (dm) dm.oninput = dca; if (dg) dg.oninput = dca;
    if ($('domList')) {
      fetch('https://api.coingecko.com/api/v3/global').then(r => r.json()).then(function (g) {
        if (g && g.data && g.data.market_cap_percentage) {
          var pcts = g.data.market_cap_percentage;
          var html = ['btc','eth','usdt','bnb','sol'].map(function (k) {
            return '<div class="hold-row"><span>' + k.toUpperCase() + '</span><b>' + (pcts[k] || 0).toFixed(2) + '%</b></div>';
          }).join('');
          $('domList').innerHTML = html;
        }
      }).catch(function () {});
    }
  }

  /* Theme */
  var themeBtn = $('themeBtn');
  if (themeBtn) {
    var savedTheme = localStorage.getItem('ct_theme') || 'dark';
    if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    themeBtn.textContent = savedTheme === 'light' ? (lang() === 'ru' ? '\u0422\u0451\u043c\u043d\u0430\u044f' : 'Dark') : (lang() === 'ru' ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f' : 'Light');
    themeBtn.onclick = function () {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('ct_theme', 'dark');
        themeBtn.textContent = lang() === 'ru' ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f' : 'Light';
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('ct_theme', 'light');
        themeBtn.textContent = lang() === 'ru' ? '\u0422\u0451\u043c\u043d\u0430\u044f' : 'Dark';
      }
    };
  }

  /* News */
  var newsCache = { at: 0, items: [] };
  var newsFilter = 'all';
  async function loadNews() {
    var box = $('newsList'); if (!box) return;
    if (newsCache.items.length && Date.now() - newsCache.at < 120000) { paintNews(newsCache.items); return; }
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
            var title = String(it.title || '').trim(); if (!title) return;
            all.push({ title: title, link: it.link, date: it.pubDate, src: f.n, desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 140) });
          });
        } catch (e) {}
      }));
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      newsCache = { at: Date.now(), items: all.slice(0, 20) };
      paintNews(newsCache.items);
    } catch (e) { box.innerHTML = '<div class="empty">Error</div>'; }
  }
  function paintNews(items) {
    var box = $('newsList'); if (!box) return;
    var filtered = items;
    if (newsFilter && newsFilter !== 'all' && newsFilter !== 'market') {
      var re = new RegExp(newsFilter, 'i');
      filtered = items.filter(function (n) { return re.test(n.title) || re.test(n.desc || ''); });
    }
    box.innerHTML = filtered.map(function (n) {
      var d = '';
      try { d = new Date(n.date).toLocaleString(lang() === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
      return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a>' +
        '<div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>';
    }).join('') || '<div class="empty">\u2014</div>';
  }
  var newsTabs = $('newsTabs');
  if (newsTabs) {
    newsTabs.onclick = function (e) {
      var tab = e.target.closest('.tab'); if (!tab) return;
      newsTabs.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
      tab.classList.add('on');
      newsFilter = tab.getAttribute('data-f') || 'all';
      paintNews(newsCache.items);
    };
  }

  /* Wallet */
  var RPCS = {
    eth: 'https://ethereum.publicnode.com',
    bsc: 'https://bsc.publicnode.com',
    polygon: 'https://polygon-bor.publicnode.com',
    arb: 'https://arbitrum-one.publicnode.com',
    op: 'https://optimism.publicnode.com',
    base: 'https://base.publicnode.com'
  };
  var NATIVE = {
    eth: { id: 'ethereum', sym: 'ETH', dec: 18 },
    bsc: { id: 'binancecoin', sym: 'BNB', dec: 18 },
    polygon: { id: 'matic-network', sym: 'POL', dec: 18 },
    arb: { id: 'ethereum', sym: 'ETH', dec: 18 },
    op: { id: 'ethereum', sym: 'ETH', dec: 18 },
    base: { id: 'ethereum', sym: 'ETH', dec: 18 }
  };

  async function analyzeWallet() {
    var chain = ($('manChain') || {}).value || 'eth';
    var addr = (($('manAddr') || {}).value || '').trim();
    var box = $('manRes'); if (!box) return;
    if (!addr) { toast(lang() === 'ru' ? '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441' : 'Enter address'); return; }
    box.innerHTML = '<div class="muted">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026</div>';
    try {
      await ensurePrices([NATIVE[chain] ? NATIVE[chain].id : 'toncoin']);
      var html = '';
      if (chain === 'ton') {
        var ton = await fetch('https://tonapi.io/v2/accounts/' + encodeURIComponent(addr)).then(r => r.json());
        var bal = (ton.balance || 0) / 1e9;
        var price = getPrice('toncoin') || 0;
        html += '<div class="token-row"><div><b>TON</b></div><div>' + bal.toFixed(4) + ' \u2248 ' + money(toCur(bal * price)) + '</div></div>';
      } else if (chain === 'btc') {
        var btc = await fetch('https://blockstream.info/api/address/' + encodeURIComponent(addr)).then(r => r.json());
        var sat = (btc.chain_stats && btc.chain_stats.funded_txo_sum || 0) - (btc.chain_stats && btc.chain_stats.spent_txo_sum || 0);
        var btcBal = sat / 1e8;
        var price = getPrice('bitcoin') || 0;
        html += '<div class="token-row"><div><b>BTC</b></div><div>' + btcBal.toFixed(8) + ' \u2248 ' + money(toCur(btcBal * price)) + '</div></div>';
      } else if (chain === 'sol') {
        var sol = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] })
        }).then(r => r.json());
        var lamports = (sol.result && sol.result.value) || 0;
        var solBal = lamports / 1e9;
        var price = getPrice('solana') || 0;
        html += '<div class="token-row"><div><b>SOL</b></div><div>' + solBal.toFixed(4) + ' \u2248 ' + money(toCur(solBal * price)) + '</div></div>';
      } else if (RPCS[chain]) {
        var rpc = RPCS[chain];
        var balHex = await fetch(rpc, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
        }).then(r => r.json());
        var wei = BigInt(balHex.result || '0x0');
        var native = NATIVE[chain];
        var amount = Number(wei) / Math.pow(10, native.dec);
        var price = getPrice(native.id) || 0;
        html += '<div class="token-row"><div><b>' + native.sym + '</b></div><div>' + amount.toFixed(6) + ' \u2248 ' + money(toCur(amount * price)) + '</div></div>';
      }
      box.innerHTML = html || '<div class="muted">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445</div>';
      var saved = JSON.parse(localStorage.getItem('ct_wallets') || '[]');
      if (!saved.some(function (w) { return w.addr === addr && w.chain === chain; })) {
        saved.push({ chain: chain, addr: addr });
        localStorage.setItem('ct_wallets', JSON.stringify(saved.slice(-20)));
        loadSavedWallets();
      }
    } catch (e) {
      box.innerHTML = '<div class="empty">\u041e\u0448\u0438\u0431\u043a\u0430: ' + (e.message || e) + '</div>';
    }
  }
  if ($('manBtn')) $('manBtn').onclick = function (e) { e.preventDefault(); analyzeWallet(); };

  function loadSavedWallets() {
    var box = $('savedWallets'); if (!box) return;
    var saved = JSON.parse(localStorage.getItem('ct_wallets') || '[]');
    if (!saved.length) { box.innerHTML = '\u2014'; return; }
    box.innerHTML = saved.map(function (w, i) {
      return '<div class="token-row" style="cursor:pointer" data-i="' + i + '"><div>' + w.chain.toUpperCase() + '</div><div style="font-size:.75rem">' + w.addr.slice(0,8) + '\u2026' + w.addr.slice(-4) + '</div></div>';
    }).join('');
    box.querySelectorAll('[data-i]').forEach(function (el) {
      el.onclick = function () {
        var w = saved[parseInt(el.getAttribute('data-i'), 10)];
        if ($('manChain')) $('manChain').value = w.chain;
        if ($('manAddr')) $('manAddr').value = w.addr;
        analyzeWallet();
      };
    });
  }

  /* TON Connect */
  var tonConnectUI = null;
  function initTonConnect() {
    if (tonConnectUI || !window.TonConnectUI) return;
    try {
      tonConnectUI = new TonConnectUI({
        manifestUrl: 'https://0xvilya.github.io/crypto-tracker/tonconnect-manifest.json'
      });
      var btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.marginTop = '0.6rem';
      btn.textContent = lang() === 'ru' ? '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c Tonkeeper' : 'Connect Tonkeeper';
      btn.onclick = function () { if (tonConnectUI) tonConnectUI.openModal(); };
      var walletCard = document.querySelector('#p-wallet .card');
      if (walletCard) walletCard.appendChild(btn);
      tonConnectUI.onStatusChange(function (wallet) {
        if (wallet && wallet.account) {
          if ($('manChain')) $('manChain').value = 'ton';
          if ($('manAddr')) $('manAddr').value = wallet.account.address;
          toast('TON wallet connected');
          analyzeWallet();
        }
      });
    } catch (e) { console.warn('TON Connect', e); }
  }

  if ($('refBtn')) $('refBtn').onclick = function () { softRefresh(); };
  if ($('addTop')) $('addTop').onclick = function () {
    setList(DEFAULTS.slice());
    renderWatch();
  };

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
    langSel.onchange = function () {
      localStorage.setItem('ct_lang', langSel.value);
      applyLang();
    };
  }
  applyLang();

  var tcScript = document.createElement('script');
  tcScript.src = 'https://unpkg.com/@tonconnect/ui@2.0.0/dist/tonconnect-ui.min.js';
  tcScript.onload = initTonConnect;
  document.head.appendChild(tcScript);

  setTimeout(async function () {
    await softRefresh();
    setupConverter();
    buildGas();
    wireTools();
    loadSavedWallets();
  }, 300);
  setInterval(softRefresh, 45000);
})();
