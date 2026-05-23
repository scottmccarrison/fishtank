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
setSimLoop(simLoop);

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
