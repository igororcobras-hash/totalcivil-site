---
name: video-programa
description: Use ao criar o vídeo de apresentação de um programa do Total Civil (totalcivil.com.br): roteiro, voz em português, gravação da tela, 3D, montagem e entrega. Modelo testado no vídeo do Esgoto Sanitário (15/11/2026).
---

# Vídeo de apresentação de um programa Total Civil

Modelo = vídeo do Esgoto Sanitário (2:50, 1920×1080, 30 fps). Os vídeos de Pavimento Flexível, Intertravado e Drenagem seguem o mesmo padrão visual. Arquivos-modelo em `.claude/skills/video-programa/modelo/` (copie e troque textos, seletores e nome do programa).

## Padrão do vídeo
- Capa: fundo azul escuro em degradê, "TOTAL CIVIL · PROGRAMAS DE ENGENHARIA", título grande (2ª palavra em laranja `#f2894a`), uma frase, a norma e botão laranja com a URL.
- Cenas: gravação da tela do programa, cursor desenhado, legenda embaixo (título 34 px + subtítulo 23 px, caixa escura arredondada), uma cena por aba/assunto.
- Fecho: "Do traçado à memória" (ou equivalente) com 5 tópicos e `totalcivil.com.br`.
- Narração em 1ª pessoa técnica, uma voz por cena, ALTERNANDO `pt-BR-FranciscaNeural` e `pt-BR-AntonioNeural`. Siglas com hífen para a voz soletrar (N-B-R, P-D-F, D-X-F) e "ponto com, ponto bê erre" no endereço.
- Cerca de 10 cenas de 10–26 s. O texto de cada cena tem de caber na duração da imagem; o áudio manda na duração.

## Roteiro de trabalho (nesta ordem)
1. **Perguntar só o que muda o resultado**: programa, objetivo, se há narração. Não perguntar sobre a voz: o padrão acima já vale.
2. **Roteiro** (`roteiro_<programa>.md`) com título, texto da voz e o que aparece na tela, por cena.
3. **Voz** (`gerar_voz.py`, edge-tts). O sandbox NÃO alcança o serviço da Microsoft: gerar pelo GitHub Actions (`modelo/workflow-voz.yml`, dispara no push da branch do vídeo e grava `audio/cenaNN.mp3` de volta na branch). Manter o laço de tentativas (4×, espera crescente): a 1ª execução falhou com `NoAudioReceived`. Acompanhar com `gh api` e baixar com `git fetch` + `git checkout origin/<branch> -- <pasta>/audio`.
4. **Gravar a tela** (`record.js`): Playwright + `/usr/bin/google-chrome`, 1920×1080, `recordVideo`. Servidor local `python3 -m http.server 8765` na raiz do repositório. Duração de cada cena = duração do áudio + 0,4 s antes + 0,9 s depois (tabela `AUD`; medir com `ffprobe`). Cortar o início do webm e codificar `fps=30,format=yuv420p`, libx264 crf 18 veryfast, um mp4 por cena em `cenas/sNN.mp4`. Esperar +600 ms antes de fechar o contexto (senão o vídeo termina cedo).
5. **3D**: o 3D realista roda a ~20 s por quadro sem placa de vídeo. NÃO gravar ao vivo: tirar 2 a 3 imagens (`still3d*.js`) e fazer zoom lento com `zoompan` + `xfade` (`build7.sh`). Mostrar a rede enterrada (modo técnico, rua a 20 %, vala ligada), o 3D realista e o nível da rua.
6. **Montar** (`montar.sh`): áudio de cada cena preenchido até a duração real do mp4 (`adelay=400|400,apad -t dur`), concat demuxer `-c copy`, AAC 160k, mux com `-c:v copy -movflags +faststart`; nome temporário e `mv` quando o ffmpeg termina bem.
7. **Conferir antes de entregar**: folha de contato com 2 quadros por cena (25 % e 75 %), olhar de verdade; `ffprobe` (duração, 1920×1080, h264+aac); `volumedetect` (pico perto de −3 dB). Dizer o que NÃO foi conferido (por exemplo sincronia ouvindo o vídeo inteiro).
8. **Entregar**: `SendUserFile` do mp4 com uma linha de contexto; guardar em `videos/<programa>-apresentacao.mp4` (mesma pasta dos outros) e os scripts em `scripts/<programa>/video/`.

## Armadilhas já encontradas
- three.js: a CDN fica bloqueada. Servir o three r128 local por interceptação de rotas; a regra que ABORTA a CDN tem de ser registrada PRIMEIRO (a última registrada vence).
- Script de cursor: `document.body` ainda é nulo no início; iniciar em `DOMContentLoaded`.
- O aviso (`#toast`) do programa cobre a legenda: esconder com CSS injetado.
- O programa pergunta "Onde você vai usar?": clicar em "Computador" antes de gravar.
- Seletores do Esgoto: `#abas [data-tab="dados|tracado|dim|perfil|t3|orc|memo"]`, `button[data-act="exemplo|exemploMorro|gerar|lotes|orcEnviar"]`, `[data-t3="persp|rua|solo|vala|real"]`. Outro programa tem seletores próprios: descobrir com um script de exploração curto antes de escrever as cenas.
- Folha de contato com `vstack` exige imagens da mesma largura.

## Publicação (regra do dono)
- Branch própria para o vídeo; NÃO empurrar para a `main` sem o "pode publicar" (a `main` publica o site). A branch `esgoto-video` tem histórico separado: para publicar, copiar só `videos/<programa>-apresentacao.mp4` e `scripts/<programa>/video/` para a `main`, sem merge.
- Depois de publicar: Actions › "Publicar site protegido" verde; o arquivo abre em `https://totalcivil.com.br/videos/<programa>-apresentacao.mp4`. Oferecer o texto de atualização do mapa do site.
- Ligar o vídeo à página do programa (botão ou cartão) mexe no `index.html` do programa: só quando o dono pedir.
