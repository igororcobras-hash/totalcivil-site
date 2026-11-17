/* ══════════════════════════════════════════════════════════════════════
   PF-PLANTA3D · Planta baixa e 3D do programa Dimensionamento de Pavimentos Flexíveis
   ----------------------------------------------------------------------
   Reaproveita o bloco da aba "Planta e 3D" do Pavimento Intertravado (planta técnica
   em SVG, 3D em three.js r128, níveis, quadro de camadas, legenda, carimbo, céu, sombras).
   Este arquivo tem três partes:
     1) ADAPTADOR: monta, a partir da aba Topografia do Flexível, as "ruas" que o bloco
        do Intertravado espera (via principal + ruas transversais definidas na própria aba);
     2) BLOCO DO INTERTRAVADO, com as trocas de texto/material para o pavimento asfáltico;
     3) NOVO: esquinas com raio (concordância), ruas transversais e sinalização viária
        conforme o Manual Brasileiro de Sinalização de Trânsito (CONTRAN):
        Vol. IV (horizontal) – LFO/LBO/LRE/FTP – e Vol. I (vertical) – R-1, R-2, R-19.
   Depende do index.html do pavimento: _R, secaoParams(), getTopoData(), fmt(),
   triggerDownload(), calcTopo(), _mf.
══════════════════════════════════════════════════════════════════════ */

/* ── EIXO EM CURVA (traçado do levantamento) ── pontos em metros, norte do desenho para cima */
function plLayCurva(){
  const E=_plT.eixo; if(!Array.isArray(E)||E.length<2) return null;
  const rm0=plLinhasMain(), s00=rm0.length?+rm0[0].est:0;
  return plLayPts(E,s00,'main',false,plLargMed(rm0));
}
function plLargMed(rows){ const L=(rows||[]).map(r=>+r.larg).filter(x=>x>0).sort((a,b)=>a-b); return L.length?L[L.length>>1]:0; }
/* PAV-TRACADO: layout de QUALQUER eixo em polilinha (cada rua do bairro tem o seu); E em metros, s00 = estaca do 1º ponto */
function plLayPts(E,s00,chave,jaProj,larg){
  _pl.lcm=_pl.lcm||{}; const v0=plVis(), alin=v0.alinha!==0&&typeof Alinh!=='undefined'&&!jaProj;
  const ca=_pl.lcm[chave]; if(ca&&ca.E===E&&ca.s0===s00&&ca.alin===alin&&ca.jp===!!jaProj&&ca.lg===larg) return ca.lay;
  const Cr=[0]; for(let i=1;i<E.length;i++) Cr.push(Cr[i-1]+Math.hypot(E[i][0]-E[i-1][0],E[i][1]-E[i-1][1])); const Lr=Cr[Cr.length-1];
  const reamostra=A=>{ const Ca=[0]; for(let i=1;i<A.length;i++) Ca.push(Ca[i-1]+Math.hypot(A[i][0]-A[i-1][0],A[i][1]-A[i-1][1])); const La=Ca[Ca.length-1]; const Q=[]; let j=0;
    for(let s=0;s<=La+1e-9;s+=1){ while(j<A.length-2&&Ca[j+1]<s) j++; const t=(s-Ca[j])/((Ca[j+1]-Ca[j])||1); Q.push([A[j][0]+(A[j+1][0]-A[j][0])*t,A[j][1]+(A[j+1][1]-A[j][1])*t]); }
    const u=A[A.length-1], q=Q[Q.length-1]; if(Math.hypot(u[0]-q[0],u[1]-q[1])>1e-6) Q.push(u); return Q; };
  let P, fw=null, iv=null, al=null;
  if(alin){ /* PAV-EIXO: eixo do PROJETO = tangentes retas + curvas circulares (alinhamento.js); os pontos levantados são só o terreno */
    al=Alinh.alinhar(E,{larg:larg||0}); P=reamostra(al.eixo);
    /* estaca: a dos pontos levantados (medida no zig-zag) passa para a medida ao longo do eixo do projeto */
    const S=E.map(p=>al.proj(p).s); for(let i=1;i<S.length;i++) if(S[i]<S[i-1]+0.01) S[i]=S[i-1]+0.01;
    const lin=(X,Y,x)=>{ const n=X.length; if(n<2) return x; if(x<=X[0]) return Y[0]+(x-X[0]); if(x>=X[n-1]) return Y[n-1]+(x-X[n-1]); let k=0; while(k<n-2&&X[k+1]<x) k++; const t=(x-X[k])/((X[k+1]-X[k])||1); return Y[k]+(Y[k+1]-Y[k])*t; };
    fw=x=>lin(Cr,S,x); iv=y=>lin(S,Cr,y);
  } else if(jaProj){ P=reamostra(E); }
  else { /* sem alinhamento: reamostra a 1 m e suaviza (média móvel ±5 m, 3 passadas) */
    let Q=reamostra(E);
    for(let it=0;it<3;it++){ Q=Q.map((p,i)=>{ if(i===0||i===Q.length-1) return p; const a=Math.max(0,i-5), b=Math.min(Q.length-1,i+5); let x=0,y=0; for(let k=a;k<=b;k++){ x+=Q[k][0]; y+=Q[k][1]; } return [x/(b-a+1),y/(b-a+1)]; }); }
    P=Q; }
  const C=[0]; for(let i=1;i<P.length;i++) C.push(C[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
  const Lt=C[C.length-1], s0=s00;
  if(!fw){ const kL=(jaProj||Lr<=0)?1:Lt/Lr; fw=x=>x*kL; iv=y=>y/kL; }
  const seg=s=>{ let i=0; while(i<P.length-2&&C[i+1]<s) i++; return i; };
  const pt=s=>{ if(s<=0){ const d=dir(0); return [P[0][0]+d[0]*s,P[0][1]+d[1]*s]; } if(s>=Lt){ const d=dir(Lt); return [P[P.length-1][0]+d[0]*(s-Lt),P[P.length-1][1]+d[1]*(s-Lt)]; }
    const i=seg(s), t=(s-C[i])/((C[i+1]-C[i])||1); return [P[i][0]+(P[i+1][0]-P[i][0])*t,P[i][1]+(P[i+1][1]-P[i][1])*t]; };
  const raw=s=>{ const i=seg(Math.max(0,Math.min(Lt,s))); const dx=P[i+1][0]-P[i][0], dy=P[i+1][1]-P[i][1], l=Math.hypot(dx,dy)||1; return [dx/l,dy/l]; };
  function dir(s){ let x=0,y=0; for(const o of [-1.5,-0.75,0,0.75,1.5]){ const d=raw(s+o); x+=d[0]; y+=d[1]; } const l=Math.hypot(x,y)||1; return [x/l,y/l]; }
  const ch=[P[P.length-1][0]-P[0][0],P[P.length-1][1]-P[0][1]], cl=Math.hypot(ch[0],ch[1])||1, d=[ch[0]/cl,ch[1]/cl];
  const pos2=s=>{ const p=pt(fw(s-s0)); p._s=s; return p; };
  const lay={curva:true,A:pos2(s0),sA:s0,d,n:[-d[1],d[0]],pos:pos2,dirAt:s=>dir(fw(s-s0)),nAt:s=>{ const q=dir(fw(s-s0)); return [-q[1],q[0]]; },P,C,s0,Lt,kL:1,fw,iv,alinh:al,E};
  _pl.lcm[chave]={E,s0:s00,alin,jp:!!jaProj,lg:larg,lay}; return lay;
}
/* projeção de um ponto no eixo: estaca e afastamento (+ esquerda) */
function plProj(ly,p){
  if(!ly.curva){ const dx=p[0]-ly.A[0], dy=p[1]-ly.A[1]; return {s:dx*ly.d[0]+dy*ly.d[1]+ly.sA,lat:dx*ly.n[0]+dy*ly.n[1]}; }
  const P=ly.P, C=ly.C; let best=1e18, s=0, lat=0;
  for(let i=0;i<P.length-1;i++){ const ax=P[i][0], ay=P[i][1], ex=P[i+1][0]-ax, ey=P[i+1][1]-ay, l2=ex*ex+ey*ey||1e-12;
    let t=((p[0]-ax)*ex+(p[1]-ay)*ey)/l2; if(i>0) t=Math.max(0,t); if(i<P.length-2) t=Math.min(1,t);
    const qx=ax+ex*t, qy=ay+ey*t, dd=(p[0]-qx)**2+(p[1]-qy)**2;
    if(dd<best){ best=dd; const l=Math.sqrt(l2); s=C[i]+t*l; lat=((p[0]-ax)*(-ey)+(p[1]-ay)*ex)/l; } }
  return {s:(ly.iv?ly.iv(s):s/(ly.kL||1))+ly.s0,lat}; }
/* todas as projeções “de cada braço” da curva (mínimos locais da distância): o terreno mistura as duas
   no lado de dentro de uma curva, sem degrau onde o ponto mais próximo troca de braço */
function plProjAll(ly,p){
  if(!ly.curva) return [plProj(ly,p)];
  const P=ly.P, C=ly.C, n=P.length-1, ds=new Float64Array(n), ts=new Float64Array(n);
  for(let i=0;i<n;i++){ const ax=P[i][0], ay=P[i][1], ex=P[i+1][0]-ax, ey=P[i+1][1]-ay, l2=ex*ex+ey*ey||1e-12; let t=((p[0]-ax)*ex+(p[1]-ay)*ey)/l2; if(i>0) t=Math.max(0,t); if(i<n-1) t=Math.min(1,t); ts[i]=t; ds[i]=(p[0]-ax-ex*t)**2+(p[1]-ay-ey*t)**2; }
  let mn=1e18; for(let i=0;i<n;i++) mn=Math.min(mn,ds[i]); const lim=(Math.sqrt(mn)+40)**2, out=[]; /* peso some suave até 40 m além do braço mais próximo */
  for(let i=0;i<n;i++){ if(ds[i]>lim) continue; if((i>0&&ds[i-1]<=ds[i])||(i<n-1&&ds[i+1]<ds[i])) continue; /* empate no vértice conta uma vez só */
    const ax=P[i][0], ay=P[i][1], ex=P[i+1][0]-ax, ey=P[i+1][1]-ay, l=Math.hypot(ex,ey)||1e-9;
    const fd=Math.max(0,1-(Math.sqrt(ds[i])-Math.sqrt(mn))/40); out.push({s:(ly.iv?ly.iv(C[i]+ts[i]*l):(C[i]+ts[i]*l)/(ly.kL||1))+ly.s0,lat:((p[0]-ax)*(-ey)+(p[1]-ay)*ex)/l,f:fd*fd*(3-2*fd)}); }
  return out.length?out:[plProj(ly,p)]; }
function plNrm(d,s){ const L=d.lay; if(!L.curva) return L.n; const e=(s&&s.est!=null)?s.est:(s&&s.c&&s.c._s!=null?s.c._s:null); return e==null?L.n:L.nAt(e); }
function plDirE(d,e){ return d.lay.dirAt?d.lay.dirAt(e):d.lay.d; }

/* ── 1) ADAPTADOR ───────────────────────────────────────────────────── */
var ruas=[];
let _cal={ativo:false,tipo:'concreto',larg:0,esp:10,decl:2};
const PL_T_PADRAO={fundo:[],transv:[],sinal:{on:1,eixo:'LFO-2',vel:40,lbo:1,ftp:1,lre:1,placa:'R-1',r19:1,adv:1},eixo:null,raioBairro:6,geo:{modo:'ll',lat:'',lng:'',e:'',n:'',zona:24,rot:0,est2:'',lat2:'',lng2:'',e2:'',n2:''}};
let _plT=JSON.parse(JSON.stringify(PL_T_PADRAO));
function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg,err){ const el=document.getElementById('pl-msg'); if(!el) return; el.textContent=msg; el.style.color=err?'#b91c1c':''; clearTimeout(el._t); el._t=setTimeout(()=>{ el.textContent=''; el.style.color=''; },4500); }
function carimbo(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes()); }
function estacaTxt(m){ const n=Math.floor(m/20+1e-9); return n+' + '+fmt(m-20*n,2); }
function plParseEst(t){
  t=String(t==null?'':t).trim().replace(/\s/g,'').replace(/m$/i,''); if(t==='') return NaN;
  if(t.indexOf('+')>0){ const p=t.split('+'); const a=parseFloat(p[0].replace(',','.')), b=parseFloat(p[1].replace(',','.')); return (isNaN(a)||isNaN(b))?NaN:+(a*20+b).toFixed(3); }
  const x=parseFloat(t.replace(',','.')); return isNaN(x)?NaN:x;
}
function nomeRua(i){ const r=ruas[i]; return r?(r.nome||('Rua '+(i+1))):''; }
function ruaIdx(id){ return ruas.findIndex(r=>r.id===id); }
function itpRows(rows,est,k){
  if(!rows||!rows.length) return null;
  const a=rows.filter(r=>r[k]!==''&&r[k]!=null&&!isNaN(r[k])); if(!a.length) return null;
  if(est<=a[0].est) return +a[0][k]; if(est>=a[a.length-1].est) return +a[a.length-1][k];
  for(let i=0;i<a.length-1;i++) if(est>=a[i].est-1e-9&&est<=a[i+1].est+1e-9){ const d=a[i+1].est-a[i].est; return d<=0?+a[i][k]:+a[i][k]+(+a[i+1][k]-+a[i][k])*(est-a[i].est)/d; }
  return null;
}
/* "resultado" e "_topo" do Intertravado = resultados do Flexível (_R) */
Object.defineProperty(window,'resultado',{configurable:true,get(){ return (typeof _R!=='undefined'&&_R&&_R.e_total>0)?_R:null; }});
Object.defineProperty(window,'_topo',{configurable:true,get(){ return plAreaInfo(); }});
function volumesCamadas(){ return []; } /* o quadro usa área × espessura de cada camada acesa */

/* linhas válidas da Topografia (via principal), em ordem de estaca */
function plLinhasMain(){
  if(typeof getTopoData!=='function') return [];
  return getTopoData().filter(r=>r.est!==''&&r.larg!==''&&+r.larg>0&&(r.gr!==''||r.tc!=='')).sort((a,b)=>a.est-b.est);
}
/* monta as ruas: [0] = via principal (Topografia); [1..] = transversais da aba Planta e 3D */
/* PAV-TRACADO-b: eixos retos pelos cruzamentos (quando o projeto não tem as coordenadas das ruas).
   A 1ª rua (a com mais cruzamentos) fica na horizontal; rua que cruza 2 ou mais ruas já postas passa pelos pontos de cruzamento;
   rua que cruza só uma sai perpendicular; rua sem cruzamento fica paralela, afastada 60 m. */
function plEixosAprox(mr){
  const ex=r=>{ const e=(r.rows||[]).filter(x=>x.est!==''&&x.est!=null).map(x=>+x.est).filter(isFinite); return e.length?[Math.min(...e),Math.max(...e)]:null; };
  const P={}, out={}, id=r=>String(r.id), byId={}; mr.forEach(r=>{ byId[id(r)]=r; });
  const pos=(q,s)=>[q.A[0]+(s-q.s0)*q.d[0],q.A[1]+(s-q.s0)*q.d[1]];
  const cr=r=>(r.cruz||[]).filter(c=>P[String(c.rua)]);
  const ord=mr.slice().sort((a,b)=>(b.cruz||[]).length-(a.cruz||[]).length);
  if(!ord.length) return out; const raiz=id(ord[0]); P[raiz]={A:[0,0],s0:0,d:[1,0]};
  let guard=0, par=0; const lado={};
  while(Object.keys(P).length<mr.length&&guard++<200){
    const falta=ord.filter(r=>!P[id(r)]); let r=falta.find(r=>{ const c=cr(r); return c.length>=2&&Math.abs(+c[0].est-+c[c.length-1].est)>1; }), q=null;
    if(r){ /* reta ajustada (mínimos quadrados) pelos pontos de cruzamento: x(s), y(s) */
      const c=cr(r), pts=c.map(o=>({s:+o.est,p:pos(P[String(o.rua)],+o.estOutra)})), n=pts.length, ms=pts.reduce((t,o)=>t+o.s,0)/n, mx=pts.reduce((t,o)=>t+o.p[0],0)/n, my=pts.reduce((t,o)=>t+o.p[1],0)/n;
      let ss=0,sx=0,sy=0; pts.forEach(o=>{ const u=o.s-ms; ss+=u*u; sx+=u*(o.p[0]-mx); sy+=u*(o.p[1]-my); }); const L=Math.hypot(sx,sy)||1;
      q={A:[mx,my],s0:ms,d:[sx/L,sy/L]}; }
    else { /* uma só ligação: primeiro as que cruzam a 1ª rua; entre elas, a de menos cruzamentos (rua transversal antes da paralela) */
      const um=falta.filter(r=>cr(r).length===1).sort((a,b)=>((String(cr(a)[0].rua)===raiz?0:1)-(String(cr(b)[0].rua)===raiz?0:1))||((a.cruz||[]).length-(b.cruz||[]).length)); r=um[0];
      if(r){ const c=cr(r)[0], pi=P[String(c.rua)], ki=String(c.rua);
        /* sentido da rua perpendicular: as outras ruas que ela cruza ficam sempre do mesmo lado da rua já posta (a 1ª decide) */
        let sg=1; const ot=(r.cruz||[]).filter(o=>String(o.rua)!==ki&&!P[String(o.rua)]);
        if(ot.length){ const o=ot[0], dd=Math.sign((+o.est)-(+c.est))||1, kk=ki+'|'+String(o.rua); if(lado[kk]==null) lado[kk]=dd; sg=lado[kk]*dd; }
        q={A:pos(pi,+c.estOutra),s0:+c.est,d:[-pi.d[1]*sg,pi.d[0]*sg]}; }
      else { r=falta[0]; par++; q={A:[0,-60*par],s0:0,d:[1,0]}; } }
    P[id(r)]=q;
  }
  mr.forEach(r=>{ const q=P[id(r)], e=ex(r); if(!q||!e||e[1]-e[0]<0.5) return; const a=pos(q,e[0]), b=pos(q,e[1]); out[id(r)]=[[+a[0].toFixed(3),+a[1].toFixed(3)],[+b[0].toFixed(3),+b[1].toFixed(3)]]; });
  return out;
}
function ruasSinc(){
  const old={}; ruas.forEach(r=>{ old[r.id]=r; });
  /* PAV-TRACADO: projeto com VÁRIAS RUAS, cada uma com o seu eixo real (do levantamento/DWG): todas entram na planta e no 3D, nas posições reais */
  { const mr=(typeof window.__pvRuas==='function')?window.__pvRuas():null;
    let com=(mr||[]).filter(r=>Array.isArray(r.eixo)&&r.eixo.length>1); _pl.aprox=false;
    /* sem o eixo real em todas: traçado APROXIMADO pelos cruzamentos (ruas retas, cada uma ligada às outras nas estacas do quadro de cruzamentos) */
    if(mr&&mr.length>1&&com.length<mr.length){ const ap=plEixosAprox(mr); com=mr.map(r=>Object.assign({},r,{eixo:ap[r.id]})).filter(r=>r.eixo); _pl.aprox=true; }
    if(com.length>1){
      ruas=com.map(r=>{ const rows=(r.rows||[]).filter(x=>x.est!==''&&x.larg!==''&&+x.larg>0&&(x.gr!==''||x.tc!=='')).sort((a,b)=>a.est-b.est)
          .map(x=>({est:+x.est,tEsq:x.te,tEixo:x.tc,tDir:x.td,greide:x.gr!==''?x.gr:x.tc,larg:+x.larg,n:x.n}));
        return {id:'m'+r.id,nome:r.nome,rows,eixo:r.eixo,eixoProj:!!r.eixoProj,multi:true,obj:(old['m'+r.id]&&old['m'+r.id].obj)||[]}; });
      return; } }
  const rm=plLinhasMain().map(r=>({est:+r.est,tEsq:r.te,tEixo:r.tc,tDir:r.td,greide:r.gr!==''?r.gr:r.tc,larg:+r.larg,n:r.n}));
  const nm=((document.getElementById('logradouro')||{}).value||'').trim()||'Via principal';
  const out=[{id:'r0',nome:nm,rows:rm,obj:(old.r0&&old.r0.obj)||[]}];
  if(rm.length>1){
    const P=secaoParams(), e0=rm[0].est, eN=rm[rm.length-1].est;
    _plT.transv.forEach((t,k)=>{
      const s=Math.min(eN,Math.max(e0,+t.est||0)), sg=t.lado==='dir'?-1:1;
      const gr=itpRows(rm,s,'greide'), hb=(itpRows(rm,s,'larg')||0)/2, ce=sg>0?P.cEsq:P.cDir;
      const gEdge=gr-hb*ce, bs=Math.max(1,(+t.larg||6)/2), cs=(P.cEsq+P.cDir)/2, gs=+(gEdge+bs*cs).toFixed(3); /* bordas da transversal na cota da borda da principal */
      const tl=itpRows(rm,s,sg>0?'tEsq':'tDir'), tn=tl==null?gs:+tl.toFixed(3);
      const ang=Math.max(15,Math.min(165,+t.ang||90)), comp=Math.max(hb/Math.sin(ang*Math.PI/180)+bs+5,+t.comp||30), id='t'+k;
      /* boca da transversal: cada borda nasce na cota da borda da principal onde as duas se encontram
         (acompanha a rampa da principal) e volta ao abaulamento normal num trecho de transição */
      const al=sg*ang*Math.PI/180, sa=Math.sin(al), ca=Math.cos(al), bordaM=x=>{ const g=itpRows(rm,x,'greide'), l=(itpRows(rm,x,'larg')||0)/2; return g-l*ce; };
      const canto=kk=>{ const tt=(sg*hb-kk*bs*ca)/sa; return bordaM(s-kk*bs*sa+tt*ca); };
      const zE=+canto(1).toFixed(3), zD=+canto(-1).toFixed(3), eEdge=Math.max(0,sg*hb/sa), eTr=Math.min(comp-0.5,Math.max(eEdge,(sg*hb-bs*ca)/sa,(sg*hb+bs*ca)/sa)+Math.max(8,(+t.raio||0)+4));
      const lin=(e,o)=>Object.assign({est:+e.toFixed(3),tEsq:tn,tEixo:tn,tDir:tn,greide:gs,larg:bs*2},o||{});
      const bo={greide:+((zE+zD)/2).toFixed(3),gEsq:zE,gDir:zD}; /* na boca a seção é reta entre as bordas da principal (encosta sem degrau); o abaulamento volta na transição */
      const eMax=Math.max(eEdge,(sg*hb-bs*ca)/sa,(sg*hb+bs*ca)/sa); /* a borda da principal cruza a transversal entre e(−b) e e(+b) */
      const rows=[lin(0,Object.assign({cruz:{rua:'r0',est:s}},bo))]; if(eMax>0.05) rows.push(lin(eMax,bo)); rows.push(lin(eTr),lin(comp));
      out.push({id,nome:t.nome||('Transversal '+(k+1)),transv:true,cfg:Object.assign({},t,{estM:s,sg,bs,hb,ang,comp}),
        geo:{lado:sg<0?'dir':'esq',ang,dist:30},obj:(old[id]&&old[id].obj)||[],rows});
    });
  }
  ruas=out;
}
/* linhas no formato do Intertravado (gE/gD = bordas pelo caimento transversal) */
function plTopoLinhas(rows){
  const P=secaoParams(), num=x=>(x===''||x==null||isNaN(x))?null:+x;
  const comN=ruas.some(r=>r.multi&&r.rows===rows), princ=ruas[0]&&rows===ruas[0].rows, TL=(princ&&typeof _R!=='undefined'&&_R._topo&&_R._topo.linhas)||[];
  let Nv=0; /* PAV-N-ESTACA: N por estaca (vazio = o da estaca de cima; transversais = N geral) */
  return (rows||[]).map((row,i)=>{
    if((princ||comN)&&+row.n>0) Nv=+row.n;
    const E=typeof estruturaLinha==='function'?estruturaLinha((princ||comN)&&Nv>0?Nv:0):null;
    const L={i,est:+row.est||0,estr:E,te:num(row.tEsq),tc:num(row.tEixo),td:num(row.tDir),gr:num(row.greide),larg:+row.larg||0,na:null,sit:'—',form:null,gE:null,gD:null,calE:0,calD:0,calFimE:0,calFimD:0};
    if(L.gr!==null){ const hb=L.larg/2; L.form=L.gr-(E?(E.e_total||0)/100:P.eTot); L.gE=num(row.gEsq)!==null?+row.gEsq:+(L.gr-hb*P.cEsq).toFixed(3); L.gD=num(row.gDir)!==null?+row.gDir:+(L.gr-hb*P.cDir).toFixed(3); }
    const m=TL.find(x=>Math.abs((+x.est)-L.est)<0.005); if(m&&m.sit) L.sit=m.sit;
    return L;
  });
}

/* ── 2) BLOCO DA PLANTA E 3D (origem: intertravado/index.html) ── */
/* ══════════════════════════════════════════════════════
   PLANTA BAIXA (técnica) E 3D (realista) · gerados da Topografia, dos greides e das camadas
   Eixos retos: a 1ª rua segue o eixo X; outra rua que cruza uma já posicionada sai com o ângulo
   escolhido no ponto do cruzamento; rua sem cruzamento fica paralela, afastada.
   “Níveis” = terreno natural, cada camada do pavimento (cota do topo + espessura) e o fundo (formação).
   Acender/apagar um nível mostra/oculta as cotas e o quadro na planta e a camada no 3D.
══════════════════════════════════════════════════════ */
let _pl={modo:'planta',vis:null,vb:null,drag:null,t3:null};
function plVisPadrao(){ return {ruas:{},fundo:1,entorno:1,pista:1,paginacao:0,eixo:1,mf:1,estacas:1,numeros:1,larguras:1,decl:1,cruz:0,corte:0,quadro:1,legenda:1,carimbo:1,sombras:1,rot3d:1,calcada:1,cenario:1,casas:0,muros:0,arvc:0,grama:0,objArv:0,objPoste:0,lamina:0,niv:{terreno:1},passo:1,alinha:1}; }
function plVis(){
  if(_pl.vis) return _pl.vis;
  let v=plVisPadrao();
  try{ const t=JSON.parse(localStorage.getItem('pav_planta_vis')||'null'); if(t&&typeof t==='object'){ v=Object.assign(v,t,{niv:Object.assign(v.niv,t.niv||{}),ruas:t.ruas||{}}); 
      /* PI-14: níveis separados — quem já tinha casas/vegetação/objetos desligados mantém */
      if(t.muros===undefined&&t.casas!==undefined) v.muros=t.casas; if(t.arvc===undefined&&t.veg!==undefined){ v.arvc=t.veg; v.grama=t.veg; } if(t.objArv===undefined&&t.objs!==undefined){ v.objArv=t.objs; v.objPoste=t.objs; } } }catch(e){}
  return _pl.vis=v;
}
function plSalvarVis(){ try{ localStorage.setItem('pav_planta_vis',JSON.stringify(plVis())); }catch(e){} }
function plEsc(c,f){ const m=/^#?([0-9a-f]{6})$/i.exec(c||''); if(!m) return c; const n=parseInt(m[1],16); const k=x=>Math.max(0,Math.min(255,Math.round(x*f))); return 'rgb('+k(n>>16)+','+k((n>>8)&255)+','+k(n&255)+')'; }
const PL_COD=['G','A','B','SB','R','R2'];
/* PAV-N-ESTACA: espessura e profundidade de cada camada NA ESTACA (n.canon = CBUQ, Base, Sub-base, Reforço) */
const PL_CANON=['CBUQ','Base','Sub-base','Reforço'], PL_EK={CBUQ:'e_ref',Base:'e_base','Sub-base':'e_sb','Reforço':'e_r'};
function plPF(s,n){ if(!s||!s.estr||!n||!n.canon) return n.prof||0; let a=0; for(const c of PL_CANON){ if(c===n.canon) break; a+=(s.estr[PL_EK[c]]||0)/100; } return a; }
function plES(s,n){ if(!s||!s.estr||!n||!n.canon) return n.esp||0; return (s.estr[PL_EK[n.canon]]||0)/100; }
function plNiveis(){
  let P=secaoParams(); const out=[{k:'terreno',nome:'Terreno natural',cod:'T',cor:'#6f8f3a',txt:'#3f5f1a',prof:null,esp:null}];
  if(window.__pvNvaria&&typeof estruturaLinha==='function'){ /* N varia: a lista de camadas é a união das estacas (espessura = a maior) */
    const mx={CBUQ:(_R.e_ref||0)/100,Base:(_R.e_base||0)/100,'Sub-base':(_R.e_sb||0)/100,'Reforço':(_R.e_r||0)/100};
    let Nv=0; plLinhasMain().forEach(r=>{ if(+r.n>0) Nv=+r.n; const E=estruturaLinha(Nv>0?Nv:0); PL_CANON.forEach(c=>{ mx[c]=Math.max(mx[c],(E[PL_EK[c]]||0)/100); }); });
    const cor={CBUQ:'#2b2b2b',Base:'#c49a3a','Sub-base':'#e2c477','Reforço':'#dcc9a2'};
    P=Object.assign({},P,{camadas:PL_CANON.filter(c=>mx[c]>0).map(c=>[c,mx[c],cor[c]]),eTot:PL_CANON.reduce((a,c)=>a+mx[c],0)});
  }
  let prof=0;
  P.camadas.forEach((c,k)=>{ out.push({k:'c'+k,canon:c[0],nome:c[0]+(k===0?' (greide = topo)':''),cod:(k===0?'G':(/areia/i.test(c[0])?'A':/sub/i.test(c[0])?'SB':/refor/i.test(c[0])?'R':'B')),cor:c[2],txt:plEsc(c[2],0.55),prof,esp:c[1]}); prof+=c[1]; });
  out.push({k:'form',nome:'Fundo / formação (subleito)',cod:'F',cor:'#7a6440',txt:'#5a4426',prof:P.eTot,esp:null});
  return out;
}
const plOn=(v,k)=>v.niv[k]===undefined?(k!=='form'):!!v.niv[k]; /* PI-09: camadas calculadas (areia, base, sub-base, reforço) vêm ligadas se o usuário nunca mexeu nelas */
function plGeo(i){ const r=ruas[i]; if(!r.geo) r.geo={lado:'esq',ang:90,dist:30}; return r.geo; }
function plLayout(){
  ruasSinc();
  const res=new Array(ruas.length).fill(null);
  const mk=(A,sA,d)=>({A,sA,d,n:[-d[1],d[0]],pos:s=>[A[0]+(s-sA)*d[0],A[1]+(s-sA)*d[1]]});
  const e0=i=>{ const r=(ruas[i].rows||[])[0]; return r?+r.est:0; };
  if(ruas.length&&ruas.every(r=>r.eixo)){ ruas.forEach((ru,i)=>{ res[i]=plLayPts(ru.eixo,e0(i),ru.id,ru.eixoProj,plLargMed(ru.rows)); }); return res; }
  res[0]=plLayCurva()||mk([0,0],e0(0),[1,0]);
  let restam=ruas.length-1, guard=0;
  while(restam>0&&guard++<30){
    let prog=false;
    ruas.forEach((ru,i)=>{
      if(res[i]) return;
      const lk=(ru.rows||[]).find(r=>r.cruz&&ruaIdx(r.cruz.rua)>=0&&res[ruaIdx(r.cruz.rua)]);
      if(!lk) return;
      const g=plGeo(i), sgn=g.lado==='dir'?-1:1, P=res[ruaIdx(lk.cruz.rua)], A=P.pos(lk.cruz.est), a=(+g.ang||90)*Math.PI/180*sgn;
      const Pd=P.dirAt?P.dirAt(+lk.cruz.est):P.d; res[i]=mk(A,+lk.est,[Pd[0]*Math.cos(a)-Pd[1]*Math.sin(a),Pd[0]*Math.sin(a)+Pd[1]*Math.cos(a)]); res[i].pai=ruaIdx(lk.cruz.rua); restam--; prog=true;
    });
    if(!prog){
      const i=ruas.findIndex((r,k)=>!res[k]); const ru=ruas[i], g=plGeo(i), sgn=g.lado==='dir'?-1:1;
      let pi=ru.paralela?ruaIdx(ru.paralela):0; if(pi<0||!res[pi]) pi=0;
      const P=res[pi], q=P.pos(e0(i)), dd=(+g.dist||30)*sgn;
      res[i]=mk([q[0]+P.n[0]*dd,q[1]+P.n[1]*dd],e0(i),P.d); res[i].pai=pi; res[i].paralela=true; restam--;
    }
  }
  return res;
}
function plDados0(){
  const lay=plLayout(), v=plVis();
  return ruas.map((ru,i)=>({i,id:ru.id,nome:nomeRua(i),L:plTopoLinhas(ru.rows||[]).filter(l=>l.gr!=null&&l.larg>0),lay:lay[i],rows:ru.rows||[],transv:!!ru.transv,cfg:ru.cfg}))
    .filter(d=>d.L.length>1&&v.ruas[d.id]!==0);
}
/* amostras a cada ≤ passo m, com interpolação linear entre as estacas */
function plAmostras0(d,passo){
  const L=d.L, out=[], f=(a,b,t,k)=>{ const x=a[k],y=b[k]; if(x==null) return y; if(y==null) return x; return x+(y-x)*t; };
  for(let k=0;k<L.length-1;k++){
    const a=L[k], b=L[k+1], n=Math.max(1,Math.ceil((b.est-a.est)/passo));
    for(let j=0;j<n;j++){ const t=j/n; out.push({est:a.est+(b.est-a.est)*t,gr:f(a,b,t,'gr'),gE:f(a,b,t,'gE'),gD:f(a,b,t,'gD'),tc:f(a,b,t,'tc'),te:f(a,b,t,'te'),td:f(a,b,t,'td'),larg:f(a,b,t,'larg'),sit:a.sit,estr:a.estr,calE:f(a,b,t,'calE')||0,calD:f(a,b,t,'calD')||0,fimE:f(a,b,t,'calFimE')||0,fimD:f(a,b,t,'calFimD')||0}); }
  }
  const z=L[L.length-1]; out.push({est:z.est,gr:z.gr,gE:z.gE,gD:z.gD,tc:z.tc,te:z.te,td:z.td,larg:z.larg,sit:z.sit,estr:z.estr,calE:z.calE||0,calD:z.calD||0,fimE:z.calFimE||0,fimD:z.calFimD||0});
  out.forEach(s=>{ s.c=d.lay.pos(s.est); s.b=(s.larg||0)/2; if(s.tc==null) s.tc=s.gr; if(s.te==null) s.te=s.tc; if(s.td==null) s.td=s.tc; if(s.gE==null) s.gE=s.gr; if(s.gD==null) s.gD=s.gr; });
  return out;
}
const plZ=(s,u)=>u>=0?s.gr+(s.gE-s.gr)*Math.min(u,s.b)/(s.b||1):s.gr+(s.gD-s.gr)*Math.min(-u,s.b)/(s.b||1);
const plZT=(s,u)=>u>=0?s.tc+(s.te-s.tc)*Math.min(u,s.b)/(s.b||1):s.tc+(s.td-s.tc)*Math.min(-u,s.b)/(s.b||1);
const plOff=(d,s,u)=>{ const n=plNrm(d,s); return [s.c[0]+n[0]*u,s.c[1]+n[1]*u]; };
function plPoligono(d,A,ext){ const l=A.map(s=>plOff(d,s,s.b+ext)), r=A.map(s=>plOff(d,s,-(s.b+ext))); return l.concat(r.reverse()); }
/* PI-10: contorno da pista + meio-fio + calçada (cada lado com a sua largura) e faixa lateral da calçada */
function plPoligonoCal(d,A,ext,com){ const l=A.map(s=>plOff(d,s,s.b+ext+(com?(s.calE||0):0))), r=A.map(s=>plOff(d,s,-(s.b+ext+(com?(s.calD||0):0)))); return l.concat(r.reverse()); }
function plFaixaCal(d,A,sg,ext0){ const w=s=>sg>0?(s.calE||0):(s.calD||0), a=A.map(s=>plOff(d,s,sg*(s.b+ext0))), b=A.map(s=>plOff(d,s,sg*(s.b+ext0+w(s)))); return a.concat(b.reverse()); }
function plDentro(p,poly){ let c=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){ const a=poly[i],b=poly[j]; if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/((b[1]-a[1])||1e-12)+a[0])) c=!c; } return c; }
function plCorridas(A,fora){ const runs=[]; let cur=[]; for(let k=0;k<A.length-1;k++){ if(fora(A[k],A[k+1])){ if(!cur.length) cur.push(A[k]); cur.push(A[k+1]); } else if(cur.length){ runs.push(cur); cur=[]; } } if(cur.length>1) runs.push(cur); return runs; }
function plMfLarg(P){ return P.mf?((P.mf.tipo==='conjugado'?(+P.mf.larg||0)+(+P.mf.sbase||0):(+P.mf.base||0))/100):0; }

/* ── painel ── */
function plAbrir(){
  const msg=document.getElementById('pl-msg'); if(!msg) return;
  msg.textContent=resultado?'':'Calcule o dimensionamento (aba Dimensionamento): a planta e o 3D usam as camadas do pavimento.';
  plPainel(); if(resultado&&_pl.aprox) msg.textContent='Traçado APROXIMADO: este projeto não tem as coordenadas das ruas, então elas aparecem retas, ligadas nas estacas do quadro de cruzamentos da Topografia. Para o traçado real, abra o projeto gerado do levantamento/DWG.'; if(_pl.modo==='planta') plDesenhar(true); else pl3D();
}
function atualizarPlantaSeAberta(){ const pn=document.getElementById('tab-planta'); if(pn&&pn.classList.contains('active')&&resultado){ plPainel(); if(_pl.modo==='planta') plDesenhar(); else pl3D(true); } }
function plModo(m){
  _pl.modo=m;
  document.getElementById('pl-b-planta').classList.toggle('tb-btn-save',m==='planta'); document.getElementById('pl-b-3d').classList.toggle('tb-btn-save',m==='3d');
  document.getElementById('pl-svgwrap').style.display=m==='planta'?'':'none'; { const bd=document.getElementById('pl-banda'); if(bd&&m!=='planta') bd.style.display='none'; } document.getElementById('pl-3dwrap').style.display=m==='3d'?'':'none';
  document.getElementById('pl-ev-box').style.display=m==='3d'?'':'none';
  document.getElementById('pl-b-svg').style.display=m==='planta'?'':'none'; document.getElementById('pl-b-png').style.display=m==='3d'?'':'none';
  if(m==='planta') plDesenhar(true); else pl3D();
}
function plPainel(){
  const v=plVis(), box=document.getElementById('pl-painel'); if(!box) return;
  const N=plNiveis();
  const ck=(rot,on,fn,tip)=>'<label style="display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer;line-height:1.35"'+(tip?' title="'+tip+'"':'')+'><input type="checkbox" '+(on?'checked ':'')+'onchange="'+fn+'">'+rot+'</label>';
  const o=k=>"plSet('"+k+"',0,this.checked)";
  const tit=t=>'<div style="font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--fg2);margin:10px 0 4px">'+t+'</div>';
  let h=tit('Ruas')+ruas.map((r,i)=>ck('<b>'+esc(nomeRua(i))+'</b>',v.ruas[r.id]!==0,"plSet('ruas','"+r.id+"',this.checked)")).join('');
  h+=tit('Níveis — cotas, espessuras e camadas')+N.map(n=>ck('<span style="display:inline-block;width:12px;height:12px;background:'+n.cor+';border:1px solid #666;border-radius:2px"></span><b style="color:'+n.txt+';min-width:18px">'+n.cod+'</b>'+esc(n.nome)+(n.esp?' <span style="color:var(--fg2)">· '+fmt(n.esp*100,1)+' cm</span>':''),plOn(v,n.k),"plSet('niv','"+n.k+"',this.checked)",'Planta: cotas e linha no quadro de camadas. 3D: superfície/camada.')).join('')+
    '<div style="display:flex;gap:6px;margin-top:4px"><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plTodosNiveis(1)">Acender todos</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plTodosNiveis(0)">Apagar todos</button></div>';
  h+=tit('Níveis do cenário 3D (assentam no terreno do entorno)')+ck('Casas',v.casas,o('casas'),'Casas dos quintais. Só ilustração: não entra em nenhum cálculo. Sai com exagero vertical maior que 1×.')+ck('Muros e portões',v.muros,o('muros'),'Muros das divisas e da frente dos lotes, com os portões.')+ck('Árvores e palmeiras do cenário',v.arvc,o('arvc'),'Árvores dos quintais e do campo.')+ck('Grama 3D (tufos com vento)',v.grama,o('grama'),'Os tufos de grama em volta das ruas. O terreno verde é o “Entorno / terreno lateral”.')+
    '<div style="display:flex;gap:6px;margin-top:4px"><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plCenarioTodos(1)">Mostrar todo o cenário</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plCenarioTodos(0)">Ocultar todo o cenário</button></div>'+
    '<div style="font-size:11px;color:var(--fg2);margin-top:2px">Sem “Entorno / terreno lateral” ligado, o terreno não aparece, mas o que está ligado continua na cota dele.</div>';
  h+=tit('Planta e 3D — elementos')+((_plT.fundo&&_plT.fundo.length)?ck('Traçado do levantamento (DWG): bordas, passeios e quadras',v.fundo,o('fundo'),'Desenho de fundo do levantamento, só na planta, para conferir as ruas e os cruzamentos. Não entra em nenhum cálculo.'):'')+ck('Entorno / terreno lateral',v.entorno,o('entorno'))+ck('Pavimento (pista)',v.pista,o('pista'))+ck('Meio-fio e sarjeta',v.mf,o('mf'))+ck('Eixo',v.eixo,o('eixo'))+ck('Números das estacas',v.numeros,o('numeros'));
  h+=tit('Só na planta')+ck('Marcas das estacas',v.estacas,o('estacas'))+ck('Cotas de largura da pista',v.larguras,o('larguras'))+ck('Setas de declividade (greide)',v.decl,o('decl'))+ck('Cores de corte / aterro',v.corte,o('corte'))+
    ck('Quadro de camadas (esp., área, volume)',v.quadro,o('quadro'))+ck('Legenda',v.legenda,o('legenda'))+ck('Carimbo',v.carimbo,o('carimbo'))+
    '<div style="margin-top:4px;font-size:12px">Rótulos a cada <select onchange="plSet(\'passo\',0,+this.value)" style="font-size:12px">'+[1,2,5,10].map(x=>'<option value="'+x+'"'+(v.passo==x?' selected':'')+'>'+(x==1?'estaca':x+' estacas')+'</option>').join('')+'</select></div>';
  h+=tit('Só no 3D')+ck('Sombras',v.sombras,o('sombras'))+ck('Rótulos e medidas das camadas',v.rot3d,o('rot3d'))+ck('Lâmina do terreno natural sobre a pista (corte/aterro)',v.lamina,o('lamina'),'Película marrom translúcida na cota do terreno natural. Desligada deixa a cor do pavimento uniforme.');
  h+=plPainelTransv(tit,ck);
  box.innerHTML=h;
}
function plRedesenhar(){ if(_pl.modo==='planta') plDesenhar(); else pl3D(true); }
function plSet(grupo,k,val){ const v=plVis(); if(grupo==='ruas') v.ruas[k]=val?1:0; else if(grupo==='niv') v.niv[k]=val?1:0; else v[grupo]=(grupo==='passo')?val:(val?1:0); plSalvarVis(); plRedesenhar(); }
function plCenarioTodos(on){ const v=plVis(); ['casas','muros','arvc','grama','objArv','objPoste'].forEach(k=>v[k]=on?1:0); plSalvarVis(); plPainel(); plRedesenhar(); }
function plTodosNiveis(on){ const v=plVis(); plNiveis().forEach(n=>v.niv[n.k]=on?1:0); plSalvarVis(); plPainel(); plRedesenhar(); }
function plGeoSet(i,k,val){ const g=plGeo(i); g[k]=(k==='lado')?val:(parseFloat(val)||g[k]); plPainel(); if(_pl.modo==='planta') plDesenhar(true); else { if(_pl.t3) _pl.t3.pronto=false; pl3D(); } }
function plNiceLen(x){ const e=Math.pow(10,Math.floor(Math.log10(x))); const m=x/e; return (m>=5?5:m>=2?2:1)*e; }

/* ── PLANTA BAIXA TÉCNICA (SVG) ── */
const PL_BANDA=200;
function plBanda(){ if(_pl.semBanda) return 0; const v=plVis(); return (v.quadro||v.legenda||v.carimbo)?PL_BANDA:0; }
function plSvg(vb,Wpx){
  const v=plVis(), D=plDados(), N=plNiveis(), P=secaoParams(), wmf=v.mf?plMfLarg(P):0;
  const W=Wpx||1200, H=vb.h/vb.w*W, sc=W/vb.w, BH=plBanda()*W/1200, HT=H+BH;
  const X=p=>(p[0]-vb.x)*sc, Y=p=>(-p[1]-vb.y)*sc, pt=p=>X(p).toFixed(1)+','+Y(p).toFixed(1);
  const ang=dd=>{ let a=-Math.atan2(dd[1],dd[0])*180/Math.PI; if(a>90) a-=180; if(a<=-90) a+=180; return a; };
  const F='font-family="Arial,Helvetica,sans-serif"';
  const T=(x,y,t,o)=>{ o=o||{}; let fsz=o.fs||10, tl=''; if(o.mw){ const est=String(t).length*fsz*0.56; if(est>o.mw){ fsz=Math.max(6.5,fsz*o.mw/est); if(String(t).length*fsz*0.56>o.mw) tl=' textLength="'+o.mw.toFixed(1)+'" lengthAdjust="spacingAndGlyphs"'; } } o.fs=fsz; return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-size="'+fsz.toFixed(1)+'" fill="'+(o.c||'#111')+'" text-anchor="'+(o.a||'start')+'"'+tl+(o.b?' font-weight="700"':'')+(o.r!=null?' transform="rotate('+o.r.toFixed(1)+' '+x.toFixed(1)+' '+y.toFixed(1)+')"':'')+(o.h===0?'':' paint-order="stroke" stroke="'+(o.hc||'#fff')+'" stroke-width="'+(o.hw||3)+'" stroke-linejoin="round"')+'>'+esc(t)+'</text>'; };
  const ocup=[]; const livre=(x,y,w,h)=>{ for(const r of ocup) if(x<r[0]+r[2]&&x+w>r[0]&&y<r[1]+r[3]&&y+h>r[1]) return false; ocup.push([x,y,w,h]); return true; };
  let defs='', s='', top='';
  const A=D.map(d=>plAmostras(d,1));
  // paginação dos blocos (padrão tijolinho 20×10 cm), na escala real, girada com a rua
  D.forEach((d,j)=>{
    const t=0.4*sc, a=ang(d.lay.d), o=d.lay.pos(d.L[0].est);
    if(v.paginacao&&t>=7){
      const r=t/4, bl=t/2; let rr='';
      for(let q=0;q<4;q++){ const off=(q%2)?bl/2:0; for(let c=-1;c<3;c++){ rr+='<rect x="'+(c*bl+off).toFixed(2)+'" y="'+(q*r).toFixed(2)+'" width="'+bl.toFixed(2)+'" height="'+r.toFixed(2)+'" fill="none" stroke="#a59c8c" stroke-width="'+Math.min(1,0.06*r).toFixed(2)+'"/>'; } }
      defs+='<pattern id="plpg'+j+'" patternUnits="userSpaceOnUse" width="'+t.toFixed(2)+'" height="'+t.toFixed(2)+'" patternTransform="translate('+X(o).toFixed(1)+','+Y(o).toFixed(1)+') rotate('+(-Math.atan2(d.lay.d[1],d.lay.d[0])*180/Math.PI).toFixed(2)+')"><rect width="'+t.toFixed(2)+'" height="'+t.toFixed(2)+'" fill="#e3ded3"/>'+rr+'</pattern>';
    }
  });
  defs+='<marker id="plar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="#1d4ed8"/></marker>'+
        '<marker id="pltk" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M2,8 L8,2" stroke="#111" stroke-width="1.4"/></marker>';
  // 1) entorno
  if(v.entorno) D.forEach((d,j)=>{ s+='<polygon points="'+plPoligono(d,A[j],wmf+4).map(pt).join(' ')+'" fill="#e6eedb" stroke="none"/>'; });
  // 0) traçado de fundo do levantamento (DWG): bordas, passeios e quadras
  if(v.fundo!==0&&_plT.fundo&&_plT.fundo.length) _plT.fundo.forEach(f=>{ (f.l||[]).forEach(pl=>{ if(pl.length>1) s+='<polyline points="'+pl.map(pt).join(' ')+'" fill="none" stroke="'+f.c+'" stroke-width="'+(f.w||0.6)+'" stroke-linejoin="round"/>'; }); });
  // 1b) calçada (PI-10): do meio-fio até o muro, nos dois lados
  if(_cal.ativo&&v.calcada!==0) D.forEach((d,j)=>{ [1,-1].forEach(sg=>{ if(!A[j].some(q=>(sg>0?q.calE:q.calD)>0.01)) return;
    s+='<polygon points="'+plFaixaCal(d,A[j],sg,wmf).map(pt).join(' ')+'" fill="'+(_cal.tipo==='intertravado'?'#d8c3a2':'#d6d4cd')+'" stroke="#8a867c" stroke-width="0.6"/>'; }); });
  // 2) meio-fio + sarjeta (por baixo das pistas: no cruzamento o meio-fio some sob a outra pista)
  if(v.mf&&wmf>0){ const HOL=plEsquinas(D).filter(e=>e.hole).map(e=>e.hole); D.forEach((d,j)=>{
    const sb=P.mf.tipo==='conjugado'?(+P.mf.sbase||0)/100:0;
    [1,-1].forEach(sg=>{
      /* o meio-fio reto termina nas tangentes da esquina (o do raio é desenhado à parte) */
      const runs=HOL.length?plCorridas(A[j],(a,b)=>{ const m={c:[(a.c[0]+b.c[0])/2,(a.c[1]+b.c[1])/2],b:(a.b+b.b)/2,est:(a.est+b.est)/2}; const p=plOff(d,m,sg*(m.b+wmf/2)); return !HOL.some(h=>plDentro(p,h)); }):[A[j]];
      runs.forEach(R=>{
        const ring=(u0,u1)=>R.map(q=>plOff(d,q,sg*(q.b+u0))).concat(R.slice().reverse().map(q=>plOff(d,q,sg*(q.b+u1))));
        if(sb>0) s+='<polygon points="'+ring(0,sb).map(pt).join(' ')+'" fill="#c9ccd1" stroke="#80858d" stroke-width="0.6"/>';
        s+='<polygon points="'+ring(sb,wmf).map(pt).join(' ')+'" fill="#a9aeb6" stroke="#5b616b" stroke-width="0.8"/>';
      });
    });
  }); }
  // 3) pistas
  if(v.mf&&wmf>0) plEsquinas(D).forEach(q=>{ if(q.ring) s+='<polygon points="'+q.ring.map(pt).join(' ')+'" fill="#a9aeb6" stroke="#5b616b" stroke-width="0.8"/>'; });
  if(v.pista){ const pp=D.map((d,j)=>plPoligono(d,A[j],0).map(pt).join(' ')).concat(plEsqPolys(D).map(q=>q.map(pt).join(' ')));
    s+=pp.map(p=>'<polygon points="'+p+'" fill="#a9aaae" stroke="#333" stroke-width="2"/>').join('')+pp.map(p=>'<polygon points="'+p+'" fill="#a9aaae" stroke="none"/>').join(''); }
  if(v.pista) D.forEach((d,j)=>{
    if(v.corte){ const cor={Corte:'rgba(220,60,40,.28)',Aterro:'rgba(40,110,220,.28)',Misto:'rgba(240,160,30,.30)'};
      for(let k=0;k<d.L.length-1;k++){ const c=cor[d.L[k].sit]; if(!c) continue; const a=d.L[k],b=d.L[k+1];
        const q=[plOff(d,{c:d.lay.pos(a.est)},a.larg/2),plOff(d,{c:d.lay.pos(b.est)},b.larg/2),plOff(d,{c:d.lay.pos(b.est)},-b.larg/2),plOff(d,{c:d.lay.pos(a.est)},-a.larg/2)];
        s+='<polygon points="'+q.map(pt).join(' ')+'" fill="'+c+'" stroke="none"/>'; } }
  });
  { const SN=plSvgSinal(D,X,Y,sc); s+=SN.s; top+=SN.top; }
  // 4) eixo (traço-ponto)
  if(v.eixo) D.forEach((d,j)=>{ s+='<polyline points="'+A[j].map(q=>pt(q.c)).join(' ')+'" fill="none" stroke="#c0392b" stroke-width="1" stroke-dasharray="14 3 2 3"/>'; });
  // 5) estacas, larguras, cotas — PAV-TRACADO-b: com várias ruas (bairro), estacas, larguras, setas e caixas de cotas só aparecem ao aproximar (como na Drenagem/Esgoto)
  const multi=D.filter(d=>!d.transv).length>1, perto=!multi||sc>=2;
  if(multi&&!perto) top+=T(10,H-10,'Aproxime (roda do mouse ou ＋) para ver estacas, larguras, declividades e caixas de cotas.',{fs:11,c:'#475569'});
  D.forEach((d,j)=>{ if(d.transv) return;
    d.L.forEach((l,k)=>{ const a=ang(d.lay.dirAt?d.lay.dirAt(l.est):d.lay.d), nx=d.lay.nAt?d.lay.nAt(l.est):d.lay.n;
      const c=d.lay.pos(l.est), b=l.larg/2, ex=b+(v.mf?wmf:0), eh=Math.abs(l.est/20-Math.round(l.est/20))<1e-6, idx=Math.round(l.est/20);
      const mostra=perto&&(!eh||k===0||k===d.L.length-1||idx%v.passo===0);
      if(v.estacas&&(perto||sc>=0.6)){ const p1=plOff(d,{c},ex+0.6), p2=plOff(d,{c},-(ex+0.6)); s+='<line x1="'+X(p1).toFixed(1)+'" y1="'+Y(p1).toFixed(1)+'" x2="'+X(p2).toFixed(1)+'" y2="'+Y(p2).toFixed(1)+'" stroke="'+(eh?'#111':'#1d4ed8')+'" stroke-width="'+(eh?0.9:0.8)+'"'+(eh?'':' stroke-dasharray="4 2"')+'/>'; }
      if(v.numeros&&mostra){ const p=plOff(d,{c},ex+1.2); const t=eh?('EST. '+idx):('EST. '+estacaTxt(l.est)); const x=X(p),y=Y(p); top+=T(x,y,t,{fs:10,b:1,c:eh?'#111':'#1d4ed8',r:a-90,a:'start'}); }
      if(v.larguras&&mostra&&v.pista){
        const sh=Math.min(1.5,(d.L[k+1]?d.L[k+1].est-l.est:1.5)/3), cc=d.lay.pos(l.est+(k===d.L.length-1?-sh:sh));
        const p1=plOff(d,{c:cc},b), p2=plOff(d,{c:cc},-b);
        top+='<line x1="'+X(p1).toFixed(1)+'" y1="'+Y(p1).toFixed(1)+'" x2="'+X(p2).toFixed(1)+'" y2="'+Y(p2).toFixed(1)+'" stroke="#111" stroke-width="0.7" marker-start="url(#pltk)" marker-end="url(#pltk)"/>';
        const m=plOff(d,{c:cc},b*0.45); top+=T(X(m),Y(m),fmt(l.larg,2),{fs:9,r:a-90,a:'middle',c:'#111'});
      }
      if(mostra){
        const lin=N.filter(n=>plOn(v,n.k)).map(n=>{ const h=n.k==='terreno'?l.tc:l.gr-plPF(l,n); return h==null?null:[n,h]; }).filter(Boolean);
        if(lin.length){
          const fs=9, lh=fs+2, w=fs*0.62*8.5, hh=lin.length*lh+4;
          let ok=false, x=0, y=0, base=plOff(d,{c},-(ex+1.0));
          for(let tent=0;tent<6&&!ok;tent++){ const q=plOff(d,{c},-(ex+1.0+tent*(hh/sc+0.5))); x=X(q)+(nx[0]>=0?-w-2:2); y=Y(q)+(tent?0:-hh/2); if(Math.abs(nx[1])>0.7){ x=X(q)-w/2; y=Y(q)+(nx[1]>0?4:-hh-4); } ok=livre(x,y,w,hh); base=q; }
          if(ok){
            top+='<line x1="'+X(plOff(d,{c},-ex)).toFixed(1)+'" y1="'+Y(plOff(d,{c},-ex)).toFixed(1)+'" x2="'+(x+(X(base)<x?0:w)).toFixed(1)+'" y2="'+(y+hh/2).toFixed(1)+'" stroke="#999" stroke-width="0.5"/>';
            top+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="#fff" fill-opacity=".9" stroke="#bbb" stroke-width="0.5"/>';
            lin.forEach((q,i2)=>{ top+=T(x+3,y+lh*(i2+1),q[0].cod,{fs,b:1,c:q[0].txt,h:0})+T(x+w-3,y+lh*(i2+1),fmt(q[1],3),{fs,a:'end',c:'#111',h:0}); });
          }
        }
      }
      // seta de declividade no trecho
      if(perto&&v.decl&&k<d.L.length-1){ const nb=d.L[k+1], dd=nb.est-l.est; if(dd>0.5&&l.gr!=null&&nb.gr!=null){
        const i=(nb.gr-l.gr)/dd*100, desce=i<0, m1=l.est+dd*0.30, m2=l.est+dd*0.70, u=b*0.5;
        const pa=plOff(d,{c:d.lay.pos(desce?m1:m2)},u), pb=plOff(d,{c:d.lay.pos(desce?m2:m1)},u);
        top+='<line x1="'+X(pa).toFixed(1)+'" y1="'+Y(pa).toFixed(1)+'" x2="'+X(pb).toFixed(1)+'" y2="'+Y(pb).toFixed(1)+'" stroke="#1d4ed8" stroke-width="1.2" marker-end="url(#plar)"/>';
        const pm=plOff(d,{c:d.lay.pos(l.est+dd*0.5)},u+0.25*Math.max(1,12/sc)); top+=T(X(pm),Y(pm)-3,'i = '+fmt(Math.abs(i),2)+' %',{fs:9,a:'middle',r:a,c:'#1d4ed8'}); } }
    });
    // nome da rua
    const km=Math.floor(d.L.length/2), lm=d.L[Math.max(0,km-1)], e1=(d.L[km].est+lm.est)/2, p0=d.lay.pos(e1), pn=plOff(d,{c:p0},Math.max(d.L[km].larg,lm.larg)/2+(v.mf?wmf:0)+(v.entorno?4.5:1.5)+22/sc);
    top+=T(X(pn),Y(pn),d.nome.toUpperCase(),{fs:13,b:1,c:'#0f3d73',r:ang(d.lay.d),a:'middle'});
  });
  // 6) cruzamentos
  if(v.cruz) D.forEach(d=>{ d.rows.forEach(r=>{ if(!r.cruz) return; const ib=ruaIdx(r.cruz.rua); if(ib<0||ib<d.i) return; const o=D.find(x=>x.i===ib); if(!o) return;
    const p=d.lay.pos(r.est), g1=itpRows(d.rows,r.est,'greide'), g2=itpRows(o.rows,r.cruz.est,'greide'), df=(g1!=null&&g2!=null)?g1-g2:null, ruim=df!=null&&Math.abs(df)>0.02;
    const x=X(p), y=Y(p);
    top+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="6" fill="none" stroke="'+(ruim?'#b91c1c':'#15803d')+'" stroke-width="1.6"/><path d="M'+(x-9)+','+y+' h18 M'+x+','+(y-9)+' v18" stroke="'+(ruim?'#b91c1c':'#15803d')+'" stroke-width="0.8"/>';
    const lines=['CRUZAMENTO DE EIXOS','EST. '+estacaTxt(r.est)+' ('+d.nome+')  ×  EST. '+estacaTxt(r.cruz.est)+' ('+o.nome+')','Greide: '+fmt(g1,3)+'  /  '+fmt(g2,3)+(df!=null?('   Δ = '+(df>0?'+':'')+fmt(df*100,1)+' cm '+(ruim?'⚠':'✓')):'')];
    const w=Math.max(...lines.map(t=>t.length))*5.4+10, h=lines.length*12+6; let bx=x+14, by=y-h-14; if(!livre(bx,by,w,h)){ by=y+14; livre(bx,by,w,h); }
    top+='<line x1="'+x+'" y1="'+y+'" x2="'+bx+'" y2="'+(by+h/2)+'" stroke="'+(ruim?'#b91c1c':'#15803d')+'" stroke-width="0.7"/><rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" fill="#fff" stroke="'+(ruim?'#b91c1c':'#15803d')+'" stroke-width="0.8"/>';
    lines.forEach((t,i2)=>{ top+=T(bx+5,by+12*(i2+1),t,{fs:9,b:i2===0,c:i2===2&&ruim?'#b91c1c':'#111',h:0}); });
  }); });
  // 6b) árvores e postes (PI-11)
  top+=objSvg(X,Y,sc,D);
  // 7) quadro de camadas (só os níveis acesos)
  let ov='';
  if(BH>0&&v.quadro&&resultado){
    const area=(_topo&&_topo.totArea)||0, Vc=volumesCamadas(area), cams=N.filter(n=>n.esp&&plOn(v,n.k));
    const rows=[['Nível','Camada','Esp. (cm)','Área (m²)','Volume (m³)']];
    cams.forEach(n=>{ const vv=Vc.find(x=>x.n&&n.nome.toLowerCase().indexOf(String(x.n).toLowerCase().split(' ')[0])>=0); const VT=_R&&_R._topo&&window.__pvNvaria?{CBUQ:_R._topo.volCBUQc,Base:_R._topo.volBasec,'Sub-base':_R._topo.volSBc,'Reforço':_R._topo.volRefc}[n.canon]:null; rows.push([n.cod,n.nome.replace(' (greide = topo)',''),VT!=null?('até '+fmt(n.esp*100,1)+' (varia c/ N)'):fmt(n.esp*100,1),fmt(area,2),VT!=null?fmt(VT,2):(vv?fmt(vv.vol,2):fmt(area*n.esp,2))]); });
    if(cams.length>1) rows.push(['','Espessura das camadas acesas',fmt(cams.reduce((x,n)=>x+n.esp,0)*100,1),'','']);
    rows.push(['','Pavimento total (DNIT – método CBR)',window.__pvNvaria?'varia com o N de cada estaca':fmt(P.eTot*100,1),'','']);
    if(P.mf){ rows.push(['MF',P.mf.tipo==='conjugado'?('Meio-fio + sarjeta: sarjeta '+P.mf.sbase+'×'+P.mf.salt+' · meio-fio '+P.mf.larg+' · espelho '+P.mf.esp):('Meio-fio '+P.mf.base+'×'+P.mf.alt+' · espelho '+P.mf.esp),'cm',fmt(((_topo&&_topo.extensao)||0)*2,1)+' m','']); }
    if(_topo&&_topo.porRua&&_topo.porRua.length>1) _topo.porRua.forEach(p=>rows.push(['',p.nome+' — ext. '+fmt(p.ext,2)+' m','',fmt(p.area,2),'']));
    const cw=[34,250,60,72,80], tw=cw.reduce((a,b)=>a+b,0), rh=14, x0=356, y0=H+8;
    ov+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+(rh*(rows.length+1)+4)+'" fill="#fff" stroke="#111" stroke-width="1"/>'+T(x0+6,y0+12,'QUADRO DE CAMADAS DO PAVIMENTO — NÍVEIS ACESOS',{fs:10,b:1,h:0});
    rows.forEach((r,i2)=>{ let cx=x0; const yy=y0+rh*(i2+1)+12; if(i2===0||i2===1) ov+='<line x1="'+x0+'" y1="'+(yy-11)+'" x2="'+(x0+tw)+'" y2="'+(yy-11)+'" stroke="#111" stroke-width="0.6"/>';
      r.forEach((t,c2)=>{ const n=N.find(q=>q.cod===r[0]); ov+=T(c2>=2?cx+cw[c2]-4:cx+4,yy,t,{fs:9,b:i2===0||c2===0,a:c2>=2?'end':'start',c:(c2===0&&n)?n.txt:'#111',h:0,mw:cw[c2]-8}); cx+=cw[c2]; }); });
    if(!cams.length) ov+=T(x0+6,y0+rh*2+12,'(acenda um nível de camada para ver espessura e volume)',{fs:9,c:'#666',h:0});
  }
  // 8) legenda
  if(BH>0&&v.legenda){
    const it=[['pav','Pavimento flexível (revestimento asfáltico)'],['mf','Meio-fio / sarjeta de concreto'],['eixo','Eixo da via'],['est','Estaca inteira (20 m)'],['pto','Ponto / estaca fracionária'],['decl','Sentido de escoamento (declividade)']].concat(plLegItens());
    N.filter(n=>plOn(v,n.k)).forEach(n=>it.push(['niv:'+n.k,n.cod+' = cota '+(n.k==='terreno'?'do terreno natural':n.k==='form'?'do fundo / formação':'do topo: '+n.nome.replace(' (greide = topo)','')+(n.k==='c0'?' (greide)':''))]));
    if(v.corte) it.push(['c1','Trecho em corte'],['c2','Trecho em aterro'],['c3','Trecho misto']);
    if(objTodos().some(x=>x.o.t==='arv')) it.push(['oarv','Árvore (copa 5 m)']); if(objTodos().some(x=>x.o.t==='poste')) it.push(['opos','Poste com luminária']);
    const lh=13, por=Math.ceil(it.length/(it.length>11?2:1)), w=334, h=BH-16, x0=12, y0=H+8, cwid=it.length>11?166:334;
    ov+='<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#fff" stroke="#111"/>'+T(x0+6,y0+13,'LEGENDA',{fs:10,b:1,h:0});
    it.forEach((q,i2)=>{ const col=Math.floor(i2/por), yy=y0+24+(i2%por)*lh, sx=x0+6+col*cwid, k=q[0];
      if(k.indexOf('s:')===0) ov+=plLegSinal(k,sx,yy); else if(k==='pav') ov+='<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="#a9aaae" stroke="#333" stroke-width="0.8"/>'; else if(k==='pavX') ov+='<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="#e3ded3" stroke="#333" stroke-width="0.8"/><path d="M'+(sx+7)+','+(yy-4)+' v4.5 M'+(sx+15)+','+(yy-4)+' v4.5 M'+(sx+11)+','+(yy+0.5)+' v4.5 M'+sx+','+(yy+0.5)+' h22" stroke="#a59c8c" stroke-width="0.6"/>';
      else if(k==='mf') ov+='<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="#a9aeb6" stroke="#5b616b" stroke-width="0.8"/>';
      else if(k==='eixo') ov+='<line x1="'+sx+'" y1="'+yy+'" x2="'+(sx+22)+'" y2="'+yy+'" stroke="#c0392b" stroke-dasharray="8 2 2 2"/>';
      else if(k==='est') ov+='<line x1="'+(sx+11)+'" y1="'+(yy-5)+'" x2="'+(sx+11)+'" y2="'+(yy+5)+'" stroke="#111"/>';
      else if(k==='pto') ov+='<line x1="'+(sx+11)+'" y1="'+(yy-5)+'" x2="'+(sx+11)+'" y2="'+(yy+5)+'" stroke="#1d4ed8" stroke-dasharray="3 2"/>';
      else if(k==='decl') ov+='<line x1="'+sx+'" y1="'+yy+'" x2="'+(sx+20)+'" y2="'+yy+'" stroke="#1d4ed8" stroke-width="1.2" marker-end="url(#plar)"/>';
      else if(k==='cz') ov+='<circle cx="'+(sx+11)+'" cy="'+yy+'" r="4.5" fill="none" stroke="#15803d" stroke-width="1.4"/>';
      else if(k==='oarv') ov+='<circle cx="'+(sx+11)+'" cy="'+yy+'" r="5" fill="rgba(46,125,50,.30)" stroke="#2e7d32"/><circle cx="'+(sx+11)+'" cy="'+yy+'" r="1.6" fill="#6d4c2f"/>';
      else if(k==='opos') ov+='<line x1="'+(sx+8)+'" y1="'+yy+'" x2="'+(sx+18)+'" y2="'+yy+'" stroke="#374151" stroke-width="1.2"/><circle cx="'+(sx+18)+'" cy="'+yy+'" r="2.6" fill="#fde68a" stroke="#374151" stroke-width="0.6"/><circle cx="'+(sx+8)+'" cy="'+yy+'" r="3" fill="#6b7280" stroke="#111" stroke-width="0.6"/>';
      else if(k.indexOf('niv:')===0){ const n=N.find(z=>z.k===k.slice(4)); ov+='<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="'+n.cor+'" stroke="#666" stroke-width="0.6"/>'+T(sx+11,yy+3.5,n.cod,{fs:8,b:1,a:'middle',c:'#111',h:0}); }
      else { const cc={c1:'rgba(220,60,40,.45)',c2:'rgba(40,110,220,.45)',c3:'rgba(240,160,30,.5)'}[k]; ov+='<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="'+cc+'"/>'; }
      ov+=T(sx+28,yy+3.5,q[1],{fs:it.length>11?7.6:9,h:0,mw:cwid-40}); });
  }
  // 9) carimbo + escala + norte
  const bar=plNiceLen(vb.w/5);
  if(BH>0&&v.carimbo){
    const w=W-356-(v.quadro?514:0)-24, h=BH-16, x0=W-w-12, y0=H+8, ob=(document.getElementById('logradouro')||{}).value||'—', rp=(document.getElementById('responsavel')||{}).value||'—', dt=new Date().toLocaleDateString('pt-BR');
    ov+='<rect x="'+x0+'" y="'+y0+'" width="'+w+'" height="'+h+'" fill="#fff" stroke="#111" stroke-width="1.2"/><line x1="'+x0+'" y1="'+(y0+22)+'" x2="'+(x0+w)+'" y2="'+(y0+22)+'" stroke="#111"/><line x1="'+x0+'" y1="'+(y0+66)+'" x2="'+(x0+w)+'" y2="'+(y0+66)+'" stroke="#111"/>'+
      T(x0+8,y0+15,'PLANTA BAIXA — PAVIMENTO FLEXÍVEL',{fs:11,b:1,h:0,mw:w-16})+T(x0+8,y0+36,'Obra: '+ob,{fs:9.5,h:0,mw:w-16})+T(x0+8,y0+50,'Resp. técnico: '+rp,{fs:9.5,h:0,mw:w-16})+T(x0+8,y0+62,'Dimensionamento: DNIT (método CBR) · Data: '+dt,{fs:9,h:0,c:'#333',mw:w-16})+
      T(x0+8,y0+84,'ESCALA GRÁFICA',{fs:8,b:1,h:0,mw:w*0.5})+T(x0+8,y0+h-8,'Cotas em metros · espessuras em cm · eixos esquemáticos (retos)',{fs:8,h:0,c:'#333',mw:w-16})+T(x0+w-8,y0+84,'TOTAL CIVIL',{fs:11,b:1,a:'end',h:0,c:'#0f3d73',mw:w*0.4});
    const bx=x0+8, by=y0+100, bw=Math.min(bar*sc,w-24); for(let q=0;q<4;q++) ov+='<rect x="'+(bx+bw/4*q).toFixed(1)+'" y="'+by+'" width="'+(bw/4).toFixed(1)+'" height="4" fill="'+(q%2?'#fff':'#111')+'" stroke="#111" stroke-width="0.6"/>';
    ov+=T(bx,by+13,'0',{fs:8,h:0})+T(bx+bw/2,by+13,fmt(bar/2,0),{fs:8,h:0,a:'middle'})+T(bx+bw,by+13,bar+' m',{fs:8,h:0,a:'middle'});
  }
  if(!(BH>0&&v.carimbo)){ const bx=20, by=H-20, bw=bar*sc; ov+='<line x1="'+bx+'" y1="'+by+'" x2="'+(bx+bw).toFixed(1)+'" y2="'+by+'" stroke="#000" stroke-width="3"/>'+T(bx,by-6,bar+' m',{fs:11,h:0}); }
  ov+='<g transform="translate('+(W-36)+',44)"><circle r="18" fill="#fff" stroke="#111"/><path d="M0,-16 L6,8 L0,3 L-6,8 Z" fill="#111"/>'+T(0,-21,'N',{fs:11,b:1,a:'middle',h:0})+'</g>';
  const fx='<rect x="1" y="1" width="'+(W-2)+'" height="'+(H-2).toFixed(1)+'" fill="none" stroke="#111" stroke-width="1.4"/>'+(BH?'<rect x="0" y="'+H.toFixed(1)+'" width="'+W+'" height="'+BH.toFixed(1)+'" fill="#f4f4f1"/>':'');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+HT.toFixed(1)+'" width="100%" height="100%" '+F+' style="background:#fdfdfb"><defs>'+defs+'<clipPath id="plclip"><rect x="0" y="0" width="'+W+'" height="'+H.toFixed(1)+'"/></clipPath></defs><g clip-path="url(#plclip)">'+s+top+'</g>'+fx+ov+'</svg>';
}
function plLimites(){
  const vv=plVis(); const D=plDados(), P=secaoParams(), w=plMfLarg(P)+6; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  D.forEach(d=>{ d.L.forEach(l=>{ const c=d.lay.pos(l.est), b=l.larg/2+w; x0=Math.min(x0,c[0]-b);x1=Math.max(x1,c[0]+b);y0=Math.min(y0,c[1]-b);y1=Math.max(y1,c[1]+b); }); });
  if(_plT.fundo&&_plT.fundo.length&&vv.fundo!==0) _plT.fundo.forEach(f=>(f.l||[]).forEach(pl=>pl.forEach(q=>{ x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]); })));
  if(x0>x1){ x0=0;x1=100;y0=-20;y1=20; } return {x0,x1,y0,y1};
}
function plDesenhar(enquadrar){
  const el=document.getElementById('pl-svgwrap'); if(!el) return;
  if(!resultado){ el.innerHTML='<div style="padding:30px;color:var(--fg2)">Calcule o dimensionamento primeiro.</div>'; return; }
  const w=el.clientWidth||1100, h=el.clientHeight||640;
  const asp=Math.max(0.15,h/w-plBanda()/1200);
  if(_pl.vb&&!enquadrar) _pl.vb.h=_pl.vb.w*asp;
  if(enquadrar||!_pl.vb){ const b=plLimites(), bw=b.x1-b.x0, bh=b.y1-b.y0; let vw=Math.max(bw,bh/asp)*1.18; const vh=vw*asp; _pl.vb={x:b.x0-(vw-bw)/2,y:-b.y1-(vh-bh)/2,w:vw,h:vh}; }
  const mob=w<700; _pl.semBanda=mob;
  el.innerHTML=plSvg(_pl.vb,mob?Math.max(320,w):1200); objPlantaEventos(el);
  _pl.semBanda=false;
  const bd=document.getElementById('pl-banda');
  if(bd){ const v=plVis();
    if(mob&&(v.quadro||v.legenda||v.carimbo)){ const H=_pl.vb.h/_pl.vb.w*1200; bd.style.display='';
      bd.innerHTML='<div style="font-size:11px;color:var(--fg2);margin:4px 0">Legenda, quadro de camadas e carimbo (arraste para o lado):</div><div style="width:1100px">'+plSvg(_pl.vb,1200).replace(/viewBox="[^"]*"/,'viewBox="0 '+H.toFixed(1)+' 1200 '+PL_BANDA+'"').replace('width="100%" height="100%"','width="1100" height="'+Math.round(PL_BANDA*1100/1200)+'"')+'</div>';
    }else{ bd.style.display='none'; bd.innerHTML=''; } }
  if(bd&&!bd.dataset.ev){ bd.dataset.ev='1';   /* faixa de legenda/quadro/carimbo (celular): a roda também aproxima o desenho */
    bd.addEventListener('wheel',e=>{ e.preventDefault(); const r=bd.getBoundingClientRect(), f=e.deltaY<0?0.8:1.25, vb=_pl.vb, nw=vb.w*f, nh=vb.h*f;
      _pl.vb={x:vb.x+(vb.w-nw)*0.5,y:vb.y+(vb.h-nh)*0.5,w:nw,h:nh}; plDesenhar(); },{passive:false}); }
  if(!el.dataset.ev){ el.dataset.ev='1';
    el.addEventListener('wheel',e=>{ e.preventDefault(); const r=el.getBoundingClientRect(), hd=r.height*(1-plBanda()/1200*r.width/r.height), fx=(e.clientX-r.left)/r.width, fy=Math.min(1,(e.clientY-r.top)/hd), f=e.deltaY<0?0.8:1.25, vb=_pl.vb;
      const nw=vb.w*f, nh=vb.h*f; _pl.vb={x:vb.x+(vb.w-nw)*fx,y:vb.y+(vb.h-nh)*fy,w:nw,h:nh}; plDesenhar(); },{passive:false});
    el.addEventListener('mousedown',e=>{ _pl.drag={x:e.clientX,y:e.clientY,vb:Object.assign({},_pl.vb)}; el.style.cursor='grabbing'; e.preventDefault(); });
    window.addEventListener('mousemove',e=>{ const d=_pl.drag; if(!d) return; const r=el.getBoundingClientRect(), hd=r.height-plBanda()/1200*r.width; _pl.vb={x:d.vb.x-(e.clientX-d.x)/r.width*d.vb.w,y:d.vb.y-(e.clientY-d.y)/hd*d.vb.h,w:d.vb.w,h:d.vb.h}; if(!_pl.raf){ _pl.raf=requestAnimationFrame(()=>{ _pl.raf=0; plDesenhar(); }); } });
    window.addEventListener('mouseup',()=>{ if(_pl.drag){ _pl.drag=null; el.style.cursor='grab'; } });
    const tq=e=>Array.prototype.map.call(e.touches,t=>[t.clientX,t.clientY]);
    el.addEventListener('touchstart',e=>{ const t=tq(e); _pl.toq={t,vb:Object.assign({},_pl.vb)}; if(t.length>=1) e.preventDefault(); },{passive:false});
    el.addEventListener('touchmove',e=>{ const g=_pl.toq; if(!g) return; e.preventDefault(); const t=tq(e), r=el.getBoundingClientRect(), hd=r.height-plBanda()/1200*r.width, vb=g.vb;
      if(t.length===1&&g.t.length===1){ _pl.vb={x:vb.x-(t[0][0]-g.t[0][0])/r.width*vb.w,y:vb.y-(t[0][1]-g.t[0][1])/hd*vb.h,w:vb.w,h:vb.h}; }
      else if(t.length>=2&&g.t.length>=2){ const d0=Math.hypot(g.t[0][0]-g.t[1][0],g.t[0][1]-g.t[1][1]), d1=Math.hypot(t[0][0]-t[1][0],t[0][1]-t[1][1]); if(d0<5) return;
        const f=d0/d1, cx0=((g.t[0][0]+g.t[1][0])/2-r.left)/r.width, cy0=((g.t[0][1]+g.t[1][1])/2-r.top)/hd, cx1=((t[0][0]+t[1][0])/2-r.left)/r.width, cy1=((t[0][1]+t[1][1])/2-r.top)/hd;
        const nw=vb.w*f, nh=vb.h*f; _pl.vb={x:vb.x+vb.w*cx0-nw*cx1,y:vb.y+vb.h*cy0-nh*cy1,w:nw,h:nh}; }
      else return;
      if(!_pl.raf){ _pl.raf=requestAnimationFrame(()=>{ _pl.raf=0; plDesenhar(); }); } },{passive:false});
    el.addEventListener('touchend',e=>{ const t=tq(e); _pl.toq=t.length?{t,vb:Object.assign({},_pl.vb)}:null; });
  }
}
function plZoom(f){
  if(_pl.modo==='planta'){ const vb=_pl.vb; if(!vb) return; const nw=vb.w*f, nh=vb.h*f; _pl.vb={x:vb.x+(vb.w-nw)/2,y:vb.y+(vb.h-nh)/2,w:nw,h:nh}; plDesenhar(); return; }
  const t=_pl.t3; if(!t) return; const d=t.cam.position.clone().sub(t.ctl.target).multiplyScalar(f); t.cam.position.copy(t.ctl.target).add(d);
}
function plBaixarSvg(){
  if(!resultado){ toast('Calcule primeiro.',true); return; }
  if(!_pl.vb) plDesenhar(true);
  const svg=plSvg(_pl.vb,1800).replace('width="100%" height="100%"','width="1800" height="'+Math.round(1800*_pl.vb.h/_pl.vb.w+plBanda()*1.5)+'"');
  triggerDownload(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n'+svg],{type:'image/svg+xml'}),'pavimento_planta_'+carimbo()+'.svg');
}

/* ── 3D REALISTA (three.js r128, mesma versão da Drenagem) ── */
const PL_THREE='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', PL_ORBIT='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
const _plLibs={};
function plCarregar(u){ if(_plLibs[u]) return _plLibs[u]; return _plLibs[u]=new Promise((ok,fail)=>{ const s=document.createElement('script'); s.src=u; s.async=true; s.onload=ok; s.onerror=()=>{ delete _plLibs[u]; fail(new Error('sem conexão')); }; document.head.appendChild(s); }); }
function pl3D(manter){
  const wrap=document.getElementById('pl-3dwrap'); if(!wrap) return;
  if(!resultado){ wrap.innerHTML='<div style="padding:30px;color:var(--fg2)">Calcule o dimensionamento primeiro.</div>'; return; }
  const msg=document.getElementById('pl-msg'); if(!window.THREE) msg.textContent='Carregando o 3D…';
  (window.THREE?Promise.resolve():plCarregar(PL_THREE)).then(()=>window.THREE.OrbitControls?0:plCarregar(PL_ORBIT)).then(()=>{ msg.textContent=''; pl3Dmontar(manter); })
  .catch(()=>{ msg.textContent='Não foi possível carregar a biblioteca 3D (verifique a conexão com a internet).'; });
}
/* texturas geradas no próprio programa (sem baixar imagens) */
function plTex(tipo){
  const T=window.THREE, cache=_pl.tex||(_pl.tex={}); if(cache[tipo]) return cache[tipo];
  const cv=document.createElement('canvas'), N=tipo==='pav'?512:256; cv.width=cv.height=N; const g=cv.getContext('2d');
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  if(tipo==='pav'){ /* blocos 20×10 cm em fiada (tijolinho), ladrilho de 40×40 cm */
    g.fillStyle='#6f6a62'; g.fillRect(0,0,N,N);
    const r=N/4, bl=N/2, j=5;
    for(let q=0;q<4;q++){ const off=(q%2)?bl/2:0; for(let c=-1;c<3;c++){ const x=c*bl+off, y=q*r; const v=150+Math.round(rnd()*26-13), t=Math.round(rnd()*8-4);
      g.fillStyle='rgb('+(v+t+6)+','+(v+t+2)+','+(v-4)+')'; g.fillRect(x+j/2,y+j/2,bl-j,r-j);
      for(let k=0;k<260;k++){ const a=rnd()*40-20; g.fillStyle='rgba('+(a>0?255:0)+','+(a>0?255:0)+','+(a>0?255:0)+','+(Math.abs(a)/220)+')'; g.fillRect(x+j/2+rnd()*(bl-j),y+j/2+rnd()*(r-j),1.6,1.6); }
      g.fillStyle='rgba(255,255,255,.16)'; g.fillRect(x+j/2,y+j/2,bl-j,2); g.fillRect(x+j/2,y+j/2,2,r-j);
      g.fillStyle='rgba(0,0,0,.18)'; g.fillRect(x+j/2,y+r-j/2-2,bl-j,2); g.fillRect(x+bl-j/2-2,y+j/2,2,r-j); } }
  }else if(tipo==='grama'){
    g.fillStyle='#5f8a3a'; g.fillRect(0,0,N,N);
    for(let k=0;k<9000;k++){ const v=rnd(); g.fillStyle=v<0.5?'rgba(40,80,25,.35)':v<0.85?'rgba(120,160,70,.35)':'rgba(150,130,80,.25)'; g.fillRect(rnd()*N,rnd()*N,1+rnd()*2,1+rnd()*3); }
  }else if(tipo==='concreto'||tipo==='sarjeta'){
    g.fillStyle=tipo==='concreto'?'#b9b8b1':'#9fa09b'; g.fillRect(0,0,N,N);
    for(let k=0;k<6000;k++){ const v=rnd(); g.fillStyle=v<0.5?'rgba(0,0,0,.08)':'rgba(255,255,255,.12)'; g.fillRect(rnd()*N,rnd()*N,1.5,1.5); }
  }else{ /* granular / solo, tingido pela cor da camada */
    g.fillStyle='#bbbbbb'; g.fillRect(0,0,N,N);
    for(let k=0;k<5000;k++){ const v=rnd(), s=1+rnd()*(tipo==='areia'?1.2:3.5); g.fillStyle=v<0.5?'rgba(0,0,0,.22)':'rgba(255,255,255,.28)'; g.beginPath(); g.arc(rnd()*N,rnd()*N,s/2,0,7); g.fill(); }
  }
  const t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; t.encoding=T.sRGBEncoding; if(_pl.t3) t.anisotropy=_pl.t3.rd.capabilities.getMaxAnisotropy();
  return cache[tipo]=t;
}
function plSprite(txt,o){
  const T=window.THREE; o=o||{}; const fs=48, pad=14, cv=document.createElement('canvas'), g=cv.getContext('2d');
  const lines=String(txt).split('\n'); g.font='bold '+fs+'px Arial'; const w=Math.ceil(Math.max(...lines.map(l=>g.measureText(l).width)))+pad*2, h=lines.length*(fs+8)+pad*2;
  cv.width=w; cv.height=h; g.font='bold '+fs+'px Arial';
  g.fillStyle=o.bg||'rgba(255,255,255,.88)'; g.strokeStyle=o.bd||'#334'; g.lineWidth=4; g.beginPath(); if(g.roundRect) g.roundRect(2,2,w-4,h-4,12); else g.rect(2,2,w-4,h-4); g.fill(); g.stroke();
  g.fillStyle=o.c||'#111'; g.textBaseline='top'; lines.forEach((l,i)=>g.fillText(l,pad,pad+i*(fs+8)));
  const tx=new T.CanvasTexture(cv); tx.encoding=T.sRGBEncoding;
  const sp=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:o.dt!==false,transparent:true,sizeAttenuation:false})); const k=(o.alt||0.9)*0.026/(fs+8); sp.scale.set(w*k,h*k,1); sp.renderOrder=10; sp.userData.tela=1; return sp;
}
function plRuido(x,y){ const h=(i,j)=>{ const n=Math.sin(i*127.1+j*311.7)*43758.5453; return n-Math.floor(n); }; const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=h(i,j),b=h(i+1,j),c=h(i,j+1),d=h(i+1,j+1); return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy; }
/* ══════════════════════════════════════════════════════
   PI-11 · ÁRVORES E POSTES
   Cada objeto pertence a uma rua: {id, t:'arv'|'poste', est (m), off (m; + = lado esquerdo, − = direito, medido do eixo)}.
   Fonte única: ruas[i].obj. As colunas “Árvores” e “Postes” da Topografia (c19/c20, ocultas por padrão) mostram
   os objetos entre a linha e a seguinte: “E 4,50” (na estaca) ou “D 4,20 +7,50” (7,50 m depois da estaca).
══════════════════════════════════════════════════════ */
const OBJ_TIPOS={arv:{nome:'Árvore',plural:'Árvores',ic:'🌳'},poste:{nome:'Poste',plural:'Postes',ic:'💡'}};
function objsRua(r){ if(!r) return []; if(!Array.isArray(r.obj)) r.obj=[]; return r.obj; }
function objId(){ return 'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function objTodos(){ const out=[]; ruas.forEach((r,ri)=>objsRua(r).forEach(o=>out.push({o,r,ri}))); return out; }
function objAchar(id){ return objTodos().find(x=>x.o.id===id)||null; }
function objIntervalo(rows,i){ const a=+rows[i].est, b=i<rows.length-1?+rows[i+1].est:Infinity; return [a,b,i===0,i===rows.length-1]; }
function objNoIntervalo(o,rows,i){ const [a,b,pri,ult]=objIntervalo(rows,i); return (o.est>=a-1e-6||pri)&&(o.est<b-1e-6||ult); }
function objTxtLinha(r,rows,i,t){
  const a=+rows[i].est;
  return objsRua(r).filter(o=>o.t===t&&objNoIntervalo(o,rows,i)).sort((x,y)=>x.est-y.est)
    .map(o=>{ const dd=o.est-a; return (o.off>=0?'E ':'D ')+fmt(Math.abs(o.off),2)+(Math.abs(dd)>0.005?(dd>0?' +':' −')+fmt(Math.abs(dd),2):''); }).join('; ');
}
function plDadosSeguro(){ try{ return plDados(); }catch(e){ return []; } }
/* aviso se o objeto estiver dentro da pista (ou fora da rua) */
function objAviso(o,r,D){
  const d=(D||plDadosSeguro()).find(x=>x.id===r.id); if(!d) return '';
  const L=d.L; if(!L.length) return '';
  let k=0; while(k<L.length-2&&L[k+1].est<o.est) k++; const a=L[k], b=L[Math.min(k+1,L.length-1)], tt=(b.est-a.est)>0?Math.max(0,Math.min(1,(o.est-a.est)/(b.est-a.est))):0, bb=(a.larg+(b.larg-a.larg)*tt)/2;
  const nm=OBJ_TIPOS[o.t].nome;
  if(Math.abs(o.off)<bb-0.01) return '⚠ '+nm+' em EST. '+estacaTxt(o.est)+' está DENTRO da pista ('+fmt(Math.abs(o.off),2)+' m do eixo; a pista vai até '+fmt(bb,2)+' m).';
  if(o.est<L[0].est-0.01||o.est>L[L.length-1].est+0.01) return '⚠ '+nm+' fora do trecho da rua (EST. '+estacaTxt(o.est)+').';
  return '';
}
function objMudou(op){
  op=op||{};
  if(op.tabela!==false){ try{ const pn=document.getElementById('pane-topo'); renderTopoTable(); if(pn&&pn.classList.contains('active')) calcTopo(); }catch(e){} }
  const pn=document.getElementById('tab-planta');
  if(pn&&pn.classList.contains('active')&&typeof resultado!=='undefined'&&resultado){ if(_pl.modo==='planta') plDesenhar(); else if(_pl.t3&&_pl.t3.grp) plObj3D(); }
  objPainel();
}
/* ponto do mundo (planta, m) → rua, estaca e afastamento; a posição física é a mesma em qualquer rua que contenha a estaca */
function objDeMundo(p,D){
  let best=null;
  (D||plDados()).forEach(d=>{ const ly=d.lay, dx=p[0]-ly.A[0], dy=p[1]-ly.A[1], al=dx*ly.d[0]+dy*ly.d[1]+ly.sA, lat=dx*ly.n[0]+dy*ly.n[1];
    const s0=d.L[0].est, sN=d.L[d.L.length-1].est, ac=Math.min(sN,Math.max(s0,al)), fora=Math.abs(al-ac), sc=fora*10+Math.abs(lat);
    if(!best||sc<best.sc) best={sc,d,est:ac,off:lat}; });
  return best;
}
function objMundo(o,d){ return [d.lay.pos(o.est)[0]+d.lay.n[0]*o.off,d.lay.pos(o.est)[1]+d.lay.n[1]*o.off]; }
function objNovo(t,p){
  const D=plDados(), b=objDeMundo(p,D); if(!b) return null;
  const r=ruas[b.d.i], o={id:objId(),t,est:+b.est.toFixed(3),off:+b.off.toFixed(3)};
  objsRua(r).push(o); objsRua(r).sort((x,y)=>x.est-y.est); _pl.objSel=o.id;
  const av=objAviso(o,r,D); toast(av||(OBJ_TIPOS[t].nome+' locada em '+objDesc(o,r)+'.'),!!av);
  objMudou(); return o;
}
function objDesc(o,r){ return nomeRua(ruaIdx(r.id))+', EST. '+estacaTxt(o.est)+', lado '+(o.off>=0?'esquerdo':'direito')+' a '+fmt(Math.abs(o.off),2)+' m do eixo'; }
function objMover(id,p,final){
  const x=objAchar(id); if(!x) return; const D=plDados(), b=objDeMundo(p,D); if(!b) return;
  const nr=ruas[b.d.i]; if(nr!==x.r){ x.r.obj=objsRua(x.r).filter(o=>o.id!==id); objsRua(nr).push(x.o); }
  x.o.est=+b.est.toFixed(3); x.o.off=+b.off.toFixed(3);
  if(final){ objsRua(nr).sort((a,c)=>a.est-c.est); const av=objAviso(x.o,nr,D); toast(av||(OBJ_TIPOS[x.o.t].nome+': '+objDesc(x.o,nr)+'.'),!!av); objMudou(); }
}
function objExcluir(id){ const x=objAchar(id); if(!x) return; x.r.obj=objsRua(x.r).filter(o=>o.id!==id); if(_pl.objSel===id) _pl.objSel=null; objMudou(); toast(OBJ_TIPOS[x.o.t].nome+' excluída.'); }
function objExcluirTodos(t){
  const n=objTodos().filter(x=>!t||x.o.t===t).length; if(!n){ toast('Não há '+(t?OBJ_TIPOS[t].plural.toLowerCase():'árvores nem postes')+' para excluir.'); return; }
  if(!confirm('Excluir '+n+' '+(t?OBJ_TIPOS[t].plural.toLowerCase():'objetos (árvores e postes)')+' de todas as ruas?')) return;
  ruas.forEach(r=>{ r.obj=objsRua(r).filter(o=>t&&o.t!==t); }); _pl.objSel=null; objMudou();
}
/* distribuir automaticamente: postes alternando os lados; árvores nos dois lados; longe dos cruzamentos */
function objDistribuir(){
  const ep=parseFloat((document.getElementById('obj-dp')||{}).value)||0, ea=parseFloat((document.getElementById('obj-da')||{}).value)||0;
  if(!(ep>=10)&&!(ea>=4)){ toast('Informe o espaçamento dos postes (≥ 10 m) ou das árvores (≥ 4 m).',true); return; }
  const D=plDados(), P=secaoParams(), wmf=plMfLarg(P), A=D.map(d=>plAmostras(d,1)), calOn=!!_cal.ativo;
  const zonas=D.map((d,j)=>plPoligonoCal(d,A[j],wmf+6,calOn));
  let np=0, na=0;
  D.forEach((d,j)=>{
    const r=ruas[d.i], s0=d.L[0].est, sN=d.L[d.L.length-1].est;
    const larg=(e,sg)=>{ let k=0; while(k<A[j].length-2&&A[j][k+1].est<e) k++; const q=A[j][k]; return {b:q.b,cal:calOn?(sg>0?q.calE:q.calD):0}; };
    const livre=(p,o)=>!zonas.some((z,k)=>k!==j&&plDentro(p,z))&&!objsRua(r).some(x=>x.t===o&&Math.abs(x.est-p.est)<2&&Math.sign(x.off)===Math.sign(p.off));
    const poe=(t,e,sg,u)=>{ const o={id:objId(),t,est:+e.toFixed(3),off:+(sg*u).toFixed(3)}, p=objMundo(o,d); p.est=o.est; p.off=o.off; if(!livre(p,t)) return false; objsRua(r).push(o); return true; };
    if(ep>=10){ let k=0; for(let e=s0+ep/2;e<=sN-2;e+=ep,k++){ const sg=k%2?-1:1, w=larg(e,sg); if(poe('poste',e,sg,w.b+wmf+(w.cal>0.6?0.35:0.5))) np++; } }
    if(ea>=4){ [1,-1].forEach(sg=>{ for(let e=s0+ea*0.75;e<=sN-2;e+=ea){ const w=larg(e,sg); if(calOn&&w.cal>0.01&&w.cal<1.2) continue; const u=w.b+wmf+(w.cal>=1.2?Math.min(0.75,w.cal/2):1.2);
      if(objsRua(r).some(x=>x.t==='poste'&&Math.abs(x.est-e)<4&&Math.sign(x.off)===sg)) continue; if(poe('arv',e,sg,u)) na++; } }); }
    objsRua(r).sort((x,y)=>x.est-y.est);
  });
  objMudou(); toast('Distribuídos: '+np+' poste(s) e '+na+' árvore(s). Arraste para ajustar; os valores ficam na Topografia (colunas Árvores e Postes).');
}
/* ── painel flutuante do botão 🌳 Árvores e postes ── */
function objBotao(){
  const box=document.getElementById('pl-obj'); if(!box) return;
  _pl.objAberto=!_pl.objAberto; if(!_pl.objAberto){ objModo(null); box.style.display='none'; return; }
  box.style.display=''; objPainel();
}
function objModo(t){
  _pl.objModo=t||null;
  const w1=document.getElementById('pl-svgwrap'), w2=document.getElementById('pl-3dwrap');
  [w1,w2].forEach(w=>{ if(w) w.style.cursor=t?'crosshair':(w===w1?'grab':''); });
  const m=document.getElementById('pl-msg'); if(m) m.innerHTML=t?'<b style="color:#b45309">Clique no desenho onde fica '+(t==='arv'?'a árvore':'o poste')+'</b> (Esc cancela).':'';
  objPainel();
}
function objPainel(){
  const box=document.getElementById('pl-obj'); if(!box||box.style.display==='none') return;
  const tot=objTodos(), na=tot.filter(x=>x.o.t==='arv').length, np=tot.length-na, sel=_pl.objSel?objAchar(_pl.objSel):null, md=_pl.objModo;
  const b=(t)=>'<button type="button" class="tb-btn'+(md===t?' tb-btn-save':'')+'" onclick="objModo(_pl.objModo===\''+t+'\'?null:\''+t+'\')">'+OBJ_TIPOS[t].ic+' ＋ '+OBJ_TIPOS[t].nome+'</button>';
  box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b>🌳 Árvores e postes</b><button type="button" class="tb-btn" style="padding:0 6px" onclick="objBotao()" title="Fechar">✕</button></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">'+b('arv')+b('poste')+'</div>'+
    '<div style="font-size:11px;color:var(--fg2);line-height:1.4">Clique no botão e depois no desenho (planta ou 3D). Para mudar de lugar, <b>arraste</b> o símbolo. Clique num símbolo para selecionar; <b>Delete</b> apaga.</div>'+
    (sel?'<div style="margin-top:6px;padding:6px;border:1px solid #f59e0b;border-radius:6px;font-size:12px;background:rgba(245,158,11,.08)"><b>'+OBJ_TIPOS[sel.o.t].ic+' '+OBJ_TIPOS[sel.o.t].nome+' selecionada</b><br>'+esc(objDesc(sel.o,sel.r))+'<div style="margin-top:4px"><button type="button" class="btn-rem" onclick="objExcluir(\''+sel.o.id+'\')">🗑 Excluir</button></div></div>':'')+
    '<div style="margin-top:8px;font-size:12px;border-top:1px solid var(--border,#ddd);padding-top:6px"><b>Distribuir automaticamente</b><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px">Postes a cada <input id="obj-dp" type="number" min="10" step="1" value="35" style="width:50px"> m (alternando os lados)</div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px">Árvores a cada <input id="obj-da" type="number" min="0" step="1" value="12" style="width:50px"> m (nos dois lados; 0 = nenhuma)</div><button type="button" class="tb-btn" style="margin-top:4px" onclick="objDistribuir()">Distribuir</button></div>'+
    '<div style="margin-top:8px;font-size:12px;border-top:1px solid var(--border,#ddd);padding-top:6px">No projeto: <b>'+na+'</b> árvore(s) · <b>'+np+'</b> poste(s) '+(tot.length?'<button type="button" class="btn-rem" style="font-size:11px" onclick="objExcluirTodos()">🗑 Excluir todos</button>':'')+
    '<div style="font-size:11px;color:var(--fg2);margin-top:3px">Os mesmos dados ficam na <b>Topografia</b>, colunas “Árvores” e “Postes” (ocultas: mostre em 🌳 Árvores e postes ou 👁 Colunas). Formato: <b>E 4,50</b> = lado esquerdo, 4,50 m do eixo, na estaca; <b>D 4,20 +7,50</b> = direito, 7,50 m depois da estaca.</div></div>';
}
document.addEventListener('keydown',e=>{
  const pn=document.getElementById('tab-planta'); if(!pn||!pn.classList.contains('active')) return;
  if(/INPUT|SELECT|TEXTAREA/.test((e.target&&e.target.tagName)||'')) return;
  if(e.key==='Escape'&&_pl.objModo){ objModo(null); e.preventDefault(); }
  if((e.key==='Delete'||e.key==='Backspace')&&_pl.objSel){ objExcluir(_pl.objSel); e.preventDefault(); }
});
/* Topografia: botão mostra/oculta as duas colunas */
function objSvg(X,Y,sc,D){
  let s='';
  objTodos().forEach(x=>{ const d=D.find(q=>q.id===x.r.id); if(!d) return; const p=objMundo(x.o,d), cx=X(p), cy=Y(p), sel=_pl.objSel===x.o.id, ruim=!!objAviso(x.o,x.r,D);
    const st=sel?'#f59e0b':(ruim?'#b91c1c':null);
    if(x.o.t==='arv'){ const R=Math.max(6,2.5*sc);
      s+='<g data-obj="'+x.o.id+'" style="cursor:move"><circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+R.toFixed(1)+'" fill="rgba(46,125,50,.30)" stroke="'+(st||'#2e7d32')+'" stroke-width="'+(sel?2.4:1.2)+'"/>'+
        '<path d="M'+(cx-R*0.7).toFixed(1)+','+cy.toFixed(1)+' h'+(R*1.4).toFixed(1)+' M'+cx.toFixed(1)+','+(cy-R*0.7).toFixed(1)+' v'+(R*1.4).toFixed(1)+'" stroke="#2e7d32" stroke-width="0.6" opacity=".7"/>'+
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+Math.max(1.8,0.18*sc).toFixed(1)+'" fill="#6d4c2f"/></g>';
    }else{ const R=Math.max(4,0.22*sc), n=d.lay.n, sg=x.o.off>=0?-1:1, ax=cx+n[0]*sg*Math.max(10,1.8*sc), ay=cy-n[1]*sg*Math.max(10,1.8*sc);
      s+='<g data-obj="'+x.o.id+'" style="cursor:move"><circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+(R+5).toFixed(1)+'" fill="transparent"/><line x1="'+cx.toFixed(1)+'" y1="'+cy.toFixed(1)+'" x2="'+ax.toFixed(1)+'" y2="'+ay.toFixed(1)+'" stroke="#374151" stroke-width="1.4"/><circle cx="'+ax.toFixed(1)+'" cy="'+ay.toFixed(1)+'" r="'+(R*0.9).toFixed(1)+'" fill="#fde68a" stroke="#374151" stroke-width="0.8"/>'+
        '<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+R.toFixed(1)+'" fill="#6b7280" stroke="'+(st||'#111')+'" stroke-width="'+(sel?2.4:1)+'"/><path d="M'+(cx-R*0.6).toFixed(1)+','+(cy-R*0.6).toFixed(1)+' L'+(cx+R*0.6).toFixed(1)+','+(cy+R*0.6).toFixed(1)+' M'+(cx+R*0.6).toFixed(1)+','+(cy-R*0.6).toFixed(1)+' L'+(cx-R*0.6).toFixed(1)+','+(cy+R*0.6).toFixed(1)+'" stroke="#fff" stroke-width="0.8"/></g>';
    }
  });
  return s;
}
function objPlantaMundo(el,cx,cy){ const sv=el.querySelector('svg'), vb=_pl.vb; if(!sv||!vb) return null; const r=sv.getBoundingClientRect(); return [vb.x+(cx-r.left)/r.width*vb.w,-(vb.y+(cy-r.top)/r.width*vb.w)]; }
function objPlantaEventos(el){
  if(!el||el.dataset.obj) return; el.dataset.obj='1';
  const ini=(cx,cy,tg,e)=>{
    if(_pl.objModo){ const p=objPlantaMundo(el,cx,cy); if(p){ objNovo(_pl.objModo,p); objModo(null); } e.preventDefault(); e.stopImmediatePropagation(); return true; }
    const g=tg&&tg.closest&&tg.closest('[data-obj]'); if(!g) return false;
    _pl.objSel=g.getAttribute('data-obj'); _pl.objArr={id:_pl.objSel,cx,cy,mov:false}; objPainel(); plDesenhar();
    e.preventDefault(); e.stopImmediatePropagation(); return true;
  };
  const mov=(cx,cy)=>{ const a=_pl.objArr; if(!a) return false; if(!a.mov&&Math.hypot(cx-a.cx,cy-a.cy)<4) return true; a.mov=true;
    const p=objPlantaMundo(el,cx,cy); if(p){ objMover(a.id,p,false); if(!_pl.raf){ _pl.raf=requestAnimationFrame(()=>{ _pl.raf=0; plDesenhar(); }); } } return true; };
  const fim=()=>{ const a=_pl.objArr; if(!a) return; _pl.objArr=null; if(a.mov){ const x=objAchar(a.id); if(x){ const d=plDados().find(q=>q.id===x.r.id); if(d) objMover(a.id,objMundo(x.o,d),true); } } };
  el.addEventListener('mousedown',e=>{ if(e.button!==0) return; ini(e.clientX,e.clientY,e.target,e); },true);
  window.addEventListener('mousemove',e=>{ if(_pl.objArr){ mov(e.clientX,e.clientY); } });
  window.addEventListener('mouseup',fim);
  el.addEventListener('touchstart',e=>{ if(e.touches.length!==1) return; const t=e.touches[0]; ini(t.clientX,t.clientY,e.target,e); },{capture:true,passive:false});
  el.addEventListener('touchmove',e=>{ if(_pl.objArr&&e.touches.length===1){ e.preventDefault(); e.stopImmediatePropagation(); mov(e.touches[0].clientX,e.touches[0].clientY); } },{capture:true,passive:false});
  el.addEventListener('touchend',e=>{ if(_pl.objArr){ e.stopImmediatePropagation(); fim(); } },true);
}

/* ══════════════════════════════════════════════════════
   PI-11 · 3D REALISTA (cenário de jogo) — só desenho, nenhum cálculo muda
   Céu com nuvens e reflexos (PMREM), sol por horário, qualidade (Baixa…Ultra), texturas com relevo
   (mapa de normais) nos blocos, meio-fio, calçada, grama e terra; grama 3D com vento; cenário ilustrativo
   (muros, casas, quintais, árvores); árvores e postes locados pelo usuário; horizonte com morros.
══════════════════════════════════════════════════════ */
const PL_QUAL={baixa:{n:'Baixa',pr:1,sh:0,grama:0,tex:512,env:64,casas:1,arvq:0.4},media:{n:'Média',pr:1.25,sh:1024,grama:9000,tex:1024,env:128,casas:1,arvq:0.7},
  alta:{n:'Alta',pr:1.75,sh:2048,grama:26000,tex:1024,env:256,casas:1,arvq:1},ultra:{n:'Ultra',pr:2.5,sh:4096,grama:60000,tex:2048,env:256,casas:1,arvq:1.3}};
const PL_HORAS={manha:{n:'Manhã',el:24,az:80,sol:'#ffe3bf',si:2.0,zen:'#3b74c2',hor:'#d3e2ee',nuv:'#f4f1ec',exp:0.78},
  dia:{n:'Meio-dia',el:66,az:15,sol:'#fff7ea',si:2.3,zen:'#2c6bc6',hor:'#c6ddf1',nuv:'#ffffff',exp:0.72},
  tarde:{n:'Tarde',el:34,az:290,sol:'#fff0d9',si:2.15,zen:'#3570c0',hor:'#d0e0ee',nuv:'#fbf6ef',exp:0.76},
  por:{n:'Fim de tarde',el:8,az:285,sol:'#ffb36e',si:1.75,zen:'#5d86bf',hor:'#f3cfa4',nuv:'#ffe0bf',exp:0.9}};
function plMovel(){ try{ return (typeof CFG!=='undefined'&&CFG.device&&/android|iphone/i.test(CFG.device))||('ontouchstart' in window&&Math.min(screen.width,screen.height)<760); }catch(e){ return false; } }
function plQualK(){ let k=null; try{ k=localStorage.getItem('pint_3d_qual'); }catch(e){} return PL_QUAL[k]?k:(plMovel()?'media':'alta'); }
function plHoraK(){ let k=null; try{ k=localStorage.getItem('pint_3d_hora'); }catch(e){} return PL_HORAS[k]?k:'manha'; }
function plSetQual(k){ try{ localStorage.setItem('pint_3d_qual',k); }catch(e){} _pl.tex2={}; if(_pl.t3){ _pl.t3.qualAplicada=null; } pl3D(true); }
function plSetHora(k){ try{ localStorage.setItem('pint_3d_hora',k); }catch(e){} if(_pl.t3){ plCeuAplicar(_pl.t3); } }
function plLin(c){ return new window.THREE.Color(c).convertSRGBToLinear(); }
function plSolDir(h){ const T=window.THREE, el=h.el*Math.PI/180, az=h.az*Math.PI/180; return new T.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)).normalize(); }
/* ── céu (shader): degradê, sol, nuvens animadas; o mesmo céu gera o mapa de reflexos ── */
function plCeuMat(){
  const T=window.THREE;
  return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:true,fog:false,
    uniforms:{uSun:{value:new T.Vector3(0,1,0)},uT:{value:0},uZen:{value:new T.Color()},uHor:{value:new T.Color()},uSol:{value:new T.Color()},uNuv:{value:new T.Color()},uChao:{value:new T.Color()},uDisco:{value:1}},
    vertexShader:'varying vec3 vD; void main(){ vD=position; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p; gl_Position.z=p.w*0.99999; }',
    fragmentShader:[
      'uniform vec3 uSun,uZen,uHor,uSol,uNuv,uChao; uniform float uT,uDisco; varying vec3 vD;',
      'float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }',
      'float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }',
      'float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<6;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }',
      'void main(){ vec3 d=normalize(vD); float y=d.y; float sd=max(dot(d,uSun),0.0);',
      ' vec3 c=mix(uHor,uZen,pow(clamp(y,0.0,1.0),0.5));',
      ' c+=uSol*(pow(sd,6.0)*0.22+pow(sd,48.0)*0.35);',
      ' c=mix(c,uHor*1.05,exp(-max(y,0.0)*9.0)*0.55);',
      ' if(y>0.0){ vec2 uv=d.xz/(y+0.18)*1.35+vec2(uT*0.006,uT*0.0025); float n=fbm(uv); float cl=smoothstep(0.52,0.80,n)*smoothstep(0.0,0.18,y);',
      '   float sh=fbm(uv+uSun.xz*0.06); vec3 cc=uNuv*mix(0.62,1.05,smoothstep(0.35,0.9,1.0-sh+0.3))+uSol*pow(sd,5.0)*0.25; c=mix(c,cc,cl*0.88); }',
      ' else { c=mix(uHor*0.92,uChao,smoothstep(0.0,0.25,-y)); }',
      ' c+=uSol*smoothstep(0.99955,0.99975,sd)*12.0*uDisco;',
      ' gl_FragColor=vec4(c,1.0);',
      ' #include <tonemapping_fragment>',
      ' #include <encodings_fragment>',
      '}'].join('\n')});
}
function plCeuInit(t){
  const T=window.THREE;
  t.ceuMat=plCeuMat(); t.ceu=new T.Mesh(new T.SphereGeometry(10,48,24),t.ceuMat); t.ceu.frustumCulled=false; t.ceu.renderOrder=-10; t.sc.add(t.ceu);
  t.hemi=new T.HemisphereLight(0xdfefff,0x4f6338,0.12); t.sc.add(t.hemi);
  t.uT={value:0}; t.relogio=new T.Clock();
}
function plCeuAplicar(t){
  const T=window.THREE, h=PL_HORAS[plHoraK()], q=PL_QUAL[plQualK()], dir=plSolDir(h);
  const U=t.ceuMat.uniforms; U.uSun.value.copy(dir); U.uZen.value.copy(plLin(h.zen)); U.uHor.value.copy(plLin(h.hor)); U.uSol.value.copy(plLin(h.sol)); U.uNuv.value.copy(plLin(h.nuv)); U.uChao.value.copy(plLin('#6f7a64'));
  t.solDir=dir; t.sun.color.set(h.sol); t.sun.intensity=h.si; t.rd.toneMappingExposure=h.exp;
  t.hemi.color.set(h.hor); t.hemi.groundColor.set('#55683f');
  if(t.sc.fog) t.sc.fog.color.copy(U.uHor.value);
  /* mapa de reflexos (IBL) a partir do mesmo céu */
  try{
    const es=new T.Scene(), m2=t.ceuMat.clone(); m2.uniforms=T.UniformsUtils.clone(t.ceuMat.uniforms); m2.uniforms.uDisco.value=0.35; m2.uniforms.uT.value=0;
    const sm=new T.Mesh(new T.SphereGeometry(10,32,16),m2); es.add(sm);
    const pm=t.pmrem||(t.pmrem=new T.PMREMGenerator(t.rd)); const rt=pm.fromScene(es,0.02,0.1,100);
    if(t.envRT) t.envRT.dispose(); t.envRT=rt; t.sc.environment=rt.texture; sm.geometry.dispose(); m2.dispose();
  }catch(e){ t.sc.environment=null; }
  t.precisaSombra=true;
}
/* ── texturas com relevo (cor + normal + rugosidade), geradas no programa ── */
function plCanvas(N){ const c=document.createElement('canvas'); c.width=c.height=N; return c; }
function plRnd(seed){ let s=seed>>>0||1; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; }
function plNormal(hc,forca){
  const N=hc.width, src=hc.getContext('2d').getImageData(0,0,N,N).data, out=plCanvas(N), go=out.getContext('2d'), im=go.createImageData(N,N), o=im.data;
  const H=(x,y)=>src[((((y%N)+N)%N)*N+(((x%N)+N)%N))*4]/255;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=(H(x+1,y)-H(x-1,y))*forca, dy=(H(x,y+1)-H(x,y-1))*forca, l=Math.hypot(dx,dy,1), i=(y*N+x)*4;
    o[i]=(-dx/l*0.5+0.5)*255; o[i+1]=(dy/l*0.5+0.5)*255; o[i+2]=(1/l*0.5+0.5)*255; o[i+3]=255; }
  go.putImageData(im,0,0); return out;
}
function plTexDe(cv,srgb,aniso){ const T=window.THREE, t=new T.CanvasTexture(cv); t.wrapS=t.wrapT=T.RepeatWrapping; if(srgb) t.encoding=T.sRGBEncoding; t.anisotropy=aniso||1; t.needsUpdate=true; return t; }
function plTex2(nome){
  const cache=_pl.tex2||(_pl.tex2={}); if(cache[nome]) return cache[nome];
  const q=PL_QUAL[plQualK()], an=_pl.t3?Math.min(16,_pl.t3.rd.capabilities.getMaxAnisotropy()):4;
  let N=q.tex, cor, alt, rug=null, fn=4, extra={};
  const R=plRnd(nome.length*977+13), pon=(g,n,cor1,cor2,smin,smax,W,H,x0,y0)=>{ for(let k=0;k<n;k++){ g.fillStyle=R()<0.5?cor1:cor2; const s=smin+R()*(smax-smin); g.fillRect((x0||0)+R()*(W||N),(y0||0)+R()*(H||N),s,s); } };
  if(nome==='asfalto'){ /* CBUQ: massa escura com agregados claros */
    cor=plCanvas(N); alt=plCanvas(N); rug=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d'), gr=rug.getContext('2d'), k=N/1024;
    g.fillStyle='#3b3c3e'; g.fillRect(0,0,N,N); pon(g,N*N/14,'rgba(18,18,20,.55)','rgba(110,110,108,.40)',1,2.4*k); pon(g,N*N/160,'rgba(170,165,155,.55)','rgba(8,8,8,.55)',1.5*k,3.6*k);
    ga.fillStyle='#808080'; ga.fillRect(0,0,N,N); pon(ga,N*N/14,'rgba(0,0,0,.35)','rgba(255,255,255,.30)',1,2.4*k);
    gr.fillStyle='#d6d6d6'; gr.fillRect(0,0,N,N); pon(gr,N*N/30,'#a8a8a8','#f2f2f2',1,2*k); fn=3;
  }else if(nome==='pav'||nome==='pavCal'){ /* blocos 20×10 cm em fiada: textura = 0,80 × 0,80 m (4 × 8 blocos) */
    cor=plCanvas(N); alt=plCanvas(N); rug=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d'), gr=rug.getContext('2d'), k=N/1024;
    const rows=8, rh=N/rows, bl=N/4, j=Math.max(2,3*k), ch=Math.max(3,8*k);
    g.fillStyle=nome==='pav'?'#8a7f6c':'#8f8168'; g.fillRect(0,0,N,N); pon(g,N*N/40,'rgba(60,50,35,.35)','rgba(190,175,140,.35)',1,2.2*k);
    ga.fillStyle='#000'; ga.fillRect(0,0,N,N); gr.fillStyle='#fff'; gr.fillRect(0,0,N,N);
    for(let r=0;r<rows;r++){ const off=(r%2)?bl/2:0; for(let c=-1;c<5;c++){ const x=c*bl+off+j, y=r*rh+j, w=bl-2*j, h=rh-2*j;
      const base=nome==='pav'?(108+R()*30):(140+R()*26), wm=R()<0.12?-14:0, tr=Math.round(base+wm), tint=nome==='pav'?[4,2,-3]:[22,8,-12];
      g.fillStyle='rgb('+(tr+tint[0])+','+(tr+tint[1])+','+(tr+tint[2])+')'; g.fillRect(x,y,w,h);
      pon(g,Math.round(w*h/14),'rgba(0,0,0,.10)','rgba(255,255,255,.11)',1,1.8*k,w,h,x,y);
      pon(g,Math.round(w*h/260),'rgba(40,36,30,.28)','rgba(230,225,215,.22)',1.5*k,3.2*k,w,h,x,y);
      const gd=g.createLinearGradient(x,y,x+w,y+h); gd.addColorStop(0,'rgba(255,255,255,.05)'); gd.addColorStop(1,'rgba(0,0,0,.07)'); g.fillStyle=gd; g.fillRect(x,y,w,h);
      for(let s=0;s<ch;s++){ const v=Math.round(90+165*Math.pow((s+1)/ch,0.7)); ga.fillStyle='rgb('+v+','+v+','+v+')'; ga.fillRect(x+s,y+s,w-2*s,h-2*s); }
      pon(ga,Math.round(w*h/30),'rgba(0,0,0,.08)','rgba(255,255,255,.06)',1,2*k,w-2*ch,h-2*ch,x+ch,y+ch);
      const rv=Math.round(170+R()*40); gr.fillStyle='rgb('+rv+','+rv+','+rv+')'; gr.fillRect(x+ch*0.5,y+ch*0.5,w-ch,h-ch);
      g.fillStyle='rgba(0,0,0,.16)'; g.fillRect(x,y+h-1.5*k,w,1.5*k); g.fillRect(x+w-1.5*k,y,1.5*k,h); } }
    fn=6;
  }else if(nome==='concreto'||nome==='sarjeta'||nome==='calcConc'){
    N=Math.min(N,1024); cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    const base={concreto:'#bdbab1',sarjeta:'#a3a39d',calcConc:'#c4c0b6'}[nome]; g.fillStyle=base; g.fillRect(0,0,N,N);
    for(let k=0;k<40;k++){ const x=R()*N,y=R()*N,r=N*(0.05+R()*0.18), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,R()<0.5?'rgba(0,0,0,.06)':'rgba(255,255,255,.06)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    pon(g,N*N/6,'rgba(0,0,0,.07)','rgba(255,255,255,.09)',1,1.6); ga.fillStyle='#808080'; ga.fillRect(0,0,N,N); pon(ga,N*N/5,'rgba(0,0,0,.18)','rgba(255,255,255,.16)',1,2);
    for(let k=0;k<N*N/900;k++){ const x=R()*N,y=R()*N,s=1+R()*2.5; g.fillStyle='rgba(40,40,40,.35)'; g.fillRect(x,y,s,s); ga.fillStyle='#202020'; ga.fillRect(x,y,s,s); }
    if(nome==='sarjeta'){ const gd=g.createLinearGradient(0,0,0,N); gd.addColorStop(0,'rgba(60,55,45,.0)'); gd.addColorStop(0.15,'rgba(60,55,45,.22)'); gd.addColorStop(0.45,'rgba(60,55,45,.05)'); g.fillStyle=gd; g.fillRect(0,0,N,N); }
    g.fillStyle='rgba(30,30,30,.55)'; g.fillRect(0,0,Math.max(2,N/300),N); ga.fillStyle='#000'; ga.fillRect(0,0,Math.max(2,N/300),N); /* junta a cada peça */
    fn=2.5;
  }else if(nome==='grama'){
    N=Math.min(N,1024); cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#4c6f2a'; g.fillRect(0,0,N,N); ga.fillStyle='#000'; ga.fillRect(0,0,N,N);
    const cores=['#3d5f22','#56792f','#6a8a38','#7d9a45','#8c9a52','#46682a','#5d7d33','#9aa463'];
    for(let k=0;k<N*N/9;k++){ const x=R()*N,y=R()*N,l=(3+R()*9)*N/1024*2,a=-Math.PI/2+(R()-0.5)*1.2; g.strokeStyle=cores[(R()*cores.length)|0]; g.lineWidth=0.8+R()*1.2; g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke();
      const v=(80+R()*175)|0; ga.strokeStyle='rgb('+v+','+v+','+v+')'; ga.lineWidth=1; ga.beginPath(); ga.moveTo(x,y); ga.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l); ga.stroke(); }
    fn=3;
  }else if(nome==='terra'){
    N=Math.min(N,1024); cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#8a6a48'; g.fillRect(0,0,N,N); ga.fillStyle='#707070'; ga.fillRect(0,0,N,N);
    pon(g,N*N/4,'rgba(60,40,25,.25)','rgba(170,140,105,.22)',1,2.5); pon(ga,N*N/4,'rgba(0,0,0,.2)','rgba(255,255,255,.2)',1,2.5);
    for(let k=0;k<N*N/350;k++){ const x=R()*N,y=R()*N,r=1.5+R()*4.5, v=(110+R()*90)|0; g.fillStyle='rgb('+(v+20)+','+(v+5)+','+(v-15)+')'; g.beginPath(); g.ellipse(x,y,r,r*0.75,R()*3,0,7); g.fill(); ga.fillStyle='#fff'; ga.beginPath(); ga.ellipse(x,y,r,r*0.75,0,0,7); ga.fill(); }
    fn=4;
  }else if(nome==='reboco'){
    N=512; cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#f2efe8'; g.fillRect(0,0,N,N); pon(g,N*N/3,'rgba(0,0,0,.05)','rgba(255,255,255,.06)',1,2.2);
    for(let k=0;k<26;k++){ const x=R()*N,y=R()*N,r=N*(0.05+R()*0.2), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,'rgba(90,80,60,.05)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    const gd=g.createLinearGradient(0,N,0,N*0.82); gd.addColorStop(0,'rgba(70,60,45,.22)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(0,N*0.8,N,N*0.2); /* sujeira de respingo embaixo */
    ga.fillStyle='#808080'; ga.fillRect(0,0,N,N); pon(ga,N*N/2.5,'rgba(0,0,0,.2)','rgba(255,255,255,.2)',1,3);
    fn=2.2;
  }else if(nome==='telha'){
    N=512; cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d'), rows=12, rh=N/rows, tw=N/8;
    for(let r=0;r<rows;r++) for(let c=0;c<9;c++){ const x=c*tw-(r%2?tw/2:0), y=r*rh, v=0.85+R()*0.3, gd=g.createLinearGradient(x,0,x+tw,0);
      gd.addColorStop(0,'rgb('+(140*v|0)+','+(62*v|0)+','+(38*v|0)+')'); gd.addColorStop(0.5,'rgb('+(196*v|0)+','+(98*v|0)+','+(60*v|0)+')'); gd.addColorStop(1,'rgb('+(120*v|0)+','+(52*v|0)+','+(32*v|0)+')');
      g.fillStyle=gd; g.fillRect(x,y,tw,rh); const ha=ga.createLinearGradient(x,0,x+tw,0); ha.addColorStop(0,'#303030'); ha.addColorStop(0.5,'#ffffff'); ha.addColorStop(1,'#303030'); ga.fillStyle=ha; ga.fillRect(x,y,tw,rh);
      g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(x,y+rh-3,tw,3); ga.fillStyle='#000'; ga.fillRect(x,y+rh-2,tw,2); }
    pon(g,N*N/5,'rgba(0,0,0,.08)','rgba(255,230,200,.08)',1,1.6);
    for(let k=0;k<30;k++){ const x=R()*N,y=R()*N,r=N*(0.04+R()*0.12), gd=g.createRadialGradient(x,y,0,x,y,r); gd.addColorStop(0,'rgba(40,40,30,.18)'); gd.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gd; g.fillRect(x-r,y-r,2*r,2*r); }
    fn=5;
  }else if(nome==='portao'){
    N=256; cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#3b3f44'; g.fillRect(0,0,N,N); ga.fillStyle='#000'; ga.fillRect(0,0,N,N);
    for(let x=0;x<N;x+=16){ g.fillStyle='#585e65'; g.fillRect(x+2,0,9,N); g.fillStyle='rgba(255,255,255,.12)'; g.fillRect(x+2,0,2,N); ga.fillStyle='#fff'; ga.fillRect(x+3,0,7,N); }
    fn=3;
  }else if(nome==='casca'){
    N=256; cor=plCanvas(N); alt=plCanvas(N); const g=cor.getContext('2d'), ga=alt.getContext('2d');
    g.fillStyle='#5a4532'; g.fillRect(0,0,N,N); ga.fillStyle='#777'; ga.fillRect(0,0,N,N);
    for(let k=0;k<700;k++){ const x=R()*N,y=R()*N,l=10+R()*40,v=(50+R()*70)|0; g.fillStyle='rgb('+(v+25)+','+(v+12)+','+v+')'; g.fillRect(x,y,1.5+R()*2.5,l); ga.fillStyle=R()<0.5?'#222':'#ddd'; ga.fillRect(x,y,2,l); }
    fn=4;
  }else if(nome==='folhas'||nome==='palma'){ /* cachos de folhas com transparência (alphaTest) */
    N=nome==='palma'?512:256; cor=plCanvas(N); const g=cor.getContext('2d'); g.clearRect(0,0,N,N);
    if(nome==='folhas'){ for(let k=0;k<170;k++){ const a=R()*Math.PI*2, rr=Math.pow(R(),0.6)*N*0.42, x=N/2+Math.cos(a)*rr, y=N/2+Math.sin(a)*rr, s=N*(0.035+R()*0.03), v=R();
        g.save(); g.translate(x,y); g.rotate(R()*7); g.fillStyle=v<0.33?'#2f5a1f':v<0.66?'#3f7128':'#5b8a33'; g.beginPath(); g.ellipse(0,0,s,s*0.45,0,0,7); g.fill(); g.strokeStyle='rgba(20,40,10,.5)'; g.lineWidth=0.8; g.beginPath(); g.moveTo(-s,0); g.lineTo(s,0); g.stroke(); g.restore(); } }
    else { g.strokeStyle='#6b6a2e'; g.lineWidth=N/90; g.beginPath(); g.moveTo(0,N/2); g.quadraticCurveTo(N/2,N/2-N*0.04,N,N/2); g.stroke();
      for(let k=0;k<56;k++){ const t=k/56, x=t*N, y=N/2-N*0.04*4*t*(1-t), l=N*0.42*Math.sin(Math.PI*Math.min(1,t*1.1+0.08)); [1,-1].forEach(sg=>{ g.strokeStyle=(k%3)?'#4d7a2c':'#3c6824'; g.lineWidth=N/110; g.beginPath(); g.moveTo(x,y); g.lineTo(x+N*0.05,y+sg*l); g.stroke(); }); } }
    const t=plTexDe(cor,true,an); return cache[nome]={map:t};
  }else if(nome==='macro'){
    N=256; cor=plCanvas(N); const g=cor.getContext('2d'), im=g.createImageData(N,N);
    for(let y=0;y<N;y++) for(let x=0;x<N;x++){ let s=0,a=0.5,f=4; for(let o=0;o<5;o++){ s+=a*plRuido((x/N)*f+o*13.1,(y/N)*f+o*7.7)*1; a*=0.5; f*=2; } /* não é periódico de verdade; borda suavizada abaixo */
      const v=Math.round(Math.max(0,Math.min(1,s))*255), i=(y*N+x)*4; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
    g.putImageData(im,0,0); const t=plTexDe(cor,false,1); return cache[nome]={map:t};
  }
  const out={map:plTexDe(cor,true,an),normalMap:alt?plTexDe(plNormal(alt,fn),false,an):null,roughnessMap:rug?plTexDe(rug,false,an):null};
  return cache[nome]=Object.assign(out,extra);
}
/* shader extra: variação de cor em escala grande (quebra a repetição da textura), mistura terra × grama, vento */
function plShader(mm,op){
  const T=window.THREE, t=_pl.t3; op=op||{};
  mm.onBeforeCompile=sh=>{
    sh.uniforms.uMacro={value:plTex2('macro').map}; sh.uniforms.uMacS={value:op.macro||40}; sh.uniforms.uMacA={value:op.macA==null?0.35:op.macA}; sh.uniforms.uT=t.uT;
    if(op.terra){ const tt=plTex2('terra'); sh.uniforms.uTerra={value:tt.map}; sh.uniforms.uTerraN={value:tt.normalMap}; }
    sh.vertexShader='varying vec3 vPlW;\n'+(op.terra?'attribute float aTerra; varying float vTerra;\n':'')+(op.vento?'uniform float uT;\n':'')+sh.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n'+(op.vento?
        '{ vec3 bp=vec3(0.0);\n#ifdef USE_INSTANCING\n bp=vec3(instanceMatrix[3][0],0.0,instanceMatrix[3][2]);\n#endif\n float hgt=max(position.y,0.0)/'+(op.vento.h||1).toFixed(2)+'; float w=sin(uT*1.7+bp.x*0.35+bp.z*0.27)*0.6+sin(uT*3.1+bp.x*0.9)*0.25; transformed.x+=w*hgt*hgt*'+(op.vento.a||0.1).toFixed(3)+'; transformed.z+=w*0.6*hgt*hgt*'+(op.vento.a||0.1).toFixed(3)+'; }':''))
      .replace('#include <project_vertex>','#include <project_vertex>\n{ vec4 plw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\n plw=instanceMatrix*plw;\n#endif\n vPlW=(modelMatrix*plw).xyz; }'+(op.terra?' vTerra=aTerra;':''));
    sh.fragmentShader='varying vec3 vPlW; uniform sampler2D uMacro; uniform float uMacS,uMacA;\n'+(op.terra?'varying float vTerra; uniform sampler2D uTerra; uniform sampler2D uTerraN;\n':'')+sh.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\n'+(op.terra?'{ vec4 tc=mapTexelToLinear(texture2D(uTerra,vUv*1.3)); float m2=smoothstep(0.15,0.85,vTerra+(texture2D(uMacro,vPlW.xz/9.0).r-0.5)*0.5); diffuseColor.rgb=mix(diffuseColor.rgb,tc.rgb,m2); }\n':'')+
        '{ float mc=texture2D(uMacro,vPlW.xz/uMacS).r*0.7+texture2D(uMacro,vPlW.xz/(uMacS*0.23)).r*0.3; diffuseColor.rgb*=1.0+(mc-0.5)*uMacA*2.0; }');
  };
  mm.customProgramCacheKey=()=>'pl11'+JSON.stringify(op);
  return mm;
}
function plSombraFolha(k){ const T=window.THREE, c=_pl.sf11||(_pl.sf11={}); if(c[k]) return c[k]; return c[k]=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:plTex2(k).map,alphaTest:0.42}); }
function plMat11(k){
  const T=window.THREE, c=_pl.mat11||(_pl.mat11={}); if(c[k]) return c[k];
  const S=(o)=>{ const m=new T.MeshStandardMaterial(Object.assign({color:0xffffff,roughness:0.9,metalness:0},o)); m.userData.keep=1; return m; };
  let m;
  if(k==='pav'||k==='pavCal'||k==='asfalto'){ const t=plTex2(k); m=plShader(S({map:t.map,normalMap:t.normalMap,roughnessMap:t.roughnessMap,roughness:1,envMapIntensity:0.7,normalScale:new T.Vector2(1.1,1.1),polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),{macro:22,macA:0.03}); }
  else if(k==='concreto'||k==='sarjeta'||k==='calcConc'){ const t=plTex2(k); m=plShader(S({map:t.map,normalMap:t.normalMap,roughness:0.88,envMapIntensity:0.6,normalScale:new T.Vector2(0.6,0.6)}),{macro:18,macA:0.14}); }
  else if(k==='terreno'){ const t=plTex2('grama'); m=plShader(S({map:t.map,normalMap:t.normalMap,vertexColors:true,roughness:1,envMapIntensity:0.45,normalScale:new T.Vector2(0.8,0.8)}),{macro:35,macA:0.32,terra:true}); }
  else if(k==='terrenoLonge'){ const t=plTex2('grama'); m=plShader(S({map:t.map,roughness:1,envMapIntensity:0.4}),{macro:60,macA:0.35}); }
  else if(k==='parede'){ const t=plTex2('reboco'); m=S({map:t.map,normalMap:t.normalMap,vertexColors:true,roughness:0.95,side:T.DoubleSide,envMapIntensity:0.5,normalScale:new T.Vector2(0.5,0.5)}); }
  else if(k==='telha'){ const t=plTex2('telha'); m=plShader(S({map:t.map,normalMap:t.normalMap,roughness:0.75,side:T.DoubleSide,envMapIntensity:0.6}),{macro:14,macA:0.2}); }
  else if(k==='laje'){ const t=plTex2('concreto'); m=S({map:t.map,color:0x9a9890,roughness:0.95,side:T.DoubleSide}); }
  else if(k==='vidro') m=S({color:0x23313b,roughness:0.06,metalness:0.1,envMapIntensity:1.8});
  else if(k==='caixilho') m=S({color:0xe9e9e6,roughness:0.5,metalness:0.2});
  else if(k==='porta') m=S({color:0x6b4a32,roughness:0.65});
  else if(k==='portao'){ const t=plTex2('portao'); m=S({map:t.map,normalMap:t.normalMap,roughness:0.45,metalness:0.55,envMapIntensity:1}); }
  else if(k==='casca'){ const t=plTex2('casca'); m=S({map:t.map,normalMap:t.normalMap,roughness:0.95}); }
  else if(k==='folhas'||k==='palma'){ const t=plTex2(k); m=plShader(S({map:t.map,alphaTest:0.42,side:T.DoubleSide,vertexColors:true,roughness:0.78,envMapIntensity:0.5}),{macro:30,macA:0.12,vento:{h:k==='palma'?9:7,a:k==='palma'?0.35:0.22}}); }
  else if(k==='grama3d') m=plShader(S({vertexColors:true,side:T.DoubleSide,roughness:0.85,envMapIntensity:0.4}),{macro:30,macA:0.3,vento:{h:0.45,a:0.12}});
  else if(k==='posteConc'){ const t=plTex2('concreto'); m=S({map:t.map,color:0xbdbdb6,roughness:0.85}); }
  else if(k==='metal') m=S({color:0x5b6168,roughness:0.4,metalness:0.7,envMapIntensity:1.1});
  else if(k==='lente') m=S({color:0xfff6d8,emissive:0xfff0c8,emissiveIntensity:0.35,roughness:0.2});
  else if(k==='canteiro'){ const t=plTex2('terra'); m=S({map:t.map,normalMap:t.normalMap,color:0x9a8a78,roughness:1}); }
  else if(k==='morro') m=new T.MeshBasicMaterial({vertexColors:true,fog:false});
  else if(k==='sel') m=new T.MeshBasicMaterial({color:0xf59e0b,transparent:true,opacity:0.85,depthTest:false});
  if(m) m.userData.keep=1;
  return c[k]=m;
}
/* ── construtor de malhas (triângulos soltos → normais por face) ── */
function plBuild(){
  const T=window.THREE, P=[], U=[], C=[], V=new T.Vector3(), V2=new T.Vector3();
  const api={P,U,C,
    tri(a,b,c,ua,ub,uc,col){ [a,b,c].forEach(p=>P.push(p.x,p.y,p.z)); U.push(ua[0],ua[1],ub[0],ub[1],uc[0],uc[1]); for(let i=0;i<3;i++) C.push(col.r,col.g,col.b); },
    /* quad a-b-c-d; out = direção para fora (corrige a ordem); uv em metros/escala */
    quad(a,b,c,d,out,sx,sy,col){ V.subVectors(b,a); V2.subVectors(c,a); const n=V.clone().cross(V2); let A=a,B=b,Cc=c,Dd=d, ua=[0,0],ub=[sx,0],uc=[sx,sy],ud=[0,sy];
      if(out&&n.dot(out)<0){ A=a;B=d;Cc=c;Dd=b; ub=[0,sy]; ud=[sx,0]; }
      api.tri(A,B,Cc,ua,ub,uc,col); api.tri(A,Cc,Dd,ua,uc,ud,col); },
    geo(){ const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); g.computeVertexNormals(); return g; }};
  return api;
}
function plMerge(lista){
  const T=window.THREE, P=[], N=[], U=[], C=[];
  lista.forEach(it=>{ const g=(it.g.index?it.g.toNonIndexed():it.g.clone()); if(it.m) g.applyMatrix4(it.m); const p=g.attributes.position, n=g.attributes.normal, u=g.attributes.uv, c=it.c||{r:1,g:1,b:1};
    for(let i=0;i<p.count;i++){ P.push(p.getX(i),p.getY(i),p.getZ(i)); if(it.nc){ const q=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)).sub(it.nc).normalize(); N.push(q.x,q.y,q.z); } else N.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0); U.push(u?u.getX(i):0,u?u.getY(i):0); const f=it.cf?it.cf(p.getY(i)):1; C.push(c.r*f,c.g*f,c.b*f); }
    g.dispose(); });
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); return g;
}
/* ── modelos: árvores (3 tipos), palmeira, poste ── */
function plModelos(){
  if(_pl.mod11) return _pl.mod11;
  const T=window.THREE, R=plRnd(4242), M4=()=>new T.Matrix4(), out={};
  const copa=(cx,cy,cz,rx,ry,n,cores)=>{ const L=[]; for(let k=0;k<n;k++){ const a=R()*Math.PI*2, b=Math.acos(2*R()-1), rr=Math.pow(R(),0.45), x=cx+Math.sin(b)*Math.cos(a)*rx*rr, y=cy+Math.cos(b)*ry*rr, z=cz+Math.sin(b)*Math.sin(a)*rx*rr, s=rx*(0.55+R()*0.35);
      const m=M4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(R()*3,R()*3,R()*3)),new T.Vector3(s,s,s)); const c=new T.Color(cores[(R()*cores.length)|0]);
      L.push({g:new T.PlaneGeometry(1,1),m,c,nc:new T.Vector3(cx,cy-ry*0.3,cz)}); } return L; };
  const tronco=(h,r0,r1,galhos,altG)=>{ const L=[{g:new T.CylinderGeometry(r1,r0,h,9,4),m:M4().makeTranslation(0,h/2,0)}];
    for(let k=0;k<galhos;k++){ const a=k/galhos*Math.PI*2+R(), l=altG*(0.5+R()*0.4), ang=0.7+R()*0.35, g=new T.CylinderGeometry(r1*0.35,r1*0.6,l,6);
      const m=M4().compose(new T.Vector3(Math.cos(a)*Math.sin(ang)*l/2,h*0.82+Math.cos(ang)*l/2,Math.sin(a)*Math.sin(ang)*l/2),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a)*Math.sin(ang),Math.cos(ang),Math.sin(a)*Math.sin(ang))),new T.Vector3(1,1,1)); L.push({g,m}); }
    return plMerge(L); };
  const verdes=['#ffffff','#e9f2dc','#cfe0b5','#f4f0d6','#dfead0'];
  /* 0: árvore de calçada (oiti), 6,5 m, copa 5 m */
  out.arv=[{tr:tronco(3.2,0.17,0.12,4,2.6),co:plMerge(copa(0,4.6,0,2.5,1.8,70,verdes))},
           {tr:tronco(4.0,0.2,0.14,5,3.0),co:plMerge(copa(0,5.6,0,3.1,2.2,90,verdes))},
           {tr:tronco(2.4,0.12,0.09,3,1.8),co:plMerge(copa(0,3.4,0,1.8,1.5,45,['#ffffff','#dcebc8','#f5f5e0']))}];
  /* palmeira (coqueiro): tronco curvo + folhas em leque */
  { const L=[], h=8.5; for(let k=0;k<10;k++){ const y0=k/10*h, y1=(k+1)/10*h, x0=Math.pow(k/10,2)*0.9, x1=Math.pow((k+1)/10,2)*0.9, g=new T.CylinderGeometry(0.13-0.004*(k+1),0.15-0.004*k,y1-y0,8);
      const dir=new T.Vector3(x1-x0,y1-y0,0).normalize(); L.push({g,m:M4().compose(new T.Vector3((x0+x1)/2,(y0+y1)/2,0),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir),new T.Vector3(1,1,1))}); }
    const tr=plMerge(L), F=[];
    for(let k=0;k<14;k++){ const a=k/14*Math.PI*2+R()*0.3, inc=-0.15-R()*0.65, comp=3.6+R()*1.2, g=new T.PlaneGeometry(comp,1.1); g.translate(comp/2,0,0);
      const q=new T.Quaternion().setFromEuler(new T.Euler(R()*0.6-0.3+Math.PI/2*0.2,a,inc,'YXZ')); F.push({g,m:M4().compose(new T.Vector3(0.9,h,0),q,new T.Vector3(1,1,1)),c:new T.Color(['#ffffff','#e8efcf','#d7e4b8'][k%3])}); }
    out.palma={tr,co:plMerge(F)}; }
  /* poste de concreto 9 m com braço e luminária LED (braço no +x local) */
  { const conc=plMerge([{g:new T.CylinderGeometry(0.085,0.15,9,10),m:M4().makeTranslation(0,4.5,0)},{g:new T.CylinderGeometry(0.2,0.22,0.35,10),m:M4().makeTranslation(0,0.12,0)}]);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(1,0.18,0).normalize());
    const met=plMerge([{g:new T.CylinderGeometry(0.035,0.04,2.2,8),m:M4().compose(new T.Vector3(1.05,8.55,0),q,new T.Vector3(1,1,1))},{g:new T.BoxGeometry(0.72,0.11,0.30),m:M4().makeTranslation(2.25,8.78,0)},{g:new T.BoxGeometry(0.1,0.25,0.25),m:M4().makeTranslation(0.05,8.4,0)}]);
    const len=plMerge([{g:new T.PlaneGeometry(0.6,0.24),m:M4().compose(new T.Vector3(2.25,8.722,0),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2,0,0)),new T.Vector3(1,1,1))}]);
    out.poste={conc,met,len}; }
  /* grama 3D: tufo de folhas finas (cor da base escura → ponta clara) */
  { const P=[], C=[], N=[]; for(let k=0;k<9;k++){ const a=R()*Math.PI*2, r=R()*0.09, x=Math.cos(a)*r, z=Math.sin(a)*r, h=0.18+R()*0.3, w=0.012+R()*0.012, b=a+Math.PI/2, bx=Math.cos(b)*w, bz=Math.sin(b)*w, inc=(R()-0.5)*0.25, tx=x+Math.cos(a)*inc*h, tz=z+Math.sin(a)*inc*h;
      P.push(x-bx,0,z-bz, x+bx,0,z+bz, tx,h,tz); const c0=new T.Color('#2d4a19'), c1=new T.Color(['#7c9a3e','#94a94f','#6d8d34','#a3ad5c'][k%4]); C.push(c0.r,c0.g,c0.b,c0.r,c0.g,c0.b,c1.r,c1.g,c1.b); N.push(0,1,0,0,1,0,0,1,0); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('color',new T.Float32BufferAttribute(C,3)); g.setAttribute('normal',new T.Float32BufferAttribute(N,3)); out.grama=g; }
  return _pl.mod11=out;
}
/* altura do chão (malha do terreno, bilinear) */
function plChaoY(t,p){ const m=t.terr; if(!m) return null; const fx=(p[0]-m.x0)/m.cel, fy=(p[1]-m.y0)/m.cel; if(fx<0||fy<0||fx>m.nx||fy>m.ny) return null;
  const ix=Math.min(m.nx-1,Math.floor(fx)), iy=Math.min(m.ny-1,Math.floor(fy)), tx=fx-ix, ty=fy-iy, w=m.nx+1, h=m.h, a=h[iy*w+ix], b=h[iy*w+ix+1], c=h[(iy+1)*w+ix], d=h[(iy+1)*w+ix+1];
  /* PI-12: mesma divisão em triângulos da malha desenhada (a,b,c / b,d,c): o que assenta aqui encosta na malha */
  return (tx+ty<=1)?(a+(b-a)*tx+(c-a)*ty):(d+(c-d)*(1-tx)+(b-d)*(1-ty)); }
function plChaoTerra(t,p){ const m=t.terr; if(!m||!m.c) return 0; const ix=Math.round((p[0]-m.x0)/m.cel), iy=Math.round((p[1]-m.y0)/m.cel); if(ix<0||iy<0||ix>m.nx||iy>m.ny) return 0; return m.c[iy*(m.nx+1)+ix]; }
/* altura exata do que está embaixo (pista, calçada, meio-fio ou terreno): raio vertical */
function plChaoRaio(t,x,z){ const T=window.THREE, rc=t.rc||(t.rc=new T.Raycaster()); rc.set(new T.Vector3(x,1e5,z),new T.Vector3(0,-1,0)); const h=rc.intersectObjects(t.chao||[],false); return h.length?h[0].point.y:null; }
/* ── cenário ilustrativo: muros, casas, quintais, árvores, grama 3D, horizonte ── */
function plCenario(ctx){
  const T=window.THREE, t=_pl.t3, q=PL_QUAL[plQualK()], {D,A,W3,grp,wmf,calOn,R,zmin,ev}=ctx, MOD=plModelos();
  const rnd=plRnd(9173), ocup=[], arvPos=[], palPos=[], muros=[]; /* PI-12: muros já feitos (planta), para não duplicar a divisa entre casas */
  const dSeg=(p,a,b)=>{ const ex=b[0]-a[0], ey=b[1]-a[1], l2=ex*ex+ey*ey||1e-9; let u=((p[0]-a[0])*ex+(p[1]-a[1])*ey)/l2; u=Math.max(0,Math.min(1,u)); return Math.hypot(a[0]+u*ex-p[0],a[1]+u*ey-p[1]); };
  const temMuro=(a,b)=>{ const m=[(a[0]+b[0])/2,(a[1]+b[1])/2]; return muros.some(s2=>dSeg(m,s2[0],s2[1])<0.7||dSeg(s2[0],a,b)<0.35&&dSeg(s2[1],a,b)<0.35); };
  const hole=D.map((d,j)=>plPoligonoCal(d,A[j],wmf+0.6,calOn));
  const B={par:plBuild(),mur:plBuild(),tel:plBuild(),laj:plBuild(),vid:plBuild(),cx:plBuild(),por:plBuild(),pto:plBuild()};
  const branco=new T.Color(1,1,1);
  const CORES=['#f1ece2','#e9dcc2','#f3e4b8','#e8c9a8','#dfe6e1','#f0d9c9','#d9e1ea','#efe8d0','#e4d4b4','#c9d6c2','#f5f1ea','#e6c8b0'].map(c=>new T.Color(c).convertSRGBToLinear());
  const CMURO=['#e6e1d6','#d8cfbf','#cfc6b4','#e9e4da','#c7c0b2','#ddd2bd'].map(c=>new T.Color(c).convertSRGBToLinear());
  const dentroRua=(p,j0)=>hole.some((pl,k)=>(j0==null||k!==j0)&&plDentro(p,pl));
  const sobrepoe=poly=>ocup.some(o=>poly.some(p=>plDentro(p,o))||o.some(p=>plDentro(p,poly)));
  const chao=p=>{ const y=plChaoY(t,p); return y==null?null:y/ev+zmin; }; /* cota (m) do terreno no ponto */
  D.forEach((d,j)=>{
    const Aj=A[j], s0=Aj[0].est, sN=Aj[Aj.length-1].est, dl=d.lay.d, nn=d.lay.n;
    const amostra=e=>{ let k=0; while(k<Aj.length-2&&Aj[k+1].est<e) k++; const a=Aj[k], b=Aj[k+1]||a, tt=(b.est-a.est)>0?Math.max(0,Math.min(1,(e-a.est)/(b.est-a.est))):0, f=x=>a[x]+(b[x]-a[x])*tt; return {est:e,c:d.lay.pos(e),b:f('b'),calE:f('calE'),calD:f('calD'),fimE:f('fimE'),fimD:f('fimD'),gr:f('gr'),gE:f('gE'),gD:f('gD')}; };
    [1,-1].forEach(sg=>{
      const out=new T.Vector3(nn[0]*sg,0,-nn[1]*sg), along=new T.Vector3(dl[0],0,-dl[1]);
      const lin=e=>{ const s=amostra(e), cw=calOn?(sg>0?s.calE:s.calD):0, temCal=cw>0.01; return {s,u:s.b+wmf+(temCal?cw:1.6),z:temCal?(sg>0?s.fimE:s.fimD):null}; };
      const P2=(e,u)=>plOff(d,{c:d.lay.pos(e)},sg*u);
      const V3=(e,u,z)=>W3(P2(e,u),z);
      let e=s0+2+rnd()*4;
      while(e<sN-6){
        const lw=10+rnd()*5, e1=Math.min(sN-0.5,e+lw); if(e1-e<7){ break; }
        const L0=lin(e), L1=lin(e1), Lm=lin((e+e1)/2), prof=24, uL=Math.min(L0.u,L1.u);
        const lote=[P2(e,uL),P2(e1,uL),P2(e1,uL+prof),P2(e,uL+prof)];
        const pts=[0.02,0.5,0.98].flatMap(f=>[0.3,8,16,prof-0.5].map(du=>P2(e+(e1-e)*f,Math.max(L0.u,L1.u)+du)));
        const lc=lote.reduce((a2,p)=>[a2[0]+p[0]/4,a2[1]+p[1]/4],[0,0]), loteT=lote.map(p=>[lc[0]+(p[0]-lc[0])*0.97,lc[1]+(p[1]-lc[1])*0.97]); /* lote vizinho encostado não conta como sobreposição */
        if(pts.some(p=>dentroRua(p,j)||chao(p)==null)||sobrepoe(loteT)){ e+=1.5; continue; }
        ocup.push(lote);
        /* muro da frente (acompanha a cota do muro da topografia quando há calçada) */
        const cm=CMURO[(rnd()*CMURO.length)|0], hm=1.9+rnd()*0.4, esp=0.15, nS=Math.max(2,Math.ceil((e1-e)/1.5));
        const portaoE0=e+(e1-e)*(rnd()<0.5?0.12:0.62), portaoE1=portaoE0+(e1-e)*0.26;
        for(let k=0;k<nS;k++){ const ea=e+(e1-e)*k/nS, eb=e+(e1-e)*(k+1)/nS, la=lin(ea), lb=lin(eb), za=la.z!=null?la.z:chao(P2(ea,la.u)), zb=lb.z!=null?lb.z:chao(P2(eb,lb.u)); if(za==null||zb==null) continue;
          muros.push([P2(ea,la.u),P2(eb,lb.u)]); const ua=la.u, ub=lb.u, a0=V3(ea,ua,za-0.3), a1=V3(ea,ua,za+hm), b0=V3(eb,ub,zb-0.3), b1=V3(eb,ub,zb+hm), c0=V3(ea,ua+esp,za-0.3), c1=V3(ea,ua+esp,za+hm), d0=V3(eb,ub+esp,zb-0.3), d1=V3(eb,ub+esp,zb+hm);
          const naPorta=(ea+eb)/2>portaoE0&&(ea+eb)/2<portaoE1;
          if(naPorta){ B.pto.quad(V3(ea,ua-0.01,za+0.02),V3(eb,ub-0.01,zb+0.02),V3(eb,ub-0.01,zb+hm-0.1),V3(ea,ua-0.01,za+hm-0.1),out.clone().negate(),(eb-ea)/1.2,(hm-0.1)/1.2,branco);
            B.mur.quad(V3(ea,ua,za+hm-0.1),V3(eb,ub,zb+hm-0.1),b1,a1,out.clone().negate(),1,0.1,cm); }
          else B.mur.quad(a0,b0,b1,a1,out.clone().negate(),(eb-ea)/2,(hm+0.3)/2,cm);
          B.mur.quad(c0,d0,d1,c1,out,(eb-ea)/2,(hm+0.3)/2,cm); B.mur.quad(a1,b1,d1,c1,new T.Vector3(0,1,0),(eb-ea)/2,0.1,cm);
          if(k===0) B.mur.quad(a0,a1,c1,c0,along.clone().negate(),0.1,1,cm); if(k===nS-1) B.mur.quad(b0,b1,d1,d0,along,0.1,1,cm); }
        /* muros laterais (divisas) */
        [e,e1].forEach((ee,ii)=>{ const n2=6; for(let k=0;k<n2;k++){ const ua=lin(ee).u+esp+prof*k/n2, ub=lin(ee).u+esp+prof*(k+1)/n2, pa2=P2(ee,ua), pb2=P2(ee,ub), za=chao(pa2), zb=chao(pb2); if(za==null||zb==null) continue;
          if(temMuro(pa2,pb2)) continue; muros.push([pa2,pb2]); /* PI-12: UM muro só na divisa (centrado, 20 cm) */
          const o=ii===0?along.clone().negate():along.clone(), x0=ee-0.1, x1=ee+0.1;
          B.mur.quad(V3(x0,ua,za-0.3),V3(x0,ub,zb-0.3),V3(x0,ub,zb+hm-0.1),V3(x0,ua,za+hm-0.1),o.clone().negate(),prof/n2/2,hm/2,cm);
          B.mur.quad(V3(x1,ua,za-0.3),V3(x1,ub,zb-0.3),V3(x1,ub,zb+hm-0.1),V3(x1,ua,za+hm-0.1),o,prof/n2/2,hm/2,cm);
          B.mur.quad(V3(x0,ua,za+hm-0.1),V3(x0,ub,zb+hm-0.1),V3(x1,ub,zb+hm-0.1),V3(x1,ua,za+hm-0.1),new T.Vector3(0,1,0),0.1,1,cm); } });
        /* casa */
        if(rnd()<0.88){
          const larg=Math.min(e1-e-2.6,7+rnd()*3), eA=e+(e1-e-larg)/2+(rnd()-0.5)*0.8, eB=eA+larg, rec=3+rnd()*2.5, u0=Math.max(L0.u,L1.u)+esp+rec, pr=8+rnd()*4, u1=u0+pr;
          const cnt=[0,0.5,1].flatMap(fa=>[0,0.5,1].map(fb=>chao(P2(eA+(eB-eA)*fa,u0+(u1-u0)*fb)))); if(cnt.every(z=>z!=null)){
            const zb=Math.max(...cnt)+0.12, zf=Math.min(...cnt)-0.4, and=rnd()<0.25?2:1, hp=2.9, zt=zb+hp*and, cor=CORES[(rnd()*CORES.length)|0], tipo=rnd(), ov=0.55;
            const pfr=out.clone().negate(), pfu=out.clone(), pa=along.clone().negate(), pb=along.clone(), up=new T.Vector3(0,1,0);
            const parede=(zTop)=>{ B.par.quad(V3(eA,u0,zf),V3(eB,u0,zf),V3(eB,u0,zTop),V3(eA,u0,zTop),pfr,larg/2,(zTop-zf)/2,cor); B.par.quad(V3(eA,u1,zf),V3(eB,u1,zf),V3(eB,u1,zTop),V3(eA,u1,zTop),pfu,larg/2,(zTop-zf)/2,cor);
              B.par.quad(V3(eA,u0,zf),V3(eA,u1,zf),V3(eA,u1,zTop),V3(eA,u0,zTop),pa,pr/2,(zTop-zf)/2,cor); B.par.quad(V3(eB,u0,zf),V3(eB,u1,zf),V3(eB,u1,zTop),V3(eB,u0,zTop),pb,pr/2,(zTop-zf)/2,cor); };
            if(tipo<0.28){ /* laje com platibanda */
              parede(zt+0.8); B.laj.quad(V3(eA,u0,zt+0.55),V3(eB,u0,zt+0.55),V3(eB,u1,zt+0.55),V3(eA,u1,zt+0.55),up,larg/2,pr/2,branco);
              B.par.quad(V3(eA,u0,zt+0.8),V3(eB,u0,zt+0.8),V3(eB,u0+0.15,zt+0.8),V3(eA,u0+0.15,zt+0.8),up,1,0.1,cor); B.par.quad(V3(eA,u1-0.15,zt+0.8),V3(eB,u1-0.15,zt+0.8),V3(eB,u1,zt+0.8),V3(eA,u1,zt+0.8),up,1,0.1,cor);
            }else{
              parede(zt); const p0=[eA-ov,u0-ov], p1=[eB+ov,u1+ov], zE=zt-0.05, pit=0.32+rnd()*0.12;
              if(tipo<0.62){ /* duas águas, cumeeira paralela à rua */
                const um=(u0+u1)/2, zR=zE+(um-p0[1])*pit, oo=new T.Vector3(0,1,0);
                B.tel.quad(V3(p0[0],p0[1],zE),V3(p1[0],p0[1],zE),V3(p1[0],um,zR),V3(p0[0],um,zR),pfr.clone().add(oo),(p1[0]-p0[0])/2,(um-p0[1])/2,branco);
                B.tel.quad(V3(p0[0],um,zR),V3(p1[0],um,zR),V3(p1[0],p1[1],zE),V3(p0[0],p1[1],zE),pfu.clone().add(oo),(p1[0]-p0[0])/2,(p1[1]-um)/2,branco);
                [[eA,pa],[eB,pb]].forEach(x=>B.par.tri(V3(x[0],u0,zt),V3(x[0],u1,zt),V3(x[0],um,zt+(um-u0)*pit),[0,0],[1,0],[0.5,0.5],cor));
              }else{ /* quatro águas */
                const um=(u0+u1)/2, hw=(p1[1]-p0[1])/2, zR=zE+hw*pit, ea2=Math.min((p0[0]+p1[0])/2,p0[0]+hw), eb2=Math.max((p0[0]+p1[0])/2,p1[0]-hw), oo=new T.Vector3(0,1,0);
                B.tel.quad(V3(p0[0],p0[1],zE),V3(p1[0],p0[1],zE),V3(eb2,um,zR),V3(ea2,um,zR),pfr.clone().add(oo),(p1[0]-p0[0])/2,hw/2,branco);
                B.tel.quad(V3(ea2,um,zR),V3(eb2,um,zR),V3(p1[0],p1[1],zE),V3(p0[0],p1[1],zE),pfu.clone().add(oo),(p1[0]-p0[0])/2,hw/2,branco);
                const tA=[V3(p0[0],p0[1],zE),V3(ea2,um,zR),V3(p0[0],p1[1],zE)], tB=[V3(p1[0],p1[1],zE),V3(eb2,um,zR),V3(p1[0],p0[1],zE)];
                B.tel.tri(tA[0],tA[2],tA[1],[0,0],[hw,0],[hw/2,hw/2],branco);
                B.tel.tri(tB[0],tB[2],tB[1],[0,0],[hw,0],[hw/2,hw/2],branco);
              }
              B.laj.quad(V3(p0[0],p0[1],zE-0.02),V3(p1[0],p0[1],zE-0.02),V3(p1[0],p1[1],zE-0.02),V3(p0[0],p1[1],zE-0.02),new T.Vector3(0,-1,0),1,1,branco); /* forro do beiral */
            }
            /* janelas e porta na fachada (de frente para a rua) e nas laterais */
            const jan=(ea,eb,za,zb,uu,o)=>{ B.cx.quad(V3(ea-0.07,uu-0.012,za-0.07),V3(eb+0.07,uu-0.012,za-0.07),V3(eb+0.07,uu-0.012,zb+0.07),V3(ea-0.07,uu-0.012,zb+0.07),o,1,1,branco);
              B.vid.quad(V3(ea,uu-0.03,za),V3(eb,uu-0.03,za),V3(eb,uu-0.03,zb),V3(ea,uu-0.03,zb),o,1,1,branco);
              B.cx.quad(V3((ea+eb)/2-0.025,uu-0.04,za),V3((ea+eb)/2+0.025,uu-0.04,za),V3((ea+eb)/2+0.025,uu-0.04,zb),V3((ea+eb)/2-0.025,uu-0.04,zb),o,1,1,branco); };
            for(let f=0;f<and;f++){ const zz=zb+f*hp; const nj=larg>8.5?3:2; for(let k=0;k<nj;k++){ const c=eA+larg*(k+0.5)/nj, w=k===0&&f===0?0.9:1.3;
                if(f===0&&k===nj-1){ B.por.quad(V3(c-0.45,u0-0.03,zb),V3(c+0.45,u0-0.03,zb),V3(c+0.45,u0-0.03,zb+2.1),V3(c-0.45,u0-0.03,zb+2.1),pfr,1,1,branco); continue; }
                jan(c-w/2,c+w/2,zz+0.95,zz+2.15,u0,pfr); }
              [[eA,pa],[eB,pb]].forEach(x=>{ const ee=x[0]+(x[0]===eA?-0.012:0.012); for(let k=0;k<2;k++){ const uc=u0+pr*(k+0.5)/2; const o=x[1];
                B.cx.quad(W3(plOff(d,{c:d.lay.pos(ee)},sg*(uc-0.6)),zz+1.0),W3(plOff(d,{c:d.lay.pos(ee)},sg*(uc+0.6)),zz+1.0),W3(plOff(d,{c:d.lay.pos(ee)},sg*(uc+0.6)),zz+2.1),W3(plOff(d,{c:d.lay.pos(ee)},sg*(uc-0.6)),zz+2.1),o,1,1,branco);
                const e2=x[0]+(x[0]===eA?-0.03:0.03); B.vid.quad(W3(plOff(d,{c:d.lay.pos(e2)},sg*(uc-0.53)),zz+1.07),W3(plOff(d,{c:d.lay.pos(e2)},sg*(uc+0.53)),zz+1.07),W3(plOff(d,{c:d.lay.pos(e2)},sg*(uc+0.53)),zz+2.03),W3(plOff(d,{c:d.lay.pos(e2)},sg*(uc-0.53)),zz+2.03),o,1,1,branco); } }); }
            ocup.push([P2(eA-ov,u0-ov),P2(eB+ov,u0-ov),P2(eB+ov,u1+ov),P2(eA-ov,u1+ov)]);
          }
        }
        /* árvores e palmeiras do quintal */
        const na=rnd()<0.75?(1+(rnd()<0.4?1:0)):0;
        for(let k=0;k<na;k++){ const ee=e+1.5+rnd()*(e1-e-3), uu=Math.max(L0.u,L1.u)+(rnd()<0.5?1.2+rnd()*1.6:prof-4+rnd()*3), p=P2(ee,uu), y=chao(p); if(y==null) continue;
          const casa=ocup.slice(-1)[0]; if(casa&&plDentro(p,casa)) continue; (rnd()<0.22?palPos:arvPos).push([p,y,rnd()]); }
        e=e1;
      }
    });
  });
  const mk=(b,mk2,cast)=>{ if(!b.P.length) return; const me=new T.Mesh(b.geo(),plMat11(mk2)); me.castShadow=cast!==false; me.receiveShadow=true; grp.add(me); return me; };
  t.muros=muros;
  if(ctx.casas){ mk(B.par,'parede'); mk(B.tel,'telha'); mk(B.laj,'laje'); mk(B.vid,'vidro',false); mk(B.cx,'caixilho',false); mk(B.por,'porta',false); }
  if(ctx.muros){ mk(B.mur,'parede'); mk(B.pto,'portao'); }
  if(!ctx.arvc&&!ctx.grama) return;
  /* árvores dos quintais e árvores soltas no campo (instanciadas) */
  if(ctx.arvc){
  const nCampo=Math.round(70*q.arvq); for(let k=0;k<nCampo*4&&arvPos.length<nCampo*1.6+ocup.length;k++){ const j=(rnd()*D.length)|0, Aj=A[j], s=Aj[(rnd()*Aj.length)|0], sg=rnd()<0.5?1:-1, u=s.b+wmf+30+rnd()*70, p=plOff(D[j],s,sg*u);
    if(dentroRua(p)||ocup.some(o=>plDentro(p,o))) continue; const y=chao(p); if(y==null) continue; if(plChaoTerra(t,p)>0.4) continue; arvPos.push([p,y,rnd()]); }
  const inst=(geo,mat,lista,esc,cast)=>{ if(!lista.length) return; const im=new T.InstancedMesh(geo,mat,lista.length), m=new T.Matrix4(), qq=new T.Quaternion();
    lista.forEach((x,i)=>{ const s=esc(x[2]); qq.setFromEuler(new T.Euler(0,x[2]*Math.PI*2*7,0)); m.compose(W3(x[0],x[1]-0.05),qq,new T.Vector3(s,s*(0.9+((x[2]*13)%0.2)),s)); im.setMatrixAt(i,m); });
    im.castShadow=cast!==false; im.receiveShadow=true; im.frustumCulled=false; if(mat.alphaTest>0) im.customDepthMaterial=plSombraFolha(mat===plMat11('palma')?'palma':'folhas'); grp.add(im); return im; };
  [0,1,2].forEach(v=>{ const L=arvPos.filter(x=>((x[2]*3)|0)===v); inst(MOD.arv[v].tr,plMat11('casca'),L,r=>0.8+r*0.5); inst(MOD.arv[v].co,plMat11('folhas'),L,r=>0.8+r*0.5); });
  inst(MOD.palma.tr,plMat11('casca'),palPos,r=>0.85+r*0.3); inst(MOD.palma.co,plMat11('palma'),palPos,r=>0.85+r*0.3);
  }
  /* grama 3D com vento, perto da rua */
  if(ctx.grama&&q.grama>0){ const pos=[]; let tent=0; const lenT=A.map(a=>a[a.length-1].est-a[0].est), tot=lenT.reduce((a,b)=>a+b,0)||1;
    while(pos.length<q.grama&&tent++<q.grama*4){ let r0=rnd()*tot, j=0; while(j<lenT.length-1&&r0>lenT[j]){ r0-=lenT[j]; j++; } const Aj=A[j], s=Aj[Math.min(Aj.length-1,Math.floor(r0/(lenT[j]||1)*(Aj.length-1)))], sg=rnd()<0.5?1:-1, cw=calOn?(sg>0?s.calE:s.calD):0;
      const u=s.b+wmf+(cw>0.01?cw:0)+0.12+Math.pow(rnd(),1.7)*34, p=plOff(D[j],{c:D[j].lay.pos(s.est+(rnd()-0.5)*1.0)},sg*u);
      if(dentroRua(p)) continue; if(ocup.some((o,k)=>k%1===0&&plDentro(p,o)&&o.length===4&&false)) continue; const y=chao(p); if(y==null) continue; if(plChaoTerra(t,p)>0.45) continue; pos.push([p,y,rnd()]); }
    const g=MOD.grama, im=new T.InstancedMesh(g,plMat11('grama3d'),pos.length), m=new T.Matrix4(), qq=new T.Quaternion();
    pos.forEach((x,i)=>{ const s=0.7+x[2]*0.9; qq.setFromEuler(new T.Euler(0,x[2]*40,0)); m.compose(W3(x[0],x[1]-0.01),qq,new T.Vector3(s,s*(ev>1?1:1),s)); im.setMatrixAt(i,m); });
    im.receiveShadow=true; im.castShadow=false; im.frustumCulled=false; grp.add(im); }
}
/* horizonte: saia do terreno até longe + morros baixos que somem na névoa */
function plHorizonte(ctx){
  const T=window.THREE, t=_pl.t3, m=t.terr, grp=ctx.grp, R=ctx.R; if(!m) return;
  const w=m.nx+1, borda=[]; for(let ix=0;ix<=m.nx;ix++) borda.push([ix,0]); for(let iy=1;iy<=m.ny;iy++) borda.push([m.nx,iy]); for(let ix=m.nx-1;ix>=0;ix--) borda.push([ix,m.ny]); for(let iy=m.ny-1;iy>0;iy--) borda.push([0,iy]);
  const cx=m.x0+m.nx*m.cel/2, cy=m.y0+m.ny*m.cel/2, hm=borda.reduce((s,b)=>s+m.h[b[1]*w+b[0]],0)/borda.length;
  const anel=[0,0.35,1.2,4,12].map(f=>f*R+0.0), P=[], U=[], C=[], I=[];
  borda.forEach(b=>{ const x=m.x0+b[0]*m.cel, y=m.y0+b[1]*m.cel, dx=x-cx, dy=y-cy, l=Math.hypot(dx,dy)||1, h0=m.h[b[1]*w+b[0]];
    anel.forEach((dd,k)=>{ const px=x+dx/l*dd, py=y+dy/l*dd, f=Math.min(1,k/2), hh=h0+(hm-h0)*f-(k>=3?0.4*k:0); P.push(px,hh,-py); U.push(px/3,py/3); C.push(1,1,1); }); });
  const na=anel.length; for(let i=0;i<borda.length;i++){ const i2=(i+1)%borda.length; for(let k=0;k<na-1;k++){ const a=i*na+k, b=i2*na+k, c=i*na+k+1, d2=i2*na+k+1; I.push(a,c,b,b,c,d2); } }
  const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(P,3)); g.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.setIndex(I); g.computeVertexNormals();
  if(g.attributes.normal){ const n=g.attributes.normal; let ny=0; for(let i=0;i<n.count;i++) ny+=n.getY(i); if(ny<0){ I.reverse(); g.setIndex(I); g.computeVertexNormals(); } }
  const me=new T.Mesh(g,plMat11('terrenoLonge')); me.receiveShadow=true; grp.add(me); t.chao.push(me);
  /* morros */
  const hz=t.ceuMat.uniforms.uHor.value, base=new T.Color('#3f5a35').convertSRGBToLinear(), seg=96, P2=[], C2=[], I2=[], r0=R*9, rnd=plRnd(77);
  for(let i=0;i<=seg;i++){ const a=i/seg*Math.PI*2, hh=(plRuido(i*0.18,3.3)*0.7+plRuido(i*0.05,9.1)*0.9)*R*0.55+R*0.05, rr=r0*(0.9+plRuido(i*0.1,5)*0.25);
    P2.push(cx+Math.cos(a)*rr,hm-2,-(cy+Math.sin(a)*rr), cx+Math.cos(a)*rr,hm+hh,-(cy+Math.sin(a)*rr));
    const c1=base.clone().lerp(hz,0.72), c2=base.clone().lerp(hz,0.55); C2.push(c1.r,c1.g,c1.b,c2.r,c2.g,c2.b); }
  for(let i=0;i<seg;i++){ const a=i*2; I2.push(a,a+2,a+1,a+1,a+2,a+3); }
  const g2=new T.BufferGeometry(); g2.setAttribute('position',new T.Float32BufferAttribute(P2,3)); g2.setAttribute('color',new T.Float32BufferAttribute(C2,3)); g2.setIndex(I2); g2.computeVertexNormals();
  const mm=plMat11('morro'); mm.side=T.DoubleSide; const morro=new T.Mesh(g2,mm); morro.renderOrder=-5; grp.add(morro);
}
/* ── árvores e postes do usuário no 3D (grupo próprio: pode ser refeito sem refazer a cena) ── */
function plObj3D(){
  const T=window.THREE, t=_pl.t3; if(!t||!t.grp||!t.W3) return; const MOD=plModelos();
  if(t.objGrp){ t.grp.remove(t.objGrp); t.objGrp.traverse(o=>{ if(o.geometry&&o.userData.proprio) o.geometry.dispose(); }); }
  const G=new T.Group(); t.objGrp=G; t.grp.add(G); 
  const D=plDados(), W3=t.W3, vv=plVis();
  objTodos().forEach(x=>{ if(x.o.t==='arv'?!vv.objArv:!vv.objPoste) return; const d=D.find(q=>q.id===x.r.id); if(!d) return; const p=objMundo(x.o,d), w=W3(p,0); let y=plChaoRaio(t,w.x,w.z); if(y==null){ const yy=plChaoY(t,p); y=yy!=null?yy:W3(p,d.L[0].gr).y; }
    const g=new T.Group(); g.position.set(w.x,y,w.z); g.userData.obj=x.o.id;
    if(x.o.t==='arv'){ const m=MOD.arv[0]; const a=new T.Mesh(m.tr,plMat11('casca')), b=new T.Mesh(m.co,plMat11('folhas')); [a,b].forEach(q=>{ q.castShadow=true; q.receiveShadow=true; q.userData.obj=x.o.id; g.add(q); }); b.customDepthMaterial=plSombraFolha('folhas'); g.rotation.y=(x.o.id.charCodeAt(3)||0)*0.7;
      { const cant=new T.Mesh(new T.BoxGeometry(1.0,0.06,1.0),plMat11('canteiro')); cant.position.y=-0.025; cant.receiveShadow=true; cant.userData.proprio=1; cant.userData.obj=x.o.id; g.add(cant); } }
    else { const sg=x.o.off>=0?1:-1, n=d.lay.n; const ang=Math.atan2(-sg*n[1],-sg*n[0]); [['conc','posteConc'],['met','metal'],['len','lente']].forEach(k=>{ const q=new T.Mesh(MOD.poste[k[0]],plMat11(k[1])); q.castShadow=k[0]!=='len'; q.receiveShadow=true; q.userData.obj=x.o.id; g.add(q); });
      g.rotation.y=ang; }
    if(_pl.objSel===x.o.id){ const r=new T.Mesh(new T.RingGeometry(x.o.t==='arv'?1.1:0.45,x.o.t==='arv'?1.35:0.6,40),plMat11('sel')); r.rotation.x=-Math.PI/2; r.position.y=0.06; r.renderOrder=20; r.userData.proprio=1; g.add(r); }
    G.add(g); });
  t.precisaSombra=true;
}
/* interação no 3D: locar (clique), arrastar e selecionar */
function plObj3DEventos(){
  const t=_pl.t3, wrap=document.getElementById('pl-3dwrap'); if(!t||!wrap||wrap.dataset.obj) return; wrap.dataset.obj='1';
  const T=window.THREE, rc=new T.Raycaster(), mv=new T.Vector2();
  const ray=(e,lista)=>{ const r=t.rd.domElement.getBoundingClientRect(); mv.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); rc.setFromCamera(mv,t.cam); return rc.intersectObjects(lista,true); };
  const objDe=h=>{ for(const x of h){ let o=x.object; while(o){ if(o.userData&&o.userData.obj) return o.userData.obj; o=o.parent; } } return null; };
  const mundo=pt=>[pt.x,-pt.z];
  let arr=null;
  wrap.addEventListener('pointerdown',e=>{ if(e.button!==0&&e.pointerType==='mouse') return;
    if(_pl.objModo){ const h=ray(e,t.chao||[]); if(h.length){ objNovo(_pl.objModo,mundo(h[0].point)); objModo(null); } e.stopPropagation(); e.preventDefault(); return; }
    if(!t.objGrp) return; const id=objDe(ray(e,[t.objGrp])); if(!id) return;
    _pl.objSel=id; arr={id,x:e.clientX,y:e.clientY,mov:false,g:t.objGrp.children.find(g=>g.userData.obj===id)}; t.ctl.enabled=false; objPainel(); plObj3D(); arr.g=t.objGrp.children.find(g=>g.userData.obj===id);
    e.stopPropagation(); e.preventDefault(); },true);
  window.addEventListener('pointermove',e=>{ if(!arr){ if(_pl.modo==='3d'&&!_pl.objModo&&t.objGrp&&e.target===t.rd.domElement&&!(e.buttons)){ const now=performance.now(); if(now-(t.hov||0)>90){ t.hov=now; t.rd.domElement.style.cursor=objDe(ray(e,[t.objGrp]))?'move':''; } } return; }
    if(!arr.mov&&Math.hypot(e.clientX-arr.x,e.clientY-arr.y)<4) return; arr.mov=true; const h=ray(e,t.chao||[]); if(h.length&&arr.g){ arr.g.position.copy(h[0].point); arr.pt=h[0].point.clone(); } });
  window.addEventListener('pointerup',()=>{ if(!arr) return; const a=arr; arr=null; t.ctl.enabled=true; if(a.mov&&a.pt){ objMover(a.id,mundo(a.pt),true); } });
}
/* a cada quadro: céu acompanha a câmera, vento/nuvens, sombra acompanha o ponto que se olha */
function plTick(t){
  if(!t.ceu) return; const dt=t.relogio.getDelta(); t.uT.value+=Math.min(dt,0.1); t.ceuMat.uniforms.uT.value=t.uT.value;
  t.ceu.position.copy(t.cam.position);
  const tg=t.ctl.target, dist=t.cam.position.distanceTo(tg), S=Math.max(14,Math.min(t.Rcena*0.9||200,dist*0.95));
  if(t.solDir&&(t.precisaSombra||!t.sTg||t.sTg.distanceTo(tg)>S*0.08||Math.abs(S-t.sS)/t.sS>0.12)){
    t.precisaSombra=false; t.sTg=tg.clone(); t.sS=S; const sun=t.sun; sun.position.copy(tg).addScaledVector(t.solDir,S*3); sun.target.position.copy(tg); sun.target.updateMatrixWorld();
    const c=sun.shadow.camera; c.left=-S; c.right=S; c.top=S; c.bottom=-S; c.near=0.5; c.far=S*7; c.updateProjectionMatrix(); }
}
function plQualAplicar(t){
  const q=PL_QUAL[plQualK()], k=plQualK(); if(t.qualAplicada===k) return; t.qualAplicada=k;
  t.rd.setPixelRatio(Math.min(q.pr,window.devicePixelRatio||1)*(q.pr>2?1:1));
  if(q.pr>2) t.rd.setPixelRatio(Math.min(2.5,(window.devicePixelRatio||1)*1.5));
  const sz=q.sh||512; if(t.sun.shadow.mapSize.x!==sz){ t.sun.shadow.mapSize.set(sz,sz); if(t.sun.shadow.map){ t.sun.shadow.map.dispose(); t.sun.shadow.map=null; } }
  t.sun.shadow.radius=q.sh>=2048?2:1.5; t.sun.shadow.bias=-0.00025; t.sun.shadow.normalBias=0.03;
  _pl.mat11=null; _pl.sf11=null; plRedimensionar3D();
}

function pl3Dmontar(manter){
  const T=window.THREE, wrap=document.getElementById('pl-3dwrap'), v=plVis(), N=plNiveis(), D=plDados(), P=secaoParams();
  const ev=parseFloat(document.getElementById('pl-ev').value)||1; document.getElementById('pl-ev-v').textContent=ev+'×';
  let t=_pl.t3;
  if(!t){
    wrap.innerHTML=''; const rd=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); wrap.appendChild(rd.domElement); rd.domElement.style.display='block';
    rd.outputEncoding=T.sRGBEncoding; rd.toneMapping=T.ACESFilmicToneMapping; rd.toneMappingExposure=0.92; rd.shadowMap.enabled=true; rd.shadowMap.type=T.PCFSoftShadowMap; rd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    const sc=new T.Scene();
    const sun=new T.DirectionalLight(0xfff1d8,1.05); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.02; sc.add(sun); sc.add(sun.target);
    const cam=new T.PerspectiveCamera(42,1,0.1,8000); const ctl=new T.OrbitControls(cam,rd.domElement); ctl.enableDamping=true; ctl.dampingFactor=0.09; ctl.maxPolarAngle=Math.PI*0.495; ctl.screenSpacePanning=true;
    t=_pl.t3={rd,sc,cam,ctl,sun,grp:null};
    plCeuInit(t); plCeuAplicar(t);
    const loop=()=>{ if(_pl.modo!=='3d'||!document.getElementById('tab-planta').classList.contains('active')){ t.run=false; return; } ctl.update(); plTick(t); rd.render(sc,cam); requestAnimationFrame(loop); };
    t.loop=()=>{ if(!t.run){ t.run=true; loop(); } };
    window.addEventListener('resize',()=>{ if(_pl.modo==='3d') plRedimensionar3D(); });
  }
  plQualAplicar(t); plRedimensionar3D();
  { const qs=document.getElementById('pl-qual'), hs=document.getElementById('pl-hora'); if(qs&&!qs.options.length){ Object.keys(PL_QUAL).forEach(k=>qs.add(new Option(PL_QUAL[k].n,k))); Object.keys(PL_HORAS).forEach(k=>hs.add(new Option(PL_HORAS[k].n,k))); } if(qs){ qs.value=plQualK(); hs.value=plHoraK(); } }
  if(t.grp){ t.sc.remove(t.grp); t.grp.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material&&!o.material.userData.keep){ if(o.material.map&&o.isSprite) o.material.map.dispose(); o.material.dispose(); } }); }
  const grp=new T.Group(); t.grp=grp; t.sc.add(grp);
  t.rd.shadowMap.enabled=!!v.sombras&&PL_QUAL[plQualK()].sh>0; t.chao=[]; t.objGrp=null; t.terr=null;
  // cota de referência
  let zmin=1e9; D.forEach(d=>d.L.forEach(l=>{ zmin=Math.min(zmin,l.gr-(l.estr?(l.estr.e_total||0)/100:P.eTot),l.tc==null?1e9:l.tc); })); if(zmin>1e8) zmin=0; zmin-=0.5;
  const W3=(p,z)=>new T.Vector3(p[0],(z-zmin)*ev,-p[1]);
  const mat={};
  const M=(k,cor,tex,rep,extra)=>{ if(mat[k]) return mat[k]; const mm=new T.MeshStandardMaterial(Object.assign({color:new T.Color(cor),roughness:0.92,metalness:0,side:T.DoubleSide},extra||{})); if(tex){ mm.map=tex; } return mat[k]=mm; };
  /* superfície em fita a partir de seções transversais (lista de pontos 3D por amostra) */
  const fita=(secs,uvf,mm,fechar)=>{
    const pos=[], uv=[], n=secs[0].length;
    for(let a=0;a<secs.length-1;a++) for(let c=0;c<n-1;c++){
      const p1=secs[a][c],p2=secs[a][c+1],p3=secs[a+1][c+1],p4=secs[a+1][c];
      [p1,p2,p3,p1,p3,p4].forEach(p=>pos.push(p.x,p.y,p.z));
      if(uvf){ [[a,c],[a,c+1],[a+1,c+1],[a,c],[a+1,c+1],[a+1,c]].forEach(q=>{ const u=uvf(q[0],q[1]); uv.push(u[0],u[1]); }); }
    }
    if(fechar){ [0,secs.length-1].forEach(a=>{ const s=secs[a]; for(let c=1;c<n-2;c++){ [s[0],s[c],s[c+1]].forEach(p=>pos.push(p.x,p.y,p.z)); if(uvf) uv.push(0,0,0,0,0,0); } }); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); if(uvf) g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.computeVertexNormals();
    const me=new T.Mesh(g,mm); me.castShadow=true; me.receiveShadow=true; grp.add(me); return me;
  };
  const A=D.map(d=>plAmostras(d,1));
  const foot=D.map((d,j)=>plPoligono(d,A[j],0)), footMf=D.map((d,j)=>plPoligono(d,A[j],plMfLarg(P)+0.05));
  const ESQ=plEsquinas(D); const dentroOutra=(j,p,arr,soAnteriores)=>D.some((o,k)=>k!==j&&(!soAnteriores||k<j)&&plDentro(p,arr[k]))||(arr===foot&&!soAnteriores&&ESQ.some(e=>e.hole&&plDentro(p,e.hole)));
  const wmf=v.mf?plMfLarg(P):0, sb=P.mf&&P.mf.tipo==='conjugado'?(+P.mf.sbase||0)/100:0;
  const camadas=N.filter(n=>n.esp);
  const calOn=!!(_cal.ativo&&v.calcada!==0), footCal=D.map((d,j)=>plPoligonoCal(d,A[j],wmf+0.05,calOn));
  D.forEach((d,j)=>{
    const Aj=A[j];
    // ── camadas do pavimento (volumes), recortadas onde já existe a pista de uma rua anterior
    const runsPav=d.transv?[Aj]:plCorridas(Aj,(a,b)=>!dentroOutra(j,[(a.c[0]+b.c[0])/2,(a.c[1]+b.c[1])/2],foot,true));
    camadas.forEach((n,ci)=>{
      if(!v.pista||!plOn(v,n.k)) return;
      const tx=ci===0?null:plTex(/areia/i.test(n.nome)?'areia':'gran');
      const mm=ci===0?M('blocoLado','#3a3a3c',null):M('cam'+ci,n.cor,tx);
      if(tx){ tx.repeat&&0; }
      runsPav.forEach(R=>{
        const secs=R.map(s=>{ const us=[s.b,s.b/2,0,-s.b/2,-s.b]; const topo=us.map(u=>W3(plOffT(d,s,u),plZJ(d,s,u)-plPF(s,n))), fundo=us.slice().reverse().map(u=>W3(plOffT(d,s,u),plZJ(d,s,u)-plPF(s,n)-plES(s,n))); return topo.concat(fundo,[topo[0]]); });
        const s0=R[0].est;
        fita(secs,tx?((a,c)=>[(R[a].est-s0)/1.5,c/3]):null,mm,true);
        if(ci===0){ /* superfície dos blocos com textura de paginação */
          const tp=R.map(s=>[s.b,s.b/2,0,-s.b/2,-s.b].map(u=>{ const q=W3(plOffT(d,s,u),plZJ(d,s,u)-plPF(s,n)); q.y+=0.004; return q; }));
          const mp=plMat11('asfalto');
          t.chao.push(plNormUp(fita(tp,(a,c)=>[(R[a].est-s0)/0.8,(R[a].b-[R[a].b,R[a].b/2,0,-R[a].b/2,-R[a].b][c])/0.8],mp,false)));
        }
      });
    });
    // ── terreno natural (lâmina transparente sobre a pista: mostra corte e aterro)
    if(plOn(v,'terreno')&&v.lamina){
      const secs=Aj.map(s=>[s.b,0,-s.b].map(u=>W3(plOff(d,s,u),plZT(s,u))));
      const me=fita(secs,null,M('terr','#7b5a34',null,null,{transparent:true,opacity:0.38,depthWrite:false,roughness:1}),false); me.castShadow=false; me.renderOrder=5;
    }
    // ── meio-fio e sarjeta (concreto), sem passar por dentro da pista de outra rua
    if(v.mf&&P.mf) [1,-1].forEach(sg=>{
      const runs=plCorridas(Aj,(a,b)=>{ const m={c:[(a.c[0]+b.c[0])/2,(a.c[1]+b.c[1])/2],b:(a.b+b.b)/2,est:(a.est+b.est)/2}; return !dentroOutra(j,plOff(d,m,sg*(m.b+wmf/2)),foot,false); });
      runs.forEach(R=>{
        const zE=s=>plZJ(d,s,sg*s.b);
        if(P.mf.tipo==='conjugado'){
          const salt=(+P.mf.salt||8)/100, esp=(+P.mf.esp||15)/100;
          fita(R.map(s=>{ const e=zE(s), u0=sg*s.b, u1=sg*(s.b+sb); return [W3(plOff(d,s,u0),e),W3(plOff(d,s,u1),e+0.015),W3(plOff(d,s,u1),e-salt),W3(plOff(d,s,u0),e-salt),W3(plOff(d,s,u0),e)]; }),(a,c)=>[(R[a].est-R[0].est)/1,[0,0.3,0.6,0.9,1][c]],plMat11('sarjeta'),true); t.chao.push(grp.children[grp.children.length-1]);
          fita(R.map(s=>{ const e=zE(s)+0.015, u0=sg*(s.b+sb), u1=sg*(s.b+wmf), r=0.02*sg; return [W3(plOff(d,s,u0),e),W3(plOff(d,s,u0+r),e+esp),W3(plOff(d,s,u1),e+esp),W3(plOff(d,s,u1),e-salt-0.1),W3(plOff(d,s,u0),e-salt-0.1),W3(plOff(d,s,u0),e)]; }),(a,c)=>[(R[a].est-R[0].est)/1,[0,0.15,0.4,0.65,0.85,1][c]],plMat11('concreto'),true); t.chao.push(grp.children[grp.children.length-1]);
        }else{
          const alt=(+P.mf.alt||30)/100, esp=(+P.mf.esp||15)/100;
          fita(R.map(s=>{ const e=zE(s), u0=sg*s.b, u1=sg*(s.b+wmf); return [W3(plOff(d,s,u0),e),W3(plOff(d,s,u0),e+esp),W3(plOff(d,s,u1),e+esp),W3(plOff(d,s,u1),e+esp-alt),W3(plOff(d,s,u0),e+esp-alt),W3(plOff(d,s,u0),e)]; }),(a,c)=>[(R[a].est-R[0].est)/1,[0,0.15,0.4,0.65,0.85,1][c]],plMat11('concreto'),true); t.chao.push(grp.children[grp.children.length-1]);
        }
      });
    });
    // ── calçada (PI-10): laje do fundo do meio-fio até o muro, sem passar por dentro da pista de outra rua
    if(calOn) [1,-1].forEach(sg=>{
      const wd=s=>sg>0?s.calE:s.calD, fim=s=>sg>0?s.fimE:s.fimD, espC=_cal.esp/100, dcl=_cal.decl/100;
      const runs=plCorridas(Aj,(a,b)=>{ const w=(wd(a)+wd(b))/2; if(!(w>0.01)) return false; const m={c:[(a.c[0]+b.c[0])/2,(a.c[1]+b.c[1])/2],b:(a.b+b.b)/2,est:(a.est+b.est)/2}, pm=plOff(d,m,sg*(m.b+wmf+w/2));
        return !(dentroOutra(j,pm,footMf,false)||dentroOutra(j,pm,footCal,true)); });
      const inter=_cal.tipo==='intertravado', mm=inter?plMat11('pavCal'):plMat11('calcConc'), tl=inter?0.8:1.5;
      runs.forEach(R=>{ const s0=R[0].est;
        fita(R.map(s=>{ const u0=sg*(s.b+wmf-0.01), u1=sg*(s.b+wmf+wd(s)), z1=fim(s), z0=z1-wd(s)*dcl;
          return [W3(plOff(d,s,u0),z0),W3(plOff(d,s,u1),z1),W3(plOff(d,s,u1),z1-espC),W3(plOff(d,s,u0),z0-espC),W3(plOff(d,s,u0),z0)]; }),
          (a,c)=>[(R[a].est-s0)/tl,(c===1||c===2)?wd(R[a])/tl:0],mm,true); t.chao.push(grp.children[grp.children.length-1]); });
    });
    // ── eixo
    if(v.eixo&&!(_plT.sinal&&_plT.sinal.on&&_plT.sinal.eixo!=='nenhum'&&!d.transv)){ const g=new T.BufferGeometry().setFromPoints(Aj.map(s=>{ const q=W3(s.c,s.gr); q.y+=0.03; return q; })); const ln=new T.Line(g,new T.LineDashedMaterial({color:0xd03020,dashSize:1.2,gapSize:0.5})); ln.computeLineDistances(); grp.add(ln); }
    // ── rótulos 3D
    if(v.rot3d||v.numeros){
      if(v.numeros&&!d.transv) d.L.forEach((l,k)=>{ const eh=Math.abs(l.est/20-Math.round(l.est/20))<1e-6, idx=Math.round(l.est/20); if(eh&&k>0&&k<d.L.length-1&&idx%v.passo) return;
        const sp=plSprite(eh?'EST. '+idx:'EST. '+estacaTxt(l.est),{alt:0.55,c:eh?'#111':'#1d4ed8'}); const p=plOff(d,{c:d.lay.pos(l.est)},l.larg/2+wmf+0.6); sp.position.copy(W3(p,l.gr+0.6)); grp.add(sp); });
      const s0=Aj[Math.floor(Aj.length/2)]; const nm=plSprite(d.nome,{alt:0.85,c:'#0f3d73'}); nm.position.copy(W3(plOff(d,s0,0),s0.gr+3.5)); grp.add(nm);
      if(v.rot3d&&v.pista&&!d.transv){ /* medidas das camadas na face da última seção (corte) */
        const s=Aj[Aj.length-1]; let y=0, ord=0;
        camadas.filter(n=>plOn(v,n.k)).forEach(n=>{ const sp=plSprite(n.cod+' · '+n.nome.replace(' (greide = topo)','')+' — '+fmt(plES(s,n)*100,1)+' cm · topo '+fmt(s.gr-plPF(s,n),3),{alt:0.5,bg:'rgba(255,255,255,.93)',bd:n.cor}); const q=plOff(d,s,-(s.b+wmf+1.6)); const z=plZ(s,0)-plPF(s,n)-plES(s,n)/2; sp.position.copy(W3(q,z)); sp.center.set(0,0.5+(ord++)*1.08); sp.position.copy(W3(q,plZ(s,0)-0.0)); grp.add(sp); });
      }
    }
  });
  // ── PF-PLANTA3D: esquinas com raio e sinalização
  try{ plEsq3D({D,W3,grp,v,P,camadas,fita,matDe:(ci,n)=>ci===0?M('blocoLado','#3a3a3c',null):M('cam'+ci,n.cor,plTex(/areia/i.test(n.nome)?'areia':'gran'))}); }catch(e){ console.warn('esquinas 3D',e); }
  try{ plSinal3D({D,W3,grp}); }catch(e){ console.warn('sinalização 3D',e); }
  // ── cruzamentos
  if(v.cruz) D.forEach(d=>d.rows.forEach(r=>{ if(!r.cruz) return; const ib=ruaIdx(r.cruz.rua); const o=D.find(x=>x.i===ib); if(!o||ib<d.i) return;
    const g1=itpRows(d.rows,r.est,'greide'), g2=itpRows(o.rows,r.cruz.est,'greide'), df=g1-g2, ruim=Math.abs(df)>0.02;
    const sp=plSprite('Cruzamento\nΔ greide '+(df>0?'+':'')+fmt(df*100,1)+' cm '+(ruim?'⚠':'✓'),{alt:0.6,c:ruim?'#b91c1c':'#15803d',bd:ruim?'#b91c1c':'#15803d'}); sp.position.copy(W3(d.lay.pos(r.est),Math.max(g1,g2)+1.6)); grp.add(sp);
    const pin=new T.Mesh(new T.CylinderGeometry(0.06,0.06,1.4*ev>1.4?1.4:1.4,8),new T.MeshStandardMaterial({color:ruim?0xb91c1c:0x15803d})); pin.position.copy(W3(d.lay.pos(r.est),Math.max(g1,g2)+0.7)); grp.add(pin); }));
  // ── terreno contínuo: malha que segue o terreno natural e desce/sobe em talude até o meio-fio
  let bb=new T.Box3().setFromObject(grp); if(bb.isEmpty()) return;
  if(v.entorno||v.casas||v.muros||v.arvc||v.grama||v.objArv||v.objPoste){
    const esp=P.mf?((+P.mf.esp||15)/100):0, mg=140;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; A.forEach(Aj=>Aj.forEach(q=>{ x0=Math.min(x0,q.c[0]);x1=Math.max(x1,q.c[0]);y0=Math.min(y0,q.c[1]);y1=Math.max(y1,q.c[1]); })); x0-=mg;x1+=mg;y0-=mg;y1+=mg;
    const cel=Math.max(1,Math.max(x1-x0,y1-y0)/260), nx=Math.ceil((x1-x0)/cel), ny=Math.ceil((y1-y0)/cel);
    const H=(p)=>{ let best=null, sw=0, sh=0, sc=0;
      for(let j=0;j<D.length;j++){ const d=D[j], Aj=A[j], ly=d.lay; for(const pr of plProjAll(ly,p)){
        const al=pr.s, lat=pr.lat, s0=Aj[0].est, sN=Aj[Aj.length-1].est;
        const ac=Math.min(sN,Math.max(s0,al)), over=Math.abs(al-ac); let k=0; while(k<Aj.length-2&&Aj[k+1].est<ac) k++; const qa=Aj[k], qb=Aj[k+1], tt=(qb.est-qa.est)>0?(ac-qa.est)/(qb.est-qa.est):0;
        const q={gr:qa.gr+(qb.gr-qa.gr)*tt,gE:qa.gE+(qb.gE-qa.gE)*tt,gD:qa.gD+(qb.gD-qa.gD)*tt,tc:qa.tc+(qb.tc-qa.tc)*tt,te:qa.te+(qb.te-qa.te)*tt,td:qa.td+(qb.td-qa.td)*tt,b:(qa.b+(qb.b-qa.b)*tt),calE:qa.calE+(qb.calE-qa.calE)*tt,calD:qa.calD+(qb.calD-qa.calD)*tt,fimE:qa.fimE+(qb.fimE-qa.fimE)*tt,fimD:qa.fimD+(qb.fimD-qa.fimD)*tt};
        const sg=lat>=0?1:-1, cs=calOn?(sg>0?q.calE:q.calD):0, cw=q.b+wmf+(cs>0.01?cs:0), nat=plZT(q,lat), topo=cs>0.01?(sg>0?q.fimE:q.fimD):plZ(q,sg*q.b); /* PI-09/10: entorno rente à cota do pavimento (ou do muro, se há calçada) no limite */
        if(Math.abs(lat)<=cw&&over<0.01) return {h:topo,c:0};
        const e=Math.hypot(Math.max(0,Math.abs(lat)-cw),over), dlt=nat-topo, tw=Math.max(1.2,Math.abs(dlt)*1.5), t1=Math.min(1,e/tw), sm=t1*t1*(3-2*t1);
        const hh=topo+dlt*sm, cc=(1-t1)*Math.min(1,Math.abs(dlt)/0.25), w=(pr.f==null?1:pr.f)/Math.pow(e+0.3,3);
        sw+=w; sh+=w*hh; sc+=w*cc; } }
      return {h:sh/sw,c:sc/sw}; };
    /* PI-09: o entorno NÃO passa por baixo da pista. Pontos da malha que caem dentro da pista+meio-fio são
       puxados para o limite da rua (cota do pavimento) e os triângulos inteiramente dentro dela são omitidos. */
    const hole=D.map((d,j)=>plPoligonoCal(d,A[j],wmf+0.01,calOn)).concat(ESQ.filter(e=>e.hole).map(e=>e.hole));
    const emHole=p=>hole.some(pl=>plDentro(p,pl));
    const proxBorda=p=>{ let best=null, bd=1e18;
      hole.forEach(pl=>{ for(let i=0;i<pl.length;i++){ const a=pl[i], b=pl[(i+1)%pl.length], ex=b[0]-a[0], ey=b[1]-a[1], l2=ex*ex+ey*ey||1e-12;
        let t=((p[0]-a[0])*ex+(p[1]-a[1])*ey)/l2; t=Math.max(0,Math.min(1,t)); const q=[a[0]+t*ex,a[1]+t*ey], dd=(q[0]-p[0])*(q[0]-p[0])+(q[1]-p[1])*(q[1]-p[1]);
        if(dd<bd){ const ln=Math.sqrt(l2), n=[-ey/ln,ex/ln]; for(const sg of [1,-1]){ const r=[q[0]+n[0]*0.05*sg,q[1]+n[1]*0.05*sg]; if(!emHole(r)){ bd=dd; best=r; break; } } } } });
      return best; };
    const pos=[], col=[], uv=[], idx=[], terra=[], dentro=new Uint8Array((nx+1)*(ny+1));
    for(let iy=0;iy<=ny;iy++) for(let ix=0;ix<=nx;ix++){ let p=[x0+ix*cel,y0+iy*cel]; const puxado=emHole(p); if(puxado) dentro[iy*(nx+1)+ix]=1; const r=H(p), q=W3(p,r.h); if(puxado) q.y-=0.03; pos.push(q.x,q.y,q.z); /* PAV-ESQ: vértice dentro de pista/esquina fica no lugar, 3 cm abaixo do pavimento (escondido sob o asfalto): sem buraco no terreno */ uv.push(p[0]/3,p[1]/3);
      const c=r.c, nz=0.86+0.22*plRuido(p[0]/22,p[1]/22)+0.08*plRuido(p[0]/5,p[1]/5), sec=0.94+0.14*plRuido(p[0]/40+7,p[1]/40+3);
      col.push(nz*sec*1.02,nz,nz*(2-sec)*0.92); terra.push(Math.min(1,c*1.15)); }
    for(let iy=0;iy<ny;iy++) for(let ix=0;ix<nx;ix++){ const a=iy*(nx+1)+ix, b2=a+1, c2=a+nx+1, d2=c2+1;
      /* PAV-ESQ: só some o triângulo cujo centro e cujos meios de aresta também estão dentro de pista/esquina (vértices em buracos diferentes deixavam uma cunha sem terreno no canto) */
      const gx=i=>x0+(i%(nx+1))*cel, gy=i=>y0+Math.floor(i/(nx+1))*cel, vazio=(p,q,r)=>{ const X=[gx(p),gx(q),gx(r)], Y=[gy(p),gy(q),gy(r)]; return PAV_AMOSTRAS.every(w=>emHole([X[0]*w[0]+X[1]*w[1]+X[2]*w[2],Y[0]*w[0]+Y[1]*w[1]+Y[2]*w[2]])); };
      /* vértices puxados para a borda podem inverter o triângulo (face para baixo = buraco no terreno): a face de cima fica sempre para cima */
      const tri=(i,j,k)=>{ const ny=(pos[j*3+2]-pos[i*3+2])*(pos[k*3]-pos[i*3])-(pos[j*3]-pos[i*3])*(pos[k*3+2]-pos[i*3+2]); if(ny<0) idx.push(i,k,j); else idx.push(i,j,k); };
      tri(a,b2,c2); tri(b2,d2,c2); }
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('color',new T.Float32BufferAttribute(col,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.setAttribute('aTerra',new T.Float32BufferAttribute(terra,1)); g.setIndex(idx); g.computeVertexNormals();
    if(v.entorno){ const me=new T.Mesh(g,plMat11('terreno')); me.receiveShadow=true; grp.add(me); t.chao.push(me); }
    { const hh=new Float32Array((nx+1)*(ny+1)); for(let i=0;i<hh.length;i++) hh[i]=pos[i*3+1]; t.terr={x0,y0,cel,nx,ny,h:hh,c:Float32Array.from(terra)}; }
    bb=new T.Box3().setFromObject(grp);
  }
  const bbR=new T.Box3(); A.forEach(Aj=>Aj.forEach(q=>bbR.expandByPoint(W3(q.c,q.gr)))); const cen=bbR.getCenter(new T.Vector3()), szR=bbR.getSize(new T.Vector3()), R=Math.max(szR.x,szR.z,20);
  t.sc.fog=v.entorno?new T.Fog(t.ceuMat.uniforms.uHor.value.clone(),R*1.6,R*9):null;
  // PI-11: horizonte, cenário ilustrativo, árvores e postes; o sol e a sombra acompanham o ponto que se olha (plTick)
  t.Rcena=R; t.precisaSombra=true; t.W3=W3; t.bbRua=bbR.clone();
  if(v.entorno){ const ctx={D,A,W3,grp,wmf,calOn,R,zmin,ev}; try{ plHorizonte(ctx); }catch(e){ console.warn('horizonte',e); } } if((v.casas||v.muros||v.arvc||v.grama)&&ev<=1&&t.terr){ const ctx={D,A,W3,grp,wmf,calOn,R,zmin,ev,casas:!!v.casas,muros:!!v.muros,arvc:!!v.arvc,grama:!!v.grama}; try{ plCenario(ctx); }catch(e){ console.warn('cenário',e); } }
  plObj3D(); plObj3DEventos();
  let alvo=cen.clone(); const cz=D.length?D[0].rows.find(r=>r.cruz):null; if(cz){ const l=D[0].L.find(x=>Math.abs(x.est-cz.est)<0.01)||D[0].L[0]; alvo=W3(D[0].lay.pos(cz.est),l.gr); }
  if(!manter||!t.pronto){ const Rv=Math.min(R,90); t.cam.position.set(alvo.x+Rv*0.42,alvo.y+Rv*0.30,alvo.z+Rv*0.55); t.ctl.target.copy(alvo); t.cam.far=R*30; t.cam.near=Math.max(0.05,R/2000); t.cam.updateProjectionMatrix(); t.pronto=true; }
  t.loop();
}
function plRedimensionar3D(){ const t=_pl.t3, wrap=document.getElementById('pl-3dwrap'); if(!t||!wrap) return; const w=wrap.clientWidth||900, h=wrap.clientHeight||600; t.rd.setSize(w,h); t.cam.aspect=w/h; t.cam.updateProjectionMatrix(); }
function pl3DEnquadrar(){ if(_pl.t3) _pl.t3.pronto=false; pl3D(false); }
function pl3DVista(tipo){ const t=_pl.t3; if(!t||!t.grp) return;
  if(tipo==='rua'&&t.W3){ const D=plDados(); if(D.length){ const d=D[0], e0=d.L[0].est, eN=d.L[d.L.length-1].est, e=Math.min(eN,e0+Math.min(6,(eN-e0)*0.1)), ea=Math.min(eN,e+40), l0=plTopoLinhas(d.rows).find(x=>x.gr!=null)||d.L[0];
    const q=t.W3(plOff(d,{c:d.lay.pos(e)},d.L[0].larg*0.15),d.L[0].gr+1.7), g=t.W3(d.lay.pos(ea),d.L[d.L.length-1].gr+1.2); t.cam.position.copy(q); t.ctl.target.copy(g); t.ctl.update(); t.precisaSombra=true; return; } } /* PI-11: pedestre no eixo, olhar ao longo da rua */ const bb=t.bbRua?t.bbRua.clone().expandByScalar(8):new window.THREE.Box3().setFromObject(t.grp), /* PI-11: só as ruas (o horizonte vai longe) */ c=bb.getCenter(new window.THREE.Vector3()), s=bb.getSize(new window.THREE.Vector3()), R=Math.max(s.x,s.z,20)*0.25;
  const P={topo:[0,R*3.2,0.01],iso:[R*1.4,R*1.7,R*2.9],rua:[R*1.6,R*0.18,R*0.6]}[tipo]||[R,R,R]; t.cam.position.set(c.x+P[0],c.y+P[1],c.z+P[2]); t.ctl.target.copy(c); }


/* ── 3) NOVO: ruas transversais, esquinas com raio e sinalização (PF-PLANTA3D) ── */

/* geometria básica */
function plInter(p,u,q,w){ const den=u[0]*w[1]-u[1]*w[0]; if(Math.abs(den)<1e-9) return null; const t=((q[0]-p[0])*w[1]-(q[1]-p[1])*w[0])/den; return [p[0]+u[0]*t,p[1]+u[1]*t]; }
/* concordância de raio R entre duas bordas que saem do canto C nas direções u1 e u2 */
function plFillet(C,u1,u2,R){
  const cs=Math.max(-0.999,Math.min(0.999,u1[0]*u2[0]+u1[1]*u2[1])), phi=Math.acos(cs), t=R/Math.tan(phi/2);
  const T1=[C[0]+u1[0]*t,C[1]+u1[1]*t], T2=[C[0]+u2[0]*t,C[1]+u2[1]*t];
  let bx=u1[0]+u2[0], by=u1[1]+u2[1]; const bl=Math.hypot(bx,by)||1; bx/=bl; by/=bl;
  const h=R/Math.sin(phi/2), O=[C[0]+bx*h,C[1]+by*h];
  const a1=Math.atan2(T1[1]-O[1],T1[0]-O[0]), a2=Math.atan2(T2[1]-O[1],T2[0]-O[0]); let da=a2-a1; while(da>Math.PI) da-=2*Math.PI; while(da<-Math.PI) da+=2*Math.PI;
  const n=Math.max(6,Math.ceil(Math.abs(da)*R/0.25)), arc=[]; for(let i=0;i<=n;i++){ const a=a1+da*i/n; arc.push([O[0]+R*Math.cos(a),O[1]+R*Math.sin(a)]); }
  arc[0]=T1; arc[n]=T2; return {T1,T2,O,arc,t};
}
function plAreaPoly(p){ let a=0; for(let i=0,j=p.length-1;i<p.length;j=i++) a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]); return Math.abs(a/2); }
/* cota da superfície do pavimento numa estaca e afastamento u (+ esquerda) */
function plSurf(Aj,est,u){ let k=0; while(k<Aj.length-2&&Aj[k+1].est<est) k++; const a=Aj[k], b=Aj[k+1]||a, dl=b.est-a.est, t=dl>0?Math.max(0,Math.min(1,(est-a.est)/dl)):0;
  return plZ({gr:a.gr+(b.gr-a.gr)*t,gE:a.gE+(b.gE-a.gE)*t,gD:a.gD+(b.gD-a.gD)*t,b:a.b+(b.b-a.b)*t},u); }
function plMeia(Aj,est){ let k=0; while(k<Aj.length-2&&Aj[k+1].est<est) k++; const a=Aj[k], b=Aj[k+1]||a, dl=b.est-a.est, t=dl>0?Math.max(0,Math.min(1,(est-a.est)/dl)):0; return a.b+(b.b-a.b)*t; }

/* esquinas: dois cantos por rua transversal (um de cada lado dela) */
function plEsquinas(D){
  const d0=D.find(x=>x.id==='r0'); if(!d0) return plEsquinasBairro(D);
  const P=secaoParams(), wmf=plMfLarg(P), A0=plAmostras0(d0,1), out=[];
  D.forEach(d=>{ if(!d.transv||!d.lay) return;
    const c=d.cfg, R=Math.max(0,+c.raio||0), A=d.lay.A, dm=plDirE(d0,c.estM), nm=[-dm[1],dm[0]], ds=d.lay.d, ns=d.lay.n, sg=c.sg, hb=plMeia(A0,c.estM), bs=c.bs, As=plAmostras0(d,1);
    const linM=off=>[A[0]+nm[0]*sg*off,A[1]+nm[1]*sg*off];
    const stM=p=>plProj(d0.lay,p).s, stS=p=>d.lay.sA+((p[0]-A[0])*ds[0]+(p[1]-A[1])*ds[1]);
    [1,-1].forEach(e1=>{
      const u1=[dm[0]*e1,dm[1]*e1], k=(ns[0]*u1[0]+ns[1]*u1[1])>=0?1:-1;
      const zM=p=>plSurf(A0,stM(p),sg*hb), zS=p=>plSurfD(d,As,stS(p),k*bs);
      const mk=(offM,offS,Rr)=>{ const C=plInter(linM(offM),dm,[A[0]+ns[0]*k*offS,A[1]+ns[1]*k*offS],ds); if(!C) return null;
        if(Rr>0.05){ const F=plFillet(C,u1,ds,Rr); return Object.assign({C},F); } return {C,T1:C,T2:C,arc:[C],O:null,t:0}; };
      const e=mk(hb,bs,R); if(!e) return;
      const zl=(arc,a,b)=>arc.map((p,i)=>arc.length>1?a+(b-a)*i/(arc.length-1):a);
      const q={d,e1,k,R,O:e.O,C:e.C,T1:e.T1,T2:e.T2,arc:e.arc,stT1:stM(e.T1),stT2:stS(e.T2),zT1:zM(e.T1),zT2:zS(e.T2)};
      if(R>0.05){
        let arc=e.arc, za=zl(e.arc,q.zT1,q.zT2), sa=0; const pp=[e.C].concat(arc); for(let i=0;i<pp.length;i++){ const a=pp[i], b=pp[(i+1)%pp.length]; sa+=a[0]*b[1]-b[0]*a[1]; }
        if(sa<0){ arc=arc.slice().reverse(); za=za.slice().reverse(); } /* mesmo sentido (anti-horário) em todas as esquinas: faces do 3D para cima */
        q.arc=arc; q.poly=[e.C].concat(arc); q.z=[(zM(e.C)+zS(e.C))/2].concat(za); q.area=plAreaPoly(q.poly);
        /* borda reta da esquina (T1→C na principal, C→T2 na transversal) com a cota EXATA de cada pista,
           pareada ponto a ponto com o arco: a superfície do raio encosta nas duas pistas sem desnível */
        { const m=arc.length-1, iniT1=Math.hypot(arc[0][0]-e.T1[0],arc[0][1]-e.T1[1])<1e-6, P0=iniT1?e.T1:e.T2, P1=iniT1?e.T2:e.T1, z0=iniT1?zM:zS, z1=iniT1?zS:zM;
          const L1=Math.hypot(e.C[0]-P0[0],e.C[1]-P0[1]), L2=Math.hypot(P1[0]-e.C[0],P1[1]-e.C[1]), h=Math.max(1,Math.min(m-1,Math.round(m*L1/((L1+L2)||1))));
          q.ed=[]; for(let i=0;i<=m;i++){ let p,z; if(i<=h){ const t=i/h; p=[P0[0]+(e.C[0]-P0[0])*t,P0[1]+(e.C[1]-P0[1])*t]; z=z0(p); } else { const t=(i-h)/(m-h); p=[e.C[0]+(P1[0]-e.C[0])*t,e.C[1]+(P1[1]-e.C[1])*t]; z=z1(p); } q.ed.push([p[0],p[1],z]); }
          q.ed[0][2]=za[0]; q.ed[m][2]=za[m]; }
        if(wmf>0&&R>wmf+0.05){ q.arc2=arc.map(p=>{ const vx=p[0]-e.O[0], vy=p[1]-e.O[1], L=Math.hypot(vx,vy)||1; return [e.O[0]+vx/L*(R-wmf),e.O[1]+vy/L*(R-wmf)]; });
          q.ring=arc.concat(q.arc2.slice().reverse()); q.hole=[e.C,arc[0]].concat(q.arc2,[arc[arc.length-1]]); }
        else q.hole=q.poly;
      }
      const l=mk(hb-0.15,bs-0.15,R>0.05?R+0.15:0); /* linha de bordo: 0,15 m para dentro da pista */
      if(l){ q.lbo=l.arc; q.lboT1=stM(l.T1); q.lboT2=stS(l.T2); q.lboZ=zl(l.arc,zM(l.T1),zS(l.T2)); }
      out.push(q);
    });
  });
  return out;
}
/* amostras com uma seção EXATA em cada ponto de tangência das esquinas: o meio-fio reto termina
   exatamente onde começa o raio (antes cortava de 1 em 1 m e ficava um degrau) */
function plAmostras(d,passo){
  const out=plAmostras0(d,passo); const mul=ruas.some(r=>r.multi); if(!(_plT.transv.length||mul)||!d||!(d.id==='r0'||d.transv||(mul&&ruas[d.i]&&ruas[d.i].multi))) return out;
  let ests=[];
  try{ const key=JSON.stringify([_plT.transv,ruas.map(r=>r.rows),(typeof _mf!=='undefined')?_mf:0,secaoParams().cEsq,secaoParams().cDir,_plT.raioBairro,plVis().alinha,ruas.map(r=>r.eixo?r.eixo.length:0)]);
    if(!_pl.amC||_pl.amC.k!==key){ const E=plEsquinas(plDados()), m={};
      E.forEach(q=>{ if(q.cuts){ q.cuts.forEach(c=>{ (m[c[0]]||(m[c[0]]=[])).push(c[1]); }); return; } (m.r0||(m.r0=[])).push(q.stT1); if(q.lboT1!=null) m.r0.push(q.lboT1); const id=q.d.id; (m[id]||(m[id]=[])).push(q.stT2); if(q.lboT2!=null) m[id].push(q.lboT2); });
      _pl.amC={k:key,m}; }
    ests=_pl.amC.m[d.id]||[]; }catch(e){ return out; }
  const num=['est','gr','gE','gD','tc','te','td','larg','calE','calD','fimE','fimD'];
  ests.forEach(e=>{ if(!(e>out[0].est+0.005&&e<out[out.length-1].est-0.005)) return;
    let k=0; while(k<out.length-2&&out[k+1].est<e) k++; const a=out[k], b=out[k+1];
    if(Math.abs(a.est-e)<0.005||Math.abs(b.est-e)<0.005) return; const t=(e-a.est)/(b.est-a.est), s={sit:a.sit,estr:a.estr};
    num.forEach(f=>{ const x=a[f], y=b[f]; s[f]=(x==null||y==null)?(x==null?y:x):x+(y-x)*t; }); s.est=e; s.c=d.lay.pos(e); s.b=(s.larg||0)/2;
    out.splice(k+1,0,s); });
  return out;
}
/* seção da rua transversal: dentro da pista principal ela é cortada EXATAMENTE pela borda da principal
   (corte oblíquo, também em ângulo ≠ 90°): sem sobreposição de superfícies nem triângulo sem pavimento */
function plOffT(d,s,u){ const c=d&&d.transv&&d.cfg; if(!c) return plOff(d,s,u);
  const a=c.sg*c.ang*Math.PI/180, e=(c.sg*c.hb-u*Math.cos(a))/Math.sin(a);
  return s.est>=e?plOff(d,s,u):plOff(d,{c:d.lay.pos(e)},u); }
/* dados das ruas com a referência da via principal nas transversais (para a junção sem desnível) */
function plDados(){ const D=plDados0(), d0=D.find(x=>x.id==='r0');
  if(d0&&D.some(x=>x.transv)){ const A0=plAmostras0(d0,1); D.forEach(d=>{ if(d.transv) d.ref={d0,A0,As:plAmostras0(d,1)}; }); }
  return D; }
/* cota do pavimento da transversal: na linha de junção é a cota EXATA da pista principal naquele ponto;
   a diferença some em 3 m para dentro da transversal (sem degrau nem sobreposição) */
function plShift(d,est,u){ const c=d&&d.transv&&d.cfg, R=d&&d.ref; if(!c||!R) return 0;
  const a=c.sg*c.ang*Math.PI/180, e=(c.sg*c.hb-u*Math.cos(a))/Math.sin(a), f=est<=e?1:Math.max(0,1-(est-e)/3); if(f<=0) return 0;
  const p=plOff(d,{c:d.lay.pos(e)},u), pr=plProj(R.d0.lay,p), st=pr.s, la=pr.lat;
  return f*(plSurf(R.A0,st,la)-plSurf(R.As,Math.max(0,e),u)); }
function plZJ(d,s,u){ return plZ(s,u)+plShift(d,s.est,u); }
function plSurfD(d,Aj,e,u){ return plSurf(Aj,e,u)+plShift(d,e,u); }
/* superfície do asfalto com a mesma luz em todas as ruas e esquinas (rampas de até ~20 % não mudam o tom:
   sem “emendas” claras e escuras entre a via principal, a transversal e o raio) */
function plNormUp(me){ const g=me&&me.geometry, n=g&&g.getAttribute('normal'); if(n){ for(let i=0;i<n.count;i++) n.setXYZ(i,0,1,0); n.needsUpdate=true; } return me; }
function plEsqPolys(D){ return plEsquinas(D).filter(q=>q.poly).map(q=>q.poly); }
/* área pavimentada (principal pela Topografia + transversais + esquinas) para o quadro */
function plAreaInfo(){
  const t=(typeof _R!=='undefined'&&_R&&_R._topo)||{}, a0=t.areaPav||0, ext=t.extensao||0;
  let porRua=null, tot=a0;
  try{ if(_plT.transv.length&&typeof plDados==='function'){ const D=plDados(), d0=D.find(x=>x.id==='r0'); if(d0){ const E=plEsquinas(D);
    porRua=[{nome:d0.nome,ext,area:a0}];
    D.filter(d=>d.transv).forEach(d=>{ const c=d.cfg, lv=c.comp-c.hb/Math.sin(c.ang*Math.PI/180), ae=E.filter(q=>q.d===d&&q.area).reduce((s,q)=>s+q.area,0), ar=Math.max(0,lv)*2*c.bs+ae;
      porRua.push({nome:d.nome+' (com esquinas)',ext:Math.max(0,lv),area:ar}); tot+=ar; }); } } }catch(e){}
  return {totArea:tot,extensao:ext,porRua};
}

/* sinalização: devolve peças pintadas (polígonos com cota), placas e rótulos */
function plSinal(D){
  const S=_plT.sinal, out={pec:[],plc:[],rot:[]}; if(!S||!S.on) return out;
  const d0=D.find(x=>x.id==='r0'); if(!d0||d0.L.length<2) return out;
  const P=secaoParams(), wmf=plMfLarg(P), hmf=P.mf?(+P.mf.esp||15)/100:0, A0=plAmostras(d0,1), ESQ=plEsquinas(D);
  const vel=+S.vel||40, wl=vel>=80?0.15:0.10, pat=vel<60?[2,4]:vel<80?[3,6]:[4,12]; /* MBST Vol. IV, LFO-2 */
  const AM='#f2b705', BR='#ffffff';
  const fitaQ=(pts,w,cor,tipo)=>{ for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1], dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, nx=-dy/L*w/2, ny=dx/L*w/2;
    out.pec.push({pts:[[a[0]+nx,a[1]+ny,a[2]],[b[0]+nx,b[1]+ny,b[2]],[b[0]-nx,b[1]-ny,b[2]],[a[0]-nx,a[1]-ny,a[2]]],cor,tipo}); } };
  const linha=(d,Aj,e0,e1,uf)=>{ const r=[]; if(e1-e0<0.05) return r; const n=Math.max(1,Math.ceil((e1-e0)/0.5)); for(let i=0;i<=n;i++){ const e=e0+(e1-e0)*i/n, u=uf(e), q=plOff(d,{c:d.lay.pos(e)},u); r.push([q[0],q[1],plSurfD(d,Aj,e,u)]); } return r; };
  const tracejar=(d,Aj,e0,e1,uf,w,cor,tipo,padrao)=>{ if(!padrao){ fitaQ(linha(d,Aj,e0,e1,uf),w,cor,tipo); return; } const per=padrao[0]+padrao[1];
    for(let x=Math.floor(e0/per)*per;x<e1;x+=per){ const a=Math.max(e0,x), b=Math.min(e1,x+padrao[0]); if(b-a>0.05) fitaQ(linha(d,Aj,a,b,uf),w,cor,tipo); } };
  const livres=(a,b,J)=>{ let L=[[a,b]]; J.forEach(([x,y])=>{ const n=[]; L.forEach(([p,q])=>{ if(y<=p||x>=q){ n.push([p,q]); return; } if(x>p) n.push([p,x]); if(y<q) n.push([y,q]); }); L=n; }); return L.filter(([p,q])=>q-p>0.05); };
  const eixo=(d,Aj,a,b)=>{ if(S.eixo==='nenhum') return; if(S.eixo==='LFO-3') [wl,-wl].forEach(u=>tracejar(d,Aj,a,b,()=>u,wl,AM,'LFO-3',null)); else tracejar(d,Aj,a,b,()=>0,wl,AM,S.eixo,S.eixo==='LFO-2'?pat:null); };
  const quad=(d,Aj,e0,e1,u0,u1,cor,tipo)=>{ const p=(e,u)=>{ const q=plOff(d,{c:d.lay.pos(e)},u); return [q[0],q[1],plSurfD(d,Aj,e,u)]; }; out.pec.push({pts:[p(e0,u0),p(e1,u0),p(e1,u1),p(e0,u1)],cor,tipo}); };
  const m0=d0.L[0].est, mN=d0.L[d0.L.length-1].est, jan=[], janL={'1':[],'-1':[]};
  D.filter(d=>d.transv).forEach(d=>{ const es=ESQ.filter(q=>q.d===d); if(es.length<2) return; const st=es.map(q=>q.lboT1!=null?q.lboT1:q.stT1); const lo=Math.min(...st), hi=Math.max(...st); jan.push([lo,hi]); janL[String(d.cfg.sg)].push([lo,hi]); });
  /* via principal: eixo (LFO) interrompido nas interseções; bordo (LBO) a 0,15 m da borda */
  livres(m0,mN,jan).forEach(([a,b])=>eixo(d0,A0,a,b));
  if(S.lbo) [1,-1].forEach(sg=>livres(m0,mN,janL[String(sg)]).forEach(([a,b])=>fitaQ(linha(d0,A0,a,b,e=>sg*(plMeia(A0,e)-0.15)),wl,BR,'LBO')));
  /* R-19 (velocidade máxima) no início de cada sentido, do lado direito */
  if(S.r19&&mN-m0>12){ const hb0=plMeia(A0,m0+5), hbN=plMeia(A0,mN-5);
    const p1=plOff(d0,{c:d0.lay.pos(m0+5)},-(hb0+wmf+0.5)), p2=plOff(d0,{c:d0.lay.pos(mN-5)},hbN+wmf+0.5);
    const f1=plDirE(d0,m0+5), f2=plDirE(d0,mN-5); out.plc.push({tipo:'R-19',txt:String(vel),p:p1,z:plSurf(A0,m0+5,-hb0)+hmf,f:[-f1[0],-f1[1]]},{tipo:'R-19',txt:String(vel),p:p2,z:plSurf(A0,mN-5,hbN)+hmf,f:f2}); }
  /* advertência A-7a/A-7b (via lateral à esquerda/direita) na via principal, 30 m antes de cada transversal, nos dois sentidos, lado direito */
  if(S.adv) D.filter(d=>d.transv).forEach(d=>{ const c=d.cfg; [1,-1].forEach(sen=>{ const e=c.estM-sen*30; if(e<m0+2||e>mN-2) return; const hb1=plMeia(A0,e), u=-sen*(hb1+wmf+0.5), fd=plDirE(d0,e);
      const esqDoMotorista=(c.sg===sen); out.plc.push({tipo:esqDoMotorista?'A-7a':'A-7b',txt:'',p:plOff(d0,{c:d0.lay.pos(e),est:e},u),z:plSurf(A0,e,-sen*hb1)+hmf,f:[-sen*fd[0],-sen*fd[1]]}); }); });
  /* transversais */
  D.filter(d=>d.transv).forEach(d=>{
    const c=d.cfg, As=plAmostras(d,1), bs=c.bs, es=ESQ.filter(q=>q.d===d), eN=d.L[d.L.length-1].est, ds=d.lay.d;
    const hb=plMeia(A0,c.estM), dmL=plDirE(d0,c.estM), Xe=plInter([d.lay.A[0]-dmL[1]*c.sg*hb,d.lay.A[1]+dmL[0]*c.sg*hb],dmL,d.lay.A,ds);
    const eEdge=Xe?(Xe[0]-d.lay.A[0])*ds[0]+(Xe[1]-d.lay.A[1])*ds[1]:hb, eT2=es.length?Math.max(...es.map(q=>q.stT2)):eEdge;
    const e0=Math.max(eEdge+1.0,eT2+0.3); /* FTP a ≥ 1,00 m do alinhamento da via transversal, fora da concordância */
    let eRet=e0;
    if(S.lbo) es.forEach(q=>{ if(q.lbo&&q.lbo.length>1) fitaQ(q.lbo.map((p,i)=>[p[0],p[1],q.lboZ[i]]),wl,BR,'LBO'); const ini=q.lboT2!=null?q.lboT2:q.stT2; if(eN-ini>0.1) fitaQ(linha(d,As,Math.max(0,ini),eN,()=>q.k*(bs-0.15)),wl,BR,'LBO'); });
    if(S.ftp&&eN>e0+6){ const Lf=4.0, n=Math.max(1,Math.floor((2*bs-0.4)/1.0)+1), w0=-(n-1)*1.0/2; /* FTP-1: listras 0,40 m, vão 0,60 m, extensão 4,00 m */
      for(let i=0;i<n;i++){ const uc=w0+i*1.0; quad(d,As,e0,e0+Lf,uc-0.2,uc+0.2,BR,'FTP-1'); }
      out.rot.push({p:plOff(d,{c:d.lay.pos(e0+Lf/2)},-(bs+wmf+1.2)),txt:'FTP-1',d:ds}); eRet=e0+Lf+1.6; } /* LRE a 1,60 m da faixa */
    if(S.lre&&eN>eRet+1){ quad(d,As,eRet,eRet+0.40,0.12,bs-0.22,BR,'LRE'); out.rot.push({p:plOff(d,{c:d.lay.pos(eRet+0.2)},-(bs+wmf+1.2)),txt:'LRE',d:ds}); }
    if(eN>eRet+1.5) eixo(d,As,eRet+0.5,eN);
    if(S.placa&&S.placa!=='nenhuma'&&eN>eRet+1){ const e=eRet+0.6, p=plOff(d,{c:d.lay.pos(e)},bs+wmf+0.5); out.plc.push({tipo:S.placa,txt:S.placa==='R-1'?'PARE':'',p,z:plSurf(As,e,bs)+hmf,f:ds}); }
  });
  return out;
}
function plSinalResumo(){
  const S=_plT.sinal, vel=+S.vel||40, wl=vel>=80?'0,15':'0,10', pat=vel<60?'2 m / 4 m':vel<80?'3 m / 6 m':'4 m / 12 m';
  const ex={'LFO-2':'LFO-2 amarela seccionada '+wl+' m, traço/espaço '+pat,'LFO-1':'LFO-1 amarela contínua '+wl+' m (proibido ultrapassar; pista &lt; 7 m)','LFO-3':'LFO-3 dupla contínua amarela '+wl+' m com '+wl+' m entre linhas (pista ≥ 7 m)','nenhum':'sem linha de eixo'}[S.eixo];
  return 'Velocidade '+vel+' km/h → '+ex+'. LBO branca '+wl+' m, a 0,15 m da borda (e acompanha o raio da esquina). FTP-1 zebrada: listras 0,40 m, vão 0,60 m, extensão 4,00 m, a ≥ 1,00 m do alinhamento da via. LRE 0,40 m, a 1,60 m antes da faixa. Placas verticais: R-1/R-2 na transversal, R-19 nos dois sentidos e A-7a/A-7b 30 m antes de cada transversal, a 0,50 m do meio-fio e borda inferior a 2,00 m do chão. Fonte: CONTRAN, MBST Vol. IV (Sinalização Horizontal), Vol. I (R-1, R-2, R-19) e Vol. II (A-7a, A-7b). Confirme com o órgão de trânsito do município.';
}
/* desenho da sinalização na planta (SVG) */
function plSvgSinal(D,X,Y,sc){
  const R=plSinal(D); let s='', top='';
  R.pec.forEach(q=>{ s+='<polygon points="'+q.pts.map(p=>X(p).toFixed(1)+','+Y(p).toFixed(1)).join(' ')+'" fill="'+q.cor+'" stroke="'+(q.cor==='#ffffff'?'#6b6b6b':'#a07a00')+'" stroke-width="0.2"/>'; });
  R.rot.forEach(r=>{ let a=-Math.atan2(r.d[1],r.d[0])*180/Math.PI; if(a>90) a-=180; if(a<=-90) a+=180; top+='<text x="'+X(r.p).toFixed(1)+'" y="'+Y(r.p).toFixed(1)+'" font-size="8.5" fill="#1f2937" text-anchor="middle" transform="rotate('+(a-90).toFixed(1)+' '+X(r.p).toFixed(1)+' '+Y(r.p).toFixed(1)+')">'+r.txt+'</text>'; });
  R.plc.forEach(q=>{ const x=X(q.p), y=Y(q.p), r=Math.max(6,0.45*sc);
    if(q.tipo==='R-1'){ let pts=''; for(let i=0;i<8;i++){ const a=Math.PI/8+i*Math.PI/4; pts+=(x+r*Math.cos(a)).toFixed(1)+','+(y+r*Math.sin(a)).toFixed(1)+' '; }
      top+='<polygon points="'+pts+'" fill="#c62828" stroke="#fff" stroke-width="'+Math.max(1,r*0.12).toFixed(1)+'"/><polygon points="'+pts+'" fill="none" stroke="#7f1d1d" stroke-width="0.5"/><text x="'+x.toFixed(1)+'" y="'+(y+r*0.22).toFixed(1)+'" font-size="'+(r*0.55).toFixed(1)+'" font-weight="700" fill="#fff" text-anchor="middle">PARE</text>'; }
    else if(q.tipo==='R-2'){ top+='<polygon points="'+(x-r).toFixed(1)+','+(y-r*0.7).toFixed(1)+' '+(x+r).toFixed(1)+','+(y-r*0.7).toFixed(1)+' '+x.toFixed(1)+','+(y+r).toFixed(1)+'" fill="#fff" stroke="#c62828" stroke-width="'+Math.max(1.5,r*0.22).toFixed(1)+'"/>'; }
    else if(/^A-7/.test(q.tipo)){ const s2=r*1.1, sx=q.tipo==='A-7a'?-1:1; top+='<polygon points="'+x.toFixed(1)+','+(y-s2).toFixed(1)+' '+(x+s2).toFixed(1)+','+y.toFixed(1)+' '+x.toFixed(1)+','+(y+s2).toFixed(1)+' '+(x-s2).toFixed(1)+','+y.toFixed(1)+'" fill="#f6c400" stroke="#111" stroke-width="1"/><path d="M'+x.toFixed(1)+','+(y+s2*0.55).toFixed(1)+' V'+(y-s2*0.55).toFixed(1)+' M'+x.toFixed(1)+','+(y-s2*0.05).toFixed(1)+' l'+(sx*s2*0.4).toFixed(1)+','+(-s2*0.3).toFixed(1)+'" stroke="#111" stroke-width="'+Math.max(1.2,r*0.14).toFixed(1)+'" fill="none"/>'; }
    else { top+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="#fff" stroke="#c62828" stroke-width="'+Math.max(1.5,r*0.2).toFixed(1)+'"/><text x="'+x.toFixed(1)+'" y="'+(y+r*0.3).toFixed(1)+'" font-size="'+(r*0.85).toFixed(1)+'" font-weight="700" fill="#111" text-anchor="middle">'+q.txt+'</text>'; }
    top+='<text x="'+x.toFixed(1)+'" y="'+(y+r+9).toFixed(1)+'" font-size="8" fill="#111" text-anchor="middle">'+q.tipo+'</text>'; });
  return {s,top};
}
/* ícones da legenda de sinalização */
function plLegSinal(k,sx,yy){
  if(k==='s:lfo') return '<line x1="'+sx+'" y1="'+yy+'" x2="'+(sx+7)+'" y2="'+yy+'" stroke="#f2b705" stroke-width="2.5"/><line x1="'+(sx+14)+'" y1="'+yy+'" x2="'+(sx+21)+'" y2="'+yy+'" stroke="#f2b705" stroke-width="2.5"/>';
  if(k==='s:lbo') return '<rect x="'+sx+'" y="'+(yy-4)+'" width="22" height="9" fill="#a9aaae"/><line x1="'+sx+'" y1="'+(yy+2.5)+'" x2="'+(sx+22)+'" y2="'+(yy+2.5)+'" stroke="#fff" stroke-width="1.6"/>';
  if(k==='s:ftp'){ let r='<rect x="'+sx+'" y="'+(yy-5)+'" width="22" height="10" fill="#a9aaae"/>'; for(let i=0;i<5;i++) r+='<rect x="'+(sx+1+i*4.4)+'" y="'+(yy-4)+'" width="2.2" height="8" fill="#fff"/>'; return r; }
  if(k==='s:lre') return '<rect x="'+sx+'" y="'+(yy-5)+'" width="22" height="10" fill="#a9aaae"/><rect x="'+(sx+9)+'" y="'+(yy-5)+'" width="3" height="10" fill="#fff"/>';
  if(k==='s:r1') return '<polygon points="'+[0,1,2,3,4,5,6,7].map(i=>{ const a=Math.PI/8+i*Math.PI/4; return (sx+11+5.5*Math.cos(a)).toFixed(1)+','+(yy+5.5*Math.sin(a)).toFixed(1); }).join(' ')+'" fill="#c62828"/>';
  if(k==='s:r2') return '<polygon points="'+(sx+5)+','+(yy-4)+' '+(sx+17)+','+(yy-4)+' '+(sx+11)+','+(yy+5)+'" fill="#fff" stroke="#c62828" stroke-width="1.6"/>';
  if(k==='s:r19') return '<circle cx="'+(sx+11)+'" cy="'+yy+'" r="5" fill="#fff" stroke="#c62828" stroke-width="1.6"/>';
  if(k==='s:a7') return '<polygon points="'+(sx+11)+','+(yy-6)+' '+(sx+17)+','+yy+' '+(sx+11)+','+(yy+6)+' '+(sx+5)+','+yy+'" fill="#f6c400" stroke="#111" stroke-width="0.8"/>';
  if(k==='s:esq') return '<path d="M'+sx+','+(yy-5)+' h8 a8,8 0 0 1 8,8 v2 h-16 z" fill="#a9aaae" stroke="#333" stroke-width="0.8"/>';
  return '';
}
function plLegItens(){
  const S=_plT.sinal, it=[]; if(_plT.transv.some(t=>+t.raio>0)) it.push(['s:esq','Esquina com raio de concordância']);
  if(!S.on) return it;
  if(S.eixo!=='nenhum') it.push(['s:lfo','Eixo '+S.eixo+' (amarela)']); if(S.lbo) it.push(['s:lbo','Linha de bordo LBO (branca)']);
  if(_plT.transv.length){ if(S.ftp) it.push(['s:ftp','Faixa de pedestres FTP-1 (zebrada)']); if(S.lre) it.push(['s:lre','Linha de retenção LRE']); if(S.placa==='R-1') it.push(['s:r1','R-1 Parada obrigatória']); if(S.placa==='R-2') it.push(['s:r2','R-2 Dê a preferência']); }
  if(S.r19) it.push(['s:r19','R-19 Velocidade máxima '+S.vel+' km/h']);
  if(S.adv&&_plT.transv.length) it.push(['s:a7','A-7a/b Via lateral (advertência)']);
  return it;
}

/* 3D: esquinas (camadas + meio-fio no raio) */
function plEsq3D(ctx){
  const T=window.THREE, {D,W3,grp,v,P,camadas,matDe,fita}=ctx, wmf=plMfLarg(P);
  plEsquinas(D).forEach(q=>{ if(!q.poly) return; const n=q.poly.length;
    const laje=(dz0,dz1,mm,soTopo,uvk)=>{ const pos=[], uv=[], m=q.arc.length-1, Ar=(i,dz)=>W3(q.arc[i],q.z[i+1]+dz), Ed=(i,dz)=>W3(q.ed[i],q.ed[i][2]+dz);
      const push=(a,b,c,vira)=>{ const ny=(b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z); /* componente vertical da normal */
        if(vira!=null&&((ny<0)!==(vira<0))){ const t=b; b=c; c=t; }
        [a,b,c].forEach(p=>{ pos.push(p.x,p.y,p.z); uv.push(p.x/(uvk||1.5),p.z/(uvk||1.5)); }); };
      for(let i=0;i<m;i++){
        push(Ar(i,dz0),Ed(i,dz0),Ed(i+1,dz0),1); push(Ar(i,dz0),Ed(i+1,dz0),Ar(i+1,dz0),1);
        if(!soTopo){ push(Ar(i,dz1),Ed(i,dz1),Ed(i+1,dz1),-1); push(Ar(i,dz1),Ed(i+1,dz1),Ar(i+1,dz1),-1);
          push(Ar(i,dz0),Ar(i+1,dz0),Ar(i+1,dz1),null); push(Ar(i,dz0),Ar(i+1,dz1),Ar(i,dz1),null); } }
      const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); g.computeVertexNormals();
      const me=new T.Mesh(g,mm); me.castShadow=true; me.receiveShadow=true; grp.add(me); return me; };
    if(v.pista) camadas.forEach((cn,ci)=>{ if(!plOn(v,cn.k)) return; laje(-cn.prof,-cn.prof-cn.esp,matDe(ci,cn),false); if(ci===0){ const me=plNormUp(laje(0.004,0,plMat11('asfalto'),true,0.8)); if(_pl.t3&&_pl.t3.chao) _pl.t3.chao.push(me); } });
    if(v.mf&&P.mf&&q.arc2&&q.O){ const O=q.O, m=q.arc.length, zA=i=>q.z[i+1];
      const off=(p,w)=>{ const vx=O[0]-p[0], vy=O[1]-p[1], L=Math.hypot(vx,vy)||1; return [p[0]+vx/L*w,p[1]+vy/L*w]; };
      const faz=(prof,topo,uvc,mat)=>{ let secs=q.arc.map((p,i)=>prof(p,zA(i)));
        const a=secs[0][topo], b=secs[0][topo+1], c2=secs[1][topo+1], nY=(b.z-a.z)*(c2.x-a.x)-(b.x-a.x)*(c2.z-a.z);
        if(nY<0) secs=secs.reverse(); /* face de cima sempre para cima, como no meio-fio reto */
        const me=fita(secs,(a2,cc)=>[a2*0.25,uvc[cc]],plMat11(mat),true); if(_pl.t3&&_pl.t3.chao) _pl.t3.chao.push(me); };
      if(P.mf.tipo==='conjugado'){ const salt=(+P.mf.salt||8)/100, esp=(+P.mf.esp||15)/100, sb=(+P.mf.sbase||0)/100;
        if(sb>0) faz((p,e)=>[W3(p,e),W3(off(p,sb),e+0.015),W3(off(p,sb),e-salt),W3(p,e-salt),W3(p,e)],0,[0,0.3,0.6,0.9,1],'sarjeta');
        faz((p,e)=>[W3(off(p,sb),e+0.015),W3(off(p,sb+0.02),e+0.015+esp),W3(off(p,wmf),e+0.015+esp),W3(off(p,wmf),e-salt-0.1),W3(off(p,sb),e-salt-0.1),W3(off(p,sb),e+0.015)],1,[0,0.15,0.4,0.65,0.85,1],'concreto');
      }else{ const alt=(+P.mf.alt||30)/100, esp=(+P.mf.esp||15)/100;
        faz((p,e)=>[W3(p,e),W3(p,e+esp),W3(off(p,wmf),e+esp),W3(off(p,wmf),e+esp-alt),W3(p,e+esp-alt),W3(p,e)],1,[0,0.15,0.4,0.65,0.85,1],'concreto'); }
    }
  });
}
/* 3D: sinalização (pintura sobre o pavimento e placas) */
function plPlacaTex(tipo,txt){
  const T=window.THREE, c=_pl.plTex||(_pl.plTex={}), k=tipo+txt; if(c[k]) return c[k];
  const N=256, cv=plCanvas(N), g=cv.getContext('2d'); g.clearRect(0,0,N,N);
  if(tipo==='R-1'){ const oct=r=>{ g.beginPath(); for(let i=0;i<8;i++){ const a=Math.PI/8+i*Math.PI/4; g[i?'lineTo':'moveTo'](N/2+r*Math.cos(a),N/2+r*Math.sin(a)); } g.closePath(); };
    oct(126); g.fillStyle='#fff'; g.fill(); oct(112); g.fillStyle='#c62828'; g.fill(); g.fillStyle='#fff'; g.font='bold 74px Arial'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('PARE',N/2,N/2+4); }
  else if(tipo==='R-2'){ g.beginPath(); g.moveTo(6,24); g.lineTo(N-6,24); g.lineTo(N/2,N-10); g.closePath(); g.fillStyle='#c62828'; g.fill(); g.beginPath(); g.moveTo(46,46); g.lineTo(N-46,46); g.lineTo(N/2,N-58); g.closePath(); g.fillStyle='#fff'; g.fill(); }
  else if(tipo==='A-7a'||tipo==='A-7b'){ const dia=r=>{ g.beginPath(); g.moveTo(N/2,N/2-r); g.lineTo(N/2+r,N/2); g.lineTo(N/2,N/2+r); g.lineTo(N/2-r,N/2); g.closePath(); };
    dia(126); g.fillStyle='#111'; g.fill(); dia(118); g.fillStyle='#f6c400'; g.fill(); dia(110); g.fillStyle='#111'; g.fill(); dia(104); g.fillStyle='#f6c400'; g.fill();
    g.fillStyle='#111'; g.fillRect(N/2-9,N/2-62,18,124); const sx=tipo==='A-7a'?-1:1; g.beginPath(); g.moveTo(N/2,N/2-6); g.lineTo(N/2+sx*52,N/2-36); g.lineTo(N/2+sx*52,N/2-16); g.lineTo(N/2,N/2+14); g.closePath(); g.fill(); }
  else { g.beginPath(); g.arc(N/2,N/2,124,0,7); g.fillStyle='#c62828'; g.fill(); g.beginPath(); g.arc(N/2,N/2,96,0,7); g.fillStyle='#fff'; g.fill(); g.fillStyle='#111'; g.font='bold 104px Arial'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,N/2,N/2+6); }
  const t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return c[k]=t;
}
function plSinal3D(ctx){
  const T=window.THREE, {D,W3,grp}=ctx, R=plSinal(D); if(!R.pec.length&&!R.plc.length) return;
  const por={}; R.pec.forEach(q=>{ (por[q.cor]||(por[q.cor]=[])).push(q); });
  Object.keys(por).forEach(cor=>{ const pos=[]; por[cor].forEach(q=>{ const V=q.pts.map(p=>W3(p,p[2]+0.012)); [V[0],V[1],V[2],V[0],V[2],V[3]].forEach(p=>pos.push(p.x,p.y,p.z)); });
    const g=new T.BufferGeometry(); g.setAttribute('position',new T.Float32BufferAttribute(pos,3)); g.computeVertexNormals();
    const mm=new T.MeshStandardMaterial({color:new T.Color(cor),roughness:0.55,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
    const me=new T.Mesh(g,mm); me.receiveShadow=true; me.renderOrder=3; grp.add(me); });
  const matPoste=new T.MeshStandardMaterial({color:0x8a8f96,roughness:0.5,metalness:0.6}), matCosta=new T.MeshStandardMaterial({color:0x9aa0a6,roughness:0.6,metalness:0.4});
  R.plc.forEach(q=>{ const b=W3(q.p,q.z), th=Math.atan2(q.f[0],-q.f[1]);
    const poste=new T.Mesh(new T.CylinderGeometry(0.035,0.035,2.3,10),matPoste); poste.position.set(b.x,b.y+1.15,b.z); poste.castShadow=true; grp.add(poste);
    const L=/^A-/.test(q.tipo)?0.85:0.75, mf=new T.MeshStandardMaterial({map:plPlacaTex(q.tipo,q.txt),transparent:true,alphaTest:0.3,roughness:0.5});
    const fr=new T.Mesh(new T.PlaneGeometry(L,L),mf); fr.position.set(b.x+Math.sin(th)*0.05,b.y+2.0,b.z+Math.cos(th)*0.05); fr.rotation.y=th; fr.castShadow=true; grp.add(fr);
    /* costas: mesmo recorte da placa, escura */
    const cs=new T.Mesh(new T.PlaneGeometry(L,L),new T.MeshStandardMaterial({color:0x3a3d42,roughness:0.6,metalness:0.4,transparent:true,alphaTest:0.3,map:plPlacaTex(q.tipo,q.txt)}));
    cs.position.set(b.x+Math.sin(th)*0.035,b.y+2.0,b.z+Math.cos(th)*0.035); cs.rotation.y=th+Math.PI; grp.add(cs);
  });
}

/* ── painel: ruas transversais e sinalização ── */
function plPainelTransv(tit,ck){
  const S=_plT.sinal, L=_plT.transv, sel=(k,ops,val,fn)=>'<select style="font-size:11px" onchange="'+fn+'">'+ops.map(o=>'<option value="'+o[0]+'"'+(String(val)===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>';
  let h=tit('Ruas transversais e esquinas');
  if(ruas.some(r=>r.multi)) h+='<div style="font-size:11px;margin:4px 0 8px;display:grid;grid-template-columns:1fr auto;gap:3px 6px;align-items:center"><span title="Raio do meio-fio nas esquinas entre as ruas do bairro. As esquinas onde só uma das ruas chega (rua sem saída) e as que não cabem entre os cruzamentos vizinhos ficam com raio menor. 0 = canto vivo.">Raio das esquinas do bairro (m)</span><input type="number" min="0" max="30" step="0.5" value="'+esc(_plT.raioBairro==null?6:_plT.raioBairro)+'" style="width:60px;font-size:11px" onchange="plRaioB(this.value)"></div>';
  if(!L.length) h+='<div style="font-size:11px;color:var(--fg2)">Nenhuma. Clique em “+ Rua transversal” para incluir um cruzamento: a rua usa o greide da via principal na estaca escolhida.</div>';
  L.forEach((t,i)=>{ const inp=(k,val,w,tp)=>'<input type="'+(tp||'number')+'" value="'+esc(val)+'" style="width:'+w+'px;font-size:11px" onchange="plTSet('+i+',\''+k+'\',this.value)">';
    h+='<div style="font-size:11px;margin:6px 0;border-top:1px solid var(--border,#ddd);padding-top:5px"><div style="display:flex;gap:6px;align-items:center">'+inp('nome',t.nome||('Transversal '+(i+1)),190,'text')+
      '<button type="button" class="tb-btn" style="font-size:11px;padding:1px 6px" title="Excluir esta rua" onclick="plTDel('+i+')">✕</button></div>'+
      '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 6px;margin-top:4px;align-items:center">'+
      '<span title="Estaca da via principal onde o eixo da transversal cruza (ex.: 3+5 ou 65)">Estaca na principal</span>'+inp('est',estacaTxt(+t.est||0),80,'text')+
      '<span>Lado</span>'+sel('lado',[['esq','esquerdo'],['dir','direito']],t.lado,"plTSet("+i+",'lado',this.value)")+
      '<span>Ângulo com a principal (°)</span>'+inp('ang',t.ang,60)+'<span>Largura da pista (m)</span>'+inp('larg',t.larg,60)+
      '<span title="Raio de concordância do meio-fio na esquina. 0 = sem raio (canto vivo)">Raio da esquina (m)</span>'+inp('raio',t.raio,60)+'<span>Comprimento desenhado (m)</span>'+inp('comp',t.comp,60)+'</div></div>'; });
  h+='<button type="button" class="tb-btn" style="font-size:11px;padding:2px 8px;margin-top:4px" onclick="plTAdd()">+ Rua transversal</button>';
  h+=tit('Sinalização (CONTRAN · MBST)')+ck('Mostrar sinalização na planta e no 3D',S.on,"plSSet('on',this.checked?1:0)")+
    '<div style="font-size:12px;margin:4px 0;display:grid;grid-template-columns:auto 1fr;gap:4px 6px;align-items:center">Eixo '+sel('eixo',[['LFO-2','LFO-2 seccionada (pode ultrapassar)'],['LFO-1','LFO-1 contínua simples'],['LFO-3','LFO-3 dupla contínua'],['nenhum','sem linha de eixo']],S.eixo,"plSSet('eixo',this.value)")+
    'Velocidade '+sel('vel',[30,40,50,60,70,80].map(x=>[x,x+' km/h']),S.vel,"plSSet('vel',+this.value)")+
    'Placa na transversal '+sel('placa',[['R-1','R-1 Parada obrigatória'],['R-2','R-2 Dê a preferência'],['nenhuma','nenhuma']],S.placa,"plSSet('placa',this.value)")+'</div>'+
    ck('Linha de bordo (LBO)',S.lbo,"plSSet('lbo',this.checked?1:0)")+ck('Faixa de pedestres nas esquinas (FTP-1)',S.ftp,"plSSet('ftp',this.checked?1:0)")+
    ck('Linha de retenção (LRE)',S.lre,"plSSet('lre',this.checked?1:0)")+ck('Placa de velocidade máxima (R-19)',S.r19,"plSSet('r19',this.checked?1:0)")+ck('Placas de advertência A-7a/A-7b antes de cada transversal',S.adv,"plSSet('adv',this.checked?1:0)")+
    '<div style="font-size:11px;color:var(--fg2);margin-top:4px;line-height:1.4">'+plSinalResumo()+'</div>';
  h+=plGeoPainel(tit);
  return h;
}
function plMarcarSujo(){ try{ _sujo=true; }catch(e){} }
function plTMudou(){ ruasSinc(); _pl.vb=null; if(_pl.t3) _pl.t3.pronto=false; plPainel(); if(_pl.modo==='planta') plDesenhar(true); else pl3D(); plMarcarSujo(); }
function plTAdd(){ const rm=plLinhasMain(); const e0=rm.length?+rm[0].est:0, eN=rm.length?+rm[rm.length-1].est:0;
  _plT.transv.push({nome:'Transversal '+(_plT.transv.length+1),est:Math.round((e0+eN)/2),lado:'esq',ang:90,larg:6,raio:6,comp:30}); plTMudou(); }
function plTDel(i){ _plT.transv.splice(i,1); plTMudou(); }
function plTSet(i,k,val){ const t=_plT.transv[i]; if(!t) return;
  if(k==='nome'||k==='lado') t[k]=val;
  else if(k==='est'){ const x=plParseEst(val); if(!isNaN(x)) t.est=x; else toast('Estaca inválida. Use 3+5 ou 65.',true); }
  else { const x=parseFloat(String(val).replace(',','.')); if(isNaN(x)){ toast('Valor inválido.',true); } else { const lim={ang:[15,165],larg:[2,30],raio:[0,30],comp:[5,500]}[k]; t[k]=lim?Math.max(lim[0],Math.min(lim[1],x)):x; } }
  plTMudou(); }
function plSSet(k,val){ _plT.sinal[k]=val; plPainel(); plRedesenhar(); plMarcarSujo(); }
/* projeto (.json e nuvem) */
function plTExportar(){ return JSON.parse(JSON.stringify(_plT)); }
function plTImportar(o){ const p=JSON.parse(JSON.stringify(PL_T_PADRAO)); if(o&&typeof o==='object'){ if(Array.isArray(o.transv)) p.transv=o.transv.filter(t=>t&&typeof t==='object'); if(o.sinal&&typeof o.sinal==='object') Object.assign(p.sinal,o.sinal); if(Array.isArray(o.eixo)) p.eixo=o.eixo; if(Array.isArray(o.fundo)) p.fundo=o.fundo; if(o.raioBairro!=null&&isFinite(+o.raioBairro)) p.raioBairro=Math.max(0,Math.min(30,+o.raioBairro)); if(o.geo&&typeof o.geo==='object') Object.assign(p.geo,o.geo); }
  _plT=p; ruasSinc(); _pl.vb=null; if(_pl.t3) _pl.t3.pronto=false; }

/* ── GEORREFERENCIAMENTO: coordenadas das estacas (UTM SIRGAS 2000 e lat/lon) ── */
function geoParaUTM(lat,lng,zona){ const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2); const z=zona||Math.floor((lng+180)/6)+1, l0=((z-1)*6-180+3)*Math.PI/180, ph=lat*Math.PI/180, l=lng*Math.PI/180;
  const N=a/Math.sqrt(1-e2*Math.sin(ph)**2), T=Math.tan(ph)**2, C=ep2*Math.cos(ph)**2, A=Math.cos(ph)*(l-l0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*ph-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*ph)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*ph)-(35*e2**3/3072)*Math.sin(6*ph));
  const E=500000+k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120), Nn=k0*(M+N*Math.tan(ph)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))+(lat<0?1e7:0);
  return {e:E,n:Nn,z}; }
function geoDeUTM(E,Nn,z,sul){ const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2), e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const x=E-500000, y=sul?Nn-1e7:Nn, M=y/k0, mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2**3/256));
  const p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const C1=ep2*Math.cos(p1)**2, T1=Math.tan(p1)**2, N1=a/Math.sqrt(1-e2*Math.sin(p1)**2), R1=a*(1-e2)/Math.pow(1-e2*Math.sin(p1)**2,1.5), D=x/(N1*k0);
  const lat=p1-(N1*Math.tan(p1)/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720);
  const lon=((z-1)*6-180+3)*Math.PI/180+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/Math.cos(p1);
  return [lat*180/Math.PI,lon*180/Math.PI]; }
const plNum=v=>{ const x=parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(x)?null:x; };
/* UTM de um ponto de referência (lat/lon ou E/N) */
function plGeoRef(lat,lng,e,n){ const G=_plT.geo, z=+G.zona||24;
  if(G.modo==='utm'){ const E=plNum(e), N=plNum(n); return (E!=null&&N!=null)?{e:E,n:N,z}:null; }
  const la=plNum(lat), lo=plNum(lng); if(la==null||lo==null) return null; const u=geoParaUTM(la,lo,z); return {e:u.e,n:u.n,z}; }
/* transformação do desenho (m, norte do desenho para cima) para UTM */
function plGeoTf(){ const D=plDados(), d0=D.find(x=>x.id==='r0'); if(!d0) return null; const G=_plT.geo, r0=plGeoRef(G.lat,G.lng,G.e,G.n); if(!r0) return null;
  const s0=d0.L[0].est, B=d0.lay.pos(s0), rot=(plNum(G.rot)||0)*Math.PI/180, c=Math.cos(rot), s=Math.sin(rot);
  const f=p=>{ const dx=p[0]-B[0], dy=p[1]-B[1]; const E=r0.e+dx*c+dy*s, N=r0.n-dx*s+dy*c; const ll=geoDeUTM(E,N,r0.z,true); return {E,N,lat:ll[0],lng:ll[1]}; };
  return {f,d0,rot:plNum(G.rot)||0,z:r0.z}; }
function plGeoAzim(tf,d0,e){ const a=d0.lay.pos(e-0.5), b=d0.lay.pos(e+0.5), A=tf.f(a), B=tf.f(b); let az=Math.atan2(B.E-A.E,B.N-A.N)*180/Math.PI; if(az<0) az+=360; return az; }
function plGeoGiro2(){ const G=_plT.geo, D=plDados(), d0=D.find(x=>x.id==='r0'); const s2=plParseEst(G.est2); const r0=plGeoRef(G.lat,G.lng,G.e,G.n), r2=plGeoRef(G.lat2,G.lng2,G.e2,G.n2);
  if(!d0||!r0||!r2||isNaN(s2)){ toast('Preencha o ponto 1 (estaca inicial) e o ponto 2 (estaca e coordenada).',true); return; }
  const B=d0.lay.pos(d0.L[0].est), Q=d0.lay.pos(s2), azD=Math.atan2(Q[0]-B[0],Q[1]-B[1]), azR=Math.atan2(r2.e-r0.e,r2.n-r0.n);
  let g=(azR-azD)*180/Math.PI; while(g>180) g-=360; while(g<-180) g+=360; G.rot=+g.toFixed(4);
  const dd=Math.hypot(Q[0]-B[0],Q[1]-B[1]), dr=Math.hypot(r2.e-r0.e,r2.n-r0.n);
  toast('Giro calculado: '+fmt(g,3)+'°. Distância no desenho '+fmt(dd,2)+' m × nas coordenadas '+fmt(dr,2)+' m (diferença '+fmt(dr-dd,2)+' m).'); plPainel(); plMarcarSujo(); }
function plGeoSet(k,v){ _plT.geo[k]=v; plMarcarSujo(); if(k==='modo') plPainel(); }
function plGeoLinhas(){ const tf=plGeoTf(); if(!tf){ toast('Informe a coordenada da estaca inicial (eixo) em Georreferenciamento.',true); return null; }
  const d0=tf.d0, A=plAmostras0(d0,1); return d0.L.map(l=>{ const s={c:d0.lay.pos(l.est),est:l.est}, b=l.larg/2, x=tf.f(s.c), e=tf.f(plOff(d0,s,b)), dr=tf.f(plOff(d0,s,-b)); return {est:l.est,eixo:x,esq:e,dir:dr,az:plGeoAzim(tf,d0,l.est),gr:l.gr}; }); }
function plGeoTabela(){ const L=plGeoLinhas(); if(!L) return; const f3=x=>fmt(x,3), f7=x=>x.toFixed(7).replace('.',',');
  const az=a=>{ const g=Math.floor(a), m=Math.floor((a-g)*60), s=((a-g)*60-m)*60; return g+'° '+String(m).padStart(2,'0')+"' "+s.toFixed(1).replace('.',',')+'"'; };
  let h='<div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()"><div style="background:var(--bg,#fff);color:var(--fg,#111);max-width:96vw;max-height:88vh;overflow:auto;border-radius:8px;padding:14px;font-size:12px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-size:14px">Coordenadas das estacas — UTM SIRGAS 2000, zona '+_plT.geo.zona+' S</b><span><button class="tb-btn" onclick="plGeoCsv()">⬇ CSV</button> <button class="tb-btn" onclick="plGeoKml()">⬇ KML (Google Earth)</button> <button class="tb-btn" onclick="this.closest(\'[style*=fixed]\').remove()">✕</button></span></div>'+
    '<div style="color:var(--fg2);margin:4px 0 8px">Giro do desenho: '+fmt(+_plT.geo.rot||0,4)+'° · Azimute = do norte, no sentido horário, no sentido das estacas.</div><table class="lista-nuvem"><tr><th>Estaca</th><th>Eixo E</th><th>Eixo N</th><th>Eixo latitude</th><th>Eixo longitude</th><th>Azimute do eixo</th><th>Borda esq. E</th><th>Borda esq. N</th><th>Borda dir. E</th><th>Borda dir. N</th><th>Greide</th></tr>'+
    L.map(r=>'<tr><td>'+estacaTxt(r.est)+'</td><td>'+f3(r.eixo.E)+'</td><td>'+f3(r.eixo.N)+'</td><td>'+f7(r.eixo.lat)+'</td><td>'+f7(r.eixo.lng)+'</td><td>'+az(r.az)+'</td><td>'+f3(r.esq.E)+'</td><td>'+f3(r.esq.N)+'</td><td>'+f3(r.dir.E)+'</td><td>'+f3(r.dir.N)+'</td><td>'+f3(r.gr)+'</td></tr>').join('')+'</table></div></div>';
  const w=document.createElement('div'); w.innerHTML=h; document.body.appendChild(w.firstChild); }
function plGeoCsv(){ const L=plGeoLinhas(); if(!L) return; const n=(x,d)=>x.toFixed(d).replace('.',',');
  const t='Estaca;Distância (m);Eixo E;Eixo N;Eixo lat;Eixo lon;Azimute (°);Borda esq. E;Borda esq. N;Borda dir. E;Borda dir. N;Greide\n'+L.map(r=>[estacaTxt(r.est),n(r.est,3),n(r.eixo.E,3),n(r.eixo.N,3),n(r.eixo.lat,8),n(r.eixo.lng,8),n(r.az,4),n(r.esq.E,3),n(r.esq.N,3),n(r.dir.E,3),n(r.dir.N,3),r.gr==null?'':n(r.gr,3)].join(';')).join('\n');
  triggerDownload(new Blob(['﻿'+t],{type:'text/csv;charset=utf-8'}),'pavimento_coordenadas_'+carimbo()+'.csv'); }
function plGeoKml(){ const L=plGeoLinhas(); if(!L) return; const c=p=>p.lng.toFixed(8)+','+p.lat.toFixed(8)+',0', nm=esc(((document.getElementById('logradouro')||{}).value)||'Via');
  const ln=(n,cor,pts)=>'<Placemark><name>'+n+'</name><Style><LineStyle><color>'+cor+'</color><width>3</width></LineStyle></Style><LineString><tessellate>1</tessellate><coordinates>'+pts.map(c).join(' ')+'</coordinates></LineString></Placemark>';
  const k='<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>'+nm+'</name>'+ln('Eixo','ff0000ff',L.map(r=>r.eixo))+ln('Borda esquerda','ffffffff',L.map(r=>r.esq))+ln('Borda direita','ffffffff',L.map(r=>r.dir))+
    '<Folder><name>Estacas</name>'+L.map(r=>'<Placemark><name>EST. '+estacaTxt(r.est)+'</name><description>E '+r.eixo.E.toFixed(3)+' · N '+r.eixo.N.toFixed(3)+' · azimute '+r.az.toFixed(4)+'°</description><Point><coordinates>'+c(r.eixo)+'</coordinates></Point></Placemark>').join('')+'</Folder></Document></kml>';
  triggerDownload(new Blob([k],{type:'application/vnd.google-earth.kml+xml'}),'pavimento_'+carimbo()+'.kml'); }
function plGeoPainel(tit){ const G=_plT.geo, ll=G.modo!=='utm', inp=(k,ph,w)=>'<input value="'+esc(G[k]==null?'':G[k])+'" placeholder="'+ph+'" style="width:'+(w||110)+'px;font-size:11px" onchange="plGeoSet(\''+k+'\',this.value)">';
  const tf=plGeoTf(); let res='';
  if(tf){ const p=tf.f(tf.d0.lay.pos(tf.d0.L[0].est)); res='<div style="font-size:11px;margin-top:4px">Estaca inicial: E '+fmt(p.E,3)+' · N '+fmt(p.N,3)+'<br>'+p.lat.toFixed(7)+', '+p.lng.toFixed(7)+' · <a href="https://www.google.com/maps?q='+p.lat.toFixed(7)+','+p.lng.toFixed(7)+'&t=k" target="_blank" rel="noopener">ver no Google Maps</a><br>Azimute do eixo na estaca inicial: '+fmt(plGeoAzim(tf,tf.d0,tf.d0.L[0].est),3)+'°</div>'; }
  return tit('Georreferenciamento (coordenadas)')+
    '<div style="font-size:11px;color:var(--fg2);line-height:1.4">O desenho segue o traçado e o azimute do PDF (norte do desenho para cima). Informe a coordenada do <b>eixo na estaca inicial</b>; com um 2º ponto o programa calcula o giro do desenho.</div>'+
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 6px;font-size:11px;margin-top:4px;align-items:center">Tipo <select style="font-size:11px" onchange="plGeoSet(\'modo\',this.value)"><option value="ll"'+(ll?' selected':'')+'>Latitude / longitude</option><option value="utm"'+(!ll?' selected':'')+'>UTM (E / N)</option></select>'+
    'Zona UTM <span>'+inp('zona','24',40)+' S (Macaé/Rio das Ostras = 24)</span>'+
    'Ponto 1 (estaca inicial) <span>'+(ll?inp('lat','-22.38…')+' '+inp('lng','-41.78…'):inp('e','E (m)')+' '+inp('n','N (m)'))+'</span>'+
    'Giro do desenho (°) <span>'+inp('rot','0',60)+' <span style="color:var(--fg2)">+ = horário</span></span>'+
    'Ponto 2 (opcional) <span>estaca '+inp('est2','ex.: 10',50)+' '+(ll?inp('lat2','lat')+' '+inp('lng2','lon'):inp('e2','E')+' '+inp('n2','N'))+'</span></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px"><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoGiro2()">Calcular giro pelos 2 pontos</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoTabela()">📍 Coordenadas das estacas</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoKml()">⬇ KML</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoCsv()">⬇ CSV</button></div>'+res+
    (_plT.eixo?'<div style="font-size:11px;color:#15803d;margin-top:3px">✔ Traçado do levantamento (com as curvas) em uso.</div>':'<div style="font-size:11px;color:var(--fg2);margin-top:3px">Eixo reto (importe o levantamento em PDF para usar o traçado com curvas).</div>');
}
/* recebe o eixo do levantamento (m; y para cima) */
function plTEixo(pts){ if(!Array.isArray(pts)||pts.length<2){ _plT.eixo=null; return; } const x0=pts[0][0], y0=pts[0][1]; _plT.eixo=pts.map(p=>[+(p[0]-x0).toFixed(3),+(p[1]-y0).toFixed(3)]); ruasSinc(); _pl.vb=null; if(_pl.t3) _pl.t3.pronto=false; }

/* ══════════════════════════════════════════════════════
   PATCH PF-GEO (16/11/2026) · 🛰 GEORREFERENCIAR — 3º modo da aba (ao lado de 🗺 Planta baixa e 🧊 Ver em 3D),
   cópia do PI-16/17/18 do Intertravado: mapa Leaflet + satélite Esri, pesquisa de local, Lat/Lon ou UTM,
   ARRASTAR o desenho (ou o ponto ●) para mover, ARRASTAR o ponto ◎ (ou Shift + roda) para girar, escala,
   transparência, Realista/Técnico, KML/KMZ, ✔ Salvar posição. Todas as ruas do projeto vão juntas.
   Substitui a locação por 2 pontos (pedido do dono). Só posição/desenho: nenhum cálculo muda.
══════════════════════════════════════════════════════ */
function geoAuto(){ return null; }
function geoInfo(){}
/* PATCH PI-16 (12/11/2026) · GEORREFERENCIAR: posiciona a planta sobre o satélite (Leaflet + Esri World Imagery, o mesmo do programa Imagens GoogleEarth).
   Só desenho/posição: nenhum cálculo muda. Estado em _geo (salvo no projeto em `georef`). */
let _geo={lat:null,lng:null,rot:0,esc:100,opD:70,opS:100,base:'sat',modo:'dec'};
const GEO_L='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.';
const GEO_M=111320;
(function(){
  try{ const g=JSON.parse(localStorage.getItem('pav_georef')||'null'); if(g&&typeof g==='object') Object.assign(_geo,g); }catch(e){}
  /* vai no projeto junto com a Planta e 3D (planta3d.georef) */
  const ex=plTExportar; plTExportar=function(){ const o=ex.apply(this,arguments); if(_geo.lat!=null) o.georef=Object.assign({},_geo); return o; };
  const im=plTImportar; plTImportar=function(o){ const r=im.apply(this,arguments); _geo=Object.assign({lat:null,lng:null,rot:0,esc:100,opD:70,opS:100,base:'sat',modo:'dec'},(o&&o.georef&&typeof o.georef==='object')?o.georef:{}); if(_pl.modo==='geo'&&_gm){ geoDestruir(); geoMontar(); } return r; };
})();
function geoSalvaLocal(){ try{ localStorage.setItem('pav_georef',JSON.stringify(_geo)); }catch(e){} }
let _gm=null; /* mapa, camadas e pontos locais */
function geoPontos(){
  const D=plDados(), P=secaoParams(), w=plMfLarg(P), pistas=[], mfs=[], eixos=[]; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  D.forEach(d=>{ const A=plAmostras(d,2); if(A.length<2) return;
    const pi=plPoligono(d,A,0), mf=plPoligono(d,A,w); pistas.push(pi); if(w>0) mfs.push(mf); eixos.push(A.map(s=>s.c));
    mf.forEach(q=>{ x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]); }); });
  if(x0>x1) return null; return {pistas,mfs,eixos,cx:(x0+x1)/2,cy:(y0+y1)/2,raio:Math.hypot(x1-x0,y1-y0)/2};
}
function geoLL(pt){ const g=_geo, G=_gm.pts, k=g.esc/100, th=g.rot*Math.PI/180, dx=(pt[0]-G.cx)*k, dy=(pt[1]-G.cy)*k;
  const e=dx*Math.cos(th)-dy*Math.sin(th), n=dx*Math.sin(th)+dy*Math.cos(th); return [g.lat+n/GEO_M, g.lng+e/(GEO_M*Math.cos(g.lat*Math.PI/180))]; }
function geoDesenha(){
  const m=_gm; if(!m||_geo.lat==null) return; const L=window.L, G=m.pts;
  const set=(arr,lst)=>{ lst.forEach((pl,i)=>pl.setLatLngs(arr[i].map(geoLL))); };
  set(G.pistas,m.lp); set(G.mfs,m.lm); set(G.eixos,m.le);
  m.lp.concat(m.lm,m.le).forEach(x=>x.setStyle({opacity:_geo.opD/100,fillOpacity:Math.min(.85,_geo.opD/100)}));
  const c=[_geo.lat,_geo.lng]; m.mk.setLatLng(c);
  const res=40075016.686*Math.cos(c[0]*Math.PI/180)/(256*Math.pow(2,m.map.getZoom())), R=Math.min(G.raio*_geo.esc/100*1.15+8,130*res), th=_geo.rot*Math.PI/180; /* PF-GEO: ponto de girar a ~130 px do centro (sempre na tela) e no sentido do 'para cima' do desenho */ m.mr.setLatLng([c[0]+R*Math.cos(th)/GEO_M, c[1]-R*Math.sin(th)/(GEO_M*Math.cos(c[0]*Math.PI/180))]);
  m.lh.setLatLngs([c,m.mr.getLatLng()]);
  geoCampos();
}
function geoCampos(){
  const g=_geo, q=id=>document.getElementById(id); if(!q('geo-lat')) return;
  if(g.modo==='utm'&&g.lat!=null){ const u=geoParaUTM(g.lat,g.lng); q('geo-lat').value=u.e.toFixed(2); q('geo-lng').value=u.n.toFixed(2); q('geo-zona').value=u.z; }
  else { q('geo-lat').value=g.lat==null?'':g.lat.toFixed(6); q('geo-lng').value=g.lng==null?'':g.lng.toFixed(6); }
  q('geo-rot').value=g.rot; q('geo-rot-n').value=(+g.rot).toFixed(1); q('geo-esc').value=g.esc; q('geo-od').value=g.opD; q('geo-os').value=g.opS;
}
/* UTM (SIRGAS 2000 ≈ WGS84), hemisfério sul */
function geoParaUTM(lat,lng,zona){ const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2); const z=zona||Math.floor((lng+180)/6)+1, l0=((z-1)*6-180+3)*Math.PI/180, ph=lat*Math.PI/180, l=lng*Math.PI/180;
  const N=a/Math.sqrt(1-e2*Math.sin(ph)**2), T=Math.tan(ph)**2, C=ep2*Math.cos(ph)**2, A=Math.cos(ph)*(l-l0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*ph-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*ph)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*ph)-(35*e2**3/3072)*Math.sin(6*ph));
  const E=500000+k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120), Nn=k0*(M+N*Math.tan(ph)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))+(lat<0?1e7:0);
  return {e:E,n:Nn,z}; }
function geoDeUTM(E,Nn,z,sul){ const a=6378137,f=1/298.257222101,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2), e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
  const x=E-500000, y=sul?Nn-1e7:Nn, M=y/k0, mu=M/(a*(1-e2/4-3*e2*e2/64-5*e2**3/256));
  const p1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1*e1/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
  const C1=ep2*Math.cos(p1)**2, T1=Math.tan(p1)**2, N1=a/Math.sqrt(1-e2*Math.sin(p1)**2), R1=a*(1-e2)/Math.pow(1-e2*Math.sin(p1)**2,1.5), D=x/(N1*k0);
  const lat=p1-(N1*Math.tan(p1)/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720);
  const lon=((z-1)*6-180+3)*Math.PI/180+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/Math.cos(p1);
  return [lat*180/Math.PI,lon*180/Math.PI]; }
function geoNums(t){ return (String(t).match(/-?\d+(?:[.,]\d+)?/g)||[]).map(v=>parseFloat(v.replace(',','.'))); }
function geoAbrir(){
  if(document.getElementById('geo-modal')){ return; }
  let pts; try{ pts=geoPontos(); }catch(e){ pts=null; }
  if(!pts){ toast('Preencha a Topografia (ruas com greide e largura) para ter um desenho a posicionar.'); return; }
  const ov=document.createElement('div'); ov.id='geo-modal'; ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:8px';
  ov.innerHTML='<div style="background:var(--bg,#fff);color:var(--fg,#111);border-radius:8px;width:min(1250px,100%);height:min(900px,100%);display:flex;flex-direction:column;overflow:hidden;font-size:13px">'
  +'<div style="padding:8px 10px;border-bottom:1px solid #ccc;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>🛰 Georreferenciar</b>'
  +'<input id="geo-q" placeholder="Pesquisar rua, bairro, cidade…" style="flex:1;min-width:180px;padding:5px" onkeydown="if(event.key===\'Enter\')geoBusca()"><button class="tb-btn" onclick="geoBusca()">🔍 Pesquisar</button>'
  +'<span id="geo-res" style="position:relative"></span><button class="tb-btn" style="margin-left:auto" onclick="geoFechar()">✕ Fechar</button></div>'
  +'<div style="padding:6px 10px;border-bottom:1px solid #ddd;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
  +'<select id="geo-modo" onchange="geoModo(this.value)"><option value="dec">Lat / Lon (graus)</option><option value="utm">UTM (E / N)</option></select>'
  +'<label><span id="geo-l1">Latitude</span> <input id="geo-lat" style="width:110px" onchange="geoCoord()"></label>'
  +'<label><span id="geo-l2">Longitude</span> <input id="geo-lng" style="width:110px" onchange="geoCoord()"></label>'
  +'<label id="geo-zl" style="display:none">Zona <input id="geo-zona" type="number" value="24" style="width:50px" onchange="geoCoord()"> S</label>'
  +'<button class="tb-btn" onclick="geoCentro()" title="Coloca o desenho no centro do mapa que você está vendo">📍 Posicionar no centro do mapa</button>'
  +'<button class="tb-btn" onclick="geoColar()" title="Cole coordenadas copiadas do Google Maps/Earth (ex.: -22.5266, -41.9456)">📋 Colar coordenadas</button></div>'
  +'<div style="padding:6px 10px;border-bottom:1px solid #ddd;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
  +'<label>Giro <input id="geo-rot" type="range" min="-180" max="180" step="0.5" style="vertical-align:middle;width:150px" oninput="geoSet(\'rot\',this.value)"> <input id="geo-rot-n" type="number" step="0.5" style="width:62px" onchange="geoSet(\'rot\',this.value)">°</label>'
  +'<label>Escala <input id="geo-esc" type="range" min="50" max="150" step="0.5" style="vertical-align:middle;width:100px" oninput="geoSet(\'esc\',this.value)">%</label>'
  +'<label>Desenho <input id="geo-od" type="range" min="10" max="100" style="vertical-align:middle;width:90px" oninput="geoSet(\'opD\',this.value)"></label>'
  +'<label>Imagem <input id="geo-os" type="range" min="20" max="100" style="vertical-align:middle;width:90px" oninput="geoSet(\'opS\',this.value)"></label>'
  +'<select id="geo-base" onchange="geoBase(this.value)"><option value="sat">Satélite</option><option value="hib">Satélite + nomes</option><option value="rua">Mapa de ruas</option></select>'
  +'<button class="tb-btn" onclick="geoKml()" title="Baixa um KML do desenho para abrir no Google Earth">⬇ KML (Google Earth)</button>'
  +'<a class="tb-btn" id="geo-gm" target="_blank" rel="noopener" style="text-decoration:none">↗ Abrir no Google Maps</a>'
  +'<button class="tb-btn tb-btn-save" onclick="geoFechar(true)">✔ Salvar posição</button></div>'
  +'<div style="font-size:11.5px;color:#666;padding:3px 10px">Arraste o desenho (ou o ponto central ●) para mover · arraste o ponto ◎ para girar · Shift + roda do mouse gira · roda sem Shift dá zoom no mapa.</div>'
  +'<div id="geo-map" style="flex:1;min-height:300px"></div></div>';
  document.body.appendChild(ov);
  if(!document.getElementById('geo-css')){ const l=document.createElement('link'); l.id='geo-css'; l.rel='stylesheet'; l.href=GEO_L+'css'; document.head.appendChild(l); }
  plCarregar(GEO_L+'js').then(()=>geoIniciar(pts)).catch(()=>{ document.getElementById('geo-map').innerHTML='<div style="padding:30px">Sem conexão para carregar o mapa. Verifique a internet e tente de novo.</div>'; });
}
function geoIniciar(pts){
  const L=window.L, el=document.getElementById('geo-map'); if(!el) return;
  const novo=_geo.lat==null, c0=novo?[-22.527,-41.945]:[_geo.lat,_geo.lng];
  const map=L.map(el,{maxZoom:21,scrollWheelZoom:true}).setView(c0,novo?13:19);
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:19,attribution:'Imagens © Esri'});
  const nom=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:21,maxNativeZoom:19});
  const rua=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:21,maxNativeZoom:19,attribution:'© OpenStreetMap'});
  const est=(c,o)=>Object.assign({weight:1,interactive:true,bubblingMouseEvents:false},o,{color:c});
  const lp=pts.pistas.map(()=>L.polygon([[0,0]],est('#ffffff',{fillColor:'#555',weight:1.5}))), lm=pts.mfs.map(()=>L.polygon([[0,0]],est('#ffd24a',{fill:false,weight:1,dashArray:'4 3'}))), le=pts.eixos.map(()=>L.polyline([[0,0]],{color:'#ff3b30',weight:1.5,dashArray:'8 5',interactive:false}));
  const mk=L.marker(c0,{draggable:true,icon:L.divIcon({className:'',html:'<div style="width:16px;height:16px;border-radius:50%;background:#ff3b30;border:2px solid #fff;box-shadow:0 0 4px #000;margin:-8px 0 0 -8px"></div>'})});
  const mr=L.marker(c0,{draggable:true,icon:L.divIcon({className:'',html:'<div title="Arraste para girar" style="width:20px;height:20px;border-radius:50%;background:#2d7ff9;border:3px solid #fff;box-shadow:0 0 4px #000;margin:-10px 0 0 -10px;cursor:grab"></div>'})});
  const lh=L.polyline([c0,c0],{color:'#2d7ff9',weight:2,interactive:false});
  _gm={map,pts,sat,nom,rua,lp,lm,le,mk,mr,lh};
  lp.concat(lm,le,[lh,mk,mr]).forEach(x=>x.addTo(map));
  geoBase(_geo.base||'sat'); document.getElementById('geo-base').value=_geo.base||'sat'; document.getElementById('geo-modo').value=_geo.modo||'dec'; geoModo(_geo.modo||'dec',true);
  if(novo){ _geo.lat=c0[0]; _geo.lng=c0[1]; _gm.novo=true; }
  mk.on('drag',()=>{ const p=mk.getLatLng(); _geo.lat=p.lat; _geo.lng=p.lng; geoDesenha(); });
  mr.on('drag',()=>{ const p=mr.getLatLng(), dn=(p.lat-_geo.lat)*GEO_M, de=(p.lng-_geo.lng)*GEO_M*Math.cos(_geo.lat*Math.PI/180); let r=-Math.atan2(de,dn)*180/Math.PI; if(r>180) r-=360; if(r<-180) r+=360; _geo.rot=Math.round(r*10)/10; const R=Math.hypot(dn,de)/(pts.raio*_geo.esc/100*1.15+8); geoDesenha(); });
  mr.on('dragend',()=>{ geoDesenha(); });
  /* arrastar o desenho inteiro */
  let dr=null;
  lp.forEach(pl=>pl.on('mousedown',e=>{ if(_geo.fix) return; dr={la:e.latlng.lat,ln:e.latlng.lng,lat:_geo.lat,lng:_geo.lng}; map.dragging.disable(); L.DomEvent.stop(e); }));
  map.on('mousemove',e=>{ if(!dr) return; _geo.lat=dr.lat+(e.latlng.lat-dr.la); _geo.lng=dr.lng+(e.latlng.lng-dr.ln); geoDesenha(); });
  const fim=()=>{ if(dr){ dr=null; map.dragging.enable(); } }; map.on('mouseup',fim); document.addEventListener('mouseup',fim);
  el.addEventListener('wheel',e=>{ if(!e.shiftKey||_geo.fix) return; e.preventDefault(); e.stopPropagation(); _geo.rot=Math.max(-180,Math.min(180,Math.round((_geo.rot+(e.deltaY<0?1:-1)*(e.ctrlKey?0.2:1))*10)/10)); geoDesenha(); },{capture:true,passive:false});
  map.on('moveend',()=>geoLinks());
  geoDesenha(); geoAplicaOp(); geoLinks();
  if(!novo) map.fitBounds(L.latLngBounds(lp.flatMap(p=>p.getLatLngs()[0])).pad(.3));
}
function geoAplicaOp(){ const m=_gm; if(!m) return; [m.sat,m.nom,m.rua].forEach(t=>t.setOpacity(_geo.opS/100)); }
function geoBase(v){ const m=_gm; if(!m) return; _geo.base=v; [m.sat,m.nom,m.rua].forEach(t=>{ if(m.map.hasLayer(t)) m.map.removeLayer(t); });
  if(v==='rua') m.rua.addTo(m.map); else { m.sat.addTo(m.map); if(v==='hib') m.nom.addTo(m.map); } [m.sat,m.nom,m.rua].forEach(t=>{ if(t.bringToBack) t.bringToBack(); }); geoAplicaOp(); }
function geoSet(k,v){ _geo[k]=parseFloat(v)||0; if(k==='rot'&&_geo.rot>180) _geo.rot-=360; if(k==='opS') geoAplicaOp(); geoDesenha(); }
function geoModo(v,sem){ _geo.modo=v; const u=v==='utm'; document.getElementById('geo-l1').textContent=u?'E (m)':'Latitude'; document.getElementById('geo-l2').textContent=u?'N (m)':'Longitude'; document.getElementById('geo-zl').style.display=u?'':'none'; geoCampos(); }
function geoCoord(){ const q=id=>document.getElementById(id); let lat,lng;
  if(_geo.modo==='utm'){ const E=geoNums(q('geo-lat').value)[0], N=geoNums(q('geo-lng').value)[0], z=parseInt(q('geo-zona').value)||24; if(!isFinite(E)||!isFinite(N)){ toast('Informe E e N.'); return; } [lat,lng]=geoDeUTM(E,N,z,true); }
  else { let a=geoNums(q('geo-lat').value), b=geoNums(q('geo-lng').value); if(a.length>=2&&!b.length) b=[a[1]]; lat=a[0]; lng=b[0]; }
  if(!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){ toast('Coordenadas inválidas.'); geoCampos(); return; }
  geoVai(lat,lng); }
function geoColar(){ const t=prompt('Cole as coordenadas (Lat, Lon em graus decimais, ex.: -22.5266, -41.9456):'); if(!t) return; const n=geoNums(t); if(n.length<2){ toast('Não achei duas coordenadas.'); return; }
  geoModo('dec'); document.getElementById('geo-modo').value='dec'; geoVai(n[0],n[1]); }
function geoVai(lat,lng,zoom){ _geo.lat=lat; _geo.lng=lng; if(_gm){ _gm.map.setView([lat,lng],zoom||Math.max(_gm.map.getZoom(),19)); geoDesenha(); } }
function geoCentro(){ if(!_gm) return; const c=_gm.map.getCenter(); _geo.lat=c.lat; _geo.lng=c.lng; geoDesenha(); }
function geoLinks(){ const a=document.getElementById('geo-gm'); if(a&&_geo.lat!=null) a.href='https://www.google.com/maps/@'+_geo.lat.toFixed(6)+','+_geo.lng.toFixed(6)+',19z/data=!3m1!1e3'; }
async function geoBusca(){ const q=(document.getElementById('geo-q').value||'').trim(), box=document.getElementById('geo-res'); if(!q) return;
  const n=geoNums(q); if(n.length===2&&/^[\s\-\d.,;]+$/.test(q)){ geoVai(n[0],n[1]); return; }
  box.innerHTML='<i>buscando…</i>';
  try{ const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&accept-language=pt-BR&q='+encodeURIComponent(q)); const j=await r.json();
    if(!j.length){ box.innerHTML='<i>nada encontrado — tente cidade + rua</i>'; return; }
    box.innerHTML='<div style="position:absolute;z-index:10000;top:24px;right:0;width:360px;background:#fff;color:#111;border:1px solid #888;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.3)">'+j.map((x,i)=>'<div style="padding:6px 8px;cursor:pointer;border-bottom:1px solid #eee" onclick="geoEscolhe('+(+x.lat)+','+(+x.lon)+')">'+String(x.display_name).replace(/</g,'&lt;')+'</div>').join('')+'</div>';
  }catch(e){ box.innerHTML='<i>falha na pesquisa (sem internet?)</i>'; } }
function geoEscolhe(lat,lng){ document.getElementById('geo-res').innerHTML=''; geoVai(lat,lng,18); }
function geoKml(){ if(!_gm||_geo.lat==null) return; const f=pt=>{ const c=geoLL(pt); return c[1].toFixed(8)+','+c[0].toFixed(8)+',0'; };
  const pm=(n,ring,est)=>'<Placemark><name>'+n+'</name><styleUrl>#'+est+'</styleUrl><Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>'+ring.concat([ring[0]]).map(f).join(' ')+'</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>';
  const ln=(n,l)=>'<Placemark><name>'+n+'</name><styleUrl>#eixo</styleUrl><LineString><tessellate>1</tessellate><coordinates>'+l.map(f).join(' ')+'</coordinates></LineString></Placemark>';
  const G=_gm.pts, kml='<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Pavimento flexível</name>'
   +'<Style id="pista"><LineStyle><color>ffffffff</color><width>2</width></LineStyle><PolyStyle><color>88555555</color></PolyStyle></Style><Style id="mf"><LineStyle><color>ff4ad2ff</color></LineStyle><PolyStyle><fill>0</fill></PolyStyle></Style><Style id="eixo"><LineStyle><color>ff343bff</color><width>2</width></LineStyle></Style>'
   +G.pistas.map((r,i)=>pm('Pista '+(i+1),r,'pista')).join('')+G.mfs.map((r,i)=>pm('Meio-fio '+(i+1),r,'mf')).join('')+G.eixos.map((l,i)=>ln('Eixo '+(i+1),l)).join('')+'</Document></kml>';
  triggerDownload(new Blob([kml],{type:'application/vnd.google-earth.kml+xml'}),'pavimento_georef_'+carimbo()+'.kml'); }
function geoFechar(salvar){ geoSalvaLocal(); const ov=document.getElementById('geo-modal'); if(_gm){ try{ _gm.map.remove(); }catch(e){} _gm=null; } if(ov) ov.remove(); if(salvar) toast('Posição salva no projeto (use “Salvar projeto” para gravar no arquivo).'); }

/* PATCH PI-17 (13/11/2026) · GEORREFERENCIAR NA MESMA JANELA DA PLANTA BAIXA E DO 3D, COM PISTA, MEIO-FIO E CALÇADA REALISTAS.
   (1) O botão 🛰 Georreferenciar deixa de abrir uma janela flutuante: vira o 3º modo da aba (🗺 Planta baixa · 🧊 Ver em 3D · 🛰 Georreferenciar), na mesma área.
   (2) Tipo de mapa como no Google Maps: Satélite e Mapa (com miniaturas) + caixinha de rótulos (nomes de ruas) sobre o satélite.
   (3) Aparência “Realista”: pista (com paginação dos blocos quando o zoom permite), sarjeta e meio-fio e CALÇADA preenchidos, de uma extremidade da calçada
       até a extremidade da calçada do outro lado, sem muros, casas ou entorno. “Só linhas” mantém o desenho técnico anterior.
   Só desenho/posição: nenhum cálculo muda. Estado em _geo (vis, pag salvos no projeto junto com a posição). */
(function(){
  const st=document.createElement('style');
  st.textContent='#pl-geowrap{display:none;position:relative;flex-direction:column;height:780px;border:1px solid var(--border,#ddd);border-radius:6px;overflow:hidden;background:var(--bg,#fff);color:var(--fg,#111);font-size:13px}'
   +'@media (max-width:700px){#pl-geowrap{height:88vh!important}}'
   +'#geo-tipo button{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;padding:3px 0;cursor:pointer;font:13px Arial,Helvetica,sans-serif;color:#3c4043;text-align:left}'
   +'#geo-tipo .th{width:52px;height:52px;border-radius:8px;border:2px solid #ddd;background-size:cover;background-position:center;flex:none}'
   +'#geo-tipo button.on .th{border-color:#1a73e8}#geo-tipo button.on{color:#1a73e8;font-weight:600}';
  document.head.appendChild(st);
  const w3=document.getElementById('pl-3dwrap');
  if(w3&&!document.getElementById('pl-geowrap')){ const g=document.createElement('div'); g.id='pl-geowrap'; w3.after(g); }
})();

/* ── geometria: agora também sarjeta/meio-fio em faixas e calçada (cada lado) ── */
function geoPontos(){
  const D=plDados(), P=secaoParams(), w=plMfLarg(P), sb=(P.mf&&P.mf.tipo==='conjugado')?(+P.mf.sbase||0)/100:0, v=plVis();
  const pistas=[], mfs=[], eixos=[], cals=[], mfr=[], dirs=[], cdirs=[]; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  D.forEach(d=>{ const A=plAmostras(d,2); if(A.length<2) return;
    const pi=plPoligono(d,A,0), mf=plPoligono(d,A,w); pistas.push(pi); if(w>0) mfs.push(mf); eixos.push(A.map(s=>s.c)); dirs.push(Math.atan2(d.lay.d[1],d.lay.d[0]));
    [1,-1].forEach(sg=>{
      if(w>0&&v.mf!==0){ const ring=(u0,u1)=>A.map(q=>plOff(d,q,sg*(q.b+u0))).concat(A.slice().reverse().map(q=>plOff(d,q,sg*(q.b+u1))));
        if(sb>0) mfr.push({p:ring(0,sb),s:1}); mfr.push({p:ring(sb,w),s:0}); }
      if(_cal.ativo&&v.calcada!==0&&A.some(q=>(sg>0?q.calE:q.calD)>0.01)) { cals.push(plFaixaCal(d,A,sg,w)); cdirs.push(dirs.length-1); }
    });
    mf.forEach(q=>{ x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]); }); });
  if(x0>x1) return null; return {pistas,mfs,eixos,cals,mfr,dirs,cdirs,cx:(x0+x1)/2,cy:(y0+y1)/2,raio:Math.hypot(x1-x0,y1-y0)/2};
}

/* ── PI-18: cor do sol (mesmo seletor Sol do 3D), mistura de cores ── */
function geoMix(hex,tint,k){ const q=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)), a=q(hex), b=q(tint);
  return '#'+a.map((v,i)=>Math.round(v*(1-k)+b[i]*k).toString(16).padStart(2,'0')).join(''); }
const GEO_TINT={manha:.16,dia:.05,tarde:.12,por:.3};
function geoCor(hex){ const k=plHoraK(); return geoMix(hex,PL_HORAS[k].sol,GEO_TINT[k]||.1); }

/* ── estilos por aparência (Realista × Técnico), níveis ligados e Sol ── */
function geoEstilos(){
  const m=_gm; if(!m) return; const real=(_geo.vis||'real')==='real', o=_geo.opD/100, fo=Math.min(.97,o), v=plVis(),
    key=[real,_geo.opD,_cal.tipo,_cal.ativo,plQualK(),plHoraK(),v.pista,v.eixo,v.mf,v.calcada].join('|');
  if(m.stKey===key) return; m.stKey=key;
  const calCor=geoCor(_cal.tipo==='intertravado'?'#d8c3a2':'#d6d4cd'), oculta={stroke:false,fill:false}, pOn=v.pista!==0, eOn=v.eixo!==0, mOn=v.mf!==0;
  if(real){
    (m.lc||[]).forEach(p=>p.setStyle({stroke:true,fill:true,color:'#8a867c',weight:.6,opacity:o,fillColor:calCor,fillOpacity:fo}));
    (m.lf||[]).forEach((p,i)=>{ const sj=m.pts.mfr[i]&&m.pts.mfr[i].s; p.setStyle({stroke:true,fill:true,color:sj?'#80858d':'#5b616b',weight:sj?.6:.8,opacity:o,fillColor:geoCor(sj?'#c9ccd1':'#b4b8bf'),fillOpacity:fo}); });
    m.lp.forEach(p=>p.setStyle(pOn?{stroke:true,fill:true,color:'#f2f0ea',weight:1,opacity:o,fillColor:geoCor('#56585c'),fillOpacity:fo,dashArray:null}:oculta));
    m.lm.forEach(p=>p.setStyle(oculta));
    m.le.forEach(p=>p.setStyle({color:'#f5d442',weight:1.2,opacity:eOn?o:0,dashArray:'8 5'}));
  } else {
    (m.lc||[]).forEach(p=>p.setStyle(oculta)); (m.lf||[]).forEach(p=>p.setStyle(oculta));
    m.lp.forEach(p=>p.setStyle(pOn?{stroke:true,fill:true,color:'#ffffff',weight:1.5,opacity:o,fillColor:'#555',fillOpacity:Math.min(.85,o),dashArray:null}:oculta));
    m.lm.forEach(p=>p.setStyle(mOn?{stroke:true,fill:false,color:'#ffd24a',weight:1,opacity:o,dashArray:'4 3'}:oculta));
    m.le.forEach(p=>p.setStyle({color:'#ff3b30',weight:1.5,opacity:eOn?o:0,dashArray:'8 5'}));
  }
  geoPadrao();
}
/* padrão SVG (blocos 20×10 cm ou placas de 1 m) na escala real */
function geoPat(defs,id,rot,tipo,t,fill,linha){
  const NS='http://www.w3.org/2000/svg'; let pt=defs.querySelector('#'+id);
  if(!pt){ pt=document.createElementNS(NS,'pattern'); pt.setAttribute('id',id); pt.setAttribute('patternUnits','userSpaceOnUse'); defs.appendChild(pt); }
  pt.setAttribute('patternTransform','rotate('+rot.toFixed(2)+')');
  const ts=t.toFixed(2), sig=ts+tipo+fill+linha; if(pt.getAttribute('data-t')===sig) return; pt.setAttribute('data-t',sig); pt.setAttribute('width',ts); pt.setAttribute('height',ts);
  let h='<rect width="'+ts+'" height="'+ts+'" fill="'+fill+'"/>';
  if(tipo==='bloco'){ const r=t/4, bl=t/2, sw=Math.max(.5,Math.min(1,.12*r)).toFixed(2);
    for(let q=0;q<4;q++){ const off=(q%2)?bl/2:0; for(let c=-1;c<3;c++) h+='<rect x="'+(c*bl+off).toFixed(2)+'" y="'+(q*r).toFixed(2)+'" width="'+bl.toFixed(2)+'" height="'+r.toFixed(2)+'" fill="none" stroke="'+linha+'" stroke-width="'+sw+'"/>'; } }
  else h+='<path d="M0 0H'+ts+'M0 0V'+ts+'" fill="none" stroke="'+linha+'" stroke-width="'+Math.max(.5,Math.min(1.2,t/40)).toFixed(2)+'"/>';
  pt.innerHTML=h;
}
/* Qualidade (mesmo seletor do 3D): Baixa = cores chapadas · Média = blocos da pista · Alta = + sombra projetada do meio-fio/calçada pelo Sol · Ultra = + juntas/blocos da calçada e blocos já em zoom menor */
function geoPadrao(){
  const m=_gm; if(!m||_geo.lat==null||!m.lp.length) return; const rd=m.lp[0]._renderer; if(!rd||!rd._container) return;
  const real=(_geo.vis||'real')==='real', q=plQualK(), NS='http://www.w3.org/2000/svg', svg=rd._container, kz=_geo.esc/100;
  let defs=svg.querySelector('#geodefs'); if(!defs){ defs=document.createElementNS(NS,'defs'); defs.setAttribute('id','geodefs'); svg.insertBefore(defs,svg.firstChild); }
  const res=40075016.686*Math.cos(_geo.lat*Math.PI/180)/(256*Math.pow(2,m.map.getZoom())), tB=0.4*kz/res, tP=1.0*kz/res, minT={baixa:1e9,media:4,alta:3,ultra:2}[q]||4,
    usar=false, rot=i=>-((m.pts.dirs[i]||0)*180/Math.PI+_geo.rot);
  m.lp.forEach((pl,i)=>{ const p=pl._path; if(!p) return;
    if(!usar){ p.setAttribute('fill',pl.options.fillColor||'#555'); return; }
    geoPat(defs,'geopat'+i,rot(i),'bloco',tB,geoCor('#aaa69c'),geoCor('#8c887e')); p.setAttribute('fill','url(#geopat'+i+')'); });
  const calP=real&&q==='ultra'&&_geo.pag!==false&&(_cal.tipo==='intertravado'?tB>=minT:tP>=6);
  (m.lc||[]).forEach((pl,i)=>{ const p=pl._path; if(!p) return; const base=pl.options.fillColor||'#d6d4cd';
    if(!calP){ p.setAttribute('fill',base); return; }
    const di=(m.pts.cdirs&&m.pts.cdirs[i])||0, r=-((m.pts.dirs[di]||0)*180/Math.PI+_geo.rot), id='geocal'+i;
    geoPat(defs,id,r,_cal.tipo==='intertravado'?'bloco':'placa',_cal.tipo==='intertravado'?tB:tP,base,geoMix(base,'#000000',.22)); p.setAttribute('fill','url(#'+id+')'); });
  /* sombra projetada: altura ~0,18 m, direção oposta ao Sol (azimute do seletor Sol, norte para cima) */
  const sh=real&&(q==='alta'||q==='ultra'), H=PL_HORAS[plHoraK()];
  if(sh){ const az=H.az*Math.PI/180, d=Math.min(14,Math.max(1.2,0.18/Math.tan(H.el*Math.PI/180)/res)), dx=(-Math.sin(az)*d).toFixed(2), dy=(Math.cos(az)*d).toFixed(2), sig=dx+'|'+dy+'|'+q;
    let f=defs.querySelector('#geosh'); if(!f){ f=document.createElementNS(NS,'filter'); f.setAttribute('id','geosh'); f.setAttribute('x','-15%'); f.setAttribute('y','-15%'); f.setAttribute('width','130%'); f.setAttribute('height','130%'); defs.appendChild(f); }
    if(f.getAttribute('data-s')!==sig){ f.setAttribute('data-s',sig); f.innerHTML='<feGaussianBlur in="SourceAlpha" stdDeviation="'+(d*.45).toFixed(2)+'" result="b"/><feOffset in="b" dx="'+dx+'" dy="'+dy+'" result="o"/><feComponentTransfer in="o" result="s"><feFuncA type="linear" slope="'+(q==='ultra'?.6:.45)+'"/></feComponentTransfer><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>'; } }
  (m.lf||[]).concat(m.lc||[]).forEach(pl=>{ const p=pl._path; if(!p) return; if(sh) p.setAttribute('filter','url(#geosh)'); else p.removeAttribute('filter'); });
}
function geoDesenha(){
  const m=_gm; if(!m||_geo.lat==null) return; const G=m.pts;
  const set=(arr,lst)=>lst.forEach((pl,i)=>{ if(arr[i]) pl.setLatLngs(arr[i].map(geoLL)); });
  set(G.pistas,m.lp); set(G.mfs,m.lm); set(G.eixos,m.le);
  (m.lc||[]).forEach((pl,i)=>{ if(G.cals[i]) pl.setLatLngs(G.cals[i].map(geoLL)); });
  (m.lf||[]).forEach((pl,i)=>{ if(G.mfr[i]) pl.setLatLngs(G.mfr[i].p.map(geoLL)); });
  geoEstilos(); geoPadrao();
  const c=[_geo.lat,_geo.lng]; m.mk.setLatLng(c);
  const res=40075016.686*Math.cos(c[0]*Math.PI/180)/(256*Math.pow(2,m.map.getZoom())), R=Math.min(G.raio*_geo.esc/100*1.15+8,130*res), th=_geo.rot*Math.PI/180; /* PF-GEO: ponto de girar a ~130 px do centro (sempre na tela) e no sentido do 'para cima' do desenho */ m.mr.setLatLng([c[0]+R*Math.cos(th)/GEO_M, c[1]-R*Math.sin(th)/(GEO_M*Math.cos(c[0]*Math.PI/180))]);
  m.lh.setLatLngs([c,m.mr.getLatLng()]);
  geoCampos();
}

/* ── camadas novas criadas junto com o mapa ── */
(function(){
  const ini=geoIniciar;
  geoIniciar=function(pts){ ini.apply(this,arguments); const m=_gm; if(!m) return; const L=window.L, op={interactive:false,bubblingMouseEvents:false};
    m.lc=pts.cals.map(()=>L.polygon([[0,0]],Object.assign({weight:.6},op)).addTo(m.map));
    m.lf=pts.mfr.map(()=>L.polygon([[0,0]],Object.assign({weight:.8},op)).addTo(m.map));
    m.lf.forEach(x=>x.bringToBack()); m.lc.forEach(x=>x.bringToBack());      /* ordem: calçada, meio-fio, pista, eixo */
    m.stKey=''; geoDesenha(); m.map.on('zoomend',geoDesenha); geoGuia();
    if(_gv){ m.map.setView(_gv.c,_gv.z); _gv=null; }
    const info=document.getElementById('geo-info'); if(info){ const av=document.createElement('div'); av.id='geo-aviso'; av.style.cssText='font-size:12px;padding:3px 10px;background:#fff8e6;color:#4a3500'; info.after(av); geoAviso(); }
    setTimeout(()=>{ try{ m.map.invalidateSize(); }catch(e){} },60);
  };
  const gb=geoBase; geoBase=function(v){ gb.apply(this,arguments); geoTipoUI(); };
})();
let _gv=null;
function geoAviso(){ const el=document.getElementById('geo-aviso'); if(!el) return; el.style.display='none'; return;
  if(!_cal.ativo){ el.innerHTML='ℹ <b>Calçada não ativada</b>: sem ela só aparecem pista e meio-fio. Em Topografia › <b>🚶 Calçada…</b> escolha o tipo e a largura (ou lance as cotas de muro) para a calçada ir de uma extremidade à outra, nos dois lados. <button class="tb-btn" onclick="irTopografia();setTimeout(abrirCalcada,250)">Abrir Calçada…</button>'; el.style.display=''; }
  else el.style.display='none'; }

/* ── tipo de mapa (como no Google Maps): Satélite · Mapa ── */
function geoTipoUI(){ const t=document.getElementById('geo-tipo'); if(!t) return; const rua=_geo.base==='rua';
  t.querySelector('[data-t="sat"]').classList.toggle('on',!rua); t.querySelector('[data-t="rua"]').classList.toggle('on',rua);
  const ck=document.getElementById('geo-rotulos'); if(ck){ ck.checked=_geo.base==='hib'; ck.disabled=rua; }
  const s=document.getElementById('geo-base'); if(s) s.value=_geo.base||'sat'; }
function geoTipo(t){ if(t==='rua') geoBase('rua'); else geoBase(document.getElementById('geo-rotulos')&&document.getElementById('geo-rotulos').checked?'hib':'sat'); }
function geoRotulos(on){ if(_geo.base!=='rua') geoBase(on?'hib':'sat'); }
function geoVis(v){ _geo.vis=v; geoSalvaLocal(); if(_gm){ _gm.stKey=''; geoDesenha(); } geoUIsync(); }
function geoPag(on){ _geo.pag=!!on; geoSalvaLocal(); geoPadrao(); }
/* PI-18: níveis (mesmas chaves da Planta e do 3D), Qualidade e Sol (mesmos seletores do 3D, lembrados em pint_3d_qual / pint_3d_hora) */
function geoNiv(k,on){ const v=plVis(); v[k]=on?1:0; plSalvarVis(); if(!_gm) return; if(k==='mf'||k==='calcada') geoRefaz(); else { _gm.stKey=''; geoDesenha(); } }
function geoQual(k){ try{ localStorage.setItem('pint_3d_qual',k); }catch(e){} if(_gm){ _gm.stKey=''; geoDesenha(); } }
function geoHora(k){ try{ localStorage.setItem('pint_3d_hora',k); }catch(e){} if(_gm){ _gm.stKey=''; geoDesenha(); } }
function geoUIsync(){ const q=id=>document.getElementById(id), real=(_geo.vis||'real')==='real', v=plVis();
  [['geo-b-real',real],['geo-b-tec',!real]].forEach(([id,on])=>{ const b=q(id); if(b) b.classList.toggle('tb-btn-save',on); });
  [['geo-n-pista','pista'],['geo-n-mf','mf'],['geo-n-calcada','calcada'],['geo-n-eixo','eixo']].forEach(([id,k])=>{ const c=q(id); if(c) c.checked=v[k]!==0; });
  const pg=q('geo-pag'); if(pg){ pg.checked=_geo.pag!==false; pg.disabled=!real; }
  const sq=q('geo-qual'), sh=q('geo-hora'); if(sq){ sq.value=plQualK(); sq.disabled=!real; } if(sh){ sh.value=plHoraK(); sh.disabled=!real; }
  const kb=q('geo-b-kmz'); if(kb) kb.textContent='⬇ KMZ '+(real?'realista':'técnico'); }
/* posição salva: tira a linha e as duas bolinhas (mover/girar); “Reposicionar” traz de volta */
function geoGuia(){ const m=_gm; if(!m) return; const fix=!!_geo.fix;
  [m.mk,m.mr,m.lh].forEach(x=>{ if(fix){ if(m.map.hasLayer(x)) m.map.removeLayer(x); } else if(!m.map.hasLayer(x)) x.addTo(m.map); });
  const b=document.getElementById('geo-bsalvar'); if(b){ b.textContent=fix?'✎ Reposicionar':'✔ Salvar posição'; b.classList.toggle('tb-btn-save',!fix); }
  const d=document.getElementById('geo-dica'); if(d) d.textContent=fix?'Posição salva: a linha e as bolinhas de mover/girar foram retiradas do desenho. Clique em “✎ Reposicionar” para mexer de novo (as caixas de coordenadas, giro e escala continuam valendo).'
    :'Arraste o desenho (ou o ponto central ●) para mover · arraste o ponto ◎ para girar · Shift + roda do mouse gira · roda sem Shift dá zoom no mapa. Ao terminar, clique em “✔ Salvar posição”.';
  const el=document.getElementById('geo-map'); if(el) el.style.cursor=''; }
function geoSalvaOuEdita(){ if(_geo.fix){ _geo.fix=false; geoSalvaLocal(); geoGuia(); } else geoFechar(true); }

/* ── montagem dentro da aba (no lugar da janela flutuante) ── */
geoAbrir=function(){ plModo('geo'); };
function geoDestruir(){ if(_gm){ try{ _gm.map.remove(); }catch(e){} _gm=null; } const b=document.getElementById('pl-geowrap'); if(b) b.innerHTML=''; }
function geoMontar(){
  const box=document.getElementById('pl-geowrap'); if(!box) return;
  if(_gm) { setTimeout(()=>{ try{ _gm.map.invalidateSize(); }catch(e){} },60); return; }
  let pts=null; try{ pts=geoPontos(); }catch(e){ pts=null; }
  if(!resultado||!pts){ box.innerHTML='<div style="padding:30px;color:var(--fg2)">Preencha a Topografia (estacas com greide e largura) e calcule o dimensionamento para ter um desenho a posicionar.</div>'; return; }
  const a=geoAuto(pts); _geo._aviso=a?a:null;
  const T1='https://tile.openstreetmap.org/11/785/1155.png', T2='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/11/1155/785';
  box.innerHTML=
   '<div style="padding:8px 10px;border-bottom:1px solid #ccc;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>🛰 Georreferenciar</b>'
  +'<input id="geo-q" placeholder="Pesquisar rua, bairro, cidade…" style="flex:1;min-width:180px;padding:5px" onkeydown="if(event.key===\'Enter\')geoBusca()"><button class="tb-btn" onclick="geoBusca()">🔍 Pesquisar</button>'
  +'<span id="geo-res" style="position:relative"></span></div>'
  +'<div style="padding:6px 10px;border-bottom:1px solid #ddd;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
  +'<select id="geo-modo" onchange="geoModo(this.value)"><option value="dec">Lat / Lon (graus)</option><option value="utm">UTM (E / N)</option></select>'
  +'<label><span id="geo-l1">Latitude</span> <input id="geo-lat" style="width:110px" onchange="geoCoord()"></label>'
  +'<label><span id="geo-l2">Longitude</span> <input id="geo-lng" style="width:110px" onchange="geoCoord()"></label>'
  +'<label id="geo-zl" style="display:none">Zona <input id="geo-zona" type="number" value="24" style="width:50px" onchange="geoCoord()"> S</label>'
  +'<button class="tb-btn" onclick="geoCentro()" title="Coloca o desenho no centro do mapa que você está vendo">📍 Posicionar no centro do mapa</button>'
  +'<button class="tb-btn" onclick="geoColar()" title="Cole coordenadas copiadas do Google Maps/Earth (ex.: -22.5266, -41.9456)">📋 Colar coordenadas</button></div>'
  +'<div style="padding:6px 10px;border-bottom:1px solid #ddd;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
  +'<label>Giro <input id="geo-rot" type="range" min="-180" max="180" step="0.5" style="vertical-align:middle;width:130px" oninput="geoSet(\'rot\',this.value)"> <input id="geo-rot-n" type="number" step="0.5" style="width:62px" onchange="geoSet(\'rot\',this.value)">°</label>'
  +'<label>Escala <input id="geo-esc" type="range" min="50" max="150" step="0.5" style="vertical-align:middle;width:90px" oninput="geoSet(\'esc\',this.value)">%</label>'
  +'<label title="Transparência do desenho sobre a imagem">Desenho <input id="geo-od" type="range" min="10" max="100" style="vertical-align:middle;width:80px" oninput="geoSet(\'opD\',this.value)"></label>'
  +'<label>Imagem <input id="geo-os" type="range" min="20" max="100" style="vertical-align:middle;width:80px" oninput="geoSet(\'opS\',this.value)"></label>'
  +'<select id="geo-base" style="display:none" onchange="geoBase(this.value)"><option value="sat">Satélite</option><option value="hib">Satélite + nomes</option><option value="rua">Mapa de ruas</option></select>'
  +'<a class="tb-btn" id="geo-gm" target="_blank" rel="noopener" style="text-decoration:none">↗ Abrir no Google Maps</a>'
  +'<button class="tb-btn tb-btn-save" id="geo-bsalvar" onclick="geoSalvaOuEdita()">✔ Salvar posição</button></div>'
  +'<div style="padding:6px 10px;border-bottom:1px solid #b6d4f2;background:#eef6ff;color:#1b2a3a;display:flex;gap:10px;align-items:center;flex-wrap:wrap" id="geo-aparencia">'
  +'<b>Aparência</b><span style="display:inline-flex;gap:0"><button type="button" class="tb-btn" id="geo-b-real" onclick="geoVis(\'real\')" title="Pista, sarjeta/meio-fio e calçada preenchidos sobre o mapa, sem muros, casas ou entorno">🏗 Realista</button><button type="button" class="tb-btn" id="geo-b-tec" onclick="geoVis(\'linhas\')" title="Desenho técnico: contornos e eixo">📐 Técnico</button></span>'
  +'<span style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-weight:600">Níveis:</b>'
  +'<label><input type="checkbox" id="geo-n-pista" onchange="geoNiv(\'pista\',this.checked)"> Pista</label><label><input type="checkbox" id="geo-n-mf" onchange="geoNiv(\'mf\',this.checked)"> Meio-fio e sarjeta</label>'
  +'<label><input type="checkbox" id="geo-n-calcada" onchange="geoNiv(\'calcada\',this.checked)"> Calçada</label><label><input type="checkbox" id="geo-n-eixo" onchange="geoNiv(\'eixo\',this.checked)"> Eixo</label>'
  +'</span>'
  +'<label>Qualidade <select id="geo-qual" onchange="geoQual(this.value)" title="Baixa: cores chapadas · Média: blocos · Alta: + sombra do Sol · Ultra: + juntas da calçada e blocos em zoom menor"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="ultra">Ultra</option></select></label>'
  +'<label>Sol <select id="geo-hora" onchange="geoHora(this.value)" title="Cor da luz e direção da sombra (norte para cima)"><option value="manha">Manhã</option><option value="dia">Meio-dia</option><option value="tarde">Tarde</option><option value="por">Fim de tarde</option></select></label>'
  +'<button class="tb-btn" id="geo-b-kmz" onclick="geoKmz()" title="Baixa o KMZ para o Google Earth, na aparência escolhida ao lado (Realista ou Técnico)">⬇ KMZ</button>'
  +'<a href="#" style="font-size:12px" onclick="geoKml();return false" title="O mesmo desenho em KML simples">KML</a></div>'
  +'<div id="geo-dica" style="font-size:11.5px;color:#666;padding:3px 10px"></div>'
  +'<div id="geo-map" style="flex:1;min-height:300px"></div>'
  +'<div id="geo-tipo" style="position:absolute;left:10px;bottom:26px;z-index:1000;background:#fff;color:#3c4043;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.45);padding:8px 12px;min-width:132px">'
  +'<div style="font-size:12px;color:#5f6368;margin-bottom:4px">Tipo</div>'
  +'<button type="button" data-t="sat" onclick="geoTipo(\'sat\')"><span class="th" style="background-color:#3b5d3a;background-image:url('+T2+')"></span><span>Satélite</span></button>'
  +'<button type="button" data-t="rua" onclick="geoTipo(\'rua\')"><span class="th" style="background-color:#e8eef2;background-image:url('+T1+')"></span><span>Mapa</span></button>'
  +'<label style="display:flex;gap:6px;align-items:center;font-size:12px;margin-top:4px;cursor:pointer"><input type="checkbox" id="geo-rotulos" onchange="geoRotulos(this.checked)"> Rótulos (nomes)</label></div>';
  geoUIsync(); geoGuia();
  plCarregar(GEO_L+'js').then(()=>{ if(!document.getElementById('geo-css')){ const l=document.createElement('link'); l.id='geo-css'; l.rel='stylesheet'; l.href=GEO_L+'css'; document.head.appendChild(l); }
      if(_pl.modo==='geo'&&document.getElementById('geo-map')&&!_gm) geoIniciar(pts); geoTipoUI(); })
    .catch(()=>{ const e=document.getElementById('geo-map'); if(e) e.innerHTML='<div style="padding:30px">Sem conexão para carregar o mapa. Verifique a internet e tente de novo.</div>'; });
  if(!document.getElementById('geo-css')){ const l=document.createElement('link'); l.id='geo-css'; l.rel='stylesheet'; l.href=GEO_L+'css'; document.head.appendChild(l); }
}
/* refaz a geometria quando muda a topografia, as ruas ou a calçada (sem recarregar o mapa, se o nº de peças é o mesmo) */
function geoRefaz(){
  if(!_gm) return; let pts=null; try{ pts=geoPontos(); }catch(e){}
  if(!pts){ geoDestruir(); geoMontar(); return; }
  const o=_gm.pts, igual=o.pistas.length===pts.pistas.length&&o.mfs.length===pts.mfs.length&&o.eixos.length===pts.eixos.length&&o.cals.length===pts.cals.length&&o.mfr.length===pts.mfr.length;
  if(igual){ _gm.pts=pts; _gm.stKey=''; geoDesenha(); geoAviso(); try{ geoInfo(); }catch(e){} return; }
  _gv={c:_gm.map.getCenter(),z:_gm.map.getZoom()}; geoDestruir(); geoMontar();
}
function geoFechar(salvar){ if(salvar) _geo.fix=true; geoSalvaLocal(); if(salvar){ geoGuia(); toast('Posição salva no projeto (use “Salvar projeto” para gravar no arquivo).'); } }

/* KML/KMZ: Realista (calçada, sarjeta, meio-fio e pista preenchidos, com a cor do Sol) ou Técnico (contornos e eixo) */
function geoKmlTexto(){ const G=_gm.pts, real=(_geo.vis||'real')==='real', v=plVis();
  const f=pt=>{ const c=geoLL(pt); return c[1].toFixed(8)+','+c[0].toFixed(8)+',0'; };
  const kc=(hex,a)=>{ const h=hex.replace('#',''); return (a||'ff')+h.slice(4,6)+h.slice(2,4)+h.slice(0,2); };
  const pm=(n,ring,est)=>'<Placemark><name>'+n+'</name><styleUrl>#'+est+'</styleUrl><Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>'+ring.concat([ring[0]]).map(f).join(' ')+'</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>';
  const ln=(n,l,est)=>'<Placemark><name>'+n+'</name><styleUrl>#'+est+'</styleUrl><LineString><tessellate>1</tessellate><coordinates>'+l.map(f).join(' ')+'</coordinates></LineString></Placemark>';
  const sty=(id,lc,lw,fc)=>'<Style id="'+id+'"><LineStyle><color>'+lc+'</color><width>'+lw+'</width></LineStyle>'+(fc?'<PolyStyle><color>'+fc+'</color></PolyStyle>':'<PolyStyle><fill>0</fill></PolyStyle>')+'</Style>';
  const cab='<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Pavimento flexível ('+(real?'realista':'técnico')+')</name>';
  const eixos=v.eixo!==0?G.eixos:[], pistas=v.pista!==0?G.pistas:[];
  if(real){ const cc=geoCor(_cal.tipo==='intertravado'?'#d8c3a2':'#d6d4cd');
    return cab+sty('cal',kc('#8a867c'),1,kc(cc,'d9'))+sty('sj',kc('#80858d'),1,kc(geoCor('#c9ccd1'),'d9'))+sty('mf',kc('#5b616b'),1,kc(geoCor('#b4b8bf'),'d9'))
     +sty('pista',kc('#f2f0ea'),2,kc(geoCor('#56585c'),'d9'))+'<Style id="eixo"><LineStyle><color>'+kc('#f5d442')+'</color><width>2</width></LineStyle></Style>'
     +G.cals.map((r,i)=>pm('Calçada '+(i+1),r,'cal')).join('')+G.mfr.map((r,i)=>pm((r.s?'Sarjeta ':'Meio-fio ')+(i+1),r.p,r.s?'sj':'mf')).join('')
     +pistas.map((r,i)=>pm('Pista '+(i+1),r,'pista')).join('')+eixos.map((l,i)=>ln('Eixo '+(i+1),l,'eixo')).join('')+'</Document></kml>'; }
  return cab+sty('pista',kc('#ffffff'),2,kc('#555555','88'))+sty('mf',kc('#ffd24a'),1,null)+'<Style id="eixo"><LineStyle><color>'+kc('#ff3b30')+'</color><width>2</width></LineStyle></Style>'
   +pistas.map((r,i)=>pm('Pista '+(i+1),r,'pista')).join('')+(v.mf!==0?G.mfs.map((r,i)=>pm('Meio-fio '+(i+1),r,'mf')).join(''):'')+eixos.map((l,i)=>ln('Eixo '+(i+1),l,'eixo')).join('')+'</Document></kml>'; }
function geoKml(){ if(!_gm||_geo.lat==null) return; triggerDownload(new Blob([geoKmlTexto()],{type:'application/vnd.google-earth.kml+xml'}),'pavimento_georef_'+((_geo.vis||'real')==='real'?'realista':'tecnico')+'_'+carimbo()+'.kml'); }
/* KMZ = ZIP com o doc.kml (sem compressão; escritor próprio, sem biblioteca) */
function geoCrc(u){ if(!geoCrc.t){ geoCrc.t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; geoCrc.t[n]=c>>>0; } } let r=0xFFFFFFFF; for(let i=0;i<u.length;i++) r=geoCrc.t[(r^u[i])&255]^(r>>>8); return (r^0xFFFFFFFF)>>>0; }
function geoZip1(nome,texto){ const en=new TextEncoder(), nm=en.encode(nome), d=en.encode(texto), crc=geoCrc(d), n=nm.length, sz=d.length;
  const lh=new DataView(new ArrayBuffer(30)); lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(12,0x21,true); lh.setUint32(14,crc,true); lh.setUint32(18,sz,true); lh.setUint32(22,sz,true); lh.setUint16(26,n,true);
  const ch=new DataView(new ArrayBuffer(46)); ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(14,0x21,true); ch.setUint32(16,crc,true); ch.setUint32(20,sz,true); ch.setUint32(24,sz,true); ch.setUint16(28,n,true);
  const ec=new DataView(new ArrayBuffer(22)); ec.setUint32(0,0x06054b50,true); ec.setUint16(8,1,true); ec.setUint16(10,1,true); ec.setUint32(12,46+n,true); ec.setUint32(16,30+n+sz,true);
  return new Blob([lh,nm,d,ch,nm,ec],{type:'application/vnd.google-earth.kmz'}); }
function geoKmz(){ if(!_gm||_geo.lat==null){ toast('Posicione o desenho no mapa antes de exportar.'); return; } triggerDownload(geoZip1('doc.kml',geoKmlTexto()),'pavimento_georef_'+((_geo.vis||'real')==='real'?'realista':'tecnico')+'_'+carimbo()+'.kmz'); }

/* ── ligação com o seletor de modos da aba ── */
(function(){
  const pm=plModo;
  plModo=function(m){
    const g=document.getElementById('pl-geowrap'), bg=document.getElementById('pl-b-geo'), bo=document.getElementById('pl-b-obj');
    if(m!=='geo'){ if(_gm||document.getElementById('geo-map')) geoDestruir(); if(g) g.style.display='none'; if(bg) bg.classList.remove('tb-btn-save'); if(bo) bo.style.display=''; return pm.apply(this,arguments); }
    _pl.modo='geo';
    ['pl-b-planta','pl-b-3d'].forEach(id=>{ const b=document.getElementById(id); if(b) b.classList.remove('tb-btn-save'); }); if(bg) bg.classList.add('tb-btn-save'); if(bo) bo.style.display='none';
    const sv=document.getElementById('pl-svgwrap'), bd=document.getElementById('pl-banda'), w3=document.getElementById('pl-3dwrap');
    if(sv) sv.style.display='none'; if(bd) bd.style.display='none'; if(w3) w3.style.display='none';
    ['pl-ev-box','pl-b-svg','pl-b-png'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display='none'; });
    if(g) g.style.display='flex'; geoMontar();
  };
  const pr=plRedesenhar; plRedesenhar=function(){ if(_pl.modo==='geo'){ geoRefaz(); return; } return pr.apply(this,arguments); };
  const pa=plAbrir; plAbrir=function(){ if(_pl.modo==='geo'){ const msg=document.getElementById('pl-msg'); if(msg) msg.textContent=''; plPainel(); if(_gm) setTimeout(()=>{ try{ _gm.map.invalidateSize(); }catch(e){} },60); else geoMontar(); return; } return pa.apply(this,arguments); };
  const au=atualizarPlantaSeAberta; atualizarPlantaSeAberta=function(){ if(_pl.modo==='geo'){ const pn=document.getElementById('pane-planta'); if(pn&&pn.classList.contains('active')&&resultado){ plPainel(); if(_gm) geoRefaz(); else geoMontar(); } return; } return au.apply(this,arguments); };
  const en=pl3DEnquadrar; pl3DEnquadrar=function(){ if(_pl.modo==='geo'){ if(_gm&&_gm.lp.length&&_geo.lat!=null) _gm.map.fitBounds(window.L.latLngBounds(_gm.lp.flatMap(p=>p.getLatLngs()[0])).pad(.3)); return; } return en.apply(this,arguments); };
  const zm=plZoom; plZoom=function(f){ if(_pl.modo==='geo'){ if(_gm) (f<1?_gm.map.zoomIn():_gm.map.zoomOut()); return; } return zm.apply(this,arguments); };
  const ap=aplicarProjeto; aplicarProjeto=function(){ const r=ap.apply(this,arguments); if(_pl.modo==='geo'&&_gm){ geoDestruir(); geoMontar(); } return r; };
})();


/* coordenadas das estacas (tabela, CSV e KML) pela posição do 🛰 Georreferenciar; sem ela, pelos dados antigos (2 pontos) */
(function(){ const tf0=plGeoTf; plGeoTf=function(){
  if(_geo.lat==null) return tf0.apply(this,arguments);
  const D=plDados(), d0=D.find(x=>x.id==='r0')||D[0]; if(!d0) return null; let pts=null; try{ pts=geoPontos(); }catch(e){} if(!pts) return null;
  const z=+((_plT.geo&&_plT.geo.zona)||24)||24, k=_geo.esc/100, th=_geo.rot*Math.PI/180;
  const f=p=>{ const dx=(p[0]-pts.cx)*k, dy=(p[1]-pts.cy)*k, e=dx*Math.cos(th)-dy*Math.sin(th), n=dx*Math.sin(th)+dy*Math.cos(th), lat=_geo.lat+n/GEO_M, lng=_geo.lng+e/(GEO_M*Math.cos(_geo.lat*Math.PI/180)), u=geoParaUTM(lat,lng,z); return {E:u.e,N:u.n,lat,lng}; };
  return {f,d0,rot:_geo.rot,z}; }; })();
/* painel: a locação manual fica no botão 🛰 Georreferenciar (ao lado de 🧊 Ver em 3D) */
plGeoPainel=function(tit){ const ok=_geo.lat!=null;
  return tit('Georreferenciamento')+'<div style="font-size:11px;color:var(--fg2);line-height:1.45">Use o botão <b>🛰 Georreferenciar</b> (ao lado de 🧊 Ver em 3D): pesquise o local, <b>arraste o desenho</b> sobre a imagem de satélite e <b>gire pelo ponto azul ◎</b> (ou Shift + roda do mouse). Se tiver as coordenadas, digite Lat/Lon ou UTM lá mesmo.</div>'+
   (ok?'<div style="font-size:11px;color:#15803d;margin-top:3px">✔ Desenho locado no mapa'+(_geo.fix?' (posição salva)':'')+'.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px"><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoTabela()">📍 Coordenadas das estacas</button><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px" onclick="plGeoCsv()">⬇ CSV</button></div>'
     :'<div style="font-size:11px;color:var(--fg2);margin-top:3px">Ainda não locado.</div><button type="button" class="tb-btn" style="font-size:11px;padding:2px 6px;margin-top:4px" onclick="geoAbrir()">🛰 Georreferenciar agora</button>'); };
/* projeto vindo do DWG (coordenadas UTM): o desenho já abre locado no lugar certo (zona 24 S = Macaé / Rio das Ostras), sem arrastar */
(function(){ const im=plTImportar; plTImportar=function(o){ const r=im.apply(this,arguments); if(o&&Array.isArray(o.origemUTM)) _plT.origemUTM=o.origemUTM; return r; };
  const gm=geoMontar; geoMontar=function(){
    if(_geo.lat==null&&Array.isArray(_plT.origemUTM)){ let pts=null; try{ pts=geoPontos(); }catch(e){}
      if(pts){ const z=+((_plT.geo&&_plT.geo.zona)||24)||24, ll=geoDeUTM(_plT.origemUTM[0]+pts.cx,_plT.origemUTM[1]+pts.cy,z,true); _geo.lat=ll[0]; _geo.lng=ll[1]; _geo.rot=0; _geo.esc=100; _geo.doDWG=true; } }
    return gm.apply(this,arguments); }; })();


/* ══════════════════════════════════════════════════════════════════════
   PAV-ESQ · esquinas com raio nos cruzamentos entre as ruas do BAIRRO (projeto com várias ruas)
   Para cada cruzamento dos eixos, em cada um dos quatro cantos: as duas bordas da pista (± largura/2 de cada rua)
   se encontram no canto C e uma curva circular de raio R (meio-fio) é tangente às duas. O objeto devolvido é igual
   ao das esquinas das transversais (poly, ring, hole, arc, ed, z), então a planta, o 3D, o meio-fio e o terreno usam o mesmo caminho.
   Canto onde uma das ruas não chega (rua sem saída/T) é pulado; se o raio pedido não cabe, usa 75 %, 55 % ou 40 % dele.
══════════════════════════════════════════════════════════════════════ */
var _plIdc=0;
/* pontos (pesos baricêntricos) em que um triângulo do terreno é testado: só some se TODOS estão dentro de pista/esquina */
var PAV_AMOSTRAS=(function(){ const o=[[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]]; [.25,.5,.75].forEach(t=>{ o.push([t,1-t,0],[0,t,1-t],[t,0,1-t]); }); return o; })();
function plRaioB(v){ _plT.raioBairro=Math.max(0,Math.min(30,+String(v).replace(',','.')||0)); _pl.esqB=null; _pl.amC=null; plTMudou(); }
function plCruzamentosGeo(D){
  const ls=D.map(d=>d.lay), k=_pl.crzK;
  if(k&&k.length===ls.length&&k.every((x,i)=>x===ls[i])) return _pl.crzV;
  const bb=D.map(d=>{ let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18; ((d.lay&&d.lay.P)||[]).forEach(p=>{ if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1]; }); return [x0,y0,x1,y1]; });
  const out=[];
  for(let i=0;i<D.length;i++) for(let j=i+1;j<D.length;j++){
    const a=D[i].lay, b=D[j].lay; if(!a||!b||!a.P||!b.P) continue;
    const A=bb[i], B=bb[j]; if(A[0]>B[2]+1||B[0]>A[2]+1||A[1]>B[3]+1||B[1]>A[3]+1) continue;
    const Pa=a.P, Pb=b.P, Ca=a.C, Cb=b.C;
    for(let s=0;s<Pa.length-1;s++){ const p=Pa[s], q=Pa[s+1], x0=Math.min(p[0],q[0]), x1=Math.max(p[0],q[0]), y0=Math.min(p[1],q[1]), y1=Math.max(p[1],q[1]);
      if(x1<B[0]-1||x0>B[2]+1||y1<B[1]-1||y0>B[3]+1) continue;
      for(let t=0;t<Pb.length-1;t++){ const r=Pb[t], u=Pb[t+1];
        if(Math.max(r[0],u[0])<x0||Math.min(r[0],u[0])>x1||Math.max(r[1],u[1])<y0||Math.min(r[1],u[1])>y1) continue;
        const d1x=q[0]-p[0], d1y=q[1]-p[1], d2x=u[0]-r[0], d2y=u[1]-r[1], den=d1x*d2y-d1y*d2x; if(Math.abs(den)<1e-12) continue;
        const tt=((r[0]-p[0])*d2y-(r[1]-p[1])*d2x)/den, uu=((r[0]-p[0])*d1y-(r[1]-p[1])*d1x)/den; if(tt<0||tt>1||uu<0||uu>1) continue;
        const X=[p[0]+d1x*tt,p[1]+d1y*tt];
        if(!out.some(o=>o.i===i&&o.j===j&&Math.hypot(o.X[0]-X[0],o.X[1]-X[1])<6)) out.push({i,j,X,sa:Ca[s]+tt*(Ca[s+1]-Ca[s]),sb:Cb[t]+uu*(Cb[t+1]-Cb[t])}); } }
  }
  _pl.crzK=ls; _pl.crzV=out; return out;
}
function plEsquinasBairro(D){
  const R0=_plT.raioBairro==null?6:+_plT.raioBairro; if(!(R0>0.3)||!D||D.length<2) return [];
  const P=secaoParams(), wmf=plMfLarg(P), AM=D.map(d=>plAmostras0(d,1));
  const sig=R0+'|'+wmf+'|'+D.map(d=>(d.lay._id||(d.lay._id=++_plIdc))+':'+d.L.length+':'+d.L.reduce((a,l)=>a+l.larg+l.gr*1.37+l.est*0.7,0).toFixed(3)).join(',');
  if(_pl.esqB&&_pl.esqB.sig===sig) return _pl.esqB.v;
  const out=[];
  plCruzamentosGeo(D).forEach(cr=>{
    const A=D[cr.i], B=D[cr.j], LA=A.lay, LB=B.lay, mA=AM[cr.i], mB=AM[cr.j];
    const eA=(LA.iv?LA.iv(cr.sa):cr.sa)+LA.s0, eB=(LB.iv?LB.iv(cr.sb):cr.sb)+LB.s0;
    const dA=LA.dirAt(eA), dB=LB.dirAt(eB), nA=[-dA[1],dA[0]], nB=[-dB[1],dB[0]], hbA=plMeia(mA,eA), hbB=plMeia(mB,eB);
    const rA=[A.L[0].est,A.L[A.L.length-1].est], rB=[B.L[0].est,B.L[B.L.length-1].est];
    const zA=p=>{ const r=plProj(LA,p); return plSurf(mA,r.s,r.lat); }, zB=p=>{ const r=plProj(LB,p); return plSurf(mB,r.s,r.lat); };
    [1,-1].forEach(sa=>[1,-1].forEach(sb=>{
      const C=plInter([cr.X[0]+nA[0]*sa*hbA,cr.X[1]+nA[1]*sa*hbA],dA,[cr.X[0]+nB[0]*sb*hbB,cr.X[1]+nB[1]*sb*hbB],dB); if(!C) return;
      const gA=(dA[0]*nB[0]+dA[1]*nB[1])*sb>=0?1:-1, gB=(dB[0]*nA[0]+dB[1]*nA[1])*sa>=0?1:-1;
      const u1=[dA[0]*gA,dA[1]*gA], u2=[dB[0]*gB,dB[1]*gB], cs=u1[0]*u2[0]+u1[1]*u2[1]; if(cs>0.94||cs<-0.94) return;
      const phi=Math.acos(cs); let F=null, Rr=0, pa=null, pb=null;
      for(const f of [1,0.75,0.55,0.4]){ Rr=R0*f; if(Rr<1) break; const t=Rr/Math.tan(phi/2), T1=[C[0]+u1[0]*t,C[1]+u1[1]*t], T2=[C[0]+u2[0]*t,C[1]+u2[1]*t];
        const a=plProj(LA,T1), b=plProj(LB,T2);
        if(a.s>rA[0]+0.3&&a.s<rA[1]-0.3&&b.s>rB[0]+0.3&&b.s<rB[1]-0.3){ F=plFillet(C,u1,u2,Rr); pa=a; pb=b; break; } }
      if(!F) return;
      const zT1=zA(F.T1), zT2=zB(F.T2), zC=(zA(C)+zB(C))/2;
      const zl=(arc,a,b)=>arc.map((p,i)=>arc.length>1?a+(b-a)*i/(arc.length-1):a);
      const q={d:B,dA:A,multi:1,e1:sa,k:sb,R:Rr,O:F.O,C,T1:F.T1,T2:F.T2,arc:F.arc,stT1:pa.s,stT2:pb.s,zT1,zT2,cuts:[[A.id,pa.s],[B.id,pb.s]]};
      let arc=F.arc, za=zl(F.arc,zT1,zT2), sg=0; const pp=[C].concat(arc); for(let i=0;i<pp.length;i++){ const a=pp[i], b=pp[(i+1)%pp.length]; sg+=a[0]*b[1]-b[0]*a[1]; }
      if(sg<0){ arc=arc.slice().reverse(); za=za.slice().reverse(); } /* mesmo sentido em todas as esquinas: faces do 3D para cima */
      q.arc=arc; q.poly=[C].concat(arc); q.z=[zC].concat(za); q.area=plAreaPoly(q.poly);
      { const m=arc.length-1, ini1=Math.hypot(arc[0][0]-F.T1[0],arc[0][1]-F.T1[1])<1e-6, P0=ini1?F.T1:F.T2, P1=ini1?F.T2:F.T1, z0=ini1?zA:zB, z1=ini1?zB:zA;
        const L1=Math.hypot(C[0]-P0[0],C[1]-P0[1]), L2=Math.hypot(P1[0]-C[0],P1[1]-C[1]), h=Math.max(1,Math.min(m-1,Math.round(m*L1/((L1+L2)||1))));
        q.ed=[]; for(let i=0;i<=m;i++){ let p,z; if(i<=h){ const t=i/h; p=[P0[0]+(C[0]-P0[0])*t,P0[1]+(C[1]-P0[1])*t]; z=z0(p); } else { const t=(i-h)/(m-h); p=[C[0]+(P1[0]-C[0])*t,C[1]+(P1[1]-C[1])*t]; z=z1(p); } q.ed.push([p[0],p[1],z]); }
        q.ed[0][2]=za[0]; q.ed[m][2]=za[m]; }
      if(wmf>0&&Rr>wmf+0.05){ q.arc2=arc.map(p=>{ const vx=p[0]-F.O[0], vy=p[1]-F.O[1], L=Math.hypot(vx,vy)||1; return [F.O[0]+vx/L*(Rr-wmf),F.O[1]+vy/L*(Rr-wmf)]; });
        q.ring=arc.concat(q.arc2.slice().reverse()); q.hole=[C,arc[0]].concat(q.arc2,[arc[arc.length-1]]); }
      else q.hole=q.poly;
      out.push(q);
    }));
  });
  _pl.esqB={sig,v:out}; return out;
}
