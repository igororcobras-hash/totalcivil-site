/* ════════════════════════════════════════════════════════════════════
   ABA 4 — PERFIS LONGITUDINAIS E SEÇÕES (vala e poço de visita)
   ════════════════════════════════════════════════════════════════════ */
const PF = {col: 1, ev: 10, ate: true};
/* medidas do PV usadas na seção e no 3D */
function pvGeo(x) { const tl = x.tipo === 'TL', hc = tl ? 0 : Math.max(0, Math.min(1.0, x.prof - 2.25)); return {tl, D: x.Dpv, par: tl ? 0.08 : 0.15, laje: 0.15, hc, hb: Math.max(0.3, x.prof - (tl ? 0.10 : 0.25) - hc)}; }
function caminho(num, ate) { const c = R.coletores.find(k => k.num === num) || R.coletores[0]; if (!c) return []; const ids = c.trechos.slice(); if (ate) { let n = R.tr[ids[ids.length - 1]].para; while (R.outs[n] && R.outs[n].length) { const t = R.outs[n][0]; ids.push(t.id); n = t.para; } } return ids; }
function perfilSVG(ids, ev, W) {
  W = W || 1100; const ml = 96, mr = 24, mt = 34, tr = ids.map(id => R.tr[id]), Lt = tr.reduce((s, r) => s + r.L, 0) || 1, sx = (W - ml - mr) / Lt;
  const zmax = Math.max(...tr.map(r => Math.max(r.ctM, r.ctJ))) + 0.6, zmin = Math.min(...tr.map(r => Math.min(r.ciJ, r.ciM, r.sif ? r.sif.fundo : r.ciJ)), ...[tr[0].de].concat(tr.map(r => r.para)).map(id => R.no[id].cf)) - 0.7; let sy = sx * ev; if ((zmax - zmin) * sy > 460) sy = 460 / (zmax - zmin); if ((zmax - zmin) * sy < 170) sy = 170 / (zmax - zmin);
  const H = (zmax - zmin) * sy, th = 17, TB = mt + H + 12, Ht = TB + th * 6 + 8, X = d => ml + d * sx, Y = z => mt + (zmax - z) * sy, f2 = v => v.toFixed(2).replace('.', ',');
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}" font-family="Arial,sans-serif" font-size="10"><rect width="${W}" height="${Ht}" fill="#fff"/>`;
  const passo = [0.5, 1, 2, 5, 10].find(p => p * sy >= 22) || 10;
  for (let z = Math.ceil(zmin / passo) * passo; z <= zmax; z += passo) s += `<line x1="${ml}" y1="${Y(z)}" x2="${W - mr}" y2="${Y(z)}" stroke="#e3ded3"/><text x="${ml - 6}" y="${Y(z) + 3}" text-anchor="end" fill="#5a6573">${f2(z)}</text>`;
  let d = 0; const xs = [0]; tr.forEach(r => { d += r.L; xs.push(d); });
  /* terreno */
  let pt = `M${X(0)} ${Y(tr[0].ctM)}`; tr.forEach((r, i) => pt += `L${X(xs[i + 1])} ${Y(r.ctJ)}`);
  s += `<path d="${pt}L${X(Lt)} ${Y(zmin)}L${X(0)} ${Y(zmin)}Z" fill="#f3ede2"/><path d="${pt}" fill="none" stroke="#8a6a4a" stroke-width="2.2"/>`;
  /* tubos e lâminas */
  tr.forEach((r, i) => { const x1 = X(xs[i]), x2 = X(xs[i + 1]), st = stTr(r.id), cor = st === 'e' ? '#b42318' : st === 'w' ? '#d97706' : '#12263f', sel = SEL && SEL.id === r.id;
    if (r.recq || r.sif) { const cz = r.recq ? '#a21caf' : '#0369a1', yM = Y(r.ciM + r.d / 2), yJ = Y(r.ciJ + r.d / 2), yF = r.sif ? Y(r.sif.fundo + r.d / 2) : 0, xm = (x1 + x2) / 2;
      const dd = r.sif ? `M${x1} ${yM}L${x1 + (x2 - x1) * 0.22} ${yF}L${x1 + (x2 - x1) * 0.78} ${yF}L${x2} ${yJ}` : `M${x1} ${yM}L${x2} ${yJ}`;
      s += `<path d="${dd}" fill="none" stroke="${cz}" stroke-width="${Math.max(3, r.d * sy)}"${r.recq ? ' stroke-dasharray="10 4"' : ''} opacity="${sel ? 1 : .8}" data-tr="${r.id}" style="cursor:pointer"/><text x="${xm}" y="${(r.sif ? yF : Math.max(yM, yJ)) + 16}" text-anchor="middle" fill="${cz}" font-weight="700" style="pointer-events:none">${r.nome} — ${r.recq ? 'recalque' : 'sifão invertido'}</text>`;
      s += `<text x="${xm}" y="${TB + th * 4 + 12}" text-anchor="middle">${f2(r.L)} m · ${r.sif ? r.sif.n + ' × ' : ''}DN ${r.D}</text><text x="${xm}" y="${TB + th * 5 + 12}" text-anchor="middle">${r.recq ? 'sob pressão · V ' + f2(r.hF.V) + ' m/s' : 'ΔH ' + r.sif.dH.toFixed(3).replace('.', ',') + ' m · V ' + f2(r.sif.Vf) + ' m/s'}</text>`; return; }
    s += `<path d="M${x1} ${Y(r.ciM)}L${x2} ${Y(r.ciJ)}L${x2} ${Y(r.ciJ + r.d)}L${x1} ${Y(r.ciM + r.d)}Z" fill="${r.D > 400 ? '#d7d7d7' : '#f1d9a8'}" stroke="${cor}" stroke-width="${sel ? 2.4 : 1.1}" data-tr="${r.id}" style="cursor:pointer"/>`;
    s += `<path d="M${x1} ${Y(r.ciM)}L${x2} ${Y(r.ciJ)}L${x2} ${Y(r.ciJ + r.hF.y)}L${x1} ${Y(r.ciM + r.hF.y)}Z" fill="#0f766e" opacity=".55" style="pointer-events:none"/>`;
    s += `<line x1="${x1}" y1="${Y(r.ciM + r.hI.y)}" x2="${x2}" y2="${Y(r.ciJ + r.hI.y)}" stroke="#0f766e" stroke-dasharray="4 3" style="pointer-events:none"/>`;
    const xm = (x1 + x2) / 2; s += `<text x="${xm}" y="${Y((r.ciM + r.ciJ) / 2) + 14 + r.d * sy * 0}" text-anchor="middle" fill="${cor}" font-weight="700" style="pointer-events:none">${r.nome}</text>`;
    s += `<text x="${xm}" y="${TB + th * 4 + 12}" text-anchor="middle">${f2(r.L)} m · DN ${r.D}</text><text x="${xm}" y="${TB + th * 5 + 12}" text-anchor="middle">i = ${(r.I * 100).toFixed(3).replace('.', ',')} % · y/D ${r.hF.carga ? 'cheio' : f2(r.hF.yd)}</text>`; });
  /* PVs */
  const nos = [tr[0].de].concat(tr.map(r => r.para));
  nos.forEach((id, i) => { const x = R.no[id], n = noDe(id), cx = X(xs[i]), g = pvGeo(x), w = Math.max(7, g.D * sx);
    s += `<rect x="${cx - w / 2}" y="${Y(x.ct)}" width="${w}" height="${Math.max(2, (x.ct - x.cf) * sy)}" fill="${x.tipo === 'TL' ? '#fff' : '#e9e6dc'}" fill-opacity=".85" stroke="#14202e" stroke-width="1.1"/><line x1="${cx - w / 2 - 3}" y1="${Y(x.ct)}" x2="${cx + w / 2 + 3}" y2="${Y(x.ct)}" stroke="#14202e" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${Y(x.ct) - 7}" text-anchor="middle" font-weight="700">${esc(nomeNo(n))}${x.tq ? ' (TQ)' : ''}${x.tipo === 'EEE' ? ' (EEE)' : ''}</text><line x1="${cx}" y1="${Y(x.cf)}" x2="${cx}" y2="${TB}" stroke="#b9b3a5" stroke-dasharray="2 3"/>`;
    const cin = i > 0 ? tr[i - 1].ciJ : null, cout = i < tr.length ? tr[i].ciM : null, anc = i === 0 ? 'start' : i === nos.length - 1 ? 'end' : 'middle', tx = i === 0 ? cx + 2 : i === nos.length - 1 ? cx - 2 : cx;
    s += `<text x="${tx}" y="${TB + 12}" text-anchor="${anc}" font-weight="700">${esc(nomeNo(n))}</text><text x="${tx}" y="${TB + th + 12}" text-anchor="${anc}">${x.ct.toFixed(3).replace('.', ',')}</text>`;
    s += `<text x="${tx}" y="${TB + th * 2 + 12}" text-anchor="${anc}">${cin != null && cout != null && Math.abs(cin - cout) > 0.0005 ? cin.toFixed(3).replace('.', ',') + ' / ' + cout.toFixed(3).replace('.', ',') : (cout != null ? cout : cin).toFixed(3).replace('.', ',')}</text><text x="${tx}" y="${TB + th * 3 + 12}" text-anchor="${anc}">${f2(x.prof)}</text>`; });
  ['PV', 'Cota do terreno', 'Cota do coletor', 'Profundidade (m)', 'Extensão · DN', 'Declividade · lâmina'].forEach((t, i) => s += `<line x1="4" y1="${TB + th * i}" x2="${W - 4}" y2="${TB + th * i}" stroke="#b9b3a5"/><text x="6" y="${TB + th * i + 12}" fill="#12263f" font-weight="700">${t}</text>`);
  s += `<line x1="4" y1="${TB + th * 6}" x2="${W - 4}" y2="${TB + th * 6}" stroke="#b9b3a5"/><text x="${ml}" y="16" font-size="12" font-weight="700" fill="#12263f">PERFIL — Coletor ${tr[0].col}${ids.length > 1 ? ' (' + tr[0].nome + ' a ' + tr[tr.length - 1].nome + ')' : ''}</text>
    <text x="${W - mr}" y="16" text-anchor="end" fill="#5a6573">H 1:${Math.round(1 / sx * 3780 / 100) * 100 || 1} · exagero vertical ${(sy / sx).toFixed(1).replace('.', ',')}× · ▬ terreno · ■ lâmina final · ┄ lâmina inicial</text></svg>`;
  return s;
}
/* arco de lâmina dentro do tubo de raio r, centro (cx,cy) em pixels, y/D */
function segLam(cx, cy, r, yd, cor, op) { if (yd <= 0.001) return ''; if (yd >= 0.999) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${cor}" opacity="${op}"/>`; const h = yd * 2 * r, a = Math.sqrt(Math.max(0, r * r - (r - h) ** 2)), yl = cy + r - h; return `<path d="M${cx - a} ${yl}A${r} ${r} 0 ${yd > 0.5 ? 1 : 0} 0 ${cx + a} ${yl}Z" fill="${cor}" opacity="${op}"/>`; }
function secaoValaSVG(r) {
  const c = R.c, W = 420, H = 380, larg = r.larg, hT = r.hEsc, k = Math.min(215 / (hT + 0.2), 150 / larg), cx = W / 2, y0 = 44, yb = y0 + hT * k, xe = cx - larg * k / 2, xd = cx + larg * k / 2, prof = (r.profM + r.profJ) / 2;
  const rr = r.d * k / 2, cyT = yb - c.berco * k - rr, yEnv = cyT - rr - c.envolt * k, f2 = v => v.toFixed(2).replace('.', ',');
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial,sans-serif" font-size="10.5"><rect width="${W}" height="${H}" fill="#fff"/>
    <defs><pattern id="hsolo" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#b9a58a" stroke-width="1"/></pattern><pattern id="hareia" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#b08b3a"/></pattern></defs>
    <rect x="20" y="${y0}" width="${W - 40}" height="${H - y0 - 40}" fill="url(#hsolo)" opacity=".5"/>
    <rect x="${xe}" y="${y0}" width="${xd - xe}" height="${yb - y0}" fill="#f6efe1" stroke="#14202e" stroke-width="1.3"/>
    <rect x="${xe}" y="${Math.max(y0, yEnv)}" width="${xd - xe}" height="${yb - Math.max(y0, yEnv)}" fill="url(#hareia)" stroke="#b08b3a" stroke-width=".6"/>
    ${c.pav !== 'terra' ? `<rect x="20" y="${y0 - 5}" width="${W - 40}" height="6" fill="#444"/>` : `<line x1="20" y1="${y0}" x2="${W - 20}" y2="${y0}" stroke="#8a6a4a" stroke-width="2.5"/>`}
    <circle cx="${cx}" cy="${cyT}" r="${rr * 1.07 + 1}" fill="${r.D > 400 ? '#c9c9c9' : '#c98a2b'}"/><circle cx="${cx}" cy="${cyT}" r="${rr}" fill="#fff"/>${segLam(cx, cyT, rr, r.hF.yd, '#0f766e', .6)}${segLam(cx, cyT, rr, r.hI.yd, '#0f766e', .9)}
    <text x="${W / 2}" y="18" text-anchor="middle" font-size="12.5" font-weight="700" fill="#12263f">SEÇÃO DA VALA — Trecho ${r.nome} · DN ${r.D} ${r.mat}</text>`;
  const cota = (x, ya, yb2, t, esq) => `<line x1="${x}" y1="${ya}" x2="${x}" y2="${yb2}" stroke="#c2410c"/><path d="M${x - 3} ${ya}h6M${x - 3} ${yb2}h6" stroke="#c2410c"/><text x="${x + (esq ? -5 : 5)}" y="${(ya + yb2) / 2 + 3}" fill="#c2410c" text-anchor="${esq ? 'end' : 'start'}">${t}</text>`;
  s += cota(xd + 14, y0, cyT + rr, 'prof. ' + f2(prof) + ' m') + cota(xe - 14, y0, cyT - rr, 'recobr. ' + f2(prof - r.d) + ' m', true);
  s += `<line x1="${xe}" y1="${yb + 14}" x2="${xd}" y2="${yb + 14}" stroke="#c2410c"/><path d="M${xe} ${yb + 11}v6M${xd} ${yb + 11}v6" stroke="#c2410c"/><text x="${cx}" y="${yb + 27}" text-anchor="middle" fill="#c2410c">largura ${f2(larg)} m</text>
    <text x="24" y="${H - 36}" fill="#8a6a2a">▒ areia: berço ${f2(c.berco)} m + envoltória ${f2(c.envolt)} m acima do tubo · acima, reaterro compactado</text>
    <text x="24" y="${H - 22}" fill="#0f766e" font-weight="700">y/D inicial ${f2(r.hI.yd)} · final ${r.hF.carga ? 'cheio' : f2(r.hF.yd)} (limite ${f2(r.lim)})</text>
    <text x="24" y="${H - 8}" fill="#5a6573">${hT > 1.25 ? 'Vala com mais de 1,25 m: escoramento obrigatório (NR-18).' : 'Vala rasa: sem escoramento.'}</text></svg>`;
  return s;
}
function secaoPVSVG(id) {
  const x = R.no[id], n = noDe(id), g = pvGeo(x), W = 420, H = 380, tot = x.prof + 0.45, k = Math.min(270 / tot, 190 / (g.D + 2 * g.par + 1.6)), cx = W / 2, y0 = 44, Y = z => y0 + (x.ct - z) * k, f2 = v => v.toFixed(2).replace('.', ','), f3 = v => v.toFixed(3).replace('.', ',');
  const ri = g.D * k / 2, re = ri + g.par * k, yf = Y(x.cf), yt = Y(x.cf + g.hb), I = R.ins[id].map(t => R.tr[t.id]), O = R.outs[id].map(t => R.tr[t.id]);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial,sans-serif" font-size="10.5"><rect width="${W}" height="${H}" fill="#fff"/>
    <defs><pattern id="hsolo2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#b9a58a" stroke-width="1"/></pattern></defs>
    <rect x="16" y="${y0}" width="${W - 32}" height="${H - y0 - 34}" fill="url(#hsolo2)" opacity=".45"/>
    <rect x="${cx - re}" y="${yt - g.laje * k}" width="${2 * re}" height="${yf - yt + 2 * g.laje * k}" fill="#bdbdbd" stroke="#14202e"/><rect x="${cx - ri}" y="${yt}" width="${2 * ri}" height="${yf - yt}" fill="#fff" stroke="#14202e" stroke-width=".7"/>`;
  if (!g.tl) { const rc = 0.30 * k; s += `<rect x="${cx - rc - 0.1 * k}" y="${y0}" width="${2 * rc + 0.2 * k}" height="${Math.max(0, yt - g.laje * k - y0)}" fill="#bdbdbd" stroke="#14202e"/><rect x="${cx - rc}" y="${y0}" width="${2 * rc}" height="${Math.max(0, yt - y0)}" fill="#fff"/>`; }
  s += `<rect x="${cx - 0.36 * k}" y="${y0 - 4}" width="${0.72 * k}" height="6" fill="#222"/><line x1="16" y1="${y0}" x2="${W - 16}" y2="${y0}" stroke="#8a6a4a" stroke-width="2"/>`;
  I.slice(0, 1).concat(I.slice(1).filter(r => r.ciJ - x.cf >= 0.01)).slice(0, 2).forEach((r, i) => { const yi = Y(r.ciJ), d = r.d * k, deg = r.ciJ - x.cf, xa = 18, xb = cx - re;
    s += `<rect x="${xa}" y="${yi - d}" width="${xb - xa}" height="${d}" fill="${r.D > 400 ? '#e3e3e3' : '#f1d9a8'}" stroke="#14202e" stroke-width=".8"/><rect x="${xa}" y="${yi - r.hF.y * k}" width="${xb - xa}" height="${r.hF.y * k}" fill="#0f766e" opacity=".55"/>`;
    if (deg >= R.c.degTQ - 1e-9) s += `<rect x="${xb - d - 10}" y="${yi}" width="${d}" height="${Math.max(0, yf - yi - d)}" fill="#f1d9a8" stroke="#14202e" stroke-width=".8"/><path d="M${xb - d - 10} ${yf - d}h${d + 10}v${d}h${-d - 10}Z" fill="#f1d9a8" stroke="#14202e" stroke-width=".8"/><text x="${xb - d - 14}" y="${(yi + yf) / 2}" text-anchor="end" fill="#c2410c" font-weight="700">tubo de queda ${f2(deg)} m</text>`;
    s += `<text x="${xa + 2}" y="${yi - d - 4}" fill="#12263f">chega ${r.nome} · DN ${r.D} · CC ${f3(r.ciJ)}</text>`; });
  O.slice(0, 1).forEach(r => { const yo = Y(r.ciM), d = r.d * k, xa = cx + re, xb = W - 18; s += `<rect x="${xa}" y="${yo - d}" width="${xb - xa}" height="${d}" fill="${r.D > 400 ? '#e3e3e3' : '#f1d9a8'}" stroke="#14202e" stroke-width=".8"/><rect x="${xa}" y="${yo - r.hF.y * k}" width="${xb - xa}" height="${r.hF.y * k}" fill="#0f766e" opacity=".55"/><rect x="${cx - ri}" y="${yo - r.hF.y * k}" width="${2 * ri}" height="${r.hF.y * k}" fill="#0f766e" opacity=".4"/><text x="${xb - 2}" y="${yo - d - 4}" text-anchor="end" fill="#12263f">sai ${r.nome} · DN ${r.D} · CC ${f3(r.ciM)}</text>`; });
  s += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="12.5" font-weight="700" fill="#12263f">${g.tl ? 'TERMINAL DE LIMPEZA' : 'POÇO DE VISITA'} ${esc(nomeNo(n))} — Ø ${f2(g.D)} m</text>
    <text x="${cx + re + 6}" y="${y0 + 14}" fill="#c2410c">CT ${f3(x.ct)}</text><text x="${cx + re + 6}" y="${yf + 14}" fill="#c2410c">CF ${f3(x.cf)}</text>
    <text x="20" y="${H - 20}" fill="#5a6573">Profundidade ${f2(x.prof)} m${g.hc ? ' · chaminé ' + f2(g.hc) + ' m (máx. 1,00 m)' : ''} · tampão de ferro fundido Ø 0,60 m</text>
    <text x="20" y="${H - 7}" fill="#5a6573">Fundo com canaleta (meia-cana) e banqueta com caimento para a calha.</text></svg>`;
  return s;
}
function vPerfil(m) {
  if (!R.ok) { m.innerHTML = `<div class="card">${listaVerif()}</div>`; return; }
  if (!R.coletores.some(c => c.num === PF.col)) PF.col = 1;
  const ids = caminho(PF.col, PF.ate); let sel = SEL && SEL.tipo === 'tr' && R.tr[SEL.id] ? SEL.id : null;
  if (sel && !ids.includes(sel)) { PF.col = R.tr[sel].col; return vPerfil(m); } if (!sel) sel = ids[0];
  const r = R.tr[sel];
  m.innerHTML = `<div class="card"><div class="barra"><div class="f" style="min-width:230px"><select id="pf-col">${R.coletores.map(c => `<option value="${c.num}"${c.num === PF.col ? ' selected' : ''}>Coletor ${c.num} — ${fm(c.L, 0)} m (${c.trechos.length} trechos)</option>`).join('')}</select></div>
      <label style="font-size:.84rem;display:flex;gap:5px;align-items:center"><input type="checkbox" id="pf-ate"${PF.ate ? ' checked' : ''}/> seguir até o lançamento</label>
      <div class="f"><select id="pf-ev">${[5, 10, 20, 50].map(e => `<option value="${e}"${e === PF.ev ? ' selected' : ''}>exagero vertical ${e}×</option>`).join('')}</select></div><span class="esp"></span>
      <button class="bt peq" data-act="svgPerfil">⬇ SVG deste perfil</button><button class="bt peq" data-act="svgPerfis">⬇ Todos os perfis</button></div>
    <div style="overflow:auto" id="pf-box">${perfilSVG(ids, PF.ev, Math.max(900, ids.length * 120))}</div>
    <p class="mut" style="font-size:.78rem;margin:6px 0 0">Clique num trecho do perfil para ver a seção da vala e o PV de montante.</p></div>
    <div class="cols"><div class="card" style="text-align:center"><div style="overflow:auto">${secaoValaSVG(r)}</div></div>
      <div class="card" style="text-align:center"><div class="barra" style="justify-content:center"><button class="bt peq${PF.pvj ? '' : ' on'}" data-pvlado="m">PV de montante</button><button class="bt peq${PF.pvj ? ' on' : ''}" data-pvlado="j">PV de jusante</button></div><div style="overflow:auto">${secaoPVSVG(PF.pvj ? r.para : r.de)}</div></div></div>`;
}
