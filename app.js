(function () {
  'use strict';

  const COINS = {
    bitcoin: { sym: 'BTC', name: 'Bitcoin', color: '#f7931a' },
    ethereum: { sym: 'ETH', name: 'Ethereum', color: '#627eea' },
    solana: { sym: 'SOL', name: 'Solana', color: '#14f195' },
    'binancecoin': { sym: 'BNB', name: 'BNB', color: '#f3ba2f' },
    ripple: { sym: 'XRP', name: 'XRP', color: '#00aae4' },
    cardano: { sym: 'ADA', name: 'Cardano', color: '#0033ad' },
    dogecoin: { sym: 'DOGE', name: 'Dogecoin', color: '#c2a633' },
    polkadot: { sym: 'DOT', name: 'Polkadot', color: '#e6007a' },
    chainlink: { sym: 'LINK', name: 'Chainlink', color: '#2a5ada' },
    'avalanche-2': { sym: 'AVAX', name: 'Avalanche', color: '#e84142' },
    toncoin: { sym: 'TON', name: 'Toncoin', color: '#0098ea' },
    litecoin: { sym: 'LTC', name: 'Litecoin', color: '#345d9d' },
    tron: { sym: 'TRX', name: 'TRON', color: '#ff0013' },
    'matic-network': { sym: 'POL', name: 'Polygon', color: '#8247e5' },
    pepe: { sym: 'PEPE', name: 'Pepe', color: '#3d9a3d' },
    near: { sym: 'NEAR', name: 'NEAR', color: '#00c08b' }
  };

  const DEFAULT_WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'toncoin'];
  const state = {
    prices: {},
    chartData: [],
    selectedId: 'bitcoin',
    lang: 'en'
  };

  const I18N = {
    en: {
      currency: 'Currency',
      language: 'Language',
      watchlist: 'Watchlist',
      trending: 'Trending',
      manual_port: 'Manual portfolio',
      wallet: 'Wallet',
      tools: 'Tools',
      news: 'News'
    },
    ru: {
      currency: 'Валюта',
      language: 'Язык',
      watchlist: 'Избранное',
      trending: 'Тренды',
      manual_port: 'Портфель',
      wallet: 'Кошелек',
      tools: 'Инструменты',
      news: 'Новости'
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function lang() {
    return (localStorage.getItem('ct_lang') || 'en').toLowerCase();
  }

  function cur() {
    return (localStorage.getItem('ct_cur') || 'usd').toLowerCase();
  }

  function showToast(msg, ms) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove('show');
    }, ms || 2200);
  }

  function money(value, currency) {
    const c = (currency || cur()).toLowerCase();
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const symbols = { usd: '$', eur: '€', rub: '₽', pln: 'zł' };
    const locale = c === 'rub' ? 'ru-RU' : 'en-US';
    if (numeric >= 1000) {
      return symbols[c] + Number(numeric).toLocaleString(locale, { maximumFractionDigits: 0 });
    }
    return symbols[c] + Number(numeric).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function pct(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function safeJson(res) {
    if (!res || !res.ok) return null;
    return res.json();
  }

  function pickupPrice(id, c) {
    const price = state.prices[id];
    if (!price) return null;
    const item = price[c] || price.usd;
    return item ? Number(item) : null;
  }

  async function fetchJson(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function ensurePrices(ids) {
    const list = ids || Object.keys(COINS);
    const missing = list.filter(function (id) {
      return !state.prices[id] || !state.prices[id].usd;
    });

    if (!missing.length) return;

    const idsQuery = missing.join(',');
    const data = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(idsQuery) + '&vs_currencies=usd,eur,rub,pln&include_24hr_change=true');
    if (!data) return;

    Object.keys(data).forEach(function (id) {
      const v = data[id];
      if (!v) return;
      state.prices[id] = {
        usd: v.usd,
        eur: v.eur,
        rub: v.rub,
        pln: v.pln,
        change: v.usd_24h_change || 0
      };
    });
  }

  async function refreshWatchlist() {
    const watch = loadWatchlist();
    await ensurePrices(watch);

    const body = $('watchBody');
    if (!body) return;

    body.innerHTML = watch.map(function (id, index) {
      const meta = COINS[id] || { sym: id.toUpperCase().slice(0, 4), name: id };
      const price = pickupPrice(id, cur());
      const change = state.prices[id] ? Number(state.prices[id].change || 0) : 0;
      const rowClass = change >= 0 ? 'price-up' : 'price-down';
      const priceText = price == null ? '—' : money(price, cur());
      return '<tr class="coin-row" data-id="' + id + '">' +
        '<td><div class="coin-cell"><span class="coin-badge" style="background:' + (meta.color || '#8b5cf6') + '">' + (meta.sym || id.slice(0, 2)).slice(0, 2) + '</span>' +
        '<div><div class="coin-name">' + meta.name + '</div><div class="coin-symbol">' + meta.sym + '</div></div></div></td>' +
        '<td>' + priceText + '</td>' +
        '<td class="' + rowClass + '">' + pct(change) + '</td>' +
        '<td><button type="button" class="watch-remove" data-id="' + id + '" aria-label="Remove">×</button></td>' +
        '</tr>';
    }).join('');

    document.querySelectorAll('.coin-row').forEach(function (row) {
      row.addEventListener('click', function (event) {
        if (event.target.closest('.watch-remove')) return;
        const id = row.getAttribute('data-id');
        state.selectedId = id;
        openDetail(id);
      });
    });

    document.querySelectorAll('.watch-remove').forEach(function (btn) {
      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        const id = btn.getAttribute('data-id');
        removeFromWatchlist(id);
      });
    });
  }

  function renderTrends() {
    const trends = $('trends');
    if (!trends) return;

    const ids = Object.keys(COINS).slice(0, 8);
    Promise.resolve(ensurePrices(ids)).then(function () {
      const list = ids.map(function (id) {
        const meta = COINS[id];
        const price = pickupPrice(id, cur());
        const change = state.prices[id] ? Number(state.prices[id].change || 0) : 0;
        return { id, name: meta.name, sym: meta.sym, price, change };
      }).sort(function (a, b) {
        return Math.abs(b.change) - Math.abs(a.change);
      });

      trends.innerHTML = list.map(function (item) {
        return '<div class="trend-row" data-id="' + item.id + '">' +
          '<div><strong>' + item.name + '</strong><div class="coin-symbol">' + item.sym + '</div></div>' +
          '<div><div>' + (item.price == null ? '—' : money(item.price, cur())) + '</div><div class="' + (item.change >= 0 ? 'price-up' : 'price-down') + '">' + pct(item.change) + '</div></div>' +
          '</div>';
      }).join('');

      trends.querySelectorAll('.trend-row').forEach(function (row) {
        row.addEventListener('click', function () {
          const id = row.getAttribute('data-id');
          state.selectedId = id;
          openDetail(id);
        });
      });
    });
  }

  function loadWatchlist() {
    try {
      const saved = JSON.parse(localStorage.getItem('ct_watch') || '[]');
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (e) {}
    return DEFAULT_WATCHLIST.slice();
  }

  function saveWatchlist(ids) {
    localStorage.setItem('ct_watch', JSON.stringify(ids));
  }

  function removeFromWatchlist(id) {
    const list = loadWatchlist().filter(function (item) {
      return item !== id;
    });
    saveWatchlist(list);
    refreshWatchlist();
  }

  function addToWatchlist(id) {
    const list = loadWatchlist();
    if (!list.includes(id)) {
      list.unshift(id);
      saveWatchlist(list.slice(0, 12));
      refreshWatchlist();
      showToast('Added to watchlist');
    }
  }

  async function fetchCoinChart(id) {
    const url = 'https://api.coingecko.com/api/v3/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=' + cur() + '&days=7&interval=daily';
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.prices)) return [];
    return data.prices.map(function (point) {
      return { time: Math.floor(point[0] / 1000), value: Number(point[1]) };
    });
  }

  function drawChart(data) {
    const canvas = $('chartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padLeft = 26;
    const padTop = 12;
    const padRight = 12;
    const padBottom = 18;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0d1728';
    ctx.fillRect(0, 0, width, height);

    if (!data || !data.length) {
      ctx.fillStyle = '#95a6bf';
      ctx.font = '12px sans-serif';
      ctx.fillText('No data', 18, 24);
      return;
    }

    const values = data.map(function (d) { return d.value; });
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = max - min || 1;
    const left = padLeft;
    const top = padTop;
    const right = width - padRight;
    const bottom = height - padBottom;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const y = top + ((bottom - top) * i / 3);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, 'rgba(168,85,247,0.32)');
    gradient.addColorStop(1, 'rgba(168,85,247,0)');

    ctx.beginPath();
    data.forEach(function (point, idx) {
      const x = left + (idx / Math.max(data.length - 1, 1)) * (right - left);
      const y = bottom - ((point.value - min) / span) * (bottom - top);
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    data.forEach(function (point, idx) {
      const x = left + (idx / Math.max(data.length - 1, 1)) * (right - left);
      const y = bottom - ((point.value - min) / span) * (bottom - top);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.stroke();

    const last = data[data.length - 1];
    const first = data[0];
    const upward = last.value >= first.value;
    const tip = $('chartTip');
    if (tip) {
      const value = last.value;
      const date = new Date(last.time * 1000);
      tip.textContent = (upward ? 'Up' : 'Down') + ' • ' + money(value, cur()) + ' • ' + date.toLocaleDateString();
    }
  }

  async function openDetail(id) {
    const meta = COINS[id] || { sym: id.toUpperCase().slice(0, 4), name: id };
    const price = pickupPrice(id, cur());
    const change = state.prices[id] ? Number(state.prices[id].change || 0) : 0;

    const dSym = $('dSym');
    const dName = $('dName');
    const dPrice = $('dPrice');
    const dCh = $('dCh');
    const exLinks = $('exLinks');

    if (dSym) dSym.textContent = meta.sym;
    if (dName) dName.textContent = meta.name;
    if (dPrice) dPrice.textContent = price == null ? '—' : money(price, cur());
    if (dCh) {
      dCh.textContent = pct(change);
      dCh.className = 'coin-change ' + (change >= 0 ? 'price-up' : 'price-down');
    }

    if (exLinks) {
      exLinks.innerHTML = '<a href="https://www.coingecko.com/en/coins/' + encodeURIComponent(id) + '" target="_blank" rel="noopener">CoinGecko</a>' +
        '<a href="https://www.binance.com/en/trade/' + encodeURIComponent(meta.sym) + '_USDT" target="_blank" rel="noopener">Binance</a>';
    }

    const data = await fetchCoinChart(id);
    drawChart(data);
  }

  function bindSearch() {
    const input = $('coinSearch');
    const results = $('searchResults');
    if (!input || !results) return;

    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.classList.remove('visible');
        results.innerHTML = '';
        return;
      }

      const matches = Object.entries(COINS).filter(function (entry) {
        const [id, meta] = entry;
        return meta.name.toLowerCase().includes(q) || meta.sym.toLowerCase().includes(q) || id.toLowerCase().includes(q);
      }).slice(0, 8);

      results.innerHTML = matches.map(function ([id, meta]) {
        return '<div class="search-hit" data-id="' + id + '">' + meta.name + ' (' + meta.sym + ')</div>';
      }).join('');

      results.classList.add('visible');
      results.querySelectorAll('.search-hit').forEach(function (hit) {
        hit.addEventListener('click', function () {
          const id = hit.getAttribute('data-id');
          state.selectedId = id;
          input.value = '';
          results.classList.remove('visible');
          results.innerHTML = '';
          openDetail(id);
          addToWatchlist(id);
        });
      });
    });
  }

  function loadPortfolio() {
    const box = $('manualHoldings');
    if (!box) return;
    try {
      const hold = JSON.parse(localStorage.getItem('ct_portfolio') || '[]');
      if (!Array.isArray(hold) || !hold.length) {
        box.innerHTML = '<div class="holding-item"><div class="holding-meta"><strong>Empty</strong><span>No positions yet</span></div></div>';
        return;
      }

      const ids = hold.map(function (p) { return p.id; });
      Promise.resolve(ensurePrices(ids)).then(function () {
        let total = 0;
        box.innerHTML = hold.map(function (item) {
          const meta = COINS[item.id] || { sym: item.id.toUpperCase().slice(0, 4), name: item.id };
          const price = pickupPrice(item.id, cur());
          const value = price == null ? 0 : Number(item.qty || 0) * price;
          total += value;

          return '<div class="holding-item">' +
            '<div class="holding-meta"><strong>' + meta.name + '</strong><span>' + meta.sym + ' • ' + Number(item.qty).toFixed(4) + '</span></div>' +
            '<div class="holding-value"><strong>' + (price == null ? '—' : money(value, cur())) + '</strong><span>' + (price == null ? '—' : money(price, cur())) + '</span></div>' +
            '</div>';
        }).join('');

        const totalEl = $('portfolioTotal');
        if (totalEl) {
          totalEl.textContent = money(total, cur());
          totalEl.classList.remove('hidden');
        }
      });
    } catch (e) {
      box.innerHTML = '<div class="holding-item"><div class="holding-meta"><strong>Empty</strong><span>No positions yet</span></div></div>';
    }
  }

  function bindPortfolioForm() {
    const coin = $('mhCoin');
    const qty = $('mhQty');
    const buy = $('mhBuy');
    const add = $('mhAdd');
    if (!coin || !qty || !buy || !add) return;

    coin.innerHTML = Object.entries(COINS).map(function ([id, meta]) {
      return '<option value="' + id + '">' + meta.name + ' (' + meta.sym + ')</option>';
    }).join('');
    coin.value = 'bitcoin';

    add.addEventListener('click', function () {
      const id = coin.value;
      const qtyValue = Number(qty.value);
      const buyValue = Number(buy.value) || 0;
      if (!id || !Number.isFinite(qtyValue) || qtyValue <= 0) {
        showToast('Set a valid quantity');
        return;
      }

      let list = [];
      try { list = JSON.parse(localStorage.getItem('ct_portfolio') || '[]'); } catch (e) {}
      list.push({ id, qty: qtyValue, buy: buyValue });
      localStorage.setItem('ct_portfolio', JSON.stringify(list));
      qty.value = '';
      buy.value = '';
      loadPortfolio();
      showToast('Position added');
    });
  }

  function bindWallet() {
    document.querySelectorAll('[data-wallet]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const wallet = btn.getAttribute('data-wallet');
        const form = $('walletForm');
        const input = $('walletAddress');
        if (form) form.classList.remove('hidden');
        if (input) {
          input.placeholder = wallet === 'ton' ? 'Paste TON wallet address' : wallet === 'metamask' ? 'Paste ETH wallet address' : 'Paste wallet address';
          input.focus();
        }
        showToast(wallet === 'ton' ? 'Tonkeeper flow selected' : wallet === 'metamask' ? 'MetaMask flow selected' : 'Custom wallet selected');
      });
    });

    const saveBtn = $('walletSave');
    const input = $('walletAddress');
    if (saveBtn && input) {
      saveBtn.addEventListener('click', function () {
        const value = input.value.trim();
        if (!value) {
          showToast('Enter wallet address');
          return;
        }
        localStorage.setItem('ct_wallet', value);
        showToast('Wallet saved');
      });
    }
  }

  function calcConverter() {
    const amt = Number($('convAmt')?.value || 0);
    const from = $('convFrom')?.value;
    const to = $('convTo')?.value;
    const out = $('convOut');
    if (!out || !from || !to) return;
    const a = pickupPrice(from, cur());
    const b = pickupPrice(to, cur());
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
      out.value = '0';
      return;
    }
    out.value = (amt * a / b).toFixed(6);
  }

  function setupConverter() {
    const from = $('convFrom');
    const to = $('convTo');
    if (!from || !to) return;
    const options = Object.entries(COINS).map(function ([id, meta]) {
      return '<option value="' + id + '">' + meta.sym + '</option>';
    }).join('');
    from.innerHTML = options;
    to.innerHTML = options;
    from.value = 'bitcoin';
    to.value = 'ethereum';

    [from, to, $('convAmt')].forEach(function (el) {
      if (el) {
        el.addEventListener('input', calcConverter);
        el.addEventListener('change', calcConverter);
      }
    });
    calcConverter();
  }

  function calcDca() {
    const dcaAmt = Number($('dcaAmt')?.value || 0);
    const dcaMonths = Number($('dcaMonths')?.value || 0);
    const dcaGrowth = Number($('dcaGrowth')?.value || 0) / 100;
    const result = $('dcaResult');
    if (!result) return;

    let invested = 0;
    let total = 0;
    for (let i = 0; i < dcaMonths; i++) {
      const monthlyAmount = dcaAmt * (1 + dcaGrowth / 12) ** i;
      total += monthlyAmount;
      invested += dcaAmt;
    }
    result.textContent = money(total, cur()) + ' • invested ' + money(invested, cur());
  }

  function bindDca() {
    ['dcaAmt', 'dcaMonths', 'dcaGrowth'].forEach(function (id) {
      const el = $(id);
      if (el) {
        el.addEventListener('input', calcDca);
        el.addEventListener('change', calcDca);
      }
    });
    calcDca();
  }

  async function buildGas() {
    const box = $('gasBox');
    if (!box) return;

    const rows = [
      { name: 'Ethereum', l: '~18', a: '~22', f: '~28', unit: 'gwei' },
      { name: 'Polygon', l: '~15', a: '~30', f: '~45', unit: 'gwei' },
      { name: 'BNB', l: '~2', a: '~4', f: '~7', unit: 'gwei' },
      { name: 'Solana', l: '~0.00001', a: '~0.00003', f: '~0.0001', unit: 'SOL' }
    ];

    box.innerHTML = rows.map(function (row) {
      return '<div class="gas-item"><span>' + row.name + '</span><span>' + row.l + ' / ' + row.a + ' / ' + row.f + ' ' + row.unit + '</span></div>';
    }).join('');
  }

  async function renderNews() {
    const list = $('newsList');
    if (!list) return;

    const url = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/');
    const raw = await fetchJson(url);
    if (!raw) {
      list.innerHTML = '<div class="news-item"><a href="https://www.coindesk.com" target="_blank" rel="noopener">Crypto news unavailable</a><p>Fallback state.</p></div>';
      return;
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(raw, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 8).map(function (item) {
      const title = item.querySelector('title')?.textContent || 'Crypto update';
      const link = item.querySelector('link')?.textContent || '#';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      return { title, link, pubDate, description };
    });

    list.innerHTML = items.map(function (entry) {
      return '<div class="news-item"><a href="' + entry.link + '" target="_blank" rel="noopener">' + entry.title + '</a><div class="meta">' + (entry.pubDate ? new Date(entry.pubDate).toLocaleString() : '') + '</div><p>' + (entry.description || '').replace(/<[^>]*>/g, '').slice(0, 180) + '</p></div>';
    }).join('');
  }

  function applyLanguage() {
    const current = lang();
    const dict = I18N[current] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  function bindGlobals() {
    const curSel = $('curSel');
    const langSel = $('langSel');
    const refreshBtn = $('refreshBtn');

    if (curSel) {
      curSel.value = cur();
      curSel.addEventListener('change', function () {
        localStorage.setItem('ct_cur', this.value);
        refreshAll();
      });
    }

    if (langSel) {
      langSel.value = lang();
      langSel.addEventListener('change', function () {
        localStorage.setItem('ct_lang', this.value);
        state.lang = this.value;
        applyLanguage();
        refreshAll();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        refreshAll();
        showToast('Data refreshed');
      });
    }

    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.nav-btn').forEach(function (item) {
          item.classList.toggle('active', item === btn);
        });
      });
    });
  }

  async function refreshAll() {
    await ensurePrices(Object.keys(COINS));
    await refreshWatchlist();
    renderTrends();
    loadPortfolio();
    openDetail(state.selectedId || 'bitcoin');
    calcConverter();
    calcDca();
    await renderNews();
    buildGas();
  }

  function init() {
    bindGlobals();
    bindSearch();
    bindPortfolioForm();
    bindWallet();
    setupConverter();
    bindDca();
    applyLanguage();
    refreshAll();
  }

  window.CryptoTracker = { init, refreshAll, addToWatchlist };
  document.addEventListener('DOMContentLoaded', init);
})();
