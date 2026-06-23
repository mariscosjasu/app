/* ============================================================
   finance.js — Registro Financiero (ingresos, gastos y balance)
   ============================================================ */

const Finance = (() => {
  const INCOME_CATS = ['Ventas del día', 'Pedido especial', 'Propinas', 'Otro ingreso'];
  const EXPENSE_CATS = ['Insumos / Ingredientes', 'Gas', 'Agua', 'Luz', 'Renta', 'Sueldos', 'Otro gasto'];

  /* ---------- Filtrado por periodo ---------- */
  function startOf(period) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (period === 'today') return d.getTime();
    if (period === 'week') {
      const day = (d.getDay() + 6) % 7; // lunes = 0
      d.setDate(d.getDate() - day);
      return d.getTime();
    }
    if (period === 'month') {
      d.setDate(1);
      return d.getTime();
    }
    return 0; // all
  }

  function filtered(period) {
    const from = startOf(period);
    return DB.transactions.all().filter((t) => t.date >= from);
  }

  function totals(list) {
    let income = 0, expense = 0;
    list.forEach((t) => { t.type === 'income' ? (income += t.amount) : (expense += t.amount); });
    return { income, expense, net: income - expense };
  }

  /* ---------- Formulario de transacción ---------- */
  function openForm(type) {
    const isIncome = type === 'income';
    const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;
    const title = isIncome ? '💵 Registrar venta (entrada)' : '🧾 Registrar gasto (salida)';

    const body = document.createElement('div');
    body.innerHTML = `
      <form id="txForm">
        <div class="field">
          <label>Monto (MXN)</label>
          <input type="number" id="txAmount" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required autofocus />
        </div>
        <div class="field">
          <label>Categoría</label>
          <select id="txCategory">
            ${cats.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Descripción (opcional)</label>
          <input type="text" id="txDesc" placeholder="Ej. ${isIncome ? 'Venta de tacos mediodía' : 'Compra de verdura'}" />
        </div>
        <div class="field">
          <label>Fecha</label>
          <input type="date" id="txDate" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="txCancel">Cancelar</button>
          <button type="submit" class="btn ${isIncome ? 'btn-income' : 'btn-expense'}">Guardar</button>
        </div>
      </form>`;

    App.openModal(title, body);

    const dateInput = body.querySelector('#txDate');
    dateInput.value = new Date().toISOString().slice(0, 10);

    body.querySelector('#txCancel').onclick = App.closeModal;
    body.querySelector('#txForm').onsubmit = (e) => {
      e.preventDefault();
      const amount = parseFloat(body.querySelector('#txAmount').value);
      if (!amount || amount <= 0) { App.toast('Ingresa un monto válido'); return; }
      const dateVal = dateInput.value ? new Date(dateInput.value + 'T12:00:00').getTime() : Date.now();
      DB.transactions.add({
        type,
        amount,
        category: body.querySelector('#txCategory').value,
        description: body.querySelector('#txDesc').value,
        date: dateVal
      });
      App.closeModal();
      App.toast(isIncome ? '✅ Venta registrada' : '✅ Gasto registrado');
      App.refresh();
    };
  }

  function confirmDelete(id) {
    if (confirm('¿Eliminar este movimiento?')) {
      DB.transactions.remove(id);
      App.toast('Movimiento eliminado');
      App.refresh();
    }
  }

  /* ---------- Render ---------- */
  function render() {
    const period = document.getElementById('financeFilter').value;
    const list = filtered(period);
    const t = totals(list);

    document.getElementById('balIncome').textContent = App.money(t.income);
    document.getElementById('balExpense').textContent = App.money(t.expense);
    const net = document.getElementById('balNet');
    net.textContent = App.money(t.net);
    net.style.color = t.net >= 0 ? 'var(--green)' : 'var(--red)';

    const ul = document.getElementById('txList');
    if (!list.length) {
      ul.innerHTML = `<div class="empty-state"><span class="es-emoji">🧾</span><p>Sin movimientos en este periodo.<br>Registra tu primera venta o gasto.</p></div>`;
      return;
    }

    ul.innerHTML = list.map((tx) => {
      const isIn = tx.type === 'income';
      const d = new Date(tx.date);
      const fecha = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      const desc = tx.description || tx.category || (isIn ? 'Ingreso' : 'Gasto');
      return `
        <li class="tx-item">
          <span class="tx-icon ${isIn ? 'in' : 'out'}">${isIn ? '💵' : '🧾'}</span>
          <div class="tx-info">
            <div class="tx-desc">${escapeHtml(desc)}</div>
            <div class="tx-meta">${escapeHtml(tx.category)} · ${fecha}</div>
          </div>
          <span class="tx-amount ${isIn ? 'in' : 'out'}">${isIn ? '+' : '−'}${App.money(tx.amount)}</span>
          <button class="tx-del" data-del="${tx.id}" title="Eliminar">🗑️</button>
        </li>`;
    }).join('');

    ul.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = () => confirmDelete(b.dataset.del);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Resumen de HOY (para inicio) ---------- */
  function todaySummary() {
    return totals(filtered('today'));
  }

  function init() {
    document.getElementById('openIncomeForm').onclick = () => openForm('income');
    document.getElementById('openExpenseForm').onclick = () => openForm('expense');
    document.getElementById('financeFilter').onchange = render;
  }

  return { init, render, openForm, todaySummary, escapeHtml };
})();
