// The study behind reports/<species>/: trims the species at high resolution, then asks what each
// piece of the physics is worth (the other wing, the leading-edge vortex, body pitching, the wake
// itself versus the quasi-steady lens) and how the free-flying animal answers a gust.
// Usage: node tools/study.mjs [species]      (about two minutes for the monarch)

import { writeFileSync, mkdirSync } from 'node:fs';
import { FlightSim } from '../src/sim.js';
import { FlightController } from '../src/control.js';
import { trim } from '../src/trim.js';
import { lineChart } from './svgchart.mjs';

const species = process.argv[2] || 'monarch';
const HI = { species, M: 6, N: 12, stepsPerCycle: 48, wakeCycles: 3 };
const out = new URL(`../reports/${species}/`, import.meta.url);
mkdirSync(new URL('figures/', out), { recursive: true });
const log = (...a) => console.log(...a);
const t0 = Date.now();

// 1. trim at high resolution
log('trimming at', HI.M, '×', HI.N);
const tr = trim({ ...HI, aero: 'uvlm' }, { cycles: 3 });
log('trim', JSON.stringify(tr.kin), 'residual', tr.r.map((v) => v.toFixed(4)).join(' '), `${((Date.now() - t0) / 1000).toFixed(0)} s`);

function tethered(extra, beats = 5) {
  const sim = new FlightSim({ ...HI, aero: 'uvlm', ...extra, kin: { ...tr.kin, ...(extra.kin || {}) } });
  const tic = performance.now(); sim.run(beats); const ms = (performance.now() - tic) / sim.history.length;
  const n = HI.stepsPerCycle, H = sim.history.slice(-n), W = sim.mass * 9.81, a = sim.averages(1);
  return { sim, H, W, a, ms };
}
const cases = [
  ['Vortex lattice, trimmed', {}],
  ['Without the other wing (no clap or fling)', { interact: false }],
  ['Without leading-edge vortex lift', { lev: 'none' }],
  ['Body held at constant pitch', { kin: { chiAmp: 0 } }],
  ['Quasi-steady lens, same kinematics', { aero: 'qs', useTrim: false }],
];
const results = [];
for (const [label, extra] of cases) {
  const r = tethered(extra);
  results.push({ label, ...r });
  log(label.padEnd(44), 'L/W', r.a.liftToWeight.toFixed(3), 'T/W', r.a.thrustToWeight.toFixed(3), 'M/(W c)', (r.a.Mcom / (r.W * r.sim.cbar)).toFixed(3), `${r.ms.toFixed(1)} ms/step`);
}
const base = results[0];
const beat = (H) => H.map((r) => r.cycle - Math.floor(base.H[0].cycle));
const down = [[0, base.sim.kin.p.downRatio]];

// 2. figures: one beat of vertical and forward force, each model or variant as a series
const fig = (name, svg) => writeFileSync(new URL(`figures/${name}.svg`, out), svg);
const sel = [0, 1, 4];
fig('vertical_force', lineChart({ title: 'Vertical air force over one wingbeat', xLabel: 'wingbeat phase (0 = top of the stroke)', yLabel: 'force / body weight', ref: 1, bands: down,
  series: sel.map((i) => ({ label: ['Vortex lattice', 'No other wing', '', '', 'Quasi-steady'][i], x: beat(results[i].H), y: results[i].H.map((r) => r.Fy / results[i].W) })) }));
fig('forward_force', lineChart({ title: 'Forward air force over one wingbeat', xLabel: 'wingbeat phase (0 = top of the stroke)', yLabel: 'force / body weight', ref: 0, bands: down,
  series: sel.map((i) => ({ label: ['Vortex lattice', 'No other wing', '', '', 'Quasi-steady'][i], x: beat(results[i].H), y: results[i].H.map((r) => r.Fx / results[i].W) })) }));
fig('power', lineChart({ title: 'Mechanical power at the wing hinges', xLabel: 'wingbeat phase', yLabel: 'W per kg of body mass', ref: 0, bands: down,
  series: [
    { label: 'Aerodynamic', x: beat(base.H), y: base.H.map((r) => r.Paero / base.sim.mass) },
    { label: 'Inertial', x: beat(base.H), y: base.H.map((r) => r.Pin / base.sim.mass) },
    { label: 'Total', x: beat(base.H), y: base.H.map((r) => r.Pmech / base.sim.mass) },
  ] }));

// 3. free flight (pitch driven by the measured history): trimmed start, controller on the
//    climb rate and speed, a one-beat updraft at beat 12 and a headwind at 20
log('free flight…');
const ff = new FlightSim({ species, aero: 'uvlm', M: 5, N: 10, stepsPerCycle: 40, wakeCycles: 2, freeRows: 40, mode: 'driven', kin: { ...tr.kin } });
ff.controller = new FlightController({ trim: { psiMean: tr.kin.psiMean, phiAmp: tr.kin.phiAmp, strokePlane: tr.kin.strokePlane }, pitchRef: ff.kin.p.chiMean, speedRef: ff.U * ff.dir[0], climbRef: ff.U * ff.dir[1], gains: ff.sp.controlGains || {} });
const beats = 28, gusts = [{ at: 12, wind: [0, 0.8, 0], label: 'updraft' }, { at: 20, wind: [-0.8, 0, 0], label: 'headwind' }];
for (let i = 0; i < beats * 40; i++) {
  const c = ff.kin.cycles(ff.t), g = gusts.find((x) => c >= x.at && c < x.at + 1);
  ff.aero.wind = g ? g.wind : [0, 0, 0];
  ff.step();
}
const FH = ff.history, xs = FH.map((r) => r.cycle);
fig('free_flight_force', lineChart({ title: 'Free flight: vertical air force (gusts at beats 12 and 20)', xLabel: 'wingbeats', yLabel: 'force / body weight', ref: 1, bands: gusts.map((g) => [g.at, g.at + 1]),
  series: [{ label: 'Vertical force', x: xs, y: FH.map((r) => r.Fy / (ff.mass * 9.81)) }] }));
fig('free_flight_speed', lineChart({ title: 'Free flight: speed and climb rate', xLabel: 'wingbeats', yLabel: 'm/s', ref: 0, bands: gusts.map((g) => [g.at, g.at + 1]),
  series: [{ label: 'Forward speed', x: xs, y: FH.map((r) => r.vx) }, { label: 'Climb rate', x: xs, y: FH.map((r) => r.vy) }] }));
fig('free_flight_path', lineChart({ title: 'Free flight: height of the body over distance flown', xLabel: 'distance (m)', yLabel: 'height (mm)', bands: [],
  series: [{ label: 'Body reference point', x: FH.map((r) => +r.x.toFixed(4)), y: FH.map((r) => r.y * 1e3) }] }));
const cyc = (k) => FH.filter((r) => r.cycle >= k && r.cycle < k + 1);
const late = cyc(beats - 1);
const bobMM = (() => { const y = late.map((r, i) => r.y - (late[late.length - 1].y - late[0].y) * i / (late.length - 1)); return (Math.max(...y) - Math.min(...y)) * 1e3; })();
const lateA = { vx: late.reduce((a, r) => a + r.vx, 0) / late.length, vy: late.reduce((a, r) => a + r.vy, 0) / late.length };

// 4. report
const sp = base.sim.sp, s = base.sim, f = s.kin.p.f, U = s.U;
const Phi = s.kin.p.phiAmp * Math.PI / 180, Re = Math.hypot(U, 2 * Phi * f * 0.5 * sp.R) * s.cbar / 1.5e-5;
const row = (r) => `| ${r.label} | ${r.a.liftToWeight.toFixed(2)} | ${r.a.thrustToWeight.toFixed(2)} | ${(r.a.Mcom / (r.W * r.sim.cbar)).toFixed(3)} | ${(r.a.PmechPos / r.sim.mass).toFixed(1)} |`;
const md = `# ${sp.name} (*${sp.latin}*): what each piece of the physics is worth

Generated by \`node tools/study.mjs ${species}\` on ${new Date().toISOString().slice(0, 10)} in ${((Date.now() - t0) / 1000).toFixed(0)} s.
Vortex lattice at ${HI.M} × ${HI.N} panels per wing, ${HI.stepsPerCycle} steps per wingbeat, a ${HI.wakeCycles}-beat free wake.

## The animal and its wingbeat

| | |
|---|---|
| Body mass | ${(s.mass * 1e3).toFixed(3)} g (wings ${(2 * s.wing.mass * 1e3).toFixed(3)} g) |
| Forewing length R | ${(sp.R * 1e3).toFixed(1)} mm |
| Wing area, both pairs (union of fore- and hindwing) | ${(s.Sref * 1e4).toFixed(1)} cm² |
| Mean chord, aspect ratio | ${(s.cbar * 1e3).toFixed(1)} mm, ${s.aspect.toFixed(2)} |
| Wingbeat frequency | ${f} Hz |
| Trimmed stroke amplitude, stroke-plane tilt, mean sweep | ${tr.kin.phiAmp.toFixed(1)}°, ${tr.kin.strokePlane.toFixed(1)}°, ${tr.kin.psiMean.toFixed(1)}° |
| Body pitch (prescribed when tethered) | ${s.kin.p.chiMean}° ± ${s.kin.p.chiAmp}° |
| Flight path | ${U} m/s at a ${(s.climb * 180 / Math.PI).toFixed(0)}° climb |
| Reynolds number (mid-span, mean chord), reduced frequency, advance ratio | ${Math.round(Re)}, ${(Math.PI * f * s.cbar / U).toFixed(2)}, ${(U / (2 * Phi * f * sp.R)).toFixed(2)} |

## Cycle means with one piece removed

Each row reruns the trimmed wingbeat with one change. Forces are cycle means over the fifth beat, in body weights. The moment is about the centre of mass, divided by weight × mean chord; positive is nose-up. Power is the cycle mean of the positive mechanical power at the hinges (no elastic storage), per kg of body mass.

| Case | Lift / weight | Thrust / weight | Pitch moment | Power (W/kg) |
|---|---|---|---|---|
${results.map(row).join('\n')}

![Vertical force](figures/vertical_force.svg)

![Forward force](figures/forward_force.svg)

![Power](figures/power.svg)

## Free flight

Here the body moves under its own forces, while its pitch follows the measured history as in Fei & Yang's simulations; the fully free case is in \`reports/validation.md\`. It starts from the trim above. The controller holds the climb rate with stroke amplitude and the speed with stroke-plane tilt. It meets a one-beat updraft at beat 12 and a one-beat headwind at beat 20, both 0.8 m/s. In the last beat it flies at ${lateA.vx.toFixed(2)} m/s forward and ${lateA.vy.toFixed(2)} m/s up, bobbing ${bobMM.toFixed(1)} mm per stroke about its mean path.

![Free-flight vertical force](figures/free_flight_force.svg)

![Free-flight speed](figures/free_flight_speed.svg)

![Free-flight path](figures/free_flight_path.svg)
`;
writeFileSync(new URL('study.md', out), md);
const csv = ['phase,Fy_over_W,Fx_over_W,Paero_W_per_kg,Pin_W_per_kg', ...base.H.map((r, i) => [beat(base.H)[i].toFixed(4), (r.Fy / base.W).toFixed(4), (r.Fx / base.W).toFixed(4), (r.Paero / s.mass).toFixed(3), (r.Pin / s.mass).toFixed(3)].join(','))].join('\n');
writeFileSync(new URL('baseline_beat.csv', out), csv + '\n');
log('wrote', new URL('study.md', out).pathname, `${((Date.now() - t0) / 1000).toFixed(0)} s total`);
