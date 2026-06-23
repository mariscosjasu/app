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
    root.appendChild(cardBusiness(s));
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

  /* ---------- 1. Negocio ---------- */
  function cardBusiness(s) {
    const c = card('🏪 Negocio', 'El nombre aparece en el encabezado de la app.');
    const wrap = document.createElement('div');
    wrap.className = 'field';
    wrap.innerHTML = `
      <label>Nombre del negocio</label>
      <div class="inline-row">
        <input type="text" id="setBizName" value="${attr(s.businessName)}" />
        <button class="btn btn-primary" id="setBizSave">Guardar</button>
      </div>`;
    c.appendChild(wrap);
    wrap.querySelector('#setBizSave').onclick = () => {
      const name = wrap.querySelector('#setBizName').value.trim() || 'El sazón de JASU';
      DB.settings.set({ businessName: name });
      App.applyBranding();
      App.toast('✅ Nombre actualizado');
    };
    return c;
  }

  /* ---------- 2. Módulos ---------- */
  function cardModules(s) {
    const c = card('🧩 Módulos', 'Muestra u oculta, renombra y reordena las secciones fijas de la barra inferior.');
    const icons = { finance: '💰', inventory: '📦', sections: '🗂️', tips: '💡' };
    s.modules.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'module-row';
      row.innerHTML = `
        <div class="module-order">
          <button class="dyn-icon-btn" data-up="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button class="dyn-icon-btn" data-down="${idx}" ${idx === s.modules.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <span class="module-emoji">${icons[m.key] || '•'}</span>
        <input type="text" class="module-name" data-name="${idx}" value="${attr(m.label)}" />
        <label class="switch">
          <input type="checkbox" data-vis="${idx}" ${m.visible ? 'checked' : ''} />
          <span class="slider"></span>
        </label>`;
      c.appendChild(row);
    });

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
    return c;
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
    const c = card('🗂️ Mis secciones', 'Renombra, reordena o elimina tus secciones personalizadas.');
    const list = DB.sections.all();
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
    addBtn.onclick = () => Sections.openForm();
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
