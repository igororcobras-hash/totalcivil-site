/* pavimento-cad.js — EXPORTAR DWG / DXF do Dimensionamento de Pavimentos Flexíveis (PAV-CAD, 19/11/2026)
   Mesmo método do Esgoto Sanitário (cena única → DXF texto ou DWG AutoCAD 2000 pela biblioteca acad-ts em /tc-dwg.min.js, carregada só ao exportar).
   Conteúdo do desenho (em metros, nas coordenadas UTM do projeto quando a origem é conhecida, para encaixar no DWG original):
     PAV-EIXO · PAV-PISTA (bordas) · PAV-NOME · PAV-ESTACA (a cada 20 m) · PAV-ESTACA-TEXTO · PAV-SECAO (estacas da tabela de Topografia) ·
     PAV-CRUZAMENTO · PAV-FUNDO-<camada> (fundo importado do DWG) · PAV-PERFIL-* (terreno TE/TC/TD, V 10x) · PAV-QUADRO · PAV-CARIMBO.
   Uso: PavCad.exportar('dwg'|'dxf', dadosDoProjeto(), {nome, aviso}) */
(function(root){
'use strict';
const PC={};
const r4=v=>Math.round(v*10000)/10000;
const f2=v=>(+v).toFixed(2).replace('.',','), f3=v=>(+v).toFixed(3).replace('.',',');
const nomeLay=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)||'X';
function Eixo(E){ this.E=E; this.n=E.length-1; this.cum=[0]; for(let i=0;i<this.n;i++) this.cum.push(this.cum[i]+Math.hypot(E[i+1][0]-E[i][0],E[i+1][1]-E[i][1])); this.len=this.cum[this.n]; }
Eixo.prototype.em=function(s){ s=Math.max(0,Math.min(this.len,s)); let lo=0,hi=this.n-1; while(lo<hi){ const m=(lo+hi)>>1; if(this.cum[m+1]<s) lo=m+1; else hi=m; }
  const i=lo, L=(this.cum[i+1]-this.cum[i])||1e-9, t=(s-this.cum[i])/L, dx=this.E[i+1][0]-this.E[i][0], dy=this.E[i+1][1]-this.E[i][1];
  return {x:this.E[i][0]+dx*t,y:this.E[i][1]+dy*t,ux:dx/L,uy:dy/L}; };

/* monta a lista de ruas do projeto: várias ruas (topo.ruas) ou a rua única com o eixo da planta */
PC.ruasDoProjeto=function(P){
  const T=P.topo||{}, pl=P.planta3d||{};
  if(Array.isArray(T.ruas)&&T.ruas.length) return T.ruas.filter(r=>r&&Array.isArray(r.eixo)&&r.eixo.length>1);
  const ex=pl.eixo&&(Array.isArray(pl.eixo)?pl.eixo:pl.eixo.pts); if(Array.isArray(ex)&&ex.length>1&&Array.isArray(ex[0])) return [{id:'R1',nome:(P.ident&&P.ident.logradouro)||'Rua 1',rows:T.rows||[],eixo:ex,cruz:[]}];
  return []; };

PC.cena=function(P,opc){
  opc=opc||{}; const O=(P.planta3d&&Array.isArray(P.planta3d.origemUTM)&&P.planta3d.origemUTM.length===2)?P.planta3d.origemUTM:[0,0];
  const ruas=PC.ruasDoProjeto(P), E=[], LAY=[['PAV-EIXO',1],['PAV-PISTA',3],['PAV-NOME',7],['PAV-ESTACA',8],['PAV-ESTACA-TEXTO',8],['PAV-SECAO',5],['PAV-CRUZAMENTO',2],
    ['PAV-PERFIL-TE',3],['PAV-PERFIL-TC',1],['PAV-PERFIL-TD',5],['PAV-PERFIL-GRADE',8],['PAV-PERFIL-TEXTO',7],['PAV-QUADRO',7],['PAV-CARIMBO',7]];
  const Ln=(l,x1,y1,x2,y2)=>E.push({t:'L',l,x1,y1,x2,y2}), Pl=(l,pts,c)=>E.push({t:'P',l,pts,c:!!c}), Ci=(l,x,y,r)=>E.push({t:'C',l,x,y,r}),
    Tx=(l,x,y,h,txt,ang,al)=>{ txt=String(txt); ang=ang||0; if(al==='C'||al==='R'){ const w=0.62*h*txt.length*(al==='C'?0.5:1), a=ang*Math.PI/180; x-=w*Math.cos(a); y-=w*Math.sin(a); } E.push({t:'T',l,x,y,h,txt,ang}); };
  const X=p=>p[0]+O[0], Y=p=>p[1]+O[1];
  let x0=1e30,y0=1e30,x1=-1e30,y1=-1e30; const ext=(x,y)=>{ x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y); };
  /* fundo importado do DWG (uma camada do CAD por camada importada) */
  const fund=(P.planta3d&&P.planta3d.fundo)||[], usados={};
  fund.forEach(f=>{ const nm='PAV-FUNDO-'+nomeLay(f.n||'FUNDO'); if(!usados[nm]){ usados[nm]=1; LAY.push([nm,9]); }
    (f.l||[]).forEach(pl=>{ if(pl.length<2) return; const pts=pl.map(p=>[X(p),Y(p)]); Pl(nm,pts,false); pts.forEach(q=>ext(q[0],q[1])); }); });
  /* TODAS as cotas reais do desenho (planta3d.cotas): cruz + texto, uma camada por camada de origem; nada interpolado */
  const cot=(P.planta3d&&Array.isArray(P.planta3d.cotas))?P.planta3d.cotas:[], ucot={}; const ch=Math.max(0.6,Math.min(1.5,(x1>x0?Math.max(x1-x0,y1-y0):600)/900));
  cot.forEach(c=>{ if(!isFinite(c.x)||!isFinite(c.y)||!isFinite(c.z)) return; const nm='PAV-COTA-'+nomeLay(c.c||'COTA'); if(!ucot[nm]){ ucot[nm]=1; LAY.push([nm,2]); }
    const x=X([c.x]), y=Y([0,c.y]); Ln(nm,x-ch*0.5,y,x+ch*0.5,y); Ln(nm,x,y-ch*0.5,x,y+ch*0.5); Tx(nm,x+ch*0.7,y+ch*0.3,ch*0.8,(+c.z).toFixed(3),0); ext(x,y); });
  /* ruas */
  const ht0=Math.max(1,Math.min(3,(x1>x0?Math.max(x1-x0,y1-y0):600)/300));
  ruas.forEach((r,ri)=>{ const pts=r.eixo.map(p=>[X(p),Y(p)]); pts.forEach(q=>ext(q[0],q[1])); const ex=new Eixo(pts), ht=ht0, hb=((r.rows&&r.rows[0]&&+r.rows[0].larg)||(P.topo&&+P.topo.larg_proj)||7)/2;
    Pl('PAV-EIXO',pts,false);
    /* bordas da pista: deslocamento do eixo por vértice */
    if(!fund.length) [1,-1].forEach(sg=>{ const bd=pts.map((q,i)=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)], dx=b[0]-a[0], dy=b[1]-a[1], l=Math.hypot(dx,dy)||1; return [q[0]-dy/l*hb*sg,q[1]+dx/l*hb*sg]; }); Pl('PAV-PISTA',bd,false); });
    /* nome da rua no meio, paralelo */
    { const m=ex.em(ex.len/2); let an=Math.atan2(m.uy,m.ux)*180/Math.PI; if(an>90) an-=180; if(an<-90) an+=180; const k=an*Math.PI/180;
      Tx('PAV-NOME',m.x-Math.sin(k)*(hb+ht*2),m.y+Math.cos(k)*(hb+ht*2),ht*1.4,String(r.nome||('Rua '+(ri+1))).toUpperCase(),an,'C'); }
    /* estacas de 20 em 20 m */
    for(let s=0;s<=ex.len+0.001;s+=20){ const m=ex.em(s), nx=-m.uy, ny=m.ux; Ln('PAV-ESTACA',m.x+nx*(hb+ht*0.6),m.y+ny*(hb+ht*0.6),m.x-nx*(hb+ht*0.6),m.y-ny*(hb+ht*0.6));
      let an=Math.atan2(m.uy,m.ux)*180/Math.PI; if(an>90) an-=180; if(an<-90) an+=180; if(Math.round(s/20)%5===0||s===0) Tx('PAV-ESTACA-TEXTO',m.x+nx*(hb+ht*1.2),m.y+ny*(hb+ht*1.2),ht*0.8,'EST '+Math.round(s/20)+(s%20?'':'+0,00')); }
    /* estacas da tabela de Topografia (seções com cota) */
    (r.rows||[]).forEach(w=>{ if(w.est==null||w.est==='') return; const m=ex.em(+w.est), nx=-m.uy, ny=m.ux; Ln('PAV-SECAO',m.x+nx*hb,m.y+ny*hb,m.x-nx*hb,m.y-ny*hb); Ci('PAV-SECAO',m.x,m.y,ht*0.35); });
    /* cruzamentos */
    (r.cruz||[]).forEach(c=>{ const m=ex.em(+c.est); const o=ruas.find(q=>q.id===c.rua); Ci('PAV-CRUZAMENTO',m.x,m.y,hb); Tx('PAV-CRUZAMENTO',m.x+hb+ht*0.5,m.y+ht*0.5,ht*0.8,'CRUZ. '+(o?o.nome:c.rua)+' (EST '+f2(c.est/20)+')'); }); });
  if(!isFinite(x0)){ x0=O[0]; y0=O[1]; x1=O[0]+100; y1=O[1]+100; }
  const W=x1-x0, ht=Math.max(1,Math.min(3,Math.max(W,y1-y0)/300));
  /* perfis longitudinais do terreno (H 1:1, V 10x) e quadro de seções, abaixo da planta */
  const ev=10; let py=y0-30*ht;
  ruas.forEach((r,ri)=>{ const rows=(r.rows||[]).filter(w=>w&&w.est!==''&&w.est!=null&&isFinite(+w.est)&&isFinite(+w.tc)).map(w=>({est:+w.est,te:+w.te,tc:+w.tc,td:+w.td})).sort((a,b)=>a.est-b.est); if(rows.length<2) return;
    const zs=[]; rows.forEach(w=>{ [w.te,w.tc,w.td].forEach(z=>{ if(isFinite(z)) zs.push(z); }); }); const zmin=Math.floor(Math.min(...zs))-1, zmax=Math.ceil(Math.max(...zs))+1, H=(zmax-zmin)*ev, Lt=rows[rows.length-1].est, bx=x0, by=py-H;
    Tx('PAV-PERFIL-TEXTO',bx,py+ht*1.5,ht*1.3,'PERFIL DO TERRENO - '+String(r.nome||('Rua '+(ri+1))).toUpperCase()+'  (H 1:1 - V '+ev+'x)  '+f2(Lt)+' m');
    for(let z=zmin;z<=zmax;z++){ Ln('PAV-PERFIL-GRADE',bx,by+(z-zmin)*ev,bx+Lt,by+(z-zmin)*ev); Tx('PAV-PERFIL-GRADE',bx-ht*0.5,by+(z-zmin)*ev-ht*0.35,ht*0.8,f2(z),0,'R'); }
    [['PAV-PERFIL-TE','te'],['PAV-PERFIL-TC','tc'],['PAV-PERFIL-TD','td']].forEach(([l,k])=>{ const q=rows.filter(w=>isFinite(w[k])); if(q.length>1) Pl(l,q.map(w=>[bx+w.est,by+(w[k]-zmin)*ev]),false); });
    rows.forEach(w=>{ const xx=bx+w.est; Ln('PAV-PERFIL-GRADE',xx,by,xx,by+(w.tc-zmin)*ev); Tx('PAV-PERFIL-TEXTO',xx,by-ht*1.2,ht*0.7,f2(w.est/20),90,'L'); Tx('PAV-PERFIL-TEXTO',xx,by-ht*8,ht*0.7,f3(w.tc),90,'L'); });
    Tx('PAV-PERFIL-TEXTO',bx-ht*1,by-ht*1.2,ht*0.8,'ESTACA',0,'R'); Tx('PAV-PERFIL-TEXTO',bx-ht*1,by-ht*8,ht*0.8,'COTA TC',0,'R');
    py=by-ht*14-12*ht; });
  /* quadro de seções (à direita da planta) */
  { const qx=x1+30*ht, rh=ht*2.2, cw=[16,12,12,12,10]; let qy=y1;
    Tx('PAV-QUADRO',qx,qy+rh*0.6,ht*1.3,'QUADRO DE SECOES - COTAS REAIS DO LEVANTAMENTO (m)');
    ruas.forEach((r,ri)=>{ const rows=(r.rows||[]).filter(w=>w&&w.est!==''&&w.est!=null); if(!rows.length) return;
      Tx('PAV-QUADRO',qx,qy-rh*0.7,ht*1.0,String(r.nome||('Rua '+(ri+1))).toUpperCase(),0,'L'); qy-=rh*1.2;
      [['EST (m)','TE','TC','TD','LARG']].concat(rows.map(w=>[f2(w.est),f3(w.te),f3(w.tc),f3(w.td),f2(w.larg||'')])).forEach((row,i)=>{ let xx=qx; row.forEach((v,j)=>{ Tx('PAV-QUADRO',xx+cw[j]*ht*0.5,qy-rh*0.72,ht*0.85,v,0,'C'); xx+=cw[j]*ht; }); Ln('PAV-QUADRO',qx,qy,qx+cw.reduce((a,b)=>a+b,0)*ht,qy); qy-=rh; });
      qy-=rh; }); }
  /* carimbo */
  { const cx=x0, cy=py-20*ht, cw=Math.max(90*ht,W*0.4); Pl('PAV-CARIMBO',[[cx,cy],[cx+cw,cy],[cx+cw,cy+16*ht],[cx,cy+16*ht]],true); [11,6].forEach(k=>Ln('PAV-CARIMBO',cx,cy+k*ht,cx+cw,cy+k*ht));
    Tx('PAV-CARIMBO',cx+2*ht,cy+12.2*ht,ht*1.8,'LEVANTAMENTO E PERFIS - DIMENSIONAMENTO DE PAVIMENTOS FLEXIVEIS');
    Tx('PAV-CARIMBO',cx+2*ht,cy+7.2*ht,ht*1.4,'PROJETO: '+(((P.ident&&P.ident.logradouro)||opc.nome||'')+((P.ident&&P.ident.trecho)?'  -  '+P.ident.trecho:'')));
    Tx('PAV-CARIMBO',cx+2*ht,cy+2.6*ht,ht*1.1,'RESP.: '+((P.ident&&P.ident.responsavel)||'')+'   DATA: '+new Date().toLocaleDateString('pt-BR')+'   Metros, '+(O[0]||O[1]?'coordenadas UTM do DWG de origem. ':'')+ruas.length+' rua(s). Total Civil.'); }
  return {layers:LAY,ents:E,ruas:ruas.length,fundo:fund.length};
};

PC.dxf=function(C){
  const n=v=>(Math.round(v*10000)/10000).toString(), tx=s=>String(s).replace(/[^\x20-\x7e]/g,ch=>'\\U+'+('0000'+ch.charCodeAt(0).toString(16).toUpperCase()).slice(-4));
  const out=[];
  C.ents.forEach(o=>{
    if(o.t==='L') out.push(`0\nLINE\n8\n${o.l}\n10\n${n(o.x1)}\n20\n${n(o.y1)}\n30\n0\n11\n${n(o.x2)}\n21\n${n(o.y2)}\n31\n0\n`);
    else if(o.t==='C') out.push(`0\nCIRCLE\n8\n${o.l}\n10\n${n(o.x)}\n20\n${n(o.y)}\n30\n0\n40\n${n(o.r)}\n`);
    else if(o.t==='T') out.push(`0\nTEXT\n8\n${o.l}\n10\n${n(o.x)}\n20\n${n(o.y)}\n30\n0\n40\n${n(o.h)}\n1\n${tx(o.txt)}\n50\n${n(o.ang)}\n`);
    else if(o.t==='P'){ let e=`0\nPOLYLINE\n8\n${o.l}\n66\n1\n70\n${o.c?1:0}\n`; o.pts.forEach(p=>{ e+=`0\nVERTEX\n8\n${o.l}\n10\n${n(p[0])}\n20\n${n(p[1])}\n30\n0\n`; }); out.push(e+`0\nSEQEND\n8\n${o.l}\n`); } });
  return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n6\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n${C.layers.length}\n`+
    C.layers.map(l=>`0\nLAYER\n2\n${l[0]}\n70\n0\n62\n${l[1]}\n6\nCONTINUOUS\n`).join('')+`0\nENDTAB\n0\nTABLE\n2\nSTYLE\n70\n1\n0\nSTYLE\n2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\ntxt\n4\n\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${out.join('')}0\nENDSEC\n0\nEOF\n`; };

function carregarScript(src){ return new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>err(new Error('não carregou '+src)); document.head.appendChild(s); }); }
PC.dwg=async function(C){
  if(!root.TCDWG) await carregarScript(location.origin+'/tc-dwg.min.js');
  const A=root.TCDWG, doc=new A.CadDocument(), lay={};
  C.layers.forEach(([nm,cor])=>{ const l=new A.Layer(nm); l.name=nm; l.color=new A.Color(cor); doc.layers.add(l); lay[nm]=l; });
  const add=(o,l)=>{ o.layer=lay[l]; doc.modelSpace.entities.add(o); };
  C.ents.forEach(o=>{
    if(o.t==='L'){ const l=new A.Line(); l.startPoint=new A.XYZ(o.x1,o.y1,0); l.endPoint=new A.XYZ(o.x2,o.y2,0); add(l,o.l); }
    else if(o.t==='C'){ const c=new A.Circle(); c.center=new A.XYZ(o.x,o.y,0); c.radius=o.r; add(c,o.l); }
    else if(o.t==='T'){ const t=new A.TextEntity(o.txt); t.insertPoint=new A.XYZ(o.x,o.y,0); t.height=o.h; t.rotation=o.ang*Math.PI/180; add(t,o.l); }
    else if(o.t==='P'){ const p=new A.LwPolyline(); o.pts.forEach(q=>{ const v=new A.LwPolylineVertex(); v.location=new A.XY(q[0],q[1]); p.vertices.push(v); }); p.isClosed=o.c; add(p,o.l); } });
  doc.header.version=A.ACadVersion.AC1015;   /* AutoCAD 2000: abre em qualquer versão posterior */
  return A.DwgWriter.writeToBuffer(doc); };

function baixar(nome,conteudo,tipo){ const b=conteudo instanceof Blob?conteudo:new Blob([conteudo],{type:tipo||'application/octet-stream'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=nome; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); }
/* tipo: 'dwg' | 'dxf' ; P = dadosDoProjeto() ; opc.aviso(msg) mostra mensagem */
PC.exportar=async function(tipo,P,opc){
  opc=opc||{}; const av=opc.aviso||(m=>console.log(m)); const C=PC.cena(P,opc);
  if(!C.ents.length){ av('Nada para exportar: importe um DWG (ruas ou fundo) ou desenhe o eixo na Planta e 3D.'); return false; }
  const base=(String((P.ident&&P.ident.logradouro)||opc.nome||'pavimento').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'pavimento')+'_planta_perfis';
  if(tipo==='dxf'){ baixar(base+'.dxf',PC.dxf(C),'application/dxf'); av('DXF gerado: '+C.ruas+' rua(s), '+C.fundo+' camada(s) de fundo, perfis e quadro (camadas PAV-*).'); return true; }
  try{ av('Montando o DWG…'); const buf=await PC.dwg(C); baixar(base+'.dwg',new Blob([buf],{type:'application/acad'})); av('DWG gerado (AutoCAD 2000): '+C.ruas+' rua(s), '+C.fundo+' camada(s) de fundo, perfis e quadro (camadas PAV-*).'); return true; }
  catch(e){ console.error(e); baixar(base+'.dxf',PC.dxf(C),'application/dxf'); av('Não consegui gerar o DWG ('+((e&&e.message)||e)+'). Baixei o DXF, que o AutoCAD abre igual.'); return false; } };
root.PavCad=PC; if(typeof module!=='undefined'&&module.exports) module.exports=PC;
})(typeof window!=='undefined'?window:globalThis);
