// ES-05: raio do meio-fio e do muro nas esquinas. Confere: tangência, raio do muro = raio do meio-fio − passeio, lote com canto em arco.
const E=require('./10-core.js');
let seed=5; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648; return seed/2147483648;};
let esq=0,erro=0,lotesArco=0,lotes=0,semArco=0;
for(let k=0;k<40;k++){
  const nx=2+Math.floor(rnd()*4), ny=2+Math.floor(rnd()*3), q=50+rnd()*90; const P=E.exemplo(nx,ny,q,0.003); E.gerar(P); P.crit=Object.assign(P.crit||{},{raioMF:[4,6,8,10][k%4]}); const R=E.calc(P); if(!R.ok) continue;
  const c=R.c, w=c.largRua/2, alin=w+c.largPas, EQ=E.esquinas(P,R);
  EQ.forEach(cn=>{ esq++;
    const dm=(p,r)=>Math.abs(Math.hypot(p[0]-cn.C[0],p[1]-cn.C[1])-r);
    // tangência: o centro está a R das duas guias
    const dist=(u,N)=>Math.abs((cn.C[0]-N[0])*(-u[1])+(cn.C[1]-N[1])*u[0]);
    const d1=dist(cn.a.u,cn.N), d2=dist(cn.b.u,cn.N);
    if(Math.abs(d1-(w+cn.R))>1e-6||Math.abs(d2-(w+cn.R))>1e-6) erro++;
    if(cn.Rm>0){ if(Math.abs(cn.Rm-(cn.R-c.largPas))>1e-9) erro++;
      const d3=dist(cn.a.u,cn.N); if(Math.abs(d3-(alin+cn.Rm))>1e-6) erro++;   // arco do muro tangente ao alinhamento
    }
    E.arco(cn,cn.R).forEach(p=>{ if(dm(p,cn.R)>1e-6) erro++; });
  });
  const L=E.ligacoes(P,R); L.forEach(o=>{lotes++; if(o.pol.length>4) lotesArco++;});
  const cantosM=EQ.filter(x=>x.Rm>0).length; // cada esquina com muro em arco deve aparecer em algum lote
  if(cantosM && !L.some(o=>o.pol.length>4)) semArco++;
}
console.log('ES-05 raios: esquinas',esq,'erros geométricos',erro,'lotes',lotes,'lotes com canto em arco',lotesArco,'redes com arco mas sem lote arredondado',semArco);
