import type Phaser from 'phaser';
import type { SaveStateV2 } from '../types/Save.js';
import { BIOMES } from '../data/biomes.js';
import { FISH_SPECIES } from '../data/fish.js';
import { DECORATIONS } from '../data/decorations.js';
import { CONSTANTS } from '../data/constants.js';
import { fishCost } from '../util/fishCost.js';
import { formatCoins } from '../util/formatCoins.js';
import { purchaseFish } from '../sim/PurchaseFish.js';
import { purchaseDecoration } from '../sim/PurchaseDecoration.js';
import { isBiomeUnlocked } from '../util/biomeUnlock.js';

/** Shop mode: fish list vs decoration list (per-biome Fish/Decor toggle). */
export type ShopMode = 'fish' | 'decor';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const LEDGER_X = 0;
const LEDGER_Y = CONSTANTS.LEDGER_Y;       // 480
const LEDGER_W = CONSTANTS.CANVAS_WIDTH;   // 450
const LEDGER_H = CONSTANTS.LEDGER_HEIGHT;  // 320
const TAB_H = 44;
const TAB_W = LEDGER_W / BIOMES.length;    // 150 for 3 biomes
const TOGGLE_H = 30;                       // Fish/Decor toggle strip below the tabs

const LIST_Y = LEDGER_Y + TAB_H + TOGGLE_H; // 554
const LIST_H = LEDGER_H - TAB_H - TOGGLE_H; // 246 (visible viewport for scroll)
const ROW_H = 64;
const ROW_W = LEDGER_W - 20;              // 430

const PANEL_DEPTH = 50; // above floaters (50), below toast (150)
const BG_COLOR = 0x0a1a2e;
// Flat-fill color for unowned species - applied with setTintFill so the whole
// shape becomes one solid color (a true silhouette), hiding the real fish.
const SILHOUETTE_TINT = 0x000000;

// ---------------------------------------------------------------------------
// Exported pure helpers (unit-testable without Phaser)
// ---------------------------------------------------------------------------

export interface RowData {
  speciesId: string;
  cost: number;
}

/**
 * Returns the ordered list of rows for a biome - one entry per species in
 * the biome's fishSpeciesIds array. Returns an empty array for unknown biomes.
 */
export function rowsForBiome(biomeId: string): RowData[] {
  const biome = BIOMES.find((b) => b.id === biomeId);
  if (!biome) return [];
  return biome.fishSpeciesIds.map((speciesId) => {
    const species = FISH_SPECIES.find((s) => s.id === speciesId);
    return { speciesId, cost: species ? fishCost(species) : Infinity };
  });
}

/**
 * Rows for the Decor tab - one entry per decoration. Decorations are a single
 * global catalog (DECORATIONS); ownership is tracked per-biome in the save, so
 * the same catalog is shown for every biome and the BUY targets the active biome.
 * `speciesId` here is the decoration id (RowData is shared between fish and decor).
 */
export function rowsForDecorations(): RowData[] {
  return DECORATIONS.map((d) => ({ speciesId: d.id, cost: d.cost }));
}

/**
 * Returns true when a biome's tab can be selected - i.e. the biome is
 * unlocked at the given lifetime-earned total.
 */
export function isTabSelectable(biomeId: string, lifetimeEarned: number): boolean {
  return isBiomeUnlocked(biomeId, lifetimeEarned);
}

/**
 * Row label text. Unowned species (count 0) stay a mystery - shown as "???"
 * with no name or count. Once owned, the real name and count are revealed.
 */
export function rowLabel(speciesName: string, count: number): string {
  return count > 0 ? `${speciesName}  x${count}` : '???';
}

/**
 * Clamp a scroll offset so the content never overscrolls in either direction.
 *
 * @param offsetY     Current scroll offset (negative = scrolled down).
 * @param contentHeight  Total height of the scrollable content.
 * @param viewHeight     Visible height of the viewport.
 * @returns Clamped offset in the range [-(contentHeight - viewHeight), 0].
 *          If content fits inside the view entirely, always returns 0.
 */
export function clampScroll(offsetY: number, contentHeight: number, viewHeight: number): number {
  const minY = Math.min(0, viewHeight - contentHeight); // <= 0
  return Math.max(minY, Math.min(0, offsetY));
}

// ---------------------------------------------------------------------------
// Ledger interface
// ---------------------------------------------------------------------------

export interface Ledger {
  /** Re-render tabs + species list for this biome. */
  showBiome(biomeId: string): void;
  /** Per-frame: refresh counts, affordability colors, tab lock states. */
  update(): void;
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface RowUI {
  container: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Image;
  countText: Phaser.GameObjects.Text;
  buyBtn: Phaser.GameObjects.Text;
  speciesId: string;
  speciesName: string;
  cost: number;
  lastAffordable: boolean | null;
  lastCount: number;
  /** True for decoration rows (BUY -> purchaseDecoration, Owned state, no mystery). */
  isDecor: boolean;
  /** Decor only: last-seen ownership in the active biome (drives BUY <-> Owned). */
  lastOwned: boolean | null;
}

interface TabUI {
  biomeId: string;
  label: Phaser.GameObjects.Text;
  lastLocked: boolean | null;
  lastActive: boolean | null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createLedger(
  scene: Phaser.Scene,
  getState: () => SaveStateV2,
  onSelectBiome: (biomeId: string) => void,
  initialBiomeId: string,
): Ledger {
  // -------------------------------------------------------------------------
  // Root container - depth above HUD (100) so ledger sits on top of diorama UI
  // -------------------------------------------------------------------------
  const root = scene.add.container(0, 0).setDepth(PANEL_DEPTH);

  // -------------------------------------------------------------------------
  // Opaque background - covers entire ledger region so canvas clear color
  // never shows through
  // -------------------------------------------------------------------------
  const bg = scene.add.rectangle(
    LEDGER_X + LEDGER_W / 2,
    LEDGER_Y + LEDGER_H / 2,
    LEDGER_W,
    LEDGER_H,
    BG_COLOR,
  );
  root.add(bg);

  // -------------------------------------------------------------------------
  // Tab row
  // -------------------------------------------------------------------------
  const tabUIs: TabUI[] = BIOMES.map((biome, idx) => {
    const tabCenterX = LEDGER_X + TAB_W * idx + TAB_W / 2;
    const tabCenterY = LEDGER_Y + TAB_H / 2;

    const label = scene.add
      .text(tabCenterX, tabCenterY, biome.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#222222',
        padding: { x: 6, y: 6 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    label.on('pointerdown', () => {
      if (!isBiomeUnlocked(biome.id, getState().lifetimeEarned)) return;
      onSelectBiome(biome.id);
    });

    root.add(label);
    return { biomeId: biome.id, label, lastLocked: null, lastActive: null };
  });

  // -------------------------------------------------------------------------
  // Species list - scrollable container with geometry mask
  // -------------------------------------------------------------------------

  // The scroll container holds all rows; its y offset changes on drag
  let scrollContainer: Phaser.GameObjects.Container | null = null;
  let scrollMask: Phaser.Display.Masks.GeometryMask | null = null;
  let maskGraphics: Phaser.GameObjects.Graphics | null = null;
  let rowUIs: RowUI[] = [];
  let activeBiomeId: string = initialBiomeId;
  let mode: ShopMode = 'fish';

  // Drag-scroll state
  let dragStartY = 0;
  let dragStartScrollY = 0;
  let isDragging = false;

  // Hoisted refs so teardown can remove precisely the registered handlers
  let hitZone: Phaser.GameObjects.Rectangle | null = null;
  let onPointerMove: ((ptr: Phaser.Input.Pointer) => void) | null = null;
  let onPointerUp: (() => void) | null = null;
  let onWheel: ((ptr: Phaser.Input.Pointer, objs: unknown, dx: number, dy: number) => void) | null = null;

  // -------------------------------------------------------------------------
  // Fish/Decor toggle strip (between the tabs and the list). Switches which
  // catalog the list shows for the current biome.
  // -------------------------------------------------------------------------
  const TOGGLE_DEFS: { mode: ShopMode; label: string }[] = [
    { mode: 'fish', label: 'Fish' },
    { mode: 'decor', label: 'Decor' },
  ];
  const toggleUIs = TOGGLE_DEFS.map((def, idx) => {
    const cx = LEDGER_X + (LEDGER_W / 2) * idx + LEDGER_W / 4;
    const cy = LEDGER_Y + TAB_H + TOGGLE_H / 2;
    const btn = scene.add
      .text(cx, cy, def.label, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 2,
        backgroundColor: '#333333',
        padding: { x: 12, y: 3 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      if (mode === def.mode) return;
      mode = def.mode;
      buildRows(activeBiomeId);
      refreshToggle();
    });
    root.add(btn);
    return { mode: def.mode, btn };
  });

  function refreshToggle(): void {
    for (const t of toggleUIs) {
      const active = t.mode === mode;
      t.btn.setColor(active ? '#ffffff' : '#bbbbbb');
      t.btn.setBackgroundColor(active ? '#2e7d32' : '#333333');
    }
  }

  function buildRows(biomeId: string): void {
    // Tear down previous listeners and hitZone before creating new ones
    if (hitZone) {
      hitZone.destroy();
      hitZone = null;
    }
    if (onPointerMove) {
      scene.input.off('pointermove', onPointerMove);
      onPointerMove = null;
    }
    if (onPointerUp) {
      scene.input.off('pointerup', onPointerUp);
      onPointerUp = null;
    }
    if (onWheel) {
      scene.input.off('wheel', onWheel);
      onWheel = null;
    }

    // Tear down previous rows + mask
    if (scrollContainer) {
      scrollContainer.destroy();
      scrollContainer = null;
    }
    if (maskGraphics) {
      maskGraphics.destroy();
      maskGraphics = null;
    }
    scrollMask = null;
    rowUIs = [];

    const rows = mode === 'fish' ? rowsForBiome(biomeId) : rowsForDecorations();
    const contentHeight = rows.length * ROW_H;

    // Drag-scroll hit-zone FIRST, behind the rows. Phaser input is topOnly, so
    // if this transparent zone sat above the rows it would swallow every BUY
    // tap. Rows + BUY buttons are added after, so they hit-test on top of it;
    // taps on empty row area fall through to this zone for dragging.
    hitZone = scene.add
      .rectangle(LEDGER_X + LEDGER_W / 2, LIST_Y + LIST_H / 2, LEDGER_W, LIST_H, 0x000000, 0)
      .setInteractive();
    root.add(hitZone);

    // Container anchored at top-left of the list region; rows use local coords
    scrollContainer = scene.add.container(LEDGER_X, LIST_Y);
    root.add(scrollContainer);

    // Mask: clip to visible list region
    maskGraphics = scene.add.graphics();
    maskGraphics.fillRect(LEDGER_X, LIST_Y, LEDGER_W, LIST_H);
    scrollMask = maskGraphics.createGeometryMask();
    scrollContainer.setMask(scrollMask);

    hitZone.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      isDragging = true;
      dragStartY = ptr.y;
      dragStartScrollY = scrollContainer ? scrollContainer.y - LIST_Y : 0;
    });

    onPointerMove = (ptr: Phaser.Input.Pointer) => {
      if (!isDragging || !scrollContainer) return;
      const delta = ptr.y - dragStartY;
      const raw = dragStartScrollY + delta;
      scrollContainer.y = LIST_Y + clampScroll(raw, contentHeight, LIST_H);
    };

    onPointerUp = () => {
      isDragging = false;
    };

    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);

    // Mouse-wheel / trackpad scroll when the pointer is over the list region.
    onWheel = (ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      if (!scrollContainer) return;
      if (ptr.y < LIST_Y || ptr.y > LIST_Y + LIST_H) return;
      const current = scrollContainer.y - LIST_Y;
      scrollContainer.y = LIST_Y + clampScroll(current - dy, contentHeight, LIST_H);
    };
    scene.input.on('wheel', onWheel);

    // Build row game objects
    const isDecor = mode === 'decor';
    rows.forEach((row, idx) => {
      // Resolve the catalog entry for this row (fish or decoration).
      const species = isDecor ? undefined : FISH_SPECIES.find((s) => s.id === row.speciesId);
      const deco = isDecor ? DECORATIONS.find((d) => d.id === row.speciesId) : undefined;
      if (!isDecor && !species) return;
      if (isDecor && !deco) return;
      const displayName = isDecor ? deco!.name : species!.name;

      // Row y in local (scrollContainer) coordinates - scrollContainer.y starts at LIST_Y,
      // so local origin is at LIST_Y; row top = idx * ROW_H
      const rowLocalY = idx * ROW_H;

      const rowContainer = scene.add.container(0, 0);

      // Row background
      const rowBg = scene.add.rectangle(
        LEDGER_X + ROW_W / 2 + 10,
        rowLocalY + ROW_H / 2,
        ROW_W,
        ROW_H - 4,
        0x0d2040,
      );
      rowBg.setStrokeStyle(1, 0x224466);
      rowContainer.add(rowBg);

      // Ownership: fish use count > 0 (silhouette + "???" until bought); decor use
      // the per-biome decorations[] list and are shown by name immediately.
      const state = getState();
      const tank = state.tanks[biomeId];
      const count = isDecor ? 0 : (tank?.fishCounts[row.speciesId] ?? 0);
      const owned = isDecor ? (tank?.decorations.includes(row.speciesId) ?? false) : count > 0;

      // Icon. Fish: native scale * 1.5, silhouetted while unowned. Decor: scaled to
      // fit a ~40px slot (decoration art ranges 16-80px native), shown normally.
      const icon = scene.add.image(LEDGER_X + 36, rowLocalY + ROW_H / 2, row.speciesId);
      if (isDecor) {
        icon.setScale(40 / Math.max(icon.width, icon.height));
      } else {
        icon.setScale(species!.scale * 1.5);
        if (!owned) icon.setTintFill(SILHOUETTE_TINT);
      }
      rowContainer.add(icon);

      // Name (+ count for fish). Decor shows its name; "???" never applies.
      const countText = scene.add
        .text(
          LEDGER_X + 72,
          rowLocalY + ROW_H / 2 - 10,
          isDecor ? displayName : rowLabel(displayName, count),
          {
            fontSize: '13px',
            color: '#ffffff',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 2,
          },
        )
        .setOrigin(0, 0.5);
      rowContainer.add(countText);

      // Cost text
      const costText = scene.add
        .text(LEDGER_X + 72, rowLocalY + ROW_H / 2 + 10, `${formatCoins(row.cost)} c`, {
          fontSize: '11px',
          color: '#ffe066',
          fontFamily: 'monospace',
        })
        .setOrigin(0, 0.5);
      rowContainer.add(costText);

      // BUY / Owned button. An already-owned decoration shows a non-interactive
      // "Owned" chip; everything else shows BUY colored by affordability.
      const canAfford = state.coinBalance >= row.cost;
      const showOwned = isDecor && owned;
      const buyBtn = scene.add
        .text(LEDGER_X + ROW_W - 10, rowLocalY + ROW_H / 2, showOwned ? 'Owned' : 'BUY', {
          fontSize: '14px',
          color: showOwned ? '#9ccc9c' : canAfford ? '#ffffff' : '#777777',
          fontFamily: 'monospace',
          backgroundColor: showOwned ? '#2a2a2a' : canAfford ? '#2e7d32' : '#3a3a3a',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(1, 0.5);
      if (!showOwned) buyBtn.setInteractive({ useHandCursor: true });

      buyBtn.on('pointerdown', () => {
        // Reject taps on buttons scrolled outside the visible list viewport.
        // Geometry masks clip visuals only - Phaser does not clip input.
        const rowAbsoluteY = (scrollContainer ? scrollContainer.y : LIST_Y) + rowLocalY + ROW_H / 2;
        // LIST_Y already includes the tab + toggle rows; do not add them again.
        if (rowAbsoluteY < LIST_Y || rowAbsoluteY > LIST_Y + LIST_H) return;

        if (isDecor) {
          const result = purchaseDecoration(row.speciesId, activeBiomeId);
          if (!result.success && import.meta.env?.DEV) {
            console.log('[ledger] decor buy failed:', result.reason);
          }
        } else {
          const result = purchaseFish(row.speciesId);
          if (!result.success && import.meta.env?.DEV) {
            console.log('[ledger] buy failed:', result.reason);
          }
        }
      });

      rowContainer.add(buyBtn);
      scrollContainer!.add(rowContainer);

      rowUIs.push({
        container: rowContainer,
        icon,
        countText,
        buyBtn,
        speciesId: row.speciesId,
        speciesName: displayName,
        cost: row.cost,
        lastAffordable: canAfford,
        lastCount: count,
        isDecor,
        lastOwned: isDecor ? owned : null,
      });
    });
  }

  function refreshTabs(): void {
    const lifetime = getState().lifetimeEarned;
    for (const tab of tabUIs) {
      const locked = !isBiomeUnlocked(tab.biomeId, lifetime);
      const active = tab.biomeId === activeBiomeId;

      // Only update when state actually changes to avoid churn
      if (tab.lastLocked === locked && tab.lastActive === active) continue;
      tab.lastLocked = locked;
      tab.lastActive = active;

      if (locked) {
        tab.label.setColor('#666666');
        tab.label.setBackgroundColor('#1a1a1a');
        // Append lock glyph only if not already present
        const biome = BIOMES.find((b) => b.id === tab.biomeId)!;
        const lockSuffix = ' [lock]';
        if (!tab.label.text.endsWith(lockSuffix)) {
          tab.label.setText(biome.name + lockSuffix);
        }
      } else {
        // Clear lock glyph
        const biome = BIOMES.find((b) => b.id === tab.biomeId)!;
        if (tab.label.text !== biome.name) {
          tab.label.setText(biome.name);
        }
        if (active) {
          tab.label.setColor('#ffffff');
          tab.label.setBackgroundColor('#2e7d32');
        } else {
          tab.label.setColor('#dddddd');
          tab.label.setBackgroundColor('#333333');
        }
      }
    }
  }

  function refreshRows(): void {
    if (rowUIs.length === 0) return;
    const state = getState();
    const balance = state.coinBalance;
    const tank = state.tanks[activeBiomeId];

    for (const row of rowUIs) {
      if (row.isDecor) {
        // Decor: flip BUY -> Owned once bought in the active biome (no selling,
        // so it never flips back). Affordability color applies only while buyable.
        const nowOwned = tank?.decorations.includes(row.speciesId) ?? false;
        if (nowOwned !== row.lastOwned) {
          row.lastOwned = nowOwned;
          if (nowOwned) {
            row.buyBtn.setText('Owned');
            row.buyBtn.setColor('#9ccc9c');
            row.buyBtn.setBackgroundColor('#2a2a2a');
            row.buyBtn.disableInteractive();
          }
        }
        if (!nowOwned) {
          const canAfford = balance >= row.cost;
          if (canAfford !== row.lastAffordable) {
            row.lastAffordable = canAfford;
            row.buyBtn.setColor(canAfford ? '#ffffff' : '#777777');
            row.buyBtn.setBackgroundColor(canAfford ? '#2e7d32' : '#3a3a3a');
          }
        }
        continue;
      }

      const newCount = tank?.fishCounts[row.speciesId] ?? 0;
      if (newCount !== row.lastCount) {
        const wasOwned = row.lastCount > 0;
        const nowOwned = newCount > 0;
        row.lastCount = newCount;
        row.countText.setText(rowLabel(row.speciesName, newCount));
        // Reveal on first purchase (silhouette -> real sprite); re-hide if it
        // ever returns to 0 (no selling today, but kept consistent).
        if (nowOwned !== wasOwned) {
          if (nowOwned) row.icon.clearTint();
          else row.icon.setTintFill(SILHOUETTE_TINT);
        }
      }

      const canAfford = balance >= row.cost;
      if (canAfford === row.lastAffordable) continue;
      row.lastAffordable = canAfford;
      if (canAfford) {
        row.buyBtn.setColor('#ffffff');
        row.buyBtn.setBackgroundColor('#2e7d32');
      } else {
        row.buyBtn.setColor('#777777');
        row.buyBtn.setBackgroundColor('#3a3a3a');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Initial render
  // -------------------------------------------------------------------------
  buildRows(initialBiomeId);
  refreshTabs();
  refreshToggle();

  // -------------------------------------------------------------------------
  // Return the Ledger interface
  // -------------------------------------------------------------------------
  return {
    showBiome(biomeId: string): void {
      activeBiomeId = biomeId;
      buildRows(biomeId);
      refreshTabs();
      // Reset scroll to top
      if (scrollContainer) {
        scrollContainer.y = LIST_Y;
      }
    },

    update(): void {
      refreshTabs();
      refreshRows();
    },

    destroy(): void {
      if (hitZone) { hitZone.destroy(); hitZone = null; }
      if (onPointerMove) { scene.input.off('pointermove', onPointerMove); onPointerMove = null; }
      if (onPointerUp) { scene.input.off('pointerup', onPointerUp); onPointerUp = null; }
      if (onWheel) { scene.input.off('wheel', onWheel); onWheel = null; }
      if (maskGraphics) maskGraphics.destroy();
      root.destroy(true);
    },
  };
}
