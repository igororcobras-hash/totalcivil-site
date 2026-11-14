const E=require('./10-core.js');
// 1) rede em terreno plano e longa: fica funda -> sugerir elevatória
const P=E.exemplo(8,2,100,0.0002); P.crit.profMax=3.5; E.gerar(P);
let R=E.calc(P); console.log('antes: profMax',R.profMaxima.toFixed(2),'warn',R.nWarn,'err',R.nErr);
const s=E.sugerirEEE(P); console.log('sugestões',s.lista.map(x=>x.motivo+' -> '+x.e.no+'>'+(x.e.ate||'ext')));
R=E.calc(P); console.log('depois: profMax',R.profMaxima.toFixed(2),'warn',R.nWarn,'err',R.nErr);
Object.values(R.eee).forEach(e=>console.log(e.nome,'Qb',e.Qb.toFixed(2),'L/s DN',e.dn,'V',e.V.toFixed(2),'Lr',e.Lr.toFixed(0),'Hg',e.Hg.toFixed(2),'hf',e.hf.toFixed(2),'AMT',e.AMT.toFixed(2),'P',e.Pcv.toFixed(2),'cv motor',e.Pm,'Vu',e.Vu.toFixed(2),'Dp',e.Dp,'hu',e.hu.toFixed(2),'td',e.td.toFixed(1),'golpe',e.dHa.toFixed(0),'fundo',e.fundo.toFixed(2),'prof',e.profP.toFixed(2)));
console.log(R.checks.filter(k=>k.st!=='info').map(k=>k.st+' '+k.onde+': '+k.msg.slice(0,110)));
// conservação: Q no fim = soma contribuições
const soma=R.ordem.reduce((a,id)=>a+R.tr[id].cF,0); console.log('conservação',soma.toFixed(4),R.Qfim.toFixed(4));
// trechos de recalque e depois deles: cotas
R.ordem.forEach(id=>{const r=R.tr[id]; if(r.recq) console.log('recalque',r.nome,'DN',r.D,'L',r.L.toFixed(1),'V',r.hF.V.toFixed(2));});
const Q=E.quant(P,R); console.log('recalque',Q.recalque,'eee',Q.eee.map(e=>[e.conc.toFixed(1),e.esc.toFixed(1)]));
console.log(E.itens(P,R,Q).filter(i=>/eleva|Sif/.test(i.g)).map(i=>i.k+' '+i.un+' '+i.q.toFixed(2)+' '+JSON.stringify(i.cod)).join('\n'));
// 2) sifão num trecho
const P2=E.exemplo(4,3); E.gerar(P2); let R2=E.calc(P2); const tid=R2.coletores[0].trechos[3]; const t=P2.trechos.find(x=>x.id===tid); t.sif={n:2,cota:null};
R2=E.calc(P2); const r=R2.tr[tid]; console.log('sifão',r.nome,'DN',r.D,'linhas',r.sif.n,'Vi',r.sif.Vi.toFixed(2),'Vf',r.sif.Vf.toFixed(2),'dH',r.sif.dH.toFixed(3),'ciM',r.ciM,'ciJ',r.ciJ,'fundo',r.sif.fundo.toFixed(2),'obst',r.sif.obst.toFixed(2),'err',R2.nErr,'warn',R2.nWarn);
console.log(R2.checks.filter(k=>k.st!=='info').map(k=>k.msg.slice(0,120)));
const Q2=E.quant(P2,R2); console.log(Q2.sifao);
// 3) fuzz com elevatória e sifão: nada de NaN, conservação
let seed=11; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648; return seed/2147483648;}; let nan=0,cons=0,n=0,ee=0,errs={};
for(let k=0;k<150;k++){ const Pk=E.exemplo(2+Math.floor(rnd()*6),2+Math.floor(rnd()*3),50+rnd()*120,[0,0.0003,0.002,0.02][k%4]); Pk.crit.profMax=3+rnd()*2; Pk.crit.popF=1000+rnd()*40000; Pk.crit.popI=Pk.crit.popF*0.6; if(k%3===0) Pk.crit.mat='pvcc'; E.gerar(Pk);
  if(k%2) { const tt=Pk.trechos[Math.floor(rnd()*Pk.trechos.length)]; tt.sif={n:1+Math.floor(rnd()*2)}; }
  if(k%5===0) Pk.trechos.forEach((t,i)=>{ if(i%3===0) t.loc='passeio'; });
  E.sugerirEEE(Pk); const Rk=E.calc(Pk); if(!Rk.ok){errs[Rk.erros[0]]=1;continue;} n++; ee+=Object.keys(Rk.eee).length;
  const Qk=E.quant(Pk,Rk), L=E.itens(Pk,Rk,Qk); if(L.some(i=>!isFinite(i.q)||i.q<0)) nan++;
  if(JSON.stringify([Rk.tr,Rk.eee]).includes('null')) nan++;
  const so=Rk.ordem.reduce((a,id)=>a+Rk.tr[id].cF,0); if(Math.abs(so-Rk.Qfim)>1e-6) cons++;
  Rk.checks.filter(c=>c.st==='err').forEach(c=>errs[c.cod]=(errs[c.cod]||0)+1);
}
console.log('fuzz EEE/sifão: redes',n,'elevatórias',ee,'NaN',nan,'conservação',cons,'erros por tipo',errs);
