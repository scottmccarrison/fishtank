# Idle game tech survey

**Date:** 2026-05-20
**Goal:** Validate our leaning stack (Phaser 3 + TS + Vite + Aseprite) against real web-based idle games before locking it in.

## TL;DR

- Phaser 3 is reasonable for our case. Mild overkill on bundle size (~1.2MB vs Pixi's ~450KB), but it saves weeks of integration time over assembling Pixi + tween + asset loader yourself. At 50 fish we are 200x below any rendering benchmark, so this is a developer-time choice, not a performance one.
- The interesting findings are not about engine choice. They are about offline progression math, save format, and the Web Worker pattern for surviving backgrounded tabs.

## Games surveyed

### 1. Kittens Game

- Play: https://kittensgame.com/web/
- Stack: Vanilla JS + Dojo Toolkit 1.7, no bundler, no ES6. Jest for tests.
- Open source: https://github.com/nuclear-unicorn/kittensgame
- Type: Number ticker with light DOM UI, no sprite animation
- Patterns: **Tick simulation, not closed-form.** `ticksPerSecond: 5` (`game.js:1912`). Loop runs via a Web Worker with `setInterval(..., 1000/5)` posting `'tick'` messages back to main thread (`game.js:4640, 4663`) - explicitly chosen because browser `setInterval` throttles when tabs are backgrounded; the worker keeps ticking. UI rendered via `requestAnimationFrame` separately (`game.js:4686`). Save: localStorage key `com.nuclearunicorn.kittengame.savedata`, JSON.

### 2. Antimatter Dimensions

- Play: https://ivark.github.io/AntimatterDimensions/
- Stack: Vue 2.6 + vue-cli-service (Webpack), Babel, Firebase for cloud saves.
- Open source: https://github.com/IvarK/AntimatterDimensionsSourceCode
- Type: Number ticker, no sprites
- Patterns: **Tick simulation with configurable resolution**, capped at 1000 ticks per offline catchup. Player chooses tick count in Options - more ticks = more accurate but slower load. Uses `break_infinity.js` for numbers beyond Number.MAX_VALUE. `pako` for save compression, `js-sha512` for save signing. Lesson: closed-form is mathematically intractable when many compounding multipliers are in play, so they fake it with coarse-grained simulation.

### 3. A Dark Room

- Play: https://adarkroom.doublespeakgames.com/
- Stack: Vanilla JS, jQuery, no bundler. Released 2013.
- Open source: https://github.com/doublespeakgames/adarkroom (MPL 2.0)
- Type: Pure text/DOM, no sprites
- Patterns: DOM rendering, localStorage saves, `setInterval` ticks. Proves complete idle games ship with zero engine.

### 4. Trimps

- Play: https://trimps.github.io/
- Stack: Vanilla JS, `decimal.min.js` for big numbers, `lz-string.js` for save compression
- Open source: https://github.com/Trimps/Trimps.github.io
- Type: Number ticker with DOM UI
- Patterns: Confirms big-number library + save compression is the standard pair.

### 5. Village of Chaos

- Play: https://tearnote.github.io/village-of-chaos/
- Stack: Vanilla ES6, no framework. Static images as WebP, **animations served as GIF**.
- Open source: https://github.com/Tearnote/village-of-chaos
- Type: **Hybrid** - number-ticker mechanics with animated villager sprites in the background
- Patterns: Pure DOM rendering with CSS/flexbox layout. 5-minute autosave to localStorage. Demonstrates you can ship "animated sprites" without a canvas engine if motion is decorative - but this approach won't scale to 20-50 individually-moving entities with collision avoidance.

### 6. orb.farm (bonus, genre-adjacent)

- Play: https://orb.farm/
- Stack: **Rust + WebAssembly + WebGL/GLSL shaders + Webpack.**
- Open source: https://github.com/MaxBittker/orb.farm
- Type: Real aquatic ecosystem simulation - closest reference to our project
- Patterns: GPU-based rendering via custom WebGL shaders. Cellular automata simulation in Rust/WASM. Total overkill for what we are building, but proves the genre exists and shows what someone went deep with.

## Synthesis

### Is Phaser 3 right for 20-50 swimming fish?

Yes. Bundle size is the only real cost. At our scale, performance is a non-issue (the JS game rendering benchmark tests 10,000 sprites - Babylon 56 FPS, Pixi 47, Phaser 43; at 50 sprites we are 200x below threshold). DOM works (Village of Chaos proves it) but breaks down once fish need to react to each other, layer correctly, or animate with sub-pixel smoothness. Phaser's batteries-included approach saves weeks.

### Offline progression math

Closed-form is rare. Both Kittens Game and Antimatter Dimensions simulate ticks. AD caps at 1000 ticks and asks the player to wait. Pattern:

```
elapsed = now - lastSaveTimestamp
ticks = Math.min(elapsed / tickRate, MAX_OFFLINE_TICKS)
for i in range(ticks): runTick()
```

For our fish tank, closed-form is feasible IF income is constant rate per fish. Once we add multipliers, decay, or compounding, switch to tick simulation. Cap offline progression at ~24h.

### Rendering layer

Phaser 3 + TypeScript + Vite is correct. Don't drop to Pixi unless bundle savings become a real concern.

### Patterns worth stealing

- **Web Worker sim loop** (Kittens Game `game.js:4640`) - survives tab backgrounding, where main-thread `setInterval` throttles to 1Hz
- **`break_infinity.js` or `decimal.js`** if currency can exceed 1e308 - cheap insurance. Probably not needed for fish tank.
- **LZ-string compress + base64 save export** (Trimps pattern) - users love portable saves
- **Separate sim tick rate (5-20Hz) from render rate (rAF)** - don't couple swimming animation to the economy tick

### Pitfalls

- Don't run the economy on `requestAnimationFrame` - it pauses when the tab is hidden and players will report "my fish stopped earning"
- Don't store save data as a JSON blob in localStorage without versioning - schema migration breaks saves once we ship updates
- Don't use GIFs for sprites once you need 20+ entities - GIF dithering looks bad next to pixel art and you lose per-sprite control. Use a spritesheet via Aseprite export
- Don't trust browser timestamps - players will edit them. Sign saves or accept that single-player cheating is fine (most idle games accept it)

## Sources

- [Kittens Game source](https://github.com/nuclear-unicorn/kittensgame) - `game.js` lines 1912 (tick rate), 4640-4663 (worker loop), 4686 (RAF)
- [Antimatter Dimensions source](https://github.com/IvarK/AntimatterDimensionsSourceCode)
- [Antimatter Dimensions offline mechanics](https://antimatter-dimensions.fandom.com/wiki/Offline_Progress)
- [A Dark Room source](https://github.com/doublespeakgames/adarkroom)
- [Trimps source](https://github.com/Trimps/Trimps.github.io)
- [Village of Chaos source](https://github.com/Tearnote/village-of-chaos)
- [orb.farm source](https://github.com/MaxBittker/orb.farm)
- [JS game rendering benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)
- [PixiJS open-games](https://github.com/pixijs/open-games)
- [PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
