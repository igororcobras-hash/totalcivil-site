/* ════════════════════════════════════════════════════════════════════
   AJUDA AO PASSAR O MOUSE (igual ao programa Pavimento Intertravado)
   Cada campo e botão tem uma explicação: o que é, valor usual, o que muda no cálculo.
   Passe o mouse no rótulo, no campo ou no botão; no celular toque no ⓘ. Esc fecha.
   Chaves: crit.X (Dados), no.X (PV), trk.X / tfix.X (trecho), eee.X, sif.X, sel.X, chk.X, act.X e modo.X (botões), t3.X (3D).
   ════════════════════════════════════════════════════════════════════ */
const AJ = {
  /* ── Dados: população e vazão ── */
  'crit.popI': '<b>População inicial</b> (hab) — atendida no começo de operação da rede. Define a <b>vazão inicial</b>, que confere se o tubo se limpa sozinho (tensão trativa) quando a rede ainda tem pouca gente.',
  'crit.popF': '<b>População final</b> (hab) — fim do plano, de 20 a 30 anos. Define a <b>vazão final</b>, a que dimensiona o diâmetro. No cálculo por taxa, só conta o número de ligações do orçamento.',
  'crit.qI': '<b>Consumo de água per capita inicial</b> (L/hab·dia). Do esgoto: Qi = K2·C·Pi·q/86.400. Use o consumo medido da concessionária; sem dado, 120 a 200 L/hab·dia.',
  'crit.qF': '<b>Consumo de água per capita final</b> (L/hab·dia), no fim de plano. Costuma ser igual ou um pouco maior que o inicial.',
  'crit.C': '<b>Coeficiente de retorno C</b> — fração da água consumida que vira esgoto. <b>0,80</b> é o usual (NBR 9649; faixa 0,70 a 0,85).',
  'crit.K1': '<b>K1 — dia de maior consumo</b>. Multiplica a vazão final. Usual <b>1,20</b>.',
  'crit.K2': '<b>K2 — hora de maior consumo</b>. Multiplica as vazões inicial e final. Usual <b>1,50</b>.',
  'crit.K3': '<b>K3 — hora de menor consumo</b>. Usado para a vazão mínima que a bomba da elevatória recebe (define a detenção no poço). Usual <b>0,50</b>.',
  'crit.tInf': '<b>Taxa de infiltração</b> (L/s·km) — água do lençol que entra pelas juntas e PVs. NBR 9649: <b>0,05 a 1,0</b>; 0,10 é usual com tubo de junta elástica.',
  'crit.qMin': '<b>Vazão mínima do trecho</b> (L/s). Nenhum trecho é calculado com menos que isso (NBR 9649: <b>1,5 L/s</b>, a descarga de um aparelho sanitário).',
  'crit.txI': '<b>Taxa de contribuição linear inicial</b> (L/s por km de rede com lotes). Alternativa a população × consumo, quando o projeto já fornece a taxa.',
  'crit.txF': '<b>Taxa de contribuição linear final</b> (L/s·km). Vale para o fim de plano.',
  /* ── Dados: hidráulica ── */
  'crit.n': '<b>Coeficiente de Manning n</b>. <b>0,013</b> para tubo comum (NBR 9649); <b>0,010</b> para PVC liso (NBR 14486). Maior n = tubo mais “áspero”, exige mais declividade.',
  'crit.tau': '<b>Tensão trativa mínima</b> (Pa) — esforço da água no fundo que mantém o tubo limpo. <b>1,0 Pa</b> (NBR 9649); 0,6 Pa para PVC (NBR 14486). Define a <b>declividade mínima</b> de cada trecho.',
  'crit.dMin': '<b>Diâmetro mínimo</b> (mm). A norma admite DN 100; na prática usa-se <b>DN 150</b> para a rede coletora.',
  'crit.yD': '<b>Lâmina máxima y/D</b> — quanto do diâmetro pode estar cheio na vazão final. <b>0,75</b> (NBR 9649): o resto fica com ar para ventilar o tubo.',
  'crit.yDvc': '<b>y/D máxima quando V &gt; V crítica</b>. Em velocidade alta a água se mistura com ar e “incha”; a norma limita a lâmina a <b>0,50</b>.',
  'crit.vMax': '<b>Velocidade máxima</b> (m/s). <b>5 m/s</b> (NBR 9649). Acima disso o programa limita a declividade e cria degrau ou tubo de queda no PV de jusante.',
  /* ── Dados: rede ── */
  'crit.rec': '<b>Recobrimento mínimo no leito da via</b> (m) — da geratriz superior do tubo ao terreno. <b>0,90 m</b> (NBR 9649) para proteger o tubo do tráfego.',
  'crit.recPas': '<b>Recobrimento mínimo no passeio</b> (m). <b>0,65 m</b> (NBR 9649). Vale nos trechos marcados como “Passeio” em <b>Onde passa</b>.',
  'crit.profMax': '<b>Profundidade para alerta</b> (m). Passou disso, o programa avisa e a elevatória passa a ser sugerida (🏭). Valas fundas encarecem escavação e escoramento.',
  'crit.degTQ': '<b>Degrau que pede tubo de queda</b> (m). NBR 9649: degrau a partir de <b>0,50 m</b> no PV precisa de tubo de queda externo, para não espirrar o esgoto.',
  'crit.distPV': '<b>Distância entre PVs ao gerar</b> (m). O 🧭 Gerar rede coloca um PV a cada tanto, além dos cruzamentos e deflexões. Usual 60 a 80 m.',
  'crit.distMax': '<b>Distância máxima entre PVs</b> (m). Alcance dos equipamentos de limpeza: <b>100 m</b>. Trecho maior que isso vira alerta.',
  'crit.profTL': '<b>Cabeceira com TL até</b> (m). Início de rede raso (até esta profundidade) usa terminal de limpeza em vez de PV. Mais fundo vira PV.',
  /* ── Dados: vala, ligações e pavimento ── */
  'crit.folga': '<b>Folga da vala</b> (m) — largura da vala = diâmetro externo do tubo + esta folga (toda). Dá espaço para assentar e compactar. Usual 0,60 m.',
  'crit.berco': '<b>Berço de areia</b> (m) sob o tubo. Usual 0,10 m. Entra no volume de areia e na profundidade da vala.',
  'crit.envolt': '<b>Envoltória acima do tubo</b> (m) de areia ou pó de pedra. Usual 0,30 m.',
  'crit.espPav': '<b>Espessura do asfalto reposto</b> (m) sobre a vala. Usual 0,05 m (CBUQ). A área reposta é largura da vala + 0,30 m × extensão.',
  'crit.fundoLote': '<b>Fundo do lote</b> (m) — profundidade dos lotes desenhados na planta e no 3D. Padrão <b>25 m</b>. Na esquina, o lote da rua mais longa fica com o canto e a rua que cruza começa os lotes dela logo depois do fundo desse lote: os lotes encostam, sem corredor ou servidão entre eles. Não muda o número de ligações (que depende da testada).',
  'crit.testada': '<b>Testada padrão do lote</b> (m) — a largura da frente do lote. Cada trecho recebe <b>uma ligação predial por lote, de cada lado</b>: trecho de 60 m com testada 12 m = 5 lotes por lado. Padrão <b>12 m</b>. Muda um trecho só no painel dele, ou arraste cada ligação na planta.',
  'crit.raioMF': '<b>Raio do meio-fio nas esquinas</b> (m) — curva de concordância das duas guias no cruzamento. Padrão <b>5 m</b> (de 4 a 9 m). O <b>muro/alinhamento dos lotes</b> faz o <b>2º raio</b>: curva paralela deslocada pela largura do passeio, com o mesmo centro, raio = <b>raio do meio-fio − largura do passeio</b> (ex.: raio 5 e passeio de 3 m → muro com raio 2 m). Se der menos de 0,5 m o muro fica em canto vivo. Em rua curta o raio é reduzido para caber. Muda a planta, o 3D (pista, meio-fio, calçada, muro e lote do canto), o mapa/KMZ e o CAD (camada ESG-ESQUINA); não muda a vazão nem o dimensionamento. Use 0 para canto vivo.',
  'crit.largPas': '<b>Largura do passeio</b> (m), do meio-fio ao alinhamento do lote. Define o <b>comprimento do ramal predial</b> (meia rua + passeio) e a posição do coletor quando a rede passa no passeio. Usual 2,50 m.',
  'crit.habLig': '<b>Habitantes por ligação</b> (hab/lote). Só informativo: compare com a população do projeto (nº de lotes × hab/lote).',
  'crit.ramal': '<b>Comprimento do ramal</b> (m). Só é usado quando você <b>informa o número de ligações</b> à mão. Sem isso, o ramal é medido na planta (do coletor ao alinhamento do lote).',
  'crit.dmt': '<b>Distância de transporte do bota-fora</b> (km). Entra no custo do transporte do solo escavado que sobra.',
  'crit.largRua': '<b>Largura da rua</b> (m), de meio-fio a meio-fio. Desenha a rua e, com o passeio, dá o comprimento do ramal predial.',
  'crit.folgaCava': '<b>Folga da cava do PV</b> (m, cada lado) — espaço de trabalho em volta do poço. A escavação do PV é medida à parte porque as composições de PV da EMOP, SINAPI e SCO <b>não incluem escavação</b>.',
  'crit.lastro': '<b>Lastro de brita sob o PV</b> (m). Usual 0,10 m.',
  'crit.empol': '<b>Empolamento do solo</b> — quanto o solo escavado aumenta de volume. Usual <b>1,30</b>. Multiplica o volume do bota-fora.',
  /* ── Dados: elevatória e sifão ── */
  'crit.eCiclo': '<b>Ciclo mínimo das bombas</b> (min) — tempo entre duas partidas. Define o volume útil do poço: <b>V = Q·T/4</b> (NBR 12208). Usual 10 min.',
  'crit.eDet': '<b>Detenção máxima no poço</b> (min). Esgoto parado vira séptico e cheira. NBR 12208: <b>30 min</b> na vazão mínima.',
  'crit.eEta': '<b>Rendimento do conjunto motor-bomba</b>. Usual 0,55 a 0,65. Define a potência: P = γ·Q·AMT/η.',
  'crit.eFolgaMotor': '<b>Folga do motor</b> (%) sobre a potência calculada, antes de escolher o motor comercial. Usual 20 %.',
  'crit.eVmin': '<b>Velocidade mínima no recalque</b> (m/s). Abaixo disso os sólidos decantam. <b>0,60 m/s</b>.',
  'crit.eVmax': '<b>Velocidade máxima no recalque</b> (m/s). Acima disso as perdas e o golpe de aríete crescem. <b>3,0 m/s</b>.',
  'crit.eKloc': '<b>Σ K das perdas localizadas</b> (curvas, registros, válvula de retenção) do recalque. Perda = K·V²/2g. Usual 10.',
  'crit.eSub': '<b>Submergência mínima da bomba</b> (m) abaixo do nível mínimo da água no poço, para não aspirar ar.',
  'crit.eRecRec': '<b>Recobrimento do recalque</b> (m). Usual 1,00 m.',
  'crit.sVmin': '<b>Velocidade mínima no sifão</b> (m/s). Autolimpeza: <b>0,60 m/s</b> (o sifão trabalha cheio e não pode acumular sólidos).',
  'crit.sDmin': '<b>Diâmetro mínimo do sifão</b> (mm).',
  'crit.sLinhas': '<b>Número de linhas do sifão</b>. Com 2, uma linha atende a vazão inicial (velocidade suficiente) e a outra entra de reforço na vazão final.',
  'crit.sProt': '<b>Proteção sob o obstáculo</b> (m) — distância do topo do sifão ao fundo do córrego ou da galeria.',
  'sel.mat': '<b>Tubo da rede</b> até DN 400: PVC parede maciça (NBR 7362), PVC corrugado ou concreto. Define o <b>diâmetro interno real</b>, o Manning e o preço.',
  'sel.pav': '<b>Pavimento</b> sobre as valas: asfalto, bloco intertravado ou terra. Muda só a recomposição no orçamento.',
  'sel.eMat': '<b>Tubo do recalque</b> (PVC, PEAD, ferro fundido…). Define o coeficiente de Hazen-Williams e o golpe de aríete.',
  'sel.sMat': '<b>Tubo do sifão</b>. Trabalha sob pressão, por isso se usa ferro fundido ou PEAD.',
  'chk.remanso': '<b>Controle de remanso</b> — o nível d’água de saída do PV nunca fica acima do de chegada, para o esgoto não voltar para o trecho de montante. Recomendado ligado.',
  'chk.usaDI': '<b>Usar o diâmetro interno real</b> do tubo. Ligado: a hidráulica usa o DI (menor que o DN). Desligado: DI = DN (mais antigo, menos preciso).',
  /* ── PV ── */
  'no.ct': '<b>Cota do terreno</b> (m) neste PV. Define a profundidade. Mexer nela move o PV na vertical e refaz o perfil.',
  'no.nome': '<b>Nome do PV</b>. Sem nome, o programa numera na ordem do escoamento (coletor 1 é o maior).',
  'no.qcI': '<b>Contribuição concentrada inicial</b> (L/s) — escola, hospital, indústria, condomínio que lança neste ponto. Soma à vazão inicial.',
  'no.qcF': '<b>Contribuição concentrada final</b> (L/s). Soma à vazão final.',
  'no.cfEx': '<b>Cota de fundo disponível no lançamento</b> (m) — do interceptor, PV existente ou ETE. A rede chega com o fundo nesta cota; se ficar abaixo, o programa sugere elevatória. Vazio = sem restrição.',
  /* ── Trecho ── */
  'trk.rua': '<b>Rua</b> a que o trecho pertence. Serve só para agrupar e dar nome nos desenhos.',
  'tlad': '<b>Lotes que contribuem</b> — dos 2 lados, de 1 lado ou nenhum (trecho em frente a parque, rio, muro). Define a vazão do trecho <b>e as ligações prediais</b>: nenhum lote, nenhuma ligação.',
  'tst': '<b>Testada do lote neste trecho</b> (m). Vazio usa a testada padrão dos Dados (12 m). Lotes maiores ou menores mudam o número de ligações: 60 m ÷ 12 m = 5 por lado. Ao mudar, as ligações do trecho voltam ao automático.',
  'trk.ladoLote': '<b>Lado do lote</b> quando só um lado contribui: esquerda ou direita de quem anda a favor do esgoto.',
  'tfix.D': '<b>DN fixo</b> — força o diâmetro neste trecho. Automático escolhe o menor que atende a lâmina com a menor escavação.',
  'tfix.I': '<b>Declividade fixa</b> (%). Vazio = calculada pela tensão trativa mínima e limitada pela velocidade máxima.',
  'trk.loc': '<b>Onde passa</b> — leito da via (recobrimento 0,90 m) ou <b>passeio</b> (0,65 m, ramais mais curtos, recomposição de calçada em vez de asfalto). No desenho a rede sai do eixo e vai para o lado do passeio escolhido.',
  'trk.ladoPas': '<b>Lado do passeio</b> em que a rede passa: esquerdo ou direito de quem anda a favor do esgoto. Os ramais do mesmo lado ficam curtos; os do outro lado cruzam a rua.',
  'trk.mat': '<b>Tubo deste trecho</b>, se diferente do projeto (ex.: concreto num trecho grande, PVC nos demais).',
  'sif.on': '<b>Travessia</b> — marque Sifão invertido quando o trecho passa por baixo de córrego, galeria ou adutora. O sifão trabalha cheio, sob pressão.',
  'sif.n': '<b>Linhas do sifão</b> neste trecho. Vazio usa o valor dos Dados.',
  'sif.cota': '<b>Cota do fundo do obstáculo</b> (m). Vazio = 1,5 m abaixo do terreno.',
  /* ── Elevatória ── */
  'eee.ate': '<b>Recalca para</b> — o PV de destino na própria rede (o recalque termina no primeiro PV que recebe outra rede) ou um ponto fora dela (ETE, PV existente).',
  'eee.extCota': '<b>Cota de chegada</b> (m) do recalque no ponto de descarga. Define o desnível geométrico Hg.',
  'eee.extL': '<b>Extensão do recalque</b> (m). Define a perda de carga (Hazen-Williams) e a altura manométrica.',
  /* ── botões ── */
  'act.gerar': '<b>🧭 Gerar rede</b> — cria PVs (cruzamentos, deflexões, pontas, a cada distância máxima), o sentido do esgoto (menor custo até o lançamento) e a numeração. Descarta ajustes manuais, elevatórias e sifões.',
  'act.sugEEE': '<b>🏭 Elevatória</b> — procura onde a rede por gravidade passa da profundidade de alerta ou chega abaixo do lançamento e cria a elevatória, já calculada (NBR 12208). ↶ Desfazer reverte.',
  'act.lotes': '<b>🏘 Lotes</b> — mostra ou esconde os lotes (retângulos âmbar) e as ligações prediais. Aproxime para ver os lotes.',
  'act.rotulos': '<b>🏷 Rótulos</b> — alterna entre poucos, médios e todos os textos do desenho.',
  'act.enquadrar': '<b>⛶ Enquadrar</b> — ajusta o zoom para mostrar a rede inteira.',
  'act.cadDxf': '<b>⬇ DXF</b> — planta, ligações, quadro de trechos, perfis e carimbo em camadas ESG-*. Abre no AutoCAD, BricsCAD, QGIS…',
  'act.cadDwg': '<b>⬇ DWG</b> — o mesmo desenho em DWG (AutoCAD 2000). Se não gerar, baixa o DXF.',
  'act.svgPlanta': '<b>⬇ SVG</b> — planta em imagem vetorial, para Word, PDF ou Illustrator.',
  'act.exemplo': '<b>Exemplo</b> — bairro em malha já calculado, para conhecer o programa.',
  'act.exemploMorro': '<b>⛰ Exemplo com morro</b> — encosta de ≈ 5 % que desce até o fundo de um vale; uma elevatória recalca até a ETE na crista. Mostra elevatória, recalque, degraus e ligações.',
  'act.orcEnviar': '<b>🚀 Enviar ao Orçamento</b> — leva os itens e a memória de cálculo para o programa de Orçamento, no mesmo formato do “Importar Lista”.',
  'act.orcTres': '<b>3 soluções, cronograma e PDF</b> — abre a janela comum do site: compara as soluções nos três bancos e gera cronograma e PDF.',
  'act.xlsDim': '<b>Excel do dimensionamento</b> — trechos, PVs, cavas e elevatórias.',
  'act.xlsOrc': '<b>Excel do orçamento</b> — quantitativos, códigos e preços do banco escolhido.',
  'act.word': '<b>Memorial em Word</b> — critérios, cálculo, quantitativos e orçamento.',
  'act.imprimir': '<b>Imprimir / PDF</b> do memorial.',
  'act.fator1': '<b>Voltar a 100 %</b> — volta a vazão do cenário 3D à vazão de projeto.',
  'modo.sel': '<b>🖐 Selecionar</b> — arrasta a vista; clique em rua, PV, trecho ou ligação para editar; arraste um PV ou uma ligação (quadradinho âmbar) para movê-los.',
  'modo.rua': '<b>✏ Desenhar rua</b> — clique os pontos do eixo; duplo clique ou Enter termina. O nome da rua é digitado uma única vez.',
  'modo.saida': '<b>🔻 Lançamento</b> — marca onde o esgoto sai da rede (ETE, interceptor, PV existente). A rede é refeita para escoar até lá.',
  'modo.pv': '<b>◉ PV</b> — clique num trecho para inserir um PV nele.',
  'modo.lig': '<b>⟶ Trecho</b> — clique no PV de montante e depois no de jusante para criar um trecho.',
  'modo.del': '<b>🗑 Excluir</b> — clique em rua, PV, trecho ou ligação predial.',
  'modo.lgadd': '<b>🏠 + Ligação</b> — clique num trecho no ponto da nova ligação predial. O lado da rua é o lado do clique. Depois arraste para ajustar.',
  't3.lig': '<b>🏠 Ligações</b> — liga ou desliga os ramais prediais (um por lote, na posição da planta) e as caixas de inspeção.',
  't3.terr': '<b>⛰ Terreno</b> — superfície do terreno natural, interpolada pelas cotas dos PVs, das ruas e da topografia. Ajuda a ver o morro e a profundidade dos tubos. Desligue para enxergar a rede de baixo.',
  't3.vala': '<b>⛏ Vala</b> — mostra o volume escavado em volta de cada tubo.',
  't3.fluxo': '<b>🌊 Fluxo</b> — partículas no sentido do escoamento.',
  't3.voo': '<b>✈ Percorrer</b> — voa ao longo do coletor tronco.',
  't3.redim': '<b>🛠 Redimensionar</b> — grava a vazão do cenário como vazão de projeto e recalcula os diâmetros.',
  't3.solo': '<b>🛣 Rua</b> — transparência da rua, para enxergar os tubos.',
  't3.real': '<b>🏙 Realista</b> — 3D como no Pavimento Intertravado: céu com nuvens, sol e sombras, asfalto, meio-fio e calçada, terreno com grama, os LOTES da planta com muros, portões e casas, árvores e horizonte. Desligado = 3D técnico (só rede e ruas cinza). Só desenho: nenhum cálculo muda.',
  't3.cen': '<b>🏘 Cenário</b> — painel com Qualidade, Sol, os níveis do cenário (calçada, terreno, casas, muros, árvores, grama, horizonte, satélite) e para locar árvores e postes.',
  't3.rua': '<b>👁 Nível da rua</b> — põe a câmera em pé (1,70 m) no meio da rua mais longa, olhando ao longo dela.',
  't3.andar': '<b>🚶 Andar</b> — anda pela rua: W/S ou ↑/↓ anda, A/D de lado, ←/→ gira, arraste para olhar, roda do mouse dá passos, Shift corre, Esc sai. No celular use os botões na tela.',
  't3.png': '<b>🖼 Imagem PNG</b> — baixa a imagem do 3D exatamente como está na tela (use Qualidade Alta/Ultra para a melhor imagem).',
  't3.geo': '<b>🛰 Georreferenciar</b> — abre o mapa com satélite para posicionar a rede (coordenadas, giro, pontos de controle ou projeto já em UTM), exportar KMZ para o Google Earth e pôr o satélite no chão do 3D.',
  't3.ev': '<b>↕ Exagero vertical</b> — estica as alturas para ver profundidades e degraus.',
  'pf': '<b>Perfil</b> — terreno, tubo e PVs ao longo do coletor escolhido. O exagero vertical só estica o desenho.'
};
(function ajudaIniciar() {
  if (window._ajOk) return; window._ajOk = true;
  const pop = document.createElement('div'); pop.id = 'aj-pop'; pop.hidden = true; document.body.appendChild(pop);
  const ATTR = [['data-crit', 'crit.'], ['data-sel', 'sel.'], ['data-chk', 'chk.'], ['data-trk', 'trk.'], ['data-tfix', 'tfix.'], ['data-sif', 'sif.'], ['data-eee', 'eee.'], ['data-tst', 'tst', 1], ['data-tlad', 'tlad', 1]];
  function chave(el) {
    if (!el || !el.closest) return null;
    const bt = el.closest('button,[data-act],[data-plmodo],[data-t3]');
    if (bt) { const d = bt.dataset; if (d.act && AJ['act.' + d.act]) return 'act.' + d.act; if (d.plmodo && AJ['modo.' + d.plmodo]) return 'modo.' + d.plmodo; if (d.t3 && AJ['t3.' + d.t3]) return 't3.' + d.t3; }
    const f = el.closest('.f'); if (!f) return window.ajTexto ? ajTexto(el) : null;   /* ES-04: quadros, tabelas e textos (76-ajuda2.js) */
    const no = f.querySelector('[data-no][data-k]'); if (no && AJ['no.' + no.dataset.k]) return 'no.' + no.dataset.k;
    for (const [at, pre, fixo] of ATTR) { const c = f.querySelector('[' + at + ']'); if (c) { const k = fixo ? pre : pre + c.getAttribute(at); if (AJ[k]) return k; } }
    if (f.querySelector('#pf-col,#pf-ate,#pf-ev')) return 'pf';
    return window.ajTexto ? ajTexto(el) : null;
  }
  let alvo = null, fixo = false, tm = 0;
  function mostrar(el, k) {
    alvo = el; pop.innerHTML = AJ[k]; pop.hidden = false; pop.style.pointerEvents = 'none';
    const r = el.getBoundingClientRect(), w = Math.min(320, innerWidth - 24); pop.style.width = w + 'px'; pop.style.left = Math.min(Math.max(12, r.left), innerWidth - w - 12) + 'px'; pop.style.top = '0px';
    const h = pop.offsetHeight; let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6); pop.style.top = y + 'px';
  }
  function esconder() { clearTimeout(tm); pop.hidden = true; alvo = null; fixo = false; }
  document.addEventListener('mouseover', e => { if (fixo) return; const k = chave(e.target);
    if (!k) { if (alvo && !e.target.closest('#aj-pop')) esconder(); return; }
    const el = (window._ajEl && window._ajEl.contains(e.target) ? window._ajEl : null) || e.target.closest('button,.f') || e.target; window._ajEl = null; if (el === alvo) return;
    if (el.tagName === 'BUTTON' && el.title) { el.dataset.t0 = el.title; el.removeAttribute('title'); }   /* o balão do programa substitui o title do navegador */
    clearTimeout(tm); tm = setTimeout(() => mostrar(el, k), 220); });
  document.addEventListener('mouseout', e => { if (!fixo && !e.relatedTarget) esconder(); });
  document.addEventListener('focusin', e => { if (matchMedia('(hover: none)').matches) return; const k = chave(e.target); if (k) mostrar(e.target.closest('.f') || e.target, k); });
  document.addEventListener('focusout', () => { if (!fixo) esconder(); });
  document.addEventListener('click', e => { const i = e.target.closest('.aj-i');
    if (i) { e.preventDefault(); e.stopPropagation(); const f = i.closest('.f'), k = chave(f); if (!k) return; if (fixo && alvo === f) esconder(); else { mostrar(f, k); fixo = true; pop.style.pointerEvents = 'auto'; } return; }
    if (!e.target.closest('#aj-pop') && (fixo || alvo)) esconder(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
  addEventListener('scroll', () => { if (!fixo) esconder(); }, true);
  /* ⓘ em cada rótulo com explicação (para tocar no celular) — refeito a cada desenho de tela */
  let ob = 0;
  const marca = () => { document.querySelectorAll('.f').forEach(f => { const l = f.querySelector('label'); if (!l || l.querySelector('.aj-i') || !chave(l)) return; const b = document.createElement('span'); b.className = 'aj-i'; b.textContent = 'ⓘ'; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Explicação'); l.appendChild(b); }); };
  new MutationObserver(() => { clearTimeout(ob); ob = setTimeout(marca, 60); }).observe(document.body, {childList: true, subtree: true});
  marca();
})();
