const API_BASE_URL = "http://localhost:3000/api";

function showAlert(elementId, message, type = "danger") {
  const alert = document.getElementById(elementId);
  if (!alert) return;
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.classList.remove("d-none");
}

function hideAlert(elementId) {
  const alert = document.getElementById(elementId);
  if (alert) alert.classList.add("d-none");
}

function setFieldState(input, valid) {
  input.classList.toggle("is-valid", valid);
  input.classList.toggle("is-invalid", !valid);
}

function passwordIsStrong(password) {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const password = document.getElementById("loginPassword");
  const toggle = document.getElementById("toggleLoginPassword");

  toggle.addEventListener("click", () => {
    const isPassword = password.type === "password";
    password.type = isPassword ? "text" : "password";
    toggle.textContent = isPassword ? "🙈" : "👁";
    toggle.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert("loginAlert");

    if (!loginForm.checkValidity()) {
      loginForm.classList.add("was-validated");
      return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const pass = password.value;

    try {
      // Cuando el backend esté disponible, esta petición usa POST /api/auth/login.
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, password: pass })
      });

      if (!response.ok) throw new Error("Credenciales incorrectas");

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || { correo: email }));
      window.location.href = "dashboard.html";
    } catch (error) {
      // Fallback para trabajar el frontend antes de tener el backend.
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find(u => u.correo === email && u.password === pass);

      if (user) {
        localStorage.setItem("token", "frontend-demo-token");
        localStorage.setItem("user", JSON.stringify(user));
        window.location.href = "dashboard.html";
      } else {
        showAlert("loginAlert", "Correo o contraseña incorrectos.");
      }
    }
  });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
  const password = document.getElementById("registerPassword");
  const confirm = document.getElementById("confirmPassword");
  const strength = document.getElementById("passwordStrength");
  const hint = document.getElementById("passwordHint");

  password.addEventListener("input", () => {
    const value = password.value;
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    strength.style.width = `${score * 20}%`;
    hint.textContent = score >= 5 ? "Contraseña segura" :
      score >= 3 ? "Contraseña media" : "Contraseña débil";
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert("registerAlert");

    const name = document.getElementById("fullName");
    const email = document.getElementById("registerEmail");
    const terms = document.getElementById("terms");

    const strong = passwordIsStrong(password.value);
    const same = password.value === confirm.value;

    setFieldState(password, strong);
    setFieldState(confirm, same);
    setFieldState(name, name.value.trim().length >= 3);
    setFieldState(email, email.validity.valid && email.value.trim() !== "");
    setFieldState(terms, terms.checked);

    if (!registerForm.checkValidity() || !strong || !same) {
      registerForm.classList.add("was-validated");
      return;
    }

    const newUser = {
      nombre: name.value.trim(),
      correo: email.value.trim(),
      password: password.value,
      rol: "usuario",
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "No fue posible registrar el usuario.");
      }

      showAlert("registerAlert", "Registro exitoso. Redirigiendo al login...", "success");
      setTimeout(() => window.location.href = "index.html", 1200);
    } catch (error) {
      // Fallback local para maquetación/pruebas del frontend.
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.some(u => u.correo.toLowerCase() === newUser.correo.toLowerCase())) {
        showAlert("registerAlert", "El correo ya está registrado.");
        return;
      }

      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      showAlert("registerAlert", "Registro exitoso. Redirigiendo al login...", "success");
      setTimeout(() => window.location.href = "index.html", 1200);
    }
  });
}
