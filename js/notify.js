/* ============================================================
   notify.js — Notificaciones y recordatorios de notas
   - Mientras la app está abierta: revisa recordatorios vencidos y avisa.
   - Si el navegador soporta TimestampTrigger (Chrome/Android), además
     programa la notificación a nivel del sistema (puede salir con la app cerrada).
   - Sin servidor ni nube: todo es local.
   ============================================================ */

const Notify = (() => {

  function supported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  function permission() {
    return supported() ? Notification.permission : 'denied';
  }

  async function requestPermission() {
    if (!supported()) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try { return await Notification.requestPermission(); }
    catch (e) { return Notification.permission; }
  }

  function triggerSupported() {
    return typeof window !== 'undefined' && 'TimestampTrigger' in window;
  }

  function moduleName(key) {
    const m = DB.settings.get().modules.find((x) => x.key === key);
    return m ? m.label : 'JASU';
  }

  async function reg() {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      try { return await navigator.serviceWorker.ready; } catch (e) { return null; }
    }
    return null;
  }

  async function show(title, options) {
    const r = await reg();
    if (r && r.showNotification) {
      try { return r.showNotification(title, options); } catch (e) { /* sigue */ }
    }
    try { new Notification(title, options); } catch (e) { /* sin permiso o no soportado */ }
  }

  /* ---------- Programar recordatorio (OS, si se puede) ---------- */
  async function schedule(note) {
    if (!note || !note.reminder) return;
    if (permission() !== 'granted') return;
    const r = await reg();
    if (!r) return;
    const tag = 'note-' + note.id;
    try {
      const existing = await r.getNotifications({ tag, includeTriggered: true });
      existing.forEach((n) => n.close());
    } catch (e) { /* algunos navegadores no permiten includeTriggered */ }

    const opts = {
      body: note.text.slice(0, 140),
      tag,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { noteId: note.id, moduleKey: note.moduleKey }
    };
    if (triggerSupported()) {
      try {
        opts.showTrigger = new window.TimestampTrigger(note.reminder);
        await r.showNotification('🔔 Recordatorio · ' + moduleName(note.moduleKey), opts);
      } catch (e) { /* si falla, queda el chequeo en-app */ }
    }
  }

  async function cancel(noteId) {
    const r = await reg();
    if (!r) return;
    try {
      const ex = await r.getNotifications({ tag: 'note-' + noteId, includeTriggered: true });
      ex.forEach((n) => n.close());
    } catch (e) { /* nada */ }
  }

  /* ---------- Chequeo en-app de recordatorios vencidos ---------- */
  function checkDue() {
    let due = [];
    try { due = DB.notes.dueReminders(); } catch (e) { return; }
    due.forEach((n) => {
      show('🔔 Recordatorio · ' + moduleName(n.moduleKey), {
        body: n.text.slice(0, 140),
        tag: 'note-' + n.id,
        icon: 'icons/icon-192.png'
      });
      DB.notes.markNotified(n.id);
    });
    if (due.length && typeof App !== 'undefined') {
      App.toast('🔔 Tienes ' + due.length + ' recordatorio(s)');
      if (App.renderActiveNotes) App.renderActiveNotes();
    }
  }

  let timer = null;
  function startWatcher() {
    checkDue();
    if (timer) clearInterval(timer);
    timer = setInterval(checkDue, 60000); // cada minuto
  }

  function init() { /* sin inicialización estática */ }

  return { init, supported, permission, requestPermission, triggerSupported, schedule, cancel, checkDue, startWatcher };
})();
