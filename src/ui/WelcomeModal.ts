import type Phaser from 'phaser';

export interface WelcomeModal {
  show(): void;
}

const MODAL_DEPTH = 400;
const COPY = [
  'Welcome to your fish tank!',
  '',
  'You start with one Goldfish in the Tide Pool.',
  'Buy more fish in the ledger below to earn coins faster.',
  'Each biome has its own tank - switch with the tabs.',
  'New biomes unlock as your lifetime earnings grow.',
  '',
  'Click anywhere to dismiss.',
].join('\n');

/**
 * Full-screen first-run greeting. Shown once per fresh save (when loadSave
 * returned null). Dismissed on any click; not persisted (re-showing across
 * sessions is gated by the presence of a saved state, not a flag).
 */
export function createWelcomeModal(scene: Phaser.Scene): WelcomeModal {
  return {
    show() {
      const w = scene.scale.width;
      const h = scene.scale.height;

      const overlay = scene.add
        .rectangle(w / 2, h / 2, w, h, 0x000000, 0.75)
        .setDepth(MODAL_DEPTH)
        .setInteractive();

      const text = scene.add
        .text(w / 2, h / 2, COPY, {
          fontSize: '18px',
          color: '#ffffff',
          fontFamily: 'monospace',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 4,
          lineSpacing: 6,
          wordWrap: { width: w - 40 },
        })
        .setOrigin(0.5)
        .setDepth(MODAL_DEPTH + 1);

      overlay.on('pointerdown', () => {
        scene.tweens.add({
          targets: [overlay, text],
          alpha: 0,
          duration: 250,
          onComplete: () => {
            text.destroy();
            overlay.destroy();
          },
        });
      });
    },
  };
}
