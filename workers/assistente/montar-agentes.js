// Junta o pacote da equipe (agentes, coordenação, contratos, biblioteca) em agentes.js para o Worker.
const fs = require('fs'), path = require('path');
const E = require('../../scripts/assistente/montar-especialistas.js').pacote();
fs.writeFileSync(path.join(__dirname, 'agentes.js'), 'export default ' + JSON.stringify(E) + ';\n');
console.log('equipe + especialistas:', Object.keys(E.ag).join(', '));
