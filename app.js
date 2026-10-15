/* Crypto Tracker v107 — load full from raw if stub */
(function(){
var s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/gh/0xvilya/crypto-tracker@972d93fa164ab67cedce30b02f3986956d7d71be/app.js';
s.onerror=function(){console.error('v107 load failed')};
document.head.appendChild(s);
// Patch after load
setTimeout(function(){
  // Fix news if old loader
  if(typeof loadNews==='function'){
    var _ln=loadNews;
  }
},2000);
})();
