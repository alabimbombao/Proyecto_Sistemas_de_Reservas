# Documentación de la API — Sistema de Reservas

Esta documentación detalla los endpoints REST disponibles para el sistema, abarcando las funcionalidades de **Autenticación, Gestión de Usuarios** y el **Módulo de Reservas (Sprint 3)**.

---

## Configuración Base

- **URL Base:** `http://localhost:5000/api`
- **Formato de Petición/Respuesta:** `application/json`
- **Autenticación:** Las rutas protegidas requieren un token JWT generado mediante el inicio de sesión. Debe enviarse en el encabezado HTTP de la siguiente manera:
  ```http
  Authorization: Bearer <TU_TOKEN_JWT>
  ```

---

## 1. Módulo de Autenticación (`/api/auth`)

### 1.1 Registrar Usuario
Permite registrar un nuevo usuario en el sistema.

- **Método:** `POST`
- **Endpoint:** `/api/auth/register`
- **Autenticación:** Pública (No requiere token)
- **Cuerpo de Petición (JSON):**
  ```json
  {
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "password": "password123",
    "role": "user"
  }
  ```
  *(Nota: El rol por defecto es `user`. Los roles permitidos son `user` y `admin`).*

- **Códigos de Respuesta:**
  - `201 Created`: Usuario registrado exitosamente.
    ```json
    {
      "message": "Usuario registrado correctamente",
      "user": {
        "id": "671e...abc",
        "name": "Juan Pérez",
        "email": "juan.perez@example.com",
        "role": "user"
      }
    }
    ```
  - `400 Bad Request`: Faltan campos obligatorios, formato de correo inválido, contraseña menor a 6 caracteres o correo ya existente.

---

### 1.2 Iniciar Sesión (Login)
Autentica al usuario y genera un token JWT de acceso válido por 8 horas.

- **Método:** `POST`
- **Endpoint:** `/api/auth/login`
- **Autenticación:** Pública
- **Cuerpo de Petición (JSON):**
  ```json
  {
    "email": "juan.perez@example.com",
    "password": "password123"
  }
  ```

- **Códigos de Respuesta:**
  - `200 OK`: Inicio de sesión exitoso. Retorna el token JWT.
    ```json
    {
      "message": "Inicio de sesión exitoso",
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "671e...abc",
        "name": "Juan Pérez",
        "email": "juan.perez@example.com",
        "role": "user"
      }
    }
    ```
  - `400 Bad Request`: Credenciales inválidas (correo no encontrado o contraseña incorrecta).

---

## 2. Módulo de Reservas (`/api/reservations`)

### 2.1 Crear Reserva
Permite a un usuario autenticado registrar una nueva reserva para un servicio.

- **Método:** `POST`
- **Endpoint:** `/api/reservations`
- **Autenticación:** Requerida (`Bearer Token`)
- **Encabezados:**
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  Content-Type: application/json
  ```
- **Cuerpo de Petición (JSON):**
  ```json
  {
    "serviceName": "Cancha de Fútbol 5",
    "date": "2026-11-15T18:00:00.000Z",
    "timeSlot": "18:00 - 19:00"
  }
  ```

- **Códigos de Respuesta:**
  - `201 Created`: Reserva creada exitosamente.
    ```json
    {
      "message": "Reserva creada exitosamente",
      "reservation": {
        "user": "671e...abc",
        "serviceName": "Cancha de Fútbol 5",
        "date": "2026-11-15T18:00:00.000Z",
        "timeSlot": "18:00 - 19:00",
        "status": "pendiente",
        "_id": "672f...def",
        "createdAt": "2026-10-28T14:00:00.000Z",
        "updatedAt": "2026-10-28T14:00:00.000Z",
        "__v": 0
      }
    }
    ```
  - `400 Bad Request`: Datos incompletos o fecha inválida.
  - `401 Unauthorized`: Token no proporcionado, inválido o expirado.

---

### 2.2 Consultar Reservas
Retorna la lista de reservas. Si el usuario es `admin`, retorna **todas** las reservas del sistema con los datos del cliente poblados. Si el usuario es estándar (`user`), retorna **únicamente** las reservas de su autoría.

- **Método:** `GET`
- **Endpoint:** `/api/reservations`
- **Autenticación:** Requerida (`Bearer Token`)
- **Encabezados:**
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  ```

- **Códigos de Respuesta:**
  - `200 OK`: Lista de reservas obtenida correctamente.
    ```json
    [
      {
        "_id": "672f...def",
        "user": {
          "_id": "671e...abc",
          "name": "Juan Pérez",
          "email": "juan.perez@example.com"
        },
        "serviceName": "Cancha de Fútbol 5",
        "date": "2026-11-15T18:00:00.000Z",
        "timeSlot": "18:00 - 19:00",
        "status": "pendiente",
        "createdAt": "2026-10-28T14:00:00.000Z",
        "updatedAt": "2026-10-28T14:00:00.000Z",
        "__v": 0
      }
    ]
    ```
  - `401 Unauthorized`: Token no proporcionado o inválido.
  - `500 Internal Server Error`: Error del servidor al consultar.

---

### 2.3 Actualizar Estado de Reserva
Permite actualizar el estado de una reserva (`pendiente`, `confirmada`, `cancelada`). Los usuarios estándar solo pueden modificar sus propias reservas; los administradores pueden gestionar cualquiera.

- **Método:** `PUT`
- **Endpoint:** `/api/reservations/:id`
- **Autenticación:** Requerida (`Bearer Token`)
- **Encabezados:**
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsIn...
  Content-Type: application/json
  ```
- **Cuerpo de Petición (JSON):**
  ```json
  {
    "status": "confirmada"
  }
  ```
  *(Valores permitidos para `status`: `pendiente`, `confirmada`, `cancelada`).*

- **Códigos de Respuesta:**
  - `200 OK`: Estado de reserva actualizado con éxito.
    ```json
    {
      "message": "Estado de reserva actualizado",
      "reservation": {
        "_id": "672f...def",
        "user": "671e...abc",
        "serviceName": "Cancha de Fútbol 5",
        "date": "2026-11-15T18:00:00.000Z",
        "timeSlot": "18:00 - 19:00",
        "status": "confirmada",
        "createdAt": "2026-10-28T14:00:00.000Z",
        "updatedAt": "2026-10-28T14:15:00.000Z",
        "__v": 0
      }
    }
    ```
  - `400 Bad Request`: Error de validación al actualizar.
  - `401 Unauthorized`: Token no proporcionado o inválido.
  - `403 Forbidden`: No autorizado para modificar reservas ajenas (si no es admin).
  - `404 Not Found`: Reserva no encontrada.

---
*Documentación generada para el Sistema de Gestión de Reservas — ADSO.*
