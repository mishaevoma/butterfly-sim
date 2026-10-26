# The model in detail

## Geometry (`src/wing.js`)

- **One surface per side:** the overlapped fore- and hindwing are meshed as one lifting surface of M × N vortex rings. Butterflies fly with the two wings overlapped, so the surface is their union. The monarch uses the measured combined outline from FWUAV.
- **Wing motion:** a chain of rotations about the hinge: stroke-plane tilt, flap, sweep (deviation) and feathering. Prescribed linear twist, chordwise camber and spanwise bend sit on top.
- **Root:** feathering fades in over the inner part of the span, so a long hindwing root stays along the abdomen.
- **Contact:** a smooth (softplus) floor keeps the two wings from passing through each other at the clap.

## Kinematics (`src/kinematics.js`)

There are two ways to specify a wingbeat:
- **Measured (Fourier):** the FWUAV fits for the monarch's flap, feathering, deviation, thorax pitch and abdomen, re-phased so that phase 0 is the dorsal reversal. Their angle conventions map exactly onto ours: flap and abdomen change sign, and the stroke plane becomes −25.4°.
- **Parametric:** Berman & Wang waveforms, from cosine to triangular flapping and from sine to square-wave feathering. A smooth, monotone phase warp sets the downstroke share.

Either way the trim and control knobs (amplitude, mean flap, stroke plane, sweep, feathering) rescale the waveforms about their means.

## Air: unsteady vortex lattice (`src/uvlm.js`)

This follows Katz & Plotkin's ring formulation:
- **Lattice:** ring leading segments sit at the panel quarter-chord, control points at three-quarters. The influence matrix is rebuilt and LU-solved every step, because the wings move relative to each other.
- **Wake:** the trailing edge sheds one row of wake rings per step (Kutta condition). Wake nodes are convected by the full induced velocity with second-order Adams–Bashforth, so the wake rolls up on its own.
- **Loads:**
  - Kutta–Joukowski ρΓ(V×l) on every bound segment, plus ρ(∂Γ/∂t)A·n with second-order backward differences (Simpson, Palacios & Murua 2013).
  - Leading-edge-vortex lift by the Polhamus suction analogy: each strip's leading-edge suction is turned onto the strip normal.
  - Skin friction as a per-panel C_D0.
- **Symmetry:** symmetric flight solves one wing and its mirror image. Switching interaction off drops the image's influence, which is how the other wing's contribution is measured.
- **Vortex cores:** bound segments use 1 % of the mean chord. A wake filament is born with the same core, so it cancels the trailing-edge segment it sits on exactly, and then grows by Squire's law. Wake roll-up uses at least 20 % of the mean chord.
- **Roll-up window:** by default the wake rolls up for one beat and is then frozen; loads change by under 0.1 %.
- **Step size:** UVLM is accurate when wake panels are about as long as chordwise panels (U·dt ≈ c/M). With much shorter steps, coarse lattices over-predict added-mass loads.

## Air: quasi-steady blade elements (`src/qs.js`)

The same deformed lattice, treated as 2-D plates:
- **Normal force:** Polhamus C_N = Kp sin α |cos α| + Kv sin α |sin α|, with no suction.
- **Rotational force:** the Sane & Dickinson term.
- **Added mass:** from the normal acceleration at mid-chord.

It has no wake, no wing–wing interaction and no camber, and costs about 0.1 ms per step.

## Body (`src/dynamics.js`)

Newton–Euler about the point between the wing hinges:
- **Parts:** a rigid thorax (a cylinder), plus point masses for the abdomen (hinged at the petiole) and for every wing panel. Wing and abdomen motion is prescribed, and its rates come from central differences, so twist and bend carry their own inertia.
- **Integration:** RK4 with eight substeps per aerodynamic step.
- **Modes:**
  - **Tethered:** forward speed, climb angle and body pitch are prescribed, like a wind-tunnel run with the measured body motion.
  - **Driven:** the body translates freely while its pitch follows the prescribed (measured) history, as in Fei & Yang's simulations.
  - **Free:** 6-DOF, or 3-DOF in the plane for symmetric flight.

## Trim and control (`src/trim.js`, `src/control.js`)

- **Trim:** Newton–Broyden on stroke amplitude, stroke-plane tilt and mean sweep, until a tethered run has lift = weight, thrust = drag and no mean pitching moment about the centre of mass.
- **Outer loops:** wingbeat-averaged (a one-beat moving average cancels the flapping ripple). Climb rate drives amplitude, with the altitude reference rising at the commanded climb; speed drives stroke-plane tilt.
- **Inner loop (fully free only):** tracks the prescribed, phase-locked pitch history with mean sweep. Its authority is small next to the within-beat moments, so it extends fully free flight from under one beat to a few beats but does not hold it.

## Species (`src/species.js`)

| Preset | Morphology | Wingbeat | Notes |
|---|---|---|---|
| Monarch, *Danaus plexippus* | 0.50 g; segment masses, cylinders, wing mass and outline from FWUAV; size 52 mm and 15.2 cm² per side (Pohly et al. 2022) | measured Fourier fits, 10.2 Hz (FWUAV) | camber assumed; tethered at the measured 1.42 m/s, 23° climb |
| Painted lady, *Vanessa cardui* | 0.29 g, R 30 mm, 11.4 cm² (Zheng et al. 2013) | 22.2 Hz, Φ 120°, twist ±30°, camber up to 15 % (fitted by eye to Zheng et al.) | segment split assumed |
| Chestnut tiger, *Parantica sita* | 0.336 g, all segment masses (Yokoyama et al. 2013) | 8.9 Hz, 1.6 m/s; angles from the Kyoto records, partly assumed | outline: the monarch's, rescaled |
| Small white, *Pieris rapae* | 58 mg, segment masses, R 21 mm, 4.1 cm² (Suzuki et al. 2022) | 11.8 Hz (Jantzen & Eisner 2008); angles assumed | hand-drawn planform; 1.2 m/s (Kleckova et al. 2024) |
| Canopy morpho, *Morpho cisseis* | R 85 mm, mean chord 48 mm (Le Roy et al. 2021); masses assumed | 3.8 Hz, Φ 114° (Le Roy et al. 2022); angles assumed | trims in lift and thrust; out of sweep for pitch |
| Silver-washed fritillary, *Argynnis paphia* | 0.203 g, 68.7 mm span, 14.2 cm² (Johansson & Henningsson 2021) | the monarch's waveform at 15 Hz with the top of the stroke pinned at 87°, so the wings clap | frequency assumed |

Every number's source, and how it was obtained, is in `research/kinematics_morphology.md`. The validation targets and the open-source codes reviewed are in `research/validation_and_code.md`. `node tools/trim_species.mjs` regenerates the stored trims in `src/trims.js`.

## Benchmarks (`tests/`)

| Check | Reference | Result |
|---|---|---|
| Steady elliptic wing, AR 8 | Jones-corrected lifting line, CLα = 4.89 /rad | within 1.5 % at 6 × 12 panels |
| Induced drag, same wing | span efficiency e = 1 | e = 1.03–1.06, falling with refinement |
| Image solve vs two-sided solve | identical by symmetry | equal to 1e-9 |
| Impulsive start, AR 40 | Wagner function at s = 4, 8, 16 | within 3 % (2 % at s ≥ 8) |
| Plunging wing, k = 0.25, 0.5, 1 | Theodorsen (Jones's fit of C(k)) | amplitude within 5 %, phase within 1° |
| Free vs rigid wake, AR 4 at 8° | the same steady lift | within 0.1 % |
| Flapping in vacuum | linear and angular momentum conserved | to 1e-4 of their scale over 2.5 beats |
| Free fall; pitch-driven fall in vacuum | g, for the body and for the centre of mass | exact; to 2 µm |

## What it sees, approximates and misses

- **Sees:**
  - the wake and its roll-up;
  - the two wings acting on each other through the whole stroke, including the clap and fling;
  - unsteady circulation and added mass;
  - body pitching, bobbing and abdomen motion, fed back into the air;
  - how a free body answers gusts.
- **Approximates:**
  - leading-edge vortex lift, by the suction analogy, so the vortex itself is not resolved;
  - skin friction, as a constant coefficient;
  - flexibility, as prescribed twist, camber and bend rather than an elastic structure;
  - the fore/hindwing pair, as one surface.
- **Misses:**
  - where separation happens on the wing;
  - viscous decay of the wake beyond a core-growth law;
  - the gap flow between overlapping fore- and hindwings;
  - the within-beat steering that keeps a real butterfly's pitch in check;
  - anything at the scale of scales and veins.

## The film (`film/`, `tools/film_record.mjs`, `tools/render_film.mjs`)

- **Recording:** one vortex-lattice step per film frame (6 × 12 panels, 60 steps per beat, a 3-beat free wake), after a 4-beat warm-up so the wake and smoke are already developed at frame 0.
  - Smoke-wire streaklines are tracer particles released from a rake ahead of the animal into still air and carried by the induced velocity.
  - Each frame stores the wing angles, body pose, wake lattice and every smoke particle.
  - The camera centre is the body path averaged over one beat.
- **Playback:** `film/index.html` reuses the viewer's three.js scene. It adds Chaikin-smoothed streaklines (drawn on the far wing only, so the body stays clear), bloom, camera keyframes and three captions.
- **Rendering:** `tools/render_film.mjs` drives system Chrome on the GPU through puppeteer-core, one deterministic frame at a time, and pipes the frames to ffmpeg.

## References

- Katz J, Plotkin A (2001) *Low-Speed Aerodynamics*, 2nd ed., Cambridge UP, ch. 12–13.
- Simpson RJS, Palacios R, Murua J (2013) Induced-drag calculations in the unsteady vortex lattice method. *AIAA J* 51(7).
- Polhamus EC (1966) A concept of the vortex lift of sharp-edge delta wings based on a leading-edge-suction analogy. NASA TN D-3767.
- Sane SP, Dickinson MH (2002) The aerodynamic effects of wing rotation and a revised quasi-steady model of flapping flight. *J Exp Biol* 205:1087–1096.
- Berman GJ, Wang ZJ (2007) Energy-minimizing kinematics in hovering insect flight. *J Fluid Mech* 582:153–168.
- Theodorsen T (1935) NACA Rep. 496; Wagner H (1925) *ZAMM* 5:17–35.
- FWUAV, fdcl-gwu (GitHub): monarch motion-capture Fourier fits, morphology and outline; Pohly et al. 2022 for that monarch's wing size.
- Bode-Oke AT, Dong H (2020) The reverse flight of a monarch butterfly. *J R Soc Interface* 17:20200268.
- Zheng L, Hedrick TL, Mittal R (2013) Time-varying wing-twist improves aerodynamic efficiency of forward flight in butterflies. *PLoS ONE* 8:e53060.
- Yokoyama N, Senda K, Iima M, Hirai N (2013) Aerodynamic forces and vortical structures in flapping butterfly's forward flight. *Phys Fluids* 25:021902.
- Johansson LC, Henningsson P (2021) Butterflies fly using efficient propulsive clap mechanism owing to flexible wings. *J R Soc Interface* 18:20200854.
- Srygley RB, Thomas ALR (2002) Unconventional lift-generating mechanisms in free-flying butterflies. *Nature* 420:660–664.
- Fei Y-HJ, Yang J-T (2016) Importance of body rotation during the flight of a butterfly. *Phys Rev E* 93:033124.
