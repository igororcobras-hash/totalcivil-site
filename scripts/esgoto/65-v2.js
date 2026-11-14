/* ════════════════════════════════════════════════════════════════════
   ELEVATÓRIA, RECALQUE, SIFÃO, TUBOS (tela) · EXPORTAÇÃO CAD (DXF e DWG)
   ════════════════════════════════════════════════════════════════════ */
const selOp = (ops, v) => ops.map(o => `<option value="${o[0]}"${String(v == null ? '' : v) === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('');
const MATS_REDE = [['pvcm', 'PVC de parede maciça (NBR 7362)'], ['pvcc', 'PVC corrugado de dupla parede'], ['conc', 'Concreto (todos os diâmetros)']];
const MATS_PRESS = [['pvc', 'PVC DEFOFO 1,0 MPa'], ['pead', 'PEAD PE 100 PN 10'], ['fofo', 'Ferro fundido dúctil K9']];
function dadosExtra() {
  const c = R && R.c || ESG.crit(P), m = c.mat || 'pvcm', dns = m === 'conc' ? [] : ESG.SERIE.filter(D => D <= 400 && (ESG.TUBOS[m].DE[D] || m === 'pvcm'));
  const lin = dns.map(D => { const g = ESG.tuboGeo(D, Object.assign({}, c, {usaDI: true}), m), man = c.diMan && c.diMan[m] && c.diMan[m][D];
    return `<tr><td>DN ${D}</td><td>${fm(g.de, 0)}</td><td><input data-di="${D}" inputmode="decimal" style="width:84px" value="${man ? fm(+man, 1) : ''}" placeholder="${fm(g.di, 1)}${g.aprox ? ' ≈' : ''}" title="Vazio = valor do programa. Digite o DI do catálogo do fabricante."/></td></tr>`; }).join('');
  return `<div class="card"><h2>Tubos da rede</h2><div class="fg" style="grid-template-columns:1fr">
      <div class="f"><label>Tubo até DN 400 (acima disso, concreto)</label><select data-sel="mat">${selOp(MATS_REDE, m)}</select><div class="aj">Dá para trocar em cada trecho, no Traçado.</div></div></div>
    <label style="display:flex;gap:7px;align-items:center;margin:8px 0;font-size:.86rem"><input type="checkbox" data-chk="usaDI"${c.usaDI ? ' checked' : ''}/> Calcular com o diâmetro interno real (DI), e não com o nominal</label>
    ${lin ? `<div class="tw" style="max-height:230px"><table><thead><tr><th>Tubo</th><th>Externo<small>mm</small></th><th>Interno (DI)<small>mm</small></th></tr></thead><tbody>${lin}</tbody></table></div>
    <p class="mut" style="font-size:.76rem;margin:6px 0 0">“≈” = valor aproximado: confira no catálogo do fabricante e digite o DI. O diâmetro externo entra na largura da vala e no recobrimento.</p>` : '<p class="mut" style="font-size:.8rem">Concreto: DI = DN; parede ≈ DN/12 + 25 mm.</p>'}</div>
  <div class="card"><h2>Elevatória e recalque <small>(NBR 12208)</small></h2><div class="fg">
      <div class="f"><label>Tubo do recalque</label><select data-sel="eMat">${selOp(MATS_PRESS, c.eMat)}</select></div>${CAMPOS.eee.map(campo).join('')}</div>
    <p class="mut" style="font-size:.78rem;margin:8px 0 0">Para criar: no Traçado, botão <b>🏭 Elevatória</b> (o programa sugere onde) ou clique num PV › “Criar elevatória neste PV”.</p>
    <h3>Sifão invertido</h3><div class="fg"><div class="f"><label>Tubo do sifão</label><select data-sel="sMat">${selOp(MATS_PRESS.slice().reverse(), c.sMat)}</select></div>${CAMPOS.sif.map(campo).join('')}</div>
    <p class="mut" style="font-size:.78rem;margin:8px 0 0">Para criar: no Traçado, clique no trecho que passa sob o córrego/galeria › “Sifão invertido”.</p></div>`;
}
function ladoTrExtra(t, r) {
  if (r && r.recq) return `<div class="aviso inf" style="grid-column:1/-1;margin:0">Linha de recalque da ${esc((R.eee[r.recq] || {}).nome || 'elevatória')}: ${esc(r.matRec || '')} DN ${r.D}, V = ${fm(r.hF.V, 2)} m/s. Não recebe ligações.</div>`;
  let s = `<div class="f"><label>Onde passa</label><select data-trk="loc" data-id="${t.id}">${selOp([['', 'Leito da via (recobrimento ' + fm(P.crit.rec, 2) + ' m)'], ['passeio', 'Passeio (recobrimento ' + fm(P.crit.recPas, 2) + ' m)']], t.loc || '')}</select></div>
    <div class="f"><label>Tubo</label><select data-trk="mat" data-id="${t.id}">${selOp([['', 'do projeto']].concat(MATS_REDE), t.mat || '')}</select></div>
    <div class="f" style="grid-column:1/-1"><label>Travessia</label><select data-sif="on" data-id="${t.id}">${selOp([['', 'Trecho comum (escoamento livre)'], ['1', 'Sifão invertido (passa por baixo de córrego, galeria, adutora…)']], t.sif ? '1' : '')}</select></div>`;
  if (t.sif) s += `<div class="f"><label>Linhas do sifão</label><select data-sif="n" data-id="${t.id}">${selOp([['', 'do projeto (' + P.crit.sLinhas + ')'], [1, '1'], [2, '2'], [3, '3']], t.sif.n || '')}</select></div>
    <div class="f"><label>Cota do fundo do obstáculo (m)</label><input data-sif="cota" data-id="${t.id}" inputmode="decimal" value="${t.sif.cota != null && t.sif.cota !== '' ? fm(+t.sif.cota, 3).replace(/\./g, '') : ''}" placeholder="${r && r.sif ? fm(r.sif.obst, 2) + ' (1,5 m abaixo do terreno)' : ''}"/></div>
    ${r && r.sif ? `<div class="aviso inf" style="grid-column:1/-1;margin:0">${r.sif.n} × ${esc(r.sif.matNome)} DN ${r.sif.dn} · V inicial ${fm(r.sif.Vi, 2)} · final ${fm(r.sif.Vf, 2)} m/s · perda ${fm(r.sif.dH, 3)} m · fundo na cota ${fm(r.sif.fundo, 3)}</div>` : ''}`;
  return s;
}
const eeeCaminho = id => { const l = []; let n = id, k = 0; while (R && R.ok && R.outs[n] && R.outs[n][0] && k++ < 200) { n = R.outs[n][0].para; l.push(n); } return l; };
function ladoEEE(n, x) {
  if (!R || !R.ok) return '';
  const e = (P.eee || []).find(q => q.no === n.id);
  if (!e) return x && x.recebeRec ? '<div class="aviso inf" style="margin:8px 0 0">Este PV recebe uma linha de recalque: a rede segue daqui por gravidade.</div>' : `<div class="barra" style="margin-top:8px"><button class="bt peq" data-eeenovo="${n.id}" title="A rede que chega aqui passa a ser bombeada para um PV mais alto ou para um ponto de descarga">🏭 Criar elevatória neste PV</button></div>`;
  const E = R.eee[e.id], cam = eeeCaminho(n.id), T = ESG.RECALQUE[e.mat || P.crit.eMat] || ESG.RECALQUE.pvc;
  return `<h3>🏭 Estação elevatória</h3><div class="fg" style="grid-template-columns:1fr 1fr">
    <div class="f" style="grid-column:1/-1"><label>Recalca para</label><select data-eee="ate" data-id="${e.id}">${selOp(cam.map(id => [id, nomeNo(noDe(id)) + ' (terreno ' + fm(+noDe(id).ct, 2) + ')']).concat([['@ext', 'Ponto fora da rede (ETE, PV existente…)']]), e.ext ? '@ext' : e.ate)}</select></div>
    ${e.ext ? `<div class="f"><label>Cota de chegada (m)</label><input data-eee="extCota" data-id="${e.id}" inputmode="decimal" value="${fm(+e.ext.cota, 3).replace(/\./g, '')}"/></div><div class="f"><label>Extensão do recalque (m)</label><input data-eee="extL" data-id="${e.id}" inputmode="decimal" value="${fm(+e.ext.L, 1).replace(/\./g, '')}"/></div>` : ''}
    <div class="f"><label>Tubo do recalque</label><select data-eee="mat" data-id="${e.id}">${selOp([['', 'do projeto']].concat(MATS_PRESS), e.mat || '')}</select></div>
    <div class="f"><label>DN do recalque</label><select data-eee="dnRec" data-id="${e.id}">${selOp([['', 'automático']].concat(T.l.map(q => [q[0], 'DN ' + q[0]])), e.dnRec || '')}</select></div></div>
    ${E ? `<div class="kpis" style="margin-top:8px"><div class="kpi"><b>${fm(E.Qb, 2)} L/s</b><span>Vazão da bomba</span></div><div class="kpi"><b>${fm(E.AMT, 1)} mca</b><span>Altura manométrica</span></div><div class="kpi"><b>${fm(E.Pm, 1)} cv</b><span>Motor (1 + 1 reserva)</span></div><div class="kpi"><b>DN ${E.dn}</b><span>${fm(E.Lr, 0)} m · ${fm(E.V, 2)} m/s</span></div><div class="kpi"><b>Ø ${fm(E.Dp, 2)} m</b><span>Poço · útil ${fm(E.Vu, 2)} m³</span></div><div class="kpi"><b>${fm(E.profP, 2)} m</b><span>Profundidade do poço</span></div></div>` : ''}
    <div class="barra" style="margin-top:8px"><button class="bt peq" data-eeedel="${e.id}">✖ Retirar a elevatória</button></div>`;
}
function eeeNova(id) {
  editar(() => { const cam = eeeCaminho(id), e = {id: novoId('e'), no: id}, n = noDe(id);
    if (cam.length) { let M = cam[0]; for (const q of cam) { M = q; if ((R.ins[q] || []).length > 1) break; } e.ate = M; } else e.ext = {nome: 'ponto de descarga', cota: ESG.r3((+n.ct || 0) + 3), L: 100};
    P.eee = (P.eee || []).concat([e]); P.manual = true; });
  toast('Elevatória criada. Escolha para onde ela recalca; bombas, poço e recalque já foram calculados.', 6000);
}
function sugEEE() {
  if (!R || !R.ok) return toast('Gere a rede primeiro.');
  let res; editar(() => { res = ESG.sugerirEEE(P); if (res.lista && res.lista.length) P.manual = true; });
  if (!res.lista || !res.lista.length) return toast('Nenhuma elevatória necessária: a rede não passa de ' + fm(R.c.profMax, 1) + ' m de profundidade nem chega abaixo do lançamento. Para criar à mão, clique num PV › “Criar elevatória neste PV”.', 9000);
  modal(`<h2>🏭 Elevatórias criadas</h2><p class="mut" style="font-size:.86rem">O programa pôs uma elevatória onde a rede por gravidade ficava funda demais. Tudo já foi calculado (NBR 12208) e entra no perfil, no 3D, no memorial e no orçamento. Use ↶ Desfazer se não quiser.</p>
    ${res.lista.map(x => { const E = R.eee[x.e.id]; return `<div class="aviso inf"><b>${esc(E ? E.nome : 'EEE')}</b> — motivo: ${esc(x.motivo)}.${E ? `<br>Bombas 1 + 1 de ${fm(E.Qb, 2)} L/s × ${fm(E.AMT, 1)} mca, motor ${fm(E.Pm, 1)} cv · recalque ${esc(E.matNome)} DN ${E.dn}, ${fm(E.Lr, 0)} m até ${esc(E.ateNome)} (V ${fm(E.V, 2)} m/s) · poço Ø ${fm(E.Dp, 2)} m, ${fm(E.profP, 2)} m de profundidade.` : ''}</div>`; }).join('')}
    <p style="font-size:.86rem">Profundidade máxima da rede agora: <b>${fm(R.profMaxima, 2)} m</b> · ${R.nErr} erro(s), ${R.nWarn} alerta(s).</p><div class="barra"><button class="bt pri" data-fechar>Entendi</button></div>`);
}
function eeeCards() {
  const L = Object.values(R.eee || {}); if (!L.length) return '';
  return `<div class="card"><h2>Estações elevatórias e recalque <small>(NBR 12208)</small></h2><div class="tw"><table><thead><tr><th class="l">Elevatória</th><th>Q bomba<small>L/s</small></th><th>AMT<small>mca</small></th><th>Desnível<small>m</small></th><th>Perdas<small>m</small></th><th>Motor<small>cv</small></th><th class="l">Recalque</th><th>L<small>m</small></th><th>V<small>m/s</small></th><th>Vol. útil<small>m³</small></th><th>Ø poço<small>m</small></th><th>NA máx./mín.</th><th>Fundo</th><th>Detenção<small>min</small></th><th>Golpe<small>mca</small></th></tr></thead><tbody>
    ${L.map(E => `<tr data-selc="${E.no}" style="cursor:pointer"><td class="l"><b>${esc(E.nome)}</b></td><td>${fm(E.Qb, 2)}</td><td>${fm(E.AMT, 2)}</td><td>${fm(E.Hg, 2)}</td><td>${fm(E.hf + E.hl, 2)}</td><td>${fm(E.Pm, 1)} <small>(${fm(E.Pcv, 2)})</small></td><td class="l">${esc(E.matNome.split(' (')[0])} DN ${E.dn} → ${esc(E.ateNome)}</td><td>${fm(E.Lr, 0)}</td><td class="${E.V < R.c.eVmin || E.V > R.c.eVmax ? 'w' : ''}">${fm(E.V, 2)}</td><td>${fm(E.Vu, 2)}</td><td>${fm(E.Dp, 2)}</td><td>${fm(E.NAmax, 2)} / ${fm(E.NAmin, 2)}</td><td>${fm(E.fundo, 2)}</td><td class="${E.td > R.c.eDet ? 'w' : ''}">${fm(E.td, 0)}</td><td>${fm(E.dHa, 0)}</td></tr>`).join('')}</tbody></table></div>
    <p class="mut" style="font-size:.78rem;margin:8px 0 0">Bombas submersíveis 1 + 1 reserva · volume útil V = Q·T/4 · perdas por Hazen-Williams + localizadas · golpe de aríete por Joukowsky (fechamento brusco, a favor da segurança). O ponto de trabalho deve ser conferido na curva da bomba escolhida.</p></div>`;
}

/* ══ EXPORTAÇÃO CAD: uma só "cena" (planta, quadro, perfis e carimbo) gravada em DXF ou DWG ══ */
function cadCena() {
  const E = [], LAY = [['ESG-RUA-EIXO', 8], ['ESG-RUA-NOME', 8], ['ESG-TOPOGRAFIA', 9], ['ESG-REDE', 5], ['ESG-REDE-TEXTO', 5], ['ESG-RECALQUE', 6], ['ESG-SIFAO', 4], ['ESG-PV', 3], ['ESG-PV-TEXTO', 3], ['ESG-EEE', 6], ['ESG-LANCAMENTO', 1],
    ['ESG-PERFIL-TERRENO', 34], ['ESG-PERFIL-TUBO', 5], ['ESG-PERFIL-PV', 3], ['ESG-PERFIL-GRADE', 8], ['ESG-PERFIL-TEXTO', 7], ['ESG-QUADRO', 7], ['ESG-CARIMBO', 7]];
  const Ln = (l, x1, y1, x2, y2) => E.push({t: 'L', l, x1, y1, x2, y2}), Pl = (l, pts, c) => E.push({t: 'P', l, pts, c: !!c}), Ci = (l, x, y, r) => E.push({t: 'C', l, x, y, r});
  const Tx = (l, x, y, h, txt, ang, al) => { txt = String(txt); ang = ang || 0; if (al === 'C' || al === 'R') { const w = 0.62 * h * txt.length * (al === 'C' ? 0.5 : 1), a = ang * Math.PI / 180; x -= w * Math.cos(a); y -= w * Math.sin(a); } E.push({t: 'T', l, x, y, h, txt, ang}); };
  const B = limites(), ht = Math.max(0.8, Math.min(2.5, Math.max(B.w, B.h) / 260)), f2 = v => (+v).toFixed(2).replace('.', ','), f3 = v => (+v).toFixed(3).replace('.', ',');
  const angT = (ux, uy) => { let a = Math.atan2(uy, ux) * 180 / Math.PI; if (a > 90) a -= 180; if (a < -90) a += 180; return a; };
  /* ── planta ── */
  P.ruas.forEach(r => { if (r.pts.length < 2) return; Pl('ESG-RUA-EIXO', r.pts.map(q => [q.x, q.y])); const a = r.pts[0], b = r.pts[1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / l, uy = (b.y - a.y) / l, an = angT(ux, uy), k = an * Math.PI / 180;
    Tx('ESG-RUA-NOME', a.x + ux * l * 0.25 + Math.sin(k) * (P.crit.largRua / 2 + ht), a.y + uy * l * 0.25 - Math.cos(k) * (P.crit.largRua / 2 + ht * 2), ht * 1.2, r.nome.toUpperCase(), an, 'C'); });
  P.topo.forEach(q => { Ln('ESG-TOPOGRAFIA', q.x - ht / 3, q.y, q.x + ht / 3, q.y); Ln('ESG-TOPOGRAFIA', q.x, q.y - ht / 3, q.x, q.y + ht / 3); Tx('ESG-TOPOGRAFIA', q.x + ht / 2, q.y + ht / 2, ht * 0.7, f2(q.z)); });
  P.trechos.forEach(t => { const a = noDe(t.de), b = noDe(t.para), r = R.tr[t.id]; if (!a || !b || !r) return; const lay = r.recq ? 'ESG-RECALQUE' : r.sif ? 'ESG-SIFAO' : 'ESG-REDE', l = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / l, uy = (b.y - a.y) / l, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, an = angT(ux, uy), k = an * Math.PI / 180;
    Ln(lay, a.x, a.y, b.x, b.y); const s = ht * 0.9; Pl(lay, [[mx + ux * s, my + uy * s], [mx - ux * s - uy * s * 0.5, my - uy * s + ux * s * 0.5], [mx - ux * s + uy * s * 0.5, my - uy * s - ux * s * 0.5]], true);
    const txt = r.recq ? `${r.nome} RECALQUE DN${r.D} L=${f2(r.L)}m` : r.sif ? `${r.nome} SIFÃO ${r.sif.n}xDN${r.D} L=${f2(r.L)}m` : `${r.nome} DN${r.D} i=${(r.I * 100).toFixed(2).replace('.', ',')}% L=${f2(r.L)}m`;
    if (l > txt.length * ht * 0.62) Tx('ESG-REDE-TEXTO', mx - Math.sin(k) * ht * 0.7, my + Math.cos(k) * ht * 0.7, ht, txt, an, 'C'); else Tx('ESG-REDE-TEXTO', mx - Math.sin(k) * ht * 0.7, my + Math.cos(k) * ht * 0.7, ht * 0.8, r.nome + ' DN' + r.D, an, 'C'); });
  Object.values(R.no).forEach(x => { const n = noDe(x.id); if (!n) return; const re = x.Dpv / 2 + x.par;
    if (x.tipo === 'EEE') { Pl('ESG-EEE', [[n.x - re, n.y - re], [n.x + re, n.y - re], [n.x + re, n.y + re], [n.x - re, n.y + re]], true); Ci('ESG-EEE', n.x, n.y, x.Dpv / 2); } else { Ci('ESG-PV', n.x, n.y, re); if (x.tipo === 'PV') Ci('ESG-PV', n.x, n.y, 0.30); }
    if (x.fim) Pl('ESG-LANCAMENTO', [[n.x, n.y + re + ht * 2], [n.x + ht, n.y + re + ht * 0.2], [n.x - ht, n.y + re + ht * 0.2]], true);
    Tx('ESG-PV-TEXTO', n.x + re + ht * 0.5, n.y + ht * 0.4, ht, nomeNo(n) + (x.tipo === 'EEE' ? ' (EEE)' : x.tq ? ' (TQ)' : '') + (x.fim ? ' - LANÇAMENTO' : ''));
    Tx('ESG-PV-TEXTO', n.x + re + ht * 0.5, n.y - ht * 0.8, ht * 0.75, 'CT ' + f3(x.ct) + '  CF ' + f3(x.cf) + '  h=' + f2(x.prof)); });
  /* ── quadro de trechos ── */
  const qx = B.x + B.w + 30 * ht, qy = B.y + B.h, rh = ht * 2.2, cols = [['TRECHO', 8], ['MONTANTE', 10], ['JUSANTE', 10], ['L (m)', 8], ['DN', 6], ['i (%)', 8], ['CC MONT.', 10], ['CC JUS.', 10], ['PROF.M', 8], ['PROF.J', 8], ['Qf (L/s)', 9], ['y/D', 6], ['V (m/s)', 8]], cw = cols.map(c => c[1] * ht), tw = cw.reduce((a, b) => a + b, 0);
  const linhasQ = []; R.coletores.forEach(c => c.trechos.forEach(id => { const r = R.tr[id]; linhasQ.push([r.nome, nomeNo(noDe(r.de)), nomeNo(noDe(r.para)), f2(r.L), r.recq ? 'R' + r.D : r.sif ? r.sif.n + 'x' + r.D : r.D, r.recq || r.sif ? '-' : (r.I * 100).toFixed(3).replace('.', ','), f3(r.ciM), f3(r.ciJ), f2(r.profM), f2(r.profJ), f2(r.QF), r.recq || r.sif ? '-' : r.hF.carga ? 'cheio' : f2(r.hF.yd), f2(r.hF.V)]); }));
  Tx('ESG-QUADRO', qx, qy + rh * 0.6, ht * 1.3, 'QUADRO DE TRECHOS - REDE COLETORA DE ESGOTO');
  [cols.map(c => c[0])].concat(linhasQ).forEach((row, i) => { const y = qy - i * rh; let x = qx; row.forEach((v, j) => { Tx('ESG-QUADRO', x + cw[j] / 2, y - rh * 0.72, ht * 0.85, v, 0, 'C'); x += cw[j]; }); Ln('ESG-QUADRO', qx, y, qx + tw, y); });
  const yb = qy - (linhasQ.length + 1) * rh; Ln('ESG-QUADRO', qx, yb, qx + tw, yb); { let x = qx; Ln('ESG-QUADRO', x, qy, x, yb); cw.forEach(w => { x += w; Ln('ESG-QUADRO', x, qy, x, yb); }); }
  /* ── perfis (escala horizontal 1:1, vertical exagerada 10×) ── */
  const ev = 10; let py = B.y - 12 * ht;
  R.coletores.forEach(col => { const tr = col.trechos.map(id => R.tr[id]), nos = [tr[0].de].concat(tr.map(r => r.para)), xs = [0]; tr.forEach(r => xs.push(xs[xs.length - 1] + r.L));
    const zmax = Math.max(...tr.map(r => Math.max(r.ctM, r.ctJ))), zmin = Math.min(...tr.map(r => Math.min(r.ciM, r.ciJ, r.sif ? r.sif.fundo : r.ciJ)), ...nos.map(id => R.no[id].cf)), zr = Math.floor(zmin) - 1, H = (zmax - zr + 1) * ev;
    const x0 = B.x, y0 = py - H, X = d => x0 + d, Y = z => y0 + (z - zr) * ev, Lt = xs[xs.length - 1];
    Tx('ESG-PERFIL-TEXTO', x0, py + ht, ht * 1.3, 'PERFIL - COLETOR ' + col.num + '  (H 1:1 - V ' + ev + 'x)  ' + f2(Lt) + ' m');
    for (let z = zr; z <= zmax + 1; z++) { Ln('ESG-PERFIL-GRADE', X(0), Y(z), X(Lt), Y(z)); Tx('ESG-PERFIL-GRADE', X(0) - ht * 0.5, Y(z) - ht * 0.35, ht * 0.8, f2(z), 0, 'R'); }
    Pl('ESG-PERFIL-TERRENO', [[X(0), Y(tr[0].ctM)]].concat(tr.map((r, i) => [X(xs[i + 1]), Y(r.ctJ)])));
    tr.forEach((r, i) => { const x1 = X(xs[i]), x2 = X(xs[i + 1]), xm = (x1 + x2) / 2;
      if (r.recq) Ln('ESG-RECALQUE', x1, Y(r.ciM + r.d / 2), x2, Y(r.ciJ + r.d / 2));
      else if (r.sif) Pl('ESG-SIFAO', [[x1, Y(r.ciM + r.d / 2)], [x1 + (x2 - x1) * 0.22, Y(r.sif.fundo + r.d / 2)], [x1 + (x2 - x1) * 0.78, Y(r.sif.fundo + r.d / 2)], [x2, Y(r.ciJ + r.d / 2)]]);
      else { Ln('ESG-PERFIL-TUBO', x1, Y(r.ciM), x2, Y(r.ciJ)); Ln('ESG-PERFIL-TUBO', x1, Y(r.ciM + r.d), x2, Y(r.ciJ + r.d)); }
      Tx('ESG-PERFIL-TEXTO', xm, y0 - ht * 10.2, ht * 0.8, f2(r.L) + ' m - ' + (r.recq ? 'REC. ' : r.sif ? 'SIFAO ' + r.sif.n + 'x' : '') + 'DN ' + r.D, 0, 'C');
      Tx('ESG-PERFIL-TEXTO', xm, y0 - ht * 12.6, ht * 0.8, r.recq ? 'sob pressao' : r.sif ? 'dH ' + f3(r.sif.dH) + ' m' : 'i = ' + (r.I * 100).toFixed(3).replace('.', ',') + ' %', 0, 'C'); });
    nos.forEach((id, i) => { const x = R.no[id], n = noDe(id), cx = X(xs[i]), w = x.Dpv / 2;
      Pl('ESG-PERFIL-PV', [[cx - w, Y(x.cf)], [cx + w, Y(x.cf)], [cx + w, Y(x.ct)], [cx - w, Y(x.ct)]], true); Ln('ESG-PERFIL-GRADE', cx, Y(x.cf), cx, y0 - ht * 7.6);
      const cin = i > 0 ? tr[i - 1].ciJ : null, cout = i < tr.length ? tr[i].ciM : null, cc = cin != null && cout != null && Math.abs(cin - cout) > 0.0005 ? f3(cin) + '/' + f3(cout) : f3(cout != null ? cout : cin), al = i === 0 ? 'L' : i === nos.length - 1 ? 'R' : 'C';
      [nomeNo(n) + (x.tipo === 'EEE' ? ' (EEE)' : x.tq ? ' (TQ)' : ''), f3(x.ct), cc, f2(x.prof)].forEach((v, k) => Tx('ESG-PERFIL-TEXTO', cx, y0 - ht * (0.6 + 2.4 * k) - ht * 0.8, ht * 0.8, v, 0, al)); });
    ['PV', 'COTA DO TERRENO', 'COTA DO COLETOR', 'PROFUNDIDADE (m)', 'EXTENSAO - DN', 'DECLIVIDADE'].forEach((v, k) => { Ln('ESG-PERFIL-GRADE', X(0) - 22 * ht, y0 - ht * 2.4 * k, X(Lt), y0 - ht * 2.4 * k); Tx('ESG-PERFIL-TEXTO', X(0) - 21.5 * ht, y0 - ht * (0.6 + 2.4 * k) - ht * 0.8, ht * 0.8, v); });
    Ln('ESG-PERFIL-GRADE', X(0) - 22 * ht, y0 - ht * 14.4, X(Lt), y0 - ht * 14.4); Ln('ESG-PERFIL-GRADE', X(0) - 22 * ht, y0, X(0) - 22 * ht, y0 - ht * 14.4); Ln('ESG-PERFIL-GRADE', X(0), Y(zr), X(0), Y(zmax + 1));
    py = y0 - ht * 14.4 - 14 * ht; });
  /* ── carimbo ── */
  const cx0 = qx, cy0 = Math.min(yb - 10 * ht, B.y) - 26 * ht, cwid = Math.max(tw, 90 * ht);
  Pl('ESG-CARIMBO', [[cx0, cy0], [cx0 + cwid, cy0], [cx0 + cwid, cy0 + 24 * ht], [cx0, cy0 + 24 * ht]], true); [18, 12, 6].forEach(k => Ln('ESG-CARIMBO', cx0, cy0 + k * ht, cx0 + cwid, cy0 + k * ht));
  Tx('ESG-CARIMBO', cx0 + 2 * ht, cy0 + 19.8 * ht, ht * 2, 'REDE COLETORA DE ESGOTO SANITARIO - PLANTA, QUADRO E PERFIS');
  Tx('ESG-CARIMBO', cx0 + 2 * ht, cy0 + 14 * ht, ht * 1.6, 'PROJETO: ' + (P.nome || '') + (P.local ? '  -  ' + P.local : ''));
  Tx('ESG-CARIMBO', cx0 + 2 * ht, cy0 + 8 * ht, ht * 1.3, 'RESP. TECNICO: ' + (P.autor || '') + '     DATA: ' + new Date().toLocaleDateString('pt-BR'));
  Tx('ESG-CARIMBO', cx0 + 2 * ht, cy0 + 2.2 * ht, ht * 1.1, 'Desenho em metros (1 unidade = 1 m). Perfis: horizontal 1:1, vertical ' + ev + 'x. ' + R.ordem.length + ' trechos, ' + f2(R.vaz.Lt) + ' m, Qfinal ' + f2(R.Qfim) + ' L/s. NBR 9649. Total Civil.');
  return {layers: LAY, ents: E};
}
function cadDxf(C) {
  const n = v => (Math.round(v * 10000) / 10000).toString(), tx = s => String(s).replace(/[^\x20-\x7e]/g, ch => '\\U+' + ('0000' + ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4));
  let e = '';
  C.ents.forEach(o => {
    if (o.t === 'L') e += `0\nLINE\n8\n${o.l}\n10\n${n(o.x1)}\n20\n${n(o.y1)}\n30\n0\n11\n${n(o.x2)}\n21\n${n(o.y2)}\n31\n0\n`;
    else if (o.t === 'C') e += `0\nCIRCLE\n8\n${o.l}\n10\n${n(o.x)}\n20\n${n(o.y)}\n30\n0\n40\n${n(o.r)}\n`;
    else if (o.t === 'T') e += `0\nTEXT\n8\n${o.l}\n10\n${n(o.x)}\n20\n${n(o.y)}\n30\n0\n40\n${n(o.h)}\n1\n${tx(o.txt)}\n50\n${n(o.ang)}\n`;
    else if (o.t === 'P') { e += `0\nPOLYLINE\n8\n${o.l}\n66\n1\n70\n${o.c ? 1 : 0}\n`; o.pts.forEach(p => { e += `0\nVERTEX\n8\n${o.l}\n10\n${n(p[0])}\n20\n${n(p[1])}\n30\n0\n`; }); e += `0\nSEQEND\n8\n${o.l}\n`; } });
  return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n${C.layers.length}\n` +
    C.layers.map(l => `0\nLAYER\n2\n${l[0]}\n70\n0\n62\n${l[1]}\n6\nCONTINUOUS\n`).join('') + `0\nENDTAB\n0\nTABLE\n2\nSTYLE\n70\n1\n0\nSTYLE\n2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\ntxt\n4\n\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${e}0\nENDSEC\n0\nEOF\n`;
}
/* DWG: biblioteca acad-ts (licença MIT), empacotada em /tc-dwg.min.js e carregada só quando o usuário pede o DWG */
async function cadDwg(C) {
  if (!window.TCDWG) await carregarScript(location.origin + '/tc-dwg.min.js');
  const A = window.TCDWG, doc = new A.CadDocument(), lay = {};
  C.layers.forEach(([nm, cor]) => { const l = new A.Layer(nm); l.name = nm; l.color = new A.Color(cor); doc.layers.add(l); lay[nm] = l; });
  const add = (o, l) => { o.layer = lay[l]; doc.modelSpace.entities.add(o); };
  C.ents.forEach(o => {
    if (o.t === 'L') { const l = new A.Line(); l.startPoint = new A.XYZ(o.x1, o.y1, 0); l.endPoint = new A.XYZ(o.x2, o.y2, 0); add(l, o.l); }
    else if (o.t === 'C') { const c = new A.Circle(); c.center = new A.XYZ(o.x, o.y, 0); c.radius = o.r; add(c, o.l); }
    else if (o.t === 'T') { const t = new A.TextEntity(o.txt); t.insertPoint = new A.XYZ(o.x, o.y, 0); t.height = o.h; t.rotation = o.ang * Math.PI / 180; add(t, o.l); }
    else if (o.t === 'P') { const p = new A.LwPolyline(); o.pts.forEach(q => { const v = new A.LwPolylineVertex(); v.location = new A.XY(q[0], q[1]); p.vertices.push(v); }); p.isClosed = o.c; add(p, o.l); } });
  doc.header.version = A.ACadVersion.AC1015;   /* AutoCAD 2000: abre em qualquer versão posterior */
  return A.DwgWriter.writeToBuffer(doc);
}
async function cadExportar(tipo) {
  if (!R || !R.ok) return toast('Gere a rede primeiro.');
  const C = cadCena();
  if (tipo === 'dxf') { baixar(nomeArq() + '_projeto.dxf', cadDxf(C), 'application/dxf'); return toast('DXF gerado: planta, quadro de trechos, perfis de todos os coletores e carimbo, em camadas ESG-*.', 6000); }
  try { toast('Montando o DWG…'); const buf = await cadDwg(C); baixar(nomeArq() + '_projeto.dwg', new Blob([buf], {type: 'application/acad'})); toast('DWG gerado (formato AutoCAD 2000): planta, quadro, perfis e carimbo.', 6000); }
  catch (e) { console.error(e); baixar(nomeArq() + '_projeto.dxf', cadDxf(C), 'application/dxf'); toast('Não consegui gerar o DWG (' + ((e && e.message) || e) + '). Baixei o DXF, que o AutoCAD abre igual.', 9000); }
}
window.__esgCad = {cadCena, cadDxf, cadDwg};
