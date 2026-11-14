# Esgoto Sanitário — Total Civil
## Raciocínio de engenharia, de programação e de webdesign

Programa: `esgoto/index.html` (arquivo único) · endereço previsto: https://totalcivil.com.br/esgoto/ · versão ES-01 · 13/11/2026

Este documento explica **por que** o programa calcula, se organiza e se apresenta do jeito que está. Serve para quem for conferir os cálculos, dar manutenção no código ou mudar a tela.

---

## 1. O que o programa entrega

| Entrada (o que o usuário informa) | Saída (o que o programa gera sozinho) |
|---|---|
| Eixo das ruas (desenhado no mapa ou colado do Excel), com o **nome digitado uma única vez** | PVs e terminais de limpeza, trechos, sentido do escoamento, numeração de coletores |
| Cotas do terreno (nos pontos da rua, ou pontos X; Y; cota da topografia) | Vazões inicial e final de cada trecho |
| População, consumo per capita, coeficientes (já vêm com os valores usuais) | Diâmetro, declividade, cotas do coletor e profundidades |
| Ponto de lançamento (opcional: sem ele, é o ponto mais baixo) | Verificação pela NBR 9649 (tensão trativa, lâmina, velocidade crítica, recobrimento, remanso) |
| | Planta (DXF/SVG), perfis longitudinais, seção da vala e do PV |
| | 3D com barra de quantidade de esgoto (10 % a 400 %) |
| | Quantitativos, orçamento com preços SINAPI do site, memorial (PDF/Word/Excel) |

---

## 2. Raciocínio do engenheiro de saneamento

### 2.1 Normas de referência

| Norma | Uso no programa |
|---|---|
| ABNT NBR 9649:1986 — Projeto de redes coletoras de esgoto sanitário | Critérios hidráulicos, vazão mínima, recobrimento, órgãos acessórios. Conferida como **vigente** no catálogo de normas em 13/11/2026. |
| ABNT NBR 14486:2000 — Redes coletoras com tubos de PVC | Opção "NBR 14486": n = 0,010 e tensão trativa mínima 0,6 Pa. |
| ABNT NBR 9648:1986 — Estudo de concepção | Parâmetros de população e contribuição. |
| NR-18 | Escoramento em valas com mais de 1,25 m (entra no orçamento). |

Sistema considerado: **separador absoluto**, escoamento em **lâmina livre**, regime permanente e uniforme por trecho.

### 2.2 Vazões

```
Q média    = C · P · q / 86 400                       (L/s)
Q inicial  = K2 · C · Pi · qi / 86 400                (hora de maior consumo do início de plano)
Q final    = K1 · K2 · C · Pf · qf / 86 400           (dia e hora de maior consumo do fim de plano)
Taxa linear = Q / L contribuinte  +  T infiltração    (L/s·m)
Q do trecho = Q de montante + taxa × L × fator de lados + contribuições concentradas no PV
```

- Valores de partida: C = 0,80; K1 = 1,2; K2 = 1,5; infiltração 0,10 L/s·km (a norma admite de 0,05 a 1,0, e o programa alerta fora disso).
- **K1 não entra na vazão inicial**: a NBR 9649 define a vazão inicial só com K2, porque ela serve para verificar a autolimpeza no começo da operação.
- **Fator de lados**: lotes dos dois lados = 100 % da extensão; de um lado = 50 %; trecho só de transporte = 0 %. A infiltração incide sempre sobre a extensão real.
- **Vazão mínima de 1,5 L/s** em qualquer trecho (descarga de uma bacia sanitária), usada no cálculo hidráulico mesmo quando a soma é menor. A planilha mostra a vazão real somada, para a conferência da conservação de massa.
- Modo alternativo: taxa linear informada (L/s·km), comum quando a concessionária fixa o valor.

### 2.3 Hidráulica da seção circular parcialmente cheia

```
θ  = 2 · arccos(1 − 2·y/D)                 ângulo central
A  = D²/8 · (θ − sen θ)                    área molhada
Rh = D/4 · (1 − sen θ / θ)                 raio hidráulico
Q  = (1/n) · A · Rh^(2/3) · I^(1/2)        Manning
σ  = γ · Rh · I                            tensão trativa (γ = 9 806,65 N/m³)
Vc = 6 · √(g · Rh)                         velocidade crítica
```

A lâmina é achada por bisseção em y/D (a vazão cresce de forma monótona até y/D = 0,938). Não usei tabelas nem fórmulas aproximadas: o cálculo é direto pela geometria, o que permite qualquer n, qualquer tensão trativa e qualquer diâmetro.

### 2.4 Critérios verificados em cada trecho

| Critério | Limite padrão | Com qual vazão | Por quê |
|---|---|---|---|
| Tensão trativa | ≥ 1,0 Pa (0,6 Pa em PVC pela NBR 14486) | inicial | Arrastar areia e sólidos: autolimpeza |
| Lâmina y/D | ≤ 0,75 | final | Garantir ventilação do coletor |
| Lâmina se V > Vc | ≤ 0,50 | final | Escoamento aerado incorpora ar e "incha" |
| Velocidade | ≤ 5 m/s | final | Abrasão do tubo |
| Diâmetro mínimo | DN 150 (norma admite DN 100) | — | Prática das concessionárias |
| Recobrimento | ≥ 0,90 m na via (0,65 m no passeio) | — | Carga de tráfego e ligações prediais |
| Diâmetro para jusante | nunca diminui | — | Risco de obstrução |
| Nível d'água no PV | saída ≤ chegada | final | Controle de remanso |
| Distância entre PVs | ≤ 100 m (alerta) | — | Alcance dos equipamentos de limpeza |
| Profundidade | > 4,5 m gera alerta | — | Avaliar elevatória ou outro traçado |

Declividade mínima: em vez da fórmula aproximada da norma (I mín. = 0,0055 · Qi^−0,47), o programa **resolve a equação σ = σ mín.** para o diâmetro e o n escolhidos. A fórmula da norma é um ajuste para n = 0,013 e 1,0 Pa; resolver direto vale para PVC (n = 0,010; 0,6 Pa) e não erra em tubos maiores.

### 2.5 Como cada trecho é dimensionado (ordem de montante para jusante)

1. **Cota de saída do PV de montante** = a menor entre "recobrimento mínimo" e "a chegada mais baixa". O coletor nunca sobe dentro do PV.
2. Para cada diâmetro, do menor para o maior (a partir do mínimo e do maior diâmetro que chega):
   - calcula a declividade mínima (tensão trativa) e a máxima (5 m/s);
   - **solução de menor escavação**: cota de jusante no recobrimento mínimo; se a declividade resultante ficar abaixo da mínima, aprofunda a jusante;
   - **terreno muito inclinado**: se a declividade passar da máxima, o trecho é assentado na máxima e a diferença vira **degrau ou tubo de queda** no PV de montante;
   - verifica a lâmina com a vazão final; se não atender, passa ao diâmetro seguinte.
3. **Controle de remanso**: se o nível d'água de saída ficar acima do menor nível de chegada, a saída é rebaixada pela diferença e o trecho é recalculado (até convergir).
4. Cotas arredondadas **para baixo ao milímetro**, para a declividade real nunca ficar abaixo da mínima por arredondamento.

Órgãos acessórios:
- **TL (terminal de limpeza)** em cabeceira com até 1,45 m; mais fundo, PV.
- **PV** nos demais pontos: Ø 1,20 m (Ø 1,50 m com tubo acima de DN 600), chaminé de no máximo 1,00 m, tampão de ferro fundido Ø 0,60 m.
- **Tubo de queda** quando a chegada fica 0,50 m ou mais acima do fundo.

### 2.6 Traçado automático (botão 🧭 Gerar rede)

1. Acha cruzamentos e encontros em "T" entre os eixos das ruas.
2. Cria PVs nos cruzamentos, nas mudanças de direção, nas pontas e a cada 80 m (ajustável).
3. Cota de cada PV: interpolada ao longo da rua; sem cota na rua, pelo inverso do quadrado da distância aos pontos da topografia.
4. **Sentido do escoamento**: caminho de menor custo de cada PV até o lançamento, onde custo = extensão + 60 × (metros que o terreno sobe). Subir o terreno significa aprofundar a rede, então o caminho evita isso sem proibir.
5. Cada PV tem **uma única saída**. O trecho que fecharia uma malha começa numa **cabeceira própria** (TL a 3 m do PV mais alto), como se faz em projeto: toda rua fica atendida e a rede continua ramificada.
6. Numeração: o coletor 1 (tronco) é o de maior extensão a montante; trechos numerados de montante para jusante (1-1, 1-2…).

### 2.7 Quantitativos e orçamento

| Item | Critério de medição |
|---|---|
| Escavação | L × largura × (profundidade média + berço); largura = DN + 0,60 m (mínimo 0,65 m); separada por faixa: até 1,5 / 3,0 / 4,5 / acima |
| Escoramento | 2 × L × altura, só em vala com mais de 1,25 m |
| Berço e envoltória | Areia do fundo até 0,30 m acima do tubo, descontado o tubo |
| Reaterro | Escavação − areia − tubo |
| Bota-fora | (Areia + tubo) × empolamento 1,30 × DMT |
| Pavimento | L × (largura + 0,30 m) |
| PVs | Base (1,40 m) + acréscimo por metro; TL como poço de inspeção Ø 0,60 m |
| Ligações | População final ÷ habitantes por ligação × comprimento do ramal |

Preços: banco **SINAPI RJ do próprio site** (`orcamento/dados/`), mês escolhido na tela, com ou sem desoneração. Códigos de referência conferidos no banco de 10/2026 (tubos SC-90694 a SC-90700 e SC-92837 em diante, escavação SC-90100/90102/90086/90090, escoramento SC-101570/101578/101580/101586, reaterro SC-93379/93381/93372, PV SC-97988/97989/97992/97993, tampão SC-98114, juntas SC-90724 a SC-90732). O usuário troca o código ou digita o preço de outra base.

### 2.8 Conferências feitas

| Conferência | Resultado |
|---|---|
| Meia seção: Q calculada × metade da vazão plena | iguais (0,011596 m³/s) |
| σ a meia seção × γ·(D/4)·I | iguais (2,452 Pa) |
| Vc × 6·√(g·Rh) | iguais (4,201 m/s) |
| I mín. calculada × fórmula da norma (1,5 L/s, DN 150) | 0,450 % × 0,455 % |
| Soma das contribuições × vazão no lançamento | iguais |
| **300 redes aleatórias, 12.509 trechos** (planas, com 25 % de rampa, relevo irregular, 500 a 80 mil hab., PVC e norma geral) | **0 violações** de recobrimento, tensão trativa, lâmina, velocidade, diâmetro decrescente, cota subindo em PV e remanso |

### 2.9 Hipóteses e limites (o projetista precisa saber)

- Diâmetro interno = diâmetro nominal. Para tubo com DI menor, fixe um DN acima ou ajuste o n.
- Tubos acima de DN 400 são tratados como concreto (n = 0,013; 1,0 Pa), mesmo com a opção PVC.
- Regime uniforme por trecho: não calcula remanso de jusante por curva de remanso, só o controle de nível nos PVs que a norma pede.
- Não dimensiona elevatória, linha de recalque, sifão invertido, interceptor (NBR 12207) nem travessias. O programa **alerta** profundidade excessiva e cota de chegada abaixo do lançamento.
- Não entram no orçamento: escavação dos PVs, rebaixamento de lençol, sinalização, canteiro, administração local.
- Tubo de queda e ligação predial (selim e caixa) ficam como composição própria, sem preço automático.
- Recobrimento único para a rede inteira (via ou passeio).

---

## 3. Raciocínio do programador

### 3.1 Arquitetura

- **Um único `index.html`**, sem etapa de build no site, como os outros programas. O site publica pelo `carregador.js`, que só entrega o HTML a quem tem login e o programa liberado.
- O código-fonte é escrito em **blocos** e juntado por `build.sh` (só concatena):

| Bloco | Conteúdo |
|---|---|
| `00-head.html` | HTML e CSS |
| `10-core.js` | **Motor de cálculo puro** (`ESG`): hidráulica, vazões, dimensionamento, verificação, quantitativos, gerador de rede. Não toca na tela. |
| `20-ui.js` | Estado, projetos, abas Dados e Dimensionamento, Excel, nuvem |
| `30-planta.js` | Traçado: planta SVG editável, mouse/toque, DXF |
| `40-perfil.js` | Perfis, seção da vala e do PV |
| `50-3d.js` | 3D (three.js r128) e cenário de vazão |
| `60-orc-memo.js` | Orçamento (SINAPI) e memorial |
| `70-eventos.js` | Eventos (delegação) e partida |

- **Motor separado da tela**: `10-core.js` roda no Node. Os testes numéricos (`t-core.js`, `t-fuzz.js`) rodam sem navegador, e é isso que permite testar 12 mil trechos em segundos.

### 3.2 Modelo de dados (projeto `P`)

```
P = { nome, local, autor,
      crit:  { população, coeficientes, norma, limites, vala, fator },
      ruas:  [ { id, nome, pts:[{x, y, z}] } ],          ← única entrada obrigatória
      topo:  [ { x, y, z } ],                             ← opcional
      saida: { x, y },                                    ← opcional
      nos:   [ { id, x, y, ct, nome, qcI, qcF, cfEx } ],  ← gerado (ajustável)
      trechos: [ { id, de, para, rua, L, lados, Dfix, iFix } ],
      orc:   { mes, deson, bdi, it:{ chave:{cod, pu} } },
      manual: true se a rede foi ajustada à mão }
```

`R` (resultado) nunca é salvo: é recalculado. Assim não existe projeto com resultado desatualizado.

### 3.3 Fluxo de uma alteração

```
editar(fn) → guarda P para desfazer → fn() muda P → salva → ESG.calc(P) → redesenha a aba
```

- **Toda** alteração passa por `editar`: desfazer/refazer (Ctrl+Z, 40 níveis) funciona em tudo, e a rede inteira é recalculada até o lançamento a cada mudança.
- Enquanto a rede não foi ajustada à mão (`P.manual`), mexer em rua ou cota **refaz PVs e trechos na hora**. Depois de um ajuste manual o programa avisa e só regera com confirmação, para não perder trabalho.
- Cenário de vazão (3D): `ESG.calc(P, {fator, fixo: geometria})` verifica a rede **sem redimensionar**. "Redimensionar" grava o fator em `P.crit.fator`.

### 3.4 Desempenho

- Rede de 284 trechos: cálculo completo em ~0,1 s. Cenário do 3D: só a hidráulica (bisseção da lâmina), instantâneo.
- three.js e SheetJS carregam só quando a aba ou o botão é usado. O banco SINAPI (1,8 MB compactado) é baixado só no Orçamento, descompactado no navegador (`DecompressionStream`).

### 3.5 Armazenamento e integração com o site

| Onde | O quê |
|---|---|
| `localStorage` `tc_esg_db` | Todos os projetos do navegador |
| `localStorage` `tc_esg_cfg` | Tema, aparelho, aba aberta |
| Arquivo `.json` | Exportar / abrir projeto |
| Firestore `projetosEsgoto` | Projetos na nuvem (cada usuário os seus) |

Pontos de integração (os 5 lugares da skill `regras-firestore`):
1. `index.html` — cartão `esgoto` em `PROGRAMAS` (R$ 55, campo `esgotoAtivo`, pedido `esgotoSolicitado`) e gravação do pedido só para quem escolhe o programa.
2. `scripts/publicar/montar-site.js` — programa `esgoto`.
3. `firestore.rules` — `campoDoPrograma`, campos do cadastro e bloco `projetosEsgoto`.
4. `firestore-COM-compartilhamento-intertravado.rules` — cópia idêntica.
5. `scripts/avisos/avisar.js` — nome nos avisos.

O conferidor `scripts/publicar/conferir-regras.js` passou: 10 programas, 14 coleções.

### 3.6 Testes feitos (Chrome real, bibliotecas locais)

- Abrir, exemplo, as 7 abas, 3D, barra de vazão em 300 %, redimensionar, desfazer.
- Desenhar duas ruas em "T", nomear, informar cotas: rede gerada sozinha.
- Inserir PV, fixar DN, desfazer; colar ruas e topografia; mudar o lançamento; trocar norma e população.
- Projetos (novo, exemplo, duplicar), recarregar a página (volta ao mesmo projeto e aba).
- Downloads: Excel (dimensionamento e orçamento), DXF, SVG, Word, JSON.
- Celular 390 × 844 (sem rolagem lateral), tema escuro, página principal com o cartão novo.
- 0 erros de página em todos.

**Não testado**: login e nuvem reais (Firestore), carregamento real das CDNs, celular de verdade, placa de vídeo real, DXF aberto no AutoCAD, impressão em papel.

### 3.7 Como evoluir

Mudanças novas entram como blocos **PATCH ES-xx** registrados no `CLAUDE.md` do site. Parta sempre da versão no ar; rode `node t-core.js`, `node t-fuzz.js` e os testes de navegador antes de publicar.

---

## 4. Raciocínio do webdesign

### 4.1 Identidade

Cores e formas da página principal do Total Civil: fundo `#f3f2ee` com a grade de prancheta, tinta `#14202e`, laranja-queimado `#c2410c` para a ação principal, azul-marinho `#12263f` para cabeçalhos de tabela, a mesma marca (quadrado laranja + "TOTAL CIVIL"). Fonte do sistema, como a página principal: nada para baixar, abre rápido no celular. Cores próprias do tema só onde têm significado técnico: verde-esgoto `#0f766e` para a lâmina, ocre `#c98a2b` para o tubo de PVC, laranja e vermelho para alerta e erro. Tema claro e escuro.

### 4.2 Menos digitação que a Drenagem (pedido do dono)

| Na Drenagem | No Esgoto |
|---|---|
| 14 abas | **7 abas**, na ordem do trabalho |
| Nome da rua repetido em ruas, PVs, trechos | Nome digitado **uma vez**; trechos e PVs herdam |
| PVs e trechos lançados um a um | **🧭 Gerar rede** cria tudo pelas ruas |
| Cotas por estaca em cada rua | Cota só nos pontos da rua, ou colar X; Y; cota |
| Critérios a preencher | Tudo já vem com o valor de norma; muda só o que for diferente |
| Corrigir erros por botões | Dimensionamento já sai atendendo à norma; DN e declividade "vazio = automático" |
| Planta e edição em abas diferentes | Editar **direto no desenho**; propriedades ao lado |

### 4.3 Ordem das abas e das ferramentas

1 Dados → 2 Traçado → 3 Dimensionamento → 4 Perfis e seções → 5 3D → 6 Orçamento → 7 Memorial. É a ordem de um projeto real: concepção, traçado, cálculo, desenho, conferência visual, custo, entrega.

- **Barra de situação sempre visível** (erros, alertas, extensão, vazão, profundidade máxima): o projetista vê o efeito de cada mudança sem trocar de aba. Clicar no erro leva ao trecho.
- **Um botão principal por tela** (laranja): Gerar rede, Imprimir. O resto é secundário.
- Na barra do Traçado a ordem é a do uso: selecionar → desenhar rua → lançamento → **gerar** → ajustes finos (PV, trecho, excluir) → ver e exportar.
- Projeto vazio abre com "Começar em 3 passos" (exemplo, desenhar, colar).
- Clique cruzado: linha da planilha → perfil; trecho do perfil → seção da vala e PV; erro → trecho.

### 4.4 Desenhos técnicos

- **Planta**: símbolos e textos com tamanho fixo na tela em qualquer zoom; cor do trecho = situação; seta = sentido; triângulo laranja = lançamento; três níveis de rótulo para não poluir.
- **Perfil**: padrão de prancha de esgoto, com o quadro de cotas embaixo (PV, terreno, coletor, profundidade, extensão/DN, declividade/lâmina), lâmina final preenchida e inicial tracejada.
- **Seções**: vala com berço, envoltória, reaterro e cotas; PV com chaminé, tampão, chegada, saída e tubo de queda.
- **3D**: rua translúcida para enxergar a rede, tubo ocre, lâmina no formato real de segmento circular, partículas na velocidade do escoamento, ligações prediais ilustrativas. A barra vertical de esgoto é o controle principal; o quadro explica em linguagem direta o que acontece ("tubo cheio: o esgoto pode voltar pelas ligações") e oferece redimensionar.

### 4.5 Celular

Tela "Onde você vai usar?" como nos outros programas. No celular: botões só com ícone, barra de situação em uma linha rolável, desenho com 66 % da altura, tabelas roláveis, pinça para zoom na planta.

---

## 5. Publicação (o que falta fazer)

1. Subir para a `main` de `igororcobras-hash/totalcivil-site`: `esgoto/index.html`, `index.html`, `scripts/publicar/montar-site.js`, `scripts/avisos/avisar.js`, `firestore.rules`, `firestore-COM-compartilhamento-intertravado.rules`, `CLAUDE.md`, `README.md`.
2. Publicar as regras: https://github.com/igororcobras-hash/totalcivil-site/actions/workflows/publicar-regras.yml → **Run workflow**.
3. Liberar o programa para os usuários no painel **Usuários** (coluna Programas → Esgoto Sanitário).
4. Testar com login real: abrir https://totalcivil.com.br/esgoto/ e 📁 Projetos → ☁ Salvar na nuvem.

Sem o passo 2 o programa abre e calcula, mas a nuvem responde "sem permissão".

---

## 6. Próximas versões (sugestões)

- Estação elevatória e linha de recalque quando a profundidade passar do limite.
- Recobrimento por trecho (via × passeio) e rede dupla em avenidas.
- Bancos EMOP e SCO no orçamento, como na Drenagem.
- Diâmetro interno real por fabricante e classe de tubo.
- Importar DXF/KML das ruas e georreferenciar no satélite, como no Intertravado.
- Vídeo de apresentação para o cartão da página principal.

---

## Versão 2 (ES-02, 14/11/2026) — o que mudou e por quê

### Engenharia
- **Diâmetro interno real (DI).** O cálculo hidráulico passou a usar o DI do tubo (PVC maciço NBR 7362, PVC corrugado, concreto), editável em Dados › Tubos; o diâmetro externo entra na largura da vala e no recobrimento. Valores de catálogo marcados com “≈” devem ser conferidos.
- **Recobrimento por trecho.** Leito da via (0,90 m) ou passeio (0,65 m), escolhido no trecho.
- **Estação elevatória (NBR 12208).** Vazão de bombeamento = máxima final afluente; volume útil V = Q·T/4 (ciclo mínimo); poço circular com altura útil ≤ 1,0 m; detenção com a vazão média (≤ 30 min); recalque por Hazen-Williams com 10 % de folga + perdas localizadas; AMT; potência e motor comercial; golpe de aríete por Joukowsky (fechamento brusco). Os trechos entre o PV da elevatória e o PV de chegada viram linha de recalque (não recebem ligações) e a rede recomeça rasa a jusante.
- **🏭 Sugerir elevatória.** Procura o primeiro trecho acima da profundidade de alerta (ou a chegada abaixo da cota do lançamento), põe a elevatória no PV de montante e recalca até o primeiro PV que recebe outra rede; repete até 6 vezes.
- **Sifão invertido.** n linhas iguais; a 1ª leva sozinha a vazão inicial (V ≥ 0,60 m/s para autolimpeza); perda = Hazen-Williams + 1,5·V²/2g + 0,05 m, aplicada como desnível entre as câmaras.
- **Cava dos PVs.** As composições de PV de EMOP, SINAPI e SCO não incluem escavação: cava quadrada de lado = Ø externo + 2 × folga, altura = profundidade + laje + lastro, descontadas as valas que chegam; escoramento, lastro e reaterro próprios.

### Orçamento
- Um item por serviço com o código de cada banco (EMOP, SINAPI RJ, SCO-Rio); serviço sem composição no banco escolhido usa o equivalente de outro banco e fica marcado. Quantidade por banco quando a unidade muda (m³ × t; m³ × m²).
- EMOP licenciada: preço vem da EMOP importada no programa de Orçamento (IndexedDB do mesmo domínio); administrador tem embutidos só os 12 códigos usados.
- Compatível com o Orçamento: mesma planilha do “Importar Lista”, botão 🚀 Enviar ao Orçamento (`tc_envio_orcamento`) e registro no módulo comum `orcamento-comum.js` (3 soluções, cronograma, PDF, juntar programas).

### Programação
- `r.de` = PV de montante; `r.deExt` = diâmetro externo; `r.recq` = id da elevatória do recalque; `r.rec` = recobrimento exigido (nomes separados depois de duas colisões).
- Exportação CAD por uma “cena” única (`cadCena`: linhas, polilinhas, círculos, textos em camadas ESG-*), gravada em DXF (texto) ou DWG.
- **DWG:** formato binário fechado; em vez de escrever o formato à mão, usa-se a biblioteca `@node-projects/acad-ts` (MIT), empacotada com esbuild em `/tc-dwg.min.js` (955 kB, carregada só ao pedir o DWG), gravando AC1015 (AutoCAD 2000). Conferido lendo o arquivo de volta com o LibreDWG (leitor independente): mesmas contagens de entidades e camadas.
