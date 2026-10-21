/* boot-guard v133 — force news tab, block hide */
(function(){
  function force(){
    var nav=document.getElementById('nav');
    if(nav) nav.style.setProperty('grid-template-columns','repeat(6,minmax(0,1fr))','important');
    var btn=document.querySelector('.nav-btn[data-p="news"]');
    if(!btn && nav){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='nav-btn';
      btn.setAttribute('data-p','news');
      var label='News';
      btn.innerHTML='<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg><span>'+label+'</span>';
      var tools=document.querySelector('.nav-btn[data-p="tools"]');
      if(tools) nav.insertBefore(btn,tools); else nav.appendChild(btn);
      btn.addEventListener('click',function(e){
        e.preventDefault();
        if(window.__ct_openNews) window.__ct_openNews();
      });
    }
    if(btn){
      btn.style.setProperty('display','flex','important');
      btn.hidden=false;
      btn.removeAttribute('hidden');
    }
    var page=document.getElementById('p-news');
    if(page && page.classList.contains('on')){
      page.style.setProperty('display','','important');
    }
  }
  force();
  setInterval(force,800);
  document.addEventListener('DOMContentLoaded',force);
  var obs=new MutationObserver(function(){force();});
  if(document.body) obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','hidden','class']});
  else document.addEventListener('DOMContentLoaded',function(){
    obs.observe(document.body,{attributes:true,subtree:true,attributeFilter:['style','hidden','class']});
  });
})();
