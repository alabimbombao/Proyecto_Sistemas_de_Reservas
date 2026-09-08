const DASHBOARD_API = "http://localhost:3000/api";

function showDashboardAlert(message, type = "danger") {
  const alert = document.getElementById("dashboardAlert");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.classList.remove("d-none");
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

async function loadDashboard() {
  const token = localStorage.getItem("token");
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("navbarUser").textContent = user.nombre || user.correo || "Usuario";

  try {
    // Endpoint requerido por Sprint 1: GET /api/dashboard/totals
    const response = await fetch(`${DASHBOARD_API}/dashboard/totals`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("No se pudieron cargar los indicadores.");

    const totals = await response.json();
    document.getElementById("totalUsers").textContent = totals.totalUsuarios ?? totals.users ?? 0;
    document.getElementById("totalServices").textContent = totals.totalServicios ?? totals.services ?? 0;
    document.getElementById("totalReservations").textContent = totals.totalReservas ?? totals.reservations ?? 0;
  } catch (error) {
    // Datos de demostración para validar visualmente el frontend.
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("totalServices").textContent = "0";
    document.getElementById("totalReservations").textContent = "0";
  }
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
});

loadDashboard();
