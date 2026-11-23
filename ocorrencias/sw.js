/* ============================================================
   OCORRÊNCIAS DE MANUTENÇÃO — service worker do modo offline (PATCH SP-37)
   Guarda no celular tudo o que o Serviços Públicos precisa para abrir e
   trabalhar SEM INTERNET: a tela do app, as bibliotecas (mapa, Excel,
   Firebase, leitor de fotos), o leitor de OCR (Tesseract, idioma português)
   e os pedaços do mapa que a pessoa já abriu com internet.
   O código do programa NÃO fica aqui: ele vem do servidor só para quem tem
   login e liberação, e é guardado no IndexedDB pelo /ocorrencias/index.html.
   ============================================================ */
const VERSAO = 'tc-off-v1';
const C_APP = VERSAO + '-app';        // tela, ícones, scripts do site e bibliotecas
const C_MAPA = 'tc-off-mapa';         // pedaços do mapa vistos (não muda com a versão)
const C_FOTOS = 'tc-off-fotoscampo';  // /manutencao/fotos-campo/ vistas
const MAX_MAPA = 6000;

const LOCAIS = [
  '/ocorrencias/', '/ocorrencias/manifest.webmanifest',
  '/ocorrencias/offline-lib.js', '/ocorrencias/dentro-do-app.js',
  '/ocorrencias/icones/icone-192.png', '/ocorrencias/icones/icone-512.png',
  '/ocorrencias/icones/icone-maskable-512.png', '/ocorrencias/icones/apple-touch-icon.png',
  '/ocorrencias/lib/tesseract/tesseract.min.js', '/ocorrencias/lib/tesseract/worker.min.js',
  '/ocorrencias/lib/tesseract/tesseract-core-simd-lstm.wasm.js', '/ocorrencias/lib/tesseract/tesseract-core-lstm.wasm.js',
  '/ocorrencias/lib/tesseract/por.traineddata.gz',
  '/firebase-config.js', '/assistente-abas.js', '/estado-pagina.js'
];
const LEAF = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
const FB = 'https://www.gstatic.com/firebasejs/12.19.0/';
const EXTERNOS = [
  LEAF + 'leaflet.min.css', LEAF + 'leaflet.min.js',
  LEAF + 'images/layers.png', LEAF + 'images/layers-2x.png', LEAF + 'images/marker-icon.png',
  LEAF + 'images/marker-icon-2x.png', LEAF + 'images/marker-shadow.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js',
  FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js'
];
const TODOS = LOCAIS.concat(EXTERNOS);

const ehMapa = u => /(^|\.)tile\.openstreetmap\.org$/.test(u.hostname);
const ehExterno = u => u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'cdn.jsdelivr.net' || (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));
const ehSite = u => u.origin === self.location.origin;

async function guardar(cache, url){
  const ext = !url.startsWith('/');
  const r = await fetch(url, ext ? {mode: 'cors', credentials: 'omit', cache: 'reload'} : {cache: 'reload'});
  if(!r.ok) throw new Error(url + ': ' + r.status);
  await cache.put(url, r);
}

/* baixa tudo; avisa as telas abertas do andamento (barra de progresso da instalação) */
async function baixarTudo(forcar){
  const cache = await caches.open(C_APP);
  const falhas = [];
  let feito = 0;
  const avisa = async (fim) => {
    const cl = await self.clients.matchAll({includeUncontrolled: true});
    cl.forEach(c => c.postMessage({tcoff: 'progresso', feito, total: TODOS.length, falhas, fim: !!fim}));
  };
  for(const url of TODOS){
    try{
      if(forcar || !(await cache.match(url))) await guardar(cache, url);
    }catch(e){ falhas.push(url); }
    feito++; avisa(false);
  }
  await avisa(true);
  return falhas;
}

self.addEventListener('install', ev => {
  /* só o essencial bloqueia a instalação; o resto vai em seguida (com progresso) */
  ev.waitUntil(caches.open(C_APP).then(c => c.addAll(['/ocorrencias/', '/ocorrencias/offline-lib.js'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    for(const k of await caches.keys()) if(k.startsWith('tc-off-v') && !k.startsWith(VERSAO)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', ev => {
  const d = ev.data || {};
  if(d.tcoff === 'baixar') ev.waitUntil(baixarTudo(!!d.forcar));
  if(d.tcoff === 'situacao') ev.waitUntil((async () => {
    const cache = await caches.open(C_APP); const faltam = [];
    for(const u of TODOS) if(!(await cache.match(u))) faltam.push(u);
    const m = await caches.open(C_MAPA); const n = (await m.keys()).length;
    ev.source && ev.source.postMessage({tcoff: 'situacao', faltam, mapa: n});
  })());
});

/* mapa: com internet busca o pedaço novo (e guarda); sem internet, ou se demorar, usa o guardado */
async function mapa(req){
  const cache = await caches.open(C_MAPA);
  const guardado = await cache.match(req.url);
  if(guardado && !self.navigator.onLine) return guardado;
  try{
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), guardado ? 3500 : 12000);
    const r = await fetch(req.url, {mode: 'cors', credentials: 'omit', signal: ctl.signal}).catch(() => fetch(req.url, {mode: 'no-cors', signal: ctl.signal}));
    clearTimeout(t);
    if(r && (r.ok || r.type === 'opaque')){
      cache.put(req.url, r.clone()).then(async () => {
        if(Math.random() < 0.02){ const ks = await cache.keys(); for(let i = 0; i < ks.length - MAX_MAPA; i++) await cache.delete(ks[i]); }
      }).catch(() => {});
      return r;
    }
    return guardado || r;
  }catch(e){
    if(guardado) return guardado;
    return new Response('', {status: 504, statusText: 'sem internet e sem o mapa guardado'});
  }
}

/* arquivos que mudam pouco: guardado primeiro e atualiza por trás quando há internet */
async function guardadoPrimeiro(req, nomeCache, atualizar){
  const cache = await caches.open(nomeCache);
  const chave = req.url;
  const g = await cache.match(chave, {ignoreSearch: true});
  const rede = () => fetch(req).then(r => { if(r && (r.ok || r.type === 'opaque')) cache.put(chave, r.clone()).catch(() => {}); return r; });
  if(g){ if(atualizar && self.navigator.onLine) rede().catch(() => {}); return g; }
  try{ return await rede(); }
  catch(e){ return new Response('', {status: 504, statusText: 'sem internet'}); }
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if(req.method !== 'GET') return;
  let u; try{ u = new URL(req.url); }catch(_){ return; }
  if(ehMapa(u)){ ev.respondWith(mapa(req)); return; }
  if(ehExterno(u)){ ev.respondWith(guardadoPrimeiro(req, C_APP, false)); return; }
  if(!ehSite(u)) return;   /* Firestore, Nominatim etc.: direto na rede */
  if(req.mode === 'navigate' && u.pathname.startsWith('/ocorrencias/')){
    ev.respondWith((async () => {
      const cache = await caches.open(C_APP);
      const g = await cache.match('/ocorrencias/');
      const rede = fetch('/ocorrencias/', {cache: 'no-cache'}).then(r => { if(r.ok) cache.put('/ocorrencias/', r.clone()); return r; });
      if(g){ rede.catch(() => {}); return g; }
      return rede;
    })());
    return;
  }
  if(u.pathname.startsWith('/manutencao/fotos-campo/')){ ev.respondWith(guardadoPrimeiro(req, C_FOTOS, false)); return; }
  const p = u.pathname;
  if(p.startsWith('/ocorrencias/') || p === '/firebase-config.js' || p === '/assistente-abas.js' || p === '/estado-pagina.js'){
    ev.respondWith(guardadoPrimeiro(req, C_APP, !p.startsWith('/ocorrencias/lib/')));
  }
});
