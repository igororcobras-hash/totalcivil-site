# Total Civil — notas para quem for mexer neste repositório

Responda sempre em português do Brasil. O dono do projeto é engenheiro civil, não programador: explique o que mudou e o que ele precisa fazer, com links e nomes de arquivo exatos.

## Como o usuário trabalha
- Uma mensagem nova COMPLEMENTA a anterior. Nunca descarte um pedido anterior porque chegou outro: termine os dois.
- Antes de afirmar que consegue publicar (push), TESTE o push. Já houve sessões em que o push falhou com erro 403 (login do Claude no GitHub recusado). Se falhar, não insista: entregue o arquivo pronto e o passo a passo para o usuário subir pelo site do GitHub (Add file → Upload files, no caminho certo, com o nome exato do arquivo).
- Sempre envie os arquivos alterados ao usuário (SendUserFile) e diga em quais caminhos do repositório cada um vai.
- Teste de verdade antes de dizer que está pronto (Playwright com three.js local; a CDN fica bloqueada no ambiente de teste). Diga o que NÃO conseguiu testar.

## Programa de Drenagem Pluvial (`drenagem/index.html`, arquivo único)
- Abas: 1 Projeto, 2 Chuva, 3 Ruas e greide, 4 Bacias, 5 **Caixas de Ralo e Boca de Lobo** (nome oficial; não usar "Sarjetas e bocas-de-lobo"), 6 Poços de visita e topografia, 7 Rede tronco, 8 Planta baixa, 9 Perfil e piezométrica, 10 Seção transversal, 11 Visualização 3D, 12 Custos, 13 Verificação, 14 Memorial.
- "Orçamento" do usuário = o orçamento DENTRO da drenagem: aba 12 (Custos) e o botão de orçamento de licitação com as 3 soluções. NÃO é o programa `/orcamento`.
- Bancos de preços: SINAPI RJ, SCO-Rio e EMOP-RJ, lidos de `orcamento/dados/` (índice em `orcamento/dados/indice.json`; arquivos `sinapi/`, `sco/`, `emop/` por mês, `AAAA-MM.json.gz`). EMOP vem de arquivos DBF mensais (DIPR, COMP, MAT, REUT) convertidos para `emop/AAAA-MM.json.gz` (campos `dipr`, `compMap`). Mês novo: converter, gravar o arquivo e acrescentar a entrada `emop` no `indice.json`.
- Meio-fio com sarjeta: `MEIOFIO` define os modelos; o seletor único (todas as ruas) aparece em Topografia, aba 6, Perfil, Planta e Seção (`mfTodas`). A aba 3 permite um modelo por rua.
- Esquinas: `cruzamentos(G)` calcula o raio do meio-fio (`cantos`) e o raio dos muros/alinhamento dos lotes (`muros`), com o MESMO raio. Usado na planta, no DXF e no 3D.
- 3D (aba 11): ruas desenhadas pela mesma geometria da planta (`T3ruas`), caixas, ramais caixa → PV, lâmina na sarjeta e cotas. Chuva em mm/h pelo botão vertical de arrastar (recalcula a rede em tempo real, sem mexer na câmera). Nível da água sobe e desce suavemente. Mouse como no AutoCAD: esquerdo gira, meio/direito move, roda aproxima no cursor, duplo clique do meio enquadra. Botões dentro do desenho: água em movimento/parada, girar/mover, cotas, enquadrar.

## Publicação
- Branch `main` do repositório `igororcobras-hash/totalcivil-site`; o site publica pelo GitHub Pages (1 a 3 minutos). Depois de subir: Ctrl+Shift+R.
