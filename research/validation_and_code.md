# Butterfly flight UVLM: validation targets and open-source code

Compiled 2026-10-25 for the JavaScript butterfly simulator in this repository.

The solver this file serves:
- UVLM with a free wake;
- Kutta–Joukowski (KJ) on bound segments plus ρ·dΓ/dt·A·n per panel (Simpson, Palacios & Murua 2013);
- Polhamus-style leading-edge-vortex (LEV) suction;
- both wings modelled, so the dorsal clap arises from wing–wing induction;
- coupled to free-flight multibody dynamics.

Morphology and kinematics inputs belong to another agent. They appear here only as the conditions attached to a number.

## How to read this file

Every number carries a provenance tag.

| Tag | Meaning |
|---|---|
| [FT] | Read in the full text (journal version, accepted manuscript, preprint or repository copy) |
| [AB] | Abstract only |
| [FIG] | Read approximately off a figure |
| [DER] | Derived by us, arithmetic shown |
| [SRC] | Read in source code |
| [DOC] | Read in a README or documentation page |
| [SEC] | Quoted by a secondary source |
| [SNIP] | Seen only in a search-engine summary. Low confidence |

Four agents read sources in parallel. "Re-checked" means the lead agent went back to the source after a sub-agent's first read. The lead agent re-checked:
- Zheng et al. 2013, Table 2 and the peaks;
- Bode-Oke & Dong 2020, Tables 3–5;
- the Suzuki et al. 2015 free-flight numbers;
- the Huang & Sun 2012 power;
- the Simpson et al. 2013 conclusion;
- the Nabawy & Crowther 2017 errors;
- the Dickinson 1999 fits;
- the PteraSoftware and SHARPy constants.

The lead agent read the whole Kyoto-group block (§A1) from full texts.

Conventions:
- J = flight speed ÷ mean wing-tip speed.
- k = π f c̄ / U∞, unless a paper defines it differently (noted where it does).
- BW = body weight; DS = downstroke; US = upstroke.
- t′ (or t*) = t/T measured from the start of the downstroke, unless noted.
- Where ρ is not stated, ρ = 1.225 kg/m³ is used.

---

## 0. Shortlist: the best targets for a monarch or painted-lady run

**1. Painted lady (*Vanessa cardui*), Zheng, Hedrick & Mittal 2013.** PLoS ONE 8:e53060, doi:10.1371/journal.pone.0053060 [FT, re-checked].
- Why it ranks first: it is the only butterfly CFD whose lift time history was checked against the free-flying animal.
- Conditions:
  - one individual, 0.29 g, R = 3.0 cm, c̄ = 1.9 cm;
  - f = 22.2 Hz, Φ = 120°, stroke plane 78.5°;
  - U∞ = 1.14 m/s, body pitch fixed at 6.1°;
  - Re = 2ΦfRc̄/ν = 3455;
  - J = 1.14/2.79 = 0.41 [DER]; k = π·22.2·0.019/1.14 = 1.16 [DER].
- Targets for the real (deforming) wing, labelled OBW in the paper:
  - mean lift 2.93 mN, which is 1.03 BW [DER];
  - |mean lift + thrust| = 3.15 mN, so mean thrust ≈ √(3.15² − 2.93²) = 1.16 mN and L/T ≈ 2.5 [DER];
  - peak DS lift 11.7 mN, against 11.5–18.0 mN for the animal;
  - RMS lift 6.7 mN, against 6.2–10.2 mN for the animal;
  - Pearson correlation of the lift histories r = 0.94;
  - power 10.5 mW, which is 36 W/kg of body mass [DER];
  - lift/power 0.279 N/W.
- For a rigid flat-plate UVLM, compare against the flat-plate wings instead (FPW1–3):
  - mean lift 1.42–2.07 mN;
  - power 9.81–13.7 mW;
  - lift/power 0.144–0.151 N/W.
- Twist alone (TOW) recovers 2.85 mN.

**2. Monarch forward flight, Bode-Oke & Dong 2020.** J R Soc Interface 17:20200268, doi:10.1098/rsif.2020.0268, PMC7328400 [FT, re-checked].
- Cases:
  - F1: f = 9.92 Hz, Φ = 103°, U = 1.75 m/s, J = 0.90, mean body angle 28° (24° in the DS, 32° in the US).
  - F2: Φ = 124°, U = 0.91 m/s, J = 0.42, mean body angle 50° (40° DS, 61° US).
- Half-stroke mean force, in body weights (BW):
  - F1: DS 2.42, US 1.05. Vertical: DS 2.27, US −0.31.
  - F2: DS 2.35, US 1.17. Vertical: DS 2.14, US 0.45.
- Aerodynamic power:
  - 65.0 W/kg (F1) and 86.9 W/kg (F2) of muscle mass;
  - that is 19.5 and 26.1 W/kg of body mass [DER, muscle taken as 30% of body mass].
- In forward flight the US gives 32% of net force but only 8% of weight support.

**3. Clap: Johansson & Henningsson 2021.** *Argynnis paphia* take-off. J R Soc Interface 18:20200854, doi:10.1098/rsif.2020.0854, PMC7879755 [FT].
- DS vertical impulse ÷ US thrust impulse = 9.4: the US thrust impulse is about 11% of the DS vertical impulse.
- The US plus clap gave net thrust in 24 of 24 sequences.
- Mechanical clapper, flexible versus rigid wings: +22% useful impulse and −28% wake kinetic energy per unit impulse.

**4. Kyoto group, *Parantica sita*.** A danaine; Senda et al. call it "similar to Danaus". Details are in §A1.
- Yokoyama et al. 2013, tethered experiment (u0 = 1.0 m/s, thorax at 20°, T = 0.12 s):
  - force-sensor time histories, with sensor uncertainty ±1 mN.
- Prescribed free flight (u0 = 1.6 m/s, Re 4300, J ≈ 1.23 [DER]):
  - mean lift ≈ mg = 3.3 mN;
  - nose-down aerodynamic pitching moment in the DS, against an abdomen-gravity torque of about 3×10⁻⁵ N·m.
- Free flight driven only by the measured joint angles pitches up and flips within about one wingbeat.
- Senda et al. 2012 used a UVLM-type panel method with a free wake:
  - measured versus computed cycle-mean lift/drag/moment, quoted for two tethered sequences in §A1;
  - Floquet multiplier of the periodic flight: 8.6 per wingbeat with the free wake, 17.0 without it.

**5. Monarch free-flight lift coefficient, Sridhar et al. 2021.** Bioinspir Biomim 16:034002, doi:10.1088/1748-3190/abe108 [AB].
- C_L = 1.7 at sea level, rising to 9.4 at the 3000 m air density.
- The rise tracks the effective angle of attack, not flapping amplitude or frequency.
- The group's follow-up defines C_L = L/(½ρV²·c·2R), with V the flight speed [FT, Kang et al. 2023]. That the 2021 paper uses the same definition is our inference.

**Codes most worth borrowing from:** PteraSoftware and SHARPy (§B.5).

---

## A. Validation targets

### A1. Kyoto group: *Parantica sita*, tethered forces, panel model and free-flight pitch

#### Yokoyama, Senda, Iima & Hirai 2013

"Aerodynamic forces and vortical structures in flapping butterfly's forward flight." Phys Fluids 25:021902, doi:10.1063/1.4790882.
- Full text read in the Kyoto University repository text bitstream: https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/939bce40-66bf-4e3c-8fd5-494a33b21891/content [FT].
- The repository's old `dspace/bitstream/...pdf` links now return an empty single-page app. Use the `/server/api/core/bitstreams/<uuid>/content` form.
- Japanese companion: Yokoyama, Senda, Iima & Hirai 2012, RIMS Kôkyûroku 1808:127–132 [FT].

*Method (Navier–Stokes CFD, not UVLM)* [FT, §II]:
- Incompressible Navier–Stokes with an immersed boundary.
- Grid: 4096 × 512 × 512 uniform; domain 0.5 × 0.25 × 0.25 m. Fourth-order differences streamwise, Fourier transverse.
- Time step Δt = T/4000 to T/8000.
- Viscosity raised to 2–3 ν_air to suppress numerical oscillation; the Appendix shows the forces barely change.
- Body: four rigid links, i.e. a spheroidal thorax, a spheroidal abdomen and two flat wings (fore- and hindwing merged).
- Joint angles come from experiment, giving 7 DOF in symmetric flight.

*Conditions* [FT, Tables I–II]:

| Case | Individual | u0 (m/s) | ν | T (s) | Thorax |
|---|---|---|---|---|---|
| Tethered experiment and simulation | A: 0.338 g, wing-tip length 54.7 mm, wing area 1.47×10⁻³ m² per wing | 1.0 | 3ν_air | 0.12 (8.3 Hz [DER]) | Fixed at 20° |
| Prescribed simulation | B: 0.336 g, 50.3 mm, 1.24×10⁻³ m² | 1.6 | ν_air | 0.112 (8.9 Hz [DER]) | From free-flight video |
| Free-flight simulation | B | 1.6 | 2ν_air | 0.112 | Solved |

Free-flight experiment, non-dimensional values [FT]:
- mean tip speed 4Cβf·y_tip = 1.3 m/s; maximum 2.0 m/s;
- Re = 4300 (mean tip speed × tip length / ν_air);
- St = mean tip speed / u0 = 0.81, so J = 1/0.81 = 1.23 [DER];
- k = 2Cβf·S_w/(u0·y_tip) = 0.20 (the paper's own definition);
- Fr = 1.9.

*Tethered comparison* [FT, §III.A, Fig. 4]:
- Upward and streamwise forces "reasonably agree" with the force-torque sensor. Agreement is "remarkable" in the early downstroke, t < T/4.
- Upward force and lift peak near T/4. The upward force is negative near 3T/4.
- Streamwise force: drag in the DS, thrust in the US. The thrust comes from the pressure difference with the leading edge up (θ > 0).
- Torque agrees less well. It is dominated by reaction torques of the abdomen and wing motion, not by the aerodynamic moment.
- Figure axes [FIG]: upward force −10 to +15 mN; streamwise force −4 to +10 mN; torque −15 to +20 ×10⁻⁵ N·m. Read the actual curves from the PDF figures.
- Sensor uncertainty: 1×10⁻³ N for forces below 2×10⁻² N, and 4×10⁻⁵ N·m for torques below 6×10⁻⁴ N·m.

*Prescribed simulation* [FT, §III.B]:
- Mean lift ≈ mg = 3.3 mN. Mean drag is positive, so extra thrust would be needed.
- Mean aerodynamic pitching moment is nose-down. Gravity on the abdomen gives a nose-up torque.
- Extra forces were needed to make the body follow the measured trajectory:
  - they are as large as the lift and drag, and about 3× the aerodynamic moment;
  - they come mostly from 3rd- and 4th-harmonic noise in the measured thorax acceleration.
- Joint power P2 is about 10⁻² W (Fig. 10 axis ±8 mW). This matches 10² W/kg of muscle × 10⁻⁴ kg of muscle.
- A glide frozen in the t = T/4 pose gives L ≈ 1×10⁻⁴ N, D ≈ 4×10⁻⁴ N and M ≈ 2×10⁻⁶ N·m. Flapping lift (3 mN) is therefore about 30× gliding lift.

*Numerical sensitivity* [FT, Appendix]:
- A larger domain lowers the maximum upward force by 4×10⁻⁴ N.
- Δt = T/5000 raises it by 8×10⁻⁴ N.
- ν = 4ν_air changes the forces "little".

*Sign inconsistency in the paper:* §III.A says the aerodynamic pitching moment is "positive during the downstroke", then explains head-down (negative) moments in the downstroke. The Conclusion and the RIMS paper both say negative in the DS and positive in the US. Use the latter.

#### Senda, Obara, Kitamura, Nishikata, Hirai, Iima & Yokoyama 2012a

"Modeling and emergence of flapping flight of butterfly based on experimental measurements." Robot Auton Syst 60:670–678, doi:10.1016/j.robot.2011.12.007.
- Preprint text: https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/1687ef50-0be4-4bc0-a787-5b02baad19e3/content [FT].

*Aerodynamic model* [FT]: a "panel method", which is in effect a UVLM without leading-edge separation:
- vortex-ring panels on flat wings;
- constant-strength ring panels shed from the trailing edge under the Kutta condition;
- a free wake convected with the local velocity (after Katz & Plotkin).

*Animal and sensor* [FT]:
- *P. sita niphonica*, 0.24 g, half-span 50 mm, glued to a force/torque sensor in a wind tunnel.
- L and D errors 0.001 N within ±0.02 N; M error 0.04×10⁻³ N·m within ±0.6×10⁻³ N·m; 50 Hz cut-off.

*Sequences* [FT]:
- One sequence: u0 = 1.64 m/s, θt = −1°, T = 0.136 s, β from +81° to −45°, passive feathering ±30°. The wings overlap perfectly at maximum β.
- Validation figure (Fig. 6): u0 = 1.54 m/s, θt = 28.1°. The model "agrees well"; the axes span ±0.02 N [FIG].

*Other observations* [FT]:
- Viscous drag is about 0.5% of peak drag.
- Smoke-wire images at 1 m/s show flow following the wing surfaces "without separation". This is the authors' justification for potential flow, and it contrasts with the LEVs seen in CFD.

*Stability (Floquet analysis on the period-sampled Jacobian)* [FT]:
- Unstable pole of the periodic flight: 8.6 with the free wake, 17.0 when the wake is replaced by steady horseshoe vortices.
- The authors read this as the wake-induced flow being stabilising.

*Passive wing torsion* [FT]:
- Measured torsional rigidity ≈ 8.0×10⁻⁴ N·m/rad; damping ratio assumed to be 0.7.
- It "extends the stable flight for four more periods".
- A sampled-data LQR acting on the Fourier joint parameters stabilises the flight.

#### Senda et al. 2012b

"Effects of structural flexibility of wings in flapping flight of butterfly." Bioinspir Biomim 7:025002, doi:10.1088/1748-3182/7/2/025002.
- Preprint text: https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/41a9195d-5384-41c1-830e-86e2e53f36b7/content [FT].

*Discretisation*, a useful baseline for a coarse UVLM [FT]:
- 10 spanwise × 4 chordwise panels per wing;
- the wake is kept for 2 wingbeats, and 2 flaps run before recording;
- a new wake row is shed every T/20;
- body motion uses modified Euler at T/1000;
- instantaneous forces change by ≤1% under refinement.

*Case §2.5* [FT]:
- u0 = 1.54 m/s, θt = 28.1°, T = 0.096 s (10.4 Hz [DER]);
- β from +60° to −20°; feathering from −10° to +20°;
- mean tip speed 1.2 m/s, maximum 1.9 m/s;
- Re = 4800, St = 0.80, Fr = 1.6.

*Cycle-mean forces and moment*, including flapping inertia (up to 20% of peak L) [FT]:

| Sequence | Source | L | D | M |
|---|---|---|---|---|
| §2.5 tethered | Experiment | 0.3 mN | 1.8 mN | 0.14 mN·m |
| §2.5 tethered | Panel method | 0.7 mN | 1.3 mN | 0.04 mN·m |
| §4.3 deformation study (another tethered sequence; speed and angle not restated next to these numbers) | Experiment | 2.4 mN | −2.5 mN | −0.056 mN·m |
| §4.3 | Panel, flat wings | 0.3 mN | −2.9 mN | −0.006 mN·m |
| §4.3 | Panel, time-varying camber | 1.1 mN | −3.5 mN | −0.013 mN·m |

What this shows: a flat-plate potential-flow UVLM can match the half-stroke force shapes and still miss the cycle-mean lift by about 2 of 2.4 mN. The mean is a small difference between large DS and US forces. Validate against half-stroke impulses and peaks, not only cycle means.

*Peel* [FT]: at the start of the DS, the overlapped wings peel apart from the leading edge with elastic deformation and stay convex upward through the DS.

#### Yokoyama et al. 2012, RIMS Kôkyûroku 1808 (Japanese)

Read in full. Text layer: https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/c5569f5f-52df-4310-9950-4d715bc799e0/content.
- Same model, u0 = 1.6 m/s, T = 0.112 s.
- In free flight the thorax pitch reaches about 1 rad after one cycle, then the butterfly turns onto its back and falls.
- Cause: the DS nose-down moment is smaller than the abdomen-gravity torque of about 3×10⁻⁵ N·m.

### A2. Other experiments on butterflies

#### Johansson & Henningsson 2021

"Butterflies fly using efficient propulsive clap mechanism owing to flexible wings." J R Soc Interface 18:20200854, doi:10.1098/rsif.2020.0854, PMC7879755 [FT].

*Animals and set-up* [FT, Methods]:
- *Argynnis paphia*, 6 wild-caught individuals.
- Take-off from a 10 mm feeder in a wind tunnel at about 2 m/s.
- Tomographic PIV: 4 cameras at 640 Hz in a transverse plane 180 mm downstream; volume about 4.4 × 320 × 250 mm; vector spacing about 1.45 mm.
- 25 sequences of 1–3 wingbeats.
- Body mass and morphology are in ESM Table S1. Frequency and Re are not reported.

*Wake* [FT, §3.1]:
- DS: one vortex ring generated jointly by all four wings, mostly horizontal, giving weight support.
- US: a vertically and spanwise aligned structure at the clap, giving a rearward jet and thrust.
- In the clap the leading edges meet first ("cupped" wings).
- The LEV is not discussed by name.

*Impulses* [FT]:
- The US thrust impulse averages about 11% of the DS vertical impulse; the paper states L/T = 9.4.
- The US and clap gave net positive thrust in 24 of 24 sequences.
- The rest of the stroke gave net negative thrust in 22 of 24 sequences.
- The US contributed weight support in only 1 of 24.
- The DS vertical impulse exceeds the weight-support impulse, i.e. the animals were climbing.
- Regressions:
  - T_net = 56.13 (±37.75)·I_UST − 9.3×10⁻⁴ (±9.04×10⁻⁴), R² = 0.534;
  - I_US = 1.10×10⁻¹¹ (±0.52×10⁻¹¹)·(θ·φ̇) + 2.12×10⁻⁶ (±12.8×10⁻⁶), R² = 0.766.
- Absolute impulses appear only in figures (Fig. 2a normalised by the weight impulse; Fig. 4c,f).

*Clapper* [FT, Methods 2.7–2.8]:
- Right-triangle wings, 50 × 50 mm.
- Rigid wings: 1 mm balsa with a carbon leading edge. Flexible wings: 0.25 mm latex on a 3 mm carbon tube.
- About 1000°/s; tunnel at 0.1–0.2 m/s.
- Flexible wings: +22% "average impulse" along the mean impulse direction (p = 0.0084) and 28% lower wake kinetic energy per unit impulse (p = 0.0026). The abstract calls the latter "+28% efficiency".

*Data* [DOC]: tomo-PIV on Dryad, doi:10.5061/dryad.4j0zpc87v. ESM on figshare, rs.figshare.com collection 5271280 [SNIP].

#### Henningsson & Johansson 2021

"Downstroke and upstroke conflict during banked turns in butterflies." J R Soc Interface 18:20210779, doi:10.1098/rsif.2021.0779, PMC8633796 [FT].
- Same species and set-up, banked turns.
- The US makes thrust plus a sideways force opposite to the centripetal force.
- Outer/inner wing lift ratio 1.11 (CI 0.98–1.25). Peak DS angle of attack is 5.4° lower on the outer wing.
- Not a first-line target.

#### Srygley & Thomas 2002

"Unconventional lift-generating mechanisms in free-flying butterflies." Nature 420:660–664, doi:10.1038/nature01223 [AB].
- Red admirals (*Vanessa atalanta*) flying freely in a wind tunnel, imaged by smoke wire.
- Mechanisms seen: wake capture, two types of LEV, active and inactive upstrokes, rotational mechanisms and clap-and-fling.
- Mechanisms often switched between successive strokes.
- The SICB abstract mentions three LEV types, most common during large accelerations [AB].
- Qualitative only: no force numbers.

#### Sunada, Kawachi, Watanabe & Azuma 1993

"Performance of a butterfly in take-off flight." J Exp Biol 183:249–277, doi:10.1242/jeb.183.1.249 [AB; full text paywalled].
- *Pieris melete* take-off, analysed with a vortex method.
- DS: mainly vertical force. Body acceleration in the first half of the DS comes mostly from a large unsteady pressure drag, caused by vortices shed at the outer wing edges.
- That drag grows when the two wings interfere at small opening angles ("near fling"). A quasi-steady estimate matches it only with a force coefficient of 4.
- Wing-pair interference also raises the added-mass force.
- US: mainly horizontal force.
- The stroke-plane inclination switches the force direction. It is set by the thorax angle, which the wing aerodynamic moment and abdominal motion change.
- Companion: "Fundamental analysis of three-dimensional 'near fling'", J Exp Biol 183:217–248 [SNIP].

#### Bimbard, Kolomenskiy, Bouteleux, Casas & Godoy-Diana 2013

"Force balance in the take-off of a pierid butterfly…" J Exp Biol 216:3551–3563, doi:10.1242/jeb.084699 [AB plus partial full text].
- *Pieris rapae*, first downstroke.
- Wing forces alone, from a quasi-steady model and from penalisation CFD (768 × 768 × 384, ν = 1.45×10⁻⁵ m²/s, wing length 25.3 mm), do not explain the body acceleration, even with ground effect.
- Leg extension starts the take-off.
- Not a forward-flight target.

#### Dudley 1991

"Biomechanics of flight in neotropical butterflies: aerodynamics and mechanical power requirements." J Exp Biol 159:335–357, doi:10.1242/jeb.159.1.335 [AB].
- Quasi-steady analysis of 15 species.
- The required mean C_L usually exceeds steady-state maxima.
- DS vertical force is about 18% above weight; the US gives little or negative vertical force.
- Effective incidence averages 39° in the DS and −22° in the US.
- Mechanical power: 12.5 W/kg with perfect elastic storage, 20.2 W/kg with none.
- Erratic flight paths add about 43%.

#### Fuchiwaki, Kuroki, Tanaka & Tabata 2013 and Fuchiwaki & Tanaka 2013

"Dynamic behavior of the vortex ring formed on a butterfly wing." Exp Fluids 54:1450, doi:10.1007/s00348-012-1450-x (title confirmed via Crossref; abstract not reachable). Japanese J Multiphase Flow 27:419–426, doi:10.3811/jjmf.27.419 [AB].
- PIV on tethered *Idea leuconoe*, and on *Cynthia (Vanessa) cardui* in the Exp Fluids paper [SNIP].
- A vortex ring forms over the wings as they flap down to the bottom dead position. It then passes over the butterfly and grows until it reaches the wake.
- The ring forms in every species tested; its scale varies.

#### UAH monarch group (Kang, Sridhar, Landrum)

- **Sridhar et al. 2021** (above) [AB via Crossref]. Climbing monarchs in a pressure chamber, tracked optically. C_L rose from 1.7 at sea level to 9.4 at the 3000 m density. Correlation with flapping amplitude and frequency was insignificant; with effective angle of attack (wing-to-body velocity ratio) it was strong.
- **Sridhar 2021 PhD** (UAH, louis.uah.edu/uah-dissertations/419) [AB].
  - Weight 5 mN.
  - A fluid–structure interaction (FSI) model gives mean total power (aerodynamic plus inertial) of 7.3 mW at 193 m and 4.7 mW at 3000 m.
  - The PDF returned 403.
- **Kang et al. 2023**, Biomimetics 8:352, PMC10452477 [FT, re-checked]. Definitions:
  - C_L = L/(½ρV²·c·2R) and C_T likewise, with V the flight speed;
  - Re = ρVc/μ.
- **Caveat on Kang et al. 2023:** the model is a 2D strip.
  - It is a chordwise-flexible plate with a prescribed leading edge (ζa = 31 mm, f = 10 Hz). Forces are per unit span, scaled by 2R. No body.
  - So C_L = 1.5 at 193 m (Re 2588) and 9.5 at 3000 m are not 3D targets.
  - The printed chord, 2.9×10⁻³ m, should be about 2.8 cm to match Re = 2588: 2588·1.8×10⁻⁵/(1.2·1.4) = 0.028 m [DER].
  - The power components do not add up: 4.7 + 2.9 ≠ 7.3 mW.
- **Slegers et al. 2017**, Bioinspir Biomim 12:016013, doi:10.1088/1748-3190/aa551d [AB].
  - Removing the scales cut climbing efficiency by 32.2% (95% CI 18.8–45.6%), over 236 flights by 11 butterflies.
  - Amplitude fell 7%; frequency was unchanged.
- **Measured instantaneous lift from UAH: not found.**
  - The group's power papers use a single-mass body with quasi-steady lift. Sources: AIAA SciTech 2019-0566 "Beneficial effect of the coupled wing-body dynamics…" and APS DFD 2018 M19.4 (69 flight segments, 9 specimens) [SNIP].
  - The verified instantaneous comparisons with animals are Zheng 2013 (lift from centre-of-mass acceleration) and the Bode-Oke & Dong 2020 backward-flight check.

#### Gliding (*Morpho*)

- **Le Roy et al. 2021**, Science 374:1158, doi:10.1126/science.abh2620 [FT bioRxiv preprint 10.1101/2021.03.22.436469, sub-agent read].
  - Measured glide angles: 7 ± 2° for canopy species and 11 ± 1° for understory species. That is L/D ≈ 1/tan 7° = 8.1 and 1/tan 11° = 5.1 [DER].
  - Data on Dryad, doi:10.5061/dryad.cz8w9gj44.

### A3. Butterfly CFD: forces, power, wake and pitch

Sub-agent reads, except where marked re-checked. Zheng 2013 and Bode-Oke & Dong 2020 are in §0. Extra detail on each:

**Zheng, Hedrick & Mittal 2013** [FT, re-checked].
- Solver: sharp-interface immersed boundary, 128 × 128 × 160 grid, 900 steps per cycle. Body motion prescribed; body force under 5% of wing force.
- Grid check on RMS lift: 4.9% change on the coarse grid, 0.2% on the fine grid.
- Lift history [FIG, sub-agent]:
  - DS runs from t′ = 0 to about 0.57;
  - a lift plateau of about 10–12 mN between t′ ≈ 0.17 and 0.33;
  - about −2 to −3 mN of lift in the US.
- Thrust history [FIG]: about +1.5 mN at t′ ≈ 0.1, about −1.5 mN late in the DS, then US peaks of about +3 mN (t′ ≈ 0.62) and +4.5 mN (t′ ≈ 0.83).
- Power peaks at about 24 mW near t′ ≈ 0.2 [FIG].
- Wing deformation [FT]:
  - maximum twist about 40°, at t′ ≈ 0.33 and 0.80;
  - camber up to 15% (DS) and 7% (US);
  - camber is worth ≤4%; twist adds up to 29% lift and 46% lift/power over flat plates.
- Effective angle of attack on the distal half: about 80° in the DS, about 50° in the US [FT].

**Bode-Oke & Dong 2020** [FT, re-checked].
- Immersed boundary with the body included; 500 mg; forewing 51 mm.
- Re = Ū_b·R/ν, ranging 1700–3300.
- Table 5 prints no units. Table 6 says F̄ is normalised by body weight, so BW is presumed.
- Backward flight:
  - validated against body acceleration: 5.3 mN = 1.08 BW;
  - peak vertical force about 3 BW [sub-agent FIG];
  - the US gives 60% of net force and 85% of weight support.
- Cycle-mean vertical force if "US:DS" is the ratio of half-stroke durations: F1 = 0.621·2.27 + 0.379·(−0.31) = 1.29 BW; F2 = 0.575·2.14 + 0.425·0.45 = 1.42 BW [DER, assumption flagged]. Both cases were climbing or accelerating.

**Huang & Sun 2012**, "Forward flight of a model butterfly: simulation by equations of motion coupled with the Navier–Stokes equations." Acta Mech Sin 28:1590–1601, doi:10.1007/s10409-012-0209-1 [AB, re-checked at pubs-en.cstam.org.cn].
- The body oscillates freely. Wing force is roughly normal to the body axis and much larger in the DS.
- DS: small body pitch; the force points up and slightly back, supporting weight.
- US: large body pitch; the force points forward and slightly down, giving thrust.
- Body pitching plays the role that wing rotation plays in other insects.
- Body-mass-specific power 33.3 W/kg.
- Pitch amplitudes are not in the abstract; the PDF was blocked.

**Sun & Huang 2006**, J Beijing Univ Aeronaut Astronaut 32(10):1146–1151 [AB].
- *Morpho peleides*, Navier–Stokes on overset grids.
- DS: a strong "vortex ring" made of the LEV, tip vortices and starting vortex. Its jet runs along the flapping direction and gives a large drag-type force that supplies the vertical force.
- US: wing drag gives thrust.

**Kang, Sridhar, Twigg, Pohly, Lee & Aono 2023** [FT] (2D-strip caveat in §A2).
- Thrust 0.3–0.9 mN; C_T 0.25–1.
- Mean effective angle of attack rises from 15° to 47° with altitude.
- At altitude, LEV wake capture at the end of the US gives positive US lift.

**Pohly, Kang, Lee & Aono 2022**, WCCM-XV, pdfs.semanticscholar.org/41de/853fffd761ef04d893ed23a653d0f6e7f7a9.pdf [FT, sub-agent].
- Monarch model: Navier–Stokes plus body dynamics plus a passive wing-pitch spring of 0.15 mN·m, tightly coupled.
- f = 10.2 Hz, stroke plane 25.4°, span 5.2 cm, wing area 15.2 cm².
- Body-frame lift and thrust peaks of about 15–20 mN [FIG].
- Climbing trajectories match 9 VICON trials.
- Open loop, it pitches down severely after about 6 cycles, although the abstract says "stable motion for many periods".

**Suzuki, Minami & Inamuro 2015**, J Fluid Mech 767:659–695, doi:10.1017/jfm.2015.57. Accepted manuscript at soar-ir.repo.nii.ac.jp/records/18172 [FT, free-flight numbers re-checked].
- Model: immersed-boundary lattice Boltzmann. Rod body; rigid rectangular wings, AR 2.
- θ = 45°·cos(2πt/T); attack-angle amplitude 40°, 60° or 90°; Re = U_tip·L/ν from 50 to 1000.
- Body fixed: C_L peaks at t/T ≈ 0.2 and C_T at about 0.7.
- Translation free, *Janatella leucodesma* scale (L = 18.1 mm, Re 1190): terminal Ux/U_tip = 0.32, against 0.77 for the insect (Dudley 1990). St = U_tip/Ux = 3.13.
- Rotation free (Re 300): pitch rises until the model is off balance. The mean centre of pressure moves aft once the model moves forward.
- Wake: LEV and tip vortex on the upper surface in the DS and the lower surface in the US. The LEV is continuous across both wings over the body. Rings are shed down and back.

**Suzuki and co-authors, later papers.**
- Suzuki, Aoki & Yoshino 2019, Phys Rev E 100:013104 [AB]: chordwise flexibility as two plates on a torsion spring. Lift, thrust and power rise with stiffness. With pitch free, the model loses balance at every stiffness.
- Suzuki, Okada & Yoshino 2019, J Fluid Mech 877:614–647 [AB]: a higher wing-mass ratio gives larger body oscillation and lower forces; there is a critical ratio between climbing and sinking.
- Suzuki et al. 2022, Biol Open 11:bio059136, PMC8966778 [FT]: *Pieris rapae* take-off, experiment plus CFD at Re 1000 (the animal is at Re 2060).
  - The DS makes a horizontal ring (lift); the US a vertical ring (thrust).
  - Leg push matters more than wing lift.
  - Thorax pitch lags the flapping angle by about π/2.
  - The aerodynamic pitching moment alternates in sign, contradicting Sunada 1993.

**Fei & Yang 2015**, Phys Rev E 92:033004, doi:10.1103/PhysRevE.92.033004 [AB].
- Self-propelled model: J runs from 0.89 at the start of the DS to 0.17 at the DS→US transition.
- The clap cuts drag at high speed; wake capture gives thrust at the start of the US at low speed.
- A constant-inflow model under-predicts speed or over-predicts lift.
- Fei's NTU thesis (doi:10.6342/NTU201701085) [AB]: speed swings from 1.2 to 0.2 m/s within a stroke; mean speed is 47% higher than at constant speed.

**Fei & Yang 2016**, Phys Rev E 93:033124 [AB].
- *Kallima inachus*, body motion prescribed. Body rotation steers the vortex rings.
- A larger body-rotation amplitude sends the jet further down and gives a vertical "jump" at the end of the DS.

**National Taiwan University group (J.-T. Yang).**
- Lin, Chang, Lai & Yang 2021, R Soc Open Sci 8:202172, PMC8385355 [FT]:
  - *Tirumala septentrionis* (not *Kallima*); 0.35 g, R = 46 mm, c̄ = 20.1 mm, f = 11 Hz, Re 6130; body free.
  - Mean free-flight speed 1.43 m/s at the measured 45° wing-pitch amplitude, against 1.23 m/s at 67.5°. k = 0.49 [DER].
  - Upstroke wake capture supplies 1.52 of 3.22 mN (47.1%) at 45°; 15.6% at 67.5°; 55.7% at 0°.
  - The LEV peaks at t* = 0.40 and detaches at about 0.5–0.6. Dorsal clap at t* = 0.90.
  - Dryad: doi:10.5061/dryad.pzgmsbcjt.
- Fang et al. 2023, Biomimetics 8:287 [FT]: same species at 0.42 m/s, body angle fixed. Mean lift 1.30–1.81 mN. Raising the body angle from 39° to 75° moves lift from 1.30 to 1.77 mN and thrust from 1.19 to 0.22 mN, at about 6.9 mW.
- Chang et al. 2020, Phys Rev E 102:062407 [AB]: *Idea leuconoe*; abdominal oscillation raises instantaneous lift by 50.3% and thrust by 32.6%.

**Gliding CFD.**
- Le Roy et al. 2021 [FT preprint]: ReFRESCO with k-ω SST, Re ≈ 5200, U = 1.59–1.98 m/s. Maximum L/D at α = 6°: *M. cisseis* 5.83, *M. rhetenor* 5.71, *M. deidamia* 5.18.
- Ortega Ancel et al. 2017, Interface Focus 7:20160087, PMC5206606 [FT]: flat wing models, CFX SST, Re 2597–12632. Monarch maximum L/D 6.17 in CFD (AR 4.47) and about 5.9 in the wind tunnel.

**Cross-code free-flight benchmark: FluSI.** Engels, Kolomenskiy, Schneider & Sesterhenn 2016, SIAM J Sci Comput 38:S3–S24, arXiv:1506.06513 [FT, sub-agent].
- FluSI reproduces the Suzuki 2015 butterfly-like free flight:
  - rod body with square wings, R = 1, Re = U_tip·R/ν = 300 with U_tip = π;
  - M = 38, J_y = J_z = 3.1667, roll locked, wings massless, g = 0.1304.
- It reports "good agreement" in centre-of-mass path, body pitch, and vertical and forward forces.
- Parameter files are in its supplement.
- It is the only fully specified, two-code-checked butterfly free-flight case. At Re 300 an inviscid UVLM should be expected to differ.

### A4. Wake topology across sources

| Species and source | Method | Downstroke | Upstroke | Rings and wake | Tag |
|---|---|---|---|---|---|
| *Parantica sita*, Yokoyama 2013 | IB Navier–Stokes, Re 4300 | Dorsal LEV from the whole leading edge at about T/4, in two kinds: a sheet-like root LEV and a tip LEV with breakdown. Secondary vortices under it carry large local lift on the forewing half and strongly affect pitching moment. Multiplex helical tip vortices give lift | Ventral LEV near the tips with delayed separation, giving large forces near the tip at 7T/8. Upstroke tip vortices give thrust | Ring-like trailing-edge vortex at the DS→US transition gives lift and drag over T/2–5T/8. Zig-zag wake matches the smoke images. Not Brodsky's "chain of vortices" | [FT] |
| Painted lady, Zheng 2013 | IB Navier–Stokes, Re 3455 | LEV along the whole leading edge at t′ = 0.20; dual LEV at 0.33 | Smaller ventral LEV at 0.80 gives thrust; ventral tip vortex at 0.93 | Not detailed | [FT] |
| Monarch, Bode-Oke & Dong 2020 | IB Navier–Stokes with body | LEV after the wings separate at DS start; on the forewing only; attached until reversal | Ventral LEV, tip-to-tip across the thorax only when the body is modelled | True clap-and-peel seen once | [FT] |
| *Argynnis paphia*, Johansson & Henningsson 2021 | tomo-PIV | One mostly horizontal ring from all four wings (weight support) | Vertical structure at the clap; rearward jet (thrust) | Not detailed | [FT] |
| *Tirumala*, Lin 2021 | CFD, free body, Re 6130 | LEV peaks at t* = 0.40, detaches at about 0.5–0.6 | Wake capture of the detached DS vortex gives forward force | Dorsal clap at t* = 0.90 | [FT] |
| Rod plus square wings, Suzuki 2015 | IB-LBM | LEV and tip vortex on the upper surface; LEV continuous over the body | On the lower surface | Rings shed down and back | [FT] |
| *Pieris rapae* take-off, Suzuki 2022 | Experiment plus IB-LBM | Horizontal ring (lift) | Vertical ring (thrust) | Not detailed | [FT] |
| *Idea leuconoe*, *V. cardui*, Fuchiwaki 2013 | PIV, tethered | Ring forms over the wings by the bottom dead position, then grows into the wake | Not described | Present in all species tested | [AB]/[SNIP] |
| Red admiral, Srygley & Thomas 2002 | Smoke, free flight | Two LEV types | Active and inactive upstrokes | Wake capture, rotational mechanisms, clap-and-fling; mechanisms switch from stroke to stroke | [AB] |
| *Morpho peleides*, Sun & Huang 2006 | Overset Navier–Stokes | Ring of LEV, tip and starting vortices; drag-type vertical force | Drag-type thrust | Not detailed | [AB] |
| *P. sita*, Senda 2012 | Smoke at 1 m/s | Flow follows the surface "without separation" | Not described | Complex free-vortex wake | [FT] |

### A5. Clap numbers

- **Johansson & Henningsson 2021** (§A2) [FT]. These are the only measured butterfly clap numbers found:
  - L/T = 9.4, with US thrust impulse ≈ 11% of DS vertical impulse;
  - US plus clap thrust positive in 24 of 24 sequences;
  - flexible clapper wings +22% impulse and −28% energy per unit impulse against rigid.
- **Lehmann, Sane & Dickinson 2005**, J Exp Biol 208:3075–3092, doi:10.1242/jeb.01744 [AB]. A generic benchmark for wing–wing induction:
  - robotic *Drosophila* wings at Re 100–200;
  - clap-and-fling raises total lift by up to 17%, only if the wings come within 10–12° of each other;
  - force drops early in the clap and rises slightly at its end;
  - two transient peaks in the fling, the early one supplying most of the gain;
  - early-fling LEV circulation is below inviscid 2D predictions; late-fling circulation nearly matches Weis-Fogh's model.
- **Sunada 1993** [AB]: wing-pair interference at small opening angles raises the unsteady pressure drag and added mass early in the DS. A quasi-steady estimate needs a force coefficient of 4.
- **Senda 2012b** [FT]: the wings overlap at the top of the stroke and peel apart from the leading edge, staying convex upward.
- **Bode-Oke & Dong 2020** [FT]: true clap-and-peel only once, in a monarch backward-flight sequence.
- **Fei & Yang 2015** [AB]: the clap reduces drag at high speed.
- **Butterfly-specific CFD of clap thrust impulse:** none found.

### A6. Body pitch response

*Measured on animals:*
- Monarch, Bode-Oke & Dong [FT]: mean body angle in the DS against the US is 24° vs 32° (F1) and 40° vs 61° (F2).
- *P. sita* free flight, Yokoyama 2013 [FT, FIG]:
  - Fig. 3 plots thorax pitch on a 0.2–0.8 rad axis; the text says it "varies greatly";
  - the abdomen moves nearly in antiphase with flapping: the abdomen tip goes up during the DS.
- *Kallima*: body rotation in phase with flapping [SNIP, APS DFD 2013 abstract truncated].

*Open-loop models: all butterfly free-flight models found are longitudinally unstable.*
- **Yokoyama 2013**, measured joint angles only [FT]:
  - thorax pitch rises within the first wingbeat and the butterfly flips upward; about 1 rad after one cycle per the RIMS paper;
  - cause: the abdomen-gravity torque (2.5–3×10⁻⁵ N·m) exceeds the mean nose-down DS moment;
  - horizontal speed at t = T is about 0.5 m/s in the lab frame (about 1.1 m/s relative to air), so the butterfly is swept back.
- **Yokoyama 2013 sensitivities** [FT]:
  - abdominal mass ×3/4 (total 2.83×10⁻⁴ kg) improves periodicity at the first flap, but it still turns up later;
  - the mean lead-lag angle η̄ is −9.1×10⁻² rad as observed. With 2η̄ the pitch is about 0.1 rad at the end of the first flap and the butterfly falls forward. With 7η̄/4 it stays in range for about 3 cycles.
- **Senda 2012a** [FT]: Floquet multiplier 8.6 per wingbeat with the free wake, 17.0 without. Passive torsion (k ≈ 8.0×10⁻⁴ N·m/rad, ζ ≈ 0.7) adds about 4 stable periods.
- **Suzuki 2015** [FT]: pitch diverges because the mean centre of pressure moves aft once the model flies forward.
- **Suzuki, Aoki & Yoshino 2019** [AB]: chordwise flexibility gives no passive pitch stability.
- **Pohly 2022** [FT]: pitch-down after about 6 cycles.
- **Suzuki 2022** [FT]: thorax pitch lags flapping by about π/2 during take-off.
- **Sunada 1993** and **Huang & Sun 2012** [AB]: thorax pitch sets the force direction (small in the DS, large in the US).

*Targets for the coupled sim:*
1. With measured joint angles and no control, reproduce the sign and order of magnitude of the divergence: nose-up within about 1 wingbeat for the Yokoyama *P. sita* case.
2. Reproduce its sensitivity to mean lead-lag angle and abdominal mass.
3. Compute a Floquet multiplier comparable to 8.6.
4. Then match the FluSI/Suzuki benchmark trajectory.

### A7. Method papers: force formulation, leading-edge treatment, UVLM vs CFD

Sub-agent reads. The lead agent re-checked Simpson and Nabawy & Crowther.

**Simpson, Palacios & Murua 2013**, "Induced-drag calculations in the unsteady vortex lattice method." AIAA J 51(7):1775–1779, doi:10.2514/1.J052136. Accepted manuscript at spiral.imperial.ac.uk [FT, conclusion re-checked].
- *Joukowski method:* δF = ρΓ(U×δl) on each bound segment, with U the local velocity at the segment midpoint. Each panel adds ρ(∂Γ/∂t)A·n (after Pesmajoglou & Graham 2000). Leading-edge suction then arises automatically.
- *Katz–Plotkin method:* lift from the pressure jump at collocation points; drag rebuilt from downwash of chordwise vorticity. The authors list four weaknesses: velocities at collocation points rather than segments, chordwise vorticity only, no sideslip, awkward for general kinematics.
- *2D benchmarks* against Garrick/Theodorsen (AR ≈ 10³):
  - plunge h̄/b = 0.2 at k = 0.1, plunge 0.02 at k = 1, pitch 1° about the quarter chord;
  - both methods match, except Katz–Plotkin in plunge at k = 1;
  - plunge at k = 0.1: RMS error under 1% for M = 4–32;
  - at k = 1, M = 32: about 1–2% (plunge) and 3–4% (pitch) [FIG].
- *3D benchmark* (AR 4, α = 5°cos(ks), N = 50, Δt·U∞/c = 1/M):
  - steady drag with Katz–Plotkin: error 52% at M = 1, 14% at M = 5, 7% at M = 10, 3.5% at M = 20, about 1% at M = 50 [FIG];
  - steady drag with Joukowski: −2.5% at M = 1 and about 0 from M = 5;
  - at k = 0.5 both methods need M ≳ 20 (Joukowski about 24% off at M = 5, 10% at M = 10) [FIG].
- Conclusion: at moderate-to-low k the Joukowski method gives "the same level of accuracy for a much coarser discretisation".

**Lambert & Dimitriadis 2017**, AIAA J 55(2):668–672, doi:10.2514/1.J055135. Accepted manuscript at orbi.uliege.be [FT].
- If the first wake row carries the trailing-edge (TE) panel's Γ, the TE segment's net Γ is zero and it carries no force.
- Joukowski costs about 3× the CPU of Katz: 2.1×10⁴ s against 0.7×10⁴ s at M = 50 [FIG].
- Cambered 3D wings converge faster with Katz. At M = 28 the error is 0.3–1.25% for Katz against 0.75–2.4% for Joukowski; at M = 4 it is 12–13% against 27–32% [FIG].
- Cause: ring vortices sit at the quarter chord, so segment midpoints lie off the camber line. The suggested fix (rings at panel leading edges) was not tested.

**Lambert, Abdul Razak & Dimitriadis 2017**, Aerospace 4:22, doi:10.3390/aerospace4020022 [AB].
- Both force methods do well while the flow stays attached.
- In pure flapping they underestimate the drag amplitude; a simplified Leishman–Beddoes model does better.

**Roccia, Preidikman, Massa & Mook 2013**, "Modified unsteady vortex-lattice method to study flapping wings in hover flight." AIAA J 51:2628–2642, doi:10.2514/1.J052262 [FT].
- Core cutoff δ as a fraction of segment length: 0.15 for the TE wake, 0.20 for LE sheets. Below 20% at the LE, lift became noisy.
- LE shedding switches on when α_e ≥ 12°; thresholds of 8–15° gave about the same result.
- Loads from unsteady Bernoulli without LE suction; thrust is underestimated.
- First-order wake update.
- Robofly (Re 136, Φ 160°, 40° AoA at mid-stroke, 0.145 Hz, 100 steps per cycle, 384 panels per wing): mean lift 0.2301 N measured against 0.2406 N computed (+4.5%); largest local difference 19%.

**Nguyen, Kim, Han & Han 2016**, "Extended unsteady vortex-lattice method for insect flapping wings." J Aircraft 53(6):1709–1718, doi:10.2514/1.C033456 [AB; full text 403].
- Adds an LE suction analogy and vortex-core growth, validated on hawkmoth wings. Agreement numbers not obtained.
- Formulas from the group's ICAS 2018-0260 paper [FT; equation partly garbled in the text layer]:
  - LE suction force per LE panel, applied normal to the wing: F_s = (π/16)·η_s·ρ·Γ_LE²/(Δx_LE·cos Λ_LE), with η_s a suction-efficiency coefficient;
  - core growth r_c = √(4α_L·ν·(1 + a₁Γ/ν)·t), with α_L = 1.25643 and a₁ = 0.1;
  - coupled to MSC Adams for flight dynamics.
- η_s = 0.5 for the hawkmoth is [SNIP] only.

**Ramesh, Gopalarathnam, Granlund, Ol & Edwards 2014**, J Fluid Mech 751:500–538, doi:10.1017/jfm.2014.297 [AB].
- LESP is the A₀ Fourier coefficient of the bound vorticity. Its critical value depends on aerofoil and Re, not on the motion.
- Shedding starts when LESP exceeds the critical value and holds it there.
- Critical values quoted by a citing paper [SEC]: SD7003 0.21 (Re 10⁴), 0.18 (3×10⁴), 0.14 (10⁵); 2.3%-thick flat plate 0.11 (Re 1000).
- 3D extension: Hirato, Shen, Gopalarathnam & Edwards 2021, J Fluid Mech 910:A1 [AB]. A spanwise LESP from an attached-flow UVLM predicts where and when the LEV starts, "closely" matching RANS.
- No insect-wing application found.

**Nabawy & Crowther 2017**, J R Soc Interface 14:20170159, PMC5550969 [FT, re-checked].
- Revolving wings, 8 cases: hawkmoth ×3, bumblebee, mayfly, fruit fly, pigeon, hummingbird. AR 2.78–4.07; Re 110–54,000 (Table 1).
- Average error: normal-force model 11%, LE suction (Polhamus) 31%, potential flow 33%. Typical mid-half-stroke α is 20–45°.
- At 45°, K_Pol is 1.15–1.2, about 15–20% above the normal-force model.
- Polhamus is "known to over-predict" as AR increases beyond 1.5, and over-estimates lift up to about α ≈ 65°.
- Conclusion: the LEV prevents stall rather than adding lift.

**Usherwood & Ellington 2002**, J Exp Biol 205:1547–1564, doi:10.1242/jeb.205.11.1547 [AB via Crossref].
- Revolving hawkmoth wings (Re ≈ 8000 [SEC]).
- High vertical and horizontal force coefficients come from the LEV. Separation at the leading edge prevents leading-edge suction, so the force is roughly normal to a flat wing.
- Coefficients are "remarkably unaffected" by leading-edge detail, twist and camber.
- Coefficient values not read.

**Recommendation (force formulation and leading edge):**
- Keep the Joukowski formulation.
  - U must be the full local velocity at each segment midpoint, including wake, other-wing and kinematic terms.
  - Make the TE-segment Γ consistent with the wake-attachment convention (Lambert & Dimitriadis).
  - Use M ≥ 20 chordwise panels if the wings are cambered or deform.
- Prefer the normal-force view for the LEV over adding Polhamus lift on top of KJ. Our inference from Usherwood & Ellington, Nabawy & Crowther and Simpson et al.:
  - KJ on the LE segment already produces an in-plane LE suction;
  - with separation, that in-plane suction should be removed and re-applied normal to the wing (Polhamus rotation), scaled by an η_s calibrated on one case;
  - otherwise the LE suction is counted twice.
- LESP-gated LE shedding (Ramesh, Hirato) is the better-founded upgrade, but no one has validated it on insect wings. Roccia's simpler on/off rule at 12° gave a 4.5% mean-lift error on Robofly.

### A8. Quasi-steady models for a fast second model

**Dickinson, Lehmann & Sane 1999**, Science 284:1954–1960.
- Fits [FT via Sane & Dickinson 2002, re-checked]:
  - C_L = 0.225 + 1.58 sin(2.13α − 7.2);
  - C_D = 1.92 − 1.55 cos(2.04α − 9.82);
  - α in degrees.
- From Robofly in hover, Re ≈ 115–140 [sub-agent read]; i.e. Re ~10², an order of magnitude below butterflies.

**Sane & Dickinson 2002**, J Exp Biol 205:1087–1096, doi:10.1242/jeb.205.8.1087 [FT, re-checked].
- Rotational circulation Γ_rot = C_rot·ω·c², with theoretical C_rot = π(0.75 − x̂₀). Measured zero-crossing at x̂₀ = 0.56–0.70; C_rot grows with rotation rate.
- Added mass: F_a = ρ(π/4)R²c̄²(φ̈ sin α + φ̇α̇ cos α)∫r̂ĉ²dr̂ − α̈ρ(π/16)c̄³R∫ĉ²dr̂ [FT, sub-agent].
- The model misses wake-capture peaks after stroke reversal.

**Whitney & Wood 2010**, J Fluid Mech 660:197–220, doi:10.1017/S002211201000265X [AB via Crossref].
- Blade-element model plus derived rotational equations of motion. Passive-rotation experiments matched forces and kinematics "without variation or fitting of model parameters".
- Coefficient values and the rotational-damping coefficient not verified: no open PDF; the Harvard copy is 404.

**Lee, Lua, Lim & Yeo 2016**, Bioinspir Biomim 11:036005, doi:10.1088/1748-3190/11/3/036005.
- Bibliographic data only [Crossref]. Content not verified.

**Nakata, Liu & Bomphrey 2015**, J Fluid Mech 783:323–343, PMC4918218 [FT].
- Terms: polynomial translational C_L(α), cos²/sin² drag, rotational circulation, three added-mass terms and rotational drag.
- Fitted to 29 hovering hawkmoth CFD cases (Re 6300, k = 0.3).
- Error against CFD: 0.38% in force and 1.98% in power, against about 10% for a conventional blade-element model.
- No Re or J terms.

**Nabawy & Crowther 2014, Parts I and II**, J R Soc Interface 11:20131196 and 20131197.
- Part I [AB]: induced-power factor 1.02–1.07.
- Part II [FT]: normal-force model with 2D lift slope 0.09/deg plus a lifting-line correction. Against CFD for 8 hovering insects: vertical force −8% to +30%, power −13% to +16% [DER]. Hover only.

**Kamimizu, Liu & Nakata 2025**, arXiv:2508.18703 [FT, partial].
- Conventional QSM in that paper:
  - C_L = β₁·α(α − π/2) + β₂·α²(α − π/2);
  - C_D = β_td·sin²α;
  - plus rotational and added-mass terms.
- The conventional model is about 29% off for hawkmoth forward flight at 2.1 m/s (J = 0.5).
- The new 34-term model adds advance-ratio coupling, spanwise and rotational-Wagner terms. NRMSE 11–16% for the hawkmoth (Re 6100–11000, J 0–1.1).
- Coefficients are in an appendix not read.

**Other forward-flight models** [AB/SNIP]:
- Han, Chang & Han (KAIST): quasi-steady error grows with J; forces drop sharply for J > 0.25.
- Cai, Kolomenskiy, Nakata & Liu 2021, J Fluid Mech: bumblebee wing plus body, across speeds.
- Su et al. 2023, arXiv:2302.09602: fits for Re 2–5×10⁴.
- van Veen et al. 2022, J Fluid Mech 936:A3: Wagner effect from rotational accelerations.
- Walker & Taylor 2021, J R Soc Interface: 2-parameter blade element, about 80% of force variance over 26,541 wingbeats.

**Recommendation (quasi-steady):**
- Closest to butterfly Re (10³–10⁴): Nakata 2015 (Re 6300) and Kamimizu 2025 (Re 6100–11000, J up to 1.1).
- The Dickinson fits are from Re ~10². Use them only as shape functions.
- No verified fit covers butterfly kinematics, i.e. J 0.4–1.2, steep stroke-plane tilt and large body pitch oscillation.
- Practical route:
  - a normal-force translational term, plus a rotational term π(0.75 − x̂₀), plus Sane & Dickinson added mass;
  - add the Kamimizu J coupling;
  - refit the handful of coefficients to your own UVLM runs, then check against Zheng 2013 and Bode-Oke & Dong 2020.
- Sunada 1993's coefficient of 4 and Dudley 1991's "required C_L above steady maxima" both show that plain steady coefficients under-predict DS forces.

### A9. Suggested validation ladder for this solver

1. **Force method.**
   - Garrick plunge and pitch: Simpson's cases (h̄/b = 0.2 at k = 0.1; 0.02 at k = 1; 1° pitch).
   - AR-4 drag convergence.
   - Robofly mean lift 0.2301 N (Roccia).
2. **Wing–wing induction.** The clap-and-fling lift gain of up to 17% within 10–12° separation (Lehmann 2005), using regularised cores on bound legs.
3. **Same physics, tethered.**
   - Senda's *P. sita* panel model: reproduce its mean L 0.7 mN (§2.5 case), then compare with the measured 0.3 mN.
   - The §4.3 flat-plate result of 0.3 mN against the measured 2.4 mN.
   - Then the Yokoyama tethered time histories at u0 = 1.0 m/s.
4. **Painted lady.**
   - Rigid wings: Zheng FPW1–3 (mean lift 1.42–2.07 mN, power 9.81–13.7 mW).
   - Twisted wings: OBW (2.93 mN, peak 11.7 mN, 10.5 mW).
5. **Monarch.** Bode-Oke & Dong F1 and F2: half-stroke forces in BW, power per muscle mass, and the US share of weight support (8%).
6. **Clap.** Johansson L/T = 9.4 and positive US-plus-clap thrust in every sequence.
7. **Free flight.**
   - The Yokoyama divergence and its sensitivity to η̄ and abdominal mass.
   - A Floquet multiplier comparable to 8.6 (Senda).
   - The FluSI/Suzuki benchmark, Re 300; an inviscid UVLM will differ, so treat it as a trend check.

---

## B. Open-source code and datasets

Sub-agent read the code in July–October 2026 versions. The lead agent re-checked PteraSoftware's constants, defaults and TE placement, and SHARPy's cutoff and Γ̇ filter, in the source.

### B.1 Vortex, panel and low-order codes

| Code (version read) | License | Language | Wake shedding and first row | Core model | Force method | Leading edge | Validation |
|---|---|---|---|---|---|---|---|
| **PteraSoftware** 5.1.0 (main @ 0fec891, 2026-10-19) | MIT [DOC] | Python + Numba [SRC] | Shed after solve and loads of step n. Wake convected by explicit Euler. New row attached at the next step's TE-ring back leg, 0.25·(V∞ − V_TE)·Δt behind the TE, carrying Γ_TE(n). Prescribed (default) or free [SRC, re-checked] | Wake r_c0 = 0.03·mean chord. r_c² = r_c0² + 4·1.25643·(ν + 10⁻⁴·\|Γ\|)·age. Scully-type h²/(h² + r_c²) factor [inferred]. Bound legs only floored at ε^¼·length [SRC, re-checked] | KJ on all four legs of every ring, plus −ρ·ΔΓ/Δt·A·n; "katz" pressure option (default "joukowski") [SRC, re-checked] | None | Yeo et al. 2011 flapping-robot lift: MAE 0.0291 N against experimental RMS 0.0717 N (Urban & Agarwal 2021) [FT] |
| **SHARPy** + **UVLM** (main / master) | BSD-3 [DOC] | Python + C++ (Eigen); Fortran beam | Wake row 0 at the TE vertices, no offset. Each step: convect (0 fixed / 2 background / 3 free; default 3), shift Γ*, then solve [SRC, re-checked] | Hard cutoff, `vortex_radius_def = 1e-6` [SRC, re-checked] | KJ with Δγ on segments using total velocity at midpoints. Optional ρ·A·n·Γ̇ with a Welch filter (`gamma_dot_filtering`) [SRC, re-checked] | None | None in README |
| **FLOWUnsteady** | MIT | Julia | VLM or actuator surfaces shed vortex particles, `p_per_step=1` [DOC] | Reformulated VPM; Gaussian-erf (default) or Winckelmans kernel; `sigmafactor_vpm=1.0` [DOC] | KJ on bound segment AB. The −ρ·dΓ/dt·A term is computed but not added by default ("tends to add a lot of numerical noise") [SRC] | None | Swept wing "excellent" at 0–10.5°; rotor mean C_T within 2%; turbine torque within 10% for λ > 2 [DOC] |
| **DUST** (Polimi / A³) | MIT [DOC] | Fortran | Wake panels converted to vortex particles [DOC] | Variable-radius particles in 0.7.x [SNIP] | Not verified | Not verified | eVTOL and tiltrotor against experiment and CFD (Tugnoli et al. 2021, doi:10.1016/j.ast.2021.106804) [SNIP] |
| **VSPAERO** (OpenVSP 3.45) | NOSA 1.3 | C++ | Time-accurate unsteady mode since 6.0 [SNIP] | Not verified | Not verified | Not verified | Not verified |
| **VortexLattice.jl** | MIT | Julia | Ring vortices; free wake in unsteady mode [DOC] | Optional finite core (formula not read) | Near-field plus far-field drag | None | Against AVL and Katz & Plotkin [DOC] |
| **UnsteadyFlowSolvers.jl** (UNSflow) | MIT | Julia | 2D discrete vortices | – | – | LDVM / LESP [SNIP] | Not stated |
| **LiftingLineTheory.jl** (H. J. A. Bird) | No licence file seen | Julia | VLM; "PEVLM" (wake as regularised particles) [DOC] | – | – | LMPEVLM/VoFFLE: LEVs with LESP modulation [DOC] | None ("may contain bugs") |

### B.2 Navier–Stokes, immersed-boundary, LBM and penalisation codes

| Code | License | Language | Method | Flapping or butterfly content |
|---|---|---|---|---|
| **FluSI** | GPL-3.0 on GitHub; the paper says free for non-commercial use | Fortran/MPI | Fourier pseudo-spectral with volume penalisation; insect module; free flight [FT] | Reproduces the Suzuki 2015 butterfly-like free flight (§A3) |
| **WABBIT** v2.1beta6 | GPL-3.0 | Fortran | Wavelet-adaptive blocks with artificial compressibility | Insect flight; no butterfly found |
| **WaterLily.jl** | MIT | Julia, CPU/GPU | BDIM Cartesian Navier–Stokes (Weymouth & Font 2025, CPC 315:109748) | WaterLily-Examples (GPL-3.0): `TwoD_Hover.jl`, `ThreeD_Jelly.jl` |
| **IBAMR** | BSD-3 | C++ | Immersed boundary with AMR | No flapping example in README |
| **Lily-Pad** | MIT | Processing | Real-time 2D; method not stated on the page | Zenodo doi:10.5281/zenodo.16065 |
| **IB2d** | GPL-3.0 | MATLAB/Python | 2D immersed boundary, >75 examples | 2D insect-wing case in arXiv:1610.07944 [SNIP] |

Not checked: PetIBM, Basilisk, OpenLB, Palabos.

### B.3 Per-code notes

**PteraSoftware** (https://github.com/camUrban/PteraSoftware; Zenodo doi:10.5281/zenodo.19229119).

Files:
- `pterasoftware/_unsteady_ring_vortex_lattice_method.py`
- `_aerodynamics_functions.py`
- `_functions.py`
- `_free_flight_unsteady_ring_vortex_lattice_method.py`
- `_mujoco_model.py`
- `validation/validation_study.py`

*Step order* [SRC]:
1. Geometry for all steps is precomputed.
2. `_evaluate_step_aerodynamics()`: collapse geometry, then wing–wing influences, then freestream and motion normal-wash, then wake normal-wash (zero at step 0), then `np.linalg.solve`, then `_calculate_loads()`.
3. `_populate_next_airplanes_wake()`:
   - convects the step-n wake vertices with V_ind (bound + wake) + V∞(n+1) + the body-rate term, times Δt (V∞ only for a prescribed wake);
   - prepends a row whose front vertices are the next step's TE-ring back-leg vertices, carrying the step-n TE Γ;
   - shifts the older rows back and truncates at `max_wake_rows`.
4. `_last_bound_vortex_strengths ← current`.
5. Means and RMS are taken by trapezoid from `_first_averaging_step` onward.

*Trailing edge* [SRC, re-checked]:
- Interior back legs sit on the next panel's quarter-chord front leg.
- The TE back leg sits at TE + 0.25·V∞·Δt at step 0, then TE + 0.25·(V∞ − V_TE,motion)·Δt.
- Cites Lambert's thesis, "Modeling of aerodynamic forces in flapping flight with the Unsteady Vortex Lattice Method", pp. 37–39.

*Cores* [SRC, re-checked]:
- `SQUIRE = 1.0e-4`, `LAMB = 1.25643`.
- Wake `r_c0 = 0.03 * standard_mean_chord` (citing Ramasamy & Leishman 2007). ν defaults to 0. Age = (row + 1)·Δt.
- Bound legs: `CORE_FRACTION = EPS**0.25` times segment length (about 1.2×10⁻⁴ of it).

*Forces* [SRC]:
- Interior shared legs get (Γ_i − Γ_neighbour)/2 per side.
- Free edges (LE and tips) get the full Γ_i.
- The TE back leg gets Γ_i(n) − Γ_i(n−1).
- F = ρΓ_eff(V×l), with V at the leg midpoint including all induced and kinematic terms.
- Unsteady term −ρ(Γ − Γ_last)·A·n̂/Δt, a backward difference.

*Free flight (beta)* [SRC]:
- MuJoCo with one rigid body on a freejoint, RK4, loads applied at the CG through `xfrc_applied`.
- Aerodynamics re-evaluated at trial states (strong coupling).
- Wings are not separate bodies.

*Validation* [FT, Urban & Agarwal 2021, WUSTL]:
- Yeo, Atkins & Shyy 2011 ornithopter: 0.213 m half-span, 0.072 m chord, 3.3 Hz, 2.9 m/s; 5 × 18 panels, 224 steps over 3 cycles.
- MAE 0.0291 N against experimental RMS 0.0717 N, with a phase lag and over-predicted negative lift.
- That run predates the 5.1.0 cores and forces.

**SHARPy + UVLM** (https://github.com/ImperialCollegeLondon/sharpy, https://github.com/ImperialCollegeLondon/UVLM; del Carre et al. 2019, JOSS, doi:10.21105/joss.01885).
- Order: convect wake, then `circulation_transfer` (Γ*₀ = cfl·Γ_TE + (1 − cfl)·Γ*₁; with cfl = 1 this is the previous Γ_TE), then solve, then forces. `generate_new_row` puts ζ*₀ at the TE vertices [SRC].
- Dynamic forces are spread ¼ to each corner node, and downstream TE corners are skipped [SRC].
- `postproc.h` computes f = ρ·Δγ·(v × dl) per segment and f_uns = ρA·n·Γ̇ [SRC, re-checked]. This is the Simpson, Palacios & Murua formulation (same group).
- Free flight and hinged multibody per the README.

**FLOWUnsteady** (https://github.com/byuflowlab/FLOWUnsteady).
- Read: `src/FLOWUnsteady_processing_force.jl`.
- Inviscid by default; core spreading and particle strength exchange optional; ALM by default, ASM with `vlm_vortexsheet=true` [DOC].
- Refs: Alvarez & Ning 2024, AIAA J, doi:10.2514/1.J063045.

**DUST** (https://public.gitlab.polimi.it/DAER/dust).
- Helmholtz decomposition: Morino-type BEM plus a vortex-particle wake. Elements: lifting lines, zero-thickness lifting surfaces, surface panels [DOC/SNIP].
- The GitLab and Polimi sites were unreachable or returned 403, so core, force and LE details are not verified.

**Other repos and quasi-steady codes.**
- VLM_Wing2.0 (cibinjoseph): Fortran UVLM, marked obsolete. Its successor VOLCANOR returned 404.
- PANKH: 2D flapping panel code, not opened.
- **No dedicated insect or butterfly UVLM repository was found.**
- *Flappy* (purdue-biorobotics/flappy): MIT, Python with DART, blade-element quasi-steady model (Fei et al., ICRA 2019) [DOC]. Coefficients not read.
- Chen, Lu, Tong et al. 2022, ACM TOG, "A Practical Model for Realistic Butterfly Flight Simulation" [FT]:
  - monarch and *Pachliopta aristolochiae*;
  - empirical quadratic C_l(α) and C_d(α), plus an artificial "vortex force" on the thorax;
  - no direct validation, no code.
- No lab-released quasi-steady insect code (Dickinson, Muijres or Cheng labs) was found.

### B.4 Open butterfly datasets

These are listed only; another agent extracts the values. Dryad pages say "licensed for reuse"; Dryad's standard licence is CC0 [inferred].

1. **Johansson & Henningsson 2021**, doi:10.5061/dryad.4j0zpc87v.
   - tomo-PIV of free-flying *A. paphia* at take-off, plus the clapper: x, y, z, u, v, w at 640 Hz, DaVis 8.3.1, 4.95 GB.
   - No kinematics files.
2. **Lin, Chang, Lai & Yang 2021**, doi:10.5061/dryad.pzgmsbcjt.
   - *Tirumala septentrionis*: kinematics, speed and CFD forces (Fluent, Re 6130) in Excel, 504 KB.
3. **Le Roy et al. 2021**, doi:10.5061/dryad.cz8w9gj44.
   - Kinematics and morphology for 11 *Morpho* species; CFD data for 7 species, including STL wings; about 228 MB [SNIP].
4. **Not found** for monarch, painted lady, *Pieris*, red admiral, *Kallima* or *Parantica*.
   - Zheng 2013 has no data file on PMC.
   - The UAH Cranford 2015 thesis (2000 flights of 86 monarchs) has no repository.
   - Related moth data: silkmoth 3D kinematics, doi:10.5061/dryad.280gb5n2g [SNIP].

### B.5 What to borrow for the JS solver

1. **PteraSoftware for step order and Kutta bookkeeping.**
   - Order: solve(n), then loads(n), then convect by explicit Euler, then prepend a TE row with Γ_TE(n).
   - Put the TE back leg 0.25·(V∞ − V_TE)·Δt behind the TE (Lambert), and use Γ_TE(n) − Γ_TE(n−1) on it.
   - Use half net Γ on shared legs and full Γ on the LE and tips, with midpoint velocities that include every induced and kinematic term.
   - This is your Simpson-type formulation, already wired to a free-flight loop.
2. **Cores: PteraSoftware's smooth, age-growing core, not SHARPy's 10⁻⁶ cutoff.**
   - r_c0 = 0.03·c̄; r_c² = r_c0² + 4·1.25643·(ν + 10⁻⁴|Γ|)·t (the same Lamb constant as the KAIST extended UVLM; KAIST uses a₁ = 0.1).
   - For the dorsal clap, also give bound legs a finite core, e.g. Roccia's 15–20% of segment length. Wing–wing distances fall below panel size [inferred].
3. **Γ̇ is noisy.** FLOWUnsteady drops it by default; SHARPy offers a Welch filter. Plan for filtering or a higher-order difference.
4. **SHARPy for multibody.** PteraSoftware's MuJoCo loop is a single rigid body, while a butterfly needs thorax, abdomen and wing bodies. SHARPy has hinged multibody and the same force formulation.
5. **Leading edge.** No mainstream open UVLM separates the leading edge. Open references are LiftingLineTheory.jl (LESP-modulated LEVs, 3D) and UNSflow's LDVM (2D). For formulas use the KAIST suction analogy (η_s) and the Polhamus caution in §A7.

---

## C. Leads not verified or dead ends

**Paywalled or abstract only:**
- Huang & Sun 2012: pitch amplitudes.
- Fei & Yang 2015 and 2016: full texts.
- Sunada 1993: full text, including forces and power.
- Srygley & Thomas 2002: full text.
- Nguyen 2016: agreement numbers and η_s.
- Whitney & Wood 2010: coefficients.
- Lee et al. 2016: content.
- Ramesh 2014: own LESP table.
- Fuchiwaki 2013: Exp Fluids text.

**UAH monarch:**
- No paper with measured instantaneous lift was found.
- Sridhar 2021 (Bioinspir Biomim) full text: NSF PAR (par.nsf.gov/servlets/purl/10232737) refused connections, and the UAH PDF returned 403.
- AIAA 2020-1781 (Re ≈ 3326) [SNIP].

**Kallima "body rotation gives 15% of lift"** (APS DFD 2013, Fei & Yang): search snippet only; the abstract page is truncated.

**Quasi-steady:**
- Wang, Birch & Dickinson 2004's often-quoted C_L = 1.2 sin 2α, C_D = 1.4 − cos 2α is unconfirmed.
- Usherwood & Ellington 2002 coefficient values; Cai 2021 Re and J; van Veen 2022 Re; Sane & Dickinson 2001.

**Codes:**
- DUST core, kernel and forces; VSPAERO core, forces and LE.
- PteraSoftware's "katz" body and `_fixed_point_relaxation.py`.
- VortexLattice.jl core formula.
- VOLCANOR (404) and PANKH.

**Possibly useful, unread:**
- Jayakumar, Senda & Yokoyama 2018, J Aircraft 55:2327–2337 (2D butterfly pitch control by abdomen).
- Lan & Lai 2023, AMAM, "Impact of butterfly wing-pitch interaction on flight performance".
- Suzuki & Inamuro 2014, RIMS Kôkyûroku 1900:37–47 (Japanese; free flight and pitching stability of the 2015 model; skimmed, no new numbers).
- Monteiro, Ramesh & Silvestre, ABCM: LESP in a 3D UVLM with experimental validation.
- Papillon & Olivier 2025, arXiv:2507.07873: 3D clap-and-fling thrust at Re 800, efficiency loss about 5.6% at AR 8.

---

## D. Sources

Butterfly experiments and CFD:
- Yokoyama et al. 2013: doi:10.1063/1.4790882; text at https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/939bce40-66bf-4e3c-8fd5-494a33b21891/content
- Senda et al. 2012a: doi:10.1016/j.robot.2011.12.007; text at https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/1687ef50-0be4-4bc0-a787-5b02baad19e3/content
- Senda et al. 2012b: doi:10.1088/1748-3182/7/2/025002; text at https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/41a9195d-5384-41c1-830e-86e2e53f36b7/content
- Yokoyama et al. 2012, RIMS 1808: https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/c5569f5f-52df-4310-9950-4d715bc799e0/content
- Zheng, Hedrick & Mittal 2013: doi:10.1371/journal.pone.0053060 (PMC3547021)
- Bode-Oke & Dong 2020: doi:10.1098/rsif.2020.0268 (PMC7328400)
- Johansson & Henningsson 2021: doi:10.1098/rsif.2020.0854 (PMC7879755)
- Henningsson & Johansson 2021: doi:10.1098/rsif.2021.0779 (PMC8633796)
- Srygley & Thomas 2002: doi:10.1038/nature01223
- Sunada et al. 1993: doi:10.1242/jeb.183.1.249
- Bimbard et al. 2013: doi:10.1242/jeb.084699
- Dudley 1991: doi:10.1242/jeb.159.1.335
- Fuchiwaki et al. 2013: doi:10.1007/s00348-012-1450-x
- Fuchiwaki & Tanaka 2013: doi:10.3811/jjmf.27.419
- Sridhar et al. 2021: doi:10.1088/1748-3190/abe108
- Sridhar 2021 PhD: https://louis.uah.edu/uah-dissertations/419
- Kang et al. 2023: PMC10452477
- Slegers et al. 2017: doi:10.1088/1748-3190/aa551d
- Pohly et al. 2022: https://pdfs.semanticscholar.org/41de/853fffd761ef04d893ed23a653d0f6e7f7a9.pdf
- Huang & Sun 2012: doi:10.1007/s10409-012-0209-1
- Suzuki et al. 2015: doi:10.1017/jfm.2015.57
- Suzuki, Aoki & Yoshino 2019: doi:10.1103/PhysRevE.100.013104
- Suzuki, Okada & Yoshino 2019: doi:10.1017/jfm.2019.597
- Suzuki et al. 2022: PMC8966778
- Fei & Yang 2015: doi:10.1103/PhysRevE.92.033004
- Fei & Yang 2016: doi:10.1103/PhysRevE.93.033124
- Lin et al. 2021: doi:10.1098/rsos.202172 (PMC8385355)
- Fang et al. 2023: PMC10807088
- Le Roy et al. 2021: doi:10.1126/science.abh2620 (preprint doi:10.1101/2021.03.22.436469)
- Ortega Ancel et al. 2017: PMC5206606
- Engels et al. 2016 (FluSI): arXiv:1506.06513

Methods and quasi-steady models:
- Simpson, Palacios & Murua 2013: doi:10.2514/1.J052136
- Lambert & Dimitriadis 2017: doi:10.2514/1.J055135
- Roccia et al. 2013: doi:10.2514/1.J052262
- Nguyen et al. 2016: doi:10.2514/1.C033456
- KAIST ICAS 2018-0260: https://www.icas.org/icas_archive/ICAS2018/data/papers/ICAS2018_0260_paper.pdf
- Ramesh et al. 2014: doi:10.1017/jfm.2014.297
- Hirato et al. 2021: doi:10.1017/jfm.2020.896
- Nabawy & Crowther 2017: doi:10.1098/rsif.2017.0159
- Nabawy & Crowther 2014: doi:10.1098/rsif.2013.1196 and doi:10.1098/rsif.2013.1197
- Usherwood & Ellington 2002: doi:10.1242/jeb.205.11.1547
- Sane & Dickinson 2002: doi:10.1242/jeb.205.8.1087
- Whitney & Wood 2010: doi:10.1017/S002211201000265X
- Lee et al. 2016: doi:10.1088/1748-3190/11/3/036005
- Nakata, Liu & Bomphrey 2015: doi:10.1017/jfm.2015.537
- Kamimizu et al. 2025: arXiv:2508.18703
- Lehmann, Sane & Dickinson 2005: doi:10.1242/jeb.01744

Code:
- https://github.com/camUrban/PteraSoftware
- https://github.com/ImperialCollegeLondon/sharpy
- https://github.com/ImperialCollegeLondon/UVLM
- https://github.com/byuflowlab/FLOWUnsteady
- https://public.gitlab.polimi.it/DAER/dust
- https://github.com/OpenVSP/OpenVSP
