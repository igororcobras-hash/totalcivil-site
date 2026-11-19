/* dwg-leitor.js — leitura de desenhos DWG para os programas do Total Civil (DWG-01, 16/11/2026)
   Recebe o documento já lido pela biblioteca acad-ts (TCDWG.DwgReader) e devolve dados prontos para os programas:
   camadas, pontos COM COTA (e de onde a cota veio), linhas/polilinhas, textos, blocos com atributos e o estaqueamento.
   REGRA (pedido do dono): nunca inventar cota. A cota de um ponto vem, nesta ordem, de
     1) atributo COTA do bloco (SIMB_PONTO: PONTO / DESC / COTA, "6,429" com vírgula);
     2) texto de cota que vem logo DEPOIS do POINT na mesma camada (nº do ponto, cota, descrição) — pareado pela ORDEM do arquivo,
        porque em cópias do desenho o texto pode estar deslocado do ponto;
     3) Z do POINT, só quando não há texto e Z ≠ 0 (marcado fonte:'z', é o menos confiável: em desenhos movidos o Z foi alterado).
   Quando o Z do ponto difere da cota escrita, vale a cota escrita e o ponto sai marcado zDifere:true.
   Uso: const D = DwgLeitor.normalizar(doc);  (browser: doc = TCDWG.DwgReader.readFromStream(arrayBuffer)) */
(function(root){
'use strict';
const DwgLeitor={};
const semFormato=s=>String(s==null?'':s).replace(/\\[A-Za-z][^;\\{}]*;/g,'').replace(/\\P/g,' ').replace(/[{}]/g,'').trim();
DwgLeitor.limpaTexto=semFormato;
DwgLeitor.num=function(s){ const t=semFormato(s).replace(',','.'); return /^-?\d+(\.\d+)?$/.test(t)?parseFloat(t):null; };
const ehCota=s=>/^-?\d+[.,]\d{2,3}$/.test(semFormato(s));
const ehInt=s=>/^\d+$/.test(semFormato(s));
const nomeCamada=e=>(e.layer&&e.layer.name)||'0';
/* REGRA DO DONO (16/11/2026): sempre IGNORAR referências externas (xref). Fora: camadas "arquivo|camada" (dependentes de xref) e
   INSERT de bloco que é xref (flags 4 xref, 8 sobreposição, 16 dependente, ou caminho externo). */
const ehXref=e=>{ try{ if(nomeCamada(e).indexOf('|')>=0) return true; if(e.objectName==='INSERT'&&e.block){ const f=e.block.flags|0; if((f&(4|8|16))||e.block.xRefPath) return true; } }catch(_){} return false; };

DwgLeitor.normalizar=function(doc){
  const out={versao:null,unidades:null,camadas:{},pontos:[],linhas:[],textos:[],blocos:[],extensao:null,avisos:[]};
  try{ out.versao=doc.header&&doc.header.version; out.unidades=doc.header&&doc.header.insUnits; }catch(e){}
  const cam=n=>out.camadas[n]||(out.camadas[n]={nome:n,total:0,tipos:{},pontosComCota:0});
  let mn=[1e18,1e18],mx=[-1e18,-1e18];
  const ext=(x,y)=>{ if(isFinite(x)&&isFinite(y)&&x>1&&y>1){ mn[0]=Math.min(mn[0],x); mn[1]=Math.min(mn[1],y); mx[0]=Math.max(mx[0],x); mx[1]=Math.max(mx[1],y); } };
  let cur=null; // último POINT (para parear os textos que vêm depois)
  const txtNum={}; // textos numéricos por camada (nº do ponto e cotas), para parear por proximidade
  const consumido=new Set();
  const ents=[...doc.entities];
  out.xrefIgnorados=0;
  ents.forEach((e,idx)=>{
    if(ehXref(e)){ out.xrefIgnorados++; return; }
    const t=e.objectName, l=nomeCamada(e), c=cam(l); c.total++; c.tipos[t]=(c.tipos[t]||0)+1;
    if(t==='POINT'){
      const p={x:e.location.x,y:e.location.y,z:e.location.z,camada:l,cota:null,fonte:null,nome:null,desc:null,zDifere:false};
      out.pontos.push(p); cur={p,textos:[]}; ext(p.x,p.y); return; }
    if(t==='TEXT'){
      const v=semFormato(e.value), q={camada:l,v,x:e.insertPoint.x,y:e.insertPoint.y};
      if(ehCota(v)||ehInt(v)) (txtNum[l]=txtNum[l]||[]).push(q);
      if(cur&&cur.p.camada===l&&cur.textos.length<3&&Math.hypot(q.x-cur.p.x,q.y-cur.p.y)<60){   /* candidato por SEQUÊNCIA */
        cur.textos.push(e); consumido.add(idx); const sq=cur.p.seq||(cur.p.seq={});
        if(ehCota(v)&&sq.cota==null){ sq.cota=DwgLeitor.num(v); sq.cx=q.x; sq.cy=q.y; } else if(ehInt(v)&&sq.nome==null) sq.nome=v; else if(!ehCota(v)&&!ehInt(v)&&sq.desc==null) sq.desc=v; }
      else if(!ehCota(v)&&!ehInt(v)) out.textos.push({camada:l,txt:v,x:q.x,y:q.y,rot:e.rotation||0,h:e.height||0});
      return; }
    if(t!=='TEXT') { /* qualquer outra entidade encerra o grupo de textos do ponto */ if(t!=='MTEXT') cur=null; }
    if(t==='INSERT'){
      const at={}; [...(e.attributes||[])].forEach(a=>{ at[a.tag]=a.value; });
      const b={x:e.insertPoint.x,y:e.insertPoint.y,z:e.insertPoint.z,camada:l,bloco:e.block&&e.block.name,rot:e.rotation||0,attr:at};
      out.blocos.push(b); ext(b.x,b.y);
      if(at.COTA!=null&&DwgLeitor.num(at.COTA)!=null){
        const cota=DwgLeitor.num(at.COTA);
        out.pontos.push({x:b.x,y:b.y,z:b.z,camada:l,cota,fonte:'atributo',nome:at.PONTO||null,desc:at.DESC||null,zDifere:!!b.z&&Math.abs(b.z-cota)>0.005}); }
      return; }
    if(t==='LINE'){ out.linhas.push({camada:l,pts:[[e.startPoint.x,e.startPoint.y],[e.endPoint.x,e.endPoint.y]],fechada:false}); return; }
    if(t==='LWPOLYLINE'||t==='POLYLINE'){
      const V=[...(e.vertices||[])].map(q=>q.location?[q.location.x,q.location.y]:[q.x,q.y]).filter(q=>isFinite(q[0])&&isFinite(q[1]));
      if(V.length>=2) out.linhas.push({camada:l,pts:V,fechada:!!e.isClosed}); return; }
    if(t==='MTEXT'){ const v=semFormato(e.value); if(v) out.textos.push({camada:l,txt:v,x:e.insertPoint.x,y:e.insertPoint.y,rot:e.rotation||0,h:e.height||0}); }
  });
  /* Pareamento ponto × texto. Dois candidatos por ponto: PROXIMIDADE (texto de cota a menos de 0,8 m do ponto) e SEQUÊNCIA (texto
     que vem logo depois do POINT no arquivo; serve quando o desenho foi movido e os textos ficaram deslocados). O Z do POINT só
     decide quando o desenho é "de Z confiável" (a maioria dos pontos tem Z = cota escrita): aí vale o Z; senão vale o texto. */
  const g=new Map(), K=2, key=(x,y,l)=>l+'|'+Math.floor(x/K)+','+Math.floor(y/K), semCota=out.pontos.filter(p=>p.fonte==null);
  semCota.forEach(p=>{ const k=key(p.x,p.y,p.camada); (g.get(k)||g.set(k,[]).get(k)).push(p); });
  /* o texto de cota costuma ficar a uma distância FIXA do ponto (0 em desenho normal; um vetor constante em desenho movido):
     mede-se esse vetor pela mediana dos pares por sequência e só se usa se a maioria concordar (±0,3 m) */
  const med=a=>{ const t=a.slice().sort((x,y)=>x-y); return t.length?t[t.length>>1]:0; };
  const par=semCota.filter(p=>p.seq&&p.seq.cx!=null), mdx=med(par.map(p=>p.seq.cx-p.x)), mdy=med(par.map(p=>p.seq.cy-p.y));
  const concord=par.length?par.filter(p=>Math.abs(p.seq.cx-p.x-mdx)<0.3&&Math.abs(p.seq.cy-p.y-mdy)<0.3).length/par.length:0;
  const deslocado=concord>=0.5, OFF=deslocado?[mdx,mdy]:[0,0], TOL=deslocado?0.3:0.8; out.deslocamentoTexto=deslocado?{dx:+mdx.toFixed(3),dy:+mdy.toFixed(3),concordancia:+concord.toFixed(2)}:null;
  const perto=(q0,max)=>{ const q={camada:q0.camada,x:q0.x-OFF[0],y:q0.y-OFF[1]}; let b=null,bd=max; const cx=Math.floor(q.x/K), cy=Math.floor(q.y/K); for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)(g.get(q.camada+'|'+(cx+i)+','+(cy+j))||[]).forEach(p=>{ const d=Math.hypot(p.x-q.x,p.y-q.y); if(d<bd){bd=d;b=p;} }); return b; };
  Object.keys(txtNum).forEach(l=>{ (txtNum[l]||[]).forEach(q=>{ const pt=perto(q,TOL); if(!pt) return;
    if(ehCota(q.v)){ if(pt.cProx==null) pt.cProx=DwgLeitor.num(q.v); } else if(pt.nProx==null) pt.nProx=q.v; }); });
  let conf=0,tot=0; semCota.forEach(p=>{ const c=p.cProx!=null?p.cProx:p.seq&&p.seq.cota; if(c!=null&&p.z&&Math.abs(p.z)>1e-6){ tot++; if(Math.abs(p.z-c)<0.005) conf++; } });
  out.zConfiavel=tot>=20&&conf/tot>=0.6; out.zConfere={iguais:conf,comparados:tot};
  semCota.forEach(p=>{ const sq=p.seq||{}, zOk=p.z&&Math.abs(p.z)>1e-6; let c=null,f=null,cf=null;
    if(out.zConfiavel&&zOk){ c=+p.z.toFixed(3); f='z'; cf='alta'; }                         /* desenho de Z confiável: o Z é a cota */
    else if(p.cProx!=null){ c=p.cProx; f='texto'; cf=(sq.cota===p.cProx||(zOk&&Math.abs(p.z-p.cProx)<0.005))?'alta':'media'; }
    else if(sq.cota!=null){ c=sq.cota; f='texto'; cf=(zOk&&Math.abs(p.z-sq.cota)<0.005)?'alta':'media'; }
    if(c!=null){ p.cota=c; p.fonte=f; p.confianca=cf; }
    p.nome=p.nome||p.nProx||sq.nome||null; p.desc=p.desc||sq.desc||null; });
  out.pontos.forEach(p=>{ delete p.seq; delete p.cProx; delete p.nProx; if(p.fonte==='atributo') p.confianca='alta'; });
  // cota final dos pontos sem texto: Z (menos confiável) e conferência Z × cota escrita
  out.pontos.forEach(p=>{
    if(p.cota!=null){ if(p.fonte==='texto'&&p.z&&Math.abs(p.z-p.cota)>0.005) p.zDifere=true; }
    else if(p.z&&Math.abs(p.z)>1e-6){ p.cota=+p.z.toFixed(3); p.fonte='z'; p.confianca='baixa'; }
    if(p.cota!=null) cam(p.camada).pontosComCota++; });
  const zDif=out.zConfiavel?0:out.pontos.filter(p=>p.zDifere).length;
  if(zDif) out.avisos.push(zDif+' ponto(s) têm Z diferente da cota escrita: vale a cota escrita (o Z do desenho foi alterado).');
  const soZ=out.pontos.filter(p=>p.fonte==='z').length;
  if(soZ) out.avisos.push(soZ+' ponto(s) só têm o Z do desenho como cota (sem texto): confira antes de usar.');
  out.extensao=mn[0]<1e17?{minX:mn[0],minY:mn[1],maxX:mx[0],maxY:mx[1]}:null;
  try{ out.todasCamadas=[...doc.layers].map(l=>l&&l.name).filter(Boolean).filter(n=>n.indexOf('|')<0); }catch(_){ out.todasCamadas=[]; }   /* DWG-08: tabela de camadas inteira (inclui as vazias), sem as de xref */
  return out;
};

/* Estaqueamento escrito no desenho: textos "00", "01", "11+12.00" (camada informada). Devolve [{est (m), x, y, rotulo}] ordenado. */
DwgLeitor.estacas=function(D,camada,passo){
  passo=passo||20; const r=[];
  D.textos.filter(t=>t.camada===camada).forEach(t=>{
    const s=t.txt, m=/^(\d+)\+(\d+(?:[.,]\d+)?)$/.exec(s)||/^(\d+)$/.exec(s); if(!m) return;
    const est=+m[1]*passo+(m[2]?parseFloat(String(m[2]).replace(',','.')):0); r.push({est,x:t.x,y:t.y,rotulo:s}); });
  return r.sort((a,b)=>a.est-b.est);
};

/* Pontos de uma ou mais camadas, só os que têm cota real. */
DwgLeitor.pontosComCota=function(D,camadas){ const S=new Set([].concat(camadas)); return D.pontos.filter(p=>S.has(p.camada)&&p.cota!=null); };

/* Resumo para mostrar ao usuário (escolha de camadas): camadas com pontos com cota e com polilinhas. */
DwgLeitor.resumo=function(D){
  return Object.values(D.camadas).filter(c=>c.total).sort((a,b)=>b.total-a.total).map(c=>({nome:c.nome,total:c.total,pontosComCota:c.pontosComCota,tipos:c.tipos}));
};

/* Leitura direta de um ArrayBuffer (browser, com TCDWG; ou Node, passando o módulo acad-ts). */
DwgLeitor.lerBuffer=function(A,ab){ const R=A.DwgReader||A; const doc=R.readFromStream?R.readFromStream(ab):new R(ab).read(); return DwgLeitor.normalizar(doc); };

root.DwgLeitor=DwgLeitor;
if(typeof module!=='undefined') module.exports=DwgLeitor;
})(typeof window!=='undefined'?window:globalThis);
