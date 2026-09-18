(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const ui = {
    distance: document.querySelector('#distance'), hearts: document.querySelector('#hearts'), heartCounter: document.querySelector('#heartCounter'),
    statusDock: document.querySelector('#statusDock'), speedPanel: document.querySelector('#speedPanel'), speedFill: document.querySelector('#speedFill'), strengthPanel: document.querySelector('#strengthPanel'), strengthFill: document.querySelector('#strengthFill'), fishMeter: document.querySelector('#fishMeter'), fishSlots: [...document.querySelectorAll('#fishMeter .fish-slot')], bonfire: document.querySelector('#bonfireButton'), banner: document.querySelector('#eventBanner'), restCountdown: document.querySelector('#restCountdown'), restCountdownLabel: document.querySelector('#restCountdownLabel'), restCountdownValue: document.querySelector('#restCountdownValue'), restActions: document.querySelector('#restActions'), restContinue: document.querySelector('#restContinueButton'),
    shopOverlay: document.querySelector('#shopOverlay'), shopClose: document.querySelector('#shopCloseButton'), shopUndo: document.querySelector('#shopUndoButton'), shopTitle: document.querySelector('#shopTitle'), shopHearts: document.querySelector('#shopHearts'), shopStrengthStatus: document.querySelector('#shopStrengthStatus'), shopStrengthFill: document.querySelector('#shopStrengthFill'), shopFishMeter: document.querySelector('#shopFishMeter'), shopFishSlots: [...document.querySelectorAll('#shopFishMeter .fish-slot')], shopStatus: document.querySelector('#shopStatus'), shopItems: [...document.querySelectorAll('[data-shop-item]')], shopInventory: document.querySelector('#shopInventory'), snackButton: document.querySelector('#snackButton'), snackCount: document.querySelector('#snackCount'), firstAidBadge: document.querySelector('#firstAidBadge'), firstAidCount: document.querySelector('#firstAidCount'),
    start: document.querySelector('#startScreen'), howToPlay: document.querySelector('#howToPlayScreen'), howToPlayOpen: document.querySelector('#howToPlayButton'), howToPlayBack: document.querySelector('#howToPlayBackButton'), gameOver: document.querySelector('#gameOverScreen'), final: document.querySelector('#finalScore'), record: document.querySelector('#newRecord'), high: document.querySelector('#highScore'), leaderboardList: document.querySelector('#leaderboardList'), leaderboardStatus: document.querySelector('#leaderboardStatus'), leaderboardRefresh: document.querySelector('#leaderboardRefreshButton'), scoreForm: document.querySelector('#scoreForm'), scoreName: document.querySelector('#scoreName'), scoreSubmit: document.querySelector('#scoreSubmit'), scoreStatus: document.querySelector('#scoreStatus'), sound: document.querySelector('#soundButton'),
    pause: document.querySelector('#pauseButton'), pauseLabel: document.querySelector('#pauseLabel'), quit: document.querySelector('#quitButton'), pauseOverlay: document.querySelector('#pauseOverlay'), quitConfirmOverlay: document.querySelector('#quitConfirmOverlay'), quitConfirmText: document.querySelector('#quitConfirmText'), quitConfirm: document.querySelector('#quitConfirmButton'), quitCancel: document.querySelector('#quitCancelButton'),
    gameActions: document.querySelector('#gameActions'), debugPanel: document.querySelector('#debugPanel'), debugRotation: document.querySelector('#debugRotation'), debugRollSpeed: document.querySelector('#debugRollSpeed'), debugRollingShare: document.querySelector('#debugRollingShare'), fullscreen: document.querySelector('#fullscreenButton'), fullscreenLabel: document.querySelector('#fullscreenLabel'), fullscreenIcon: document.querySelector('#fullscreenIcon'), fullscreenHelp: document.querySelector('#fullscreenHelp'), fullscreenHelpClose: document.querySelector('#fullscreenHelpClose'), priceEditorOverlay: document.querySelector('#priceEditorOverlay'), priceEditorForm: document.querySelector('#priceEditorForm'), priceEditorFields: [...document.querySelectorAll('[data-price-field]')], priceEditorStatus: document.querySelector('#priceEditorStatus'), priceEditorSave: document.querySelector('#priceEditorSave'), priceEditorDefaults: document.querySelector('#priceEditorDefaults'), priceEditorCancel: document.querySelector('#priceEditorCancel'), frame: document.querySelector('.game-frame'),
    tutorial: document.querySelector('#tutorialOverlay'), tutorialTitle: document.querySelector('#tutorialTitle'), tutorialText: document.querySelector('#tutorialText'), tutorialContinue: document.querySelector('#tutorialContinue'), orientationBlocker: document.querySelector('#orientationBlocker'), helpToggles: [...document.querySelectorAll('.help-toggle-input')], difficultyButtons: [...document.querySelectorAll('[data-difficulty]')]
  };

  // Kept behind a small interface so a future API adapter can replace localStorage without touching gameplay.
  const ScoreStore = {
    key: 'teodors-vulkaneventyr.high-score',
    get() { return Number(localStorage.getItem(this.key) || 0); },
    save(score) { const best = Math.max(this.get(), Math.floor(score)); localStorage.setItem(this.key, best); return best; }
    // Future implementation: async save(score) { return fetch('/api/high-scores', { method:'POST', body: JSON.stringify({score}) }); }
  };
  const PlayerNameStore = {
    key: 'teodors-vulkaneventyr.player-name',
    get() { return String(localStorage.getItem(this.key) || '').trim().slice(0, 20); },
    save(name) { const normalized=String(name || '').trim().slice(0, 20);if(normalized)localStorage.setItem(this.key, normalized);return normalized; }
  };
  // Disse tre postene var uttrykkelig identifisert som PC/Mac-resultater før plattform ble lagret.
  const LEGACY_DESKTOP_SCORE_IDS = new Set(['rec_01KY5XNQQCDTKEMJH0YY52821D','rec_01KY5KA1AYN1KFEZHR65A7P1T4','rec_01KY5K8VNEZ1ZXXCRW786SA2MT']);
  const GlobalScoreStore = {
    endpoint: './.herenow/data/highscores',
    async list() {
      const records=[];let cursor='';
      do { const response=await fetch(`${this.endpoint}?limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`,{cache:'no-store'});if(!response.ok)throw new Error('Kunne ikke hente topplisten.');const page=await response.json();records.push(...(page.records||[]));cursor=page.nextCursor||''; } while(cursor&&records.length<25000);
      return records.map(record=>{const data=record?.data&&typeof record.data==='object'?record.data:record||{},name=typeof data.name==='string'?data.name.trim():'',score=Math.floor(Number(data.score)),platform=data.platform==='desktop'||(!data.platform&&LEGACY_DESKTOP_SCORE_IDS.has(record?.id))?'desktop':'mobile',difficulty=DIFFICULTIES[data.difficulty]?data.difficulty:'unknown';return name&&Number.isFinite(score)&&score>=0?{name:name.slice(0,20),score,platform,difficulty,createdAt:record?.created_at||record?.createdAt||''}:null;}).filter(Boolean).sort((a,b)=>b.score-a.score||String(a.createdAt).localeCompare(String(b.createdAt)));
    },
    async save(name,score,platform,difficulty) { const response=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`},body:JSON.stringify({name,score:Math.floor(score),platform:platform==='desktop'?'desktop':'mobile',difficulty:DIFFICULTIES[difficulty]?difficulty:'normal'})});if(!response.ok)throw new Error('Kunne ikke lagre poenget.');return response.json(); }
  };
  const TutorialStore = {
    key: 'teodors-vulkaneventyr.tutorials-v1',
    get() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch { return {}; } },
    has(id) { return Boolean(this.get()[id]); },
    mark(id) { const seen=this.get();seen[id]=true;localStorage.setItem(this.key,JSON.stringify(seen)); }
  };
  const HelpVisibilityStore = {
    key: 'teodors-vulkaneventyr.hide-explanations',
    hidden() { return localStorage.getItem(this.key) === '1'; },
    set(hidden) { localStorage.setItem(this.key, hidden ? '1' : '0'); }
  };
  const ShopPriceStore = {
    key:'teodors-vulkaneventyr.shop-prices',
    values:{},
    hasLegacyPrices:false,
    isLocalProjectHost(){
      const host=location.hostname;
      return host==='localhost'||host==='127.0.0.1'||host==='::1'||host.startsWith('192.168.')||host.startsWith('10.')||/^172\.(1[6-9]|2\d|3[01])\./.test(host);
    },
    get(){return this.values;},
    legacy(){
      try{const values=JSON.parse(localStorage.getItem(this.key)||'{}');return values&&typeof values==='object'&&!Array.isArray(values)?values:{};}catch{return {};}
    },
    async load(defaults){
      let values={...defaults};
      try{const response=await fetch('shop-prices.json',{cache:'no-store'});if(response.ok){const saved=await response.json();for(const [key,fallback] of Object.entries(defaults)){const value=Number(saved[key]);values[key]=Number.isInteger(value)&&value>=0&&value<=999?value:fallback;}}}catch{}
      if(this.isLocalProjectHost()){
        const legacy=this.legacy();this.hasLegacyPrices=Object.keys(legacy).length>0;
        for(const key of Object.keys(defaults)){const value=Number(legacy[key]);if(Number.isInteger(value)&&value>=0&&value<=999)values[key]=value;}
      }
      this.values=values;return values;
    },
    async save(values,pin){
      const response=await fetch('/api/shop-prices',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({pin,prices:values})});
      let result={};try{result=await response.json();}catch{}
      if(!response.ok)throw new Error(result.error||'Prisene kan bare lagres fra den lokale testserveren.');
      this.values={...result.prices};this.hasLegacyPrices=false;localStorage.removeItem(this.key);return this.values;
    }
  };

  // Ekte lydeffekter (CC0, se sfx/CREDITS.md) lastes som WebAudio-buffers;
  // mangler en fil, faller spilleren tilbake til syntetiske toner.
  const SfxStore = {
    files: {
      rain: 'sfx/rain-loop.mp3',
      thunder: 'sfx/thunder.mp3',
      dragonFlame: 'sfx/dragon-flame.wav',
      fireball: 'sfx/fireball.wav',
      lightning: 'sfx/Lightning.mp3',
      bonfire: 'sfx/bonfire.wav',
      splash: 'sfx/lava-splash.mp3',
      rockfall: 'sfx/rockfall-pebbles.mp3'
    },
    buffers: {}, loops: {},
    async load(){
      if(!audio)return;
      for(const [key,url] of Object.entries(this.files)){
        if(this.buffers[key])continue;
        try{const response=await fetch(url);if(!response.ok)continue;const data=await response.arrayBuffer();this.buffers[key]=await audio.decodeAudioData(data);}catch{}
      }
    },
    ready(name){if(muted||!audio||audio.state!=='running')return false;if(this.buffers[name])return true;this.load();return false;},
    play(name,volume=.85){
      if(!this.ready(name))return false;
      try{const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=this.buffers[name];gain.gain.value=volume;source.connect(gain).connect(audio.destination);source.start();return true;}catch{return false;}
    },
    startLoop(name,volume=.5,fade=.7){
      if(!this.ready(name)||this.loops[name])return false;
      try{const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=this.buffers[name];source.loop=true;gain.gain.value=0;source.connect(gain).connect(audio.destination);source.start();gain.gain.linearRampToValueAtTime(volume,audio.currentTime+fade);this.loops[name]={source,gain};return true;}catch{return false;}
    },
    stopLoop(name,fade=.8){
      const entry=this.loops[name];if(!entry)return;delete this.loops[name];
      try{entry.gain.gain.cancelScheduledValues(audio.currentTime);entry.gain.gain.setValueAtTime(Math.max(.0001,entry.gain.gain.value),audio.currentTime);entry.gain.gain.linearRampToValueAtTime(.0001,audio.currentTime+fade);entry.source.stop(audio.currentTime+fade+.05);}catch{}
    },
    stopAllLoops(){for(const name of Object.keys(this.loops))this.stopLoop(name);}
  };

  let W = 0, H = 0, ground = 0, last = 0, raf = 0, audio, audioRecoveryNeeded = false, muted = false, pseudoFullscreen = false, orientationBlocked = false, resizeTimer = 0, orientationReleaseTimer = 0, pendingScore = 0, leaderboardLoading = false, scoreSubmitting = false, priceEditorPin = '';
  const debugSettings={rotationSpeed:.45,relativeRollSpeed:.2,rollingShare:70};
  let state;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  // Lokal skaleringspilot: samme logiske bredde gir lik horisontal sikt og reaksjonstid.
  const VIRTUAL_WORLD_WIDTH = 960;
  const REST_STOP_INTERVAL = 5000;
  const REST_STOP_APPROACH_DISTANCE = 300;
  const REST_STOP_RIVER_CLEARANCE_DISTANCE = 700;
  const REST_STOP_WIDTH = 222;
  // Alle vertikale krefter skaleres likt, så høyden blir 70 % uten å endre flytiden.
  const JUMP_HEIGHT_SCALE = .7;
  const JUMP_VELOCITY_SCALE = JUMP_HEIGHT_SCALE;
  const MIN_STRENGTH = .05;
  const DEBUG_PIN = '5859';
  const BASE_RUN_SPEED = 270;
  const ORIGINAL_MAX_RUN_SPEED = 590;
  const SPEED_LEVELS_TO_ORIGINAL_MAX = 10;
  const HEART_SPEED_STEP = 1;
  const SPEED_EASE = 2.2;
  const ROCK_HIT_DURATION = .72;
  const DRAGON_START_DISTANCE = 40000;
  const DRAGON_FLIGHT_DURATION = 14.6;
  const DRAGON_ATTACK_WINDOW = 1.35;
  const DRAGON_FIRST_ATTACK_AGE = 2;
  const DRAGON_LAVA_CLEARANCE = 360;
  const MAX_SMALL_JUMP_BROTHS_PER_REST = 2;
  const SHOP_CATALOG = Object.freeze({
    'fish-slot':{price:10},
    fish:{price:3},
    'jump-broth':{price:6},
    'small-jump-broth':{price:1},
    kvikklunsj:{price:6},
    'first-aid':{price:10},
    'rain-hat':{price:15},
    boots:{price:10}
  });
  const PRICE_EDITOR_FIELDS = Object.freeze([
    {key:'fish-slot',label:'Større sekk',fallback:10},
    {key:'fish',label:'Fisk',fallback:3},
    {key:'jump-broth',label:'Hoppebuljong',fallback:6},
    {key:'small-jump-broth',label:'Liten hoppebuljong',fallback:1},
    {key:'kvikklunsj',label:'Kvikklunsj',fallback:6},
    {key:'first-aid',label:'Førstehjelpspakke',fallback:10},
    {key:'first-aid-extra',label:'Ekstra førstehjelpspakke',fallback:15},
    {key:'rain-hat',label:'Hjelm',fallback:15},
    {key:'boots',label:'Lavastøvler',fallback:10}
  ]);
  const DEFAULT_SHOP_PRICES = Object.freeze(Object.fromEntries(PRICE_EDITOR_FIELDS.map(field=>[field.key,field.fallback])));
  const DIFFICULTIES = Object.freeze({
    easy:{key:'easy',label:'Lett',startRunSpeed:270,maxRunSpeed:590,maxSpeedLevel:10},
    normal:{key:'normal',label:'Normal',startRunSpeed:360,maxRunSpeed:885,maxSpeedLevel:10},
    hard:{key:'hard',label:'Vanskelig',startRunSpeed:450,maxRunSpeed:1330,maxSpeedLevel:10},
    expert:{key:'expert',label:'Ekspert',startRunSpeed:540,maxRunSpeed:1770,maxSpeedLevel:10}
  });
  const REST_STOPS = [
    {name:'Rondvassbu',quote:'Ah, en liten rast gjør godt!'},
    {name:'Bjørnhollia',quote:'For en nydelig plass å trekke pusten.'},
    {name:'Grimsdalshytta',quote:'Kanskje butikken har noe jeg trenger?'},
    {name:'Eldåbu',quote:'Litt hvile og en titt i butikken.'},
    {name:'Veslefjellbua',quote:'Svovelluft og litt turproviant passer godt.'},
    {name:'Jammerdalsbu',quote:'Her kan jeg fylle sekken før neste etappe.'},
    {name:'Haverdalsseter',quote:'Dette var et fint sted for en handel.'},
    {name:'Nedre Dørålseter',quote:'En kort rast med utsikt – herlig!'},
    {name:'Øvre Dørålseter',quote:'Kanskje en hoppebuljong hadde gjort susen?'},
    {name:'Smuksjøseter',quote:'For et fint sted å ta fem minutter.'},
    {name:'Putten Seter',quote:'Mon tro hva de har i butikken her?'},
    {name:'Kraterkanten',quote:'Jeg bør sjekke utstyret før jeg går videre.'},
    {name:'Øigardseter',quote:'Sånn, hva trenger jeg til neste etappe?'},
    {name:'Høvringen Vulkanstue',quote:'Dette er ekte turglede.'},
    {name:'Laurgårdseter',quote:'En liten rast og kanskje litt proviant.'},
    {name:'Haukliseter',quote:'Butikken kan ha noe nyttig til turen.'},
    {name:'Kletten',quote:'Pust inn, pust ut – og sjekk sekken!'},
    {name:'Straumbu',quote:'Vulkanen kaller – men først en titt i butikken!'}
  ];

  function resize() { const oldGround=ground,displayWidth=Math.max(1,canvas.clientWidth),displayHeight=Math.max(1,canvas.clientHeight),dpr=Math.min(window.devicePixelRatio||1,2);W=VIRTUAL_WORLD_WIDTH;H=W*displayHeight/displayWidth;const renderScale=displayWidth/W*dpr;canvas.width=Math.round(W*renderScale);canvas.height=Math.round(H*renderScale);ctx.setTransform(renderScale,0,0,renderScale,0,0);ground=H*.745;if(oldGround&&state){const dy=ground-oldGround;if(state.player)state.player.y+=dy;state.objects?.forEach(o=>{if(Number.isFinite(o.y))o.y+=dy;if(Number.isFinite(o.currentY))o.currentY+=dy;});state.splashes?.forEach(s=>{if(Number.isFinite(s.y))s.y+=dy;});state.rockImpacts?.forEach(impact=>{impact.y+=dy;});}}
  function scheduleResize(){cancelAnimationFrame(scheduleResize.raf);scheduleResize.raf=requestAnimationFrame(()=>requestAnimationFrame(resize));clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,220);}
  function shouldBlockPortrait(){return window.matchMedia('(orientation: portrait) and (max-width: 1180px)').matches;}
  function setOrientationBlock(blocked){orientationBlocked=blocked;ui.orientationBlocker.classList.toggle('active',blocked);ui.orientationBlocker.setAttribute('aria-hidden',String(!blocked));if(blocked){audioRecoveryNeeded=Boolean(audio);if(state?.player)state.player.jumpHeld=false;}else if(audio)initAudio();last=performance.now();}
  function syncOrientation(){clearTimeout(orientationReleaseTimer);if(shouldBlockPortrait()){setOrientationBlock(true);scheduleResize();return;}scheduleResize();if(orientationBlocked){orientationReleaseTimer=setTimeout(()=>{resize();setOrientationBlock(false);},260);}else setOrientationBlock(false);}
  window.addEventListener('resize',scheduleResize);window.visualViewport?.addEventListener('resize',scheduleResize);window.addEventListener('orientationchange',()=>{audioRecoveryNeeded=Boolean(audio);syncOrientation();setTimeout(syncOrientation,120);setTimeout(syncOrientation,320);});window.matchMedia('(orientation: portrait)').addEventListener?.('change',syncOrientation);resize();

  function initAudio(forceRecovery=false) {
    if(muted)return;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return;
    if(!audio||audio.state==='closed'||(forceRecovery&&audioRecoveryNeeded)){
      const previous=audio;
      try{audio=new AudioContextClass();}catch{return;}
      audioRecoveryNeeded=false;
      const current=audio;
      current.addEventListener?.('statechange',()=>{if(audio===current)audioRecoveryNeeded=current.state!=='running';});
      if(previous&&previous!==current&&previous.state!=='closed'){try{const closing=previous.close?.();closing?.catch?.(()=>{});}catch{}}
    }
    if(audio.state!=='running'){
      const current=audio;
      try{const resuming=current.resume?.();resuming?.then?.(()=>{if(audio===current){audioRecoveryNeeded=current.state!=='running';SfxStore.load();}}).catch?.(()=>{if(audio===current)audioRecoveryNeeded=true;});}catch{audioRecoveryNeeded=true;}
    }
    if(audio.state==='running')SfxStore.load();
  }
  function recoverAudioFromGesture(){if(!muted)initAudio(audioRecoveryNeeded);}
  function tone(freq, duration, type = 'sine', gain = .07, rise = .01) { if (muted) return; if(!audio||audio.state!=='running')initAudio();if(!audio)return; const o = audio.createOscillator(), g = audio.createGain(); o.type = type; o.frequency.setValueAtTime(freq, audio.currentTime); g.gain.setValueAtTime(.0001, audio.currentTime); g.gain.exponentialRampToValueAtTime(gain, audio.currentTime + rise); g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + duration + .03); }
  function rumbleSound(){if(muted)return;if(!audio||audio.state!=='running')initAudio();if(!audio)return;const duration=1.25,length=Math.floor(audio.sampleRate*duration),buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();filter.type='lowpass';filter.frequency.value=145;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.12,audio.currentTime+.08);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);source.buffer=buffer;source.connect(filter).connect(gain).connect(audio.destination);source.start();tone(62,duration,'sawtooth',.055,.08);}
  const sounds = { jump(){tone(360,.12,'triangle',.09);setTimeout(()=>tone(580,.1,'triangle',.05),65)}, heart(){tone(650,.07,'sine',.06);setTimeout(()=>tone(920,.16,'sine',.06),70)}, buy(){tone(494,.08,'triangle',.055);setTimeout(()=>tone(659,.1,'triangle',.05),70);setTimeout(()=>tone(880,.14,'sine',.045),145)}, fire(){if(!SfxStore.play('dragonFlame',.8)){tone(150,.35,'sawtooth',.08);setTimeout(()=>tone(250,.25,'triangle',.07),70);}}, bonfire(){if(!SfxStore.play('bonfire',.7)){tone(150,.35,'sawtooth',.08);setTimeout(()=>tone(250,.25,'triangle',.07),70);}}, rest(){tone(523,.14,'triangle',.065);setTimeout(()=>tone(659,.18,'triangle',.06),100);setTimeout(()=>tone(784,.22,'triangle',.05),210)}, splash(){if(!SfxStore.play('splash',.85))tone(85,.3,'sine',.1)}, rock(){tone(68,.28,'square',.105,.006);tone(165,.12,'sawtooth',.075,.004);setTimeout(()=>tone(430,.08,'square',.045,.003),24)}, rain(){if(!SfxStore.startLoop('rain',.42))tone(240,.09,'sine',.025)}, rainStop(){SfxStore.stopLoop('rain')}, thunder(){if(!SfxStore.play('thunder',.55))rumbleSound()}, lightning(){if(!SfxStore.play('lightning',.9))sounds.thunder()}, fireball(){if(!SfxStore.play('fireball',.9))sounds.rumble()}, rumble:rumbleSound };

  let selectedDifficulty='normal';
  function difficultyFor(key){return DIFFICULTIES[key]||DIFFICULTIES.normal;}
  function detectScorePlatform(){return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches?'desktop':'mobile';}
  function difficultyLabel(key){return DIFFICULTIES[key]?.label||'Ukjent';}
  function freshState(difficultyKey=selectedDifficulty) { return { running:false, paused:false, tutorialPaused:false, tutorialQueue:[], ended:false, debugMode:false, introTimer:0, t:0, distance:0, speed:difficultyFor(difficultyKey).startRunSpeed, speedBoost:0, speedBoostTarget:0, difficulty:difficultyFor(difficultyKey), platform:detectScorePlatform(), rockfallSpeedScale:1, hearts:15, heartLossAnimation:null, doubleJumps:0, maxFishSlots:3, kvikklunsj:0, snackBoostTimer:0, firstAid:0, rainHat:false, boots:false, smallJumpBrothPurchases:0, shopOpen:false, shopSnapshot:null, quitConfirmOpen:false, strength:1, player:{x:W/7,y:ground-58,vy:0,w:33,h:58,onGround:true,inv:0,jumpHeld:false,jumpHold:0,airJumped:false,jumpBoost:1}, objects:[], splashes:[], rockImpacts:[], rockHitTimer:0, spawn:1.3, riverSafeTimer:0, rain:0, rainClock:rand(20,34), rainDuration:0, rainStrengthDrainRemaining:0, rainStrengthDrainRate:0, weatherPhase:'clear', weatherTimer:0, skyDarkness:0, stormCloudCover:0, sunGlow:0, dragon:null, dragonClock:8, avalancheClock:0, avalancheLeadIn:0, plannedAvalancheDuration:0, avalancheDuration:0, avalancheLevel:0, boulderSpawn:0, rumbleClock:0, flash:0, bolt:null, lightningClock:rand(3,6), thunderClock:0, hitShake:0, promptTimer:0, prompt:'', danger:false, backgroundOffset:0, fireGlow:0, nextHeart:1.1, nextRestDistance:REST_STOP_INTERVAL, restIndex:0, restTimer:0, restStop:null, restDeferred:false }; }
  function syncHelpVisibility(){const hidden=HelpVisibilityStore.hidden();ui.helpToggles.forEach(toggle=>{toggle.checked=hidden;});}
  function setHelpVisibility(hidden){HelpVisibilityStore.set(hidden);syncHelpVisibility();if(hidden&&state?.tutorialPaused){state.tutorialPaused=false;state.tutorialQueue=[];ui.tutorial.classList.add('hidden');last=performance.now();}}
  function openHowToPlay(){ui.start.classList.add('hidden');ui.howToPlay.classList.remove('hidden');}
  function closeHowToPlay(){ui.howToPlay.classList.add('hidden');ui.start.classList.remove('hidden');}
  function startGame(difficultyKey=selectedDifficulty) { selectedDifficulty=difficultyFor(difficultyKey).key;clearPrompt();initAudio(); cancelAnimationFrame(raf); state = freshState(selectedDifficulty); state.running = true; state.introTimer=2.8; state.introSignWorldX=Math.min(W-72,state.player.x+98); ui.frame.classList.add('playing');ui.frame.classList.remove('paused'); ui.start.classList.add('hidden');ui.howToPlay.classList.add('hidden');ui.priceEditorOverlay.classList.add('hidden'); ui.gameOver.classList.add('hidden'); ui.tutorial.classList.add('hidden');ui.shopOverlay.classList.add('hidden');ui.quitConfirmOverlay.classList.add('hidden');ui.restActions.classList.add('hidden'); ui.gameActions.classList.remove('hidden-controls');ui.debugPanel.classList.add('hidden-controls');ui.statusDock.classList.remove('hidden-controls');ui.bonfire.classList.remove('hidden-controls'); ui.pauseOverlay.classList.add('hidden'); ui.pauseLabel.textContent='PAUSE'; ui.pause.setAttribute('aria-label','Sett spillet på pause'); updateUI();last = performance.now(); raf = requestAnimationFrame(loop); }
  function endGame() { if (state.ended) return; state.ended = true; state.running = false;state.shopOpen=false;state.quitConfirmOpen=false; ui.frame.classList.remove('playing','at-rest','paused'); ui.gameActions.classList.add('hidden-controls');ui.debugPanel.classList.add('hidden-controls');ui.statusDock.classList.add('hidden-controls');ui.bonfire.classList.add('hidden-controls');ui.shopInventory.classList.add('hidden-controls');ui.restCountdown.classList.add('hidden');ui.restActions.classList.add('hidden');ui.shopOverlay.classList.add('hidden');ui.quitConfirmOverlay.classList.add('hidden'); cancelAnimationFrame(raf);pendingScore=Math.floor(state.distance);ui.scoreStatus.textContent='';ui.final.textContent=`Du kom ${formatDistance(state.distance)} på vulkanturen.`;if(state.debugMode){ui.scoreForm.hidden=true;ui.record.textContent='Debugtur – resultatet registreres ikke.';}else{const oldBest=ScoreStore.get(),best=ScoreStore.save(state.distance);ui.scoreForm.hidden=false;ui.scoreName.value=PlayerNameStore.get();ui.scoreName.disabled=false;ui.scoreSubmit.disabled=false;ui.record.textContent=state.distance>oldBest?'Ny personlig rekord!':`Beste tur: ${formatDistance(best)}`;}ui.gameOver.classList.remove('hidden'); }
  function formatDistance(m) { return m >= 1000 ? `${(m / 1000).toFixed(2).replace('.', ',')} km` : `${Math.floor(m)} m`; }
  function renderLeaderboard(list,entries){list.replaceChildren();if(!entries.length){const empty=document.createElement('li');empty.className='leaderboard-empty';empty.textContent='Ingen turer registrert ennå.';list.append(empty);return;}entries.forEach((entry,index)=>{const item=document.createElement('li'),rank=document.createElement('span'),player=document.createElement('span'),name=document.createElement('span'),difficulty=document.createElement('small'),score=document.createElement('strong');rank.textContent=`${index+1}.`;player.className='leaderboard-player';name.textContent=entry.name;difficulty.className=`leaderboard-difficulty ${entry.difficulty}`;difficulty.textContent=`(${difficultyLabel(entry.difficulty)})`;score.textContent=formatDistance(entry.score);player.append(name,difficulty);item.append(rank,player,score);list.append(item);});}
  async function loadLeaderboard(){if(leaderboardLoading)return;leaderboardLoading=true;ui.leaderboardRefresh.disabled=true;ui.leaderboardRefresh.classList.add('loading');ui.leaderboardRefresh.setAttribute('aria-busy','true');ui.leaderboardStatus.textContent='Henter topplisten …';try{const entries=await GlobalScoreStore.list();renderLeaderboard(ui.leaderboardList,entries.slice(0,20));ui.leaderboardStatus.textContent='Oppdatert nå.';setTimeout(()=>{if(ui.leaderboardStatus.textContent==='Oppdatert nå.')ui.leaderboardStatus.textContent='';},1600);}catch{renderLeaderboard(ui.leaderboardList,[]);ui.leaderboardStatus.textContent='Topplisten er midlertidig utilgjengelig. Prøv igjen snart.';}finally{leaderboardLoading=false;ui.leaderboardRefresh.disabled=false;ui.leaderboardRefresh.classList.remove('loading');ui.leaderboardRefresh.removeAttribute('aria-busy');}}
  async function submitScore(event){event.preventDefault();if(scoreSubmitting||state?.debugMode)return;const name=PlayerNameStore.save(ui.scoreName.value);if(!name)return;scoreSubmitting=true;ui.scoreSubmit.disabled=true;ui.scoreName.disabled=true;ui.scoreStatus.textContent='Lagrer poenget …';try{await GlobalScoreStore.save(name.slice(0,20),pendingScore,state?.platform,state?.difficulty?.key);await loadLeaderboard();returnToStart();}catch{ui.scoreStatus.textContent='Kunne ikke lagre nå. Prøv igjen.';ui.scoreSubmit.disabled=false;ui.scoreName.disabled=false;}finally{scoreSubmitting=false;}}
  function showPrompt(text, seconds = 2, danger = false) { state.prompt = text; state.promptTimer = seconds; state.danger = danger; ui.banner.textContent = text; ui.banner.className = `event-banner show${danger ? ' danger' : ''}`; }
  function clearPrompt(){if(state){state.prompt='';state.promptTimer=0;state.danger=false;}ui.banner.textContent='';ui.banner.className='event-banner';}
  function presentTutorial(item){state.tutorialPaused=true;state.player.jumpHeld=false;ui.tutorialTitle.textContent=item.title;ui.tutorialText.textContent=item.text;ui.tutorial.classList.remove('hidden');}
  function showTutorial(id,title,text){if(HelpVisibilityStore.hidden()||TutorialStore.has(id))return;TutorialStore.mark(id);const item={title,text};if(state.tutorialPaused)state.tutorialQueue.push(item);else presentTutorial(item);}
  function continueTutorial(){if(!state?.tutorialPaused)return;if(state.tutorialQueue.length){presentTutorial(state.tutorialQueue.shift());return;}state.tutorialPaused=false;ui.tutorial.classList.add('hidden');last=performance.now();}
  function updateRestCountdown(){syncRainStrengthEffect();const resting=Boolean(state?.fireGlow>0);ui.restCountdown.classList.toggle('hidden',!resting);if(!resting)return;ui.restCountdownLabel.textContent='BÅLPAUSE';ui.restCountdownValue.textContent=Math.max(1,Math.ceil(state.fireGlow));}
  function updateUI() { ui.distance.textContent=formatDistance(state.distance);ui.hearts.textContent=state.heartLossAnimation?.displayValue??state.hearts;ui.heartCounter.setAttribute('aria-label',`${state.hearts} hjerter`);const speedPct=Math.round(state.speedBoost/state.difficulty.maxSpeedLevel*100);ui.speedFill.style.width=`${speedPct}%`;ui.speedPanel.setAttribute('aria-valuenow',speedPct);ui.speedPanel.setAttribute('aria-label',`Fart ${speedPct} prosent av maks fart`);const pct=Math.round(state.strength*100);ui.strengthFill.style.width=`${pct}%`;ui.strengthPanel.setAttribute('aria-valuenow',pct);ui.strengthPanel.classList.toggle('low',pct<35);ui.strengthPanel.classList.toggle('refilling',state.fireGlow>0);ui.fishMeter.classList.toggle('expanded',state.maxFishSlots>3);ui.fishMeter.classList.toggle('boosted',state.snackBoostTimer>0);ui.fishSlots.forEach((slot,index)=>{const locked=index>=state.maxFishSlots;slot.classList.toggle('locked',locked);slot.classList.toggle('available',!locked&&index<state.doubleJumps);});ui.fishMeter.setAttribute('aria-label',state.snackBoostTimer>0?`Gratis dobbelthopp i ${Math.ceil(state.snackBoostTimer)} sekunder`:`${state.doubleJumps} av ${state.maxFishSlots} dobbelthopp`);const atHut=state.restTimer>0,resting=state.fireGlow>0||atHut;ui.frame.classList.toggle('at-rest',atHut);if(atHut&&state.restStop){const scaleX=canvas.clientWidth/W,scaleY=canvas.clientHeight/H;ui.restActions.style.setProperty('--rest-action-x',`${(state.restStop.x+REST_STOP_WIDTH+12)*scaleX}px`);ui.restActions.style.setProperty('--rest-action-y',`${(ground-22)*scaleY}px`);}ui.restActions.classList.toggle('hidden',!atHut||state.shopOpen);ui.snackCount.textContent=state.kvikklunsj;ui.snackButton.classList.toggle('hidden',state.kvikklunsj<=0);ui.firstAidCount.textContent=state.firstAid;ui.firstAidBadge.classList.toggle('hidden',state.firstAid<=0);ui.firstAidBadge.setAttribute('aria-label',`${state.firstAid} førstehjelpspakke${state.firstAid===1?'':'r'} klar${state.firstAid===1?'':'e'}`);ui.shopInventory.classList.toggle('hidden-controls',!state.running||state.ended||state.shopOpen||(state.kvikklunsj<=0&&state.firstAid<=0));ui.bonfire.disabled=state.hearts<10||resting||state.strength>=.995;ui.bonfire.classList.toggle('resting',resting);ui.bonfire.setAttribute('aria-label',atHut?'Teodor raster ved hytta':resting?'Teodor hviler ved bålet':'Tenn bål, koster 10 hjerter');if(state.shopOpen)updateShopUI();updateRestCountdown(); }
  function replayClass(element,className,duration=600){element.classList.remove(className);void element.offsetWidth;element.classList.add(className);setTimeout(()=>element.classList.remove(className),duration);}
  function animateHeartGain(){replayClass(ui.heartCounter,'gain',560)}
  function animateHeartLoss(){replayClass(ui.heartCounter,'loss',520)}
  function animateRockHeartLoss(from,to,fromPlayer=false){
    const lost=Math.max(0,from-to);if(!lost)return;
    replayClass(ui.heartCounter,'drain',620);
    state.heartLossAnimation={from,to,elapsed:0,duration:Math.min(.82,.38+lost*.025),displayValue:from};
    const frameRect=ui.frame.getBoundingClientRect(),heartShape=ui.heartCounter.querySelector('.heart-shape'),heartRect=heartShape.getBoundingClientRect(),heartStyle=getComputedStyle(heartShape),canvasRect=canvas.getBoundingClientRect();
    const startX=fromPlayer?canvasRect.left-frameRect.left+(state.player.x+state.player.w*.5)*canvasRect.width/W:heartRect.left-frameRect.left+heartRect.width*.5,startY=fromPlayer?canvasRect.top-frameRect.top+(state.player.y+state.player.h*.4)*canvasRect.height/H:heartRect.top-frameRect.top+heartRect.height*.5,count=Math.min(14,lost);
    for(let i=0;i<count;i++){const particle=document.createElement('span'),endX=-startX-rand(55,115),endY=rand(-155,-75),midX=endX*.48+rand(-12,12),midY=endY*.48+rand(-18,18),rotation=rand(-135,135),delay=i*52+rand(0,28);particle.className='lost-heart-particle';particle.textContent=heartShape.textContent||'♥';particle.style.left=`${startX}px`;particle.style.top=`${startY}px`;particle.style.fontSize=heartStyle.fontSize;particle.style.fontFamily=heartStyle.fontFamily;particle.style.fontWeight=heartStyle.fontWeight;particle.style.lineHeight=heartStyle.lineHeight;particle.style.setProperty('--heart-mid-x',`${midX}px`);particle.style.setProperty('--heart-mid-y',`${midY}px`);particle.style.setProperty('--heart-end-x',`${endX}px`);particle.style.setProperty('--heart-end-y',`${endY}px`);particle.style.setProperty('--heart-mid-rotation',`${rotation*.48}deg`);particle.style.setProperty('--heart-rotation',`${rotation}deg`);particle.style.animationDelay=`${delay}ms`;ui.frame.appendChild(particle);setTimeout(()=>particle.remove(),1350+delay);}
  }
  function updateHeartLossAnimation(dt){const animation=state?.heartLossAnimation;if(!animation)return false;animation.elapsed+=dt;const progress=clamp(animation.elapsed/animation.duration,0,1),eased=1-Math.pow(1-progress,2.2);animation.displayValue=Math.max(animation.to,animation.from-Math.floor((animation.from-animation.to)*eased));if(progress>=1)state.heartLossAnimation=null;return true;}
  function increaseRunSpeed(){state.speedBoostTarget=clamp(state.speedBoostTarget+HEART_SPEED_STEP,0,state.difficulty.maxSpeedLevel);}
  // Kall denne fra alle nåværende og fremtidige hindringstreff.
  function decreaseRunSpeed(){state.speedBoostTarget=clamp(state.speedBoostTarget-HEART_SPEED_STEP,0,state.difficulty.maxSpeedLevel);}
  function speedForLevel(level){const difficulty=state.difficulty,clampedLevel=clamp(level,0,difficulty.maxSpeedLevel);return difficulty.startRunSpeed+(difficulty.maxRunSpeed-difficulty.startRunSpeed)*(clampedLevel/difficulty.maxSpeedLevel);}
  function syncRainStrengthEffect(){const active=Boolean(state?.weatherPhase==='raining'&&!state.rainHat&&state.rainStrengthDrainRemaining>.0001&&state.strength>MIN_STRENGTH);ui.strengthPanel.classList.toggle('rain-draining',active);ui.shopStrengthStatus.classList.toggle('rain-draining',active);}
  function animateFishUse(index){const slot=ui.fishSlots[index];if(slot)replayClass(slot,'using',520)}
  function animateFishCatch(x,y,index){const slot=ui.fishSlots[index];if(!slot)return;const frameRect=ui.frame.getBoundingClientRect(),targetRect=slot.getBoundingClientRect(),fly=document.createElement('span');fly.className='flying-fish';fly.innerHTML=slot.innerHTML;fly.style.left=`${x}px`;fly.style.top=`${y}px`;fly.style.setProperty('--fly-x',`${targetRect.left-frameRect.left+targetRect.width/2-x}px`);fly.style.setProperty('--fly-y',`${targetRect.top-frameRect.top+targetRect.height/2-y}px`);ui.frame.appendChild(fly);setTimeout(()=>{fly.remove();replayClass(slot,'catching',580)},620)}
  function animateConsumable(source,type){
    const svg=source?.querySelector('svg');if(!svg||!state?.player)return;const frameRect=ui.frame.getBoundingClientRect(),sourceRect=source.getBoundingClientRect(),startX=sourceRect.left-frameRect.left+sourceRect.width/2,startY=sourceRect.top-frameRect.top+sourceRect.height/2,targetX=state.player.x+state.player.w*.5,targetY=state.player.y+state.player.h*.42,dx=targetX-startX,dy=targetY-startY,fly=document.createElement('span');
    fly.className=`flying-consumable ${type}`;fly.innerHTML=svg.outerHTML;fly.style.left=`${startX}px`;fly.style.top=`${startY}px`;fly.style.setProperty('--fly-x',`${dx}px`);fly.style.setProperty('--fly-y',`${dy}px`);fly.style.setProperty('--fly-mid-x',`${dx*.55}px`);fly.style.setProperty('--fly-mid-y',`${dy*.55-70}px`);ui.frame.appendChild(fly);setTimeout(()=>fly.remove(),760);
  }
  function animateShopPurchase(source,type,target){
    const svg=source?.querySelector('.shop-item-icon svg');if(!svg||!target)return;
    const overlayRect=ui.shopOverlay.getBoundingClientRect(),sourceRect=svg.getBoundingClientRect(),targetRect=target.getBoundingClientRect();if(!targetRect.width||!targetRect.height)return;
    const startX=sourceRect.left-overlayRect.left+sourceRect.width/2,startY=sourceRect.top-overlayRect.top+sourceRect.height/2,targetX=targetRect.left-overlayRect.left+targetRect.width/2,targetY=targetRect.top-overlayRect.top+targetRect.height/2,dx=targetX-startX,dy=targetY-startY,fly=document.createElement('span');
    fly.className=`flying-shop-purchase ${type}`;fly.innerHTML=svg.outerHTML;fly.style.left=`${startX}px`;fly.style.top=`${startY}px`;fly.style.setProperty('--shop-fly-x',`${dx}px`);fly.style.setProperty('--shop-fly-y',`${dy}px`);fly.style.setProperty('--shop-fly-mid-x',`${dx*.55}px`);fly.style.setProperty('--shop-fly-mid-y',`${dy*.55-42}px`);ui.shopOverlay.appendChild(fly);
    setTimeout(()=>{fly.remove();replayClass(target,'purchase-arrival',700);},720);
  }
  function updateShopUI(){
    if(!state)return;const strengthPct=Math.round(state.strength*100),hutName=state.restStop?.name||'Vulkanhytta';ui.shopHearts.textContent=state.hearts;ui.shopTitle.textContent=hutName;ui.shopTitle.classList.toggle('long',hutName.length>14);ui.shopTitle.classList.toggle('very-long',hutName.length>18);ui.shopStrengthFill.style.width=`${strengthPct}%`;ui.shopStrengthStatus.setAttribute('aria-valuenow',strengthPct);ui.shopStrengthStatus.classList.toggle('low',strengthPct<35);ui.shopFishMeter.classList.toggle('expanded',state.maxFishSlots>3);ui.shopFishSlots.forEach((slot,index)=>{const locked=index>=state.maxFishSlots;slot.classList.toggle('locked',locked);slot.classList.toggle('available',!locked&&index<state.doubleJumps);});ui.shopFishMeter.setAttribute('aria-label',`${state.doubleJumps} av ${state.maxFishSlots} fisker i sekken`);
    ui.shopItems.forEach(button=>{const item=button.dataset.shopItem,price=shopItemPrice(item),priceLabel=button.querySelector('[data-shop-price]');let maxed=false;
      if(item==='fish-slot')maxed=state.maxFishSlots>=6;
      else if(item==='fish')maxed=state.doubleJumps>=state.maxFishSlots;
      else if(item==='jump-broth')maxed=state.strength>=.995;
      else if(item==='small-jump-broth')maxed=state.strength>=.995||state.smallJumpBrothPurchases>=MAX_SMALL_JUMP_BROTHS_PER_REST;
      else if(item==='kvikklunsj')maxed=state.kvikklunsj>=3;
      else if(item==='first-aid')maxed=state.firstAid>=2;
      else if(item==='rain-hat')maxed=state.rainHat;
      else if(item==='boots')maxed=state.boots;
      button.disabled=maxed||state.hearts<price;button.classList.toggle('sold-out',maxed);if(priceLabel){priceLabel.textContent=maxed?'':String(price);priceLabel.setAttribute('aria-label',maxed?'Utsolgt':`${price} hjerter`);}
    });
    ui.shopUndo.disabled=!shopPurchasesChanged();
  }
  function configuredShopPrice(key,fallback){const value=Number(ShopPriceStore.get()[key]);return Number.isInteger(value)&&value>=0&&value<=999?value:fallback;}
  function shopItemPrice(item){const extraAid=item==='first-aid'&&state?.firstAid===1,key=extraAid?'first-aid-extra':item,fallback=extraAid?15:SHOP_CATALOG[item]?.price||0;return configuredShopPrice(key,fallback);}
  function captureShopSnapshot(){return {hearts:state.hearts,doubleJumps:state.doubleJumps,maxFishSlots:state.maxFishSlots,strength:state.strength,kvikklunsj:state.kvikklunsj,firstAid:state.firstAid,rainHat:state.rainHat,boots:state.boots,smallJumpBrothPurchases:state.smallJumpBrothPurchases};}
  function shopPurchasesChanged(){const snapshot=state?.shopSnapshot;if(!snapshot)return false;return Object.keys(snapshot).some(key=>state[key]!==snapshot[key]);}
  function openShop(){if(!state?.running||state.restTimer<=0||state.shopOpen)return;if(!state.shopSnapshot)state.shopSnapshot=captureShopSnapshot();state.shopOpen=true;state.player.jumpHeld=false;ui.shopStatus.textContent='';ui.shopOverlay.classList.remove('hidden');updateUI();last=performance.now();}
  function closeShop(){if(!state?.shopOpen)return;state.shopOpen=false;ui.shopOverlay.classList.add('hidden');updateUI();last=performance.now();}
  function undoShopPurchases(){if(!state?.shopOpen||!shopPurchasesChanged())return;Object.assign(state,state.shopSnapshot);ui.shopStatus.textContent='Alle kjøp ved denne hytta er angret. Hjertene er refundert.';updateUI();}
  function continueRestStop(){if(!state?.running||state.restTimer<=0||state.shopOpen)return;state.restTimer=0;state.shopSnapshot=null;state.riverSafeTimer=2;if(state.restStop)state.restStop.leaving=true;ui.restActions.classList.add('hidden');showPrompt('Videre mot nye vulkanmål!',2.4);updateUI();last=performance.now();}
  function buyShopItem(item){
    if(!state?.shopOpen||!SHOP_CATALOG[item])return;const price=shopItemPrice(item);if(state.hearts<price)return;
    const source=ui.shopItems.find(button=>button.dataset.shopItem===item);let purchased=false,message='',purchaseAnimation=null;
    if(item==='fish-slot'&&state.maxFishSlots<6){purchaseAnimation={type:'fish-slot',target:ui.shopFishSlots[state.maxFishSlots]};state.maxFishSlots++;purchased=true;}
    else if(item==='fish'&&state.doubleJumps<state.maxFishSlots){purchaseAnimation={type:'fish',target:ui.shopFishSlots[state.doubleJumps]};state.doubleJumps++;purchased=true;}
    else if(item==='jump-broth'&&state.strength<.995){purchaseAnimation={type:'jump-broth',target:ui.shopStrengthStatus};state.strength=1;purchased=true;message='Hoppekraften er fylt helt opp!';}
    else if(item==='small-jump-broth'&&state.strength<.995&&state.smallJumpBrothPurchases<MAX_SMALL_JUMP_BROTHS_PER_REST){purchaseAnimation={type:'small-jump-broth',target:ui.shopStrengthStatus};state.strength=clamp(state.strength+.2,MIN_STRENGTH,1);state.smallJumpBrothPurchases++;purchased=true;message=`Liten hoppebuljong: hoppekraft +20 %. ${state.smallJumpBrothPurchases} av ${MAX_SMALL_JUMP_BROTHS_PER_REST} brukt her.`;}
    else if(item==='kvikklunsj'&&state.kvikklunsj<3){state.kvikklunsj++;purchased=true;message=`Kvikklunsj i sekken: ${state.kvikklunsj}.`;}
    else if(item==='first-aid'&&state.firstAid<2){state.firstAid++;purchased=true;message=state.firstAid===2?'To førstehjelpspakker er klare.':`Førstehjelpspakken beskytter mot neste lavasteintreff. En ekstra koster ${shopItemPrice('first-aid')} hjerter.`;}
    else if(item==='rain-hat'&&!state.rainHat){state.rainHat=true;purchased=true;message='Hjelmen beskytter hoppekraften mot askeregn resten av turen.';}
    else if(item==='boots'&&!state.boots){state.boots=true;purchased=true;message='Lavastøvlene beskytter hjertene når Teodor treffer en lavaelv.';}
    if(!purchased)return;state.hearts-=price;replayClass(ui.heartCounter,'spend',520);sounds.buy();ui.shopStatus.textContent=message;updateUI();if(purchaseAnimation)animateShopPurchase(source,purchaseAnimation.type,purchaseAnimation.target);
  }
  function useKvikklunsj(){if(!state?.running||state.kvikklunsj<=0||state.restTimer>0||state.fireGlow>0||state.paused||state.tutorialPaused||state.shopOpen||state.quitConfirmOpen)return;animateConsumable(ui.snackButton,'kvikklunsj');state.kvikklunsj--;state.snackBoostTimer=10;sounds.buy();showPrompt('Kvikklunsj! Gratis dobbelthopp i 10 sekunder.',2.6);updateUI();}
  function absorbWithFirstAid(){if(state.firstAid<=0)return false;animateConsumable(ui.firstAidBadge,'first-aid');state.firstAid--;sounds.buy();showPrompt(`Førstehjelpspakken tok av for lavasteintreffet! ${state.firstAid?`${state.firstAid} igjen.`:'Ingen igjen.'}`,2.5);updateUI();return true;}
  function startJump() { if (!state?.running || state.introTimer>0 || state.restTimer>0 || state.shopOpen || state.quitConfirmOpen || state.paused || state.tutorialPaused || orientationBlocked || state.fireGlow > 0) return; initAudio(); const p=state.player,isAirJump=!p.onGround,freeDoubleJump=state.snackBoostTimer>0;if(isAirJump&&(p.airJumped||p.jumpHeld||(!freeDoubleJump&&state.doubleJumps<=0)))return;if(isAirJump){if(!freeDoubleJump){animateFishUse(state.doubleJumps-1);state.doubleJumps--;}p.airJumped=true;}p.jumpBoost=1;const power=(.65+state.strength*.35)*JUMP_VELOCITY_SCALE;p.vy=-500*power;p.onGround=false;p.jumpHeld=true;p.jumpHold=0;sounds.jump(); }
  function endJump() { if (!state?.player?.jumpHeld) return; const p=state.player,power=(.65+state.strength*.35)*JUMP_VELOCITY_SCALE*(p.jumpBoost||1);p.jumpHeld=false;if(p.vy<-290*power)p.vy=-290*power; }
  function bonfire() { if (!state?.running || state.restTimer>0 || state.paused || state.tutorialPaused || state.hearts < 10 || state.fireGlow > 0 || state.strength >= .995) return; initAudio(); state.hearts-=10;state.fireGlow=3.4;animateHeartLoss();sounds.bonfire();updateUI();showTutorial('bonfire','Et varmt hvilested','Et bål koster 10 hjerter, men fyller hoppekraften gradvis opp. Teodor stopper trygt mens bålet brenner.'); }
  function togglePause() { if (!state?.running || state.ended || state.restTimer>0 || state.shopOpen || state.quitConfirmOpen || state.tutorialPaused) return; state.paused=!state.paused;ui.frame.classList.toggle('paused',state.paused);if(!state.paused)recoverAudioFromGesture();state.player.jumpHeld=false;ui.pauseLabel.textContent=state.paused?'FORTSETT':'PAUSE';ui.pause.setAttribute('aria-label',state.paused?'Fortsett spillet':'Sett spillet på pause');ui.pauseOverlay.classList.toggle('hidden',!state.paused);last=performance.now(); }
  function returnToStart(){cancelAnimationFrame(raf);clearPrompt();state=freshState();ui.frame.classList.remove('playing','at-rest','paused');ui.gameActions.classList.add('hidden-controls');ui.debugPanel.classList.add('hidden-controls');ui.statusDock.classList.add('hidden-controls');ui.bonfire.classList.add('hidden-controls');ui.shopInventory.classList.add('hidden-controls');ui.pauseOverlay.classList.add('hidden');ui.restCountdown.classList.add('hidden');ui.restActions.classList.add('hidden');ui.shopOverlay.classList.add('hidden');ui.quitConfirmOverlay.classList.add('hidden');ui.tutorial.classList.add('hidden');ui.howToPlay.classList.add('hidden');ui.priceEditorOverlay.classList.add('hidden');ui.gameOver.classList.add('hidden');ui.scoreForm.hidden=true;ui.start.classList.remove('hidden');ui.pauseLabel.textContent='PAUSE';ui.high.textContent=ScoreStore.get()?`Din beste tur: ${formatDistance(ScoreStore.get())}`:'Din første vulkantur venter.';draw();}
  function requestQuitGame(){if(!state?.running||state.ended||state.quitConfirmOpen)return;state.quitConfirmOpen=true;state.player.jumpHeld=false;ui.quitConfirmText.textContent=state.debugMode?'Debugturen avsluttes med én gang og registreres ikke.':'Resultatet lagres som personlig rekord, men turen avsluttes med én gang.';ui.quitConfirmOverlay.classList.remove('hidden');last=performance.now();}
  function cancelQuitGame(){if(!state?.quitConfirmOpen)return;state.quitConfirmOpen=false;ui.quitConfirmOverlay.classList.add('hidden');last=performance.now();}
  function confirmQuitGame(){if(!state?.running)return;state.quitConfirmOpen=false;if(!state.debugMode)ScoreStore.save(state.distance);returnToStart();}
  function fullscreenElement() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function isStandalone() { return window.matchMedia?.('(display-mode: fullscreen)').matches || window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function syncFullscreenButton() { const standalone=isStandalone(),active=Boolean(fullscreenElement())||pseudoFullscreen||standalone;ui.fullscreen.hidden=standalone;ui.fullscreenLabel.textContent=active?'AVSLUTT':'FULLSKJERM';ui.fullscreenIcon.textContent=active?'↙':'⛶';ui.fullscreen.setAttribute('aria-label',active?'Avslutt fullskjerm':'Vis spillet i fullskjerm');requestAnimationFrame(resize); }
  function setPseudoFullscreen(active,showIOSHelp=false){pseudoFullscreen=active;document.documentElement.classList.toggle('pseudo-fullscreen',active);document.body.classList.toggle('pseudo-fullscreen',active);if(!active)closeFullscreenHelp();else if(showIOSHelp&&!isStandalone())ui.fullscreenHelp.classList.remove('hidden');syncFullscreenButton();}
  function closeFullscreenHelp(){ui.fullscreenHelp.classList.add('hidden');}
  async function toggleFullscreen() {
    if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;try{if(exit)await exit.call(document);}catch{}screen.orientation?.unlock?.();return;}
    if(pseudoFullscreen){setPseudoFullscreen(false);return;}
    if(isStandalone())return;
    const request=ui.frame.requestFullscreen||ui.frame.webkitRequestFullscreen;
    if(!request){setPseudoFullscreen(true,isIOS());return;}
    try{await request.call(ui.frame,{navigationUI:'hide'});try{await screen.orientation?.lock?.('landscape');}catch{}syncFullscreenButton();}
    catch{setPseudoFullscreen(true,isIOS());}
  }
  function addObject(type, options = {}) { const { x = 60, y = ground, width = 40, height = 40, ...extra } = options; const object={ type, x: W + x, y, width, height, hit:false, ...extra };state.objects.push(object);return object; }
  function distanceDifficulty(){return Math.max(0,(state.distance-50000)/50000)}
  function restStopRiverClearanceActive(){return Boolean(state.restStop||state.restDeferred||state.distance>=state.nextRestDistance-REST_STOP_RIVER_CLEARANCE_DISTANCE);}
  function spawnWorld(dt) {
    state.spawn -= dt; state.nextHeart -= dt;
    if (state.spawn <= 0) {
      const lateRivers=state.distance>=60000,midRivers=state.distance>=30000,creekChance=lateRivers?.7:.55,r=Math.random();
      if (!restStopRiverClearanceActive()&&!dragonClearanceActive()&&state.riverSafeTimer<=0&&r < creekChance) {
        const baseWidth=lateRivers?rand(165,230)*(Math.random()<.62?1.18:1):midRivers?rand(128,188)*(Math.random()<.5?1.16:1):rand(85,142)*(Math.random()<.35?1.35:1),creekX=80,fishChance=state.distance>=50000?.39:.78;
        addObject('creek',{x:creekX,width:baseWidth,baseWidth,rainGrowth:state.rain*.35,seed:Math.random()*100});if(Math.random()<fishChance)addObject('fish',{x:creekX+baseWidth*.52,y:ground+8,width:27,height:15,triggered:false,leapTime:0,leap:0,currentY:ground+8});state.spawn = rand(2.2, 3.4);
      } else { if(Math.random()<.5)addObject('bush',{width:rand(48,87),height:rand(28,45), x:rand(40,150)}); state.spawn = rand(.8,1.45); }
    }
    if (state.nextHeart <= 0) { const heartDelay=state.distance>=50000?2:1;addObject('heart',{x:rand(90,210), y:ground-rand(113,180),width:25,height:25, bob:Math.random()*6.28}); state.nextHeart = rand(2.2,4.1)*heartDelay; }
    if (state.avalancheDuration > 0 && !dragonInProgress()) {
      state.boulderSpawn -= dt;
      if (state.boulderSpawn <= 0) {
        const extremeRockfall=state.distance>=100000,sizeRoll=Math.random(),size=extremeRockfall?(sizeRoll<.2?48:sizeRoll<.6?72:73):(sizeRoll<.51?48:sizeRoll<.85?72:73),isRolling=Math.random()*100<debugSettings.rollingShare,distancePastRocks=Math.max(0,(state.distance-20000)/50000),distanceScale=Math.max(.28,1/(1+distancePastRocks*.32)),avalancheScale=Math.max(.45,1/(1+Math.max(0,state.avalancheLevel-1)*.18)),extremeSpawnScale=extremeRockfall?.55:1;
        addObject('boulder',{x:rand(45,170),width:size,height:size,rotation:rand(0,Math.PI*2),isRolling,shapeSeed:rand(0,1000)});state.boulderSpawn=rand(2.1,2.9)*distanceScale*avalancheScale*extremeSpawnScale;
      }
    }
  }
  function updateEvents(dt) {
    if(state.weatherPhase==='clear'){state.rainClock-=dt;if(state.rainClock<=0){state.weatherPhase='darkening';state.weatherTimer=0;}}
    else if(state.weatherPhase==='darkening'){state.weatherTimer+=dt;state.skyDarkness=clamp(state.weatherTimer/3.2,0,1);if(state.weatherTimer>=3.2){state.weatherPhase='clouds-in';state.weatherTimer=0;}}
    else if(state.weatherPhase==='clouds-in'){state.weatherTimer+=dt;state.skyDarkness=1;state.stormCloudCover=clamp(state.weatherTimer/4,0,1);if(state.weatherTimer>=4){state.weatherPhase='raining';state.rainDuration=rand(10,15);state.rainStrengthDrainRemaining=state.rainHat?0:Math.min(.2,Math.max(0,state.strength-MIN_STRENGTH));state.rainStrengthDrainRate=state.rainDuration>0?state.rainStrengthDrainRemaining/state.rainDuration:0;state.rain=0;showPrompt('Huttetu - vulkanaske svir og jeg mister hoppekraft',3,true);sounds.rain();}}
    else if(state.weatherPhase==='raining'){state.rainDuration-=dt;state.rain=clamp(state.rain+dt*.55,0,1);state.skyDarkness=1;state.stormCloudCover=1;if(!state.rainHat&&state.rainStrengthDrainRemaining>0&&state.strength>MIN_STRENGTH){const loss=Math.min(state.rainStrengthDrainRemaining,state.rainStrengthDrainRate*dt,state.strength-MIN_STRENGTH);state.strength-=loss;state.rainStrengthDrainRemaining-=loss;}if(state.rainDuration<=0){state.weatherPhase='clearing';state.weatherTimer=0;state.rainStrengthDrainRemaining=0;state.rainStrengthDrainRate=0;sounds.rainStop();showPrompt('Askeregnet gir seg – skyene driver bort.',2.6);}}
    else if(state.weatherPhase==='clearing'){state.weatherTimer+=dt;const clear=clamp(state.weatherTimer/5,0,1);state.rain=clamp(1-state.weatherTimer/1.8,0,1);state.stormCloudCover=1-clear;state.skyDarkness=1-clear;if(clear>=1){state.weatherPhase='clear';state.rain=0;state.skyDarkness=0;state.stormCloudCover=0;state.sunGlow=8;state.rainClock=rand(34,50);}}
    syncRainStrengthEffect();
    updateDragon(dt);
    if(dragonInProgress()||state.ended)return;
    if (state.distance >= 20000 && state.avalancheClock <= 0 && state.avalancheLeadIn <= 0 && state.avalancheDuration <= 0) { const d=distanceDifficulty();state.avalancheClock=rand(Math.max(7,15-d*2),Math.max(13,30-d*4)); }
    if (state.avalancheClock > 0) { state.avalancheClock -= dt; if (state.avalancheClock <= 0) { state.avalancheLevel++;state.avalancheLeadIn=1.45;state.plannedAvalancheDuration=state.avalancheLevel===1?rand(6,8):rand(8,12);showPrompt('VARSEL: LAVARAS!',3,true); } }
    if(state.avalancheLeadIn>0){state.avalancheLeadIn-=dt;if(state.avalancheLeadIn<=0){state.avalancheLeadIn=0;state.avalancheDuration=state.plannedAvalancheDuration;state.boulderSpawn=.05;SfxStore.startLoop('rockfall',.55);}}
    if (state.avalancheDuration > 0) { state.avalancheDuration -= dt;if(state.avalancheDuration <= 0) { state.avalancheClock=0;SfxStore.stopLoop('rockfall');showPrompt('Lavaraset er over.',2); } }
  }
  function collide(a, b) { return a.x < b.x+b.width && a.x+a.w > b.x && a.y < b.y+b.height && a.y+a.h > b.y; }
  function loseHeart() { state.hearts--;animateHeartLoss();sounds.splash();if(state.hearts<=0)endGame(); }
  function applyImpactDamage(fromPlayer=false){
    if(state.hearts<=0){endGame();return;}
    decreaseRunSpeed();
    const heartsBeforeHit=state.hearts,lost=Math.min(state.hearts,Math.max(1,Math.ceil(state.hearts*.3)));
    state.hearts-=lost;animateRockHeartLoss(heartsBeforeHit,state.hearts,fromPlayer);
    if(state.hearts===0)endGame();
  }
  function addSplash(x,y){const drops=Array.from({length:13},(_,i)=>({x:0,y:0,vx:(i-6)*27+rand(-18,18),vy:rand(-260,-115),r:rand(2,5)}));state.splashes.push({x,y,age:0,drops});}
  function addRockImpact(x,y){
    const particles=Array.from({length:20},(_,i)=>{const angle=i/20*Math.PI*2+rand(-.18,.18),speed=rand(95,245);return{x:0,y:0,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-rand(20,85),size:rand(2.2,5.4),warm:i%3===0};});
    state.rockImpacts.push({x,y,age:0,particles});
  }
  function naturalTravelTime(distance){const rampTime=(ORIGINAL_MAX_RUN_SPEED-BASE_RUN_SPEED)/2.55,rampDistance=(BASE_RUN_SPEED*rampTime+1.275*rampTime*rampTime)/5.4;if(distance<=rampDistance)return(-BASE_RUN_SPEED+Math.sqrt(BASE_RUN_SPEED*BASE_RUN_SPEED+4*1.275*distance*5.4))/(2*1.275);return rampTime+(distance-rampDistance)/(ORIGINAL_MAX_RUN_SPEED/5.4);}
  function rockfallInProgress(){return Boolean(state?.avalancheLeadIn>0||state?.avalancheDuration>0||state?.objects.some(o=>o.type==='boulder'&&o.x+o.width>0));}
  function dragonInProgress(){return Boolean(state?.dragon);}
  function drawDragon(){
    const dragon=state.dragon;if(!dragon)return;
    const pose=dragonPose(dragon),flames=dragonFlames(dragon),flap=Math.sin(dragon.age*9)*24;
    ctx.save();
    if(flames.length){
      const fire=ctx.createLinearGradient(flames.at(-1).x,0,pose.x-70,0);
      fire.addColorStop(0,'#ef4a19');fire.addColorStop(.55,'#ff7924');fire.addColorStop(1,'#ffe388');
      ctx.fillStyle=fire;ctx.shadowColor='#ff631e';ctx.shadowBlur=16;ctx.beginPath();
      for(const f of flames){ctx.moveTo(f.x+f.r,f.y);ctx.arc(f.x,f.y,f.r,0,Math.PI*2);}ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#ffe9a0';ctx.beginPath();
      for(const f of flames){ctx.moveTo(f.x+f.r*.48,f.y);ctx.arc(f.x,f.y,f.r*.48,0,Math.PI*2);}ctx.fill();
    }
    ctx.translate(pose.x,pose.y);ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#2b1829';
    // Far wing and a curling tail behind the body.
    ctx.fillStyle='#643442';ctx.beginPath();ctx.moveTo(-5,-6);ctx.quadraticCurveTo(24,-50,55,-79-flap*.6);ctx.lineTo(98,-25-flap*.3);ctx.quadraticCurveTo(62,-39,48,-12);ctx.quadraticCurveTo(28,-29,12,8);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#663143';ctx.beginPath();ctx.moveTo(29,-9);ctx.bezierCurveTo(66,-7,80,32,118,12);ctx.quadraticCurveTo(140,0,137,-17);ctx.quadraticCurveTo(148,18,118,31);ctx.bezierCurveTo(80,48,59,15,30,18);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#d5814e';for(let i=0;i<5;i++){const x=30+i*16,y=-11+i*5;ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x+5,y-9);ctx.lineTo(x+13,y+9);ctx.closePath();ctx.fill();}
    // Body, belly and tucked legs stay well above a grounded Teodor.
    ctx.fillStyle='#773d4f';ctx.beginPath();ctx.ellipse(2,1,44,25,-.06,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ce9566';ctx.beginPath();ctx.ellipse(-8,12,29,12,.13,0,Math.PI*2);ctx.fill();
    for(const x of [-24,23]){ctx.fillStyle='#673346';ctx.beginPath();ctx.moveTo(x,14);ctx.quadraticCurveTo(x-13,29,x-5,37);ctx.lineTo(x-21,36);ctx.lineTo(x-16,41);ctx.lineTo(x+2,41);ctx.quadraticCurveTo(x+6,30,x+11,18);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#f1d59c';ctx.beginPath();ctx.moveTo(x-17,37);ctx.lineTo(x-22,40);ctx.moveTo(x-9,38);ctx.lineTo(x-13,42);ctx.stroke();ctx.strokeStyle='#2b1829';}
    // Bat-like front wing: animated membrane with three visible wing fingers.
    const wingY=-88-flap;
    ctx.fillStyle='#a64c43';ctx.beginPath();ctx.moveTo(-16,-2);ctx.quadraticCurveTo(-9,-50,28,wingY);ctx.lineTo(82,-32-flap*.45);ctx.quadraticCurveTo(53,-40,43,-9);ctx.quadraticCurveTo(25,-28,15,6);ctx.quadraticCurveTo(0,-8,-16,-2);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#54283b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-16,-2);ctx.quadraticCurveTo(-9,-50,28,wingY);ctx.lineTo(43,-9);ctx.moveTo(28,wingY);ctx.lineTo(15,6);ctx.moveTo(28,wingY);ctx.lineTo(82,-32-flap*.45);ctx.stroke();
    // Curved neck, horned head and a bright eye facing the oncoming player.
    ctx.strokeStyle='#2b1829';ctx.lineWidth=2;ctx.fillStyle='#773d4f';ctx.beginPath();ctx.moveTo(-23,-17);ctx.bezierCurveTo(-42,-41,-51,-17,-53,0);ctx.lineTo(-69,1);ctx.quadraticCurveTo(-82,5,-80,17);ctx.lineTo(-58,22);ctx.quadraticCurveTo(-43,22,-40,10);ctx.quadraticCurveTo(-34,-3,-26,12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#f0d4a0';ctx.beginPath();ctx.moveTo(-53,-8);ctx.quadraticCurveTo(-46,-21,-32,-26);ctx.lineTo(-42,-4);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#3b1c29';ctx.beginPath();ctx.moveTo(-79,16);ctx.lineTo(-57,17);ctx.lineTo(-63,dragon.breathing?29:23);ctx.lineTo(-79,dragon.breathing?24:20);ctx.closePath();ctx.fill();
    ctx.fillStyle='#8e4853';ctx.beginPath();ctx.moveTo(-62,dragon.breathing?29:23);ctx.lineTo(-80,dragon.breathing?26:22);ctx.lineTo(-78,dragon.breathing?31:26);ctx.lineTo(-59,dragon.breathing?33:28);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffdd66';ctx.shadowColor='#ff8b25';ctx.shadowBlur=6;ctx.beginPath();ctx.ellipse(-62,6,5,3,-.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#251b24';ctx.fillRect(-64,3,2,6);ctx.beginPath();ctx.arc(-77,11,1.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff1cb';ctx.beginPath();ctx.moveTo(-72,17);ctx.lineTo(-69,22);ctx.lineTo(-66,17);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function dragonClearanceActive(){return dragonInProgress()||(state.distance>=DRAGON_START_DISTANCE&&state.dragonClock<=2&&!rockfallInProgress());}
  function dragonPose(dragon){return {x:dragon.x,y:ground-state.player.h-82+Math.sin(dragon.age*3.4)*5};}
  // Dragen kommer saktere fremover i starten (easing), så den rekker flere angrep.
  function dragonXAt(age){return W+140-(W+460)*Math.pow(clamp(age,0,DRAGON_FLIGHT_DURATION)/DRAGON_FLIGHT_DURATION,1.4);}
  function dragonEvent(dragon){
    if(dragon.events){for(const ev of dragon.events)if(dragon.age>=ev.start&&dragon.age<ev.start+DRAGON_ATTACK_WINDOW)return ev;return null;}
    // Dragoner uten plan (tester, gamle frø) beholder den gamle flamme-kadansen.
    const elapsed=dragon.age-DRAGON_FIRST_ATTACK_AGE,cycle=elapsed%2.1;
    if(elapsed<0||elapsed>4.9||cycle>=1.35)return null;
    return {type:'flame',start:dragon.age-cycle};
  }
  function dragonFlames(dragon){
    const event=dragonEvent(dragon);
    if(!event||event.type!=='flame')return [];
    if(state.objects.some(o=>o.type==='lavaball'&&o.x+o.width>0))return [];
    const cycle=dragon.age-event.start,strength=Math.min(1,cycle/.18,(DRAGON_ATTACK_WINDOW-cycle)/.2);
    if(strength<=.05)return [];
    const pose=dragonPose(dragon),mouthX=pose.x-76,mouthY=pose.y+18;
    return Array.from({length:23},(_,index)=>{const u=index/22;return {x:mouthX-270*strength*u,y:mouthY+16*u+Math.sin(dragon.age*20-index*.6)*2*Math.sin(u*Math.PI),r:(6+18*Math.sin(u*Math.PI))*strength};});
  }
  function spawnLavaBalls(dragon){
    const pose=dragonPose(dragon),count=Math.round(rand(2.6,3.9));
    for(let k=0;k<count;k++){const size=rand(24,34);
      // Kuler holder seg i munnen til sin delay slipper dem, i rekkefølge.
      addObject('lavaball',{x:pose.x-76-size*.5-W,y:pose.y+16-size*.5,width:size,height:size,holding:true,falling:false,rolling:false,vy:0,delay:.12+k*rand(.22,.36),thrown:rand(130,240),rotation:rand(0,6.28),shapeSeed:rand(0,1000)});}
  }
  function dragonTouchesPlayer(dragon,flames){
    const p=state.player;
    // Ground safety is explicit, in addition to keeping all fire above head height.
    if(p.onGround||p.y+p.h>=ground-1||p.inv>0)return false;
    const pose=dragonPose(dragon);
    if(collide(p,{x:pose.x-35,y:pose.y-15,width:82,height:37})||collide(p,{x:pose.x-74,y:pose.y+2,width:35,height:27}))return true;
    return flames.some(flame=>{const dx=flame.x-clamp(flame.x,p.x+4,p.x+p.w-4),dy=flame.y-clamp(flame.y,p.y+4,p.y+p.h-4);return dx*dx+dy*dy<Math.max(0,flame.r-2)**2;});
  }
  function updateDragon(dt){
    if(dt<=0)return;
    if(state.dragon){
      const dragon=state.dragon;
      dragon.age+=dt;dragon.x=dragonXAt(dragon.age);
      if(dragon.age>=DRAGON_FLIGHT_DURATION){state.dragon=null;state.dragonClock=rand(24,38);state.avalancheClock=Math.max(4,state.avalancheClock);state.riverSafeTimer=Math.max(2,state.riverSafeTimer);return;}
      const event=dragonEvent(dragon),flames=dragonFlames(dragon);
      if(event&&!dragon.breathing){dragon.breathing=true;
        if(event.type==='flame'){sounds.fire();showPrompt('Ildpust! Hold deg på bakken.',2.2,true);}
        else{sounds.fireball();spawnLavaBalls(dragon);showPrompt('Lavakuler! Hopp over kulene.',2.2,true);}}
      else if(!event&&dragon.breathing)dragon.breathing=false;
      if(dragonTouchesPlayer(dragon,flames)){
        state.player.inv=1.6;state.hitShake=.16;sounds.splash();applyImpactDamage(true);
        if(!state.ended)showPrompt('Dragen traff! Løp under den – bakken er trygg.',2.6,true);
      }
      return;
    }
    if(state.distance<DRAGON_START_DISTANCE||state.fireGlow>0||state.restTimer>0||state.restStop||state.restDeferred||restStopRiverClearanceActive())return;
    state.dragonClock=Math.max(0,state.dragonClock-dt);
    if(state.dragonClock>0||rockfallInProgress())return;
    // Let existing rivers pass before asking the player to stay on the ground.
    if(state.objects.some(o=>o.type==='creek'&&o.x+o.width>state.player.x-8))return;
    // Angrepene veksler strengt mellom ildpust og lavakuler, tilfeldig starttype.
    // Lavakuler kan bare spyttes mens dragen fortsatt er langt foran spilleren,
    // og antall angrep skal gi 4-5 hendelser totalt per flukt.
    const events=[],first=Math.random()<.5?'flame':'lava',count=Math.random()<.5?4:5;
    let start=DRAGON_FIRST_ATTACK_AGE,type=first;
    for(let k=0;k<count;k++){
      if(type==='lava'&&dragonXAt(start)<state.player.x+DRAGON_LAVA_CLEARANCE)type='flame';
      events.push({start,type});type=type==='flame'?'lava':'flame';start+=rand(2.15,2.6);
    }
    state.dragon={age:0,x:W+140,breathing:false,events};
    sounds.rumble();showPrompt('DRAGE! Hold deg på bakken – eller hopp over lavakulene!',3.8,true);
  }
  function prepareRestStop(){
    if(state.restStop||state.distance<state.nextRestDistance-REST_STOP_APPROACH_DISTANCE)return;
    if(rockfallInProgress()||dragonInProgress()){state.restDeferred=true;return;}
    const p=state.player,targetX=Math.min(W-REST_STOP_WIDTH-16,p.x+p.w+18),remainingDistance=state.restDeferred?REST_STOP_APPROACH_DISTANCE:Math.max(0,state.nextRestDistance-state.distance),stop=REST_STOPS[state.restIndex%REST_STOPS.length];
    state.restDeferred=false;
    state.restStop={...stop,x:targetX+remainingDistance*5.4,targetX,approaching:true};
  }
  function nextRestInterval(){return state.restIndex<2?REST_STOP_INTERVAL:REST_STOP_INTERVAL+(state.restIndex-1)*1000;}
  function restScheduleAtDistance(distance){let restIndex=0,nextRestDistance=REST_STOP_INTERVAL;while(nextRestDistance<=distance){restIndex++;nextRestDistance+=restIndex<2?REST_STOP_INTERVAL:REST_STOP_INTERVAL+(restIndex-1)*1000;}return {restIndex,nextRestDistance};}
  function startRestStop(){
    if(rockfallInProgress()||dragonInProgress())return false;
    prepareRestStop();
    const stop=state.restStop,p=state.player;if(!stop)return false;
    stop.x=stop.targetX;stop.approaching=false;stop.leaving=false;state.restDeferred=false;state.restIndex++;state.nextRestDistance+=nextRestInterval();state.restTimer=1;state.shopOpen=false;state.shopSnapshot=null;state.smallJumpBrothPurchases=0;state.player.vy=0;state.player.y=ground-p.h;state.player.onGround=true;state.player.jumpHeld=false;state.player.jumpHold=0;state.player.airJumped=false;state.player.jumpBoost=1;
    sounds.rest();showPrompt(`${stop.name} – ta en rast, besøk butikken eller gå videre.`,3.4);return true;
  }
  function debugRockfall(startKm){const startDistance=Math.round(startKm*1000),restSchedule=restScheduleAtDistance(startDistance);startGame();state.debugMode=true;state.difficulty=DIFFICULTIES.easy;state.introTimer=0;ui.debugPanel.classList.remove('hidden-controls');state.distance=startDistance;state.restIndex=restSchedule.restIndex;state.nextRestDistance=restSchedule.nextRestDistance;state.t=naturalTravelTime(state.distance);state.speed=state.difficulty.maxRunSpeed;state.speedBoost=state.difficulty.maxSpeedLevel;state.speedBoostTarget=state.difficulty.maxSpeedLevel;state.backgroundOffset=state.distance*5.4;state.hearts=100;state.avalancheClock=state.distance>=20000?3:0;state.avalancheLevel=0;showPrompt(state.distance>=20000?`DEBUG: Starter på ${formatDistance(state.distance)}. Første lavaras om 3 sekunder. Resultatet registreres ikke.`:`DEBUG: Starter på ${formatDistance(state.distance)}. Resultatet registreres ikke.`,4,state.distance>=20000);updateUI();}
  function requestDebugRockfall(){const pin=window.prompt('Skriv inn pinkoden for debugmodus:');if(pin===null)return;if(pin.trim()!==DEBUG_PIN){window.alert('Feil pinkode.');return;}const distanceInput=window.prompt('Hvor mange kilometer skal debugturen starte på?','20');if(distanceInput===null)return;const startKm=Number(distanceInput.trim().replace(',','.'));if(!Number.isFinite(startKm)||startKm<0||startKm>10000){window.alert('Skriv inn et tall mellom 0 og 10 000 kilometer.');return;}debugRockfall(startKm);}
  function populatePriceEditor(values=ShopPriceStore.get()){ui.priceEditorFields.forEach(input=>{const field=PRICE_EDITOR_FIELDS.find(item=>item.key===input.dataset.priceField);input.value=String(Number.isInteger(values[field.key])?values[field.key]:field.fallback);});}
  function closePriceEditor(){priceEditorPin='';ui.priceEditorOverlay.classList.add('hidden');ui.priceEditorStatus.textContent='';ui.priceEditorStatus.className='price-editor-status';}
  function requestPriceEditor(){
    const pin=window.prompt('Skriv inn pinkoden for prisredigering:');if(pin===null)return;if(pin.trim()!==DEBUG_PIN){window.alert('Feil pinkode.');return;}
    priceEditorPin=pin.trim();populatePriceEditor();ui.priceEditorStatus.className='price-editor-status';ui.priceEditorStatus.textContent=ShopPriceStore.hasLegacyPrices?'Tidligere lokale priser er hentet inn. Trykk «Lagre i prosjektet» for å gjøre dem klare til publisering.':'Endringer lagres i shop-prices.json på den lokale testserveren.';ui.priceEditorOverlay.classList.remove('hidden');ui.priceEditorFields[0]?.focus();
  }
  function useDefaultShopPrices(){populatePriceEditor(DEFAULT_SHOP_PRICES);ui.priceEditorStatus.className='price-editor-status';ui.priceEditorStatus.textContent='Standardverdiene er fylt inn. Trykk «Lagre i prosjektet» for å bruke dem.';}
  async function savePriceEditor(event){
    event.preventDefault();const prices={};
    for(const input of ui.priceEditorFields){const value=Number(input.value);if(!Number.isInteger(value)||value<0||value>999){ui.priceEditorStatus.className='price-editor-status error';ui.priceEditorStatus.textContent='Alle priser må være heltall mellom 0 og 999.';input.focus();return;}prices[input.dataset.priceField]=value;}
    ui.priceEditorSave.disabled=true;ui.priceEditorDefaults.disabled=true;ui.priceEditorCancel.disabled=true;ui.priceEditorStatus.className='price-editor-status';ui.priceEditorStatus.textContent='Lagrer i prosjektet …';
    try{await ShopPriceStore.save(prices,priceEditorPin);if(state)updateUI();ui.priceEditorStatus.className='price-editor-status success';ui.priceEditorStatus.textContent='Lagret i shop-prices.json. Disse prisene følger med ved publisering.';}
    catch(error){ui.priceEditorStatus.className='price-editor-status error';ui.priceEditorStatus.textContent=error.message||'Kunne ikke lagre prisene.';}
    finally{ui.priceEditorSave.disabled=false;ui.priceEditorDefaults.disabled=false;ui.priceEditorCancel.disabled=false;}
  }
  function update(dt) {
    if(state.introTimer>0){state.introTimer=Math.max(0,state.introTimer-dt);return;}
    if(state.restTimer>0){state.t+=dt;state.player.jumpHeld=false;updateUI();return;}
    state.t+=dt;state.snackBoostTimer=Math.max(0,state.snackBoostTimer-dt);state.riverSafeTimer=Math.max(0,state.riverSafeTimer-dt);state.speedBoost+=(state.speedBoostTarget-state.speedBoost)*Math.min(1,dt*SPEED_EASE);const rawSpeed=speedForLevel(state.speedBoost),rockfallActive=rockfallInProgress(),rockfallTarget=rockfallActive?Math.min(1.12,.72+Math.max(0,state.avalancheLevel-1)*.08):1;state.rockfallSpeedScale+=(rockfallTarget-state.rockfallSpeedScale)*Math.min(1,dt*1.7);state.speed=clamp(rawSpeed*state.rockfallSpeedScale,state.difficulty.startRunSpeed,state.difficulty.maxRunSpeed);const travelDt=state.fireGlow>0?0:dt;state.distance+=(state.speed/5.4)*travelDt;state.backgroundOffset+=state.speed*travelDt;
    if((rockfallActive||dragonInProgress())&&state.restStop?.approaching){state.restStop=null;state.restDeferred=true;}
    prepareRestStop();
    if(state.restStop?.approaching){state.restStop.x-=state.speed*travelDt;if(state.restStop.x<=state.restStop.targetX){state.restStop.x=state.restStop.targetX;if(startRestStop()){updateUI();return;}state.restStop=null;state.restDeferred=true;}}
    else if(state.restStop?.leaving){state.restStop.x-=state.speed*travelDt;if(state.restStop.x+REST_STOP_WIDTH<-12)state.restStop=null;}
    const p=state.player,previousBottom=p.y+p.h;if(p.jumpHeld&&p.jumpHold<.34&&p.vy<0){p.jumpHold+=dt;p.vy-=1200*(.6+state.strength*.4)*JUMP_HEIGHT_SCALE*(p.jumpBoost||1)*dt;}p.vy += 1580*JUMP_HEIGHT_SCALE*dt; p.y += p.vy * dt; if (p.y >= ground-p.h) { p.y=ground-p.h;p.vy=0;p.onGround=true;p.jumpHeld=false;p.jumpHold=0;p.airJumped=false;p.jumpBoost=1; } if (p.inv>0)p.inv-=dt;
    if(state.fireGlow>0)state.strength=clamp(state.strength+dt*.36,0,1);state.fireGlow=Math.max(0,state.fireGlow-dt);state.sunGlow=Math.max(0,state.sunGlow-dt);state.hitShake=Math.max(0,state.hitShake-dt);state.rockHitTimer=Math.max(0,state.rockHitTimer-dt);spawnWorld(travelDt);updateEvents(travelDt);if(state.ended)return;updateLightning(travelDt);
    for (let i=state.objects.length-1;i>=0;i--) { const o=state.objects[i],rolling=o.type==='boulder'&&o.isRolling,lavaBall=o.type==='lavaball',relativeSpeed=rolling?state.speed*debugSettings.relativeRollSpeed:lavaBall?(o.falling?o.thrown:o.rolling?state.speed*.5:0):0,objectSpeed=state.speed+relativeSpeed;o.x-=objectSpeed*travelDt;if(rolling)o.rotation-=relativeSpeed/Math.max(16,o.width*.5)*travelDt*debugSettings.rotationSpeed;
      if(lavaBall){
        if(o.holding){if(state.dragon){const mouth=dragonPose(state.dragon);o.x=mouth.x-76-o.width*.5;o.y=mouth.y+16-o.height*.5;}o.delay-=dt;if(o.delay<=0){o.holding=false;o.falling=true;o.vy=rand(-70,-15);}}
        else if(o.falling){o.vy+=1520*dt;o.y+=o.vy*dt;if(o.y+o.height>=ground){o.y=ground-o.height;o.falling=false;o.rolling=true;}}
        else o.rotation-=relativeSpeed/Math.max(14,o.width*.5)*travelDt;
        if(!o.hit&&!o.holding&&p.inv<=0&&collide(p,{x:o.x+2,y:o.y+2,width:o.width-4,height:o.height-4})){state.objects.splice(i,1);p.inv=1.6;state.hitShake=.2;addRockImpact(p.x+p.w*.7,Math.min(p.y+p.h,ground)-2);sounds.rock();applyImpactDamage(true);if(!state.ended)showPrompt('Flammekula traff deg! Hopp over kulene.',2.6,true);continue;}}
      if(o.type==='heart'){o.bob+=dt*5;if(o.collected){o.pop+=dt*3;if(o.pop>=1)state.objects.splice(i,1);continue;}const target={x:o.x,y:o.y+Math.sin(o.bob)*4,width:o.width,height:o.height};if(collide(p,target)){state.hearts++;increaseRunSpeed();o.collected=true;o.pop=0;animateHeartGain();sounds.heart();showTutorial('heart','Du fant et hjerte','Hvert hjerte øker farten ett trinn, i tillegg til å være liv og brensel til bålet. Hvert treff på en hindring senker farten ett tilsvarende trinn.');continue;}}
      if(o.type==='fish'){if(!o.triggered&&o.x>p.x+90&&o.x<p.x+300){o.triggered=true;o.leapTime=0;}if(o.triggered){o.leapTime+=dt;const progress=o.leapTime/1.35;o.leap=progress<=1?Math.sin(progress*Math.PI):0;if(progress>1.5){o.triggered=false;o.leapTime=0;}}o.currentY=ground+9-o.leap*96;const target={x:o.x-8,y:o.currentY-o.height*.5-7,width:o.width+16,height:o.height+14};if(state.doubleJumps<state.maxFishSlots&&o.leap>.12&&collide(p,target)){const slotIndex=state.doubleJumps;state.doubleJumps++;animateFishCatch(o.x+o.width*.5,o.currentY,slotIndex);state.objects.splice(i,1);sounds.heart();showTutorial('fish','Fisk gir dobbelthopp','Hver fisk fyller ett tomt fiskespor. Trykk igjen mens Teodor er i luften for å bruke ett.');continue;}}
      if(o.type==='creek'){const targetGrowth=state.rain>0?1:0,progression=1+distanceDifficulty()*.18,maxClearable=state.speed*1.1+p.w*.5;o.rainGrowth=clamp(o.rainGrowth+(targetGrowth>o.rainGrowth?dt*.42:-dt*.08),0,1);if(!o.channelWidth)o.channelWidth=Math.min(o.baseWidth*progression,maxClearable);const wanted=o.channelWidth*(1+o.rainGrowth*.8),newWidth=Math.min(wanted,maxClearable);o.x-=(newWidth-o.width)*.5;o.width=newWidth;}
      if (o.type==='creek' && !o.hit && p.x+p.w > o.x+7 && p.x < o.x+o.width-7 && p.y+p.h > ground-18 && p.inv<=0) { o.hit=true;p.inv=1.1;p.vy=0;p.y=ground-p.h;p.onGround=true;p.jumpHeld=false;p.airJumped=false;p.jumpBoost=1;addSplash(p.x+p.w*.5,ground);decreaseRunSpeed();state.strength=clamp(state.strength-.2,MIN_STRENGTH,1);if(state.boots)sounds.splash();else loseHeart();showTutorial('water','Lava svir Teodor',state.boots?'Lavastøvlene beskytter hjertene, men Teodor mister fortsatt ett fartstrinn og 20 % hoppekraft i lavaelva.':'Når Teodor blir brent av lavaen, mister han ett hjerte, ett fartstrinn og 20 % hoppekraft, men hoppekraften går aldri under minimumsnivået. Han kan hoppe videre med én gang. Askeregn gjør lavaelvene stadig bredere.'); }
      if(o.type==='boulder'&&!o.hit){const stoneTop=ground-o.height,horizontalOverlap=p.x+p.w>o.x+3&&p.x<o.x+o.width-3,landing=horizontalOverlap&&p.vy>=0&&previousBottom<=stoneTop+7&&p.y+p.h>=stoneTop;if(landing){p.y=stoneTop-p.h;p.vy=0;p.onGround=true;p.jumpHeld=false;p.jumpHold=0;p.airJumped=false;p.jumpBoost=1;}else{const frontHitbox={x:o.x-3,y:stoneTop+o.height*.22,width:o.width*.42+6,height:o.height*.78};if(collide(p,frontHitbox)&&p.inv<=0){o.hit=true;p.inv=3;state.rockHitTimer=ROCK_HIT_DURATION;state.hitShake=.24;addRockImpact(p.x+p.w*.78,p.y+p.h*.48);sounds.rock();if(!absorbWithFirstAid()){applyImpactDamage();if(state.ended)return;showTutorial('rock','Pass opp for lavaras','Et lavasteintreff tar en tredel av hjertene Teodor har akkurat da og senker farten ett trinn. Han kan fortsatt hoppe umiddelbart etter treffet.');}}}}
      if (o.x+o.width < -80)state.objects.splice(i,1);
    }
    for(let i=state.splashes.length-1;i>=0;i--){const splash=state.splashes[i];splash.age+=dt;for(const d of splash.drops){d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=620*dt;}if(splash.age>.8)state.splashes.splice(i,1);}
    for(let i=state.rockImpacts.length-1;i>=0;i--){const impact=state.rockImpacts[i];impact.age+=dt;for(const particle of impact.particles){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vx*=Math.pow(.08,dt);particle.vy+=430*dt;}if(impact.age>.62)state.rockImpacts.splice(i,1);}
    if (state.promptTimer>0) { state.promptTimer-=dt;if(state.promptTimer<=0)ui.banner.classList.remove('show'); }
    updateUI();
  }
  function cloud(x,y,s) {ctx.beginPath();ctx.arc(x,y,s*.25,0,7);ctx.arc(x+s*.27,y-s*.08,s*.32,0,7);ctx.arc(x+s*.58,y,s*.25,0,7);ctx.lineTo(x+s*.78,y+s*.22);ctx.lineTo(x-s*.22,y+s*.22);ctx.fill();}
  function seeded(index, salt = 0) { const v = Math.sin((index + salt * 19.19) * 127.13) * 43758.5453; return v - Math.floor(v); }
  function mountainBand(parallax,baseY,color,facetColor,spacing,minHeight,maxHeight,salt,snowy){const world=state.backgroundOffset*parallax,first=Math.floor(world/spacing)-3,count=Math.ceil(W/spacing)+7;for(let n=0;n<count;n++){const i=first+n,center=i*spacing-world+(seeded(i,salt)-.5)*spacing*.45,width=spacing*(.9+seeded(i,salt+1)*1.15),height=H*(minHeight+seeded(i,salt+2)*(maxHeight-minHeight)),left={x:center-width*.5,y:baseY},right={x:center+width*.5,y:baseY},peak={x:center+width*(seeded(i,salt+3)-.5)*.2,y:baseY-height};const tallVolcano=height>H*(minHeight+(maxHeight-minHeight)*.72),platY=peak.y+height*.09,platX0=peak.x-width*.055,platX1=peak.x+width*.055;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(left.x,left.y);if(tallVolcano){ctx.bezierCurveTo(left.x+width*.16,baseY-height*.16,peak.x-width*.24,platY+height*.2,platX0,platY);ctx.lineTo(platX1,platY);ctx.bezierCurveTo(platX1+width*.12,platY+height*.12,right.x-width*.13,baseY-height*.14,right.x,right.y);}else{ctx.bezierCurveTo(left.x+width*.16,baseY-height*.16,peak.x-width*.24,peak.y+height*.3,peak.x,peak.y);ctx.bezierCurveTo(peak.x+width*.2,peak.y+height*.2,right.x-width*.13,baseY-height*.14,right.x,right.y);}ctx.closePath();ctx.fill();ctx.fillStyle=facetColor;ctx.globalAlpha=.34;ctx.beginPath();if(tallVolcano){ctx.moveTo(platX1,platY);}else{ctx.moveTo(peak.x,peak.y);}ctx.lineTo(right.x,right.y);ctx.lineTo(center+width*.05,baseY);if(tallVolcano){ctx.lineTo(platX1-width*.04,platY+height*.35);}else{ctx.lineTo(peak.x-width*.04,peak.y+height*.42);}ctx.closePath();ctx.fill();ctx.globalAlpha=1;if(tallVolcano){const craterW=width*.15,frontY=platY+8,eruptionPulse=.6+.4*Math.sin(state.t*3.1+i);
  // Bakkanten buer opp fra fjellsidene uten loddrette avslutninger.
  const rimHalf=(platX1-platX0)*.5,rimRise=6+rimHalf*(.18+seeded(i,salt+100)*.08);
  const backGrad=ctx.createLinearGradient(0,platY-rimRise,0,frontY);backGrad.addColorStop(0,color);backGrad.addColorStop(.45,'#794535');backGrad.addColorStop(1,'#c25a2a');
  ctx.fillStyle=backGrad;ctx.beginPath();ctx.moveTo(platX0,platY);ctx.bezierCurveTo(peak.x-rimHalf*.78,platY-rimRise*.8,peak.x-rimHalf*.4,platY-rimRise*1.05,peak.x-rimHalf*.08,platY-rimRise*.9);ctx.bezierCurveTo(peak.x+rimHalf*.3,platY-rimRise*.72,peak.x+rimHalf*.64,platY-rimRise*.95,platX1,platY);ctx.bezierCurveTo(peak.x+rimHalf*.7,frontY,peak.x-rimHalf*.7,frontY,platX0,platY);ctx.closePath();ctx.fill();
  // Én smal, organisk lavaåpning mellom kantene.
  const lavaHalf=rimHalf*.84,lavaY=platY+1;ctx.save();ctx.shadowColor='#ff6a20';ctx.shadowBlur=18;ctx.fillStyle='#e64a1a';ctx.beginPath();ctx.moveTo(peak.x-lavaHalf,lavaY);ctx.bezierCurveTo(peak.x-lavaHalf*.55,lavaY-5,peak.x+lavaHalf*.5,lavaY-4,peak.x+lavaHalf,lavaY);ctx.bezierCurveTo(peak.x+lavaHalf*.65,frontY+2,peak.x-lavaHalf*.6,frontY+2,peak.x-lavaHalf,lavaY);ctx.closePath();ctx.fill();ctx.restore();
  // Lavaelver som et tre opp-ned fra platåets fremkant: bredt hovedløp øverst som smalner ned til foten, med to grener.
  const lavaFlow=(pts,w0,w1,ws)=>{ctx.beginPath();pts.forEach((pt,k)=>{const f=pts.length>1?k/(pts.length-1):0,w=(pt[2]??(w0*(1-f)+w1*f))*ws;if(k===0)ctx.moveTo(pt[0]-w,pt[1]);else ctx.lineTo(pt[0]-w,pt[1]);});for(let k=pts.length-1;k>=0;k--){const f=pts.length>1?k/(pts.length-1):0,w=(pts[k][2]??(w0*(1-f)+w1*f))*ws;ctx.lineTo(pts[k][0]+w,pts[k][1]);}ctx.closePath();ctx.fill();};
  const gapX=peak.x+(seeded(i,salt+130)-.5)*rimHalf*.36,trunkTopW=Math.min(rimHalf*.42,8+seeded(i,salt+131)*2),riverStartY=lavaY+.5,trunkPts=[[gapX,riverStartY,trunkTopW],[gapX,frontY+height*.035,trunkTopW*.7]];
  let trunkX=gapX;const trunkSegs=6;
  for(let g=1;g<=trunkSegs;g++){const f=g/trunkSegs;trunkX+=(seeded(i,salt+140+g)-.5)*width*.05*(.3+.7*f);trunkPts.push([trunkX,riverStartY+(baseY-riverStartY)*f,trunkTopW*.7*(1-f)+1.5*f]);}
  const lavaBranch=(startIdx,dir)=>{const st=trunkPts[startIdx],pts=[[st[0],st[1]]];let px=st[0],py=st[1];const blen=height*(.14+seeded(i,salt+150+startIdx-1)*.1);for(let g=1;g<=3;g++){px+=dir*(width*.018+seeded(i,salt+160+g+startIdx-1)*width*.022);py+=blen/3;pts.push([px,py]);}return pts;};
  const branchA=lavaBranch(3,-1),branchB=lavaBranch(5,1);
  // Forkanten er lavere og fortsetter ned i fjellsiden i samme farge som fjellet.
  const frontDepth=height*.04;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(platX0,platY);ctx.bezierCurveTo(peak.x-rimHalf*.82,frontY-1,peak.x-rimHalf*.48,frontY+1,peak.x-rimHalf*.15,frontY);ctx.bezierCurveTo(peak.x+rimHalf*.2,frontY-1,peak.x+rimHalf*.72,frontY+2,platX1,platY);ctx.bezierCurveTo(peak.x+rimHalf*.8,frontY+frontDepth,peak.x-rimHalf*.8,frontY+frontDepth,platX0,platY);ctx.closePath();ctx.fill();
  // Lavaelven tegnes sist, slik at den kommer uhindret ut foran kraterkanten.
  ctx.save();ctx.shadowColor='#ff5a1f';ctx.shadowBlur=12;ctx.fillStyle='#e64a1a';
  lavaFlow(trunkPts,trunkTopW,1.5,1);lavaFlow(branchA,2.2,.8,1);lavaFlow(branchB,2.2,.8,1);
  ctx.shadowBlur=0;ctx.fillStyle='#ffcf5c';
  lavaFlow(trunkPts,trunkTopW,1.5,.45);lavaFlow(branchA,2.2,.8,.45);lavaFlow(branchB,2.2,.8,.45);
  ctx.restore();
  // Lavafontener som spruter opp fra krateret og faller tilbake.
  for(let s=0;s<9;s++){const sparkPhase=seeded(i*13+s,salt+11),sparkDir=sparkPhase<.5?-1:1,sparkAge=((state.t*(.45+sparkPhase*.6)+sparkPhase*7+i)%1+1)%1,sparkUp=height*(.09+sparkPhase*.15),sparkOut=width*(.015+sparkPhase*.05),sparkX=peak.x+sparkDir*sparkOut*sparkAge+Math.sin(sparkAge*7+sparkPhase*9)*4*sparkAge,sparkY=platY-8-sparkUp*sparkAge+sparkUp*1.25*sparkAge*sparkAge;ctx.save();ctx.globalAlpha=1-sparkAge;ctx.shadowColor='#ffb347';ctx.shadowBlur=10;ctx.fillStyle=sparkAge<.3?'#fff6cf':sparkAge<.65?'#ffb347':'#ff6a2a';ctx.beginPath();ctx.arc(sparkX,sparkY,1.6+sparkPhase*3.2*(1-sparkAge*.5),0,7);ctx.fill();ctx.restore();}
  // Sorte røykskyer som velter opp fra krateret og driver avsted.
  for(let p=6;p>=0;p--){const puffPhase=seeded(i*7+p,salt+23),puffAge=((state.t*(.1+puffPhase*.09)+puffPhase+i*.37)%1+1)%1,puffX=peak.x+Math.sin(puffAge*5+puffPhase*9)*width*.03+puffAge*width*.075,puffY=platY-height*.05-puffAge*height*.55,puffR=9+puffAge*36+puffPhase*10;ctx.fillStyle=`rgba(30,24,28,${(1-puffAge)*.6})`;ctx.beginPath();ctx.arc(puffX,puffY,puffR,0,7);ctx.fill();ctx.fillStyle=`rgba(58,46,50,${(1-puffAge)*.35})`;ctx.beginPath();ctx.arc(puffX-puffR*.25,puffY-puffR*.2,puffR*.6,0,7);ctx.fill();}
  // Varm glød som farger den nederste røyken nedenfra.
  const glowRadius=craterW*.65,craterGlow=ctx.createRadialGradient(peak.x,platY-2,1,peak.x,platY-2,glowRadius);craterGlow.addColorStop(0,`rgba(255,122,42,${.2*eruptionPulse})`);craterGlow.addColorStop(.45,`rgba(255,122,42,${.08*eruptionPulse})`);craterGlow.addColorStop(1,'rgba(255,122,42,0)');ctx.fillStyle=craterGlow;ctx.fillRect(peak.x-glowRadius,platY-2-glowRadius,glowRadius*2,glowRadius*2);}}}
  function mountains(){mountainBand(.03,ground+5,'#5a3a3c','#2b1a1e',400,.28,.58,2,true);mountainBand(.065,ground+12,'#4a2b26','#1f1214',350,.18,.4,9,false);}
  function deciduousTree(x, base, s, alpha, shapeSeed=0) { const variation=salt=>{const value=Math.sin((shapeSeed*.073+s*1.91+salt*17.7)*91.73)*43758.5453;return value-Math.floor(value);};ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,base);ctx.strokeStyle='#2b1a14';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(2,s*.09);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo((variation(1)-.5)*s*.05,-s*.78);ctx.stroke();for(let branch=0;branch<7;branch++){const direction=branch%2===0?-1:1,startY=-s*(.24+branch*.075),length=s*(.18+variation(branch+2)*.16),rise=s*(.1+variation(branch+11)*.12);let px=(variation(branch+21)-.5)*s*.035,py=startY;ctx.lineWidth=Math.max(1.4,s*(.052-branch*.003));ctx.beginPath();ctx.moveTo(px,py);for(let segment=1;segment<=2;segment++){px+=direction*length*.5+(variation(branch*3+segment+31)-.5)*s*.08;py-=rise*.5+(variation(branch*5+segment+41)-.5)*s*.055;ctx.lineTo(px,py);}ctx.stroke();}ctx.restore(); }
  function pineTree(x, base, s, alpha) { ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,base);ctx.fillStyle='#2b1a14';ctx.fillRect(-s*.035,-s*.72,s*.07,s*.72);ctx.fillStyle='#183b2c';for(let i=0;i<4;i++){const y=-s*(.96-i*.19),half=s*(.19+i*.055);ctx.beginPath();ctx.moveTo(0,y-s*.25);ctx.lineTo(-half,y+s*.18);ctx.lineTo(half,y+s*.18);ctx.closePath();ctx.fill()}ctx.fillStyle='#315440';ctx.beginPath();ctx.moveTo(-s*.03,-s*1.18);ctx.lineTo(-s*.2,-s*.76);ctx.lineTo(0,-s*.83);ctx.closePath();ctx.fill();ctx.restore(); }
  function treeLayer(parallax, spacing, base, minSize, maxSize, alpha, salt) { const world=state.backgroundOffset*parallax, first=Math.floor(world/spacing)-2, count=Math.ceil(W/spacing)+5; for(let n=0;n<count;n++){const i=first+n,x=i*spacing-world+(seeded(i,salt)-.5)*spacing*.38,s=minSize+seeded(i,salt+1)*(maxSize-minSize); if(seeded(i,salt+2)>.46)pineTree(x,base,s,alpha);else deciduousTree(x,base,s,alpha,i+salt*1000);} }
  function drawGroundDetails(){const spacing=216,world=state.backgroundOffset,first=Math.floor(world/spacing)-2,count=Math.ceil(W/spacing)+5;for(let n=0;n<count;n++){const i=first+n,x=i*spacing-world+(seeded(i,22)-.5)*spacing*.5,y=ground+27+seeded(i,24)*Math.max(12,H-ground-52),depth=clamp((y-ground)/Math.max(1,H-ground),0,1),baseSize=7+seeded(i,23)*11,size=baseSize*(1+depth*2),blocked=state.objects.some(o=>o.type==='creek'&&x+size>o.x-6&&x-size<o.x+o.width+6);if(blocked)continue;const type=Math.floor(seeded(i,25)*3);ctx.save();ctx.translate(x,y);if(type===0){const blades=[[-.27,-.9,-.72],[-.18,-.68,-1.05],[-.08,-.3,-1.28],[.03,.08,-1.38],[.13,.43,-1.22],[.22,.74,-.98],[.28,.98,-.68]];ctx.fillStyle='#3a2420';for(const [baseX,tipX,tipY] of blades){const bx=baseX*size,tx=tipX*size,ty=tipY*size;ctx.beginPath();ctx.moveTo(bx-size*.095,0);ctx.quadraticCurveTo(tx-size*.1,ty*.42,tx,ty);ctx.quadraticCurveTo(tx+size*.11,ty*.46,bx+size*.1,0);ctx.closePath();ctx.fill();}ctx.strokeStyle='#c25a2a';ctx.lineWidth=Math.max(1,size*.035);ctx.lineCap='round';for(const [baseX,tipX,tipY] of blades.slice(1,6)){ctx.beginPath();ctx.moveTo(baseX*size,0);ctx.lineTo(tipX*size*.86,tipY*size*.82);ctx.stroke();}}else if(type===1){ctx.fillStyle='#4a2e26';ctx.beginPath();ctx.ellipse(-size*.35,0,size*.58,size*.42,-.25,0,7);ctx.ellipse(size*.3,-size*.15,size*.65,size*.5,.2,0,7);ctx.fill();ctx.fillStyle='#7a4a32';ctx.beginPath();ctx.ellipse(0,-size*.38,size*.38,size*.25,0,0,7);ctx.fill();}else{ctx.fillStyle='#745d43';ctx.beginPath();ctx.roundRect(-size*.4,-size*.7,size*.8,size*.85,Math.max(2,size*.08));ctx.fill();ctx.fillStyle='#a58a62';ctx.beginPath();ctx.ellipse(0,-size*.7,size*.4,size*.16,0,0,7);ctx.fill();ctx.strokeStyle='#6d583f';ctx.lineWidth=Math.max(1,size*.05);ctx.beginPath();ctx.arc(0,-size*.7,size*.2,0,7);ctx.stroke();}ctx.restore();}}
  function foregroundBush(o){ctx.save();ctx.translate(o.x,ground);ctx.fillStyle='#3a2220';ctx.beginPath();ctx.ellipse(o.width*.25,-o.height*.22,o.width*.31,o.height*.55,0,0,7);ctx.ellipse(o.width*.6,-o.height*.27,o.width*.37,o.height*.63,0,0,7);ctx.fill();ctx.fillStyle='#7a3a22';ctx.beginPath();ctx.ellipse(o.width*.38,-o.height*.52,o.width*.16,o.height*.25,0,0,7);ctx.fill();ctx.restore();}
  function restShopBounds(stop=state?.restStop){return stop?{x:stop.x+134,y:ground-76,width:84,height:76}:null;}
  function drawRestStop(){
    const stop=state?.restStop;if(!stop)return;const x=stop.x,y=ground,w=REST_STOP_WIDTH;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    ctx.fillStyle='rgba(36,65,54,.22)';ctx.beginPath();ctx.ellipse(x+w*.5,y+3,w*.58,8,0,0,Math.PI*2);ctx.fill();
    // Tømmervegger med synlige stokker.
    ctx.fillStyle='#81543a';ctx.beginPath();ctx.roundRect(x+13,y-70,112,67,5);ctx.fill();ctx.strokeStyle='#573827';ctx.lineWidth=2;
    for(let row=0;row<5;row++){const logY=y-62+row*12;ctx.beginPath();ctx.moveTo(x+15,logY);ctx.lineTo(x+123,logY);ctx.stroke();}
    ctx.fillStyle='#a56d45';ctx.beginPath();ctx.roundRect(x+18,y-66,102,9,3);ctx.fill();ctx.beginPath();ctx.roundRect(x+18,y-42,102,9,3);ctx.fill();
    // Tak, pipe og en rolig røykstripe.
    ctx.fillStyle='#4d3d38';ctx.fillRect(x+95,y-111,13,31);ctx.fillStyle='#69514a';ctx.fillRect(x+97,y-113,13,6);ctx.fillStyle='rgba(240,244,231,.42)';for(let i=0;i<3;i++){const smokeY=y-126-i*13+Math.sin(state.t*1.8+i)*3;ctx.beginPath();ctx.arc(x+104+Math.sin(state.t*1.5+i)*4,smokeY,7+i*2,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#493b37';ctx.beginPath();ctx.moveTo(x-1,y-70);ctx.lineTo(x+69,y-125);ctx.lineTo(x+139,y-70);ctx.closePath();ctx.fill();ctx.fillStyle='#6f5a50';ctx.beginPath();ctx.moveTo(x+8,y-70);ctx.lineTo(x+69,y-116);ctx.lineTo(x+130,y-70);ctx.closePath();ctx.fill();ctx.strokeStyle='#b79b7a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+4,y-69);ctx.lineTo(x+69,y-122);ctx.lineTo(x+135,y-69);ctx.stroke();
    ctx.fillStyle='#48362d';ctx.beginPath();ctx.roundRect(x+42,y-46,23,43,3);ctx.fill();ctx.fillStyle='#d4a85f';ctx.beginPath();ctx.arc(x+60,y-25,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f4d878';ctx.shadowColor='#ffdf7c';ctx.shadowBlur=12;ctx.fillRect(x+82,y-51,22,21);ctx.fillStyle='#81543a';ctx.fillRect(x+92,y-51,3,21);ctx.fillRect(x+82,y-41,22,3);ctx.shadowBlur=0;
    // En lav, klikkbar salgsbod står inntil høyre vegg.
    const boothX=x+137,boothY=y-58,boothW=78;ctx.fillStyle='#65412d';ctx.beginPath();ctx.roundRect(boothX,boothY,boothW,56,4);ctx.fill();ctx.strokeStyle='#4a3023';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#92603d';for(let row=0;row<4;row++)ctx.fillRect(boothX+4,boothY+7+row*11,boothW-8,5);
    ctx.fillStyle='#493128';ctx.fillRect(boothX+5,boothY-13,5,70);ctx.fillRect(boothX+boothW-10,boothY-13,5,70);ctx.fillStyle='#f1ddb4';ctx.strokeStyle='#59382a';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(boothX-10,boothY-17,boothW+20,20,5);ctx.fill();ctx.stroke();ctx.save();ctx.beginPath();ctx.roundRect(boothX-10,boothY-17,boothW+20,20,5);ctx.clip();for(let stripe=0;stripe<7;stripe++){ctx.fillStyle=stripe%2?'#b64f43':'#f1ddb4';ctx.fillRect(boothX-10+stripe*15,boothY-17,15,20);}ctx.restore();
    ctx.fillStyle='#5a3828';ctx.beginPath();ctx.roundRect(boothX-5,y-25,boothW+10,13,4);ctx.fill();ctx.fillStyle='#f6e1a7';ctx.beginPath();ctx.arc(boothX+17,y-32,5,0,7);ctx.fill();ctx.fillStyle='#d74d3d';ctx.fillRect(boothX+34,y-40,10,15);ctx.fillStyle='#e9d4a2';ctx.beginPath();ctx.roundRect(boothX+51,y-42,14,17,3);ctx.fill();
    ctx.fillStyle='#fff3d2';ctx.font="900 10px 'Nunito Sans', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BUTIKK',boothX+boothW/2,boothY+14);
    if(state.restTimer>0){ctx.fillStyle='#fff4c9';ctx.font="900 8px 'DM Mono', monospace";ctx.fillText('TRYKK',boothX+boothW/2,y-7);}
    // Navneskiltet står til venstre for Teodor og følger hytta inn og ut av bildet.
    const signX=x-116,labelSize=stop.name.length>18?8.5:stop.name.length>14?10:11.5;ctx.fillStyle='#6d482f';ctx.fillRect(signX-3,y-55,6,54);ctx.fillStyle='#ba7a43';ctx.strokeStyle='#66432d';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(signX-67,y-88,134,29,5);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0c8';ctx.font=`800 ${labelSize}px 'Nunito Sans', sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(stop.name,signX,y-73);ctx.restore();
  }
  function drawCreek(o){
    const waterWidth=o.width,channelWidth=o.channelWidth||o.baseWidth||waterWidth,centerTop=o.x+waterWidth*.5,seed=o.seed||0,steps=16,depth=Math.max(24,H-ground+12),bend=(seeded(Math.floor(seed*100),57)-.5)*20;
    const makeEdges=(width,edgeScale=1)=>{
      const left=[],right=[];
      for(let i=0;i<=steps;i++){
        const t=i/steps,y=ground-6+t*depth,perspective=1+t*.62,shape=1+Math.sin(seed*.41+t*8.2)*.065+Math.sin(seed*.77+t*15.7)*.03,half=width*.5*perspective*shape,center=centerTop+bend*t+Math.sin(seed*.19+t*3.5)*4*t,noise=(1.5+t*4.5)*edgeScale;
        left.push({x:center-half+Math.sin(seed*.83+t*10.4)*noise,y});
        right.push({x:center+half+Math.sin(seed*1.21+t*9.1+1.8)*noise,y});
      }
      return {left,right};
    };
    const bank=makeEdges(channelWidth+24,1.15),water=makeEdges(waterWidth,.72);
    const ribbonPath=edges=>{ctx.beginPath();ctx.moveTo(edges.left[0].x,edges.left[0].y);for(let i=1;i<edges.left.length;i++)ctx.lineTo(edges.left[i].x,edges.left[i].y);for(let i=edges.right.length-1;i>=0;i--)ctx.lineTo(edges.right[i].x,edges.right[i].y);ctx.closePath();};
    const edgePath=points=>{ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);};
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    // Lavabredden har fast bredde. Askeregn påvirker bare lavaflaten som tegnes oppå.
    ctx.fillStyle='#2e1c16';ctx.shadowColor='#ff5a1f88';ctx.shadowBlur=18;ribbonPath(bank);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#7a3a22';ctx.lineWidth=3;ctx.globalAlpha=.8;edgePath(bank.left);ctx.stroke();edgePath(bank.right);ctx.stroke();ctx.globalAlpha=1;
    const waterGradient=ctx.createLinearGradient(0,ground,0,H);waterGradient.addColorStop(0,'#ffe28a');waterGradient.addColorStop(.38,'#ff7a2a');waterGradient.addColorStop(1,'#8a1a08');ctx.fillStyle=waterGradient;ribbonPath(water);ctx.fill();
    ctx.save();ribbonPath(water);ctx.clip();
    // Uregelmessige glødfragmenter varierer både på tvers og langs lavaelven.
    const flowSpeed=48+state.speed*.055,fragmentCount=clamp(Math.round(waterWidth/9),12,30),seedIndex=Math.floor(seed*1000),sampleWater=t=>{const position=clamp(t,0,1)*steps,index=Math.min(steps-1,Math.floor(position)),mix=position-index,leftA=water.left[index],leftB=water.left[index+1],rightA=water.right[index],rightB=water.right[index+1];return {leftX:leftA.x+(leftB.x-leftA.x)*mix,rightX:rightA.x+(rightB.x-rightA.x)*mix,y:leftA.y+(leftB.y-leftA.y)*mix};};
    for(let fragment=0;fragment<fragmentCount;fragment++){
      const lanePos=.07+seeded(seedIndex+fragment*11,61)*.86,length=.05+seeded(seedIndex+fragment*13,62)*.14,speedScale=.68+seeded(seedIndex+fragment*17,63)*.72,cycle=depth*1.32,startT=((state.t*flowSpeed*speedScale+seeded(seedIndex+fragment*19,64)*cycle)%cycle)/depth-.18,endT=startT+length;
      if(endT<=0||startT>=1)continue;
      const visibleStart=Math.max(0,startT),visibleEnd=Math.min(1,endT),sideAmount=.012+seeded(seedIndex+fragment*23,65)*.045,sideFrequency=5+seeded(seedIndex+fragment*29,66)*9,sidePhase=seeded(seedIndex+fragment*31,67)*Math.PI*2,brightness=.3+seeded(seedIndex+fragment*37,68)*.38;
      ctx.strokeStyle=`rgba(255,240,180,${brightness})`;ctx.lineWidth=1+seeded(seedIndex+fragment*41,69)*1.7;ctx.beginPath();
      for(let point=0;point<=5;point++){const t=visibleStart+(visibleEnd-visibleStart)*(point/5),sample=sampleWater(t),lane=clamp(lanePos+Math.sin(t*sideFrequency+sidePhase)*sideAmount,.035,.965),x=sample.leftX+(sample.rightX-sample.leftX)*lane;(point?ctx.lineTo(x,sample.y):ctx.moveTo(x,sample.y));}
      ctx.stroke();
    }
    ctx.globalAlpha=.5;ctx.strokeStyle='#ffcf7a';ctx.lineWidth=1.5;edgePath(water.left);ctx.stroke();edgePath(water.right);ctx.stroke();ctx.restore();
    // Små lavasteiner markerer de faste breddene ved øvre kant.
    ctx.fillStyle='#1f130f';const bankLeft=bank.left[0].x,bankRight=bank.right[0].x;for(const [x,y,r] of [[bankLeft+3,ground-4,6],[bankLeft+14,ground-1,4],[bankRight-13,ground-2,4],[bankRight-2,ground-5,7]]){ctx.beginPath();ctx.ellipse(x,y,r,r*.55,0,0,7);ctx.fill();}
    ctx.restore();
  }
  function drawLavaBall(o){const cx=o.x+o.width*.5,cy=o.y+o.height*.5,r=o.width*.5,flick=Math.sin(state.t*15+(o.shapeSeed||0)*7)*.16;ctx.save();ctx.translate(cx,cy);ctx.shadowColor='#ff8b25';ctx.shadowBlur=o.rolling?10:18;
  // Ildhale som strekker seg bak kulens bevegelsesretning.
  ctx.fillStyle='#ef4a19';ctx.beginPath();
  if(o.rolling){ctx.moveTo(-r*.1,-r*.7);ctx.quadraticCurveTo(r*(1.8+flick),-r*.5,r*(2.1+flick),0);ctx.quadraticCurveTo(r*(1.8+flick),r*.55,-r*.1,r*.75);}
  else{ctx.moveTo(-r*.65,r*.55);ctx.quadraticCurveTo(-r*(.15+flick),-r*1.6,0,-r*(1.9+flick));ctx.quadraticCurveTo(r*(.55-flick),-r*1.4,r*.8,r*.35);}
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#ff7924';ctx.beginPath();ctx.arc(0,o.rolling?0:r*.12,r*.82,0,7);ctx.fill();
  ctx.fillStyle='#ffe388';ctx.beginPath();ctx.arc(-r*.16,o.rolling?0:r*.16,r*.48,0,7);ctx.fill();
  ctx.fillStyle='#fff6cf';ctx.beginPath();ctx.arc(-r*.32,o.rolling?0:r*.22,r*.2,0,7);ctx.fill();
  ctx.restore();}
  function drawHeart(o){const x=o.x+o.width/2,y=o.y+o.height/2+Math.sin(o.bob)*4,pop=o.collected?o.pop:0,scale=o.collected?1+Math.sin(Math.min(1,pop)*Math.PI)*1.8:1;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=o.collected?clamp(1-(pop-.55)*2.2,0,1):1;ctx.fillStyle='#ff8e7c';ctx.shadowColor='#ffe9a3';ctx.shadowBlur=13;ctx.beginPath();ctx.moveTo(0,9);ctx.bezierCurveTo(-22,-5,-10,-16,0,-7);ctx.bezierCurveTo(10,-16,22,-5,0,9);ctx.fill();ctx.restore();if(o.collected){ctx.save();ctx.translate(x,y);ctx.strokeStyle=`rgba(255,241,181,${1-pop})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,12+pop*42,0,7);ctx.stroke();ctx.fillStyle=`rgba(255,211,157,${1-pop})`;for(let i=0;i<8;i++){const a=i*Math.PI/4,r=15+pop*38;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,3*(1-pop),0,7);ctx.fill()}ctx.restore();}}
  function drawFish(o){if(o.leap<=.02)return;const x=o.x+o.width*.5,y=o.currentY,progress=clamp(o.leapTime/1.35,0,1),turn=-.72+progress*1.44;ctx.save();ctx.translate(x,y);ctx.rotate(turn);ctx.strokeStyle='#fffaf0';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#d6f5ee';ctx.shadowBlur=8;
    // Halebein og ryggsøyle beholder samme lengde som den gamle fiskesilhuetten.
    ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(-20,-8);ctx.lineTo(-19,0);ctx.lineTo(-20,8);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(7,0);ctx.stroke();
    // Fem buede ribbein gir fisken en lettlest skjelettform også når den roterer i hoppet.
    const ribs=[[-10,6],[-7,8],[-4,10],[-1,11],[2,9]];for(const [ribX,height] of ribs){ctx.beginPath();ctx.moveTo(ribX,-height*.72);ctx.quadraticCurveTo(ribX-2,0,ribX+1,height);ctx.stroke();}
    // Et åpent skallehode, inspirert av referansefisken, avslutter ryggraden.
    ctx.beginPath();ctx.moveTo(6,0);ctx.bezierCurveTo(6,-6,9,-8,13,-4);ctx.lineTo(10,0);ctx.lineTo(13,4);ctx.bezierCurveTo(9,8,6,6,6,0);ctx.stroke();ctx.beginPath();ctx.moveTo(8,-3);ctx.lineTo(11,0);ctx.moveTo(11,-3);ctx.lineTo(8,0);ctx.stroke();ctx.restore();}
  function drawBoulder(o){const w=o.width,h=o.height,r=Math.min(w,h)*.5,cx=o.x+w*.5,rotation=o.rotation||0,points=[];let maxY=-Infinity;for(let i=0;i<9;i++){const angle=i/9*Math.PI*2-.3,rad=r*(.87+seeded(o.shapeSeed+i,41)*.11),x=Math.cos(angle+rotation)*rad,y=Math.sin(angle+rotation)*rad;points.push({x,y});maxY=Math.max(maxY,y);}ctx.save();ctx.fillStyle='#28444355';ctx.beginPath();ctx.ellipse(cx,ground+1,w*.39,4,0,0,7);ctx.fill();ctx.translate(cx,ground-maxY);ctx.shadowColor='#ff5a1f';ctx.shadowBlur=22;ctx.fillStyle='#2b1a16';ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.rotate(rotation);ctx.fillStyle='#4a2620';ctx.beginPath();ctx.moveTo(-r*.42,-r*.5);ctx.lineTo(r*.18,-r*.68);ctx.lineTo(r*.3,-r*.28);ctx.lineTo(-r*.2,-r*.12);ctx.closePath();ctx.fill();ctx.strokeStyle='#ff8a2a';ctx.lineWidth=2.5;ctx.shadowColor='#ffb347';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,r*.34,-.4,1.5);ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.5,r*.1);ctx.lineTo(-r*.05,-r*.1);ctx.lineTo(r*.45,r*.3);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#ffd75c';ctx.beginPath();ctx.arc(r*.12,-r*.18,r*.09,0,7);ctx.fill();ctx.beginPath();ctx.arc(-r*.22,r*.22,r*.07,0,7);ctx.fill();ctx.restore();}
  function drawMarit(){const p=state.player,x=p.x,y=p.y,walking=p.onGround&&state.fireGlow<=0,phase=walking?Math.sin(state.t*12):0,bob=walking?Math.abs(Math.sin(state.t*12))*.9:0,invPulse=p.inv>0?.5+.5*Math.sin(state.t*18):0;ctx.save();ctx.globalAlpha=p.inv>0?.38+invPulse*.62:1;ctx.translate(x,y+bob);if(p.inv>0){ctx.translate(18,30);ctx.scale(1+invPulse*.055,1+invPulse*.055);ctx.translate(-18,-30);}ctx.lineCap='round'; // Ryggsekken ligger bak kroppen i profil.
    ctx.fillStyle='#89553f';ctx.beginPath();ctx.roundRect(1,22,16,27,6);ctx.fill();ctx.fillStyle='#d99558';ctx.fillRect(3,30,12,4);ctx.strokeStyle='#5b3d34';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(13,22);ctx.lineTo(20,43);ctx.stroke(); // Gange: motsatt arm og bein.
    ctx.strokeStyle='#344b4e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(19,43);ctx.lineTo(17-phase*5,52);ctx.lineTo(13-phase*8,59);ctx.moveTo(25,43);ctx.lineTo(26+phase*5,52);ctx.lineTo(31+phase*8,58);ctx.stroke();ctx.strokeStyle='#282f32';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(9-phase*8,59);ctx.lineTo(15-phase*8,59);ctx.moveTo(28+phase*8,59);ctx.lineTo(35+phase*8,59);ctx.stroke();
    ctx.fillStyle='#e97861';ctx.beginPath();ctx.roundRect(13,20,18,28,7);ctx.fill();ctx.fillStyle='#f5d1a4';ctx.beginPath();ctx.arc(25,12,9,0,7);ctx.fill(); // Blondt hår, hestehale og ansikt mot høyre.
    ctx.fillStyle='#b07a34';ctx.beginPath();ctx.arc(22,10,9,Math.PI*.55,Math.PI*1.75);ctx.lineTo(17,21);ctx.quadraticCurveTo(11,16,15,9);ctx.fill();ctx.beginPath();ctx.moveTo(30,6);ctx.lineTo(28,1);ctx.lineTo(25,4);ctx.lineTo(22,0);ctx.lineTo(19,3);ctx.lineTo(15,1);ctx.lineTo(13,5);ctx.lineTo(17,6);ctx.closePath();ctx.fill();ctx.fillStyle='#f5d1a4';ctx.beginPath();ctx.moveTo(31,10);ctx.lineTo(36,13);ctx.lineTo(31,15);ctx.closePath();ctx.fill();ctx.fillStyle='#4e4037';ctx.beginPath();ctx.arc(28,10,1.2,0,7);ctx.fill();
    ctx.strokeStyle='#f5d1a4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(27,26);ctx.lineTo(31-phase*6,36);ctx.lineTo(35-phase*5,41);ctx.moveTo(17,26);ctx.lineTo(13+phase*5,36);ctx.stroke();ctx.strokeStyle='#a85a4e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(27.5,15.5);ctx.quadraticCurveTo(30,18.2,32.5,15.7);ctx.stroke();ctx.restore();}
  function drawBonfire(){if(state.fireGlow<=0)return;const x=state.player.x+62,y=ground-2,pulse=.5+.5*Math.sin(state.t*15);ctx.save();const glow=ctx.createRadialGradient(x,y-20,2,x,y-18,56);glow.addColorStop(0,`rgba(255,231,132,${.48+pulse*.2})`);glow.addColorStop(1,'rgba(255,134,61,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y-18,56,0,7);ctx.fill();ctx.strokeStyle='#563a30';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-17,y);ctx.lineTo(x+17,y-7);ctx.moveTo(x-15,y-8);ctx.lineTo(x+16,y+1);ctx.stroke();ctx.fillStyle='#ef552f';ctx.beginPath();ctx.moveTo(x,y-5);ctx.bezierCurveTo(x-20,y-18,x-7,y-42,x-2,y-51);ctx.bezierCurveTo(x+4,y-35,x+22,y-26,x+11,y-7);ctx.closePath();ctx.fill();ctx.fillStyle='#ffd75c';ctx.beginPath();ctx.moveTo(x,y-7);ctx.bezierCurveTo(x-10,y-19,x-2,y-31,x+2,y-37);ctx.bezierCurveTo(x+4,y-25,x+13,y-18,x+7,y-7);ctx.closePath();ctx.fill();ctx.fillStyle='#fff2ae';ctx.beginPath();ctx.ellipse(x+1,y-13,4,9,-.2,0,7);ctx.fill();ctx.restore();}
  function drawSplashes(){for(const splash of state.splashes){ctx.save();ctx.translate(splash.x,splash.y);ctx.fillStyle=`rgba(255,140,40,${clamp(1-splash.age/.8,0,1)})`;ctx.strokeStyle='#ffcf7a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,2,12+splash.age*35,Math.PI*1.05,Math.PI*1.95);ctx.stroke();for(const d of splash.drops){ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*1.7,-.25,0,7);ctx.fill()}ctx.restore();}}
  function drawRockImpacts(){for(const impact of state.rockImpacts){const progress=clamp(impact.age/.62,0,1),alpha=1-progress;ctx.save();ctx.translate(impact.x,impact.y);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,232,157,${alpha})`;ctx.lineWidth=4*(1-progress)+1;ctx.beginPath();ctx.arc(0,0,8+progress*48,0,Math.PI*2);ctx.stroke();if(progress<.42){ctx.strokeStyle=`rgba(255,248,218,${1-progress/.42})`;ctx.lineWidth=3;for(let i=0;i<10;i++){const angle=i/10*Math.PI*2+.15,length=17+progress*45;ctx.beginPath();ctx.moveTo(Math.cos(angle)*6,Math.sin(angle)*6);ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length);ctx.stroke();}}ctx.globalCompositeOperation='source-over';for(const particle of impact.particles){ctx.fillStyle=particle.warm?`rgba(255,205,105,${alpha})`:`rgba(91,99,94,${alpha*.9})`;ctx.beginPath();ctx.arc(particle.x,particle.y,particle.size*(.55+alpha*.45),0,Math.PI*2);ctx.fill();}ctx.restore();}}
  function drawSun(){const x=W*.78,y=H*.16,shine=state.sunGlow>0?.35+.2*Math.sin(state.t*7):.18;ctx.save();ctx.globalAlpha=clamp(1-state.skyDarkness,0,1);ctx.translate(x,y);ctx.strokeStyle=`rgba(255,150,80,${shine})`;ctx.lineWidth=3;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*31,Math.sin(a)*31);ctx.lineTo(Math.cos(a)*(43+shine*20),Math.sin(a)*(43+shine*20));ctx.stroke()}ctx.fillStyle='#ff7a2a';ctx.shadowColor='#ff4a12';ctx.shadowBlur=30;ctx.beginPath();ctx.arc(0,0,23,0,7);ctx.fill();ctx.restore();}
  function stormClouds(){const cover=state.stormCloudCover;if(cover<=0)return;const eased=cover*cover*(3-2*cover);ctx.save();ctx.globalAlpha=.72+.22*cover;for(let i=0;i<9;i++){const s=82+seeded(i,31)*78,targetX=W*(.04+i/8*.9),fromLeft=i%2===0,startX=fromLeft?-s*1.5:W+s*1.5,x=startX+(targetX-startX)*eased+Math.sin(state.t*.35+i)*5,y=H*(.055+seeded(i,32)*.13);ctx.fillStyle=i%3===0?'#2d414a':'#394f57';ctx.beginPath();ctx.ellipse(x-s*.28,y+s*.04,s*.38,s*.2,0,0,7);ctx.ellipse(x,y-s*.09,s*.37,s*.29,0,0,7);ctx.ellipse(x+s*.33,y,s*.4,s*.22,0,0,7);ctx.fill();ctx.fillStyle='#243840';ctx.beginPath();ctx.ellipse(x,y+s*.11,s*.62,s*.18,0,0,7);ctx.fill()}ctx.restore();}
  function rainLayer(count,speed,length,lineWidth,alpha,salt){const spanY=H+length*3,spanX=W+180,gust=.14+Math.sin(state.t*.42)*.025;ctx.lineWidth=lineWidth;ctx.strokeStyle=`rgba(218,245,246,${alpha*state.rain})`;for(let i=0;i<count;i++){const travel=(state.t*speed+seeded(i,salt)*spanY)%spanY,y=travel-length*1.5,baseX=seeded(i,salt+1)*spanX-90,x=(baseX+travel*gust+state.t*(10+seeded(i,salt+2)*8))%spanX-45,slant=length*(.38+Math.sin(state.t*.35+i)*.04);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+slant,y+length);ctx.stroke();}}
  function updateLightning(dt){state.flash=Math.max(0,state.flash-dt*2.2);if(state.bolt){state.bolt.age+=dt;if(state.bolt.age>.45)state.bolt=null;}if(state.thunderClock>0){state.thunderClock-=dt;if(state.thunderClock<=0){state.thunderClock=0;sounds.thunder();}}if(state.weatherPhase==='raining'){state.lightningClock-=dt;if(state.lightningClock<=0){strikeLightning();state.lightningClock=rand(2.5,7);}}}
  function strikeLightning(){sounds.lightning();const x0=W*(.08+Math.random()*.84),pts=[[x0,-12]];let bx=x0;const segs=9;for(let g=1;g<=segs;g++){bx+=(Math.random()-.5)*56;pts.push([bx,-12+(ground+24)*g/segs]);}const branches=[],nBr=2+Math.floor(Math.random()*3);for(let b=0;b<nBr;b++){const si=2+Math.floor(Math.random()*(segs-3)),st=pts[si],dir=Math.random()<.5?-1:1,bpts=[[st[0],st[1]]];let px=st[0],py=st[1];const bl=3+Math.floor(Math.random()*3);for(let g=1;g<=bl;g++){px+=dir*(10+Math.random()*22);py+=26+Math.random()*30;bpts.push([px,py]);}branches.push(bpts);}state.bolt={pts,branches,age:0};state.flash=1;state.thunderClock=rand(.4,1.4);}
  function drawLightning(){const bolt=state.bolt;if(!bolt)return;const alpha=clamp(1-bolt.age/.45,0,1);if(alpha<=0)return;ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor='#bfe0ff';ctx.shadowBlur=18;const stroke=(pts,w)=>{ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.stroke();};ctx.strokeStyle=`rgba(159,208,255,${alpha})`;stroke(bolt.pts,3.5);for(const b of bolt.branches)stroke(b,1.6);ctx.shadowBlur=0;ctx.strokeStyle=`rgba(255,255,255,${alpha})`;stroke(bolt.pts,1.4);for(const b of bolt.branches)stroke(b,.8);ctx.restore();}
  function rain(){const intensity=state.rain;if(intensity<=0)return;ctx.save();ctx.lineCap='round';rainLayer(Math.floor(48*intensity),330,11,1,.34,51);rainLayer(Math.floor(72*intensity),510,19,1.35,.5,61);rainLayer(Math.floor(48*intensity),760,29,2,.72,71);const mist=ctx.createLinearGradient(0,ground-55,0,ground+65);mist.addColorStop(0,'rgba(205,235,232,0)');mist.addColorStop(1,`rgba(190,224,220,${.16*intensity})`);ctx.fillStyle=mist;ctx.fillRect(0,ground-55,W,120);ctx.strokeStyle=`rgba(223,249,244,${.42*intensity})`;ctx.fillStyle=`rgba(255,214,120,${.48*intensity})`;ctx.lineWidth=1.2;const impacts=Math.floor(25*intensity);for(let i=0;i<impacts;i++){const cycle=(state.t*(1.5+seeded(i,82)*1.8)+seeded(i,83))%1;if(cycle<.72)continue;const x=(seeded(i,84)*W+state.t*(34+seeded(i,85)*20))%W,y=ground+2,r=(cycle-.72)/.28*(5+seeded(i,86)*6);ctx.beginPath();ctx.arc(x,y,r,Math.PI*1.08,Math.PI*1.92);ctx.stroke();ctx.beginPath();ctx.arc(x-r*.25,y-r*.5,1.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(x+r*.3,y-r*.72,1,0,7);ctx.fill();}ctx.restore();}
  function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#402732';ctx.fillRect(0,0,W,H);const avalancheShake=state.avalancheLeadIn>0?Math.min(7,3.2+state.avalancheLevel*.4+distanceDifficulty()*.2):0,hitForce=clamp(state.hitShake/.24,0,1),shake=avalancheShake+hitForce*9;ctx.save();if(shake>0)ctx.translate(Math.sin(state.t*51)*shake,Math.sin(state.t*37+1.4)*shake*.55);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#2e1a26');sky.addColorStop(.55,'#7a3a2e');sky.addColorStop(1,'#e08a5a');ctx.fillStyle=sky;ctx.fillRect(-10,-10,W+20,H+20);
    // Godværshimmelen tones bort når uværet kommer, og frem igjen når det klarner.
    if(state.skyDarkness<1){const clearSky=ctx.createLinearGradient(0,0,0,H);clearSky.addColorStop(0,'#397eae');clearSky.addColorStop(.55,'#a67b70');clearSky.addColorStop(1,'#e08a5a');ctx.save();ctx.globalAlpha=1-state.skyDarkness;ctx.fillStyle=clearSky;ctx.fillRect(-10,-10,W+20,H+20);ctx.restore();}
    if(state.skyDarkness>0){ctx.fillStyle=`rgba(30,50,60,${state.skyDarkness*.5})`;ctx.fillRect(-10,-10,W+20,H+20)}if(state.flash>0){ctx.fillStyle=`rgba(255,246,214,${state.flash*.5})`;ctx.fillRect(-10,-10,W+20,H+20)}drawSun();ctx.save();ctx.globalAlpha=1-state.skyDarkness*.72;ctx.fillStyle='#5a3a3599';cloud(W*.2-state.backgroundOffset*.025,H*.13,95);cloud(W*.7-state.backgroundOffset*.018,H*.2,125);ctx.restore();mountains();
    treeLayer(.12,118,ground+8,80,115,.58,4);treeLayer(.23,155,ground+10,108,158,.95,11);ctx.fillStyle='#194027';ctx.fillRect(0,ground,W,H-ground);drawGroundDetails(); // Detaljer under stien hoppes over der lavaelvene ligger.
    for(const o of state.objects)if(o.type==='bush')foregroundBush(o);for(const o of state.objects)if(o.type==='creek')drawCreek(o);for(const o of state.objects){if(o.type==='heart')drawHeart(o);else if(o.type==='boulder')drawBoulder(o);else if(o.type==='fish')drawFish(o);else if(o.type==='lavaball')drawLavaBall(o)}
    drawRondaneSign();drawRestStop();drawMarit();drawRockImpacts();drawBonfire();drawSplashes();stormClouds();drawDragon();rain();drawLightning();ctx.restore();
  }
  function loop(now){if(!state?.running)return;const dt=Math.min(.033,(now-last)/1000);last=now;const heartAnimationChanged=updateHeartLossAnimation(dt),gameplayActive=!state.paused&&!state.tutorialPaused&&!state.shopOpen&&!state.quitConfirmOpen&&!orientationBlocked;if(gameplayActive)update(dt);else if(heartAnimationChanged)updateUI();draw();if(state.running)raf=requestAnimationFrame(loop);}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height,bounds=state?.restTimer>0?restShopBounds():null;if(bounds&&x>=bounds.x&&x<=bounds.x+bounds.width&&y>=bounds.y&&y<=bounds.y+bounds.height){openShop();return;}canvas.setPointerCapture?.(e.pointerId);startJump();});canvas.addEventListener('pointerup',e=>{e.preventDefault();endJump();});canvas.addEventListener('pointercancel',endJump);
  ui.frame.addEventListener('selectstart',e=>{if(state?.running)e.preventDefault();});ui.frame.addEventListener('contextmenu',e=>{if(state?.running)e.preventDefault();});ui.frame.addEventListener('dragstart',e=>{if(state?.running)e.preventDefault();});
  document.addEventListener('pointerdown',recoverAudioFromGesture,{capture:true,passive:true});document.addEventListener('keydown',recoverAudioFromGesture,{capture:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)audioRecoveryNeeded=Boolean(audio);else if(audio)initAudio();});window.addEventListener('pagehide',()=>{audioRecoveryNeeded=Boolean(audio);});window.addEventListener('pageshow',()=>{if(audio)initAudio();});
  for(const button of [ui.bonfire,ui.pause,ui.quit,ui.sound,ui.fullscreen,ui.tutorialContinue,ui.fullscreenHelpClose,ui.restContinue,ui.shopClose,ui.shopUndo,ui.snackButton,ui.quitConfirm,ui.quitCancel,ui.howToPlayOpen,ui.howToPlayBack,ui.priceEditorSave,ui.priceEditorDefaults,ui.priceEditorCancel,ui.leaderboardRefresh,...ui.shopItems])button.addEventListener('pointerdown',e=>e.stopPropagation());ui.bonfire.addEventListener('click',bonfire);ui.pause.addEventListener('click',togglePause);ui.quit.addEventListener('click',requestQuitGame);ui.quitConfirm.addEventListener('click',confirmQuitGame);ui.quitCancel.addEventListener('click',cancelQuitGame);ui.fullscreen.addEventListener('click',toggleFullscreen);ui.fullscreenHelpClose.addEventListener('click',closeFullscreenHelp);ui.tutorialContinue.addEventListener('click',continueTutorial);ui.restContinue.addEventListener('click',continueRestStop);ui.shopClose.addEventListener('click',closeShop);ui.shopUndo.addEventListener('click',undoShopPurchases);ui.snackButton.addEventListener('click',useKvikklunsj);ui.howToPlayOpen.addEventListener('click',openHowToPlay);ui.howToPlayBack.addEventListener('click',closeHowToPlay);ui.priceEditorForm.addEventListener('submit',savePriceEditor);ui.priceEditorDefaults.addEventListener('click',useDefaultShopPrices);ui.priceEditorCancel.addEventListener('click',closePriceEditor);ui.leaderboardRefresh.addEventListener('click',loadLeaderboard);ui.shopItems.forEach(button=>button.addEventListener('click',()=>buyShopItem(button.dataset.shopItem)));ui.sound.addEventListener('click',()=>{muted=!muted;ui.sound.textContent=muted?'×':'♫';ui.sound.setAttribute('aria-label',muted?'Skru på lyd':'Skru av lyd');if(muted)SfxStore.stopAllLoops();else{initAudio(audioRecoveryNeeded);if(state?.weatherPhase==='raining')SfxStore.startLoop('rain',.42);}});
  ui.debugRotation.addEventListener('input',()=>{const value=Number(ui.debugRotation.value);if(Number.isFinite(value))debugSettings.rotationSpeed=clamp(value,0,2);});ui.debugRollSpeed.addEventListener('input',()=>{const value=Number(ui.debugRollSpeed.value);if(Number.isFinite(value))debugSettings.relativeRollSpeed=clamp(value,1,100)/100;});ui.debugRollingShare.addEventListener('input',()=>{const value=Number(ui.debugRollingShare.value);if(Number.isFinite(value))debugSettings.rollingShare=clamp(value,0,100);});ui.helpToggles.forEach(toggle=>toggle.addEventListener('change',event=>setHelpVisibility(event.target.checked)));
  window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(state?.tutorialPaused)continueTutorial();else if(state?.restTimer>0&&!state.shopOpen)continueRestStop();else startJump();}}if(e.code==='Escape'&&!e.repeat){if(!ui.priceEditorOverlay.classList.contains('hidden'))closePriceEditor();else if(state?.quitConfirmOpen)cancelQuitGame();else if(state?.shopOpen)closeShop();else if(!ui.howToPlay.classList.contains('hidden'))closeHowToPlay();}if(e.code==='KeyB'&&!e.repeat)bonfire();if(e.code==='KeyK'&&!e.repeat)useKvikklunsj();if(e.code==='KeyP'&&!e.repeat)togglePause();if(e.code==='KeyQ'&&!e.repeat)requestQuitGame();});window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();endJump();}});ui.difficultyButtons.forEach(button=>button.addEventListener('click',()=>startGame(button.dataset.difficulty)));document.querySelector('#restartButton').addEventListener('click',()=>startGame());document.querySelector('#stoneDebugButton').addEventListener('click',requestDebugRockfall);ui.scoreForm.addEventListener('submit',submitScore);
  document.querySelector('#priceEditorButton').addEventListener('click',requestPriceEditor);
  document.addEventListener('fullscreenchange',syncFullscreenButton);document.addEventListener('webkitfullscreenchange',syncFullscreenButton);syncFullscreenButton();syncHelpVisibility();ui.high.textContent=ScoreStore.get()?`Din beste tur: ${formatDistance(ScoreStore.get())}`:'Din første vulkantur venter.';state=freshState();syncOrientation();draw();loadLeaderboard();ShopPriceStore.load(DEFAULT_SHOP_PRICES).then(()=>{if(state)updateUI();});
  // Tydelig gangsyklus: ben og armer på samme side går i motsatt retning.
  function drawMarit(){
    const p=state.player,x=p.x,y=p.y,rolling=state.rockHitTimer>0,hitProgress=rolling?clamp(1-state.rockHitTimer/ROCK_HIT_DURATION,0,1):0,rollAngle=hitProgress*Math.PI*2+Math.sin(hitProgress*Math.PI)*.32,hitLift=Math.sin(hitProgress*Math.PI)*7,walking=p.onGround&&state.fireGlow<=0&&!rolling,step=walking?Math.sin(state.t*11):0,bob=walking?Math.abs(step)*.8:0,frontLift=Math.max(0,-step)*4,backLift=Math.max(0,step)*4,invPulse=p.inv>0?.5+.5*Math.sin(state.t*18):0;
    ctx.save();ctx.globalAlpha=p.inv>0?.38+invPulse*.62:1;ctx.translate(x,y+bob);if(rolling){ctx.translate(18,31-hitLift);ctx.rotate(rollAngle);ctx.translate(-18,-31);}if(p.inv>0){ctx.translate(18,30);ctx.scale(1+invPulse*.055,1+invPulse*.055);ctx.translate(-18,-30);}ctx.lineCap='round';ctx.lineJoin='round';
    // Ryggsekken dekker den bakre armen i profil.
    ctx.fillStyle='#89553f';ctx.beginPath();ctx.roundRect(1,22,16,27,6);ctx.fill();ctx.fillStyle='#d99558';ctx.fillRect(3,30,12,4);ctx.strokeStyle='#5b3d34';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(13,22);ctx.lineTo(20,43);ctx.stroke();
    // Ett ben strekker seg frem mens det andre løftes og føres bakover.
    ctx.strokeStyle='#344b4e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(19,43);ctx.lineTo(16-step*5,52-backLift);ctx.lineTo(13-step*10,59-backLift);ctx.moveTo(25,43);ctx.lineTo(29+step*5,52-frontLift);ctx.lineTo(33+step*10,59-frontLift);ctx.stroke();
    ctx.strokeStyle=state.boots?'#9d6435':'#282f32';ctx.lineWidth=state.boots?7:5;ctx.beginPath();ctx.moveTo(9-step*10,59-backLift);ctx.lineTo(16-step*10,59-backLift);ctx.moveTo(30+step*10,59-frontLift);ctx.lineTo(37+step*10,59-frontLift);ctx.stroke();if(state.boots){ctx.strokeStyle='#d7a34f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(11-step*10,55-backLift);ctx.lineTo(16-step*10,55-backLift);ctx.moveTo(31+step*10,55-frontLift);ctx.lineTo(36+step*10,55-frontLift);ctx.stroke();}
    // Jakke, hode og hår i profil.
    ctx.fillStyle='#e97861';ctx.beginPath();ctx.roundRect(13,20,18,28,7);ctx.fill();ctx.fillStyle='#f5d1a4';ctx.beginPath();ctx.arc(25,12,9,0,7);ctx.fill();
    if(!state.rainHat){ctx.fillStyle='#b07a34';ctx.beginPath();ctx.arc(22,10,9,Math.PI*.55,Math.PI*1.75);ctx.lineTo(17,21);ctx.quadraticCurveTo(11,16,15,9);ctx.fill();ctx.beginPath();ctx.moveTo(31,7);ctx.lineTo(30,1);ctx.lineTo(27,4);ctx.lineTo(25,-3);ctx.lineTo(22,2);ctx.lineTo(19,-5);ctx.lineTo(17,2);ctx.lineTo(13,-2);ctx.lineTo(14,5);ctx.lineTo(17,7);ctx.closePath();ctx.fill();}
    if(state.rainHat){ctx.fillStyle='#78909d';ctx.strokeStyle='#eff9f5';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(14,12);ctx.bezierCurveTo(14,2,20,-3,26,0);ctx.bezierCurveTo(33,0,38,7,36,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#536a76';ctx.beginPath();ctx.moveTo(13,12);ctx.lineTo(38,12);ctx.lineTo(34,16);ctx.lineTo(16,16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#263e49';ctx.strokeStyle='#bde2dc';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(24,7);ctx.lineTo(37,8);ctx.lineTo(34,12);ctx.lineTo(24,11);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#f0a657';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(24,1);ctx.quadraticCurveTo(20,-4,22,-7);ctx.stroke();}
    ctx.fillStyle='#f5d1a4';ctx.beginPath();ctx.moveTo(31,10);ctx.lineTo(36,13);ctx.lineTo(31,15);ctx.closePath();ctx.fill();ctx.fillStyle='#4e4037';ctx.beginPath();ctx.arc(28,10,1.2,0,7);ctx.fill();
    // Fremre arm svinger motsatt fremre ben for en naturlig gåstil.
    ctx.strokeStyle='#f5d1a4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(27,26);ctx.lineTo(28-step*7,35);ctx.lineTo(31-step*10,41);ctx.stroke();
    ctx.strokeStyle='#a85a4e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(27.5,15.5);ctx.quadraticCurveTo(30,18.2,32.5,15.7);ctx.stroke();ctx.restore();
  }
  function drawIntroMarit(){
    const p=state.player,x=p.x+18,y=p.y;
    ctx.save();ctx.translate(x,y);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.fillStyle='#89553f';ctx.beginPath();ctx.roundRect(-15,23,30,25,7);ctx.fill();
    ctx.strokeStyle='#344b4e';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-5,43);ctx.lineTo(-5,58);ctx.moveTo(5,43);ctx.lineTo(5,58);ctx.stroke();
    ctx.strokeStyle='#282f32';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-9,59);ctx.lineTo(-2,59);ctx.moveTo(1,59);ctx.lineTo(8,59);ctx.stroke();
    ctx.fillStyle='#e97861';ctx.beginPath();ctx.roundRect(-11,20,22,28,7);ctx.fill();
    ctx.strokeStyle='#f5d1a4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-10,28);ctx.lineTo(-16,39);ctx.moveTo(10,28);ctx.lineTo(16,39);ctx.stroke();
    ctx.fillStyle='#f5d1a4';ctx.beginPath();ctx.arc(0,12,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#b07a34';ctx.beginPath();ctx.arc(0,10,10,Math.PI,Math.PI*2);ctx.lineTo(10,9);ctx.lineTo(-10,9);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-10,5);ctx.lineTo(-13,0);ctx.lineTo(-8,1);ctx.lineTo(-10,-4);ctx.lineTo(-4,-1);ctx.lineTo(-3,-7);ctx.lineTo(0,-2);ctx.lineTo(2,-7);ctx.lineTo(4,0);ctx.lineTo(9,-4);ctx.lineTo(8,2);ctx.lineTo(13,0);ctx.lineTo(10,5);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4e4037';ctx.beginPath();ctx.arc(-3.2,11,1.15,0,Math.PI*2);ctx.arc(3.2,11,1.15,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#a85a4e';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,15,3.2,0,Math.PI);ctx.stroke();ctx.restore();
  }
  function drawRondaneSign(){
    if(!state?.running)return;
    const p=state.player,x=(state.introSignWorldX??Math.min(W-72,p.x+98))-state.backgroundOffset,y=ground;
    ctx.save();ctx.lineJoin='round';ctx.fillStyle='#71472e';ctx.fillRect(x-3,y-58,6,64);ctx.fillStyle='#a36c3f';ctx.fillRect(x-1,y-57,2,62);
    ctx.fillStyle='#b77b45';ctx.strokeStyle='#68442f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-57,y-87);ctx.lineTo(x+34,y-87);ctx.lineTo(x+57,y-72);ctx.lineTo(x+34,y-57);ctx.lineTo(x-57,y-57);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#f8e8bf';ctx.font="800 13px 'Nunito Sans', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VULKANØYA',x-5,y-72);ctx.restore();
  }
  function drawGreetingBubble(){
    const p=state.player,alpha=1,w=clamp(W*.3,172,230),h=47,x=clamp(p.x-26,14,W-w-14),y=Math.max(18,p.y-78);
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff8e8';ctx.shadowColor='rgba(28,52,55,.28)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.beginPath();ctx.moveTo(x+43,y+h-2);ctx.lineTo(x+56,y+h-2);ctx.lineTo(p.x+18,p.y-6);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#23474a';ctx.font="800 14px 'Nunito Sans', sans-serif";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Endelig vulkantur igjen',x+w/2,y+h/2);ctx.restore();
  }
  function drawRestBubble(){
    const stop=state.restStop,p=state.player,w=clamp(W*.37,210,292),font="800 13px 'Nunito Sans', sans-serif",words=stop.quote.split(' '),lines=[],line=[];
    ctx.save();ctx.font=font;for(const word of words){const candidate=[...line,word].join(' ');if(line.length&&ctx.measureText(candidate).width>w-26){lines.push(line.join(' '));line.length=0;}line.push(word);}if(line.length)lines.push(line.join(' '));
    const h=lines.length>1?74:62,x=clamp(p.x-62,14,W-w-14),y=Math.max(14,p.y-h-36),tailX=clamp(p.x+18,x+32,x+w-32);
    ctx.fillStyle='#fff8e8';ctx.shadowColor='rgba(28,52,55,.28)';ctx.shadowBlur=9;ctx.shadowOffsetY=3;ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fill();ctx.beginPath();ctx.moveTo(tailX-8,y+h-2);ctx.lineTo(tailX+7,y+h-2);ctx.lineTo(p.x+18,p.y-5);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';
    ctx.fillStyle='#23474a';ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';const firstY=y+h/2-(lines.length-1)*8;lines.forEach((line,index)=>ctx.fillText(line,x+w/2,firstY+index*16));ctx.restore();
  }
  function drawIntroScene(){drawIntroMarit();drawGreetingBubble();}
  function drawRestScene(){drawIntroMarit();drawRestBubble();}
  const drawWalkingMarit=drawMarit;
  drawMarit=function(){if(state?.introTimer>0){drawIntroScene();return;}if(state?.restTimer>0){drawRestScene();return;}drawWalkingMarit();};
})();
