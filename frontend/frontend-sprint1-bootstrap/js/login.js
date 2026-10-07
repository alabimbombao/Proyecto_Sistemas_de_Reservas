/**
 * login.js — Controlador del Módulo de Login (HUS-01)
 * Proyecto: Sistema de Reservas - Sprint 1
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirigir al dashboard si ya hay sesión iniciada
  if (window.SRAuth) {
    window.SRAuth.redirectIfAuthenticated();
  }

  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggleLoginPassword');
  const submitBtn = document.getElementById('loginSubmitBtn') || form.querySelector('button[type="submit"]');
  const alertContainer = document.getElementById('loginAlert');

  let lockoutInterval = null;

  // 1. Mostrar/Ocultar Contraseña
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePasswordBtn.innerHTML = isPassword ? '🙈' : '👁️';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }

  // 2. Prellenar correo si viene de registro exitoso
  const urlParams = new URLSearchParams(window.location.search);
  const registeredEmail = urlParams.get('registered') || localStorage.getItem(window.SRAuth?.STORAGE_KEYS?.LAST_REGISTERED_EMAIL);
  if (registeredEmail && emailInput) {
    emailInput.value = registeredEmail;
    showAlert('¡Tu cuenta ha sido creada exitosamente! Por favor ingresa tu contraseña para iniciar sesión.', 'success');
    if (passwordInput) passwordInput.focus();
    // Limpiar el último registrado para evitar confusiones futuras
    if (window.SRAuth?.STORAGE_KEYS?.LAST_REGISTERED_EMAIL) {
      localStorage.removeItem(window.SRAuth.STORAGE_KEYS.LAST_REGISTERED_EMAIL);
    }
  }

  // 3. Revisar estado de bloqueo al escribir o cambiar el correo
  emailInput.addEventListener('input', () => {
    checkEmailLockout(emailInput.value);
  });
  emailInput.addEventListener('blur', () => {
    validateEmailField();
    checkEmailLockout(emailInput.value);
  });
  passwordInput.addEventListener('blur', () => {
    validatePasswordField();
  });

  // 4. Envío del Formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isEmailValid = validateEmailField();
    const isPasswordValid = validatePasswordField();

    if (!isEmailValid || !isPasswordValid) {
      showAlert('Por favor completa todos los campos requeridos con un formato válido.', 'danger');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Verificar si ya está bloqueado
    const lockoutState = window.SRAuth.getLockoutState(email);
    if (lockoutState.isLocked) {
      startLockoutCountdown(lockoutState.remainingSeconds);
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const result = await window.SRAuth.authLogin(email, password);

      showAlert(`¡Bienvenido de nuevo, ${result.user.nombre || 'Usuario'}! Redirigiendo al panel...`, 'success');
      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 900);
    } catch (err) {
      showAlert(err.message || 'Error al iniciar sesión. Verifica tus credenciales.', 'danger');

      // Verificar si tras este intento se activó el bloqueo
      const updatedLockout = window.SRAuth.getLockoutState(email);
      if (updatedLockout.isLocked) {
        startLockoutCountdown(updatedLockout.remainingSeconds);
      }
    } finally {
      setLoading(false);
    }
  });

  // Funciones de validación
  function validateEmailField() {
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setInputError(emailInput, 'El correo electrónico es obligatorio.');
      return false;
    } else if (!emailRegex.test(value)) {
      setInputError(emailInput, 'Ingresa un correo electrónico con formato válido (ejemplo@dominio.com).');
      return false;
    } else {
      setInputValid(emailInput);
      return true;
    }
  }

  function validatePasswordField() {
    const value = passwordInput.value;
    if (!value) {
      setInputError(passwordInput, 'La contraseña es obligatoria.');
      return false;
    } else if (value.length < 8) {
      setInputError(passwordInput, 'La contraseña debe contener al menos 8 caracteres.');
      return false;
    } else {
      setInputValid(passwordInput);
      return true;
    }
  }

  function setInputError(input, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    const feedback = input.closest('.mb-3, .mb-4')?.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = message;
  }

  function setInputValid(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  }

  // Funciones de bloqueo
  function checkEmailLockout(email) {
    if (!email || !window.SRAuth) return;
    const state = window.SRAuth.getLockoutState(email);
    if (state.isLocked) {
      startLockoutCountdown(state.remainingSeconds);
    } else if (lockoutInterval) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
      submitBtn.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
    }
  }

  function startLockoutCountdown(seconds) {
    if (lockoutInterval) clearInterval(lockoutInterval);

    let remaining = seconds;
    submitBtn.disabled = true;
    passwordInput.disabled = true;

    const renderLockoutMsg = () => {
      showAlert(`🔒 <strong>Acceso bloqueado:</strong> Demasiados intentos fallidos. Intente nuevamente en <span class="lockout-badge">${remaining}s</span>.`, 'danger');
    };

    renderLockoutMsg();

    lockoutInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(lockoutInterval);
        lockoutInterval = null;
        submitBtn.disabled = false;
        passwordInput.disabled = false;
        showAlert('El bloqueo ha finalizado. Puedes volver a intentar iniciar sesión.', 'info');
      } else {
        renderLockoutMsg();
      }
    }, 1000);
  }

  // UI Helpers
  function showAlert(message, type = 'info') {
    if (!alertContainer) return;
    alertContainer.className = `alert alert-${type} fade-in mb-3`;
    alertContainer.innerHTML = message;
    alertContainer.classList.remove('d-none');
  }

  function hideAlert() {
    if (!alertContainer) return;
    alertContainer.classList.add('d-none');
    alertContainer.innerHTML = '';
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Iniciando sesión...
      `;
    } else {
      // Solo restaurar si no está bloqueado
      const email = emailInput.value.trim();
      const lock = window.SRAuth ? window.SRAuth.getLockoutState(email) : { isLocked: false };
      if (!lock.isLocked) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Iniciar Sesión';
      }
    }
  }
});
