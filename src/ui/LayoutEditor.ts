import type Phaser from 'phaser';
import { DECORATIONS } from '../data/decorations.js';
import { CONSTANTS } from '../data/constants.js';

/**
 * Dev-only decoration layout authoring tool (enabled with the `?edit` URL param).
 *
 * Hand-place + size decorations over a reference tank, dial a global zoom, then DUMP
 * the result to bake into the deterministic auto-layout. Sprites use a BOTTOM-CENTER
 * origin so the authored (x, y) is the floor-contact point - the convention the baked
 * renderer uses, so what you arrange is what ships.
 *
 * Each decoration display = authoredScale * zoom. The dump records authoredScale (the
 * dump's `scale`) and the chosen `contentScale` (zoom) separately; the game renders
 * decoration at renderScale * CONSTANTS.CONTENT_SCALE, matching this editor exactly.
 *
 * Arrangement + zoom persist to localStorage so reloads / zoom tweaks don't lose work.
 * Not part of the shipped game; only constructed when ?edit is present.
 */

const MIN_SCALE = 0.5;
const MAX_SCALE = 18;
const SCALE_STEP = 0.2;
const ZOOM_STEP = 0.05;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const FLOOR_TOP_Y = CONSTANTS.DIORAMA_HEIGHT - 60; // matches TANK_FLOOR_HEIGHT; the sand surface
const SAVE_KEY = 'fishtank.editlayout';

export interface LayoutEditor {
  destroy(): void;
}

interface EditorItem {
  id: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  authored: number; // intrinsic scale; display = authored * zoom
}

interface SavedState {
  contentScale: number;
  decor: Record<string, { x: number; y: number; scale: number }>;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function loadSaved(): Partial<SavedState> {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') as Partial<SavedState>;
  } catch {
    return {};
  }
}

export function createLayoutEditor(scene: Phaser.Scene): LayoutEditor {
  const saved = loadSaved();
  let zoom = clamp(saved.contentScale ?? CONSTANTS.CONTENT_SCALE, MIN_ZOOM, MAX_ZOOM);
  const items: EditorItem[] = [];
  let selected: EditorItem | null = null;

  function persist(): void {
    const decor: SavedState['decor'] = {};
    for (const it of items) {
      decor[it.id] = { x: Math.round(it.sprite.x), y: Math.round(it.sprite.y), scale: Number(it.authored.toFixed(2)) };
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ contentScale: Number(zoom.toFixed(3)), decor }));
    } catch {
      /* ignore quota / private-mode failures */
    }
  }

  function refreshLabel(it: EditorItem): void {
    it.label.setText(`${it.id} ${it.authored.toFixed(1)}x`);
    it.label.setPosition(it.sprite.x, it.sprite.y - it.sprite.displayHeight - 2);
  }

  // Spawn each decoration - from saved arrangement if present, else a starting grid.
  const cols = 4;
  const cellW = CONSTANTS.CANVAS_WIDTH / cols;
  DECORATIONS.forEach((deco, i) => {
    const s = saved.decor?.[deco.id];
    const authored = clamp(s?.scale ?? 3, MIN_SCALE, MAX_SCALE);
    const x = s?.x ?? Math.round((i % cols) * cellW + cellW / 2);
    const y = s?.y ?? 110 + Math.floor(i / cols) * 95;
    const sprite = scene.add
      .image(x, y, deco.id)
      .setOrigin(0.5, 1)
      .setScale(authored * zoom)
      .setDepth(10)
      .setInteractive({ draggable: true, useHandCursor: true });
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
    const it: EditorItem = { id: deco.id, sprite, label, authored };
    items.push(it);
    refreshLabel(it);
  });

  function applyZoom(): void {
    for (const it of items) {
      it.sprite.setScale(it.authored * zoom);
      refreshLabel(it);
    }
  }

  // --- HUD ---
  function hudText(): string {
    const sel = selected
      ? `${selected.id} @ ${Math.round(selected.sprite.x)},${Math.round(selected.sprite.y)} ${selected.authored.toFixed(1)}x`
      : 'none';
    return [
      `EDIT MODE  ·  zoom ${zoom.toFixed(2)}  ([ / ] to change)`,
      'drag to move  ·  click then scroll to scale',
      `Selected: ${sel}`,
    ].join('\n');
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

  // --- Input ---
  const onDrag = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number): void => {
    const it = items.find((i) => i.sprite === obj);
    if (!it) return;
    it.sprite.setPosition(Math.round(dragX), Math.round(dragY));
    refreshLabel(it);
    persist();
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
    selected.authored = clamp(selected.authored + (dy < 0 ? SCALE_STEP : -SCALE_STEP), MIN_SCALE, MAX_SCALE);
    selected.sprite.setScale(selected.authored * zoom);
    refreshLabel(selected);
    hud.setText(hudText());
    persist();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '[') zoom = clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    else if (e.key === ']') zoom = clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    else return;
    applyZoom();
    hud.setText(hudText());
    persist();
  };
  scene.input.on('drag', onDrag);
  scene.input.on('gameobjectdown', onObjDown);
  scene.input.on('wheel', onWheel);
  scene.input.keyboard?.on('keydown', onKey);

  // --- Buttons ---
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
    const decor: SavedState['decor'] = {};
    for (const it of items) {
      decor[it.id] = { x: Math.round(it.sprite.x), y: Math.round(it.sprite.y), scale: Number(it.authored.toFixed(2)) };
    }
    const json = JSON.stringify({ contentScale: Number(zoom.toFixed(3)), decor }, null, 2);
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

  const resetBtn = scene.add
    .text(CONSTANTS.CANVAS_WIDTH - 8, CONSTANTS.DIORAMA_HEIGHT + 24, '[ reset ]', {
      fontSize: '12px',
      color: '#ffd0d0',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#5b2a2a',
      padding: { x: 8, y: 6 },
    })
    .setOrigin(1, 0)
    .setDepth(300)
    .setInteractive({ useHandCursor: true });
  resetBtn.on('pointerdown', () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  });

  // Floor reference line so decorations can be grounded on the sand surface.
  const floorLine = scene.add.graphics().setDepth(5);
  floorLine.lineStyle(1, 0xffffff, 0.4);
  floorLine.lineBetween(0, FLOOR_TOP_Y, CONSTANTS.CANVAS_WIDTH, FLOOR_TOP_Y);

  return {
    destroy() {
      scene.input.off('drag', onDrag);
      scene.input.off('gameobjectdown', onObjDown);
      scene.input.off('wheel', onWheel);
      scene.input.keyboard?.off('keydown', onKey);
      for (const it of items) {
        it.sprite.destroy();
        it.label.destroy();
      }
      hud.destroy();
      dumpBtn.destroy();
      resetBtn.destroy();
      floorLine.destroy();
    },
  };
}
