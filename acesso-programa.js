/* ============================================================
   ACESSO AOS PROGRAMAS — Total Civil
   Mesmo controle do Pavimento, do Orçamento e do Intertravado:
   login único da página principal (Firebase, projeto calculadora-dnit)
   e liberação pelo administrador no painel Usuários.

   Uso, dentro do <head> do programa, logo depois do <meta charset>:
     <script src="/firebase-config.js"></script>
     <script src="/acesso-programa.js" data-campo="drenagemAtivo"
             data-pedido="drenagemSolicitado" data-nome="Drenagem Pluvial"
             data-voltar="/drenagem/"></script>

   Regras (iguais às da página principal, função liberado()):
     - sem login → vai para /?entrar=1&voltar=<programa>;
     - administrador → entra;
     - campo do programa = true, não recusado e validade não vencida → entra;
     - qualquer outro caso, ou erro de conexão → a tela continua bloqueada.
   ============================================================ */
(function(){
  'use strict';
  var me = document.currentScript;
  var CAMPO  = me && me.dataset.campo;
  var PEDIDO = me && me.dataset.pedido || '';
  var NOME   = me && me.dataset.nome || 'este programa';
  var VOLTAR = me && me.dataset.voltar || location.pathname;
  var SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
  var PRINCIPAL = (location.hostname.replace(/^www\./, '') === 'totalcivil.com.br' ? '' : 'https://totalcivil.com.br') + '/';

  /* trava a tela antes de o programa aparecer */
  var raiz = document.documentElement;
  raiz.classList.add('tc-trava');
  var css = document.createElement('style');
  css.id = 'tc-trava-css';
  css.textContent =
    'html.tc-trava body>*:not(#tc-trava){display:none!important}' +
    'html.tc-trava body{overflow:hidden!important}' +
    '#tc-trava{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:#F6F4EF;color:#1a2130;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '#tc-trava .cx{max-width:440px;width:100%;background:#fff;border:1px solid #e3ded3;border-radius:14px;padding:24px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.06)}' +
    '#tc-trava h2{margin:0 0 8px;font-size:19px}#tc-trava p{margin:0 0 16px;color:#4a5568}' +
    '#tc-trava p.tc-msg{margin:0;color:#1a2130;font-weight:600;font-size:16px}' +
    '#tc-trava .bts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}' +
    '#tc-trava a,#tc-trava button{font:inherit;font-weight:600;border-radius:9px;padding:9px 16px;cursor:pointer;text-decoration:none;border:1px solid #b8410e}' +
    '#tc-trava a{background:#b8410e;color:#fff}#tc-trava button{background:#fff;color:#b8410e}';
  (document.head || raiz).appendChild(css);

  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  var quadro = null;
  function tela(titulo, texto, botoes){
    function por(){
      if(!quadro){ quadro = document.createElement('div'); quadro.id = 'tc-trava'; document.body.appendChild(quadro); }
      if(titulo == null){ quadro.innerHTML = '<div class="cx"><p class="tc-msg">' + esc(texto) + '</p></div>'; return; }
      quadro.innerHTML = '<div class="cx"><h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + texto + '</p>' : '') +
        (botoes ? '<div class="bts">' + botoes + '</div>' : '') + '</div>';
      var s = quadro.querySelector('[data-sair]'); if(s) s.onclick = sair;
      var r = quadro.querySelector('[data-recarregar]'); if(r) r.onclick = function(){ location.reload(); };
    }
    document.body ? por() : document.addEventListener('DOMContentLoaded', por);
  }
  function liberar(adm, obras, uid){
    window.TC_USUARIO = {admin: !!adm, obras: (obras && typeof obras === 'object') ? obras : {}, uid: uid || ''};
    raiz.classList.remove('tc-trava');
    if(quadro) quadro.remove();
    window.TC_ACESSO = 'liberado';
    document.dispatchEvent(new CustomEvent('tc-acesso-liberado'));
  }
  function irParaLogin(){ location.replace(PRINCIPAL + '?entrar=1&voltar=' + encodeURIComponent(VOLTAR)); }
  var BT_PRINCIPAL = '<a href="' + PRINCIPAL + '">Página principal</a>';
  var BT_SAIR = '<button type="button" data-sair>Sair</button>';
  var fb = null;
  function sair(){ if(fb){ fb.auth.signOut(fb.a).then(function(){ location.href = PRINCIPAL; }); } else location.href = PRINCIPAL; }
  function erro(det){
    tela('Não foi possível verificar seu acesso', 'Verifique a internet e tente de novo.<br><small>' + esc(det) + '</small>',
      '<button type="button" data-recarregar>Tentar de novo</button>' + BT_PRINCIPAL);
  }
  function prazo(p, ms){ return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('o servidor não respondeu a tempo')); }, ms); })]); }
  function paraData(v){ if(!v) return null; if(typeof v.toDate === 'function') return v.toDate(); var d = new Date(v); return isNaN(d.getTime()) ? null : d; }

  /* mesmo texto da tela de entrada do site */
  tela(null, 'Baixando versão atualizada do programa e verificando login de acesso.', '');

  var cfg = window.FIREBASE_CONFIG;
  if(!CAMPO || !cfg || !cfg.apiKey){ erro('configuração de acesso ausente'); return; }

  Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')])
  .then(function(m){
    var app = m[0].initializeApp(cfg), auth = m[1], fs = m[2];
    var a = auth.getAuth(app), d;
    try{ d = fs.initializeFirestore(app, {experimentalAutoDetectLongPolling: true}); }catch(_){ d = fs.getFirestore(app); }
    fb = {a: a, auth: auth};
    return auth.setPersistence(a, auth.browserLocalPersistence).catch(function(){}).then(function(){
      auth.onAuthStateChanged(a, function(u){
        if(!u){ irParaLogin(); return; }
        var admins = (window.ADMINS || []).map(function(x){ return String(x).toLowerCase(); });
        var ehAdmin = admins.indexOf(String(u.email || '').toLowerCase()) >= 0;
        var ref = fs.doc(d, 'usuarios', u.uid);
        prazo(fs.getDoc(ref), 20000).then(function(snap){
          var p = snap.exists() ? (snap.data() || {}) : null;
          var venc = p && paraData(p.validade);
          var vencida = !!(venc && venc.getTime() < Date.now());
          if(ehAdmin || (p && p.admin === true) || (p && p[CAMPO] === true && p.recusado !== true && !vencida)){ liberar(ehAdmin || !!(p && p.admin === true), p && p.manutencaoObras, u.uid); return; }
          if(!p){
            tela('Cadastro não encontrado', 'Termine seu cadastro e contrate ' + esc(NOME) + ' na página principal.', BT_PRINCIPAL + BT_SAIR);
            return;
          }
          if(p.recusado === true){
            tela('Acesso recusado', 'Seu acesso foi recusado pelo administrador. Entre em contato para mais informações.', BT_PRINCIPAL + BT_SAIR);
            return;
          }
          if(p[CAMPO] === true && vencida){
            tela('Acesso vencido', 'Seu acesso a ' + esc(NOME) + ' venceu em ' + venc.toLocaleDateString('pt-BR') + '. Renove o pacote na página principal.', BT_PRINCIPAL + BT_SAIR);
            return;
          }
          /* registra o pedido, como o Intertravado faz (as regras aceitam só os campos *Solicitado) */
          if(PEDIDO && p[PEDIDO] !== true){ var o = {}; o[PEDIDO] = true; fs.updateDoc(ref, o).catch(function(e){ console.warn('Pedido não registrado:', e); }); }
          tela('Acesso ainda não liberado', 'Seu acesso a ' + esc(NOME) + ' ainda não foi liberado pelo administrador. Contrate ou acompanhe o pedido na página principal.', BT_PRINCIPAL + BT_SAIR);
        }).catch(function(e){ console.error('Acesso:', e); erro((e && e.message) || String(e)); });
      });
    });
  })
  .catch(function(e){ console.error('Acesso:', e); erro((e && e.message) || String(e)); });
})();
