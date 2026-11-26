// Monta o "pacote da equipe" para a IA do site (modo grátis no navegador e Worker+Gemini):
//  - equipe: coordenação (de .claude/skills/equipe-engenharia), contratos de dados e biblioteca de fontes
//  - ag[nome]: especialista inteiro (.claude/agents/<nome>.md), sem o que só vale no Claude Code
//  - ap[nome]: versão de apoio (fórmulas, critérios, exemplos, referências) para consultar outras áreas
// Gera /assistente-especialistas.js (window.TC_ESPEC). Roda sozinho na publicação (montar-site.js).
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const ler = f => { try { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch (e) { return ''; } };
const semFront = t => t.replace(/^---[\s\S]*?---\s*/, '');
const secoes = t => semFront(t).split(/\n(?=## )/);
const nomeSec = s => s.replace(/^#+ /, '');
const TIRA_AG = /^(Programas e arquivos|Regras de trabalho|Conversa com os outros)/;
const TIRA_AP = /^(Programas e arquivos|Regras de trabalho|Conversa com os outros|Índice de formação|Pontos a investigar|Recebe e entrega|Entrega para|Como marcar|Conhecimentos aprofundados)/;
const junta = (t, tira) => secoes(t).filter(s => !tira.test(nomeSec(s))).join('\n').replace(/\n{3,}/g, '\n\n').trim();
function descricao(t) { const m = t.match(/^description:\s*"?(.+?)"?\s*$/m); return m ? m[1] : ''; }

function equipe() {
  const skill = semFront(ler('.claude/skills/equipe-engenharia/SKILL.md')).trim();
  return [
    'EQUIPE DE ENGENHARIA DO TOTAL CIVIL — como trabalhar aqui no site',
    'Você responde como a equipe toda. O ESPECIALISTA PRINCIPAL é o do programa aberto; os outros estão abaixo como APOIO.',
    '- Quando a pergunta tocar outra área (ex.: CBR do subleito no pavimento, chuva/IDF na drenagem, carga numa estrutura, custo no orçamento), use o material do especialista daquela área e diga de qual área veio a informação.',
    '- Ordem quando uma área depende da outra: topografia → solos/CBR → drenagem e esgoto → pavimentos → estrutura → orçamento.',
    '- Dado de outra área que não está no material nem no CONTEXTO: não invente; diga qual dado falta, de qual área, e onde conseguir.',
    '- Se dois materiais divergirem, mostre os dois valores, as fontes e o impacto; a decisão é do engenheiro responsável.',
    '- No fim de respostas técnicas, separe em uma linha o que é conferido na fonte [FONTE] e o que ainda está [CONFERIR]/🟡.',
    '- Marcas do material: [FONTE] = conferido no documento oficial; [PROGRAMA] = é o que o programa usa (não prova que está certo); [CONFERIR] ou 🟡 = conhecimento usual, ainda não conferido.',
    '', '### Coordenação usada pela equipe (referência)', skill,
    '', semFront(ler('engenharia/contratos.md')).trim(),
    '', semFront(ler('engenharia/biblioteca.md')).trim()
  ].join('\n');
}
function pacote() {
  const dir = path.join(RAIZ, '.claude', 'agents'), E = { equipe: equipe(), ag: {}, ap: {} };
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.md')) {
    const k = f.replace(/\.md$/, ''), t = fs.readFileSync(path.join(dir, f), 'utf8');
    E.ag[k] = '## ' + k + ' — ' + descricao(t) + '\n' + junta(t, TIRA_AG);
    E.ap[k] = '## ' + k + ' — ' + descricao(t) + '\n' + junta(t, TIRA_AP);
  }
  return E;
}
function montar(saida) {
  const E = pacote();
  fs.writeFileSync(saida || path.join(RAIZ, 'assistente-especialistas.js'),
    '/* Gerado por scripts/assistente/montar-especialistas.js a partir de .claude/agents/, .claude/skills/equipe-engenharia e engenharia/. Não editar à mão. */\nwindow.TC_ESPEC=' + JSON.stringify(E) + ';\n');
  return E;
}
module.exports = montar; module.exports.pacote = pacote;
if (require.main === module) { const E = montar(process.argv[2]); console.log('equipe', E.equipe.length); for (const k in E.ag) console.log(k, 'inteiro', E.ag[k].length, 'apoio', E.ap[k].length); }
