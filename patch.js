/* v118: wallet icon+jettons, real news, UI i18n, chart toggle */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    var s = $('langSel');
    return (s && s.value) || localStorage.getItem('ct_lang') || 'ru';
  }
  function cur() {
    var s = $('curSel');
    return (localStorage.getItem('ct_cur') || (s && s.value) || 'usd').toLowerCase();
  }
  function money(v) {
    if (v == null || isNaN(v)) return '\u2014';
    var c = cur();
    var s = c === 'eur' ? '\u20ac' : c === 'rub' ? '\u20bd' : c === 'pln' ? 'z\u0142' : '$';
    var n = +v;
    if (Math.abs(n) >= 1e12) return s + (n / 1e12).toFixed(2) + 'T';
    if (Math.abs(n) >= 1e9) return s + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return s + (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1000) return s + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (Math.abs(n) >= 1) return s + n.toFixed(2);
    return s + n.toFixed(4);
  }
  var I18N = {
    ru: {
      search: '\u041f\u043e\u0438\u0441\u043a \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043d\u0435\u0442\u044b\u2026',
      light: '\u0421\u0432\u0435\u0442\u043b\u0430\u044f', dark: '\u0422\u0451\u043c\u043d\u0430\u044f',
      home: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f', port: '\u041f\u043e\u0440\u0442\u0444\u0435\u043b\u044c', wallet: '\u041a\u043e\u0448\u0435\u043b\u0451\u043a',
      news: '\u041d\u043e\u0432\u043e\u0441\u0442\u0438', tools: '\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b',
      heatmap: '\u0422\u0435\u043f\u043b\u043e\u0432\u0430\u044f \u043a\u0430\u0440\u0442\u0430 \u0440\u044b\u043d\u043a\u0430',
      heatHint: '\u0420\u0430\u0437\u043c\u0435\u0440 \u2014 \u043a\u0430\u043f\u0438\u0442\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f, \u0446\u0432\u0435\u0442 \u2014 24\u0447',
      connect: '\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a',
      noWallet: '\u041a\u043e\u0448\u0435\u043b\u0451\u043a \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0451\u043d',
      switchW: '\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u043a\u043e\u0448\u0435\u043b\u0451\u043a',
      loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', emptyTok: '\u0422\u043e\u043a\u0435\u043d\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b',
      est: '\u041e\u0446\u0435\u043d\u043a\u0430', chartSimple: '\u041e\u0431\u044b\u0447\u043d\u044b\u0439', chartPro: 'Pro TV'
    },
    en: {
      search: 'Search any coin\u2026',
      light: 'Light', dark: 'Dark',
      home: 'Home', port: 'Portfolio', wallet: 'Wallet', news: 'News', tools: 'Tools',
      heatmap: 'Market heatmap', heatHint: 'Size = market cap, color = 24h',
      connect: 'Connect wallet', noWallet: 'No wallet connected', switchW: 'Switch wallet',
      loading: 'Loading\u2026', emptyTok: 'No tokens found', est: 'Estimate',
      chartSimple: 'Simple', chartPro: 'Pro TV'
    }
  };
  function t(k) { return (I18N[lang()] || I18N.en)[k] || k; }
  function applyUILang() {
    var L = lang();
    localStorage.setItem('ct_lang', L);
    var q = $('q');
    if (q) q.placeholder = t('search');
    var tb = $('themeBtn');
    if (tb) {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      tb.textContent = isLight ? t('dark') : t('light');
    }
    var map = { home: 'home', port: 'port', wallet: 'wallet', news: 'news', tools: 'tools' };
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      var p = btn.getAttribute('data-p');
      var span = btn.querySelector('span');
      if (span && map[p]) span.textContent = t(map[p]);
    });
    var ht = document.querySelector('#heatmapCard h2');
    if (ht) ht.textContent = t('heatmap');
    var hh = document.querySelector('#heatmapCard .muted');
    if (hh) hh.textContent = t('heatHint');
    var wc = document.querySelector('#walletConnectCard h2');
    if (wc) wc.textContent = t('connect');
    var rb = $('btnReconnect');
    if (rb) rb.textContent = t('switchW');
    var pro = $('btnProChart');
    if (pro) pro.textContent = chartMode === 'tv' ? t('chartSimple') : t('chartPro');
    updateWS();
  }
  var fxRate = 1, lastMcapUsd = 0;
  async function loadFx() {
    try {
      var d = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(function (r) { return r.json(); });
      var c = cur();
      if (d && d.rates) {
        if (c === 'eur') fxRate = d.rates.EUR || 1;
        else if (c === 'rub') fxRate = d.rates.RUB || 1;
        else if (c === 'pln') fxRate = d.rates.PLN || 1;
        else fxRate = 1;
      }
    } catch (e) { fxRate = 1; }
  }
  async function refreshGlobal() {
    await loadFx();
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/global').then(function (r) { return r.json(); });
      var g = d && d.data; if (!g) return;
      lastMcapUsd = (g.total_market_cap && g.total_market_cap.usd) || 0;
      var btc = g.market_cap_percentage && g.market_cap_percentage.btc;
      if ($('mcapChip') && lastMcapUsd) $('mcapChip').textContent = 'Cap: ' + money(lastMcapUsd * fxRate);
      if ($('domChip') && btc != null) $('domChip').textContent = 'BTC: ' + (+btc).toFixed(1) + '%';
    } catch (e) {}
  }
  setInterval(function () {
    if (!$('mcapChip') || !lastMcapUsd) return;
    var want = 'Cap: ' + money(lastMcapUsd * fxRate);
    if ($('mcapChip').textContent !== want) $('mcapChip').textContent = want;
  }, 2000);
  var heatData = [], heatAt = 0;
  async function loadHeatmap() {
    if (Date.now() - heatAt < 60000 && heatData.length) { paintHeatmap(); return; }
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=28&page=1&sparkline=false&price_change_percentage=24h').then(function (r) { return r.json(); });
      heatData = (d || []).map(function (c) {
        var sym = (c.symbol || '').toUpperCase();
        if (sym === 'TON') sym = 'GRAM';
        return { id: c.id, sym: sym, ch: c.price_change_percentage_24h || 0, mcap: c.market_cap || 0 };
      });
      heatAt = Date.now();
      paintHeatmap();
    } catch (e) {}
  }
  function paintHeatmap() {
    var box = $('heatmapBox'); if (!box || !heatData.length) return;
    var maxM = 1;
    heatData.forEach(function (x) { if (x.mcap > maxM) maxM = x.mcap; });
    var html = '';
    heatData.forEach(function (c) {
      var ch = c.ch;
      var size = Math.max(0.08, Math.min(0.28, Math.sqrt(c.mcap / maxM) * 0.28));
      var bg = ch > 3 ? 'rgba(34,197,94,0.75)' : ch > 0.3 ? 'rgba(34,197,94,0.4)' : ch > -0.3 ? 'rgba(100,90,120,0.35)' : ch > -3 ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.75)';
      var arrow = ch >= 0 ? '\u2191' : '\u2193';
      html += '<div class="heat-cell" data-id="' + c.id + '" style="flex:' + (size * 100).toFixed(1) + ' 1 ' + (size * 90).toFixed(0) + 'px;background:' + bg + '">';
      html += '<div class="heat-sym">' + c.sym + '</div><div class="heat-ch">' + arrow + ' ' + Math.abs(ch).toFixed(2) + '%</div></div>';
    });
    box.innerHTML = html;
    box.querySelectorAll('.heat-cell').forEach(function (el) {
      el.addEventListener('click', function () {
        var row = document.querySelector('#wBody tr[data-id="' + el.getAttribute('data-id') + '"]');
        if (row) row.click();
      });
    });
  }
  function ensureHeatmapUI() {
    if ($('heatmapCard')) { loadHeatmap(); return; }
    var home = $('p-home'); if (!home) return;
    var card = document.createElement('div');
    card.className = 'card'; card.id = 'heatmapCard';
    card.innerHTML = '<h2>' + t('heatmap') + '</h2><div id="heatmapBox" class="heatmap"></div><p class="muted" style="margin-top:.4rem;font-size:.7rem">' + t('heatHint') + '</p>';
    var cards = home.querySelectorAll('.card');
    if (cards.length >= 1) home.insertBefore(card, cards[0].nextSibling);
    else home.appendChild(card);
    loadHeatmap();
  }
  function renameTonToGram() {
    document.querySelectorAll('#wBody tr[data-id]').forEach(function (tr) {
      var id = tr.getAttribute('data-id') || '';
      if (id !== 'the-open-network' && id !== 'toncoin') return;
      tr.querySelectorAll('td').forEach(function (td) {
        if (td.textContent && /\bTON\b/.test(td.textContent)) td.innerHTML = td.innerHTML.replace(/\bTON\b/g, 'GRAM');
      });
    });
    var sy = $('dSym');
    if (sy && (sy.textContent || '').trim().toUpperCase() === 'TON') sy.textContent = 'GRAM';
  }
  var connected = { type: null, address: null };
  function shortAddr(a) {
    if (!a || a.length < 12) return a || '\u2014';
    return a.slice(0, 6) + '\u2026' + a.slice(-4);
  }
  function setNavWalletIcon(on) {
    var btn = document.querySelector('.nav-btn[data-p="wallet"]');
    if (!btn) return;
    var badge = btn.querySelector('.w-badge');
    if (on) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'w-badge';
        badge.textContent = '\u2713';
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      badge.style.display = 'flex';
    } else if (badge) badge.style.display = 'none';
  }
  function enhanceWalletUI() {
    var page = $('p-wallet');
    if (!page) return;
    if (!page._enh) {
      page._enh = 1;
      var card = document.createElement('div');
      card.className = 'card'; card.id = 'walletConnectCard';
      card.innerHTML =
        '<h2>' + t('connect') + '</h2>' +
        '<p class="muted" style="margin-bottom:.5rem">Tonkeeper / Walt \u00b7 MetaMask \u00b7 Phantom</p>' +
        '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">' +
        '<button type="button" class="btn" id="btnTon" style="width:auto;flex:1;min-width:100px;padding:.5rem;font-size:.8rem">GRAM</button>' +
        '<button type="button" class="btn-ghost" id="btnEvm" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">MetaMask</button>' +
        '<button type="button" class="btn-ghost" id="btnSol" style="flex:1;min-width:100px;padding:.5rem;font-size:.8rem">Phantom</button></div>' +
        '<div id="walletStatus" class="muted" style="font-size:.8rem;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem">\u2014</div>' +
        '<button type="button" class="btn-ghost" id="btnReconnect" style="display:none;padding:.35rem .6rem;font-size:.78rem">' + t('switchW') + '</button>' +
        '<div id="walletAnalytics" style="display:none;margin-top:.5rem"></div>';
      var first = page.querySelector('.card');
      if (first) page.insertBefore(card, first); else page.appendChild(card);
      $('btnTon').onclick = connectTON;
      $('btnEvm').onclick = connectEVM;
      $('btnSol').onclick = connectSol;
      $('btnReconnect').onclick = function () {
        connected = { type: null, address: null };
        try { if (window.__tonUI) window.__tonUI.disconnect(); } catch (e) {}
        updateWS();
      };
    }
    updateWS();
  }
  function updateWS() {
    var el = $('walletStatus');
    var rb = $('btnReconnect');
    if (!el) return;
    if (!connected.address) {
      el.innerHTML = t('noWallet');
      if (rb) rb.style.display = 'none';
      if ($('walletAnalytics')) $('walletAnalytics').style.display = 'none';
      setNavWalletIcon(false);
      return;
    }
    var label = connected.type === 'TON' ? 'GRAM' : connected.type;
    el.innerHTML =
      '<span class="w-dot">\u2713</span>' +
      '<span style="color:var(--accent);font-weight:600">' + label + '</span>' +
      ': <b>' + shortAddr(connected.address) + '</b>';
    if (rb) rb.style.display = 'inline-block';
    setNavWalletIcon(true);
    loadWA();
  }
  async function connectTON() {
    var st = $('walletStatus');
    if (st) st.textContent = t('loading');
    try {
      if (!window.TON_CONNECT_UI) {
        await new Promise(function (res, rej) {
          var s = document.createElement('script');
          s.src = 'https://unpkg.com/@tonconnect/ui@2.0.9/dist/tonconnect-ui.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      var UI = window.TON_CONNECT_UI;
      if (!UI) { window.open('https://tonkeeper.com/download', '_blank'); return; }
      if (!window.__tonUI) {
        window.__tonUI = new UI.TonConnectUI({
          manifestUrl: 'https://0xvilya.github.io/crypto-tracker/tonconnect-manifest.json'
        });
      }
      var w = window.__tonUI.wallet;
      if (!w) await window.__tonUI.connectWallet();
      w = window.__tonUI.wallet;
      if (w && w.account) {
        connected = { type: 'TON', address: w.account.address };
        if ($('manChain')) $('manChain').value = 'ton';
        if ($('manAddr')) $('manAddr').value = w.account.address;
        updateWS();
      }
    } catch (e) {
      if (st) st.textContent = lang() === 'ru' ? '\u0412\u0441\u0442\u0430\u0432\u044c\u0442\u0435 \u0430\u0434\u0440\u0435\u0441 \u0432\u0440\u0443\u0447\u043d\u0443\u044e' : 'Paste address manually';
    }
  }
  async function connectEVM() {
    var st = $('walletStatus');
    try {
      if (!window.ethereum) { window.open('https://metamask.app.link/dapp/' + location.host + location.pathname, '_blank'); return; }
      var acc = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (acc && acc[0]) {
        connected = { type: 'EVM', address: acc[0] };
        if ($('manChain')) $('manChain').value = 'eth';
        if ($('manAddr')) $('manAddr').value = acc[0];
        updateWS();
      }
    } catch (e) { if (st) st.textContent = String(e.message || e); }
  }
  async function connectSol() {
    var st = $('walletStatus');
    try {
      var sol = window.solana || (window.phantom && window.phantom.solana);
      if (!sol) { window.open('https://phantom.app/', '_blank'); return; }
      var r = await sol.connect();
      var pk = r && r.publicKey ? r.publicKey.toString() : (sol.publicKey && sol.publicKey.toString());
      if (pk) {
        connected = { type: 'Solana', address: pk };
        if ($('manChain')) $('manChain').value = 'sol';
        if ($('manAddr')) $('manAddr').value = pk;
        updateWS();
      }
    } catch (e) { if (st) st.textContent = String(e.message || e); }
  }
  async function loadWA() {
    var box = $('walletAnalytics');
    if (!box || !connected.address) return;
    box.style.display = 'block';
    box.innerHTML = '<div class="muted">' + t('loading') + '</div>';
    var rows = [];
    var addr = connected.address;
    try {
      var isTon = connected.type === 'TON' || /^[0EU]Q/i.test(addr) || addr.indexOf('0:') === 0;
      if (isTon) {
        var forms = [addr];
        try {
          var parsed = await fetch('https://tonapi.io/v2/address/' + encodeURIComponent(addr) + '/parse').then(function (r) { return r.json(); });
          if (parsed) {
            if (parsed.raw_form) forms.push(parsed.raw_form);
            if (parsed.bounceable && parsed.bounceable.b64url) forms.push(parsed.bounceable.b64url);
            if (parsed.non_bounceable && parsed.non_bounceable.b64url) forms.push(parsed.non_bounceable.b64url);
          }
        } catch (e) {}
        var tonBal = 0, jets = [];
        for (var fi = 0; fi < forms.length; fi++) {
          try {
            var acc = await fetch('https://tonapi.io/v2/accounts/' + encodeURIComponent(forms[fi])).then(function (r) { return r.json(); });
            if (acc && acc.balance != null && Number(acc.balance) > 0) tonBal = Number(acc.balance) / 1e9;
            var jres = await fetch('https://tonapi.io/v2/accounts/' + encodeURIComponent(forms[fi]) + '/jettons?limit=50').then(function (r) { return r.json(); });
            if (jres && jres.balances && jres.balances.length) { jets = jres.balances; break; }
          } catch (e) {}
        }
        var tonPrice = 0;
        try {
          var p = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd').then(function (r) { return r.json(); });
          tonPrice = (p['the-open-network'] && p['the-open-network'].usd) || 0;
        } catch (e) {}
        rows.push({ sym: 'GRAM', name: 'Gram', bal: tonBal, usd: tonBal * tonPrice });
        jets.forEach(function (j) {
          var meta = j.jetton || {};
          var dec = +(meta.decimals != null ? meta.decimals : 9);
          var bal = Number(j.balance || 0) / Math.pow(10, dec);
          if (bal <= 0) return;
          var sym = (meta.symbol || 'JETTON').toUpperCase();
          if (sym === 'TON') sym = 'GRAM';
          var price = (j.price && j.price.prices && j.price.prices.USD) ? +j.price.prices.USD : 0;
          rows.push({ sym: sym, name: meta.name || sym, bal: bal, usd: bal * price });
        });
      } else if (connected.type === 'EVM' || addr.indexOf('0x') === 0) {
        var res = await fetch('https://ethereum.publicnode.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [addr, 'latest'] })
        }).then(function (r) { return r.json(); });
        var eth = (res && res.result ? parseInt(res.result, 16) : 0) / 1e18;
        var p2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(function (r) { return r.json(); });
        rows.push({ sym: 'ETH', name: 'Ethereum', bal: eth, usd: eth * ((p2.ethereum && p2.ethereum.usd) || 0) });
      }
    } catch (e) { console.warn(e); }
    if (!rows.length) {
      box.innerHTML = '<div class="muted">' + t('emptyTok') + '</div>';
      return;
    }
    var total = rows.reduce(function (s, r) { return s + (r.usd || 0); }, 0);
    var html = '<div class="pnl-box" style="margin-bottom:.45rem"><div class="muted">' + t('est') + '</div><div style="font-size:1.15rem;font-weight:700">' + money(total * fxRate) + '</div></div>';
    rows.sort(function (a, b) { return (b.usd || 0) - (a.usd || 0); });
    rows.forEach(function (r) {
      var balStr = r.bal >= 1 ? r.bal.toFixed(4) : r.bal.toFixed(6);
      html += '<div class="hold-row"><div><b>' + r.sym + '</b> <span class="muted" style="font-size:.72rem">' + r.name + '</span></div><span>' + balStr + (r.usd ? ' \u00b7 ' + money(r.usd * fxRate) : '') + '</span></div>';
    });
    box.innerHTML = html;
    if ($('manRes')) $('manRes').innerHTML = html;
  }
  var nCache = { at: 0, items: [], tr: {} };
  async function fetchNews() {
    var items = [];
    try {
      var cg = await fetch('https://api.coingecko.com/api/v3/status_updates?per_page=20').then(function (r) { return r.json(); });
      ((cg && cg.status_updates) || []).forEach(function (u) {
        var title = (u.description || '').replace(/\s+/g, ' ').trim().slice(0, 140);
        if (!title || title.length < 20) return;
        items.push({
          title: title,
          link: (u.project && u.project.id) ? ('https://www.coingecko.com/en/coins/' + u.project.id) : 'https://www.coingecko.com',
          date: u.created_at || '',
          src: (u.project && u.project.name) || 'CoinGecko',
          id: 'cg_' + (u.created_at || Math.random())
        });
      });
    } catch (e) {}
    try {
      var d = await fetch('https://hn.algolia.com/api/v1/search_by_date?query=bitcoin%20OR%20ethereum%20OR%20crypto%20OR%20solana&tags=story&hitsPerPage=25').then(function (r) { return r.json(); });
      var weekAgo = Date.now() - 14 * 864e5;
      (d.hits || []).forEach(function (h) {
        var title = h.title || h.story_title || '';
        if (!title || /^(Show HN|Ask HN|Tell HN)/i.test(title)) return;
        var ts = h.created_at_i ? h.created_at_i * 1000 : Date.parse(h.created_at || 0);
        if (ts && ts < weekAgo) return;
        items.push({
          title: title,
          link: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
          date: h.created_at || '',
          src: 'News',
          id: 'hn_' + h.objectID
        });
      });
    } catch (e) {}
    var seen = {}, out = [];
    items.forEach(function (n) {
      var k = n.title.toLowerCase().slice(0, 60);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(n);
    });
    return out.slice(0, 30);
  }
  async function trTitle(t0) {
    if (!t0 || lang() !== 'ru') return t0;
    if (nCache.tr[t0]) return nCache.tr[t0];
    try {
      var d2 = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=' + encodeURIComponent(t0.slice(0, 400))).then(function (r) { return r.json(); });
      if (Array.isArray(d2) && d2[0]) {
        var o = d2[0].map(function (x) { return x[0]; }).join('');
        if (o) { nCache.tr[t0] = o; return o; }
      }
    } catch (e) {}
    return t0;
  }
  async function loadNews(force) {
    var box = $('newsList'); if (!box) return;
    if (!force && nCache.items.length && Date.now() - nCache.at < 25000) {
      await paintNews();
      return;
    }
    box.innerHTML = '<div class="muted">' + t('loading') + '</div>';
    try {
      nCache.items = await fetchNews();
      nCache.at = Date.now();
    } catch (e) {}
    await paintNews();
  }
  async function paintNews() {
    var box = $('newsList'); if (!box) return;
    var L = lang();
    var limit = Math.min(nCache.items.length, 18);
    if (!limit) { box.innerHTML = '<div class="empty">\u2014</div>'; return; }
    var html = [];
    for (var i = 0; i < limit; i++) {
      var n = nCache.items[i];
      var d = '';
      try {
        d = new Date(n.date).toLocaleString(L === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch (e) {}
      var title = (L === 'ru' && nCache.tr[n.title]) ? nCache.tr[n.title] : n.title;
      html.push('<div class="news-item" data-i="' + i + '"><a href="' + n.link + '" target="_blank" rel="noopener">' + title + '</a><div class="news-meta"><span class="news-src">' + n.src + '</span> ' + d + '</div></div>');
    }
    box.innerHTML = html.join('');
    if (L === 'ru') {
      for (var j = 0; j < limit; j++) {
        (function (idx) {
          trTitle(nCache.items[idx].title).then(function (tr) {
            var a = box.querySelector('.news-item[data-i="' + idx + '"] a');
            if (a) a.textContent = tr;
          });
        })(j);
      }
    }
  }
  var chartMode = 'simple';
  var lastChartId = 'bitcoin';
  var TV_MAP = {
    bitcoin: 'BINANCE:BTCUSDT', ethereum: 'BINANCE:ETHUSDT', solana: 'BINANCE:SOLUSDT',
    binancecoin: 'BINANCE:BNBUSDT', ripple: 'BINANCE:XRPUSDT', cardano: 'BINANCE:ADAUSDT',
    dogecoin: 'BINANCE:DOGEUSDT', monero: 'BINANCE:XMRUSDT',
    'the-open-network': 'OKX:TONUSDT', toncoin: 'OKX:TONUSDT'
  };
  var SYM_ID = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
    TON: 'the-open-network', GRAM: 'the-open-network', XMR: 'monero', ADA: 'cardano', DOGE: 'dogecoin'
  };
  function ensureProBtn() {
    var tabs = $('chartTabs');
    if (!tabs) return;
    var b = $('btnProChart');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.id = 'btnProChart'; b.className = 'tab';
      b.style.marginLeft = 'auto';
      tabs.appendChild(b);
      b.onclick = function (e) {
        e.preventDefault(); e.stopPropagation();
        var sy = (($('dSym') || {}).textContent || '').trim().toUpperCase();
        lastChartId = SYM_ID[sy] || lastChartId || 'bitcoin';
        if (chartMode === 'tv') {
          chartMode = 'simple';
          b.textContent = t('chartPro');
          var on = tabs.querySelector('.tab.on:not(#btnProChart)');
          if (on) on.click();
          else {
            var d1 = tabs.querySelector('.tab[data-d="1"]');
            if (d1) d1.click();
          }
        } else {
          chartMode = 'tv';
          b.textContent = t('chartSimple');
          loadTV(lastChartId);
        }
      };
    }
    b.textContent = chartMode === 'tv' ? t('chartSimple') : t('chartPro');
  }
  var tvReady = null;
  function ensureTV() {
    if (window.TradingView) return Promise.resolve();
    if (tvReady) return tvReady;
    tvReady = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload = function () { res(); };
      s.onerror = function () { res(); };
      document.head.appendChild(s);
    });
    return tvReady;
  }
  async function loadTV(id) {
    var box = $('tv'); if (!box) return;
    lastChartId = id || lastChartId;
    box.style.background = '#12101c';
    box.style.height = '360px';
    box.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b83a8">\u2026</div>';
    await ensureTV();
    if (!window.TradingView) return;
    box.innerHTML = '';
    var cid = 'tvw_' + Date.now();
    var el = document.createElement('div');
    el.id = cid; el.style.cssText = 'height:100%;width:100%';
    box.appendChild(el);
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    try {
      new TradingView.widget({
        autosize: true,
        symbol: TV_MAP[lastChartId] || 'BINANCE:BTCUSDT',
        interval: '15', theme: theme, style: '1',
        locale: lang() === 'ru' ? 'ru' : 'en',
        toolbar_bg: theme === 'dark' ? '#12101c' : '#f5f3fb',
        enable_publishing: false, container_id: cid,
        backgroundColor: theme === 'dark' ? '#12101c' : '#ffffff',
        allow_symbol_change: true, withdateranges: true
      });
    } catch (e) {}
  }
  function injectCSS() {
    if ($('ct-extra-css')) return;
    var s = document.createElement('style');
    s.id = 'ct-extra-css';
    s.textContent =
      '.heatmap{display:flex;flex-wrap:wrap;gap:4px;min-height:120px}' +
      '.heat-cell{border-radius:8px;padding:8px 6px;min-width:56px;min-height:48px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;align-items:center}' +
      '.heat-sym{font-weight:700;font-size:.78rem;color:#fff}' +
      '.heat-ch{font-size:.65rem;color:rgba(255,255,255,.9);margin-top:2px}' +
      '#btnProChart{border:1px solid rgba(168,85,247,.4)!important}' +
      '.w-dot{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#22c55e;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}' +
      '.w-badge{position:absolute;top:2px;right:8px;width:14px;height:14px;border-radius:50%;background:#22c55e;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center}' +
      '.news-item a{line-height:1.35}';
    document.head.appendChild(s);
  }
  function boot() {
    injectCSS();
    applyUILang();
    refreshGlobal();
    setInterval(refreshGlobal, 45000);
    setTimeout(ensureHeatmapUI, 500);
    setInterval(loadHeatmap, 90000);
    setInterval(renameTonToGram, 2500);
    setTimeout(renameTonToGram, 900);
    document.addEventListener('click', function (e) {
      if (e.target.closest('tr[data-id]') && !e.target.closest('.wl-rm')) {
        chartMode = 'simple';
        setTimeout(ensureProBtn, 250);
        setTimeout(renameTonToGram, 400);
      }
      if (e.target.closest('.nav-btn[data-p="wallet"]')) setTimeout(enhanceWalletUI, 120);
      if (e.target.closest('.nav-btn[data-p="news"]')) setTimeout(function () { loadNews(true); }, 150);
      if (e.target.closest('.nav-btn[data-p="home"]')) setTimeout(function () { ensureHeatmapUI(); loadHeatmap(); }, 150);
      if (e.target.closest('#manBtn')) {
        setTimeout(function () {
          var addr = (($('manAddr') || {}).value || '').trim();
          var chain = (($('manChain') || {}).value || '');
          if ((chain === 'ton' || !chain) && addr && (/^[0EU]Q/i.test(addr) || addr.indexOf('0:') === 0)) {
            connected = { type: 'TON', address: addr };
            enhanceWalletUI();
            loadWA();
          }
        }, 600);
      }
    }, true);
    var curSel = $('curSel');
    if (curSel) {
      curSel.addEventListener('change', function () {
        localStorage.setItem('ct_cur', curSel.value);
        setTimeout(refreshGlobal, 100);
      });
    }
    var langSel = $('langSel');
    if (langSel) {
      langSel.addEventListener('change', function () {
        applyUILang();
        setTimeout(function () { loadNews(true); }, 150);
      });
    }
    setTimeout(function () {
      var pw = $('p-wallet');
      if (pw && pw.classList.contains('on')) enhanceWalletUI();
      ensureProBtn();
      ensureHeatmapUI();
      applyUILang();
    }, 700);
    setTimeout(function () { loadNews(true); }, 1200);
    setInterval(function () {
      var pn = $('p-news');
      if (pn && pn.classList.contains('on')) loadNews(false);
    }, 20000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
