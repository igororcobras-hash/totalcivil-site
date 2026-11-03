#!/usr/bin/env python3
"""Atualiza, em drenagem/index.html, a tabela EMOP embutida (EMOP_ADM) com os preços do mês.

Uso:  python3 scripts/emop/gerar_emop_adm.py CAMINHO/DIPRaammm.dbf AAAA-MM
Ex.:  python3 scripts/emop/gerar_emop_adm.py DIPR0926.dbf 09/2026

- Só precisa do DIPR (código completo, descrição, unidade, custo).
- Guarda só os códigos EMOP que o programa de Drenagem realmente usa (os que aparecem no código).
- Os preços ficam no arquivo mas só são usados quando o usuário logado é administrador
  (window.TC_USUARIO.admin). Usuários comuns veem códigos e descrições, sem preço.
- A EMOP é licenciada. Este arquivo vai para o repositório: confirme com o dono antes de publicar.
"""
import re, struct, sys, json, os

def ler_dbf(path, enc='cp850'):
    f = open(path, 'rb'); h = f.read(32)
    n, hl, rl = struct.unpack('<IHH', h[4:12]); campos = []
    while True:
        d = f.read(32)
        if d[0] == 0x0D: break
        campos.append((d[:11].split(b'\0')[0].decode('latin1'), d[16]))
    f.seek(hl)
    for _ in range(n):
        r = f.read(rl)
        if not r or r[0:1] == b'*': continue
        p = 1; row = {}
        for nome, ln in campos:
            row[nome] = r[p:p + ln].decode(enc, 'replace'); p += ln
        yield row

def juntar(*xs):  # igual ao programa de Orçamento: junta os DESCRn sem cortar o texto
    s = ''
    for v in xs:
        t = v.rstrip()
        if not t: continue
        s += t
        if len(t) < len(v): s += ' '
    return ' '.join(s.split())

def main():
    dipr, ref = sys.argv[1], sys.argv[2]
    raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    idx = os.path.join(raiz, 'drenagem', 'index.html')
    s = open(idx, encoding='utf-8').read()
    pat = re.compile(r'\b\d\d\.\d{3}\.\d{4}\b')
    ini, fim = '/* EMOP_ADM:INICIO */', '/* EMOP_ADM:FIM */'
    a, b = s.index(ini), s.index(fim)
    usados = set(pat.findall(s[:a] + s[b + len(fim):]))
    preco, desc, unid = {}, {}, {}
    for r in ler_dbf(dipr):
        cod = r['CODIGO'].strip(); m = re.match(r'^(\d\d\.\d{3}\.\d{4})-(.)$', cod)
        if not m or m.group(1) not in usados: continue
        base, suf = m.groups()
        preco.setdefault(base, {})[suf] = float(r['CUSTO'].strip() or 0)
        desc[base] = juntar(*[r['DESCR%d' % i] for i in range(1, 7)]); unid[base] = r['UNID'].strip()
    t = {}
    for base, ps in sorted(preco.items()):
        so = '0' if '0' in ps else ('1' if '1' in ps else sorted(ps)[0])
        sd = 'A' if 'A' in ps else ('B' if 'B' in ps else None)
        t[base] = [unid[base], desc[base], so, ps[so]] + ([sd, ps[sd]] if sd else [])
    falt = sorted(usados - set(t))
    bloco = ini + '\nconst EMOP_ADM = ' + json.dumps({'ref': ref, 't': t}, ensure_ascii=False, separators=(',', ':')) + ';\n' + fim
    open(idx, 'w', encoding='utf-8').write(s[:a] + bloco + s[b + len(fim):])
    print('EMOP_ADM atualizada:', len(t), 'códigos, referência', ref)
    if falt: print('Atenção: códigos usados que não existem neste DIPR:', ', '.join(falt))

main()
