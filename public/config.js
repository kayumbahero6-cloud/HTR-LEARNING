/* Deployment settings. Leave wsUrl empty when the app and API share one origin (npm start, Docker, nginx).
 * On Netlify, set it to your backend's WebSocket address, e.g. "wss://edulearn-api.onrender.com/ws",
 * because Netlify redirects cannot proxy WebSockets. */
window.EDU_CONFIG = {
  wsUrl: '',
  // Firebase web config (not a secret; protect the data with Firestore rules).
  firebase: {
    apiKey: 'AIzaSyBTFZOMZAY5lSvCfg2YkN_n15btoflrOgQ',
    authDomain: 'hedu-learn.firebaseapp.com',
    projectId: 'hedu-learn',
    storageBucket: 'hedu-learn.firebasestorage.app',
    messagingSenderId: '538504478487',
    appId: '1:538504478487:web:91645f32a9de329d000152',
    measurementId: 'G-V6T793V2ME'
  }
};
