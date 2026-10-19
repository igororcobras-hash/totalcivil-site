/* ============================================================
   PUBLICAÇÃO PROTEGIDA — Total Civil
   Usado pelo workflow .github/workflows/publicar-site.yml.

   node scripts/publicar/montar-site.js <pasta-saida> [--enviar]

   1. Para cada programa, compacta <programa>/index.html (gzip) e calcula a versão.
   2. --enviar: grava no Firestore (programas/<programa> + partes/<n>), com a conta
      de serviço em FIREBASE_SERVICE_ACCOUNT. Só grava se a versão mudou.
   3. Monta o site público em <pasta-saida>: tudo do repositório, menos os
      programas, que viram a tela de entrada (carregador.js). Assim o código dos
      programas não fica em nenhum endereço público.
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');

/* chave = pasta = documento no Firestore; campo = permissão no cadastro (igual ao PROGRAMAS da página principal e às regras) */
const PROGRAMAS = [
  {prog: 'pavimento',    campo: 'ativo',             pedido: '',                       nome: 'Pavimento Flexível'},
  {prog: 'orcamento',    campo: 'orcamentoAtivo',    pedido: 'orcamentoSolicitado',    nome: 'Orçamento de Obras'},
  {prog: 'intertravado', campo: 'intertravadoAtivo', pedido: 'intertravadoSolicitado', nome: 'Pavimento Intertravado'},
  {prog: 'drenagem',     campo: 'drenagemAtivo',     pedido: 'drenagemSolicitado',     nome: 'Drenagem Pluvial'},
  {prog: 'concreto',     campo: 'estruturaAtivo',    pedido: '',                       nome: 'Estrutura em Concreto Armado'},
  {prog: 'visitas',      campo: 'visitasAtivo',      pedido: 'visitasSolicitado',      nome: 'Visitas Técnicas'}
];
const PARTE = 900 * 1024;               // limite do Firestore: 1 MiB por documento
const FORA_DO_SITE = new Set(['.git', '.github', 'scripts', 'node_modules', 'firestore.rules', 'README.md', '_site']);

const RAIZ = path.resolve(__dirname, '..', '..');
const saida = path.resolve(process.argv[2] || '_site');
const enviar = process.argv.includes('--enviar');

const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function telaEntrada(p, versao){
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<!-- versão ${versao} -->
<title>${esc(p.nome)} · Total Civil</title>
<style>
body{margin:0;background:#F6F4EF;color:#1a2130;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
#tc-trava{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:16px}
#tc-trava .cx{max-width:440px;width:100%;background:#fff;border:1px solid #e3ded3;border-radius:14px;padding:24px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.06)}
#tc-trava h2{margin:0 0 8px;font-size:19px}#tc-trava p{margin:0 0 16px;color:#4a5568}
#tc-trava p.tc-msg{margin:0;color:#1a2130;font-weight:600;font-size:16px}
#tc-trava .bts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
#tc-trava a,#tc-trava button{font:inherit;font-weight:600;border-radius:9px;padding:9px 16px;cursor:pointer;text-decoration:none;border:1px solid #b8410e}
#tc-trava a{background:#b8410e;color:#fff}#tc-trava button{background:#fff;color:#b8410e}
</style>
</head>
<body>
<div id="tc-trava"><div class="cx"><p class="tc-msg">Baixando versão atualizada do programa e verificando login de acesso.</p></div></div>
<noscript><p style="text-align:center">Ative o JavaScript para usar o programa.</p></noscript>
<script src="/firebase-config.js"></script>
<script type="module" src="/carregador.js" data-prog="${p.prog}" data-campo="${p.campo}" data-pedido="${p.pedido}" data-nome="${esc(p.nome)}"></script>
</body>
</html>
`;
}

function copiar(de, para){
  fs.mkdirSync(para, {recursive: true});
  for(const nome of fs.readdirSync(de)){
    if(de === RAIZ && FORA_DO_SITE.has(nome)) continue;
    const a = path.join(de, nome), b = path.join(para, nome);
    if(fs.statSync(a).isDirectory()) copiar(a, b); else fs.copyFileSync(a, b);
  }
}

async function enviarFirestore(pacotes){
  const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!conta) throw new Error('Falta o segredo FIREBASE_SERVICE_ACCOUNT (Settings › Secrets and variables › Actions).');
  const admin = require('firebase-admin');
  admin.initializeApp({credential: admin.credential.cert(JSON.parse(conta))});
  const db = admin.firestore();
  for(const k of pacotes){
    const ref = db.collection('programas').doc(k.prog);
    const atual = await ref.get();
    if(atual.exists && atual.data().versao === k.versao){ console.log(`${k.prog}: versão ${k.versao} já está no servidor.`); continue; }
    const partes = [];
    for(let i = 0; i * PARTE < k.gz.length; i++) partes.push(k.gz.subarray(i * PARTE, (i + 1) * PARTE));
    for(let i = 0; i < partes.length; i++) await ref.collection('partes').doc(String(i)).set({d: Buffer.from(partes[i])});
    /* o documento principal por último: ninguém lê uma versão pela metade */
    await ref.set({versao: k.versao, partes: partes.length, bytes: k.gz.length, atualizadoEm: admin.firestore.FieldValue.serverTimestamp()});
    const velhas = await ref.collection('partes').get();
    for(const doc of velhas.docs) if(Number(doc.id) >= partes.length) await doc.ref.delete();
    console.log(`${k.prog}: versão ${k.versao} enviada (${partes.length} parte(s), ${(k.gz.length / 1048576).toFixed(2)} MB).`);
  }
}

(async () => {
  const pacotes = PROGRAMAS.map(p => {
    const html = fs.readFileSync(path.join(RAIZ, p.prog, 'index.html'));
    return Object.assign({}, p, {gz: zlib.gzipSync(html, {level: 9}), versao: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16)});
  });
  if(enviar) await enviarFirestore(pacotes);
  fs.rmSync(saida, {recursive: true, force: true});
  copiar(RAIZ, saida);
  for(const k of pacotes) fs.writeFileSync(path.join(saida, k.prog, 'index.html'), telaEntrada(k, k.versao));
  /* conferência: nenhum programa pode sair no site público */
  for(const k of pacotes){
    const pub = fs.readFileSync(path.join(saida, k.prog, 'index.html'), 'utf8');
    if(!pub.includes('/carregador.js') || pub.length > 5000) throw new Error(`${k.prog}/index.html do site não é a tela de entrada.`);
  }
  console.log('Site público montado em', saida);
})().catch(e => { console.error(e.message || e); process.exit(1); });
