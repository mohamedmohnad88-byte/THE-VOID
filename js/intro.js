(function () {
  'use strict';
  const V = window.VOID;
  const INTRO_KEY = 'v_intro_seen';

  function showIntro() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    // starfield
    const c = document.getElementById('introStars');
    if (c && !V.settings.reduceMotion) {
      const ctx = c.getContext('2d');
      let w, h, stars = [];
      function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
      function init() { stars = []; for (let i = 0; i < 220; i++) stars.push({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.4+0.2, a: Math.random() }); }
      resize(); init();
      window.addEventListener('resize', () => { resize(); init(); });
      let t = 0;
      function draw() {
        t += 0.003;
        ctx.clearRect(0,0,w,h);
        stars.forEach(s => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(201,201,212,' + (s.a*(0.4+0.6*Math.sin(t+s.x))) + ')';
          ctx.fill();
        });
        requestAnimationFrame(draw);
      }
      draw();
    }
    // text sequence
    const seal = document.querySelector('.intro-seal');
    if (seal) setTimeout(() => seal.style.opacity = '1', 400);
    const lines = document.querySelectorAll('.intro-line');
    lines.forEach((l, i) => {
      setTimeout(() => l.classList.add('show'), 800 + i*1400);
    });
    const btn = document.getElementById('introEnter');
    if (btn) setTimeout(() => btn.classList.add('show'), 800 + lines.length*1400 + 400);
    const skip = document.getElementById('introSkip');
    if (skip) skip.addEventListener('click', endIntro);
    if (btn) btn.addEventListener('click', endIntro);
  }

  function endIntro() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) return;
    overlay.classList.add('fade-out');
    localStorage.setItem(INTRO_KEY, '1');
    setTimeout(() => { overlay.style.display = 'none'; }, 1200);
  }

  // Auto-show on first visit
  document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem(INTRO_KEY) === '1') {
      const overlay = document.getElementById('introOverlay');
      if (overlay) overlay.style.display = 'none';
      return;
    }
    showIntro();
  });

  // Expose replay
  V.replayIntro = function () { localStorage.removeItem(INTRO_KEY); location.reload(); };
})();
