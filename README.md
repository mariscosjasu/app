# 🍲 El sazón de JASU

Aplicación **local y offline** para administrar un negocio de venta de comida. Funciona en
**Android, iPhone/iPad y computadora** desde el navegador, se puede **instalar como app**
y guarda **todos los datos en el propio dispositivo** (sin servidores ni nube).

---

## ✨ Funciones

| Módulo | Qué hace |
|---|---|
| 💰 **Registro Financiero** | Registra ventas (entradas) y gastos (salidas) con categoría y fecha. Calcula automáticamente la **ganancia neta**. Filtros por día / semana / mes / todo. |
| 📦 **Inventario** | Catálogo de insumos con cantidad y unidad (kg, garrafón, %, etc.). Botones rápidos **+/−**. **Alertas visuales** amarillo (bajo) y rojo (por agotarse) según el mínimo definido. |
| 🗂️ **Secciones dinámicas** | Crea tus propias listas: pendientes por comprar, recordatorios, tareas. Marca elementos como hechos. |
| 💡 **Consejos inteligentes** | Tarjetas rotativas con tips de **merma**, **perecederos**, **ahorro de gas/agua** y **administración**. Incluye "Consejo del día" en el inicio. |

---

## 🚀 Cómo usarla

### Opción 1 — Abrir directo (lo más simple)
Abre `index.html` con doble clic en tu navegador (Chrome, Edge, Safari…).
> Nota: para que funcione la instalación como app y el modo offline completo (Service Worker),
> conviene servirla por HTTP local (opción 2).

### Opción 2 — Servidor local (recomendado)
Desde la carpeta del proyecto, usa cualquiera de estos:

```bash
# Con Python (ya viene en Mac/Linux)
python3 -m http.server 8080

# o con Node
npx serve .
```

Luego abre **http://localhost:8080** en el navegador.

### Instalar como app 📲
- **Android / Chrome:** menú ⋮ → "Agregar a pantalla de inicio" / "Instalar app".
- **iPhone / Safari:** botón Compartir → "Agregar a inicio".
- **Computadora / Chrome o Edge:** ícono de instalar ⊕ en la barra de direcciones, o el botón **⬇️ Instalar** dentro de la app.

Una vez instalada, abre sin internet y se ve como una aplicación nativa.

---

## 📁 Estructura del proyecto

```
el-sazon-de-jasu/
├── index.html            # Estructura de la app (5 vistas)
├── manifest.json         # Metadatos PWA (nombre, íconos, colores)
├── service-worker.js     # Cache para uso 100% offline
├── README.md
├── css/
│   └── styles.css        # Diseño moderno, responsivo y táctil
├── icons/
│   ├── icon.svg          # Logo vectorial
│   ├── icon-192.png
│   └── icon-512.png
└── js/
    ├── db.js             # Capa de datos (localStorage)
    ├── tips-data.js      # Base de consejos
    ├── finance.js        # Módulo financiero
    ├── inventory.js      # Módulo de inventario
    ├── sections.js       # Secciones dinámicas
    ├── tips.js           # Consejos inteligentes
    └── app.js            # Navegación, inicio y lógica PWA
```

---

## 🧱 Tecnología

- **HTML + CSS + JavaScript** puro (sin frameworks, sin compilar).
- **PWA** (Progressive Web App): instalable y offline.
- **localStorage** para persistencia local de los datos.

### ¿Por qué esta tecnología?
Es la forma más sencilla de tener una sola base de código que corre en móvil y escritorio,
sin instalar SDKs ni tiendas de apps, y con los datos siempre dentro del dispositivo.

---

## 🎨 Personalización rápida

- **Logo:** reemplaza los archivos en `icons/` (mismos nombres) por tu logo real.
- **Colores:** edita las variables al inicio de `css/styles.css` (`--orange`, `--bg`, etc.).
- **Consejos:** agrega o edita tarjetas en `js/tips-data.js`.
- **Datos de ejemplo:** se siembran la primera vez (ingredientes y una lista). Se definen en `js/db.js` → `seedIfEmpty()`.

---

## 🔒 Privacidad
Toda la información (ventas, gastos, inventario, listas) se guarda **únicamente en tu dispositivo**.
No se envía nada a internet. Si borras los datos del navegador o desinstalas la app, se elimina la información.
> Sugerencia: para futuras versiones se puede añadir exportar/importar respaldo en archivo
> (ya existe la base con `DB.exportAll()`).
