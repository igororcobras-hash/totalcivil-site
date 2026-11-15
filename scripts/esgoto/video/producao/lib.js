const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const T3 = '/home/claude/video/lib/node_modules/three';
exports.launch = () => chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
exports.newCtx = async (b, rec) => {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, ...(rec ? { recordVideo: { dir: rec, size: { width: 1920, height: 1080 } } } : {}) });
  await ctx.route(/cdnjs|jsdelivr|googleapis|gstatic|tile|openstreetmap/, r => r.abort());
  await ctx.route('**/three@0.128.0/build/three.min.js', r => r.fulfill({ path: T3 + '/build/three.min.js', contentType: 'application/javascript' }));
  await ctx.route('**/three@0.128.0/examples/js/controls/OrbitControls.js', r => r.fulfill({ path: T3 + '/examples/js/controls/OrbitControls.js', contentType: 'application/javascript' }));
  return ctx;
};
exports.abrir = async (p, ambiente = 'Computador') => {
  await p.goto('http://localhost:8765/esgoto/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.click('text=' + ambiente);
  await p.waitForTimeout(500);
};

// legenda (faixa inferior com título + subtítulo), igual aos vídeos de Pavimento/Intertravado
exports.CAP_CSS = `
#vcap{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);z-index:2147483000;min-width:520px;max-width:1300px;padding:16px 36px 18px;border-radius:18px;
 background:rgba(18,32,46,.94);color:#fff;text-align:center;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;box-shadow:0 10px 36px rgba(0,0,0,.45);
 opacity:0;transition:opacity .45s}
#vcap.on{opacity:1}
#vcap b{display:block;font-size:34px;font-weight:700;letter-spacing:.2px;line-height:1.2}
#vcap span{display:block;margin-top:4px;font-size:23px;font-weight:400;color:#c9d6e2;line-height:1.25}`;
exports.legenda = (p, titulo, sub) => p.evaluate(([t, s, css]) => {
  let st = document.getElementById('vcap-st'); if (!st) { st = document.createElement('style'); st.id = 'vcap-st'; st.textContent = css; document.head.appendChild(st); }
  let d = document.getElementById('vcap'); if (!d) { d = document.createElement('div'); d.id = 'vcap'; document.body.appendChild(d); }
  if (!t) { d.classList.remove('on'); return; }
  d.innerHTML = '<b></b><span></span>'; d.firstChild.textContent = t; d.lastChild.textContent = s || ''; d.lastChild.style.display = s ? 'block' : 'none';
  requestAnimationFrame(() => d.classList.add('on'));
}, [titulo, sub, exports.CAP_CSS]);
