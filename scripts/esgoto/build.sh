#!/bin/sh
# monta esgoto/index.html (arquivo único, sem build no site: aqui só junta os blocos)
cd "$(dirname "$0")"
{ cat 00-head.html; sed '/^if (typeof module/d' 10-core.js; cat 20-ui.js 30-planta.js 40-perfil.js 50-3d.js 60-orc-memo.js 65-v2.js 70-eventos.js; } > "${1:-../../esgoto/index.html}"
