// ui-shell tests: menus, options binding, HUD/screens draw without throwing in both styles, hi-score flow helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenu, createOptionsMenu } from '../src/ui/menus.js';
import { createHud } from '../src/ui/hud.js';
import * as S from '../src/ui/screens.js';
import { isTouchDevice } from '../src/ui/touch.js';
import { createPixCtx } from '../src/render/renderer.js';
import { hiRank, insertHi, DEFAULT_HI } from '../src/core/settings.js';

const mkCtx = () => {
  const real = createPixCtx(224, 256);
  return new Proxy(real, { get(t, k) { const v = t[k]; if (v !== undefined) return typeof v === 'function' ? v.bind(t) : v; return typeof k === 'string' && /^(roundRect|createLinearGradient|measureText|strokeText|fillText|arc|moveTo|lineTo|beginPath|fill|stroke|rect|clip|save|restore|translate|ellipse)$/.test(k) ? (k === 'measureText' ? (s) => ({ width: String(s).length * 5 }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}) : undefined; }, set(t, k, v) { try { t[k] = v; } catch { /* ignore */ } return true; } });
};

test('menu wraps and activates', () => {
  let hit = null; const m = createMenu([{ id: 'a', text: 'A', act: () => { hit = 'a'; } }, { id: 'b', text: 'B' }]);
  m.act('up'); assert.equal(m.sel, 1); m.act('down'); assert.equal(m.sel, 0);
  assert.equal(m.act('confirm'), 'a'); assert.equal(hit, 'a');
});
test('options menu edits settings and reports changes', () => {
  const s = { style: 'retro', master: 0.5, music: 0.5, sfx: 0.5, mute: false, crt: true }, ch = [];
  const m = createOptionsMenu(s, { change: (k) => ch.push(k) });
  m.act('right'); assert.equal(s.style, 'ghibli'); m.act('right'); assert.equal(s.style, 'toon'); m.act('right'); assert.equal(s.style, 'retro');
  m.act('down'); m.act('right'); assert.equal(s.master, 0.6); m.act('left'); m.act('left'); assert.equal(s.master, 0.4);
  m.sel = 4; m.act('confirm'); assert.equal(s.mute, true);
  assert.deepEqual(ch.slice(0, 2), ['style', 'style']);
});
for (const style of ['retro', 'ghibli']) {
  test(`hud + screens draw (${style})`, () => {
    const ctx = mkCtx(), hud = createHud(), g = { score: 1234, lives: 5, levelNum: 3, timeLeft: 4, state: 'play', stateT: 0.5, pete: { line: 'NO WHOPPER, NO ENTRY!' } };
    hud.draw(ctx, g, { style, hi: 20000, t: 1 });
    for (const st of ['intro', 'levelclear']) hud.draw(ctx, { ...g, state: st }, { style, hi: 1, t: 0 });
    const menu = createMenu([{ id: 'x', text: 'X' }]);
    S.drawTitle(ctx, style, 1, menu); S.drawOptions(ctx, style, 1, menu); S.drawHelp(ctx, style, 1);
    S.drawHiScores(ctx, style, 1, DEFAULT_HI, 2); S.drawNameEntry(ctx, style, 1, 'AB', 500); S.drawGameOver(ctx, style, 0, g); S.drawPaused(ctx, style, 0, menu);
  });
}
test('story texts', () => { assert.equal(S.TAGLINE, 'FROM THE WHOPPER TO THE WORKSTATION'); assert.equal(S.GAMEOVER_TEXT, 'OUT OF WHOPPERS'); });
test('hi-score insert', () => { assert.ok(hiRank(DEFAULT_HI, 5000) >= 0); assert.equal(insertHi(DEFAULT_HI, 'ABC', 999999)[0].name, 'ABC'); });
test('touch detection is Node-safe', () => assert.equal(isTouchDevice(null), false));
