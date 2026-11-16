# DWG — leitura e escrita (DWG-01, 16/11/2026)
- `tc-dwg.min.js` (raiz do site) = biblioteca `@node-projects/acad-ts` (MIT) empacotada, agora com **DwgReader** (ler) e **DwgWriter** (escrever).
  Para refazer: `npm i @node-projects/acad-ts esbuild` numa pasta de trabalho e
  `npx esbuild entry.mjs --bundle --minify --format=iife --global-name=TCDWG --platform=browser --outfile=tc-dwg.min.js` (entry.mjs desta pasta).
- `dwg-leitor.js` (raiz) = normaliza o desenho lido: camadas, pontos COM COTA (e de onde veio a cota, com nível de confiança), linhas, textos, blocos com atributos, estaqueamento.
- Testes (Node, precisam dos DWG de exemplo do dono): `t-leitor-valida.mjs`, `t-pacote.cjs` (lê um DWG real e faz ida e volta de escrita), `t-cotas-reais-pdf.js` (PDF: toda cota importada é de ponto real).
- Os DWG de exemplo NÃO ficam no repositório (grandes, com desenhos repetidos; só servem para estudo).
