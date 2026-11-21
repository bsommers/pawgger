// Toon renderer (flat cartoon look with the character-library Colby/Pete). Same canvas (896x1024) and layout as ghibli;
// it reuses render/ghibli.js with look:'toon' (flat banded sky, no paper grain / vignette / dapple) and the toon sprite set.
// createToonRenderer(ctx, {settings, visibleItems, bus, sprites, makeCanvas}) -> same API as createGhibliRenderer.
import { createGhibliRenderer } from './ghibli.js';
import { TOON_SCALE } from '../core/defs.js';

export function createToonRenderer(ctx, opts = {}) {
  return createGhibliRenderer(ctx, { ...opts, style: 'toon', look: 'toon' });
}
export { TOON_SCALE };
export { createToonRenderer as createRenderer };
export default createToonRenderer;
