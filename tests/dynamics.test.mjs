// Multibody checks: with no air and no gravity, flapping cannot change the system's linear or
// angular momentum (it only shuffles them between wings, abdomen and thorax); in free fall the
// body follows g exactly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { FlightSim } from '../src/sim.js';
import { qToMat, mv3, cross } from '../src/math.js';

function momenta(sim) {
  const parts = sim.partsAt(sim.t), R = qToMat(sim.state.q), { v, w, r } = sim.state;
  const wW = mv3(R, w);
  const items = [{ m: parts.mThorax, p: parts.pThorax, pd: [0, 0, 0] }];
  const { p, pd, mass, n } = parts.pts;
  for (let i = 0; i < n; i++) items.push({ m: mass[i], p: [p[3 * i], p[3 * i + 1], p[3 * i + 2]], pd: [pd[3 * i], pd[3 * i + 1], pd[3 * i + 2]] });
  let m = 0; const P = [0, 0, 0], c = [0, 0, 0];
  const pos = [], vel = [];
  for (const it of items) {
    const rw = mv3(R, it.p), xi = rw.map((x, k) => x + r[k]);
    const vi = v.map((x, k) => x + cross(wW, rw)[k] + mv3(R, it.pd)[k]);
    m += it.m; for (let k = 0; k < 3; k++) { P[k] += it.m * vi[k]; c[k] += it.m * xi[k]; }
    pos.push(xi); vel.push(vi);
  }
  const rc = c.map((x) => x / m), H = [0, 0, 0];
  items.forEach((it, i) => { const d = pos[i].map((x, k) => x - rc[k]), hc = cross(d, vel[i]); for (let k = 0; k < 3; k++) H[k] += it.m * hc[k]; });
  const Iw = mv3(R, mv3(parts.IThorax, w));
  for (let k = 0; k < 3; k++) H[k] += Iw[k];
  return { P, H, rc };
}

test('flapping in vacuum conserves linear and angular momentum', () => {
  for (const symmetric of [true, false]) {
    // fine substeps: this checks the equations, not the default time step
    const sim = new FlightSim({ aero: 'qs', mode: 'free', rho: 1e-15, gravity: 0, bodyDrag: 0, U: 0, symmetric, dynSubsteps: 16, kin: { dPhiAmp: symmetric ? 0 : 10, psiAmp: 10 } });
    sim.state.v = [0, 0, 0];
    const a = momenta(sim);
    sim.run(2.5);
    const b = momenta(sim);
    const Pscale = sim.mass * 0.5, Hscale = sim.mass * 0.5 * sim.sp.R;
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(b.P[k] - a.P[k]) < 1e-4 * Pscale, `P[${k}] ${a.P[k]} → ${b.P[k]} (sym ${symmetric})`);
      assert.ok(Math.abs(b.H[k] - a.H[k]) < 1e-4 * Hscale, `H[${k}] ${a.H[k]} → ${b.H[k]} (sym ${symmetric})`);
    }
  }
});

test('free fall follows g', () => {
  const still = { phiAmp: 0, alphaAmp: 0, twistAmp: 0, twistMean: 0, abdAmp: 0, psiAmp: 0, camberAmp: 0, chiAmp: 0 };
  const sim = new FlightSim({ aero: 'qs', mode: 'free', rho: 1e-15, bodyDrag: 0, kin: still });
  sim.state.v = [0, 0, 0]; sim.state.w = [0, 0, 0];
  sim.run(2);
  assert.ok(Math.abs(sim.state.v[1] + 9.81 * sim.t) < 1e-9);
  assert.ok(Math.abs(sim.state.r[1] + 0.5 * 9.81 * sim.t * sim.t) < 1e-9);
});

test('pitch-driven flight: with no air, the centre of mass falls freely whatever the pitching', () => {
  const sim = new FlightSim({ aero: 'qs', mode: 'driven', rho: 1e-15, bodyDrag: 0, dynSubsteps: 16 });
  const c0 = momenta(sim), m = sim.mass, v0 = c0.P.map((p) => p / m), x0 = c0.rc;
  sim.run(2);
  const c1 = momenta(sim), t = sim.t;
  const expect = [x0[0] + v0[0] * t, x0[1] + v0[1] * t - 0.5 * 9.81 * t * t, x0[2]];
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(c1.rc[k] - expect[k]) < 2e-6, `COM[${k}] ${c1.rc[k]} vs ${expect[k]}`);
});
