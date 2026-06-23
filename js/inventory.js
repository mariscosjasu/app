/* ============================================================
   inventory.js — Inventario de ingredientes con alertas visuales
   ============================================================ */

const Inventory = (() => {
  const UNITS = ['kg', 'g', 'L', 'ml', 'pz', 'garrafón', 'paquete', 'caja', '%'];
  const EMOJIS = ['🥕', '🧅', '🍅', '🌶️', '🥩', '🐔', '🧀', '🥚', '💧', '🔥', '🛢️', '🌽', '🥔', '🍋', '🧂', '🍚'];

  /* ---------- Formulario crear/editar ---------- */
  function openForm(existing) {
    const editing = !!existing;
    const ing = existing || { name: '', qty: 0, unit: 'kg', min: 0, step: 1, emoji: '🥕' };

    const body = document.createElement('div');
    body.innerHTML = `
      <form id="ingForm">
        <div class="field">
          <label>Ícono</label>
          <div class="emoji-row" id="emojiRow">
            ${EMOJIS.map((e) => `<button type="button" class="emoji-pick ${e === ing.emoji ? 'sel' : ''}" data-emoji="${e}">${e}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Nombre del insumo</label>
          <input type="text" id="ingName" placeholder="Ej. Cebolla" value="${escAttr(ing.name)}" required autofocus />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Cantidad actual</label>
            <input type="number" id="ingQty" inputmode="decimal" step="0.001" min="0" value="${ing.qty}" />
          </div>
          <div class="field">
            <label>Unidad</label>
            <select id="ingUnit">
              ${UNITS.map((u) => `<option value="${u}" ${u === ing.unit ? 'selected' : ''}>${u}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Mínimo (alerta)</label>
            <input type="number" id="ingMin" inputmode="decimal" step="0.001" min="0" value="${ing.min}" />
          </div>
          <div class="field">
            <label>Paso de +/−</label>
            <input type="number" id="ingStep" inputmode="decimal" step="0.001" min="0.001" value="${ing.step}" />
          </div>
        </div>
        <div class="form-actions">
          ${editing ? '<button type="button" class="btn btn-ghost" id="ingDelete">Eliminar</button>' : '<button type="button" class="btn btn-ghost" id="ingCancel">Cancelar</button>'}
          <button type="submit" class="btn btn-primary">${editing ? 'Guardar cambios' : 'Agregar'}</button>
        </div>
      </form>`;

    App.openModal(editing ? '✏️ Editar ingrediente' : '➕ Nuevo ingrediente', body);

    let selectedEmoji = ing.emoji;
    body.querySelectorAll('[data-emoji]').forEach((b) => {
      b.onclick = () => {
        selectedEmoji = b.dataset.emoji;
        body.querySelectorAll('.emoji-pick').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      };
    });

    const cancel = body.querySelector('#ingCancel');
    if (cancel) cancel.onclick = App.closeModal;

    const del = body.querySelector('#ingDelete');
    if (del) del.onclick = () => {
      if (confirm(`¿Eliminar "${ing.name}" del inventario?`)) {
        DB.ingredients.remove(ing.id);
        App.closeModal();
        App.toast('Ingrediente eliminado');
        App.refresh();
      }
    };

    body.querySelector('#ingForm').onsubmit = (e) => {
      e.preventDefault();
      const data = {
        name: body.querySelector('#ingName').value,
        qty: parseFloat(body.querySelector('#ingQty').value) || 0,
        unit: body.querySelector('#ingUnit').value,
        min: parseFloat(body.querySelector('#ingMin').value) || 0,
        step: parseFloat(body.querySelector('#ingStep').value) || 1,
        emoji: selectedEmoji
      };
      if (!data.name.trim()) { App.toast('Escribe un nombre'); return; }
      if (editing) DB.ingredients.update(ing.id, data);
      else DB.ingredients.add(data);
      App.closeModal();
      App.toast(editing ? '✅ Cambios guardados' : '✅ Ingrediente agregado');
      App.refresh();
    };
  }

  /* ---------- Ajuste rápido +/- ---------- */
  function step(id, dir) {
    const ing = DB.ingredients.all().find((i) => i.id === id);
    if (!ing) return;
    DB.ingredients.adjust(id, dir * ing.step);
    render();
    refreshSummary();
    App.renderHome();
  }

  function setQty(id, value) {
    const v = parseFloat(value);
    if (isNaN(v)) return;
    DB.ingredients.update(id, { qty: Math.max(0, v) });
    render();
    refreshSummary();
    App.renderHome();
  }

  /* ---------- Datos de alertas (compartido con inicio) ---------- */
  function alerts() {
    const list = DB.ingredients.all();
    const danger = list.filter((i) => DB.ingredients.status(i) === 'danger');
    const warn = list.filter((i) => DB.ingredients.status(i) === 'warn');
    return { danger, warn, total: list.length };
  }

  function refreshSummary() {
    const a = alerts();
    const el = document.getElementById('invSummary');
    if (!el) return;
    el.innerHTML = `
      <span class="inv-chip">📦 ${a.total} insumos</span>
      ${a.danger.length ? `<span class="inv-chip danger">🔴 ${a.danger.length} por agotarse</span>` : ''}
      ${a.warn.length ? `<span class="inv-chip warn">🟡 ${a.warn.length} bajos</span>` : ''}
      ${!a.danger.length && !a.warn.length && a.total ? `<span class="inv-chip">🟢 Todo en orden</span>` : ''}`;
  }

  /* ---------- Render ---------- */
  function render() {
    const grid = document.getElementById('invGrid');
    const list = DB.ingredients.all();

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state"><span class="es-emoji">📦</span><p>Tu inventario está vacío.<br>Agrega tu primer ingrediente.</p></div>`;
      return;
    }

    grid.innerHTML = list.map((ing) => {
      const st = DB.ingredients.status(ing);
      const stLabel = st === 'danger' ? 'Crítico' : st === 'warn' ? 'Bajo' : 'OK';
      const cardCls = st === 'ok' ? '' : st;
      const qtyTxt = Number.isInteger(ing.qty) ? ing.qty : ing.qty.toFixed(2).replace(/\.?0+$/, '');
      return `
        <div class="inv-card ${cardCls}">
          <div class="inv-card-head">
            <span class="inv-name">${ing.emoji} ${Finance.escapeHtml(ing.name)}</span>
            <span class="inv-status ${st}">${stLabel}</span>
          </div>
          <div class="inv-qty">${qtyTxt} <small>${Finance.escapeHtml(ing.unit)}</small></div>
          <div class="inv-min">Mínimo: ${ing.min} ${Finance.escapeHtml(ing.unit)}</div>
          <div class="inv-controls">
            <button class="step-btn minus" data-step="${ing.id}" data-dir="-1">−</button>
            <input class="step-input" type="number" inputmode="decimal" step="0.001" value="${qtyTxt}" data-set="${ing.id}" />
            <button class="step-btn plus" data-step="${ing.id}" data-dir="1">+</button>
          </div>
          <div class="inv-card-actions">
            <button class="mini-link" data-edit="${ing.id}">✏️ Editar</button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-step]').forEach((b) => {
      b.onclick = () => step(b.dataset.step, parseInt(b.dataset.dir, 10));
    });
    grid.querySelectorAll('[data-set]').forEach((inp) => {
      inp.onchange = () => setQty(inp.dataset.set, inp.value);
    });
    grid.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => {
        const ing = DB.ingredients.all().find((i) => i.id === b.dataset.edit);
        if (ing) openForm(ing);
      };
    });

    refreshSummary();
  }

  function escAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function init() {
    document.getElementById('openIngredientForm').onclick = () => openForm(null);
  }

  return { init, render, openForm, alerts, refreshSummary };
})();
