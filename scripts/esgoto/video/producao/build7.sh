#!/bin/sh
# Cena 7 (3D): três imagens com zoom lento e fusão entre elas, um único arquivo codificado.
cd /home/claude/video/shots
Z='x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2):s=1920x1080:fps=30'
ffmpeg -v error -y -i s7_B.png -i s7_A.png -i s7_C.png -filter_complex \
"[0]scale=3840:-1,zoompan=z='1.0+0.00035*on':d=168:$Z[v0];\
[1]scale=3840:-1,zoompan=z='1.07-0.00035*on':d=168:$Z[v1];\
[2]scale=3840:-1,zoompan=z='1.0+0.00030*on':d=203:$Z[v2];\
[v0][v1]xfade=transition=fade:duration=0.6:offset=5.0[x1];[x1][v2]xfade=transition=fade:duration=0.6:offset=10.0,format=yuv420p[v]" \
-map "[v]" -t 16.708 -r 30 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p /home/claude/video/cenas/s07.tmp.mp4 && mv /home/claude/video/cenas/s07.tmp.mp4 /home/claude/video/cenas/s07.mp4 && echo s07 ok
