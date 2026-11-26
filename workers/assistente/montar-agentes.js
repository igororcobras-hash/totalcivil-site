// Junta os textos dos especialistas (.claude/agents/*.md) em agentes.js para o Worker.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', '.claude', 'agents'), o = {};
for (const f of fs.readdirSync(dir)) if (f.endsWith('.md')) o[f.replace(/\.md$/, '')] = fs.readFileSync(path.join(dir, f), 'utf8');
fs.writeFileSync(path.join(__dirname, 'agentes.js'), 'export default ' + JSON.stringify(o) + ';\n');
console.log('especialistas:', Object.keys(o).join(', '));
