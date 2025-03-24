const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redisService = require('../services/redisService');

router.get('/', async (req, res) => {
    try {
        // Check MongoDB connection
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
         
        // Check Redis connection
        const redisStatus = await redisService.client.ping() === 'PONG' ? 'connected' : 'disconnected';
        
        // Get memory usage
        const memoryUsage = process.memoryUsage();
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                mongodb: mongoStatus,
                redis: redisStatus
            },
            system: {
                uptime: process.uptime(),
                memory: {
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                    external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router; 