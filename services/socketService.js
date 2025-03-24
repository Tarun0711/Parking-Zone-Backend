const logger = require('../config/logger');

class SocketService {
    constructor(io) {
        this.io = io;
        this.userSockets = new Map(); // Map to store user ID to socket ID mapping
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`New client connected: ${socket.id}`);

            // Handle user authentication
            socket.on('authenticate', (userId) => {
                this.userSockets.set(userId, socket.id);
                logger.info(`User ${userId} authenticated on socket ${socket.id}`);
            });

            // Handle chat messages
            socket.on('chat message', (message) => {
                logger.info(`Message received from ${socket.id}: ${message}`);
                this.handleChatMessage(socket, message);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                // Remove user from mapping
                for (const [userId, socketId] of this.userSockets.entries()) {
                    if (socketId === socket.id) {
                        this.userSockets.delete(userId);
                        logger.info(`User ${userId} disconnected from socket ${socket.id}`);
                        break;
                    }
                }
            });

            // Handle errors
            socket.on('error', (error) => {
                logger.error(`Socket error for ${socket.id}:`, error);
            });
        });
    }

    handleChatMessage(socket, message) {
        // Broadcast the message to all connected clients
        this.io.emit('chat message', {
            id: socket.id,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    // Method to emit to specific user
    emitToUser(userId, event, data) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    // Method to emit to specific room
    emitToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }

    // Method to emit to all clients
    emitToAll(event, data) {
        this.io.emit(event, data);
    }
}

module.exports = SocketService; 