/* ==========================================================================
   Atelier du Logo — Motion (step 1: foundations)
   The twin module that animates the open project's logo. It lives apart from the workshop: it only reads the
   drawing (layers, palettes, effects through layerSVG / applyFx) and never changes it. Its own data is
   doc.motion = {v:1, dur, loop}, saved with the project (docNow / loadDoc hooks) and in the local cache (palDoc).
   Inlined by build.js at the end of the workshop script, so it shares its helpers (clone, r2, esc, bounds…).
   ========================================================================== */
const MOTION_MIN = 1, MOTION_MAX = 12, MOTION_FPS = 30;
const motionDefault = () => ({ v: 1, dur: 5, loop: true });
var motion = motionDefault();   // var: the workshop's save hooks may run before this point

function validMotion(m) {
  return !!m && typeof m === "object" && m.v === 1 && Number.isFinite(m.dur) && m.dur >= MOTION_MIN && m.dur <= MOTION_MAX
    && (m.loop === undefined || typeof m.loop === "boolean");
}
function motionNow() { return motion ? clone(motion) : motionDefault(); }
function motionLoad(m) { motion = validMotion(m) ? { v: 1, dur: m.dur, loop: m.loop !== false } : motionDefault(); if (MO && MO.open) moBuild(); }

/* ---------- Timing engine ----------
   Step 1 has no per-layer animation yet (presets come in step 2): the preview plays a provisional "birth" where
   each group of layers fades and rises in, one after the other, in drawing order, and the logo ends exactly as
   drawn. moState(t) returns, for each layer, {o, x, y, s, r}: opacity, offset, scale and rotation. */
const moEase = { outCubic: u => 1 - Math.pow(1 - u, 3) };
const moClamp = (v, a, b) => Math.max(a, Math.min(b, v));
function moPlan() {
  const vis = layers.filter(l => l.visible !== false && l.subs && l.subs.length), order = [], slot = {};
  vis.forEach(l => { const k = l.grp || l.group || "mark"; if (!(k in slot)) { slot[k] = order.length; order.push(k); } });
  const n = Math.max(1, order.length), span = motion.dur * 0.7, len = Math.min(0.9, Math.max(0.25, motion.dur * 0.16));
  const plan = {};
  vis.forEach(l => { const i = slot[l.grp || l.group || "mark"]; plan[l.id] = { start: n > 1 ? i * (span - len) / (n - 1) : 0, len }; });
  return plan;
}
function moState(t, plan) {
  const out = {};
  for (const id in plan) { const p = plan[id], u = moEase.outCubic(moClamp((t - p.start) / p.len, 0, 1));
    out[id] = { o: u, x: 0, y: (1 - u) * 14, s: 1, r: 0 }; }
  return out;
}

/* ---------- Module UI ---------- */
var MO = { open: false, t: 0, playing: false, raf: 0, last: 0, plan: {}, centers: {} };
const moEl = id => document.getElementById(id);
const moFmt = t => (Math.round(t * 100) / 100).toFixed(2).replace(".", ",") + " s";

(function moInit() {
  const css = document.createElement("style");
  css.textContent = `
#motion{position:fixed;inset:0;z-index:60;background:var(--cream);display:flex;flex-direction:column;color:var(--ink)}
#motion[hidden]{display:none}
#motion .mo-top{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--paper)}
#motion .mo-top h2{font-size:15px;margin:0;font-weight:600;letter-spacing:.01em}
#motion .mo-top .sub{color:var(--muted);font-size:12px}
#motion .mo-top .spacer{flex:1}
#motion .mo-dur{display:flex;align-items:center;gap:8px;font-size:13px}
#motion .mo-dur input{width:150px}
#motion .mo-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:24px}
#motion .mo-frame{background:#fff;border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 30px rgba(0,0,0,.06);width:min(100%,calc((100vh - 220px)*16/9));aspect-ratio:16/9;display:flex}
#motion .mo-frame svg{width:100%;height:100%;display:block}
#motion .mo-bar{display:flex;align-items:center;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--paper)}
#motion .mo-bar button{min-width:36px;height:36px}
#motion .mo-bar input[type=range]{flex:1}
#motion .mo-time{font-variant-numeric:tabular-nums;font-size:13px;min-width:120px;text-align:right}
#motion .mo-note{color:var(--muted);font-size:12px;text-align:center;padding:0 16px 10px;background:var(--paper)}
@media (max-width:900px){ #motion .mo-top{flex-wrap:wrap;gap:8px} #motion .mo-dur{width:100%} #motion .mo-dur input{flex:1;width:auto}
  #motion .mo-stage{padding:12px} #motion .mo-frame{width:100%} #motion .mo-time{min-width:0} #motion .mo-top .sub{display:none} }
@media (prefers-reduced-motion:reduce){ #motion *{transition:none!important} }`;
  document.head.appendChild(css);
  const root = document.createElement("div");
  root.id = "motion"; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-label", "Motion : animer le logo");
  root.innerHTML = `
<div class="mo-top">
  <button id="moBack" title="Revenir à l'atelier (Échap)">‹ Atelier</button>
  <div><h2>Motion</h2><div class="sub">Animer le logo du projet ouvert</div></div>
  <div class="spacer"></div>
  <label class="mo-dur">Durée <input type="range" id="moDur" min="${MOTION_MIN}" max="${MOTION_MAX}" step="0.5"> <output id="moDurOut"></output></label>
</div>
<div class="mo-stage"><div class="mo-frame" id="moFrame"><svg id="moSvg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"></svg></div></div>
<div class="mo-note">Aperçu provisoire : les groupes de calques apparaissent l'un après l'autre. Les animations à choisir arrivent à l'étape suivante.</div>
<div class="mo-bar">
  <button id="moStart" title="Début (Origine)" aria-label="Revenir au début">⏮</button>
  <button id="moPrev" title="Image précédente (←)" aria-label="Image précédente">‹</button>
  <button id="moPlay" class="primary" title="Lecture / pause (Espace)" aria-label="Lecture">▶</button>
  <button id="moNext" title="Image suivante (→)" aria-label="Image suivante">›</button>
  <input type="range" id="moScrub" min="0" step="${1 / MOTION_FPS}" value="0" aria-label="Position dans l'animation">
  <label class="chk"><input type="checkbox" id="moLoop"> Boucle</label>
  <span class="mo-time" id="moTime"></span>
</div>`;
  document.body.appendChild(root);
  const mb = document.getElementById("motionBtn"); if (mb) mb.onclick = openMotion;

  moEl("moBack").onclick = closeMotion;
  moEl("moPlay").onclick = () => moPlay(!MO.playing);
  moEl("moStart").onclick = () => { moPlay(false); moSeek(0); };
  moEl("moPrev").onclick = () => moStep(-1);
  moEl("moNext").onclick = () => moStep(1);
  moEl("moScrub").oninput = e => { moPlay(false); moSeek(+e.target.value); };
  moEl("moDur").oninput = e => { motion.dur = moClamp(+e.target.value, MOTION_MIN, MOTION_MAX); moBuild(); moSave(); };
  moEl("moLoop").onchange = e => { motion.loop = e.target.checked; moSave(); };
  // while the module is open its keys never reach the workshop's shortcuts
  window.addEventListener("keydown", e => {
    if (!MO.open) return;
    const dlg = document.querySelector("dialog[open]"); if (dlg) return;
    e.stopImmediatePropagation();
    const field = e.target.closest && e.target.closest("input[type=range],input[type=text],textarea,select");
    if (e.key === "Escape") { e.preventDefault(); closeMotion(); }
    else if (e.key === " " && !(e.target.closest && e.target.closest("button"))) { e.preventDefault(); moPlay(!MO.playing); }
    else if (!field && e.key === "ArrowLeft") { e.preventDefault(); moStep(-1); }
    else if (!field && e.key === "ArrowRight") { e.preventDefault(); moStep(1); }
    else if (!field && e.key === "Home") { e.preventDefault(); moPlay(false); moSeek(0); }
    else if (!field && e.key === "End") { e.preventDefault(); moPlay(false); moSeek(motion.dur); }
  }, true);
})();

function moSave() { try { localSave(); } catch (_) {} }

/* the scene: every visible layer drawn once by the workshop's own renderer, each in a <g> that only gets an
   opacity and a transform per frame (cheap, and the effects stay pixel-identical to the workshop) */
function moBuild() {
  const svg = moEl("moSvg"), vis = layers.filter(l => l.visible !== false && l.subs && l.subs.length);
  MO.plan = moPlan(); MO.centers = {};
  let defs = "", body = "";
  if (vis.length) {
    const b = bounds(vis), w = b.x1 - b.x0, h = b.y1 - b.y0, pad = Math.max(w, h) * 0.12;
    let vw = w + 2 * pad, vh = h + 2 * pad; if (vw / vh < 16 / 9) vw = vh * 16 / 9; else vh = vw * 9 / 16;
    svg.setAttribute("viewBox", `${r2((b.x0 + b.x1 - vw) / 2)} ${r2((b.y0 + b.y1 - vh) / 2)} ${r2(vw)} ${r2(vh)}`);
    for (const L of vis) {
      const r = layerSVG(L, { pfx: "mo" }), lb = bounds([L]);
      MO.centers[L.id] = { x: (lb.x0 + lb.x1) / 2, y: (lb.y0 + lb.y1) / 2 };
      defs += r.defs; body += `<g data-mo="${esc(L.id)}">${r.body}</g>`;
    }
  } else svg.setAttribute("viewBox", "0 0 160 90");
  svg.innerHTML = (defs ? `<defs>${defs}</defs>` : "") + (body || `<text x="80" y="47" text-anchor="middle" font-size="6" fill="#6B6B70" font-family="Inter,system-ui,sans-serif">Le projet ne contient encore aucun calque visible.</text>`);
  MO.groups = {}; svg.querySelectorAll("g[data-mo]").forEach(g => { MO.groups[g.dataset.mo] = g; });
  const dur = moEl("moDur"); dur.value = motion.dur; moEl("moDurOut").textContent = String(motion.dur).replace(".", ",") + " s";
  moEl("moScrub").max = motion.dur; moEl("moLoop").checked = motion.loop;
  moSeek(Math.min(MO.t, motion.dur));
}
function moRender(t) {
  const st = moState(t, MO.plan);
  for (const id in MO.groups) {
    const g = MO.groups[id], s = st[id] || { o: 1, x: 0, y: 0, s: 1, r: 0 }, c = MO.centers[id];
    g.setAttribute("opacity", r2(s.o));
    const tr = (s.x || s.y ? `translate(${r2(s.x)} ${r2(s.y)}) ` : "") + (s.r || s.s !== 1 ? `translate(${r2(c.x)} ${r2(c.y)}) rotate(${r2(s.r)}) scale(${s.s}) translate(${r2(-c.x)} ${r2(-c.y)})` : "");
    if (tr) g.setAttribute("transform", tr.trim()); else g.removeAttribute("transform");
  }
}
function moSeek(t) {
  MO.t = moClamp(t, 0, motion.dur); moRender(MO.t);
  moEl("moScrub").value = MO.t; moEl("moTime").textContent = moFmt(MO.t) + " / " + moFmt(motion.dur);
}
function moStep(k) { moPlay(false); moSeek((Math.round(MO.t * MOTION_FPS) + k) / MOTION_FPS); }
function moPlay(on) {
  MO.playing = !!on; cancelAnimationFrame(MO.raf);
  const b = moEl("moPlay"); b.textContent = MO.playing ? "❚❚" : "▶"; b.setAttribute("aria-label", MO.playing ? "Pause" : "Lecture");
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
  MO.open = true; MO.t = 0; moEl("motion").hidden = false; document.body.classList.add("motion-open");
  moBuild(); moEl("moPlay").focus(); moPlay(!matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function closeMotion() {
  moPlay(false); MO.open = false; moEl("motion").hidden = true; document.body.classList.remove("motion-open");
  moEl("moSvg").innerHTML = ""; const b = document.getElementById("motionBtn"); if (b) b.focus();
}
window.__motion = { get state() { return { open: MO.open, t: MO.t, playing: MO.playing, motion: clone(motion) }; }, seek: t => { moPlay(false); moSeek(t); }, open: openMotion, close: closeMotion };
