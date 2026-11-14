/* ════════════════════════════════════════════════════════════════════
   MOTOR DE CÁLCULO — ESGOTO SANITÁRIO (puro: não mexe na tela)
   Base: ABNT NBR 9649:1986 (redes coletoras) e NBR 14486:2000 (tubos de PVC).
   Unidades internas: m, m³/s, m/m, Pa. Vazões de entrada/saída em L/s.
   ════════════════════════════════════════════════════════════════════ */
const ESG = (() => {
  'use strict';
  const G = 9.80665, GAMA = 9806.65, YMAX = 0.938;          /* y/D da vazão máxima da seção circular */
  const SERIE = [100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900, 1000];   /* DN (mm): até 400 PVC, acima concreto */
  const fl3 = x => Math.floor(x * 1000 + 1e-6) / 1000;
  const r3 = x => Math.round(x * 1000) / 1000;

  const CRIT0 = {
    modo: 'pop',            /* 'pop' = população distribuída pelo comprimento; 'taxa' = taxa linear informada */
    popI: 1800, popF: 2500, /* população de início e de fim de plano (hab) */
    qI: 150, qF: 150,       /* consumo de água per capita (L/hab·dia) */
    C: 0.80, K1: 1.20, K2: 1.50, K3: 0.50,
    txI: 1.5, txF: 2.5,     /* taxa linear de esgoto doméstico (L/s·km), só no modo 'taxa' */
    tInf: 0.10,             /* infiltração (L/s·km) — NBR 9649: 0,05 a 1,0 */
    qMin: 1.5,              /* vazão mínima de cálculo em qualquer trecho (L/s) */
    norma: '9649', n: 0.013, tau: 1.0,   /* '9649': n 0,013 e 1,0 Pa · '14486' (PVC): n 0,010 e 0,6 Pa */
    dMin: 150,              /* diâmetro mínimo (mm); a NBR 9649 admite DN 100 */
    yD: 0.75, yDvc: 0.50, vMax: 5.0,
    rec: 0.90, recPas: 0.65,/* recobrimento mínimo (m): leito da via · passeio (escolhido por trecho) */
    mat: 'pvcm',            /* tubo da rede até DN 400: pvcm (PVC parede maciça) · pvcc (PVC corrugado) · conc (concreto) */
    usaDI: true, diMan: {}, /* usar o diâmetro INTERNO real; diMan[mat][DN] = DI digitado (mm) */
    profMax: 4.5, degTQ: 0.50, distPV: 80, distMax: 100, profTL: 1.45,
    remanso: true,          /* nível d'água de saída do PV nunca acima do de chegada */
    folga: 0.60, berco: 0.10, envolt: 0.30, pav: 'asfalto', espPav: 0.05,
    largRua: 8, habLig: 3.0, ramal: 6, dmt: 5, empol: 1.30, folgaCava: 0.30, lastro: 0.10,
    /* elevatória e recalque (NBR 12208) */
    eCiclo: 10, eDet: 30, eEta: 0.60, eFolgaMotor: 20, eVmin: 0.60, eVmax: 3.00, eKloc: 10, eSub: 0.50, eRecRec: 1.00, eMat: 'pvc',
    /* sifão invertido */
    sVmin: 0.60, sDmin: 150, sLinhas: 2, sMat: 'fofo', sProt: 0.60,
    fator: 1                /* multiplicador da vazão de esgoto (cenários) */
  };
  const crit = P => Object.assign({}, CRIT0, (P && P.crit) || {});

  /* ── tubos: diâmetro externo (DE) e interno (DI) reais, mm ──
     PVC parede maciça NBR 7362: DE e espessura de catálogo de fabricante (DN 100 a 300); DN 350 e 400 aproximados.
     PVC corrugado: DI mínimo DN 100 = 100 mm (especificação de concessionária); demais aproximados — confira no catálogo. */
  const TUBOS = {
    pvcm: {nome: 'PVC parede maciça (NBR 7362)', DE: {100: 110, 125: 125, 150: 160, 200: 200, 250: 250, 300: 315, 350: 355, 400: 400}, e: {100: 2.5, 125: 2.8, 150: 3.6, 200: 4.5, 250: 6.1, 300: 7.2, 350: 8.7, 400: 9.8}, aprox: [350, 400]},
    pvcc: {nome: 'PVC corrugado dupla parede (NBR ISO 21138)', DE: {100: 110, 150: 160, 200: 200, 250: 250, 300: 315, 350: 355, 400: 400}, DI: {100: 100, 150: 145, 200: 182, 250: 228, 300: 285, 350: 327, 400: 375}, aprox: [150, 200, 250, 300, 350, 400]},
    conc: {nome: 'Concreto armado ponta e bolsa (NBR 8890)'}
  };
  function tuboGeo(D, c, matT) {
    const mat = D > 400 ? 'conc' : (matT || c.mat || 'pvcm'), T = TUBOS[mat] || TUBOS.pvcm, man = (c.diMan && c.diMan[mat]) || {};
    let de, di;
    if (mat === 'conc') { di = D; de = D + 2 * Math.round(D / 12 + 25); }
    else { de = T.DE[D] || D * 1.07; di = T.DI ? (T.DI[D] || D) : de - 2 * (T.e[D] || de * 0.03); }
    if (man[D] > 0) di = +man[D];
    if (!c.usaDI) di = D;
    const pvc = mat !== 'conc';
    return {mat, nome: T.nome, de, di, n: pvc ? c.n : 0.013, tau: pvc ? c.tau : 1.0, aprox: (T.aprox || []).includes(D) && !(man[D] > 0)};
  }
  const matDe = (D, c, m) => { const g = tuboGeo(D, c, m); return {n: g.n, tau: g.tau, mat: g.mat === 'conc' ? 'Concreto' : 'PVC'}; };

  /* ── pressão: Hazen-Williams ── */
  const HW = {pvc: 145, pead: 140, fofo: 120};
  const RECALQUE = {   /* DN comercial → DI (mm) e classe de pressão (mca) */
    pvc: {nome: 'PVC DEFOFO (NBR 7665), 1,0 MPa', l: [[100, 108.4], [150, 156.4], [200, 204.2], [250, 252.0], [300, 299.8]], pn: 100, a: 420},
    pead: {nome: 'PEAD PE 100 SDR 17 (PN 10)', l: [[110, 97.0], [160, 141.2], [200, 176.6], [250, 220.4], [315, 277.6], [400, 352.6]], pn: 100, a: 300},
    fofo: {nome: 'Ferro fundido dúctil K9 (NBR 7675)', l: [[80, 81.6], [100, 101.6], [150, 152.6], [200, 203.4], [250, 253.0], [300, 302.8], [350, 352.8], [400, 402.8]], pn: 250, a: 1100}
  };
  const jHW = (Q, d, C) => 10.643 * Math.pow(Q, 1.852) / (Math.pow(C, 1.852) * Math.pow(d, 4.87));
  const CV = [1, 1.5, 2, 3, 4, 5, 6, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200];

  /* ── seção circular parcialmente cheia ── */
  function geo(d, yd) {
    const th = 2 * Math.acos(1 - 2 * yd), A = d * d / 8 * (th - Math.sin(th)), Pm = d * th / 2;
    return {th, A, P: Pm, Rh: Pm > 0 ? A / Pm : 0, B: d * Math.sin(th / 2)};
  }
  function qMan(d, I, n, yd) { const g = geo(d, yd); return g.A * Math.pow(g.Rh, 2 / 3) * Math.sqrt(I) / n; }
  function lamina(Q, d, I, n) {
    if (!(I > 0) || Q > qMan(d, I, n, YMAX)) return null;
    let a = 1e-7, b = YMAX;
    for (let k = 0; k < 44; k++) { const m = (a + b) / 2; if (qMan(d, I, n, m) < Q) a = m; else b = m; }
    return (a + b) / 2;
  }
  /* escoamento de Q (m³/s) no tubo d (m) com declividade I */
  function hid(Q, d, I, n) {
    const yd = lamina(Q, d, I, n);
    if (yd == null) { const A = Math.PI * d * d / 4; return {carga: true, yd: 1, y: d, V: Q / A, Rh: d / 4, tau: GAMA * d / 4 * Math.max(I, 0), Vc: 6 * Math.sqrt(G * d / 4), Fr: 0, A}; }
    const g = geo(d, yd), V = Q / g.A;
    return {carga: false, yd, y: yd * d, V, Rh: g.Rh, tau: GAMA * g.Rh * I, Vc: 6 * Math.sqrt(G * g.Rh), Fr: V / Math.sqrt(G * g.A / g.B), A: g.A};
  }
  /* menor declividade que dá a tensão trativa mínima com a vazão inicial */
  function iMinTau(Q, d, n, tau) {
    const f = I => { const h = hid(Q, d, I, n); return h.carga ? -1 : h.tau - tau; };
    let a = 1e-5, b = 1; if (f(b) < 0) return b; if (f(a) >= 0) return a;
    for (let k = 0; k < 44; k++) { const m = Math.sqrt(a * b); if (f(m) < 0) a = m; else b = m; }
    return b;
  }
  /* maior declividade que mantém a velocidade final ≤ vMax */
  function iMaxV(Q, d, n, vMax) {
    const f = I => { const h = hid(Q, d, I, n); return h.V - vMax; };
    let a = 1e-5, b = 2; if (f(b) <= 0) return b; if (f(a) > 0) return a;
    for (let k = 0; k < 44; k++) { const m = Math.sqrt(a * b); if (f(m) <= 0) a = m; else b = m; }
    return a;
  }

  const nomeNo = n => n.nome || n.id;
  const compr = (t, a, b) => t.L > 0 ? +t.L : Math.hypot(b.x - a.x, b.y - a.y);
  const fLados = t => t.lados == null ? 1 : t.lados / 2;

  const recDe = (t, c) => t && t.loc === 'passeio' ? c.recPas : c.rec;
  /* dimensiona um trecho: menor DN que atende lâmina, com a menor escavação possível */
  function dimTrecho(t, x, c) {
    const lista = t.Dfix > 0 ? [+t.Dfix] : SERIE.filter(D => D >= x.Dmin), rec = recDe(t, c);
    let r = null;
    for (const D of lista) {
      const g = tuboGeo(D, c, t.mat), d = g.di / 1000, de = g.de / 1000, cima = (d + de) / 2;   /* do fundo interno ao topo externo */
      const topM = x.ctM - rec - cima, topJ = x.ctJ - rec - cima;
      const Imin = iMinTau(x.QI, d, g.n, g.tau), Imax = iMaxV(x.QF, d, g.n, c.vMax);
      let ciM = fl3(Math.min(topM, x.limM)), ciJ;
      if (t.iFix > 0) {
        ciJ = fl3(ciM - t.iFix * x.L);
        if (ciJ > topJ + 1e-9) { ciJ = fl3(topJ); ciM = fl3(ciJ + t.iFix * x.L); }
      } else {
        ciJ = fl3(Math.min(topJ, ciM - Imin * x.L));
        if ((ciM - ciJ) / x.L > Imax && Imax > Imin) ciM = fl3(ciJ + Imax * x.L);   /* terreno muito inclinado: aprofunda a montante (degrau / tubo de queda) */
      }
      const I = (ciM - ciJ) / x.L, hF = hid(x.QF, d, I, g.n), hI = hid(x.QI, d, I, g.n);
      const lim = (!hF.carga && hF.V > hF.Vc) ? c.yDvc : c.yD;
      r = {D, d, deExt: de, di: g.di, aproxDI: g.aprox, rec, I, ciM, ciJ, Imin, Imax, hF, hI, lim, n: g.n, tauMin: g.tau, mat: g.mat === 'conc' ? 'Concreto' : 'PVC', matK: g.mat, okLam: !hF.carga && hF.yd <= lim + 1e-9};
      if (r.okLam) break;
    }
    return r;
  }
  /* sifão invertido: n linhas iguais; a 1ª linha leva sozinha a vazão inicial (V ≥ Vmin para autolimpeza) e todas juntas a final */
  function dimSifao(t, x, c) {
    const s = t.sif || {}, n = Math.max(1, Math.round(s.n || c.sLinhas)), mat = s.mat || c.sMat, T = RECALQUE[mat] || RECALQUE.fofo, C = HW[mat] || 120;
    const lista = T.l.filter(([dn]) => dn >= (c.sDmin || 150) * 0.73), rec = recDe(t, c);
    let best = null;
    for (const [dn, dimm] of lista) {
      const d = dimm / 1000, A = Math.PI * d * d / 4, Vi = x.QI / A, Vf = x.QF / n / A;
      const hf = jHW(x.QF / n, d, C) * x.L, hl = 1.5 * Vf * Vf / (2 * G), dH = hf + hl + 0.05;
      best = {dn, d, de: d * 1.08, Vi, Vf, hf, hl, dH, n, mat, C, matNome: T.nome};
      if (Vi >= c.sVmin && dH <= 0.6) break;   /* menor diâmetro com autolimpeza e perda razoável */
      if (Vi < c.sVmin) break;                  /* diâmetros maiores só pioram a velocidade */
    }
    const cimaM = x.ctM - rec - best.de;
    const ciM = fl3(Math.min(cimaM, x.limM)), ciJ = fl3(ciM - best.dH);
    const obst = s.cota != null && s.cota !== '' ? +s.cota : Math.min(x.ctM, x.ctJ) - 1.5;
    const fundo = fl3(Math.min(ciM, ciJ) - Math.max(0, (Math.min(ciM, ciJ) - (obst - (s.prot != null ? +s.prot : c.sProt) - best.de))));
    const hF = {carga: false, yd: 1, y: best.d, V: best.Vf, Rh: best.d / 4, tau: 99, Vc: 99, Fr: 0}, hI = Object.assign({}, hF, {V: best.Vi});
    return Object.assign({D: best.dn, d: best.d, deExt: best.de, di: best.d * 1000, rec, I: (ciM - ciJ) / x.L, ciM, ciJ, Imin: 0, Imax: 9, hF, hI, lim: 1, n: 0.012, tauMin: 0, mat: T.nome, okLam: true},
      {sif: Object.assign(best, {obst, fundo: Math.min(fundo, obst - (s.prot != null ? +s.prot : c.sProt) - best.de), prot: s.prot != null ? +s.prot : c.sProt})});
  }

  /* ── cálculo completo da rede ── opt.fator: cenário de vazão · opt.fixo: {idTrecho:{D,ciM,ciJ}} (verifica sem redimensionar) */
  function calc(P, opt) {
    opt = opt || {};
    const c = crit(P), fator = opt.fator != null ? opt.fator : (c.fator || 1);
    const R = {c, fator, erros: [], checks: [], tr: {}, no: {}, ordem: [], coletores: [], vaz: {}, eee: {}, ok: false};
    const nos = new Map((P.nos || []).map(n => [n.id, n]));
    const T = (P.trechos || []).filter(t => nos.has(t.de) && nos.has(t.para) && t.de !== t.para);
    const ins = {}, outs = {};
    nos.forEach((n, id) => { ins[id] = []; outs[id] = []; });
    T.forEach(t => { outs[t.de].push(t); ins[t.para].push(t); });
    R.ins = ins; R.outs = outs;
    if (!T.length) { R.erros.push('A rede ainda não tem trechos. Use “Gerar rede” no Traçado.'); return R; }
    nos.forEach((n, id) => { if (outs[id].length > 1) R.erros.push(nomeNo(n) + ' tem ' + outs[id].length + ' saídas: cada PV só pode ter um trecho de saída.'); });

    /* ordem de montante para jusante */
    const grau = {}, fila = [], ordemNos = [];
    nos.forEach((n, id) => { grau[id] = ins[id].length; if (!grau[id]) fila.push(id); });
    while (fila.length) { const id = fila.shift(); ordemNos.push(id); outs[id].forEach(t => { if (--grau[t.para] === 0) fila.push(t.para); }); }
    if (ordemNos.length < nos.size) { R.erros.push('Há trechos em círculo (a água voltaria ao mesmo PV). Inverta o sentido de um deles.'); return R; }

    /* elevatórias: os trechos do PV da elevatória até o PV de chegada viram linha de recalque */
    const recDeT = {}, eeeNo = {};
    (P.eee || []).forEach(e => {
      if (!nos.has(e.no)) return; eeeNo[e.no] = e; let n = e.no, k = 0;
      if (e.ate && e.ate !== e.no) while (n !== e.ate && outs[n] && outs[n][0] && k++ < 60) { const t = outs[n][0]; recDeT[t.id] = e.id; n = t.para; }
    });
    const ehRec = t => !!recDeT[t.id], gIns = id => ins[id].filter(t => !ehRec(t));

    /* vazões */
    let Lc = 0, Lt = 0;
    const LT = {}; T.forEach(t => { const L = compr(t, nos.get(t.de), nos.get(t.para)); LT[t.id] = L; Lt += L; if (!ehRec(t)) Lc += L * fLados(t); });
    const QdI = c.modo === 'taxa' ? c.txI / 1000 * Lc * fator : c.K2 * c.C * c.popI * c.qI / 86400 * fator;
    const QdF = c.modo === 'taxa' ? c.txF / 1000 * Lc * fator : c.K1 * c.K2 * c.C * c.popF * c.qF / 86400 * fator;
    const txI = Lc > 0 ? QdI / Lc : 0, txF = Lc > 0 ? QdF / Lc : 0, ti = c.tInf / 1000;
    R.vaz = {QdI, QdF, txI: txI * 1000, txF: txF * 1000, Lc, Lt, inf: ti * Lt, QmedI: c.C * c.popI * c.qI / 86400 * fator, QmedF: c.C * c.popF * c.qF / 86400 * fator};

    const QnI = {}, QnF = {};
    nos.forEach((n, id) => { QnI[id] = (+n.qcI || 0) * fator; QnF[id] = (+n.qcF || 0) * fator; });
    for (const id of ordemNos) {
      const n = nos.get(id);
      outs[id].forEach((t, k) => {
        const j = nos.get(t.para), L = LT[t.id], rec = ehRec(t);
        const cI = rec ? 0 : txI * L * fLados(t) + ti * L, cF = rec ? 0 : txF * L * fLados(t) + ti * L;
        const QmI = k === 0 ? QnI[id] : 0, QmF = k === 0 ? QnF[id] : 0, QjI = QmI + cI, QjF = QmF + cF;
        QnI[t.para] += QjI; QnF[t.para] += QjF;
        const gi = gIns(id);
        const x = {L, ctM: +n.ct || 0, ctJ: +j.ct || 0, QI: Math.max(c.qMin, QjI) / 1000, QF: Math.max(c.qMin, QjF) / 1000,
          limM: gi.length && !eeeNo[id] ? Math.min(...gi.map(a => R.tr[a.id].ciJ)) : Infinity,
          Dmin: Math.max(c.dMin, ...gi.filter(a => !R.tr[a.id].sif).map(a => R.tr[a.id].D))};
        let r; const fx = opt.fixo && opt.fixo[t.id];
        if (rec) {
          r = {recq: recDeT[t.id], rec: c.eRecRec, D: 0, d: 0.1, deExt: 0.11, I: 0, ciM: x.ctM - c.eRecRec - 0.11, ciJ: x.ctJ - c.eRecRec - 0.11, Imin: 0, Imax: 9,
            hF: {carga: false, yd: 1, y: 0, V: 0, tau: 99, Vc: 99}, hI: {carga: false, yd: 1, y: 0, V: 0, tau: 99, Vc: 99}, lim: 1, okLam: true, mat: 'Recalque', tauMin: 0};
        } else if (t.sif) {
          r = dimSifao(t, x, c);
        } else if (fx) {
          const g = tuboGeo(fx.D, c, t.mat), d = g.di / 1000, I = (fx.ciM - fx.ciJ) / L, hF = hid(x.QF, d, I, g.n), hI = hid(x.QI, d, I, g.n);
          r = {D: fx.D, d, deExt: g.de / 1000, di: g.di, rec: recDe(t, c), I, ciM: fx.ciM, ciJ: fx.ciJ, Imin: iMinTau(x.QI, d, g.n, g.tau), Imax: iMaxV(x.QF, d, g.n, c.vMax), hF, hI,
            lim: (!hF.carga && hF.V > hF.Vc) ? c.yDvc : c.yD, n: g.n, tauMin: g.tau, mat: g.mat === 'conc' ? 'Concreto' : 'PVC', matK: g.mat};
          r.okLam = !hF.carga && hF.yd <= r.lim + 1e-9;
        } else {
          r = dimTrecho(t, x, c);
          if (c.remanso && gi.length && !eeeNo[id]) for (let it = 0; it < 20; it++) {    /* controle de remanso: NA de saída ≤ menor NA de chegada */
            const naIn = Math.min(...gi.map(a => R.tr[a.id].ciJ + R.tr[a.id].hF.y)), naOut = r.ciM + r.hF.y;
            if (naOut <= naIn + 0.0005) break;
            x.limM = r.ciM - (naOut - naIn); r = dimTrecho(t, x, c);
          }
        }
        const cima = ((r.d || 0) + (r.deExt || r.d || 0)) / 2;
        Object.assign(r, {id: t.id, de: t.de, para: t.para, L, ctM: x.ctM, ctJ: x.ctJ, QmI, QmF, cI, cF, QjI, QjF, QI: x.QI * 1000, QF: x.QF * 1000,
          profM: x.ctM - r.ciM, profJ: x.ctJ - r.ciJ, recM: x.ctM - r.ciM - cima, recJ: x.ctJ - r.ciJ - cima, iTer: (x.ctM - x.ctJ) / L,
          fixD: t.Dfix > 0, fixI: t.iFix > 0});   /* r.de = PV de montante (id) · r.deExt = diâmetro externo (m) */
        R.tr[t.id] = r; R.ordem.push(t.id);
      });
    }

    /* PVs */
    for (const id of ordemNos) {
      const n = nos.get(id), I = gIns(id).map(t => R.tr[t.id]), O = outs[id].map(t => R.tr[t.id]), OG = O.filter(o => !o.recq);
      if (!ins[id].length && !O.length) continue;
      const e = eeeNo[id];
      const cf = e ? (I.length ? Math.min(...I.map(i => i.ciJ)) : (+n.ct || 0) - 1.5) : OG.length ? Math.min(...OG.map(o => o.ciM)) : I.length ? Math.min(...I.map(i => i.ciJ)) : (+n.ct || 0) - c.rec - 0.2;
      const ct = +n.ct || 0, prof = ct - cf, Dmax = Math.max(0, ...I.map(i => i.D), ...OG.map(o => o.D));
      const degraus = I.filter(i => !i.sif).map(i => ({tr: i.id, h: r3(i.ciJ - cf)}));
      const cab = !ins[id].length, fim = !O.length;
      const tipo = e ? 'EEE' : cab && prof <= c.profTL ? 'TL' : 'PV';
      R.no[id] = {id, ct, cf, prof, Dmax, degraus, cab, fim, tipo, Dpv: tipo === 'TL' ? 0.60 : (Dmax > 600 ? 1.50 : 1.20), par: tipo === 'TL' ? 0.08 : 0.15,
        tq: e ? 0 : degraus.filter(g => g.h >= c.degTQ - 1e-9).length, QI: QnI[id], QF: QnF[id], recebeRec: ins[id].some(ehRec)};
    }

    /* elevatórias: poço, bombas e recalque (NBR 12208) */
    (P.eee || []).forEach(e => { if (R.no[e.no]) R.eee[e.id] = eeeCalc(e, R, nos, LT, recDeT, c); });

    /* coletores: o tronco segue sempre a maior extensão a montante */
    const ext = {}; for (const id of ordemNos) ext[id] = Math.max(0, ...ins[id].map(t => ext[t.de] + LT[t.id]));
    const princ = id => ins[id].slice().sort((a, b) => (ext[b.de] + LT[b.id]) - (ext[a.de] + LT[a.id]))[0];
    const finais = ordemNos.filter(id => !outs[id].length && ins[id].length).sort((a, b) => ext[b] - ext[a]);
    const pend = finais.map(id => ({no: id, t: princ(id)}));
    while (pend.length) {
      const p = pend.shift(), cadeia = []; let t = p.t;
      while (t) { cadeia.unshift(t.id); ins[t.de].forEach(o => { if (o !== princ(t.de)) pend.push({no: t.de, t: o}); }); t = princ(t.de); }
      if (p.t === princ(p.no)) ins[p.no].forEach(o => { if (o !== p.t) pend.push({no: p.no, t: o}); });
      const num = R.coletores.length + 1;
      cadeia.forEach((id, k) => { R.tr[id].col = num; R.tr[id].seq = k + 1; R.tr[id].nome = num + '-' + (k + 1); });
      R.coletores.push({num, trechos: cadeia, L: cadeia.reduce((s, id) => s + LT[id], 0)});
    }

    /* verificação */
    const ck = (st, onde, msg, cod, id) => R.checks.push({st, onde, msg, cod, id});
    const f = (v, d) => (+v).toFixed(d).replace('.', ',');
    R.ordem.forEach(id => {
      const r = R.tr[id], nm = 'Trecho ' + r.nome;
      if (r.recq) return;
      if (r.sif) {
        const s = r.sif;
        if (s.Vi < c.sVmin - 0.005) ck('warn', nm + ' (sifão)', 'Velocidade ' + f(s.Vi, 2) + ' m/s com a vazão inicial numa linha, abaixo de ' + f(c.sVmin, 2) + ' m/s: o sifão acumula sólidos (prever limpeza frequente ou DN menor na 1ª linha).', 'sifv', id);
        if (s.dn < c.sDmin * 0.73) ck('err', nm + ' (sifão)', 'DN ' + s.dn + ' abaixo do mínimo ' + c.sDmin + ' mm.', 'sifd', id);
        if (r.recM < r.rec - 0.0015) ck('err', nm + ' (sifão)', 'Câmara de entrada com recobrimento ' + f(r.recM, 2) + ' m.', 'rec', id);
        return;
      }
      if (r.hF.carga) ck('err', nm, 'Tubo trabalhando cheio (em carga) com a vazão final: DN ' + r.D + ' não comporta ' + f(r.QF, 2) + ' L/s a ' + f(r.I * 100, 3) + ' %.', 'carga', id);
      else if (!r.okLam) ck('err', nm, 'Lâmina y/D = ' + f(r.hF.yd, 2) + ' acima do limite ' + f(r.lim, 2) + (r.lim < c.yD ? ' (velocidade acima da crítica: precisa de mais ar no tubo)' : '') + '.', 'lamina', id);
      if (r.hI.tau < r.tauMin - 0.005) ck('err', nm, 'Tensão trativa ' + f(r.hI.tau, 2) + ' Pa abaixo de ' + f(r.tauMin, 1) + ' Pa: o esgoto não arrasta os sólidos (declividade mínima ' + f(r.Imin * 100, 3) + ' %).', 'tau', id);
      if (r.hF.V > c.vMax + 0.005) ck('err', nm, 'Velocidade final ' + f(r.hF.V, 2) + ' m/s acima de ' + f(c.vMax, 1) + ' m/s.', 'vmax', id);
      if (r.recM < r.rec - 0.0015 || r.recJ < r.rec - 0.0015) ck('err', nm, 'Recobrimento ' + f(Math.min(r.recM, r.recJ), 2) + ' m menor que o mínimo ' + f(r.rec, 2) + ' m (' + (r.rec === c.recPas ? 'passeio' : 'via') + ').', 'rec', id);
      if (r.I <= 0) ck('err', nm, 'Declividade nula ou contrária ao fluxo.', 'decl', id);
      if (r.L > c.distMax + 0.01) ck('warn', nm, 'Extensão ' + f(r.L, 1) + ' m maior que ' + f(c.distMax, 0) + ' m entre PVs (alcance do equipamento de limpeza).', 'dist', id);
      if (Math.max(r.profM, r.profJ) > c.profMax + 0.005) ck('warn', nm, 'Profundidade ' + f(Math.max(r.profM, r.profJ), 2) + ' m acima de ' + f(c.profMax, 1) + ' m: use 🏭 Sugerir elevatória, outro ponto de lançamento ou rede auxiliar.', 'prof', id);
      gIns(r.de).forEach(a => { const u = R.tr[a.id]; if (!u.sif && u.D > r.D) ck('err', nm, 'DN ' + r.D + ' menor que o do trecho de montante (DN ' + u.D + ').', 'dn', id); });
      if (r.aproxDI) ck('info', nm, 'Diâmetro interno do DN ' + r.D + ' aproximado: confira no catálogo do fabricante (Dados › Tubos).', 'di', id);
    });
    Object.values(R.no).forEach(x => {
      const n = nos.get(x.id);
      if (x.tq) ck('info', nomeNo(n), 'Tubo de queda: chegada ' + f(Math.max(...x.degraus.map(g => g.h)), 2) + ' m acima do fundo.', 'tq', x.id);
      if (x.fim && x.tipo !== 'EEE' && n.cfEx != null && n.cfEx !== '' && x.cf < +n.cfEx - 0.0005) ck('err', nomeNo(n), 'A rede chega na cota ' + f(x.cf, 3) + ', abaixo da cota de fundo disponível no lançamento (' + f(+n.cfEx, 3) + '): use 🏭 Sugerir elevatória ou outro traçado.', 'saida', x.id);
    });
    Object.values(R.eee).forEach(E => E.checks.forEach(k => ck(k[0], E.nome, k[1], k[2], E.no)));
    if (c.tInf < 0.05 || c.tInf > 1) ck('warn', 'Critérios', 'Taxa de infiltração fora da faixa da NBR 9649 (0,05 a 1,0 L/s·km).', 'inf');
    if (c.dMin < 100) ck('err', 'Critérios', 'Diâmetro mínimo abaixo de DN 100 (NBR 9649).', 'dmin');
    R.nErr = R.checks.filter(k => k.st === 'err').length + R.erros.length; R.nWarn = R.checks.filter(k => k.st === 'warn').length;
    R.Qfim = finais.reduce((s, id) => s + QnF[id], 0); R.QfimI = finais.reduce((s, id) => s + QnI[id], 0); R.finais = finais;
    R.profMaxima = Math.max(0, ...Object.values(R.no).filter(x => x.tipo !== 'EEE').map(x => x.prof));
    R.ok = true; return R;
  }

  /* ── estação elevatória: vazões, poço úmido, bombas, recalque e golpe de aríete ── */
  function eeeCalc(e, R, nos, LT, recDeT, c) {
    const n = nos.get(e.no), x = R.no[e.no], E = {id: e.id, no: e.no, nome: 'EEE ' + (e.nome || nomeNo(n)), checks: []};
    const f = (v, d) => (+v).toFixed(d).replace('.', ',');
    const QF = Math.max(c.qMin, x.QF), QI = Math.max(c.qMin, x.QI), Qmin = Math.max(0.5, QI / c.K2 * c.K3), Qmed = QI / c.K2;
    const Qb = QF / 1000, mat = e.mat || c.eMat, T = RECALQUE[mat] || RECALQUE.pvc, C = HW[mat] || 140;
    const trs = Object.keys(recDeT).filter(k => recDeT[k] === e.id), Lr = e.ext ? +(e.ext.L || 0) : trs.reduce((s, k) => s + LT[k], 0);
    let esc = null;
    for (const [dn, di] of T.l) { const d = di / 1000, V = Qb / (Math.PI * d * d / 4); esc = {dn, d, V}; if (V <= 2.0) break; }
    if (e.dnRec) { const m = T.l.find(q => q[0] === +e.dnRec); if (m) { const d = m[1] / 1000; esc = {dn: m[0], d, V: Qb / (Math.PI * d * d / 4)}; } }
    /* poço úmido: volume útil para ciclo mínimo de bombas (V = Qb·T/4), circular, h útil ≤ 1,0 m */
    const Vu = Qb * c.eCiclo * 60 / 4; let Dp = 1.5; while (Vu / (Math.PI * Dp * Dp / 4) > 1.0 && Dp < 4) Dp += 0.5;
    const A = Math.PI * Dp * Dp / 4, hu = Math.max(0.40, Vu / A), NAmax = x.cf - 0.10, NAmin = NAmax - hu, fundo = NAmin - c.eSub - 0.30;
    const profP = (+n.ct || 0) - fundo, td = Vu / (Qmed / 1000) / 60;
    let cotaD, ateNome;
    if (e.ext) { cotaD = +e.ext.cota; ateNome = e.ext.nome || 'ponto de descarga'; }
    else { const m = nos.get(e.ate), xm = R.no[e.ate]; cotaD = m ? (+m.ct || 0) - 0.50 : x.ct; ateNome = m ? nomeNo(m) : '?'; }
    const Hg = cotaD - NAmin, hf = jHW(Qb, esc.d, C) * Lr * 1.10, hl = c.eKloc * esc.V * esc.V / (2 * G), AMT = Math.max(1, Hg + hf + hl);
    const Pcv = 1000 * Qb * AMT / (75 * c.eEta), Pm = CV.find(v => v >= Pcv * (1 + c.eFolgaMotor / 100)) || Math.ceil(Pcv * 1.2);
    const dHa = T.a * esc.V / G, Pmax = AMT + dHa, Tc = 4 * Vu / Qb / 60;
    trs.forEach(k => { const r = R.tr[k]; Object.assign(r, {D: esc.dn, d: esc.d, deExt: esc.d * 1.1, matRec: T.nome, V: esc.V, hF: Object.assign({}, r.hF, {V: esc.V})}); });
    Object.assign(x, {cfIn: x.cf, cf: fundo, prof: profP, Dpv: Dp, par: 0.20});
    Object.assign(E, {QI, QF, Qmin, Qmed, Qb: QF, mat, matNome: T.nome, C, Lr, dn: esc.dn, d: esc.d, V: esc.V, Vu, Dp, A, hu, NAmax, NAmin, fundo, profP, td, cotaD, ateNome,
      Hg, hf, hl, AMT, Pcv, Pm, nB: 2, dHa, Pmax, pn: T.pn, Tc, cheg: x.cf, ext: !!e.ext});
    if (esc.V < c.eVmin) E.checks.push(['warn', 'Velocidade no recalque ' + f(esc.V, 2) + ' m/s abaixo de ' + f(c.eVmin, 2) + ' m/s (deposição): vazão pequena para o menor DN; avaliar DN menor de outro material.', 'eev']);
    if (esc.V > c.eVmax) E.checks.push(['err', 'Velocidade no recalque ' + f(esc.V, 2) + ' m/s acima de ' + f(c.eVmax, 2) + ' m/s.', 'eev']);
    if (td > c.eDet) E.checks.push(['warn', 'Tempo de detenção ' + f(td, 0) + ' min com a vazão média, acima de ' + f(c.eDet, 0) + ' min (septicidade): reduzir o volume útil ou prever aeração.', 'eetd']);
    if (Pmax > T.pn) E.checks.push(['warn', 'Pressão com golpe de aríete ' + f(Pmax, 0) + ' mca acima da classe do tubo (' + T.pn + ' mca): prever válvula antigolpe ou tubo de classe maior.', 'eepn']);
    if (Hg <= 0) E.checks.push(['info', 'Desnível geométrico ' + f(Hg, 2) + ' m: a descarga está abaixo do nível do poço; confira se a elevatória é necessária.', 'eehg']);
    if (!e.ext && !e.ate) E.checks.push(['err', 'Elevatória sem ponto de chegada do recalque.', 'eeate']);
    trs.forEach(k => { const r = R.tr[k]; if (k !== trs[0]) { const no = nos.get(r.de); if (R.ins[r.de].some(t => !recDeT[t.id])) E.checks.push(['err', nomeNo(no) + ' recebe rede por gravidade no meio da linha de recalque: termine o recalque neste PV.', 'eemeio']); } });
    E.checks.push(['info', 'Bombas ' + E.nB + ' (1 + 1 reserva) de ' + f(QF, 2) + ' L/s × ' + f(AMT, 1) + ' mca, motor ' + f(Pm, 1).replace(',0', '') + ' cv · recalque ' + T.nome.split(' (')[0] + ' DN ' + esc.dn + ', ' + f(Lr, 0) + ' m até ' + ateNome + '.', 'eeinfo']);
    return E;
  }
  const geometria = R => { const g = {}; R.ordem.forEach(id => { const r = R.tr[id]; g[id] = {D: r.D, ciM: r.ciM, ciJ: r.ciJ}; }); return g; };

  /* ── quantitativos ──
     Vala: largura = DE + folga (mín. 0,65 m), profundidade = cota do terreno − geratriz inferior externa + berço; medida de centro a centro dos PVs.
     Cava do PV (as composições de PV do SINAPI, SCO e EMOP NÃO incluem escavação, escoramento nem reaterro):
       lado B = Ø externo + 2 × folga da cava; altura = profundidade + laje de fundo + lastro;
       escavação da cava = B²·h − parte já medida nas valas que chegam (B/2 × largura × profundidade de cada vala);
       reaterro da cava = escavação da cava × (1 − área do PV / B²). */
  const faixa = h => h <= 1.5 ? 0 : h <= 3 ? 1 : h <= 4.5 ? 2 : 3;
  function quant(P, R) {
    const c = R.c, Z4 = () => [0, 0, 0, 0];
    const Q = {tubos: {}, juntas: {}, escav: Z4(), escor: Z4(), reat: Z4(), cavaEsc: Z4(), cavaEscor: Z4(), cavaReat: Z4(), cavaLastro: 0, cavaLastroSco: 0,
      fundo: 0, areia: 0, bota: 0, pavA: 0, pasA: 0, loc: 0, pvs: [], tq: 0, tqL: {}, tampas: 0, recalque: {}, sifao: {}, eee: [], escTot: 0, reatTot: 0, memo: {}};
    const vala = {};   /* id do trecho → {larg, hM, hJ} para descontar na cava */
    const nosP = new Map((P.nos || []).map(n => [n.id, n])), trP = new Map((P.trechos || []).map(t => [t.id, t]));
    R.ordem.forEach(id => {
      const r = R.tr[id], t = trP.get(id) || {}, de = r.deExt || r.d || 0.11, parede = Math.max(0, (de - (r.d || 0)) / 2);
      let larg, hM, hJ;
      if (r.recq) {                       /* linha de recalque: vala rasa com o recobrimento do recalque */
        larg = Math.max(0.60, de + 0.40); hM = hJ = c.eRecRec + de + c.berco;
        const k = (R.eee[r.recq] && R.eee[r.recq].mat || c.eMat) + '|' + r.D; Q.recalque[k] = (Q.recalque[k] || 0) + r.L;
      } else if (r.sif) {                /* sifão invertido: n linhas lado a lado até o fundo do sifão */
        const s = r.sif; larg = Math.max(0.65, s.n * s.de + (s.n - 1) * 0.30 + c.folga);
        hM = r.ctM - s.fundo + parede + c.berco; hJ = r.ctJ - s.fundo + parede + c.berco;
        const k = s.mat + '|' + s.dn; Q.sifao[k] = (Q.sifao[k] || 0) + r.L * s.n;
      } else {
        larg = Math.max(0.65, de + c.folga); hM = r.profM + parede + c.berco; hJ = r.profJ + parede + c.berco;
        const k = (r.matK || 'pvcm') + '|' + r.D; Q.tubos[k] = (Q.tubos[k] || 0) + r.L; Q.juntas[r.D] = (Q.juntas[r.D] || 0) + 2;
      }
      const h = (hM + hJ) / 2, kf = faixa(h), vEsc = r.L * larg * h, nT = r.sif ? r.sif.n : 1;
      const vTubo = nT * r.L * Math.PI * de * de / 4, vAreia = Math.max(0, r.L * larg * (c.berco + de + c.envolt) - vTubo);
      Q.escav[kf] += vEsc; if (h > 1.25) Q.escor[kf] += 2 * r.L * h;
      const vRea = Math.max(0, vEsc - vAreia - vTubo); Q.reat[kf] += vRea; Q.areia += vAreia; Q.fundo += r.L * larg; Q.loc += r.L;
      Q.escTot += vEsc; Q.reatTot += vRea;
      if (t.loc === 'passeio') Q.pasA += r.L * (larg + 0.30); else if (c.pav !== 'terra') Q.pavA += r.L * (larg + 0.30);
      Object.assign(r, {larg, hEsc: h, vEsc}); vala[id] = {larg, hM, hJ, de: r.de, para: r.para};
    });
    /* poços de visita, terminais de limpeza e cavas */
    Object.values(R.no).forEach(x => {
      if (x.tipo === 'EEE') return;
      const Dext = x.Dpv + 2 * x.par, B = Dext + 2 * c.folgaCava, laje = x.tipo === 'TL' ? 0.10 : 0.15, h = x.prof + laje + c.lastro, kf = faixa(h);
      let desc = 0, descEsc = 0;
      R.ordem.forEach(id => { const v = vala[id]; if (!v) return; let hv = null; if (v.de === x.id) hv = v.hM; else if (v.para === x.id) hv = v.hJ; if (hv == null) return;
        desc += B / 2 * Math.min(v.larg, B) * Math.min(h, hv); descEsc += Math.min(v.larg, B) * Math.min(h, hv); });
      const esc = Math.max(0, B * B * h - desc), reat = esc * Math.max(0, 1 - Math.PI * Dext * Dext / 4 / (B * B));
      Q.cavaEsc[kf] += esc; Q.cavaReat[kf] += reat; if (h > 1.25) Q.cavaEscor[kf] += Math.max(0, 4 * B * h - descEsc);
      Q.escTot += esc; Q.reatTot += reat;
      const lastro = Math.PI * (Dext + 0.20) ** 2 / 4 * c.lastro; Q.cavaLastro += lastro;
      const n = nosP.get(x.id) || {}; if (n.loc === 'passeio') Q.pasA += Math.max(0, B * B - descEsc * 0.5); else if (c.pav !== 'terra') Q.pavA += Math.max(0, B * B - descEsc * 0.5);
      Q.pvs.push({id: x.id, tipo: x.tipo, Dpv: x.Dpv, Dext, prof: x.prof, B, h, esc, reat, lastro, tq: x.tq});
      Q.tampas++;
      x.degraus.forEach(g => { if (g.h >= c.degTQ - 1e-9) { const D = R.tr[g.tr] ? R.tr[g.tr].D : 150; Q.tqL[D] = (Q.tqL[D] || 0) + g.h; Q.tq++; } });
    });
    /* estações elevatórias: poço úmido circular em concreto armado */
    Object.values(R.eee).forEach(E => {
      const n = nosP.get(E.no) || {}, ct = +n.ct || 0, esp = 0.20, Dext = E.Dp + 2 * esp, prof = ct - E.fundo, lajeF = 0.25, lajeT = 0.20;
      const B = Dext + 2 * c.folgaCava, h = prof + lajeF + c.lastro, kf = faixa(h), A = Math.PI * Dext * Dext / 4;
      const conc = Math.PI * (Dext * Dext - E.Dp * E.Dp) / 4 * prof + A * lajeF + A * lajeT - 2 * 0.60 * 0.60;
      const esc = B * B * h, reat = (B * B - A) * h;
      Q.cavaEsc[kf] += esc; Q.cavaReat[kf] += reat; Q.cavaEscor[kf] += 4 * B * h; Q.escTot += esc; Q.reatTot += reat;
      Q.cavaLastro += (B * B) * c.lastro;
      Q.eee.push({id: E.id, nome: E.nome, Dp: E.Dp, Dext, prof, B, h, esc, reat, conc, nB: E.nB, Pm: E.Pm, dn: E.dn, mat: E.mat, Lr: E.Lr, AMT: E.AMT, Qb: E.Qb});
      Q.tampas += 2;
    });
    Q.lig = c.nLig > 0 ? Math.round(c.nLig) : Math.round(c.popF / Math.max(1, c.habLig));
    Q.ramal = Q.lig * c.ramal; Q.ramalEsc = Q.ramal * 0.60 * 1.00;   /* vala do ramal 0,60 × 1,00 m */
    Q.bota = Math.max(0, Q.escTot - Q.reatTot) * c.empol;
    return Q;
  }

  /* ── itens do orçamento: um item por serviço, com o código de cada banco (EMOP, SINAPI RJ, SCO-Rio) ──
     Mesmo formato do módulo comum de orçamento do site (orcamento-comum.js): {g, k, nome, un, q, cod:{emop,sinapi,sco}, qb:{banco: quantidade na unidade daquele banco}, memo}.
     Código ausente num banco = usa o equivalente do próximo banco (SINAPI → SCO → EMOP). false = o serviço não existe naquele banco (já está incluído em outra composição).
     Os códigos EMOP só entram onde foram conferidos no catálogo usado pela Drenagem; nos demais o Orçamento usa o SINAPI ou o SCO. */
  const SOL = [
    {k: 'rec', nome: 'Recomendada — PV em anéis pré-moldados de concreto', curto: 'PV pré-moldado', desc: 'Tubos do dimensionamento; poços de visita e terminais de limpeza em anéis de concreto pré-moldado (montagem rápida, menos tempo de vala aberta).'},
    {k: 'alv', nome: 'PV em alvenaria de tijolos maciços', curto: 'PV em alvenaria', desc: 'Tubos do dimensionamento; poços de visita em alvenaria de tijolo maciço revestida (SINAPI). SCO-Rio e EMOP usam os poços pré-moldados equivalentes.'},
    {k: 'tub', nome: 'Outro tubo de PVC (maciço ⇄ corrugado) com PV pré-moldado', curto: 'Outro tubo PVC', desc: 'Mesmos DN e cotas, trocando o PVC de parede maciça pelo corrugado de dupla parede (ou o contrário). Confira o diâmetro interno em Dados › Tubos antes de adotar.'}
  ];
  const GRUPOS = ['Serviços preliminares', 'Movimento de terra — valas', 'Movimento de terra — cavas dos PVs', 'Tubulação', 'Poços de visita e terminais de limpeza', 'Ligações prediais', 'Estação elevatória e recalque', 'Sifão invertido', 'Pavimentação'];
  const CS = {   /* códigos */
    escS: ['SC-90100', 'SC-90102', 'SC-90086', 'SC-90090'], escE: ['03.020.0050', '03.020.0085', '03.020.0090', '03.020.0100'], escC: 'SCO-MT 10.10.0050',
    scoS: ['SC-101570', 'SC-101578', 'SC-101580', 'SC-101586'], scoC: [false, 'SCO-FD 10.26.0050', 'SCO-FD 10.26.0051', 'SCO-FD 10.26.0052'],
    reaS: ['SC-93379', 'SC-93381', 'SC-93372', 'SC-93372'], reaE: '03.011.0015', reaC: 'SCO-MT 15.10.0075',
    tubo: {
      pvcm: {s: {100: 'SC-90694', 150: 'SC-90695', 200: 'SC-90696', 250: 'SC-90697', 300: 'SC-90698', 350: 'SC-90699', 400: 'SC-90700'}, c: {100: 'SCO-DR 05.40.0050', 150: 'SCO-DR 05.40.0100', 200: 'SCO-DR 05.40.0150', 250: 'SCO-DR 05.40.0200', 300: 'SCO-DR 05.40.0250'}, nome: 'PVC de parede maciça (NBR 7362)'},
      pvcc: {s: {150: 'SC-90701', 200: 'SC-90702', 250: 'SC-90703', 300: 'SC-90704', 350: 'SC-90705', 400: 'SC-90706'}, c: {}, nome: 'PVC corrugado de dupla parede'},
      conc: {s: {300: 'SC-92833', 400: 'SC-92835', 500: 'SC-92837', 600: 'SC-92839', 700: 'SC-92841', 800: 'SC-92843', 900: 'SC-92845', 1000: 'SC-92847'}, c: {300: 'SCO-DR 05.27.0300', 400: 'SCO-DR 05.27.0400', 500: 'SCO-DR 05.27.0500', 600: 'SCO-DR 05.27.0600', 700: 'SCO-DR 05.27.0700', 900: 'SCO-DR 05.27.0901'}, nome: 'concreto armado (NBR 8890)'}
    },
    junta: {100: 'SC-90724', 150: 'SC-90725', 200: 'SC-90726', 250: 'SC-90727', 300: 'SC-90728', 350: 'SC-90729', 400: 'SC-90730', 500: 'SC-90732', 600: 'SC-90732'},
    pvScoTL: [[0.80, 'SCO-DR 20.15.0050'], [1.00, 'SCO-DR 20.15.0053']],
    pvSco: [[1.05, '0056'], [1.20, '0059'], [1.40, '0062'], [1.50, '0065'], [1.60, '0068'], [1.70, '0071'], [2.00, '0074'], [2.30, '0077'], [2.60, '0080'], [3.20, '0083'], [3.50, '0086'], [3.80, '0089'], [4.10, '0092'], [4.40, '0095'], [4.70, '0098'], [5.00, '0101']],
    rec: {pvc: {s: {100: 'SC-106109'}, c: {100: 'SCO-DR 05.45.0200', 150: 'SCO-DR 05.45.0203', 200: 'SCO-DR 05.45.0206'}},
      pead: {s: {110: 'SC-103376', 160: 'SC-103377', 200: 'SC-103379'}, c: {}},
      fofo: {s: {}, c: {80: 'SCO-DR 10.05.0050', 100: 'SCO-DR 10.05.0053', 150: 'SCO-DR 10.05.0056', 200: 'SCO-DR 10.05.0059', 250: 'SCO-DR 10.05.0062', 300: 'SCO-DR 10.05.0065'}}},
    bombaSco: [[1, 'SCO-EQ 35.10.0050'], [2, 'SCO-EQ 35.10.0100'], [3.5, 'SCO-EQ 35.10.0150'], [8, 'SCO-EQ 35.10.0250'], [15, 'SCO-EQ 35.10.0262']],
    regSco: {80: 'SCO-DR 15.10.0025', 100: 'SCO-DR 15.10.0056', 110: 'SCO-DR 15.10.0056', 150: 'SCO-DR 15.10.0059', 160: 'SCO-DR 15.10.0059'},
    regSin: {50: 'SC-103527', 80: 'SC-103528', 100: 'SC-103529', 110: 'SC-103529', 150: 'SC-103530', 160: 'SC-103530', 200: 'SC-103531', 250: 'SC-103532', 300: 'SC-103533'},
    retSin: {100: 'SC-103539', 110: 'SC-103539', 150: 'SC-103540', 160: 'SC-103540', 200: 'SC-103541'}, retSco: {150: 'SCO-IT 10.35.0550', 160: 'SCO-IT 10.35.0550'},
    pav: {asfalto: {sinapi: 'SC-102098', sco: 'SCO-BP 10.05.0500', emop: '08.015.0068'}, paralelo: {sinapi: 'SC-101817'}, intertravado: {sinapi: 'SC-102988'}}
  };
  const ff = (v, d) => (+v).toFixed(d === undefined ? 2 : d).replace('.', ',');
  const pick = (tab, v) => { for (const [lim, cod] of tab) if (v <= lim + 1e-9) return cod; return null; };
  function itens(P, R, Q, sol) {
    sol = sol || 'rec';
    const c = R.c, L = [], gm = 1.6;   /* t/m³ do solo (composições EMOP/SCO em tonelada) */
    const add = (g, k, nome, un, q, cod, memo, qb) => { if (q > 0.0005) L.push({g, k, nome, un, q, cod: cod || {}, memo: memo || '', qb: qb || null}); };
    const FX = ['até 1,50 m', 'de 1,50 a 3,00 m', 'de 3,00 a 4,50 m', 'acima de 4,50 m'];
    const G = GRUPOS;
    /* preliminares */
    add(G[0], 'loc', 'Locação da rede coletora', 'm', Q.loc, {sinapi: 'SC-99063'}, 'Extensão total da rede, recalque e sifões: ' + ff(Q.loc) + ' m');
    if (c.pav !== 'terra' && Q.pavA > 0 && c.pav === 'asfalto') add(G[0], 'dem', 'Demolição do pavimento asfáltico sobre as valas e cavas', 'm²', Q.pavA, {emop: '05.002.0005', sinapi: false, sco: false}, 'Área = Σ extensão × (largura da vala + 0,30 m) + cavas dos PVs = ' + ff(Q.pavA) + ' m² (no SINAPI a demolição já está na recomposição)');
    /* valas */
    FX.forEach((fx, k) => add(G[1], 'esc' + k, 'Escavação mecanizada de vala, profundidade ' + fx, 'm³', Q.escav[k], {sinapi: CS.escS[k], emop: CS.escE[k], sco: CS.escC}, 'Σ extensão × largura × profundidade média dos trechos nesta faixa'));
    FX.forEach((fx, k) => add(G[1], 'sco' + k, 'Escoramento de vala (mais de 1,25 m — NR-18), profundidade ' + fx, 'm²', Q.escor[k], {sinapi: CS.scoS[k], sco: CS.scoC[k]}, '2 paredes × extensão × profundidade'));
    add(G[1], 'fundo', 'Preparo e regularização do fundo de vala', 'm²', Q.fundo, {sinapi: 'SC-101616'}, 'Σ extensão × largura da vala');
    add(G[1], 'areia', 'Berço e envoltória do tubo (areia / pó de pedra)', 'm³', Q.areia, {sinapi: 'SC-101622', sco: 'SCO-BP 05.05.0100', emop: '06.088.0010'}, 'Largura × (berço ' + ff(c.berco) + ' + DE + envoltória ' + ff(c.envolt) + ' m) − volume do tubo');
    FX.forEach((fx, k) => add(G[1], 'rea' + k, 'Reaterro compactado de vala, profundidade ' + fx, 'm³', Q.reat[k], {sinapi: CS.reaS[k], emop: CS.reaE, sco: CS.reaC}, 'Escavação − berço/envoltória − tubo'));
    /* cavas dos PVs */
    FX.forEach((fx, k) => add(G[2], 'cesc' + k, 'Escavação mecanizada da cava dos PVs, profundidade ' + fx, 'm³', Q.cavaEsc[k], {sinapi: CS.escS[k], emop: CS.escE[k], sco: CS.escC}, 'Cava quadrada de lado Ø externo + 2 × ' + ff(c.folgaCava) + ' m, altura = profundidade + laje + lastro, menos o trecho das valas dentro da cava'));
    FX.forEach((fx, k) => add(G[2], 'csco' + k, 'Escoramento da cava dos PVs, profundidade ' + fx, 'm²', Q.cavaEscor[k], {sinapi: CS.scoS[k], sco: CS.scoC[k]}, '4 lados × altura, menos as aberturas das valas'));
    add(G[2], 'clastro', 'Lastro de brita no fundo da cava dos PVs e elevatórias', 'm³', Q.cavaLastro, {sinapi: false, sco: 'SCO-DR 55.05.0050', emop: '06.088.0010'}, 'Círculo de Ø externo + 0,20 m × ' + ff(c.lastro) + ' m (no SINAPI o lastro já está na composição do PV)');
    FX.forEach((fx, k) => add(G[2], 'crea' + k, 'Reaterro compactado da cava dos PVs, profundidade ' + fx, 'm³', Q.cavaReat[k], {sinapi: CS.reaS[k], emop: CS.reaE, sco: CS.reaC}, 'Escavação da cava × (1 − área do PV / área da cava)'));
    const tSolo = Q.bota / c.empol * gm;
    add(G[2], 'carga', 'Carga, manobra e descarga do solo excedente', 'm³', Q.bota, {sinapi: 'SC-100974', emop: '04.011.0052', sco: 'SCO-TC 10.05.0350'}, '(Escavação total ' + ff(Q.escTot) + ' − reaterro ' + ff(Q.reatTot) + ') × empolamento ' + ff(c.empol), {emop: tSolo, sco: tSolo});
    add(G[2], 'transp', 'Transporte do solo excedente ao bota-fora, DMT ' + ff(c.dmt, 1) + ' km', 'm³·km', Q.bota * c.dmt, {sinapi: 'SC-93589', emop: '04.005.0143', sco: 'SCO-TC 05.05.0150'}, 'Volume solto × DMT (EMOP/SCO em t·km com ' + ff(gm, 1) + ' t/m³)', {emop: tSolo * c.dmt, sco: tSolo * c.dmt});
    /* tubulação */
    const outro = m => m === 'pvcm' ? 'pvcc' : m === 'pvcc' ? 'pvcm' : m;
    Object.keys(Q.tubos).sort((a, b) => +a.split('|')[1] - +b.split('|')[1] || a.localeCompare(b)).forEach(k => {
      let [m, D] = k.split('|'); D = +D; if (sol === 'tub' && m !== 'conc') m = outro(m);
      const T = CS.tubo[m] || CS.tubo.pvcm;
      add(G[3], 'tubo' + k, 'Tubo de ' + T.nome + ' para rede coletora de esgoto, DN ' + D + ', junta elástica — fornecimento e assentamento', 'm', Q.tubos[k], {sinapi: T.s[D] || null, sco: T.c[D] || null}, 'Σ extensão dos trechos DN ' + D);
    });
    Object.keys(Q.juntas).map(Number).sort((a, b) => a - b).forEach(D => add(G[3], 'junta' + D, 'Junta argamassada entre tubo DN ' + D + ' e o poço de visita', 'un', Q.juntas[D], {sinapi: CS.junta[D] || null, sco: false, emop: false}, '2 por trecho'));
    Object.keys(Q.tqL).map(Number).sort((a, b) => a - b).forEach(D => { const m = D > 400 ? 'conc' : (c.mat || 'pvcm'), T = CS.tubo[m] || CS.tubo.pvcm;
      add(G[3], 'tq' + D, 'Tubo de queda DN ' + D + ' junto ao PV (tubo vertical; tê e curva no mesmo DN)', 'm', Q.tqL[D], {sinapi: T.s[D] || null, sco: T.c[D] || null}, 'Σ alturas dos degraus ≥ ' + ff(c.degTQ) + ' m'); });
    /* poços de visita */
    const pvs = Q.pvs, pre = sol !== 'alv';
    const tls = pvs.filter(p => p.tipo === 'TL');
    if (tls.length) {
      const s1 = tls.filter(p => p.prof <= (pre ? 0.90 : 0.95)), s2 = tls.filter(p => p.prof > (pre ? 0.90 : 0.95)), sc = {}, mE = tls.reduce((a, p) => a + p.prof, 0);
      add(G[4], 'tl1', 'Terminal de limpeza / poço de inspeção Ø 0,60 m, ' + (pre ? 'pré-moldado, até 0,90 m' : 'alvenaria, até 0,95 m'), 'un', s1.length, {sinapi: pre ? 'SC-97974' : 'SC-97976', sco: false, emop: false}, s1.length + ' terminais rasos');
      add(G[4], 'tl2', 'Terminal de limpeza / poço de inspeção Ø 0,60 m, ' + (pre ? 'pré-moldado, até 1,40 m' : 'alvenaria, até 1,45 m'), 'un', s2.length, {sinapi: pre ? 'SC-97975' : 'SC-97977', sco: false, emop: false}, s2.length + ' terminais');
      tls.forEach(p => { const cod = pick(CS.pvScoTL, p.prof) || 'SCO-DR 20.15.' + (pick(CS.pvSco, p.prof) || '0101'); sc[cod] = (sc[cod] || 0) + 1; });
      Object.keys(sc).forEach(cod => add(G[4], 'tlsco' + cod, 'Terminal / poço de inspeção em anéis de concreto (SCO-Rio, pela profundidade útil)', 'un', sc[cod], {sco: cod, sinapi: false, emop: false}, sc[cod] + ' un'));
      add(G[4], 'tlemop', 'Corpo de poço de inspeção em anéis pré-moldados Ø 0,60 m (EMOP, pela altura útil)', 'm', mE, {emop: '06.017.0080', sinapi: false, sco: false}, 'Σ profundidades dos terminais');
    }
    [1.2, 1.5].forEach(Dp => {
      const l = pvs.filter(p => p.tipo === 'PV' && p.Dpv === Dp); if (!l.length) return;
      const t = ff(Dp), h0 = pre ? (Dp === 1.2 ? 1.60 : 1.35) : 1.40, acr = l.reduce((a, p) => a + Math.max(0, p.prof - h0), 0);
      const sb = pre ? (Dp === 1.2 ? 'SC-102139' : 'SC-102141') : (Dp === 1.2 ? 'SC-97988' : 'SC-97992'), sa = pre ? (Dp === 1.2 ? 'SC-97987' : 'SC-97991') : (Dp === 1.2 ? 'SC-97989' : 'SC-97993');
      add(G[4], 'pvb' + Dp, 'Base de poço de visita circular Ø ' + t + ' m ' + (pre ? 'em concreto pré-moldado' : 'em alvenaria') + ', profundidade ' + ff(h0) + ' m (inclui lastro de brita)', 'un', l.length, {sinapi: sb, sco: false, emop: false}, l.length + ' PVs');
      add(G[4], 'pva' + Dp, 'Acréscimo de poço de visita Ø ' + t + ' m (altura além de ' + ff(h0) + ' m)', 'm', acr, {sinapi: sa, sco: false, emop: false}, 'Σ (profundidade − ' + ff(h0) + ' m)');
      const sc = {}; l.forEach(p => { const cod = Dp === 1.5 ? 'SCO-DR 20.20.0500' : 'SCO-DR 20.15.' + (pick(CS.pvSco, p.prof) || '0101'); sc[cod] = (sc[cod] || 0) + 1; });
      Object.keys(sc).forEach(cod => add(G[4], 'pvsco' + Dp + cod, 'Poço de visita para esgoto Ø ' + (Dp === 1.2 ? '1,10' : '1,50') + ' m (SCO-Rio, modelo da profundidade útil imediatamente acima)', 'un', sc[cod], {sco: cod, sinapi: false, emop: false}, sc[cod] + ' PVs'));
    });
    add(G[4], 'tampa', 'Tampão circular de ferro fundido Ø 0,60 m', 'un', Q.tampas, {sinapi: 'SC-98114', sco: 'SCO-DR 35.05.0200', emop: '06.016.0007'}, 'Um por PV/TL e dois por elevatória');
    /* ligações prediais */
    add(G[5], 'lig', 'Ligação predial de esgoto (selim, curva e caixa de inspeção)', 'un', Q.lig, {sinapi: 'SC-104076', sco: 'SCO-IT 15.60.0103'}, Q.lig + ' ligações (' + (c.nLig > 0 ? 'informadas' : 'população final ÷ ' + ff(c.habLig, 1) + ' hab/ligação') + '); SINAPI: só o selim — caixa de inspeção à parte');
    add(G[5], 'ramal', 'Ramal predial em tubo de PVC DN 100 (coletor predial)', 'm', Q.ramal, {sinapi: 'SC-104085', sco: false}, Q.lig + ' × ' + ff(c.ramal, 1) + ' m (SCO: o tubo está na ligação)');
    add(G[5], 'ramesc', 'Escavação manual da vala do ramal (0,60 × 1,00 m)', 'm³', Q.ramalEsc, {sinapi: 'SC-93358', sco: false}, 'Ramal × 0,60 × 1,00 (SCO por metro no item seguinte)');
    add(G[5], 'ramrea', 'Reaterro manual compactado da vala do ramal', 'm³', Q.ramalEsc, {sinapi: 'SC-93382', sco: false}, 'Igual à escavação (o tubo DN 100 é desprezível)');
    add(G[5], 'ramsco', 'Escavação e reaterro de vala para ligação predial de esgoto (SCO-Rio)', 'm', Q.ramal, {sco: 'SCO-MT 05.20.0100', sinapi: false, emop: false}, 'Extensão dos ramais');
    /* elevatórias e recalque */
    Q.eee.forEach((e, i) => {
      const g = G[6], pre2 = 'eee' + i, dn = e.dn;
      add(g, pre2 + 'c', e.nome + ' — poço úmido em concreto armado Ø ' + ff(e.Dp) + ' m, parede 0,20 m', 'm³', e.conc, {sco: 'SCO-ET 05.60.0200'}, 'Parede π·(Dₑ² − Dᵢ²)/4 × ' + ff(e.prof) + ' m + lajes de fundo (0,25) e de cobertura (0,20) − aberturas');
      add(g, pre2 + 'b', e.nome + ' — conjunto motobomba submersível para esgoto, ' + ff(e.Pm, 1).replace(',0', '') + ' cv (' + ff(e.Qb) + ' L/s × ' + ff(e.AMT, 1) + ' mca)', 'un', e.nB,
        {sco: pick(CS.bombaSco, e.Pm) || false, sinapi: e.Pm <= 3.8 ? 'SC-102126' : e.Pm <= 10 ? 'SC-102128' : e.Pm <= 25 ? 'SC-102130' : null}, '1 em operação + 1 reserva');
      add(g, pre2 + 'r', e.nome + ' — válvula de retenção DN ' + dn, 'un', e.nB, {sinapi: CS.retSin[dn] || null, sco: CS.retSco[dn] || null}, 'Uma por bomba');
      add(g, pre2 + 'g', e.nome + ' — registro de gaveta DN ' + dn, 'un', e.nB, {sinapi: CS.regSin[dn] || null, sco: CS.regSco[dn] || null}, 'Um por bomba');
      add(g, pre2 + 'v', e.nome + ' — ventosa tríplice no ponto alto do recalque', 'un', e.Lr > 50 ? 1 : 0, {sco: 'SCO-DR 15.45.0050'}, 'Recalque com ' + ff(e.Lr, 0) + ' m');
      add(g, pre2 + 'q', e.nome + ' — quadro de comando, boias de nível, grade de barras e barrilete (composição própria)', 'un', 1, {}, 'Orçar por cotação de fornecedor');
    });
    Object.keys(Q.recalque).forEach(k => { const [m, dn] = k.split('|'), T = CS.rec[m] || CS.rec.pvc;
      add(G[6], 'rec' + k, 'Tubo de recalque ' + (RECALQUE[m] || RECALQUE.pvc).nome + ', DN ' + dn, 'm', Q.recalque[k], {sinapi: T.s[+dn] || null, sco: T.c[+dn] || null}, 'Extensão da linha de recalque'); });
    Object.keys(Q.sifao).forEach(k => { const [m, dn] = k.split('|'), T = CS.rec[m] || CS.rec.fofo;
      add(G[7], 'sif' + k, 'Tubo do sifão invertido em ' + (RECALQUE[m] || RECALQUE.fofo).nome + ', DN ' + dn, 'm', Q.sifao[k], {sinapi: T.s[+dn] || null, sco: T.c[+dn] || null}, 'Extensão × número de linhas'); });
    /* pavimentação */
    const pv = CS.pav[c.pav];
    if (pv && Q.pavA > 0) {
      const asf = c.pav === 'asfalto', vol = Q.pavA * c.espPav;
      add(G[8], 'pav', asf ? 'Recomposição do revestimento em concreto asfáltico sobre as valas e cavas (esp. ' + ff(c.espPav * 100, 0) + ' cm)' : 'Recomposição de pavimento em ' + (c.pav === 'paralelo' ? 'paralelepípedos' : 'blocos intertravados'), asf ? 'm³' : 'm²', asf ? vol : Q.pavA, pv,
        'Área ' + ff(Q.pavA) + ' m²' + (asf ? ' × ' + ff(c.espPav) + ' m (SCO em m², EMOP em t com 2,4 t/m³)' : ''), asf ? {sco: Q.pavA, emop: vol * 2.4} : null);
    }
    add(G[8], 'pas', 'Recomposição de passeio sobre as valas em calçada (composição própria / da prefeitura)', 'm²', Q.pasA, {}, 'Trechos marcados como passeio');
    return L;
  }

  /* ── sugestão de elevatória: onde a rede passa da profundidade máxima ou chega abaixo do lançamento ── */
  function sugerirEEE(P) {
    const out = [], R0 = calc(P); if (!R0.ok) return {erro: 'Calcule a rede primeiro.', lista: out};
    P.eee = P.eee || [];
    for (let volta = 0; volta < 6; volta++) {
      const R = volta ? calc(P) : R0, c = R.c;
      const fundo = R.ordem.map(id => R.tr[id]).find(r => !r.recq && !r.sif && Math.max(r.profM, r.profJ) > c.profMax + 0.005 && !P.eee.some(e => e.no === r.de));
      if (fundo) {
        let N = fundo.de; if (R.no[N] && R.no[N].prof > c.profMax) { const ant = (R.ins[N] || []).map(t => R.tr[t.id]).filter(r => !r.recq)[0]; if (ant && !P.eee.some(e => e.no === ant.de)) N = ant.de; }
        const cam = []; let n = N, k = 0; while (R.outs[n] && R.outs[n][0] && k++ < 80) { n = R.outs[n][0].para; cam.push(n); }
        if (!cam.length) break;
        const nos = new Map(P.nos.map(q => [q.id, q])), ctN = +nos.get(N).ct;
        const cand = []; for (const q of cam) { cand.push(q); if ((R.ins[q] || []).length > 1) break; }   /* o recalque termina no primeiro PV que recebe outra rede */
        let M = cand[0]; cand.forEach((q, i) => { if (+nos.get(q).ct + i * 1e-6 >= +nos.get(M).ct) M = q; });
        const e = {id: 'e' + (Date.now() % 1e7) + volta, no: N, ate: M, nome: ''};
        P.eee.push(e); out.push({motivo: 'profundidade ' + ff(Math.max(fundo.profM, fundo.profJ)) + ' m no trecho ' + (fundo.nome || fundo.id), e});
        continue;
      }
      const saida = Object.values(R.no).find(x => { const nn = P.nos.find(q => q.id === x.id); return x.fim && nn && nn.cfEx != null && nn.cfEx !== '' && x.cf < +nn.cfEx - 0.0005 && !P.eee.some(e => e.no === x.id); });
      if (saida) { const nn = P.nos.find(q => q.id === saida.id), e = {id: 'e' + (Date.now() % 1e7) + volta, no: saida.id, ext: {nome: 'lançamento', cota: r3(+nn.cfEx + 0.50), L: 30}, nome: ''};
        P.eee.push(e); out.push({motivo: 'rede chega abaixo da cota do lançamento em ' + nomeNo(nn), e}); continue; }
      break;
    }
    return {lista: out};
  }

  function idw(pts, x, y) {
    if (!pts || !pts.length) return null; let sw = 0, sz = 0;
    for (const p of pts) { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < 1e-6) return +p.z; const w = 1 / (d2 * d2); sw += w; sz += w * p.z; }
    return sz / sw;
  }
  function gerar(P) {
    const c = crit(P), tol = 1.0, avisos = [];
    const ruas = (P.ruas || []).filter(r => r.pts && r.pts.length >= 2);
    if (!ruas.length) return {erro: 'Desenhe ou cole pelo menos uma rua.'};
    const NS = [], noAt = (x, y) => { for (const n of NS) if (Math.hypot(n.x - x, n.y - y) <= tol) return n; const n = {i: NS.length, x, y, z: null}; NS.push(n); return n; };
    const INF = ruas.map(r => { const s = [0]; for (let i = 1; i < r.pts.length; i++) s.push(s[i - 1] + Math.hypot(r.pts[i].x - r.pts[i - 1].x, r.pts[i].y - r.pts[i - 1].y)); return {r, s, st: s.map(v => ({s: v}))}; });
    const ponto = (inf, s) => { const S = inf.s, p = inf.r.pts; let i = 1; while (i < S.length - 1 && S[i] < s) i++; const t = S[i] > S[i - 1] ? (s - S[i - 1]) / (S[i] - S[i - 1]) : 0; return {x: p[i - 1].x + (p[i].x - p[i - 1].x) * t, y: p[i - 1].y + (p[i].y - p[i - 1].y) * t}; };
    const zRua = (inf, s) => { const k = inf.r.pts.map((p, i) => ({s: inf.s[i], z: p.z})).filter(q => q.z != null && q.z !== '' && isFinite(+q.z)); if (!k.length) return null; if (s <= k[0].s) return +k[0].z; for (let i = 1; i < k.length; i++) if (s <= k[i].s) return +k[i - 1].z + (+k[i].z - +k[i - 1].z) * (s - k[i - 1].s) / (k[i].s - k[i - 1].s || 1); return +k[k.length - 1].z; };
    /* cruzamentos e encontros em T */
    for (let a = 0; a < INF.length; a++) for (let b = a + 1; b < INF.length; b++) {
      const A = INF[a], B = INF[b], pa = A.r.pts, pb = B.r.pts;
      for (let i = 1; i < pa.length; i++) for (let j = 1; j < pb.length; j++) {
        const x1 = pa[i - 1].x, y1 = pa[i - 1].y, dx1 = pa[i].x - x1, dy1 = pa[i].y - y1, x3 = pb[j - 1].x, y3 = pb[j - 1].y, dx2 = pb[j].x - x3, dy2 = pb[j].y - y3;
        const den = dx1 * dy2 - dy1 * dx2, la = Math.hypot(dx1, dy1), lb = Math.hypot(dx2, dy2); if (Math.abs(den) < 1e-9 * la * lb || !la || !lb) continue;
        let ta = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / den, tb = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / den; const ea = tol / la, eb = tol / lb;
        if (ta < -ea || ta > 1 + ea || tb < -eb || tb > 1 + eb) continue;
        ta = Math.min(1, Math.max(0, ta)); tb = Math.min(1, Math.max(0, tb));
        A.st.push({s: A.s[i - 1] + ta * la}); B.st.push({s: B.s[j - 1] + tb * lb});
      }
    }
    const E = [], vistos = new Set();
    INF.forEach(inf => {
      inf.st.sort((p, q) => p.s - q.s); const u = []; inf.st.forEach(p => { if (!u.length || p.s - u[u.length - 1].s > tol) u.push(p); });
      const todos = []; u.forEach((p, i) => { if (i) { const a = u[i - 1].s, n = Math.max(1, Math.ceil((p.s - a) / c.distPV - 1e-9)); for (let k = 1; k < n; k++) todos.push({s: a + (p.s - a) * k / n}); } todos.push(p); });
      let ant = null;
      todos.forEach(p => { const q = ponto(inf, p.s), n = noAt(q.x, q.y); if (n.z == null) { const z = zRua(inf, p.s); if (z != null) n.z = z; }
        if (ant && ant.n !== n) { const key = Math.min(ant.n.i, n.i) + '_' + Math.max(ant.n.i, n.i); if (!vistos.has(key)) { vistos.add(key); E.push({a: ant.n, b: n, L: p.s - ant.s, rua: inf.r.id}); } }
        ant = {n, s: p.s}; });
    });
    let semZ = 0; NS.forEach(n => { if (n.z == null) n.z = idw(P.topo, n.x, n.y); if (n.z == null) { n.z = 100; semZ++; } });
    if (semZ) avisos.push(semZ + ' ponto(s) sem cota de terreno: usei 100,00. Informe as cotas das ruas ou cole os pontos da topografia.');
    /* componentes e ponto de lançamento de cada uma */
    const adj = NS.map(() => []); E.forEach(e => { adj[e.a.i].push(e); adj[e.b.i].push(e); });
    const comp = NS.map(() => -1); let nc = 0;
    NS.forEach(n => { if (comp[n.i] >= 0) return; const f = [n]; comp[n.i] = nc; while (f.length) { const u = f.pop(); adj[u.i].forEach(e => { const v = e.a === u ? e.b : e.a; if (comp[v.i] < 0) { comp[v.i] = nc; f.push(v); } }); } nc++; });
    let alvo = null; if (P.saida) { let dm = 1e18; NS.forEach(n => { const d = Math.hypot(n.x - P.saida.x, n.y - P.saida.y); if (d < dm) { dm = d; alvo = n; } }); }
    const dist = NS.map(() => Infinity), pai = NS.map(() => null), saidas = [];
    for (let k = 0; k < nc; k++) { const l = NS.filter(n => comp[n.i] === k && adj[n.i].length); if (!l.length) continue; const s = alvo && comp[alvo.i] === k ? alvo : l.reduce((a, b) => b.z < a.z ? b : a); dist[s.i] = 0; saidas.push(s); }
    if (nc > 1 && saidas.length > 1) avisos.push('As ruas formam ' + saidas.length + ' redes separadas: cada uma ganhou o seu ponto de lançamento.');
    /* caminho de cada PV até o lançamento, evitando subir o terreno (subir = aprofundar a rede) */
    const feito = NS.map(() => false);
    for (;;) { let u = null; NS.forEach(n => { if (!feito[n.i] && dist[n.i] < Infinity && (!u || dist[n.i] < dist[u.i])) u = n; }); if (!u) break; feito[u.i] = true;
      adj[u.i].forEach(e => { const v = e.a === u ? e.b : e.a, custo = e.L + 60 * Math.max(0, u.z - v.z); if (dist[u.i] + custo < dist[v.i]) { dist[v.i] = dist[u.i] + custo; pai[v.i] = e; } }); }
    let seq = 0; const nid = () => 'n' + (++seq);
    NS.forEach(n => { n.id = nid(); });
    const nos = NS.filter(n => adj[n.i].length).map(n => ({id: n.id, x: r3(n.x), y: r3(n.y), ct: r3(n.z)})), trechos = []; let tq = 0;
    E.forEach(e => {
      let de, para, L = e.L;
      if (pai[e.a.i] === e) { de = e.a.id; para = e.b.id; } else if (pai[e.b.i] === e) { de = e.b.id; para = e.a.id; }
      else {   /* trecho que fecha a malha: começa numa cabeceira própria junto ao PV mais alto */
        const hi = (e.a.z > e.b.z || (e.a.z === e.b.z && dist[e.a.i] >= dist[e.b.i])) ? e.a : e.b, lo = hi === e.a ? e.b : e.a, d0 = Math.min(3, L * 0.25), k = d0 / L;
        const h = {id: nid(), x: r3(hi.x + (lo.x - hi.x) * k), y: r3(hi.y + (lo.y - hi.y) * k), ct: r3(hi.z + (lo.z - hi.z) * k)}; nos.push(h); de = h.id; para = lo.id; L -= d0;
      }
      trechos.push({id: 't' + (++tq), de, para, rua: e.rua, L: r3(L), lados: 2});
    });
    saidas.forEach(s => { const n = nos.find(q => q.id === s.id); if (n) n.saida = true; });
    P.nos = nos; P.trechos = trechos; P.seq = seq + tq + 10;
    return {avisos, nos: nos.length, trechos: trechos.length};
  }

  /* exemplo: bairro em malha, terreno caindo para um canto */
  function exemplo(nx, ny, quadra, decl) {
    nx = nx || 4; ny = ny || 3; quadra = quadra || 90; decl = decl || 0.012;
    const z = (x, y) => r3(25 - x * decl - y * decl * 0.6 + 0.35 * Math.sin(x / 70) * Math.cos(y / 55));
    const ruas = [], W = (nx - 1) * quadra, H = (ny - 1) * quadra; let k = 0;
    const pts = (x1, y1, x2, y2, n) => Array.from({length: n + 1}, (_, i) => { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; return {x, y, z: z(x, y)}; });
    for (let j = 0; j < ny; j++) ruas.push({id: 'r' + (++k), nome: 'Rua ' + (j + 1), pts: pts(0, j * quadra, W, j * quadra, nx - 1)});
    for (let i = 0; i < nx; i++) ruas.push({id: 'r' + (++k), nome: 'Rua ' + String.fromCharCode(65 + i), pts: pts(i * quadra, 0, i * quadra, H, ny - 1)});
    return {v: 1, nome: 'Exemplo — bairro ' + nx + ' × ' + ny + ' ruas', local: '', autor: '', crit: Object.assign({}, CRIT0), ruas, topo: [], saida: {x: W, y: H}, nos: [], trechos: [], orc: {}};
  }
  const novo = () => ({v: 1, nome: 'Projeto sem nome', local: '', autor: '', crit: Object.assign({}, CRIT0), ruas: [], topo: [], saida: null, nos: [], trechos: [], orc: {}});

  return {G, GAMA, SERIE, CRIT0, crit, matDe, geo, qMan, lamina, hid, iMinTau, iMaxV, calc, geometria, quant, itens, SOL, GRUPOS, sugerirEEE, tuboGeo, TUBOS, RECALQUE, eeeCalc, gerar, exemplo, novo, nomeNo, idw, r3, ff};
})();
if (typeof module !== 'undefined') module.exports = ESG;
