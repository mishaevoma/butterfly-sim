// A flight controller for free flight, the stand-in for the butterfly's own sensing and steering.
// The body is unstable in pitch within a single wingbeat (so are real butterflies and the Kyoto
// group's panel model of Parantica sita), so the inner loop works inside the beat:
//   inner (every step)  tracks the trimmed, phase-locked pitch trajectory θ_ref(t) (the body
//                       motion the trim was found with) by moving the mean sweep ψ̄, rate-limited
//                       so the wings never jump. Tracking the periodic reference leaves the
//                       natural pitch swing alone and only removes the drift from it.
//   outer (beat mean)   climb rate and altitude → stroke amplitude Φ; forward speed → stroke-plane
//                       tilt β; the beat-mean pitch error → a slow trim of ψ̄.
// Beat means are moving averages over exactly one wingbeat, which cancel the flapping ripple.

import { R2D, D2R, qToYPR } from './math.js';

export const DEFAULT_GAINS = {
  kTrack: 1.2, kTrackRate: 0.02,           // ψ̄: ° per ° of tracking error, per °/s of rate error
  kIPitch: 1.0,                             // ψ̄: ° per °·s of beat-mean pitch error (slow trim)
  kAbdTrack: 0, kAbdTrackRate: 0,           // abdomen flexion on the same tracking error (+ lifts it)
  kClimb: 20, kAlt: 30, kIAlt: 120,         // Φ: ° per m/s of climb error, per m of altitude error, per m·s
  kSpeed: 15, kISpeed: 10,                  // β: ° per m/s of speed error, per m of integrated error
  psiRate: 2500,                            // °/s, fastest change of ψ̄ the wings are asked to make
  limits: { psiMean: [-30, 30], phiAmp: [50, 160], strokePlane: [-30, 50], abdMean: [-30, 30] },
};

export class FlightController {
  constructor({ trim, pitchRef, speedRef, climbRef = 0, altRef = 0, gains = {}, enabled = true }) {
    this.trim = { abdMean: 0, ...trim };
    this.ref = { pitch: pitchRef, speed: speedRef, climb: climbRef, alt: altRef };
    this.g = { ...DEFAULT_GAINS, ...gains, limits: { ...DEFAULT_GAINS.limits, ...(gains.limits || {}) } };
    this.enabled = enabled;
    this.buf = null; this.k = 0;
    this.cmd = { ...this.trim };
    this.I = { pitch: 0, alt: 0, speed: 0 };
  }
  update(sim, t) {
    const n = sim.cfg.stepsPerCycle;
    if (!this.buf) this.buf = Array.from({ length: n }, () => null);
    const s = sim.state, ypr = qToYPR(s.q);
    const now = { pitch: ypr.pitch * R2D, vx: s.v[0], vy: s.v[1], y: s.r[1] };
    this.buf[this.k++ % n] = now;
    const full = this.buf.filter(Boolean);
    const avg = (key) => full.reduce((a, b) => a + b[key], 0) / full.length;
    const m = { pitch: avg('pitch'), vx: avg('vx'), vy: avg('vy'), y: avg('y') };
    // the phase-locked pitch reference: the body motion the trim prescribed
    const h = 1e-4 / sim.kin.p.f, kRef = sim.kin.at(t), kRefP = sim.kin.at(t + h);
    const ref = kRef.chi * R2D, refRate = (kRefP.chi - kRef.chi) / h * R2D;
    const e = now.pitch - ref, eRate = s.w[2] * R2D - refRate;
    this.meas = { ...m, pitchNow: now.pitch, pitchRef: ref, track: e };
    if (!this.enabled || (sim.cfg.mode !== 'free' && sim.cfg.mode !== 'driven')) return;
    const pitchFree = sim.cfg.mode === 'free';
    const g = this.g, r = this.ref, L = g.limits, dt = sim.dt;
    const lim = (key, v) => Math.min(L[key][1], Math.max(L[key][0], v));
    // the altitude reference rises with the commanded climb rate (beat-mean, so lagged half a beat)
    const altRef = r.alt + r.climb * (t - 0.5 / sim.kin.p.f);
    const I = this.I, ea = altRef - m.y, es = r.speed - m.vx, em = m.pitch - r.pitch;
    const clampI = (v, auth, k) => Math.max(-auth / Math.max(k, 1e-9), Math.min(auth / Math.max(k, 1e-9), v));
    I.pitch = clampI(I.pitch + em * dt, 15, g.kIPitch);
    I.alt = clampI(I.alt + ea * dt, 40, g.kIAlt);
    I.speed = clampI(I.speed + es * dt, 20, g.kISpeed);
    const psiWant = pitchFree ? lim('psiMean', this.trim.psiMean - g.kTrack * e - g.kTrackRate * eRate - g.kIPitch * I.pitch) : this.trim.psiMean;
    const maxStep = g.psiRate * dt, prev = this.cmd.psiMean ?? this.trim.psiMean;
    this.cmd = {
      psiMean: prev + Math.max(-maxStep, Math.min(maxStep, psiWant - prev)),
      abdMean: lim('abdMean', this.trim.abdMean + g.kAbdTrack * e + g.kAbdTrackRate * eRate),
      phiAmp: lim('phiAmp', this.trim.phiAmp + g.kClimb * (r.climb - m.vy) + g.kAlt * ea + g.kIAlt * I.alt),
      strokePlane: lim('strokePlane', this.trim.strokePlane + g.kSpeed * es + g.kISpeed * I.speed),
    };
    sim.kin.set(this.cmd);
  }
}
