const fs=require('fs');
const base=JSON.parse(fs.readFileSync('/home/claude/totalcivil-site/Estrada_do_Mirante_pavimento_projeto.json','utf8'));
const R=JSON.parse(fs.readFileSync('saida/ruas.json','utf8'));const W=R.W;const na=base.alti.a_na;
fs.mkdirSync('saida/projetos',{recursive:true});const idx=[];
R.ruas.filter(r=>r.sec.length>=2).forEach((r,i)=>{
  const p=JSON.parse(JSON.stringify(base));
  const nome=r.nome.replace(/ \(.*/,'');
  p.ident={logradouro:'Verdes Mares — '+nome,trecho:r.nome+' · levantamento do DWG (cotas reais, nada interpolado)',responsavel:''};
  p.topo={topo_rn:0,topo_na:0,rows:r.sec.map(s=>({est:+s.est.toFixed(2),te:s.te,tc:+s.tc.toFixed(3),td:s.td,gr:+s.tc.toFixed(3),larg:W,na:+(s.tc-na).toFixed(3)}))};
  const f=`Verdes_Mares_${nome.replace(/[^A-Za-z0-9-]/g,'')}_pavimento_projeto.json`;
  fs.writeFileSync('saida/projetos/'+f,JSON.stringify(p,null,1));
  idx.push([f,r.nome,r.sec.length,Math.round(r.ext)]);
});
console.log(idx.map(x=>x.join(' | ')).join('\n'));
