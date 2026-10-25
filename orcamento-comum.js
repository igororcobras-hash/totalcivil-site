/* Cronograma físico-financeiro — módulo comum Total Civil (cópia do usado na Drenagem e no Orçamento) */
(function(){
  if (window.TC_CRONO) return;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const r2 = v => Math.round(v * 100) / 100;
  const nf = (v, d) => (isFinite(v) ? v : 0).toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d});
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  // [palavras, início, fim (fração do prazo), concentra no 1º mês]
  const REGRAS = [
    [/PRELIMINAR.*SINALIZ|SINALIZ.*PRELIMINAR|PRELIMINAR.*ADMINISTRA/, 0, 1, true],
    [/DESMOBILIZ|LIMPEZA FINAL|LIMPEZA GERAL|ENTREGA|AS ?BUILT|CADASTRO/, 0.85, 1],
    [/PRELIMINAR|CANTEIRO|MOBILIZ|INSTALAC|PLACA|LOCACAO|PROJETO EXECUTIVO|LEVANTAMENTO|SONDAGE/, 0, 0.25, true],
    [/ADMINISTRA|MANUTENCAO DO CANTEIRO|SEGURANCA|ENGENHEIRO|CONSUMO|VIGIL|DESVIO|TRAFEGO/, 0, 1],
    [/DEMOLI|REMOC|RETIRADA|ARRANCAMENTO|FRESAGEM|SUPRESS|DESMATAMENTO|LIMPEZA DO TERRENO|LIMPEZA DE TERRENO|DESTOCA/, 0.03, 0.55],
    [/TERRAPLEN|MOVIMENTO DE TERRA|ESCAVAC|CORTE|ATERRO|REATERRO|REGULARIZAC|SUBLEITO|REFORCO/, 0.08, 0.7],
    [/TRANSPORTE|BOTA.?FORA|CARGA E DESCARGA/, 0.08, 0.75],
    [/FUNDAC|ESTACA|SAPATA|RADIER|BLOCO DE COROAMENTO/, 0.1, 0.5],
    [/ESGOTAMENTO|ESCORAMENTO|REBAIXAMENTO/, 0.1, 0.8],
    [/TUBULAC|TUBO|REDE|GALERIA|DRENAGEM|MICRODRENAGEM|MACRODRENAGEM|ADUELA|BUEIRO|ESGOTO|AGUA POTAVEL|ABASTECIMENTO/, 0.15, 0.85],
    [/POCO|POCOS|PV\b|CAIXA DE PASSAGEM|DISSIPADOR|BOCA DE LANCAMENTO|ALAS/, 0.2, 0.9],
    [/ESTRUTURA|CONCRETO|ALVENARIA|ARMADURA|FORMA/, 0.15, 0.8],
    [/CAIXA|BOCA DE LOBO|BOCA-DE-LOBO|RALO|GRELHA|MEIO.?FIO|GUIA|SARJETA|CANALETA/, 0.3, 0.92],
    [/SUB.?BASE|BASE|IMPRIMAC|PINTURA DE LIGACAO|PAVIMENT|RECOMPOSI|REVESTIMENTO|ASFALT|CBUQ|CONCRETO BETUMINOSO|INTERTRAV|PARALELE|BLOCOS|CALCADA|PASSEIO/, 0.45, 1],
    [/INSTALACOES ELETRICAS|ILUMINAC|HIDRAULIC|ESQUADRI|COBERTURA|IMPERMEABILIZ/, 0.4, 0.9],
    [/ACABAMENTO|PINTURA|SINALIZACAO HORIZONTAL|SINALIZACAO VERTICAL|SINALIZACAO VIARIA|PAISAG|PLANTIO|GRAMA|URBANIZ|MOBILIARIO|ACESSIBIL/, 0.65, 1],
    [/SINALIZAC/, 0, 1]
  ];
  function janela(nome, i, n){
    const t = norm(nome);
    for (const [re, a, b, frente] of REGRAS) if (re.test(t)) return {a, b, frente: !!frente, regra: true};
    // sem palavra conhecida: pela ordem das etapas, cada uma ocupando ~45% do prazo
    const d = n > 1 ? 0.55 / (n - 1) : 0, a = Math.min(0.55, i * d);
    return {a, b: Math.min(1, a + 0.45), frente: false, regra: false};
  }
  function distribuir(prazo, j){
    const w = [];
    for (let m = 0; m < prazo; m++){
      const m0 = m / prazo, m1 = (m + 1) / prazo;
      w.push(Math.max(0, Math.min(j.b, m1) - Math.max(j.a, m0)));
    }
    let s = w.reduce((x, y) => x + y, 0);
    if (s <= 0){ const k = Math.min(prazo - 1, Math.floor(j.a * prazo)); w.fill(0); w[k] = 1; s = 1; }
    if (j.frente && prazo > 1) { w[0] += s; s *= 2; }
    return fechar100(w.map(x => x / s * 100));
  }
  // arredonda a 2 casas e põe o resto no último mês com valor, para a linha fechar 100,00 %
  function fechar100(arr){
    const p = arr.map(r2); const tot = r2(p.reduce((x, y) => x + y, 0));
    if (Math.abs(tot - 100) > 1e-9 && p.some(x => x > 0)) { let k = p.length - 1; while (k > 0 && !(p[k] > 0)) k--; p[k] = r2(p[k] + 100 - tot); }
    return p;
  }
  function auto(etapas, prazo){
    const pct = {};
    etapas.forEach((e, i) => { pct[e.nome] = distribuir(prazo, janela(e.nome, i, etapas.length)); });
    return pct;
  }
  // garante que o estado tem uma linha para cada etapa e o tamanho do prazo
  function ajustar(estado, etapas){
    const pz = +estado.prazo || 0; if (!pz) return estado;
    estado.pct = estado.pct || {};
    const novo = auto(etapas, pz);
    etapas.forEach(e => {
      let v = estado.pct[e.nome];
      if (!v) { const k = Object.keys(estado.pct).find(x => norm(x) === norm(e.nome)); if (k) v = estado.pct[k]; }
      if (!Array.isArray(v) || v.length !== pz) v = novo[e.nome];
      estado.pct[e.nome] = v.map(x => +x || 0);
    });
    return estado;
  }
  function rotuloMes(estado, m){
    if (!estado.inicio || !/^\d{4}-\d{2}$/.test(estado.inicio)) return 'Mês ' + (m + 1);
    const [a, b] = estado.inicio.split('-').map(Number), d = new Date(a, b - 1 + m, 1);
    return 'Mês ' + (m + 1) + ' · ' + MES[d.getMonth()] + '/' + String(d.getFullYear()).slice(2);
  }
  function calc(estado, etapas){
    const pz = +estado.prazo || 0, total = etapas.reduce((s, e) => s + (+e.valor || 0), 0);
    const mens = Array(pz).fill(0), linhas = etapas.map(e => {
      const p = (estado.pct[e.nome] || []).slice(0, pz), soma = r2(p.reduce((x, y) => x + y, 0));
      const rs = p.map(x => r2((+e.valor || 0) * x / 100));
      if (Math.abs(soma - 100) < 0.005) { let k = rs.length - 1; while (k > 0 && !(rs[k] > 0)) k--; rs[k] = r2(rs[k] + r2(+e.valor || 0) - r2(rs.reduce((x, y) => x + y, 0))); }
      rs.forEach((v, m) => { mens[m] += v; });
      return {e, p, rs, soma};
    });
    let ac = 0; const acum = mens.map(v => (ac += v));
    return {pz, total, linhas, mens, acum, ok: linhas.every(l => Math.abs(l.soma - 100) < 0.005 || !(+l.e.valor))};
  }
  const CSS = `.tcc-wrap{overflow-x:auto;max-width:100%}.tcc{border-collapse:collapse;font-size:11.5px;min-width:100%;font-variant-numeric:tabular-nums}
.tcc th,.tcc td{border:1px solid rgba(120,130,150,.35);padding:3px 5px;text-align:right;white-space:nowrap;vertical-align:middle}
.tcc th{background:rgba(23,54,93,.9);color:#fff;font-weight:700;text-align:center}
.tcc td.tcc-n{text-align:left;white-space:normal;min-width:190px;font-weight:600}
.tcc input{width:58px;text-align:right;font:inherit;padding:2px 3px;border:1px solid rgba(180,150,0,.6);background:rgba(255,250,200,.55);color:inherit;border-radius:3px}
.tcc input:focus{outline:2px solid #2563eb}.tcc tr.tcc-rs td{color:rgba(90,100,120,1);font-size:10.5px}
.tcc td.tcc-ok{color:#1d7a35;font-weight:700}.tcc td.tcc-err{color:#b42318;font-weight:700;background:rgba(220,40,40,.08)}
.tcc tfoot td{font-weight:700;background:rgba(23,54,93,.08)}.tcc .tcc-bar{display:block;height:5px;background:#2563eb;border-radius:2px;margin-top:2px}
.tcc-top{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:flex-end;margin-bottom:8px}.tcc-top label{display:flex;flex-direction:column;font-size:11px;font-weight:600;gap:2px}
.tcc-top select,.tcc-top input{font:inherit;font-size:12px;padding:4px 6px;border:1px solid rgba(120,130,150,.6);border-radius:5px;background:inherit;color:inherit}
.tcc-top select.tcc-falta{border:2px solid #d97706;background:rgba(255,200,0,.15)}
.tcc-bt{font:inherit;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:6px;border:1px solid rgba(23,54,93,.5);background:rgba(23,54,93,.06);color:inherit;cursor:pointer}
.tcc-bt:hover{background:rgba(23,54,93,.14)}.tcc-msg{font-size:11.5px;padding:6px 9px;border-radius:6px;margin:6px 0;border:1px solid}
.tcc-msg.av{background:rgba(255,190,0,.13);border-color:#d97706}.tcc-msg.ok{background:rgba(30,160,70,.1);border-color:#1d7a35}.tcc-msg.in{background:rgba(37,99,235,.08);border-color:#2563eb}
@media(max-width:700px){.tcc td.tcc-n{min-width:130px}.tcc input{width:50px}}`;
  function estilo(){ if (document.getElementById('tcc-css')) return; const s = document.createElement('style'); s.id = 'tcc-css'; s.textContent = CSS; document.head.appendChild(s); }
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  /* caixa: elemento; estado: objeto salvo pelo programa; etapas: [{nome, valor}]; aoMudar(estado): salvar */
  function render(caixa, estado, etapas, aoMudar, opc){
    estilo(); opc = opc || {};
    const pz = +estado.prazo || 0, total = etapas.reduce((s, e) => s + (+e.valor || 0), 0);
    let h = `<div class="tcc-top">
      <label>Prazo da obra (meses) *<select data-tcc="prazo" class="${pz ? '' : 'tcc-falta'}"><option value="">Selecione o prazo…</option>${Array.from({length: 36}, (_, i) => `<option value="${i + 1}"${pz === i + 1 ? ' selected' : ''}>${i + 1} ${i ? 'meses' : 'mês'}</option>`).join('')}</select></label>
      <label>Início (opcional)<input type="month" data-tcc="inicio" value="${esc(estado.inicio || '')}"></label>
      ${pz ? `<button type="button" class="tcc-bt" data-tcc="auto" title="Refaz a distribuição pela sequência usual de obra (apaga suas alterações)">↺ Distribuir automaticamente</button>
      <button type="button" class="tcc-bt" data-tcc="fechar" title="Ajusta cada linha para somar 100 % mantendo as proporções que você digitou">⚖ Fechar linhas em 100 %</button>` : ''}
      ${opc.botoes || ''}</div>`;
    if (!pz) {
      h += `<div class="tcc-msg av">Selecione o <b>prazo da obra</b> para gerar o cronograma. Ele é montado automaticamente pela sequência usual dos serviços (preliminares no início, pavimento e acabamentos no fim) e depois você pode alterar qualquer porcentagem.</div>`;
      caixa.innerHTML = h; ligar(caixa, estado, etapas, aoMudar, opc); return;
    }
    ajustar(estado, etapas);
    const C = calc(estado, etapas);
    const ths = Array.from({length: pz}, (_, m) => `<th>${esc(rotuloMes(estado, m))}</th>`).join('');
    h += C.ok ? `<div class="tcc-msg ok">✓ Todas as etapas somam 100 %. Total ${'R$ ' + nf(C.total, 2)} em ${pz} ${pz > 1 ? 'meses' : 'mês'}. Digite a porcentagem de cada etapa em cada mês para alterar.</div>`
              : `<div class="tcc-msg av">⚠ Há etapa(s) que não somam 100 % (em vermelho na coluna Soma). Corrija os valores ou use <b>⚖ Fechar linhas em 100 %</b>.</div>`;
    h += `<div class="tcc-wrap"><table class="tcc"><thead><tr><th style="text-align:left">Etapa</th><th>Valor (R$)</th><th>% obra</th>${ths}<th>Soma</th></tr></thead><tbody>`;
    C.linhas.forEach((l, i) => {
      const pe = total ? l.e.valor / total * 100 : 0, bom = Math.abs(l.soma - 100) < 0.005 || !(+l.e.valor);
      h += `<tr><td class="tcc-n" rowspan="2">${esc(l.e.nome)}</td><td rowspan="2">${nf(+l.e.valor || 0, 2)}</td><td rowspan="2">${nf(pe, 2)} %</td>`
        + l.p.map((x, m) => `<td><input type="text" inputmode="decimal" data-tcc="pct" data-i="${i}" data-m="${m}" value="${x ? nf(x, 2) : ''}" placeholder="0" aria-label="${esc(l.e.nome)} — ${esc(rotuloMes(estado, m))} (%)"></td>`).join('')
        + `<td class="${bom ? 'tcc-ok' : 'tcc-err'}" rowspan="2">${nf(l.soma, 2)} %</td></tr>`
        + `<tr class="tcc-rs">${l.rs.map(v => `<td>${v ? nf(v, 2) : '—'}</td>`).join('')}</tr>`;
    });
    h += `</tbody><tfoot>
      <tr><td class="tcc-n">Total mensal (R$)</td><td>${nf(C.total, 2)}</td><td>100,00 %</td>${C.mens.map(v => `<td>${nf(v, 2)}</td>`).join('')}<td></td></tr>
      <tr><td class="tcc-n">% mensal</td><td></td><td></td>${C.mens.map(v => `<td>${nf(C.total ? v / C.total * 100 : 0, 2)} %</td>`).join('')}<td></td></tr>
      <tr><td class="tcc-n">Acumulado (R$)</td><td></td><td></td>${C.acum.map(v => `<td>${nf(v, 2)}</td>`).join('')}<td></td></tr>
      <tr><td class="tcc-n">% acumulado</td><td></td><td></td>${C.acum.map(v => { const p = C.total ? v / C.total * 100 : 0; return `<td>${nf(p, 2)} %<span class="tcc-bar" style="width:${Math.max(0, Math.min(100, p))}%"></span></td>`; }).join('')}<td></td></tr>
    </tfoot></table></div>`;
    if (opc.nota) h += `<div class="tcc-msg in">${opc.nota}</div>`;
    caixa.innerHTML = h; ligar(caixa, estado, etapas, aoMudar, opc);
  }
  function ligar(caixa, estado, etapas, aoMudar, opc){
    const refaz = () => { aoMudar && aoMudar(estado); render(caixa, estado, etapas, aoMudar, opc); };
    caixa.querySelectorAll('[data-tcc]').forEach(el => {
      const k = el.dataset.tcc;
      if (k === 'prazo') el.onchange = () => { estado.prazo = +el.value || 0; estado.pct = estado.prazo ? auto(etapas, estado.prazo) : {}; refaz(); };
      else if (k === 'inicio') el.onchange = () => { estado.inicio = el.value || ''; refaz(); };
      else if (k === 'auto') el.onclick = () => { estado.pct = auto(etapas, +estado.prazo); refaz(); };
      else if (k === 'fechar') el.onclick = () => {
        etapas.forEach(e => { const p = estado.pct[e.nome] || [], s = p.reduce((x, y) => x + (+y || 0), 0);
          estado.pct[e.nome] = s > 0 ? fechar100(p.map(x => (+x || 0) / s * 100)) : distribuir(+estado.prazo, janela(e.nome, 0, 1)); });
        refaz(); };
      else if (k === 'pct') el.onchange = () => {
        const e = etapas[+el.dataset.i], v = parseFloat(String(el.value).replace(/\./g, '').replace(',', '.'));
        estado.pct[e.nome][+el.dataset.m] = isFinite(v) ? Math.max(0, Math.min(100, r2(v))) : 0; refaz(); };
    });
  }
  /* aba do Excel: linha de % e linha de R$ por etapa + totais (como nos cronogramas de licitação) */
  function planilha(XLSX, estado, etapas, cab){
    ajustar(estado, etapas);
    const C = calc(estado, etapas), pz = C.pz;
    const meses = Array.from({length: pz}, (_, m) => rotuloMes(estado, m));
    const aoa = (cab || []).map(x => [x]);
    aoa.push(['Prazo: ' + pz + (pz > 1 ? ' meses' : ' mês') + (estado.inicio ? ' · início ' + rotuloMes(estado, 0).split(' · ')[1] : '')], []);
    aoa.push(['ITEM', 'ETAPA', 'VALOR (R$)', '% DA OBRA', '', ...meses, 'TOTAL']);
    C.linhas.forEach((l, i) => {
      const pe = C.total ? l.e.valor / C.total : 0;
      aoa.push([String(i + 1), l.e.nome, r2(+l.e.valor || 0), pe, '%', ...l.p.map(x => x / 100), l.soma / 100]);
      aoa.push(['', '', '', '', 'R$', ...l.rs, r2(l.rs.reduce((a, b) => a + b, 0))]);
    });
    aoa.push([], ['', 'TOTAL MENSAL (R$)', r2(C.total), 1, '', ...C.mens.map(r2), r2(C.total)]);
    aoa.push(['', '% MENSAL', '', '', '', ...C.mens.map(v => C.total ? v / C.total : 0), 1]);
    aoa.push(['', 'ACUMULADO (R$)', '', '', '', ...C.acum.map(r2), '']);
    aoa.push(['', '% ACUMULADO', '', '', '', ...C.acum.map(v => C.total ? v / C.total : 0), '']);
    const ws = XLSX.utils.aoa_to_sheet(aoa), h0 = (cab || []).length + 2;
    for (let r = h0 + 1; r < aoa.length; r++) aoa[r].forEach((v, c) => {
      if (typeof v !== 'number') return; const cel = ws[XLSX.utils.encode_cell({r, c})]; if (!cel) return;
      const rot = aoa[r][4], tit = aoa[r][1];
      cel.z = (c === 3 || rot === '%' || /^%/.test(tit)) ? '0.00%' : '#,##0.00';
    });
    ws['!cols'] = [{wch: 6}, {wch: 44}, {wch: 15}, {wch: 9}, {wch: 4}, ...meses.map(() => ({wch: 14})), {wch: 14}];
    return ws;
  }
  window.TC_CRONO = {auto, ajustar, render, planilha, calc, rotuloMes, norm, janela, versao: 1};
})();

/* =====================================================================
   ORÇAMENTO COMUM DOS PROGRAMAS — Total Civil (25/10/2026)
   Mesma janela "3 soluções com orçamento" da Drenagem Pluvial, para os
   demais programas: EMOP, SINAPI RJ e SCO-Rio, BDI, memória de cálculo,
   cronograma, planilha para o programa de Orçamento e envio direto.
   - Cada programa registra: TCORC.registrar({prog, nome, solucoes, grupos,
     params, itens(sol, banco, ctx)}) e chama TCORC.abrir('prog').
   - itens() devolve [{g, nome, un, q, cod:{emop,sinapi,sco}, memo, qb}] com
     códigos que existem nos bancos; código sem preço no banco escolhido usa
     o equivalente de outro banco (coluna Fonte). Nunca se inventa código.
   - Bancos: /orcamento/dados (SINAPI e SCO mensais) e a EMOP que o usuário
     carregou no programa de Orçamento neste aparelho (só códigos se não houver).
   - TCORC.resumo('prog', elemento): mostra o custo logo após cada cálculo.
   - Pacote: cada programa deixa o último orçamento em tcorc_pacote_v1; o botão
     "Juntar programas" monta uma planilha única com todos e envia ao Orçamento.
   ===================================================================== */
(function(){
  'use strict';
  if (window.TCORC) return;
  var DADOS = '/orcamento/dados/';
  var BANCOS = {emop: 'EMOP', sinapi: 'SINAPI RJ', sco: 'SCO-Rio'};
  var KEY_CFG = 'tcorc_cfg_v1', KEY_PAC = 'tcorc_pacote_v1', KEY_ENV = 'tc_envio_orcamento';
  var LIB_XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var PROGS = {}, BK = {}, CACHE = {}, IDX = null, ST = {prog: null, ver: 'rec', res: null, carregando: false, aviso: [], refs: {}, params: {}};

  function lsGet(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  var nf = function(v, d){ return (isFinite(v) ? v : 0).toLocaleString('pt-BR', {minimumFractionDigits: d, maximumFractionDigits: d}); };
  var R$ = function(v){ return isFinite(v) && v != null ? 'R$ ' + nf(v, 2) : '—'; };
  var r2 = function(v){ return Math.round(v * 100) / 100; };
  var slug = function(t){ return String(t || 'projeto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'projeto'; };
  var hoje = function(){ var d = new Date(), z = function(n){ return String(n).padStart(2, '0'); }; return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()); };
  function toast(m){
    var t = document.getElementById('tco-toast');
    if (!t) { t = document.createElement('div'); t.id = 'tco-toast'; t.className = 'tco-toast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(function(){ t.classList.remove('on'); }, 4200);
  }

  /* ---------- configuração comum (banco, regime, BDI) ---------- */
  function cfg(){ var c = lsGet(KEY_CFG, {}); return Object.assign({banco: 'sinapi', regime: 'O', bdi: 25}, c); }
  function cfgSet(k, v){ var c = cfg(); c[k] = v; lsSet(KEY_CFG, c); }
  function bancoAtual(){ var c = cfg(); if (!BANCOS[c.banco]) return 'sinapi'; if (c.banco === 'emop' && !BK.emop) return 'sinapi'; return c.banco; }

  /* ---------- bancos SINAPI e SCO (site) e EMOP (Orçamento, neste aparelho) ---------- */
  async function lerIndice(){
    if (IDX) return IDX;
    var r = await fetch(DADOS + 'indice.json', {cache: 'no-cache'});
    if (!r.ok) throw new Error('índice indisponível (' + r.status + ')');
    IDX = await r.json(); return IDX;
  }
  async function lerBanco(tipo, ref){
    var k = tipo + ':' + ref; if (CACHE[k]) return CACHE[k];
    var idx = await lerIndice(), it = (idx[tipo] || []).find(function(x){ return x.ref === ref; });
    if (!it) throw new Error('mês ' + ref + ' não encontrado');
    var r = await fetch(DADOS + it.arquivo); if (!r.ok) throw new Error('falha ao baixar ' + it.arquivo);
    if (!window.DecompressionStream) throw new Error('navegador sem descompressão nativa — atualize o Chrome/Safari');
    var txt = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
    var d = JSON.parse(txt); CACHE[k] = {map: d.compMap || {}, comp: d.competencia || it.competencia, it: it}; return CACHE[k];
  }
  var ultimoRef = function(idx, tipo){ return ((idx[tipo] || []).map(function(x){ return x.ref; }).sort().pop()) || ''; };
  async function lerEmopLocal(){
    var out = null;
    var montar = function(lista, meta){ var map = {}; lista.forEach(function(d){ if (d && d.CODIGO) map[String(d.CODIGO).trim()] = d; }); return Object.keys(map).length ? {map: map, meta: meta || {}, n: Object.keys(map).length} : null; };
    try {
      var existe = true;
      if (indexedDB.databases) { var l = await indexedDB.databases(); existe = l.some(function(d){ return d.name === 'SchuelerHistoricoDB_v1'; }); }
      if (existe) {
        var db = await new Promise(function(ok, ko){
          var rq = indexedDB.open('SchuelerHistoricoDB_v1');
          rq.onupgradeneeded = function(e){ try { e.target.transaction.abort(); } catch (x) {} };
          rq.onsuccess = function(){ ok(rq.result); }; rq.onerror = function(){ ko(rq.error); };
        });
        if (db.objectStoreNames.contains('settings')) {
          var get = function(k){ return new Promise(function(ok){ try { var r = db.transaction('settings').objectStore('settings').get(k); r.onsuccess = function(){ ok(r.result ? r.result.value : null); }; r.onerror = function(){ ok(null); }; } catch (e) { ok(null); } }); };
          var dipr = await get('emopDiprOverride'), meta = await get('emopImportMeta');
          if (Array.isArray(dipr) && dipr.length) out = montar(dipr, meta);
        }
        db.close();
      }
    } catch (e) { /* sem acesso ao banco do Orçamento */ }
    if (!out) { try { var c = JSON.parse(localStorage.getItem('orcadipr_base_v11') || '[]'); if (Array.isArray(c) && c.some(function(x){ return /^\d\d\.\d{3}\.\d{4}-/.test(x.CODIGO); })) out = montar(c, {origem: 'catálogo salvo'}); } catch (e) {} }
    return out;
  }
  async function carregarBancos(){
    ST.aviso = [];
    try {
      var idx = await lerIndice();
      for (var t of ['sinapi', 'sco']) {
        var ref = ultimoRef(idx, t);
        if (!ref) { ST.aviso.push((t === 'sinapi' ? 'SINAPI' : 'SCO-Rio') + ': nenhum mês publicado no site.'); continue; }
        try { BK[t] = await lerBanco(t, ref); ST.refs[t] = BK[t].comp || ref; } catch (e) { ST.aviso.push((t === 'sinapi' ? 'SINAPI' : 'SCO-Rio') + ': ' + e.message + '.'); }
      }
    } catch (e) { ST.aviso.push('Bancos SINAPI e SCO-Rio indisponíveis (' + e.message + '). Confira a internet.'); }
    BK.emop = await lerEmopLocal();
    ST.refs.emop = BK.emop ? (BK.emop.meta.importadoEm ? 'importada em ' + String(BK.emop.meta.importadoEm).slice(0, 10) : 'importada no Orçamento') : '';
  }

  /* ---------- localização do código em cada banco ---------- */
  /* descrição e sufixo (onerado/desonerado) dos códigos EMOP usados pelos programas (conferidos no catálogo da Drenagem) */
  var EMOP_TAB = {
    '01.018.0002': ['M', 'LOCACAO DE OBRA COM APARELHO TOPOGRAFICO SOBRE CERCA DE MARCACAO', '0'],
    '02.020.0001': ['M2', 'PLACA DE IDENTIFICACAO DE OBRA PUBLICA,INCLUSIVE PINTURA E SUPORTES DE MADEIRA.FORNECIMENTO E COLOCACAO', '0'],
    '05.002.0005': ['M2', 'DEMOLICAO COM EQUIPAMENTO DE AR COMPRIMIDO,DE PAVIMENTACAO DE CONCRETO ASFALTICO,COM 5CM DE ESPESSURA', '1'],
    '03.011.0015': ['M3', 'REATERRO DE VALA/CAVA COM MATERIAL DE BOA QUALIDADE,UTILIZANDO VIBRO COMPACTADOR PORTATIL,EXCLUSIVE MATERIAL', '1'],
    '04.011.0052': ['T', 'CARGA E DESCARGA MECANICA,COM PA-CARREGADEIRA,COM 1,30M3 DE CAPACIDADE,UTILIZANDO CAMINHAO BASCULANTE', '1'],
    '04.005.0143': ['T X KM', 'TRANSPORTE DE CARGA DE QUALQUER NATUREZA,EXCLUSIVE AS DESPESAS DE CARGA E DESCARGA', '1'],
    '08.001.0002': ['M3', 'BASE DE BRITA GRADUADA,INCLUSIVE FORNECIMENTO DOS MATERIAIS,MEDIDA APOS A COMPACTACAO', '1'],
    '08.026.0001': ['M2', 'IMPRIMACAO DE BASE DE PAVIMENTACAO,DE ACORDO COM AS "INSTRUCOES PARA EXECUCAO",DO DER-RJ', '0'],
    '08.026.0002': ['M2', 'PINTURA DE LIGACAO,DE ACORDO COM AS "INSTRUCOES PARA EXECUCAO",DO DER-RJ', '0'],
    '08.015.0068': ['T', 'REVESTIMENTO DE CONCRETO BETUMINOSO USINADO A QUENTE,IMPORTADO DE USINA,EXECUTADO EM UMA CAMADA', '0'],
    '08.037.0070': ['T', 'REVESTIMENTO DE CONCRETO BETUMINOSO USINADO A QUENTE,CONSIDERANDO SOMENTE O ESPALHAMENTO COM VIBROACABADORA', '0']
  };
  var sufEmop = function(s, regime){ return regime === 'D' ? (s === '1' ? 'B' : 'A') : s; };
  function idxSco(B){ if (B.idx) return B.idx; B.idx = {}; Object.keys(B.map).forEach(function(k){ B.idx[k.replace(/\s*\([^)]*\)\s*$/, '')] = k; }); return B.idx; }
  function resolve1(bank, s, regime){
    if (s == null || s === false) return null;
    if (Array.isArray(s)) { for (var i = 0; i < s.length; i++) { var x = resolve1(bank, s[i], regime); if (x && (x.preco != null || x.semBanco)) return x; } return null; }
    if (typeof s !== 'string') return null;
    if (bank === 'emop') {
      var t = EMOP_TAB[s] || ['', '', '0'], E = BK.emop, full = s + '-' + sufEmop(t[2], regime);
      if (E) {
        var v = E.map[full] || E.map[s + '-' + sufEmop(t[2] === '0' ? '1' : '0', regime)];
        if (!v) return null;
        var p = +v.CUSTO;
        return {full: v.CODIGO, cod: v.CODIGO, descr: v.DESCR1 || t[1], unid: v.UNID || t[0], preco: p > 0 ? p : null, src: 'emop'};
      }
      return {full: full, cod: full, descr: t[1], unid: t[0], preco: null, src: 'emop', semBanco: true};
    }
    var B = BK[bank]; if (!B) return null;
    var key = bank === 'sco' ? (B.map[s] ? s : idxSco(B)[s]) : (B.map[s] ? s : null);
    if (!key) return null;
    var c = B.map[key], pr = regime === 'D' ? c.precoCom : c.preco;
    pr = isFinite(+pr) ? +pr : null;
    return {full: key, cod: key.replace(/^S[CI]-|^SCO-/, '').replace(/\s*\([^)]*\)\s*$/, ''), descr: c.descr, unid: c.unid, preco: pr > 0 ? pr : null, src: bank};
  }

  /* ---------- orçamento de uma solução num banco ---------- */
  function params(prog){
    var P = PROGS[prog], salvo = lsGet('tcorc_p_' + prog, {}), o = {};
    (P.params || []).forEach(function(d){ o[d.k] = salvo[d.k] != null ? salvo[d.k] : d.val; });
    return o;
  }
  function itensDe(prog, sol, bank){
    var P = PROGS[prog];
    var r = P.itens(sol, bank, {params: params(prog), cfg: cfg()});
    return r;
  }
  function orcar(prog, sol, bank, itens){
    var P = PROGS[prog], c = cfg(), rg = c.regime;
    var ordem = bank === 'emop' ? ['emop', 'sinapi', 'sco'] : bank === 'sinapi' ? ['sinapi', 'sco', 'emop'] : ['sco', 'sinapi', 'emop'];
    var linhas = [];
    itens.forEach(function(it){
      var r = null, b = null, cod = it.cod || {};
      if (cod[bank] === false) return;
      for (var i = 0; i < ordem.length; i++) {
        var bb = ordem[i];
        if (bb !== bank && cod[bb] === false) continue;
        var x = resolve1(bb, cod[bb], rg);
        if (!x) continue;
        if (x.preco == null && !(bb === 'emop' && bank === 'emop' && x.semBanco)) continue;
        r = x; b = bb; break;
      }
      var qv = b && it.qb && it.qb[b] != null ? it.qb[b] : it.q;
      linhas.push({g: it.g, nome: it.nome, un: r && r.unid ? r.unid : it.un, q: qv, r: r, b: b, memo: [it.memo], preco: r ? r.preco : null});
    });
    linhas.forEach(function(L){ L.total = L.preco != null ? L.q * L.preco : null; });
    var sub = linhas.reduce(function(a, x){ return a + (x.total || 0); }, 0), bdi = +c.bdi || 0;
    return {sol: sol, bank: bank, linhas: linhas, sub: sub, bdi: bdi, total: sub * (1 + bdi / 100), semPreco: linhas.filter(function(x){ return x.preco == null; }).length};
  }
  function calcTudo(prog){
    var P = PROGS[prog], res = {}, erro = null;
    for (var i = 0; i < P.solucoes.length; i++) {
      var s = P.solucoes[i]; res[s.k] = {};
      for (var b in BANCOS) {
        var it = itensDe(prog, s, b);
        if (it && it.erro) { erro = it.erro; continue; }
        res[s.k][b] = orcar(prog, s, b, it || []);
      }
    }
    ST.erro = erro; ST.res = erro ? null : res; return ST.res;
  }
  function guardarPacote(prog){
    if (!ST.res) return;
    var P = PROGS[prog], bk = bancoAtual(), o = ST.res[ST.ver] && ST.res[ST.ver][bk]; if (!o) return;
    var pac = lsGet(KEY_PAC, {});
    pac[prog] = secao(prog, o);
    pac[prog].em = new Date().toISOString();
    lsSet(KEY_PAC, pac);
  }
  function secao(prog, o){
    var P = PROGS[prog], pj = P.projeto ? P.projeto() : {}, c = cfg();
    var grupos = [];
    P.grupos.forEach(function(g){
      var ls = o.linhas.filter(function(x){ return x.g === g; }); if (!ls.length) return;
      grupos.push({g: g, linhas: ls.map(function(x){
        return {cod: x.r ? x.r.full : '', nome: x.nome, descr: x.r && x.r.descr && !x.r.semBanco ? x.r.descr : x.nome, un: x.un, q: x.q, preco: x.preco, fonte: x.r ? BANCOS[x.r.src] + (x.r.semBanco ? ' (preço no Orçamento)' : '') : 'sem composição — escolher no Orçamento', memo: x.memo.join('; ')};
      })});
    });
    return {prog: prog, nome: P.nome, projeto: pj.nome || '', municipio: pj.municipio || '', sol: o.sol.nome, solDesc: o.sol.desc, banco: BANCOS[o.bank], bancoRef: ST.refs[o.bank] || '', regime: c.regime, bdi: +c.bdi || 0, grupos: grupos};
  }

  /* ---------- planilha para o Importar do programa de Orçamento ---------- */
  async function carregarXlsx(){
    if (window.XLSX) return;
    await new Promise(function(ok, ko){ var s = document.createElement('script'); s.src = LIB_XLSX; s.onload = ok; s.onerror = function(){ ko(new Error('sem internet')); }; document.head.appendChild(s); });
  }
  function aoaDe(secoes, titulo){
    var H = ['ITEM', 'CÓDIGO', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'VALOR UNITÁRIO', 'TOTAL', 'FONTE'];
    var s0 = secoes[0], aoa = [[titulo], [secoes.length === 1 ? (s0.projeto + (s0.municipio ? ' — ' + s0.municipio : '')) : 'Programas: ' + secoes.map(function(s){ return s.nome; }).join(' · ')],
      [secoes.length === 1 ? 'Banco ' + s0.banco + (s0.bancoRef ? ' ' + s0.bancoRef : '') + ' · ' + (s0.regime === 'D' ? 'desonerado' : 'não desonerado') + ' · preços sem BDI; BDI de referência ' + nf(s0.bdi, 2) + ' %' : 'Preços sem BDI; cada programa com o banco escolhido nele'], [], H];
    var mem = [['MEMÓRIA DE CÁLCULO DAS QUANTIDADES'], [], ['ITEM', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'MEMÓRIA DE CÁLCULO']];
    var gi = 0, sub = 0;
    secoes.forEach(function(sc){
      sc.grupos.forEach(function(gr){
        gi++; var nomeG = sc.nome.toUpperCase() + ' — ' + gr.g;
        aoa.push([String(gi), '', nomeG, '', '', '', '', '']); mem.push([String(gi), nomeG, '', '', '']);
        var st = 0;
        gr.linhas.forEach(function(x, j){
          var q = r2(x.q), p = x.preco != null ? r2(x.preco) : '', t = p !== '' ? r2(q * p) : '';
          if (t !== '') st += t;
          aoa.push([gi + '.' + (j + 1), x.cod, x.descr, x.un, q, p, t, x.fonte]); mem.push([gi + '.' + (j + 1), x.nome, x.un, q, x.memo]);
        });
        aoa.push(['', '', 'SUBTOTAL DO ITEM ' + gi, '', '', '', r2(st), '']); sub += st;
      });
    });
    var bdi = secoes[0].bdi;
    aoa.push([], ['', '', 'TOTAL SEM BDI', '', '', '', r2(sub), ''], ['', '', 'BDI ' + nf(bdi, 2) + ' %', '', '', '', r2(sub * bdi / 100), ''], ['', '', 'TOTAL GERAL', '', '', '', r2(sub * (1 + bdi / 100)), '']);
    return {aoa: aoa, mem: mem};
  }
  async function wbDe(secoes, titulo, cronoAba){
    await carregarXlsx();
    var A = aoaDe(secoes, titulo), wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(A.aoa);
    A.aoa.forEach(function(row, ri){ row.forEach(function(v, ci){ if (typeof v === 'number' && ri > 4) { var c = ws[XLSX.utils.encode_cell({r: ri, c: ci})]; if (c) c.z = '#,##0.00'; } }); });
    ws['!cols'] = [{wch: 7}, {wch: 26}, {wch: 80}, {wch: 8}, {wch: 12}, {wch: 14}, {wch: 15}, {wch: 26}];
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');
    var wm = XLSX.utils.aoa_to_sheet(A.mem); wm['!cols'] = [{wch: 7}, {wch: 60}, {wch: 8}, {wch: 12}, {wch: 110}];
    XLSX.utils.book_append_sheet(wb, wm, 'Memória de cálculo');
    if (secoes.length === 1) {
      var sc = secoes[0], wsol = XLSX.utils.aoa_to_sheet([['SOLUÇÃO'], [sc.sol], [sc.solDesc], [], ['Quantidades calculadas pelo programa ' + sc.nome + ' a partir do dimensionamento; confira os critérios na aba Memória de cálculo.']]);
      wsol['!cols'] = [{wch: 120}]; XLSX.utils.book_append_sheet(wb, wsol, 'Solução');
    }
    if (cronoAba) XLSX.utils.book_append_sheet(wb, cronoAba, 'Cronograma');
    wb.Props = {Title: titulo, Author: secoes[0].projeto || 'Total Civil', Company: 'Total Civil'};
    return wb;
  }
  function etapasDe(o, prog){
    var P = PROGS[prog], f = 1 + (+o.bdi || 0) / 100;
    return P.grupos.filter(function(g){ return o.linhas.some(function(x){ return x.g === g; }); })
      .map(function(g){ return {nome: P.nome.toUpperCase() + ' — ' + g, valor: r2(o.linhas.filter(function(x){ return x.g === g; }).reduce(function(a, x){ return a + (x.total || 0); }, 0) * f)}; });
  }
  function cronoEstado(prog){ var e = lsGet('tcorc_crono_' + prog, null); return Object.assign({prazo: 0, inicio: '', pct: {}}, e || {}); }
  async function exportar(prog){
    var o = atual(prog); if (!o) return;
    var P = PROGS[prog], sc = secao(prog, o), cr = cronoEstado(prog), et = etapasDe(o, prog), aba = null;
    try { await carregarXlsx(); } catch (e) { toast('Sem internet para gerar o .xlsx. Conecte e tente de novo.'); return; }
    if (cr.prazo && et.length && window.TC_CRONO) aba = TC_CRONO.planilha(XLSX, cr, et, ['CRONOGRAMA FÍSICO-FINANCEIRO — ' + P.nome.toUpperCase(), sc.projeto, 'Banco ' + sc.banco + ' · valores com BDI de ' + nf(sc.bdi, 2) + ' %']);
    var wb = await wbDe([sc], 'ORÇAMENTO — ' + P.nome.toUpperCase() + ' — ' + o.sol.nome.toUpperCase(), aba);
    XLSX.writeFile(wb, 'orcamento-' + prog + '-' + o.sol.k + '-' + o.bank + '-' + slug(sc.projeto) + '-' + hoje() + '.xlsx');
    toast(cr.prazo ? 'Planilha gerada com orçamento, memória e cronograma.' : 'Planilha gerada. Escolha o prazo para incluir o cronograma.');
  }
  async function exportarComparativo(prog){
    if (!ST.res) return;
    var P = PROGS[prog], bk = bancoAtual(), c = cfg();
    try { await carregarXlsx(); } catch (e) { toast('Sem internet para gerar o .xlsx.'); return; }
    var pj = P.projeto ? P.projeto() : {};
    var aoa = [['COMPARATIVO DAS 3 SOLUÇÕES — ' + P.nome.toUpperCase()], [pj.nome || ''], ['Totais com BDI de ' + nf(+c.bdi || 0, 2) + ' % · ' + (c.regime === 'D' ? 'desonerado' : 'não desonerado')], [], ['SOLUÇÃO'].concat(Object.keys(BANCOS).map(function(b){ return BANCOS[b] + ' (R$)'; }), ['DESCRIÇÃO'])];
    P.solucoes.forEach(function(s){ aoa.push([s.nome].concat(Object.keys(BANCOS).map(function(b){ return r2(ST.res[s.k][b].total); }), [s.desc])); });
    aoa.push([], ['SUBTOTAL POR GRUPO — ' + BANCOS[bk] + ' (sem BDI)'].concat(P.solucoes.map(function(s){ return s.curto; })));
    P.grupos.forEach(function(g){ aoa.push([g].concat(P.solucoes.map(function(s){ return r2(ST.res[s.k][bk].linhas.filter(function(x){ return x.g === g; }).reduce(function(a, x){ return a + (x.total || 0); }, 0)); }))); });
    aoa.push(['TOTAL SEM BDI'].concat(P.solucoes.map(function(s){ return r2(ST.res[s.k][bk].sub); })));
    var wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
    aoa.forEach(function(row, ri){ row.forEach(function(v, ci){ if (typeof v === 'number') { var cl = ws[XLSX.utils.encode_cell({r: ri, c: ci})]; if (cl) cl.z = '#,##0.00'; } }); });
    ws['!cols'] = [{wch: 44}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 120}];
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');
    XLSX.writeFile(wb, 'comparativo-' + prog + '-' + slug(pj.nome) + '-' + hoje() + '.xlsx');
    toast('Comparativo gerado');
  }
  async function enviar(secoes, titulo, arquivo, crono, origem, solucao, banco){
    var w = null;
    try { w = window.open('', 'tc_orcamento'); if (w && (!w.location.href || w.location.href === 'about:blank')) w.location.href = '/orcamento/'; } catch (e) { w = null; }
    var wb; try { wb = await wbDe(secoes, titulo, null); } catch (e) { toast('Sem internet para montar a planilha. Conecte e tente de novo.'); return; }
    var env = {v: 1, origem: origem, projeto: secoes[0].projeto, municipio: secoes[0].municipio, solucao: solucao, banco: banco, regime: secoes[0].regime, bdi: secoes[0].bdi,
      arquivo: arquivo, b64: XLSX.write(wb, {bookType: 'xlsx', type: 'base64'}), crono: crono || null, em: new Date().toISOString()};
    try { localStorage.setItem(KEY_ENV, JSON.stringify(env)); } catch (e) { toast('Não coube no armazenamento do navegador. Use 📤 Exportar e o Importar Lista.'); return; }
    if (w) { try { w.focus(); } catch (e) {} toast('Enviado. O Orçamento abre o Importar Lista com esta planilha' + (crono ? ' e o cronograma.' : '.')); }
    else toast('Enviado. O navegador bloqueou a nova aba: abra o Orçamento (totalcivil.com.br/orcamento) e a importação começa sozinha.');
  }
  function enviarAoOrcamento(prog){
    var o = atual(prog); if (!o) return;
    var P = PROGS[prog], sc = secao(prog, o), cr = cronoEstado(prog), et = etapasDe(o, prog), crono = null;
    if (cr.prazo) crono = {prazo: cr.prazo, inicio: cr.inicio || '', pct: {}};
    if (crono) et.forEach(function(e){ crono.pct[e.nome] = (cr.pct[e.nome] || []).slice(); });
    enviar([sc], 'ORÇAMENTO — ' + P.nome.toUpperCase() + ' — ' + o.sol.nome.toUpperCase(), 'orcamento-' + prog + '-' + o.sol.k + '-' + o.bank + '-' + slug(sc.projeto) + '-' + hoje() + '.xlsx', crono, P.nome, o.sol.nome, BANCOS[o.bank]);
  }
  function enviarPacote(){
    var pac = lsGet(KEY_PAC, {}), ks = Object.keys(pac);
    if (!ks.length) { toast('Nenhum programa deixou orçamento neste aparelho ainda.'); return; }
    var secoes = ks.map(function(k){ return pac[k]; });
    enviar(secoes, 'ORÇAMENTO COMPLETO — ' + secoes.map(function(s){ return s.nome; }).join(' + '), 'orcamento-completo-' + hoje() + '.xlsx', null, secoes.map(function(s){ return s.nome; }).join(' + '), 'programas reunidos', 'cada programa no banco escolhido');
  }
  function atual(prog){
    var bk = bancoAtual(); if (!ST.res) { toast('Calcule o orçamento primeiro.'); return null; }
    var o = ST.res[ST.ver] && ST.res[ST.ver][bk]; return o || null;
  }

  /* ---------- janela ---------- */
  var CSS = '.tco-bg{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99980;display:none;align-items:flex-start;justify-content:center;padding:3vh 10px;overflow:auto}.tco-bg.on{display:flex}' +
    '.tco-modal{--bg:#fff;--fg:#14202e;--mut:#5a6573;--ln:#d9d6cc;--ac:#0f6aa8;--soft:#eef5fb;--ok:#1b5e35;--okb:#dcefe2;--wr:#8a3a0a;--wrb:#fdecd8;background:var(--bg);color:var(--fg);border-radius:12px;max-width:1120px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    ':root[data-theme="dark"] .tco-modal{--bg:#17212e;--fg:#e8ecf1;--mut:#9aa6b5;--ln:#263344;--ac:#5db3ea;--soft:#1b2a3a;--ok:#8fe0b0;--okb:#16382a;--wr:#fbbf8a;--wrb:#3a2412}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tco-modal{--bg:#17212e;--fg:#e8ecf1;--mut:#9aa6b5;--ln:#263344;--ac:#5db3ea;--soft:#1b2a3a;--ok:#8fe0b0;--okb:#16382a;--wr:#fbbf8a;--wrb:#3a2412}}' +
    '.tco-h{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--ln)}.tco-h h3{flex:1;margin:0;font-size:16px}.tco-x{background:none;border:1px solid var(--ln);color:var(--fg);border-radius:6px;padding:3px 10px;cursor:pointer;font-size:14px}' +
    '.tco-b{padding:14px 16px}.tco-f{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--ln)}' +
    '.tco-btn{font:inherit;font-weight:600;font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid var(--ac);background:var(--bg);color:var(--ac);cursor:pointer}.tco-btn.p{background:var(--ac);color:#fff}.tco-btn.g{background:#15803d;border-color:#15803d;color:#fff}.tco-btn.s{font-size:12px;padding:4px 9px}' +
    '.tco-card{border:1px solid var(--ln);border-radius:10px;padding:12px;margin-bottom:12px;background:var(--bg)}.tco-card h4{margin:0 0 8px;font-size:14px}' +
    '.tco-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.tco-fld label{display:block;font-size:11.5px;font-weight:600;color:var(--mut);margin-bottom:2px}.tco-fld input,.tco-fld select{width:100%;box-sizing:border-box;font:inherit;padding:5px 7px;border:1px solid var(--ln);border-radius:6px;background:var(--bg);color:var(--fg)}' +
    '.tco-sol{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-bottom:12px}.tco-sol .tco-card{margin:0;display:flex;flex-direction:column;gap:6px}.tco-sol .on{outline:2px solid var(--ac)}.tco-tot{font-size:21px;font-weight:700;color:var(--ac)}' +
    '.tco-msg{padding:8px 10px;border-radius:8px;margin-bottom:8px;font-size:12.5px;background:var(--wrb);color:var(--wr)}.tco-msg.i{background:var(--soft);color:var(--fg)}.tco-msg.o{background:var(--okb);color:var(--ok)}' +
    '.tco-t{width:100%;border-collapse:collapse;font-size:12.5px}.tco-t th,.tco-t td{border-bottom:1px solid var(--ln);padding:5px 7px;text-align:left;vertical-align:top}.tco-t th{background:var(--soft)}.tco-t .n{text-align:right;white-space:nowrap}.tco-t tr.gr td{background:var(--soft);font-weight:700}.tco-t small{color:var(--mut)}' +
    '.tco-bd{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:99px;background:var(--wrb);color:var(--wr);margin-left:4px}.tco-bd.ok{background:var(--okb);color:var(--ok)}' +
    '.tco-seg{display:inline-flex;border:1px solid var(--ln);border-radius:8px;overflow:hidden}.tco-seg button{font:inherit;font-size:12.5px;border:0;background:var(--bg);color:var(--fg);padding:5px 12px;cursor:pointer}.tco-seg button.on{background:var(--ac);color:#fff}' +
    '.tco-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#14202e;color:#fff;padding:9px 16px;border-radius:9px;z-index:99999;font:13px system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90vw}.tco-toast.on{opacity:1}' +
    '.tco-res{border:1px solid #c9d7e4;border-radius:10px;padding:10px 12px;margin:10px 0;background:#eef5fb;color:#14202e;font:13px/1.45 system-ui,sans-serif}.tco-res b{font-weight:700}.tco-res .v{display:flex;flex-wrap:wrap;gap:6px 18px;margin:4px 0}.tco-res button{font:inherit;font-weight:600;font-size:12.5px;padding:5px 11px;border-radius:7px;border:1px solid #0f6aa8;background:#0f6aa8;color:#fff;cursor:pointer;margin-top:4px}' +
    ':root[data-theme="dark"] .tco-res{background:#1b2a3a;color:#e8ecf1;border-color:#263344}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tco-res{background:#1b2a3a;color:#e8ecf1;border-color:#263344}}' +
    '@media(max-width:700px){.tco-t td,.tco-t th{padding:4px 5px}.tco-h h3{font-size:14px}}';
  function estilo(){ if (document.getElementById('tco-css')) return; var s = document.createElement('style'); s.id = 'tco-css'; s.textContent = CSS; document.head.appendChild(s); }
  function modal(){
    estilo();
    var m = document.getElementById('tco-modal'); if (m) return m;
    m = document.createElement('div'); m.id = 'tco-modal'; m.className = 'tco-bg';
    m.innerHTML = '<div class="tco-modal"><div class="tco-h"><h3 id="tco-tit"></h3><button type="button" class="tco-x" data-a="fechar">✕</button></div><div class="tco-b" id="tco-body"></div>' +
      '<div class="tco-f"><button type="button" class="tco-btn" data-a="comp">📊 Comparativo das 3 soluções (.xlsx)</button><button type="button" class="tco-btn p" data-a="exp">📤 Exportar a solução escolhida</button>' +
      '<button type="button" class="tco-btn g" data-a="env" title="Abre o programa de Orçamento já com esta planilha (e o cronograma) para importar">🚀 Enviar direto ao Orçamento</button>' +
      '<button type="button" class="tco-btn g" data-a="pac" id="tco-pac" title="Reúne o último orçamento de cada programa deste aparelho numa planilha só">🧩 Juntar programas e enviar</button>' +
      '<button type="button" class="tco-btn" data-a="fechar">Fechar</button></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if (e.target === m) { m.classList.remove('on'); return; }
      var a = e.target.closest('[data-a]'); if (!a) return;
      var k = a.dataset.a, prog = ST.prog;
      if (k === 'fechar') m.classList.remove('on');
      else if (k === 'comp') exportarComparativo(prog);
      else if (k === 'exp') exportar(prog);
      else if (k === 'env') enviarAoOrcamento(prog);
      else if (k === 'pac') enviarPacote();
      else if (k === 'ver') { ST.ver = a.dataset.k; renderJanela(); var d = document.getElementById('tco-det'); if (d) d.scrollIntoView({behavior: 'smooth', block: 'start'}); }
      else if (k === 'rec') abrir(prog, true);
    });
    m.addEventListener('change', function(e){
      var t = e.target, k = t.dataset && t.dataset.p; if (!k) return;
      var prog = ST.prog;
      if (k === '_banco') cfgSet('banco', t.value);
      else if (k === '_regime') cfgSet('regime', t.value);
      else if (k === '_bdi') cfgSet('bdi', Math.max(0, parseFloat(String(t.value).replace(',', '.')) || 0));
      else { var sv = lsGet('tcorc_p_' + prog, {}); var d = (PROGS[prog].params || []).find(function(x){ return x.k === k; }); sv[k] = d && d.tipo === 'sel' ? t.value : Math.max(0, parseFloat(String(t.value).replace(',', '.')) || 0); lsSet('tcorc_p_' + prog, sv); }
      calcTudo(prog); guardarPacote(prog); renderJanela();
    });
    return m;
  }
  async function abrir(prog, recarregar){
    var P = PROGS[prog]; if (!P) return;
    ST.prog = prog; ST.ver = ST.ver && P.solucoes.some(function(s){ return s.k === ST.ver; }) ? ST.ver : 'rec';
    var m = modal(); document.getElementById('tco-tit').textContent = '3 soluções com orçamento — ' + P.nome + ' (EMOP, SINAPI e SCO-Rio)';
    m.classList.add('on');
    var body = document.getElementById('tco-body');
    if (recarregar || !BK.sinapi || !BK.sco || BK.emop === undefined) {
      body.innerHTML = '<div class="tco-msg i">⏳ Lendo os bancos SINAPI e SCO-Rio do site e a EMOP importada no programa de Orçamento…</div>';
      await carregarBancos();
    }
    calcTudo(prog); guardarPacote(prog); renderJanela();
  }
  function fld(k, lab, v, d){
    if (d && d.tipo === 'sel') return '<div class="tco-fld"><label>' + esc(lab) + '</label><select data-p="' + k + '">' + d.opts.map(function(o){ return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    return '<div class="tco-fld"><label>' + esc(lab) + '</label><input type="number" min="0" step="' + ((d && d.step) || 'any') + '" value="' + v + '" data-p="' + k + '"></div>';
  }
  function renderJanela(){
    var body = document.getElementById('tco-body'), prog = ST.prog, P = PROGS[prog]; if (!body) return;
    var c = cfg(), bk = bancoAtual(), pr = params(prog), av = [];
    if (!ST.res) {
      body.innerHTML = '<div class="tco-msg">' + esc(ST.erro || 'Faltam dados para calcular as quantidades.') + '</div>'; return;
    }
    var rs = P.solucoes.map(function(s){ return ST.res[s.k][bk]; }), base = (ST.res.rec || ST.res[P.solucoes[0].k])[bk].total, menor = Math.min.apply(null, rs.map(function(o){ return o.total; }));
    if (!BK.emop) av.push('<div class="tco-msg"><b>EMOP sem preços neste aparelho.</b> Os itens EMOP saem com o código certo e sem preço; o programa de Orçamento põe o preço do catálogo ao importar. Para ver aqui os totais EMOP, abra o <b>Orçamento</b> neste navegador, importe os 4 arquivos DBF da EMOP (DIPR, MAT, REUT e COMP) e toque em <b>⟳ Recarregar bancos</b>.</div>');
    ST.aviso.forEach(function(t){ av.push('<div class="tco-msg">' + esc(t) + '</div>'); });
    var avP = P.avisos ? P.avisos({params: pr}) : []; avP.forEach(function(t){ av.push('<div class="tco-msg i">' + t + '</div>'); });
    var semP = rs.reduce(function(a, o){ return a + o.semPreco; }, 0);
    if (semP && (bk !== 'emop' || BK.emop)) av.push('<div class="tco-msg i">ℹ ' + semP + ' item(ns) sem preço no banco escolhido nem nos outros dois: saem na planilha com quantidade e sem preço. No Orçamento, escolha a composição de cada um pela descrição.</div>');
    var opts = Object.keys(BANCOS).map(function(k){ return '<option value="' + k + '"' + (bk === k ? ' selected' : '') + '>' + BANCOS[k] + (ST.refs[k] ? ' — ' + esc(ST.refs[k]) : k === 'emop' ? ' — sem preços (importar no Orçamento)' : '') + '</option>'; }).join('');
    var h = '<p style="margin-top:0">' + esc(P.intro || '') + '</p>' + av.join('') +
      '<div class="tco-card"><h4>Banco e dados do orçamento</h4><div class="tco-grid">' +
      '<div class="tco-fld"><label>Banco de preços</label><select data-p="_banco">' + opts + '</select></div>' +
      '<div class="tco-fld"><label>Regime</label><select data-p="_regime"><option value="O"' + (c.regime === 'O' ? ' selected' : '') + '>Não desonerado (onerado)</option><option value="D"' + (c.regime === 'D' ? ' selected' : '') + '>Desonerado</option></select></div>' +
      fld('_bdi', 'BDI (%)', c.bdi, {step: '0.01'}) + (P.params || []).map(function(d){ return fld(d.k, d.label, pr[d.k], d); }).join('') +
      '</div><div style="margin-top:8px"><button type="button" class="tco-btn s" data-a="rec">⟳ Recarregar bancos</button></div></div>';
    h += '<div class="tco-sol">' + P.solucoes.map(function(s, i){
      var o = rs[i], dif = base ? (o.total / base - 1) * 100 : 0, ok = o.total === menor && o.total > 0;
      return '<div class="tco-card' + (ST.ver === s.k ? ' on' : '') + '"><h4 style="margin:0">' + esc(s.nome) + (ok ? ' <span class="tco-bd ok">menor custo</span>' : '') + '</h4><div class="tco-tot">' + (o.total > 0 ? R$(o.total) : 'sem preços') + '</div>' +
        '<div style="font-size:12px;color:var(--mut)">Sem BDI ' + R$(o.sub) + ' · BDI ' + nf(o.bdi, 2) + ' %' + (s.k !== 'rec' && base ? ' · ' + (dif >= 0 ? '+' : '−') + nf(Math.abs(dif), 1) + ' % da recomendada' : '') + ' · ' + o.linhas.length + ' itens</div>' +
        '<p style="font-size:12.5px;margin:0;flex:1">' + esc(s.desc) + '</p><div><button type="button" class="tco-btn s" data-a="ver" data-k="' + s.k + '">👁 Ver itens</button></div></div>';
    }).join('') + '</div>';
    h += '<div class="tco-card"><h4>Total com BDI nos três bancos</h4><div style="overflow-x:auto"><table class="tco-t"><thead><tr><th>Solução</th>' + Object.keys(BANCOS).map(function(b){ return '<th class="n">' + BANCOS[b] + '</th>'; }).join('') + '</tr></thead><tbody>' +
      P.solucoes.map(function(s){ return '<tr><td><b>' + esc(s.curto) + '</b></td>' + Object.keys(BANCOS).map(function(b){ var x = ST.res[s.k][b]; return '<td class="n">' + (x.total > 0 ? R$(x.total) : 'sem preços') + (x.semPreco ? '<br><small>' + x.semPreco + ' sem preço</small>' : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
    var o = ST.res[ST.ver][bk], sol = P.solucoes.find(function(s){ return s.k === ST.ver; }), det = '', gi = 0;
    P.grupos.forEach(function(g){
      var ls = o.linhas.filter(function(x){ return x.g === g; }); if (!ls.length) return; gi++;
      var st = ls.reduce(function(a, x){ return a + (x.total || 0); }, 0);
      det += '<tr class="gr"><td colspan="6">' + gi + ' ' + esc(g) + '</td><td class="n">' + R$(st) + '</td></tr>';
      ls.forEach(function(x, j){
        var outro = x.b && x.b !== bk ? ' <span class="tco-bd" title="Não há este item no ' + BANCOS[bk] + '">do ' + BANCOS[x.b] + '</span>' : '';
        det += '<tr><td>' + gi + '.' + (j + 1) + '</td><td style="white-space:nowrap">' + (x.r ? esc(x.r.full) : '<span style="color:var(--mut)">sem composição</span>') + outro + '</td>' +
          '<td><b>' + esc(x.nome) + '</b>' + (x.r && x.r.descr ? '<br><small>' + esc(x.r.descr.slice(0, 220)) + '</small>' : '') + '<br><small>📐 ' + esc(x.memo.join('; ')) + '</small></td>' +
          '<td>' + esc(x.un) + '</td><td class="n">' + nf(x.q, 2) + '</td><td class="n">' + (x.preco != null ? nf(x.preco, 2) : '—') + '</td><td class="n"><b>' + (x.total != null ? nf(x.total, 2) : '—') + '</b></td></tr>';
      });
    });
    h += '<div class="tco-card" id="tco-det"><h4>Itens — ' + esc(sol.nome) + ' · ' + BANCOS[bk] + '</h4><div style="margin-bottom:8px" class="tco-seg">' + P.solucoes.map(function(s){ return '<button type="button" class="' + (ST.ver === s.k ? 'on' : '') + '" data-a="ver" data-k="' + s.k + '">' + esc(s.curto) + '</button>'; }).join('') + '</div>' +
      '<div style="overflow-x:auto"><table class="tco-t"><thead><tr><th>Item</th><th>Código</th><th>Descrição e memória</th><th>Unid.</th><th class="n">Quant.</th><th class="n">Preço unit.</th><th class="n">Total</th></tr></thead><tbody>' + det +
      '<tr><td colspan="6" class="n"><b>Total sem BDI</b></td><td class="n"><b>' + R$(o.sub) + '</b></td></tr><tr><td colspan="6" class="n">BDI ' + nf(o.bdi, 2) + ' %</td><td class="n">' + R$(o.total - o.sub) + '</td></tr>' +
      '<tr><td colspan="6" class="n"><b>Total geral</b></td><td class="n" style="color:var(--ac)"><b>' + R$(o.total) + '</b></td></tr></tbody></table></div>' +
      '<p style="font-size:12px;color:var(--mut);margin:8px 0 0">' + (P.rodape || '') + ' Para levar ao programa de Orçamento: <b>🚀 Enviar direto</b> (ou <b>📤 Exportar</b> e <b>📥 Importar Lista</b>). Os preços vão sem BDI; aplique o BDI no Orçamento. Itens marcados "do SINAPI" ou "do SCO-Rio" não existem no banco escolhido e vieram do outro banco.</p></div>' +
      '<div class="tco-card" id="tco-crono"></div>';
    body.innerHTML = h;
    var pac = lsGet(KEY_PAC, {}), outros = Object.keys(pac).filter(function(k){ return k !== prog; });
    var bp = document.getElementById('tco-pac'); if (bp) bp.style.display = Object.keys(pac).length > 1 ? '' : 'none';
    var cx = document.getElementById('tco-crono');
    if (cx && window.TC_CRONO) {
      var et = etapasDe(o, prog), est = cronoEstado(prog);
      cx.innerHTML = '<h4>📅 Cronograma físico-financeiro — ' + esc(sol.nome) + ' · ' + BANCOS[bk] + '</h4><div id="tco-crono-box"></div>';
      TC_CRONO.render(document.getElementById('tco-crono-box'), est, et, function(e){ lsSet('tcorc_crono_' + prog, e); }, {
        nota: (et.every(function(e){ return !e.valor; }) ? '⚠ Este banco ainda está sem preços neste aparelho: as porcentagens valem, e os valores aparecem quando houver preços. ' : '') + 'As etapas são os grupos da planilha desta solução, com BDI. O cronograma vai junto em <b>📤 Exportar</b> e em <b>🚀 Enviar direto ao Orçamento</b>.'
      });
    }
    if (outros.length) { var r = document.createElement('div'); r.className = 'tco-msg o'; r.innerHTML = '🧩 Também há orçamento deste aparelho de: <b>' + outros.map(function(k){ return esc(pac[k].nome); }).join(', ') + '</b>. Use <b>Juntar programas e enviar</b> para levar todos ao Orçamento numa planilha só.'; body.insertBefore(r, body.firstChild); }
  }

  /* ---------- custo logo após o cálculo (cartão no resultado de cada programa) ---------- */
  var tmr = {};
  async function resumo(prog, el, opc){
    var P = PROGS[prog]; if (!P || !el) return;
    clearTimeout(el._tcoT);
    el._tcoT = setTimeout(async function(){
      try {
        estilo();
        if (!BK.sinapi || !BK.sco) await carregarBancos();
        ST.prog = prog;
        var r = {}, erro = null, c = cfg(), bk = bancoAtual();
        P.solucoes.forEach(function(s){ var it = itensDe(prog, s, bk); if (it && it.erro) erro = it.erro; else r[s.k] = orcar(prog, s, bk, it || []); });
        if (erro) { el.innerHTML = '<div class="tco-res"><b>💰 Custo estimado:</b> ' + esc(erro) + '</div>'; return; }
        var vis = ST.ver, salvo = ST.res; ST.res = {}; P.solucoes.forEach(function(s){ ST.res[s.k] = {}; ST.res[s.k][bk] = r[s.k]; });
        var rec = r.rec || r[P.solucoes[0].k]; ST.ver = rec.sol.k; guardarPacote(prog); ST.ver = vis; ST.res = salvo;
        el.innerHTML = '<div class="tco-res"><b>💰 Custo estimado — ' + BANCOS[bk] + (ST.refs[bk] ? ' ' + esc(ST.refs[bk]) : '') + ' · ' + (c.regime === 'D' ? 'desonerado' : 'não desonerado') + ' · BDI ' + nf(+c.bdi || 0, 2) + ' %</b><div class="v">' +
          P.solucoes.map(function(s){ return '<span>' + esc(s.curto) + ': <b>' + (r[s.k].total > 0 ? R$(r[s.k].total) : 'sem preços') + '</b></span>'; }).join('') + '</div>' +
          '<button type="button" onclick="TCORC.abrir(\'' + prog + '\')">💰 3 soluções com orçamento (EMOP, SINAPI, SCO)</button></div>';
      } catch (e) { console.error('Custo:', e); }
    }, (opc && opc.espera) || 700);
  }


  /* ---------- itens que se repetem nos programas (códigos conferidos nos bancos do site) ---------- */
  var U = {
    GAMA: 1.6,   // t/m³ do material escavado (para as composições em tonelada)
    preliminares: function(g, plac, extensao, nomeObra){
      var L = [];
      if (plac > 0) L.push({g: g, nome: 'Placa de identificação da obra', un: 'm²', q: plac, cod: {emop: '02.020.0001', sinapi: 'SC-103689', sco: 'SCO-AD 20.25.0300'}, memo: 'Placa padrão de ' + nf(plac, 2) + ' m²'});
      if (extensao > 0) L.push({g: g, nome: 'Locação da obra com aparelho topográfico', un: 'm', q: extensao, cod: {emop: '01.018.0002', sinapi: 'SC-105137'}, memo: 'Extensão do trecho: ' + nf(extensao, 2) + ' m'});
      return L;
    },
    /* corte, aterro compactado e bota-fora (volumes em m³ do próprio programa; sem empolamento) */
    terra: function(g, v, dmt){
      var L = [], bota = Math.max(0, (v.corte || 0) - (v.aterro || 0)), massa = bota * U.GAMA;
      if (v.corte > 0) L.push({g: g, nome: 'Escavação e carga de material de 1ª categoria (corte)', un: 'm³', q: v.corte, cod: {sinapi: 'SC-101125', sco: 'SCO-MT 10.15.0050'}, memo: 'Volume de corte da Topografia: ' + nf(v.corte, 2) + ' m³'});
      if (v.aterro > 0) L.push({g: g, nome: 'Execução e compactação de aterro (95 % do Proctor Normal)', un: 'm³', q: v.aterro, cod: {sinapi: 'SC-96385', sco: 'SCO-BP 05.05.0250'}, memo: 'Aterro + reaterro lateral da Topografia: ' + nf(v.aterro, 2) + ' m³ (composição exclusive o material, que sai do corte)'});
      if (bota > 0) {
        L.push({g: g, nome: 'Carga e descarga mecânica do material de bota-fora', un: 't', q: massa, cod: {emop: '04.011.0052', sinapi: 'SC-100978', sco: 'SCO-TC 10.05.0350'}, qb: {sinapi: bota}, memo: 'Sobra de corte ' + nf(bota, 2) + ' m³ × ' + nf(U.GAMA, 1) + ' t/m³'});
        if (dmt > 0) L.push({g: g, nome: 'Transporte do bota-fora em caminhão basculante, DMT ' + nf(dmt, 1) + ' km', un: 't·km', q: massa * dmt, cod: {emop: '04.005.0143', sinapi: 'SC-95875', sco: 'SCO-TC 05.05.0400'}, qb: {sinapi: bota * dmt}, memo: nf(massa, 2) + ' t × ' + nf(dmt, 1) + ' km'});
      }
      return L;
    },
    /* escolhe a composição pela espessura (10, 15 ou 20 cm) */
    esp: function(e, c10, c15, c20){ return e <= 12.5 ? c10 : e <= 17.5 ? c15 : c20; }
  };

  function registrar(def){ PROGS[def.prog] = def; }
  window.TCORC = {util: U, registrar: registrar, abrir: abrir, resumo: resumo, cfg: cfg, bancos: BANCOS, versao: 1};
})();
