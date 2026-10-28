# Sistema de Reservas

## 1. Nombre del proyecto
Proyecto_Sistemas_de_Reservas

## 2. Descripción
Sistema backend RESTful diseñado para la gestión integral de reservas, autenticación de usuarios y administración de servicios, desarrollado bajo una arquitectura MVC robusta.

## 3. Integrantes
- Juan Camilo López Rua
- Sergio Andres Sarmiento Velasquez
- Julian Felipe Remolina Ardila

## 4. Tecnologías
- **Runtime:** Node.js
- **Framework:** Express
- **Base de Datos:** MongoDB (Mongoose)
- **Autenticación:** JSON Web Tokens (JWT), bcryptjs
- **Entorno:** dotenv

## 5. Arquitectura
Se sigue el patrón **MVC (Model-View-Controller)**:
- `/controllers`: Lógica de negocio y manejo de peticiones.
- `/models`: Esquemas de datos (MongoDB/Mongoose).
- `/routes`: Definición de endpoints API.
- `/middleware`: Control de seguridad y autorización por roles.
- `/config`: Configuración de conexión a base de datos.

## 6. Instalación
```bash
# Clonar el repositorio
git clone <url-repo>

# Instalar dependencias
npm install

# Iniciar servidor en modo desarrollo
npm run dev

# Ejecutar pruebas
npm test
```

## 7. Variables de entorno
Crea un archivo `.env` en la raíz con las siguientes variables:
- `PORT=5000`
- `MONGO_URI=mongodb://localhost:27017/reservas`
- `JWT_SECRET=tu_clave_secreta_aqui`

## 8. Endpoints
Consulte la documentación detallada en [API_DOCS.md](API_DOCS.md).

## 9. Historias de usuario
- **HUS-01:** Inicio de Sesión (Login)
- **HUS-02:** Registro de usuario
- **HUS-03:** Panel de estadísticas (Dashboard)
- **HUS-04:** CRUD de Usuarios
- **HUS-05:** CRUD de Servicios
- **Sprint 3:** Gestión de Reservas (Creación, Listado, Actualización de estados)

## 10. GitHub Project
https://github.com/users/alabimbombao/projects/1

## 11. GitHub Actions
Integración continua configurada para validar los cambios en cada PR.

## 12. Evidencias
- Pruebas unitarias de endpoints disponibles vía `npm test`.
- Código fuente documentado y repositorio sincronizado.
