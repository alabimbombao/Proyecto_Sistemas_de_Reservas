/**
 * registro.js — Controlador del Módulo de Registro de Usuario (HUS-02)
 * Proyecto: Sistema de Reservas - Sprint 1
 */

document.addEventListener('DOMContentLoaded', () => {
  // Redirigir al dashboard si ya hay sesión activa
  if (window.SRAuth) {
    window.SRAuth.redirectIfAuthenticated();
  }

  const form = document.getElementById('registerForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const termsCheckbox = document.getElementById('terms');
  const captchaCheckbox = document.getElementById('captchaCheck');
  const submitBtn = document.getElementById('registerSubmitBtn') || form.querySelector('button[type="submit"]');
  const alertContainer = document.getElementById('registerAlert');

  // Botones de mostrar/ocultar contraseña
  const togglePassBtn = document.getElementById('toggleRegisterPassword');
  const toggleConfirmPassBtn = document.getElementById('toggleConfirmPassword');

  // Elementos del indicador de contraseña
  const strengthBar = document.getElementById('passwordStrength');
  const strengthHint = document.getElementById('passwordHint');
  const reqLength = document.getElementById('reqLength');
  const reqUpper = document.getElementById('reqUpper');
  const reqLower = document.getElementById('reqLower');
  const reqNumber = document.getElementById('reqNumber');
  const reqSymbol = document.getElementById('reqSymbol');

  // 1. Toggles de visibilidad de contraseñas
  setupPasswordToggle(togglePassBtn, passwordInput);
  setupPasswordToggle(toggleConfirmPassBtn, confirmPasswordInput);

  function setupPasswordToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPass = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPass ? 'text' : 'password');
      btn.innerHTML = isPass ? '🙈' : '👁️';
      btn.setAttribute('aria-label', isPass ? 'Ocultar contraseña' : 'Mostrar contraseña');
    });
  }

  // 2. Monitoreo en vivo de fortaleza de contraseña
  passwordInput.addEventListener('input', () => {
    evaluatePasswordStrength(passwordInput.value);
    if (confirmPasswordInput.value) {
      validatePasswordMatch();
    }
  });

  confirmPasswordInput.addEventListener('input', () => {
    validatePasswordMatch();
  });

  // Validaciones al desenfocar campos
  nameInput.addEventListener('blur', validateNameField);
  emailInput.addEventListener('blur', validateEmailField);
  passwordInput.addEventListener('blur', () => {
    validatePasswordField();
    validatePasswordMatch();
  });
  confirmPasswordInput.addEventListener('blur', validatePasswordMatch);
  termsCheckbox.addEventListener('change', validateTermsField);
  if (captchaCheckbox) {
    captchaCheckbox.addEventListener('change', validateCaptchaField);
  }

  // 3. Envío del Formulario de Registro
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isNameValid = validateNameField();
    const isEmailValid = validateEmailField();
    const isPassValid = validatePasswordField();
    const isMatchValid = validatePasswordMatch();
    const isTermsValid = validateTermsField();
    const isCaptchaValid = validateCaptchaField();

    if (!isNameValid || !isEmailValid || !isPassValid || !isMatchValid || !isTermsValid || !isCaptchaValid) {
      showAlert('Por favor corrige los campos marcados en rojo antes de continuar.', 'danger');
      return;
    }

    setLoading(true);
    hideAlert();

    const userData = {
      nombre: nameInput.value.trim(),
      correo: emailInput.value.trim().toLowerCase(),
      password: passwordInput.value,
      rol: 'usuario' // Rol predeterminado para nuevos registros
    };

    try {
      const result = await window.SRAuth.authRegister(userData);

      showAlert('🎉 <strong>¡Registro exitoso!</strong> Tu cuenta ha sido creada correctamente. Redirigiendo al inicio de sesión...', 'success');
      submitBtn.disabled = true;

      setTimeout(() => {
        window.location.href = `index.html?registered=${encodeURIComponent(userData.correo)}`;
      }, 1600);
    } catch (err) {
      showAlert(`⚠️ ${err.message || 'No fue posible registrar la cuenta.'}`, 'danger');
      setLoading(false);
    }
  });

  // Evaluador de Seguridad de la Contraseña
  function evaluatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    updateRequirementUI(reqLength, checks.length);
    updateRequirementUI(reqUpper, checks.upper);
    updateRequirementUI(reqLower, checks.lower);
    updateRequirementUI(reqNumber, checks.number);
    updateRequirementUI(reqSymbol, checks.symbol);

    const passedCount = Object.values(checks).filter(Boolean).length;

    if (!strengthBar || !strengthHint) return checks;

    strengthBar.className = 'progress-bar transition-all';

    if (password.length === 0) {
      strengthBar.style.width = '0%';
      strengthHint.textContent = 'Seguridad de contraseña';
      strengthHint.className = 'small text-secondary mt-1';
    } else if (passedCount <= 2) {
      strengthBar.style.width = '33%';
      strengthBar.classList.add('progress-bar-weak');
      strengthHint.textContent = 'Contraseña débil (faltan requisitos)';
      strengthHint.className = 'small text-danger fw-semibold mt-1';
    } else if (passedCount <= 4) {
      strengthBar.style.width = '66%';
      strengthBar.classList.add('progress-bar-medium');
      strengthHint.textContent = 'Contraseña media (casi lista)';
      strengthHint.className = 'small text-warning fw-semibold mt-1';
    } else {
      strengthBar.style.width = '100%';
      strengthBar.classList.add('progress-bar-strong');
      strengthHint.textContent = 'Contraseña segura y robusta ✅';
      strengthHint.className = 'small text-success fw-semibold mt-1';
    }

    return checks;
  }

  function updateRequirementUI(element, isValid) {
    if (!element) return;
    if (isValid) {
      element.className = 'requirement-item valid';
      element.querySelector('.check-icon').textContent = '✓';
    } else {
      element.className = 'requirement-item invalid';
      element.querySelector('.check-icon').textContent = '•';
    }
  }

  // Funciones de validación específicas
  function validateNameField() {
    const val = nameInput.value.trim();
    if (!val) {
      setInputError(nameInput, 'El nombre completo es obligatorio.');
      return false;
    } else if (val.length < 3) {
      setInputError(nameInput, 'El nombre debe tener al menos 3 caracteres.');
      return false;
    } else {
      setInputValid(nameInput);
      return true;
    }
  }

  function validateEmailField() {
    const val = emailInput.value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val) {
      setInputError(emailInput, 'El correo electrónico es obligatorio.');
      return false;
    } else if (!emailRegex.test(val)) {
      setInputError(emailInput, 'Ingresa un correo electrónico con formato válido.');
      return false;
    }

    // Verificar si ya existe en localStorage para dar feedback inmediato
    if (window.SRAuth) {
      const existing = window.SRAuth.findUserByEmail(val);
      if (existing) {
        setInputError(emailInput, 'Este correo ya se encuentra registrado. Utiliza otro o inicia sesión.');
        return false;
      }
    }

    setInputValid(emailInput);
    return true;
  }

  function validatePasswordField() {
    const val = passwordInput.value;
    const checks = evaluatePasswordStrength(val);
    const isValid = Object.values(checks).every(Boolean);

    if (!val) {
      setInputError(passwordInput, 'La contraseña es obligatoria.');
      return false;
    } else if (!isValid) {
      setInputError(passwordInput, 'La contraseña debe cumplir todos los requisitos de seguridad.');
      return false;
    } else {
      setInputValid(passwordInput);
      return true;
    }
  }

  function validatePasswordMatch() {
    const pass = passwordInput.value;
    const confirm = confirmPasswordInput.value;

    if (!confirm) {
      setInputError(confirmPasswordInput, 'Confirma tu contraseña.');
      return false;
    } else if (pass !== confirm) {
      setInputError(confirmPasswordInput, 'Las contraseñas no coinciden.');
      return false;
    } else {
      setInputValid(confirmPasswordInput);
      return true;
    }
  }

  function validateTermsField() {
    if (!termsCheckbox.checked) {
      termsCheckbox.classList.add('is-invalid');
      return false;
    } else {
      termsCheckbox.classList.remove('is-invalid');
      return true;
    }
  }

  function validateCaptchaField() {
    if (!captchaCheckbox) return true;
    const container = document.getElementById('captchaContainer');
    if (!captchaCheckbox.checked) {
      if (container) container.classList.add('border-danger');
      return false;
    } else {
      if (container) container.classList.remove('border-danger');
      return true;
    }
  }

  function setInputError(input, message) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    const feedback = input.closest('.mb-3')?.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = message;
  }

  function setInputValid(input) {
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
  }

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
        Creando cuenta...
      `;
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Registrarse';
    }
  }
});
