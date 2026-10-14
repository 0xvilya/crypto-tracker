const CACHE='ct-v90';
const ASSETS=['./','./index.html','./styles.css','./core.js','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(res=>{try{const url=e.request.url;if(res.ok&&url.includes('0xvilya.github.io')&&!url.includes('api.')){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{})}}catch(err){}return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
