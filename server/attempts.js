'use strict';
/* One shared rule for "may this learner start another attempt?".
 * Tests and exams are single-attempt: once submitted, the learner cannot redo them unless the teacher grants a retake
 * (each grant adds one attempt). A teacher may also set a higher base allowance. Practice and adaptive quizzes follow max_attempts (0 = unlimited). */
const { q } = require('./db');

function allowance(a) { return (a.kind === 'test' || a.kind === 'exam') ? Math.max(1, a.max_attempts || 1) : (a.max_attempts || 0); }
function info(userId, a) {
  const used = q.get(`SELECT COUNT(*) c FROM attempts WHERE assessment_id=? AND user_id=? AND status!='in_progress'`, a.id, userId).c;
  const grants = q.get('SELECT COUNT(*) c FROM retake_grants WHERE assessment_id=? AND user_id=?', a.id, userId).c;
  const base = allowance(a);
  const total = base === 0 ? 0 : base + grants;
  // An attempt that was stopped by proctoring always costs the learner that attempt, even when the teacher set a higher allowance:
  // they can only try again when the teacher grants a retake after reviewing it.
  const stop = q.get(`SELECT MAX(submitted_at) t FROM attempts WHERE assessment_id=? AND user_id=? AND proctor_status='terminated'`, a.id, userId).t;
  const fresh = stop ? q.get('SELECT COUNT(*) c FROM retake_grants WHERE assessment_id=? AND user_id=? AND granted_at>=?', a.id, userId, stop).c : 1;   // only a grant made after the stop counts
  const locked = (total !== 0 && used >= total) || fresh === 0;
  return { used, grants, allowed: total, unlimited: total === 0 && !locked, left: locked ? 0 : (total === 0 ? null : Math.max(0, total - used)), locked };
}
module.exports = { info, allowance };
