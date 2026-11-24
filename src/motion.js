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
const motionDefault = () => ({ v: 1, dur: 5, loop: true, anims: [] });
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
const MO_TABS = [["in", "Apparition"], ["out", "Disparition"], ["texte", "Texte"], ["mo", "Mouvement"], ["cam", "Caméra"]];

/* ---------- Data ---------- */
const moFin = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
function validAnimOpts(p, o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  return Object.keys(o).every(k => { const d = MO_PARAMS[k]; if (!d || !(k in MO_PRESETS[p].o)) return false;
    return d.opts ? typeof o[k] === "string" && Object.prototype.hasOwnProperty.call(d.opts, o[k]) : moFin(o[k], d.min, d.max); });
}
function validAnim(a) {
  return !!a && typeof a === "object" && typeof a.id === "string" && /^[\w-]{1,24}$/.test(a.id)
    && typeof a.p === "string" && Object.prototype.hasOwnProperty.call(MO_PRESETS, a.p)
    && ["in", "out", "mo", "cam"].includes(a.k)
    && Array.isArray(a.ids) && a.ids.length >= 1 && a.ids.length <= 400 && a.ids.every(i => typeof i === "string" && i.length <= 120)
    && moFin(a.at, 0, MOTION_MAX) && moFin(a.len, .01, MOTION_MAX) && (a.stg === undefined || moFin(a.stg, 0, 2))
    && (a.ease === undefined || (typeof a.ease === "string" && Object.prototype.hasOwnProperty.call(MO_EASES, a.ease)))
    && (a.ord === undefined || (typeof a.ord === "string" && Object.prototype.hasOwnProperty.call(MO_ORDERS, a.ord)))
    && validAnimOpts(a.p, a.o);
}
function validMotion(m) {
  return !!m && typeof m === "object" && m.v === 1 && moFin(m.dur, MOTION_MIN, MOTION_MAX)
    && (m.loop === undefined || typeof m.loop === "boolean")
    && (m.anims === undefined || (Array.isArray(m.anims) && m.anims.length <= MO_MAX_ANIMS && m.anims.every(validAnim)));
}
function motionNow() { return motion ? clone(motion) : motionDefault(); }
function motionLoad(m) {
  motion = validMotion(m) ? { v: 1, dur: m.dur, loop: m.loop !== false, anims: clone(m.anims || []) } : motionDefault();
  if (MO && MO.open) { MO.undo = []; MO.redo = []; moBuild(); moPanel(); }
}

/* ---------- Timing engine ---------- */
var MO = { open: false, t: 0, playing: false, raf: 0, last: 0, auto: {}, ranks: {}, info: {}, S: 1, sel: new Set(), tab: "in", focus: null, undo: [], redo: [], pend: null };
const moRest = () => ({ o: 1, x: 0, y: 0, s: 1, sx: 1, ky: 0, r: 0, blur: 0, liq: 0, draw: null, clip: null });
function moMix(st, q) {
  if (q.o !== undefined) st.o *= q.o; if (q.x) st.x += q.x; if (q.y) st.y += q.y; if (q.s !== undefined) st.s *= q.s;
  if (q.sx !== undefined) st.sx *= q.sx; if (q.ky) st.ky += q.ky; if (q.r) st.r += q.r; if (q.blur) st.blur += q.blur; if (q.liq) st.liq += q.liq;
  if (q.draw !== undefined && q.draw !== null) st.draw = st.draw === null ? q.draw : Math.min(st.draw, q.draw);
  if (q.clip && (!st.clip || q.clip.v < st.clip.v)) st.clip = q.clip;
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
    const P = MO_PRESETS[a.p], E = (MO_EASES[a.ease] || MO_EASES[P.ease]).f, o = Object.assign({}, P.o, a.o);
    const targets = a.k === "cam" ? { r: { [MO_SCENE]: { i: 0, lx: 0 } } } : (MO.ranks[a.id] || { r: {} });
    for (const id in targets.r) {
      const rk = targets.r[id], c = { S: MO.S, lx: rk.lx }, st0 = a.at + rk.i * (a.stg || 0), p = mo01((t - st0) / a.len);
      let q;
      if (a.k === "in" || a.k === "cam") q = P.fn(E(p), o, c);
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
#motion .mo-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:20px}
#motion .mo-frame{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 30px rgba(0,0,0,.06);width:min(100%,calc((100vh - 230px)*16/9));aspect-ratio:16/9;display:flex;overflow:hidden}
#motion .mo-frame svg{width:100%;height:100%;display:block}
#motion .mo-frame g[data-mo]{cursor:pointer}
#motion .mo-bar{display:flex;align-items:center;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--paper)}
#motion .mo-bar button{min-width:36px;height:36px}
#motion .mo-bar input[type=range]{flex:1}
#motion .mo-time{font-variant-numeric:tabular-nums;font-size:13px;min-width:120px;text-align:right;white-space:nowrap}
#motion .mo-note{color:var(--muted);font-size:12px;text-align:center;padding:0 16px 10px}
#motion .mo-side{border-left:1px solid var(--line);background:var(--paper);overflow:auto;padding:14px 16px 24px;display:flex;flex-direction:column;gap:16px}
#motion .mo-side h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 8px;font-weight:600}
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
  #motion .mo-main{flex:none} #motion .mo-stage{padding:10px;flex:none} #motion .mo-frame{width:100%}
  #motion .mo-side{border-left:0;border-top:1px solid var(--line);overflow:visible;flex:none}
  #motion .mo-time{min-width:0} #motion .mo-bar{position:sticky;bottom:0;z-index:2} #motion .mo-bar .chk{display:none}
  #motion .mo-p{grid-template-columns:92px minmax(0,1fr) 48px} #motion .mo-time{white-space:nowrap;font-size:12px} #motion .mo-bar{gap:6px;padding-left:10px;padding-right:10px} #motion .mo-bar button{min-width:32px}
}
@media (prefers-reduced-motion:reduce){ #motion *{transition:none!important} }`;
  document.head.appendChild(css);
  const root = document.createElement("div");
  root.id = "motion"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Motion : animer le logo");
  root.innerHTML = `
<div class="mo-top">
  <button id="moBack" title="Revenir à l'atelier (Échap)">‹ Atelier</button>
  <div><h2>Motion</h2><div class="sub">Animer le logo du projet ouvert</div></div>
  <div class="spacer"></div>
  <button id="moUndo" title="Annuler (Ctrl+Z)" disabled>Annuler</button>
  <button id="moRedo" title="Rétablir (Ctrl+Maj+Z)" disabled>Rétablir</button>
  <label class="mo-dur">Durée <input type="range" id="moDur" min="${MOTION_MIN}" max="${MOTION_MAX}" step="0.5"> <output id="moDurOut"></output></label>
</div>
<div class="mo-body">
  <div class="mo-main">
    <div class="mo-stage"><div class="mo-frame" id="moFrame"><svg id="moSvg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg></div></div>
    <div class="mo-note" id="moNote"></div>
    <div class="mo-bar">
      <button id="moStart" title="Début (Origine)" aria-label="Revenir au début">⏮</button>
      <button id="moPrev" title="Image précédente (←)" aria-label="Image précédente">‹</button>
      <button id="moPlay" class="primary" title="Lecture / pause (Espace)" aria-label="Lecture">▶</button>
      <button id="moNext" title="Image suivante (→)" aria-label="Image suivante">›</button>
      <input type="range" id="moScrub" min="0" step="${1 / MOTION_FPS}" value="0" aria-label="Position dans l'animation">
      <label class="chk"><input type="checkbox" id="moLoop"> Boucle</label>
      <span class="mo-time" id="moTime"></span>
    </div>
  </div>
  <div class="mo-side" id="moSide" role="region" aria-label="Animations">
    <section><h3>Calques</h3>
      <div class="mo-quick"><button data-q="all">Tout</button><button data-q="mark">Symbole</button><button data-q="word">Texte</button><button data-q="none">Aucun</button></div>
      <div class="mo-layers" id="moLayers"></div></section>
    <section><h3>Ajouter une animation</h3>
      <div class="mo-tabs" id="moTabs" role="group" aria-label="Familles d'animations">${MO_TABS.map(([k, n]) => `<button data-tab="${k}" aria-pressed="false">${n}</button>`).join("")}</div>
      <div class="mo-presets" id="moPresets"></div><p class="mo-hint" id="moHint"></p></section>
    <section><h3 id="moListTitle">Animations</h3><div id="moList"></div></section>
  </div>
</div>`;
  document.body.appendChild(root);
  const mb = document.getElementById("motionBtn"); if (mb) mb.onclick = openMotion;

  moEl("moBack").onclick = closeMotion;
  moEl("moUndo").onclick = () => moUndo(false);
  moEl("moRedo").onclick = () => moUndo(true);
  moEl("moPlay").onclick = () => moPlay(!MO.playing);
  moEl("moStart").onclick = () => { moPlay(false); moSeek(0); };
  moEl("moPrev").onclick = () => moStep(-1);
  moEl("moNext").onclick = () => moStep(1);
  moEl("moScrub").oninput = e => { moPlay(false); moSeek(+e.target.value); };
  moEl("moDur").oninput = e => { motion.dur = moC(+e.target.value, MOTION_MIN, MOTION_MAX); moBuild(); moPanel(); moSave(); };
  moEl("moLoop").onchange = e => { motion.loop = e.target.checked; moSave(); };
  moEl("moSvg").addEventListener("click", e => { const g = e.target.closest && e.target.closest("g[data-mo]"); if (!g) return;
    moSelect(g.dataset.mo, e.shiftKey || e.metaKey || e.ctrlKey); });
  const side = moEl("moSide");
  side.addEventListener("click", e => {
    const q = e.target.closest("[data-q]"), tab = e.target.closest("[data-tab]"), pr = e.target.closest("[data-preset]"), act = e.target.closest("[data-act]");
    if (q) { const k = q.dataset.q; MO.sel = new Set(k === "none" ? [] : moVisible().filter(l => k === "all" || l.group === k).map(l => l.id)); moPanel(); moSelBoxes(); }
    else if (tab) { MO.tab = tab.dataset.tab; moPanel(); }
    else if (pr) moAdd(pr.dataset.preset);
    else if (act) { const a = motion.anims.find(x => x.id === act.dataset.id); if (!a) return;
      if (act.dataset.act === "del") { moPush(); motion.anims = motion.anims.filter(x => x !== a); moBuild(); moPanel(); moSave(); }
      else if (act.dataset.act === "play") { moSeek(Math.max(0, a.at - .2)); moPlay(true); }
      else if (act.dataset.act === "sel") { MO.sel = new Set(a.ids.filter(id => MO.info[id])); moPanel(); moSelBoxes(); } }
  });
  side.addEventListener("change", e => {
    const lc = e.target.closest("[data-layer]");
    if (lc) { if (lc.checked) MO.sel.add(lc.dataset.layer); else MO.sel.delete(lc.dataset.layer); moPanel(); moSelBoxes(); return; }
    const f = e.target.closest("[data-k]"); if (!f) return;
    const a = motion.anims.find(x => x.id === f.dataset.a); if (!a) return;
    if (f.tagName === "SELECT") { moPush(); moSet(a, f.dataset.k, f.value); moAfterEdit(a, true); }
    else { if (MO.pend) { MO.undo.push(MO.pend); MO.redo = []; MO.pend = null; moUndoBtns(); } moPanelTimes(); moSave(); }
  });
  side.addEventListener("input", e => {
    const f = e.target.closest("input[type=range][data-k]"); if (!f) return;
    const a = motion.anims.find(x => x.id === f.dataset.a); if (!a) return;
    if (!MO.pend) MO.pend = JSON.stringify(motion.anims);
    moSet(a, f.dataset.k, +f.value); const out = f.parentNode.querySelector("output"); if (out) out.textContent = moShow(f.dataset.k, +f.value);
    moAfterEdit(a, false);
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
function moPush() { MO.undo.push(JSON.stringify(motion.anims)); if (MO.undo.length > 60) MO.undo.shift(); MO.redo = []; MO.pend = null; moUndoBtns(); }
function moUndo(redo) {
  const from = redo ? MO.redo : MO.undo, to = redo ? MO.undo : MO.redo; if (!from.length) return;
  to.push(JSON.stringify(motion.anims)); motion.anims = JSON.parse(from.pop()); moBuild(); moPanel(); moSave(); moUndoBtns();
}
function moUndoBtns() { moEl("moUndo").disabled = !MO.undo.length; moEl("moRedo").disabled = !MO.redo.length; }
function moShow(k, v) { if (k === "at" || k === "len" || k === "stg") return moNum(v) + " s"; const d = MO_PARAMS[k]; return d ? moNum(v) + d.u : moNum(v); }
function moSet(a, k, v) {
  if (k === "at") a.at = moC(v, 0, MOTION_MAX); else if (k === "len") a.len = moC(v, .01, MOTION_MAX); else if (k === "stg") a.stg = moC(v, 0, 2);
  else if (k === "ease") { if (MO_EASES[v]) a.ease = v; } else if (k === "ord") { if (MO_ORDERS[v]) a.ord = v; }
  else if (MO_PARAMS[k]) { const d = MO_PARAMS[k]; a.o[k] = d.opts ? (d.opts[v] ? v : a.o[k]) : moC(v, d.min, d.max); }
}
function moAfterEdit(a, save) {
  if (MO_PRESETS[a.p].feat === "clip" && a.o.bands) moBuild(); else { MO.ranks[a.id] = a.k === "cam" ? null : moRanks(a); }
  if (!MO.playing) moSeek(MO.t);
  if (save) { moPanel(); moSave(); }
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
    const b = bounds(vis), w = b.x1 - b.x0, h = b.y1 - b.y0, pad = Math.max(w, h) * 0.12;
    MO.S = Math.max(w, h) || 1; MO.c = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
    let vw = w + 2 * pad, vh = h + 2 * pad; if (vw / vh < 16 / 9) vw = vh * 16 / 9; else vh = vw * 9 / 16;
    svg.setAttribute("viewBox", `${r2((b.x0 + b.x1 - vw) / 2)} ${r2((b.y0 + b.y1 - vh) / 2)} ${r2(vw)} ${r2(vh)}`);
    vis.forEach((L, k) => {
      const r = layerSVG(L, { pfx: "mo" }), lb = bounds([L]), nd = need[L.id] || {}, S = Math.max(lb.x1 - lb.x0, lb.y1 - lb.y0) || 1;
      MO.info[L.id] = { k, x0: lb.x0, x1: lb.x1, y0: lb.y0, y1: lb.y1, cx: (lb.x0 + lb.x1) / 2, cy: (lb.y0 + lb.y1) / 2, S, clip: nd.clip || 0, trace: !!nd.trace, filter: !!nd.filter };
      defs += r.defs;
      if (nd.filter) defs += `<filter id="mof-${k}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${r2(3 / S * 100) / 100}" numOctaves="2" seed="${k + 3}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0"/></filter>`;
      if (nd.clip) defs += `<clipPath id="moc-${k}" clipPathUnits="userSpaceOnUse">${"<rect/>".repeat(nd.clip)}</clipPath>`;
      let tr = "";
      if (nd.trace) { const p = paintOf(L), col = typeof p === "string" ? p : (p.c ? p.c[0] : mixHex(p.p.map(q => q.c)));
        tr = `<path data-tr d="${pathD(L.subs, !!L.open)}" pathLength="1" fill="none" stroke="${col}" stroke-width="${r2(L.open ? (L.sw || 4) : Math.max(.2, Math.min(S * .05, MO.S * .0025)))}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" style="display:none"/>`; }
      body += `<g data-mo="${esc(L.id)}"><g data-c><g data-b>${r.body}</g>${tr}</g></g>`;
    });
  } else { MO.S = 1; MO.c = { x: 80, y: 45 }; svg.setAttribute("viewBox", "0 0 160 90"); }
  svg.innerHTML = (defs ? `<defs>${defs}</defs>` : "") + (body ? `<g data-scene>${body}</g><g data-selbox pointer-events="none"></g>` : `<text x="80" y="47" text-anchor="middle" font-size="6" fill="#6B6B70" font-family="Inter,system-ui,sans-serif">Le projet ne contient encore aucun calque visible.</text>`);
  MO.groups = {}; svg.querySelectorAll("g[data-mo]").forEach(g => { MO.groups[g.dataset.mo] = { g, c: g.firstChild, b: g.firstChild.firstChild, tr: g.querySelector("[data-tr]") }; });
  MO.scene = svg.querySelector("g[data-scene]");
  for (const id of [...MO.sel]) if (!MO.info[id]) MO.sel.delete(id);
  for (const a of motion.anims) if (a.k !== "cam") MO.ranks[a.id] = moRanks(a);
  const dur = moEl("moDur"); dur.value = motion.dur; moEl("moDurOut").textContent = moNum(motion.dur) + " s";
  moEl("moScrub").max = motion.dur; moEl("moLoop").checked = motion.loop;
  moEl("moNote").textContent = motion.anims.length ? "" : "Aperçu automatique : choisissez des calques puis une animation dans le panneau « Ajouter une animation » pour composer la vôtre.";
  moSelBoxes(); moSeek(Math.min(MO.t, motion.dur));
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
      if (s.blur > 0 || s.liq > 0) { f.children[1].setAttribute("scale", r2(s.liq / 100 * inf.S * .25)); f.children[2].setAttribute("stdDeviation", r2(s.blur / 100 * inf.S * .08)); G.g.setAttribute("filter", `url(#mof-${k})`); }
      else G.g.removeAttribute("filter"); }
    if (inf.clip) { const c = s.clip;
      if (c && c.v < 1) { const cp = document.getElementById("moc-" + k), rs = cp.children, w = inf.x1 - inf.x0, h = inf.y1 - inf.y0, m = inf.S * .05;
        const set = (el, x, y, ww, hh) => { el.setAttribute("x", r2(x)); el.setAttribute("y", r2(y)); el.setAttribute("width", r2(Math.max(0, ww))); el.setAttribute("height", r2(Math.max(0, hh))); };
        for (const el of rs) set(el, 0, 0, 0, 0);
        if (c.k === "wipe") { const v = c.v, X = inf.x0 - m, Y = inf.y0 - m, W = w + 2 * m, H = h + 2 * m;
          if (c.dir === "gauche") set(rs[0], X, Y, W * v, H); else if (c.dir === "droite") set(rs[0], X + W * (1 - v), Y, W * v, H);
          else if (c.dir === "haut") set(rs[0], X, Y, W, H * v); else set(rs[0], X, Y + H * (1 - v), W, H * v); }
        else { const n = Math.min(c.n, rs.length), bh = (h + 2 * m) / n; for (let i = 0; i < n; i++) set(rs[i], inf.x0 - m, inf.y0 - m + i * bh + bh * (1 - c.v) / 2, w + 2 * m, bh * c.v + .01); }
        G.c.setAttribute("clip-path", `url(#moc-${k})`); }
      else G.c.removeAttribute("clip-path"); }
    if (G.tr) { const d = s.draw;
      if (d !== null && d < 1) { G.tr.style.display = ""; G.tr.setAttribute("stroke-dashoffset", r2(1 - d)); G.b.setAttribute("opacity", r2(mo01((d - .55) / .45))); }
      else { G.tr.style.display = "none"; G.b.removeAttribute("opacity"); } }
  }
  if (MO.scene) { const s = st[MO_SCENE]; const tr = s ? moTransform(s, MO.c) : ""; if (tr) MO.scene.setAttribute("transform", tr); else MO.scene.removeAttribute("transform");
    if (s && s.o < 1) MO.scene.setAttribute("opacity", r2(mo01(s.o))); else MO.scene.removeAttribute("opacity"); }
}
function moSelBoxes() {
  const g = moEl("moSvg").querySelector("g[data-selbox]"); if (!g) return;
  if (MO.playing) { g.innerHTML = ""; return; }
  const m = MO.S * .008;
  g.innerHTML = [...MO.sel].filter(id => MO.info[id]).map(id => { const i = MO.info[id];
    return `<rect x="${r2(i.x0 - m)}" y="${r2(i.y0 - m)}" width="${r2(i.x1 - i.x0 + 2 * m)}" height="${r2(i.y1 - i.y0 + 2 * m)}" fill="none" stroke="#4F5BD5" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`; }).join("");
}
function moSelect(id, add) {
  if (add) { if (MO.sel.has(id)) MO.sel.delete(id); else MO.sel.add(id); } else MO.sel = new Set([id]);
  moPanel(); moSelBoxes();
  const row = moEl("moLayers").querySelector(`[data-layer="${CSS.escape(id)}"]`); if (row) row.closest("label").scrollIntoView({ block: "nearest" });
}

/* ---------- Side panel ---------- */
const moTitle = a => (a.k === "out" ? "Disparition" : a.k === "mo" ? "Mouvement" : a.k === "cam" ? "Caméra" : MO_PRESETS[a.p].cat === "texte" ? "Texte" : "Apparition");
function moSlider(a, k, v, min, max, step) {
  return `<label class="mo-p"><span>${k === "at" ? "Début" : k === "len" ? "Durée" : k === "stg" ? "Décalage entre calques" : esc(MO_PARAMS[k].n)}</span><input type="range" data-a="${a.id}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${moShow(k, v)}</output></label>`;
}
function moSelect2(a, k, label, opts, v) {
  return `<label class="mo-p"><span>${label}</span><select data-a="${a.id}" data-k="${k}">${Object.entries(opts).map(([key, n]) => `<option value="${key}"${key === v ? " selected" : ""}>${esc(typeof n === "string" ? n : n.n)}</option>`).join("")}</select></label>`;
}
function moCard(a) {
  const P = MO_PRESETS[a.p], o = Object.assign({}, P.o, a.o), n = a.k === "cam" ? 1 : a.ids.filter(id => MO.info[id]).length;
  let h = moSlider(a, "at", a.at, 0, Math.max(.5, motion.dur - .1), .05) + moSlider(a, "len", a.len, a.p === "machine" ? .01 : .1, Math.max(.2, motion.dur), .05);
  if (n > 1) h += moSlider(a, "stg", a.stg || 0, 0, 1, .01) + moSelect2(a, "ord", "Ordre", MO_ORDERS, a.ord || P.ord || "calques");
  h += moSelect2(a, "ease", "Courbe", MO_EASES, a.ease || P.ease);
  for (const k of Object.keys(P.o)) { const d = MO_PARAMS[k]; h += d.opts ? moSelect2(a, k, esc(d.n), d.opts, o[k]) : moSlider(a, k, o[k], d.min, d.max, d.step); }
  const who = a.k === "cam" ? "toute la scène" : n + " calque" + (n > 1 ? "s" : "");
  return `<details class="mo-anim" data-id="${a.id}"${MO.focus === a.id ? " open" : ""}><summary><span><span class="k">${moTitle(a)}</span><br>${esc(P.n)} <small style="color:var(--muted)">· ${who}</small></span><span class="t" data-time="${a.id}">${moNum(a.at)}–${moNum(moEnd(a))} s</span></summary>
<div class="bd">${h}<div class="acts">${a.k !== "cam" ? `<button data-act="sel" data-id="${a.id}">Sélectionner ses calques</button>` : ""}<button data-act="play" data-id="${a.id}">▶ Voir</button><button data-act="del" data-id="${a.id}">Retirer</button></div></div></details>`;
}
function moPanelTimes() { for (const a of motion.anims) { const el = moEl("moList").querySelector(`[data-time="${a.id}"]`); if (el) el.textContent = `${moNum(a.at)}–${moNum(moEnd(a))} s`; } }
function moPanel() {
  const vis = moVisible().slice().reverse(), gname = l => { const g = groups.find(x => x.id === l.grp); return g ? g.name : l.group === "word" ? "Texte" : "Symbole"; };
  moEl("moLayers").innerHTML = vis.length ? vis.map(l => `<label class="${MO.sel.has(l.id) ? "on" : ""}"><input type="checkbox" data-layer="${esc(l.id)}"${MO.sel.has(l.id) ? " checked" : ""}><span class="n">${esc(l.name || l.id)}</span><span class="grp">${esc(gname(l))}</span></label>`).join("") : `<p class="mo-hint" style="padding:8px 10px">Aucun calque visible.</p>`;
  moEl("moTabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === MO.tab)));
  const cat = MO.tab === "out" ? "in" : MO.tab;
  moEl("moPresets").innerHTML = Object.entries(MO_PRESETS).filter(([, P]) => P.cat === cat).map(([k, P]) => `<button data-preset="${k}">${esc(P.n)}</button>`).join("");
  const ns = MO.sel.size;
  moEl("moHint").textContent = MO.tab === "cam" ? "La caméra bouge autour de tout le logo." : ns ? `S'applique à ${ns} calque${ns > 1 ? "s" : ""} sélectionné${ns > 1 ? "s" : ""}${ns > 1 ? ", avec un décalage entre eux" : ""}.` : "Sélectionnez des calques (liste ou clic sur la scène, Maj pour en ajouter).";
  const list = ns ? motion.anims.filter(a => a.k === "cam" || a.ids.some(id => MO.sel.has(id))) : motion.anims;
  moEl("moListTitle").textContent = ns ? "Animations de la sélection" : "Toutes les animations";
  moEl("moList").innerHTML = list.length ? list.map(moCard).join("") : `<p class="mo-hint">Aucune animation${ns ? " sur ces calques" : ""} pour l'instant.</p>`;
  moUndoBtns();
}

/* ---------- Player ---------- */
function moSeek(t) {
  MO.t = moC(t, 0, motion.dur); moRender(MO.t);
  moEl("moScrub").value = MO.t; moEl("moTime").textContent = moFmt(MO.t) + " / " + moFmt(motion.dur);
}
function moStep(k) { moPlay(false); moSeek((Math.round(MO.t * MOTION_FPS) + k) / MOTION_FPS); }
function moPlay(on) {
  MO.playing = !!on; cancelAnimationFrame(MO.raf);
  const b = moEl("moPlay"); b.textContent = MO.playing ? "❚❚" : "▶"; b.setAttribute("aria-label", MO.playing ? "Pause" : "Lecture");
  moSelBoxes();
  if (!MO.playing) return;
  if (MO.t >= motion.dur) MO.t = 0;
  MO.last = performance.now();
  const tick = now => {
    let t = MO.t + (now - MO.last) / 1000; MO.last = now;
    if (t >= motion.dur) { if (motion.loop) t %= motion.dur; else { moSeek(motion.dur); moPlay(false); return; } }
    moSeek(t); MO.raf = requestAnimationFrame(tick);
  };
  MO.raf = requestAnimationFrame(tick);
}
function openMotion() {
  MO.open = true; MO.t = 0; MO.undo = []; MO.redo = []; MO.pend = null; moEl("motion").hidden = false; document.body.classList.add("motion-open");
  moBuild(); moPanel(); moEl("moPlay").focus(); moPlay(!matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function closeMotion() {
  moPlay(false); MO.open = false; moEl("motion").hidden = true; document.body.classList.remove("motion-open");
  moEl("moSvg").innerHTML = ""; const b = document.getElementById("motionBtn"); if (b) b.focus();
}
window.__motion = {
  get state() { return { open: MO.open, t: MO.t, playing: MO.playing, motion: clone(motion), sel: [...MO.sel] }; },
  seek: t => { moPlay(false); moSeek(t); }, open: openMotion, close: closeMotion, presets: Object.keys(MO_PRESETS), valid: validMotion,
  stateAt: t => { const s = moState(t); return JSON.parse(JSON.stringify(s)); },
};
