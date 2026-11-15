import asyncio
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.set_viewport_size({'width':390,'height':844})
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        await pg.click('[data-act="exemplo"]'); await pg.wait_for_timeout(800)
        await pg.click('[data-tab="t3"]'); await pg.wait_for_timeout(2500)
        antes=await pg.evaluate("localStorage.getItem('tc_esg_3d_real')")
        await pg.click('#aj-modo'); await pg.wait_for_timeout(200)
        print('dica visível', await pg.is_visible('#aj-dica'))
        for k in ['real','terr','andar','cen']:
            await pg.click(f'[data-t3="{k}"]', force=True); await pg.wait_for_timeout(250)
            print(k, await pg.is_visible('#aj-pop'), (await pg.inner_text('#aj-pop'))[:50].replace('\n',' '))
        await pg.screenshot(path='/home/claude/tst/out/s06-ajuda-toque.png')
        print('real inalterado', antes==await pg.evaluate("localStorage.getItem('tc_esg_3d_real')"))
        await pg.click('#aj-modo'); await pg.wait_for_timeout(200)
        print('saiu', not await pg.is_visible('#aj-dica'), not await pg.is_visible('#aj-pop'))
        await pg.click('[data-t3="terr"]'); await pg.wait_for_timeout(300)
        print('botão volta a agir (pop oculto)', not await pg.is_visible('#aj-pop'))
        print('erros de página', erros)
        await b.close()
    srv.terminate()
asyncio.run(main())
