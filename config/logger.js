const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs'); 

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) { 
    fs.mkdirSync(logsDir, { mode: 0o750 }); // Set directory permissions to 750
}

// Custom format to filter sensitive data
const sensitiveDataFilter = format((info) => {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    const filteredInfo = { ...info };
    
    // Filter sensitive data from message
    if (filteredInfo.message) {
        sensitiveFields.forEach(field => {
            const regex = new RegExp(`${field}["']?\\s*[:=]\\s*["'][^"']*["']`, 'gi');
            filteredInfo.message = filteredInfo.message.replace(regex, `${field}=[FILTERED]`);
        });
    }

    // Filter sensitive data from metadata
    if (filteredInfo.metadata) {
        sensitiveFields.forEach(field => {
            if (filteredInfo.metadata[field]) {
                filteredInfo.metadata[field] = '[FILTERED]';
            }
        });
    }

    return filteredInfo;
});

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});

// Configure log rotation
const logRotationConfig = {
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    createSymlink: true,
    symlinkName: 'latest.log',
    auditFile: path.join(logsDir, 'audit.json'),
    auditHashType: 'sha256'
};

// Create the logger
const logger = createLogger({
    format: combine(
        timestamp(),
        sensitiveDataFilter(),
        json()
    ),
    transports: [
        // Error log rotation
        new DailyRotateFile({
            ...logRotationConfig,
            filename: path.join(logsDir, 'error-%DATE%.log'),
            level: 'error',
            zippedArchive: true,
            maxSize: '10m',
            maxFiles: '30d'
        }),
        // Combined log rotation
        new DailyRotateFile({
            ...logRotationConfig,
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            zippedArchive: true
        })
    ],
    // Prevent logging of uncaught exceptions and unhandled rejections
    exitOnError: false
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            timestamp(),
            sensitiveDataFilter(),
            consoleFormat
        )
    }));
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    // Don't exit the process in production
    if (process.env.NODE_ENV === 'production') {
        return;
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason.message,
        stack: reason.stack,
        promise: promise,
        timestamp: new Date().toISOString()
    });
    // Don't exit the process in production
    if (process.env.NODE_ENV === 'production') {
        return;
    }
    process.exit(1);
});

module.exports = logger; 