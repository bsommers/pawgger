// Pawgger canonical data. FROZEN (orchestrator). Every module imports constants from here; never duplicate numbers.
// Node-safe: no DOM at import time. Use // comments inside doc blocks (a star-slash would end a block comment early).

// ---------------------------------------------------------------- display & layout (logical pixels, 16 px grid)
export const W = 224, H = 256;               // logical canvas, shown at integer scale, image-rendering: pixelated
export const FPS = 60, DT = 1 / 60;          // fixed sim step
export const CELL = 16, COLS = 14, ROWS = 16;

// Row map (row r spans y = r*16 .. r*16+15). Entity "y" is the CENTRE of its row: r*16+8. x is the CENTRE of a player or the LEFT edge of a lane item.
export const ROW = Object.freeze({
  hudTop: 0,                                 // score / hi-score over a canopy silhouette
  home: 1,                                   // five home bays
  river: [2, 3, 4, 5, 6],                    // 5 water lanes, row 2 is nearest the bays
  median: 7,                                 // safe jungle-path strip (Pete patrols here on later levels)
  road: [8, 9, 10, 11, 12],                  // 5 traffic lanes, row 8 is nearest the median
  start: 13,                                 // safe start strip
  hudBot: 14,                                // lives, level, time bar
  ticker: 15,                                // Pete's taunt ticker / touch hint
});
export const rowY = (r) => r * CELL + CELL / 2;
export const BAY_X = Object.freeze([16, 64, 112, 160, 208]);   // bay centres; bay is 32 wide, a hop must land with |x - cx| <= BAY_TOL
export const BAY_TOL = 12;
export const START_X = 104, START_ROW = 13;

export const PAL = Object.freeze({
  peteHL: '#9a96a8', hatHL: '#e8d68a', scarfHL: '#ff6a58',
  outline: '#1a1420', black: '#0a0710', white: '#fff6e0',
  // colby (orange tabby explorer)
  furD: '#b8561a', fur: '#f08a24', furL: '#ffc26a', cream: '#fff0d0', stripe: '#a8430f', nose: '#ff8fa3', eye: '#7bd44a', eyeD: '#1f4a12',
  hat: '#c9b26a', hatD: '#8f7a3c', hatBand: '#8a2a1a', scarf: '#d63a2f', boot: '#5a3a1a',
  // pete (Perring Parkway Pete: fat grey rat in a pinstripe suit, shades, gold tooth)
  peteFur: '#7a7688', peteFurD: '#4f4b5e', peteSuit: '#2a2f55', peteSuitL: '#444c85', peteStripe: '#8d96d6', peteTie: '#ffd23a', peteTooth: '#ffd23a', peteShade: '#0a0710', peteEar: '#e8a0b0',
  // jungle
  leafD: '#0b3d1a', leaf: '#1d7a2c', leafM: '#2f9a34', leafL: '#3fae3f', leafHL: '#8ad65a', leafDark2: '#06240f',
  trunkD: '#3d2610', trunk: '#5a3a1a', trunkL: '#7b4f26', trunkHL: '#a06a34',
  path: '#d9a441', pathD: '#a87a2a', pathL: '#f0c868', grass: '#2f9a34', grassD: '#1d7a2c',
  dirt: '#5a3a22', dirtD: '#3a2416', dirtL: '#7a5232', brick: '#a0522d', brickD: '#6e3319', brickL: '#c4744a', mortar: '#2a1810', tunnelDark: '#120a12', tunnelMid: '#241420',
  water: '#2a6fd6', waterD: '#1b4a9a', waterL: '#7ec8ff', tar: '#1a1420', tarL: '#3a2f48', quick: '#e0c060', quickD: '#b8903a', slime: '#8ad65a',
  // critters
  log: '#8a5a2a', logD: '#5a3a1a', logRing: '#c48a4a', fire: '#ff7a1a', fireL: '#ffd23a', fireD: '#d63a2f',
  snake: '#3fae3f', snakeD: '#1d7a2c', snakeBelly: '#e8e0a0', croc: '#4f8a3a', crocD: '#2f5a28', crocMouth: '#e86a7a', tooth: '#fff6e0',
  scorp: '#c4c4d0', scorpD: '#7a7688', cheese: '#ffd23a', cheeseD: '#d9a41a', cheeseHole: '#a87a2a',
  // treasures
  gold: '#ffd23a', goldD: '#d9a41a', silver: '#d8e0f0', silverD: '#8d96b8', gem: '#7ee8ff', gemD: '#2a9ad6', tuna: '#ff7a8a', can: '#c8d0e0',
  // ui
  hudBg: '#0a0710', hudTxt: '#ffd23a', hudDim: '#8d7a3a', red: '#ff4a3a', green: '#6cf06c',
  // pawgger additions: road, vehicles, river
  asphalt: '#3a3a4a', asphaltL: '#4a4a5c', asphaltD: '#2a2a38', roadLine: '#e8d68a', curb: '#8d8a9a', curbD: '#5e5a6e', sidewalk: '#b0a898',
  carRed: '#d63a2f', carRedD: '#8f2018', carBlue: '#2a6fd6', carBlueD: '#1b4a9a', carYellow: '#ffd23a', carYellowD: '#d9a41a', carGreen: '#3fae3f', carGreenD: '#1d7a2c',
  carWhite: '#fff6e0', carGrey: '#c8d0e0', window: '#7ec8ff', windowD: '#2a9ad6', tire: '#0a0710', hub: '#c8d0e0', headlight: '#fff6a0', tail: '#ff4a3a',
  pickle: '#5aa832', pickleD: '#3a7a1f', limo: '#1a1a2a', limoL: '#3a3a55', tunaCan: '#c8d0e0', tunaLabel: '#2a6fd6', mud: '#6b4a2a',
  turtle: '#3a9a5a', turtleD: '#1f6a3a', turtleShell: '#8a6a2a', turtleL: '#c4a04a', bubble: '#cfeaff', foam: '#e8f6ff', lily: '#4fc04a', lilyD: '#2a8a30', bay: '#12331c', bayWater: '#1b4a9a',
});

// Sky bands drawn behind the HUD canopy and used for tinting; t01: 1 = full day, 0 = night. Level theme maps to t01: day 1.0, dusk 0.3, night 0.0.
export const SKY_KEYS = Object.freeze([
  { t: 1.0, bands: ['#3a8ae6', '#4a98ee', '#5aa6f2', '#6ab4f4', '#7ec2f6', '#94d0f8', '#b0e0fa'], sun: '#fff6a0', star: 0 },
  { t: 0.6, bands: ['#3a78d6', '#5a8ee0', '#7aa0e0', '#a8b0d8', '#e0b8b0', '#f0c890', '#f8d878'], sun: '#ffe060', star: 0 },
  { t: 0.3, bands: ['#4a3a8a', '#7a4a9a', '#b0508a', '#d86a6a', '#f08a4a', '#f8aa3a', '#ffd04a'], sun: '#ff8a2a', star: 0.3 },
  { t: 0.0, bands: ['#080820', '#0c0c30', '#121440', '#1a1a52', '#24246a', '#303080', '#3c3c94'], sun: '#dfe8ff', star: 1 },
]);
/** @returns {{bands:string[], sun:string, star:number}} interpolated for t01 = timeLeft/TIME_LIMIT (callers may smooth). */
export function skyFor(t01) {
  const k = SKY_KEYS, t = Math.max(0, Math.min(1, t01));
  let i = 0; while (i < k.length - 2 && t < k[i + 1].t) i++;
  const a = k[i], b = k[i + 1], u = (a.t === b.t) ? 0 : (a.t - t) / (a.t - b.t);
  const hex = (c) => [1, 3, 5].map((o) => parseInt(c.slice(o, o + 2), 16));
  const mixc = (c1, c2) => '#' + hex(c1).map((v, n) => Math.round(v + (hex(c2)[n] - v) * u).toString(16).padStart(2, '0')).join('');
  return { bands: a.bands.map((c, n) => mixc(c, b.bands[n])), sun: mixc(a.sun, b.sun), star: a.star + (b.star - a.star) * u };
}


// ---------------------------------------------------------------- rules / tuning (px, seconds)
export const START_LIVES = 3;
export const TIME_LIMIT = 30;                // seconds per attempt (one frog, one bay)
export const BAY_COUNT = 5;
export const THEMES = Object.freeze(['day', 'dusk', 'night']);   // level n uses THEMES[(n-1) % 3]
export const THEME_T01 = Object.freeze({ day: 1.0, dusk: 0.3, night: 0.0 });

export const TUNING = Object.freeze({
  hopTime: 0.12,                             // seconds for one hop; input is buffered (one pending hop) while hopping
  hitHalfW: 5, hitHalfH: 5,                  // player AABB half-size, vs lane item AABB (item height = 14 px centred in the row)
  itemHalfH: 7,
  supportMargin: 3,                          // river: centre x within [left - m, right + m] of a supporting item = safe
  edgeKill: 0,                               // river: carried until centre x < -edgeKill or > W + edgeKill = death
  hopMaxX: 8, hopMaxXR: 216,                 // land rows: hopping sideways is clamped so centre x stays within [8, 216]
  baseRoadSpeed: [22, 34, 46, 28, 58],       // px/s for road rows 8..12 at level 1 (sign comes from lane dir)
  baseRiverSpeed: [20, 28, 18, 32, 24],      // px/s for river rows 2..6 at level 1
  speedPerLevel: 0.07, speedCap: 2.2,        // speedMul = min(cap, 1 + perLevel*(level-1))
  turtleDive: { period: 7.0, sink: 0.9, under: 2.2, rise: 0.7 },   // seconds per cycle part; supports only while up or the first half of sink
  crocCycle: { period: 5.0, open: 1.6 },     // croc head is lethal while open
  bayHazardCycle: { period: 6.0, open: 2.0 },
  peteSpeed: 38, peteHalfW: 10,
  cheeseSpeed: 64,
});

export const SCORES = Object.freeze({ forwardRow: 10, bay: 50, timeBonusPerSec: 10, bonusMouse: 200, bonusFish: 150, treasure: 100, levelClear: 1000, extraLifeFirst: 10000, extraLifeEvery: 30000, peteDodge: 0 });

// ---------------------------------------------------------------- entities
// Lane item kinds. w = width in px (height = one 16 px row). road kinds kill on contact; river kinds carry (see ARCHITECTURE section 4).
export const ITEM_KINDS = Object.freeze({
  car:    { w: 16, lane: 'road' },  racer:  { w: 16, lane: 'road' },  bike: { w: 16, lane: 'road' },  dozer: { w: 24, lane: 'road' },
  truck:  { w: 32, lane: 'road' },  bus:    { w: 48, lane: 'road' },  limo: { w: 48, lane: 'road' },  roller: { w: 16, lane: 'road' },
  log_s:  { w: 48, lane: 'river' }, log_m:  { w: 80, lane: 'river' }, log_l: { w: 112, lane: 'river' },
  turtles2: { w: 32, lane: 'river' }, turtles3: { w: 48, lane: 'river' },     // turtle groups; may dive
  croc:   { w: 64, lane: 'river' },                                          // 48 px safe back + 16 px head at the LEADING end
});
export const BAY_HAZARDS = Object.freeze(['croc', 'snake']);                 // a bay with one of these is lethal while it is "open"
export const BAY_BONUSES = Object.freeze(['mouse', 'fish']);                 // optional pickups that appear in an empty bay
export const PETE_MODES = Object.freeze(['none', 'taunt', 'patrol', 'patrol_throw']);   // level 1-2 none/taunt, 3-5 patrol, 6+ patrol_throw

export const GAME_STATES = Object.freeze(['title', 'intro', 'play', 'dying', 'levelclear', 'gameover']);
export const DEATH_CAUSES = Object.freeze(['squash', 'drown', 'edge', 'timeout', 'bay_wall', 'bay_hazard', 'pete', 'croc']);

// ---------------------------------------------------------------- events (bus.emit(type, payload)); the sim emits, render/audio/ui listen
export const EVENTS = Object.freeze([
  'hop',            // {dir, x, y}
  'row_forward',    // {row, points}
  'land_log',       // {x, y, kind}
  'splash',         // {x, y}
  'squash',         // {x, y, kind}
  'death',          // {cause, x, y, livesLeft}
  'home',           // {bay, x, timeLeft, points, bonus}
  'bay_hit',        // {bay, why}              // wall or hazard in a bay
  'bonus',          // {type, bay, points}     // mouse/fish/treasure
  'turtle_dive',    // {lane, x}
  'croc_snap',      // {lane, x}
  'honk',           // {lane, x}               // limo
  'pete_taunt',     // {line}
  'pete_throw',     // {x, row}
  'tick_low',       // {timeLeft}              // each second under 8 s
  'extra_life',     // {lives}
  'level_clear',    // {level, bonus}
  'level_start',    // {level, theme}
  'gameover',       // {score, level}
  'state',          // {from, to}
]);

export const SFX = Object.freeze([
  'hop', 'land_log', 'splash', 'squash', 'death', 'home', 'bay_hit', 'bonus_mouse', 'bonus_fish', 'turtle_dive', 'croc_snap',
  'honk', 'pete_laugh', 'pete_throw', 'tick_low', 'extra_life', 'level_clear', 'gameover', 'menu_move', 'menu_select', 'start', 'row_forward', 'timeout',
]);
export const MUSIC = Object.freeze(['title', 'play_day', 'play_dusk', 'play_night', 'levelclear', 'gameover', 'death']);   // play_* and title loop; others are stings

// ---------------------------------------------------------------- art manifest: [module, name, w, h, frames]
// Frames are laid out left to right. Vehicle and platform sprites face RIGHT; the renderer mirrors them for dir -1. Colby sprites exist for all 4 facings.
// Keep art inside a 1 px margin so outlines fit; character/vehicle feet and wheels sit on the bottom row of the cell.
export const ART = Object.freeze([
  // colby (art-colby): top-down 3/4 view hopping cat. frame 0 = crouched, frame 1 = mid-hop (stretched)
  ['colby', 'colby_up', 16, 16, 2], ['colby', 'colby_down', 16, 16, 2], ['colby', 'colby_left', 16, 16, 2], ['colby', 'colby_right', 16, 16, 2],
  ['colby', 'colby_squash', 16, 16, 3], ['colby', 'colby_drown', 16, 16, 4], ['colby', 'colby_home', 16, 16, 2], ['colby', 'colby_life', 10, 10, 1],
  ['colby', 'pete_walk', 24, 16, 2], ['colby', 'pete_taunt', 32, 32, 2],
  // vehicles (art-vehicles)
  ['vehicles', 'car', 16, 16, 2], ['vehicles', 'racer', 16, 16, 2], ['vehicles', 'bike', 16, 16, 2], ['vehicles', 'dozer', 24, 16, 2],
  ['vehicles', 'truck', 32, 16, 2], ['vehicles', 'bus', 48, 16, 2], ['vehicles', 'limo', 48, 16, 2], ['vehicles', 'roller', 16, 16, 4],
  ['vehicles', 'glow_head', 24, 16, 1],
  // river (art-river)
  ['river', 'log_s', 48, 16, 1], ['river', 'log_m', 80, 16, 1], ['river', 'log_l', 112, 16, 1],
  ['river', 'turtle_up', 16, 16, 2], ['river', 'turtle_sink', 16, 16, 3], ['river', 'turtle_under', 16, 16, 2],
  ['river', 'croc_closed', 64, 16, 2], ['river', 'croc_open', 64, 16, 2],
  ['river', 'tile_water', 16, 16, 4], ['river', 'tile_water_edge', 16, 16, 4],
  // world (art-world): all 16x16 tiles seamless horizontally
  ['world', 'tile_road', 16, 16, 1], ['world', 'tile_road_dash', 16, 16, 1], ['world', 'tile_curb', 16, 16, 1], ['world', 'tile_median', 16, 16, 2],
  ['world', 'tile_start', 16, 16, 2], ['world', 'bay_empty', 32, 16, 1], ['world', 'bay_wall', 16, 16, 1],
  ['world', 'bay_croc', 32, 16, 3], ['world', 'bay_snake', 32, 16, 3], ['world', 'bay_mouse', 16, 16, 2], ['world', 'bay_fish', 16, 16, 2],
  ['world', 'bg_canopy', 224, 16, 1], ['world', 'bg_ticker', 224, 16, 1], ['world', 'sign_pete', 32, 16, 1],
  // the story: Colby crosses Perring Parkway from the Burger King (start, bottom, west side) to the Micro Center (goal, top, east side)
  ['world', 'bg_microcenter', 224, 16, 1],   // row 0 storefront with a big readable MICRO CENTER sign over the five bays
  ['world', 'bg_burger', 224, 16, 1],        // row 15 fast-food storefront with a big readable BURGER KING sign
  ['world', 'bk_pole', 16, 16, 2],           // start strip: roadside burger sign pole (2 frames, blinking)
  ['world', 'nerd', 16, 16, 4],              // computer nerds (glasses, hoodie, laptop); 4 variants shown in/next to filled bays and cheering at level clear
  ['world', 'nerd_cheer', 16, 16, 2],
  // fx (art-fx): logo + title + particles + treasures
  ['fx', 'logo', 192, 48, 1], ['fx', 'title_scene', 224, 96, 1], ['fx', 'cursor_paw', 12, 12, 1],
  ['fx', 'fx_splash', 16, 16, 4], ['fx', 'fx_puff', 16, 16, 4], ['fx', 'fx_star', 8, 8, 4], ['fx', 'fx_bubble', 6, 6, 3],
  ['fx', 'tr_whopper', 12, 12, 3], ['fx', 'tr_fries', 12, 12, 3], ['fx', 'tr_tuna', 12, 12, 3], ['fx', 'tr_sardine', 12, 12, 3], ['fx', 'tr_gold', 12, 12, 3], ['fx', 'tr_collar', 12, 12, 3],
  ['fx', 'btn_touch', 32, 32, 2],
]);
export function artManifest() { return ART.map(([module, name, w, h, frames]) => ({ module, name, w, h, frames })); }   // object form for tools/sheet.mjs

// ---------------------------------------------------------------- visual styles (switchable at runtime; setting `style`, query ?style=, key G)
export const STYLES = Object.freeze(['retro', 'ghibli', 'toon']);
export const DEFAULT_STYLE = 'retro';
export const TOON_SCALE = 4;                 // toon style (flat cartoon + character-library Colby/Pete): same 896x1024 canvas and 4x sprites as ghibli
export const GHIBLI_SCALE = 4;               // ghibli sprites are drawn at 4x resolution (cell = 64 px) with smooth vector art; the ghibli canvas is 896x1024 and the sim/layout are unchanged
// Soft painterly palette (watercolour-like, warm light). Ghibli art may use these plus any blends/gradients of them; it is NOT locked to PAL.
export const GPAL = Object.freeze({
  ink: '#3b2f3a', inkSoft: '#5a4a55', paper: '#fbf3e0', cream: '#fff6dc',
  skyDayTop: '#7fc4f0', skyDayMid: '#bfe3f7', skyDayLow: '#f6f1d6', skyDuskTop: '#6a6fb8', skyDuskMid: '#e9a5a0', skyDuskLow: '#ffd9a0', skyNightTop: '#1c2250', skyNightMid: '#37408a', skyNightLow: '#6a6fb0',
  cloud: '#ffffff', cloudShade: '#dbe6f2', sun: '#fff1a8', moon: '#fff6d8',
  leaf: '#4f9a52', leafL: '#8cc66a', leafD: '#2d6a45', grassL: '#a6d76f', moss: '#6aa55a', trunk: '#7a5236', trunkL: '#a6784c',
  waterL: '#8fd4e8', water: '#4aa6cf', waterD: '#2d6fa6', foam: '#f1fbff', riverbank: '#c9a66b',
  roadL: '#8d8aa0', road: '#6e6b86', roadD: '#4f4c68', roadLine: '#f3e3a0', curb: '#b9b1a4', path: '#e0bd7a', pathD: '#bf9a56', flower1: '#ff9fb2', flower2: '#fff0a0', flower3: '#b9a2ff',
  fur: '#f4923a', furL: '#ffc98a', furD: '#c4631f', cream: '#fff0d6', scarf: '#e0483c', hat: '#d9c283', hatD: '#a38a4a', eye: '#6fcf6a', cheeks: '#ff9aa8',
  peteFur: '#8a869c', peteSuit: '#3a4075', peteSuitL: '#5560a8', gold: '#ffd35a',
  carRed: '#e0584a', carBlue: '#4f86d6', carYellow: '#f6cf5a', carGreen: '#62b667', pickle: '#7ac05a',
});
