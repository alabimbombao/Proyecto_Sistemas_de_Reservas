# Sistema de Reservas — Frontend Sprint 1

Frontend realizado con Bootstrap 5 para HUS-01, HUS-02 y HUS-03.

## Pantallas
- `index.html`: Login.
- `registro.html`: Registro.
- `dashboard.html`: Dashboard.

## Bootstrap
Se utiliza Bootstrap 5.3.3 mediante CDN.

## Backend esperado
- `POST /api/auth/register` (body: `name`, `email`, `password`)
- `POST /api/auth/login` (body: `email`, `password`)
- `GET /api/dashboard/stats` (response: `totalUsers`, `totalServices`, `totalReservations`)

La URL configurada es `http://localhost:5000/api`.

## Prueba sin backend
El frontend tiene un fallback con `localStorage` para poder probar las pantallas mientras el backend todavía está en desarrollo.

## Nota
En producción, las contraseñas no deben almacenarse en `localStorage`. El almacenamiento local aquí se usa únicamente como apoyo de desarrollo/prueba del Sprint 1.
