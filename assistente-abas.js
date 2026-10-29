/* ============================================================
   NAVEGAÇÃO ENTRE ABAS + AUXÍLIO DE PREENCHIMENTO — Total Civil
   Script único, igual para todos os programas do site.

   Barra fixa no canto inferior esquerdo:
       [‹ Anterior]  [📋 Auxílio de preenchimento · Aba 3/7]  [Próximo ›]
   - Anterior / Próximo trocam de aba (pulam para a aba seguinte ao terminar uma).
   - O botão do meio abre o guia de preenchimento da aba atual.
       data-auxilio="proprio": usa o guia que o programa já tem (botão
                               "📋 Auxílio Preenchimento"), mesmo que o botão da aba
                               esteja escondido.
       data-auxilio="misto":   usa o guia do programa só nas abas listadas em
                               data-proprio-abas="chave1,chave2"; nas demais, o guia gerado.
       data-auxilio="gerar":   o programa não tem guia; este script monta um, que
                               percorre os campos visíveis da aba (indica os vazios),
                               e ao final oferece "Próxima aba ›".

   Uso, no <head> do programa (depois do acesso-programa.js):
     <script src="/assistente-abas.js" data-tabs=".tab-btn" data-auxilio="proprio"></script>
   data-tabs = seletor CSS dos botões de aba, na ordem das abas.
   ============================================================ */
(function () {
  'use strict';
  var me = document.currentScript;
  var SEL = (me && me.dataset.tabs) || '';
  var MODO = (me && me.dataset.auxilio) || 'proprio';
  var PROPRIAS = ((me && me.dataset.proprioAbas) || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!SEL) return;

  var RECOLH = !!(me && me.dataset.recolhido);
  var aberto = !RECOLH, fab = null;
  var CORES = {fundo: '#ffffff', borda: '#2563eb', texto: '#1e293b', botao: '#2563eb'};
  var guia = {ativo: false, campos: [], i: 0};
  var barra = null, painel = null, ultimaChave = '';

  function visivel(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && (r.width > 0 || r.height > 0);
  }
  function abas() {
    return Array.prototype.slice.call(document.querySelectorAll(SEL)).filter(visivel);
  }
  function ehAtiva(b) {
    if (b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-current')) return true;
    return /(^|\s)(active|on|ativa|ativo|selected|sel)(\s|$)/.test(b.className || '');
  }
  function chaveDaAba(b) {
    if (!b) return '';
    if (b.dataset && (b.dataset.tab || b.dataset.k || b.dataset.aba)) return b.dataset.tab || b.dataset.k || b.dataset.aba;
    var m = /['"]([A-Za-z0-9_-]+)['"]/.exec(b.getAttribute('onclick') || '');
    return m ? m[1] : '';
  }
  function nomeDaAba(b) { return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }

  /* ---------- guia do próprio programa (se existir) ---------- */
  function botoesAuxilio() {
    return Array.prototype.slice.call(document.querySelectorAll('button')).filter(function (b) {
      return /Aux[ií]lio Preenchimento|Parar Aux[ií]lio/.test(b.textContent) && !(barra && barra.contains(b));
    });
  }
  function auxilioDaAba(b) {
    var todos = botoesAuxilio(); if (!todos.length) return null;
    var k = chaveDaAba(b);
    if (k) {
      var casa = todos.filter(function (x) { return x.id && x.id.slice(-(k.length + 1)) === '_' + k; });
      if (casa.length) return casa[0];
    }
    return todos[0];
  }
  function guiaProprioAberto() {
    return Array.prototype.slice.call(document.querySelectorAll('[id^="guiaInstr"],[id^="gi-"]')).some(function (e) {
      return e.id.indexOf('guiaInstr') === 0 && e.style.display !== 'none' && visivel(e);
    });
  }

  /* ---------- barra ---------- */
  function css() {
    if (document.getElementById('tc-aa-css')) return;
    var s = document.createElement('style'); s.id = 'tc-aa-css';
    s.textContent =
      '#tc-aa{position:fixed;left:16px;bottom:16px;z-index:99985;display:flex;align-items:stretch;gap:6px;max-width:calc(100vw - 32px);' +
        'background:' + CORES.fundo + ';border:2px solid ' + CORES.borda + ';border-radius:12px;padding:6px;box-shadow:0 8px 28px rgba(37,99,235,.25);' +
        'font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:' + CORES.texto + '}' +
      '#tc-aa button{font:inherit;border-radius:8px;border:1px solid ' + CORES.botao + ';padding:7px 10px;cursor:pointer;background:#fff;color:' + CORES.botao + ';white-space:nowrap}' +
      '#tc-aa button.pri{background:' + CORES.botao + ';color:#fff}' +
      '#tc-aa button[disabled]{opacity:.4;cursor:default}' +
      '#tc-aa .mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;padding:0 4px}' +
      '#tc-aa .mid small{font-weight:600;color:#64748b;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#tc-aa .mid button{background:#0ea5e9;border-color:#0ea5e9;color:#fff}' +
      '#tc-pg{position:fixed;right:16px;bottom:16px;z-index:99990;width:330px;max-width:calc(100vw - 32px);background:#fff;border:2px solid #2563eb;border-radius:12px;box-shadow:0 8px 32px rgba(37,99,235,.25);font:13px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1e293b}' +
      '#tc-pg .h{background:#2563eb;color:#fff;border-radius:10px 10px 0 0;padding:8px 12px;display:flex;align-items:center;gap:6px;font-weight:700;font-size:12px}' +
      '#tc-pg .h span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#tc-pg .h button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;line-height:1}' +
      '#tc-pg .b{padding:12px}#tc-pg .t{font-weight:700;color:#1e40af;margin-bottom:4px}#tc-pg .d{margin-bottom:4px}' +
      '#tc-pg .v{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;margin-bottom:6px}' +
      '#tc-pg .v.v1{background:#fef3c7;color:#92400e}#tc-pg .v.v0{background:#dcfce7;color:#166534}' +
      '#tc-pg .p{height:4px;background:#e2e8f0}#tc-pg .p i{display:block;height:4px;background:#2563eb;transition:width .3s}' +
      '#tc-pg .n{display:flex;gap:6px;padding:8px 12px;border-top:1px solid #e2e8f0;flex-wrap:wrap}' +
      '#tc-pg .n button{flex:1;min-width:84px;padding:6px 6px;border-radius:7px;border:1px solid #2563eb;cursor:pointer;font-size:11px;font-weight:700;background:#fff;color:#2563eb}' +
      '#tc-pg .n button.pri{background:#2563eb;color:#fff}#tc-pg .n button.aba{background:#0ea5e9;border-color:#0ea5e9;color:#fff}#tc-pg .n button[disabled]{opacity:.4}' +
      '.tc-dest{outline:3px solid #2563eb!important;outline-offset:3px!important;animation:tcPulse 1.2s infinite}' +
      '@keyframes tcPulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,.55)}50%{box-shadow:0 0 0 7px rgba(37,99,235,0)}}' +
      '@media(max-width:640px){#tc-aa{left:8px;right:8px;bottom:8px;max-width:none;justify-content:space-between}#tc-aa .mid small{max-width:110px}#tc-pg{right:8px;left:8px;width:auto;bottom:70px}}' +
      '#tc-fab{position:fixed;left:12px;bottom:12px;z-index:99985;width:44px;height:44px;border-radius:50%;border:2px solid #2563eb;background:#fff;color:#2563eb;font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(37,99,235,.3);padding:0}' +
      '#tc-aa .x{padding:7px 8px}' +
      '@media print{#tc-aa,#tc-pg,#tc-fab{display:none!important}}';
    document.head.appendChild(s);
  }
  function montarBarra() {
    if (barra) return;
    css();
    barra = document.createElement('div'); barra.id = 'tc-aa';
    barra.innerHTML = '<button type="button" id="tc-ant">‹ Anterior</button>' +
      '<div class="mid"><button type="button" id="tc-aux">📋 Auxílio de preenchimento</button><small id="tc-pos"></small></div>' +
      '<button type="button" class="pri" id="tc-prox">Próximo ›</button>' + (RECOLH ? '<button type="button" class="x" id="tc-rec" title="Esconder a barra">✕</button>' : '');
    document.body.appendChild(barra);
    barra.querySelector('#tc-ant').onclick = function () { mover(-1); };
    barra.querySelector('#tc-prox').onclick = function () { mover(1); };
    barra.querySelector('#tc-aux').onclick = abrirAuxilio;
    var rc = barra.querySelector('#tc-rec');
    if (rc) rc.onclick = function () { aberto = false; fecharGuia(); atualizar(); };
  }
  function montarFab() {
    if (fab) return;
    css();
    fab = document.createElement('button'); fab.type = 'button'; fab.id = 'tc-fab'; fab.title = 'Abrir navegação entre abas e Auxílio de preenchimento'; fab.textContent = '📋';
    fab.onclick = function () { aberto = true; atualizar(); };
    document.body.appendChild(fab);
  }

  function mover(d) {
    var l = abas(); if (!l.length) return;
    var i = -1; l.forEach(function (b, k) { if (ehAtiva(b)) i = k; });
    var n = l[i + d]; if (!n) return;
    var tinhaGuia = guia.ativo || guiaProprioAberto();
    fecharGuia();
    n.click();
    try { n.scrollIntoView({inline: 'center', block: 'nearest'}); } catch (e) {}
    setTimeout(function () {
      window.scrollTo({top: 0, behavior: 'smooth'});
      atualizar();
      if (tinhaGuia) abrirAuxilio();
    }, 350);
  }

  function atualizar() {
    var l = abas();
    var modal = document.querySelector('#modal:not(.hidden),[role=dialog]:not([hidden]),.modal-overlay.open,.modal-overlay.show,.modal-overlay.active');
    if (l.length < 2 || (modal && visivel(modal))) { if (barra) barra.style.display = 'none'; if (fab) fab.style.display = 'none'; return; }
    if (RECOLH && !aberto) { if (barra) barra.style.display = 'none'; montarFab(); fab.style.display = ''; return; }
    if (fab) fab.style.display = 'none';
    montarBarra(); barra.style.display = '';
    var i = -1; l.forEach(function (b, k) { if (ehAtiva(b)) i = k; });
    barra.querySelector('#tc-ant').disabled = i <= 0;
    barra.querySelector('#tc-prox').disabled = i < 0 || i >= l.length - 1;
    barra.querySelector('#tc-pos').textContent = i < 0 ? '' : 'Aba ' + (i + 1) + '/' + l.length + ' · ' + nomeDaAba(l[i]);
    var chave = i + '|' + l.length;
    if (chave !== ultimaChave) { ultimaChave = chave; if (guia.ativo) { /* aba mudou por fora */ fecharGuia(); } }
  }

  /* ---------- botão do meio ---------- */
  function abrirAuxilio() {
    var l = abas(), ativa = null; l.forEach(function (b) { if (ehAtiva(b)) ativa = b; });
    if (MODO === 'proprio' || (MODO === 'misto' && ativa && PROPRIAS.indexOf(chaveDaAba(ativa)) >= 0)) {
      var b = auxilioDaAba(ativa);
      if (b) { b.click(); return; }
    }
    iniciarGuia();
  }

  /* ---------- guia gerado (programas sem guia próprio) ---------- */
  function areaDaAba() {
    return document.querySelector('#app') || document.querySelector('main') || document.body;
  }
  function rotulo(el) {
    var t = '';
    var lb = el.closest('label');
    if (lb) {
      var c = lb.cloneNode(true);
      Array.prototype.slice.call(c.querySelectorAll('input,select,textarea,button')).forEach(function (x) { x.remove(); });
      t = (c.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if (!t && el.id) { var l2 = document.querySelector('label[for="' + el.id + '"]'); if (l2) t = l2.textContent.trim(); }
    return t || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || 'Campo';
  }
  function camposDaAba() {
    var raiz = areaDaAba();
    var q = raiz.querySelectorAll('input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),select,textarea');
    return Array.prototype.slice.call(q).filter(function (e) {
      return !e.disabled && !e.readOnly && visivel(e) && !e.closest('#tc-aa,#tc-pg,#top,header,nav,.modal,[role=dialog],[id^=guiaInstr]');
    }).map(function (e) { return {el: e, titulo: rotulo(e), dica: e.getAttribute('title') || e.getAttribute('data-dica') || '', campo: true}; });
  }
  /* passos escritos à mão pelo programa: window.TC_GUIAS = { chaveDaAba: [ {sel, titulo, dica, norma} ] } */
  function passosDoPrograma() {
    var l = abas(), ativa = null; l.forEach(function (b) { if (ehAtiva(b)) ativa = b; });
    var g = window.TC_GUIAS && ativa && window.TC_GUIAS[chaveDaAba(ativa)];
    if (!g || !g.length) return null;
    var out = [];
    g.forEach(function (p) {
      var el = null; try { el = document.querySelector(p.sel); } catch (e) {}
      if (!el || !visivel(el)) return;
      var campo = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'checkbox';
      out.push({el: el, titulo: p.titulo, dica: p.dica || '', norma: p.norma || '', campo: campo});
    });
    return out.length ? out : null;
  }
  function itensDaAba() { return passosDoPrograma() || camposDaAba(); }
  function vazio(it) { var e = it.el; if (!it.campo) return false; return e.tagName === 'SELECT' ? (e.selectedIndex <= 0 && !e.value) : !String(e.value || '').trim(); }
  function tirarDestaque() { Array.prototype.slice.call(document.querySelectorAll('.tc-dest')).forEach(function (e) { e.classList.remove('tc-dest'); }); }
  function fecharGuia() {
    guia.ativo = false; tirarDestaque();
    if (painel) painel.style.display = 'none';
  }
  function iniciarGuia() {
    guia.campos = itensDaAba(); guia.i = 0; guia.ativo = true;
    // começa no primeiro campo vazio, se houver
    if (!passosDoPrograma()) { for (var k = 0; k < guia.campos.length; k++) { if (vazio(guia.campos[k])) { guia.i = k; break; } } }
    if (!painel) {
      painel = document.createElement('div'); painel.id = 'tc-pg'; document.body.appendChild(painel);
    }
    painel.style.display = '';
    passo();
  }
  function passo(quieto) {
    var l = abas(), ia = -1; l.forEach(function (b, k) { if (ehAtiva(b)) ia = k; });
    var nomeAba = ia >= 0 ? nomeDaAba(l[ia]) : '';
    var campos = guia.campos = itensDaAba();
    tirarDestaque();
    if (guia.i >= campos.length) guia.i = campos.length - 1;
    var n = campos.length, vazios = campos.filter(vazio).length;
    var it = campos[guia.i], el = it && it.el;
    var ultimo = guia.i >= n - 1;
    var html = '<div class="h"><span>📋 ' + esc(nomeAba || 'Auxílio de preenchimento') + '</span><button type="button" id="tc-pg-x" title="Encerrar">✕</button></div>';
    if (!n) {
      html += '<div class="b"><div class="t">Nada para preencher aqui</div><div class="d">Esta aba não tem campos de preenchimento visíveis. Use “Próxima aba” para seguir.</div></div>';
    } else {
      var tit = it.titulo, dica = it.dica, ph = el.getAttribute && el.getAttribute('placeholder');
      if (!dica && ph && ph !== tit) dica = 'Exemplo: ' + ph;
      if (!dica && el.tagName === 'SELECT') dica = 'Escolha uma das opções da lista.';
      if (!dica) dica = it.campo ? 'Preencha este campo.' : 'Use este item para avançar nesta aba.';
      var temCampos = campos.some(function (x) { return x.campo; });
      html += '<div class="b"><div class="t">' + (/^\d+ \/ \d+ — /.test(tit) ? '' : (guia.i + 1) + ' / ' + n + ' — ') + esc(tit) + '</div><div class="d">' + esc(dica) + '</div>' +
        (it.norma ? '<div class="d" style="font-size:11px;color:#64748b;font-style:italic;border-left:3px solid #2563eb;padding-left:8px">' + esc(it.norma) + '</div>' : '') +
        (it.campo ? '<span class="v ' + (vazio(it) ? 'v1' : 'v0') + '">' + (vazio(it) ? 'campo vazio' : 'preenchido') + '</span> ' : '') +
        (temCampos ? '<span class="v ' + (vazios ? 'v1' : 'v0') + '">' + (vazios ? vazios + ' vazio(s) nesta aba' : 'aba completa ✓') + '</span>' : '') + '</div>' +
        '<div class="p"><i style="width:' + Math.round((guia.i + 1) / n * 100) + '%"></i></div>';
    }
    var primeiro = guia.i <= 0 || !n;
    html += '<div class="n">' +
      '<button type="button" id="tc-pg-a" ' + (primeiro && ia <= 0 ? 'disabled' : '') + '>' + (primeiro ? '‹ Aba anterior' : '‹ Anterior') + '</button>' +
      '<button type="button" id="tc-pg-p" class="' + (ultimo || !n ? 'aba' : 'pri') + '" ' + ((ultimo || !n) && ia >= l.length - 1 ? 'disabled' : '') + '>' + (ultimo || !n ? 'Próxima aba ›' : 'Próximo ›') + '</button></div>';
    painel.innerHTML = html;
    painel.querySelector('#tc-pg-x').onclick = fecharGuia;
    painel.querySelector('#tc-pg-a').onclick = function () { if (primeiro) mover(-1); else { guia.i--; passo(); } };
    painel.querySelector('#tc-pg-p').onclick = function () { if (ultimo || !n) mover(1); else { guia.i++; passo(); } };
    if (el) {
      el.classList.add('tc-dest');
      if (!quieto) { try { el.scrollIntoView({behavior: 'smooth', block: 'center'}); } catch (e) {} try { el.focus({preventScroll: true}); } catch (e) {} }
    }
  }
  /* atualiza o contador de vazios enquanto a pessoa digita */
  document.addEventListener('input', function () { if (guia.ativo && painel) { passo(true); } }, true);

  function iniciar() {
    atualizar();
    setInterval(atualizar, 800);
    document.addEventListener('click', function () { setTimeout(atualizar, 200); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
