// Small dense linear algebra, 3-vectors, rotations and quaternions.
//
// Frames used everywhere in this solver (right-handed, metres, seconds, kilograms):
//   world  X forward (the flight direction), Y up (against gravity), Z to the butterfly's right
//   body   x towards the head, y dorsal, z towards the right wing
// A positive rotation about +z is nose-up pitch, so lift is +Y and thrust is +X.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const TAU = 2 * Math.PI;

// ---------- 3-vectors as plain arrays (only outside the hot loops) ----------
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a) => { const n = norm(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };

// ---------- 3x3 matrices, row-major arrays of 9 ----------
export const I3 = () => [1, 0, 0, 0, 1, 0, 0, 0, 1];
export function mul3(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
    C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j];
  return C;
}
export const tr3 = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
export const mv3 = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]];
export const mtv3 = (A, v) => [A[0] * v[0] + A[3] * v[1] + A[6] * v[2], A[1] * v[0] + A[4] * v[1] + A[7] * v[2], A[2] * v[0] + A[5] * v[1] + A[8] * v[2]];
export function rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
export function rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
export function rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
export const skew = (v) => [0, -v[2], v[1], v[2], 0, -v[0], -v[1], v[0], 0];
// Angular velocity from R(t-h), R(t+h): skew(w) ≈ (R+ - R-)/(2h) · Rᵀ, expressed in the outer frame.
export function omegaFromRotations(Rm, Rp, R0, h) {
  const D = new Array(9);
  for (let k = 0; k < 9; k++) D[k] = (Rp[k] - Rm[k]) / (2 * h);
  const W = mul3(D, tr3(R0));
  return [0.5 * (W[7] - W[5]), 0.5 * (W[2] - W[6]), 0.5 * (W[3] - W[1])];
}

// ---------- quaternions [w, x, y, z], body -> world ----------
export const qIdentity = () => [1, 0, 0, 0];
export function qMul(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}
export function qNormalize(q) { const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]; }
export function qFromAxisAngle(ax, a) { const u = unit(ax), s = Math.sin(a / 2); return [Math.cos(a / 2), u[0] * s, u[1] * s, u[2] * s]; }
export function qToMat(q) {
  const [w, x, y, z] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
    2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
    2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
  ];
}
// q̇ = ½ q ⊗ (0, ω_body)
export function qDeriv(q, wb) { const d = qMul(q, [0, wb[0], wb[1], wb[2]]); return [0.5 * d[0], 0.5 * d[1], 0.5 * d[2], 0.5 * d[3]]; }
// Euler angles for a readout: yaw about Y, pitch about Z (nose-up +), roll about X, applied yaw-pitch-roll.
export function qToYPR(q) {
  const R = qToMat(q);
  const fwd = [R[0], R[3], R[6]]; // body x in world
  const pitch = Math.asin(Math.max(-1, Math.min(1, fwd[1])));
  const yaw = Math.atan2(-fwd[2], fwd[0]);
  const up = [R[1], R[4], R[7]]; // body y in world
  const right = [R[2], R[5], R[8]];
  const roll = Math.atan2(-right[1], up[1]);
  return { yaw, pitch, roll };
}

// ---------- dense LU with partial pivoting (row-major Float64Array n×n) ----------
export function luFactor(A, n, piv) {
  for (let i = 0; i < n; i++) piv[i] = i;
  for (let k = 0; k < n; k++) {
    let p = k, mx = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) { const v = Math.abs(A[i * n + k]); if (v > mx) { mx = v; p = i; } }
    if (mx === 0) throw new Error('singular matrix at column ' + k);
    if (p !== k) {
      for (let j = 0; j < n; j++) { const t = A[k * n + j]; A[k * n + j] = A[p * n + j]; A[p * n + j] = t; }
      const t = piv[k]; piv[k] = piv[p]; piv[p] = t;
    }
    const inv = 1 / A[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = (A[i * n + k] *= inv);
      if (f === 0) continue;
      const ri = i * n, rk = k * n;
      for (let j = k + 1; j < n; j++) A[ri + j] -= f * A[rk + j];
    }
  }
}
export function luSolve(LU, n, piv, b, x) {
  for (let i = 0; i < n; i++) x[i] = b[piv[i]];
  for (let i = 0; i < n; i++) { let s = x[i]; const ri = i * n; for (let j = 0; j < i; j++) s -= LU[ri + j] * x[j]; x[i] = s; }
  for (let i = n - 1; i >= 0; i--) { let s = x[i]; const ri = i * n; for (let j = i + 1; j < n; j++) s -= LU[ri + j] * x[j]; x[i] = s / LU[ri + i]; }
  return x;
}
export function solveDense(Ain, bin, n) {
  const A = Float64Array.from(Ain), piv = new Int32Array(n), x = new Float64Array(n);
  luFactor(A, n, piv);
  return luSolve(A, n, piv, Float64Array.from(bin), x);
}

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
