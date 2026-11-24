(function () {
  'use strict';
  const V = window.VOID;
  let ctx = null, master = null, drone = null, running = false;

  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    if (!ctx) return null;
    master = ctx.createGain();
    master.gain.value = 0.0; // start silent
    master.connect(ctx.destination);
    return ctx;
  }

  function startDrone() {
    if (running) return;
    const c = ensure();
    if (!c) return;
    running = true;
    // low drone
    const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.5;
    const g = c.createGain(); g.gain.value = 0.0;
    o1.connect(g); o2.connect(g); g.connect(master);
    g.gain.linearRampToValueAtTime(0.06, c.currentTime + 3);
    o1.start(); o2.start();
    // LFO
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = c.createGain(); lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
    drone = { o1, o2, g, lfo };
    // fade master
    if (V.settings.sound) master.gain.linearRampToValueAtTime(0.5, c.currentTime + 2);
  }

  function stopDrone() {
    if (!drone) return;
    const c = ctx;
    try { master.gain.linearRampToValueAtTime(0, c.currentTime + 1); } catch(e){}
    setTimeout(() => {
      try { drone.o1.stop(); drone.o2.stop(); drone.lfo.stop(); } catch(e){}
      drone = null; running = false;
    }, 1200);
  }

  function setSound(on) {
    V.settings.sound = on;
    V.applySettings();
    if (!ctx) return;
    const target = on ? 0.5 : 0.0;
    try { master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.6); } catch(e){}
  }

  // click/transition blip
  V.blip = function (freq) {
    if (!V.settings.sound) return;
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = freq || 440;
    const g = c.createGain(); g.gain.value = 0.0;
    o.connect(g); g.connect(master);
    const t = c.currentTime;
    g.gain.linearRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.start(t); o.stop(t + 0.45);
  };

  V.sound = { start: startDrone, stop: stopDrone, set: setSound };

  // wire settings sound checkbox to engine
  const origApply = V.applySettings;
  V.applySettings = function () {
    origApply();
    if (ctx) setSound(V.settings.sound);
  };

  // auto-start on first user gesture
  function onGesture() {
    ensure();
    if (V.settings.sound) startDrone();
    document.removeEventListener('click', onGesture);
    document.removeEventListener('keydown', onGesture);
  }
  document.addEventListener('click', onGesture);
  document.addEventListener('keydown', onGesture);
})();
