import asyncio, json
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        # computador: 3D de perto, 300 %, vala, voo
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]'); await pg.click('[data-act="exemplo"]')
        await pg.screenshot(path='out/30-planta.png')
        await pg.click('[data-tab="t3"]'); await pg.wait_for_timeout(2500)
        await pg.evaluate('(()=>{const s=document.getElementById("t3-f"); s.value=300; s.dispatchEvent(new Event("input",{bubbles:true}));})()')
        await pg.click('[data-t3="solo"]'); await pg.click('[data-t3="solo"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='out/31-3d-300.png')
        # aproxima no lançamento
        await pg.evaluate('(()=>{const n=__esg.P.nos.find(n=>__esg.R.no[n.id]&&__esg.R.no[n.id].fim),x=__esg.R.no[n.id],p=P3(n.x,n.y,x.cf+0.5);T3.ctl.target.copy(p);T3.cam.position.set(p.x+9,p.y+5,p.z+11);T3.rot=false})()'); await pg.click('[data-t3="vala"]'); await pg.wait_for_timeout(700)
        await pg.screenshot(path='out/32-3d-perto.png')
        await pg.click('[data-t3="voo"]'); await pg.wait_for_timeout(2500); print('voo', await pg.evaluate('JSON.stringify({s:T3.voo&&T3.voo.s.toFixed(1),L:T3.voo&&T3.voo.L})')); await pg.screenshot(path='out/33-3d-voo.png'); await pg.click('[data-t3="voo"]')
        await pg.click('[data-t3="ev"]'); await pg.click('[data-t3="topo"]'); await pg.wait_for_timeout(400)
        print('ERROS pc', erros[:8]); await b.close()
        # celular
        b,pg,erros=await abrir(p,390,844,True)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.tap('[data-amb="android"]'); await pg.tap('[data-act="exemplo"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='out/34-cel-tracado.png')
        await pg.tap('[data-tab="dim"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='out/35-cel-dim.png')
        await pg.tap('[data-tab="t3"]'); await pg.wait_for_timeout(2500); await pg.screenshot(path='out/36-cel-3d.png')
        await pg.tap('[data-tab="perfil"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='out/37-cel-perfil.png')
        print('largura rolagem', await pg.evaluate('document.documentElement.scrollWidth'), 'ERROS cel', erros[:8]); await b.close()
        # tema escuro
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]'); await pg.click('[data-act="exemplo"]'); await pg.click('#b-tema'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='out/38-escuro.png'); print('ERROS escuro', erros[:8]); await b.close()
    srv.terminate()
asyncio.run(main())
