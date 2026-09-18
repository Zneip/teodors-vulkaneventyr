# AGENTS.md

Teodors Vulkaneventyr – mobiltilpasset endless runner i ren HTML/CSS/JS, ingen rammeverk, ingen byggetrinn.

## Kommandoer

```powershell
node server.js        # lokal testserver på port 4173 (env PORT overstyrer)
node --check game.js  # syntakssjekk – kjør etter enhver endring i game.js
node --test           # 27+ hodeløse canvas-regresjonstester (game.test.js, dragon.test.js)
```

Testene trekker ut funksjoner fra `game.js` med regex (`function drawFish\(...\)\{([\s\S]*?)\}\r?\n  function drawBoulder`) og validerer canvas-kall mot fake-ctx. Endrer du funksjonsnavn, rekkefølge eller kommentarer som regexene matcher på (`// Tydelig gangsyklus:`), må testene oppdateres i samme commit.

## Bygg og verifisering

En funksjonell endring er ikke ferdig før alle kontrollene over er kjørt (`node --check`, `node --test`, og manuell test i nettleser ved visuelle endringer). Repoet bruker `node:test` og har bevisst ingen build/lint – innfør ikke nye testverktøy eller byggoppsett bare for å få en kontroll til å kjøre.

## Arkitektur

- `game.js` er hele spillet: ett IIFE, ~600 linjer med svært kompakte one-liner-funksjoner. All rendering er prosedyrisk Canvas 2D – ingen bildeassets.
- `index.html` har all statisk UI (overlays, butikk, guider); `game.js` binder dem opp via `ui`-objektet øverst. Element-ID-er må matche på tvers av de to filene.
- `styles.css` (minifisert-stil, én lang linje per komponent) – unngå reformatering.
- Cache-busting: `index.html` refererer til `game.js?v=<hash>` etc. Oppdater hashene manuelt ved deploy hvis caching gir utdaterte filer.

## Viktige konstanter og mekanikk (game.js)

- `DEBUG_PIN = '5859'` – pinkode for debugpanel (lavaras-debug, prisredigering). Prisredigering krever lokal server (`PUT /api/shop-prices` i `server.js`, lagrer til `shop-prices.json`).
- Fart/hopp er skalert via `JUMP_HEIGHT_SCALE` og `VIRTUAL_WORLD_WIDTH` (fast logisk bredde 960) – endre ikke disse isolert, de påvirker spillfølelse på tvers av skjermstørrelser.
- Vanskelighetsgrader ligger i `DIFFICULTIES`; butikkvarer i `SHOP_CATALOG` + `PRICE_EDITOR_FIELDS` + `shop-prices.json` (tre steder som må holdes i sync).
- Spillerfiguren tegnes i `drawMarit` (løping) og `drawIntroMarit` (intro/hvile, sett forfra) – ansikt/hår endres begge steder ved behov.
- Dragemonsteret (`updateDragon`/`drawDragon`/`dragonFlames`) starter ved 40 km (`DRAGON_START_DISTANCE`), fluer over spilleren og tapper hjerter ved treff. Det må ikke overlappe lavaras (`rockfallInProgress()`) eller hyttebesøk, og elver stanses mens det holder seg i luften (`dragonClearanceActive()`). Testene håndhever disse interaksjonene.

## Verifiseringsfaller (har knekt spillet før)

- Canvas-kall kaster `IndexSizeError` ved negativ radius og stopper hele spill-løkken. Animasjonsfaser beregnet med `%` må pakkes så de aldri blir negative når `i` (fjell-indeks) er negativ: `((x % 1) + 1) % 1`.
- `node --test` validerer radier og tegnerekkefølge over flere tid/kamera-kombinasjoner – kjør det etter visuelle endringer.

## Toppliste og herenow

- Toppliste-API `./.herenow/data/highscores` leveres av here.now-plattformen i produksjon; lokal `server.js` har ikke dette endepunktet (404 lokalt er forventet).
- Skjema for samlingen ligger i `.herenow/data.json` (offentlig les/skriv). Felt: name, score, platform, difficulty.
- `.herenow/state.json` er lokal publiserings-cache (gitignoret) – aldri commit.

## Deploy (here.now)

- Publisering: 3-stegs API-flyt (create → PUT-filer → finalize). `server.js` og `.git` skal ikke publiseres. Se `~/.agents/skills/here-now/SKILL.md`.
- Produksjon: https://aware-crest-sbaz.here.now/ (egen instans; originalen `hallowed-bamboo-b4x7.here.now` er et annet spill).
- Topplisten er per site – ny instans = tom liste.

## Arbeid med andre agenter

Flere kodeagenter jobber i dette repoet. Før nye endringer: hent fersk tilstand med `git fetch`, og kontroller `git status`, `git diff` og nylig historikk (`git log --oneline -10`).
- Ikke revert eller overskriv eksisterende ucommittede endringer uten å forstå dem først.
- Git-historikken og working tree er sannhetskilden for **koden** – men ikke for hva som er publisert: here.now-deploy og `git push` er uavhengige spor. Prod kan ligge foran eller bak origin/main. Sjekk `.herenow/state.json` for sist publiserte slug/versjon før republisering.
- En annen agent kan ha rebaset/amendet commits (har skjedd) – stol ikke på at SHA-er du husker fortsatt finnes; les historikken på nytt.
- Commiter ikke andres arbeid inn i egne commits uten å ha verifisert at det kjører grønt først.

## Språk

All bruker synlig tekst er norsk (bokmål). Behold dette i prompts, UI-tekst og tutorials.
