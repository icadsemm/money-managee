const CACHE='mm-v7';
const CORE=['./','index.html','manifest.json','kucing-192.png','kucing-512.png'];
// ---- kesan versi baru secara automatik (bandingkan hash index.html) ----
async function hashBuf(buf){
  const d=await crypto.subtle.digest('SHA-256',buf);
  return Array.from(new Uint8Array(d).slice(0,6)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
self.addEventListener('message',e=>{
  const d=e.data||{},src=e.source;if(!src)return;
  if(d.type==='GET_BUILD'){
    e.waitUntil((async()=>{try{
      const m=await caches.match('index.html');
      if(m)src.postMessage({type:'BUILD',run:await hashBuf(await m.arrayBuffer())});
    }catch(x){}})());
  }else if(d.type==='CHECK_BUILD'){
    e.waitUntil((async()=>{try{
      const res=await fetch('index.html',{cache:'no-store'});
      if(!res||!res.ok){src.postMessage({type:'BUILD',err:1});return}
      const copy=res.clone();
      const buf=await res.arrayBuffer();
      const c=await caches.open(CACHE);await c.put('index.html',copy);
      src.postMessage({type:'BUILD',latest:await hashBuf(buf)});
    }catch(x){src.postMessage({type:'BUILD',err:1})}})());
  }
});
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
  const net=()=>fetch(r,{cache:'no-cache'}).then(res=>{
    if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(key,copy)).catch(()=>{})}
    return res;
  });
  if(isPage){
    e.respondWith(
      caches.match(key).then(m=>{
        const n=net();
        if(!m)return n;
        const slow=new Promise(ok=>setTimeout(()=>ok(m),2500));
        e.waitUntil(n.catch(()=>{}));
        return Promise.race([n.catch(()=>m),slow]);
      })
    );
    return;
  }
  e.respondWith(
    caches.match(key).then(m=>{
      const n=net().catch(()=>m);
      if(m){e.waitUntil(n.catch(()=>{}));return m}
      return n;
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
