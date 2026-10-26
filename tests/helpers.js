// Shared fixtures for the analytic benchmarks: flat rectangular or elliptic wings that move
// through still air (world frame), so the relative wind comes from the leading edge.

import { Surface, UVLM } from '../src/uvlm.js';

// Corner layout in the wing's own frame: x forward (LE at 0, TE at −c(z)), z spanwise.
// sym=true builds only z ∈ [0, b/2] and lets the solver add the image.
export function makeWing({ c = 1, b = 4, M = 6, N = 12, sym = true, shape = 'rect', spacing = 'cos' }) {
  const s = new Surface(M, N, 'test');
  const zs = [];
  for (let j = 0; j <= N; j++) {
    const u = j / N;
    if (sym) zs.push(0.5 * b * (spacing === 'cos' ? Math.sin(0.5 * Math.PI * u) : u));
    else zs.push(0.5 * b * (spacing === 'cos' ? -Math.cos(Math.PI * u) : 2 * u - 1));
  }
  const local = new Float64Array((M + 1) * (N + 1) * 3);
  for (let i = 0; i <= M; i++) for (let j = 0; j <= N; j++) {
    const z = zs[j];
    const cz = shape === 'ellipse' ? c * Math.sqrt(Math.max(0, 1 - (2 * z / b) ** 2)) : c;
    const xle = shape === "ellipse" ? 0.25 * (cz - c) : 0; // elliptic: straight quarter-chord line
    const o = 3 * (i * (N + 1) + j);
    local[o] = xle - (i / M) * cz; local[o + 1] = 0; local[o + 2] = z;
  }
  s.local = local;
  s.cref = c; s.b = b;
  s.Sref = shape === 'ellipse' ? Math.PI * b * c / 4 : b * c;
  return s;
}

// Rigid-body pose of a test wing: translate by pos, pitch nose-up by alpha about the LE (z axis).
export function pose(s, pos, vel, alpha, alphaDot = 0) {
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  const L = s.local;
  for (let o = 0; o < L.length; o += 3) {
    const x = L[o], y = L[o + 1], z = L[o + 2];
    const xr = x * ca - y * sa, yr = x * sa + y * ca;
    s.C[o] = pos[0] + xr; s.C[o + 1] = pos[1] + yr; s.C[o + 2] = pos[2] + z;
    // ω = alphaDot about +z: v = ω × r = (−ω yr, ω xr, 0)
    s.Cv[o] = vel[0] - alphaDot * yr; s.Cv[o + 1] = vel[1] + alphaDot * xr; s.Cv[o + 2] = vel[2];
  }
}

export function run({ wing, U = 1, alpha = 5 * Math.PI / 180, steps = 120, dtc = 1, solver = {}, motion }) {
  const dt = (wing.cref / wing.M) / U * dtc;
  const sv = new UVLM({ surfaces: [wing], symmetric: !!solver.symmetric, rho: 1, lev: 'none', maxWakeRows: steps + 2, coreWing: 1e-6, coreWake: 1e-6 * wing.cref, ...solver });
  const hist = [];
  for (let n = 0; n < steps; n++) {
    const t = n * dt;
    const m = motion ? motion(t) : { pos: [U * t, 0, 0], vel: [U, 0, 0], alpha, alphaDot: 0 };
    pose(wing, m.pos, m.vel, m.alpha, m.alphaDot);
    const r = sv.step(t, dt, m.pos);
    hist.push({ t, s: 2 * U * t / wing.cref, F: r.F, M: r.M, P: r.P, m });
  }
  return { hist, sv, dt };
}

// R. T. Jones's two-pole fit to Theodorsen's function.
export function theodorsenC(k) {
  // C(k) = 1 − 0.165/(1 − 0.0455 i/k) − 0.335/(1 − 0.3 i/k)
  const term = (a, b) => { // a / (1 − i b/k) = a (1 + i b/k)/(1 + b²/k²)
    const r = b / k, d = 1 + r * r; return [a / d, a * r / d];
  };
  const t1 = term(0.165, 0.0455), t2 = term(0.335, 0.3);
  return [1 - t1[0] - t2[0], -t1[1] - t2[1]];
}
export const wagner = (s) => 1 - 0.165 * Math.exp(-0.0455 * s) - 0.335 * Math.exp(-0.3 * s);
