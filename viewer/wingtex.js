// Procedural wing textures painted in planform coordinates, so the solver's own lattice can carry
// them: u = z/R (root → apex) across, v down the chord (costa at the top), in a frame fitted to each
// species' outline. Patterns are stylised by species: monarch, painted lady, chestnut tiger,
// small white, morpho and fritillary.

export function texFrame(sp) {
  const xs = sp.outline.flatMap((s) => [s[1], s[2]]);
  const top = Math.max(...xs) + 0.03, bottom = Math.min(...xs) - 0.03;
  return { top, span: top - bottom };
}
export const uvOf = (xR, zR, fr) => [zR, 1 - (fr.top - xR) / fr.span];

function outline(st) { // closed polygon in (zR, xR): leading edge out, trailing edge back
  return [...st.map((s) => [s[0], s[1]]), ...st.slice().reverse().map((s) => [s[0], s[2]])];
}
function lerpEdge(st, z, col) {
  if (z <= st[0][0]) return st[0][col];
  for (let k = 0; k < st.length - 1; k++) if (z <= st[k + 1][0]) { const t = (z - st[k][0]) / (st[k + 1][0] - st[k][0]); return st[k][col] + t * (st[k + 1][col] - st[k][col]); }
  return st[st.length - 1][col];
}
export function shade(hex, k, mixWith) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let c = p(hex);
  if (mixWith) { const m = p(mixWith); c = c.map((v, i) => v + (m[i] - v) * k); }
  else c = c.map((v) => (k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function paintWing(sp, size = 1024, side = 'dorsal') {
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const g = cv.getContext('2d');
  const fr = texFrame(sp);
  const X = (zR) => zR * size, Y = (xR) => (fr.top - xR) / fr.span * size;
  const col = sp.colors || { base: '#e8781e', vein: '#14100c', spot: '#f6f1e6' };
  const ventral = side === 'ventral', style = sp.pattern || 'monarch';
  const path = (st) => { const p = new Path2D(); outline(st).forEach(([z, x], i) => (i ? p.lineTo(X(z), Y(x)) : p.moveTo(X(z), Y(x)))); p.closePath(); return p; };
  const dot = (z, x, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(X(z), Y(x), r * size, 0, 2 * Math.PI); g.fill(); };
  const veins = (st, hind, colr, w) => {
    const zmax = st[st.length - 1][0], nV = hind ? 8 : 9, bx = hind ? lerpEdge(st, 0.02, 1) - 0.05 : 0.0;
    g.strokeStyle = colr; g.lineCap = 'round';
    for (let k = 0; k <= nV; k++) {
      const z = (k + 0.5) / (nV + 1) * zmax * 1.02;
      const te = lerpEdge(st, Math.min(z, zmax), 2), le = lerpEdge(st, Math.min(z, zmax), 1);
      const tx = hind ? te : le + (te - le) * (0.15 + 0.85 * k / nV);
      g.lineWidth = size * w * (1 - 0.3 * k / nV);
      g.beginPath(); g.moveTo(X(0.02), Y(bx)); g.quadraticCurveTo(X(z * 0.5), Y(bx + (tx - bx) * 0.35), X(z), Y(tx)); g.stroke();
    }
  };
  const marginDots = (st, hind, offsets, every, r, fill, from = 0) => {
    const zmax = st[st.length - 1][0];
    for (const off of offsets) for (let k = 2; k < 60; k += every) {
      const z = k / 60 * zmax; if (z < from * zmax) continue;
      dot(z - off * 0.2, lerpEdge(st, z, 2) + off, r, fill);
    }
  };
  const wings = [{ st: sp.hind, hind: true }, { st: sp.fore, hind: false }];
  for (const { st, hind } of wings) {
    if (!st || !st.length) continue;
    const p = path(st), zmax = st[st.length - 1][0];
    g.save(); g.clip(p);
    let base = ventral ? shade(col.base, 0.22, '#efe2c4') : col.base;
    if (style === 'tiger' && hind) base = ventral ? shade(col.spot, 0.3, '#d8c2a6') : col.spot;
    const grd = g.createLinearGradient(0, 0, size * 0.55, 0);
    grd.addColorStop(0, shade(base, style === 'pieris' ? -0.18 : -0.35)); grd.addColorStop(0.35, base); grd.addColorStop(1, shade(base, 0.06));
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    if (style === 'monarch' || style === 'tiger') {
      veins(st, hind, col.vein, hind ? 0.006 : 0.0045);
      if (style === 'tiger') { // dark ground between pale translucent streaks
        g.globalAlpha = 0.55; veins(st, hind, col.vein, hind ? 0.016 : 0.012); g.globalAlpha = 1;
      }
      g.strokeStyle = col.vein; g.lineWidth = size * (hind ? 0.07 : 0.06); g.lineJoin = 'round'; g.stroke(p);
      if (!hind) { g.lineWidth = size * 0.035; g.beginPath(); st.forEach((s, i) => (i ? g.lineTo(X(s[0]), Y(s[1])) : g.moveTo(X(s[0]), Y(s[1])))); g.stroke(); }
      marginDots(st, hind, [0.012, 0.03], 3, 0.005, col.spot === '#8a4a2a' ? '#e9e4d6' : col.spot, hind ? 0 : 0.55);
      if (!hind && style === 'monarch') {
        const apex = new Path2D(); apex.moveTo(X(0.68), Y(lerpEdge(st, 0.68, 1))); apex.lineTo(X(1.02), Y(lerpEdge(st, 1, 1))); apex.lineTo(X(0.8), Y(lerpEdge(st, 0.8, 2))); apex.closePath();
        g.fillStyle = col.vein; g.fill(apex);
        [[0.78, -0.02], [0.83, -0.05], [0.87, -0.08], [0.74, -0.05]].forEach(([z, dx]) => dot(z, lerpEdge(st, z, 1) - 0.06 + dx, 0.008, ventral ? col.spot : '#f4a640'));
      }
    } else if (style === 'vanessa') {
      veins(st, hind, shade(col.vein, 0.2), 0.0035);
      if (!hind) {
        const apex = new Path2D(); apex.moveTo(X(0.55), Y(lerpEdge(st, 0.55, 1))); apex.lineTo(X(1.02), Y(lerpEdge(st, 1, 1) + 0.02)); apex.lineTo(X(0.86), Y(lerpEdge(st, 0.86, 2))); apex.lineTo(X(0.55), Y(lerpEdge(st, 0.55, 1) - 0.2)); apex.closePath();
        g.fillStyle = col.vein; g.fill(apex);
        [[0.7, -0.08], [0.76, -0.04], [0.82, -0.1], [0.9, -0.03], [0.94, -0.07]].forEach(([z, dx]) => dot(z, lerpEdge(st, z, 1) + dx, 0.012, col.spot));
        g.fillStyle = col.vein; g.beginPath(); g.ellipse(X(0.42), Y(lerpEdge(st, 0.42, 1) - 0.18), size * 0.05, size * 0.03, 0.4, 0, 2 * Math.PI); g.fill();
      } else {
        marginDots(st, hind, [0.03], 4, 0.008, col.vein); marginDots(st, hind, [0.065], 4, 0.006, '#c3d4e6');
        g.strokeStyle = col.vein; g.lineWidth = size * 0.02; g.stroke(p);
      }
    } else if (style === 'pieris') {
      veins(st, hind, shade(col.base, -0.12), 0.002);
      if (!hind) {
        const tip = new Path2D(); tip.moveTo(X(0.72), Y(lerpEdge(st, 0.72, 1))); tip.lineTo(X(1.02), Y(lerpEdge(st, 1, 1))); tip.lineTo(X(0.9), Y(lerpEdge(st, 0.9, 2))); tip.closePath();
        g.fillStyle = ventral ? shade(col.base, -0.1, '#d8d39a') : '#4a4744'; g.fill(tip);
        if (!ventral) dot(0.55, (lerpEdge(st, 0.55, 1) + lerpEdge(st, 0.55, 2)) / 2, 0.018, col.spot);
      } else if (ventral) { g.fillStyle = 'rgba(214,206,120,0.45)'; g.fillRect(0, 0, size, size); }
    } else if (style === 'morpho') {
      if (ventral) {
        g.fillStyle = '#6b4d33'; g.fillRect(0, 0, size, size);
        marginDots(st, hind, [0.12], 9, 0.03, '#d9b25f'); marginDots(st, hind, [0.12], 9, 0.018, '#1b120c');
      } else {
        const sh = g.createRadialGradient(X(0.3), Y(-0.2), size * 0.05, X(0.4), Y(-0.3), size * 0.7);
        sh.addColorStop(0, '#5fb8ff'); sh.addColorStop(0.5, col.base); sh.addColorStop(1, '#16306b');
        g.fillStyle = sh; g.fillRect(0, 0, size, size);
        g.strokeStyle = col.vein; g.lineWidth = size * 0.09; g.stroke(p);
        if (!hind) { g.lineWidth = size * 0.05; g.beginPath(); st.forEach((s, i) => (i ? g.lineTo(X(s[0]), Y(s[1])) : g.moveTo(X(s[0]), Y(s[1])))); g.stroke(); }
        marginDots(st, hind, [0.035], 5, 0.006, col.spot, hind ? 0 : 0.6);
      }
    } else if (style === 'fritillary') {
      veins(st, hind, shade(col.vein, 0.1), 0.003);
      const rows = hind ? [[0.25, 0.4], [0.45, 0.55], [0.62, 0.7]] : [[0.3, 0.3], [0.5, 0.45], [0.7, 0.62], [0.85, 0.75]];
      for (const [zf, cf] of rows) for (let k = 0; k < 6; k++) {
        const z = zf * zmax + (k - 2.5) * 0.035, le = lerpEdge(st, z, 1), te = lerpEdge(st, z, 2);
        dot(z, le - (le - te) * (cf + (k % 2) * 0.08), 0.009, col.spot);
      }
      marginDots(st, hind, [0.02], 3, 0.007, col.spot);
      if (ventral && hind) { g.fillStyle = 'rgba(170,190,150,0.5)'; g.fillRect(0, 0, size, size); g.strokeStyle = 'rgba(235,235,225,0.8)'; g.lineWidth = size * 0.012; for (const zf of [0.3, 0.55]) { g.beginPath(); g.moveTo(X(zf * zmax - 0.15), Y(lerpEdge(st, zf * zmax, 1))); g.lineTo(X(zf * zmax + 0.05), Y(lerpEdge(st, zf * zmax, 2))); g.stroke(); } }
    }
    g.restore();
  }
  return cv;
}
