// Toon pack: world. Same geometry/names/frames as src/art/ghibli/world.js, redrawn through the toon kit (flat cel fills, thick dark outlines, no gradients).
import { build as base } from '../ghibli/world.js';
import { toonKit } from './toonkit.js';
export function build(kit) { return base(toonKit(kit)); }
export default build;
