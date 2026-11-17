/* DWG-05: projeto único com o EIXO DO PROJETO (tangentes + curvas, alinhamento.js) em cada rua.
   - eixo: ajustado aos meios das seções levantadas (que fazem zig-zag);
   - estacas: medidas ao longo do eixo do projeto (projeção de cada seção);
   - largura: UMA por rua (texto "pista / passeio" do DWG mais frequente; sem texto = 7 m);
   - cotas: só pontos reais do levantamento, perto de cada seção (nada interpolado):
       borda esq./dir. = ponto mais próximo de ±largura/2 (até 2,5 m), eixo = ponto a até 1 m do eixo
       ou média das duas bordas; seção sem cota real nos dois lados não entra;
   - cruzamentos: interseção dos eixos do projeto (prolongados 150 m). */
const fs=require('fs'), A=require('../../alinhamento.js');
const base=JSON.parse(fs.readFileSync('../../Estrada_do_Mirante_pavimento_projeto.json','utf8'));
const R=JSON.parse(fs.readFileSync('saida/ruas3.json','utf8')), PT=JSON.parse(fs.readFileSync('saida/pontos_dwg.json','utf8'));
const LB=JSON.parse(fs.readFileSync('saida/larguras_dwg.json','utf8')), LN=JSON.parse(fs.readFileSync('saida/linhas_dwg.json','utf8'));
const na=base.alti.a_na, W=7, CAM=new Set(['Borda','MURO','TN','Cal_da','Meio-fio','SARGETA','ASFALTO','MF','B']);
const pts=PT.filter(p=>CAM.has(p.c)&&isFinite(p.z)&&p.z>0);
let X0=1e18,Y0=1e18; R.ruas.forEach(r=>r.sec.forEach(s=>{X0=Math.min(X0,s.cx);Y0=Math.min(Y0,s.cy);})); X0=Math.floor(X0/10)*10-300; Y0=Math.floor(Y0/10)*10-300;
const r2=x=>+x.toFixed(2), r3=x=>+x.toFixed(3);
const relat=[], semLarg=[];
/* largura prévia (para o critério do eixo): texto do DWG mais frequente perto das seções */
const LARG0=r=>{ if(/D-\d/.test(r.nome)) return W; const h=r.tipo==='h'; const c={}; LB.forEach(l=>{ if(h?l.vert:!l.vert) return; if(r.sec.some(s=>Math.abs((h?l.y-s.cy:l.x-s.cx))<30&&Math.abs((h?l.x-s.cx:l.y-s.cy))<60)) c[l.pista]=(c[l.pista]||0)+1; }); const e=Object.entries(c).sort((a,b)=>b[1]-a[1]); return e.length?+e[0][0]:W; };
const ruas=R.ruas.filter(r=>r.sec.length>=2).map(r=>{
  const id=r.nome.match(/(L|T|D)-\d+/)[0].replace('-',''), nome=r.nome.replace(/ \(.*/,'');
  const al=A.alinhar(r.sec.map(s=>[s.cx,s.cy]),{larg:LARG0(r)});
  /* largura única */
  const h=r.tipo==='h', my=r.sec.reduce((a,q)=>a+q.cy,0)/r.sec.length, mx=r.sec.reduce((a,q)=>a+q.cx,0)/r.sec.length;
  const lb=LB.filter(l=>{ const q=al.proj([l.x,l.y]); return q&&q.s>-20&&q.s<al.L+20&&Math.abs(q.off)<30&&(id[0]==='D'||(h?!l.vert:l.vert)); });
  let larg=W; if(lb.length&&id[0]!=='D'){ const c={}; lb.forEach(l=>c[l.pista]=(c[l.pista]||0)+1); larg=+Object.entries(c).sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0]; } else semLarg.push(nome+(id[0]==='D'?' (diagonal: texto não identificável)':''));
  const hb=larg/2;
  /* pontos reais perto do eixo, em estaca/afastamento */
  const viz=[]; pts.forEach(p=>{ if(Math.abs(p.x-mx)>al.L+60&&Math.abs(p.y-my)>al.L+60) return; const q=al.proj([p.x,p.y]); if(q&&q.s>-8&&q.s<al.L+8&&Math.abs(q.off)<hb+4) viz.push({s:q.s,o:q.off,z:p.z}); });
  const rows=[]; let semCota=0;
  r.sec.map(s=>al.proj([s.cx,s.cy]).s).forEach(s=>{
    const c=viz.filter(p=>Math.abs(p.s-s)<=3);
    const lado=sg=>{ let b=null; c.forEach(p=>{ if(Math.sign(p.o)!==sg&&Math.abs(p.o)>0.5) return; const d=Math.abs(p.o-sg*hb); if(d<=2.5&&(!b||d<b.d)) b={d,z:p.z}; }); return b; };
    const e=lado(1), d=lado(-1); if(!e||!d){ semCota++; return; }
    let m=null; c.forEach(p=>{ const dd=Math.abs(p.o)+Math.abs(p.s-s)*0.3; if(Math.abs(p.o)<=1&&(!m||dd<m.d)) m={d:dd,z:p.z}; });
    const tc=m?m.z:(e.z+d.z)/2;
    if(rows.length&&s-rows[rows.length-1].est<2) return;
    rows.push({est:r2(Math.max(0,s)),te:r3(e.z),tc:r3(tc),td:r3(d.z),gr:r3(tc),larg,na:r3(tc-na)});
  });
  relat.push(`${nome.padEnd(9)} seções ${String(rows.length).padStart(2)}/${r.sec.length} sem cota real nos 2 lados ${semCota}  L ${al.L.toFixed(0)} m  largura ${larg} m  retas ${al.elem.filter(e=>e.tipo==='reta').length}  curvas ${al.curvas.map(c=>'R'+c.R.toFixed(0)+' '+c.D.toFixed(1)+'°').join(', ')||'—'}  desvio dos pontos ${al.desvMed.toFixed(2)} (máx ${al.desvMax.toFixed(2)}) m`);
  return {id,nome,tipo:r.tipo,al,rows,larg,eixo:al.eixo.filter((p,i,a)=>i%2===0||i===a.length-1).map(p=>[r2(p[0]-X0),r2(p[1]-Y0)])};
}).filter(r=>r.rows.length>=2);
/* cruzamentos pelos eixos do projeto */
const EXT=150, linha=r=>{ const E=r.al.eixo, a=E[0], b=E[1], c=E[E.length-2], d=E[E.length-1], u=(p,q)=>{ const L=Math.hypot(q[0]-p[0],q[1]-p[1])||1; return [(q[0]-p[0])/L,(q[1]-p[1])/L]; };
  const U=u(a,b), V=u(c,d); const P=[[a[0]-U[0]*EXT,a[1]-U[1]*EXT,-EXT]]; let s=0; E.forEach((p,i)=>{ if(i) s+=Math.hypot(p[0]-E[i-1][0],p[1]-E[i-1][1]); P.push([p[0],p[1],s]); }); P.push([d[0]+V[0]*EXT,d[1]+V[1]*EXT,s+EXT]); return P; };
const PL={}; ruas.forEach(r=>PL[r.id]=linha(r));
const cruz={}; ruas.forEach(r=>cruz[r.id]=[]);
for(let i=0;i<ruas.length;i++) for(let j=i+1;j<ruas.length;j++){ const Ar=ruas[i], Br=ruas[j], P=PL[Ar.id], Q=PL[Br.id]; let best=null;
  for(let a=0;a<P.length-1;a++) for(let b=0;b<Q.length-1;b++){ const p=P[a],q=P[a+1],r=Q[b],s=Q[b+1], d1x=q[0]-p[0],d1y=q[1]-p[1],d2x=s[0]-r[0],d2y=s[1]-r[1], den=d1x*d2y-d1y*d2x; if(Math.abs(den)<1e-9) continue;
    const t=((r[0]-p[0])*d2y-(r[1]-p[1])*d2x)/den, u=((r[0]-p[0])*d1y-(r[1]-p[1])*d1x)/den; if(t<0||t>1||u<0||u>1) continue;
    const ea=p[2]+t*(q[2]-p[2]), eb=r[2]+u*(s[2]-r[2]), fora=Math.max(0,-ea,ea-Ar.al.L)+Math.max(0,-eb,eb-Br.al.L); if(!best||fora<best.fora) best={ea,eb,fora}; }
  if(best&&best.fora<60){ cruz[Ar.id].push({est:r2(best.ea),rua:Br.id,estOutra:r2(best.eb)}); cruz[Br.id].push({est:r2(best.eb),rua:Ar.id,estOutra:r2(best.ea)}); } }
const p=JSON.parse(JSON.stringify(base)); p.v=3;
p.ident={logradouro:'Verdes Mares — bairro (todas as ruas)',trecho:'DWG LEVANTAMENTO TOTAL CIVIL - PAVIMENTO VERDESMARES · eixo do projeto em tangentes e curvas · cotas reais (nada interpolado)',responsavel:''};
p.topo={larg_proj:W,rows:ruas[0].rows,ruaAtiva:0,ruas:ruas.map(r=>({id:r.id,nome:r.nome,rows:r.rows,cruz:cruz[r.id].sort((a,b)=>a.est-b.est),eixo:r.eixo,eixoProj:true}))};
const cam=[['Borda','#374151',0.8],['GEO_PASSEIO PROJETADO','#9ca3af',0.55],['quadra','#b45309',0.7],['GEO_VIAS PROJETADAS','#dc2626',0.9]];
const fundo=cam.map(([n,c,w])=>({n,c,w,l:(LN[n]||[]).map(l=>{ const o=[]; (l.pts||l).forEach(q=>{ const t=[r2(q[0]-X0),r2(q[1]-Y0)], u=o[o.length-1]; if(!u||u[0]!==t[0]||u[1]!==t[1]) o.push(t); }); return o; }).filter(a=>a.length>1)})).filter(f=>f.l.length);
p.planta3d=Object.assign({},p.planta3d||{},{fundo,origemUTM:[X0,Y0],transv:[],eixo:null});
const out='saida/Verdes_Mares_pavimento_TODAS_AS_RUAS.json'; fs.writeFileSync(out,JSON.stringify(p));
console.log(relat.join('\n')); console.log('sem texto de largura (7 m):',semLarg.join(', ')); console.log('cruzamentos',Object.values(cruz).reduce((a,c)=>a+c.length,0)/2,'arquivo',(fs.statSync(out).size/1024).toFixed(0),'KB');
