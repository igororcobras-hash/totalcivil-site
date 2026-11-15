import asyncio
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        await pg.add_init_script("localStorage.setItem('tc_esg_3d_qual','Baixa')")
        await pg.click('[data-act="exemplo"]'); await pg.wait_for_timeout(800)
        # planta com lotes: esquina
        await pg.click('[data-tab="tracado"]'); await pg.wait_for_timeout(400)
        n=await pg.evaluate('''(()=>{const P=__esg.P;const g={};P.trechos.forEach(t=>{g[t.de]=(g[t.de]||0)+1;g[t.para]=(g[t.para]||0)+1});const n=P.nos.find(n=>g[n.id]>=3&&n.x>40&&n.y>40)||P.nos[5];PL.lotes=true;PL.vb={x:n.x-30,y:-n.y-25,w:60,h:50};plDesenhar();return {x:n.x,y:n.y,raio:__esg.R.c.raioMF}})()''')
        print('esquina',n)
        await pg.wait_for_timeout(300); await pg.screenshot(path='/home/claude/tst/out/s05-planta-raio.png')
        # 3D realista, vista de cima sobre a esquina
        await pg.click('[data-tab="t3"]'); await pg.wait_for_timeout(2500)
        await pg.evaluate('''(n=>{const T=T3, z=T.z0||0; const x=n.x-T.cx, y=n.y-T.cy; T.ctl.target.set(x,0,-y); T.cam.position.set(x+0.5,34,-y+14); T.ctl.update();})(%s)'''%__import__('json').dumps(n))
        await pg.wait_for_timeout(2500); await pg.screenshot(path='/home/claude/tst/out/s05-3d-raio.png')
        # raio 0 = canto vivo; muda o campo e refaz
        await pg.evaluate('''(()=>{editar(()=>{__esg.P.crit.raioMF=9;__esg.P.crit.largPas=3;}); if(window.rlReconstroi) rlReconstroi();})()''')
        await pg.wait_for_timeout(2500); await pg.screenshot(path='/home/claude/tst/out/s05-3d-raio10.png')
        print('erros de página',[e for e in erros if 'cdn' not in e.lower() and 'jsdelivr' not in e.lower() and 'net::' not in e.lower()])
        await b.close()
    srv.kill()
asyncio.run(main())
