// Unsteady vortex-lattice method (UVLM) with a free, force-free wake.
//
// Each lifting surface is an M×N lattice of vortex rings (Katz & Plotkin 2001, §13.12). Ring
// leading segments sit at the panel quarter chord, control points at three quarters. Every
// step the trailing-edge rings shed one row of wake rings (Kutta condition: the new wake ring
// takes the trailing-edge strength of the previous step) and every wake node then moves with
// the local velocity, so the wake rolls up on its own.
//
// Loads follow Simpson, Palacios & Murua (2013, AIAA J 51(7)): Kutta–Joukowski ρΓ(V×l) on
// every bound segment, with V the local relative velocity including all induced velocity,
// plus the unsteady term ρ(dΓ/dt)A n on every ring. A leading-edge-vortex correction rotates
// each strip's leading-edge suction onto the strip normal (Polhamus 1966 suction analogy);
// skin friction is a per-panel drag ½ρC_D0|V_t|V_t A.
//
// Sign notes. Panel corners are ordered (i,j),(i,j+1),(i+1,j+1),(i+1,j) and the panel normal is
// n = (n3−n1)×(n2−n4); for the right wing (i towards the trailing edge, j outboard) that is dorsal.
// The ring itself circulates clockwise seen from that side, so positive Γ carries lift and the
// velocity potential is higher by Γ on the dorsal side: the unsteady pressure load is
// +ρ(∂Γ/∂t)A n (checked against Wagner and Theodorsen in tests/). A symmetric solve keeps only
// Z > 0 surfaces and adds their images across Z = 0: same node order, strength −Γ.

import { SegmentBuffer, velocities, ringVelocity } from './biot.js';
import { luFactor, luSolve } from './math.js';

const LAMB_OSEEN = 1.25643;

export class Surface {
  constructor(M, N, name = 'wing') {
    this.M = M; this.N = N; this.name = name;
    const nn = (M + 1) * (N + 1), np = M * N;
    this.C = new Float64Array(nn * 3);   // panel corners, world
    this.Cv = new Float64Array(nn * 3);  // corner velocities, world (kinematic)
    this.R = new Float64Array(nn * 3);   // ring nodes (quarter-panel shifted)
    this.Rv = new Float64Array(nn * 3);
    this.cp = new Float64Array(np * 3);  // control points
    this.cpv = new Float64Array(np * 3);
    this.n = new Float64Array(np * 3);   // unit normals
    this.area = new Float64Array(np);
    this.G = new Float64Array(np);       // ring strengths
    this.Gprev = new Float64Array(np);
    this.Gprev2 = new Float64Array(np);
    this.dGdt = new Float64Array(np);
    this.load = new Float64Array(np);    // normal load per panel (N), for display
    this.dcp = new Float64Array(np);     // load / (area · q_ref), for display
    this.stripLE = new Float64Array(N);  // leading-edge suction per strip (N), before rotation
    // wake (allocated by the solver once maxWakeRows is known)
    this.nW = 0; // node rows in the wake (rings = nW − 1)
  }
  node(i, j) { return 3 * (i * (this.N + 1) + j); }
  allocWake(maxRows) {
    const N = this.N;
    this.wCap = maxRows + 2;
    this.W = new Float64Array(this.wCap * (N + 1) * 3);
    this.Wvel = new Float64Array(this.wCap * (N + 1) * 3);
    this.Wg = new Float64Array(this.wCap * N);
    this.Wbirth = new Float64Array(this.wCap);
    this.nW = 0;
  }
}

export class UVLM {
  constructor(opts = {}) {
    this.surfaces = opts.surfaces;
    this.symmetric = !!opts.symmetric;
    // symmetric solve only: false drops the other wing's influence (no clap, no wing–wing interaction)
    this.interact = opts.interact ?? true;
    this.rho = opts.rho ?? 1.2;
    this.nu = opts.nu ?? 1.5e-5;
    // Vortex cores. Bound segments use coreWing. A wake filament is born with the same core, so
    // the first wake row cancels the trailing-edge segment it sits on exactly, and then grows by
    // Squire's law rc² = rc0² + 4·1.256·δ·ν·age. Rolling the wake up uses at least coreWake, so
    // neighbouring wake filaments stay smooth.
    this.coreWing = opts.coreWing ?? 1e-4;        // m
    this.coreWake = opts.coreWake ?? 1e-3;        // m, floor for wake-on-wake roll-up only
    this.coreGrowth = opts.coreGrowth ?? 1;       // δ, eddy-viscosity factor in Squire's law
    this.maxWakeRows = opts.maxWakeRows ?? 120;
    this.freeRows = opts.freeRows ?? Infinity;    // rows older than this stop rolling up
    this.lev = opts.lev ?? 'suction';             // 'suction' | 'none'
    this.kv = opts.kv ?? 1;                       // fraction of leading-edge suction turned into normal force
    this.cd0 = opts.cd0 ?? 0;                     // skin-friction drag coefficient per panel
    this.wind = opts.wind ?? [0, 0, 0];
    this.qref = opts.qref ?? 1;                   // dynamic pressure used for the dcp display
    this.convect = opts.convect ?? true;
    this.ddt = opts.ddt ?? 'bdf2';                // dΓ/dt scheme: 'bdf1' | 'bdf2'
    for (const s of this.surfaces) s.allocWake(this.maxWakeRows);
    this.np = this.surfaces.reduce((a, s) => a + s.M * s.N, 0);
    this.A = new Float64Array(this.np * this.np);
    this.piv = new Int32Array(this.np);
    this.rhs = new Float64Array(this.np);
    this.sol = new Float64Array(this.np);
    this.segs = new SegmentBuffer(4096);
    this.segsB = new SegmentBuffer(4096);
    this.nstep = 0;
    this.t = 0;
    this.timing = { matrix: 0, induced: 0, forces: 0, convect: 0 };
  }

  // ---- geometry derived from the corners the caller set (C, Cv) ----
  prepare(s) {
    const { M, N, C, Cv, R, Rv, cp, cpv, n, area } = s;
    const W = N + 1;
    for (let i = 0; i <= M; i++) {
      // ring row i: a quarter panel behind corner row i; the last row a quarter panel past the TE
      const i0 = i < M ? i : M - 1, i1 = i < M ? i + 1 : M, f = i < M ? 0.25 : 1.25;
      for (let j = 0; j <= N; j++) {
        const a = 3 * (i0 * W + j), b = 3 * (i1 * W + j), o = 3 * (i * W + j);
        for (let k = 0; k < 3; k++) {
          R[o + k] = C[a + k] + f * (C[b + k] - C[a + k]);
          Rv[o + k] = Cv[a + k] + f * (Cv[b + k] - Cv[a + k]);
        }
      }
    }
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
      const p = i * N + j, o = 3 * p;
      const c1 = 3 * (i * W + j), c2 = 3 * (i * W + j + 1), c3 = 3 * ((i + 1) * W + j + 1), c4 = 3 * ((i + 1) * W + j);
      for (let k = 0; k < 3; k++) {
        cp[o + k] = 0.5 * ((C[c1 + k] + 0.75 * (C[c4 + k] - C[c1 + k])) + (C[c2 + k] + 0.75 * (C[c3 + k] - C[c2 + k])));
        cpv[o + k] = 0.5 * ((Cv[c1 + k] + 0.75 * (Cv[c4 + k] - Cv[c1 + k])) + (Cv[c2 + k] + 0.75 * (Cv[c3 + k] - Cv[c2 + k])));
      }
      const ax = C[c3] - C[c1], ay = C[c3 + 1] - C[c1 + 1], az = C[c3 + 2] - C[c1 + 2];
      const bx = C[c2] - C[c4], by = C[c2 + 1] - C[c4 + 1], bz = C[c2 + 2] - C[c4 + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const nm = Math.hypot(nx, ny, nz) || 1e-30;
      area[p] = 0.5 * nm;
      n[o] = nx / nm; n[o + 1] = ny / nm; n[o + 2] = nz / nm;
    }
  }

  wakeCore2(s, row, floor2) {
    const age = Math.max(0, this.t - s.Wbirth[row]);
    return Math.max(floor2, this.coreWing * this.coreWing + 4 * LAMB_OSEEN * this.coreGrowth * this.nu * age);
  }

  // Unique segments of every wake lattice with their net strengths. floor2: minimum core².
  pushWakeSegments(buf, floor2 = 0) {
    for (const s of this.surfaces) {
      const N = s.N, W = N + 1, X = s.W, G = s.Wg, rows = s.nW - 1;
      if (rows < 1) continue;
      for (let r = 0; r <= rows; r++) { // spanwise lines between ring rows r−1 and r
        const rc2 = this.wakeCore2(s, Math.min(r, rows - 1), floor2);
        for (let j = 0; j < N; j++) {
          const g = (r < rows ? G[r * N + j] : 0) - (r > 0 ? G[(r - 1) * N + j] : 0);
          const a = 3 * (r * W + j), b = a + 3;
          buf.push(X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], g, rc2);
        }
      }
      for (let r = 0; r < rows; r++) { // chordwise legs, directed downstream (row r → r+1)
        const rc2 = this.wakeCore2(s, r, floor2);
        for (let c = 0; c <= N; c++) {
          const g = (c > 0 ? G[r * N + c - 1] : 0) - (c < N ? G[r * N + c] : 0);
          const a = 3 * (r * W + c), b = 3 * ((r + 1) * W + c);
          buf.push(X[a], X[a + 1], X[a + 2], X[b], X[b + 1], X[b + 2], g, rc2);
        }
      }
    }
  }

  // Unique bound segments of every wing lattice (the TE line carries only −Γ_TE; the wake's
  // first spanwise line lies on top of it with +Γ_w0, so the sum is the net shed strength).
  pushBoundSegments(buf, floor2 = 0) {
    const rc2 = Math.max(floor2, this.coreWing * this.coreWing);
    for (const s of this.surfaces) {
      const { M, N, R, G } = s, W = N + 1;
      for (let r = 0; r <= M; r++) for (let j = 0; j < N; j++) {
        const g = (r < M ? G[r * N + j] : 0) - (r > 0 ? G[(r - 1) * N + j] : 0);
        const a = 3 * (r * W + j), b = a + 3;
        buf.push(R[a], R[a + 1], R[a + 2], R[b], R[b + 1], R[b + 2], g, rc2);
      }
      for (let i = 0; i < M; i++) for (let c = 0; c <= N; c++) {
        const g = (c > 0 ? G[i * N + c - 1] : 0) - (c < N ? G[i * N + c] : 0);
        const a = 3 * (i * W + c), b = 3 * ((i + 1) * W + c);
        buf.push(R[a], R[a + 1], R[a + 2], R[b], R[b + 1], R[b + 2], g, rc2);
      }
    }
  }

  // Shed: the wake gains a new first node row on the current trailing edge, and the ring
  // between it and the old first row (already convected) takes last step's TE strength.
  shed() {
    for (const s of this.surfaces) {
      const { M, N, R } = s, W = N + 1, rowLen = 3 * W;
      const teOff = 3 * (M * W);
      if (s.nW === 0) continue;
      if (s.nW >= this.maxWakeRows + 1) s.nW = this.maxWakeRows; // drop the oldest row
      s.W.copyWithin(rowLen, 0, s.nW * rowLen);
      s.Wvel.copyWithin(rowLen, 0, s.nW * rowLen);
      s.Wg.copyWithin(N, 0, (s.nW - 1) * N);
      s.Wbirth.copyWithin(1, 0, s.nW - 1);
      for (let k = 0; k < rowLen; k++) { s.W[k] = R[teOff + k]; s.Wvel[k] = 0; }
      for (let j = 0; j < N; j++) s.Wg[j] = s.Gprev[(M - 1) * N + j];
      s.Wbirth[0] = this.t;
      s.nW++;
    }
  }

  step(t, dt, ref = [0, 0, 0]) {
    this.t = t;
    const surf = this.surfaces, sym = this.symmetric, wind = this.wind;
    for (const s of surf) { s.Gprev2.set(s.Gprev); s.Gprev.set(s.G); this.prepare(s); }
    if (this.nstep > 0) this.shed();

    // ---- right-hand side: kinematic + wake-induced normal velocity ----
    let tic = now();
    const segs = this.segs; segs.reset();
    this.pushWakeSegments(segs);
    if (sym && this.interact) segs.mirror(0, segs.n);
    const nWakeSeg = segs.n;
    const cps = new Float64Array(this.np * 3), cpv = new Float64Array(this.np * 3), nrm = new Float64Array(this.np * 3);
    { let o = 0; for (const s of surf) { cps.set(s.cp, o); cpv.set(s.cpv, o); nrm.set(s.n, o); o += s.cp.length; } }
    const vw = new Float64Array(this.np * 3);
    if (nWakeSeg) velocities(cps, this.np, segs.data, nWakeSeg, vw);
    for (let i = 0; i < this.np; i++) {
      const o = 3 * i;
      this.rhs[i] = -((wind[0] + vw[o] - cpv[o]) * nrm[o] + (wind[1] + vw[o + 1] - cpv[o + 1]) * nrm[o + 1] + (wind[2] + vw[o + 2] - cpv[o + 2]) * nrm[o + 2]);
    }
    this.timing.induced += now() - tic;

    // ---- influence matrix of every bound ring on every control point ----
    tic = now();
    const A = this.A, np = this.np, rc2w = this.coreWing * this.coreWing, v = [0, 0, 0];
    let col = 0;
    for (const s of surf) {
      const { M, N, R } = s, W = N + 1;
      for (let i = 0; i < M; i++) for (let j = 0; j < N; j++, col++) {
        const a = 3 * (i * W + j), b = 3 * (i * W + j + 1), c = 3 * ((i + 1) * W + j + 1), d = 3 * ((i + 1) * W + j);
        for (let r = 0; r < np; r++) {
          const o = 3 * r;
          ringVelocity(cps[o], cps[o + 1], cps[o + 2], R, a, b, c, d, rc2w, sym && this.interact, v);
          A[r * np + col] = v[0] * nrm[o] + v[1] * nrm[o + 1] + v[2] * nrm[o + 2];
        }
      }
    }
    luFactor(A, np, this.piv);
    luSolve(A, np, this.piv, this.rhs, this.sol);
    { let o = 0; for (const s of surf) { s.G.set(this.sol.subarray(o, o + s.M * s.N)); o += s.M * s.N; } }
    for (const s of surf) {
      // dΓ/dt: first step none (no history), then backward differences, second order once possible
      const bdf2 = this.ddt === 'bdf2' && this.nstep > 1 && Math.abs(dt - this.dtPrev) < 1e-9 * dt;
      for (let p = 0; p < s.G.length; p++) {
        s.dGdt[p] = this.nstep === 0 ? 0 : bdf2 ? (3 * s.G[p] - 4 * s.Gprev[p] + s.Gprev2[p]) / (2 * dt) : (s.G[p] - s.Gprev[p]) / dt;
      }
    }
    this.dtPrev = dt;
    this.timing.matrix += now() - tic;

    // A first step leaves no wake yet; give it a node row on the trailing edge to convect.
    for (const s of surf) if (s.nW === 0) {
      const W = s.N + 1;
      s.W.set(s.R.subarray(3 * s.M * W, 3 * (s.M + 1) * W), 0);
      s.Wbirth[0] = t; s.nW = 1;
    }

    // ---- induced velocity at bound-segment midpoints (wing view: wake cores by age) ----
    tic = now();
    const nb0 = segs.n;
    this.pushBoundSegments(segs);
    if (sym && this.interact) segs.mirror(nb0, segs.n);
    let nMid = 0;
    for (const s of surf) nMid += (s.M + 1) * s.N + s.M * (s.N + 1);
    const mids = new Float64Array(nMid * 3);
    let q = 0;
    for (const s of surf) {
      const { M, N, R } = s, W = N + 1;
      for (let r = 0; r <= M; r++) for (let j = 0; j < N; j++, q += 3) {
        const a = 3 * (r * W + j), b = a + 3;
        mids[q] = 0.5 * (R[a] + R[b]); mids[q + 1] = 0.5 * (R[a + 1] + R[b + 1]); mids[q + 2] = 0.5 * (R[a + 2] + R[b + 2]);
      }
      for (let i = 0; i < M; i++) for (let c = 0; c <= N; c++, q += 3) {
        const a = 3 * (i * W + c), b = 3 * ((i + 1) * W + c);
        mids[q] = 0.5 * (R[a] + R[b]); mids[q + 1] = 0.5 * (R[a + 1] + R[b + 1]); mids[q + 2] = 0.5 * (R[a + 2] + R[b + 2]);
      }
    }
    const vel = new Float64Array(nMid * 3);
    velocities(mids, nMid, segs.data, segs.n, vel);
    this.timing.induced += now() - tic;

    // ---- loads ----
    tic = now();
    const out = this.loads(vel, ref);
    this.timing.forces += now() - tic;

    // ---- wake roll-up (wake view: every core at least coreWake) ----
    tic = now();
    const liveRows = []; // wake node rows that roll up this step
    let nLive = 0;
    for (const s of surf) { const live = this.convect ? Math.min(s.nW, this.freeRows) : 0; liveRows.push(live); nLive += live * (s.N + 1); }
    if (nLive > 0) {
      const segsB = this.segsB, floor2 = this.coreWake * this.coreWake;
      segsB.reset();
      this.pushWakeSegments(segsB, floor2);
      this.pushBoundSegments(segsB, floor2);
      if (sym && this.interact) segsB.mirror(0, segsB.n);
      const pts = new Float64Array(nLive * 3);
      q = 0;
      surf.forEach((s, k) => { const len = liveRows[k] * (s.N + 1) * 3; pts.set(s.W.subarray(0, len), q); q += len; });
      const vw2 = new Float64Array(nLive * 3);
      velocities(pts, nLive, segsB.data, segsB.n, vw2);
      q = 0;
      surf.forEach((s, k) => {
        const len = liveRows[k] * (s.N + 1) * 3, X = s.W, V = s.Wvel;
        for (let m = 0; m < len; m += 3) {
          const ux = wind[0] + vw2[q + m], uy = wind[1] + vw2[q + m + 1], uz = wind[2] + vw2[q + m + 2];
          // second-order Adams–Bashforth where the node has a previous velocity
          const fresh = V[m] === 0 && V[m + 1] === 0 && V[m + 2] === 0;
          X[m] += dt * (fresh ? ux : 1.5 * ux - 0.5 * V[m]);
          X[m + 1] += dt * (fresh ? uy : 1.5 * uy - 0.5 * V[m + 1]);
          X[m + 2] += dt * (fresh ? uz : 1.5 * uz - 0.5 * V[m + 2]);
          V[m] = ux; V[m + 1] = uy; V[m + 2] = uz;
        }
        q += len;
        if (sym && this.interact) for (let m = 2; m < len; m += 3) if (X[m] < 0) X[m] = 0; // nothing crosses the mirror plane
      });
    }
    this.timing.convect += now() - tic;

    this.nstep++;
    return out;
  }

  // Kutta–Joukowski on bound segments + unsteady ring term + LE suction analogy + friction.
  loads(vel, ref) {
    const rho = this.rho, wind = this.wind;
    const res = { F: [0, 0, 0], M: [0, 0, 0], P: 0, perSurface: [] };
    let q = 0;
    for (const s of this.surfaces) {
      const { M, N, R, Rv, G, n, area, cp, cpv } = s, W = N + 1;
      const F = [0, 0, 0], Mo = [0, 0, 0];
      let P = 0, suctionTotal = 0;
      const strip = new Float64Array(N * 3);
      s.load.fill(0);
      const addAt = (px, py, pz, fx, fy, fz, vx, vy, vz) => {
        F[0] += fx; F[1] += fy; F[2] += fz;
        const rx = px - ref[0], ry = py - ref[1], rz = pz - ref[2];
        Mo[0] += ry * fz - rz * fy; Mo[1] += rz * fx - rx * fz; Mo[2] += rx * fy - ry * fx;
        P -= fx * vx + fy * vy + fz * vz;
      };
      // spanwise segments
      for (let r = 0; r <= M; r++) for (let j = 0; j < N; j++, q += 3) {
        let g = (r < M ? G[r * N + j] : 0) - (r > 0 ? G[(r - 1) * N + j] : 0);
        if (r === M && s.nW > 1) g += s.Wg[j];
        const a = 3 * (r * W + j), b = a + 3;
        const lx = R[b] - R[a], ly = R[b + 1] - R[a + 1], lz = R[b + 2] - R[a + 2];
        const kvx = 0.5 * (Rv[a] + Rv[b]), kvy = 0.5 * (Rv[a + 1] + Rv[b + 1]), kvz = 0.5 * (Rv[a + 2] + Rv[b + 2]);
        const ux = wind[0] + vel[q] - kvx, uy = wind[1] + vel[q + 1] - kvy, uz = wind[2] + vel[q + 2] - kvz;
        const fx = rho * g * (uy * lz - uz * ly), fy = rho * g * (uz * lx - ux * lz), fz = rho * g * (ux * ly - uy * lx);
        addAt(0.5 * (R[a] + R[b]), 0.5 * (R[a + 1] + R[b + 1]), 0.5 * (R[a + 2] + R[b + 2]), fx, fy, fz, kvx, kvy, kvz);
        strip[3 * j] += fx; strip[3 * j + 1] += fy; strip[3 * j + 2] += fz;
        // display load: half to the ring ahead, half to the ring behind (all of it at the edges)
        if (r < M) s.load[r * N + j] += (r > 0 ? 0.5 : 1) * (fx * n[3 * (r * N + j)] + fy * n[3 * (r * N + j) + 1] + fz * n[3 * (r * N + j) + 2]);
        if (r > 0) { const p = (r - 1) * N + j; s.load[p] += (r < M ? 0.5 : 1) * (fx * n[3 * p] + fy * n[3 * p + 1] + fz * n[3 * p + 2]); }
      }
      // chordwise segments
      for (let i = 0; i < M; i++) for (let c = 0; c <= N; c++, q += 3) {
        const g = (c > 0 ? G[i * N + c - 1] : 0) - (c < N ? G[i * N + c] : 0);
        const a = 3 * (i * W + c), b = 3 * ((i + 1) * W + c);
        const lx = R[b] - R[a], ly = R[b + 1] - R[a + 1], lz = R[b + 2] - R[a + 2];
        const kvx = 0.5 * (Rv[a] + Rv[b]), kvy = 0.5 * (Rv[a + 1] + Rv[b + 1]), kvz = 0.5 * (Rv[a + 2] + Rv[b + 2]);
        const ux = wind[0] + vel[q] - kvx, uy = wind[1] + vel[q + 1] - kvy, uz = wind[2] + vel[q + 2] - kvz;
        const fx = rho * g * (uy * lz - uz * ly), fy = rho * g * (uz * lx - ux * lz), fz = rho * g * (ux * ly - uy * lx);
        addAt(0.5 * (R[a] + R[b]), 0.5 * (R[a + 1] + R[b + 1]), 0.5 * (R[a + 2] + R[b + 2]), fx, fy, fz, kvx, kvy, kvz);
        for (const jj of [c - 1, c]) if (jj >= 0 && jj < N) {
          strip[3 * jj] += 0.5 * fx; strip[3 * jj + 1] += 0.5 * fy; strip[3 * jj + 2] += 0.5 * fz;
          const p = i * N + jj; s.load[p] += 0.5 * (fx * n[3 * p] + fy * n[3 * p + 1] + fz * n[3 * p + 2]);
        }
      }
      // unsteady term and skin friction, per ring
      for (let p = 0; p < M * N; p++) {
        const o = 3 * p, k = rho * s.dGdt[p] * area[p];
        let fx = k * n[o], fy = k * n[o + 1], fz = k * n[o + 2];
        s.load[p] += k;
        if (this.cd0 > 0) {
          // relative air velocity at the control point, without induced velocity (cheap and the
          // induced part is small next to flapping speed); tangential part only
          let ux = wind[0] - cpv[o], uy = wind[1] - cpv[o + 1], uz = wind[2] - cpv[o + 2];
          const un = ux * n[o] + uy * n[o + 1] + uz * n[o + 2];
          ux -= un * n[o]; uy -= un * n[o + 1]; uz -= un * n[o + 2];
          const um = Math.hypot(ux, uy, uz), kd = 0.5 * rho * this.cd0 * um * area[p];
          fx += kd * ux; fy += kd * uy; fz += kd * uz;
        }
        addAt(cp[o], cp[o + 1], cp[o + 2], fx, fy, fz, cpv[o], cpv[o + 1], cpv[o + 2]);
        if (this.cd0 > 0) { /* friction counted in the strip only through F; strips hold KJ only */ }
      }
      // leading-edge suction analogy, per strip
      for (let j = 0; j < N; j++) {
        const le0 = 3 * j, le1 = 3 * (j + 1), te0 = 3 * (M * W + j), te1 = 3 * (M * W + j + 1);
        let tx = 0.5 * (R[le0] + R[le1] - R[te0] - R[te1]), ty = 0.5 * (R[le0 + 1] + R[le1 + 1] - R[te0 + 1] - R[te1 + 1]), tz = 0.5 * (R[le0 + 2] + R[le1 + 2] - R[te0 + 2] - R[te1 + 2]);
        let nx = 0, ny = 0, nz = 0;
        for (let i = 0; i < M; i++) { const o = 3 * (i * N + j); nx += n[o]; ny += n[o + 1]; nz += n[o + 2]; }
        // make the chord direction exactly in-plane
        const nm = Math.hypot(nx, ny, nz) || 1; nx /= nm; ny /= nm; nz /= nm;
        const tn = tx * nx + ty * ny + tz * nz; tx -= tn * nx; ty -= tn * ny; tz -= tn * nz;
        const tm = Math.hypot(tx, ty, tz) || 1; tx /= tm; ty /= tm; tz /= tm;
        const fx = strip[3 * j], fy = strip[3 * j + 1], fz = strip[3 * j + 2];
        const S = fx * tx + fy * ty + fz * tz, Nn = fx * nx + fy * ny + fz * nz;
        s.stripLE[j] = S;
        suctionTotal += S;
        if (this.lev === 'suction' && this.kv > 0) {
          const sg = Nn >= 0 ? 1 : -1, mag = this.kv * Math.abs(S);
          const dfx = -this.kv * S * tx + sg * mag * nx, dfy = -this.kv * S * ty + sg * mag * ny, dfz = -this.kv * S * tz + sg * mag * nz;
          const a = 3 * j, b = a + 3; // leading-edge bound segment of this strip
          addAt(0.5 * (R[a] + R[b]), 0.5 * (R[a + 1] + R[b + 1]), 0.5 * (R[a + 2] + R[b + 2]), dfx, dfy, dfz,
            0.5 * (Rv[a] + Rv[b]), 0.5 * (Rv[a + 1] + Rv[b + 1]), 0.5 * (Rv[a + 2] + Rv[b + 2]));
          s.load[j] += sg * mag; // shows the vortex lift on the leading-edge row
        }
      }
      for (let p = 0; p < M * N; p++) s.dcp[p] = s.load[p] / (area[p] * this.qref);
      res.perSurface.push({ name: s.name, F, M: Mo, P, suction: suctionTotal });
      for (let k = 0; k < 3; k++) { res.F[k] += F[k]; res.M[k] += Mo[k]; }
      res.P += P;
    }
    if (this.symmetric) {
      // the mirrored wing: Fx, Fy double, Fz cancels; Mz doubles, Mx and My cancel
      res.F = [2 * res.F[0], 2 * res.F[1], 0];
      res.M = [0, 0, 2 * res.M[2]];
      res.P *= 2;
    }
    return res;
  }

  // Velocity at arbitrary points (for tracers or diagnostics), from everything shed so far.
  probe(pts, npts, floor2 = this.coreWake * this.coreWake) {
    const segs = this.segsP || (this.segsP = new SegmentBuffer(this.segs.n + 16));
    segs.reset();
    this.pushWakeSegments(segs, floor2);
    this.pushBoundSegments(segs, floor2);
    if (this.symmetric && this.interact) segs.mirror(0, segs.n);
    const out = new Float64Array(npts * 3);
    velocities(pts, npts, segs.data, segs.n, out);
    for (let i = 0; i < npts; i++) { out[3 * i] += this.wind[0]; out[3 * i + 1] += this.wind[1]; out[3 * i + 2] += this.wind[2]; }
    return out;
  }

  totalCirculation() { // sum of all ring strengths shed into the wake (diagnostic)
    let g = 0;
    for (const s of this.surfaces) for (let k = 0; k < (s.nW - 1) * s.N; k++) g += s.Wg[k];
    return g;
  }
}

const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
