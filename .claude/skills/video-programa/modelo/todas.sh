#!/bin/sh
cd /home/claude/video
for n in 2 1 3 4 5 6 8 9 10; do node scripts/record.js $n 2>&1 | grep -v -E 'agent-proxy|connect_rejected|Allowed|For details|^$|^- ' ; done
echo TODAS-PRONTAS
