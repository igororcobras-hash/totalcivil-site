#!/bin/sh
set -e
cd /home/claude/video; mkdir -p final tmpa
: > final/lista.txt; : > final/alista.txt
for n in 01 02 03 04 05 06 07 08 09 10; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 cenas/s$n.mp4)
  echo "file '/home/claude/video/cenas/s$n.mp4'" >> final/lista.txt
  ffmpeg -v error -y -i audio/cena$n.mp3 -af "adelay=400|400,apad" -t $d -ar 48000 -ac 1 -c:a pcm_s16le tmpa/a$n.wav
  echo "file '/home/claude/video/tmpa/a$n.wav'" >> final/alista.txt
done
ffmpeg -v error -y -f concat -safe 0 -i final/lista.txt -c copy final/video_mudo.tmp.mp4 && mv final/video_mudo.tmp.mp4 final/video_mudo.mp4
ffmpeg -v error -y -f concat -safe 0 -i final/alista.txt -c:a aac -b:a 160k final/audio.m4a
ffmpeg -v error -y -i final/video_mudo.mp4 -i final/audio.m4a -map 0:v -map 1:a -c:v copy -c:a copy -movflags +faststart final/esgoto-sanitario-apresentacao.tmp.mp4 && mv final/esgoto-sanitario-apresentacao.tmp.mp4 final/esgoto-sanitario-apresentacao.mp4
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact final/esgoto-sanitario-apresentacao.mp4
