# Total Civil

Página principal e programas de engenharia civil. Endereço: https://totalcivil.com.br/

- `index.html`: página principal com login único, cadastro, pacotes (R$ 55/programa/mês, 2 meses grátis, indicação 10%), pagamento (Pix/cartão, aviso pelo WhatsApp), pedidos de programa personalizado e painel **Usuários** dos administradores.
- `pavimento/`, `orcamento/`, `intertravado/`: os programas. Todos usam o mesmo login (mesmo endereço = mesma sessão). Sem login, mandam para a página principal.
- `firestore.rules`: regras do banco. Ao mudar, cole em Firebase › Firestore Database › Regras › Publicar.
- Os endereços antigos (pavimento./orcamento./intertravado.totalcivil.com.br) redirecionam para cá.
