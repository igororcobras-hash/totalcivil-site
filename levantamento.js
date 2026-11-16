/* levantamento.js — Total Civil. Importa levantamento planialtimétrico em PDF (AutoCAD plotado em vetor): acha pontos e bordas, lê as cotas (dígitos desenhados) e gera estacas com terreno esq./eixo/dir. e largura. Usa pdf.js (cdnjs) só no navegador. */
/* Levantamento planialtimétrico em PDF → estacas (Total Civil). Funciona no navegador e no Node. */
(function(root){
'use strict';
const Lev={};
/* ---------- 1. Leitura dos vetores do PDF (pdf.js) ---------- */
Lev.lerPDF=async function(pdfjsLib,data,pagina){
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(data),useSystemFonts:false}).promise;
  const pg=await pdf.getPage(pagina||1);
  const vp=pg.getViewport({scale:1}); const T=vp.transform; // coordenadas finais da página (já com rotação)
  const OPS=pdfjsLib.OPS, ol=await pg.getOperatorList();
  const mul=(m,n)=>[m[0]*n[0]+m[2]*n[1], m[1]*n[0]+m[3]*n[1], m[0]*n[2]+m[2]*n[3], m[1]*n[2]+m[3]*n[3], m[0]*n[4]+m[2]*n[5]+m[4], m[1]*n[4]+m[3]*n[5]+m[5]];
  let ctm=[1,0,0,1,0,0], pilha=[], cor='0,0,0', larg=1, corPilha=[];
  const tracos=[]; // {cor,larg,segs:[[x1,y1,x2,y2]]}
  const ap=(x,y,m)=>{ const q=[m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]]; return [T[0]*q[0]+T[2]*q[1]+T[4], T[1]*q[0]+T[3]*q[1]+T[5]]; };
  let atual=null; // caminho em construção (lista de segmentos) até o stroke
  const hex=(a)=>a.map(v=>Math.round(v)).join(',');
  const fa=ol.fnArray, aa=ol.argsArray;
  for(let i=0;i<fa.length;i++){
    const f=fa[i], a=aa[i];
    if(f===OPS.save){ pilha.push([ctm.slice(),cor,larg]); }
    else if(f===OPS.restore){ const s=pilha.pop(); if(s){ ctm=s[0]; cor=s[1]; larg=s[2]; } }
    else if(f===OPS.transform){ ctm=mul(ctm,a); }
    else if(f===OPS.setLineWidth){ larg=a[0]; }
    else if(f===OPS.setStrokeRGBColor){ cor=hex([a[0],a[1],a[2]]); }
    else if(f===OPS.setStrokeColor||f===OPS.setStrokeColorN||f===OPS.setStrokeGray){ if(a.length===1) cor=hex([a[0]*255,a[0]*255,a[0]*255]); else if(a.length>=3) cor=hex([a[0]*255,a[1]*255,a[2]*255]); }
    else if(f===OPS.constructPath){
      const ops=a[0], co=a[1]; let k=0, cx=0, cy=0, sx=0, sy=0; const segs=[];
      for(const o of ops){
        if(o===OPS.moveTo){ cx=co[k++]; cy=co[k++]; sx=cx; sy=cy; }
        else if(o===OPS.lineTo){ const x=co[k++], y=co[k++]; const p=ap(cx,cy,ctm), q=ap(x,y,ctm); segs.push([p[0],p[1],q[0],q[1]]); cx=x; cy=y; }
        else if(o===OPS.curveTo){ const x1=co[k++],y1=co[k++],x2=co[k++],y2=co[k++],x3=co[k++],y3=co[k++]; let px=cx,py=cy; for(let t=1;t<=6;t++){ const u=t/6, b=(c0,c1,c2,c3)=>(1-u)**3*c0+3*(1-u)**2*u*c1+3*(1-u)*u*u*c2+u**3*c3; const nx=b(cx,x1,x2,x3), ny=b(cy,y1,y2,y3); const p=ap(px,py,ctm), q=ap(nx,ny,ctm); segs.push([p[0],p[1],q[0],q[1]]); px=nx; py=ny; } cx=x3; cy=y3; }
        else if(o===OPS.curveTo2){ const x2=co[k++],y2=co[k++],x3=co[k++],y3=co[k++]; const p=ap(cx,cy,ctm), q=ap(x3,y3,ctm); segs.push([p[0],p[1],q[0],q[1]]); cx=x3; cy=y3; }
        else if(o===OPS.curveTo3){ const x1=co[k++],y1=co[k++],x3=co[k++],y3=co[k++]; const p=ap(cx,cy,ctm), q=ap(x3,y3,ctm); segs.push([p[0],p[1],q[0],q[1]]); cx=x3; cy=y3; }
        else if(o===OPS.closePath){ if(cx!==sx||cy!==sy){ const p=ap(cx,cy,ctm), q=ap(sx,sy,ctm); segs.push([p[0],p[1],q[0],q[1]]); cx=sx; cy=sy; } }
        else if(o===OPS.rectangle){ const x=co[k++],y=co[k++],w=co[k++],h=co[k++]; const c=[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]].map(q=>ap(q[0],q[1],ctm)); for(let j=0;j<4;j++) segs.push([c[j][0],c[j][1],c[j+1][0],c[j+1][1]]); }
      }
      atual=(atual||[]).concat(segs);
    }
    else if(f===OPS.stroke||f===OPS.closeStroke){ if(atual&&atual.length) tracos.push({cor,larg,segs:atual}); atual=null; }
    else if(f===OPS.fill||f===OPS.eoFill||f===OPS.fillStroke||f===OPS.endPath||f===OPS.eoFillStroke||f===OPS.closeFillStroke){ atual=null; }
  }
  return {largura:vp.width,altura:vp.height,tracos};
};

/* ---------- 2. Pontos, bordas e rótulos ---------- */
const bbox=(segs)=>{ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const s of segs){ x0=Math.min(x0,s[0],s[2]); x1=Math.max(x1,s[0],s[2]); y0=Math.min(y0,s[1],s[3]); y1=Math.max(y1,s[1],s[3]); } return {x0,y0,x1,y1}; };
const escuro=(c)=>{ const p=c.split(',').map(Number); return p[0]<90&&p[1]<90&&p[2]<90; };
Lev.analisar=function(raw){
  const pontos=[], polis=[], glifos=[];
  raw.tracos.forEach(t=>{
    const b=bbox(t.segs), w=b.x1-b.x0, h=b.y1-b.y0;
    if(t.larg<0.01 && w<0.01 && h<0.01){ pontos.push({x:b.x0,y:b.y0}); return; }
    if(escuro(t.cor) && w<12 && h<12){ if(t.segs.length>=10 && w>1.3 && w<1.9 && h>1.3 && h<1.9) return; /* círculo do marcador do ponto */ glifos.push({segs:t.segs,b}); return; }
    if(t.segs.length>=8 && !escuro(t.cor)){ polis.push({cor:t.cor,segs:t.segs,b}); }
  });
  return {pontos,polis,glifos,largura:raw.largura,altura:raw.altura};
};
/* agrupa glifos em rótulos (linhas de texto) */
Lev.rotulos=function(glifos){
  const n=glifos.length, par=Array.from({length:n},(_,i)=>i), f=i=>{ while(par[i]!==i){ par[i]=par[par[i]]; i=par[i]; } return i; };
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=glifos[i].b, b=glifos[j].b;
    const gap=Math.max(a.x0-b.x1,b.x0-a.x1), yov=Math.min(a.y1,b.y1)-Math.max(a.y0,b.y0);
    if(gap<3 && yov>-0.3 && Math.abs(a.y1-b.y1)<3.2) par[f(i)]=f(j); }
  const g={}; for(let i=0;i<n;i++){ (g[f(i)]=g[f(i)]||[]).push(i); }
  return Object.values(g).map(ids=>{ const segs=[]; ids.forEach(i=>glifos[i].segs.forEach(s=>segs.push(s))); const b=bbox(segs); return {ids,segs,b,w:b.x1-b.x0,h:b.y1-b.y0}; });
};
/* separa um rótulo em caracteres pela projeção horizontal dos traços */
Lev.caracteres=function(rot){
  const segs=rot.segs.map(s=>({s,x0:Math.min(s[0],s[2]),x1:Math.max(s[0],s[2])})).sort((a,b)=>a.x0-b.x0);
  const grupos=[]; let cur=null;
  for(const e of segs){ if(cur&&e.x0<=cur.x1+0.12){ cur.segs.push(e.s); cur.x1=Math.max(cur.x1,e.x1); } else { cur={segs:[e.s],x0:e.x0,x1:e.x1}; grupos.push(cur); } }
  return grupos.map(g=>{ const b=bbox(g.segs); return {segs:g.segs,b}; });
};
/* nuvem de pontos normalizada de um caractere (altura do texto = 1) */
Lev.nuvem=function(ch,base,H){
  const pts=[]; for(const s of ch.segs){ const L=Math.hypot(s[2]-s[0],s[3]-s[1]), n=Math.max(1,Math.ceil(L/0.15)); for(let k=0;k<=n;k++){ const u=k/n; pts.push([(s[0]+(s[2]-s[0])*u-ch.b.x0)/H,(s[1]+(s[3]-s[1])*u-base)/H]); } }
  return pts;
};
Lev.distNuvem=function(A,B){
  const m=(P,Q)=>{ let t=0; for(const p of P){ let d=1e9; for(const q of Q){ const e=(p[0]-q[0])**2+(p[1]-q[1])**2; if(e<d) d=e; } if(d>t) t=d; } return Math.sqrt(t); };
  return Math.max(m(A,B),m(B,A));
};

/* ---------- 3. Leitura das cotas (reconhecimento de dígitos desenhados) ---------- */
Lev.FONTE=Lev.FONTE||[];
Lev.lerTexto=function(rot){
  const cs=Lev.caracteres(rot); if(!cs.length) return null;
  const alt=Math.max.apply(null,cs.map(c=>c.b.y1-c.b.y0)); if(!(alt>1)) return null;
  const base=Math.max.apply(null,cs.filter(c=>c.b.y1-c.b.y0>0.7*alt).map(c=>c.b.y1));
  let txt='', dmax=0;
  for(const c of cs){ const N=Lev.nuvem(c,base,alt); let melhor=null, dm=1e9;
    for(const t of Lev.FONTE){ if(Math.abs(t.w-(c.b.x1-c.b.x0)/alt)>0.2) continue; const d=Lev.distNuvem(N,t.p); if(d<dm){ dm=d; melhor=t.c; } }
    if(melhor!==null&&dm<0.16){ txt+=melhor; dmax=Math.max(dmax,dm); } else txt+='?'; }
  txt=txt.replace(/^[^0-9]+/,'').replace(/[^0-9]+$/,'');
  return {txt,dmax,alt};
};
/* lê todas as cotas e liga cada uma ao ponto mais próximo */
Lev.cotasDosPontos=function(A){
  const R=Lev.rotulos(A.glifos), lidos=[];
  R.forEach(r=>{ if(r.h<2||r.h>9||r.w<5||r.w>30) return; const t=Lev.lerTexto(r); if(!t) return; const m=/^(\d{1,4}),(\d{1,3})$/.exec(t.txt); if(!m) return; lidos.push({rot:r,valor:parseFloat(m[1]+'.'+m[2]),txt:t.txt,dmax:t.dmax}); });
  const pares=[]; A.pontos.forEach((p,pi)=>lidos.forEach((l,li)=>{ const b=l.rot.b; const dx=Math.max(b.x0-p.x,0,p.x-b.x1), dy=Math.max(b.y0-p.y,0,p.y-b.y1); pares.push({pi,li,d:Math.hypot(dx,dy)}); }));
  pares.sort((a,b)=>a.d-b.d); const pu=new Set(), lu=new Set(), res=A.pontos.map(p=>({x:p.x,y:p.y,z:null,txt:null,conf:0}));
  for(const q of pares){ if(q.d>12) break; if(pu.has(q.pi)||lu.has(q.li)) continue; pu.add(q.pi); lu.add(q.li); const l=lidos[q.li]; res[q.pi].z=l.valor; res[q.pi].txt=l.txt; res[q.pi].conf=1-Math.min(1,l.dmax/0.16); res[q.pi].dist=q.d; }
  return res;
};

/* ---------- 4. Eixo, estacas e cotas do terreno ---------- */
const dist2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
/* vértices em sequência de uma polilinha (segmentos consecutivos); inverte se preciso */
Lev.vertices=function(segs){
  // reordena por encadeamento de extremidades (tolerância 0.05)
  const rest=segs.map(s=>[[s[0],s[1]],[s[2],s[3]]]); const used=new Array(rest.length).fill(false); const chain=[rest[0][0],rest[0][1]]; used[0]=true;
  let achou=true; while(achou){ achou=false; for(let i=0;i<rest.length;i++){ if(used[i]) continue; const a=rest[i][0], b=rest[i][1], fim=chain[chain.length-1], ini=chain[0];
    if(dist2(a,fim)<0.05){ chain.push(b); used[i]=true; achou=true; } else if(dist2(b,fim)<0.05){ chain.push(a); used[i]=true; achou=true; } else if(dist2(b,ini)<0.05){ chain.unshift(a); used[i]=true; achou=true; } else if(dist2(a,ini)<0.05){ chain.unshift(b); used[i]=true; achou=true; } } }
  return chain.filter((p,i)=>i===0||dist2(p,chain[i-1])>1e-6);
};
const comp=(V)=>{ const c=[0]; for(let i=1;i<V.length;i++) c.push(c[i-1]+dist2(V[i],V[i-1])); return c; };
/* projeta ponto na polilinha: devolve {s (posição ao longo), d (distância), q (ponto)} */
const proj=(V,C,p)=>{ let best={d:1e18}; for(let i=0;i<V.length-1;i++){ const a=V[i], b=V[i+1], dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy; let t=l2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2:0; t=Math.max(0,Math.min(1,t)); const q=[a[0]+t*dx,a[1]+t*dy], d=dist2(p,q); if(d<best.d) best={d,s:C[i]+t*Math.sqrt(l2),q,i}; } return best; };
const noPonto=(V,C,s)=>{ s=Math.max(0,Math.min(C[C.length-1],s)); let i=0; while(i<C.length-2&&C[i+1]<s) i++; const t=(s-C[i])/((C[i+1]-C[i])||1); return [V[i][0]+(V[i+1][0]-V[i][0])*t, V[i][1]+(V[i+1][1]-V[i][1])*t]; };
const interpZ=(zs,s)=>{ if(!zs.length) return null; if(s<=zs[0].s) return zs[0].z; if(s>=zs[zs.length-1].s) return zs[zs.length-1].z; let i=0; while(zs[i+1].s<s) i++; const t=(s-zs[i].s)/((zs[i+1].s-zs[i].s)||1); return zs[i].z+(zs[i+1].z-zs[i].z)*t; };
/* escolhe as duas bordas: as polilinhas com mais pontos de cota */
Lev.bordas=function(A,P){
  const mk=(V)=>{ const C=comp(V); const pts=[]; P.forEach((q,qi)=>{ if(q.z==null) return; const r=proj(V,C,[q.x,q.y]); if(r.d<0.4) pts.push({s:r.s,z:q.z,qi}); }); pts.sort((a,b)=>a.s-b.s); return {V,C,pts}; };
  let pl=A.polis.map((p,id)=>Object.assign({id,cor:p.cor},mk(Lev.vertices(p.segs))));
  pl.sort((a,b)=>b.pts.length-a.pts.length);
  if(pl.length<2) return pl;
  let main=[pl[0],pl[1]]; const extras=pl.slice(2).filter(p=>p.pts.length>=2&&p.V.length>=3);
  extras.forEach(E=>{ // cola o trecho extra (ex.: lateral da rua que cruza) na borda que ele "fecha" melhor
    const ends=(p)=>[p.V[0],p.V[p.V.length-1]]; let best=null;
    main.forEach((M,mi)=>{ const O=main[1-mi]; ends(M).forEach((me,mj)=>{ [0,1].forEach(ej=>{ const ee=ends(E)[ej], eo=ends(E)[1-ej]; const d=dist2(me,ee); const d2=Math.min(...ends(O).map(o=>dist2(o,eo))); if(d<30&&d2<30){ const cost=d2*2+d; if(!best||cost<best.cost) best={mi,mj,ej,cost}; } }); }); });
    if(!best) return;
    const M=main[best.mi]; let VM=M.V.slice(), VE=E.V.slice();
    if(best.mj===0) VM.reverse(); // fim de M vira o ponto de ligação
    if(best.ej===1) VE.reverse(); // início de E é o ponto de ligação
    const V=VM.concat(VE); main[best.mi]=Object.assign({id:M.id,cor:M.cor},mk(V));
  });
  /* tira das bordas os trechos que entram na rua que cruza (ex.: Av. São João): vértice muito mais longe da
     borda oposta que a largura típica da rua sai, e a borda passa reto pela boca do cruzamento (alinhamento da via) */
  const limpa=(M,O)=>{ const d=M.V.map(v=>proj(O.V,O.C,v).d), s=d.slice().sort((a,b)=>a-b), med=s[Math.floor(s.length/2)]||0; if(!(med>0)) return M;
    const V=M.V.filter((v,i)=>d[i]<=med*1.3); if(V.length<2||V.length===M.V.length) return M; return Object.assign({id:M.id,cor:M.cor,cortado:M.V.length-V.length},mk(V)); };
  for(let it=0;it<2;it++){ main[0]=limpa(main[0],main[1]); main[1]=limpa(main[1],main[0]); }
  main.sort((a,b)=>b.C[b.C.length-1]-a.C[a.C.length-1]); // [0] = a mais longa
  return main;
};
/* monta a rua: opt={escala:1000, passo:20, inverter:false, bordaA:idx, bordaB:idx} */
Lev.montarRua=function(A,P,opt){
  opt=Object.assign({escala:1000,passo:20,inverter:false},opt||{});
  const k=0.0254/72*opt.escala; // metros por ponto do PDF
  const B=Lev.bordas(A,P); if(B.length<2) throw new Error('Não encontrei duas bordas da rua com cotas.');
  let R=B[0], L=B[1]; // R = a mais longa (amostrada); L = a outra, recortada ao trecho de R
  // recorta a borda mais longa (L) ao trecho entre os extremos mais próximos da outra (R)
  const extR=[R.V[0],R.V[R.V.length-1]]; const pe=extR.map(p=>proj(L.V,L.C,p).s); const sa=Math.min(pe[0],pe[1]), sb=Math.max(pe[0],pe[1]);
  // sub-polilinha de L entre sa e sb
  const Vl=[noPonto(L.V,L.C,sa)]; for(let i=0;i<L.V.length;i++) if(L.C[i]>sa+1e-6&&L.C[i]<sb-1e-6) Vl.push(L.V[i]); Vl.push(noPonto(L.V,L.C,sb));
  const Cl=comp(Vl); const zl=L.pts.map(p=>({s:p.s-sa,z:p.z})).filter(p=>p.s>=-0.5&&p.s<=sb-sa+0.5);
  const Vr=R.V, Cr=R.C, zr=R.pts.map(p=>({s:p.s,z:p.z}));
  // eixo: pontos médios entre R e o ponto mais próximo de L
  const ax=[]; const nR=Math.ceil(Cr[Cr.length-1]/0.5); for(let i=0;i<=nR;i++){ const p=noPonto(Vr,Cr,i*Cr[Cr.length-1]/nR); const q=proj(Vl,Cl,p).q; ax.push([(p[0]+q[0])/2,(p[1]+q[1])/2]); }
  let AX=ax.filter((p,i)=>i===0||dist2(p,ax[i-1])>1e-6); 
  // sentido: começa no extremo mais baixo
  const zIni=interpZ(zr,0), zFim=interpZ(zr,Cr[Cr.length-1]);
  let sentido=(zIni<=zFim)?1:-1; if(opt.inverter) sentido=-sentido; if(sentido<0) AX=AX.slice().reverse();
  const Ca=comp(AX), Ltot=Ca[Ca.length-1]*k;
  const estacas=[]; const rows=[];
  /* LEV-03: só cotas REAIS do levantamento. Cada lado usa a cota do ponto levantado mais próximo ao longo do eixo (dentro de
     raioCota); o eixo é a MÉDIA das cotas reais disponíveis; sem ponto real por perto a cota fica vazia (nada é interpolado). */
  const posNoEixo=pt=>{ const pr=proj(AX,Ca,pt); return pr.d>25?null:pr.s*k; };
  const realL=[], realR=[]; zl.forEach(q=>{ const m=posNoEixo(noPonto(Vl,Cl,q.s)); if(m!=null) realL.push({m,z:q.z}); }); zr.forEach(q=>{ const m=posNoEixo(noPonto(Vr,Cr,q.s)); if(m!=null) realR.push({m,z:q.z}); });
  const raioCota=opt.raioCota!=null?opt.raioCota:opt.passo/2;
  const maisPerto=(arr,m)=>{ let b=null,bd=1e9; arr.forEach(q=>{ const d=Math.abs(q.m-m); if(d<bd){bd=d;b=q;} }); return b&&bd<=raioCota?{z:b.z,d:bd}:null; };
  let posicoes=[]; for(let m=0;m<Ltot-1e-6;m+=opt.passo) posicoes.push({m,grade:true}); posicoes.push({m:Ltot,grade:false});
  if(opt.todosPontos!==false){
    const addP=(lado,pt,z)=>{ const pr=proj(AX,Ca,pt); if(pr.d>25) return; const m=pr.s*k; if(m<-0.3||m>Ltot+0.3) return; posicoes.push({m:Math.max(0,Math.min(Ltot,m)),grade:false,ov:{[lado]:z}}); };
    zl.forEach(q=>addP('L',noPonto(Vl,Cl,q.s),q.z)); zr.forEach(q=>addP('R',noPonto(Vr,Cr,q.s),q.z));
  }
  posicoes.sort((a,b)=>a.m-b.m);
  { const f=[]; posicoes.forEach(p=>{ const u=f[f.length-1]; if(u&&Math.abs(p.m-u.m)<0.4){ if(p.grade&&!u.grade){ u.m=p.m; u.grade=true; } u.ov=Object.assign({},u.ov,p.ov); } else f.push(Object.assign({},p)); }); posicoes=f; }
  posicoes.forEach(pp=>{ const m=pp.m;
    const s=m/k, a=noPonto(AX,Ca,s), a1=noPonto(AX,Ca,s-1.5), a2=noPonto(AX,Ca,s+1.5); let tx=a2[0]-a1[0], ty=a2[1]-a1[1]; const tl=Math.hypot(tx,ty)||1; tx/=tl; ty/=tl;
    const nx=ty, ny=-tx; // normal para a esquerda (y para baixo)
    // pontos das bordas mais próximos do eixo (vale também no cruzamento, onde a normal pegaria a parede do outro lado)
    const pL=proj(Vl,Cl,a), pR=proj(Vr,Cr,a); const eL={s:pL.s,q:pL.q,d:pL.d}, eR={s:pR.s,q:pR.q,d:pR.d};
    const esqEhL=((pL.q[0]-a[0])*nx+(pL.q[1]-a[1])*ny)>0;
    const nl=maisPerto(realL,m), nr=maisPerto(realR,m); const zL=nl?nl.z:null, zR=nr?nr.z:null; const larg=dist2(eL.q,eR.q)*k;
    const zEsq=esqEhL?zL:zR, zDir=esqEhL?zR:zL, dEsq=esqEhL?(nl&&nl.d):(nr&&nr.d), dDir=esqEhL?(nr&&nr.d):(nl&&nl.d);
    const nz=[zL,zR].filter(v=>v!=null), eixo=nz.length?nz.reduce((a,b)=>a+b,0)/nz.length:null;
    const r3=v=>v==null?null:+v.toFixed(3);
    rows.push({est:+m.toFixed(3), tEsq:r3(zEsq), tEixo:r3(eixo), tDir:r3(zDir), larg:+larg.toFixed(2), exata:!!pp.ov, fonte:nz.length===2?'media':nz.length===1?'um lado':'sem cota', dEsq:dEsq==null?null:+dEsq.toFixed(1), dDir:dDir==null?null:+dDir.toFixed(1), qE:esqEhL?eL.q:eR.q, qD:esqEhL?eR.q:eL.q, ax:a});
  });
  return {rows,comprimento:Ltot,escalaMporPt:k,bordas:{L:{id:L.id,n:L.pts.length},R:{id:R.id,n:R.pts.length}},extra:{axPts:AX}};
};
Lev.FONTE=[{"c":",","w":0.094,"h":0.313,"p":[[0.031,0],[0.016,-0.016],[0,-0.031],[0,-0.031],[0.016,-0.062],[0.031,-0.094],[0.031,0.156],[0.016,0.188],[0,0.219],[0.094,-0.031],[0.063,-0.016],[0.031,0],[0.031,-0.094],[0.052,-0.073],[0.073,-0.052],[0.094,-0.031],[0.094,0.063],[0.073,0.094],[0.052,0.125],[0.031,0.156],[0.094,-0.031],[0.094,0],[0.094,0.031],[0.094,0.063]]},{"c":"3","w":0.576,"h":1,"p":[[0.03,-0.091],[0,-0.182],[0.03,-0.091],[0.135,-1],[0.247,-1],[0.359,-1],[0.471,-1],[0.212,0],[0.121,-0.036],[0.333,0],[0.242,0],[0.524,-0.97],[0.462,-0.879],[0.399,-0.788],[0.336,-0.697],[0.273,-0.606],[0.333,-0.606],[0.424,-0.606],[0.394,-0.03],[0.424,-0.606],[0.515,-0.576],[0.5,-0.106],[0.515,-0.576],[0.545,-0.515],[0.568,-0.424],[0.568,-0.242],[0.545,-0.152],[0.576,-0.333]]},{"c":"1","w":0.219,"h":1,"p":[[0,-0.812],[0.021,-0.833],[0.042,-0.854],[0.063,-0.875],[0.063,-0.875],[0.089,-0.896],[0.115,-0.917],[0.141,-0.937],[0.167,-0.958],[0.193,-0.979],[0.219,-1],[0.219,-1],[0.219,-0.962],[0.219,-0.923],[0.219,-0.885],[0.219,-0.846],[0.219,-0.808],[0.219,-0.769],[0.219,-0.731],[0.219,-0.692],[0.219,-0.654],[0.219,-0.615],[0.219,-0.577],[0.219,-0.538],[0.219,-0.5],[0.219,-0.462],[0.219,-0.423],[0.219,-0.385],[0.219,-0.346],[0.219,-0.308],[0.219,-0.269],[0.219,-0.231],[0.219,-0.192],[0.219,-0.154],[0.219,-0.115],[0.219,-0.077],[0.219,-0.038],[0.219,0]]},{"c":"5","w":0.625,"h":1,"p":[[0.031,-0.094],[0,-0.188],[0.082,-0.926],[0.065,-0.815],[0.048,-0.705],[0.031,-0.594],[0.094,-0.625],[0.052,-0.073],[0.495,-1],[0.385,-1],[0.276,-1],[0.167,-1],[0.094,-0.625],[0.187,-0.672],[0.187,-0.008],[0.094,-0.031],[0.281,-0.688],[0.344,0],[0.25,0],[0.375,-0.675],[0.469,-0.638],[0.469,-0.025],[0.375,-0.006],[0.521,-0.594],[0.563,-0.156],[0.516,-0.063],[0.575,-0.5],[0.612,-0.406],[0.609,-0.25],[0.563,-0.156],[0.625,-0.312]]},{"c":"6","w":0.594,"h":1,"p":[[0.031,-0.813],[0.013,-0.67],[0,-0.563],[0,-0.417],[0.005,-0.307],[0.026,-0.161],[0.016,-0.406],[0.106,-0.937],[0.031,-0.813],[0.102,-0.055],[0.078,-0.516],[0.25,-0.994],[0.125,-0.969],[0.219,-0.013],[0.25,-0.613],[0.125,-0.563],[0.281,-1],[0.281,-0.625],[0.406,-0.019],[0.438,-0.575],[0.313,-0.625],[0.406,-0.992],[0.516,-0.078],[0.539,-0.492],[0.562,-0.875],[0.562,-0.125],[0.587,-0.25],[0.578,-0.406],[0.594,-0.313]]},{"c":"4","w":0.636,"h":1,"p":[[0.424,-1],[0.384,-0.937],[0.343,-0.873],[0.303,-0.81],[0.263,-0.746],[0.222,-0.683],[0.182,-0.619],[0.141,-0.556],[0.101,-0.492],[0.061,-0.429],[0.02,-0.365],[0,-0.333],[0.075,-0.333],[0.15,-0.333],[0.225,-0.333],[0.299,-0.333],[0.374,-0.333],[0.449,-0.333],[0.524,-0.333],[0.599,-0.333],[0.424,0],[0.424,-0.074],[0.424,-0.148],[0.424,-0.222],[0.424,-0.296],[0.424,-0.37],[0.424,-0.444],[0.424,-0.519],[0.424,-0.593],[0.424,-0.667],[0.424,-0.741],[0.424,-0.815],[0.424,-0.889],[0.424,-0.963]]},{"c":"2","w":0.656,"h":1,"p":[[0.469,-0.469],[0.414,-0.414],[0.358,-0.358],[0.303,-0.303],[0.248,-0.248],[0.193,-0.193],[0.138,-0.138],[0.083,-0.083],[0.028,-0.028],[0,0],[0.077,0],[0.154,0],[0.232,0],[0.309,0],[0.386,0],[0.463,0],[0.54,0],[0.618,0],[0.063,-0.75],[0.063,-0.812],[0.073,-0.844],[0.094,-0.906],[0.115,-0.927],[0.156,-0.969],[0.188,-0.979],[0.25,-1],[0.288,-1],[0.363,-1],[0.438,-1],[0.469,-0.99],[0.531,-0.969],[0.544,-0.594],[0.506,-0.531],[0.469,-0.469],[0.547,-0.937],[0.563,-0.906],[0.604,-0.844],[0.625,-0.719],[0.583,-0.656],[0.625,-0.812],[0.625,-0.75]]},{"c":"0","w":0.625,"h":1,"p":[[0.063,-0.812],[0.036,-0.705],[0.009,-0.598],[0,-0.531],[0,-0.437],[0.01,-0.37],[0.042,-0.26],[0.156,-0.969],[0.1,-0.875],[0.063,-0.188],[0.119,-0.094],[0.281,-1],[0.188,-0.977],[0.188,-0.023],[0.281,0],[0.344,0],[0.344,-1],[0.375,0],[0.469,-0.023],[0.469,-0.977],[0.375,-1],[0.537,-0.094],[0.594,-0.188],[0.556,-0.875],[0.5,-0.969],[0.604,-0.26],[0.62,-0.37],[0.621,-0.598],[0.607,-0.705],[0.594,-0.812],[0.625,-0.469],[0.625,-0.562]]},{"c":"8","w":0.656,"h":1,"p":[[0.063,-0.094],[0,-0.187],[0,-0.312],[0.042,-0.406],[0.073,-0.906],[0.063,-0.812],[0.073,-0.719],[0.078,-0.062],[0.109,-0.484],[0.219,-0.994],[0.094,-0.969],[0.188,-0.625],[0.156,-0.019],[0.188,-0.539],[0.188,-0.625],[0.313,-0.583],[0.4,0],[0.25,0],[0.325,-1],[0.313,-0.573],[0.438,-0.615],[0.438,-0.55],[0.563,-0.031],[0.438,0],[0.469,-0.992],[0.531,-0.646],[0.573,-0.469],[0.563,-0.031],[0.594,-0.75],[0.563,-0.969],[0.656,-0.344],[0.594,-0.094],[0.594,-0.844],[0.656,-0.281]]},{"c":"9","w":0.562,"h":1,"p":[[0.031,-0.531],[0.006,-0.656],[0,-0.719],[0.025,-0.844],[0.078,-0.484],[0.055,-0.898],[0.094,-0.031],[0.219,0],[0.094,-0.031],[0.156,-0.422],[0.188,-0.984],[0.281,0],[0.281,-0.375],[0.313,-1],[0.344,-0.391],[0.375,-0.984],[0.406,-0.023],[0.531,-0.531],[0.438,-0.438],[0.508,-0.898],[0.494,-0.125],[0.562,-0.688],[0.537,-0.563],[0.544,-0.8],[0.562,-0.438],[0.545,-0.295],[0.562,-0.688],[0.562,-0.545]]},{"c":"7","w":0.625,"h":1,"p":[[0,-1],[0.039,-1],[0.078,-1],[0.117,-1],[0.156,-1],[0.195,-1],[0.234,-1],[0.273,-1],[0.312,-1],[0.352,-1],[0.391,-1],[0.43,-1],[0.469,-1],[0.508,-1],[0.547,-1],[0.586,-1],[0.625,-1],[0.625,-1],[0.609,-0.964],[0.594,-0.929],[0.578,-0.893],[0.562,-0.857],[0.547,-0.821],[0.531,-0.786],[0.516,-0.75],[0.5,-0.714],[0.484,-0.679],[0.469,-0.643],[0.453,-0.607],[0.437,-0.571],[0.422,-0.536],[0.406,-0.5],[0.391,-0.464],[0.375,-0.429],[0.359,-0.393],[0.344,-0.357],[0.328,-0.321],[0.313,-0.286],[0.297,-0.25],[0.281,-0.214],[0.266,-0.179],[0.25,-0.143],[0.234,-0.107],[0.219,-0.071],[0.203,-0.036],[0.188,0]]},{"c":"2","w":0.576,"h":1,"p":[[0.394,-0.485],[0.348,-0.428],[0.301,-0.371],[0.255,-0.314],[0.209,-0.257],[0.162,-0.2],[0.116,-0.143],[0.07,-0.086],[0.023,-0.029],[0,0],[0.072,0],[0.144,0],[0.216,0],[0.288,0],[0.36,0],[0.432,0],[0.504,0],[0.576,0],[0.03,-0.788],[0.03,-0.818],[0.051,-0.879],[0.061,-0.909],[0.121,-0.939],[0.152,-0.96],[0.212,-1],[0.25,-1],[0.326,-1],[0.364,-1],[0.424,-0.96],[0.485,-0.606],[0.448,-0.558],[0.412,-0.509],[0.455,-0.939],[0.485,-0.909],[0.495,-0.879],[0.515,-0.818],[0.505,-0.667],[0.485,-0.606],[0.515,-0.788],[0.515,-0.727]]},{"c":",","w":0.093,"h":0.093,"p":[[0.056,-0.093],[0.037,-0.08],[0.019,-0.068],[0,-0.056],[0,-0.056],[0.014,-0.042],[0.028,-0.028],[0.042,-0.014],[0.056,0],[0.056,0],[0.068,-0.019],[0.08,-0.037],[0.093,-0.056],[0.093,-0.056],[0.08,-0.068],[0.068,-0.08],[0.056,-0.093]]}];
root.Lev=Lev;
if(typeof module!=='undefined') module.exports=Lev;
})(typeof window!=='undefined'?window:globalThis);

/* ---------- 5. Janela "Importar levantamento (PDF)" ---------- */
(function(){
'use strict';
const PDFJS_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let _pdfjs=null, E={};
function carregarPdfjs(){
  if(_pdfjs) return Promise.resolve(_pdfjs);
  if(window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER_URL; _pdfjs=window.pdfjsLib; return Promise.resolve(_pdfjs); }
  return new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=PDFJS_URL; s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=WORKER_URL; _pdfjs=window.pdfjsLib; ok(_pdfjs); }; s.onerror=()=>err(new Error('Não consegui carregar o leitor de PDF (sem internet?).')); document.head.appendChild(s); });
}
const css=`#lev-bg{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 8px}
#lev-box{background:#fff;color:#1e293b;border-radius:10px;max-width:980px;width:100%;padding:18px 20px;font:14px/1.4 system-ui,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3)}
#lev-box h2{margin:0 0 4px;font-size:18px;color:#1e3a5f} #lev-box p{margin:4px 0;font-size:12.5px;color:#475569}
#lev-box .lv-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:10px 0} #lev-box label{font-size:12px;color:#475569;display:flex;flex-direction:column;gap:2px}
#lev-box input[type=number]{width:90px;padding:5px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px}
#lev-box button{padding:7px 13px;border-radius:7px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer;font-size:13px} #lev-box button.lv-ok{background:#1d4ed8;color:#fff;border-color:#1d4ed8} #lev-box button:disabled{opacity:.5;cursor:default}
#lev-box .lv-aviso{background:#fef3c7;border:1px solid #f59e0b;color:#78350f;border-radius:6px;padding:6px 9px;margin:6px 0;font-size:12.5px} #lev-box .lv-info{background:#e0f2fe;border:1px solid #38bdf8;color:#0c4a6e;border-radius:6px;padding:6px 9px;margin:6px 0;font-size:12.5px}
#lev-box .lv-cols{display:grid;grid-template-columns:1.25fr 1fr;gap:12px} @media(max-width:760px){#lev-box .lv-cols{grid-template-columns:1fr}}
#lev-box table{border-collapse:collapse;width:100%;font-size:12px} #lev-box th,#lev-box td{border:1px solid #e2e8f0;padding:2px 5px;text-align:right} #lev-box th{background:#f1f5f9;position:sticky;top:0}
#lev-box .lv-sc{max-height:300px;overflow:auto;border:1px solid #e2e8f0;border-radius:6px} #lev-box .lv-z{width:62px;padding:1px 3px;font-size:12px;text-align:right} #lev-box .lv-zbad{background:#fee2e2}
#lev-box svg{width:100%;height:300px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px}`;
function rotEstaca(m,p){ p=p||20; const n=Math.floor(m/p+1e-9), r=m-n*p; return n+' + '+(Math.abs(r)<0.005?'0':r.toFixed(2).replace('.',','))+' m'; }
function fmt(v,n){ return v==null||isNaN(v)?'—':Number(v).toFixed(n).replace('.',','); }
function fechar(){ const b=document.getElementById('lev-bg'); if(b) b.remove(); E={}; }
function desenhar(){
  const R=E.rua, A=E.A; if(!R) return; const svg=document.getElementById('lev-svg'); let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const pts=[]; A.polis.forEach(p=>p.segs.forEach(s=>{ pts.push([s[0],s[1]],[s[2],s[3]]); }));
  R.rows.forEach(r=>{ pts.push(r.qE,r.qD); }); pts.forEach(p=>{ x0=Math.min(x0,p[0]); x1=Math.max(x1,p[0]); y0=Math.min(y0,p[1]); y1=Math.max(y1,p[1]); });
  const pad=14, w=x1-x0||1, h=y1-y0||1; const W=900,H=300, sc=Math.min((W-2*pad)/w,(H-2*pad)/h); const X=p=>(pad+(p[0]-x0)*sc).toFixed(1), Y=p=>(pad+(p[1]-y0)*sc).toFixed(1);
  let s='';
  A.polis.forEach(p=>{ s+='<polyline fill="none" stroke="#dc2626" stroke-width="1" points="'+Lev.vertices(p.segs).map(q=>X(q)+','+Y(q)).join(' ')+'"/>'; });
  s+='<polyline fill="none" stroke="#2563eb" stroke-width="1.5" points="'+R.extra.axPts.map(q=>X(q)+','+Y(q)).join(' ')+'"/>';
  R.rows.forEach(r=>{ s+='<line x1="'+X(r.qE)+'" y1="'+Y(r.qE)+'" x2="'+X(r.qD)+'" y2="'+Y(r.qD)+'" stroke="#0f766e" stroke-width="1.2"/>'; });
  E.P.forEach(p=>{ s+='<circle cx="'+X([p.x,p.y])+'" cy="'+Y([p.x,p.y])+'" r="2" fill="'+(p.z==null?'#f59e0b':'#111')+'"/>'; });
  svg.setAttribute('viewBox','0 0 '+W+' '+H); svg.innerHTML=s;
}
function recalcular(){
  if(!E.A) return; const g=id=>parseFloat(String(document.getElementById(id).value).replace(',','.'));
  const esc=g('lev-esc')||1000, passo=g('lev-passo')||20, todos=document.getElementById('lev-todos').checked; E.passo=passo; const inv=document.getElementById('lev-inv').checked, lf=g('lev-lf');
  const aviso=document.getElementById('lev-av'); aviso.innerHTML='';
  try{
    const R=Lev.montarRua(E.A,E.P,{escala:esc,passo:passo,inverter:inv,todosPontos:todos}); if(lf>0) R.rows.forEach(r=>{ r.larg=lf; }); E.rua=R;
    const sem=E.P.filter(p=>p.z==null).length; const av=[];
    if(sem) av.push(sem+' ponto(s) sem cota lida (em laranja no desenho): digite a cota na lista ao lado.');
    const larg=R.rows.map(r=>r.larg); const med=larg.slice().sort((a,b)=>a-b)[Math.floor(larg.length/2)]||0; const largas=R.rows.filter(r=>med&&r.larg>1.5*med); if(largas.length) av.push(largas.length+' estaca(s) com largura acima de 1,5× a mediana ('+fmt(med,2)+' m), maior '+fmt(Math.max.apply(null,largas.map(r=>r.larg)),2)+' m: normalmente é o cruzamento/boca de rua. Confira na tabela ou use “Largura fixa”.');
    if(larg.some(w=>w>12)) av.push('Há estaca com largura acima de 12 m (boca de cruzamento ou erro de leitura). Confira na tabela.');
    document.getElementById('lev-res').innerHTML='Eixo com <b>'+fmt(R.comprimento,2)+' m</b> na escala 1:'+esc+' · '+R.rows.length+' estacas ('+R.rows.filter(r=>r.exata).length+' nas cotas do levantamento, as demais de '+passo+' em '+passo+' m) · '+E.P.length+' pontos ('+(E.P.length-sem)+' com cota). Se você conhece o comprimento real, ajuste a escala até bater.';
    aviso.innerHTML=av.map(t=>'<div class="lv-aviso">⚠ '+t+'</div>').join('');
    const nSem=R.rows.filter(r=>r.tEixo==null).length;
    if(nSem) av.push(nSem+' estaca(s) de '+passo+' m sem nenhum ponto levantado por perto (a até '+(passo/2)+' m) ficam SEM cota e não serão importadas: o programa não inventa cota.');
    aviso.innerHTML=av.map(t=>'<div class="lv-aviso">⚠ '+t+'</div>').join('');
    document.getElementById('lev-tb').innerHTML=R.rows.map(r=>'<tr'+(r.exata?' style="background:#f0fdf4"':r.tEixo==null?' style="background:#fef2f2"':'')+'><td style="text-align:left">'+rotEstaca(r.est,E.passo)+'</td><td>'+fmt(r.est,2)+'</td><td>'+fmt(r.tEsq,3)+'</td><td>'+fmt(r.tEixo,3)+'</td><td>'+fmt(r.tDir,3)+'</td><td>'+fmt(r.larg,2)+'</td><td style="text-align:left;font-size:10px">'+r.fonte+(r.dEsq>0||r.dDir>0?' ('+(r.dEsq!=null?'esq. a '+fmt(r.dEsq,1)+' m':'')+(r.dEsq!=null&&r.dDir!=null?'; ':'')+(r.dDir!=null?'dir. a '+fmt(r.dDir,1)+' m':'')+')':'')+'</td></tr>').join('');
    document.getElementById('lev-aplicar').disabled=false; desenhar();
  }catch(e){ E.rua=null; document.getElementById('lev-res').textContent=''; aviso.innerHTML='<div class="lv-aviso">⚠ '+e.message+'</div>'; document.getElementById('lev-aplicar').disabled=true; }
}
function montarLista(){
  document.getElementById('lev-pts').innerHTML=E.P.map((p,i)=>'<tr><td>'+(i+1)+'</td><td><input class="lv-z'+(p.z==null?' lv-zbad':'')+'" data-i="'+i+'" value="'+(p.z==null?'':String(p.z).replace('.',','))+'"></td><td>'+(p.txt||'')+'</td></tr>').join('');
  document.querySelectorAll('#lev-pts input').forEach(inp=>inp.addEventListener('change',()=>{ const v=parseFloat(String(inp.value).replace(',','.')); E.P[+inp.dataset.i].z=isNaN(v)?null:v; inp.classList.toggle('lv-zbad',isNaN(v)); recalcular(); }));
}
async function ler(arq){
  const st=document.getElementById('lev-av'); st.innerHTML='<div class="lv-info">Lendo o PDF…</div>';
  try{
    const lib=await carregarPdfjs(); const buf=await arq.arrayBuffer(); const raw=await Lev.lerPDF(lib,buf,1);
    const A=Lev.analisar(raw); if(!A.pontos.length) throw new Error('Não achei pontos de levantamento neste PDF. Ele precisa ser exportado do AutoCAD/Topograph com pontos e bordas em vetor (não escaneado).');
    E.A=A; E.P=Lev.cotasDosPontos(A); document.getElementById('lev-cfg').style.display=''; montarLista(); recalcular();
  }catch(e){ st.innerHTML='<div class="lv-aviso">⚠ '+(e.message||e)+'</div>'; }
}
Lev.abrir=function(op){
  fechar(); E={op:op}; if(!document.getElementById('lev-css')){ const s=document.createElement('style'); s.id='lev-css'; s.textContent=css; document.head.appendChild(s); }
  const bg=document.createElement('div'); bg.id='lev-bg';
  bg.innerHTML='<div id="lev-box"><h2>📄 Importar levantamento planialtimétrico (PDF)</h2>'+
  '<p>Escolha o PDF do levantamento (com pontos e cotas de nível das bordas da rua). O programa acha o eixo, marca as estacas e preenche a Topografia'+(op&&op.destino?' '+op.destino:'')+'.</p>'+
  '<div class="lv-row"><input type="file" id="lev-arq" accept=".pdf,application/pdf"></div><div id="lev-av"></div>'+
  '<div id="lev-cfg" style="display:none"><div class="lv-row">'+
  '<label>Escala 1:<input type="number" id="lev-esc" value="1000" min="1" step="1"></label>'+
  '<label>Estaca a cada (m)<input type="number" id="lev-passo" value="20" min="1" step="1"></label>'+
  '<label>Largura fixa (m), opcional<input type="number" id="lev-lf" value="" min="0" step="0.1" placeholder="medida"></label>'+
  '<label style="flex-direction:row;align-items:center;gap:5px"><input type="checkbox" id="lev-inv"> Inverter sentido</label>'+
  '<label style="flex-direction:row;align-items:center;gap:5px"><input type="checkbox" id="lev-todos" checked> Usar todas as cotas do levantamento (estacas fracionadas, ex.: 1 + 5 m)</label></div>'+
  '<div id="lev-res" class="lv-info"></div><svg id="lev-svg"></svg>'+
  '<div class="lv-cols" style="margin-top:10px"><div><b style="font-size:13px">Estacas geradas</b><div class="lv-sc"><table><thead><tr><th>Estaca</th><th>Distância (m)</th><th>Terreno esq.</th><th>Terreno eixo</th><th>Terreno dir.</th><th>Largura (m)</th><th>Origem da cota</th></tr></thead><tbody id="lev-tb"></tbody></table></div></div>'+
  '<div><b style="font-size:13px">Pontos lidos (confira / corrija a cota)</b><div class="lv-sc"><table><thead><tr><th>#</th><th>Cota (m)</th><th>Lido</th></tr></thead><tbody id="lev-pts"></tbody></table></div></div></div>'+
  '<p>Só entram cotas REAIS do levantamento (nada é interpolado nem inventado): cada lado usa o ponto levantado mais próximo da estaca e a cota do eixo é a média das cotas reais disponíveis; sem ponto por perto a estaca fica sem cota e não é importada. Linhas em verde = estacas que coincidem com ponto do levantamento; em vermelho = sem cota real. A largura é a distância entre as bordas medida no desenho.</p></div>'+
  '<div class="lv-row" style="justify-content:flex-end"><button id="lev-cancel">Cancelar</button><button id="lev-aplicar" class="lv-ok" disabled>Aplicar na Topografia</button></div></div>';
  document.body.appendChild(bg);
  document.getElementById('lev-cancel').onclick=fechar;
  document.getElementById('lev-arq').onchange=e=>{ if(e.target.files[0]) ler(e.target.files[0]); };
  ['lev-esc','lev-passo','lev-lf','lev-inv','lev-todos'].forEach(id=>document.getElementById(id).addEventListener('change',recalcular));
  document.getElementById('lev-aplicar').onclick=()=>{ if(!E.rua) return; const rows=E.rua.rows.filter(r=>r.tEixo!=null).map(r=>({est:r.est,tEsq:r.tEsq==null?'':r.tEsq,tEixo:r.tEixo,tDir:r.tDir==null?'':r.tDir,larg:r.larg})); if(!rows.length){ alert('Nenhuma estaca com cota real.'); return; } const kk=E.rua.escalaMporPt, info={comprimento:E.rua.comprimento,pontos:E.P.length,eixo:(E.rua.extra&&E.rua.extra.axPts||[]).map(p=>[p[0]*kk,-p[1]*kk])}; /* eixo com as curvas, em metros, y para cima (norte do desenho) */ fechar(); if(op&&op.aplicar) op.aplicar(rows,info); };
};
})();
