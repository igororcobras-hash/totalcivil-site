/* ============================================================
   CARREGADOR DOS PROGRAMAS — Total Civil
   No site publicado, /<programa>/index.html é só esta tela de entrada.
   O código do programa fica no Firestore (coleção "programas") e as
   regras do servidor só o entregam a quem tem login e liberação no
   painel Usuários (mesma regra da página principal: campo do programa,
   não recusado e validade não vencida; administradores sempre).

   Página gerada por scripts/publicar/montar-site.js:
     <script src="/firebase-config.js"></script>
     <script type="module" src="/carregador.js" data-prog="drenagem"
       data-campo="drenagemAtivo" data-pedido="drenagemSolicitado"
       data-nome="Drenagem Pluvial"></script>
   ============================================================ */
const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const me = document.querySelector('script[data-prog]');
const PROG = me.dataset.prog, CAMPO = me.dataset.campo, PEDIDO = me.dataset.pedido || '', NOME = me.dataset.nome || 'este programa';
const VOLTAR = '/' + PROG + '/';
const PRINCIPAL = (location.hostname.replace(/^www\./, '') === 'totalcivil.com.br' ? '' : 'https://totalcivil.com.br') + '/';
const CACHE_DB = 'tc-programas', CACHE_ST = 'programas';
/* o mesmo texto em todas as telas de abertura (tela de entrada, carregador e véu do programa) */
const AGUARDE = 'Baixando versão atualizada do programa e verificando login de acesso.';

const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const BT_PRINCIPAL = '<a href="' + PRINCIPAL + '">Página principal</a>';
const BT_SAIR = '<button type="button" data-sair>Sair</button>';
let fb = null;

function tela(titulo, texto, botoes){
  const q = document.getElementById('tc-trava');
  q.innerHTML = '<div class="cx"><h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + texto + '</p>' : '') +
    (botoes ? '<div class="bts">' + botoes + '</div>' : '') + '</div>';
  const s = q.querySelector('[data-sair]'); if(s) s.onclick = () => fb ? fb.auth.signOut(fb.a).then(() => location.href = PRINCIPAL) : (location.href = PRINCIPAL);
  const r = q.querySelector('[data-recarregar]'); if(r) r.onclick = () => location.reload();
}
function aguarde(){
  document.getElementById('tc-trava').innerHTML = '<div class="cx"><p class="tc-msg">' + esc(AGUARDE) + '</p></div>';
}
function erro(det){
  tela('Não foi possível abrir o programa', 'Verifique a internet e tente de novo.<br><small>' + esc(det) + '</small>',
    '<button type="button" data-recarregar>Tentar de novo</button>' + BT_PRINCIPAL);
}
const prazo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('o servidor não respondeu a tempo')), ms))]);
const paraData = v => { if(!v) return null; if(typeof v.toDate === 'function') return v.toDate(); const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

/* ---- cópia local (IndexedDB): só é usada depois que o servidor confirma o acesso ---- */
function abrirCache(){
  return new Promise(res => {
    try{
      const r = indexedDB.open(CACHE_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(CACHE_ST);
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    }catch(e){ res(null); }
  });
}
async function lerCache(versao){
  const db = await abrirCache(); if(!db) return null;
  return new Promise(res => {
    try{
      const g = db.transaction(CACHE_ST).objectStore(CACHE_ST).get(PROG);
      g.onsuccess = () => res(g.result && g.result.versao === versao ? g.result.gz : null);
      g.onerror = () => res(null);
    }catch(e){ res(null); }
  });
}
async function gravarCache(versao, gz){
  const db = await abrirCache(); if(!db) return;
  try{ db.transaction(CACHE_ST, 'readwrite').objectStore(CACHE_ST).put({versao, gz}, PROG); }catch(e){}
}
async function descompactar(gz){
  const s = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(s).text();
}

/* ---- prepara o programa antes de abrir ----
   1. Tira a "Atualização automática" (tc_versao) dos programas: o endereço agora
      serve a tela de entrada, que muda a cada publicação, e ela recarregava a página
      e repetia toda a abertura. Quem traz a versão nova é este carregador.
   2. Põe um véu com o mesmo texto da tela de entrada por cima das telas de login
      do próprio programa, até ele decidir o que mostrar (programa, escolha do
      ambiente ou um aviso com botão). Assim só aparece uma tela ao abrir. */
const VEU_CSS = 'html.tc-veu body{overflow:hidden!important}' +
  'html.tc-veu::after{content:"' + AGUARDE + '";position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;' +
  'box-sizing:border-box;width:min(440px,calc(100vw - 32px));padding:24px;background:#fff;border:1px solid #e3ded3;border-radius:14px;' +
  'box-shadow:0 6px 24px rgba(0,0,0,.06),0 0 0 200vmax #F6F4EF;color:#1a2130;font:600 16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
  'text-align:center;letter-spacing:0;text-transform:none;white-space:normal}';
/* enquanto a função devolve true, a tela do programa ainda é a conferência do login dele */
const ESPERA = {
  pavimento:    'var a=document.getElementById("aviso-inicial");return vis(a)?/iniciando/.test(a.className):!(vis("#login")||vis("#splash"));',
  intertravado: 'return !vis("#login")&&!vis("#app-content");',
  orcamento:    'return vis("#authOverlay")&&(vis("#ocEsperaInicial")||vis("#ocCarregando"));'
};
const ESPERA_TRAVA = 'return R.classList.contains("tc-trava")&&!document.querySelector("#tc-trava a,#tc-trava button");';
function veu(){
  return '<style id="tc-veu-css">' + VEU_CSS + '</style><script>(function(){' +
    'var R=document.documentElement;R.classList.add("tc-veu");' +
    'function vis(e){if(typeof e==="string")e=document.querySelector(e);return !!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=="hidden";}' +
    'function esperando(){' + (ESPERA[PROG] || ESPERA_TRAVA) + '}' +
    'var t0=Date.now(),ok=0;' +
    'function tirar(){R.classList.remove("tc-veu");var c=document.getElementById("tc-veu-css");if(c)c.remove();}' +
    'function ver(){var e=true;try{e=esperando();}catch(_){e=false;}ok=e?0:ok+1;if(ok>=2||Date.now()-t0>30000)tirar();else setTimeout(ver,120);}' +
    'function comecar(){setTimeout(ver,120);}' +
    'document.readyState==="loading"?document.addEventListener("DOMContentLoaded",comecar):comecar();' +
    '})();</' + 'script>';
}
function semAutoAtualizacao(html){
  let i;
  while((i = html.indexOf('tc_versao:')) >= 0){
    const a = html.lastIndexOf('<script', i), b = html.indexOf('</script>', i);
    if(a < 0 || b < 0) break;
    html = html.slice(0, a) + html.slice(b + 9);
  }
  return html;
}
function prepararPrograma(html){
  html = semAutoAtualizacao(html);
  const m = /<head[^>]*>/i.exec(html);
  return m ? html.slice(0, m.index + m[0].length) + veu() + html.slice(m.index + m[0].length) : veu() + html;
}

/* ---- sem acesso: explica o motivo (mesmos textos da página principal) ---- */
async function semAcesso(fs, d, u, ehAdmin){
  const ref = fs.doc(d, 'usuarios', u.uid);
  const snap = await prazo(fs.getDoc(ref), 20000);
  const p = snap.exists() ? (snap.data() || {}) : null;
  const venc = p && paraData(p.validade);
  const vencida = !!(venc && venc.getTime() < Date.now());
  if(!p){ tela('Cadastro não encontrado', 'Termine seu cadastro e contrate ' + esc(NOME) + ' na página principal.', BT_PRINCIPAL + BT_SAIR); return; }
  if(p.recusado === true && !ehAdmin){ tela('Acesso recusado', 'Seu acesso foi recusado pelo administrador. Entre em contato para mais informações.', BT_PRINCIPAL + BT_SAIR); return; }
  if(p[CAMPO] === true && vencida){ tela('Acesso vencido', 'Seu acesso a ' + esc(NOME) + ' venceu em ' + venc.toLocaleDateString('pt-BR') + '. Renove o pacote na página principal.', BT_PRINCIPAL + BT_SAIR); return; }
  if(p[CAMPO] === true || ehAdmin){ erro('o servidor recusou a entrega do programa (regras do Firestore desatualizadas?)'); return; }
  if(PEDIDO && p[PEDIDO] !== true){ const o = {}; o[PEDIDO] = true; fs.updateDoc(ref, o).catch(e => console.warn('Pedido não registrado:', e)); }
  tela('Acesso ainda não liberado', 'Seu acesso a ' + esc(NOME) + ' ainda não foi liberado pelo administrador. Contrate ou acompanhe o pedido na página principal.', BT_PRINCIPAL + BT_SAIR);
}

async function entregar(fs, d){
  const meta = await prazo(fs.getDoc(fs.doc(d, 'programas', PROG)), 20000);
  if(!meta.exists()) throw new Error('programa ainda não publicado no servidor');
  const {versao, partes} = meta.data();
  let gz = await lerCache(versao);
  if(!gz){
    aguarde();
    const pedacos = await prazo(Promise.all(Array.from({length: partes}, (_, i) =>
      fs.getDoc(fs.doc(d, 'programas', PROG, 'partes', String(i))).then(s => s.data().d.toUint8Array()))), 120000);
    const total = pedacos.reduce((n, b) => n + b.length, 0);
    gz = new Uint8Array(total); let o = 0; for(const b of pedacos){ gz.set(b, o); o += b.length; }
    gravarCache(versao, gz);
  }
  return await descompactar(gz);
}

(async function(){
  const cfg = window.FIREBASE_CONFIG;
  if(!cfg || !cfg.apiKey){ erro('configuração de acesso ausente'); return; }
  let app, deleteApp, cancelar = () => {};
  try{
    const [A, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
    deleteApp = A.deleteApp;
    app = A.initializeApp(cfg);
    const a = auth.getAuth(app);
    let d; try{ d = fs.initializeFirestore(app, {experimentalAutoDetectLongPolling: true}); }catch(_){ d = fs.getFirestore(app); }
    await auth.setPersistence(a, auth.browserLocalPersistence).catch(() => {});
    fb = {a, auth};
    const u = await new Promise(res => { cancelar = auth.onAuthStateChanged(a, res); });
    cancelar();
    if(!u){ location.replace(PRINCIPAL + '?entrar=1&voltar=' + encodeURIComponent(VOLTAR)); return; }
    const ehAdmin = (window.ADMINS || []).map(x => String(x).toLowerCase()).indexOf(String(u.email || '').toLowerCase()) >= 0;
    let html;
    try{ html = await entregar(fs, d); }
    catch(e){
      if(/permission/i.test((e && e.code) || '') || /permission/i.test((e && e.message) || '')){ await semAcesso(fs, d, u, ehAdmin); return; }
      throw e;
    }
    /* libera o Firebase para o programa iniciar o dele, com a mesma sessão */
    fb = null;
    await deleteApp(app).catch(() => {});
    html = prepararPrograma(html);
    document.open(); document.write(html); document.close();
  }catch(e){ console.error('Carregador:', e); erro((e && e.message) || String(e)); }
})();
