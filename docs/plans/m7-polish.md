# M7 Polish and v1 Ship - Fishtank Implementation Plan

## Context

M6 shipped the optional drag-and-drop decoration layer. M7 is the last-mile work to make fishtank a presentable v1: surfacing offline earnings to the player, walking new users through the first-run experience, and adding a settings panel with reset / export / import for the localStorage save.

After M7, fishtank is feature-complete for v1. The mccarrison.me/fish URL is the ship target.

Per the M7 ROADMAP section:
- Welcome-back toast showing offline earnings
- First-run experience (free starter fish, helpful copy)
- Settings panel: mute, **reset save, export/import save JSON**
- v1 deploy verification end-to-end

**Note on mute:** v1 has zero audio. No sound module, no audio files, no Phaser audio. ADR-style design intent reserves sound for Phase 2. M7 SKIPS the mute item - settings panel covers reset + export + import only.

**Closes: TBD (M7.1-M7.5 issues filed in setup step).**

## Repo state (post-M6)

- On main with M6 merged + deployed
- `src/sim/OfflineCatchup.ts` already returns `CatchupResult { newState, elapsedMs, coinsEarned }` - the M7 toast just consumes this
- `src/sim/VisibilityHandler.ts` already exposes an `onCatchup` callback hook (currently used to log to console in main.ts)
- `src/save/SaveStore.ts` has `loadSave` / `writeSave`; `Serializer.ts` has `serialize` / `deserialize`; `InitialState.ts` has `createInitialState` - settings actions compose these
- `src/state.ts` is the SaveStateV1 singleton with `getState` / `setState`
- `src/scenes/TankScene.ts` is the integration point (M6 added DecorationManager + isInputBlocked pattern; M7 follows same pattern for SettingsPanel)
- 82 vitest cases passing
- No audio system exists anywhere
- **M7 milestone exists but has zero issues filed**

## Strategy

**Setup (orchestrator, before Wave 1):**
1. File 5 GitHub issues for M7.1-M7.5.
2. Branch `integrate/m7-polish` off main.
3. Commit `src/sessionState.ts` (small session-scoped module that both Wave 1 agents need: tracks `isFirstRun` flag and a `pendingCatchup` queue between main.ts and TankScene). Same pre-commit pattern as M5's biomeUnlock and M6's DecorationSpecies.cost setup.

**Wave 1 (3 parallel agents):**
- WS1: `CatchupToast` module (M7.1)
- WS2: `WelcomeModal` module (M7.2)
- WS3: `SettingsPanel` module (M7.3)

**Wave 2 (1 sequential agent):**
- WS4: TankScene + main.ts wire-up + RELEASE_NOTES.md (M7.4 + M7.5)

**Final PR:** `integrate/m7-polish` -> `main`, title `M7: Polish and v1 Ship (closes #...)`, squash-merge, deploy. Tag `v1.0.0`.

---

## Setup: orchestrator commits

### File M7 issues

**M7.1: Welcome-back catchup toast** (labels: `area:ui`)
```
## Context
OfflineCatchup already returns elapsedMs + coinsEarned. M7 surfaces this to the
player with a transient text overlay on load AND on tab return.

## Acceptance criteria
- [ ] src/ui/CatchupToast.ts exports createCatchupToast(scene) -> { show(result): void }
- [ ] show({ elapsedMs, coinsEarned }) - no-op if coinsEarned <= 0
- [ ] Renders centered text near top of screen, depth 150 (above HUD)
- [ ] Format: "Welcome back!\n+X coins earned (Y min or Z hr)"
- [ ] Fade in 400ms, hold ~4s, fade out 800ms, then destroy
- [ ] Wired in main.ts (load catchup) and TankScene (visibility onCatchup) via sessionState's pendingCatchup queue

## Dependencies
- M2.5 (OfflineCatchup)
```

**M7.2: First-run WelcomeModal** (labels: `area:ui`)
```
## Context
Greet new players (loadSave returns null) with a brief modal explaining the
core loop: starter fish, buy more, biomes unlock as you earn.

## Acceptance criteria
- [ ] src/ui/WelcomeModal.ts exports createWelcomeModal(scene) -> { show(): void }
- [ ] Full-screen semi-transparent overlay (interactive, blocks clicks beneath)
- [ ] Centered text block: "Welcome to your fish tank! / You have one free Goldfish to start. / Buy more fish from the SHOP to earn more coins. / New biomes unlock as you earn. / Click anywhere to dismiss."
- [ ] On click anywhere on overlay: tween out alpha, destroy
- [ ] Detection: triggered by main.ts setting sessionState.setFirstRun() when loadSave() is null

## Dependencies
- setup (sessionState.ts)
```

**M7.3: Settings panel (reset / export / import)** (labels: `area:ui`)
```
## Context
Player-facing controls for their save: reset to a fresh tank, export current save
as JSON, or import a previously exported save. (Mute deferred to Phase 2 along
with the audio system itself.)

## Acceptance criteria
- [ ] src/ui/SettingsPanel.ts exports createSettingsPanel(scene, simLoop) -> { toggle, destroy, isOpen }
- [ ] Phaser modal styled like ShopPanel (~480x360, depth 200, dark bg, title, close X)
- [ ] Three action buttons stacked vertically:
  - RESET: window.confirm; on OK: simLoop.stop(); writeSave(createInitialState()); window.location.reload()
  - EXPORT: flushSave(getState()) first (stamps fresh lastSavedAt so a future import doesn't double-count time), then serialize + download as fishtank-save-YYYY-MM-DD.json
  - IMPORT: file picker; deserialize; minimal shape validation (isPlausibleSaveState); on valid: simLoop.stop(); writeSave; reload. On invalid: window.alert('Invalid save file')
- [ ] Background absorbs clicks (setInteractive on bg rect)
- [ ] isOpen() returns container visibility (TankScene uses it to gate decoration drag)

## Dependencies
- M2.1 (SimLoop), M2.2 (Serializer), M2.3 (SaveStore + InitialState), M2.4 (flushSave from Autosave)
```

**M7.4: TankScene + main.ts wire-up** (labels: `area:ui`)
```
## Context
Mount the three new UI modules, expose SETTINGS button, route pendingCatchup
events into the toast.

## Acceptance criteria
- [ ] main.ts: when loadSave() returns null, call sessionState.setFirstRun()
- [ ] main.ts: when applyCatchup returns coinsEarned > 0, call sessionState.setPendingCatchup(...)
- [ ] main.ts: VisibilityHandler.onCatchup pushes to sessionState.setPendingCatchup (replaces the existing DEV console.log)
- [ ] TankScene.create() instantiates CatchupToast, WelcomeModal, SettingsPanel
- [ ] TankScene.create() shows WelcomeModal if sessionState.isFirstRun(); then clearFirstRun()
- [ ] TankScene.create() adds SETTINGS text button below SHOP button, toggles SettingsPanel on pointerdown
- [ ] TankScene.update() consumes pendingCatchup and calls catchupToast.show(result)
- [ ] DecorationManager isInputBlocked becomes () => shopPanel.isOpen() || settingsPanel.isOpen()
- [ ] No regression: existing fish, decorations, biomes, shop all still work

## Dependencies
- M7.1, M7.2, M7.3
```

**M7.5: v1 release notes + deploy verification checklist** (labels: `area:deploy`, `type:polish`)
```
## Context
Document v1, run the end-to-end smoke verification on the live URL.

## Acceptance criteria
- [ ] CREATE RELEASE_NOTES.md at repo root with v1.0.0 entry summarizing M1-M7
- [ ] Verification checklist run after deploy (no code; documented for next-time)
  - Visit mccarrison.me/fish in incognito - welcome modal shows
  - Dismiss modal - goldfish swims
  - Wait ~30s - coin counter ticks up, autosave fires
  - SHOP -> Tide Pool tab -> Buy a fish -> second fish appears
  - SHOP -> Decorations tab -> Buy coral -> drag to position
  - SETTINGS -> Export -> file downloads
  - SETTINGS -> Reset -> page reloads to fresh state (welcome modal again)
  - SETTINGS -> Import the exported file -> fish + coins restored
  - Close tab for ~2 min, reopen -> catchup toast appears
- [ ] After verification: tag v1.0.0 on main (`git tag v1.0.0 && git push origin v1.0.0`)
```

### Setup commit: src/sessionState.ts

```typescript
import type { SimLoop } from './sim/SimLoop.js';

/**
 * Session-scoped (in-memory, non-persisted) handles used to bridge main.ts setup
 * and TankScene rendering. Not part of the SaveStateV1 schema - resets each
 * page load.
 *
 *  - isFirstRun: true when loadSave() returned null (player has no prior save).
 *    Set by main.ts; consumed by TankScene to show the WelcomeModal.
 *  - pendingCatchup: a single CatchupResult queued for display. Set by main.ts
 *    (on initial load) and VisibilityHandler.onCatchup (on tab return).
 *    Consumed by TankScene each frame and passed to CatchupToast.
 *  - simLoop: the SimLoop instance, set by main.ts. Read by TankScene to wire
 *    SettingsPanel (which needs to stop the sim before reset/import writeSave
 *    to prevent autosave from racing in and clobbering the new state).
 */

let _isFirstRun = false;
let _pendingCatchup: { elapsedMs: number; coinsEarned: number } | null = null;
let _simLoop: SimLoop | null = null;

export function setFirstRun(): void {
  _isFirstRun = true;
}

export function isFirstRun(): boolean {
  return _isFirstRun;
}

export function clearFirstRun(): void {
  _isFirstRun = false;
}

export function setPendingCatchup(result: { elapsedMs: number; coinsEarned: number }): void {
  _pendingCatchup = result;
}

export function consumePendingCatchup(): { elapsedMs: number; coinsEarned: number } | null {
  const r = _pendingCatchup;
  _pendingCatchup = null;
  return r;
}

export function setSimLoop(loop: SimLoop): void {
  _simLoop = loop;
}

export function getSimLoop(): SimLoop {
  if (!_simLoop) throw new Error('SimLoop not initialized - call setSimLoop in main.ts');
  return _simLoop;
}
```

Verify: `npm run typecheck` clean. Commit message:
```
M7 setup: add sessionState module (isFirstRun, pendingCatchup)

In-memory session flags used to bridge main.ts setup -> TankScene rendering.
Not persisted (resets each page load). Committed pre-Wave-1 so all three
Wave 1 agents import from a shared module rather than duplicating it.
```

---

## Wave 1: Parallel (3 worktrees)

### Workstream 1: CatchupToast (M7.1)

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m7-catchup-toast` off `integrate/m7-polish`
**Commit:** `M7.1: CatchupToast welcome-back display (closes #<m7.1>)`

`src/ui/CatchupToast.ts`:
```typescript
import type Phaser from 'phaser';
import { formatCoins } from '../util/formatCoins.js';

export interface CatchupToast {
  show(result: { elapsedMs: number; coinsEarned: number }): void;
}

const TOAST_DEPTH = 150; // above HUD (100), below shop (200)
const FADE_IN_MS = 400;
const HOLD_MS = 4000;
const FADE_OUT_MS = 800;

function formatDuration(elapsedMs: number): string {
  const minutes = Math.round(elapsedMs / 1000 / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

/**
 * Brief "welcome back" overlay shown when offline catchup produces earnings.
 * Idempotent - safe to call repeatedly. Toasts stack; that's intentional since
 * a player who hides + shows + hides + shows would otherwise miss the second event.
 */
export function createCatchupToast(scene: Phaser.Scene): CatchupToast {
  return {
    show({ elapsedMs, coinsEarned }) {
      if (coinsEarned <= 0) return;

      const text = scene.add
        .text(
          scene.scale.width / 2,
          80,
          `Welcome back!\n+${formatCoins(coinsEarned)} coins earned (${formatDuration(elapsedMs)})`,
          {
            fontSize: '18px',
            color: '#fff8b0',
            fontFamily: 'monospace',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#1a3a6b',
            padding: { x: 16, y: 10 },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(TOAST_DEPTH)
        .setAlpha(0);

      scene.tweens.add({
        targets: text,
        alpha: 1,
        duration: FADE_IN_MS,
        ease: 'Cubic.easeOut',
      });
      scene.tweens.add({
        targets: text,
        alpha: 0,
        delay: FADE_IN_MS + HOLD_MS,
        duration: FADE_OUT_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => text.destroy(),
      });
    },
  };
}
```

`src/ui/CatchupToast.test.ts` (mock scene pattern from CoinFloater/BiomeTransition):
```typescript
import { describe, it, expect } from 'vitest';
import type Phaser from 'phaser';
import { createCatchupToast } from './CatchupToast.js';

function makeMockScene() {
  const texts: Array<{ text: string }> = [];
  const sceneShim = {
    scale: { width: 800, height: 600 },
    add: {
      text: (_x: number, _y: number, t: string) => {
        texts.push({ text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x: 0, y: 0, alpha: 0,
          setOrigin: () => obj,
          setDepth: () => obj,
          setAlpha: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: () => ({}),
    },
  };
  return { scene: sceneShim, texts };
}

describe('CatchupToast', () => {
  it('shows toast with formatted coins and duration', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 30 * 60 * 1000, coinsEarned: 123 });
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('Welcome back!');
    expect(texts[0]!.text).toContain('+123 coins');
    expect(texts[0]!.text).toContain('30 min');
  });

  it('shows hours for durations >= 60 min', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 2.5 * 60 * 60 * 1000, coinsEarned: 1234 });
    expect(texts[0]!.text).toContain('2.5 hr');
  });

  it('no-ops when coinsEarned is 0', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 5000, coinsEarned: 0 });
    expect(texts).toHaveLength(0);
  });
});
```

**Verify:** `npm install`, `npm test -- CatchupToast` (3 cases), typecheck, build.

---

### Workstream 2: WelcomeModal (M7.2)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m7-welcome` off `integrate/m7-polish`
**Commit:** `M7.2: WelcomeModal first-run greeting (closes #<m7.2>)`

`src/ui/WelcomeModal.ts`:
```typescript
import type Phaser from 'phaser';

export interface WelcomeModal {
  show(): void;
}

const MODAL_DEPTH = 400; // above everything else
const COPY = [
  'Welcome to your fish tank!',
  '',
  'You have one free Goldfish to start.',
  'Buy more fish from the SHOP to earn more coins.',
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
```

`src/ui/WelcomeModal.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type Phaser from 'phaser';
import { createWelcomeModal } from './WelcomeModal.js';

function makeMockScene() {
  const texts: Array<{ text: string }> = [];
  const rects: Array<{ w: number; h: number }> = [];
  const handlers: Record<string, (() => void) | undefined> = {};
  const sceneShim = {
    scale: { width: 800, height: 600 },
    add: {
      rectangle: (_x: number, _y: number, w: number, h: number) => {
        rects.push({ w, h });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          alpha: 1,
          setDepth: () => obj,
          setInteractive: () => obj,
          on: (event: string, fn: () => void) => {
            handlers[event] = fn;
            return obj;
          },
          destroy: () => {},
        };
        return obj;
      },
      text: (_x: number, _y: number, t: string) => {
        texts.push({ text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: { add: () => ({}) },
  };
  return { scene: sceneShim, texts, rects, handlers };
}

describe('WelcomeModal', () => {
  it('renders overlay rect at full screen size and welcome text', () => {
    const { scene, texts, rects } = makeMockScene();
    const modal = createWelcomeModal(scene as unknown as Phaser.Scene);
    modal.show();
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ w: 800, h: 600 });
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('Welcome to your fish tank!');
    expect(texts[0]!.text).toContain('SHOP');
  });

  it('registers a pointerdown handler on the overlay', () => {
    const { scene, handlers } = makeMockScene();
    const modal = createWelcomeModal(scene as unknown as Phaser.Scene);
    modal.show();
    expect(typeof handlers['pointerdown']).toBe('function');
  });
});
```

**Verify:** `npm install`, `npm test -- WelcomeModal` (2 cases), typecheck, build.

---

### Workstream 3: SettingsPanel (M7.3)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m7-settings` off `integrate/m7-polish`
**Commit:** `M7.3: SettingsPanel with reset/export/import (closes #<m7.3>)`

`src/ui/SettingsPanel.ts`:
```typescript
import type Phaser from 'phaser';
import { serialize, deserialize } from '../save/Serializer.js';
import { writeSave } from '../save/SaveStore.js';
import { flushSave } from '../save/Autosave.js';
import { createInitialState } from '../save/InitialState.js';
import { getState } from '../state.js';
import type { SimLoop } from '../sim/SimLoop.js';
import type { SaveStateV1 } from '../types/Save.js';

export interface SettingsPanel {
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

const PANEL_W = 480;
const PANEL_H = 360;
const PANEL_DEPTH = 200;

function isoDateForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadJson(filename: string, jsonString: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke a tick to give the browser time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      resolve(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Minimal shape validation beyond Serializer's version check. Catches obviously
 * broken imports (corrupted arrays, NaN balances) before they crash the game.
 */
function isPlausibleSaveState(s: SaveStateV1): boolean {
  if (typeof s.lastSavedAt !== 'string') return false;
  if (!Number.isFinite(s.coinBalance)) return false;
  if (!Number.isFinite(s.lifetimeEarned)) return false;
  if (!Array.isArray(s.fishInstances)) return false;
  if (!Array.isArray(s.decorationInstances)) return false;
  for (const f of s.fishInstances) {
    if (!f || typeof f.id !== 'string' || typeof f.speciesId !== 'string') return false;
    if (!Number.isFinite(f.x) || !Number.isFinite(f.y)) return false;
  }
  for (const d of s.decorationInstances) {
    if (!d || typeof d.id !== 'string' || typeof d.speciesId !== 'string') return false;
    if (!Number.isFinite(d.x) || !Number.isFinite(d.y)) return false;
  }
  return true;
}

async function importSaveFlow(simLoop: SimLoop): Promise<void> {
  const file = await pickFile('application/json,.json');
  if (!file) return;
  const text = await file.text();
  const parsed = deserialize(text);
  if (!parsed || !isPlausibleSaveState(parsed)) {
    window.alert('Invalid save file - the file does not look like a fishtank save.');
    return;
  }
  // Stop the sim BEFORE writeSave to prevent autosave from racing in and
  // clobbering the new save with the still-in-memory old state.
  simLoop.stop();
  writeSave(parsed);
  window.location.reload();
}

function resetSaveFlow(simLoop: SimLoop): void {
  if (!window.confirm('Reset save? This wipes all coins, fish, and decorations. Cannot be undone.')) {
    return;
  }
  // Stop the sim FIRST so a tick handler doesn't overwrite the fresh state.
  simLoop.stop();
  writeSave(createInitialState());
  window.location.reload();
}

function exportSaveFlow(): void {
  // Flush a fresh lastSavedAt BEFORE serializing so the export's timestamp
  // is accurate. Without this, applyCatchup on a future import would credit
  // time from the last autosave (up to AUTOSAVE_INTERVAL_MS stale).
  const updated = flushSave(getState());
  const json = serialize(updated);
  downloadJson(`fishtank-save-${isoDateForFilename()}.json`, json);
}

/**
 * Settings panel: reset / export / import save JSON. Mute is intentionally
 * omitted - v1 has no audio system.
 *
 * `simLoop` is required so reset/import flows can stop the sim before
 * writeSave - otherwise an autosave tick could race in and clobber the new
 * state with the still-in-memory old state.
 */
export function createSettingsPanel(scene: Phaser.Scene, simLoop: SimLoop): SettingsPanel {
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;

  const container = scene.add.container(cx, cy).setDepth(PANEL_DEPTH).setVisible(false);

  const bg = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x0a1a3a, 0.92);
  bg.setStrokeStyle(2, 0xffffff, 0.4);
  bg.setInteractive();
  container.add(bg);

  const title = scene.add
    .text(0, -PANEL_H / 2 + 14, 'SETTINGS', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 0);
  container.add(title);

  const close = scene.add
    .text(PANEL_W / 2 - 20, -PANEL_H / 2 + 10, 'X', {
      fontSize: '22px',
      color: '#ffaaaa',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    })
    .setOrigin(0.5, 0)
    .setInteractive({ useHandCursor: true });
  close.on('pointerdown', () => container.setVisible(false));
  container.add(close);

  function makeActionButton(label: string, y: number, onClick: () => void): void {
    const btn = scene.add
      .text(0, y, label, {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#1a3a6b',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    container.add(btn);
  }

  makeActionButton('EXPORT SAVE', -40, () => exportSaveFlow());
  makeActionButton('IMPORT SAVE', 10, () => {
    void importSaveFlow(simLoop);
  });
  makeActionButton('RESET SAVE', 60, () => resetSaveFlow(simLoop));

  // Footer note
  const footer = scene.add
    .text(0, PANEL_H / 2 - 30, 'Save data lives in your browser only.', {
      fontSize: '11px',
      color: '#999999',
      fontFamily: 'monospace',
    })
    .setOrigin(0.5, 0.5);
  container.add(footer);

  return {
    toggle() {
      container.setVisible(!container.visible);
    },
    isOpen() {
      return container.visible;
    },
    destroy() {
      container.destroy();
    },
  };
}
```

(No new tests for SettingsPanel - the action flows use DOM `document.body`, `window.location`, `window.confirm`, `window.alert` which jsdom can stub but tests would mostly verify it calls the right primitives. Skip in favor of manual verification.)

**Verify:** `npm install`, typecheck, build.

---

## Wave 2: Sequential (1 worktree)

### Workstream 4: TankScene + main.ts wire-up + RELEASE_NOTES (M7.4 + M7.5)

**Worktree:** `../fishtank-ws4` (off `integrate/m7-polish` AFTER Wave 1 merges)
**Branch:** `feature/m7-integration` off `integrate/m7-polish`
**Commit:** `M7.4 + M7.5: TankScene + main.ts wire-up + v1 release notes (closes #<m7.4>, closes #<m7.5>)`

**Files to modify:**

1. **REWRITE** `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { TankScene } from './scenes/TankScene.js';
import { SimLoop } from './sim/SimLoop.js';
import { loadSave, writeSave } from './save/SaveStore.js';
import { createInitialState } from './save/InitialState.js';
import { startAutosave } from './save/Autosave.js';
import { applyCatchup } from './sim/OfflineCatchup.js';
import { registerVisibilityHandler } from './sim/VisibilityHandler.js';
import { startCoinEarn } from './sim/CoinEarn.js';
import { getState, setState } from './state.js';
import { setFirstRun, setPendingCatchup, setSimLoop } from './sessionState.js';

// --- Load or initialize save state ---
let saved = loadSave();
if (saved === null) {
  setFirstRun();
  saved = createInitialState();
  writeSave(saved);
  if (import.meta.env.DEV) {
    console.log('[init] no save - first run, starter:', saved.fishInstances[0]?.speciesId);
  }
} else if (import.meta.env.DEV) {
  console.log('[init] loaded save with', saved.fishInstances.length, 'fish, balance', saved.coinBalance.toFixed(1));
}

// --- Apply offline catchup once on load ---
const catchup = applyCatchup(saved, new Date());
setState(catchup.newState);
writeSave(getState());
if (catchup.coinsEarned > 0) {
  setPendingCatchup({ elapsedMs: catchup.elapsedMs, coinsEarned: catchup.coinsEarned });
}

// --- Sim loop + handlers ---
const simLoop = new SimLoop();
setSimLoop(simLoop); // expose to TankScene via sessionState for SettingsPanel wiring

startCoinEarn(getState, setState, simLoop);
startAutosave(getState, setState, simLoop);

registerVisibilityHandler({
  getState,
  setState,
  simLoop,
  onCatchup: ({ elapsedMs, coinsEarned }) => {
    if (coinsEarned > 0) {
      setPendingCatchup({ elapsedMs, coinsEarned });
    }
  },
});

simLoop.start();

// --- Phaser game ---
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#2c7bd0',
  pixelArt: true,
  scene: [TankScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
```

2. **REWRITE** `src/scenes/TankScene.ts`:
```typescript
import Phaser from 'phaser';
import { preloadFishSprites, preloadDecorationSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createShopPanel, type ShopPanel } from '../ui/ShopPanel.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createBiomeTransition, type BiomeTransition } from '../ui/BiomeTransition.js';
import { createCatchupToast, type CatchupToast } from '../ui/CatchupToast.js';
import { createWelcomeModal, type WelcomeModal } from '../ui/WelcomeModal.js';
import { createSettingsPanel, type SettingsPanel } from '../ui/SettingsPanel.js';
import { createDecorationManager, type DecorationManager } from './DecorationManager.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';
import { getState } from '../state.js';
import { isFirstRun, clearFirstRun, consumePendingCatchup, getSimLoop } from '../sessionState.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
const RENDER_SCALE_MULTIPLIER = 3;

export class TankScene extends Phaser.Scene {
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private fishAI = new FishAI({ tankWidth: TANK_WIDTH, tankHeight: TANK_HEIGHT });
  private coinCounter!: CoinCounter;
  private coinFloater!: CoinFloater;
  private shopPanel!: ShopPanel;
  private backdrop!: GradientBackdrop;
  private biomeTransition!: BiomeTransition;
  private decorationManager!: DecorationManager;
  private catchupToast!: CatchupToast;
  private welcomeModal!: WelcomeModal;
  private settingsPanel!: SettingsPanel;

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
    preloadDecorationSprites(this);
  }

  create(): void {
    const initialBiome = getHighestUnlockedBiome(getState().lifetimeEarned);
    this.backdrop = createGradientBackdrop(this, initialBiome);

    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.shopPanel = createShopPanel(this, getState);
    this.settingsPanel = createSettingsPanel(this, getSimLoop());
    this.catchupToast = createCatchupToast(this);
    this.welcomeModal = createWelcomeModal(this);

    // DecorationManager: created AFTER shop + settings panels so its
    // isInputBlocked closure can check both. Phaser hit-tests per-object,
    // so we must explicitly block decoration drag while any overlay is open.
    this.decorationManager = createDecorationManager(
      this,
      getState,
      () => this.shopPanel.isOpen() || this.settingsPanel.isOpen(),
    );

    this.biomeTransition = createBiomeTransition(this, getState, (biome) => {
      this.backdrop.transitionTo(biome);
    });

    // SHOP button (existing, top-right)
    const shopBtn = this.add.text(TANK_WIDTH - 80, 14, 'SHOP', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#1a3a6b',
      padding: { x: 10, y: 4 },
    });
    shopBtn.setDepth(100).setInteractive({ useHandCursor: true });
    shopBtn.on('pointerdown', () => this.shopPanel.toggle());

    // SETTINGS button (M7, below SHOP)
    const settingsBtn = this.add.text(TANK_WIDTH - 110, 52, 'SETTINGS', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#3a3a5b',
      padding: { x: 10, y: 4 },
    });
    settingsBtn.setDepth(100).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this.settingsPanel.toggle());

    for (const fish of getState().fishInstances) {
      this.spawnSprite(fish);
    }

    // First-run welcome - shown AFTER scene fully set up so it lands on top
    if (isFirstRun()) {
      this.welcomeModal.show();
      clearFirstRun();
    }
  }

  update(_time: number, delta: number): void {
    const fishes = getState().fishInstances;

    for (const fish of fishes) {
      if (!this.sprites.has(fish.id)) this.spawnSprite(fish);
    }

    this.fishAI.update(fishes, delta);

    for (const fish of fishes) {
      const sprite = this.sprites.get(fish.id);
      if (sprite) {
        sprite.setPosition(fish.x, fish.y);
        sprite.setFlipX(fish.direction === -1);
      }
    }

    // Drain pending catchup events (from main.ts initial load OR VisibilityHandler tab-return)
    const pending = consumePendingCatchup();
    if (pending) this.catchupToast.show(pending);

    this.decorationManager.update();
    this.biomeTransition.update();
    this.coinFloater.update(fishes, delta);
    this.coinCounter.update();
    this.shopPanel.update();
  }

  private spawnSprite(fish: { id: string; speciesId: string; x: number; y: number; direction: 1 | -1 }): void {
    const species = SPECIES_BY_ID.get(fish.speciesId);
    if (!species) {
      console.warn('[TankScene] unknown species', fish.speciesId);
      return;
    }
    const sprite = this.add.image(fish.x, fish.y, fish.speciesId);
    sprite.setScale(species.scale * RENDER_SCALE_MULTIPLIER);
    sprite.setFlipX(fish.direction === -1);
    this.sprites.set(fish.id, sprite);
  }
}
```

3. **CREATE** `RELEASE_NOTES.md` at repo root:
```markdown
# fishtank release notes

## v1.0.0 (in progress)

Initial public release. The complete fishtank idle game, shipped per the M1-M7 milestone plan.

### Features

- **Tank scene** — 800x600 Phaser pixel-art tank with biome-themed gradient backdrop
- **Fish** — 28 species across 3 biomes (Tide Pool, Open Reef, Abyss). Goldfish starter on first load.
- **Swim AI** — drift + occasional darting (ADR-0002)
- **Coin economy** — 5Hz sim tick, locked numeric model per ADR-0005 (~50 coin starter, ~50M Abyss goal)
- **Offline catchup** — earnings credited on return (24h cap per ADR-0003)
- **Save layer** — localStorage JSON, schema v1, autosave every 10s, manual export/import
- **Shop** — 4 tabs (3 biomes + decorations) with affordability coloring
- **Biome unlocks** — coin-threshold gates, gradient backdrop crossfade, "BIOME UNLOCKED!" celebration
- **Decorations** — 10 cosmetic items, drag-and-drop placement, positions persisted
- **HUD** — coin counter, per-fish "+1" earn floaters
- **First-run** — welcome modal walks new players through the loop
- **Settings** — reset save / export save JSON / import save JSON
- **Tech** — Phaser 3.90 + TypeScript 5.6 + Vite 6 + Vitest 2 + Cloudflare Worker deploy

### Live

https://mccarrison.me/fish/

### Notes

- No audio in v1 (Phase 2)
- No accounts or backend (local-first per ADR-0004)
- 90+ vitest unit tests; UI integration tested manually
```

4. **UPDATE** `src/ui/README.md`:
```
UI components.

- `CoinCounter.ts` (M3.5): top-left HUD showing balance and earn rate.
- `CoinFloater.ts` (M4.4): per-fish floating "+1" animations on coin earn.
- `ShopPanel.ts` (M4.3, M5.4, M6.5): modal shop with biome + decoration tabs.
- `GradientBackdrop.ts` (M5.2): per-biome gradient background with crossfade.
- `BiomeTransition.ts` (M5.3): detects threshold crossings and shows celebration text.
- `CatchupToast.ts` (M7.1): "Welcome back! +N coins" toast on offline return.
- `WelcomeModal.ts` (M7.2): first-run greeting modal.
- `SettingsPanel.ts` (M7.3): reset / export / import save controls.

(v1 feature-complete - Phase 2 will add sound, achievements, collection log.)
```

**Verify:**
- `npm install`, `npm run typecheck`, `npm run build`, `npm test` (~87 tests across 16 files green)
- `node scripts/verify-assets.mjs` OK
- Browser smoke (orchestrator runs this on dev server):
  - Fresh load (clear localStorage first): welcome modal shows, dismissable
  - Goldfish spawns, swims, coin counter ticks
  - SETTINGS button visible below SHOP; clicking opens settings panel
  - EXPORT downloads a file
  - IMPORT picks the same file, reloads, state preserved
  - RESET asks for confirmation, then reloads to fresh state with welcome modal again
  - Hide tab for ~30s+, return -> catchup toast appears top-center

---

## Integration

**Wave 1 -> Wave 2 gate:**
```bash
git -C /home/scott/fishtank log integrate/m7-polish --oneline -5
git -C /home/scott/fishtank ls-tree integrate/m7-polish src/ui/CatchupToast.ts src/ui/WelcomeModal.ts src/ui/SettingsPanel.ts src/sessionState.ts
# All must exist.
```

**After WS4:** merge, copy plan to `docs/plans/m7-polish.md`, push, PR, squash-merge, cleanup, deploy, then `git tag v1.0.0 && git push origin v1.0.0`.

## Changes from adversarial review

- **Reset/Import race vs autosave (BLOCKING).** Between `writeSave(createInitialState())` and the browser actually tearing down on `window.location.reload()`, the SimLoop continues to tick. An autosave tick in that window would `{...getState(), lastSavedAt}` and clobber the new save with the still-in-memory old state - the player clicks RESET, page reloads, fish all still there. Fix: SettingsPanel now accepts `simLoop` and calls `simLoop.stop()` BEFORE writeSave in BOTH reset and import. SimLoop is exposed via sessionState (new `setSimLoop` / `getSimLoop` helpers) so TankScene can fetch it.
- **Stale lastSavedAt on export (BLOCKING).** Export used `serialize(getState())` directly, but `getState().lastSavedAt` is whatever Autosave last wrote (up to 10s stale). On re-import, `applyCatchup` would credit that stale time against the current balance, double-counting. Fix: Export now calls `flushSave(getState())` first (which stamps fresh lastSavedAt and writes), then serializes the updated state.
- **Import validation too permissive (SHOULD-FIX).** Serializer only checks `version === 1`. Added `isPlausibleSaveState` shape check (arrays, finite numbers, string ids) before writeSave. Invalid imports show `window.alert('Invalid save file')` instead of writing corrupt state and crashing on reload.

## Risks / Notes

- **No mute control** in settings - v1 has no audio.
- **Reset/Import both call window.location.reload()** - the simplest way to ensure all in-memory state is rebuilt from the new save. The page flash is acceptable.
- **Export uses Blob + download anchor** - works in all modern browsers including mobile Safari.
- **Import via file picker** - the only way to read user-selected files without a backend.
- **WelcomeModal shown once per session, gated by isFirstRun flag** - set by main.ts when loadSave() returns null. On subsequent reloads, the save exists so loadSave returns non-null and the modal stays hidden.
- **CatchupToast can stack** if multiple catchup events fire close together. Acceptable - each toast self-destructs after ~5s.
- **SETTINGS button overlaps with nothing** at (TANK_WIDTH-110, 52). SHOP is at (TANK_WIDTH-80, 14). They're vertically stacked, plenty of clearance.
- **No new save schema version.** All M7 polish is purely UI/UX over the existing SaveStateV1.
- **No e2e DOM test for SettingsPanel** - the reset/export/import flows touch document/window globals that are awkward to faithfully mock under jsdom. Manual verification covers this.
- **v1.0.0 tag** is applied only after the PR merges and post-merge smoke test passes on the live URL.
