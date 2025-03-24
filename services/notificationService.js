const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../config/logger');

class NotificationService {
    constructor(socketService) {
        this.socketService = socketService;
    }

    async createNotification(recipientId, title, message, type = 'info', link = null, metadata = null) {
        try {
            const notification = new Notification({
                recipient: recipientId,
                title,
                message,
                type,
                link,
                metadata
            });

            await notification.save();

            // Emit real-time notification
            this.socketService.emitToUser(recipientId, 'new_notification', notification);

            return notification;
        } catch (error) {
            logger.error('Error creating notification:', error);
            throw error;
        }
    }

    async broadcastNotification(title, message, type = 'info', link = null, metadata = null) {
        try {
            // Get all active users
            const users = await User.find({ isActive: true });
            let sentCount = 0;
            let failedCount = 0;

            // Create notifications for each user
            for (const user of users) {
                try {
                    await this.createNotification(
                        user._id,
                        title,
                        message,
                        type,
                        link,
                        metadata
                    );
                    sentCount++;
                } catch (error) {
                    logger.error(`Error sending notification to user ${user._id}:`, error);
                    failedCount++;
                }
            }

            return { sentCount, failedCount };
        } catch (error) {
            logger.error('Error broadcasting notification:', error);
            throw error;
        }
    }

    async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { isRead: true },
                { new: true }
            );

            if (!notification) {
                throw new Error('Notification not found');
            }

            return notification;
        } catch (error) {
            logger.error('Error marking notification as read:', error);
            throw error;
        }
    }

    async markAllAsRead(userId) {
        try {
            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );
        } catch (error) {
            logger.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    async getUnreadCount(userId) {
        try {
            return await Notification.countDocuments({
                recipient: userId,
                isRead: false
            });
        } catch (error) {
            logger.error('Error getting unread notification count:', error);
            throw error;
        }
    }

    async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const notifications = await Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const total = await Notification.countDocuments({ recipient: userId });

            return {
                notifications,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            logger.error('Error getting user notifications:', error);
            throw error;
        }
    }

    async deleteNotification(notificationId, userId) {
        try {
            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                recipient: userId
            });

            if (!notification) {
                throw new Error('Notification not found');
            }

            return notification;
        } catch (error) {
            logger.error('Error deleting notification:', error);
            throw error;
        }
    }
}

module.exports = NotificationService; 