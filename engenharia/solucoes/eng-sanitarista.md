# Soluções reais de redimensionamento — Esgoto sanitário (treino da IA do site)
Marcas: [PROGRAMA] é o que o programa faz; [CONFERIR na NBR 9649/14486/12208] conhecimento usual ainda não conferido na norma.

## Fórmulas usadas no cálculo
- Vazão inicial e final: Qi = K2·C·Pi·qi/86400; Qf = K1·K2·C·Pf·qf/86400 (L/s), mais infiltração por km; mínimo 1,5 L/s por trecho [CONFERIR NBR 9649].
- Manning com o diâmetro INTERNO real do tubo; seção parcial: θ = 2·arccos(1 − 2y/D), A = D²/8·(θ − sen θ), Rh = A/(D·θ/2).
- Tensão trativa: τ = γ·Rh·I ≥ 1,0 Pa (PVC) [CONFERIR]. Declividade mínima aproximada: I mín. = 0,0055·Qi^(−0,47) (m/m, Qi em L/s); o programa resolve a equação exata de τ.
- Lâmina: y/D ≤ 0,75; ≤ 0,50 se V > Vc = 6·√(g·Rh). Velocidade máxima 5 m/s.
- Recobrimento mínimo na rua e 0,65 m no passeio [PROGRAMA]. Tubo de queda quando o degrau no PV passa de 0,50 m.

## Problema → causa → solução real
1. **τ abaixo de 1 Pa** → declividade fraca. Aumentar a declividade (rede mais funda a jusante). Não aumentar o DN: piora a autolimpeza.
2. **y/D acima do limite** → aumentar o DN (nunca menor que o que chega) ou a declividade; conferir Vc (acima dela o limite cai para 0,50).
3. **V acima de 5 m/s** → declividade forte: diminuir a declividade do trecho e vencer o desnível com degrau/tubo de queda no PV.
4. **Rede muito funda (acima da profundidade máxima) ou chegada abaixo do coletor existente** → estação elevatória + recalque (NBR 12208) [PROGRAMA ES-02: botão 🏭 Elevatória].
5. **Travessia de canal ou galeria** → sifão invertido (2 linhas, V ≥ 0,6 m/s com a vazão inicial na 1ª linha) [PROGRAMA].
6. **Remanso (NA de saída acima do NA de chegada)** → o programa ajusta a cota de saída para o NA não subir.
7. **Interferência com a drenagem** → pedir ao especialista de drenagem a cota das galerias; o esgoto passa por baixo, com folga.

## Exemplos resolvidos (PVC, n = 0,013)
- Qi = 1,5 L/s: I mín. = 0,0055 × 1,5^−0,47 = 0,00455 m/m (0,455 %). No DN150 com essa declividade: y/D 0,258 e τ = 1,01 Pa (atende).
- No mesmo DN150 e mesma declividade, Qf = 6 L/s dá y/D 0,549 (abaixo de 0,75: atende).
