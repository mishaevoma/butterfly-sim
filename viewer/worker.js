// Simulation worker: owns a FlightSim, steps it as fast as the budget allows and posts compact
// frames (wing poses, wake lattice, loads, records) to the page.

import { FlightSim } from '../src/sim.js';
import { FlightController } from '../src/control.js';
import { trim } from '../src/trim.js';
import { getSpecies } from '../src/species.js';

let sim = null, shadow = null, running = false, cfg = null, stepsPerFrame = 1, targetRate = 60;
let gustUntil = -1, gustVec = [0, 0, 0];
// smoke: tracer particles released from a rake ahead of the animal into still air and carried by
// the velocity the vortex system induces (the wind-tunnel smoke-wire picture)
const SMOKE_CAP = 420;
const smoke = { on: false, X: new Float64Array(SMOKE_CAP * 3), age: new Float32Array(SMOKE_CAP), n: 0, head: 0 };
function smokeStep() {
  if (!smoke.on || !sim) return;
  const dt = sim.dt, R = sim.sp.R, r = sim.state.r;
  if (smoke.n && sim.cfg.aero === 'uvlm') {
    const v = sim.aero.probe(smoke.X, smoke.n);
    for (let i = 0; i < 3 * smoke.n; i++) smoke.X[i] += v[i] * dt;
  }
  for (let i = 0; i < smoke.n; i++) smoke.age[i] += dt;
  // a vertical rake at two span stations, a little ahead of the head
  const emit = 6, x = r[0] + 0.7 * R, y0 = r[1] - 0.55 * R, y1 = r[1] + 0.55 * R;
  for (let k = 0; k < emit; k++) {
    const i = smoke.head; smoke.head = (smoke.head + 1) % SMOKE_CAP; smoke.n = Math.min(SMOKE_CAP, smoke.n + 1);
    const z = (k % 2 ? 0.35 : 0.7) * R, y = y0 + (y1 - y0) * ((Math.floor(k / 2) + Math.random()) / Math.ceil(emit / 2));
    smoke.X[3 * i] = x + (Math.random() - 0.5) * 0.002; smoke.X[3 * i + 1] = y; smoke.X[3 * i + 2] = z; smoke.age[i] = 0;
  }
}

function build(c) {
  cfg = c; smoke.n = 0; smoke.head = 0;
  const sp = getSpecies(c.species);
  const kin = { ...(c.kin || {}) };
  const base = { ...c, kin };
  if (c.mode !== 'tethered' && !sp.trims?.[c.aero]) {
    // no stored trim for this model: find one now (fast with the quasi-steady model)
    const tr = trim({ ...base, aero: 'qs', M: 6, N: 10, useTrim: false }, { cycles: 2 });
    Object.assign(kin, tr.kin);
  }
  sim = new FlightSim({ ...base, kin });
  if (c.mode !== 'tethered') {
    sim.controller = new FlightController({
      trim: { psiMean: sim.kin.p.psiMean, phiAmp: sim.kin.p.phiAmp, strokePlane: sim.kin.p.strokePlane, abdMean: sim.kin.p.abdMean },
      pitchRef: sim.kin.p.chiMean, speedRef: c.speedRef ?? sim.U * sim.dir[0], climbRef: sim.U * sim.dir[1],
      gains: sp.controlGains || {}, enabled: c.control !== false,
    });
  }
  // the quasi-steady lens rides along on the same kinematics for comparison (tethered only)
  shadow = c.compareQS && c.aero === 'uvlm' && c.mode === 'tethered' ? new FlightSim({ ...base, kin, aero: 'qs' }) : null;
  post('ready', {
    meta: {
      species: sp.name, latin: sp.latin, R: sp.R, mass: sim.mass, Sref: sim.Sref, cbar: sim.cbar, aspect: sim.aspect,
      dt: sim.dt, f: sim.kin.p.f, U: sim.U, climb: sim.climb * 180 / Math.PI, M: c.M, N: c.N, symmetric: sim.cfg.symmetric, aero: c.aero, mode: c.mode,
      kin: { ...sim.kin.p }, stepsPerCycle: sim.cfg.stepsPerCycle, wakeCycles: sim.cfg.wakeCycles,
    },
  });
  sendFrame();
}

function post(type, payload, transfer) { self.postMessage({ type, ...payload }, transfer || []); }

function sendFrame() {
  const s = sim, last = s.last;
  const surfaces = [], transfer = [];
  if (s.cfg.aero === 'uvlm') {
    for (const surf of s.surfaces) {
      const N = surf.N, nW = surf.nW;
      const wake = Float32Array.from(surf.W.subarray(0, nW * (N + 1) * 3));
      const wg = Float32Array.from(surf.Wg.subarray(0, Math.max(0, nW - 1) * N));
      const age = Float32Array.from(surf.Wbirth.subarray(0, Math.max(0, nW - 1)));
      const dcp = Float32Array.from(surf.dcp);
      const G = Float32Array.from(surf.G);
      surfaces.push({ N, M: surf.M, nW, wake, wg, age, dcp, G });
      transfer.push(wake.buffer, wg.buffer, age.buffer, dcp.buffer, G.buffer);
    }
  }
  let smokeOut = null;
  if (smoke.on && smoke.n) {
    const X = Float32Array.from(smoke.X.subarray(0, 3 * smoke.n)), age = Float32Array.from(smoke.age.subarray(0, smoke.n));
    smokeOut = { X, age, life: SMOKE_CAP / 6 * s.dt }; transfer.push(X.buffer, age.buffer);
  }
  const pose = last ? last.pose : s.poseAt(s.t);
  const tt = last ? last.rec.t : s.t;
  const kR = s.kin.at(tt, 1), kL = s.kin.at(tt, -1);
  post('frame', {
    t: tt, rec: last?.rec ?? null, qs: shadow?.last?.rec ?? null,
    pose: { r: pose.r, q: pose.q }, kR, kL, abd: kR.abd, surfaces,
    F: last?.res.F ?? [0, 0, 0], ctrl: s.controller ? { cmd: s.controller.cmd, meas: s.controller.meas } : null,
    timing: s.aero.timing ? { ...s.aero.timing } : null, nstep: s.n, smoke: smokeOut,
  }, transfer);
}

let lastTick = 0, msPerStep = 20;
function loop() {
  if (!running || !sim) return;
  const t0 = performance.now();
  let n = 0;
  // run steps for up to ~14 ms, then hand a frame over
  do {
    if (sim.t < gustUntil) sim.aero.wind = sim.cfg.wind.map((w, k) => w + gustVec[k]); else sim.aero.wind = sim.cfg.wind;
    sim.step();
    if (shadow) shadow.step();
    smokeStep();
    n++;
  } while (n < stepsPerFrame && performance.now() - t0 < 14 && !sim.crashed);
  if (sim.crashed) { running = false; sendFrame(); post('crash', { reason: sim.crashed.reason, t: sim.crashed.t }); return; }
  msPerStep = 0.8 * msPerStep + 0.2 * (performance.now() - t0) / n;
  sendFrame();
  post('stats', { msPerStep });
  const wait = Math.max(0, 1000 / targetRate - (performance.now() - lastTick));
  lastTick = performance.now();
  setTimeout(loop, wait);
}

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') { running = false; build(m.cfg); }
    else if (m.type === 'run') { running = m.on; if (running) loop(); }
    else if (m.type === 'step') { if (sim) { sim.step(); if (shadow) shadow.step(); sendFrame(); } }
    else if (m.type === 'set') {
      if (!sim) return;
      sim.kin.set(m.kin);
      if (shadow) shadow.kin.set(m.kin);
      if (sim.controller) {
        for (const k of ['psiMean', 'phiAmp', 'strokePlane', 'abdMean']) if (k in m.kin) sim.controller.trim[k] = m.kin[k];
        if ('speedRef' in m) sim.controller.ref.speed = m.speedRef;
      }
    }
    else if (m.type === 'pace') { stepsPerFrame = m.stepsPerFrame ?? stepsPerFrame; targetRate = m.rate ?? targetRate; }
    else if (m.type === 'smoke') { smoke.on = m.on; smoke.n = 0; smoke.head = 0; }
    else if (m.type === 'gust') { gustVec = m.wind; gustUntil = sim.t + m.duration; }
    else if (m.type === 'speedRef' && sim?.controller) sim.controller.ref.speed = m.value;
  } catch (err) {
    post('error', { message: String(err && err.stack || err) });
  }
};
