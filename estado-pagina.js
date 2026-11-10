/* ============================================================
   estado-pagina.js — Total Civil
   MANTÉM A PÁGINA AO ATUALIZAR (F5, Ctrl+Shift+R depois de uma publicação,
   atualização automática ou o programa se redesenhando).

   Guarda, por aba do navegador (sessionStorage; some ao fechar a aba):
     • a aba/seção do programa em que a pessoa estava;
     • a posição da rolagem (da página e das caixas com rolagem que têm id);
     • a posição e o zoom de cada mapa Leaflet (não sai do mapa para a tela inicial).
   Depois da atualização, volta a essa aba, rolagem e posição do mapa.

   Uso (um <script> por programa, depois do assistente-abas.js):
     <script src="/estado-pagina.js"></script>
   Atributos opcionais:
     data-tabs="<seletor>"   botões de aba (padrão: o data-tabs do assistente-abas.js)
     data-abas="nao"         o programa restaura a navegação por conta própria
                             (só rolagem e mapa são tratados aqui)

   Os programas podem ler/gravar o próprio estado em window.TC_ESTADO.
   ============================================================ */
(function(){
  'use strict';
  if(window.TC_ESTADO) return;
  var ATUAL = document.currentScript;
  var CH = 'tc_estado:' + location.pathname;
  var T0 = Date.now(), VALIDADE = 12 * 3600e3, JANELA = 45000;

  function ler(){ try{ return JSON.parse(sessionStorage.getItem(CH) || 'null') || {}; }catch(e){ return {}; } }
  function gravar(p){ try{ var s = ler(); for(var k in p) s[k] = p[k]; s.t = Date.now(); sessionStorage.setItem(CH, JSON.stringify(s)); }catch(e){} }
  var salvo = ler(); if(!salvo.t || Date.now() - salvo.t > VALIDADE) salvo = {};
  window.TC_ESTADO = { ler: ler, gravar: gravar, salvo: salvo, restaurando: function(){ return Date.now() - T0 < JANELA; } };

  /* seletor das abas */
  var SEL = (ATUAL && ATUAL.getAttribute('data-tabs')) || '';
  if(!SEL){ var as = document.querySelector('script[src*="assistente-abas"]'); if(as) SEL = as.getAttribute('data-tabs') || ''; }
  var RESTAURA_ABAS = !(ATUAL && ATUAL.getAttribute('data-abas') === 'nao');

  function visivel(e){ return !!e && e.getClientRects().length > 0; }
  function ativa(e){
    var c = e.classList; if(!c) return false;
    return ['active','on','ativo','sel','selected','current','is-active'].some(function(n){ return c.contains(n); }) || e.getAttribute('aria-selected') === 'true';
  }
  function abas(){ try{ return SEL ? [].slice.call(document.querySelectorAll(SEL)) : []; }catch(e){ return []; } }

  /* ---------- 1) aba ---------- */
  if(SEL){
    document.addEventListener('click', function(ev){
      try{
        var el = ev.target && ev.target.closest ? ev.target.closest(SEL) : null; if(!el) return;
        var i = abas().indexOf(el); if(i < 0) return;
        gravar({ tab: i, tabTxt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50), y: 0, boxes: {} });
      }catch(e){}
    }, true);
  }

  /* ---------- 2) rolagem ---------- */
  var boxes = {}, tScroll = 0;
  function salvaRolagem(){
    tScroll = 0;
    gravar({ y: window.pageYOffset || document.documentElement.scrollTop || 0, boxes: boxes });
  }
  document.addEventListener('scroll', function(ev){
    var t = ev.target;
    if(t && t !== document && t.id && t.scrollTop !== undefined) boxes[t.id] = t.scrollTop;
    if(!tScroll) tScroll = setTimeout(salvaRolagem, 250);
  }, true);
  window.addEventListener('pagehide', salvaRolagem);
  window.addEventListener('beforeunload', salvaRolagem);

  /* ---------- 3) restaurar: espera o programa mostrar a tela dele ---------- */
  function veuAtivo(){ return document.documentElement.classList.contains('tc-veu'); }
  var feitoAba = !RESTAURA_ABAS || !SEL || salvo.tab == null;
  var tentativas = 0;
  function restauraAba(){
    var l = abas().filter(visivel); if(!l.length) return false;
    var alvo = null;
    if(salvo.tabTxt) alvo = l.filter(function(e){ return (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) === salvo.tabTxt; })[0];
    if(!alvo) alvo = abas()[salvo.tab];
    if(alvo && visivel(alvo) && !ativa(alvo) && tentativas < 5){
      tentativas++;
      try{ alvo.click(); }catch(e){}
      /* o programa pode ainda não ter ligado os cliques: confere e tenta de novo */
      setTimeout(function(){ if(!ativa(alvo) && tentativas < 5) restauraAba(); else restauraRolagem(); }, 700);
    }
    return true;
  }
  function restauraRolagem(){
    if(!(salvo.y > 0) && !Object.keys(salvo.boxes || {}).length) return;
    [150, 600, 1400, 2800].forEach(function(ms){
      setTimeout(function(){
        try{
          if(salvo.y > 0 && Math.abs((window.pageYOffset || 0) - salvo.y) > 4) window.scrollTo(0, salvo.y);
          Object.keys(salvo.boxes || {}).forEach(function(id){ var e = document.getElementById(id); if(e && Math.abs(e.scrollTop - salvo.boxes[id]) > 4) e.scrollTop = salvo.boxes[id]; });
        }catch(e){}
      }, ms);
    });
  }
  var n = 0;
  function espera(){
    n++;
    if(veuAtivo() && n < 300){ setTimeout(espera, 150); return; }
    if(!feitoAba){
      if(restauraAba()){ feitoAba = true; setTimeout(restauraRolagem, 120); return; }
      if(n < 120){ setTimeout(espera, 250); return; }
      feitoAba = true;
    }
    restauraRolagem();
  }
  /* só depois de a página carregar, para o programa já ter ligado os próprios cliques */
  function inicia(){ setTimeout(espera, 400); }
  if(document.readyState === 'complete') inicia(); else window.addEventListener('load', inicia);

  /* ---------- 4) mapas Leaflet: não perder a posição ---------- */
  var mem = {};                                   /* última posição de cada mapa nesta página */
  var mapasSalvos = salvo.maps || {};
  function chaveMapa(el){ return el.id || ('mapa-' + (el.className || '').toString().split(' ')[0]); }
  function gravaMapas(){ try{ gravar({ maps: mapasSalvos }); }catch(e){} }
  function ligaLeaflet(){
    if(!window.L || !L.Map || !L.Map.addInitHook) return false;
    if(L.Map.__tcEstado) return true; L.Map.__tcEstado = 1;
    L.Map.addInitHook(function(){
      var map = this, el = map.getContainer(), k = chaveMapa(el);
      var emJanela = el.closest && el.closest('#modal, .modal, [role=dialog]');   /* mapas de janelas sempre abrem no ponto pedido */
      if(emJanela) return;
      var alvo = null;
      if(window.TC_ESTADO.restaurando() && mapasSalvos[k]) alvo = mapasSalvos[k];
      else if(mem[k] && Date.now() - mem[k].t < 3000) alvo = mem[k];
      var t0 = Date.now(), feito = false, usuario = false;
      ['mousedown','wheel','touchstart','keydown'].forEach(function(e){ el.addEventListener(e, function(){ usuario = true; }, {passive: true}); });
      var osv = map.setView;
      function guarda(){ return alvo && !usuario && Date.now() - t0 < 6000; }
      function viaAlvo(){ feito = true; return osv.call(map, [alvo.lat, alvo.lng], alvo.z, {animate: false}); }
      if(alvo){
        map.setView = function(){ if(guarda()){ return feito ? map : viaAlvo(); } return osv.apply(map, arguments); };
        ['fitBounds','flyTo','flyToBounds'].forEach(function(nome){
          var o = map[nome]; if(typeof o !== 'function') return;
          map[nome] = function(){ if(guarda()){ return feito ? map : viaAlvo(); } return o.apply(map, arguments); };
        });
      }
      var tm = 0;
      map.on('moveend', function(){
        if(tm) return;
        tm = setTimeout(function(){
          tm = 0;
          try{
            var c = map.getCenter(), v = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), z: map.getZoom() };
            mem[k] = { lat: v.lat, lng: v.lng, z: v.z, t: Date.now() };
            mapasSalvos[k] = v; gravaMapas();
          }catch(e){}
        }, 300);
      });
      map.on('unload', function(){ if(mem[k]) mem[k].t = Date.now(); });
    });
    return true;
  }
  if(!ligaLeaflet()){ var tl = 0, iv = setInterval(function(){ if(ligaLeaflet() || ++tl > 80) clearInterval(iv); }, 250); }
})();
