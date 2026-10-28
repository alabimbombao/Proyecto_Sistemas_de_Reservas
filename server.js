const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes'); //importar rutas
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const reservationRoutes = require('./routes/reservationRoutes');

dotenv.config();

connectDB(); 

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); //vinculacion de las rutas de las API's
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reservations', reservationRoutes);

app.get('/', (req, res) => {
    res.send('API del Sistema de Reservas funcionando correctamente');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});