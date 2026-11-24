(function () {
  'use strict';
  const V = window.VOID;

  async function init() {
    V.initCommon();
    const articles = await V.publishedArticles();
    const li = V.levelInfo();
    document.getElementById('levelNumber').textContent = String(li.level).padStart(2, '0');
    document.getElementById('levelName').textContent = (V.isAr() ? 'المستوى ' : 'LEVEL ') + li.level + ' — ' + li.name;
    document.getElementById('levelDesc').textContent = li.desc;
    V.renderAncientHuman('#ancientHumanSlot', li.level);

    const total = articles.length;
    const done = V.completedCount();
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById('overallBar').style.width = pct + '%';
    document.getElementById('overallText').textContent = (V.isAr() ? 'التقدم الإجمالي: ' : 'Overall progress: ') + done + '/' + total + ' (' + pct + '%)';

    const container = document.getElementById('stages');
    V.STAGES.forEach((s) => {
      const stageArticles = articles.filter(a => a.stage === s.id);
      const d = V.progress.count(s.id);
      const t = stageArticles.length;
      const p = t ? Math.round((d / t) * 100) : 0;
      const div = document.createElement('div');
      div.className = 'v-stage' + (p === 100 ? ' done' : (d > 0 ? ' active' : ''));
      div.setAttribute('data-roman', s.roman);
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;">
          <h3 style="margin:0;">${s.roman} &mdash; ${V.esc(V.stageName(s))}</h3>
          <span class="v-mono">${d}/${t} ${V.isAr()?'مكتمل':'complete'}</span>
        </div>
        <p style="color:var(--v-text-muted);margin:8px 0 16px;">${V.esc(s.desc)}</p>
        <div class="v-progress"><div class="v-progress-bar" style="width:${p}%"></div></div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          ${stageArticles.map(a => `<a href="article.html?id=${encodeURIComponent(a.id)}" class="v-chip">${V.esc(V.lf(a,'title'))}</a>`).join('')}
        </div>
      `;
      container.appendChild(div);
    });
  }
  init();
})();