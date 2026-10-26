// Analytic benchmarks for the vortex-lattice core. Run: node --test tests/
// Each case uses wake panels about as long as the chordwise panels (U·dt ≈ c/M), the regime
// where UVLM is accurate; much shorter steps over-predict added-mass loads on coarse lattices.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWing, pose, theodorsenC, wagner } from './helpers.js';
import { UVLM } from '../src/uvlm.js';

const D = Math.PI / 180;

function solverFor(wing, steps, extra = {}) {
  return new UVLM({ surfaces: [wing], symmetric: true, rho: 1, lev: 'none', maxWakeRows: steps + 2, coreWing: 1e-6, coreWake: 1e-6, convect: false, ...extra });
}
function rootStripLift(s) { // sectional normal load at mid-span (the image plane), per unit span
  let L = 0; for (let i = 0; i < s.M; i++) L += s.load[i * s.N];
  return L / (s.local[5] - s.local[2]);
}

test('steady elliptic wing, AR 8: lift slope matches Jones-corrected lifting line within 2 %', () => {
  const wing = makeWing({ c: 1, b: 2 * Math.PI, M: 6, N: 12, shape: 'ellipse' });
  const steps = 160, dt = 2 / 6; // wake panels 2× the chord panels; steady result is insensitive
  const sv = solverFor(wing, steps);
  let r;
  for (let n = 0; n < steps; n++) { const t = n * dt; pose(wing, [t, 0, 0], [1, 0, 0], 5 * D); r = sv.step(t, dt, [t, 0, 0]); }
  const CLa = r.F[1] / (0.5 * wing.Sref) / (5 * D);
  // Jones: CLα = 2π/(E + 2/AR), E = semi-perimeter/span = 1.0346 for this ellipse
  const ref = 2 * Math.PI / (1.0346 + 2 / 8);
  assert.ok(Math.abs(CLa / ref - 1) < 0.02, `CLα ${CLa.toFixed(3)} vs ${ref.toFixed(3)}`);
  const CD = -r.F[0] / (0.5 * wing.Sref), CL = CLa * 5 * D;
  const e = CL * CL / (Math.PI * 8 * CD);
  assert.ok(e > 0.95 && e < 1.08, `span efficiency ${e.toFixed(3)} should be near 1`);
});

test('image (symmetric) solve equals the full two-sided solve', () => {
  const out = [];
  for (const sym of [true, false]) {
    const wing = makeWing({ c: 1, b: 4, M: 4, N: sym ? 6 : 12, sym, spacing: 'lin' });
    const sv = new UVLM({ surfaces: [wing], symmetric: sym, rho: 1, lev: 'suction', maxWakeRows: 40, coreWing: 1e-4, coreWake: 0.05 });
    let r;
    for (let n = 0; n < 30; n++) { const t = n * 0.25; pose(wing, [t, 0.1 * Math.sin(t), 0], [1, 0.1 * Math.cos(t), 0], 8 * D); r = sv.step(t, 0.25, [t, 0, 0]); }
    out.push(r);
  }
  for (const k of [0, 1]) assert.ok(Math.abs(out[0].F[k] - out[1].F[k]) < 1e-9 * (1 + Math.abs(out[1].F[k])), `F[${k}] ${out[0].F[k]} vs ${out[1].F[k]}`);
  assert.ok(Math.abs(out[0].M[2] - out[1].M[2]) < 1e-9 * (1 + Math.abs(out[1].M[2])));
});

test('impulsive start of a high-aspect-ratio wing follows the Wagner function', () => {
  const M = 8, wing = makeWing({ c: 1, b: 40, M, N: 16 });
  const dt = 1 / M, steps = Math.round(16 / (2 * dt)) + 1;
  const sv = solverFor(wing, steps);
  const L2D = Math.PI * 5 * D; // ½ρU²c · 2πα with ρ = U = c = 1
  const got = {};
  for (let n = 0; n < steps; n++) {
    const t = n * dt; pose(wing, [t, 0, 0], [1, 0, 0], 5 * D); sv.step(t, dt, [t, 0, 0]);
    const s = 2 * t; for (const sv_ of [4, 8, 16]) if (Math.abs(s - sv_) < 1e-9) got[sv_] = rootStripLift(sv.surfaces[0]) / L2D;
  }
  for (const s of [4, 8, 16]) assert.ok(Math.abs(got[s] - wagner(s)) < 0.03, `s=${s}: ${got[s].toFixed(3)} vs Wagner ${wagner(s).toFixed(3)}`);
});

for (const k of [0.25, 0.5, 1]) {
  test(`plunging wing at k = ${k} matches Theodorsen (amplitude 6 %, phase 3°)`, () => {
    const M = 8, c = 1, b = 0.5, U = 1, w = 2 * k * U / c, y0 = 0.02;
    const wing = makeWing({ c, b: 40, M, N: 12 });
    const T = 2 * Math.PI / w, spp = Math.round(T / (c / M / U)), dt = T / spp, steps = 4 * spp;
    const sv = solverFor(wing, steps);
    const C = theodorsenC(k);
    let re = 0, im = 0, reT = 0, imT = 0;
    for (let n = 0; n < steps; n++) {
      const t = n * dt, y = y0 * Math.sin(w * t), yd = y0 * w * Math.cos(w * t);
      pose(wing, [U * t, y, 0], [U, yd, 0], 0); sv.step(t, dt, [U * t, y, 0]);
      if (n < steps - spp) continue;
      const L = rootStripLift(sv.surfaces[0]);
      const Lth = Math.PI * b * b * y0 * w * w * Math.sin(w * t) - 2 * Math.PI * U * b * y0 * w * (C[0] * Math.cos(w * t) - C[1] * Math.sin(w * t));
      re += L * Math.cos(w * t); im += L * Math.sin(w * t); reT += Lth * Math.cos(w * t); imT += Lth * Math.sin(w * t);
    }
    const ratio = Math.hypot(re, im) / Math.hypot(reT, imT);
    let dph = (Math.atan2(im, re) - Math.atan2(imT, reT)) / D; dph = ((dph + 540) % 360) - 180;
    assert.ok(Math.abs(ratio - 1) < 0.06, `amplitude ratio ${ratio.toFixed(3)}`);
    assert.ok(Math.abs(dph) < 3, `phase error ${dph.toFixed(2)}°`);
  });
}

test('free wake: the sheet descends behind mid-span, the tips roll up, lift matches the rigid wake', () => {
  const M = 4, steps = 60, dt = 1 / M, CL = {};
  let wake;
  for (const convect of [true, false]) {
    const wing = makeWing({ c: 1, b: 4, M, N: 8 });
    const sv = new UVLM({ surfaces: [wing], symmetric: true, rho: 1, lev: 'none', maxWakeRows: steps + 2, coreWing: 1e-4, coreWake: 0.05, convect });
    let r;
    for (let n = 0; n < steps; n++) { const t = n * dt; pose(wing, [t, 0, 0], [1, 0, 0], 8 * D); r = sv.step(t, dt, [t, 0, 0]); }
    CL[convect] = r.F[1] / (0.5 * wing.Sref);
    if (convect) wake = sv.surfaces[0];
  }
  const s = wake, W = s.N + 1, row = 20, teY = -(1 + 0.25 / M) * Math.sin(8 * D);
  assert.ok(s.W[3 * (row * W) + 1] < teY - 0.05, 'mid-span wake has moved down (downwash)');
  assert.ok(s.W[3 * (row * W + s.N) + 2] < 0.99 * 2, 'the sheet edge has wrapped inboard around the tip vortex');
  assert.ok(Math.abs(CL[true] / CL[false] - 1) < 0.01, `free ${CL[true].toFixed(4)} vs rigid ${CL[false].toFixed(4)}`);
  assert.ok(Math.abs(CL[false] - 3.71 * 8 * D) < 0.03, `CL ${CL[false].toFixed(3)} for AR 4 at 8°`);
});
