// Minimal static SVG line charts for the study report (light surface, one y-scale per chart,
// 2 px lines, hairline grid, legend plus end labels when there are two or more series,
// optional downstroke bands). Colours are the validated light-mode reference slots.

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781', GRID = '#e1e0d9', AXIS = '#c3c2b7', SURF = '#fcfcfb', BAND = '#f0efec';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function nice(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

// series: [{ label, x: [], y: [] }], bands: [[x0, x1], …], ref: y value for a reference line
export function lineChart({ title, xLabel, yLabel, series, bands = [], ref = null, width = 640, height = 300, xTicks = null, yFmt = (v) => String(+v.toFixed(3)) }) {
  const padL = 56, padR = series.length > 1 ? 120 : 24, padT = 40, padB = 46;
  const xs = series.flatMap((s) => s.x), ys = series.flatMap((s) => s.y).filter(Number.isFinite);
  if (ref != null) ys.push(ref);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const st = nice((y1 - y0) / 4 || 1); y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st;
  const X = (v) => padL + (v - x0) / (x1 - x0 || 1) * (width - padL - padR);
  const Y = (v) => padT + (y1 - v) / (y1 - y0 || 1) * (height - padT - padB);
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" role="img" aria-label="${esc(title)}">`);
  o.push(`<rect width="${width}" height="${height}" fill="${SURF}"/>`);
  o.push(`<text x="${padL}" y="22" font-size="14" font-weight="600" fill="${INK}">${esc(title)}</text>`);
  for (const [a, b] of bands) o.push(`<rect x="${X(Math.max(a, x0)).toFixed(1)}" y="${padT}" width="${(X(Math.min(b, x1)) - X(Math.max(a, x0))).toFixed(1)}" height="${height - padT - padB}" fill="${BAND}"/>`);
  for (let v = y0; v <= y1 + 1e-9; v += st) {
    const y = Y(v).toFixed(1);
    o.push(`<line x1="${padL}" x2="${width - padR}" y1="${y}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`);
    o.push(`<text x="${padL - 8}" y="${y}" font-size="11" fill="${MUTED}" text-anchor="end" dominant-baseline="middle">${esc(yFmt(v))}</text>`);
  }
  const ticks = xTicks || (() => { const s2 = nice((x1 - x0) / 5 || 1), out = []; for (let v = Math.ceil(x0 / s2) * s2; v <= x1 + 1e-9; v += s2) out.push(+v.toFixed(6)); return out; })();
  for (const v of ticks) { const x = X(v).toFixed(1); o.push(`<line x1="${x}" x2="${x}" y1="${height - padB}" y2="${height - padB + 4}" stroke="${AXIS}"/><text x="${x}" y="${height - padB + 17}" font-size="11" fill="${MUTED}" text-anchor="middle">${esc(String(v))}</text>`); }
  o.push(`<line x1="${padL}" x2="${width - padR}" y1="${height - padB}" y2="${height - padB}" stroke="${AXIS}"/>`);
  if (ref != null) o.push(`<line x1="${padL}" x2="${width - padR}" y1="${Y(ref).toFixed(1)}" y2="${Y(ref).toFixed(1)}" stroke="${INK2}" stroke-width="1" opacity="0.6"/>`);
  o.push(`<text x="${(padL + width - padR) / 2}" y="${height - 8}" font-size="12" fill="${INK2}" text-anchor="middle">${esc(xLabel)}</text>`);
  o.push(`<text x="14" y="${(padT + height - padB) / 2}" font-size="12" fill="${INK2}" text-anchor="middle" transform="rotate(-90 14 ${(padT + height - padB) / 2})">${esc(yLabel)}</text>`);
  series.forEach((s, k) => {
    const pts = s.x.map((x, i) => (Number.isFinite(s.y[i]) ? `${X(x).toFixed(1)},${Y(s.y[i]).toFixed(1)}` : null)).filter(Boolean);
    const col = s.color || SERIES[k % SERIES.length];
    o.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ''}/>`);
    if (series.length > 1) {
      const lx = X(s.x[s.x.length - 1]), ly = Y(s.y[s.y.length - 1]);
      o.push(`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="5" fill="${SURF}"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="${col}"/>`);
    }
  });
  if (series.length > 1) { // legend in the right margin, line keys
    series.forEach((s, k) => {
      const y = padT + 8 + k * 18, col = s.color || SERIES[k % SERIES.length];
      o.push(`<line x1="${width - padR + 14}" x2="${width - padR + 30}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="2"${s.dash ? ' stroke-dasharray="5 4"' : ''}/><text x="${width - padR + 36}" y="${y}" font-size="11.5" fill="${INK2}" dominant-baseline="middle">${esc(s.label)}</text>`);
    });
  }
  o.push('</svg>');
  return o.join('\n');
}
