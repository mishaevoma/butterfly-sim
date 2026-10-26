// Record the monarch film's simulation: one vortex-lattice step per film frame, so the film plays
// the wingbeat at FPS·BEAT film-seconds per beat. The body flies free with its measured pitch history
// (mode 'driven'), and smoke-wire streaklines are released from a rake ahead of it into still air,
// carried by the velocity the vortex system induces. Writes film/data/meta.json and one binary per
// frame (Float32: header, wake lattice, smoke). Usage: node tools/film_record.mjs [--beats 15] [--fps 30]

import { mkdirSync, writeFileSync } from 'node:fs';
import { FlightSim } from '../src/sim.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const FPS = +(args.fps || 30), BEAT = +(args.beatSeconds || 2), BEATS = +(args.beats || 15), WARM = +(args.warm || 4);
const SPB = Math.round(FPS * BEAT); // steps per beat = frames per beat
const dataDir = new URL('../film/data/', import.meta.url);
mkdirSync(dataDir, { recursive: true });

const sim = new FlightSim({ species: 'monarch', aero: 'uvlm', mode: 'driven', M: 6, N: 12, stepsPerCycle: SPB, wakeCycles: 3 });
const R = sim.sp.R, dt = sim.dt;

// smoke rake: two spanwise planes on the right wing (mirrored when drawn), 14 emitters each, a
// little ahead of the head along the flight direction; each emitter keeps the last LIFE particles
const PLANES = [0.38, 0.72], PER = 14, E = PLANES.length * PER, LIFE = Math.round(1.6 * SPB);
const sx = new Float64Array(E * LIFE * 3), sage = new Float64Array(E * LIFE).fill(-1);
let head = 0;
function smokeStep() {
  // advect every live particle with the induced velocity (still air otherwise)
  const live = [];
  for (let k = 0; k < E * LIFE; k++) if (sage[k] >= 0) live.push(k);
  if (live.length) {
    const pts = new Float64Array(live.length * 3);
    live.forEach((k, i) => { pts[3 * i] = sx[3 * k]; pts[3 * i + 1] = sx[3 * k + 1]; pts[3 * i + 2] = sx[3 * k + 2]; });
    const v = sim.aero.probe(pts, live.length);
    live.forEach((k, i) => {
      sx[3 * k] += v[3 * i] * dt; sx[3 * k + 1] += v[3 * i + 1] * dt; sx[3 * k + 2] = Math.max(0, sx[3 * k + 2] + v[3 * i + 2] * dt);
      sage[k] += dt;
    });
  }
  // emit one particle per emitter into slot `head` (the oldest)
  const r = sim.state.r, vb = sim.state.v, vm = Math.hypot(vb[0], vb[1]) || 1, dir = [vb[0] / vm, vb[1] / vm];
  for (let p = 0; p < PLANES.length; p++) for (let j = 0; j < PER; j++) {
    const e = p * PER + j, k = e * LIFE + head;
    const along = 1.05 * R, across = (-1.0 + 2.0 * j / (PER - 1)) * 0.95 * R; // across = normal to the path, in the vertical plane
    sx[3 * k] = r[0] + along * dir[0] - across * dir[1];
    sx[3 * k + 1] = r[1] + along * dir[1] + across * dir[0];
    sx[3 * k + 2] = PLANES[p] * R;
    sage[k] = 0;
  }
  head = (head + 1) % LIFE;
}

// warm up: the wake and the smoke establish themselves before frame 0
const t0 = Date.now();
for (let i = 0; i < WARM * SPB; i++) { sim.step(); smokeStep(); }
console.log(`warm-up ${WARM} beats in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

const NF = BEATS * SPB, bodies = [];
for (let n = 0; n < NF; n++) {
  const rec = sim.step(); smokeStep();
  const s = sim.surfaces[0], N = s.N, nW = s.nW, last = sim.last, P = last.pose;
  const k = sim.kin.at(rec.t, 1);
  const hdr = [rec.t, ...P.r, ...P.q, k.phi, k.alpha, k.psi, k.twist, k.camber, k.bend, k.beta, k.abd, k.chi, k.cycle, rec.comX, rec.comY, rec.Fx, rec.Fy, nW, N, head];
  const nodes = nW * (N + 1) * 3, rings = Math.max(0, nW - 1);
  const buf = new Float32Array(32 + nodes + rings * N + rings + E * LIFE * 4);
  buf.set(hdr, 0);
  let o = 32;
  buf.set(s.W.subarray(0, nodes), o); o += nodes;
  buf.set(s.Wg.subarray(0, rings * N), o); o += rings * N;
  for (let r = 0; r < rings; r++) buf[o + r] = rec.t - s.Wbirth[r];
  o += rings;
  for (let q = 0; q < E * LIFE; q++) { buf[o++] = sx[3 * q]; buf[o++] = sx[3 * q + 1]; buf[o++] = sx[3 * q + 2]; buf[o++] = sage[q]; }
  writeFileSync(new URL(`f${String(n).padStart(4, '0')}.bin`, dataDir), Buffer.from(buf.buffer));
  bodies.push([P.r[0], P.r[1], P.r[2]]);
  if (n % SPB === 0) console.log(`frame ${n}/${NF}  beat ${(rec.cycle).toFixed(2)}  L/W ${(rec.Fy / (sim.mass * 9.81)).toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// camera centre: the body position averaged over one beat (centred), so the frame follows the
// flight path smoothly and the stroke-by-stroke bob stays visible
const cam = bodies.map((_, i) => {
  const a = Math.max(0, i - SPB / 2), b = Math.min(bodies.length - 1, i + SPB / 2), c = [0, 0, 0];
  for (let j = a; j <= b; j++) for (let q = 0; q < 3; q++) c[q] += bodies[j][q] / (b - a + 1);
  return c.map((v) => +v.toFixed(6));
});
const a = sim.averages(BEATS);
writeFileSync(new URL('meta.json', dataDir), JSON.stringify({
  species: 'monarch', fps: FPS, beatSeconds: BEAT, stepsPerBeat: SPB, nFrames: NF, dt, f: sim.kin.p.f, R,
  slowdown: BEAT * sim.kin.p.f, mass: sim.mass, cbar: sim.cbar, U: sim.U, wakeCycles: 3, symmetric: true, M: 6, N: 12,
  emitters: E, life: LIFE, planes: PLANES, per: PER, cam,
  flight: { speed: Math.hypot(a.vx, a.vy), climb: Math.atan2(a.vy, a.vx) * 180 / Math.PI, liftToWeight: a.liftToWeight },
}));
console.log(`recorded ${NF} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s; flight ${Math.hypot(a.vx, a.vy).toFixed(2)} m/s at ${(Math.atan2(a.vy, a.vx) * 180 / Math.PI).toFixed(1)}°`);
