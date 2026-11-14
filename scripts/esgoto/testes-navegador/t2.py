import asyncio, json, os
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        J=lambda e: pg.evaluate(e)
        # 1) desenhar duas ruas no mapa (em T), nomear uma vez, cotas, gerar automático
        await pg.click('[data-tab="tracado"]'); await pg.click('.pl-tools [data-plmodo="rua"]')
        box=await pg.locator('#pl-svg').bounding_box()
        async def clique(fx,fy,dbl=False):
            x=box['x']+box['width']*fx; y=box['y']+box['height']*fy
            await pg.mouse.move(x,y); await pg.mouse.down(); await pg.mouse.up()
            if dbl: await pg.mouse.down(); await pg.mouse.up()
        await clique(.2,.5); await clique(.8,.5); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        print('rua1', await J('JSON.stringify(__esg.P.ruas.map(r=>[r.nome,r.pts.length]))'), 'foco', await J('document.activeElement.dataset.ruanome||""'))
        await pg.keyboard.type('Av. Brasil'); await pg.keyboard.press('Enter')
        zs=pg.locator('[data-ruaz]'); await zs.nth(0).fill('12,50'); await zs.nth(0).press('Enter'); await pg.locator('[data-ruaz]').nth(1).fill('10,10'); await pg.locator('[data-ruaz]').nth(1).press('Enter')
        print('após cotas', await J('JSON.stringify({ruas:__esg.P.ruas.map(r=>[r.nome,r.pts.map(q=>q.z)]),nos:__esg.P.nos.length,tr:__esg.P.trechos.length,ok:__esg.R.ok,err:__esg.R.nErr})'))
        await pg.click('.pl-tools [data-plmodo="rua"]'); await clique(.5,.2); await clique(.5,.5); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
        await pg.keyboard.type('Rua do Porto'); await pg.keyboard.press('Enter')
        await pg.locator('[data-ruaz]').nth(0).fill('13'); await pg.locator('[data-ruaz]').nth(0).press('Enter')
        r=json.loads(await J('JSON.stringify({ruas:__esg.P.ruas.map(r=>r.nome),nos:__esg.P.nos.map(n=>[n.nome,n.ct]),tr:__esg.P.trechos.length,err:__esg.R.nErr,warn:__esg.R.nWarn,col:__esg.R.coletores.length,manual:!!__esg.P.manual, fim:Object.values(__esg.R.no).filter(x=>x.fim).length})'))
        print('T', r)
        await pg.screenshot(path='out/20-desenho.png')
        # 2) inserir PV num trecho, fixar DN, mover, desfazer
        n0=r['tr']
        await pg.click('.pl-tools [data-plmodo="pv"]')
        xy=await J('(()=>{const t=__esg.P.trechos[1],a=__esg.P.nos.find(n=>n.id==t.de),b=__esg.P.nos.find(n=>n.id==t.para),r=document.getElementById("pl-svg").getBoundingClientRect(),v=__esg.PL.vb,x=(a.x+b.x)/2,y=(a.y+b.y)/2;return [r.left+(x-v.x)/v.w*r.width,r.top+(-y-v.y)/v.h*r.height]})()'); await pg.mouse.click(xy[0],xy[1]); await pg.wait_for_timeout(200)
        print('+PV', await J('JSON.stringify({tr:__esg.P.trechos.length,manual:__esg.P.manual,err:__esg.R.nErr})'))
        await pg.click('.pl-tools [data-plmodo="sel"]')
        xy=await J('(()=>{const t=__esg.P.trechos[1],a=__esg.P.nos.find(n=>n.id==t.de),b=__esg.P.nos.find(n=>n.id==t.para),r=document.getElementById("pl-svg").getBoundingClientRect(),v=__esg.PL.vb,x=(a.x+b.x)/2,y=(a.y+b.y)/2;return [r.left+(x-v.x)/v.w*r.width,r.top+(-y-v.y)/v.h*r.height]})()'); await pg.mouse.click(xy[0],xy[1]); await pg.wait_for_timeout(200)
        await pg.select_option('#pl-lado [data-tfix="D"]','300'); await pg.wait_for_timeout(200)
        print('DN fixo', await J('JSON.stringify(__esg.R.ordem.map(i=>__esg.R.tr[i].D))'), await J('__esg.R.nErr'))
        await pg.click('#b-undo'); await pg.click('#b-undo'); await pg.wait_for_timeout(200)
        print('undo2', await J('JSON.stringify({tr:__esg.P.trechos.length,manual:!!__esg.P.manual})'))
        # 3) colar ruas + topografia num projeto novo
        await pg.click('#b-proj'); await pg.click('[data-act="novoProj"]'); await pg.click('[data-tab="tracado"]')
        await pg.click('#pl-lado [data-act="colarRuas"]')
        await pg.fill('#colar-txt','Rua das Flores; 0; 0; ; 240; 0; \nRua A\t120\t-80\t\t120\t0\t\t120\t90\t\nlinha ruim; x')
        await pg.click('[data-act="colarRuasOk"]'); await pg.wait_for_timeout(300)
        await pg.click('#pl-lado [data-act="colarTopo"]'); await pg.fill('#colar-txt','0;0;20\n240;0;17,2\n120;-80;21\n120;90;16,5\n120;0;18,4'); await pg.click('[data-act="colarTopoOk"]'); await pg.wait_for_timeout(300)
        print('colar', await J('JSON.stringify({ruas:__esg.P.ruas.map(r=>r.nome),topo:__esg.P.topo.length,nos:__esg.P.nos.map(n=>n.ct),tr:__esg.P.trechos.length,err:__esg.R.nErr,chk:__esg.R.checks.map(c=>c.msg).slice(0,3)})'))
        await pg.screenshot(path='out/21-colar.png')
        # 4) lançamento em outro ponto
        await pg.click('.pl-tools [data-plmodo="saida"]'); box=await pg.locator('#pl-svg').bounding_box(); await clique(.15,.5); await pg.wait_for_timeout(300)
        print('saida', await J('JSON.stringify({s:__esg.P.saida,fim:Object.values(__esg.R.no).filter(x=>x.fim).map(x=>[__esg.P.nos.find(n=>n.id==x.id).x,x.prof.toFixed(2)]),err:__esg.R.nErr,warn:__esg.R.nWarn,pm:__esg.R.profMaxima.toFixed(2)})'))
        # 5) critérios: PVC 14486, população grande -> DN cresce; taxa
        await pg.click('[data-tab="dados"]'); await pg.select_option('[data-norma]','14486'); await pg.fill('[data-crit="popF"]','60000'); await pg.press('[data-crit="popF"]','Enter'); await pg.wait_for_timeout(300)
        print('pop 60 mil', await J('JSON.stringify({n:__esg.P.crit.n,tau:__esg.P.crit.tau,dn:[...new Set(__esg.R.ordem.map(i=>__esg.R.tr[i].D))],Q:__esg.R.Qfim.toFixed(1),err:__esg.R.nErr,warn:__esg.R.nWarn})'))
        # 6) projetos: exemplo novo, exportar json, memorial, excel, dxf
        await pg.click('#b-proj'); await pg.click('[data-act="exemploNovo"]'); await pg.wait_for_timeout(400)
        print('projetos', await J('Object.keys(DB.list).length'), await J('__esg.P.nome'))
        for act,aba in [('xlsDim','dim'),('cadDxf','tracado'),('svgPlanta','tracado'),('svgPerfil','perfil'),('xlsOrc','orc'),('word','memo'),('expJson','memo')]:
            await pg.click(f'[data-tab="{aba}"]'); await pg.wait_for_timeout(900 if aba in('orc','memo') else 200)
            async with pg.expect_download() as d: await pg.click(f'main [data-act="{act}"]')
            dl=await d.value; path='out/'+dl.suggested_filename; await dl.save_as(path); print('download',act,dl.suggested_filename,os.path.getsize(path))
        await pg.click('[data-tab="memo"]'); await pg.wait_for_timeout(500); await pg.screenshot(path='out/22-memo.png',full_page=False)
        await pg.pdf(path='out/memorial.pdf',format='A4') if False else None
        # 7) recarregar: mantém projeto e aba
        await pg.reload(); await pg.wait_for_timeout(500)
        print('reload', await J('JSON.stringify({aba:TAB,nome:__esg.P.nome,tr:__esg.P.trechos.length,amb:CFG.amb})'))
        print('ERROS', erros[:10])
        await b.close()
    srv.terminate()
asyncio.run(main())
