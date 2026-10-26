// Wing and body kinematics as smooth periodic waveforms of the stroke phase.
//
// Phase θ runs 0…2π over one wingbeat; θ = 0 is the top of the stroke (dorsal reversal, the
// clap), the downstroke fills the first `downRatio` of the cycle. Angles are in degrees in the
// parameter object and radians in the output.
//   flap φ      rotation about the flapping axis, + dorsal (wings up)
//   sweep ψ     lead–lag about the wing normal, + tip forward
//   feather α   rotation about the span axis, + leading edge up; 0 = chord along the flapping axis
//   twist τ     extra feathering at the tip (linear along the span), + tip leading edge up
//   camber κ    chordwise camber as a fraction of the local chord, + arched dorsally
//   bend        spanwise bend, tip lift as a fraction of wing length, + up
// The flapping waveform follows Berman & Wang (2007, J Fluid Mech 582:153): φ ∝ asin(K cos θ)/asin(K)
// goes from a cosine (K→0) to a triangle (K→1); feathering ∝ tanh(C sin θ)/tanh(C) from a sine
// (C→0) to a square wave (C→∞).

import { D2R, TAU } from './math.js';

export function flapShape(th, K) {
  if (K < 1e-3) return Math.cos(th);
  const k = Math.min(K, 0.999);
  return Math.asin(k * Math.cos(th)) / Math.asin(k);
}
export function squareShape(th, C) {
  if (C < 1e-3) return Math.sin(th);
  return Math.tanh(C * Math.sin(th)) / Math.tanh(C);
}
// Map the cycle fraction u to a phase θ ∈ [0, 2π) that reaches π at u = d, so the downstroke
// fills the first `d` of the cycle. θ = 2πu + a(1 − cos 2πu)/2 is smooth (a piecewise-linear map
// would make every angle's rate jump at the reversals) and monotone for d in about 0.3–0.7.
export function warp(u, d) {
  u -= Math.floor(u);
  if (Math.abs(d - 0.5) < 1e-9) return 2 * Math.PI * u;
  const a = 2 * Math.PI * (1 - 2 * d) / (1 - Math.cos(2 * Math.PI * d));
  return 2 * Math.PI * u + 0.5 * a * (1 - Math.cos(2 * Math.PI * u));
}

export const DEFAULT_KIN = {
  f: 10,
  downRatio: 0.5,
  strokePlane: 0,                                         // flapping axis tilted nose-down from the body axis
  phiMean: 15, phiAmp: 120, phiK: 0.3,                    // amplitude is peak to peak
  alphaMean: 0, alphaAmp: 15, alphaC: 1.2, alphaPhase: 180,
  psiMean: 0, psiAmp: 0, psiPhase: 90, psiHarm: 1,
  twistMean: 0, twistAmp: 0, twistPhase: 180,
  camberMean: 0, camberAmp: 0, camberPhase: 0,
  bendAmp: 0, bendPhase: 90,
  // body, used when the body is driven (tethered) and for the abdomen in free flight
  chiMean: 30, chiAmp: 0, chiPhase: 0,                    // body pitch, nose-up
  bobAmp: 0, bobPhase: 0,                                 // vertical body oscillation (m), tethered only
  abdMean: 0, abdAmp: 0, abdPhase: 0,                     // abdomen flexion, + dorsal
  // per-wing asymmetry for turning in a full (non-symmetric) solve: added to the right wing, subtracted from the left
  dPhiMean: 0, dPhiAmp: 0, dAlphaMean: 0,
};

// ---------- measured kinematics as Fourier series ----------
// A dataset is { series: { phi, theta, psi, thetaB, thetaA }, convention } where each series is
// { A0, AN: [], BN: [], harm } in degrees, a(u) = A0 + Σ_q AN_q cos(2π q·harm·u) + BN_q sin(…), u in
// cycles of the record. `convention` maps the dataset's signs onto ours (sign: +1 or −1 per angle).
// The record is re-phased so that our u = 0 falls on its dorsal reversal.
export function evalSeries(s, u) {
  if (!s) return 0;
  let v = s.A0;
  const w = 2 * Math.PI * (s.harm || 1) * u;
  for (let q = 0; q < s.AN.length; q++) v += s.AN[q] * Math.cos((q + 1) * w) + s.BN[q] * Math.sin((q + 1) * w);
  return v;
}
export function prepareFourier(data) {
  const sg = data.convention || {};
  const get = (key, u) => (sg[key] ?? 1) * evalSeries(data.series[key], u);
  // our flap is + dorsal: the dorsal reversal is the maximum of the mapped flap angle
  let uTop = 0, best = -Infinity;
  for (let i = 0; i < 2000; i++) { const u = i / 2000, v = get('phi', u); if (v > best) { best = v; uTop = u; } }
  const stats = {};
  for (const key of ['phi', 'theta', 'psi', 'thetaB', 'thetaA']) {
    if (!data.series[key]) continue;
    let lo = Infinity, hi = -Infinity, sum = 0; const n = 720;
    for (let i = 0; i < n; i++) { const v = get(key, i / n); lo = Math.min(lo, v); hi = Math.max(hi, v); sum += v; }
    stats[key] = { mean: sum / n, half: (hi - lo) / 2, lo, hi };
  }
  // downstroke share: from the dorsal reversal to the ventral one
  let uBot = 0, worst = Infinity;
  for (let i = 0; i < 2000; i++) { const u = i / 2000, v = get('phi', u); if (v < worst) { worst = v; uBot = u; } }
  const down = ((uBot - uTop) % 1 + 1) % 1;
  return { get, uTop, stats, down };
}
// Knob values that reproduce a dataset exactly (amplitudes are peak-to-peak for the flap, half-range otherwise).
export function fourierDefaults(data) {
  const F = prepareFourier(data), st = F.stats;
  const r = (v) => Math.round(v * 100) / 100;
  return {
    downRatio: r(F.down),
    phiMean: r(st.phi.mean), phiAmp: r(2 * st.phi.half),
    alphaMean: r(st.theta.mean), alphaAmp: r(st.theta.half), alphaPhase: 0,
    psiMean: r(st.psi ? st.psi.mean : 0), psiAmp: r(st.psi ? st.psi.half : 0),
    chiMean: r(st.thetaB ? st.thetaB.mean : 0), chiAmp: r(st.thetaB ? st.thetaB.half : 0),
    abdMean: r(st.thetaA ? st.thetaA.mean : 0), abdAmp: r(st.thetaA ? st.thetaA.half : 0),
  };
}

export class Kinematics {
  constructor(params = {}) {
    this.p = { ...DEFAULT_KIN, ...params };
    this.F = this.p.fourier ? prepareFourier(this.p.fourier) : null;
    this.phase0 = 0; // cycles accumulated before tLast, so a frequency change keeps the phase continuous
    this.tLast = 0;
  }
  set(params) {
    // re-anchor the phase so that changing f does not jump the wings
    if ('f' in params && params.f !== this.p.f) { this.phase0 = this.cycles(this.tLast); this.tAnchor = this.tLast; }
    Object.assign(this.p, params);
  }
  cycles(t) { return this.phase0 + (t - (this.tAnchor ?? 0)) * this.p.f; }
  // All angles at time t (radians), for one side: side = +1 right wing, −1 left wing.
  at(t, side = 1) {
    this.tLast = Math.max(this.tLast, t);
    if (this.F) return this.atFourier(t, side);
    const p = this.p, u = this.cycles(t), th = warp(u, p.downRatio);
    const sgn = side;
    // dorsalTop pins the top of the stroke (e.g. at the clap) and overrides the mean flap angle
    const phiAmp = (p.phiAmp + sgn * p.dPhiAmp) * D2R / 2;
    const phiMean = ((p.dorsalTop != null ? p.dorsalTop - (p.phiAmp + sgn * p.dPhiAmp) / 2 : p.phiMean) + sgn * p.dPhiMean) * D2R;
    return {
      cycle: u, th,
      beta: p.strokePlane * D2R,
      phi: phiMean + phiAmp * flapShape(th, p.phiK),
      alpha: (p.alphaMean + sgn * p.dAlphaMean) * D2R + p.alphaAmp * D2R * squareShape(th + p.alphaPhase * D2R, p.alphaC),
      psi: p.psiMean * D2R + p.psiAmp * D2R * Math.cos(p.psiHarm * th + p.psiPhase * D2R),
      twist: p.twistMean * D2R + p.twistAmp * D2R * Math.sin(th + p.twistPhase * D2R),
      camber: p.camberMean + p.camberAmp * Math.sin(th + p.camberPhase * D2R),
      bend: p.bendAmp * Math.sin(th + p.bendPhase * D2R),
      chi: p.chiMean * D2R + p.chiAmp * D2R * Math.sin(th + p.chiPhase * D2R),
      bob: p.bobAmp * Math.sin(th + p.bobPhase * D2R),
      abd: p.abdMean * D2R + p.abdAmp * D2R * Math.sin(th + p.abdPhase * D2R),
    };
  }
  // Measured waveforms, each rescaled about its own mean by the knobs (which default to the data):
  // angle = knobMean + (knobAmp / dataAmp)·(data(u) − dataMean). Feathering is the rigid-plane fit,
  // so prescribed twist is added symmetrically about mid-span.
  atFourier(t, side) {
    const p = this.p, F = this.F, st = F.stats, u = this.cycles(t), sgn = side;
    const ur = u + F.uTop, th = warp(u, F.down);
    const sc = (key, mean, amp, uu = ur, peakToPeak = false) => {
      const s = st[key]; if (!s) return mean * D2R;
      const dataAmp = peakToPeak ? 2 * s.half : s.half;
      return (mean + (dataAmp > 1e-9 ? amp / dataAmp : 0) * (F.get(key, uu) - s.mean)) * D2R;
    };
    const twist = p.twistMean * D2R + p.twistAmp * D2R * Math.sin(th + p.twistPhase * D2R);
    const amp = p.phiAmp + sgn * p.dPhiAmp;
    const phiMean = p.dorsalTop != null ? p.dorsalTop - amp * (st.phi.hi - st.phi.mean) / (2 * st.phi.half) : p.phiMean;
    return {
      cycle: u, th,
      beta: p.strokePlane * D2R,
      phi: sc('phi', phiMean + sgn * p.dPhiMean, amp, ur, true),
      alpha: sc('theta', p.alphaMean + sgn * p.dAlphaMean, p.alphaAmp, ur - p.alphaPhase / 360) - 0.5 * twist,
      psi: sc('psi', p.psiMean, p.psiAmp),
      twist,
      camber: p.camberMean + p.camberAmp * Math.sin(th + p.camberPhase * D2R),
      bend: p.bendAmp * Math.sin(th + p.bendPhase * D2R),
      chi: sc('thetaB', p.chiMean, p.chiAmp),
      bob: p.bobAmp * Math.sin(th + p.bobPhase * D2R),
      abd: sc('thetaA', p.abdMean, p.abdAmp),
    };
  }
  period() { return 1 / this.p.f; }
}

export { TAU };
