const Reservation = require('../models/Reservation');

// Crear una reserva
exports.createReservation = async (req, res) => {
    try {
        const { serviceName, date, timeSlot } = req.body;

        // Validación de que serviceName no esté vacío y sea un string
        if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) {
            return res.status(400).json({
                message: 'El nombre del servicio es obligatorio y debe ser un texto válido'
            });
        }

        // Validación de que date sea una fecha válida
        if (!date || isNaN(new Date(date).getTime())) {
            return res.status(400).json({
                message: 'La fecha de la reserva debe ser válida'
            });
        }

        // Validación de que timeSlot no esté vacío y sea un string
        if (!timeSlot || typeof timeSlot !== 'string' || !timeSlot.trim()) {
            return res.status(400).json({
                message: 'El horario es obligatorio y debe ser un texto válido'
            });
        }

        const newReservation = new Reservation({
            user: req.user.id, // ID extraído del token JWT por el middleware protect
            serviceName: serviceName.trim(),
            date: new Date(date),
            timeSlot: timeSlot.trim()
        });

        await newReservation.save();
        res.status(201).json({ message: 'Reserva creada exitosamente', reservation: newReservation });
    } catch (error) {
        res.status(400).json({ message: 'Error al crear la reserva', error: error.message });
    }
};

// Obtener reservas del usuario autenticado o todas si es admin
exports.getReservations = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role !== 'admin') {
            filter.user = req.user.id;
        }

        const reservations = await Reservation.find(filter).populate('user', 'name email');
        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las reservas', error: error.message });
    }
};

// Cancelar / Actualizar estado de reserva
exports.updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const reservation = await Reservation.findById(id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }

        // Validar permisos si no es admin y la reserva no le pertenece
        if (req.user.role !== 'admin' && reservation.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'No autorizado para modificar esta reserva' });
        }

        reservation.status = status || reservation.status;
        await reservation.save();

        res.status(200).json({ message: 'Estado de reserva actualizado', reservation });
    } catch (error) {
        res.status(400).json({ message: 'Error al actualizar reserva', error: error.message });
    }
};