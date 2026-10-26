# Butterfly morphology and kinematics: input data for the UVLM + multibody simulator

Compiled 2026-10-25. Scope: morphology and wing/body kinematics only (simulator inputs). Published forces, power and open-source solvers are covered in a separate note; force numbers appear here only where they define a kinematic condition.

---

## 1. Per-species tables

### 1.0 How to read the tables

Provenance tag in the "How" column:

| Tag | Meaning |
|---|---|
| FT | Read in the full text (article HTML/PDF, thesis, or supplementary PDF). |
| AB | Read in the abstract or repository record only. |
| FIG | Read off a published figure by me (precision roughly ±2–5 % of the axis range). |
| CODE | Read from a published data/code file (GitHub), quoted exactly. |
| DER | Derived by me; the formula or assumption is given in the row or in a note. |
| 2ND | Value as compiled or quoted by another paper; the original was not accessible. |

Angle definitions differ between papers. Section 2 gives each paper's convention; unless stated, angles are in degrees and t/T is the phase within one wingbeat.

**Source keys**

- **[FWUAV]** fdcl-gwu/FWUAV, GitHub, https://github.com/fdcl-gwu/FWUAV (MATLAB, T. Lee lab at GWU working with C.-K. Kang's lab at UAH). Files used: `matlab/morp_MONARCH.m` (monarch morphology, comment "polynomial fitting from Dr. Kang"); `matlab/modules/wing_kinematics.m`, `body_attitude.m`, `abdomen_attitude.m` (Fourier fits); `matlab/exp_data/load_VICON_data.m` and `fit_VICON_data.m` (fitting procedure, VICON at 200 Hz, "Trial_196"); `matlab/sim_QS_x.m` (β used with the fits); `doc/QS_model.tex` (write-up "Geometric Formulation for the Quasi-Steady Dynamics of a Flapping Wing UAV with Applications to Monarch Butterfly", the working draft behind Sridhar, Kang & Lee, AIAA 2020-1962). Older fits from an earlier dataset (`Time_history_data_for_Dr.Lee.xlsx`): `matlab/wing_kinematics.m` at commit 84a8aa2, `matlab/body_attitude.m` and `abdomen_attitude.m` at commit 51c9f6a, `matlab/exp_data/fig_exp_data.m` at commit f434827. The raw VICON and time-history files were never committed.
- **[TKL21]** Tejaswi K.C., Kang C.-K., Lee T. (2021) Dynamics and control of a flapping wing UAV with abdomen undulation inspired by monarch butterfly. American Control Conference. arXiv:2102.07851, https://arxiv.org/abs/2102.07851
- **[POH22]** Pohly J.A., Kang C.-K., Lee T., Aono H. (2022) Modeling freely flying monarch butterflies using a strongly coupled high fidelity numerical framework. WCCM-APCOM 2022, draft PDF: https://www.scipedia.com/wd/images/8/89/Draft_Content_449878940-1489_paper-6160-document.pdf
- **[KANG23]** Kang C.-K., Twigg R., Aono H., Lee T., Sridhar M. (2023) Power benefits of high-altitude flapping wing flight at the monarch butterfly scale. Biomimetics 8:352. https://pmc.ncbi.nlm.nih.gov/articles/PMC10452477/
- **[SRI21]** Sridhar M.K., Kang C.-K., Landrum D.B., Aono H., Mathis S.L., Lee T. (2021) Effects of flight altitude on the lift generation of monarch butterflies: from sea level to overwintering mountain. Bioinspir. Biomim. 16:034002. https://doi.org/10.1088/1748-3190/abe108
- **[KANG18]** Kang C.-K., Cranford J., Sridhar M.K., Kodali D., Landrum D.B., Slegers N. (2018) Experimental characterization of a butterfly in climbing flight. AIAA J. 56(1). https://doi.org/10.2514/1.J055360 (not accessible here)
- **[CRA15]** Cranford J.T. (2015) Novel experimental method for studying trajectories and wing kinematics of freely flying butterflies. MSc thesis, UAH. https://louis.uah.edu/uah-theses/698
- **[SLE17]** Slegers N., Heilman M., Cranford J., Lang A., Yoder J., Habegger M.L. (2017) Beneficial aerodynamic effect of wing scales on the climbing flight of butterflies. Bioinspir. Biomim. 12(1). https://doi.org/10.1088/1748-3190/aa551d
- **[BOD20]** Bode-Oke A.T., Dong H. (2020) The reverse flight of a monarch butterfly (*Danaus plexippus*) is characterized by a weight-supporting upstroke and postural changes. J. R. Soc. Interface 17:20200268. https://doi.org/10.1098/rsif.2020.0268 (PMC7328400)
- **[ORT17]** Ortega Ancel A., Eastwood R., Vogt D., Ithier C., Smith M., Wood R., Kovač M. (2017) Aerodynamic evaluation of wing shape and wing orientation in four butterfly species. Interface Focus 7:20160087. https://doi.org/10.1098/rsfs.2016.0087 (PMC5206606)
- **[ZHE13]** Zheng L., Hedrick T.L., Mittal R. (2013) Time-varying wing-twist improves aerodynamic efficiency of forward flight in butterflies. PLoS ONE 8:e53060. https://doi.org/10.1371/journal.pone.0053060
- **[LIN12]** Lin T., Zheng L., Hedrick T., Mittal R. (2012) The significance of moment-of-inertia variation in flight manoeuvres of butterflies. Bioinspir. Biomim. 7:044002. https://doi.org/10.1088/1748-3182/7/4/044002 (abstract only)
- **[SUZ22]** Suzuki K., Nakamura M., Kouji M., Yoshino M. (2022) Revisiting the flight dynamics of take-off of a butterfly: experiments and CFD simulations for a cabbage white butterfly. Biol. Open 11:bio059136. https://doi.org/10.1242/bio.059136 (PMC8966778)
- **[SUN93]** Sunada S., Kawachi K., Watanabe I., Azuma A. (1993) Performance of a butterfly in take-off flight. J. Exp. Biol. 183:249–277. https://doi.org/10.1242/jeb.183.1.249 (abstract only)
- **[KLE24]** Kleckova I., Linke D., De Moraes Rezende F., Rauscher L., Le Roy C., Matos-Maraví P. (2024) Flight behaviour diverges more between seasonal forms than between species in *Pieris* butterflies. Ecol. Evol. 14:e70012. https://doi.org/10.1002/ece3.70012 (PMC11255373)
- **[SCH26]** Butterfly clap-fling flight mechanisms observed by schlieren imaging for the design of bio-inspired micro air vehicles. Biomimetics 11:184 (2026). https://doi.org/10.3390/biomimetics11030184 (PMC13024673)
- **[LER22]** Le Roy C. et al. (2022) Divergence of climbing escape flight performance in *Morpho* butterflies living in different microhabitats. J. Exp. Biol. 225:jeb243867. https://doi.org/10.1242/jeb.243867 (PMC9440751)
- **[LER21]** Le Roy C., Amadori D., Charberet S., Windt J., Muijres F.T., Llaurens V., Debat V. (2021) Adaptive evolution of flight in *Morpho* butterflies. Science 374:1158–1162, https://doi.org/10.1126/science.abh2620 (paywalled); preprint https://doi.org/10.1101/2021.03.22.436469 (read); data https://doi.org/10.5061/dryad.cz8w9gj44
- **[SRY02]** Srygley R.B., Thomas A.L.R. (2002) Unconventional lift-generating mechanisms in free-flying butterflies. Nature 420:660–664. https://doi.org/10.1038/nature01223 (abstract only)
- **[BRA06]** Brattström O. (2006) Is there seasonal variation in size and mass of Red Admirals *Vanessa atalanta* on Capri, Italy? Ornis Svecica 16:69–73. https://journals.lub.lu.se/os/article/view/22722
- **[JOH21]** Johansson L.C., Henningsson P. (2021) Butterflies fly using efficient propulsive clap mechanism owing to flexible wings. J. R. Soc. Interface 18:20200854. https://doi.org/10.1098/rsif.2020.0854 (PMC7879755). Supplement with Table S1: https://rs.figshare.com/articles/journal_contribution/Supplemental_Figures_and_table_from_Butterflies_fly_using_efficient_propulsive_clap_mechanism_owing_to_flexible_wings/13585738
- **[SEN12b]** Senda K., Obara T., Kitamura M., Yokoyama N., Hirai N., Iima M. (2012) Effects of structural flexibility of wings in flapping flight of butterfly. Bioinspir. Biomim. 7:025002. https://doi.org/10.1088/1748-3182/7/2/025002 (full text via Kyoto University repository, hdl:2433/157349)
- **[SEN12r]** Senda K., Obara T., Kitamura M., Nishikata T., Hirai N., Iima M. (2012) Modeling and emergence of flapping flight of butterfly based on experimental measurements. Robot. Auton. Syst. 60:670–678. https://doi.org/10.1016/j.robot.2011.12.007 (full text via Kyoto repository, https://repository.kulib.kyoto-u.ac.jp/items/2e793f52-467c-4cf5-8dc6-47db55dc516b)
- **[YOK13]** Yokoyama N., Senda K., Iima M., Hirai N. (2013) Aerodynamic forces and vortical structures in flapping butterfly's forward flight. Phys. Fluids 25:021902. https://doi.org/10.1063/1.4790882 (full text via Kyoto repository, hdl:2433/172547)
- **[JAY18]** Jayakumar J., Senda K., Yokoyama N. (2018) Control of pitch attitude by abdomen during forward flight of two-dimensional butterfly. J. Aircraft 55(6):2327–2337 (not accessible; citation from [TKL21])
- **[FEI15]** Fei Y.-H.J., Yang J.-T. (2015) Enhanced thrust and speed revealed in the forward flight of a butterfly with transient body translation. Phys. Rev. E 92:033004. https://doi.org/10.1103/PhysRevE.92.033004 (abstract only)
- **[FEI16]** Fei Y.-H.J., Yang J.-T. (2016) Importance of body rotation during the flight of a butterfly. Phys. Rev. E 93:033124. https://doi.org/10.1103/PhysRevE.93.033124 (abstract only)
- **[LIN21]** Lin Y.-J., Chang S.-K., Lai Y.-H., Yang J.-T. (2021) Beneficial wake-capture effect for forward propulsion with a restrained wing-pitch motion of a butterfly. R. Soc. Open Sci. 8:202172. https://doi.org/10.1098/rsos.202172 (PMC8385355); data https://doi.org/10.5061/dryad.pzgmsbcjt
- **[LAN23]** Lan B., Lai Y.-H. (2023) Impact of butterfly wing-pitch interaction on flight performance. AMAM2023, pp. 81–82. https://doi.org/10.18910/92277
- **[CHA22]** Chang S.-K. (2022) Flight mechanisms of wing geometry, wing deformation and wing-body coupled motion in butterfly. PhD thesis, National Taiwan University. http://tdr.lib.ntu.edu.tw/jspui/handle/123456789/85056 (abstract only; PDF campus-restricted)
- **[DUD90]** Dudley R. (1990) Biomechanics of flight in neotropical butterflies: morphometrics and kinematics. J. Exp. Biol. 150:37–53. https://doi.org/10.1242/jeb.150.1.37 (abstract only)
- **[DUD91]** Dudley R. (1991) Biomechanics of flight in neotropical butterflies: aerodynamics and mechanical power requirements. J. Exp. Biol. 159:335. https://doi.org/10.1242/jeb.159.1.335 (abstract only)
- **[DS94]** Dudley R., Srygley R.B. (1994) Flight physiology of neotropical butterflies: allometry of airspeeds during natural free flight. J. Exp. Biol. 191:125. https://doi.org/10.1242/jeb.191.1.125 (abstract only)
- **[SD93]** Srygley R.B., Dudley R. (1993) Correlations of the position of center of body mass with butterfly escape tactics. J. Exp. Biol. 174:155. https://doi.org/10.1242/jeb.174.1.155 (abstract only)
- **[BW88]** Betts C.R., Wootton R.J. (1988) Wing shape and flight behaviour in butterflies (Lepidoptera: Papilionoidea and Hesperioidea): a preliminary analysis. J. Exp. Biol. 138:271–288. https://doi.org/10.1242/jeb.138.1.271 (abstract only)
- **[ELL84]** Ellington C.P. (1984) The aerodynamics of hovering insect flight. II. Morphological parameters. Phil. Trans. R. Soc. B 305:17–40. https://doi.org/10.1098/rstb.1984.0050 (abstract only)
- **[DH15]** Davis A.K., Holden M.T. (2015) Measuring intraspecific variation in flight-related morphology of monarch butterflies (*Danaus plexippus*): which sex has the best flying gear? J. Insects 2015:591705. https://doi.org/10.1155/2015/591705 (abstract only)
- **[HS12]** Huang H., Sun M. (2012) Forward flight of a model butterfly: simulation by equations of motion coupled with the Navier-Stokes equations. Acta Mech. Sin. 28:1590–1601. https://doi.org/10.1007/s10409-012-0209-1 (not accessible)

Several key full texts could not be opened from this machine: journals.biologists.com (JEB and Biology Open PDFs) sits behind a bot check, par.nsf.gov refused connections, and the UAH thesis PDFs, arc.aiaa.org, Hindawi/Wiley, MDPI, science.org and the JHU host of the [LIN12] preprint all returned HTTP 403. Section 4 lists what is missing as a result.

---

### 1.1 Monarch, *Danaus plexippus* (primary preset)

Three independent monarch sources carry most of the data:

1. **[FWUAV]**: one specimen's segment masses and planform (outline + inertia), plus Fourier fits to VICON motion capture of one live monarch in climbing flight. The fit gives wing flap, pitch and deviation, thorax pitch and abdomen angle. [POH22] used the same VICON experiment (nine climbing trajectories of one monarch; β = 25.4°, f = 10.2 Hz).
2. **[BOD20]**: one monarch (500 mg), with tabulated kinematics for 2 forward and 7 backward flight sequences.
3. **[KANG23]**: wing material properties and a 2D aeroelastic model built on [SRI21]'s free-flight measurements in a pressure chamber.

#### 1.1.a Masses

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Total mass | 500 mg (±1 mg) | one individual, forward/backward free flight | [BOD20] Table 1 | FT |
| Total mass | 0.5077 g | monarch of the earlier Kang-lab free-flight time-history dataset (5 cycles) | [FWUAV] `exp_data/fig_exp_data.m` @f434827: `m = 0.5077e-3` | CODE |
| Total mass | 0.3079 g | morphology specimen (sum of parts below) | [FWUAV] `morp_MONARCH.m` | CODE + DER (sum) |
| Weight used as lift target | 5 ± 0.1 mN (≈ 0.51 g) | "mean butterfly weight" of the free-flight experiments | [KANG23] | FT (g: DER, /9.81) |
| Head + thorax | 0.1485 g (1.485e-4 kg) | morphology specimen | [FWUAV] `m_B` | CODE |
| Abdomen | 0.1092 g (1.092e-4 kg) | morphology specimen | [FWUAV] `m_A` | CODE |
| One wing (fore + hind of one side) | 25.10 mg (2.510e-5 kg) | morphology specimen | [FWUAV] `m_R` | CODE |
| One forewing | 0.015 g | weighed before micro-CT | [KANG23] §3.1 | FT |
| Mass fractions | thorax 48.2 %, abdomen 35.5 %, wings 16.3 % (8.2 % per side) | morphology specimen | from [FWUAV] | DER |
| "body mass 0.22", "abdomen mass 25.39 deg", "right wing mass 3.535–3.725 mg" | printed this way; units are garbled in this draft (0.22 is probably g; the wing mass was a tuning variable chosen to match trajectories) | VICON monarch model inputs | [POH22] Table 1 | FT (unreliable) |
| Sex difference | females have 7 % lower wing loading than males; relative thorax size does not differ | 47 ♂, 45 ♀ reared monarchs; body parts weighed | [DH15] | AB (no numbers in abstract) |

#### 1.1.b Wing geometry

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Forewing length R_FW | 51 mm (±1 mm) | one wing | [BOD20] Table 1 | FT |
| Forewing area (one) | 800 mm² | | [BOD20] Table 1 | FT |
| Hindwing length | 35 mm | | [BOD20] Table 1 | FT |
| Hindwing area (one) | 753 mm² | | [BOD20] Table 1 | FT |
| Fore + hind area of one side (sum, overlap not removed) | 1553 mm² | | from [BOD20] | DER |
| Body length | 35 mm | | [BOD20] Table 1 | FT |
| Wing length l (fore + hind as one wing, root to tip) | 6.0997 cm | morphology specimen; 15 spanwise stations | [FWUAV] data table (§1.1.i); doc table l = 6.0996e-2 m | CODE |
| Area of one side (one-piece outline) | 12.751 cm² (6th-order polynomial fit); 12.69 cm² (trapezoid over the raw stations) | | [FWUAV] doc table S = 1.2751e-3 m² | CODE; trapezoid: DER |
| Mean chord c̄ | 2.0905 cm | | [FWUAV] | CODE |
| Aspect ratio | l²/S = 2.918 per wing; equivalent full-span b²/S_total = 5.84 with b = 2l | | [FWUAV] (per wing) | CODE; full span: DER |
| Maximum chord | 3.663 cm at r = 2.685 cm (44 % span) | | [FWUAV] data table | CODE |
| Non-dimensional radii of area moments | r̃1 = 0.4976, r̃2 = 0.5433, r̃3 = 0.5803 | | [FWUAV] doc table | CODE |
| Virtual-mass shape parameters (Ellington) | ṽ = 1.2496, r̃1(v) = 0.4875, r̃2(v) = 0.5165 | | [FWUAV] doc table | CODE |
| "Single wingspan" l | 5.2 cm | wing used to simulate the VICON monarch | [POH22] Table 1 | FT |
| "Single wing area" S | 15.2 cm² | same | [POH22] Table 1 | FT |
| Mean chord | 2.92 cm (S/l) | same | from [POH22] | DER |
| Average chord (fore + hind, overlapped) | printed as "c = 2.9 × 10⁻³ m" | monarch wing used for the frequency-ratio estimate | [KANG23] §4.1 | FT. Probably a typo for 2.9 × 10⁻² m: their Re = ρVc/μ = 2588 at 193 m needs V·c ≈ 0.039 m²/s, i.e. V ≈ 1.3 m/s if c = 2.9 cm but 13 m/s if c = 2.9 mm (DER) |
| Planform convention | S and c "measured for the forewings and hind wings in the overlapped configuration"; free-flying monarchs fly with overlapped wings | | [KANG23] | FT |
| Wingspan | "about 10 cm" | | [KANG23] Introduction | FT |
| Aspect ratio, maximum-span gliding configuration | 4.47 | wing outline scaled to 900 mm²; forewing rotated to maximise span | [ORT17] | FT |
| Forewing volume (micro-CT) | 4.82 × 10⁻⁸ m³ | | [KANG23] | FT |
| Wing density | 307 kg/m³ (= 0.015 g / 4.82e-8 m³) | forewing | [KANG23] | FT |
| Mean membrane + vein thickness near the root | 1.6 × 10⁻⁴ m | | [KANG23] §4.1 | FT |
| Elastic modulus | spanwise 2.5 GPa, chordwise 0.3 GPa | forewing; force–deflection tests plus FE model | [KANG23] | FT |
| Force–deflection | spanwise 4.0–11 mN for 3–6 mm (load at 0.7R); chordwise 0.81–1.6 mN (load at 0.7c) | n = 4–7 specimens per point | [KANG23] | FT |
| Flapping/chordwise-natural frequency ratio | f/f₁ = 0.33 | computed with c = "2.9 × 10⁻³" m, h = 0.16 mm, f = 10 Hz | [KANG23] | FT |
| Passive-pitch torsional spring | κ_T = 0.15 mN·m | model input for the VICON monarch | [POH22] Table 1 | FT |
| Wing loading | 1.18 N/m² (0.3079 g over 2 × 12.75 cm²); 1.58 N/m² (500 mg over 2 × 1553 mm²); 1.61 N/m² (0.50 g over 2 × 15.2 cm²) | | from [FWUAV], [BOD20], [POH22] | DER |

The [FWUAV] outline (l = 6.10 cm, c̄ = 2.09 cm) is longer and narrower than the planform [POH22] used for the same lab's VICON monarch (l = 5.2 cm, c̄ = 2.92 cm), which matches [BOD20]'s forewing length and fore + hind area. Treat the [FWUAV] outline as a shape template and rescale it (§3).

#### 1.1.c Inertia and layout

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Head + thorax as a cylinder | length h_B = 14.63 mm, diameter w_B = 5.680 mm | morphology specimen | [FWUAV] | CODE |
| Abdomen as a cylinder | length h_A = 17.38 mm, diameter w_A = 3.710 mm | | [FWUAV] | CODE |
| J_B about the thorax CoM | xx 5.9887e-10, yy = zz 2.9481e-9 kg·m² | uniform cylinder, m_B diag[w²/8, w²/16 + h²/12, same] | [FWUAV] doc table | CODE |
| J_A about the abdomen hinge | xx 1.8788e-10, yy = zz 1.1089e-8 kg·m² | uniform cylinder, m_A diag[w²/8, w²/16 + h²/3, same] | [FWUAV] doc table | CODE |
| J_R about the wing root, wing frame (x toward LE, y root→tip, z normal) | xx 2.7568e-8, yy 2.5799e-9, xy 2.4957e-9, zz 3.0148e-8 kg·m² | uniform areal density m_R/S over the outline; J_xx = ∫y²dm (flap axis), J_yy = ∫x²dm (span axis) | [FWUAV] doc table | CODE |
| Wing CoM in wing frame | ν_x = −4.4378 mm (behind the span axis), ν_y = 15.176 mm (0.249 l) | | [FWUAV] | CODE |
| Wing root position | μ_R = [0, ±w_B/2, 0] = ±2.84 mm lateral, at the thorax-CoM station | modelling assumption | [FWUAV] | CODE |
| Abdomen hinge | μ_A = [−h_B/2, 0, 0] = 7.3 mm behind the thorax CoM | modelling assumption | [FWUAV] | CODE |
| Whole-body CoM relative to the wing root | 6.4 mm aft (abdomen straight); 6.3 mm aft and 0.9 mm ventral at the mean abdomen angle 17.3° | morphology specimen, wings horizontal | from [FWUAV] | DER (point masses at segment CoMs) |
| Whole-body pitch inertia about the CoM | 2.6 × 10⁻⁸ kg·m² | same assumptions | from [FWUAV] | DER |
| Qualitative CoM position | distasteful butterflies (e.g. danaines) have the CoM further posterior than palatable ones, which have it near the wing base | neotropical species | [SD93] | AB |

#### 1.1.d Wingbeat: frequency, amplitude, stroke plane

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Flapping frequency | 10.2247 Hz (flap fit); other series fitted at 10.18–10.22 Hz | VICON climbing flight, one monarch | [FWUAV] | CODE |
| Flapping frequency | 10.2 Hz | same VICON monarch | [POH22] Table 1 | FT |
| Flapping frequency | 9.92 Hz (forward F1, F2); 7.41–13.6 Hz (all sequences, backward included) | | [BOD20] Table 4 | FT |
| Flapping frequency | "approximately 9 Hz" | | [BOD20] text | FT |
| Flapping frequency | 10 Hz (fixed); amplitude and frequency did not change significantly with altitude | reduced-density free-flight chamber [SRI21] | [KANG23], [SRI21] | FT, AB |
| Stroke amplitude Φ | 124.7° total; first harmonic ±60.1° | VICON fit | from [FWUAV] | DER |
| Stroke amplitude Φ | 103° (F1), 124° (F2); backward 115–148° | | [BOD20] Table 4 | FT |
| Stroke amplitude | "approx. 130°" (backward flights) | | [BOD20] text | FT |
| Plunge amplitude at r̃2 | ζ_a = 31 mm (= R r̃2 sin ψ_a, from the measured mean amplitude) | 2D model | [KANG23] | FT |
| Amplitude change without wing scales | −7 %; frequency unchanged | 236 climbing flights, 11 butterflies | [SLE17] | AB |
| Dorsal / ventral extremes | −65.4° (dorsal, t/T = 0.444) / +59.3° (ventral, t/T = 0.003), measured from the stroke-plane lateral axis s_y | VICON fit | from [FWUAV] | DER |
| Same extremes relative to the horizontal | wingtip 40.8° above / 38.2° below horizontal at mean posture | elevation = −asin(sin φ · cos(θ_B + β)) with θ_B = 18.6°, β = 25.4° | from [FWUAV] | DER |
| Angle between the wings at the dorsal extreme | 49° (= 180° − 2 × 65.4°): no full clap in this flight | | from [FWUAV] | DER |
| Stroke-plane angle β (FWUAV definition, §2.1) | 25.42° after removing a −7.77° yaw asymmetry (raw plane normal [−0.8948, −0.1222, 0.4294]) | VICON fit | [FWUAV] doc; `sim_QS_x.m` uses 25.4292° | FT/CODE |
| Stroke-plane inclination to the horizontal | ≈ 46° at mean body pitch (90° − 18.6° − 25.4°); 38–54° over the cycle | | from [FWUAV] | DER |
| Stroke plane relative to the body axis βb | F1 93° (DS) / 93° (US); F2 78° / 91°; backward 78–87° | | [BOD20] Table 4 | FT |
| Stroke plane relative to the horizontal βh | F1 69° (DS) / 61° (US); F2 38° / 30°; backward 0–35° | front end above horizontal | [BOD20] Table 4 | FT |
| Stroke plane in the 2D model (from vertical) | β = 29° at 193 m → 49° at 3000 m (equilibrium solutions); design range 0–60° | | [KANG23] | FT |
| Downstroke fraction of the cycle | 0.56 (φ̇ > 0) | VICON fit | from [FWUAV] | DER |
| US:DS duration ratio | 0.61 (F1), 0.74 (F2), i.e. downstroke fraction 0.62, 0.57; backward 0.82–1.45 | | [BOD20] Table 4 | FT (fractions DER) |

#### 1.1.e Wing rotation: deviation, feathering, twist

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Deviation ψ | mean −1.98°, one harmonic at 2f of amplitude 3.32°, range −5.3° to +1.35° (figure-eight; + = tip toward head) | VICON fit | from [FWUAV] | DER |
| Feathering/pitch θ (LE toward dorsal = +, 0 = chord along the stroke-plane normal) | range −42.7° to +31.2°, mean −6.0°; ≈ +27° to +31° through most of the upstroke, ≈ −33° to −37° through most of the downstroke | VICON fit | from [FWUAV] | DER |
| Rotation timing | θ crosses zero at t/T = 0.372 and 0.924, i.e. 0.072 T before the dorsal reversal and 0.079 T before the ventral reversal (advanced rotation, ≈ 26–28° of phase) | VICON fit | from [FWUAV] | DER |
| Pitch ψ (angle chord–mean stroke plane, [BOD20] definition) at 0.25R / 0.75R | F1: DS 81° / 76°, US 95° / 105°; F2: DS 78° / 67°, US 103° / 122° | | [BOD20] Table 4 | FT |
| Effective AoA at 0.25R / 0.75R | F1: DS 20° / 28°, US 22° / 30°; F2: DS 50° / 52°, US 37° / 37° | | [BOD20] Table 4 | FT |
| Spanwise twist (0.75R minus 0.25R) | F1: DS −5°, US +10°; F2: DS −11°, US +19° (the outer wing rotates further in the direction of each half-stroke) | | from [BOD20] | DER |
| Older dataset: θ | −43.4° to +34.6°, mean −12.4° (sign flipped from the source file, per the code comment) | Kang-lab time-history dataset | from [FWUAV] @84a8aa2 | DER |
| Older dataset: ψ | mean 11.8°, first-harmonic 16.6° at f, range −6.2° to +28.5°. Probably absorbs a stroke-plane tilt: no β was fitted for this dataset and the simulation of that time used β = 30° | | from [FWUAV] @84a8aa2 | DER |
| Wing pitch mechanism | most if not all wing pitch is attributed to passive flexibility | | [KANG23] | FT |

#### 1.1.f Body motion

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Thorax pitch θ_B (nose-up +, from horizontal) | 18.61° + 8.30° cos(ωt − 81.7°): range 10.3–26.9°, maximum at t/T = 0.227 (mid-upstroke), minimum at 0.727 (mid/late downstroke) | VICON fit | from [FWUAV] | DER. The code's `experimental` case uses A0 − 3° and amplitude × 1.3, which is model tuning, not data |
| Thorax pitch, older dataset | mean 19.77°, range 6.5–28.5°, 5 harmonics, maximum at t/T ≈ 0.20 | | from [FWUAV] @51c9f6a | DER |
| Body angle χ̄ (from horizontal) | F1 28° (DS 24°, US 32°); F2 50° (DS 40°, US 61°); backward 85–119° | | [BOD20] Table 3 | FT |
| Pitch change per half-stroke Δχ | F1: DS −5°, US +13°; F2: DS +11°, US +16° | | [BOD20] Table 3 | FT |
| Body-pitch frequency n_b | 9.91 Hz (F1, F2) | | [BOD20] Table 3 | FT |
| Phase of body angle relative to flap | φ_b,w = 36.1° (F1; χ leads φ) | | [BOD20] Table 3 | FT |
| Abdomen angle θ_A (relative to thorax, + = ventral/tail down) | 17.34° + 13.78° cos(ωt + 163.5°): range 3.6–31.1°; most ventral at t/T = 0.546 (0.10 T after the dorsal reversal), most dorsal at 0.046 | VICON fit | from [FWUAV] | DER |
| Abdomen angle, older dataset | 34.64° ± 21.1° (one harmonic), maximum at t/T = 0.595 | | from [FWUAV] @51c9f6a | DER |
| Mean abdominal angle θ̄t | 15° (F1), 14° (F2); backward 28–60° | | [BOD20] Table 3 | FT |
| Abdomen frequency and phase | n_t = 9.91 Hz; φ_t,w = 160.0° (F1), 195.2° (F2), where + means the flap angle leads θt | | [BOD20] Table 3 | FT |
| Abdomen–wing phase (qualitative) | the abdomen oscillates at the flapping frequency in opposite phase: it rotates downward during the upstroke | | [FWUAV] doc | FT |
| Absolute abdomen axis | depressed θ_B + θ_A ≈ 36° below horizontal on average | VICON fit | from [FWUAV] | DER |
| Vertical body oscillation | not quantified in the accessible sources ("climbing trajectory with oscillation"; "undulating motion about a mean trajectory") | | [FWUAV] doc; [TKL21] refs | — |

#### 1.1.g Flight condition

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Body speed | 1.75 m/s (F1), 0.91 m/s (F2); backward 0.42–0.83 m/s | | [BOD20] Table 4 | FT |
| Forward speed | "approx. 1–2 m s⁻¹" | | [BOD20] text | FT |
| Initial velocity of the VICON-monarch simulation | (1.3, 0.0, −0.562) m/s in a NED frame, i.e. 1.42 m/s at a 23° climb, chosen to reproduce the experiments | | [POH22] | FT (speed and angle DER) |
| Speed at 3000 m density | V_exp = 0.8 m/s (model 0.6 m/s); speed fell significantly with altitude | | [KANG23], [SRI21] | FT |
| Flight-mill speed | 0.39–2.36 m/s, mean 1.08 m/s | tethered | [ORT17] citing its ref. 30 | 2ND |
| Field speeds by car chase | 4.9–11.2 m/s ("cannot provide very exact airspeeds") | | [ORT17] citing its ref. 29 | 2ND |
| Natural airspeed of related danaines | *D. eresimus* 3.9 m/s, *D. gilippus* 3.6 m/s | motorboat + anemometer | [ORT17] citing [DS94] | 2ND |
| Advance ratio J = U/(2Φ f R) | 0.90 (F1), 0.42 (F2); backward −0.27 to −0.40 | R = forewing length | [BOD20] Table 4 | FT |
| Reynolds number Re = U R/ν | "ranged between 1700 and 3300" (backward); F1 ≈ 5950, F2 ≈ 3090 with ν = 1.5e-5 m²/s | R = forewing length | [BOD20]; F1/F2 DER | FT / DER |
| Reynolds number Re = ρVc/μ | 2588 at 193 m, 850 at 3000 m | | [KANG23] | FT |
| Air density | 1.2 kg/m³ (193 m) to 0.91 kg/m³ (3000 m) | | [KANG23] | FT |
| Climbing-flight dataset behind [KANG18] | 2000 flights of 86 butterflies recorded; 75 climbing flights from 9 butterflies analysed for climb rate, flap and body-undulation frequency and amplitude, their phase difference, Re, St and reduced frequency | 5.7 × 9.1 × 3.0 m capture volume | [CRA15] | AB (values not accessible) |

#### 1.1.h Fourier series (monarch, VICON climbing flight)

Source: [FWUAV] `matlab/modules/wing_kinematics.m`, `body_attitude.m`, `abdomen_attitude.m` (CODE). Fitted with MATLAB `fourier5` / `fourier1` to the average of the left and right wings, after fitting a stroke plane and removing a 7.77° yaw asymmetry. Each series is

`a(t) = A0 + Σ_q [ AN_q cos(2π q f t) + BN_q sin(2π q f t) ]` (degrees).

The code evaluates every series at the same simulation frequency (ψ at twice it), so the relative phases below hold with t = 0 at the start of the record. Angle definitions are in §2.1.

```text
phi (flap; + = ventral), fitted f = 10.2247 Hz
  A0 = -0.83724
  AN = [59.7558745992612, -0.137466978762473, 0.137978226025185, 0.433746159939459, -0.074830919096204]
  BN = [-6.55441083419535, 6.435543953825, -2.05072909120033, 0.221239708063663, 0.0575790280561444]
theta (wing pitch; + = LE toward dorsal), fitted f = 10.1838 Hz
  A0 = -5.9583
  AN = [24.0863053541935, -4.46860932682531, 8.04218451917262, -0.601926108817941, -0.642171907559121]
  BN = [30.5848624271628, 4.64142325712464, -3.83504323967398, 2.01570854870463, -1.70930433046515]
psi (deviation; + = tip toward head), one harmonic, fitted f = 20.2767 Hz (evaluated at 2 x flapping f)
  A0 = -1.9753,  AN = -2.063160749463,  BN = -2.60158935092774
theta_B (thorax pitch; + = nose up, from horizontal), fitted f = 10.2213 Hz
  A0 = 18.6094,  AN = 1.1952126587572,  BN = 8.21314837914776
theta_A (abdomen relative to thorax; + = ventral), fitted f = 10.1756 Hz
  A0 = 17.3417,  AN = -13.2134053462198,  BN = -3.91351009294982
```

Amplitude–phase form (DER, ω = 2πf, ψ term at 2ω):

```text
phi     = -0.84 + 60.11cos(wt + 6.3) + 6.44cos(2wt - 91.2) + 2.06cos(3wt + 86.2) + 0.49cos(4wt - 27.0) + 0.09cos(5wt - 142.4)
theta   = -5.96 + 38.93cos(wt - 51.8) + 6.44cos(2wt - 133.9) + 8.91cos(3wt + 25.5) + 2.10cos(4wt - 106.6) + 1.83cos(5wt + 110.6)
psi     = -1.98 + 3.32cos(2wt + 128.4)
theta_B = 18.61 + 8.30cos(wt - 81.7)
theta_A = 17.34 + 13.78cos(wt + 163.5)
```

Sampled values (DER, evaluated from the coefficients above):

| t/T | φ | θ | ψ | θ_B | θ_A |
|---|---|---|---|---|---|
| 0.00 | 59.28 | 20.46 | −4.04 | 19.80 | 4.13 |
| 0.05 | 56.46 | 27.16 | −5.17 | 22.28 | 3.57 |
| 0.10 | 47.59 | 30.72 | −5.09 | 24.40 | 4.35 |
| 0.15 | 33.84 | 30.92 | −3.81 | 25.96 | 6.41 |
| 0.20 | 16.23 | 29.92 | −1.84 | 26.79 | 9.54 |
| 0.25 | −4.71 | 30.62 | 0.09 | 26.82 | 13.43 |
| 0.30 | −27.47 | 27.71 | 1.22 | 26.05 | 17.70 |
| 0.35 | −48.12 | 11.44 | 1.14 | 24.55 | 21.94 |
| 0.40 | −61.66 | −15.76 | −0.14 | 22.47 | 25.73 |
| 0.45 | −65.35 | −37.40 | −2.12 | 20.01 | 28.70 |
| 0.50 | −60.36 | −42.52 | −4.04 | 17.41 | 30.56 |
| 0.55 | −50.11 | −37.39 | −5.17 | 14.93 | 31.12 |
| 0.60 | −37.55 | −33.23 | −5.09 | 12.81 | 30.33 |
| 0.65 | −24.15 | −32.64 | −3.81 | 11.26 | 28.27 |
| 0.70 | −10.27 | −33.35 | −1.84 | 10.43 | 25.15 |
| 0.75 | 4.18 | −34.80 | 0.09 | 10.40 | 21.26 |
| 0.80 | 19.14 | −34.39 | 1.22 | 11.17 | 16.98 |
| 0.85 | 33.85 | −26.08 | 1.14 | 12.67 | 12.74 |
| 0.90 | 46.70 | −9.14 | −0.14 | 14.75 | 8.95 |
| 0.95 | 55.73 | 8.59 | −2.12 | 17.21 | 5.98 |

Shape summary (DER): the upstroke runs from t/T ≈ 0 to 0.44 and the downstroke from 0.44 to 1.0. The wing pitches LE-up (θ ≈ +30°) for most of the upstroke and LE-down (θ ≈ −34°) for most of the downstroke, flipping just before each reversal. The thorax pitches up during the upstroke and down during the downstroke. The abdomen swings ventrally during the upstroke, lagging the wing.

**Earlier monarch dataset** ([FWUAV] `wing_kinematics.m` @84a8aa2 and `body_attitude.m`/`abdomen_attitude.m` @51c9f6a; monarch m = 0.5077 g; 5 cycles; CODE). These are the same series form in degrees. θ was sign-flipped on import (code comment: "the convention of the wing pitch angle is opposite"). The fitted frequency of the wing series is not stored; the plotting script uses f = 10.1 Hz.

```text
phi:      A0 = -1.0753;  AN = [57.7197 4.1946 -1.2126 0.7185 -0.1899];  BN = [-8.0267 9.8466 -3.3232 -0.7831 0.2093]
theta:    A0 = -12.4021; AN = [22.1344 -5.9493 1.7797 1.9392 -0.8983];  BN = [29.7924 7.9076 -8.2981 2.3268 -0.2061]
psi:      A0 = 11.7597;  AN = [16.4326 -3.2083 -1.2771 0.1997 -0.1899]; BN = [-2.1653 -2.0058 -0.7918 0.0527 0.1601]   (at f, not 2f)
theta_th: f = 10.2468 Hz; A0 = 19.7703; AN = [0.7632 2.1236 -0.1915 -0.3702 -0.1729]; BN = [9.3219 0.4207 -0.9178 -0.7781 0.3443]
theta_ab: f = 10.3241 Hz; A0 = 34.6367; AN = -17.5158; BN = -11.8311
```

Derived extremes of the earlier fit: φ from −64.7° (t/T 0.41) to +60.2° (0.999), so Φ = 124.8° and the downstroke fraction is 0.59. θ crosses zero at t/T = 0.337 and 0.967.

**Model-optimized hover (not measured)**. [TKL21] Table I gives optimized parameters for a monarch-mass model, with abdomen / without abdomen undulation (FT). The waveform is φ = (φm/asin φK)·asin(φK cos 2πft) + φ0, θ = (θm/tanh θC)·tanh(θC sin(2πft + θa)) + θ0, ψ = ψm cos(2πψN f t + ψa) + ψ0, θ_B = θBm cos(2πft + θBa) + θB0, θ_A = θAm cos(2πft + θAa) + θA0.

| Param | With abdomen | Without |
|---|---|---|
| f (Hz) | 11.6689 | 11.7539 |
| β (rad) | 0.7782 | 0.9396 |
| φm, φK, φ0 | 0.6355, 0.2866, −0.6599 | 0.6449, 0.2618, −0.6635 |
| θm, θC, θ0, θa | 0.6893, 2.1703, 0.0098, −0.1410 | 0.6977, 2.3602, 0.0034, −0.1737 |
| ψm, ψN, ψ0, ψa | 0.0196, 2, −0.0003, 0.2506 | 0.0057, 2, 0.0033, 0.3517 |
| θBm, θB0, θBa | 0.0348, 0.8602, −2.5204 | 0.0014, 0.7202, −0.3049 |
| θAm, θA0, θAa | 0.1970, 0.4696, 1.4270 | —, −0.1712, — |

The same paper fitted the abdomen-joint torque of the undulating hover with a spring–damper τ_A = −kθ_A − cθ̇_A + τ0: k = 9.4262e-5 N·m/rad, c = 7.6634e-7 N·m·s/rad, τ0 = 4.1641e-5 N·m (FT). It also reports a natural flapping frequency of 10.2247 Hz "constructed from the morphological parameters of Monarch".

#### 1.1.i Planform outline data (monarch)

[FWUAV] `morp_MONARCH.m`, array `DATA` (CODE; units cm). The fore and hind wings are combined into one wing of one side. r is the spanwise distance from the root; x_LE and x_TE are the chordwise positions of the leading and trailing edge relative to the span axis (positive toward the LE); chord = x_LE − x_TE. The code fits sixth-order polynomials to chord, x_LE and x_TE versus r and integrates them for S, the area moments and J_R. The outline is open at the tip (chord 0.33 cm at r = l), so close it by joining the last LE and TE points.

| r | chord | x_LE | x_TE |
|---|---|---|---|
| 0 | 0.172 | 0.0329 | −0.1391 |
| 0.4475 | 0.6961 | 0.2329 | −0.4632 |
| 0.895 | 1.326 | 0.3974 | −0.9286 |
| 1.3425 | 1.9723 | 0.5329 | −1.4394 |
| 1.79 | 2.6186 | 0.6595 | −1.9591 |
| 2.2375 | 3.2319 | 0.765 | −2.4669 |
| 2.685 | 3.6628 | 0.8822 | −2.7806 |
| 3.1325 | 3.5136 | 0.9702 | −2.5434 |
| 3.58 | 3.149 | 1.0346 | −2.1144 |
| 4.0275 | 2.6849 | 1.0727 | −1.6122 |
| 4.475 | 1.8895 | 1.0815 | −0.808 |
| 4.9225 | 1.5414 | 1.0845 | −0.4569 |
| 5.37 | 1.2762 | 1.0933 | −0.1829 |
| 5.8175 | 0.746 | 0.9614 | 0.2154 |
| 6.0997 | 0.3319 | 0.7621 | 0.4302 |

Other outlines:

- The repository also holds `matlab/STLRead/Monarch_Butterfly_D_.stl` and `Monarch_reduced_5.stl`, apparently a 3D visual model of unstated provenance. Use them for rendering only.
- [ORT17] digitised the monarch outline in museum and maximum-span orientations, shown in its figures only.

---

### 1.2 Painted lady, *Vanessa cardui*

Main source: [ZHE13], one straight-and-level free flight selected from about 100 recordings. The wing surface was reconstructed from 35 points at 9 instants per cycle with three cameras at 2000 Hz.

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Body mass | 0.29 g | | [ZHE13] Table 1 | FT |
| Wing length R | 3.01 cm (Table 1); "R = 3.0 cm" for the analysed animal | | [ZHE13] | FT |
| Total wing area (4 wings) | 11.4 cm² | | [ZHE13] Table 1 | FT |
| Aspect ratio 4R²/S | 3.18 | | [ZHE13] Table 1 | FT |
| Wing loading | 0.0254 g/cm² (≈ 2.49 N/m²) | | [ZHE13] Table 1 | FT (N/m²: DER) |
| Mean chord | 1.9 cm | | [ZHE13] | FT |
| Body-segment masses and inertia | measured on sacrificed specimens and used for CoM tracking (abdomen, head + thorax, fore and hind wings) | values are in [LIN12], not accessed | [ZHE13] | FT (method only) |
| Moment-of-inertia variation | changes in MOI during flight are large enough to influence manoeuvres, although wing mass is small relative to body mass | | [LIN12] | AB |
| Flapping frequency | 22.2 Hz (analysed animal); cameras set for ≈ 20 Hz | | [ZHE13] | FT |
| Stroke amplitude Φ | 120° (angle between root–tip lines at the top and bottom of the stroke) | | [ZHE13] | FT |
| Stroke-plane angle | 78.5° (X-axis vs. the XZ-projection of the line joining tip positions at top and bottom); [BOD20] lists this as βh ≈ 79°, βb ≈ 85° | | [ZHE13]; [BOD20] Table 6 | FT; 2ND |
| Downstroke / upstroke split | DS→US transition at t/T ≈ 0.57 (Fig. 3); US:DS = 0.77 per [BOD20] Table 6 | | [ZHE13] Fig. 3; [BOD20] | FIG; 2ND |
| Body pitch | 6.1° (set constant in the CFD "in accordance with our measurements"); its SD is about 29 % of the mean | | [ZHE13] | FT |
| Forward speed | 1.14 m/s (wingbeat mean; SD ≈ 4 % of the mean) | | [ZHE13] | FT |
| Mean wingtip speed 2ΦfR | 2.79 m/s | | [ZHE13] | FT |
| Advance ratio | 0.41 (= 1.14/2.79); [BOD20] lists 0.4 | | from [ZHE13] | DER |
| Reynolds number 2ΦfRc̄/ν | 3455 | | [ZHE13] | FT |
| Maximum twist | "nearly 40 degrees", at t' = 0.33 (mid-downstroke) and t' = 0.80 (mid-upstroke) | | [ZHE13] | FT |
| Camber | up to 15 % of chord in the downstroke, 7 % in the upstroke | | [ZHE13] | FT |
| AoI vs. span, t' = 0.33 | ≈ 18° at the root falling to ≈ −12° at the tip | | [ZHE13] Fig. 3B | FIG |
| AoI vs. span, t' = 0.80 | ≈ 34° at the root rising to ≈ 65° at the tip | | [ZHE13] Fig. 3B | FIG |
| AoI vs. span, other phases | t' = 0.07: ≈ 8° → ≈ −12°; t' = 0.20: ≈ 1° → ≈ −5°; t' = 0.47: ≈ 32° → ≈ 16°; t' = 0.60: ≈ 25° → ≈ 33°; t' = 0.93: ≈ 22° → ≈ 30° (root → tip) | | [ZHE13] Fig. 3B | FIG |
| Mean AoI vs. time | ≈ 10° at t' = 0, minimum ≈ −5° at t' ≈ 0.1, ≈ 27° by t' = 0.5, shoulder at the reversal (0.57), peak ≈ 46° at t' ≈ 0.78, back to ≈ 10° at t' = 1. The spanwise band spans ≈ −12° to ≈ +64° | | [ZHE13] Fig. 3C | FIG |
| AoI summary | small in the downstroke (wing mostly horizontal), above 60° in the upstroke; spanwise AoI variation up to about 40° | | [ZHE13] | FT |
| Local camber vs. time | mean rises to ≈ 4 % at t' ≈ 0.15, peaks ≈ 11.5 % at t' ≈ 0.43, crosses zero at t' ≈ 0.6, ≈ −3.5 % through the upstroke | | [ZHE13] Fig. 3A | FIG |
| Geometry model | body laser-scanned at 0.05 in resolution; zero-thickness wing membrane with 6232 triangles and 3118 vertices, built from photographs | | [ZHE13] | FT |

No Fourier coefficients are published; the deforming wing is given only at 9 instants per cycle, spline-interpolated in time.

---

### 1.3 Small/cabbage white, *Pieris rapae* (with *P. melete* and *P. napi*)

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Total mass | 5.82 × 10⁻⁵ kg | one *P. rapae* individual, take-off | [SUZ22] Table 2 (image) | FT |
| Thorax mass | 2.04 × 10⁻⁵ kg | | [SUZ22] Table 2 | FT |
| Abdomen mass | 2.97 × 10⁻⁵ kg | | [SUZ22] Table 2 | FT |
| Wing mass (all four wings) | 0.81 × 10⁻⁵ kg; wing-mass ratio 0.14 | parts sum to M | [SUZ22] Table 2 | FT |
| Wing length L | 21.0 mm | | [SUZ22] Table 2 | FT |
| Wing area (one side) | 4.1 × 10⁻⁴ m² | | [SUZ22] Table 2 | FT |
| Mean chord; aspect ratio b²/S_total | 19.5 mm; 2.15 (b = 2L) | | from [SUZ22] | DER |
| Wing loading | 0.70 N/m² | | from [SUZ22] | DER |
| Thorax length × width | 4.2 mm × 3.0 mm | ellipsoid in the model | [SUZ22] Table 2 | FT |
| Abdomen length × width | 11.0 mm × 3.0 mm | ellipsoid | [SUZ22] Table 2 | FT |
| CoM | at the thorax–abdomen joint (monitor point B), following Sunada et al. for *P. melete* | | [SUZ22] | FT |
| Wing mass distribution | the wing-root mass was about 40 % heavier than the wing-tip mass, so areal density is not uniform | | [SUZ22] | FT |
| Flapping period | T = 0.090 s (f = 11.1 Hz) | take-off | [SUZ22] Table 2 | FT (f DER) |
| Time-averaged wingtip speed u0 | 1.53 m/s | take-off | [SUZ22] Table 2 | FT |
| Implied stroke amplitude | ≈ 188° (angle swept per half-stroke) if u0 = 2ΦL/T, i.e. near-180° take-off strokes; the paper's definition of u0 was not visible to me | | from [SUZ22] | DER (uncertain) |
| Re (u0 L/ν), Froude number, N_m | 2060; Fr = 3.37; non-dimensional mass 5.33 | | [SUZ22] Table 2 | FT |
| Phase relations | body pitch is lowest near mid-downstroke and highest near mid-upstroke; the abdominal angle (dorsal +) is lowest near the start and highest near the end of the downstroke; lags of about π/2 (pitch) and π (abdomen) relative to flapping | 8 take-offs recorded, 1 analysed | [SUZ22] | FT |
| Take-off detail | legs leave the stand at t/T = 0.3 | | [SUZ22] | FT |
| Forewing area | *P. rapae* males 242 mm² (SE 9.54, N = 12), females 243 mm² (SE 22.4, N = 2); *P. napi* males 248 mm², females 212 mm² | outdoor-cage animals | [KLE24] Table 1 | FT |
| "Aspect ratio" (forewing length / width) | 1.74–1.80 | not the aerodynamic AR | [KLE24] Table 1 | FT |
| Free-flight speed (both species pooled) | 1.2 ± 0.124 m/s (spring form, 26 tracks), 1.7 ± 0.118 m/s (summer form, 80 tracks) | estimated marginal means ± SE | [KLE24] Table 2 | FT |
| Flapping frequency | ≈ 12 Hz, from their "advance ratio" defined as velocity/frequency (0.10 m and 0.14 m per beat) | | from [KLE24] | DER |
| Flapping frequency | 13–16 Hz across sequences; 13.3 ± 0.2 Hz in a 1.24 m/s vertical ascent (St 0.18) | one *Iphiclides podalirius* and one *P. rapae*; the per-sequence species is not clear in the paper | [SCH26] Table | FT (weak) |
| *P. melete* take-off (Sunada) | the downstroke makes mainly vertical force and the upstroke mainly horizontal force; the change is controlled by the stroke-plane inclination, which is the thoracic angle; abdominal motion and wing forces create the moment that changes it | four-link model | [SUN93] | AB |
| *P. brassicae* | uses a vertical stroke plane in take-off and hovering, with the thorax horizontal in the downstroke and vertical in the upstroke | | [BOD20] citing Ellington | 2ND |

---

### 1.4 *Morpho* (*M. peleides* not found; data for related species)

*M. peleides* is often treated as a subspecies of *M. helenor*, which appears in [LER21]'s field data; [LER21] notes that *M. helenor* and *M. achilles* "cannot be distinguished during flight". No *M. peleides*-specific kinematics were accessible ([HS12] and a 2006 Chinese paper by Huang & Sun on *M. peleides* were not reachable).

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Sample | 26 butterflies: 10 of 2 canopy species (*M. cisseis*, *M. theseus*), 16 of 5 understory species; 72 climbing flights, 183 wingbeats | outdoor insectary, Peru; GoPro at 240 fps | [LER22] | FT |
| Total wing area | canopy 100.42 ± 19.27 cm², understory 79.28 ± 21.15 cm² | detached wings photographed | [LER22] | FT |
| Weight-normalised wing area S/mg | canopy 2.24 ± 0.51, understory 1.74 ± 0.88 (m²/N; inverse of wing loading) | | [LER22] | FT |
| Body mass | ≈ 0.46 g (ratio of the means above, both groups) | | from [LER22] | DER (rough) |
| Wing loading | ≈ 0.45 (canopy) and 0.57 (understory) N/m² | | from [LER22] | DER |
| Forewing stroke amplitude A_φ | canopy 114 ± 19°, understory 128 ± 26° (difference not significant) | climbing; 12 digitised wingbeats | [LER22] | FT |
| Hindwing deviation θ | canopy −56 ± 4°, understory −48 ± 3° | stroke plane normal to the body axis | [LER22] | FT |
| Body pitch during the wingbeat | canopy 67 ± 9°, understory 44 ± 10° | climbing | [LER22] | FT |
| Climb angle | canopy 46.7 ± 17°, understory 36.5 ± 16° | | [LER22] | FT |
| Climb speed U_total | canopy 1.56 ± 0.56 m/s, understory 1.32 ± 0.49 m/s; vertical 1.07 ± 0.46 vs 0.72 ± 0.35 m/s | | [LER22] | FT |
| Flapping frequency | one *M. cisseis* wingbeat lasted 0.26 s (≈ 3.8 Hz); canopy species beat more slowly than understory species (values only in figures) | | [LER22] | FT (Hz: DER) |
| Wing outline model | 41 2D points per forewing and hindwing (hinge and tip known), rigid flat plates | | [LER22] | FT (coordinates not printed) |
| CFD model | hinge-to-tip wing length 0.085 m; mean chord *M. cisseis* 4.82 cm, *M. deidamia* 3.91 cm, *M. rhetenor* 3.88 cm; Re ≈ 5200; freestream 1.59, 1.97, 1.98 m/s | gliding | [LER21] preprint | FT |
| Natural-flight glide and ascent angles | glide 7 ± 2° (canopy, n = 61) vs 11 ± 1° (understory, n = 135); flapping-phase ascent 22 ± 3° vs 13 ± 1° | 80 wild males, 136 sequences, 120 fps | [LER21] preprint | FT |
| Gliding fraction | *M. cisseis* and *M. telemachus* glide about half the time | | [LER21] preprint | FT |

---

### 1.5 Red admiral, *Vanessa atalanta*

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Hindwing length | 23.79 ± 1.04 mm (spring), 25.71 ± 1.31 mm (autumn) | Capri, wild-caught; dry masses of thorax and abdomen only in figures | [BRA06] | FT |
| Flight mechanisms | trained to fly freely to and from artificial flowers in a wind tunnel; smoke-wire visualisation showed wake capture, two LEV types, active and inactive upstrokes, rotational mechanisms and clap-and-fling, often switching from stroke to stroke | | [SRY02] | AB (no numbers) |

No kinematic or segment-mass data were found. [BW88] filmed six British species, but the species list and tables could not be read. The painted lady (same genus, §1.2) is the closest available proxy.

---

### 1.6 Silver-washed fritillary, *Argynnis paphia*

| Ind. | Sex | Mass (mg) | Weight (mN) | Span (mm) | Area (mm²) | AR | Wing loading (kg/m²) | Wing loading (N/m²) |
|---|---|---|---|---|---|---|---|---|
| 1 | ♂ | 185.5 | 1.82 | 67 | 1353 | 3.3 | 0.137 | 1.34 |
| 2 | ♂ | 210.5 | 2.06 | 72 | 1614 | 3.2 | 0.130 | 1.28 |
| 3 | ♀ | 198.9 | 1.95 | 67 | 1310 | 3.4 | 0.152 | 1.49 |
| 4 | ♀ | 227.3 | 2.23 | 72 | 1584 | 3.3 | 0.143 | 1.41 |
| 5 | ♀ | 187.1 | 1.83 | 66 | 1320 | 3.3 | 0.142 | 1.39 |
| 6 | ♂ | 208.6 | 2.05 | 68 | 1344 | 3.4 | 0.155 | 1.52 |
| mean ± SD (DER) | | 203.0 ± 15.8 | | 68.7 ± 2.7 | 1421 ± 139 | 3.32 ± 0.08 | | 1.41 ± 0.09 |

Source: [JOH21] supplementary Table S1 (FT). AR = span²/area, so the area is that of all four wings.

| Quantity | Value | Source | How |
|---|---|---|---|
| Conditions | wind tunnel at ≈ 2 m/s; take-offs from a 10 mm feeder aligned with the flow, usually while turning; 25 sequences of 1–3 wingbeats from 6 individuals | [JOH21] | FT |
| Kinematics capture | two cameras at 640 Hz, 1024 × 1024 px; 5 digitised points (head, both forewing tips, both forewing tornus points) | [JOH21] + Fig. S2 | FT |
| Clap | wings clap together, or close to each other, at the end of the upstroke. The forewings clap before the hind wings and then peel apart at the start of the downstroke. The clap is "cupped": the leading edges meet before the central wing areas, and the wings show reversed camber at contact | [JOH21] | FT |
| Body pitch | pitches down during the downstroke and up during the upstroke | [JOH21] | FT |
| Upstroke function | upstroke thrust impulse ≈ 11 % of the downstroke vertical impulse; the upstroke contributed weight support in only 1 of 24 sequences | [JOH21] | FT |
| Frequency, amplitude, angles | not given in the text; only definitions (stroke plane by PCA of the forewing tips relative to the head, amplitude from the start and end of the upstroke) | [JOH21] | FT |

---

### 1.7 Chestnut tiger, *Parantica sita* (Kyoto group)

| Quantity | [SEN12b] Table 1 (*P. sita niphonica*) | [YOK13] Table I, individual A (tethered) | [YOK13] Table I, individual B (free flight) |
|---|---|---|---|
| Total mass (kg) | 0.238 × 10⁻³ | 3.38 × 10⁻⁴ | 3.36 × 10⁻⁴ |
| Thorax mass (kg) | 0.095 × 10⁻³ | 1.20 × 10⁻⁴ | 8.28 × 10⁻⁵ |
| Thorax length × width (m) | 15 × 10⁻³ × 8 × 10⁻³ | 1.24 × 10⁻² × 5.40 × 10⁻³ | 1.05 × 10⁻² × 5.50 × 10⁻³ |
| Abdomen mass (kg) | 0.105 × 10⁻³ | 1.68 × 10⁻⁴ | 2.11 × 10⁻⁴ |
| Abdomen length × width (m) | 20 × 10⁻³ × 5 × 10⁻³ (header gives 2l_Ba but w_Ba, so 5 mm may be a half-width) | 2.14 × 10⁻² × 5.70 × 10⁻³ | 2.10 × 10⁻² × 4.55 × 10⁻³ |
| Wing mass, one side (kg) | 0.019 × 10⁻³ | 2.52 × 10⁻⁵ | 2.10 × 10⁻⁵ |
| Wing-tip length y_tip (m) | 0.049 | 5.47 × 10⁻² | 5.03 × 10⁻² |
| Wing area, one side (m²) | 0.118 × 10⁻² | 1.47 × 10⁻³ | 1.24 × 10⁻³ |
| Wing loading mg/(2S_w) (N/m²) | 0.988 | 1.13 | 1.32 |
| Aspect ratio | 4.068 | 4.07 (DER) | 4.08 (DER) |
| Mean chord S_w/y_tip (mm, DER) | 24.1 | 26.9 | 24.7 |
| Mass fractions thorax / abdomen / wings (DER) | 39.9 / 44.1 / 16.0 % | 35.5 / 49.7 / 14.9 % | 24.6 / 62.8 / 12.5 % |

All FT except where marked. [SEN12r] gives the animal as "0.24 g weight" with a "half wing span" of 50 mm. In [YOK13], thoracic and wing masses were estimated from size regressions on dissected animals and the abdomen was taken as the remainder. Abdominal mass "largely vary half to twice as large as the mean" during experiments.

| Quantity | Value | Condition | Source | How |
|---|---|---|---|---|
| Body model | four rigid bodies: spheroidal thorax and abdomen, two thin flat one-piece wings (fore + hind), with the outline a "polynomial approximation of the average shape of the wings of living butterflies" (coefficients not printed) | | [YOK13] | FT |
| Tethered, [SEN12b] | mainstream 1.54 m/s, θt = 28.1°, period 0.096 s. β is cosine-like, maximum 60°, minimum −20° (+ = dorsal). θa is sinusoidal and out of phase with β. η oscillates at twice the frequency of β. Feathering θ varies 30° (−10° to +20°). Stroke reversal at t = 0.055 s | | [SEN12b] | FT |
| Tethered, [SEN12r] | mainstream 1.64 m/s, θt = −1°, period 0.136 s; β maximum 81°, minimum −45°, the left and right wings overlap fully at the maximum; feathering about ±30° | | [SEN12r] | FT |
| Amplitude variation | when the butterfly changes amplitude it mainly changes the β minimum, the maximum only marginally; tethered animals swing the abdomen more than free fliers | | [SEN12b], [SEN12r] | FT |
| Tethered, [YOK13] Fig. 2 (individual A, u0 = 1.0 m/s, θt = 20°, T = 0.12 s) | β ≈ +1.17 rad at t = 0 down to ≈ −0.42 rad at t ≈ 0.063 s (downstroke ≈ 0.53 T); θa ≈ 0.03 → 0.93 rad, peaking with the β minimum; η ≈ ±0.2 rad, two cycles per beat; θ ≈ −0.14 to +0.15 rad | | [YOK13] Fig. 2 | FIG |
| Free flight, [YOK13] (individual B) | wind-tunnel inflow 1.6 m/s, T = 0.112 s (8.9 Hz). Mean wingtip speed 4C_β1 f y_tip = 1.3 m/s, maximum 2πC_β1 f y_tip = 2.0 m/s, so C_β1 ≈ 0.71–0.72 rad (≈ 41°) and the first-harmonic stroke ≈ 82° peak-to-peak (DER). Re = 4300, St = 0.81, k = 0.20, Fr = 1.9 | | [YOK13] | FT |
| Fourier orders used | β to 2nd order (β = Σ C_βj cos(2πjft + φ_βj), time origin φ_β1 = 0 so the downstroke is t < T/2), θa 1st, η 3rd, θ 2nd, thorax coordinates 4th. Coefficients are not printed | | [YOK13] | FT |
| Mean lead-lag | η ≈ −9.1 × 10⁻² rad (pitching moment is sensitive to it) | | [YOK13] | FT |
| Thorax pitch, free flight | ≈ 0.5 rad at t = 0, minimum ≈ 0.31 rad at t ≈ 0.03 s (≈ 0.27 T, mid-downstroke), maximum ≈ 0.72 rad at t ≈ 0.075 s (≈ 0.67 T, mid-upstroke); i.e. 18–41°, mean ≈ 29° ([BOD20] Table 6 lists χ = 28°) | | [YOK13] Fig. 3 | FIG |
| Vertical thorax oscillation, free flight | y_t ≈ −6.9 mm at t ≈ 0.032 s (lowest during the downstroke) to ≈ +6.6 mm at t ≈ 0.074 s, about 13.5 mm peak-to-peak; streamwise x_t only ≈ −1.5 to +1.2 mm | | [YOK13] Fig. 3 | FIG |
| Free flight, [SEN12b] | T = 0.112 s, reversal at t = 0.06 s; as printed, β peak/bottom ≈ 90°/−70° and θa ≈ 60°/−70° (experiment). The θa range looks implausibly large next to [YOK13] Fig. 2 | | [SEN12b] | FT (doubtful) |
| Mean / maximum wingtip speed | 1.2 / 1.9 m/s; Re = 4800, St = 0.80, Fr = 1.6 | tethered (1.54 m/s) | [SEN12b] | FT |
| Abdomen–wing phase | θa and β "almost in antiphase": the posterior end of the abdomen goes up during downstrokes | | [YOK13] | FT |
| Torsional rigidity of the wing | ≈ 6.0 × 10⁻⁴ N·m/rad (3 animals, load at half span) [SEN12b]; ≈ 8.0 × 10⁻⁴ N·m/rad [SEN12r]; damping ratio 0.7 (estimated/assumed) | | [SEN12b], [SEN12r] | FT |
| Abdomen gravity torque on the thorax | ≈ 3 × 10⁻⁵ N·m | | [YOK13] | FT |
| Compiled values | J 1.2, U 1.6 m/s, χ 28°, US:DS 1.0, Φ 92° | from [YOK13] | [BOD20] Table 6 | 2ND |
| Abdomen control | abdominal motion gives short-term pitch stabilisation of a 2D butterfly but fails in the long term | [JAY18], APS DFD 2017 abstract | | AB |

---

### 1.8 Orange oakleaf, *Kallima inachus* (Fei & Yang)

| Quantity | Value | Source | How |
|---|---|---|---|
| Advance ratio within the cycle | maximum J = 0.89 at the start of the downstroke, minimum J = 0.17 at the downstroke-to-upstroke transition; speed varies roughly sinusoidally | [FEI15] | AB |
| Clap and wake capture | at high speed the wing clap reduces drag; at low speed the butterfly captures the downstroke wake and makes thrust at the start of the upstroke | [FEI15] | AB |
| Body rotation | body rotation steers the vortex rings. A larger initial body angle trades forward for upward displacement. At the end of the downstroke the butterfly "jumps" and pitches up to align its body with the flow | [FEI16] | AB |
| Compiled kinematics | J 0.5, U 0.7 m/s, χ̄ 77°, US:DS 1.0, Φ 115°, distal pitch ψ_d 90° (DS and US) | [BOD20] Table 6 citing Fei & Yang | 2ND |
| Body angle | *K. inachus* uses large body angles (60–90°) in forward flight | [BOD20] text citing [FEI16] | 2ND |
| Wing planform | leaf-like outline that deviates strongly from elliptical (used as the low-span-efficiency example) | Span efficiency of flying animals, Integr. Comp. Biol. (2026), PMC13339092 | FT (qualitative) |

No morphology (mass, wing length, area) was accessible; both PRE papers are paywalled and the related NTU theses are campus-only.

---

### 1.9 Extra danaine with full Fourier kinematics: blue tiger, *Tirumala septentrionis*

This species is not on the request list. It is included because it is a danaine close to *Danaus* and *Parantica* in size and shape, and it has published Fourier series for body angle, flap, sweep and wing pitch from 4 specimens and 16 forward-flight films [LIN21] (FT).

| Quantity | Model | Experiment (mean ± s.e.m.) |
|---|---|---|
| Total mass (g) | 0.35 | 0.35 ± 0.03 |
| Wing-beat frequency (Hz) | 11.00 | 11.03 ± 0.28 |
| Wing length (mm) | 46.04 | 45.25 ± 0.90 |
| Mean wing chord (mm) | 20.11 | 19.97 ± 0.19 |
| Body length (mm) | 25.00 | 25.70 ± 1.13 |
| Aspect ratio (R/c̄) | 2.29 | 2.27 ± 0.03 |

| Quantity | Value | Source | How |
|---|---|---|---|
| r₂ | 24.51 mm (≈ 53 % of wing length) | [LIN21] | FT |
| Downstroke | about 0.6 of the period | [LIN21] | FT |
| Wing-pitch amplitude | ≈ 45° peak-to-peak | [LIN21] | FT |
| Reynolds number | ≈ 6050 (experiment), 6130 (model), from tip speed and mean chord | [LIN21] | FT |
| Mean forward speed | 1.43 m/s for the measured kinematics (wp1.00 case) | [LIN21] | FT |
| Wing area per side; wing loading | ≈ 926 mm² (R·c̄); ≈ 1.85 N/m² | from [LIN21] | DER |
| Flapping frequency, second sample | 11.02 ± 1.08 Hz (N = 15) | [LAN23] | FT |
| Abdomen–wing phase (same group) | abdominal motion about 0.1 period out of phase with the wing stroke makes the coupling constructive | [CHA22] | AB |

Fourier series (t* = t/T, degrees; [LIN21] Eqs 3.1–3.4, FT):

```text
body angle  θ(t*) = 29.92 − 3.66cos(2πt*) − 7.30sin(2πt*) − 1.71cos(4πt*) + 0.89sin(4πt*) + 0.46cos(6πt*) − 1.12sin(6πt*)
flapping    φ(t*) = 18.95 − 55.06cos(2πt*) + 1.76sin(2πt*) − 2.30cos(4πt*) − 7.50sin(4πt*) + 0.48cos(6πt*) + 0.76sin(6πt*)
sweep       ψ(t*) = 35.90 − 10.92cos(2πt*) + 0.98sin(2πt*) + 3.07cos(4πt*) − 2.87sin(4πt*) + 1.07cos(6πt*) − 0.57sin(6πt*)
wing pitch  α(t*) = 10.66 − 6.62cos(2πt*) − 22.37sin(2πt*) + 0.92cos(4πt*) − 1.05sin(4πt*) − 2.83cos(6πt*) + 0.18sin(6πt*)
```

Derived extremes (DER):

| Series | Minimum | Maximum | Mean | Peak-to-peak |
|---|---|---|---|---|
| Body angle | 21.8° (t* 0.10) | 40.2° (t* 0.66) | 29.9° | 18.4° |
| φ | −38.9° (t* 0.03) | 74.8° (t* 0.445) | 18.95° | 113.7° |
| ψ | 24.8° (t* 0.12) | 49.7° (t* 0.45) | 35.9° | 24.9° |
| α | −12.8° (t* 0.25) | 32.6° (t* 0.77) | 10.7° | 45.4° |

φ rises for 0.42 T and falls for 0.58 T. Given the stated 0.6 T downstroke, the falling branch would be the downstroke, but the paper's φ definition (angle between the pitch axis and Z × B_v, §2.6) leaves the sign mapping unconfirmed.

---

### 1.10 Cross-species compilations (no per-species table accessible)

| Quantity | Value | Source | How |
|---|---|---|---|
| Neotropical butterflies, 37 species | cruising wingbeat frequency averages 11 Hz and stroke amplitude 103°; forward speed above 1 m/s; body angles close to horizontal with correspondingly high stroke-plane angles; J typically > 0.9; maximum positional angle and amplitude rise and body angle falls with relative speed | [DUD90] | AB |
| Ranges compiled from [DUD90] | J 0.4–2.0, U 0.55–3.16 m/s, χ 3–32°, βb 83°, βh 67°, US:DS 0.5–1.35, Φ 61–144° | [BOD20] Table 6 | 2ND |
| Effective angles of incidence | average 39° in the downstroke and −22° in the upstroke; spanwise variation larger than the half-stroke difference; downstroke vertical force on average 18 % above weight | [DUD91] | AB |
| Airspeeds | 270 butterflies, 62 species; natural airspeeds about 3 × those in an insectary; speed correlates with body mass, thoracic mass and wing loading, negatively with aspect ratio | [DS94] | AB |
| CoM position | near the wing base in palatable species, further posterior in distasteful ones; correlates with flight speed and evasiveness | [SD93] | AB |
| Virtual (added) mass | 0.3–1.3 × wing mass | [ELL84] | AB |
| Half-stroke force split | forward flight: DS 74 % vertical / US 26 % horizontal (*V. cardui*), 75 / 25 (*P. sita*), 59 / 41 (*K. inachus*) | [BOD20] Table 8 | FT (compiled) |

### 1.11 Open datasets found (not downloaded)

Downloading these needs a go-ahead, and the Dryad file API returned "Unauthorized" without a token. File names and sizes come from the dataset records.

| Dataset | Species | Contents | Link |
|---|---|---|---|
| [FWUAV] repository | monarch | morphology arrays and Fourier fits in `.m` files (§1.1.h, §1.1.i); `sim_data/morp_MONARCH.mat`; 3D STL models; raw VICON not included | https://github.com/fdcl-gwu/FWUAV |
| Le Roy et al. 2021, Dryad | 11 *Morpho* species (insectary), CFD for 7 | `DATA_S1_flight_kinematics_and_morphology.zip` (1.31 MB), `DATA_S2_CFD_data.zip` (226.6 MB, includes STL wing geometries), `ReadMe.txt` (1.3 KB) | https://doi.org/10.5061/dryad.cz8w9gj44 |
| Lin et al. 2021, Dryad | *T. septentrionis* | `Lin_et_al_2021_kinematics_data.xlsx` (34 KB, kinematics and flight speed), `Lin_et_al_2021_parameter.xlsx` (9.4 KB), `Lin_et_al_2021_simulation_data.xlsx` (129 KB), `README.pdf` (332 KB) | https://doi.org/10.5061/dryad.pzgmsbcjt |
| Kleckova et al. 2024, figshare | *P. rapae*, *P. napi* | `data_individual_morphology.csv` (5.1 KB), `trajectory_param_(track_level)Measurements_rev.csv` (53 KB), `metadata_flight_paths.docx`, R script | https://doi.org/10.6084/m9.figshare.24631410.v6 |
| Johansson & Henningsson 2021, Dryad | *A. paphia* | tomographic PIV, not kinematics: `Butterfly_data.zip` (2.32 GB), `Butterfly_data_log.csv` (1.1 KB), `ClapperDAT.zip` (2.62 GB) | https://doi.org/10.5061/dryad.4j0zpc87v |
| Bode-Oke & Dong 2020, figshare | monarch | six supplemental videos only | rs.figshare.com, item 12452468 and siblings |

---

## 2. Kinematic conventions used by the main papers

### 2.1 [FWUAV] / Sridhar–Kang–Lee / Tejaswi et al. / Pohly et al. (the monarch Fourier fits)

- **Frames.** Inertial frame NED-compatible. The body frame F_B sits at the head-thorax CoM: b_x forward along the thorax (VICON: the unit vector along T1 − T2, two thorax markers), b_y to the right (no roll assumed), b_z down.
- **Body pitch.** R = exp(θ_B ê₂): θ_B > 0 is nose-up. From the data, θ_B = atan2(−R₃₁, R₁₁), i.e. the elevation of the thorax axis above the horizontal.
- **Stroke frame.** F_S has its origin at the midpoint of the two wing roots and is rotated about b_y by **β**. The stroke plane is its y–z plane. β is the angle between b_x and the stroke-plane normal s_x, equivalently between the body y–z plane and the stroke plane. β > 0 when s_x·b_z < 0: the normal tilts dorsally, so the ventral end of the stroke plane lies forward. β = 0 means a stroke plane perpendicular to the thorax axis. Ellington's stroke-plane angle from the horizontal is **β_E = 90° − θ_B − β**.
- **Right wing.** Q_R = exp(βê₂)·exp(φê₁)·exp(−ψê₃)·exp(θê₂), 1–3–2 Euler angles. Left wing: exp(βê₂)·exp(−φê₁)·exp(ψê₃)·exp(θê₂).
  - **φ (flapping, also called stroke or sweep)** is the rotation about s_x, measured in the stroke plane from s_y. Positive is ventral: φ̇ > 0 is the downstroke.
  - **θ (pitch/feathering)** is the rotation about the wing span axis r_y. Positive when the LE rotates toward the dorsal side. θ = 0 puts the chord along s_x, perpendicular to the stroke plane: a flat wing at a 90° geometric angle to its own flapping velocity, and parallel to the stroke-plane normal.
  - **ψ (deviation)** is the motion out of the stroke plane. Positive is tip toward the head.
- **Data reduction.** The wing plane is a least-squares plane through the wing root (taken as the thorax-marker midpoint) and three forewing markers; the span direction is the root→RW3 marker projected onto it. So θ is an effective rigid-plane pitch that includes twist and camber.
- **Abdomen.** Q_A = exp(θ_A ê₂) relative to the thorax. The abdomen axis runs from the midpoint of the abdomen markers to T2. θ_A > 0 is ventral flexion (tail down). The absolute depression of the abdomen below horizontal is θ_B + θ_A.
- **Wing geometry frame.** x points toward the LE (chordwise), y root→tip, z normal. c_LE(y) > 0 and c_TE(y) < 0 are measured from the span axis.
- **Time origin of the VICON fits.** The start of the record, with φ at its ventral maximum at t/T ≈ 0, so the upstroke comes first. The parametric model in [TKL21] uses the same orientation: "upstroke when 0 ≤ t ≤ T/2".

### 2.2 Bode-Oke & Dong 2020 [BOD20]

- **Global frame:** +x backward, +y up, +z left.
- **Body axis ê_l:** the line from the head to the abdomen hinge. **χ** is the body angle relative to the horizontal; it exceeds 90° in backward flight.
- **Stroke plane:** the least-squares plane through wing root and tip coordinates. **βb** is its angle relative to ê_l (≈ 90° means perpendicular to the body). **βh** is its angle relative to the horizontal, with the front end above the horizontal. Both are given per half-stroke.
- **Euler angles in the mean stroke plane:**
  - **φ (flap)** is the back-and-forth motion.
  - **θ (deviation)** is the angle between the wing and its projection on the stroke plane.
  - **ψ (pitch)** is the angle between the wing chord and the mean stroke plane, with ψ_DS < 90°. It is reported at 0.25R (ψ_p) and 0.75R (ψ_d).
  - Mapping to [FWUAV] (both taken from the stroke plane, LE dorsal positive): **ψ_BOD ≈ 90° + θ_FWUAV**. This is approximate and DER.
- **Abdomen θt:** the angle between ê_l and the hinge→tip abdomen vector.
- **Other quantities:**
  - Φ is the stroke amplitude.
  - US:DS is the duration ratio.
  - J = U_b/(2Φ n_w R).
  - Re = U R/ν, with R the forewing length.
  - Phases: +φ_b,w means χ leads φ; +φ_t,w means φ leads θt.

### 2.3 Zheng, Hedrick & Mittal 2013 [ZHE13]

- **Frames:** lab frame (X, Y, Z) and wing-attached frame (X', Y', Z').
- **Stroke definitions:** **Φ** is the angle between the root–tip lines at the top and bottom of the stroke. The **stroke-plane angle** is the angle between the X-axis and the XZ-plane projection of the line joining the tip positions at top and bottom.
- **Body pitch:** the angle between the body and the horizontal plane.
- **Section angles:**
  - **AoI** is the angle between the local chord line C_r (straight LE–TE line) and the X'Y' plane.
  - **Twist** is the spanwise variation of AoI.
  - **Local camber** is C_h/C_r, positive when LE and TE bend downward.
  - **AoA(r')** = AoI(r') + atan(V_LE(r')/U∞), where V_LE is the vertical LE velocity.
- **Normalisation:** Re = 2ΦfRc̄/ν; t' = t/T; r' = r/R.

### 2.4 Kyoto group: Senda, Yokoyama, Iima, Hirai [SEN12b, SEN12r, YOK13]

- **Model.** Four links: thorax, abdomen and two one-piece wings. State θ₁ = (x, z, θt) for the thorax and θ₂ = (θa, β, η, θ) for the joints.
- **Thorax pitch θt.** In [YOK13] it is the Euler angle φ_t2 about j_I, with i_t pointing from the posterior to the anterior end of the thorax. In tethered tests it is the angle between the thorax long axis and the main stream.
- **Joint angles.** 1–3–2 Euler angles from the thorax frame: about i_t (φ_i1), then k (φ_i2), then j (φ_i3). They are φ_a = (0, 0, −θa), φ_wl = (β + π, −η, −θ), φ_wr = (−β, −η, θ).
  - **β ≈ flapping** about the thorax long axis; it equals the flapping angle exactly when η = θ = 0. There is no separate stroke-plane tilt: the stroke plane is fixed perpendicular to the thorax.
  - **η ≈ lead-lag** and **θ ≈ feathering**, a torsion angle the authors regard as largely passive.
- **Signs and time origin.** β is largest at the top: the wings overlap at maximum β [SEN12r]. With φ_β1 = 0 the downstroke is t < T/2 [YOK13].
- **Dimensionless groups.** Re = 4C_β1 f y_tip²/ν [YOK13]; St = 4C_β1 f y_tip/u0; k = 2C_β1 f S_w/(u0 y_tip); Fr = 4C_β1 f (y_tip/g)^½. Here C_β1 is the first-harmonic flapping amplitude.

### 2.5 Sunada et al. 1993 and Suzuki et al. 2022 (*Pieris*)

- **[SUN93]**, as described by later papers: four-link model with flapping β and lead-lag ζ. Feathering is taken at 0.7 of the wing length, θ_fh = π/2 − δ. Thoracic and abdominal angles are measured from the horizontal, and the stroke-plane inclination equals the thoracic angle.
- **[SUZ22]** uses monitor points A–F:
  - Yaw is that of the thorax vector projected on the zx-plane.
  - Pitch is the angle of the vector from A through the thorax, from the x-axis after removing yaw.
  - The abdominal angle is measured from the −x axis after removing pitch; positive is dorsal.
  - The flapping angle is the angle between the zx-plane and the right forewing, from the wing's ventral normal projected on the yz-plane, measured from the −y axis.
  - The CoM is at the thorax–abdomen joint B. Time is normalised by T = 0.090 s.

### 2.6 Yang group, National Taiwan University [LIN21, FEI15, FEI16]

- **Global frame:** X along the flight direction, −Y along gravity, Z lateral (the reference for body rotation).
- **Body angle θ:** the angle between the thorax centre line and the XZ plane (horizontal).
- **Flapping φ:** the angle between the wing pitch axis R_a and Z × B_v, where B_v is the body vector.
- **Sweep ψ:** the complement of the angle between the wingtip vector W_t and B_v, so 0 means the tip is perpendicular to the body and positive means swept forward.
- **Wing pitch α:** the angle between the wing normal N_w and R_a × B_v. R_a lies 12° from W_t.
- **Fei & Yang:** report advance ratio within the cycle (abstract). Their body angle appears as χ in [BOD20]'s compilation.

### 2.7 Le Roy et al. 2022 (*Morpho*) [LER22]

- **Wing angles:** Ellington's (1984) body-frame convention. Each wing's stroke plane is the plane normal to the body long axis through that wing's hinge; it is fixed, not fitted. The Euler angles are stroke Φ, deviation θ and rotation H. Hinges are held fixed through the wingbeat.
- **Derived quantities:**
  - AoA α is the angle between the wing plane and the wing velocity (blade elements, 10 per wing).
  - Body pitch β is the angle between the body axis and the horizontal.
  - Climb angle γ = atan(U_ver/U_hor).

### 2.8 Kang et al. 2023 (2D aeroelastic model) [KANG23]

- **Stroke-plane angle β:** the angle between the freestream direction and the plunge direction of the leading edge. β = 0 is a vertical plunge; a larger β is a stroke plane closer to the horizontal. It folds body pitch and undulation into one parameter. So Ellington's angle is β_E = 90° − β.
- **Passive pitch:** α = atan((w − ζ)/c), the angle between the camber line and the undeformed chord. It is approximated by its first harmonic, α ≈ π/2 − α_a cos(2πft + ϕ).

### 2.9 Johansson & Henningsson 2021 [JOH21]

- **Stroke plane:** principal-component analysis of the left and right forewing-tip positions relative to the head.
- **Stroke events:** half-stroke transitions come from the angle between the two forewings; amplitude comes from the start and end of the upstroke.

### 2.10 Dudley 1990/1991 (Ellington conventions)

- **Angles:** body angle χ and stroke-plane angle β are measured from the horizontal. The positional angle φ lies in the stroke plane, and Φ is the amplitude.
- **Ratios:** J = V/(2ΦnR); US:DS ratio.

### 2.11 Quick conversion of the stroke-plane angle to Ellington's convention (β_E, from horizontal)

| Paper | Formula |
|---|---|
| [FWUAV] | β_E = 90° − θ_B − β |
| [KANG23] | β_E = 90° − β |
| [BOD20] | β_E = βh |
| [ZHE13] | β_E ≈ 78.5° (XZ projection) |
| [YOK13], [SEN12b], [LER22] (stroke plane ⟂ body axis) | β_E ≈ 90° − body pitch |

---

## 3. Recommended default parameter set: monarch

**Design choices behind the default**

- **Kinematics** use the [FWUAV] VICON Fourier fits (§1.1.h). They are the only complete monarch set covering flap, pitch, deviation, thorax pitch and abdomen from one flight.
- **Geometry** uses the [POH22] planform size for that same VICON monarch, l = 5.2 cm and S = 15.2 cm², which is consistent with [BOD20]. The outline shape comes from [FWUAV], rescaled.
- **Masses** use 0.50 g total, the value three sources agree on. The FWUAV morphology specimen (0.308 g, l = 6.10 cm, unscaled outline) remains a self-consistent alternative preset.

Frames and signs follow §2.1.

| Parameter | Default | Plausible range | Source / basis |
|---|---|---|---|
| Total mass m | 0.50 g | 0.31–0.51 g (values found) | 500 mg [BOD20]; 0.5077 g [FWUAV]; 5 mN weight [KANG23]; 0.308 g [FWUAV] specimen |
| Head + thorax mass | 0.20 g | 0.15–0.22 g | 0.1485 g [FWUAV]; "0.22" [POH22] (units garbled); *Parantica* thorax 25–40 % of total [SEN12b, YOK13] |
| Abdomen mass | 0.25 g (remainder) | 0.11–0.30 g; varies ×0.5–×2 with feeding | 0.1092 g [FWUAV]; variability [YOK13] |
| Wing mass, fore + hind of one side | 25 mg | 15–37 mg | 25.1 mg [FWUAV]; forewing alone 15 mg [KANG23]; hindwing unmeasured |
| Head + thorax shape | cylinder 14.63 mm long × 5.68 mm diameter | 10.5–15 mm × 5.4–8 mm (*Parantica*) | [FWUAV]; [SEN12b], [YOK13] |
| Abdomen shape | cylinder 17.38 mm × 3.71 mm, hinged at the rear of the thorax | 17–21 mm × 3.7–5.7 mm | [FWUAV]; [SEN12b], [YOK13]; total body length 35 mm [BOD20] |
| Wing-root position | ±2.84 mm lateral, at the thorax-CoM station | — | [FWUAV] (modelling assumption) |
| Wing length l (root to tip, fore + hind combined) | 52 mm | 51–61 mm | 5.2 cm [POH22]; forewing 51 mm [BOD20]; 61.0 mm [FWUAV] |
| Wing area, one side (overlapped fore + hind) | 15.2 cm² | 12.75–15.5 cm² | [POH22]; 15.53 cm² (FW + HW sum) [BOD20]; 12.75 cm² [FWUAV] |
| Mean chord | 29.2 mm | 20.9–29.2 mm | S/l (DER); "2.9" [KANG23]; 20.9 mm [FWUAV] |
| Aspect ratio b²/S_total (b = 2l) | 3.56 | 3.5–5.8 | DER from [POH22] and [FWUAV]; 4.47 in the maximum-span gliding pose [ORT17] |
| Planform outline | [FWUAV] table §1.1.i with r scaled by 0.8525 and x by 1.398 | unscaled = alternative preset | DER (affine rescale to l = 5.2 cm, S = 15.2 cm²; an assumption, not a measured outline) |
| Area-moment radii | r̃1 = 0.498, r̃2 = 0.543, r̃3 = 0.580 | — | [FWUAV] (unchanged by affine scaling) |
| Wing CoM (wing frame) | 12.9 mm spanwise (0.249 l), 6.2 mm behind the span axis | unscaled: 15.2 mm, 4.4 mm | DER from [FWUAV] |
| Wing MOI about the root | J_xx (flap) 2.0e-8, J_yy (feathering) 5.0e-9, J_xy 3.0e-9, J_zz 2.5e-8 kg·m² | unscaled: 2.76e-8, 2.58e-9, 2.50e-9, 3.01e-8 | DER: [FWUAV] values × (span scale)², × (chord scale)², × both, at 25 mg |
| Head + thorax pitch MOI (own CoM) | 3.97e-9 kg·m² | 2.9e-9 (specimen) | DER, cylinder formula of [FWUAV] |
| Abdomen pitch MOI about the hinge | 2.54e-8 kg·m² | 1.11e-8 (specimen) | DER, cylinder formula of [FWUAV] |
| Whole-body CoM relative to the wing root | 8.6 mm aft with the abdomen straight; 8.4 mm aft and 1.3 mm ventral at mean flexion (17.3°); 8.0 mm aft and 2.2 mm ventral at maximum flexion (31.1°) | specimen: 6.4 mm aft | DER (point masses at segment CoMs, wings horizontal) |
| Whole-body pitch MOI about the CoM | 4.7e-8 kg·m² | 2.6e-8 (specimen) – 4.7e-8 | DER, same assumptions; changes with wing position, see [LIN12] |
| Flapping frequency f | 10.2 Hz | 7.4–13.6 Hz (forward: 9.9 Hz) | [FWUAV] 10.2247; [POH22]; [BOD20]; 10 Hz [KANG23] |
| Flap φ(t) | [FWUAV] Fourier (§1.1.h) | — | CODE |
| Stroke amplitude | 124.7° (−65.4° dorsal to +59.3° ventral about s_y) | 103–148° | DER from [FWUAV]; [BOD20] |
| Stroke-plane angle β (relative to the plane ⟂ thorax axis) | 25.4° | 0–30° (model choice); [BOD20] βb 78–93° implies β ≈ −3° to +12° | [FWUAV] doc, [POH22] |
| Stroke plane from the horizontal | ≈ 46° at mean posture (38–54° over the cycle) | 30–69° ([BOD20] βh forward); 41–61° ([KANG23] model) | DER |
| Downstroke fraction | 0.56 | 0.56–0.62 | DER from [FWUAV]; [BOD20] US:DS |
| Deviation ψ(t) | Fourier at 2f: mean −2.0°, ±3.3° | ±0 to ±11° (*Parantica* η ≈ ±0.2 rad, mean −5.2°) | [FWUAV]; [YOK13] |
| Feathering θ(t) (rigid-plane, LE dorsal +) | Fourier: −42.7° to +31.2°, mean −6°; reversal leads stroke reversal by ≈ 0.075 T | [BOD20] ψ: DS 67–81°, US 95–122°, i.e. θ ≈ −23…−9° DS and +5…+32° US | [FWUAV]; [BOD20] |
| Spanwise twist (0.75R minus 0.25R) | −8° in the DS, +15° in the US, linear in span, peaking mid-stroke | DS −5…−11°, US +10…+19° (monarch); up to ≈ 30–40° (*V. cardui*) | DER from [BOD20]; [ZHE13] |
| Thorax pitch θ_B(t) | 18.6° + 8.3° cos(ωt − 81.7°), maximum mid-upstroke | mean 18.6–50°, amplitude 8–12° (*Parantica* ±11.7°) | [FWUAV] fit and older fit; [BOD20] χ̄ 28–50° |
| Abdomen θ_A(t) (relative to thorax, ventral +) | 17.3° + 13.8° cos(ωt + 163.5°), most ventral 0.10 T after the dorsal reversal | mean 14–35°, amplitude 13.8–21° | [FWUAV] fit and older fit; [BOD20] θ̄t 14–15° |
| Abdomen joint, if passive | k = 9.43e-5 N·m/rad, c = 7.66e-7 N·m·s/rad, τ0 = 4.16e-5 N·m | — | [TKL21] (fit to an optimized hover, model-derived) |
| Flight speed | 1.4 m/s at ≈ 23° climb | 0.8–1.75 m/s | [POH22] initial condition; [BOD20] F1/F2; [KANG23] |
| Advance ratio U/(2ΦfR) | 0.61 | 0.42–0.90 | DER; [BOD20] |
| Reynolds number U c̄/ν | ≈ 2700 (tip-speed based ≈ 4500) | 850–5950 depending on definition and altitude | DER; [KANG23] 2588 at sea level; [BOD20] |
| Wing structure, if modelling flexibility | E_span 2.5 GPa, E_chord 0.3 GPa, ρ_w = 307 kg/m³, root thickness 0.16 mm; passive-pitch spring 0.15 mN·m | *Parantica* torsional rigidity 0.6–0.8 mN·m/rad | [KANG23]; [POH22]; [SEN12b, SEN12r] |
| Air | ρ = 1.225 kg/m³ | 0.91 kg/m³ at 3000 m | [FWUAV]; [KANG23] |

**Notes for the solver**

1. **The VICON flight does not clap.** The wings stay 49° apart at the top. For a clap variant, shift the flap offset so the dorsal extreme reaches about −90° about s_y. The same lab's tethered *Parantica* reaches full overlap at β_max ≈ 81° [SEN12r], and *Argynnis* claps at the end of each upstroke with a cupped forewing-first contact [JOH21].
2. **θ is a rigid-plane fit.** It passes through the root and three forewing markers, so it already averages twist and camber. To prescribe twist separately, take θ(t) as the mid-span value and superimpose the linear twist above.
3. **Phase relations to reproduce:**
   - The thorax is lowest in pitch at mid/late downstroke and highest at mid-upstroke ([FWUAV], *Parantica* [YOK13], *Argynnis* [JOH21], *Pieris* take-off [SUZ22]).
   - The abdomen is roughly antiphase with the wings, lagging by 0.04–0.10 T ([FWUAV]; [BOD20] φ_t,w = 160–195°).
   - The body is lowest near mid-downstroke (*Parantica* [YOK13] Fig. 3, about 13.5 mm peak-to-peak).

---

## 4. Gaps

1. **Monarch statistics.** No population mean ± SD of frequency, amplitude, body undulation or phase. The multi-flight monarch datasets are described but not accessible: [KANG18] (75 climbing flights, 9 butterflies, per [CRA15]), [SLE17] (236 flights, 11 butterflies), [SRI21] (altitude chamber), Tejaswi et al. 2021 (Bioinspir. Biomim. 16:046003), Sridhar, Kang & Landrum AIAA 2019-0566, and the theses [CRA15] and Sridhar 2021 (https://louis.uah.edu/uah-dissertations/419). NSF PAR refused connections and the UAH PDFs returned 403. The VICON fits come from one monarch.
2. **Monarch geometry conflict.**
   - The published outline [FWUAV] (l = 6.10 cm, c̄ = 2.09 cm) disagrees with the wing size [POH22] used for the VICON monarch (5.2 cm, 15.2 cm²) and with [BOD20] (forewing 51 mm). The default rescales the outline affinely; a measured outline of the VICON individual would be better.
   - There is no published hindwing mass, and no measured fore/hind overlap in flight beyond the "overlapped configuration" statement [KANG23].
3. **Monarch inertia.** No measured body MOI or CoM. All inertia values are cylinder or flat-plate idealisations ([FWUAV]) or my derivations. CoM positions for many species are in [SD93] and [DUD90] but could not be opened (journals.biologists.com bot check).
4. **Monarch stroke-plane reference.**
   - [FWUAV] gives β = 25.4° from the plane perpendicular to the thorax-marker axis, whereas [BOD20] finds the stroke plane roughly perpendicular to the head–abdomen-hinge axis (βb 78–93°). The body-axis definitions differ and the flights differ (climbing vs. level).
   - The vertical oscillation amplitude of the monarch body was not found as a number.
5. **[POH22] Table 1 units are garbled** (body mass "0.22 mg", abdomen mass "25.39 deg", wing mass 3.5–3.7 "mg"), so the VICON individual's masses are unknown.
6. **Painted lady.** Segment masses and MOI ([LIN12]) are inaccessible. The kinematics come from one sequence at 9 instants per cycle, with no Fourier coefficients and no deviation or flap time series in numbers. The twist and AoI curves in §1.2 are figure read-offs.
7. ***Pieris*.**
   - [SUN93] (full *P. melete* time histories and the four-link parameters) and Bimbard et al. 2013 (J. Exp. Biol. 216(18):3551, *P. rapae* take-off force balance) could not be opened.
   - Forward-flight wing angles for *P. rapae* were not found.
   - The [SUZ22] values are a take-off.
   - The [KLE24] wingbeat-frequency means are only derivable (their CSV on figshare was not downloaded).
8. ***Morpho*.** No *M. peleides*-specific kinematics ([HS12] and the 2006 Huang & Sun *M. peleides* paper are inaccessible). *Morpho* flapping frequencies and per-species morphology are in [LER21]'s Dryad zip and [LER22]'s figures, not in text. No wing masses or MOIs.
9. **Red admiral.** Essentially no quantitative kinematics or morphology beyond hindwing length; [SRY02] and [BW88] full texts are needed.
10. ***Argynnis paphia*.** Frequency, amplitude and wing-angle values are not in the accessible text. The Dryad deposit holds PIV volumes, not kinematics.
11. ***Parantica sita*.**
    - Fourier coefficients are not printed (only the truncation orders); the joint-angle time histories are figure read-offs.
    - [SEN12b]'s printed free-flight ranges (β 90°/−70°, θa 60°/−70°) conflict with [YOK13] and [SEN12r].
    - [JAY18] was not accessed.
    - Wing MOI and outline coefficients are not given.
12. ***Kallima inachus*.** Morphology is entirely missing. Kinematics exist only as abstract statements and the [BOD20] compilation (U 0.7 m/s, χ 77°, Φ 115°, J 0.5). The PRE full texts are paywalled and the NTU theses are campus-only.
13. **Datasets found but not downloaded** (§1.11): the [LER21] kinematics zip (1.31 MB) and STL wing geometries (226.6 MB zip), [LIN21] kinematics xlsx (34 KB), [KLE24] trajectory CSV (53 KB). Opening these would turn several "figure only" items into numbers; it needs the user's go-ahead, and a Dryad token for API downloads.
14. **Literature that would fill the most gaps if the PDFs can be obtained manually:**
    - [DUD90]: 37 species with wing mass, CoM, body angle, stroke-plane angle and kinematics.
    - [SD93]: CoM positions.
    - [BW88]: six species with wing moments and inertia.
    - [SUN93]: *P. melete* time series.
    - [KANG18] and [SRI21]: monarch statistics.
    - [LIN12]: painted-lady segment MOI.
    - [FEI15] and [FEI16]: *Kallima* morphology and kinematics.
