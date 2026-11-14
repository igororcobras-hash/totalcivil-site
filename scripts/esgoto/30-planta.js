/* ════════════════════════════════════════════════════════════════════
   ABA 2 — TRAÇADO (planta baixa editável)
   Ideia central: o usuário só informa as RUAS (nome uma única vez) e as cotas;
   PVs, trechos, sentido do escoamento e numeração saem do botão 🧭 Gerar rede.
   ════════════════════════════════════════════════════════════════════ */
const PL = {vb: null, modo: 'sel', des: [], rot: 1, drag: null, pts: new Map(), cur: null};
const CORES = {ok: '#12263f', warn: '#d97706', err: '#b42318', rua: '#e4e0d5', agua: '#0f766e', acc: '#c2410c'};
const escuro = () => document.documentElement.dataset.theme === 'dark';

function limites() {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; const p = (x, y) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); };
  P.ruas.forEach(r => r.pts.forEach(q => p(q.x, q.y))); P.nos.forEach(n => p(n.x, n.y)); P.topo.forEach(q => p(q.x, q.y)); PL.des.forEach(q => p(q.x, q.y));
  if (!isFinite(a)) return {x: 0, y: 0, w: 300, h: 200};
  const m = Math.max(20, (c - a) * 0.12, (d - b) * 0.12); return {x: a - m, y: b - m, w: Math.max(40, c - a + 2 * m), h: Math.max(40, d - b + 2 * m)};
}
function plEnquadrar() { const L = limites(), box = $('pl-svg'); if (!box) return; const r = box.getBoundingClientRect(), asp = (r.width || 800) / (r.height || 500);
  let w = L.w, h = L.h; if (w / h < asp) w = h * asp; else h = w / asp; PL.vb = {x: L.x - (w - L.w) / 2, y: -(L.y + L.h) - (h - L.h) / 2, w, h}; plDesenhar(); }
const corTr = id => { if (!R || !R.ok || !R.tr[id]) return '#7a8599'; const s = stTr(id); return s === 'e' ? CORES.err : s === 'w' ? CORES.warn : (escuro() ? '#9fc3ea' : CORES.ok); };

/* conteúdo do desenho; px = metros por pixel (mantém textos e símbolos do mesmo tamanho na tela) */
function plConteudo(px, o) {
  o = o || {}; const ink = o.claro ? '#14202e' : (escuro() ? '#e8ecf1' : '#14202e'), mut = o.claro ? '#5a6573' : (escuro() ? '#9aa6b5' : '#5a6573'), halo = o.claro ? '#fff' : (escuro() ? '#17212e' : '#fff');
  const T = (x, y, t, s, cor, anc, w) => `<text x="${x}" y="${-y}" font-size="${(s || 11) * px}" fill="${cor || ink}" text-anchor="${anc || 'start'}" font-weight="${w || 500}" paint-order="stroke" stroke="${halo}" stroke-width="${3 * px}" stroke-linejoin="round" style="pointer-events:none">${esc(t)}</text>`;
  let s = '';
  P.topo.forEach(q => { s += `<path d="M${q.x - 3 * px} ${-q.y}h${6 * px}M${q.x} ${-q.y - 3 * px}v${6 * px}" stroke="${mut}" stroke-width="${px}"/>` + (PL.rot > 1 ? T(q.x + 4 * px, q.y + 4 * px, fm(q.z, 2), 9, mut) : ''); });
  /* ruas */
  P.ruas.forEach(r => { const d = r.pts.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + (-q.y)).join(''), sel = SEL && SEL.tipo === 'rua' && SEL.id === r.id;
    s += `<path d="${d}" fill="none" stroke="${o.claro ? '#e9e6dc' : (escuro() ? '#243242' : CORES.rua)}" stroke-width="${Math.max(P.crit.largRua, 3 * px)}" stroke-linecap="round" stroke-linejoin="round" data-rua="${r.id}"/>`;
    if (sel || !P.trechos.length) s += `<path d="${d}" fill="none" stroke="${sel ? CORES.acc : mut}" stroke-width="${1.2 * px}" stroke-dasharray="${6 * px} ${4 * px}" style="pointer-events:none"/>`;
    if (o.edit && sel) r.pts.forEach((q, i) => { s += `<rect x="${q.x - 5 * px}" y="${-q.y - 5 * px}" width="${10 * px}" height="${10 * px}" fill="${halo}" stroke="${CORES.acc}" stroke-width="${2 * px}" data-vx="${r.id}:${i}" style="cursor:move"/>` + T(q.x + 8 * px, q.y + 8 * px, q.z == null || q.z === '' ? 'sem cota' : fm(+q.z, 2), 10, CORES.acc, 'start', 700); });
  });
  if (PL.rot > 0) P.ruas.forEach(r => { if (r.pts.length < 2) return; const a = r.pts[0], b = r.pts[1]; let ang = -Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const f = 0.25, mx = a.x + (b.x - a.x) * f, my = a.y + (b.y - a.y) * f, off = P.crit.largRua / 2 + 13 * px;
    s += `<text transform="translate(${mx} ${-my}) rotate(${ang})" y="${off}" font-size="${10.5 * px}" fill="${mut}" text-anchor="middle" font-weight="700" letter-spacing="${px}" paint-order="stroke" stroke="${halo}" stroke-width="${3 * px}" style="pointer-events:none">${esc(r.nome.toUpperCase())}</text>`; });
  /* trechos */
  P.trechos.forEach(t => { const a = noDe(t.de), b = noDe(t.para); if (!a || !b) return; const r = R && R.ok && R.tr[t.id], cor = r && r.recq ? '#a21caf' : r && r.sif ? '#0369a1' : corTr(t.id), sel = SEL && SEL.tipo === 'tr' && SEL.id === t.id;
    const w = (r ? 2 + Math.min(4, r.D / 150) : 2) * px, L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (sel) s += `<line x1="${a.x}" y1="${-a.y}" x2="${b.x}" y2="${-b.y}" stroke="${CORES.acc}" stroke-width="${w + 6 * px}" stroke-linecap="round" opacity=".35"/>`;
    s += `<line x1="${a.x}" y1="${-a.y}" x2="${b.x}" y2="${-b.y}" stroke="${cor}" stroke-width="${w}" stroke-linecap="${r && r.recq ? 'butt' : 'round'}"${r && r.recq ? ` stroke-dasharray="${9 * px} ${5 * px}"` : ''} data-tr="${t.id}" style="cursor:pointer"/>`;
    s += `<line x1="${a.x}" y1="${-a.y}" x2="${b.x}" y2="${-b.y}" stroke="transparent" stroke-width="${14 * px}" data-tr="${t.id}" style="cursor:pointer"/>`;
    const ax = mx + ux * 5 * px, ay = my + uy * 5 * px, n = 4.5 * px; s += `<path d="M${ax} ${-ay}L${ax - ux * 2 * n - uy * n} ${-(ay - uy * 2 * n + ux * n)}L${ax - ux * 2 * n + uy * n} ${-(ay - uy * 2 * n - ux * n)}Z" fill="${cor}" style="pointer-events:none"/>`;
    if (r && PL.rot > 0 && L / px > (PL.rot > 1 ? 150 : 80)) { let ang = -Math.atan2(uy, ux) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
      const txt = r.recq ? `${r.nome} · recalque DN ${r.D}` + (PL.rot > 1 ? ` · ${fm(r.L, 1)} m` : '') : r.sif ? `${r.nome} · sifão ${r.sif.n} × DN ${r.D}` : PL.rot > 1 ? `${r.nome} · DN ${r.D} · ${fm(r.I * 100, 2)} % · ${fm(r.L, 1)} m` : `${r.nome} · DN ${r.D}`;
      s += `<text transform="translate(${mx} ${-my}) rotate(${ang})" y="${-7 * px}" font-size="${10 * px}" fill="${cor}" text-anchor="middle" font-weight="650" paint-order="stroke" stroke="${halo}" stroke-width="${3 * px}" style="pointer-events:none">${esc(txt)}</text>`; }
  });
  /* PVs */
  P.nos.forEach(n => { const x = R && R.ok && R.no[n.id], sel = SEL && SEL.tipo === 'no' && SEL.id === n.id, rr = (x && x.tipo === 'TL' ? 4 : 6) * px;
    if (x && x.fim) s += `<path d="M${n.x} ${-n.y - 13 * px}l${11 * px} ${19 * px}h${-22 * px}Z" fill="${CORES.acc}" opacity=".9" style="pointer-events:none"/>`;
    if (x && x.tipo === 'EEE') s += `<rect x="${n.x - 11 * px}" y="${-n.y - 11 * px}" width="${22 * px}" height="${22 * px}" rx="${3 * px}" fill="#a21caf" stroke="${ink}" stroke-width="${1.5 * px}" style="pointer-events:none"/>`;
    s += `<circle cx="${n.x}" cy="${-n.y}" r="${rr}" fill="${x && x.tipo === 'TL' ? halo : (x && x.tq ? CORES.warn : CORES.agua)}" stroke="${sel ? CORES.acc : ink}" stroke-width="${(sel ? 3 : 1.5) * px}" data-no="${n.id}" style="cursor:${o.edit ? 'move' : 'pointer'}"/>`;
    if (PL.rot > 0) s += T(n.x + 8 * px, n.y - 15 * px, nomeNo(n) + (x && x.tipo === 'EEE' ? ' — EEE' : '') + (x && x.fim ? ' — lançamento' : ''), 10.5, ink, 'start', 700);
    if (PL.rot > 1 && x) s += T(n.x + 8 * px, n.y - 26 * px, 'CT ' + fm(x.ct, 2) + ' · CF ' + fm(x.cf, 2), 9, mut) + T(n.x + 8 * px, n.y - 37 * px, 'prof. ' + fm(x.prof, 2) + ' m', 9, x.prof > R.c.profMax ? CORES.warn : mut);
  });
  if (P.saida && !(R && R.ok)) s += `<path d="M${P.saida.x} ${-P.saida.y - 13 * px}l${11 * px} ${19 * px}h${-22 * px}Z" fill="${CORES.acc}"/>` + T(P.saida.x + 12 * px, P.saida.y, 'lançamento', 10, CORES.acc, 'start', 700);
  if (PL.des.length) { const pts = PL.des.concat(PL.cur ? [PL.cur] : []); s += `<path d="${pts.map((q, i) => (i ? 'L' : 'M') + q.x + ' ' + (-q.y)).join('')}" fill="none" stroke="${CORES.acc}" stroke-width="${2 * px}" stroke-dasharray="${5 * px} ${4 * px}"/>` + PL.des.map(q => `<circle cx="${q.x}" cy="${-q.y}" r="${4 * px}" fill="${CORES.acc}"/>`).join('');
    if (PL.cur && PL.des.length) { const a = PL.des[PL.des.length - 1]; s += T(PL.cur.x + 10 * px, PL.cur.y + 10 * px, fm(Math.hypot(PL.cur.x - a.x, PL.cur.y - a.y), 1) + ' m', 11, CORES.acc, 'start', 700); } }
  return s;
}
function plDesenhar() { const svg = $('pl-svg'); if (!svg || !PL.vb) return; const v = PL.vb, w = svg.getBoundingClientRect().width || 800, px = v.w / w;
  svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  const passo = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(p => p / px > 60) || 1000, n = v.w / passo < 60;
  let g = ''; if (n) { for (let x = Math.ceil(v.x / passo) * passo; x < v.x + v.w; x += passo) g += `M${x} ${v.y}v${v.h}`; for (let y = Math.ceil(v.y / passo) * passo; y < v.y + v.h; y += passo) g += `M${v.x} ${y}h${v.w}`; }
  svg.innerHTML = `<path d="${g}" stroke="${escuro() ? 'rgba(232,236,241,.06)' : 'rgba(20,32,46,.07)'}" stroke-width="${px}" fill="none"/>` + plConteudo(px, {edit: true}) +
    `<g style="pointer-events:none"><line x1="${v.x + 14 * px}" y1="${v.y + v.h - 40 * px}" x2="${v.x + 14 * px + passo}" y2="${v.y + v.h - 40 * px}" stroke="${escuro() ? '#e8ecf1' : '#14202e'}" stroke-width="${2 * px}"/><text x="${v.x + 14 * px}" y="${v.y + v.h - 46 * px}" font-size="${10 * px}" fill="${escuro() ? '#e8ecf1' : '#14202e'}">${passo} m</text></g>`;
}
/* planta inteira, para o memorial e para baixar */
function plantaSVG(larg) { const L = limites(), px = L.w / (larg || 1000), ant = PL.rot, sel = SEL; PL.rot = 2; SEL = null; const c = plConteudo(px, {claro: true}); PL.rot = ant; SEL = sel;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${L.x} ${-(L.y + L.h)} ${L.w} ${L.h}" width="${larg || 1000}" height="${Math.round((larg || 1000) * L.h / L.w)}" font-family="Arial,sans-serif"><rect x="${L.x}" y="${-(L.y + L.h)}" width="${L.w}" height="${L.h}" fill="#fff"/>${c}</svg>`; }

const DICAS = {sel: 'Arraste para mover a vista · roda do mouse aproxima · clique em rua, PV ou trecho para editar · arraste um PV para movê-lo',
  rua: 'Clique os pontos do eixo da rua · duplo clique ou Enter termina · Esc cancela · encoste em outra rua para cruzar',
  pv: 'Clique sobre um trecho para inserir um PV nele', lig: 'Clique no PV de montante e depois no PV de jusante para criar um trecho',
  saida: 'Clique no ponto de lançamento (ETE, interceptor, elevatória ou PV existente)', del: 'Clique em rua, PV ou trecho para excluir'};
function vTracado(m) {
  const b = (mo, t, tit) => `<button class="bt peq${PL.modo === mo ? ' on' : ''}" data-plmodo="${mo}" title="${tit || t}">${rotBt(t)}</button>`, a = (act, t, tit, cls) => `<button class="bt peq${cls || ''}" data-act="${act}" title="${tit || t}">${rotBt(t)}</button>`;
  m.innerHTML = `<div class="tr-grid"><div class="pl-box"><svg id="pl-svg"></svg>
    <div class="pl-tools">${b('sel', '🖐 Selecionar')}${b('rua', '✏ Desenhar rua')}${b('saida', '🔻 Lançamento')}<span class="sep"></span>
      <button class="bt peq pri" data-act="gerar" title="Cria PVs, trechos e o sentido do esgoto a partir das ruas">🧭 Gerar rede</button><span class="sep"></span>
      ${b('pv', '◉ PV', 'Inserir PV num trecho')}${b('lig', '⟶ Trecho', 'Ligar dois PVs com um trecho novo')}${b('del', '🗑', 'Excluir')}<span class="sep"></span>
      ${a('sugEEE', '🏭 Elevatória', 'Sugere e cria elevatórias onde a rede passa da profundidade de alerta ou chega abaixo do lançamento')}<span class="sep"></span>
      ${a('rotulos', '🏷 Rótulos', 'Mais ou menos textos no desenho')}${a('enquadrar', '⛶ Enquadrar')}${a('cadDxf', '⬇ DXF', 'Planta, perfis, quadro e carimbo em DXF')}${a('cadDwg', '⬇ DWG', 'Planta, perfis, quadro e carimbo em DWG (AutoCAD 2000)')}${a('svgPlanta', '⬇ SVG')}</div>
    <div class="pl-dica"><span id="pl-dica">${DICAS[PL.modo]}</span></div></div>
    <div class="lado" id="pl-lado"></div></div>`;
  ladoTracado(); if (!PL.vb) plEnquadrar(); else plDesenhar(); requestAnimationFrame(() => { if (!PL.vb || !$('pl-svg')) return; plDesenhar(); });
}
function ladoTracado() {
  const el = $('pl-lado'); if (!el) return; let s = '';
  if (!P.ruas.length && !P.trechos.length) s += `<div class="card"><h2>Comece pelas ruas</h2><p class="mut" style="font-size:.85rem;margin:0 0 8px">Desenhe o eixo de cada rua no mapa, ou cole a tabela do levantamento. O nome de cada rua é digitado uma vez só.</p>
    <div class="barra"><button class="bt peq pri" data-plmodo="rua">✏ Desenhar rua</button><button class="bt peq" data-act="colarRuas">📋 Colar ruas</button><button class="bt peq" data-act="exemplo">Exemplo</button></div></div>`;
  if (SEL && SEL.tipo === 'rua' && ruaDe(SEL.id)) { const r = ruaDe(SEL.id);
    s += `<div class="card"><div class="barra"><h2 style="margin:0">Rua selecionada</h2><span class="esp"></span><button class="x" data-act="desel">×</button></div>
      <div class="f"><label>Nome</label><input data-ruanome="${r.id}" value="${esc(r.nome)}"/></div>
      <h3>Cotas do terreno no eixo</h3><div class="lista">${r.pts.map((q, i) => `<div class="lin"><span style="width:62px">Ponto ${i + 1}</span><input data-ruaz="${r.id}:${i}" inputmode="decimal" placeholder="cota (m)" value="${q.z == null || q.z === '' ? '' : fm(+q.z, 3).replace(/\./g, '')}"/></div>`).join('')}</div>
      <p class="mut" style="font-size:.76rem;margin:6px 0">Ponto sem cota é interpolado pelos vizinhos, ou vem dos pontos de topografia colados.</p>
      <button class="bt peq" data-delrua="${r.id}">🗑 Excluir rua</button></div>`; }
  if (SEL && SEL.tipo === 'no' && noDe(SEL.id)) { const n = noDe(SEL.id), x = R && R.ok && R.no[n.id];
    s += `<div class="card"><div class="barra"><h2 style="margin:0">${esc(nomeNo(n))}</h2><span class="esp"></span><button class="x" data-act="desel">×</button></div><div class="fg" style="grid-template-columns:1fr 1fr">
      <div class="f"><label>Cota do terreno (m)</label><input data-no="${n.id}" data-k="ct" inputmode="decimal" value="${fm(+n.ct || 0, 3).replace(/\./g, '')}"/></div>
      <div class="f"><label>Nome</label><input data-no="${n.id}" data-k="nome" value="${esc(n.nome || '')}"/></div>
      <div class="f"><label>Contribuição concentrada inicial (L/s)</label><input data-no="${n.id}" data-k="qcI" inputmode="decimal" value="${n.qcI ? fm(+n.qcI, 2) : ''}" placeholder="0"/></div>
      <div class="f"><label>Contribuição concentrada final (L/s)</label><input data-no="${n.id}" data-k="qcF" inputmode="decimal" value="${n.qcF ? fm(+n.qcF, 2) : ''}" placeholder="0"/></div>
      ${x && x.fim ? `<div class="f" style="grid-column:1/-1"><label>Cota de fundo disponível no lançamento (m)</label><input data-no="${n.id}" data-k="cfEx" inputmode="decimal" value="${n.cfEx != null && n.cfEx !== '' ? fm(+n.cfEx, 3).replace(/\./g, '') : ''}" placeholder="vazio = sem restrição"/><div class="aj">Ex.: fundo do PV existente ou da elevatória. A rede não pode chegar abaixo disso.</div></div>` : ''}</div>
      ${x ? `<div class="kpis" style="margin-top:8px"><div class="kpi"><b>${fm(x.cf, 3)}</b><span>Cota de fundo</span></div><div class="kpi"><b>${fm(x.prof, 2)} m</b><span>Profundidade</span></div><div class="kpi"><b>${x.tipo}${x.tq ? ' + TQ' : ''}</b><span>Tipo</span></div><div class="kpi"><b>${fm(x.QF, 2)}</b><span>Q final L/s</span></div></div>` : ''}
      ${ladoEEE(n, x)}<div class="barra" style="margin-top:8px"><button class="bt peq" data-delno="${n.id}">🗑 Excluir PV</button></div></div>`; }
  if (SEL && SEL.tipo === 'tr' && trDe(SEL.id)) { const t = trDe(SEL.id), r = R && R.ok && R.tr[t.id];
    s += `<div class="card"><div class="barra"><h2 style="margin:0">Trecho ${r ? r.nome : ''}</h2><span class="esp"></span><button class="x" data-act="desel">×</button></div><div class="fg" style="grid-template-columns:1fr 1fr">
      <div class="f"><label>Rua</label><select data-trk="rua" data-id="${t.id}"><option value="">—</option>${P.ruas.map(q => `<option value="${q.id}"${t.rua === q.id ? ' selected' : ''}>${esc(q.nome)}</option>`).join('')}</select></div>
      <div class="f"><label>Lotes que contribuem</label><select data-tlad data-id="${t.id}"><option value="2"${t.lados == null || +t.lados === 2 ? ' selected' : ''}>dos 2 lados</option><option value="1"${+t.lados === 1 ? ' selected' : ''}>de 1 lado</option><option value="0"${+t.lados === 0 ? ' selected' : ''}>nenhum (só transporte)</option></select></div>
      <div class="f"><label>DN (mm)</label><select data-tfix="D" data-id="${t.id}"><option value="">automático</option>${ESG.SERIE.map(D => `<option${+t.Dfix === D ? ' selected' : ''}>${D}</option>`).join('')}</select></div>
      <div class="f"><label>Declividade (%)</label><input data-tfix="I" data-id="${t.id}" inputmode="decimal" placeholder="${r ? fm(r.I * 100, 3) + ' (auto)' : 'auto'}" value="${t.iFix > 0 ? fm(t.iFix * 100, 3) : ''}"/></div>${ladoTrExtra(t, r)}</div>
      ${r ? `<div class="kpis" style="margin-top:8px"><div class="kpi"><b>${fm(r.L, 1)} m</b><span>Extensão</span></div><div class="kpi"><b>${fm(r.QF, 2)}</b><span>Q final L/s</span></div><div class="kpi"><b>${r.hF.carga ? 'cheio' : fm(r.hF.yd, 2)}</b><span>y/D final</span></div><div class="kpi"><b>${fm(r.hI.tau, 2)} Pa</b><span>Tensão trativa</span></div><div class="kpi"><b>${fm(r.profM, 2)} / ${fm(r.profJ, 2)}</b><span>Prof. mont./jus.</span></div><div class="kpi"><b>${fm(r.hF.V, 2)}</b><span>V final m/s</span></div></div>` : ''}
      <div class="barra" style="margin-top:8px"><button class="bt peq" data-inv="${t.id}">⇄ Inverter sentido</button><button class="bt peq" data-act="verPerfil">📈 Ver no perfil</button><button class="bt peq" data-deltr="${t.id}">🗑</button></div></div>`; }
  s += `<div class="card"><div class="barra"><h2 style="margin:0">Ruas (${P.ruas.length})</h2><span class="esp"></span><button class="bt peq" data-act="colarRuas">📋 Colar</button><button class="bt peq" data-act="colarTopo" title="Pontos X; Y; cota do levantamento">📋 Topografia</button></div>
    ${P.ruas.length ? `<div class="lista">${P.ruas.map(r => `<div class="lin"><input data-ruanome="${r.id}" value="${esc(r.nome)}"/><small>${r.pts.filter(q => q.z != null && q.z !== '').length}/${r.pts.length} cotas</small><button class="bt peq" data-selrua="${r.id}">✎</button><button class="x" data-delrua="${r.id}">🗑</button></div>`).join('')}</div>` : '<p class="mut" style="font-size:.84rem;margin:0">Nenhuma rua ainda.</p>'}
    ${P.topo.length ? `<p class="mut" style="font-size:.78rem;margin:6px 0 0">${P.topo.length} ponto(s) de topografia colados. <a href="#" data-act="limparTopo">limpar</a></p>` : ''}
    ${P.manual ? '<div class="aviso" style="margin:8px 0 0;font-size:.78rem">A rede foi ajustada à mão. Mexer nas ruas não refaz a rede sozinho: use 🧭 Gerar rede (descarta os ajustes manuais).</div>' : (P.trechos.length ? '<p class="mut" style="font-size:.76rem;margin:6px 0 0">Rede automática: ao mexer em rua ou cota, PVs e trechos são refeitos na hora.</p>' : '')}</div>`;
  el.innerHTML = s;
}

/* a rede acompanha as ruas enquanto não houver ajuste manual */
function ruasMudaram() { if (!P.manual && P.ruas.some(r => r.pts.length > 1)) { const g = ESG.gerar(P); if (!g.erro) renumerar(); } }
function gerarRede() {
  if (!P.ruas.length) return toast('Desenhe ou cole as ruas primeiro.');
  if (P.manual && !confirm('Gerar a rede de novo descarta os ajustes feitos à mão (PVs movidos, DN e declividades fixados, trechos criados, elevatórias e sifões). Continuar?')) return;
  let g; editar(() => { g = ESG.gerar(P); if (!g.erro) { delete P.manual; P.eee = []; renumerar(); } });
  if (g.erro) return toast(g.erro); PL.modo = 'sel'; render();
  toast('Rede gerada: ' + g.nos + ' PVs e ' + g.trechos + ' trechos' + (R.ok ? ' · ' + R.nErr + ' erro(s), ' + R.nWarn + ' alerta(s).' : '.') + (g.avisos.length ? ' ' + g.avisos.join(' ') : ''), 7000);
}
const linhas = txt => String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/[;\t|]/).map(c => c.trim()));
function colarRuas(txt) {
  const novas = []; let erro = 0;
  linhas(txt).forEach(c => { const nome = c[0], v = c.slice(1), pts = []; for (let i = 0; i + 1 < v.length; i += 3) { const x = num(v[i]), y = num(v[i + 1]), z = num(v[i + 2]); if (isFinite(x) && isFinite(y)) pts.push({x, y, z: isFinite(z) ? z : null}); }
    if (nome && pts.length >= 2 && !isFinite(num(nome))) novas.push({nome, pts}); else erro++; });
  if (!novas.length) return toast('Não reconheci nenhuma rua. Formato: Nome; X1; Y1; cota1; X2; Y2; cota2 …');
  editar(() => { novas.forEach(r => { const ja = P.ruas.find(q => q.nome.toLowerCase() === r.nome.toLowerCase()); if (ja) ja.pts = r.pts; else P.ruas.push({id: novoId('r'), nome: r.nome, pts: r.pts}); }); ruasMudaram(); });
  fechar(); PL.vb = null; render(); toast(novas.length + ' rua(s) lançadas' + (erro ? ' · ' + erro + ' linha(s) ignoradas' : '') + '.');
}
function colarTopo(txt) { const pts = []; linhas(txt).forEach(c => { const n = c.map(num).filter(isFinite); if (n.length >= 3) pts.push({x: n[n.length - 3], y: n[n.length - 2], z: n[n.length - 1]}); });
  if (!pts.length) return toast('Formato: X; Y; cota (uma linha por ponto).'); editar(() => { P.topo = P.topo.concat(pts); ruasMudaram(); }); fechar(); PL.vb = null; render(); toast(pts.length + ' ponto(s) de topografia.'); }

/* ── mouse e toque na planta ── */
function plMundo(ev) { const svg = $('pl-svg'), r = svg.getBoundingClientRect(), v = PL.vb; return {x: v.x + (ev.clientX - r.left) / r.width * v.w, y: -(v.y + (ev.clientY - r.top) / r.height * v.h), px: v.w / r.width}; }
function plIma(p) {   /* encosta em vértices, PVs e eixos de rua próximos */
  const lim = 10 * p.px; let m = null, dm = lim;
  const t = (x, y) => { const d = Math.hypot(x - p.x, y - p.y); if (d < dm) { dm = d; m = {x, y}; } };
  P.ruas.forEach(r => r.pts.forEach(q => t(q.x, q.y))); P.nos.forEach(n => t(n.x, n.y)); PL.des.forEach(q => t(q.x, q.y));
  if (m) return m;
  P.ruas.forEach(r => { for (let i = 1; i < r.pts.length; i++) { const a = r.pts[i - 1], b = r.pts[i], L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (!L2) continue; const k = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2)); t(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k); } });
  return m || {x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10};
}
function plConcluirRua() { if (PL.des.length < 2) { PL.des = []; PL.cur = null; plDesenhar(); return; }
  const letras = P.ruas.length; let id; editar(() => { id = novoId('r'); P.ruas.push({id, nome: 'Rua ' + (letras + 1), pts: PL.des.map(q => ({x: ESG.r3(q.x), y: ESG.r3(q.y), z: ESG.idw(P.topo, q.x, q.y) != null ? ESG.r3(ESG.idw(P.topo, q.x, q.y)) : null}))}); ruasMudaram(); }, true);
  PL.des = []; PL.cur = null; SEL = {tipo: 'rua', id}; ladoTracado(); plDesenhar(); const inp = document.querySelector('[data-ruanome="' + id + '"]'); if (inp) { inp.focus(); inp.select(); }
  toast('Rua criada. Digite o nome e as cotas ao lado, ou continue desenhando.'); }
function plDown(ev) {
  const svg = $('pl-svg'); if (!svg || !PL.vb) return; svg.setPointerCapture(ev.pointerId); PL.pts.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
  if (PL.pts.size === 2) { const [a, b] = [...PL.pts.values()]; PL.drag = {tipo: 'pinca', d0: Math.hypot(a.x - b.x, a.y - b.y), vb: Object.assign({}, PL.vb)}; return; }
  const p = plMundo(ev), al = ev.target.closest ? ev.target : null, ds = al && al.dataset || {};
  PL.drag = {tipo: 'pan', x: ev.clientX, y: ev.clientY, vb: Object.assign({}, PL.vb), mov: false, ds, p};
  if (PL.modo === 'sel' && ev.button === 0) { if (ds.vx) PL.drag.tipo = 'vx'; else if (ds.no) PL.drag.tipo = 'no'; if (PL.drag.tipo !== 'pan') PL.drag.antes = JSON.stringify(P); }
}
function plMove(ev) {
  if (!PL.vb) return; if (PL.pts.has(ev.pointerId)) PL.pts.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
  const d = PL.drag, svg = $('pl-svg'), r = svg.getBoundingClientRect();
  if (d && d.tipo === 'pinca' && PL.pts.size === 2) { const [a, b] = [...PL.pts.values()], k = d.d0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), cx = ((a.x + b.x) / 2 - r.left) / r.width, cy = ((a.y + b.y) / 2 - r.top) / r.height;
    PL.vb = {w: d.vb.w * k, h: d.vb.h * k, x: d.vb.x + d.vb.w * cx * (1 - k), y: d.vb.y + d.vb.h * cy * (1 - k)}; return plDesenhar(); }
  if (PL.modo === 'rua' && PL.des.length && !d) { PL.cur = plIma(plMundo(ev)); return plDesenhar(); }
  if (!d) return; const dx = ev.clientX - d.x, dy = ev.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 4) d.mov = true; if (!d.mov) return;
  if (d.tipo === 'pan') { PL.vb.x = d.vb.x - dx / r.width * d.vb.w; PL.vb.y = d.vb.y - dy / r.height * d.vb.h; }
  else { const p = plMundo(ev); if (d.tipo === 'no') { const n = noDe(d.ds.no); n.x = ESG.r3(p.x); n.y = ESG.r3(p.y); P.trechos.forEach(t => { if (t.de === n.id || t.para === n.id) delete t.L; }); }
    else { const [rid, i] = d.ds.vx.split(':'), q = ruaDe(rid).pts[+i], s = plIma(p); q.x = ESG.r3(s.x); q.y = ESG.r3(s.y); } }
  plDesenhar();
}
function plUp(ev) {
  PL.pts.delete(ev.pointerId); const d = PL.drag; PL.drag = null; if (!d || d.tipo === 'pinca') return;
  if (d.mov) { if (d.tipo === 'no' || d.tipo === 'vx') { const depois = JSON.stringify(P); P = migrar(JSON.parse(d.antes)); DB.list[DB.cur] = P; editar(() => { const q = JSON.parse(depois); P.nos = q.nos; P.ruas = q.ruas; P.trechos = q.trechos; if (d.tipo === 'no') P.manual = true; else ruasMudaram(); }, true); ladoTracado(); plDesenhar(); } return; }
  const p = d.p, ds = d.ds;
  if (PL.modo === 'rua') { const s = plIma(p), u = PL.des[PL.des.length - 1]; if (u && Math.hypot(u.x - s.x, u.y - s.y) < 6 * p.px) return plConcluirRua(); PL.des.push(s); PL.cur = null; return plDesenhar(); }
  if (PL.modo === 'saida') { editar(() => { P.saida = {x: ESG.r3(p.x), y: ESG.r3(p.y)}; if (P.trechos.length && !P.manual) ruasMudaram(); }, true); PL.modo = 'sel'; render(); return toast(P.manual ? 'Lançamento marcado. Use 🧭 Gerar rede para refazer o sentido do esgoto.' : 'Lançamento marcado; rede refeita para escoar até ele.'); }
  if (PL.modo === 'pv') { if (!ds.tr) return toast('Clique sobre um trecho.'); const t = trDe(ds.tr), a = noDe(t.de), b = noDe(t.para), L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2, k = Math.max(0.05, Math.min(0.95, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2));
    editar(() => { const Lt = t.L > 0 ? +t.L : Math.sqrt(L2), n = {id: novoId('n'), x: ESG.r3(a.x + (b.x - a.x) * k), y: ESG.r3(a.y + (b.y - a.y) * k), ct: ESG.r3((+a.ct || 0) + ((+b.ct || 0) - (+a.ct || 0)) * k)}; P.nos.push(n);
      P.trechos.push({id: novoId('t'), de: n.id, para: t.para, rua: t.rua, L: ESG.r3(Lt * (1 - k)), lados: t.lados}); t.para = n.id; t.L = ESG.r3(Lt * k); P.manual = true; renumerar(); SEL = {tipo: 'no', id: n.id}; }); return; }
  if (PL.modo === 'lig') { if (!ds.no) return toast('Clique num PV.'); if (!PL.ligDe) { PL.ligDe = ds.no; SEL = {tipo: 'no', id: ds.no}; plDesenhar(); return toast('Agora clique no PV de jusante.'); }
    const de = PL.ligDe; PL.ligDe = null; if (de === ds.no) return; editar(() => { P.trechos.push({id: novoId('t'), de, para: ds.no, rua: '', lados: 2}); P.manual = true; renumerar(); }); return; }
  if (PL.modo === 'del') { if (ds.tr) return excluir('tr', ds.tr); if (ds.no) return excluir('no', ds.no); if (ds.rua) return excluir('rua', ds.rua); return; }
  SEL = ds.vx ? {tipo: 'rua', id: ds.vx.split(':')[0]} : ds.no ? {tipo: 'no', id: ds.no} : ds.tr ? {tipo: 'tr', id: ds.tr} : ds.rua ? {tipo: 'rua', id: ds.rua} : null; ladoTracado(); plDesenhar();
}
function plRoda(ev) { ev.preventDefault(); if (!PL.vb) return; const svg = $('pl-svg'), r = svg.getBoundingClientRect(), k = ev.deltaY > 0 ? 1.18 : 1 / 1.18, cx = (ev.clientX - r.left) / r.width, cy = (ev.clientY - r.top) / r.height, v = PL.vb;
  PL.vb = {w: v.w * k, h: v.h * k, x: v.x + v.w * cx * (1 - k), y: v.y + v.h * cy * (1 - k)}; plDesenhar(); }
function excluir(tipo, id) {
  editar(() => {
    if (tipo === 'rua') { P.ruas = P.ruas.filter(r => r.id !== id); if (!P.manual) { if (P.ruas.length) ruasMudaram(); else { P.nos = []; P.trechos = []; } } }
    else { P.trechos = tipo === 'tr' ? P.trechos.filter(t => t.id !== id) : P.trechos.filter(t => t.de !== id && t.para !== id);
      P.nos = P.nos.filter(n => P.trechos.some(t => t.de === n.id || t.para === n.id)); P.manual = true; renumerar(); }
    SEL = null; });
}

/* ── DXF (R12, texto) ── */
