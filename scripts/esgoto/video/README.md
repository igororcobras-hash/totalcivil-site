# Vídeo do Programa de Esgoto Sanitário

Material para o vídeo de apresentação (mesmo modelo dos vídeos de Pavimento e Intertravado).

- `roteiro_esgoto.md` — texto de cada cena (Francisca e Antônio alternados).
- `gerar_voz.py` — gera `audio/cena01.mp3 … cena10.mp3` com as vozes neurais da Microsoft (edge-tts).
- `audio/` — áudios gerados (criados pelo fluxo `.github/workflows/esgoto-video-voz.yml` na branch `esgoto-video`).

Nada aqui vai para o site: a rotina de publicação só roda na branch `main`.

## Produção do vídeo (15/11/2026)
- `producao/lib.js`, `producao/record.js`: gravam cada cena do programa (Playwright + Chrome, 1920×1080) com legendas e cursor; a duração de cada cena = áudio + folga.
- `producao/build7.sh`: cena do 3D (imagens de alta qualidade com zoom lento, porque o 3D realista é lento sem placa de vídeo).
- `producao/montar.sh`: junta as cenas e o áudio.
- Vídeo pronto: `videos/esgoto-apresentacao.mp4` (1920×1080, 2:50). Só vai ao site quando esta branch entrar na `main`.
