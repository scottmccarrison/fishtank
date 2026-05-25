import type Phaser from 'phaser';
import type { SaveStateV2 } from '../types/Save.js';
import { BIOMES } from '../data/biomes.js';
import { FISH_SPECIES } from '../data/fish.js';
import { DECORATION_BY_ID } from '../data/decorations.js';
import { DECORATION_SLOTS } from '../data/decorationSlots.js';
import { CONSTANTS } from '../data/constants.js';
import { fishCost } from '../util/fishCost.js';
import { formatCoins } from '../util/formatCoins.js';
import { purchaseFish } from '../sim/PurchaseFish.js';
import { upgradeSlot } from '../sim/UpgradeSlot.js';
import { isBiomeUnlocked } from '../util/biomeUnlock.js';

/** Shop mode: fish list vs decoration slot list (per-biome Fish/Decor toggle). */
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

export interface SlotRowData {
  slotId: string;
  name: string;
  tierCount: number;
  tierCosts: number[];
}

/**
 * Returns one row per decoration slot (6 total) for the Decor tab.
 * tierCosts[i] = cost to upgrade into tier i+1 (i.e. the cost of tiers[i]).
 */
export function rowsForSlots(): SlotRowData[] {
  return DECORATION_SLOTS.map((slot) => ({
    slotId: slot.id,
    name: slot.name,
    tierCount: slot.tiers.length,
    tierCosts: slot.tiers.map((decoId) => DECORATION_BY_ID.get(decoId)!.cost),
  }));
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
  /** True for decoration slot rows (UPGRADE -> upgradeSlot; Owned state handled per-slot). */
  isDecor: boolean;
  /** Slot rows only: the slot id this row represents. */
  slotId?: string;
  /** Slot rows only: all tier costs for this slot. */
  tierCosts?: number[];
  /** Slot rows only: total number of tiers. */
  tierCount?: number;
  /** Slot rows only: last-seen tier for this slot in the active biome (drives icon/label/button). */
  lastTier?: number;
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

    const isDecor = mode === 'decor';
    const slotRows = isDecor ? rowsForSlots() : null;
    const fishRows = isDecor ? null : rowsForBiome(biomeId);
    const rowCount = isDecor ? slotRows!.length : fishRows!.length;
    const contentHeight = rowCount * ROW_H;

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

    if (isDecor) {
      // -----------------------------------------------------------------------
      // Decor mode: 6 slot UPGRADE rows
      // -----------------------------------------------------------------------
      const state = getState();
      slotRows!.forEach((slotRow, idx) => {
        const rowLocalY = idx * ROW_H;
        const currentTier = state.tanks[biomeId]?.slotTiers?.[slotRow.slotId] ?? 0;
        const isMaxed = currentTier >= slotRow.tierCount;
        const upgradeCost = isMaxed ? 0 : slotRow.tierCosts[currentTier]!;
        const canAfford = !isMaxed && state.coinBalance >= upgradeCost;

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

        // Icon: current tier's decoration sprite, or dim placeholder at tier 0.
        const iconKey = currentTier > 0
          ? DECORATION_SLOTS.find((s) => s.id === slotRow.slotId)!.tiers[currentTier - 1]!
          : DECORATION_SLOTS.find((s) => s.id === slotRow.slotId)!.tiers[0]!;
        const icon = scene.add.image(LEDGER_X + 36, rowLocalY + ROW_H / 2, iconKey);
        icon.setScale(40 / Math.max(icon.width || 1, icon.height || 1));
        if (currentTier === 0) {
          icon.setTintFill(SILHOUETTE_TINT);
          icon.setAlpha(0.4);
        }
        rowContainer.add(icon);

        // Label: "SlotName  tier/max"
        const countText = scene.add
          .text(
            LEDGER_X + 72,
            rowLocalY + ROW_H / 2 - 10,
            `${slotRow.name}  ${currentTier}/${slotRow.tierCount}`,
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

        // Cost text (shows next tier cost or blank when maxed)
        const costText = scene.add
          .text(
            LEDGER_X + 72,
            rowLocalY + ROW_H / 2 + 10,
            isMaxed ? '' : `${formatCoins(upgradeCost)} c`,
            {
              fontSize: '11px',
              color: '#ffe066',
              fontFamily: 'monospace',
            },
          )
          .setOrigin(0, 0.5);
        rowContainer.add(costText);

        // UPGRADE / MAX button
        const btnLabel = isMaxed ? 'MAX' : `UPGRADE  ${formatCoins(upgradeCost)}c`;
        const buyBtn = scene.add
          .text(LEDGER_X + ROW_W - 10, rowLocalY + ROW_H / 2, btnLabel, {
            fontSize: '13px',
            color: isMaxed ? '#9ccc9c' : canAfford ? '#ffffff' : '#777777',
            fontFamily: 'monospace',
            backgroundColor: isMaxed ? '#2a2a2a' : canAfford ? '#2e7d32' : '#3a3a3a',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(1, 0.5);
        if (!isMaxed) buyBtn.setInteractive({ useHandCursor: true });

        buyBtn.on('pointerdown', () => {
          // Reject taps on buttons scrolled outside the visible list viewport.
          const rowAbsoluteY = (scrollContainer ? scrollContainer.y : LIST_Y) + rowLocalY + ROW_H / 2;
          if (rowAbsoluteY < LIST_Y || rowAbsoluteY > LIST_Y + LIST_H) return;

          const result = upgradeSlot(slotRow.slotId, activeBiomeId);
          if (!result.success && import.meta.env?.DEV) {
            console.log('[ledger] slot upgrade failed:', result.reason);
          }
        });

        rowContainer.add(buyBtn);
        scrollContainer!.add(rowContainer);

        rowUIs.push({
          container: rowContainer,
          icon,
          countText,
          buyBtn,
          speciesId: slotRow.slotId,
          speciesName: slotRow.name,
          cost: upgradeCost,
          lastAffordable: canAfford,
          lastCount: 0,
          isDecor: true,
          slotId: slotRow.slotId,
          tierCosts: slotRow.tierCosts,
          tierCount: slotRow.tierCount,
          lastTier: currentTier,
        });
      });
    } else {
      // -----------------------------------------------------------------------
      // Fish mode: one row per species (unchanged from before)
      // -----------------------------------------------------------------------
      fishRows!.forEach((row, idx) => {
        const species = FISH_SPECIES.find((s) => s.id === row.speciesId);
        if (!species) return;

        const rowLocalY = idx * ROW_H;
        const state = getState();
        const tank = state.tanks[biomeId];
        const count = tank?.fishCounts[row.speciesId] ?? 0;
        const owned = count > 0;

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

        // Icon: native scale * 1.5, silhouetted while unowned
        const icon = scene.add.image(LEDGER_X + 36, rowLocalY + ROW_H / 2, row.speciesId);
        icon.setScale(species.scale * 1.5);
        if (!owned) icon.setTintFill(SILHOUETTE_TINT);
        rowContainer.add(icon);

        // Name + count ("???" while unowned)
        const countText = scene.add
          .text(
            LEDGER_X + 72,
            rowLocalY + ROW_H / 2 - 10,
            rowLabel(species.name, count),
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

        const canAfford = state.coinBalance >= row.cost;
        const buyBtn = scene.add
          .text(LEDGER_X + ROW_W - 10, rowLocalY + ROW_H / 2, 'BUY', {
            fontSize: '14px',
            color: canAfford ? '#ffffff' : '#777777',
            fontFamily: 'monospace',
            backgroundColor: canAfford ? '#2e7d32' : '#3a3a3a',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(1, 0.5)
          .setInteractive({ useHandCursor: true });

        buyBtn.on('pointerdown', () => {
          const rowAbsoluteY = (scrollContainer ? scrollContainer.y : LIST_Y) + rowLocalY + ROW_H / 2;
          if (rowAbsoluteY < LIST_Y || rowAbsoluteY > LIST_Y + LIST_H) return;

          const result = purchaseFish(row.speciesId);
          if (!result.success && import.meta.env?.DEV) {
            console.log('[ledger] buy failed:', result.reason);
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
          speciesName: species.name,
          cost: row.cost,
          lastAffordable: canAfford,
          lastCount: count,
          isDecor: false,
          lastTier: undefined,
        });
      });
    }
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
      if (row.isDecor && row.slotId !== undefined) {
        // Slot upgrade row: refresh icon, label, and button when tier changes.
        const nowTier = tank?.slotTiers?.[row.slotId] ?? 0;
        const isMaxed = nowTier >= row.tierCount!;

        if (nowTier !== row.lastTier) {
          row.lastTier = nowTier;

          // Update icon: show tier decoration or dim placeholder at tier 0
          const slot = DECORATION_SLOTS.find((s) => s.id === row.slotId)!;
          const iconKey = nowTier > 0 ? slot.tiers[nowTier - 1]! : slot.tiers[0]!;
          row.icon.setTexture(iconKey);
          row.icon.setScale(40 / Math.max(row.icon.width || 1, row.icon.height || 1));
          if (nowTier === 0) {
            row.icon.setTintFill(SILHOUETTE_TINT);
            row.icon.setAlpha(0.4);
          } else {
            row.icon.clearTint();
            row.icon.setAlpha(1);
          }

          // Update label
          row.countText.setText(`${row.speciesName}  ${nowTier}/${row.tierCount}`);

          // Update button label
          if (isMaxed) {
            row.buyBtn.setText('MAX');
            row.buyBtn.setColor('#9ccc9c');
            row.buyBtn.setBackgroundColor('#2a2a2a');
            row.buyBtn.disableInteractive();
            row.lastAffordable = null;
          } else {
            const nextCost = row.tierCosts![nowTier]!;
            row.cost = nextCost;
            row.buyBtn.setText(`UPGRADE  ${formatCoins(nextCost)}c`);
            row.buyBtn.setInteractive({ useHandCursor: true });
          }
        }

        if (!isMaxed) {
          const nextCost = row.tierCosts![nowTier]!;
          const canAfford = balance >= nextCost;
          if (canAfford !== row.lastAffordable) {
            row.lastAffordable = canAfford;
            row.buyBtn.setColor(canAfford ? '#ffffff' : '#777777');
            row.buyBtn.setBackgroundColor(canAfford ? '#2e7d32' : '#3a3a3a');
          }
        }
        continue;
      }

      // Fish row
      const newCount = tank?.fishCounts[row.speciesId] ?? 0;
      if (newCount !== row.lastCount) {
        const wasOwned = row.lastCount > 0;
        const nowOwned = newCount > 0;
        row.lastCount = newCount;
        row.countText.setText(rowLabel(row.speciesName, newCount));
        // Reveal on first purchase (silhouette -> real sprite)
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
