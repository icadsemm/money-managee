const CACHE='mm-v4';
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
  const key=isPage?'index.html':r;
  // cache first = opens instantly; fresh copy is fetched in the background for next time
  e.respondWith(
    caches.match(key).then(m=>{
      const net=fetch(r,{cache:'no-cache'}).then(res=>{
        if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(key,copy)).catch(()=>{})}
        return res;
      }).catch(()=>m);
      if(m){e.waitUntil(net.catch(()=>{}));return m}
      return net;
    })
  );
});
