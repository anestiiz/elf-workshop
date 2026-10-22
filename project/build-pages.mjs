// Вариант сборки для GitHub Pages (сайт в подпапке /elf-workshop/): берём landing-… и делаем пути относительными.
import fs from 'fs'; import path from 'path';
const P = '/home/claude/elf/platform';
const D = fs.readdirSync(P).filter((d) => d.startsWith('landing-')).sort().pop();
const OUT = process.argv[2];
for (const f of fs.readdirSync(OUT)) if (!['.git', 'project', 'README.md'].includes(f)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
fs.cpSync(path.join(P, D), OUT, { recursive: true });
let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
html = html.replace(/(href|src)="\/(?!\/)([^"]+)"/g, '$1="./$2"');
// картинки через getStaticUrl: база = папка страницы (как BASE_STATIC_URL на проде)
html = html.replace('<script type="module"', `<script>window.BASE_STATIC_URL = new URL('./', location.href).href; window.ENV = 'PROD';</script>\n  <script type="module"`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log('pages from', D);
