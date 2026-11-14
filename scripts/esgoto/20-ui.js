/* ════════════════════════════════════════════════════════════════════
   TELA — estado, projetos, abas Dados e Dimensionamento
   ════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fm = (v, d) => v == null || !isFinite(v) ? '—' : (+v).toLocaleString('pt-BR', {minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d});
const num = s => { if (typeof s === 'number') return s; s = String(s == null ? '' : s).trim().replace(/\s/g, ''); if (s === '') return NaN; if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return parseFloat(s); };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
let toastT; function toast(m, ms) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 3800); }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const baixar = (nome, txt, tipo) => { const a = document.createElement('a'); a.href = URL.createObjectURL(txt instanceof Blob ? txt : new Blob([txt], {type: tipo || 'text/plain;charset=utf-8'})); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
const nomeArq = () => (P.nome || 'esgoto').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50) || 'esgoto';

const LS_DB = 'tc_esg_db', LS_CFG = 'tc_esg_cfg';
let DB = {cur: '', list: {}}, CFG = {tema: '', amb: '', tab: 'dados'}, P = null, R = null, Q = null, TAB = 'dados';
let SEL = null, UNDO = [], REDO = [];
const ABAS = [['dados', 'Dados'], ['tracado', 'Traçado'], ['dim', 'Dimensionamento'], ['perfil', 'Perfis e seções'], ['t3', '3D'], ['orc', 'Orçamento'], ['memo', 'Memorial']];

function migrar(p) { const b = ESG.novo(); p = Object.assign(b, p || {}); p.crit = Object.assign({}, ESG.CRIT0, p.crit || {}); ['ruas', 'topo', 'nos', 'trechos'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; }); p.orc = p.orc || {}; p.seq = p.seq || 1000; if (!Array.isArray(p.eee)) p.eee = []; p.crit.diMan = JSON.parse(JSON.stringify(p.crit.diMan || {})); return p; }
function carregar() {
  CFG = Object.assign(CFG, lsGet(LS_CFG, {})); DB = lsGet(LS_DB, null) || {cur: '', list: {}};
  if (!DB.cur || !DB.list[DB.cur]) { const id = uid(); DB.list[id] = ESG.novo(); DB.cur = id; }
  P = migrar(DB.list[DB.cur]); DB.list[DB.cur] = P; TAB = ABAS.some(a => a[0] === CFG.tab) ? CFG.tab : 'dados';
}
let saveT; function salvar() { clearTimeout(saveT); saveT = setTimeout(salvarJa, 400); }
function salvarJa() { clearTimeout(saveT); P.em = new Date().toISOString(); if (!lsSet(LS_DB, DB)) toast('Sem espaço no navegador para salvar. Exporte o projeto em 📁 Projetos.'); }
function recalc() { R = ESG.calc(P); Q = R.ok ? ESG.quant(P, R) : null; barraStatus(); }
/* toda alteração passa por aqui: guarda para desfazer, recalcula a rede inteira e redesenha */
function editar(fn, semRender) { const antes = JSON.stringify(P); fn(); if (JSON.stringify(P) === antes) return; UNDO.push(antes); if (UNDO.length > 40) UNDO.shift(); REDO = []; salvar(); recalc(); if (!semRender) render(); }
function desfazer(re) { const de = re ? REDO : UNDO, para = re ? UNDO : REDO; if (!de.length) return toast(re ? 'Nada para refazer.' : 'Nada para desfazer.'); para.push(JSON.stringify(P)); P = migrar(JSON.parse(de.pop())); DB.list[DB.cur] = P; salvar(); recalc(); render(); }
const novoId = pre => pre + (P.seq = (P.seq || 1000) + 1);
const noDe = id => P.nos.find(n => n.id === id), trDe = id => P.trechos.find(t => t.id === id), ruaDe = id => P.ruas.find(r => r.id === id);
const nomeNo = n => n ? (n.nome || n.id) : '?';
/* botão "ícone + texto": no celular fica só o ícone */
const rotBt = t => { const m = /^(\S+)\s(.+)$/.exec(t); return m ? m[1] + '<span class="tx"> ' + m[2] + '</span>' : t; };

/* ── barra de abas e de situação ── */
function desenharAbas() { $('abas').innerHTML = ABAS.map((a, i) => `<button class="tab-btn${a[0] === TAB ? ' active' : ''}" data-tab="${a[0]}"><i>${i + 1}</i>${a[1]}</button>`).join(''); }
function irAba(t) { if (TAB === 't3' && t !== 't3' && window.T3) T3.parar(); TAB = t; CFG.tab = t; lsSet(LS_CFG, CFG); desenharAbas(); render(); window.scrollTo(0, 0); }
function barraStatus() {
  const s = $('status'); if (!R) return;
  if (!R.ok) { s.innerHTML = `<span class="chip warn">${esc(R.erros[0] || 'Sem rede')}</span>`; return; }
  s.innerHTML = `<span class="chip cl ${R.nErr ? 'err' : 'ok'}" data-ir="dim">${R.nErr ? '✖ ' + R.nErr + ' erro(s)' : '✔ sem erros'}</span>
    <span class="chip cl ${R.nWarn ? 'warn' : 'ok'}" data-ir="dim">${R.nWarn ? '⚠ ' + R.nWarn + ' alerta(s)' : 'sem alertas'}</span>
    <span class="chip">Rede ${fm(R.vaz.Lt, 0)} m</span><span class="chip">${R.ordem.length} trechos · ${Object.keys(R.no).length} PVs</span>
    <span class="chip">Vazão final ${fm(R.Qfim, 2)} L/s</span><span class="chip">Prof. máx. ${fm(R.profMaxima, 2)} m</span>
    ${R.fator !== 1 ? `<span class="chip warn cl" data-act="fator1" title="Clique para voltar a 100 %">cenário ${fm(R.fator * 100, 0)} % da vazão ✕</span>` : ''}`;
}
function render() {
  $('pj-nome').value = P.nome || ''; const m = $('main');
  ({dados: vDados, tracado: vTracado, dim: vDim, perfil: vPerfil, t3: vT3, orc: vOrc, memo: vMemo}[TAB] || vDados)(m);
}

/* ── janelas ── */
function modal(html, grande) { $('mbox').className = 'mbox' + (grande ? ' g' : ''); $('mbox').innerHTML = '<button class="mx" data-fechar>×</button>' + html; $('modal').hidden = false; }
function fechar() { $('modal').hidden = true; $('mbox').innerHTML = ''; }

/* ══ ABA 1 — DADOS ══ */
const CAMPOS = {
  pop: [['popI', 'População inicial', 'hab', 0, 'Início de operação da rede'], ['popF', 'População final', 'hab', 0, 'Fim de plano (20 a 30 anos)'], ['qI', 'Consumo per capita inicial', 'L/hab·dia', 0], ['qF', 'Consumo per capita final', 'L/hab·dia', 0],
    ['C', 'Coeficiente de retorno C', '', 2, 'Parte da água que vira esgoto (0,80)'], ['K1', 'K1 — dia de maior consumo', '', 2], ['K2', 'K2 — hora de maior consumo', '', 2], ['tInf', 'Infiltração', 'L/s·km', 3, 'NBR 9649: 0,05 a 1,0'], ['qMin', 'Vazão mínima do trecho', 'L/s', 2, 'NBR 9649: 1,5 L/s']],
  taxa: [['txI', 'Taxa linear inicial', 'L/s·km', 3], ['txF', 'Taxa linear final', 'L/s·km', 3]],
  hid: [['n', 'Manning n', '', 3], ['tau', 'Tensão trativa mínima', 'Pa', 2], ['dMin', 'Diâmetro mínimo', 'mm', 0, 'Norma admite DN 100; usual DN 150'], ['yD', 'Lâmina máxima y/D', '', 2, 'NBR 9649: 0,75'], ['yDvc', 'y/D se V > V crítica', '', 2, 'NBR 9649: 0,50'], ['vMax', 'Velocidade máxima', 'm/s', 1, 'NBR 9649: 5 m/s']],
  rede: [['rec', 'Recobrimento mínimo na via', 'm', 2, 'NBR 9649: 0,90 m no leito da via'], ['recPas', 'Recobrimento mínimo no passeio', 'm', 2, 'NBR 9649: 0,65 m — marque o trecho como “passeio” no Traçado'], ['profMax', 'Profundidade para alerta', 'm', 1], ['degTQ', 'Degrau que pede tubo de queda', 'm', 2, 'NBR 9649: a partir de 0,50 m'], ['distPV', 'Distância entre PVs ao gerar', 'm', 0], ['distMax', 'Distância máxima entre PVs', 'm', 0, 'Alcance da limpeza: 100 m'], ['profTL', 'Cabeceira com TL até', 'm', 2, 'Mais fundo que isso vira PV']],
  vala: [['folga', 'Folga da vala (largura = DN + folga)', 'm', 2], ['berco', 'Berço de areia', 'm', 2], ['envolt', 'Envoltória acima do tubo', 'm', 2], ['espPav', 'Espessura do asfalto reposto', 'm', 2], ['habLig', 'Habitantes por ligação', 'hab', 1], ['ramal', 'Comprimento do ramal predial', 'm', 1], ['dmt', 'DMT do bota-fora', 'km', 1], ['largRua', 'Largura da rua (desenho)', 'm', 1], ['folgaCava', 'Folga da cava do PV (cada lado)', 'm', 2, 'Espaço de trabalho em volta do PV'], ['lastro', 'Lastro de brita sob o PV', 'm', 2], ['empol', 'Empolamento do solo', '', 2]],
  eee: [['eCiclo', 'Ciclo mínimo das bombas', 'min', 0, 'Define o volume útil: V = Q·T/4'], ['eDet', 'Detenção máxima no poço', 'min', 0, 'NBR 12208: 30 min'], ['eEta', 'Rendimento do conjunto', '', 2], ['eFolgaMotor', 'Folga do motor', '%', 0], ['eVmin', 'Velocidade mínima no recalque', 'm/s', 2], ['eVmax', 'Velocidade máxima no recalque', 'm/s', 2], ['eKloc', 'Σ K das perdas localizadas', '', 1], ['eSub', 'Submergência mínima da bomba', 'm', 2], ['eRecRec', 'Recobrimento do recalque', 'm', 2], ['K3', 'K3 — hora de menor consumo', '', 2]],
  sif: [['sVmin', 'Velocidade mínima (autolimpeza)', 'm/s', 2], ['sDmin', 'Diâmetro mínimo', 'mm', 0], ['sLinhas', 'Número de linhas', '', 0, '2 = uma para a vazão inicial e outra de reforço'], ['sProt', 'Proteção sob o obstáculo', 'm', 2]]
};
const campo = c => `<div class="f"><label>${c[1]}${c[2] ? ' <small>(' + c[2] + ')</small>' : ''}</label><input data-crit="${c[0]}" inputmode="decimal" value="${fm(P.crit[c[0]], c[3]).replace(/\./g, '')}"/>${c[4] ? '<div class="aj">' + c[4] + '</div>' : ''}</div>`;
function inicioRapido() {
  return `<div class="card"><h2>Começar em 3 passos</h2><div class="ini">
    <button data-act="exemplo"><b>① Exemplo pronto</b><span>Bairro em malha já calculado, para conhecer o programa.</span></button>
    <button data-act="irTracado"><b>② Desenhar as ruas</b><span>Clique no mapa: cada rua tem o nome digitado uma única vez.</span></button>
    <button data-act="colarRuas"><b>③ Colar tabela de ruas</b><span>Nome; X; Y; cota… direto do Excel ou do levantamento.</span></button>
  </div><p class="mut" style="margin:10px 0 0;font-size:.84rem">Depois é só apertar <b>🧭 Gerar rede</b>: o programa cria os PVs, define o sentido do esgoto pelo terreno, calcula vazões, diâmetros, cotas, perfis, 3D e orçamento.</p></div>`;
}
function vDados(m) {
  const c = P.crit, v = R && R.vaz || {};
  m.innerHTML = (!P.ruas.length && !P.trechos.length ? inicioRapido() : '') + `<div class="cols">
  <div class="card"><h2>Projeto</h2><div class="fg" style="grid-template-columns:1fr 1fr">
    <div class="f" style="grid-column:1/-1"><label>Nome do projeto</label><input data-proj="nome" value="${esc(P.nome)}"/></div>
    <div class="f"><label>Local / município</label><input data-proj="local" value="${esc(P.local)}"/></div>
    <div class="f"><label>Responsável técnico</label><input data-proj="autor" value="${esc(P.autor)}"/></div></div>
    <h3>Vazões de projeto</h3><div class="kpis">
      <div class="kpi"><b>${fm(v.QmedI, 2)}</b><span>Q média inicial L/s</span></div><div class="kpi"><b>${fm(v.QmedF, 2)}</b><span>Q média final L/s</span></div>
      <div class="kpi"><b>${fm(v.QdI, 2)}</b><span>Q máx. inicial L/s</span></div><div class="kpi"><b>${fm(v.QdF, 2)}</b><span>Q máx. final L/s</span></div>
      <div class="kpi"><b>${fm(v.inf, 2)}</b><span>Infiltração L/s</span></div><div class="kpi"><b>${fm(v.txF, 3)}</b><span>Taxa final L/s·km</span></div></div>
    <p class="mut" style="font-size:.8rem;margin:10px 0 0">Q inicial = K2·C·P·q/86400 · Q final = K1·K2·C·P·q/86400 · mais infiltração e contribuições concentradas (indústria, escola: informe no PV, no Traçado).</p></div>
  <div class="card"><h2>População e contribuição</h2>
    <div class="barra"><button class="bt peq${c.modo !== 'taxa' ? ' on' : ''}" data-modo="pop">Pela população</button><button class="bt peq${c.modo === 'taxa' ? ' on' : ''}" data-modo="taxa">Taxa linear informada</button></div>
    <div class="fg">${(c.modo === 'taxa' ? CAMPOS.taxa.concat(CAMPOS.pop.slice(7)) : CAMPOS.pop).map(campo).join('')}</div>
    ${c.modo === 'taxa' ? '<p class="mut" style="font-size:.8rem">A população continua valendo só para o número de ligações prediais do orçamento.</p><div class="fg">' + CAMPOS.pop.slice(1, 2).map(campo).join('') + '</div>' : ''}</div>
  <div class="card"><h2>Critérios hidráulicos</h2>
    <div class="f" style="margin-bottom:8px"><label>Norma / material</label><select data-norma>
      <option value="9649"${c.norma === '9649' ? ' selected' : ''}>NBR 9649 — n = 0,013 · τ ≥ 1,0 Pa (qualquer material)</option>
      <option value="14486"${c.norma === '14486' ? ' selected' : ''}>NBR 14486 — tubos de PVC: n = 0,010 · τ ≥ 0,6 Pa</option>
      <option value="livre"${c.norma === 'livre' ? ' selected' : ''}>Valores próprios (concessionária)</option></select></div>
    <div class="fg">${CAMPOS.hid.map(campo).join('')}</div>
    <label style="display:flex;gap:7px;align-items:center;margin-top:10px;font-size:.86rem"><input type="checkbox" data-chk="remanso"${c.remanso ? ' checked' : ''}/> Controle de remanso nos PVs (nível d'água de saída nunca acima do de chegada)</label></div>
  <div class="card"><h2>Rede, PVs e vala</h2><div class="fg">${CAMPOS.rede.map(campo).join('')}</div>
    <h3>Vala e orçamento</h3><div class="fg">${CAMPOS.vala.map(campo).join('')}
    <div class="f"><label>Pavimento a repor</label><select data-sel="pav">${[['asfalto', 'Asfalto'], ['paralelo', 'Paralelepípedo'], ['intertravado', 'Intertravado'], ['terra', 'Rua de terra (sem reposição)']].map(o => `<option value="${o[0]}"${c.pav === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div></div></div>
  ${dadosExtra()}</div>`;
}

/* ══ ABA 3 — DIMENSIONAMENTO ══ */
const stTr = id => { const k = R.checks.filter(c => c.id === id); return k.some(c => c.st === 'err') ? 'e' : k.some(c => c.st === 'warn') ? 'w' : 'o'; };
function listaVerif() {
  if (!R.ok) return `<div class="aviso err">${R.erros.map(esc).join('<br>')}</div>`;
  const e = R.checks.filter(c => c.st === 'err'), w = R.checks.filter(c => c.st === 'warn'), i = R.checks.filter(c => c.st === 'info');
  const li = l => l.map(c => `<div style="cursor:pointer" data-selc="${c.id || ''}"><b>${esc(c.onde)}:</b> ${esc(c.msg)}</div>`).join('');
  return (R.erros.length ? `<div class="aviso err">${R.erros.map(esc).join('<br>')}</div>` : '') +
    (e.length ? `<div class="aviso err"><b>✖ ${e.length} erro(s) — a rede não atende à norma:</b>${li(e)}</div>` : '') +
    (w.length ? `<div class="aviso"><b>⚠ ${w.length} alerta(s):</b>${li(w)}</div>` : '') +
    (!e.length && !w.length && !R.erros.length ? '<div class="aviso ok"><b>✔ Rede verificada:</b> tensão trativa, lâmina, velocidade, recobrimento e controle de remanso atendidos em todos os trechos.</div>' : '') +
    (i.length ? `<div class="aviso inf">${li(i)}</div>` : '');
}
function vDim(m) {
  if (!R.ok) { m.innerHTML = `<div class="card">${listaVerif()}<button class="bt pri" data-act="irTracado">Ir para o Traçado</button></div>`; return; }
  const dn = t => `<select data-tfix="D" data-id="${t.id}"><option value="">auto</option>${ESG.SERIE.map(D => `<option${+t.Dfix === D ? ' selected' : ''}>${D}</option>`).join('')}</select>`;
  const lin = R.coletores.map(col => `<tr class="grp"><td colspan="24">Coletor ${col.num} — ${fm(col.L, 1)} m</td></tr>` + col.trechos.map(id => {
    const r = R.tr[id], t = trDe(id), st = stTr(id), rua = ruaDe(t.rua);
    return `<tr data-tr="${id}" class="${SEL && SEL.id === id ? 'sel' : ''}"><td><b>${r.nome}</b>${r.recq ? '<br><small>recalque</small>' : r.sif ? '<br><small>sifão ' + r.sif.n + '×</small>' : t.loc === 'passeio' ? '<br><small>passeio</small>' : ''}</td><td class="l">${esc(rua ? rua.nome : '—')}</td><td class="l">${esc(nomeNo(noDe(r.de)))}</td><td class="l">${esc(nomeNo(noDe(r.para)))}</td>
      <td>${fm(r.L, 1)}</td><td><select data-tlad data-id="${id}"><option value="2"${t.lados == null || +t.lados === 2 ? ' selected' : ''}>2 lados</option><option value="1"${+t.lados === 1 ? ' selected' : ''}>1 lado</option><option value="0"${+t.lados === 0 ? ' selected' : ''}>sem</option></select></td>
      <td>${fm(r.QjI, 2)}</td><td>${fm(r.QjF, 2)}</td><td>${dn(t)}</td><td>${fm(r.iTer * 100, 2)}</td>
      <td><input data-tfix="I" data-id="${id}" placeholder="${fm(r.I * 100, 3)}" value="${t.iFix > 0 ? fm(t.iFix * 100, 3) : ''}" inputmode="decimal" title="Vazio = automático"/></td><td>${fm(r.Imin * 100, 3)}</td>
      <td>${fm(r.ctM, 3)}</td><td>${fm(r.ctJ, 3)}</td><td>${fm(r.ciM, 3)}</td><td>${fm(r.ciJ, 3)}</td><td class="${r.profM > R.c.profMax ? 'w' : ''}">${fm(r.profM, 2)}</td><td class="${r.profJ > R.c.profMax ? 'w' : ''}">${fm(r.profJ, 2)}</td>
      <td>${fm(r.hI.yd, 2)}</td><td class="${r.okLam ? '' : 'e'}">${r.hF.carga ? 'cheio' : fm(r.hF.yd, 2)}</td><td>${fm(r.hI.V, 2)}</td><td class="${r.hF.V > R.c.vMax ? 'e' : ''}">${fm(r.hF.V, 2)}</td>
      <td class="${r.hI.tau < r.tauMin - 0.005 ? 'e' : ''}">${fm(r.hI.tau, 2)}</td><td class="${st}">${st === 'e' ? '✖' : st === 'w' ? '⚠' : '✔'}</td></tr>`; }).join('')).join('');
  const pvs = Object.values(R.no).map(x => { const n = noDe(x.id); return `<tr><td><b>${esc(nomeNo(n))}</b></td><td class="l">${x.tipo === 'EEE' ? 'EEE — estação elevatória' : x.tipo === 'TL' ? 'TL — terminal de limpeza' : x.fim ? 'PV — lançamento' : x.cab ? 'PV — cabeceira' : 'PV'}</td><td>${fm(x.ct, 3)}</td><td>${fm(x.cf, 3)}</td><td class="${x.prof > R.c.profMax ? 'w' : ''}">${fm(x.prof, 2)}</td><td>${fm(x.Dpv, 2)}</td><td>${x.Dmax}</td><td class="l">${x.degraus.filter(g => g.h > 0.0005).map(g => (g.h >= R.c.degTQ ? 'tubo de queda ' : 'degrau ') + fm(g.h, 2) + ' m (' + R.tr[g.tr].nome + ')').join(' · ') || '—'}</td><td>${fm(x.QF, 2)}</td></tr>`; }).join('');
  m.innerHTML = `<div class="card"><div class="barra"><b style="margin-right:6px">Verificação</b><span class="esp"></span>
      <button class="bt peq" data-act="dividir">➗ Dividir trechos longos</button><button class="bt peq" data-act="soltar">🧹 Voltar tudo ao automático</button><button class="bt peq" data-act="xlsDim">⬇ Planilha Excel</button></div>${listaVerif()}</div>
    <div class="card"><div class="barra"><h2 style="margin:0">Planilha de dimensionamento</h2><span class="mut" style="font-size:.8rem">DN e declividade vazios = automático (menor escavação que atende à norma). Clique na linha para ver o trecho no perfil.</span></div>
    <div class="tw"><table><thead><tr><th>Trecho</th><th class="l">Rua</th><th class="l">Mont.</th><th class="l">Jus.</th><th>L<small>m</small></th><th>Contribui</th><th>Q inicial<small>L/s</small></th><th>Q final<small>L/s</small></th><th>DN<small>mm</small></th><th>i terreno<small>%</small></th><th>i coletor<small>%</small></th><th>i mín.<small>%</small></th>
      <th>CT mont.</th><th>CT jus.</th><th>CC mont.</th><th>CC jus.</th><th>Prof. mont.<small>m</small></th><th>Prof. jus.<small>m</small></th><th>y/D inic.</th><th>y/D final</th><th>V inic.<small>m/s</small></th><th>V final<small>m/s</small></th><th>τ<small>Pa</small></th><th>OK</th></tr></thead><tbody>${lin}</tbody></table></div>
    <p class="mut" style="font-size:.78rem;margin:8px 0 0">CT = cota do terreno · CC = cota do coletor (geratriz inferior interna) · vazão de cálculo nunca menor que ${fm(R.c.qMin, 1)} L/s · τ calculada com a vazão inicial · lâmina e velocidade com a vazão final.</p></div>
    ${eeeCards()}<div class="card"><h2>Poços de visita e terminais de limpeza</h2><div class="tw" style="max-height:44vh"><table><thead><tr><th>PV</th><th class="l">Tipo</th><th>Cota terreno</th><th>Cota fundo</th><th>Prof.<small>m</small></th><th>Ø interno<small>m</small></th><th>Maior DN</th><th class="l">Degraus / tubo de queda</th><th>Q final<small>L/s</small></th></tr></thead><tbody>${pvs}</tbody></table></div></div>`;
}
function dividirLongos() {
  let n = 0;
  editar(() => { P.trechos.slice().forEach(t => { const a = noDe(t.de), b = noDe(t.para), L = t.L > 0 ? +t.L : Math.hypot(b.x - a.x, b.y - a.y); if (L <= P.crit.distMax + 0.01) return;
    const k = Math.ceil(L / P.crit.distMax); let ant = t.de; const para = t.para;
    for (let i = 1; i < k; i++) { const f = i / k, nv = {id: novoId('n'), x: ESG.r3(a.x + (b.x - a.x) * f), y: ESG.r3(a.y + (b.y - a.y) * f), ct: ESG.r3((+a.ct || 0) + ((+b.ct || 0) - (+a.ct || 0)) * f)}; P.nos.push(nv);
      if (i === 1) { t.para = nv.id; t.L = ESG.r3(L / k); } else P.trechos.push({id: novoId('t'), de: ant, para: nv.id, rua: t.rua, L: ESG.r3(L / k), lados: t.lados}); ant = nv.id; n++; }
    P.trechos.push({id: novoId('t'), de: ant, para, rua: t.rua, L: ESG.r3(L / k), lados: t.lados}); }); renumerar(); });
  toast(n ? n + ' PV(s) intermediário(s) criados; rede recalculada.' : 'Nenhum trecho passa de ' + P.crit.distMax + ' m.');
}
/* nomes dos PVs na ordem dos coletores (tronco primeiro, de montante para jusante) */
function renumerar() { const r = ESG.calc(P); if (!r.ok) return; let k = 0; const dado = new Set(); P.nos.forEach(n => { delete n.nome; });
  r.coletores.forEach(c => c.trechos.forEach((id, i) => { const t = r.tr[id]; [t.de, t.para].forEach(nid => { if (!dado.has(nid)) { dado.add(nid); const n = noDe(nid), x = r.no[nid]; n.nome = (x && x.tipo === 'TL' ? 'TL-' : 'PV-') + (++k); } }); })); }

/* ── exportação para Excel (SheetJS, carregado só quando preciso) ── */
function carregarScript(src) { return new Promise((ok, ko) => { if ([...document.scripts].some(s => s.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('não foi possível carregar ' + src)); document.head.appendChild(s); }); }
async function xlsx(nome, abas) {
  try { if (!window.XLSX) await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const wb = XLSX.utils.book_new(); abas.forEach(a => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a.linhas), a.nome.slice(0, 31))); XLSX.writeFile(wb, nome + '.xlsx');
  } catch (e) { baixar(nome + '.csv', '﻿' + abas.map(a => a.nome + '\n' + a.linhas.map(l => l.map(v => typeof v === 'number' ? String(v).replace('.', ',') : '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\n')).join('\n\n'), 'text/csv;charset=utf-8'); toast('Sem acesso à biblioteca do Excel: baixei em CSV (abre no Excel).'); }
}
const a3 = v => Math.round(v * 1000) / 1000;
function linhasDim() { const L = [['Trecho', 'Rua', 'PV montante', 'PV jusante', 'L (m)', 'Q inicial (L/s)', 'Q final (L/s)', 'DN (mm)', 'i (m/m)', 'i mín. (m/m)', 'CT mont.', 'CT jus.', 'CC mont.', 'CC jus.', 'Prof. mont. (m)', 'Prof. jus. (m)', 'y/D inicial', 'y/D final', 'V inicial (m/s)', 'V final (m/s)', 'V crítica (m/s)', 'τ (Pa)']];
  R.coletores.forEach(c => c.trechos.forEach(id => { const r = R.tr[id], t = trDe(id), rua = ruaDe(t.rua); L.push([r.nome, rua ? rua.nome : '', nomeNo(noDe(r.de)), nomeNo(noDe(r.para)), a3(r.L), a3(r.QjI), a3(r.QjF), r.D, Math.round(r.I * 1e5) / 1e5, Math.round(r.Imin * 1e5) / 1e5, r.ctM, r.ctJ, r.ciM, r.ciJ, a3(r.profM), a3(r.profJ), a3(r.hI.yd), a3(r.hF.yd), a3(r.hI.V), a3(r.hF.V), a3(r.hF.Vc), a3(r.hI.tau)]); })); return L; }
function linhasPV() { const L = [['PV', 'Tipo', 'X', 'Y', 'Cota terreno', 'Cota fundo', 'Profundidade (m)', 'Ø interno (m)', 'Tubos de queda', 'Q final (L/s)']]; Object.values(R.no).forEach(x => { const n = noDe(x.id); L.push([nomeNo(n), x.tipo, n.x, n.y, x.ct, x.cf, a3(x.prof), x.Dpv, x.tq, a3(x.QF)]); }); return L; }

/* ── projetos (navegador, arquivo e nuvem) ── */
function abrirProjetos() {
  const l = Object.entries(DB.list).sort((a, b) => String(b[1].em || '').localeCompare(String(a[1].em || '')));
  modal(`<h2>📁 Projetos</h2><div class="barra"><button class="bt pri peq" data-act="novoProj">＋ Novo em branco</button><button class="bt peq" data-act="exemploNovo">＋ Exemplo de bairro</button>
    <button class="bt peq" data-act="expJson">⬇ Salvar em arquivo</button><button class="bt peq" data-act="impJson">📂 Abrir arquivo</button><button class="bt peq" data-act="nuvSalvar">☁ Salvar na nuvem</button><button class="bt peq" data-act="nuvListar">☁ Abrir da nuvem</button></div>
    <h3>Neste navegador</h3><div class="lista" style="max-height:300px">${l.map(([id, p]) => `<div class="lin"><b style="flex:1">${esc(p.nome || 'Sem nome')}${id === DB.cur ? ' <span class="chip ok">aberto</span>' : ''}</b><small>${p.em ? new Date(p.em).toLocaleString('pt-BR') : ''}</small>
      <button class="bt peq" data-abrirp="${id}">Abrir</button><button class="bt peq" data-dupp="${id}">Duplicar</button><button class="x" data-delp="${id}" title="Excluir">🗑</button></div>`).join('')}</div>
    <div id="nuv-lista"></div><input type="file" id="arq-json" accept=".json" hidden/>`);
}
function trocarProjeto(id) { salvarJa(); DB.cur = id; P = migrar(DB.list[id]); DB.list[id] = P; UNDO = []; REDO = []; SEL = null; salvarJa(); recalc(); render(); }
function novoProjeto(p) { const id = uid(); DB.list[id] = p; fechar(); trocarProjeto(id); if (p.ruas.length && !p.trechos.length) { ESG.gerar(P); renumerar(); salvar(); recalc(); render(); } }

const NUV = {fb: null, user: null};
async function nuvIniciar() {
  if (NUV.fb) return NUV.fb;
  if (!window.FIREBASE_CONFIG) await carregarScript(location.origin + '/firebase-config.js');
  const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const [A, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const app = A.getApps().find(x => x.name === '[DEFAULT]') || A.initializeApp(window.FIREBASE_CONFIG), a = auth.getAuth(app);
  let d; try { d = fs.initializeFirestore(app, {experimentalAutoDetectLongPolling: true}); } catch (_) { d = fs.getFirestore(app); }
  await auth.setPersistence(a, auth.browserLocalPersistence).catch(() => {});
  NUV.user = await new Promise(res => { const un = auth.onAuthStateChanged(a, u => { un(); res(u); }); });
  return NUV.fb = {d, fs};
}
const nuvErro = e => { const c = (e && (e.code || e.message)) || String(e); return /permission/i.test(c) ? 'sem permissão na nuvem (as regras do Firestore do Esgoto ainda não foram publicadas, ou seu acesso não está liberado)' : /network|unavailable|offline|carregar/i.test(c) ? 'sem conexão com a nuvem' : c; };
async function nuvSalvar() {
  try { toast('Salvando na nuvem…'); const {d, fs} = await nuvIniciar(), u = NUV.user; if (!u) return toast('Entre com seu login na página principal (totalcivil.com.br) para usar a nuvem.');
    const dados = JSON.parse(JSON.stringify(P)); delete dados.nuvem; const txt = JSON.stringify(dados); if (txt.length > 900000) return toast('Projeto grande demais para a nuvem: use “Salvar em arquivo”.');
    const corpo = {uid: u.uid, email: u.email || '', nome: String(P.nome || 'Sem nome').slice(0, 120), app: 'esgoto', dados: txt, trechos: P.trechos.length, atualizadoEm: fs.serverTimestamp()};
    let id = P.nuvem && P.nuvem.id; if (id) await fs.setDoc(fs.doc(d, 'projetosEsgoto', id), corpo, {merge: true}); else { corpo.criadoEm = fs.serverTimestamp(); id = (await fs.addDoc(fs.collection(d, 'projetosEsgoto'), corpo)).id; }
    P.nuvem = {id, em: new Date().toISOString()}; salvarJa(); toast('Projeto salvo na nuvem.');
  } catch (e) { toast('Não salvou: ' + nuvErro(e), 6000); }
}
async function nuvListar() {
  const box = $('nuv-lista'); if (!box) return; box.innerHTML = '<h3>Na nuvem</h3><p class="mut">Carregando…</p>';
  try { const {d, fs} = await nuvIniciar(), u = NUV.user; if (!u) { box.innerHTML = '<h3>Na nuvem</h3><p class="mut">Entre com seu login na página principal para ver seus projetos.</p>'; return; }
    const sn = await fs.getDocs(fs.query(fs.collection(d, 'projetosEsgoto'), fs.where('uid', '==', u.uid))); const l = []; sn.forEach(x => l.push({id: x.id, v: x.data()}));
    NUV.cache = {}; l.forEach(x => NUV.cache[x.id] = x.v);
    box.innerHTML = '<h3>Na nuvem</h3>' + (l.length ? `<div class="lista">${l.map(x => `<div class="lin"><b style="flex:1">${esc(x.v.nome)}</b><small>${x.v.trechos || 0} trechos</small><button class="bt peq" data-nuvabrir="${x.id}">Abrir</button><button class="x" data-nuvdel="${x.id}">🗑</button></div>`).join('')}</div>` : '<p class="mut">Nenhum projeto na nuvem ainda.</p>');
  } catch (e) { box.innerHTML = '<h3>Na nuvem</h3><div class="aviso err">' + esc(nuvErro(e)) + '</div>'; }
}
