import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { build, transform } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
// The live v41 runtime contains later changes absent from project/src (v30).
// Preserve the runtime outside onboarding: tutorial previews and the first map opening.
const baseJs = 'index-kXPXuDVO.js', baseCss = 'index-0PbqAdmS.css';
const base = await fs.readFile(path.join(root, 'assets', baseJs), 'utf8');
const sha = crypto.createHash('sha1').update(`blob ${Buffer.byteLength(base)}\0`).update(base).digest('hex');
if (sha !== '128ba83dc7fc2d845fbc52ec1cbf9da2507c8d38') throw Error('The v41 baseline changed; inspect its tutorial bindings before rebuilding.');
const ast = parse(base, { sourceType: 'module' });
const preview = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'Is');
const modal = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'Ps');
const map = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'rc');
if (!preview || !modal || !map) throw Error('Onboarding component boundaries not found.');
const mapIntro = 't.tourDone?O.scrollTop=sa(p):(Ut(!0),O.scrollTop=O.scrollHeight,setTimeout(()=>{Yd(O,0,.3,()=>{setTimeout(()=>{Yd(O,sa(p),.45,()=>{Ut(!1),i?.()})},700)})},600))';
const mapPosition = '(O.scrollTop=sa(p),!t.tourDone&&i?.())';
const mapIntroStart = base.indexOf(mapIntro, map.start);
if (mapIntroStart < map.start || mapIntroStart + mapIntro.length > map.end) throw Error('First map opening not found.');
const state = modal.body.body[0];
if (!base.slice(state.start, state.end).includes('[u,f]') || !base.slice(state.start, state.end).includes('V2.useState')) throw Error('Unexpected tutorial state bindings.');
const result = await build({ entryPoints: [path.join(here, 'TutorialDemo.jsx')], bundle: true, write: false, format: 'esm', minify: true, legalComments: 'none', target: 'es2020', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' });
const moduleJs = result.outputFiles[0].text;
const hash = source => crypto.createHash('sha256').update(source).digest('base64url').slice(0, 8);
const moduleName = `tutorial-demo-${hash(moduleJs)}.js`;
const edits = [
  { start: preview.start, end: preview.end, text: 'var Is=createAutonomousTutorial(ze,C,G);' },
  { start: state.end, end: state.end, text: 'advanceAutonomousTutorial(V2,u&&!!l.play,t,e);' },
  // Position immediately; keep the separate walking transition after a completed shift.
  { start: mapIntroStart, end: mapIntroStart + mapIntro.length, text: mapPosition },
];
let entry = base;
for (const edit of edits.sort((a, b) => b.start - a.start)) entry = entry.slice(0, edit.start) + edit.text + entry.slice(edit.end);
entry = `import{createTutorialDemo as createAutonomousTutorial,useDemoAdvance as advanceAutonomousTutorial}from"./${moduleName}";\n` + entry;
const cssPatch = await transform(await fs.readFile(path.join(here, 'autonomous-tutorial.css'), 'utf8'), { loader: 'css', minify: true, target: 'es2020' });
const css = await fs.readFile(path.join(root, 'assets', baseCss), 'utf8') + '\n' + cssPatch.code;
const entryName = `index-autotutorial-${hash(entry)}.js`, cssName = `index-autotutorial-${hash(css)}.css`;
let html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const scripts = html.match(/src="\.\/assets\/index-[^"]+\.js"/g), styles = html.match(/href="\.\/assets\/index-[^"]+\.css"/g);
if (scripts?.length !== 1 || styles?.length !== 1) throw Error('Expected one game entry and stylesheet.');
html = html.replace(scripts[0], `src="./assets/${entryName}"`).replace(styles[0], `href="./assets/${cssName}"`);
await fs.writeFile(path.join(root, 'assets', moduleName), moduleJs);
await fs.writeFile(path.join(root, 'assets', entryName), entry);
await fs.writeFile(path.join(root, 'assets', cssName), css);
await fs.writeFile(path.join(root, 'index.html'), html);
console.log(JSON.stringify({ version: 42, entry: entryName, module: moduleName, stylesheet: cssName, baseline_preserved: true }, null, 2));
