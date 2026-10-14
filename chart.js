(function(){
  'use strict';

  function buildTooltip(){
    var tip = document.getElementById('chartTooltip');
    if (tip) return tip;
    tip = document.createElement('div');
    tip.id = 'chartTooltip';
    tip.style.position = 'fixed';
    tip.style.pointerEvents = 'none';
    tip.style.zIndex = '100';
    tip.style.padding = '6px 8px';
    tip.style.borderRadius = '8px';
    tip.style.background = 'rgba(10,10,16,0.92)';
    tip.style.color = '#fff';
    tip.style.fontSize = '12px';
    tip.style.boxShadow = '0 12px 32px rgba(0,0,0,.18)';
    tip.style.display = 'none';
    document.body.appendChild(tip);
    return tip;
  }

  function formatPrice(value, cur){
    if (!isFinite(Number(value))) return '—';
    var symbol = { usd: '$', eur: '€', rub: '₽', pln: 'zł' }[(cur || window.getCurrency && window.getCurrency() || 'usd').toLowerCase()] || '$';
    return symbol + Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function renderPriceChart(container, points, options){
    if (!container) return;
    var opts = options || {};
    var values = Array.isArray(points) && points.length ? points : [{ time: Date.now(), value: 0 }];
    var width = container.clientWidth || 600;
    var height = opts.height || 320;
    var canvas = document.createElement('canvas');
    canvas.width = width * window.devicePixelRatio || width;
    canvas.height = height * window.devicePixelRatio || height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.display = 'block';
    canvas.style.borderRadius = '12px';
    container.innerHTML = '';
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    var min = Math.min.apply(null, values.map(function(p){ return p.value; }));
    var max = Math.max.apply(null, values.map(function(p){ return p.value; }));
    var pad = 18;
    var safeMin = min > 0 ? min * 0.98 : min * 0.98;
    var safeMax = max > 0 ? max * 1.02 : max * 1.02 || 1;

    ctx.strokeStyle = 'rgba(148,163,184,0.28)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++) {
      var y = pad + ((height - pad * 2) / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();
    }

    ctx.beginPath();
    values.forEach(function(item, idx){
      var x = pad + (idx / Math.max(values.length - 1, 1)) * (width - pad * 2);
      var y = height - pad - ((item.value - safeMin) / Math.max(safeMax - safeMin, 0.0001)) * (height - pad * 2);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = opts.color || '#67e8f9';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    var pointsData = values.map(function(item, idx){
      var x = pad + (idx / Math.max(values.length - 1, 1)) * (width - pad * 2);
      var y = height - pad - ((item.value - safeMin) / Math.max(safeMax - safeMin, 0.0001)) * (height - pad * 2);
      return { x: x, y: y, value: item.value, time: item.time };
    });

    var tip = buildTooltip();
    canvas.onmousemove = function(evt){
      var rect = canvas.getBoundingClientRect();
      var localX = evt.clientX - rect.left;
      var localY = evt.clientY - rect.top;
      var set = null;
      var best = Infinity;
      pointsData.forEach(function(pt){
        var dx = pt.x - localX;
        var dy = pt.y - localY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < best) { best = dist; set = pt; }
      });
      if (!set) return;
      tip.style.display = 'block';
      tip.textContent = formatPrice(set.value, window.getCurrency && window.getCurrency()) + ' • ' + new Date(set.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tip.style.left = (evt.clientX + 12) + 'px';
      tip.style.top = (evt.clientY + 12) + 'px';
    };
    canvas.onmouseleave = function(){ tip.style.display = 'none'; };

    var last = pointsData[pointsData.length - 1];
    if (last) {
      ctx.fillStyle = opts.color || '#67e8f9';
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.CryptoTrackerChart = {
    renderPriceChart: renderPriceChart,
    formatPrice: formatPrice
  };
})();
