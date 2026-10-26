// The monarch wake film: plays back film/data (recorded by tools/film_record.mjs) one frame per
// simulation step through the viewer's own scene, adds smoke-wire streaklines, bloom, a scripted
// camera and three captions. Deterministic: window.renderFrame(n) draws frame n.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { FlightScene, SCALE } from '../viewer/scene.js';
import { SPECIES } from '../src/species.js';

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = +(q.get('h') || 1080);
const meta = await (await fetch('data/meta.json')).json();
const FPS = meta.fps, NF = meta.nFrames, DUR = NF / FPS;

const canvas = document.getElementById('view');
const fs = new FlightScene(canvas);
fs.renderer.setPixelRatio(1);
fs.resize(W, H);
fs.controls.enabled = false;
fs.setSpecies(SPECIES[meta.species], true);
fs.opts = { wake: 'filaments', loads: false, arrows: false, follow: true, trail: false };
fs.scene.fog = new THREE.Fog('#0b0f14', 7, 26);
fs.scene.background = new THREE.Color('#080b0f');
fs.camera.fov = 32; fs.camera.near = 0.02; fs.camera.far = 80; fs.camera.updateProjectionMatrix();
fs.lineMat.linewidth = 1.7;
document.getElementById('stage').style.width = W + 'px';
// captions are laid out for 1080p; scale them with the frame height
document.querySelectorAll('.cap').forEach((c) => { c.style.transformOrigin = '0 100%'; c.style.transform = `scale(${H / 1080})`; });

// smoke-wire streaklines (and their mirror image on the left wing)
const smokeMat = new LineMaterial({ vertexColors: true, linewidth: 1.3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
smokeMat.resolution.set(W, H);
const smoke = new LineSegments2(new LineSegmentsGeometry(), smokeMat);
smoke.frustumCulled = false; fs.world.add(smoke);

// bloom so filaments and smoke glow a little
const composer = new EffectComposer(fs.renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(fs.scene, fs.camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.5, 0.16);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- timeline ----------
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const window01 = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));
// camera keyframes in scene units (decimetres) about the camera centre; the flight path climbs
// about 26°, so the wake trails down and back
const KEYS = [
  { t: 0.0, eye: [0.60, 0.15, 3.40], at: [-0.45, -0.12, 0.00] },
  { t: 6.5, eye: [0.30, 0.18, 3.00], at: [-0.55, -0.20, 0.00] },
  { t: 11.5, eye: [-2.60, 1.30, 3.10], at: [-0.90, -0.38, 0.00] },
  { t: 16.5, eye: [-3.70, 1.95, 2.05], at: [-0.80, -0.30, 0.00] },
  { t: 21.0, eye: [-3.10, -0.30, 2.50], at: [-0.80, -0.32, 0.00] },
  { t: 25.5, eye: [2.00, 0.60, 3.60], at: [-1.00, -0.42, 0.00] },
  { t: 30.0, eye: [2.80, 0.90, 4.60], at: [-1.20, -0.48, 0.00] },
];
function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3));
}
function cameraAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[Math.max(0, i - 1)], b = KEYS[i], c = KEYS[i + 1], d = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const u = smooth(0, 1, (t - b.t) / (c.t - b.t)) * 0.65 + 0.35 * Math.min(1, Math.max(0, (t - b.t) / (c.t - b.t))); // eased, never stalling
  return { eye: catmull(a.eye, b.eye, c.eye, d.eye, u), at: catmull(a.at, b.at, c.at, d.at, u) };
}

const cap = (id, a) => { document.getElementById(id).style.opacity = a.toFixed(3); };

async function loadFrame(n) {
  const buf = await (await fetch(`data/f${String(n).padStart(4, '0')}.bin`)).arrayBuffer();
  const a = new Float32Array(buf);
  const t = a[0], r = [a[1], a[2], a[3]], qq = [a[4], a[5], a[6], a[7]];
  const k = { phi: a[8], alpha: a[9], psi: a[10], twist: a[11], camber: a[12], bend: a[13], beta: a[14], abd: a[15], chi: a[16], cycle: a[17] };
  const nW = a[22], N = a[23];
  let o = 32;
  const nodes = nW * (N + 1) * 3, rings = Math.max(0, nW - 1);
  const wake = a.subarray(o, o + nodes); o += nodes;
  const wg = a.subarray(o, o + rings * N); o += rings * N;
  const age = Float32Array.from(a.subarray(o, o + rings), (v) => t - v); o += rings; // birth times
  const sm = a.subarray(o);
  return {
    t, smokeData: sm,
    frame: { t, pose: { r, q: qq }, kR: k, kL: k, abd: k.abd, F: [a[20], a[21], 0], rec: { comX: a[18], comY: a[19] },
      surfaces: [{ N, M: meta.M, nW, wake, wg, age, dcp: new Float32Array(meta.M * N), G: new Float32Array(meta.M * N) }], smoke: null },
  };
}

// Chaikin corner cutting: smooths the kinks a particle path picks up near a vortex core
function chaikin(pts, iters = 2) {
  let p = pts;
  for (let it = 0; it < iters && p.length > 2; it++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push(a.map((v, k) => 0.75 * v + 0.25 * b[k]), a.map((v, k) => 0.25 * v + 0.75 * b[k]));
    }
    q.push(p[p.length - 1]); p = q;
  }
  return p;
}

function drawSmoke(sm, alpha) {
  const E = meta.emitters, L = meta.life, life = L * meta.dt, dt = meta.dt, o = fs.offset;
  const pos = [], col = [];
  const P = (x, y, z) => [(x - o.x) * SCALE, (y - o.y) * SCALE, (z - o.z) * SCALE];
  for (let e = 0; e < E; e++) {
    const pts = [];
    for (let s = 0; s < L; s++) { const b = 4 * (e * L + s); if (sm[b + 3] >= 0) pts.push([sm[b], sm[b + 1], sm[b + 2], sm[b + 3]]); }
    pts.sort((p, q2) => p[3] - q2[3]);
    // split into runs without gaps, smooth each, then draw with an age fade
    const runs = []; let run = [];
    for (const p of pts) { if (run.length && p[3] - run[run.length - 1][3] > 1.5 * dt) { runs.push(run); run = []; } run.push(p); }
    if (run.length) runs.push(run);
    for (const r0 of runs) {
      const r = chaikin(r0);
      for (let i = 1; i < r.length; i++) {
        const p0 = r[i - 1], p1 = r[i];
        const fade = Math.pow(Math.max(0, 1 - p1[3] / life), 1.4) * Math.min(1, p0[3] / (4 * dt) + 0.15);
        const c = alpha * 0.5 * fade;
        if (c < 0.004) continue;
        pos.push(...P(p0[0], p0[1], -p0[2]), ...P(p1[0], p1[1], -p1[2])); // the far wing's sheets, behind the body
        col.push(0.86 * c, 0.92 * c, c, 0.86 * c, 0.92 * c, c);
      }
    }
  }
  const old = smoke.geometry, g = new LineSegmentsGeometry();
  if (pos.length) { g.setPositions(new Float32Array(pos)); g.setColors(new Float32Array(col)); }
  smoke.geometry = g; old.dispose();
}

const metaFS = { mode: 'driven', mass: meta.mass, cbar: meta.cbar, f: meta.f, U: meta.U, R: meta.R, symmetric: true, wakeCycles: meta.wakeCycles };
window.NF = NF; window.FPS = FPS;
window.renderFrame = async (n) => {
  const { frame, smokeData } = await loadFrame(n);
  const t = n / FPS;
  fs.offsetOverride = meta.cam?.[n] ? new THREE.Vector3(...meta.cam[n]) : new THREE.Vector3(...frame.pose.r);
  fs.update(frame, metaFS);
  const smokeAlpha = smooth(0, 1.2, t) * (1 - 0.45 * smooth(15, 19, t) + 0.25 * smooth(24, 27, t));
  fs.lineMat.opacity = 0.85 * smooth(6.5, 9.5, t) * (1 - 0.1 * smooth(25, 30, t));
  fs.wakeLines.visible = fs.lineMat.opacity > 0.005;
  drawSmoke(smokeData, smokeAlpha);
  const c = cameraAt(Math.min(t, DUR));
  fs.camera.position.set(...c.eye); fs.camera.lookAt(new THREE.Vector3(...c.at));
  cap('c1', window01(0.8, 1.8, 4.6, 5.6, t));
  cap('c2', window01(9.4, 10.4, 13.6, 14.6, t));
  cap('c3', window01(25.4, 26.4, 28.6, 29.4, t));
  document.getElementById('fade').style.opacity = (1 - smooth(0, 0.9, t) + smooth(DUR - 1.0, DUR, t)).toFixed(3);
  composer.render();
};
window.sceneReady = true;
if (!q.has('render')) { // preview in a browser: play through once
  let n = 0;
  const tick = async () => { await window.renderFrame(n); n = (n + 1) % NF; requestAnimationFrame(tick); };
  tick();
}
