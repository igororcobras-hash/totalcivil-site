import asyncio
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p,1280,1000)
        await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
        el=pg.locator('a[href="/esgoto/"]').first
        print('cartões', await pg.evaluate('document.querySelectorAll("a[href=\\"/esgoto/\\"]").length'), await pg.evaluate('typeof PROGRAMAS!="undefined" ? PROGRAMAS.map(p=>p.key).join(",") : "?"'))
        try:
            await el.scroll_into_view_if_needed(timeout=3000)
        except Exception as e: print('sem link visível', str(e)[:80])
        await pg.screenshot(path='out/40-home.png')
        txt=await pg.evaluate('(()=>{const c=[...document.querySelectorAll("*")].find(e=>e.children.length<12&&/Esgoto Sanitário/.test(e.textContent)&&/55|R\\$/.test(e.textContent)); return c?c.textContent.replace(/\\s+/g," ").slice(0,400):"não achei"})()')
        print(txt)
        print([e for e in erros if 'ERR_FAILED' not in e and 'Failed to load' not in e][:5])
        await b.close()
    srv.terminate()
asyncio.run(main())
