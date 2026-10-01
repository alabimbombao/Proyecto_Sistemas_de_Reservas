/**
 * dashboard.js — Controlador del Módulo de Dashboard (HUS-03)
 * Proyecto: Sistema de Reservas - Sprint 1
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard de autenticación: si no hay sesión válida, redirigir al login
  if (!window.SRAuth || !window.SRAuth.requireAuth()) {
    return;
  }

  const currentUser = window.SRAuth.getCurrentUser();

  // 2. Elementos del DOM
  const navbarUserEl = document.getElementById('navbarUser');
  const greetingNameEl = document.getElementById('greetingName');
  const userRoleBadgeEl = document.getElementById('userRoleBadge');
  const syncStatusEl = document.getElementById('syncStatus');
  const totalUsersEl = document.getElementById('totalUsers');
  const totalServicesEl = document.getElementById('totalServices');
  const totalReservationsEl = document.getElementById('totalReservations');
  const logoutBtn = document.getElementById('logoutBtn');
  const dashboardAlert = document.getElementById('dashboardAlert');

  // 3. Renderizar información del perfil y rol
  renderUserProfile(currentUser);

  // 4. Adaptar vistas y permisos según el Rol del usuario
  applyRolePermissions(currentUser);

  // 5. Cargar métricas e indicadores desde API / LocalStorage con animación
  await loadDashboardTotals();

  // 6. Configurar cierre de sesión
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const confirmLogoutModal = new bootstrap.Modal(document.getElementById('logoutModal'));
      confirmLogoutModal.show();
    });
  }

  const confirmLogoutActionBtn = document.getElementById('confirmLogoutAction');
  if (confirmLogoutActionBtn) {
    confirmLogoutActionBtn.addEventListener('click', () => {
      window.SRAuth.logout();
    });
  }

  // 7. Configurar acciones rápidas
  setupQuickActions(currentUser);

  /**
   * Renderiza los datos del usuario en la barra superior y encabezado
   */
  function renderUserProfile(user) {
    if (!user) return;

    const firstName = user.nombre ? user.nombre.split(' ')[0] : 'Usuario';
    const role = user.rol || 'usuario';

    if (navbarUserEl) navbarUserEl.textContent = user.nombre || user.correo;
    if (greetingNameEl) greetingNameEl.textContent = firstName;

    if (userRoleBadgeEl) {
      if (role === 'admin') {
        userRoleBadgeEl.className = 'role-badge role-badge-admin';
        userRoleBadgeEl.textContent = 'Administrador';
      } else {
        userRoleBadgeEl.className = 'role-badge role-badge-user';
        userRoleBadgeEl.textContent = 'Cliente';
      }
    }
  }

  /**
   * Adapta módulos y textos según el rol del usuario
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
   * Consulta las estadísticas acumuladas y anima los números
   */
  async function loadDashboardTotals() {
    try {
      const data = await window.SRAuth.fetchDashboardTotals();

      // Indicador de conexión
      if (syncStatusEl) {
        if (data.source === 'api') {
          syncStatusEl.innerHTML = `<span class="sync-dot sync-online"></span> Modo API (En línea)`;
          syncStatusEl.className = 'sync-status-badge text-success bg-white border shadow-sm';
        } else {
          syncStatusEl.innerHTML = `<span class="sync-dot sync-local"></span> Modo Local (localStorage)`;
          syncStatusEl.className = 'sync-status-badge text-warning-emphasis bg-white border shadow-sm';
        }
      }

      // Conteo numérico animado
      animateCounter(totalUsersEl, data.totalUsers);
      animateCounter(totalServicesEl, data.totalServices);
      animateCounter(totalReservationsEl, data.totalReservations);
    } catch (e) {
      console.error('Error al cargar métricas del dashboard:', e);
      if (dashboardAlert) {
        dashboardAlert.className = 'alert alert-warning mb-4 fade-in';
        dashboardAlert.textContent = 'No se pudieron sincronizar algunas métricas en tiempo real.';
        dashboardAlert.classList.remove('d-none');
      }
    }
  }

  /**
   * Animación fluida de incremento numérico
   */
  function animateCounter(element, target, duration = 1200) {
    if (!element) return;
    const finalValue = parseInt(target, 10) || 0;
    if (finalValue === 0) {
      element.textContent = '0';
      return;
    }

    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing cúbico hacia el final
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * finalValue);

      element.textContent = current.toLocaleString('es-CO');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = finalValue.toLocaleString('es-CO');
      }
    }

    requestAnimationFrame(update);
  }

  /**
   * Inicializa modales de acciones rápidas (Nueva Reserva y Mi Perfil)
   */
  function setupQuickActions(user) {
    // Modal de Mi Perfil
    const profileModalEl = document.getElementById('profileModal');
    if (profileModalEl) {
      profileModalEl.addEventListener('show.bs.modal', () => {
        document.getElementById('profileModalName').textContent = user.nombre || 'No registrado';
        document.getElementById('profileModalEmail').textContent = user.correo || 'No registrado';
        document.getElementById('profileModalRole').textContent = user.rol === 'admin' ? 'Administrador del Sistema' : 'Usuario Estándar / Cliente';
        document.getElementById('profileModalId').textContent = user.id || 'N/A';
      });
    }

    // Modal de Nueva Reserva
    const newReservationForm = document.getElementById('newReservationForm');
    if (newReservationForm) {
      newReservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceSelect = document.getElementById('resService');
        const dateInput = document.getElementById('resDate');

        if (!serviceSelect.value || !dateInput.value) {
          alert('Por favor selecciona un servicio y una fecha.');
          return;
        }

        // Guardar reserva de prueba en localStorage
        const storedReservations = JSON.parse(localStorage.getItem(window.SRAuth.STORAGE_KEYS.RESERVATIONS_DB) || '[]');
        storedReservations.push({
          id: 'res-' + Date.now(),
          usuario: user.correo,
          servicio: serviceSelect.value,
          fecha: dateInput.value,
          estado: 'Confirmada'
        });
        localStorage.setItem(window.SRAuth.STORAGE_KEYS.RESERVATIONS_DB, JSON.stringify(storedReservations));

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('newReservationModal'));
        if (modal) modal.hide();

        newReservationForm.reset();

        // Mostrar notificación de éxito
        if (dashboardAlert) {
          dashboardAlert.className = 'alert alert-success alert-dismissible fade show mb-4';
          dashboardAlert.innerHTML = `
            <strong>¡Reserva registrada con éxito!</strong> El servicio <em>${serviceSelect.value}</em> fue reservado para la fecha indicada.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          `;
          dashboardAlert.classList.remove('d-none');
        }

        // Recargar contadores
        loadDashboardTotals();
      });
    }
  }
});
