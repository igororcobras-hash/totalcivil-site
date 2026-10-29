/* Avisa o administrador (WhatsApp via CallMeBot e notificação via ntfy) quando alguém se cadastra,
   pede acesso teste/pacote ou avisa um pagamento. Roda no GitHub Actions a cada ~10 minutos.
   Chaves e telefone ficam nos segredos do GitHub, nunca no código do site.
   O ponto de partida fica em config/avisos (campo ultimo, em ms). Na 1ª execução só marca o ponto de partida. */
const NOMES = {orcamento: 'Orçamento', intertravado: 'Intertravado', drenagem: 'Drenagem', visitas: 'Visitas', manutencao: 'Serviços Públicos', estrutura: 'Estrutura'};

function ms(v){ if(!v) return 0; if(typeof v.toMillis === 'function') return v.toMillis(); const d = new Date(v); return isNaN(d.getTime()) ? 0 : d.getTime(); }

/* eventos novos de um usuário desde "ultimo" */
function eventos(u, ultimo){
  const ev = [];
  const progs = (u.programasPedidos || []).map(k => NOMES[k] || k).join(', ');
  if(ms(u.criadoEm) > ultimo) ev.push('Novo cadastro');
  if(ms(u.pedidoEm) > ultimo) ev.push((u.tipoPedido === 'teste' ? 'Pedido de ACESSO TESTE' : 'Pedido de pacote') + (progs ? ' (' + progs + ')' : ''));
  if(ms(u.pagamentoAvisadoEm) > ultimo) ev.push('Aviso de pagamento');
  return ev;
}
function montar(u, ev){
  const l = ['Total Civil: ' + ev.join(' + '), (u.nome || '(sem nome)') + (u.empresa ? ' · ' + u.empresa : ''), u.email || ''];
  if(u.whatsapp) l.push('WhatsApp: ' + u.whatsapp);
  return l.filter(Boolean).join('\n');
}
module.exports = {eventos, montar, ms};

if(require.main === module){
  (async () => {
    const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
    if(!conta) throw new Error('Falta o segredo FIREBASE_SERVICE_ACCOUNT.');
    const admin = require('firebase-admin');
    admin.initializeApp({credential: admin.credential.cert(JSON.parse(conta))});
    const db = admin.firestore();
    const ref = db.doc('config/avisos');
    const agora = Date.now();
    const snap = await ref.get();
    if(!snap.exists){ await ref.set({ultimo: agora}); console.log('Primeira execução: ponto de partida gravado, sem avisos.'); return; }
    const ultimo = snap.data().ultimo || 0;
    const T = admin.firestore.Timestamp.fromMillis(ultimo);
    const vistos = new Map();
    for(const campo of ['criadoEm', 'pedidoEm', 'pagamentoAvisadoEm']){
      const q = await db.collection('usuarios').where(campo, '>', T).get();
      q.forEach(d => vistos.set(d.id, d.data()));
    }
    const fone = process.env.CALLMEBOT_FONE, chave = process.env.CALLMEBOT_CHAVE, topico = process.env.NTFY_TOPICO;
    if(!(fone && chave) && !topico){ console.log('Nenhum canal configurado (CALLMEBOT_FONE/CALLMEBOT_CHAVE ou NTFY_TOPICO): nada enviado e ponto de partida mantido.'); return; }
    let falhas = 0, enviados = 0;
    for(const [, u] of vistos){
      const ev = eventos(u, ultimo); if(!ev.length) continue;
      const texto = montar(u, ev);
      if(fone && chave){
        try{
          const r = await fetch('https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(fone) + '&text=' + encodeURIComponent(texto) + '&apikey=' + encodeURIComponent(chave));
          if(!r.ok) throw new Error('HTTP ' + r.status);
        }catch(e){ falhas++; console.error('CallMeBot falhou:', e.message); }
      }
      if(topico){
        try{
          const r = await fetch('https://ntfy.sh/' + encodeURIComponent(topico), {method: 'POST', body: texto, headers: {Title: 'Total Civil: ' + ev[0], Tags: 'bell'}});
          if(!r.ok) throw new Error('HTTP ' + r.status);
        }catch(e){ falhas++; console.error('ntfy falhou:', e.message); }
      }
      enviados++;
    }
    console.log(enviados + ' aviso(s) tentado(s), ' + falhas + ' falha(s).');
    if(!falhas) await ref.set({ultimo: agora}); else console.log('Houve falhas: ponto de partida mantido para tentar de novo.');
  })().catch(e => { console.error('ERRO: ' + (e.message || e)); process.exit(1); });
}
