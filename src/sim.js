// FlightSim: a butterfly as wings + thorax + abdomen, its kinematics, an aerodynamic model
// (UVLM or quasi-steady) and either a driven body (tethered: forward speed and body pitch are
// prescribed, like a wind-tunnel run with the measured body motion) or free flight (the body
// moves under the aerodynamic, inertial and gravity loads; optional feedback control).

import { UVLM, Surface } from './uvlm.js';
import { QSModel } from './qs.js';
import { WingMesh, BodyModel } from './wing.js';
import { Kinematics } from './kinematics.js';
import { getSpecies } from './species.js';
import { integrate, accelerations, translationalAccel, G } from './dynamics.js';
import { qToMat, qMul, qNormalize, qFromAxisAngle, mv3, mtv3, cross, qToYPR } from './math.js';

export const SIM_DEFAULTS = {
  species: 'monarch', aero: 'uvlm', mode: 'tethered', symmetric: true,
  M: 6, N: 12, spanPower: 1.0, stepsPerCycle: 40, wakeCycles: 3, freeRows: Infinity,
  rho: 1.2, nu: 1.5e-5, lev: 'suction', kv: 1, cd0: 0.05, bodyDrag: 1.2,
  // wake cores: born at the wing's 1 % of mean chord, rolled up with at least 20 %, and grown by
  // Squire's law with an eddy-viscosity factor of 20 (keeps the far wake coherent; tests/ show the
  // loads move by under 1 % across these choices)
  coreWingFrac: 0.01, coreWakeFrac: 0.2, coreGrowth: 20,
  gravity: 1, wind: [0, 0, 0], U: null, kin: {}, controller: null, dynSubsteps: 8, interact: true,
};

export class FlightSim {
  constructor(cfg = {}) {
    const c = this.cfg = { ...SIM_DEFAULTS, ...cfg };
    this.sp = getSpecies(c.species);
    // stored trims (src/trims.js) are the default kinematics for each model; useTrim: false skips them
    this.kin = new Kinematics({ ...this.sp.kin, ...(c.useTrim !== false ? this.sp.trims?.[c.aero] : null), ...c.kin });
    this.U = c.U ?? this.sp.U;
    this.wing = new WingMesh({ outline: this.sp.outline, fore: this.sp.fore, hind: this.sp.hind, R: this.sp.R, M: c.M, N: c.N, spanPower: c.spanPower, hinge: this.sp.hinge, mass: this.sp.wingMass, pivotX: this.sp.pivotX, rootFade: this.sp.rootFade });
    // flight path: speed U along a climb angle γ (tethered) or as the start of free flight
    this.climb = (c.climb ?? this.sp.climb ?? 0) * Math.PI / 180;
    this.dir = [Math.cos(this.climb), Math.sin(this.climb), 0];
    this.body = new BodyModel(this.sp.body);
    this.cbar = this.wing.meanChord;
    this.Sref = 2 * this.wing.area;
    this.aspect = (2 * this.wing.span) ** 2 / this.Sref;
    this.dt = 1 / (this.kin.p.f * c.stepsPerCycle);
    this.h = this.dt * 1e-3;
    this.sides = c.symmetric ? [1] : [1, -1];
    this.surfaces = this.sides.map((s) => new Surface(c.M, c.N, s > 0 ? 'right' : 'left'));
    this.qref = 0.5 * c.rho * this.U * this.U;
    if (c.aero === 'uvlm') {
      this.aero = new UVLM({
        surfaces: this.surfaces, symmetric: c.symmetric, rho: c.rho, nu: c.nu,
        coreWing: c.coreWingFrac * this.cbar, coreWake: c.coreWakeFrac * this.cbar, coreGrowth: c.coreGrowth,
        maxWakeRows: Math.round(c.wakeCycles * c.stepsPerCycle), freeRows: c.freeRows,
        lev: c.lev, kv: c.kv, cd0: c.cd0, wind: c.wind, qref: this.qref, interact: c.interact,
      });
    } else {
      this.aero = new QSModel({ M: c.M, N: c.N, rho: c.rho, cd0: c.cd0, pivot: 0.1, aspect: this.aspect, wind: c.wind, symmetric: c.symmetric, Kv: c.lev === 'none' ? 0 : Math.PI * c.kv });
    }
    const n = (c.M + 1) * (c.N + 1) * 3;
    this.buf = { m: new Float64Array(n), p: new Float64Array(n), z: new Float64Array(n) };
    this.nWingPts = c.M * c.N;
    this.nPts = 2 * this.nWingPts + this.body.nAbd;
    this.ptsMass = new Float64Array(this.nPts);
    for (let s = 0; s < 2; s++) this.ptsMass.set(this.wing.pm, s * this.nWingPts);
    this.ptsMass.set(this.body.abdW, 2 * this.nWingPts);
    this.mass = this.body.mThorax + this.body.abd.mass + 2 * this.wing.mass;
    const k0 = this.kin.at(0);
    // free flight starts on the tethered motion: its pitch, pitch rate and velocity at t = 0
    const tp = this.tetheredPose(0);
    this.state = { r: [0, 0, 0], q: tp.q, v: tp.v.slice(), w: tp.w.slice() };
    this.acc = { vdot: [0, 0, 0], wdot: [0, 0, 0] };
    this.controller = c.controller;
    this.t = 0; this.n = 0;
    this.history = [];
    this.last = null;
  }

  // ---------- poses ----------
  tetheredPose(t) {
    const k = this.kin.at(t), km = this.kin.at(t - this.h), kp = this.kin.at(t + this.h);
    const chiDot = (kp.chi - km.chi) / (2 * this.h), bobDot = (kp.bob - km.bob) / (2 * this.h);
    const d = this.dir;
    return { r: [this.U * t * d[0], this.U * t * d[1] + k.bob, 0], q: qFromAxisAngle([0, 0, 1], k.chi), v: [this.U * d[0], this.U * d[1] + bobDot, 0], w: [0, 0, chiDot] };
  }
  // Pose at t+τ, extrapolated from the current free state with its last accelerations.
  freePose(tau) {
    const s = this.state, a = this.acc;
    const r = s.r.map((x, k) => x + s.v[k] * tau + 0.5 * a.vdot[k] * tau * tau);
    const th = s.w.map((x, k) => x * tau + 0.5 * a.wdot[k] * tau * tau);
    const ang = Math.hypot(...th);
    const dq = ang > 0 ? qFromAxisAngle(th, ang) : [1, 0, 0, 0];
    return { r, q: qNormalize(qMul(s.q, dq)), v: s.v.map((x, k) => x + a.vdot[k] * tau), w: s.w.map((x, k) => x + a.wdot[k] * tau) };
  }
  // 'driven': translation is free, pitch follows the prescribed (measured) history
  drivenPose(t) {
    const tp = this.tetheredPose(t), fp = this.freePose(t - this.t);
    return { r: fp.r, v: fp.v, q: tp.q, w: tp.w };
  }
  poseAt(t) { return this.cfg.mode === 'tethered' ? this.tetheredPose(t) : this.cfg.mode === 'driven' ? this.drivenPose(t) : this.freePose(t - this.t); }

  // ---------- geometry ----------
  wingBody(t, side, out) { return this.wing.bodyPoints(this.kin.at(t, side), side, out); }
  toWorld(pose, pb, out) {
    const R = qToMat(pose.q), r = pose.r;
    for (let o = 0; o < pb.length; o += 3) {
      const x = pb[o], y = pb[o + 1], z = pb[o + 2];
      out[o] = r[0] + R[0] * x + R[1] * y + R[2] * z;
      out[o + 1] = r[1] + R[3] * x + R[4] * y + R[5] * z;
      out[o + 2] = r[2] + R[6] * x + R[7] * y + R[8] * z;
    }
    return out;
  }
  // Body-frame mass points (both wings, abdomen) with central-difference rates at time t.
  partsAt(t) {
    const h = this.h, n = this.nPts, p = new Float64Array(3 * n), pm = new Float64Array(3 * n), pp = new Float64Array(3 * n);
    const tmp = this.buf.z, mp = new Float64Array(3 * this.nWingPts);
    const fill = (tt, out) => {
      for (let s = 0; s < 2; s++) {
        this.wingBody(tt, s === 0 ? 1 : -1, tmp);
        this.wing.massPoints(tmp, mp);
        out.set(mp, 3 * s * this.nWingPts);
      }
      const ab = new Float64Array(3 * this.body.nAbd);
      this.body.abdomenPoints(this.kin.at(tt).abd, ab);
      out.set(ab, 6 * this.nWingPts);
    };
    fill(t, p); fill(t - h, pm); fill(t + h, pp);
    const pd = new Float64Array(3 * n), pdd = new Float64Array(3 * n);
    for (let k = 0; k < 3 * n; k++) { pd[k] = (pp[k] - pm[k]) / (2 * h); pdd[k] = (pp[k] - 2 * p[k] + pm[k]) / (h * h); }
    return { mThorax: this.body.mThorax, pThorax: this.body.pThorax, IThorax: this.body.IThorax, pts: { n, mass: this.ptsMass, p, pd, pdd }, gravity: this.cfg.gravity };
  }

  // ---------- one time step ----------
  step() {
    const t = this.t, dt = this.dt, h = this.h, c = this.cfg;
    if (this.controller) this.controller.update(this, t);
    const P0 = this.poseAt(t), Pm = this.poseAt(t - h), Pp = this.poseAt(t + h);
    const { m: Xm, p: Xp } = this.buf;
    const wingsQS = [];
    let gapMin = Infinity;
    this.sides.forEach((side, k) => {
      const s = this.surfaces[k];
      const pb = this.wingBody(t, side, new Float64Array(s.C.length));
      if (side > 0) for (let o = 2; o < pb.length; o += 3) gapMin = Math.min(gapMin, 2 * pb[o]);
      this.toWorld(P0, pb, s.C);
      this.toWorld(Pm, this.wingBody(t - h, side, this.buf.z), Xm);
      this.toWorld(Pp, this.wingBody(t + h, side, this.buf.z), Xp);
      for (let o = 0; o < s.C.length; o++) s.Cv[o] = (Xp[o] - Xm[o]) / (2 * h);
      if (c.aero !== 'uvlm') {
        const Ca = new Float64Array(s.C.length);
        for (let o = 0; o < s.C.length; o++) Ca[o] = (Xp[o] - 2 * s.C[o] + Xm[o]) / (h * h);
        wingsQS.push({ C: s.C, Cv: s.Cv, Ca, Cm: Xm.slice(), Cp: Xp.slice() });
      }
    });
    const res = c.aero === 'uvlm' ? this.aero.step(t, dt, P0.r) : this.aero.step(wingsQS, h, P0.r);
    // flapping (relative) aerodynamic power: remove the work done by the body's own motion
    const Rb = qToMat(P0.q), wWorld = mv3(Rb, P0.w);
    const Paero = res.P + res.F[0] * P0.v[0] + res.F[1] * P0.v[1] + res.F[2] * P0.v[2] + res.M[0] * wWorld[0] + res.M[1] * wWorld[1] + res.M[2] * wWorld[2];
    const Fb = this.bodyDragLoads(P0);
    const F = res.F.map((v, k) => v + Fb.F[k]), M = res.M.map((v, k) => v + Fb.M[k]);

    // body dynamics
    const parts = this.partsAt(t);
    let acc;
    if (c.mode === 'driven') {
      // RK4 on position and velocity with the rotation taken from the prescribed pitch history
      const H = 1e2 * h, wdotAt = (tt) => { const a = this.tetheredPose(tt - H).w, b = this.tetheredPose(tt + H).w; return [0, 1, 2].map((k) => (b[k] - a[k]) / (2 * H)); };
      const ns = c.dynSubsteps, hs = dt / ns;
      let st = this.state;
      for (let k = 0; k < ns; k++) {
        const t0 = t + k * hs;
        const f = (s, tt) => { const tp = this.tetheredPose(tt); const ss = { ...s, q: tp.q, w: tp.w }; return translationalAccel(ss, this.partsAt(tt), F, wdotAt(tt)); };
        const add = (s, dv, dr, hh) => ({ r: s.r.map((x, i) => x + hh * dr[i]), v: s.v.map((x, i) => x + hh * dv[i]) });
        const a1 = f(st, t0), s2 = add(st, a1, st.v, hs / 2);
        const a2 = f(s2, t0 + hs / 2), s3 = add(st, a2, s2.v, hs / 2);
        const a3 = f(s3, t0 + hs / 2), s4 = add(st, a3, s3.v, hs);
        const a4 = f(s4, t0 + hs);
        st = {
          r: st.r.map((x, i) => x + hs / 6 * (st.v[i] + 2 * s2.v[i] + 2 * s3.v[i] + s4.v[i])),
          v: st.v.map((x, i) => x + hs / 6 * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i])),
        };
        if (c.symmetric) { st.r[2] = 0; st.v[2] = 0; }
      }
      const tp = this.tetheredPose(t + dt);
      acc = { vdot: translationalAccel({ ...this.state, q: P0.q, w: P0.w }, parts, F, wdotAt(t)), wdot: wdotAt(t) };
      this.acc = acc;
      this.state = { r: st.r, v: st.v, q: tp.q, w: tp.w };
    } else if (c.mode === 'free') {
      acc = accelerations(this.state, parts, F, M, c.symmetric);
      this.acc = { vdot: acc.vdot, wdot: acc.wdot };
      // the body integrates in substeps: the aerodynamic loads are held for the whole step, but the
      // wing and abdomen motion is resolved finely (the clap contact is brief)
      const ns = c.dynSubsteps, hs = dt / ns;
      for (let k = 0; k < ns; k++) this.state = integrate(this.state, t + k * hs, hs, (tt) => this.partsAt(tt), F, M, c.symmetric);
    } else {
      const Pm2 = this.tetheredPose(t - 1e2 * h), Pp2 = this.tetheredPose(t + 1e2 * h), H = 1e2 * h;
      acc = { vdot: P0.v.map((_, k) => (Pp2.v[k] - Pm2.v[k]) / (2 * H)), wdot: P0.w.map((_, k) => (Pp2.w[k] - Pm2.w[k]) / (2 * H)) };
      this.acc = acc;
      this.state = this.tetheredPose(t + dt);
    }
    // inertial power of the wings in their motion relative to the body
    let Pin = 0;
    {
      const w = P0.w, { p, pd, pdd, mass } = parts.pts, vd = mtv3(Rb, acc.vdot), wd = acc.wdot;
      for (let i = 0; i < 2 * this.nWingPts; i++) {
        const o = 3 * i, pi = [p[o], p[o + 1], p[o + 2]], vi = [pd[o], pd[o + 1], pd[o + 2]];
        const a1 = cross(wd, pi), a2 = cross(w, cross(w, pi)), a3 = cross(w, vi);
        const ax = vd[0] + a1[0] + a2[0] + 2 * a3[0] + pdd[o], ay = vd[1] + a1[1] + a2[1] + 2 * a3[1] + pdd[o + 1], az = vd[2] + a1[2] + a2[2] + 2 * a3[2] + pdd[o + 2];
        Pin += mass[i] * (ax * vi[0] + ay * vi[1] + az * vi[2]);
      }
    }
    // centre of mass offset from O (world) and the aerodynamic pitching moment about it
    const cb = [this.body.mThorax * this.body.pThorax[0], this.body.mThorax * this.body.pThorax[1], 0];
    { const { p, mass, n } = parts.pts; for (let i = 0; i < n; i++) { cb[0] += mass[i] * p[3 * i]; cb[1] += mass[i] * p[3 * i + 1]; } }
    const com = mv3(Rb, [cb[0] / this.mass, cb[1] / this.mass, 0]);
    const Mcom = M[2] - (com[0] * F[1] - com[1] * F[0]);
    const k = this.kin.at(t), ypr = qToYPR(P0.q);
    const rec = {
      t, cycle: k.cycle, phi: k.phi, alpha: k.alpha, psi: k.psi, abd: k.abd,
      x: P0.r[0], y: P0.r[1], vx: P0.v[0], vy: P0.v[1], pitch: ypr.pitch, wz: P0.w[2],
      Fx: F[0], Fy: F[1], Mz: M[2], Mcom, comX: com[0], comY: com[1], Fxa: res.F[0], Fya: res.F[1],
      Paero, Pin, Pmech: Paero + Pin, gap: gapMin,
      suction: res.perSurface ? res.perSurface.reduce((a, s) => a + (s.suction || 0), 0) * (c.symmetric ? 2 : 1) : 0,
    };
    // a free body that tumbles past ±80° pitch, or any non-finite load, ends the flight
    if (c.mode === 'free' && (!Number.isFinite(F[0] + F[1] + M[2]) || Math.abs(ypr.pitch) > 80 * Math.PI / 180)) {
      this.crashed = this.crashed || { t, reason: Number.isFinite(F[0] + F[1]) ? 'the body tumbled past 80° of pitch' : 'the solution became non-finite' };
    }
    this.last = { res, pose: P0, rec };
    this.history.push(rec);
    this.t = t + dt; this.n++;
    if (this.cfg.mode === 'tethered') this.kin.tLast = this.t;
    return rec;
  }

  // Cross-flow drag on thorax and abdomen (cylinders, C_d = cfg.bodyDrag).
  bodyDragLoads(pose) {
    const out = { F: [0, 0, 0], M: [0, 0, 0] };
    const cd = this.cfg.bodyDrag; if (!cd) return out;
    const R = qToMat(pose.q), rho = this.cfg.rho, wind = this.cfg.wind;
    const { thorax, abdomen } = this.sp.body;
    const abd = this.kin.at(this.t).abd + (abdomen.rest ?? 0);
    const segs = [
      { mid: thorax.com, axis: [1, 0, 0], L: thorax.length, D: thorax.diameter },
      { mid: [abdomen.joint[0] - Math.cos(abd) * abdomen.length / 2, abdomen.joint[1] + Math.sin(abd) * abdomen.length / 2, 0], axis: [Math.cos(abd), -Math.sin(abd), 0], L: abdomen.length, D: abdomen.diameter },
    ];
    for (const sg of segs) {
      const rw = mv3(R, sg.mid), e = mv3(R, sg.axis);
      const vp = pose.v.map((v, k) => v + cross(mv3(R, pose.w), rw)[k]);
      const V = [wind[0] - vp[0], wind[1] - vp[1], wind[2] - vp[2]];
      const va = V[0] * e[0] + V[1] * e[1] + V[2] * e[2];
      const Vn = V.map((v, k) => v - va * e[k]), vn = Math.hypot(...Vn);
      const f = Vn.map((v) => 0.5 * rho * cd * sg.D * sg.L * vn * v);
      for (let k = 0; k < 3; k++) out.F[k] += f[k];
      const m = cross(rw, f); for (let k = 0; k < 3; k++) out.M[k] += m[k];
    }
    return out;
  }

  run(cycles, onStep) {
    const n = Math.round(cycles * this.cfg.stepsPerCycle);
    for (let i = 0; i < n && !this.crashed; i++) { const r = this.step(); if (onStep) onStep(r, this); }
    return this.history;
  }

  // Cycle averages of the last `cycles` wingbeats.
  averages(cycles = 1) {
    const n = Math.round(cycles * this.cfg.stepsPerCycle), H = this.history.slice(-n);
    const avg = (key) => H.reduce((a, r) => a + r[key], 0) / H.length;
    const W = this.mass * G;
    return {
      Fx: avg('Fx'), Fy: avg('Fy'), Mz: avg('Mz'), Mcom: avg('Mcom'), Paero: avg('Paero'), Pin: avg('Pin'), Pmech: avg('Pmech'),
      PmechPos: H.reduce((a, r) => a + Math.max(0, r.Pmech), 0) / H.length,
      liftToWeight: avg('Fy') / W, thrustToWeight: avg('Fx') / W,
      CL: avg('Fy') / (this.qref * this.Sref), CT: avg('Fx') / (this.qref * this.Sref),
      vx: avg('vx'), vy: avg('vy'), pitch: avg('pitch'), weight: W,
    };
  }
}
