const mongoose = require('mongoose');
const logger = require('./logger');

// MongoDB connection options
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 5000,
    family: 4, // Use IPv4, skip trying IPv6
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    w: 'majority',
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
};

// Construct MongoDB URI with authentication if credentials are provided
const getMongoUri = () => {
    const {
        MONGODB_URI,
        MONGODB_USER,
        MONGODB_PASSWORD,
        MONGODB_AUTH_SOURCE
    } = process.env;

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    if (MONGODB_USER && MONGODB_PASSWORD) {
        const uri = new URL(MONGODB_URI);
        uri.username = MONGODB_USER;
        uri.password = MONGODB_PASSWORD;
        uri.searchParams.set('authSource', MONGODB_AUTH_SOURCE || 'admin');
        return uri.toString();
    }

    return MONGODB_URI;
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        const uri = getMongoUri();
        
        // Set mongoose debug mode in development
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

        // Connect to MongoDB
        await mongoose.connect(uri, options);
        
        logger.info('MongoDB connected successfully');

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
            setTimeout(connectDB, 5000);
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected successfully');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                logger.error('Error during MongoDB connection closure:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
        throw error;
    }
};

module.exports = {
    connectDB,
    mongoose
}; 