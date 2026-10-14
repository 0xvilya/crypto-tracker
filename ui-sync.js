(function(){
  'use strict';

  function safeText(value){
    return value === null || value === undefined ? '—' : String(value);
  }

  function bindNavigation(){
    var buttons = document.querySelectorAll('.nav-btn');
    if (!buttons.length) return;
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        var page = btn.getAttribute('data-p');
        if (!page) return;
        document.querySelectorAll('.page').forEach(function(panel){
          panel.classList.toggle('on', panel.id === 'p-' + page);
        });
        buttons.forEach(function(item){
          item.classList.toggle('on', item === btn);
        });
      });
    });
  }

  function setStatus(nodeId, type, message){
    var node = document.getElementById(nodeId);
    if (!node) return;
    var cls = type || 'muted';
    node.innerHTML = '<div class="empty ' + cls + '">' + safeText(message) + '</div>';
  }

  function showToast(message){
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = safeText(message);
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function(){
      el.classList.remove('show');
    }, 2200);
  }

  function formatCurrency(value, cur){
    var safeCur = String(cur || (window.getCurrency ? window.getCurrency() : 'usd')).toLowerCase();
    var symbols = { usd: '$', eur: '€', rub: '₽', pln: 'zł' };
    var num = Number(value);
    if (!isFinite(num)) return '—';
    var prefix = symbols[safeCur] || '$';
    return prefix + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function bindRefreshButton(){
    var refBtn = document.getElementById('refBtn');
    if (!refBtn) return;
    refBtn.addEventListener('click', function(){
      if (window.CryptoTrackerCore && typeof window.CryptoTrackerCore.refreshPrices === 'function') {
        window.CryptoTrackerCore.refreshPrices();
      }
      if (typeof window.refreshPriceUI === 'function') {
        try { window.refreshPriceUI(); } catch (e) {}
      }
    });
  }

  function bindThemeButton(){
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var dark = document.body.classList.toggle('dark');
      btn.textContent = dark ? 'Light' : 'Dark';
    });
  }

  window.CryptoTrackerUI = {
    bindNavigation: bindNavigation,
    setStatus: setStatus,
    showToast: showToast,
    formatCurrency: formatCurrency,
    bindRefreshButton: bindRefreshButton,
    bindThemeButton: bindThemeButton
  };

  window.showToast = showToast;
  window.refreshPriceUI = function(){
    var trendBox = document.getElementById('trends');
    if (trendBox && trendBox.textContent === '') {
      trendBox.textContent = 'Prices updated';
    }
    var homePrice = document.getElementById('dPrice');
    if (homePrice && homePrice.dataset && homePrice.dataset.value) {
      homePrice.textContent = formatCurrency(homePrice.dataset.value, window.getCurrency ? window.getCurrency() : undefined);
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    bindNavigation();
    bindThemeButton();
    bindRefreshButton();
    setStatus('newsList', 'muted', 'Loading…');
    setStatus('gasBox', 'muted', 'Loading gas…');
  });
})();
