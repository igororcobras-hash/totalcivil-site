/* ════════════════════════════════════════════════════════════════════
   EVENTOS E PARTIDA
   ════════════════════════════════════════════════════════════════════ */
function aplicarTema() { const t = CFG.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = t; }
function aplicarAmb() { document.body.classList.toggle('cel', CFG.amb === 'android' || CFG.amb === 'iphone'); $('amb').hidden = !!CFG.amb; }
function usarExemplo(novo) { const p = ESG.exemplo(); if (novo || P.ruas.length || P.trechos.length) return novoProjeto(p);
  editar(() => { Object.assign(P, p, {crit: Object.assign({}, P.crit)}); ESG.gerar(P); renumerar(); }, true); PL.vb = null; irAba('tracado'); toast('Exemplo carregado: bairro com a rede já calculada. Veja o Dimensionamento, os Perfis e o 3D.', 6000); }
function janelaColar(tipo) {
  modal(tipo === 'ruas' ? `<h2>📋 Colar ruas</h2><p class="mut" style="font-size:.86rem">Uma rua por linha, copiada do Excel ou do levantamento: <b>Nome; X1; Y1; cota1; X2; Y2; cota2; …</b> (coordenadas em metros; a cota pode ficar vazia). Rua com o mesmo nome é substituída.</p>
    <textarea class="inp" id="colar-txt" placeholder="Rua das Flores; 0; 0; 12,40; 180; 0; 10,95&#10;Rua A; 90; -60; 12,10; 90; 0; 11,62; 90; 80; 10,30"></textarea><div class="barra" style="margin-top:10px"><button class="bt pri" data-act="colarRuasOk">Lançar ruas</button><button class="bt" data-fechar>Cancelar</button></div>`
    : `<h2>📋 Colar pontos da topografia</h2><p class="mut" style="font-size:.86rem">Um ponto por linha: <b>X; Y; cota</b> (as três últimas colunas de cada linha). As cotas das ruas e dos PVs sem cota informada são interpoladas por estes pontos.</p>
    <textarea class="inp" id="colar-txt" placeholder="0; 0; 12,40&#10;45; 0; 12,02&#10;90; 0; 11,62"></textarea><div class="barra" style="margin-top:10px"><button class="bt pri" data-act="colarTopoOk">Lançar pontos</button><button class="bt" data-fechar>Cancelar</button></div>`);
  setTimeout(() => $('colar-txt') && $('colar-txt').focus(), 50);
}
const ACOES = {
  exemplo: () => usarExemplo(false), exemploNovo: () => usarExemplo(true), irTracado: () => irAba('tracado'), gerar: gerarRede, enquadrar: plEnquadrar,
  colarRuas: () => janelaColar('ruas'), colarTopo: () => janelaColar('topo'), colarRuasOk: () => colarRuas($('colar-txt').value), colarTopoOk: () => colarTopo($('colar-txt').value),
  rotulos: () => { PL.rot = (PL.rot + 1) % 3; plDesenhar(); }, dxf: () => cadExportar('dxf'), cadDxf: () => cadExportar('dxf'), cadDwg: () => cadExportar('dwg'), sugEEE, orcEnviar, orcTres: () => { orcRegistrar(); if (window.TCORC) TCORC.abrir('esgoto'); else toast('Módulo de orçamento do site indisponível (sem internet?).'); },
  orcLimpar: () => { editar(() => { orcCfg().it = {}; }); toast('Códigos e preços voltaram aos do programa.'); }, svgPlanta: () => baixar(nomeArq() + '_planta.svg', plantaSVG(1600), 'image/svg+xml'),
  desel: () => { SEL = null; ladoTracado(); plDesenhar(); }, limparTopo: () => editar(() => { P.topo = []; ruasMudaram(); }), verPerfil: () => irAba('perfil'),
  dividir: dividirLongos, soltar: () => { editar(() => P.trechos.forEach(t => { delete t.Dfix; delete t.iFix; })); toast('DN e declividades voltaram ao automático.'); },
  xlsDim: () => xlsx(nomeArq() + '_dimensionamento', [{nome: 'Dimensionamento', linhas: linhasDim()}, {nome: 'PVs', linhas: linhasPV()}]), xlsOrc,
  novoProj: () => novoProjeto(ESG.novo()), expJson: () => { salvarJa(); baixar(nomeArq() + '.json', JSON.stringify(Object.assign({app: 'totalcivil-esgoto'}, P), null, 1), 'application/json'); },
  impJson: () => $('arq-json') && $('arq-json').click(), nuvSalvar, nuvListar, orcDeNovo: () => { ORC.erro = ''; ORC.pronto = false; ORC.emop = undefined; ORC.bk = {sinapi: {}, sco: {}}; orcCarregar(); render(); },
  svgPerfil: () => baixar(nomeArq() + '_perfil_coletor' + PF.col + '.svg', perfilSVG(caminho(PF.col, PF.ate), PF.ev, 1400), 'image/svg+xml'),
  svgPerfis: () => R.coletores.forEach((c, i) => setTimeout(() => baixar(nomeArq() + '_perfil_coletor' + c.num + '.svg', perfilSVG(c.trechos, PF.ev, 1400), 'image/svg+xml'), i * 350)),
  imprimir: () => window.print(),
  word: () => baixar(nomeArq() + '_memorial.doc', '<html><head><meta charset="utf-8"><style>body{font-family:Arial;font-size:10pt}table{border-collapse:collapse;font-size:8pt}td,th{border:1px solid #999;padding:2px 4px}th{background:#12263f;color:#fff}h2{color:#12263f;border-bottom:2px solid #c2410c}</style></head><body>' + memorialHTML() + '</body></html>', 'application/msword'),
  fator1: () => { editar(() => { P.crit.fator = 1; }); toast('Voltou a 100 % da vazão de projeto.'); }
};
document.addEventListener('click', ev => {
  const q = s => ev.target.closest(s), t = ev.target; let e;
  if ((e = q('[data-fechar]')) || t.id === 'modal') return fechar();
  if (e = q('[data-tab]')) return irAba(e.dataset.tab);
  if (e = q('[data-ir]')) return irAba(e.dataset.ir);
  if (e = q('[data-amb]')) { CFG.amb = e.dataset.amb; lsSet(LS_CFG, CFG); return aplicarAmb(); }
  if (e = q('[data-act]')) { ev.preventDefault(); const f = ACOES[e.dataset.act]; return f && f(); }
  if (e = q('[data-t3]')) return t3Acao(e.dataset.t3);
  if (e = q('[data-plmodo]')) { PL.modo = e.dataset.plmodo; PL.des = []; PL.cur = null; PL.ligDe = null; if (TAB !== 'tracado') return irAba('tracado'); return render(); }
  if (e = q('[data-modo]')) return editar(() => { P.crit.modo = e.dataset.modo; });
  if (e = q('[data-selrua]')) { SEL = {tipo: 'rua', id: e.dataset.selrua}; ladoTracado(); return plDesenhar(); }
  if (e = q('[data-delrua]')) return excluir('rua', e.dataset.delrua);
  if (e = q('[data-delno]')) return excluir('no', e.dataset.delno);
  if (e = q('[data-deltr]')) return excluir('tr', e.dataset.deltr);
  if (e = q('[data-orcsol]')) return editar(() => { orcCfg().sol = e.dataset.orcsol; });
  if (e = q('[data-eeenovo]')) return eeeNova(e.dataset.eeenovo);
  if (e = q('[data-eeedel]')) return editar(() => { P.eee = P.eee.filter(x => x.id !== e.dataset.eeedel); });
  if (e = q('[data-inv]')) return editar(() => { const x = trDe(e.dataset.inv), a = x.de; x.de = x.para; x.para = a; P.manual = true; renumerar(); });
  if (e = q('[data-pvlado]')) { PF.pvj = e.dataset.pvlado === 'j'; return render(); }
  if (e = q('[data-selc]')) { const id = e.dataset.selc; if (id && trDe(id)) { SEL = {tipo: 'tr', id}; return irAba('perfil'); } if (id && noDe(id)) { SEL = {tipo: 'no', id}; return irAba('tracado'); } return; }
  if (e = q('[data-abrirp]')) { fechar(); return trocarProjeto(e.dataset.abrirp); }
  if (e = q('[data-dupp]')) { const p = JSON.parse(JSON.stringify(DB.list[e.dataset.dupp])); p.nome = (p.nome || 'Projeto') + ' (cópia)'; delete p.nuvem; return novoProjeto(migrar(p)); }
  if (e = q('[data-delp]')) { const id = e.dataset.delp; if (Object.keys(DB.list).length < 2) return toast('É o único projeto: crie outro antes de excluir.'); if (!confirm('Excluir “' + (DB.list[id].nome || '') + '” deste navegador?')) return; delete DB.list[id]; if (DB.cur === id) trocarProjeto(Object.keys(DB.list)[0]); else salvarJa(); return abrirProjetos(); }
  if (e = q('[data-nuvabrir]')) { const v = NUV.cache && NUV.cache[e.dataset.nuvabrir]; if (!v) return; try { const p = migrar(JSON.parse(v.dados)); p.nuvem = {id: e.dataset.nuvabrir}; novoProjeto(p); toast('Projeto aberto da nuvem.'); } catch (x) { toast('Projeto da nuvem ilegível.'); } return; }
  if (e = q('[data-nuvdel]')) { if (!confirm('Excluir este projeto da nuvem?')) return; return nuvIniciar().then(({d, fs}) => fs.deleteDoc(fs.doc(d, 'projetosEsgoto', e.dataset.nuvdel))).then(nuvListar).catch(x => toast('Não excluiu: ' + nuvErro(x))); }
  if ((e = q('tr[data-tr]')) && !q('input,select')) { SEL = {tipo: 'tr', id: e.dataset.tr}; return irAba('perfil'); }
  if ((e = q('#pf-box [data-tr]'))) { SEL = {tipo: 'tr', id: e.dataset.tr}; return render(); }
  if (t.id === 'b-undo') return desfazer(false); if (t.id === 'b-redo') return desfazer(true); if (t.id === 'b-proj') return abrirProjetos();
  if (t.id === 'b-amb') { CFG.amb = ''; return aplicarAmb(); }
  if (t.id === 'b-tema') { CFG.tema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; lsSet(LS_CFG, CFG); aplicarTema(); return render(); }
});
document.addEventListener('change', ev => {
  const t = ev.target, d = t.dataset || {}, v = t.value;
  if (t.id === 'pj-nome' || d.proj) return editar(() => { P[d.proj || 'nome'] = v.trim(); }, t.id === 'pj-nome' && TAB !== 'dados');
  if (d.crit) { const x = num(v); if (!isFinite(x) || x < 0) { toast('Valor inválido.'); return render(); } return editar(() => { P.crit[d.crit] = x; if (d.crit === 'n' || d.crit === 'tau') P.crit.norma = 'livre'; }); }
  if (d.norma != null) return editar(() => { P.crit.norma = v; if (v === '9649') { P.crit.n = 0.013; P.crit.tau = 1.0; } if (v === '14486') { P.crit.n = 0.010; P.crit.tau = 0.6; } });
  if (d.sel) return editar(() => { P.crit[d.sel] = v; });
  if (d.chk) return editar(() => { P.crit[d.chk] = t.checked; });
  if (d.tfix) return editar(() => { const x = trDe(d.id); if (d.tfix === 'D') { if (v) x.Dfix = +v; else delete x.Dfix; } else { const i = num(v); if (i > 0) x.iFix = i / 100; else delete x.iFix; } P.manual = true; });
  if (d.tlad != null) return editar(() => { trDe(d.id).lados = +v; P.manual = true; });
  if (d.trk) return editar(() => { const x = trDe(d.id); if (v === '') delete x[d.trk]; else x[d.trk] = v; if (d.trk !== 'rua') P.manual = true; });
  if (d.sif) return editar(() => { const x = trDe(d.id); if (d.sif === 'on') { if (v === '1') x.sif = x.sif || {}; else delete x.sif; } else if (x.sif) { const k = num(v); if (isFinite(k)) x.sif[d.sif] = k; else delete x.sif[d.sif]; } P.manual = true; });
  if (d.eee) return editar(() => { const E = P.eee.find(x => x.id === d.id); if (!E) return; const k = d.eee;
    if (k === 'ate') { if (v === '@ext') { E.ext = E.ext || {nome: 'ponto de descarga', cota: ESG.r3((+noDe(E.no).ct || 0) + 3), L: 100}; delete E.ate; } else { E.ate = v; delete E.ext; } }
    else if (k === 'extCota' || k === 'extL') { const x = num(v); if (isFinite(x) && E.ext) E.ext[k === 'extCota' ? 'cota' : 'L'] = x; }
    else if (k === 'extNome') { if (E.ext) E.ext.nome = v.trim(); } else if (k === 'dnRec') { if (v) E.dnRec = +v; else delete E.dnRec; } else if (v === '') delete E[k]; else E[k] = v; });
  if (d.di) return editar(() => { const c = P.crit, m = c.mat || 'pvcm', x = num(v); c.diMan = JSON.parse(JSON.stringify(c.diMan || {})); c.diMan[m] = c.diMan[m] || {}; if (isFinite(x) && x > 20) c.diMan[m][d.di] = x; else delete c.diMan[m][d.di]; });
  if (d.no && d.k) return editar(() => { const n = noDe(d.no); if (d.k === 'nome') { n.nome = v.trim() || n.nome; } else { const x = num(v); if (d.k === 'ct') { if (isFinite(x)) n.ct = x; } else if (isFinite(x) && (x !== 0 || d.k === 'cfEx')) n[d.k] = x; else delete n[d.k]; } P.manual = true; });
  if (d.ruanome) return editar(() => { ruaDe(d.ruanome).nome = v.trim() || 'Rua'; });
  if (d.ruaz) return editar(() => { const [id, i] = d.ruaz.split(':'), x = num(v); ruaDe(id).pts[+i].z = isFinite(x) ? x : null; ruasMudaram(); });
  if (t.id === 'pf-col') { PF.col = +v; SEL = null; return render(); } if (t.id === 'pf-ate') { PF.ate = t.checked; return render(); } if (t.id === 'pf-ev') { PF.ev = +v; return render(); }
  if (d.orccod) return editar(() => { const o = orcCfg(), k = o.banco + '|' + d.orccod, e = Object.assign({}, o.it[k]); if (v.trim()) e.cod = v.trim(); else delete e.cod; o.it[k] = e; });
  if (d.orcpu) return editar(() => { const o = orcCfg(), k = o.banco + '|' + d.orcpu, x = num(v), e = Object.assign({}, o.it[k]); if (isFinite(x) && x >= 0) e.pu = x; else delete e.pu; o.it[k] = e; });
  if (t.id === 'orc-mes') { editar(() => { const o = orcCfg(); o.mes[o.banco] = v; }, true); return orcCarregar(); }
  if (t.id === 'orc-banco') return editar(() => { orcCfg().banco = v; });
  if (t.id === 'orc-deson') return editar(() => { orcCfg().deson = t.checked; });
  if (t.id === 'orc-bdi') return editar(() => { const x = num(v); orcCfg().bdi = isFinite(x) ? x : 0; });
  if (t.id === 'arq-json' && t.files[0]) { const fr = new FileReader(); fr.onload = () => { try { const p = migrar(JSON.parse(fr.result)); delete p.nuvem; novoProjeto(p); toast('Projeto aberto do arquivo.'); } catch (e) { toast('Arquivo inválido: escolha um .json salvo por este programa.'); } }; fr.readAsText(t.files[0]); }
});
document.addEventListener('input', ev => { if (ev.target.id === 't3-f' && T3.on) t3Cenario(+ev.target.value / 100); });
document.addEventListener('keydown', ev => {
  const emCampo = /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName);
  if ((ev.ctrlKey || ev.metaKey) && !emCampo && ev.key.toLowerCase() === 'z') { ev.preventDefault(); return desfazer(ev.shiftKey); }
  if ((ev.ctrlKey || ev.metaKey) && !emCampo && ev.key.toLowerCase() === 'y') { ev.preventDefault(); return desfazer(true); }
  if (ev.key === 'Escape') { if (!$('modal').hidden) return fechar(); if (T3.voo) return t3Voo(false); if (PL.des.length) { PL.des = []; PL.cur = null; return plDesenhar(); } if (PL.modo !== 'sel' && TAB === 'tracado') { PL.modo = 'sel'; return render(); } }
  if (ev.key === 'Enter' && TAB === 'tracado' && PL.modo === 'rua' && PL.des.length > 1 && !emCampo) return plConcluirRua();
  if (ev.key === 'Enter' && emCampo && ev.target.tagName === 'INPUT') ev.target.blur();
  if (ev.key === 'Delete' && !emCampo && TAB === 'tracado' && SEL) return excluir(SEL.tipo, SEL.id);
});
const naPlanta = ev => ev.target.closest && ev.target.closest('#pl-svg');
document.addEventListener('pointerdown', ev => { if (naPlanta(ev)) plDown(ev); });
document.addEventListener('pointermove', ev => { if (PL.drag || PL.pts.size || (PL.modo === 'rua' && naPlanta(ev))) plMove(ev); });
document.addEventListener('pointerup', ev => { if (PL.drag || PL.pts.has(ev.pointerId)) plUp(ev); });
document.addEventListener('pointercancel', ev => { PL.pts.delete(ev.pointerId); PL.drag = null; });
document.addEventListener('dblclick', ev => { if (naPlanta(ev) && PL.modo === 'rua') plConcluirRua(); });
document.addEventListener('wheel', ev => { if (naPlanta(ev)) plRoda(ev); }, {passive: false});
window.addEventListener('resize', () => { if (TAB === 'tracado') plDesenhar(); });
window.addEventListener('beforeunload', salvarJa);

carregar(); aplicarTema(); aplicarAmb(); desenharAbas(); recalc(); render();
window.__esg = {get P() { return P; }, get R() { return R; }, get Q() { return Q; }, ESG, T3, PL, irAba, gerarRede};
</script>
</body>
</html>
