const express = require("express");
const mongoose = require("mongoose"); 
const dns = require("dns");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const { startHolidaySyncScheduler } = require("./services/holidaySyncService");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();

mongoose.set("bufferCommands", false);

const defaultClientUrl = process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:5173";
const allowedOrigins = (process.env.CLIENT_URL || defaultClientUrl)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    process.emitWarning(
        "CLIENT_URL is not configured in production. Browser requests with an Origin header will be rejected by CORS.",
        { code: "MISSING_CLIENT_URL" }
    );
}

const mongoOptions = { 
    family: 4,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
};

mongoose.connection.on("connected", () => { // This event is emitted when Mongoose successfully connects to the MongoDB server
    console.log("Mongoose connection established.");
});

mongoose.connection.on("error", (error) => { // This event is emitted when there's an error in the Mongoose connection
    console.log("Mongoose connection error:", error.message);
});

mongoose.connection.on("disconnected", () => { // This event is emitted when Mongoose disconnects from the MongoDB server
    console.log("Mongoose disconnected.");
});

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        const corsError = new Error("Not allowed by CORS");
        corsError.status = 403;
        return callback(corsError);
    },
    credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

async function ensureMongoConnection(req, res, next) { // Middleware function to ensure MongoDB connection is active before processing API requests
    if (mongoose.connection.readyState === 1) {
        return next();
    }

    const reconnected = await connectMongo();
    if (!reconnected) {
        return res.status(503).json({ message: "Database is temporarily unavailable. Please try again." });
    }

    next();
}

// Routes
app.use("/api/users", ensureMongoConnection, require("./routes/userRoutes")); // User registration and management routes
app.use("/api/appointments", ensureMongoConnection, require("./routes/appointmentRoutes")); // Appointment booking and management routes
app.use("/api/services", ensureMongoConnection, require("./routes/serviceRoutes")); // Service management routes
app.use("/api/staff", ensureMongoConnection, require("./routes/staffRoutes")); // Staff management routes
app.use("/api/messages", ensureMongoConnection, require("./routes/messageRoutes")); // Contact form message handling routes
app.use("/api/notifications", ensureMongoConnection, require("./routes/notificationRoutes")); // Notification handling routes
app.use("/api/settings", ensureMongoConnection, require("./routes/settingsRoutes")); // Salon settings routes
app.use("/api/gallery", ensureMongoConnection, require("./routes/galleryRoutes")); // Public gallery and admin gallery management routes
app.use("/api/holidays", ensureMongoConnection, require("./routes/holidayRoutes")); // Salon holidays and custom closure routes
app.use("/api/roster", ensureMongoConnection, require("./routes/rosterRoutes")); // Roster and Shifts routes
app.use("/api/leaves", ensureMongoConnection, require("./routes/leaveRoutes")); // Leave management routes
app.use("/api/dashboard", ensureMongoConnection, require("./routes/dashboardRoutes")); // Admin dashboard summary routes
app.use("/api/chatbot", ensureMongoConnection, require("./routes/chatRoutes")); // Public AI chatbot route

async function connectMongo() { // Function to establish a connection to MongoDB with error handling and DNS fallback
    if (!process.env.MONGO_URI) {
        console.log("MongoDB connection skipped: MONGO_URI is not set.");
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, mongoOptions);
        console.log("MongoDB Connected Successfully!");
        return true;
    } catch (err) {
        // Some local DNS resolvers reject SRV queries used by mongodb+srv.
        if (err && err.code === "ECONNREFUSED" && err.syscall === "querySrv") {
            dns.setServers(["8.8.8.8", "1.1.1.1"]);
            try {
                await mongoose.connect(process.env.MONGO_URI, mongoOptions);
                console.log("MongoDB Connected Successfully! (using fallback DNS)");
                return true;
            } catch (retryErr) {
                console.log("MongoDB Connection Error (after DNS fallback): ", retryErr);
                return false;
            }
        }

        console.log("MongoDB Connection Error: ", err);
        return false;
    }
}

app.get("/", (req, res) => { // Basic route to check if the server is running
    res.send("Salon Management API is running!");
});

app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;

    if (res.headersSent) {
        return next(err);
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    const isMongoConnected = await connectMongo();

    if (!isMongoConnected) {
        console.log("Server startup aborted: MongoDB is not connected.");
        process.exit(1);
    }

    app.listen(PORT, () => {
        startHolidaySyncScheduler();
        console.log(`[SUCCESS] Server is running on port ${PORT}`);
    });
}

startServer();
