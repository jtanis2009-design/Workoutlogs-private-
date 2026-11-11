/* Workout Log offline shell: fresh copy when online, saved copy when not. */
var CACHE='workout-log-v1';
var SHELL=['./','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(SHELL).catch(function(){ return c.add('./'); });
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin) return;   /* AI and food lookups go straight out */
  e.respondWith(new Promise(function(resolve){
    var settled=false;
    var fromCache=function(){
      return caches.match(req,{ignoreSearch:true}).then(function(hit){
        return hit||(req.mode==='navigate'?caches.match('./'):undefined);
      });
    };
    var slow=setTimeout(function(){               /* weak gym signal: do not hang on the network */
      fromCache().then(function(hit){ if(hit&&!settled){ settled=true; resolve(hit); } });
    },3000);
    fetch(req).then(function(res){
      clearTimeout(slow);
      if(res&&res.ok){ var copy=res.clone(); caches.open(CACHE).then(function(c){ c.put(req,copy); }); }
      if(!settled){ settled=true; resolve(res); }
    }).catch(function(){
      clearTimeout(slow);
      fromCache().then(function(hit){
        if(!settled){ settled=true; resolve(hit||new Response('Offline',{status:503,statusText:'Offline'})); }
      });
    });
  }));
});
