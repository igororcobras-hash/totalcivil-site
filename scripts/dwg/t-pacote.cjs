const fs=require('fs'),vm=require('vm');
const ctx={crypto:require('crypto').webcrypto,performance,structuredClone,console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,DataView,Math,Date,Map,Set,Promise,setTimeout,Symbol};ctx.globalThis=ctx;ctx.window=ctx;ctx.self=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync('tc-dwg.new.js','utf8')+';globalThis.TCDWG=TCDWG;',ctx);
const A=ctx.TCDWG; console.log('exporta DwgReader:',typeof A.DwgReader,'DwgWriter:',typeof A.DwgWriter);
const L=require('/home/claude/totalcivil-site/dwg-leitor.js');
try{
const ab=new Uint8Array(fs.readFileSync('/mnt/user-data/uploads/417e4642-Jardim_Bela_Vista_21-09-26.dwg')).buffer;
const D=L.lerBuffer(A,ab); console.log('lido pelo pacote do navegador: pontos',D.pontos.length,'com cota',D.pontos.filter(p=>p.cota!=null).length);
// ida e volta: escreve um DWG como o Esgoto faz e lê de volta
const doc=new A.CadDocument(); const l=new A.Layer('ESG-REDE'); l.name='ESG-REDE'; l.color=new A.Color(5); doc.layers.add(l);
const ln=new A.Line(); ln.startPoint=new A.XYZ(200000,7500000,0); ln.endPoint=new A.XYZ(200050,7500040,0); ln.layer=l; doc.modelSpace.entities.add(ln);
const t=new A.TextEntity('PV-01'); t.insertPoint=new A.XYZ(200000,7500000,0); t.height=1; t.layer=l; doc.modelSpace.entities.add(t);
doc.header.version=A.ACadVersion.AC1015; const out=A.DwgWriter.writeToBuffer(doc);
const back=L.lerBuffer(A,out.buffer?out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength):out);
console.log('ida e volta DWG: linhas',back.linhas.length,'textos',back.textos.length,JSON.stringify(back.textos[0]||null));

}catch(e){console.log('ERRO:',String(e&&e.message).slice(0,300));}
