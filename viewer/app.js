// Page wiring: controls → worker (simulation) → scene (3D) and strip charts.

import { FlightScene } from './scene.js';
import { StripChart } from './plots.js';
import { SPECIES } from '../src/species.js';

const $ = (id) => document.getElementById(id);
const NU = 1.5e-5, G = 9.81;

const state = {
  species: 'monarch', aero: 'uvlm', mode: 'tethered', running: false,
  M: 5, N: 10, stepsPerCycle: 40, wakeCycles: 2, rollBeats: 1,
  interact: true, lev: 'suction', compareQS: false, control: true,
  U: null, kin: {}, pace: 2, speedRef: null,
};
let meta = null, frame = null, fresh = false, worker = null, scene = null, lastStats = { msPerStep: 0 }, crashNote = null;
const hist = [];

const WING = [
  { key: 'f', label: 'Wingbeat frequency', unit: 'Hz', min: 4, max: 20, step: 0.1, d: 1 },
  { key: 'phiAmp', label: 'Stroke amplitude', unit: '°', min: 40, max: 170, step: 1, d: 0 },
  { key: 'phiMean', label: 'Mean flap angle', unit: '°', min: -20, max: 40, step: 1, d: 0 },
  { key: 'strokePlane', label: 'Stroke-plane tilt', unit: '°', min: -40, max: 50, step: 0.5, d: 1 },
  { key: 'alphaMean', label: 'Mean feathering', unit: '°', min: -30, max: 30, step: 0.5, d: 1 },
  { key: 'alphaAmp', label: 'Feathering amplitude', unit: '°', min: 0, max: 50, step: 1, d: 0 },
  { key: 'alphaPhase', label: 'Feathering phase', unit: '°', min: 90, max: 270, step: 5, d: 0 },
  { key: 'camberMean', label: 'Camber', unit: '% c', min: 0, max: 15, step: 0.5, d: 1, scale: 100 },
  { key: 'twistAmp', label: 'Tip twist amplitude', unit: '°', min: 0, max: 30, step: 1, d: 0 },
  { key: 'psiMean', label: 'Mean sweep', unit: '°', min: -30, max: 30, step: 0.5, d: 1 },
  { key: 'downRatio', label: 'Downstroke share', unit: '', min: 0.35, max: 0.65, step: 0.01, d: 2 },
];
const BODY = [
  { key: 'U', label: 'Air speed', unit: 'm/s', min: 0.2, max: 4, step: 0.05, d: 2, top: true, restart: true },
  { key: 'climb', label: 'Climb angle', unit: '°', min: -20, max: 45, step: 1, d: 0, top: true, restart: true },
  { key: 'chiMean', label: 'Mean body pitch', unit: '°', min: 0, max: 70, step: 1, d: 0 },
  { key: 'chiAmp', label: 'Body pitch oscillation', unit: '°', min: 0, max: 30, step: 1, d: 0 },
  { key: 'abdAmp', label: 'Abdomen flexion', unit: '°', min: 0, max: 25, step: 1, d: 0 },
];
const RES = [
  { key: 'M', label: 'Chordwise panels', unit: '', min: 3, max: 10, step: 1, d: 0, top: true, restart: true },
  { key: 'N', label: 'Spanwise panels', unit: '', min: 6, max: 20, step: 1, d: 0, top: true, restart: true },
  { key: 'stepsPerCycle', label: 'Steps per wingbeat', unit: '', min: 20, max: 80, step: 2, d: 0, top: true, restart: true },
  { key: 'wakeCycles', label: 'Wake kept', unit: 'beats', min: 0.5, max: 5, step: 0.5, d: 1, top: true, restart: true },
  { key: 'rollBeats', label: 'Wake rolls up for', unit: 'beats', min: 0.25, max: 5, step: 0.25, d: 2, top: true, restart: true },
  { key: 'pace', label: 'Steps per frame', unit: '', min: 1, max: 8, step: 1, d: 0, top: true, pace: true },
];
const inputs = {};

function slider(host, spec) {
  const row = document.createElement('div'); row.className = 'row';
  const id = 'in-' + spec.key;
  const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = spec.label;
  const out = document.createElement('output'); out.htmlFor = id;
  const inp = document.createElement('input'); inp.type = 'range'; inp.id = id; inp.min = spec.min; inp.max = spec.max; inp.step = spec.step;
  row.append(lab, out, inp); host.append(row);
  const show = () => { out.textContent = Number(inp.value).toFixed(spec.d) + (spec.unit ? ' ' + spec.unit : ''); };
  inp.addEventListener('input', () => {
    show();
    const v = Number(inp.value);
    if (spec.pace) { state.pace = v; pace(); return; }
    if (spec.top) { state[spec.key] = v; if (spec.restart) scheduleRestart(); return; }
    const val = spec.scale ? v / spec.scale : v;
    state.kin[spec.key] = val;
    worker.postMessage({ type: 'set', kin: { [spec.key]: val } });
  });
  inputs[spec.key] = { inp, show, spec };
}

function buildControls() {
  const sel = $('in-species');
  for (const [k, sp] of Object.entries(SPECIES)) { const o = document.createElement('option'); o.value = k; o.textContent = `${sp.name} (${sp.latin})`; sel.append(o); }
  sel.value = state.species;
  sel.addEventListener('change', () => { state.species = sel.value; state.kin = {}; state.U = null; state.climb = null; state.speedRef = null; restart(); });
  WING.forEach((s) => slider($('g-wing'), s));
  BODY.forEach((s) => slider($('g-body'), s));
  const spd = { key: 'speedRef', label: 'Target speed', unit: 'm/s', min: 0.3, max: 3.5, step: 0.05, d: 2 };
  slider($('g-free'), { ...spd, top: true });
  inputs.speedRef.inp.addEventListener('input', () => worker.postMessage({ type: 'speedRef', value: Number(inputs.speedRef.inp.value) }));
  $('g-free').insertBefore(inputs.speedRef.inp.parentElement, $('g-free').children[2]);
  RES.forEach((s) => slider($('g-res'), s));
  for (const seg of ['seg-mode', 'seg-aero']) {
    $(seg).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      for (const x of $(seg).querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
      state[seg === 'seg-mode' ? 'mode' : 'aero'] = b.dataset.v; restart();
    });
  }
  $('in-interact').addEventListener('change', (e) => { state.interact = e.target.checked; restart(); });
  $('in-lev').addEventListener('change', (e) => { state.lev = e.target.checked ? 'suction' : 'none'; restart(); });
  $('in-compare').addEventListener('change', (e) => { state.compareQS = e.target.checked; restart(); });
  $('in-control').addEventListener('change', (e) => { state.control = e.target.checked; restart(); });
  $('in-wake').addEventListener('change', (e) => { scene.opts.wake = e.target.value; });
  $('in-loads').addEventListener('change', (e) => { scene.opts.loads = e.target.checked; fresh = true; });
  $('in-smoke').addEventListener('change', (e) => { state.smoke = e.target.checked; worker.postMessage({ type: 'smoke', on: state.smoke }); });
  $('in-arrows').addEventListener('change', (e) => { scene.opts.arrows = e.target.checked; });
  $('in-trail').addEventListener('change', (e) => { scene.opts.trail = e.target.checked; scene.trail = []; });
  $('in-follow').addEventListener('change', (e) => { scene.opts.follow = e.target.checked; });
  $('btn-run').addEventListener('click', () => setRunning(!state.running));
  $('btn-step').addEventListener('click', () => { setRunning(false); worker.postMessage({ type: 'step' }); });
  $('btn-reset').addEventListener('click', () => restart());
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => scene.view(b.dataset.view));
  const gust = (w) => worker.postMessage({ type: 'gust', wind: w, duration: meta ? 1 / meta.f : 0.1 });
  $('gust-up').addEventListener('click', () => gust([0, 0.8, 0]));
  $('gust-down').addEventListener('click', () => gust([0, -0.8, 0]));
  $('gust-head').addEventListener('click', () => gust([-0.8, 0, 0]));
}

let restartTimer = null;
function scheduleRestart() { clearTimeout(restartTimer); restartTimer = setTimeout(restart, 350); }
function restart() {
  hist.length = 0; crashNote = null; if (scene) scene.trail = [];
  const cfg = {
    species: state.species, aero: state.aero, mode: state.mode, M: state.M, N: state.N,
    stepsPerCycle: state.stepsPerCycle, wakeCycles: state.wakeCycles, freeRows: Math.round(state.rollBeats * state.stepsPerCycle), interact: state.interact, lev: state.lev,
    compareQS: state.compareQS, control: state.control, kin: { ...state.kin }, speedRef: state.speedRef ?? undefined,
  };
  if (state.U != null) cfg.U = state.U;
  if (state.climb != null) cfg.climb = state.climb;
  $('status').textContent = 'starting…';
  worker.postMessage({ type: 'init', cfg });
  if (state.smoke) worker.postMessage({ type: 'smoke', on: true });
  pace();
  if (state.running) worker.postMessage({ type: 'run', on: true });
}
function pace() { worker?.postMessage({ type: 'pace', stepsPerFrame: state.pace, rate: 60 }); }
function setRunning(on) {
  state.running = on; $('btn-run').textContent = on ? 'Pause' : 'Run';
  worker.postMessage({ type: 'run', on });
}

function onReady(m) {
  meta = m;
  const sp = SPECIES[state.species];
  $('sp-name').textContent = m.species; $('sp-latin').textContent = m.latin;
  $('sp-tag').textContent = m.aero === 'uvlm' ? 'unsteady vortex lattice' : 'quasi-steady blade element';
  $('sp-note').textContent = sp.note || '';
  scene.setSpecies(sp, m.symmetric); scene.gRef = 0; scene.ringRef = 0; scene.offsetInit = false;
  const fourier = !!m.kin.fourier;
  // measured (Fourier) wingbeats: amplitudes rescale the data and the phase knob shifts feathering
  inputs.alphaPhase.inp.min = fourier ? -90 : 90; inputs.alphaPhase.inp.max = fourier ? 90 : 270;
  inputs.downRatio.inp.disabled = fourier;
  for (const s of WING.concat(BODY)) {
    const v = s.key === 'U' ? m.U : s.key === 'climb' ? m.climb : m.kin[s.key];
    if (v != null && inputs[s.key]) { inputs[s.key].inp.value = s.scale ? v * s.scale : v; inputs[s.key].show(); }
  }
  for (const s of RES) { const v = s.pace ? state.pace : state[s.key]; inputs[s.key].inp.value = v; inputs[s.key].show(); }
  if (state.speedRef == null) state.speedRef = +(m.U * Math.cos((m.climb || 0) * Math.PI / 180)).toFixed(2);
  inputs.speedRef.inp.value = state.speedRef; inputs.speedRef.show();
  for (const k of ['chiMean', 'chiAmp']) inputs[k].inp.disabled = m.mode === 'free';
  $('g-free').style.opacity = m.mode === 'tethered' ? 0.55 : 1;
  charts.forEach((c) => c.setLegend(c.series.map((s) => ({ ...s, hidden: s.key.endsWith('QS') && !(state.compareQS && m.aero === 'uvlm' && m.mode === 'tethered') }))));
}

function onFrame(m) {
  frame = m; fresh = true;
  if (m.rec) {
    hist.push({ rec: m.rec, qs: m.qs });
    const keep = Math.round(3 * meta.stepsPerCycle);
    if (hist.length > keep) hist.splice(0, hist.length - keep);
  }
}

function hud() {
  if (!meta || !hist.length) return;
  const n = Math.min(hist.length, meta.stepsPerCycle), H = hist.slice(-n).map((h) => h.rec), W = meta.mass * G;
  const mean = (k) => H.reduce((a, r) => a + r[k], 0) / H.length;
  const r = H[H.length - 1];
  const fmt = (v, d) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
  $('h-lw').innerHTML = fmt(mean('Fy') / W, 2) + (n < meta.stepsPerCycle ? '<small>…</small>' : '');
  $('h-tw').textContent = fmt(mean('Fx') / W, 2);
  $('h-pitch').innerHTML = fmt(r.pitch * 57.2958, 1) + '<small>°</small>';
  const sp = Math.hypot(r.vx, r.vy);
  $('h-speed').innerHTML = fmt(sp, 2) + '<small>m/s</small>';
  const k = meta.kin, Phi = (k.phiAmp * Math.PI) / 180, f = k.f;
  const Uflap = 2 * Phi * f * 0.5 * meta.R; // mid-span flapping speed
  const Uref = Math.hypot(meta.U, Uflap);
  $('h-re').textContent = Math.round(Uref * meta.cbar / NU).toLocaleString('en-US');
  $('h-k').textContent = (Math.PI * f * meta.cbar / Math.max(0.05, sp)).toFixed(2);
  $('h-j').textContent = (sp / (2 * Phi * f * meta.R)).toFixed(2);
  const Ppos = H.reduce((a, x) => a + Math.max(0, x.Pmech), 0) / H.length;
  $('h-p').innerHTML = (Ppos / meta.mass).toFixed(1) + '<small>W/kg</small>';
  const slow = 1 / Math.max(1e-6, (1000 / Math.max(1, lastStats.msPerStep)) * meta.dt);
  if (crashNote) { $('status').textContent = crashNote; return; }
  $('status').textContent = `t ${r.t.toFixed(3)} s · beat ${r.cycle.toFixed(2)} · ${lastStats.msPerStep.toFixed(1)} ms/step · ${state.running ? slow.toFixed(0) + '× slower than life' : 'paused'}`;
}

let charts = [];
function buildCharts() {
  const host = $('charts');
  charts = [
    new StripChart(host, { title: 'Vertical air force', unit: '× weight', ref: 1, series: [{ key: 'Fy', label: 'Vortex lattice', color: '--series-1' }, { key: 'FyQS', label: 'Quasi-steady', color: '--series-2', hidden: true }] }),
    new StripChart(host, { title: 'Forward air force', unit: '× weight', ref: 0, series: [{ key: 'Fx', label: 'Vortex lattice', color: '--series-1' }, { key: 'FxQS', label: 'Quasi-steady', color: '--series-2', hidden: true }] }),
    new StripChart(host, { title: 'Body pitch', unit: '°', series: [{ key: 'pitch', label: 'Body pitch', color: '--series-1' }], fmt: (v, t) => v.toFixed(t < 1 ? 1 : 0) }),
  ];
}
function drawCharts() {
  if (!meta || hist.length < 2) return;
  const W = meta.mass * G;
  const data = { t: [], cycle: [], down: [], window: 3, values: { Fy: [], Fx: [], pitch: [], FyQS: [], FxQS: [] } };
  for (const h of hist) {
    const r = h.rec;
    data.t.push(r.t); data.cycle.push(r.cycle); data.down.push((r.cycle % 1 + 1) % 1 < (meta.kin.downRatio ?? 0.5));
    data.values.Fy.push(r.Fy / W); data.values.Fx.push(r.Fx / W); data.values.pitch.push(r.pitch * 57.2958);
    data.values.FyQS.push(h.qs ? h.qs.Fy / W : NaN); data.values.FxQS.push(h.qs ? h.qs.Fx / W : NaN);
  }
  for (const c of charts) c.draw(data);
}

function boot() {
  scene = new FlightScene($('view'));
  buildControls(); buildCharts();
  const resize = () => { const r = $('view').getBoundingClientRect(); scene.resize(Math.max(1, r.width), Math.max(1, r.height)); drawCharts(); };
  new ResizeObserver(resize).observe($('view'));
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'ready') onReady(m.meta);
    else if (m.type === 'frame') onFrame(m);
    else if (m.type === 'stats') lastStats = m;
    else if (m.type === 'crash') { state.running = false; $('btn-run').textContent = 'Run'; crashNote = `Lost control at t = ${m.t.toFixed(2)} s: ${m.reason}. Restart to try again.`; }
    else if (m.type === 'error') { $('status').textContent = 'solver error: ' + m.message.split('\n')[0]; console.error(m.message); setRunning(false); }
  };
  worker.onerror = (e) => { $('status').textContent = 'worker failed to start: ' + (e.message || 'unknown'); };
  restart();
  setRunning(true);
  let lastChart = 0;
  const tick = (now) => {
    if (frame && meta && fresh) { scene.update(frame, meta); fresh = false; hud(); }
    scene.render();
    if (now - lastChart > 90) { drawCharts(); lastChart = now; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
boot();
