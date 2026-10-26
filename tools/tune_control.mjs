// Grid-search the free-flight controller gains on the quasi-steady model (fast), scoring how well
// a trimmed monarch holds pitch, speed and altitude for `cycles` wingbeats after a start at the
// tethered trim. Usage: node tools/tune_control.mjs [species] [cycles]
import { FlightSim } from '../src/sim.js';
import { FlightController } from '../src/control.js';
import { trim } from '../src/trim.js';

const species = process.argv[2] || 'monarch', cycles = +(process.argv[3] || 20);
const base = { aero: 'qs', species, M: 6, N: 10 };
const tr = trim(base, { cycles: 2 });
console.log('trim', JSON.stringify(tr.kin));

export function score(gains, { verbose = false, aero = 'qs', cyc = cycles } = {}) {
  const sim = new FlightSim({ ...base, aero, kin: tr.kin, mode: 'free' });
  const ref = { pitch: sim.kin.p.chiMean, speed: sim.U };
  sim.controller = new FlightController({ trim: { psiMean: tr.kin.psiMean, phiAmp: tr.kin.phiAmp, strokePlane: tr.kin.strokePlane }, pitchRef: ref.pitch, speedRef: ref.speed, gains });
  let cost = 0;
  for (let c = 0; c < cyc; c++) {
    sim.run(1);
    const a = sim.averages(1), r = sim.history[sim.history.length - 1];
    const e = ((a.pitch * 57.3 - ref.pitch) / 10) ** 2 + ((a.vx - ref.speed) / 0.3) ** 2 + (r.y / 0.05) ** 2 + (a.vy / 0.2) ** 2;
    if (!isFinite(e) || Math.abs(r.pitch) > 1.5) return 1e9;
    cost += e * (c > 3 ? 1 : 0.2);
    if (verbose) console.log(`cyc ${c + 1}: vx ${a.vx.toFixed(2)} vy ${a.vy.toFixed(2)} y ${(r.y * 1e3).toFixed(1)}mm pitch ${(a.pitch * 57.3).toFixed(1)}° | ψ̄ ${sim.controller.cmd.psiMean.toFixed(1)} Φ ${sim.controller.cmd.phiAmp.toFixed(1)} β ${sim.controller.cmd.strokePlane.toFixed(1)}`);
  }
  return cost / cyc;
}

if (process.argv[1].endsWith('tune_control.mjs')) {
  let best = { cost: Infinity };
  for (const kPitch of [0.5, 1, 2]) for (const kRate of [0.03, 0.08, 0.15]) for (const kIPitch of [0.4, 1.5]) for (const kClimb of [20, 40]) for (const kIAlt of [40, 120]) {
    const g = { kPitch, kRate, kIPitch, kClimb, kAlt: 1.5 * kClimb, kIAlt };
    const c = score(g);
    if (c < best.cost) { best = { cost: c, g }; console.log('better', c.toFixed(3), JSON.stringify(g)); }
  }
  console.log('best', JSON.stringify(best));
  score(best.g, { verbose: true });
}
