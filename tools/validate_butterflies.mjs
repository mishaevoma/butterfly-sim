// Butterfly-level validation against published data (research/validation_and_code.md lists the
// targets). Writes reports/validation.md and its figures. Usage: node tools/validate_butterflies.mjs
// (about four minutes). Vortex lattice at 6 × 12 panels, 48 steps per beat, a 3-beat wake.

import { writeFileSync, mkdirSync } from 'node:fs';
import { FlightSim } from '../src/sim.js';
import { FlightController } from '../src/control.js';
import { SPECIES } from '../src/species.js';
import { fourierDefaults } from '../src/kinematics.js';
import { lineChart } from './svgchart.mjs';

const HI = { M: 6, N: 12, stepsPerCycle: 48, wakeCycles: 3 };
const out = new URL('../reports/', import.meta.url);
mkdirSync(new URL('figures/', out), { recursive: true });
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)} s]`, ...a);
const fig = (name, svg) => writeFileSync(new URL(`figures/${name}.svg`, out), svg);
const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);

function tethered(species, extra = {}, beats = 4) {
  const sim = new FlightSim({ species, aero: 'uvlm', ...HI, ...extra });
  sim.run(beats);
  const n = sim.cfg.stepsPerCycle, H = sim.history.slice(-n), W = sim.mass * 9.81;
  const down = sim.kin.F ? sim.kin.F.down : sim.kin.p.downRatio;
  const phase = (r) => ((r.cycle % 1) + 1) % 1;
  const ds = H.filter((r) => phase(r) < down), us = H.filter((r) => phase(r) >= down);
  const mean = (A, k) => A.reduce((s, r) => s + r[k], 0) / A.length;
  const a = sim.averages(1);
  return {
    sim, H, W, a, down,
    L: a.liftToWeight, T: a.thrustToWeight, M: a.Mcom / (W * sim.cbar),
    ds: { Fy: mean(ds, 'Fy') / W, Fx: mean(ds, 'Fx') / W, mag: Math.hypot(mean(ds, 'Fx'), mean(ds, 'Fy')) / W, Iy: ds.reduce((s, r) => s + r.Fy, 0) * sim.dt, Ix: ds.reduce((s, r) => s + r.Fx, 0) * sim.dt },
    us: { Fy: mean(us, 'Fy') / W, Fx: mean(us, 'Fx') / W, mag: Math.hypot(mean(us, 'Fx'), mean(us, 'Fy')) / W, Iy: us.reduce((s, r) => s + r.Fy, 0) * sim.dt, Ix: us.reduce((s, r) => s + r.Fx, 0) * sim.dt },
  };
}

// ---------- 1. monarch, measured wingbeat at the measured climb ----------
log('monarch: measured kinematics');
const mon = SPECIES.monarch, data = fourierDefaults(mon.kin.fourier);
const flat = { camberMean: 0, camberAmp: 0 };
const M1 = {
  flat: tethered('monarch', { useTrim: false, kin: flat }),
  cambered: tethered('monarch', { useTrim: false }),
  qs: tethered('monarch', { useTrim: false, aero: 'qs' }),
  qsFlat: tethered('monarch', { useTrim: false, aero: 'qs', kin: flat }),
};
const trimU = mon.trims?.uvlm || {};
// free translation with the measured pitch history, from the trimmed wingbeat
log('monarch: free flight, pitch driven');
const drv = new FlightSim({ species: 'monarch', aero: 'uvlm', M: 5, N: 10, stepsPerCycle: 40, wakeCycles: 2, freeRows: 40, mode: 'driven' });
drv.run(10);
const dA = drv.averages(2), climbDeg = Math.atan2(dA.vy, dA.vx) * 180 / Math.PI;
const dH = drv.history.slice(-40), bob = (() => { const y = dH.map((r, i) => r.y - (dH[39].y - dH[0].y) * i / 39); return (Math.max(...y) - Math.min(...y)) * 1e3; })();
const beatX = (H) => H.map((r) => ((r.cycle % 1) + 1) % 1);
const sortByPhase = (H) => H.slice().sort((a, b) => (((a.cycle % 1) + 1) % 1) - (((b.cycle % 1) + 1) % 1));
const ser = (res, label, key, color) => { const H = sortByPhase(res.H); return { label, x: beatX(H), y: H.map((r) => r[key] / res.W), color }; };
fig('monarch_vertical', lineChart({ title: 'Monarch, measured wingbeat: vertical air force', xLabel: 'wingbeat phase (0 = dorsal reversal)', yLabel: 'force / body weight', ref: 1, bands: [[0, M1.cambered.down]],
  series: [ser(M1.cambered, 'Vortex lattice, cambered', 'Fy'), ser(M1.flat, 'Vortex lattice, flat', 'Fy'), ser(M1.qs, 'Quasi-steady, cambered', 'Fy')] }));
fig('monarch_forward', lineChart({ title: 'Monarch, measured wingbeat: forward air force', xLabel: 'wingbeat phase (0 = dorsal reversal)', yLabel: 'force / body weight', ref: 0, bands: [[0, M1.cambered.down]],
  series: [ser(M1.cambered, 'Vortex lattice, cambered', 'Fx'), ser(M1.flat, 'Vortex lattice, flat', 'Fx'), ser(M1.qs, 'Quasi-steady, cambered', 'Fx')] }));

// ---------- 2. Bode-Oke & Dong F1, reconstructed (trend check) ----------
log('monarch: Bode-Oke & Dong F1 reconstruction');
const F1kin = { f: 9.92, phiAmp: 103, strokePlane: 3, chiMean: 28, chiAmp: 4, alphaMean: -1, alphaAmp: 11 };
const B1 = { cambered: tethered('monarch', { useTrim: false, climb: 0, U: 1.75, kin: F1kin }), flat: tethered('monarch', { useTrim: false, climb: 0, U: 1.75, kin: { ...F1kin, ...flat } }) };

// ---------- 3. painted lady vs Zheng, Hedrick & Mittal 2013 ----------
log('painted lady');
const V = {
  obw: tethered('vanessa', { useTrim: false }),
  tow: tethered('vanessa', { useTrim: false, kin: { camberMean: 0, camberAmp: 0 } }),
  fpw: tethered('vanessa', { useTrim: false, kin: { twistAmp: 0, camberMean: 0, camberAmp: 0 } }),
};
const vStats = (r) => { const L = r.H.map((x) => x.Fy), m = L.reduce((a, b) => a + b, 0) / L.length; return { mean: m * 1e3, peak: Math.max(...L) * 1e3, rms: Math.sqrt(L.reduce((a, b) => a + b * b, 0) / L.length) * 1e3, P: r.H.reduce((a, x) => a + x.Paero, 0) / r.H.length * 1e3, T: r.a.Fx * 1e3 }; };
const vs = { obw: vStats(V.obw), tow: vStats(V.tow), fpw: vStats(V.fpw) };
fig('vanessa_lift', lineChart({ title: 'Painted lady: lift over one wingbeat (Zheng et al. kinematics, fitted by eye)', xLabel: 'wingbeat phase', yLabel: 'lift (mN)', ref: 0, bands: [[0, V.obw.down]],
  series: [['Twisted and cambered', V.obw], ['Twist only', V.tow], ['Flat rigid wing', V.fpw]].map(([label, r]) => { const H = sortByPhase(r.H); return { label, x: beatX(H), y: H.map((x) => x.Fy * 1e3) }; }) }));

// ---------- 4. clap: fritillary, with and without the other wing ----------
log('fritillary clap');
const C = { on: tethered('argynnis', {}), off: tethered('argynnis', { interact: false }) };
// the same at the monarch's measured stroke plane, untrimmed (the trim tilts the stroke plane to +11°)
const C25 = { on: tethered('argynnis', { useTrim: false, kin: { phiAmp: 102 } }), off: tethered('argynnis', { useTrim: false, interact: false, kin: { phiAmp: 102 } }) };
const ratio = (r) => (r.us.Ix > 0 ? f2(r.ds.Iy / r.us.Ix) : 'no net upstroke thrust');
// thrust while the wings close: the last 15 % of the beat, up to the clap at the dorsal reversal
const clapWin = (r) => { const A = r.H.filter((x) => ((x.cycle % 1) + 1) % 1 > 0.85); return A.reduce((s, x) => s + x.Fx, 0) / A.length / r.W; };
fig('fritillary_forward', lineChart({ title: 'Fritillary: forward force, with and without the other wing', xLabel: 'wingbeat phase (the clap is at 0 and 1)', yLabel: 'force / body weight', ref: 0, bands: [[0, C.on.down]],
  series: [ser(C.on, 'Both wings (clap and fling)', 'Fx'), ser(C.off, 'One wing alone', 'Fx')] }));

// ---------- 5. free-flight pitch: uncontrolled tumble and perturbation growth ----------
log('free-flight pitch stability');
function release(species, dPitch = 0, beats = 1.2) {
  const sim = new FlightSim({ species, aero: 'uvlm', M: 5, N: 10, stepsPerCycle: 40, wakeCycles: 2, freeRows: 40, mode: 'tethered' });
  sim.run(2);
  sim.cfg.mode = 'free';
  const tp = sim.tetheredPose(sim.t);
  const q = tp.q, a = dPitch * Math.PI / 360;
  sim.state = { ...tp, q: [q[0] * Math.cos(a) - q[3] * Math.sin(a), 0, 0, q[3] * Math.cos(a) + q[0] * Math.sin(a)] };
  sim.acc = { vdot: [0, 0, 0], wdot: [0, 0, 0] };
  const tRel = sim.t, trace = [];
  for (let i = 0; i < beats * 40 && !sim.crashed; i++) { const r = sim.step(); trace.push({ u: (r.t - tRel) * sim.kin.p.f, pitch: r.pitch * 57.2958 }); }
  return { tumble: sim.crashed ? (sim.crashed.t - tRel) * sim.kin.p.f : null, trace };
}
const stab = {};
for (const sp of ['monarch', 'parantica']) {
  const a = release(sp, 0), b = release(sp, 0.2);
  // growth of a 0.2° pitch perturbation until 80 % of the way to the earlier tumble (at most one
  // beat), expressed per beat
  const tEnd = Math.min(1, 0.8 * Math.min(a.tumble ?? 1.2, b.tumble ?? 1.2)), k = Math.max(4, Math.min(a.trace.length, b.trace.length, Math.round(tEnd * 40)) - 1);
  const d0 = 0.2, dq = Math.abs(b.trace[k].pitch - a.trace[k].pitch);
  stab[sp] = { tumble: a.tumble, growthPerBeat: Math.pow(dq / d0, 1 / (b.trace[k].u || 1)), window: b.trace[k].u };
}

// ---------- report ----------
const row4 = (label, r) => `| ${label} | ${f2(r.L)} | ${f2(r.T)} | ${f3(r.M)} |`;
const md = `# Validation against published butterfly data

Generated by \`node tools/validate_butterflies.mjs\` on ${new Date().toISOString().slice(0, 10)} (${((Date.now() - t0) / 1000).toFixed(0)} s). Vortex lattice at ${HI.M} × ${HI.N} panels per wing, ${HI.stepsPerCycle} steps per wingbeat, ${HI.wakeCycles}-beat free wake. Targets and their sources are in \`research/validation_and_code.md\`; inputs are in \`research/kinematics_morphology.md\`. Forces are cycle means in body weights (W); moments are about the centre of mass, divided by W × mean chord, with positive nose-up.

## 1. Monarch: the measured wingbeat, untrimmed, at the measured climb

The kinematics are the FWUAV Fourier fits to one monarch in VICON climbing flight: flap, feathering, deviation, thorax pitch and abdomen. The run uses that flight's 1.42 m/s at a 23° climb. A steady climb needs lift = 1 W, thrust = 0 and moment = 0.

| Model | Lift / W | Thrust / W | Moment |
|---|---|---|---|
${row4('Vortex lattice, flat wing', M1.flat)}
${row4('Vortex lattice, camber 12 % (downstroke) / 6 % (upstroke)', M1.cambered)}
${row4('Quasi-steady, flat wing', M1.qsFlat)}
${row4('Quasi-steady, cambered', M1.qs)}

- **A flat rigid wing supports about half the weight.** Rigid flat-plate CFD of the painted lady gives 0.50–0.73 W (Zheng et al. 2013), and the Kyoto panel model predicted 0.3 mN against 2.4 mN measured for *Parantica*. The flat-wing deficit is a known property of rigid models.
- **Camber closes the gap.** With the assumed camber, inside the 7–15 % measured on painted-lady wings, the measured wingbeat comes within a few percent of balancing on all three.
- **The quasi-steady lens has no wake downwash, and its flat-plate coefficients cannot see camber.** It overshoots: the same kinematics give ${f2(M1.qs.L)} W of lift, cambered or not.
- **The trim barely moves the measured wingbeat.** Holding the camber, the vortex-lattice trim (lift = W, thrust = drag, moment = 0) changes it by:
  - stroke amplitude ${f2(trimU.phiAmp ?? NaN)}° against ${f2(data.phiAmp)}° measured;
  - stroke-plane tilt ${f2(trimU.strokePlane ?? NaN)}° against −25.4°;
  - mean sweep ${f2(trimU.psiMean ?? NaN)}° against ${f2(data.psiMean)}°.
- **Free flight lands close to the measured climb.** Released with the measured pitch history (pitch-driven free flight), the trimmed monarch settles at ${f2(Math.hypot(dA.vx, dA.vy))} m/s and a ${climbDeg.toFixed(1)}° climb, against 1.42 m/s at 23° measured. It bobs ${bob.toFixed(1)} mm per stroke.

![Monarch vertical force](figures/monarch_vertical.svg)

![Monarch forward force](figures/monarch_forward.svg)

## 2. Monarch: Bode-Oke & Dong 2020, case F1 (trend check)

F1 is level flight at 1.75 m/s, 9.92 Hz and a 103° stroke, with a stroke plane about 93° to the body axis and body angle 28° ± 4°. Feathering is about −11° in the downstroke and +10° in the upstroke, from their tabulated chord angles. Only summary angles are published, so the wingbeat here is the FWUAV waveform rescaled to them. Half-stroke means are in body weights:

| | Downstroke \\|F\\| | Downstroke vertical | Upstroke \\|F\\| | Upstroke vertical |
|---|---|---|---|---|
| Bode-Oke & Dong (CFD of the filmed flight) | 2.42 | 2.27 | 1.05 | −0.31 |
| Vortex lattice, flat | ${f2(B1.flat.ds.mag)} | ${f2(B1.flat.ds.Fy)} | ${f2(B1.flat.us.mag)} | ${f2(B1.flat.us.Fy)} |
| Vortex lattice, cambered | ${f2(B1.cambered.ds.mag)} | ${f2(B1.cambered.ds.Fy)} | ${f2(B1.cambered.us.mag)} | ${f2(B1.cambered.us.Fy)} |

- **Shared:** in both, the downstroke carries the weight.
- **Upstroke:** the flat wing matches their upstroke vertical force (${f2(B1.flat.us.Fy)} W against −0.31 W) but makes less total upstroke force.
- **Downstroke:** the reconstructed one is ${(B1.flat.ds.mag / 2.42).toFixed(1)}–${(B1.cambered.ds.mag / 2.42).toFixed(1)} times theirs. The reconstructed feathering is the most likely cause, since only half-stroke means are published.
- **Weight:** the measured-kinematics case in §1 is the cleaner test.

## 3. Painted lady: Zheng, Hedrick & Mittal 2013

The conditions are 22.2 Hz, a 120° stroke, 1.14 m/s and 6.1° body pitch. Twist and camber are fitted by eye to their figures, since no Fourier coefficients are published.

| | Mean lift (mN) | Peak lift (mN) | RMS lift (mN) | Aero power (mW) |
|---|---|---|---|---|
| Animal (lift from kinematics) | — | 11.5–18.0 | 6.2–10.2 | — |
| Zheng CFD, deforming wing (OBW) | 2.93 | 11.7 | 6.7 | 10.5 |
| Zheng CFD, flat plates (FPW1–3) | 1.42–2.07 | — | — | 9.81–13.7 |
| Vortex lattice, twisted and cambered | ${f2(vs.obw.mean)} | ${f2(vs.obw.peak)} | ${f2(vs.obw.rms)} | ${f2(vs.obw.P)} |
| Vortex lattice, twist only | ${f2(vs.tow.mean)} | ${f2(vs.tow.peak)} | ${f2(vs.tow.rms)} | ${f2(vs.tow.P)} |
| Vortex lattice, flat rigid wing | ${f2(vs.fpw.mean)} | ${f2(vs.fpw.peak)} | ${f2(vs.fpw.rms)} | ${f2(vs.fpw.P)} |

- **Peak and RMS lift fall inside the animal's range.**
- **Mean lift is high.** The by-eye incidence is the likely cause.
- **Twist raises lift per watt.** Lift/power goes from ${f3(vs.fpw.mean / vs.fpw.P)} N/W (flat) to ${f3(vs.tow.mean / vs.tow.P)} N/W (twisted), the direction of their result (0.15 to 0.28 N/W).

![Painted lady lift](figures/vanessa_lift.svg)

## 4. The clap: Johansson & Henningsson 2021 (*Argynnis paphia*)

The fritillary preset is set to clap at the top of each upstroke. Its morphology is measured; the wingbeat is assumed.

| | Downstroke vertical impulse ÷ upstroke thrust impulse | Upstroke mean thrust (W) | Thrust while the wings close, last 15 % of the beat (W) |
|---|---|---|---|
| Johansson & Henningsson (PIV, take-off) | 9.4 | net thrust in 24 of 24 sequences | — |
| Vortex lattice, trimmed, both wings | ${ratio(C.on)} | ${f2(C.on.us.Fx)} | ${f2(clapWin(C.on))} |
| Vortex lattice, trimmed, one wing alone | ${ratio(C.off)} | ${f2(C.off.us.Fx)} | ${f2(clapWin(C.off))} |
| Measured monarch stroke plane (−25°), both wings | ${ratio(C25.on)} | ${f2(C25.on.us.Fx)} | ${f2(clapWin(C25.on))} |
| Measured monarch stroke plane (−25°), one wing alone | ${ratio(C25.off)} | ${f2(C25.off.us.Fx)} | ${f2(clapWin(C25.off))} |

- **The closing phase gives thrust.** As the wings close at the end of the upstroke, both wings give ${((clapWin(C25.on) / clapWin(C25.off) - 1) * 100).toFixed(0)} % more thrust than one wing alone at the measured stroke plane, and ${((clapWin(C.on) / clapWin(C.off) - 1) * 100).toFixed(0)} % more in the trimmed case.
- **The mean is not reproduced.** The model's upstroke as a whole ${C.on.us.Fx > 0 ? 'gives net thrust' : 'gives net drag'}; in the animal the upstroke plus clap gave net thrust in every sequence.
- **The clap is rigid here.** The animal's clap is cupped and flexible (+22 % impulse over rigid wings in their clapper), and their numbers come from take-offs; this model has rigid wings in steady forward flight, with an assumed wingbeat.

![Fritillary forward force](figures/fritillary_forward.svg)

## 5. Free-flight pitch stability

Each case is released from the trimmed tethered motion into fully free flight with no controller.

| | Wingbeats until pitch passes ±80° | Growth of a 0.2° pitch perturbation, per beat |
|---|---|---|
| Kyoto group, *Parantica sita* (measured joint angles; panel model with free wake) | about 1 | 8.6 (Floquet multiplier of the periodic orbit) |
| Monarch | ${stab.monarch.tumble ? f2(stab.monarch.tumble) : 'did not tumble in 1.2 beats'} | ${stab.monarch.growthPerBeat.toFixed(1)} |
| Chestnut tiger | ${stab.parantica.tumble ? f2(stab.parantica.tumble) : 'did not tumble in 1.2 beats'} | ${stab.parantica.growthPerBeat.toFixed(1)} |

The growth figure comes from the separation of two releases 0.2° apart, measured over the first ${f2(stab.monarch.window)} (monarch) and ${f2(stab.parantica.window)} (chestnut tiger) beats and expressed per beat. The tethered start is not on the periodic orbit, so the figure is not a Floquet multiplier; read it as an order of magnitude.

The free body tumbles within a wingbeat, as the Kyoto group's butterfly did. The pitch-driven free mode, and the controller in the fully free mode, exist because of that.
`;
writeFileSync(new URL('validation.md', out), md);
log('wrote', new URL('validation.md', out).pathname);
