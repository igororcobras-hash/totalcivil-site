import asyncio, json, sys, subprocess, time, os
from playwright.async_api import async_playwright
T='/home/claude/tst/node_modules/'
MAP={'three.min.js':T+'three/build/three.min.js','OrbitControls.js':T+'three/examples/js/controls/OrbitControls.js','xlsx.full.min.js':T+'xlsx/dist/xlsx.full.min.js'}
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8765'],cwd='/home/claude/totalcivil-site',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':1400,'height':900})
        erros=[]
        pg.on('pageerror',lambda e:erros.append('PAGEERROR '+str(e)))
        pg.on('console',lambda m:erros.append('CONSOLE '+m.text) if m.type=='error' else None)
        async def rota(r):
            u=r.request.url
            for k,v in MAP.items():
                if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
            if 'localhost:8765' in u: return await r.continue_()
            await r.abort()
        await pg.route('**/*',rota)
        await pg.goto('http://localhost:8765/esgoto/')
        await pg.click('[data-amb="pc"]')
        await pg.screenshot(path='/home/claude/tst/out/01-dados-vazio.png')
        await pg.click('[data-act="exemplo"]'); await pg.wait_for_timeout(500)
        print('aba', await pg.evaluate('document.querySelector(".tab-btn.active").textContent'), await pg.evaluate('JSON.stringify({nos:__esg.P.nos.length,tr:__esg.P.trechos.length,err:__esg.R.nErr,warn:__esg.R.nWarn,ok:__esg.R.ok})'))
        await pg.screenshot(path='/home/claude/tst/out/02-tracado.png')
        for i,t in enumerate(['dados','dim','perfil','orc','memo']):
            await pg.click(f'[data-tab="{t}"]'); await pg.wait_for_timeout(1500 if t in('orc','memo') else 400)
            await pg.screenshot(path=f'/home/claude/tst/out/0{i+3}-{t}.png')
        print('orc', await pg.evaluate('JSON.stringify({erro:ORC.erro,mes:ORC.mes,n:orcLinhas().length,sub:orcLinhas().reduce((s,i)=>s+i.total,0),sem:orcLinhas().filter(i=>!(i.pu>0)).map(i=>i.k),undif:orcLinhas().filter(i=>i.unDif).map(i=>i.k+":"+i.banco.unid+"/"+i.un)})'))
        await pg.click('[data-tab="t3"]'); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='/home/claude/tst/out/08-3d.png')
        print('t3', await pg.evaluate('JSON.stringify({on:T3.on,tubos:T3.G&&T3.G.tubos.children.length,agua:T3.G&&T3.G.agua.children.length,part:T3.part&&T3.part.length,inf:document.getElementById("t3-inf").textContent.slice(0,160)})'))
        await pg.evaluate('(()=>{const s=document.getElementById("t3-f"); s.value=300; s.dispatchEvent(new Event("input",{bubbles:true}));})()'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='/home/claude/tst/out/09-3d-300.png')
        print('t3 300%', await pg.evaluate('document.getElementById("t3-inf").textContent.slice(0,260)'))
        await pg.click('[data-t3="redim"]'); await pg.wait_for_timeout(600)
        print('redim', await pg.evaluate('JSON.stringify({fator:__esg.P.crit.fator,err:__esg.R.nErr,warn:__esg.R.nWarn,dn:[...new Set(__esg.R.ordem.map(i=>__esg.R.tr[i].D))]})'))
        await pg.screenshot(path='/home/claude/tst/out/10-3d-redim.png')
        await pg.click('#b-undo'); await pg.wait_for_timeout(300)
        print('undo fator', await pg.evaluate('__esg.P.crit.fator'))
        print('ERROS', erros[:20])
        await b.close()
    srv.terminate()
asyncio.run(main())
