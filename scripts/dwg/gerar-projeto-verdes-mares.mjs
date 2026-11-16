import {createRequire} from 'module'; import fs from 'fs'; import * as A from '@node-projects/acad-ts';
const D0=createRequire(import.meta.url)('/home/claude/totalcivil-site/dwg-leitor.js');
const D=D0.lerBuffer(A,new Uint8Array(fs.readFileSync(process.argv[2])).buffer);
const camadas=['ASFALTO','MF','Meio-fio','SARGETA'];
const P=D.pontos.filter(p=>p.cota!=null&&p.confianca!=='baixa'&&p.x>203585&&p.x<203630&&p.y>7510240&&p.y<7510700&&camadas.includes(p.camada)).sort((a,b)=>a.y-b.y);
// seções = grupos por y (<=1.2 m) com pontos a esquerda e direita separados >=5 m
const sec=[];for(const p of P){const s=sec[sec.length-1];if(s&&p.y-s.y1<=1.2){s.p.push(p);s.y1=p.y}else sec.push({p:[p],y1:p.y})}
const out=[];
for(const s of sec){const xs=s.p.map(p=>p.x);const xmin=Math.min(...xs),xmax=Math.max(...xs);if(xmax-xmin<5)continue;
 const L=s.p.filter(p=>p.x<xmin+1.5),R=s.p.filter(p=>p.x>xmax-1.5),C=s.p.filter(p=>p.camada==='ASFALTO'&&p.x>=xmin+1.5&&p.x<=xmax-1.5);
 const asf=a=>a.filter(p=>p.camada==='ASFALTO');
 const lA=asf(L)[0],rA=asf(R)[0]; if(!lA||!rA)continue;
 const cx=(xmin+xmax)/2, cy=s.p.reduce((a,p)=>a+p.y,0)/s.p.length;
 const larg=Math.hypot(Math.max(...R.map(p=>p.x))-Math.min(...L.map(p=>p.x)),0);
 let tc,fonte; if(C.length){tc=C.reduce((a,p)=>a+p.cota,0)/C.length;fonte='ponto no eixo'}else{tc=(lA.cota+rA.cota)/2;fonte='média das bordas'}
 out.push({cx,cy,te:lA.cota,tc,td:rA.cota,larg:+(xmax-xmin).toFixed(2),fonte,conf:[...L,...R,...C].every(p=>p.confianca==='alta')?'alta':'media',pts:s.p.map(p=>p.nome)});
}
let acc=0;out.forEach((r,i)=>{if(i)acc+=Math.hypot(r.cx-out[i-1].cx,r.cy-out[i-1].cy);r.est=+acc.toFixed(3)});
console.log(out.length,'seções; extensão',acc.toFixed(1),'m');
out.forEach(r=>console.log(r.est.toFixed(2).padStart(7),r.cx.toFixed(1),r.cy.toFixed(1),'te',r.te,'tc',r.tc.toFixed(3),'td',r.td,'larg',r.larg,r.fonte,r.conf));
fs.writeFileSync('verdes_secoes.json',JSON.stringify(out));
