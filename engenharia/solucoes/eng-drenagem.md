# Soluções reais de redimensionamento — Drenagem pluvial (treino da IA do site)
Material de apoio para as IAs do botão 💬. Marcas: [FONTE IPR-724] conferido no manual do DNIT; [PROGRAMA] é o que o programa faz; [CONFERIR] conhecimento usual.

## Fórmulas usadas no cálculo
- Vazão (método racional) [FONTE IPR-715]: Q (m³/s) = C · i (mm/h) · A (km²) / 3,6. Com A em hectares: Q (L/s) = 2,78 · C · i · A.
- Tempo de concentração (Kirpich) [FONTE IPR-715]: tc (h) = 0,95 · (L³/H)^0,385, com L em km e H em m. O tc mínimo do manual é 10 min [FONTE IPR-724]; o programa vem com 5 min (decisão do dono).
- Manning (conduto livre): Q = (1/n) · A · Rh^(2/3) · I^(1/2). Tubo cheio: Q = (0,3117/n) · D^(8/3) · I^(1/2).
- Seção circular parcial: θ = 2·arccos(1 − 2y/D); A = D²/8 · (θ − sen θ); P = D·θ/2; Rh = A/P; largura da lâmina T = D·sen(θ/2).
- Froude: Fr = V / √(g · A/T). Velocidade crítica de ventilação: Vc = 6·√(g·Rh).
- Sarjeta (Izzard): Q = 0,375 · (z/n) · I^(1/2) · y^(8/3), com z = 1/declividade transversal.
- Boca de lobo (IPR-724): Q = 1,703 · L · y^1,5 (L e y em m, Q em m³/s).
- Perda em PV (linha piezométrica): Δh = k · V²/2g; com remanso, o programa usa a velocidade real Q/A da lâmina [PROGRAMA DR-16].

## Limites que mandam no diâmetro
- Lâmina y/D: manual de 20 % a 85 % [FONTE IPR-724]; programa 0,75 (`crit.yD`) [PROGRAMA].
- Ventilação (colchão de ar) [PROGRAMA DR-15d]: y/D máximo = o menor entre 0,75; 0,50 se V > Vc; 0,70 se Froude entre 0,86 e 1,13; e o que deixa 0,10 m de ar.
- Velocidade: manual de 1,0 a ~4,5 m/s em concreto [FONTE IPR-724]; programa V mín. 0,60 e V máx. 5,0 (decisão do dono).
- Ø mínimo 0,40 m e recobrimento mínimo 0,60 m [FONTE IPR-724]. Ø nunca diminui de montante para jusante [PROGRAMA].

## Problema → causa → solução real (na ordem que o programa aplica)
1. **y/D acima do limite / tubo em carga** → vazão maior que a capacidade. Soluções, da mais barata para a mais cara: (a) aumentar a declividade, se houver altura no greide; (b) aumentar o Ø para o próximo comercial; (c) galeria celular (aduelas) quando o Ø fica grande e a profundidade não deixa; (d) dividir a vazão: nova caixa a montante desviando para outra rede, ou 2 linhas. O 🛠 Redimensionar do 3D faz: reduz Ø com folga demais (respeitando V máx. e o Ø de montante) → troca o Ø primeiro → corrige sarjetas → autoCorrigir → Ø de novo [PROGRAMA DR-15b].
2. **Velocidade acima do máximo** → declividade forte demais. Solução: PV com degrau/queda, diminuindo a declividade dos trechos; no lançamento, bacia de dissipação (ainda NÃO implementada no programa: dimensionar à parte).
3. **Velocidade abaixo do mínimo** (sedimentação) → declividade fraca. Solução: aumentar a declividade (rede mais funda a jusante) ou diminuir o Ø quando há folga.
4. **Recobrimento menor que o mínimo** → rede rasa. Solução: aprofundar o PV de montante; onde não dá, recobrimento reduzido com proteção (laje/envelopamento de concreto) [PROGRAMA DR-16 `t.recDes`].
5. **Rua alagando (sarjeta passa da largura T)** → caixas longe demais. Solução: nova caixa de ralo/boca de lobo A MONTANTE, ligada a favor do fluxo, mínimo 5 m entre caixas; no máximo 1 caixa por sarjeta em cada PV, ou 2 lado a lado com ramais próprios [PROGRAMA DR-15b/DR-18].
6. **Saída afogada no deságue (NA acima do fundo)** → vira alerta se a piezométrica a partir do NA deixa folga em todos os PVs e não sai pelas grelhas; usar válvula flap. Senão é erro: levantar a saída (rede rasa), outro deságue ou aterro no lançamento [PROGRAMA DR-16].
7. **PV raso / câmara não cabe** → aprofundar os PVs para a câmara mínima + laje + pescoço (0,50 m) [PROGRAMA DR-14/21].
8. **PV maior que o modelo da tabela EMOP/SINAPI/SCO** → PV ao lado no tamanho padrão, a 3,5 m, recebendo parte dos ramais [PROGRAMA DR-19].
9. **PV com mais de 4 m** → sugerir galeria mais baixa (não é aplicada sozinha: decisão do projetista).
Os botões 🛠 Corrigir erros / 🛠 Corrigir alertas (aba 13) refazem a rede inteira até o deságue e desfazem o passo que criar erro novo [PROGRAMA DR-21].

## Exemplos resolvidos (n = 0,015, I = 0,5 %, y/D máx. 0,75)
- Capacidade com y/D 0,75: Ø0,60 = 0,343 m³/s (V 1,51 m/s); Ø0,80 = 0,739 (V 1,83); Ø1,00 = 1,340 (V 2,12); Ø1,20 = 2,179 (V 2,39).
- Q = 0,80 m³/s: Ø0,80 não atende (0,739 < 0,80). Duas soluções reais: (a) Ø1,00 a 0,5 % → y/D 0,526, V 1,91 m/s, Fr 0,94 (abaixo do limite de 0,70 para Froude perto de 1), Vc 9,55 m/s; (b) manter Ø0,80 com declividade 0,586 % (V 1,98 m/s), se o greide permitir.
- Boca de lobo L = 1,00 m e lâmina 0,10 m: Q = 1,703 × 1,00 × 0,10^1,5 = 0,0539 m³/s.
- Cota máxima da geratriz inferior com greide 10,00, recobrimento 0,60, Ø1,00 e parede 0,10 m: 10,00 − 0,60 − 1,00 − 0,10 = 8,30 m.
