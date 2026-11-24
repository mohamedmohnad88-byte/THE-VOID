(function () {
  'use strict';
  const V = window.VOID;

  const SYMBOLS = {
    1: ['\u263D', '\u263E', '\u2609'],
    2: ['\u263F', '\u2640', '\u2642', '\u2643'],
    3: ['\u2644', '\u2645', '\u2646', '\u2647', '\u2648'],
    4: ['\u2605', '\u263D', '\u263E', '\u263F', '\u2640', '\u2642'],
    5: ['\u2727', '\u2605', '\u2726', '\u2606', '\u263D', '\u263E', '\u263F', '\u2640']
  };

  function svgFor(level) {
    const syms = SYMBOLS[level] || SYMBOLS[1];
    const ringCount = level;
    const rings = [];
    for (let i = 0; i < ringCount; i++) {
      const r = 95 - i * 8;
      const dash = i % 2 === 0 ? '4 6' : '2 8';
      rings.push(`<circle class="ring" cx="150" cy="150" r="${r}" fill="none" stroke="rgba(138,79,255,${0.15 + i*0.12})" stroke-width="0.8" stroke-dasharray="${dash}" />`);
    }
    const arms = level >= 3 ? 4 : (level >= 2 ? 3 : 2);
    const armPaths = [];
    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2 - Math.PI/2;
      const x = 150 + Math.cos(angle) * 70;
      const y = 150 + Math.sin(angle) * 70;
      armPaths.push(`<line class="limb" x1="150" y1="110" x2="${x}" y2="${y}" stroke="rgba(201,201,212,0.7)" stroke-width="1.2" />`);
      armPaths.push(`<circle cx="${x}" cy="${y}" r="3" fill="rgba(138,79,255,0.6)" />`);
    }
    const legs = level >= 4 ? 4 : 2;
    const legPaths = [];
    for (let i = 0; i < legs; i++) {
      const angle = (i / legs) * Math.PI + Math.PI/2;
      const x = 150 + Math.cos(angle) * 50;
      const y = 210 + Math.sin(angle) * 30;
      legPaths.push(`<line class="limb" x1="150" y1="190" x2="${x}" y2="${y}" stroke="rgba(201,201,212,0.6)" stroke-width="1.2" />`);
    }
    const symNodes = syms.map((s, i) => {
      const a = (i / syms.length) * Math.PI * 2;
      const x = 150 + Math.cos(a) * 125;
      const y = 150 + Math.sin(a) * 125;
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="rgba(138,79,255,0.7)" font-size="14" font-family="serif">${s}</text>`;
    }).join('');
    const halo = level >= 4 ? `<circle cx="150" cy="150" r="135" fill="none" stroke="rgba(138,79,255,0.25)" stroke-width="1" filter="url(#glow)" />` : '';
    const galaxy = level >= 5 ? `<ellipse cx="150" cy="150" rx="145" ry="40" fill="none" stroke="rgba(138,79,255,0.35)" stroke-width="1" transform="rotate(25 150 150)" />` : '';
    return `
<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-label="THE ANCIENT HUMAN">
  <defs>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="bodygrad" cx="50%" cy="40%">
      <stop offset="0%" stop-color="rgba(201,201,212,0.9)"/>
      <stop offset="100%" stop-color="rgba(122,122,138,0.6)"/>
    </radialGradient>
  </defs>
  ${galaxy}
  ${halo}
  ${rings.join('')}
  <!-- head -->
  <circle cx="150" cy="78" r="16" fill="none" stroke="url(#bodygrad)" stroke-width="1.4" />
  <circle cx="150" cy="78" r="4" fill="rgba(138,79,255,0.5)" />
  <!-- torso -->
  <line x1="150" y1="94" x2="150" y2="190" stroke="rgba(201,201,212,0.8)" stroke-width="1.4" />
  <!-- center diamond -->
  <polygon points="150,130 162,150 150,170 138,150" fill="none" stroke="rgba(138,79,255,0.6)" stroke-width="0.8" />
  ${armPaths.join('')}
  ${legPaths.join('')}
  ${symNodes}
  <!-- base line -->
  <line x1="100" y1="230" x2="200" y2="230" stroke="rgba(201,201,212,0.2)" stroke-width="0.6" />
  <text x="150" y="252" text-anchor="middle" fill="rgba(201,201,212,0.4)" font-size="9" font-family="monospace" letter-spacing="3">CURRENT LEVEL: ${String(level).padStart(2,'0')}</text>
</svg>`;
  }

  V.renderAncientHuman = function (container, level) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return;
    const L = level || V.level();
    container.innerHTML = `<div class="ancient-human level-${L}">${svgFor(L)}</div>`;
    // animate rings
    if (!V.settings.reduceMotion) {
      const rings = container.querySelectorAll('.ring');
      rings.forEach((r, i) => {
        r.style.animation = `spinRing ${8 + i*2}s linear infinite ${i % 2 ? 'reverse' : ''}`;
      });
    }
  };

  // inject keyframes
  const style = document.createElement('style');
  style.textContent = `@keyframes spinRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
})();
