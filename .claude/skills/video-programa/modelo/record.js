// Grava uma cena do programa: node record.js <n> [duracao_s]
const { launch, newCtx, abrir, legenda } = require('./lib');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const AUD = { 1: 14.184, 2: 24.984, 3: 18.744, 4: 16.608, 5: 17.208, 6: 14.28, 7: 15.408, 8: 15.168, 9: 11.304, 10: 9.384 };
const LEAD = 0.4, TAIL = 0.9;

const CURSOR = `(() => { const ini = () => { if (document.getElementById('vcur')) return; const d = document.createElement('div'); d.id = 'vcur';
 d.style.cssText = 'position:fixed;left:-50px;top:-50px;width:30px;height:30px;z-index:2147483647;pointer-events:none;transition:left .03s linear,top .03s linear';
 d.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>'; document.body.appendChild(d);
 addEventListener('mousemove', e => { d.style.left = e.clientX - 3 + 'px'; d.style.top = e.clientY - 2 + 'px'; }, true); }; if (document.body) ini(); else addEventListener('DOMContentLoaded', ini); })()`;

const SCROLL = `window.__rolar = (y1, ms, sel) => new Promise(res => {
  let el = sel ? document.querySelector(sel) : null;
  if (!el) { const c = [document.scrollingElement, ...document.querySelectorAll('*')].filter(e => e && e.scrollHeight > e.clientHeight + 60 && (e === document.scrollingElement || /auto|scroll/.test(getComputedStyle(e).overflowY)));
    c.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)); el = c[0]; }
  if (!el) return res(); const y0 = el.scrollTop, t0 = performance.now();
  const f = t => { const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = y0 + (y1 - y0) * e; k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });`;

const CARD_CSS = `
#vcard{position:fixed;inset:0;z-index:2147482000;background:radial-gradient(1200px 700px at 20% 15%,#17364f 0%,#0d1c2b 55%,#09131d 100%);color:#fff;
 font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 150px;opacity:1;transition:opacity .9s}
#vcard.off{opacity:0}
#vcard .k{font-size:22px;letter-spacing:.2em;font-weight:600;color:#cfd9e3;border-bottom:2px solid rgba(255,255,255,.25);display:inline-block;padding-bottom:6px;align-self:flex-start;margin-bottom:34px}
#vcard h1{margin:0;font-size:112px;line-height:1.02;font-weight:800;letter-spacing:-1px}
#vcard h1 em{font-style:normal;color:#f2894a}
#vcard p{margin:30px 0 0;font-size:34px;line-height:1.3;color:#d6e0ea;max-width:1100px}
#vcard small{display:block;margin-top:70px;font-size:22px;color:#9fb0c2;letter-spacing:.05em}
#vcard .url{position:absolute;right:150px;bottom:96px;background:#f2894a;color:#201108;font-weight:700;font-size:26px;padding:16px 34px;border-radius:14px}
#vcard ul{margin:34px 0 0;padding:0;list-style:none;font-size:34px;line-height:1.5;color:#e4ecf3}
#vcard li:before{content:'•';color:#f2894a;margin-right:18px}
#vcard .pre{margin-top:70px;font-size:24px;color:#9fb0c2}`;
const capa = `<div class="k">TOTAL CIVIL · PROGRAMAS DE ENGENHARIA</div><h1>Esgoto<br><em>Sanitário</em></h1><p>Dimensionamento de redes coletoras de esgoto: traçado, perfis, 3D, orçamento e memorial, em poucos cliques.</p><small>ABNT NBR 9649 · NBR 14486</small><div class="url">totalcivil.com.br/esgoto</div>`;
const fecho = `<div class="k">TOTAL CIVIL · ESGOTO SANITÁRIO</div><h1>Do traçado <em>à memória</em></h1><ul><li>Rede dimensionada pela NBR 9649, com ligações prediais</li><li>Elevatória, recalque e sifão invertido</li><li>Perfis, 3D realista e georreferenciamento</li><li>Orçamento em 3 soluções: EMOP, SINAPI e SCO-Rio</li><li>Memorial em Word, Excel e PDF; projeto em DXF e DWG</li></ul><div class="pre">Conheça os programas de engenharia em</div><div class="url" style="bottom:70px">totalcivil.com.br</div>`;

const card = (p, html, off, fade) => p.evaluate(([h, css, off, fade]) => {
  let st = document.getElementById('vcard-st'); if (!st) { st = document.createElement('style'); st.id = 'vcard-st'; st.textContent = css; document.head.appendChild(st); }
  let d = document.getElementById('vcard'); if (!d) { d = document.createElement('div'); d.id = 'vcard'; document.body.appendChild(d); }
  if (h) { d.className = fade ? 'off' : ''; d.innerHTML = h; if (fade) setTimeout(() => { d.className = ''; }, 60); } if (off) d.className = 'off'; }, [html, CARD_CSS, off, fade]);

const cenas = {
  1: { setup: async p => { await abrir(p); await card(p, capa); },
    passos: [[6.2, p => card(p, '', true)], [8.2, p => legenda(p, 'Comece em 3 passos', 'Exemplo pronto, desenhar as ruas ou colar a tabela')], [12.6, p => legenda(p, '')]] },
  2: { setup: async p => { await abrir(p); await p.click('button[data-act="exemplo"]'); await p.waitForTimeout(1500); await p.click('#abas [data-tab="dados"]'); await p.waitForTimeout(800); },
    passos: [[0.5, p => legenda(p, 'Aba Dados', 'População, consumo per capita e coeficientes')], [1.0, p => p.evaluate(() => __rolar(330, 9000))],
      [10.5, p => legenda(p, 'Critérios hidráulicos da NBR 9649', 'Manning, tensão trativa mínima, lâmina máxima')], [11.0, p => p.evaluate(() => __rolar(0, 4000))],
      [18.0, async p => { await legenda(p, 'Ajuda em cada campo', 'Passe o mouse, ou toque no ⓘ, para ver a explicação'); const l = p.locator('label:has-text("Coeficiente de retorno")').first(); const bb = await l.boundingBox(); if (bb) await p.mouse.move(bb.x + 60, bb.y + 12, { steps: 30 }); }],
      [22.5, p => p.mouse.move(960, 600, { steps: 20 })]] },
  3: { setup: async p => { await abrir(p); await p.click('button[data-act="exemplo"]'); await p.waitForTimeout(1500); },
    passos: [[0.5, p => legenda(p, 'Traçado', 'Ruas desenhadas no mapa, com o nome digitado uma única vez')],
      [6.5, async p => { await legenda(p, '🧭 Gerar rede', 'PVs, sentido do esgoto pelo terreno e ligações prediais'); await p.click('button[data-act="gerar"]').catch(() => {}); }],
      [12.0, async p => { await legenda(p, 'Lotes e ligações prediais', 'Um ramal por lote, ajustável arrastando'); await p.click('button[data-act="lotes"]').catch(() => {}); }]] },
};

const ir = (aba) => async p => { await p.click(`#abas [data-tab="${aba}"]`); await p.waitForTimeout(600); };
const morro = async p => { await abrir(p); await p.click('button[data-act="exemploMorro"]'); await p.waitForTimeout(1800); };
Object.assign(cenas, {
  4: { setup: morro,
    passos: [[0.5, p => legenda(p, 'Exemplo com morro', 'Encosta de 5 %: o esgoto desce até o vale')],
      [6.0, p => legenda(p, 'Elevatória e recalque', 'O recalque leva o esgoto até a ETE, na parte alta')],
      [11.5, async p => { await legenda(p, 'Degraus nos PVs', 'Tubo de queda quando a declividade passa do limite'); await ir('dim')(p); }]] },
  5: { setup: async p => { await morro(p); await ir('dim')(p); },
    passos: [[0.5, p => legenda(p, 'Dimensionamento', 'Vazão, diâmetro, declividade, velocidade, lâmina e tensão trativa')],
      [1.5, p => p.evaluate(() => __rolar(430, 11000))],
      [12.5, p => legenda(p, 'Verificação pela NBR 9649', 'O programa avisa o trecho que não atende')], [13.0, p => p.evaluate(() => __rolar(0, 3500))]] },
  6: { setup: async p => { await morro(p); await ir('perfil')(p); },
    passos: [[0.5, p => legenda(p, 'Perfis e seções', 'Terreno, coletor, PVs, degraus e linha d’água')],
      [7.0, async p => { const s = p.locator('select').first(); const n = await s.locator('option').count(); if (n > 1) await s.selectOption({ index: 1 }); }],
      [10.0, p => legenda(p, 'Exporte em SVG', 'Um perfil ou todos de uma vez')]] },
  8: { setup: async p => { await morro(p); await ir('orc')(p); },
    passos: [[0.5, p => legenda(p, 'Orçamento', 'Quantidades do projeto, com SINAPI, SCO-Rio e EMOP')], [1.5, p => p.evaluate(() => __rolar(380, 9000))],
      [10.0, async p => { await legenda(p, '3 soluções, cronograma e PDF', 'Envio direto para o programa de Orçamento'); await p.evaluate(() => __rolar(0, 2500)); }],
      [13.0, async p => { const bb = await p.locator('[data-act="orcEnviar"]').first().boundingBox(); if (bb) await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 25 }); }]] },
  9: { setup: async p => { await morro(p); await ir('memo')(p); },
    passos: [[0.5, p => legenda(p, 'Memorial de cálculo', 'Critérios, fórmulas da NBR 9649 e resultados')], [1.5, p => p.evaluate(() => __rolar(520, 8500))],
      [9.5, p => p.evaluate(() => __rolar(0, 1800))]] },
  10: { setup: async p => { await morro(p); await ir('memo')(p); await p.evaluate(() => { const e = document.createElement('div'); }); },
    passos: [[0.3, p => card(p, fecho, false, true)]] },
});

module.exports = { cenas, AUD, LEAD, TAIL, CURSOR, SCROLL };

if (require.main === module) (async () => {
  const n = +process.argv[2], dur = +(process.argv[3] || (AUD[n] + LEAD + TAIL)); const cena = cenas[n];
  const rec = `/home/claude/video/rec/s${String(n).padStart(2, '0')}`; fs.rmSync(rec, { recursive: true, force: true }); fs.mkdirSync(rec, { recursive: true });
  const b = await launch(); const c = await newCtx(b, rec); const p = await c.newPage(); p.setDefaultTimeout(60000); const tp = Date.now();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(CURSOR); await p.addInitScript(SCROLL); await p.addInitScript(() => addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#toast{display:none!important}'; document.head.appendChild(st); })); await p.addInitScript(() => { try { localStorage.setItem('tc_esg_3d_qual', 'media'); } catch (e) {} });
  await cena.setup(p); await p.mouse.move(960, 800);
  const T0 = Date.now(); const off = (T0 - tp) / 1000;
  for (const [t, fn] of cena.passos) { const w = T0 + t * 1000 - Date.now(); if (w > 0) await p.waitForTimeout(w); await fn(p).catch(e => console.log('passo falhou', t, e.message.split('\n')[0])); }
  const w = T0 + dur * 1000 + 600 - Date.now(); if (w > 0) await p.waitForTimeout(w);
  const vp = await p.video().path(); await c.close(); await b.close();
  const out = `/home/claude/video/cenas/s${String(n).padStart(2, '0')}`; fs.mkdirSync('/home/claude/video/cenas', { recursive: true });
  execSync(`ffmpeg -v error -y -ss ${off.toFixed(2)} -i ${vp} -t ${dur.toFixed(3)} -vf "fps=30,format=yuv420p" -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p ${out}.tmp.mp4 && mv ${out}.tmp.mp4 ${out}.mp4`);
  console.log('cena', n, 'ok', dur, 'off', off);
})();
