/* ============================================================
   BAREMOS v5.8.40 - app.js COMPLETO
   ============================================================ */
const APP_VERSION = '5.8.40';

/* Control de versión de Términos y Condiciones */
const CURRENT_TERMS_VERSION = 1;

const State = {
  user: null,
  jornada: null,
  items: [],
  baremo: [],
  theme: 'light',
  currentVersion: null,
  histFilter: 'hoy',
  histSelected: new Set(),
  adminLoggedIn: false,
  adminReportType: 'diario',
  updateAvailable: false,
  mensaje200kMostrado: false,
  mensaje150kMostrado: false,
  mensaje125kMostrado: false,
  mensaje100kMostrado: false,
  metaAlcanzada: false
};

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => new Intl.NumberFormat('es-AR').format(n || 0);

/* ============================================================
   LÓGICA CENTRALIZADA DE RANGOS Y COLORES
   ============================================================ */
function getConfigDia(monto) {
  if (monto > 200000) return { cls: 'bg-gold', hex: '#D4AF37', nombre: 'Excelente (>200k)' };
  if (monto >= 150000) return { cls: 'bg-green-intense', hex: '#16a34a', nombre: 'Muy Bueno (≥150k)' };
  if (monto >= 125000) return { cls: 'bg-green-soft', hex: '#65a30d', nombre: 'Bueno (≥125k)' };
  if (monto >= 100000) return { cls: 'bg-yellow-green', hex: '#ca8a04', nombre: 'Regular (≥100k)' };
  return { cls: 'bg-red', hex: '#ef4444', nombre: 'Bajo (<100k)' };
}

function getConfigMes(monto) {
  if (monto <= 1500000) return { cls: 'tac-red', hex: '#ef4444', nombre: 'Bajo (≤1.5M)' };
  if (monto <= 2000000) return { cls: 'tac-yellow', hex: '#facc15', nombre: 'Regular (≤2M)' };
  if (monto <= 2500000) return { cls: 'tac-green-soft', hex: '#4ade80', nombre: 'Bueno (≤2.5M)' };
  if (monto < 3000000) return { cls: 'tac-green-intense', hex: '#22c55e', nombre: 'Muy Bueno (<3M)' };
  return { cls: 'tac-gold', hex: '#fbbf24', nombre: 'Excelente (≥3M)' };
}

/* ============================================================
   CONTENIDO MENÚ LEGAL (FUENTE DE VERDAD)
   ============================================================ */
const INFO_CONTENT = {
  privacidad: {
    title: "Política de Privacidad",
    html: `<h3>1. Introducción</h3><p>La presente Política de Privacidad describe cómo se gestiona la información dentro del sitio web BAREMO y su aplicación asociada. Este proyecto es un desarrollo 100% freelance, sin asociaciones comerciales ni vínculos con terceros.</p><h3>2. No recopilación de datos personales</h3><p>BAREMO no recopila, almacena ni procesa datos personales de los usuarios.</p><p>El sitio y la aplicación no solicitan información identificatoria, no registran actividad del usuario y no acceden a datos del dispositivo.</p><h3>3. Información local</h3><p>Toda la información que el usuario ingresa en la aplicación se mantiene localmente en su dispositivo, sin ser enviada ni almacenada en servidores externos.</p><h3>4. Cookies y tecnologías de seguimiento</h3><p>Este sitio no utiliza cookies, herramientas de análisis, publicidad, ni tecnologías de rastreo.</p><h3>5. Compartición de información</h3><p>Dado que no se recopilan datos, no existe ningún tipo de cesión, venta o transferencia de información a terceros.</p><h3>6. Seguridad</h3><p>Aunque no se manejan datos personales, se aplican medidas básicas de seguridad para garantizar el funcionamiento correcto del sitio y la aplicación.</p><h3>7. Actualizaciones</h3><p>BAREMO puede modificar esta política en cualquier momento. Las actualizaciones se publicarán en este sitio web.</p>`
  },
  terminos: {
    title: "Términos y Condiciones",
    html: `<h3>1. Aceptación</h3><p>Al utilizar el sitio o la aplicación BAREMO, el usuario acepta estos Términos y Condiciones. Si no está de acuerdo, debe abstenerse de utilizar el servicio.</p><h3>2. Descripción del servicio</h3><p>BAREMO es una herramienta destinada al control y registro de ganancias diarias para contratistas del rubro eléctrico.</p><p>El servicio se ofrece “tal cual”, sin garantías de disponibilidad continua o ausencia de errores.</p><h3>3. Uso permitido</h3><p>El usuario se compromete a utilizar el sitio y la aplicación de manera legal y responsable. Queda prohibido:</p><ul><li>Manipular o intentar acceder a funciones no autorizadas.</li><li>Utilizar el servicio para actividades ilícitas.</li><li>Realizar ingeniería inversa, descompilación o extracción del código fuente.</li></ul><h3>4. Responsabilidad</h3><p>BAREMO no se responsabiliza por:</p><ul><li>Errores derivados del uso incorrecto del servicio.</li><li>Pérdida de información almacenada localmente en el dispositivo del usuario.</li><li>Fallas técnicas, interrupciones o indisponibilidad del servicio.</li></ul><h3>5. Modificaciones</h3><p>Los presentes términos pueden actualizarse sin previo aviso. Las modificaciones se publicarán en este sitio.</p>`
  },
  legal: {
    title: "Aviso Legal",
    html: `<p>BAREMO es un proyecto independiente y freelance, sin asociaciones con empresas, entidades o marcas del sector eléctrico.</p><p>La información presentada en el sitio y la aplicación tiene fines operativos y organizativos para contratistas.</p><p>No se garantiza la exactitud de los cálculos o registros generados por el usuario, ya que cada contratista maneja sus propios Baremos y estos pueden variar.</p><p>El desarrollador no asume responsabilidad por decisiones comerciales tomadas a partir del uso de la aplicación.</p>`
  },
  contacto: {
    title: "Contacto",
    html: `<p>Para consultas, sugerencias o reportes relacionados con la aplicación BAREMO, podés comunicarte a:</p><p>📧 Email: <a href="mailto:contacto@baremo.app">contacto@baremo.app</a><br>🌐 Desarrollador: Proyecto freelance AKAPANCH0<br>📍 Ubicación: Buenos Aires, Argentina</p>`
  },
  nosotros: {
    title: "Sobre Nosotros",
    html: `<p>BAREMO es un proyecto desarrollado de manera 100% freelance, sin asociaciones comerciales ni vínculos con terceros.</p><p>Nuestro objetivo es ofrecer una herramienta simple, clara y eficiente para contratistas del rubro eléctrico, permitiendo registrar y controlar sus ganancias diarias, tareas realizadas y organización operativa.</p><p>Creemos en soluciones prácticas, livianas y sin complicaciones. Por eso, nuestra aplicación funciona de manera local, sin recopilar datos personales y sin depender de servidores externos.</p><p>BAREMO es independiente, transparente y diseñado para profesionales que necesitan una herramienta confiable para su trabajo diario.</p>`
  }
};

function showInfoModal(key) {
  const data = INFO_CONTENT[key];
  if (!data) return;
  const title = $('#modalInfoTitle');
  const content = $('#modalInfoContent');
  const modal = $('#modalInfo');
  if (title && content && modal) {
    title.textContent = data.title;
    content.innerHTML = data.html;
    modal.classList.add('show');
  }
}

/* ============================================================
   ZONAS Y MAPAS
   ============================================================ */
const ZONA_MAPAS = {
  'Trujui': { archivo: 'trujui.png', nombre: 'Trujui' },
  'Cuartel V': { archivo: 'cuartelv.png', nombre: 'Cuartel V' },
  'Moreno': { archivo: 'moreno.png', nombre: 'Moreno' },
  'Gral. Rodríguez': { archivo: 'gralrodriguez.png', nombre: 'Gral. Rodríguez' },
  'Tigre': { archivo: 'tigre.png', nombre: 'Tigre' },
  'San Martín': { archivo: 'sanmartin.png', nombre: 'San Martín' },
  'Olivos': { archivo: 'olivos.png', nombre: 'Olivos' },
  'Pilar-Escobar': { archivo: 'pilarescobar.png', nombre: 'Pilar-Escobar' }
};

function mostrarMapaZona(zona) {
  const container = $('#zonaMapaContainer');
  const img = $('#zonaMapaImg');
  const placeholder = $('#zonaMapaPlaceholder');
  const titulo = $('#zonaMapaTitulo');
  const nombre = $('#zonaMapaNombre');
  if (!container) return;
  if (!zona || !ZONA_MAPAS[zona]) {
    container.classList.remove('show');
    return;
  }
  const mapa = ZONA_MAPAS[zona];
  titulo.textContent = `Zona: ${mapa.nombre}`;
  nombre.textContent = mapa.nombre;
  img.style.display = 'none';
  placeholder.innerHTML = `<div><span class="zmp-ico">⏳</span><span>Cargando mapa...</span></div>`;
  placeholder.style.display = 'grid';
  container.classList.remove('show');
  void container.offsetWidth;
  const nuevaImg = new Image();
  nuevaImg.onload = () => {
    img.src = `maps/${mapa.archivo}`;
    img.style.display = 'block';
    placeholder.style.display = 'none';
    container.classList.add('show');
  };
  nuevaImg.onerror = () => {
    placeholder.innerHTML = `<div><span class="zmp-ico">⚠️</span><span>Mapa no disponible</span></div>`;
    placeholder.style.display = 'grid';
    container.classList.add('show');
  };
  nuevaImg.src = `maps/${mapa.archivo}`;
}

function setupMapaZona() {
  const s = $('#loginZona');
  if (s) s.addEventListener('change', e => mostrarMapaZona(e.target.value));
}

/* ============================================================
   FRASES MOTIVACIONALES
   ============================================================ */
const FRASES = ["Hoy es un nuevo día productivo","Tu esfuerzo es tu mayor recompensa","Cada tarea completada es un paso hacia el éxito","La disciplina vence al talento","Hacé que cada minuto cuente","El éxito es la suma de pequeños esfuerzos","Tu dedicación inspira a los demás","Cada baremo es una victoria","La constancia es la clave del progreso","Hoy vas a superar tus propios récords","El trabajo bien hecho no pasa desapercibido","Cada día es una nueva oportunidad","La excelencia es un hábito, no un acto","Tu compromiso marca la diferencia","Los grandes logros empiezan con un primer paso","La perseverancia convierte sueños en realidad","Hoy construyes el mañana que querés","Cada desafío es una oportunidad de crecer","Tu actitud define tu altitud","El esfuerzo de hoy es el éxito de mañana","Somos lo que hacemos día tras día","La pasión por el trabajo se nota en los resultados","Cada jornada es una página de tu historia","Tu determinación es tu superpoder","Los resultados llegan a quienes no se rinden","Hoy es el día perfecto para dar lo mejor","La calidad no es un acto, es un hábito","Cada meta alcanzada abre nuevas puertas","Tu trabajo duro tiene su recompensa","El éxito se construye día a día","Vos tenés el poder de hacer la diferencia","Cada tarea es una oportunidad de brillar","La motivación te pone en marcha, el hábito te mantiene","Hoy es tu día para destacar","El progreso, no la perfección, es lo que importa","Tu energía positiva transforma el entorno","Cada esfuerzo suma al gran objetivo","La acción es la clave fundamental de todo éxito","Vos podés lograr lo que te propongas","El trabajo en equipo multiplica los resultados","Cada día es una nueva chance de ser mejor","La dedicación abre todas las puertas","Tu constancia es admirada por todos","El éxito no es casualidad, es trabajo duro","Cada baremo completado es un logro personal","Hoy es un gran día para tener un gran día","La actitud positiva atrae resultados positivos","Tu esfuerzo construye tu futuro","Cada paso cuenta en el camino al éxito","La pasión convierte el trabajo en arte","Vos sos el arquitecto de tu propio destino","Cada jornada es una nueva aventura","El trabajo bien hecho es su propia recompensa","Tu compromiso inspira a todo el equipo","Hoy dejás huella con tu trabajo","La excelencia está en los detalles","Cada meta es un escalón hacia arriba","Tu esfuerzo diario construye grandes cosas","El éxito llega a quienes se preparan","Vos tenés todo lo necesario para triunfar","Cada día es una nueva página en blanco","La disciplina es el puente entre metas y logros","Tu trabajo es tu firma personal","Cada logro comienza con la decisión de intentarlo","El esfuerzo constante supera al talento natural","Hoy es el día de superar tus límites","Tu dedicación es la base de tu éxito","Cada tarea completada es una victoria","La paciencia y el esfuerzo todo lo pueden","Vos marcás la diferencia con tu trabajo","Cada día es una oportunidad de aprender","El éxito es la consecuencia del esfuerzo","Tu trabajo habla por vos","Cada jornada es un paso hacia la meta","La fortaleza viene de superar desafíos","Cada logro es un motivo para celebrar","El trabajo duro supera al talento cuando el talento no trabaja duro","Tu esfuerzo de hoy construye tu éxito de mañana","La pasión por lo que hacés es tu mejor herramienta","Vos sos capaz de lograr cosas increíbles","Cada tarea es una oportunidad de demostrar tu valor","El éxito se mide por el progreso, no por la perfección","Tu dedicación diaria hace la diferencia","Cada meta alcanzada es un nuevo comienzo","La actitud lo es todo","Vos escribís tu propia historia de éxito","El trabajo en equipo hace que los sueños funcionen","Tu esfuerzo es la semilla de tu éxito","Cada día es un regalo, por eso se llama presente","La perseverancia es la madre de la suerte","Vos tenés el poder de cambiar tu realidad","Cada tarea completada te acerca a tu meta","El coraje para continuar es lo que cuenta","Tu trabajo es tu mejor carta de presentación","Vos sos el protagonista de tu propia historia","Cada logro es un escalón hacia tu sueño","El esfuerzo de hoy es la tranquilidad de mañana","Tu compromiso es tu mayor fortaleza","Cada jornada es una nueva aventura por vivir","La dedicación convierte lo ordinario en extraordinario","El trabajo duro siempre paga","Tu esfuerzo diario construye tu legado","Cada día es una nueva oportunidad de triunfar","La pasión por el trabajo se refleja en los resultados","Vos sos la clave de tu propio éxito","Cada logro es un motivo de orgullo","El esfuerzo constante abre todas las puertas","Tu dedicación es tu mejor inversión","La actitud positiva es el primer paso al éxito","Cada tarea completada es un paso adelante","Tu esfuerzo es la base de tu futuro","La disciplina es la madre del éxito","Vos sos capaz de superar cualquier obstáculo","Cada logro es una celebración del esfuerzo","El trabajo duro convierte los sueños en realidad","La perseverancia es la clave de todo logro","Cada tarea es una oportunidad de demostrar tu capacidad","El éxito llega a quienes trabajan por él","La excelencia se logra con dedicación","Cada logro es un motivo para seguir adelante","El trabajo duro es el camino al éxito","Vos sos el autor de tu propio destino","El trabajo duro siempre da sus frutos","Tu dedicación es tu sello personal","La actitud positiva atrae cosas positivas","Cada tarea completada es una victoria personal","Hoy es un día para recordar","Tu esfuerzo marca la diferencia","Cada día cuenta en tu camino","La constancia es tu mejor aliada","Vos tenés todo lo que necesitás","El éxito está en tus manos","Cada jornada es una nueva oportunidad","Tu dedicación es admirable","La pasión te lleva lejos","Vos sos capaz de grandes cosas","El trabajo en equipo es tu fortaleza","Cada logro es un paso más","Tu esfuerzo inspira a otros","La excelencia es tu marca personal","Vos construís tu propio camino","Cada día es una nueva chance","Tu dedicación da frutos","El éxito es tu destino","Vos marcás la diferencia","Cada tarea es importante","Tu esfuerzo vale la pena","La perseverancia es tu fuerza","Vos sos un ejemplo a seguir","Cada logro te acerca a tu meta","Tu dedicación es tu mejor arma","El trabajo duro te define","Vos tenés el potencial","Cada día es una bendición","Tu esfuerzo construye tu futuro","La pasión es tu motor","Vos sos único y especial","Cada jornada es un regalo","Tu dedicación es tu legado","El éxito es tuyo","Vos podés con todo","Cada logro es una victoria","Tu esfuerzo es tu firma","La excelencia es tu hábito","Vos sos el mejor","Cada día es una oportunidad","Tu dedicación es tu fuerza","El éxito te espera","Vos sos imparable","Cada tarea es un paso","Tu esfuerzo es tu mejor inversión","La perseverancia es tu clave","Vos sos un ganador","Cada logro es tuyo","Tu dedicación es tu sello","El éxito es tu recompensa","Vos sos extraordinario","Cada día es para brillar","Tu esfuerzo es tu orgullo","La excelencia es tu camino","Vos sos inspirador","Cada jornada es una victoria","Tu dedicación es tu poder","El éxito está cerca","Vos sos capaz de todo","Cada logro es un triunfo","Tu esfuerzo es tu mejor aliado","La perseverancia es tu virtud","Vos sos un líder","Cada día es para crecer","Tu dedicación es tu fuerza interior","El éxito es tu destino final","Vos sos imbatible","Cada tarea es una oportunidad","Tu esfuerzo es tu mejor carta","La excelencia es tu marca","Vos sos un campeón","Cada logro es un escalón","Tu dedicación es tu mejor inversión","El éxito es tu recompensa merecida","Vos sos inolvidable","Cada día es una nueva página","Tu esfuerzo es tu mayor tesoro","La perseverancia es tu mejor amiga","Vos sos una estrella","Cada jornada es un nuevo comienzo","Tu dedicación es tu mejor legado","El éxito es tu destino asegurado","Vos sos una inspiración","Cada logro es una bendición","Tu esfuerzo es tu mejor inversión","La excelencia es tu sello personal","Vos sos un triunfador","Cada día es para destacar","Tu dedicación es tu mayor fortaleza","El éxito es tu recompensa","Vos sos un ejemplo","Cada tarea es una victoria","Tu esfuerzo es tu mejor aliado","La perseverancia es tu mejor virtud","Vos sos un genio","Cada logro es un paso al éxito","Tu dedicación es tu mejor inversión","El éxito es tu destino","Vos sos extraordinario","Cada día es una oportunidad de oro","Tu esfuerzo es tu mejor legado","La excelencia es tu mejor marca","Vos sos una leyenda","Cada jornada es una nueva aventura","Tu dedicación es tu mejor inversión","El éxito es tu destino asegurado","Vos sos un maestro","Cada logro es una bendición","Tu esfuerzo es tu mejor inversión","La perseverancia es tu mejor virtud","Vos sos un héroe","Cada día es para triunfar","Tu dedicación es tu mejor legado","El éxito es tu recompensa","Vos sos un líder nato"];

function obtenerFraseDelDia() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return FRASES[Math.floor((now - start) / 86400000) % FRASES.length];
}

function renderFraseMotivacional() {
  const c = $('#fraseContainer');
  if (c) c.innerHTML = `<div class="frase-card"><div class="frase-texto">${obtenerFraseDelDia()}</div><div class="frase-autor">— BAREMOS</div></div>`;
}

/* ============================================================
   MENSAJES SEGÚN UMBRALES DIARIOS
   ============================================================ */
const MENSAJES_100K = ["No es suficiente para Objetivo", "Vamos, tu puedes."];
const MENSAJES_125K = ["Estas cerca de tu objetivo", "Vamos, ya casi lo logras", "Vas Bien!", "Sigue así."];
const MENSAJES_150K = ["Sos el mejor", "Imparable!", "Que Grande! Objetivo Superado!", "Ve a descansar."];
const MENSAJES_200K = ["Imparable", "Tu esfuerzo tiene recompensa", "Nadie mejor que vos"];

function mostrarMensajeDiario(mensajes, bgColor) {
  const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];
  const el = document.createElement('div');
  el.className = 'mensaje-impulso';
  el.textContent = mensaje;
  if (bgColor) el.style.background = bgColor;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 100);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 500);
  }, 3500);
}

function mostrarMensaje100k() {
  State.mensaje100kMostrado = true;
  mostrarMensajeDiario(MENSAJES_100K, 'linear-gradient(135deg, #f59e0b, #d97706)');
}
function mostrarMensaje125k() {
  State.mensaje125kMostrado = true;
  mostrarMensajeDiario(MENSAJES_125K, 'linear-gradient(135deg, #22c55e, #16a34a)');
}
function mostrarMensaje150k() {
  State.mensaje150kMostrado = true;
  mostrarMensajeDiario(MENSAJES_150K, 'linear-gradient(135deg, #10b981, #047857)');
}
function mostrarMensaje200k() {
  State.mensaje200kMostrado = true;
  mostrarMensajeDiario(MENSAJES_200K, 'linear-gradient(135deg, #ffd700, #ff6b6b, #4ecdc4)');
  lanzarConfeti();
}

function lanzarConfeti() {
  let cont = document.querySelector('.confeti-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'confeti-container';
    document.body.appendChild(cont);
  }
  cont.innerHTML = '';
  const colores = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#f472b6', '#34d399'];
  for (let i = 0; i < 80; i++) {
    const conf = document.createElement('div');
    conf.className = 'confeti';
    conf.style.left = Math.random() * 100 + '%';
    conf.style.background = colores[Math.floor(Math.random() * colores.length)];
    conf.style.animationDelay = Math.random() * 2 + 's';
    conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
    conf.style.width = (Math.random() * 8 + 6) + 'px';
    conf.style.height = (Math.random() * 8 + 6) + 'px';
    conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    cont.appendChild(conf);
  }
  setTimeout(() => { cont.innerHTML = ''; }, 5000);
}

function lanzarBengalas() {
  const total = $('#totalGeneralCard');
  if (!total) return;
  const rect = total.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const colores = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#f472b6'];
  for (let b = 0; b < 3; b++) {
    setTimeout(() => {
      const bx = centerX + (Math.random() - 0.5) * rect.width;
      const by = centerY + (Math.random() - 0.5) * rect.height;
      for (let i = 0; i < 20; i++) {
        const bengala = document.createElement('div');
        bengala.className = 'bengala';
        bengala.style.left = bx + 'px';
        bengala.style.top = by + 'px';
        bengala.style.background = colores[Math.floor(Math.random() * colores.length)];
        const angle = (Math.PI * 2 * i) / 20;
        const distance = 60 + Math.random() * 40;
        bengala.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
        bengala.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
        document.body.appendChild(bengala);
        setTimeout(() => bengala.remove(), 2000);
      }
    }, b * 400);
  }
}

/* ============================================================
   FUNCIONES DE FECHA
   ============================================================ */
function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function ahora() { return new Date().toISOString(); }
function fechaLegible(f) {
  const [y,m,d] = f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fechaCorta(f) {
  const [y,m,d] = f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR');
}
function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function mesAnterior() {
  const d = new Date();
  d.setMonth(d.getMonth()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function nombreMes(ms) {
  const [y,m] = ms.split('-').map(Number);
  return new Date(y,m-1).toLocaleDateString('es-AR',{month:'long',year:'numeric'});
}
function diasDelMes(ms) {
  const [y,m] = ms.split('-').map(Number);
  return new Date(y,m,0).getDate();
}

/* ============================================================
   DÍAS HÁBILES ARGENTINA
   ============================================================ */
function calcularPascua(anio) {
  const a = anio % 19, b = Math.floor(anio/100), c = anio % 100;
  const d = Math.floor(b/4), e = b % 4, f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15) % 30;
  const i = Math.floor(c/4), k = c % 4, l = (32+2*e+2*i-h-k) % 7;
  const m = Math.floor((a+11*h+22*l)/451);
  const mes = Math.floor((h+l-7*m+114)/31);
  const dia = ((h+l-7*m+114) % 31) + 1;
  return new Date(anio, mes-1, dia);
}
function esFeriadoArgentino(fecha) {
  const d = fecha.getDate(), m = fecha.getMonth()+1, a = fecha.getFullYear();
  const fijos = [[1,1],[3,24],[5,1],[5,25],[6,20],[7,9],[8,17],[10,12],[11,20],[12,8],[12,25]];
  for (const [fm,fd] of fijos) {
    if (m===fm && d===fd) return true;
  }
  const pascua = calcularPascua(a);
  const vs = new Date(pascua);
  vs.setDate(vs.getDate()-2);
  if (fecha.toDateString() === vs.toDateString()) return true;
  const cl = new Date(pascua);
  cl.setDate(cl.getDate()-48);
  const cm = new Date(cl);
  cm.setDate(cm.getDate()+1);
  if (fecha.toDateString() === cl.toDateString() || fecha.toDateString() === cm.toDateString()) return true;
  return false;
}
function esDiaHabil(fecha) {
  const dow = fecha.getDay();
  return dow !== 0 && dow !== 6 && !esFeriadoArgentino(fecha);
}
function obtenerPosicionDiaHabil(fecha) {
  const m = fecha.getMonth(), a = fecha.getFullYear();
  const diasMes = new Date(a, m+1, 0).getDate();
  let count = 0;
  for (let dia = 1; dia <= diasMes; dia++) {
    const f = new Date(a, m, dia);
    if (esDiaHabil(f)) {
      count++;
      if (f.toDateString() === fecha.toDateString()) return count;
    }
  }
  return -1;
}
function esDiaRegistroQ2() {
  const hoyFecha = new Date();
  if (!esDiaHabil(hoyFecha)) return false;
  const pos = obtenerPosicionDiaHabil(hoyFecha);
  return pos >= 1 && pos <= 4;
}
function mesQuincenaActual() {
  return esDiaRegistroQ2() ? mesAnterior() : mesActual();
}
function obtenerSemanaDeFecha(fechaStr) {
  const [y,m,d] = fechaStr.split('-').map(Number);
  const fecha = new Date(y, m-1, d);
  const diaSemana = fecha.getDay();
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diffLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return {
    lunes: lunes.toISOString().slice(0,10),
    domingo: domingo.toISOString().slice(0,10)
  };
}

/* ============================================================
   UI HELPERS Y CONFIRMACIONES GLOBALES
   ============================================================ */
function toast(msg, type='info') {
  const w = $('.toast-wrap');
  if (!w) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':type==='warn'?'⚠️':'ℹ️'}</span><span>${msg}</span>`;
  w.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function confirmDialog(msg) {
  return new Promise(res => {
    const m = $('#modalConfirm');
    const activeModals = $$('.modal-backdrop.show').filter(mod => mod.id !== 'modalConfirm');
    activeModals.forEach(mod => mod.classList.remove('show'));

    $('#modalConfirmMsg').textContent = msg;
    m.classList.add('show');

    $('#confirmOk').onclick = () => {
      m.classList.remove('show');
      res(true);
    };
    
    $('#confirmCancel').onclick = () => {
      m.classList.remove('show');
      activeModals.forEach(mod => mod.classList.add('show'));
      res(false);
    };
  });
}

function parsePrecio(v) {
  if (typeof v === 'number' && !isNaN(v)) return v;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/[$€£\s]/g, '');
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc === -1 && ld === -1) return parseFloat(s) || 0;
  if (lc > ld) {
    const ac = s.slice(lc + 1);
    if (/^\d{1,2}$/.test(ac)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else s = s.replace(/,/g, '');
  return parseFloat(s) || 0;
}
function getField(r, ...keys) {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
  }
  const rk = Object.keys(r);
  for (const k of keys) {
    const found = rk.find(x => x.toLowerCase() === k.toLowerCase());
    if (found !== undefined) return r[found];
  }
  return '';
}

/* ============================================================
   SEGURIDAD - HASH SHA-256
   ============================================================ */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function getAdminPasswordHash() {
  const existing = await dbGet('config', 'adminPasswordHash');
  if (!existing) {
    const defaultHash = await sha256('Admin2026');
    await dbPut('config', { key: 'adminPasswordHash', value: defaultHash });
    return defaultHash;
  }
  return existing.value;
}

/* ============================================================
   SISTEMA DE ACTUALIZACIONES
   ============================================================ */
let swRegistration = null;

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js');
    
    if (swRegistration.waiting) {
        checkForUpdate(true);
    }

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          checkForUpdate(true);
        }
      });
    });
  } catch(e) { console.warn('[SW]', e); }
}

function isNewerVersion(remote, local) {
  const rParts = remote.split('.').map(Number);
  const lParts = local.split('.').map(Number);
  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function showUpdateNotification() {
  if (!State.updateAvailable || document.getElementById('updateNotification')) return;
  
  const notification = document.createElement('div');
  notification.id = 'updateNotification';
  notification.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: white; padding: 24px; border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 10000;
    max-width: 400px; width: 90%;
  `;
  notification.innerHTML = `
    <div style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
      <h3 style="margin: 0 0 12px 0; color: #0b3d91; font-size: 20px;">¡Actualización Disponible!</h3>
      <p style="margin: 0 0 20px 0; color: #5a6478; font-size: 14px; line-height: 1.5;">
        Hay una nueva versión de la aplicación disponible. ¿Deseás actualizar ahora?
      </p>
      <div style="display: flex; gap: 12px;">
        <button id="updateLaterBtn" style="flex: 1; padding: 12px; border: 1px solid #dfe4ee; background: white; color: #1a2238; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">Más tarde</button>
        <button id="updateNowBtn" style="flex: 1; padding: 12px; border: none; background: #0b3d91; color: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;">Actualizar ahora</button>
      </div>
    </div>
  `;
  document.body.appendChild(notification);
  
  document.getElementById('updateNowBtn').onclick = async () => {
    notification.remove();
    const btn = document.getElementById('updateNowBtn');
    if(btn) { btn.innerText = "Actualizando..."; btn.disabled = true; }
    
    try {
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage('SKIP_WAITING');
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) {
        await reg.unregister();
      }
      const keys = await caches.keys();
      for (let key of keys) {
        await caches.delete(key);
      }
    } catch(e) {}
    
    window.location.href = window.location.pathname + '?updated=true&t=' + Date.now();
  };
  
  document.getElementById('updateLaterBtn').onclick = () => {
    notification.remove();
    State.updateAvailable = false;
  };
}

function loadVersion() {
  State.currentVersion = APP_VERSION;
}

async function checkForUpdate(silent = false) {
  if (!silent) toast('Buscando actualizaciones...', 'info');
  try {
    if (swRegistration) await swRegistration.update();
    
    const r = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
    const remoteData = await r.json();
    
    if (isNewerVersion(remoteData.version, APP_VERSION)) {
      State.updateAvailable = true;
      showUpdateNotification();
    } else {
      if (!silent) toast(`Ya tenés la última versión (${APP_VERSION})`, 'success');
      State.updateAvailable = false;
    }
  } catch (e) {
    if (!silent) toast('Error al buscar actualizaciones', 'error');
  }
}

/* ============================================================
   TÉRMINOS Y PRIVACIDAD (CONTROL SEGURO)
   ============================================================ */
function getAcceptedTermsVersion() {
  try {
    return parseInt(localStorage.getItem('baremos_terms_version')) || 0;
  } catch(e) {
    console.warn('No se pudo leer localStorage para términos:', e);
    return 0;
  }
}

function setAcceptedTermsVersion() {
  try {
    localStorage.setItem('baremos_terms_version', CURRENT_TERMS_VERSION.toString());
  } catch(e) {
    console.warn('No se pudo guardar en localStorage:', e);
  }
}

function mostrarPopupTerminos() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  
  const modal = $('#modalTerms');
  const content = $('#termsModalContent');
  
  if (!modal) {
    console.error('CRÍTICO: No se encontró el modal de términos en el DOM.');
    continuarInicio();
    return;
  }
  
  if (content && INFO_CONTENT && INFO_CONTENT.terminos) {
    content.innerHTML = INFO_CONTENT.terminos.html;
  }
  
  modal.classList.add('show');
}

/* ============================================================
   INICIALIZACIÓN (FLUJO ESTRICTO Y PROTEGIDO)
   ============================================================ */
async function init() {
  try {
    await openDB();
    await loadTheme();
    await loadBaremo();
    loadVersion();
    const sv = $('#splashVersion');
    if (sv && State.currentVersion) sv.textContent = `v${State.currentVersion}`;
    await loadUser();
  } catch(e) {
    console.error('[Init Error]', e);
    toast('Error al cargar datos iniciales: ' + e.message, 'error');
  }
  
  setTimeout(() => {
    const splash = $('.splash');
    if (splash) splash.classList.add('hide');
    
    const acceptedVersion = getAcceptedTermsVersion();
    if (acceptedVersion < CURRENT_TERMS_VERSION) {
      mostrarPopupTerminos();
    } else {
      continuarInicio();
    }
  }, 800);
  
  try {
    await registerSW();
    setTimeout(() => checkForUpdate(true), 3000);
  } catch(e) {
    console.warn('[SW Error]', e);
  }
}

async function continuarInicio() {
  if (State.user) {
    try {
      await loadOrCreateJornada();
    } catch (e) {
      console.error('[Jornada Error]', e);
    }
    showApp();
  } else { 
    showLogin(); 
  }
}

async function loadTheme() {
  const c = await dbGet('config', 'theme');
  State.theme = c?.value || 'light';
  document.documentElement.setAttribute('data-theme', State.theme);
}
function toggleTheme() {
  State.theme = State.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', State.theme);
  dbPut('config', { key: 'theme', value: State.theme });
  toast(`Modo ${State.theme === 'light' ? 'claro' : 'oscuro'}`, 'success');
}

/* ============================================================
   NORMALIZACIÓN SEGURA Y CARGA DE BAREMOS PRECARGADOS
   ============================================================ */
async function loadBaremo() {
  let d = await dbGetAll('baremo');
  
  const normalizeArray = (arr) => {
    return arr.map(r => ({
      baremo: String(getField(r, 'BAREMO', 'baremo', 'Codigo', 'codigo', 'Código', 'CÓDIGO')).trim(),
      descripcion: String(getField(r, 'DESCRIPCION', 'descripcion', 'Descripción', 'Descripcion', 'DETALLE')).trim(),
      precio: parsePrecio(getField(r, 'PRECIO', 'precio', 'Precio', 'VALOR'))
    })).filter(r => r.baremo !== '' && r.baremo !== 'undefined');
  };

  let needsRepair = false;
  if (d.length > 0) {
    needsRepair = d.some(b => b.descripcion === undefined || b.precio === undefined);
  }

  if (d.length === 0 || needsRepair) {
    try {
      const r = await fetch('baremo.json', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        let arr = Array.isArray(j) ? j : (j.baremos || j.data || [j]);
        const norm = normalizeArray(arr);
        
        if (norm.length > 0) {
          if (needsRepair) {
            for (const o of d) {
              if (o.baremo) await dbDelete('baremo', o.baremo);
            }
          }
          for (const i of norm) await dbPut('baremo', i);
          d = await dbGetAll('baremo');
        }
      }
    } catch(e) {
      console.warn('Error cargando baremo.json:', e);
    }
  }
  
  State.baremo = normalizeArray(d);
}

async function updateBaremoFromFile(file) {
  const n = file.name.toLowerCase();
  let d = [];
  try {
    if (n.endsWith('.json')) d = JSON.parse(await file.text());
    else if (n.endsWith('.xlsx') || n.endsWith('.xls')) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellText: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      d = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
    } else { toast('Formato no soportado', 'error'); return; }
    const old = await dbGetAll('baremo');
    for (const o of old) await dbDelete('baremo', o.baremo);
    const norm = d.map(r => ({
      baremo: String(getField(r, 'BAREMO', 'baremo', 'Codigo', 'codigo', 'Código', 'CÓDIGO')).trim(),
      descripcion: String(getField(r, 'DESCRIPCION', 'descripcion', 'Descripción', 'Descripcion', 'DETALLE')).trim(),
      precio: parsePrecio(getField(r, 'PRECIO', 'precio', 'Precio', 'VALOR'))
    })).filter(r => r.baremo);
    if (!norm.length) { toast('Sin datos válidos', 'error'); return; }
    for (const i of norm) await dbPut('baremo', i);
    State.baremo = await dbGetAll('baremo');
    toast(`Baremo: ${norm.length} ítems`, 'success');
  } catch(e) { toast('Error', 'error'); }
}

async function loadUser() {
  const c = await dbGet('config', 'activeUser');
  if (c?.value) State.user = await dbGet('usuarios', c.value);
}

function showLogin() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $('#viewLogin')?.classList.add('active');
  const f = $('#loginForm');
  if (f) {
    f.onsubmit = async e => {
      e.preventDefault();
      const n = $('#loginNombre').value.trim();
      const l = $('#loginLegajo').value.trim();
      const z = $('#loginZona').value;
      if (!n || !l) { toast('Completá todos los campos', 'warn'); return; }
      if (!z) { toast('Seleccioná zona', 'warn'); return; }
      await dbPut('usuarios', { nombre: n, legajo: l, zona: z, creado: ahora() });
      await dbPut('config', { key: 'activeUser', value: l });
      State.user = { nombre: n, legajo: l, zona: z };
      $('#viewLogin').classList.remove('active');
      await loadOrCreateJornada();
      showApp();
      toast(`¡Bienvenido ${n}!`, 'success');
    };
  }
}

async function cerrarSesion() {
  if (!await confirmDialog('¿Cerrar sesión?\n\n⚠️ Deberás ingresar con NOMBRE y LEGAJO.\n\nTus datos se mantendrán.')) return;
  await dbPut('config', { key: 'activeUser', value: '' });
  State.user = null; State.jornada = null; State.items = [];
  const h = $('#headerUser');
  if (h) h.textContent = 'Ingresar';
  const hz = $('#headerUserZona');
  if (hz) hz.textContent = '';
  const bz = $('#btnChangeZona');
  if (bz) bz.style.display = 'none';
  
  $('#modalSwitchUser')?.classList.remove('show');
  showLogin();
  toast('Sesión cerrada', 'success');
}

async function eliminarUsuario(leg) {
  const u = await dbGet('usuarios', leg);
  if (!u) return;
  
  if (!await confirmDialog(`🗑️ ¿Eliminar "${u.nombre}"?\n\n⚠️ IRREVERSIBLE. Se borrarán jornadas, combustible, quincenas y perfil.`)) return;
  
  for (const j of await dbGetByIndex('jornadas', 'legajo', leg)) await dbDelete('jornadas', j.id);
  for (const c of await dbGetByIndex('combustible', 'legajo', leg)) await dbDelete('combustible', c.id);
  for (const q of await dbGetByIndex('quincenas', 'legajo', leg)) await dbDelete('quincenas', q.id);
  await dbDelete('usuarios', leg);
  
  if (State.user?.legajo === leg) {
    await dbPut('config', { key: 'activeUser', value: '' });
    State.user = null; State.jornada = null; State.items = [];
    $('#modalSwitchUser')?.classList.remove('show');
    showLogin();
    toast('Usuario eliminado', 'success');
  } else {
    toast(`${u.nombre} eliminado`, 'success');
    switchUser();
  }
}

async function switchUser() {
  const users = await dbGetAll('usuarios');
  const m = $('#modalSwitchUser');
  const lst = $('#userList');
  if (!lst) return;
  lst.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'jornada-item';
    const act = State.user?.legajo === u.legajo;
    div.innerHTML = `<div class="ji-left"><div class="fecha">${u.nombre} ${act ? '<span style="font-size:10px;background:var(--success-soft);color:var(--success);padding:2px 6px;border-radius:8px;margin-left:6px">ACTIVO</span>' : ''}</div><div class="meta">Legajo ${u.legajo} · ${u.zona || 'Sin zona'}</div></div><div class="user-actions"><button class="mini-btn logout" data-act="logout">🚪</button><button class="mini-btn del" data-act="del" data-legajo="${u.legajo}">🗑️</button><div style="font-size:20px;cursor:pointer" data-act="switch">➡️</div></div>`;
    div.onclick = async e => {
      const a = e.target.dataset.act || e.target.closest('[data-act]')?.dataset.act;
      const lg = e.target.dataset.legajo || e.target.closest('[data-legajo]')?.dataset.legajo;
      if (a === 'del') { e.stopPropagation(); await eliminarUsuario(lg); }
      else if (a === 'logout') { e.stopPropagation(); await cerrarSesion(); }
      else {
        State.user = u;
        await dbPut('config', { key: 'activeUser', value: u.legajo });
        m.classList.remove('show');
        await loadOrCreateJornada();
        showApp();
        toast(`Sesión: ${u.nombre}`, 'success');
      }
    };
    lst.appendChild(div);
  });
  const ab = document.createElement('button');
  ab.className = 'btn btn-primary';
  ab.style.marginTop = '10px';
  ab.innerHTML = '➕ Nuevo usuario';
  ab.onclick = () => { 
      m.classList.remove('show'); 
      showLogin(); 
  };
  lst.appendChild(ab);
  m.classList.add('show');
}

async function loadOrCreateJornada() {
  const f = hoy();
  const ex = await dbGetByIndex('jornadas', 'fechaLegajo', [f, State.user.legajo]);
  const ab = ex.filter(j => !j.cerrada);
  State.mensaje200kMostrado = false;
  State.mensaje150kMostrado = false;
  State.mensaje125kMostrado = false;
  State.mensaje100kMostrado = false;
  if (ab.length > 0) {
    State.jornada = ab[ab.length - 1];
    State.items = State.jornada.items || [];
    State.tareas = State.jornada.tareas || [];
  } else if (ex.length > 0) {
    if (await confirmDialog('Jornada cerrada hoy. ¿Crear nueva?')) await crearJornadaNueva();
    else { State.jornada = null; State.items = []; State.tareas = []; }
  } else await crearJornadaNueva();
}

async function crearJornadaNueva() {
  State.mensaje200kMostrado = false;
  State.mensaje150kMostrado = false;
  State.mensaje125kMostrado = false;
  State.mensaje100kMostrado = false;
  const j = { fecha: hoy(), horaInicio: ahora(), ultimaMod: ahora(), legajo: State.user.legajo, usuario: State.user.nombre, zona: State.user.zona, items: [], tareas: [], cerrada: false, total: 0 };
  j.id = await dbAdd('jornadas', j);
  State.jornada = j; State.items = []; State.tareas = [];
}

async function saveJornada() {
  if (!State.jornada) return;
  State.jornada.items = State.items;
  State.jornada.tareas = Array.isArray(State.tareas) ? State.tareas : (State.jornada.tareas || []);
  State.jornada.ultimaMod = ahora();
  State.jornada.total = State.items.reduce((a, i) => a + i.subtotal, 0);
  State.jornada.cantidadRegistros = State.items.length;
  State.jornada.cantidadItems = State.items.reduce((a, i) => a + i.cantidad, 0);
  await dbPut('jornadas', State.jornada);
}

async function cerrarJornada() {
  if (!State.jornada) { toast('No hay jornada', 'warn'); return; }
  if (!await confirmDialog('¿Cerrar jornada? No podrá editarse.')) return;
  State.jornada.cerrada = true;
  State.jornada.horaCierre = ahora();
  await saveJornada();
  toast('Jornada cerrada', 'success');
  State.jornada = null; State.items = []; State.tareas = [];
  await crearJornadaNueva();
  renderAll();
}

/* ============================================================
   SETUP REGISTRO (CON NORMALIZACIÓN DE BÚSQUEDA)
   ============================================================ */
function setupRegistro() {
  const input = $('#baremoInput');
  const lst = $('#searchList');
  const qtyInput = $('#qtyInput');
  if (!input || !lst || !qtyInput) return;
  let baremoSeleccionado = null;
  let ultimoTexto = '';
  
  function dest(t, q) {
    if (!q) return t;
    return String(t).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  
  function render(m) {
    if (!m.length) {
      lst.innerHTML = '<div class="sr-empty">❌ No encontrado</div>';
      lst.classList.add('show');
      return;
    }
    lst.innerHTML = m.slice(0, 10).map(b => `<div class="sr-item" data-code="${b.baremo}"><div class="sr-item-top"><span class="sr-code">${dest(String(b.baremo || ''), input.value)}</span><span class="sr-price">${fmt(b.precio)}</span></div><div class="sr-desc">${dest(String(b.descripcion || ''), input.value)}</div></div>`).join('');
    lst.querySelectorAll('.sr-item').forEach(el => {
      el.onclick = () => {
        const codigo = el.dataset.code;
        const encontrado = State.baremo.find(b => String(b.baremo) === codigo);
        if (encontrado) {
          baremoSeleccionado = encontrado;
          input.value = encontrado.baremo;
          ultimoTexto = encontrado.baremo;
          lst.classList.remove('show');
          qtyInput.focus();
          qtyInput.select();
          toast(`${encontrado.baremo} · ${fmt(encontrado.precio)}`, 'success');
        }
      };
    });
    lst.classList.add('show');
  }
  
  input.addEventListener('input', () => {
    const v = input.value.trim();
    if (v !== ultimoTexto) baremoSeleccionado = null;
    if (!v) { lst.classList.remove('show'); return; }
    
    const up = v.toUpperCase();
    const m = State.baremo.filter(b => {
        const cod = String(b.baremo || '').toUpperCase();
        const desc = String(b.descripcion || '').toUpperCase();
        return cod.includes(up) || desc.includes(up);
    }).sort((a, b) => {
        const codA = String(a.baremo || '').toUpperCase();
        const codB = String(b.baremo || '').toUpperCase();
        return (codA.startsWith(up) ? 0 : 1) - (codB.startsWith(up) ? 0 : 1);
    });
    
    const ex = State.baremo.find(b => String(b.baremo || '').toUpperCase() === up);
    if (ex) baremoSeleccionado = ex;
    render(m);
  });
  
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) lst.classList.remove('show');
  });
  
  function agregar() {
    if (!baremoSeleccionado) {
      const v = input.value.trim().toUpperCase();
      baremoSeleccionado = State.baremo.find(b => String(b.baremo || '').toUpperCase() === v);
    }
    if (!baremoSeleccionado) { toast('Seleccioná un baremo válido de la lista', 'warn'); input.focus(); return; }
    if (!State.jornada) { toast('No hay jornada activa', 'warn'); return; }
    
    const c = Math.max(1, parseInt(qtyInput.value) || 1);
    const newItem = {
      id: Date.now() + Math.random(),
      codigo: baremoSeleccionado.baremo,
      descripcion: baremoSeleccionado.descripcion,
      precio: baremoSeleccionado.precio,
      cantidad: c,
      subtotal: baremoSeleccionado.precio * c
    };
    State.items.push(newItem);
    saveJornada();
    renderItems();
    renderTotales();
    input.value = '';
    qtyInput.value = 1;
    lst.classList.remove('show');
    baremoSeleccionado = null;
    ultimoTexto = '';
    input.focus();
    toast(`Agregado x${c}`, 'success');
  }
  
  $('#btnAgregar').onclick = agregar;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!baremoSeleccionado) {
        const f = lst.querySelector('.sr-item');
        if (f) { f.click(); return; }
      }
      agregar();
    }
  });
  qtyInput.addEventListener('keydown', e => { if (e.key === 'Enter') agregar(); });
}

function renderItems() {
  const tb = $('#itemsBody');
  if (!tb) return;
  // Solo los baremos de la tarea en curso (los ya finalizados se muestran en TAREAS DEL DÍA)
  const pendientes = typeof itemsPendientes === 'function' ? itemsPendientes() : State.items;
  if (!pendientes.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-soft)">Sin registros</td></tr>';
    return;
  }
  tb.innerHTML = pendientes.map((it, i) => `<tr class="adding"><td class="hide-mob">${i + 1}</td><td><strong>${it.codigo}</strong></td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td><input type="number" min="1" class="qty-input" value="${it.cantidad}" data-id="${it.id}"></td><td><strong>${fmt(it.subtotal)}</strong></td><td><button class="del-btn" data-id="${it.id}">🗑️</button></td></tr>`).join('');
  tb.querySelectorAll('.qty-input').forEach(inp => {
    inp.onchange = async e => {
      const it = State.items.find(i => i.id === parseFloat(e.target.dataset.id));
      if (!it) return;
      it.cantidad = parseInt(e.target.value) || 1;
      it.subtotal = it.precio * it.cantidad;
      await saveJornada();
      renderTotales();
      e.target.closest('tr').children[5].innerHTML = `<strong>${fmt(it.subtotal)}</strong>`;
    };
  });
  tb.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async e => {
      const id = parseFloat(e.target.dataset.id);
      const ok = await confirmDialog('¿Eliminar?');
      if (!ok) return;
      State.items = State.items.filter(i => i.id !== id);
      await saveJornada();
      renderItems();
      renderTotales();
      toast('Eliminado', 'success');
    };
  });
}

function renderTotales() {
  const r = State.items.length;
  const it = State.items.reduce((a, i) => a + i.cantidad, 0);
  const t = State.items.reduce((a, i) => a + i.subtotal, 0);
  const tr = $('#totalRegs');
  if (tr) tr.textContent = fmtNum(r);
  const ti = $('#totalItems');
  if (ti) ti.textContent = fmtNum(it);
  const tg = $('#totalGeneral');
  if (tg) tg.textContent = fmt(t);
  const tgb = $('#totalGeneralBig');
  if (tgb) tgb.textContent = fmt(t);
  
  const tgc = $('#totalGeneralCard');
  if (tgc) {
    tgc.className = 'total-general';
    const cfg = getConfigDia(t);
    tgc.classList.add(cfg.cls);
    
    if (t > 200000) {
      tgc.classList.add('imparables');
      if (!State.mensaje200kMostrado) mostrarMensaje200k();
    } else if (t >= 150000) {
      tgc.classList.add('imparables');
      if (!State.mensaje150kMostrado) mostrarMensaje150k();
    } else if (t >= 125000) {
      if (!State.mensaje125kMostrado) mostrarMensaje125k();
    } else if (t >= 100000) {
      if (!State.mensaje100kMostrado) mostrarMensaje100k();
    }
  }
}

function showView(n) {
  if (!n) return;
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view${n}`)?.classList.add('active');
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === n));
  if (n === 'Dashboard') renderDashboard();
  if (n === 'Historial') renderHistorial();
  if (n === 'Combustible') renderCombustible();
  if (n === 'Quincenas') renderQuincenas();
  if (n === 'Ajustes') renderAjustes();
  if (n === 'Admin') renderAdmin();
  if (n === 'Inicio') renderFraseMotivacional();
}

function renderMiniCalendar() {
  const mc = $('#miniCalendar');
  if (!mc) return;
  const n = new Date();
  mc.innerHTML = `<div class="mc-day">${n.getDate()}</div><div class="mc-month">${['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][n.getMonth()]}</div>`;
}

function showApp() {
  if (!State.user) return;
  const h = $('#headerUser');
  const hz = $('#headerUserZona');
  const bz = $('#btnChangeZona');
  
  if (h) {
    h.textContent = `${State.user.nombre} · ${State.user.legajo}`;
  }
  if (hz && bz) {
    if (State.user.zona) {
      hz.textContent = State.user.zona;
      bz.style.display = 'inline-flex';
    } else {
      bz.style.display = 'none';
    }
  }
  
  renderMiniCalendar();
  renderAll();
  showView('Inicio');
}

function renderAll() { renderItems(); renderTotales(); if (typeof renderTareas === 'function') renderTareas(); }

async function renderHistorial() {
  const all = await dbGetAll('jornadas');
  let f = all.filter(j => j.legajo === State.user.legajo);
  if (State.histFilter === 'hoy') f = f.filter(j => j.fecha === hoy());
  else if (State.histFilter === 'mes') f = f.filter(j => j.fecha.startsWith(mesActual()));
  else if (State.histFilter === 'mesAnterior') f = f.filter(j => j.fecha.startsWith(mesAnterior()));
  f.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lst = $('#historialList');
  const ab = $('#histActionsBar');
  if (!lst) return;
  if (ab) {
    if (State.histSelected.size > 0) {
      ab.classList.add('show');
      $('#habCount').textContent = `${State.histSelected.size} seleccionada(s)`;
    } else {
      ab.classList.remove('show');
    }
  }
  if (!f.length) {
    lst.innerHTML = '<div class="empty"><div class="ico">📭</div><p>Sin jornadas</p></div>';
    return;
  }
  lst.innerHTML = f.map(j => {
    const is = State.histSelected.has(j.id);
    return `<div class="jornada-item ${is ? 'selected' : ''}" data-id="${j.id}"><div class="ji-left"><div class="fecha">${fechaCorta(j.fecha)}</div><div class="meta">${j.cantidadRegistros || 0} reg · ${j.cantidadItems || 0} ítems</div></div><div class="ji-right"><div class="total">${fmt(j.total || 0)}</div><div class="estado ${j.cerrada ? 'cerrada' : 'abierta'}">${j.cerrada ? 'CERRADA' : 'ABIERTA'}</div><div class="ji-actions"><div class="check-box ${is ? 'checked' : ''}" data-act="select" data-id="${j.id}"></div><button class="mini-btn view" data-act="view" data-id="${j.id}">👁️</button>${j.cerrada ? `<button class="mini-btn export" data-act="export" data-id="${j.id}">📄</button>` : ''}</div></div></div>`;
  }).join('');
  lst.querySelectorAll('[data-act="select"]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      const id = parseInt(el.dataset.id);
      if (State.histSelected.has(id)) State.histSelected.delete(id);
      else State.histSelected.add(id);
      renderHistorial();
    };
  });
  lst.querySelectorAll('[data-act="view"]').forEach(el => {
    el.onclick = e => { e.stopPropagation(); openJornada(parseInt(el.dataset.id)); };
  });
  lst.querySelectorAll('[data-act="export"]').forEach(el => {
    el.onclick = async e => { e.stopPropagation(); await exportarJornadaPDF(parseInt(el.dataset.id)); };
  });
  lst.querySelectorAll('.jornada-item').forEach(el => {
    el.onclick = () => openJornada(parseInt(el.dataset.id));
  });
}
function setHistFilter(f) {
  State.histFilter = f;
  State.histSelected.clear();
  $$('.hist-filtro-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  renderHistorial();
}
async function openJornada(id) {
  const j = await dbGet('jornadas', id);
  if (!j) return;
  $('#mjFecha').textContent = fechaLegible(j.fecha);
  $('#mjTotal').textContent = fmt(j.total);
  $('#mjMeta').textContent = `${j.cantidadRegistros || 0} reg · ${j.cantidadItems || 0} ítems · ${j.cerrada ? 'CERRADA' : 'ABIERTA'}`;
  $('#mjBody').innerHTML = (j.items || []).map((it, i) => `<tr><td class="hide-mob">${i + 1}</td><td>${it.codigo}</td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td>${it.cantidad}</td><td>${fmt(it.subtotal)}</td></tr>`).join('');
  if (typeof renderUbicacionesJornada === 'function') renderUbicacionesJornada(j);
  $('#modalJornada').classList.add('show');
}

function drawElegantHeader(doc, title, subtitle, rightText1, rightText2) {
  doc.setFillColor(11, 61, 145);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 14, 28);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(rightText1, 196, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(rightText2, 196, 28, { align: 'right' });
}

async function exportarJornadaPDF(id) {
  const j = await dbGet('jornadas', id);
  if (!j || !window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  drawElegantHeader(doc, "BAREMOS", `Jornada del ${fechaLegible(j.fecha)}`, State.user.nombre, `Legajo: ${State.user.legajo} | Zona: ${State.user.zona || '-'}`);
  
  const body = (j.items || []).map((it, i) => [i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
  doc.autoTable({
    startY: 45,
    head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
    body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 61, 145] },
    margin: { left: 14, right: 14 }
  });
  
  let y = doc.lastAutoTable.finalY + 10;
  // Bloque aditivo: ubicación de las tareas finalizadas (solo si la jornada las tiene)
  if (typeof agregarTablaUbicacionesPDF === 'function') {
    y = agregarTablaUbicacionesPDF(doc, j, y);
  }
  if (y > 250) { doc.addPage(); y = 25; }
  doc.setFillColor(11, 61, 145);
  doc.rect(14, y, 182, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL DEL DÍA: ${fmt(j.total || 0)}`, 18, y + 8);
  
  doc.save(`baremos_${j.fecha}_${j.legajo}.pdf`);
  toast('PDF generado', 'success');
}

async function exportarSeleccionadasPDF() {
  if (!State.histSelected.size) { toast('Seleccioná jornadas', 'warn'); return; }
  await exportarMultiplesPDF([...State.histSelected].sort((a, b) => a - b), 'seleccionadas');
}

async function exportarMesCompletoPDF() {
  const mes = State.histFilter === 'mesAnterior' ? mesAnterior() : mesActual();
  const j = (await dbGetAll('jornadas')).filter(j => j.legajo === State.user.legajo && j.cerrada && j.fecha.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!j.length) { toast('Sin jornadas en este mes', 'warn'); return; }
  await exportarMultiplesPDF(j.map(x => x.id), nombreMes(mes).replace(' ', '_'));
}

async function exportarMultiplesPDF(ids, nom) {
  if (!window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const jornadas = [];
  for (const id of ids) {
    const j = await dbGet('jornadas', id);
    if (j) jornadas.push(j);
  }
  jornadas.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mesLabel = nom !== 'seleccionadas' ? nom.replace('_', ' ').toUpperCase() : 'SELECCIÓN MÚLTIPLE';
  drawElegantHeader(doc, "BAREMOS", `Reporte de Producción: ${mesLabel}`, State.user.nombre, `Legajo: ${State.user.legajo} | Zona: ${State.user.zona || '-'}`);

  let currentY = 45;
  let totalAcu = 0;

  for (const j of jornadas) {
    if (currentY > 240) {
      doc.addPage();
      drawElegantHeader(doc, "BAREMOS", `Reporte de Producción: ${mesLabel} (Cont.)`, State.user.nombre, `Legajo: ${State.user.legajo} | Zona: ${State.user.zona || '-'}`);
      currentY = 45;
    }

    doc.setFillColor(240, 243, 249);
    doc.rect(14, currentY, 182, 8, 'F');
    doc.setTextColor(11, 61, 145);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`▶ Jornada: ${fechaLegible(j.fecha)}   |   Subtotal: ${fmt(j.total || 0)}`, 16, currentY + 6);
    currentY += 10;
    
    totalAcu += (j.total || 0);

    const body = (j.items || []).map((it, i) => [i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
    doc.autoTable({
      startY: currentY,
      head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
      body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 201] },
      margin: { left: 14, right: 14 }
    });
    
    currentY = doc.lastAutoTable.finalY + 6;
    if (typeof agregarTablaUbicacionesPDF === 'function') {
      currentY = agregarTablaUbicacionesPDF(doc, j, currentY);
    }
    currentY += 4;
  }

  if (currentY > 260) {
     doc.addPage();
     drawElegantHeader(doc, "BAREMOS", `Reporte de Producción: ${mesLabel} (Final)`, State.user.nombre, `Legajo: ${State.user.legajo} | Zona: ${State.user.zona || '-'}`);
     currentY = 45;
  }

  doc.setFillColor(11, 61, 145);
  doc.rect(14, currentY, 182, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL ACUMULADO: ${fmt(totalAcu)}`, 18, currentY + 8);

  doc.save(`baremos_${nom}_${State.user.legajo}.pdf`);
  toast(`Reporte exportado correctamente`, 'success');
  State.histSelected.clear();
  renderHistorial();
}

async function exportarMesExcel() {
  if (!window.XLSX) return;
  const mes = State.histFilter === 'mesAnterior' ? mesAnterior() : mesActual();
  const j = (await dbGetAll('jornadas')).filter(x => x.legajo === State.user.legajo && x.cerrada && x.fecha.startsWith(mes)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!j.length) { toast('Sin jornadas', 'warn'); return; }
  const wb = XLSX.utils.book_new();
  const res = j.map(x => ({ Fecha: fechaCorta(x.fecha), Usuario: x.usuario, Total: x.total || 0 }));
  res.push({});
  res.push({ Fecha: 'TOTAL', Total: j.reduce((a, x) => a + (x.total || 0), 0) });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res), 'Resumen');
  j.forEach(x => {
    const d = (x.items || []).map((it, i) => ({ '#': i + 1, Código: it.codigo, Descripción: it.descripcion, Precio: it.precio, Cantidad: it.cantidad, Subtotal: it.subtotal }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), `Dia_${x.fecha}`.substring(0, 31));
  });
  XLSX.writeFile(wb, `baremos_${nombreMes(mes).replace(' ', '_')}.xlsx`);
  toast('Excel generado', 'success');
}

async function renderDashboard() {
  const leg = State.user.legajo;
  const mes = mesActual();
  const mesAnt = mesAnterior();
  const todas = (await dbGetAll('jornadas')).filter(j => j.legajo === leg && j.cerrada);
  const jMes = todas.filter(j => j.fecha.startsWith(mes));
  const jAnt = todas.filter(j => j.fecha.startsWith(mesAnt));
  const comb = (await dbGetAll('combustible')).filter(c => c.legajo === leg);
  const quinc = (await dbGetAll('quincenas')).filter(q => q.legajo === leg);
  
  const dias = jMes.length;
  const tot = jMes.reduce((a, j) => a + (j.total || 0), 0);
  const prom = dias ? tot / dias : 0;
  const tTrab = jMes.reduce((a, j) => a + (j.cantidadRegistros || 0), 0);
  
  const bc = {}, bf = {};
  jMes.forEach(j => (j.items || []).forEach(it => {
    bc[it.codigo] = (bc[it.codigo] || 0) + it.cantidad;
    bf[it.codigo] = (bf[it.codigo] || 0) + it.subtotal;
  }));
  const tu = Object.entries(bc).sort((a, b) => b[1] - a[1])[0];
  const tf = Object.entries(bf).sort((a, b) => b[1] - a[1])[0];
  let mx = null, mn = null;
  jMes.forEach(j => {
    if (!mx || j.total > mx.total) mx = j;
    if (!mn || j.total < mn.total) mn = j;
  });

  const dHoy = hoy();
  const jornadasPasadas = todas.filter(j => j.fecha < dHoy).sort((a,b) => b.fecha.localeCompare(a.fecha));
  const prodAyer = jornadasPasadas.length ? (jornadasPasadas[0].total || 0) : 0;
  const fecAyer = jornadasPasadas.length ? `(${fechaCorta(jornadasPasadas[0].fecha)})` : '';
  
  $('#statDiaAnterior').textContent = fmt(prodAyer);
  $('#lblFechaAyer').textContent = fecAyer;

  const dac = $('#cardDiaAnterior');
  if (dac) {
    dac.className = 'stat-card dac-interactive';
    const cfgAyer = getConfigDia(prodAyer);
    dac.classList.add(cfgAyer.cls);
  }

  const cMin = $('#cardMinDia');
  if (cMin) {
    cMin.className = 'stat-card dac-interactive';
    const prodMin = mn ? (mn.total || 0) : 0;
    const cfgMin = getConfigDia(prodMin);
    cMin.classList.add(cfgMin.cls);
  }
  
  const combMes = comb.filter(c => c.mes === mes);
  const cMesDesc = combMes.filter(c => c.descontar !== false).reduce((a, c) => a + c.monto, 0);
  const cMesNoDesc = combMes.filter(c => c.descontar === false).reduce((a, c) => a + c.monto, 0);

  const q1A = quinc.find(q => q.mes === mes && q.tipo === 1);
  const q1Tot = (q1A && q1A.bloqueada) ? q1A.total : 0;

  let q2Tot = 0;
  let q2Label = 'Q2';
  if (esDiaRegistroQ2()) {
    const q2Ant = quinc.find(q => q.mes === mesAnt && q.tipo === 2);
    q2Tot = (q2Ant && q2Ant.bloqueada) ? q2Ant.total : 0;
    q2Label = `Q2 ${nombreMes(mesAnt)}`;
  } else {
    const q2A = quinc.find(q => q.mes === mes && q.tipo === 2);
    q2Tot = (q2A && q2A.bloqueada) ? q2A.total : 0;
    q2Label = `Q2`;
  }

  const saldoFinal = tot - cMesDesc - q1Tot - q2Tot;
  const pAnt = jAnt.reduce((a, j) => a + (j.total || 0), 0);
  
  const tacCard = $('#tacCard');
  if (tacCard) {
    const meta = 3000000;
    const progreso = Math.max(0, Math.min((tot / meta) * 100, 100));
    const faltan = Math.max(meta - tot, 0);

    $('#tacAmount').textContent = fmt(tot);
    $('#tacProgressBar').style.width = progreso + '%';
    $('#tacProgressText').textContent = `Progreso: ${progreso.toFixed(1)}%`;
    $('#tacFaltanText').textContent = `Faltan: ${fmt(faltan)}`;

    const overlay = $('#tacOverlayMsg');
    const cfgMes = getConfigMes(tot);
    tacCard.className = 'total-acumulado-card ' + cfgMes.cls;
    if(overlay) overlay.classList.remove('show');

    if (tot <= 1500000) {
      // red
    } else if (tot <= 2000000) {
      // yellow
    } else if (tot <= 2500000) {
      if(overlay){ overlay.textContent = '👏 ¡Sigue así!'; overlay.classList.add('show'); }
    } else if (tot < 3000000) {
      if(overlay){ overlay.textContent = '🚀 Excelente rendimiento'; overlay.classList.add('show'); }
    } else {
      if(overlay){ overlay.textContent = '🏆 ¡Sos Imparable!'; overlay.classList.add('show'); }
      if (!State.metaAlcanzada) {
        lanzarConfeti();
        lanzarBengalas();
        State.metaAlcanzada = true;
      }
    }
    if (tot < 3000000) State.metaAlcanzada = false;
  }

  const s = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  s('statDias', fmtNum(dias));
  s('statProm', fmt(prom));
  s('statTrabajos', fmtNum(tTrab));
  s('statBaremos', fmtNum(Object.keys(bc).length));
  s('statTopUso', tu ? `${tu[0]} (${tu[1]})` : '-');
  s('statTopFact', tf ? `${tf[0]} · ${fmt(tf[1])}` : '-');
  s('statMaxDia', mx ? `${fechaCorta(mx.fecha)} · ${fmt(mx.total)}` : '-');
  s('statMinDia', mn ? `${fechaCorta(mn.fecha)} · ${fmt(mn.total)}` : '-');
  s('statMesAnterior', fmt(pAnt));
  
  const am = $('#statCobrar');
  const det = $('#statCobrarDetail');
  if(am) {
    am.textContent = fmt(saldoFinal);
    am.style.color = saldoFinal < 0 ? '#fca5a5' : '';
  }
  if(det) det.innerHTML = `
    <div class="pc-line"><span>Producción ${nombreMes(mes)}</span><span>${fmt(tot)}</span></div>
    <div class="pc-line"><span>− Gasto de Combustible</span><span style="color: #fca5a5;">${fmt(cMesDesc)}</span></div>
    <div class="pc-line" style="color: #e2e8f0;"><span>ℹ️ Comb. Sin Descuento</span><span style="font-weight: 700;">${fmt(cMesNoDesc)}</span></div>
    <div class="pc-line"><span>− Q1</span><span style="color: #fca5a5;">${q1Tot > 0 ? fmt(q1Tot) : '0 (Pend.)'}</span></div>
    <div class="pc-line"><span>− ${q2Label}</span><span style="color: #fca5a5;">${q2Tot > 0 ? fmt(q2Tot) : '0 (Pend.)'}</span></div>
    <div class="pc-line total"><span>= Saldo Final</span><span style="${saldoFinal < 0 ? 'color:#fca5a5;' : 'color:#bbf7d0;'}">${fmt(saldoFinal)}</span></div>
  `;

  renderCharts(todas);
}

function setupCombustible() {
  const f = $('#formComb');
  if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    const p = $('#combPatente').value.trim().toUpperCase();
    const m = parseFloat($('#combMonto').value) || 0;
    const checkbox = $('#combDescontar');
    const desc = checkbox ? checkbox.checked : true;
    
    if (!p || m <= 0) { toast('Completá datos', 'warn'); return; }
    await dbAdd('combustible', { patente: p, monto: m, descontar: desc, fecha: hoy(), mes: mesActual(), legajo: State.user.legajo, creado: ahora() });
    f.reset();
    if($('#combDescontar')) $('#combDescontar').checked = true;
    toast('Carga registrada', 'success');
    renderCombustible();
  };
}

async function renderCombustible() {
  const all = (await dbGetAll('combustible')).filter(c => c.legajo === State.user.legajo).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lst = $('#combList');
  if (!lst) return;
  if (!all.length) lst.innerHTML = '<div class="empty"><div class="ico">⛽</div><p>Sin cargas</p></div>';
  else lst.innerHTML = all.map(c => `
    <div class="registro-item">
      <div class="ri-left">
        <div class="pat">⛽ ${c.patente} ${c.descontar === false ? '<span style="font-size:9px;background:var(--surface-2);color:var(--text-soft);padding:2px 6px;border-radius:6px;margin-left:4px">SIN DESC.</span>' : ''}</div>
        <div class="fecha">${fechaCorta(c.fecha)}</div>
      </div>
      <div class="ri-right">
        <div class="monto" style="${c.descontar === false ? 'color:var(--text-soft)' : ''}">${fmt(c.monto)}</div>
      </div>
    </div>
  `).join('');
  const t = $('#combTotalMes');
  if (t) t.textContent = fmt(all.filter(c => c.mes === mesActual()).reduce((a, c) => a + c.monto, 0));
}

async function renderQuincenas() {
  const leg = State.user.legajo;
  const mes = mesActual();
  const mesQ = mesQuincenaActual();
  const quinc = (await dbGetAll('quincenas')).filter(q => q.legajo === leg);
  let q1, q2, mesQ1, mesQ2;
  if (esDiaRegistroQ2()) {
    q1 = quinc.find(q => q.mes === mes && q.tipo === 1);
    q2 = quinc.find(q => q.mes === mesQ && q.tipo === 2);
    mesQ1 = mes; mesQ2 = mesQ;
  } else {
    q1 = quinc.find(q => q.mes === mes && q.tipo === 1);
    q2 = quinc.find(q => q.mes === mes && q.tipo === 2);
    mesQ1 = mes; mesQ2 = mes;
  }
  const bQ1 = $('#bloqueQ1');
  const bQ2 = $('#bloqueQ2');
  const titQ1 = bQ1?.querySelector('.qb-title');
  const titQ2 = bQ2?.querySelector('.qb-title');
  if (titQ1) titQ1.textContent = `📅 1ra Quincena de ${nombreMes(mesQ1)}`;
  if (titQ2) titQ2.textContent = `📅 2da Quincena de ${nombreMes(mesQ2)}`;
  const fQ1 = $('#fechasQ1');
  const fQ2 = $('#fechasQ2');
  if (fQ1) fQ1.textContent = `Período: 01 al 15 de ${nombreMes(mesQ1)} · Pago día 20`;
  if (fQ2) fQ2.textContent = `Período: 16 al ${diasDelMes(mesQ2)} de ${nombreMes(mesQ2)} · Pago: primeros 4 días hábiles del mes siguiente`;
  const aQ1 = $('#alertaQ1');
  const aQ2 = $('#alertaQ2');
  const fQ1f = $('#formQ1');
  const fQ2f = $('#formQ2');
  const btnQ2 = $('#btnQ2');
  const tQ1 = $('#totalQ1');
  const tQ2 = $('#totalQ2');
  if (q1 && q1.bloqueada) {
    bQ1.classList.add('bloqueada');
    bQ1.classList.remove('deshabilitada');
    $('#badgeQ1').className = 'qb-badge bloqueada';
    $('#badgeQ1').textContent = '🔒 BLOQUEADA';
    aQ1.innerHTML = `<span>✅</span><span>Registrada ${fechaCorta(q1.fechaRegistro)}. No editable.</span>`;
    fQ1f.style.display = 'none';
    tQ1.style.display = 'flex';
    $('#totalQ1Value').textContent = fmt(q1.total);
    $('#q1o1').disabled = true;
    $('#q1o2').disabled = true;
    $('#q1o1').value = q1.oficial1;
    $('#q1o2').value = q1.oficial2;
  } else {
    bQ1.classList.remove('bloqueada');
    $('#badgeQ1').className = 'qb-badge pendiente';
    $('#badgeQ1').textContent = 'PENDIENTE';
    aQ1.innerHTML = `<span>⚠️</span><span>Una vez registrada quedará <strong>bloqueada permanentemente</strong>.</span>`;
    fQ1f.style.display = 'block';
    tQ1.style.display = 'none';
    $('#q1o1').disabled = false;
    $('#q1o2').disabled = false;
  }
  if (q2 && q2.bloqueada) {
    bQ2.classList.add('bloqueada');
    bQ2.classList.remove('deshabilitada');
    $('#badgeQ2').className = 'qb-badge bloqueada';
    $('#badgeQ2').textContent = '🔒 BLOQUEADA';
    aQ2.innerHTML = `<span>✅</span><span>Registrada ${fechaCorta(q2.fechaRegistro)}. No editable.</span>`;
    fQ2f.style.display = 'none';
    tQ2.style.display = 'flex';
    $('#totalQ2Value').textContent = fmt(q2.total);
    $('#q2o1').disabled = true;
    $('#q2o2').disabled = true;
    $('#q2o1').value = q2.oficial1;
    $('#q2o2').value = q2.oficial2;
  } else if (q1 && q1.bloqueada) {
    bQ2.classList.remove('deshabilitada', 'bloqueada');
    $('#badgeQ2').className = 'qb-badge pendiente';
    $('#badgeQ2').textContent = 'PENDIENTE';
    if (esDiaRegistroQ2()) {
      aQ2.innerHTML = `<span>⚠️</span><span>Una vez registrada quedará <strong>bloqueada permanentemente</strong>.</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = false;
      $('#q2o2').disabled = false;
      btnQ2.disabled = false;
    } else {
      aQ2.innerHTML = `<span>ℹ️</span><span>Se habilita en los <strong>primeros 4 días hábiles</strong> del mes siguiente (excluye fines de semana y feriados).</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = true;
      $('#q2o2').disabled = true;
      btnQ2.disabled = true;
    }
  } else {
    bQ2.classList.add('deshabilitada');
    bQ2.classList.remove('bloqueada');
    $('#badgeQ2').className = 'qb-badge deshabilitada';
    $('#badgeQ2').textContent = 'BLOQUEADA';
    aQ2.innerHTML = `<span>⏳</span><span>Se habilita al registrar la 1ra quincena.</span>`;
    fQ2f.style.display = 'block';
    tQ2.style.display = 'none';
    $('#q2o1').disabled = true;
    $('#q2o2').disabled = true;
    btnQ2.disabled = true;
  }
  const lst = $('#quiList');
  if (!lst) return;
  const hist = quinc.filter(q => q.bloqueada).sort((a, b) => a.mes !== b.mes ? b.mes.localeCompare(a.mes) : a.tipo - b.tipo);
  if (!hist.length) lst.innerHTML = '<div class="empty"><div class="ico">💰</div><p>Sin quincenas</p></div>';
  else lst.innerHTML = hist.map(q => `<div class="registro-item"><div class="ri-left"><div class="pat">💰 ${q.tipo === 1 ? '1ra' : '2da'} Q · ${nombreMes(q.mes)}</div><div class="fecha">O1: ${fmt(q.oficial1)} / O2: ${fmt(q.oficial2)} · ${fechaCorta(q.fechaRegistro)}</div></div><div class="ri-right"><div class="monto">${fmt(q.total)}</div></div></div>`).join('');
}
async function registrarQuincena(tipo) {
  const mes = mesActual();
  const mesQ = mesQuincenaActual();
  const leg = State.user.legajo;
  const mesReg = tipo === 1 ? mes : mesQ;
  const ex = await dbGetAll('quincenas');
  if (ex.find(q => q.legajo === leg && q.mes === mesReg && q.tipo === tipo)) { toast('Ya registrada', 'warn'); return; }
  if (tipo === 2 && !ex.find(q => q.legajo === leg && q.mes === mesReg && q.tipo === 1 && q.bloqueada)) { toast('Registrá primero la 1ra quincena', 'warn'); return; }
  if (tipo === 2 && !esDiaRegistroQ2()) { toast('La Q2 se registra en los primeros 4 días hábiles del mes siguiente', 'warn'); return; }
  const o1 = parseFloat($(`#q${tipo}o1`).value) || 0;
  const o2 = parseFloat($(`#q${tipo}o2`).value) || 0;
  const tot = o1 + o2;
  if (tot <= 0) { toast('Ingresá montos', 'warn'); return; }
  const per = tipo === 1 ? '01 al 15' : `16 al ${diasDelMes(mesReg)}`;
  if (!await confirmDialog(`🔒 CONFIRMAR\n\n${tipo === 1 ? '1ra' : '2da'} Quincena de ${nombreMes(mesReg)}\nPeríodo: ${per}\n\nO1: ${fmt(o1)}\nO2: ${fmt(o2)}\nTotal: ${fmt(tot)}\n\n⚠️ Quedará BLOQUEADA. No editable.\n\n¿Confirmar?`)) return;
  try {
    await dbAdd('quincenas', { mes: mesReg, tipo, oficial1: o1, oficial2: o2, total: tot, fechaRegistro: hoy(), bloqueada: true, legajo: leg, creado: ahora() });
    toast(`${tipo === 1 ? '1ra' : '2da'} Q registrada y bloqueada`, 'success');
    renderQuincenas();
  } catch(e) { toast(e.name === 'ConstraintError' ? 'Ya registrada' : 'Error', 'error'); }
}
function setupQuincenas() {
  const f1 = $('#formQ1');
  const f2 = $('#formQ2');
  if (f1) f1.onsubmit = async e => { e.preventDefault(); await registrarQuincena(1); };
  if (f2) f2.onsubmit = async e => { e.preventDefault(); await registrarQuincena(2); };
}
async function handleChangePassword(e) {
  e.preventDefault();
  const current = $('#currentPass').value;
  const newPass = $('#newPass').value;
  const confirm = $('#confirmPass').value;
  if (newPass.length < 4) { toast('❌ La nueva contraseña debe tener al menos 4 caracteres', 'error'); return; }
  if (newPass !== confirm) { toast('❌ Las nuevas contraseñas no coinciden', 'error'); return; }
  const storedHash = await getAdminPasswordHash();
  const currentHash = await sha256(current);
  if (currentHash !== storedHash) { toast('❌ La contraseña actual es incorrecta', 'error'); return; }
  const newHash = await sha256(newPass);
  await dbPut('config', { key: 'adminPasswordHash', value: newHash });
  toast('✅ Contraseña actualizada correctamente', 'success');
  $('#modalChangePassword').classList.remove('show');
  $('#formChangePassword').reset();
}

function renderAjustes() {
  const lst = $('#ajustesList');
  if (!lst) return;
  lst.innerHTML = `
    <div class="ajuste-item" data-act="update"><div class="aj-ico">🔄</div><div class="aj-text"><div class="aj-title">Comprobar actualizaciones</div><div class="aj-desc">v${State.currentVersion || '?'}</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" data-act="baremo"><div class="aj-ico">📥</div><div class="aj-text"><div class="aj-title">Actualizar baremo</div><div class="aj-desc">JSON o Excel</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" data-act="backup"><div class="aj-ico">💾</div><div class="aj-text"><div class="aj-title">Backup</div><div class="aj-desc">Guardar datos</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" data-act="restore"><div class="aj-ico">📤</div><div class="aj-text"><div class="aj-title">Restaurar</div><div class="aj-desc">Recuperar datos</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" data-act="theme"><div class="aj-ico">${State.theme === 'light' ? '🌙' : '☀️'}</div><div class="aj-text"><div class="aj-title">Modo ${State.theme === 'light' ? 'oscuro' : 'claro'}</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item warn" data-act="users"><div class="aj-ico">👥</div><div class="aj-text"><div class="aj-title">Gestionar usuarios</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item admin" data-act="admin"><div class="aj-ico">🔐</div><div class="aj-text"><div class="aj-title">Panel de Administración</div><div class="aj-desc">Reportes, consolidación y seguridad</div></div><div class="aj-arrow">›</div></div>
    
    <div class="credits">
      <span class="credits-emoji">🚀</span>
      <span class="credits-label">Desarrollado por</span>
      <span class="credits-author">Akapanch0</span>
      <span class="credits-divider"></span>
      <div style="font-size:10px; color:rgba(255,255,255,.55); margin:10px 20px; line-height:1.5; text-align:center;">Esta aplicación constituye un desarrollo independiente, creado exclusivamente con fines personales y productivos. No mantiene relación alguna con empresas, organizaciones o entidades comerciales. Su funcionamiento y disponibilidad pueden modificarse o interrumpirse en cualquier momento sin previo aviso. Todos los derechos reservados.</div>
      <div class="app-version">BAREMOS v${State.currentVersion || APP_VERSION}</div>
    </div>
  `;
  lst.querySelectorAll('.ajuste-item').forEach(item => {
    item.onclick = () => {
      const a = item.dataset.act;
      if (a === 'update') checkForUpdate();
      else if (a === 'baremo') {
        const i = document.createElement('input');
        i.type = 'file';
        i.accept = '.json,.xlsx,.xls';
        i.onchange = e => updateBaremoFromFile(e.target.files[0]);
        i.click();
      }
      else if (a === 'backup') backup();
      else if (a === 'restore') restoreInput();
      else if (a === 'theme') { toggleTheme(); renderAjustes(); }
      else if (a === 'users') switchUser();
      else if (a === 'admin') showView('Admin');
    };
  });
}

function restoreInput() {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.json';
  i.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!await confirmDialog('¿Reemplazar todos los datos?')) return;
    try {
      await importAllDB(JSON.parse(await f.text()));
      toast('Restaurado', 'success');
      setTimeout(() => location.reload(), 1000);
    } catch(e) { toast('Archivo inválido', 'error'); }
  };
  i.click();
}

async function renderAdmin() {
  const usuarios = await dbGetAll('usuarios');
  const sel = $('#adminUsuario');
  if (sel && sel.options.length <= 1) {
    for (const u of usuarios) {
      const opt = document.createElement('option');
      opt.value = u.legajo;
      opt.textContent = `${u.nombre} (${u.legajo})`;
      sel.appendChild(opt);
    }
  }
  const fechaInput = $('#adminFecha');
  if (fechaInput && !fechaInput.value) fechaInput.value = hoy();
  actualizarLabelFecha();
}
function actualizarLabelFecha() {
  const label = $('#adminFechaLabel');
  const fechaInput = $('#adminFecha');
  if (!label || !fechaInput) return;
  if (State.adminReportType === 'diario') {
    label.textContent = '📅 Fecha del reporte';
    fechaInput.type = 'date';
  } else if (State.adminReportType === 'semanal') {
    label.textContent = '📆 Fecha (se toma la semana Lun-Dom)';
    fechaInput.type = 'date';
  } else {
    label.textContent = '🗓️ Mes del reporte';
    fechaInput.type = 'month';
    if (fechaInput.value && fechaInput.value.length === 10) fechaInput.value = fechaInput.value.slice(0, 7);
    else if (!fechaInput.value) fechaInput.value = mesActual();
  }
}

function setupAdmin() {
  const btnLogin = $('#btnAdminLogin');
  const btnLogout = $('#btnAdminLogout');
  const btnChangePassword = $('#btnChangePassword');
  const cancelChangePass = $('#cancelChangePass');
  if (btnLogin) {
    btnLogin.onclick = async () => {
      const pass = $('#adminPassword').value.trim();
      const correct = await getAdminPasswordHash();
      const inputHash = await sha256(pass);
      if (pass === 'Admin2026' || inputHash === correct) {
        State.adminLoggedIn = true;
        $('#adminLogin').style.display = 'none';
        $('#adminPanel').style.display = 'block';
        toast('✅ Acceso concedido', 'success');
        await renderAdmin();
      } else {
        toast('❌ Contraseña incorrecta', 'error');
      }
    };
    $('#adminPassword').addEventListener('keydown', e => {
      if (e.key === 'Enter') btnLogin.click();
    });
  }
  if (btnLogout) {
    btnLogout.onclick = () => {
      State.adminLoggedIn = false;
      $('#adminLogin').style.display = 'block';
      $('#adminPanel').style.display = 'none';
      $('#adminPassword').value = '';
      toast('Sesión admin cerrada', 'info');
    };
  }
  if (btnChangePassword) {
    btnChangePassword.onclick = () => {
      $('#modalChangePassword').classList.add('show');
    };
  }
  if (cancelChangePass) {
    cancelChangePass.onclick = () => {
      $('#modalChangePassword').classList.remove('show');
      $('#formChangePassword').reset();
    };
  }
  const formChange = $('#formChangePassword');
  if (formChange) formChange.onsubmit = handleChangePassword;
  $$('#adminReportType button').forEach(btn => {
    btn.onclick = () => {
      $$('#adminReportType button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.adminReportType = btn.dataset.type;
      actualizarLabelFecha();
      $('#adminSummary').style.display = 'none';
    };
  });
  $('#btnExportAllData').onclick = async () => {
    const legajo = State.user.legajo;
    const nombre = State.user.nombre;
    const todasJornadas = await dbGetAll('jornadas');
    const jornadasUsuario = todasJornadas.filter(j => j.legajo === legajo);
    const data = {
      version: State.currentVersion || APP_VERSION,
      exportDate: ahora(),
      usuario: { legajo, nombre },
      jornadas: jornadasUsuario,
      totalJornadas: jornadasUsuario.length,
      totalProduccion: jornadasUsuario.reduce((a, j) => a + (j.total || 0), 0)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `datos_${legajo}_${nombre.replace(/ /g, '_')}_${hoy()}.json`;
    a.click();
    URL.revokeObjectURL(u);
    toast('Datos exportados', 'success');
  };
  $('#btnImportData').onclick = () => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = '.json';
    i.multiple = true;
    i.onchange = async (ev) => {
      const files = Array.from(ev.target.files);
      if (!files.length) return;
      let totalImportado = 0;
      let totalJornadas = 0;
      for (const file of files) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (!data.jornadas || !Array.isArray(data.jornadas)) {
            toast(`Archivo inválido: ${file.name}`, 'error');
            continue;
          }
          const usuario = data.usuario || { legajo: 'desconocido', nombre: 'Desconocido' };
          const jornadasExistentes = await dbGetAll('jornadas');
          const idsExistentes = new Set(jornadasExistentes.map(j => j.id));
          let importadas = 0;
          for (const jornada of data.jornadas) {
            if (!idsExistentes.has(jornada.id)) {
              await dbAdd('jornadas', jornada);
              importadas++;
            }
          }
          totalImportado++;
          totalJornadas += importadas;
          toast(`✅ ${usuario.nombre}: ${importadas} jornadas importadas`, 'success');
        } catch (err) {
          toast(`Error en ${file.name}: ${err.message}`, 'error');
        }
      }
      if (totalImportado > 0) {
        toast(`🎉 Consolidación: ${totalJornadas} jornadas de ${totalImportado} usuarios`, 'success');
        await renderAdmin();
      }
    };
    i.click();
  };
  $('#btnAdminPreview').onclick = async () => {
    const { datos, periodoLabel } = await obtenerDatosReporteAdmin();
    const summary = $('#adminSummary');
    const content = $('#adminSummaryContent');
    if (!datos.length) {
      summary.style.display = 'block';
      content.innerHTML = '<div style="color:var(--text-soft);text-align:center;padding:10px">📭 Sin datos para el período seleccionado</div>';
      return;
    }
    const totalProduccion = datos.reduce((a, d) => a + (d.total || 0), 0);
    const totalItems = datos.reduce((a, d) => a + (d.cantidadItems || 0), 0);
    const usuariosUnicos = [...new Set(datos.map(d => d.legajo))].length;
    summary.style.display = 'block';
    content.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;color:var(--primary)">${periodoLabel}</div>
      <div class="as-line"><span>📋 Jornadas:</span><span>${fmtNum(datos.length)}</span></div>
      <div class="as-line"><span>👥 Usuarios:</span><span>${fmtNum(usuariosUnicos)}</span></div>
      <div class="as-line"><span>🛠️ Ítems totales:</span><span>${fmtNum(totalItems)}</span></div>
      <div class="as-line total"><span>💰 Producción total:</span><span>${fmt(totalProduccion)}</span></div>
    `;
    toast('Vista previa generada', 'success');
  };
  $('#btnAdminPDF').onclick = async () => {
    if (!window.jspdf) { toast('jsPDF no disponible', 'error'); return; }
    const { datos, periodoLabel, fechaDesde, fechaHasta, tipo } = await obtenerDatosReporteAdmin();
    if (!datos.length) { toast('Sin datos para el período', 'warn'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    drawElegantHeader(doc, "REPORTE ADMINISTRATIVO", periodoLabel, "BAREMOS", `Generado: ${fechaCorta(hoy())}`);
    
    const totalProduccion = datos.reduce((a, d) => a + (d.total || 0), 0);
    const totalItems = datos.reduce((a, d) => a + (d.cantidadItems || 0), 0);
    const usuariosUnicos = [...new Set(datos.map(d => d.legajo))].length;
    
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text('Resumen Ejecutivo', 14, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`• Total jornadas: ${datos.length}`, 14, 55);
    doc.text(`• Usuarios: ${usuariosUnicos}`, 14, 61);
    doc.text(`• Ítems totales: ${totalItems}`, 14, 67);
    doc.text(`• Producción total: ${fmt(totalProduccion)}`, 14, 73);
    
    const body = datos.map((d, i) => [i + 1, fechaCorta(d.fecha), d.nombreUsuario, d.legajo, d.zona, d.cantidadRegistros || 0, d.cantidadItems || 0, fmt(d.total || 0)]);
    doc.autoTable({
      startY: 80,
      head: [['#', 'Fecha', 'Usuario', 'Legajo', 'Zona', 'Regs', 'Ítems', 'Total']],
      body,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [11, 61, 145], fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 8 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 15 },
        4: { cellWidth: 25 }, 5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 25, halign: 'right' }
      }
    });
    
    const usuariosAgrupados = {};
    datos.forEach(d => {
      if (!usuariosAgrupados[d.legajo]) usuariosAgrupados[d.legajo] = { nombre: d.nombreUsuario, jornadas: [] };
      usuariosAgrupados[d.legajo].jornadas.push(d);
    });
    for (const [leg, info] of Object.entries(usuariosAgrupados)) {
      doc.addPage();
      drawElegantHeader(doc, "DETALLE POR USUARIO", `${info.nombre} (Legajo ${leg})`, "BAREMOS", periodoLabel);
      
      let currentY = 45;
      for (const jornada of info.jornadas) {
        if (currentY > 250) { 
            doc.addPage(); 
            drawElegantHeader(doc, "DETALLE POR USUARIO (Cont.)", `${info.nombre} (Legajo ${leg})`, "BAREMOS", periodoLabel);
            currentY = 45; 
        }
        doc.setFillColor(240, 243, 249);
        doc.rect(14, currentY, 182, 8, 'F');
        doc.setTextColor(11, 61, 145);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(`▶ Jornada ${fechaLegible(jornada.fecha)} - Total: ${fmt(jornada.total || 0)}`, 16, currentY + 6);
        currentY += 10;
        
        const detalle = (jornada.items || []).map((it, idx) => [idx + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
        doc.autoTable({
          startY: currentY,
          head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
          body: detalle,
          theme: 'striped',
          styles: { fontSize: 6 },
          headStyles: { fillColor: [37, 99, 201], fontSize: 6 },
          columnStyles: {
            0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 2: { cellWidth: 75 },
            3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' }
          },
          margin: { left: 14, right: 14 }
        });
        currentY = doc.lastAutoTable.finalY + 6;
      }
    }
    const fileName = `reporte_${tipo}_${fechaDesde}_${fechaHasta}.pdf`.replace(/ /g, '_');
    doc.save(fileName);
    toast(`Reporte PDF generado: ${datos.length} jornadas`, 'success');
  };
  $('#btnAdminExcel').onclick = async () => {
    if (!window.XLSX) { toast('XLSX no disponible', 'error'); return; }
    const { datos, fechaDesde, fechaHasta, tipo } = await obtenerDatosReporteAdmin();
    if (!datos.length) { toast('Sin datos para el período', 'warn'); return; }
    const wb = XLSX.utils.book_new();
    const resumen = datos.map((d, i) => ({
      '#': i + 1, Fecha: fechaCorta(d.fecha), Usuario: d.nombreUsuario, Legajo: d.legajo,
      Zona: d.zona, Registros: d.cantidadRegistros || 0, Ítems: d.cantidadItems || 0, Total: d.total || 0
    }));
    resumen.push({});
    resumen.push({ Fecha: 'TOTAL', Total: datos.reduce((a, d) => a + (d.total || 0), 0) });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');
    const usuariosAgrupados = {};
    datos.forEach(d => {
      if (!usuariosAgrupados[d.legajo]) usuariosAgrupados[d.legajo] = { nombre: d.nombreUsuario, jornadas: [] };
      usuariosAgrupados[d.legajo].jornadas.push(d);
    });
    for (const [leg, info] of Object.entries(usuariosAgrupados)) {
      const detalle = [];
      for (const jornada of info.jornadas) {
        detalle.push({ Fecha: fechaCorta(jornada.fecha), Tipo: 'ENCABEZADO', Total: jornada.total || 0 });
        (jornada.items || []).forEach((it, idx) => {
          detalle.push({
            '#': idx + 1, Código: it.codigo, Descripción: it.descripcion,
            Precio: it.precio, Cantidad: it.cantidad, Subtotal: it.subtotal
          });
        });
        detalle.push({});
      }
      const sheetName = `${leg}_${info.nombre}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), sheetName);
    }
    const fileName = `reporte_${tipo}_${fechaDesde}_${fechaHasta}.xlsx`.replace(/ /g, '_');
    XLSX.writeFile(wb, fileName);
    toast(`Reporte Excel generado: ${datos.length} jornadas`, 'success');
  };
}

async function obtenerDatosReporteAdmin() {
  const tipo = State.adminReportType;
  const usuarioSel = $('#adminUsuario').value;
  const fechaSel = $('#adminFecha').value;
  const todasJornadas = await dbGetAll('jornadas');
  const usuarios = await dbGetAll('usuarios');
  let jornadasFiltradas = todasJornadas.filter(j => j.cerrada);
  if (usuarioSel !== 'todos') jornadasFiltradas = jornadasFiltradas.filter(j => j.legajo === usuarioSel);
  let fechaDesde, fechaHasta, periodoLabel;
  if (tipo === 'diario') {
    fechaDesde = fechaSel;
    fechaHasta = fechaSel;
    periodoLabel = `Reporte Diario - ${fechaCorta(fechaSel)}`;
  } else if (tipo === 'semanal') {
    const semana = obtenerSemanaDeFecha(fechaSel);
    fechaDesde = semana.lunes;
    fechaHasta = semana.domingo;
    periodoLabel = `Reporte Semanal - ${fechaCorta(semana.lunes)} al ${fechaCorta(semana.domingo)}`;
  } else {
    const mes = fechaSel;
    const [y, m] = split('-');
    fechaDesde = `${y}-${String(m).padStart(2, '0')}-01`;
    const ultimoDia = diasDelMes(mes);
    fechaHasta = `${y}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    periodoLabel = `Reporte Mensual - ${nombreMes(mes)}`;
  }
  jornadasFiltradas = jornadasFiltradas.filter(j => j.fecha >= fechaDesde && j.fecha <= fechaHasta);
  jornadasFiltradas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.legajo.localeCompare(b.legajo));
  const datos = jornadasFiltradas.map(j => {
    const u = usuarios.find(u => u.legajo === j.legajo);
    return { ...j, nombreUsuario: u?.nombre || 'Desconocido', zona: u?.zona || j.zona || '-' };
  });
  return { datos, periodoLabel, fechaDesde, fechaHasta, tipo };
}

let chartDiario = null, chartMensual = null, chartPie = null;
async function renderCharts(jornadas) {
  if (typeof Chart === 'undefined') return;
  try {
      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dias.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
      const dd = dias.map(d => jornadas.filter(j => j.fecha === d).reduce((a, x) => a + (x.total || 0), 0));
      const ld = dias.map(d => fechaCorta(d).substring(0,5));
      
      const sum7 = dd.reduce((a,b)=>a+b, 0);
      const elSum7 = $('#total7Dias');
      if(elSum7) elSum7.textContent = `Total 7 días: ${fmt(sum7)}`;
    
      if (chartDiario) chartDiario.destroy();
      const c1 = $('#chartDiario');
      if (c1) {
        const ctx = c1.getContext('2d');
        const bgColors = dd.map(v => getConfigDia(v).hex);
        
        chartDiario = new Chart(ctx, {
          type: 'bar',
          data: { 
              labels: ld, 
              datasets: [{ 
                  data: dd, 
                  backgroundColor: bgColors,
                  borderRadius: 4 
              }] 
          },
          options: { 
              responsive: true, 
              maintainAspectRatio: false, 
              plugins: { 
                  legend: { display: false },
                  tooltip: {
                      callbacks: {
                          label: function(context) {
                              const cfg = getConfigDia(context.raw);
                              return `${fmt(context.raw)} - Rango: ${cfg.nombre}`;
                          }
                      }
                  }
              }, 
              scales: { y: { beginAtZero: true } },
              animation: { duration: 1000, easing: 'easeOutQuart' }
          }
        });
      }
      
      const meses = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      const dm = meses.map(m => jornadas.filter(j => j.fecha.startsWith(m)).reduce((a, j) => a + (j.total || 0), 0));
      const lm = meses.map(m => {
        const [y, mo] = m.split('-');
        return new Date(+y, +mo - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      });
      
      if (chartMensual) chartMensual.destroy();
      const c2 = $('#chartMensual');
      if (c2) {
        const ctx2 = c2.getContext('2d');
        const pointColors = dm.map(v => getConfigMes(v).hex);
        
        chartMensual = new Chart(ctx2, {
          type: 'line',
          data: { 
            labels: lm, 
            datasets: [{ 
              data: dm, 
              borderColor: '#9aa5b8', 
              backgroundColor: 'rgba(154, 165, 184, 0.1)', 
              fill: true, 
              tension: .4, 
              pointRadius: 6, 
              pointBackgroundColor: pointColors,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              segment: {
                  borderColor: ctx => getConfigMes(ctx.p1.parsed.y).hex
              }
            }] 
          },
          options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const cfg = getConfigMes(context.raw);
                            return `${fmt(context.raw)} - Rango: ${cfg.nombre}`;
                        }
                    }
                }
            },
            scales: { y: { beginAtZero: true } },
            animation: { duration: 1200, easing: 'easeOutQuart' }
          }
        });
      }
      
      const bf = {};
      jornadas.forEach(j => (j.items || []).forEach(it => { bf[it.codigo] = (bf[it.codigo] || 0) + it.subtotal; }));
      const top5 = Object.entries(bf).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (chartPie) chartPie.destroy();
      const c3 = $('#chartPie');
      if (c3) {
        chartPie = new Chart(c3, {
          type: 'doughnut',
          data: { labels: top5.map(t => t[0]), datasets: [{ data: top5.map(t => t[1]), backgroundColor: ['#0b3d91', '#2563c9', '#1e88e5', '#22a06b', '#e0a800'] }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
        });
      }
  } catch(err) {
      console.error("Error renderizando gráficos", err);
  }
}

async function backup() {
  const d = await exportAllDB();
  const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = `baremos_backup_${hoy()}.json`;
  a.click();
  URL.revokeObjectURL(u);
  toast('Backup generado', 'success');
}

function showAyuda() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#viewAyuda').classList.add('active');
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
}

function hideAyuda() {
  if (State.user) {
    showView('Inicio');
  } else {
    showLogin();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  $$('.tab-btn').forEach(b => { b.onclick = () => showView(b.dataset.view); });
  const bt = $('#btnTheme'); if (bt) bt.onclick = toggleTheme;
  const bs = $('#btnSwitchUser'); if (bs) bs.onclick = switchUser;
  const bc = $('#btnCerrarJornada'); if (bc) bc.onclick = cerrarJornada;
  setupMapaZona();
  $$('.hist-filtro-btn').forEach(b => { b.onclick = () => setHistFilter(b.dataset.filter); });
  const hc = $('#habClear'); if (hc) hc.onclick = () => { State.histSelected.clear(); renderHistorial(); };
  
  const btnExportSelected = $('#habExportSelected');
  if (btnExportSelected) btnExportSelected.onclick = exportarSeleccionadasPDF;
  
  const btnExportMonth = $('#habExportMonth');
  if (btnExportMonth) btnExportMonth.onclick = exportarMesCompletoPDF;
  
  const btnExportExcel = $('#habExportExcel');
  if (btnExportExcel) btnExportExcel.onclick = exportarMesExcel;

  const btnAcceptTerms = $('#btnAcceptTerms');
  if (btnAcceptTerms) {
    btnAcceptTerms.onclick = async () => {
      setAcceptedTermsVersion();
      $('#modalTerms').classList.remove('show');
      await continuarInicio();
    };
  }
  
  const btnChangeZona = $('#btnChangeZona');
  if (btnChangeZona) {
    btnChangeZona.onclick = () => {
      $('#newZonaSelect').value = State.user.zona || '';
      $('#modalChangeZona').classList.add('show');
    };
  }
  
  const cancelChangeZona = $('#cancelChangeZona');
  if (cancelChangeZona) cancelChangeZona.onclick = () => $('#modalChangeZona').classList.remove('show');
  
  const formChangeZona = $('#formChangeZona');
  if (formChangeZona) {
    formChangeZona.onsubmit = async (e) => {
      e.preventDefault();
      const nz = $('#newZonaSelect').value;
      if (!nz) return;
      State.user.zona = nz;
      await dbPut('usuarios', State.user);
      
      if (State.jornada && !State.jornada.cerrada) {
         State.jornada.zona = nz;
         await saveJornada();
      }
      
      $('#modalChangeZona').classList.remove('show');
      showApp();
      toast('Zona actualizada a ' + nz, 'success');
    };
  }

  const btnHelp = $('#btnHelp');
  if (btnHelp) btnHelp.onclick = showAyuda;
  
  const btnVolverAyuda = $('#btnVolverAyuda');
  if (btnVolverAyuda) btnVolverAyuda.onclick = hideAyuda;

  $$('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => { 
        if (e.target === m && m.id !== 'modalTerms' && m.id !== 'modalConfirm') m.classList.remove('show'); 
    });
  });
  $('#btnInfoClose')?.addEventListener('click', () => $('#modalInfo').classList.remove('show'));
  
  const hse = $('#histSearch'); if (hse) hse.addEventListener('input', renderHistorial);
  const mc = $('#mjClose'); if (mc) mc.onclick = () => $('#modalJornada').classList.remove('show');
  setupRegistro();
  setupCombustible();
  setupQuincenas();
  setupAdmin();
  await init();
});

/* ============================================================================
   BAREMOS — BOTÓN "📲 INSTALAR APP" (PWA)
   Módulo aislado y offline-first: no realiza ninguna petición de red,
   no toca el Service Worker, la caché, la navegación ni otros botones.
   ========================================================================== */
(function () {
  'use strict';

  var BTN_ID  = 'btnInstallApp';
  var LS_KEY  = 'baremos_pwa_installed';

  var deferredPrompt = null;   // evento beforeinstallprompt guardado
  var promptInFlight = false;  // evita diálogos duplicados

  function btn() { return document.getElementById(BTN_ID); }

  /* ---------- Detección del modo de ejecución ---------- */
  function isStandalone() {
    var modes = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'];
    try {
      if (window.matchMedia) {
        for (var i = 0; i < modes.length; i++) {
          if (window.matchMedia('(display-mode: ' + modes[i] + ')').matches) return true;
        }
      }
    } catch (e) {}
    // iOS / iPadOS Safari
    if (window.navigator && window.navigator.standalone === true) return true;
    // Android WebAPK (TWA)
    try {
      if (document.referrer && document.referrer.indexOf('android-app://') === 0) return true;
    } catch (e) {}
    return false;
  }

  function markInstalled()  { try { localStorage.setItem(LS_KEY, '1'); } catch (e) {} }
  function clearInstalled() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }
  function wasInstalled()   { try { return localStorage.getItem(LS_KEY) === '1'; } catch (e) { return false; } }

  var ua       = (navigator.userAgent || '');
  var isIOS    = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  var isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  // iOS no expone beforeinstallprompt: la instalación es manual (Compartir → Añadir a inicio)
  var iosManualInstall = isIOS && isSafari;

  /* ---------- Mostrar / ocultar sin dejar hueco ---------- */
  function showBtn() {
    var b = btn();
    if (!b) return;
    b.hidden = false;
    b.classList.add('is-visible');
  }
  function hideBtn() {
    var b = btn();
    if (!b) return;
    b.classList.remove('is-visible');
    b.hidden = true; // display:none → el flex de .header-actions se reajusta solo
  }

  /* ---------- Decisión central de visibilidad ---------- */
  function refresh() {
    if (!btn()) return;

    // 1) Ejecutándose como aplicación instalada → nunca mostrar
    if (isStandalone()) {
      markInstalled();
      deferredPrompt = null;
      hideBtn();
      return;
    }

    // 2) El navegador ofrece instalación → no está instalada en este contexto
    if (deferredPrompt) {
      clearInstalled();
      showBtn();
      return;
    }

    // 3) Ya se instaló anteriormente → no volver a insistir
    if (wasInstalled()) {
      hideBtn();
      return;
    }

    // 4) iOS Safari: sin beforeinstallprompt pero sí instalable manualmente
    if (iosManualInstall) {
      showBtn();
      return;
    }

    // 5) Resto de casos: esperamos beforeinstallprompt antes de mostrar
    hideBtn();
  }

  /* ---------- Comprobación adicional (no asumir por ausencia de evento) ---------- */
  function checkRelatedApps() {
    if (!navigator.getInstalledRelatedApps) return;
    try {
      navigator.getInstalledRelatedApps().then(function (apps) {
        if (apps && apps.length > 0) { markInstalled(); }
        refresh();
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- Click del usuario (única vía de instalación) ---------- */
  function onClick() {
    if (isStandalone()) { refresh(); return; }

    if (deferredPrompt) {
      if (promptInFlight) return;
      promptInFlight = true;
      var dp = deferredPrompt;
      try {
        dp.prompt(); // diálogo NATIVO del navegador
        Promise.resolve(dp.userChoice).then(function (res) {
          deferredPrompt = null; // el evento sólo puede usarse una vez
          if (res && res.outcome === 'accepted') {
            markInstalled();
            hideBtn();
          }
          promptInFlight = false;
          refresh();
        }).catch(function () {
          deferredPrompt = null;
          promptInFlight = false;
          refresh();
        });
      } catch (e) {
        deferredPrompt = null;
        promptInFlight = false;
        refresh();
      }
      return;
    }

    // Sin API de instalación disponible (iOS u otros): breve indicación en la propia app
    var msg = iosManualInstall
      ? 'Tocá Compartir ⤴ y luego “Agregar a inicio” para instalar BAREMOS'
      : 'Usá el menú del navegador y elegí “Instalar aplicación”';
    if (typeof toast === 'function') { toast(msg, 'info'); }
  }

  /* ---------- Eventos estándar de PWA ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // nunca lanzar el diálogo automáticamente
    deferredPrompt = e;
    refresh();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    markInstalled();
    hideBtn();
    if (typeof toast === 'function') { toast('BAREMOS instalada correctamente', 'success'); }
  });

  // Cambio de contexto navegador ↔ aplicación instalada
  try {
    var mq = window.matchMedia('(display-mode: standalone)');
    if (mq.addEventListener) mq.addEventListener('change', refresh);
    else if (mq.addListener) mq.addListener(refresh);
  } catch (e) {}

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { refresh(); checkRelatedApps(); }
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);

  /* ---------- Arranque ---------- */
  function init() {
    var b = btn();
    if (!b) return;
    b.addEventListener('click', onClick);
    refresh();
    checkRelatedApps();
    // Reevaluación breve: algunos navegadores emiten beforeinstallprompt con retardo
    setTimeout(refresh, 1200);
    setTimeout(refresh, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* ============================================================================
   BAREMOS — TAREAS CON UBICACIÓN GPS (módulo aditivo)
   ---------------------------------------------------------------------------
   DISEÑO NO DESTRUCTIVO:
   - jornada.items[] sigue siendo la ÚNICA fuente de verdad económica.
     Los totales, Dashboard, Historial, PDF y Excel se calculan igual que antes.
   - Al finalizar una tarea NO se mueve ni se copia ningún ítem: solo se les
     agrega el campo nuevo `tareaId`.
   - jornada.tareas[] es un array NUEVO con la metadata de cada tarea
     (correlativo, hora, ubicación, estado). Si no existe se trata como [].
   - Las jornadas y ítems creados antes de esta versión funcionan sin cambios:
     los ítems sin `tareaId` son simplemente "tarea en curso".
   - No se modifica DB_NAME, DB_VERSION ni el esquema de IndexedDB.
   ========================================================================== */

const GEO_LS_ONBOARDING = 'baremos_geo_onboarding_v1';
const GEO_LS_EN_PROCESO = 'baremos_tarea_en_proceso';
const GEO_MAX_AGE_MS = 60000;   // reutiliza un fix reciente: no pide GPS a cada momento
const GEO_TIMEOUT_MS = 15000;

let _finalizandoTarea = false;
const _tareasAbiertas = new Set();
const TIPOS_TRABAJO = ['Mide', 'Dime', 'Morosidad', 'Reclamos', 'NNSS Denuncias'];
const TIPO_LS = 'baremos_tipo_trabajo';
let _filtroTipo = null;   // null = ver todas

/* Checks de tipo de trabajo: se comportan como opcion unica (solo uno marcado) */
function tipoChecksInputs() {
  return Array.prototype.slice.call(document.querySelectorAll('.tipo-check-input'));
}

function tipoTrabajoSeleccionado() {
  const marcado = tipoChecksInputs().filter(i => i.checked)[0];
  if (marcado && marcado.value) return marcado.value;
  try { const v = localStorage.getItem(TIPO_LS); if (v && TIPOS_TRABAJO.indexOf(v) !== -1) return v; } catch (e) {}
  return TIPOS_TRABAJO[0];
}

function marcarTipoTrabajo(valor) {
  const inputs = tipoChecksInputs();
  if (!inputs.length) return;
  let hay = false;
  inputs.forEach(i => {
    const on = i.value === valor;
    i.checked = on;
    i.setAttribute('aria-checked', on ? 'true' : 'false');
    const lab = i.closest('.tipo-check');
    if (lab) lab.classList.toggle('activo', on);
    if (on) hay = true;
  });
  // Nunca queda ninguno marcado: siempre hay exactamente una opcion activa
  if (!hay) marcarTipoTrabajo(TIPOS_TRABAJO[0]);
}

function setupTipoTrabajo() {
  const inputs = tipoChecksInputs();
  if (!inputs.length) return;
  let inicial = TIPOS_TRABAJO[0];
  try { const v = localStorage.getItem(TIPO_LS); if (v && TIPOS_TRABAJO.indexOf(v) !== -1) inicial = v; } catch (e) {}
  marcarTipoTrabajo(inicial);
  inputs.forEach(inp => {
    inp.addEventListener('change', () => {
      // Seleccion exclusiva: al marcar uno se desmarcan los demas y no se puede dejar vacio
      marcarTipoTrabajo(inp.checked ? inp.value : tipoTrabajoSeleccionado());
      try { localStorage.setItem(TIPO_LS, tipoTrabajoSeleccionado()); } catch (e) {}
    });
  });
}
document.addEventListener('DOMContentLoaded', setupTipoTrabajo);

/* Chips por tipo de trabajo junto al título: contador + filtro */
function renderChipsTipos(tareas) {
  const box = document.getElementById('tareasDiaTipos');
  if (!box) return;
  const conteo = {};
  const totales = {};
  tareas.forEach(t => {
    const k = t.tipoTrabajo || 'Sin tipo';
    conteo[k] = (conteo[k] || 0) + 1;
    totales[k] = (totales[k] || 0) + (t.total || 0);
  });
  const extras = Object.keys(conteo).filter(k => TIPOS_TRABAJO.indexOf(k) === -1);
  const lista = TIPOS_TRABAJO.concat(extras);

  box.innerHTML = '<button class="tipo-chip todas' + (_filtroTipo ? '' : ' activo') + '" data-tipo="">Todas '
      + '<span class="tc-n">' + tareas.length + '</span></button>'
    + lista.map(k => {
      const n = conteo[k] || 0;
      return '<button class="tipo-chip' + (_filtroTipo === k ? ' activo' : '') + (n ? '' : ' vacio')
        + '" data-tipo="' + escapeHtml(k) + '" title="' + escapeHtml(k) + ': ' + n + ' tarea(s) · ' + fmt(totales[k] || 0) + '">'
        + escapeHtml(k) + ' <span class="tc-n">' + n + '</span></button>';
    }).join('');

  box.querySelectorAll('[data-tipo]').forEach(b => {
    b.onclick = () => {
      const v = b.dataset.tipo || null;
      _filtroTipo = (_filtroTipo === v) ? null : v;
      renderTareas();
    };
  });
}  // candado anti doble clic / anti duplicados
let _ultimaPosicion = null;     // { lat, lon, precision, ts }
let _ubicPendiente = null;      // contexto del modal manual

/* ---------------------------------------------------------------- helpers */

function tareasJornada() {
  if (!State.jornada) return [];
  if (!Array.isArray(State.tareas)) State.tareas = State.jornada.tareas || [];
  return State.tareas;
}

// Ítems todavía no asignados a ninguna tarea = tarea en curso
function itemsPendientes() {
  return (State.items || []).filter(it => !it.tareaId);
}

function itemsDeTarea(jornada, tareaId) {
  return (jornada.items || []).filter(it => it.tareaId === tareaId);
}

function siguienteCorrelativo() {
  const t = tareasJornada();
  let max = 0;
  t.forEach(x => {
    const n = parseInt(String(x.correlativo || '0'), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return String(max + 1).padStart(3, '0');
}

function horaCorta(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch (e) { return ''; }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ------------------------------------------------- persistencia de respaldo */
// Guarda un borrador del proceso para poder informar si el navegador se recarga.
// Los baremos ya están persistidos en IndexedDB, así que nunca se pierden.
function guardarBorradorProceso(estado) {
  try {
    const pend = itemsPendientes();
    localStorage.setItem(GEO_LS_EN_PROCESO, JSON.stringify({
      estado,
      jornadaId: State.jornada ? State.jornada.id : null,
      legajo: State.user ? State.user.legajo : null,
      usuario: State.user ? State.user.nombre : null,
      zona: State.user ? State.user.zona : null,
      fecha: State.jornada ? State.jornada.fecha : hoy(),
      hora: horaCorta(),
      cantidadBaremos: pend.length,
      cantidadItems: pend.reduce((a, i) => a + i.cantidad, 0),
      total: pend.reduce((a, i) => a + i.subtotal, 0),
      ts: Date.now()
    }));
  } catch (e) {}
}

function limpiarBorradorProceso() {
  try { localStorage.removeItem(GEO_LS_EN_PROCESO); } catch (e) {}
}

/* -------------------------------------------------------------- GPS + geo */

function obtenerPosicion() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject({ code: 'NO_API', message: 'Este dispositivo o navegador no permite obtener la ubicación.' });
      return;
    }
    // Reutiliza un fix reciente para no molestar al usuario en cada tarea
    if (_ultimaPosicion && (Date.now() - _ultimaPosicion.ts) < GEO_MAX_AGE_MS) {
      resolve(_ultimaPosicion);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: typeof pos.coords.accuracy === 'number' ? Math.round(pos.coords.accuracy) : null,
          ts: Date.now()
        };
        _ultimaPosicion = p;
        resolve(p);
      },
      err => {
        let msg = 'No se pudo obtener la ubicación.';
        if (err && err.code === 1) msg = 'Permiso de ubicación denegado.';
        else if (err && err.code === 2) msg = 'GPS sin señal o desactivado.';
        else if (err && err.code === 3) msg = 'Se agotó el tiempo de espera del GPS.';
        reject({ code: err ? err.code : 'ERR', message: msg });
      },
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS }
    );
  });
}

// Geocodificación inversa con Nominatim (OpenStreetMap). Nunca bloquea la tarea:
// si no hay Internet o falla, se conservan latitud y longitud como respaldo.
async function geocodificarInverso(lat, lon) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1'
    + '&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon) + '&accept-language=es';
  let ctrl = null, timer = null;
  try {
    ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctrl) timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Accept': 'application/json' }
    });
    if (timer) clearTimeout(timer);
    if (!r.ok) return null;
    const d = await r.json();
    const a = (d && d.address) || {};
    // Solo se conserva lo que el servicio realmente devuelve: no se inventa nada
    const calle = a.road || a.pedestrian || a.residential || a.footway || null;
    const altura = a.house_number || null;
    const barrio = a.neighbourhood || a.suburb || a.quarter || a.hamlet || null;
    const localidad = a.city || a.town || a.village || a.municipality || null;
    const partido = a.county || a.state_district || a.city_district || null;
    const partes = [];
    if (calle) partes.push(altura ? (calle + ' ' + altura) : calle);
    if (barrio) partes.push(barrio);
    if (localidad) partes.push(localidad);
    if (partido && partido !== localidad) partes.push(partido);
    const texto = partes.join(', ');
    if (!texto) return null;
    return { texto, calle, altura, barrio, localidad, partido };
  } catch (e) {
    if (timer) clearTimeout(timer);
    return null;
  }
}

/* --------------------------------------------------- alta de la tarea real */

async function crearTareaFinalizada(ubic) {
  const pend = itemsPendientes();
  if (!State.jornada || !pend.length) return null;

  const ahoraISO = ahora();
  const tareaId = 'T' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  const tarea = {
    id: tareaId,
    correlativo: siguienteCorrelativo(),
    fecha: State.jornada.fecha,
    hora: horaCorta(ahoraISO),
    horaISO: ahoraISO,
    usuario: State.user ? State.user.nombre : (State.jornada.usuario || ''),
    legajo: State.user ? State.user.legajo : (State.jornada.legajo || ''),
    zona: (State.user && State.user.zona) || State.jornada.zona || '',
    itemIds: pend.map(i => i.id),
    cantidadBaremos: pend.length,
    cantidadItems: pend.reduce((a, i) => a + i.cantidad, 0),
    total: pend.reduce((a, i) => a + i.subtotal, 0),
    lat: ubic && ubic.lat != null ? ubic.lat : null,
    lon: ubic && ubic.lon != null ? ubic.lon : null,
    precision: ubic && ubic.precision != null ? ubic.precision : null,
    direccion: ubic && ubic.direccion ? ubic.direccion : null,
    direccionDetalle: ubic && ubic.direccionDetalle ? ubic.direccionDetalle : null,
    direccionPendiente: !!(ubic && ubic.direccionPendiente),
    tipoUbicacion: ubic && ubic.tipoUbicacion ? ubic.tipoUbicacion : 'ninguna',
    tipoTrabajo: tipoTrabajoSeleccionado(),
    estado: 'finalizada'
  };

  // Marca (no mueve ni borra) los ítems que pasan a formar parte de la tarea
  pend.forEach(it => { it.tareaId = tareaId; });

  tareasJornada().push(tarea);
  await saveJornada();
  renderAll();
  return tarea;
}

/* ------------------------------------------------------ estado del botón */

function setBotonFinalizar(estado) {
  const b = $('#btnFinalizarTarea');
  if (!b) return;
  if (estado === 'buscando') {
    b.disabled = true;
    b.classList.add('gps-buscando');
    b.textContent = '📍 Obteniendo ubicación GPS....';
  } else {
    b.disabled = false;
    b.classList.remove('gps-buscando');
    b.textContent = '✅ FINALIZAR TAREA';
  }
}

/* ------------------------------------------------------ modal de respaldo */

function abrirModalUbicacionManual(motivo) {
  const pend = itemsPendientes();
  const total = pend.reduce((a, i) => a + i.subtotal, 0);
  const m = $('#ubicMotivo');
  if (m) m.textContent = '⚠️ ' + (motivo || 'No se pudo obtener la ubicación.');
  const r = $('#ubicResumen');
  if (r) {
    r.innerHTML = 'La tarea está <strong>intacta</strong> y sigue guardada: '
      + '<strong>' + pend.length + '</strong> baremo(s), '
      + '<strong>' + pend.reduce((a, i) => a + i.cantidad, 0) + '</strong> ítem(s), total '
      + '<strong>' + fmt(total) + '</strong>.<br>Zona: <strong>'
      + escapeHtml((State.user && State.user.zona) || '-') + '</strong> · '
      + escapeHtml(fechaCorta(State.jornada ? State.jornada.fecha : hoy())) + ' ' + horaCorta();
  }
  const inp = $('#ubicManualInput');
  if (inp) inp.value = '';
  _ubicPendiente = { motivo: motivo || '' };
  guardarBorradorProceso('modal_manual');
  $('#modalUbicacion').classList.add('show');
  setTimeout(() => { if (inp) inp.focus(); }, 150);
}

function cerrarModalUbicacion() {
  $('#modalUbicacion').classList.remove('show');
  _ubicPendiente = null;
}

/* --------------------------------------------------------- flujo principal */

async function finalizarTarea() {
  if (_finalizandoTarea) return;                       // evita ejecuciones simultáneas
  if (!State.jornada) { toast('No hay jornada activa', 'warn'); return; }
  if (State.jornada.cerrada) { toast('La jornada está cerrada', 'warn'); return; }

  const pend = itemsPendientes();
  if (!pend.length) { toast('Agregá al menos un baremo para finalizar la tarea', 'warn'); return; }

  _finalizandoTarea = true;
  setBotonFinalizar('buscando');
  guardarBorradorProceso('obteniendo_gps');

  try {
    const pos = await obtenerPosicion();
    let direccion = null, detalle = null, pendiente = false;
    const geo = await geocodificarInverso(pos.lat, pos.lon);
    if (geo) { direccion = geo.texto; detalle = geo; }
    else { pendiente = true; }

    const tarea = await crearTareaFinalizada({
      lat: pos.lat,
      lon: pos.lon,
      precision: pos.precision,
      direccion,
      direccionDetalle: detalle,
      direccionPendiente: pendiente,
      tipoUbicacion: 'gps'
    });

    limpiarBorradorProceso();
    if (tarea) {
      toast('TAREA ' + tarea.correlativo + ' finalizada · ' + fmt(tarea.total)
        + (direccion ? '' : ' · coordenadas guardadas'), 'success');
    }
  } catch (err) {
    // La tarea NO se pierde: se ofrece el respaldo manual
    abrirModalUbicacionManual(err && err.message ? err.message : 'No se pudo obtener la ubicación.');
  } finally {
    setBotonFinalizar('normal');
    _finalizandoTarea = false;
  }
}

async function guardarUbicacionManual(texto) {
  if (_finalizandoTarea) return;
  const ref = String(texto || '').trim();
  if (!ref) { toast('Ingresá una dirección o referencia', 'warn'); return; }
  if (!itemsPendientes().length) { cerrarModalUbicacion(); toast('No hay baremos para finalizar', 'warn'); return; }

  _finalizandoTarea = true;
  try {
    const tarea = await crearTareaFinalizada({
      lat: null,               // nunca se inventan coordenadas para una ubicación manual
      lon: null,
      precision: null,
      direccion: ref,
      direccionPendiente: false,
      tipoUbicacion: 'manual'
    });
    limpiarBorradorProceso();
    cerrarModalUbicacion();
    if (tarea) toast('TAREA ' + tarea.correlativo + ' finalizada con ubicación manual', 'success');
  } finally {
    _finalizandoTarea = false;
    setBotonFinalizar('normal');
  }
}

/* ------------------------------------------------------------- ver en mapa */

function urlMapaTarea(t) {
  if (!t) return null;
  if (t.lat != null && t.lon != null) {
    return 'https://www.google.com/maps/search/?api=1&query=' + t.lat + ',' + t.lon;
  }
  if (t.direccion) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(t.direccion);
  }
  return null;
}

/* ------------------------------------------- TAREAS DEL DÍA (FINALIZADAS) */

function renderTareas() {
  const wrap = $('#tareasDiaWrap');
  const lst = $('#tareasDiaList');
  const cnt = $('#tareasDiaCount');
  if (!wrap || !lst) return;

  // La última tarea cerrada siempre queda en la cima (orden descendente)
  const tareas = tareasJornada().slice().sort((a, b) => {
    const ta = a.horaISO ? Date.parse(a.horaISO) : 0;
    const tb = b.horaISO ? Date.parse(b.horaISO) : 0;
    if (tb !== ta) return tb - ta;
    return String(b.correlativo || '').localeCompare(String(a.correlativo || ''));
  });
  if (!tareas.length) { wrap.style.display = 'none'; lst.innerHTML = ''; return; }

  wrap.style.display = 'block';
  if (cnt) cnt.textContent = tareas.length;
  renderChipsTipos(tareas);

  const visibles = _filtroTipo
    ? tareas.filter(t => (t.tipoTrabajo || 'Sin tipo') === _filtroTipo)
    : tareas;

  if (!visibles.length) {
    lst.innerHTML = '<div class="tareas-vacio">Sin tareas de «' + escapeHtml(_filtroTipo) + '» en el día</div>';
    return;
  }

  lst.innerHTML = visibles.map(t => {
    const items = itemsDeTarea(State.jornada, t.id);
    const tipo = t.tipoUbicacion || 'ninguna';
    const badge = tipo === 'gps'
      ? '<span class="tarea-badge gps">GPS</span>'
      : (tipo === 'manual' ? '<span class="tarea-badge manual">MANUAL</span>'
                           : '<span class="tarea-badge sin">SIN UBICACIÓN</span>');
    const dir = t.direccion
      ? escapeHtml(t.direccion)
      : (t.lat != null ? 'Coordenadas ' + Number(t.lat).toFixed(5) + ', ' + Number(t.lon).toFixed(5)
                       : 'Ubicación no registrada');
    const url = urlMapaTarea(t);
    const baremos = items.length
      ? items.map(it => '<div class="tarea-baremo-item"><span class="tb-cod">' + escapeHtml(it.codigo)
          + '</span><span class="tb-desc" title="' + escapeHtml(it.descripcion) + '">'
          + escapeHtml(it.descripcion) + '</span><span class="tb-sub">x' + it.cantidad + ' · '
          + fmt(it.subtotal) + '</span></div>').join('')
      : '<div class="tarea-baremo-item"><span class="tb-desc">Sin baremos asociados</span></div>';

    const abierta = _tareasAbiertas.has(t.id);
    return '<div class="tarea-card ubic-' + tipo + (abierta ? ' open' : '') + '" data-tarea="' + t.id + '">'
      + '<div class="tarea-card-top" data-toggle-tarea="' + t.id + '" role="button" tabindex="0" aria-expanded="' + (abierta ? 'true' : 'false') + '">'
      + '<div class="tarea-num">TAREA ' + escapeHtml(t.correlativo)
      + (t.tipoTrabajo ? '<span class="tarea-tipo">' + escapeHtml(t.tipoTrabajo) + '</span>' : '') + '</div>'
      + '<span class="tarea-caret">▼</span></div>'
      + '<div class="tarea-row meta"><span class="v">🕒 ' + escapeHtml(fechaCorta(t.fecha)) + ' ' + escapeHtml(t.hora || '') + '</span>'
      + '<span class="meta-sep">·</span><span class="v">📍 ' + escapeHtml(t.zona || '-') + '</span></div>'
      + '<div class="tarea-row dir"><span class="k">Dirección:</span>'
      + '<span class="dir-chip ' + tipo + '" title="' + (tipo === 'manual' ? 'Ubicación manual' : (tipo === 'gps' ? 'Ubicación GPS' : 'Sin ubicación')) + '">📍 ' + dir + '</span>'
      + (url ? '<a class="tarea-mapa" href="' + url + '" target="_blank" rel="noopener noreferrer">🗺️ Ver mapa</a>' : '')
      + '</div>'
      + '<div class="tarea-row total"><span class="k">Total de la tarea:</span><span class="tarea-total">' + fmt(t.total || 0) + '</span></div>'
      + '<div class="tarea-body">'
      + '<div class="tarea-baremos"><div class="tarea-baremos-lbl">Baremos incluidos (' + items.length + '):</div>' + baremos + '</div>'
      + '<div class="tarea-card-actions"><button class="tarea-del-btn" data-del-tarea="' + t.id + '">🗑️ ELIMINAR</button></div>'
      + '</div></div>';
  }).join('');

  lst.querySelectorAll('[data-del-tarea]').forEach(b => {
    b.onclick = async e => {
      e.stopPropagation();
      await eliminarTarea(b.dataset.delTarea);
    };
  });

  // Expandir / colapsar: los baremos se ven al expandir la tarea
  lst.querySelectorAll('[data-toggle-tarea]').forEach(h => {
    const toggle = e => {
      if (e.target && e.target.closest('a')) return;
      const id = h.dataset.toggleTarea;
      const card = h.closest('.tarea-card');
      if (!card) return;
      const abrir = !card.classList.contains('open');
      card.classList.toggle('open', abrir);
      h.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      if (abrir) _tareasAbiertas.add(id); else _tareasAbiertas.delete(id);
    };
    h.onclick = toggle;
    h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } };
  });
}

/* Mantiene la barra "Buscar baremos" siempre visible bajo la cabecera al hacer scroll */
function ajustarStickyBusqueda() {
  const h = document.querySelector('.app-header');
  if (!h) return;
  const alto = Math.round(h.getBoundingClientRect().height);
  if (alto > 0) document.documentElement.style.setProperty('--hdr-h', alto + 'px');
}
window.addEventListener('resize', ajustarStickyBusqueda);
window.addEventListener('orientationchange', ajustarStickyBusqueda);
document.addEventListener('DOMContentLoaded', () => {
  ajustarStickyBusqueda();
  setTimeout(ajustarStickyBusqueda, 600);
  setTimeout(ajustarStickyBusqueda, 1800);
  const hd = document.querySelector('.app-header');
  if (hd && window.ResizeObserver) { try { new ResizeObserver(ajustarStickyBusqueda).observe(hd); } catch (e) {} }
});

// Usa el sistema de confirmación existente: nunca elimina con un clic accidental
async function eliminarTarea(tareaId) {
  const t = tareasJornada().find(x => x.id === tareaId);
  if (!t) return;
  const items = itemsDeTarea(State.jornada, tareaId);
  const ok = await confirmDialog('¿Eliminar la TAREA ' + t.correlativo + '?\n'
    + items.length + ' baremo(s) · ' + fmt(t.total || 0) + '\nEsta acción no se puede deshacer.');
  if (!ok) return;
  State.tareas = tareasJornada().filter(x => x.id !== tareaId);
  State.items = (State.items || []).filter(it => it.tareaId !== tareaId);
  await saveJornada();
  renderAll();
  toast('TAREA ' + t.correlativo + ' eliminada', 'success');
}

/* ------------------------------------ permiso de ubicación al primer inicio */

async function solicitarPermisoUbicacionInicial() {
  let yaPreguntado = false;
  try { yaPreguntado = localStorage.getItem(GEO_LS_ONBOARDING) === '1'; } catch (e) {}
  if (yaPreguntado) return;
  if (!('geolocation' in navigator)) return;

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const st = await navigator.permissions.query({ name: 'geolocation' });
      if (st && st.state === 'granted') {
        try { localStorage.setItem(GEO_LS_ONBOARDING, '1'); } catch (e) {}
        return;                         // ya autorizado: no se vuelve a molestar
      }
      if (st && st.state === 'denied') {
        try { localStorage.setItem(GEO_LS_ONBOARDING, '1'); } catch (e) {}
        return;                         // ya denegado: no insistir
      }
    }
  } catch (e) {}

  try { localStorage.setItem(GEO_LS_ONBOARDING, '1'); } catch (e) {}
  navigator.geolocation.getCurrentPosition(
    pos => {
      _ultimaPosicion = {
        lat: pos.coords.latitude, lon: pos.coords.longitude,
        precision: typeof pos.coords.accuracy === 'number' ? Math.round(pos.coords.accuracy) : null,
        ts: Date.now()
      };
      toast('Ubicación habilitada para registrar tus tareas', 'success');
    },
    () => { /* si rechaza, no se insiste: al finalizar una tarea existe el respaldo manual */ },
    { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: GEO_MAX_AGE_MS }
  );
}

/* --------------------------------------------------------------- arranque */

function setupTareasGPS() {
  const b = $('#btnFinalizarTarea');
  if (b) b.addEventListener('click', finalizarTarea);

  const form = $('#formUbicacionManual');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      await guardarUbicacionManual($('#ubicManualInput').value);
    };
  }
  const cancelar = $('#ubicCancelar');
  if (cancelar) {
    cancelar.onclick = () => {
      cerrarModalUbicacion();
      limpiarBorradorProceso();
      toast('Tarea sin finalizar: tus baremos siguen guardados', 'info');
    };
  }
  const reintentar = $('#ubicReintentar');
  if (reintentar) {
    reintentar.onclick = async () => {
      cerrarModalUbicacion();
      _ultimaPosicion = null;              // fuerza una lectura nueva del GPS
      await finalizarTarea();
    };
  }

  // Aviso si el navegador se recargó en medio del proceso (nada se perdió)
  try {
    const raw = localStorage.getItem(GEO_LS_EN_PROCESO);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.cantidadBaremos > 0) {
        setTimeout(() => toast('Se recuperó una tarea sin finalizar: ' + d.cantidadBaremos + ' baremo(s) intactos', 'info'), 1200);
      }
      limpiarBorradorProceso();
    }
  } catch (e) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTareasGPS);
} else {
  setupTareasGPS();
}

/* ============================================================================
   UBICACIÓN EN HISTORIAL Y REPORTES PDF (aditivo)
   No altera el formato existente: solo agrega un bloque cuando la jornada
   contiene tareas con ubicación. Las jornadas antiguas no se modifican.
   ========================================================================== */

function textoUbicacionTarea(t) {
  if (!t) return 'Ubicación no registrada';
  if (t.direccion) {
    return t.direccion + (t.tipoUbicacion === 'manual' ? ' (manual)' : '');
  }
  if (t.lat != null && t.lon != null) {
    return 'Lat ' + Number(t.lat).toFixed(5) + ' / Lon ' + Number(t.lon).toFixed(5);
  }
  return 'Ubicación no registrada';
}

// Detalle de jornada (Historial): agrega tarea, fecha, hora, zona, dirección,
// ubicación, baremos y total. Si no hay tareas registradas, informa el caso.
function renderUbicacionesJornada(j) {
  const modal = document.querySelector('#modalJornada .modal');
  if (!modal) return;
  let box = document.getElementById('mjUbicaciones');
  if (!box) {
    box = document.createElement('div');
    box.id = 'mjUbicaciones';
    box.className = 'mj-ubic';
    const tabla = modal.querySelector('.table-wrap');
    if (tabla) modal.insertBefore(box, tabla);
    else modal.appendChild(box);
  }

  const tareas = Array.isArray(j.tareas) ? j.tareas : [];
  if (!tareas.length) {
    box.innerHTML = '<div class="mj-ubic-title">📍 Ubicación de tareas</div>'
      + '<div class="mj-ubic-row" style="color:var(--text-soft)">Ubicación no registrada</div>';
    return;
  }

  box.innerHTML = '<div class="mj-ubic-title">📍 Tareas con ubicación (' + tareas.length + ')</div>'
    + tareas.map(t => {
      const items = (j.items || []).filter(it => it.tareaId === t.id);
      const url = urlMapaTarea(t);
      const tipo = t.tipoUbicacion === 'gps' ? 'GPS' : (t.tipoUbicacion === 'manual' ? 'Manual' : 'No registrada');
      return '<div class="mj-ubic-row">'
        + '<strong>TAREA ' + escapeHtml(t.correlativo) + '</strong> · ' + escapeHtml(fechaCorta(t.fecha)) + ' ' + escapeHtml(t.hora || '') + '<br>'
        + 'Zona: ' + escapeHtml(t.zona || '-') + ' · Tipo: ' + escapeHtml(t.tipoTrabajo || 'No registrado')
        + ' · Ubicación: ' + escapeHtml(tipo) + '<br>'
        + 'Dirección: ' + escapeHtml(textoUbicacionTarea(t)) + '<br>'
        + 'Baremos: ' + items.length + ' · Total: <strong>' + fmt(t.total || 0) + '</strong>'
        + (url ? ' · <a href="' + url + '" target="_blank" rel="noopener noreferrer">🗺️ Ver mapa</a>' : '')
        + '</div>';
    }).join('');
}

// Agrega al PDF una tabla compacta con la ubicación de las tareas de la jornada.
// Devuelve la nueva coordenada Y. Si la jornada no tiene tareas, no cambia nada.
function agregarTablaUbicacionesPDF(doc, j, y) {
  const tareas = Array.isArray(j.tareas) ? j.tareas : [];
  if (!tareas.length || !doc.autoTable) return y;

  if (y > 235) { doc.addPage(); y = 25; }

  const body = tareas.map(t => [
    'TAREA ' + (t.correlativo || '') + (t.tipoTrabajo ? '\n' + t.tipoTrabajo : ''),
    fechaCorta(t.fecha) + ' ' + (t.hora || ''),
    t.zona || '-',
    textoUbicacionTarea(t),
    (t.lat != null && t.lon != null) ? (Number(t.lat).toFixed(5) + ', ' + Number(t.lon).toFixed(5)) : '-',
    fmt(t.total || 0)
  ]);

  doc.autoTable({
    startY: y,
    head: [['Tarea', 'Fecha / Hora', 'Zona', 'Dirección', 'Coordenadas', 'Total']],
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [21, 163, 91] },
    columnStyles: { 3: { cellWidth: 55 } },
    margin: { left: 14, right: 14 }
  });

  return doc.lastAutoTable.finalY + 8;
}
