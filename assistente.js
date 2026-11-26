/* Botão "💬 Pergunte ao engenheiro" dos programas do Total Civil.
   <script src="/assistente.js" data-programa="drenagem" defer></script>
   Só aparece se a função do assistente estiver publicada e respondendo. */
(function () {
  'use strict';
  var me = document.currentScript, PROG = me && me.dataset.programa;
  var URL_F = 'https://southamerica-east1-calculadora-dnit.cloudfunctions.net/assistente';
  var SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
  if (!PROG) return;
  var hist = [], ocupado = false, pan, lista, txt;

  function contexto() {
    try {
      if (typeof window.TC_ASSIST_CONTEXTO === 'function') return String(window.TC_ASSIST_CONTEXTO());
      /* Drenagem e Esgoto: variáveis globais P (projeto) e R (resultado) */
      var o = {};
      /* eslint-disable no-undef */
      if (typeof P !== 'undefined' && P) { o.criterios = P.crit; o.qtd = { pvs: (P.pvs || []).length, trechos: (P.trechos || P.trs || []).length, ruas: (P.ruas || []).length }; o.nome = P.nome; }
      if (typeof R !== 'undefined' && R && R.checks) o.verificacao = R.checks.filter(function (c) { return c.st && c.st !== 'ok'; }).slice(0, 30).map(function (c) { return [c.st, c.el, c.par, c.val, c.lim, c.nota].filter(Boolean).join(' | '); });
      return Object.keys(o).length ? JSON.stringify(o).slice(0, 8000) : '';
    } catch (e) { return ''; }
  }
  function token() {
    return Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js')]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApps()[0] : m[0].initializeApp(window.FIREBASE_CONFIG);
      var u = m[1].getAuth(app).currentUser;
      if (!u) throw new Error('Entre com o seu login.');
      return u.getIdToken();
    });
  }
  function esc(t) { return String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function fmt(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function bolha(quem, t) { var d = document.createElement('div'); d.className = 'tca-m tca-' + quem; d.innerHTML = fmt(t); lista.appendChild(d); lista.scrollTop = lista.scrollHeight; return d; }
  function enviar() {
    var q = txt.value.trim(); if (!q || ocupado) return;
    ocupado = true; txt.value = ''; bolha('eu', q); var esp = bolha('ia', 'Pensando…');
    token().then(function (tk) {
      return fetch(URL_F, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
        body: JSON.stringify({ programa: PROG, pergunta: q, contexto: contexto(), historico: hist }) });
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.resposta) { esp.innerHTML = fmt(j.resposta); hist.push({ r: 'user', t: q }, { r: 'assistant', t: j.resposta }); }
      else esp.innerHTML = '⚠ ' + esc(j.erro || 'Sem resposta.');
    }).catch(function (e) { esp.innerHTML = '⚠ ' + esc(e.message || e); })
      .then(function () { ocupado = false; lista.scrollTop = lista.scrollHeight; });
  }
  function montar() {
    var css = document.createElement('style');
    css.textContent = '#tca-bt{position:fixed;right:16px;bottom:16px;z-index:99990;background:#b8410e;color:#fff;border:0;border-radius:24px;padding:10px 16px;font:600 14px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}' +
      '#tca{position:fixed;right:16px;bottom:66px;z-index:99991;width:min(380px,calc(100vw - 32px));height:min(520px,70vh);background:#fff;border:1px solid #ddd;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.25);display:none;flex-direction:column;font:14px/1.45 system-ui,sans-serif;color:#1a2130}' +
      '#tca.on{display:flex}#tca header{padding:10px 12px;background:#1a2a44;color:#fff;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center}' +
      '#tca header button{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}#tca .tca-l{flex:1;overflow:auto;padding:10px}' +
      '.tca-m{margin:6px 0;padding:8px 10px;border-radius:10px;max-width:92%}.tca-eu{background:#fde7dc;margin-left:auto}.tca-ia{background:#f1f3f6}' +
      '#tca small{display:block;padding:0 10px 6px;color:#667}#tca form{display:flex;gap:6px;padding:8px;border-top:1px solid #eee}' +
      '#tca textarea{flex:1;resize:none;height:44px;font:inherit;padding:6px;border:1px solid #ccc;border-radius:8px}#tca form button{background:#b8410e;color:#fff;border:0;border-radius:8px;padding:0 12px;font-weight:600;cursor:pointer}' +
      '@media print{#tca-bt,#tca{display:none!important}}';
    document.head.appendChild(css);
    var bt = document.createElement('button'); bt.id = 'tca-bt'; bt.type = 'button'; bt.textContent = '💬 Pergunte ao engenheiro';
    pan = document.createElement('div'); pan.id = 'tca';
    pan.innerHTML = '<header><b>Assistente de engenharia</b><button type="button" aria-label="Fechar">✕</button></header><div class="tca-l"></div>' +
      '<small>Apoio técnico com IA. Confira os resultados: a decisão e a ART são do engenheiro responsável.</small>' +
      '<form><textarea placeholder="Ex.: por que este trecho deu Ø 600?"></textarea><button>Enviar</button></form>';
    document.body.appendChild(bt); document.body.appendChild(pan);
    lista = pan.querySelector('.tca-l'); txt = pan.querySelector('textarea');
    bolha('ia', 'Olá! Sou o assistente de engenharia deste programa. Pergunte sobre os cálculos, critérios e normas.');
    bt.onclick = function () { pan.classList.toggle('on'); if (pan.classList.contains('on')) txt.focus(); };
    pan.querySelector('header button').onclick = function () { pan.classList.remove('on'); };
    pan.querySelector('form').onsubmit = function (e) { e.preventDefault(); enviar(); };
    txt.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };
  }
  function iniciar() {
    fetch(URL_F, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"ping":true}' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ok && j.ativo) montar(); }).catch(function () { /* assistente não publicado: não mostra nada */ });
  }
  if (window.TC_ACESSO === 'liberado') iniciar(); else document.addEventListener('tc-acesso-liberado', iniciar, { once: true });
})();
