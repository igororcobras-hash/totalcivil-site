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
const COR_FUNDO={'Borda':'#374151','GEO_PASSEIO PROJETADO':'#9ca3af','quadra':'#b45309','GEO_VIAS PROJETADAS':'#dc2626'};
const r2=x=>Math.round(x*100)/100, r3=x=>Math.round(x*1000)/1000, z0=x=>x===0?0:x;
const hyp=Math.hypot;

/* ───────── geometria ───────── */
function Eixo(E){ this.E=E; this.n=E.length-1; this.cum=[0]; this.sx=[]; this.sy=[]; this.L=[];
  for(let i=0;i<this.n;i++){ const dx=E[i+1][0]-E[i][0], dy=E[i+1][1]-E[i][1], l=hyp(dx,dy)||1e-9; this.sx.push(dx); this.sy.push(dy); this.L.push(l); this.cum.push(this.cum[i]+l); }
  this.len=this.cum[this.n]; }
/* estaca e afastamento (+esquerda) de um ponto; fora das pontas projeta nas retas de prolongamento */
Eixo.prototype.proj=function(px,py){ let best=1e30, S=0, O=0;
  for(let i=0;i<this.n;i++){ const ax=this.E[i][0], ay=this.E[i][1]; let t=((px-ax)*this.sx[i]+(py-ay)*this.sy[i])/(this.L[i]*this.L[i]);
    if(i>0) t=Math.max(0,t); if(i<this.n-1) t=Math.min(1,t);
    const qx=ax+this.sx[i]*t, qy=ay+this.sy[i]*t, d2=(px-qx)*(px-qx)+(py-qy)*(py-qy);
    if(d2<best){ best=d2; S=this.cum[i]+t*this.L[i]; O=Math.sign(this.sx[i]*(py-qy)-this.sy[i]*(px-qx))*Math.sqrt(d2); } }
  return {s:S,o:O}; };
Eixo.prototype.pt=function(s){ if(s<=0){ const u=[this.sx[0]/this.L[0],this.sy[0]/this.L[0]]; return [this.E[0][0]+u[0]*s,this.E[0][1]+u[1]*s]; }
  if(s>=this.len){ const k=this.n-1,u=[this.sx[k]/this.L[k],this.sy[k]/this.L[k]]; return [this.E[this.n][0]+u[0]*(s-this.len),this.E[this.n][1]+u[1]*(s-this.len)]; }
  let i=0; while(i<this.n-1&&this.cum[i+1]<s) i++; const t=(s-this.cum[i])/this.L[i]; return [this.E[i][0]+this.sx[i]*t,this.E[i][1]+this.sy[i]*t]; };
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

/* ───────── nomes e larguras vindos dos textos do DWG ───────── */
const PADRAO_NOME=/^\s*(RUA|AV\.?|AVENIDA|TRAVESSA|TV\.?|ESTRADA|ALAMEDA|PRA[ÇC]A|BECO)\s*\.?\s*\S/i;
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
  const brutas=(D.linhas||[]).filter(l=>eixos.has(l.camada)&&l.pts&&l.pts.length>=2);
  if(!brutas.length) return {ruas:[],origem:op.origem,relatorio:['Nenhuma linha nas camadas de eixo marcadas.']};
  let org=op.origem; if(!org){ let x0=1e30,y0=1e30; brutas.forEach(l=>l.pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);})); org=[Math.floor(x0/10)*10-300,Math.floor(y0/10)*10-300]; }
  /* pontos reais com cota das camadas marcadas (coordenadas locais) */
  const PT=(D.pontos||[]).filter(p=>p.cota!=null&&isFinite(p.cota)&&cotas.has(p.camada)).map(p=>({x:p.x-org[0],y:p.y-org[1],z:p.cota,c:p.camada}));
  /* uma rua por linha; remove linhas curtas */
  let ruas=[]; brutas.forEach(l=>{ const P=l.pts.map(p=>[p[0]-org[0],p[1]-org[1]]); const E0=new Eixo(P); if(E0.len<15) return; ruas.push({P,E0}); });
  ruas.forEach((r,i)=>{ r.id='R'+(i+1); const lg=larguraDaRua(D.textos||[],r.E0,org,op.larg); r.larg=lg.larg; r.hb=lg.larg/2; r.nome=nomeDaRua(D.textos||[],r.E0,org)||('Rua '+(i+1)); r.aviso=[]; r.a=0; r.b=0;
    if(!lg.doTexto) r.aviso.push('largura '+lg.larg+' m (padrão: o DWG não tem texto "pista / passeio" perto desta rua)'); });
  /* prolongamento até o cruzamento mais próximo à frente (até op.perto m) */
  const EXT=300; ruas.forEach(r=>{ r.ex=new Eixo(reamostra(r.P,EXT,EXT)); });
  if(op.estender) ruas.forEach(r=>{ const L0=r.E0.len; let ant=null, pos=null;
    ruas.forEach(o=>{ if(o===r) return; const x=intersecao(r.ex,o.ex); if(!x) return; const est=x.sa-EXT;
      if(est>L0+0.5&&(!pos||est<pos.est)) pos={est,rua:o}; if(est<-0.5&&(!ant||est>ant.est)) ant={est,rua:o}; });
    if(pos&&pos.est-L0<=op.perto){ r.b=pos.est-L0; r.aviso.push('fim estendido '+r2(r.b)+' m até '+pos.rua.nome); }
    if(ant&&-ant.est<=op.perto){ r.a=-ant.est; r.aviso.push('início estendido '+r2(r.a)+' m até '+ant.rua.nome); } });
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
  ruas=ruas.filter(r=>r.rows.length>=2);
  ruas.forEach(r=>rel.push(r.nome+': '+r2(r.ax.len)+' m, '+r.rows.length+' linhas, largura '+r.larg+' m'+(r.aviso.length?' — '+r.aviso.join('; '):'')));
  return {ruas:ruas.map(r=>({id:r.id,nome:r.nome,rows:r.rows,cruz:r.cruz,eixo:r.eixo.map(p=>[z0(r2(p[0])),z0(r2(p[1]))]),eixoProj:true})),origem:org,relatorio:rel};
};

/* fundo da planta: linhas das camadas marcadas, em metros locais */
DI.fundo=function(D,camadas,org){ const set=new Set(camadas), por={};
  (D.linhas||[]).forEach(l=>{ if(!set.has(l.camada)||!l.pts||l.pts.length<2) return; const o=[]; l.pts.forEach(q=>{ const t=[r2(q[0]-org[0]),r2(q[1]-org[1])], u=o[o.length-1]; if(!u||u[0]!==t[0]||u[1]!==t[1]) o.push(t); });
    if(o.length>1) (por[l.camada]=por[l.camada]||[]).push(o); });
  const pal=['#374151','#9ca3af','#b45309','#dc2626','#0e7490','#7c3aed','#15803d','#a16207'];
  return Object.keys(por).map((n,i)=>({n,c:COR_FUNDO[n]||pal[i%pal.length],w:0.7,l:por[n]})); };

/* ───────── tela ───────── */
function carregarScript(src){ return new Promise((ok,err)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=()=>err(new Error('não carregou '+src)); document.head.appendChild(s); }); }
async function bibliotecas(){ if(!root.TCDWG) await carregarScript(location.origin+'/tc-dwg.min.js'); if(!root.DwgLeitor) await carregarScript(location.origin+'/dwg-leitor.js'); }
const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

DI.abrir=function(cfg){
  cfg=cfg||{}; let D=null;
  const old=document.getElementById('dwgimp'); if(old) old.remove();
  const ov=document.createElement('div'); ov.id='dwgimp';
  ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(15,22,32,.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,sans-serif';
  ov.innerHTML='<div style="background:var(--surface,#fff);color:var(--fg,#14202e);border-radius:12px;max-width:980px;width:100%;max-height:94vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)">'+
    '<div style="padding:14px 18px;border-bottom:1px solid #d6d9de;display:flex;align-items:center;gap:10px"><b style="font-size:16px;flex:1">📥 Importar DWG — escolha as camadas</b><button type="button" id="dwgimp-x" style="font-size:18px;border:0;background:none;cursor:pointer">✕</button></div>'+
    '<div id="dwgimp-corpo" style="padding:14px 18px;overflow:auto;flex:1"></div>'+
    '<div id="dwgimp-rod" style="padding:12px 18px;border-top:1px solid #d6d9de;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"></div></div>';
  document.body.appendChild(ov);
  const corpo=ov.querySelector('#dwgimp-corpo'), rod=ov.querySelector('#dwgimp-rod');
  const fechar=()=>ov.remove(); ov.querySelector('#dwgimp-x').onclick=fechar;
  corpo.innerHTML='<p style="margin:0 0 10px">Escolha o arquivo <b>.dwg</b> (AutoCAD 2000 a 2018). O arquivo é lido no seu computador; nada é enviado.</p><input type="file" id="dwgimp-arq" accept=".dwg">';
  ov.querySelector('#dwgimp-arq').onchange=async ev=>{ const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    corpo.innerHTML='<p>Lendo <b>'+esc(f.name)+'</b> ('+(f.size/1048576).toFixed(1)+' MB)… pode levar alguns segundos.</p>';
    try{ await bibliotecas(); const buf=await f.arrayBuffer(); await new Promise(r=>setTimeout(r,60)); D=root.DwgLeitor.lerBuffer(root.TCDWG,buf); D.__arquivo=f.name; }
    catch(e){ console.error(e); corpo.innerHTML='<p style="color:#b91c1c">Não consegui ler este DWG: '+esc(e&&e.message||e)+'</p>'; return; }
    mostra(); };
  function mostra(){
    const nl={}; (D.linhas||[]).forEach(l=>{ nl[l.camada]=(nl[l.camada]||0)+1; });
    const nt={}; (D.textos||[]).forEach(t=>{ nt[t.camada]=(nt[t.camada]||0)+1; });
    const cams=Object.keys(D.camadas||{}).filter(n=>D.camadas[n].total>0).sort((a,b)=>D.camadas[b].total-D.camadas[a].total);
    const ck=(k,n,on)=>'<input type="checkbox" data-k="'+k+'" data-n="'+esc(n)+'"'+(on?' checked':'')+'>';
    let h='<p style="margin:0 0 8px"><b>'+esc(D.__arquivo)+'</b> — '+cams.length+' camadas'+(D.xrefIgnorados?' · '+D.xrefIgnorados+' referência(s) externa(s) ignorada(s)':'')+'. Marque o que vai ser importado.</p>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="btn-add" data-ac="sug">Marcar sugeridas</button><button type="button" class="btn-add" data-ac="nada">Limpar tudo</button>'+
      '<label style="margin-left:auto;font-size:13px">Largura da pista padrão (m) <input id="dwgimp-larg" type="number" step="0.1" value="7" style="width:60px"></label>'+
      '<label style="font-size:13px"><input id="dwgimp-est" type="checkbox" checked> Estender cada rua até o cruzamento mais próximo (até 80 m)</label></div>'+
      '<div style="overflow:auto;max-height:52vh;border:1px solid #d6d9de;border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead style="position:sticky;top:0;background:var(--surface2,#f1f3f5)"><tr><th style="text-align:left;padding:6px 8px">Camada</th><th style="text-align:left">Conteúdo</th><th title="Desenho de fundo da planta">Fundo</th><th title="Cada linha da camada vira uma rua">Eixo de rua</th><th title="Pontos com cota real usados nas seções">Cotas</th></tr></thead><tbody>';
    cams.forEach(n=>{ const c=D.camadas[n], cont=[]; if(nl[n]) cont.push(nl[n]+' linhas'); if(c.pontosComCota) cont.push(c.pontosComCota+' pontos c/ cota'); if(nt[n]) cont.push(nt[n]+' textos'); const ob=c.total-(nl[n]||0)-(nt[n]||0)-(c.pontosComCota||0); if(ob>0) cont.push(ob+' outros');
      h+='<tr style="border-top:1px solid #e5e7eb"><td style="padding:4px 8px;font-weight:600">'+esc(n)+'</td><td style="color:#64748b">'+esc(cont.join(' · '))+'</td><td style="text-align:center">'+(nl[n]?ck('fundo',n,SUGERE_FUNDO.indexOf(n)>=0):'')+'</td><td style="text-align:center">'+(nl[n]?ck('eixo',n,/eixo/i.test(n)):'')+'</td><td style="text-align:center">'+(c.pontosComCota?ck('cota',n,SUGERE_COTA.indexOf(n)>=0):'')+'</td></tr>'; });
    h+='</tbody></table></div><div id="dwgimp-msg" style="margin-top:8px;font-size:13px;color:#475569"></div>';
    corpo.innerHTML=h;
    const marcados=k=>[...corpo.querySelectorAll('input[data-k="'+k+'"]:checked')].map(i=>i.dataset.n);
    corpo.querySelector('[data-ac="sug"]').onclick=()=>corpo.querySelectorAll('input[data-k]').forEach(i=>{ i.checked=(i.dataset.k==='fundo'&&SUGERE_FUNDO.indexOf(i.dataset.n)>=0)||(i.dataset.k==='cota'&&SUGERE_COTA.indexOf(i.dataset.n)>=0)||(i.dataset.k==='eixo'&&/eixo/i.test(i.dataset.n)); });
    corpo.querySelector('[data-ac="nada"]').onclick=()=>corpo.querySelectorAll('input[data-k]').forEach(i=>{ i.checked=false; });
    rod.innerHTML='<button type="button" class="btn-add" id="dwgimp-canc">Cancelar</button><button type="button" class="btn-add" id="dwgimp-ok" style="background:var(--accent,#1d4ed8);color:#fff;border-color:transparent">Importar camadas marcadas</button>';
    rod.querySelector('#dwgimp-canc').onclick=fechar;
    rod.querySelector('#dwgimp-ok').onclick=()=>{ const msg=corpo.querySelector('#dwgimp-msg'); const fundo=marcados('fundo'), eixo=marcados('eixo'), cota=marcados('cota');
      if(!fundo.length&&!eixo.length) return msg.textContent='Marque pelo menos uma camada em Fundo ou Eixo de rua.';
      if(eixo.length&&!cota.length) return msg.textContent='Para gerar as ruas, marque também as camadas de Cotas (pontos com cota real).';
      const op={eixos:eixo,cotas:cota,larg:parseFloat(corpo.querySelector('#dwgimp-larg').value)||7,estender:corpo.querySelector('#dwgimp-est').checked,origem:cfg.origem||null};
      let res=null; try{ res=eixo.length?DI.gerarRuas(D,op):{ruas:[],origem:cfg.origem||null,relatorio:[]}; }catch(e){ console.error(e); return msg.textContent='Erro ao gerar as ruas: '+(e&&e.message||e); }
      if(eixo.length&&!res.ruas.length) return msg.textContent=res.relatorio.join(' ')||'Nenhuma rua gerada.';
      let org=res.origem; if(!org){ const e=D.extensao||{minX:0,minY:0}; org=[Math.floor(e.minX/10)*10-300,Math.floor(e.minY/10)*10-300]; }
      const dados={ruas:res.ruas,fundo:fundo.length?DI.fundo(D,fundo,org):null,origem:org,relatorio:res.relatorio,arquivo:D.__arquivo};
      try{ if(cfg.aplicar) cfg.aplicar(dados); }catch(e){ console.error(e); return msg.textContent='Erro ao aplicar no projeto: '+(e&&e.message||e); }
      DI.ultimo=dados; mostraResumo(dados); }; }
  function mostraResumo(dados){
    corpo.innerHTML='<p style="margin:0 0 8px"><b>Importado.</b> '+(dados.ruas.length?dados.ruas.length+' rua(s) gerada(s). ':'')+(dados.fundo?dados.fundo.length+' camada(s) de fundo na planta.':'')+'</p>'+
      (dados.relatorio.length?'<div style="max-height:50vh;overflow:auto;font-size:12.5px;border:1px solid #d6d9de;border-radius:8px;padding:8px 10px"><b>Relatório (confira as pontas):</b><ul style="margin:6px 0 0 16px;padding:0">'+dados.relatorio.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul></div>':'');
    rod.innerHTML='<button type="button" class="btn-add" id="dwgimp-fim" style="background:var(--accent,#1d4ed8);color:#fff;border-color:transparent">Fechar</button>'; rod.querySelector('#dwgimp-fim').onclick=fechar; }
};
root.DwgImp=DI; if(typeof module!=='undefined'&&module.exports) module.exports=DI;
})(typeof window!=='undefined'?window:globalThis);
