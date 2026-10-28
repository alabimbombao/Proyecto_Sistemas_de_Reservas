const express = require('express');
const router = express.Router();
const {
    createReservation,
    getReservations,
    updateReservationStatus
} = require('../controllers/reservationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createReservation);
router.get('/', protect, getReservations);
router.put('/:id', protect, updateReservationStatus);

module.exports = router;