// Usa os MESMOS leitores de planilha do programa (orcamento/index.html), para que o banco
// gravado pela rotina mensal saia igual ao que o botão "Atualizar" do programa monta.
// Os trechos são recortados do HTML entre funções conhecidas e executados aqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const XLSX = require('xlsx-js-style');

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, '..', '..');
export const HTML_PROGRAMA = path.join(RAIZ, 'orcamento', 'index.html');

function recortar(html, inicio, fim){
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a + 1);
  if(a < 0 || b < 0) throw new Error('Não achei no programa o trecho "' + inicio + '" … "' + fim + '". O leitor do programa mudou: atualize scripts/bancos/parsers.mjs.');
  return html.slice(a, b);
}

let _cache = null;
export function carregarLeitores(){
  if(_cache) return _cache;
  const html = fs.readFileSync(HTML_PROGRAMA, 'utf8');
  const codSinapi = recortar(html, 'function acharColunaUF(', 'async function extrairTextoPDF(');
  const codSco = recortar(html, 'function scoNormDescr(', 'async function lerMatrizXlsx(');
  const sinapi = new Function('XLSX', codSinapi + '\nreturn { acharColunaUF, acharLinhaHeader, sheetToRows, parseInsumosOficial, parseComposicoesOficial, parseAnaliticoOficial, montarEstruturasSinapi, parseXlsxOficialSinapi };')(XLSX);
  const sco = new Function('XLSX', codSco + '\nreturn { scoNormDescr, scoTwinInsumoCode, scoParseCatalogSheet, scoParseInsumosSheet, scoClassificarMatrix, scoClassificarTextoVinculo, scoParseVinculoTexto, scoMontarCompMap, scoMontarComposicoes, scoMontarInsumos };')(XLSX);
  _cache = { sinapi, sco };
  return _cache;
}

// Mesmo jeito de ler a 1ª aba que o lerMatrizXlsx do programa
export function matrizDaPrimeiraAba(buf){
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
}

// Mesmo jeito de juntar o texto do PDF que o extrairTextoPDF do programa (pdf.js 3.11.174)
export async function textoDoPdf(buf, maxPaginas){
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: true }).promise;
  const linhas = [];
  const ate = maxPaginas ? Math.min(maxPaginas, pdf.numPages) : pdf.numPages;
  for(let p = 1; p <= ate; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let linhaAtual = '';
    content.items.forEach(function(it){
      linhaAtual += it.str;
      if(it.hasEOL){ linhas.push(linhaAtual); linhaAtual = ''; }
    });
    if(linhaAtual.trim()) linhas.push(linhaAtual);
  }
  return linhas.join('\n');
}

// Bancos embutidos no programa (08/2026): servem de comparação para o 1º mês baixado
export function bancoEmbutido(){
  const html = fs.readFileSync(HTML_PROGRAMA, 'utf8');
  const fflate = require('fflate');
  function blob(nome){
    const m = new RegExp('window\\.' + nome + ' = "([^"]+)"').exec(html);
    if(!m) return null;
    return JSON.parse(Buffer.from(fflate.gunzipSync(Buffer.from(m[1], 'base64'))).toString('utf8'));
  }
  function meta(nome){
    const m = new RegExp('window\\.' + nome + ' = (\\{[^\\n]*\\});').exec(html);
    return m ? JSON.parse(m[1]) : {};
  }
  return {
    sinapi: { competencia: meta('SINAPI_EMBUTIDO_META').competencia, insumos: blob('SINAPI_INSUMOS_GZ_B64'), composicoes: blob('SINAPI_COMPOSICOES_GZ_B64'), compMap: blob('SINAPI_COMP_MAP_GZ_B64') },
    sco: { competencia: meta('SCO_EMBUTIDO_META').competencia, itens: blob('SCO_ITENS_GZ_B64'), insumos: blob('SCO_INSUMOS_GZ_B64'), compMap: blob('SCO_COMPMAP_GZ_B64') }
  };
}
