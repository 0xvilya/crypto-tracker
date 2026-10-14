/* v105b — exchange-style helpers: search all coins, TON price */
(function () {
  function $(id) { return document.getElementById(id); }

  function afterBoot() {
    enhanceSearch();
    setTimeout(fetchTon, 2000);
    setTimeout(fetchTon, 8000);
  }

  async function fetchTon() {
    try {
      var d = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,toncoin&vs_currencies=usd&include_24hr_change=true').then(function (r) { return r.json(); });
      var p = d['the-open-network'] || d.toncoin;
      if (!p || p.usd == null) return;
      document.querySelectorAll('tr[data-id="toncoin"], tr[data-id="the-open-network"]').forEach(function (tr) {
        var cells = tr.querySelectorAll('td');
        if (cells.length >= 4) {
          var cur = (localStorage.getItem('ct_cur') || 'usd').toLowerCase();
          var val = p.usd;
          var sym = cur === 'eur' ? '\u20ac' : cur === 'rub' ? '\u20bd' : cur === 'pln' ? 'z\u0142' : '$';
          if (cells[2]) cells[2].textContent = sym + (val < 10 ? val.toFixed(4) : val.toFixed(2));
          if (cells[3] && p.usd_24h_change != null) {
            var ch = p.usd_24h_change;
            cells[3].innerHTML = '<span class="' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%</span>';
          }
        }
      });
    } catch (e) {}
  }

  function enhanceSearch() {
    var q = $('q'), sr = $('sr');
    if (!q || !sr) return;
    var timer = null;
    q.setAttribute('placeholder', '\u041f\u043e\u0438\u0441\u043a \u043b\u044e\u0431\u043e\u0439 \u043c\u043e\u043d\u0435\u0442\u044b\u2026');
    q.addEventListener('input', function () {
      clearTimeout(timer);
      var v = (q.value || '').trim();
      if (v.length < 2) return;
      timer = setTimeout(async function () {
        try {
          var d = await fetch('https://api.coingecko.com/api/v3/search?query=' + encodeURIComponent(v)).then(function (r) { return r.json(); });
          var coins = (d.coins || []).slice(0, 15);
          if (!coins.length) return;
          sr.style.display = 'block';
          sr.innerHTML = coins.map(function (c) {
            return '<div class="sr-item" data-cg="' + c.id + '" data-sym="' + (c.symbol || '').toUpperCase() + '" data-name="' + (c.name || '').replace(/"/g, '') + '" data-thumb="' + (c.thumb || '') + '">' +
              (c.thumb ? '<img class="cicon" src="' + c.thumb + '" width="20" height="20"/>' : '') +
              '<b>' + (c.symbol || '').toUpperCase() + '</b> <span class="muted">' + c.name + '</span></div>';
          }).join('');
          sr.querySelectorAll('[data-cg]').forEach(function (el) {
            el.onclick = function () {
              var id = el.getAttribute('data-cg');
              var wl = [];
              try { wl = JSON.parse(localStorage.getItem('ct_wl') || '[]'); } catch (e) {}
              if (wl.indexOf(id) < 0) {
                wl.push(id);
                localStorage.setItem('ct_wl', JSON.stringify(wl));
              }
              var custom = [];
              try { custom = JSON.parse(localStorage.getItem('ct_custom') || '[]'); } catch (e) {}
              custom = custom.filter(function (x) { return x.id !== id; });
              custom.push({
                id: id,
                sym: el.getAttribute('data-sym'),
                name: el.getAttribute('data-name'),
                thumb: el.getAttribute('data-thumb')
              });
              localStorage.setItem('ct_custom', JSON.stringify(custom));
              q.value = '';
              sr.style.display = 'none';
              location.reload();
            };
          });
        } catch (e) {}
      }, 400);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(afterBoot, 1500); });
  } else {
    setTimeout(afterBoot, 1500);
  }
})();
