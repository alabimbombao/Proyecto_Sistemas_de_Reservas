const User = require('../models/User');

// HUS-03 — Dashboard Stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalStandardUsers = await User.countDocuments({ role: 'user' });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalAdmins,
                totalStandardUsers,
                totalServices: 5,
                totalReservations: 12
            },
            requestedBy: {
                id: req.user.id,
                role: req.user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error al obtener estadísticas del dashboard',
            error: error.message
        });
    }
};

