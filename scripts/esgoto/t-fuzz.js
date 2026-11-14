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
