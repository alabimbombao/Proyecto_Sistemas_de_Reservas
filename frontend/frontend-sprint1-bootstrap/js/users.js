/**
 * users.js — Controlador del Módulo de Gestión de Usuarios (HUS-04)
 * Proyecto: Sistema de Reservas - Sprint 2
 */

const API_URL = 'http://localhost:5000/api/users';

// Estado global del módulo
let allUsers = [];
let filteredUsers = [];
let userModalInstance = null;
let deleteUserModalInstance = null;
let currentEditingUserId = null;
let currentDeletingUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard de autenticación: requiere sesión activa
  if (!window.SRAuth || !window.SRAuth.requireAuth()) {
    return;
  }

  const currentUser = window.SRAuth.getCurrentUser();

  // 2. Inicializar modales de Bootstrap
  const userModalEl = document.getElementById('userModal');
  if (userModalEl) {
    userModalInstance = new bootstrap.Modal(userModalEl);
  }

  const deleteUserModalEl = document.getElementById('deleteUserModal');
  if (deleteUserModalEl) {
    deleteUserModalInstance = new bootstrap.Modal(deleteUserModalEl);
  }

  // 3. Renderizar usuario en la barra superior y aplicar permisos de rol
  renderNavbarUser(currentUser);
  applyRolePermissions(currentUser);

  // 4. Configurar eventos de la interfaz
  setupEventListeners();

  // 5. Cargar usuarios iniciales
  await loadUsers();
});

/**
 * Adapta los menús visibles según el rol del usuario activo
 */
function applyRolePermissions(user) {
  const role = user?.rol || 'usuario';
  const adminElements = document.querySelectorAll('.admin-only');
  const userElements = document.querySelectorAll('.user-only');

  if (role === 'admin') {
    adminElements.forEach(el => el.classList.remove('d-none'));
    userElements.forEach(el => el.classList.add('d-none'));
  } else {
    adminElements.forEach(el => el.classList.add('d-none'));
    userElements.forEach(el => el.classList.remove('d-none'));
  }
}

/**
 * Renderiza la información básica del usuario en la barra superior
 */
function renderNavbarUser(user) {
  if (!user) return;
  const navbarUserEl = document.getElementById('navbarUser');
  const userRoleBadgeEl = document.getElementById('userRoleBadge');

  if (navbarUserEl) navbarUserEl.textContent = user.nombre || user.correo;
  if (userRoleBadgeEl) {
    if (user.rol === 'admin') {
      userRoleBadgeEl.className = 'role-badge role-badge-admin';
      userRoleBadgeEl.textContent = 'Administrador';
    } else {
      userRoleBadgeEl.className = 'role-badge role-badge-user';
      userRoleBadgeEl.textContent = 'Cliente';
    }
  }

  // Configurar cierre de sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
      modal.show();
    });
  }

  const confirmLogoutBtn = document.getElementById('confirmLogoutAction');
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      window.SRAuth.logout();
    });
  }

  // Modal de perfil
  const profileModalEl = document.getElementById('profileModal');
  if (profileModalEl) {
    profileModalEl.addEventListener('show.bs.modal', () => {
      document.getElementById('profileModalName').textContent = user.nombre || 'No registrado';
      document.getElementById('profileModalEmail').textContent = user.correo || 'No registrado';
      document.getElementById('profileModalRole').textContent = user.rol === 'admin' ? 'Administrador del Sistema' : 'Cliente / Usuario';
      document.getElementById('profileModalId').textContent = user.id || 'N/A';
    });
  }
}

/**
 * Configura los escuchadores de eventos para búsqueda, filtros y formularios
 */
function setupEventListeners() {
  const searchInput = document.getElementById('userSearchInput');
  const roleFilter = document.getElementById('userRoleFilter');
  const statusFilter = document.getElementById('userStatusFilter');
  const userForm = document.getElementById('userForm');
  const btnNewUser = document.getElementById('btnNewUser');
  const confirmDeleteBtn = document.getElementById('confirmDeleteUserBtn');
  const togglePasswordBtn = document.getElementById('toggleUserPassword');

  // Búsqueda en tiempo real
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (roleFilter) {
    roleFilter.addEventListener('change', applyFilters);
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', applyFilters);
  }

  // Abrir modal de nuevo usuario
  if (btnNewUser) {
    btnNewUser.addEventListener('click', () => {
      openCreateUserModal();
    });
  }

  // Toggle visibilidad contraseña
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('userPassword');
      if (passwordInput) {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        togglePasswordBtn.innerHTML = isPassword ? '🙈' : '👁️';
      }
    });
  }

  // Enviar formulario (Crear / Editar)
  if (userForm) {
    userForm.addEventListener('submit', handleUserFormSubmit);
  }

  // Confirmar eliminación
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }
}

/**
 * GET: Cargar y renderizar tabla de usuarios
 */
async function loadUsers() {
  setLoadingState(true);
  updateSyncStatus('connecting');

  const token = window.SRAuth.getToken();
  let loadedFromAPI = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawUsers = Array.isArray(data) ? data : (data.users || data.data || []);
      // Normalizar datos recibidos de la API
      allUsers = rawUsers.map(u => ({
        id: u._id || u.id || 'usr-' + Math.random().toString(36).substr(2, 9),
        nombre: u.name || u.nombre || 'Usuario',
        correo: u.email || u.correo || '',
        rol: u.role || u.rol || 'usuario',
        estado: u.status || u.estado || 'activo',
        createdAt: u.createdAt || new Date().toISOString()
      }));
      loadedFromAPI = true;
      updateSyncStatus('api');
    }
  } catch (err) {
    console.warn('API de Usuarios no disponible, cargando desde base de datos local:', err.message);
  }

  // Fallback a LocalStorage si la API no está lista o falló
  if (!loadedFromAPI) {
    allUsers = window.SRAuth.getStoredUsers().map(u => ({
      ...u,
      estado: u.estado || 'activo'
    }));
    updateSyncStatus('local');
  }

  setLoadingState(false);
  applyFilters();
}

/**
 * POST: Crear usuario desde el modal
 */
async function createUser(userData) {
  const token = window.SRAuth.getToken();
  let createdUser = null;
  let apiSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: userData.nombre,
        nombre: userData.nombre,
        email: userData.correo,
        correo: userData.correo,
        role: userData.rol,
        rol: userData.rol,
        status: userData.estado,
        estado: userData.estado,
        password: userData.password
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 201 || res.ok) {
      const data = await res.json();
      const u = data.user || data.data || data;
      createdUser = {
        id: u._id || u.id || 'usr-' + Date.now(),
        nombre: u.name || userData.nombre,
        correo: u.email || userData.correo,
        rol: u.role || userData.rol,
        estado: u.status || userData.estado,
        createdAt: new Date().toISOString()
      };
      apiSuccess = true;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al registrar usuario en la API');
    }
  } catch (err) {
    if (err.message && !err.message.includes('abort') && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Modo local: Guardando usuario en localStorage');
  }

  // Si no se guardó en API, crear localmente
  if (!createdUser) {
    // Validar correo único en local
    const exists = allUsers.some(u => u.correo.toLowerCase() === userData.correo.toLowerCase());
    if (exists) {
      throw new Error('El correo electrónico ya se encuentra registrado en el sistema.');
    }

    createdUser = {
      id: 'usr-' + Date.now(),
      nombre: userData.nombre,
      correo: userData.correo,
      rol: userData.rol,
      estado: userData.estado,
      password: userData.password,
      createdAt: new Date().toISOString()
    };
  }

  // Guardar en localStorage para coherencia offline
  window.SRAuth.saveUserToLocalStorage(createdUser);

  // Actualizar lista en memoria
  allUsers.unshift(createdUser);
  applyFilters();

  return { success: true, user: createdUser, source: apiSuccess ? 'api' : 'local' };
}

/**
 * PUT: Actualizar usuario existente
 */
async function updateUser(id, userData) {
  const token = window.SRAuth.getToken();
  let updatedUser = null;
  let apiSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: userData.nombre,
        nombre: userData.nombre,
        email: userData.correo,
        correo: userData.correo,
        role: userData.rol,
        rol: userData.rol,
        status: userData.estado,
        estado: userData.estado,
        password: userData.password || undefined
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const u = data.user || data.data || data;
      updatedUser = {
        id: u._id || id,
        nombre: u.name || userData.nombre,
        correo: u.email || userData.correo,
        rol: u.role || userData.rol,
        estado: u.status || userData.estado
      };
      apiSuccess = true;
    }
  } catch (err) {
    console.warn('Modo local: Actualizando usuario en localStorage:', err.message);
  }

  if (!updatedUser) {
    updatedUser = {
      id,
      nombre: userData.nombre,
      correo: userData.correo,
      rol: userData.rol,
      estado: userData.estado
    };
  }

  // Actualizar en localStorage
  const storedUsers = window.SRAuth.getStoredUsers();
  const idx = storedUsers.findIndex(u => u.id === id || u.correo.toLowerCase() === userData.correo.toLowerCase());
  if (idx >= 0) {
    storedUsers[idx] = { ...storedUsers[idx], ...updatedUser };
    localStorage.setItem(window.SRAuth.STORAGE_KEYS.USERS_DB, JSON.stringify(storedUsers));
  }

  // Actualizar en memoria
  const memoryIdx = allUsers.findIndex(u => u.id === id);
  if (memoryIdx >= 0) {
    allUsers[memoryIdx] = { ...allUsers[memoryIdx], ...updatedUser };
  }

  applyFilters();
  return { success: true, user: updatedUser, source: apiSuccess ? 'api' : 'local' };
}

/**
 * DELETE: Eliminar o desactivar usuario
 */
async function deleteUser(id) {
  const token = window.SRAuth.getToken();
  let apiSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      apiSuccess = true;
    }
  } catch (err) {
    console.warn('Modo local: Eliminando usuario de localStorage');
  }

  // Eliminar en localStorage
  const storedUsers = window.SRAuth.getStoredUsers().filter(u => u.id !== id);
  localStorage.setItem(window.SRAuth.STORAGE_KEYS.USERS_DB, JSON.stringify(storedUsers));

  // Eliminar en memoria
  allUsers = allUsers.filter(u => u.id !== id);
  applyFilters();

  return { success: true, source: apiSuccess ? 'api' : 'local' };
}

/**
 * Aplica los filtros de búsqueda por texto, rol y estado
 */
function applyFilters() {
  const searchInput = document.getElementById('userSearchInput');
  const roleFilter = document.getElementById('userRoleFilter');
  const statusFilter = document.getElementById('userStatusFilter');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedRole = roleFilter?.value || 'all';
  const selectedStatus = statusFilter?.value || 'all';

  filteredUsers = allUsers.filter(user => {
    // Coincidencia por texto
    const matchQuery = !query ||
      (user.nombre && user.nombre.toLowerCase().includes(query)) ||
      (user.correo && user.correo.toLowerCase().includes(query));

    // Coincidencia por rol
    const userRoleNorm = (user.rol === 'admin') ? 'admin' : 'usuario';
    const matchRole = (selectedRole === 'all') || (userRoleNorm === selectedRole);

    // Coincidencia por estado
    const userStatusNorm = (user.estado === 'inactivo') ? 'inactivo' : 'activo';
    const matchStatus = (selectedStatus === 'all') || (userStatusNorm === selectedStatus);

    return matchQuery && matchRole && matchStatus;
  });

  renderUsersTable(filteredUsers);
  updateCounterBadge(filteredUsers.length, allUsers.length);
}

/**
 * Renderiza los usuarios en la tabla HTML
 */
function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  const emptyState = document.getElementById('usersEmptyState');
  const tableContainer = document.getElementById('usersTableContainer');

  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('d-none');
    if (tableContainer) tableContainer.classList.add('d-none');
    return;
  }

  if (emptyState) emptyState.classList.add('d-none');
  if (tableContainer) tableContainer.classList.remove('d-none');

  tbody.innerHTML = users.map(user => {
    const isActivo = (user.estado || 'activo') === 'activo';
    const isAdmin = (user.rol || 'usuario') === 'admin';
    const initials = getInitials(user.nombre || user.correo);

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="user-avatar-initials">${initials}</div>
            <div>
              <div class="fw-bold text-dark">${escapeHTML(user.nombre || 'Sin Nombre')}</div>
              <small class="text-secondary d-md-none">${escapeHTML(user.correo)}</small>
            </div>
          </div>
        </td>
        <td class="d-none d-md-table-cell">
          <span class="text-secondary">${escapeHTML(user.correo)}</span>
        </td>
        <td>
          ${isAdmin
            ? `<span class="badge-role-admin">👑 Administrador</span>`
            : `<span class="badge-role-user">👤 Cliente</span>`
          }
        </td>
        <td>
          ${isActivo
            ? `<span class="badge-status badge-status-active">
                 <span class="status-dot"></span> Activo
               </span>`
            : `<span class="badge-status badge-status-inactive">
                 <span class="status-dot"></span> Inactivo
               </span>`
          }
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-2">
            <button class="btn btn-action-edit d-inline-flex align-items-center gap-1"
              onclick="openEditUserModal('${user.id}')"
              title="Editar usuario" aria-label="Editar ${escapeHTML(user.nombre)}">
              <span>✏️</span> <span class="d-none d-sm-inline">Editar</span>
            </button>
            <button class="btn btn-action-delete d-inline-flex align-items-center gap-1"
              onclick="openDeleteUserModal('${user.id}')"
              title="Eliminar o desactivar usuario" aria-label="Eliminar ${escapeHTML(user.nombre)}">
              <span>🗑️</span> <span class="d-none d-sm-inline">Eliminar</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Abre el modal para crear un nuevo usuario
 */
function openCreateUserModal() {
  currentEditingUserId = null;
  const form = document.getElementById('userForm');
  const titleEl = document.getElementById('userModalLabel');
  const passwordInput = document.getElementById('userPassword');
  const passwordHint = document.getElementById('passwordHelpHint');

  if (form) form.reset();
  clearFormValidation(form);

  if (titleEl) titleEl.innerHTML = '<span>➕</span> Registrar Nuevo Usuario';
  if (passwordInput) {
    passwordInput.required = true;
    passwordInput.placeholder = 'Mínimo 6 caracteres';
  }
  if (passwordHint) {
    passwordHint.textContent = 'La contraseña es obligatoria para nuevos usuarios.';
  }

  // Valores predeterminados
  document.getElementById('userRole').value = 'usuario';
  document.getElementById('userStatus').value = 'activo';

  userModalInstance.show();
}

/**
 * Abre el modal para editar un usuario existente
 */
function openEditUserModal(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  currentEditingUserId = id;
  const form = document.getElementById('userForm');
  const titleEl = document.getElementById('userModalLabel');
  const passwordInput = document.getElementById('userPassword');
  const passwordHint = document.getElementById('passwordHelpHint');

  clearFormValidation(form);

  if (titleEl) titleEl.innerHTML = '<span>✏️</span> Editar Usuario';

  document.getElementById('userName').value = user.nombre || '';
  document.getElementById('userEmail').value = user.correo || '';
  document.getElementById('userRole').value = (user.rol === 'admin') ? 'admin' : 'usuario';
  document.getElementById('userStatus').value = (user.estado === 'inactivo') ? 'inactivo' : 'activo';

  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.required = false;
    passwordInput.placeholder = 'Dejar en blanco para mantener actual';
  }
  if (passwordHint) {
    passwordHint.textContent = 'Opcional. Deja este campo vacío si no deseas cambiar la contraseña.';
  }

  userModalInstance.show();
}

/**
 * Abre el modal de confirmación destructiva para eliminar o desactivar
 */
function openDeleteUserModal(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;

  currentDeletingUserId = id;
  const nameEl = document.getElementById('deleteUserName');
  const emailEl = document.getElementById('deleteUserEmail');

  if (nameEl) nameEl.textContent = user.nombre || 'Usuario';
  if (emailEl) emailEl.textContent = user.correo || '';

  deleteUserModalInstance.show();
}

/**
 * Procesa el envío del formulario de usuario (Crear o Actualizar)
 */
async function handleUserFormSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  const roleSelect = document.getElementById('userRole');
  const statusSelect = document.getElementById('userStatus');
  const passwordInput = document.getElementById('userPassword');
  const submitBtn = document.getElementById('saveUserBtn');

  // Validaciones
  let isValid = true;

  if (!nameInput.value.trim()) {
    setInputError(nameInput, 'El nombre completo es obligatorio.');
    isValid = false;
  } else {
    setInputValid(nameInput);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
    setInputError(emailInput, 'Ingresa un correo electrónico con formato válido.');
    isValid = false;
  } else {
    setInputValid(emailInput);
  }

  if (!currentEditingUserId && (!passwordInput.value || passwordInput.value.length < 6)) {
    setInputError(passwordInput, 'La contraseña debe contener al menos 6 caracteres.');
    isValid = false;
  } else {
    setInputValid(passwordInput);
  }

  if (!isValid) return;

  const userData = {
    nombre: nameInput.value.trim(),
    correo: emailInput.value.trim().toLowerCase(),
    rol: roleSelect.value,
    estado: statusSelect.value,
    password: passwordInput.value || undefined
  };

  // Deshabilitar botón durante el guardado
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Guardando...`;
  }

  try {
    if (currentEditingUserId) {
      await updateUser(currentEditingUserId, userData);
      showUsersAlert(`¡Usuario <strong>${escapeHTML(userData.nombre)}</strong> actualizado con éxito!`, 'success');
    } else {
      await createUser(userData);
      showUsersAlert(`¡Usuario <strong>${escapeHTML(userData.nombre)}</strong> registrado con éxito!`, 'success');
    }

    userModalInstance.hide();
  } catch (err) {
    showUsersAlert(err.message || 'Error al procesar la operación.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Guardar Usuario';
    }
  }
}

/**
 * Procesa la eliminación del usuario tras confirmación en el modal
 */
async function handleConfirmDelete() {
  if (!currentDeletingUserId) return;

  const confirmBtn = document.getElementById('confirmDeleteUserBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Eliminando...`;
  }

  try {
    const user = allUsers.find(u => u.id === currentDeletingUserId);
    const userName = user ? user.nombre : 'Usuario';

    await deleteUser(currentDeletingUserId);
    deleteUserModalInstance.hide();
    showUsersAlert(`El usuario <strong>${escapeHTML(userName)}</strong> fue eliminado del sistema.`, 'info');
  } catch (err) {
    showUsersAlert(err.message || 'Error al eliminar usuario.', 'danger');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Sí, Eliminar';
    }
    currentDeletingUserId = null;
  }
}

/**
 * Helpers y utilidades de la interfaz
 */
function updateSyncStatus(mode) {
  const syncStatusEl = document.getElementById('syncStatus');
  if (!syncStatusEl) return;

  if (mode === 'api') {
    syncStatusEl.innerHTML = `<span class="sync-dot sync-online"></span> Modo API (En línea)`;
    syncStatusEl.className = 'sync-status-badge text-success bg-white border shadow-sm';
  } else if (mode === 'local') {
    syncStatusEl.innerHTML = `<span class="sync-dot sync-local"></span> Modo Local (localStorage)`;
    syncStatusEl.className = 'sync-status-badge text-warning-emphasis bg-white border shadow-sm';
  } else {
    syncStatusEl.innerHTML = `<span class="sync-dot sync-local"></span> Sincronizando...`;
  }
}

function updateCounterBadge(filteredCount, totalCount) {
  const badge = document.getElementById('usersCountBadge');
  if (!badge) return;
  badge.textContent = `${filteredCount} de ${totalCount} usuarios`;
}

function setLoadingState(isLoading) {
  const loader = document.getElementById('usersTableLoader');
  const container = document.getElementById('usersTableContainer');
  if (loader) {
    if (isLoading) loader.classList.remove('d-none');
    else loader.classList.add('d-none');
  }
  if (container && isLoading) {
    container.classList.add('d-none');
  }
}

function showUsersAlert(message, type = 'success') {
  const alertEl = document.getElementById('usersAlert');
  if (!alertEl) return;

  alertEl.className = `alert alert-${type} alert-dismissible fade show mb-4 fade-in`;
  alertEl.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  alertEl.classList.remove('d-none');

  // Auto-scroll a la alerta
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setInputError(input, msg) {
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');
  const feedback = input.closest('.mb-3, .mb-4')?.querySelector('.invalid-feedback');
  if (feedback) feedback.textContent = msg;
}

function setInputValid(input) {
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');
}

function clearFormValidation(form) {
  if (!form) return;
  const inputs = form.querySelectorAll('.form-control, .form-select');
  inputs.forEach(input => {
    input.classList.remove('is-invalid', 'is-valid');
  });
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
