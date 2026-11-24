(function () {
  'use strict';
  const V = window.VOID;

  const db = () => window.AH.fb;
  const auth = () => window.AH.firebase.auth;

  let articles = [];
  let editingId = null;

  async function guard() {
    const msg = document.getElementById('guardMsg');
    if (!window.AH.isConfigured) { msg.textContent = 'Firebase غير مُعد.'; return false; }
    const user = auth().currentUser;
    if (!user) { location.href = 'login.html'; return false; }
    const doc = await db().collection('users').doc(user.uid).get();
    if (!doc.exists || doc.data().role !== 'admin') { await auth().signOut(); location.href = 'login.html'; return false; }
    msg.style.display = 'none';
    return true;
  }

  function wireNav() {
    document.querySelectorAll('.admin-side a[data-sec]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = a.getAttribute('data-sec');
        document.querySelectorAll('.admin-side a[data-sec]').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById('sec-' + sec).classList.add('active');
      });
    });
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      await auth().signOut();
      location.href = 'login.html';
    });
  }

  async function loadArticles() {
    try {
      const snap = await db().collection('void_articles').get();
      articles = [];
      snap.forEach(d => articles.push(Object.assign({ id: d.id }, d.data())));
    } catch (e) { console.warn(e); articles = []; }
    renderArticles();
    updateStats();
  }

  function updateStats() {
    document.getElementById('statArticles').textContent = articles.length;
    document.getElementById('statPublished').textContent = articles.filter(a => a.status === 'published').length;
    document.getElementById('statDrafts').textContent = articles.filter(a => a.status !== 'published').length;
  }

  function renderArticles() {
    const tbody = document.getElementById('articlesTbody');
    tbody.innerHTML = articles.map(a => `
      <tr>
        <td>${V.esc(V.lf(a,'title'))}</td>
        <td>${V.esc(V.categoryName(a.category))}</td>
        <td>${V.esc(a.stage || '—')}</td>
        <td><span class="v-badge ${a.status === 'published' ? 'published' : 'draft'}">${a.status === 'published' ? 'منشورة' : 'مسودة'}</span></td>
        <td>${V.formatDate(a.updated)}</td>
        <td>
          <button class="v-btn" style="padding:4px 10px;font-size:0.65rem;" data-edit="${V.esc(a.id)}">تعديل</button>
          <button class="v-btn" style="padding:4px 10px;font-size:0.65rem;" data-toggle="${V.esc(a.id)}">${a.status === 'published' ? 'إلغاء النشر' : 'نشر'}</button>
          <button class="v-btn" style="padding:4px 10px;font-size:0.65rem;" data-del="${V.esc(a.id)}">حذف</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editArticle(b.getAttribute('data-edit'))));
    tbody.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => toggleStatus(b.getAttribute('data-toggle'))));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteArticle(b.getAttribute('data-del'))));
  }

  function resetForm() {
    editingId = null;
    document.getElementById('a_id').value = '';
    document.getElementById('a_title').value = '';
    document.getElementById('a_summary').value = '';
    document.getElementById('a_body').value = '';
    document.getElementById('a_exercises').value = '';
    document.getElementById('a_tags').value = '';
    document.getElementById('a_refs').value = '[]';
    document.getElementById('a_updated').value = new Date().toISOString().slice(0,10);
    document.getElementById('a_status').value = 'draft';
    document.getElementById('a_category').value = V.CATEGORIES[0] ? V.CATEGORIES[0].id : '';
    document.getElementById('a_stage').value = '';
    document.getElementById('editorStatus').textContent = '';
  }

  function populateSelects() {
    const catSel = document.getElementById('a_category');
    catSel.innerHTML = V.CATEGORIES.map(c => `<option value="${V.esc(c.id)}">${V.esc(V.categoryName(c))}</option>`).join('');
    const stageSel = document.getElementById('a_stage');
    stageSel.innerHTML = '<option value="">— لا شيء —</option>' + V.STAGES.map(s => `<option value="${V.esc(s.id)}">${V.esc(s.roman+' '+V.stageName(s))}</option>`).join('');
  }

  function editArticle(id) {
    const a = articles.find(x => x.id === id);
    if (!a) return;
    editingId = id;
    document.getElementById('a_id').value = a.id;
    document.getElementById('a_title').value = V.lf(a,'title') || a.title || '';
    document.getElementById('a_summary').value = V.lf(a,'summary') || a.summary || '';
    document.getElementById('a_body').value = V.lf(a,'body') || a.body || '';
    document.getElementById('a_exercises').value = (V.isAr() ? (a.exercises || []) : (a.exercises_en || a.exercises || [])).join('\n');
    document.getElementById('a_tags').value = (a.tags || []).join(', ');
    document.getElementById('a_refs').value = JSON.stringify(a.references || [], null, 2);
    document.getElementById('a_updated').value = a.updated || new Date().toISOString().slice(0,10);
    document.getElementById('a_status').value = a.status || 'draft';
    document.getElementById('a_category').value = a.category || (V.CATEGORIES[0] && V.CATEGORIES[0].id);
    document.getElementById('a_stage').value = a.stage || '';
    document.querySelector('.admin-side a[data-sec="editor"]').click();
    document.getElementById('editorStatus').textContent = 'تعديل: ' + a.id;
  }

  async function saveArticle(e) {
    e.preventDefault();
    const idInput = document.getElementById('a_id').value.trim();
    const id = idInput || V.slug(document.getElementById('a_title').value) + '-' + Date.now().toString(36);
    let refs = [];
    try { refs = JSON.parse(document.getElementById('a_refs').value || '[]'); } catch (err) { document.getElementById('editorStatus').textContent = 'JSON المراجع غير صالح.'; return; }
    const data = {
      title: document.getElementById('a_title').value.trim(),
      category: document.getElementById('a_category').value,
      stage: document.getElementById('a_stage').value || null,
      status: document.getElementById('a_status').value,
      summary: document.getElementById('a_summary').value.trim(),
      body: document.getElementById('a_body').value,
      exercises: document.getElementById('a_exercises').value.split('\n').map(s => s.trim()).filter(Boolean),
      tags: document.getElementById('a_tags').value.split(',').map(s => s.trim()).filter(Boolean),
      references: refs,
      updated: document.getElementById('a_updated').value || new Date().toISOString().slice(0,10),
    };
    try {
      await db().collection('void_articles').doc(id).set(data, { merge: true });
      V.toast('تم الحفظ');
      document.getElementById('editorStatus').textContent = 'تم الحفظ: ' + id;
      resetForm();
      await loadArticles();
    } catch (err) {
      document.getElementById('editorStatus').textContent = 'خطأ: ' + (err.message || err);
    }
  }

  async function toggleStatus(id) {
    const a = articles.find(x => x.id === id);
    if (!a) return;
    const newStatus = a.status === 'published' ? 'draft' : 'published';
    try {
      await db().collection('void_articles').doc(id).update({ status: newStatus, updated: new Date().toISOString().slice(0,10) });
      V.toast(newStatus === 'published' ? 'تم النشر' : 'تم إلغاء النشر');
      await loadArticles();
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function deleteArticle(id) {
    if (!confirm('حذف هذا المقال؟')) return;
    try {
      await db().collection('void_articles').doc(id).delete();
      V.toast('تم الحذف');
      await loadArticles();
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function loadCategoriesAdmin() {
    await V.loadCategories();
    renderCategories();
    populateSelects();
  }

  function renderCategories() {
    const tbody = document.getElementById('catsTbody');
    tbody.innerHTML = V.CATEGORIES.map(c => `
      <tr>
        <td>${V.esc(c.id)}</td>
        <td>${V.esc(V.categoryName(c))}</td>
        <td>${V.esc(c.desc || '')}</td>
        <td><button class="v-btn" style="padding:4px 10px;font-size:0.65rem;" data-delcat="${V.esc(c.id)}">حذف</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-delcat]').forEach(b => b.addEventListener('click', () => deleteCategory(b.getAttribute('data-delcat'))));
  }

  async function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const id = document.getElementById('newCatId').value.trim() || V.slug(name);
    if (!name || !id) { V.toast('الاسم والمعرف مطلوبان'); return; }
    try {
      await db().collection('void_categories').doc(id).set({ name, desc: '' });
      document.getElementById('newCatName').value = '';
      document.getElementById('newCatId').value = '';
      await loadCategoriesAdmin();
      V.toast('تمت إضافة التصنيف');
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function deleteCategory(id) {
    if (!confirm('حذف التصنيف ' + id + '؟')) return;
    try {
      await db().collection('void_categories').doc(id).delete();
      await loadCategoriesAdmin();
      V.toast('تم الحذف');
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function loadTipsAdmin() {
    const tbody = document.getElementById('tipsTbody');
    let tips = [];
    try {
      const snap = await db().collection('void_tips').get();
      snap.forEach(d => tips.push(Object.assign({ id: d.id }, d.data())));
    } catch (e) { console.warn(e); }
    tbody.innerHTML = tips.map(t => `
      <tr>
        <td>${V.esc(t.text)}</td>
        <td>${V.esc(t.source || '')}</td>
        <td><button class="v-btn" style="padding:4px 10px;font-size:0.65rem;" data-deltip="${V.esc(t.id)}">حذف</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-deltip]').forEach(b => b.addEventListener('click', () => deleteTip(b.getAttribute('data-deltip'))));
  }

  async function addTip() {
    const text = document.getElementById('newTipText').value.trim();
    const source = document.getElementById('newTipSource').value.trim() || 'THE VOID';
    if (!text) { V.toast('النص مطلوب'); return; }
    try {
      await db().collection('void_tips').add({ text, source });
      document.getElementById('newTipText').value = '';
      document.getElementById('newTipSource').value = '';
      await loadTipsAdmin();
      V.toast('تمت إضافة النصيحة');
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function deleteTip(id) {
    if (!confirm('حذف النصيحة؟')) return;
    try {
      await db().collection('void_tips').doc(id).delete();
      await loadTipsAdmin();
      V.toast('تم الحذف');
    } catch (err) { V.toast('خطأ: ' + err.message); }
  }

  async function seedFromJson() {
    const status = document.getElementById('seedStatus');
    status.textContent = 'جاري الاستيراد...';
    try {
      const r = await fetch('../data/articles.ar.json');
      let j;
      try { j = await r.json(); } catch (e) { const r2 = await fetch('../data/articles.json'); j = await r2.json(); }
      const list = Array.isArray(j) ? j : (j.articles || []);
      let n = 0;
      for (const a of list) {
        const id = a.id;
        const data = Object.assign({}, a);
        delete data.id;
        await db().collection('void_articles').doc(id).set(data, { merge: true });
        n++;
      }
      status.textContent = 'تم استيراد ' + n + ' مقال.';
      await loadArticles();
    } catch (err) {
      status.textContent = 'خطأ: ' + (err.message || err);
    }
  }

  async function init() {
    wireNav();
    const ok = await guard();
    if (!ok) return;
    await V.loadCategories();
    populateSelects();
    renderCategories();
    await loadArticles();
    await loadTipsAdmin();

    document.getElementById('newArticleBtn').addEventListener('click', () => {
      resetForm();
      document.querySelector('.admin-side a[data-sec="editor"]').click();
    });
    document.getElementById('refreshArticlesBtn').addEventListener('click', loadArticles);
    document.getElementById('articleForm').addEventListener('submit', saveArticle);
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      resetForm();
      document.querySelector('.admin-side a[data-sec="articles"]').click();
    });
    document.getElementById('addCatBtn').addEventListener('click', addCategory);
    document.getElementById('addTipBtn').addEventListener('click', addTip);
    document.getElementById('seedBtn').addEventListener('click', seedFromJson);

    resetForm();
  }

  auth().onAuthStateChanged(async (user) => {
    if (user) init();
    else location.href = 'login.html';
  });
})();
