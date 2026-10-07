const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// HUS-02 — Registro de usuario
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({ message: 'El correo es obligatorio' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({ message: 'El formato del correo es inválido' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        }

        let userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'Esta direccion de correo ya existe' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: role && ['user', 'admin'].includes(role) ? role : 'user'
        });

        await user.save();

        res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
    }
};

// HUS-01 — Inicio de Sesión
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !email.trim() || !password) {
            return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }

        const secret = process.env.JWT_SECRET || 'secret_key_reservas_dev';
        const token = jwt.sign(
            { id: user._id, role: user.role },
            secret,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
    }
};

