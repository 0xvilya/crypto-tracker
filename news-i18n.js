/* news-i18n v140 — force translate news to user language */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() {
    return (localStorage.getItem('ct_lang') || ($('langSel') && $('langSel').value) || 'ru').toLowerCase();
  }

  async function tr(text, L) {
    if (!text || L === 'en') return text;
    if (/[\u0400-\u04FF]/.test(text)) return text;
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + L + '&dt=t&q=' + encodeURIComponent(text.slice(0, 400));
      var r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) return text;
      var j = await r.json();
      var out = '';
      if (j && j[0]) for (var i = 0; i < j[0].length; i++) if (j[0][i] && j[0][i][0]) out += j[0][i][0];
      return out || text;
    } catch (e) { return text; }
  }

  async function translateFeed() {
    var box = $('newsFeed');
    if (!box) return;
    var L = lang();
    if (L === 'en') return;
    var links = box.querySelectorAll('article a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var orig = a.getAttribute('data-orig') || a.textContent;
      if (!a.getAttribute('data-orig')) a.setAttribute('data-orig', orig);
      if (L === 'ru' && !/[\u0400-\u04FF]/.test(a.textContent)) {
        var translated = await tr(orig, 'ru');
        if (translated && translated !== orig) a.textContent = translated;
      }
      if (i % 4 === 3) await new Promise(function (r) { setTimeout(r, 40); });
    }
  }

  function boot() {
    var box = $('newsFeed');
    if (box) {
      new MutationObserver(function () {
        setTimeout(translateFeed, 200);
      }).observe(box, { childList: true });
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn[data-p="news"]')) {
        setTimeout(translateFeed, 800);
        setTimeout(translateFeed, 2500);
      }
    }, true);
    var langSel = $('langSel');
    if (langSel && !langSel.__ni140) {
      langSel.__ni140 = true;
      langSel.addEventListener('change', function () {
        setTimeout(translateFeed, 400);
        setTimeout(translateFeed, 1500);
      });
    }
    setInterval(function () {
      if ($('p-news') && $('p-news').classList.contains('on')) translateFeed();
    }, 25000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
