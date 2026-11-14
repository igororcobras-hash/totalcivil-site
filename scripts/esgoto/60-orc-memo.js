/* ════════════════════════════════════════════════════════════════════
   ABA 6 — ORÇAMENTO (quantitativos do cálculo + EMOP, SINAPI RJ e SCO-Rio, como no programa de Orçamento)
   ABA 7 — MEMORIAL DE CÁLCULO
   ════════════════════════════════════════════════════════════════════ */
const ORC = {ind: null, bk: {sinapi: {}, sco: {}}, ref: {}, emop: undefined, erro: '', carregando: false, pronto: false};
const BANCOS = {emop: 'EMOP', sinapi: 'SINAPI RJ', sco: 'SCO-Rio'};
/* EMOP (licenciada): só os códigos que este programa usa; preço embutido apenas para administradores. Usuário comum: preço vem da EMOP importada no programa de Orçamento (mesmo navegador). */
/* EMOP_ADM:INICIO */
const EMOP_ADM = {"ref":"09/2026","t":{"03.020.0050":["M3","ESCAVACAO MECANICA DE VALA NAO ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ATE 1,50M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRA HIDRAULICA DE 0,78M3,EXCLUSIVE ESGOTAMENTO","1",8.48,"B",8.38],"03.020.0085":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 1,50 E 3,00M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRA HIDRAULICA DE 0,78M3,EXCLUSIVE ESGOTAMENTO E ESCORAMENTO","1",11.97,"B",11.79],"03.020.0090":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 3,00 E 4,50M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRA HIDRAULICA DE 0,78M3,EXCLUSIVE ESGOTAMENTO E ESCORAMENTO","1",17.67,"B",17.39],"03.020.0100":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 4,50 E 6,00M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRA HIDRAULICA DE 0,78M3,EXCLUSIVE ESGOTAMENTO E ESCORAMENTO","1",25.78,"B",25.37],"03.011.0015":["M3","REATERRO DE VALA/CAVA COM MATERIAL DE BOA QUALIDADE,UTILIZANDO VIBRO COMPACTADOR PORTATIL,EXCLUSIVE MATERIAL","1",30.21,"B",28.26],"06.088.0010":["M3","EMBASAMENTO DE TUBULACAO,FEITO COM PO-DE-PEDRA","0",214.31,"A",211.24],"04.011.0052":["T","CARGA E DESCARGA MECANICA,COM PA-CARREGADEIRA,COM 1,30M3 DE CAPACIDADE,UTILIZANDO CAMINHAO BASCULANTE A OLEO DIESEL,COM CAPACIDADE UTIL DE 8T,CONSIDERADOS PARA O CAMINHAO OS TEMPOS DE ESPERA,MANOBRA,CARGA E DESCARGA E PARA A CARREGADEIRA OS TEMPOS DE ESPERA E OPERACAO PARA CARGAS DE 100T POR DIA DE 8H","1",10.1,"B",9.93],"04.005.0143":["T X KM","TRANSPORTE DE CARGA DE QUALQUER NATUREZA,EXCLUSIVE AS DESPESAS DE CARGA E DESCARGA,TANTO DE ESPERA DO CAMINHAO COMO DO SERVENTE OU EQUIPAMENTO AUXILIAR,A VELOCIDADE MEDIA DE 30KM/H,EM CAMINHAO BASCULANTE A OLEO DIESEL,COM CAPACIDADE UTIL DE 12T","1",1.65,"B",1.64],"06.017.0080":["M","CORPO DE POCO DE VISITA DE ANEIS PRE-MOLDADOS,COM DIAMETRO DE 600MM,COM DEGRAUS,MEDIDA PELA ALTURA UTIL,INCLUSIVE MAO-DE-OBRA E MATERIAL","0",677.55,"A",671.01],"06.016.0007":["UN","TAMPAO COMPLETO DE FERRO FUNDIDO DUCTIL (NODULAR) ARTICULADO,CIRCULAR,DN 600MM,COM TAMPA PARA ACESSO DE MANUTENCAO E SOBRETAMPA PARA MANOBRA,CLASSE D400,CONFORME ABNT NBR 10160,ASSENTADO COM ARGAMASSA DE CIMENTO E AREIA,NO TRACO 1:4 EM VOLUME.FORNECIMENTO E ASSENTAMENTO","0",624.73,"A",617.41],"05.002.0005":["M2","DEMOLICAO COM EQUIPAMENTO DE AR COMPRIMIDO,DE PAVIMENTACAO DE CONCRETO ASFALTICO,COM 5CM DE ESPESSURA,INCLUSIVE EMPILHAMENTO LATERAL DENTRO DO CANTEIRO DE SERVICO","1",32.71,"B",31.5],"08.015.0068":["T","REVESTIMENTO DE CONCRETO BETUMINOSO USINADO A QUENTE,IMPORTADO DE USINA,EXECUTADO EM UMA CAMADA,DE ACORDO COM AS INSTRUCOES/ESPECIFICACOES DO CONTRATANTE,COMPREENDENDO O PREPARO E OS MATERIAIS,EXCLUSIVE ESPALHAMENTO,COMPACTACAO (VIDE FAMILIA 08.037) E O TRANSPORTE DA USINA PARA PISTA","0",665.91,"A",663.95]}};
/* EMOP_ADM:FIM */
const EMOP_TAB = {"03.020.0050":["M3","ESCAVACAO MECANICA DE VALA NAO ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ATE 1,50M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRA HIDRAULICA DE 0,78M3,EXCLUSIVE ESG","1"],"03.020.0085":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 1,50 E 3,00M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRAHIDRAULICA DE 0,78M3,EXCLUSIVE","1"],"03.020.0090":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 3,00 E 4,50M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRAHIDRAULICA DE 0,78M3,EXCLUSIVE","1"],"03.020.0100":["M3","ESCAVACAO MECANICA DE VALA ESCORADA,EM MATERIAL DE 1ªCATEGORIA,ENTRE 4,50 E 6,00M DE PROFUNDIDADE,UTILIZANDO ESCAVADEIRAHIDRAULICA DE 0,78M3,EXCLUSIVE","1"],"03.011.0015":["M3","REATERRO DE VALA/CAVA COM MATERIAL DE BOA QUALIDADE,UTILIZANDO VIBRO COMPACTADOR PORTATIL,EXCLUSIVE MATERIAL","1"],"06.088.0010":["M3","EMBASAMENTO DE TUBULACAO,FEITO COM PO-DE-PEDRA","0"],"04.011.0052":["T","CARGA E DESCARGA MECANICA,COM PA-CARREGADEIRA,COM 1,30M3 DECAPACIDADE,UTILIZANDO CAMINHAO BASCULANTE A OLEO DIESEL,COMCAPACIDADE UTIL DE 8T,CONSIDERAD","1"],"04.005.0143":["T X KM","TRANSPORTE DE CARGA DE QUALQUER NATUREZA,EXCLUSIVE AS DESPESAS DE CARGA E DESCARGA,TANTO DE ESPERA DO CAMINHAO COMO DO SERVENTE OU EQUIPAMENTO AUXILIA","1"],"06.017.0080":["M","CORPO DE POCO DE VISITA DE ANEIS PRE-MOLDADOS,COM DIAMETRO DE 600MM,COM DEGRAUS,MEDIDA PELA ALTURA UTIL,INCLUSIVE MAO-DE-OBRA E MATERIAL","0"],"06.016.0007":["UN","TAMPAO COMPLETO DE FERRO FUNDIDO DUCTIL (NODULAR) ARTICULADO,CIRCULAR,DN 600MM,COM TAMPA PARA ACESSO DE MANUTENCAO E SOBRETAMPA PARA MANOBRA,CLASSE D4","0"],"05.002.0005":["M2","DEMOLICAO COM EQUIPAMENTO DE AR COMPRIMIDO,DE PAVIMENTACAO DE CONCRETO ASFALTICO,COM 5CM DE ESPESSURA,INCLUSIVE EMPILHAMENTO LATERAL DENTRO DO CANTEIR","1"],"08.015.0068":["T","REVESTIMENTO DE CONCRETO BETUMINOSO USINADO A QUENTE,IMPORTADO DE USINA,EXECUTADO EM UMA CAMADA,DE ACORDO COM AS INSTRUCOES/ESPECIFICACOES DO CONTRATA","0"]};   /* código → [unidade, descrição, sufixo do código não desonerado] */
const orcCfg = () => { const o = P.orc = Object.assign({banco: 'sinapi', mes: {}, deson: false, bdi: 25, sol: 'rec', it: {}}, P.orc || {});
  if (!o.mes || typeof o.mes !== 'object') o.mes = {sinapi: o.mes || ''}; o.it = o.it || {}; if (!BANCOS[o.banco]) o.banco = 'sinapi'; if (!ESG.SOL.some(s => s.k === o.sol)) o.sol = 'rec'; return o; };
async function lerGz(url) { const r = await fetch(url); if (!r.ok) throw new Error('arquivo ' + url.split('/').pop() + ' indisponível'); if (!window.DecompressionStream) throw new Error('navegador sem descompressão: atualize o Chrome/Safari'); return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text()); }
async function ehAdmin() {
  if (window.TC_USUARIO) return !!window.TC_USUARIO.admin;
  try { await nuvIniciar(); const em = String(NUV.user && NUV.user.email || '').toLowerCase(); return !!em && (window.ADMINS || []).map(x => String(x).toLowerCase()).includes(em); } catch (e) { return false; }
}
async function lerEmop() {
  let out = null; const montar = (l, meta) => { const map = {}; l.forEach(d => { if (d && d.CODIGO) map[String(d.CODIGO).trim()] = d; }); return Object.keys(map).length ? {map, meta: meta || {}} : null; };
  try { let existe = true; if (indexedDB.databases) existe = (await indexedDB.databases()).some(d => d.name === 'SchuelerHistoricoDB_v1');
    if (existe) { const db = await new Promise((ok, ko) => { const rq = indexedDB.open('SchuelerHistoricoDB_v1'); rq.onupgradeneeded = e => { try { e.target.transaction.abort(); } catch (x) {} }; rq.onsuccess = () => ok(rq.result); rq.onerror = () => ko(rq.error); });
      if (db.objectStoreNames.contains('settings')) { const get = k => new Promise(ok => { try { const r = db.transaction('settings').objectStore('settings').get(k); r.onsuccess = () => ok(r.result ? r.result.value : null); r.onerror = () => ok(null); } catch (e) { ok(null); } });
        const dipr = await get('emopDiprOverride'), meta = await get('emopImportMeta'); if (Array.isArray(dipr) && dipr.length) out = montar(dipr, Object.assign({origem: 'importada no Orçamento'}, meta || {})); }
      db.close(); } } catch (e) { /* sem acesso ao banco do Orçamento */ }
  if (!out) try { const c = JSON.parse(localStorage.getItem('orcadipr_base_v11') || '[]'); if (Array.isArray(c) && c.some(x => /^\d\d\.\d{3}\.\d{4}-/.test(x.CODIGO))) out = montar(c, {origem: 'catálogo salvo no Orçamento'}); } catch (e) {}
  if (!out && EMOP_ADM && EMOP_ADM.ref && await ehAdmin()) { const L = []; Object.entries(EMOP_ADM.t).forEach(([b, [u, d, so, po, sd, pd]]) => { L.push({CODIGO: b + '-' + so, DESCR1: d, UNID: u, CUSTO: po}); if (sd) L.push({CODIGO: b + '-' + sd, DESCR1: d, UNID: u, CUSTO: pd}); }); out = montar(L, {origem: 'embutida (administrador) ' + EMOP_ADM.ref}); }
  return out;
}
async function orcCarregar() {
  if (ORC.carregando) return; ORC.carregando = true; ORC.erro = ''; const o = orcCfg(), base = '/orcamento/dados/';
  try { if (!ORC.ind) { const r = await fetch(base + 'indice.json', {cache: 'no-cache'}); if (!r.ok) throw new Error('índice dos bancos indisponível'); ORC.ind = await r.json(); }
    for (const t of ['sinapi', 'sco']) { const lista = (ORC.ind[t] || []).slice().sort((a, b) => String(b.ref).localeCompare(String(a.ref))), ref = lista.find(x => x.ref === o.mes[t]) || lista[0]; if (!ref) continue;
      try { if (!ORC.bk[t][ref.ref]) ORC.bk[t][ref.ref] = (await lerGz(base + ref.arquivo)).compMap || {}; ORC.ref[t] = {ref: ref.ref, comp: ref.competencia}; } catch (e) { ORC.erro = BANCOS[t] + ': ' + ((e && e.message) || e); } }
  } catch (e) { ORC.erro = (e && e.message) || String(e); }
  if (ORC.emop === undefined) { try { ORC.emop = await lerEmop(); } catch (e) { ORC.emop = null; } }
  ORC.carregando = false; ORC.pronto = true; orcRegistrar(); if (TAB === 'orc' || TAB === 'memo') render();
}
const sufEmop = (s, D) => D ? (s === '1' ? 'B' : 'A') : s;
function orcResolve(b, s, D) {
  if (s == null || s === false || s === '') return null;
  if (b === 'emop') { const E = ORC.emop, base = String(s).replace(/-[0-9AB]$/, ''), t = EMOP_TAB[base] || ['', '', '0'], full = base + '-' + sufEmop(t[2], D);
    if (E) { const v = E.map[s] || E.map[full] || E.map[base + '-' + sufEmop(t[2] === '0' ? '1' : '0', D)]; if (!v) return null; const p = +v.CUSTO; return {full: v.CODIGO, descr: v.DESCR1 || t[1], unid: v.UNID || t[0], preco: p > 0 ? p : null, src: 'emop'}; }
    return EMOP_TAB[base] ? {full, descr: t[1], unid: t[0], preco: null, src: 'emop', semBanco: true} : null; }
  const M = ORC.bk[b][(ORC.ref[b] || {}).ref]; if (!M) return null;
  let key = M[s] ? s : null;
  if (!key && b === 'sco') { if (!M.__idx) { Object.defineProperty(M, '__idx', {value: {}, enumerable: false}); Object.keys(M).forEach(k => { M.__idx[k.replace(/\s*\([^)]*\)\s*$/, '')] = k; }); } key = M.__idx[String(s).replace(/\s*\([^)]*\)\s*$/, '')] || null; }
  if (!key) return null; const c = M[key], pr = +(D ? c.precoCom : c.preco);
  return {full: key, descr: c.descr, unid: c.unid, preco: pr > 0 ? pr : null, src: b};
}
const orcOrdem = b => b === 'emop' ? ['emop', 'sinapi', 'sco'] : b === 'sinapi' ? ['sinapi', 'sco', 'emop'] : ['sco', 'sinapi', 'emop'];
const r2 = v => Math.round(v * 100) / 100;
function orcLinhas(sol, banco) {
  const o = orcCfg(); sol = sol || o.sol; banco = banco || o.banco; const ordem = orcOrdem(banco), L = [];
  ESG.itens(P, R, Q, sol).forEach(it => { const cod = it.cod || {}; if (cod[banco] === false) return; let r = null, b = null; const e = o.it[banco + '|' + it.k] || {};
    if (e.cod) { for (const bb of ordem) { const x = orcResolve(bb, e.cod, o.deson); if (x && !x.semBanco) { r = x; b = bb; break; } } if (!r) { r = {full: e.cod, descr: '', unid: '', preco: null, src: banco, naoAchou: true}; b = banco; } }
    else for (const bb of ordem) { if (bb !== banco && cod[bb] === false) continue; const x = orcResolve(bb, cod[bb], o.deson); if (!x) continue; if (x.preco == null && !(bb === 'emop' && banco === 'emop' && x.semBanco)) continue; r = x; b = bb; break; }
    const q = b && it.qb && it.qb[b] != null ? it.qb[b] : it.q, pb = r ? r.preco : null, manual = e.pu != null && e.pu !== '', pu = manual ? +e.pu : pb;
    L.push({g: it.g, k: it.k, nome: it.nome, un: r && r.unid && !manual ? r.unid : it.un, q, r, b, memo: it.memo, pBanco: pb, pu, manual, total: pu > 0 ? r2(r2(q) * pu) : 0}); });
  return L;
}
const orcTotal = (sol, banco) => { const L = orcLinhas(sol, banco), sub = L.reduce((s, i) => s + i.total, 0); return {sub, tot: sub * (1 + (+orcCfg().bdi || 0) / 100), sem: L.filter(i => !(i.pu > 0)).length, n: L.length}; };
const orcRefTxt = b => b === 'emop' ? (ORC.emop ? (ORC.emop.meta.origem || 'importada') : 'sem preços neste aparelho') : ((ORC.ref[b] || {}).comp || '—');
/* registra o programa no módulo comum de orçamento do site (janela das 3 soluções, cronograma, PDF, envio e “juntar programas”) */
function orcRegistrar() {
  if (!window.TCORC || ORC.reg) return; ORC.reg = true;
  try { TCORC.registrar({prog: 'esgoto', nome: 'Esgoto Sanitário', solucoes: ESG.SOL, grupos: ESG.GRUPOS, params: [],
    itens: sol => { if (!R || !R.ok || !Q) return {erro: 'Calcule a rede primeiro (Traçado › 🧭 Gerar rede).'}; return ESG.itens(P, R, Q, sol.k).map(i => ({g: i.g, nome: i.nome, un: i.un, q: i.q, cod: i.cod, qb: i.qb || undefined, memo: i.memo})); },
    projeto: () => ({nome: P.nome || 'Rede de esgoto', municipio: P.local || ''}),
    intro: 'As três soluções usam a mesma rede dimensionada (extensões, diâmetros, profundidades, PVs, elevatórias e sifões); mudam o tipo de poço de visita e o tipo de tubo de PVC.',
    rodape: 'Quantidades do dimensionamento. Valas: largura = diâmetro externo + folga; escoramento acima de 1,25 m. Cavas dos PVs: lado = Ø externo + 2 × folga, medidas à parte porque as composições de PV de EMOP, SINAPI e SCO não incluem escavação, escoramento nem reaterro.'}); } catch (e) { console.error(e); }
}
function vOrc(m) {
  if (!R.ok) { m.innerHTML = `<div class="card">${listaVerif()}</div>`; return; }
  const o = orcCfg(); if (!ORC.pronto && !ORC.carregando) orcCarregar();
  const L = orcLinhas(), sub = L.reduce((s, i) => s + i.total, 0), tot = sub * (1 + (+o.bdi || 0) / 100), sem = L.filter(i => !(i.pu > 0)).length, bk = o.banco; let g = '', gi = 0, ji = 0;
  const sg = {}; L.forEach(i => { sg[i.g] = (sg[i.g] || 0) + i.total; });
  const lin = L.map(i => { let h = ''; if (i.g !== g) { g = i.g; gi++; ji = 0; h = `<tr class="grp"><td colspan="6">${gi}. ${esc(g)}</td><td>${fm(sg[g], 2)}</td></tr>`; } ji++;
    const outro = i.b && i.b !== bk ? ` <span class="chip warn" title="Este serviço não tem composição no ${BANCOS[bk]}: usei o ${BANCOS[i.b]}">${BANCOS[i.b]}</span>` : '';
    const dsc = i.r && i.r.descr ? `<br><small title="${esc(i.r.descr)}">${esc(i.r.descr.slice(0, 130))}${i.r.descr.length > 130 ? '…' : ''}</small>` : (i.r && i.r.naoAchou ? '<br><small style="color:var(--err)">código não encontrado em nenhum banco</small>' : (!i.r ? '<br><small style="color:var(--warn-ink)">sem composição nos bancos: digite o preço ou o código</small>' : ''));
    return h + `<tr><td>${gi}.${ji}</td><td class="l"><input class="l" style="min-width:128px" data-orccod="${i.k}" value="${esc(i.r ? i.r.full : '')}" placeholder="código"/>${outro}</td>
      <td class="l" style="white-space:normal;min-width:280px"><b>${esc(i.nome)}</b>${dsc}<br><small class="mut">📐 ${esc(i.memo)}</small></td>
      <td>${esc(i.un)}</td><td>${fm(i.q, 2)}</td><td><input data-orcpu="${i.k}" inputmode="decimal" value="${i.manual ? fm(i.pu, 2) : ''}" placeholder="${i.pBanco != null ? fm(i.pBanco, 2) : 'preço'}" title="Vazio = preço do banco"/></td><td class="${i.total ? '' : 'w'}">${i.total ? fm(i.total, 2) : 'sem preço'}</td></tr>`; }).join('');
  const meses = bk === 'emop' ? '' : `<div class="f"><select id="orc-mes" title="Mês de referência">${ORC.ind ? (ORC.ind[bk] || []).slice().sort((a, b) => String(b.ref).localeCompare(String(a.ref))).map(x => `<option value="${x.ref}"${x.ref === (ORC.ref[bk] || {}).ref ? ' selected' : ''}>${x.competencia}</option>`).join('') : '<option>…</option>'}</select></div>`;
  const comp = ORC.pronto ? `<div class="tw" style="margin-top:10px"><table><thead><tr><th class="l">Solução (total com BDI)</th>${Object.keys(BANCOS).map(b => `<th>${BANCOS[b]}<small>${esc(orcRefTxt(b))}</small></th>`).join('')}<th></th></tr></thead><tbody>${ESG.SOL.map(s => `<tr class="${s.k === o.sol ? 'sel' : ''}"><td class="l" style="white-space:normal"><b>${esc(s.nome)}</b><br><small class="mut">${esc(s.desc)}</small></td>${Object.keys(BANCOS).map(b => { const t = orcTotal(s.k, b); return `<td>${t.tot > 0 ? 'R$ ' + fm(t.tot, 2) : 'sem preços'}${t.sem ? `<br><small class="mut">${t.sem} sem preço</small>` : ''}</td>`; }).join('')}<td><button class="bt peq${s.k === o.sol ? ' on' : ''}" data-orcsol="${s.k}">${s.k === o.sol ? '✔ em uso' : 'Usar'}</button></td></tr>`).join('')}</tbody></table></div>` : '';
  m.innerHTML = `<div class="card"><div class="barra"><h2 style="margin:0">Orçamento da rede</h2><span class="esp"></span>
      <div class="f"><select id="orc-banco" title="Banco de preços">${Object.keys(BANCOS).map(b => `<option value="${b}"${b === bk ? ' selected' : ''}>${BANCOS[b]}</option>`).join('')}</select></div>${meses}
      <label style="font-size:.84rem;display:flex;gap:5px;align-items:center"><input type="checkbox" id="orc-deson"${o.deson ? ' checked' : ''}/> desonerado</label>
      <div class="f" style="width:84px"><input id="orc-bdi" inputmode="decimal" value="${fm(+o.bdi || 0, 2)}" title="BDI (%)"/></div><span class="mut" style="font-size:.8rem">% BDI</span></div>
    <div class="barra"><button class="bt peq pri" data-act="orcEnviar" title="Abre o programa de Orçamento já com esta planilha para importar">🚀 Enviar ao Orçamento</button><button class="bt peq" data-act="xlsOrc">⬇ Planilha Excel</button>
      <button class="bt peq" data-act="orcTres" title="Janela comum do site: 3 soluções, cronograma físico-financeiro, PDF e juntar com outros programas">💰 3 soluções, cronograma e PDF</button><button class="bt peq" data-act="orcDeNovo">⟳ Recarregar bancos</button><button class="bt peq" data-act="orcLimpar" title="Apaga códigos e preços digitados">🧹 Voltar aos códigos do programa</button></div>
    ${ORC.erro ? `<div class="aviso">Não consegui abrir um banco de preços do site (${esc(ORC.erro)}). As quantidades estão certas; digite os preços ou tente de novo com internet.</div>` : ORC.carregando ? '<div class="aviso inf">Abrindo os bancos SINAPI e SCO-Rio do site e a EMOP deste aparelho…</div>' : ''}
    ${bk === 'emop' && ORC.pronto && !ORC.emop ? '<div class="aviso"><b>EMOP sem preços neste aparelho.</b> A EMOP é licenciada: importe o catálogo EMOP no programa de <a href="/orcamento/" target="tc_orcamento">Orçamento</a> (neste mesmo navegador) e volte aqui — os preços aparecem sozinhos. Enquanto isso os itens EMOP saem com o código certo e sem preço, e os demais usam SINAPI/SCO.</div>' : ''}
    <div class="kpis" style="margin-bottom:10px"><div class="kpi"><b>R$ ${fm(sub, 2)}</b><span>Custo direto — ${BANCOS[bk]} ${esc(orcRefTxt(bk))}</span></div><div class="kpi"><b>R$ ${fm(tot, 2)}</b><span>Total com BDI</span></div><div class="kpi"><b>R$ ${fm(tot / Math.max(1, R.vaz.Lt), 2)}</b><span>por metro de rede</span></div><div class="kpi"><b>R$ ${fm(tot / Math.max(1, R.c.popF), 2)}</b><span>por habitante</span></div><div class="kpi"><b>${L.length}</b><span>itens</span></div></div>
    ${sem ? `<div class="aviso">${sem} item(ns) sem preço: composições próprias (quadro da elevatória, passeio) ou serviços sem composição nos três bancos. Digite o preço ou o código para entrarem no total.</div>` : ''}
    ${comp}</div>
    <div class="card"><div class="tw"><table><thead><tr><th>Item</th><th class="l">Código</th><th class="l">Serviço</th><th>Un.</th><th>Quantidade</th><th>Preço unit. (R$)</th><th>Total (R$)</th></tr></thead><tbody>${lin}</tbody>
      <tfoot><tr><td colspan="6" style="text-align:right">Custo direto</td><td>${fm(sub, 2)}</td></tr><tr><td colspan="6" style="text-align:right">BDI ${fm(+o.bdi || 0, 2)} %</td><td>${fm(tot - sub, 2)}</td></tr><tr><td colspan="6" style="text-align:right">TOTAL</td><td>${fm(tot, 2)}</td></tr></tfoot></table></div>
    <p class="mut" style="font-size:.78rem;margin:8px 0 0">Quantidades do dimensionamento. <b>Valas:</b> largura = diâmetro externo + folga, profundidade média do trecho + berço, escoramento acima de 1,25 m. <b>Cavas dos PVs</b> (as composições de PV de EMOP, SINAPI e SCO não incluem escavação): cava de lado Ø externo + 2 × ${fm(R.c.folgaCava, 2)} m, medida à parte, com escoramento, lastro e reaterro. Serviço que não existe no banco escolhido usa o equivalente de outro banco (etiqueta ao lado do código). Não entram: rebaixamento de lençol, sinalização, canteiro e administração local.</p></div>`;
}
/* planilha no mesmo formato que o “Importar Lista” do programa de Orçamento lê (ITEM, CÓDIGO, DESCRIÇÃO, UNIDADE, QUANTIDADE, VALOR UNITÁRIO, TOTAL, FONTE) */
function orcAoa() {
  const o = orcCfg(), L = orcLinhas(), sol = ESG.SOL.find(s => s.k === o.sol), H = ['ITEM', 'CÓDIGO', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'VALOR UNITÁRIO', 'TOTAL', 'FONTE'];
  const aoa = [['ORÇAMENTO — ESGOTO SANITÁRIO — ' + sol.nome.toUpperCase()], [(P.nome || '') + (P.local ? ' — ' + P.local : '')], ['Banco ' + BANCOS[o.banco] + ' ' + orcRefTxt(o.banco) + ' · ' + (o.deson ? 'desonerado' : 'não desonerado') + ' · preços sem BDI; BDI de referência ' + fm(+o.bdi || 0, 2) + ' %'], [], H];
  const mem = [['MEMÓRIA DE CÁLCULO DAS QUANTIDADES'], [], ['ITEM', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'MEMÓRIA DE CÁLCULO']]; let gi = 0; const subs = [];
  ESG.GRUPOS.forEach(g => { const ls = L.filter(i => i.g === g); if (!ls.length) return; gi++; const nome = 'ESGOTO SANITÁRIO — ' + g; aoa.push([String(gi), '', nome, '', '', '', '', '']); mem.push([String(gi), nome, '', '', '']); const ini = aoa.length + 1;
    ls.forEach((i, j) => { const n = aoa.length + 1, q = r2(i.q), p = i.pu > 0 ? r2(i.pu) : '';
      aoa.push([gi + '.' + (j + 1), i.r ? i.r.full : '', i.r && i.r.descr ? i.r.descr : i.nome, i.un, q, p, p === '' ? '' : {t: 'n', v: r2(q * p), f: `ROUND(E${n}*F${n},2)`}, i.manual ? 'Preço informado' : i.r ? BANCOS[i.r.src] + (i.r.semBanco ? ' (preço no Orçamento)' : '') : 'sem composição']);
      mem.push([gi + '.' + (j + 1), i.nome, i.un, q, i.memo]); });
    const n = aoa.length + 1; subs.push('G' + n); aoa.push(['', '', 'SUBTOTAL DO ITEM ' + gi, '', '', '', {t: 'n', v: r2(ls.reduce((s, i) => s + i.total, 0)), f: `SUM(G${ini}:G${n - 1})`}, '']); });
  const sub = L.reduce((s, i) => s + i.total, 0), bdi = +o.bdi || 0, n = aoa.length + 2;
  aoa.push([], ['', '', 'TOTAL SEM BDI', '', '', '', {t: 'n', v: r2(sub), f: subs.join('+') || '0'}, ''], ['', '', 'BDI ' + fm(bdi, 2) + ' %', '', '', '', {t: 'n', v: r2(sub * bdi / 100), f: `ROUND(G${n}*${bdi}/100,2)`}, ''], ['', '', 'TOTAL GERAL', '', '', '', {t: 'n', v: r2(sub * (1 + bdi / 100)), f: `G${n}+G${n + 1}`}, '']);
  return {aoa, mem, sol, o};
}
function orcWb() {
  const A = orcAoa(), wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(A.aoa);
  Object.keys(ws).forEach(k => { const c = ws[k]; if (c && c.t === 'n' && /^[E-G]/.test(k)) c.z = '#,##0.00'; });
  ws['!cols'] = [{wch: 7}, {wch: 26}, {wch: 80}, {wch: 8}, {wch: 12}, {wch: 14}, {wch: 15}, {wch: 26}]; XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');
  const wm = XLSX.utils.aoa_to_sheet(A.mem); wm['!cols'] = [{wch: 7}, {wch: 70}, {wch: 8}, {wch: 12}, {wch: 110}]; XLSX.utils.book_append_sheet(wb, wm, 'Memória de cálculo');
  const wsol = XLSX.utils.aoa_to_sheet([['SOLUÇÃO'], [A.sol.nome], [A.sol.desc], [], ['Quantidades calculadas pelo programa Esgoto Sanitário (Total Civil) a partir do dimensionamento; confira os critérios na aba Memória de cálculo.']]); wsol['!cols'] = [{wch: 120}]; XLSX.utils.book_append_sheet(wb, wsol, 'Solução');
  wb.Props = {Title: A.aoa[0][0], Author: P.autor || 'Total Civil', Company: 'Total Civil'};
  return wb;
}
const carregarXlsx = async () => { if (!window.XLSX) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); };
async function xlsOrc() {
  try { await carregarXlsx(); } catch (e) { return toast('Sem internet para gerar o Excel. Conecte e tente de novo.'); }
  const wb = orcWb(), ap = (nome, linhas) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nome);
  ap('Dimensionamento', linhasDim()); ap('PVs', linhasPV()); ap('Cavas dos PVs', linhasCava()); if (Object.keys(R.eee).length) ap('Elevatórias', linhasEEE());
  XLSX.writeFile(wb, nomeArq() + '_orcamento_' + orcCfg().banco + '.xlsx'); toast('Planilha gerada: orçamento, memória de cálculo, dimensionamento, PVs e cavas.');
}
async function orcEnviar() {
  let w = null; try { w = window.open('', 'tc_orcamento'); if (w && (!w.location.href || w.location.href === 'about:blank')) w.location.href = '/orcamento/'; } catch (e) { w = null; }
  try { await carregarXlsx(); } catch (e) { return toast('Sem internet para montar a planilha. Conecte e tente de novo.'); }
  const A = orcAoa(), o = A.o, env = {v: 1, origem: 'Esgoto Sanitário', projeto: P.nome || '', municipio: P.local || '', solucao: A.sol.nome, banco: BANCOS[o.banco], regime: o.deson ? 'D' : 'O', bdi: +o.bdi || 0,
    arquivo: 'orcamento-esgoto-' + o.sol + '-' + o.banco + '-' + nomeArq() + '.xlsx', b64: XLSX.write(orcWb(), {bookType: 'xlsx', type: 'base64'}), crono: null, em: new Date().toISOString()};
  try { localStorage.setItem('tc_envio_orcamento', JSON.stringify(env)); } catch (e) { return toast('Não coube no armazenamento do navegador. Use ⬇ Planilha Excel e o “Importar Lista” do Orçamento.'); }
  if (w) { try { w.focus(); } catch (e) {} toast('Enviado. O programa de Orçamento abre o Importar Lista com esta planilha.', 6000); }
  else toast('Enviado. O navegador bloqueou a nova aba: abra o Orçamento (totalcivil.com.br/orcamento) e a importação começa sozinha.', 8000);
}
function linhasCava() { const L = [['PV', 'Tipo', 'Ø interno (m)', 'Ø externo (m)', 'Profundidade (m)', 'Lado da cava (m)', 'Altura da cava (m)', 'Escavação além das valas (m³)', 'Reaterro (m³)', 'Lastro (m³)']];
  Q.pvs.forEach(p => L.push([nomeNo(noDe(p.id)), p.tipo, p.Dpv, a3(p.Dext), a3(p.prof), a3(p.B), a3(p.h), a3(p.esc), a3(p.reat), a3(p.lastro)]));
  Q.eee.forEach(e => L.push([e.nome, 'EEE', e.Dp, a3(e.Dext), a3(e.prof), a3(e.B), a3(e.h), a3(e.esc), a3(e.reat), '']));
  L.push([], ['Critério: cava quadrada de lado = Ø externo + 2 × folga (' + R.c.folgaCava + ' m); altura = profundidade + laje de fundo + lastro; desconta-se o volume das valas que chegam (meia cava × largura da vala); reaterro = escavação × (1 − área do PV ÷ área da cava).']); return L; }
function linhasEEE() { const L = [['Elevatória', 'Q bomba (L/s)', 'Q mín. (L/s)', 'AMT (mca)', 'Desnível (m)', 'Perda distribuída (m)', 'Perda localizada (m)', 'Potência (cv)', 'Motor (cv)', 'Bombas', 'Recalque', 'DN', 'Extensão (m)', 'V (m/s)', 'Volume útil (m³)', 'Ø poço (m)', 'NA máx.', 'NA mín.', 'Fundo', 'Detenção (min)', 'Golpe de aríete (mca)', 'Pressão máx. (mca)']];
  Object.values(R.eee).forEach(E => L.push([E.nome, a3(E.Qb), a3(E.Qmin), a3(E.AMT), a3(E.Hg), a3(E.hf), a3(E.hl), a3(E.Pcv), E.Pm, '1 + 1 reserva', E.matNome, E.dn, a3(E.Lr), a3(E.V), a3(E.Vu), E.Dp, a3(E.NAmax), a3(E.NAmin), a3(E.fundo), a3(E.td), a3(E.dHa), a3(E.Pmax)])); return L; }

/* ══ MEMORIAL ══ */
function memorialHTML() {
  const c = R.c, v = R.vaz, f = fm, hoje = new Date().toLocaleDateString('pt-BR'), o = orcCfg(), L = orcLinhas(), sub = L.reduce((s, i) => s + i.total, 0);
  const tb = (cab, lin) => `<table><thead><tr>${cab.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${lin.map(l => `<tr>${l.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const dim = []; R.coletores.forEach(col => col.trechos.forEach(id => { const r = R.tr[id]; dim.push([r.nome, esc(nomeNo(noDe(r.de))), esc(nomeNo(noDe(r.para))), f(r.L, 1), f(r.QjI, 2), f(r.QjF, 2), r.D, f(r.I * 100, 3), f(r.Imin * 100, 3), f(r.ciM, 3), f(r.ciJ, 3), f(r.profM, 2), f(r.profJ, 2), f(r.hI.yd, 2), r.hF.carga ? 'cheio' : f(r.hF.yd, 2), f(r.hI.V, 2), f(r.hF.V, 2), f(r.hF.Vc, 2), f(r.hI.tau, 2)]); }));
  const pvs = Object.values(R.no).map(x => [esc(nomeNo(noDe(x.id))), x.tipo, f(x.ct, 3), f(x.cf, 3), f(x.prof, 2), f(x.Dpv, 2), x.tq || '—', f(x.QF, 2)]);
  const ex = R.tr[R.coletores[0].trechos[R.coletores[0].trechos.length - 1]];
  return `<div class="memo" id="memo"><h1>Memorial de cálculo — Rede coletora de esgoto sanitário</h1>
    <div><b>${esc(P.nome || '')}</b>${P.local ? ' · ' + esc(P.local) : ''}${P.autor ? ' · Responsável técnico: ' + esc(P.autor) : ''} · ${hoje}</div>
    <h2>1. Normas e critérios adotados</h2>
    <p>ABNT NBR 9649:1986 — Projeto de redes coletoras de esgoto sanitário${c.norma === '14486' ? '; ABNT NBR 14486:2000 — Projeto de redes coletoras com tubos de PVC' : ''}; ABNT NBR 9648:1986 — Estudo de concepção; NR-18 (escoramento de valas). Sistema separador absoluto, escoamento livre.</p>
    ${tb(['Critério', 'Valor', 'Critério', 'Valor'], [
      ['Coeficiente de Manning n', f(c.n, 3) + ' (concreto 0,013)', 'Tensão trativa mínima', f(c.tau, 1) + ' Pa (vazão inicial)'],
      ['Vazão mínima de cálculo', f(c.qMin, 1) + ' L/s', 'Diâmetro mínimo', 'DN ' + c.dMin],
      ['Lâmina máxima y/D', f(c.yD, 2) + ' (vazão final)', 'y/D quando V &gt; V crítica', f(c.yDvc, 2)],
      ['Velocidade máxima', f(c.vMax, 1) + ' m/s', 'Recobrimento mínimo', f(c.rec, 2) + ' m na via · ' + f(c.recPas, 2) + ' m no passeio'],
      ['Tubo da rede até DN 400', esc((ESG.TUBOS[c.mat] || ESG.TUBOS.pvcm).nome), 'Diâmetro de cálculo', c.usaDI ? 'interno real do tubo (DI)' : 'nominal (DN)'],
      ['Distância máxima entre PVs', f(c.distMax, 0) + ' m', 'Tubo de queda a partir de', f(c.degTQ, 2) + ' m de degrau'],
      ['Taxa de infiltração', f(c.tInf, 3) + ' L/s·km', 'Controle de remanso', c.remanso ? 'sim' : 'não']])}
    <h2>2. Vazões de projeto</h2>
    ${c.modo === 'taxa' ? `<p>Taxa de contribuição linear informada: inicial ${f(c.txI, 3)} e final ${f(c.txF, 3)} L/s·km sobre ${f(v.Lc, 1)} m de rede com lotes.</p>` : `
    <div class="fx">Q inicial = K2 · C · P<sub>i</sub> · q<sub>i</sub> / 86 400 = ${f(c.K2, 2)} × ${f(c.C, 2)} × ${f(c.popI, 0)} × ${f(c.qI, 0)} / 86 400${R.fator !== 1 ? ' × ' + f(R.fator, 2) : ''} = <b>${f(v.QdI, 2)} L/s</b></div>
    <div class="fx">Q final = K1 · K2 · C · P<sub>f</sub> · q<sub>f</sub> / 86 400 = ${f(c.K1, 2)} × ${f(c.K2, 2)} × ${f(c.C, 2)} × ${f(c.popF, 0)} × ${f(c.qF, 0)} / 86 400${R.fator !== 1 ? ' × ' + f(R.fator, 2) : ''} = <b>${f(v.QdF, 2)} L/s</b></div>`}
    <div class="fx">Taxa de contribuição linear = Q / L<sub>contribuinte</sub> + T<sub>inf</sub> → inicial ${f(v.txI + c.tInf, 3)} · final ${f(v.txF + c.tInf, 3)} L/s·km (L = ${f(v.Lc, 1)} m; infiltração total ${f(v.inf, 2)} L/s)</div>
    <p>Vazão de cada trecho = vazão de montante + taxa linear × extensão (lotes dos dois lados = 100 %, de um lado = 50 %) + contribuições concentradas no PV. Nenhum trecho é calculado com menos de ${f(c.qMin, 1)} L/s. Vazão final no lançamento: <b>${f(R.Qfim, 2)} L/s</b>.</p>
    <h2>3. Método hidráulico</h2>
    <div class="fx">Manning: Q = (1/n) · A · R<sub>h</sub><sup>2/3</sup> · I<sup>1/2</sup>, com A e R<sub>h</sub> da seção circular parcialmente cheia (ângulo central θ = 2·arccos(1 − 2·y/D))</div>
    <div class="fx">Tensão trativa: σ = γ · R<sub>h</sub> · I ≥ ${f(c.tau, 1)} Pa, com a vazão inicial (autolimpeza)</div>
    <div class="fx">Velocidade crítica: V<sub>c</sub> = 6 · (g · R<sub>h</sub>)<sup>1/2</sup>; se V final &gt; V<sub>c</sub>, a lâmina fica limitada a ${f(c.yDvc, 2)} D (entrada de ar no escoamento)</div>
    <p>Para cada trecho o programa procura, do menor diâmetro para o maior, a solução de menor escavação: declividade igual à do terreno (recobrimento mínimo nas duas pontas) sempre que ela atende à tensão trativa; senão a declividade mínima; em terreno muito inclinado a declividade é limitada pela velocidade máxima e a diferença vira degrau ou tubo de queda no PV de montante. O diâmetro nunca diminui para jusante e a cota de saída de cada PV fica igual ou abaixo da menor chegada, rebaixada o necessário para que o nível d'água de saída não fique acima do de chegada (controle de remanso). Exemplo, trecho ${ex.nome}: Q<sub>i</sub> = ${f(ex.QI, 2)} e Q<sub>f</sub> = ${f(ex.QF, 2)} L/s, DN ${ex.D}, I = ${f(ex.I, 5)} m/m → y/D = ${f(ex.hF.yd, 2)}, V = ${f(ex.hF.V, 2)} m/s, R<sub>h</sub> inicial = ${f(ex.hI.Rh, 4)} m, σ = 9 806,65 × ${f(ex.hI.Rh, 4)} × ${f(ex.I, 5)} = ${f(ex.hI.tau, 2)} Pa.</p>
    <h2>4. Planilha de dimensionamento</h2>
    ${tb(['Trecho', 'Mont.', 'Jus.', 'L (m)', 'Q<sub>i</sub> (L/s)', 'Q<sub>f</sub> (L/s)', 'DN', 'I (%)', 'I mín. (%)', 'CC mont.', 'CC jus.', 'Prof. mont.', 'Prof. jus.', 'y/D<sub>i</sub>', 'y/D<sub>f</sub>', 'V<sub>i</sub>', 'V<sub>f</sub>', 'V<sub>c</sub>', 'σ (Pa)'], dim)}
    <h2>5. Poços de visita e terminais de limpeza</h2>
    ${tb(['PV', 'Tipo', 'Cota terreno', 'Cota fundo', 'Prof. (m)', 'Ø (m)', 'Tubos de queda', 'Q final (L/s)'], pvs)}
    ${memoExtra()}<h2>6. Verificação</h2>
    ${R.checks.filter(k => k.st !== 'info').length ? '<ul>' + R.checks.filter(k => k.st !== 'info').map(k => `<li><b>${k.st === 'err' ? 'ERRO' : 'Alerta'} — ${esc(k.onde)}:</b> ${esc(k.msg)}</li>`).join('') + '</ul>' : '<p>Todos os trechos atendem a tensão trativa mínima, lâmina máxima, velocidade máxima, recobrimento mínimo e controle de remanso.</p>'}
    <p>Resumo: ${R.ordem.length} trechos, ${f(v.Lt, 1)} m de rede, ${Object.keys(R.no).length} PVs/TLs, ${Q.tq} tubo(s) de queda, profundidade máxima ${f(R.profMaxima, 2)} m. Extensão por diâmetro: ${Object.keys(Q.tubos).map(D => 'DN ' + D.split('|')[1] + ' = ' + f(Q.tubos[D], 1) + ' m').join(' · ')}.</p>
    <h2>7. Quantitativos${sub > 0 ? ' e orçamento' : ''}</h2>
    ${tb(['Código', 'Serviço', 'Un.', 'Quantidade'].concat(sub > 0 ? ['Preço unit.', 'Total (R$)'] : []), L.map(i => [esc(i.r ? i.r.full : ''), esc(i.nome), esc(i.un), f(i.q, 2)].concat(sub > 0 ? [i.pu > 0 ? f(i.pu, 2) : '—', i.total ? f(i.total, 2) : '—'] : [])))}
    ${sub > 0 ? `<p>Custo direto R$ ${f(sub, 2)} · BDI ${f(+o.bdi || 0, 2)} % · <b>Total R$ ${f(sub * (1 + (+o.bdi || 0) / 100), 2)}</b> · referência ${BANCOS[o.banco]} ${esc(orcRefTxt(o.banco))}${o.deson ? ', desonerado' : ', não desonerado'} · solução: ${esc(ESG.SOL.find(x => x.k === o.sol).nome)}.</p>` : ''}
    <p><b>Critérios de medição.</b> Vala: largura = diâmetro externo + ${f(c.folga, 2)} m (mínimo 0,65 m); profundidade média do trecho + berço de ${f(c.berco, 2)} m; escoramento nas valas com mais de 1,25 m (NR-18). Cava dos poços de visita (as composições de PV de EMOP, SINAPI e SCO não incluem escavação, escoramento nem reaterro): cava quadrada de lado = Ø externo + 2 × ${f(c.folgaCava, 2)} m e altura = profundidade + laje + lastro de ${f(c.lastro, 2)} m, descontado o volume das valas que chegam; reaterro = escavação × (1 − área do PV ÷ área da cava). Bota-fora = (escavação total ${f(Q.escTot, 1)} m³ − reaterro ${f(Q.reatTot, 1)} m³) × empolamento ${f(c.empol, 2)}.</p>
    <h2>8. Planta da rede</h2><div style="text-align:center">${plantaSVG(980)}</div>
    <h2>9. Perfis longitudinais</h2>${R.coletores.map(col => `<div style="margin:8px 0;overflow:auto">${perfilSVG(col.trechos, 10, 980)}</div>`).join('')}
    <p style="margin-top:18px;color:#555">Gerado no programa Esgoto Sanitário — Total Civil (totalcivil.com.br). O projetista é responsável pela conferência dos dados de entrada, das cotas de campo e das exigências da concessionária local.</p></div>`;
}
function memoExtra() {
  const f = fm, c = R.c, E = Object.values(R.eee), S = R.ordem.map(id => R.tr[id]).filter(r => r.sif); let s = '';
  if (E.length) { s += '<h2>5.1 Estações elevatórias e linhas de recalque (NBR 12208)</h2>';
    E.forEach(e => { s += `<p><b>${esc(e.nome)}</b> — recalque em ${esc(e.matNome)} DN ${e.dn}, ${f(e.Lr, 1)} m até ${esc(e.ateNome)}.</p>
      <div class="fx">Vazão de bombeamento Q<sub>b</sub> = vazão máxima final afluente = <b>${f(e.Qb, 2)} L/s</b> (mínima ${f(e.Qmin, 2)} L/s, com K3 = ${f(c.K3, 2)}) · 2 conjuntos (1 + 1 reserva)</div>
      <div class="fx">Volume útil do poço V<sub>u</sub> = Q<sub>b</sub> · T / 4 = ${f(e.Qb, 2)} × ${f(c.eCiclo, 0)} min × 60 / 4 / 1000 = <b>${f(e.Vu, 2)} m³</b> → poço Ø ${f(e.Dp, 2)} m, altura útil ${f(e.hu, 2)} m (NA máx. ${f(e.NAmax, 3)} · NA mín. ${f(e.NAmin, 3)} · fundo ${f(e.fundo, 3)})</div>
      <div class="fx">Tempo de detenção com a vazão média = ${f(e.td, 1)} min (limite ${f(c.eDet, 0)} min)</div>
      <div class="fx">Velocidade no recalque V = Q / A = <b>${f(e.V, 2)} m/s</b> (DI ${f(e.d * 1000, 1)} mm)</div>
      <div class="fx">Hazen-Williams (C = ${e.C}): J = 10,643 · Q<sup>1,852</sup> / (C<sup>1,852</sup> · D<sup>4,87</sup>) → perda distribuída ${f(e.hf, 2)} m (com 10 % de folga) · localizadas K = ${f(c.eKloc, 0)} → ${f(e.hl, 2)} m</div>
      <div class="fx">Altura manométrica AMT = desnível ${f(e.Hg, 2)} + ${f(e.hf, 2)} + ${f(e.hl, 2)} = <b>${f(e.AMT, 2)} mca</b></div>
      <div class="fx">Potência P = γ · Q · AMT / (75 · η) = ${f(e.Pcv, 2)} cv (η = ${f(c.eEta, 2)}) → motor comercial <b>${f(e.Pm, 1)} cv</b> (folga ${f(c.eFolgaMotor, 0)} %)</div>
      <div class="fx">Golpe de aríete (Joukowsky): ΔH = a · V / g = ${f(e.dHa, 1)} mca → pressão máxima ${f(e.Pmax, 1)} mca (classe do tubo ${e.pn} mca)</div>`; }); }
  if (S.length) { s += '<h2>5.2 Sifões invertidos</h2>' + S.map(r => { const x = r.sif; return `<p><b>Trecho ${r.nome}</b> — ${x.n} linha(s) de ${esc(x.matNome)} DN ${x.dn}, ${f(r.L, 1)} m. Velocidade com a vazão inicial numa linha ${f(x.Vi, 2)} m/s (mínima ${f(c.sVmin, 2)} m/s para autolimpeza); com a vazão final em todas as linhas ${f(x.Vf, 2)} m/s. Perda de carga (Hazen-Williams + localizadas 1,5·V²/2g + 0,05 m) = <b>${f(x.dH, 3)} m</b> = desnível entre as câmaras de entrada (${f(r.ciM, 3)}) e de saída (${f(r.ciJ, 3)}). Fundo do sifão na cota ${f(x.fundo, 3)} (obstáculo ${f(x.obst, 3)}, proteção ${f(x.prot, 2)} m).</p>`; }).join(''); }
  return s;
}
function vMemo(m) {
  if (!R.ok) { m.innerHTML = `<div class="card">${listaVerif()}</div>`; return; }
  if (!ORC.pronto && !ORC.carregando) orcCarregar();
  m.innerHTML = `<div class="barra noprint"><button class="bt pri" data-act="imprimir">🖨 Imprimir / salvar em PDF</button><button class="bt" data-act="word">⬇ Word (.doc)</button><button class="bt" data-act="xlsOrc">⬇ Planilhas (Excel)</button><button class="bt" data-act="cadDxf">⬇ Projeto DXF</button><button class="bt" data-act="cadDwg">⬇ Projeto DWG</button><button class="bt" data-act="expJson">⬇ Projeto (.json)</button></div>${memorialHTML()}`;
}
