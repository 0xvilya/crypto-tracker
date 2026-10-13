(function () {
  'use strict';
  var API = 'https://api.coingecko.com/api/v3';
  console.log('Crypto Tracker v5.3');
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('newsList');
    if (box) box.innerHTML = '<div class="empty">Загрузка…</div>';
  });
})();
