import asyncio, subprocess, time
from playwright.async_api import async_playwright
T='/home/claude/tst/node_modules/'
MAP={'three.min.js':T+'three/build/three.min.js','OrbitControls.js':T+'three/examples/js/controls/OrbitControls.js','xlsx.full.min.js':T+'xlsx/dist/xlsx.full.min.js'}
async def abrir(p, vw=1400, vh=900, movel=False):
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    ctx=await b.new_context(viewport={'width':vw,'height':vh},has_touch=movel,is_mobile=movel,accept_downloads=True)
    pg=await ctx.new_page(); erros=[]
    pg.on('pageerror',lambda e:erros.append('PAGEERROR '+str(e)))
    pg.on('console',lambda m:erros.append('CONSOLE '+m.text) if m.type=='error' else None)
    async def rota(r):
        u=r.request.url
        for k,v in MAP.items():
            if u.endswith(k): return await r.fulfill(path=v,content_type='application/javascript')
        if 'localhost:8765' in u: return await r.continue_()
        await r.abort()
    await pg.route('**/*',rota)
    return b,pg,erros
def servidor():
    s=subprocess.Popen(['python3','-m','http.server','8765'],cwd='/home/claude/totalcivil-site',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1); return s
