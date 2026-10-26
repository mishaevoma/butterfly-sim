// A butterfly wing pair side as one lifting surface: the forewing and hindwing overlap in flight
// and beat together, so their union is meshed as a single M×N lattice (chordwise lines run from
// the forewing costa to whichever margin is further back).
//
// Planform frame (right wing, at rest): x forward, y dorsal, z outboard, origin at the wing hinge,
// lengths in units of the wing length R (hinge to forewing apex). A planform is a list of
// stations [z, x_LE, x_TE], z rising from 0 to 1. Fore- and hindwing are given separately and
// united here.

import { clamp } from './math.js';

function interpStations(st, z, col) {
  if (z <= st[0][0]) return st[0][col];
  for (let k = 0; k < st.length - 1; k++) {
    const a = st[k], b = st[k + 1];
    if (z <= b[0]) { const t = (z - a[0]) / (b[0] - a[0] || 1); return a[col] + (b[col] - a[col]) * t; }
  }
  return st[st.length - 1][col];
}

// Union of the fore- and hindwing chords at span z (both in units of R).
export function unionChord(fore, hind, z) {
  const zf = fore[fore.length - 1][0], zh = hind ? hind[hind.length - 1][0] : -1;
  let le = -Infinity, te = Infinity, any = false;
  if (z <= zf + 1e-9) { le = Math.max(le, interpStations(fore, z, 1)); te = Math.min(te, interpStations(fore, z, 2)); any = true; }
  if (hind && z <= zh + 1e-9) { le = Math.max(le, interpStations(hind, z, 1)); te = Math.min(te, interpStations(hind, z, 2)); any = true; }
  return any ? [le, te] : null;
}

export class WingMesh {
  // spec: { fore, hind, R, M, N, spanPower, hinge: [x,y,z] body frame (right wing), mass, pivotX }
  constructor(spec) {
    const { R, M = 6, N = 12 } = spec;
    // a combined outline (fore + hind as they fly, overlapped) or the two wings to unite
    const fore = spec.outline || spec.fore, hind = spec.outline ? null : (spec.hind || null);
    this.spec = spec; this.R = R; this.M = M; this.N = N;
    this.pivotX = (spec.pivotX ?? 0) * R; // feathering axis, x in the planform frame
    this.rootFade = spec.rootFade ?? 0.3;   // span fraction over which feathering builds up
    this.zContact = spec.zContact ?? 0.4e-3; // m, half the closest gap the two wings may reach
    const zmax = Math.max(fore[fore.length - 1][0], hind ? hind[hind.length - 1][0] : 0);
    const p = spec.spanPower ?? 1; // >1 clusters stations towards the tip
    this.zs = []; this.les = []; this.tes = [];
    for (let j = 0; j <= N; j++) {
      const u = j / N, z = zmax * (1 - Math.pow(1 - u, p));
      const ch = unionChord(fore, hind, Math.min(z, zmax - 1e-9)) || [0, 0];
      this.zs.push(z * R); this.les.push(ch[0] * R); this.tes.push(ch[1] * R);
    }
    // the tip station closes to a point unless the planform says otherwise
    const n = (M + 1) * (N + 1);
    this.x0 = new Float64Array(n); this.z0 = new Float64Array(n); this.f0 = new Float64Array(n); this.c0 = new Float64Array(n);
    for (let i = 0; i <= M; i++) for (let j = 0; j <= N; j++) {
      const k = i * (N + 1) + j, f = i / M, c = this.les[j] - this.tes[j];
      this.x0[k] = this.les[j] - f * c; this.z0[k] = this.zs[j]; this.f0[k] = f; this.c0[k] = c;
    }
    // planform panel areas and the wing's mass points (uniform areal density)
    this.areas = new Float64Array(M * N);
    let A = 0;
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j, b = a + 1, c = a + N + 2, d = a + N + 1;
      const ar = 0.5 * Math.abs((this.x0[c] - this.x0[a]) * (this.z0[b] - this.z0[d]) - (this.z0[c] - this.z0[a]) * (this.x0[b] - this.x0[d]));
      this.areas[i * N + j] = ar; A += ar;
    }
    this.area = A; // one side, m²
    this.mass = spec.mass ?? 0;
    this.pm = new Float64Array(M * N);
    for (let k = 0; k < M * N; k++) this.pm[k] = this.mass * this.areas[k] / A;
    this.hinge = spec.hinge ?? [0, 0, 0];
    // geometric summaries
    let s1 = 0, s2 = 0;
    for (let j = 0; j < N; j++) { const zc = 0.5 * (this.zs[j] + this.zs[j + 1]), w = this.zs[j + 1] - this.zs[j], c = 0.5 * (this.les[j] - this.tes[j] + this.les[j + 1] - this.tes[j + 1]); s1 += c * w * zc; s2 += c * w * zc * zc; }
    this.r1 = s1 / A / R; this.r2 = Math.sqrt(s2 / A) / R; // non-dimensional radii of the first two area moments
    this.span = this.zs[N];
    this.meanChord = A / this.span;
  }

  // Corner positions in the body frame for one side's angles k (from Kinematics.at). side = −1
  // mirrors the result to the left wing. out: Float64Array((M+1)(N+1)·3).
  bodyPoints(k, side, out) {
    const n = this.x0.length, R = this.R, xp = this.pivotX;
    const cb = Math.cos(k.beta), sb = Math.sin(k.beta), cf = Math.cos(k.phi), sf = Math.sin(k.phi);
    const cs = Math.cos(k.psi), ss = Math.sin(k.psi);
    const [hx, hy, hz] = this.hinge;
    for (let m = 0; m < n; m++) {
      const f = this.f0[m], c = this.c0[m], z = this.z0[m], u = z / R;
      let x = this.x0[m];
      let y = k.camber * c * 4 * f * (1 - f) + k.bend * R * u * u;
      // feathering plus linear twist, about the spanwise axis through x = pivotX. The hindwing's
      // inner margin is held along the abdomen, so feathering fades in over the inner rootFade of
      // the span instead of swinging the long root chord through the body.
      const ramp = u >= this.rootFade ? 1 : (u / this.rootFade) * (u / this.rootFade) * (3 - 2 * u / this.rootFade);
      const a = k.alpha * ramp + k.twist * u, ca = Math.cos(a), sa = Math.sin(a);
      const dx = x - xp;
      x = xp + dx * ca - y * sa; y = dx * sa + y * ca;
      // sweep about the wing normal at the hinge
      const x2 = x * cs + z * ss, z2 = -x * ss + z * cs;
      // flap about the flapping axis
      const y3 = y * cf + z2 * sf, z3 = -y * sf + z2 * cf;
      // stroke-plane tilt (flapping axis nose-down from the body x axis)
      const x4 = x2 * cb + y3 * sb, y4 = -x2 * sb + y3 * cb;
      // wings meet but do not pass through each other at the clap: a smooth (softplus) floor keeps
      // a contact gap from the midline without a kink, so velocities and accelerations stay finite
      const zb = hz + z3, zc = this.zContact, sw = zc, e = (zb - zc) / sw;
      out[3 * m] = hx + x4; out[3 * m + 1] = hy + y4; out[3 * m + 2] = side * (e > 30 ? zb : zc + sw * Math.log1p(Math.exp(e)));
    }
    return out;
  }

  // Panel-centroid mass points from corner positions (any frame).
  massPoints(corners, out) {
    const { M, N } = this, W = N + 1;
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
      const a = 3 * (i * W + j), b = a + 3, c = 3 * ((i + 1) * W + j + 1), d = c - 3, o = 3 * (i * N + j);
      for (let q = 0; q < 3; q++) out[o + q] = 0.25 * (corners[a + q] + corners[b + q] + corners[c + q] + corners[d + q]);
    }
    return out;
  }
}

// A slender body: thorax (rigid with the body frame) and an abdomen hinged at the petiole that
// flexes in the sagittal plane. Mass points along the abdomen axis carry its inertia.
export class BodyModel {
  constructor(spec) {
    this.spec = spec;
    const { thorax, abdomen } = spec;
    this.mThorax = thorax.mass; this.pThorax = thorax.com; // body frame
    const a = thorax.length / 2, b = thorax.diameter / 2, m = thorax.mass;
    this.IThorax = thorax.inertia === 'cylinder'
      ? [m * b * b / 2, 0, 0, 0, m * (b * b / 4 + 4 * a * a / 12), 0, 0, 0, m * (b * b / 4 + 4 * a * a / 12)] // uniform cylinder
      : [m * (b * b + b * b) / 5, 0, 0, 0, m * (a * a + b * b) / 5, 0, 0, 0, m * (a * a + b * b) / 5];         // solid ellipsoid
    this.abd = abdomen; // { mass, joint: [x,y,z], length, diameter, rest (rad, + dorsal), points }
    const np = abdomen.points ?? 8;
    this.nAbd = np;
    this.abdW = new Float64Array(np);
    let wsum = 0;
    for (let k = 0; k < np; k++) {
      const s = (k + 0.5) / np;
      const w = abdomen.profile === 'uniform' ? 1 : Math.sin(Math.PI * clamp(s * 0.9 + 0.05)) + 0.3; // uniform cylinder, or fuller in the middle
      this.abdW[k] = w; wsum += w;
    }
    for (let k = 0; k < np; k++) this.abdW[k] *= abdomen.mass / wsum;
  }
  // Abdomen mass points (body frame) for flexion abd. The abdomen angle ζ = rest + abd is measured
  // from the body axis pointing backwards, + dorsal (tip up); out gets np·3 values.
  abdomenPoints(abd, out) {
    const { joint, length, rest = 0 } = this.abd, np = this.nAbd, z = rest + abd;
    const dx = -Math.cos(z), dy = Math.sin(z);
    for (let k = 0; k < np; k++) {
      const s = (k + 0.5) / np * length;
      out[3 * k] = joint[0] + dx * s; out[3 * k + 1] = joint[1] + dy * s; out[3 * k + 2] = 0;
    }
    return out;
  }
}
