// Toon pack: vehicles. Same geometry/names/frames as src/art/ghibli/vehicles.js, redrawn through the toon kit (flat cel fills, thick dark outlines, no gradients).
import { build as base } from '../ghibli/vehicles.js';
import { toonKit } from './toonkit.js';
export function build(kit) { return base(toonKit(kit)); }
export default build;
