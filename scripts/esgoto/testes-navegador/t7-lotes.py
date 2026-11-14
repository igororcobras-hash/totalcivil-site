import asyncio, json
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.set_viewport_size({'width':420,'height':900})
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        await pg.click('[data-act="exemplo"]'); await pg.wait_for_timeout(800)
        await pg.click('[data-tab="tracado"]'); await pg.wait_for_timeout(500)
        # esquina do PV-24 (como na foto do dono): procurar o nó com 3+ trechos
        r=await pg.evaluate('''(()=>{const P=__esg.P;const g={};P.trechos.forEach(t=>{g[t.de]=(g[t.de]||0)+1;g[t.para]=(g[t.para]||0)+1});const n=P.nos.find(n=>g[n.id]>=3&&n.x>40&&n.y>40)||P.nos[5];PL.vb={x:n.x-30,y:-n.y-25,w:60,h:70};plDesenhar();return {no:n.id,lig:__esg.Q.ligList.length,lotes:document.querySelectorAll('path[fill="#d6a04a"]').length,quad:document.querySelectorAll('[data-lg]').length}})()''')
        print('esquina',r)
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/tst/out/s03b-esquina.png')
        await pg.evaluate('''(()=>{const n=__esg.P.nos[0];PL.vb={x:n.x-25,y:-n.y-45,w:60,h:70};plDesenhar();})()''')
        await pg.screenshot(path='/home/claude/tst/out/s03b-canto.png')
        print('erros de página',[e for e in erros if 'cdn' not in e.lower() and 'jsdelivr' not in e.lower() and 'net::' not in e.lower()])
        await b.close()
    srv.kill()
asyncio.run(main())
