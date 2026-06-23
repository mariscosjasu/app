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
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.dataset.view === view);
    });
    document.querySelectorAll('.nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.goto === view);
    });
    // Re-render de la vista que se abre
    if (view === 'home') renderHome();
    if (view === 'finance') Finance.render();
    if (view === 'inventory') Inventory.render();
    if (view === 'sections') Sections.render();
    if (view === 'tips') Tips.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Pantalla de inicio (resumen) ---------- */
  function renderHome() {
    // Saludo según la hora
    const h = new Date().getHours();
    const saludo = h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
    document.getElementById('heroGreeting').textContent = saludo + ' 👋';

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
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch((err) => {
          console.warn('No se pudo registrar el Service Worker:', err);
        });
      });
    }
  }

  /* ---------- Arranque ---------- */
  function start() {
    DB.seedIfEmpty();

    // Navegación inferior + atajos de inicio
    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => {
        goto(btn.dataset.goto);
        // Atajos rápidos desde el inicio
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

    setTodayLabel();
    setupPWA();

    // Render inicial
    goto('home');
  }

  return { start, goto, openModal, closeModal, toast, money, refresh, renderHome };
})();

document.addEventListener('DOMContentLoaded', App.start);
