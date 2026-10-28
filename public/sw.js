const CACHE="penge-static-v2";const FILES=["/app-icons/penge-192-v2.png","/app-icons/penge-512-v2.png","/app-icons/penge-apple-180-v2.png","/app-icons/penge-maskable-512-v2.png","/app-icons/penge-favicon-48-v2.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method==="GET"&&u.origin===self.location.origin&&FILES.includes(u.pathname))e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
