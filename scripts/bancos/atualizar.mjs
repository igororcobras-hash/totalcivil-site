// Rotina mensal: baixa a SINAPI (Caixa, coluna RJ) e o SCO (Prefeitura do Rio), confere,
// converte no formato do programa e grava um arquivo por mês em orcamento/dados/, mantendo
// todos os meses anteriores (histórico). O programa lê orcamento/dados/indice.json.
//
// Uso:
//   node atualizar.mjs                          meses novos da SINAPI e do SCO
//   node atualizar.mjs --fonte sinapi           só a SINAPI (ou --fonte sco)
//   node atualizar.mjs --desde 2026-01          também busca meses antigos que faltam
//   node atualizar.mjs --sinapi-arquivo X.zip --ref 2026-09   usa um arquivo já baixado
//   node atualizar.mjs --sco-pasta pasta/ --ref 2026-09       idem (ZIPs/XLSX/PDF do SCO)
//   node atualizar.mjs --semear-embutido        grava o banco embutido (08/2026) como 1º mês
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { RAIZ, XLSX, carregarLeitores, matrizDaPrimeiraAba, textoDoPdf, bancoEmbutido } from './parsers.mjs';
import * as C from './conferencias.mjs';

const require = createRequire(import.meta.url);
const fflate = require('fflate');

const PASTA_DADOS = process.env.BANCOS_PASTA_DADOS || path.join(RAIZ, 'orcamento', 'dados');
const ARQ_INDICE = path.join(PASTA_DADOS, 'indice.json');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const PAGINA_SCO = 'https://controladoria.prefeitura.rio/tabelas-do-sistema-de-custos-para-obras-e-servicos-de-engenharia-sco-rio/';
const MODELO_SINAPI = process.env.SINAPI_URL_MODELO || 'https://www.caixa.gov.br/Downloads/sinapi-relatorios-mensais/SINAPI-{AAAA}-{MM}-formato-xlsx.zip';
const MESES_PT = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------------------------------------------------------------- utilidades
function args(){
  const a = process.argv.slice(2), o = {};
  for(let i = 0; i < a.length; i++){
    if(!a[i].startsWith('--')) continue;
    const k = a[i].slice(2);
    if(a[i + 1] && !a[i + 1].startsWith('--')){ o[k] = a[i + 1]; i++; } else o[k] = true;
  }
  return o;
}
const refParaCompetencia = ref => ref.slice(5, 7) + '/' + ref.slice(0, 4);   // 2026-09 -> 09/2026
function somarMes(ref, n){
  let a = +ref.slice(0, 4), m = +ref.slice(5, 7) + n;
  while(m > 12){ m -= 12; a++; } while(m < 1){ m += 12; a--; }
  return a + '-' + String(m).padStart(2, '0');
}
function mesAtual(){ const d = new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
function semAcento(s){ return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }

// Lê "08/2026", "agosto/2026", "Agosto de 2026" ou número de data do Excel -> "2026-08"
export function lerReferencia(v){
  if(v == null || v === '') return null;
  if(typeof v === 'number' && v > 20000 && v < 80000){
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }
  const s = semAcento(v);
  let m = /(\d{1,2})\s*\/\s*(\d{4})/.exec(s);
  if(m && +m[1] >= 1 && +m[1] <= 12) return m[2] + '-' + m[1].padStart(2, '0');
  m = /(\d{4})\s*[-/]\s*(\d{1,2})\b/.exec(s);
  if(m && +m[2] >= 1 && +m[2] <= 12) return m[1] + '-' + m[2].padStart(2, '0');
  for(let i = 0; i < 12; i++){
    const r = new RegExp(MESES_PT[i] + '\\s*(?:/|de|-)?\\s*(\\d{4})').exec(s);
    if(r) return r[1] + '-' + String(i + 1).padStart(2, '0');
  }
  return null;
}

async function baixar(url){
  let ultimoErro = null;
  for(let t = 1; t <= 3; t++){
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180000);
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'pt-BR,pt;q=0.9' }, redirect: 'follow', signal: ctrl.signal });
      clearTimeout(timer);
      if(r.status === 404) return { status: 404, buf: null };
      const buf = Buffer.from(await r.arrayBuffer());
      if(!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
      return { status: r.status, buf, tipo: r.headers.get('content-type') || '' };
    }catch(e){
      ultimoErro = e;
      await new Promise(res => setTimeout(res, 2000 * t * t));
    }
  }
  throw ultimoErro;
}
const ehZip = b => b && b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;

function abrirZip(buf){
  const arqs = fflate.unzipSync(new Uint8Array(buf));
  const out = [];
  for(const nome of Object.keys(arqs)){
    if(nome.endsWith('/') || /(^|\/)__MACOSX\//.test(nome)) continue;
    const b = Buffer.from(arqs[nome]);
    if(/\.zip$/i.test(nome) && ehZip(b)) out.push(...abrirZip(b).map(x => ({ nome: nome + '/' + x.nome, buf: x.buf })));
    else out.push({ nome, buf: b });
  }
  return out;
}

function lerIndice(){
  try{ return JSON.parse(fs.readFileSync(ARQ_INDICE, 'utf8')); }
  catch(e){ return { sobre: 'Bancos mensais SINAPI (RJ) e SCO-Rio gravados pela rotina scripts/bancos. Um arquivo por mês, nada é apagado.', sinapi: [], sco: [] }; }
}
function gravarIndice(ind){
  ind.atualizadoEm = new Date().toISOString();
  ['sinapi', 'sco'].forEach(k => ind[k].sort((a, b) => b.ref.localeCompare(a.ref)));
  fs.mkdirSync(PASTA_DADOS, { recursive: true });
  fs.writeFileSync(ARQ_INDICE, JSON.stringify(ind, null, 1) + '\n');
}
function lerMes(fonte, ref){
  const ind = lerIndice();
  const e = ind[fonte].find(x => x.ref === ref);
  if(!e) return null;
  return JSON.parse(Buffer.from(fflate.gunzipSync(fs.readFileSync(path.join(PASTA_DADOS, e.arquivo)))).toString('utf8'));
}
// Mês gravado mais recente antes de "ref" (para comparar); se não houver, o banco embutido
function anteriorDe(fonte, ref){
  const ind = lerIndice();
  const e = ind[fonte].filter(x => x.ref < ref).sort((a, b) => b.ref.localeCompare(a.ref))[0];
  if(e) return { ref: e.ref, dados: lerMes(fonte, e.ref) };
  const emb = bancoEmbutido()[fonte];
  return { ref: 'banco embutido ' + emb.competencia, dados: emb };
}
function gravarMes(fonte, ref, dados, extra){
  const arquivo = fonte + '/' + ref + '.json.gz';
  const caminho = path.join(PASTA_DADOS, arquivo);
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  const gz = fflate.gzipSync(new TextEncoder().encode(JSON.stringify(dados)), { level: 9, mtime: 0 });
  fs.writeFileSync(caminho, Buffer.from(gz));
  const ind = lerIndice();
  ind[fonte] = ind[fonte].filter(x => x.ref !== ref);
  ind[fonte].push(Object.assign({ ref, competencia: refParaCompetencia(ref), arquivo, bytes: gz.length, geradoEm: new Date().toISOString() }, extra));
  gravarIndice(ind);
  return arquivo;
}

// ---------------------------------------------------------------- SINAPI
export function converterSinapi(arquivos, refEsperada, origem){
  const L = carregarLeitores();
  const rel = C.novoRelatorio('SINAPI RJ ' + refParaCompetencia(refEsperada) + ' (' + origem + ')');
  // dentro do ZIP vêm várias planilhas; a de "Referência" é a que tem a aba ISD
  const xlsx = arquivos.filter(a => /\.xlsx?$/i.test(a.nome));
  xlsx.sort((a, b) => (/refer/i.test(b.nome) ? 1 : 0) - (/refer/i.test(a.nome) ? 1 : 0));
  let escolhido = null, wb = null;
  for(const a of xlsx){
    if(!/refer/i.test(a.nome) && xlsx.some(x => /refer/i.test(x.nome))) continue;
    const w = XLSX.read(a.buf, { type: 'buffer' });
    if(w.SheetNames.indexOf('ISD') >= 0){ escolhido = a; wb = w; break; }
  }
  if(!escolhido){
    rel.falha('nenhuma planilha com as abas ISD/ICD/CSD/CCD/Analítico (arquivos: ' + arquivos.map(a => a.nome).join(', ') + ')');
    rel.encerrar();
  }
  rel.ok('planilha usada: ' + escolhido.nome);
  C.conferirCabecalhosSinapi(rel, wb, L);
  rel.encerrar();

  const r = L.sinapi.parseXlsxOficialSinapi(new Uint8Array(escolhido.buf), 'RJ');
  const refArq = lerReferencia(r.referencia);
  rel.exigir(refArq === refEsperada, 'mês de referência do arquivo = ' + (refArq ? refParaCompetencia(refArq) : '?'),
    'o arquivo diz mês de referência "' + r.referencia + '", mas era esperado ' + refParaCompetencia(refEsperada));

  C.conferirQuantidades(rel, 'insumos', r.insumos.length, 3000);
  C.conferirQuantidades(rel, 'composições', r.composicoes.length, 5000);
  const nComAnalitico = r.composicoes.filter(c => r.compMap[c.CODIGO] && r.compMap[c.CODIGO].itens.length).length;
  rel.exigir(nComAnalitico >= r.composicoes.length * 0.9, 'composições com insumos detalhados: ' + nComAnalitico.toLocaleString('pt-BR'),
    'só ' + nComAnalitico + ' de ' + r.composicoes.length + ' composições têm insumos detalhados (aba Analítico incompleta?)');
  C.conferirZerados(rel, 'composições', r.composicoes, 40);
  C.conferirZerados(rel, 'insumos', r.insumos, 45);
  C.conferirOneradoDesonerado(rel, 'composições', r.composicoes);

  const ant = anteriorDe('sinapi', refEsperada);
  C.conferirContraAnterior(rel, 'insumos', r.insumos, ant.dados.insumos, ant.ref);
  C.conferirContraAnterior(rel, 'composições', r.composicoes, ant.dados.composicoes, ant.ref);
  C.conferirSomaComposicoes(rel, 'composições', r.compMap, ant.dados.compMap, ant.ref);
  rel.encerrar();

  return {
    rel,
    dados: { tipo: 'sinapi', competencia: refParaCompetencia(refEsperada), uf: 'RJ', insumos: r.insumos, composicoes: r.composicoes, compMap: r.compMap },
    extra: { uf: 'RJ', insumos: r.insumos.length, composicoes: r.composicoes.length, comInsumos: nComAnalitico, origem, planilha: escolhido.nome }
  };
}

async function rodarSinapi(op, log){
  const ind = lerIndice();
  const temos = new Set(ind.sinapi.map(x => x.ref));
  if(op['sinapi-arquivo']){
    if(!op.ref) throw new Error('--sinapi-arquivo precisa de --ref AAAA-MM');
    const buf = fs.readFileSync(op['sinapi-arquivo']);
    const arqs = ehZip(buf) && !/\.xlsx$/i.test(op['sinapi-arquivo']) ? abrirZip(buf) : [{ nome: path.basename(op['sinapi-arquivo']), buf }];
    const r = converterSinapi(arqs, op.ref, path.basename(op['sinapi-arquivo']));
    gravarMes('sinapi', op.ref, r.dados, r.extra);
    log.push(r.rel.texto(), '  → gravado SINAPI ' + refParaCompetencia(op.ref));
    return;
  }
  const ultimo = ind.sinapi.length ? ind.sinapi.map(x => x.ref).sort().pop() : '2026-08';
  let candidatos = [];
  const fim = somarMes(mesAtual(), -1);   // a Caixa publica o mês anterior
  let ini = op.desde || somarMes(ultimo, 1);
  for(let m = ini; m <= fim; m = somarMes(m, 1)) if(!temos.has(m)) candidatos.push(m);
  if(!candidatos.length){ log.push('SINAPI: nada novo (último gravado: ' + refParaCompetencia(ultimo) + ').'); return; }
  for(const ref of candidatos.slice(-36)){
    const url = MODELO_SINAPI.replace('{AAAA}', ref.slice(0, 4)).replace('{MM}', ref.slice(5, 7));
    const d = await baixar(url);
    if(d.status === 404){ log.push('SINAPI ' + refParaCompetencia(ref) + ': ainda não publicada (' + url + ' não existe).'); continue; }
    if(!ehZip(d.buf)) throw new C.ErroConferencia('SINAPI ' + refParaCompetencia(ref) + ': o site da Caixa respondeu uma página (' + d.tipo + ') em vez do ZIP. Provável bloqueio do site da Caixa. Endereço: ' + url);
    const r = converterSinapi(abrirZip(d.buf), ref, url);
    gravarMes('sinapi', ref, r.dados, r.extra);
    log.push(r.rel.texto(), '  → gravado SINAPI ' + refParaCompetencia(ref));
  }
}

// ---------------------------------------------------------------- SCO
// arquivos: [{nome, buf}] do mês (de dentro dos ZIPs O/D, Excel e PDF)
export async function converterSco(arquivos, refEsperada, origem){
  const L = carregarLeitores().sco;
  const rel = C.novoRelatorio('SCO-Rio ' + refParaCompetencia(refEsperada) + ' (' + origem + ')');
  const pend = { catO: null, catD: null, insO: null, insD: null, vincO: null, vincD: null };
  const refsArquivos = [];
  // O/D pelo nome do arquivo (o ZIP da Prefeitura se chama ...-O-EXCEL.zip / ...-D-EXCEL.zip)
  function odPeloNome(nome){
    const n = nome.toUpperCase();
    if(/COMPOSICOES-D-|(^|[\/ _-])D[ _-]?FGV|DESONERAD/.test(n)) return 'D';
    if(/COMPOSICOES-O-|(^|[\/ _-])O[ _-]?FGV|ONERAD/.test(n)) return 'O';
    return null;
  }
  function guardar(chave, valor, nome, desonPeloTexto){
    const od = odPeloNome(nome), odTexto = desonPeloTexto ? 'D' : 'O';
    if(od && od !== odTexto){ rel.falha(nome + ': o nome diz ' + (od === 'O' ? 'Onerado' : 'Desonerado') + ' mas o conteúdo diz ' + (odTexto === 'O' ? 'Onerado' : 'Desonerado')); return; }
    const k = chave + odTexto;
    if(pend[k]){ rel.falha('dois arquivos de ' + chave + ' ' + odTexto + ': ' + pend[k].file + ' e ' + nome); return; }
    pend[k] = Object.assign({ file: nome }, valor);
  }
  for(const a of arquivos){
    if(/\.xlsx?$/i.test(a.nome)){
      const matrix = matrizDaPrimeiraAba(a.buf);
      const cls = L.scoClassificarMatrix(matrix);
      const topo = matrix.slice(0, 6).map(r => (r || []).join(' ')).join(' ');
      if(cls.tipo === 'CATALOGO' || cls.tipo === 'INSUMOS'){
        const ra = lerReferencia((/refer[êe]ncia\s*:?\s*([^\s;|]+(?:\s+de\s+\d{4})?)/i.exec(topo) || [])[1] || topo);
        if(ra) refsArquivos.push({ nome: a.nome, ref: ra });
        guardar(cls.tipo === 'CATALOGO' ? 'cat' : 'ins', { matrix }, a.nome, cls.desonerado);
      } else if(/CAT[ÁA]LOGO DE COMPOSI[ÇC][ÕO]ES/i.test(topo)){
        // vínculo em planilha: vira texto linha a linha, como o PDF
        const texto = matrix.map(r => (r || []).filter(v => v !== '' && v != null).map(v => typeof v === 'number' ? String(v).replace('.', ',') : String(v).trim()).join(' ')).join('\n');
        const cv = L.scoClassificarTextoVinculo(texto);
        guardar('vinc', { parsed: L.scoParseVinculoTexto(texto) }, a.nome, cv.desonerado);
      }
    } else if(/\.pdf$/i.test(a.nome)){
      // só o vínculo (FGV07) interessa nos PDFs; o 1º trecho do texto diz o que é
      if(!/FGV\s*-?0?7/i.test(a.nome) && arquivos.some(x => /FGV\s*-?0?7/i.test(x.nome))) continue;
      const topo = await textoDoPdf(a.buf, 1);
      const cv = L.scoClassificarTextoVinculo(topo);
      if(cv.tipo !== 'VINCULO') continue;
      const texto = await textoDoPdf(a.buf);
      guardar('vinc', { parsed: L.scoParseVinculoTexto(texto) }, a.nome, cv.desonerado);
    }
  }
  ['catO', 'catD', 'insO', 'insD'].forEach(k => rel.exigir(!!pend[k], {
    catO: 'Catálogo de Itens de Serviço Onerado', catD: 'Catálogo de Itens de Serviço Desonerado',
    insO: 'Relação de Itens Elementares Onerado', insD: 'Relação de Itens Elementares Desonerado' }[k] + (pend[k] ? ': ' + pend[k].file : ''),
    'faltou o arquivo ' + k + ' (arquivos recebidos: ' + arquivos.map(a => a.nome).join(', ') + ')'));
  const refsDif = refsArquivos.filter(x => x.ref !== refEsperada);
  if(!refsArquivos.length) rel.aviso('os arquivos não dizem o mês; usado ' + refParaCompetencia(refEsperada) + ' pela página da Prefeitura');
  else rel.exigir(!refsDif.length, 'mês de referência dos arquivos = ' + refParaCompetencia(refEsperada),
    'mês dos arquivos diferente do esperado ' + refParaCompetencia(refEsperada) + ': ' + refsDif.map(x => x.nome + ' = ' + refParaCompetencia(x.ref)).join(', '));
  rel.encerrar();

  const catO = L.scoParseCatalogSheet(pend.catO.matrix), catD = L.scoParseCatalogSheet(pend.catD.matrix);
  const insO = L.scoParseInsumosSheet(pend.insO.matrix), insD = L.scoParseInsumosSheet(pend.insD.matrix);
  const itens = L.scoMontarComposicoes(catO, catD);
  const insumos = L.scoMontarInsumos(insO, insD);
  const ant = anteriorDe('sco', refEsperada);

  let vincO = pend.vincO ? pend.vincO.parsed : null, vincD = pend.vincD ? pend.vincD.parsed : null, vinculo;
  if(vincO || vincD){
    vinculo = [pend.vincO && pend.vincO.file, pend.vincD && pend.vincD.file].filter(Boolean).join(' + ');
    rel.ok('vínculo composição x insumos (FGV07): ' + vinculo);
  } else {
    // Sem o FGV07 no mês: usa os coeficientes do mês anterior com os preços novos (o programa
    // faz o mesmo quando se importa o SCO sem o vínculo)
    const comps = {};
    Object.keys(ant.dados.compMap || {}).forEach(function(k){
      const c = ant.dados.compMap[k];
      if(c.origemVinc === 'D') return;
      comps[k.replace(/^SCO-/, '')] = (c.itens || []).map(it => ({ descr: it.descr, codigo: String(it.codigo).replace(/^SCO-I-/, ''), unid: it.unid, qtd: it.qtd }));
    });
    vincO = { comps, nHash: 0, totalComps: Object.keys(comps).length };
    vinculo = 'coeficientes de ' + ant.ref + ' (o FGV07 não veio neste mês)';
    rel.aviso('o vínculo FGV07 não veio; composições abertas com os coeficientes de ' + ant.ref + ' e os preços novos');
  }
  const compMap = L.scoMontarCompMap(catO, catD, insO, insD, vincO, vincD);
  const nComp = Object.keys(compMap).length;

  C.conferirQuantidades(rel, 'itens de serviço', itens.length, 4000);
  C.conferirQuantidades(rel, 'insumos', insumos.length, 3000);
  rel.exigir(nComp >= itens.length * 0.85, 'itens com composição aberta: ' + nComp.toLocaleString('pt-BR'),
    'só ' + nComp + ' de ' + itens.length + ' itens com composição aberta (vínculo não casou com o catálogo?)');
  C.conferirZerados(rel, 'itens de serviço', itens, 10);
  C.conferirZerados(rel, 'insumos', insumos, 10);
  C.conferirOneradoDesonerado(rel, 'itens de serviço', itens);
  C.conferirContraAnterior(rel, 'itens de serviço', itens, ant.dados.itens, ant.ref);
  C.conferirContraAnterior(rel, 'insumos', insumos, ant.dados.insumos, ant.ref);
  C.conferirSomaComposicoes(rel, 'composições', compMap, ant.dados.compMap, ant.ref);
  rel.encerrar();

  return {
    rel,
    dados: { tipo: 'sco', competencia: refParaCompetencia(refEsperada), itens, insumos, compMap },
    extra: { itens: itens.length, insumos: insumos.length, comInsumos: nComp, vinculo, origem }
  };
}

// Links da página da Prefeitura, agrupados pela pasta de envio (AAAA/MM). A pasta é a do
// mês seguinte ao de referência (setembro/2026 fica em 2026/10).
export function linksSco(html){
  const re = /https?:\/\/controladoria\.prefeitura\.rio\/wp-content\/uploads\/sites\/\d+\/(\d{4})\/(\d{2})\/[^"'\s<>]*?COMPOSICOES-([OD])-(EXCEL|PDF)[^"'\s<>]*?\.zip/gi;
  const grupos = {};
  let m;
  while((m = re.exec(html))){
    const pasta = m[1] + '-' + m[2];
    const g = grupos[pasta] = grupos[pasta] || { pasta, ref: somarMes(pasta, -1), links: {} };
    const k = m[3].toUpperCase() + '-' + m[4].toUpperCase();
    if(!g.links[k]) g.links[k] = m[0];
  }
  return Object.values(grupos).sort((a, b) => b.ref.localeCompare(a.ref));
}

async function rodarSco(op, log){
  if(op['sco-pasta']){
    if(!op.ref) throw new Error('--sco-pasta precisa de --ref AAAA-MM');
    const arqs = [];
    for(const n of fs.readdirSync(op['sco-pasta'])){
      const buf = fs.readFileSync(path.join(op['sco-pasta'], n));
      if(/\.zip$/i.test(n)) abrirZip(buf).forEach(x => arqs.push({ nome: n + '/' + x.nome, buf: x.buf }));
      else arqs.push({ nome: n, buf });
    }
    const r = await converterSco(arqs, op.ref, op['sco-pasta']);
    gravarMes('sco', op.ref, r.dados, r.extra);
    log.push(r.rel.texto(), '  → gravado SCO ' + refParaCompetencia(op.ref));
    return;
  }
  const ind = lerIndice();
  const temos = new Set(ind.sco.map(x => x.ref));
  const ultimo = ind.sco.length ? ind.sco.map(x => x.ref).sort().pop() : '2026-08';
  const pag = await baixar(PAGINA_SCO);
  if(!pag.buf) throw new C.ErroConferencia('SCO: a página da Prefeitura não abriu (' + PAGINA_SCO + ')');
  const grupos = linksSco(pag.buf.toString('utf8'));
  if(!grupos.length) throw new C.ErroConferencia('SCO: não achei nenhum link de ZIP na página da Prefeitura. O site pode ter mudado: ' + PAGINA_SCO);
  const pendentes = grupos.filter(g => !temos.has(g.ref) && (op.desde ? g.ref >= op.desde : g.ref > ultimo));
  if(!pendentes.length){ log.push('SCO: nada novo (último gravado: ' + refParaCompetencia(ultimo) + '; mais recente no site: ' + refParaCompetencia(grupos[0].ref) + ').'); return; }
  for(const g of pendentes.reverse()){
    const precisa = ['O-EXCEL', 'D-EXCEL'];
    const faltam = precisa.filter(k => !g.links[k]);
    if(faltam.length){ log.push('SCO ' + refParaCompetencia(g.ref) + ': faltam os links ' + faltam.join(', ') + ' na página; pulado.'); continue; }
    const arqs = [];
    for(const k of ['O-EXCEL', 'D-EXCEL', 'O-PDF', 'D-PDF']){
      if(!g.links[k]) continue;
      const d = await baixar(g.links[k]);
      if(!d.buf || !ehZip(d.buf)){
        if(k.endsWith('PDF')){ log.push('SCO ' + refParaCompetencia(g.ref) + ': não consegui baixar ' + g.links[k] + ' (só traz o vínculo FGV07, sigo sem ele).'); continue; }
        throw new C.ErroConferencia('SCO ' + refParaCompetencia(g.ref) + ': ' + g.links[k] + ' não veio como ZIP');
      }
      abrirZip(d.buf).forEach(x => arqs.push({ nome: path.basename(g.links[k]) + '/' + x.nome, buf: x.buf }));
    }
    const r = await converterSco(arqs, g.ref, g.links['O-EXCEL']);
    gravarMes('sco', g.ref, r.dados, r.extra);
    log.push(r.rel.texto(), '  → gravado SCO ' + refParaCompetencia(g.ref));
  }
}

// ---------------------------------------------------------------- semente (08/2026)
function semearEmbutido(log){
  const e = bancoEmbutido();
  const ref = '2026-08';
  const s = e.sinapi;
  gravarMes('sinapi', ref, { tipo: 'sinapi', competencia: s.competencia, uf: 'RJ', insumos: s.insumos, composicoes: s.composicoes, compMap: s.compMap },
    { uf: 'RJ', insumos: s.insumos.length, composicoes: s.composicoes.length, comInsumos: Object.keys(s.compMap).length, origem: 'banco embutido no programa (V1-02-34)' });
  const o = e.sco;
  gravarMes('sco', ref, { tipo: 'sco', competencia: o.competencia, itens: o.itens, insumos: o.insumos, compMap: o.compMap },
    { itens: o.itens.length, insumos: o.insumos.length, comInsumos: Object.keys(o.compMap).length, vinculo: 'FGV07 Onerado', origem: 'banco embutido no programa (V1-02-34)' });
  log.push('Gravados SINAPI e SCO 08/2026 a partir do banco embutido no programa.');
}

// ---------------------------------------------------------------- principal
async function main(){
  const op = args();
  const log = [];
  const erros = [];
  if(op['semear-embutido']) semearEmbutido(log);
  const fonte = op.fonte || 'todas';
  for(const [nome, fn] of [['sinapi', rodarSinapi], ['sco', rodarSco]]){
    if(op['semear-embutido'] && !op.fonte) break;
    if(fonte !== 'todas' && fonte !== nome) continue;
    if(nome === 'sinapi' && op['sco-pasta'] && !op['sinapi-arquivo']) continue;
    if(nome === 'sco' && op['sinapi-arquivo'] && !op['sco-pasta']) continue;
    try{ await fn(op, log); }
    catch(e){ erros.push(e); log.push((e instanceof C.ErroConferencia ? '' : 'ERRO ' + nome.toUpperCase() + ': ') + (e.message || e)); }
  }
  const texto = log.join('\n');
  console.log(texto);
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + texto + '\n```\n');
  if(erros.length) process.exit(1);
}

export { main };
if(import.meta.url === 'file://' + process.argv[1]) main();
