/* ============================================================
   tips.js — Consejos Inteligentes (tarjetas rotativas / aleatorias)
   ============================================================ */

const Tips = (() => {
  let activeCat = 'all';
  const FEED_SIZE = 5;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pool() {
    return activeCat === 'all' ? TIPS : TIPS.filter((t) => t.cat === activeCat);
  }

  function cardHtml(tip) {
    return `
      <div class="tip-card cat-${tip.cat}">
        <div class="tip-cat">${tip.catLabel}</div>
        <div class="tip-title">${tip.title}</div>
        <div class="tip-body">${tip.body}</div>
      </div>`;
  }

  /* ---------- Render del feed de consejos ---------- */
  function renderFeed() {
    const feed = document.getElementById('tipsFeed');
    const chosen = shuffle(pool()).slice(0, FEED_SIZE);
    feed.innerHTML = chosen.map(cardHtml).join('');
  }

  function renderFilters() {
    const bar = document.getElementById('tipsFilter');
    bar.innerHTML = TIP_CATEGORIES.map((c) =>
      `<button class="tip-chip ${c.key === activeCat ? 'active' : ''}" data-cat="${c.key}">${c.label}</button>`
    ).join('');
    bar.querySelectorAll('[data-cat]').forEach((b) => {
      b.onclick = () => {
        activeCat = b.dataset.cat;
        renderFilters();
        renderFeed();
      };
    });
  }

  function render() {
    renderFilters();
    renderFeed();
  }

  /* ---------- Consejo del día (para la pantalla de inicio) ---------- */
  function tipOfDay() {
    // Determinístico por día: el mismo consejo durante todo el día
    const dayIndex = Math.floor(Date.now() / 86400000);
    return TIPS[dayIndex % TIPS.length];
  }

  function renderTipOfDay() {
    const el = document.getElementById('tipOfDay');
    if (!el) return;
    const tip = tipOfDay();
    el.innerHTML = `
      <div class="tip-cat">💡 Consejo del día · ${tip.catLabel}</div>
      <div class="tip-title">${tip.title}</div>
      <div class="tip-body">${tip.body}</div>`;
  }

  function init() {
    document.getElementById('shuffleTips').onclick = renderFeed;
  }

  return { init, render, renderTipOfDay };
})();
