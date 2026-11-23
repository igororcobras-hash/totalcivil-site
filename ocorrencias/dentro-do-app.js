/* ============================================================
   OCORRÊNCIAS DE MANUTENÇÃO — dentro do programa, no app offline (PATCH SP-37)
   Roda no Serviços Públicos quando ele é aberto pelo app /ocorrencias/.
   1. Faixa de situação: sem internet / enviando / tudo na nuvem / N pendentes.
   2. Quando volta a internet (e a cada 2 min com internet): manda para a
      nuvem TODOS os dados do aparelho — obras alteradas, fotos e documentos
      (usa as funções de nuvem do próprio programa: nuvIniciar, nuvEnviar,
      nuvSobeFotos).
   3. Relato salvo sem internet: ao voltar o sinal, completa o endereço pelas
      coordenadas, ou as coordenadas pelo endereço (OpenStreetMap), sem mexer
      no que o usuário já preencheu.
   4. Com internet: confere de novo o login/liberação e baixa a versão nova
      do programa (oferece "Atualizar").
   ============================================================ */
(function(){
  'use strict';
  if(!window.TC_OFFLINE_APP || window.__tcoffDentro) return;
  window.__tcoffDentro = 1;
  var EST = {enviando: false, ultimo: 0, msg: '', pend: 0, novaVersao: false};

  /* ---------- faixa de situação ---------- */
  var css = document.createElement('style');
  css.textContent = '#tcoff-faixa{position:fixed;left:64px;bottom:18px;z-index:61;max-width:calc(100vw - 230px);border-radius:999px;padding:8px 13px;font:600 13px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
    'box-shadow:0 3px 12px rgba(0,0,0,.25);color:#fff;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#tcoff-faixa.off{background:#5a6075}#tcoff-faixa.env{background:#b7791f}#tcoff-faixa.ok{background:#2e7d4f}#tcoff-faixa.pend{background:#b8410e}' +
    'body.noscroll #tcoff-faixa{display:none}@media print{#tcoff-faixa{display:none}}' +
    '#tcoff-nova{position:fixed;left:50%;transform:translateX(-50%);top:10px;z-index:70;background:#1a2130;color:#fff;border-radius:10px;padding:9px 12px;font:600 14px system-ui;box-shadow:0 4px 16px rgba(0,0,0,.3)}' +
    '#tcoff-nova button{margin-left:10px;font:inherit;border:0;border-radius:7px;padding:5px 10px;background:#b8410e;color:#fff;cursor:pointer}';
  document.head.appendChild(css);
  var faixa = document.createElement('div'); faixa.id = 'tcoff-faixa';
  faixa.title = 'Toque para enviar agora o que está guardado no aparelho';
  faixa.onclick = function(){ if(navigator.onLine) sincronizar(true); else aviso('Sem internet: tudo continua salvo no aparelho e será enviado quando o sinal voltar.'); };
  document.body.appendChild(faixa);

  function aviso(t, ms){ try{ toast(t, ms || 4500); }catch(_){ } }
  function obras(){ try{ return Object.values(S.obras || {}).filter(function(o){ return o && !o.demo; }); }catch(_){ return []; } }

  /* quantas coisas ainda não foram para a nuvem */
  async function pendentes(){
    var n = 0, f = 0;
    try{
      for(var o of obras()){
        if(typeof nuvPode === 'function' && NUV.ad && !nuvPode(o)) continue;
        if(!o._baseEm || (o._salvoEm || 0) > (o._baseEm || 0) + 1000 || NUV.pend.has(o.id)) n++;
        var ja = new Set((await DB.get('kv', 'fotosup:' + o.id)) || []);
        var ids = idsFotos(o);
        for(var id of ids){ if(!ja.has(id) && !/^d/.test(id)) f++; }
      }
    }catch(_){ }
    return {obras: n, fotos: f};
  }
  async function pinta(){
    var p = await pendentes(); EST.pend = p.obras + p.fotos;
    var t, cl;
    if(!navigator.onLine){ cl = 'off'; t = '📴 Sem internet — salvando no aparelho' + (EST.pend ? ' (' + (p.obras ? p.obras + ' obra(s)' : '') + (p.obras && p.fotos ? ' e ' : '') + (p.fotos ? p.fotos + ' foto(s)' : '') + ' a enviar)' : ''); }
    else if(EST.enviando){ cl = 'env'; t = '☁ Enviando para a nuvem…' + (EST.msg ? ' ' + EST.msg : ''); }
    else if(EST.pend){ cl = 'pend'; t = '⬆ ' + (p.obras ? p.obras + ' obra(s)' : '') + (p.obras && p.fotos ? ' e ' : '') + (p.fotos ? p.fotos + ' foto(s)' : '') + ' a enviar — toque para enviar'; }
    else { cl = 'ok'; t = '✅ Tudo na nuvem' + (EST.ultimo ? ' · ' + new Date(EST.ultimo).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : ''); }
    faixa.className = cl; faixa.textContent = t;
  }

  /* ---------- envia TUDO o que está no aparelho ---------- */
  async function sincronizar(forcado){
    if(!navigator.onLine || EST.enviando) return;
    EST.enviando = true; EST.msg = ''; pinta();
    try{
      /* o programa abriu sem internet: a nuvem não ficou pronta. Liga de novo (a sincronização inicial manda as obras alteradas e as fotos) */
      if(!NUV.ad || !NUV.pronto){
        if(NUV.ad && NUV.estado === 'sync'){ var w = 0; while(NUV.estado === 'sync' && !NUV.pronto && w++ < 60) await espera(500); }
        if(!NUV.pronto){ NUV.ad = null; await nuvIniciar(); }
      }
      if(NUV.ad && NUV.pronto){
        var lista = obras();
        for(var i = 0; i < lista.length; i++){
          var o = lista[i]; if(!nuvPode(o)) continue;
          EST.msg = '(' + (i + 1) + '/' + lista.length + ')'; pinta();
          if(!o._baseEm || (o._salvoEm || 0) > (o._baseEm || 0) + 1000 || NUV.pend.has(o.id)){ NUV.pend.delete(o.id); await nuvEnviar(o); }
          var esp = 0; while(NUV.subindo && esp++ < 600) await new Promise(function(r){ setTimeout(r, 500); });
          await nuvSobeFotos(o);
        }
        EST.ultimo = Date.now();
        await enderecosPendentes();
      } else if(forcado){
        aviso('Não foi possível ligar à nuvem. Confira se o login está ativo (Página principal › Entrar) e tente de novo.', 6000);
      }
    }catch(e){ console.warn('Offline: sincronização', e); }
    finally{ EST.enviando = false; EST.msg = ''; pinta(); }
  }

  /* ---------- relato salvo sem internet: marca para completar endereço/coordenadas depois ---------- */
  function marcarPendente(id){
    try{ var o = O(); if(!o) return; var oc = o.ocorrencias.find(function(x){ return x.id === id; }); if(!oc) return;
      oc._pendGeo = 1; saveObra(o); }catch(_){ }
  }
  function embrulhaSalvar(){
    if(typeof ACTS === 'undefined' || !ACTS.ocSave || ACTS.ocSave.__tcoff) return;
    var orig = ACTS.ocSave;
    ACTS.ocSave = function(){
      var id = (typeof M !== 'undefined' && M && M.t === 'oc' && M.d) ? M.d.id : null;
      var r = orig.apply(this, arguments);
      if(id && !navigator.onLine) setTimeout(function(){ marcarPendente(id); }, 600);
      return r;
    };
    ACTS.ocSave.__tcoff = 1;
  }
  var espera = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  async function enderecosPendentes(){
    for(var o of obras()){
      var mudou = false;
      for(var oc of (o.ocorrencias || [])){
        if(!oc._pendGeo || !navigator.onLine) continue;
        try{
          if(oc.lat != null && !String(oc.rua || '').trim()){
            var r = await revGeo(oc.lat, oc.lng), a = (r && r.address) || {};
            var rua = a.road || a.pedestrian || a.footway || a.path || '';
            var b = a.suburb || a.neighbourhood || a.city_district || a.quarter || '';
            if(rua){ oc.rua = a.house_number ? rua + ', ' + a.house_number : rua; if(!oc.bairro && b) oc.bairro = b;
              oc.hist.push({q: new Date().toISOString(), quem: 'Sistema', acao: 'Endereço preenchido pelas coordenadas quando a internet voltou (confira)'}); }
            await espera(1100);
          } else if(oc.lat == null && String(oc.rua || '').trim()){
            var q = [oc.rua, oc.bairro, 'Rio das Ostras', 'RJ'].filter(Boolean).join(', ');
            var l = await geocodificar(q);
            if(l && l[0]){ oc.lat = +l[0].lat; oc.lng = +l[0].lon; oc.origem = 'endereco';
              oc.hist.push({q: new Date().toISOString(), quem: 'Sistema', acao: 'Local no mapa achado pelo endereço quando a internet voltou (confira)'}); }
            await espera(1100);
          }
          delete oc._pendGeo; mudou = true;
        }catch(e){ console.warn('Offline: endereço', e); break; }
      }
      if(mudou){ await saveObra(o); }
    }
    try{ render(); }catch(_){ }
  }

  /* ---------- confere o acesso e baixa versão nova (com internet) ---------- */
  async function conferirVersao(){
    if(!navigator.onLine || !window.TCOFF || TCOFF.LOCAL) return;
    try{
      var f = await TCOFF.firebase(), u = await TCOFF.usuario(f);
      if(!u) return;   /* sem login: o programa avisa pela nuvem; o app continua abrindo pela cópia guardada */
      var ac = await TCOFF.confirmar(f, u);
      if(!ac.ok){ await TCOFF.put('acesso', {ok: false, revogado: true, motivo: ac.motivo, em: Date.now()}); aviso(ac.motivo + ' O app não abrirá na próxima vez.', 8000); return; }
      await TCOFF.put('acesso', ac);
      var antes = await TCOFF.get('programa');
      var r = await TCOFF.baixar(f);
      if(r.novo && antes){
        EST.novaVersao = true;
        var d = document.createElement('div'); d.id = 'tcoff-nova';
        d.innerHTML = 'Nova versão do programa baixada.<button type="button">Atualizar</button>';
        d.querySelector('button').onclick = function(){ sincronizar(true).then(function(){ location.href = '/ocorrencias/'; }); };
        document.body.appendChild(d);
      }
      /* bibliotecas que faltaram na instalação */
      if(navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({tcoff: 'baixar'});
    }catch(e){ console.warn('Offline: conferência', e); }
  }

  /* chip de nuvem do programa: sem internet não é "nuvem indisponível", é trabalho normal no aparelho */
  try{
    var _nc = nuvChip;
    nuvChip = function(){ if(!navigator.onLine) return '<span class="chip" style="--c:#5a6075" title="Sem internet: tudo fica salvo neste aparelho e vai para a nuvem quando o sinal voltar.">📴 Sem internet — salvo no aparelho</span>'; return _nc.apply(this, arguments); };
  }catch(_){ }
  function topo(){ try{ renderTop(); }catch(_){ } }

  /* ---------- liga tudo ---------- */
  embrulhaSalvar(); setTimeout(embrulhaSalvar, 1500);
  window.addEventListener('online', function(){ pinta(); topo(); aviso('Internet de volta: enviando os dados do aparelho para a nuvem…'); setTimeout(function(){ sincronizar(); }, 1500); });
  window.addEventListener('offline', function(){ pinta(); topo(); aviso('Sem internet: pode continuar. Tudo fica salvo no aparelho.', 5000); });
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible'){ pinta(); if(navigator.onLine) sincronizar(); } });
  setInterval(function(){ if(navigator.onLine) sincronizar(); else pinta(); }, 120000);
  setInterval(pinta, 15000);
  pinta(); topo();
  setTimeout(function(){ if(navigator.onLine) sincronizar(); }, 6000);
  setTimeout(conferirVersao, 9000);
  if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
  window.__tcoff = {sincronizar: sincronizar, pendentes: pendentes, enderecosPendentes: enderecosPendentes, EST: EST, pinta: pinta};
})();
