require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
// const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean'); 
const hpp = require('hpp');
const logger = require('./config/logger'); 
const path = require('path');
const SocketService = require('./services/socketService');
const errorHandler = require('./middleware/errorHandler');
const mongoose = require('mongoose');
const fs = require('fs').promises;

// Import models
require('./models/User');
require('./models/Vehicle');
require('./models/Block');
require('./models/ParkingSlot');
require('./models/ParkingRate');
require('./models/ParkingSession');
require('./models/Notification');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const parkingRateRoutes = require('./routes/parkingRates');
const blockRoutes = require('./routes/block');
const parkingSlotRoutes = require('./routes/parkingSlotRoutes');
const parkingSessionRoutes = require('./routes/parkingSession');
const vehicleRoutes = require('./routes/vehicleRoutes');
const { connectDB } = require('./config/database');
const fileUpload = require("express-fileupload");
const { cloudnairyconnect } = require("./utils/Cloudnary");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        credentials: true,
        maxAge: 14400,
    }
});

// Initialize Socket Service
const socketService = new SocketService(io);

// Configure file upload
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
}));

// Initialize Cloudinary
cloudnairyconnect();

// Make socketService available to routes and controllers
app.locals.socketService = socketService;

// Security middleware 
// helmet({
//     crossOriginResourcePolicy: false,
//   })
// app.use(helmet());
app.use(
    cors({
      origin: '*',
      credentials: true,
      maxAge: 14400,
    })
  );
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
// Rate limiting
// const limiter = rateLimit({
//     windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, 
//     max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000, 
//     message: 'Too many requests from this IP, please try again later.'
// });

// // Apply rate limiting to all routes
// app.use('/api/', limiter); 

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// // Data sanitization against XSS
// app.use(xss());

// // Prevent parameter pollution
// app.use(hpp({
//     whitelist: ['email', 'name'] // Parameters that can be duplicated
// }));

// Middleware
// app.use(compression());
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parking-rates', parkingRateRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/parking-slots', parkingSlotRoutes);
app.use('/api/parking-sessions', parkingSessionRoutes);
app.use('/api/vehicles', vehicleRoutes);

// app.use(
//     "/uploads/qrcodes",
//     express.static("uploads/qrcodes", {
//       setHeaders: (res) => {
//         res.setHeader("Access-Control-Allow-Origin", "*");
//       },
//     })
//   );
// helmet({
//     crossOriginResourcePolicy: false,
//   })
  
// // Serve static files from the React app
// app.use(express.static(path.join(__dirname, "client/build")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/qrcodes", express.static(path.join(__dirname, "uploads/qrcodes")));
require('dotenv').config();

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

// const ensureUploadsDirectory = async () => {
//     const uploadsDir = path.join(__dirname, 'uploads/qrcodes');
//     try {
//         await fs.access(uploadsDir);
//     } catch (error) {
//         await fs.mkdir(uploadsDir, { recursive: true });
//     }
// };

const startServer = async () => {
    try {
        // await ensureUploadsDirectory();
        await connectDB();
        
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();  