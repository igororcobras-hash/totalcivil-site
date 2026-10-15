# Total Civil

Página principal e programas de engenharia civil. Endereço: https://totalcivil.com.br/

- `index.html`: página principal com login único, cadastro, pacotes (R$ 55/programa/mês, 2 meses grátis, indicação 10%), pagamento (Pix/transferência, aviso pelo WhatsApp), pedidos de programa personalizado e painel **Usuários** dos administradores.
- `pavimento/`, `orcamento/`, `intertravado/`: os programas. Todos usam o mesmo login (mesmo endereço = mesma sessão). Sem login, mandam para a página principal.
- `firestore.rules`: regras do banco. Ao mudar, cole em Firebase › Firestore Database › Regras › Publicar.
- Os endereços antigos (pavimento./orcamento./intertravado.totalcivil.com.br) redirecionam para cá.
- `orcamento/dados/`: bancos mensais SINAPI (RJ) e SCO-Rio, um arquivo por mês (nenhum mês é apagado). Gravados pela rotina **Bancos mensais SINAPI e SCO** (`.github/workflows/bancos-mensais.yml` + `scripts/bancos/`), que roda todo dia do dia 3 ao 28, baixa o mês novo da Caixa e da Prefeitura do Rio, confere abas, colunas, Onerado/Desonerado, mês e preços contra o mês anterior, e só grava se tudo bater. Para buscar meses antigos: Actions › Bancos mensais › Run workflow › "desde" = AAAA-MM. No programa, o seletor "📅 Mês" escolhe o mês.
