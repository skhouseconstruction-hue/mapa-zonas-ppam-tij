'use strict';
const CACHE_NAME='ppam-tij-admin-v23';
const APP_FILES=['./admin.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-192.svg','./icon-512.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Google Maps, sus mosaicos y servicios siempre deben ir a la red.
  if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/data.json')){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>response).catch(()=>caches.match(request)));
    return;
  }
  if(request.mode==='navigate'){
    event.respondWith(fetch(new Request(request,{cache:'no-store'})).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./admin.html',copy));}
      return response;
    }).catch(()=>caches.match('./admin.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
    return response;
  })));
});
