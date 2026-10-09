/* ============================================================
   CONFIGURAÇÃO DO FIREBASE — Total Civil (projeto calculadora-dnit)
   Um único cadastro de usuários para todos os programas.
   ============================================================ */
window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZyUlkiGAOhe4NP7PX_jaaJzcS98tldDo",
  authDomain:        "calculadora-dnit.firebaseapp.com",
  projectId:         "calculadora-dnit",
  storageBucket:     "calculadora-dnit.firebasestorage.app",
  messagingSenderId: "1003742612156",
  appId:             "1:1003742612156:web:7e27813b90a16bea715eb9",
  measurementId:     "G-BBR52B31WC"
};

/* Administradores: controle total dos acessos.
   Esta lista precisa ser IGUAL à da função admin() nas regras do Firestore. */
window.ADMINS = [
  "wfajardoeng@gmail.com",
  "igororcobras@gmail.com"
];
