const { launch, newCtx, abrir, legenda } = require('./lib');
(async () => {
  const b = await launch(); const c = await newCtx(b); const p = await c.newPage(); p.setDefaultTimeout(300000);
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('tc_esg_3d_real', '0'); } catch (e) {} });
  await abrir(p);
  await p.click('button[data-act="exemploMorro"]'); await p.waitForTimeout(1500);
  await p.click('#abas [data-tab="t3"]'); await p.waitForTimeout(5000);
  const real = await p.evaluate(() => document.querySelector('[data-t3="real"]').classList.contains('on')); console.log('realista ligado?', real);
  if (real) { await p.click('[data-t3="real"]'); await p.waitForTimeout(4000); }
  await p.click('[data-t3="persp"]'); await p.waitForTimeout(2500);
  await p.evaluate(() => { const c = T3.ctl, cam = T3.cam; const d = cam.position.clone().sub(c.target).multiplyScalar(0.09); cam.position.copy(c.target.clone().add(d)); c.update(); });
  for (let i = 0; i < 3; i++) { await p.click('[data-t3="solo"]'); await p.waitForTimeout(1200); }
  await p.click('[data-t3="vala"]'); await p.waitForTimeout(1500);
  console.log('rua:', await p.evaluate(() => document.querySelector('[data-t3="solo"]').textContent.trim()));
  await p.mouse.move(960, 1070); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('div,p').forEach(e => { if (e.children.length < 4 && /do esgoto de projeto|Rede atende/.test(e.textContent) && e.getBoundingClientRect().top > 700 && e.getBoundingClientRect().width < 600) e.style.display = 'none'; }); });
  await legenda(p, 'A rede enterrada sob a rua', 'Tubos, PVs, ligações e lâmina de esgoto'); await p.waitForTimeout(800);
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await p.screenshot({ path: '/home/claude/video/shots/s7_B4.png', type: 'png' }); console.log('ok B2');
  await b.close();
})();
