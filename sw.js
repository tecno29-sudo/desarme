// Desarme Notebooks · funciona sin internet. Sube CACHE al cambiar archivos.
const CACHE='desarme-v1';
const SHELL=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  const propio=u.origin===location.origin, fuentes=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if(!propio&&!fuentes) return;  // la planilla de Google nunca se guarda en caché
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(r,{ignoreSearch:propio});
    const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque') c.put(r,res.clone()); return res}).catch(()=>hit);
    return hit||net;
  }));
});
