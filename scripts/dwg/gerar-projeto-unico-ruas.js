/* Um único projeto do Flexível com todas as ruas (topo.ruas) e os cruzamentos (estaca em cada rua). Só cotas reais. */
const fs=require('fs');
const base=JSON.parse(fs.readFileSync('/home/claude/totalcivil-site/Estrada_do_Mirante_pavimento_projeto.json','utf8'));
const R=JSON.parse(fs.readFileSync('saida/ruas.json','utf8'));const W=R.W,na=base.alti.a_na;
const ruas=R.ruas.filter(r=>r.sec.length>=2).map(r=>({id:r.nome.match(/(L|T)-\d+/)[0].replace('-',''),nome:r.nome.replace(/ \(.*/,''),tipo:r.tipo,sec:r.sec,ext:r.ext}));
const EXT=150;
function poli(r){const P=r.sec.map(s=>({x:s.cx,y:s.cy,e:s.est}));const a=P[0],b=P[1],c=P[P.length-2],d=P[P.length-1];
  const u=(p,q)=>{const L=Math.hypot(q.x-p.x,q.y-p.y)||1;return[(q.x-p.x)/L,(q.y-p.y)/L]};
  const [ux,uy]=u(a,b),[vx,vy]=u(c,d);
  return [{x:a.x-ux*EXT,y:a.y-uy*EXT,e:a.e-EXT}].concat(P,[{x:d.x+vx*EXT,y:d.y+vy*EXT,e:d.e+EXT}]);}
function inter(A,B){const out=[];for(let i=0;i<A.length-1;i++)for(let j=0;j<B.length-1;j++){
  const p=A[i],q=A[i+1],r=B[j],s=B[j+1];const d1x=q.x-p.x,d1y=q.y-p.y,d2x=s.x-r.x,d2y=s.y-r.y;const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-9)continue;
  const t=((r.x-p.x)*d2y-(r.y-p.y)*d2x)/den,u=((r.x-p.x)*d1y-(r.y-p.y)*d1x)/den;
  if(t>=0&&t<=1&&u>=0&&u<=1)out.push({ea:p.e+t*(q.e-p.e),eb:r.e+u*(s.e-r.e)});}return out;}
const PL={};ruas.forEach(r=>PL[r.id]=poli(r));
const cruz={};ruas.forEach(r=>cruz[r.id]=[]);
for(let i=0;i<ruas.length;i++)for(let j=i+1;j<ruas.length;j++){
  const A=ruas[i],B=ruas[j];if(A.tipo===B.tipo)continue;           // paralelas não se cruzam
  const xs=inter(PL[A.id],PL[B.id]);
  // um cruzamento por par (o mais perto do trecho levantado das duas)
  if(!xs.length)continue;const dist=x=>Math.max(0,-x.ea,x.ea-A.ext)+Math.max(0,-x.eb,x.eb-B.ext);xs.sort((p,q)=>dist(p)-dist(q));const x=xs[0];
  cruz[A.id].push({est:+x.ea.toFixed(2),rua:B.id,estOutra:+x.eb.toFixed(2)});cruz[B.id].push({est:+x.eb.toFixed(2),rua:A.id,estOutra:+x.ea.toFixed(2)});}
const p=JSON.parse(JSON.stringify(base));
p.ident={logradouro:'Verdes Mares — bairro (todas as ruas)',trecho:'Levantamento do DWG LEVANTAMENTO TOTAL CIVIL - PAVIMENTO VERDESMARES (cotas reais, nada interpolado)',responsavel:''};
p.v=3;
const mk=r=>r.sec.map(s=>({est:+s.est.toFixed(2),te:s.te,tc:+s.tc.toFixed(3),td:s.td,gr:+s.tc.toFixed(3),larg:W,na:+(s.tc-na).toFixed(3)}));
p.topo={larg_proj:W,rows:mk(ruas[0]),ruaAtiva:0,ruas:ruas.map(r=>({id:r.id,nome:r.nome,rows:mk(r),cruz:cruz[r.id].sort((a,b)=>a.est-b.est)}))};
fs.writeFileSync('saida/Verdes_Mares_pavimento_TODAS_AS_RUAS.json',JSON.stringify(p,null,1));
ruas.forEach(r=>console.log(r.nome.padEnd(8),String(r.sec.length).padStart(3),'est',Math.round(r.ext)+'m','cruza:',cruz[r.id].map(c=>c.rua+'@'+c.est+(c.est<0||c.est>r.ext?'(fora)':'')).join(' ')));
console.log('arquivo',(fs.statSync('saida/Verdes_Mares_pavimento_TODAS_AS_RUAS.json').size/1024).toFixed(0),'KB');
