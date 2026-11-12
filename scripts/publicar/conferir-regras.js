/* Confere o firestore.rules ANTES de publicar (a rotina "Publicar regras do Firestore" roda isto primeiro).
   Se faltar algo, a publicação é BLOQUEADA e a lista do que falta aparece no registro da rotina.
   Criado em 12/11/2026, depois que publicar um firestore.rules sem os blocos do Intertravado tirou o
   acesso do Intertravado à nuvem. Uso local:  node scripts/publicar/conferir-regras.js [arquivo.rules]
   Confere:
   1. cada programa de scripts/publicar/montar-site.js está em campoDoPrograma() das regras;
   2. cada campo Ativo/Solicitado dos programas está na lista de campos do cadastro (usuarios);
   3. toda coleção do Firestore usada no código dos programas (collection/doc) tem um bloco "match" nas regras;
   4. o arquivo tem rules_version, "service cloud.firestore", chaves balanceadas e o bloqueio final de todo o resto. */
'use strict';
const fs = require('fs'), path = require('path');
const raiz = path.resolve(__dirname, '..', '..');
const arq = process.argv[2] || path.join(raiz, 'firestore.rules');
const regras = fs.readFileSync(arq, 'utf8');
const semComentario = regras.replace(/\/\/.*$/gm, '');
const faltas = [];

// 1 e 2: programas
const montar = fs.readFileSync(path.join(raiz, 'scripts/publicar/montar-site.js'), 'utf8');
const bloco = montar.slice(montar.indexOf('const PROGRAMAS'), montar.indexOf('];', montar.indexOf('const PROGRAMAS')));
const progs = [...bloco.matchAll(/prog:\s*'([^']+)'[^}]*?campo:\s*'([^']+)'[^}]*?pedido:\s*'([^']*)'/g)].map(m => ({ prog: m[1], campo: m[2], pedido: m[3] }));
if (!progs.length) faltas.push('Não consegui ler a lista PROGRAMAS de scripts/publicar/montar-site.js.');
const cdp = semComentario.slice(semComentario.indexOf('function campoDoPrograma'), semComentario.indexOf('function podeUsar'));
progs.forEach(p => {
  if (!new RegExp("'" + p.prog + "'\\s*:\\s*'" + p.campo + "'").test(cdp)) faltas.push(`campoDoPrograma() não tem  '${p.prog}': '${p.campo}'  (o carregador não entrega o programa "${p.prog}").`);
  if (p.campo !== 'ativo' && !new RegExp("'" + p.campo + "'").test(semComentario)) faltas.push(`O campo de liberação '${p.campo}' não aparece nas regras do cadastro (usuarios).`);
  if (p.pedido && !new RegExp("'" + p.pedido + "'").test(semComentario)) faltas.push(`O campo de pedido '${p.pedido}' não aparece nas regras do cadastro (usuarios).`);
});

// 3: coleções usadas no código
const arquivos = [];
(function varre(d) { fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  if (['.git', '.github', 'node_modules', '_site', 'scripts', 'videos'].includes(e.name)) return;
  const p = path.join(d, e.name);
  if (e.isDirectory()) varre(p); else if (/\.(html|js)$/.test(e.name)) arquivos.push(p);
}); })(raiz);
const colecoes = new Map();
const nova = (nome, onde) => { if (!colecoes.has(nome)) colecoes.set(nome, onde); };
arquivos.forEach(f => {
  const t = fs.readFileSync(f, 'utf8'), rel = path.relative(raiz, f);
  for (const m of t.matchAll(/\b(?:collection|doc|collectionGroup)\(\s*[^,()]{1,40},\s*['"`]([A-Za-z][A-Za-z0-9_]*)['"`]/g)) nova(m[1], rel);
  for (const m of t.matchAll(/\b(?:NUV_COL|COLECAO|COLLECTION)\s*=\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g)) nova(m[1], rel);
  // nomes de coleção guardados em variável/objeto e depois usados em collection(d, VAR): só entram se aparecerem como 'texto' no mesmo arquivo que usa o Firestore
  if (/getDocs|setDoc|addDoc|getDoc|deleteDoc|updateDoc|onSnapshot|fs\.collection|fs\.doc/.test(t))
    for (const m of t.matchAll(/['"`](projetos[A-Z][A-Za-z0-9]*|obras[A-Z][A-Za-z0-9]*|diretorio[A-Z][A-Za-z0-9]*|fotosServicos)['"`]/g)) nova(m[1], rel);
});
const comMatch = new Set([...semComentario.matchAll(/match\s+\/([A-Za-z][A-Za-z0-9_]*)\/\{/g)].map(m => m[1]));
['databases'].forEach(x => comMatch.add(x));
[...colecoes.entries()].sort().forEach(([nome, onde]) => { if (!comMatch.has(nome)) faltas.push(`A coleção "${nome}" (usada em ${onde}) não tem bloco "match /${nome}/{...}" nas regras: ficaria sem permissão.`); });

// 4: estrutura
if (!/rules_version\s*=/.test(semComentario)) faltas.push('Falta a linha rules_version.');
if (!/service\s+cloud\.firestore/.test(semComentario)) faltas.push('Falta "service cloud.firestore".');
if ((semComentario.match(/\{/g) || []).length !== (semComentario.match(/\}/g) || []).length) faltas.push('Chaves { } desbalanceadas.');
if (!/match\s+\/\{documento=\*\*\}[\s\S]{0,80}allow read, write:\s*if false/.test(semComentario)) faltas.push('Falta o bloqueio final: match /{documento=**} { allow read, write: if false; }');
if (/^\s*name:\s*Publicar/m.test(regras) || /^\s*workflow_dispatch:/m.test(regras)) faltas.push('Este arquivo parece ser o de uma ROTINA do GitHub (publicar-regras.yml), não as regras do Firestore.');

console.log(`Conferência das regras (${path.relative(raiz, arq)}): ${progs.length} programas, ${colecoes.size} coleções usadas no código, ${comMatch.size - 1} blocos nas regras.`);
if (faltas.length) { console.error('\nBLOQUEADO — o que falta:\n - ' + faltas.join('\n - ') + '\n\nCorrija o firestore.rules e rode de novo. Nada foi publicado.'); process.exit(1); }
console.log('OK: todos os programas e coleções estão cobertos pelas regras.');
