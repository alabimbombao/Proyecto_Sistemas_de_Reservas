const User = require('../models/User');

// HUS-03 — Dashboard

exports.getDashboardStats = async (req, res) => {
    try{
        const totalUsers = await User.countDocuments();
        res.json({
            totalUsers,
            totalServices: 5,
            totalReservations: 12
        });
    }catch (error) {
        res.status(500).json({
            message: 'error al obtener estadisticas del dashboard',
            error: error.message
        });
    }
};