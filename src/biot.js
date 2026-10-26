// Biot–Savart for straight vortex segments with a desingularised core.
//
// A segment buffer is a Float64Array with stride SEG: [ax, ay, az, bx, by, bz, Γ, rc²].
// The circulation Γ runs from A to B. The kernel is the standard
//   v = Γ/4π · (r1×r2)/(|r1×r2|² + rc²|r0|²) · r0·(r1/|r1| − r2/|r2|),
// where the rc²|r0|² term is a Scully/Vatistas n=1 core of radius rc (|r1×r2| = h|r0|, with h the
// distance from the line), so the swirl is Γh/(2π(h²+rc²)) instead of Γ/(2πh) near the filament.

export const SEG = 8;
const INV4PI = 1 / (4 * Math.PI);

export class SegmentBuffer {
  constructor(capacity = 1024) {
    this.data = new Float64Array(capacity * SEG);
    this.n = 0;
  }
  reset() { this.n = 0; }
  ensure(extra) {
    const need = (this.n + extra) * SEG;
    if (need > this.data.length) {
      const d = new Float64Array(Math.max(need, this.data.length * 2));
      d.set(this.data.subarray(0, this.n * SEG));
      this.data = d;
    }
  }
  push(ax, ay, az, bx, by, bz, g, rc2) {
    if (g === 0) return;
    this.ensure(1);
    const o = this.n * SEG, d = this.data;
    d[o] = ax; d[o + 1] = ay; d[o + 2] = az; d[o + 3] = bx; d[o + 4] = by; d[o + 5] = bz; d[o + 6] = g; d[o + 7] = rc2;
    this.n++;
  }
  // Append the mirror image of segments [from, to) across the plane Z = 0 (same node order, −Γ).
  mirror(from = 0, to = this.n) {
    const count = to - from;
    this.ensure(count);
    const d = this.data;
    for (let s = from; s < to; s++) {
      const o = s * SEG, q = this.n * SEG;
      d[q] = d[o]; d[q + 1] = d[o + 1]; d[q + 2] = -d[o + 2];
      d[q + 3] = d[o + 3]; d[q + 4] = d[o + 4]; d[q + 5] = -d[o + 5];
      d[q + 6] = -d[o + 6]; d[q + 7] = d[o + 7];
      this.n++;
    }
  }
}

// Velocity at one point, accumulated into out[k..k+2].
export function velocityAt(px, py, pz, seg, nseg, out, k) {
  let vx = 0, vy = 0, vz = 0;
  for (let s = 0, o = 0; s < nseg; s++, o += SEG) {
    const ax = seg[o], ay = seg[o + 1], az = seg[o + 2];
    const bx = seg[o + 3], by = seg[o + 4], bz = seg[o + 5];
    const r1x = px - ax, r1y = py - ay, r1z = pz - az;
    const r2x = px - bx, r2y = py - by, r2z = pz - bz;
    const cx = r1y * r2z - r1z * r2y, cy = r1z * r2x - r1x * r2z, cz = r1x * r2y - r1y * r2x;
    const r0x = bx - ax, r0y = by - ay, r0z = bz - az;
    const c2 = cx * cx + cy * cy + cz * cz + seg[o + 7] * (r0x * r0x + r0y * r0y + r0z * r0z);
    const r1 = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z);
    const r2 = Math.sqrt(r2x * r2x + r2y * r2y + r2z * r2z);
    if (c2 < 1e-30 || r1 < 1e-12 || r2 < 1e-12) continue;
    const f = seg[o + 6] * INV4PI * ((r0x * r1x + r0y * r1y + r0z * r1z) / r1 - (r0x * r2x + r0y * r2y + r0z * r2z) / r2) / c2;
    vx += f * cx; vy += f * cy; vz += f * cz;
  }
  out[k] += vx; out[k + 1] += vy; out[k + 2] += vz;
}

// Velocities at npts points (stride 3) from a segment buffer, accumulated into out (stride 3).
export function velocities(pts, npts, seg, nseg, out) {
  for (let i = 0; i < npts; i++) velocityAt(pts[3 * i], pts[3 * i + 1], pts[3 * i + 2], seg, nseg, out, 3 * i);
}

// Velocity induced at P by a unit-strength closed ring of 4 nodes (stride-3 array, offsets a..d),
// optionally plus its mirror image across Z = 0. Used to build the influence matrix.
export function ringVelocity(px, py, pz, X, ia, ib, ic, id, rc2, withImage, out) {
  out[0] = out[1] = out[2] = 0;
  segOnce(px, py, pz, X, ia, ib, rc2, 1, out);
  segOnce(px, py, pz, X, ib, ic, rc2, 1, out);
  segOnce(px, py, pz, X, ic, id, rc2, 1, out);
  segOnce(px, py, pz, X, id, ia, rc2, 1, out);
  if (withImage) {
    // The image ring has mirrored nodes (x, y, −z) in the same order and strength −Γ. With
    // M = diag(1, 1, −1), (Ma)×(Mb) = −M(a×b), so the image's velocity at P equals M·v_ring(MP):
    // evaluate the real ring at the mirrored point, then mirror the result.
    const t = [0, 0, 0];
    segOnce(px, py, -pz, X, ia, ib, rc2, 1, t);
    segOnce(px, py, -pz, X, ib, ic, rc2, 1, t);
    segOnce(px, py, -pz, X, ic, id, rc2, 1, t);
    segOnce(px, py, -pz, X, id, ia, rc2, 1, t);
    out[0] += t[0]; out[1] += t[1]; out[2] -= t[2];
  }
  return out;
}

function segOnce(px, py, pz, X, ia, ib, rc2, g, out) {
  const ax = X[ia], ay = X[ia + 1], az = X[ia + 2];
  const bx = X[ib], by = X[ib + 1], bz = X[ib + 2];
  const r1x = px - ax, r1y = py - ay, r1z = pz - az;
  const r2x = px - bx, r2y = py - by, r2z = pz - bz;
  const cx = r1y * r2z - r1z * r2y, cy = r1z * r2x - r1x * r2z, cz = r1x * r2y - r1y * r2x;
  const r0x = bx - ax, r0y = by - ay, r0z = bz - az;
  const c2 = cx * cx + cy * cy + cz * cz + rc2 * (r0x * r0x + r0y * r0y + r0z * r0z);
  const r1 = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z);
  const r2 = Math.sqrt(r2x * r2x + r2y * r2y + r2z * r2z);
  if (c2 < 1e-30 || r1 < 1e-12 || r2 < 1e-12) return;
  const f = g * INV4PI * ((r0x * r1x + r0y * r1y + r0z * r1z) / r1 - (r0x * r2x + r0y * r2y + r0z * r2z) / r2) / c2;
  out[0] += f * cx; out[1] += f * cy; out[2] += f * cz;
}
