import type Phaser from 'phaser';
import { DECORATIONS } from '../data/decorations.js';
import { CONSTANTS } from '../data/constants.js';

/**
 * Dev-only decoration layout authoring tool (enabled with the `?edit` URL param).
 *
 * Spawns every decoration as a drag-to-move, wheel-to-scale sprite over a reference
 * tank, then DUMP exports a `{ id: { x, y, scale } }` map (console + clipboard) that
 * gets baked into the deterministic auto-layout (DECORATION_LAYOUT + per-decoration
 * renderScale). Sprites use a BOTTOM-CENTER origin so the authored (x, y) is the point
 * where the decoration sits on the floor - the exact convention the baked renderer uses,
 * so what you arrange here is what ships.
 *
 * Not part of the shipped game; only constructed when ?edit is present.
 */

const MIN_SCALE = 0.5;
const MAX_SCALE = 14;
const SCALE_STEP = 0.2;
const FLOOR_TOP_Y = CONSTANTS.DIORAMA_HEIGHT - 60; // matches TANK_FLOOR_HEIGHT; the sand surface

export interface LayoutEditor {
  destroy(): void;
}

interface EditorItem {
  id: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function createLayoutEditor(scene: Phaser.Scene): LayoutEditor {
  const items: EditorItem[] = [];
  let selected: EditorItem | null = null;

  function refreshLabel(it: EditorItem): void {
    it.label.setText(`${it.id} ${it.sprite.scaleX.toFixed(1)}x`);
    // Label above the sprite's top (origin is bottom-center, so top = y - displayHeight).
    it.label.setPosition(it.sprite.x, it.sprite.y - it.sprite.displayHeight - 2);
  }

  // Starting grid - 4 columns across the diorama; Scott drags from here.
  const cols = 4;
  const cellW = CONSTANTS.CANVAS_WIDTH / cols;
  DECORATIONS.forEach((deco, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = Math.round(col * cellW + cellW / 2);
    const y = 110 + row * 95;
    const sprite = scene.add
      .image(x, y, deco.id)
      .setOrigin(0.5, 1) // bottom-center: (x, y) is where it meets the floor
      .setScale(3)
      .setDepth(10)
      .setInteractive({ draggable: true, useHandCursor: true });
    sprite.setData('id', deco.id);
    const label = scene.add
      .text(x, y, '', {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(200);
    const it: EditorItem = { id: deco.id, sprite, label };
    items.push(it);
    refreshLabel(it);
  });

  // --- Input ---
  const onDrag = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number): void => {
    const it = items.find((i) => i.sprite === obj);
    if (!it) return;
    it.sprite.setPosition(Math.round(dragX), Math.round(dragY));
    refreshLabel(it);
  };
  const onObjDown = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject): void => {
    const it = items.find((i) => i.sprite === obj);
    if (it) {
      selected = it;
      hud.setText(hudText());
    }
  };
  const onWheel = (_p: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number): void => {
    if (!selected) return;
    const next = clamp(selected.sprite.scaleX + (dy < 0 ? SCALE_STEP : -SCALE_STEP), MIN_SCALE, MAX_SCALE);
    selected.sprite.setScale(next);
    refreshLabel(selected);
    hud.setText(hudText());
  };
  scene.input.on('drag', onDrag);
  scene.input.on('gameobjectdown', onObjDown);
  scene.input.on('wheel', onWheel);

  // --- HUD: instructions + selection readout ---
  function hudText(): string {
    const sel = selected ? `${selected.id} @ ${Math.round(selected.sprite.x)},${Math.round(selected.sprite.y)} ${selected.sprite.scaleX.toFixed(1)}x` : 'none';
    return `EDIT MODE  ·  drag to move  ·  click then scroll to scale\nSelected: ${sel}`;
  }
  const hud = scene.add
    .text(8, 6, hudText(), {
      fontSize: '11px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    })
    .setDepth(300);

  // --- DUMP button ---
  const dumpBtn = scene.add
    .text(CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.DIORAMA_HEIGHT + 24, '[ DUMP LAYOUT ]', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#2e7d32',
      padding: { x: 14, y: 8 },
    })
    .setOrigin(0.5, 0)
    .setDepth(300)
    .setInteractive({ useHandCursor: true });

  dumpBtn.on('pointerdown', () => {
    const out: Record<string, { x: number; y: number; scale: number }> = {};
    for (const it of items) {
      out[it.id] = {
        x: Math.round(it.sprite.x),
        y: Math.round(it.sprite.y),
        scale: Number(it.sprite.scaleX.toFixed(2)),
      };
    }
    const json = JSON.stringify(out, null, 2);
    // eslint-disable-next-line no-console
    console.log('[layout-dump]\n' + json);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => dumpBtn.setText('[ COPIED! ]'),
        () => dumpBtn.setText('[ see console ]'),
      );
    } else {
      dumpBtn.setText('[ see console ]');
    }
    scene.time.delayedCall(1200, () => dumpBtn.setText('[ DUMP LAYOUT ]'));
  });

  // Floor reference line so Scott can ground decorations on the sand surface.
  const floorLine = scene.add.graphics().setDepth(5);
  floorLine.lineStyle(1, 0xffffff, 0.4);
  floorLine.lineBetween(0, FLOOR_TOP_Y, CONSTANTS.CANVAS_WIDTH, FLOOR_TOP_Y);

  return {
    destroy() {
      scene.input.off('drag', onDrag);
      scene.input.off('gameobjectdown', onObjDown);
      scene.input.off('wheel', onWheel);
      for (const it of items) {
        it.sprite.destroy();
        it.label.destroy();
      }
      hud.destroy();
      dumpBtn.destroy();
      floorLine.destroy();
    },
  };
}
