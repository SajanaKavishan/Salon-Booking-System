const express = require('express');
const mongoose = require('mongoose'); 
const dns = require('dns');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const User = require('./models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();

mongoose.set('bufferCommands', false);

const mongoOptions = { 
    family: 4,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
};

mongoose.connection.on('connected', () => { // This event is emitted when Mongoose successfully connects to the MongoDB server
    console.log('Mongoose connection established.');
});

mongoose.connection.on('error', (error) => { // This event is emitted when there's an error in the Mongoose connection
    console.log('Mongoose connection error:', error.message);
});

mongoose.connection.on('disconnected', () => { // This event is emitted when Mongoose disconnects from the MongoDB server
    console.log('Mongoose disconnected.');
});

app.use(cors());
app.use(express.json());

async function ensureMongoConnection(req, res, next) { // Middleware function to ensure MongoDB connection is active before processing API requests
    if (mongoose.connection.readyState === 1) {
        return next();
    }

    const reconnected = await connectMongo();
    if (!reconnected) {
        return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again.' });
    }

    next();
}

// Routes
app.use('/api/auth', ensureMongoConnection, require('./routes/authRoutes'));
app.use('/api/users', ensureMongoConnection, require('./routes/userRoutes')); // User registration and management routes
app.use('/api/appointments', ensureMongoConnection, require('./routes/appointmentRoutes')); // Appointment booking and management routes
app.use('/api/services', ensureMongoConnection, require('./routes/serviceRoutes')); // Service management routes
app.use('/api/staff', ensureMongoConnection, require('./routes/staffRoutes')); // Staff management routes
app.use('/api/messages', ensureMongoConnection, require('./routes/messageRoutes')); // Contact form message handling routes
app.post('/api/login', async (req, res) => { // User login route to authenticate users and provide JWT tokens for session management
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

async function connectMongo() { // Function to establish a connection to MongoDB with error handling and DNS fallback
    if (!process.env.MONGO_URI) {
        console.log('MongoDB connection skipped: MONGO_URI is not set.');
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        console.log('MongoDB Connected Successfully!');
        return true;
    } catch (err) {
        // Some local DNS resolvers reject SRV queries used by mongodb+srv.
        if (err && err.code === 'ECONNREFUSED' && err.syscall === 'querySrv') {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
            try {
                await mongoose.connect(process.env.MONGO_URI, mongoOptions);
                console.log('MongoDB Connected Successfully! (using fallback DNS)');
                return true;
            } catch (retryErr) {
                console.log('MongoDB Connection Error (after DNS fallback): ', retryErr);
                return false;
            }
        }

        console.log('MongoDB Connection Error: ', err);
        return false;
    }
}

app.get('/', (req, res) => { // Basic route to check if the server is running
    res.send('Salon Management API is running!');
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    const isMongoConnected = await connectMongo();

    if (!isMongoConnected) {
        console.log('Server startup aborted: MongoDB is not connected.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`✅ Server is running on port ${PORT}`);
    });
}

startServer();
