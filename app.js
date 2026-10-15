/* Crypto Tracker v110 — news HN Algolia, in-place, gas, any coin */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function lang(){var s=$('langSel');return (s&&s.value)||localStorage.getItem('ct_lang')||'ru'}
function cur(){return (localStorage.getItem('ct_cur')||'usd').toLowerCase()}
function money(v){if(v==null||isNaN(v))return '—';var c=cur(),s=c==='eur'?'€':c==='rub'?'₽':c==='pln'?'zł':'$';var n=+v;if(Math.abs(n)>=1000)return s+n.toLocaleString('en-US',{maximumFractionDigits:2});if(Math.abs(n)>=1)return s+n.toFixed(2);if(Math.abs(n)>=0.01)return s+n.toFixed(4);return s+n.toFixed(6)}
var newsCache={at:0,items:[],translated:{}},newsFilter='all',trCache={};
var COINS={},DEFAULTS=['bitcoin','ethereum','solana','binancecoin','ripple','cardano','dogecoin','the-open-network','monero','polkadot'],currentChartId=null,wlBuilt=false;
// NOTE: full app continues in multi-part if needed - loading real file via push_files
console.error('INCOMPLETE');
})();
