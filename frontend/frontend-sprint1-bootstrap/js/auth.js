/**
 * auth.js — Módulo central de Autenticación, Sesión, API y LocalStorage
 * Proyecto: Sistema de Reservas - Sprint 1
 */

const API_BASE_URL = 'http://localhost:5000/api';

const STORAGE_KEYS = {
  TOKEN: 'sr_auth_token',
  USER: 'sr_current_user',
  USERS_DB: 'sr_users_database',
  SERVICES_DB: 'sr_services_database',
  RESERVATIONS_DB: 'sr_reservations_database',
  LOCKOUT_PREFIX: 'sr_lockout_',
  LAST_REGISTERED_EMAIL: 'sr_last_registered_email'
};

// Configuración de bloqueo
const LOCKOUT_CONFIG = {
  MAX_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 60 * 1000 // 60 segundos
};

/**
 * Inicializa la base de datos de prueba en localStorage si está vacía
 */
function initLocalStorageDB() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS_DB)) {
    const defaultUsers = [
      {
        id: 'usr-1',
        nombre: 'Administrador Demo',
        correo: 'admin@sistema.com',
        password: 'AdminPassword123!',
        rol: 'admin',
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr-2',
        nombre: 'Carlos Mendoza',
        correo: 'carlos@ejemplo.com',
        password: 'UserPassword123!',
        rol: 'usuario',
        createdAt: '2026-09-05T10:30:00.000Z'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SERVICES_DB)) {
    const defaultServices = [
      { id: 'srv-1', nombre: 'Cancha de Fútbol 5 Sintética', categoria: 'Deportes' },
      { id: 'srv-2', nombre: 'Auditorio Principal (120 personas)', categoria: 'Eventos' },
      { id: 'srv-3', nombre: 'Sala de Juntas Ejecutiva VIP', categoria: 'Empresarial' },
      { id: 'srv-4', nombre: 'Piscina Olímpica Climatizada', categoria: 'Acuáticos' },
      { id: 'srv-5', nombre: 'Gimnasio y Zona Fitness', categoria: 'Salud' },
      { id: 'srv-6', nombre: 'Salón de Eventos Sociales', categoria: 'Social' },
      { id: 'srv-7', nombre: 'Laboratorio de Cómputo Multimedia', categoria: 'Tecnología' },
      { id: 'srv-8', nombre: 'Terraza BBQ Panorámica', categoria: 'Recreación' }
    ];
    localStorage.setItem(STORAGE_KEYS.SERVICES_DB, JSON.stringify(defaultServices));
  }

  if (!localStorage.getItem(STORAGE_KEYS.RESERVATIONS_DB)) {
    const defaultReservations = [
      { id: 'res-1', usuario: 'carlos@ejemplo.com', servicio: 'Cancha de Fútbol 5', fecha: '2026-09-24 18:00', estado: 'Confirmada' },
      { id: 'res-2', usuario: 'admin@sistema.com', servicio: 'Sala de Juntas VIP', fecha: '2026-09-25 09:00', estado: 'Confirmada' },
      { id: 'res-3', usuario: 'carlos@ejemplo.com', servicio: 'Piscina Olímpica', fecha: '2026-09-26 15:00', estado: 'Pendiente' }
    ];
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS_DB, JSON.stringify(defaultReservations));
  }
}

// Ejecutar inicialización inmediata
initLocalStorageDB();

/**
 * Obtiene los usuarios almacenados en localStorage
 */
function getStoredUsers() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error al leer usuarios de localStorage', e);
    return [];
  }
}

/**
 * Guarda o actualiza un usuario en localStorage
 */
function saveUserToLocalStorage(user) {
  const users = getStoredUsers();
  const existingIndex = users.findIndex(u => u.correo.toLowerCase() === user.correo.toLowerCase());
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
}

/**
 * Busca un usuario por correo en localStorage
 */
function findUserByEmail(email) {
  if (!email) return null;
  const users = getStoredUsers();
  return users.find(u => u.correo.toLowerCase() === email.trim().toLowerCase()) || null;
}

/**
 * Gestión de intentos fallidos y bloqueo temporal
 */
function getLockoutState(email) {
  if (!email) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  const key = STORAGE_KEYS.LOCKOUT_PREFIX + email.trim().toLowerCase();
  try {
    const data = localStorage.getItem(key);
    if (!data) return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    const parsed = JSON.parse(data);
    const now = Date.now();
    if (parsed.lockedUntil && parsed.lockedUntil > now) {
      const remainingSeconds = Math.ceil((parsed.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, attempts: parsed.attempts };
    }
    // Si ya expiró el bloqueo, resetear
    if (parsed.lockedUntil && parsed.lockedUntil <= now) {
      localStorage.removeItem(key);
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
    return { isLocked: false, remainingSeconds: 0, attempts: parsed.attempts || 0 };
  } catch (e) {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
}

function recordFailedAttempt(email) {
  if (!email) return { isLocked: false, remainingSeconds: 0, attempts: 1 };
  const key = STORAGE_KEYS.LOCKOUT_PREFIX + email.trim().toLowerCase();
  const current = getLockoutState(email);
  const newAttempts = current.attempts + 1;
  const now = Date.now();
  let lockedUntil = null;
  let isLocked = false;
  let remainingSeconds = 0;

  if (newAttempts >= LOCKOUT_CONFIG.MAX_ATTEMPTS) {
    lockedUntil = now + LOCKOUT_CONFIG.LOCKOUT_DURATION_MS;
    isLocked = true;
    remainingSeconds = Math.ceil(LOCKOUT_CONFIG.LOCKOUT_DURATION_MS / 1000);
  }

  localStorage.setItem(key, JSON.stringify({
    attempts: newAttempts,
    lockedUntil: lockedUntil
  }));

  return { isLocked, remainingSeconds, attempts: newAttempts };
}

function resetFailedAttempts(email) {
  if (!email) return;
  const key = STORAGE_KEYS.LOCKOUT_PREFIX + email.trim().toLowerCase();
  localStorage.removeItem(key);
}

/**
 * Genera un token JWT simulado seguro para modo offline / pruebas
 */
function generateMockJWT(user) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    nombre: user.nombre,
    correo: user.correo,
    rol: user.rol || 'usuario',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (8 * 3600) // 8 horas
  }));
  const signature = btoa('mock-secret-signature-' + user.id);
  return `${header}.${payload}.${signature}`;
}

/**
 * Guarda la sesión del usuario activo
 */
function setSession(token, user) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Obtiene el token activo
 */
function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Obtiene el usuario en sesión
 */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Verifica si hay una sesión válida activa
 */
function isAuthenticated() {
  const token = getToken();
  const user = getCurrentUser();
  return Boolean(token && user && user.correo);
}

/**
 * Cierra la sesión
 */
function logout() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  window.location.href = 'index.html';
}

/**
 * Guard de autenticación para páginas protegidas (dashboard)
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/**
 * Guard para páginas públicas (login, registro)
 */
function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    window.location.href = 'dashboard.html';
  }
}

/**
 * Operación de Inicio de Sesión (API con fallback a LocalStorage)
 */
async function authLogin(email, password) {
  const trimmedEmail = email.trim().toLowerCase();

  // 1. Validar bloqueo previo
  const lockout = getLockoutState(trimmedEmail);
  if (lockout.isLocked) {
    throw new Error(`Cuenta bloqueada temporalmente. Intente nuevamente en ${lockout.remainingSeconds} segundos.`);
  }

  let apiSuccess = false;
  let apiResponse = null;

  // 2. Intentar llamar al backend Node/Express
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: trimmedEmail,
        correo: trimmedEmail,
        password: password
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      apiResponse = data;
      apiSuccess = true;
    } else if (res.status === 401 || res.status === 400) {
      // Credenciales inválidas devueltas explícitamente por el servidor
      const errData = await res.json().catch(() => ({}));
      const lock = recordFailedAttempt(trimmedEmail);
      if (lock.isLocked) {
        throw new Error(`Demasiados intentos fallidos. Tu cuenta ha sido bloqueada por ${lock.remainingSeconds} segundos.`);
      }
      throw new Error(errData.message || 'Correo o contraseña incorrectos.');
    }
  } catch (err) {
    // Si es un error de bloqueo o credenciales devuelto por la API, relanzarlo
    if (err.message && (err.message.includes('bloqueada') || err.message.includes('incorrectos'))) {
      throw err;
    }
    console.warn('Backend API no disponible. Utilizando modo local (localStorage)...', err.message);
  }

  // 3. Si la API respondió con éxito
  if (apiSuccess && apiResponse) {
    const token = apiResponse.token || apiResponse.jwt || generateMockJWT(apiResponse.user || { correo: trimmedEmail });
    const user = apiResponse.user || apiResponse.usuario || {
      nombre: apiResponse.nombre || trimmedEmail.split('@')[0],
      correo: trimmedEmail,
      rol: apiResponse.rol || 'usuario'
    };
    resetFailedAttempts(trimmedEmail);
    setSession(token, user);
    return { success: true, token, user, source: 'api' };
  }

  // 4. Modo Local (Fallback con localStorage)
  const localUser = findUserByEmail(trimmedEmail);
  if (!localUser || localUser.password !== password) {
    const lock = recordFailedAttempt(trimmedEmail);
    if (lock.isLocked) {
      throw new Error(`Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por ${lock.remainingSeconds} segundos.`);
    }
    const remainingAttempts = LOCKOUT_CONFIG.MAX_ATTEMPTS - lock.attempts;
    throw new Error(`Correo o contraseña incorrectos. ${remainingAttempts > 0 ? `Quedan ${remainingAttempts} intento(s) antes del bloqueo.` : ''}`);
  }

  // Éxito en LocalStorage
  resetFailedAttempts(trimmedEmail);
  const token = generateMockJWT(localUser);
  const sessionUser = {
    id: localUser.id,
    nombre: localUser.nombre,
    correo: localUser.correo,
    rol: localUser.rol || 'usuario'
  };
  setSession(token, sessionUser);
  return { success: true, token, user: sessionUser, source: 'localStorage' };
}

/**
 * Operación de Registro (API con fallback a LocalStorage)
 */
async function authRegister(userData) {
  const { nombre, correo, password, rol = 'usuario' } = userData;
  const trimmedEmail = correo.trim().toLowerCase();

  let apiSuccess = false;
  let apiResponse = null;

  // 1. Intentar llamar al backend Node/Express
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: nombre.trim(),
        name: nombre.trim(),
        correo: trimmedEmail,
        email: trimmedEmail,
        password: password,
        rol: rol
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 201 || res.ok) {
      apiResponse = await res.json().catch(() => ({}));
      apiSuccess = true;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'No se pudo completar el registro en el servidor.');
    }
  } catch (err) {
    if (err.message && !err.message.includes('abort') && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Backend API no disponible para registro. Registrando en localStorage...', err.message);
  }

  // 2. Si la API registró con éxito
  if (apiSuccess) {
    // También guardamos una copia en localStorage para coherencia offline
    saveUserToLocalStorage({
      id: apiResponse.id || 'usr-' + Date.now(),
      nombre: nombre.trim(),
      correo: trimmedEmail,
      password: password,
      rol: rol,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.LAST_REGISTERED_EMAIL, trimmedEmail);
    return { success: true, source: 'api' };
  }

  // 3. Fallback a LocalStorage
  const existingUser = findUserByEmail(trimmedEmail);
  if (existingUser) {
    throw new Error('El correo electrónico ya se encuentra registrado en el sistema.');
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    nombre: nombre.trim(),
    correo: trimmedEmail,
    password: password,
    rol: rol,
    createdAt: new Date().toISOString()
  };

  saveUserToLocalStorage(newUser);
  localStorage.setItem(STORAGE_KEYS.LAST_REGISTERED_EMAIL, trimmedEmail);
  return { success: true, source: 'localStorage', user: newUser };
}

/**
 * Consulta de métricas del Dashboard (GET /api/dashboard/totals con fallback a localStorage)
 */
async function fetchDashboardTotals() {
  const token = getToken();

  // 1. Intentar llamar al backend
  if (token) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Intentar primero /dashboard/totals, y si no existe /dashboard/stats
      let res = await fetch(`${API_BASE_URL}/dashboard/totals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return {
          totalUsers: data.totalUsers ?? data.totalUsuarios ?? 0,
          totalServices: data.totalServices ?? data.totalServicios ?? 0,
          totalReservations: data.totalReservations ?? data.totalReservas ?? 0,
          source: 'api'
        };
      }
    } catch (e) {
      console.warn('No se pudo conectar a la API del Dashboard, usando datos de localStorage:', e.message);
    }
  }

  // 2. Fallback a LocalStorage
  const users = getStoredUsers();
  let servicesCount = 8;
  let reservationsCount = 14;

  try {
    const services = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES_DB) || '[]');
    if (services.length > 0) servicesCount = services.length;

    const reservations = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESERVATIONS_DB) || '[]');
    if (reservations.length > 0) reservationsCount = reservations.length;
  } catch (e) {}

  return {
    totalUsers: users.length,
    totalServices: servicesCount,
    totalReservations: reservationsCount,
    source: 'localStorage'
  };
}

// Exportar funciones globales para acceso en las páginas
window.SRAuth = {
  authLogin,
  authRegister,
  fetchDashboardTotals,
  getLockoutState,
  recordFailedAttempt,
  resetFailedAttempts,
  isAuthenticated,
  requireAuth,
  redirectIfAuthenticated,
  getCurrentUser,
  getToken,
  logout,
  getStoredUsers,
  STORAGE_KEYS
};
