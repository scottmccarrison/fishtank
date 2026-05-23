import type Phaser from 'phaser';
import type { DecorationInstance } from '../types/Decoration.js';
import type { SaveStateV1 } from '../types/Save.js';
import { TANK_FLOOR_HEIGHT } from '../ui/TankFloor.js';

export interface DecorationManager {
  /** Called every frame; spawns sprites for newly-added instances. */
  update(): void;
  /** Tear down sprites - used during scene shutdown. */
  destroy(): void;
}

const DECORATION_DEPTH = -5; // above backdrop (-100), below fish (0)
const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
const MARGIN_TOP = 20;
const MARGIN_SIDE = 20;
/**
 * Bottom margin = floor height - a small overlap so decorations visually
 * rest ON the sand instead of floating above it. The 10px overlap means
 * a typical decoration sprite (24-48px tall at scale 3) ends up half-buried,
 * looking planted rather than hovering.
 */
const MARGIN_BOTTOM = TANK_FLOOR_HEIGHT - 10;

/**
 * Clamp a position to within tank bounds. Bottom margin accounts for the
 * sandy floor (TankFloor) so decorations rest on top of it. Exposed for testing.
 */
export function clampToTank(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(MARGIN_SIDE, Math.min(TANK_WIDTH - MARGIN_SIDE, x)),
    y: Math.max(MARGIN_TOP, Math.min(TANK_HEIGHT - MARGIN_BOTTOM, y)),
  };
}

/**
 * Manages decoration sprite lifecycles + drag-drop wiring. Reads from save state;
 * spawns a Phaser Image per DecorationInstance; updates instance.x/y on drag.
 *
 * `isInputBlocked` is called per drag event - when true (e.g. the shop panel
 * is open above the tank), drag is ignored. Without this guard, dragging
 * inside the shop area still moves the decoration underneath because Phaser
 * input is hit-tested per object, not z-ordered.
 *
 * TODO(post-M6): expose despawn() for a future delete-decoration flow.
 */
export function createDecorationManager(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
  isInputBlocked: () => boolean = () => false,
): DecorationManager {
  const sprites = new Map<string, Phaser.GameObjects.Image>();

  function spawn(instance: DecorationInstance): void {
    const sprite = scene.add.image(instance.x, instance.y, instance.speciesId);
    sprite.setScale(3); // match fish render scale multiplier (M3)
    sprite.setDepth(DECORATION_DEPTH);
    sprite.setInteractive({ useHandCursor: true });
    // Explicit setDraggable for Phaser-version-safety.
    scene.input.setDraggable(sprite);

    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (isInputBlocked()) return;
      const clamped = clampToTank(dragX, dragY);
      sprite.setPosition(clamped.x, clamped.y);
      instance.x = clamped.x;
      instance.y = clamped.y;
    });

    sprites.set(instance.id, sprite);
  }

  for (const instance of getState().decorationInstances) {
    spawn(instance);
  }

  return {
    update() {
      const live = getState().decorationInstances;
      for (const inst of live) {
        if (!sprites.has(inst.id)) spawn(inst);
      }
    },
    destroy() {
      for (const s of sprites.values()) s.destroy();
      sprites.clear();
    },
  };
}
