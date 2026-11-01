const CACHE='mm-v5';
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

// ---- notifikasi push (FCM, data-only) ----
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){}
  const x=d.data||d.notification||d||{};
  const title=x.title||'Money Manage',body=x.body||'';
  e.waitUntil(self.registration.showNotification(title,{body,icon:'kucing-192.png',badge:'kucing-192.png',tag:x.tag||'mm',data:{url:x.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
    for(const c of l){if('focus' in c)return c.focus()}
    return self.clients.openWindow(url);
  }));
});
