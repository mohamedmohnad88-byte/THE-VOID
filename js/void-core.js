/* ============================================================
   THE VOID — Core (Arabic-first, RTL by default)
   ============================================================ */
(function () {
  'use strict';

  window.VOID = window.VOID || {};
  const V = window.VOID;

  // ---------- Language ----------
  V.lang = function () { return localStorage.getItem('v_lang') || 'ar'; };
  V.isAr = function () { return V.lang() === 'ar'; };
  V.applyLang = function () {
    const ar = V.isAr();
    document.documentElement.lang = ar ? 'ar' : 'en';
    document.documentElement.dir = ar ? 'rtl' : 'ltr';
  };
  V.applyLang();

  // ---------- Settings ----------
  const settings = {
    reduceMotion: localStorage.getItem('v_reduce_motion') === '1',
    sound: localStorage.getItem('v_sound') !== '0',
  };
  function applySettings() {
    document.body.classList.toggle('v-reduce-motion', settings.reduceMotion);
    localStorage.setItem('v_reduce_motion', settings.reduceMotion ? '1' : '0');
    localStorage.setItem('v_sound', settings.sound ? '1' : '0');
  }
  V.settings = settings;
  V.applySettings = applySettings;
  applySettings();

  // ---------- Toast ----------
  V.toast = function (msg) {
    let t = document.querySelector('.v-toast');
    if (!t) { t = document.createElement('div'); t.className = 'v-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2800);
  };

  // ---------- Firebase ----------
  V.fb = function () { return (window.AH && window.AH.firebase) || {}; };
  V.db = function () { return (window.AH && window.AH.fb) || null; };
  V.auth = function () { return (window.AH && window.AH.firebase && window.AH.firebase.auth) || null; };
  V.isConfigured = function () { return !!(window.AH && window.AH.isConfigured); };

  // ---------- Utils ----------
  V.$ = (sel, root) => (root || document).querySelector(sel);
  V.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  V.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };
  V.slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
  V.now = function () { return new Date().toISOString(); };
  V.formatDate = function (iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(V.isAr() ? 'ar' : 'en-US', { year:'numeric', month:'short', day:'numeric' }); } catch(e){ return iso; }
  };

  // ---------- Favorites ----------
  V.favs = {
    get() { try { return JSON.parse(localStorage.getItem('v_favs') || '[]'); } catch(e){ return []; } },
    set(a) { localStorage.setItem('v_favs', JSON.stringify(a)); },
    has(id) { return this.get().includes(id); },
    toggle(id) {
      const a = this.get();
      const i = a.indexOf(id);
      if (i >= 0) a.splice(i,1); else a.push(id);
      this.set(a);
      return i < 0;
    }
  };

  // ---------- Progress ----------
  V.progress = {
    get() { try { return JSON.parse(localStorage.getItem('v_progress') || '{}'); } catch(e){ return {}; } },
    set(o) { localStorage.setItem('v_progress', JSON.stringify(o)); },
    mark(stage, articleId) {
      const o = this.get();
      o[stage] = o[stage] || [];
      if (!o[stage].includes(articleId)) o[stage].push(articleId);
      this.set(o);
    },
    count(stage) { const o = this.get(); return (o[stage] || []).length; }
  };

  // ---------- Articles ----------
  V.seedArticles = null;
  V.articlesCache = null;

  V.loadSeed = async function () {
    if (V.seedArticles) return V.seedArticles;
    const lang = V.lang();
    const files = lang === 'ar' ? ['data/articles.ar.json','data/articles.json'] : ['data/articles.en.json','data/articles.json'];
    for (const f of files) {
      try {
        const r = await fetch(f);
        if (!r.ok) continue;
        const j = await r.json();
        V.seedArticles = Array.isArray(j) ? j : (j.articles || []);
        if (V.seedArticles.length) return V.seedArticles;
      } catch (e) { /* try next */ }
    }
    V.seedArticles = [];
    return V.seedArticles;
  };

  // Helper: pick field (files are language-specific)
  V.lf = function (obj, field) {
    if (!obj) return '';
    return obj[field] != null ? obj[field] : '';
  };

  V.loadArticles = async function () {
    if (V.articlesCache) return V.articlesCache;
    const seed = await V.loadSeed();
    let remote = [];
    const db = V.db();
    if (db) {
      try {
        const snap = await db.collection('void_articles').get();
        snap.forEach(d => remote.push(Object.assign({ id: d.id }, d.data())));
      } catch (e) { console.warn('firestore articles failed', e); }
    }
    const map = new Map();
    seed.forEach(a => map.set(a.id, Object.assign({}, a)));
    remote.forEach(a => map.set(a.id, Object.assign({}, a)));
    V.articlesCache = Array.from(map.values());
    return V.articlesCache;
  };
  V.invalidateArticles = function () { V.articlesCache = null; };
  V.getArticle = async function (id) {
    const list = await V.loadArticles();
    return list.find(a => a.id === id) || null;
  };
  V.publishedArticles = async function () {
    const list = await V.loadArticles();
    return list.filter(a => (a.status || 'published') === 'published');
  };

  // ---------- Categories (Arabic) ----------
  V.CATEGORIES_DEFAULT = [
    { id: 'cognitive', name: 'علم النفس المعرفي', name_en: 'Cognitive Psychology', desc: 'كيف يعالج العقل المعلومات.' },
    { id: 'behavioral', name: 'علم النفس السلوكي', name_en: 'Behavioral Psychology', desc: 'كيف تُتعلم السلوكيات وتُشكل.' },
    { id: 'ei', name: 'الذكاء العاطفي', name_en: 'Emotional Intelligence', desc: 'إدراك العواطف واستخدامها وإدارتها.' },
    { id: 'assertiveness', name: 'الثبات والتعبير عن الذات', name_en: 'Assertiveness', desc: 'الوقوف على موقفك باحترام.' },
    { id: 'critical', name: 'التفكير النقدي', name_en: 'Critical Thinking', desc: 'تقييم الادعاءات والتفكير بعمق.' },
    { id: 'resilience', name: 'المرونة النفسية', name_en: 'Psychological Resilience', desc: 'التعافي والتكيف.' },
    { id: 'human', name: 'السلوك الإنساني', name_en: 'Human Behavior', desc: 'لماذا يفعل الناس ما يفعلون.' },
    { id: 'social', name: 'علم النفس الاجتماعي', name_en: 'Social Psychology', desc: 'التأثير، المجموعات، العلاقات.' },
    { id: 'decision', name: 'اتخاذ القرار', name_en: 'Decision Making', desc: 'الاختيار في ظل عدم اليقين.' },
    { id: 'biases', name: 'الانحيازات المعرفية', name_en: 'Cognitive Biases', desc: 'الأخطاء المنهجية في التفكير.' },
    { id: 'stoic', name: 'الفلسفة الرواقية', name_en: 'Stoic Philosophy', desc: 'انضباط قديم لعقول حديثة.' },
  ];
  V.CATEGORIES = V.CATEGORIES_DEFAULT.slice();

  V.loadCategories = async function () {
    const db = V.db();
    if (db) {
      try {
        const snap = await db.collection('void_categories').get();
        const remote = [];
        snap.forEach(d => remote.push(Object.assign({ id: d.id }, d.data())));
        if (remote.length) {
          const map = new Map();
          V.CATEGORIES_DEFAULT.forEach(c => map.set(c.id, Object.assign({}, c)));
          remote.forEach(c => map.set(c.id, Object.assign({}, c)));
          V.CATEGORIES = Array.from(map.values());
        }
      } catch (e) { console.warn('categories failed', e); }
    }
    return V.CATEGORIES;
  };
  V.categoryName = function (id) {
    const c = V.CATEGORIES.find(x => x.id === id);
    if (!c) return id;
    return V.isAr() ? c.name : (c.name_en || c.name);
  };

  // ---------- Daily tips (Arabic) ----------
  V.loadTips = async function () {
    const db = V.db();
    if (db) {
      try {
        const snap = await db.collection('void_tips').get();
        const out = [];
        snap.forEach(d => out.push(Object.assign({ id: d.id }, d.data())));
        if (out.length) return out;
      } catch (e) { console.warn('tips failed', e); }
    }
    return [
      { text: 'العالم لا يحدد حدودك.', source: 'THE VOID' },
      { text: 'أتقن ردود أفعالك.', source: 'THE VOID' },
      { text: 'اعرف عقلك. اعرف قوتك.', source: 'THE VOID' },
      { text: 'الصمت خيار. ليس ضعفاً.', source: 'THE VOID' },
      { text: 'أعظم ميزة لك هي الوعي بالذات.', source: 'THE VOID' },
    ];
  };

  // ---------- Stages (Arabic) ----------
  V.STAGES = [
    { id: 'awareness', roman: 'I', name: 'الوعي', name_en: 'AWARENESS', desc: 'فهم الذات وملاحظة أنماط التفكير.' },
    { id: 'control', roman: 'II', name: 'التحكم', name_en: 'CONTROL', desc: 'تنظيم الانفعالات والتحكم في ردود الأفعال.' },
    { id: 'discipline', roman: 'III', name: 'الانضباط', name_en: 'DISCIPLINE', desc: 'بناء الانضباط والثبات على القرارات.' },
    { id: 'perception', roman: 'IV', name: 'الإدراك', name_en: 'PERCEPTION', desc: 'التفكير النقدي وفهم السلوك البشري.' },
    { id: 'mastery', roman: 'V', name: 'الإتقان', name_en: 'MASTERY', desc: 'الاستقلال النفسي والثقة والقدرة على اتخاذ قرارات واعية.' },
  ];

  V.stageName = function (s) { return V.isAr() ? s.name : s.name_en; };

  // ---------- Nebula ----------
  V.initNebula = function () {
    if (settings.reduceMotion) return;
    const c = document.getElementById('nebula');
    if (!c) return;
    const ctx = c.getContext('2d');
    let w, h, stars = [], t = 0;
    function resize() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
    function init() {
      stars = [];
      const n = Math.min(180, Math.floor(w*h/9000));
      for (let i=0;i<n;i++) stars.push({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.2+0.2, vx: (Math.random()-0.5)*0.05, vy: (Math.random()-0.5)*0.05, a: Math.random()*0.6+0.2 });
    }
    resize(); init();
    window.addEventListener('resize', () => { resize(); init(); });
    function draw() {
      t += 0.002;
      ctx.clearRect(0,0,w,h);
      const g1 = ctx.createRadialGradient(w*0.2, h*0.1, 0, w*0.2, h*0.1, w*0.6);
      g1.addColorStop(0, 'rgba(74,26,107,0.18)'); g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0,0,w,h);
      const g2 = ctx.createRadialGradient(w*0.85, h*0.05, 0, w*0.85, h*0.05, w*0.5);
      g2.addColorStop(0, 'rgba(107,45,143,0.14)'); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0,0,w,h);
      stars.forEach(s => {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
        if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(201,201,212,${s.a*(0.6+0.4*Math.sin(t*2+s.x))})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    draw();
  };

  // ---------- Nav ----------
  V.wireNav = function () {
    const toggle = document.querySelector('.v-nav-toggle');
    const links = document.querySelector('.v-nav-links');
    if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));
    const path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.v-nav-links a').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href === path) a.classList.add('active');
    });
  };

  // ---------- Settings panel ----------
  V.wireSettings = function () {
    const btn = document.querySelector('.v-settings button');
    const panel = document.querySelector('.v-settings-panel');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => panel.classList.toggle('open'));
    const rm = panel.querySelector('[data-setting="reduceMotion"]');
    const snd = panel.querySelector('[data-setting="sound"]');
    if (rm) { rm.checked = settings.reduceMotion; rm.addEventListener('change', () => { settings.reduceMotion = rm.checked; applySettings(); if (rm.checked) { const c = document.getElementById('nebula'); if (c) c.style.display='none'; } else { V.initNebula(); } }); }
    if (snd) { snd.checked = settings.sound; snd.addEventListener('change', () => { settings.sound = snd.checked; applySettings(); }); }
  };

  V.initCommon = function () {
    V.applyLang();
    V.wireNav();
    V.wireSettings();
    if (!settings.reduceMotion) V.initNebula();
    // wire lang toggle if present
    const lt = document.getElementById('langToggle');
    if (lt) {
      lt.textContent = V.isAr() ? 'EN' : 'AR';
      lt.addEventListener('click', () => {
        localStorage.setItem('v_lang', V.isAr() ? 'en' : 'ar');
        location.reload();
      });
    }
  };

  // ---------- Markdown renderer ----------
  V.renderBody = function (text) {
    if (!text) return '';
    const lines = String(text).split('\n');
    let html = '', inList = false, inQuote = false;
    lines.forEach(line => {
      const t = line.trim();
      if (t === '') { if (inList) { html += '</ul>'; inList = false; } if (inQuote) { html += '</blockquote>'; inQuote = false; } return; }
      if (t.startsWith('> ')) {
        if (inList) { html += '</ul>'; inList = false; }
        if (!inQuote) { html += '<blockquote>'; inQuote = true; }
        html += V.esc(t.slice(2)) + ' ';
        return;
      }
      if (t.startsWith('- ') || t.startsWith('* ')) {
        if (inQuote) { html += '</blockquote>'; inQuote = false; }
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + V.esc(t.slice(2)) + '</li>';
        return;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (inQuote) { html += '</blockquote>'; inQuote = false; }
      if (t.startsWith('### ')) { html += '<h4>' + V.esc(t.slice(4)) + '</h4>'; return; }
      if (t.startsWith('## ')) { html += '<h3>' + V.esc(t.slice(3)) + '</h3>'; return; }
      if (t.startsWith('# ')) { html += '<h2>' + V.esc(t.slice(2)) + '</h2>'; return; }
      html += '<p>' + V.esc(t) + '</p>';
    });
    if (inList) html += '</ul>';
    if (inQuote) html += '</blockquote>';
    return html;
  };
})();
