/* core-ui v160 — retired.
   News is owned by news-live.js, stocks by stocks-live.js.
   This file stays so old bookmarks do not 404, and it must not
   rewrite the news feed or the stock table. */
(function () {
  'use strict';
  try { localStorage.setItem('ct_lang', 'en'); } catch (e) {}
  try {
    if ((localStorage.getItem('ct_cur') || '') === 'rub') localStorage.setItem('ct_cur', 'usd');
  } catch (e) {}
})();
