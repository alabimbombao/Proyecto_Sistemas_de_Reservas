const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET || 'secret_key_reservas_dev';
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({ message: 'No autorizado, token inválido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, token no proporcionado' });
    }
};

module.exports = { protect };
