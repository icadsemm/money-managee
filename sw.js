const CACHE='mm-v3';
const CORE=['./','index.html','manifest.json','kucing-192.png','kucing-512.png'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin)return;
  const isPage=r.mode==='navigate'||u.pathname.endsWith('.html')||u.pathname.endsWith('/');
  if(isPage){
    // page: network first (always latest), cache only as offline fallback
    e.respondWith(
      fetch(r,{cache:'no-cache'}).then(res=>{
        const copy=res.clone();caches.open(CACHE).then(c=>c.put('index.html',copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('index.html').then(m=>m||caches.match('./')))
    );
    return;
  }
  // other files: cache first, refresh in background
  e.respondWith(
    caches.match(r).then(m=>{
      const net=fetch(r).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{})}return res}).catch(()=>m);
      return m||net;
    })
  );
});
