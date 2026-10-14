/* v104 patch on top of v103 */
(function(){
  try {
    var curSel = document.getElementById('curSel');
    if (curSel && !curSel._patched) {
      curSel._patched = true;
      curSel.addEventListener('change', function(){
        setTimeout(function(){
          var det = document.getElementById('detail');
          if (det && det.style.display !== 'none') {
            var tabs = document.querySelector('#chartTabs .tab.on');
            if (tabs) tabs.click();
          }
        }, 400);
      });
    }
    var langSel = document.getElementById('langSel');
    if (langSel && !langSel._patched) {
      langSel._patched = true;
      langSel.addEventListener('change', function(){
        setTimeout(function(){
          var ref = document.getElementById('refBtn');
          if (ref) ref.click();
        }, 300);
      });
    }
  } catch(e){}
})();
