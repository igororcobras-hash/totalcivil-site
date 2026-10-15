// Teste da rotina sem internet: monta planilhas no formato oficial a partir do banco
// embutido (preços +1%, mês 09/2026) e confere que a conversão sai igual e que as
// conferências barram coluna trocada, aba trocada, Onerado/Desonerado invertido e mês errado.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { XLSX, bancoEmbutido, RAIZ } from './parsers.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bancos-teste-'));
const pastaDados = path.join(tmp, 'dados');
fs.cpSync(path.join(RAIZ, 'orcamento', 'dados'), pastaDados, { recursive: true });
process.env.BANCOS_PASTA_DADOS = pastaDados;
const A = await import('./atualizar.mjs');
const emb = bancoEmbutido();
const UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const F = 1.01;
const r2 = v => Math.round(v * F * 100) / 100;
const xlsxBuf = wb => XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

// ---------------- SINAPI no formato "Referência"
function planilhaSinapi(o = {}){
  const ref = o.ref || '09/2026';
  const topo = (titulo) => [[titulo], [], ['Mês de Referência', ref], [], [], [], [], [], []];
  const ufsCab = UFS.map(u => (o.rjNoLugarDe && u === o.rjNoLugarDe) ? 'RJ' : (o.rjNoLugarDe && u === 'RJ') ? o.rjNoLugarDe : u);
  function abaInsumos(campo, titulo){
    const rows = topo(titulo);
    const cab = ['Classificação', 'Código do Insumo', 'Descrição do Insumo', 'Unidade', 'Origem de Preço'];
    if(o.trocarDescrUnid){ cab[2] = 'Unidade'; cab[3] = 'Descrição do Insumo'; }
    rows.push(cab.slice(0, 4).concat(ufsCab));
    emb.sinapi.insumos.forEach(i => {
      const p = r2(i[campo]);
      const linha = ['MATERIAL', +i.CODIGO.slice(3), o.trocarDescrUnid ? i.UNID : i.DESCR1, o.trocarDescrUnid ? i.DESCR1 : i.UNID];
      UFS.forEach(u => linha.push(u === 'RJ' ? p : Math.round(p * (0.7 + (u.charCodeAt(0) % 7) / 10) * 100) / 100));
      rows.push(linha);
    });
    return XLSX.utils.aoa_to_sheet(rows);
  }
  function abaComp(campo, titulo){
    const rows = topo(titulo);
    rows.push(['Grupo', 'Código da Composição', 'Descrição', 'Unidade'].concat(ufsCab));
    emb.sinapi.composicoes.forEach(c => {
      const p = r2(c[campo]);
      const linha = [c.GRUPO, +c.CODIGO.slice(3), c.DESCR1, c.UNID];
      UFS.forEach(u => linha.push(u === 'RJ' ? p : Math.round(p * (0.7 + (u.charCodeAt(1) % 7) / 10) * 100) / 100));
      rows.push(linha);
    });
    return XLSX.utils.aoa_to_sheet(rows);
  }
  const ana = [['Analítico'], [], ['Mês de Referência', ref], [], [], [], [], [], [], []];
  ana.push(['Grupo', 'Código da Composição', 'Tipo Item', 'Código do Item', 'Descrição', 'Unidade', 'Coeficiente']);
  Object.keys(emb.sinapi.compMap).forEach(k => {
    const c = emb.sinapi.compMap[k];
    ana.push(['', +k.slice(3), null, null, c.descr, c.unid, null]);
    c.itens.forEach(it => ana.push(['', +k.slice(3), it.codigo.startsWith('SC-') ? 'COMPOSICAO' : 'INSUMO', +it.codigo.slice(3), it.descr, it.unid, it.qtd]));
  });
  const wb = XLSX.utils.book_new();
  const abas = { ISD: abaInsumos('CUSTO', 'Preços de Insumos - SEM Desoneração'), ICD: abaInsumos('CUSTO_COM', 'Preços de Insumos - COM Desoneração'),
    CSD: abaComp('CUSTO', 'Custos de Composições - SEM Desoneração'), CCD: abaComp('CUSTO_COM', 'Custos de Composições - COM Desoneração') };
  if(o.trocarCsdCcd){ const t = abas.CSD; abas.CSD = abas.CCD; abas.CCD = t; }
  for(const n of ['ISD', 'ICD', 'CSD', 'CCD']) XLSX.utils.book_append_sheet(wb, abas[n], n);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ana), 'Analítico');
  return [{ nome: 'SINAPI_Referência_2026_09.xlsx', buf: xlsxBuf(wb) }, { nome: 'SINAPI_familias_e_coeficientes_2026_09.xlsx', buf: xlsxBuf(XLSX.utils.book_new_safe ? XLSX.utils.book_new() : (() => { const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet([['x']]), 'Familias'); return w; })()) }];
}

// ---------------- SCO: Catálogo (FGV06), Itens Elementares (FGV04) e Vínculo (FGV07) O e D
function arquivosSco(o = {}){
  const ref = o.ref || '09/2026';
  const out = [];
  for(const od of ['O', 'D']){
    const desTxt = od === 'D' ? ' - Desonerado' : '';
    const campo = (od === 'D') !== !!o.inverterPrecos ? 'CUSTO_COM' : 'CUSTO';
    const cat = [['PCRJ SCO-Sistema de Custos para Obras e Serviços de Engenharia'], ['Catálogo de Itens de Serviço' + desTxt], ['Referência: ' + ref]];
    let grupo = null;
    emb.sco.itens.forEach(it => {
      if(it.GRUPO !== grupo){ grupo = it.GRUPO; cat.push([grupo]); }
      cat.push(['', '', it.CODIGO.slice(4), it.DESCR1 + (od === 'D' ? ' (Desonerado)' : ''), it.UNID, r2(it[campo])]);
    });
    const ins = [['PCRJ SCO-Sistema de Custos para Obras e Serviços de Engenharia'], ['Relação de Itens Elementares' + desTxt], ['Referência: ' + ref], ['Código', 'Descrição', 'Unid', '', 'Preço']];
    let cat2 = null;
    emb.sco.insumos.forEach(it => {
      if(it.GRUPO !== cat2){ cat2 = it.GRUPO; ins.push([cat2]); }
      let cod = it.CODIGO.slice(6);
      if(od === 'D' && /^MOD0/.test(cod)) cod = cod.replace(/^MOD0/, 'MOD9');
      ins.push([cod, it.DESCR1, it.UNID, '', r2(it[campo])]);
    });
    const vin = [['PCRJ SCO-Sistema de Custos para Obras e Serviços de Engenharia'], ['Catálogo de Composições' + desTxt], ['Referência: ' + ref], ['Descrição do Elementar Código Unid.Med. Quantidade']];
    if(od === 'O') Object.keys(emb.sco.compMap).forEach(k => {
      vin.push([k.slice(4)]);
      emb.sco.compMap[k].itens.forEach(it => vin.push([it.descr, it.codigo.slice(6), it.unid, it.qtd]));
    });
    const zipO = 'ARQUIVOS-COM-CATALOGO-DAS-COMPOSICOES-' + (o.trocarNomeOD ? (od === 'O' ? 'D' : 'O') : od) + '-EXCEL.zip';
    const wb = (rows) => { const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'Plan1'); return xlsxBuf(w); };
    out.push({ nome: zipO + '/' + od + 'FGV06.xlsx', buf: wb(cat) });
    out.push({ nome: zipO + '/' + od + 'FGV04.xlsx', buf: wb(ins) });
    if(od === 'O' && !o.semVinculo) out.push({ nome: zipO + '/' + od + 'FGV07.xlsx', buf: wb(vin) });
  }
  return out;
}

let falhas = 0;
async function caso(nome, deveFalhar, fn){
  try{
    const r = await fn();
    if(deveFalhar){ falhas++; console.log('✗ ' + nome + ': deveria ter sido barrado e passou'); }
    else console.log('✓ ' + nome + (r ? ' — ' + r : ''));
  }catch(e){
    if(deveFalhar && e.constructor.name === 'ErroConferencia'){
      console.log('✓ ' + nome + ' — barrado: ' + e.message.split('\n').filter(l => l.includes('✗')).map(l => l.trim()).join(' | '));
    } else { falhas++; console.log('✗ ' + nome + ': ' + (deveFalhar ? 'erro inesperado ' : '') + e.stack); }
  }
}

function conferirIgual(novo, antigo, campoLista){
  let dif = 0;
  const m = new Map(antigo[campoLista].map(x => [x.CODIGO, x]));
  novo[campoLista].forEach(x => { const a = m.get(x.CODIGO); if(!a || Math.abs(x.CUSTO - r2(a.CUSTO)) > 0.011 || x.DESCR1.replace(/ \(Desonerado\)$/, '') !== a.DESCR1) dif++; });
  if(dif) throw new Error(dif + ' ' + campoLista + ' diferentes do esperado');
  if(novo[campoLista].length !== antigo[campoLista].length) throw new Error(campoLista + ': ' + novo[campoLista].length + ' em vez de ' + antigo[campoLista].length);
}

console.log('--- SINAPI');
await caso('SINAPI 09/2026 correta', false, async () => { const r = A.converterSinapi(planilhaSinapi(), '2026-09', 'teste'); conferirIgual(r.dados, emb.sinapi, 'insumos'); conferirIgual(r.dados, emb.sinapi, 'composicoes'); console.log(r.rel.texto()); return r.extra.composicoes + ' composições'; });
await caso('SINAPI com CSD e CCD trocadas', true, async () => A.converterSinapi(planilhaSinapi({ trocarCsdCcd: true }), '2026-09', 'teste'));
await caso('SINAPI com título RJ na coluna de SP', true, async () => A.converterSinapi(planilhaSinapi({ rjNoLugarDe: 'SP' }), '2026-09', 'teste'));
await caso('SINAPI com Descrição e Unidade trocadas', true, async () => A.converterSinapi(planilhaSinapi({ trocarDescrUnid: true }), '2026-09', 'teste'));
await caso('SINAPI com mês errado (07/2026)', true, async () => A.converterSinapi(planilhaSinapi({ ref: '07/2026' }), '2026-09', 'teste'));
await caso('SINAPI sem a planilha Referência', true, async () => A.converterSinapi(planilhaSinapi().slice(1), '2026-09', 'teste'));

console.log('--- SCO');
await caso('SCO 09/2026 correto', false, async () => { const r = await A.converterSco(arquivosSco(), '2026-09', 'teste'); conferirIgual(r.dados, emb.sco, 'itens'); console.log(r.rel.texto()); return r.extra.itens + ' itens, ' + r.extra.comInsumos + ' com composição'; });
await caso('SCO sem o vínculo FGV07 (usa coeficientes do mês anterior)', false, async () => { const r = await A.converterSco(arquivosSco({ semVinculo: true }), '2026-09', 'teste'); return r.extra.comInsumos + ' com composição; ' + r.extra.vinculo; });
await caso('SCO com preços Onerado/Desonerado invertidos', true, async () => A.converterSco(arquivosSco({ inverterPrecos: true }), '2026-09', 'teste'));
await caso('SCO com nome do ZIP O/D trocado', true, async () => A.converterSco(arquivosSco({ trocarNomeOD: true }), '2026-09', 'teste'));
await caso('SCO com mês errado', true, async () => A.converterSco(arquivosSco({ ref: '07/2026' }), '2026-09', 'teste'));
await caso('SCO faltando o catálogo Desonerado', true, async () => A.converterSco(arquivosSco().filter(a => !/DFGV06/.test(a.nome)), '2026-09', 'teste'));

console.log('--- links da página da Prefeitura');
await caso('agrupa links por mês (pasta do mês seguinte, sufixo -1)', false, async () => {
  const html = ['2026/10/ARQUIVOS-COM-CATALOGO-DAS-COMPOSICOES-O-EXCEL.zip', '2026/10/ARQUIVOS-COM-CATALOGO-DAS-COMPOSICOES-D-EXCEL.zip', '2026/10/ARQUIVOS-COM-CATALOGO-DAS-COMPOSICOES-O-PDF.zip', '2026/03/ARQUIVOS-COM-CATALOGO-DAS-COMPOSICOES-D-EXCEL-1.zip']
    .map(u => '<a href="https://controladoria.prefeitura.rio/wp-content/uploads/sites/29/' + u + '">x</a>').join('');
  const g = A.linksSco(html);
  if(g[0].ref !== '2026-09' || !g[0].links['O-EXCEL'] || !g[0].links['D-EXCEL'] || !g[0].links['O-PDF'] || g[1].ref !== '2026-02' || !/-1\.zip$/.test(g[1].links['D-EXCEL'])) throw new Error(JSON.stringify(g));
  return g.map(x => x.ref + ': ' + Object.keys(x.links).join(',')).join(' | ');
});
await caso('lê o mês em vários formatos', false, async () => {
  const t = [['08/2026', '2026-08'], ['Agosto/2026', '2026-08'], ['setembro de 2026', '2026-09'], [46235, '2026-08'], ['Março/2026', '2026-03']];
  const ruins = t.filter(([v, e]) => A.lerReferencia(v) !== e);
  if(ruins.length) throw new Error(ruins.map(([v, e]) => v + ' -> ' + A.lerReferencia(v) + ' (esperado ' + e + ')').join('; '));
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTodos os casos passaram.');
process.exit(falhas ? 1 : 0);
