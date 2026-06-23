/* ============================================================
   tips-data.js — Base de consejos de gestión gastronómica
   Categorías: merma | perecederos | ahorro | admin
   ============================================================ */

const TIPS = [
  // ---------- Optimización de merma ----------
  { cat: 'merma', catLabel: 'Merma', title: 'Aprovecha los recortes', body: 'Cáscaras de cebolla, tallos de cilantro y huesos sirven para preparar caldos base. Reduces desperdicio y das más sabor sin gastar de más.' },
  { cat: 'merma', catLabel: 'Merma', title: 'Porciona con báscula', body: 'Servir porciones medidas con báscula evita regalar comida de más y mantiene tus costos por platillo bajo control.' },
  { cat: 'merma', catLabel: 'Merma', title: 'Primero lo que entra, primero lo que sale', body: 'Aplica PEPS (FIFO): coloca lo más viejo al frente para usarlo antes y evitar que se eche a perder al fondo del refri.' },
  { cat: 'merma', catLabel: 'Merma', title: 'Registra lo que tiras', body: 'Anota durante una semana qué ingredientes terminan en la basura. Ese dato te dirá qué comprar en menor cantidad.' },
  { cat: 'merma', catLabel: 'Merma', title: 'Menú del día con sobrantes', body: 'Convierte ingredientes próximos a vencer en un platillo especial del día. Vendes lo que ibas a perder.' },

  // ---------- Control de perecederos ----------
  { cat: 'perecederos', catLabel: 'Perecederos', title: 'Etiqueta con fecha', body: 'Marca cada recipiente con la fecha de preparación o apertura. Sabrás de un vistazo qué usar primero.' },
  { cat: 'perecederos', catLabel: 'Perecederos', title: 'Respeta la cadena de frío', body: 'Refrigera carnes y lácteos por debajo de 4 °C. Cada hora fuera de temperatura acorta su vida útil y arriesga la salud.' },
  { cat: 'perecederos', catLabel: 'Perecederos', title: 'Compra perecederos seguido y poco', body: 'Mejor surtir verdura 2-3 veces por semana que llenar el refri una vez. Llega más fresca y desperdicias menos.' },
  { cat: 'perecederos', catLabel: 'Perecederos', title: 'Separa lo que madura rápido', body: 'Manzanas y plátanos liberan gas etileno y aceleran la maduración de lo que está cerca. Guárdalos aparte.' },
  { cat: 'perecederos', catLabel: 'Perecederos', title: 'Congela en porciones', body: 'Si compraste de más, congela en porciones individuales bien selladas. Descongelas solo lo que vas a usar.' },

  // ---------- Ahorro de gas / agua ----------
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Tapa las ollas', body: 'Cocinar con tapa puede reducir hasta un tercio el gas usado: el agua hierve más rápido y conservas el calor.' },
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Flama al tamaño de la olla', body: 'Si la flama rebasa el fondo de la olla, estás quemando gas que no calienta nada. Ajústala al diámetro.' },
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Revisa fugas de gas', body: 'Pasa agua con jabón por las conexiones: si burbujea, hay fuga. Reparar a tiempo es ahorro y seguridad.' },
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Reutiliza el agua de enjuague', body: 'El agua de lavar verduras sirve para trapear o regar. Pequeños ahorros diarios suman al final del mes.' },
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Descongela en el refri, no con agua', body: 'Planear la descongelación en refrigeración evita abrir la llave y desperdiciar litros de agua.' },
  { cat: 'ahorro', catLabel: 'Ahorro', title: 'Mantén limpios los quemadores', body: 'Un quemador tapado da flama amarilla e ineficiente. Límpialos para que la flama azul rinda más gas.' },

  // ---------- Administración del negocio ----------
  { cat: 'admin', catLabel: 'Administración', title: 'Separa el dinero del negocio', body: 'No mezcles la caja con tu dinero personal. Te dará una foto real de si el negocio gana o pierde.' },
  { cat: 'admin', catLabel: 'Administración', title: 'Conoce tu costo por platillo', body: 'Suma cuánto cuestan los ingredientes de cada platillo. Sin ese número no sabes si tu precio deja ganancia.' },
  { cat: 'admin', catLabel: 'Administración', title: 'Registra TODO, todos los días', body: 'Anotar ventas y gastos diarios toma 5 minutos y te evita sorpresas a fin de mes. La constancia es la clave.' },
  { cat: 'admin', catLabel: 'Administración', title: 'Identifica tu platillo estrella', body: 'Detecta qué se vende más y deja más ganancia. Promuévelo y asegúrate de nunca quedarte sin sus insumos.' },
  { cat: 'admin', catLabel: 'Administración', title: 'Aparta para imprevistos', body: 'Guarda un pequeño porcentaje de cada venta. Cuando falle el refri o suba el gas, no te tomará desprevenido.' },
  { cat: 'admin', catLabel: 'Administración', title: 'Escucha a tus clientes', body: 'Pregunta qué les gustaría encontrar. Ajustar el menú a lo que piden aumenta ventas sin gastar en publicidad.' }
];

const TIP_CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'merma', label: '🍂 Merma' },
  { key: 'perecederos', label: '🥬 Perecederos' },
  { key: 'ahorro', label: '💧 Ahorro' },
  { key: 'admin', label: '📊 Administración' }
];
