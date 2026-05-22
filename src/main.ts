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

// --- Load or initialize save state ---
let saved = loadSave();
if (saved === null) {
  saved = createInitialState();
  writeSave(saved);
  if (import.meta.env.DEV) {
    console.log('[init] no save - created fresh state, starter:', saved.fishInstances[0]?.speciesId);
  }
} else if (import.meta.env.DEV) {
  console.log('[init] loaded save with', saved.fishInstances.length, 'fish, balance', saved.coinBalance.toFixed(1));
}

// --- Apply offline catchup once on load ---
const catchup = applyCatchup(saved, new Date());
setState(catchup.newState);
writeSave(getState());
if (catchup.coinsEarned > 0 && import.meta.env.DEV) {
  console.log(
    `[catchup] +${catchup.coinsEarned.toFixed(1)} coins over ${(catchup.elapsedMs / 1000 / 60).toFixed(1)} min`,
  );
}

// --- Sim loop + handlers (state singleton already initialized; safe for scene to read) ---
const simLoop = new SimLoop();

startCoinEarn(getState, setState, simLoop);
startAutosave(getState, setState, simLoop);

registerVisibilityHandler({
  getState,
  setState,
  simLoop,
  onCatchup: ({ elapsedMs, coinsEarned }) => {
    if (coinsEarned > 0 && import.meta.env.DEV) {
      console.log(
        `[visible] +${coinsEarned.toFixed(1)} coins over ${(elapsedMs / 1000 / 60).toFixed(1)} min`,
      );
    }
  },
});

simLoop.start();

// --- Phaser game (scene auto-starts; reads state via the singleton) ---
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
