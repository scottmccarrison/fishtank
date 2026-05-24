/**
 * Full-viewport DOM overlay shown on touch devices in landscape orientation.
 *
 * The Phaser canvas is portrait 450x800 (9:16). On a touch device in landscape,
 * the canvas shrinks to a narrow strip - looks broken. We ask the user to rotate.
 *
 * Desktop (fine pointer) never sees this overlay - dev workflow is not blocked
 * by a rotate-to-portrait message in a normal landscape browser window.
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
      <div>Please rotate your device to portrait.</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const isTouch = window.matchMedia('(pointer: coarse)');
  const isLandscape = window.matchMedia('(orientation: landscape)');

  function update(): void {
    const shouldShow = isTouch.matches && isLandscape.matches;
    overlay.style.display = shouldShow ? 'flex' : 'none';
  }

  update();
  isTouch.addEventListener('change', update);
  isLandscape.addEventListener('change', update);
}
