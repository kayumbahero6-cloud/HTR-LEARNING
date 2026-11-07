'use strict';
const express = require('express');
const { q } = require('../db');
const C = require('../crypto');
const cfg = require('../config');
const meta = require('../meta');
const face = require('../face');
const G = require('../gamification');
const mail = require('../mail');
const fb = require('../firebase');
const { checkEmail } = require('../emailcheck');
const { joinByCode, sealContact } = require('../access');
const { HttpError, wrap, S, int, rateLimit, perUser, audit, json, flag } = require('../util');
const { auth, authPartial, publicUser, ageOf, issueSession } = require('../auth');

const router = express.Router();
const rlAuth = rateLimit({ windowMs: 15 * 60e3, max: Number(process.env.RL_AUTH_MAX) || 60, message: 'Too many attempts. Please try again in a few minutes.' });
const fails = new Map(); // email -> {n, until}

router.post('/register', rlAuth, wrap(async (req, res) => {
  const b = req.body || {};
  const chk = await checkEmail(b.email);
  if (!chk.ok) throw new HttpError(400, chk.error, 'bad_email');
  const email = chk.email;
  const pw = String(b.password || '');
  if (pw.length < 8 || pw.length > 200 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw new HttpError(400, 'Password must be at least 8 characters and include a letter and a number');
  const name = S(b.name, 80);
  if (name.length < 2) throw new HttpError(400, 'Enter your full name');
  let role = b.role;
  if (role === 'user') { role = 'student'; b.grade_level = 'adult'; }   // a general user is an independent adult learner: courses, study tools and community, no school needed
  if (!['student', 'creator', 'educator', 'parent'].includes(role)) throw new HttpError(400, 'Choose a role: student, parent, independent creator or educator');
  if (!b.consent_terms) throw new HttpError(400, 'You must accept the terms and privacy notice');
  if (q.get('SELECT id FROM users WHERE email=?', email)) throw new HttpError(409, 'An account with this email already exists');
  const uname = S(b.username, 40).toLowerCase();
  if (uname && !/^[a-z0-9][a-z0-9_.]{2,19}$/.test(uname)) throw new HttpError(400, 'Username must be 3 to 20 characters: letters, numbers, dot or underscore');
  if (uname && q.get('SELECT id FROM users WHERE username=?', uname)) throw new HttpError(409, 'That username is taken. Try another.', 'username_taken');

  let grade = null, birth = null, guardian = null, schoolId = null;
  if (b.school_id) {
    const s = q.get('SELECT id FROM schools WHERE id=?', int(b.school_id));
    if (!s) throw new HttpError(400, 'Selected school was not found');
    schoolId = s.id;
  }
  if (role === 'student') {
    grade = b.grade_level;
    if (!meta.gradeKeys.includes(grade)) throw new HttpError(400, 'Choose your grade level');
    birth = int(b.birth_year);
    const y = new Date().getFullYear();
    if (!birth || birth < y - 45 || birth > y - 2) throw new HttpError(400, 'Enter a valid birth year');
    if (y - birth < 18) {
      guardian = S(b.guardian_contact, 200);
      if (guardian.length < 5) throw new HttpError(400, 'A parent or guardian email/phone is required for learners under 18');
    }
  }
  if (role === 'educator' && !schoolId) {
    const ns = b.new_school || {};
    const sname = S(ns.name, 120);
    if (sname.length < 3) throw new HttpError(400, 'Select your school from the list, or create a new school profile');
  }

  const hash = await C.hashPassword(pw);
  const now = Date.now();
  // The confirmation mail goes out first: if it cannot be sent, nothing has been created and the person can simply try again.
  const rawToken = C.randomHex(32);
  // Preferred path: create the account in Firebase Authentication (online storage) and let Firebase email the confirmation link.
  let fbi = null;
  if (fb.enabled()) {
    try {
      const dn = JSON.stringify({ n: name, r: role, g: grade, b: birth, u: uname || undefined, l: meta.LANGUAGES.some(l => l.key === b.lang) ? b.lang : 'en' });
      let s;
      try { s = await fb.signUp(email, pw, dn); }
      catch (e) {
        if (e.code !== 'EMAIL_EXISTS') throw e;
        try { s = await fb.signIn(email, pw); } catch { throw new HttpError(409, 'An account with this email already exists. Sign in instead.'); }   // same password: the account exists online but not on this server (it was reset)
      }
      const lk = await fb.lookup(s.idToken);
      if (!lk.emailVerified) await fb.sendVerify(s.idToken);
      fbi = { uid: s.localId, refresh: s.refreshToken, verified: lk.emailVerified };
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (fb.isSetupError(e.code)) console.error(`[firebase] sign-up not available (${e.code}). In the Firebase console open Authentication, Sign-in method and enable Email/Password. Falling back to the other email options.`);
      else { console.error('[firebase] sign-up failed:', e.code); throw new HttpError(503, 'We could not send the confirmation email right now. Please try again in a minute.', 'mail_failed'); }
    }
  }
  const needConfirm = fbi ? !fbi.verified : mail.confirmationRequired();
  if (!fbi && needConfirm) try { await mail.send(mail.verificationMail({ email, name }, verifyUrl(req, rawToken))); }
  catch (e) { console.error('[mail] verification send failed:', e.message); throw new HttpError(503, e.code === 'mail_not_configured' ? 'Sign-up is temporarily unavailable: the school has not set up email yet.' : 'We could not send the confirmation email. Check the address and try again.', 'mail_failed'); }
  const consentBio = b.consent_biometric ? 1 : 0;
  const uid = q.run(
    `INSERT INTO users(email,name,role,password_hash,school_id,grade_level,birth_year,guardian_contact_enc,consent_biometric,consent_at,lang,created_at,username)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    email, name, role, hash, schoolId, grade, birth, sealContact(guardian), consentBio, consentBio ? now : null,
    meta.LANGUAGES.some(l => l.key === b.lang) ? b.lang : 'en', now, uname || null).id;
  if (fbi) q.run('UPDATE users SET fb_uid=?, fb_refresh_enc=? WHERE id=?', fbi.uid, C.encrypt(fbi.refresh), uid);

  if (role === 'educator' && !schoolId) {
    const ns = b.new_school;
    const sid = q.run('INSERT OR IGNORE INTO schools(name,country,district,type,created_by,created_at) VALUES(?,?,?,?,?,?)',
      S(ns.name, 120), S(ns.country, 80) || 'Rwanda', S(ns.district, 80), ['school', 'university', 'training-centre', 'other'].includes(ns.type) ? ns.type : 'school', uid, now);
    const school = sid.changes ? { id: sid.id } : q.get('SELECT id FROM schools WHERE lower(name)=lower(?) AND lower(ifnull(district,\'\'))=lower(?)', S(ns.name, 120), S(ns.district, 80));
    q.run('UPDATE users SET school_id=? WHERE id=?', school.id, uid);
  }
  if (role === 'student' && b.class_code) {
    try { joinByCode({ id: uid, school_id: schoolId }, b.class_code); } catch { /* wrong code must not block sign-up; user can retry later */ }
  }
  if (needConfirm && !fbi) saveToken(uid, rawToken);
  else if (!needConfirm) q.run('UPDATE users SET email_verified=1 WHERE id=?', uid);   // email delivery is not set up on this server, so the account is active straight away
  const user = q.get('SELECT * FROM users WHERE id=?', uid);
  audit({ user, ip: req.ip }, 'register', { role, confirmed_by_email: needConfirm });
  res.status(201).json({ verify_required: needConfirm, verify_skipped: !needConfirm, email, via: fbi ? 'firebase' : 'mail', dev_outbox: !fbi && !mail.configured() });
}));

/* ---- Firebase helpers ---- */
async function fbIdToken(u, pw) {
  if (u.fb_refresh_enc) { try { const r = await fb.refresh(C.decryptText(u.fb_refresh_enc)); return r.idToken; } catch { /* fall back to the password */ } }
  if (pw) { const r = await fb.signIn(u.email, pw); q.run('UPDATE users SET fb_refresh_enc=? WHERE id=?', C.encrypt(r.refreshToken), u.id); return r.idToken; }
  throw new Error('no token');
}
// The server's disk was wiped but the account still exists in Firebase: rebuild it from the email and password the person just typed.
async function restoreFromFirebase(email, pw) {
  let s, lk; try { s = await fb.signIn(email, pw); lk = await fb.lookup(s.idToken); } catch { return null; }
  let p = {}; try { p = JSON.parse(lk.displayName || '{}'); } catch { /* plain name */ }
  const role = ['student', 'creator', 'educator', 'parent'].includes(p.r) ? p.r : 'student';
  const grade = role === 'student' && meta.gradeKeys.includes(p.g) ? p.g : null;
  const uname = p.u && /^[a-z0-9][a-z0-9_.]{2,19}$/.test(p.u) && !q.get('SELECT id FROM users WHERE username=?', p.u) ? p.u : null;
  const id = q.run(`INSERT INTO users(email,name,role,password_hash,grade_level,birth_year,consent_biometric,lang,created_at,username,email_verified,fb_uid,fb_refresh_enc) VALUES(?,?,?,?,?,?,0,?,?,?,?,?,?)`,
    email, S(p.n || lk.displayName, 80) || email.split('@')[0], role, await C.hashPassword(pw), grade, int(p.b) || null, meta.LANGUAGES.some(l => l.key === p.l) ? p.l : 'en', Date.now(), uname, lk.emailVerified ? 1 : 0, s.localId, C.encrypt(s.refreshToken)).id;
  console.log('[firebase] restored account from Firebase:', email);
  return q.get('SELECT * FROM users WHERE id=?', id);
}
// Accounts made before Firebase was connected are copied to it the next time their owner signs in (we only know the password then).
async function backfillToFirebase(u, pw) {
  try {
    let s; try { s = await fb.signUp(u.email, pw, JSON.stringify({ n: u.name, r: u.role, g: u.grade_level, b: u.birth_year, u: u.username || undefined, l: u.lang })); }
    catch (e) { if (e.code !== 'EMAIL_EXISTS') throw e; s = await fb.signIn(u.email, pw); }
    q.run('UPDATE users SET fb_uid=?, fb_refresh_enc=? WHERE id=?', s.localId, C.encrypt(s.refreshToken), u.id);
  } catch (e) { console.warn('[firebase] could not copy account to Firebase:', e.code); }
}
const lastResend = new Map();

/* ---- e-mail confirmation ---- */
const hashToken = t => require('crypto').createHash('sha256').update(String(t)).digest('hex');
function verifyUrl(req, token) { return `${cfg.APP_URL || `${req.protocol}://${req.get('host')}`}/#/verify?token=${token}`; }
function saveToken(uid, raw) {
  q.run(`DELETE FROM email_tokens WHERE user_id=? AND purpose='verify'`, uid);
  q.run('INSERT INTO email_tokens(user_id,token_hash,purpose,expires_at,created_at) VALUES(?,?,?,?,?)', uid, hashToken(raw), 'verify', Date.now() + 24 * 3600e3, Date.now());
}

router.post('/verify-email', rlAuth, wrap(async (req, res) => {
  const t = q.get(`SELECT * FROM email_tokens WHERE token_hash=? AND purpose='verify'`, hashToken(S(req.body && req.body.token, 200)));
  if (!t) throw new HttpError(400, 'This confirmation link is not valid. Request a new one from the sign-in page.', 'bad_token');
  const u = q.get('SELECT * FROM users WHERE id=?', t.user_id);
  if (!u) throw new HttpError(400, 'This confirmation link is not valid.', 'bad_token');
  if (u.email_verified) return res.json({ ok: true, already: true, email: u.email });
  if (t.expires_at < Date.now()) throw new HttpError(400, 'This link has expired. Request a new one from the sign-in page.', 'expired');
  q.run('UPDATE users SET email_verified=1, email_verified_at=? WHERE id=?', Date.now(), u.id);
  q.run('UPDATE email_tokens SET used_at=? WHERE id=?', Date.now(), t.id);
  audit({ user: u, ip: req.ip }, 'email_verified', {});
  res.json({ ok: true, email: u.email });
}));

router.post('/resend-verification', rateLimit({ windowMs: 15 * 60e3, max: 8, message: 'Too many requests. Try again later.' }), wrap(async (req, res) => {
  const email = S(req.body && req.body.email, 200).toLowerCase();
  const u = q.get('SELECT * FROM users WHERE email=?', email);
  const generic = { ok: true, message: 'If that address has an unconfirmed account, a new confirmation email is on its way.' };
  if (!u || u.email_verified) return res.json(generic);
  if (u.fb_uid && fb.enabled()) {
    if (Date.now() - (lastResend.get(u.id) || 0) < 60e3) throw new HttpError(429, 'Please wait a minute before asking for another email.', 'cooldown');
    try { const t = await fbIdToken(u); const lk = await fb.lookup(t); if (lk.emailVerified) q.run('UPDATE users SET email_verified=1, email_verified_at=? WHERE id=?', Date.now(), u.id); else await fb.sendVerify(t); }
    catch (e) { console.error('[firebase] resend failed:', e.code || e.message); throw new HttpError(503, 'We could not send the email right now. Try again later.', 'mail_failed'); }
    lastResend.set(u.id, Date.now()); return res.json(generic);
  }
  const last = q.get(`SELECT created_at FROM email_tokens WHERE user_id=? AND purpose='verify' ORDER BY id DESC LIMIT 1`, u.id);
  if (last && Date.now() - last.created_at < 60e3) throw new HttpError(429, 'Please wait a minute before asking for another email.', 'cooldown');
  const raw = C.randomHex(32);
  try { await mail.send(mail.verificationMail(u, verifyUrl(req, raw))); } catch (e) { console.error('[mail] resend failed:', e.message); throw new HttpError(503, 'We could not send the email right now. Try again later.', 'mail_failed'); }
  saveToken(u.id, raw);
  res.json(generic);
}));

router.post('/login', rlAuth, wrap(async (req, res) => {
  const email = S(req.body && req.body.email, 200).toLowerCase();
  const pw = String((req.body && req.body.password) || '');
  const f = fails.get(email);
  if (f && f.until > Date.now()) throw new HttpError(429, 'Too many failed sign-ins. Try again in a few minutes.', 'locked');
  let u = email.includes('@') ? q.get('SELECT * FROM users WHERE email=?', email) : q.get('SELECT * FROM users WHERE username=?', email);   // the field accepts an email or a username
  let u2 = u;
  if (!u2 && email.includes('@') && fb.enabled()) u2 = await restoreFromFirebase(email, pw);
  const ok = await C.verifyPassword(pw, u2 && u2.password_hash);
  if (!u2 || !ok) {
    const n = ((f && f.n) || 0) + 1;
    fails.set(email, { n, until: n >= 8 ? Date.now() + 10 * 60e3 : 0 });
    audit({ ip: req.ip }, 'login_failed', { email });
    throw new HttpError(401, 'Incorrect email, username or password');
  }
  fails.delete(email);
  u = u2;
  if (fb.enabled() && !u.fb_uid && u.status === 'active') await backfillToFirebase(u, pw);
  if (!u.email_verified && u.fb_uid && fb.enabled()) {
    try { const lk = await fb.lookup(await fbIdToken(u, pw)); if (lk.emailVerified) { q.run('UPDATE users SET email_verified=1, email_verified_at=? WHERE id=?', Date.now(), u.id); u.email_verified = 1; } } catch (e) { console.warn('[firebase] verification check failed:', e.code || e.message); }
  }
  if (u.status !== 'active') throw new HttpError(403, 'This account is suspended. Contact your school administrator.', 'suspended');
  if (!u.email_verified) throw new HttpError(403, 'Confirm your email first. We sent a link to ' + u.email + '.', 'email_unverified');
  q.run('UPDATE users SET last_login_at=? WHERE id=?', Date.now(), u.id);
  if (u.face_enc && u.face_login) {
    return res.json({ step_up: 'face', token: issueSession(u, { pend: 1 }), user: { id: u.id, name: u.name } });
  }
  G.touch(u.id);
  audit({ user: u, ip: req.ip }, 'login', {});
  res.json({ token: issueSession(u), user: publicUser(q.get('SELECT * FROM users WHERE id=?', u.id)) });
}));

router.get('/me', authPartial, (req, res) => res.json({ user: publicUser(req.user), pending_face: !!req.token.pend }));

router.put('/me', auth, wrap(async (req, res) => {
  const b = req.body || {};
  const sets = [], vals = [];
  if (b.name !== undefined) { const n = S(b.name, 80); if (n.length < 2) throw new HttpError(400, 'Name is too short'); sets.push('name=?'); vals.push(n); }
  if (b.lang !== undefined && meta.LANGUAGES.some(l => l.key === b.lang)) { sets.push('lang=?'); vals.push(b.lang); }
  if (b.show_on_leaderboard !== undefined) { sets.push('show_on_leaderboard=?'); vals.push(flag(b.show_on_leaderboard)); }
  if (b.face_login !== undefined) {
    if (flag(b.face_login) && !req.user.face_enc) throw new HttpError(400, 'Enroll your face first');
    sets.push('face_login=?'); vals.push(flag(b.face_login));
  }
  if (b.grade_level !== undefined && req.user.role === 'student') {
    if (!meta.gradeKeys.includes(b.grade_level)) throw new HttpError(400, 'Invalid grade');
    sets.push('grade_level=?'); vals.push(b.grade_level);
  }
  if (b.settings && typeof b.settings === 'object') {
    const cur = json(req.user.settings, {});
    const next = { ...cur };
    for (const k of ['font_scale', 'high_contrast', 'reduce_motion', 'dyslexia_font', 'theme']) if (k in b.settings) next[k] = b.settings[k];
    for (const k of ['skin', 'bg', 'avatar', 'frame', 'fx', 'trans', 'hover']) if (k in b.settings) { const v = String(b.settings[k] || ''); if (/^[a-z0-9-]{0,24}$/.test(v)) next[k] = v; }   // cosmetic ids only
    sets.push('settings=?'); vals.push(JSON.stringify(next));
  }
  if (sets.length) q.run(`UPDATE users SET ${sets.join(',')} WHERE id=?`, ...vals, req.user.id);
  res.json({ user: publicUser(q.get('SELECT * FROM users WHERE id=?', req.user.id)) });
}));

router.post('/password', auth, rlAuth, wrap(async (req, res) => {
  const { current, next } = req.body || {};
  if (!(await C.verifyPassword(String(current || ''), req.user.password_hash))) throw new HttpError(403, 'Current password is incorrect');
  if (String(next || '').length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) throw new HttpError(400, 'New password must be at least 8 characters with a letter and a number');
  q.run('UPDATE users SET password_hash=? WHERE id=?', await C.hashPassword(next), req.user.id);
  if (req.user.fb_uid && fb.enabled()) { try { const r = await fb.signIn(req.user.email, current); const r2 = await fb.setPassword(r.idToken, next); q.run('UPDATE users SET fb_refresh_enc=? WHERE id=?', C.encrypt(r2.refreshToken || r.refreshToken), req.user.id); } catch (e) { console.warn('[firebase] password not updated online:', e.code); } }
  audit(req, 'password_change', {});
  res.json({ ok: true });
}));

/* -------- Face enrolment / verification (templates only; photos never leave the device) -------- */
router.post('/face/enroll', auth, perUser({ windowMs: 60e3, max: 10 }), wrap(async (req, res) => {
  const u = req.user; const b = req.body || {};
  if (b.consent) { q.run('UPDATE users SET consent_biometric=1, consent_at=? WHERE id=?', Date.now(), u.id); u.consent_biometric = 1; }
  if (!u.consent_biometric) throw new HttpError(403, 'Biometric consent is required before enrolling your face', 'consent_required');
  const age = ageOf(u);
  if (age !== null && age < 18 && !u.guardian_consent) throw new HttpError(403, 'A teacher or guardian must confirm parental consent before face data can be stored for learners under 18', 'guardian_consent_required');
  const list = Array.isArray(b.descriptors) ? b.descriptors.slice(0, 8) : [];
  if (list.length < 3 || !list.every(face.valid)) throw new HttpError(400, 'Face capture was not clear enough. Try again in good light.');
  if (!b.liveness || b.liveness.passed !== true) throw new HttpError(400, 'Liveness check was not completed', 'liveness_failed');
  // The captured samples must belong to one person: pairwise distances stay small.
  const avg = face.average(list);
  if (list.some(d => face.distance(d, avg) > 0.45)) throw new HttpError(400, 'Captured frames did not look like the same person. Try again.');
  q.run('UPDATE users SET face_enc=?, face_enrolled_at=? WHERE id=?', face.seal(avg), Date.now(), u.id);
  audit(req, 'face_enroll', { samples: list.length });
  G.checkBadges(u.id);
  res.json({ ok: true, user: publicUser(q.get('SELECT * FROM users WHERE id=?', u.id)) });
}));

router.post('/face/verify', authPartial, perUser({ windowMs: 60e3, max: 12 }), wrap(async (req, res) => {
  const u = req.user; const b = req.body || {};
  if (!u.face_enc) throw new HttpError(400, 'No face enrolled for this account');
  if (!face.valid(b.descriptor)) throw new HttpError(400, 'No usable face found in the capture');
  if (!b.liveness || b.liveness.passed !== true) throw new HttpError(400, 'Liveness check was not completed', 'liveness_failed');
  const d = face.distance(face.open(u.face_enc), b.descriptor);
  const match = d <= cfg.FACE_MATCH_THRESHOLD;
  audit(req, 'face_verify', { match, purpose: b.purpose || 'login' });
  if (!match) return res.status(401).json({ match: false, error: 'Face did not match this account', distance: +d.toFixed(3) });
  const out = { match: true, distance: +d.toFixed(3) };
  if (req.token.pend) { G.touch(u.id); out.token = issueSession(u); out.user = publicUser(u); }
  res.json(out);
}));

// AI-based identity matching: the learner photographs an ID card in the browser; only the face descriptor of the ID photo is sent.
router.post('/face/identity-match', auth, perUser({ windowMs: 60e3, max: 6 }), wrap(async (req, res) => {
  const u = req.user; const b = req.body || {};
  if (!u.face_enc) throw new HttpError(400, 'Enroll your face first');
  if (!face.valid(b.id_descriptor)) throw new HttpError(400, 'No usable face found on the ID photo');
  const d = face.distance(face.open(u.face_enc), b.id_descriptor);
  const match = d <= cfg.ID_MATCH_THRESHOLD;
  if (match) q.run('UPDATE users SET identity_verified=1, identity_distance=? WHERE id=?', d, u.id);
  audit(req, 'identity_match', { match });
  res.json({ match, distance: +d.toFixed(3), user: publicUser(q.get('SELECT * FROM users WHERE id=?', u.id)) });
}));

router.delete('/face', auth, wrap(async (req, res) => {
  q.run('UPDATE users SET face_enc=NULL, face_enrolled_at=NULL, identity_verified=0, identity_distance=NULL, face_login=0 WHERE id=?', req.user.id);
  audit(req, 'face_delete', {});
  res.json({ ok: true, user: publicUser(q.get('SELECT * FROM users WHERE id=?', req.user.id)) });
}));

/* -------- Data rights -------- */
router.get('/export', auth, wrap(async (req, res) => {
  const id = req.user.id;
  const rows = sql => q.all(sql, id);
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json({
    profile: publicUser(req.user),
    progress: rows('SELECT * FROM progress WHERE user_id=?'),
    attempts: rows('SELECT id,assessment_id,started_at,submitted_at,status,score,max_score,passed,risk,proctor_status FROM attempts WHERE user_id=?'),
    mastery: rows('SELECT * FROM mastery WHERE user_id=?'),
    badges: rows('SELECT * FROM user_badges WHERE user_id=?'),
    xp_log: rows('SELECT * FROM xp_log WHERE user_id=?'),
    threads: rows('SELECT id,title,body,created_at FROM threads WHERE author_id=? AND deleted=0'),
    posts: rows('SELECT id,thread_id,body,created_at FROM posts WHERE author_id=? AND deleted=0'),
    chat_messages: rows('SELECT id,room,body,created_at FROM chat_messages WHERE user_id=? AND deleted=0'),
    note: 'Face templates are stored encrypted and are intentionally not exported; delete them any time from Settings.',
  });
}));

router.delete('/me', auth, wrap(async (req, res) => {
  if (!(await C.verifyPassword(String((req.body && req.body.password) || ''), req.user.password_hash))) throw new HttpError(403, 'Password is incorrect');
  if (req.user.role === 'admin') throw new HttpError(403, 'Admin accounts must be removed by another admin');
  audit(req, 'account_delete', {});
  const id = req.user.id;
  // Keep authored learning content for the community but detach personal data.
  if (req.user.fb_uid && fb.enabled()) { try { await fb.deleteAccount(await fbIdToken(req.user, String((req.body && req.body.password) || ''))); } catch (e) { console.warn('[firebase] online account not deleted:', e.code || e.message); } }
  q.run(`UPDATE users SET email=?, name='Deleted user', password_hash='!', face_enc=NULL, guardian_contact_enc=NULL, status='deleted', school_id=NULL WHERE id=?`, `deleted-${id}-${Date.now()}@invalid`, id);
  q.run('DELETE FROM enrollments WHERE student_id=?', id);
  q.run('DELETE FROM snapshots WHERE owner_type=\'attempt\' AND owner_id IN (SELECT id FROM attempts WHERE user_id=?)', id);
  res.json({ ok: true });
}));

module.exports = router;
