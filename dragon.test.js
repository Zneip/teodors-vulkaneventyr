const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

// Run the actual encounter, weather and spawn functions with a deterministic clock.
function dragonWorld(overrides = {}) {
  const source = fs.readFileSync(`${__dirname}/game.js`, 'utf8');
  const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
  const state = {
    distance: 40000, dragon: null, dragonClock: 0, objects: [], hearts: 5,
    player: { x: 140, y: 362, w: 33, h: 58, onGround: true, inv: 0 },
    fireGlow: 0, restTimer: 0, restStop: null, restDeferred: false, nextRestDistance: 70000,
    avalancheClock: 20, avalancheLeadIn: 0, avalancheDuration: 0, avalancheLevel: 0,
    weatherPhase: 'clear', rainClock: 1000000, rain: 0, strength: 1, rainHat: false,
    spawn: 0, nextHeart: 2, riverSafeTimer: 0, speed: 400, ended: false,
    ...overrides,
  };
  const effects = { prompts: [], speedDrops: 0, flameSounds: 0, heartAnimations: [] };
  const constants = [...source.matchAll(/  const DRAGON_\w+ = [^;]+;/g)].map(match => match[0]).join('\n');
  const collide = (a, b) => a.x < b.x+b.width && a.x+a.w > b.x && a.y < b.y+b.height && a.y+a.h > b.y;
  const fakeMath = Object.create(Math);fakeMath.random = () => .1;
  const api = Function('state', 'W', 'ground', 'rand', 'clamp', 'sounds', 'showPrompt', 'collide', 'endGame', 'animateRockHeartLoss', 'decreaseRunSpeed', 'syncRainStrengthEffect', 'MIN_STRENGTH', 'REST_STOP_RIVER_CLEARANCE_DISTANCE', 'debugSettings', 'Math', 'SfxStore', `
    ${constants}
    ${section('  function addObject(', '  function updateEvents(')}
    ${section('  function updateEvents(', '  function collide(')}
    ${section('  function applyImpactDamage(', '  function addSplash(')}
    ${section('  function rockfallInProgress(', '  function prepareRestStop(')}
    return {updateEvents, updateDragon, dragonFlames, dragonTouchesPlayer, dragonClearanceActive, rockfallInProgress, spawnWorld, applyImpactDamage};
  `)(state, 960, 420, (min, max) => (min+max)/2, (v, min, max) => Math.max(min, Math.min(max, v)),
    { fire(){effects.flameSounds++;}, bonfire(){effects.flameSounds++;}, rumble(){}, rain(){}, rainStop(){}, splash(){}, thunder(){}, fireball(){effects.flameSounds++;} }, text => effects.prompts.push(text), collide,
    () => {state.ended=true;}, (...args) => effects.heartAnimations.push(args), () => effects.speedDrops++, () => {}, .05, 700, {rollingShare:70}, fakeMath,
    { startLoop(){return false;}, stopLoop(){}, stopAllLoops(){} });
  return {state, effects, ...api};
}

test('dragons unlock at 40 km and honour their initial countdown', () => {
  const world = dragonWorld({distance:39999, dragonClock:8});
  world.updateDragon(60);
  assert.equal(world.state.dragon, null);
  assert.equal(world.state.dragonClock, 8);
  world.state.distance=40000;
  world.updateDragon(7);
  assert.equal(world.state.dragon, null);
  world.updateDragon(1);
  assert.ok(world.state.dragon);
  assert.match(world.effects.prompts[0], /bakken/);
  assert.deepEqual(world.dragonFlames(world.state.dragon), [], 'arrival warning must precede fire');
});

test('dragons wait for rockfall warning, active rockfall and remaining rocks', () => {
  for(const overrides of [
    {avalancheLeadIn:1}, {avalancheDuration:3},
    {objects:[{type:'boulder',x:1200,width:73}]},
    {objects:[{type:'boulder',x:-20,width:73,hit:true}]},
  ]){
    const world=dragonWorld(overrides);world.updateDragon(.1);
    assert.equal(world.state.dragon,null);
  }
  const cleared=dragonWorld({objects:[{type:'boulder',x:-74,width:73}]});
  cleared.updateDragon(.1);assert.ok(cleared.state.dragon);
});

test('dragon reserves a river-free path and waits for existing lava to pass', () => {
  const world=dragonWorld({objects:[{type:'creek',x:300,width:180}]});
  assert.equal(world.dragonClearanceActive(),true);
  world.spawnWorld(.1);
  assert.equal(world.state.objects.filter(o=>o.type==='creek').length,1);
  world.updateDragon(.1);assert.equal(world.state.dragon,null);
  world.state.objects[0].x=-200;
  world.updateDragon(.1);assert.ok(world.state.dragon);
  world.state.spawn=0;world.spawnWorld(.1);
  assert.equal(world.state.objects.filter(o=>o.type==='creek').length,1);
});

test('rockfall clock cannot start a rockfall during the entire dragon flight', () => {
  const world=dragonWorld({avalancheClock:.001});
  world.updateEvents(.016);
  assert.ok(world.state.dragon);
  for(let frame=0;frame<1000&&world.state.dragon;frame++){
    assert.equal(world.state.avalancheClock,.001);
    world.spawnWorld(.016);world.updateEvents(.016);
    assert.equal(world.state.avalancheLeadIn,0);
    assert.equal(world.state.avalancheDuration,0);
    assert.ok(!world.state.objects.some(o=>o.type==='boulder'));
  }
  assert.equal(world.state.dragon,null,'the encounter must finish');
  assert.ok(world.state.avalancheClock>3,'allow breathing room after the dragon');
  for(let frame=0;frame<260;frame++)world.updateEvents(.016);
  assert.ok(world.state.avalancheLeadIn>0||world.state.avalancheDuration>0,'rockfalls must resume');
});

test('grounded players are safe from the body and every fire pulse', () => {
  const world=dragonWorld();world.updateDragon(.016);
  for(let frame=0;frame<950;frame++){
    world.updateDragon(.016);
    if(!world.state.dragon)break;
    for(const f of world.dragonFlames(world.state.dragon)){
      assert.ok(f.y+f.r<420-world.state.player.h,'visible fire must stay above standing head height');
      world.state.player.x=f.x-world.state.player.w/2;
      assert.equal(world.dragonTouchesPlayer(world.state.dragon,[f]),false);
    }
  }
  assert.equal(world.state.hearts,5);
  assert.equal(world.effects.speedDrops,0);
});

test('jumping into fire applies stone damage and respects damage invulnerability', () => {
  const world=dragonWorld({dragon:{age:8.75,x:407,breathing:false,events:[{start:8.2,type:'flame'}]}});
  const flame=world.dragonFlames(world.state.dragon)[14];
  Object.assign(world.state.player,{x:flame.x-16,y:flame.y-30,onGround:false});
  world.updateDragon(.016);
  assert.equal(world.state.hearts,3);
  assert.deepEqual(world.effects.heartAnimations,[[5,3,true]],'lost hearts should fly away from the player');
  assert.equal(world.effects.speedDrops,1);
  assert.ok(world.state.player.inv>0);
  world.updateDragon(.016);
  assert.equal(world.state.hearts,3,'a single pass must not drain hearts each frame');
  assert.equal(world.effects.heartAnimations.length,1);
  assert.ok(world.effects.flameSounds>0);
});

test('lava volleys replace flames and never overlap them', () => {
  const world=dragonWorld({dragon:{age:5.85,x:760,events:[{start:5.8,type:'lava'},{start:9.4,type:'flame'}]}});
  world.updateDragon(.016);
  const balls=world.state.objects.filter(o=>o.type==='lavaball');
  assert.ok(balls.length>=2&&balls.length<=3,'a lava volley spawns rolling balls');
  assert.ok(balls.every(b=>b.holding),'balls emerge one by one from the mouth');
  assert.ok(Math.abs(balls[0].x-(world.state.dragon.x-76-balls[0].width*.5))<1,'the first ball sits in the mouth');
  assert.deepEqual(world.dragonFlames(world.state.dragon),[],'no flames during a lava volley');
  assert.ok(world.state.dragon.breathing,'the dragon opens its mouth to spit');
  assert.equal(world.state.hearts,5,'a grounded player must be safe from a volley');
  world.state.dragon.age=9.5;
  assert.deepEqual(world.dragonFlames(world.state.dragon),[],'no flames while lava balls remain on screen');
  world.state.objects=[];
  assert.ok(world.dragonFlames(world.state.dragon).length>0,'flames resume once the ground is clear');
});

test('dragon and stone damage use identical rounding for small and large heart totals', () => {
  for(const [before,after] of [[1,0],[2,1],[3,2],[4,2],[5,3],[10,7],[15,10],[100,70]]){
    const stone=dragonWorld({hearts:before});stone.applyImpactDamage();
    const dragon=dragonWorld({hearts:before,dragon:{age:8.75,x:407,breathing:false,events:[{start:8.2,type:'flame'}]}});
    const flame=dragon.dragonFlames(dragon.state.dragon)[14];
    Object.assign(dragon.state.player,{x:flame.x-16,y:flame.y-30,onGround:false});
    dragon.updateDragon(.016);
    assert.equal(stone.state.hearts,after);assert.equal(dragon.state.hearts,after);
    assert.deepEqual(stone.effects.heartAnimations,[[before,after,false]]);
    assert.deepEqual(dragon.effects.heartAnimations,[[before,after,true]]);
  }
});

test('airborne players outside the flames are not hit', () => {
  const world=dragonWorld({dragon:{age:2.6,x:700,breathing:true}});
  Object.assign(world.state.player,{x:20,y:220,onGround:false});
  assert.equal(world.dragonTouchesPlayer(world.state.dragon,world.dragonFlames(world.state.dragon)),false);
});

test('a final airborne hit ends the run', () => {
  const world=dragonWorld({hearts:1,dragon:{age:8.75,x:407,breathing:false,events:[{start:8.2,type:'flame'}]}});
  const flame=world.dragonFlames(world.state.dragon)[14];
  Object.assign(world.state.player,{x:flame.x-16,y:flame.y-30,onGround:false});
  world.updateEvents(.016);
  assert.equal(world.state.hearts,0);
  assert.equal(world.state.ended,true);
  assert.equal(world.state.avalancheLeadIn,0);
});

test('dragon encounters defer around huts and do not advance while the world is stopped', () => {
  for(const overrides of [{restStop:{approaching:true}},{restTimer:1},{restDeferred:true},{fireGlow:2},{nextRestDistance:40500}]){
    const world=dragonWorld(overrides);world.updateDragon(1);assert.equal(world.state.dragon,null);
  }
  const world=dragonWorld({dragon:{age:4,x:400,breathing:false}});
  world.updateDragon(0);assert.equal(world.state.dragon.age,4);
});

test('weather continues during a dragon flight', () => {
  const world=dragonWorld({dragon:{age:2.5,x:700},weatherPhase:'darkening',weatherTimer:1,skyDarkness:0});
  world.updateEvents(.1);
  assert.ok(world.state.skyDarkness>0);
  assert.ok(world.state.dragon.age>2.5);
});

test('repeated encounters and rockfalls remain mutually exclusive over a long run', () => {
  const world=dragonWorld();let dragonCount=0,wasDragon=false;
  for(let frame=0;frame<30000;frame++){
    for(const o of world.state.objects)o.x-=world.state.speed*.016;
    world.state.objects=world.state.objects.filter(o=>o.x+o.width>0);
    world.state.player.inv=Math.max(0,world.state.player.inv-.016);
    world.spawnWorld(.016);world.updateEvents(.016);
    const isDragon=Boolean(world.state.dragon);
    if(isDragon&&!wasDragon)dragonCount++;
    assert.ok(!(isDragon&&world.rockfallInProgress()));
    wasDragon=isDragon;
  }
  assert.ok(dragonCount>=3,'dragons must recur without being starved by rivers or rockfalls');
  assert.ok(world.state.avalancheLevel>=3,'rockfalls must continue between dragon encounters');
  assert.equal(world.state.hearts,5);
});
