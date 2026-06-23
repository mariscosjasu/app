/* ============================================================
   db.js — Capa de datos local (localStorage)
   Toda la información vive en el dispositivo. Sin nube, sin servidores.
   ============================================================ */

const DB = (() => {
  const PREFIX = 'jasu:';

  // Claves de almacenamiento
  const KEYS = {
    transactions: PREFIX + 'transactions',
    ingredients: PREFIX + 'ingredients',
    sections: PREFIX + 'sections',
    settings: PREFIX + 'settings',
    seeded: PREFIX + 'seeded'
  };

  // Configuración por defecto (módulos, negocio y seguridad)
  const DEFAULT_SETTINGS = {
    businessName: 'El sazón de JASU',
    modules: [
      { key: 'finance', label: 'Finanzas', visible: true },
      { key: 'inventory', label: 'Inventario', visible: true },
      { key: 'sections', label: 'Secciones', visible: true },
      { key: 'tips', label: 'Consejos', visible: true }
    ],
    security: { pinHash: null, biometric: false, credentialId: null }
  };

  /* ---------- Lectura / escritura genérica ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Error leyendo', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando', key, e);
      alert('No se pudo guardar. El almacenamiento del dispositivo podría estar lleno.');
      return false;
    }
  }

  /* ---------- Utilidades ---------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ===================== TRANSACCIONES (Finanzas) ===================== */
  const transactions = {
    all() {
      return read(KEYS.transactions, []).sort((a, b) => b.date - a.date);
    },
    add(tx) {
      const list = read(KEYS.transactions, []);
      const item = {
        id: uid(),
        type: tx.type,                 // 'income' | 'expense'
        amount: Math.abs(Number(tx.amount) || 0),
        description: (tx.description || '').trim(),
        category: tx.category || '',
        date: tx.date || Date.now()
      };
      list.push(item);
      write(KEYS.transactions, list);
      return item;
    },
    remove(id) {
      write(KEYS.transactions, read(KEYS.transactions, []).filter((t) => t.id !== id));
    }
  };

  /* ===================== INGREDIENTES (Inventario) ===================== */
  const ingredients = {
    all() {
      return read(KEYS.ingredients, []).sort((a, b) => a.name.localeCompare(b.name));
    },
    add(ing) {
      const list = read(KEYS.ingredients, []);
      const item = {
        id: uid(),
        name: (ing.name || '').trim(),
        qty: Number(ing.qty) || 0,
        unit: ing.unit || 'pz',
        min: Number(ing.min) || 0,
        step: Number(ing.step) || 1,
        emoji: ing.emoji || '🥕'
      };
      list.push(item);
      write(KEYS.ingredients, list);
      return item;
    },
    update(id, patch) {
      const list = read(KEYS.ingredients, []);
      const idx = list.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      if (list[idx].qty < 0) list[idx].qty = 0;
      write(KEYS.ingredients, list);
      return list[idx];
    },
    adjust(id, delta) {
      const list = read(KEYS.ingredients, []);
      const idx = list.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      list[idx].qty = Math.max(0, Math.round((list[idx].qty + delta) * 1000) / 1000);
      write(KEYS.ingredients, list);
      return list[idx];
    },
    remove(id) {
      write(KEYS.ingredients, read(KEYS.ingredients, []).filter((i) => i.id !== id));
    },
    // Estado de stock: 'ok' | 'warn' | 'danger'
    status(ing) {
      if (ing.qty <= 0) return 'danger';
      if (ing.min > 0) {
        if (ing.qty <= ing.min) return 'danger';
        if (ing.qty <= ing.min * 1.5) return 'warn';
      }
      return 'ok';
    }
  };

  /* ===================== SECCIONES DINÁMICAS ===================== */
  const sections = {
    all() {
      return read(KEYS.sections, []);
    },
    add(sec) {
      const list = read(KEYS.sections, []);
      const item = {
        id: uid(),
        title: (sec.title || '').trim(),
        emoji: sec.emoji || '📝',
        items: []
      };
      list.push(item);
      write(KEYS.sections, list);
      return item;
    },
    remove(id) {
      write(KEYS.sections, read(KEYS.sections, []).filter((s) => s.id !== id));
    },
    addItem(sectionId, text) {
      const list = read(KEYS.sections, []);
      const sec = list.find((s) => s.id === sectionId);
      if (!sec) return;
      sec.items.push({ id: uid(), text: text.trim(), done: false });
      write(KEYS.sections, list);
    },
    toggleItem(sectionId, itemId) {
      const list = read(KEYS.sections, []);
      const sec = list.find((s) => s.id === sectionId);
      if (!sec) return;
      const it = sec.items.find((i) => i.id === itemId);
      if (it) it.done = !it.done;
      write(KEYS.sections, list);
    },
    removeItem(sectionId, itemId) {
      const list = read(KEYS.sections, []);
      const sec = list.find((s) => s.id === sectionId);
      if (!sec) return;
      sec.items = sec.items.filter((i) => i.id !== itemId);
      write(KEYS.sections, list);
    },
    update(id, patch) {
      const list = read(KEYS.sections, []);
      const sec = list.find((s) => s.id === id);
      if (!sec) return;
      if (patch.title !== undefined) sec.title = String(patch.title).trim();
      if (patch.emoji !== undefined) sec.emoji = patch.emoji;
      write(KEYS.sections, list);
    },
    move(id, dir) {
      const list = read(KEYS.sections, []);
      const idx = list.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const ni = idx + dir;
      if (ni < 0 || ni >= list.length) return;
      [list[idx], list[ni]] = [list[ni], list[idx]];
      write(KEYS.sections, list);
    },
    editItem(sectionId, itemId, text) {
      const list = read(KEYS.sections, []);
      const sec = list.find((s) => s.id === sectionId);
      if (!sec) return;
      const it = sec.items.find((i) => i.id === itemId);
      if (it) it.text = String(text).trim();
      write(KEYS.sections, list);
    }
  };

  /* ===================== CONFIGURACIÓN ===================== */
  const settings = {
    get() {
      const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      const saved = read(KEYS.settings, null);
      if (!saved) return base;
      const merged = { ...base, ...saved };
      merged.security = { ...base.security, ...(saved.security || {}) };
      // Conservar el orden guardado y agregar módulos nuevos que no existieran
      const known = base.modules;
      const savedMods = Array.isArray(saved.modules) ? saved.modules : [];
      const result = [];
      savedMods.forEach((m) => {
        const def = known.find((k) => k.key === m.key);
        if (def) result.push({ ...def, ...m });
      });
      known.forEach((k) => {
        if (!result.find((r) => r.key === k.key)) result.push({ ...k });
      });
      merged.modules = result;
      return merged;
    },
    set(patch) {
      const next = { ...settings.get(), ...patch };
      write(KEYS.settings, next);
      return next;
    },
    setModules(modules) {
      const cur = settings.get();
      cur.modules = modules;
      write(KEYS.settings, cur);
      return cur;
    },
    setSecurity(patch) {
      const cur = settings.get();
      cur.security = { ...cur.security, ...patch };
      write(KEYS.settings, cur);
      return cur;
    }
  };

  /* ===================== DATOS DE EJEMPLO (primera vez) ===================== */
  function seedIfEmpty() {
    if (read(KEYS.seeded, false)) return;

    // Ingredientes típicos del negocio
    const seedIngredients = [
      { name: 'Cebolla', qty: 5, unit: 'kg', min: 2, step: 0.5, emoji: '🧅' },
      { name: 'Tomate', qty: 4, unit: 'kg', min: 2, step: 0.5, emoji: '🍅' },
      { name: 'Chile', qty: 1.5, unit: 'kg', min: 1, step: 0.25, emoji: '🌶️' },
      { name: 'Agua', qty: 3, unit: 'garrafón', min: 2, step: 1, emoji: '💧' },
      { name: 'Gas', qty: 60, unit: '%', min: 25, step: 5, emoji: '🔥' }
    ];
    write(KEYS.ingredients, seedIngredients.map((i) => ({ id: uid(), ...i })));

    // Una sección de ejemplo
    write(KEYS.sections, [{
      id: uid(),
      title: 'Pendientes por comprar',
      emoji: '🛒',
      items: [
        { id: uid(), text: 'Servilletas', done: false },
        { id: uid(), text: 'Bolsas para llevar', done: false },
        { id: uid(), text: 'Limones', done: true }
      ]
    }]);

    write(KEYS.seeded, true);
  }

  /* ---------- Exportar / importar respaldo ---------- */
  function exportAll() {
    return JSON.stringify({
      app: 'El sazón de JASU',
      version: 1,
      transactions: read(KEYS.transactions, []),
      ingredients: read(KEYS.ingredients, []),
      sections: read(KEYS.sections, []),
      settings: read(KEYS.settings, null),
      exportedAt: Date.now()
    }, null, 2);
  }

  function importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (typeof data !== 'object' || data === null) throw new Error('Archivo inválido');
    if (Array.isArray(data.transactions)) write(KEYS.transactions, data.transactions);
    if (Array.isArray(data.ingredients)) write(KEYS.ingredients, data.ingredients);
    if (Array.isArray(data.sections)) write(KEYS.sections, data.sections);
    if (data.settings && typeof data.settings === 'object') write(KEYS.settings, data.settings);
    write(KEYS.seeded, true);
    return true;
  }

  function resetAll() {
    [KEYS.transactions, KEYS.ingredients, KEYS.sections, KEYS.settings, KEYS.seeded]
      .forEach((k) => localStorage.removeItem(k));
  }

  return { KEYS, uid, transactions, ingredients, sections, settings, seedIfEmpty, exportAll, importAll, resetAll };
})();
