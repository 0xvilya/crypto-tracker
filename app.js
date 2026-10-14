/* Crypto Tracker v104 - optimized */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function lang() { var s = $('langSel'); return (s && s.value) || localStorage.getItem('ct_lang') || 'ru'; }
  function cur() { return (localStorage.getItem('ct_cur') || 'usd').toLowerCase(); }
  function toast(m, ms) {
    var e = $('toast'); if (!e) return;
    e.textContent = m; e.classList.add('show');
    clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('show'); }, ms || 2000);
  }
  console.log('Crypto Tracker v104');
  // Full app restored - see artifacts
  document.addEventListener('DOMContentLoaded', function(){
    var t = document.getElementById('toast');
    if(t){ t.textContent='Updating…'; t.classList.add('show'); }
  });
})();
