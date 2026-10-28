const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El usuario es obligatorio']
    },
    serviceName: {
        type: String,
        required: [true, 'El nombre del servicio es obligatorio'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'La fecha de la reserva es obligatoria']
    },
    timeSlot: {
        type: String,
        required: [true, 'El horario es obligatorio']
    },
    status: {
        type: String,
        enum: ['pendiente', 'confirmada', 'cancelada'],
        default: 'pendiente'
    }
}, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);