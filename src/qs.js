// Quasi-steady blade-element model: the fast lens. No wake, no memory, no wing–wing interaction.
//
// Each spanwise strip of the same deformed lattice the UVLM uses is treated as a 2-D flat plate
// in the air it meets at that instant:
//   translational  C_N = Kp sin α |cos α| + Kv sin α |sin α|, the Polhamus form with no
//                  leading-edge suction (Nabawy & Crowther 2014, J R Soc Interface 11:20131196)
//   rotational     F = ρ π(¾ − x̂₀) ω_pitch u_c c² Δr (Sane & Dickinson 2002, J Exp Biol 205:1087)
//   added mass     F = −ρ (π/4) c² Δr a_n, from the normal acceleration of the mid-chord
//   friction       ½ρ C_D0 |V| V A along the in-plane flow
// all along the strip normal except friction. Kp defaults to Helmbold's finite-wing slope for the
// pair's aspect ratio and Kv to π.

export class QSModel {
  constructor({ M, N, rho = 1.2, Kp, Kv = Math.PI, cd0 = 0, pivot = 0, aspect = 3, wind = [0, 0, 0], symmetric = true }) {
    this.M = M; this.N = N; this.rho = rho;
    this.Kp = Kp ?? 2 * Math.PI * aspect / (2 + Math.sqrt(aspect * aspect + 4));
    this.Kv = Kv; this.cd0 = cd0; this.pivot = pivot; this.wind = wind; this.symmetric = symmetric;
    this.prevEc = null;
  }
  // wings: [{ C, Cv, Ca, Cm, Cp }] corner positions at t, velocities, accelerations, and positions at t∓h for pitch rate
  step(wings, h, ref) {
    const { M, N, rho, Kp, Kv, wind } = this, W = N + 1;
    const res = { F: [0, 0, 0], M: [0, 0, 0], P: 0, perSurface: [], strips: [] };
    const xr = 0.75 - this.pivot;
    for (const wg of wings) {
      const { C, Cv, Ca, Cm, Cp } = wg;
      const F = [0, 0, 0], Mo = [0, 0, 0]; let P = 0;
      const strips = [];
      const lerpNode = (A, i, j, f, k) => (A[3 * (i * W + j) + k] * (1 - f) + A[3 * (M * W + j) + k] * f);
      for (let j = 0; j < N; j++) {
        // leading and trailing edge mid-points of the strip
        const pt = (A, row, k) => 0.5 * (A[3 * (row * W + j) + k] + A[3 * (row * W + j + 1) + k]);
        const le = [0, 1, 2].map((k) => pt(C, 0, k)), te = [0, 1, 2].map((k) => pt(C, M, k));
        const inner = [0, 1, 2].map((k) => 0.5 * (C[3 * j + k] + C[3 * (M * W + j) + k]));
        const outer = [0, 1, 2].map((k) => 0.5 * (C[3 * (j + 1) + k] + C[3 * (M * W + j + 1) + k]));
        let ec = le.map((v, k) => v - te[k]); const c = Math.hypot(...ec); if (c < 1e-9) continue; ec = ec.map((v) => v / c);
        let es = outer.map((v, k) => v - inner[k]); const dr = Math.hypot(...es); es = es.map((v) => v / dr);
        let en = [es[1] * ec[2] - es[2] * ec[1], es[2] * ec[0] - es[0] * ec[2], es[0] * ec[1] - es[1] * ec[0]];
        const nn = Math.hypot(...en); en = en.map((v) => v / nn);
        // quarter- and mid-chord points, their velocity and acceleration (linear along the chord)
        const at = (A, f) => [0, 1, 2].map((k) => 0.5 * (lerpNode(A, 0, j, f, k) + lerpNode(A, 0, j + 1, f, k)));
        const pq = at(C, 0.25), vq = at(Cv, 0.25), am = at(Ca, 0.5), pm = at(C, 0.5), vm = at(Cv, 0.5);
        let V = [wind[0] - vq[0], wind[1] - vq[1], wind[2] - vq[2]];
        const vs = V[0] * es[0] + V[1] * es[1] + V[2] * es[2];
        V = V.map((v, k) => v - vs * es[k]);
        const Vm = Math.hypot(...V);
        const un = V[0] * en[0] + V[1] * en[1] + V[2] * en[2];
        const uc = -(V[0] * ec[0] + V[1] * ec[1] + V[2] * ec[2]);
        const alpha = Math.atan2(un, uc);
        const sa = Math.sin(alpha), ca = Math.cos(alpha);
        const CN = Kp * sa * Math.abs(ca) + Kv * sa * Math.abs(sa);
        const area = c * dr, q = 0.5 * rho * Vm * Vm;
        let fn = q * area * CN;
        // pitch rate from the chord direction a step either side
        const ecAt = (A) => { const l = [0, 1, 2].map((k) => pt(A, 0, k) - pt(A, M, k)); const m = Math.hypot(...l) || 1; return l.map((v) => v / m); };
        const em = ecAt(Cm), ep = ecAt(Cp);
        const wp = ((ep[0] - em[0]) * en[0] + (ep[1] - em[1]) * en[1] + (ep[2] - em[2]) * en[2]) / (2 * h);
        const fRot = rho * Math.PI * xr * wp * uc * c * c * dr;
        const an = am[0] * en[0] + am[1] * en[1] + am[2] * en[2];
        const fAm = -rho * Math.PI / 4 * c * c * dr * an;
        const ft = [fn * en[0], fn * en[1], fn * en[2]];
        const fr = [fRot * en[0], fRot * en[1], fRot * en[2]];
        const fa = [fAm * en[0], fAm * en[1], fAm * en[2]];
        let ff = [0, 0, 0];
        if (this.cd0 > 0) { const u2 = V.map((v, k) => v - un * en[k]); const um = Math.hypot(...u2); ff = u2.map((v) => 0.5 * rho * this.cd0 * um * v * area); }
        const add = (p, f, v) => {
          F[0] += f[0]; F[1] += f[1]; F[2] += f[2];
          const rx = p[0] - ref[0], ry = p[1] - ref[1], rz = p[2] - ref[2];
          Mo[0] += ry * f[2] - rz * f[1]; Mo[1] += rz * f[0] - rx * f[2]; Mo[2] += rx * f[1] - ry * f[0];
          P -= f[0] * v[0] + f[1] * v[1] + f[2] * v[2];
        };
        add(pq, ft, vq); add(pq, ff, vq); add(pm, fr, vm); add(pm, fa, vm);
        strips.push({ alpha, CN, fn: fn + fRot + fAm, fTrans: fn, fRot, fAm, r: Math.hypot(...pq.map((v, k) => v - (wg.root ? wg.root[k] : 0))) });
      }
      res.perSurface.push({ F, M: Mo, P }); res.strips.push(strips);
      for (let k = 0; k < 3; k++) { res.F[k] += F[k]; res.M[k] += Mo[k]; }
      res.P += P;
    }
    if (this.symmetric) { res.F = [2 * res.F[0], 2 * res.F[1], 0]; res.M = [0, 0, 2 * res.M[2]]; res.P *= 2; }
    return res;
  }
}
