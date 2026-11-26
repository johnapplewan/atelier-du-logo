/* ==========================================================================
   Atelier du Logo — Motion
   The twin module that animates the open project's logo. It lives apart from the workshop: it only reads the
   drawing (layers, palettes, effects through layerSVG / applyFx) and never changes it. Its own data is
   doc.motion = {v:1, dur, loop, anims:[…]}, saved with the project (docNow / loadDoc hooks) and in the local
   cache (palDoc). Inlined by build.js at the end of the workshop script, so it shares its helpers (clone, r2,
   esc, bounds, pathD, paintOf…).
   Step 1: scene, player, duration. Step 2: quick animations on layers (appear, disappear, text, motion,
   camera), each with its own sliders, applied to one or several layers with a stagger.
   ========================================================================== */
const MOTION_MIN = 1, MOTION_MAX = 12, MOTION_FPS = 30, MO_SCENE = "__scene", MO_MAX_ANIMS = 120;
const motionDefault = () => ({ v: 1, dur: 5, loop: true, anims: [], audio: moAudioDefault() });
var motion = motionDefault();   // var: the workshop's save hooks may run before this point

/* ---------- Easing curves (custom Bézier curves come with the timeline, step 3) ---------- */
const moC = (v, a, b) => Math.max(a, Math.min(b, v)), mo01 = v => moC(v, 0, 1);
const MO_EASES = {
  douce: { n: "Douce", f: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2 },
  sortie: { n: "Freinage", f: u => 1 - Math.pow(1 - u, 3) },
  entree: { n: "Accélération", f: u => u * u * u },
  lin: { n: "Linéaire", f: u => u },
  depasse: { n: "Dépassement", f: u => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } },
  elastique: { n: "Élastique", f: u => u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - .75) * 2 * Math.PI / 3) + 1 },
  rebond: { n: "Rebond", f: u => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375; return n * (u -= 2.625 / d) * u + .984375; } },
  net: { n: "Instantanée", f: u => u > 0 ? 1 : 0 },
};
/* custom speed curve: cubic-bezier(x1, y1, x2, y2) as in CSS, solved for x (Newton, then bisection) */
function moBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return u => { if (u <= 0) return 0; if (u >= 1) return 1; let t = u;
    for (let i = 0; i < 8; i++) { const e = X(t) - u, d = dX(t); if (Math.abs(e) < 1e-6) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = u; for (let i = 0; i < 40; i++) { const x = X(t); if (Math.abs(x - u) < 1e-6) break; if (x < u) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t); };
}
const MO_BZ = { douce: [.65, 0, .35, 1], sortie: [.33, 1, .68, 1], entree: [.32, 0, .67, 0], lin: [0, 0, 1, 1], depasse: [.34, 1.56, .64, 1] };
const moEaseOf = a => a.ease === "perso" && Array.isArray(a.bz) ? moBezier(...a.bz) : (MO_EASES[a.ease] || MO_EASES[MO_PRESETS[a.p].ease]).f;
const MO_EASE_OPTS = Object.assign({}, MO_EASES, { perso: "Courbe personnalisée…" });
/* free keyframes: values at given times, eased towards the next key */
const MO_KF = {
  o: { n: "Opacité", min: 0, max: 100, step: 1, u: " %", d: 100 },
  x: { n: "Position X", min: -100, max: 100, step: .5, u: " %", d: 0 },
  y: { n: "Position Y", min: -100, max: 100, step: .5, u: " %", d: 0 },
  s: { n: "Échelle", min: 0, max: 500, step: 1, u: " %", d: 100 },
  r: { n: "Rotation", min: -720, max: 720, step: 1, u: "°", d: 0 },
};
function moKeyAt(a, t) {
  const K = a.keys; if (t <= K[0].t) return K[0]; if (t >= K[K.length - 1].t) return K[K.length - 1];
  let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
  const A = K[i], B = K[i + 1], u = (MO_EASES[A.e] || MO_EASES.douce).f(mo01((t - A.t) / Math.max(1e-6, B.t - A.t))), v = {};
  for (const k in MO_KF) v[k] = A[k] + (B[k] - A[k]) * u;
  return v;
}
function moKeySync(a) { a.keys.sort((p, q) => p.t - q.t); a.at = r2(a.keys[0].t); a.len = Math.max(.01, r2(a.keys[a.keys.length - 1].t - a.keys[0].t)); }
const MO_ORDERS = { calques: "Ordre des calques", gauche: "De gauche à droite", droite: "De droite à gauche", centre: "Du centre vers les bords", hasard: "Au hasard" };
const MO_DIRS = { bas: [0, 1], haut: [0, -1], gauche: [-1, 0], droite: [1, 0] };

/* ---------- Settings (sliders) ---------- */
const MO_PARAMS = {
  dir: { n: "Direction", opts: { bas: "Depuis le bas", haut: "Depuis le haut", gauche: "Depuis la gauche", droite: "Depuis la droite" } },
  dist: { n: "Distance", min: 0, max: 60, step: 1, u: " %" },
  sc: { n: "Échelle de départ", min: 0, max: 300, step: 5, u: " %" },
  ang: { n: "Angle", min: -360, max: 360, step: 5, u: "°" },
  blur: { n: "Flou", min: 0, max: 100, step: 1, u: " %" },
  liq: { n: "Ondulation", min: 0, max: 100, step: 1, u: " %" },
  bands: { n: "Bandes", min: 2, max: 24, step: 1, u: "" },
  amp: { n: "Amplitude", min: 0, max: 40, step: 1, u: " %" },
  rep: { n: "Répétitions", min: 1, max: 12, step: 1, u: "" },
  sp: { n: "Écartement", min: 0, max: 300, step: 5, u: " %" },
  de: { n: "Départ du balayage", min: 0, max: 120, step: 1, u: " %" },
};

/* ---------- Presets ----------
   fn returns a partial state for one layer (or the scene for the camera): o opacity, x/y offset, s scale,
   sx horizontal squeeze, ky skew, r rotation, blur, liq ripple, draw (contour drawn 0…1), clip (mask reveal).
   "in" presets get u = eased progress (0 hidden → 1 as drawn); "out" plays the same preset backwards.
   "mo" presets get the raw progress p and must be at rest at p = 0 and p = 1. */
const moRise = (u, o, c) => { const v = MO_DIRS[o.dir] || MO_DIRS.bas, d = (1 - u) * o.dist / 100 * c.S; return { o: mo01(u * 1.4), x: v[0] * d, y: v[1] * d }; };
const moGrow = (u, o) => ({ o: mo01(u * 2.5), s: o.sc / 100 + (1 - o.sc / 100) * u });
const MO_PRESETS = {
  // appear / disappear
  fondu: { cat: "in", n: "Fondu", len: .8, ease: "douce", o: {}, fn: u => ({ o: u }) },
  montee: { cat: "in", n: "Glissé", len: .8, ease: "sortie", o: { dir: "bas", dist: 12 }, fn: moRise },
  zoom: { cat: "in", n: "Zoom", len: .8, ease: "sortie", o: { sc: 60 }, fn: moGrow },
  rebond: { cat: "in", n: "Rebond", len: 1.1, ease: "elastique", o: { sc: 0 }, fn: moGrow },
  rotation: { cat: "in", n: "Rotation", len: 1, ease: "sortie", o: { ang: -90, sc: 70 }, fn: (u, o) => ({ o: mo01(u * 2), r: (1 - u) * o.ang, s: o.sc / 100 + (1 - o.sc / 100) * u }) },
  trace: { cat: "in", n: "Tracé du contour", len: 1.8, ease: "douce", o: {}, feat: "trace", fn: u => ({ draw: mo01(u) }) },
  masque: { cat: "in", n: "Révélation par masque", len: 1, ease: "douce", o: { dir: "gauche" }, feat: "clip", fn: (u, o) => ({ clip: { k: "wipe", dir: o.dir, v: mo01(u) } }) },
  pochoir: { cat: "in", n: "Pochoir", len: 1.2, ease: "sortie", o: { bands: 8 }, feat: "clip", fn: (u, o) => ({ o: mo01(u * 3), clip: { k: "bands", n: o.bands, v: mo01(u) } }) },
  flou: { cat: "in", n: "Mise au point", len: 1, ease: "sortie", o: { blur: 40 }, feat: "filter", fn: (u, o) => ({ o: mo01(u * 1.3), blur: (1 - mo01(u)) * o.blur }) },
  balayage: { cat: "in", n: "Balayage du rendu", len: 1, ease: "douce", o: { de: 112 }, fn: (u, o) => ({ sweep: { de: o.de / 100, u } }) },
  liquide: { cat: "in", n: "Liquide", len: 1.4, ease: "sortie", o: { liq: 60 }, feat: "filter", fn: (u, o) => ({ o: mo01(u * 1.6), liq: (1 - mo01(u)) * o.liq }) },
  // text (letters are layers: the order and the stagger make the effect)
  lettres: { cat: "texte", n: "Lettre par lettre", len: .55, ease: "sortie", stg: .06, ord: "gauche", o: { dir: "bas", dist: 6 }, fn: moRise },
  mots: { cat: "texte", n: "Mot par mot", len: .7, ease: "sortie", stg: .3, ord: "gauche", by: "mot", o: { dir: "bas", dist: 8 }, fn: moRise },
  machine: { cat: "texte", n: "Machine à écrire", len: .04, ease: "net", stg: .09, ord: "gauche", o: {}, fn: u => ({ o: u }) },
  espacement: { cat: "texte", n: "Espacement qui se resserre", len: 1.4, ease: "sortie", stg: 0, ord: "gauche", o: { sp: 120 }, fn: (u, o, c) => ({ o: mo01(u * 1.5), x: c.lx * o.sp / 100 * (1 - u) }) },
  vague: { cat: "texte", n: "Vague", len: .8, ease: "depasse", stg: .05, ord: "gauche", o: { dir: "bas", dist: 10 }, fn: moRise },
  eclosion: { cat: "texte", n: "Éclosion", len: .7, ease: "depasse", stg: .05, ord: "centre", o: { sc: 0 }, fn: moGrow },
  // motion (during the animation, back at rest at the end)
  pulsation: { cat: "mo", n: "Pulsation", len: 1.2, ease: "lin", o: { amp: 8, rep: 2 }, fn: (p, o) => ({ s: 1 + o.amp / 100 * .5 * (1 - Math.cos(2 * Math.PI * o.rep * p)) }) },
  balancier: { cat: "mo", n: "Balancier", len: 1.6, ease: "lin", o: { ang: 12, rep: 3 }, fn: (p, o) => ({ r: o.ang * Math.sin(2 * Math.PI * o.rep * p) * (1 - p) }) },
  flottement: { cat: "mo", n: "Flottement", len: 2, ease: "lin", o: { dist: 3, rep: 2 }, fn: (p, o, c) => ({ y: -o.dist / 100 * c.S * Math.sin(2 * Math.PI * o.rep * p) }) },
  tour: { cat: "mo", n: "Tour complet", len: 1.2, ease: "douce", o: { rep: 1 }, fn: (p, o, c, e) => ({ r: 360 * o.rep * e }) },
  secousse: { cat: "mo", n: "Secousse", len: .6, ease: "lin", o: { amp: 3, rep: 6 }, fn: (p, o, c) => ({ x: o.amp / 100 * c.S * Math.sin(2 * Math.PI * o.rep * p) * (1 - p) }) },
  // camera (the whole scene; 2.5D: perspective is simulated with a squeeze and a skew)
  approche: { cat: "cam", n: "Approche", len: 5, ease: "douce", o: { sc: 80 }, fn: (u, o) => ({ s: o.sc / 100 + (1 - o.sc / 100) * u }) },
  recul: { cat: "cam", n: "Recul", len: 5, ease: "douce", o: { sc: 130 }, fn: (u, o) => ({ s: o.sc / 100 + (1 - o.sc / 100) * u }) },
  orbite: { cat: "cam", n: "Orbite autour du logo", len: 3, ease: "sortie", o: { ang: 60 }, fn: (u, o) => { const a = o.ang * (1 - u) * Math.PI / 180; return { sx: Math.max(.05, Math.cos(a)), ky: Math.sin(a) * 8 }; } },
  panoramique: { cat: "cam", n: "Panoramique", len: 3, ease: "douce", o: { dir: "droite", dist: 15 }, fn: (u, o, c) => { const v = MO_DIRS[o.dir] || MO_DIRS.droite, d = (1 - u) * o.dist / 100 * c.S; return { x: v[0] * d, y: v[1] * d }; } },
};
MO_PRESETS.cles = { cat: "key", n: "Clés libres", len: 1, ease: "douce", o: {}, fn: () => ({}) };
const MO_TABS = [["in", "Apparition"], ["out", "Disparition"], ["texte", "Texte"], ["mo", "Mouvement"], ["cam", "Caméra"], ["key", "Clés"]];

/* ---------- Data ---------- */
const moFin = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
function validAnimOpts(p, o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  return Object.keys(o).every(k => { const d = MO_PARAMS[k]; if (!d || !(k in MO_PRESETS[p].o)) return false;
    return d.opts ? typeof o[k] === "string" && Object.prototype.hasOwnProperty.call(d.opts, o[k]) : moFin(o[k], d.min, d.max); });
}
function validKey(k) {
  return !!k && typeof k === "object" && moFin(k.t, 0, MOTION_MAX) && Object.keys(k).every(f => f === "t" || f === "e" || MO_KF[f])
    && Object.keys(MO_KF).every(f => moFin(k[f], MO_KF[f].min, MO_KF[f].max))
    && (k.e === undefined || (typeof k.e === "string" && Object.prototype.hasOwnProperty.call(MO_EASES, k.e)));
}
function validAnim(a) {
  return !!a && typeof a === "object" && typeof a.id === "string" && /^[\w-]{1,24}$/.test(a.id)
    && typeof a.p === "string" && Object.prototype.hasOwnProperty.call(MO_PRESETS, a.p)
    && ["in", "out", "mo", "cam", "key"].includes(a.k) && (a.k === "key") === (a.p === "cles")
    && (a.k !== "key" || (Array.isArray(a.keys) && a.keys.length >= 2 && a.keys.length <= 40 && a.keys.every(validKey)))
    && (a.bz === undefined || (Array.isArray(a.bz) && a.bz.length === 4 && moFin(a.bz[0], 0, 1) && moFin(a.bz[2], 0, 1) && moFin(a.bz[1], -1, 2) && moFin(a.bz[3], -1, 2)))
    && (a.ease !== "perso" || Array.isArray(a.bz))
    && Array.isArray(a.ids) && a.ids.length >= 1 && a.ids.length <= 400 && a.ids.every(i => typeof i === "string" && i.length <= 120)
    && moFin(a.at, 0, MOTION_MAX) && moFin(a.len, .01, MOTION_MAX) && (a.stg === undefined || moFin(a.stg, 0, 2))
    && (a.ease === undefined || a.ease === "perso" || (typeof a.ease === "string" && Object.prototype.hasOwnProperty.call(MO_EASES, a.ease)))
    && (a.ord === undefined || (typeof a.ord === "string" && Object.prototype.hasOwnProperty.call(MO_ORDERS, a.ord)))
    && validAnimOpts(a.p, a.o);
}
function validMotion(m) {
  return !!m && typeof m === "object" && m.v === 1 && moFin(m.dur, MOTION_MIN, MOTION_MAX)
    && (m.loop === undefined || typeof m.loop === "boolean")
    && (m.anims === undefined || (Array.isArray(m.anims) && m.anims.length <= MO_MAX_ANIMS && m.anims.every(validAnim)))
    && (m.audio === undefined || validAudio(m.audio));
}
function motionNow() { return motion ? clone(motion) : motionDefault(); }
function motionLoad(m) {
  motion = validMotion(m) ? { v: 1, dur: m.dur, loop: m.loop !== false, anims: clone(m.anims || []), audio: m.audio ? clone(m.audio) : moAudioDefault() } : motionDefault();
  if (MO && MO.open) { MO.undo = []; MO.redo = []; moBuild(); moPanel(); }
}

/* ---------- Timing engine ---------- */
var MO = { open: false, t: 0, playing: false, raf: 0, last: 0, auto: {}, ranks: {}, info: {}, S: 1, sel: new Set(), tab: "in", focus: null, undo: [], redo: [], pend: null };
const moRest = () => ({ o: 1, x: 0, y: 0, s: 1, sx: 1, ky: 0, r: 0, blur: 0, liq: 0, draw: null, clip: null, sweep: null });
function moMix(st, q) {
  if (q.o !== undefined) st.o *= q.o; if (q.x) st.x += q.x; if (q.y) st.y += q.y; if (q.s !== undefined) st.s *= q.s;
  if (q.sx !== undefined) st.sx *= q.sx; if (q.ky) st.ky += q.ky; if (q.r) st.r += q.r; if (q.blur) st.blur += q.blur; if (q.liq) st.liq += q.liq;
  if (q.draw !== undefined && q.draw !== null) st.draw = st.draw === null ? q.draw : Math.min(st.draw, q.draw);
  if (q.clip && (!st.clip || q.clip.v < st.clip.v)) st.clip = q.clip;
  if (q.sweep) st.sweep = q.sweep;
}
/* provisional preview while no animation is chosen: groups fade and rise in turn (step 1) */
function moAutoPlan() {
  const vis = moVisible(), order = [], slot = {};
  vis.forEach(l => { const k = l.grp || l.group || "mark"; if (!(k in slot)) { slot[k] = order.length; order.push(k); } });
  const n = Math.max(1, order.length), span = motion.dur * 0.7, len = Math.min(0.9, Math.max(0.25, motion.dur * 0.16)), plan = {};
  vis.forEach(l => { const i = slot[l.grp || l.group || "mark"]; plan[l.id] = { start: n > 1 ? i * (span - len) / (n - 1) : 0, len }; });
  return plan;
}
const moVisible = () => layers.filter(l => l.visible !== false && l.subs && l.subs.length);
/* rank of each layer inside an animation (order + stagger); words group the letters of one text block */
function moRanks(a) {
  const P = MO_PRESETS[a.p], ids = a.ids.filter(id => MO.info[id]), ord = a.ord || P.ord || "calques";
  const key = id => P.by === "mot" ? (layerById(id) && (layerById(id).grp || layerById(id).group)) || id : id;
  const units = [], seen = {};
  ids.forEach(id => { const k = key(id); if (!(k in seen)) { seen[k] = units.length; units.push({ k, ids: [], x: Infinity, cx: 0 }); } const u = units[seen[k]]; u.ids.push(id); u.x = Math.min(u.x, MO.info[id].x0); });
  units.forEach(u => { u.cx = u.ids.reduce((s, id) => s + MO.info[id].cx, 0) / u.ids.length; });
  const mid = units.reduce((s, u) => s + u.cx, 0) / Math.max(1, units.length);
  let h = 0; for (const ch of a.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const sorted = units.slice();
  if (ord === "gauche") sorted.sort((p, q) => p.x - q.x);
  else if (ord === "droite") sorted.sort((p, q) => q.x - p.x);
  else if (ord === "centre") sorted.sort((p, q) => Math.abs(p.cx - mid) - Math.abs(q.cx - mid));
  else if (ord === "hasard") sorted.forEach((u, i) => { const j = i + Math.floor(rnd() * (sorted.length - i)); [sorted[i], sorted[j]] = [sorted[j], sorted[i]]; });
  const r = {}, cx = ids.reduce((s, id) => s + MO.info[id].cx, 0) / Math.max(1, ids.length);
  sorted.forEach((u, i) => u.ids.forEach(id => { r[id] = { i, lx: MO.info[id].cx - cx }; }));
  return { r, n: sorted.length };
}
function moState(t) {
  const out = {};
  if (!motion.anims.length) {
    for (const id in MO.auto) { const p = MO.auto[id], u = MO_EASES.sortie.f(mo01((t - p.start) / p.len)), st = moRest(); st.o = u; st.y = (1 - u) * 14; out[id] = st; }
    return out;
  }
  for (const a of motion.anims) {
    const P = MO_PRESETS[a.p], E = moEaseOf(a), o = Object.assign({}, P.o, a.o);
    const targets = a.k === "cam" ? { r: { [MO_SCENE]: { i: 0, lx: 0 } } } : (MO.ranks[a.id] || { r: {} });
    for (const id in targets.r) {
      const rk = targets.r[id], c = { S: MO.S, lx: rk.lx }, st0 = a.at + rk.i * (a.stg || 0), p = mo01((t - st0) / a.len);
      let q;
      if (a.k === "key") { const v = moKeyAt(a, t - rk.i * (a.stg || 0)); q = { o: v.o / 100, x: v.x / 100 * MO.S, y: v.y / 100 * MO.S, s: v.s / 100, r: v.r }; }
      else if (a.k === "in" || a.k === "cam") q = P.fn(E(p), o, c);
      else if (a.k === "out") q = P.fn(1 - E(p), o, c);
      else { if (t < st0 || t > st0 + a.len) continue; q = P.fn(p, o, c, E(p)); }
      moMix(out[id] || (out[id] = moRest()), q);
    }
  }
  return out;
}

/* ---------- Module UI ---------- */
const moEl = id => document.getElementById(id);
const moFmt = t => (Math.round(t * 100) / 100).toFixed(2).replace(".", ",") + " s";
const moNum = v => String(Math.round(v * 100) / 100).replace(".", ",");

(function moInit() {
  const css = document.createElement("style");
  css.textContent = `
#motion{position:fixed;inset:0;z-index:900;background:var(--cream);display:flex;flex-direction:column;color:var(--ink)}
#motion[hidden]{display:none}
body.motion-open .toast{z-index:1000}
#motion .mo-top{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--paper)}
#motion .mo-top h2{font-size:15px;margin:0;font-weight:600;letter-spacing:.01em}
#motion .mo-top .sub{color:var(--muted);font-size:12px}
#motion .mo-top .spacer{flex:1}
#motion .mo-dur{display:flex;align-items:center;gap:8px;font-size:13px}
#motion .mo-dur input{width:150px}
#motion .mo-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px}
#motion .mo-main{display:flex;flex-direction:column;min-width:0;min-height:0}
#motion .mo-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:16px 20px;container-type:size}
#motion .mo-frame{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 30px rgba(0,0,0,.06);width:min(100cqw,100cqh*var(--ar,1.7778));aspect-ratio:var(--ar,1.7778);display:flex;overflow:hidden}
#motion .mo-frame svg{width:100%;height:100%;display:block}
#motion .mo-frame g[data-mo]{cursor:pointer}
#motion .mo-bar{display:flex;align-items:center;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--paper)}
#motion .mo-bar button{min-width:36px;height:36px}
#motion .mo-anim .acts button,#motion .mo-keys button,.mobank-list .it button{display:inline-flex;align-items:center;gap:5px}
#motion .mo-anim .acts .i,#motion .mo-keys .i,.mobank-list .it .i{width:13px;height:13px}
#motion .mo-tr .lb .i{width:13px;height:13px;display:inline-block;vertical-align:-2px;margin-right:5px;color:#2F8F6B}
#motion .mo-bar input[type=range]{flex:1}
#motion .mo-time{font-variant-numeric:tabular-nums;font-size:13px;min-width:120px;text-align:right;white-space:nowrap}
#motion .mo-tl{border-top:1px solid var(--line);background:var(--paper);max-height:30vh;min-height:92px;overflow:auto;flex:none;user-select:none;-webkit-user-select:none}
#motion .mo-tl-in{position:relative;--f:0;padding-right:14px}
#motion .mo-tr{display:grid;grid-template-columns:170px minmax(0,1fr);align-items:center;min-height:28px;border-bottom:1px solid var(--cream)}
#motion .mo-tr.head{position:sticky;top:0;z-index:3;background:var(--paper);min-height:24px;border-bottom:1px solid var(--line)}
#motion .mo-tr .lb{font-size:12px;padding:0 10px 0 14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;color:var(--ink)}
#motion .mo-tr .lb small{color:var(--muted)}
#motion .mo-tr.on .lb{font-weight:600}
#motion .mo-lane{position:relative;height:28px;touch-action:none}
#motion .mo-tr.head .mo-lane{height:24px;cursor:ew-resize}
#motion .mo-tick{position:absolute;top:0;bottom:0;border-left:1px solid var(--line)}
#motion .mo-tick span{position:absolute;top:5px;left:3px;white-space:nowrap;font-size:10px;color:var(--muted);font-variant-numeric:tabular-nums}
#motion .mo-bar2{position:absolute;top:6px;height:16px;border-radius:5px;background:var(--c,#4F5BD5);opacity:.85;cursor:grab;min-width:6px}
#motion .mo-tr.on .mo-bar2{opacity:1;box-shadow:0 0 0 2px #fff,0 0 0 3.5px var(--c,#4F5BD5)}
#motion .mo-bar2 .hl,#motion .mo-bar2 .hr{position:absolute;top:0;bottom:0;width:8px;cursor:ew-resize}
#motion .mo-bar2 .hl{left:-3px} #motion .mo-bar2 .hr{right:-3px}
#motion .mo-bar2 i{position:absolute;top:3px;bottom:3px;width:1px;background:rgba(255,255,255,.7);pointer-events:none}
#motion .mo-kline{position:absolute;top:13px;height:2px;background:#4F5BD5;opacity:.5;cursor:grab}
#motion .mo-kf{position:absolute;top:7px;width:13px;height:13px;margin-left:-6.5px;background:#fff;border:2px solid #4F5BD5;transform:rotate(45deg);border-radius:2px;cursor:ew-resize;box-sizing:border-box}
#motion .mo-kf.on{background:#4F5BD5}
#motion .mo-ph{position:absolute;top:0;bottom:0;left:calc(170px + (100% - 184px) * var(--f));width:2px;margin-left:-1px;background:#E0703A;pointer-events:none;z-index:4}
#motion .mo-tl-empty{font-size:12px;color:var(--muted);padding:6px 14px}
#motion .mo-keys{display:flex;flex-wrap:wrap;gap:4px}
#motion .mo-keys button{font-size:11px;padding:3px 7px}
#motion .mo-keys button[aria-pressed=true]{background:#4F5BD5;color:#fff;border-color:#4F5BD5}
#motion .mo-bzwrap{display:flex;flex-direction:column;align-items:center;gap:2px}
#motion .mo-bz{width:100%;max-width:240px;touch-action:none}
#motion .mo-bz circle[data-h]{cursor:grab}
#motion .mo-bzwrap code{font-size:11px;color:var(--muted)}
#motion .mo-note{color:var(--muted);font-size:12px;text-align:center;padding:0 16px 10px}
#motion .mo-side{border-left:1px solid var(--line);background:var(--paper);overflow:auto;padding:14px 16px 24px;display:flex;flex-direction:column;gap:16px}
#motion .mo-side h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px;font-weight:600}
#motion .mo-place{display:flex;align-items:center;gap:7px;width:100%;margin-top:8px;font-size:12.5px;justify-content:center}
#motion .mo-place svg{width:15px;height:15px}
#motion .mo-quick{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
#motion .mo-quick button,#motion .mo-tabs button{font-size:12px;padding:4px 9px}
#motion .mo-layers{max-height:190px;overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}
#motion .mo-layers label{display:flex;align-items:center;gap:8px;padding:5px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--cream)}
#motion .mo-layers label:last-child{border-bottom:0}
#motion .mo-layers label.on{background:#EEF0FB}
#motion .mo-layers .grp{color:var(--muted);font-size:11px;margin-left:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}
#motion .mo-layers .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#motion .mo-tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
#motion .mo-tabs button[aria-pressed=true]{background:var(--night);color:#fff;border-color:var(--night)}
#motion .mo-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#motion .mo-presets button{text-align:left;font-size:13px;padding:8px 10px;min-height:38px}
#motion .mo-recipes{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#motion .mo-recipes button{text-align:left;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-height:56px}
#motion .mo-recipes b{font-size:13px;font-weight:600}
#motion .mo-recipes small{font-size:11px;color:var(--muted);line-height:1.3}
#motion .mo-sndgen{display:flex;gap:6px;margin:8px 0}
#motion .mo-sndgen select{flex:1;min-width:0;font-size:13px}
#motion .mo-sndgen button{font-size:12.5px;padding:6px 10px}
#motion .mo-bar2.snd{opacity:.8}
#motion .mo-tr.off .mo-bar2.snd{opacity:.3}
#motion .mo-hint{color:var(--muted);font-size:12px;margin:6px 0 0}
#motion .mo-anim{border:1px solid var(--line);border-radius:10px;background:#fff;margin-bottom:8px}
#motion .mo-anim[open]{box-shadow:0 2px 10px rgba(0,0,0,.05)}
#motion .mo-anim summary{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;font-size:13px;list-style:none}
#motion .mo-anim summary::-webkit-details-marker{display:none}
#motion .mo-anim summary .k{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
#motion .mo-anim summary .t{color:var(--muted);font-size:12px;margin-left:auto;font-variant-numeric:tabular-nums}
#motion .mo-anim .bd{padding:4px 10px 10px;display:flex;flex-direction:column;gap:7px}
#motion .mo-p input[type=range]{width:100%;min-width:0;margin:0}
#motion .mo-p{display:grid;grid-template-columns:100px minmax(0,1fr) 50px;align-items:center;gap:8px;font-size:12px}
#motion .mo-p output{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted)}
#motion .mo-p select{grid-column:2 / 4;font-size:12px}
#motion .mo-anim .acts{display:flex;gap:6px;justify-content:flex-end;margin-top:2px}
#motion .mo-anim .acts button{font-size:12px;padding:4px 9px}
@media (max-width:900px){
  #motion .mo-top{flex-wrap:wrap;gap:8px} #motion .mo-dur{width:100%} #motion .mo-dur input{flex:1;width:auto} #motion .mo-top .sub{display:none}
  #motion .mo-body{display:flex;flex-direction:column;overflow:auto}
  #motion .mo-main{flex:none} #motion .mo-stage{padding:10px;flex:none;container-type:normal} #motion .mo-frame{width:100%}
  #motion .mo-side{border-left:0;border-top:1px solid var(--line);overflow:visible;flex:none}
  #motion .mo-time{min-width:0} #motion .mo-bar{position:sticky;bottom:0;z-index:2} #motion .mo-bar .chk{display:none}
  #motion .mo-p{grid-template-columns:92px minmax(0,1fr) 48px} #motion .mo-time{white-space:nowrap;font-size:12px} #motion .mo-bar{gap:6px;padding-left:10px;padding-right:10px} #motion .mo-bar button{min-width:32px}
}
@media (max-width:600px){ #motion .mo-tl{display:none} }
@media (prefers-reduced-motion:reduce){ #motion *{transition:none!important} }`;
  document.head.appendChild(css);
  const root = document.createElement("div");
  root.id = "motion"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Motion : animer le logo");
  root.innerHTML = `
<div class="mo-top">
  <button id="moBack" class="hb" title="Revenir à l'atelier (Échap)">${ico("prev")}Atelier</button>
  <div><h2>Motion</h2><div class="sub">Animer le logo du projet ouvert</div></div>
  <div class="spacer"></div>
  <button id="moExport" class="primary" title="Exporter en MP4, WebM, GIF ou SVG animé">Exporter</button>
  <button id="moUndo" title="Annuler (Ctrl+Z)" disabled>Annuler</button>
  <button id="moRedo" title="Rétablir (Ctrl+Maj+Z)" disabled>Rétablir</button>
  <label class="mo-dur">Durée <input type="range" id="moDur" min="${MOTION_MIN}" max="${MOTION_MAX}" step="0.5"> <output id="moDurOut"></output></label>
</div>
<div class="mo-body">
  <div class="mo-main">
    <div class="mo-stage"><div class="mo-frame" id="moFrame"><svg id="moSvg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg></div></div>
    <div class="mo-tl" id="moTl" aria-label="Frise chronologique"><div class="mo-tl-in" id="moTlIn"></div></div>
    <div class="mo-note" id="moNote"></div>
    <div class="mo-bar">
      <button id="moStart" class="hb" title="Début (Origine)" aria-label="Revenir au début">${ico("skipStart")}</button>
      <button id="moPrev" class="hb" title="Image précédente (←)" aria-label="Image précédente">${ico("prev")}</button>
      <button id="moPlay" class="primary hb" title="Lecture / pause (Espace)" aria-label="Lecture">${ico("play")}</button>
      <button id="moNext" class="hb" title="Image suivante (→)" aria-label="Image suivante">${ico("next")}</button>
      <input type="range" id="moScrub" min="0" step="${1 / MOTION_FPS}" value="0" aria-label="Position dans l'animation">
      <label class="chk"><input type="checkbox" id="moLoop"> Boucle</label>
      <span class="mo-time" id="moTime"></span>
    </div>
  </div>
  <div class="mo-side" id="moSide" role="region" aria-label="Animations">
    <section><h3 data-info="mo-recipes">Recettes en un clic</h3><div class="mo-recipes" id="moRecipes"></div></section>
    <section id="moSndSec"><h3 data-info="mo-sound">Son</h3>
      <label class="chk"><input type="checkbox" id="moSndOn"> Son activé</label>
      <label class="mo-p" style="margin-top:6px"><span>Volume général</span><input type="range" id="moSndVol" min="0" max="150" step="1"><output id="moSndVolOut"></output></label>
      <div class="mo-sndgen"><select id="moAmb" aria-label="Ambiance de la bande son"></select><button id="moGen" class="primary">Générer la bande son</button></div>
      <div class="mo-sndgen"><button id="moGen2" title="Même ambiance, d'autres sons">Autre proposition</button><button id="moBankBtn">Banque de sons…</button></div>
      <details class="mo-anim" id="moFxBox"><summary><span>Effets sur tout le son</span></summary><div class="bd" id="moFx"></div></details>
      <div id="moClips"></div></section>
    <section><h3 data-info="mo-layers">Calques</h3>
      <div class="mo-quick"><button data-q="all">Tout</button><button data-q="mark">Symbole</button><button data-q="word">Texte</button><button data-q="none">Aucun</button></div>
      <div class="mo-layers" id="moLayers"></div>
      <button class="mo-place" id="moPlace">${ico("place")}Importer une image ou un SVG…</button></section>
    <section><h3 data-info="mo-add">Ajouter une animation</h3>
      <div class="mo-tabs" id="moTabs" role="group" aria-label="Familles d'animations">${MO_TABS.map(([k, n]) => `<button data-tab="${k}" aria-pressed="false">${n}</button>`).join("")}</div>
      <div class="mo-presets" id="moPresets"></div><p class="mo-hint" id="moHint"></p></section>
    <section><h3 data-info="mo-list"><span id="moListTitle">Animations</span></h3><div id="moList"></div></section>
  </div>
</div>`;
  document.body.appendChild(root);
  const mb = document.getElementById("motionBtn"); if (mb) mb.onclick = openMotion;

  moEl("moBack").onclick = closeMotion;
  moEl("moExport").onclick = () => openMotionExport();
  moEl("moUndo").onclick = () => moUndo(false);
  moEl("moRedo").onclick = () => moUndo(true);
  moEl("moPlay").onclick = () => moPlay(!MO.playing);
  moEl("moStart").onclick = () => { moPlay(false); moSeek(0); };
  moEl("moPrev").onclick = () => moStep(-1);
  moEl("moNext").onclick = () => moStep(1);
  moEl("moScrub").oninput = e => { moPlay(false); moSeek(+e.target.value); };
  moEl("moDur").oninput = e => { motion.dur = moC(+e.target.value, MOTION_MIN, MOTION_MAX); moBuild(); moPanel(); moSave(); };
  moEl("moLoop").onchange = e => { motion.loop = e.target.checked; moSave(); };
  moEl("moPlace").onclick = () => { window.__moAfterPlace = () => { window.__moAfterPlace = null; if (MO.open) { moBuild(); moPanel(); } }; $("#placeIn").click(); };
  moEl("moSvg").addEventListener("click", e => { const g = e.target.closest && e.target.closest("g[data-mo]"); if (!g) return;
    moSelect(g.dataset.mo, e.shiftKey || e.metaKey || e.ctrlKey); });
  const side = moEl("moSide");
  side.addEventListener("click", e => {
    const rcp = e.target.closest("[data-recipe]"); if (rcp) { moApplyRecipe(rcp.dataset.recipe); return; }
    const q = e.target.closest("[data-q]"), tab = e.target.closest("[data-tab]"), pr = e.target.closest("[data-preset]"), act = e.target.closest("[data-act]");
    if (q) { const k = q.dataset.q; MO.sel = new Set(k === "none" ? [] : moVisible().filter(l => k === "all" || l.group === k).map(l => l.id)); moPanel(); moSelBoxes(); }
    else if (tab) { MO.tab = tab.dataset.tab; moPanel(); }
    else if (pr) moAdd(pr.dataset.preset);
    else if (act) { const a = motion.anims.find(x => x.id === act.dataset.id); if (!a) return;
      if (act.dataset.act === "del") { moPush(); motion.anims = motion.anims.filter(x => x !== a); moBuild(); moPanel(); moSave(); }
      else if (act.dataset.act === "play") { moSeek(Math.max(0, a.at - .2)); moPlay(true); }
      else if (act.dataset.act === "selkey") { MO.key = { a: a.id, i: +act.dataset.i }; MO.focus = a.id; moPlay(false); moSeek(a.keys[+act.dataset.i].t); moPanel(); }
      else if (act.dataset.act === "addkey") { const v = moKeyAt(a, MO.t), t = r2(MO.t), same = a.keys.findIndex(k => Math.abs(k.t - t) < 1 / MOTION_FPS);
        if (same >= 0) MO.key = { a: a.id, i: same };
        else if (a.keys.length >= 40) toast("40 clés au plus par animation.");
        else { moPush(); const K = { t, e: "douce" }; for (const f in MO_KF) K[f] = Math.round(v[f] * 100) / 100; a.keys.push(K); moKeySync(a); MO.key = { a: a.id, i: a.keys.indexOf(K) }; moSave(); }
        moPanel(); moSeek(MO.t); }
      else if (act.dataset.act === "delkey") { if (a.keys.length <= 2) return; moPush(); a.keys.splice(+act.dataset.i, 1); moKeySync(a); MO.key = { a: a.id, i: 0 }; moPanel(); moSeek(MO.t); moSave(); }
      else if (act.dataset.act === "sel") { MO.sel = new Set(a.ids.filter(id => MO.info[id])); moPanel(); moSelBoxes(); } }
  });
  side.addEventListener("change", e => {
    const lc = e.target.closest("[data-layer]");
    if (lc) { if (lc.checked) MO.sel.add(lc.dataset.layer); else MO.sel.delete(lc.dataset.layer); moPanel(); moSelBoxes(); return; }
    const kf = e.target.closest("[data-kk]");
    if (kf) { const a = motion.anims.find(x => x.id === kf.dataset.a); if (!a) return;
      if (kf.tagName === "SELECT") { moPush(); const K = a.keys[+kf.dataset.i]; if (K && MO_EASES[kf.value]) K.e = kf.value; moSeek(MO.t); moSave(); }
      else { if (MO.pend) { MO.undo.push(MO.pend); MO.redo = []; MO.pend = null; moUndoBtns(); } moPanel(); moSave(); }
      return; }
    const f = e.target.closest("[data-k]"); if (!f) return;
    const a = motion.anims.find(x => x.id === f.dataset.a); if (!a) return;
    if (f.tagName === "SELECT") { moPush(); moSet(a, f.dataset.k, f.value); moAfterEdit(a, true); }
    else { if (MO.pend) { MO.undo.push(MO.pend); MO.redo = []; MO.pend = null; moUndoBtns(); } moPanelTimes(); moSave(); }
  });
  side.addEventListener("input", e => {
    const kf = e.target.closest("input[type=range][data-kk]");
    if (kf) { const a = motion.anims.find(x => x.id === kf.dataset.a), K = a && a.keys[+kf.dataset.i]; if (!K) return;
      if (!MO.pend) MO.pend = moSnap();
      const f = kf.dataset.kk, d = f === "t" ? { min: 0, max: motion.dur } : MO_KF[f]; K[f] = moC(+kf.value, d.min, d.max);
      if (f === "t") { moKeySync(a); MO.key = { a: a.id, i: a.keys.indexOf(K) }; kf.closest(".bd").querySelectorAll("[data-kk]").forEach(el => { el.dataset.i = MO.key.i; }); }
      const out = kf.parentNode.querySelector("output"); if (out) out.textContent = f === "t" ? moNum(K.t) + " s" : moNum(K[f]) + MO_KF[f].u;
      moTl(); if (!MO.playing) moSeek(f === "t" ? K.t : MO.t); return; }
    const f = e.target.closest("input[type=range][data-k]"); if (!f) return;
    const a = motion.anims.find(x => x.id === f.dataset.a); if (!a) return;
    if (!MO.pend) MO.pend = moSnap();
    moSet(a, f.dataset.k, +f.value); const out = f.parentNode.querySelector("output"); if (out) out.textContent = moShow(f.dataset.k, +f.value);
    moAfterEdit(a, false);
  });
  // custom curve: drag the two handles
  side.addEventListener("pointerdown", e => {
    const h = e.target.closest && e.target.closest("circle[data-h]"); if (!h) return;
    const svg = h.ownerSVGElement, a = motion.anims.find(x => x.id === svg.dataset.bz); if (!a || !a.bz) return;
    e.preventDefault(); const k = h.dataset.h === "1" ? 0 : 2, before = moSnap();
    const move = ev => { const m = svg.getScreenCTM().inverse(), pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m);
      a.bz[k] = Math.round(moC((pt.x - 20) / 160, 0, 1) * 100) / 100; a.bz[k + 1] = Math.round(moC((120 - pt.y) / 90, -1, 2) * 100) / 100;
      const b = a.bz, X = moBzX, Y = moBzY;
      h.setAttribute("cx", X(b[k])); h.setAttribute("cy", Y(b[k + 1]));
      const l = svg.querySelector(`[data-l="${k ? 2 : 1}"]`); l.setAttribute("x2", X(b[k])); l.setAttribute("y2", Y(b[k + 1]));
      svg.querySelector("[data-c]").setAttribute("d", `M${X(0)} ${Y(0)}C${X(b[0])} ${Y(b[1])} ${X(b[2])} ${Y(b[3])} ${X(1)} ${Y(1)}`);
      const c = side.querySelector(`[data-bzv="${a.id}"]`); if (c) c.textContent = moBzTxt(b);
      if (!MO.playing) moSeek(MO.t); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (moSnap() !== before) { MO.undo.push(before); MO.redo = []; moUndoBtns(); moSave(); } };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); move(e);
  });
  side.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("mo-anim") && d.open) MO.focus = d.dataset.id; }, true);
  // while the module is open its keys never reach the workshop's shortcuts
  window.addEventListener("keydown", e => {
    if (!MO.open) return;
    const dlg = document.querySelector("dialog[open]"); if (dlg) return;
    e.stopImmediatePropagation();
    const field = e.target.closest && e.target.closest("input[type=range],input[type=text],textarea,select");
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") { e.preventDefault(); closeMotion(); }
    else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); moUndo(e.shiftKey); }
    else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); moUndo(true); }
    else if (e.key === " " && !(e.target.closest && e.target.closest("button,select"))) { e.preventDefault(); moPlay(!MO.playing); }
    else if (!field && e.key === "ArrowLeft") { e.preventDefault(); moStep(-1); }
    else if (!field && e.key === "ArrowRight") { e.preventDefault(); moStep(1); }
    else if (!field && e.key === "Home") { e.preventDefault(); moPlay(false); moSeek(0); }
    else if (!field && e.key === "End") { e.preventDefault(); moPlay(false); moSeek(motion.dur); }
  }, true);
})();

function moSave() { try { localSave(); } catch (_) {} }
const moSnap = () => JSON.stringify({ a: motion.anims, s: motion.audio });
function moRestore(str) { const v = JSON.parse(str); if (Array.isArray(v)) motion.anims = v; else { motion.anims = v.a; motion.audio = v.s; } }
function moPush() { MO.undo.push(moSnap()); if (MO.undo.length > 60) MO.undo.shift(); MO.redo = []; MO.pend = null; moUndoBtns(); }
function moUndo(redo) {
  const from = redo ? MO.redo : MO.undo, to = redo ? MO.undo : MO.redo; if (!from.length) return;
  to.push(moSnap()); moRestore(from.pop()); moBuild(); moPanel(); moSave(); moUndoBtns(); if (MO.playing) moAudioStart(MO.t);
}
function moUndoBtns() { moEl("moUndo").disabled = !MO.undo.length; moEl("moRedo").disabled = !MO.redo.length; }
function moShow(k, v) { if (k === "at" || k === "len" || k === "stg") return moNum(v) + " s"; const d = MO_PARAMS[k]; return d ? moNum(v) + d.u : moNum(v); }
function moSet(a, k, v) {
  if (k === "at") a.at = moC(v, 0, MOTION_MAX); else if (k === "len") a.len = moC(v, .01, MOTION_MAX); else if (k === "stg") a.stg = moC(v, 0, 2);
  else if (k === "ease") { if (v === "perso") { if (!Array.isArray(a.bz)) a.bz = (MO_BZ[a.ease || MO_PRESETS[a.p].ease] || [.25, .1, .25, 1]).slice(); a.ease = "perso"; } else if (MO_EASES[v]) a.ease = v; } else if (k === "ord") { if (MO_ORDERS[v]) a.ord = v; }
  else if (MO_PARAMS[k]) { const d = MO_PARAMS[k]; a.o[k] = d.opts ? (d.opts[v] ? v : a.o[k]) : moC(v, d.min, d.max); }
}
function moAfterEdit(a, save) {
  if (MO_PRESETS[a.p].feat === "clip" && a.o.bands) moBuild(); else { MO.ranks[a.id] = a.k === "cam" ? null : moRanks(a); }
  if (!MO.playing) moSeek(MO.t);
  if (save) { moPanel(); moSave(); } else moTl();
}

/* add a preset to the selected layers (or to the scene for the camera) */
function moAdd(p) {
  const P = MO_PRESETS[p], k = MO.tab === "out" ? "out" : P.cat === "texte" ? "in" : P.cat;
  let ids = k === "cam" ? [MO_SCENE] : moVisible().filter(l => MO.sel.has(l.id)).map(l => l.id);
  if (!ids.length) { toast("Choisissez d'abord un ou plusieurs calques."); return; }
  if (motion.anims.length >= MO_MAX_ANIMS) { toast("Nombre maximum d'animations atteint."); return; }
  const n = ids.length, stg = P.stg !== undefined ? P.stg : n > 1 ? Math.min(.12, 1.2 / n) : 0, len = Math.min(P.len, k === "cam" ? motion.dur : P.len);
  const units = P.by === "mot" ? new Set(ids.map(id => (layerById(id) && (layerById(id).grp || layerById(id).group)) || id)).size : n;
  const span = len + stg * Math.max(0, units - 1);
  let at = 0;
  if (k === "in") { const ends = motion.anims.filter(a => a.k === "in").map(a => moEnd(a)); at = ends.length ? Math.max(0, Math.min(motion.dur - span, Math.max(...ends) - .3)) : 0; }
  else if (k === "out") at = Math.max(0, motion.dur - span);
  else if (k === "mo") at = Math.max(0, Math.min(motion.dur - span, motion.dur * .55));
  let id; do id = "a" + Math.random().toString(36).slice(2, 8); while (motion.anims.some(a => a.id === id));
  const a = { id, p, k, ids, at: r2(at), len: r2(len), stg: r2(stg), ease: k === "out" && P.cat === "in" ? "entree" : P.ease, o: clone(P.o) };
  if (P.ord || n > 1) a.ord = P.ord || "calques";
  if (k === "key") { const t0 = r2(Math.min(MO.t, motion.dur - .5));
    a.keys = [{ t: t0, o: 0, x: 0, y: 6, s: 100, r: 0, e: "sortie" }, { t: r2(Math.min(motion.dur, t0 + 1)), o: 100, x: 0, y: 0, s: 100, r: 0, e: "douce" }];
    moKeySync(a); MO.key = { a: id, i: 0 }; }
  moPush(); motion.anims.push(a); MO.focus = id;
  moBuild(); moPanel(); moSave(); moSeek(Math.max(0, a.at - .15)); moPlay(true);
}
function moEnd(a) {
  const n = a.k === "cam" ? 1 : (MO.ranks[a.id] ? MO.ranks[a.id].n : a.ids.length);
  return a.at + a.len + (a.stg || 0) * Math.max(0, n - 1);
}

/* the scene: every visible layer drawn once by the workshop's own renderer, each in a <g> that only gets an
   opacity, a transform, and when an animation needs it a mask, a filter or a contour to draw */
function moBuild() {
  const svg = moEl("moSvg"), vis = moVisible();
  MO.info = {}; MO.ranks = {}; MO.auto = motion.anims.length ? {} : moAutoPlan();
  const need = {};   // layer id -> {trace, clip:bands, filter}
  for (const a of motion.anims) { const f = MO_PRESETS[a.p].feat; if (!f || a.k === "cam") continue;
    a.ids.forEach(id => { const n = need[id] || (need[id] = {}); if (f === "clip") n.clip = Math.max(n.clip || 1, a.o.bands || MO_PRESETS[a.p].o.bands || 1); else n[f] = true; }); }
  let defs = "", body = "";
  if (vis.length) {
    const b = bounds(vis), w = b.x1 - b.x0, h = b.y1 - b.y0, vb = moViewBox(moAR());
    MO.S = Math.max(w, h) || 1; MO.c = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    svg.setAttribute("viewBox", `${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}`);
    vis.forEach((L, k) => {
      const r = layerSVG(L, { pfx: "mo" }), lb = bounds([L]), nd = need[L.id] || {}, S = Math.max(lb.x1 - lb.x0, lb.y1 - lb.y0) || 1;
      MO.info[L.id] = { k, x0: lb.x0, x1: lb.x1, y0: lb.y0, y1: lb.y1, cx: (lb.x0 + lb.x1) / 2, cy: (lb.y0 + lb.y1) / 2, S, clip: nd.clip || 0, trace: !!nd.trace, filter: !!nd.filter };
      defs += r.defs;
      if (nd.filter) defs += `<filter id="mof-${k}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${r2(3 / S * 100) / 100}" numOctaves="2" seed="${k + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0"/></filter>`;
      if (nd.clip) defs += `<clipPath id="moc-${k}" clipPathUnits="userSpaceOnUse">${"<rect/>".repeat(nd.clip)}</clipPath>`;
      let tr = "";
      if (nd.trace) { const p = paintOf(L), col = typeof p === "string" ? p : (p.c ? p.c[0] : mixHex(p.p.map(q => q.c)));
        tr = `<path data-tr d="${pathD(L.subs, !!L.open)}" pathLength="1" fill="none" stroke="${col}" stroke-width="${r2(L.open ? (L.sw || 4) : Math.max(.2, Math.min(S * .05, MO.S * .0025)))}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" opacity="0"/>`; }
      body += `<g data-mo="${esc(L.id)}"${nd.filter ? ` filter="url(#mof-${k})"` : ""}><g data-c${nd.clip ? ` clip-path="url(#moc-${k})"` : ""}><g data-b>${r.body}</g>${tr}</g></g>`;
    });
  } else { MO.S = 1; MO.c = { x: 80, y: 45 }; svg.setAttribute("viewBox", "0 0 160 90"); }
  moEl("moFrame").style.setProperty("--ar", String(Math.round(moAR() * 1e4) / 1e4));
  svg.innerHTML = (defs ? `<defs>${defs}</defs>` : "") + (body ? `<g data-scene>${body}</g><g data-selbox pointer-events="none"></g>` : `<text x="80" y="47" text-anchor="middle" font-size="6" fill="#6B6B70" font-family="Inter,system-ui,sans-serif">Le projet ne contient encore aucun calque visible.</text>`);
  MO.groups = {}; svg.querySelectorAll("g[data-mo]").forEach(g => { MO.groups[g.dataset.mo] = { g, c: g.firstChild, b: g.firstChild.firstChild, tr: g.querySelector("[data-tr]") }; });
  MO.scene = svg.querySelector("g[data-scene]");
  MO.sweeps = {};
  if (vis.length) { const b = bounds(vis); MO.all = { x0: b.x0, W: (b.x1 - b.x0) || 1 };
    vis.forEach(L => (L.fx || []).forEach((e, k) => { if (e.t !== "fondu" && e.t !== "efface") return;
      const el = document.getElementById(`mo-fx-${L.id.replace(/[^\w-]/g, "")}-${k}g`); if (el) (MO.sweeps[L.id] || (MO.sweeps[L.id] = [])).push({ el, a: e.a / 100 }); })); }
  for (const id of [...MO.sel]) if (!MO.info[id]) MO.sel.delete(id);
  for (const a of motion.anims) if (a.k !== "cam") MO.ranks[a.id] = moRanks(a);
  const dur = moEl("moDur"); dur.value = motion.dur; moEl("moDurOut").textContent = moNum(motion.dur) + " s";
  moEl("moScrub").max = motion.dur; moEl("moLoop").checked = motion.loop;
  moEl("moNote").textContent = motion.anims.length ? "" : "Aperçu automatique : choisissez une recette en un clic, ou des calques puis une animation, pour composer la vôtre.";
  moSelBoxes(); moSeek(Math.min(MO.t, motion.dur));
}
/* the drawing framed with a margin in a given aspect ratio (width / height) */
/* an animation plan has its own frame (planFrame, at the origin): the stage and the exports show that frame */
const moAR = () => planFrame ? planFrame.w / planFrame.h : 16 / 9;
function moViewBox(aspect) {
  if (planFrame) { let vw = planFrame.w, vh = planFrame.h; if (vw / vh < aspect) vw = vh * aspect; else vh = vw / aspect;
    return { x: (planFrame.w - vw) / 2, y: (planFrame.h - vh) / 2, w: vw, h: vh }; }
  const vis = moVisible(); if (!vis.length) return { x: 0, y: 0, w: 160, h: 90 };
  const b = bounds(vis), w = b.x1 - b.x0, h = b.y1 - b.y0, pad = Math.max(w, h) * 0.12;
  let vw = w + 2 * pad, vh = h + 2 * pad; if (vw / vh < aspect) vw = vh * aspect; else vh = vw / aspect;
  return { x: (b.x0 + b.x1 - vw) / 2, y: (b.y0 + b.y1 - vh) / 2, w: vw, h: vh };
}
function moTransform(s, c) {
  const t = (s.x || s.y ? `translate(${r2(s.x)} ${r2(s.y)}) ` : "") + (s.r || s.s !== 1 || s.sx !== 1 || s.ky
    ? `translate(${r2(c.x)} ${r2(c.y)})${s.r ? ` rotate(${r2(s.r)})` : ""}${s.ky ? ` skewY(${r2(s.ky)})` : ""} scale(${Math.round(s.s * s.sx * 1e4) / 1e4} ${Math.round(s.s * 1e4) / 1e4}) translate(${r2(-c.x)} ${r2(-c.y)})` : "");
  return t.trim();
}
function moRender(t) {
  const st = moState(t), I = MO.info;
  for (const id in MO.groups) {
    const G = MO.groups[id], s = st[id] || moRest(), inf = I[id], k = inf.k;
    G.g.setAttribute("opacity", r2(mo01(s.o)));
    const tr = moTransform(s, { x: inf.cx, y: inf.cy }); if (tr) G.g.setAttribute("transform", tr); else G.g.removeAttribute("transform");
    if (inf.filter) { const f = document.getElementById("mof-" + k);
      f.children[1].setAttribute("scale", r2(Math.max(0, s.liq) / 100 * inf.S * .25)); f.children[2].setAttribute("stdDeviation", r2(Math.max(0, s.blur) / 100 * inf.S * .08)); }
    if (inf.clip) { const c = s.clip, cp = document.getElementById("moc-" + k), rs = cp.children, w = inf.x1 - inf.x0, h = inf.y1 - inf.y0, m = inf.S * .05;
      const set = (el, x, y, ww, hh) => { el.setAttribute("x", r2(x)); el.setAttribute("y", r2(y)); el.setAttribute("width", r2(Math.max(0, ww))); el.setAttribute("height", r2(Math.max(0, hh))); };
      for (const el of rs) set(el, 0, 0, 0, 0);
      if (!c || c.v >= 1) { const M = MO.S * 4; set(rs[0], inf.cx - M, inf.cy - M, 2 * M, 2 * M); }   // idle: one rect covers everything
      else {
        if (c.k === "wipe") { const v = c.v, X = inf.x0 - m, Y = inf.y0 - m, W = w + 2 * m, H = h + 2 * m;
          if (c.dir === "gauche") set(rs[0], X, Y, W * v, H); else if (c.dir === "droite") set(rs[0], X + W * (1 - v), Y, W * v, H);
          else if (c.dir === "haut") set(rs[0], X, Y, W, H * v); else set(rs[0], X, Y + H * (1 - v), W, H * v); }
        else { const n = Math.min(c.n, rs.length), bh = (h + 2 * m) / n; for (let i = 0; i < n; i++) set(rs[i], inf.x0 - m, inf.y0 - m + i * bh + bh * (1 - c.v) / 2, w + 2 * m, bh * c.v + .01); } } }
    if (G.tr) { const d = s.draw, on = d !== null && d < 1;   // not started yet (d = 0): nothing shows, not even the round line caps
      G.tr.setAttribute("opacity", on && d > 0 ? 1 : 0); G.tr.setAttribute("stroke-dashoffset", on ? r2(1 - d) : 0); G.b.setAttribute("opacity", on ? r2(mo01((d - .55) / .45)) : 1); }
  }
  for (const id in MO.sweeps) { const sw = st[id] && st[id].sweep;
    for (const g of MO.sweeps[id]) { const pos = sw ? sw.de + (g.a - sw.de) * sw.u : g.a, cx = MO.all.x0 + MO.all.W * pos, h = MO.all.W * .06;
      g.el.setAttribute("x1", r2(cx - h)); g.el.setAttribute("x2", r2(cx + h)); } }
  if (MO.scene) { const s = st[MO_SCENE]; const tr = s ? moTransform(s, MO.c) : ""; if (tr) MO.scene.setAttribute("transform", tr); else MO.scene.removeAttribute("transform");
    MO.scene.setAttribute("opacity", s ? r2(mo01(s.o)) : 1); }
}
function moSelBoxes() {
  const g = moEl("moSvg").querySelector("g[data-selbox]"); if (!g) return;
  if (MO.playing || MO.exporting) { g.innerHTML = ""; return; }
  const m = MO.S * .008, ids = [...MO.sel].filter(id => MO.info[id]);
  // many layers: one frame around all of them
  const boxes = ids.length > 8 ? [ids.reduce((u, id) => { const i = MO.info[id]; return { x0: Math.min(u.x0, i.x0), y0: Math.min(u.y0, i.y0), x1: Math.max(u.x1, i.x1), y1: Math.max(u.y1, i.y1) }; }, { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity })] : ids.map(id => MO.info[id]);
  g.innerHTML = boxes.map(i => {
    return `<rect x="${r2(i.x0 - m)}" y="${r2(i.y0 - m)}" width="${r2(i.x1 - i.x0 + 2 * m)}" height="${r2(i.y1 - i.y0 + 2 * m)}" fill="none" stroke="#4F5BD5" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`; }).join("");
}
function moSelect(id, add) {
  if (add) { if (MO.sel.has(id)) MO.sel.delete(id); else MO.sel.add(id); } else MO.sel = new Set([id]);
  moPanel(); moSelBoxes();
  const row = moEl("moLayers").querySelector(`[data-layer="${CSS.escape(id)}"]`); if (row) row.closest("label").scrollIntoView({ block: "nearest" });
}

/* ---------- One-click recipes ----------
   A recipe reads the drawing (symbol / text blocks / sketch and render layers) and writes a complete set of
   animations, timed in fractions of the current duration. It replaces the current animations (undoable). */
function moParts() {
  const vis = moVisible(), has = (l, t) => Array.isArray(l.fx) && l.fx.some(e => e.t === t);
  const mark = vis.filter(l => l.group === "mark"), word = vis.filter(l => l.group === "word");
  const bk = {}; word.forEach(l => { const k = l.grp || "word"; (bk[k] || (bk[k] = [])).push(l); });
  const blocks = Object.values(bk).map(ls => ({ ids: ls.map(l => l.id), y: bounds(ls).y0 })).sort((p, q) => p.y - q.y).map(b => b.ids);
  return { vis, has, mark: mark.map(l => l.id), blocks, all: vis.map(l => l.id), words: word.map(l => l.id) };
}
function moRecipe(key) {
  const R = MO_RECIPES[key], T = motion.dur, M = moParts(), list = [];
  // p preset, k kind, ids, at / len / span as fractions of the duration (span: the whole group ends within it)
  const mk = (p, k, ids, at, len, x = {}) => {
    ids = (ids || []).filter(Boolean); if (!ids.length) return;
    const P = MO_PRESETS[p], n = k === "cam" ? 1 : ids.length, L = Math.max(.04, len * T), units = P.by === "mot" ? new Set(ids.map(id => (layerById(id) && (layerById(id).grp || layerById(id).group)) || id)).size : n;
    const stg = units > 1 ? Math.max(0, Math.min(2, ((x.span || len) * T - L) / (units - 1))) : 0;
    let id; do id = "a" + Math.random().toString(36).slice(2, 8); while (list.some(a => a.id === id) || motion.anims.some(a => a.id === id));
    const a = { id, p, k, ids: k === "cam" ? [MO_SCENE] : ids, at: r2(Math.min(at * T, T - .05)), len: r2(L), stg: r2(stg), ease: x.ease || (k === "out" && P.cat === "in" ? "entree" : P.ease), o: Object.assign(clone(P.o), x.o || {}) };
    if (x.ord || P.ord || n > 1) a.ord = x.ord || P.ord || "calques";
    list.push(a);
  };
  R.build(M, mk);
  return list;
}
const moTextIn = (M, mk, at, span, p, x) => M.blocks.forEach((ids, i) => mk(i ? "fondu" : p, "in", ids, at + i * span * .8, i ? .14 : Math.min(.16, span * .4), Object.assign({ span: i ? span * .5 : span, ord: "gauche" }, i ? {} : x || {})));
const MO_RECIPES = {
  croquis: { n: "Du croquis au rendu", d: "Construction, crayon, puis le rendu balaie le dessin", build: (M, mk) => {
    const fxA = l => { const e = (l.fx || []).find(e => e.t === "fondu" || e.t === "efface"); return e ? Math.round(e.a * 10) / 10 : null; };
    const swept = M.vis.filter(l => fxA(l) !== null);
    if (!swept.length) {   // no sketch / render layers: every contour is drawn, then filled
      mk("trace", "in", M.mark, 0, .22, { span: .5 }); M.blocks.forEach((ids, i) => mk("trace", "in", ids, .3 + i * .12, .18, { span: .4, ord: "gauche" }));
      mk("approche", "cam", [MO_SCENE], 0, 1, { o: { sc: 94 } }); return; }
    const plain = M.vis.filter(l => fxA(l) === null);
    mk("trace", "in", plain.filter(l => l.open).map(l => l.id), 0, .12, { span: .22 });            // construction lines
    mk("fondu", "in", plain.filter(l => !l.open).map(l => l.id), .1, .1, { span: .2 });             // measures and labels
    const sets = [...new Set(swept.map(fxA))].sort((p, q) => p - q);
    sets.forEach((v, i) => {
      const ls = swept.filter(l => fxA(l) === v), pencil = ls.filter(l => M.has(l, "efface")).map(l => l.id);
      mk("trace", "in", pencil, .12 + i * .12, .14, { span: .3, ord: i ? "gauche" : "calques" });
      // the sweep starts just past this group's right edge, so it crosses the drawing for its whole duration
      const all = bounds(M.vis), W = (all.x1 - all.x0) || 1, de = Math.round(Math.min(1.2, (bounds(ls).x1 - all.x0) / W + .07) * 100);
      mk("balayage", "in", ls.map(l => l.id), .46 + i * .15, .2, { o: { de }, ease: "douce" });
    });
    mk("approche", "cam", [MO_SCENE], 0, 1, { o: { sc: 94 } }); } },
  elegante: { n: "Révélation élégante", d: "Symbole en douceur, nom lettre par lettre", build: (M, mk) => {
    mk("zoom", "in", M.mark, 0, .24, { o: { sc: 88 } }); moTextIn(M, mk, .22, .34, "lettres", { o: { dir: "bas", dist: 5 } });
    mk("approche", "cam", [MO_SCENE], 0, 1, { o: { sc: 95 } }); } },
  architecte: { n: "Tracé d'architecte", d: "Chaque contour se dessine puis se remplit", build: (M, mk) => {
    mk("trace", "in", M.mark, 0, .25, { span: .45 }); M.blocks.forEach((ids, i) => mk("trace", "in", ids, .3 + i * .12, .2, { span: .4, ord: "gauche" })); } },
  rebond: { n: "Rebond joyeux", d: "Le symbole rebondit, les lettres éclosent", build: (M, mk) => {
    mk("rebond", "in", M.mark, 0, .26); M.blocks.forEach((ids, i) => mk("eclosion", "in", ids, .2 + i * .14, .14, { span: .32, ord: "centre" }));
    mk("pulsation", "mo", M.mark, .72, .2, { o: { amp: 6, rep: 1 } }); } },
  minimal: { n: "Glissé minimal", d: "Symbole et texte glissent en place", build: (M, mk) => {
    mk("montee", "in", M.mark, 0, .22, { o: { dir: "gauche", dist: 8 } }); M.blocks.forEach((ids, i) => mk("montee", "in", ids, .16 + i * .1, .2, { span: .26, ord: "gauche", o: { dir: "bas", dist: 6 } })); } },
  machine: { n: "Machine à écrire", d: "Le symbole apparaît, le nom se tape", build: (M, mk) => {
    mk("fondu", "in", M.mark, 0, .14); moTextIn(M, mk, .14, .46, "machine"); } },
  liquide: { n: "Encre liquide", d: "Le logo se forme comme une encre", build: (M, mk) => {
    mk("liquide", "in", M.mark, 0, .36); M.blocks.forEach((ids, i) => mk("flou", "in", ids, .26 + i * .1, .24, { span: .34, ord: "gauche" })); } },
  pochoir: { n: "Pochoir", d: "Révélation en bandes, texte au masque", build: (M, mk) => {
    mk("pochoir", "in", M.mark, 0, .3, { o: { bands: 10 } }); M.blocks.forEach((ids, i) => mk("masque", "in", ids, .24 + i * .1, .28, { o: { dir: "gauche" } })); } },
  orbite: { n: "Orbite", d: "La caméra tourne autour du logo", build: (M, mk) => {
    mk("orbite", "cam", [MO_SCENE], 0, .6, { o: { ang: 55 } }); mk("fondu", "in", M.mark, 0, .2); moTextIn(M, mk, .16, .3, "lettres", { o: { dir: "bas", dist: 4 } }); } },
  boucle: { n: "Entrée et sortie", d: "Apparition, pause, puis disparition", build: (M, mk) => {
    mk("zoom", "in", M.mark, 0, .16, { o: { sc: 80 } }); moTextIn(M, mk, .1, .28, "lettres", { o: { dir: "bas", dist: 5 } });
    mk("fondu", "out", M.all, .8, .16, { ease: "entree" }); } },
};
async function moApplyRecipe(key) {
  const R = MO_RECIPES[key]; if (!R) return;
  if (!moVisible().length) { toast("Le projet ne contient aucun calque visible."); return; }
  moPlay(false);
  if (motion.anims.length && !(await confirmBox("Appliquer la recette « " + R.n + " » ?", "Elle remplace les animations actuelles. « Annuler » (Ctrl+Z) les rétablit.", "Remplacer"))) return;
  const list = moRecipe(key);
  moPush(); motion.anims = list; MO.focus = null; MO.sel = new Set();
  moBuild(); moPanel(); moSave(); moSeek(0); moPlay(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  toast("Recette « " + R.n + " » appliquée : chaque animation reste réglable.");
}

/* ---------- Side panel ---------- */
const moTitle = a => (a.k === "key" ? "Clés" : a.k === "out" ? "Disparition" : a.k === "mo" ? "Mouvement" : a.k === "cam" ? "Caméra" : MO_PRESETS[a.p].cat === "texte" ? "Texte" : "Apparition");
function moSlider(a, k, v, min, max, step) {
  return `<label class="mo-p"><span>${k === "at" ? "Début" : k === "len" ? "Durée" : k === "stg" ? "Décalage entre calques" : esc(MO_PARAMS[k].n)}</span><input type="range" data-a="${a.id}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${moShow(k, v)}</output></label>`;
}
function moSelect2(a, k, label, opts, v) {
  return `<label class="mo-p"><span>${label}</span><select data-a="${a.id}" data-k="${k}">${Object.entries(opts).map(([key, n]) => `<option value="${key}"${key === v ? " selected" : ""}>${esc(typeof n === "string" ? n : n.n)}</option>`).join("")}</select></label>`;
}
function moKSlider(a, i, f, v) {
  const d = f === "t" ? { n: "Temps", min: 0, max: motion.dur, step: 1 / MOTION_FPS } : MO_KF[f];
  return `<label class="mo-p"><span>${d.n}</span><input type="range" data-a="${a.id}" data-kk="${f}" data-i="${i}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}"><output>${f === "t" ? moNum(v) + " s" : moNum(v) + d.u}</output></label>`;
}
function moKeyCard(a, n) {
  const i = MO.key && MO.key.a === a.id ? Math.min(MO.key.i, a.keys.length - 1) : 0, K = a.keys[i];
  let h = `<div class="mo-keys" role="group" aria-label="Clés">${a.keys.map((k, j) => `<button data-act="selkey" data-id="${a.id}" data-i="${j}" aria-pressed="${j === i}">${ico("diamond")}${moNum(k.t)} s</button>`).join("")}</div>`;
  h += moKSlider(a, i, "t", K.t);
  for (const f in MO_KF) h += moKSlider(a, i, f, K[f]);
  if (i < a.keys.length - 1) h += `<label class="mo-p"><span>Courbe vers la clé suivante</span><select data-a="${a.id}" data-kk="e" data-i="${i}">${Object.entries(MO_EASES).map(([k, e]) => `<option value="${k}"${k === (K.e || "douce") ? " selected" : ""}>${esc(e.n)}</option>`).join("")}</select></label>`;
  if (n > 1) h += moSlider(a, "stg", a.stg || 0, 0, 1, .01) + moSelect2(a, "ord", "Ordre", MO_ORDERS, a.ord || "calques");
  h += `<div class="acts"><button data-act="addkey" data-id="${a.id}" title="Ajoute une clé à la position de la tête de lecture">+ Clé ici</button>${a.keys.length > 2 ? `<button data-act="delkey" data-id="${a.id}" data-i="${i}">Supprimer la clé</button>` : ""}</div>`;
  return h;
}
const moBzX = x => 20 + x * 160, moBzY = y => 120 - y * 90;
function moBzEditor(a) {
  const b = a.bz, X = moBzX, Y = moBzY;
  return `<div class="mo-bzwrap"><svg class="mo-bz" data-bz="${a.id}" viewBox="0 0 200 165" role="img" aria-label="Courbe de vitesse personnalisée : glissez les deux poignées">
<rect x="20" y="30" width="160" height="90" fill="#F7F7F5" stroke="#E3E3E0"/><path d="M20 75H180M100 30V120" stroke="#ECECE9"/>
<line data-l="1" x1="${X(0)}" y1="${Y(0)}" x2="${X(b[0])}" y2="${Y(b[1])}" stroke="#4F5BD5" stroke-width="1"/><line data-l="2" x1="${X(1)}" y1="${Y(1)}" x2="${X(b[2])}" y2="${Y(b[3])}" stroke="#4F5BD5" stroke-width="1"/>
<path data-c d="M${X(0)} ${Y(0)}C${X(b[0])} ${Y(b[1])} ${X(b[2])} ${Y(b[3])} ${X(1)} ${Y(1)}" fill="none" stroke="#1D1D1F" stroke-width="2.2"/>
<circle cx="${X(0)}" cy="${Y(0)}" r="3" fill="#1D1D1F"/><circle cx="${X(1)}" cy="${Y(1)}" r="3" fill="#1D1D1F"/>
<circle data-h="1" cx="${X(b[0])}" cy="${Y(b[1])}" r="7" fill="#fff" stroke="#4F5BD5" stroke-width="2"/><circle data-h="2" cx="${X(b[2])}" cy="${Y(b[3])}" r="7" fill="#fff" stroke="#4F5BD5" stroke-width="2"/>
<text x="20" y="160" font-size="9" fill="#6B6B70">début</text><text x="180" y="160" font-size="9" fill="#6B6B70" text-anchor="end">fin</text></svg>
<code data-bzv="${a.id}">${moBzTxt(b)}</code></div>`;
}
const moBzTxt = b => "cubic-bezier(" + b.map(v => Math.round(v * 100) / 100).join(", ") + ")";
function moCard(a) {
  const P = MO_PRESETS[a.p], o = Object.assign({}, P.o, a.o), n = a.k === "cam" ? 1 : a.ids.filter(id => MO.info[id]).length;
  if (a.k === "key") return moCardWrap(a, P, n, moKeyCard(a, n));
  let h = moSlider(a, "at", a.at, 0, Math.max(.5, motion.dur - .1), .05) + moSlider(a, "len", a.len, a.p === "machine" ? .01 : .1, Math.max(.2, motion.dur), .05);
  if (n > 1) h += moSlider(a, "stg", a.stg || 0, 0, 1, .01) + moSelect2(a, "ord", "Ordre", MO_ORDERS, a.ord || P.ord || "calques");
  h += moSelect2(a, "ease", "Courbe", MO_EASE_OPTS, a.ease || P.ease);
  if (a.ease === "perso" && Array.isArray(a.bz)) h += moBzEditor(a);
  for (const k of Object.keys(P.o)) { const d = MO_PARAMS[k]; h += d.opts ? moSelect2(a, k, esc(d.n), d.opts, o[k]) : moSlider(a, k, o[k], d.min, d.max, d.step); }
  return moCardWrap(a, P, n, h);
}
function moCardWrap(a, P, n, h) {
  const who = a.k === "cam" ? "toute la scène" : n + " calque" + (n > 1 ? "s" : "");
  return `<details class="mo-anim" data-id="${a.id}"${MO.focus === a.id ? " open" : ""}><summary><span><span class="k">${moTitle(a)}</span><br>${esc(P.n)} <small style="color:var(--muted)">· ${who}</small></span><span class="t" data-time="${a.id}">${moNum(a.at)}–${moNum(moEnd(a))} s</span></summary>
<div class="bd">${h}<div class="acts">${a.k !== "cam" ? `<button data-act="sel" data-id="${a.id}">Sélectionner ses calques</button>` : ""}<button data-act="play" data-id="${a.id}">${ico("play")}Voir</button><button data-act="del" data-id="${a.id}">Retirer</button></div></div></details>`;
}
function moPanelTimes() { for (const a of motion.anims) { const el = moEl("moList").querySelector(`[data-time="${a.id}"]`); if (el) el.textContent = `${moNum(a.at)}–${moNum(moEnd(a))} s`; } }
function moPanel() {
  const vis = moVisible().slice().reverse(), gname = l => { const g = groups.find(x => x.id === l.grp); return g ? g.name : l.group === "word" ? "Texte" : "Symbole"; };
  const rc = moEl("moRecipes"); if (!rc.childElementCount) rc.innerHTML = Object.entries(MO_RECIPES).map(([k, R]) => `<button data-recipe="${k}"><b>${esc(R.n)}</b><small>${esc(R.d)}</small></button>`).join("");
  moEl("moLayers").innerHTML = vis.length ? vis.map(l => `<label class="${MO.sel.has(l.id) ? "on" : ""}"><input type="checkbox" data-layer="${esc(l.id)}"${MO.sel.has(l.id) ? " checked" : ""}><span class="n">${esc(l.name || l.id)}</span><span class="grp">${esc(gname(l))}</span></label>`).join("") : `<p class="mo-hint" style="padding:8px 10px">Aucun calque visible.</p>`;
  moEl("moTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === MO.tab)));
  const cat = MO.tab === "out" ? "in" : MO.tab;
  moEl("moPresets").innerHTML = Object.entries(MO_PRESETS).filter(([, P]) => P.cat === cat).map(([k, P]) => `<button data-preset="${k}">${esc(P.n)}</button>`).join("");
  const ns = MO.sel.size;
  moEl("moHint").textContent = MO.tab === "cam" ? "La caméra bouge autour de tout le logo." : ns ? `S'applique à ${ns} calque${ns > 1 ? "s" : ""} sélectionné${ns > 1 ? "s" : ""}${ns > 1 ? ", avec un décalage entre eux" : ""}.` : "Sélectionnez des calques (liste ou clic sur la scène, Maj pour en ajouter).";
  const list = ns ? motion.anims.filter(a => a.k === "cam" || a.ids.some(id => MO.sel.has(id))) : motion.anims;
  moEl("moListTitle").textContent = ns ? "Animations de la sélection" : "Toutes les animations";
  moEl("moList").innerHTML = list.length ? list.map(moCard).join("") : `<p class="mo-hint">Aucune animation${ns ? " sur ces calques" : ""} pour l'instant.</p>`;
  moUndoBtns(); moSndPanel(); moTl();
}

/* ---------- Timeline: one row per animation; drag a bar to move it, its ends to change its timing, a key to
   move it in time; click or drag the ruler to move the playhead ---------- */
const MO_TL_COL = { in: "#4F5BD5", out: "#E0703A", mo: "#2E2E33", cam: "#7A7A80", key: "#4F5BD5" };
function moTl() {
  const box = moEl("moTlIn"); if (!box) return;
  const D = motion.dur, f = t => r2(moC(t / D, 0, 1) * 100) + "%";
  let ticks = ""; const step = D > 8 ? 1 : .5;
  for (let t = 0; t <= D + 1e-6; t += step) ticks += `<div class="mo-tick" style="left:${f(t)}">${Math.abs(t - Math.round(t)) < 1e-6 ? `<span>${Math.round(t)} s</span>` : ""}</div>`;
  let rows = "";
  for (const a of motion.anims) {
    const P = MO_PRESETS[a.p], n = a.k === "cam" ? 1 : a.ids.filter(id => MO.info[id]).length, on = MO.focus === a.id ? " on" : "";
    let lane = "";
    if (a.k === "key") {
      const s0 = a.keys[0].t, s1 = a.keys[a.keys.length - 1].t + (a.stg || 0) * Math.max(0, (MO.ranks[a.id] ? MO.ranks[a.id].n : 1) - 1);
      lane = `<div class="mo-kline" data-drag="move" style="left:${f(s0)};width:calc(${f(s1)} - ${f(s0)})"></div>` + a.keys.map((k, i) => `<div class="mo-kf${MO.key && MO.key.a === a.id && MO.key.i === i ? " on" : ""}" data-drag="key" data-i="${i}" style="left:${f(k.t)}" title="Clé à ${moNum(k.t)} s"></div>`).join("");
    } else {
      const e = moEnd(a), w = Math.max(0, e - a.at), ns = MO.ranks[a.id] ? MO.ranks[a.id].n : 1;
      let marks = ""; if (a.stg && ns > 1 && w > 0) for (let i = 1; i < Math.min(ns, 60); i++) marks += `<i style="left:${r2(i * a.stg / w * 100)}%"></i>`;
      lane = `<div class="mo-bar2" data-drag="move" style="--c:${MO_TL_COL[a.k]};left:${f(a.at)};width:calc(${f(e)} - ${f(a.at)})" title="${esc(P.n)} : ${moNum(a.at)}–${moNum(e)} s">${marks}<div class="hl" data-drag="start"></div><div class="hr" data-drag="end"></div></div>`;
    }
    rows += `<div class="mo-tr${on}" data-a="${a.id}"><div class="lb" data-focus="${a.id}" title="${esc(moTitle(a) + " · " + P.n)}">${esc(P.n)} <small>· ${a.k === "cam" ? "scène" : n}</small></div><div class="mo-lane">${lane}</div></div>`;
  }
  for (const c of motion.audio.clips) {
    const sp = moClipSpan(c), on = MO.focusClip === c.id ? " on" : "";
    rows += `<div class="mo-tr${on}${motion.audio.on ? "" : " off"}" data-clip="${c.id}"><div class="lb" data-cfocus="${c.id}" title="${esc(moSndName(c.s))}">${ico("note")}${esc(moSndName(c.s))}</div><div class="mo-lane"><div class="mo-bar2 snd" data-drag="move" style="--c:#2F8F6B;left:${f(c.at)};width:calc(${f(Math.min(D, c.at + sp.L))} - ${f(c.at)})" title="${esc(moSndName(c.s))} : ${moNum(c.at)}–${moNum(c.at + sp.L)} s"><div class="hl" data-drag="start"></div><div class="hr" data-drag="end"></div></div></div></div>`;
  }
  box.innerHTML = `<div class="mo-tr head"><div class="lb"><small>Frise · ${moNum(D)} s</small></div><div class="mo-lane" data-ruler>${ticks}</div></div>${rows || `<div class="mo-tl-empty">Ajoutez une animation : elle apparaît ici, et se règle à la souris (déplacer, étirer).</div>`}<div class="mo-ph"></div>`;
  box.style.setProperty("--f", moC(MO.t / D, 0, 1));
}
/* show an animation's card: its layers become the selection if none of them is selected */
function moFocus(a) {
  MO.focus = a.id;
  if (a.k !== "cam" && !a.ids.some(id => MO.sel.has(id))) MO.sel = new Set(a.ids.filter(id => MO.info[id]));
  moPanel(); moSelBoxes();
  const card = moEl("moList").querySelector(`.mo-anim[data-id="${a.id}"]`); if (card) card.scrollIntoView({ block: "nearest" });
}
(function moTlInit() {
  const tl = moEl("moTl");
  const timeAt = (lane, x, free, R) => { const r = R || lane.getBoundingClientRect(), t = moC((x - r.left) / r.width, 0, 1) * motion.dur; return free ? t : Math.round(t * MOTION_FPS) / MOTION_FPS; };
  tl.addEventListener("click", e => { const cf = e.target.closest("[data-cfocus]");
    if (cf) { MO.focusClip = cf.dataset.cfocus; moPanel(); const card = moEl("moClips").querySelector(`[data-clip="${cf.dataset.cfocus}"]`); if (card) card.scrollIntoView({ block: "nearest" }); return; }
    const lb = e.target.closest("[data-focus]"); if (!lb) return;
    const a = motion.anims.find(x => x.id === lb.dataset.focus); if (!a) return; moFocus(a);
  });
  tl.addEventListener("pointerdown", e => {
    const lane = e.target.closest(".mo-lane"); if (!lane || e.button > 0) return;
    e.preventDefault();
    if (lane.hasAttribute("data-ruler") || !e.target.closest("[data-drag]")) {   // ruler or empty lane: move the playhead
      moPlay(false); const go = ev => moSeek(timeAt(lane, ev.clientX, ev.altKey)); go(e);
      const up = () => { window.removeEventListener("pointermove", go); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", go); window.addEventListener("pointerup", up); return; }
    const row = lane.closest(".mo-tr");
    if (row.dataset.clip) {   // a sound: drag = move, right end = length, left end = trim the start
      const c = motion.audio.clips.find(x => x.id === row.dataset.clip); if (!c) return;
      const kind = e.target.closest("[data-drag]").dataset.drag, R = lane.getBoundingClientRect(), before = moSnap(), t0 = timeAt(lane, e.clientX, true, R), at0 = c.at, cut0 = c.cut || 0, sp0 = moClipSpan(c); let moved = false;
      moPlay(false);
      const move = ev => { const snap = v => ev.altKey ? v : Math.round(v * MOTION_FPS) / MOTION_FPS, d = timeAt(lane, ev.clientX, true, R) - t0;
        if (Math.abs(d) * R.width / motion.dur > 2) moved = true; if (!moved) return;
        if (kind === "move") c.at = r2(moC(snap(at0 + d), 0, MOTION_MAX));
        else if (kind === "end") c.len = r2(moC(snap(at0 + sp0.L + d) - at0, .05, sp0.max));
        else { const nd = moC(snap(d), -Math.min(at0, cut0 / sp0.rate), sp0.L - .05); c.at = r2(at0 + nd); c.cut = r2(cut0 + nd * sp0.rate); c.len = r2(Math.max(.05, sp0.L - nd)); }
        moTl(); };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        if (moved && moSnap() !== before) { MO.undo.push(before); if (MO.undo.length > 60) MO.undo.shift(); MO.redo = []; moSave(); }
        MO.focusClip = c.id; moPanel(); const card = moEl("moClips").querySelector(`[data-clip="${c.id}"]`); if (card) card.scrollIntoView({ block: "nearest" }); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); return;
    }
    const a = motion.anims.find(x => x.id === row.dataset.a); if (!a) return;
    const kind = e.target.closest("[data-drag]").dataset.drag, ki = +(e.target.closest("[data-drag]").dataset.i || 0);
    const R = lane.getBoundingClientRect(), before = moSnap(), t0 = timeAt(lane, e.clientX, true, R), at0 = a.at, len0 = a.len, end0 = moEnd(a), span = end0 - at0 - a.len;
    const keys0 = a.keys ? a.keys.map(k => k.t) : null; let moved = false;
    if (MO.focus !== a.id) { MO.focus = a.id; }
    if (a.k === "key" && kind === "key") MO.key = { a: a.id, i: ki };
    moPlay(false);
    const move = ev => {
      const snap = v => ev.altKey ? v : Math.round(v * MOTION_FPS) / MOTION_FPS, d = timeAt(lane, ev.clientX, true, R) - t0;
      if (Math.abs(d) * R.width / motion.dur > 2) moved = true; if (!moved) return;
      if (a.k === "key") {
        if (kind === "key") { const K = a.keys[ki]; K.t = r2(moC(snap(keys0[ki] + d), 0, motion.dur)); moKeySync(a); MO.key = { a: a.id, i: a.keys.indexOf(K) }; moSeek(K.t); }
        else { const lo = -Math.min(...keys0), hi = motion.dur - Math.max(...keys0), dd = moC(snap(d), lo, hi); a.keys.forEach((k, i) => { k.t = r2(keys0[i] + dd); }); moKeySync(a); moSeek(MO.t); }
      } else if (kind === "start") { const nat = moC(snap(at0 + d), 0, at0 + len0 - .05); a.len = r2(len0 + at0 - nat); a.at = r2(nat); moSeek(a.at); }
      else if (kind === "end") { a.len = r2(moC(snap(end0 + d) - at0 - span, .05, MOTION_MAX)); moSeek(Math.min(motion.dur, moEnd(a))); }
      else { a.at = r2(moC(snap(at0 + d), 0, Math.max(0, MOTION_MAX - len0))); moSeek(MO.t); }
      moTl(); moPanelTimes();
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (moved && moSnap() !== before) { MO.undo.push(before); if (MO.undo.length > 60) MO.undo.shift(); MO.redo = []; moSave(); }
      else { if (a.k === "key" && kind === "key") moSeek(a.keys[ki].t); moFocus(a); return; }
      moPanel(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  });
})();

/* ---------- Player ---------- */
function moSeek(t) {
  MO.t = moC(t, 0, motion.dur); moRender(MO.t);
  const ti = moEl("moTlIn"); if (ti) ti.style.setProperty("--f", moC(MO.t / motion.dur, 0, 1));
  moEl("moScrub").value = MO.t; moEl("moTime").textContent = moFmt(MO.t) + " / " + moFmt(motion.dur);
}
function moStep(k) { moPlay(false); moSeek((Math.round(MO.t * MOTION_FPS) + k) / MOTION_FPS); }
function moPlay(on) {
  MO.playing = !!on; cancelAnimationFrame(MO.raf);
  const b = moEl("moPlay"); b.innerHTML = ico(MO.playing ? "pause" : "play"); b.setAttribute("aria-label", MO.playing ? "Pause" : "Lecture");
  moSelBoxes();
  if (!MO.playing) { moAudioStop(); return; }
  if (MO.t >= motion.dur) MO.t = 0;
  MO.last = performance.now(); moAudioStart(MO.t);
  const tick = now => {
    let t = MO.t + (now - MO.last) / 1000; MO.last = now;
    if (t >= motion.dur) { if (motion.loop) { t %= motion.dur; moAudioStart(t); } else { moSeek(motion.dur); moPlay(false); return; } }
    moSeek(t); MO.raf = requestAnimationFrame(tick);
  };
  MO.raf = requestAnimationFrame(tick);
}
function openMotion() {
  MO.open = true; MO.t = 0; MO.undo = []; MO.redo = []; MO.pend = null; moEl("motion").hidden = false; document.body.classList.add("motion-open");
  moBuild(); moPanel(); moEl("moPlay").focus(); moPlay(!matchMedia("(prefers-reduced-motion: reduce)").matches);
  moSndLoadUser().then(moSndPreload).then(() => { if (!MO.open) return; moPanel(); if (MO.playing) moAudioStart(MO.t); });
}
function closeMotion() {
  moPlay(false); moAudioStop(); MO.open = false; moEl("motion").hidden = true; document.body.classList.remove("motion-open");
  moEl("moSvg").innerHTML = ""; const b = document.getElementById("motionBtn"); if (b) b.focus();
}

/* ---------- Export (step 5): MP4 / WebM (WebCodecs + bundled MIT muxers), GIF (own encoder), animated SVG (SMIL) ----------
   Every format renders the same frames as the player: moRender(t) on the stage, then the stage SVG is either
   rasterised (video, GIF) or sampled and written as native SVG animations. Nothing leaves the device. */
const MO_ASPECTS = { "16:9": [16, 9, "Paysage 16:9"], "1:1": [1, 1, "Carré 1:1"], "9:16": [9, 16, "Vertical 9:16 (stories, reels)"], "4:5": [4, 5, "Portrait 4:5"] };
const MO_FORMATS = {
  mp4: { n: "MP4", d: "Vidéo pour les réseaux, les présentations et le montage", ext: "mp4" },
  webm: { n: "WebM", d: "Vidéo légère pour le web", ext: "webm" },
  gif: { n: "GIF", d: "Boucle légère, lue partout (256 couleurs)", ext: "gif" },
  svg: { n: "SVG animé", d: "Pour un site : net à toute taille, très léger", ext: "svg" },
  wav: { n: "WAV (son seul)", d: "La bande son, pour un montage", ext: "wav" },
};
const moAsp = k => k === "plan" && planFrame ? [planFrame.w, planFrame.h, `Format du plan (${planFrame.w} × ${planFrame.h})`] : MO_ASPECTS[k] || MO_ASPECTS["16:9"];
function moDims(aspect, short) { const [a, b] = moAsp(aspect); const even = v => Math.max(2, Math.round(v / 2) * 2);
  return a >= b ? { W: even(short * a / b), H: even(short) } : { W: even(short), H: even(short * b / a) }; }
function moLoadVendor(name, global) {
  if (window[global]) return Promise.resolve(window[global]);
  return new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/" + name;
    sc.onload = () => window[global] ? ok(window[global]) : ko(new Error(name)); sc.onerror = () => ko(new Error(name)); document.head.appendChild(sc); });
}
/* one frame of the stage as a standalone SVG string, framed by vb, at W×H, on an optional background */
function moFrameSVG(t, vb, W, H, bg) {
  moRender(t);
  const src = new XMLSerializer().serializeToString(moEl("moSvg"));
  const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet">`
    + (bg ? `<rect x="${r2(vb.x - vb.w)}" y="${r2(vb.y - vb.h)}" width="${r2(vb.w * 3)}" height="${r2(vb.h * 3)}" fill="${bg}"/>` : "");
  return src.replace(/^<svg[^>]*>/, head);
}
function moSvgImage(svgText) {
  return new Promise((ok, ko) => { const img = new Image(), url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml" }));
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); const im2 = new Image(); im2.onload = () => ok(im2); im2.onerror = () => ko(new Error("image")); im2.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText); };
    img.src = url; });
}
async function moDrawFrame(ctx, t, vb, W, H, bg) {
  const img = await moSvgImage(moFrameSVG(t, vb, W, H, bg));
  ctx.clearRect(0, 0, W, H); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
  ctx.drawImage(img, 0, 0, W, H);
}
const moFrames = fps => Math.max(1, Math.round(motion.dur * fps));

/* ---- video ---- */
async function moVideoConfig(fmt, W, H, fps) {
  if (typeof VideoEncoder === "undefined") return null;
  const bitrate = Math.round(Math.min(40e6, Math.max(2e6, W * H * fps * .12)));
  const list = fmt === "mp4" ? ["avc1.640034", "avc1.64002A", "avc1.640028", "avc1.4D4028", "avc1.42E01F"].map(c => ({ codec: c, mux: "avc" }))
    : [["vp09.00.40.08", "V_VP9"], ["vp09.00.10.08", "V_VP9"], ["vp8", "V_VP8"]].map(([c, m]) => ({ codec: c, mux: m }));
  for (const c of list) {
    const cfg = { codec: c.codec, width: W, height: H, bitrate, framerate: fps, latencyMode: "quality" };
    if (fmt === "mp4") cfg.avc = { format: "avc" };
    try { const r = await VideoEncoder.isConfigSupported(cfg); if (r && r.supported) return { cfg, mux: c.mux }; } catch (_) {}
  }
  return null;
}
async function moEncodeVideo(fmt, o, progress) {
  const { W, H, fps, bg, vb } = o, conf = await moVideoConfig(fmt, W, H, fps);
  if (!conf) throw new Error("codec");
  const lib = fmt === "mp4" ? await moLoadVendor("mp4-muxer.js", "Mp4Muxer") : await moLoadVendor("webm-muxer.js", "WebMMuxer");
  const target = new lib.ArrayBufferTarget(), au = await moAudioForVideo(fmt); MO.exAudio = au ? au.mux : null;
  const opts = fmt === "mp4" ? { target, video: { codec: "avc", width: W, height: H, frameRate: fps }, fastStart: "in-memory" } : { target, video: { codec: conf.mux, width: W, height: H, frameRate: fps } };
  if (au) opts.audio = { codec: au.mux, numberOfChannels: 2, sampleRate: au.sampleRate };
  const muxer = new lib.Muxer(opts);
  let failed = null, ai = 0;
  // sound chunks go in between the frames, in time order
  const flushAudio = ts => { if (!au) return; while (ai < au.chunks.length && au.chunks[ai][0].timestamp <= ts) { muxer.addAudioChunk(au.chunks[ai][0], au.chunks[ai][1]); ai++; } };
  const enc = new VideoEncoder({ output: (chunk, meta) => { flushAudio(chunk.timestamp); muxer.addVideoChunk(chunk, meta); }, error: e => { failed = e; } });
  enc.configure(conf.cfg);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
  const n = moFrames(fps);
  for (let i = 0; i < n; i++) {
    if (MO.exCancel) { try { enc.close(); } catch (_) {} throw new Error("cancel"); }
    if (failed) throw failed;
    await moDrawFrame(ctx, i / fps, vb, W, H, bg || "#FFFFFF");
    const frame = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: i % (fps * 2) === 0 }); frame.close();
    while (enc.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 4));
    progress((i + 1) / n);
  }
  await enc.flush(); enc.close(); if (failed) throw failed;
  flushAudio(Infinity); muxer.finalize();
  return new Blob([target.buffer], { type: fmt === "mp4" ? "video/mp4" : "video/webm" });
}

/* ---- GIF: per-frame palette (median cut, 255 colours + transparency), only the changed rectangle is stored ---- */
function moMedianCut(px, n) {
  let boxes = [px];
  while (boxes.length < n) {
    let bi = -1, best = -1, ch = 0;
    boxes.forEach((b, i) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; const sh = 16 - 8 * c;
      for (const v of b) { const x = (v >> sh) & 255; if (x < lo) lo = x; if (x > hi) hi = x; } if (hi - lo > best) { best = hi - lo; bi = i; ch = sh; } } });
    if (bi < 0 || best <= 0) break;
    const b = boxes[bi].sort((p, q) => ((p >> ch) & 255) - ((q >> ch) & 255)), m = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boxes.map(b => { let r = 0, g = 0, bl = 0; for (const v of b) { r += (v >> 16) & 255; g += (v >> 8) & 255; bl += v & 255; } const k = b.length || 1; return [Math.round(r / k), Math.round(g / k), Math.round(bl / k)]; });
}
function moLzw(idx, out) {
  const min = 8, clear = 256, eoi = 257; let size = 9, next = 258, cur = 0, bits = 0; const dict = new Map(), bytes = [];
  const emit = c => { cur |= c << bits; bits += size; while (bits >= 8) { bytes.push(cur & 255); cur >>>= 8; bits -= 8; } };
  emit(clear); let w = idx[0];
  for (let i = 1; i < idx.length; i++) { const k = idx[i], key = w * 256 + k, v = dict.get(key);
    if (v !== undefined) { w = v; continue; }
    emit(w);
    if (next === 4096) { emit(clear); dict.clear(); size = 9; next = 258; }
    else { if (next >= (1 << size)) size++; dict.set(key, next++); }
    w = k; }
  emit(w); emit(eoi); if (bits > 0) bytes.push(cur & 255);
  out.push(min); for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); } out.push(0);
}
async function moEncodeGif(o, progress) {
  const { W, H, fps, bg, vb } = o, n = moFrames(fps), delay = Math.max(2, Math.round(100 / fps));
  const out = [], push16 = v => out.push(v & 255, (v >> 8) & 255);
  for (const c of "GIF89a") out.push(c.charCodeAt(0)); push16(W); push16(H); out.push(0, 0, 0);
  if (motion.loop) { out.push(0x21, 0xFF, 11); for (const c of "NETSCAPE2.0") out.push(c.charCodeAt(0)); out.push(3, 1, 0, 0, 0); }
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d", { willReadFrequently: true });
  let prev = null;
  for (let f = 0; f < n; f++) {
    if (MO.exCancel) throw new Error("cancel");
    await moDrawFrame(ctx, f / fps, vb, W, H, bg || "#FFFFFF");
    const d = ctx.getImageData(0, 0, W, H).data;
    let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (prev) { x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = (y * W + x) * 4; if (d[p] !== prev[p] || d[p + 1] !== prev[p + 1] || d[p + 2] !== prev[p + 2]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; } }
    const rw = x1 - x0 + 1, rh = y1 - y0 + 1, sample = [], step = Math.max(1, Math.floor(rw * rh / 40000));
    for (let i = 0, c = 0; i < rw * rh; i++) { if (c++ % step) continue; const x = x0 + i % rw, y = y0 + (i / rw | 0), p = (y * W + x) * 4; sample.push((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]); }
    const pal = moMedianCut(sample, 255), cache = new Int16Array(32768).fill(-1), idx = new Uint8Array(rw * rh);
    const near = (r, g, b) => { const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); let v = cache[key];
      if (v < 0) { let bd = Infinity; pal.forEach((c, i) => { const dd = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2; if (dd < bd) { bd = dd; v = i; } }); cache[key] = v; } return v; };
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const p = ((y0 + y) * W + x0 + x) * 4;
      idx[y * rw + x] = prev && d[p] === prev[p] && d[p + 1] === prev[p + 1] && d[p + 2] === prev[p + 2] ? 255 : near(d[p], d[p + 1], d[p + 2]); }
    out.push(0x21, 0xF9, 4, (1 << 2) | 1); push16(delay); out.push(255, 0);
    out.push(0x2C); push16(x0); push16(y0); push16(rw); push16(rh); out.push(0x87);
    for (let i = 0; i < 256; i++) { const c = pal[i] || [0, 0, 0]; out.push(c[0], c[1], c[2]); }
    moLzw(idx, out);
    prev = d; progress((f + 1) / n);
    if (f % 4 === 3) await new Promise(r => setTimeout(r, 0));
  }
  out.push(0x3B);
  return new Blob([new Uint8Array(out)], { type: "image/gif" });
}

/* ---- animated SVG: the stage is sampled frame by frame; every attribute that changes becomes a SMIL <animate>,
   transforms become a chain of <animateTransform> (translate, rotate, skewY, scale), keys thinned where linear ---- */
function moThin(vals, eps) {
  const n = vals.length, keep = [0]; let a = 0;
  for (let i = 1; i < n - 1; i++) { const b = i + 1; let ok = true;
    for (let j = a + 1; j < b && ok; j++) { const u = (j - a) / (b - a); for (let c = 0; c < vals[j].length; c++) if (Math.abs(vals[a][c] + (vals[b][c] - vals[a][c]) * u - vals[j][c]) > eps) { ok = false; break; } }
    if (!ok) { keep.push(i); a = i; } }
  keep.push(n - 1); return keep;
}
function moExportSVG(o) {
  const { W, H, bg, vb } = o, fps = o.fps || 24, D = motion.dur, n = Math.max(2, Math.round(D * fps) + 1), loop = motion.loop;
  MO.exporting = true; moBuild();
  const svg = moEl("moSvg"), SEL = "g[data-mo],g[data-b],path[data-tr],feDisplacementMap,feGaussianBlur,clipPath rect,linearGradient,g[data-scene]";
  const ATTRS = ["opacity", "x", "y", "width", "height", "scale", "stdDeviation", "stroke-dashoffset", "x1", "x2"];
  const els = [...svg.querySelectorAll(SEL)], rec = els.map(() => ({})), tr = {}, ids = Object.keys(MO.groups).concat(MO.scene ? [MO_SCENE] : []);
  ids.forEach(id => { tr[id] = []; });
  for (let i = 0; i < n; i++) {
    const t = Math.min(D, i / (n - 1) * D); moRender(t); const st = moState(t);
    els.forEach((el, k) => { for (const a of ATTRS) { const v = el.getAttribute(a); if (v === null || isNaN(+v)) continue; (rec[k][a] || (rec[k][a] = [])).push(+v); } });
    ids.forEach(id => { const s = st[id] || moRest(), c = id === MO_SCENE ? MO.c : { x: MO.info[id].cx, y: MO.info[id].cy };
      tr[id].push([[s.x + c.x, s.y + c.y], [s.r], [s.ky], [s.s * s.sx, s.s]]); });
  }
  moRender(0);
  const doc = svg.cloneNode(true), cl = [...doc.querySelectorAll(SEL)], NS = "http://www.w3.org/2000/svg";
  const timing = (keep) => `dur="${moNum(D).replace(",", ".")}s" ${loop ? 'repeatCount="indefinite"' : 'fill="freeze"'} keyTimes="${keep.map(i => Math.round(i / (n - 1) * 1e4) / 1e4).join(";")}"`;
  const anim = (el, tag, attrs) => { const a = document.createElementNS(NS, tag); for (const k in attrs) a.setAttribute(k, attrs[k]); el.appendChild(a); };
  const add = (el, name, vals, eps, extra) => {
    const v = vals.map(x => Array.isArray(x) ? x : [x]); if (v.every(x => x.every((c, j) => Math.abs(c - v[0][j]) < 1e-6))) return false;
    const keep = moThin(v, eps), m = /dur="([^"]+)" (\S+) keyTimes="([^"]+)"/.exec(timing(keep));
    anim(el, extra ? "animateTransform" : "animate", Object.assign({ attributeName: name, values: keep.map(i => v[i].map(c => Math.round(c * 1000) / 1000).join(" ")).join(";"), keyTimes: m[3], dur: m[1] },
      loop ? { repeatCount: "indefinite" } : { fill: "freeze" }, extra || {}));
    return true;
  };
  cl.forEach((el, k) => { for (const a in rec[k]) { const v = rec[k][a]; if (v.length === n) add(el, a, v, a === "opacity" ? .004 : .02); } });
  // transforms: the live transform attribute is replaced by animateTransform; the layer is first moved to its centre
  const byId = {}; doc.querySelectorAll("g[data-mo]").forEach(g => { byId[g.getAttribute("data-mo")] = g; });
  const sc = doc.querySelector("g[data-scene]"); if (sc) byId[MO_SCENE] = sc;
  ids.forEach(id => { const g = byId[id], T = tr[id]; if (!g) return; g.removeAttribute("transform");
    const idle = T.every(f => Math.abs(f[1][0]) < 1e-6 && Math.abs(f[2][0]) < 1e-6 && Math.abs(f[3][0] - 1) < 1e-6 && Math.abs(f[3][1] - 1) < 1e-6 && Math.abs(f[0][0] - T[0][0][0]) < 1e-6 && Math.abs(f[0][1] - T[0][0][1]) < 1e-6)
      && Math.abs(T[0][0][0] - (id === MO_SCENE ? MO.c.x : MO.info[id].cx)) < 1e-6 && Math.abs(T[0][0][1] - (id === MO_SCENE ? MO.c.y : MO.info[id].cy)) < 1e-6;
    if (idle) return;
    const c = id === MO_SCENE ? MO.c : { x: MO.info[id].cx, y: MO.info[id].cy }, inner = document.createElementNS(NS, "g");
    inner.setAttribute("transform", `translate(${r2(-c.x)} ${r2(-c.y)})`);
    [...g.childNodes].filter(ch => !(ch.localName === "animate" || ch.localName === "animateTransform")).forEach(ch => inner.appendChild(ch));
    g.insertBefore(inner, g.firstChild);
    [["translate", 0, .02], ["rotate", 1, .05], ["skewY", 2, .02], ["scale", 3, .0005]].forEach(([type, j, eps]) => {
      const vals = T.map(f => f[j]);
      if (!add(g, "transform", vals, eps, { type, additive: "sum" })) anim(g, "animateTransform", { attributeName: "transform", type, additive: "sum", values: vals[0].map(v => Math.round(v * 1000) / 1000).join(" "), dur: moNum(D).replace(",", ".") + "s", fill: "freeze" }); });
  });
  doc.querySelectorAll("g[data-selbox]").forEach(e => e.remove());
  doc.querySelectorAll("*").forEach(e => { for (const a of [...e.attributes]) if (a.name.startsWith("data-")) e.removeAttribute(a.name); });
  doc.removeAttribute("id"); doc.removeAttribute("preserveAspectRatio");
  doc.setAttribute("viewBox", `${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}`); doc.setAttribute("width", W); doc.setAttribute("height", H);
  const title = document.createElementNS(NS, "title"); title.textContent = brandLabel() + " — animation"; doc.insertBefore(title, doc.firstChild);
  if (bg) { const r = document.createElementNS(NS, "rect"); r.setAttribute("x", r2(vb.x - vb.w)); r.setAttribute("y", r2(vb.y - vb.h)); r.setAttribute("width", r2(vb.w * 3)); r.setAttribute("height", r2(vb.h * 3)); r.setAttribute("fill", bg); doc.insertBefore(r, title.nextSibling); }
  MO.exporting = false; moBuild();
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc).replace(/ xmlns:xlink="[^"]*"/, "");
}

/* ---- export dialog ---- */
(function moExInit() {
  const d = document.createElement("dialog"); d.id = "moExDlg"; d.className = "moexdlg"; d.setAttribute("aria-labelledby", "moExTitle");
  d.innerHTML = `<h2 id="moExTitle" data-info="mo-export">Exporter l'animation</h2>
<div class="moex-fmts" role="radiogroup" aria-label="Format">${Object.entries(MO_FORMATS).map(([k, f], i) => `<label><input type="radio" name="moexf" value="${k}"${i ? "" : " checked"}><span><b>${f.n}</b><small>${f.d}</small></span></label>`).join("")}</div>
<div class="moex-row"><label>Cadre <select id="moExAsp">${Object.entries(MO_ASPECTS).map(([k, a]) => `<option value="${k}">${a[2]}</option>`).join("")}</select></label>
<label>Taille <select id="moExSize"></select></label><label>Images/s <select id="moExFps"></select></label>
<label>Fond <select id="moExBg"><option value="#FFFFFF">Blanc</option><option value="#F4F4F2">Crème</option><option value="#1D1D1F">Nuit</option><option value="custom">Couleur…</option><option value="">Transparent</option></select> <input type="color" id="moExCol" value="#FFFFFF" hidden aria-label="Couleur du fond"></label></div>
<p class="moex-info" id="moExInfo"></p>
<progress id="moExProg" max="1" value="0" hidden></progress>
<p class="moex-msg" id="moExMsg" role="status"></p>
<div class="moex-btns"><button id="moExCancel">Fermer</button><button id="moExGo" class="primary">Exporter</button></div>`;
  document.body.appendChild(d);
  const css = document.createElement("style");
  css.textContent = `.moexdlg{width:min(560px,94vw);border:1px solid var(--line);border-radius:16px;padding:22px 24px;background:var(--paper);color:var(--ink)}
.moexdlg::backdrop{background:rgba(20,20,25,.35)}
.moexdlg h2{font-size:22px;margin:0 0 14px}
.moex-fmts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.moex-fmts label{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:9px 10px;cursor:pointer;background:#fff}
.moex-fmts label:has(input:checked){border-color:var(--night);box-shadow:0 0 0 1px var(--night)}
.moex-fmts label:has(input:disabled){opacity:.45;cursor:not-allowed}
.moex-fmts span{display:flex;flex-direction:column;gap:2px;font-size:13px}.moex-fmts small{color:var(--muted);font-size:11.5px;line-height:1.3}
.moex-row{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;font-size:13px}
.moex-row label{display:flex;flex-direction:column;gap:4px}.moex-row select{font-size:13px}
.moex-info,.moex-msg{font-size:12.5px;color:var(--muted);margin:12px 0 0;min-height:1em}
.moexdlg progress{width:100%;margin-top:10px}
.moex-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
@media (max-width:520px){ .moex-fmts,.moex-row{grid-template-columns:1fr} }`;
  document.head.appendChild(css);
  const fmt = () => d.querySelector("input[name=moexf]:checked").value;
  const refresh = () => {
    const f = fmt(), sz = moEl("moExSize"), fp = moEl("moExFps"), keepS = sz.value, keepF = fp.value;
    sz.innerHTML = (f === "gif" ? [[360, "Petit (360 px)"], [480, "Moyen (480 px)"], [600, "Grand (600 px)"]] : f === "svg" ? [[1080, "Vectoriel (net à toute taille)"]] : [[720, "720p"], [1080, "1080p (Full HD)"], [1440, "1440p"]])
      .map(([v, n]) => `<option value="${v}">${n}</option>`).join("");
    if ([...sz.options].some(o => o.value === keepS)) sz.value = keepS; else sz.value = f === "gif" ? "480" : "1080";
    fp.innerHTML = (f === "gif" ? [10, 15, 20, 25] : f === "svg" ? [24, 30] : [24, 25, 30, 50, 60]).map(v => `<option>${v}</option>`).join("");
    if ([...fp.options].some(o => o.value === keepF)) fp.value = keepF; else fp.value = f === "gif" ? "20" : f === "svg" ? "24" : "30";
    const tr = moEl("moExBg").querySelector('option[value=""]'); tr.disabled = f !== "svg"; if (tr.disabled && moEl("moExBg").value === "") moEl("moExBg").value = "#FFFFFF";
    moEl("moExCol").hidden = moEl("moExBg").value !== "custom";
    const { W, H } = moDims(moEl("moExAsp").value, +sz.value);
    const hasSnd = motion.audio.on && motion.audio.clips.length;
    for (const id of ["moExAsp", "moExSize", "moExFps", "moExBg"]) moEl(id).closest("label").hidden = f === "wav";
    moEl("moExInfo").textContent = f === "wav" ? `La bande son seule, ${moNum(motion.dur)} s, 48 kHz stéréo.` + (hasSnd ? "" : " Il n'y a pas encore de son.")
      : (f === "svg" ? "Animation SVG native (SMIL), sans son ; idéale pour un site. " : `${W} × ${H} px, ${moFrames(+fp.value)} images. `)
      + (f === "gif" ? "Le GIF n'a pas de son." : f === "svg" ? "" : hasSnd ? "Avec la bande son." : "Sans son (aucun son dans l'animation).");
  };
  d.addEventListener("change", e => { if (e.target.id === "moExBg") moEl("moExCol").hidden = e.target.value !== "custom"; refresh(); });
  moEl("moExCancel").onclick = () => { if (MO.exBusy) { MO.exCancel = true; return; } d.close(); };
  d.addEventListener("cancel", e => { if (MO.exBusy) { e.preventDefault(); MO.exCancel = true; } });
  moEl("moExGo").onclick = async () => {
    const f = fmt(), asp = moEl("moExAsp").value, short = +moEl("moExSize").value, fps = +moEl("moExFps").value;
    const bgSel = moEl("moExBg").value, bg = bgSel === "custom" ? moEl("moExCol").value : bgSel;
    const [a, b] = moAsp(asp), vb = moViewBox(a / b), { W, H } = f === "svg" ? moDims(asp, 900) : moDims(asp, short);
    const msg = moEl("moExMsg"), prog = moEl("moExProg"), go = moEl("moExGo");
    MO.exBusy = true; MO.exCancel = false; go.disabled = true; moEl("moExCancel").textContent = "Annuler"; prog.hidden = false; prog.value = 0; msg.textContent = "Préparation…";
    moPlay(false); MO.exporting = true; moSelBoxes(); const t0 = MO.t, started = performance.now();
    try {
      let blob;
      const step = p => { prog.value = p; const el = (performance.now() - started) / 1000, left = p > .05 ? el / p - el : 0; msg.textContent = `Image ${Math.round(p * moFrames(fps))} / ${moFrames(fps)}` + (left > 2 ? ` · environ ${Math.ceil(left)} s` : ""); };
      if (f === "wav") { msg.textContent = "Calcul du son…"; const buf = await moRenderAudio(); if (!buf) throw new Error("nosound"); blob = moWav(buf); prog.value = 1; }
      else if (f === "svg") { msg.textContent = "Calcul des images…"; await new Promise(r => setTimeout(r, 20)); blob = new Blob([moExportSVG({ W, H, bg, vb, fps })], { type: "image/svg+xml" }); prog.value = 1; }
      else if (f === "gif") blob = await moEncodeGif({ W, H, fps, bg, vb }, step);
      else blob = await moEncodeVideo(f, { W, H, fps, bg, vb }, step);
      const name = filePfx() + "-animation" + (asp === "16:9" || asp === "plan" ? "" : "-" + asp.replace(":", "x")) + "." + MO_FORMATS[f].ext;
      await saveBlob(name, blob);
      msg.textContent = (f === "mp4" || f === "webm" ? (MO.exAudio ? (f === "mp4" && MO.exAudio === "opus" ? "Avec le son (en Opus : certains anciens lecteurs Apple ne le lisent pas ; WebM est une alternative). " : "Avec le son. ") : motion.audio.on && motion.audio.clips.length ? "Sans le son (ce navigateur ne sait pas l'encoder). " : "") : "") + `Enregistré : ${name} (${blob.size > 1048576 ? (Math.round(blob.size / 104857.6) / 10).toString().replace(".", ",") + " Mo" : Math.max(1, Math.round(blob.size / 1024)) + " Ko"})`;
    } catch (err) {
      msg.textContent = err && err.message === "nosound" ? "Aucun son à exporter : générez la bande son ou ajoutez des sons." : err && err.message === "cancel" ? "Export annulé." : err && err.message === "codec" ? `Ce navigateur ne sait pas encoder en ${MO_FORMATS[f].n}. Essayez ${f === "mp4" ? "WebM" : "MP4"}, le GIF ou le SVG animé, ou un navigateur récent (Chrome, Edge, Safari, Firefox).`
        : "Export impossible : " + ((err && err.message) || err);
    } finally {
      MO.exBusy = false; MO.exporting = false; go.disabled = false; moEl("moExCancel").textContent = "Fermer"; prog.hidden = true; moBuild(); moSeek(t0);
    }
  };
  MO.exRefresh = async () => {
    refresh();
    const ok = typeof VideoEncoder !== "undefined";
    for (const k of ["mp4", "webm"]) { const inp = d.querySelector(`input[value=${k}]`); inp.disabled = !ok || !(await moVideoConfig(k, 1280, 720, 30));
      if (inp.disabled && inp.checked) { d.querySelector("input[value=gif]").checked = true; refresh(); } }
  };
})();
function openMotionExport() { if (!moVisible().length) { toast("Le projet ne contient aucun calque visible."); return; } moPlay(false); moEl("moExMsg").textContent = "";
  const sel = moEl("moExAsp"), keep = sel.value;
  sel.innerHTML = (planFrame ? `<option value="plan">${esc(moAsp("plan")[2])}</option>` : "") + Object.entries(MO_ASPECTS).map(([k, a]) => `<option value="${k}">${a[2]}</option>`).join("");
  sel.value = planFrame ? "plan" : ([...sel.options].some(o => o.value === keep) ? keep : "16:9");
  moEl("moExDlg").showModal(); MO.exRefresh(); }


/* ---------- Sound (step 6) ----------
   Two banks: the workshop's own sounds, synthesised in the browser (no rights issue), and « Mes sons », imported by the
   user and kept on this device only (IndexedDB "atelier-sons", never sent anywhere). A generator places sounds on the
   animation's key moments, aligning each sound's loudest instant (its peak) on the moment. The track is edited on the
   timeline and in cards; master effects run on Web Audio. The same graph renders offline for the exports. */
const MO_SR = 48000;
function moAudioDefault() { return { on: true, vol: .9, fx: { rev: 15, echo: 0, filt: 0, lo: 0, mid: 0, hi: 0, comp: true }, clips: [] }; }
const MO_SND_CATS = { whoosh: "Souffles", impact: "Impacts", riser: "Montées", reverse: "Inversés", chime: "Carillons", pop: "Clics et pops", ambient: "Nappes", autre: "Autres" };
function moSndGuess(path) {
  const p = String(path).toLowerCase();
  if (/riser|build ?up|wildfire|tremolo|mont[ée]e/.test(p)) return "riser";
  if (/reverse|invers/.test(p)) return "reverse";
  if (/whoosh|swoosh|swish|swipe|transition|whip|souffle/.test(p)) return "whoosh";
  if (/impact|hit|boom|bang|thump|drop|crash|slam|punch|coup/.test(p)) return "impact";
  if (/chime|success|bell|ding|sparkle|shimmer|notification|achievement|carillon|cloche/.test(p)) return "chime";
  if (/click|pop|button|\bui\b|shutter|camera|tap|type|clic/.test(p)) return "pop";
  if (/ambien|pad|drone|atmos|nappe/.test(p)) return "ambient";
  return "autre";
}
function moNoise(ctx, dur, seed) {
  const n = Math.max(1, Math.ceil(dur * ctx.sampleRate)), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let h = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; d[i] = ((h >>> 0) / 4294967296) * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = b; return s;
}
const moEnv = (ctx, pts) => { const g = ctx.createGain(); g.gain.setValueAtTime(pts[0][1], 0); for (let i = 1; i < pts.length; i++) { const [t, v, k] = pts[i]; if (k === "x") g.gain.exponentialRampToValueAtTime(Math.max(v, 1e-4), t); else g.gain.linearRampToValueAtTime(v, t); } return g; };
const moOsc = (ctx, type, f0, f1, t1) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, 0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t1); return o; };
/* the workshop's own sounds: each one is a small Web Audio patch rendered once (d duration, pk peak, s) */
const MO_SYNTH = {
  souffle: { n: "Souffle", cat: "whoosh", d: 1, pk: .5, make(c) { const s = moNoise(c, 1, 7), f = c.createBiquadFilter(), p = c.createStereoPanner(); f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(300, 0); f.frequency.exponentialRampToValueAtTime(3200, .5); f.frequency.exponentialRampToValueAtTime(500, 1);
    p.pan.setValueAtTime(-.6, 0); p.pan.linearRampToValueAtTime(.6, 1);
    s.connect(f).connect(moEnv(c, [[0, 0], [.5, .9], [1, .001, "x"]])).connect(p).connect(c.destination); s.start(0); } },
  "souffle-grave": { n: "Souffle grave", cat: "whoosh", d: 1.5, pk: .8, make(c) { const s = moNoise(c, 1.5, 11), f = c.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 4;
    f.frequency.setValueAtTime(150, 0); f.frequency.exponentialRampToValueAtTime(1400, .8); f.frequency.exponentialRampToValueAtTime(200, 1.5);
    s.connect(f).connect(moEnv(c, [[0, 0], [.8, 1], [1.5, .001, "x"]])).connect(c.destination); s.start(0); } },
  impact: { n: "Impact", cat: "impact", d: 1.8, pk: .02, make(c) { const o = moOsc(c, "sine", 140, 40, .6); o.connect(moEnv(c, [[0, 1], [1.8, .001, "x"]])).connect(c.destination); o.start(0);
    const s = moNoise(c, .3, 3), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; s.connect(f).connect(moEnv(c, [[0, .8], [.25, .001, "x"]])).connect(c.destination); s.start(0); } },
  "impact-doux": { n: "Impact doux", cat: "impact", d: .9, pk: .01, make(c) { const o = moOsc(c, "triangle", 320, 150, .3); o.connect(moEnv(c, [[0, .6], [.9, .001, "x"]])).connect(c.destination); o.start(0); } },
  basse: { n: "Basse qui tombe", cat: "impact", d: 2.2, pk: .05, make(c) { const o = moOsc(c, "sine", 110, 32, 1.8); o.connect(moEnv(c, [[0, 0], [.05, 1], [2.2, .001, "x"]])).connect(c.destination); o.start(0); } },
  montee: { n: "Montée", cat: "riser", d: 2.5, pk: 2.35, make(c) { const s = moNoise(c, 2.5, 5), f = c.createBiquadFilter(); f.type = "highpass";
    f.frequency.setValueAtTime(400, 0); f.frequency.exponentialRampToValueAtTime(6000, 2.35); s.connect(f).connect(moEnv(c, [[0, .001], [2.35, .7, "x"], [2.45, .001, "x"]])).connect(c.destination); s.start(0);
    const o = moOsc(c, "sawtooth", 160, 900, 2.35), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200; o.connect(lp).connect(moEnv(c, [[0, .001], [2.35, .25, "x"], [2.45, .001, "x"]])).connect(c.destination); o.start(0); } },
  inverse: { n: "Souffle inversé", cat: "reverse", d: 1.3, pk: 1.2, make(c) { const s = moNoise(c, 1.3, 9), f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(500, 0); f.frequency.exponentialRampToValueAtTime(5000, 1.2);
    s.connect(f).connect(moEnv(c, [[0, .001], [1.2, .8, "x"], [1.28, .001, "x"]])).connect(c.destination); s.start(0); } },
  carillon: { n: "Carillon", cat: "chime", d: 2.4, pk: .02, make(c) { [[1046.5, .35, 2.2], [1568, .22, 1.6], [2093, .16, 1.2], [3136, .08, .8]].forEach(([fq, a, dd]) => {
    const o = moOsc(c, "sine", fq); o.connect(moEnv(c, [[0, 0], [.01, a], [dd, .001, "x"]])).connect(c.destination); o.start(0); }); } },
  scintillement: { n: "Scintillement", cat: "chime", d: 1.6, pk: .32, make(c) { [[0, 2349], [.12, 2794], [.22, 3136], [.32, 3520], [.45, 4186], [.6, 3520]].forEach(([t, fq], i) => {
    const o = moOsc(c, "sine", fq), g = c.createGain(); g.gain.setValueAtTime(0, 0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18 - i * .015, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + .9);
    o.connect(g).connect(c.destination); o.start(0); }); } },
  pop: { n: "Pop", cat: "pop", d: .2, pk: .005, make(c) { const o = moOsc(c, "sine", 720, 260, .08); o.connect(moEnv(c, [[0, .7], [.18, .001, "x"]])).connect(c.destination); o.start(0); } },
  clic: { n: "Clic", cat: "pop", d: .06, pk: .002, make(c) { const s = moNoise(c, .06, 13), f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2500; s.connect(f).connect(moEnv(c, [[0, .6], [.02, .001, "x"]])).connect(c.destination); s.start(0); } },
  touche: { n: "Touche de machine", cat: "pop", d: .12, pk: .003, make(c) { const s = moNoise(c, .12, 17), f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 2;
    s.connect(f).connect(moEnv(c, [[0, .8], [.03, .001, "x"]])).connect(c.destination); s.start(0); const o = moOsc(c, "sine", 180, 90, .06); o.connect(moEnv(c, [[0, .4], [.1, .001, "x"]])).connect(c.destination); o.start(0); } },
  nappe: { n: "Nappe douce", cat: "ambient", d: 4, pk: 2, make(c) { [220, 277.2, 329.6].forEach((fq, i) => { const o = moOsc(c, "triangle", fq), lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    o.connect(lp).connect(moEnv(c, [[0, 0], [2, .12 - i * .02], [4, 0]])).connect(c.destination); o.start(0); }); } },
};
var MO_SND = { bufs: new Map(), meta: new Map(), user: [], live: [], chain: null, ctx: null, loading: new Map() };
Object.entries(MO_SYNTH).forEach(([k, s]) => MO_SND.meta.set("syn:" + k, { id: "syn:" + k, n: s.n, cat: s.cat, d: s.d, pk: s.pk, g: 0, syn: true }));
const moSndMeta = id => MO_SND.meta.get(id);
const moSndName = id => { const m = moSndMeta(id); return m ? m.n : "Son introuvable sur cet appareil"; };

/* « Mes sons »: meta and data in two stores, so listing never loads the sounds themselves */
function moSdb() { return new Promise((ok, ko) => { try { const r = indexedDB.open("atelier-sons", 1);
  r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" }); if (!d.objectStoreNames.contains("data")) d.createObjectStore("data"); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); }
const moReq = q => new Promise((ok, ko) => { q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); });
async function moSndLoadUser() {
  try { const db = await moSdb(); const list = await moReq(db.transaction("meta").objectStore("meta").getAll()); db.close();
    MO_SND.user = list.filter(m => m && /^u:[0-9a-f]{8,40}$/.test(m.id)).sort((a, b) => a.n.localeCompare(b.n, "fr"));
    MO_SND.user.forEach(m => MO_SND.meta.set(m.id, m)); } catch (_) { MO_SND.user = []; }
}
async function moSndBuffer(id) {
  if (MO_SND.bufs.has(id)) return MO_SND.bufs.get(id);
  if (MO_SND.loading.has(id)) return MO_SND.loading.get(id);
  const job = (async () => {
    let buf = null;
    if (id.startsWith("syn:")) { const s = MO_SYNTH[id.slice(4)]; if (!s) return null; const c = new OfflineAudioContext(2, Math.ceil(s.d * MO_SR), MO_SR); s.make(c); buf = await c.startRendering(); }
    else { const db = await moSdb(); const data = await moReq(db.transaction("data").objectStore("data").get(id)); db.close(); if (!data) return null;
      buf = await new OfflineAudioContext(2, 1, MO_SR).decodeAudioData(data.slice(0)); }
    MO_SND.bufs.set(id, buf); return buf;
  })().catch(() => null).finally(() => MO_SND.loading.delete(id));
  MO_SND.loading.set(id, job); return job;
}
const moSndPreload = () => Promise.all([...new Set(motion.audio.clips.map(c => c.s))].map(moSndBuffer));
/* loudest 50 ms window: its time is the peak, its level sets a gain that brings every sound to about -14 dBFS */
function moAnalyse(buf) {
  const n = buf.length, w = Math.max(1, Math.round(buf.sampleRate * .05)), a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a; let best = 0, bi = 0;
  for (let i = 0; i < n; i += w) { let s = 0; const e = Math.min(n, i + w); for (let j = i; j < e; j++) { const v = (a[j] + b[j]) / 2; s += v * v; } const r = Math.sqrt(s / (e - i)); if (r > best) { best = r; bi = i; } }
  const db = 20 * Math.log10(best || 1e-6);
  return { d: r2(buf.duration), pk: r2(Math.min(buf.duration, (bi + w / 2) / buf.sampleRate)), g: r2(moC(-14 - db, -12, 12)) };
}
const MO_SND_EXT = /\.(mp3|wav|wave|ogg|oga|opus|m4a|aac|flac|webm)$/i, MO_SND_MAX = 15 * 1048576, MO_SND_TOTAL = 150 * 1048576, MO_SND_COUNT = 300;
/* secure import: audio extensions only, size limits, zip entries checked before they are read, every file must decode
   as audio (it is never run or shown as anything else), 60 s at most; stored on this device only */
async function moImportSounds(files, report) {
  const items = []; let skipped = 0, total = 0;
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      if (f.size > MO_SND_TOTAL) { skipped++; continue; }
      const JSZip = await loadJSZip(), z = await JSZip.loadAsync(f);
      const entries = Object.values(z.files).filter(e => !e.dir && !/(^|\/)(__MACOSX|\.)/.test(e.name));
      for (const e of entries.slice(0, MO_SND_COUNT)) {
        const size = e._data && e._data.uncompressedSize;
        if (!MO_SND_EXT.test(e.name) || (size && size > MO_SND_MAX) || total > MO_SND_TOTAL) { skipped++; continue; }
        const data = await e.async("arraybuffer"); if (data.byteLength > MO_SND_MAX) { skipped++; continue; }
        total += data.byteLength; items.push({ path: e.name, data });
      }
      skipped += Math.max(0, entries.length - MO_SND_COUNT);
    } else if (MO_SND_EXT.test(f.name) && f.size <= MO_SND_MAX) { total += f.size; items.push({ path: f.name, data: await f.arrayBuffer() }); }
    else skipped++;
  }
  let added = 0; const db = await moSdb();
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; report && report(i + 1, items.length);
    let buf; try { buf = await new OfflineAudioContext(2, 1, MO_SR).decodeAudioData(it.data.slice(0)); } catch (_) { skipped++; continue; }
    if (!buf || buf.duration > 60 || buf.duration < .01) { skipped++; continue; }
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", it.data))).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
    const base = it.path.split("/").pop().replace(/\.[^.]+$/, "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60) || "Son";
    const meta = Object.assign({ id: "u:" + hash, n: base, cat: moSndGuess(it.path), at: Date.now() }, moAnalyse(buf));
    const tx = db.transaction(["meta", "data"], "readwrite"); tx.objectStore("meta").put(meta); tx.objectStore("data").put(it.data, meta.id);
    await new Promise((ok, ko) => { tx.oncomplete = ok; tx.onerror = () => ko(tx.error); });
    MO_SND.bufs.set(meta.id, buf); added++;
  }
  db.close(); await moSndLoadUser();
  return { added, skipped };
}
async function moDeleteSound(id) {
  const db = await moSdb(), tx = db.transaction(["meta", "data"], "readwrite"); tx.objectStore("meta").delete(id); tx.objectStore("data").delete(id);
  await new Promise(ok => { tx.oncomplete = ok; tx.onerror = ok; }); db.close(); MO_SND.bufs.delete(id); MO_SND.meta.delete(id); await moSndLoadUser();
}

/* ---- data ---- */
function validClip(c) {
  return !!c && typeof c === "object" && typeof c.id === "string" && /^[\w-]{1,24}$/.test(c.id) && typeof c.s === "string" && /^(syn:[a-z-]{1,24}|u:[0-9a-f]{8,40})$/.test(c.s)
    && moFin(c.at, 0, MOTION_MAX) && moFin(c.gain, -40, 12) && moFin(c.pitch, -12, 12) && moFin(c.fi, 0, 5) && moFin(c.fo, 0, 5) && moFin(c.cut, 0, 120)
    && (c.len === undefined || c.len === null || moFin(c.len, .02, MOTION_MAX));
}
function validAudio(a) {
  return !!a && typeof a === "object" && typeof a.on === "boolean" && moFin(a.vol, 0, 1.5) && !!a.fx && typeof a.fx === "object"
    && moFin(a.fx.rev, 0, 100) && moFin(a.fx.echo, 0, 100) && moFin(a.fx.filt, -100, 100) && ["lo", "mid", "hi"].every(k => moFin(a.fx[k], -12, 12)) && typeof a.fx.comp === "boolean"
    && Array.isArray(a.clips) && a.clips.length <= 80 && a.clips.every(validClip);
}
/* how long a clip plays on the timeline, and at what rate */
function moClipSpan(c) {
  const m = moSndMeta(c.s), rate = Math.pow(2, (c.pitch || 0) / 12), left = Math.max(.02, ((m ? m.d : 1) - (c.cut || 0)) / rate);
  return { rate, L: c.len ? Math.min(c.len, left) : left, max: left };
}

/* ---- playback graph: EQ (3 bands), filter, compressor, echo and reverb sends, master volume ---- */
function moIR(ctx, sec) { const n = Math.round(sec * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let h = (c + 1) * 99991; for (let i = 0; i < n; i++) { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; d[i] = (((h >>> 0) / 4294967296) * 2 - 1) * Math.pow(1 - i / n, 3); } }
  return b; }
function moChain(ctx) {
  const A = motion.audio, F = A.fx, nodes = [], mk = n => { nodes.push(n); return n; };
  const inp = mk(ctx.createGain());
  const lo = mk(ctx.createBiquadFilter()); lo.type = "lowshelf"; lo.frequency.value = 220; lo.gain.value = F.lo;
  const mid = mk(ctx.createBiquadFilter()); mid.type = "peaking"; mid.frequency.value = 1500; mid.Q.value = .8; mid.gain.value = F.mid;
  const hi = mk(ctx.createBiquadFilter()); hi.type = "highshelf"; hi.frequency.value = 5000; hi.gain.value = F.hi;
  const flt = mk(ctx.createBiquadFilter());
  if (F.filt < 0) { flt.type = "lowpass"; flt.frequency.value = 20000 * Math.pow(300 / 20000, -F.filt / 100); } else { flt.type = "highpass"; flt.frequency.value = 20 * Math.pow(100, F.filt / 100); }
  inp.connect(lo); lo.connect(mid); mid.connect(hi); hi.connect(flt);
  let last = flt;
  if (F.comp) { const k = mk(ctx.createDynamicsCompressor()); k.threshold.value = -20; k.ratio.value = 4; k.attack.value = .005; k.release.value = .2; last.connect(k); last = k; }
  const out = mk(ctx.createGain()); out.gain.value = A.vol; last.connect(out);
  if (F.echo > 0) { const dl = mk(ctx.createDelay(1)), fb = mk(ctx.createGain()), wet = mk(ctx.createGain()); dl.delayTime.value = .28; fb.gain.value = .35; wet.gain.value = F.echo / 100 * .6;
    last.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out); }
  if (F.rev > 0) { const cv = mk(ctx.createConvolver()), wet = mk(ctx.createGain()); cv.buffer = moIR(ctx, 2.4); wet.gain.value = F.rev / 100 * .8; last.connect(cv); cv.connect(wet); wet.connect(out); }
  out.connect(ctx.destination);
  return { inp, nodes };
}
/* schedules every clip that is still to be heard from timeline time `from`, played at context time `when0` */
function moSchedule(ctx, dest, from, when0, live) {
  for (const c of motion.audio.clips) {
    const buf = MO_SND.bufs.get(c.s); if (!buf) continue;
    const { rate, L } = moClipSpan(c), end = c.at + L; if (end <= from + .005) continue;
    const m = moSndMeta(c.s), v = Math.pow(10, ((c.gain || 0) + (m ? m.g : 0)) / 20), a = when0 + (c.at - from);
    const startTL = Math.max(c.at, from), off = startTL - c.at, when = when0 + (startTL - from), fi = c.fi || 0, fo = Math.min(c.fo || 0, L);
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; src.playbackRate.value = rate;
    g.gain.setValueAtTime(fi > 0 && off < fi ? v * off / fi : v, when);
    if (fi > 0 && off < fi) g.gain.linearRampToValueAtTime(v, a + fi);
    if (fo > 0) { const fs = a + L - fo; if (fs > when) g.gain.setValueAtTime(v, fs); g.gain.linearRampToValueAtTime(0, a + L); }
    src.connect(g); g.connect(dest);
    src.start(when, (c.cut || 0) + off * rate, Math.max(.001, (L - off) * rate));
    if (live) live.push(src, g);
  }
}
function moAudioStop() {
  for (const n of MO_SND.live) { try { if (n.stop) n.stop(); n.disconnect(); } catch (_) {} }
  MO_SND.live = [];
  if (MO_SND.chain) { MO_SND.chain.nodes.forEach(n => { try { n.disconnect(); } catch (_) {} }); MO_SND.chain = null; }
}
function moAudioStart(t) {
  moAudioStop();
  if (!motion.audio.on || !motion.audio.clips.length || typeof AudioContext === "undefined") return;
  if (!MO_SND.ctx) { try { MO_SND.ctx = new AudioContext({ sampleRate: MO_SR }); } catch (_) { try { MO_SND.ctx = new AudioContext(); } catch (e) { return; } } }
  const ctx = MO_SND.ctx; if (ctx.state === "suspended") ctx.resume().catch(() => {});
  MO_SND.chain = moChain(ctx); moSchedule(ctx, MO_SND.chain.inp, t, ctx.currentTime + .03, MO_SND.live);
}
/* the soundtrack of the whole animation, rendered offline (exports) */
async function moRenderAudio() {
  if (!motion.audio.on || !motion.audio.clips.length || typeof OfflineAudioContext === "undefined") return null;
  await moSndPreload(); if (!motion.audio.clips.some(c => MO_SND.bufs.get(c.s))) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(motion.dur * MO_SR), MO_SR), ch = moChain(ctx);
  moSchedule(ctx, ch.inp, 0, 0, null);
  return ctx.startRendering();
}
function moWav(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, size = 44 + n * ch * 2, dv = new DataView(new ArrayBuffer(size));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); dv.setUint32(4, size - 8, true); ws(8, "WAVE"); ws(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); ws(36, "data"); dv.setUint32(40, n * ch * 2, true);
  const cs = [...Array(ch)].map((_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, cs[c][i])); dv.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2; }
  return new Blob([dv.buffer], { type: "audio/wav" });
}
/* the soundtrack encoded for a video: AAC (or Opus) in MP4, Opus in WebM */
async function moAudioForVideo(fmt) {
  if (typeof AudioEncoder === "undefined") return null;
  const buf = await moRenderAudio(); if (!buf) return null;
  const tries = fmt === "mp4" ? [["mp4a.40.2", "aac"], ["opus", "opus"]] : [["opus", "A_OPUS"]];
  for (const [codec, mux] of tries) {
    const cfg = { codec, sampleRate: buf.sampleRate, numberOfChannels: 2, bitrate: 160000 };
    try { const s = await AudioEncoder.isConfigSupported(cfg); if (!s || !s.supported) continue; } catch (_) { continue; }
    const chunks = []; let err = null;
    const enc = new AudioEncoder({ output: (c, m) => chunks.push([c, m]), error: e => { err = e; } }); enc.configure(cfg);
    const N = buf.length, F = 960, L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < N; i += F) { const k = Math.min(F, N - i), d = new Float32Array(k * 2); d.set(L.subarray(i, i + k), 0); d.set(R.subarray(i, i + k), k);
      const ad = new AudioData({ format: "f32-planar", sampleRate: buf.sampleRate, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(i / buf.sampleRate * 1e6), data: d }); enc.encode(ad); ad.close(); }
    try { await enc.flush(); enc.close(); } catch (e) { err = e; }
    if (!err && chunks.length) return { mux, chunks, sampleRate: buf.sampleRate };
  }
  return null;
}

/* ---- generator: sounds on the animation's key moments ---- */
const MO_AMB = {
  cinema: { n: "Cinématique", fx: { rev: 25, echo: 0, comp: true } },
  elegant: { n: "Élégante", fx: { rev: 35, echo: 10, comp: true } },
  dynamic: { n: "Dynamique", fx: { rev: 12, echo: 0, comp: true } },
  minimal: { n: "Minimale", fx: { rev: 20, echo: 0, comp: false } },
  tech: { n: "Technologique", fx: { rev: 10, echo: 25, comp: true } },
};
function moMoments() {
  const A = motion.anims, D = motion.dur;
  if (!A.length) { const ends = Object.values(MO.auto).map(p => p.start + p.len), starts = Object.values(MO.auto).map(p => p.start);
    return { first: starts.length ? Math.min(...starts) : 0, climax: ends.length ? Math.min(D, Math.max(...ends)) : D * .7, mark: starts.slice(0, 1), letters: [], outs: [], typing: false }; }
  const ins = A.filter(a => a.k === "in" || a.k === "key"), sweeps = A.filter(a => a.p === "balayage");
  const isText = a => a.k !== "cam" && a.ids.some(id => { const l = layerById(id); return l && l.group === "word"; });
  const climax = sweeps.length ? Math.max(...sweeps.map(moEnd)) : ins.length ? Math.max(...ins.map(moEnd)) : D * .6;
  const letters = []; ins.filter(isText).forEach(a => { const n = MO.ranks[a.id] ? MO.ranks[a.id].n : 1; for (let i = 0; i < n; i++) letters.push(a.at + i * (a.stg || 0)); });
  return { first: ins.length ? Math.min(...ins.map(a => a.at)) : 0, climax: Math.min(D, climax), mark: ins.filter(a => !isText(a)).map(a => a.at).sort((p, q) => p - q),
    letters: letters.sort((p, q) => p - q), outs: A.filter(a => a.k === "out").map(a => a.at), typing: A.some(a => a.p === "machine") };
}
function moGenerate(amb, seed) {
  const M = moMoments(), D = motion.dur, out = [], pool = cat => { const u = MO_SND.user.filter(m => m.cat === cat), s = [...MO_SND.meta.values()].filter(m => m.syn && m.cat === cat); return u.length ? u : s; };
  let k = seed | 0;
  // pref: names to prefer; fit: a condition to prefer (both fall back to the whole category)
  const pick = (cat, pref, fit) => { let p = pool(cat); if (pref) { const q = p.filter(m => pref.test(m.n)); if (q.length) p = q; } if (fit) { const q = p.filter(fit); if (q.length) p = q; } return p.length ? p[(k++) % p.length] : null; };
  const short = m => m.d <= .6, used = {};
  const at = t => m => m.pk <= t + .05;   // the sound fits before the moment, without cutting its start
  // the sound's peak lands on the moment t; two sounds of a kind stay `gap` seconds apart
  const place = (m, t, gain, x = {}, gap = .5) => { if (!m || t < 0 || t > D) return;
    const u = used[m.cat] || (used[m.cat] = []); if (u.some(v => Math.abs(v - t) < gap)) return; u.push(t);
    const at = t - m.pk, cut = at < 0 ? -at : 0;
    out.push(Object.assign({ id: "c" + Math.random().toString(36).slice(2, 8), s: m.id, at: r2(Math.max(0, at)), gain: gain || 0, pitch: 0, fi: 0, fo: 0, cut: r2(cut) }, x)); };
  const every = (list, max) => { if (list.length <= max) return list; const st = list.length / max; return [...Array(max)].map((_, i) => list[Math.floor(i * st)]); };
  const c = M.climax, f = M.first;
  if (amb === "cinema") { const r = pick("riser", null, m => m.pk <= c + .1) || pick("reverse"); if (r) place(r, c, -3, { fi: .3 }); place(pick("impact", /deep|grave|basse|boom|heavy/i), c, 0); place(pick("whoosh", /deep|grave/i, at(Math.max(.15, f + .1))), Math.max(.15, f + .1), -6); M.outs.forEach(t => place(pick("whoosh", null, at(t + .2)), t + .2, -6)); }
  else if (amb === "elegant") { place(pick("whoosh", null, at(Math.max(.15, f + .15))), Math.max(.15, f + .15), -8, { fi: .1 }); place(pick("chime"), c, -4); M.outs.forEach(t => place(pick("whoosh", null, at(t + .2)), t + .2, -9)); }
  else if (amb === "dynamic") { M.mark.slice(0, 3).forEach((t, i) => place(pick("whoosh", null, at(t + .15)), t + .15, -5 - i)); every(M.letters, 8).forEach(t => place(pick("pop", null, short), t + .05, -10, {}, .15)); place(pick("impact"), c, -2); M.outs.forEach(t => place(pick("whoosh", null, at(t + .15)), t + .15, -6)); }
  else if (amb === "minimal") { place(pick("whoosh", null, at(Math.max(.15, f + .15))), Math.max(.15, f + .15), -9); place(pick("impact", /doux|soft|pop/i) || pick("pop"), c, -6); }
  else if (amb === "tech") { const r = pick("riser", /cyber|futur|stutter|mont/i); if (r) place(r, c, -4); place(pick("pop", /ui|clic|click|game/i, short), Math.max(.05, f), -8); every(M.letters, 10).forEach(t => place(pick("pop", /clic|click|ui|touche/i, short), t + .03, -12, {}, .12)); place(pick("impact"), c, -3); }
  if (M.typing && amb !== "minimal") every(M.letters, 16).forEach(t => place(pick("pop", /touche|camera|click|clic|type/i, short), t, -10, {}, .06));
  // nothing may run past the end: fade out what would
  out.forEach(cl => { const { L } = moClipSpan(cl); if (cl.at + L > D) { cl.len = r2(Math.max(.05, D - cl.at)); cl.fo = r2(Math.min(.4, cl.len)); } });
  return out.slice(0, 80);
}
function moApplyGenerated(seed) {
  const amb = moEl("moAmb").value, list = moGenerate(amb, seed);
  if (!list.length) { toast("Aucun son disponible pour cette ambiance."); return; }
  moPush(); motion.audio.clips = list; motion.audio.on = true; Object.assign(motion.audio.fx, MO_AMB[amb].fx); MO.focusClip = null;
  moSndPreload().then(() => { moPanel(); moSave(); moSeek(0); moPlay(true); });
  toast("Bande son « " + MO_AMB[amb].n + " » : " + list.length + " son" + (list.length > 1 ? "s" : "") + " placé" + (list.length > 1 ? "s" : "") + " sur les temps forts.");
}

/* ---- side panel: sound section, clip cards, master effects ---- */
const MO_FX = { rev: ["Réverbération", 0, 100, 1, " %"], echo: ["Écho", 0, 100, 1, " %"], filt: ["Filtre (sourd ← → léger)", -100, 100, 1, ""], lo: ["Graves", -12, 12, .5, " dB"], mid: ["Médiums", -12, 12, .5, " dB"], hi: ["Aigus", -12, 12, .5, " dB"] };
const MO_CLIPF = { at: ["Début", 0, 12, .01, " s"], gain: ["Volume", -24, 6, .5, " dB"], pitch: ["Hauteur (demi-tons)", -12, 12, 1, ""], fi: ["Fondu d'entrée", 0, 2, .05, " s"], fo: ["Fondu de sortie", 0, 2, .05, " s"], cut: ["Coupe au début", 0, 10, .01, " s"], len: ["Durée", .05, 12, .01, " s"] };
function moSndPanel() {
  const A = motion.audio, sec = moEl("moSndSec"); if (!sec) return;
  moEl("moSndOn").checked = A.on; moEl("moSndVol").value = Math.round(A.vol * 100); moEl("moSndVolOut").textContent = Math.round(A.vol * 100) + " %";
  moEl("moFx").innerHTML = Object.entries(MO_FX).map(([k, [n, mi, ma, st, u]]) => `<label class="mo-p"><span>${n}</span><input type="range" data-fx="${k}" min="${mi}" max="${ma}" step="${st}" value="${A.fx[k]}"><output>${moNum(A.fx[k])}${u}</output></label>`).join("")
    + `<label class="chk" style="font-size:12px"><input type="checkbox" data-fx="comp"${A.fx.comp ? " checked" : ""}> Compresseur (son plus homogène)</label>`;
  moEl("moClips").innerHTML = A.clips.length ? A.clips.map(c => { const sp = moClipSpan(c), m = moSndMeta(c.s), v = { at: c.at, gain: c.gain, pitch: c.pitch, fi: c.fi, fo: c.fo, cut: c.cut, len: r2(sp.L) };
    const lim = { at: [0, motion.dur], cut: [0, Math.max(.05, (m ? m.d : 1) - .05)], len: [.05, Math.max(.06, r2(sp.max))] };
    return `<details class="mo-anim mo-clip" data-clip="${c.id}"${MO.focusClip === c.id ? " open" : ""}><summary><span><span class="k">Son</span><br>${esc(moSndName(c.s))}${m ? "" : ` <small style="color:var(--danger)">· manquant</small>`}</span><span class="t">${moNum(c.at)}–${moNum(c.at + sp.L)} s</span></summary><div class="bd">`
      + Object.entries(MO_CLIPF).map(([k, [n, mi, ma, st, u]]) => { const [a0, a1] = lim[k] || [mi, ma]; return `<label class="mo-p"><span>${n}</span><input type="range" data-cl="${c.id}" data-ck="${k}" min="${a0}" max="${a1}" step="${st}" value="${v[k]}"><output>${moNum(v[k])}${u}</output></label>`; }).join("")
      + `<div class="acts"><button data-cact="play" data-cl="${c.id}">${ico("play")}Écouter</button><button data-cact="del" data-cl="${c.id}">Retirer</button></div></div></details>`; }).join("")
    : `<p class="mo-hint">Pas encore de son : « Générer la bande son » place des sons sur les temps forts de l'animation, ou ajoutez-en depuis la banque.</p>`;
}
function moClipSet(c, k, v) {
  const m = moSndMeta(c.s);
  if (k === "at") c.at = r2(moC(v, 0, MOTION_MAX)); else if (k === "gain") c.gain = moC(v, -40, 12); else if (k === "pitch") c.pitch = Math.round(moC(v, -12, 12));
  else if (k === "fi") c.fi = moC(v, 0, 5); else if (k === "fo") c.fo = moC(v, 0, 5); else if (k === "cut") c.cut = r2(moC(v, 0, Math.max(0, (m ? m.d : 1) - .05)));
  else if (k === "len") c.len = r2(moC(v, .05, MOTION_MAX));
}
function moPreviewSound(id, from) {
  moSndBuffer(id).then(buf => { if (!buf) { toast("Son illisible sur cet appareil."); return; }
    if (!MO_SND.ctx) { try { MO_SND.ctx = new AudioContext({ sampleRate: MO_SR }); } catch (_) { MO_SND.ctx = new AudioContext(); } }
    const ctx = MO_SND.ctx; ctx.resume().catch(() => {}); if (MO_SND.prev) { try { MO_SND.prev.stop(); } catch (_) {} }
    const s = ctx.createBufferSource(), g = ctx.createGain(), m = moSndMeta(id); s.buffer = buf; g.gain.value = Math.pow(10, (m ? m.g : 0) / 20) * .9; s.connect(g); g.connect(ctx.destination); s.start(0, from || 0); MO_SND.prev = s; });
}
function moAddClip(id, at) {
  const m = moSndMeta(id); if (!m) return; if (motion.audio.clips.length >= 80) { toast("80 sons au plus par animation."); return; }
  moPush(); const c = { id: "c" + Math.random().toString(36).slice(2, 8), s: id, at: r2(moC(at, 0, Math.max(0, motion.dur - .05))), gain: 0, pitch: 0, fi: 0, fo: 0, cut: 0 };
  motion.audio.clips.push(c); motion.audio.on = true; MO.focusClip = c.id; moSndBuffer(id).then(() => { moPanel(); moSave(); });
}
(function moSndInit() {
  moEl("moAmb").innerHTML = Object.entries(MO_AMB).map(([k, m]) => `<option value="${k}">${m.n}</option>`).join("");
  const side = moEl("moSide");
  side.addEventListener("click", e => {
    const t = e.target.closest("#moGen,#moGen2,#moBankBtn,[data-cact]"); if (!t) return;
    if (t.id === "moGen") { MO.genSeed = 0; moApplyGenerated(0); }
    else if (t.id === "moGen2") { MO.genSeed = (MO.genSeed || 0) + 1; moApplyGenerated(MO.genSeed); }
    else if (t.id === "moBankBtn") openSoundBank();
    else { const c = motion.audio.clips.find(x => x.id === t.dataset.cl); if (!c) return;
      if (t.dataset.cact === "del") { moPush(); motion.audio.clips = motion.audio.clips.filter(x => x !== c); moPanel(); moSave(); }
      else { moPlay(false); moSeek(Math.max(0, c.at - .1)); moPlay(true); } }
  });
  side.addEventListener("input", e => {
    const f = e.target;
    if (f.id === "moSndVol") { if (!MO.pend) MO.pend = moSnap(); motion.audio.vol = moC(+f.value / 100, 0, 1.5); moEl("moSndVolOut").textContent = f.value + " %"; return; }
    if (f.dataset.fx && f.type === "range") { if (!MO.pend) MO.pend = moSnap(); motion.audio.fx[f.dataset.fx] = +f.value; const d = MO_FX[f.dataset.fx]; f.parentNode.querySelector("output").textContent = moNum(+f.value) + d[4]; return; }
    if (f.dataset.cl && f.dataset.ck) { const c = motion.audio.clips.find(x => x.id === f.dataset.cl); if (!c) return; if (!MO.pend) MO.pend = moSnap();
      moClipSet(c, f.dataset.ck, +f.value); f.parentNode.querySelector("output").textContent = moNum(+f.value) + MO_CLIPF[f.dataset.ck][4]; moTl(); }
  });
  side.addEventListener("change", e => {
    const f = e.target;
    if (f.id === "moSndOn") { moPush(); motion.audio.on = f.checked; if (!f.checked) moAudioStop(); moSave(); moTl(); return; }
    if (f.dataset.fx === "comp") { moPush(); motion.audio.fx.comp = f.checked; moSave(); return; }
    if (f.id === "moSndVol" || f.dataset.fx || f.dataset.cl) { if (MO.pend) { MO.undo.push(MO.pend); MO.redo = []; MO.pend = null; moUndoBtns(); } moSave(); if (f.dataset.cl) moSndPanel();
      if (MO.playing) moAudioStart(MO.t); }
  });
  side.addEventListener("toggle", e => { const d = e.target; if (d.classList && d.classList.contains("mo-clip") && d.open) MO.focusClip = d.dataset.clip; }, true);

  // bank dialog: the workshop's sounds and « Mes sons », preview, add at the playhead, import, delete
  const d = document.createElement("dialog"); d.id = "moBankDlg"; d.className = "moexdlg mobank"; d.setAttribute("aria-labelledby", "moBankTitle");
  d.innerHTML = `<h2 id="moBankTitle">Banque de sons</h2>
<div class="mo-tabs" id="moBankTabs" role="group" aria-label="Catégories"></div>
<div class="mobank-list" id="moBankList"></div>
<div class="mobank-imp"><h3>Importer mes sons</h3>
<p>Fichiers MP3, WAV, OGG, M4A, FLAC ou un dossier zippé (.zip). 15 Mo par son, 60 secondes au plus. Ils restent sur cet appareil : ils ne sont envoyés nulle part et ne sont pas partagés.</p>
<label class="mobank-rights"><input type="checkbox" id="moRights"><span>Je détiens les droits sur ces sons, ou leur licence m'autorise à les utiliser dans mes créations. Je n'importe pas d'œuvre protégée sans l'autorisation de ses ayants droit (<a href="https://atelier-du-logo.johnapplewan.workers.dev/cgu/" target="_blank" rel="noopener">conditions d'utilisation</a>).</span></label>
<div class="row"><button id="moImpBtn" class="primary" disabled>Choisir des fichiers…</button><input type="file" id="moImpIn" accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm,.zip" multiple hidden></div>
<p class="moex-msg" id="moImpMsg" role="status"></p></div>
<div class="moex-btns"><button id="moBankClose">Fermer</button></div>`;
  document.body.appendChild(d);
  const css = document.createElement("style");
  css.textContent = `.mobank{width:min(640px,96vw)} .mobank-list{max-height:min(44vh,380px);overflow:auto;border:1px solid var(--line);border-radius:10px;background:#fff}
.mobank-list .it{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--cream);font-size:13px}
.mobank-list .it:last-child{border-bottom:0} .mobank-list .it .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mobank-list .it small{color:var(--muted);font-variant-numeric:tabular-nums} .mobank-list .it button{font-size:12px;padding:3px 8px}
.mobank-list h4{margin:0;padding:8px 10px 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);background:var(--paper)}
.mobank-imp{margin-top:14px;font-size:12.5px} .mobank-imp h3{font-size:14px;margin:0 0 4px} .mobank-imp p{margin:0 0 8px;color:var(--muted)}
.mobank-rights{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.4;margin-bottom:8px;cursor:pointer} .mobank-rights input{margin-top:3px;flex:none}
#moBankTabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px} #moBankTabs button{font-size:12px;padding:4px 9px} #moBankTabs button[aria-pressed=true]{background:var(--night);color:#fff;border-color:var(--night)}`;
  document.head.appendChild(css);
  try { moEl("moRights").checked = localStorage.getItem("atelier-logo-sons-droits") === "1"; } catch (_) {}
  moEl("moImpBtn").disabled = !moEl("moRights").checked;
  moEl("moRights").onchange = e => { moEl("moImpBtn").disabled = !e.target.checked; try { localStorage.setItem("atelier-logo-sons-droits", e.target.checked ? "1" : "0"); } catch (_) {} };
  moEl("moImpBtn").onclick = () => moEl("moImpIn").click();
  moEl("moImpIn").onchange = async e => {
    const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
    if (!moEl("moRights").checked) { moEl("moImpMsg").textContent = "Cochez d'abord la case sur les droits."; return; }
    moEl("moImpMsg").textContent = "Lecture des fichiers…";
    try { const r = await moImportSounds(files, (i, n) => { moEl("moImpMsg").textContent = `Analyse ${i} / ${n}…`; });
      moEl("moImpMsg").textContent = `${r.added} son${r.added > 1 ? "s" : ""} ajouté${r.added > 1 ? "s" : ""} à « Mes sons »` + (r.skipped ? `, ${r.skipped} fichier${r.skipped > 1 ? "s" : ""} ignoré${r.skipped > 1 ? "s" : ""} (format, taille, durée ou fichier illisible).` : ".");
      MO.bankTab = "mes"; moBankRender(); }
    catch (err) { moEl("moImpMsg").textContent = "Import impossible : " + ((err && err.message) || err); }
  };
  moEl("moBankClose").onclick = () => d.close();
  d.addEventListener("click", e => {
    const tab = e.target.closest("[data-btab]"), b = e.target.closest("[data-bact]");
    if (tab) { MO.bankTab = tab.dataset.btab; moBankRender(); return; }
    if (!b) return; const id = b.dataset.id;
    if (b.dataset.bact === "play") moPreviewSound(id);
    else if (b.dataset.bact === "add") { moAddClip(id, MO.t); moEl("moImpMsg").textContent = "« " + moSndName(id) + " » ajouté à " + moNum(MO.t) + " s."; }
    else if (b.dataset.bact === "del") confirmBox("Supprimer ce son de l'appareil ?", "« " + moSndName(id) + " » sera retiré de « Mes sons ». Les animations qui l'utilisent le marqueront comme manquant.", "Supprimer").then(ok => { if (ok) moDeleteSound(id).then(moBankRender); });
  });
})();
function moBankRender() {
  const tab = MO.bankTab || "tous", tabs = [["tous", "Tous"], ["mes", "Mes sons"], ...Object.entries(MO_SND_CATS)];
  moEl("moBankTabs").innerHTML = tabs.map(([k, n]) => `<button data-btab="${k}" aria-pressed="${k === tab}">${n}</button>`).join("");
  const all = [...MO_SND.user, ...[...MO_SND.meta.values()].filter(m => m.syn)], list = tab === "tous" ? all : tab === "mes" ? MO_SND.user : all.filter(m => m.cat === tab);
  const row = m => `<div class="it"><button data-bact="play" data-id="${esc(m.id)}" aria-label="Écouter ${esc(m.n)}">${ico("play")}</button><span class="n">${esc(m.n)}</span><small>${moNum(m.d)} s</small><button data-bact="add" data-id="${esc(m.id)}">+ Ajouter</button>${m.syn ? "" : `<button data-bact="del" data-id="${esc(m.id)}" aria-label="Supprimer ${esc(m.n)}">${ico("trash")}</button>`}</div>`;
  const mine = list.filter(m => !m.syn), ours = list.filter(m => m.syn);
  moEl("moBankList").innerHTML = (mine.length ? `<h4>Mes sons (sur cet appareil)</h4>${mine.map(row).join("")}` : tab === "mes" ? `<p class="mo-hint" style="padding:10px">Aucun son importé pour l'instant.</p>` : "")
    + (ours.length ? `<h4>Sons de l'atelier (générés)</h4>${ours.map(row).join("")}` : "");
}
async function openSoundBank() { await moSndLoadUser(); moBankRender(); moEl("moImpMsg").textContent = ""; moEl("moBankDlg").showModal(); }

window.__motion = {
  get state() { return { open: MO.open, t: MO.t, playing: MO.playing, motion: clone(motion), sel: [...MO.sel] }; },
  seek: t => { moPlay(false); moSeek(t); }, open: openMotion, close: closeMotion, presets: Object.keys(MO_PRESETS), valid: validMotion,
  renderAudio: () => moRenderAudio(), soundMeta: id => moSndMeta(id), userSounds: () => MO_SND.user.slice(),
  exportSVG: o => moExportSVG(Object.assign({ W: 1600, H: 900, bg: "", vb: moViewBox(16 / 9), fps: 24 }, o || {})),
  stateAt: t => { const s = moState(t); return JSON.parse(JSON.stringify(s)); },
};
