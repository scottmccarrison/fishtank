import Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';
import { FISH_SPECIES } from '../data/fish.js';
import { BIOMES } from '../data/biomes.js';
import { DECORATION_SLOTS, DECORATION_LAYOUT } from '../data/decorationSlots.js';
import { DECORATION_BY_ID } from '../data/decorations.js';
import { FishAI } from '../sim/FishAI.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createSubstrate, type Substrate } from '../ui/Substrate.js';
import { substrateHeightAt } from '../data/substrate.js';
import { createTankGlass } from '../ui/TankGlass.js';
import { createAquascape } from '../ui/Aquascape.js';
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
 * and a separate map for decoration sprites (keyed by slotId).
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
  // Sloped substrate - replaces the old flat TankFloor.
  const floor: Substrate = createSubstrate(scene, initialBiomeId);
  // Glass frame + waterline overlay so the diorama reads as a contained tank.
  const glass = createTankGlass(scene);
  // Aquascape terrain (rock shelves/arches) for vertical depth; back/front bands.
  const aquascape = createAquascape(scene);

  function ensureBiomeRender(biomeId: string): BiomeRenderState {
    const existing = biomeRender.get(biomeId);
    if (existing) return existing;

    const container = scene.add.container(0, 0);
    const fishSprites = new Map<string, Phaser.GameObjects.Image>();
    const decoSprites = new Map<string, Phaser.GameObjects.Image>();
    const ai = new FishAI({
      tankWidth: CONSTANTS.CANVAS_WIDTH,
      tankHeight: CONSTANTS.DIORAMA_HEIGHT,
      // Keep fish below the waterline (a touch below the shimmer so they don't clip it).
      surfaceTop: CONSTANTS.WATER_SURFACE_Y + 12,
      floorAt: substrateHeightAt,
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

    // Random position within diorama bounds, below the waterline.
    const x = 40 + Math.random() * (CONSTANTS.CANVAS_WIDTH - 80);
    const yMin = CONSTANTS.WATER_SURFACE_Y + 16;
    const y = yMin + Math.random() * (CONSTANTS.DIORAMA_HEIGHT - yMin - 40);
    const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    const df: DisplayFish = { speciesId, x, y, direction, behaviorType: species.behaviorType };
    fishMap.set(speciesId, df);

    const sprite = scene.add.image(x, y, speciesId);
    sprite.setScale(species.scale * CONSTANTS.RENDER_SCALE_MULTIPLIER * CONSTANTS.CONTENT_SCALE);
    sprite.setFlipX(direction === -1);
    render.container.add(sprite);
    render.fishSprites.set(speciesId, sprite);
  }

  /**
   * Syncs the slot-based decoration sprites for a biome.
   * One sprite per slot, keyed by slotId. Tier 0 = destroy sprite (empty slot).
   * Tier > 0 = create or update sprite to the current tier's decoration.
   */
  function syncSlots(render: BiomeRenderState, biomeId: string): void {
    const state = getState();
    const slotTiers = state.tanks[biomeId]?.slotTiers ?? {};

    for (const slot of DECORATION_SLOTS) {
      const currentTier = slotTiers[slot.id] ?? 0;

      if (currentTier === 0) {
        // Empty slot - destroy sprite if it exists
        const existing = render.decoSprites.get(slot.id);
        if (existing) {
          existing.destroy();
          render.decoSprites.delete(slot.id);
        }
        continue;
      }

      const decoId = slot.tiers[currentTier - 1]!;
      const layout = DECORATION_LAYOUT[slot.id]!;
      const deco = DECORATION_BY_ID.get(decoId);
      if (!deco) continue;

      const slotX = layout.x;
      const slotY = substrateHeightAt(slotX);

      const existingSprite = render.decoSprites.get(slot.id);
      if (!existingSprite) {
        // Create new sprite for this slot - y anchored to the substrate curve
        const sprite = scene.add
          .image(slotX, slotY, decoId)
          .setOrigin(0.5, 1)
          .setDepth(-5);
        sprite.setScale(deco.renderScale * CONSTANTS.CONTENT_SCALE);
        render.container.add(sprite);
        render.decoSprites.set(slot.id, sprite);
      } else {
        // Sprite exists - update texture if tier changed (texture key is the decoId)
        if (existingSprite.texture.key !== decoId) {
          existingSprite.setTexture(decoId);
          existingSprite.setScale(deco.renderScale * CONSTANTS.CONTENT_SCALE);
        }
        // Always re-snap to substrate (slope may differ per x)
        existingSprite.setPosition(slotX, slotY);
      }
    }
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
    syncSlots(initialRender, initialBiomeId);
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

      // Switch backdrop gradient and floor tile
      const biome = BIOME_BY_ID.get(biomeId);
      if (biome) {
        backdrop.transitionTo(biome);
      }
      floor.showBiome(biomeId);
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

      // Sync decoration slots
      syncSlots(render, activeBiomeId);
    },

    getDisplayFish(): DisplayFish[] {
      const fishMap = displayFishByBiome.get(activeBiomeId);
      if (!fishMap) return [];
      return Array.from(fishMap.values());
    },

    destroy(): void {
      backdrop.destroy();
      floor.destroy();
      glass.destroy();
      aquascape.destroy();
      for (const render of biomeRender.values()) {
        render.container.destroy(true);
      }
    },
  };
}
