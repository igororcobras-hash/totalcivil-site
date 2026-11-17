/* ══════════════════════════════════════════════════════════════════════
   ALINHAMENTO HORIZONTAL DO EIXO (tangentes retas + curvas circulares)
   ----------------------------------------------------------------------
   Os pontos levantados (meio de cada seção) são o TERRENO ATUAL e fazem zig-zag.
   O eixo do PROJETO é refeito como no traçado de estradas:
     1) os pontos são divididos em trechos quase retos (Douglas-Peucker);
     2) cada trecho vira uma TANGENTE (reta ajustada por mínimos quadrados);
     3) duas tangentes seguidas se encontram no PI; trechos com deflexão pequena
        (< defMin) viram uma tangente só;
     4) em cada PI entra uma CURVA CIRCULAR tangente às duas retas (PC → PT):
        raio pelo afastamento observado dos pontos no vértice (E = R·(sec Δ/2 − 1)),
        limitado para a tangente externa T = R·tan(Δ/2) caber entre os PIs vizinhos.
   As bordas da pista são as paralelas ao eixo a ± largura/2 (feito por quem desenha).
   Uso: Alinh.alinhar(pontos,{larg}) (larg = largura da pista: um trecho curto só vira reta se o eixo ficar a até larg/2 dos pontos)
   -> → {eixo, elem, curvas, L, proj(p)}.
   Funciona no navegador (global Alinh) e no Node (require).
══════════════════════════════════════════════════════════════════════ */
(function(raiz){
  const hyp=Math.hypot;
  function dp(P,a,b,tol,out){ /* Douglas-Peucker: índices dos vértices que ficam */
    let mx=-1,im=-1; const ax=P[a][0],ay=P[a][1],ex=P[b][0]-ax,ey=P[b][1]-ay,l=hyp(ex,ey)||1e-9;
    for(let i=a+1;i<b;i++){ const d=Math.abs((P[i][0]-ax)*ey-(P[i][1]-ay)*ex)/l; if(d>mx){mx=d;im=i;} }
    if(mx>tol){ dp(P,a,im,tol,out); out.push(im); dp(P,im,b,tol,out); } }
  function ajusta(P,a,b){ /* reta por mínimos quadrados (componente principal) dos pontos a..b */
    let n=0,mx=0,my=0; for(let i=a;i<=b;i++){ mx+=P[i][0]; my+=P[i][1]; n++; } mx/=n; my/=n;
    let sxx=0,syy=0,sxy=0; for(let i=a;i<=b;i++){ const dx=P[i][0]-mx,dy=P[i][1]-my; sxx+=dx*dx; syy+=dy*dy; sxy+=dx*dy; }
    const th=0.5*Math.atan2(2*sxy,sxx-syy); let u=[Math.cos(th),Math.sin(th)];
    const f=[P[b][0]-P[a][0],P[b][1]-P[a][1]]; if(u[0]*f[0]+u[1]*f[1]<0) u=[-u[0],-u[1]]; /* no sentido das estacas */
    return {c:[mx,my],u}; }
  function cruza(A,B){ const den=A.u[0]*B.u[1]-A.u[1]*B.u[0]; if(Math.abs(den)<1e-9) return null;
    const t=((B.c[0]-A.c[0])*B.u[1]-(B.c[1]-A.c[1])*B.u[0])/den; return [A.c[0]+A.u[0]*t,A.c[1]+A.u[1]*t]; }
  const projR=(R,p)=>{ const t=(p[0]-R.c[0])*R.u[0]+(p[1]-R.c[1])*R.u[1]; return [R.c[0]+R.u[0]*t,R.c[1]+R.u[1]*t]; };
  const ang=(u,v)=>Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]);

  function alinhar(E,o){
    o=Object.assign({tol:3,defMin:6,tMin:60,rMin:12,rMax:3000,eMax:1.0,larg:0,passo:1},o||{});
    /* tira pontos repetidos */
    const P=[]; (E||[]).forEach(p=>{ const q=[+p[0],+p[1]]; const u=P[P.length-1]; if(!u||hyp(q[0]-u[0],q[1]-u[1])>0.05) P.push(q); });
    if(P.length<2) return null;
    let br=[0]; dp(P,0,P.length-1,o.tol,br); br.push(P.length-1); br.sort((a,b)=>a-b);
    const comp=(i,j)=>hyp(P[j][0]-P[i][0],P[j][1]-P[i][1]);
    /* trecho reto curto (< tMin) some, tirando o vértice ao lado dele, SÓ se a reta que sobra continuar a até "tol" dos pontos */
    const desvSpan=(a,b)=>{ const L=ajusta(P,a,b); let m=0; for(let i=a;i<=b;i++) m=Math.max(m,Math.abs((P[i][0]-L.c[0])*L.u[1]-(P[i][1]-L.c[1])*L.u[0])); return m; };
    const fica=new Set();
    for(let g=0;g<400&&br.length>2;g++){ let ik=-1,mn=1e18; for(let k=0;k<br.length-1;k++){ const c=comp(br[k],br[k+1]); if(c<o.tMin&&c<mn&&!fica.has(br[k]+'|'+br[k+1])){mn=c;ik=k;} } if(ik<0) break;
      const cand=[ik,ik+1].filter(k=>k>0&&k<br.length-1).map(k=>({k,d:desvSpan(br[k-1],br[k+1])})).filter(c=>c.d<=Math.max(o.tol,(+o.larg||0)*0.5)).sort((x,y)=>x.d-y.d);
      if(!cand.length){ fica.add(br[ik]+'|'+br[ik+1]); continue; }
      br.splice(cand[0].k,1); }
    /* tangentes e PIs; junta trechos com deflexão pequena ou PI fora do lugar */
    let ret, pis, mudou=true, guarda=0;
    while(mudou&&guarda++<50){
      mudou=false; ret=[]; for(let k=0;k<br.length-1;k++) ret.push(ajusta(P,br[k],br[k+1]));
      pis=[projR(ret[0],P[0])];
      for(let k=0;k<ret.length-1;k++){
        const d=Math.abs(ang(ret[k].u,ret[k+1].u))*180/Math.PI, X=cruza(ret[k],ret[k+1]);
        const v=P[br[k+1]], lim=Math.max(15,0.6*Math.min(hyp(P[br[k+1]][0]-P[br[k]][0],P[br[k+1]][1]-P[br[k]][1]),hyp(P[br[k+2]][0]-P[br[k+1]][0],P[br[k+2]][1]-P[br[k+1]][1])));
        if(d<o.defMin||!X||hyp(X[0]-v[0],X[1]-v[1])>lim){ br.splice(k+1,1); mudou=true; break; }
        pis.push(X);
      }
      if(!mudou) pis.push(projR(ret[ret.length-1],P[P.length-1]));
    }
    /* sentido das tangentes: o da linha PI → PI (garante a continuidade) */
    const tg=[]; for(let k=0;k<pis.length-1;k++){ const dx=pis[k+1][0]-pis[k][0],dy=pis[k+1][1]-pis[k][1],l=hyp(dx,dy)||1e-9; tg.push({a:pis[k],b:pis[k+1],u:[dx/l,dy/l],L:l}); }
    /* curvas em cada PI interno */
    const cv=[];
    for(let k=1;k<pis.length-1;k++){
      const u=tg[k-1].u, v=tg[k].u, D=Math.abs(ang(u,v)); if(D<1e-4){ cv.push(null); continue; }
      const t2=Math.tan(D/2), sec=1/Math.cos(D/2);
      /* afastamento observado: menor distância do PI aos pontos levantados (linha do zig-zag) */
      let Eo=1e18; for(let i=0;i<P.length-1;i++){ const ax=P[i][0],ay=P[i][1],ex=P[i+1][0]-ax,ey=P[i+1][1]-ay,l2=ex*ex+ey*ey||1e-12; let t=((pis[k][0]-ax)*ex+(pis[k][1]-ay)*ey)/l2; t=Math.max(0,Math.min(1,t)); Eo=Math.min(Eo,hyp(pis[k][0]-ax-ex*t,pis[k][1]-ay-ey*t)); }
      const Rfit=Eo/(sec-1);
      const Tlim=Math.min(tg[k-1].L*(k-1===0?0.95:0.5),tg[k].L*(k===pis.length-2?0.95:0.5));
      const Rlim=Tlim/t2;
      /* o maior raio que cabe entre os PIs e cuja curva passa a até eMax dos pontos (ou do afastamento observado) */
      const Rsuave=Math.max(Eo,o.eMax)/(sec-1);
      let R=Math.max(o.rMin,Math.min(o.rMax,Math.max(Rfit,Rsuave))); R=Math.min(R,Rlim);
      /* raio que mais se aproxima dos pontos levantados perto do vértice (entre os meios das tangentes vizinhas) */
      { const PI=pis[k], m0=[(pis[k-1][0]+PI[0])/2,(pis[k-1][1]+PI[1])/2], m1=[(pis[k+1][0]+PI[0])/2,(pis[k+1][1]+PI[1])/2];
        const loc=P.filter(p=>((p[0]-m0[0])*u[0]+(p[1]-m0[1])*u[1])>=0&&((p[0]-m1[0])*v[0]+(p[1]-m1[1])*v[1])<=0);
        const sg=Math.sign(ang(u,v));
        const dev=Rt=>{ const T=Rt*t2, PC=[PI[0]-u[0]*T,PI[1]-u[1]*T], n=[-u[1]*sg,u[0]*sg], C=[PC[0]+n[0]*Rt,PC[1]+n[1]*Rt], PT=[PI[0]+v[0]*T,PI[1]+v[1]*T];
          let mx=0; loc.forEach(p=>{ const a=(p[0]-PC[0])*u[0]+(p[1]-PC[1])*u[1], b=(p[0]-PT[0])*v[0]+(p[1]-PT[1])*v[1]; let d;
            if(a<=0) d=Math.abs((p[0]-PC[0])*n[0]+(p[1]-PC[1])*n[1]); else if(b>=0) d=Math.abs((p[0]-PT[0])*(-v[1]*sg)+(p[1]-PT[1])*(v[0]*sg)); else d=Math.abs(hyp(p[0]-C[0],p[1]-C[1])-Rt);
            mx=Math.max(mx,d); }); return mx; };
        if(loc.length>=2){ let best=null; const r0=Math.min(o.rMin,Rlim), r1=Math.min(o.rMax,Rlim); for(let i=0;i<=60;i++){ const Rt=r0*Math.pow(r1/r0,i/60); const d=dev(Rt); if(!best||d<best.d-0.05||(Math.abs(d-best.d)<=0.05&&Rt>best.R)) best={R:Rt,d}; } R=best.R; } }
      cv.push({k,R,D,T:R*t2,lado:Math.sign(ang(u,v))});
    }
    /* monta os elementos: reta, curva, reta, ... */
    const elem=[]; let ini=pis[0];
    for(let k=0;k<tg.length;k++){
      const cIn=k>0?cv[k-1]:null, cOut=k<cv.length?cv[k]:null, t=tg[k];
      const a=cIn?[t.a[0]+t.u[0]*cIn.T,t.a[1]+t.u[1]*cIn.T]:t.a, b=cOut?[t.b[0]-t.u[0]*cOut.T,t.b[1]-t.u[1]*cOut.T]:t.b;
      elem.push({tipo:'reta',a,b,u:t.u,L:hyp(b[0]-a[0],b[1]-a[1])});
      if(cOut){ const v=tg[k+1].u, PC=b, PT=[t.b[0]+v[0]*cOut.T,t.b[1]+v[1]*cOut.T], s=cOut.lado, n=[-t.u[1]*s,t.u[0]*s];
        const C=[PC[0]+n[0]*cOut.R,PC[1]+n[1]*cOut.R];
        elem.push({tipo:'curva',PC,PT,PI:t.b,C,R:cOut.R,D:cOut.D,T:cOut.T,lado:s,a0:Math.atan2(PC[1]-C[1],PC[0]-C[0]),L:cOut.R*cOut.D}); }
    }
    /* estacas ao longo do eixo e pontos a cada "passo" */
    let s=0; elem.forEach(e=>{ e.s0=s; s+=e.L; e.s1=s; }); const L=s;
    const pt=x=>{ x=Math.max(0,Math.min(L,x)); let e=elem[elem.length-1]; for(const q of elem) if(x<=q.s1+1e-9){ e=q; break; }
      const d=x-e.s0; if(e.tipo==='reta') return [e.a[0]+e.u[0]*d,e.a[1]+e.u[1]*d]; const a=e.a0+e.lado*d/e.R; return [e.C[0]+e.R*Math.cos(a),e.C[1]+e.R*Math.sin(a)]; };
    const eixo=[]; const n=Math.max(1,Math.ceil(L/o.passo)); for(let i=0;i<=n;i++) eixo.push(pt(L*i/n));
    /* projeção de um ponto: estaca e afastamento (+ esquerda) */
    function proj(p){ let best=1e18,r=null; for(let i=0;i<eixo.length-1;i++){ const ax=eixo[i][0],ay=eixo[i][1],ex=eixo[i+1][0]-ax,ey=eixo[i+1][1]-ay,l2=ex*ex+ey*ey||1e-12; let t=((p[0]-ax)*ex+(p[1]-ay)*ey)/l2;
        if(i>0) t=Math.max(0,t); if(i<eixo.length-2) t=Math.min(1,t); const qx=ax+ex*t,qy=ay+ey*t,dd=(p[0]-qx)**2+(p[1]-qy)**2;
        if(dd<best){ best=dd; const l=Math.sqrt(l2); r={s:L*(i+t)/n,off:((p[0]-ax)*(-ey)+(p[1]-ay)*ex)/l}; } } return r; }
    /* desvio dos pontos levantados em relação ao eixo do projeto */
    let dmx=0,dm=0; P.forEach(p=>{ const q=proj(p); dmx=Math.max(dmx,Math.abs(q.off)); dm+=Math.abs(q.off); });
    const curvas=elem.filter(e=>e.tipo==='curva').map(e=>({R:e.R,D:e.D*180/Math.PI,T:e.T,Lc:e.L,sPC:e.s0,sPT:e.s1,PI:e.PI,PC:e.PC,PT:e.PT,lado:e.lado>0?'esq':'dir'}));
    return {eixo,elem,curvas,L,proj,pt,desvMax:dmx,desvMed:dm/P.length,pis};
  }
  const API={alinhar};
  if(typeof module!=='undefined'&&module.exports) module.exports=API; else raiz.Alinh=API;
})(typeof window!=='undefined'?window:this);
