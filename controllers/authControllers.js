const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// HUS-02 — Registro de usuario

exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Esta direccion de correo ya existe' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        user = new User({
            name,
            email,
            password: hashedPassword
        });
        
        await user.save();
        
        res.status(201).json({ message: 'Usuario registrado correctamente' });
        
    }   catch (error) {
        res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message});
    }
};

// HUS-01 — Inicio de Sesion 

exports.login = async (req, res) => {
    const {email, password } = req.body;

    try {
        const user = await  User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Credenciales invalidas (Correo no encontrado)' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales invalidas (Contraseña incorrecta)' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h'}
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
