const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

function loadDrawFish(ctx) {
  const source = fs.readFileSync(new URL('./game.js', `file:///${__dirname.replace(/\\/g, '/')}/`), 'utf8');
  const match = source.match(/function drawFish\(o\)\{([\s\S]*?)\}\r?\n  function drawBoulder/);
  assert.ok(match, 'drawFish should remain available to render river fish');

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return Function('ctx', 'clamp', `return function drawFish(o){${match[1]}}`)(ctx, clamp);
}

function loadWalkingMarit(ctx, state) {
  const source = fs.readFileSync(new URL('./game.js', `file:///${__dirname.replace(/\\/g, '/')}/`), 'utf8');
  const match = source.match(/\/\/ Tydelig gangsyklus:[\s\S]*?function drawMarit\(\)\{([\s\S]*?)\}\r?\n  function drawIntroMarit/);
  assert.ok(match, 'the walking Teodor renderer should remain available');

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  return Function('ctx', 'state', 'clamp', 'ROCK_HIT_DURATION', `return function drawMarit(){${match[1]}}`)(ctx, state, clamp, 0.72);
}

function loadDeciduousTree(ctx) {
  const source = fs.readFileSync(new URL('./game.js', `file:///${__dirname.replace(/\\/g, '/')}/`), 'utf8');
  const match = source.match(/function deciduousTree\(([^)]*)\) \{([\s\S]*?)\}\r?\n  function pineTree/);
  assert.ok(match, 'the deciduous tree renderer should remain available');

  return Function('ctx', `return function deciduousTree(${match[1]}) {${match[2]}}`)(ctx);
}

function loadMountainBand(ctx, state, W, H) {
  const source = fs.readFileSync(new URL('./game.js', `file:///${__dirname.replace(/\\/g, '/')}/`), 'utf8');
  const match = source.match(/function mountainBand\(([^)]*)\)\{([\s\S]*?)\}\r?\n  function mountains/);
  assert.ok(match, 'the mountain renderer should remain available');
  const seededMatch = source.match(/function seeded\(index, salt = 0\) \{([\s\S]*?)\}/);
  assert.ok(seededMatch, 'the deterministic landscape seed helper should remain available');
  const seeded = Function(`return function seeded(index, salt = 0) {${seededMatch[1]}}`)();

  return Function('ctx', 'state', 'W', 'H', 'seeded', `return function mountainBand(${match[1]}) {${match[2]}}`)(ctx, state, W, H, seeded);
}

function recordingContext() {
  const strokes = [];
  const fills = [];
  const paths = [];
  let currentPath = [];

  const ctx = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    shadowColor: '',
    shadowBlur: 0,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() { currentPath = []; },
    moveTo(x, y) { currentPath.push(['moveTo', x, y]); },
    lineTo(x, y) { currentPath.push(['lineTo', x, y]); },
    bezierCurveTo(...points) { currentPath.push(['bezierCurveTo', ...points]); },
    quadraticCurveTo(...points) { currentPath.push(['quadraticCurveTo', ...points]); },
    arc(...points) { currentPath.push(['arc', ...points]); },
    ellipse(...points) { currentPath.push(['ellipse', ...points]); },
    roundRect(...points) { currentPath.push(['roundRect', ...points]); },
    fillRect(...points) { currentPath.push(['fillRect', ...points]); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    closePath() { currentPath.push(['closePath']); },
    stroke() {
      strokes.push({ color: this.strokeStyle, width: this.lineWidth, path: [...currentPath] });
      paths.push([...currentPath]);
    },
    fill() { fills.push({ color: this.fillStyle, path: [...currentPath] }); },
  };

  return { ctx, strokes, fills, paths };
}

function pathXSpan({ path }) {
  const xs = path.flatMap((operation) => operation.slice(1).filter(Number.isFinite).filter((_, index) => index % 2 === 0));
  return Math.max(...xs) - Math.min(...xs);
}

function firstCrater(fills) {
  const openingIndex = fills.findIndex(({ color, path }) => color === '#e64a1a' && path.some(([name]) => name === 'bezierCurveTo'));
  assert.ok(openingIndex > 0, 'a crater needs a lava opening and a back rim');
  return { backRim: fills[openingIndex - 1], opening: fills[openingIndex], foreground: fills[openingIndex + 1], river: fills[openingIndex + 2] };
}

test('jumping river fish is rendered only as white skeletal bones', () => {
  const recording = recordingContext();
  const drawFish = loadDrawFish(recording.ctx);

  drawFish({ x: 100, width: 27, currentY: 150, leap: 0.8, leapTime: 0.6 });

  assert.equal(recording.fills.length, 0, 'the skeleton must not contain a solid fish body');
  assert.ok(recording.strokes.length >= 8, 'the skeleton needs a spine, tail, skull, and separate ribs');
  assert.ok(recording.strokes.every(({ color }) => color === '#fffaf0'), 'every visible bone should be white');
});

test('side-view Teodor has hair spikes above the head', () => {
  const recording = recordingContext();
  const state = { player: { x: 0, y: 0, onGround: true, inv: 0 }, rockHitTimer: 0, fireGlow: 0, t: 0, boots: false, rainHat: false };

  loadWalkingMarit(recording.ctx, state)();

  const hairTop = Math.min(...recording.fills.flatMap(({ path }) => path.flatMap(operation => operation.slice(2).filter(Number.isFinite))));
  assert.ok(hairTop <= -4, 'the side-view hairstyle should visibly spike above the head');
});

test('equipped rain protection renders as a steel helmet rather than a yellow rain hat', () => {
  const recording = recordingContext();
  const state = { player: { x: 0, y: 0, onGround: true, inv: 0 }, rockHitTimer: 0, fireGlow: 0, t: 0, boots: false, rainHat: true };

  loadWalkingMarit(recording.ctx, state)();

  assert.ok(recording.fills.some(({ color }) => color === '#78909d'), 'the equipped helmet needs a steel dome');
  assert.ok(!recording.fills.some(({ color }) => color === '#f2c84b'), 'the old yellow rain hat must not render');
});

test('equipped helmet replaces Teodor\'s visible hair', () => {
  const recording = recordingContext();
  const state = { player: { x: 0, y: 0, onGround: true, inv: 0 }, rockHitTimer: 0, fireGlow: 0, t: 0, boots: false, rainHat: true };

  loadWalkingMarit(recording.ctx, state)();

  assert.ok(!recording.fills.some(({ color }) => color === '#b07a34'), 'hair should not poke through an equipped helmet');
});

test('equipped helmet has a higher, larger dome', () => {
  const recording = recordingContext();
  const state = { player: { x: 0, y: 0, onGround: true, inv: 0 }, rockHitTimer: 0, fireGlow: 0, t: 0, boots: false, rainHat: true };

  loadWalkingMarit(recording.ctx, state)();

  const dome = recording.fills.find(({ color }) => color === '#78909d');
  const coordinates = dome.path.flatMap((operation) => operation.slice(1).filter(Number.isFinite));
  assert.ok(Math.min(...coordinates.filter((_, index) => index % 2 === 1)) <= -2, 'the helmet dome should sit higher on the head');
  assert.ok(Math.min(...coordinates.filter((_, index) => index % 2 === 0)) <= 14, 'the larger dome should extend farther left');
  assert.ok(Math.max(...coordinates.filter((_, index) => index % 2 === 0)) >= 37, 'the larger dome should extend farther right');
});

test('leafless deciduous tree does not render a foliage canopy', () => {
  const recording = recordingContext();

  loadDeciduousTree(recording.ctx)(100, 300, 100, 1);

  assert.equal(recording.fills.length, 0, 'a deciduous tree should be only trunk and branches, without filled leaves');
});

test('leafless deciduous tree has branches reaching to both sides', () => {
  const recording = recordingContext();

  loadDeciduousTree(recording.ctx)(100, 300, 100, 1);

  const branchCoordinates = recording.strokes.flatMap(({ path }) => path.flatMap((operation) => operation.slice(1).filter(Number.isFinite)));
  assert.ok(recording.strokes.length >= 5, 'a bare tree should have a trunk and several branch strokes');
  assert.ok(branchCoordinates.some((value, index) => index % 2 === 0 && value < 0), 'branches should extend to the left');
  assert.ok(branchCoordinates.some((value, index) => index % 2 === 0 && value > 0), 'branches should extend to the right');
});

test('a deciduous tree keeps the same branch geometry while its screen position changes', () => {
  const firstFrame = recordingContext();
  const secondFrame = recordingContext();

  loadDeciduousTree(firstFrame.ctx)(100, 300, 100, 1, 71);
  loadDeciduousTree(secondFrame.ctx)(64, 300, 100, 1, 71);

  assert.deepEqual(secondFrame.strokes, firstFrame.strokes, 'scrolling a tree across the screen must not change its branch shape');
});

test('tall volcano has a mountain-coloured curved crater foreground', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const { foreground } = firstCrater(recording.fills);
  assert.equal(foreground.color, '#5a3a3c');
  assert.ok(foreground.path.some(([name]) => name === 'bezierCurveTo'), 'the front rim should blend into the mountain with curves');
});

test('crater opening is not rendered as a pair of lava ellipses', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const lavaEllipses = recording.fills.filter(({ color, path }) => color === '#e64a1a' && path.some(([name]) => name === 'ellipse'));
  assert.equal(lavaEllipses.length, 0, 'the crater lava should sit in a jagged opening rather than circular pools');
});

test('lava opening stays inside the mountain-coloured crater rim', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const { opening, foreground } = firstCrater(recording.fills);
  assert.ok(pathXSpan(opening) < pathXSpan(foreground), 'lava must not protrude past the front crater rim');
});

test('lava river is drawn in front of the crater foreground', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const { foreground } = firstCrater(recording.fills);
  const foregroundIndex = recording.fills.indexOf(foreground);
  const riverIndex = recording.fills.findIndex(({ color, path }) => color === '#e64a1a' && path.filter(([name]) => name === 'lineTo').length >= 10);
  assert.ok(riverIndex > foregroundIndex, 'the crater foreground must not cover the descending lava river');
});

test('crater foreground does not protrude beyond the back rim', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const { foreground, backRim } = firstCrater(recording.fills);
  assert.ok(pathXSpan(foreground) <= pathXSpan(backRim) * 1.1, 'the front rim should stay within the crater width');
  assert.deepEqual(foreground.path[0], backRim.path[0], 'the front and back rims must meet at the mountainside');
  assert.ok(!backRim.path.some(([name]) => name === 'lineTo'), 'the back rim should have no sharp vertical side walls');
});

test('crater does not render an orange zigzag outline above the back rim', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  assert.ok(!recording.strokes.some(({ color }) => color === 'rgba(255,175,85,.9)'), 'the separate orange zigzag line should be removed');
});

test('descending lava river overlaps the crater lava and has a wider mouth', () => {
  const recording = recordingContext();
  const state = { backgroundOffset: 0, t: 0 };

  loadMountainBand(recording.ctx, state, 100, 600)(.03, 455, '#5a3a3c', '#2b1a1e', 330, .28, .58, 2, true);

  const { opening, river } = firstCrater(recording.fills);
  const riverPoints = river.path.filter(([name]) => name === 'moveTo' || name === 'lineTo');
  const mouthLeft = riverPoints[0], mouthRight = riverPoints.at(-1);
  const lowerCurve = opening.path.findLast(([name]) => name === 'bezierCurveTo');
  const t = .5, centerBottom = (1-t)**3 * opening.path[0][2] + 3*(1-t)**2*t*lowerCurve[2] + 3*(1-t)*t*t*lowerCurve[4] + t**3*lowerCurve[6];
  assert.ok(mouthLeft[2] > opening.path[0][2] && mouthLeft[2] < centerBottom, 'the mouth must begin inside the lava opening, without a vertical gap');
  const openingLeft = opening.path[0][1], openingRight = opening.path[1].at(-2);
  assert.ok(mouthLeft[1] > openingLeft && mouthRight[1] < openingRight, 'the river mouth must stay inside the lava opening');
  const mouthWidth = mouthRight[1] - mouthLeft[1];
  const downstreamWidth = riverPoints.at(-2)[1] - riverPoints[1][1];
  assert.ok(mouthWidth > downstreamWidth, 'the wider river mouth should taper as lava descends');
});
