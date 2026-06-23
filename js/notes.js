/* ============================================================
   notes.js — Notas por módulo, con fecha de creación/edición
   y recordatorio opcional con notificación.
   ============================================================ */

const Notes = (() => {

  // Recuerda en qué contenedor se mostró cada módulo (para re-render)
  const containers = {};

  function enabledFor(moduleKey) {
    const m = DB.settings.get().modules.find((x) => x.key === moduleKey);
    return m ? m.notes !== false : false;
  }

  /* ---------- Helpers de fecha ---------- */
  function fmt(ts) {
    return new Date(ts).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  function fmtShort(ts) {
    return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function toLocalInput(ts) {
    const d = new Date(ts);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  /* ---------- Render del recuadro de notas ---------- */
  function render(moduleKey, containerId) {
    if (containerId) containers[moduleKey] = containerId;
    const cid = containers[moduleKey];
    const wrap = document.getElementById(cid);
    if (!wrap) return;

    if (!enabledFor(moduleKey)) { wrap.innerHTML = ''; wrap.hidden = true; return; }
    wrap.hidden = false;

    const list = DB.notes.byModule(moduleKey);
    wrap.innerHTML = `
      <div class="notes-panel">
        <div class="notes-head">
          <span class="notes-title">📝 Notas</span>
          <button class="notes-add" data-addnote>+ Nota</button>
        </div>
        <div class="notes-list">
          ${list.length ? list.map(noteCard).join('') : '<p class="empty-hint">Sin notas. Agrega un detalle a tomar en cuenta o un recordatorio.</p>'}
        </div>
      </div>`;

    wrap.querySelector('[data-addnote]').onclick = () => openNote(moduleKey, null);
    wrap.querySelectorAll('[data-note]').forEach((el) => {
      el.onclick = () => {
        const note = DB.notes.all().find((n) => n.id === el.dataset.note);
        if (note) openNote(moduleKey, note);
      };
    });
  }

  function noteCard(n) {
    let rem = '';
    if (n.reminder) {
      const overdue = n.reminder <= Date.now();
      rem = `<span class="note-rem ${overdue ? 'overdue' : ''}">🔔 ${fmtShort(n.reminder)}</span>`;
    }
    const preview = Finance.escapeHtml(n.text.length > 90 ? n.text.slice(0, 90) + '…' : n.text);
    return `
      <button class="note-card" data-note="${n.id}">
        <span class="note-text">${preview}</span>
        <span class="note-meta">🗒️ ${fmtShort(n.createdAt)} ${rem}</span>
      </button>`;
  }

  /* ---------- Modal de nota (crear / editar) ---------- */
  function openNote(moduleKey, note) {
    const editing = !!note;
    const body = document.createElement('div');
    const hasRem = editing && note.reminder;
    body.innerHTML = `
      <form id="noteForm">
        <div class="field">
          <label>Nota</label>
          <textarea id="noteText" rows="4" placeholder="Detalle a tomar en cuenta, recordatorio o cambio por realizar…" required>${editing ? Finance.escapeHtml(note.text) : ''}</textarea>
        </div>
        ${editing ? `<p class="settings-hint note-dates">🗒️ Creada: ${fmt(note.createdAt)}${note.updatedAt && note.updatedAt !== note.createdAt ? `<br>✏️ Editada: ${fmt(note.updatedAt)}` : ''}</p>` : ''}
        <div class="field">
          <label class="switch-row">
            <span>🔔 Agregar recordatorio</span>
            <span class="switch"><input type="checkbox" id="remToggle" ${hasRem ? 'checked' : ''}/><span class="slider"></span></span>
          </label>
          <input type="datetime-local" id="remDate" value="${hasRem ? toLocalInput(note.reminder) : ''}" min="${toLocalInput(Date.now())}" ${hasRem ? '' : 'hidden'} />
          <p class="settings-hint" id="remHint" ${hasRem ? '' : 'hidden'}>Te avisaremos en esa fecha. Funciona mejor con la app instalada y permisos de notificación activados.</p>
        </div>
        <div class="form-actions">
          ${editing ? '<button type="button" class="btn btn-ghost danger-text" id="noteDelete">Eliminar</button>' : '<button type="button" class="btn btn-ghost" id="noteCancel">Cancelar</button>'}
          <button type="submit" class="btn btn-primary">${editing ? 'Guardar' : 'Agregar'}</button>
        </div>
      </form>`;

    App.openModal(editing ? '📝 Nota' : '📝 Nueva nota', body);

    const remToggle = body.querySelector('#remToggle');
    const remDate = body.querySelector('#remDate');
    const remHint = body.querySelector('#remHint');

    remToggle.onchange = async () => {
      const on = remToggle.checked;
      remDate.hidden = !on;
      remHint.hidden = !on;
      if (on) {
        if (!remDate.value) remDate.value = toLocalInput(Date.now() + 3600000); // +1h por defecto
        if (Notify.supported() && Notify.permission() === 'default') {
          const p = await Notify.requestPermission();
          if (p !== 'granted') App.toast('Sin permiso de notificaciones: el aviso saldrá al abrir la app.');
        } else if (Notify.permission() === 'denied') {
          App.toast('Notificaciones bloqueadas. El aviso saldrá al abrir la app.');
        }
      }
    };

    const cancelBtn = body.querySelector('#noteCancel');
    if (cancelBtn) cancelBtn.onclick = App.closeModal;

    const delBtn = body.querySelector('#noteDelete');
    if (delBtn) delBtn.onclick = () => {
      if (confirm('¿Eliminar esta nota?')) {
        Notify.cancel(note.id);
        DB.notes.remove(note.id);
        App.closeModal();
        App.toast('Nota eliminada');
        render(moduleKey);
      }
    };

    body.querySelector('#noteForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = body.querySelector('#noteText').value.trim();
      if (!text) { App.toast('Escribe algo en la nota'); return; }

      let reminder = null;
      if (remToggle.checked && remDate.value) {
        const t = new Date(remDate.value).getTime();
        if (!isNaN(t)) reminder = t;
      }

      const saved = editing
        ? DB.notes.update(note.id, { text, reminder })
        : DB.notes.add({ moduleKey, text, reminder });

      if (reminder) {
        if (Notify.permission() === 'default') await Notify.requestPermission();
        Notify.schedule(saved);
      } else if (editing) {
        Notify.cancel(note.id);
      }

      App.closeModal();
      App.toast(editing ? '✅ Nota guardada' : '✅ Nota agregada');
      render(moduleKey);
    };
  }

  function init() { /* sin inicialización estática */ }

  return { init, render, enabledFor };
})();
