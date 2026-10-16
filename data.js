/* data.js v127 — unified data layer: dedup, cache, FX, timestamps */
(function (global) {
  'use strict';

  var inflight = Object.create(null);
  var cache = Object.create(null);
  var DEFAULT_TTL = 15000;

  function now() { return Date.now(); }

  async function cachedFetch(key, url, opts) {
    opts = opts || {};
    var ttl = opts.ttl != null ? opts.ttl : DEFAULT_TTL;
    var timeout = opts.timeout != null ? opts.timeout : 10000;
    var parse = opts.parse || function (r) { return r.json(); };

    var hit = cache[key];
    if (hit && now() - hit.at < ttl) {
      return { data: hit.data, fromCache: true, at: hit.at, stale: false };
    }

    if (inflight[key]) {
      return inflight[key];
    }

    var p = (async function () {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = null;
      try {
        if (ctrl) timer = setTimeout(function () { ctrl.abort(); }, timeout);
        var res = await fetch(url, {
          signal: ctrl ? ctrl.signal : undefined,
          headers: opts.headers || { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await parse(res);
        cache[key] = { data: data, at: now() };
        return { data: data, fromCache: false, at: cache[key].at, stale: false };
      } catch (err) {
        if (hit) {
          return { data: hit.data, fromCache: true, at: hit.at, stale: true, error: String(err && err.message || err) };
        }
        throw err;
      } finally {
        if (timer) clearTimeout(timer);
        delete inflight[key];
      }
    })();

    inflight[key] = p;
    return p;
  }

  function invalidate(prefix) {
    Object.keys(cache).forEach(function (k) {
      if (!prefix || k.indexOf(prefix) === 0) delete cache[k];
    });
  }

  var fxState = { rates: { USD: 1 }, at: 0, source: 'none' };

  async function loadFx() {
    if (now() - fxState.at < 180000 && fxState.source !== 'none') {
      return fxState;
    }
    try {
      var r = await cachedFetch('fx:usd', 'https://api.exchangerate-api.com/v4/latest/USD', { ttl: 180000, timeout: 8000 });
      var rates = (r.data && r.data.rates) || {};
      fxState = {
        rates: { USD: 1, EUR: rates.EUR || 1, RUB: rates.RUB || 1, PLN: rates.PLN || 1 },
        at: r.at,
        source: 'exchangerate-api',
        stale: !!r.stale
      };
    } catch (e) {
      if (fxState.source === 'none') {
        fxState = { rates: { USD: 1, EUR: 0.92, RUB: 90, PLN: 4.0 }, at: now(), source: 'fallback', stale: true };
      }
    }
    return fxState;
  }

  function rateFor(code) {
    var c = (code || 'usd').toUpperCase();
    return (fxState.rates && fxState.rates[c]) || 1;
  }

  function formatMoney(usdValue, currency) {
    if (usdValue == null || isNaN(+usdValue)) return '\u2014';
    var c = (currency || 'usd').toLowerCase();
    var sym = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +usdValue * rateFor(c);
    var abs = Math.abs(n);
    if (abs >= 1e12) return sym + (n / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return sym + (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return sym + (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1000) return sym + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (abs >= 1) return sym + n.toFixed(2);
    if (abs >= 0.0001) return sym + n.toFixed(6);
    return sym + n.toExponential(2);
  }

  async function fetchCoinGeckoPrices(ids, vsCurrencies) {
    vsCurrencies = vsCurrencies || 'usd';
    var idStr = (ids || []).join(',');
    if (!idStr) return { data: {}, at: now(), source: 'coingecko' };
    var url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(idStr) +
      '&vs_currencies=' + encodeURIComponent(vsCurrencies) + '&include_24hr_change=true';
    var r = await cachedFetch('cg:price:' + idStr + ':' + vsCurrencies, url, { ttl: 12000, timeout: 12000 });
    return { data: r.data || {}, at: r.at, source: 'coingecko', stale: !!r.stale };
  }

  async function fetchGlobal() {
    var r = await cachedFetch('cg:global', 'https://api.coingecko.com/api/v3/global', { ttl: 60000, timeout: 12000 });
    var g = (r.data && r.data.data) || {};
    return {
      mcap: g.total_market_cap && g.total_market_cap.usd,
      volume: g.total_volume && g.total_volume.usd,
      btcDom: g.market_cap_percentage && g.market_cap_percentage.btc,
      at: r.at,
      source: 'coingecko',
      stale: !!r.stale
    };
  }

  function paintStatus(el, info) {
    if (!el || !info) return;
    var age = info.at ? Math.round((now() - info.at) / 1000) : null;
    var txt = (info.source || '') + (age != null ? ' \u00b7 ' + age + 's' : '');
    if (info.stale) txt += ' \u00b7 stale';
    el.textContent = txt;
    el.title = info.stale ? 'Showing cached data; live update failed' : 'Live';
  }

  global.CTData = {
    cachedFetch: cachedFetch,
    invalidate: invalidate,
    loadFx: loadFx,
    rateFor: rateFor,
    formatMoney: formatMoney,
    fetchCoinGeckoPrices: fetchCoinGeckoPrices,
    fetchGlobal: fetchGlobal,
    paintStatus: paintStatus,
    getFxState: function () { return fxState; },
    getCacheStats: function () {
      return { keys: Object.keys(cache).length, inflight: Object.keys(inflight).length };
    }
  };
})(typeof window !== 'undefined' ? window : this);
