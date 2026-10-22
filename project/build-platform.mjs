// Эмуляция `vite build` с vite.config.js платформы (у меня нет Linux-бинарей Rollup):
// landing-YYYYMMDDHHMM/ { index.html, assets/index-[hash].js|css, elf/… из public }
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'fs'; import crypto from 'crypto'; import path from 'path';
const ROOT = '/home/claude/elf/platform/elf-workshop';
const VERSION = fs.readFileSync('/home/claude/elf/VERSION', 'utf8').trim();
const dirName = `landing-${new Date().toISOString().slice(0, 16).replace(/[^0-9]/g, '')}`;
const OUT = path.join('/home/claude/elf/platform', dirName);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT + '/assets', { recursive: true });
const h = (b) => crypto.createHash('sha256').update(b).digest('base64url').slice(0, 8);
const r = await build({
  entryPoints: [ROOT + '/src/main.jsx'], bundle: true, write: false, outdir: OUT + '/assets',
  minify: true, legalComments: 'none', jsx: 'automatic', format: 'esm',
  nodePaths: ['/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"production"' },
  target: 'es2020', logLevel: 'warning',
});
const js = r.outputFiles.find((f) => f.path.endsWith('.js')).contents;
const css = r.outputFiles.find((f) => f.path.endsWith('.css')).contents;
const jsName = `index-${h(js)}.js`, cssName = `index-${h(css)}.css`;
fs.writeFileSync(`${OUT}/assets/${jsName}`, js); fs.writeFileSync(`${OUT}/assets/${cssName}`, css);
let html = fs.readFileSync(ROOT + '/index.html', 'utf8');
html = html.replace(/\s*<script type="module" src="\/src\/main.jsx"><\/script>/, '')
  .replace('</head>', `  <script type="module" crossorigin src="/assets/${jsName}"></script>\n  <link rel="stylesheet" crossorigin href="/assets/${cssName}">\n  </head>`);
fs.writeFileSync(`${OUT}/index.html`, html);
fs.cpSync(ROOT + '/public', OUT, { recursive: true });   // как плагин optimize-and-copy-public
console.log('v' + VERSION, dirName, jsName, (js.length / 1024).toFixed(0) + 'KB', cssName, (css.length / 1024).toFixed(0) + 'KB');
