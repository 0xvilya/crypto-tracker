/* v5.1 hotfixes — load after app.js */
(function () {
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  function $(id) { return document.getElementById(id); }
  function toast(m) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, 2600);
  }

  /* ---- News: no MyMemory, original EN only ---- */
  window.__newsFixed = true;
  var newsList = $('newsList');
  if (newsList && /MYMEMORY/i.test(newsList.textContent || '')) {
    newsList.innerHTML = '<div class="empty">Обновляю новости…</div>';
  }
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-p') === 'news') setTimeout(reloadNewsClean, 100);
    });
  });
  async function reloadNewsClean() {
    var box = $('newsList'); if (!box) return;
    try {
      var RSS = [
        'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://cointelegraph.com/rss'),
        'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/')
      ];
      var all = [];
      for (var i = 0; i < RSS.length; i++) {
        try {
          var data = await fetch(RSS[i]).then(function (r) { return r.json(); });
          (data.items || []).forEach(function (it) {
            var title = it.title || '';
            if (/MYMEMORY|YOU USED ALL AVAILABLE/i.test(title)) return;
            all.push({
              title: title,
              link: it.link,
              date: it.pubDate,
              source: i === 0 ? 'Cointelegraph' : 'CoinDesk',
              desc: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 160)
            });
          });
        } catch (e) {}
      }
      all.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      all = all.slice(0, 30);
      if (!all.length) { box.innerHTML = '<div class="empty">No news</div>'; return; }
      box.innerHTML = all.map(function (n) {
        var d = '';
        try { d = new Date(n.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
        return '<div class="news-item"><a href="' + n.link + '" target="_blank" rel="noopener">' + n.title + '</a><div class="news-meta"><span class="news-src">' + n.source + '</span> ' + d + '</div>' + (n.desc ? '<div class="muted" style="margin-top:.25rem">' + n.desc + '…</div>' : '') + '</div>';
      }).join('');
      var ol = $('outlook');
      if (ol) ol.textContent = '📰 Заголовки на английском (бесплатный перевод недоступен). Фильтры по монетам работают.';
    } catch (e) {
      if (box) box.innerHTML = '<div class="empty">Ошибка загрузки новостей</div>';
    }
  }
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('c4_news') === 0 || k.indexOf('c5_news') === 0) localStorage.removeItem(k);
    });
  } catch (e) {}

  /* ---- Portfolio: any-coin search ---- */
  var mhQ = $('mhQ'), mhSr = $('mhSr'), mhCoin = $('mhCoin'), mhPicked = $('mhPicked');
  var mhSearchT;
  if (mhQ) {
    mhQ.addEventListener('input', function () {
      clearTimeout(mhSearchT);
      var q = mhQ.value.trim();
      if (!q) { if (mhSr) mhSr.style.display = 'none'; return; }
      if (mhSr) { mhSr.style.display = 'block'; mhSr.innerHTML = '<div class="empty">...</div>'; }
      mhSearchT = setTimeout(async function () {
        try {
          var d = await fetch(API + '/search?query=' + encodeURIComponent(q)).then(function (r) { return r.json(); });
          var coins = (d.coins || []).slice(0, 15);
          if (!mhSr) return;
          mhSr.innerHTML = coins.map(function (c) {
            return '<div class="sr-item" data-mid="' + c.id + '" data-mname="' + String(c.name).replace(/"/g, '') + '" data-msym="' + String(c.symbol || '') + '"><img src="' + (c.thumb || '') + '" alt=""/><div><div class="nm">' + c.name + '</div><div class="sy">' + (c.symbol || '') + '</div></div></div>';
          }).join('') || '<div class="empty">—</div>';
        } catch (e) { if (mhSr) mhSr.innerHTML = '<div class="empty">Error</div>'; }
      }, 300);
    });
  }
  if (mhSr) mhSr.addEventListener('click', function (e) {
    var it = e.target.closest('.sr-item'); if (!it) return;
    if (mhCoin) mhCoin.value = it.getAttribute('data-mid');
    if (mhPicked) mhPicked.innerHTML = '<b>' + (it.getAttribute('data-msym') || '').toUpperCase() + '</b> — ' + it.getAttribute('data-mname');
    if (mhQ) mhQ.value = it.getAttribute('data-msym') || it.getAttribute('data-mname');
    mhSr.style.display = 'none';
  });

  /* ---- Tonkeeper: don't use broken ton-connect deep link ---- */
  document.addEventListener('click', function (e) {
    var card = e.target.closest('.w-card[data-wid="tonkeeper"]');
    if (!card) return;
    e.stopPropagation();
    e.preventDefault();
    toast('Вставьте TON-адрес в «Адрес вручную» (сеть TON)');
    var mc = $('manChain'); if (mc) mc.value = 'ton';
    try { window.open('https://app.tonkeeper.com/', '_blank'); } catch (err) {}
  }, true);

  setTimeout(function () {
    var box = $('newsList');
    if (box && /MYMEMORY/i.test(box.innerHTML || '')) reloadNewsClean();
  }, 800);
})();
