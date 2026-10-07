/**
 * services.js — Controlador del Módulo de Catálogo y Gestión de Servicios (HUS-05)
 * Proyecto: Sistema de Reservas - Sprint 2
 */

const API_SERVICES_URL = 'http://localhost:5000/api/services';

// Estado global del módulo de servicios
let allServices = [];
let filteredServices = [];
let serviceModalInstance = null;
let deleteServiceModalInstance = null;
let currentEditingServiceId = null;
let currentDeletingServiceId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard de autenticación: requiere sesión activa
  if (!window.SRAuth || !window.SRAuth.requireAuth()) {
    return;
  }

  const currentUser = window.SRAuth.getCurrentUser();

  // 2. Inicializar modales de Bootstrap
  const serviceModalEl = document.getElementById('serviceModal');
  if (serviceModalEl) {
    serviceModalInstance = new bootstrap.Modal(serviceModalEl);
  }

  const deleteServiceModalEl = document.getElementById('deleteServiceModal');
  if (deleteServiceModalEl) {
    deleteServiceModalInstance = new bootstrap.Modal(deleteServiceModalEl);
  }

  // 3. Renderizar usuario en la barra superior y aplicar permisos de rol
  renderNavbarUser(currentUser);
  applyRolePermissions(currentUser);

  // 4. Configurar eventos de la interfaz
  setupEventListeners();

  // 5. Cargar catálogo de servicios inicial
  await loadServices();
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
  const searchInput = document.getElementById('serviceSearchInput');
  const categoryFilter = document.getElementById('serviceCategoryFilter');
  const availabilityFilter = document.getElementById('serviceAvailabilityFilter');
  const serviceForm = document.getElementById('serviceForm');
  const btnNewService = document.getElementById('btnNewService');
  const confirmDeleteBtn = document.getElementById('confirmDeleteServiceBtn');

  // Búsqueda en tiempo real
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyFilters);
  }

  if (availabilityFilter) {
    availabilityFilter.addEventListener('change', applyFilters);
  }

  // Abrir modal de nuevo servicio
  if (btnNewService) {
    btnNewService.addEventListener('click', () => {
      openCreateServiceModal();
    });
  }

  // Enviar formulario (Crear / Editar)
  if (serviceForm) {
    serviceForm.addEventListener('submit', handleServiceFormSubmit);
  }

  // Confirmar eliminación
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  }
}

/**
 * GET: Cargar y renderizar catálogo de servicios
 */
async function loadServices() {
  setLoadingState(true);
  updateSyncStatus('connecting');

  const token = window.SRAuth.getToken();
  let loadedFromAPI = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(API_SERVICES_URL, {
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
      const rawServices = Array.isArray(data) ? data : (data.services || data.data || []);
      allServices = rawServices.map(s => ({
        id: s._id || s.id || 'srv-' + Math.random().toString(36).substr(2, 9),
        nombre: s.name || s.nombre || 'Servicio',
        categoria: s.category || s.categoria || 'General',
        duracion: Number(s.duration || s.duracion || 60),
        precio: Number(s.price || s.precio || 50000),
        disponible: s.available !== undefined ? s.available : (s.disponible !== undefined ? s.disponible : true),
        descripcion: s.description || s.descripcion || ''
      }));
      loadedFromAPI = true;
      updateSyncStatus('api');
    }
  } catch (err) {
    console.warn('API de Servicios no disponible, cargando desde base de datos local:', err.message);
  }

  // Fallback a LocalStorage si la API no está lista
  if (!loadedFromAPI) {
    try {
      const stored = JSON.parse(localStorage.getItem(window.SRAuth.STORAGE_KEYS.SERVICES_DB) || '[]');
      allServices = stored.map((s, idx) => ({
        id: s.id || 'srv-' + (idx + 1),
        nombre: s.nombre || 'Servicio',
        categoria: s.categoria || 'General',
        duracion: Number(s.duracion || 60),
        precio: Number(s.precio || 50000),
        disponible: s.disponible !== undefined ? s.disponible : true,
        descripcion: s.descripcion || `Espacio o servicio de ${s.categoria} para reserva.`
      }));
    } catch (e) {
      allServices = [];
    }
    updateSyncStatus('local');
  }

  setLoadingState(false);
  populateCategoryFilter();
  applyFilters();
}

/**
 * POST / PUT: Crear o actualizar servicio consumiendo la API REST
 */
async function saveService(serviceData) {
  const token = window.SRAuth.getToken();
  const isEditing = Boolean(currentEditingServiceId);
  let savedService = null;
  let apiSuccess = false;

  const url = isEditing ? `${API_SERVICES_URL}/${currentEditingServiceId}` : API_SERVICES_URL;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: serviceData.nombre,
        nombre: serviceData.nombre,
        category: serviceData.categoria,
        categoria: serviceData.categoria,
        duration: serviceData.duracion,
        duracion: serviceData.duracion,
        price: serviceData.precio,
        precio: serviceData.precio,
        available: serviceData.disponible,
        disponible: serviceData.disponible,
        description: serviceData.descripcion,
        descripcion: serviceData.descripcion
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 201 || res.status === 200 || res.ok) {
      const data = await res.json();
      const s = data.service || data.data || data;
      savedService = {
        id: s._id || s.id || (isEditing ? currentEditingServiceId : 'srv-' + Date.now()),
        nombre: s.name || serviceData.nombre,
        categoria: s.category || serviceData.categoria,
        duracion: Number(s.duration || serviceData.duracion),
        precio: Number(s.price || serviceData.precio),
        disponible: s.available !== undefined ? s.available : serviceData.disponible,
        descripcion: s.description || serviceData.descripcion
      };
      apiSuccess = true;
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al guardar servicio en el servidor');
    }
  } catch (err) {
    if (err.message && !err.message.includes('abort') && !err.message.includes('fetch')) {
      throw err;
    }
    console.warn('Modo local: Guardando servicio en localStorage');
  }

  // Si no se guardó en API, procesar localmente
  if (!savedService) {
    savedService = {
      id: isEditing ? currentEditingServiceId : 'srv-' + Date.now(),
      nombre: serviceData.nombre,
      categoria: serviceData.categoria,
      duracion: Number(serviceData.duracion),
      precio: Number(serviceData.precio),
      disponible: serviceData.disponible,
      descripcion: serviceData.descripcion
    };
  }

  // Guardar en localStorage
  const storedServices = JSON.parse(localStorage.getItem(window.SRAuth.STORAGE_KEYS.SERVICES_DB) || '[]');
  if (isEditing) {
    const idx = storedServices.findIndex(s => s.id === currentEditingServiceId);
    if (idx >= 0) {
      storedServices[idx] = { ...storedServices[idx], ...savedService };
    } else {
      storedServices.push(savedService);
    }
  } else {
    storedServices.unshift(savedService);
  }
  localStorage.setItem(window.SRAuth.STORAGE_KEYS.SERVICES_DB, JSON.stringify(storedServices));

  // Actualizar en memoria
  if (isEditing) {
    const memIdx = allServices.findIndex(s => s.id === currentEditingServiceId);
    if (memIdx >= 0) allServices[memIdx] = savedService;
  } else {
    allServices.unshift(savedService);
  }

  populateCategoryFilter();
  applyFilters();

  return { success: true, service: savedService, source: apiSuccess ? 'api' : 'local' };
}

/**
 * DELETE: Eliminar servicio de la API y base local
 */
async function deleteService(id) {
  const token = window.SRAuth.getToken();
  let apiSuccess = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_SERVICES_URL}/${id}`, {
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
    console.warn('Modo local: Eliminando servicio de localStorage');
  }

  // Eliminar en localStorage
  const storedServices = JSON.parse(localStorage.getItem(window.SRAuth.STORAGE_KEYS.SERVICES_DB) || '[]').filter(s => s.id !== id);
  localStorage.setItem(window.SRAuth.STORAGE_KEYS.SERVICES_DB, JSON.stringify(storedServices));

  // Eliminar en memoria
  allServices = allServices.filter(s => s.id !== id);

  populateCategoryFilter();
  applyFilters();

  return { success: true, source: apiSuccess ? 'api' : 'local' };
}

/**
 * Filtra los servicios reactivamente por texto, categoría y disponibilidad
 */
function applyFilters() {
  const searchInput = document.getElementById('serviceSearchInput');
  const categoryFilter = document.getElementById('serviceCategoryFilter');
  const availabilityFilter = document.getElementById('serviceAvailabilityFilter');

  const query = (searchInput?.value || '').trim().toLowerCase();
  const selectedCat = categoryFilter?.value || 'all';
  const selectedAvail = availabilityFilter?.value || 'all';

  filteredServices = allServices.filter(srv => {
    // Coincidencia por texto
    const matchQuery = !query ||
      (srv.nombre && srv.nombre.toLowerCase().includes(query)) ||
      (srv.categoria && srv.categoria.toLowerCase().includes(query)) ||
      (srv.descripcion && srv.descripcion.toLowerCase().includes(query));

    // Coincidencia por categoría
    const matchCategory = (selectedCat === 'all') || (srv.categoria.toLowerCase() === selectedCat.toLowerCase());

    // Coincidencia por disponibilidad
    let matchAvail = true;
    if (selectedAvail === 'available') {
      matchAvail = Boolean(srv.disponible);
    } else if (selectedAvail === 'unavailable') {
      matchAvail = !srv.disponible;
    }

    return matchQuery && matchCategory && matchAvail;
  });

  renderServicesGrid(filteredServices);
  updateCounterBadge(filteredServices.length, allServices.length);
}

/**
 * Renderiza la cuadrícula de tarjetas (Cards Grid HUS-05 en 3 columnas col-12 col-md-4)
 */
function renderServicesGrid(services) {
  const container = document.getElementById('servicesGridContainer');
  const emptyState = document.getElementById('servicesEmptyState');

  if (!container) return;

  if (services.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('d-none');
    return;
  }

  if (emptyState) emptyState.classList.add('d-none');

  container.innerHTML = services.map(srv => {
    const isAvailable = Boolean(srv.disponible);
    const categoryClass = getCategoryClass(srv.categoria);
    const formattedPrice = formatCurrency(srv.precio);

    return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="service-card">
          <!-- Encabezado de la Tarjeta -->
          <div class="service-card-header">
            <span class="service-category-badge ${categoryClass}">
              ${escapeHTML(srv.categoria || 'General')}
            </span>
            ${isAvailable
              ? `<span class="badge-status badge-status-active">
                   <span class="status-dot"></span> Disponible
                 </span>`
              : `<span class="badge-status badge-status-inactive">
                   <span class="status-dot"></span> No Disponible
                 </span>`
            }
          </div>

          <!-- Cuerpo de la Tarjeta -->
          <div class="service-card-body">
            <h3 class="h5 fw-bold text-dark mb-2">${escapeHTML(srv.nombre)}</h3>
            <p class="text-secondary small flex-grow-1 mb-3">
              ${escapeHTML(srv.descripcion || 'Sin descripción detallada para este servicio.')}
            </p>

            <div class="d-flex align-items-center justify-content-between pt-2 border-top">
              <div>
                <span class="text-secondary small d-block">Tarifa / Sesión</span>
                <span class="service-price">${formattedPrice}</span>
              </div>
              <div class="text-end">
                <span class="text-secondary small d-block">Duración</span>
                <span class="service-duration-badge">
                  <span>⏱️</span> ${srv.duracion} min
                </span>
              </div>
            </div>
          </div>

          <!-- Pie de la Tarjeta con Acciones -->
          <div class="service-card-footer">
            <button class="btn btn-action-edit flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1"
              onclick="openEditServiceModal('${srv.id}')"
              title="Editar servicio" aria-label="Editar ${escapeHTML(srv.nombre)}">
              <span>✏️</span> <span>Editar</span>
            </button>
            <button class="btn btn-action-delete d-inline-flex align-items-center justify-content-center gap-1"
              onclick="openDeleteServiceModal('${srv.id}')"
              title="Eliminar servicio" aria-label="Eliminar ${escapeHTML(srv.nombre)}">
              <span>🗑️</span> <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Abre el modal para crear un nuevo servicio
 */
function openCreateServiceModal() {
  currentEditingServiceId = null;
  const form = document.getElementById('serviceForm');
  const titleEl = document.getElementById('serviceModalLabel');

  if (form) form.reset();
  clearFormValidation(form);

  if (titleEl) titleEl.innerHTML = '<span>➕</span> Registrar Nuevo Servicio';

  // Valores predeterminados
  document.getElementById('serviceDuration').value = 60;
  document.getElementById('servicePrice').value = 50000;
  document.getElementById('serviceAvailable').value = 'true';
  document.getElementById('serviceCategory').value = 'Deportes';

  serviceModalInstance.show();
}

/**
 * Abre el modal para editar un servicio existente
 */
function openEditServiceModal(id) {
  const service = allServices.find(s => s.id === id);
  if (!service) return;

  currentEditingServiceId = id;
  const form = document.getElementById('serviceForm');
  const titleEl = document.getElementById('serviceModalLabel');

  clearFormValidation(form);

  if (titleEl) titleEl.innerHTML = '<span>✏️</span> Editar Servicio';

  document.getElementById('serviceName').value = service.nombre || '';
  document.getElementById('serviceCategory').value = service.categoria || 'General';
  document.getElementById('serviceDuration').value = service.duracion || 60;
  document.getElementById('servicePrice').value = service.precio || 0;
  document.getElementById('serviceAvailable').value = service.disponible ? 'true' : 'false';
  document.getElementById('serviceDescription').value = service.descripcion || '';

  serviceModalInstance.show();
}

/**
 * Abre el modal de confirmación destructiva para eliminar servicio
 */
function openDeleteServiceModal(id) {
  const service = allServices.find(s => s.id === id);
  if (!service) return;

  currentDeletingServiceId = id;
  const nameEl = document.getElementById('deleteServiceName');
  const categoryEl = document.getElementById('deleteServiceCategory');

  if (nameEl) nameEl.textContent = service.nombre || 'Servicio';
  if (categoryEl) categoryEl.textContent = `Categoría: ${service.categoria || 'General'}`;

  deleteServiceModalInstance.show();
}

/**
 * Procesa el envío del formulario de servicio (Crear o Actualizar) con validaciones de negocio
 */
async function handleServiceFormSubmit(e) {
  e.preventDefault();
  const form = e.target;

  const nameInput = document.getElementById('serviceName');
  const categorySelect = document.getElementById('serviceCategory');
  const durationInput = document.getElementById('serviceDuration');
  const priceInput = document.getElementById('servicePrice');
  const availableSelect = document.getElementById('serviceAvailable');
  const descriptionInput = document.getElementById('serviceDescription');
  const submitBtn = document.getElementById('saveServiceBtn');

  // Validaciones
  let isValid = true;

  if (!nameInput.value.trim()) {
    setInputError(nameInput, 'El nombre del servicio es obligatorio.');
    isValid = false;
  } else {
    setInputValid(nameInput);
  }

  const durationVal = parseInt(durationInput.value, 10);
  if (isNaN(durationVal) || durationVal <= 0) {
    setInputError(durationInput, 'La duración debe ser un número positivo mayor a 0 (minutos).');
    isValid = false;
  } else {
    setInputValid(durationInput);
  }

  const priceVal = parseFloat(priceInput.value);
  if (isNaN(priceVal) || priceVal <= 0) {
    setInputError(priceInput, 'El precio debe ser un valor positivo mayor a 0 ($).');
    isValid = false;
  } else {
    setInputValid(priceInput);
  }

  if (!isValid) return;

  const serviceData = {
    nombre: nameInput.value.trim(),
    categoria: categorySelect.value.trim(),
    duracion: durationVal,
    precio: priceVal,
    disponible: availableSelect.value === 'true',
    descripcion: descriptionInput.value.trim()
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Guardando...`;
  }

  try {
    const result = await saveService(serviceData);
    const actionText = currentEditingServiceId ? 'actualizado' : 'registrado';
    showServicesAlert(`¡Servicio <strong>${escapeHTML(serviceData.nombre)}</strong> ${actionText} con éxito!`, 'success');
    serviceModalInstance.hide();
  } catch (err) {
    showServicesAlert(err.message || 'Error al guardar el servicio.', 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Guardar Servicio';
    }
  }
}

/**
 * Procesa la eliminación del servicio tras confirmación
 */
async function handleConfirmDelete() {
  if (!currentDeletingServiceId) return;

  const confirmBtn = document.getElementById('confirmDeleteServiceBtn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Eliminando...`;
  }

  try {
    const srv = allServices.find(s => s.id === currentDeletingServiceId);
    const srvName = srv ? srv.nombre : 'Servicio';

    await deleteService(currentDeletingServiceId);
    deleteServiceModalInstance.hide();
    showServicesAlert(`El servicio <strong>${escapeHTML(srvName)}</strong> fue eliminado del catálogo.`, 'info');
  } catch (err) {
    showServicesAlert(err.message || 'Error al eliminar servicio.', 'danger');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Sí, Eliminar';
    }
    currentDeletingServiceId = null;
  }
}

/**
 * Llena el selector de categorías dinámicamente con las existentes
 */
function populateCategoryFilter() {
  const categoryFilter = document.getElementById('serviceCategoryFilter');
  if (!categoryFilter) return;

  const currentVal = categoryFilter.value;
  const categories = Array.from(new Set(allServices.map(s => s.categoria).filter(Boolean)));

  categoryFilter.innerHTML = `
    <option value="all">Todas las Categorías</option>
    ${categories.map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('')}
  `;

  if (categories.includes(currentVal)) {
    categoryFilter.value = currentVal;
  } else {
    categoryFilter.value = 'all';
  }
}

/**
 * Helpers y utilidades
 */
function formatCurrency(amount) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return '$' + Number(amount).toLocaleString('es-CO');
  }
}

function getCategoryClass(category) {
  if (!category) return 'category-default';
  const norm = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (norm.includes('deporte')) return 'category-deportes';
  if (norm.includes('evento')) return 'category-eventos';
  if (norm.includes('empresa') || norm.includes('junta')) return 'category-empresarial';
  if (norm.includes('agua') || norm.includes('piscina') || norm.includes('acuatic')) return 'category-acuaticos';
  if (norm.includes('salud') || norm.includes('fitness') || norm.includes('gimnasio')) return 'category-salud';
  if (norm.includes('social')) return 'category-social';
  if (norm.includes('tecno') || norm.includes('comput')) return 'category-tecnologia';
  if (norm.includes('recrea') || norm.includes('bbq')) return 'category-recreacion';
  return 'category-default';
}

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
  const badge = document.getElementById('servicesCountBadge');
  if (!badge) return;
  badge.textContent = `${filteredCount} de ${totalCount} servicios`;
}

function setLoadingState(isLoading) {
  const loader = document.getElementById('servicesLoader');
  const container = document.getElementById('servicesGridContainer');
  if (loader) {
    if (isLoading) loader.classList.remove('d-none');
    else loader.classList.add('d-none');
  }
  if (container && isLoading) {
    container.innerHTML = '';
  }
}

function showServicesAlert(message, type = 'success') {
  const alertEl = document.getElementById('servicesAlert');
  if (!alertEl) return;

  alertEl.className = `alert alert-${type} alert-dismissible fade show mb-4 fade-in`;
  alertEl.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  alertEl.classList.remove('d-none');
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setInputError(input, msg) {
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');
  const feedback = input.closest('.mb-3, .mb-4, .col-12, .col-sm-6')?.querySelector('.invalid-feedback');
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

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
