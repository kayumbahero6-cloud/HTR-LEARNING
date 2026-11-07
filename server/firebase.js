'use strict';
/* Firebase Authentication over its public REST API (no extra packages).
 * Why: accounts live in the owner's Firebase project, which is online storage that survives restarts and redeploys of this server,
 * and Firebase sends the "verify your email" message, so no mail server or SMTP is needed.
 * The server keeps its own copy of each account for speed. If its disk is ever wiped, signing in with the email and password restores it. */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

// Production uses the web config already shipped in public/config.js unless FIREBASE_API_KEY is set. FIREBASE_AUTH=off disables it.
function findKey() {
  if (process.env.FIREBASE_API_KEY) return process.env.FIREBASE_API_KEY;
  if (!cfg.IS_PROD) return '';
  try { const m = fs.readFileSync(path.join(__dirname, '..', 'public', 'config.js'), 'utf8').match(/apiKey:\s*['"]([^'"]+)['"]/); return m ? m[1] : ''; } catch { return ''; }
}
cfg.FIREBASE_API_KEY = cfg.FIREBASE_API_KEY || findKey();
const enabled = () => !!cfg.FIREBASE_API_KEY && String(process.env.FIREBASE_AUTH || 'auto').toLowerCase() !== 'off';

class FbError extends Error { constructor(code) { super(code); this.code = String(code || 'UNKNOWN').split(' ')[0]; } }
async function post(url, body, form) {
  let r;
  try { r = await fetch(url, { method: 'POST', headers: { 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? new URLSearchParams(body).toString() : JSON.stringify(body), signal: AbortSignal.timeout(12000) }); }
  catch (e) { throw new FbError('NETWORK'); }
  let d = {}; try { d = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw new FbError((d.error && d.error.message) || 'HTTP_' + r.status);
  return d;
}
const ID = () => `https://identitytoolkit.googleapis.com/v1/accounts`;
const K = () => '?key=' + encodeURIComponent(cfg.FIREBASE_API_KEY);

const signUp = (email, password, displayName) => post(`${ID()}:signUp${K()}`, { email, password, displayName, returnSecureToken: true });
const signIn = (email, password) => post(`${ID()}:signInWithPassword${K()}`, { email, password, returnSecureToken: true });
async function lookup(idToken) { const d = await post(`${ID()}:lookup${K()}`, { idToken }); const u = (d.users || [])[0] || {}; return { emailVerified: !!u.emailVerified, displayName: u.displayName || '', localId: u.localId }; }
const sendVerify = idToken => post(`${ID()}:sendOobCode${K()}`, { requestType: 'VERIFY_EMAIL', idToken });
const setPassword = (idToken, password) => post(`${ID()}:update${K()}`, { idToken, password, returnSecureToken: true });
const deleteAccount = idToken => post(`${ID()}:delete${K()}`, { idToken });
const refresh = refreshToken => post(`https://securetoken.googleapis.com/v1/token${K()}`, { grant_type: 'refresh_token', refresh_token: refreshToken }, true).then(d => ({ idToken: d.id_token, refreshToken: d.refresh_token }));

// Errors that mean "this Firebase project is not set up for email and password sign-in yet", as opposed to a temporary failure.
const isSetupError = c => ['OPERATION_NOT_ALLOWED', 'CONFIGURATION_NOT_FOUND', 'API_KEY_INVALID', 'API_KEY_HTTP_REFERRER_BLOCKED', 'PROJECT_NOT_FOUND', 'ADMIN_ONLY_OPERATION'].includes(c) || /^HTTP_40[13]$/.test(c) || /API_KEY|PERMISSION|BLOCKED/i.test(c);

module.exports = { enabled, deleteAccount, signUp, signIn, lookup, sendVerify, setPassword, refresh, isSetupError, FbError };
