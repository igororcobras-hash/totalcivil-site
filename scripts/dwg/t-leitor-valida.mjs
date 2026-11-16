import {createRequire} from 'module'; import fs from 'fs'; import * as A from '@node-projects/acad-ts';
const D0=createRequire(import.meta.url)('/home/claude/totalcivil-site/dwg-leitor.js');
const ler=f=>D0.lerBuffer(A,new Uint8Array(fs.readFileSync(f)).buffer);
const U='/mnt/user-data/uploads/';
for(const [n,f] of [['Estudo PAV','19fc5b9a-cad2010_01-07_Estudo_PAV_setor_O_R02.dwg'],['Verdes Mares','42070479-ESTUDO_TOTAL_CIVIL_-_PAVIMENTO_VERDESMARES.dwg']]){ const D=ler(U+f);
 console.log(n,'| deslocamento do texto',JSON.stringify(D.deslocamentoTexto),'| Z confiável',D.zConfiavel,JSON.stringify(D.zConfere),'| confiança',JSON.stringify(D.pontos.reduce((o,p)=>(o[p.confianca||'-']=(o[p.confianca||'-']||0)+1,o),{})),'| por fonte',JSON.stringify(D.pontos.reduce((o,p)=>(o[p.fonte||'-']=(o[p.fonte||'-']||0)+1,o),{})));
 global[n]=D; }
// comparação por POSIÇÃO do ponto não serve (arquivo movido); compara por (camada, nº) só quando o nº é único em ambos
const idx=D=>{const m=new Map(),dup=new Set();D.pontos.forEach(p=>{if(!p.nome||p.cota==null)return;const k=p.camada+'|'+p.nome;if(m.has(k))dup.add(k);m.set(k,p.cota)});dup.forEach(k=>m.delete(k));return m};
const a=idx(global['Estudo PAV']),b=idx(global['Verdes Mares']);let ok=0,dif=0;a.forEach((c,k)=>{if(b.has(k)){Math.abs(b.get(k)-c)<0.0015?ok++:dif++}});
console.log('comparando só números únicos nos dois arquivos: iguais',ok,'| diferentes',dif);
