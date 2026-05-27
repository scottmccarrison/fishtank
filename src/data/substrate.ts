/**
 * Sloped substrate: the ground surface is NOT flat. It's a raised plateau on the
 * left that slopes down to open low sand on the right, giving the tank a diagonal,
 * terraced baseline - so decorations + floor-dwellers sit at varied heights along a
 * curve instead of lining up on one flat row.
 *
 * `substrateHeightAt(x)` is the single source of truth for the ground surface y at a
 * given x (lower y = higher ground). The substrate render, slot/terrain placement,
 * the floor-dweller fish AI, and the editor all anchor to it, so nothing floats.
 */

/** Control points (x, surfaceY) left -> right; linearly interpolated between. */
const PROFILE: { x: number; y: number }[] = [
  { x: 0, y: 392 },
  { x: 45, y: 374 },
  { x: 135, y: 372 }, // high-left plateau (landmark / massif sit up here)
  { x: 210, y: 392 },
  { x: 300, y: 412 },
  { x: 380, y: 424 },
  { x: 450, y: 430 }, // low-right open sand
];

/** Surface y of the substrate at horizontal position x (clamped to the profile ends). */
export function substrateHeightAt(x: number): number {
  const p = PROFILE;
  if (x <= p[0]!.x) return p[0]!.y;
  const last = p[p.length - 1]!;
  if (x >= last.x) return last.y;
  for (let i = 1; i < p.length; i++) {
    const b = p[i]!;
    if (x <= b.x) {
      const a = p[i - 1]!;
      const t = (x - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

/** Sampled top-edge points across the canvas width, for drawing the substrate fill. */
export function substrateTopPoints(width: number, step = 10): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let x = 0; x <= width; x += step) pts.push({ x, y: substrateHeightAt(x) });
  if (pts[pts.length - 1]!.x !== width) pts.push({ x: width, y: substrateHeightAt(width) });
  return pts;
}

/** Per-biome substrate colors (surface band light->dark + grain speckle). */
export const SUBSTRATE_COLORS: Record<string, { top: number; bottom: number; grain: number }> = {
  'tide-pool': { top: 0xd8b88a, bottom: 0x9c7b50, grain: 0x6b4f3a },
  'open-reef': { top: 0xa98f7a, bottom: 0x6e5742, grain: 0x4a3a2c },
  'abyss': { top: 0x3a3f55, bottom: 0x1b1f2e, grain: 0x12131c },
};
