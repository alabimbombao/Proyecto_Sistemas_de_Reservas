# Sistema de Reservas — Frontend Sprint 1

Frontend desarrollado para el **Sprint 1** con **Bootstrap 5.3**, HTML5 semántico, Vanilla CSS y JavaScript moderno, cumpliendo las historias de usuario **HUS-01**, **HUS-02** y **HUS-03**.

---

## 🚀 Módulos Implementados

### 1. Módulo de Login (HUS-01) — `index.html`
- **UI/UX moderna**: Diseño centrado con Bootstrap 5, paleta de colores corporativa y tipografía Plus Jakarta Sans.
- **Validaciones de formulario**: Correo electrónico con validación de formato RFC y contraseña con validación de longitud mínima (8 caracteres).
- **Visibilidad de contraseña**: Alternador interactivo para ver/ocultar contraseña (👁️ / 🙈).
- **Protección contra ataques por fuerza bruta**:
  - Conteo de intentos fallidos.
  - Bloqueo automático de 60 segundos tras 3 intentos erróneos consecutivos con contador regresivo persistente.
- **Autenticación dual (API + LocalStorage)**:
  - Consulta al endpoint `POST http://localhost:5000/api/auth/login`.
  - Fallback transparente a base de datos de prueba en `localStorage` si el backend aún no está iniciado.
- **Almacenamiento de sesión**: Token JWT guardado en `localStorage` y redirección inmediata a `dashboard.html`.

### 2. Módulo de Registro (HUS-02) — `registro.html`
- **Formulario completo**: Nombre completo, correo electrónico, contraseña y confirmación de contraseña.
- **Medidor visual de fortaleza de contraseña**:
  - Barra de progreso reactiva con 3 niveles (Débil, Media, Fuerte).
  - Checklist en tiempo real que valida: longitud (>=8), mayúscula, minúscula, número y carácter especial.
- **Validación de correo único**: Detecta si el correo ya está registrado antes de enviar.
- **Widget Anti-Bot / reCAPTCHA**: Casilla de verificación interactiva requerida para prevenir registros automáticos.
- **Términos y condiciones**: Checkbox de aceptación obligatoria con modal interactivo de lectura rápida.
- **Feedback y redirección asistida**: Mensaje de bienvenida tras el registro y redirección al login con el correo prellenado.

### 3. Módulo de Dashboard (HUS-03) — `dashboard.html`
- **Guard de autenticación**: Redirige al login (`index.html`) si no existe un token o sesión válida.
- **Header superior y perfil**:
  - Saludo personalizado (*"¡Hola, [Nombre]! 👋"*).
  - Badge de rol (*Administrador* vs *Cliente*).
  - Indicador de estado de sincronización (*Modo API (En línea)* vs *Modo Local (localStorage)*).
- **Sidebar de navegación responsiva**: Persistente en escritorio y colapsable (Offcanvas) en dispositivos móviles. Menús dinámicos adaptados según los permisos del rol.
- **Tarjetas estadísticas con animación de conteo**:
  - **Total Usuarios**
  - **Total Servicios**
  - **Total Reservas**
  - Consulta a `GET http://localhost:5000/api/dashboard/totals` con cabecera `Authorization: Bearer <token>`, con cálculo dinámico en `localStorage` en modo offline.
- **Acciones rápidas interactivas**:
  - Modal para registrar una nueva reserva de prueba (actualiza los totales en tiempo real).
  - Modal para consultar los datos de la cuenta activa.
  - Cierre de sesión seguro con modal de confirmación y limpieza de tokens.

### 4. Módulo de Gestión de Usuarios (HUS-04) — `users.html`
- **Encabezado interactivo**: Título de sección, contador dinámico de usuarios, barra de búsqueda en vivo y botón `+ Nuevo Usuario`.
- **Filtros avanzados**: Búsqueda por texto (nombre, correo) y filtrado selectivo por Rol (*Administrador* / *Cliente*) y Estado (*Activo* / *Inactivo*).
- **Tabla responsiva**: Visualización optimizada con avatares con iniciales, badges de rol y badges de estado (#16A34A para Activo y #DC2626 para Inactivo).
- **Modal de Formulario `#userModal`**: Crear y editar usuarios con campos: Nombre Completo, Correo Electrónico, Rol, Estado y Contraseña.
- **Modal de Confirmación `#deleteUserModal`**: Diálogo de confirmación destructiva para prevenir eliminaciones accidentales.
- **CRUD REST**: Consumo de `GET /api/users`, `POST /api/users`, `PUT /api/users/:id`, `DELETE /api/users/:id` con token JWT y fallback a `localStorage`.

### 5. Módulo de Catálogo de Servicios (HUS-05) — `services.html`
- **Layout en Tarjetas (Cards Grid)**: Cuadrícula responsiva de 3 columnas en escritorio (`col-12 col-md-6 col-lg-4`).
- **Información completa por tarjeta**: Nombre del servicio, badge temático de categoría, duración en minutos con ícono (`⏱️ X min`), tarifa formateada en moneda (`$XX.XXX`), badge de disponibilidad y botones de acción (Editar ✏️ y Eliminar 🗑️).
- **Filtros reactivos**: Barra de búsqueda por texto, filtro dinámico por categoría y filtro por disponibilidad (*Disponible* / *No Disponible*).
- **Modal de Servicio `#serviceModal`**: Creación y edición con validaciones estrictas (`Precio > 0` y `Duración > 0`).
- **Modal de Confirmación `#deleteServiceModal`**: Diálogo de confirmación para eliminar servicios del catálogo.
- **CRUD REST**: Consumo de `GET /api/services`, `POST /api/services`, `PUT /api/services/:id`, `DELETE /api/services/:id` con token JWT y fallback a `localStorage`.

---

## 🔑 Credenciales Demo de Prueba

Para probar el sistema sin necesidad de registrarse previamente ni encender el servidor backend:

| Perfil | Correo Electrónico | Contraseña | Rol |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@sistema.com` | `AdminPassword123!` | Administrador |
| **Cliente / Usuario** | `carlos@ejemplo.com` | `UserPassword123!` | Cliente |

*(En `index.html` se incluye además un botón desplegable con 1 clic para cargar estas credenciales de forma instantánea).*

---

## 📁 Estructura del Proyecto

```
frontend/frontend-sprint1-bootstrap/
├── css/
│   ├── bootstrap.min.css         # Bootstrap 5.3 oficial local (soporte sin internet)
│   └── styles.css                # Sistema de diseño, tokens, animaciones y componentes
├── js/
│   ├── bootstrap.bundle.min.js   # Bootstrap JS oficial con Popper
│   ├── auth.js                   # Módulo central de autenticación, JWT, roles, API y localStorage
│   ├── login.js                  # Lógica del formulario de inicio de sesión y bloqueo
│   ├── registro.js               # Lógica del formulario de registro y validador de fortaleza
│   ├── dashboard.js              # Guard de sesión, métricas animadas y acciones del panel
│   ├── users.js                  # Controlador CRUD de Usuarios (HUS-04)
│   └── services.js               # Controlador CRUD de Servicios (HUS-05)
├── index.html                    # Pantalla de Login (HUS-01)
├── registro.html                 # Pantalla de Registro (HUS-02)
├── dashboard.html                # Pantalla de Dashboard (HUS-03)
├── users.html                    # Pantalla de Gestión de Usuarios (HUS-04)
├── services.html                 # Pantalla de Catálogo de Servicios (HUS-05)
└── README.md                     # Documentación técnica del Frontend
```

---

## ⚙️ Conexión con Backend (Endpoints Consumidos)
- **Base URL configurada**: `http://localhost:5000/api`
- **Endpoints de Autenticación y Métricas**:
  - `POST /api/auth/register` (envía `nombre`, `correo`, `password`)
  - `POST /api/auth/login` (envía `correo`, `password`)
  - `GET /api/dashboard/stats` / `GET /api/dashboard/totals` (envía `Authorization: Bearer <token>`)
- **Endpoints de Gestión de Usuarios (HUS-04)**:
  - `GET /api/users`
  - `POST /api/users`
  - `PUT /api/users/:id`
  - `DELETE /api/users/:id`
- **Endpoints de Catálogo de Servicios (HUS-05)**:
  - `GET /api/services`
  - `POST /api/services`
  - `PUT /api/services/:id`
  - `DELETE /api/services/:id`
