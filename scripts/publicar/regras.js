/* Publica o arquivo firestore.rules no Firebase (Firestore › Regras) usando a conta de serviço.
   O Firebase valida o texto antes de publicar: se houver erro, ele é mostrado aqui e nada muda. */
const fs = require('fs');
(async () => {
  const conta = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!conta) throw new Error('Falta o segredo FIREBASE_SERVICE_ACCOUNT.');
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(conta)) });
  const fonte = fs.readFileSync('firestore.rules', 'utf8');
  console.log('Arquivo firestore.rules: ' + fonte.split('\n').length + ' linhas.');
  try {
    await admin.securityRules().releaseFirestoreRulesetFromSource(fonte);
    console.log('OK: regras validadas e publicadas no Firestore.');
  } catch (e) {
    console.error('ERRO ao publicar as regras: ' + (e.message || e));
    if (e.errorInfo) console.error(JSON.stringify(e.errorInfo, null, 2));
    process.exit(1);
  }
})();
