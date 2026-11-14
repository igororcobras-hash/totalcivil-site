const E=require('./10-core.js');
let seed=7; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648; return seed/2147483648;};
let tot=0, viol={rec:0,tau:0,lam:0,v:0,dn:0,na:0,cota:0,erroCalc:0,checksErr:0}, tq=0, maxProf=0, piores=[];
for(let k=0;k<300;k++){
  const nx=2+Math.floor(rnd()*5), ny=2+Math.floor(rnd()*4), q=40+rnd()*160, decl=[0,0.0005,0.003,0.02,0.08,0.25][Math.floor(rnd()*6)];
  const P=E.exemplo(nx,ny,q,decl);
  // relevo irregular
  P.ruas.forEach(r=>r.pts.forEach(p=>{p.z=+(p.z+(rnd()-0.5)*[0,0.5,3][k%3]).toFixed(3)}));
  P.crit.popF=500+Math.floor(rnd()*80000); P.crit.popI=Math.floor(P.crit.popF*(0.3+rnd()*0.7));
  if(k%4==1){P.crit.norma='14486';P.crit.n=0.010;P.crit.tau=0.6;}
  if(k%5==2) P.saida={x:rnd()*q*(nx-1),y:rnd()*q*(ny-1)};
  const g=E.gerar(P); const R=E.calc(P); if(!R.ok){viol.erroCalc++; piores.push(R.erros[0]); continue;}
  const c=R.c;
  R.ordem.forEach(id=>{const r=R.tr[id]; tot++;
    if(Math.min(r.recM,r.recJ)<c.rec-0.0011) viol.rec++;
    if(r.hI.tau<r.tauMin-0.005) viol.tau++;
    if(r.hF.carga||r.hF.yd>r.lim+1e-6) viol.lam++;
    if(r.hF.V>c.vMax+0.01) viol.v++;
    R.ins[r.de].forEach(a=>{const u=R.tr[a.id]; if(u.D>r.D) viol.dn++; if(u.ciJ<r.ciM-1e-9) viol.cota++; if(u.ciJ+u.hF.y<r.ciM+r.hF.y-0.0011) viol.na++;});
  });
  Object.values(R.no).forEach(x=>{tq+=x.tq; maxProf=Math.max(maxProf,x.prof)});
  viol.checksErr+=R.checks.filter(k=>k.st==='err').length;
  // conservação da vazão
  const soma=R.ordem.reduce((s,id)=>s+R.tr[id].cF,0); if(Math.abs(soma-R.Qfim)>1e-6) piores.push('conservação '+soma+' '+R.Qfim);
}
console.log('trechos testados',tot,'violações',viol,'tubos de queda',tq,'prof máx',maxProf.toFixed(2),piores.slice(0,5));
/* ES-03: ligações prediais — 200 redes: nenhuma ligação com NaN, ramal ≥ 0,5 m, contagem = lotes, passeio muda ramal */
(function () { const E2 = require('./10-core.js'); let seed = 5; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; let n = 0, ruim = 0, tot = 0, pas = 0;
  for (let k = 0; k < 200; k++) { const P = E2.exemplo(2 + Math.floor(rnd() * 5), 2 + Math.floor(rnd() * 3), 60 + rnd() * 100, [0.001, 0.01, 0.03][k % 3], k % 4 === 0 ? 'morro' : undefined); P.crit.testada = 6 + Math.floor(rnd() * 20); E2.gerar(P);
    if (k % 3 === 0) P.trechos.forEach((t, i) => { if (i % 2) { t.loc = 'passeio'; t.ladoPas = rnd() < 0.5 ? -1 : 1; } });
    if (k % 5 === 0) P.trechos.forEach((t, i) => { if (i % 4 === 0) t.testada = 8 + Math.floor(rnd() * 14); });
    const R = E2.calc(P); if (!R.ok) continue; n++; const L = E2.ligacoes(P, R); tot += L.length;
    if (L.some(q => !isFinite(q.L) || !isFinite(q.x) || !isFinite(q.fx) || !isFinite(q.prof) || q.L < 0.5 - 1e-9 || q.s < 0 || q.s > R.tr[q.tr].L + 1e-6)) ruim++;
    const esp = R.ordem.reduce((a, id) => { const t = P.trechos.find(x => x.id === id), r = R.tr[id]; if (r.recq || r.sif) return a; const l = t.lados == null ? 2 : +t.lados; if (!l) return a; const tst = t.testada > 0 ? +t.testada : P.crit.testada; return a + Math.max(1, Math.round(r.L / tst)) * l; }, 0);
    if (esp !== L.length) ruim++; const Q = E2.quant(P, R); if (!isFinite(Q.ramal) || Q.lig !== L.length) ruim++; }
  console.log('ES-03 ligações: redes', n, 'ligações', tot, 'ruins', ruim); })();
