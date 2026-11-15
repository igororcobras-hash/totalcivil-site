#!/usr/bin/env python3
"""Monta orcamento2/index.html (Orçamento de Obras V2).

    python3 scripts/orcamento2/build.py

O V2 é o MESMO motor do orcamento/index.html (todas as funções) + a casca
(scripts/orcamento2/v2.css e v2.js). Sempre que o orcamento/index.html mudar,
rode este script de novo para o V2 receber a mudança.
Nunca edite orcamento2/index.html à mão.
"""
import os, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AQUI = os.path.dirname(os.path.abspath(__file__))

def ler(p):
    with open(p, encoding='utf-8') as f:
        return f.read()

def trocar(s, de, para, n=1):
    if s.count(de) != n:
        sys.exit('ERRO: esperava %d ocorrência(s) de %r no orcamento/index.html e achei %d. Ajuste o build.py.' % (n, de, s.count(de)))
    return s.replace(de, para)

s = ler(os.path.join(RAIZ, 'orcamento', 'index.html'))

# nome do programa na aba do navegador
s = trocar(s, '<title>Schueler Orçamento Analítico</title>', '<title>Orçamento de Obras V2 · Total Civil</title>')
# bancos mensais e modelos ficam em /orcamento/dados (uma cópia só, usada pelos dois programas)
s = trocar(s, r"/^\/orcamento(\/|$)/.test(location.pathname)", r"/^\/orcamento2?(\/|$)/.test(location.pathname)")
s = trocar(s, "return 'dados/';", "return '/orcamento/dados/';")
s = trocar(s, "fetch('dados/modelos.json'", "fetch('/orcamento/dados/modelos.json'")

bloco = ('\n<!-- ==================== ORÇAMENTO DE OBRAS V2 (ORC2-01) — casca: scripts/orcamento2 ==================== -->\n'
         '<style id="v2-css">\n' + ler(os.path.join(AQUI, 'v2.css')) + '</style>\n'
         '<script id="v2-js">\n' + ler(os.path.join(AQUI, 'v2.js')) + '</script>\n'
         '<!-- FIM ORÇAMENTO DE OBRAS V2 -->\n')
marca = '<script src="/estado-pagina.js"'
s = trocar(s, marca, bloco + marca)

os.makedirs(os.path.join(RAIZ, 'orcamento2'), exist_ok=True)
dest = os.path.join(RAIZ, 'orcamento2', 'index.html')
with open(dest, 'w', encoding='utf-8') as f:
    f.write(s)
print('OK: %s (%.1f MB)' % (dest, len(s.encode('utf-8')) / 1048576))
