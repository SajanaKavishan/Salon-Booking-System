const express = require('express');
const mongoose = require('mongoose'); 
const dns = require('dns');
const dotenv = require('dotenv');
const cors = require('cors');
const User = require('./models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.post('/api/login', async (req, res) => {
    try {
        // Capture email and password from the request body
        const { email, password } = req.body; 

        // Search for a user with the provided email in the database
        const user = await User.findOne({ email: email });

        // No user found with that email
        if (!user) {
            return res.status(404).json({ message: "No user found with this email." });
        }
       
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            // When all are correct, we can send back a success response with user info (except password)
            const token = jwt.sign(
                {id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.status(200).json({ 
                message: "Login successful!", 
                token: token,
                user: { id: user._id, email: user.email, name: user.name} 
            });
        } else {
            res.status(401).json({ message: "Invalid password!" });
        }

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server Error!" });
    }
});

async function connectMongo() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected Successfully!');
    } catch (err) {
        // Some local DNS resolvers reject SRV queries used by mongodb+srv.
        if (err && err.code === 'ECONNREFUSED' && err.syscall === 'querySrv') {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
            try {
                await mongoose.connect(process.env.MONGO_URI);
                console.log('MongoDB Connected Successfully! (using fallback DNS)');
                return;
            } catch (retryErr) {
                console.log('MongoDB Connection Error (after DNS fallback): ', retryErr);
                return;
            }
        }

        console.log('MongoDB Connection Error: ', err);
    }
}

connectMongo();

app.get('/', (req, res) => {
    res.send('Salon Management API is running!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
