(function () {
  'use strict';
  const V = window.VOID;

  let all = [];
  let filtered = [];

  function renderCard(a) {
    const fav = V.favs.has(a.id);
    const stage = V.STAGES.find(s => s.id === a.stage);
    const title = V.lf(a, 'title');
    const summary = V.lf(a, 'summary');
    return `
      <div class="v-card" data-id="${V.esc(a.id)}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div class="v-card-meta">${V.esc(V.categoryName(a.category))} &middot; ${stage ? stage.roman + ' ' + V.stageName(stage) : ''}</div>
          <span class="v-fav ${fav?'active':''}" data-fav="${V.esc(a.id)}">${fav?'&#9829;':'&#9825;'}</span>
        </div>
        <div class="v-card-title">${V.esc(title)}</div>
        <p style="color:var(--v-text-muted);font-size:0.95rem;">${V.esc(summary)}</p>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <a href="article.html?id=${encodeURIComponent(a.id)}" class="v-btn" style="padding:8px 16px;font-size:0.7rem;">${V.isAr()?'اقرأ':'Read'}</a>
        </div>
      </div>`;
  }

  function applyFilters() {
    const q = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const cat = document.getElementById('catFilter').value;
    const stage = document.getElementById('stageFilter').value;
    const favOnly = document.getElementById('favOnly').checked;
    filtered = all.filter(a => {
      if ((a.status || 'published') !== 'published') return false;
      if (cat && a.category !== cat) return false;
      if (stage && a.stage !== stage) return false;
      if (favOnly && !V.favs.has(a.id)) return false;
      if (q) {
        const hay = (V.lf(a,'title') + ' ' + V.lf(a,'summary') + ' ' + (a.tags||[]).join(' ') + ' ' + V.categoryName(a.category)).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const grid = document.getElementById('articleGrid');
    grid.innerHTML = filtered.map(renderCard).join('');
    document.getElementById('emptyState').style.display = filtered.length ? 'none' : 'block';
    grid.querySelectorAll('.v-fav').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const id = el.getAttribute('data-fav');
        const now = V.favs.toggle(id);
        el.classList.toggle('active', now);
        el.innerHTML = now ? '&#9829;' : '&#9825;';
        V.toast(now ? (V.isAr()?'أُضيف للمفضلة':'Added to favorites') : (V.isAr()?'أُزيل من المفضلة':'Removed'));
      });
    });
  }

  async function init() {
    V.initCommon();
    await V.loadCategories();
    const catSel = document.getElementById('catFilter');
    catSel.innerHTML = '<option value="">' + (V.isAr()?'كل التصنيفات':'All Categories') + '</option>';
    V.CATEGORIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = V.categoryName(c);
      catSel.appendChild(o);
    });
    const stageSel = document.getElementById('stageFilter');
    stageSel.innerHTML = '<option value="">' + (V.isAr()?'كل المراحل':'All Stages') + '</option>';
    V.STAGES.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.roman + ' ' + V.stageName(s);
      stageSel.appendChild(o);
    });
    const chips = document.getElementById('catChips');
    const allChip = document.createElement('span');
    allChip.className = 'v-chip active'; allChip.textContent = V.isAr()?'الكل':'All'; allChip.dataset.cat = '';
    chips.appendChild(allChip);
    V.CATEGORIES.forEach(c => {
      const ch = document.createElement('span');
      ch.className = 'v-chip'; ch.textContent = V.categoryName(c); ch.dataset.cat = c.id;
      chips.appendChild(ch);
    });
    chips.addEventListener('click', (e) => {
      const ch = e.target.closest('.v-chip');
      if (!ch) return;
      chips.querySelectorAll('.v-chip').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      catSel.value = ch.dataset.cat;
      applyFilters();
    });

    document.getElementById('searchInput').placeholder = V.isAr() ? 'ابحث في المقالات والمواضيع...' : 'Search articles, topics, tags...';
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    catSel.addEventListener('change', applyFilters);
    stageSel.addEventListener('change', applyFilters);
    document.getElementById('favOnly').addEventListener('change', applyFilters);

    all = await V.publishedArticles();
    applyFilters();
  }

  init();
})();
