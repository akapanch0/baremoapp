/* ============================================================
   BAREMOS v5.8.34 - app.js COMPLETO
   ============================================================ */
const APP_VERSION = '5.8.34';

/* Control de versión de Términos y Condiciones */
const CURRENT_TERMS_VERSION = 1;

const State = {
  user: null,
  jornada: null,
  currentTarea: { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 },
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
  metaAlcanzada: false,
  chartInstances: {}
};

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = n => new Intl.NumberFormat('es-AR').format(n || 0);

/* ============================================================
   INSTALACIÓN PWA Y NOTIFICACIONES
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#btnInstallHeader');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const btn = $('#btnInstallHeader');
  if (btn) btn.style.display = 'none';
  console.log('PWA fue instalada.');
});

function isIOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function openInstallModal() {
  const modal = $('#modalInstallPWA');
  const iosInstructions = $('#iosInstallInstruction');
  const btnConfirm = $('#btnConfirmInstall');
  
  if (isIOS()) {
    if (iosInstructions) iosInstructions.style.display = 'block';
    if (btnConfirm) btnConfirm.style.display = 'none';
  } else {
    if (iosInstructions) iosInstructions.style.display = 'none';
    if (!deferredPrompt) {
      if (btnConfirm) { btnConfirm.textContent = 'App ya instalada'; btnConfirm.disabled = true; }
    } else {
      if (btnConfirm) { btnConfirm.textContent = '📲 Instalar App'; btnConfirm.disabled = false; }
    }
  }
  if (modal) modal.classList.add('show');
}

function sendLocalNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200]
      });
    } else {
      new Notification(title, { body: body, icon: 'icons/icon-192.png' });
    }
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") sendLocalNotification(title, body);
    });
  }
}

setInterval(async () => {
  if (!State.user) return;
  try {
    const config = await dbGet('config', 'reminderConfig');
    if (config && config.active) {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      
      if (currentTime === config.time) {
        const lastNotified = await dbGet('config', 'lastNotifiedDate');
        const todayDate = hoy();
        if (!lastNotified || lastNotified.value !== todayDate) {
          sendLocalNotification("¡Hora de cerrar BAREMOS!", "Recordá registrar tus tareas y cerrar la jornada de hoy.");
          await dbPut('config', { key: 'lastNotifiedDate', value: todayDate });
        }
      }
    }
  } catch (e) {}
}, 60000);

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
   CONTENIDO MENÚ LEGAL E INFORMACIÓN (MODALES)
   ============================================================ */
const INFO_CONTENT = {
  privacidad: {
    title: "Política de Privacidad",
    html: `<h3>1. Almacenamiento Local</h3><p>Toda la información se mantiene resguardada exclusivamente dentro de tu dispositivo mediante IndexedDB.</p><h3>2. No recopilación</h3><p>BAREMOS no envía registros a bases de datos en la nube.</p>`
  },
  terminos: {
    title: "Términos y Condiciones",
    html: `<h3>1. Aceptación</h3><p>Al utilizar BAREMOS, aceptás que la app funciona "tal cual", eximiendo al desarrollador por cualquier discrepancia en liquidaciones.</p>`
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
  if (titulo) titulo.textContent = `Zona: ${mapa.nombre}`;
  if (nombre) nombre.textContent = mapa.nombre;
  if (img) img.style.display = 'none';
  if (placeholder) {
    placeholder.innerHTML = `<div><span class="zmp-ico">⏳</span><span>Cargando mapa...</span></div>`;
    placeholder.style.display = 'grid';
  }
  container.classList.remove('show');
  void container.offsetWidth;
  const nuevaImg = new Image();
  nuevaImg.onload = () => {
    if (img) { img.src = `maps/${mapa.archivo}`; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    container.classList.add('show');
  };
  nuevaImg.onerror = () => {
    if (placeholder) {
      placeholder.innerHTML = `<div><span class="zmp-ico">⚠️</span><span>Mapa no disponible</span></div>`;
      placeholder.style.display = 'grid';
    }
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
const FRASES = [
  "Hoy es un nuevo día productivo", "Tu esfuerzo es tu mayor recompensa", "Cada tarea completada es un paso hacia el éxito",
  "La disciplina vence al talento", "Hacé que cada minuto cuente", "El éxito es la suma de pequeños esfuerzos",
  "Tu dedicación inspira a los demás", "Cada baremo es una victoria", "La constancia es la clave del progreso",
  "Hoy vas a superar tus propios récords", "El trabajo bien hecho no pasa desapercibido", "La excelencia es un hábito",
  "Tu compromiso marca la diferencia", "Los grandes logros empiezan con un primer paso", "Cada jornada es una oportunidad de triunfar"
];

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

function mostrarMensaje100k() { State.mensaje100kMostrado = true; mostrarMensajeDiario(MENSAJES_100K, 'linear-gradient(135deg, #f59e0b, #d97706)'); }
function mostrarMensaje125k() { State.mensaje125kMostrado = true; mostrarMensajeDiario(MENSAJES_125K, 'linear-gradient(135deg, #22c55e, #16a34a)'); }
function mostrarMensaje150k() { State.mensaje150kMostrado = true; mostrarMensajeDiario(MENSAJES_150K, 'linear-gradient(135deg, #10b981, #047857)'); }
function mostrarMensaje200k() { State.mensaje200kMostrado = true; mostrarMensajeDiario(MENSAJES_200K, 'linear-gradient(135deg, #ffd700, #ff6b6b, #4ecdc4)'); lanzarConfeti(); }

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
  setTimeout(() => { if(cont) cont.innerHTML = ''; }, 5000);
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
  if (!f) return '';
  const [y,m,d] = f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fechaCorta(f) {
  if (!f) return '';
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
  if (!ms) return '';
  const [y,m] = ms.split('-').map(Number);
  return new Date(y,m-1).toLocaleDateString('es-AR',{month:'long',year:'numeric'});
}
function diasDelMes(ms) {
  if (!ms) return 30;
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
    if (!m) { res(true); return; }
    
    const msgEl = $('#modalConfirmMsg');
    if (msgEl) msgEl.textContent = msg;
    m.classList.add('show');

    const btnOk = $('#confirmOk');
    if (btnOk) {
      btnOk.onclick = () => {
        m.classList.remove('show');
        res(true);
      };
    }
    
    const btnCancel = $('#confirmCancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        m.classList.remove('show');
        res(false);
      };
    }
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
    if (swRegistration.waiting) checkForUpdate(true);
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            checkForUpdate(true);
          }
        });
      }
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
  
  const btnNow = document.getElementById('updateNowBtn');
  if (btnNow) {
    btnNow.onclick = async () => {
      notification.remove();
      btnNow.innerText = "Actualizando..."; btnNow.disabled = true;
      try {
        if (swRegistration && swRegistration.waiting) {
          swRegistration.waiting.postMessage('SKIP_WAITING');
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let reg of regs) await reg.unregister();
        const keys = await caches.keys();
        for (let key of keys) await caches.delete(key);
      } catch(e) {}
      window.location.href = window.location.pathname + '?updated=true&t=' + Date.now();
    };
  }
  
  const btnLater = document.getElementById('updateLaterBtn');
  if (btnLater) {
    btnLater.onclick = () => {
      notification.remove();
      State.updateAvailable = false;
    };
  }
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
   TÉRMINOS Y PRIVACIDAD
   ============================================================ */
function getAcceptedTermsVersion() {
  try { return parseInt(localStorage.getItem('baremos_terms_version')) || 0; }
  catch(e) { return 0; }
}

function setAcceptedTermsVersion() {
  try { localStorage.setItem('baremos_terms_version', CURRENT_TERMS_VERSION.toString()); }
  catch(e) { console.warn('Error saving terms:', e); }
}

function mostrarPopupTerminos() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  
  const modal = $('#modalTerms');
  const content = $('#termsModalContent');
  if (!modal) {
    continuarInicio();
    return;
  }
  if (content && INFO_CONTENT && INFO_CONTENT.terminos) {
    content.innerHTML = INFO_CONTENT.terminos.html;
  }
  modal.classList.add('show');
}

/* ============================================================
   MIGRACIÓN Y NORMALIZACIÓN DE DATOS
   ============================================================ */
function getSafeItems(j) {
  let safeItems = [];
  if (j.items && j.items.length > 0) {
    safeItems = j.items;
  } else if (j.tareas && j.tareas.length > 0) {
    j.tareas.forEach(t => { if (t.items) safeItems = safeItems.concat(t.items); });
  }
  return safeItems;
}

function getNormalizedTareas(j) {
  if (j.tareas && j.tareas.length > 0) return j.tareas;
  if (j.items && j.items.length > 0) {
    return [{
      id: j.id || Date.now(),
      fecha: j.fecha,
      hora: '',
      zona: j.zona || '-',
      items: j.items,
      total: j.items.reduce((a, it) => a + (it.subtotal || 0), 0)
    }];
  }
  return [];
}

/* ============================================================
   INICIALIZACIÓN (SPLASH PROTEGIDO CONTRA CUELGUES)
   ============================================================ */
let initFinished = false;

function safeHideSplash() {
  if (initFinished) return;
  initFinished = true;
  const splash = $('.splash');
  if (splash) splash.classList.add('hide');
  
  const acceptedVersion = getAcceptedTermsVersion();
  if (acceptedVersion < CURRENT_TERMS_VERSION) {
    mostrarPopupTerminos();
  } else {
    continuarInicio();
  }
}

// Resguardo total: si algo se traba, a los 2.5s se quita el Splash forzosamente
setTimeout(safeHideSplash, 2500);

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
    toast('Iniciando en modo rescate: ' + e.message, 'warn');
  } finally {
    setTimeout(safeHideSplash, 400);
  }
  
  try {
    await registerSW();
    setTimeout(() => checkForUpdate(true), 3500);
  } catch(e) {}
}

async function continuarInicio() {
  if (State.user) {
    try { await loadOrCreateJornada(); } catch (e) {}
    showApp();
  } else { 
    showLogin(); 
  }
}

async function loadTheme() {
  try {
    const c = await dbGet('config', 'theme');
    State.theme = c?.value || 'light';
    document.documentElement.setAttribute('data-theme', State.theme);
  } catch(e) {}
}

function toggleTheme() {
  State.theme = State.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', State.theme);
  dbPut('config', { key: 'theme', value: State.theme });
  toast(`Modo ${State.theme === 'light' ? 'claro' : 'oscuro'}`, 'success');
}

async function loadBaremo() {
  let d = [];
  try { d = await dbGetAll('baremo'); } catch(e) { console.warn(e); }
  
  const normalizeArray = (arr) => {
    return arr.map(r => ({
      baremo: String(getField(r, 'BAREMO', 'baremo', 'Codigo', 'codigo', 'Código', 'CÓDIGO')).trim(),
      descripcion: String(getField(r, 'DESCRIPCION', 'descripcion', 'Descripción', 'Descripcion', 'DETALLE')).trim(),
      precio: parsePrecio(getField(r, 'PRECIO', 'precio', 'Precio', 'VALOR'))
    })).filter(r => r.baremo !== '' && r.baremo !== 'undefined');
  };

  let needsRepair = false;
  if (d && d.length > 0) {
    needsRepair = d.some(b => b.descripcion === undefined || b.precio === undefined);
  }

  if (!d || d.length === 0 || needsRepair) {
    try {
      const r = await fetch('baremo.json', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        let arr = Array.isArray(j) ? j : (j.baremos || j.data || [j]);
        const norm = normalizeArray(arr);
        
        if (norm.length > 0) {
          if (needsRepair && d) {
            for (const o of d) if (o.baremo) await dbDelete('baremo', o.baremo);
          }
          for (const i of norm) await dbPut('baremo', i);
          d = await dbGetAll('baremo');
        }
      }
    } catch(e) {}
  }
  State.baremo = normalizeArray(d || []);
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
  } catch(e) { toast('Error al cargar archivo de baremo', 'error'); }
}

async function loadUser() {
  try {
    const c = await dbGet('config', 'activeUser');
    if (c && c.value) State.user = await dbGet('usuarios', c.value);
  } catch(e) {}
}

function showLogin() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  const vl = $('#viewLogin');
  if(vl) vl.classList.add('active');
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
  State.user = null; State.jornada = null; State.items = []; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  const h = $('#headerUser'); if (h) h.textContent = 'Ingresar';
  const hz = $('#headerUserZona'); if (hz) hz.textContent = '';
  const bz = $('#btnChangeZona'); if (bz) bz.style.display = 'none';
  const sw = $('#modalSwitchUser'); if (sw) sw.classList.remove('show');
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
    State.user = null; State.jornada = null; State.items = []; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
    const sw = $('#modalSwitchUser'); if(sw) sw.classList.remove('show');
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
  if (!lst || !m) return;
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
  ab.onclick = () => { m.classList.remove('show'); showLogin(); };
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
    if (!State.jornada.tareas) {
      if (State.jornada.items && State.jornada.items.length > 0) {
        State.jornada.tareas = [{
          id: Date.now() + Math.random(),
          fecha: State.jornada.fecha,
          hora: '',
          zona: State.jornada.zona || '-',
          items: State.jornada.items,
          total: State.jornada.items.reduce((a, i) => a + (i.subtotal || 0), 0)
        }];
      } else {
        State.jornada.tareas = [];
      }
    }
    State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  } else if (ex.length > 0) {
    if (await confirmDialog('Jornada cerrada hoy. ¿Crear nueva?')) await crearJornadaNueva();
    else { State.jornada = null; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 }; }
  } else {
    await crearJornadaNueva();
  }
}

async function crearJornadaNueva() {
  State.mensaje200kMostrado = false;
  State.mensaje150kMostrado = false;
  State.mensaje125kMostrado = false;
  State.mensaje100kMostrado = false;
  const j = { fecha: hoy(), horaInicio: ahora(), ultimaMod: ahora(), legajo: State.user.legajo, usuario: State.user.nombre, zona: State.user.zona, tareas: [], items: [], cerrada: false, total: 0 };
  j.id = await dbAdd('jornadas', j);
  State.jornada = j; 
  State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
}

async function saveJornada() {
  if (!State.jornada) return;
  State.jornada.ultimaMod = ahora();
  State.jornada.total = (State.jornada.tareas || []).reduce((a, t) => a + (t.total || 0), 0);
  State.jornada.cantidadRegistros = (State.jornada.tareas || []).length;
  
  let countItems = 0;
  if (State.jornada.tareas) {
    State.jornada.tareas.forEach(t => {
      if (t.items) countItems += t.items.reduce((sa, i) => sa + (i.cantidad || 0), 0);
    });
  }
  State.jornada.cantidadItems = countItems;
  await dbPut('jornadas', State.jornada);
}

async function cerrarJornada() {
  if (!State.jornada) { toast('No hay jornada', 'warn'); return; }
  if (State.currentTarea && State.currentTarea.items && State.currentTarea.items.length > 0) {
    toast('Finaliza o elimina la tarea en curso antes de cerrar la jornada', 'warn');
    return;
  }
  if (!await confirmDialog('¿Cerrar jornada? No podrá editarse.')) return;
  State.jornada.cerrada = true;
  State.jornada.horaCierre = ahora();
  await saveJornada();
  toast('Jornada cerrada', 'success');
  State.jornada = null; 
  State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  await crearJornadaNueva();
  renderAll();
}

/* ============================================================
   REGISTRO Y GESTIÓN DE TAREAS
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
    
    State.currentTarea.items.push(newItem);
    State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
    
    renderItems();
    renderTotales();
    
    input.value = '';
    qtyInput.value = 1;
    lst.classList.remove('show');
    baremoSeleccionado = null;
    ultimoTexto = '';
    input.focus();
    toast(`Agregado x${c} a la tarea`, 'success');
  }
  
  const btnAgregar = document.getElementById('btnAgregar');
  if (btnAgregar) btnAgregar.addEventListener('click', (e) => { e.preventDefault(); agregar(); });
  
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

  const btnFinalizar = document.getElementById('btnFinalizarTarea');
  if (btnFinalizar) {
    btnFinalizar.onclick = async (e) => {
      e.preventDefault();
      try {
        if (!State.currentTarea || !State.currentTarea.items || State.currentTarea.items.length === 0) {
          toast('La tarea no tiene baremos agregados', 'warn');
          return;
        }
        
        const backupTareas = State.jornada.tareas ? [...State.jornada.tareas] : [];
        const nuevaTareaConfirmada = {
          id: Date.now() + Math.random(),
          fecha: hoy(),
          hora: new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}),
          zona: State.user?.zona || 'Sin zona',
          items: JSON.parse(JSON.stringify(State.currentTarea.items)),
          total: State.currentTarea.total || 0,
          estado: 'finalizada'
        };
        
        if (!State.jornada.tareas) State.jornada.tareas = [];
        State.jornada.tareas.push(nuevaTareaConfirmada);
        
        await saveJornada(); 
        State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
        renderAll(); 
        toast('Tarea finalizada exitosamente', 'success');
      } catch (error) {
        if (State.jornada && backupTareas) State.jornada.tareas = backupTareas;
        console.error('[Error de Almacenamiento Tarea]', error);
        toast('Error al guardar en base de datos. Por favor, reintenta.', 'error');
      }
    };
  }

  const btnCerrar = $('#btnCerrarJornada');
  if (btnCerrar) btnCerrar.onclick = () => cerrarJornada();
}

function renderItems() {
  const tb = $('#itemsBody');
  const card = $('#currentTaskCard');
  if (!tb || !card) return;
  
  if (!State.currentTarea || State.currentTarea.items.length === 0) {
    card.style.display = 'none';
    tb.innerHTML = '';
  } else {
    card.style.display = 'block';
    tb.innerHTML = State.currentTarea.items.map((it, i) => `<tr class="adding"><td class="hide-mob">${i + 1}</td><td><strong>${it.codigo}</strong></td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td><input type="number" min="1" class="qty-input" value="${it.cantidad}" data-id="${it.id}"></td><td><strong>${fmt(it.subtotal)}</strong></td><td><button class="del-btn" data-id="${it.id}">🗑️</button></td></tr>`).join('');
    
    const ctTotal = $('#currentTaskTotal');
    if (ctTotal) ctTotal.textContent = fmt(State.currentTarea.total);
    
    tb.querySelectorAll('.qty-input').forEach(inp => {
      inp.onchange = e => {
        const it = State.currentTarea.items.find(i => i.id === parseFloat(e.target.dataset.id));
        if (!it) return;
        it.cantidad = parseInt(e.target.value) || 1;
        it.subtotal = it.precio * it.cantidad;
        State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
        renderAll();
      };
    });
    tb.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async e => {
        const id = parseFloat(e.target.dataset.id);
        State.currentTarea.items = State.currentTarea.items.filter(i => i.id !== id);
        State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
        renderAll();
        toast('Baremo eliminado', 'success');
      };
    });
  }

  const tl = $('#tareasFinalizadasList');
  if (!tl) return;
  if (!State.jornada || !State.jornada.tareas || State.jornada.tareas.length === 0) {
    tl.innerHTML = '<div class="empty"><div class="ico">📋</div><p>Sin tareas finalizadas</p></div>';
  } else {
    const tareasReversed = [...State.jornada.tareas].reverse();
    const totalCount = State.jornada.tareas.length;
    
    tl.innerHTML = tareasReversed.map((t, i) => {
      const originalIdx = String(totalCount - i).padStart(3, '0');
      const itemsArray = t.items || [];
      const cantBaremos = itemsArray.length;
      const fDate = t.fecha || State.jornada.fecha;
      const fHora = t.hora ? ` ${t.hora}` : '';
      const fZona = t.zona || State.jornada.zona || '-';
      
      return `
      <div class="tarea-card">
        <div class="tarea-header" style="cursor:pointer;" onclick="this.parentElement.classList.toggle('expanded')">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--primary); font-weight:800; font-size:13px; text-transform:uppercase;">
                TAREA ${originalIdx}
              </span>
              <span class="expand-ico">▼</span>
            </div>
            <div style="font-size:11px; color:var(--text-soft); margin-top:6px; font-weight:600; display:flex; flex-direction:column; gap:4px;">
              <span>Fecha: ${fechaCorta(fDate)}${fHora}</span>
              <span>Zona: ${fZona}</span>
              <span style="color:var(--text); font-weight:700; margin-top:2px;">Total de la tarea: ${fmt(t.total)}</span>
            </div>
          </div>
        </div>
        <div class="tarea-body">
          <div style="padding: 10px 14px 6px; font-size: 11px; font-weight: 800; color: var(--text-soft); text-transform: uppercase;">Baremos incluidos (${cantBaremos}):</div>
          <div class="table-wrap" style="border:none; border-radius:0; margin:0;">
            <table>
              <thead><tr><th>Cód</th><th>Desc</th><th class="hide-mob" style="text-align:right;">Precio</th><th style="text-align:center;">Cant</th><th style="text-align:right;">Sub</th></tr></thead>
              <tbody>
                ${itemsArray.map(it => `
                  <tr>
                    <td><strong>${it.codigo}</strong></td>
                    <td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td>
                    <td class="hide-mob" style="text-align:right;">${fmt(it.precio)}</td>
                    <td style="text-align:center;">x${it.cantidad}</td>
                    <td style="text-align:right;"><strong>${fmt(it.subtotal)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="tarea-footer">
            <button class="btn btn-ghost btn-sm del-tarea-btn" data-id="${t.id}" style="color:var(--danger); border-color:var(--danger-soft); width:auto;">🗑️ Eliminar Tarea</button>
            <div class="tarea-total">
              TOTAL DE LA TAREA: <span style="color: var(--primary);">${fmt(t.total)}</span>
            </div>
          </div>
        </div>
      </div>
    `}).join('');
    
    const firstCard = tl.querySelector('.tarea-card');
    if (firstCard) firstCard.classList.add('expanded');
    
    tl.querySelectorAll('.del-tarea-btn').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        if (!await confirmDialog('¿Eliminar la tarea completa y todos sus baremos?')) return;
        const id = parseFloat(e.target.dataset.id);
        State.jornada.tareas = State.jornada.tareas.filter(t => t.id !== id);
        await saveJornada();
        renderAll();
        toast('Tarea eliminada', 'success');
      };
    });
  }
}

function renderTotales() {
  if (!State.jornada) return;
  
  const totalTareas = (State.jornada.tareas || []).length;
  let totalItemsFinalizados = 0;
  (State.jornada.tareas || []).forEach(t => {
    if (t.items) totalItemsFinalizados += t.items.reduce((s, i) => s + (i.cantidad || 0), 0);
  });
  const totalItemsActuales = (State.currentTarea && State.currentTarea.items) ? State.currentTarea.items.reduce((a, i) => a + (i.cantidad || 0), 0) : 0;
  const sumFinalizadas = (State.jornada.tareas || []).reduce((a, t) => a + (t.total || 0), 0);
  const t = sumFinalizadas;
  
  const tr = $('#totalRegs'); if (tr) tr.textContent = fmtNum(totalTareas);
  const ti = $('#totalItems'); if (ti) ti.textContent = fmtNum(totalItemsFinalizados + totalItemsActuales);
  const tg = $('#totalGeneral'); if (tg) tg.textContent = fmt(t);
  const tgb = $('#totalGeneralBig'); if (tgb) tgb.textContent = fmt(t);
  
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
  const vn = $(`#view${n}`); if(vn) vn.classList.add('active');
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
  
  if (h) h.textContent = `${State.user.nombre} · ${State.user.legajo}`;
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

function renderAll() { renderItems(); renderTotales(); }

/* ============================================================
   HISTORIAL Y EXPORTACIONES
   ============================================================ */
async function renderHistorial() {
  const all = await dbGetAll('jornadas');
  let f = all.filter(j => j.legajo === State.user.legajo);
  if (State.histFilter === 'hoy') f = f.filter(j => j.fecha === hoy());
  else if (State.histFilter === 'mes') f = f.filter(j => j.fecha.startsWith(mesActual()));
  else if (State.histFilter === 'mesAnterior') f = f.filter(j => j.fecha.startsWith(mesAnterior()));
  
  const searchInput = $('#histSearch');
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase();
    f = f.filter(j => (j.fecha && j.fecha.includes(q)) || (j.usuario && j.usuario.toLowerCase().includes(q)));
  }

  f.sort((a, b) => b.fecha.localeCompare(a.fecha));
  
  const lst = $('#historialList');
  const ab = $('#histActionsBar');
  if (!lst) return;
  
  if (ab) {
    if (State.histSelected.size > 0) {
      ab.classList.add('show');
      const hc = $('#habCount'); if(hc) hc.textContent = `${State.histSelected.size} seleccionada(s)`;
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
    const tareasNorm = getNormalizedTareas(j);
    const cantTareas = tareasNorm.length;
    const cantItems = tareasNorm.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);
    return `<div class="jornada-item ${is ? 'selected' : ''}" data-id="${j.id}"><div class="ji-left"><div class="fecha">${fechaCorta(j.fecha)}</div><div class="meta">${cantTareas} tareas · ${cantItems} ítems</div></div><div class="ji-right"><div class="total">${fmt(j.total || 0)}</div><div class="estado ${j.cerrada ? 'cerrada' : 'abierta'}">${j.cerrada ? 'CERRADA' : 'ABIERTA'}</div><div class="ji-actions"><div class="check-box ${is ? 'checked' : ''}" data-act="select" data-id="${j.id}"></div><button class="mini-btn view" data-act="view" data-id="${j.id}">👁️</button>${j.cerrada ? `<button class="mini-btn export" data-act="export" data-id="${j.id}">📄</button>` : ''}</div></div></div>`;
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
  lst.querySelectorAll('[data-act="view"]').forEach(el => { el.onclick = e => { e.stopPropagation(); openJornada(parseInt(el.dataset.id)); }; });
  lst.querySelectorAll('[data-act="export"]').forEach(el => { el.onclick = async e => { e.stopPropagation(); await exportarJornadaPDF(parseInt(el.dataset.id)); }; });
  lst.querySelectorAll('.jornada-item').forEach(el => { el.onclick = () => openJornada(parseInt(el.dataset.id)); });
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
  const tareas = getNormalizedTareas(j);
  const totalItems = tareas.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);
  
  const fFecha = $('#mjFecha'); if(fFecha) fFecha.textContent = fechaLegible(j.fecha);
  const fTotal = $('#mjTotal'); if(fTotal) fTotal.textContent = fmt(j.total);
  const fMeta = $('#mjMeta'); if(fMeta) fMeta.textContent = `${tareas.length} tareas · ${totalItems} ítems · ${j.cerrada ? 'CERRADA' : 'ABIERTA'}`;
  
  const bd = $('#mjBody');
  if(bd) {
    let html = '';
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx+1).padStart(3,'0')}`;
      html += `<tr style="background:var(--surface-2)"><td colspan="6" style="font-weight:800; color:var(--primary); font-size:11px;">${labelTarea}</td></tr>`;
      (t.items || []).forEach((it, i) => {
        html += `<tr><td class="hide-mob">${i + 1}</td><td><strong>${it.codigo}</strong></td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td>${it.cantidad}</td><td>${fmt(it.subtotal)}</td></tr>`;
      });
      html += `<tr><td colspan="6" style="text-align:right; font-weight:800; font-size:12px; border-bottom: 2px solid var(--border);">Total de la Tarea: ${fmt(t.total)}</td></tr>`;
    });
    bd.innerHTML = html;
  }
  const modal = $('#modalJornada'); if(modal) modal.classList.add('show');
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
  
  const tareas = getNormalizedTareas(j);
  const body = [];
  tareas.forEach((t, idx) => {
    const isLegacy = t.referencia === 'Registros Anteriores';
    const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
    body.push([{ content: labelTarea, colSpan: 6, styles: { fillColor: [240, 243, 249], fontStyle: 'bold', textColor: [11, 61, 145] } }]);
    (t.items || []).forEach((it, i) => {
      body.push([i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
    });
    body.push([{ content: `TOTAL DE LA TAREA: ${fmt(t.total)}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]);
  });
  
  doc.autoTable({
    startY: 45,
    head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
    body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 61, 145] },
    margin: { left: 14, right: 14 }
  });
  
  const y = doc.lastAutoTable.finalY + 10;
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
    doc.text(`▶ Jornada: ${fechaLegible(j.fecha)}   |   Total Día: ${fmt(j.total || 0)}`, 16, currentY + 6);
    currentY += 10;
    
    totalAcu += (j.total || 0);

    const tareas = getNormalizedTareas(j);
    const body = [];
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
      body.push([{ content: labelTarea, colSpan: 6, styles: { fillColor: [240, 243, 249], fontStyle: 'bold', textColor: [11, 61, 145] } }]);
      (t.items || []).forEach((it, i) => {
        body.push([i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
      });
      body.push([{ content: `Total Tarea: ${fmt(t.total)}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]);
    });
    
    doc.autoTable({
      startY: currentY,
      head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
      body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 201] },
      margin: { left: 14, right: 14 }
    });
    
    currentY = doc.lastAutoTable.finalY + 10;
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
    const detalle = [];
    const tareas = getNormalizedTareas(x);
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const fRef = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
      detalle.push({ '#': fRef, Código: '', Subtotal: t.total });
      (t.items || []).forEach((it, i) => {
        detalle.push({
          '#': i + 1, Código: it.codigo, Descripción: it.descripcion,
          Precio: it.precio, Cantidad: it.cantidad, Subtotal: it.subtotal
        });
      });
      detalle.push({});
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), `Dia_${x.fecha}`.substring(0, 31));
  });
  XLSX.writeFile(wb, `baremos_${nombreMes(mes).replace(' ', '_')}.xlsx`);
  toast('Excel generado', 'success');
}

/* ============================================================
   DASHBOARD & GRÁFICOS
   ============================================================ */
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
  
  const bc = {}, bf = {};
  let totalItemsMes = 0;
  jMes.forEach(j => {
    const arr = getSafeItems(j);
    totalItemsMes += arr.length;
    arr.forEach(it => {
      bc[it.codigo] = (bc[it.codigo] || 0) + it.cantidad;
      bf[it.codigo] = (bf[it.codigo] || 0) + it.subtotal;
    });
  });
  
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
  
  const statDiaAnt = $('#statDiaAnterior'); if(statDiaAnt) statDiaAnt.textContent = fmt(prodAyer);
  const lblFecAyer = $('#lblFechaAyer'); if(lblFecAyer) lblFecAyer.textContent = fecAyer;

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

    const tcAm = $('#tacAmount'); if(tcAm) tcAm.textContent = fmt(tot);
    const tcPb = $('#tacProgressBar'); if(tcPb) tcPb.style.width = progreso + '%';
    const tcPt = $('#tacProgressText'); if(tcPt) tcPt.textContent = `Progreso: ${progreso.toFixed(1)}%`;
    const tcFt = $('#tacFaltanText'); if(tcFt) tcFt.textContent = `Faltan: ${fmt(faltan)}`;

    const overlay = $('#tacOverlayMsg');
    const cfgMes = getConfigMes(tot);
    tacCard.className = 'total-acumulado-card ' + cfgMes.cls;
    if(overlay) overlay.classList.remove('show');

    if (tot > 2000000 && tot <= 2500000) {
      if(overlay){ overlay.textContent = '👏 ¡Sigue así!'; overlay.classList.add('show'); }
    } else if (tot > 2500000 && tot < 3000000) {
      if(overlay){ overlay.textContent = '🚀 Excelente rendimiento'; overlay.classList.add('show'); }
    } else if (tot >= 3000000) {
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
  s('statTrabajos', fmtNum(totalItemsMes)); 
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

function renderCharts(todas) {
  if (!window.Chart) return;
  
  const ctxD = $('#chartDiario')?.getContext('2d');
  const ctxM = $('#chartMensual')?.getContext('2d');
  const ctxP = $('#chartPie')?.getContext('2d');

  if (State.chartInstances.diario) State.chartInstances.diario.destroy();
  if (State.chartInstances.mensual) State.chartInstances.mensual.destroy();
  if (State.chartInstances.pie) State.chartInstances.pie.destroy();

  // Gráfico Diario (Últimos 7 días)
  if (ctxD) {
    const ult7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      ult7.push(d.toISOString().slice(0, 10));
    }
    const dataD = ult7.map(f => {
      const match = todas.filter(j => j.fecha === f);
      return match.reduce((a, j) => a + (j.total || 0), 0);
    });
    
    const t7El = $('#total7Dias');
    if (t7El) t7El.textContent = `Total: ${fmt(dataD.reduce((a, b) => a + b, 0))}`;

    State.chartInstances.diario = new Chart(ctxD, {
      type: 'bar',
      data: {
        labels: ult7.map(f => fechaCorta(f)),
        datasets: [{
          label: 'Producción',
          data: dataD,
          backgroundColor: '#0b3d91',
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  // Gráfico Mensual
  if (ctxM) {
    const meses = {};
    todas.forEach(j => {
      const m = j.fecha.slice(0, 7);
      meses[m] = (meses[m] || 0) + (j.total || 0);
    });
    const mKeys = Object.keys(meses).sort().slice(-6);
    State.chartInstances.mensual = new Chart(ctxM, {
      type: 'line',
      data: {
        labels: mKeys.map(m => nombreMes(m)),
        datasets: [{
          label: 'Producción Mes',
          data: mKeys.map(m => meses[m]),
          borderColor: '#22a06b',
          backgroundColor: 'rgba(34, 160, 107, 0.15)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Gráfico Top 5 Baremos
  if (ctxP) {
    const counts = {};
    todas.forEach(j => {
      getSafeItems(j).forEach(i => { counts[i.codigo] = (counts[i.codigo] || 0) + (i.cantidad || 1); });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    State.chartInstances.pie = new Chart(ctxP, {
      type: 'doughnut',
      data: {
        labels: top.map(t => t[0]),
        datasets: [{
          data: top.map(t => t[1]),
          backgroundColor: ['#0b3d91', '#2563c9', '#22a06b', '#e0a800', '#d93025']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

/* ============================================================
   COMBUSTIBLE
   ============================================================ */
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

/* ============================================================
   QUINCENAS
   ============================================================ */
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
  } else {
    bQ2.classList.remove('bloqueada');
    if (q1 && q1.bloqueada) {
      bQ2.classList.remove('deshabilitada');
      $('#badgeQ2').className = 'qb-badge pendiente';
      $('#badgeQ2').textContent = 'PENDIENTE';
      aQ2.innerHTML = `<span>⚠️</span><span>Una vez registrada quedará <strong>bloqueada permanentemente</strong>.</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = false;
      $('#q2o2').disabled = false;
    } else {
      bQ2.classList.add('deshabilitada');
      $('#badgeQ2').className = 'qb-badge deshabilitada';
      $('#badgeQ2').textContent = 'BLOQUEADA';
      aQ2.innerHTML = `<span>⏳</span><span>Se habilita al registrar la 1ra quincena.</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = true;
      $('#q2o2').disabled = true;
    }
  }

  const lst = $('#quiList');
  if (lst) {
    const todasQ = (await dbGetAll('quincenas')).filter(q => q.legajo === leg).sort((a, b) => b.mes.localeCompare(a.mes));
    if (!todasQ.length) {
      lst.innerHTML = '<div class="empty"><div class="ico">💰</div><p>Sin quincenas registradas</p></div>';
    } else {
      lst.innerHTML = todasQ.map(q => `
        <div class="registro-item">
          <div class="ri-left">
            <div class="pat">${q.tipo === 1 ? '1ra' : '2da'} Quincena · ${nombreMes(q.mes)}</div>
            <div class="fecha">Oficial 1: ${fmt(q.oficial1)} | Oficial 2: ${fmt(q.oficial2)}</div>
          </div>
          <div class="ri-right">
            <div class="monto">${fmt(q.total)}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function setupQuincenas() {
  const f1 = $('#formQ1');
  const f2 = $('#formQ2');
  
  if (f1) {
    f1.onsubmit = async (e) => {
      e.preventDefault();
      const o1 = parseFloat($('#q1o1').value) || 0;
      const o2 = parseFloat($('#q1o2').value) || 0;
      if (!await confirmDialog('¿Confirmar registro de la 1ra Quincena? No podrá editarse.')) return;
      
      const mes = mesActual();
      await dbAdd('quincenas', {
        tipo: 1,
        mes,
        legajo: State.user.legajo,
        oficial1: o1,
        oficial2: o2,
        total: o1 + o2,
        bloqueada: true,
        fechaRegistro: hoy()
      });
      toast('1ra Quincena registrada', 'success');
      renderQuincenas();
      renderDashboard();
    };
  }

  if (f2) {
    f2.onsubmit = async (e) => {
      e.preventDefault();
      const o1 = parseFloat($('#q2o1').value) || 0;
      const o2 = parseFloat($('#q2o2').value) || 0;
      if (!await confirmDialog('¿Confirmar registro de la 2da Quincena? No podrá editarse.')) return;
      
      const mes = mesQuincenaActual();
      await dbAdd('quincenas', {
        tipo: 2,
        mes,
        legajo: State.user.legajo,
        oficial1: o1,
        oficial2: o2,
        total: o1 + o2,
        bloqueada: true,
        fechaRegistro: hoy()
      });
      toast('2da Quincena registrada', 'success');
      renderQuincenas();
      renderDashboard();
    };
  }
}

/* ============================================================
   AJUSTES
   ============================================================ */
function renderAjustes() {
  const c = $('#ajustesList');
  if (!c) return;
  c.innerHTML = `
    <div class="ajuste-item" id="ajItemUsers"><div class="aj-ico">👥</div><div class="aj-text"><div class="aj-title">Gestionar Usuarios</div><div class="aj-desc">Cambiar o eliminar usuarios</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemBaremo"><div class="aj-ico">📋</div><div class="aj-text"><div class="aj-title">Actualizar Baremo</div><div class="aj-desc">Subir archivo Excel o JSON</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemExport"><div class="aj-ico">📤</div><div class="aj-text"><div class="aj-title">Copia de Seguridad</div><div class="aj-desc">Exportar base de datos local</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemImport"><div class="aj-ico">📥</div><div class="aj-text"><div class="aj-title">Restaurar Datos</div><div class="aj-desc">Importar archivo de seguridad</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemUpdate"><div class="aj-ico">🔄</div><div class="aj-text"><div class="aj-title">Buscar Actualizaciones</div><div class="aj-desc">Versión ${APP_VERSION}</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item admin" id="ajItemAdmin"><div class="aj-ico">🔐</div><div class="aj-text"><div class="aj-title">Panel de Administración</div><div class="aj-desc">Reportes consolidados y métricas</div></div><div class="aj-arrow">›</div></div>
    <div class="credits">
      <div class="credits-emoji">⚡</div>
      <div class="credits-label">Desarrollado para Contratistas</div>
      <div class="credits-author">AKAPANCH0</div>
      <div class="credits-divider"></div>
      <div class="app-version">v${APP_VERSION}</div>
    </div>
  `;

  $('#ajItemUsers').onclick = () => switchUser();
  $('#ajItemBaremo').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,.xlsx,.xls';
    inp.onchange = e => { if (e.target.files[0]) updateBaremoFromFile(e.target.files[0]); };
    inp.click();
  };
  $('#ajItemExport').onclick = async () => {
    const d = await exportAllDB();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `baremos_backup_${hoy()}.json`;
    a.click();
    toast('Copia de seguridad descargada', 'success');
  };
  $('#ajItemImport').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async e => {
      if (e.target.files[0]) {
        try {
          const content = JSON.parse(await e.target.files[0].text());
          await importAllDB(content);
          toast('Datos restaurados con éxito', 'success');
          location.reload();
        } catch(err) { toast('Archivo inválido', 'error'); }
      }
    };
    inp.click();
  };
  $('#ajItemUpdate').onclick = () => checkForUpdate(false);
  $('#ajItemAdmin').onclick = () => showView('Admin');
}

/* ============================================================
   ADMINISTRACIÓN Y REPORTES
   ============================================================ */
function setupAdmin() {
  const btnLogin = $('#btnAdminLogin');
  if (btnLogin) {
    btnLogin.onclick = async () => {
      const pass = $('#adminPassword')?.value || '';
      const hash = await sha256(pass);
      const target = await getAdminPasswordHash();
      if (hash === target) {
        State.adminLoggedIn = true;
        $('#adminLogin').style.display = 'none';
        $('#adminPanel').style.display = 'block';
        toast('Acceso Admin concedido', 'success');
        renderAdmin();
      } else {
        toast('Contraseña incorrecta', 'error');
      }
    };
  }

  const btnLogout = $('#btnAdminLogout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      State.adminLoggedIn = false;
      $('#adminLogin').style.display = 'block';
      $('#adminPanel').style.display = 'none';
      if ($('#adminPassword')) $('#adminPassword').value = '';
      showView('Ajustes');
    };
  }

  const typeBtns = $$('#adminReportType button');
  typeBtns.forEach(btn => {
    btn.onclick = () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.adminReportType = btn.dataset.type;
      updateAdminReport();
    };
  });

  const uSelect = $('#adminUsuario');
  const dDate = $('#adminFecha');
  if (uSelect) uSelect.onchange = () => updateAdminReport();
  if (dDate) {
    dDate.value = hoy();
    dDate.onchange = () => updateAdminReport();
  }

  const btnPreview = $('#btnAdminPreview');
  if (btnPreview) btnPreview.onclick = () => updateAdminReport(true);

  const btnPDF = $('#btnAdminPDF');
  if (btnPDF) btnPDF.onclick = () => exportAdminPDF();

  const btnExcel = $('#btnAdminExcel');
  if (btnExcel) btnExcel.onclick = () => exportAdminExcel();
}

async function renderAdmin() {
  if (!State.adminLoggedIn) {
    $('#adminLogin').style.display = 'block';
    $('#adminPanel').style.display = 'none';
    return;
  }
  
  const users = await dbGetAll('usuarios');
  const s = $('#adminUsuario');
  if (s) {
    s.innerHTML = '<option value="todos">👥 Todos los usuarios</option>' + users.map(u => `<option value="${u.legajo}">${u.nombre} (${u.legajo})</option>`).join('');
  }
  updateAdminReport();
}

async function getAdminFilteredJornadas() {
  const u = $('#adminUsuario')?.value || 'todos';
  const f = $('#adminFecha')?.value || hoy();
  const all = await dbGetAll('jornadas');
  
  return all.filter(j => {
    if (u !== 'todos' && j.legajo !== u) return false;
    if (State.adminReportType === 'diario') return j.fecha === f;
    if (State.adminReportType === 'mensual') return j.fecha.startsWith(f.slice(0, 7));
    if (State.adminReportType === 'semanal') {
      const sem = obtenerSemanaDeFecha(f);
      return j.fecha >= sem.lunes && j.fecha <= sem.domingo;
    }
    return true;
  });
}

async function updateAdminReport(showToast = false) {
  const jornadas = await getAdminFilteredJornadas();
  const sumDiv = $('#adminSummary');
  const sumCont = $('#adminSummaryContent');
  if (!sumDiv || !sumCont) return;

  const total = jornadas.reduce((a, j) => a + (j.total || 0), 0);
  let itemsCount = 0;
  jornadas.forEach(j => { itemsCount += getSafeItems(j).length; });

  sumCont.innerHTML = `
    <div class="as-line"><span>Jornadas:</span><strong>${jornadas.length}</strong></div>
    <div class="as-line"><span>Total ítems:</span><strong>${itemsCount}</strong></div>
    <div class="as-line total"><span>Total Recaudado:</span><strong style="color:var(--primary)">${fmt(total)}</strong></div>
  `;
  sumDiv.style.display = 'block';
  if (showToast) toast('Resumen actualizado', 'info');
}

async function exportAdminPDF() {
  const j = await getAdminFilteredJornadas();
  if (!j.length) { toast('Sin datos para exportar', 'warn'); return; }
  await exportarMultiplesPDF(j.map(x => x.id), `Admin_${State.adminReportType}`);
}

async function exportAdminExcel() {
  if (!window.XLSX) return;
  const j = await getAdminFilteredJornadas();
  if (!j.length) { toast('Sin datos', 'warn'); return; }
  const wb = XLSX.utils.book_new();
  const res = j.map(x => ({ Fecha: fechaCorta(x.fecha), Usuario: x.usuario, Legajo: x.legajo, Total: x.total || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res), 'Reporte_Admin');
  XLSX.writeFile(wb, `Reporte_Admin_${hoy()}.xlsx`);
  toast('Excel Admin generado', 'success');
}

/* ============================================================
   EVENT LISTENERS GLOBALES
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  init();
  setupRegistro();
  setupCombustible();
  setupQuincenas();
  setupMapaZona();
  setupAdmin();

  // Navegación de Solapas
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Botón Cambiar Tema
  const btnTheme = $('#btnTheme');
  if (btnTheme) btnTheme.onclick = toggleTheme;

  // Botón Switch Usuario Header
  const btnSwitchUser = $('#btnSwitchUser');
  if (btnSwitchUser) btnSwitchUser.onclick = () => { if (State.user) switchUser(); else showLogin(); };

  // Botón Cambiar Zona Header
  const btnChangeZona = $('#btnChangeZona');
  if (btnChangeZona) {
    btnChangeZona.onclick = () => {
      const m = $('#modalChangeZona');
      const s = $('#newZonaSelect');
      if (m && s && State.user) {
        s.value = State.user.zona || '';
        m.classList.add('show');
      }
    };
  }

  // Modal Cambiar Zona Handlers
  const formChangeZona = $('#formChangeZona');
  if (formChangeZona) {
    formChangeZona.onsubmit = async (e) => {
      e.preventDefault();
      const z = $('#newZonaSelect').value;
      if (z && State.user) {
        State.user.zona = z;
        await dbPut('usuarios', State.user);
        if (State.jornada) { State.jornada.zona = z; await saveJornada(); }
        $('#modalChangeZona').classList.remove('show');
        showApp();
        toast(`Zona cambiada a: ${z}`, 'success');
      }
    };
  }
  const cancelChangeZona = $('#cancelChangeZona');
  if (cancelChangeZona) cancelChangeZona.onclick = () => $('#modalChangeZona').classList.remove('show');

  // Menú de Ayuda
  const btnHelp = $('#btnHelp');
  if (btnHelp) btnHelp.onclick = () => showView('Ayuda');
  const btnVolverAyuda = $('#btnVolverAyuda');
  if (btnVolverAyuda) btnVolverAyuda.onclick = () => showView('Inicio');

  // Historial Filtros y Acciones
  $$('.hist-filtro-btn').forEach(btn => {
    btn.onclick = () => setHistFilter(btn.dataset.filter);
  });
  const histSearch = $('#histSearch');
  if (histSearch) histSearch.oninput = () => renderHistorial();
  
  const habClear = $('#habClear');
  if (habClear) habClear.onclick = () => { State.histSelected.clear(); renderHistorial(); };
  const habExportSel = $('#habExportSelected');
  if (habExportSel) habExportSel.onclick = exportarSeleccionadasPDF;
  const habExportMes = $('#habExportMonth');
  if (habExportMes) habExportMes.onclick = exportarMesCompletoPDF;
  const habExportXls = $('#habExportExcel');
  if (habExportXls) habExportXls.onclick = exportarMesExcel;

  // Modales Cierre
  const mjClose = $('#mjClose');
  if (mjClose) mjClose.onclick = () => $('#modalJornada').classList.remove('show');
  const btnInfoClose = $('#btnInfoClose');
  if (btnInfoClose) btnInfoClose.onclick = () => $('#modalInfo').classList.remove('show');

  // Términos Aceptación
  const btnAcceptTerms = $('#btnAcceptTerms');
  if (btnAcceptTerms) {
    btnAcceptTerms.onclick = () => {
      setAcceptedTermsVersion();
      $('#modalTerms').classList.remove('show');
      continuarInicio();
    };
  }
});/* ============================================================
   INSTALACIÓN PWA Y NOTIFICACIONES
   ============================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#btnInstallHeader');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  const btn = $('#btnInstallHeader');
  if (btn) btn.style.display = 'none';
  console.log('PWA fue instalada.');
});

function isIOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

function openInstallModal() {
  const modal = $('#modalInstallPWA');
  const iosInstructions = $('#iosInstallInstruction');
  const btnConfirm = $('#btnConfirmInstall');
  
  if (isIOS()) {
    if (iosInstructions) iosInstructions.style.display = 'block';
    if (btnConfirm) btnConfirm.style.display = 'none';
  } else {
    if (iosInstructions) iosInstructions.style.display = 'none';
    if (!deferredPrompt) {
      if (btnConfirm) { btnConfirm.textContent = 'App ya instalada'; btnConfirm.disabled = true; }
    } else {
      if (btnConfirm) { btnConfirm.textContent = '📲 Instalar App'; btnConfirm.disabled = false; }
    }
  }
  if (modal) modal.classList.add('show');
}

function sendLocalNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        vibrate: [200, 100, 200]
      });
    } else {
      new Notification(title, { body: body, icon: 'icons/icon-192.png' });
    }
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") sendLocalNotification(title, body);
    });
  }
}

setInterval(async () => {
  if (!State.user) return;
  try {
    const config = await dbGet('config', 'reminderConfig');
    if (config && config.active) {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      
      if (currentTime === config.time) {
        const lastNotified = await dbGet('config', 'lastNotifiedDate');
        const todayDate = hoy();
        if (!lastNotified || lastNotified.value !== todayDate) {
          sendLocalNotification("¡Hora de cerrar BAREMOS!", "Recordá registrar tus tareas y cerrar la jornada de hoy.");
          await dbPut('config', { key: 'lastNotifiedDate', value: todayDate });
        }
      }
    }
  } catch (e) {}
}, 60000);

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
   CONTENIDO MENÚ LEGAL E INFORMACIÓN
   ============================================================ */
const INFO_CONTENT = {
  privacidad: {
    title: "Política de Privacidad",
    html: `<h3>1. Introducción</h3><p>La presente Política de Privacidad describe cómo se gestiona la información dentro de la aplicación BAREMO. Este proyecto es un desarrollo independiente y local.</p><h3>2. No recopilación de datos personales</h3><p>BAREMO no recopila, almacena ni transfiere datos personales a servidores remotos.</p><h3>3. Almacenamiento local</h3><p>Toda la información se mantiene resguardada exclusivamente dentro de tu dispositivo mediante IndexedDB.</p><h3>4. Sin seguimiento</h3><p>No se utilizan cookies comerciales, herramientas invasivas ni rastreadores de actividad.</p>`
  },
  terminos: {
    title: "Términos y Condiciones",
    html: `<h3>1. Aceptación</h3><p>Al utilizar BAREMO, el usuario acepta estos Términos y Condiciones. Su propósito es exclusivamente operativo para contratistas.</p><h3>2. Uso responsable</h3><p>El usuario es responsable de verificar la correspondencia entre los códigos de baremos y sus tarifas vigentes.</p><h3>3. Responsabilidad</h3><p>La aplicación funciona "tal cual", eximiendo al desarrollador por cualquier discrepancia contractual con empresas distribuidoras.</p>`
  },
  legal: {
    title: "Aviso Legal",
    html: `<p>BAREMO es una herramienta técnica independiente y no posee vinculación jurídica directa con ninguna distribuidora eléctrica oficial.</p>`
  },
  contacto: {
    title: "Contacto",
    html: `<p>Para consultas técnicas, sugerencias o reporte de fallos:</p><p>📧 Email: <a href="mailto:contacto@baremo.app">contacto@baremo.app</a><br>🌐 Desarrollador: AKAPANCH0<br>📍 Buenos Aires, Argentina</p>`
  },
  nosotros: {
    title: "Sobre Nosotros",
    html: `<p>Diseñado para facilitar la administración del trabajo en calle de cuadrillas técnicas y contratistas del sector de energía eléctrica.</p>`
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
  if (titulo) titulo.textContent = `Zona: ${mapa.nombre}`;
  if (nombre) nombre.textContent = mapa.nombre;
  if (img) img.style.display = 'none';
  if (placeholder) {
    placeholder.innerHTML = `<div><span class="zmp-ico">⏳</span><span>Cargando mapa...</span></div>`;
    placeholder.style.display = 'grid';
  }
  container.classList.remove('show');
  void container.offsetWidth;
  const nuevaImg = new Image();
  nuevaImg.onload = () => {
    if (img) { img.src = `maps/${mapa.archivo}`; img.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    container.classList.add('show');
  };
  nuevaImg.onerror = () => {
    if (placeholder) {
      placeholder.innerHTML = `<div><span class="zmp-ico">⚠️</span><span>Mapa no disponible</span></div>`;
      placeholder.style.display = 'grid';
    }
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
const FRASES = [
  "Hoy es un nuevo día productivo", "Tu esfuerzo es tu mayor recompensa", "Cada tarea completada es un paso hacia el éxito",
  "La disciplina vence al talento", "Hacé que cada minuto cuente", "El éxito es la suma de pequeños esfuerzos",
  "Tu dedicación inspira a los demás", "Cada baremo es una victoria", "La constancia es la clave del progreso",
  "Hoy vas a superar tus propios récords", "El trabajo bien hecho no pasa desapercibido", "La excelencia es un hábito",
  "Tu compromiso marca la diferencia", "Los grandes logros empiezan con un primer paso", "Cada jornada es una oportunidad de triunfar"
];

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

function mostrarMensaje100k() { State.mensaje100kMostrado = true; mostrarMensajeDiario(MENSAJES_100K, 'linear-gradient(135deg, #f59e0b, #d97706)'); }
function mostrarMensaje125k() { State.mensaje125kMostrado = true; mostrarMensajeDiario(MENSAJES_125K, 'linear-gradient(135deg, #22c55e, #16a34a)'); }
function mostrarMensaje150k() { State.mensaje150kMostrado = true; mostrarMensajeDiario(MENSAJES_150K, 'linear-gradient(135deg, #10b981, #047857)'); }
function mostrarMensaje200k() { State.mensaje200kMostrado = true; mostrarMensajeDiario(MENSAJES_200K, 'linear-gradient(135deg, #ffd700, #ff6b6b, #4ecdc4)'); lanzarConfeti(); }

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
  setTimeout(() => { if(cont) cont.innerHTML = ''; }, 5000);
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
  if (!f) return '';
  const [y,m,d] = f.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fechaCorta(f) {
  if (!f) return '';
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
  if (!ms) return '';
  const [y,m] = ms.split('-').map(Number);
  return new Date(y,m-1).toLocaleDateString('es-AR',{month:'long',year:'numeric'});
}
function diasDelMes(ms) {
  if (!ms) return 30;
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
    if (!m) { res(true); return; }
    
    const msgEl = $('#modalConfirmMsg');
    if (msgEl) msgEl.textContent = msg;
    m.classList.add('show');

    const btnOk = $('#confirmOk');
    if (btnOk) {
      btnOk.onclick = () => {
        m.classList.remove('show');
        res(true);
      };
    }
    
    const btnCancel = $('#confirmCancel');
    if (btnCancel) {
      btnCancel.onclick = () => {
        m.classList.remove('show');
        res(false);
      };
    }
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
    if (swRegistration.waiting) checkForUpdate(true);
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            checkForUpdate(true);
          }
        });
      }
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
  
  const btnNow = document.getElementById('updateNowBtn');
  if (btnNow) {
    btnNow.onclick = async () => {
      notification.remove();
      btnNow.innerText = "Actualizando..."; btnNow.disabled = true;
      try {
        if (swRegistration && swRegistration.waiting) {
          swRegistration.waiting.postMessage('SKIP_WAITING');
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let reg of regs) await reg.unregister();
        const keys = await caches.keys();
        for (let key of keys) await caches.delete(key);
      } catch(e) {}
      window.location.href = window.location.pathname + '?updated=true&t=' + Date.now();
    };
  }
  
  const btnLater = document.getElementById('updateLaterBtn');
  if (btnLater) {
    btnLater.onclick = () => {
      notification.remove();
      State.updateAvailable = false;
    };
  }
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
   TÉRMINOS Y PRIVACIDAD
   ============================================================ */
function getAcceptedTermsVersion() {
  try { return parseInt(localStorage.getItem('baremos_terms_version')) || 0; }
  catch(e) { return 0; }
}

function setAcceptedTermsVersion() {
  try { localStorage.setItem('baremos_terms_version', CURRENT_TERMS_VERSION.toString()); }
  catch(e) { console.warn('Error saving terms:', e); }
}

function mostrarPopupTerminos() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  
  const modal = $('#modalTerms');
  const content = $('#termsModalContent');
  if (!modal) {
    continuarInicio();
    return;
  }
  if (content && INFO_CONTENT && INFO_CONTENT.terminos) {
    content.innerHTML = INFO_CONTENT.terminos.html;
  }
  modal.classList.add('show');
}

/* ============================================================
   MIGRACIÓN Y NORMALIZACIÓN DE DATOS
   ============================================================ */
function getSafeItems(j) {
  let safeItems = [];
  if (j.items && j.items.length > 0) {
    safeItems = j.items;
  } else if (j.tareas && j.tareas.length > 0) {
    j.tareas.forEach(t => { if (t.items) safeItems = safeItems.concat(t.items); });
  }
  return safeItems;
}

function getNormalizedTareas(j) {
  if (j.tareas && j.tareas.length > 0) return j.tareas;
  if (j.items && j.items.length > 0) {
    return [{
      id: j.id || Date.now(),
      fecha: j.fecha,
      hora: '',
      zona: j.zona || '-',
      items: j.items,
      total: j.items.reduce((a, it) => a + (it.subtotal || 0), 0)
    }];
  }
  return [];
}

/* ============================================================
   INICIALIZACIÓN (SPLASH PROTEGIDO CONTRA CUELGUES)
   ============================================================ */
let initFinished = false;

function safeHideSplash() {
  if (initFinished) return;
  initFinished = true;
  const splash = $('.splash');
  if (splash) splash.classList.add('hide');
  
  const acceptedVersion = getAcceptedTermsVersion();
  if (acceptedVersion < CURRENT_TERMS_VERSION) {
    mostrarPopupTerminos();
  } else {
    continuarInicio();
  }
}

// Resguardo total: si algo se traba, a los 2.5s se quita el Splash forzosamente
setTimeout(safeHideSplash, 2500);

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
    toast('Iniciando en modo rescate: ' + e.message, 'warn');
  } finally {
    setTimeout(safeHideSplash, 400);
  }
  
  try {
    await registerSW();
    setTimeout(() => checkForUpdate(true), 3500);
  } catch(e) {}
}

async function continuarInicio() {
  if (State.user) {
    try { await loadOrCreateJornada(); } catch (e) {}
    showApp();
  } else { 
    showLogin(); 
  }
}

async function loadTheme() {
  try {
    const c = await dbGet('config', 'theme');
    State.theme = c?.value || 'light';
    document.documentElement.setAttribute('data-theme', State.theme);
  } catch(e) {}
}

function toggleTheme() {
  State.theme = State.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', State.theme);
  dbPut('config', { key: 'theme', value: State.theme });
  toast(`Modo ${State.theme === 'light' ? 'claro' : 'oscuro'}`, 'success');
}

async function loadBaremo() {
  let d = [];
  try { d = await dbGetAll('baremo'); } catch(e) { console.warn(e); }
  
  const normalizeArray = (arr) => {
    return arr.map(r => ({
      baremo: String(getField(r, 'BAREMO', 'baremo', 'Codigo', 'codigo', 'Código', 'CÓDIGO')).trim(),
      descripcion: String(getField(r, 'DESCRIPCION', 'descripcion', 'Descripción', 'Descripcion', 'DETALLE')).trim(),
      precio: parsePrecio(getField(r, 'PRECIO', 'precio', 'Precio', 'VALOR'))
    })).filter(r => r.baremo !== '' && r.baremo !== 'undefined');
  };

  let needsRepair = false;
  if (d && d.length > 0) {
    needsRepair = d.some(b => b.descripcion === undefined || b.precio === undefined);
  }

  if (!d || d.length === 0 || needsRepair) {
    try {
      const r = await fetch('baremo.json', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        let arr = Array.isArray(j) ? j : (j.baremos || j.data || [j]);
        const norm = normalizeArray(arr);
        
        if (norm.length > 0) {
          if (needsRepair && d) {
            for (const o of d) if (o.baremo) await dbDelete('baremo', o.baremo);
          }
          for (const i of norm) await dbPut('baremo', i);
          d = await dbGetAll('baremo');
        }
      }
    } catch(e) {}
  }
  State.baremo = normalizeArray(d || []);
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
  } catch(e) { toast('Error al cargar archivo de baremo', 'error'); }
}

async function loadUser() {
  try {
    const c = await dbGet('config', 'activeUser');
    if (c && c.value) State.user = await dbGet('usuarios', c.value);
  } catch(e) {}
}

function showLogin() {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  const vl = $('#viewLogin');
  if(vl) vl.classList.add('active');
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
  State.user = null; State.jornada = null; State.items = []; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  const h = $('#headerUser'); if (h) h.textContent = 'Ingresar';
  const hz = $('#headerUserZona'); if (hz) hz.textContent = '';
  const bz = $('#btnChangeZona'); if (bz) bz.style.display = 'none';
  const sw = $('#modalSwitchUser'); if (sw) sw.classList.remove('show');
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
    State.user = null; State.jornada = null; State.items = []; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
    const sw = $('#modalSwitchUser'); if(sw) sw.classList.remove('show');
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
  if (!lst || !m) return;
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
  ab.onclick = () => { m.classList.remove('show'); showLogin(); };
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
    if (!State.jornada.tareas) {
      if (State.jornada.items && State.jornada.items.length > 0) {
        State.jornada.tareas = [{
          id: Date.now() + Math.random(),
          fecha: State.jornada.fecha,
          hora: '',
          zona: State.jornada.zona || '-',
          items: State.jornada.items,
          total: State.jornada.items.reduce((a, i) => a + (i.subtotal || 0), 0)
        }];
      } else {
        State.jornada.tareas = [];
      }
    }
    State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  } else if (ex.length > 0) {
    if (await confirmDialog('Jornada cerrada hoy. ¿Crear nueva?')) await crearJornadaNueva();
    else { State.jornada = null; State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 }; }
  } else {
    await crearJornadaNueva();
  }
}

async function crearJornadaNueva() {
  State.mensaje200kMostrado = false;
  State.mensaje150kMostrado = false;
  State.mensaje125kMostrado = false;
  State.mensaje100kMostrado = false;
  const j = { fecha: hoy(), horaInicio: ahora(), ultimaMod: ahora(), legajo: State.user.legajo, usuario: State.user.nombre, zona: State.user.zona, tareas: [], items: [], cerrada: false, total: 0 };
  j.id = await dbAdd('jornadas', j);
  State.jornada = j; 
  State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
}

async function saveJornada() {
  if (!State.jornada) return;
  State.jornada.ultimaMod = ahora();
  State.jornada.total = (State.jornada.tareas || []).reduce((a, t) => a + (t.total || 0), 0);
  State.jornada.cantidadRegistros = (State.jornada.tareas || []).length;
  
  let countItems = 0;
  if (State.jornada.tareas) {
    State.jornada.tareas.forEach(t => {
      if (t.items) countItems += t.items.reduce((sa, i) => sa + (i.cantidad || 0), 0);
    });
  }
  State.jornada.cantidadItems = countItems;
  await dbPut('jornadas', State.jornada);
}

async function cerrarJornada() {
  if (!State.jornada) { toast('No hay jornada', 'warn'); return; }
  if (State.currentTarea && State.currentTarea.items && State.currentTarea.items.length > 0) {
    toast('Finaliza o elimina la tarea en curso antes de cerrar la jornada', 'warn');
    return;
  }
  if (!await confirmDialog('¿Cerrar jornada? No podrá editarse.')) return;
  State.jornada.cerrada = true;
  State.jornada.horaCierre = ahora();
  await saveJornada();
  toast('Jornada cerrada', 'success');
  State.jornada = null; 
  State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
  await crearJornadaNueva();
  renderAll();
}

/* ============================================================
   REGISTRO Y GESTIÓN DE TAREAS
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
    
    State.currentTarea.items.push(newItem);
    State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
    
    renderItems();
    renderTotales();
    
    input.value = '';
    qtyInput.value = 1;
    lst.classList.remove('show');
    baremoSeleccionado = null;
    ultimoTexto = '';
    input.focus();
    toast(`Agregado x${c} a la tarea`, 'success');
  }
  
  const btnAgregar = document.getElementById('btnAgregar');
  if (btnAgregar) btnAgregar.addEventListener('click', (e) => { e.preventDefault(); agregar(); });
  
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

  const btnFinalizar = document.getElementById('btnFinalizarTarea');
  if (btnFinalizar) {
    btnFinalizar.onclick = async (e) => {
      e.preventDefault();
      try {
        if (!State.currentTarea || !State.currentTarea.items || State.currentTarea.items.length === 0) {
          toast('La tarea no tiene baremos agregados', 'warn');
          return;
        }
        
        const backupTareas = State.jornada.tareas ? [...State.jornada.tareas] : [];
        const nuevaTareaConfirmada = {
          id: Date.now() + Math.random(),
          fecha: hoy(),
          hora: new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}),
          zona: State.user?.zona || 'Sin zona',
          items: JSON.parse(JSON.stringify(State.currentTarea.items)),
          total: State.currentTarea.total || 0,
          estado: 'finalizada'
        };
        
        if (!State.jornada.tareas) State.jornada.tareas = [];
        State.jornada.tareas.push(nuevaTareaConfirmada);
        
        await saveJornada(); 
        State.currentTarea = { id: null, fecha: '', hora: '', zona: '', items: [], total: 0 };
        renderAll(); 
        toast('Tarea finalizada exitosamente', 'success');
      } catch (error) {
        if (State.jornada && backupTareas) State.jornada.tareas = backupTareas;
        console.error('[Error de Almacenamiento Tarea]', error);
        toast('Error al guardar en base de datos. Por favor, reintenta.', 'error');
      }
    };
  }

  const btnCerrar = $('#btnCerrarJornada');
  if (btnCerrar) btnCerrar.onclick = () => cerrarJornada();
}

function renderItems() {
  const tb = $('#itemsBody');
  const card = $('#currentTaskCard');
  if (!tb || !card) return;
  
  if (!State.currentTarea || State.currentTarea.items.length === 0) {
    card.style.display = 'none';
    tb.innerHTML = '';
  } else {
    card.style.display = 'block';
    tb.innerHTML = State.currentTarea.items.map((it, i) => `<tr class="adding"><td class="hide-mob">${i + 1}</td><td><strong>${it.codigo}</strong></td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td><input type="number" min="1" class="qty-input" value="${it.cantidad}" data-id="${it.id}"></td><td><strong>${fmt(it.subtotal)}</strong></td><td><button class="del-btn" data-id="${it.id}">🗑️</button></td></tr>`).join('');
    
    const ctTotal = $('#currentTaskTotal');
    if (ctTotal) ctTotal.textContent = fmt(State.currentTarea.total);
    
    tb.querySelectorAll('.qty-input').forEach(inp => {
      inp.onchange = e => {
        const it = State.currentTarea.items.find(i => i.id === parseFloat(e.target.dataset.id));
        if (!it) return;
        it.cantidad = parseInt(e.target.value) || 1;
        it.subtotal = it.precio * it.cantidad;
        State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
        renderAll();
      };
    });
    tb.querySelectorAll('.del-btn').forEach(btn => {
      btn.onclick = async e => {
        const id = parseFloat(e.target.dataset.id);
        State.currentTarea.items = State.currentTarea.items.filter(i => i.id !== id);
        State.currentTarea.total = State.currentTarea.items.reduce((a, i) => a + i.subtotal, 0);
        renderAll();
        toast('Baremo eliminado', 'success');
      };
    });
  }

  const tl = $('#tareasFinalizadasList');
  if (!tl) return;
  if (!State.jornada || !State.jornada.tareas || State.jornada.tareas.length === 0) {
    tl.innerHTML = '<div class="empty"><div class="ico">📋</div><p>Sin tareas finalizadas</p></div>';
  } else {
    const tareasReversed = [...State.jornada.tareas].reverse();
    const totalCount = State.jornada.tareas.length;
    
    tl.innerHTML = tareasReversed.map((t, i) => {
      const originalIdx = String(totalCount - i).padStart(3, '0');
      const itemsArray = t.items || [];
      const cantBaremos = itemsArray.length;
      const fDate = t.fecha || State.jornada.fecha;
      const fHora = t.hora ? ` ${t.hora}` : '';
      const fZona = t.zona || State.jornada.zona || '-';
      
      return `
      <div class="tarea-card">
        <div class="tarea-header" style="cursor:pointer;" onclick="this.parentElement.classList.toggle('expanded')">
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--primary); font-weight:800; font-size:13px; text-transform:uppercase;">
                TAREA ${originalIdx}
              </span>
              <span class="expand-ico">▼</span>
            </div>
            <div style="font-size:11px; color:var(--text-soft); margin-top:6px; font-weight:600; display:flex; flex-direction:column; gap:4px;">
              <span>Fecha: ${fechaCorta(fDate)}${fHora}</span>
              <span>Zona: ${fZona}</span>
              <span style="color:var(--text); font-weight:700; margin-top:2px;">Total de la tarea: ${fmt(t.total)}</span>
            </div>
          </div>
        </div>
        <div class="tarea-body">
          <div style="padding: 10px 14px 6px; font-size: 11px; font-weight: 800; color: var(--text-soft); text-transform: uppercase;">Baremos incluidos (${cantBaremos}):</div>
          <div class="table-wrap" style="border:none; border-radius:0; margin:0;">
            <table>
              <thead><tr><th>Cód</th><th>Desc</th><th class="hide-mob" style="text-align:right;">Precio</th><th style="text-align:center;">Cant</th><th style="text-align:right;">Sub</th></tr></thead>
              <tbody>
                ${itemsArray.map(it => `
                  <tr>
                    <td><strong>${it.codigo}</strong></td>
                    <td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td>
                    <td class="hide-mob" style="text-align:right;">${fmt(it.precio)}</td>
                    <td style="text-align:center;">x${it.cantidad}</td>
                    <td style="text-align:right;"><strong>${fmt(it.subtotal)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="tarea-footer">
            <button class="btn btn-ghost btn-sm del-tarea-btn" data-id="${t.id}" style="color:var(--danger); border-color:var(--danger-soft); width:auto;">🗑️ Eliminar Tarea</button>
            <div class="tarea-total">
              TOTAL DE LA TAREA: <span style="color: var(--primary);">${fmt(t.total)}</span>
            </div>
          </div>
        </div>
      </div>
    `}).join('');
    
    const firstCard = tl.querySelector('.tarea-card');
    if (firstCard) firstCard.classList.add('expanded');
    
    tl.querySelectorAll('.del-tarea-btn').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        if (!await confirmDialog('¿Eliminar la tarea completa y todos sus baremos?')) return;
        const id = parseFloat(e.target.dataset.id);
        State.jornada.tareas = State.jornada.tareas.filter(t => t.id !== id);
        await saveJornada();
        renderAll();
        toast('Tarea eliminada', 'success');
      };
    });
  }
}

function renderTotales() {
  if (!State.jornada) return;
  
  const totalTareas = (State.jornada.tareas || []).length;
  let totalItemsFinalizados = 0;
  (State.jornada.tareas || []).forEach(t => {
    if (t.items) totalItemsFinalizados += t.items.reduce((s, i) => s + (i.cantidad || 0), 0);
  });
  const totalItemsActuales = (State.currentTarea && State.currentTarea.items) ? State.currentTarea.items.reduce((a, i) => a + (i.cantidad || 0), 0) : 0;
  const sumFinalizadas = (State.jornada.tareas || []).reduce((a, t) => a + (t.total || 0), 0);
  const t = sumFinalizadas;
  
  const tr = $('#totalRegs'); if (tr) tr.textContent = fmtNum(totalTareas);
  const ti = $('#totalItems'); if (ti) ti.textContent = fmtNum(totalItemsFinalizados + totalItemsActuales);
  const tg = $('#totalGeneral'); if (tg) tg.textContent = fmt(t);
  const tgb = $('#totalGeneralBig'); if (tgb) tgb.textContent = fmt(t);
  
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
  const vn = $(`#view${n}`); if(vn) vn.classList.add('active');
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
  
  if (h) h.textContent = `${State.user.nombre} · ${State.user.legajo}`;
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

function renderAll() { renderItems(); renderTotales(); }

/* ============================================================
   HISTORIAL Y EXPORTACIONES
   ============================================================ */
async function renderHistorial() {
  const all = await dbGetAll('jornadas');
  let f = all.filter(j => j.legajo === State.user.legajo);
  if (State.histFilter === 'hoy') f = f.filter(j => j.fecha === hoy());
  else if (State.histFilter === 'mes') f = f.filter(j => j.fecha.startsWith(mesActual()));
  else if (State.histFilter === 'mesAnterior') f = f.filter(j => j.fecha.startsWith(mesAnterior()));
  
  const searchInput = $('#histSearch');
  if (searchInput && searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase();
    f = f.filter(j => (j.fecha && j.fecha.includes(q)) || (j.usuario && j.usuario.toLowerCase().includes(q)));
  }

  f.sort((a, b) => b.fecha.localeCompare(a.fecha));
  
  const lst = $('#historialList');
  const ab = $('#histActionsBar');
  if (!lst) return;
  
  if (ab) {
    if (State.histSelected.size > 0) {
      ab.classList.add('show');
      const hc = $('#habCount'); if(hc) hc.textContent = `${State.histSelected.size} seleccionada(s)`;
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
    const tareasNorm = getNormalizedTareas(j);
    const cantTareas = tareasNorm.length;
    const cantItems = tareasNorm.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);
    return `<div class="jornada-item ${is ? 'selected' : ''}" data-id="${j.id}"><div class="ji-left"><div class="fecha">${fechaCorta(j.fecha)}</div><div class="meta">${cantTareas} tareas · ${cantItems} ítems</div></div><div class="ji-right"><div class="total">${fmt(j.total || 0)}</div><div class="estado ${j.cerrada ? 'cerrada' : 'abierta'}">${j.cerrada ? 'CERRADA' : 'ABIERTA'}</div><div class="ji-actions"><div class="check-box ${is ? 'checked' : ''}" data-act="select" data-id="${j.id}"></div><button class="mini-btn view" data-act="view" data-id="${j.id}">👁️</button>${j.cerrada ? `<button class="mini-btn export" data-act="export" data-id="${j.id}">📄</button>` : ''}</div></div></div>`;
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
  lst.querySelectorAll('[data-act="view"]').forEach(el => { el.onclick = e => { e.stopPropagation(); openJornada(parseInt(el.dataset.id)); }; });
  lst.querySelectorAll('[data-act="export"]').forEach(el => { el.onclick = async e => { e.stopPropagation(); await exportarJornadaPDF(parseInt(el.dataset.id)); }; });
  lst.querySelectorAll('.jornada-item').forEach(el => { el.onclick = () => openJornada(parseInt(el.dataset.id)); });
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
  const tareas = getNormalizedTareas(j);
  const totalItems = tareas.reduce((a, t) => a + (t.items ? t.items.reduce((s, i) => s + (i.cantidad || 0), 0) : 0), 0);
  
  const fFecha = $('#mjFecha'); if(fFecha) fFecha.textContent = fechaLegible(j.fecha);
  const fTotal = $('#mjTotal'); if(fTotal) fTotal.textContent = fmt(j.total);
  const fMeta = $('#mjMeta'); if(fMeta) fMeta.textContent = `${tareas.length} tareas · ${totalItems} ítems · ${j.cerrada ? 'CERRADA' : 'ABIERTA'}`;
  
  const bd = $('#mjBody');
  if(bd) {
    let html = '';
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx+1).padStart(3,'0')}`;
      html += `<tr style="background:var(--surface-2)"><td colspan="6" style="font-weight:800; color:var(--primary); font-size:11px;">${labelTarea}</td></tr>`;
      (t.items || []).forEach((it, i) => {
        html += `<tr><td class="hide-mob">${i + 1}</td><td><strong>${it.codigo}</strong></td><td class="td-desc" style="font-size:11px" title="${it.descripcion}">${it.descripcion}</td><td class="hide-mob">${fmt(it.precio)}</td><td>${it.cantidad}</td><td>${fmt(it.subtotal)}</td></tr>`;
      });
      html += `<tr><td colspan="6" style="text-align:right; font-weight:800; font-size:12px; border-bottom: 2px solid var(--border);">Total de la Tarea: ${fmt(t.total)}</td></tr>`;
    });
    bd.innerHTML = html;
  }
  const modal = $('#modalJornada'); if(modal) modal.classList.add('show');
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
  
  const tareas = getNormalizedTareas(j);
  const body = [];
  tareas.forEach((t, idx) => {
    const isLegacy = t.referencia === 'Registros Anteriores';
    const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
    body.push([{ content: labelTarea, colSpan: 6, styles: { fillColor: [240, 243, 249], fontStyle: 'bold', textColor: [11, 61, 145] } }]);
    (t.items || []).forEach((it, i) => {
      body.push([i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
    });
    body.push([{ content: `TOTAL DE LA TAREA: ${fmt(t.total)}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]);
  });
  
  doc.autoTable({
    startY: 45,
    head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
    body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 61, 145] },
    margin: { left: 14, right: 14 }
  });
  
  const y = doc.lastAutoTable.finalY + 10;
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
    doc.text(`▶ Jornada: ${fechaLegible(j.fecha)}   |   Total Día: ${fmt(j.total || 0)}`, 16, currentY + 6);
    currentY += 10;
    
    totalAcu += (j.total || 0);

    const tareas = getNormalizedTareas(j);
    const body = [];
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const labelTarea = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
      body.push([{ content: labelTarea, colSpan: 6, styles: { fillColor: [240, 243, 249], fontStyle: 'bold', textColor: [11, 61, 145] } }]);
      (t.items || []).forEach((it, i) => {
        body.push([i + 1, it.codigo, it.descripcion, it.cantidad, fmt(it.precio), fmt(it.subtotal)]);
      });
      body.push([{ content: `Total Tarea: ${fmt(t.total)}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } }]);
    });
    
    doc.autoTable({
      startY: currentY,
      head: [['#', 'Código', 'Descripción', 'Cant', 'Precio', 'Subtotal']],
      body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 201] },
      margin: { left: 14, right: 14 }
    });
    
    currentY = doc.lastAutoTable.finalY + 10;
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
    const detalle = [];
    const tareas = getNormalizedTareas(x);
    tareas.forEach((t, idx) => {
      const isLegacy = t.referencia === 'Registros Anteriores';
      const fRef = isLegacy ? 'REGISTROS ANTERIORES' : `TAREA ${String(idx + 1).padStart(3, '0')}`;
      detalle.push({ '#': fRef, Código: '', Subtotal: t.total });
      (t.items || []).forEach((it, i) => {
        detalle.push({
          '#': i + 1, Código: it.codigo, Descripción: it.descripcion,
          Precio: it.precio, Cantidad: it.cantidad, Subtotal: it.subtotal
        });
      });
      detalle.push({});
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalle), `Dia_${x.fecha}`.substring(0, 31));
  });
  XLSX.writeFile(wb, `baremos_${nombreMes(mes).replace(' ', '_')}.xlsx`);
  toast('Excel generado', 'success');
}

/* ============================================================
   DASHBOARD & GRÁFICOS
   ============================================================ */
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
  
  const bc = {}, bf = {};
  let totalItemsMes = 0;
  jMes.forEach(j => {
    const arr = getSafeItems(j);
    totalItemsMes += arr.length;
    arr.forEach(it => {
      bc[it.codigo] = (bc[it.codigo] || 0) + it.cantidad;
      bf[it.codigo] = (bf[it.codigo] || 0) + it.subtotal;
    });
  });
  
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
  
  const statDiaAnt = $('#statDiaAnterior'); if(statDiaAnt) statDiaAnt.textContent = fmt(prodAyer);
  const lblFecAyer = $('#lblFechaAyer'); if(lblFecAyer) lblFecAyer.textContent = fecAyer;

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

    const tcAm = $('#tacAmount'); if(tcAm) tcAm.textContent = fmt(tot);
    const tcPb = $('#tacProgressBar'); if(tcPb) tcPb.style.width = progreso + '%';
    const tcPt = $('#tacProgressText'); if(tcPt) tcPt.textContent = `Progreso: ${progreso.toFixed(1)}%`;
    const tcFt = $('#tacFaltanText'); if(tcFt) tcFt.textContent = `Faltan: ${fmt(faltan)}`;

    const overlay = $('#tacOverlayMsg');
    const cfgMes = getConfigMes(tot);
    tacCard.className = 'total-acumulado-card ' + cfgMes.cls;
    if(overlay) overlay.classList.remove('show');

    if (tot > 2000000 && tot <= 2500000) {
      if(overlay){ overlay.textContent = '👏 ¡Sigue así!'; overlay.classList.add('show'); }
    } else if (tot > 2500000 && tot < 3000000) {
      if(overlay){ overlay.textContent = '🚀 Excelente rendimiento'; overlay.classList.add('show'); }
    } else if (tot >= 3000000) {
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
  s('statTrabajos', fmtNum(totalItemsMes)); 
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

function renderCharts(todas) {
  if (!window.Chart) return;
  
  const ctxD = $('#chartDiario')?.getContext('2d');
  const ctxM = $('#chartMensual')?.getContext('2d');
  const ctxP = $('#chartPie')?.getContext('2d');

  if (State.chartInstances.diario) State.chartInstances.diario.destroy();
  if (State.chartInstances.mensual) State.chartInstances.mensual.destroy();
  if (State.chartInstances.pie) State.chartInstances.pie.destroy();

  // Gráfico Diario (Últimos 7 días)
  if (ctxD) {
    const ult7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      ult7.push(d.toISOString().slice(0, 10));
    }
    const dataD = ult7.map(f => {
      const match = todas.filter(j => j.fecha === f);
      return match.reduce((a, j) => a + (j.total || 0), 0);
    });
    
    const t7El = $('#total7Dias');
    if (t7El) t7El.textContent = `Total: ${fmt(dataD.reduce((a, b) => a + b, 0))}`;

    State.chartInstances.diario = new Chart(ctxD, {
      type: 'bar',
      data: {
        labels: ult7.map(f => fechaCorta(f)),
        datasets: [{
          label: 'Producción',
          data: dataD,
          backgroundColor: '#0b3d91',
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  // Gráfico Mensual
  if (ctxM) {
    const meses = {};
    todas.forEach(j => {
      const m = j.fecha.slice(0, 7);
      meses[m] = (meses[m] || 0) + (j.total || 0);
    });
    const mKeys = Object.keys(meses).sort().slice(-6);
    State.chartInstances.mensual = new Chart(ctxM, {
      type: 'line',
      data: {
        labels: mKeys.map(m => nombreMes(m)),
        datasets: [{
          label: 'Producción Mes',
          data: mKeys.map(m => meses[m]),
          borderColor: '#22a06b',
          backgroundColor: 'rgba(34, 160, 107, 0.15)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Gráfico Top 5 Baremos
  if (ctxP) {
    const counts = {};
    todas.forEach(j => {
      getSafeItems(j).forEach(i => { counts[i.codigo] = (counts[i.codigo] || 0) + (i.cantidad || 1); });
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    State.chartInstances.pie = new Chart(ctxP, {
      type: 'doughnut',
      data: {
        labels: top.map(t => t[0]),
        datasets: [{
          data: top.map(t => t[1]),
          backgroundColor: ['#0b3d91', '#2563c9', '#22a06b', '#e0a800', '#d93025']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

/* ============================================================
   COMBUSTIBLE
   ============================================================ */
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

/* ============================================================
   QUINCENAS
   ============================================================ */
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
  } else {
    bQ2.classList.remove('bloqueada');
    if (q1 && q1.bloqueada) {
      bQ2.classList.remove('deshabilitada');
      $('#badgeQ2').className = 'qb-badge pendiente';
      $('#badgeQ2').textContent = 'PENDIENTE';
      aQ2.innerHTML = `<span>⚠️</span><span>Una vez registrada quedará <strong>bloqueada permanentemente</strong>.</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = false;
      $('#q2o2').disabled = false;
    } else {
      bQ2.classList.add('deshabilitada');
      $('#badgeQ2').className = 'qb-badge deshabilitada';
      $('#badgeQ2').textContent = 'BLOQUEADA';
      aQ2.innerHTML = `<span>⏳</span><span>Se habilita al registrar la 1ra quincena.</span>`;
      fQ2f.style.display = 'block';
      tQ2.style.display = 'none';
      $('#q2o1').disabled = true;
      $('#q2o2').disabled = true;
    }
  }

  const lst = $('#quiList');
  if (lst) {
    const todasQ = (await dbGetAll('quincenas')).filter(q => q.legajo === leg).sort((a, b) => b.mes.localeCompare(a.mes));
    if (!todasQ.length) {
      lst.innerHTML = '<div class="empty"><div class="ico">💰</div><p>Sin quincenas registradas</p></div>';
    } else {
      lst.innerHTML = todasQ.map(q => `
        <div class="registro-item">
          <div class="ri-left">
            <div class="pat">${q.tipo === 1 ? '1ra' : '2da'} Quincena · ${nombreMes(q.mes)}</div>
            <div class="fecha">Oficial 1: ${fmt(q.oficial1)} | Oficial 2: ${fmt(q.oficial2)}</div>
          </div>
          <div class="ri-right">
            <div class="monto">${fmt(q.total)}</div>
          </div>
        </div>
      `).join('');
    }
  }
}

function setupQuincenas() {
  const f1 = $('#formQ1');
  const f2 = $('#formQ2');
  
  if (f1) {
    f1.onsubmit = async (e) => {
      e.preventDefault();
      const o1 = parseFloat($('#q1o1').value) || 0;
      const o2 = parseFloat($('#q1o2').value) || 0;
      if (!await confirmDialog('¿Confirmar registro de la 1ra Quincena? No podrá editarse.')) return;
      
      const mes = mesActual();
      await dbAdd('quincenas', {
        tipo: 1,
        mes,
        legajo: State.user.legajo,
        oficial1: o1,
        oficial2: o2,
        total: o1 + o2,
        bloqueada: true,
        fechaRegistro: hoy()
      });
      toast('1ra Quincena registrada', 'success');
      renderQuincenas();
      renderDashboard();
    };
  }

  if (f2) {
    f2.onsubmit = async (e) => {
      e.preventDefault();
      const o1 = parseFloat($('#q2o1').value) || 0;
      const o2 = parseFloat($('#q2o2').value) || 0;
      if (!await confirmDialog('¿Confirmar registro de la 2da Quincena? No podrá editarse.')) return;
      
      const mes = mesQuincenaActual();
      await dbAdd('quincenas', {
        tipo: 2,
        mes,
        legajo: State.user.legajo,
        oficial1: o1,
        oficial2: o2,
        total: o1 + o2,
        bloqueada: true,
        fechaRegistro: hoy()
      });
      toast('2da Quincena registrada', 'success');
      renderQuincenas();
      renderDashboard();
    };
  }
}

/* ============================================================
   AJUSTES
   ============================================================ */
function renderAjustes() {
  const c = $('#ajustesList');
  if (!c) return;
  c.innerHTML = `
    <div class="ajuste-item" id="ajItemUsers"><div class="aj-ico">👥</div><div class="aj-text"><div class="aj-title">Gestionar Usuarios</div><div class="aj-desc">Cambiar o eliminar usuarios</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemBaremo"><div class="aj-ico">📋</div><div class="aj-text"><div class="aj-title">Actualizar Baremo</div><div class="aj-desc">Subir archivo Excel o JSON</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemExport"><div class="aj-ico">📤</div><div class="aj-text"><div class="aj-title">Copia de Seguridad</div><div class="aj-desc">Exportar base de datos local</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemImport"><div class="aj-ico">📥</div><div class="aj-text"><div class="aj-title">Restaurar Datos</div><div class="aj-desc">Importar archivo de seguridad</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item" id="ajItemUpdate"><div class="aj-ico">🔄</div><div class="aj-text"><div class="aj-title">Buscar Actualizaciones</div><div class="aj-desc">Versión ${APP_VERSION}</div></div><div class="aj-arrow">›</div></div>
    <div class="ajuste-item admin" id="ajItemAdmin"><div class="aj-ico">🔐</div><div class="aj-text"><div class="aj-title">Panel de Administración</div><div class="aj-desc">Reportes consolidados y métricas</div></div><div class="aj-arrow">›</div></div>
    <div class="credits">
      <div class="credits-emoji">⚡</div>
      <div class="credits-label">Desarrollado para Contratistas</div>
      <div class="credits-author">AKAPANCH0</div>
      <div class="credits-divider"></div>
      <div class="app-version">v${APP_VERSION}</div>
    </div>
  `;

  $('#ajItemUsers').onclick = () => switchUser();
  $('#ajItemBaremo').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,.xlsx,.xls';
    inp.onchange = e => { if (e.target.files[0]) updateBaremoFromFile(e.target.files[0]); };
    inp.click();
  };
  $('#ajItemExport').onclick = async () => {
    const d = await exportAllDB();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `baremos_backup_${hoy()}.json`;
    a.click();
    toast('Copia de seguridad descargada', 'success');
  };
  $('#ajItemImport').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async e => {
      if (e.target.files[0]) {
        try {
          const content = JSON.parse(await e.target.files[0].text());
          await importAllDB(content);
          toast('Datos restaurados con éxito', 'success');
          location.reload();
        } catch(err) { toast('Archivo inválido', 'error'); }
      }
    };
    inp.click();
  };
  $('#ajItemUpdate').onclick = () => checkForUpdate(false);
  $('#ajItemAdmin').onclick = () => showView('Admin');
}

/* ============================================================
   ADMINISTRACIÓN Y REPORTES
   ============================================================ */
function setupAdmin() {
  const btnLogin = $('#btnAdminLogin');
  if (btnLogin) {
    btnLogin.onclick = async () => {
      const pass = $('#adminPassword')?.value || '';
      const hash = await sha256(pass);
      const target = await getAdminPasswordHash();
      if (hash === target) {
        State.adminLoggedIn = true;
        $('#adminLogin').style.display = 'none';
        $('#adminPanel').style.display = 'block';
        toast('Acceso Admin concedido', 'success');
        renderAdmin();
      } else {
        toast('Contraseña incorrecta', 'error');
      }
    };
  }

  const btnLogout = $('#btnAdminLogout');
  if (btnLogout) {
    btnLogout.onclick = () => {
      State.adminLoggedIn = false;
      $('#adminLogin').style.display = 'block';
      $('#adminPanel').style.display = 'none';
      if ($('#adminPassword')) $('#adminPassword').value = '';
      showView('Ajustes');
    };
  }

  const typeBtns = $$('#adminReportType button');
  typeBtns.forEach(btn => {
    btn.onclick = () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.adminReportType = btn.dataset.type;
      updateAdminReport();
    };
  });

  const uSelect = $('#adminUsuario');
  const dDate = $('#adminFecha');
  if (uSelect) uSelect.onchange = () => updateAdminReport();
  if (dDate) {
    dDate.value = hoy();
    dDate.onchange = () => updateAdminReport();
  }

  const btnPreview = $('#btnAdminPreview');
  if (btnPreview) btnPreview.onclick = () => updateAdminReport(true);

  const btnPDF = $('#btnAdminPDF');
  if (btnPDF) btnPDF.onclick = () => exportAdminPDF();

  const btnExcel = $('#btnAdminExcel');
  if (btnExcel) btnExcel.onclick = () => exportAdminExcel();
}

async function renderAdmin() {
  if (!State.adminLoggedIn) {
    $('#adminLogin').style.display = 'block';
    $('#adminPanel').style.display = 'none';
    return;
  }
  
  const users = await dbGetAll('usuarios');
  const s = $('#adminUsuario');
  if (s) {
    s.innerHTML = '<option value="todos">👥 Todos los usuarios</option>' + users.map(u => `<option value="${u.legajo}">${u.nombre} (${u.legajo})</option>`).join('');
  }
  updateAdminReport();
}

async function getAdminFilteredJornadas() {
  const u = $('#adminUsuario')?.value || 'todos';
  const f = $('#adminFecha')?.value || hoy();
  const all = await dbGetAll('jornadas');
  
  return all.filter(j => {
    if (u !== 'todos' && j.legajo !== u) return false;
    if (State.adminReportType === 'diario') return j.fecha === f;
    if (State.adminReportType === 'mensual') return j.fecha.startsWith(f.slice(0, 7));
    if (State.adminReportType === 'semanal') {
      const sem = obtenerSemanaDeFecha(f);
      return j.fecha >= sem.lunes && j.fecha <= sem.domingo;
    }
    return true;
  });
}

async function updateAdminReport(showToast = false) {
  const jornadas = await getAdminFilteredJornadas();
  const sumDiv = $('#adminSummary');
  const sumCont = $('#adminSummaryContent');
  if (!sumDiv || !sumCont) return;

  const total = jornadas.reduce((a, j) => a + (j.total || 0), 0);
  let itemsCount = 0;
  jornadas.forEach(j => { itemsCount += getSafeItems(j).length; });

  sumCont.innerHTML = `
    <div class="as-line"><span>Jornadas:</span><strong>${jornadas.length}</strong></div>
    <div class="as-line"><span>Total ítems:</span><strong>${itemsCount}</strong></div>
    <div class="as-line total"><span>Total Recaudado:</span><strong style="color:var(--primary)">${fmt(total)}</strong></div>
  `;
  sumDiv.style.display = 'block';
  if (showToast) toast('Resumen actualizado', 'info');
}

async function exportAdminPDF() {
  const j = await getAdminFilteredJornadas();
  if (!j.length) { toast('Sin datos para exportar', 'warn'); return; }
  await exportarMultiplesPDF(j.map(x => x.id), `Admin_${State.adminReportType}`);
}

async function exportAdminExcel() {
  if (!window.XLSX) return;
  const j = await getAdminFilteredJornadas();
  if (!j.length) { toast('Sin datos', 'warn'); return; }
  const wb = XLSX.utils.book_new();
  const res = j.map(x => ({ Fecha: fechaCorta(x.fecha), Usuario: x.usuario, Legajo: x.legajo, Total: x.total || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(res), 'Reporte_Admin');
  XLSX.writeFile(wb, `Reporte_Admin_${hoy()}.xlsx`);
  toast('Excel Admin generado', 'success');
}

/* ============================================================
   EVENT LISTENERS GLOBALES
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  init();
  setupRegistro();
  setupCombustible();
  setupQuincenas();
  setupMapaZona();
  setupAdmin();

  // Navegación de Solapas
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Botón Cambiar Tema
  const btnTheme = $('#btnTheme');
  if (btnTheme) btnTheme.onclick = toggleTheme;

  // Botón Switch Usuario Header
  const btnSwitchUser = $('#btnSwitchUser');
  if (btnSwitchUser) btnSwitchUser.onclick = () => { if (State.user) switchUser(); else showLogin(); };

  // Botón Cambiar Zona Header
  const btnChangeZona = $('#btnChangeZona');
  if (btnChangeZona) {
    btnChangeZona.onclick = () => {
      const m = $('#modalChangeZona');
      const s = $('#newZonaSelect');
      if (m && s && State.user) {
        s.value = State.user.zona || '';
        m.classList.add('show');
      }
    };
  }

  // Modal Cambiar Zona Handlers
  const formChangeZona = $('#formChangeZona');
  if (formChangeZona) {
    formChangeZona.onsubmit = async (e) => {
      e.preventDefault();
      const z = $('#newZonaSelect').value;
      if (z && State.user) {
        State.user.zona = z;
        await dbPut('usuarios', State.user);
        if (State.jornada) { State.jornada.zona = z; await saveJornada(); }
        $('#modalChangeZona').classList.remove('show');
        showApp();
        toast(`Zona cambiada a: ${z}`, 'success');
      }
    };
  }
  const cancelChangeZona = $('#cancelChangeZona');
  if (cancelChangeZona) cancelChangeZona.onclick = () => $('#modalChangeZona').classList.remove('show');

  // Menú de Ayuda
  const btnHelp = $('#btnHelp');
  if (btnHelp) btnHelp.onclick = () => showView('Ayuda');
  const btnVolverAyuda = $('#btnVolverAyuda');
  if (btnVolverAyuda) btnVolverAyuda.onclick = () => showView('Inicio');

  // Historial Filtros y Acciones
  $$('.hist-filtro-btn').forEach(btn => {
    btn.onclick = () => setHistFilter(btn.dataset.filter);
  });
  const histSearch = $('#histSearch');
  if (histSearch) histSearch.oninput = () => renderHistorial();
  
  const habClear = $('#habClear');
  if (habClear) habClear.onclick = () => { State.histSelected.clear(); renderHistorial(); };
  const habExportSel = $('#habExportSelected');
  if (habExportSel) habExportSel.onclick = exportarSeleccionadasPDF;
  const habExportMes = $('#habExportMonth');
  if (habExportMes) habExportMes.onclick = exportarMesCompletoPDF;
  const habExportXls = $('#habExportExcel');
  if (habExportXls) habExportXls.onclick = exportarMesExcel;

  // Modales Cierre
  const mjClose = $('#mjClose');
  if (mjClose) mjClose.onclick = () => $('#modalJornada').classList.remove('show');
  const btnInfoClose = $('#btnInfoClose');
  if (btnInfoClose) btnInfoClose.onclick = () => $('#modalInfo').classList.remove('show');

  // Términos Aceptación
  const btnAcceptTerms = $('#btnAcceptTerms');
  if (btnAcceptTerms) {
    btnAcceptTerms.onclick = () => {
      setAcceptedTermsVersion();
      $('#modalTerms').classList.remove('show');
      continuarInicio();
    };
  }
});
