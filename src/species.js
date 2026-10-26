// Species presets: planform, masses, body layout and default kinematics.
// Units: metres, kilograms, seconds; angles in `kin` are degrees. Sources are keyed as in
// research/kinematics_morphology.md, where every number carries its provenance:
//   [FWUAV]  fdcl-gwu/FWUAV repository (monarch VICON Fourier fits, segment masses, outline)
//   [POH22]  Pohly et al. 2022 (VICON monarch: wing 5.2 cm, 15.2 cm², f 10.2 Hz, β 25.4°)
//   [BOD20]  Bode-Oke & Dong 2020, J R Soc Interface 17:20200268 (monarch)
//   [ZHE13]  Zheng, Hedrick & Mittal 2013, PLoS ONE 8:e53060 (painted lady)
//   [YOK13]  Yokoyama, Senda, Iima & Hirai 2013, Phys Fluids 25:021902 (Parantica sita)
//   [SUZ22]  Suzuki et al. 2022 (Pieris rapae take-off morphology); [KLE24] free-flight speeds
//   [LER21], [LER22]  Le Roy et al. (Morpho); [JOH21] Johansson & Henningsson 2021 (Argynnis)
// "assumed" marks values chosen here, the first things to revisit.

import { TRIMS } from './trims.js';
import { fourierDefaults } from './kinematics.js';

// The one published butterfly outline with fore- and hindwing combined, as the overlapped pair
// flies: [FWUAV] morp_MONARCH.m, 15 stations [z, x_LE, x_TE] normalised by the wing length, x forward
// of the span axis. Other species use it rescaled affinely to their own length and area (assumed
// shape; their aspect ratio and area are measured).
const FWUAV_OUTLINE = [
  [0.0000, 0.00539, -0.02280], [0.0734, 0.03818, -0.07594], [0.1467, 0.06515, -0.15224], [0.2201, 0.08737, -0.23598],
  [0.2935, 0.10812, -0.32118], [0.3668, 0.12542, -0.40443], [0.4402, 0.14463, -0.45586], [0.5135, 0.15906, -0.41697],
  [0.5869, 0.16962, -0.34664], [0.6603, 0.17586, -0.26431], [0.7336, 0.17731, -0.13247], [0.8070, 0.17780, -0.07491],
  [0.8804, 0.17924, -0.02999], [0.9537, 0.15762, 0.03531], [1.0000, 0.12494, 0.07053],
];
const OUTLINE_AREA = 0.34113; // in (wing length)², trapezoid over the stations
export function scaledOutline(L, S) {
  const k = S / (OUTLINE_AREA * L * L);
  return FWUAV_OUTLINE.map(([z, a, b]) => [z, a * k, b * k]);
}
// Fore/hindwing split of a combined outline, for painting only: the forewing's inner margin runs
// from the root to the tornus (where it meets the trailing edge at zTornus); the hindwing tucks
// `overlap` under it.
export function splitOutline(outline, zTornus = 0.73, rootX = -0.03, overlap = 0.07) {
  const te = (z) => interp(outline, z, 2);
  const div = (z) => rootX + (te(zTornus) - rootX) * Math.min(1, z / zTornus);
  const fore = outline.map(([z, le, t]) => [z, le, z >= zTornus ? t : Math.max(t, div(z))]);
  const hind = outline.filter(([z]) => z <= zTornus + 1e-9).map(([z, le, t]) => [z, Math.min(le, div(z) + overlap), t]);
  return { fore, hind };
}
function interp(st, z, col) {
  if (z <= st[0][0]) return st[0][col];
  for (let k = 0; k < st.length - 1; k++) if (z <= st[k + 1][0]) { const t = (z - st[k][0]) / (st[k + 1][0] - st[k][0]); return st[k][col] + t * (st[k + 1][col] - st[k][col]); }
  return st[st.length - 1][col];
}
const outlined = (L, S) => { const outline = scaledOutline(L, S); return { outline, ...splitOutline(outline) }; };
// Fore- and hindwing given separately (units of R), x scaled by k; the combined outline is their union.
function fromPair(fore, hind, k) {
  const f = fore.map(([z, a, b]) => [z, a * k, b * k]), h = hind.map(([z, a, b]) => [z, a * k, b * k]);
  const at = (st, z, c) => interp(st, z, c), zf = f[f.length - 1][0], zh = h[h.length - 1][0];
  const outline = [];
  for (let i = 0; i <= 30; i++) {
    const z = Math.min(i / 30, 0.99999);
    let le = at(f, z, 1), te = at(f, z, 2);
    if (z <= zh) { le = Math.max(le, at(h, z, 1)); te = Math.min(te, at(h, z, 2)); }
    if (z <= zf) outline.push([+z.toFixed(4), le, te]);
  }
  return { outline, fore: f, hind: h };
}
// Pieris rapae fore- and hindwing in units of R: a hand-drawn outline (assumed shape), scaled to the measured area
const PIERIS_FORE = [[0, 0.04, -0.1], [0.1, 0.07, -0.2], [0.2, 0.09, -0.29], [0.3, 0.1, -0.36], [0.4, 0.11, -0.42], [0.5, 0.11, -0.47], [0.6, 0.11, -0.5], [0.7, 0.1, -0.46], [0.8, 0.08, -0.38], [0.9, 0.05, -0.25], [1.0, 0.0, -0.02]];
const PIERIS_HIND = [[0, -0.02, -0.18], [0.1, -0.08, -0.56], [0.2, -0.14, -0.77], [0.3, -0.2, -0.89], [0.4, -0.26, -0.95], [0.5, -0.32, -0.95], [0.6, -0.4, -0.89], [0.7, -0.48, -0.78], [0.8, -0.57, -0.65], [0.85, -0.62, -0.62]];

// [FWUAV] matlab/modules/wing_kinematics.m, body_attitude.m, abdomen_attitude.m: one monarch in
// VICON climbing flight; degrees. Their flap φ and abdomen θ_A are + ventral, ours + dorsal.
export const MONARCH_FWUAV = {
  name: 'FWUAV VICON monarch (climbing flight, f = 10.2 Hz)',
  convention: { phi: -1, theta: 1, psi: 1, thetaB: 1, thetaA: -1 },
  series: {
    phi: { A0: -0.83724, AN: [59.7558745992612, -0.137466978762473, 0.137978226025185, 0.433746159939459, -0.074830919096204], BN: [-6.55441083419535, 6.435543953825, -2.05072909120033, 0.221239708063663, 0.0575790280561444] },
    theta: { A0: -5.9583, AN: [24.0863053541935, -4.46860932682531, 8.04218451917262, -0.601926108817941, -0.642171907559121], BN: [30.5848624271628, 4.64142325712464, -3.83504323967398, 2.01570854870463, -1.70930433046515] },
    psi: { A0: -1.9753, AN: [-2.063160749463], BN: [-2.60158935092774], harm: 2 },
    thetaB: { A0: 18.6094, AN: [1.1952126587572], BN: [8.21314837914776] },
    thetaA: { A0: 17.3417, AN: [-13.2134053462198], BN: [-3.91351009294982] },
  },
};

export const SPECIES = {
  monarch: {
    name: 'Monarch', latin: 'Danaus plexippus',
    note: 'Measured wingbeat of one monarch climbing at 1.4 m/s (VICON, Fourier fits). Its wings never clap: they stay 49° apart at the top.',
    R: 0.052, ...outlined(0.052, 15.2e-4),        // [POH22] size, [FWUAV] shape
    pivotX: 0, rootFade: 0.1,                     // feathering about the span axis through the root [FWUAV]
    wingMass: 0.025e-3,                           // one side, fore + hind [FWUAV] 25.1 mg
    hinge: [0, 0, 0.00284],                       // at the thorax centre station, ±w_B/2 [FWUAV]
    body: {
      thorax: { mass: 0.20e-3, com: [0, 0, 0], length: 0.01463, diameter: 0.00568, inertia: 'cylinder' },
      abdomen: { mass: 0.25e-3, joint: [-0.00732, 0, 0], length: 0.01738, diameter: 0.00371, rest: 0, points: 8, profile: 'uniform' },
      head: { length: 0.0035, diameter: 0.0042 },
    },
    U: 1.42, climb: 23,                           // [POH22] initial velocity (1.3, 0.56) m/s
    kin: {
      f: 10.2, fourier: MONARCH_FWUAV, ...fourierDefaults(MONARCH_FWUAV),
      strokePlane: -25.4,                          // [FWUAV] β = 25.4° (normal tilted dorsally)
      twistMean: 5, twistAmp: 15, twistPhase: 180, // tip minus root: −10° DS, +20° US, after [BOD20] F1 (assumed shape)
      // camber 12 % in the downstroke, 6 % in the upstroke: assumed, inside the range measured on painted-lady
      // wings [ZHE13]; with it the measured wingbeat nearly balances (lift 0.96 W, thrust −0.05 W,
      // pitch moment ≈ 0) at the measured climb, against lift 0.51 W for a flat wing
      camberMean: 0.09, camberAmp: 0.03, camberPhase: 0,
    },
    pattern: 'monarch', colors: { base: '#e8781e', vein: '#14100c', spot: '#f6f1e6' },
  },

  vanessa: {
    name: 'Painted lady', latin: 'Vanessa cardui',
    note: 'The free flight Zheng, Hedrick & Mittal (2013) rebuilt for CFD: 22 Hz, 1.14 m/s, strong twist and camber. Kinematics are fitted by eye to their figures.',
    R: 0.030, ...outlined(0.030, 5.7e-4),
    pivotX: 0, rootFade: 0.15,
    wingMass: 0.012e-3,                           // assumed (~8 % of body mass for both sides)
    hinge: [0, 0, 0.0018],
    body: {
      thorax: { mass: 0.10e-3, com: [0, 0, 0], length: 0.0080, diameter: 0.0042, inertia: 'cylinder' },   // assumed split
      abdomen: { mass: 0.166e-3, joint: [-0.0040, 0, 0], length: 0.0120, diameter: 0.0030, rest: -0.3, points: 8, profile: 'uniform' },
      head: { length: 0.0025, diameter: 0.0030 },
    },
    U: 1.14, climb: 0,                            // [ZHE13]
    kin: {
      f: 22.2, downRatio: 0.57, strokePlane: -5,  // [ZHE13] f, DS share; stroke plane 78.5° from horizontal at 6.1° pitch
      phiMean: 10, phiAmp: 120, phiK: 0.2,        // Φ = 120° [ZHE13]; mean assumed
      alphaMean: 20, alphaAmp: 22, alphaC: 1.0, alphaPhase: 240,   // mean incidence ≈ −5° → 46° over the beat [ZHE13 Fig. 3C]
      twistMean: 0, twistAmp: 30, twistPhase: 180, // tip minus root ≈ −30° mid-DS, +31° mid-US [ZHE13 Fig. 3B]
      camberMean: 0.055, camberAmp: 0.09, camberPhase: 0,           // up to 15 % (DS), −3.5 % (US) [ZHE13]
      chiMean: 6.1, chiAmp: 0, abdAmp: 0,         // body pitch held at 6.1° in their CFD
    },
    pattern: 'vanessa', colors: { base: '#e2803a', vein: '#1b120c', spot: '#f4efe4' },
  },

  parantica: {
    name: 'Chestnut tiger', latin: 'Parantica sita',
    note: 'The Kyoto group\'s free-flying individual (Yokoyama et al. 2013): 8.9 Hz in a 1.6 m/s tunnel. Their panel model found its periodic flight unstable, ×8.6 per beat.',
    R: 0.0503, ...outlined(0.0503, 12.4e-4),
    pivotX: 0, rootFade: 0.1,
    wingMass: 0.021e-3,                           // [YOK13] individual B
    hinge: [0, 0, 0.00275],
    body: {
      thorax: { mass: 0.0828e-3, com: [0, 0, 0], length: 0.0105, diameter: 0.0055, inertia: 'cylinder' },
      abdomen: { mass: 0.211e-3, joint: [-0.00525, 0, 0], length: 0.0210, diameter: 0.00455, rest: -0.2, points: 8, profile: 'uniform' },
      head: { length: 0.003, diameter: 0.0038 },
    },
    U: 1.6, climb: 0,                             // [YOK13] wind-tunnel inflow
    kin: {
      f: 8.9, downRatio: 0.5, strokePlane: 0,     // T = 0.112 s; β assumed perpendicular to the body
      phiMean: 15, phiAmp: 92, phiK: 0.2,         // Φ 92° ([BOD20] Table 6 from [YOK13]); dorsal bias as in the tethered record
      alphaMean: 0, alphaAmp: 9, alphaC: 1.0, alphaPhase: 180,  // ±0.15 rad (tethered record)
      psiMean: -5.2, psiAmp: 11, psiHarm: 2, psiPhase: 0,       // η ≈ ±0.2 rad at 2f, mean −0.091 rad
      chiMean: 29, chiAmp: 11.5, chiPhase: 180,   // 18–41°, lowest mid-DS, highest mid-US
      abdMean: 0, abdAmp: 12, abdPhase: 90,       // tip up during the DS (antiphase with β), amplitude assumed
      camberMean: 0.09, camberAmp: 0.03, camberPhase: 0, // the monarch's assumed camber (no data)
    },
    pattern: 'tiger', colors: { base: '#c9dde0', vein: '#3a2a20', spot: '#8a4a2a' },
  },

  pieris: {
    name: 'Small white', latin: 'Pieris rapae',
    note: 'Morphology of one take-off individual (Suzuki et al. 2022) at the free-flight speed of spring-form whites (1.2 m/s). The forward-flight wing angles are not published, so the wingbeat is assumed.',
    R: 0.021, ...fromPair(PIERIS_FORE, PIERIS_HIND, 1.211),   // Flutter-lens planform, chord scaled to 4.1 cm² [SUZ22]
    pivotX: 0, rootFade: 0.15,
    wingMass: 0.00405e-3,                         // [SUZ22] 0.81e-5 kg for four wings
    hinge: [0, 0, 0.0015],
    body: {
      thorax: { mass: 0.0204e-3, com: [0, 0, 0], length: 0.0042, diameter: 0.0030, inertia: 'cylinder' },
      abdomen: { mass: 0.0297e-3, joint: [-0.0021, 0, 0], length: 0.0110, diameter: 0.0030, rest: -0.2, points: 8, profile: 'uniform' },
      head: { length: 0.002, diameter: 0.0026 },
    },
    U: 1.2, climb: 0,                             // [KLE24] spring form (summer form 1.7 m/s)
    kin: {
      f: 11.8, downRatio: 0.55, strokePlane: -10, // f: Jantzen & Eisner 2008; the rest assumed
      phiMean: 10, phiAmp: 103, phiK: 0.3,        // Φ: the 37-species mean (Dudley 1990)
      alphaMean: -2, alphaAmp: 25, alphaC: 1.5, alphaPhase: 180,
      twistMean: 5, twistAmp: 12, twistPhase: 180,
      chiMean: 25, chiAmp: 10, chiPhase: 180,
      abdAmp: 10, abdPhase: 90,
      camberMean: 0.09, camberAmp: 0.03, camberPhase: 0, // the monarch's assumed camber (no data)
    },
    pattern: 'pieris', colors: { base: '#f3f1e8', vein: '#8f8a80', spot: '#1e1c1a' },
  },

  morpho: {
    name: 'Canopy morpho', latin: 'Morpho cisseis',
    note: 'A canopy Morpho: huge wings, about 4 beats a second, half its time gliding (Le Roy et al. 2021, 2022). Masses and wing angles are assumed.',
    R: 0.085, ...outlined(0.085, 41e-4),
    pivotX: 0, rootFade: 0.12,
    wingMass: 0.040e-3,                           // assumed
    hinge: [0, 0, 0.0035],
    body: {
      thorax: { mass: 0.20e-3, com: [0, 0, 0], length: 0.0150, diameter: 0.0070, inertia: 'cylinder' },   // assumed (≈ 0.46 g total)
      abdomen: { mass: 0.18e-3, joint: [-0.0075, 0, 0], length: 0.0230, diameter: 0.0045, rest: -0.2, points: 8, profile: 'uniform' },
      head: { length: 0.004, diameter: 0.0048 },
    },
    U: 1.6, climb: 0,                             // CFD freestream 1.59 m/s [LER21]
    kin: {
      f: 3.8, downRatio: 0.5, strokePlane: 0,     // one wingbeat in 0.26 s [LER22]
      phiMean: 15, phiAmp: 114, phiK: 0.3,        // canopy A_φ 114° [LER22]
      alphaMean: 0, alphaAmp: 20, alphaC: 1.2, alphaPhase: 180,
      twistMean: 5, twistAmp: 12, twistPhase: 180,
      chiMean: 18, chiAmp: 12, chiPhase: 180,     // assumed for level flight (67° when climbing [LER22])
      abdAmp: 8, abdPhase: 90,
      camberMean: 0.09, camberAmp: 0.03, camberPhase: 0, // the monarch's assumed camber (no data)
    },
    pattern: 'morpho', colors: { base: '#2a7fe0', vein: '#0d0f14', spot: '#d9e6f2' },
  },

  argynnis: {
    name: 'Silver-washed fritillary', latin: 'Argynnis paphia',
    note: 'Set up to clap: the wings meet at the top of every upstroke, as Johansson & Henningsson (2021) filmed in this species. Morphology is measured; the wingbeat is the measured monarch waveform raised by 22° so the wings meet (assumed).',
    R: 0.0323, ...outlined(0.0323, 7.1e-4),
    pivotX: 0, rootFade: 0.12,
    wingMass: 0.008e-3,                           // assumed
    hinge: [0, 0, 0.0020],
    body: {
      thorax: { mass: 0.075e-3, com: [0, 0, 0], length: 0.0080, diameter: 0.0045, inertia: 'cylinder' },  // assumed split of 203 mg
      abdomen: { mass: 0.112e-3, joint: [-0.0040, 0, 0], length: 0.0140, diameter: 0.0033, rest: 0, points: 8, profile: 'uniform' },
      head: { length: 0.0025, diameter: 0.0032 },
    },
    U: 1.6, climb: 0,                             // below the ≈ 2 m/s tunnel speed of [JOH21] (assumed)
    kin: {
      f: 15, fourier: MONARCH_FWUAV, ...fourierDefaults(MONARCH_FWUAV),   // f assumed: the monarch's 10.2 Hz scaled by wing length
      dorsalTop: 87,                              // the top of the stroke stays at 87°: the wings meet (the monarch's stop at 65°)
      strokePlane: -25.4, twistMean: 5, twistAmp: 15, twistPhase: 180,
      camberMean: 0.09, camberAmp: 0.03, camberPhase: 0, // the monarch's assumed camber (no data)
    },
    pattern: 'fritillary', colors: { base: '#de8a2c', vein: '#1c130c', spot: '#2a1a10' },
  },
};

for (const [k, v] of Object.entries(TRIMS)) if (SPECIES[k]) SPECIES[k].trims = v;

export function getSpecies(name) {
  if (typeof name === 'object') return name;
  const s = SPECIES[name];
  if (!s) throw new Error('unknown species ' + name);
  return s;
}
