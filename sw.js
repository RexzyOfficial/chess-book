const C="cb-1795364763",F=["./config.js", "./icon-192.png", "./icon-512.png", "./manifest.json", "./index.html", "./style.css", "./app.js", "./vendor/chess-classic.js", "./vendor/stockfish-19-lite-single.js", "./vendor/stockfish-19-lite-single.wasm", "./pieces/wK.svg", "./pieces/wQ.svg", "./pieces/wR.svg", "./pieces/wB.svg", "./pieces/wN.svg", "./pieces/wP.svg", "./pieces/bK.svg", "./pieces/bQ.svg", "./pieces/bR.svg", "./pieces/bB.svg", "./pieces/bN.svg", "./pieces/bP.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!="GET"||u.origin!=location.origin)return;
const heavy=/\/(vendor|pieces)\//.test(u.pathname);
if(heavy)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
else e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
