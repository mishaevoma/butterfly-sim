// Free-flight dynamics of a body with prescribed internal motion (Newton–Euler about the body
// reference point O, the midpoint between the wing hinges).
//
// The thorax is a rigid body fixed to the body frame. Everything that moves relative to it (the
// wings' panel masses and the abdomen's mass points) is a cloud of point masses whose body-frame
// positions p_i(t), ṗ_i, p̈_i are known from the kinematics. With generalised speeds v (world
// velocity of O) and ω (body-frame angular velocity) the equations are linear in (v̇, ω̇):
//
//   [ m I        −R[c]× ] [v̇]   [ F − R Σ m_i b_i                       ]
//   [ [c]× Rᵀ    J + I_t ] [ω̇] = [ Rᵀ M_O − Σ m_i p_i × b_i − ω × I_t ω  ]
//
// with c = Σ m_i p_i, J = Σ m_i(|p_i|² 1 − p_i p_iᵀ), b_i = ω×(ω×p_i) + 2ω×ṗ_i + p̈_i, the thorax
// counted as a point mass at its centre plus its own inertia I_t. F and M_O (about O) are the
// external loads in the world frame, gravity included.

import { mv3, mtv3, qToMat, qDeriv, qNormalize, solveDense, cross } from './math.js';

export const G = 9.81;

// Assemble and solve for (v̇, ω̇). parts = { mThorax, pThorax, IThorax, pts: {m, p, pd, pdd, n} }
export function accelerations(state, parts, Fw, Mw, planar) {
  const R = qToMat(state.q), w = state.w;
  const { mThorax, pThorax, IThorax, pts } = parts;
  let m = mThorax;
  const c = [mThorax * pThorax[0], mThorax * pThorax[1], mThorax * pThorax[2]];
  const J = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const addJ = (mi, p) => {
    const p2 = p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
    J[0] += mi * (p2 - p[0] * p[0]); J[1] -= mi * p[0] * p[1]; J[2] -= mi * p[0] * p[2];
    J[4] += mi * (p2 - p[1] * p[1]); J[5] -= mi * p[1] * p[2]; J[8] += mi * (p2 - p[2] * p[2]);
  };
  addJ(mThorax, pThorax);
  const sb = [0, 0, 0], spb = [0, 0, 0];
  // thorax: b = ω×(ω×p)
  { const wp = cross(w, pThorax), b = cross(w, wp); for (let k = 0; k < 3; k++) sb[k] += mThorax * b[k]; const pb = cross(pThorax, b); for (let k = 0; k < 3; k++) spb[k] += mThorax * pb[k]; }
  const { p, pd, pdd, mass, n } = pts;
  for (let i = 0; i < n; i++) {
    const mi = mass[i]; if (!mi) continue;
    const o = 3 * i;
    const px = p[o], py = p[o + 1], pz = p[o + 2];
    m += mi; c[0] += mi * px; c[1] += mi * py; c[2] += mi * pz;
    addJ(mi, [px, py, pz]);
    // b = ω×(ω×p) + 2ω×ṗ + p̈
    const wpx = w[1] * pz - w[2] * py, wpy = w[2] * px - w[0] * pz, wpz = w[0] * py - w[1] * px;
    const vx = 2 * pd[o], vy = 2 * pd[o + 1], vz = 2 * pd[o + 2];
    const bx = (w[1] * wpz - w[2] * wpy) + (w[1] * vz - w[2] * vy) + pdd[o];
    const by = (w[2] * wpx - w[0] * wpz) + (w[2] * vx - w[0] * vz) + pdd[o + 1];
    const bz = (w[0] * wpy - w[1] * wpx) + (w[0] * vy - w[1] * vx) + pdd[o + 2];
    sb[0] += mi * bx; sb[1] += mi * by; sb[2] += mi * bz;
    spb[0] += mi * (py * bz - pz * by); spb[1] += mi * (pz * bx - px * bz); spb[2] += mi * (px * by - py * bx);
  }
  J[3] = J[1]; J[6] = J[2]; J[7] = J[5];
  const It = IThorax;
  const Itw = mv3(It, w), wItw = cross(w, Itw);
  // gravity on every mass: F += m g, M_O += (R c) × m... (c already mass-weighted)
  const g = [0, -G * (parts.gravity ?? 1), 0];
  const Rc = mv3(R, c);
  const F = [Fw[0] + m * g[0], Fw[1] + m * g[1], Fw[2] + m * g[2]];
  const Mg = cross(Rc, g);
  const MO = [Mw[0] + Mg[0], Mw[1] + Mg[1], Mw[2] + Mg[2]];
  const Rsb = mv3(R, sb), RtM = mtv3(R, MO);
  // 6×6 system
  const cx = [0, -c[2], c[1], c[2], 0, -c[0], -c[1], c[0], 0];
  const A = new Float64Array(36), rhs = new Float64Array(6);
  // −R [c]×
  const RC = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) RC[3 * i + j] = R[3 * i] * cx[j] + R[3 * i + 1] * cx[3 + j] + R[3 * i + 2] * cx[6 + j];
  // [c]× Rᵀ
  const CRt = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) CRt[3 * i + j] = cx[3 * i] * R[3 * j] + cx[3 * i + 1] * R[3 * j + 1] + cx[3 * i + 2] * R[3 * j + 2];
  for (let i = 0; i < 3; i++) {
    A[6 * i + i] = m;
    for (let j = 0; j < 3; j++) {
      A[6 * i + 3 + j] = -RC[3 * i + j];
      A[6 * (3 + i) + j] = CRt[3 * i + j];
      A[6 * (3 + i) + 3 + j] = J[3 * i + j] + It[3 * i + j];
    }
    rhs[i] = F[i] - Rsb[i];
    rhs[3 + i] = RtM[i] - spb[i] - wItw[i];
  }
  if (planar) {
    // longitudinal flight: lock Z translation, roll and yaw (rows/cols 2, 3, 4)
    for (const k of [2, 3, 4]) { for (let j = 0; j < 6; j++) { A[6 * k + j] = 0; A[6 * j + k] = 0; } A[6 * k + k] = 1; rhs[k] = 0; }
  }
  const x = solveDense(A, rhs, 6);
  return { vdot: [x[0], x[1], x[2]], wdot: [x[3], x[4], x[5]], mass: m, com: c.map((v) => v / m), Rc };
}

// Translational acceleration when the body's rotation is prescribed (ω, ω̇ in the body frame):
// m v̇ = F + R[c]×ω̇ − R Σ m_i b_i, gravity included. The moment balance is not used: whatever
// moment the prescribed pitching needs is supplied, as by the animal's own control.
export function translationalAccel(state, parts, Fw, wdot) {
  const R = qToMat(state.q), w = state.w;
  const { mThorax, pThorax, pts } = parts;
  let m = mThorax;
  const c = [mThorax * pThorax[0], mThorax * pThorax[1], mThorax * pThorax[2]];
  const sb = [0, 0, 0];
  { const b = cross(w, cross(w, pThorax)); for (let k = 0; k < 3; k++) sb[k] += mThorax * b[k]; }
  const { p, pd, pdd, mass, n } = pts;
  for (let i = 0; i < n; i++) {
    const mi = mass[i]; if (!mi) continue;
    const o = 3 * i, pi = [p[o], p[o + 1], p[o + 2]], vi = [2 * pd[o], 2 * pd[o + 1], 2 * pd[o + 2]];
    m += mi; for (let k = 0; k < 3; k++) c[k] += mi * pi[k];
    const b1 = cross(w, cross(w, pi)), b2 = cross(w, vi);
    for (let k = 0; k < 3; k++) sb[k] += mi * (b1[k] + b2[k] + pdd[o + k]);
  }
  const g = [0, -G * (parts.gravity ?? 1), 0];
  const cw = cross(wdot, c);             // ω̇ × c = −[c]× ω̇ … so +R[c]×ω̇ = −R(ω̇ × c)
  const Rsb = mv3(R, sb), Rcw = mv3(R, cw);
  return [0, 1, 2].map((k) => (Fw[k] + m * g[k] - Rcw[k] - Rsb[k]) / m);
}

// One RK4 step of the body state with external loads held constant over the step.
// partsAt(t) must return the parts with the internal motion evaluated at time t.
export function integrate(state, t, dt, partsAt, Fw, Mw, planar) {
  const deriv = (s, tt) => {
    const a = accelerations(s, partsAt(tt), Fw, Mw, planar);
    return { r: s.v, q: qDeriv(s.q, s.w), v: a.vdot, w: a.wdot };
  };
  const addS = (s, d, h) => ({
    r: s.r.map((x, k) => x + h * d.r[k]), q: qNormalize(s.q.map((x, k) => x + h * d.q[k])),
    v: s.v.map((x, k) => x + h * d.v[k]), w: s.w.map((x, k) => x + h * d.w[k]),
  });
  const k1 = deriv(state, t);
  const k2 = deriv(addS(state, k1, dt / 2), t + dt / 2);
  const k3 = deriv(addS(state, k2, dt / 2), t + dt / 2);
  const k4 = deriv(addS(state, k3, dt), t + dt);
  const comb = (key, n) => Array.from({ length: n }, (_, k) => state[key][k] + dt / 6 * (k1[key][k] + 2 * k2[key][k] + 2 * k3[key][k] + k4[key][k]));
  const out = { r: comb('r', 3), q: qNormalize(comb('q', 4)), v: comb('v', 3), w: comb('w', 3) };
  if (planar) { out.r[2] = 0; out.v[2] = 0; out.w[0] = 0; out.w[1] = 0; const q = out.q; out.q = qNormalize([q[0], 0, 0, q[3]]); }
  return out;
}

export { mv3 };
