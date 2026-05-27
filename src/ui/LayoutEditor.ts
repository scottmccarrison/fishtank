import type Phaser from 'phaser';
import { DECORATION_SLOTS, DECORATION_LAYOUT } from '../data/decorationSlots.js';
import { DECORATION_BY_ID } from '../data/decorations.js';
import { FISH_SPECIES } from '../data/fish.js';
import { TERRAIN_ROCKS, TERRAIN_LAYOUT } from '../data/terrainLayout.js';
import { CONSTANTS } from '../data/constants.js';
import { substrateHeightAt, substrateTopPoints } from '../data/substrate.js';

/**
 * Dev-only aquascape authoring tool (enabled with the `?edit` URL param).
 *
 * THREE MODES, cycled with `m`:
 *   decor   - position slots + size per-tier decorations
 *   terrain - arrange rock aquascape (band, include/exclude)
 *   fish    - size per-species sprites
 *
 * Global zoom (`[`/`]`) multiplies ALL displayed scales so the editor is
 * WYSIWYG with the game. Sprites use a BOTTOM-CENTER origin (0.5, 1) -
 * the game convention - so authored (x,y) is the floor-contact point.
 *
 * Persistence: localStorage key `fishtank.editlayout`.
 * DUMP button emits:
 *   { contentScale, slots, decorScale, terrain (included only), fishScale }
 *
 * Import rules: `import type Phaser` only (no runtime Phaser import - breaks
 * jsdom tests). Manual clamp. String event names throughout.
 */

const MIN_SCALE = 0.1;
const MAX_SCALE = 18;
const SCALE_STEP = 0.1;
const ZOOM_STEP = 0.05;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
/** Fallback y used when a slot has no stored position and no baked layout. */
const FLOOR_TOP_Y = CONSTANTS.DIORAMA_HEIGHT - 60;
const SAVE_KEY = 'fishtank.editlayout';

type Mode = 'decor' | 'terrain' | 'fish';
const MODES: Mode[] = ['decor', 'terrain', 'fish'];

export interface LayoutEditor {
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Authored state types
// ---------------------------------------------------------------------------

interface SlotPos {
  x: number;
  y: number;
}

interface TerrainEntry {
  rockId: string;
  x: number;
  y: number;
  scale: number;
  band: 'back' | 'front';
  included: boolean;
}

interface SavedState {
  contentScale: number;
  /** Slot positions keyed by slotId. */
  slots: Record<string, SlotPos>;
  /** Per-decoration authored scale keyed by decoId. */
  decorScale: Record<string, number>;
  /** All terrain rocks (included + excluded). */
  terrainAll: TerrainEntry[];
  /** Per-fish authored scale keyed by speciesId. */
  fishScale: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Sprite wrappers
// ---------------------------------------------------------------------------

interface DecorItem {
  slotId: string;
  /** Currently displayed decoration id (changes as tier cycles). */
  decoId: string;
  /** Index into slot.tiers[] currently shown. */
  tierIdx: number;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface TerrainItem {
  entry: TerrainEntry;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface FishItem {
  speciesId: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function loadSaved(): Partial<SavedState> {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') as Partial<SavedState>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLayoutEditor(scene: Phaser.Scene): LayoutEditor {
  const saved = loadSaved();
  let zoom = clamp(saved.contentScale ?? CONSTANTS.CONTENT_SCALE, MIN_ZOOM, MAX_ZOOM);

  // Authored state
  const slotPos: Record<string, SlotPos> = {};
  const decorScale: Record<string, number> = {};
  const fishScale: Record<string, number> = {};
  // Terrain keyed by rockId
  const terrainMap: Record<string, TerrainEntry> = {};

  // Pre-populate authored state from saved (with sensible defaults)
  for (const slot of DECORATION_SLOTS) {
    // Seed from in-progress edits; else snap baked x to substrate y; else safe fallback.
    if (saved.slots?.[slot.id]) {
      slotPos[slot.id] = { x: saved.slots[slot.id]!.x, y: saved.slots[slot.id]!.y };
    } else if (DECORATION_LAYOUT[slot.id]) {
      const baked = DECORATION_LAYOUT[slot.id]!;
      slotPos[slot.id] = { x: baked.x, y: substrateHeightAt(baked.x) };
    } else {
      slotPos[slot.id] = { x: 0, y: FLOOR_TOP_Y };
    }
  }
  for (const [id, deco] of DECORATION_BY_ID) {
    decorScale[id] = saved.decorScale?.[id] ?? deco.renderScale;
  }
  for (const species of FISH_SPECIES) {
    fishScale[species.id] = saved.fishScale?.[species.id] ?? species.scale;
  }

  // Terrain: lay rocks out in a row starting off-screen-left for fresh state
  const DEFAULT_TERRAIN_START_X = 40;
  const DEFAULT_TERRAIN_STEP = 65;
  TERRAIN_ROCKS.forEach((rockId, i) => {
    const saved_entry = saved.terrainAll?.find((e) => e.rockId === rockId);
    const baked = TERRAIN_LAYOUT.find((t) => t.rockId === rockId);
    // In-progress edits win; else baked rocks come in included at their composed
    // spot; else the rock parks off to the side, excluded.
    terrainMap[rockId] = saved_entry ?? (baked
      ? { rockId, x: baked.x, y: substrateHeightAt(baked.x), scale: baked.scale, band: baked.band, included: true }
      : { rockId, x: DEFAULT_TERRAIN_START_X + i * DEFAULT_TERRAIN_STEP, y: FLOOR_TOP_Y, scale: 2, band: 'back', included: false });
  });

  // --- Mode ---
  let mode: Mode = 'decor';

  // --- All sprite lists ---
  const decorItems: DecorItem[] = [];
  const terrainItems: TerrainItem[] = [];
  const fishItems: FishItem[] = [];

  // --- Selection ---
  let selectedDecor: DecorItem | null = null;
  let selectedTerrain: TerrainItem | null = null;
  let selectedFish: FishItem | null = null;

  // ---------------------------------------------------------------------------
  // Label style helper
  // ---------------------------------------------------------------------------
  function makeLabel(x: number, y: number): Phaser.GameObjects.Text {
    return scene.add
      .text(x, y, '', {
        fontSize: '9px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(200);
  }

  // ---------------------------------------------------------------------------
  // DECOR items - one per slot, showing tier 0 decoration
  // ---------------------------------------------------------------------------
  DECORATION_SLOTS.forEach((slot) => {
    const pos = slotPos[slot.id]!;
    const x = pos.x;
    const y = pos.y;

    const decoId = slot.tiers[0]!;
    const scale = decorScale[decoId] ?? DECORATION_BY_ID.get(decoId)?.renderScale ?? 3;
    decorScale[decoId] = scale;

    const sprite = scene.add
      .image(x, y, decoId)
      .setOrigin(0.5, 1)
      .setScale(scale * zoom)
      .setDepth(10)
      .setInteractive({ draggable: true, useHandCursor: true });

    const label = makeLabel(x, y);

    const item: DecorItem = { slotId: slot.id, decoId, tierIdx: 0, sprite, label };
    decorItems.push(item);
    refreshDecorLabel(item);
  });

  function refreshDecorLabel(it: DecorItem): void {
    const slot = DECORATION_SLOTS.find((s) => s.id === it.slotId);
    const tierStr = slot ? `t${it.tierIdx + 1}/${slot.tiers.length}` : '';
    it.label.setText(`${it.slotId} ${tierStr} ${(decorScale[it.decoId] ?? 1).toFixed(1)}x`);
    it.label.setPosition(it.sprite.x, it.sprite.y - it.sprite.displayHeight - 2);
  }

  // ---------------------------------------------------------------------------
  // TERRAIN items - one per TERRAIN_ROCKS entry
  // ---------------------------------------------------------------------------
  for (const rockId of TERRAIN_ROCKS) {
    const entry = terrainMap[rockId]!;
    const sprite = scene.add
      .image(entry.x, entry.y, rockId)
      .setOrigin(0.5, 1)
      .setScale(entry.scale * zoom)
      .setDepth(10)
      .setAlpha(entry.included ? 1 : 0.25)
      .setInteractive({ draggable: true, useHandCursor: true });
    if (entry.band === 'back') sprite.setTint(0x8b9bad);

    const label = makeLabel(entry.x, entry.y);
    const item: TerrainItem = { entry, sprite, label };
    terrainItems.push(item);
    refreshTerrainLabel(item);
  }

  function refreshTerrainLabel(it: TerrainItem): void {
    const e = it.entry;
    it.label.setText(`${e.rockId} ${e.band} ${e.scale.toFixed(1)}x${e.included ? '' : ' [x]'}`);
    it.label.setPosition(it.sprite.x, it.sprite.y - it.sprite.displayHeight - 2);
  }

  // ---------------------------------------------------------------------------
  // FISH items - grid layout, position is display-only (not authored)
  // ---------------------------------------------------------------------------
  const FISH_COLS = 5;
  const FISH_CELL_W = CONSTANTS.CANVAS_WIDTH / FISH_COLS;
  const FISH_CELL_H = 80;
  FISH_SPECIES.forEach((species, i) => {
    const col = i % FISH_COLS;
    const row = Math.floor(i / FISH_COLS);
    const x = Math.round(col * FISH_CELL_W + FISH_CELL_W / 2);
    const y = 60 + row * FISH_CELL_H;
    const scale = fishScale[species.id] ?? species.scale;
    fishScale[species.id] = scale;

    const sprite = scene.add
      .image(x, y, species.id)
      .setOrigin(0.5, 0.5)
      .setScale(scale * CONSTANTS.RENDER_SCALE_MULTIPLIER * zoom)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    const label = makeLabel(x, y + 30);
    const item: FishItem = { speciesId: species.id, sprite, label };
    fishItems.push(item);
    refreshFishLabel(item);
  });

  function refreshFishLabel(it: FishItem): void {
    const scale = fishScale[it.speciesId] ?? 1;
    it.label.setText(`${it.speciesId}\n${scale.toFixed(2)}x`);
    it.label.setPosition(it.sprite.x, it.sprite.y + it.sprite.displayHeight / 2 + 2);
  }

  // ---------------------------------------------------------------------------
  // Mode visibility
  // ---------------------------------------------------------------------------
  // Decor + terrain share the tank view so slots can be placed ON the terrain.
  // Only the active mode's items are interactive; the other layer shows dimmed as
  // a backdrop. Fish mode is a separate sizing grid (its own view).
  function applyModeVisibility(): void {
    const showFish = mode === 'fish';
    for (const it of decorItems) {
      it.sprite.setVisible(!showFish);
      it.label.setVisible(mode === 'decor');
      if (mode === 'decor') {
        it.sprite.setInteractive({ draggable: true, useHandCursor: true });
        it.sprite.setAlpha(1);
      } else {
        it.sprite.disableInteractive();
        it.sprite.setAlpha(0.45); // dimmed backdrop while editing terrain
      }
    }
    for (const it of terrainItems) {
      it.sprite.setVisible(!showFish);
      it.label.setVisible(mode === 'terrain');
      if (mode === 'terrain') {
        it.sprite.setInteractive({ draggable: true, useHandCursor: true });
        it.sprite.setAlpha(it.entry.included ? 1 : 0.25); // excluded rocks faded but draggable in
      } else {
        it.sprite.disableInteractive();
        // In decor mode, only INCLUDED terrain shows, dimmed as a backdrop to place slots on.
        it.sprite.setAlpha(it.entry.included ? 0.6 : 0);
      }
    }
    for (const it of fishItems) {
      it.sprite.setVisible(showFish);
      if (showFish) it.sprite.setInteractive({ useHandCursor: true });
      else it.sprite.disableInteractive();
      it.label.setVisible(showFish);
    }
    selectedDecor = null;
    selectedTerrain = null;
    selectedFish = null;
    hud.setText(hudText());
  }

  // ---------------------------------------------------------------------------
  // Zoom: scale all visible items
  // ---------------------------------------------------------------------------
  function applyZoom(): void {
    for (const it of decorItems) {
      it.sprite.setScale((decorScale[it.decoId] ?? 1) * zoom);
      refreshDecorLabel(it);
    }
    for (const it of terrainItems) {
      it.sprite.setScale(it.entry.scale * zoom);
      refreshTerrainLabel(it);
    }
    for (const it of fishItems) {
      const scale = fishScale[it.speciesId] ?? 1;
      it.sprite.setScale(scale * CONSTANTS.RENDER_SCALE_MULTIPLIER * zoom);
      refreshFishLabel(it);
    }
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  function persist(): void {
    const state: SavedState = {
      contentScale: Number(zoom.toFixed(3)),
      slots: {},
      decorScale: {},
      terrainAll: [],
      fishScale: {},
    };
    for (const slot of DECORATION_SLOTS) {
      const pos = slotPos[slot.id];
      if (pos) state.slots[slot.id] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    }
    for (const [id, s] of Object.entries(decorScale)) {
      state.decorScale[id] = Number(s.toFixed(2));
    }
    for (const rockId of TERRAIN_ROCKS) {
      const e = terrainMap[rockId];
      if (e) {
        state.terrainAll.push({
          rockId: e.rockId,
          x: Math.round(e.x),
          y: Math.round(e.y),
          scale: Number(e.scale.toFixed(2)),
          band: e.band,
          included: e.included,
        });
      }
    }
    for (const [id, s] of Object.entries(fishScale)) {
      state.fishScale[id] = Number(s.toFixed(2));
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private-mode failures */
    }
  }

  // ---------------------------------------------------------------------------
  // DUMP
  // ---------------------------------------------------------------------------
  function buildDump(): string {
    const slots: Record<string, { x: number; y: number }> = {};
    for (const slot of DECORATION_SLOTS) {
      const pos = slotPos[slot.id];
      if (pos) slots[slot.id] = { x: Math.round(pos.x), y: Math.round(pos.y) };
    }
    const decoScaleDump: Record<string, number> = {};
    for (const [id, s] of Object.entries(decorScale)) {
      decoScaleDump[id] = Number(s.toFixed(2));
    }
    const terrain = TERRAIN_ROCKS.flatMap((rockId) => {
      const e = terrainMap[rockId];
      if (!e || !e.included) return [];
      return [{ rockId: e.rockId, x: Math.round(e.x), y: Math.round(e.y), scale: Number(e.scale.toFixed(2)), band: e.band }];
    });
    const fishScaleDump: Record<string, number> = {};
    for (const [id, s] of Object.entries(fishScale)) {
      fishScaleDump[id] = Number(s.toFixed(2));
    }
    return JSON.stringify(
      { contentScale: Number(zoom.toFixed(2)), slots, decorScale: decoScaleDump, terrain, fishScale: fishScaleDump },
      null,
      2,
    );
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  function hudText(): string {
    let selLine = 'none';
    if (mode === 'decor' && selectedDecor) {
      const it = selectedDecor;
      const slot = DECORATION_SLOTS.find((s) => s.id === it.slotId);
      const tierStr = slot ? `tier ${it.tierIdx + 1}/${slot.tiers.length}` : '';
      selLine = `${it.slotId} (${it.decoId}) ${tierStr} @ ${Math.round(it.sprite.x)},${Math.round(it.sprite.y)} ${(decorScale[it.decoId] ?? 1).toFixed(2)}x`;
    } else if (mode === 'terrain' && selectedTerrain) {
      const e = selectedTerrain.entry;
      selLine = `${e.rockId} band:${e.band} ${e.included ? 'included' : 'excluded'} @ ${Math.round(e.x)},${Math.round(e.y)} ${e.scale.toFixed(2)}x`;
    } else if (mode === 'fish' && selectedFish) {
      const scale = fishScale[selectedFish.speciesId] ?? 1;
      selLine = `${selectedFish.speciesId} ${scale.toFixed(2)}x`;
    }

    const keys = mode === 'decor'
      ? 'm=mode  t=tier  [/]=zoom  drag=move  wheel=scale'
      : mode === 'terrain'
        ? 'm=mode  b=band  x=include  [/]=zoom  drag=move  wheel=scale'
        : 'm=mode  [/]=zoom  click=select  wheel=scale';

    return [
      `MODE: ${mode.toUpperCase()}  zoom:${zoom.toFixed(2)}`,
      keys,
      `Selected: ${selLine}`,
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

  // Initial visibility (mode starts 'decor': slots editable, included terrain as backdrop).
  applyModeVisibility();

  // ---------------------------------------------------------------------------
  // Input handlers
  // ---------------------------------------------------------------------------

  // Drag: move decor or terrain sprites
  const onDrag = (
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.GameObject,
    dragX: number,
    _dragY: number,
  ): void => {
    const decorItem = decorItems.find((i) => i.sprite === obj);
    if (decorItem) {
      const snapX = Math.round(dragX);
      const snapY = substrateHeightAt(snapX);
      decorItem.sprite.setPosition(snapX, snapY);
      slotPos[decorItem.slotId] = { x: snapX, y: snapY };
      refreshDecorLabel(decorItem);
      if (selectedDecor === decorItem) hud.setText(hudText());
      persist();
      return;
    }
    const terrainItem = terrainItems.find((i) => i.sprite === obj);
    if (terrainItem) {
      const snapX = Math.round(dragX);
      const snapY = substrateHeightAt(snapX);
      terrainItem.sprite.setPosition(snapX, snapY);
      terrainItem.entry.x = snapX;
      terrainItem.entry.y = snapY;
      refreshTerrainLabel(terrainItem);
      if (selectedTerrain === terrainItem) hud.setText(hudText());
      persist();
    }
  };

  // Click: select
  const onObjDown = (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject): void => {
    const decorItem = decorItems.find((i) => i.sprite === obj);
    if (decorItem) {
      selectedDecor = decorItem;
      hud.setText(hudText());
      return;
    }
    const terrainItem = terrainItems.find((i) => i.sprite === obj);
    if (terrainItem) {
      selectedTerrain = terrainItem;
      hud.setText(hudText());
      return;
    }
    const fishItem = fishItems.find((i) => i.sprite === obj);
    if (fishItem) {
      selectedFish = fishItem;
      hud.setText(hudText());
    }
  };

  // Wheel: scale selected item
  const onWheel = (
    _p: Phaser.Input.Pointer,
    _objs: unknown,
    _dx: number,
    dy: number,
  ): void => {
    const delta = dy < 0 ? SCALE_STEP : -SCALE_STEP;

    if (mode === 'decor' && selectedDecor) {
      const it = selectedDecor;
      const cur = decorScale[it.decoId] ?? 1;
      decorScale[it.decoId] = clamp(cur + delta, MIN_SCALE, MAX_SCALE);
      it.sprite.setScale(decorScale[it.decoId]! * zoom);
      refreshDecorLabel(it);
      hud.setText(hudText());
      persist();
    } else if (mode === 'terrain' && selectedTerrain) {
      const it = selectedTerrain;
      it.entry.scale = clamp(it.entry.scale + delta, MIN_SCALE, MAX_SCALE);
      it.sprite.setScale(it.entry.scale * zoom);
      refreshTerrainLabel(it);
      hud.setText(hudText());
      persist();
    } else if (mode === 'fish' && selectedFish) {
      const it = selectedFish;
      const cur = fishScale[it.speciesId] ?? 1;
      fishScale[it.speciesId] = clamp(cur + delta, MIN_SCALE, MAX_SCALE);
      it.sprite.setScale(fishScale[it.speciesId]! * CONSTANTS.RENDER_SCALE_MULTIPLIER * zoom);
      refreshFishLabel(it);
      hud.setText(hudText());
      persist();
    }
  };

  // Keyboard
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '[') {
      zoom = clamp(zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
      applyZoom();
      hud.setText(hudText());
      persist();
    } else if (e.key === ']') {
      zoom = clamp(zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
      applyZoom();
      hud.setText(hudText());
      persist();
    } else if (e.key === 'm' || e.key === 'M') {
      const idx = MODES.indexOf(mode);
      mode = MODES[(idx + 1) % MODES.length]!;
      applyModeVisibility();
      // applyModeVisibility updates hud internally
    } else if ((e.key === 't' || e.key === 'T') && mode === 'decor' && selectedDecor) {
      const it = selectedDecor;
      const slot = DECORATION_SLOTS.find((s) => s.id === it.slotId);
      if (slot && slot.tiers.length > 1) {
        it.tierIdx = (it.tierIdx + 1) % slot.tiers.length;
        it.decoId = slot.tiers[it.tierIdx]!;
        const scale = decorScale[it.decoId] ?? DECORATION_BY_ID.get(it.decoId)?.renderScale ?? 3;
        decorScale[it.decoId] = scale;
        it.sprite.setTexture(it.decoId).setScale(scale * zoom);
        refreshDecorLabel(it);
        hud.setText(hudText());
      }
    } else if ((e.key === 'b' || e.key === 'B') && mode === 'terrain' && selectedTerrain) {
      const it = selectedTerrain;
      it.entry.band = it.entry.band === 'back' ? 'front' : 'back';
      if (it.entry.band === 'back') {
        it.sprite.setTint(0x8b9bad);
      } else {
        it.sprite.clearTint();
      }
      refreshTerrainLabel(it);
      hud.setText(hudText());
      persist();
    } else if ((e.key === 'x' || e.key === 'X') && mode === 'terrain' && selectedTerrain) {
      const it = selectedTerrain;
      it.entry.included = !it.entry.included;
      it.sprite.setAlpha(it.entry.included ? 1 : 0.25);
      refreshTerrainLabel(it);
      hud.setText(hudText());
      persist();
    }
  };

  scene.input.on('drag', onDrag);
  scene.input.on('gameobjectdown', onObjDown);
  scene.input.on('wheel', onWheel);
  scene.input.keyboard?.on('keydown', onKey);

  // ---------------------------------------------------------------------------
  // Buttons
  // ---------------------------------------------------------------------------
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
    const json = buildDump();
    // eslint-disable-next-line no-console
    console.log('[layout-dump]\n' + json);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
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
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    window.location.reload();
  });

  // ---------------------------------------------------------------------------
  // Floor reference line - polyline along the substrate curve
  // ---------------------------------------------------------------------------
  const floorLine = scene.add.graphics().setDepth(5);
  floorLine.lineStyle(1, 0xffffff, 0.4);
  const subPts = substrateTopPoints(CONSTANTS.CANVAS_WIDTH);
  for (let i = 1; i < subPts.length; i++) {
    floorLine.lineBetween(
      subPts[i - 1]!.x, subPts[i - 1]!.y,
      subPts[i]!.x, subPts[i]!.y,
    );
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------
  return {
    destroy() {
      scene.input.off('drag', onDrag);
      scene.input.off('gameobjectdown', onObjDown);
      scene.input.off('wheel', onWheel);
      scene.input.keyboard?.off('keydown', onKey);
      for (const it of decorItems) { it.sprite.destroy(); it.label.destroy(); }
      for (const it of terrainItems) { it.sprite.destroy(); it.label.destroy(); }
      for (const it of fishItems) { it.sprite.destroy(); it.label.destroy(); }
      hud.destroy();
      dumpBtn.destroy();
      resetBtn.destroy();
      floorLine.destroy();
    },
  };
}
