/* ════════════════════════════════════════════════════════════════════
   ABA 5 — 3D com controle da quantidade de esgoto
   A barra da direita multiplica a vazão; a rede (DN e cotas) fica como foi
   dimensionada e o programa só VERIFICA: lâmina sobe/desce e os tubos que
   passam do limite ficam laranja (acima de y/D) ou vermelhos (em carga).
   ════════════════════════════════════════════════════════════════════ */
const T3 = {on: false, fator: 1, ev: 1, solo: 0.55, rot: true, vala: false, lig: true, terr: true, fluxo: true, voo: null, Rv: null,
  URL: ['https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'],
  parar() { if (window.rlParar) rlParar(); this.on = false; cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); if (this.ren) { this.ren.dispose(); this.ren = null; } this.voo = null; }
};
function vT3(m) {
  if (!R.ok) { m.innerHTML = `<div class="card">${listaVerif()}</div>`; return; }
  T3.parar(); T3.fator = R.fator;
  const b = (a, t, on, tit) => `<button class="bt peq${on ? ' on' : ''}" data-t3="${a}" title="${tit || t}">${rotBt(t)}</button>`;
  m.innerHTML = `<div class="t3" id="t3"><canvas id="t3-c"></canvas><div class="t3-lab" id="t3-lab"></div>
    <div class="t3-bar">${b('fit', '⛶ Enquadrar')}${b('topo', '⬆ Topo')}${b('persp', '◢ Perspectiva')}${b('rot', '🏷 Rótulos', T3.rot)}${b('solo', '🛣 Rua ' + Math.round(T3.solo * 100) + ' %', false, 'Transparência da rua')}
      ${b('terr', '⛰ Terreno', T3.terr, 'Superfície do terreno natural (cotas dos PVs e da topografia)')}${b('lig', '🏠 Ligações', T3.lig, 'Ramais prediais (um por lote, na posição da planta)')}${b('vala', '⛏ Vala', T3.vala)}${b('fluxo', '🌊 Fluxo', T3.fluxo)}${b('ev', '↕ ' + T3.ev + '×', false, 'Exagero vertical')}${b('voo', '✈ Percorrer', false, 'Voa ao longo do coletor tronco')}${b('cheia', '⤢')}
      <span class="t3-sep"></span>${b('real', '🏙 Realista', RL.on, '3D realista: céu, sol, sombras, calçada, lotes com muros e casas, árvores (só desenho)')}${b('cen', '🏘 Cenário', RL.on && RL.pan, 'Níveis do cenário, Qualidade, Sol, locar árvores e postes')}${b('rua', '👁 Nível da rua', false, 'Câmera em pé no meio da rua (1,70 m)')}${b('andar', '🚶 Andar', false, 'Andar pela rua com o teclado (W/A/S/D) e o mouse')}${b('png', '🖼 Imagem PNG', false, 'Baixa a imagem do 3D como está na tela')}${b('geo', '🛰 Georreferenciar', false, 'Posiciona a rede sobre o satélite (mapa), exporta KML/KMZ')}</div>
    <div class="t3-sl" title="Quantidade de esgoto"><span>Esgoto</span><b id="t3-pct"></b><input type="range" id="t3-f" min="10" max="400" step="5" value="${Math.round(T3.fator * 100)}"/><span id="t3-q"></span></div>
    <div class="t3-inf" id="t3-inf">Carregando o 3D…</div></div>`;
  (async () => { try { if (!window.THREE) await carregarScript(T3.URL[0]); if (!THREE.OrbitControls) await carregarScript(T3.URL[1]); if (TAB === 't3' && $('t3-c')) t3Iniciar(); }
    catch (e) { const i = $('t3-inf'); if (i) { i.className = 't3-inf er'; i.textContent = 'Não foi possível carregar a biblioteca 3D (three.js). Verifique a internet e abra a aba de novo.'; } } })();
}
function t3Iniciar() {
  const box = $('t3'), cv = $('t3-c'); T3.on = true;
  const ren = T3.ren = new THREE.WebGLRenderer({canvas: cv, antialias: true, preserveDrawingBuffer: true}); ren.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const cena = T3.cena = new THREE.Scene(); cena.background = new THREE.Color(escuro() ? 0x0f1620 : 0xcfe3ee);   /* no modo realista o céu substitui o fundo (rlIniciar) */
  const cam = T3.cam = new THREE.PerspectiveCamera(50, 1, 0.5, 20000), ctl = T3.ctl = new THREE.OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = 0.12; ctl.mouseButtons = {LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN}; ctl.maxPolarAngle = Math.PI * 0.95;
  cena.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.95)); const sol = new THREE.DirectionalLight(0xffffff, 0.75); sol.position.set(300, 600, 200); cena.add(sol);
  if (window.rlIniciar) rlIniciar();   /* ES-04: 3D realista (céu, sol, sombras) */
  const tam = () => { const r = box.getBoundingClientRect(); ren.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); };
  T3.ro = new ResizeObserver(tam); T3.ro.observe(box); tam();
  t3Montar(); t3Vista('persp'); if (window.rlEventos) { rlEventos(); rlPainel(); }
  let t0 = performance.now();
  const loop = t => { if (!T3.on) return; T3.raf = requestAnimationFrame(loop); const dt = Math.min(0.1, (t - t0) / 1000); t0 = t; t3Anima(dt); if (RL.andar) rlAndarTick(dt); else ctl.update(); if (RL.t3) { rlTick(RL.t3); rlMede(dt); } ren.render(cena, cam); t3Rotulos(); };
  T3.raf = requestAnimationFrame(loop);
}
/* x,y do projeto e cota z → coordenadas do desenho (centrado na origem; Y para cima) */
const P3 = (x, y, z) => new THREE.Vector3(x - T3.cx, z - T3.z0, -(y - T3.cy));
function t3Cil(pa, pb, r, mat, aberto) { const dir = new THREE.Vector3().subVectors(pb, pa), len = dir.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, !!aberto), mat);
  m.position.copy(pa).addScaledVector(dir, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); return m; }
function t3Limpar(g) { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); while (g.children.length) g.remove(g.children[0]); }
function t3Montar() {
  const L = limites(), c = R.c; T3.cx = L.x + L.w / 2; T3.cy = L.y + L.h / 2; T3.z0 = Math.min(...Object.values(R.no).map(x => x.cf)) - 0.5;
  if (T3.raiz) { t3Limpar(T3.raiz); T3.cena.remove(T3.raiz); }
  const raiz = T3.raiz = new THREE.Group(); raiz.scale.y = T3.ev; T3.cena.add(raiz);
  const G = T3.G = {}; ['terr', 'solo', 'tubos', 'agua', 'pvs', 'vala', 'lig'].forEach(k => { G[k] = new THREE.Group(); raiz.add(G[k]); });
  const M = T3.M = {
    asf: new THREE.MeshLambertMaterial({color: 0x4a4f57, transparent: true, opacity: T3.solo, side: THREE.DoubleSide, depthWrite: false}),
    pas: new THREE.MeshLambertMaterial({color: 0xc9c4b8, transparent: true, opacity: T3.solo, side: THREE.DoubleSide, depthWrite: false}),
    pvc: new THREE.MeshLambertMaterial({color: 0xc98a2b, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false}),
    conc: new THREE.MeshLambertMaterial({color: 0x9a9a9a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false}),
    al: new THREE.MeshLambertMaterial({color: 0xf59e0b, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false}),
    er: new THREE.MeshLambertMaterial({color: 0xdc2626, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false}),
    pv: new THREE.MeshLambertMaterial({color: 0xb5b5b0, transparent: true, opacity: 0.6}), tampa: new THREE.MeshLambertMaterial({color: 0x23272e}),
    agua: new THREE.MeshLambertMaterial({color: 0x5d7a52, side: THREE.DoubleSide}), aguaEr: new THREE.MeshLambertMaterial({color: 0x8a3b2a, side: THREE.DoubleSide}),
    vala: new THREE.MeshLambertMaterial({color: 0x8a6a4a, transparent: true, opacity: 0.22, depthWrite: false}), lig: new THREE.MeshLambertMaterial({color: 0xd6a04a}), rec: new THREE.MeshLambertMaterial({color: 0xa21caf, transparent: true, opacity: 0.75, side: THREE.DoubleSide})};
  /* faixa (rua, passeio) entre dois pontos, na cota do terreno */
  const faixa = (a, b, d1, d2, dz, mat) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const v = [P3(a.x + nx * d1, a.y + ny * d1, a.ct + dz), P3(a.x + nx * d2, a.y + ny * d2, a.ct + dz), P3(b.x + nx * d2, b.y + ny * d2, b.ct + dz), P3(b.x + nx * d1, b.y + ny * d1, b.ct + dz)];
    const g = new THREE.BufferGeometry().setFromPoints([v[0], v[1], v[2], v[0], v[2], v[3]]); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
  T3.tr = []; let nLig = 0;
  R.ordem.forEach(id => { const r = R.tr[id], t = trDe(id), a = noDe(r.de), b = noDe(r.para), A = {x: a.x, y: a.y, ct: r.ctM}, B = {x: b.x, y: b.y, ct: r.ctJ}, w = c.largRua / 2;
    G.solo.add(faixa(A, B, -w, w, 0, M.asf)); G.solo.add(faixa(A, B, w, w + 2, 0.12, M.pas)); G.solo.add(faixa(A, B, -w - 2, -w, 0.12, M.pas));
    const lh = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / lh, uy = (b.y - a.y) / lh, xa = R.no[r.de], xb = R.no[r.para], ca = Math.min(lh * 0.3, xa.Dpv / 2 + 0.15), cb = Math.min(lh * 0.3, xb.Dpv / 2 + 0.15);
    const k1 = ca / lh, k2 = 1 - cb / lh, zi = k => r.ciM + (r.ciJ - r.ciM) * k, of = ESG.offsetTr(t, c), ox = -uy * of, oy = ux * of, pt = (k, dz) => P3(a.x + (b.x - a.x) * k + ox, a.y + (b.y - a.y) * k + oy, zi(k) + dz);
    const tubo = t3Cil(pt(k1, r.d / 2), pt(k2, r.d / 2), r.d / 2 * 1.08 + 0.004, r.recq ? M.rec : r.D > 400 ? M.conc : M.pvc, true); G.tubos.add(tubo);
    if (of) { G.tubos.add(t3Cil(P3(a.x + ux * ca * 0.3, a.y + uy * ca * 0.3, zi(0) + r.d / 2), pt(k1, r.d / 2), r.d / 2 * 1.08, M.pvc)); G.tubos.add(t3Cil(pt(k2, r.d / 2), P3(b.x - ux * cb * 0.3, b.y - uy * cb * 0.3, zi(1) + r.d / 2), r.d / 2 * 1.08, M.pvc)); }
    T3.tr.push({id, r, tubo, k1, k2, pt, a, b, lh});
    if (r.L * r.larg) { const va = P3(a.x, a.y, 0), box = new THREE.Mesh(new THREE.BoxGeometry(lh, r.hEsc, r.larg), M.vala); box.position.copy(P3((a.x + b.x) / 2 + ox, (a.y + b.y) / 2 + oy, (r.ctM + r.ctJ) / 2 - r.hEsc / 2)); box.rotation.y = Math.atan2(uy, ux); G.vala.add(box); }
  });
  ESG.ligacoes(P, R).slice(0, 2500).forEach(q => { const r = R.tr[q.tr]; if (!r) return; G.lig.add(t3Cil(P3(q.fx, q.fy, q.cfRamal + 0.05), P3(q.x, q.y, q.ci + r.d), 0.05, M.lig)); G.lig.add(t3Cil(P3(q.fx, q.fy, q.cfRamal - 0.15), P3(q.fx, q.fy, q.ct + 0.02), 0.22, M.lig)); nLig++; });
  Object.values(R.no).forEach(x => { const n = noDe(x.id), g = pvGeo(x), re = g.D / 2 + g.par;
    if (!x.fim || true) { const disco = new THREE.Mesh(new THREE.CircleGeometry(c.largRua / 2, 24), M.asf); disco.rotation.x = -Math.PI / 2; disco.position.copy(P3(n.x, n.y, x.ct - 0.005)); G.solo.add(disco); }
    G.pvs.add(t3Cil(P3(n.x, n.y, x.cf - g.laje), P3(n.x, n.y, x.cf + g.hb + (g.tl ? 0 : g.laje)), re, M.pv));
    if (!g.tl && x.ct - (x.cf + g.hb + g.laje) > 0.02) G.pvs.add(t3Cil(P3(n.x, n.y, x.cf + g.hb + g.laje), P3(n.x, n.y, x.ct - 0.02), 0.40, M.pv));
    G.pvs.add(t3Cil(P3(n.x, n.y, x.ct - 0.02), P3(n.x, n.y, x.ct + 0.03), g.tl ? 0.2 : 0.36, M.tampa));
    x.degraus.filter(d => d.h >= c.degTQ - 1e-9).forEach(d => { const r = R.tr[d.tr], a = noDe(r.de), lh = Math.hypot(n.x - a.x, n.y - a.y) || 1, k = 1 - (re + 0.15) / lh, px = a.x + (n.x - a.x) * k, py = a.y + (n.y - a.y) * k; G.pvs.add(t3Cil(P3(px, py, r.ciJ + r.d / 2), P3(px, py, x.cf + r.d / 2), r.d / 2 * 1.08, M.pvc)); });
  });
  /* terreno natural: malha interpolada pelas cotas dos PVs, das ruas e da topografia (0,8 m abaixo das ruas para não encobri-las) */
  { const pts = P.nos.map(n => ({x: n.x, y: n.y, z: +n.ct || 0})).concat(P.topo.map(q => ({x: q.x, y: q.y, z: +q.z || 0})));
    P.ruas.forEach(r => r.pts.forEach(q => { if (q.z != null && q.z !== '') pts.push({x: q.x, y: q.y, z: +q.z}); }));
    if (pts.length > 3) { const N = 44, x0 = L.x, y0 = L.y, dx = L.w / N, dy = L.h / N, pos = [], col = [], idx = [], zs = [];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) zs.push(ESG.idw(pts, x0 + i * dx, y0 + j * dy));
      const zmin = Math.min(...zs), zmax = Math.max(...zs), cor = new THREE.Color();
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const z = zs[j * (N + 1) + i], p = P3(x0 + i * dx, y0 + j * dy, z - 1.4); pos.push(p.x, p.y, p.z); const h = (z - zmin) / Math.max(0.1, zmax - zmin); cor.setHSL(0.27 - 0.17 * h, 0.30, 0.34 + 0.10 * h); col.push(cor.r, cor.g, cor.b); }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a0 = j * (N + 1) + i, b0 = a0 + 1, c0 = a0 + N + 1, d0 = c0 + 1; idx.push(a0, c0, b0, b0, c0, d0); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      G.terr.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors: true, side: THREE.DoubleSide}))); } }
  G.vala.visible = T3.vala; G.lig.visible = T3.lig; G.terr.visible = T3.terr;
  T3.geom = ESG.geometria(R); t3Cenario(T3.fator);
  if (RL.t3) { try { rlCena(); } catch (e) { console.warn('3D realista', e); } }   /* ES-04 */
}
/* recalcula só a hidráulica para o fator da barra e redesenha a água */
function t3Cenario(f) {
  T3.fator = f; const Rv = T3.Rv = Math.abs(f - R.fator) < 1e-9 ? R : ESG.calc(P, {fator: f, fixo: T3.geom}), G = T3.G, M = T3.M; t3Limpar(G.agua);
  const part = []; let nAl = 0, nEr = 0;
  T3.tr.forEach(o => { const r = Rv.tr[o.id], carga = r.hF.carga, al = !carga && r.hF.yd > r.lim + 1e-9; if (carga) nEr++; else if (al) nAl++;
    o.tubo.material = carga ? M.er : al ? M.al : (r.D > 400 ? M.conc : M.pvc);
    const yd = Math.min(0.999, Math.max(0.02, r.hF.yd)), rad = r.d / 2 * 0.985, th = 2 * Math.acos(1 - 2 * yd), N = 10, pa = o.pt(o.k1, r.d / 2), pb = o.pt(o.k2, r.d / 2);
    const dir = new THREE.Vector3().subVectors(pb, pa).normalize(), up = new THREE.Vector3(0, 1, 0); up.addScaledVector(dir, -up.dot(dir)).normalize(); const lado = new THREE.Vector3().crossVectors(dir, up);
    const anel = c => Array.from({length: N + 1}, (_, i) => { const a = -th / 2 + th * i / N; return c.clone().addScaledVector(lado, rad * Math.sin(a)).addScaledVector(up, -rad * Math.cos(a)); }), A = anel(pa), B = anel(pb), v = [];
    for (let i = 0; i < N; i++) v.push(A[i], B[i], B[i + 1], A[i], B[i + 1], A[i + 1]);                    /* fundo molhado */
    v.push(A[0], A[N], B[N], A[0], B[N], B[0]);                                                          /* superfície livre */
    for (let i = 1; i < N; i++) v.push(A[0], A[i], A[i + 1], B[0], B[i + 1], B[i]);                        /* tampas */
    const g = new THREE.BufferGeometry().setFromPoints(v); g.computeVertexNormals(); G.agua.add(new THREE.Mesh(g, carga ? M.aguaEr : M.agua));
    const ys = -rad * Math.cos(th / 2) + 0.01, n = Math.max(1, Math.round(o.lh / 9)); for (let i = 0; i < n; i++) part.push({pa, pb, up, ys, s: i / n, v: r.hF.V / Math.max(1, o.lh)});
  });
  T3.part = part; if (T3.pontos) { T3.raiz.remove(T3.pontos); T3.pontos.geometry.dispose(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(part.length * 3), 3));
  T3.pontos = new THREE.Points(pg, new THREE.PointsMaterial({color: 0xe9f5ef, size: 0.16, sizeAttenuation: true})); T3.pontos.visible = T3.fluxo; T3.raiz.add(T3.pontos);
  /* quadro de situação */
  const inf = $('t3-inf'), pct = $('t3-pct'), q = $('t3-q'); if (pct) pct.textContent = Math.round(f * 100) + ' %'; if (q) q.innerHTML = fm(Rv.Qfim, 1) + '<br>L/s';
  if (inf) { const tau = Rv.checks.filter(k => k.cod === 'tau').length, dif = Math.abs(f - R.fator) > 1e-9;
    inf.className = 't3-inf' + (nEr ? ' er' : nAl || tau ? ' al' : '');
    inf.innerHTML = `<b>${Math.round(f * 100)} % do esgoto de projeto</b> · vazão final no lançamento ${fm(Rv.Qfim, 2)} L/s${R.c.modo !== 'taxa' ? ' · equivale a ' + fm(R.c.popF * f, 0) + ' hab.' : ''}<br>` +
      (nEr || nAl || tau ? `${nEr ? '<b style="color:#b42318">' + nEr + ' trecho(s) em carga</b> (tubo cheio: o esgoto pode voltar pelas ligações). ' : ''}${nAl ? '<b style="color:#b45309">' + nAl + ' acima da lâmina máxima</b> (falta ar no tubo). ' : ''}${tau ? tau + ' com tensão trativa baixa (sólidos depositam). ' : ''}` : 'Rede atende: lâmina, velocidade e tensão trativa dentro dos limites. ') +
      (dif ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="bt peq pri" data-t3="redim">🛠 Redimensionar a rede para esta vazão</button><button class="bt peq" data-t3="volta">↺ Voltar a ${Math.round(R.fator * 100)} %</button></div>` : ''); }
}
function t3Anima(dt) {
  if (T3.pontos && T3.fluxo && T3.part.length) { const p = T3.pontos.geometry.attributes.position, v = new THREE.Vector3();
    T3.part.forEach((o, i) => { o.s = (o.s + o.v * dt * 2.5) % 1; v.lerpVectors(o.pa, o.pb, o.s).addScaledVector(o.up, o.ys); p.setXYZ(i, v.x, v.y, v.z); }); p.needsUpdate = true; }
  const vo = T3.voo; if (vo) { vo.s += dt * vo.vel; if (vo.s >= vo.L) return t3Voo(false);
    const pos = s => { let i = 0; while (i < vo.seg.length - 1 && s > vo.seg[i].s1) i++; const g = vo.seg[i], k = Math.min(1, Math.max(0, (s - g.s0) / (g.s1 - g.s0 || 1))); return new THREE.Vector3().lerpVectors(g.a, g.b, k); };
    const a = pos(vo.s), b = pos(Math.min(vo.L, vo.s + 14)); a.y = a.y * T3.ev + 7; b.y = b.y * T3.ev + 1; T3.cam.position.lerp(a, 0.08); T3.ctl.target.lerp(b, 0.1); }
}
function t3Rotulos() {
  const el = $('t3-lab'); if (!el) return; if (!T3.rot) { if (el.innerHTML) el.innerHTML = ''; return; }
  T3.nrot = (T3.nrot || 0) + 1; if (T3.nrot % 3) return;
  const r = el.getBoundingClientRect(), v = new THREE.Vector3(), out = [], Rv = T3.Rv || R;
  const proj = (p, txt) => { v.copy(p); v.y *= T3.ev; const d = v.distanceTo(T3.cam.position); v.project(T3.cam); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) return; out.push({d, h: `<div style="left:${(v.x + 1) / 2 * r.width}px;top:${(1 - v.y) / 2 * r.height}px">${txt}</div>`}); };
  const perto = T3.cam.position.distanceTo(T3.ctl.target);
  Object.values(R.no).forEach(x => { const n = noDe(x.id); proj(P3(n.x, n.y, x.ct + 0.4), esc(nomeNo(n))); });
  T3.tr.forEach(o => { const q = Rv.tr[o.id], ruim = q.hF.carga || q.hF.yd > q.lim + 1e-9; if (perto < 170 || ruim) proj(o.pt(0.5, q.d), `${q.nome} · DN ${q.D} · y/D ${q.hF.carga ? 'cheio' : fm(q.hF.yd, 2)}`); });
  out.sort((a, b) => a.d - b.d); el.innerHTML = out.filter(o => o.d < Math.max(260, perto * 1.6)).slice(0, 60).map(o => o.h).join('');
}
function t3Vista(v) {
  const cx = new THREE.Box3().setFromObject(T3.G.tubos).union(new THREE.Box3().setFromObject(T3.G.pvs)), c = cx.getCenter(new THREE.Vector3()), s = cx.getSize(new THREE.Vector3()), raio = Math.max(15, Math.hypot(s.x, s.z) / 2);
  const dir = v === 'topo' ? new THREE.Vector3(0.001, 1, 0.001) : v === 'persp' ? new THREE.Vector3(0.55, 0.62, 0.85) : new THREE.Vector3().subVectors(T3.cam.position, T3.ctl.target);
  dir.normalize(); const dist = raio / Math.tan(T3.cam.fov * Math.PI / 360) * (T3.cam.aspect < 1 ? 1 / T3.cam.aspect : 1) * 1.05;
  T3.ctl.target.copy(c); T3.cam.position.copy(c).addScaledVector(dir, dist); T3.cam.near = Math.max(0.2, dist / 2000); T3.cam.far = Math.max(dist * 20, RL.t3 && RL.t3.Rcena ? RL.t3.Rcena * 30 : 0); T3.cam.updateProjectionMatrix(); T3.ctl.update();
}
function t3Voo(liga) {
  const bt = document.querySelector('[data-t3="voo"]');
  if (!liga) { T3.voo = null; T3.ctl.enabled = true; T3.M.asf.opacity = T3.M.pas.opacity = T3.solo; if (bt) { bt.classList.remove('on'); bt.innerHTML = rotBt('✈ Percorrer'); } return; }
  const ids = caminho(1, true), seg = []; let s = 0; ids.forEach(id => { const o = T3.tr.find(q => q.id === id); if (!o) return; const a = o.pt(0, o.r.d), b = o.pt(1, o.r.d), l = o.lh; seg.push({a, b, s0: s, s1: s + l}); s += l; });
  if (!seg.length) return; T3.voo = {seg, L: s, s: 0, vel: Math.max(8, s / 45)}; T3.ctl.enabled = false; T3.M.asf.opacity = T3.M.pas.opacity = Math.min(T3.solo, 0.18); if (bt) { bt.classList.add('on'); bt.innerHTML = rotBt('⏹ Parar'); }
  toast('Percorrendo o coletor tronco, da cabeceira ao lançamento. Toque em ⏹ Parar para assumir a câmera.');
}
function t3Acao(a) {
  if (window.rlAcao && rlAcao(a)) return;   /* ES-04: Realista, Cenário, Nível da rua, Andar, PNG, Georreferenciar */
  if (!T3.on && a !== 'cheia') return;
  if (a === 'fit') t3Vista('fit'); else if (a === 'topo' || a === 'persp') t3Vista(a);
  else if (a === 'rot') { T3.rot = !T3.rot; } else if (a === 'vala') { T3.vala = !T3.vala; T3.G.vala.visible = T3.vala; } else if (a === 'lig') { T3.lig = !T3.lig; T3.G.lig.visible = T3.lig; } else if (a === 'terr') { T3.terr = !T3.terr; T3.G.terr.visible = T3.terr && !RL.t3; if (T3.G.rlTerr) T3.G.rlTerr.visible = !!(T3.terr && RL.vis.terreno); }
  else if (a === 'fluxo') { T3.fluxo = !T3.fluxo; T3.pontos.visible = T3.fluxo; }
  else if (a === 'solo') { RL.soloIni = 1; T3.solo = T3.solo > 0.8 ? 0 : T3.solo > 0.4 ? 1 : T3.solo > 0.1 ? 0.55 : 0.2; T3.M.asf.opacity = T3.M.pas.opacity = T3.solo; T3.G.solo.visible = T3.solo > 0 && !RL.t3; if (RL.t3) rlSolo(); }
  else if (a === 'ev') { T3.ev = T3.ev === 1 ? 2 : T3.ev === 2 ? 5 : 1; T3.raiz.scale.y = T3.ev; if (RL.t3) rlReconstroi(); t3Vista('fit'); }
  else if (a === 'voo') return t3Voo(!T3.voo);
  else if (a === 'cheia') { const el = $('t3'); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); return; }
  else if (a === 'volta') { $('t3-f').value = Math.round(R.fator * 100); return t3Cenario(R.fator); }
  else if (a === 'redim') { const f = T3.fator, cam = T3.cam.position.clone(), alvo = T3.ctl.target.clone(); editar(() => { P.crit.fator = Math.round(f * 100) / 100; }, true);
    t3Montar(); T3.cam.position.copy(cam); T3.ctl.target.copy(alvo); $('t3-f').value = Math.round(R.fator * 100);
    return toast('Rede redimensionada para ' + Math.round(f * 100) + ' % da vazão: ' + R.nErr + ' erro(s), ' + R.nWarn + ' alerta(s). ↶ desfaz.', 6000); }
  const bt = document.querySelector('[data-t3="' + a + '"]'); if (bt) { if (['rot', 'vala', 'lig', 'fluxo', 'terr'].includes(a)) bt.classList.toggle('on', T3[a]); if (a === 'solo') bt.innerHTML = rotBt('🛣 Rua ' + Math.round(T3.solo * 100) + ' %'); if (a === 'ev') bt.innerHTML = rotBt('↕ ' + T3.ev + '×'); }
}
