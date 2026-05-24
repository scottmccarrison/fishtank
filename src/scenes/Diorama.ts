import Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';
import { FISH_SPECIES } from '../data/fish.js';
import { BIOMES } from '../data/biomes.js';
import { FishAI } from '../sim/FishAI.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createTankFloor, TANK_FLOOR_HEIGHT } from '../ui/TankFloor.js';
import type { DisplayFish } from '../types/Fish.js';
import type { SaveStateV2, BiomeTankState } from '../types/Save.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));
const BIOME_BY_ID = new Map(BIOMES.map((b) => [b.id, b]));

export interface Diorama {
  /** Show this biome's scene (backdrop gradient, floor, fish, decorations); hide others. */
  showBiome(biomeId: string): void;
  /** Per-frame: sync display fish to counts (add a sprite for any species with count>0 that lacks one), advance motion. */
  update(dt: number): void;
  /** Render-only display fish for the active biome (fed to CoinFloater). */
  getDisplayFish(): DisplayFish[];
  destroy(): void;
}

/**
 * Per-biome rendering state - sprites keyed by speciesId for fish,
 * and a separate map for decoration sprites.
 */
interface BiomeRenderState {
  container: Phaser.GameObjects.Container;
  fishSprites: Map<string, Phaser.GameObjects.Image>;
  decoSprites: Map<string, Phaser.GameObjects.Image>;
  ai: FishAI;
}

/**
 * Pure helper: given a BiomeTankState and the existing DisplayFish map for that biome,
 * return the updated DisplayFish array - one per owned species with count > 0.
 * Species that already have a DisplayFish keep their position/direction.
 * New species (count > 0 but no existing DisplayFish) are NOT created here - position
 * requires a random source, so creation happens in the Diorama class.
 * Species that drop to count 0 are excluded from the returned array.
 *
 * Exported for unit testing without Phaser.
 */
export function syncDisplayFish(
  tank: BiomeTankState,
  existing: Map<string, DisplayFish>,
): { kept: Map<string, DisplayFish>; newSpeciesIds: string[] } {
  const kept = new Map<string, DisplayFish>();
  const newSpeciesIds: string[] = [];

  for (const [speciesId, count] of Object.entries(tank.fishCounts)) {
    if (count <= 0) continue;
    const existing_fish = existing.get(speciesId);
    if (existing_fish) {
      kept.set(speciesId, existing_fish);
    } else {
      newSpeciesIds.push(speciesId);
    }
  }

  return { kept, newSpeciesIds };
}

export function createDiorama(
  scene: Phaser.Scene,
  getState: () => SaveStateV2,
  initialBiomeId: string,
): Diorama {
  // Display fish: Map<biomeId, Map<speciesId, DisplayFish>>
  const displayFishByBiome = new Map<string, Map<string, DisplayFish>>();

  // Per-biome render state (lazy - built on first show)
  const biomeRender = new Map<string, BiomeRenderState>();

  let activeBiomeId = initialBiomeId;

  // Create a single backdrop and floor - these are shared across biomes
  const initialBiome = BIOME_BY_ID.get(initialBiomeId);
  if (!initialBiome) {
    throw new Error(`[Diorama] unknown initial biome: ${initialBiomeId}`);
  }

  const backdrop: GradientBackdrop = createGradientBackdrop(scene, initialBiome);
  // Floor is confined to diorama region via the floorBottomY parameter
  createTankFloor(scene, CONSTANTS.DIORAMA_HEIGHT);

  function ensureBiomeRender(biomeId: string): BiomeRenderState {
    const existing = biomeRender.get(biomeId);
    if (existing) return existing;

    const container = scene.add.container(0, 0);
    const fishSprites = new Map<string, Phaser.GameObjects.Image>();
    const decoSprites = new Map<string, Phaser.GameObjects.Image>();
    const ai = new FishAI({
      tankWidth: CONSTANTS.CANVAS_WIDTH,
      tankHeight: CONSTANTS.DIORAMA_HEIGHT,
    });

    const state: BiomeRenderState = { container, fishSprites, decoSprites, ai };
    biomeRender.set(biomeId, state);
    return state;
  }

  function ensureBiomeFishMap(biomeId: string): Map<string, DisplayFish> {
    let map = displayFishByBiome.get(biomeId);
    if (!map) {
      map = new Map<string, DisplayFish>();
      displayFishByBiome.set(biomeId, map);
    }
    return map;
  }

  function spawnFishSprite(
    render: BiomeRenderState,
    fishMap: Map<string, DisplayFish>,
    speciesId: string,
  ): void {
    const species = SPECIES_BY_ID.get(speciesId);
    if (!species) {
      console.warn('[Diorama] unknown species', speciesId);
      return;
    }

    // Random position within diorama bounds
    const x = 40 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 80);
    const y = 40 + Math.random() * (CONSTANTS.DIORAMA_HEIGHT - 80);
    const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    const df: DisplayFish = { speciesId, x, y, direction, behaviorType: species.behaviorType };
    fishMap.set(speciesId, df);

    const sprite = scene.add.image(x, y, speciesId);
    sprite.setScale(species.scale * CONSTANTS.RENDER_SCALE_MULTIPLIER);
    sprite.setFlipX(direction === -1);
    render.container.add(sprite);
    render.fishSprites.set(speciesId, sprite);
  }

  function syncDecorations(render: BiomeRenderState, decos: string[]): void {
    const n = decos.length;
    decos.forEach((decoId, index) => {
      if (render.decoSprites.has(decoId)) return;

      // Deterministic floor position - evenly spread across width
      const x = (CONSTANTS.CANVAS_WIDTH / (n + 1)) * (index + 1);
      const sprite = scene.add.image(x, 0, decoId);
      sprite.setDepth(-5);
      // Position y at floor - sprite needs display height to compute floor center
      const floorY =
        CONSTANTS.DIORAMA_HEIGHT - TANK_FLOOR_HEIGHT - sprite.displayHeight / 2;
      sprite.setY(floorY);
      render.container.add(sprite);
      render.decoSprites.set(decoId, sprite);
    });
  }

  // Render the initial biome immediately at construction
  const initialRender = ensureBiomeRender(initialBiomeId);
  initialRender.container.setVisible(true);

  // Sync initial fish from state
  const initialTank = getState().tanks[initialBiomeId];
  if (initialTank) {
    const fishMap = ensureBiomeFishMap(initialBiomeId);
    for (const [speciesId, count] of Object.entries(initialTank.fishCounts)) {
      if (count > 0 && !fishMap.has(speciesId)) {
        spawnFishSprite(initialRender, fishMap, speciesId);
      }
    }
    syncDecorations(initialRender, initialTank.decorations);
  }

  return {
    showBiome(biomeId: string): void {
      // Hide all containers
      for (const [id, render] of biomeRender) {
        render.container.setVisible(id === biomeId);
      }

      // Build the container lazily if needed
      const render = ensureBiomeRender(biomeId);
      render.container.setVisible(true);

      activeBiomeId = biomeId;

      // Switch backdrop gradient
      const biome = BIOME_BY_ID.get(biomeId);
      if (biome) {
        backdrop.transitionTo(biome);
      }
    },

    update(dt: number): void {
      const state = getState();
      const tank = state.tanks[activeBiomeId];
      if (!tank) return;

      const render = ensureBiomeRender(activeBiomeId);
      const fishMap = ensureBiomeFishMap(activeBiomeId);

      // Sync count->DisplayFish: add sprites for newly purchased species
      const { newSpeciesIds } = syncDisplayFish(tank, fishMap);
      for (const speciesId of newSpeciesIds) {
        spawnFishSprite(render, fishMap, speciesId);
      }

      // Advance fish AI for active biome
      const displayFishArray = Array.from(fishMap.values());
      render.ai.update(displayFishArray, dt);

      // Sync sprite positions from DisplayFish
      for (const [speciesId, df] of fishMap) {
        const sprite = render.fishSprites.get(speciesId);
        if (sprite) {
          sprite.setPosition(df.x, df.y);
          sprite.setFlipX(df.direction === -1);
        }
      }

      // Sync decorations (dormant on fresh saves - decorations[] is empty)
      syncDecorations(render, tank.decorations);
    },

    getDisplayFish(): DisplayFish[] {
      const fishMap = displayFishByBiome.get(activeBiomeId);
      if (!fishMap) return [];
      return Array.from(fishMap.values());
    },

    destroy(): void {
      backdrop.destroy();
      for (const render of biomeRender.values()) {
        render.container.destroy(true);
      }
    },
  };
}
