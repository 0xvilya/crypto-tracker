(function () {
    var API = 'https://api.coingecko.com/api/v3';
    var DEFAULT_IDS = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
    var EXCHANGES = [
      { name: 'Binance', url: function (s) { return 'https://www.binance.com/en/trade/' + s.toUpperCase() + '_USDT'; } },
      { name: 'Bybit', url: function (s) { return 'https://www.bybit.com/trade/usdt/' + s.toUpperCase() + 'USDT'; } },
      { name: 'Coinbase', url: function (s) { return 'https://www.coinbase.com/price/' + s.toLowerCase(); } },
      { name: 'Kraken', url: function (s) { return 'https://www.kraken.com/prices/' + s.toLowerCase() + '-usd'; } },
      { name: 'OKX', url: function (s) { return 'https://www.okx.com/trade-spot/' + s.toLowerCase() + '-usdt'; } },
      { name: 'Bitget', url: function (s) { return 'https://www.bitget.com/spot/' + s.toUpperCase() + 'USDT'; } }
    ];

    var CURRENCIES = {
      usd: { label: 'USD', symbol: '$', locale: 'en-US' },
      eur: { label: 'EUR', symbol: '\u20ac', locale: 'de-DE' },
      rub: { label: 'RUB', symbol: '\u20bd', locale: 'ru-RU' },
      pln: { label: 'PLN', symbol: 'z\u0142', locale: 'pl-PL' },
      uah: { label: 'UAH', symbol: '\u20b4', locale: 'uk-UA' }
    };

    var GREEN = '#0ecb81';
    var RED = '#f6465d';
    var MUTED_DARK = '#848e9c';
    var MUTED_LIGHT = '#6b7280';

    var CACHE_TTL = 120000;
    var list = JSON.parse(localStorage.getItem('crypto_watchlist') || 'null') || DEFAULT_IDS.slice();
    var selectedId = null;
    var chart = null;
    var currentDays = '7';
    var sideTab = 'trending';
    var isBusy = false;
    var lastFetch = 0;
    var chartAbort = null;

    var savedCur = localStorage.getItem('ct_currency') || 'usd';
    if (!CURRENCIES[savedCur]) savedCur = 'usd';
    var currency = savedCur;
    var lang = localStorage.getItem('ct_lang') || 'ru';
    var theme = localStorage.getItem('ct_theme') || 'dark';

    function curMeta() { return CURRENCIES[currency] || CURRENCIES.usd; }

    function showToast(msg, ms) {
      var el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.classList.remove('show'); }, ms || 2400);
    }

    function formatPrice(value) {
      if (value == null || isNaN(value)) return '\u2014';
      var n = Number(value);
      var meta = curMeta();
      var digits;
      if (n >= 1000) digits = 2;
      else if (n >= 1) digits = 2;
      else if (n >= 0.01) digits = 4;
      else if (n >= 0.0001) digits = 6;
      else digits = 8;
      try {
        return meta.symbol + n.toLocaleString(meta.locale, {
          minimumFractionDigits: n >= 1 ? 2 : 0,
          maximumFractionDigits: digits
        });
      } catch (e) {
        return meta.symbol + n.toFixed(Math.min(digits, 6));
      }
    }

    function formatAxisPrice(value) {
      if (value == null || isNaN(value)) return '';
      var n = Number(value);
      var meta = curMeta();
      if (n >= 1e9) return meta.symbol + (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return meta.symbol + (n / 1e6).toFixed(1) + 'M';
      if (n >= 1000) return meta.symbol + (n / 1000).toFixed(1) + 'K';
      if (n >= 1) return meta.symbol + n.toFixed(2);
      if (n >= 0.01) return meta.symbol + n.toFixed(4);
      return meta.symbol + n.toPrecision(3);
    }

    function formatPct(value) {
      if (value == null || isNaN(value)) return '\u2014';
      return (value >= 0 ? '+' : '') + Number(value).toFixed(2) + '%';
    }

    function pctClass(value) {
      if (value == null || isNaN(value)) return '';
      return value >= 0 ? 'change-up' : 'change-down';
    }

    function cacheGet(key) {
      try {
        var raw = localStorage.getItem('cg_' + key);
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (obj && obj.t && obj.d !== undefined) {
          if (Date.now() - obj.t > (obj.ttl || CACHE_TTL)) {
            localStorage.removeItem('cg_' + key);
            return null;
          }
          return obj.d;
        }
        return obj;
      } catch (e) { return null; }
    }

    function cacheSet(key, data, ttl) {
      try {
        localStorage.setItem('cg_' + key, JSON.stringify({ t: Date.now(), ttl: ttl || CACHE_TTL, d: data }));
      } catch (e) {}
    }

    function sleep(ms) {
      return new Promise(function (r) { setTimeout(r, ms); });
    }

    async function fetchJSON(url, retries) {
      retries = retries == null ? 3 : retries;
      var lastErr;
      for (var i = 0; i <= retries; i++) {
        try {
          var gap = 900 - (Date.now() - lastFetch);
          if (gap > 0) await sleep(gap);
          lastFetch = Date.now();
          var res = await fetch(url);
          if (res.status === 429) {
            if (i < retries) {
              showToast('\u041b\u0438\u043c\u0438\u0442 API, \u0436\u0434\u0451\u043c\u2026');
              await sleep(Math.min(2500 * Math.pow(1.8, i), 10000));
              continue;
            }
            throw new Error('429');
          }
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return await res.json();
        } catch (e) {
          lastErr = e;
          if (e.name === 'AbortError') throw e;
          if (i < retries) await sleep(600 * (i + 1));
        }
      }
      throw lastErr || new Error('Network');
    }

    function applyTheme(to) {
      theme = to;
      localStorage.setItem('ct_theme', theme);
      if (theme === 'light') document.documentElement.classList.add('light');
      else document.documentElement.classList.remove('light');
      document.getElementById('themeToggle').textContent = theme === 'light' ? 'Light' : 'Dark';
      if (chart && selectedId) {
        var key = 'chart_' + currency + '_' + selectedId + '_' + currentDays;
        var cached = cacheGet(key);
        if (cached) renderChart(cached);
      }
    }

    function mutedColor() {
      return theme === 'light' ? MUTED_LIGHT : MUTED_DARK;
    }

    function renderGlobal(data) {
      var g = data && data.data ? data.data : {};
      var mcaps = g.total_market_cap || {};
      var market = mcaps[currency] != null ? mcaps[currency] : (mcaps.usd || 0);
      var change = g.market_cap_change_percentage_24h_usd;
      var btcDom = (g.market_cap_percentage && g.market_cap_percentage.btc) || 0;
      var capValue = market >= 1e12
        ? (market / 1e12).toFixed(2) + 'T'
        : market >= 1e9
          ? (market / 1e9).toFixed(2) + 'B'
          : (market / 1e6).toFixed(0) + 'M';
      document.getElementById('globalStats').innerHTML =
        '<span>Market Cap: <strong>' + curMeta().symbol + capValue + '</strong></span>' +
        '<span>24h: <strong class="' + pctClass(change) + '">' + formatPct(change) + '</strong></span>' +
        '<span>BTC Dom: <strong>' + Number(btcDom).toFixed(1) + '%</strong></span>';
    }

    async function loadGlobal() {
      try {
        var cached = cacheGet('global');
        if (cached) renderGlobal(cached);
        var data = await fetchJSON(API + '/global');
        cacheSet('global', data);
        renderGlobal(data);
      } catch (e) {
        var old = cacheGet('global');
        if (old) renderGlobal(old);
        else document.getElementById('globalStats').innerHTML = '<span>\u0414\u0430\u043d\u043d\u044b\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b</span>';
      }
    }

    function renderWatchlist(data) {
      var tbody = document.getElementById('watchlistBody');
      var map = {};
      (data || []).forEach(function (c) { map[c.id] = c; });
      var ordered = list.map(function (id) { return map[id]; }).filter(Boolean);
      if (!ordered.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u044b \u0447\u0435\u0440\u0435\u0437 \u043f\u043e\u0438\u0441\u043a</td></tr>';
        return;
      }
      tbody.innerHTML = ordered.map(function (coin, index) {
        return '<tr data-id="' + coin.id + '" class="' + (selectedId === coin.id ? 'selected' : '') +
          '" onclick="window._selectCoin(\'' + coin.id + '\')">' +
          '<td>' + (coin.market_cap_rank || index + 1) + '</td>' +
          '<td><div class="coin-cell">' +
            '<img src="' + coin.image + '" alt="" loading="lazy" />' +
            '<div><div class="coin-name">' + coin.name + '</div>' +
            '<div class="coin-symbol">' + coin.symbol + '</div></div></div></td>' +
          '<td class="price">' + formatPrice(coin.current_price) + '</td>' +
          '<td class="' + pctClass(coin.price_change_percentage_24h) + '">' + formatPct(coin.price_change_percentage_24h) + '</td>' +
          '<td class="' + pctClass(coin.price_change_percentage_7d_in_currency) + '">' + formatPct(coin.price_change_percentage_7d_in_currency) + '</td>' +
          '<td><button class="remove-btn" onclick="event.stopPropagation();window._removeCoin(\'' + coin.id + '\')">\u00d7</button></td>' +
          '</tr>';
      }).join('');

      if (!selectedId && ordered.length) window._selectCoin(ordered[0].id);
      else if (selectedId && map[selectedId]) updateDetail(map[selectedId]);
    }

    async function loadWatchlist() {
      if (!list.length) {
        document.getElementById('watchlistBody').innerHTML =
          '<tr><td colspan="6" class="empty">\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043c\u043e\u043d\u0435\u0442\u044b \u0447\u0435\u0440\u0435\u0437 \u043f\u043e\u0438\u0441\u043a</td></tr>';
        return;
      }
      var cacheKey = 'wl_' + currency + '_' + list.slice().sort().join(',');
      var cached = cacheGet(cacheKey);
      if (cached) renderWatchlist(cached);

      try {
        var url = API + '/coins/markets?vs_currency=' + currency +
          '&ids=' + encodeURIComponent(list.join(',')) +
          '&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d';
        var data = await fetchJSON(url);
        cacheSet(cacheKey, data);
        data.forEach(function (c) { cacheSet('coin_' + currency + '_' + c.id, c); });
        renderWatchlist(data);
      } catch (e) {
        if (!cached) {
          document.getElementById('watchlistBody').innerHTML =
            '<tr><td colspan="6" class="empty">\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c\u00bb \u0447\u0435\u0440\u0435\u0437 \u043c\u0438\u043d\u0443\u0442\u0443.</td></tr>';
        }
      }
    }

    function updateDetail(coin) {
      if (!coin) return;
      document.getElementById('detailCard').style.display = 'block';
      document.getElementById('detailImg').src = coin.image || '';
      document.getElementById('detailName').textContent = coin.name || '';
      document.getElementById('detailSymbol').textContent = (coin.symbol || '').toUpperCase();
      document.getElementById('detailPrice').textContent = formatPrice(coin.current_price);
      var ch = coin.price_change_percentage_24h;
      document.getElementById('detailChange').innerHTML =
        '<span class="' + pctClass(ch) + '">' + formatPct(ch) + ' \u0437\u0430 24\u0447</span>';
      document.getElementById('exchanges').innerHTML = EXCHANGES.map(function (ex) {
        return '<a class="ex-link" href="' + ex.url(coin.symbol) + '" target="_blank" rel="noopener">' + ex.name + '</a>';
      }).join('');
    }

    window._selectCoin = async function (id) {
      selectedId = id;
      document.querySelectorAll('#watchlistBody tr').forEach(function (tr) {
        tr.classList.toggle('selected', tr.getAttribute('data-id') === id);
      });
      document.getElementById('detailCard').style.display = 'block';

      var coin = cacheGet('coin_' + currency + '_' + id);
      if (coin) {
        updateDetail(coin);
      } else {
        try {
          var data = await fetchJSON(
            API + '/coins/markets?vs_currency=' + currency +
            '&ids=' + encodeURIComponent(id) + '&price_change_percentage=24h'
          );
          if (data && data[0]) {
            cacheSet('coin_' + currency + '_' + id, data[0]);
            updateDetail(data[0]);
          }
        } catch (e) { /* ignore */ }
      }
      await loadChart(id, currentDays);
    };

    window._removeCoin = function (id) {
      list = list.filter(function (x) { return x !== id; });
      localStorage.setItem('crypto_watchlist', JSON.stringify(list));
      if (selectedId === id) {
        selectedId = null;
        document.getElementById('detailCard').style.display = 'none';
        if (chart) { chart.destroy(); chart = null; }
      }
      loadWatchlist();
    };

    window._addCoin = function (id, name) {
      if (!list.includes(id)) {
        list.unshift(id);
        localStorage.setItem('crypto_watchlist', JSON.stringify(list));
        showToast((name || id) + ' \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430');
        loadWatchlist().then(function () { window._selectCoin(id); });
      } else {
        window._selectCoin(id);
        showToast((name || id) + ' \u0443\u0436\u0435 \u0432 \u0441\u043f\u0438\u0441\u043a\u0435');
      }
      document.getElementById('searchInput').value = '';
      document.getElementById('searchResults').style.display = 'none';
    };

    function setChartLoading(on) {
      document.getElementById('chartLoading').classList.toggle('on', !!on);
      document.querySelectorAll('.tf-btn').forEach(function (b) { b.disabled = !!on; });
    }

    async function loadChart(id, days) {
      if (!id) return;
      currentDays = String(days);
      document.querySelectorAll('.tf-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-days') === currentDays);
      });

      var key = 'chart_' + currency + '_' + id + '_' + currentDays;
      var cached = cacheGet(key);
      if (cached && cached.prices && cached.prices.length) {
        renderChart(cached);
        return;
      }

      if (chartAbort) {
        try { chartAbort.abort(); } catch (e) {}
      }
      chartAbort = new AbortController();
      setChartLoading(true);

      try {
        var param = currentDays === 'max' ? 'max' : (Number(currentDays) || 7);
        var data = await fetchJSON(
          API + '/coins/' + id + '/market_chart?vs_currency=' + currency + '&days=' + encodeURIComponent(param)
        );
        if (data && data.prices && data.prices.length) {
          cacheSet(key, data, 5 * 60 * 1000);
          renderChart(data);
        } else {
          setChartLoading(false);
          showToast('\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0433\u0440\u0430\u0444\u0438\u043a\u0430');
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        setChartLoading(false);
        var fallback = null;
        ['7', '30', '1', '90', '365', 'max'].forEach(function (d) {
          if (!fallback) fallback = cacheGet('chart_' + currency + '_' + id + '_' + d);
        });
        if (fallback && fallback.prices) {
          renderChart(fallback);
          showToast('\u041f\u043e\u043a\u0430\u0437\u0430\u043d \u043a\u044d\u0448 \u0433\u0440\u0430\u0444\u0438\u043a\u0430');
        } else {
          showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0433\u0440\u0430\u0444\u0438\u043a\u0430 \u2014 \u043f\u043e\u0434\u043e\u0436\u0434\u0438\u0442\u0435 \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u043f\u0435\u0440\u0438\u043e\u0434');
        }
      }
    }

    function renderChart(data) {
      setChartLoading(false);
      if (!window.Chart) return;
      var prices = data.prices || [];
      if (!prices.length) return;

      var daysNum = currentDays === 'max' ? 9999 : parseInt(currentDays, 10) || 7;
      var locale = curMeta().locale;

      var labels = prices.map(function (p) {
        var d = new Date(p[0]);
        if (daysNum === 1) {
          return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        }
        if (daysNum <= 90) {
          return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        }
        return d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      });
      var values = prices.map(function (p) { return p[1]; });
      var isUp = values[values.length - 1] >= values[0];
      var lineColor = isUp ? GREEN : RED;
      var fillColor = isUp ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)';
      var tickColor = mutedColor();

      if (chart) {
        try { chart.destroy(); } catch (e) {}
        chart = null;
      }

      var canvas = document.getElementById('priceChart');
      var ctx = canvas.getContext('2d');

      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 2,
            fill: true,
            tension: 0.15,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: lineColor
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 280 },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: theme === 'light' ? '#ffffff' : '#1c232d',
              titleColor: tickColor,
              bodyColor: theme === 'light' ? '#0b0e11' : '#eaecef',
              borderColor: theme === 'light' ? '#e6e9ef' : '#2a3340',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: function (ctx) { return formatPrice(ctx.raw); }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: tickColor,
                maxTicksLimit: 7,
                maxRotation: 0,
                font: { size: 10 }
              },
              grid: { color: 'rgba(128,128,128,0.12)', drawBorder: false }
            },
            y: {
              ticks: {
                color: tickColor,
                font: { size: 10 },
                callback: function (v) { return formatAxisPrice(v); }
              },
              grid: { color: 'rgba(128,128,128,0.12)', drawBorder: false }
            }
          },
          interaction: { mode: 'index', intersect: false }
        }
      });
    }

    async function loadSide() {
      var listEl = document.getElementById('sideList');
      if (sideTab === 'trending') {
        document.getElementById('sideTitle').textContent = '\ud83d\udd25 \u0422\u0440\u0435\u043d\u0434\u044b';
        var cached = cacheGet('trending');
        if (cached) renderTrending(cached);
        try {
          var data = await fetchJSON(API + '/search/trending');
          cacheSet('trending', data);
          renderTrending(data);
        } catch (e) {
          if (!cached) listEl.innerHTML = '<li class="empty">\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c</li>';
        }
      } else {
        document.getElementById('sideTitle').textContent = '\ud83c\udfc6 \u0422\u043e\u043f-50';
        var key = 'top50_' + currency;
        var cached2 = cacheGet(key);
        if (cached2) renderTop(cached2);
        try {
          var data2 = await fetchJSON(
            API + '/coins/markets?vs_currency=' + currency +
            '&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
          );
          cacheSet(key, data2);
          data2.forEach(function (c) { cacheSet('coin_' + currency + '_' + c.id, c); });
          renderTop(data2);
        } catch (e) {
          if (!cached2) listEl.innerHTML = '<li class="empty">\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c</li>';
        }
      }
    }

    function renderTrending(data) {
      var coins = (data.coins || []).slice(0, 10);
      document.getElementById('sideList').innerHTML = coins.map(function (item, i) {
        var c = item.item;
        return '<li><div class="trending-item" onclick="window._addCoin(\'' + c.id + '\',\'' +
          String(c.name).replace(/'/g, "\\'") + '\')">' +
          '<span class="rank">' + (i + 1) + '</span>' +
          '<img src="' + c.small + '" alt="" />' +
          '<span>' + c.name + ' <span style="color:var(--muted);font-size:0.75rem">' +
          c.symbol + '</span></span></div></li>';
      }).join('');
    }

    function renderTop(data) {
      document.getElementById('sideList').innerHTML = (data || []).map(function (c, i) {
        return '<li><div class="trending-item" onclick="window._addCoin(\'' + c.id + '\',\'' +
          String(c.name).replace(/'/g, "\\'") + '\')">' +
          '<span class="rank">' + (c.market_cap_rank || i + 1) + '</span>' +
          '<img src="' + c.image + '" alt="" loading="lazy" />' +
          '<span>' + c.name + '</span>' +
          '<span class="top-price ' + pctClass(c.price_change_percentage_24h) + '">' +
          formatPrice(c.current_price) + '</span></div></li>';
      }).join('');
    }

    window.switchSideTab = function (tab) {
      sideTab = tab;
      document.getElementById('tabTrending').classList.toggle('active', tab === 'trending');
      document.getElementById('tabTop').classList.toggle('active', tab === 'top');
      loadSide();
    };

    async function changeCurrency(next) {
      if (!CURRENCIES[next]) {
        showToast('\u0412\u0430\u043b\u044e\u0442\u0430 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044f');
        return;
      }
      if (next === currency && !isBusy) return;
      currency = next;
      localStorage.setItem('ct_currency', currency);
      document.getElementById('currencySelect').value = currency;

      document.getElementById('watchlistBody').innerHTML =
        '<tr><td colspan="6" class="loading">\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u0446\u0435\u043d (' + curMeta().label + ')...</td></tr>';
      if (selectedId) setChartLoading(true);

      try {
        await loadGlobal();
        await loadWatchlist();
        await loadSide();
        if (selectedId) await loadChart(selectedId, currentDays);
        showToast('\u0426\u0435\u043d\u044b \u0432 ' + curMeta().label);
      } catch (e) {
        showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043c\u0435\u043d\u044b \u0432\u0430\u043b\u044e\u0442\u044b');
      }
    }

    document.getElementById('timeframes').addEventListener('click', function (e) {
      var btn = e.target.closest('.tf-btn');
      if (!btn || !selectedId || btn.disabled) return;
      loadChart(selectedId, btn.getAttribute('data-days'));
    });

    document.getElementById('refreshBtn').addEventListener('click', async function () {
      if (isBusy) return;
      isBusy = true;
      var btn = document.getElementById('refreshBtn');
      btn.disabled = true;
      btn.textContent = '\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435...';
      try {
        await loadGlobal();
        await loadWatchlist();
        await loadSide();
        if (selectedId) {
          try { localStorage.removeItem('cg_chart_' + currency + '_' + selectedId + '_' + currentDays); } catch (e) {}
          await loadChart(selectedId, currentDays);
        }
        showToast('\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e');
      } finally {
        isBusy = false;
        btn.disabled = false;
        btn.textContent = '\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c';
      }
    });

    document.getElementById('currencySelect').addEventListener('change', function (e) {
      changeCurrency(e.target.value);
    });

    document.getElementById('themeToggle').addEventListener('click', function () {
      applyTheme(theme === 'light' ? 'dark' : 'light');
    });

    document.getElementById('langSelect').addEventListener('change', function (e) {
      lang = e.target.value;
      localStorage.setItem('ct_lang', lang);
    });

    document.getElementById('tabTrending').addEventListener('click', function () {
      window.switchSideTab('trending');
    });
    document.getElementById('tabTop').addEventListener('click', function () {
      window.switchSideTab('top');
    });

    document.getElementById('addPopularBtn').addEventListener('click', function () {
      var added = 0;
      DEFAULT_IDS.forEach(function (id) {
        if (!list.includes(id)) { list.push(id); added++; }
      });
      localStorage.setItem('crypto_watchlist', JSON.stringify(list));
      showToast(added ? ('\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e ' + added) : '\u0423\u0436\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u044b');
      loadWatchlist();
    });

    var searchTimer = null;
    document.getElementById('searchInput').addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      var box = document.getElementById('searchResults');
      if (!q) { box.style.display = 'none'; return; }
      box.style.display = 'block';
      box.innerHTML = '<div class="sr-empty">\u041f\u043e\u0438\u0441\u043a...</div>';
      searchTimer = setTimeout(function () {
        fetchJSON(API + '/search?query=' + encodeURIComponent(q), 2).then(function (data) {
          var coins = (data.coins || []).slice(0, 15);
          if (!coins.length) {
            box.innerHTML = '<div class="sr-empty">\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</div>';
            return;
          }
          box.innerHTML = coins.map(function (coin) {
            return '<div class="sr-item" onclick="window._addCoin(\'' + coin.id + '\',\'' +
              String(coin.name).replace(/'/g, "\\'") + '\')">' +
              '<img src="' + (coin.thumb || '') + '" alt="" />' +
              '<div class="sr-meta"><div class="sr-name">' + coin.name + '</div>' +
              '<div class="sr-sym">' + (coin.symbol || '').toUpperCase() + '</div></div>' +
              '<div class="sr-rank">' + (coin.market_cap_rank ? '#' + coin.market_cap_rank : '') + '</div></div>';
          }).join('');
        }).catch(function () {
          box.innerHTML = '<div class="sr-empty">\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u043e\u0438\u0441\u043a\u0430</div>';
        });
      }, 350);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-wrap')) {
        document.getElementById('searchResults').style.display = 'none';
      }
    });

    document.getElementById('currencySelect').value = currency;
    document.getElementById('langSelect').value = lang;
    applyTheme(theme);
    loadGlobal();
    loadWatchlist();
    loadSide();
  })();
