'use strict';
/* Adds the generated maths question bank (2,600+ questions) to a database. Safe to run more than once.
 * Usage: npm run seed:bank   (owner is the first admin account) */
const { q } = require('./db');
const owner = q.get("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
if (!owner) { console.error('Create an admin account first (set ADMIN_EMAIL and ADMIN_PASSWORD and start the server once).'); process.exit(1); }
console.log('[bank] added', require('./bank').seedBank(q, owner.id), 'questions');
