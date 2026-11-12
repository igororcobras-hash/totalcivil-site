---
name: regras-firestore
description: Use SEMPRE que for publicar, editar, copiar ou colar regras do Firestore (firestore.rules) do Total Civil, ou quando criar um programa novo, uma coleção nova do Firestore ou um campo de liberação novo no cadastro. Evita publicar regras incompletas (o que tirou a nuvem do Intertravado em 12/11/2026).
---

# Regras do Firestore — Total Civil

## O que aconteceu (não repetir)
Em 12/11/2026 publiquei um `firestore.rules` que não tinha os blocos `projetosIntertravado` e `diretorioIntertravado`. Eles só existiam no arquivo `firestore-COM-compartilhamento-intertravado.rules`, que o dono tinha colado à mão no Firebase. A publicação SUBSTITUI todas as regras: o Intertravado ficou com "Sem permissão no servidor". Antes disso, o conteúdo das regras também foi colado por engano dentro de `.github/workflows/publicar-regras.yml`, quebrando a rotina.

## Regras de ouro
1. **Existe UM arquivo de regras: `firestore.rules`** (completo, com todos os programas). O `firestore-COM-compartilhamento-intertravado.rules` é só uma cópia com aviso; nunca edite um sem o outro.
2. **Publicar substitui TUDO.** Antes de publicar qualquer arquivo de regras: rode `node scripts/publicar/conferir-regras.js` (a rotina do GitHub já roda isto sozinha e bloqueia).
3. **Programa novo, coleção nova ou campo novo = mexer em 5 lugares** (e o conferidor acusa o que faltar):
   - `index.html` (lista `PROGRAMAS`: `key`, `campo`, `solic`);
   - `scripts/publicar/montar-site.js` (lista `PROGRAMAS`: `prog`, `campo`, `pedido`);
   - `firestore.rules`: `campoDoPrograma()`; lista de campos e `falsoOuAusente` no `create` de `usuarios`; lista e regra do `update` de `usuarios`;
   - `firestore.rules`: bloco `match /<coleção>/{id}` de cada coleção nova;
   - `scripts/avisos/avisar.js` (nome do programa nos avisos) e `CLAUDE.md`.
4. **Nunca cole regras dentro de `.github/workflows/*.yml`.** Regras vão só em `firestore.rules`.
5. Não mexa em `firestore.rules` sem pedido do dono (regra do site) — e, se mexer, mantenha as permissões que já existem: compare com `git diff` ignorando comentários e ordem.

## Como publicar
- **Pelo GitHub:** Actions › "Publicar regras do Firestore" › Run workflow (ramo `main`). Passos: conferir → validar → publicar. Termina com "OK: regras validadas e publicadas no Firestore".
- **Pelo console:** Firebase › Firestore Database › Regras: apague tudo, cole `firestore.rules` e Publicar.
- A sessão do Claude Code pode ser barrada pelo modo automático ao rodar `gh workflow run` ou `git push` (publicação em produção): não contorne; peça ao dono para liberar ou fazer o clique.

## Depois de publicar
Peça ao dono para testar com o login dele: Intertravado › ☁ Nuvem, Drenagem 2 › Projetos na nuvem, Serviços Públicos (obra na nuvem), Pavimento Flexível (projeto na nuvem). Eu não consigo testar com login real: diga isso.

## Conferidor (`scripts/publicar/conferir-regras.js`)
Confere: (1) todo programa de `montar-site.js` está em `campoDoPrograma()`; (2) todo campo `...Ativo`/`...Solicitado` está nas regras do cadastro; (3) toda coleção usada no código (`collection(d,'x')`, `doc(d,'x')`, `NUV_COL`) tem `match`; (4) estrutura do arquivo (versão, chaves, bloqueio final) e que não é um arquivo de rotina. Se acusar coleção que não é do Firestore (falso positivo), ajuste o padrão no conferidor, não as regras.
