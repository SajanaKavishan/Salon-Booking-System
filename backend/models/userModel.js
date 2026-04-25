const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enum: ['customer', 'staff', 'admin'],
        default: 'customer' 
    }
}, {
    timestamps: true 
});

const User = mongoose.model('User', userSchema);
module.exports = User;
