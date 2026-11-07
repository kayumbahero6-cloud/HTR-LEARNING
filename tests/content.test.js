'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
test('ready-made content: counts and uniqueness', async () => {
  const c = await import('../public/js/content.js');
  assert.equal(c.TASK_IDEAS.length, 100); assert.equal(new Set(c.TASK_IDEAS.map(x => x.title)).size, 100);
  assert.equal(c.STUDY_TIPS.length, 100); assert.equal(new Set(c.STUDY_TIPS.map(x => x.text)).size, 100);
  assert.equal(c.CAL_IDEAS.length, 100); assert.equal(new Set(c.CAL_IDEAS.map(x => x.title)).size, 100);
  for (const e of c.CAL_IDEAS) assert.ok(['event', 'exam', 'lesson', 'meeting', 'holiday'].includes(e.kind));
  assert.ok(c.COUNTS.deckCards >= 200);
  // starter-deck answers are computed: spot check them
  const times = c.STARTER_DECKS.find(d => d.title.startsWith('Times')).cards; assert.equal(times.length, 144); assert.deepEqual(times[7 * 12 + 6], ['8 × 7 = ?', '56']);
  const pr = c.STARTER_DECKS.find(d => d.title.includes('prime')).cards; assert.deepEqual(pr[24], ['What is the 25th prime number?', '97']);
  for (const d of c.STARTER_DECKS) for (const [f, b] of d.cards) assert.ok(f && b);
  // every saved id must pass the server's cosmetic-id rule
  const ok = v => /^[a-z0-9-]{0,24}$/.test(v);
  for (let n = 0; n < 84; n++) assert.ok(ok('gs-' + n)); for (let a = 0; a < 12; a++) for (let b = 0; b < 10; b++) assert.ok(ok(`bg-${a}-${b}`));
  for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (const p of ['fr', 'tr', 'fx', 'hv']) assert.ok(ok(`${p}-${a}-${b}`));
});
