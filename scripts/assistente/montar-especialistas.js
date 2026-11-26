// Gera /assistente-especialistas.js (texto resumido de cada especialista de .claude/agents/)
// para o assistente gratuito que roda no navegador. Roda sozinho na publicação (montar-site.js).
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..', '..'), dir = path.join(RAIZ, '.claude', 'agents');
const TIRA = /^(Programas e arquivos|Pontos a investigar|Recebe e entrega|Entrega para|Índice de formação|Como marcar|Regras de trabalho|Conversa com os outros)/;
function limpa(t) {
  t = t.replace(/^---[\s\S]*?---\s*/, '');
  const partes = t.split(/\n(?=## )/);
  return partes.filter(p => !TIRA.test(p.replace(/^## /, ''))).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function montar(saida) {
  const o = {};
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.md')) o[f.replace(/\.md$/, '')] = limpa(fs.readFileSync(path.join(dir, f), 'utf8'));
  const txt = '/* Gerado por scripts/assistente/montar-especialistas.js a partir de .claude/agents/. Não editar à mão. */\nwindow.TC_ESPEC=' + JSON.stringify(o) + ';\n';
  fs.writeFileSync(saida || path.join(RAIZ, 'assistente-especialistas.js'), txt);
  return Object.keys(o).map(k => k + ' ' + o[k].length);
}
module.exports = montar;
if (require.main === module) console.log(montar(process.argv[2]).join('\n'));
