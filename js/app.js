/* ============================================================
   app.js — Orquestador: navegación, helpers de UI, inicio y PWA
   ============================================================ */

const App = (() => {
  let currentView = 'home';
  let deferredPrompt = null;

  /* ---------- Helpers de formato ---------- */
  const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  function money(n) { return pesos.format(Number(n) || 0); }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  /* ---------- Modal ---------- */
  function openModal(title, bodyEl) {
    document.getElementById('modalTitle').textContent = title;
    const body = document.getElementById('modalBody');
    body.innerHTML = '';
    body.appendChild(bodyEl);
    document.getElementById('modalOverlay').hidden = false;
  }
  function closeModal() {
    document.getElementById('modalOverlay').hidden = true;
    document.getElementById('modalBody').innerHTML = '';
  }

  /* ---------- Navegación entre vistas ---------- */
  function goto(view) {
    currentView = view;
    const isCustom = typeof view === 'string' && view.startsWith('custom-');
    document.querySelectorAll('.view').forEach((v) => {
      const match = isCustom ? v.dataset.view === 'custom' : v.dataset.view === view;
      v.classList.toggle('active', match);
    });
    document.querySelectorAll('.nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.goto === view);
    });
    // Re-render de la vista que se abre
    if (view === 'home') renderHome();
    else if (view === 'finance') { Finance.render(); Notes.render('finance', 'notes-finance'); }
    else if (view === 'inventory') { Inventory.render(); Notes.render('inventory', 'notes-inventory'); }
    else if (view === 'sections') { Sections.render(null, 'sectionsWrap'); Notes.render('sections', 'notes-sections'); }
    else if (view === 'tips') { Tips.render(); Notes.render('tips', 'notes-tips'); }
    else if (view === 'settings') Settings.render();
    else if (isCustom) renderCustom(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Re-render de las notas del módulo activo ---------- */
  function renderActiveNotes() {
    const v = currentView;
    if (v === 'finance') Notes.render('finance', 'notes-finance');
    else if (v === 'inventory') Notes.render('inventory', 'notes-inventory');
    else if (v === 'sections') Notes.render('sections', 'notes-sections');
    else if (v === 'tips') Notes.render('tips', 'notes-tips');
    else if (typeof v === 'string' && v.startsWith('custom-')) Notes.render(v, 'notes-custom');
  }

  /* ---------- Render de un módulo personalizado ---------- */
  function renderCustom(key) {
    const mod = DB.settings.get().modules.find((m) => m.key === key);
    if (!mod) { goto('home'); return; }
    const titleEl = document.getElementById('customTitle');
    if (titleEl) titleEl.textContent = `${mod.emoji || '🗂️'} ${mod.label}`;
    const addBtn = document.getElementById('openCustomSectionForm');
    if (addBtn) addBtn.onclick = () => Sections.openForm(key);
    Sections.render(key, 'customWrap');
    Notes.render(key, 'notes-custom');
  }

  /* ---------- Barra de navegación dinámica ---------- */
  const NAV_ICONS = { home: '🏠', finance: '💰', inventory: '📦', sections: '🗂️', tips: '💡', settings: '⚙️' };

  function renderNav() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;
    const s = DB.settings.get();
    const items = [{ key: 'home', label: 'Inicio', icon: NAV_ICONS.home }];
    s.modules.forEach((m) => {
      if (m.visible) items.push({ key: m.key, label: m.label, icon: m.custom ? (m.emoji || '🗂️') : NAV_ICONS[m.key] });
    });
    items.push({ key: 'settings', label: 'Ajustes', icon: NAV_ICONS.settings });

    nav.innerHTML = items.map((it) => `
      <button class="nav-btn ${it.key === currentView ? 'active' : ''}" data-goto="${it.key}">
        <span>${it.icon || '•'}</span><small>${Finance.escapeHtml(it.label)}</small>
      </button>`).join('');

    nav.querySelectorAll('[data-goto]').forEach((b) => {
      b.onclick = () => goto(b.dataset.goto);
    });
  }

  /* ---------- Aplicar marca y nombres personalizados ---------- */
  function applyBranding() {
    const s = DB.settings.get();
    const name = s.businessName || 'El sazón de JASU';
    const h1 = document.querySelector('.brand-text h1');
    if (h1) h1.textContent = name;
    document.title = name;
    // Nombres de los módulos fijos en los títulos de cada vista
    s.modules.forEach((m) => {
      const el = document.getElementById('title-' + m.key);
      if (el) el.textContent = `${NAV_ICONS[m.key] || ''} ${m.label}`.trim();
    });
    renderNav();
  }

  function afterUnlock() {
    renderHome();
    handleLaunchParams();
  }

  /* ---------- Pantalla de inicio (resumen) ---------- */
  function renderHome() {
    // Saludo según la hora
    const h = new Date().getHours();
    const saludo = h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
    document.getElementById('heroGreeting').textContent = saludo + ' 👋';

    // Ocultar atajos de módulos que estén desactivados
    const vis = {};
    DB.settings.get().modules.forEach((m) => { vis[m.key] = m.visible; });
    document.querySelectorAll('.quick-tile[data-goto]').forEach((t) => {
      const k = t.dataset.goto;
      if (k in vis) t.hidden = !vis[k];
    });

    // Resumen financiero de hoy
    const t = Finance.todaySummary();
    document.getElementById('heroIncomeToday').textContent = money(t.income);
    document.getElementById('heroExpenseToday').textContent = money(t.expense);
    const bal = document.getElementById('heroBalanceToday');
    bal.textContent = money(t.net);
    bal.style.color = t.net >= 0 ? 'var(--green)' : 'var(--red)';

    // Alertas de inventario
    const a = Inventory.alerts();
    const alertsBox = document.getElementById('homeAlerts');
    let html = '';
    if (a.danger.length) {
      html += `<div class="alert-banner danger">🔴 <span><strong>${a.danger.length}</strong> ingrediente(s) por agotarse: ${a.danger.map((i) => i.name).join(', ')}</span></div>`;
    }
    if (a.warn.length) {
      html += `<div class="alert-banner warn">🟡 <span><strong>${a.warn.length}</strong> ingrediente(s) con stock bajo: ${a.warn.map((i) => i.name).join(', ')}</span></div>`;
    }
    alertsBox.innerHTML = html;

    // Consejo del día
    Tips.renderTipOfDay();
  }

  /* ---------- Refresco global de datos ---------- */
  function refresh() {
    renderHome();
    Finance.render();
    Inventory.render();
  }

  /* ---------- Fecha en encabezado ---------- */
  function setTodayLabel() {
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    let txt = new Date().toLocaleDateString('es-MX', opts);
    document.getElementById('todayLabel').textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  /* ---------- PWA: instalación y service worker ---------- */
  function setupPWA() {
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn.hidden = false;
    });

    installBtn.onclick = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') toast('¡App instalada! 🎉');
      deferredPrompt = null;
      installBtn.hidden = true;
    };

    window.addEventListener('appinstalled', () => {
      installBtn.hidden = true;
      deferredPrompt = null;
    });

    if ('serviceWorker' in navigator) {
      // Registro inmediato (mejor detección por PWABuilder y disponibilidad offline)
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.warn('No se pudo registrar el Service Worker:', err);
      });
    }
  }

  /* ---------- Accesos directos del manifest (?action / ?view) ---------- */
  function handleLaunchParams() {
    let p;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    const view = p.get('view');
    const action = p.get('action');
    const validViews = ['finance', 'inventory', 'sections', 'tips', 'settings'];
    if (action === 'income') { goto('finance'); setTimeout(() => Finance.openForm('income'), 80); return; }
    if (action === 'expense') { goto('finance'); setTimeout(() => Finance.openForm('expense'), 80); return; }
    if (view && validViews.includes(view)) goto(view);
  }

  /* ---------- Arranque ---------- */
  function start() {
    DB.seedIfEmpty();

    // Atajos rápidos de la pantalla de inicio
    document.querySelectorAll('.quick-tile[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        goto(btn.dataset.goto);
        const action = btn.dataset.action;
        if (action === 'quick-income') setTimeout(() => Finance.openForm('income'), 60);
        if (action === 'quick-expense') setTimeout(() => Finance.openForm('expense'), 60);
      });
    });

    // Modal: cerrar
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('modalOverlay').hidden) closeModal();
    });

    // Inicializar módulos
    Finance.init();
    Inventory.init();
    Sections.init();
    Tips.init();
    Notes.init();
    Notify.init();
    Settings.init();
    Lock.init();

    setTodayLabel();
    applyBranding();   // genera la barra de navegación y aplica el nombre
    setupPWA();

    // Render inicial
    goto('home');

    // Bloqueo: si hay PIN configurado, mostrar pantalla de bloqueo
    if (Lock.isEnabled()) Lock.show();
    else handleLaunchParams();

    // Vigilante de recordatorios (avisos mientras la app está abierta)
    Notify.startWatcher();
  }

  return { start, goto, openModal, closeModal, toast, money, refresh, renderHome, renderNav, applyBranding, afterUnlock, renderActiveNotes };
})();

document.addEventListener('DOMContentLoaded', App.start);
