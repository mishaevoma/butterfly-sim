// three.js scene: a dark test section, the butterfly (fine render mesh driven by the solver's
// kinematics), its wake lattice as glowing filaments, loads on the wing and force arrows.
// Scene units are decimetres (sim metres × 10) so the animal is about one unit across.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { WingMesh } from '../src/wing.js';
import { qToMat } from '../src/math.js';
import { paintWing, uvOf, texFrame } from './wingtex.js';

export const SCALE = 10;
const POS = new THREE.Color('#e66767'), NEG = new THREE.Color('#3987e5'), MID = new THREE.Color('#5b6470');

export class FlightScene {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c1015');
    this.scene.fog = new THREE.Fog('#0c1015', 6, 22);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.02, 200);
    this.camera.position.set(0.4, 0.35, 3.1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.target.set(-0.25, 0, 0);
    this.controls.minDistance = 0.4; this.controls.maxDistance = 12;
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.addEnvironment();
    this.opts = { wake: 'filaments', loads: false, arrows: true, follow: true, trail: true };
    this.offset = new THREE.Vector3();
    this.trail = [];
  }

  addEnvironment() {
    const hemi = new THREE.HemisphereLight('#c9d6e6', '#1a1410', 0.9); this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff4e6', 2.2); key.position.set(2, 4, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight('#8fb4ff', 0.9); rim.position.set(-3, 1.5, -2.5); this.scene.add(rim);
    // tunnel floor: a 1 cm grid (0.1 scene units), fading out
    const grid = new THREE.GridHelper(20, 200, '#25303b', '#18212a');
    grid.position.y = -0.9; grid.material.transparent = true; grid.material.opacity = 0.65; this.scene.add(grid);
    this.grid = grid;
    const major = new THREE.GridHelper(20, 20, '#33414f', '#2a3642');
    major.position.y = -0.899; major.material.transparent = true; major.material.opacity = 0.8; this.scene.add(major);
    this.major = major;
  }

  // Build the butterfly for a species (meta from the worker, species preset from src/species.js).
  setSpecies(sp, symmetric) {
    if (this.bfly) { this.world.remove(this.bfly); this.bfly.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
    this.sp = sp; this.symmetric = symmetric; this._zs = null;
    const bf = this.bfly = new THREE.Group(); this.world.add(bf);
    // fine render mesh of the wing: same planform and kinematics as the solver's lattice
    this.rmesh = new WingMesh({ outline: sp.outline, fore: sp.fore, hind: sp.hind, R: sp.R, M: 18, N: 48, spanPower: 1.0, hinge: sp.hinge, mass: 0, pivotX: sp.pivotX, rootFade: sp.rootFade, zContact: 0.4e-3 });
    const { M, N } = this.rmesh, nn = (M + 1) * (N + 1), fr = texFrame(sp);
    const uv = new Float32Array(nn * 2);
    for (let k = 0; k < nn; k++) { const [u, v] = uvOf(this.rmesh.x0[k] / sp.R, this.rmesh.z0[k] / sp.R, fr); uv[2 * k] = u; uv[2 * k + 1] = v; }
    const idx = [];
    for (let i = 0; i < M; i++) for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j, b = a + 1, c = a + N + 2, d = a + N + 1;
      idx.push(a, d, b, b, d, c);
    }
    const mkTex = (side) => { const t = new THREE.CanvasTexture(paintWing(sp, 1024, side)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    this.texD = mkTex('dorsal'); this.texV = mkTex('ventral');
    this.wings = [];
    for (const side of [1, -1]) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nn * 3), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nn * 3).fill(1), 3));
      geo.setIndex(side > 0 ? idx : idx.slice().reverse());
      const matD = new THREE.MeshStandardMaterial({ map: this.texD, side: THREE.FrontSide, alphaTest: 0.5, transparent: false, roughness: 0.62, metalness: 0.0 });
      const matV = new THREE.MeshStandardMaterial({ map: this.texV, side: THREE.BackSide, alphaTest: 0.5, roughness: 0.7, metalness: 0.0 });
      const front = new THREE.Mesh(geo, matD), back = new THREE.Mesh(geo, matV);
      bf.add(front, back);
      this.wings.push({ side, geo, front, back, pb: new Float64Array(nn * 3) });
    }
    // body: thorax, head, eyes, abdomen and antennae
    const dark = new THREE.MeshStandardMaterial({ color: '#16110d', roughness: 0.55, metalness: 0.05 });
    const dotted = new THREE.MeshStandardMaterial({ color: '#1d1712', roughness: 0.5, emissive: '#000000' });
    const S = SCALE, B = sp.body;
    this.bodyGroup = new THREE.Group(); bf.add(this.bodyGroup);
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), dark);
    thorax.scale.set(B.thorax.length / 2 * S, B.thorax.diameter / 2 * S, B.thorax.diameter / 2 * S * 1.05);
    thorax.position.set(B.thorax.com[0] * S, B.thorax.com[1] * S, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry((B.head?.diameter ?? 0.0035) / 2 * S, 20, 14), dark);
    head.position.set((B.thorax.com[0] + B.thorax.length / 2 + (B.head?.length ?? 0.003) / 2) * S, B.thorax.com[1] * S, 0);
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.25, metalness: 0.2 });
    for (const z of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry((B.head?.diameter ?? 0.0035) * 0.33 * S, 14, 10), eyeMat);
      e.position.copy(head.position).add(new THREE.Vector3(0.0004 * S, 0.0003 * S, z * (B.head?.diameter ?? 0.0035) * 0.36 * S));
      this.bodyGroup.add(e);
    }
    // antennae with clubs
    const antMat = new THREE.LineBasicMaterial({ color: '#2b241e' });
    for (const z of [-1, 1]) {
      const p0 = head.position.clone().add(new THREE.Vector3(0.001 * S, 0.0012 * S, z * 0.0006 * S));
      const L = sp.R * 0.42 * S;
      const pts = [p0, p0.clone().add(new THREE.Vector3(L * 0.55, L * 0.62, z * L * 0.22)), p0.clone().add(new THREE.Vector3(L * 0.75, L * 0.95, z * L * 0.32))];
      const curve = new THREE.QuadraticBezierCurve3(...pts);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(16)), antMat);
      const club = new THREE.Mesh(new THREE.SphereGeometry(0.00045 * S, 10, 8), dark);
      club.scale.set(1.8, 1, 1); club.position.copy(pts[2]);
      this.bodyGroup.add(line, club);
    }
    this.bodyGroup.add(thorax, head);
    // white dots on the thorax and head, as on a monarch
    const spotMat = new THREE.MeshBasicMaterial({ color: '#d9d2c3' });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.00028 * S, 6, 4), spotMat);
      s.position.set(thorax.position.x + Math.cos(a) * B.thorax.length * 0.3 * S, thorax.position.y + B.thorax.diameter * 0.43 * S, Math.sin(a) * B.thorax.diameter * 0.25 * S);
      this.bodyGroup.add(s);
    }
    // abdomen: a tapered lathe, pivoting at the petiole
    const prof = [];
    const La = B.abdomen.length * S, Ra = B.abdomen.diameter / 2 * S;
    for (let k = 0; k <= 16; k++) { const s = k / 16; prof.push(new THREE.Vector2(Ra * Math.sin(Math.PI * Math.min(1, s * 1.15 + 0.06)) * (1 - 0.35 * s) + 1e-4, -s * La)); }
    const abdGeo = new THREE.LatheGeometry(prof.reverse(), 18);
    abdGeo.rotateZ(-Math.PI / 2); // lathe axis: the tip (y = −La) ends up at x = −La, pointing backwards
    const abd = new THREE.Mesh(abdGeo, dotted);
    this.abdPivot = new THREE.Group(); this.abdPivot.position.set(B.abdomen.joint[0] * S, B.abdomen.joint[1] * S, 0);
    abd.rotation.z = 0; abd.scale.set(1, 1, 1);
    this.abdPivot.add(abd); this.bodyGroup.add(this.abdPivot);
    this.abdMesh = abd;
    // wake
    this.wakeGroup = new THREE.Group(); this.world.add(this.wakeGroup);
    // filaments as screen-space wide lines; additive blending, so colour brightness acts as opacity
    this.lineMat = new LineMaterial({ vertexColors: true, linewidth: 1.7, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.lineMat.resolution.set(this.renderer.domElement.width, this.renderer.domElement.height);
    this.wakeLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat);
    this.wakeLines.frustumCulled = false;
    // smoke tracers
    const spr = document.createElement('canvas'); spr.width = spr.height = 64;
    const sg2 = spr.getContext('2d'), rg = sg2.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    sg2.fillStyle = rg; sg2.fillRect(0, 0, 64, 64);
    this.smoke = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(spr), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.smoke.frustumCulled = false; this.world.add(this.smoke);
    this.wakeSheet = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.wakeSheet.frustumCulled = false;
    this.wakeGroup.add(this.wakeLines, this.wakeSheet);
    // arrows: aerodynamic force and weight, at the centre of mass
    this.arrowF = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, '#f3efe6', 0.06, 0.035);
    this.arrowW = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 0.3, '#7b8692', 0.05, 0.03);
    this.world.add(this.arrowF, this.arrowW);
    // flight path
    this.trailLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#c58a52', transparent: true, opacity: 0.55 }));
    this.trailLine.frustumCulled = false; this.world.add(this.trailLine);
    this.trail = [];
  }

  // frame: { pose {r,q}, kR, kL, abd, surfaces, F, rec }, meta from the worker
  update(frame, meta) {
    if (!this.bfly) return;
    const S = SCALE, R = qToMat(frame.pose.q), r = frame.pose.r;
    // view frame: follow the body (wind-tunnel view), smoothing the vertical bob a little
    const target = new THREE.Vector3(r[0], r[1], r[2]);
    if (!this.opts.follow) { if (!this.fixed) this.fixed = target.clone(); target.copy(this.fixed); } else this.fixed = null;
    if (!this.offsetInit) { this.offset.copy(target); this.offsetInit = true; }
    // follow the body; in free flight smooth the vertical bob so the stroke-by-stroke heave shows
    this.offset.x = target.x; this.offset.z = target.z; this.offset.y += (target.y - this.offset.y) * (meta.mode === 'tethered' ? 1 : 0.08);
    if (this.offsetOverride) this.offset.copy(this.offsetOverride); // a scripted camera centre (the film)
    const toScene = (x, y, z, out, k) => {
      out[k] = (x - this.offset.x) * S; out[k + 1] = (y - this.offset.y) * S; out[k + 2] = (z - this.offset.z) * S;
    };
    // body transform
    const m4 = new THREE.Matrix4().set(R[0], R[1], R[2], (r[0] - this.offset.x) * S, R[3], R[4], R[5], (r[1] - this.offset.y) * S, R[6], R[7], R[8], (r[2] - this.offset.z) * S, 0, 0, 0, 1);
    this.bodyGroup.matrixAutoUpdate = false; this.bodyGroup.matrix.copy(m4); this.bodyGroup.matrixWorldNeedsUpdate = true;
    this.abdPivot.rotation.z = -((this.sp.body.abdomen.rest ?? 0) + frame.abd); // ζ > 0 lifts the tip
    this.abdMesh.rotation.z = 0;
    // wings
    for (const w of this.wings) {
      const k = w.side > 0 ? frame.kR : frame.kL;
      this.rmesh.bodyPoints(k, w.side, w.pb);
      const P = w.geo.attributes.position.array, pb = w.pb;
      for (let o = 0; o < pb.length; o += 3) {
        const x = pb[o], y = pb[o + 1], z = pb[o + 2];
        toScene(r[0] + R[0] * x + R[1] * y + R[2] * z, r[1] + R[3] * x + R[4] * y + R[5] * z, r[2] + R[6] * x + R[7] * y + R[8] * z, P, o);
      }
      w.geo.attributes.position.needsUpdate = true;
      w.geo.computeVertexNormals();
      this.paintLoads(w, frame);
    }
    // wake filaments and smoke
    this.updateWake(frame, meta, toScene);
    this.updateSmoke(frame, toScene);
    // arrows at the centre of mass
    const com = frame.rec ? [r[0] + frame.rec.comX, r[1] + frame.rec.comY, r[2]] : r;
    const c = new THREE.Vector3((com[0] - this.offset.x) * S, (com[1] - this.offset.y) * S, (com[2] - this.offset.z) * S);
    const W = meta.mass * 9.81, F = frame.F, Fm = Math.hypot(F[0], F[1], F[2]);
    const len = 0.32 * Fm / W; // one body weight = 0.32 units (3.2 cm)
    this.arrowF.visible = this.arrowW.visible = this.opts.arrows && Fm > 0;
    if (Fm > 0) { this.arrowF.position.copy(c); this.arrowF.setDirection(new THREE.Vector3(F[0] / Fm, F[1] / Fm, F[2] / Fm)); this.arrowF.setLength(Math.max(0.02, len), Math.min(0.08, 0.3 * len + 0.02), 0.035); }
    this.arrowW.position.copy(c);
    // path of the centre of mass
    if (this.opts.trail) {
      this.trail.push([com[0], com[1], com[2]]); if (this.trail.length > 600) this.trail.shift();
      const pts = new Float32Array(this.trail.length * 3);
      this.trail.forEach((p, i) => toScene(p[0], p[1], p[2], pts, 3 * i));
      this.trailLine.geometry.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      this.trailLine.geometry.setDrawRange(0, this.trail.length);
    }
    this.trailLine.visible = this.opts.trail;
    // floor scrolls with the air (it is fixed in the world frame)
    const gx = -((this.offset.x * S) % 0.1), gz = -((this.offset.z * S) % 0.1), gy = -0.9 - (this.offset.y * S) * 0;
    this.grid.position.set(gx, gy, gz); this.major.position.set(-((this.offset.x * S) % 1), gy + 0.001, -((this.offset.z * S) % 1));
  }

  paintLoads(w, frame) {
    const mats = [w.front.material, w.back.material];
    const on = this.opts.loads && frame.surfaces.length > 0;
    for (const m of mats) { if (m.vertexColors !== on) { m.vertexColors = on; m.map = on ? null : (m === w.front.material ? this.texD : this.texV); m.needsUpdate = true; } }
    if (!on) return;
    const s = frame.surfaces[w.side > 0 || this.symmetric ? 0 : 1] || frame.surfaces[0];
    const { M: Ms, N: Ns, dcp } = s, rm = this.rmesh, Wr = rm.N + 1;
    const col = w.geo.attributes.color.array, c = new THREE.Color();
    // solver stations along the span, to find the panel under each render node
    const zs = this.solverZs(Ns);
    for (let i = 0; i <= rm.M; i++) for (let j = 0; j <= rm.N; j++) {
      const k = i * Wr + j, f = rm.f0[k], z = rm.z0[k];
      const ii = Math.min(Ms - 1, Math.floor(f * Ms));
      let jj = 0; while (jj < Ns - 1 && zs[jj + 1] < z) jj++;
      const v = dcp[ii * Ns + jj] || 0;
      // diverging: + (pushes dorsally) red, − blue, through a neutral grey; ±3 saturates
      const t = Math.max(-1, Math.min(1, v / 3));
      c.copy(MID).lerp(t >= 0 ? POS : NEG, Math.abs(t));
      col[3 * k] = c.r; col[3 * k + 1] = c.g; col[3 * k + 2] = c.b;
    }
    w.geo.attributes.color.needsUpdate = true;
  }
  solverZs(Ns) {
    if (this._zs && this._zs.length === Ns + 1) return this._zs;
    const st = (this.sp.outline || [...this.sp.fore, ...this.sp.hind]).map((s) => s[0]);
    const zmax = Math.max(...st) * this.sp.R;
    this._zs = Array.from({ length: Ns + 1 }, (_, j) => zmax * j / Ns);
    return this._zs;
  }

  updateWake(frame, meta, toScene) {
    const mode = this.opts.wake;
    this.wakeLines.visible = mode === 'filaments' || mode === 'both';
    this.wakeSheet.visible = mode === 'sheet' || mode === 'both';
    if (mode === 'off' || !frame.surfaces.length) { this.wakeLines.visible = this.wakeSheet.visible = false; return; }
    const sides = meta.symmetric ? [1, -1] : [1];
    // filament strengths first, to scale the display by what this wake actually carries
    const strengths = [];
    for (const s of frame.surfaces) {
      const { N, nW, wg: G } = s, rows = Math.max(0, nW - 1);
      for (let r = 0; r <= rows; r++) for (let j = 0; j < N; j++) strengths.push(Math.abs((r < rows ? G[r * N + j] : 0) - (r > 0 ? G[(r - 1) * N + j] : 0)));
      for (let r = 0; r < rows; r++) for (let cc = 0; cc <= N; cc++) strengths.push(Math.abs((cc > 0 ? G[r * N + cc - 1] : 0) - (cc < N ? G[r * N + cc] : 0)));
    }
    if (!strengths.length) return;
    const sorted = Float32Array.from(strengths).sort();
    const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))] || 1e-9;
    this.gRef = this.gRef ? 0.9 * this.gRef + 0.1 * p90 : p90;
    let ringMax = 1e-9;
    for (const s of frame.surfaces) for (let k = 0; k < s.wg.length; k++) ringMax = Math.max(ringMax, Math.abs(s.wg[k]));
    this.ringRef = this.ringRef ? 0.9 * this.ringRef + 0.1 * ringMax : ringMax;
    const gRef = this.gRef, ringRef = this.ringRef;
    let nSeg = 0, nTri = 0;
    for (const s of frame.surfaces) { const rows = Math.max(0, s.nW - 1); nSeg += (rows + 1) * s.N + rows * (s.N + 1); nTri += rows * s.N * 2; }
    nSeg *= sides.length; nTri *= sides.length;
    const pos = new Float32Array(nSeg * 6), col = new Float32Array(nSeg * 6);
    const sp = new Float32Array(nTri * 9), sc = new Float32Array(nTri * 12);
    let q = 0, qt = 0;
    const c = new THREE.Color(), tmp = new Float32Array(3), tmp2 = new Float32Array(3);
    const tNow = frame.t, life = (meta.wakeCycles || 2) / meta.f;
    for (const side of sides) for (const s of frame.surfaces) {
      const { N, nW, wake: X, wg: G, age } = s, W = N + 1, rows = Math.max(0, nW - 1);
      const put = (a, b, g, ageS) => {
        const t = Math.max(-1, Math.min(1, side * g / (1.2 * gRef)));
        const fade = Math.max(0, 1 - ageS / life), a8 = Math.pow(Math.abs(t), 1.15) * (0.2 + 0.8 * fade);
        if (a8 < 0.02 || !Number.isFinite(X[3 * a] + X[3 * a + 1] + X[3 * a + 2] + X[3 * b] + X[3 * b + 1] + X[3 * b + 2])) return;
        toScene(X[3 * a], X[3 * a + 1], side * X[3 * a + 2], tmp, 0); toScene(X[3 * b], X[3 * b + 1], side * X[3 * b + 2], tmp2, 0);
        pos.set(tmp, 6 * q); pos.set(tmp2, 6 * q + 3);
        c.copy(MID).lerp(t >= 0 ? POS : NEG, Math.min(1, 0.35 + Math.abs(t)));
        for (const o of [6 * q, 6 * q + 3]) { col[o] = c.r * a8; col[o + 1] = c.g * a8; col[o + 2] = c.b * a8; }
        q++;
      };
      for (let r = 0; r <= rows; r++) for (let j = 0; j < N; j++) {
        const g = (r < rows ? G[r * N + j] : 0) - (r > 0 ? G[(r - 1) * N + j] : 0);
        put(r * W + j, r * W + j + 1, g, tNow - age[Math.min(r, rows - 1)]);
      }
      for (let r = 0; r < rows; r++) for (let cc = 0; cc <= N; cc++) {
        const g = (cc > 0 ? G[r * N + cc - 1] : 0) - (cc < N ? G[r * N + cc] : 0);
        put(r * W + cc, (r + 1) * W + cc, g, tNow - age[r]);
      }
      // translucent sheet coloured by ring strength (the potential jump across the sheet)
      if (this.wakeSheet.visible) for (let r = 0; r < rows; r++) for (let j = 0; j < N; j++) {
        const ids = [r * W + j, r * W + j + 1, (r + 1) * W + j + 1, (r + 1) * W + j];
        if (!ids.every((v) => Number.isFinite(X[3 * v] + X[3 * v + 1] + X[3 * v + 2]))) continue;
        const g = G[r * N + j], t = Math.max(-1, Math.min(1, side * g / ringRef));
        c.copy(MID).lerp(t >= 0 ? POS : NEG, Math.abs(t));
        const fade = Math.max(0, 1 - (tNow - age[r]) / life), a = (0.05 + 0.25 * Math.abs(t)) * (0.2 + 0.8 * fade);
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          for (let v = 0; v < 3; v++) { const o = 3 * ids[tri[v]]; toScene(X[o], X[o + 1], side * X[o + 2], sp, 9 * qt + 3 * v); const co = 12 * qt + 4 * v; sc[co] = c.r; sc[co + 1] = c.g; sc[co + 2] = c.b; sc[co + 3] = a; }
          qt++;
        }
      }
    }
    const old = this.wakeLines.geometry, lg = new LineSegmentsGeometry();
    if (q > 0) { lg.setPositions(pos.subarray(0, q * 6)); lg.setColors(col.subarray(0, q * 6)); }
    this.wakeLines.geometry = lg; old.dispose();
    const sg = this.wakeSheet.geometry;
    sg.setAttribute('position', new THREE.BufferAttribute(sp.subarray(0, qt * 9), 3));
    sg.setAttribute('color', new THREE.BufferAttribute(sc.subarray(0, qt * 12), 4));
  }

  updateSmoke(frame, toScene) {
    const sm = frame.smoke;
    this.smoke.visible = !!sm;
    if (!sm) return;
    const n = sm.age.length, P = new Float32Array(3 * n), C = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      toScene(sm.X[3 * i], sm.X[3 * i + 1], sm.X[3 * i + 2], P, 3 * i);
      const a = Math.max(0, 1 - sm.age[i] / sm.life) * 0.55;
      C[3 * i] = 0.92 * a; C[3 * i + 1] = 0.95 * a; C[3 * i + 2] = a;
    }
    const g = this.smoke.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.lineMat) this.lineMat.resolution.set(w, h);
  }
  render() { this.controls.update(); this.renderer.render(this.scene, this.camera); }
  view(name) {
    const v = { side: [0.1, 0.05, 3.2], front: [2.6, 0.6, 1.6], top: [-0.2, 3.2, 0.05], rear: [-3, 0.9, 1.2] }[name];
    if (!v) return;
    this.camera.position.set(...v); this.controls.target.set(-0.25, 0, 0); this.controls.update();
  }
}
