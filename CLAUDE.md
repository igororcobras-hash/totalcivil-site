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
- Bancos de preços: SINAPI RJ e SCO-Rio vêm de `orcamento/dados/` (índice em `indice.json`; um arquivo `AAAA-MM.json.gz` por mês, gerado pela rotina `scripts/bancos`).
- **EMOP é licenciada (o cliente tem a assinatura): NÃO publicar os dados da EMOP no site.** O cliente importa os DBF mensais (DIPR, MAT, REUT, COMP) no programa de Orçamento ("Atualizar EMOP"), que guarda no navegador (IndexedDB `SchuelerHistoricoDB_v1`, mesmo domínio). A Drenagem lê dali (`lerEmopLocal`/`emopComoBanco`): aba 12 (Custos), comparativo e orçamento de licitação. Sem EMOP no aparelho, os itens EMOP saem com o código e sem preço. O caminho "EMOP no site" (`orcamento/dados/emop/` + entrada `emop` no índice) existe no código, mas só pode ser usado se o dono liberar a publicação.
- Meio-fio com sarjeta: `MEIOFIO` define os modelos; o seletor único (todas as ruas) aparece em Topografia, aba 6, Perfil, Planta e Seção (`mfTodas`). A aba 3 permite um modelo por rua.
- Esquinas: `cruzamentos(G)` calcula o raio do meio-fio (`cantos`) e o raio dos muros/alinhamento dos lotes (`muros`), com o MESMO raio. Usado na planta, no DXF e no 3D.
- 3D (aba 11): ruas desenhadas pela mesma geometria da planta (`T3ruas`), caixas, ramais caixa → PV, lâmina na sarjeta e cotas. Chuva em mm/h pelo botão vertical de arrastar (recalcula a rede em tempo real, sem mexer na câmera). Nível da água sobe e desce suavemente. Mouse como no AutoCAD: esquerdo gira, meio/direito move, roda aproxima no cursor, duplo clique do meio enquadra. Botões dentro do desenho: água em movimento/parada, girar/mover, cotas, enquadrar.

## Regras do mapa do site (MAPA-SITE-TOTALCIVIL.md, do dono — pedir o arquivo se não estiver na sessão)
- Nunca perder funções que já funcionam. Toda mudança parte da versão que está NO AR (arquivo atual no GitHub), nunca de cópia antiga.
- Cada programa é um único `index.html` legível, sem build. Mudanças novas entram preferencialmente como blocos PATCH no fim do arquivo (substituem funções pelo nome global).
- O site é protegido: a rotina "Publicar site protegido" roda a cada merge na `main`, envia cada `<programa>/index.html` ao Firestore e serve só a tela de entrada (`carregador.js`). Login único Firebase; a Drenagem usa o campo `drenagemAtivo` via `acesso-programa.js`. Não mexer em `firestore.rules`, `carregador.js`, `acesso-programa.js` nem na lista `PROGRAMAS` sem pedido explícito.
- Fontes técnicas não se misturam (Pavimento Flexível = DNIT; Intertravado = IP-06/2004 da PMSP).
- Depois de publicar, o dono atualiza o mapa; ofereça o texto da atualização.

## Publicação
- Branch `main` do repositório `igororcobras-hash/totalcivil-site`; cada alteração na `main` dispara a rotina que publica o site (alguns minutos). Depois de subir: Ctrl+Shift+R. O fluxo ideal do mapa é PR → testes → confirmação → merge; o dono tem subido arquivos direto pelo site do GitHub quando o push da sessão falha.
