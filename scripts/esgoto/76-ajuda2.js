/* ════════════════════════════════════════════════════════════════════
   ES-04 · AJUDA EM QUADROS, CAIXAS, TABELAS E TEXTOS (pedido do dono: “sempre que passar o mouse em quaisquer quadros,
   caixas ou texto deve aparecer uma explicação: fórmulas e no que interfere no resultado”).
   Complementa o 75-ajuda.js (campos e botões). Como funciona: o 75 chama ajTexto(el) quando o mouse não está num campo/botão;
   aqui o texto do título do quadro (h2/h3), do cabeçalho da coluna (th — e também qualquer célula td da coluna), do chip da barra
   de situação, do cartão (kpi), do rótulo do painel 3D/georreferenciar ou da linha da memória (📐) é comparado com AJT.
   Chave = texto sem acentos, minúsculo, sem a unidade em <small>. Entrada nova: acrescentar em AJT (texto exato) ou em AJR (regex).
   ════════════════════════════════════════════════════════════════════ */
const AJT = {
  /* ── planilha de dimensionamento ── */
  'trecho': '<b>Trecho</b> — tubo entre dois PVs (ou TL), numerado “coletor-ordem” (1-3 = 3º trecho do coletor 1; o coletor 1 é o mais longo). O sentido do esgoto vai do PV de montante para o de jusante.',
  'rua': '<b>Rua</b> — rua por onde o trecho passa (nome digitado uma vez no Traçado).',
  'mont.': '<b>Montante</b> — PV/TL de onde o trecho sai (ponta mais alta da rede, de onde vem o esgoto).',
  'jus.': '<b>Jusante</b> — PV para onde o trecho leva o esgoto.',
  'l': '<b>L — extensão do trecho</b> (m), medida em planta entre os centros dos PVs. Entra na contribuição (taxa linear × L), na infiltração, no quantitativo de tubo, vala e pavimento.',
  'l (m)': '<b>L — extensão do trecho</b> (m). Entra na contribuição, na infiltração e nos quantitativos de tubo, vala e pavimento.',
  'contribui': '<b>Contribui</b> — de onde vem a vazão do trecho: <b>linear</b> = taxa × extensão (casas ao longo do trecho), mais a que chega dos trechos de montante e as contribuições concentradas do PV (indústria, condomínio).',
  'q inicial': '<b>Q inicial</b> (L/s) — vazão no início de operação: <i>Qi = K2 · C · q<sub>i</sub> · P<sub>i</sub> / 86 400 + infiltração</i>, distribuída pela extensão da rede e acumulada de montante para jusante. Nunca menor que a vazão mínima (1,5 L/s, NBR 9649). Define a <b>tensão trativa</b> (autolimpeza).',
  'q final': '<b>Q final</b> (L/s) — vazão de fim de plano: <i>Qf = K1 · K2 · C · q<sub>f</sub> · P<sub>f</sub> / 86 400 + infiltração</i>, acumulada de montante para jusante. Define o <b>diâmetro</b>, a <b>lâmina y/D</b> e a <b>velocidade máxima</b>.',
  'qi': '<b>Q<sub>i</sub></b> — vazão inicial (L/s): K2·C·q·P/86 400 + infiltração; mínimo 1,5 L/s. Usada na tensão trativa.', 'qf': '<b>Q<sub>f</sub></b> — vazão final (L/s): K1·K2·C·q·P/86 400 + infiltração. Usada no diâmetro, lâmina e velocidade.',
  'qi (l/s)': '<b>Q<sub>i</sub></b> — vazão inicial (L/s): K2·C·q·P/86 400 + infiltração; mínimo 1,5 L/s. Usada na tensão trativa.', 'qf (l/s)': '<b>Q<sub>f</sub></b> — vazão final (L/s): K1·K2·C·q·P/86 400 + infiltração. Usada no diâmetro, lâmina e velocidade.',
  'q final (l/s)': '<b>Q final</b> (L/s) — vazão de fim de plano que passa pelo trecho/PV. Define diâmetro, lâmina e velocidade.',
  'dn': '<b>DN — diâmetro nominal</b> (mm). O programa escolhe o menor DN da série (a partir do DN mínimo dos Dados) que leva a Q final com y/D ≤ 0,75 (ou 0,50 se V > Vc), por Manning: <i>Q = (1/n) · A · Rh<sup>2/3</sup> · I<sup>1/2</sup></i>, com o diâmetro INTERNO real do tubo escolhido. Muda o custo do tubo, a largura da vala e o recobrimento.',
  'i terreno': '<b>i terreno</b> (%) — declividade do terreno no trecho: <i>(CT mont. − CT jus.) / L</i>. Quando é maior que a mínima, o coletor acompanha o terreno (vala rasa); quando é menor ou negativa, o coletor precisa aprofundar.',
  'i coletor': '<b>i coletor</b> (%) — declividade adotada: <i>(CC mont. − CC jus.) / L</i>. É a maior entre a mínima (tensão trativa) e a necessária para manter o recobrimento, limitada pela máxima (V ≤ 5 m/s). Aumentar a declividade aprofunda a rede a jusante.',
  'i min.': '<b>i mínima</b> (%) — declividade para a tensão trativa mínima (autolimpeza) com a vazão inicial. NBR 9649: <i>I<sub>mín</sub> = 0,0055 · Q<sub>i</sub><sup>−0,47</sup></i> (m/m, Q em L/s, n = 0,013, τ = 1 Pa); o programa resolve com o n e o τ dos Dados.',
  'i (%)': '<b>I</b> — declividade do coletor (%) = (CC mont. − CC jus.) / L.', 'i min. (%)': '<b>I mínima</b> (%) — para τ ≥ τ mínima com a vazão inicial: I<sub>mín</sub> = 0,0055·Q<sub>i</sub><sup>−0,47</sup> (n = 0,013, 1 Pa).',
  'ct mont.': '<b>CT montante</b> — cota do terreno (tampa do PV) na ponta de montante (m). Vem das cotas das ruas/topografia. É a referência do recobrimento e da profundidade.',
  'ct jus.': '<b>CT jusante</b> — cota do terreno (tampa do PV) na ponta de jusante (m).',
  'cc mont.': '<b>CC montante</b> — cota do coletor (geratriz inferior interna, o “fundo” do tubo) na saída do PV de montante (m). <i>Recobrimento = CT − (CC + DE) ≥ 0,90 m</i> na via (0,65 m no passeio).',
  'cc jus.': '<b>CC jusante</b> — cota do coletor na chegada ao PV de jusante (m) = CC mont. − I × L. Se ficar acima da saída do PV, há degrau (≥ 0,50 m pede tubo de queda).',
  'prof. mont.': '<b>Profundidade de montante</b> (m) = CT − CC. Define a faixa de escavação (0–1,5 / 1,5–3 / 3–4,5 m), o escoramento (> 1,25 m) e o PV. Acima da profundidade de alerta dos Dados aparece aviso (pensar em elevatória).',
  'prof. jus.': '<b>Profundidade de jusante</b> (m) = CT − CC na chegada ao PV de jusante.',
  'y/d inic.': '<b>y/D inicial</b> — lâmina relativa com a vazão inicial (altura da água ÷ diâmetro interno). Só informativo; a autolimpeza é verificada pela tensão trativa.',
  'y/d final': '<b>y/D final</b> — lâmina com a vazão final. NBR 9649: <b>≤ 0,75</b> (ar para ventilação e folga), ou <b>≤ 0,50</b> se a velocidade final passar da crítica Vc = 6·√(g·Rh). Acima disso o 3D pinta o tubo de laranja; tubo cheio = vermelho.',
  'y/di': '<b>y/D inicial</b> — lâmina relativa com a vazão inicial.', 'y/df': '<b>y/D final</b> — lâmina relativa com a vazão final (≤ 0,75; ≤ 0,50 se V > Vc).',
  'v inic.': '<b>V inicial</b> (m/s) — velocidade média com a vazão inicial, por Manning na seção molhada.',
  'v final': '<b>V final</b> (m/s) — velocidade com a vazão final. NBR 9649: <b>≤ 5 m/s</b> (desgaste do tubo). Se passar da crítica <i>Vc = 6·√(g·Rh)</i>, a lâmina máxima cai para 0,50.',
  'vi': '<b>V<sub>i</sub></b> — velocidade inicial (m/s).', 'vf': '<b>V<sub>f</sub></b> — velocidade final (m/s), ≤ 5 m/s.', 'vc': '<b>Vc — velocidade crítica</b> (m/s) = 6·√(g·Rh). Se V final > Vc, y/D máximo = 0,50 (mistura de ar).',
  'τ': '<b>τ — tensão trativa</b> (Pa) com a vazão inicial: <i>τ = γ · Rh · I</i> (γ = 9 807 N/m³). NBR 9649: <b>≥ 1,0 Pa</b> (n = 0,013) para arrastar os sólidos (autolimpeza). Abaixo disso aumente a declividade.',
  'σ': '<b>σ (τ) — tensão trativa</b> (Pa) = γ · Rh · I, com a vazão inicial; mínimo 1,0 Pa (NBR 9649).',
  'ok': '<b>OK</b> — ✔ o trecho atende todos os critérios (recobrimento, τ, y/D, velocidade, DN mínimo, distância entre PVs). ⚠ ou ✖ mostram o que falta; a lista completa está em Verificação.',
  /* ── PVs ── */
  'pv': '<b>PV — poço de visita</b> (ou TL, terminal de limpeza na cabeceira rasa). Entra no orçamento pela profundidade (faixas) e pelo diâmetro interno.',
  'tipo': '<b>Tipo</b> — PV (poço de visita), TL (terminal de limpeza, cabeceira até a profundidade dos Dados), EEE (elevatória) ou lançamento.',
  'cota terreno': '<b>Cota do terreno / tampa</b> (m) — interpolada das cotas das ruas e da topografia. Mexer nela muda recobrimento e profundidade.',
  'cota fundo': '<b>Cota de fundo</b> (m) — a mais baixa entre as saídas e chegadas do PV (geratriz inferior do coletor de saída).',
  'prof.': '<b>Profundidade</b> (m) = cota do terreno − cota de fundo. Define o item de PV no orçamento e a cava.',
  'ø interno': '<b>Ø interno do PV</b> (m) — 1,00 m até 1,5 m de profundidade (ou o padrão), 1,20 m nos mais fundos; muda o item do orçamento e a cava.',
  'maior dn': '<b>Maior DN</b> — maior tubo que chega/sai do PV; confere se cabe no Ø do PV.',
  'degraus / tubo de queda': '<b>Degraus / tubo de queda</b> — diferença entre a chegada e a saída no PV. NBR 9649: degrau ≥ 0,50 m pede <b>tubo de queda</b> (orçado por metro).',
  'tubos de queda': '<b>Tubos de queda</b> — chegadas com degrau ≥ 0,50 m (NBR 9649). Quantidade e altura entram no orçamento.',
  /* ── vazões / critérios ── */
  'populacao e contribuicao': '<b>População e contribuição</b> — de onde sai a vazão: população × consumo per capita × C (retorno) × K1 × K2, mais a infiltração. Mudou aqui, muda todo o dimensionamento.',
  'criterios hidraulicos': '<b>Critérios hidráulicos</b> — Manning n, tensão trativa mínima, DN mínimo, lâmina máxima e velocidade máxima (NBR 9649). Definem declividade e diâmetro de cada trecho.',
  'rede, pvs e vala': '<b>Rede, PVs e vala</b> — recobrimentos, profundidade de alerta, distância entre PVs, folgas e espessuras da vala: mudam cotas, quantidades e custo.',
  'vala e orcamento': '<b>Vala e orçamento</b> — larguras, berço, envoltória, pavimento, lotes (testada e fundo) e DMT: mudam só quantitativos e preço (não a hidráulica).',
  'vazoes de projeto': '<b>Vazões de projeto</b> — vazões médias, máximas (× K1 × K2) e taxas lineares (vazão ÷ extensão total da rede).',
  'q media inicial': '<b>Q média inicial</b> = C · q<sub>i</sub> · P<sub>i</sub> / 86 400 (L/s), sem os coeficientes de pico.', 'q media final': '<b>Q média final</b> = C · q<sub>f</sub> · P<sub>f</sub> / 86 400 (L/s).',
  'q max. inicial': '<b>Q máxima inicial</b> = K2 · Q média inicial + infiltração (L/s).', 'q max. final': '<b>Q máxima final</b> = K1 · K2 · Q média final + infiltração (L/s). É a que dimensiona os diâmetros.',
  'infiltracao': '<b>Infiltração</b> = taxa (L/s·km) × extensão da rede (km). NBR 9649: 0,05 a 1,0 L/s·km.',
  'taxa final': '<b>Taxa linear final</b> = (Q máx. final − infiltração) ÷ extensão da rede (L/s·km) + taxa de infiltração. Multiplicada pelo L de cada trecho dá a contribuição dele.',
  'por habitante': '<b>Custo por habitante</b> = total com BDI ÷ população final.', 'por metro de rede': '<b>Custo por metro</b> = total com BDI ÷ extensão da rede.',
  'tubos da rede': '<b>Tubos da rede</b> — material e diâmetros (interno/externo). O cálculo usa o diâmetro INTERNO real; a vala e o recobrimento usam o EXTERNO.',
  'interno (di)': '<b>Diâmetro interno (DI)</b> (mm) — usado na hidráulica (área, Rh, lâmina). “≈” = valor aproximado: confira no catálogo do fabricante.', 'externo': '<b>Diâmetro externo (DE)</b> (mm) — usado na largura da vala e no recobrimento.',
  /* ── orçamento ── */
  'item': '<b>Item</b> — numeração da planilha (grupo.item).', 'codigo': '<b>Código</b> — código da composição no banco escolhido (SINAPI, SCO-Rio ou EMOP). Pode ser trocado por linha.',
  'servico': '<b>Serviço</b> — descrição da composição do banco.', 'un.': '<b>Unidade</b> do banco (m, m², m³, un, t·km…).',
  'quantidade': '<b>Quantidade</b> — calculada da rede (memória em 📐 abaixo de cada linha): mexer na rede ou nos dados de vala muda a quantidade.',
  'preco unit.': '<b>Preço unitário</b> (R$) do banco/mês escolhido, desonerado ou não. EMOP sem preço se você não importou a tabela.',
  'total (r$)': '<b>Total</b> = quantidade × preço unitário (sem BDI).', 'total com bdi': '<b>Total com BDI</b> = custo direto × (1 + BDI).',
  'custo direto': '<b>Custo direto</b> — soma das linhas (quantidade × preço) antes do BDI.',
  'solucao (total com bdi)': '<b>Solução</b> — recomposição do pavimento: as 3 soluções mudam só os itens de pavimento; o total já tem BDI.',
  'orcamento da rede': '<b>Orçamento da rede</b> — itens nos 3 bancos (SINAPI, SCO-Rio, EMOP), quantidades da memória de cálculo, banco/mês/BDI escolhidos acima.',
  'verificacao': '<b>Verificação</b> — todos os critérios da NBR 9649 / 14486 trecho a trecho: ✖ erro (não atende), ⚠ alerta (atende com ressalva).',
  'planilha de dimensionamento': '<b>Planilha de dimensionamento</b> — um trecho por linha, de montante para jusante. Passe o mouse em cada coluna para ver a fórmula.',
  'pocos de visita e terminais de limpeza': '<b>Poços de visita e terminais de limpeza</b> — cotas, profundidade, Ø e degraus de cada PV/TL.',
  'elevatoria e recalque': '<b>Elevatória e recalque</b> (NBR 12208) — vazão de bombeamento = máxima final; volume útil V = Q · T / 4 (T = ciclo); altura manométrica = desnível + perdas (Hazen-Williams + localizadas).',
  'sifao invertido': '<b>Sifão invertido</b> — passa sob obstáculo; linhas com V ≥ 0,60 m/s já com a vazão inicial (autolimpeza), perdas por Hazen-Williams + entrada/saída.',
  'ligacoes (1 por lote)': '<b>Ligações</b> — uma por lote, dos dois lados do trecho (ou de um). Número = frente livre do trecho ÷ testada. Entram no orçamento (ligação + ramal).',
  'ramal medio': '<b>Ramal médio</b> (m) — do coletor ao alinhamento do lote: meia rua + passeio (menos se a rede está no passeio).',
  'ajustadas a mao': '<b>Ajustadas à mão</b> — ligações que você arrastou/criou na planta; as demais seguem o automático.',
  /* ── memorial ── */
  '1. normas e criterios adotados': '<b>Normas e critérios</b> — NBR 9649 (rede coletora), NBR 14486 (PVC), NBR 12208 (elevatórias): valores adotados nos Dados.',
  '2. vazoes de projeto': '<b>Vazões de projeto</b> — fórmulas e valores (médias, máximas, infiltração, taxas lineares).',
  '3. metodo hidraulico': '<b>Método hidráulico</b> — Manning em seção circular parcialmente cheia; tensão trativa τ = γ·Rh·I; lâmina e velocidade crítica.',
  '4. planilha de dimensionamento': '<b>Planilha de dimensionamento</b> — trecho a trecho, como na aba Dimensionamento.',
  '5. pocos de visita e terminais de limpeza': '<b>PVs e TLs</b> — cotas, profundidades e tubos de queda.', '6. verificacao': '<b>Verificação</b> — lista de erros e alertas.',
  '7. quantitativos e orcamento': '<b>Quantitativos e orçamento</b> — memória de cálculo de cada quantidade e preços do banco escolhido.',
  '8. planta da rede': '<b>Planta da rede</b> — desenho da rede com PVs, trechos e sentido.', '9. perfis longitudinais': '<b>Perfis</b> — terreno, coletor e PVs de cada coletor (exagero vertical só no desenho).',
  'criterio': '<b>Critério</b> adotado no projeto.', 'valor': '<b>Valor</b> adotado (Dados).',
  /* ── 3D realista e georreferenciar (rótulos do painel) ── */
  'qualidade': '<b>Qualidade</b> do 3D — Baixa (sem sombra), Média, Alta, Ultra: resolução, sombras (1024–4096), quantidade de grama e texturas. No celular comece em Média. Não muda nenhum cálculo.',
  'sol': '<b>Sol</b> — hora do dia (Manhã, Meio-dia, Tarde, Fim de tarde): direção e cor da luz, das sombras e do céu.',
  'desenho': '<b>Desenho</b> — transparência da rede e das ruas sobre o mapa.', 'imagem': '<b>Imagem</b> — transparência do satélite/mapa de fundo.',
  'giro (°)': '<b>Giro</b> (graus, sentido anti-horário) — gira o desenho em torno do centro do projeto. Shift + roda do mouse também gira.', 'escala (%)': '<b>Escala</b> — 100 % = desenho em metros reais. Mude só se o desenho foi feito em outra escala.',
  'lat': '<b>Latitude</b> (graus decimais, negativa no hemisfério sul) do CENTRO do desenho.', 'lon': '<b>Longitude</b> (graus decimais, negativa a oeste) do centro do desenho.',
  'e (m)': '<b>E (Este)</b> — coordenada UTM SIRGAS 2000 do centro do desenho (m).', 'n (m)': '<b>N (Norte)</b> — coordenada UTM SIRGAS 2000 do centro do desenho (m).', 'zona': '<b>Zona UTM</b> — Rio das Ostras e região: 24 (sul).',
  'procurar o local': '<b>Procurar</b> — busca de endereço no OpenStreetMap (Nominatim). Clique no resultado para levar o desenho até lá.',
  'tipo do mapa': '<b>Tipo do mapa</b> — Satélite (Esri), Satélite com nomes de ruas e lugares, ou Mapa (OpenStreetMap).',
  'aparencia': '<b>Aparência</b> — Realista (pista, calçada e meio-fio preenchidos) ou Técnico (só linhas). Vale também para o KMZ.',
  'posicao': '<b>Posição</b> — onde fica o centro do desenho, o giro e a escala. Com ✔ Salvar posição o desenho trava (as alças somem).',
  'pontos de controle (pv com coordenada medida)': '<b>Pontos de controle</b> — PVs com coordenada medida (GPS/topografia). Com 2 ou mais, o programa acha o giro e o deslocamento por mínimos quadrados e mostra o erro médio e o maior.',
  'salvar e exportar': '<b>Salvar e exportar</b> — a posição vai junto com o projeto; KMZ/KML abre no Google Earth com ruas, rede, PVs e lotes.',
  'niveis do cenario (so desenho)': '<b>Níveis do cenário</b> — liga/desliga cada parte do 3D realista. Nenhum cálculo muda.',
  'locar no 3d (clique no chao; arraste para mover)': '<b>Locar no 3D</b> — 🌳 + Árvore ou 💡 + Poste e clique no chão; arraste para mover; selecione e 🗑 para excluir. Fica salvo no projeto.',
  'calcada e meio-fio': '<b>Calçada e meio-fio</b> — largura da rua e do passeio dos Dados; meio-fio de 15 cm. Só desenho.',
  'faixa central da rua': '<b>Faixa central</b> — pintura tracejada (3 m pintados, 3 m sem), fora dos cruzamentos.',
  'terreno (entorno com grama)': '<b>Terreno</b> — superfície pelas cotas dos PVs, das ruas e da topografia (interpolação IDW), encostando no fim da calçada.',
  'casas': '<b>Casas</b> — uma por lote da planta (os mesmos lotes das ligações), recuo de 3 a 5,5 m, 1 ou 2 pavimentos. Ilustrativo: não entra em cálculo.',
  'muros e portoes': '<b>Muros e portões</b> — na frente e nas divisas dos lotes; uma parede só entre vizinhos.',
  'arvores e coqueiros do cenario': '<b>Árvores e coqueiros</b> — nos quintais e soltos no campo (ilustrativos).',
  'grama 3d (com vento)': '<b>Grama 3D</b> — tufos com vento perto das ruas; a quantidade depende da Qualidade.',
  'horizonte e morros': '<b>Horizonte</b> — terreno estendido e morros na névoa, para o 3D não terminar num “corte”.',
  'arvores que voce locou': '<b>Árvores locadas</b> — as que você pôs com 🌳 + Árvore (ficam salvas no projeto).', 'postes que voce locou': '<b>Postes locados</b> — os que você pôs com 💡 + Poste (salvos no projeto).',
  'imagem de satelite no chao': '<b>Satélite no chão</b> — com o projeto georreferenciado (🛰), a foto de satélite (Esri) vira o terreno do 3D. Desligue Casas/Muros para ver só a foto.',
  'ruas, calcadas e meio-fio': '<b>Ruas</b> — pista, calçada e meio-fio desenhados sobre o mapa (Realista) ou só o contorno (Técnico).',
  'rede (trechos)': '<b>Rede</b> — trechos em laranja (recalque em magenta); passe o mouse para ver DN e declividade.', 'pvs': '<b>PVs</b> — clique para ver tampa, fundo e profundidade.',
  'nome dos pvs': '<b>Nome dos PVs</b> — rótulo fixo ao lado de cada PV.', 'lotes': '<b>Lotes</b> — os mesmos da planta e das ligações.'
};
/* textos que mudam (números): expressões regulares */
const AJR = [
  [/^rede [\d.,]+ m$/i, '<b>Extensão da rede</b> — soma dos trechos (coletores, recalque e sifões). Entra na infiltração e na taxa linear.'],
  [/^\d+ trechos · \d+ pvs$/i, '<b>Trechos e PVs</b> — quantidade gerada pelo 🧭 Gerar rede (cruzamentos, deflexões, pontas e a cada distância máxima).'],
  [/^vazao final [\d.,]+ l\/s$/i, '<b>Vazão final no lançamento</b> = Q máx. final de toda a rede (K1·K2·C·q·P/86 400 + infiltração).'],
  [/^prof\. max\. [\d.,]+ m$/i, '<b>Profundidade máxima</b> da rede (CT − CC). Muito funda = escavação cara e escoramento: pense em elevatória.'],
  [/sem erros|^\d+ erros?$/i, '<b>Erros</b> — critérios da NBR que não foram atendidos (lista na Verificação). Com erro a rede não deve ser orçada.'],
  [/sem alertas|^\d+ alertas?$/i, '<b>Alertas</b> — atendem a norma, mas pedem atenção (profundidade, degrau, velocidade alta…).'],
  [/^ruas \(\d+\)$/i, '<b>Ruas</b> — eixos desenhados ou colados (Nome; X; Y; cota). O nome é digitado UMA vez e vai para trechos, perfis e orçamento.'],
  [/^\d+\/\d+ cotas$/i, '<b>Cotas da rua</b> — pontos da rua com cota digitada / total. Rua sem cota usa a topografia ou a interpolação.'],
  [/% do esgoto de projeto$/i, '<b>Cenário do 3D</b> — a barra “Esgoto” multiplica a vazão sem mudar os tubos: veja onde passa de y/D ou entra em carga. 🛠 Redimensionar grava o cenário como projeto.'],
  [/^custo direto/i, '<b>Custo direto</b> — soma das linhas antes do BDI, no banco e mês escolhidos.'],
  [/^(sinapi|sco|emop)/i, '<b>Banco de preços</b> — SINAPI RJ, SCO-Rio ou EMOP; o mês aparece ao lado. A mesma rede pode ser orçada nos três.'],
  [/^📐/, '<b>Memória de cálculo</b> — como a quantidade da linha acima foi obtida (fórmula com os números da sua rede). Mude a rede ou os Dados da vala e a conta é refeita.'],
  [/^🏠 ligacoes prediais/i, '<b>Ligações prediais</b> — uma por lote (testada dos Dados). Arraste o quadradinho âmbar na planta para mover; 🏠 + Ligação cria; 🗑 exclui.']
];
function ajNorm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[:：]$/, ''); }
function ajTxtEl(el) { /* texto do elemento sem a unidade em <small>/<sub> */ const c = el.cloneNode(true); c.querySelectorAll('small,.aj-i,input,select,button').forEach(x => x.remove()); return ajNorm(c.textContent.replace(/[ⓘ]/g, '')); }
function ajBusca(t) { if (!t) return null; if (AJT[t]) return t; const t2 = t.replace(/\s*\(.*?\)\s*$/, '').trim(); if (AJT[t2]) return t2; const t3 = t.replace(/^[^\w(]+/, '').trim(); if (AJT[t3]) return t3;
  for (let i = 0; i < AJR.length; i++) if (AJR[i][0].test(t)) return '#' + i; return null; }
/* devolve a chave do AJ (registra 'txt.*') e guarda o elemento a destacar em window._ajEl */
function ajTexto(el) {
  if (!el || !el.closest) return null; let alvo = null, k = null;
  { const lf = el.closest('small,span,div,b,em,i'); if (lf && lf.children.length === 0) { const kk = ajBusca(ajTxtEl(lf)); if (kk) { k = kk; alvo = lf; } } }   /* texto próprio (ex.: memória 📐) vale mais que a coluna */
  const td = k ? null :  el.closest('td'); if (td) { const tb = td.closest('table'), th = tb && tb.tHead && tb.tHead.rows[0] && tb.tHead.rows[0].cells[td.cellIndex]; if (th) { k = ajBusca(ajTxtEl(th)); alvo = td; } }
  if (!k) { const e2 = el.closest('th,h2,h3,h4,.chip,.kpi,label.rl-c,.rl-t,.t3-inf b,#situ > *, .barra > b, .lg > *, li, p'); if (e2) { k = ajBusca(ajTxtEl(e2)); alvo = e2;
      if (!k && e2.classList.contains('kpi')) { const s = e2.querySelector('small,span'); if (s) k = ajBusca(ajTxtEl(s)); } } }
  if (!k) { const sp = el.closest('span,b,small,div'); if (sp && sp.children.length === 0) { k = ajBusca(ajTxtEl(sp)); alvo = sp; } }
  if (!k) return null;
  const chave = 'txt.' + k; if (!AJ[chave]) AJ[chave] = k[0] === '#' ? AJR[+k.slice(1)][1] : AJT[k];
  window._ajEl = alvo; return chave;
}
