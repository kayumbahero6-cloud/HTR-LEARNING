/* Online / offline data handling and the optional Firebase copy.
 * - Offline: study data is kept in this device's localStorage (see core.js) and uploaded automatically when the connection returns.
 * - Firebase (optional): paste your web-app config on the Data & sync page. While online, a copy of the person's personal study data
 *   (notes, flashcard decks, planner, calendar) is written to your Firestore project. The platform's own database stays the source of truth. */
import { S, h, mount, GET, store, toast, fail, setTitle, offline, flushQueue } from './core.js';
import { route } from './router.js';

const FB_VER = '10.12.2', FB_KEY = 'edu.fb', FB_STAMP = 'edu.fb.last';
const MIRROR = ['/notes', '/decks', '/planner', '/calendar'];

/* ---------- parse whatever the Firebase console gives you ---------- */
export function parseFirebaseConfig(text) {
  const all = String(text || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');   // drop comments
  // The console snippet also contains `import { initializeApp } ...`, so look for the object that holds apiKey, not the first brace.
  const m = all.match(/firebaseConfig\s*=\s*(\{[\s\S]*?\})\s*;?/) || all.match(/(\{[^{}]*apiKey[^{}]*\})/);
  if (!m) throw new Error('Paste the firebaseConfig block from the Firebase console.');
  let src = m[1];
  src = src.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":').replace(/'([^']*)'/g, '"$1"').replace(/,\s*}/g, '}');
  let cfg; try { cfg = JSON.parse(src); } catch { throw new Error('That does not look like a Firebase config. Copy the whole { ... } block.'); }
  if (!cfg.apiKey || !cfg.projectId) throw new Error('The config needs at least apiKey and projectId.');
  const keep = {}; for (const k of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId']) if (typeof cfg[k] === 'string') keep[k] = cfg[k].slice(0, 200);
  return keep;
}
export const fbConfig = () => { try { const c = JSON.parse(store.get(FB_KEY) || 'null'); if (c && c.projectId) return c; } catch { /* none */ } return (window.EDU_CONFIG && window.EDU_CONFIG.firebase) || null; };

/* ---------- load the SDK on demand ---------- */
const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('Could not load Firebase. Check your connection.')); document.head.append(s); });
let fbReady = null;
function firebaseDb() {
  if (fbReady) return fbReady;
  fbReady = (async () => {
    const cfg = fbConfig(); if (!cfg) throw new Error('No Firebase config saved.');
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    if (!window.firebase) { await loadScript(base + 'firebase-app-compat.js'); await loadScript(base + 'firebase-auth-compat.js'); await loadScript(base + 'firebase-firestore-compat.js'); }
    const fb = window.firebase, app = fb.apps.length ? fb.app() : fb.initializeApp(cfg);
    let uid = null; try { if (!app.auth().currentUser) await app.auth().signInAnonymously(); uid = app.auth().currentUser && app.auth().currentUser.uid; } catch { /* anonymous sign-in not enabled: rules decide */ }
    return { db: app.firestore(), authUid: uid };
  })().catch(e => { fbReady = null; throw e; });
  return fbReady;
}

/* ---------- mirror personal study data ---------- */
let busy = false;
export async function mirrorNow() {
  if (busy || !S.user || !navigator.onLine || !fbConfig()) return { skipped: true };
  busy = true;
  try {
    const { db } = await firebaseDb(); let n = 0;
    const root = db.collection('edulearn_users').doc(String(S.user.id));
    await root.set({ name: S.user.name, role: S.user.role, updatedAt: Date.now() }, { merge: true });
    for (const path of MIRROR) {
      let data; try { data = await GET(path); } catch { continue; } if (data && data._offline) continue;
      await root.collection('data').doc(path.slice(1)).set({ path, json: JSON.stringify(data).slice(0, 900000), savedAt: Date.now() }); n++;
    }
    store.set(FB_STAMP, String(Date.now())); return { saved: n };
  } finally { busy = false; }
}

/* ---------- status bar ---------- */
let bar;
function paint() {
  if (!bar) { bar = h('div', { id: 'offbar', class: 'offbar', role: 'status', 'aria-live': 'polite', hidden: true }); document.body.append(bar); }
  const n = offline.pending(), off = !navigator.onLine;
  bar.hidden = !(off || n);
  bar.textContent = off ? `You are offline. Your changes are saved on this device${n ? ` (${n} waiting to upload)` : ''}.` : `Uploading ${n} saved change${n === 1 ? '' : 's'}…`;
  bar.classList.toggle('off', off);
}
offline.listeners.push(paint);
window.addEventListener('online', () => { paint(); toast('Back online', 'ok'); });
window.addEventListener('offline', paint);
window.addEventListener('edu:synced', e => { paint(); toast(`${e.detail.sent} offline change${e.detail.sent === 1 ? '' : 's'} uploaded`, 'ok'); mirrorNow().catch(() => {}); window.dispatchEvent(new HashChangeEvent('hashchange')); });
setInterval(() => { if (S.user && navigator.onLine && fbConfig()) mirrorNow().catch(() => {}); }, 5 * 60e3);
paint();

/* ---------- Data & sync page ---------- */
route('/sync', async () => {
  setTitle('Data & sync');
  const status = h('p', { class: 'muted' }), body = h('div');
  const cfgBox = h('textarea', { rows: 9, spellcheck: 'false', 'aria-label': 'Firebase config', placeholder: `const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "your-app.firebaseapp.com",\n  projectId: "your-app",\n  storageBucket: "...",\n  messagingSenderId: "...",\n  appId: "..."\n};`, style: { width: '100%', fontFamily: 'monospace' } });
  const draw = () => {
    const cfg = fbConfig(), last = Number(store.get(FB_STAMP) || 0), n = offline.pending();
    status.textContent = (navigator.onLine ? 'Online. ' : 'Offline. ') + (n ? `${n} change${n === 1 ? '' : 's'} saved on this device, waiting to upload.` : 'Nothing is waiting on this device.');
    mount(body,
      h('section', { class: 'block' }, h('h2', 'This device'), status,
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', disabled: !n || !navigator.onLine, onclick: async () => { try { const k = await flushQueue(); toast(k ? `${k} uploaded` : 'Nothing uploaded', 'ok'); } catch (e) { fail(e); } draw(); } }, 'Upload saved changes now')),
        h('p', { class: 'small muted' }, 'Notes, tasks, flashcards, planner, calendar and study time keep working without internet. Tests, exams, sign-in and messages need a connection.')),
      h('section', { class: 'block' }, h('h2', 'Firebase database'),
        cfg ? h('p', 'Connected to project ', h('strong', cfg.projectId), last ? '. Last copy: ' + new Date(last).toLocaleString() : '. No copy made yet.') : h('p', { class: 'muted' }, 'Not connected. Paste your Firebase web-app config to keep an online copy of your study data.'),
        cfgBox,
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => { try { const c = parseFirebaseConfig(cfgBox.value); store.set(FB_KEY, JSON.stringify(c)); toast('Firebase saved on this device', 'ok'); draw(); } catch (e) { toast(e.message, 'err'); } } }, 'Save config'),
          h('button', { class: 'btn', type: 'button', disabled: !cfg, onclick: async () => { try { const r = await mirrorNow(); toast(r.skipped ? 'Go online first' : `Copied ${r.saved} data sets to Firebase`, r.skipped ? '' : 'ok'); } catch (e) { toast(e.message || 'Firebase copy failed. Check Firestore rules.', 'err'); } draw(); } }, 'Copy to Firebase now'),
          cfg && h('button', { class: 'btn quiet', type: 'button', onclick: () => { store.del(FB_KEY); store.del(FB_STAMP); fbReady = null; draw(); } }, 'Disconnect')),
        h('details', { class: 'small muted' }, h('summary', 'Firestore setup'), h('ol',
          h('li', 'In the Firebase console create a project, add a Web app and copy its config.'),
          h('li', 'Enable Firestore, and Authentication → Anonymous sign-in.'),
          h('li', 'Use rules that need a signed-in session, for example: ', h('code', "match /edulearn_users/{u}/{document=**} { allow read, write: if request.auth != null; }")),
          h('li', 'Never use open rules (allow read, write: if true): the copy contains personal notes.'))),
        h('p', { class: 'small muted' }, 'The config is stored only in this browser. Firebase web keys are not secret, so protect the data with rules.')));
  };
  draw(); offline.listeners.push(draw);
  return h('div', { class: 'page narrow' }, h('div', { class: 'page-head' }, h('h1', 'Data & sync')), body);
});
