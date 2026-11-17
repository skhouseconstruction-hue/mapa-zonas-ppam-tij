'use strict';

// v40: prioriza siempre la versión publicada y conserva una copia para uso sin conexión.
const CACHE_NAME='ppam-tij-admin-v40';
const APP_FILES=[
  './admin.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-192.svg',
  './icon-512.svg'
];

async function saveInCache(request,response){
  if(!response || !response.ok || response.type==='opaque') return response;
  try {
    const cache=await caches.open(CACHE_NAME);
    await cache.put(request,response.clone());
  } catch(error) {
    // Un fallo de caché no debe impedir que se entregue la respuesta de red.
  }
  return response;
}

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;

  const url=new URL(request.url);

  // Google Maps, mosaicos y servicios externos siempre se consultan directamente.
  if(url.origin!==self.location.origin) return;

  // Los datos compartidos siempre se solicitan a la red; la copia local es solo respaldo.
  if(url.pathname.endsWith('/data.json')){
    event.respondWith(
      fetch(new Request(request,{cache:'no-store'}))
        .catch(()=>caches.match(request))
    );
    return;
  }

  // HTML: primero la publicación más reciente. Si no hay conexión, usa esa misma página
  // guardada; nunca entrega admin.html como sustituto de index.html o safi.html.
  if(request.mode==='navigate' || /\\.html$/i.test(url.pathname)){
    event.respondWith(
      fetch(new Request(request,{cache:'no-store'}))
        .then(response=>saveInCache(request,response))
        .catch(async()=>{
          const cached=await caches.match(request,{ignoreSearch:true});
          if(cached) return cached;
          if(url.pathname.endsWith('/admin.html')){
            return (await caches.match('./admin.html')) || Response.error();
          }
          return Response.error();
        })
    );
    return;
  }

  // Para recursos del mismo sitio también se prefiere la versión más reciente.
  event.respondWith(
    fetch(request)
      .then(response=>saveInCache(request,response))
      .catch(()=>caches.match(request))
  );
});
