// Conferências feitas antes de gravar um mês novo. Se uma delas falhar, o mês NÃO é gravado
// e a rotina termina com erro (o GitHub avisa por e-mail). A ideia é pegar coluna trocada,
// aba trocada, Onerado/Desonerado invertido, mês errado ou arquivo pela metade.

export class ErroConferencia extends Error {}

function mediana(arr){
  if(!arr.length) return NaN;
  const a = arr.slice().sort((x, y) => x - y);
  return a[a.length >> 1];
}
function pct(n, d){ return d ? (100 * n / d) : 0; }
function fmt(n){ return (Math.round(n * 10) / 10).toLocaleString('pt-BR'); }

export function novoRelatorio(titulo){
  const linhas = [], erros = [];
  return {
    titulo, linhas, erros,
    ok(msg){ linhas.push('  ✓ ' + msg); },
    aviso(msg){ linhas.push('  ! ' + msg); },
    falha(msg){ linhas.push('  ✗ ' + msg); erros.push(msg); },
    exigir(cond, msgOk, msgFalha){ if(cond) this.ok(msgOk); else this.falha(msgFalha || msgOk); },
    texto(){ return this.titulo + '\n' + linhas.join('\n'); },
    encerrar(){ if(erros.length) throw new ErroConferencia(this.texto() + '\n\nMês NÃO gravado: ' + erros.length + ' conferência(s) falharam.'); }
  };
}

// --- Cabeçalho de cada aba da SINAPI: as colunas que o leitor do programa usa por posição
//     têm que ter o título esperado, e a coluna RJ tem que ser achada pelo título (sem o
//     "chute" de posição que o leitor do programa usa quando não acha).
export function conferirCabecalhosSinapi(rel, wb, leitores){
  const L = leitores.sinapi;
  const precisa = ['ISD', 'ICD', 'CSD', 'CCD', 'Analítico'];
  const faltando = precisa.filter(n => wb.SheetNames.indexOf(n) < 0);
  rel.exigir(!faltando.length, 'abas ISD, ICD, CSD, CCD e Analítico presentes', 'faltam as abas: ' + faltando.join(', '));
  if(faltando.length) return;

  const esperado = {
    ISD: { marcador: 'Classificação', colunas: { 1: /c[óo]d/i, 2: /descri/i, 3: /unid/i }, onera: /SEM\s+DESONERA/i, contrario: /COM\s+DESONERA/i },
    ICD: { marcador: 'Classificação', colunas: { 1: /c[óo]d/i, 2: /descri/i, 3: /unid/i }, onera: /COM\s+DESONERA/i, contrario: /SEM\s+DESONERA/i },
    CSD: { marcador: 'Grupo', colunas: { 1: /c[óo]d/i, 2: /descri/i, 3: /unid/i }, onera: /SEM\s+DESONERA/i, contrario: /COM\s+DESONERA/i },
    CCD: { marcador: 'Grupo', colunas: { 1: /c[óo]d/i, 2: /descri/i, 3: /unid/i }, onera: /COM\s+DESONERA/i, contrario: /SEM\s+DESONERA/i },
    'Analítico': { marcador: 'Grupo', colunas: { 1: /c[óo]d/i, 2: /tipo/i, 3: /c[óo]d/i, 4: /descri/i, 5: /unid/i, 6: /coef/i } }
  };
  for(const aba of precisa){
    const e = esperado[aba];
    const rows = L.sheetToRows(wb, aba);
    const h = L.acharLinhaHeader(rows, e.marcador, 15);
    if(h < 0){ rel.falha(aba + ': não achei a linha de títulos (começando por "' + e.marcador + '")'); continue; }
    const cab = (rows[h] || []).map(v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim());
    if(process.env.BANCOS_MOSTRAR_LINHAS){   // diagnóstico: como a aba está montada
      const curto = r => (r || []).slice(0, 8).map(v => String(v == null ? '·' : v).replace(/\s+/g, ' ').slice(0, 25)).join(' | ');
      rel.aviso(aba + ': ' + rows.length + ' linhas; títulos na linha ' + (h + 1));
      const ws = wb.Sheets[aba];
      ['B' + (h + 2), 'B' + (h + 3)].forEach(ref => rel.aviso('   célula ' + ref + ' como está no arquivo: ' + JSON.stringify(ws[ref] || null).slice(0, 300)));
      for(let i = Math.max(0, h - 3); i < Math.min(rows.length, h + 5); i++) rel.aviso('   L' + (i + 1) + ': ' + curto(rows[i]) + '  …[40]=' + String((rows[i] || [])[40]));
    }
    const ruins = Object.keys(e.colunas).filter(i => !e.colunas[i].test(cab[i] || ''));
    rel.exigir(!ruins.length, aba + ': colunas Código/Descrição/Unidade' + (aba === 'Analítico' ? '/Tipo/Coeficiente' : '') + ' no lugar certo',
      aba + ': coluna(s) fora do lugar: ' + ruins.map(i => '#' + i + ' = "' + (cab[i] || '') + '"').join(', '));
    if(aba !== 'Analítico'){
      // A coluna que o leitor do programa usa: a do título "RJ" na linha de títulos ou, se não
      // houver, a posição fixa (23 nos insumos, 40 nas composições). Nas composições o "RJ" fica
      // numa linha acima (célula mesclada sobre Custo e %AS); por isso procura até 4 linhas acima
      // e exige que o título "RJ" esteja exatamente sobre a coluna que vai ser lida.
      const colTitulo = L.acharColunaUF(rows[h] || [], 'RJ');
      const colLida = colTitulo >= 0 ? colTitulo : (e.marcador === 'Grupo' ? 40 : 23);
      const achados = [];
      for(let i = Math.max(0, h - 4); i <= h; i++) (rows[i] || []).forEach((v, c) => { if(String(v == null ? '' : v).trim() === 'RJ') achados.push({ linha: i + 1, col: c }); });
      const certo = achados.filter(a => a.col === colLida)[0];
      rel.exigir(!!certo, aba + ': título "RJ" sobre a coluna lida (coluna ' + colLida + (certo ? ', linha ' + certo.linha : '') + ')',
        aba + ': o título "RJ" não está sobre a coluna lida (' + colLida + '); "RJ" achado em: ' + (achados.map(a => 'linha ' + a.linha + ' coluna ' + a.col).join(', ') || 'nenhum lugar'));
      const topo = rows.slice(0, h).map(r => (r || []).join(' ')).join(' ');
      if(e.contrario.test(topo) && !e.onera.test(topo)) rel.falha(aba + ': o título da aba diz o contrário do esperado (' + e.contrario + ')');
      else if(e.onera.test(topo)) rel.ok(aba + ': título confirma ' + (/SEM/.test(String(e.onera)) ? 'SEM' : 'COM') + ' desoneração');
      else rel.aviso(aba + ': o título não diz se é SEM ou COM desoneração; conferido pelos preços');
    }
  }
}

// --- Comparação de preços e descrições com o mês anterior (ou com o banco embutido)
//     lista: [{CODIGO, DESCR1, UNID, CUSTO, CUSTO_COM}]
export function conferirContraAnterior(rel, nome, novos, antigos, refAnterior){
  if(!antigos || !antigos.length){ rel.aviso(nome + ': sem mês anterior para comparar'); return; }
  const mapa = new Map(antigos.map(x => [x.CODIGO, x]));
  let comuns = 0, descrIgual = 0, unidIgual = 0;
  const razSem = [], razCom = [];
  let foraSem = 0, nSem = 0;
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9à-ú]+/g, ' ').trim();
  for(const n of novos){
    const a = mapa.get(n.CODIGO);
    if(!a) continue;
    comuns++;
    const dn = norm(n.DESCR1), da = norm(a.DESCR1);
    if(dn === da || dn.slice(0, 40) === da.slice(0, 40)) descrIgual++;
    if(norm(n.UNID) === norm(a.UNID)) unidIgual++;
    if(n.CUSTO > 0 && a.CUSTO > 0){ const r = n.CUSTO / a.CUSTO; razSem.push(r); nSem++; if(r < 0.5 || r > 2) foraSem++; }
    if(n.CUSTO_COM > 0 && a.CUSTO_COM > 0) razCom.push(n.CUSTO_COM / a.CUSTO_COM);
  }
  const base = ' (contra ' + refAnterior + ')';
  rel.exigir(pct(comuns, novos.length) >= 80, nome + ': ' + fmt(pct(comuns, novos.length)) + '% dos códigos já existiam' + base,
    nome + ': só ' + fmt(pct(comuns, novos.length)) + '% dos códigos existiam' + base + ' (aba ou coluna de código trocada?)');
  if(!comuns) return;
  rel.exigir(pct(descrIgual, comuns) >= 85, nome + ': descrição igual em ' + fmt(pct(descrIgual, comuns)) + '% dos códigos',
    nome + ': descrição igual em só ' + fmt(pct(descrIgual, comuns)) + '% dos códigos (coluna de descrição trocada?)');
  rel.exigir(pct(unidIgual, comuns) >= 85, nome + ': unidade igual em ' + fmt(pct(unidIgual, comuns)) + '% dos códigos',
    nome + ': unidade igual em só ' + fmt(pct(unidIgual, comuns)) + '% dos códigos (coluna de unidade trocada?)');
  const mS = mediana(razSem), mC = mediana(razCom);
  rel.exigir(mS >= 0.9 && mS <= 1.1, nome + ': variação mediana do preço SEM/Onerado = ' + fmt((mS - 1) * 100) + '%',
    nome + ': variação mediana do preço SEM/Onerado = ' + fmt((mS - 1) * 100) + '% (coluna de preço ou estado trocado?)');
  rel.exigir(mC >= 0.9 && mC <= 1.1, nome + ': variação mediana do preço COM/Desonerado = ' + fmt((mC - 1) * 100) + '%',
    nome + ': variação mediana do preço COM/Desonerado = ' + fmt((mC - 1) * 100) + '% (coluna de preço ou estado trocado?)');
  rel.exigir(pct(foraSem, nSem) <= 10, nome + ': ' + fmt(pct(foraSem, nSem)) + '% dos preços mudaram mais que pela metade ou o dobro',
    nome + ': ' + fmt(pct(foraSem, nSem)) + '% dos preços mudaram mais que pela metade ou o dobro');
}

// --- SEM x COM desoneração: o preço COM (desonerado) não pode ser maior que o SEM na maioria
//     das composições. Se for, as abas/arquivos estão invertidos.
export function conferirOneradoDesonerado(rel, nome, lista){
  let n = 0, comMaior = 0, comMenor = 0;
  for(const x of lista){
    if(!(x.CUSTO > 0 && x.CUSTO_COM > 0)) continue;
    n++;
    if(x.CUSTO_COM > x.CUSTO * 1.001) comMaior++;
    else if(x.CUSTO_COM < x.CUSTO * 0.999) comMenor++;
  }
  rel.exigir(n > 0 && pct(comMaior, n) <= 5 && comMenor > comMaior,
    nome + ': desonerado mais barato ou igual em ' + fmt(100 - pct(comMaior, n)) + '% dos itens',
    nome + ': desonerado MAIS CARO em ' + fmt(pct(comMaior, n)) + '% dos itens (Onerado e Desonerado invertidos?)');
}

export function conferirQuantidades(rel, nome, n, minimo){
  rel.exigir(n >= minimo, nome + ': ' + n.toLocaleString('pt-BR') + ' (mínimo ' + minimo.toLocaleString('pt-BR') + ')',
    nome + ': só ' + n.toLocaleString('pt-BR') + ' (esperado pelo menos ' + minimo.toLocaleString('pt-BR') + '; arquivo incompleto?)');
}

export function conferirZerados(rel, nome, lista, limitePct){
  const z = lista.filter(x => !(x.CUSTO > 0)).length;
  rel.exigir(pct(z, lista.length) <= limitePct, nome + ': ' + fmt(pct(z, lista.length)) + '% sem preço',
    nome + ': ' + fmt(pct(z, lista.length)) + '% sem preço (limite ' + limitePct + '%; coluna de preço errada?)');
}

// Composição aberta: a soma dos insumos (qtd x preço) tem que bater com o preço da composição.
// Nem todas batem nem no banco oficial (insumo sem preço no RJ etc.), então a taxa do mês novo
// é comparada com a do mês anterior: não pode cair mais que 5 pontos.
export function taxaSomaBate(compMap, tolerancia){
  let n = 0, bate = 0;
  for(const k of Object.keys(compMap || {})){
    const c = compMap[k];
    if(!c || !(c.preco > 0) || !Array.isArray(c.itens) || !c.itens.length) continue;
    n++;
    const soma = c.itens.reduce((s, it) => s + (Number(it.total) || 0), 0);
    if(Math.abs(soma - c.preco) <= Math.max(0.05, c.preco * tolerancia)) bate++;
  }
  return pct(bate, n);
}
export function conferirSomaComposicoes(rel, nome, compMap, compMapAnterior, refAnterior){
  const t = taxaSomaBate(compMap, 0.01);
  const tA = compMapAnterior ? taxaSomaBate(compMapAnterior, 0.01) : 70;
  rel.exigir(t >= tA - 5, nome + ': soma dos insumos bate com o preço em ' + fmt(t) + '% das composições (' + (compMapAnterior ? refAnterior + ': ' + fmt(tA) + '%' : 'mínimo 65%') + ')',
    nome + ': soma dos insumos bate com o preço em só ' + fmt(t) + '% das composições, contra ' + fmt(tA) + '% em ' + (refAnterior || 'referência') + ' (coeficiente ou preço de insumo trocado?)');
}
