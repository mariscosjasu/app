/* ============================================================
   settings.js — Pantalla de Configuración
   Negocio · Módulos (mostrar/renombrar/reordenar) · Mis secciones ·
   Seguridad (PIN + huella) · Respaldo (exportar/importar/borrar)
   ============================================================ */

const Settings = (() => {

  /* ---------- Render principal ---------- */
  function render() {
    const root = document.getElementById('settingsContent');
    if (!root) return;
    const s = DB.settings.get();
    root.innerHTML = '';
    root.appendChild(cardModules(s));
    root.appendChild(cardSections());
    root.appendChild(cardSecurity(s));
    root.appendChild(cardBackup());
  }

  function card(title, hint) {
    const c = document.createElement('div');
    c.className = 'card settings-card';
    c.innerHTML = `<h3 class="settings-title">${title}</h3>${hint ? `<p class="settings-hint">${hint}</p>` : ''}`;
    return c;
  }

  /* ---------- 1. Negocio (removido por preferencia del usuario) ---------- */

  /* ---------- 2. Módulos ---------- */
  function cardModules(s) {
    const c = card('🧩 Módulos', 'Muestra u oculta, renombra, reordena y crea módulos para la barra inferior.');
    const icons = { finance: '💰', inventory: '📦', sections: '🗂️', tips: '💡' };
    s.modules.forEach((m, idx) => {
      const emoji = m.custom ? (m.emoji || '🗂️') : (icons[m.key] || '•');
      const row = document.createElement('div');
      row.className = 'module-row';
      row.innerHTML = `
        <div class="module-order">
          <button class="dyn-icon-btn" data-up="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="dyn-icon-btn" data-down="${idx}" ${idx === s.modules.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <span class="module-emoji">${emoji}</span>
        <input type="text" class="module-name" data-name="${idx}" value="${attr(m.label)}" />
        ${m.custom ? `<button class="dyn-icon-btn" data-delmod="${m.key}" title="Eliminar módulo">🗑️</button>` : ''}
        <label class="switch">
          <input type="checkbox" data-vis="${idx}" ${m.visible ? 'checked' : ''} />
          <span class="slider"></span>
        </label>`;
      c.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary full';
    addBtn.style.marginTop = '12px';
    addBtn.textContent = '+ Agregar módulo';
    addBtn.onclick = openAddModule;
    c.appendChild(addBtn);

    // Handlers
    c.querySelectorAll('[data-up]').forEach((b) => {
      b.onclick = () => moveModule(parseInt(b.dataset.up, 10), -1);
    });
    c.querySelectorAll('[data-down]').forEach((b) => {
      b.onclick = () => moveModule(parseInt(b.dataset.down, 10), 1);
    });
    c.querySelectorAll('[data-vis]').forEach((chk) => {
      chk.onchange = () => {
        const i = parseInt(chk.dataset.vis, 10);
        const mods = DB.settings.get().modules;
        mods[i].visible = chk.checked;
        DB.settings.setModules(mods);
        App.renderNav();
      };
    });
    c.querySelectorAll('[data-name]').forEach((inp) => {
      inp.onchange = () => {
        const i = parseInt(inp.dataset.name, 10);
        const mods = DB.settings.get().modules;
        mods[i].label = inp.value.trim() || mods[i].key;
        DB.settings.setModules(mods);
        App.renderNav();
      };
    });
    c.querySelectorAll('[data-delmod]').forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.delmod;
        if (confirm('¿Eliminar este módulo y todas sus secciones?')) {
          const mods = DB.settings.get().modules.filter((m) => m.key !== key);
          DB.settings.setModules(mods);
          DB.sections.removeByModule(key);
          App.renderNav();
          App.toast('Módulo eliminado');
          App.goto('home');
        }
      };
    });
    return c;
  }

  /* ---------- Agregar módulo nuevo ---------- */
  const MODULE_EMOJIS = ['🗂️', '📒', '🧾', '👥', '🍽️', '📦', '🚚', '📞', '⭐', '🎯', '🧰', '📅'];
  function openAddModule() {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="modForm">
        <div class="field">
          <label>Ícono</label>
          <div class="emoji-row" id="modEmojiRow">
            ${MODULE_EMOJIS.map((e, i) => `<button type="button" class="emoji-pick ${i === 0 ? 'sel' : ''}" data-emoji="${e}">${e}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Nombre del módulo</label>
          <input type="text" id="modName" placeholder="Ej. Proveedores, Recetas, Pedidos…" required autofocus />
        </div>
        <p class="settings-hint">Aparecerá como una pestaña nueva en la barra inferior, donde podrás crear listas y recordatorios.</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="modCancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Crear módulo</button>
        </div>
      </form>`;
    App.openModal('🧩 Nuevo módulo', body);

    let emoji = MODULE_EMOJIS[0];
    body.querySelectorAll('[data-emoji]').forEach((b) => {
      b.onclick = () => {
        emoji = b.dataset.emoji;
        body.querySelectorAll('.emoji-pick').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
      };
    });

    body.querySelector('#modCancel').onclick = App.closeModal;
    body.querySelector('#modForm').onsubmit = (e) => {
      e.preventDefault();
      const label = body.querySelector('#modName').value.trim();
      if (!label) { App.toast('Escribe un nombre'); return; }
      const mods = DB.settings.get().modules;
      const key = 'custom-' + DB.uid();
      mods.push({ key, label, emoji, visible: true, custom: true });
      DB.settings.setModules(mods);
      App.closeModal();
      App.renderNav();
      App.toast('✅ Módulo creado');
      App.goto(key);
    };
  }

  function moveModule(idx, dir) {
    const mods = DB.settings.get().modules;
    const ni = idx + dir;
    if (ni < 0 || ni >= mods.length) return;
    [mods[idx], mods[ni]] = [mods[ni], mods[idx]];
    DB.settings.setModules(mods);
    App.renderNav();
    render();
  }

  /* ---------- 3. Mis secciones ---------- */
  function cardSections() {
    const c = card('🗂️ Mis secciones', 'Renombra, reordena o elimina las secciones del módulo "Secciones".');
    const list = DB.sections.byModule(null);
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'empty-hint';
      p.textContent = 'Aún no tienes secciones.';
      c.appendChild(p);
    } else {
      list.forEach((sec, idx) => {
        const row = document.createElement('div');
        row.className = 'module-row';
        row.innerHTML = `
          <div class="module-order">
            <button class="dyn-icon-btn" data-secup="${sec.id}" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="dyn-icon-btn" data-secdown="${sec.id}" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
          </div>
          <span class="module-emoji">${sec.emoji}</span>
          <span class="module-name-static">${Finance.escapeHtml(sec.title)}</span>
          <button class="dyn-icon-btn" data-secedit="${sec.id}" title="Editar">✏️</button>
          <button class="dyn-icon-btn" data-secdel="${sec.id}" title="Eliminar">🗑️</button>`;
        c.appendChild(row);
      });
    }
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary full';
    addBtn.style.marginTop = '10px';
    addBtn.textContent = '+ Nueva sección';
    addBtn.onclick = () => Sections.openForm(null);
    c.appendChild(addBtn);

    c.querySelectorAll('[data-secup]').forEach((b) => {
      b.onclick = () => { DB.sections.move(b.dataset.secup, -1); render(); Sections.render(); };
    });
    c.querySelectorAll('[data-secdown]').forEach((b) => {
      b.onclick = () => { DB.sections.move(b.dataset.secdown, 1); render(); Sections.render(); };
    });
    c.querySelectorAll('[data-secedit]').forEach((b) => {
      b.onclick = () => {
        const sec = DB.sections.all().find((x) => x.id === b.dataset.secedit);
        if (sec) Sections.openEdit(sec);
      };
    });
    c.querySelectorAll('[data-secdel]').forEach((b) => {
      b.onclick = () => {
        if (confirm('¿Eliminar esta sección y todos sus elementos?')) {
          DB.sections.remove(b.dataset.secdel);
          App.toast('Sección eliminada');
          render();
          Sections.render();
        }
      };
    });
    return c;
  }

  /* ---------- 4. Seguridad ---------- */
  function cardSecurity(s) {
    const c = card('🔒 Bloqueo de la app', 'Protege la app con un PIN. Opcionalmente con huella / Face ID.');
    const sec = s.security;
    const hasPin = !!sec.pinHash;

    const wrap = document.createElement('div');
    if (!hasPin) {
      wrap.innerHTML = `<button class="btn btn-primary full" id="setPin">Activar bloqueo con PIN</button>`;
    } else {
      wrap.innerHTML = `
        <div class="lock-status ok">🔒 Bloqueo activado</div>
        <div class="settings-actions">
          <button class="btn btn-ghost" id="changePin">Cambiar PIN</button>
          <button class="btn btn-ghost danger-text" id="removePin">Quitar bloqueo</button>
        </div>
        <div class="bio-row">
          <div>
            <strong>Entrar con huella / Face ID</strong>
            <p class="settings-hint" id="bioHint" style="margin:2px 0 0">${Lock.biometricSupported() ? 'Si la activas, podrás entrar solo con tu huella.' : 'No disponible en este dispositivo o navegador.'}</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="bioToggle" ${sec.biometric ? 'checked' : ''} ${Lock.biometricSupported() ? '' : 'disabled'} />
            <span class="slider"></span>
          </label>
        </div>
        <button class="btn btn-ghost full" id="lockNow" style="margin-top:10px">Bloquear ahora</button>`;
    }
    c.appendChild(wrap);

    const setPinBtn = wrap.querySelector('#setPin');
    if (setPinBtn) setPinBtn.onclick = () => Lock.openSetPin(render);

    const changePinBtn = wrap.querySelector('#changePin');
    if (changePinBtn) changePinBtn.onclick = () => Lock.openSetPin(render);

    const removePinBtn = wrap.querySelector('#removePin');
    if (removePinBtn) removePinBtn.onclick = () => {
      if (confirm('¿Quitar el bloqueo? La app dejará de pedir PIN o huella.')) {
        DB.settings.setSecurity({ pinHash: null, biometric: false, credentialId: null });
        App.toast('Bloqueo desactivado');
        render();
      }
    };

    const bioToggle = wrap.querySelector('#bioToggle');
    if (bioToggle) bioToggle.onchange = async () => {
      if (bioToggle.checked) {
        try {
          await Lock.registerBiometric();
          App.toast('✅ Huella activada');
        } catch (err) {
          bioToggle.checked = false;
          App.toast('No se pudo activar: ' + (err.message || 'cancelado'));
        }
      } else {
        DB.settings.setSecurity({ biometric: false, credentialId: null });
        App.toast('Huella desactivada');
      }
      render();
    };

    const lockNowBtn = wrap.querySelector('#lockNow');
    if (lockNowBtn) lockNowBtn.onclick = () => Lock.show();

    return c;
  }

  /* ---------- 5. Respaldo ---------- */
  function cardBackup() {
    const c = card('💾 Respaldo de datos', 'Guarda una copia en archivo o restáurala. Útil para cambiar de teléfono.');
    const wrap = document.createElement('div');
    wrap.className = 'settings-actions-col';
    wrap.innerHTML = `
      <button class="btn btn-primary full" id="exportBtn">⬇️ Exportar datos (archivo)</button>
      <button class="btn btn-ghost full" id="importBtn">⬆️ Importar datos (archivo)</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden />
      <button class="btn btn-ghost full danger-text" id="resetBtn">🗑️ Borrar todos los datos</button>`;
    c.appendChild(wrap);

    wrap.querySelector('#exportBtn').onclick = () => {
      const data = DB.exportAll();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `jasu-respaldo-${fecha}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      App.toast('✅ Respaldo descargado');
    };

    const fileInput = wrap.querySelector('#importFile');
    wrap.querySelector('#importBtn').onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          DB.importAll(reader.result);
          App.toast('✅ Datos importados');
          App.refresh();
          Sections.render();
          App.renderNav();
          App.applyBranding();
          render();
        } catch (err) {
          App.toast('Archivo inválido');
        }
        fileInput.value = '';
      };
      reader.readAsText(file);
    };

    wrap.querySelector('#resetBtn').onclick = () => {
      if (confirm('¿Borrar TODOS los datos (finanzas, inventario, secciones y configuración)? Esta acción no se puede deshacer.')) {
        DB.resetAll();
        App.toast('Datos borrados');
        setTimeout(() => location.reload(), 600);
      }
    };
    return c;
  }

  /* ---------- utils ---------- */
  function attr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

  function init() { /* nada que inicializar de forma estática */ }

  return { init, render };
})();
