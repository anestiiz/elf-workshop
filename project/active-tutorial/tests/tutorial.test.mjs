import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { demoFrame, DURATION, NEXT_DELAY, createVisibleClock, lerpPoint, between } from '../timeline.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('collection runs from an empty bench through three actual parts to a packed gift', () => {
  assert.equal(demoFrame('collect', 0).count, 0);
  assert.equal(demoFrame('collect', 2).moving, true);
  for (const [time, count] of [[2.51, 1], [4.51, 2], [6.51, 3]]) assert.equal(demoFrame('collect', time).count, count);
  assert.equal(demoFrame('collect', 6.7).phase, 'assembled');
  assert.equal(demoFrame('collect', 8.2).shipping, true);
  assert.equal(demoFrame('collect', 8.6).phase, 'packed');
  assert.equal(demoFrame('collect', DURATION.collect - .01).complete, false);
  assert.equal(demoFrame('collect', DURATION.collect).complete, true);
  const total = DURATION.collect + DURATION.trash + 2 * NEXT_DELAY;
  assert.ok(total > 16 && total < 17, 'both demos and transitions should take about 17 visible seconds');
});

test('cleanup demonstrates both clicks, removal and a free slot without input', () => {
  assert.equal(demoFrame('trash', 0).phase, 'junk');
  assert.equal(demoFrame('trash', 1.7).press, true);
  assert.equal(demoFrame('trash', 2).armed, true);
  assert.equal(demoFrame('trash', 2.8).press, true);
  assert.equal(demoFrame('trash', 3.2).flying, true);
  assert.equal(demoFrame('trash', 3.7).clean, true);
  assert.equal(demoFrame('trash', DURATION.trash).complete, true);
});

test('a hidden or suspended page does not consume the demonstration timeline', () => {
  const clock = createVisibleClock(20);
  clock.tick(0);
  for (let t = 100; t <= 1000; t += 100) clock.tick(t);
  assert.ok(Math.abs(clock.tick(50000, false) - 1) < 1e-9);
  assert.ok(Math.abs(clock.tick(100000, false) - 1) < 1e-9);
  clock.suspend();
  assert.ok(Math.abs(clock.tick(200000) - 1) < 1e-9);
  assert.ok(Math.abs(clock.tick(200100) - 1.1) < 1e-9);
});

test('moving sprites stay between measured endpoints at every responsive size', () => {
  for (const width of [240, 338, 500]) {
    const from = { x: width * .15, y: 240 }, to = { x: width / 2, y: 140 };
    assert.deepEqual(lerpPoint(from, to, between(-1, 0, 1)), from);
    assert.deepEqual(lerpPoint(from, to, between(2, 0, 1)), to);
    const middle = lerpPoint(from, to, between(.5, 0, 1));
    assert.ok(middle.x > from.x && middle.x < to.x);
    assert.ok(middle.y < from.y && middle.y > to.y);
  }
});

test('the generated game preserves every byte outside tutorial and first-map onboarding', () => {
  const original = fs.readFileSync(path.join(root, 'assets/index-kXPXuDVO.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const entry = /src="\.\/assets\/(index-autotutorial-[^"]+\.js)"/.exec(html)[1];
  const ast = parse(original, { sourceType: 'module' });
  const oldPreview = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'Is');
  const oldModal = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'Ps');
  let oldPrimary;
  const findPrimary = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.arguments[1]?.type === 'ObjectExpression'
        && node.arguments[1].properties.some(p => p.key?.name === 'className' && p.value?.value === 'tut-btn-wrap')) oldPrimary = original.slice(node.start, node.end);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(findPrimary);
      else if (value && typeof value === 'object') findPrimary(value);
    }
  };
  findPrimary(oldModal.body);
  const generated = fs.readFileSync(path.join(root, 'assets', entry), 'utf8');
  const mapPosition = '(O.scrollTop=sa(p),!t.tourDone&&i?.())';
  const mapIntro = 't.tourDone?O.scrollTop=sa(p):(Ut(!0),O.scrollTop=O.scrollHeight,setTimeout(()=>{Yd(O,0,.3,()=>{setTimeout(()=>{Yd(O,sa(p),.45,()=>{Ut(!1),i?.()})},700)})},600))';
  assert.ok(generated.includes(mapPosition), 'First map opening must position the map immediately.');
  assert.ok(generated.includes(`(!l.play&&${oldPrimary})`), 'Autoplay steps must omit their primary button.');
  let restored = generated
    .replace(/^import\{createTutorialDemo[^\n]+\n/, '')
    .replace('var Is=createAutonomousTutorial(ze,C,G);', original.slice(oldPreview.start, oldPreview.end))
    .replace('advanceAutonomousTutorial(V2,u&&!!l.play,t,e);', '')
    .replace(`(!l.play&&${oldPrimary})`, oldPrimary)
    .replace('`tut-copy ${l.play?"tut-copy--autoplay":""}`', '"tut-copy"')
    .replace(mapPosition, mapIntro);
  assert.equal(restored, original);
  const moduleFile = /from"\.\/(tutorial-demo-[^"]+\.js)"/.exec(fs.readFileSync(path.join(root, 'assets', entry), 'utf8'))[1];
  const module = fs.readFileSync(path.join(root, 'assets', moduleFile), 'utf8');
  assert.doesNotMatch(module, /createElement\("video"|createElement\("canvas"/);
  assert.doesNotMatch(module, /onPointerDown|onClick/);
});
