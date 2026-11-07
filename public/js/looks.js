/* Personalisation: colour themes, backgrounds, avatars, frames, page transitions, celebrations and hover styles.
 * Everything is cosmetic. Choices are saved in the user's settings; some unlock as the learner levels up. */
import { S, h, mount, PUT, GET, toast, fail, icon, setTitle, applyPrefs, prefHooks, loading } from './core.js';
import { route } from './router.js';

/* ------------------------------------------------ catalogue ------------------------------------------------ */
const T = (id, name, dark, mid, accent, tint, lvl) => ({ id, name, dark, mid, accent, tint, lvl });
export const SKINS = [
  T('kivu', 'Lake Kivu', '#1b2f66', '#2a4a9d', '#f5a800', '#e4ebfa', 1), T('volcano', 'Volcano', '#5b1a12', '#9c2f1f', '#ffb020', '#fbe7e2', 1), T('savannah', 'Savannah', '#5a4310', '#8d6b17', '#e8590c', '#f6edd2', 1),
  T('forest', 'Forest', '#0f4a35', '#1d7a58', '#ffd23f', '#dff3e8', 1), T('sunrise', 'Sunrise', '#6b2145', '#b5386f', '#ffc247', '#fbe2ee', 2), T('orchid', 'Orchid', '#42246b', '#6f3fb0', '#ffb703', '#ece3fa', 2),
  T('slate', 'Slate', '#25303f', '#46566d', '#4cc9a7', '#e6eaf0', 2), T('teal', 'Teal Wave', '#0b4f55', '#127c86', '#ffb454', '#dcf2f3', 2), T('rose', 'Rose', '#7a1d3d', '#c0396a', '#ffd166', '#fde4ec', 3),
  T('midnight', 'Midnight', '#0d1b3d', '#233a7a', '#7be0ff', '#dde6fb', 3), T('coral', 'Coral Reef', '#8a2f2f', '#e0614f', '#fff176', '#fde8e4', 3), T('mint', 'Mint', '#14614f', '#2fa387', '#ff8fab', '#e0f6ee', 4),
  T('plum', 'Plum', '#4a1a4f', '#8a3b92', '#ffd54f', '#f3e1f5', 4), T('sand', 'Sandstone', '#6a4b2d', '#a9784a', '#2ec4b6', '#f5eadd', 5), T('gold', 'Gold Standard', '#3a2e05', '#7a6008', '#ffe066', '#faf3d2', 5), T('royal', 'Royal', '#14246b', '#3550c9', '#ff6b6b', '#e2e8ff', 6),
];
const B = (id, name, css, lvl = 1) => ({ id, name, css, lvl });
const ink = 'rgba(27,47,102,.10)', ink2 = 'rgba(27,47,102,.06)';
export const BACKGROUNDS = [
  B('plain', 'Plain', 'none'), B('dots', 'Dots', `radial-gradient(${ink} 1.5px, transparent 1.6px) 0 0/22px 22px`), B('grid', 'Grid', `linear-gradient(${ink2} 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, ${ink2} 1px, transparent 1px) 0 0/28px 28px`),
  B('diagonal', 'Diagonal', `repeating-linear-gradient(45deg, ${ink2} 0 2px, transparent 2px 16px)`), B('checks', 'Checks', `conic-gradient(${ink2} 25%, transparent 0 50%, ${ink2} 0 75%, transparent 0) 0 0/40px 40px`),
  B('waves', 'Waves', `radial-gradient(circle at 50% 120%, transparent 60%, ${ink} 61% 63%, transparent 64%) 0 0/48px 24px`), B('rings', 'Rings', `radial-gradient(circle, transparent 12px, ${ink2} 13px 14px, transparent 15px) 0 0/44px 44px`),
  B('zigzag', 'Zigzag', `linear-gradient(135deg, ${ink2} 25%, transparent 25%) -14px 0/28px 28px, linear-gradient(225deg, ${ink2} 25%, transparent 25%) -14px 0/28px 28px`),
  B('blueprint', 'Blueprint', `linear-gradient(rgba(60,110,200,.14) 1px, transparent 1px) 0 0/20px 20px, linear-gradient(90deg, rgba(60,110,200,.14) 1px, transparent 1px) 0 0/20px 20px, linear-gradient(rgba(60,110,200,.22) 1px, transparent 1px) 0 0/100px 100px`, 2),
  B('graph', 'Graph paper', `linear-gradient(rgba(40,140,90,.14) 1px, transparent 1px) 0 0/16px 16px, linear-gradient(90deg, rgba(40,140,90,.14) 1px, transparent 1px) 0 0/16px 16px`, 2),
  B('paper', 'Ruled paper', `repeating-linear-gradient(transparent 0 31px, rgba(80,120,200,.18) 31px 32px)`, 2), B('stars', 'Stars', `radial-gradient(rgba(245,168,0,.35) 1.5px, transparent 2px) 0 0/60px 60px, radial-gradient(rgba(27,47,102,.18) 1px, transparent 1.5px) 30px 30px/60px 60px`, 2),
  B('confetti', 'Confetti', `radial-gradient(rgba(224,70,50,.25) 3px, transparent 4px) 0 0/70px 70px, radial-gradient(rgba(245,168,0,.3) 3px, transparent 4px) 35px 20px/70px 70px, radial-gradient(rgba(40,120,200,.25) 3px, transparent 4px) 15px 45px/70px 70px`, 3),
  B('hex', 'Hexagons', `conic-gradient(from 30deg at 50% 50%, ${ink2} 0 60deg, transparent 0 120deg, ${ink2} 0 180deg, transparent 0 240deg, ${ink2} 0 300deg, transparent 0) 0 0/36px 62px`, 3),
  B('aurora', 'Aurora', 'linear-gradient(120deg, rgba(76,201,167,.20), rgba(88,101,242,.16) 45%, rgba(245,168,0,.16))', 3), B('dusk', 'Dusk', 'linear-gradient(180deg, rgba(255,160,80,.16), rgba(160,80,200,.14))', 3),
  B('ocean', 'Ocean', 'linear-gradient(180deg, rgba(60,170,230,.10), rgba(20,90,170,.18))', 4), B('meadow', 'Meadow', 'linear-gradient(180deg, rgba(150,210,110,.10), rgba(40,150,90,.18))', 4),
  B('imigongo', 'Imigongo', `conic-gradient(from 45deg, rgba(27,47,102,.10) 0 25%, rgba(224,70,50,.10) 0 50%, rgba(245,168,0,.12) 0 75%, transparent 0) 0 0/64px 64px`, 4),
  B('sunburst', 'Sunburst', 'repeating-conic-gradient(rgba(245,168,0,.10) 0 10deg, transparent 10deg 20deg)', 5), B('lagoon', 'Lagoon', 'radial-gradient(circle at 20% 10%, rgba(60,200,200,.20), transparent 50%), radial-gradient(circle at 80% 90%, rgba(60,100,220,.18), transparent 50%)', 5),
  B('lava', 'Lava lamp', 'radial-gradient(circle at 15% 85%, rgba(255,110,70,.20), transparent 40%), radial-gradient(circle at 85% 15%, rgba(255,190,70,.20), transparent 40%)', 6), B('galaxy', 'Galaxy', 'radial-gradient(circle at 30% 20%, rgba(130,90,230,.20), transparent 45%), radial-gradient(circle at 75% 75%, rgba(40,120,230,.18), transparent 45%), radial-gradient(rgba(27,47,102,.2) 1px, transparent 1.5px) 0 0/34px 34px', 6),
];
const SHAPES = {
  circle: s => `<circle cx="12" cy="12" r="11" ${s}/>`, squircle: s => `<rect x="1" y="1" width="22" height="22" rx="8" ${s}/>`, hexagon: s => `<polygon points="12,1 22,6.5 22,17.5 12,23 2,17.5 2,6.5" ${s}/>`,
  diamond: s => `<polygon points="12,1 23,12 12,23 1,12" ${s}/>`, star: s => `<polygon points="12,1 15,8.5 23,9.3 17,14.7 18.8,22.5 12,18.5 5.2,22.5 7,14.7 1,9.3 9,8.5" ${s}/>`,
  shield: s => `<path d="M12 1 22 4.5V12c0 5.500-4.500 9.500-10 11C6.500 21.500 2 17.500 2 12V4.500Z" ${s}/>`, leaf: s => `<path d="M3 21C3 9 10 2 22 2c0 12-7 19-19 19Z" ${s}/>`,
  drop: s => `<path d="M12 1C12 1 4 10 4 15a8 8 0 0 0 16 0C20 10 12 1 12 1Z" ${s}/>`, bolt: s => `<path d="M14 1 4 13h7l-2 10 11-13h-7Z" ${s}/>`,
  flower: s => `<g ${s}><circle cx="12" cy="6" r="5.500"/><circle cx="12" cy="18" r="5.500"/><circle cx="6" cy="12" r="5.500"/><circle cx="18" cy="12" r="5.500"/><circle cx="12" cy="12" r="6"/></g>`,
  triangle: s => `<polygon points="12,2 23,22 1,22" ${s}/>`, clover: s => `<g ${s}><circle cx="8" cy="8" r="5.500"/><circle cx="16" cy="8" r="5.500"/><circle cx="8" cy="16" r="5.500"/><circle cx="16" cy="16" r="5.500"/><rect x="7" y="7" width="10" height="10"/></g>`,
};
export const SHAPE_IDS = Object.keys(SHAPES);
export const PALETTES = [['#1b2f66', '#ffffff'], ['#c0392b', '#ffffff'], ['#e67e22', '#ffffff'], ['#f1c40f', '#1b2f66'], ['#27ae60', '#ffffff'], ['#16a085', '#ffffff'], ['#2980b9', '#ffffff'], ['#8e44ad', '#ffffff'], ['#d63384', '#ffffff'], ['#34495e', '#ffffff'], ['#ecf0f1', '#1b2f66'], ['#111827', '#ffd23f']];
export const FRAMES = [['none', 'None'], ['gold', 'Gold ring'], ['ruby', 'Ruby ring'], ['sky', 'Sky ring'], ['rainbow', 'Rainbow'], ['dashed', 'Dashed'], ['double', 'Double ring'], ['glow', 'Glow'], ['pulse', 'Pulse']];
export const FX = [['confetti', 'Confetti'], ['stars', 'Falling stars'], ['balloons', 'Balloons'], ['sparkle', 'Sparkle burst'], ['coins', 'Coin shower'], ['hearts', 'Hearts'], ['none', 'None']];
export const TRANS = [['none', 'None'], ['fade', 'Fade in'], ['rise', 'Rise up'], ['zoom', 'Zoom in'], ['slide', 'Slide in']];
export const HOVER = [['lift', 'Lift'], ['glow', 'Glow'], ['none', 'None']];

/* ------------------------------------------------ unlocks ------------------------------------------------ */
const myLevel = () => (S.user.role === 'student' ? (S.user.level || 1) : 99);       // only learners earn levels, everyone else has everything
const avatarLevel = i => 1 + (i % 12 < 4 ? 0 : i % 12 < 8 ? 1 : i % 12 < 10 ? 2 : 3);   // shape index decides

/* ------------------------------------------------ applying ------------------------------------------------ */
let styleEl;
function ensureStyle() {
  if (styleEl) return;
  styleEl = document.createElement('style'); styleEl.id = 'looks-css';
  styleEl.textContent = SKINS.map(s => `html[data-skin="${s.id}"]:not([data-theme="dark"]){--kivu:${s.dark};--kivu-2:${s.mid};--sun:${s.accent};--info-bg:${s.tint}}`).join('\n') +
    '\n' + BACKGROUNDS.filter(b => b.css !== 'none').map(b => `html[data-bg="${b.id}"] body{background-image:${b.css};background-attachment:fixed}`).join('\n');
  document.head.append(styleEl);
}
export function applyLooks(user) {
  ensureStyle(); const st = (user && user.settings) || {}, r = document.documentElement;
  const set = (a, v, none) => (v && v !== none ? r.setAttribute(a, v) : r.removeAttribute(a));
  set('data-skin', st.skin, 'kivu'); set('data-bg', st.bg, 'plain'); set('data-trans', st.trans, 'none'); set('data-hover', st.hover, 'lift');
  for (const el of document.querySelectorAll('.av-me')) { el.replaceWith(avatar(st.avatar, user.name, el.dataset.size, st.frame, true)); }
}
prefHooks.push(applyLooks);

/* ------------------------------------------------ avatar ------------------------------------------------ */
export function avatar(id, name, size = 40, frame = 'none', me = false) {
  const [shape, pal] = String(id || '').split('-'), p = PALETTES[Number(pal)] || PALETTES[0], draw = SHAPES[shape] || SHAPES.circle;
  const letter = String(name || '?').trim().charAt(0).toUpperCase().replace(/[<>&"']/g, '?');
  const el = h('span', { class: 'av fr-' + (frame || 'none') + (me ? ' av-me' : ''), 'data-size': String(size), style: { width: size + 'px', height: size + 'px' }, 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${draw(`fill="${p[0]}"`)}<text x="12" y="16.200" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="${p[1]}">${letter}</text></svg>`;   // inputs here are catalogue ids and one sanitised letter
  return el;
}
export const whoBlock = () => h('div', { class: 'who-row' }, avatar((S.user.settings || {}).avatar, S.user.name, 38, (S.user.settings || {}).frame, true), h('div', { class: 'who' }, h('strong', S.user.name), h('small', S.user.school ? S.user.school.name : S.user.role)));

/* ------------------------------------------------ celebrations ------------------------------------------------ */
export function celebrate(kind) {
  const st = (S.user && S.user.settings) || {}, fx = kind || st.fx || 'confetti';
  if (fx === 'none' || st.reduce_motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' }); document.body.append(layer);
  const W = innerWidth, H = innerHeight, colors = ['#f5a800', '#e04632', '#2a4a9d', '#27ae60', '#8e44ad', '#16a085'];
  const make = (txt, css) => { const s = h('span', { class: 'fx', style: css }, txt); layer.append(s); return s; };
  const n = fx === 'sparkle' ? 36 : 60; let last;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * W, delay = Math.random() * 500, dur = 1800 + Math.random() * 1600; let el, kf;
    if (fx === 'confetti') { el = make('', `left:${x}px;top:-20px;width:${6 + Math.random() * 6}px;height:${10 + Math.random() * 8}px;background:${colors[i % colors.length]};border-radius:2px`); kf = [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 200}px,${H + 40}px) rotate(${Math.random() * 900}deg)`, opacity: .9 }]; }
    else if (fx === 'stars' || fx === 'coins') { el = make(fx === 'stars' ? '⭐' : '\u{1FA99}', `left:${x}px;top:-30px;font-size:${18 + Math.random() * 18}px`); kf = [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${H + 40}px) rotate(${Math.random() * 360}deg)`, opacity: 1 }]; }
    else if (fx === 'balloons' || fx === 'hearts') { el = make(fx === 'balloons' ? '\u{1F388}' : '\u{1F496}', `left:${x}px;top:${H}px;font-size:${22 + Math.random() * 20}px`); kf = [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translate(${(Math.random() - .5) * 120}px,${-H - 60}px)`, opacity: .9 }]; }
    else { const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 220; el = make('✨', `left:${W / 2}px;top:${H / 2}px;font-size:${14 + Math.random() * 18}px`); kf = [{ transform: 'translate(0,0) scale(.3)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1.2)`, opacity: 0 }]; }
    last = el.animate(kf, { duration: dur, delay, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 4200);
}

/* ------------------------------------------------ customise page ------------------------------------------------ */
route('/customize', async () => {
  setTitle('Personalise');
  if (S.user.role === 'student') { try { const g = await GET('/gamification/me'); S.user.level = g.level || S.user.level; } catch { /* keep */ } }
  const lvl = myLevel(); let st = { ...(S.user.settings || {}) };
  const body = h('div');
  const save = async patch => { st = { ...st, ...patch }; S.user.settings = { ...(S.user.settings || {}), ...patch }; applyPrefs(S.user); try { const r = await PUT('/auth/me', { settings: patch }); S.user = { ...r.user, level: S.user.level }; draw(); } catch (e) { fail(e); } };
  const lock = need => need > lvl;
  const tile = (active, locked, need, label, content, onPick, extra = {}) => h('button', { type: 'button', class: 'look' + (active ? ' on' : '') + (locked ? ' locked' : ''), 'aria-pressed': String(!!active), title: locked ? `Unlocks at level ${need}` : label, 'aria-label': label + (locked ? `, locked until level ${need}` : ''), onclick: () => (locked ? toast(`Reach level ${need} to unlock ${label}`) : onPick()), ...extra }, content, h('span', { class: 'look-n' }, label), locked && h('span', { class: 'look-lock' }, 'Lv ' + need));
  const sec = (title, sub, ...kids) => h('section', { class: 'block' }, h('h2', title), sub && h('p', { class: 'muted' }, sub), ...kids);
  const draw = () => mount(body,
    h('div', { class: 'look-preview' }, avatar(st.avatar, S.user.name, 72, st.frame), h('div', h('h3', { style: { margin: 0 } }, S.user.name), h('p', { class: 'muted', style: { margin: '.2rem 0 0' } }, S.user.role === 'student' ? `Level ${lvl}. Keep learning to unlock more.` : 'Everything is unlocked for you.')),
      h('div', { class: 'row', style: { marginLeft: 'auto' } }, h('button', { class: 'btn', type: 'button', onclick: () => celebrate(st.fx || 'confetti') }, 'Preview celebration'), h('button', { class: 'btn quiet', type: 'button', onclick: () => save({ skin: 'kivu', bg: 'plain', avatar: '', frame: 'none', fx: 'confetti', trans: 'none', hover: 'lift' }) }, 'Reset all'))),
    sec(`Colour theme (${SKINS.length})`, 'Applies in light mode. Dark mode keeps its own colours.', h('div', { class: 'looks' }, SKINS.map(s => tile((st.skin || 'kivu') === s.id, lock(s.lvl), s.lvl, s.name, h('span', { class: 'swatch' }, [s.dark, s.mid, s.accent, s.tint].map(c => h('i', { style: { background: c } }))), () => save({ skin: s.id }))))),
    sec(`Backgrounds (${BACKGROUNDS.length})`, null, h('div', { class: 'looks' }, BACKGROUNDS.map(b => tile((st.bg || 'plain') === b.id, lock(b.lvl), b.lvl, b.name, h('span', { class: 'bgprev', style: { backgroundImage: b.css === 'none' ? 'none' : b.css } }), () => save({ bg: b.id }))))),
    sec(`Avatar shape (${SHAPE_IDS.length}) and colour (${PALETTES.length})`, `${SHAPE_IDS.length * PALETTES.length} combinations. Your initial appears inside.`,
      h('div', { class: 'looks' }, SHAPE_IDS.map((sh, i) => { const cur = String(st.avatar || 'circle-0').split('-'); return tile(cur[0] === sh, lock(avatarLevel(i)), avatarLevel(i), sh[0].toUpperCase() + sh.slice(1), avatar(`${sh}-${cur[1] || 0}`, S.user.name, 44), () => save({ avatar: `${sh}-${cur[1] || 0}` })); })),
      h('div', { class: 'looks', style: { marginTop: '.8rem' } }, PALETTES.map((p, i) => { const cur = String(st.avatar || 'circle-0').split('-'); return tile(Number(cur[1] || 0) === i, false, 1, 'Colour ' + (i + 1), avatar(`${cur[0] || 'circle'}-${i}`, S.user.name, 36), () => save({ avatar: `${cur[0] || 'circle'}-${i}` })); }))),
    sec(`Avatar frame (${FRAMES.length})`, null, h('div', { class: 'looks' }, FRAMES.map(([id, name], i) => tile((st.frame || 'none') === id, lock(1 + Math.floor(i / 3)), 1 + Math.floor(i / 3), name, avatar(st.avatar, S.user.name, 44, id), () => save({ frame: id }))))),
    sec(`Page transitions (${TRANS.length})`, 'How a page appears when you open it.', h('div', { class: 'chips-row' }, TRANS.map(([id, name]) => h('button', { type: 'button', class: 'pick' + ((st.trans || 'none') === id ? ' on' : ''), 'aria-pressed': String((st.trans || 'none') === id), onclick: () => save({ trans: id }) }, name)))),
    sec(`Celebration effects (${FX.length})`, 'Plays when you pass a test or reach your daily study goal.', h('div', { class: 'chips-row' }, FX.map(([id, name]) => h('button', { type: 'button', class: 'pick' + ((st.fx || 'confetti') === id ? ' on' : ''), 'aria-pressed': String((st.fx || 'confetti') === id), onclick: () => { save({ fx: id }); celebrate(id); } }, name)))),
    sec(`Card hover style (${HOVER.length})`, null, h('div', { class: 'chips-row' }, HOVER.map(([id, name]) => h('button', { type: 'button', class: 'pick' + ((st.hover || 'lift') === id ? ' on' : ''), 'aria-pressed': String((st.hover || 'lift') === id), onclick: () => save({ hover: id }) }, name)))));
  draw();
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', h('h1', 'Personalise'), h('p', { class: 'sub' }, `${SKINS.length} themes, ${BACKGROUNDS.length} backgrounds, ${SHAPE_IDS.length * PALETTES.length} avatars, ${FRAMES.length} frames and more. Some unlock as you level up.`))), body);
});
