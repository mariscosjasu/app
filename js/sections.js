/* ============================================================
   sections.js — Secciones dinámicas modulables
   El usuario crea sus propias listas (pendientes, recordatorios, etc.)
   ============================================================ */

const Sections = (() => {
  const EMOJIS = ['📝', '🛒', '⏰', '📋', '💡', '🍽️', '📦', '🧹', '💳', '📞', '⭐', '🎯'];

  /* ---------- Formulario nueva sección ---------- */
  function openForm() {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="secForm">
        <div class="field">
          <label>Ícono</label>
          <div class="emoji-row" id="secEmojiRow">
            ${EMOJIS.map((e, i) => `<button type="button" class="emoji-pick ${i === 0 ? 'sel' : ''}" data-emoji="${e}">${e}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Nombre de la sección</label>
          <input type="text" id="secTitle" placeholder="Ej. Recordatorios del negocio" required autofocus />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="secCancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear sección</button>
        </div>
      </form>`;

    App.openModal('🗂️ Nueva sección', body);

    let emoji = EMOJIS[0];
    body.querySelectorAll('[data-emoji]').forEach((b) => {
      b.onclick = () => {
        emoji = b.dataset.emoji;
        body.querySelectorAll('.emoji-pick').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      };
    });

    body.querySelector('#secCancel').onclick = App.closeModal;
    body.querySelector('#secForm').onsubmit = (e) => {
      e.preventDefault();
      const title = body.querySelector('#secTitle').value.trim();
      if (!title) { App.toast('Escribe un nombre'); return; }
      DB.sections.add({ title, emoji });
      App.closeModal();
      App.toast('✅ Sección creada');
      render();
    };
  }

  /* ---------- Render ---------- */
  function render() {
    const wrap = document.getElementById('sectionsWrap');
    const list = DB.sections.all();

    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state"><span class="es-emoji">🗂️</span><p>Aún no tienes secciones.<br>Crea una para organizar pendientes o recordatorios.</p></div>`;
      return;
    }

    wrap.innerHTML = list.map((sec) => {
      const pending = sec.items.filter((i) => !i.done).length;
      const itemsHtml = sec.items.length
        ? sec.items.map((it) => `
            <li class="dyn-li ${it.done ? 'done' : ''}">
              <button class="dyn-check ${it.done ? 'on' : ''}" data-toggle="${sec.id}|${it.id}">${it.done ? '✓' : ''}</button>
              <span class="dyn-li-text">${Finance.escapeHtml(it.text)}</span>
              <button class="dyn-li-del" data-rmitem="${sec.id}|${it.id}">🗑️</button>
            </li>`).join('')
        : '<p class="empty-hint">Sin elementos todavía.</p>';

      return `
        <div class="dyn-section">
          <div class="dyn-head">
            <span class="dyn-emoji">${sec.emoji}</span>
            <span class="dyn-title">${Finance.escapeHtml(sec.title)}</span>
            <span class="dyn-count">${pending} pendiente${pending === 1 ? '' : 's'}</span>
            <button class="dyn-del" data-rmsec="${sec.id}" title="Eliminar sección">🗑️</button>
          </div>
          <div class="dyn-body">
            <div class="dyn-add-row">
              <input type="text" placeholder="Agregar elemento…" data-input="${sec.id}" />
              <button data-additem="${sec.id}">+</button>
            </div>
            <ul class="dyn-list">${itemsHtml}</ul>
          </div>
        </div>`;
    }).join('');

    // Agregar elemento
    wrap.querySelectorAll('[data-additem]').forEach((btn) => {
      const secId = btn.dataset.additem;
      const input = wrap.querySelector(`[data-input="${secId}"]`);
      const add = () => {
        const text = input.value.trim();
        if (!text) return;
        DB.sections.addItem(secId, text);
        render();
      };
      btn.onclick = add;
      input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    });

    // Marcar / desmarcar
    wrap.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = () => {
        const [s, i] = b.dataset.toggle.split('|');
        DB.sections.toggleItem(s, i);
        render();
      };
    });

    // Borrar elemento
    wrap.querySelectorAll('[data-rmitem]').forEach((b) => {
      b.onclick = () => {
        const [s, i] = b.dataset.rmitem.split('|');
        DB.sections.removeItem(s, i);
        render();
      };
    });

    // Borrar sección
    wrap.querySelectorAll('[data-rmsec]').forEach((b) => {
      b.onclick = () => {
        if (confirm('¿Eliminar esta sección y todos sus elementos?')) {
          DB.sections.remove(b.dataset.rmsec);
          App.toast('Sección eliminada');
          render();
        }
      };
    });
  }

  function init() {
    document.getElementById('openSectionForm').onclick = openForm;
  }

  return { init, render, openForm };
})();
