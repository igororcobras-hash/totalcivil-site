// ES-04: lotes de esquina sem corredor. Para cada lote, um ponto 0,3 m além de cada divisa lateral (a meio fundo e perto da frente)
// tem de cair em outro lote ou na rua (alinhamento). Se cair no vazio entre lotes = corredor/servidão.
const E=require('./10-core.js');
let seed=11; const rnd=()=>{seed=(seed*1103515245+12345)%2147483648; return seed/2147483648;};
const dentro=(p,pl)=>{let c=false;for(let i=0,j=pl.length-1;i<pl.length;j=i++){const a=pl[i],b=pl[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const dSeg=(p,a,b)=>{const ex=b.x-a.x,ey=b.y-a.y,l2=ex*ex+ey*ey||1e-9;let u=((p[0]-a.x)*ex+(p[1]-a.y)*ey)/l2;u=Math.max(0,Math.min(1,u));return Math.hypot(a.x+u*ex-p[0],a.y+u*ey-p[1]);};
let tot=0,frestas=0,sobre=0,redes=0;
for(let k=0;k<60;k++){
  const nx=2+Math.floor(rnd()*4), ny=2+Math.floor(rnd()*3), q=60+rnd()*90; const P=E.exemplo(nx,ny,q,0.003); E.gerar(P); const R=E.calc(P); if(!R.ok) continue; redes++;
  const c=R.c, alin=c.largRua/2+c.largPas, L=E.ligacoes(P,R), nm=new Map(P.nos.map(n=>[n.id,n]));
  const xs=P.nos.map(n=>n.x),ys=P.nos.map(n=>n.y),bb=[Math.min(...xs)-alin,Math.max(...xs)+alin,Math.min(...ys)-alin,Math.max(...ys)+alin], fora=p=>p[0]<bb[0]||p[0]>bb[1]||p[1]<bb[2]||p[1]>bb[3];
  const naRua=p=>P.trechos.some(t=>{const a=nm.get(t.de),b=nm.get(t.para);return a&&b&&dSeg(p,a,b)<alin+0.05;});
  L.forEach(o=>{tot++; const l=o.lote; [[0,3],[1,2]].forEach(([i,j],s)=>{ const a=l[i],b=l[j], f=s?1:-1; [0.15,0.5].forEach(t=>{ const m=[a[0]+(b[0]-a[0])*t+o.nx*f*0.3,a[1]+(b[1]-a[1])*t+o.ny*f*0.3];
    if(L.some(x=>x!==o&&dentro(m,x.lote))||naRua(m)||fora(m)) return; if(t===0.15) frestas++; }); });
    const c0=[(l[0][0]+l[2][0])/2,(l[0][1]+l[2][1])/2]; if(L.some(x=>x!==o&&dentro(c0,x.lote))) sobre++; });
}
console.log('ES-04 esquinas: redes',redes,'lotes',tot,'frestas (corredor) entre lotes vizinhos',frestas,'lotes sobrepostos',sobre);
