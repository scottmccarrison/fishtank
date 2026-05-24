import type Phaser from 'phaser';
import { serialize, deserialize } from '../save/Serializer.js';
import { writeSave } from '../save/SaveStore.js';
import { flushSave } from '../save/Autosave.js';
import { createInitialState } from '../save/InitialState.js';
import { getState } from '../state.js';
import type { SimLoop } from '../sim/SimLoop.js';
import type { SaveStateV2 } from '../types/Save.js';

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
 * broken imports (corrupted balances, malformed tanks) before they crash the game.
 * Validates the V2 shape: version 2, finite balances, tanks object with valid entries.
 */
function isPlausibleSaveState(s: SaveStateV2): boolean {
  if (s.version !== 2) return false;
  if (!Number.isFinite(s.coinBalance)) return false;
  if (!Number.isFinite(s.lifetimeEarned)) return false;
  if (typeof s.tanks !== 'object' || s.tanks === null) return false;
  for (const tank of Object.values(s.tanks)) {
    if (typeof tank.fishCounts !== 'object' || tank.fishCounts === null) return false;
    for (const count of Object.values(tank.fishCounts)) {
      if (!Number.isFinite(count)) return false;
    }
    if (!Array.isArray(tank.decorations)) return false;
    for (const d of tank.decorations) {
      if (typeof d !== 'string') return false;
    }
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
  simLoop.stop();
  writeSave(parsed);
  window.location.reload();
}

function resetSaveFlow(simLoop: SimLoop): void {
  if (!window.confirm('Reset save? This wipes all coins, fish, and decorations. Cannot be undone.')) {
    return;
  }
  simLoop.stop();
  writeSave(createInitialState());
  window.location.reload();
}

function exportSaveFlow(): void {
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

  // Full-viewport dim layer to absorb clicks outside the panel - including
  // the SHOP/SETTINGS buttons sitting in the tank corners. Phaser hit-tests
  // per-object regardless of z-order; a panel-sized bg alone doesn't block
  // input on objects beside it.
  const screenDim = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.5);
  screenDim.setInteractive();
  container.add(screenDim);

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
