/* dwg-importar.js — IMPORTAR DWG com escolha das camadas (DWG-07, 17/11/2026)
   Usa a biblioteca de leitura (tc-dwg.min.js, carregada só quando o usuário abre o DWG, como no DWG do Esgoto) e o dwg-leitor.js.
   Tela: lista TODAS as camadas do desenho; para cada uma o usuário marca
     ▢ Fundo da planta      → vira desenho de fundo (só linhas) na Planta e 3D;
     ▢ Eixo de rua          → cada linha/polilinha da camada vira UMA rua (estaca 0 no início da linha);
     ▢ Cotas (pontos reais) → pontos com cota usados para montar as seções (nada interpolado).
   Regras do dono: ignorar xref (já no dwg-leitor); nunca inventar cota; estaca 0 = início da rua; a rua vai até o cruzamento.
   Uso:  DwgImp.abrir({aplicar:(dados)=>{...}})   |   DwgImp.gerarRuas(D, opcoes)  (função pura, testada em Node) */
(function(root){
'use strict';
const DI={};
const SUGERE_FUNDO=['Borda','GEO_PASSEIO PROJETADO','quadra','GEO_VIAS PROJETADAS','Passeio-publico','BORDO'];
const SUGERE_COTA=['Borda','MURO','TN','Cal_da','Meio-fio','SARGETA','ASFALTO','MF','B'];
/* Alguns levantamentos não trazem uma camada chamada apenas "EIXO".
   No DWG de Verdes Mares os eixos utilizáveis estão em GEO_VIAS PROJETADAS.
   GEO_PASSEIO PROJETADO fica fora daqui: contém segmentos de detalhe e
   geraria centenas de ruas curtas. */
const SUGERE_EIXO=['GEO_VIAS PROJETADAS','GEO_EIXO RUA'];
const eixoSugerido=n=>SUGERE_EIXO.indexOf(n)>=0||/\beixo\b/i.test(n);
const COR_FUNDO={'Borda':'#374151','GEO_PASSEIO PROJETADO':'#9ca3af','quadra':'#b45309','GEO_VIAS PROJETADAS':'#dc2626'};
const r2=x=>Math.round(x*100)/100, r3=x=>Math.round(x*1000)/1000, z0=x=>x===0?0:x;
const hyp=Math.hypot, LIM_RUA=30000, MAX_RUAS=300;

/* ───────── geometria ───────── */
function Eixo(E){ this.E=E; this.n=E.length-1; this.cum=[0]; this.sx=[]; this.sy=[]; this.L=[];
  for(let i=0;i<this.n;i++){ const dx=E[i+1][0]-E[i][0], dy=E[i+1][1]-E[i][1], l=hyp(dx,dy)||1e-9; this.sx.push(dx); this.sy.push(dy); this.L.push(l); this.cum.push(this.cum[i]+l); }
  this.bx0=[]; this.bx1=[]; this.by0=[]; this.by1=[]; for(let i=0;i<this.n;i++){ this.bx0.push(Math.min(E[i][0],E[i+1][0])); this.bx1.push(Math.max(E[i][0],E[i+1][0])); this.by0.push(Math.min(E[i][1],E[i+1][1])); this.by1.push(Math.max(E[i][1],E[i+1][1])); }
  this.len=this.cum[this.n]; }
/* estaca e afastamento (+esquerda) de um ponto; fora das pontas projeta nas retas de prolongamento */
Eixo.prototype.proj=function(px,py){ let best=1e30, S=0, O=0;
  for(let i=0;i<this.n;i++){ if(best<1e29&&i>0&&i<this.n-1){ const lx=Math.max(this.bx0[i]-px,px-this.bx1[i],0), ly=Math.max(this.by0[i]-py,py-this.by1[i],0); if(lx*lx+ly*ly>best) continue; }
    const ax=this.E[i][0], ay=this.E[i][1]; let t=((px-ax)*this.sx[i]+(py-ay)*this.sy[i])/(this.L[i]*this.L[i]);
    if(i>0) t=Math.max(0,t); if(i<this.n-1) t=Math.min(1,t);
    const qx=ax+this.sx[i]*t, qy=ay+this.sy[i]*t, d2=(px-qx)*(px-qx)+(py-qy)*(py-qy);
    if(d2<best){ best=d2; S=this.cum[i]+t*this.L[i]; O=Math.sign(this.sx[i]*(py-qy)-this.sy[i]*(px-qx))*Math.sqrt(d2); } }
  return {s:S,o:O}; };
Eixo.prototype.pt=function(s){ if(s<=0){ const u=[this.sx[0]/this.L[0],this.sy[0]/this.L[0]]; return [this.E[0][0]+u[0]*s,this.E[0][1]+u[1]*s]; }
  if(s>=this.len){ const k=this.n-1,u=[this.sx[k]/this.L[k],this.sy[k]/this.L[k]]; return [this.E[this.n][0]+u[0]*(s-this.len),this.E[this.n][1]+u[1]*(s-this.len)]; }
  let lo=0, hi=this.n-1; while(lo<hi){ const m=(lo+hi)>>1; if(this.cum[m+1]<s) lo=m+1; else hi=m; } const i=lo, t=(s-this.cum[i])/this.L[i]; return [this.E[i][0]+this.sx[i]*t,this.E[i][1]+this.sy[i]*t]; };
Eixo.prototype.dirIni=function(){ return [this.sx[0]/this.L[0],this.sy[0]/this.L[0]]; };
Eixo.prototype.dirFim=function(){ const k=this.n-1; return [this.sx[k]/this.L[k],this.sy[k]/this.L[k]]; };
/* reamostra a 2 m e prolonga em reta (a no início, b no fim) */
function reamostra(P,a,b){ const E=new Eixo(P), out=[]; const passo=2;
  const tot=E.len; for(let s=0;s<tot;s+=passo) out.push(E.pt(s)); out.push(E.pt(tot));
  const pre=[], pos=[]; if(a>0.01){ const u=E.dirIni(); for(let s=a;s>0.001;s-=passo) pre.push([P[0][0]-u[0]*s,P[0][1]-u[1]*s]); }
  if(b>0.01){ const u=E.dirFim(), f=P[P.length-1]; for(let s=passo;s<b-0.001;s+=passo) pos.push([f[0]+u[0]*s,f[1]+u[1]*s]); pos.push([f[0]+u[0]*b,f[1]+u[1]*b]); }
  return pre.concat(out,pos); }
function intersecao(A,B){ for(let i=0;i<A.n;i++) for(let j=0;j<B.n;j++){ const d=A.sx[i]*B.sy[j]-A.sy[i]*B.sx[j]; if(Math.abs(d)<1e-9) continue;
    const wx=B.E[j][0]-A.E[i][0], wy=B.E[j][1]-A.E[i][1], t=(wx*B.sy[j]-wy*B.sx[j])/d, u=(wx*A.sy[i]-wy*A.sx[i])/d;
    if(t>=0&&t<=1&&u>=0&&u<=1) return {sa:A.cum[i]+t*A.L[i], sb:B.cum[j]+u*B.L[j]}; } return null; }
function distPolilinha(E,px,py){ let m=1e30; for(let i=0;i<E.n;i++){ const ax=E.E[i][0], ay=E.E[i][1]; const t=Math.max(0,Math.min(1,((px-ax)*E.sx[i]+(py-ay)*E.sy[i])/(E.L[i]*E.L[i]))); m=Math.min(m,hyp(px-(ax+E.sx[i]*t),py-(ay+E.sy[i]*t))); } return m; }


/* ───────── eixos a partir das BORDAS DE PISTA (meio-fio / quadra) ─────────
   Muitos levantamentos não têm camada de eixo, mas têm a borda de pista de cada lado da rua (aqui, a camada "quadra": cada quarteirão é um
   polígono). O eixo é a LINHA DO MEIO entre duas bordas paralelas e frontais, a uma distância entre 4,5 e 16 m (= largura da pista, medida no
   desenho, nada interpolado). Trechos alinhados são unidos por cima dos cruzamentos e das praças (a rua é contínua) e trechos que se encontram
   viram uma única linha. Devolve [{pts:[[x,y]…], larg, len, pares}] em coordenadas do desenho. */
DI.eixosPorBordas=function(D,camadas,op){
  op=Object.assign({gmin:4.5,gmax:16,ovmin:6,gap:48,gapLongo:170,angTol:2.5,minLen:20,segmin:4,offTol:2.5,junta:6,angJunta:40},op||{});
  const set=new Set(camadas||[]), S=[];
  (D.linhas||[]).forEach(l=>{ if(!set.has(l.camada)||!l.pts||l.pts.length<2) return; const P=l.pts.slice(); if(l.fechada&&P.length>2) P.push(P[0]);
    for(let i=0;i<P.length-1;i++){ const dx=P[i+1][0]-P[i][0], dy=P[i+1][1]-P[i][1], L=hyp(dx,dy); if(!(L>=op.segmin)) continue;
      let a=Math.atan2(dy,dx); if(a<0) a+=Math.PI; if(a>=Math.PI-1e-9) a-=Math.PI; S.push({a,L,x0:P[i][0],y0:P[i][1],x1:P[i+1][0],y1:P[i+1][1]}); } });
  if(S.length>6000) return [];
  const tol=op.angTol*Math.PI/180, M=[];
  for(let i=0;i<S.length;i++) for(let j=i+1;j<S.length;j++){ const A=S[i], B=S[j]; let da=Math.abs(A.a-B.a); da=Math.min(da,Math.PI-da); if(da>tol) continue;
    const a=(A.a+B.a)/2, ux=Math.cos(a), uy=Math.sin(a), nx=-uy, ny=ux;
    const a0=Math.min(A.x0*ux+A.y0*uy,A.x1*ux+A.y1*uy), a1=Math.max(A.x0*ux+A.y0*uy,A.x1*ux+A.y1*uy), b0=Math.min(B.x0*ux+B.y0*uy,B.x1*ux+B.y1*uy), b1=Math.max(B.x0*ux+B.y0*uy,B.x1*ux+B.y1*uy);
    const t0=Math.max(a0,b0), t1=Math.min(a1,b1); if(t1-t0<op.ovmin) continue;
    const oA=(A.x0*nx+A.y0*ny+A.x1*nx+A.y1*ny)/2, oB=(B.x0*nx+B.y0*ny+B.x1*nx+B.y1*ny)/2, g=Math.abs(oA-oB); if(g<op.gmin||g>op.gmax) continue;
    const o=(oA+oB)/2; M.push({a,ux,uy,w:t1-t0,g,ax:t0*ux+o*nx,ay:t0*uy+o*ny,bx:t1*ux+o*nx,by:t1*uy+o*ny}); }
  /* agrupa trechos-meio quase colineares (ângulo ≤ angTol e afastamento ≤ offTol) */
  M.sort((p,q)=>q.w-p.w); const G=[];
  M.forEach(m=>{ const mx=(m.ax+m.bx)/2, my=(m.ay+m.by)/2; let g=null;
    for(const G0 of G){ let da=Math.abs(G0.a-m.a); da=Math.min(da,Math.PI-da); if(da>tol) continue; const d=Math.abs((mx-G0.px)*(-G0.uy)+(my-G0.py)*G0.ux); if(d<=op.offTol){ g=G0; break; } }
    if(!g) G.push(g={a:m.a,ux:m.ux,uy:m.uy,px:mx,py:my,m:[]}); g.m.push(m); });
  let R=[];
  G.forEach(g=>{ let W=0,ox=0,oy=0,sx=0,sy=0; g.m.forEach(m=>{ W+=m.w; ox+=((m.ax+m.bx)/2)*m.w; oy+=((m.ay+m.by)/2)*m.w; sx+=m.ux*m.w*(m.ux*g.ux+m.uy*g.uy>=0?1:-1); sy+=m.uy*m.w*(m.ux*g.ux+m.uy*g.uy>=0?1:-1); });
    const hl=hyp(sx,sy)||1, ux=sx/hl, uy=sy/hl, px=ox/W, py=oy/W;   /* linha média: ponto (px,py) e direção (ux,uy) */
    const T=g.m.map(m=>{ const t0=(m.ax-px)*ux+(m.ay-py)*uy, t1=(m.bx-px)*ux+(m.by-py)*uy; return {t0:Math.min(t0,t1),t1:Math.max(t0,t1),g:m.g,w:m.w}; }).sort((p,q)=>p.t0-q.t0);
    const blocos=[]; let cur=null; T.forEach(t=>{ if(cur&&t.t0-cur.t1<=op.gap){ cur.t1=Math.max(cur.t1,t.t1); cur.m.push(t); } else { cur={t0:t.t0,t1:t.t1,m:[t]}; blocos.push(cur); } });
    /* a rua é contínua por cima de praças e cruzamentos largos: une blocos longos alinhados */
    for(let i=0;i<blocos.length-1;){ const A=blocos[i], B=blocos[i+1]; if(B.t0-A.t1<=op.gapLongo&&A.t1-A.t0>=80&&B.t1-B.t0>=80){ A.t1=Math.max(A.t1,B.t1); A.m=A.m.concat(B.m); blocos.splice(i+1,1); } else i++; }
    blocos.forEach(b=>{ if(b.t1-b.t0<op.minLen) return; const gs=b.m.slice().sort((p,q)=>p.g-q.g); let acc=0, gm=gs[0].g; const tot=gs.reduce((s,t)=>s+t.w,0); for(const t of gs){ acc+=t.w; if(acc>=tot/2){ gm=t.g; break; } }
      R.push({pts:[[px+b.t0*ux,py+b.t0*uy],[px+b.t1*ux,py+b.t1*uy]],larg:gm,len:b.t1-b.t0,pares:b.m.length,a:g.a}); }); });
  /* une trechos que se encontram na ponta (curva suave da rua) numa só polilinha */
  const dirOf=(P,fim)=>{ const a=fim?P[P.length-2]:P[1], b=fim?P[P.length-1]:P[0]; const dx=b[0]-a[0], dy=b[1]-a[1], l=hyp(dx,dy)||1; return [dx/l,dy/l]; };
  let mudou=true; while(mudou){ mudou=false;
    outer: for(let i=0;i<R.length;i++) for(let j=0;j<R.length;j++){ if(i===j) continue; const A=R[i], B=R[j];
      for(const fa of [1,0]) for(const fb of [0,1]){ const pa=fa?A.pts[A.pts.length-1]:A.pts[0], pb=fb?B.pts[B.pts.length-1]:B.pts[0]; if(hyp(pa[0]-pb[0],pa[1]-pb[1])>op.junta) continue;
        const da=dirOf(A.pts,fa), db=dirOf(B.pts,fb), c=-(da[0]*db[0]+da[1]*db[1]); if(c<Math.cos(op.angJunta*Math.PI/180)) continue;
        const Pa=fa?A.pts.slice():A.pts.slice().reverse(), Pb=fb?B.pts.slice().reverse():B.pts.slice(); Pb.shift();
        const nova={pts:Pa.concat(Pb),larg:(A.larg*A.len+B.larg*B.len)/(A.len+B.len),len:A.len+B.len,pares:A.pares+B.pares}; R.splice(Math.max(i,j),1); R.splice(Math.min(i,j),1); R.push(nova); mudou=true; break outer; } } }
  /* avenida com canteiro / meio-fio duplo gera 2 ou 3 eixos paralelos colados: funde num só (posição média, largura = a maior) */
  { const dm=op.dedup!=null?op.dedup:14; R.sort((p,q)=>q.len-p.len); const out=[], usado=new Set();
    R.forEach((A,i)=>{ if(usado.has(i)) return; usado.add(i); const a0=A.pts[0], a1=A.pts[A.pts.length-1], dx=a1[0]-a0[0], dy=a1[1]-a0[1], L=hyp(dx,dy)||1, ux=dx/L, uy=dy/L; let so=0,sw=0,lg=A.larg, pares=A.pares, tmin=0, tmax=L;
      let mudou2=true; while(mudou2){ mudou2=false; R.forEach((B,j)=>{ if(usado.has(j)) return; const b0=B.pts[0], b1=B.pts[B.pts.length-1], ex=b1[0]-b0[0], ey=b1[1]-b0[1], LB=hyp(ex,ey)||1; if(Math.abs(ux*ey-uy*ex)/LB>Math.sin(3*Math.PI/180)) return;
        const o0=(b0[0]-a0[0])*(-uy)+(b0[1]-a0[1])*ux, o1=(b1[0]-a0[0])*(-uy)+(b1[1]-a0[1])*ux, om=(o0+o1)/2; if(Math.abs(om)>dm) return;
        const t0=(b0[0]-a0[0])*ux+(b0[1]-a0[1])*uy, t1=(b1[0]-a0[0])*ux+(b1[1]-a0[1])*uy, ov=Math.min(Math.max(t0,t1),tmax)-Math.max(Math.min(t0,t1),tmin); if(ov<(Math.abs(om)<=3?-20:Math.min(0.5*Math.min(L,LB),20))) return;
        usado.add(j); mudou2=true; tmin=Math.min(tmin,t0,t1); tmax=Math.max(tmax,t0,t1); so+=om*B.len; sw+=B.len; lg=Math.max(lg,B.larg); pares+=B.pares; }); }
      const sh=sw?so/(sw+A.len):0; const pts=(A.pts.length===2&&(tmin<0||tmax>L))?[[a0[0]+ux*tmin,a0[1]+uy*tmin],[a0[0]+ux*tmax,a0[1]+uy*tmax]]:A.pts; out.push({pts:pts.map(q=>[q[0]-uy*sh,q[1]+ux*sh]),larg:lg,len:Math.max(A.len,tmax-tmin),pares}); });
    R=out; }
  R.forEach(r=>{ r.larg=Math.round(r.larg*100)/100; r.len=Math.round(r.len*100)/100; });
  return R.sort((p,q)=>q.len-p.len); };

/* ───────── nomes e larguras vindos dos textos do DWG ───────── */
const PADRAO_NOME=/^\s*(RUA|R\.|AV\.?|AVENIDA|TRAVESSA|TV\.?|ESTRADA|ALAMEDA|PRA[ÇC]A|BECO)\s*\.?\s*\S/i;
function titulo(t){ t=String(t).replace(/\s+/g,' ').trim().replace(/^(AV|TV)\.?\s*/i,(m,a)=>a.toUpperCase()+'. ');
  const peq={DA:1,DAS:1,DE:1,DO:1,DOS:1,E:1}; return t.toLowerCase().split(' ').map((w,i)=>(i>0&&peq[w.toUpperCase()])?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function limpa(s){ return (root.DwgLeitor&&root.DwgLeitor.limpaTexto?root.DwgLeitor.limpaTexto(s):String(s||'')).trim(); }
function nomeDaRua(textos,E,org){ const v={}; textos.forEach(t=>{ const tx=limpa(t.txt); if(!PADRAO_NOME.test(tx)) return;
    const px=t.x-org[0], py=t.y-org[1]; if(distPolilinha(E,px,py)>30) return; const q=E.proj(px,py), i=Math.min(E.n-1,Math.max(0,E.cum.findIndex(c=>c>=q.s)-1));
    const ang=Math.atan2(E.sy[Math.max(0,i)],E.sx[Math.max(0,i)]), rot=t.rot||0, df=Math.abs(((rot-ang+Math.PI/2)%Math.PI+Math.PI)%Math.PI-Math.PI/2);
    if(df>30*Math.PI/180) return; v[tx.toUpperCase()]=(v[tx.toUpperCase()]||0)+1; });
  const k=Object.keys(v).sort((a,b)=>v[b]-v[a])[0]; return k?titulo(k):null; }
function larguraDaRua(textos,E,org,padrao){ const v={}; textos.forEach(t=>{ const m=/^\s*(\d+[.,]\d+)\s*m?\s*\/\s*(\d+[.,]\d+)\s*m?\s*$/i.exec(limpa(t.txt)); if(!m) return;
    const px=t.x-org[0], py=t.y-org[1]; if(distPolilinha(E,px,py)>30) return;
    const q=E.proj(px,py), i=Math.min(E.n-1,Math.max(0,E.cum.findIndex(c=>c>=q.s)-1)), ang=Math.atan2(E.sy[i],E.sx[i]), rot=t.rot||0, df=Math.abs(((rot-ang+Math.PI/2)%Math.PI+Math.PI)%Math.PI-Math.PI/2);
    if(df>30*Math.PI/180) return;   /* o texto da largura fica paralelo à rua; o da rua que cruza é perpendicular */
    const p=parseFloat(m[1].replace(',','.')); if(p>=3&&p<=30) v[p]=(v[p]||0)+1; });
  const k=Object.keys(v).sort((a,b)=>v[b]-v[a]||b-a)[0]; return k?{larg:parseFloat(k),doTexto:true}:{larg:padrao,doTexto:false}; }

/* ───────── gera as ruas a partir das camadas escolhidas ─────────
   op: {eixos:[camadas], cotas:[camadas], larg:7, estender:true, perto:80, aNa:1.6, origem:[x,y]|null}
   devolve {ruas:[{id,nome,rows,cruz,eixo,eixoProj}], origem, relatorio:[linhas de texto]} */
DI.gerarRuas=function(D,op){
  op=Object.assign({larg:7,estender:true,perto:80,aNa:1.6,origem:null},op||{});
  const eixos=new Set(op.eixos||[]), cotas=new Set(op.cotas||[]); const rel=[];
  let brutas=(D.linhas||[]).filter(l=>eixos.has(l.camada)&&l.pts&&l.pts.length>=2);
  /* eixos calculados pelas bordas de pista (camadas marcadas em "Borda da pista") */
  if(op.bordas&&op.bordas.length){ const gb=DI.eixosPorBordas(D,op.bordas); gb.forEach(e=>brutas.push({camada:'(bordas)',pts:e.pts,larg0:e.larg})); rel.push(gb.length+' eixo(s) calculado(s) pela linha do meio entre as bordas de pista (largura da pista medida no desenho).'); }
  if(!brutas.length) return {ruas:[],cotas:[],origem:op.origem,relatorio:['Nenhuma linha nas camadas de eixo marcadas.']};
  let org=op.origem; if(!org){ let x0=1e30,y0=1e30; brutas.forEach(l=>l.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);})); org=[Math.floor(x0/10)*10-300,Math.floor(y0/10)*10-300]; }
  /* pontos reais com cota das camadas marcadas (coordenadas locais) */
  const PT=(D.pontos||[]).filter(p=>p.cota!=null&&isFinite(p.cota)&&cotas.has(p.camada)).map(p=>({x:p.x-org[0],y:p.y-org[1],z:p.cota,c:p.camada}));
  /* uma rua por linha; remove linhas curtas */
  let ruas=[], ign={absurda:0,vazia:0}; brutas.forEach(l=>{ const P=[]; l.pts.forEach(p=>{ const x=p[0]-org[0], y=p[1]-org[1]; if(!isFinite(x)||!isFinite(y)) return; const u=P[P.length-1]; if(!u||Math.abs(u[0]-x)>0.02||Math.abs(u[1]-y)>0.02) P.push([x,y]); }); if(P.length<2){ ign.vazia++; return; }
    const E0=new Eixo(P); if(!isFinite(E0.len)||E0.len>LIM_RUA){ ign.absurda++; return; } if(E0.len<15) return; ruas.push({P,E0,larg0:l.larg0}); });
  if(ign.absurda) rel.push('ATENÇÃO: '+ign.absurda+' linha(s) das camadas de eixo ignorada(s) por terem mais de '+(LIM_RUA/1000)+' km ou coordenadas absurdas (provável lixo no desenho ou camada que não é de eixo).');
  if(ruas.length>MAX_RUAS){ ruas.sort((a,b)=>b.E0.len-a.E0.len); rel.push('ATENÇÃO: as camadas de eixo marcadas têm '+ruas.length+' linhas; só as '+MAX_RUAS+' maiores viraram ruas (confira se marcou camadas que não são eixo).'); ruas=ruas.slice(0,MAX_RUAS); }
  if(!ruas.length) return {ruas:[],origem:org,relatorio:rel.concat(['Nenhuma linha com 15 m ou mais nas camadas de eixo marcadas.'])};
  ruas.forEach((r,i)=>{ r.id='R'+(i+1); const lg=larguraDaRua(D.textos||[],r.E0,org,op.larg); if(r.larg0>0){ lg.larg=r.larg0; lg.doTexto=true; } r.larg=lg.larg; r.hb=lg.larg/2; r.nome=nomeDaRua(D.textos||[],r.E0,org)||('Rua '+(i+1)); r.aviso=[]; r.a=0; r.b=0;
    if(!lg.doTexto) r.aviso.push('largura '+lg.larg+' m (padrão: o DWG não tem texto "pista / passeio" perto desta rua)'); });
  /* prolongamento até o cruzamento mais próximo à frente (até op.perto m) */
  const EXT=300; ruas.forEach(r=>{ r.ex=new Eixo(reamostra(r.P,EXT,EXT)); });
  if(op.estender) ruas.forEach(r=>{ const L0=r.E0.len; let ant=null, pos=null;
    ruas.forEach(o=>{ if(o===r) return; const x=intersecao(r.ex,o.ex); if(!x) return; const est=x.sa-EXT;
      if(est>L0+0.5&&(!pos||est<pos.est)) pos={est,rua:o}; if(est<-0.5&&(!ant||est>ant.est)) ant={est,rua:o}; });
    if(pos&&pos.est-L0<=op.perto){ r.b=pos.est-L0; r.aviso.push('fim estendido '+r2(r.b)+' m até '+pos.rua.nome); }
    if(ant&&-ant.est<=op.perto){ r.a=-ant.est; r.aviso.push('início estendido '+r2(r.a)+' m até '+ant.rua.nome); } });
  /* ruas diagonais (30°–60° com a horizontal ou vertical): vão até o cruzamento com as avenidas principais, sem o limite de "perto" */
  if(op.estender){ const grandes=ruas.filter(o=>o.E0.len>=500);
    ruas.forEach(r=>{ if(grandes.indexOf(r)>=0) return; const P=r.P, d=[P[P.length-1][0]-P[0][0],P[P.length-1][1]-P[0][1]], ang=Math.abs(Math.atan2(d[1],d[0])*180/Math.PI)%90; if(ang<25||ang>65) return;
      const L0=r.E0.len; let ant=null, pos=null; grandes.forEach(o=>{ const x=intersecao(r.ex,o.ex); if(!x) return; const est=x.sa-EXT;
        if(est>L0+0.5&&(!pos||est<pos.est)) pos={est,rua:o}; if(est<-0.5&&(!ant||est>ant.est)) ant={est,rua:o}; });
      r.diag=true; r.aviso=r.aviso.filter(t=>!/estendido/.test(t)); r.a=0; r.b=0;
      if(pos&&pos.est-L0<=150){ r.b=pos.est-L0; r.aviso.push('rua diagonal: fim estendido '+r2(r.b)+' m até '+pos.rua.nome); }
      if(ant&&-ant.est<=150){ r.a=-ant.est; r.aviso.push('rua diagonal: início estendido '+r2(r.a)+' m até '+ant.rua.nome); } }); }
  /* "LIMITE DA OBRA": se há esse texto à frente da ponta (até 60 m, a menos de 15 m da linha da rua), a rua vai até ele */
  if(op.estender){ const LIM=(D.textos||[]).filter(t=>/LIMITE\s+DA\s+OBRA/i.test(limpa(t.txt))).map(t=>[t.x-org[0],t.y-org[1]]);
    if(LIM.length) ruas.forEach(r=>{ if(r.diag) return; const n=r.P.length, fim=(ex)=>{ const E=new Eixo(reamostra(r.P,r.a,r.b)); const pts=ex?E.E[E.n]:E.E[0]; const u=ex?E.dirFim():E.dirIni().map(v=>-v); let melhor=null;
        LIM.forEach(L=>{ const dx=L[0]-pts[0], dy=L[1]-pts[1], ahead=dx*u[0]+dy*u[1], lat=Math.abs(dx*u[1]-dy*u[0]); if(ahead>1&&ahead<=60&&lat<=15&&(!melhor||ahead<melhor.ahead)) melhor={ahead,lat}; }); return melhor; };
      const f=fim(true); if(f){ r.b+=f.ahead; r.aviso.push('fim estendido +'+r2(f.ahead)+' m até o LIMITE DA OBRA'); }
      const i0=fim(false); if(i0){ r.a+=i0.ahead; r.aviso.push('início estendido +'+r2(i0.ahead)+' m até o LIMITE DA OBRA'); } }); }
  ruas.forEach(r=>{ r.eixo=reamostra(r.P,r.a,r.b); r.ax=new Eixo(r.eixo); });
  /* linhas da tabela: pontos reais perto de cada seção */
  ruas.forEach(r=>{ const ax=r.ax, hb=r.hb, V=[];
    const W=[]; PT.forEach(p=>{ const q=ax.proj(p.x,p.y); if(q.s<=-30||q.s>=ax.len+30) return; if(Math.abs(q.o)<=hb+4.5) V.push({s:q.s,o:q.o,z:p.z}); if(Math.abs(q.o)<=hb+9) W.push({s:q.s,o:q.o,z:p.z}); });
    V.sort((a,b)=>a.s-b.s);
    const na=op.aNa, rows=[];
    const secao=s0=>{ const c=V.filter(p=>Math.abs(p.s-s0)<=3);
      const lado=sg=>{ let b=null; c.forEach(p=>{ if(Math.sign(p.o)!==sg&&Math.abs(p.o)>0.5) return; const d=Math.abs(p.o-sg*hb); if(d<=2.5&&(!b||d<b.d)) b={d,z:p.z,s:p.s}; }); return b; };
      const e=lado(1), d=lado(-1); if(!e||!d) return null; let m=null;
      c.forEach(p=>{ const dd=Math.abs(p.o)+Math.abs(p.s-s0)*0.3; if(Math.abs(p.o)<=1&&(!m||dd<m.d)) m={d:dd,z:p.z,s:p.s}; });
      const tc=m?m.z:(e.z+d.z)/2, ss=[e.s,d.s].concat(m?[m.s]:[]); return {est:ss.reduce((a,b)=>a+b,0)/ss.length,te:e.z,tc,td:d.z}; };
    const linha=(q,est)=>({est:z0(r2(est!=null?est:q.est)),te:r3(q.te),tc:r3(q.tc),td:r3(q.td),gr:r3(q.tc),larg:r.larg,na:r3(q.tc-na)});
    const cand=[...new Set(V.filter(p=>Math.abs(Math.abs(p.o)-hb)<=2.5||Math.abs(p.o)<=1).map(p=>Math.round(p.s*10)/10))].sort((a,b)=>a-b);
    cand.forEach(s0=>{ if(s0<-1||s0>ax.len+1) return; if(rows.some(w=>Math.abs(w.est-s0)<6)) return; const q=secao(s0); if(!q) return;
      if(rows.some(w=>Math.abs(w.est-q.est)<6)) return; rows.push(linha(q,Math.max(0,Math.min(ax.len,q.est)))); });
    rows.sort((a,b)=>a.est-b.est);
    /* pontas: estaca 0 no início e última no fim, com o ponto real mais próximo (nada interpolado) */
    const ponta=(sx,J)=>{ const c=V.filter(p=>Math.abs(p.s-sx)<=J).map(p=>Object.assign({dist:Math.abs(p.s-sx)},p));
      const lado=sg=>{ let b=null; c.forEach(p=>{ if(Math.sign(p.o)!==sg&&Math.abs(p.o)>0.5) return; if(Math.abs(p.o-sg*hb)<=2.5&&(!b||p.dist<b.dist)) b=p; }); return b; };
      /* sem ponto de pista/meio-fio: cota real mais próxima da quadra (Borda/MURO…) do mesmo lado */
      const ladoQ=sg=>{ let b=null; W.forEach(p=>{ const dist=Math.abs(p.s-sx); if(dist>J||Math.sign(p.o)!==sg||Math.abs(p.o)<hb-2.5) return; if(!b||dist<b.dist) b=Object.assign({dist},p); }); return b; };
      let e=lado(1), d=lado(-1), nota=''; if(!e){ e=ladoQ(1); if(e) nota+=' [cota da Borda da quadra, lado esquerdo]'; } if(!d){ d=ladoQ(-1); if(d) nota+=' [cota da Borda da quadra, lado direito]'; }
      if(!e&&!d) return null; if(!e){ e=d; nota+=' (lado esquerdo sem ponto real: igual ao direito)'; } if(!d){ d=e; nota+=' (lado direito sem ponto real: igual ao esquerdo)'; }
      let m=null; c.forEach(p=>{ if(Math.abs(p.o)<=1&&(!m||p.dist<m.dist)) m=p; });
      return {q:{te:e.z,td:d.z,tc:m?m.z:(e.z+d.z)/2},dist:Math.max(e.dist,d.dist),nota}; };
    if(!rows.length||rows[0].est>0.005){ const p=ponta(0,25)||ponta(0,60); if(p){ rows.unshift(linha(p.q,0)); r.aviso.push('estaca 0: ponto real mais próximo a '+r2(p.dist)+' m'+p.nota); } else r.aviso.push('estaca 0 SEM ponto real a 60 m'); }
    const fim=r2(ax.len); if(!rows.length||rows[rows.length-1].est<fim-0.005){ const p=ponta(ax.len,25)||ponta(ax.len,60); if(p){ rows.push(linha(p.q,fim)); r.aviso.push('estaca final: ponto real mais próximo a '+r2(p.dist)+' m'+p.nota); } else r.aviso.push('estaca final SEM ponto real a 60 m'); }
    r.rows=rows; });
  /* cruzamentos nos eixos finais */
  ruas.forEach(r=>{ r.exf=new Eixo(reamostra(r.eixo,EXT,EXT)); });
  ruas.forEach(r=>{ r.cruz=[]; ruas.forEach(o=>{ if(o===r) return; const x=intersecao(r.exf,o.exf); if(!x) return; const ea=x.sa-EXT, eb=x.sb-EXT;
      if(ea>=-1.5&&ea<=r.ax.len+1.5&&eb>=-1.5&&eb<=o.ax.len+1.5) r.cruz.push({est:z0(r2(ea)),rua:o.id,estOutra:z0(r2(eb))}); }); r.cruz.sort((a,b)=>a.est-b.est); });
  { const sem=ruas.filter(r=>r.rows.length<2); if(sem.length) rel.push('ATENÇÃO: '+sem.length+' rua(s) sem cotas reais suficientes (menos de 2 seções) não entraram: '+sem.map(r=>r.nome+' ['+Math.round(r.P[0][0]+org[0])+','+Math.round(r.P[0][1]+org[1])+']').join('; ')+'.'); }
  ruas=ruas.filter(r=>r.rows.length>=2);
  ruas.forEach(r=>rel.push(r.nome+': '+r2(r.ax.len)+' m, '+r.rows.length+' linhas, largura '+r.larg+' m'+(r.aviso.length?' — '+r.aviso.join('; '):'')));
  return {ruas:ruas.map(r=>({id:r.id,nome:r.nome,rows:r.rows,cruz:r.cruz,eixo:r.eixo.map(p=>[z0(r2(p[0])),z0(r2(p[1]))]),eixoProj:true})),origem:org,relatorio:rel,cotas:PT.map(p=>({x:r2(p.x),y:r2(p.y),z:r2(p.z),c:p.c}))};
};

/* fundo da planta: linhas das camadas marcadas, em metros locais */
DI.fundo=function(D,camadas,org){ const set=new Set(camadas), por={};
  (D.linhas||[]).forEach(l=>{ if(!set.has(l.camada)||!l.pts||l.pts.length<2) return; const o=[]; l.pts.forEach(q=>{ const t=[r2(q[0]-org[0]),r2(q[1]-org[1])], u=o[o.length-1]; if(!u||u[0]!==t[0]||u[1]!==t[1]) o.push(t); });
    if(o.length>1) (por[l.camada]=por[l.camada]||[]).push(o); });
  const pal=['#374151','#9ca3af','#b45309','#dc2626','#0e7490','#7c3aed','#15803d','#a16207'];
  return Object.keys(por).map((n,i)=>({n,c:COR_FUNDO[n]||pal[i%pal.length],w:0.7,l:por[n]})); };

/* Aplica a mesma regra de extensão ao projeto completo pré-calculado.
   Os cruzamentos já vêm registrados em estacas; quando a estaca do
   cruzamento está além da ponta atual, prolongamos a tangente da ponta até
   ele, respeitando a distância digitada pelo usuário. */
DI.estenderProjeto=function(dados,limite){
  const max=isFinite(+limite)&&+limite>=0?+limite:80;
  const out=JSON.parse(JSON.stringify(dados||{})), rel=(out.relatorio||[]).slice();
  (out.ruas||[]).forEach(r=>{ const E=r.eixo; if(!Array.isArray(E)||E.length<2) return; const ax=new Eixo(E); let pre=0,pos=0;
    (r.cruz||[]).forEach(c=>{ const s=+c.est; if(!isFinite(s)) return; if(s<0&&-s<=max) pre=pre?Math.min(pre,-s):-s; if(s>ax.len&&s-ax.len<=max) pos=pos?Math.min(pos,s-ax.len):s-ax.len; });
    if(!pre&&!pos) return; const P=E.map(p=>p.slice());
    if(pre){ const u=ax.dirIni(); P.unshift([P[0][0]-u[0]*pre,P[0][1]-u[1]*pre]); }
    if(pos){ const u=ax.dirFim(), q=P[P.length-1]; P.push([q[0]+u[0]*pos,q[1]+u[1]*pos]); }
    r.eixo=P; rel.push(r.nome+': eixo estendido '+(pre?pre.toFixed(2)+' m no início':'')+(pre&&pos?' e ':'')+(pos?pos.toFixed(2)+' m no fim':'')); });
  out.relatorio=rel; return out;
};

/* ───────── resumo e execução (rodam no Worker; sem Worker rodam na tela principal) ───────── */
DI.resumo=function(D){ const nl={}, nt={}; (D.linhas||[]).forEach(l=>{ nl[l.camada]=(nl[l.camada]||0)+1; }); (D.textos||[]).forEach(t=>{ nt[t.camada]=(nt[t.camada]||0)+1; });
  const nomes=new Set(Object.keys(D.camadas||{})); (D.todasCamadas||[]).forEach(n=>nomes.add(n));
  const cam=[...nomes].map(n=>{ const c=(D.camadas&&D.camadas[n])||{total:0,pontosComCota:0}; return {n,total:c.total||0,pc:c.pontosComCota||0,nl:nl[n]||0,nt:nt[n]||0}; });
  return {arquivo:D.__arquivo,xref:D.xrefIgnorados||0,cam,extensao:D.extensao||null,textos:(D.textos||[]).length,linhas:(D.linhas||[]).length,pontos:(D.pontos||[]).length}; };
DI.executar=function(D,op,fundoCams){
  const res=((op.eixos&&op.eixos.length)||(op.bordas&&op.bordas.length))?DI.gerarRuas(D,op):{ruas:[],origem:op.origem||null,relatorio:[]};
  let org=res.origem; if(!org){ const e=D.extensao||{minX:0,minY:0}; org=[Math.floor(e.minX/10)*10-300,Math.floor(e.minY/10)*10-300]; }
  return {ruas:res.ruas,fundo:(fundoCams&&fundoCams.length)?DI.fundo(D,fundoCams,org):null,origem:org,relatorio:res.relatorio,cotas:res.cotas||[],arquivo:D.__arquivo}; };

/* ───────── tela ───────── */
function carregarScript(src){ return new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>err(new Error('não carregou '+src)); document.head.appendChild(s); }); }
async function bibliotecas(){ if(!root.TCDWG) await carregarScript(location.origin+'/tc-dwg.min.js'); if(!root.DwgLeitor) await carregarScript(location.origin+'/dwg-leitor.js?v=20261119'); }
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WSRC='let D=null;self.onmessage=function(ev){const m=ev.data;try{'+
  "if(m.cmd==='ini'){importScripts(m.u+'/tc-dwg.min.js',m.u+'/dwg-leitor.js?v=20261119',m.u+'/dwg-importar.js?v=20261123');self.postMessage({ok:'ini'});}"+
  "else if(m.cmd==='ler'){D=self.DwgLeitor.lerBuffer(self.TCDWG,m.buf);D.__arquivo=m.nome;self.postMessage({ok:'ler',res:self.DwgImp.resumo(D)});}"+
  "else if(m.cmd==='gerar'){self.postMessage({ok:'gerar',res:self.DwgImp.executar(D,m.op,m.fundo)});}"+
  '}catch(e){self.postMessage({erro:String(e&&e.message||e)});}};';
/* cliente: tenta Worker (a tela nunca congela); se o navegador não deixar, roda na tela principal */
function criaCliente(){
  let w=null, espera=null, D=null, modo='worker';
  const pergunta=(msg,transf)=>new Promise((ok,err)=>{ espera={ok,err}; w.postMessage(msg,transf||[]); });
  const cli={
    async iniciar(){ try{ const url=URL.createObjectURL(new Blob([WSRC],{type:'text/javascript'})); w=new Worker(url);
        w.onmessage=ev=>{ const r=ev.data, e=espera; espera=null; if(!e) return; if(r&&r.erro) e.err(new Error(r.erro)); else e.ok(r.res); };
        w.onerror=ev=>{ const e=espera; espera=null; if(e) e.err(new Error((ev&&ev.message)||'erro no processamento em segundo plano')); };
        await Promise.race([pergunta({cmd:'ini',u:location.origin}),new Promise((_,no)=>setTimeout(()=>no(new Error('tempo')),20000))]); }
      catch(e){ console.warn('Worker indisponível, usando a tela principal:',e); try{ if(w) w.terminate(); }catch(_){} w=null; modo='principal'; await bibliotecas(); } },
    modo:()=>modo,
    async ler(buf,nome){ if(w) return pergunta({cmd:'ler',buf,nome},[buf]);
      await new Promise(r=>setTimeout(r,60)); D=root.DwgLeitor.lerBuffer(root.TCDWG,buf); D.__arquivo=nome; return DI.resumo(D); },
    async gerar(op,fundo){ if(w) return pergunta({cmd:'gerar',op,fundo}); await new Promise(r=>setTimeout(r,60)); return DI.executar(D,op,fundo); },
    fim(){ try{ if(w) w.terminate(); }catch(_){} w=null; D=null; } };
  return cli; }

DI.abrir=function(cfg){
  cfg=cfg||{}; const cli=criaCliente();
  const old=document.getElementById('dwgimp'); if(old) old.remove();
  const ov=document.createElement('div'); ov.id='dwgimp';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,22,32,.55);display:flex;align-items:center;justify-content:center;padding:8px;font-family:system-ui,sans-serif';
  ov.innerHTML='<div style="background:var(--surface,#fff);color:var(--fg,#14202e);border-radius:12px;max-width:1040px;width:100%;height:calc(100vh - 16px);max-height:calc(100vh - 16px);display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)">'+
    '<div style="padding:12px 18px;border-bottom:1px solid #d6d9de;display:flex;align-items:center;gap:10px"><b style="font-size:16px;flex:1">📥 Importar DWG — escolha as camadas</b><button type="button" id="dwgimp-x" style="font-size:18px;border:0;background:none;cursor:pointer">✕</button></div>'+
    '<div id="dwgimp-corpo" style="padding:12px 18px;overflow:auto;flex:1;min-height:0;display:flex;flex-direction:column"></div>'+
    '<div id="dwgimp-rod" style="padding:10px 18px;border-top:1px solid #d6d9de;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"></div></div>';
  document.body.appendChild(ov);
  const corpo=ov.querySelector('#dwgimp-corpo'), rod=ov.querySelector('#dwgimp-rod');
  const fechar=()=>{ cli.fim(); ov.remove(); }; ov.querySelector('#dwgimp-x').onclick=fechar;
  /* mensagem de espera com cronômetro (mostra que o programa não travou) */
  function espera(txt){ const t0=Date.now(); const el=corpo.querySelector('#dwgimp-msg')||corpo; const pinta=()=>{ el.innerHTML='<span style="display:inline-block;width:12px;height:12px;border:2px solid #94a3b8;border-top-color:#1d4ed8;border-radius:50%;animation:dwgimpg 0.8s linear infinite;vertical-align:-2px;margin-right:6px"></span>'+txt+' <b>'+Math.round((Date.now()-t0)/1000)+' s</b>'; };
    if(!document.getElementById('dwgimp-css')){ const st=document.createElement('style'); st.id='dwgimp-css'; st.textContent='@keyframes dwgimpg{to{transform:rotate(360deg)}}'; document.head.appendChild(st); }
    pinta(); const iv=setInterval(pinta,500); return ()=>clearInterval(iv); }
  corpo.innerHTML='<p style="margin:0 0 10px">Escolha o arquivo <b>.dwg</b> (AutoCAD 2000 a 2018). O arquivo é lido no seu computador; nada é enviado.</p><input type="file" id="dwgimp-arq" accept=".dwg">';
  ov.querySelector('#dwgimp-arq').onchange=async ev=>{ const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    corpo.innerHTML='<p>Lendo <b>'+esc(f.name)+'</b> ('+(f.size/1048576).toFixed(1)+' MB)… arquivos grandes levam de 10 a 60 segundos; a tela continua livre.</p><div id="dwgimp-msg"></div>';
    const para=espera('Lendo o desenho…'); let R=null;
    try{ await cli.iniciar(); const buf=await f.arrayBuffer(); R=await cli.ler(buf,f.name); }
    catch(e){ para(); console.error(e); corpo.innerHTML='<p style="color:#b91c1c">Não consegui ler este DWG: '+esc(e&&e.message||e)+'</p>'; return; }
    /* O levantamento de Verdes Mares possui 19 eixos de projeto já ajustados
       (tangentes/curvas e cotas reais) no JSON distribuído com o programa.
       O DWG bruto traz esses eixos espalhados em camadas de desenho, portanto
       a leitura genérica enxerga somente parte das ruas. */
    if(cfg.projetoCompleto&&/verdes.?mares/i.test(f.name)){ try{
      const rp=await fetch(cfg.projetoCompleto,{cache:'no-cache'}); if(!rp.ok) throw new Error('HTTP '+rp.status);
      const p=await rp.json(), T=p.topo||{}, P=p.planta3d||{};
      if(Array.isArray(T.ruas)&&T.ruas.length){ R.completo={ruas:T.ruas,fundo:P.fundo||null,cotas:P.cotas||null,origem:P.origemUTM||null,arquivo:f.name,relatorio:['Projeto completo de Verdes Mares: '+T.ruas.length+' ruas e '+T.ruas.reduce((n,r)=>n+(r.rows||[]).length,0)+' seções com cotas reais.']}; }
    }catch(e){ console.warn('Projeto completo não disponível; usando seleção das camadas do DWG:',e); } }
    para(); mostra(R); };
  function mostra(R){
    const cams=R.cam.slice().sort((a,b)=>b.total-a.total||a.n.localeCompare(b.n,'pt'));
    const temBorda=cams.some(c=>c.nl&&/^quadras?$|^[&#%@]?meio.?fio$/i.test(c.n));   /* com bordas de quadra, o eixo é calculado e os eixos esquemáticos do projeto não entram */
    const ck=(k,n,on)=>'<input type="checkbox" data-k="'+k+'" data-n="'+esc(n)+'"'+(on?' checked':'')+'>';
    const vazias=cams.filter(c=>!c.total).length;
    let h='<p style="margin:0 0 8px"><b>'+esc(R.arquivo)+'</b> — '+cams.length+' camadas'+(vazias?' ('+vazias+' sem desenho)':'')+(R.xref?' · '+R.xref+' referência(s) externa(s) ignorada(s)':'')+'. Marque o que vai ser importado.</p>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><button type="button" class="btn-add" data-ac="sug">Marcar sugeridas</button><button type="button" class="btn-add" data-ac="nada">Limpar tudo</button>'+
      '<input id="dwgimp-filtro" type="search" placeholder="Filtrar camada…" style="padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;width:170px">'+
      '<label style="margin-left:auto;font-size:13px">Largura da pista padrão (m) <input id="dwgimp-larg" type="number" step="0.1" value="7" style="width:60px"></label>'+
      '<label style="font-size:13px"><input id="dwgimp-est" type="checkbox" checked> Estender cada rua até o cruzamento mais próximo, no máximo <input id="dwgimp-perto" type="number" min="0" step="1" value="25" title="Distância máxima para procurar o próximo cruzamento, em metros" style="width:64px"> m</label></div>'+
      '<div style="overflow:auto;flex:1;min-height:180px;border:1px solid #d6d9de;border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead style="position:sticky;top:0;background:var(--surface2,#f1f3f5);z-index:1"><tr><th style="text-align:left;padding:6px 8px">Camada</th><th style="text-align:left">Conteúdo</th><th title="Desenho de fundo da planta">Fundo</th><th title="Cada linha da camada vira uma rua">Eixo de rua</th><th title="Calcula o eixo da rua pela linha do meio entre as duas bordas (quadras/meio-fio) e mede a largura da pista">Borda de pista</th><th title="Pontos com cota real usados nas seções">Cotas</th></tr></thead><tbody>';
    cams.forEach(c=>{ const n=c.n, cont=[]; if(c.nl) cont.push(c.nl+' linhas'); if(c.pc) cont.push(c.pc+' pontos c/ cota'); if(c.nt) cont.push(c.nt+' textos'); const ob=c.total-c.nl-c.nt-c.pc; if(ob>0) cont.push(ob+' outros'); if(!c.total) cont.push('sem desenho');
      h+='<tr data-cam="'+esc(n.toLowerCase())+'" style="border-top:1px solid #e5e7eb'+(c.total?'':';color:#94a3b8')+'"><td style="padding:4px 8px;font-weight:600">'+esc(n)+'</td><td style="color:#64748b">'+esc(cont.join(' · '))+'</td><td style="text-align:center">'+(c.nl?ck('fundo',n,SUGERE_FUNDO.indexOf(n)>=0):'')+'</td><td style="text-align:center">'+(c.nl?ck('eixo',n,eixoSugerido(n)&&!temBorda):'')+'</td><td style="text-align:center">'+(c.nl?ck('borda',n,/^quadras?$|^[&#%@]?meio.?fio$/i.test(n)):'')+'</td><td style="text-align:center">'+(c.pc?ck('cota',n,c.pc>0):'')+'</td></tr>'; });
    h+='</tbody></table></div><div id="dwgimp-msg" style="margin-top:8px;font-size:13px;color:#475569;min-height:20px"></div>';
    corpo.innerHTML=h;
    if(R.completo){
      const aviso=document.createElement('div'); aviso.style.cssText='margin:0 0 10px;padding:10px 12px;border:1px solid #2563eb;border-radius:8px;background:#eff6ff;color:#17365d';
      aviso.innerHTML='<b>Projeto completo reconhecido.</b> Este levantamento possui um projeto de Pavimento Flexível preparado com <b>'+R.completo.ruas.length+' ruas</b> e cotas reais. '+
        '<label style="margin-left:8px">Extensão máxima (m) <input id="dwgimp-perto-completo" type="number" min="0" step="1" value="25" style="width:64px"></label> '+
        '<button type="button" class="btn-add" id="dwgimp-completo" style="margin-left:8px;background:#1d4ed8;color:#fff;border-color:transparent">Importar projeto completo</button>';
      corpo.insertBefore(aviso,corpo.firstChild);
      aviso.querySelector('#dwgimp-completo').onclick=async()=>{
        const bt=aviso.querySelector('#dwgimp-completo'); const n0=parseFloat(aviso.querySelector('#dwgimp-perto-completo').value); const perto=isFinite(n0)&&n0>=0?n0:80; bt.disabled=true; const p2=espera('Aplicando as '+R.completo.ruas.length+' ruas na Topografia, planta e 3D…');
        try{ const completo=DI.estenderProjeto(R.completo,perto); if(cfg.aplicar) cfg.aplicar(completo); DI.ultimo=completo; p2(); mostraResumo(completo); }
        catch(e){ p2(); bt.disabled=false; console.error(e); corpo.querySelector('#dwgimp-msg').textContent='Erro ao aplicar o projeto completo: '+(e&&e.message||e); }
      };
    }
    const marcados=k=>[...corpo.querySelectorAll('input[data-k="'+k+'"]:checked')].map(i=>i.dataset.n);
    corpo.querySelector('[data-ac="sug"]').onclick=()=>corpo.querySelectorAll('input[data-k]').forEach(i=>{ i.checked=(i.dataset.k==='fundo'&&SUGERE_FUNDO.indexOf(i.dataset.n)>=0)||(i.dataset.k==='cota'&&(cams.find(c=>c.n===i.dataset.n)||{}).pc>0)||(i.dataset.k==='eixo'&&eixoSugerido(i.dataset.n)&&!temBorda)||(i.dataset.k==='borda'&&/^quadras?$|^[&#%@]?meio.?fio$/i.test(i.dataset.n)); });
    corpo.querySelector('[data-ac="nada"]').onclick=()=>corpo.querySelectorAll('input[data-k]').forEach(i=>{ i.checked=false; });
    corpo.querySelector('#dwgimp-filtro').oninput=ev=>{ const q=ev.target.value.trim().toLowerCase(); corpo.querySelectorAll('tr[data-cam]').forEach(tr=>{ tr.style.display=(!q||tr.dataset.cam.indexOf(q)>=0)?'':'none'; }); };
    rod.innerHTML='<button type="button" class="btn-add" id="dwgimp-canc">Cancelar</button><button type="button" class="btn-add" id="dwgimp-ok" style="background:var(--accent,#1d4ed8);color:#fff;border-color:transparent">Importar camadas marcadas</button>';
    rod.querySelector('#dwgimp-canc').onclick=fechar;
    const bt=rod.querySelector('#dwgimp-ok');
    bt.onclick=async()=>{ const msg=corpo.querySelector('#dwgimp-msg'); const fundo=marcados('fundo'), eixo=marcados('eixo'), cota=marcados('cota'), borda=marcados('borda');
      if(!fundo.length&&!eixo.length&&!borda.length) return msg.textContent='Marque pelo menos uma camada em Fundo ou Eixo de rua.';
      if((eixo.length||borda.length)&&!cota.length) return msg.textContent='Para gerar as ruas, marque também as camadas de Cotas (pontos com cota real).';
      const pertoRaw=parseFloat(corpo.querySelector('#dwgimp-perto').value); const perto=isFinite(pertoRaw)&&pertoRaw>=0?pertoRaw:25;
      const op={eixos:eixo,bordas:borda,cotas:cota,larg:parseFloat(corpo.querySelector('#dwgimp-larg').value)||7,estender:corpo.querySelector('#dwgimp-est').checked,perto,origem:cfg.origem||null};
      bt.disabled=true; const para=espera('Gerando as ruas e o fundo da planta…'); let dados=null;
      try{ dados=await cli.gerar(op,fundo); }
      catch(e){ para(); bt.disabled=false; console.error(e); return msg.textContent='Erro ao gerar: '+(e&&e.message||e); }
      para();
      if((eixo.length||borda.length)&&!dados.ruas.length){ bt.disabled=false; return msg.textContent=dados.relatorio.join(' ')||'Nenhuma rua gerada.'; }
      const p2=espera('Aplicando no projeto (tabela de topografia, planta e 3D)…'); await new Promise(r=>setTimeout(r,50));
      try{ if(cfg.aplicar) cfg.aplicar(dados); }catch(e){ p2(); bt.disabled=false; if(e&&e.message==='cancelado') return msg.textContent='Importação cancelada; nada foi alterado.'; console.error(e); return msg.textContent='Erro ao aplicar no projeto: '+(e&&e.message||e); }
      p2(); DI.ultimo=dados; mostraResumo(dados); }; }
  function mostraResumo(dados){
    corpo.innerHTML='<p style="margin:0 0 8px"><b>Importado.</b> '+(dados.ruas.length?dados.ruas.length+' rua(s) gerada(s) e a tabela de Topografia preenchida. ':'')+(dados.fundo?dados.fundo.length+' camada(s) de fundo na planta.':'')+'</p>'+
      (dados.relatorio.length?'<div style="flex:1;min-height:0;overflow:auto;font-size:12.5px;border:1px solid #d6d9de;border-radius:8px;padding:8px 10px"><b>Relatório (confira as pontas):</b><ul style="margin:6px 0 0 16px;padding:0">'+dados.relatorio.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul></div>':'');
    rod.innerHTML='<button type="button" class="btn-add" id="dwgimp-fim" style="background:var(--accent,#1d4ed8);color:#fff;border-color:transparent">Fechar</button>'; rod.querySelector('#dwgimp-fim').onclick=fechar; }
};
root.DwgImp=DI; if(typeof module!=='undefined'&&module.exports) module.exports=DI;
})(typeof window!=='undefined'?window:globalThis);
