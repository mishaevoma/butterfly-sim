// Trim: find kinematic parameters for which a tethered run (steady forward speed, prescribed
// body motion) is in cycle-mean equilibrium: lift = weight, thrust = drag, and no pitching
// moment about the centre of mass. Newton iterations with a finite-difference Jacobian, then
// Broyden updates; every evaluation is a short simulation.

import { FlightSim } from './sim.js';
import { solveDense } from './math.js';

export const TRIM_UNKNOWNS = [
  { key: 'phiAmp', step: 4, lo: 40, hi: 175 },        // stroke amplitude → lift
  { key: 'strokePlane', step: 3, lo: -40, hi: 60 },   // stroke-plane tilt → thrust/drag
  { key: 'psiMean', step: 3, lo: -35, hi: 35 },       // mean sweep → pitch balance
];

export function residuals(cfg, x, unknowns, cycles) {
  const kin = { ...(cfg.kin || {}) };
  unknowns.forEach((u, i) => { kin[u.key] = x[i]; });
  const sim = new FlightSim({ ...cfg, kin, mode: 'tethered' });
  sim.run(cycles);
  const a = sim.averages(1), W = a.weight;
  return { r: [a.Fy / W - 1, a.Fx / W, a.Mcom / (W * sim.cbar)], a, sim };
}

export function trim(cfg, { unknowns = TRIM_UNKNOWNS, x0, cycles = 3, maxIter = 8, tol = 0.01, log = () => {} } = {}) {
  const n = unknowns.length;
  let x = x0 ? x0.slice() : unknowns.map((u) => (cfg.kin && u.key in cfg.kin) ? cfg.kin[u.key] : FlightSim.prototype.constructor.length && 0);
  if (!x0) {
    const probe = new FlightSim({ ...cfg, mode: 'tethered' });
    x = unknowns.map((u) => probe.kin.p[u.key]);
  }
  const clampX = (v) => v.map((xi, i) => Math.min(unknowns[i].hi, Math.max(unknowns[i].lo, xi)));
  let cur = residuals(cfg, x, unknowns, cycles), evals = 1;
  const norm = (r) => Math.hypot(...r);
  log({ iter: 0, x: x.slice(), r: cur.r, norm: norm(cur.r) });
  let J = null;
  for (let it = 1; it <= maxIter && norm(cur.r) > tol; it++) {
    if (!J) {
      J = new Float64Array(n * n);
      for (let j = 0; j < n; j++) {
        const xp = x.slice(); xp[j] += unknowns[j].step;
        const rp = residuals(cfg, xp, unknowns, cycles).r; evals++;
        for (let i = 0; i < n; i++) J[i * n + j] = (rp[i] - cur.r[i]) / unknowns[j].step;
      }
    }
    let dx;
    try { dx = Array.from(solveDense(J, cur.r.map((v) => -v), n)); } catch { J = null; break; }
    // damped step: halve until the residual drops
    let lam = 1, next, xn;
    for (let ls = 0; ls < 4; ls++) {
      xn = clampX(x.map((xi, i) => xi + lam * dx[i]));
      next = residuals(cfg, xn, unknowns, cycles); evals++;
      if (norm(next.r) < norm(cur.r)) break;
      lam *= 0.5;
    }
    // Broyden rank-one update of J with the step actually taken
    const s = xn.map((v, i) => v - x[i]), y = next.r.map((v, i) => v - cur.r[i]);
    const ss = s.reduce((a, v) => a + v * v, 0);
    if (ss > 1e-12 && norm(next.r) < norm(cur.r)) {
      const Js = Array.from({ length: n }, (_, i) => s.reduce((a, sj, j) => a + J[i * n + j] * sj, 0));
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) J[i * n + j] += (y[i] - Js[i]) * s[j] / ss;
    } else J = null; // poor step: rebuild the Jacobian next time
    if (norm(next.r) < norm(cur.r)) { x = xn; cur = next; }
    log({ iter: it, x: x.slice(), r: cur.r, norm: norm(cur.r), evals });
  }
  const kin = { ...(cfg.kin || {}) };
  unknowns.forEach((u, i) => { kin[u.key] = x[i]; });
  return { x, kin, r: cur.r, converged: norm(cur.r) <= tol, averages: cur.a, evals };
}
