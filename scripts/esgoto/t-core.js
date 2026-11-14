const E=require('./10-core.js');
// 1) Imin x fórmula da norma (n=0,013, 1 Pa): 0,0055 Q^-0,47
for(const Q of [1.5,3,10,30]) for(const D of [150,200,300]){ const i=E.iMinTau(Q/1000,D/1000,0.013,1.0); console.log('Imin',Q,D,(i*100).toFixed(4)+'%','norma',(0.0055*Math.pow(Q,-0.47)*100).toFixed(4)+'%'); }
// 2) Imax x 4,65 Q^-0,67
for(const Q of [1.5,10,50]){ const i=E.iMaxV(Q/1000,0.2,0.013,5); console.log('Imax',Q,i.toFixed(4),'norma',(4.65*Math.pow(Q,-0.67)).toFixed(4)); }
// 3) seção plena: Q = (1/n) pi d²/4 (d/4)^(2/3) sqrt(I) ; meia seção = metade
const d=0.2,I=0.005,n=0.013; const Qp=Math.PI*d*d/4*Math.pow(d/4,2/3)*Math.sqrt(I)/n; console.log('meia seção',E.qMan(d,I,n,0.5).toFixed(6),(Qp/2).toFixed(6));
const h=E.hid(Qp/2,d,I,n); console.log('y/D',h.yd.toFixed(4),'V',h.V.toFixed(4),'V plena',(Qp/(Math.PI*d*d/4)).toFixed(4),'tau',h.tau.toFixed(3),'esperado',(9806.65*d/4*I).toFixed(3),'Vc',h.Vc.toFixed(3),(6*Math.sqrt(9.80665*0.05)).toFixed(3));
// 4) rede exemplo
const P=E.exemplo(); const g=E.gerar(P); console.log(g);
let t0=Date.now(); const R=E.calc(P); console.log('ms',Date.now()-t0,'erros',R.erros,'nErr',R.nErr,'nWarn',R.nWarn,'coletores',R.coletores.length,'Qfim',R.Qfim.toFixed(3),'QdF+inf',(R.vaz.QdF+R.vaz.inf).toFixed(3));
console.log(R.checks.slice(0,8));
for(const id of R.ordem.slice(0,400)){ const r=R.tr[id]; if(r.col<=2) console.log(r.nome,'L',r.L.toFixed(1),'QF',r.QF.toFixed(2),'DN',r.D,'I%',(r.I*100).toFixed(3),'Imin%',(r.Imin*100).toFixed(3),'ciM',r.ciM,'ciJ',r.ciJ,'pM',r.profM.toFixed(2),'pJ',r.profJ.toFixed(2),'y/D',r.hF.yd.toFixed(2),'tau',r.hI.tau.toFixed(2),'V',r.hF.V.toFixed(2)); }
// conservação: soma das contribuições = Qfim
let s=0; R.ordem.forEach(id=>s+=R.tr[id].cF); console.log('soma contrib',s.toFixed(4));
// cotas nunca sobem em PV; NA
let bad=0; R.ordem.forEach(id=>{const r=R.tr[id]; R.ins[r.de].forEach(a=>{const u=R.tr[a.id]; if(u.ciJ<r.ciM-1e-9) bad++; if(u.ciJ+u.hF.y < r.ciM+r.hF.y-0.001) bad++;});}); console.log('violações cota/NA',bad);
// cenário 3x com geometria fixa
const R3=E.calc(P,{fator:3,fixo:E.geometria(R)}); console.log('fator 3: err',R3.nErr,'warn',R3.nWarn, R3.checks.filter(k=>k.st=='err').slice(0,3));
const Q=E.quant(P,R); const it=E.itens(P,R,Q); console.log(it.length, it.map(i=>i.k+':'+i.q.toFixed(1)).join(' '));
// malha grande
const P2=E.exemplo(10,8,100,0.004); E.gerar(P2); t0=Date.now(); const R2=E.calc(P2); console.log('grande',P2.trechos.length,'trechos ms',Date.now()-t0,'err',R2.nErr,'warn',R2.nWarn,'profMax',R2.profMaxima.toFixed(2), R2.checks.filter(k=>k.st!='info').slice(0,3));
