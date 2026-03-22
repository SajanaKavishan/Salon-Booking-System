const express = require('express');
const mongoose = require('mongoose'); 
const dns = require('dns');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));

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
