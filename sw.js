/* Todos los archivos de publicación van juntos en la raíz. */
const VERSION='mi-hielo-shell-v5';
const FILES=['./','./index.html','./styles.css','./core.js','./pdf.js','./jspdf.umd.min.js','./app.js','./manifest.webmanifest','./icon.svg','./apple-touch-icon.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('mi-hielo-shell-')&&key!==VERSION).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.open(VERSION).then(async cache=>{
    // Check the network for documents so a published fix can reach existing users.
    if(event.request.mode==='navigate'){
      try{
        const response=await fetch(event.request);
        const start=new URL('./',self.location).pathname;
        const path=new URL(event.request.url).pathname;
        if(response.ok&&(path===start||path===start+'index.html'))await cache.put('./index.html',response.clone());
        return response;
      }catch{return(await cache.match(event.request,{ignoreSearch:true}))||(await cache.match('./index.html'))||Response.error();}
    }
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{return await fetch(event.request);}catch{return Response.error();}
  }));
});
