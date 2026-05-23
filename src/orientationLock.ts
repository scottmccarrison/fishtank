/**
 * Full-viewport DOM overlay shown when the window is in portrait orientation.
 *
 * The Phaser canvas is fixed at 800x600 (4:3 landscape) and centered with
 * Scale.FIT. In a portrait viewport, the canvas shrinks to a small strip
 * with large empty bands above and below - looks broken and HUD buttons end
 * up tiny. Rather than reflow to a portrait layout (which would invalidate
 * existing saved fish/decoration positions), we ask the user to rotate.
 *
 * DOM-based (not Phaser-based) so it covers the entire viewport regardless
 * of where the Phaser canvas sits. Uses matchMedia change events - more
 * reliable than the deprecated window 'orientationchange'.
 */

export function installOrientationLock(): void {
  const overlay = document.createElement('div');
  overlay.id = 'orientation-lock';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'background: #0a1a3a',
    'color: #ffffff',
    'font-family: monospace',
    'font-size: 22px',
    'text-align: center',
    'display: none',
    'align-items: center',
    'justify-content: center',
    'z-index: 9999',
    'padding: 24px',
    'line-height: 1.5',
  ].join(';');
  overlay.innerHTML = `
    <div>
      <div style="font-size: 48px; margin-bottom: 16px;">↻</div>
      <div>Please rotate your device<br>or widen your window</div>
      <div style="font-size: 14px; color: #999; margin-top: 16px;">fishtank needs a landscape view</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const mql = window.matchMedia('(orientation: portrait)');

  function update(): void {
    overlay.style.display = mql.matches ? 'flex' : 'none';
  }

  update();
  mql.addEventListener('change', update);
}
