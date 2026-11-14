import asyncio, json, base64
from playwright.async_api import async_playwright
from base import abrir, servidor
OUT='/home/claude/tst/out/'
async def main():
    srv=servidor()
    async with async_playwright() as p:
        b,pg,erros=await abrir(p)
        await pg.goto('http://localhost:8765/esgoto/'); await pg.click('[data-amb="pc"]')
        await pg.click('[data-act="exemplo"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-tab="dados"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=OUT+'v2-01-dados.png', full_page=True)
        await pg.click('[data-tab="tracado"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-act="sugEEE"]'); await pg.wait_for_timeout(300)
        print('sug sem necessidade:', await pg.evaluate('document.getElementById("toast").textContent.slice(0,90)'), 'eee', await pg.evaluate('P.eee.length'))
        # rede plana e comprida: precisa de elevatória
        await pg.evaluate('''(()=>{ const p=ESG.exemplo(8,2,100,0.0002); p.nome='Teste v2 — elevatória e sifão'; p.local='Rio das Ostras'; p.crit.profMax=3.5; novoProjeto(p); })()'''); await pg.wait_for_timeout(500)
        print('antes', await pg.evaluate('JSON.stringify({prof:R.profMaxima.toFixed(2),err:R.nErr,warn:R.nWarn})'))
        await pg.click('[data-act="sugEEE"]'); await pg.wait_for_timeout(400); await pg.screenshot(path=OUT+'v2-02-sugestao.png')
        print('depois', await pg.evaluate('JSON.stringify({eee:Object.values(R.eee).map(e=>[e.nome,e.Qb.toFixed(2),e.AMT.toFixed(2),e.Pm,e.dn,e.Lr]),prof:R.profMaxima.toFixed(2),err:R.nErr,warn:R.nWarn,manual:P.manual})'))
        await pg.click('[data-fechar]')
        # sifão e passeio pelo painel lateral
        tid=await pg.evaluate('R.coletores[0].trechos[2]')
        await pg.evaluate(f'(()=>{{SEL={{tipo:"tr",id:"{tid}"}}; ladoTracado(); plDesenhar();}})()')
        await pg.select_option(f'select[data-sif="on"][data-id="{tid}"]','1'); await pg.wait_for_timeout(300)
        await pg.select_option(f'select[data-trk="loc"][data-id="{tid}"]','passeio'); await pg.wait_for_timeout(300)
        print('sifão', await pg.evaluate(f'JSON.stringify({{sif:R.tr["{tid}"].sif&&[R.tr["{tid}"].sif.n,R.tr["{tid}"].sif.dn,R.tr["{tid}"].sif.dH.toFixed(3)],loc:trDe("{tid}").loc,err:R.nErr,warn:R.nWarn}})'))
        t2=await pg.evaluate('R.coletores[1].trechos[0]')
        await pg.evaluate(f'(()=>{{SEL={{tipo:"tr",id:"{t2}"}}; ladoTracado();}})()'); await pg.select_option(f'select[data-trk="mat"][data-id="{t2}"]','pvcc'); await pg.wait_for_timeout(200)
        # PV com elevatória: painel
        eno=await pg.evaluate('P.eee[0].no'); await pg.evaluate(f'(()=>{{SEL={{tipo:"no",id:"{eno}"}}; ladoTracado(); plDesenhar();}})()'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT+'v2-03-tracado-eee.png')
        await pg.select_option('select[data-eee="mat"]','pead'); await pg.wait_for_timeout(200)
        print('eee pead', await pg.evaluate('JSON.stringify(Object.values(R.eee).map(e=>[e.matNome,e.dn,e.V.toFixed(2)]))'))
        for t in ['dim','perfil','t3','orc','memo']:
            await pg.click(f'[data-tab="{t}"]'); await pg.wait_for_timeout(2500 if t in('orc','t3') else 600)
            if t=='perfil': await pg.evaluate('(()=>{PF.col=R.tr[R.ordem.find(i=>R.tr[i].recq)].col; render();})()'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'v2-04-{t}.png', full_page=(t in ('dim','orc')))
        await pg.click('[data-tab="orc"]'); await pg.wait_for_timeout(800)
        for bk in ['sinapi','sco','emop']:
            await pg.select_option('#orc-banco',bk); await pg.wait_for_timeout(300)
            print('ORC',bk, await pg.evaluate('''JSON.stringify((()=>{const L=orcLinhas(); return {ref:orcRefTxt(orcCfg().banco),n:L.length,sub:L.reduce((s,i)=>s+i.total,0).toFixed(2),semPreco:L.filter(i=>!(i.pu>0)).map(i=>i.k),outro:L.filter(i=>i.b&&i.b!==orcCfg().banco).map(i=>i.k+'>'+i.b).length,undif:L.filter(i=>i.r&&i.r.unid&&i.r.unid.toUpperCase().replace('³','3').replace('²','2')!==ESG.itens(P,R,Q,orcCfg().sol).find(x=>x.k===i.k).un.toUpperCase().replace('³','3').replace('²','2')).map(i=>i.k+':'+i.r.unid+'/'+i.b)}})())'''))
        print('3x3', await pg.evaluate('JSON.stringify(ESG.SOL.map(s=>Object.keys(BANCOS).map(b=>Math.round(orcTotal(s.k,b).tot))))'))
        await pg.select_option('#orc-banco','sinapi'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as d: await pg.click('[data-act="xlsOrc"]')
        f=await d.value; await f.save_as(OUT+'v2-orcamento.xlsx'); print('xlsx', f.suggested_filename)
        await pg.evaluate('window.open=()=>null'); await pg.click('[data-act="orcEnviar"]'); await pg.wait_for_timeout(800)
        env=json.loads(await pg.evaluate('localStorage.getItem("tc_envio_orcamento")')); open(OUT+'v2-envio.xlsx','wb').write(base64.b64decode(env['b64'])); print('envio', {k:env[k] for k in env if k!='b64'})
        await pg.click('[data-act="orcTres"]'); await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'v2-05-tcorc.png')
        print('TCORC', await pg.evaluate('JSON.stringify([...document.querySelectorAll("#tco-body .tco-tot")].map(e=>e.textContent))'), await pg.evaluate('(document.querySelector("#tco-body .tco-msg")||{}).textContent||""'))
        await pg.evaluate('document.getElementById("tco-modal").classList.remove("on")')
        await pg.click('[data-tab="tracado"]'); await pg.wait_for_timeout(300)
        async with pg.expect_download() as d: await pg.click('[data-act="cadDxf"]')
        f=await d.value; await f.save_as(OUT+'v2-projeto.dxf'); print('dxf', f.suggested_filename)
        async with pg.expect_download(timeout=60000) as d: await pg.click('[data-act="cadDwg"]')
        f=await d.value; await f.save_as(OUT+'v2-projeto.'+f.suggested_filename.split('.')[-1]); print('dwg', f.suggested_filename, await pg.evaluate('document.getElementById("toast").textContent'))
        print('cena', await pg.evaluate('JSON.stringify((()=>{const c=cadCena(), n={}; c.ents.forEach(e=>n[e.t]=(n[e.t]||0)+1); return n;})())'))
        # desfazer tudo e recarregar
        await pg.reload(); await pg.wait_for_timeout(600)
        print('recarregou', await pg.evaluate('JSON.stringify({eee:P.eee.length,sif:P.trechos.filter(t=>t.sif).length,err:R.nErr,banco:P.orc.banco})'))
        print('ERROS', erros[:12])
        await b.close()
    srv.terminate()
asyncio.run(main())
