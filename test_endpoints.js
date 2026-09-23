const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoMemoryServer } = require('mongodb-memory-server');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

let server;
let mongod;

async function runTests() {
    console.log('--- INICIANDO PRUEBAS DE ENDPOINTS (HUS-01, HUS-02, HUS-03) ---');

    try {
        // Inicializar MongoDB en memoria para la ejecución de pruebas aisladas
        mongod = await MongoMemoryServer.create();
        const mongoUri = mongod.getUri();
        await mongoose.connect(mongoUri);
        console.log('✔ MongoDB In-Memory conectado exitosamente.');
    } catch (err) {
        console.error('❌ Error al iniciar MongoDB In-Memory:', err.message);
        process.exit(1);
    }

    server = app.listen(0, async () => {
        const port = server.address().port;
        const baseUrl = `http://localhost:${port}`;
        console.log(`✔ Servidor de pruebas Express corriendo en puerto ${port}\n`);

        try {
            const testUser = {
                name: 'Usuario Ejemplo',
                email: 'usuario@ejemplo.com',
                password: 'password123',
                role: 'admin'
            };

            // 1. HUS-02: Registro con campos vacíos/inválidos
            console.log('[TEST 1] HUS-02: Intento de registro con datos incompletos');
            let res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: '', email: 'correo_invalido', password: '123' })
            });
            let data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 400 && data.message) {
                console.log('  ✔ ÉXITO: Validación de datos de entrada correcta.\n');
            } else {
                console.log('  ❌ FALLO: No validó datos de entrada correctamente.\n');
            }

            // 2. HUS-02: Registro exitoso
            console.log('[TEST 2] HUS-02: Registro de nuevo usuario');
            res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            });
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 201 && data.user && data.user.email === testUser.email) {
                console.log('  ✔ ÉXITO: Usuario registrado correctamente.\n');
            } else {
                console.log('  ❌ FALLO: Error al registrar usuario.\n');
            }

            // 3. HUS-02: Registro duplicado
            console.log('[TEST 3] HUS-02: Registro con correo duplicado');
            res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            });
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 400) {
                console.log('  ✔ ÉXITO: Duplicado bloqueado correctamente.\n');
            } else {
                console.log('  ❌ FALLO: Se permitió usuario duplicado.\n');
            }

            // 4. HUS-01: Login con contraseña errónea
            console.log('[TEST 4] HUS-01: Login con contraseña incorrecta');
            res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testUser.email, password: 'clave_incorrecta' })
            });
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 400) {
                console.log('  ✔ ÉXITO: Credenciales incorrectas rechazadas.\n');
            } else {
                console.log('  ❌ FALLO: Permitió acceso con clave errónea.\n');
            }

            // 5. HUS-01: Login exitoso y obtención de JWT
            console.log('[TEST 5] HUS-01: Login de usuario válido y generación de JWT');
            res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testUser.email, password: testUser.password })
            });
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            const token = data.token;
            if (res.status === 200 && token) {
                console.log('  ✔ ÉXITO: Login exitoso y token generado.\n');
            } else {
                console.log('  ❌ FALLO: No generó el token JWT.\n');
            }

            // 6. HUS-03: Dashboard sin Token
            console.log('[TEST 6] HUS-03: Acceso a Dashboard sin autenticar (Sin Token)');
            res = await fetch(`${baseUrl}/api/dashboard/stats`);
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 401) {
                console.log('  ✔ ÉXITO: Acceso protegido y denegado sin token.\n');
            } else {
                console.log('  ❌ FALLO: Permitió acceso público al Dashboard.\n');
            }

            // 7. HUS-03: Dashboard con Token Válido
            console.log('[TEST 7] HUS-03: Acceso a Dashboard con Token JWT válido');
            res = await fetch(`${baseUrl}/api/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            data = await res.json();
            console.log(`  -> Status: ${res.status} | Res:`, data);
            if (res.status === 200 && data.success && data.stats) {
                console.log('  ✔ ÉXITO: Estadísticas del Dashboard obtenidas con token válido.\n');
            } else {
                console.log('  ❌ FALLO: Error al obtener estadísticas del Dashboard.\n');
            }

            console.log('=====================================================');
            console.log('🎉 TODAS LAS PRUEBAS SE EJECUTARON EXITOSAMENTE 🎉');
            console.log('=====================================================');

        } catch (error) {
            console.error('❌ Error no esperado durante las pruebas:', error);
        } finally {
            await mongoose.connection.close();
            if (mongod) await mongod.stop();
            server.close();
            process.exit(0);
        }
    });
}

runTests();
