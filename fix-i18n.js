/* v125-i18n */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function lang(){var s=$('langSel');var v=(s&&s.value)||localStorage.getItem('ct_lang')||'ru';localStorage.setItem('ct_lang',v);return v;}
var T={
ru:{crypto:'Крипто',port:'Портфель',wallet:'Кошелёк',stocks:'Акции',news:'Новости',tools:'Инструменты',light:'Светлая',dark:'Тёмная',searchCoin:'Поиск любой монеты…',searchStock:'Поиск акции…',list:'Список',price:'Цена',coin:'Монета',ticker:'Тикер',gainers:'Рост',losers:'Падение',loading:'Загрузка…',converter:'Конвертер',amount:'Сумма',from:'Из',to:'В',months:'Месяцы',growth:'Рост %/год',staking:'Стейкинг',period:'Срок (дней)',compound:'Реинвест',profit:'Цель прибыли',invested:'Вложено',targetPct:'Цель %',gas:'Gas',gasHint:'Оценка стоимости перевода в нативном токене сети',about:'О нас',aboutText:'Crypto Tracker — бесплатный инструмент. Данные с публичных API. Без регистрации.',privacy:'Конфиденциальность',privacyText:'Данные только в браузере (localStorage). Адреса кошельков никуда не уходят.',manPort:'Ручной портфель',portHint:'Выберите монету → кол-во → Добавить',qty:'Кол-во',buy:'Цена покупки',add:'Добавить',total:'Итого',showBal:'Показать',address:'Адрес',chain:'Сеть',stockList:'Список акций',stockPort:'Портфель акций',analysis:'Анализ',allCrypto:'Вся крипта',byCoin:'По монетам',stockMkt:'Фондовый рынок',heatmap:'Тепловая карта',heatHint:'Размер — кап., цвет — 24ч',connect:'Подключить кошелёк',coinNews:'Новости'},
en:{crypto:'Crypto',port:'Portfolio',wallet:'Wallet',stocks:'Stocks',news:'News',tools:'Tools',light:'Light',dark:'Dark',searchCoin:'Search any coin…',searchStock:'Search stock…',list:'Watchlist',price:'Price',coin:'Coin',ticker:'Ticker',gainers:'Gainers',losers:'Losers',loading:'Loading…',converter:'Converter',amount:'Amount',from:'From',to:'To',months:'Months',growth:'Growth %/yr',staking:'Staking',period:'Days',compound:'Compound',profit:'Profit target',invested:'Invested',targetPct:'Target %',gas:'Gas',gasHint:'Estimated transfer cost in native network token',about:'About',aboutText:'Crypto Tracker is a free tool. Public API data. No sign-up.',privacy:'Privacy',privacyText:'Data stays in your browser (localStorage). Wallet addresses are not sent anywhere.',manPort:'Manual portfolio',portHint:'Pick coin → amount → Add',qty:'Qty',buy:'Buy price',add:'Add',total:'Total',showBal:'Show',address:'Address',chain:'Network',stockList:'Stock list',stockPort:'Stock portfolio',analysis:'Analysis',allCrypto:'All crypto',byCoin:'By coin',stockMkt:'Stock market',heatmap:'Heatmap',heatHint:'Size = mcap, color = 24h',connect:'Connect wallet',coinNews:'News'}
};
function t(k){return(T[lang()]||T.en)[k]||k;}
window.__ct_t=t;window.__ct_lang=lang;

function applyLang(){
  var map={home:'crypto',port:'port',wallet:'wallet',stocks:'stocks',news:'news',tools:'tools'};
  document.querySelectorAll('.nav-btn').forEach(function(btn){
    var p=btn.getAttribute('data-p'),sp=btn.querySelector('span');
    if(sp&&map[p])sp.textContent=t(map[p]);
  });
  var tb=$('themeBtn');
  if(tb)tb.textContent=document.documentElement.getAttribute('data-theme')==='light'?t('dark'):t('light');
  if($('q'))$('q').placeholder=t('searchCoin');
  if($('stockQ'))$('stockQ').placeholder=t('searchStock');
  document.querySelectorAll('#p-home .card h2').forEach(function(h){
    var x=(h.textContent||'').trim();
    if(/Список|Watchlist|List/i.test(x))h.textContent=t('list');
    if(/Рост|Gainers/i.test(x))h.textContent=t('gainers');
    if(/Падение|Losers/i.test(x))h.textContent=t('losers');
    if(/Теплов|Heatmap/i.test(x))h.textContent=t('heatmap');
  });
  document.querySelectorAll('#heatmapCard .muted').forEach(function(p){p.textContent=t('heatHint');});
  var tools=$('p-tools');
  if(tools){
    tools.querySelectorAll('.card h2').forEach(function(h){
      var x=(h.textContent||'').replace(/\s*\?.*/,'').trim();
      if(/Конвертер|Converter/i.test(x))h.textContent=t('converter');
      if(/Стейкинг|Staking/i.test(x))h.innerHTML=t('staking')+' <button type="button" class="help-btn" data-help="staking">?</button>';
      if(/Цель|Profit/i.test(x))h.textContent=t('profit');
      if(/^Gas$/i.test(x))h.textContent=t('gas');
      if(/О нас|About/i.test(x))h.textContent=t('about');
      if(/Конфиденц|Privacy/i.test(x))h.textContent=t('privacy');
    });
    tools.querySelectorAll('label').forEach(function(lb){
      var x=(lb.textContent||'').trim();
      if(/Сумма|Amount/i.test(x))lb.textContent=t('amount');
      if(/^(Из|From)$/i.test(x))lb.textContent=t('from');
      if(/^(В|To)$/i.test(x))lb.textContent=t('to');
      if(/Месяц|Months/i.test(x))lb.textContent=t('months');
      if(/Рост|Growth/i.test(x))lb.textContent=t('growth');
      if(/Монета|Coin/i.test(x))lb.textContent=t('coin');
      if(/Срок|Days/i.test(x))lb.textContent=t('period');
      if(/Реинвест|Compound/i.test(x))lb.textContent=t('compound');
      if(/Вложено|Invested/i.test(x))lb.textContent=t('invested');
      if(/Цель %|Target/i.test(x))lb.textContent=t('targetPct');
    });
    tools.querySelectorAll('.muted').forEach(function(p){
      var x=p.textContent||'';
      if(/Оценка стоимости|Estimated transfer/i.test(x))p.textContent=t('gasHint');
      if(/бесплатный инструмент|free tool/i.test(x))p.textContent=t('aboutText');
      if(/localStorage/i.test(x))p.textContent=t('privacyText');
    });
  }
  var port=$('p-port');
  if(port){
    port.querySelectorAll('h2').forEach(function(h){
      if(/портфел|portfolio/i.test(h.textContent||''))h.innerHTML=t('manPort')+' <button type="button" class="help-btn" data-help="port">?</button>';
    });
    port.querySelectorAll('.muted').forEach(function(p){
      if(/Выберите|Pick coin/i.test(p.textContent||''))p.textContent=t('portHint');
      if(/Итого|Total/i.test(p.textContent||''))p.textContent=t('total');
    });
    port.querySelectorAll('label').forEach(function(lb){
      var x=(lb.textContent||'').trim();
      if(/Монета|Coin/i.test(x))lb.textContent=t('coin');
      if(/Кол|Qty/i.test(x))lb.textContent=t('qty');
      if(/покупк|Buy/i.test(x))lb.textContent=t('buy');
    });
    if($('mhAdd'))$('mhAdd').textContent='+ '+t('add');
  }
  var wal=$('p-wallet');
  if(wal){
    wal.querySelectorAll('label').forEach(function(lb){
      var x=(lb.textContent||'').trim();
      if(/Сеть|Network|Chain/i.test(x))lb.textContent=t('chain');
      if(/Адрес|Address/i.test(x))lb.textContent=t('address');
    });
    if($('manBtn'))$('manBtn').textContent=t('showBal');
  }
  document.querySelectorAll('#p-stocks h2').forEach(function(h){
    var x=(h.textContent||'').trim();
    if(/Список|Stock list/i.test(x))h.textContent=t('stockList');
    if(/Рост|Gainers/i.test(x))h.textContent=t('gainers');
    if(/Падение|Losers/i.test(x))h.textContent=t('losers');
    if(/Портфель акц|Stock portfolio/i.test(x))h.textContent=t('stockPort');
  });
  if($('spAdd'))$('spAdd').textContent='+ '+t('add');
  document.querySelectorAll('#newsTabs .tab').forEach(function(tb){
    var nt=tb.getAttribute('data-nt');
    if(nt==='crypto')tb.textContent=t('allCrypto');
    if(nt==='coins')tb.textContent=t('byCoin');
    if(nt==='stocks')tb.textContent=t('stockMkt');
  });
  var th=document.querySelector('#p-stocks thead tr');
  if(th)th.innerHTML='<th>#</th><th>'+t('ticker')+'</th><th>'+t('price')+'</th><th>24h</th>';
  if(window.__ct_paintStocks)window.__ct_paintStocks();
  if(window.__ct_paintNews)window.__ct_paintNews();
}
window.__ct_applyLang=applyLang;

function killHomeStocks(){
  var c=$('stocksCard');if(c)c.remove();
  document.querySelectorAll('#p-home .card').forEach(function(card){
    var h=card.querySelector('h2');
    var txt=(h&&h.textContent||'').trim();
    if(/^(Акции|Stocks)$/i.test(txt))card.remove();
    if(/Крупные акции|нажмите для графика|Major stocks/i.test(card.textContent||''))card.remove();
  });
  var ai=$('aiBox');if(ai){ai.style.display='none';ai.innerHTML='';}
}
setInterval(killHomeStocks,900);
window.__ct_kill=killHomeStocks;

function bootI18n(){
  var langSel=$('langSel');
  if(langSel){
    var saved=localStorage.getItem('ct_lang');if(saved)langSel.value=saved;
    langSel.addEventListener('change',function(){localStorage.setItem('ct_lang',langSel.value);applyLang();});
  }
  setTimeout(applyLang,500);
  document.addEventListener('click',function(e){
    if(e.target.closest('.nav-btn'))setTimeout(function(){applyLang();killHomeStocks();},50);
  },true);
  setInterval(function(){applyLang();killHomeStocks();},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootI18n);else bootI18n();
})();
