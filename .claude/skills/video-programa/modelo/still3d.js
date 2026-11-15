const { launch, newCtx, abrir, legenda } = require('./lib');
const OUT = '/home/claude/video/shots/';
(async () => {
  const b = await launch(); const c = await newCtx(b); const p = await c.newPage(); p.setDefaultTimeout(240000);
  p.on('pageerror', e => console.log('ERR', e.message));
  await abrir(p);
  await p.click('button[data-act="exemploMorro"]'); await p.waitForTimeout(1500);
  await p.click('#abas [data-tab="t3"]'); await p.waitForTimeout(5000);
  await p.mouse.move(960, 1070);
  const esconde = () => p.evaluate(() => { document.querySelectorAll('div,p').forEach(e => { if (e.children.length < 4 && /do esgoto de projeto|Rede atende/.test(e.textContent) && e.getBoundingClientRect().top > 700 && e.getBoundingClientRect().width < 600) e.style.display = 'none'; }); });
  const shot = async n => { await esconde(); await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); await p.screenshot({ path: OUT + n, type: 'png' }); console.log('ok', n, new Date().toISOString().slice(14, 19)); };
  // A: perspectiva padrão
  await p.click('[data-t3="persp"]'); await p.waitForTimeout(3000); await p.mouse.move(960, 1070);
  await legenda(p, '3D realista: casas, muros, árvores e postes', 'Sol, sombras e o cenário da planta'); await p.waitForTimeout(800); await shot('s7_A.png'); await legenda(p, '');
  // C: nível da rua
  await p.click('[data-t3="rua"]'); await p.waitForTimeout(3000); await p.mouse.move(960, 1070);
  await legenda(p, 'Nível da rua e Andar', 'Percorra o projeto em primeira pessoa'); await p.waitForTimeout(800); await shot('s7_C.png'); await legenda(p, '');
  // B: rede enterrada (rua transparente, câmera próxima)
  await p.click('[data-t3="persp"]'); await p.waitForTimeout(2500);
  await p.evaluate(() => { const c = T3.ctl, cam = T3.cam; const d = cam.position.clone().sub(c.target).multiplyScalar(0.33); cam.position.copy(c.target.clone().add(d)); c.update(); });
  for (let i = 0; i < 3; i++) { await p.click('[data-t3="solo"]'); await p.waitForTimeout(1500); }
  await p.mouse.move(960, 1070); await p.waitForTimeout(3000);
  await legenda(p, 'A rede enterrada sob a rua', 'Tubos, PVs, ligações e lâmina de esgoto'); await p.waitForTimeout(800); await shot('s7_B.png');
  await b.close();
})();
