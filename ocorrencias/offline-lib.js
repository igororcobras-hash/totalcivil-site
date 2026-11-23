/* ============================================================
   OCORRÊNCIAS DE MANUTENÇÃO — funções comuns do modo offline (PATCH SP-37)
   Usado pela tela do app (/ocorrencias/index.html) e, depois de aberto,
   por dentro do programa (/ocorrencias/dentro-do-app.js).
   - guarda no aparelho (IndexedDB "tc-offline") a cópia do programa
     Serviços Públicos e a última confirmação de acesso;
   - baixa o programa do servidor do mesmo jeito que o carregador.js
     (só com login e liberação);
   - prepara o programa para abrir dentro do app (sem a trava de login
     online, com o leitor de OCR deste aparelho).
   ============================================================ */
(function(){
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
  var PROG = 'manutencao', CAMPO = 'manutencaoAtivo';
  var DIAS_SEM_CONFIRMAR = 30;   /* sem internet, o app abre até 30 dias depois da última confirmação de acesso */
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  /* ---------- armazenamento ---------- */
  var _db = null;
  function db(){
    if(_db) return _db;
    _db = new Promise(function(res, rej){
      var r = indexedDB.open('tc-offline', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
    });
    return _db;
  }
  function get(k){ return db().then(function(d){ return new Promise(function(res){ var g = d.transaction('kv').objectStore('kv').get(k); g.onsuccess = function(){ res(g.result); }; g.onerror = function(){ res(undefined); }; }); }); }
  function put(k, v){ return db().then(function(d){ return new Promise(function(res, rej){ var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function(){ res(); }; t.onerror = function(){ rej(t.error); }; }); }); }

  /* ---------- Firebase (mesma sessão do site; o login fica salvo no aparelho) ---------- */
  var _fb = null;
  function firebase(){
    if(_fb) return _fb;
    _fb = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]).then(function(m){
      var A = m[0], Au = m[1], F = m[2];
      var cfg = window.FIREBASE_CONFIG;
      if(!cfg || !cfg.apiKey) throw new Error('configuração de acesso ausente');
      var app = A.getApps().length ? A.getApps()[0] : A.initializeApp(cfg);
      var a = Au.getAuth(app), d;
      try{ d = F.initializeFirestore(app, {experimentalAutoDetectLongPolling: true}); }catch(_){ d = F.getFirestore(app); }
      return Au.setPersistence(a, Au.browserLocalPersistence).catch(function(){}).then(function(){ return {A: A, Au: Au, F: F, app: app, a: a, d: d}; });
    });
    _fb.catch(function(){ _fb = null; });
    return _fb;
  }
  function usuario(f){
    return new Promise(function(res){ var off = f.Au.onAuthStateChanged(f.a, function(u){ off(); res(u); }); });
  }
  function prazo(p, ms){ return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('o servidor não respondeu a tempo')); }, ms); })]); }
  function paraData(v){ if(!v) return null; if(typeof v.toDate === 'function') return v.toDate(); var d = new Date(v); return isNaN(d.getTime()) ? null : d; }

  /* mesma regra do acesso-programa.js */
  function confirmar(f, u){
    var admins = (window.ADMINS || []).map(function(x){ return String(x).toLowerCase(); });
    var ehAdmin = admins.indexOf(String(u.email || '').toLowerCase()) >= 0;
    return prazo(f.F.getDoc(f.F.doc(f.d, 'usuarios', u.uid)), 20000).then(function(s){
      var p = s.exists() ? (s.data() || {}) : null;
      var venc = p && paraData(p.validade);
      var vencida = !!(venc && venc.getTime() < Date.now());
      var adm = ehAdmin || !!(p && p.admin === true);
      if(adm || (p && p[CAMPO] === true && p.recusado !== true && !vencida))
        return {ok: true, admin: adm, obras: (p && p.manutencaoObras) || {}, uid: u.uid, email: u.email || '', confirmadoEm: Date.now()};
      var motivo = !p ? 'Cadastro não encontrado. Termine o cadastro na página principal.' :
        p.recusado === true ? 'Seu acesso foi recusado pelo administrador.' :
        (p[CAMPO] === true && vencida) ? 'Seu acesso ao Serviços Públicos venceu em ' + venc.toLocaleDateString('pt-BR') + '. Renove na página principal.' :
        'Seu acesso ao Serviços Públicos ainda não foi liberado pelo administrador.';
      return {ok: false, motivo: motivo};
    });
  }

  /* baixa o programa (igual ao carregador.js). Devolve {versao, novo} */
  function baixar(f, progresso){
    if(LOCAL && window.__tcoffTeste) return fetch('/manutencao/index.html', {cache: 'no-store'}).then(function(r){ return r.text(); }).then(function(t){
      var gz = new TextEncoder().encode(t); return get('programa').then(function(ant){ var v = 'teste-' + t.length; return put('programa', {versao: v, gz: gz, txt: true, em: Date.now()}).then(function(){ return {versao: v, novo: !ant || ant.versao !== v}; }); });
    });
    return prazo(f.F.getDoc(f.F.doc(f.d, 'programas', PROG)), 20000).then(function(meta){
      if(!meta.exists()) throw new Error('programa ainda não publicado no servidor');
      var m = meta.data(), versao = m.versao, partes = m.partes;
      return get('programa').then(function(ant){
        if(ant && ant.versao === versao && ant.gz) return {versao: versao, novo: false};
        var feitas = 0;
        return prazo(Promise.all(Array.from({length: partes}, function(_, i){
          return f.F.getDoc(f.F.doc(f.d, 'programas', PROG, 'partes', String(i))).then(function(s){ feitas++; if(progresso) progresso(feitas, partes); return s.data().d.toUint8Array(); });
        })), 180000).then(function(ped){
          var total = ped.reduce(function(n, b){ return n + b.length; }, 0), gz = new Uint8Array(total), o = 0;
          ped.forEach(function(b){ gz.set(b, o); o += b.length; });
          return put('programa', {versao: versao, gz: gz, em: Date.now()}).then(function(){ return {versao: versao, novo: true}; });
        });
      });
    });
  }

  function texto(prog){
    if(prog.txt) return Promise.resolve(new TextDecoder().decode(prog.gz));
    var s = new Blob([prog.gz]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(s).text();
  }

  /* ---------- prepara o programa para rodar dentro do app ---------- */
  var TESS = {js: '/ocorrencias/lib/tesseract/tesseract.min.js', worker: '/ocorrencias/lib/tesseract/worker.min.js',
    core: '/ocorrencias/lib/tesseract', lang: '/ocorrencias/lib/tesseract', local: true};
  function semAutoAtualizacao(html){
    var i;
    while((i = html.indexOf('tc_versao:')) >= 0){
      var a = html.lastIndexOf('<script', i), b = html.indexOf('</script>', i);
      if(a < 0 || b < 0) break;
      html = html.slice(0, a) + html.slice(b + 9);
    }
    return html;
  }
  function preparar(html, acesso){
    html = semAutoAtualizacao(html);
    var us = {admin: !!acesso.admin, obras: acesso.obras || {}, uid: acesso.uid || ''};
    /* no lugar da trava online (acesso-programa.js): o acesso já foi conferido pelo app, com internet, há no máximo 30 dias */
    var stub = '<script>window.TC_OFFLINE_APP=1;window.TC_TESS=' + JSON.stringify(TESS) + ';window.TC_USUARIO=' + JSON.stringify(us).replace(/</g, '\\u003c') +
      ';window.TC_ACESSO="liberado";</' + 'script>';
    var re = /<script[^>]*src="\/acesso-programa\.js"[^>]*><\/script>/i;
    html = re.test(html) ? html.replace(re, stub) : html.replace(/<head[^>]*>/i, function(h){ return h + stub; });
    /* endereços relativos do programa (fotos de campo etc.) continuam apontando para /manutencao/ */
    html = html.replace(/<head[^>]*>/i, function(h){ return h + '<base href="/manutencao/">' +
      '<link rel="manifest" href="/ocorrencias/manifest.webmanifest"><meta name="theme-color" content="#b8410e">' +
      '<link rel="apple-touch-icon" href="/ocorrencias/icones/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes">' +
      '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Ocorrências">'; });
    var fim = html.lastIndexOf('</body>');
    var inj = '<script src="/ocorrencias/offline-lib.js"></' + 'script><script src="/ocorrencias/dentro-do-app.js"></' + 'script>';
    html = fim >= 0 ? html.slice(0, fim) + inj + html.slice(fim) : html + inj;
    return html;
  }

  function acessoValido(ac){
    if(!ac || !ac.ok) return false;
    return Date.now() - (ac.confirmadoEm || 0) < DIAS_SEM_CONFIRMAR * 864e5;
  }

  window.TCOFF = {get: get, put: put, firebase: firebase, usuario: usuario, confirmar: confirmar, baixar: baixar,
    texto: texto, preparar: preparar, acessoValido: acessoValido, DIAS: DIAS_SEM_CONFIRMAR, LOCAL: LOCAL, prazo: prazo};
})();
