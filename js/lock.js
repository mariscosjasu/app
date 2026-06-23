/* ============================================================
   lock.js — Bloqueo de la app con PIN y/o huella (Face ID)
   - PIN: se guarda como hash SHA-256 (no en texto plano).
   - Huella/Face ID: usa WebAuthn (requiere HTTPS, p. ej. GitHub Pages).
   - Bloqueo "sencillo": protege la entrada; los datos no se cifran.
   ============================================================ */

const Lock = (() => {

  /* ---------- Hash del PIN ---------- */
  async function sha256(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function isEnabled() {
    return !!DB.settings.get().security.pinHash;
  }

  function biometricSupported() {
    return !!(window.PublicKeyCredential && navigator.credentials && location.protocol === 'https:');
  }

  /* ---------- Conversión base64 <-> ArrayBuffer ---------- */
  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let str = '';
    bytes.forEach((b) => (str += String.fromCharCode(b)));
    return btoa(str);
  }
  function b64ToBuf(b64) {
    const str = atob(b64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes.buffer;
  }

  /* ---------- Registrar huella ---------- */
  async function registerBiometric() {
    if (!biometricSupported()) {
      throw new Error('Huella/Face ID no disponible (requiere HTTPS y un dispositivo compatible).');
    }
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: DB.settings.get().businessName || 'El sazón de JASU' },
        user: { id: userId, name: 'jasu-local', displayName: 'JASU' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
        attestation: 'none'
      }
    });
    if (!cred) throw new Error('No se pudo registrar la huella.');
    DB.settings.setSecurity({ biometric: true, credentialId: bufToB64(cred.rawId) });
    return true;
  }

  /* ---------- Verificar huella ---------- */
  async function verifyBiometric() {
    const sec = DB.settings.get().security;
    if (!sec.biometric || !sec.credentialId) throw new Error('Huella no configurada');
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: b64ToBuf(sec.credentialId) }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    if (!assertion) throw new Error('No verificado');
    return true;
  }

  /* ---------- Modal: definir / cambiar PIN ---------- */
  function openSetPin(onDone) {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="pinForm">
        <div class="field">
          <label>Nuevo PIN (4 a 8 dígitos)</label>
          <input type="password" id="pin1" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" autofocus />
        </div>
        <div class="field">
          <label>Repite el PIN</label>
          <input type="password" id="pin2" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" />
        </div>
        <p class="settings-hint">Si olvidas el PIN tendrás que borrar los datos para volver a entrar (el bloqueo es local).</p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="pinCancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar PIN</button>
        </div>
      </form>`;
    App.openModal('🔒 Definir PIN', body);
    body.querySelector('#pinCancel').onclick = App.closeModal;
    body.querySelector('#pinForm').onsubmit = async (e) => {
      e.preventDefault();
      const p1 = body.querySelector('#pin1').value.trim();
      const p2 = body.querySelector('#pin2').value.trim();
      if (!/^\d{4,8}$/.test(p1)) { App.toast('El PIN debe tener de 4 a 8 dígitos'); return; }
      if (p1 !== p2) { App.toast('Los PIN no coinciden'); return; }
      const hash = await sha256(p1);
      DB.settings.setSecurity({ pinHash: hash });
      App.closeModal();
      App.toast('✅ Bloqueo activado');
      if (typeof onDone === 'function') onDone();
    };
  }

  /* ---------- Pantalla de bloqueo ---------- */
  function show() {
    if (!isEnabled()) { hide(); return; }
    const ov = document.getElementById('lockScreen');
    if (!ov) return;
    ov.hidden = false;
    document.body.classList.add('locked');
    renderLock();
  }

  function hide() {
    const ov = document.getElementById('lockScreen');
    if (ov) ov.hidden = true;
    document.body.classList.remove('locked');
  }

  function renderLock() {
    const ov = document.getElementById('lockScreen');
    const s = DB.settings.get();
    const useBio = s.security.biometric && biometricSupported();
    ov.innerHTML = `
      <div class="lock-box">
        <img class="lock-logo" src="icons/icon.svg" alt="logo" width="72" height="72" />
        <h2 class="lock-title">${Finance.escapeHtml(s.businessName || 'El sazón de JASU')}</h2>
        <p class="lock-sub">App bloqueada</p>

        ${useBio ? `<button class="btn btn-primary full lock-bio" id="lockBioBtn">👆 Entrar con huella / Face ID</button>` : ''}

        <div class="lock-pin-area" ${useBio ? 'hidden' : ''} id="lockPinArea">
          <label class="lock-pin-label">Ingresa tu PIN</label>
          <input type="password" id="lockPinInput" class="lock-pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="••••" />
          <button class="btn btn-primary full" id="lockPinBtn">Entrar</button>
          <p class="lock-error" id="lockError" hidden>PIN incorrecto</p>
        </div>

        ${useBio ? `<button class="lock-alt" id="usePinLink">Usar PIN</button>` : ''}
      </div>`;

    const bioBtn = ov.querySelector('#lockBioBtn');
    if (bioBtn) bioBtn.onclick = async () => {
      try {
        await verifyBiometric();
        unlock();
      } catch (err) {
        App.toast('No se reconoció. Usa tu PIN.');
        const area = ov.querySelector('#lockPinArea');
        if (area) area.hidden = false;
      }
    };

    const usePinLink = ov.querySelector('#usePinLink');
    if (usePinLink) usePinLink.onclick = () => {
      ov.querySelector('#lockPinArea').hidden = false;
      ov.querySelector('#lockPinInput').focus();
    };

    const input = ov.querySelector('#lockPinInput');
    const tryPin = async () => {
      const hash = await sha256((input.value || '').trim());
      if (hash === DB.settings.get().security.pinHash) {
        unlock();
      } else {
        const err = ov.querySelector('#lockError');
        if (err) err.hidden = false;
        input.value = '';
        input.focus();
      }
    };
    ov.querySelector('#lockPinBtn').onclick = tryPin;
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); tryPin(); } };

    // Si hay huella, intentamos disparar el lector automáticamente (algunos navegadores lo permiten)
    if (useBio && bioBtn) {
      setTimeout(() => { bioBtn.focus(); }, 100);
    } else if (input) {
      setTimeout(() => input.focus(), 100);
    }
  }

  function unlock() {
    hide();
    if (typeof App !== 'undefined' && App.afterUnlock) App.afterUnlock();
  }

  function init() { /* sin inicialización estática */ }

  return { init, show, hide, isEnabled, biometricSupported, registerBiometric, openSetPin };
})();
