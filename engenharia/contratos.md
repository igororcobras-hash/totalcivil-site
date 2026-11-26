# Contratos de dados entre especialistas
Cada dado passa com valor, unidade, origem e data.

| De | Para | Dado | Unidade |
|---|---|---|---|
| eng-geo-topografia | todos | datum, fuso, referência de altitude | SIRGAS2000, UTM, H ortométrica |
| eng-geo-topografia | drenagem, esgoto, pavimentos | eixos, estacas, cotas do terreno natural | m |
| eng-solos-flexivel | intertravado, calculista | CBR e expansão do subleito por segmento | % |
| eng-solos-flexivel / eng-intertravado | drenagem | largura da pista, caimento, tipo de meio-fio e sarjeta | m, % |
| eng-drenagem | pavimentos | greide proposto e editado, corte e aterro | m, m³ |
| eng-drenagem | sanitarista | posição e cota das galerias (interferências) | m |
| eng-drenagem / eng-sanitarista | calculista | dimensões de PV, galeria, poço; profundidade; cargas | m, kN |
| eng-sanitarista | pavimentos | valas a repor (largura, extensão) | m, m² |
| todos | eng-orcamento | quantitativos com critério de medição | unidade do banco |
| eng-orcamento | todos | itens sem composição ou sem preço | lista |
