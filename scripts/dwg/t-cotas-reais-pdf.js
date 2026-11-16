const pdfjs=require('pdfjs-dist/legacy/build/pdf.js'); const fs=require('fs');
global.window=global; global.document={};
(new Function(fs.readFileSync('/home/claude/totalcivil-site/levantamento.js','utf8')+';global.Lev=Lev;'))();
(async()=>{
const raw=await Lev.lerPDF(pdfjs,new Uint8Array(fs.readFileSync('/mnt/user-data/uploads/19f97fcd-estrada_de_acesso-Model.pdf')),1); const A=Lev.analisar(raw); const P=Lev.cotasDosPontos(A);
const reais=P.filter(p=>p.z!=null).map(p=>+p.z.toFixed(3)); const set=new Set(reais);
const R=Lev.montarRua(A,P,{escala:1000,passo:20});
let fora=0,sem=0,n=0;
R.rows.forEach(r=>{ ['tEsq','tDir'].forEach(k=>{ if(r[k]!=null){n++; if(!set.has(r[k])){fora++; console.log('NÃO real',r.est,k,r[k]);}} }); if(r.tEixo==null)sem++; else { const ok=[r.tEsq,r.tDir].filter(v=>v!=null); const m=+(ok.reduce((a,b)=>a+b,0)/ok.length).toFixed(3); if(Math.abs(m-r.tEixo)>0.0015) console.log('eixo ≠ média',r.est,r.tEixo,m); } });
console.log('pontos com cota',reais.length,'| estacas',R.rows.length,'| cotas de lado conferidas',n,'| fora do levantamento',fora,'| estacas sem cota',sem);
console.log('por origem:',JSON.stringify(R.rows.reduce((o,r)=>(o[r.fonte]=(o[r.fonte]||0)+1,o),{})),'| exatas',R.rows.filter(r=>r.exata).length);
console.log(R.rows.slice(0,6).map(r=>[r.est,r.tEsq,r.tEixo,r.tDir,r.fonte].join(' ')).join('\n'));
})().catch(e=>console.log(e));
