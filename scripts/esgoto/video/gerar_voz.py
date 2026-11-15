# Gera a narração do vídeo do Esgoto Sanitário (Total Civil), uma cena por arquivo.
# Vozes Microsoft neurais pt-BR alternadas cena a cena, como nos vídeos de Pavimento.
# Uso:  pip install edge-tts   e depois   python gerar_voz.py
# Saída: pasta "audio" com cena01.mp3 ... cena10.mp3  (envie todos de volta no chat)
import asyncio, os
import edge_tts
print('edge-tts', getattr(edge_tts, '__version__', '?'))

F = "pt-BR-FranciscaNeural"
A = "pt-BR-AntonioNeural"

# Siglas escritas com hífen entre as letras para a pronúncia sair correta.
CENAS = [
 (F, "Este é o programa de Esgoto Sanitário do Total Civil. Ele dimensiona a rede coletora conforme a N-B-R nove mil seiscentos e quarenta e nove, do traçado das ruas até o orçamento e a memória de cálculo, em poucos cliques."),
 (A, "Começo pela aba Dados. Informo a população inicial e final, o consumo per capita, o coeficiente de retorno e os coeficientes K um e K dois. O programa calcula as vazões de projeto, e os critérios hidráulicos, como Manning, tensão trativa mínima e lâmina máxima, já vêm com os valores da norma. Passando o mouse em cada campo, aparece uma explicação."),
 (F, "No Traçado, eu desenho as ruas direto no mapa, e o nome de cada rua é digitado uma única vez. Também posso colar a tabela de ruas do Excel. Em seguida, aperto Gerar rede, e o programa cria os P-Vs, define o sentido do esgoto pelo terreno e traça as ligações prediais de cada lote."),
 (A, "Neste exemplo, a encosta tem cerca de cinco por cento de declividade. O esgoto desce até o fundo do vale, e uma elevatória recalca até a E-T-E, na parte alta. O programa mostra a elevatória, o recalque e os degraus nos P-Vs."),
 (F, "Na aba Dimensionamento, cada trecho recebe vazão, diâmetro, declividade, velocidade, lâmina e tensão trativa, verificados pela N-B-R. Se algum trecho não atende, o programa avisa, e eu posso redimensionar a rede. O recobrimento mínimo também é conferido."),
 (A, "Em Perfis e seções, cada trecho tem o perfil longitudinal, com o terreno, o fundo do coletor, os P-Vs, os degraus e a linha d'água. Dá para baixar o perfil em S-V-G, ou todos de uma vez."),
 (F, "O três dê mostra a rede enterrada sob a rua. No modo realista, aparecem casas, muros, árvores e postes, e eu posso andar pela rua em primeira pessoa. Também dá para georreferenciar o projeto sobre o satélite e exportar para o Google Earth."),
 (A, "No Orçamento, as quantidades saem direto do projeto: metros de rede por diâmetro, P-Vs, ligações prediais e vala. O programa monta três soluções, com cronograma, e eu envio tudo para o programa de Orçamento."),
 (F, "O Memorial reúne os critérios, as fórmulas da norma e os resultados. Tudo sai em Word, Excel e P-D-F, e o projeto sai em D-X-F e D-W-G, para o CAD."),
 (A, "Do traçado à memória de cálculo, em um só programa. Esgoto Sanitário, no Total Civil, ponto com, ponto bê erre."),
]

async def main():
    os.makedirs("audio", exist_ok=True)
    for i, (voz, texto) in enumerate(CENAS, 1):
        arq = f"audio/cena{i:02d}.mp3"
        for tentativa in range(1, 5):
            try:
                await edge_tts.Communicate(texto, voz).save(arq)
                print("ok", arq)
                break
            except Exception as e:
                print("falhou", arq, "tentativa", tentativa, type(e).__name__)
                if tentativa == 4:
                    raise
                await asyncio.sleep(5 * tentativa)

asyncio.run(main())
