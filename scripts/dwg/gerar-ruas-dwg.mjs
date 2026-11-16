/* Gera projetos do Pavimento Flexível (um por rua) a partir de um DWG de levantamento (pontos com cota). Regra: nunca inventar cota. */
import {createRequire} from 'module'; import fs from 'fs'; import * as A from '@node-projects/acad-ts';
const D0=createRequire(import.meta.url)('/home/claude/totalcivil-site/dwg-leitor.js');
const [,, dwg, outDir, Warg]=process.argv; const W=parseFloat(Warg||'7');
const D=D0.lerBuffer(A,new Uint8Array(fs.readFileSync(dwg)).buffer);
console.log('xrefs ignorados:',D.xrefIgnorados);
const PAV=['Borda','ASFALTO','MF','Meio-fio','SARGETA','TN','indefinido'];      // superfície/borda da pista
const TUDO=PAV.concat(['MURO','Cal_da']);                                         // usado só para achar o limite da rua
const P=D.pontos.filter(p=>p.cota!=null&&p.confianca!=='baixa'&&TUDO.includes(p.camada));
console.log('pontos usados',P.length);
// faixas das ruas leste-oeste: histograma de y (2 m)
const h={};P.forEach(p=>{const k=Math.floor(p.y/2);h[k]=(h[k]||0)+1});
const ks=Object.keys(h).map(Number).sort((a,b)=>a-b);const bands=[];let cur=null;
for(const k of ks){ if(h[k]<10) continue; if(cur&&k-cur.k1<=3){cur.k1=k;cur.n+=h[k]} else {cur={k0:k,k1:k,n:h[k]};bands.push(cur)} }
const H=bands.filter(b=>b.n>=150).map(b=>({lo:b.k0*2-2,hi:b.k1*2+4}));
console.log('faixas leste-oeste:',H.map(b=>b.lo+'–'+b.hi).join(' | '));
const emH=p=>H.some(b=>p.y>=b.lo&&p.y<=b.hi);
const cluster=(arr,key,gap)=>{const s=arr.slice().sort((a,b)=>a[key]-b[key]);const out=[];let c=[];s.forEach(p=>{if(c.length&&p[key]-c[c.length-1][key]>gap){out.push(c);c=[]}c.push(p)});if(c.length)out.push(c);return out};
const lado=(pts,cx,cy,dir)=>pts; 
const secoes=(pts,eixo)=>{ // eixo: 'h' (rua leste-oeste) ou 'v' (norte-sul)
  const out=[];
  for(const c of cluster(pts,eixo==='h'?'x':'y',2.0)){
    if(c.length<3) continue;
    const t=eixo==='h'?c.map(p=>p.y):c.map(p=>p.x); const mn=Math.min(...t),mx=Math.max(...t),span=mx-mn;
    if(span<(eixo==='h'?12:6)||span>26) continue;
    const mid=(mn+mx)/2;
    const along=c.reduce((a,p)=>a+(eixo==='h'?p.x:p.y),0)/c.length;
    // deslocamento d: + = esquerda de quem anda no sentido das estacas (h: para leste → esquerda = norte (+y); v: para norte → esquerda = oeste (−x))
    const dd=p=>eixo==='h'?(p.y-mid):-(p.x-mid);
    const pv=c.filter(p=>PAV.includes(p.camada)).map(p=>({d:dd(p),z:p.cota,c:p.camada,n:p.nome,conf:p.confianca}));
    const perto=(alvo,tol)=>{let b=null,bd=tol;pv.forEach(q=>{const x=Math.abs(q.d-alvo);if(x<=bd){bd=x;b=q}});return b};
    const e=perto(W/2,2.0), dr=perto(-W/2,2.0), ce=perto(0,1.0);
    if(!e||!dr) continue;                                  // sem cota real nos dois lados: não entra (nada inventado)
    const tc=ce?ce.z:+((e.z+dr.z)/2).toFixed(3);
    out.push({along,cx:eixo==='h'?along:mid,cy:eixo==='h'?mid:along,te:e.z,td:dr.z,tc,fonteC:ce?'ponto no eixo':'média das bordas',dE:+(e.d-W/2).toFixed(2),dD:+(dr.d+W/2).toFixed(2),span:+span.toFixed(1),conf:[e.conf,dr.conf,ce&&ce.conf].every(x=>x==null||x==='alta')?'alta':'media',n:c.length,pv:pv.map(q=>+q.d.toFixed(1))});
  }
  return out;
};
const ruas=[];
H.forEach((b,i)=>{ const pts=P.filter(p=>p.y>=b.lo&&p.y<=b.hi); const s=secoes(pts,'h'); ruas.push({nome:`Rua L-${i+1} (leste-oeste, y≈${Math.round((b.lo+b.hi)/2)})`,tipo:'h',sec:s}); });
const V=P.filter(p=>!emH(p)&&p.x>206900&&p.x<209100);
cluster(V,'x',14).forEach((c,i)=>{ if(c.length<12) return; const x0=Math.round(c.reduce((a,p)=>a+p.x,0)/c.length); const s=secoes(c,'v'); if(s.length>=2) ruas.push({nome:`Rua T-${i+1} (norte-sul, x≈${x0})`,tipo:'v',sec:s}); });
console.log('ruas candidatas',ruas.length);
// estacas e relatório
const rel=[];
ruas.forEach(r=>{ r.sec.sort((a,b)=>a.along-b.along); let acc=0; r.sec.forEach((s,i)=>{ if(i) acc+=Math.hypot(s.cx-r.sec[i-1].cx,s.cy-r.sec[i-1].cy); s.est=+acc.toFixed(3) }); r.ext=acc; 
  const gaps=r.sec.slice(1).map((s,i)=>s.est-r.sec[i].est);
  console.log(r.nome.padEnd(46),'seções',String(r.sec.length).padStart(3),'extensão',acc.toFixed(0).padStart(5),'m  maior vão',Math.max(0,...gaps).toFixed(0),'m  largura(span) méd',(r.sec.reduce((a,s)=>a+s.span,0)/Math.max(1,r.sec.length)).toFixed(1)); });
const off=[];ruas.forEach(r=>r.sec.forEach(s=>off.push(...s.pv)));const oh={};off.forEach(v=>{const k=Math.round(v);oh[k]=(oh[k]||0)+1});console.log('offsets (m do eixo) dos pontos de pista:',Object.keys(oh).map(Number).sort((a,b)=>a-b).map(k=>k+':'+oh[k]).join(' '));
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(outDir+'/ruas.json',JSON.stringify({W,ruas},null,1));
