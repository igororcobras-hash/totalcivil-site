# Esgoto Sanitário — Total Civil

Código-fonte do programa publicado em https://totalcivil.com.br/esgoto/ (arquivo `esgoto/index.html` do repositório `igororcobras-hash/totalcivil-site`).

- `00-head.html` … `70-eventos.js`: blocos do programa. `./build.sh caminho/esgoto/index.html` junta tudo num arquivo só (apenas concatena).
- `10-core.js`: motor de cálculo puro (NBR 9649 / NBR 14486). Testes: `node t-core.js` e `node t-fuzz.js`.
- `testes-navegador/`: roteiros Playwright (Chrome + three 0.128 e xlsx locais).
- `ESGOTO-SANITARIO-RACIOCINIO-TECNICO.md`: raciocínio de engenharia, programação e webdesign.

Fluxo: mexer nos blocos aqui → `./build.sh` → testar → copiar o `index.html` para `esgoto/index.html` do site → registrar o PATCH ES-xx no `CLAUDE.md` do site.
