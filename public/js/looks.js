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
const HUES = [['Ruby', 350], ['Ember', 14], ['Amber', 36], ['Lime', 84], ['Jade', 150], ['Aqua', 184], ['Azure', 208], ['Cobalt', 224], ['Indigo', 250], ['Violet', 276], ['Orchid', 302], ['Rosewood', 330]];
const FLAVOURS = [['Deep', 60, 18, 32], ['Soft', 38, 28, 42], ['Bright', 78, 24, 40], ['Calm', 30, 22, 36], ['Bold', 88, 20, 34], ['Muted', 18, 24, 38], ['Vivid', 95, 26, 41]];
HUES.forEach(([hn, hue], hi) => FLAVOURS.forEach(([fn, sat, dl, ml], fi) => {
  const n = hi * FLAVOURS.length + fi;
  SKINS.push(T('gs-' + n, `${fn} ${hn}`, `hsl(${hue} ${sat}% ${dl}%)`, `hsl(${hue} ${sat}% ${ml}%)`, `hsl(${(hue + 170) % 360} 90% 62%)`, `hsl(${hue} ${Math.max(30, sat - 20)}% 94%)`, 1 + Math.floor(n / 21)));
}));
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
const TINTS = [['Navy', '27,47,102'], ['Gold', '245,168,0'], ['Red', '224,70,50'], ['Green', '40,150,90'], ['Sky', '60,150,230'], ['Violet', '130,80,200'], ['Pink', '230,80,150'], ['Teal', '20,160,160'], ['Brown', '140,90,50'], ['Grey', '90,100,120']];
const PATTERNS = [
  ['Dots', c => `radial-gradient(rgba(${c},.14) 1.5px, transparent 1.6px) 0 0/20px 20px`], ['Grid', c => `linear-gradient(rgba(${c},.09) 1px, transparent 1px) 0 0/26px 26px, linear-gradient(90deg, rgba(${c},.09) 1px, transparent 1px) 0 0/26px 26px`],
  ['Stripes', c => `repeating-linear-gradient(45deg, rgba(${c},.08) 0 2px, transparent 2px 14px)`], ['Pinstripes', c => `repeating-linear-gradient(90deg, rgba(${c},.07) 0 1px, transparent 1px 18px)`],
  ['Checks', c => `conic-gradient(rgba(${c},.07) 25%, transparent 0 50%, rgba(${c},.07) 0 75%, transparent 0) 0 0/36px 36px`], ['Rings', c => `radial-gradient(circle, transparent 11px, rgba(${c},.10) 12px 13px, transparent 14px) 0 0/40px 40px`],
  ['Crosses', c => `linear-gradient(rgba(${c},.12) 2px, transparent 2px) 9px 0/24px 24px, linear-gradient(90deg, rgba(${c},.12) 2px, transparent 2px) 0 9px/24px 24px`], ['Triangles', c => `conic-gradient(from 150deg at 50% 0, rgba(${c},.09) 60deg, transparent 0) 0 0/36px 24px`],
  ['Glow', c => `radial-gradient(circle at 20% 15%, rgba(${c},.18), transparent 45%), radial-gradient(circle at 85% 85%, rgba(${c},.14), transparent 45%)`], ['Fade', c => `linear-gradient(180deg, rgba(${c},.14), rgba(${c},.02))`],
  ['Burst', c => `repeating-conic-gradient(rgba(${c},.07) 0 8deg, transparent 8deg 16deg)`], ['Waves', c => `radial-gradient(circle at 50% 130%, transparent 62%, rgba(${c},.13) 63% 65%, transparent 66%) 0 0/44px 22px`],
];
PATTERNS.forEach(([pn, fn], pi) => TINTS.forEach(([tn, c], ti) => { const n = pi * TINTS.length + ti; BACKGROUNDS.push(B(`bg-${pi}-${ti}`, `${pn} ${tn}`, fn(c), 1 + Math.floor(n / 30))); }));
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
export const FRAME_STYLES = ['Thin ring', 'Thick ring', 'Double ring', 'Dashed', 'Dotted', 'Soft glow', 'Pulse', 'Gradient ring', 'Offset shadow', 'Neon'];
export const FRAME_COLOURS = [['Gold', '#f5a800'], ['Ruby', '#d63a52'], ['Sky', '#4cb8ff'], ['Emerald', '#1fa971'], ['Violet', '#8e44ad'], ['Orange', '#ff7a1a'], ['Pink', '#ff5fa2'], ['Teal', '#12b5b0'], ['Lime', '#8bc34a'], ['Slate', '#54627a']];
export const FX_GLYPHS = [['Confetti', null], ['Stars', '⭐'], ['Coins', '\u{1FA99}'], ['Balloons', '\u{1F388}'], ['Hearts', '\u{1F496}'], ['Sparkles', '✨'], ['Books', '\u{1F4DA}'], ['Flowers', '\u{1F338}'], ['Rockets', '\u{1F680}'], ['Trophies', '\u{1F3C6}']];
export const FX_MOTIONS = ['Fall', 'Rise', 'Burst', 'Sway down', 'Spiral', 'Fountain', 'From the sides', 'Zoom out', 'Drift across', 'Bounce'];
export const FX = [['none', 'None']];
export const TRANS_TYPES = ['Fade', 'Rise', 'Drop', 'Zoom in', 'Slide from right', 'Slide from left', 'Flip', 'Blur in', 'Swing', 'Bounce in'];
export const TRANS_TIMINGS = [['Instant', .12, 'ease'], ['Quick', .2, 'ease'], ['Brisk', .3, 'ease-out'], ['Smooth', .4, 'ease-out'], ['Gentle', .5, 'ease-in-out'], ['Slow', .7, 'ease-in-out'], ['Dreamy', 1, 'ease-in-out'], ['Springy', .5, 'cubic-bezier(.34,1.56,.64,1)'], ['Snappy', .25, 'cubic-bezier(.2,.9,.3,1)'], ['Overshoot', .6, 'cubic-bezier(.68,-.55,.27,1.55)']];
export const HOVER_STYLES = ['Lift', 'Glow', 'Grow', 'Tilt', 'Soft shadow', 'Outline', 'Dim', 'Press', 'Nudge right', 'Skew'];
export const HOVER = [['none', 'None']];
export const TRANS = [['none', 'None']];
export const COUNTS = { skins: SKINS.length, backgrounds: BACKGROUNDS.length, avatars: SHAPE_IDS.length * PALETTES.length, frames: FRAME_STYLES.length * FRAME_COLOURS.length + FRAMES.length - 1, celebrations: FX_GLYPHS.length * FX_MOTIONS.length, transitions: TRANS_TYPES.length * TRANS_TIMINGS.length, hovers: HOVER_STYLES.length * 10 };

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
const num = (v, re, n) => { const m = String(v || '').match(re); return m ? Math.min(Number(m[1]), n - 1) : null; };
export const transOf = v => { const m = String(v || '').match(/^tr-(\d)-(\d)$/); if (m) return [Math.min(+m[1], 9), Math.min(+m[2], 9)]; const old = { fade: [0, 3], rise: [1, 3], zoom: [3, 3], slide: [4, 3] }[v]; return old || null; };
export const hoverOf = v => { const m = String(v || '').match(/^hv-(\d)-(\d+)$/); if (m) return [Math.min(+m[1], 9), Math.min(+m[2], 9)]; return { glow: [1, 5] }[v] || null; };
export function applyLooks(user) {
  ensureStyle(); const st = (user && user.settings) || {}, r = document.documentElement;
  const set = (a, v, none) => (v && v !== none ? r.setAttribute(a, v) : r.removeAttribute(a));
  set('data-skin', st.skin, 'kivu'); set('data-bg', st.bg, 'plain');
  const t = transOf(st.trans);
  if (t) { r.setAttribute('data-trans', String(t[0])); const [, d, e] = TRANS_TIMINGS[t[1]]; r.style.setProperty('--tdur', d + 's'); r.style.setProperty('--tease', e); } else { r.removeAttribute('data-trans'); }
  const hv = hoverOf(st.hover);
  if (st.hover === 'none') r.setAttribute('data-hover', 'none'); else if (hv) { r.setAttribute('data-hover', String(hv[0])); r.style.setProperty('--hi', String((hv[1] + 1) / 10)); } else r.removeAttribute('data-hover');
  for (const el of document.querySelectorAll('.av-me')) { el.replaceWith(avatar(st.avatar, user.name, el.dataset.size, st.frame, true)); }
}
prefHooks.push(applyLooks);

/* ------------------------------------------------ avatar ------------------------------------------------ */
export function avatar(id, name, size = 40, frame = 'none', me = false) {
  const [shape, pal] = String(id || '').split('-'), p = PALETTES[Number(pal)] || PALETTES[0], draw = SHAPES[shape] || SHAPES.circle;
  const letter = String(name || '?').trim().charAt(0).toUpperCase().replace(/[<>&"']/g, '?');
  const fx = String(frame || '').match(/^fr-(\d)-(\d)$/), fsty = fx ? FRAME_STYLES[Math.min(+fx[1], 9)] : null, fcol = fx ? FRAME_COLOURS[Math.min(+fx[2], 9)][1] : null;
  const el = h('span', { class: (fx ? 'av frx frx-' + Math.min(+fx[1], 9) : 'av fr-' + (frame || 'none')) + (me ? ' av-me' : ''), 'data-size': String(size), style: { width: size + 'px', height: size + 'px', ...(fcol ? { '--fc': fcol } : {}) }, 'aria-hidden': 'true', title: fsty ? fsty : undefined });
  el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${draw(`fill="${p[0]}"`)}<text x="12" y="16.200" text-anchor="middle" font-size="11" font-weight="700" font-family="sans-serif" fill="${p[1]}">${letter}</text></svg>`;   // inputs here are catalogue ids and one sanitised letter
  return el;
}
export const whoBlock = () => h('div', { class: 'who-row' }, avatar((S.user.settings || {}).avatar, S.user.name, 38, (S.user.settings || {}).frame, true), h('div', { class: 'who' }, h('strong', S.user.name), h('small', S.user.school ? S.user.school.name : S.user.role)));

/* ------------------------------------------------ celebrations ------------------------------------------------ */
const fxOf = v => { const m = String(v || '').match(/^fx-(\d)-(\d)$/); if (m) return [Math.min(+m[1], 9), Math.min(+m[2], 9)]; return { confetti: [0, 0], stars: [1, 0], coins: [2, 0], balloons: [3, 1], sparkle: [5, 2], hearts: [4, 1] }[v] || null; };
export function celebrate(kind) {
  const st = (S.user && S.user.settings) || {}, id = kind || st.fx || 'confetti';
  if (id === 'none' || st.reduce_motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const [g, m] = fxOf(id) || [0, 0], glyph = FX_GLYPHS[g][1];
  const layer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' }); document.body.append(layer);
  const W = innerWidth, H = innerHeight, colors = ['#f5a800', '#e04632', '#2a4a9d', '#27ae60', '#8e44ad', '#16a085'], rnd = (a, b) => a + Math.random() * (b - a);
  const n = [2, 5].includes(m) ? 40 : 55;
  for (let i = 0; i < n; i++) {
    const size = glyph ? rnd(18, 36) : 0, el = h('span', { class: 'fx' }, glyph || '');
    if (glyph) el.style.fontSize = size + 'px'; else Object.assign(el.style, { width: rnd(6, 12) + 'px', height: rnd(10, 18) + 'px', background: colors[i % colors.length], borderRadius: '2px' });
    const x = rnd(0, W), cx = W / 2, cy = H / 2, ang = rnd(0, Math.PI * 2), d = rnd(120, Math.min(W, H) * .7), spin = rnd(-720, 720); let from, to, ease = 'cubic-bezier(.2,.6,.4,1)', dur = rnd(1800, 3400), kf;
    switch (m) {
      case 0: from = [x, -40]; to = [x + rnd(-120, 120), H + 40]; break;                                                        // fall
      case 1: from = [x, H + 20]; to = [x + rnd(-100, 100), -60]; break;                                                         // rise
      case 2: from = [cx, cy]; to = [cx + Math.cos(ang) * d, cy + Math.sin(ang) * d]; dur = rnd(900, 1700); break;               // burst
      case 3: from = [x, -40]; to = [x, H + 40]; kf = [0, .25, .5, .75, 1].map((t, k) => ({ transform: `translate(${x + (k % 2 ? 60 : -60)}px, ${-40 + t * (H + 80)}px) rotate(${spin * t}deg)`, opacity: 1 })); break;   // sway down
      case 4: from = [cx, cy]; kf = Array.from({ length: 9 }, (_, k) => { const t = k / 8, a = ang + t * 9, r = t * d * 1.3; return { transform: `translate(${cx + Math.cos(a) * r}px, ${cy + Math.sin(a) * r}px) rotate(${spin * t}deg)`, opacity: 1 - t * .6 }; }); break;   // spiral
      case 5: from = [cx + rnd(-60, 60), H]; kf = Array.from({ length: 7 }, (_, k) => { const t = k / 6, dx = (x - cx) * t, dy = -(Math.sin(Math.PI * t)) * H * rnd(.5, .85) + t * H * .15; return { transform: `translate(${cx + dx}px, ${H + dy}px) rotate(${spin * t}deg)`, opacity: 1 }; }); break;   // fountain
      case 6: { const left = i % 2 === 0; from = [left ? -40 : W + 40, rnd(0, H)]; to = [left ? W + 40 : -40, rnd(0, H)]; break; }  // from the sides
      case 7: from = [cx, cy]; kf = [{ transform: `translate(${cx}px, ${cy}px) scale(.1)`, opacity: 1 }, { transform: `translate(${cx + Math.cos(ang) * d * .6}px, ${cy + Math.sin(ang) * d * .6}px) scale(2.4)`, opacity: 0 }]; dur = rnd(1100, 1900); break;   // zoom out
      case 8: from = [-40, rnd(0, H * .6)]; to = [W + 40, rnd(H * .3, H)]; break;                                                // drift across
      default: from = [x, -40]; to = [x, H - size - 10]; ease = 'cubic-bezier(.3,1.6,.5,1)'; break;                              // bounce
    }
    kf = kf || [{ transform: `translate(${from[0]}px, ${from[1]}px) rotate(0)`, opacity: 1 }, { transform: `translate(${to[0]}px, ${to[1]}px) rotate(${spin}deg)`, opacity: m === 9 ? 1 : .9 }];
    layer.append(el); el.animate(kf, { duration: dur, delay: rnd(0, 500), easing: ease, fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 4600);
}


/* A two-part picker: first part x second part = the number of looks. `prefix-a-b` is the saved id. */
function combo(current, prefix, firsts, seconds, preview, onPick, { label = ['Style', 'Variant'], none, demo } = {}) {
  const m = String(current || '').match(new RegExp(`^${prefix}-(\\d)-(\\d)$`)); let a = m ? +m[1] : 0, b = m ? +m[2] : 0; const on = !!m;
  const sel = (name, list, val, set) => h('label', { class: 'cb' }, h('span', name), h('select', { 'aria-label': name, onchange: e => set(+e.target.value) }, list.map((t, i) => h('option', { value: String(i), selected: i === val }, t))));
  const out = h('div', { class: 'combo' });
  const pick = () => { const id = `${prefix}-${a}-${b}`; onPick(id); if (demo) demo(id); };
  mount(out, h('div', { class: 'row' }, sel(label[0], firsts, a, v => { a = v; pick(); }), sel(label[1], seconds, b, v => { b = v; pick(); }),
    h('button', { class: 'btn', type: 'button', onclick: () => { a = Math.floor(Math.random() * firsts.length); b = Math.floor(Math.random() * seconds.length); pick(); } }, 'Surprise me'),
    none && h('button', { class: 'btn quiet', type: 'button', onclick: () => onPick(none === 'Off' ? 'none' : none) }, none)),
    preview && h('div', { class: 'row', style: { marginTop: '.6rem' } }, preview(a, b), h('span', { class: 'muted small' }, on ? `${firsts[a]}, ${seconds[b]}` : 'Pick a style and colour')));
  return out;
}

/* ------------------------------------------------ customise page ------------------------------------------------ */
route('/customize', async () => {
  setTitle('Personalise');
  if (S.user.role === 'student') { try { const g = await GET('/gamification/me'); S.user.level = g.level || S.user.level; } catch { /* keep */ } }
  const lvl = myLevel(); let st = { ...(S.user.settings || {}) };
  const body = h('div');
  const save = async patch => { st = { ...st, ...patch }; S.user.settings = { ...(S.user.settings || {}), ...patch }; applyPrefs(S.user); try { const r = await PUT('/auth/me', { settings: patch }); S.user = { ...r.user, level: S.user.level }; draw(); } catch (e) { fail(e); } };
  const lock = need => need > lvl; let showAllBg = false, showAllSkins = false;
  const tile = (active, locked, need, label, content, onPick, extra = {}) => h('button', { type: 'button', class: 'look' + (active ? ' on' : '') + (locked ? ' locked' : ''), 'aria-pressed': String(!!active), title: locked ? `Unlocks at level ${need}` : label, 'aria-label': label + (locked ? `, locked until level ${need}` : ''), onclick: () => (locked ? toast(`Reach level ${need} to unlock ${label}`) : onPick()), ...extra }, content, h('span', { class: 'look-n' }, label), locked && h('span', { class: 'look-lock' }, 'Lv ' + need));
  const sec = (title, sub, ...kids) => h('section', { class: 'block' }, h('h2', title), sub && h('p', { class: 'muted' }, sub), ...kids);
  const draw = () => mount(body,
    h('div', { class: 'look-preview' }, avatar(st.avatar, S.user.name, 72, st.frame), h('div', h('h3', { style: { margin: 0 } }, S.user.name), h('p', { class: 'muted', style: { margin: '.2rem 0 0' } }, S.user.role === 'student' ? `Level ${lvl}. Keep learning to unlock more.` : 'Everything is unlocked for you.')),
      h('div', { class: 'row', style: { marginLeft: 'auto' } }, h('button', { class: 'btn', type: 'button', onclick: () => celebrate(st.fx || 'confetti') }, 'Preview celebration'), h('button', { class: 'btn quiet', type: 'button', onclick: () => save({ skin: 'kivu', bg: 'plain', avatar: '', frame: 'none', fx: 'confetti', trans: 'none', hover: 'none' }) }, 'Reset all'))),
    sec(`Colour theme (${SKINS.length})`, 'Applies in light mode. Dark mode keeps its own colours.', h('div', { class: 'looks' }, (showAllSkins ? SKINS : SKINS.slice(0, 24)).map(s => tile((st.skin || 'kivu') === s.id, lock(s.lvl), s.lvl, s.name, h('span', { class: 'swatch' }, [s.dark, s.mid, s.accent, s.tint].map(c => h('i', { style: { background: c } }))), () => save({ skin: s.id })))), !showAllSkins && h('p', h('button', { class: 'btn', type: 'button', onclick: () => { showAllSkins = true; draw(); } }, `Show all ${SKINS.length} themes`))),
    sec(`Backgrounds (${BACKGROUNDS.length})`, 'Patterns, soft gradients and glows in many colours.', h('div', { class: 'looks' }, (showAllBg ? BACKGROUNDS : BACKGROUNDS.slice(0, 30)).map(b => tile((st.bg || 'plain') === b.id, lock(b.lvl), b.lvl, b.name, h('span', { class: 'bgprev', style: { backgroundImage: b.css === 'none' ? 'none' : b.css } }), () => save({ bg: b.id })))), !showAllBg && h('p', h('button', { class: 'btn', type: 'button', onclick: () => { showAllBg = true; draw(); } }, `Show all ${BACKGROUNDS.length} backgrounds`))),
    sec(`Avatar shape (${SHAPE_IDS.length}) and colour (${PALETTES.length})`, `${SHAPE_IDS.length * PALETTES.length} combinations. Your initial appears inside.`,
      h('div', { class: 'looks' }, SHAPE_IDS.map((sh, i) => { const cur = String(st.avatar || 'circle-0').split('-'); return tile(cur[0] === sh, lock(avatarLevel(i)), avatarLevel(i), sh[0].toUpperCase() + sh.slice(1), avatar(`${sh}-${cur[1] || 0}`, S.user.name, 44), () => save({ avatar: `${sh}-${cur[1] || 0}` })); })),
      h('div', { class: 'looks', style: { marginTop: '.8rem' } }, PALETTES.map((p, i) => { const cur = String(st.avatar || 'circle-0').split('-'); return tile(Number(cur[1] || 0) === i, false, 1, 'Colour ' + (i + 1), avatar(`${cur[0] || 'circle'}-${i}`, S.user.name, 36), () => save({ avatar: `${cur[0] || 'circle'}-${i}` })); }))),
    sec(`Avatar frame (${COUNTS.frames})`, `${FRAME_STYLES.length} styles in ${FRAME_COLOURS.length} colours, plus ${FRAMES.length - 1} classics.`,
      combo(st.frame, 'fr', FRAME_STYLES, FRAME_COLOURS.map(c => c[0]), (sty, col) => avatar(st.avatar, S.user.name, 56, `fr-${sty}-${col}`), v => save({ frame: v }), { label: ['Style', 'Colour'] }),
      h('div', { class: 'looks', style: { marginTop: '.8rem' } }, FRAMES.map(([id, name], i) => tile((st.frame || 'none') === id, lock(1 + Math.floor(i / 3)), 1 + Math.floor(i / 3), name, avatar(st.avatar, S.user.name, 44, id), () => save({ frame: id }))))),
    sec(`Page transitions (${COUNTS.transitions})`, `${TRANS_TYPES.length} movements at ${TRANS_TIMINGS.length} speeds. Plays when you open a page.`,
      combo(st.trans, 'tr', TRANS_TYPES, TRANS_TIMINGS.map(t => `${t[0]} (${t[1]}s)`), null, v => save({ trans: v }), { label: ['Movement', 'Speed'], none: 'Off', demo: v => { const r = document.documentElement, t = transOf(v); if (!t) return; const app = document.getElementById('app'); r.setAttribute('data-trans', String(t[0])); const [, d, e] = TRANS_TIMINGS[t[1]]; r.style.setProperty('--tdur', d + 's'); r.style.setProperty('--tease', e); if (app && app.firstElementChild) { const c = app.firstElementChild; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; } } })),
    sec(`Celebration effects (${COUNTS.celebrations})`, `${FX_GLYPHS.length} kinds of confetti in ${FX_MOTIONS.length} movements. Plays when you pass a test or reach your daily study goal.`,
      combo(st.fx, 'fx', FX_GLYPHS.map(g => g[0]), FX_MOTIONS, null, v => { save({ fx: v }); celebrate(v); }, { label: ['What falls', 'How it moves'], none: 'Off' })),
    sec(`Card hover effects (${COUNTS.hovers})`, `${HOVER_STYLES.length} effects at 10 strengths. Move over the sample card to try it.`,
      combo(st.hover, 'hv', HOVER_STYLES, Array.from({ length: 10 }, (_, i) => `Strength ${i + 1}`), null, v => save({ hover: v }), { label: ['Effect', 'Strength'], none: 'Off' }),
      h('a', { class: 'item', href: 'javascript:void(0)', style: { marginTop: '.8rem' }, onclick: e => e.preventDefault() }, h('div', { class: 'grow' }, h('strong', 'Sample card'), h('span', { class: 'meta' }, 'Hover or touch here')))));
  draw();
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', h('h1', 'Personalise'), h('p', { class: 'sub' }, `${COUNTS.skins} themes, ${COUNTS.backgrounds} backgrounds, ${COUNTS.avatars} avatars, ${COUNTS.frames} frames, ${COUNTS.transitions} transitions, ${COUNTS.celebrations} celebrations and ${COUNTS.hovers} hover effects. Some unlock as you level up.`))), body);
});
