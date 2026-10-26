// Small-multiple strip charts on canvas: one quantity per chart, a shared time axis in wingbeats,
// downstroke bands, a crosshair that snaps to the nearest sample and one tooltip for every series.

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class StripChart {
  constructor(host, { title, unit, series, ref = null, fmt = (v) => v.toFixed(2) }) {
    this.series = series; this.ref = ref; this.fmt = fmt; this.unit = unit;
    this.el = document.createElement('figure'); this.el.className = 'chart';
    const cap = document.createElement('figcaption');
    const t = document.createElement('span'); t.className = 'chart-title'; t.textContent = title;
    const u = document.createElement('span'); u.className = 'chart-unit'; u.textContent = unit;
    cap.append(t, u);
    this.legend = document.createElement('span'); this.legend.className = 'chart-legend';
    cap.append(this.legend);
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img'); this.canvas.setAttribute('aria-label', title + ' over the last wingbeats');
    this.canvas.tabIndex = 0;
    this.tip = document.createElement('div'); this.tip.className = 'chart-tip'; this.tip.hidden = true;
    this.el.append(cap, this.canvas, this.tip);
    host.append(this.el);
    this.hoverX = null;
    this.canvas.addEventListener('pointermove', (e) => { const r = this.canvas.getBoundingClientRect(); this.hoverX = (e.clientX - r.left) / r.width; this.draw(this.last); });
    this.canvas.addEventListener('pointerleave', () => { this.hoverX = null; this.tip.hidden = true; this.draw(this.last); });
    this.canvas.addEventListener('focus', () => { this.hoverX = 0.98; this.draw(this.last); });
    this.canvas.addEventListener('blur', () => { this.hoverX = null; this.tip.hidden = true; this.draw(this.last); });
    this.canvas.addEventListener('keydown', (e) => { if (this.hoverX == null) return; if (e.key === 'ArrowLeft') this.hoverX = Math.max(0, this.hoverX - 0.01); if (e.key === 'ArrowRight') this.hoverX = Math.min(1, this.hoverX + 0.01); this.draw(this.last); });
    this.setLegend(series);
  }
  setLegend(series) {
    this.series = series;
    this.legend.replaceChildren();
    if (series.filter((s) => !s.hidden).length < 2) return;
    for (const s of series) {
      if (s.hidden) continue;
      const k = document.createElement('span'); k.className = 'key';
      const sw = document.createElement('i'); sw.style.background = css(s.color);
      const l = document.createElement('span'); l.textContent = s.label;
      k.append(sw, l); this.legend.append(k);
    }
  }
  // data: { t: [], cycle: [], down: [bool], values: { key: [] } }, window in cycles
  draw(data) {
    if (!data || !data.t.length) return;
    this.last = data;
    const cv = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const padL = 34, padR = 8, padT = 6, padB = 18;
    const x0 = data.cycle[0], x1 = Math.max(x0 + 1e-6, data.cycle[data.cycle.length - 1]);
    const span = Math.max(x1 - x0, data.window || 3);
    const X = (c) => padL + (c - (x1 - span)) / span * (W - padL - padR);
    // y range from visible series and the reference line
    let lo = Infinity, hi = -Infinity;
    for (const s of this.series) { if (s.hidden) continue; const v = data.values[s.key]; if (!v) continue; for (const y of v) if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
    if (this.ref != null) { lo = Math.min(lo, this.ref); hi = Math.max(hi, this.ref); }
    if (!isFinite(lo)) return;
    const tick = niceStep((hi - lo) / 3 || 1);
    lo = Math.floor(lo / tick) * tick; hi = Math.ceil(hi / tick) * tick; if (hi === lo) hi = lo + tick;
    const Y = (v) => padT + (hi - v) / (hi - lo) * (H - padT - padB);
    // downstroke bands
    g.fillStyle = css('--band');
    let start = null;
    for (let i = 0; i < data.t.length; i++) {
      if (data.down[i] && start == null) start = i;
      if ((!data.down[i] || i === data.t.length - 1) && start != null) { g.fillRect(X(data.cycle[start]), padT, X(data.cycle[i]) - X(data.cycle[start]), H - padT - padB); start = null; }
    }
    // grid and axes
    g.strokeStyle = css('--hair'); g.lineWidth = 1; g.font = '10px ' + css('--font-data'); g.fillStyle = css('--muted');
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let v = lo; v <= hi + 1e-9; v += tick) { const y = Math.round(Y(v)) + 0.5; g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.fillText(this.fmt(v, tick), padL - 5, y); }
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let c = Math.ceil(x1 - span); c <= x1; c++) { const x = Math.round(X(c)) + 0.5; g.strokeStyle = css('--axis'); g.beginPath(); g.moveTo(x, H - padB); g.lineTo(x, H - padB + 4); g.stroke(); g.fillText(String(c), x, H - padB + 5); }
    if (this.ref != null) { g.strokeStyle = css('--ink-2'); g.globalAlpha = 0.55; const y = Math.round(Y(this.ref)) + 0.5; g.beginPath(); g.moveTo(padL, y); g.lineTo(W - padR, y); g.stroke(); g.globalAlpha = 1; }
    // series
    g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
    for (const s of this.series) {
      if (s.hidden) continue; const v = data.values[s.key]; if (!v) continue;
      g.strokeStyle = css(s.color); g.beginPath(); let pen = false;
      for (let i = 0; i < v.length; i++) { if (!isFinite(v[i])) { pen = false; continue; } const x = X(data.cycle[i]), y = Y(v[i]); pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; }
      g.stroke();
      // end dot with a surface ring
      const n = v.length - 1; if (isFinite(v[n])) { g.fillStyle = css('--surface'); g.beginPath(); g.arc(X(data.cycle[n]), Y(v[n]), 6, 0, 2 * Math.PI); g.fill(); g.fillStyle = css(s.color); g.beginPath(); g.arc(X(data.cycle[n]), Y(v[n]), 4, 0, 2 * Math.PI); g.fill(); }
    }
    // crosshair and tooltip
    if (this.hoverX != null) {
      const cx = padL + this.hoverX * (W - padL - padR - 0) ;
      const cyc = (x1 - span) + (cx - padL) / (W - padL - padR) * span;
      let best = 0, bd = Infinity; for (let i = 0; i < data.cycle.length; i++) { const d = Math.abs(data.cycle[i] - cyc); if (d < bd) { bd = d; best = i; } }
      const x = Math.round(X(data.cycle[best])) + 0.5;
      g.strokeStyle = css('--ink-2'); g.lineWidth = 1; g.beginPath(); g.moveTo(x, padT); g.lineTo(x, H - padB); g.stroke();
      this.tip.replaceChildren();
      const head = document.createElement('div'); head.className = 'tip-head';
      head.textContent = `beat ${data.cycle[best].toFixed(2)} · ${data.down[best] ? 'downstroke' : 'upstroke'}`;
      this.tip.append(head);
      for (const s of this.series) {
        if (s.hidden) continue; const v = data.values[s.key]; if (!v || !isFinite(v[best])) continue;
        const row = document.createElement('div'); row.className = 'tip-row';
        const key = document.createElement('i'); key.style.background = css(s.color);
        const val = document.createElement('b'); val.textContent = this.fmt(v[best], 0.01) + ' ' + this.unit;
        const lab = document.createElement('span'); lab.textContent = s.label;
        row.append(key, val, lab); this.tip.append(row);
      }
      this.tip.hidden = false;
      const left = Math.min(W - 150, Math.max(0, x + 10));
      this.tip.style.left = left + 'px';
    }
  }
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
