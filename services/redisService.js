const Redis = require('redis');
const logger = require('../config/logger');

class RedisService {
    constructor() {
        this.client = Redis.createClient({
            url: process.env.REDIS_URL || 'redis://red-cvgogkiqgecs73f034o0:6379',
            password: process.env.REDIS_PASSWORD
        });

        this.client.on('error', (err) => {
            logger.error('Redis Client Error:', err);
        });

        this.client.on('connect', () => {
            logger.info('Redis Client Connected');
        });

        this.connect();
    }

    async connect() {
        try {
            await this.client.connect();
        } catch (error) {
            logger.error('Redis Connection Error:', error);
        }
    }

    async disconnect() {
        try {
            await this.client.disconnect();
        } catch (error) {
            logger.error('Redis Disconnection Error:', error);
        }
    }

    // OTP Operations
    async setOTP(email, otp, expirySeconds = 600) { // 10 minutes default
        try {
            const key = `otp:${email}`;
            await this.client.set(key, otp, { EX: expirySeconds });
            return true;
        } catch (error) {
            logger.error('Redis Set OTP Error:', error);
            throw error;
        }
    }

    async getOTP(email) {
        try {
            const key = `otp:${email}`;
            return await this.client.get(key);
        } catch (error) {
            logger.error('Redis Get OTP Error:', error);
            throw error;
        }
    }

    async deleteOTP(email) {
        try {
            const key = `otp:${email}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis Delete OTP Error:', error);
            throw error;
        }
    }

    // Rate Limiting
    async incrementRateLimit(key, windowSeconds = 60, maxRequests = 100) {
        try {
            const current = await this.client.incr(key);
            if (current === 1) {
                await this.client.expire(key, windowSeconds);
            }
            return current;
        } catch (error) {
            logger.error('Redis Rate Limit Error:', error);
            throw error;
        }
    }

    // Cache Operations
    async setCache(key, value, expirySeconds = 3600) { // 1 hour default
        try {
            await this.client.set(key, JSON.stringify(value), { EX: expirySeconds });
            return true;
        } catch (error) {
            logger.error('Redis Set Cache Error:', error);
            throw error;
        }
    }

    async getCache(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error('Redis Get Cache Error:', error);
            throw error;
        }
    }

    async deleteCache(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis Delete Cache Error:', error);
            throw error;
        }
    }

    // User Session Management
    async setUserSession(userId, sessionData, expirySeconds = 86400) { // 24 hours default
        try {
            const key = `session:${userId}`;
            await this.client.set(key, JSON.stringify(sessionData), { EX: expirySeconds });
            return true;
        } catch (error) {
            logger.error('Redis Set Session Error:', error);
            throw error;
        }
    }

    async getUserSession(userId) {
        try {
            const key = `session:${userId}`;
            const session = await this.client.get(key);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            logger.error('Redis Get Session Error:', error);
            throw error;
        }
    }

    async deleteUserSession(userId) {
        try {
            const key = `session:${userId}`;
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error('Redis Delete Session Error:', error);
            throw error;
        }
    }
}

module.exports = new RedisService(); 