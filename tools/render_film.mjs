// Render the monarch wake film headlessly, one deterministic frame at a time (film/index.html).
//
//   node tools/render_film.mjs                       # film/out/monarch_wake.mp4, 1920×1080
//   node tools/render_film.mjs --w 1080 --h 1920     # any size; the camera framing is set for 16:9
//   node tools/render_film.mjs --frames 0,300,600 --stills film/out/stills
//
// Uses the system Google Chrome (GPU WebGL through ANGLE/Metal) and puppeteer-core: installed here
// (npm i -D puppeteer-core), in the folder PUPPETEER_DIR points to, or in a sibling project's
// node_modules. Override the browser with CHROME.

import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function loadPuppeteer() {
  const tries = [process.env.PUPPETEER_DIR, ROOT, path.resolve(ROOT, '../../../my-media-os/tools/hyperframes_video/node_modules/')].filter(Boolean);
  for (const dir of tries) { try { return createRequire(path.join(dir, '/'))('puppeteer-core'); } catch { /* next */ } }
  console.error('puppeteer-core not found: run `npm i -D puppeteer-core` here or set PUPPETEER_DIR to a node_modules folder that has it.');
  process.exit(1);
}
const puppeteer = loadPuppeteer();

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const W = +args.w || 1920;
const H = +args.h || 1080;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.bin': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--hide-scrollbars'],
  protocolTimeout: 600000,
});
const tab = await browser.newPage();
tab.on('console', (m) => { if (['error', 'warn', 'log'].includes(m.type())) console.log('[page]', m.text()); });
tab.on('pageerror', (e) => console.log('[page error]', e.message));
await tab.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const query = new URLSearchParams({ render: '', w: W, h: H });
await tab.goto(`http://127.0.0.1:${port}/film/index.html?${query}`);
await tab.waitForFunction('window.sceneReady === true', { timeout: 300000 });
const NF = await tab.evaluate('window.NF');
const FPS = await tab.evaluate('window.FPS');

let frames = [...Array(NF).keys()];
if (args.frames) {
  frames = String(args.frames).split(',').flatMap((s) => {
    const [a, b] = s.split('-').map(Number);
    return b === undefined ? [a] : [...Array(b - a + 1).keys()].map((k) => a + k);
  });
}

const name = 'monarch_wake';
let ff = null;
if (args.stills) fs.mkdirSync(args.stills, { recursive: true });
else {
  const out = args.out || `film/out/${name}.mp4`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 17), '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
}

const t0 = Date.now();
for (const [k, n] of frames.entries()) {
  await tab.evaluate((i) => window.renderFrame(i), n);
  const img = await tab.screenshot({ type: args.stills ? (args.jpg ? 'jpeg' : 'png') : 'png', clip: { x: 0, y: 0, width: W, height: H } });
  if (ff) { if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r)); }
  else fs.writeFileSync(path.join(args.stills, `${name}_${String(n).padStart(4, '0')}.${args.jpg ? 'jpg' : 'png'}`), img);
  if (k % 30 === 0) console.log(`frame ${n} (${k + 1}/${frames.length}) ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
if (ff) { ff.stdin.end(); await new Promise((r) => ff.on('close', r)); }
await browser.close();
server.close();
console.log(`done: ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
