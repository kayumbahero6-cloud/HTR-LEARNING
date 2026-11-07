'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generate } = require('../server/bank');

const { questions, topics } = generate();
const num = s => { const t = String(s).replace(/[,−]/g, m => (m === ',' ? '' : '-')).replace(/ ?(RWF|cm²|cm|m²|km\/h|km|hours|mL|kg|g|L|m|mm|°)$/, '').replace(/^x = /, ''); const f = /^(-?\d+)\/(\d+)$/.exec(t); return f ? Number(f[1]) / Number(f[2]) : Number(t); };

test('bank: at least 2000 unique questions, all well formed', () => {
  assert.ok(questions.length >= 2000, 'count ' + questions.length);
  assert.equal(new Set(questions.map(q => q.p)).size, questions.length, 'prompts are unique');
  const keys = new Set(topics.map(t => t.key));
  for (const q of questions) {
    assert.ok(keys.has(q.topic), q.topic);
    if (q.t === 'mcq') {
      assert.equal(q.o.length, 4); assert.equal(new Set(q.o).size, 4, 'options differ: ' + q.p);
      assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4);
      const vals = q.o.map(num); if (vals.every(Number.isFinite)) assert.equal(new Set(vals.map(v => +v.toFixed(6))).size, 4, 'options are numerically different: ' + q.p + ' ' + q.o);
    } else assert.equal(typeof q.a, 'boolean');
    assert.ok(q.e && q.e.length > 3, 'has an explanation');
  }
});

test('bank: the marked answer is right (independent recomputation of the simple families)', () => {
  const ans = q => q.o[q.a];
  let checked = 0;
  for (const q of questions) {
    let m;
    if ((m = /^(\d+) \+ (\d+) = \?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[1] + +m[2]); checked++; }
    else if ((m = /^(\d+) − (\d+) = \?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[1] - +m[2]); checked++; }
    else if ((m = /^(\d+) × (\d+) = \?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[1] * +m[2]); checked++; }
    else if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[1] / +m[2]); checked++; }
    else if ((m = /^What is (\d+)% of (\d+)\?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[2] * +m[1] / 100); checked++; }
    else if ((m = /^What is (\d+)\/(\d+) of (\d+)\?$/.exec(q.p))) { assert.equal(Number(ans(q)), +m[3] / +m[2] * +m[1]); checked++; }
    else if ((m = /^Two angles of a triangle are (\d+)° and (\d+)°/.exec(q.p))) { assert.equal(num(ans(q)), 180 - +m[1] - +m[2]); checked++; }
    else if ((m = /^A rectangle is (\d+) cm long and (\d+) cm wide\. What is its perimeter/.exec(q.p))) { assert.equal(num(ans(q)), 2 * (+m[1] + +m[2])); checked++; }
    else if ((m = /^What is √(\d+)\?$/.exec(q.p))) { assert.equal(Number(ans(q)) ** 2, +m[1]); checked++; }
    else if ((m = /^(\d+) is an even number\.$/.exec(q.p))) { assert.equal(q.a, +m[1] % 2 === 0); checked++; }
    else if ((m = /^(\d+) is a prime number\.$/.exec(q.p))) { const n = +m[1]; let p = n > 1; for (let i = 2; i * i <= n; i++) if (n % i === 0) p = false; assert.equal(q.a, p); checked++; }
  }
  assert.ok(checked > 700, 'verified ' + checked);
});
