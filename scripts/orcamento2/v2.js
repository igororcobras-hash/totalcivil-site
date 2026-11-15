/* =====================================================================
   ORÇAMENTO DE OBRAS V2 — casca (ORC2-01)
   Fonte: scripts/orcamento2/v2.js  (montado por scripts/orcamento2/build.py)

   O que faz: reorganiza a tela do programa de Orçamento em
     cabeçalho Total Civil + abas numeradas + faixa de ferramentas com ícones
     + linha da obra, com 9 temas de construção.
   O que NÃO faz: nenhum cálculo, banco, importação ou exportação é refeito.
     Cada ferramenta da faixa clica no botão ORIGINAL do programa (que continua
     na página, escondido) ou é a própria peça original levada para a faixa.
     Botão novo criado por atualização futura do motor aparece sozinho na aba
     "Mais" (ninguém some).
   ===================================================================== */
(function(){
  'use strict';
  var KEY_TEMA = 'tc_orc2_tema', KEY_ABA = 'tc_orc2_aba', KEY_FER = 'tc_orc2_fer', KEY_DEST = 'tc_orc_destino';
  var V = null;          // casca montada: {nos:[], emprestados:[{e, pai}], tiles:[], timer}
  function $(id){ return document.getElementById(id); }
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){} return null; }
  function el(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* ---------- ícones (linha, 24×24) ---------- */
  var IC = {
    casa:'<path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M9.5 21v-6h5v6"/>',
    novo:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M12 11v6M9 14h6"/>',
    salvar:'<path d="M5 3h12l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
    pasta:'<path d="M3 6h6l2 2h10v11H3z"/><path d="M3 11h18"/>',
    relogio:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    backup:'<path d="M3 6h6l2 2h10v11H3z"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
    guia:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M8.5 10l1.6 1.6 3-3M8.5 16l1.6 1.6 3-3M15 11h1.5M15 17h1.5"/>',
    modelos:'<path d="M4 5h4v15H4zM8 5h4v15H8zM13.2 6.2l3.8-1 3.6 13.6-3.8 1z"/>',
    titulo:'<path d="M4 6h16M4 6v0M4 11h10M4 16h16M4 21h10"/><path d="M19 9.5v5M16.5 12h5"/>',
    comp:'<rect x="3" y="14" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/><rect x="8" y="6" width="8" height="6" rx="1"/>',
    olho:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    olhoNao:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><path d="M4 4l16 16"/>',
    pulso:'<path d="M3 12h4l2-6 4 12 2.5-6H21"/>',
    importar:'<path d="M12 3v11M7.5 10 12 14.5 16.5 10"/><path d="M4 15v5h16v-5"/>',
    planilha:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 4v16M15 9.5V20"/>',
    relatorio:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7M9 8h3"/>',
    xlsx:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 4v16"/><path d="m12.5 12.5 4 5M16.5 12.5l-4 5"/>',
    xlsxComp:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M9 4v16M12 13h6M12 16.5h6"/>',
    timbre:'<path d="M5 3h14v18H5z"/><path d="M8 6.5h8M8 9h4"/><path d="M8 13h8M8 16h8" opacity=".45"/>',
    word:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="m8.5 11 1.4 6 2.1-5 2.1 5 1.4-6"/>',
    pdf:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 17v-5h1.6a1.5 1.5 0 0 1 0 3H9M14 12v5M14 12h2.5M14 14.5h2"/>',
    abc:'<path d="M4 20V5M4 20h17"/><rect x="7" y="8" width="3" height="12"/><rect x="12" y="12" width="3" height="8"/><rect x="17" y="16" width="3" height="4"/>',
    insumos:'<path d="M12 3 21 7.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    quartis:'<path d="M4 20V4M4 20h17"/><rect x="9" y="9" width="6" height="7"/><path d="M9 12.5h6M12 5v4M12 16v3M10 5h4M10 19h4"/>',
    carrinho:'<path d="M3 4h2.5l2.2 11h10.6L20.5 7H6.6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
    crono:'<path d="M3 5h18M3 5v15h18"/><rect x="6" y="8" width="7" height="2.6"/><rect x="10" y="12.2" width="8" height="2.6"/><rect x="14" y="16.4" width="5" height="2.6"/>',
    balanca:'<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    emop:'<path d="M3 21h18M4 9l8-5 8 5M5 9h14"/><path d="M6.5 12v6M10.2 12v6M13.8 12v6M17.5 12v6"/>',
    sinapi:'<path d="M5 21V4M3 21h6M5 6h15M5 4l5 2M20 6v3M20 9v6"/><rect x="18" y="15" width="4" height="3"/><path d="M5 10l5-4"/>',
    sco:'<rect x="3" y="9" width="7" height="12"/><rect x="10" y="4" width="6" height="17"/><rect x="16" y="12" width="5" height="9"/><path d="M12 8h2M12 12h2M12 16h2M5.5 13h2M5.5 17h2"/>',
    receber:'<path d="M8 12h8M8 12l3-3M8 12l3 3"/><rect x="16" y="6" width="5" height="12" rx="1.5"/><path d="M3 9v6"/>',
    usuarios:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.6-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c3 .1 5 2 5 5"/>',
    tema:'<rect x="3" y="4" width="14" height="5" rx="1.5"/><path d="M17 6.5h3.5V12H12v3"/><rect x="10.5" y="15" width="3" height="6" rx="1"/>',
    fer:'<path d="M14.5 6.5a4 4 0 0 1 5-3l-2.6 2.6 1.9 1.9L21.4 5.4a4 4 0 0 1-5 5L8 19a2 2 0 0 1-3-3l8.4-8.4"/>',
    mais:'<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
    obra:'<path d="M4 21V9l6-4v16M10 21V11l10-3v13M3 21h18"/><path d="M13.5 13.5h3M13.5 17h3"/>',
    banco:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    cotar:'<path d="M12 3v18M16.5 7.5c-.6-1.6-2.3-2.5-4.5-2.5-2.6 0-4.3 1.3-4.3 3.3 0 4.6 9 2.2 9 7.2 0 2.1-1.9 3.5-4.7 3.5-2.6 0-4.5-1.1-5-3"/>',
    exportar:'<path d="M12 15V4M7.5 8 12 3.5 16.5 8"/><path d="M4 15v5h16v-5"/>'
  };
  function svg(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || IC.fer) + '</svg>'; }

  /* ---------- temas ---------- */
  var TEMAS = [
    ['site',     'Total Civil',            'O visual do site: papel quadriculado, laranja e azul-marinho.'],
    ['concreto', 'Concreto aparente',      'Cinza de concreto com as marcas da fôrma e dos tirantes.'],
    ['tijolo',   'Alvenaria de tijolos',   'Parede de tijolo cerâmico com as juntas de argamassa.'],
    ['aco',      'Estrutura metálica',     'Treliça de aço com parafusos, azul-aço.'],
    ['asfalto',  'Asfalto e sinalização',  'Pista escura com a faixa amarela tracejada.'],
    ['madeira',  'Fôrmas de madeira',      'Tábuas de fôrma com pregos e veios da madeira.'],
    ['planta',   'Planta baixa',           'Azul de cópia heliográfica com a malha do projeto.'],
    ['canteiro', 'Canteiro de obras',      'Amarelo de sinalização com a faixa zebrada de segurança.'],
    ['terra',    'Terraplenagem',          'Camadas de solo com o verde do plantio de grama.']
  ];
  function temaAtual(){ var t = ls(KEY_TEMA); return TEMAS.some(function(x){ return x[0] === t; }) ? t : 'site'; }
  function aplicarTema(t){ document.body.setAttribute('data-v2tema', t); ls(KEY_TEMA, t); marcarTema(); }
  function marcarTema(){ var t = temaAtual(); document.querySelectorAll('#v2Temas .v2-tm').forEach(function(b){ b.classList.toggle('sel', b.dataset.tema === t); }); }
  function janelaTemas(){
    var m = $('v2Temas');
    if(!m){
      m = el('div', '', '<div class="v2-tm-cx"><div class="v2-tm-top"><b>Layout do programa — temas de construção</b><button type="button" id="v2TmX" aria-label="Fechar">✕</button></div><div class="v2-tm-gr">' +
        TEMAS.map(function(t){ return '<button type="button" class="v2-tm" data-tema="' + t[0] + '" data-v2tema="' + t[0] + '"><div class="v2-tm-am"><span class="v2-sq">' + svg('casa') + '</span><span>TOTAL CIVIL</span></div><div class="v2-tm-tx"><b>' + esc(t[1]) + '</b><small>' + esc(t[2]) + '</small><i></i></div></button>'; }).join('') +
        '</div></div>');
      m.id = 'v2Temas'; document.body.appendChild(m);
      /* cada amostra usa as variáveis do próprio tema: copia do body[data-v2tema] trocando o atributo num clone invisível */
      m.querySelectorAll('.v2-tm').forEach(function(b){ amostra(b); });
      m.addEventListener('click', function(ev){
        var b = ev.target.closest('.v2-tm'); if(b){ aplicarTema(b.dataset.tema); return; }
        if(ev.target.id === 'v2TmX') m.classList.remove('vis');
      });
    }
    marcarTema(); m.classList.add('vis');
  }
  /* lê as variáveis do tema t (definidas em body[data-v2tema=t]) e fixa na amostra */
  function amostra(b){
    var antes = document.body.getAttribute('data-v2tema');
    document.body.setAttribute('data-v2tema', b.dataset.tema);
    var cs = getComputedStyle(document.body);
    ['--v2-bg','--v2-ink','--v2-muted','--v2-accent','--v2-head','--v2-head-ink','--v2-head-img','--v2-head-size','--v2-faixa','--v2-brand-sq','--v2-brand-sq-ink'].forEach(function(v){ b.style.setProperty(v, cs.getPropertyValue(v)); });
    if(antes == null) document.body.removeAttribute('data-v2tema'); else document.body.setAttribute('data-v2tema', antes);
  }

  /* ---------- localizar os botões originais ---------- */
  function porOnclick(txt){ return document.querySelector('button[onclick*="' + txt + '"]'); }
  function porTexto(txt, raiz){
    raiz = raiz || $('topoMenus'); if(!raiz) return null;
    return Array.prototype.find.call(raiz.querySelectorAll('button,label.btn'), function(b){ return !b.__v2 && b.textContent.replace(/\s+/g, ' ').indexOf(txt) >= 0; }) || null;
  }
  function visivelPorSi(o){
    if(!o || !o.isConnected) return false;
    if(o.hidden || o.style.display === 'none' || o.classList.contains('v28-oculto')) return false;
    return true;
  }
  function clicar(o){
    if(!o) return;
    if(o.tagName === 'LABEL'){ var f = o.querySelector('input[type=file]'); if(f){ f.click(); return; } }
    o.click();
  }

  /* ---------- peças da faixa ---------- */
  function tile(ic, rot, orig, dica, cls){
    if(!orig) return null;
    var b = el('button', 'v2-t' + (cls ? ' ' + cls : ''), svg(ic) + '<span>' + esc(rot) + '</span>');
    b.type = 'button'; b.__v2 = true; b.__orig = orig; orig.__v2Tile = b;
    b.title = dica || orig.title || rot;
    b.onclick = function(){ clicar(orig); };
    V.tiles.push(b);
    return b;
  }
  /* botão que o motor cria DEPOIS (Auxílio, Cronograma, Modelos): a ferramenta fica escondida até ele existir */
  function tileTardio(ic, rot, id, dica, cls){
    var b = el('button', 'v2-t' + (cls ? ' ' + cls : ''), svg(ic) + '<span>' + esc(rot) + '</span>');
    b.type = 'button'; b.__v2 = true; b.__id = id; b.title = dica || rot; b.hidden = true;
    b.onclick = function(){ clicar(b.__orig || $(id)); };
    V.tiles.push(b);
    return b;
  }
  function tileFn(ic, rot, fn, dica, cls){
    var b = el('button', 'v2-t' + (cls ? ' ' + cls : ''), svg(ic) + '<span>' + esc(rot) + '</span>');
    b.type = 'button'; b.__v2 = true; b.title = dica || rot; b.onclick = fn; return b;
  }
  /* leva a peça ORIGINAL para a faixa; o motor a devolve sozinho ao trocar para o celular (ela guarda a marca de origem) */
  function emprestar(e, destino){
    if(!e || !destino) return null;
    V.emprestados.push({e: e, pai: e.parentNode, prox: e.nextSibling});
    destino.appendChild(e); return e;
  }
  function grupo(titulo, itens, cls){
    itens = itens.filter(Boolean); if(!itens.length) return null;
    var g = el('div', 'v2-g' + (cls ? ' ' + cls : '')), c = el('div', 'v2-gc');
    itens.forEach(function(x){ c.appendChild(x); });
    g.appendChild(c); g.appendChild(el('div', 'v2-gt', esc(titulo)));
    return g;
  }
  function caixa(cls){ return el('div', cls || ''); }

  /* ---------- montagem ---------- */
  var ABAS = [
    ['obra',     'Obra e BDI',            'obra'],
    ['bancos',   'Bancos de preços',      'banco'],
    ['planilha', 'Planilha',              'planilha'],
    ['cotar',    'Cotações e análises',   'abc'],
    ['crono',    'Cronograma e modelos',  'crono'],
    ['importar', 'Importar e receber',    'importar'],
    ['exportar', 'Exportar',              'exportar'],
    ['mais',     'Mais',                  'mais']
  ];

  function montar(){
    if(V) return;
    var topo = $('topoMenus'), obra = $('topoObra'), main = document.querySelector('body>.main');
    if(!topo || !obra || !main) return;          // o topo compacto do motor não montou: fica a tela original
    V = {nos: [], emprestados: [], tiles: [], pn: {}, abas: {}};
    document.body.classList.add('v2-on');

    /* cabeçalho */
    var top = el('div'); top.id = 'v2Top';
    top.innerHTML = '<a class="v2-marca" href="/" title="Página principal do Total Civil"><span class="v2-sq">' + svg('casa') + '</span>' +
      '<span class="v2-nome"><b>Total <span>Civil</span></b><small>Orçamento de Obras V2</small></span></a>' +
      '<span class="v2-resumo"><span class="v2-chip sec" id="v2cItens" title="Itens da planilha"></span><span class="v2-chip sec" id="v2cSub" title="Subtotal sem BDI"></span><span class="v2-chip tot" id="v2cTot" title="Total com BDI"></span></span><span class="v2-sp"></span>';
    var bSalvar = porOnclick('salvarOrcamentoAtual()'), bMeus = porOnclick('abrirModalOrcamentos()');
    var hS = el('button', 'v2-hb pri', svg('salvar') + 'Salvar'); hS.type = 'button'; hS.__v2 = true; hS.title = 'Salvar o orçamento'; hS.onclick = function(){ clicar(bSalvar); };
    var hM = el('button', 'v2-hb', svg('pasta') + 'Meus orçamentos'); hM.type = 'button'; hM.__v2 = true; hM.onclick = function(){ clicar(bMeus); };
    var hT = el('button', 'v2-hb', svg('tema') + 'Layout'); hT.type = 'button'; hT.__v2 = true; hT.id = 'v2BtnTema'; hT.title = 'Escolher o layout (9 temas de construção)'; hT.onclick = janelaTemas;
    top.appendChild(hS); top.appendChild(hM); top.appendChild(hT);
    emprestar($('device-toggle-btn'), top);
    var badge = $('userBadge'), conta = badge && badge.closest('.tp-m');
    if(conta) emprestar(conta, top);
    var faixa = el('div'); faixa.id = 'v2Faixa';

    /* abas */
    var abas = el('div'); abas.id = 'v2Abas'; abas.setAttribute('role', 'tablist');
    ABAS.forEach(function(a, i){
      var b = el('button', 'v2-aba', '<i>' + (i + 1) + '</i>' + esc(a[1])); b.type = 'button'; b.dataset.aba = a[0]; b.__v2 = true; b.setAttribute('role', 'tab');
      abas.appendChild(b); V.abas[a[0]] = b;
    });
    var rec = el('button', 'v2-aba rec', svg('fer') + '<span id="v2RecTxt">Recolher ferramentas</span>'); rec.type = 'button'; rec.__v2 = true; rec.id = 'v2Rec';
    abas.appendChild(rec);

    /* faixa de ferramentas */
    var fer = el('div'); fer.id = 'v2Fer';
    ABAS.forEach(function(a){ var p = el('div', 'v2-pn'); p.dataset.aba = a[0]; fer.appendChild(p); V.pn[a[0]] = p; });
    function add(aba, g){ if(g) V.pn[aba].appendChild(g); }

    var T = topo;
    /* 1 — Obra e BDI */
    add('obra', grupo('Orçamento', [
      tile('novo', 'Novo', porOnclick('novoOrcamento()')),
      tile('salvar', 'Salvar', bSalvar),
      tile('pasta', 'Meus orçamentos', bMeus, 'Abrir, duplicar ou excluir orçamentos salvos'),
      tile('relogio', 'Histórico e auditoria', porOnclick('abrirModalHistorico()')),
      tile('backup', 'Backup automático', $('btnBackupPasta')),
      $('statusBackupPasta') ? emprestar($('statusBackupPasta'), caixa()).parentNode : null
    ]));
    var bdi = $('bdiConfigBar');
    if(bdi){ var cb = caixa(); emprestar(bdi, cb); add('obra', grupo('BDI (%) — 1, 2, 3 e principal', [cb])); }
    var dbt = $('dataBaseTodos'), rowDb = dbt && dbt.closest('.tp-row');
    if(rowDb){ var c1 = caixa(); emprestar(rowDb, c1); add('obra', grupo('Data-base de todos os itens', [c1])); }
    var calc = $('boxCalcArred'), rowCalc = calc && (calc.closest('.tp-row') || calc);
    if(rowCalc){ var c2 = caixa(); emprestar(rowCalc, c2); add('obra', grupo('Cálculo dos valores', [c2])); }
    add('obra', grupo('Ajuda', [
      tileTardio('guia', 'Auxílio de preenchimento', 'btnAuxilioTopo', 'Percorre cada campo com dicas, limites e referências de normas'),
    ]));

    /* 2 — Bancos de preços */
    var fonte = caixa('v2-fonte'); ['btnFonteEmop', 'btnFonteSinapi', 'btnFonteSco'].forEach(function(id){ emprestar($(id), fonte); });
    add('bancos', grupo('Bancos usados na pesquisa', [fonte.children.length ? fonte : null]));
    var bE = $('barEmop'), bS = $('barSinapi'), bC = $('barSco');
    if(bE && bS && bC){ var wb = caixa('v2-bancos'); [bE, bS, bC].forEach(function(x){ emprestar(x, wb); }); add('bancos', grupo('Atualizar os bancos — EMOP (sua assinatura) · SINAPI · SCO', [wb], 'larga')); }
    add('bancos', grupo('Comparar', [tile('balanca', 'Onerado × desonerado', $('btnCompararOnera'))]));

    /* 3 — Planilha */
    add('planilha', grupo('Montar', [
      tile('titulo', 'Título (etapa)', porOnclick('addTituloGlobal()'), 'Inserir um título de etapa na planilha'),
      tile('comp', 'Criar composição', porOnclick('abrirModalComp()'), 'Composição própria com insumos EMOP, SINAPI, SCO ou de mercado'),
      tileTardio('modelos', 'Modelos de obra', 'btnModelosTopo', 'Planilhas-modelo por tipo de obra')
    ]));
    add('planilha', grupo('Composições na planilha', [
      tile('olho', 'Exibir todas', porOnclick('expandAllOrc()'), 'Abrir a composição de todos os itens'),
      tile('olhoNao', 'Ocultar todas', porOnclick('collapseAllOrc()')),
      tile('pulso', 'Diagnóstico', $('btnDiagComp'), 'Diagnóstico das composições')
    ]));
    add('planilha', grupo('Trazer itens prontos', [
      tile('planilha', 'Planilha por colunas', $('btnImportLista'), 'Importar uma planilha (Excel) escolhendo as colunas'),
      tile('relatorio', 'Relatório da importação', $('btnRelImport'))
    ]));
    var inf = el('div', 'v2-info', '<b>Como montar:</b> pesquise no catálogo (à esquerda) e clique em <b>+</b>; a quantidade, o BDI e a memória de cálculo ficam na planilha (à direita). Clique no <b>#</b> de uma linha para escolher onde o próximo item entra.');
    add('planilha', grupo('Dica', [inf]));

    /* 4 — Cotações e análises */
    add('cotar', grupo('Cotação de mercado', [
      tile('carrinho', 'Cotar todos os itens', $('btnCotacaoTodos'), 'Cotação de mercado de todos os itens com as IAs', 'dest'),
      tile('quartis', 'Cotação por quartis', porOnclick('abrirModalCotacaoGeral()')),
      tile('email', 'Pedido de proposta', $('btnPedidoProposta'))
    ]));
    add('cotar', grupo('Curva ABC', [
      tile('abc', 'ABC de serviços', porOnclick('abrirCurvaABC_Codigos()'), 'Curva ABC por código de serviço'),
      tile('insumos', 'ABC de insumos', porOnclick('abrirCurvaABC_Insumos()'))
    ]));
    add('cotar', grupo('Preços', [tile('balanca', 'Onerado × desonerado', $('btnCompararOnera'))]));

    /* 5 — Cronograma e modelos */
    add('crono', grupo('Cronograma', [tileTardio('crono', 'Cronograma físico-financeiro', 'btnCronoTopo', 'Etapas = títulos da planilha; prazo, distribuição automática e % editáveis', 'dest')]));
    add('crono', grupo('Modelos', [tileTardio('modelos', 'Modelos por tipo de obra', 'btnModelosTopo')]));
    add('crono', grupo('Dica', [el('div', 'v2-info', 'O cronograma usa os <b>títulos</b> da planilha como etapas e os valores <b>com BDI</b>. Ele vai como aba “Cronograma” no Excel exportado e é recebido pronto quando um programa de cálculo envia o orçamento.')]));

    /* 6 — Importar e receber */
    add('importar', grupo('Importar para a planilha', [
      tile('planilha', 'Planilha por colunas', $('btnImportLista'), 'Importar uma planilha (Excel) escolhendo as colunas'),
      tile('backup', 'Backup XLSX', $('fileBackupXLSX') && $('fileBackupXLSX').closest('label'), 'Reabrir um orçamento exportado em XLSX'),
      tile('relatorio', 'Relatório da última importação', $('btnRelImport'))
    ]));
    add('importar', grupo('Arquivo do mês dos bancos', [
      tile('emop', 'EMOP', porTexto('Atualizar EMOP', bE), 'EMOP (XLSX ou DBF da sua assinatura)'),
      tile('sinapi', 'SINAPI', porTexto('Atualizar SINAPI', bS), 'SINAPI (XLSX oficial mensal)'),
      tile('sco', 'SCO', porTexto('Atualizar SCO', bC), 'SCO-Rio (mensal)')
    ]));
    var liga = el('div', 'v2-info', '<b>Receber dos programas do site.</b> Drenagem Pluvial 1 e 2, Esgoto Sanitário, Pavimento Flexível, Pavimento Intertravado e Concreto Armado enviam a planilha (e o cronograma) direto para o Orçamento: ao chegar, a janela “Importar” abre sozinha.' +
      '<label><input type="checkbox" id="v2Dest"><span>Abrir o <b>Orçamento V2</b> (e não o V1) quando um programa enviar</span></label>');
    add('importar', grupo('Programas de cálculo', [tileFn('receber', 'Conferir envio agora', function(){ conferirEnvio(true); }, 'Procura uma planilha enviada por outro programa e abre a importação'), liga]));

    /* 7 — Exportar */
    var bx = $('boxExportXlsx');
    add('exportar', grupo('Planilha', [
      tile('xlsx', 'Excel (XLSX)', porOnclick('exportXLSX()'), 'Planilha do orçamento em Excel', 'dest'),
      tile('xlsxComp', 'Excel com composições', $('btnXlsxComp'))
    ]));
    add('exportar', grupo('Relatório', [
      tile('timbre', 'Cabeçalho e rodapé', $('btnCabecalhoRel'), 'Timbre da empresa, logotipo e rodapé do relatório'),
      tile('word', 'Word', $('btnWordRel')),
      tile('pdf', 'PDF', $('btnPdfRel'))
    ]));
    add('exportar', grupo('Cronograma', [tileTardio('crono', 'Cronograma', 'btnCronoTopo', 'O cronograma sai como aba no Excel')]));

    /* linha da obra */
    var lo = el('div'); lo.id = 'v2Obra';
    var cN = el('label', '', 'Obra'); cN.style.flex = '1.3'; var iN = $('nomeOrcAtual'); if(iN){ emprestar(iN, cN); }
    var cL = el('label', '', 'Local'); cL.style.flex = '1'; var iL = $('localObra'); if(iL){ emprestar(iL, cL); }
    var cD = el('label', '', 'Data-base'); var iD = $('dataBaseEMOP'); if(iD){ emprestar(iD, cD); }
    lo.appendChild(cN); lo.appendChild(cL); lo.appendChild(cD);
    if($('statusOrc')) emprestar($('statusOrc'), lo);

    [top, faixa, abas, fer, lo].forEach(function(n){ main.parentNode.insertBefore(n, main); V.nos.push(n); });

    abas.addEventListener('click', function(ev){
      var b = ev.target.closest('.v2-aba'); if(!b) return;
      if(b.id === 'v2Rec'){ recolher(!fer.classList.contains('fechada')); return; }
      if(b.classList.contains('ativa') && !fer.classList.contains('fechada')){ recolher(true); return; }
      abrirAba(b.dataset.aba); recolher(false);
    });
    var cd = $('v2Dest');
    if(cd){
      if(ls(KEY_DEST) == null) ls(KEY_DEST, 'v2');     // 1ª vez no V2: os programas passam a abrir o V2 (dá para desmarcar)
      cd.checked = ls(KEY_DEST) === 'v2';
      cd.onchange = function(){ ls(KEY_DEST, cd.checked ? 'v2' : 'v1'); };
    }
    var a0 = ls(KEY_ABA); abrirAba(V.pn[a0] && V.pn[a0].children.length ? a0 : 'planilha');
    recolher(ls(KEY_FER) === '0');
    atualizar();
    V.timer = setInterval(atualizar, 900);
  }

  /* tudo o que existir nos menus do motor e não tiver ferramenta no V2 vai para a aba "Mais" */
  var IGNORAR = /^(🛒 Cotar|💾 Salvar|Meus Orçamentos|🗂️ EMOP \(XLSX mensal\)|📥 SINAPI \(XLSX oficial mensal\)|📥 SCO \(mensal\))$/;
  function sobra(){
    if(!V) return;
    var pn = V.pn.mais, g = pn.querySelector('.v2-gc');
    var cand = [];
    ['topoMenus', 'topoObra'].forEach(function(id){ var r = $(id); if(r) Array.prototype.push.apply(cand, r.querySelectorAll('button,label.btn')); });
    cand.forEach(function(o){
      if(o.__v2 || o.__v2Tile || o.__v2Visto) return;
      if(o.classList.contains('tp-mb')) return;
      var t = o.textContent.replace(/\s+/g, ' ').trim(); if(!t) return;
      if(IGNORAR.test(t)){ o.__v2Visto = true; return; }
      if(!g){ var gr = grupo('Outras ferramentas', [el('span')], 'quebra'); pn.appendChild(gr); g = gr.querySelector('.v2-gc'); g.innerHTML = ''; }
      var ic = /usu[aá]rio/i.test(t) ? 'usuarios' : /nuvem/i.test(t) ? 'backup' : 'fer';
      var b = tile(ic, t.replace(/^[^\wÀ-ÿ+]+/, '') || t, o); if(b) g.appendChild(b);
    });
    var tem = !!(g && g.children.length);
    V.abas.mais.style.display = tem ? '' : 'none';
  }

  function abrirAba(a){
    if(!V || !V.pn[a]) return;
    Object.keys(V.pn).forEach(function(k){ V.pn[k].classList.toggle('ativa', k === a); V.abas[k].classList.toggle('ativa', k === a); V.abas[k].setAttribute('aria-selected', k === a ? 'true' : 'false'); });
    ls(KEY_ABA, a);
  }
  function recolher(sim){
    if(!V) return; var fer = $('v2Fer'); if(!fer) return;
    fer.classList.toggle('fechada', !!sim); ls(KEY_FER, sim ? '0' : '1');
    var t = $('v2RecTxt'); if(t) t.textContent = sim ? 'Mostrar ferramentas' : 'Recolher ferramentas';
  }

  /* resumo no cabeçalho, botões que aparecem/somem no motor, destaque do Auxílio de preenchimento */
  function atualizar(){
    if(!V) return;
    var k = $('kItens'), s = $('kSub'), t = $('kTot');
    var ci = $('v2cItens'), cs = $('v2cSub'), ct = $('v2cTot');
    if(ci && k) ci.innerHTML = '<b>' + esc(String(k.textContent).trim().split(/\s|\//)[0] || '0') + '</b> itens';
    if(cs && s) cs.innerHTML = 'Sem BDI <b>' + esc(String(s.textContent).replace(/DIPR:?/i, '').split('/')[0].trim()) + '</b>';
    if(ct && t) ct.innerHTML = 'Total <b>' + esc(String(t.textContent).trim()) + '</b>';
    V.tiles.forEach(function(b){
      if(b.__id && !(b.__orig && b.__orig.isConnected)){ var o = $(b.__id); if(o){ b.__orig = o; o.__v2Tile = b; if(o.title && b.title === b.textContent) b.title = o.title; } }
      b.hidden = !visivelPorSi(b.__orig);
    });
    Object.keys(V.pn).forEach(function(a){ V.pn[a].querySelectorAll('.v2-g').forEach(function(g){ var c = g.querySelector('.v2-gc'); if(!c) return; var algum = Array.prototype.some.call(c.children, function(x){ return !x.hidden; }); g.style.display = algum ? '' : 'none'; }); });
    sobra();
    /* Auxílio de preenchimento: o campo destacado precisa estar à vista */
    document.querySelectorAll('.v2-t.v2-hl').forEach(function(b){ b.classList.remove('v2-hl'); });
    var hl = document.querySelector('.gi-hl');
    if(hl){
      var alvo = hl.__v2Tile || hl, pn = alvo.closest && alvo.closest('.v2-pn');
      if(hl.__v2Tile) hl.__v2Tile.classList.add('v2-hl');
      if(pn && (!pn.classList.contains('ativa') || $('v2Fer').classList.contains('fechada'))){ abrirAba(pn.dataset.aba); recolher(false); }
    }
  }

  function desmontar(){
    if(!V) return;
    clearInterval(V.timer);
    var topo = $('topoMenus');
    /* devolve as peças emprestadas ao lugar de onde saíram (dentro dos menus do motor), na ordem inversa */
    V.emprestados.slice().reverse().forEach(function(x){
      try{
        if(x.pai && x.pai.isConnected){ if(x.prox && x.prox.parentNode === x.pai) x.pai.insertBefore(x.e, x.prox); else x.pai.appendChild(x.e); }
        else if(topo) topo.appendChild(x.e);
      }catch(e){}
    });
    V.tiles.forEach(function(b){ if(b.__orig) delete b.__orig.__v2Tile; });
    V.nos.forEach(function(n){ if(n.parentNode) n.parentNode.removeChild(n); });
    document.querySelectorAll('#topoMenus button,#topoObra button').forEach(function(o){ delete o.__v2Visto; });
    document.body.classList.remove('v2-on');
    V = null;
  }

  /* ---------- receber dos outros programas ---------- */
  function conferirEnvio(avisar){
    var tem = false; try{ tem = !!localStorage.getItem('tc_envio_orcamento'); }catch(e){}
    if(tem){
      /* o motor escuta a chave: regravar dispara a leitura nesta mesma janela */
      try{ window.dispatchEvent(new StorageEvent('storage', {key: 'tc_envio_orcamento', newValue: localStorage.getItem('tc_envio_orcamento')})); }catch(e){}
    } else if(avisar){
      alert('Nenhuma planilha enviada por outro programa está esperando.\n\nNo programa de cálculo (Drenagem, Esgoto, Pavimento, Intertravado, Concreto), use o botão “Enviar ao Orçamento”.');
    }
  }

  /* ---------- celular: marca + tema (o motor arruma o resto como sempre) ---------- */
  function barraCelular(){
    if($('v2Mob')) return;
    var m = el('div'); m.id = 'v2Mob';
    m.innerHTML = '<a class="v2-marca" href="/"><span class="v2-sq">' + svg('casa') + '</span><span class="v2-nome"><b>Total <span>Civil</span></b><small>Orçamento de Obras V2</small></span></a><span class="v2-sp"></span>';
    var b = el('button', 'v2-hb', svg('tema') + 'Layout'); b.type = 'button'; b.onclick = janelaTemas; m.appendChild(b);
    document.body.insertBefore(m, document.body.firstChild);
  }

  /* ---------- nome do programa ---------- */
  function nomes(){
    document.title = 'Orçamento de Obras V2 · Total Civil';
    var a = document.querySelector('#authOverlay .auth-header h2 span'); if(a) a.textContent = 'Orçamento de Obras V2';
    var h = document.querySelector('body>.header h1 span'); if(h) h.textContent = 'Orçamento de Obras V2';
    var s = $('splash-titulo'); if(s) s.textContent = 'Orçamento de Obras V2';
  }

  /* ---------- ligação com o motor ---------- */
  document.body.setAttribute('data-v2tema', temaAtual());
  nomes(); barraCelular();
  var initAntes = window.initApp;
  if(typeof initAntes === 'function'){
    window.initApp = function(){
      try{ desmontar(); }catch(e){ console.error('V2 desmontar', e); }
      var r = initAntes.apply(this, arguments);
      nomes();
      var desk = document.body.classList.contains('mode-desktop');
      document.body.classList.toggle('v2-mob', !desk);
      if(desk){ try{ montar(); }catch(e){ console.error('V2 montar', e); try{ desmontar(); }catch(e2){} } }
      return r;
    };
  }
  /* o motor refaz o cartão do usuário a cada login e o devolve ao menu "Conta": o menu inteiro já está no cabeçalho do V2 */
  window.orcV2 = {montar: montar, desmontar: desmontar, tema: aplicarTema, temas: TEMAS.map(function(t){ return t[0]; }), aba: abrirAba, versao: 'ORC2-01'};
})();
