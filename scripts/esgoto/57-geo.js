/* ════════════════════════════════════════════════════════════════════
   ES-04 · 🛰 GEORREFERENCIAR (como no Pavimento Intertravado): posiciona a rede sobre o satélite.
   Mapa Leaflet + satélite Esri (o mesmo do Intertravado e do Imagens GoogleEarth), tipo Satélite / Mapa / Rótulos,
   pesquisa de local (OpenStreetMap/Nominatim), coordenadas Lat/Lon ou UTM SIRGAS 2000, colar coordenadas, mover (arrastar ● ou o
   desenho), girar (◎, campo ou Shift + roda), escala, transparência do desenho e da imagem, aparência Realista/Técnico,
   níveis, pontos de controle (PV com coordenada → ajuste por mínimos quadrados), projeto já em UTM (locação exata),
   ✔ Salvar posição (trava) / ✎ Reposicionar, KMZ/KML para o Google Earth, link do Google Maps e satélite no chão do 3D.
   Estado em P.georef (vai junto com o projeto). Só desenho: nenhum cálculo muda.
   ════════════════════════════════════════════════════════════════════ */
const GEO_L = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.', GEO_M = 111320;
const GEO_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
let GM = null;   /* mapa aberto: {map, camadas, marcadores} */
function geoG() { if (!P.georef) P.georef = {lat: null, lng: null, rot: 0, esc: 100, opD: 85, opS: 100, base: 'sat', vis: 'real', fix: false, modo: 'dec', ctrl: [], niv: {ruas: 1, rede: 1, pvs: 1, lotes: 1, rot: 1}}; const g = P.georef; if (!g.niv) g.niv = {ruas: 1, rede: 1, pvs: 1, lotes: 1, rot: 1}; if (!g.ctrl) g.ctrl = []; return g; }
function geoEhUTM() { const xs = P.nos.map(n => n.x).concat(P.ruas.flatMap(r => r.pts.map(q => q.x))), ys = P.nos.map(n => n.y).concat(P.ruas.flatMap(r => r.pts.map(q => q.y))); if (!xs.length) return false;
  return Math.min(...xs) > 160000 && Math.max(...xs) < 840000 && Math.min(...ys) > 1000000 && Math.max(...ys) < 10000000; }
function geoPronto() { const g = P.georef; return !!(g && ((g.utm && g.zona) || (g.lat != null && g.lng != null))); }
function geoCentroProj() { const g = geoG(); if (g.cx == null) { const L = limites(); g.cx = +(L.x + L.w / 2).toFixed(3); g.cy = +(L.y + L.h / 2).toFixed(3); } return [g.cx, g.cy]; }
/* ponto do projeto (x, y em metros) → [lat, lng] */
function geoLL(x, y) { const g = geoG();
  if (g.utm && g.zona) return geoDeUTM(x, y, +g.zona, g.hem !== 'N');
  const c = geoCentroProj(), k = (g.esc || 100) / 100, th = (g.rot || 0) * Math.PI / 180, dx = (x - c[0]) * k, dy = (y - c[1]) * k;
  const e = dx * Math.cos(th) - dy * Math.sin(th), n = dx * Math.sin(th) + dy * Math.cos(th); return [g.lat + n / GEO_M, g.lng + e / (GEO_M * Math.cos(g.lat * Math.PI / 180))]; }
/* UTM SIRGAS 2000 (cópia do Intertravado) */
function geoParaUTM(lat, lng, zona) { const a = 6378137, f = 1 / 298.257222101, k0 = .9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2); const z = zona || Math.floor((lng + 180) / 6) + 1, l0 = ((z - 1) * 6 - 180 + 3) * Math.PI / 180, ph = lat * Math.PI / 180, l = lng * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(ph) ** 2), T = Math.tan(ph) ** 2, C = ep2 * Math.cos(ph) ** 2, A = Math.cos(ph) * (l - l0);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * ph - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * ph) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * ph) - (35 * e2 ** 3 / 3072) * Math.sin(6 * ph));
  const E = 500000 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120), Nn = k0 * (M + N * Math.tan(ph) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720)) + (lat < 0 ? 1e7 : 0);
  return {e: E, n: Nn, z}; }
function geoDeUTM(E, Nn, z, sul) { const a = 6378137, f = 1 / 298.257222101, k0 = .9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const x = E - 500000, y = sul ? Nn - 1e7 : Nn, M = y / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(p1) ** 2, 1.5), D = x / (N1 * k0);
  const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = ((z - 1) * 6 - 180 + 3) * Math.PI / 180 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / Math.cos(p1);
  return [lat * 180 / Math.PI, lon * 180 / Math.PI]; }
function geoNums(t) { return (String(t).match(/-?\d+(?:[.,]\d+)?/g) || []).map(v => parseFloat(v.replace(',', '.'))); }
/* pontos de controle: PV com coordenada conhecida → giro + deslocamento por mínimos quadrados (escala 100 %) */
function geoAjustar() { const g = geoG(), Q = g.ctrl.map(q => { const n = noDe(q.no); return n && q.lat != null && q.lng != null ? {p: [n.x, n.y], lat: +q.lat, lng: +q.lng, q} : null; }).filter(Boolean); if (!Q.length) return null;
  const c = geoCentroProj(), la0 = Q.reduce((a, q) => a + q.lat, 0) / Q.length, ln0 = Q.reduce((a, q) => a + q.lng, 0) / Q.length, kx = GEO_M * Math.cos(la0 * Math.PI / 180);
  const E = Q.map(q => [(q.lng - ln0) * kx, (q.lat - la0) * GEO_M]), pm = [0, 0]; Q.forEach(q => { pm[0] += q.p[0] / Q.length; pm[1] += q.p[1] / Q.length; });
  let th = (g.rot || 0) * Math.PI / 180; if (Q.length >= 2) { let a = 0, b = 0; Q.forEach((q, i) => { const px = q.p[0] - pm[0], py = q.p[1] - pm[1]; a += px * E[i][1] - py * E[i][0]; b += px * E[i][0] + py * E[i][1]; }); th = Math.atan2(a, b); }
  const Rr = v => [v[0] * Math.cos(th) - v[1] * Math.sin(th), v[0] * Math.sin(th) + v[1] * Math.cos(th)], cc = Rr([c[0] - pm[0], c[1] - pm[1]]);
  const res = Q.map((q, i) => { const w = Rr([q.p[0] - pm[0], q.p[1] - pm[1]]); return Math.hypot(w[0] - E[i][0], w[1] - E[i][1]); });
  Object.assign(g, {lat: la0 + cc[1] / GEO_M, lng: ln0 + cc[0] / kx, rot: Math.round(th * 18000 / Math.PI) / 100, esc: 100, utm: false});
  return {n: Q.length, rms: Math.sqrt(res.reduce((a, x) => a + x * x, 0) / res.length), max: Math.max(...res)}; }
/* geometria a desenhar no mapa (em coordenadas do projeto) */
function geoFeicoes() {
  const out = {pista: [], calc: [], mf: [], rede: [], pvs: [], lotes: [], eixo: []}; if (!R.ok) return out;
  const RU = rlRuas(), w = RU.w, al = RU.alin, lin = (P0, o, n) => [P0[0] + n[0] * o, P0[1] + n[1] * o];
  RU.S.forEach(s => { out.pista.push([lin(s.A, w, s.n), lin(s.B, w, s.n), lin(s.B, -w, s.n), lin(s.A, -w, s.n)]); if (!s.virt) out.eixo.push([s.A, s.B]);
    const iA = RU.est.get(s.a).findIndex(e => e.s === s && e.p === 'a'), iB = RU.est.get(s.b).findIndex(e => e.s === s && e.p === 'b');
    [['L', 1], ['R', -1]].forEach(([lado, sg]) => { const cA = rlCorte(RU, s.a, iA, lado), cB = rlCorte(RU, s.b, iB, lado === 'L' ? 'R' : 'L'), nn = [s.n[0] * sg, s.n[1] * sg];
      const pt = (o, c) => rlInter(lin(s.A, o, nn), s.u, c.P, c.d) || lin(c.P, o, nn); const i0 = pt(w, cA), i1 = pt(w, cB), m0 = pt(w + 0.15, cA), m1 = pt(w + 0.15, cB), o0 = pt(al, cA), o1 = pt(al, cB);
      if (((i1[0] - i0[0]) * s.u[0] + (i1[1] - i0[1]) * s.u[1]) < 0.05) return; out.mf.push([i0, i1, m1, m0]); out.calc.push([m0, m1, o1, o0]); }); });
  RU.est.forEach((l, no) => { const N = [RU.nos.get(no).x, RU.nos.get(no).y], n = l.length; if (n < 2) return; const cant = [];
    for (let i = 0; i < n; i++) { const d = l[i], e = l[(i + 1) % n]; let th = e.ang - d.ang; while (th <= 0) th += 2 * Math.PI; const nd = [-d.u[1], d.u[0]], ne = [e.u[1], -e.u[0]];
      const k = Math.abs(th - Math.PI) < 0.09 ? lin(N, w, nd) : rlInter(lin(N, w, nd), d.u, lin(N, w, ne), e.u); if (k) cant.push(k);
      if (th < Math.PI * 0.97) { const q = [[w, w], [w, al], [al, al], [al, w]].map(([a, b]) => rlInter(lin(N, a, nd), d.u, lin(N, b, ne), e.u)); if (q.every(Boolean)) out.calc.push(q); } }
    if (cant.length > 2) out.pista.push(cant); });
  P.trechos.forEach(t => { const r = R.tr[t.id], a = noDe(t.de), b = noDe(t.para); if (!r || !a || !b) return; const of = ESG.offsetTr(t, R.c), l = Math.hypot(b.x - a.x, b.y - a.y) || 1, ox = -(b.y - a.y) / l * of, oy = (b.x - a.x) / l * of;
    out.rede.push({p: [[a.x + ox, a.y + oy], [b.x + ox, b.y + oy]], r, nome: r.nome || t.id}); });
  P.nos.forEach(n => { const x = R.no[n.id]; if (x) out.pvs.push({p: [n.x, n.y], nome: nomeNo(n), x}); });
  try { ESG.ligacoes(P, R).forEach(q => out.lotes.push(q.lote)); } catch (e) {}
  return out;
}
/* ── janela do mapa ── */
async function geoAbrir() {
  if (!R.ok) return toast('Calcule a rede (Traçado → 🧭 Gerar rede) antes de georreferenciar.');
  if ($('geo-ov')) return; if (RL.andar) rlAndar(false);
  const g = geoG(); geoCentroProj();
  const ov = document.createElement('div'); ov.id = 'geo-ov'; ov.className = 'geo-ov';
  ov.innerHTML = `<div class="geo-map" id="geo-map"><div class="geo-carr">Carregando o mapa…</div></div><div class="geo-pan" id="geo-pan"></div>`;
  document.body.appendChild(ov); document.body.classList.add('geo-on');
  try { if (!window.L) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = GEO_L + 'css'; document.head.appendChild(css); await carregarScript(GEO_L + 'js'); } }
  catch (e) { $('geo-map').innerHTML = '<div class="geo-carr er">Não foi possível carregar o mapa (Leaflet). Verifique a internet.</div>'; geoPainel(); return; }
  if (!$('geo-ov')) return;
  /* posição inicial: projeto em UTM → exato; já posicionado → mesmo lugar; senão Rio das Ostras */
  if (!geoPronto()) { if (geoEhUTM()) Object.assign(g, {utm: true, zona: g.zona || 24, hem: g.hem || 'S'}); else Object.assign(g, {lat: -22.5266, lng: -41.9450}); }
  const L = window.L, map = L.map('geo-map', {zoomControl: true, maxZoom: 21, zoomSnap: 0.25});
  const sat = L.tileLayer(GEO_SAT, {maxZoom: 21, maxNativeZoom: 19, attribution: 'Imagem © Esri, Maxar, Earthstar'});
  const rot = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom: 21, maxNativeZoom: 19});
  const rua = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 21, maxNativeZoom: 19, attribution: '© OpenStreetMap'});
  GM = {map, sat, rot, rua, dese: L.layerGroup().addTo(map), F: geoFeicoes()};
  $('geo-map').querySelector('.geo-carr') && $('geo-map').querySelector('.geo-carr').remove();
  geoBase(g.base || 'sat'); geoDesenha(true); geoPainel();
  /* arrastar o desenho (quando não está travado) */
  let arr = null;
  map.on('mousedown', e => { if (g.fix || g.utm || !e.originalEvent.shiftKey && !GM.sobre) return; arr = {ll: e.latlng, lat: g.lat, lng: g.lng}; map.dragging.disable(); });
  map.on('mousemove', e => { if (!arr) return; g.lat = arr.lat + (e.latlng.lat - arr.ll.lat); g.lng = arr.lng + (e.latlng.lng - arr.ll.lng); geoDesenha(); });
  map.on('mouseup', () => { if (!arr) return; arr = null; map.dragging.enable(); salvar(); geoCampos(); });
  map.getContainer().addEventListener('wheel', e => { if (!e.shiftKey || g.fix || g.utm) return; e.preventDefault(); e.stopPropagation(); g.rot = +(((g.rot || 0) + (e.deltaY > 0 ? 1 : -1) * (e.altKey ? 0.1 : 1)) % 360).toFixed(2); geoDesenha(); geoCampos(); salvar(); }, {capture: true, passive: false});
}
function geoFechar() { if (GM) { try { GM.map.remove(); } catch (e) {} GM = null; } const o = $('geo-ov'); if (o) o.remove(); document.body.classList.remove('geo-on'); salvar(); if (TAB === 't3' && T3.on && RL.vis.sat) rlReconstroi(); if (TAB === 't3') rlPainel(); }
function geoBase(b) { const g = geoG(); g.base = b; if (!GM) return; const m = GM.map; [GM.sat, GM.rot, GM.rua].forEach(t => { if (m.hasLayer(t)) m.removeLayer(t); });
  if (b === 'rua') GM.rua.addTo(m); else { GM.sat.addTo(m); if (b === 'hib') GM.rot.addTo(m); } [GM.sat, GM.rot, GM.rua].forEach(t => t.setOpacity((g.opS == null ? 100 : g.opS) / 100)); if (GM.dese) GM.dese.eachLayer(l => l.bringToFront && l.bringToFront()); }
/* desenha a rede no mapa (refaz tudo: simples e rápido para algumas centenas de feições) */
function geoDesenha(enquadra) {
  if (!GM) return; const L = window.L, g = geoG(), F = GM.F, op = (g.opD == null ? 85 : g.opD) / 100, real = g.vis !== 'tec', nv = g.niv, D = GM.dese; D.clearLayers();
  const ll = p => geoLL(p[0], p[1]), pol = (pts, st) => L.polygon(pts.map(ll), Object.assign({weight: 0, fillOpacity: op, interactive: false}, st)).addTo(D);
  if (nv.lotes) F.lotes.forEach(q => pol(q, {color: '#f59e0b', weight: 1, fill: real, fillColor: '#f3e7cf', fillOpacity: real ? op * 0.35 : 0, opacity: op}));
  if (nv.ruas) { if (real) { F.pista.forEach(q => pol(q, {fillColor: '#4b4d50'})); F.calc.forEach(q => pol(q, {fillColor: '#d6d2c8'})); F.mf.forEach(q => pol(q, {fillColor: '#f2f0ea'})); }
    else F.pista.forEach(q => pol(q, {color: '#e5e7eb', weight: 1, fill: false, opacity: op}));
    F.eixo.forEach(e => L.polyline(e.map(ll), {color: real ? '#f8fafc' : '#94a3b8', weight: 1, dashArray: '6 6', opacity: op, interactive: false}).addTo(D)); }
  if (nv.rede) F.rede.forEach(t => L.polyline(t.p.map(ll), {color: t.r.recq ? '#c026d3' : '#f97316', weight: 3, opacity: Math.min(1, op + 0.15)}).bindTooltip(`${esc(t.nome)} · DN ${t.r.D} · i ${fm(t.r.i * 100, 2)} %`, {sticky: true}).addTo(D));
  if (nv.pvs) F.pvs.forEach(q => { const m = L.circleMarker(ll(q.p), {radius: 4, color: '#0f172a', weight: 1, fillColor: q.x.tipo === 'EEE' ? '#c026d3' : '#e2e8f0', fillOpacity: 1}).addTo(D);
    m.bindPopup(`<b>${esc(q.nome)}</b><br>Tampa ${fm(q.x.ct, 3)} · Fundo ${fm(q.x.cf, 3)}<br>Profundidade ${fm(q.x.ct - q.x.cf, 2)} m`); if (nv.rot) m.bindTooltip(esc(q.nome), {permanent: F.pvs.length < 160, direction: 'top', className: 'geo-tt', offset: [0, -4]}); });
  /* alças: ● mover e ◎ girar (somem com a posição salva ou com o projeto em UTM) */
  if (!g.fix && !g.utm) { const c = geoCentroProj(), Lm = limites(), raio = Math.hypot(Lm.w, Lm.h) / 2 * 0.6 * (g.esc || 100) / 100;
    const th = (g.rot || 0) * Math.PI / 180, cl = [g.lat, g.lng], pr = [g.lat + raio * Math.sin(th) / GEO_M, g.lng + raio * Math.cos(th) / (GEO_M * Math.cos(g.lat * Math.PI / 180))];
    L.polyline([cl, pr], {color: '#2563eb', weight: 2, dashArray: '4 4', interactive: false}).addTo(D);
    const mk = L.marker(cl, {draggable: true, icon: L.divIcon({className: 'geo-h geo-hm', html: '●', iconSize: [22, 22]}), title: 'Arraste para mover o desenho'}).addTo(D);
    mk.on('drag', e => { const p = e.target.getLatLng(); g.lat = p.lat; g.lng = p.lng; }); mk.on('dragend', () => { geoDesenha(); geoCampos(); salvar(); });
    const mr = L.marker(pr, {draggable: true, icon: L.divIcon({className: 'geo-h geo-hr', html: '◎', iconSize: [22, 22]}), title: 'Arraste para girar o desenho'}).addTo(D);
    mr.on('drag', e => { const p = e.target.getLatLng(), dx = (p.lng - g.lng) * GEO_M * Math.cos(g.lat * Math.PI / 180), dy = (p.lat - g.lat) * GEO_M; g.rot = Math.round(Math.atan2(dy, dx) * 18000 / Math.PI) / 100; });
    mr.on('dragend', () => { geoDesenha(); geoCampos(); salvar(); }); }
  if (enquadra) { const b = L.latLngBounds(F.pvs.length ? F.pvs.map(q => ll(q.p)) : [[g.lat || -22.5, g.lng || -41.9]]); GM.map.fitBounds(b.pad(0.25), {maxZoom: 19}); }
  geoLinks();
}
function geoLinks() { const a = $('geo-gm'); if (!a || !geoPronto()) return; const c = geoCentroProj(), p = geoLL(c[0], c[1]); a.href = 'https://www.google.com/maps/@' + p[0].toFixed(6) + ',' + p[1].toFixed(6) + ',18z/data=!3m1!1e3'; }
function geoCampos() { const g = geoG(), q = id => $(id); if (!q('geo-a')) return; const c = geoCentroProj();
  if (g.utm) return;
  if (g.modo === 'utm') { const u = geoParaUTM(g.lat, g.lng); q('geo-a').value = u.e.toFixed(2); q('geo-b').value = u.n.toFixed(2); q('geo-z').value = u.z; }
  else { q('geo-a').value = (+g.lat).toFixed(7); q('geo-b').value = (+g.lng).toFixed(7); }
  q('geo-rot').value = (+g.rot || 0).toFixed(2); q('geo-esc').value = (+g.esc || 100).toFixed(1); }
function geoPainel() {
  const p = $('geo-pan'); if (!p) return; const g = geoG(), u = g.modo === 'utm', utmP = geoEhUTM(), nv = g.niv;
  const ck = (k, t) => `<label class="rl-c"><input type="checkbox" data-geoniv="${k}"${nv[k] ? ' checked' : ''}/> ${t}</label>`;
  const pvs = P.nos.filter(n => R.no[n.id]).map(n => `<option value="${n.id}">${esc(nomeNo(n))}</option>`).join('');
  p.innerHTML = `<div class="rl-h"><b>🛰 Georreferenciar</b><button class="bt peq" data-geo="fechar" title="Fechar e voltar">✕</button></div>
  <div class="geo-s">Posicione a rede sobre o satélite. Fica salvo no projeto (abre no mesmo lugar no 3D e no KMZ).</div>
  <div class="rl-t">Procurar o local</div><div class="rl-g"><input id="geo-q" placeholder="Rua, bairro, cidade…" style="flex:1;min-width:120px"/><button class="bt peq" data-geo="busca">🔍</button></div><div id="geo-res" class="geo-res"></div>
  <div class="rl-t">Tipo do mapa</div><div class="rl-g">${[['sat', 'Satélite'], ['hib', 'Satélite + nomes'], ['rua', 'Mapa']].map(([k, t]) => `<button class="bt peq${(g.base || 'sat') === k ? ' on' : ''}" data-geob="${k}">${t}</button>`).join('')}</div>
  <div class="rl-t">Aparência</div><div class="rl-g"><button class="bt peq${g.vis !== 'tec' ? ' on' : ''}" data-geov="real">🏗 Realista</button><button class="bt peq${g.vis === 'tec' ? ' on' : ''}" data-geov="tec">📐 Técnico</button></div>
  ${ck('ruas', 'Ruas, calçadas e meio-fio')}${ck('rede', 'Rede (trechos)')}${ck('pvs', 'PVs')}${ck('rot', 'Nome dos PVs')}${ck('lotes', 'Lotes')}
  <div class="rl-t">Posição</div>
  ${utmP ? `<label class="rl-c"><input type="checkbox" data-geo="utm"${g.utm ? ' checked' : ''}/> As coordenadas do projeto já são <b>UTM SIRGAS 2000</b> (locação exata)</label>
     ${g.utm ? `<div class="rl-g"><label>Zona <input id="geo-zona" value="${g.zona || 24}" style="width:44px"/></label><label>Hemisfério <select id="geo-hem"><option value="S"${g.hem !== 'N' ? ' selected' : ''}>Sul</option><option value="N"${g.hem === 'N' ? ' selected' : ''}>Norte</option></select></label><button class="bt peq" data-geo="aplUtm">Aplicar</button></div>` : ''}` : ''}
  ${g.utm ? '' : `<div class="rl-g"><button class="bt peq${!u ? ' on' : ''}" data-geom="dec">Lat/Lon</button><button class="bt peq${u ? ' on' : ''}" data-geom="utm">UTM</button><button class="bt peq" data-geo="colar">📋 Colar</button><button class="bt peq" data-geo="centro" title="Coloca o centro do desenho no centro do mapa">⌖ Centro do mapa</button></div>
    <div class="rl-g"><label>${u ? 'E (m)' : 'Lat'} <input id="geo-a" style="width:118px"/></label><label>${u ? 'N (m)' : 'Lon'} <input id="geo-b" style="width:118px"/></label>${u ? '<label>Zona <input id="geo-z" style="width:40px"/></label>' : ''}<button class="bt peq" data-geo="ir">Ir</button></div>
    <div class="rl-g"><label>Giro (°) <input id="geo-rot" style="width:64px"/></label><label>Escala (%) <input id="geo-esc" style="width:60px"/></label></div>
    <div class="geo-s">Arraste o ● vermelho (ou Shift + arrastar o mapa) para mover; o ◎ azul (ou Shift + roda) para girar.</div>`}
  <div class="rl-g"><label>Desenho <input type="range" min="10" max="100" value="${g.opD == null ? 85 : g.opD}" data-geor="opD"/></label><label>Imagem <input type="range" min="10" max="100" value="${g.opS == null ? 100 : g.opS}" data-geor="opS"/></label></div>
  ${g.utm ? '' : `<div class="rl-t">Pontos de controle (PV com coordenada medida)</div>
  <div class="rl-g"><select id="geo-pv">${pvs}</select><input id="geo-pc" placeholder="lat, lon  ou  E N" style="flex:1;min-width:110px"/><button class="bt peq" data-geo="pcAdd">+</button></div>
  ${g.ctrl.length ? '<div class="geo-res">' + g.ctrl.map((q, i) => `<div>${esc(nomeNo(noDe(q.no)))}: ${(+q.lat).toFixed(6)}, ${(+q.lng).toFixed(6)} <button class="bt peq" data-geopc="${i}">✕</button></div>`).join('') + '</div><div class="rl-g"><button class="bt peq pri" data-geo="ajustar">📍 Locar pelos pontos</button></div>' : '<div class="geo-s">Com 2 ou mais pontos o desenho é girado e deslocado sozinho (mínimos quadrados) e o erro aparece aqui.</div>'}
  <div id="geo-info" class="geo-s"></div>`}
  <div class="rl-t">Salvar e exportar</div>
  <div class="rl-g">${g.utm ? '' : `<button class="bt peq pri" data-geo="fix">${g.fix ? '✎ Reposicionar' : '✔ Salvar posição'}</button>`}<button class="bt peq" data-geo="kmz">⬇ KMZ (Google Earth)</button><button class="bt peq" data-geo="kml">KML</button><a class="bt peq" id="geo-gm" target="_blank" rel="noopener">🌎 Google Maps</a></div>
  <div class="geo-s">No 3D, ligue <b>🏘 Cenário › 🛰 Imagem de satélite no chão</b> para ver o satélite sob a rede.</div>`;
  geoCampos(); geoLinks();
}
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-geo],[data-geob],[data-geov],[data-geom],[data-geopc]'); if (!b || !$('geo-ov')) return; const g = geoG(), d = b.dataset;
  if (d.geob) { geoBase(d.geob); salvar(); return geoPainel(); }
  if (d.geov) { g.vis = d.geov; salvar(); geoDesenha(); return geoPainel(); }
  if (d.geom) { g.modo = d.geom; return geoPainel(); }
  if (d.geopc != null) { g.ctrl.splice(+d.geopc, 1); salvar(); return geoPainel(); }
  const a = d.geo;
  if (a === 'fechar') return geoFechar();
  if (a === 'busca') { const q = $('geo-q').value.trim(); if (!q) return; const out = $('geo-res'); out.textContent = 'Procurando…';
    try { const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&q=' + encodeURIComponent(q)); const js = await r.json();
      out.innerHTML = js.length ? js.map(x => `<div><a href="#" data-geoir="${x.lat},${x.lon}">${esc(x.display_name)}</a></div>`).join('') : 'Nada encontrado.'; } catch (er) { out.textContent = 'Sem resposta do serviço de busca (internet?).'; } return; }
  if (a === 'centro') { if (g.utm || !GM) return; const c = GM.map.getCenter(); g.lat = c.lat; g.lng = c.lng; geoDesenha(); geoCampos(); return salvar(); }
  if (a === 'colar') { const t = prompt('Cole as coordenadas do centro do desenho (Lat, Lon em graus, ex.: -22.5266, -41.9450) ou UTM (E N zona):'); if (!t) return; const v = geoNums(t);
    if (v.length >= 2 && Math.abs(v[0]) <= 90 && Math.abs(v[1]) <= 180) { g.lat = v[0]; g.lng = v[1]; } else if (v.length >= 2) { const z = v[2] || 24, ll = geoDeUTM(v[0], v[1], z, true); g.lat = ll[0]; g.lng = ll[1]; } else return toast('Não reconheci as coordenadas.');
    geoDesenha(true); geoCampos(); return salvar(); }
  if (a === 'ir') { const A = geoNums($('geo-a').value)[0], B = geoNums($('geo-b').value)[0]; if (!isFinite(A) || !isFinite(B)) return toast('Coordenada inválida.');
    if (g.modo === 'utm') { const ll = geoDeUTM(A, B, +($('geo-z').value || 24), true); g.lat = ll[0]; g.lng = ll[1]; } else { g.lat = A; g.lng = B; }
    const r = geoNums($('geo-rot').value)[0], s = geoNums($('geo-esc').value)[0]; if (isFinite(r)) g.rot = r; if (isFinite(s) && s > 1) g.esc = s; geoDesenha(true); return salvar(); }
  if (a === 'utm') { g.utm = b.checked; if (g.utm) { g.zona = g.zona || 24; g.hem = g.hem || 'S'; g.fix = true; } else if (g.lat == null) { const ll = geoDeUTM(geoCentroProj()[0], geoCentroProj()[1], 24, true); g.lat = ll[0]; g.lng = ll[1]; g.fix = false; }
    salvar(); geoDesenha(true); return geoPainel(); }
  if (a === 'aplUtm') { g.zona = +($('geo-zona').value) || 24; g.hem = $('geo-hem').value; salvar(); geoDesenha(true); return; }
  if (a === 'pcAdd') { const v = geoNums($('geo-pc').value); if (v.length < 2) return toast('Digite a coordenada do PV: lat, lon (graus) ou E N (UTM).'); let lat = v[0], lng = v[1];
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) { const ll = geoDeUTM(v[0], v[1], v[2] || 24, true); lat = ll[0]; lng = ll[1]; }
    g.ctrl = g.ctrl.filter(q => q.no !== $('geo-pv').value); g.ctrl.push({no: $('geo-pv').value, lat, lng}); salvar(); return geoPainel(); }
  if (a === 'ajustar') { const r = geoAjustar(); if (!r) return; g.fix = false; salvar(); geoDesenha(true); geoPainel(); const i = $('geo-info');
    if (i) i.innerHTML = r.n < 2 ? 'Com 1 ponto o desenho só é deslocado (o giro fica o digitado). Use 2 ou mais para girar.' : `Locado por ${r.n} pontos: erro médio <b>${fm(r.rms, 2)} m</b>, maior <b>${fm(r.max, 2)} m</b>${r.max > 2 ? ' — confira as coordenadas ou a escala do desenho.' : '.'}`; return; }
  if (a === 'fix') { g.fix = !g.fix; salvar(); geoDesenha(); geoPainel(); return toast(g.fix ? 'Posição salva no projeto. ✎ Reposicionar para mexer de novo.' : 'Pode mover e girar o desenho.'); }
  if (a === 'kmz' || a === 'kml') return geoExporta(a);
});
document.addEventListener('click', e => { const x = e.target.closest && e.target.closest('[data-geoir]'); if (!x) return; e.preventDefault(); const v = x.dataset.geoir.split(',').map(Number); if (GM) GM.map.setView(v, 18); const g = geoG(); if (!g.utm && !g.fix) { g.lat = v[0]; g.lng = v[1]; geoDesenha(); geoCampos(); salvar(); } $('geo-res').innerHTML = ''; });
document.addEventListener('change', e => { const el = e.target; if (!el || !$('geo-ov')) return; const g = geoG();
  if (el.dataset && el.dataset.geoniv) { g.niv[el.dataset.geoniv] = el.checked ? 1 : 0; salvar(); return geoDesenha(); }
  if (el.id === 'geo-rot' || el.id === 'geo-esc') { const v = geoNums(el.value)[0]; if (!isFinite(v)) return; if (el.id === 'geo-rot') g.rot = v; else if (v > 1) g.esc = v; salvar(); geoDesenha(); } });
document.addEventListener('input', e => { const el = e.target; if (!el || !el.dataset || !el.dataset.geor || !GM) return; const g = geoG(); g[el.dataset.geor] = +el.value; if (el.dataset.geor === 'opS') geoBase(g.base || 'sat'); else geoDesenha(); salvar(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('geo-ov')) { geoFechar(); e.stopPropagation(); } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'geo-q') { const b = document.querySelector('[data-geo="busca"]'); if (b) b.click(); } });
/* ── KMZ / KML para o Google Earth (ZIP próprio sem compressão, como no Intertravado) ── */
function geoCrc(u) { if (!geoCrc.t) { geoCrc.t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; geoCrc.t[n] = c >>> 0; } } let r = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) r = geoCrc.t[(r ^ u[i]) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; }
function geoZip1(nome, texto) { const en = new TextEncoder(), nm = en.encode(nome), d = en.encode(texto), crc = geoCrc(d), n = nm.length, sz = d.length;
  const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true); lh.setUint16(26, n, true);
  const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true); ch.setUint16(28, n, true);
  const ec = new DataView(new ArrayBuffer(22)); ec.setUint32(0, 0x06054b50, true); ec.setUint16(8, 1, true); ec.setUint16(10, 1, true); ec.setUint32(12, 46 + n, true); ec.setUint32(16, 30 + n + sz, true);
  return new Blob([lh, nm, d, ch, nm, ec], {type: 'application/vnd.google-earth.kmz'}); }
function geoKmlTexto() {
  const g = geoG(), F = geoFeicoes(), real = g.vis !== 'tec', nv = g.niv, x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const co = pts => pts.map(p => { const l = geoLL(p[0], p[1]); return l[1].toFixed(8) + ',' + l[0].toFixed(8) + ',0'; }).join(' ');
  const pol = (pts, st, nome) => `<Placemark>${nome ? '<name>' + x(nome) + '</name>' : ''}<styleUrl>#${st}</styleUrl><Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${co(pts.concat([pts[0]]))}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
  const lin = (pts, st, nome, desc) => `<Placemark>${nome ? '<name>' + x(nome) + '</name>' : ''}${desc ? '<description>' + x(desc) + '</description>' : ''}<styleUrl>#${st}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${co(pts)}</coordinates></LineString></Placemark>`;
  const sty = (id, lc, lw, pc) => `<Style id="${id}"><LineStyle><color>${lc}</color><width>${lw}</width></LineStyle><PolyStyle><color>${pc || '00000000'}</color>${pc ? '' : '<fill>0</fill>'}</PolyStyle></Style>`;
  let k = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${x(P.nome || 'Rede de esgoto')}</name>
${sty('pista', real ? 'ff504d4b' : 'ffd1d5db', real ? 0 : 1, real ? 'e6504d4b' : '')}${sty('calc', 'ffc8d2d6', 0, real ? 'e6c8d2d6' : '')}${sty('mf', 'ffeaf0f2', 0, 'f0eaf0f2')}${sty('lote', 'ff0b9ef5', 1, real ? '40cfe7f3' : '')}${sty('rede', 'ff1673f9', 4)}${sty('recq', 'ffd326c0', 4)}${sty('eixo', 'ffffffff', 1)}
<Style id="pv"><IconStyle><scale>0.6</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><LabelStyle><scale>0.7</scale></LabelStyle></Style>`;
  if (nv.lotes) k += '<Folder><name>Lotes</name>' + F.lotes.map(q => pol(q, 'lote')).join('') + '</Folder>';
  if (nv.ruas) { k += '<Folder><name>Ruas</name>' + F.pista.map(q => pol(q, 'pista')).join('') + (real ? F.calc.map(q => pol(q, 'calc')).join('') + F.mf.map(q => pol(q, 'mf')).join('') : '') + F.eixo.map(e => lin(e, 'eixo')).join('') + '</Folder>'; }
  if (nv.rede) k += '<Folder><name>Rede de esgoto</name>' + F.rede.map(t => lin(t.p, t.r.recq ? 'recq' : 'rede', t.nome, `DN ${t.r.D} · L ${fm(t.r.L, 2)} m · i ${fm(t.r.i * 100, 3)} %`)).join('') + '</Folder>';
  if (nv.pvs) k += '<Folder><name>PVs</name>' + F.pvs.map(q => { const l = geoLL(q.p[0], q.p[1]); return `<Placemark><name>${x(q.nome)}</name><description>Tampa ${fm(q.x.ct, 3)} · Fundo ${fm(q.x.cf, 3)} · Prof. ${fm(q.x.ct - q.x.cf, 2)} m</description><styleUrl>#pv</styleUrl><Point><coordinates>${l[1].toFixed(8)},${l[0].toFixed(8)},0</coordinates></Point></Placemark>`; }).join('') + '</Folder>';
  return k + '</Document></kml>';
}
function geoExporta(tipo) { if (!geoPronto()) return toast('Posicione o desenho no mapa antes de exportar.'); const t = geoKmlTexto(), base = (P.nome || 'rede-esgoto').replace(/[^\w\-]+/g, '_');
  const blob = tipo === 'kmz' ? geoZip1('doc.kml', t) : new Blob([t], {type: 'application/vnd.google-earth.kml+xml'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = base + '.' + tipo; document.body.appendChild(a); a.click(); a.remove();
  toast((tipo === 'kmz' ? 'KMZ' : 'KML') + ' baixado: abra no Google Earth.'); }
/* ── satélite no chão do 3D: mosaico de tiles Esri num canvas, UV de cada vértice do terreno pelo georreferenciamento ── */
function geoSatChao(mesh) {
  if (!geoPronto() || !RL.grade || !mesh) return; const T = THREE, m = RL.grade, g = mesh.geometry, pos = g.attributes.position, n = pos.count;
  const lls = new Array(n); let la0 = 90, la1 = -90, lo0 = 180, lo1 = -180;
  for (let i = 0; i < n; i++) { const x = pos.getX(i) + T3.cx, y = -pos.getZ(i) + T3.cy, l = geoLL(x, y); lls[i] = l; la0 = Math.min(la0, l[0]); la1 = Math.max(la1, l[0]); lo0 = Math.min(lo0, l[1]); lo1 = Math.max(lo1, l[1]); }
  const ext = Math.max((la1 - la0) * GEO_M, (lo1 - lo0) * GEO_M * Math.cos(la0 * Math.PI / 180)), q = RL_QUAL[rlQualK()], Wmax = q.tex >= 2048 ? 4096 : 2048;
  let z = Math.floor(Math.log2(156543.03 * Math.cos(la0 * Math.PI / 180) * Wmax / Math.max(10, ext))); z = Math.max(13, Math.min(19, z));
  const px = (lat, lng) => { const s = Math.sin(lat * Math.PI / 180), k = 256 * Math.pow(2, z); return [(lng + 180) / 360 * k, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * k]; };
  const a = px(la1, lo0), b = px(la0, lo1), tx0 = Math.floor(a[0] / 256), ty0 = Math.floor(a[1] / 256), tx1 = Math.floor(b[0] / 256), ty1 = Math.floor(b[1] / 256);
  if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 160) return toast('Área grande demais para o satélite no chão.');
  const cv = document.createElement('canvas'); cv.width = (tx1 - tx0 + 1) * 256; cv.height = (ty1 - ty0 + 1) * 256; const cx = cv.getContext('2d'); cx.fillStyle = '#6f7a64'; cx.fillRect(0, 0, cv.width, cv.height);
  const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { const p = px(lls[i][0], lls[i][1]); uv[i * 2] = (p[0] - tx0 * 256) / cv.width; uv[i * 2 + 1] = 1 - (p[1] - ty0 * 256) / cv.height; }
  const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.anisotropy = Math.min(8, RL.t3.rd.capabilities.getMaxAnisotropy());
  const sat = new T.BufferGeometry(); sat.setAttribute('position', pos); sat.setAttribute('normal', g.attributes.normal); sat.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); sat.setIndex(g.index);
  const mat = new T.MeshStandardMaterial({map: tex, roughness: 1, metalness: 0, side: T.DoubleSide}); RL.terrSat = mat; mesh.geometry = sat; mesh.material = mat; rlSolo();
  let falhas = 0, ok = 0; const tot = (tx1 - tx0 + 1) * (ty1 - ty0 + 1);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) { const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { try { cx.drawImage(im, (tx - tx0) * 256, (ty - ty0) * 256); tex.needsUpdate = true; ok++; } catch (e) { falhas++; } };
    im.onerror = () => { if (++falhas === 1) toast('Algumas imagens de satélite não carregaram (internet ou bloqueio do servidor).'); };
    im.src = GEO_SAT.replace('{z}', z).replace('{y}', ty).replace('{x}', tx); }
  RL.satInfo = {z, tiles: tot};
}
