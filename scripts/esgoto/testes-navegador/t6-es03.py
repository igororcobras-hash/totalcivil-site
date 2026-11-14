import asyncio, json
from base import *
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        # 1) exemplo com morro
        await pg.click('[data-act="exemploMorro"]'); await pg.wait_for_timeout(800)
        print('morro', await pg.evaluate('JSON.stringify({nos:__esg.P.nos.length,tr:__esg.P.trechos.length,eee:Object.keys(__esg.R.eee).length,err:__esg.R.nErr,warn:__esg.R.nWarn,lig:__esg.Q.ligList.length,ramal:Math.round(__esg.Q.ramal)})'))
        await pg.screenshot(path='/home/claude/tst/out/s03-01-morro.png')
        # 2) ajuda ao passar o mouse: Dados
        await pg.click('[data-tab="dados"]'); await pg.wait_for_timeout(400)
        lab=pg.locator('.f:has([data-crit="testada"]) label').first
        await lab.hover(); await pg.wait_for_timeout(500)
        vis=await pg.evaluate('(()=>{const p=document.getElementById("aj-pop");return {hid:p.hidden,txt:p.textContent.slice(0,90)}})()'); print('ajuda testada',vis)
        await pg.screenshot(path='/home/claude/tst/out/s03-02-ajuda.png')
        n_i=await pg.evaluate('document.querySelectorAll(".aj-i").length'); print('icones ⓘ',n_i)
        # todos os campos .f da aba Dados com chave têm texto?
        sem=await pg.evaluate('''(()=>{const r=[];document.querySelectorAll('.f').forEach(f=>{const c=f.querySelector('[data-crit],[data-sel],[data-chk]');if(c&&!f.querySelector('.aj-i'))r.push(c.getAttribute('data-crit')||c.getAttribute('data-sel')||c.getAttribute('data-chk'))});return r})()'''); print('campos sem ajuda',sem)
        # 3) planta: ligações
        await pg.click('[data-tab="tracado"]'); await pg.wait_for_timeout(500)
        await pg.evaluate('(()=>{const t=__esg.P.trechos[0];__esg.SEL={tipo:"tr",id:t.id};})()') if False else None
        # dar zoom em um trecho: ajustar viewBox
        await pg.evaluate('''(()=>{const n=__esg.P.nos[3];PL.vb={x:n.x-60,y:-n.y-45,w:120,h:90};plDesenhar();})()''')
        await pg.wait_for_timeout(300)
        cont=await pg.evaluate('({lg:document.querySelectorAll("[data-lg]").length,lotes:document.querySelectorAll("path[fill=\\"#d6a04a\\"]").length})'); print('planta zoom',cont)
        await pg.screenshot(path='/home/claude/tst/out/s03-03-planta-lotes.png')
        # arrastar uma ligação
        idx=await pg.evaluate('''(()=>{const l=[...document.querySelectorAll("[data-lg]")];const s=document.getElementById("pl-svg").getBoundingClientRect();return l.findIndex(e=>{const b=e.getBoundingClientRect();return b.x>s.x+80&&b.x<s.x+s.width-120&&b.y>s.y+80&&b.y<s.y+s.height-80})})()''')
        el=pg.locator('[data-lg]').nth(idx); bb=await el.bounding_box(); ds=await el.get_attribute('data-lg')
        antes=await pg.evaluate(f'JSON.stringify(ESG.ligacoes(__esg.P,__esg.R).find(q=>q.id==="{ds.replace(":","#")}"))')
        await pg.mouse.move(bb['x']+bb['width']/2,bb['y']+bb['height']/2); await pg.mouse.down(); await pg.mouse.move(bb['x']+bb['width']/2+40,bb['y']+bb['height']/2+3,steps=6); await pg.mouse.up(); await pg.wait_for_timeout(300)
        dep=await pg.evaluate(f'JSON.stringify({{t:__esg.P.trechos.find(t=>t.id==="{ds.split(":")[0]}").lig&&__esg.P.trechos.find(t=>t.id==="{ds.split(":")[0]}").lig.length, q:ESG.ligacoes(__esg.P,__esg.R).find(q=>q.id==="{ds.replace(":","#")}")}})')
        print('arrasto antes s=',json.loads(antes)['s'],'depois',json.loads(dep)['q']['s'],'manual',json.loads(dep)['t'])
        # + ligação
        n0=await pg.evaluate('ESG.ligacoes(__esg.P,__esg.R).length')
        await pg.click('[data-plmodo="lgadd"]')
        ds2=await pg.evaluate('''(()=>{const s=document.getElementById("pl-svg").getBoundingClientRect();for(const e of document.querySelectorAll("line[data-tr][stroke=transparent]")){const b=e.getBoundingClientRect();const cx=b.x+b.width/2,cy=b.y+b.height/2;if(cx>s.x+100&&cx<s.x+s.width-100&&cy>s.y+100&&cy<s.y+s.height-100)return [cx,cy]}return null})()''')
        await pg.mouse.click(ds2[0]+0,ds2[1]+0); await pg.wait_for_timeout(300)
        n1=await pg.evaluate('ESG.ligacoes(__esg.P,__esg.R).length'); print('+ligação',n0,'->',n1)
        # excluir
        await pg.click('[data-plmodo="del"]'); el=pg.locator('[data-lg]').nth(idx); b3=await el.bounding_box(); await pg.mouse.click(b3['x']+b3['width']/2,b3['y']+b3['height']/2); await pg.wait_for_timeout(300)
        print('excluir', await pg.evaluate('ESG.ligacoes(__esg.P,__esg.R).length'))
        await pg.click('[data-plmodo="sel"]')
        # testada do trecho
        tid=await pg.evaluate('__esg.P.trechos[1].id')
        await pg.evaluate(f'SEL={{tipo:"tr",id:"{tid}"}};ladoTracado()'); await pg.wait_for_timeout(200)
        a0=await pg.evaluate(f'ESG.ligacoes(__esg.P,__esg.R).filter(q=>q.tr==="{tid}").length')
        inp=pg.locator('[data-tst]'); await inp.fill('20'); await inp.blur(); await pg.wait_for_timeout(300)
        a1=await pg.evaluate(f'ESG.ligacoes(__esg.P,__esg.R).filter(q=>q.tr==="{tid}").length'); print('testada 12->20 no trecho',a0,'->',a1)
        # passeio
        await pg.evaluate(f'SEL={{tipo:"tr",id:"{tid}"}};ladoTracado()')
        await pg.select_option('[data-trk="loc"]','passeio'); await pg.wait_for_timeout(300)
        r_=await pg.evaluate(f'(()=>{{const L=ESG.ligacoes(__esg.P,__esg.R).filter(q=>q.tr==="{tid}");return {{n:L.length,min:Math.min(...L.map(q=>q.L)),max:Math.max(...L.map(q=>q.L))}}}})()'); print('passeio ramais',r_)
        await pg.screenshot(path='/home/claude/tst/out/s03-04-passeio.png')
        # global: testada padrão 12 -> 10 em Dados
        await pg.click('[data-tab="dados"]'); await pg.fill('[data-crit="testada"]','10'); await pg.locator('[data-crit="testada"]').blur(); await pg.wait_for_timeout(300)
        print('testada 10 -> ligações', await pg.evaluate('__esg.Q.ligList.length'))
        # orçamento usa ramais medidos
        await pg.click('[data-tab="orc"]'); await pg.wait_for_timeout(1500)
        print('orc ligação', await pg.evaluate('JSON.stringify(orcLinhas().filter(i=>/lig|ramal/.test(i.k)).map(i=>[i.k,Math.round(i.q)]))'))
        # 3D
        await pg.click('[data-tab="t3"]'); await pg.wait_for_timeout(2500)
        print('3D lig', await pg.evaluate('JSON.stringify({lig:T3.G.lig.children.length,tubos:T3.G.tubos.children.length})'))
        await pg.screenshot(path='/home/claude/tst/out/s03-05-3d.png')
        # DXF
        dxf=await pg.evaluate('(()=>{const c=cadCena();return JSON.stringify({lig:c.ents.filter(e=>e.l==="ESG-LIGACAO").length})})()') ; print('cad',dxf)
        print('ERROS', [e for e in erros if 'Failed to load' not in e][:8])
        await b.close()
    srv.terminate()
asyncio.run(main())
