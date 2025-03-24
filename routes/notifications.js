const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const { body, validationResult } = require('express-validator');

// Validation middleware for admin notifications
const validateAdminNotification = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('type').isIn(['system', 'alert', 'info']).withMessage('Invalid notification type'),
    body('link').optional().isURL().withMessage('Invalid link URL'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

// Get user notifications with pagination
router.get('/', auth, async (req, res) => {
    try {
        const notificationService = new NotificationService(req.app.locals.socketService);
        const { page = 1, limit = 20 } = req.query;
        const result = await notificationService.getUserNotifications(
            req.user._id,
            parseInt(page),
            parseInt(limit)
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching notifications' });
    }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const notificationService = new NotificationService(req.app.locals.socketService);
        const count = await notificationService.getUnreadCount(req.user._id);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching unread count' });
    }
});

// Mark notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
    try {
        const notificationService = new NotificationService(req.app.locals.socketService);
        const notification = await notificationService.markAsRead(
            req.params.notificationId,
            req.user._id
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Error marking notification as read' });
    }
});

// Mark all notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
    try {
        const notificationService = new NotificationService(req.app.locals.socketService);
        await notificationService.markAllAsRead(req.user._id);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Error marking all notifications as read' });
    }
});

// Delete notification
router.delete('/:notificationId', auth, async (req, res) => {
    try {
        const notificationService = new NotificationService(req.app.locals.socketService);
        const notification = await notificationService.deleteNotification(
            req.params.notificationId,
            req.user._id
        );
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting notification' });
    }
});

// Admin Routes

// Send notification to specific user
router.post('/admin/send-to-user', 
    auth, 
    isAdmin,
    validateAdminNotification,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userId, title, message, type, link, metadata } = req.body;
            const notificationService = new NotificationService(req.app.locals.socketService);

            const notification = await notificationService.createNotification(
                userId,
                title,
                message,
                type,
                link,
                metadata
            );

            res.status(201).json({
                message: 'Notification sent successfully',
                notification
            });
        } catch (error) {
            res.status(500).json({ error: 'Error sending notification to user' });
        }
    }
);

// Broadcast notification to all users
router.post('/admin/broadcast',
    auth,
    isAdmin,
    validateAdminNotification,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { title, message, type, link, metadata } = req.body;
            const notificationService = new NotificationService(req.app.locals.socketService);

            const result = await notificationService.broadcastNotification(
                title,
                message,
                type,
                link,
                metadata
            );

            res.status(201).json({
                message: 'Notification broadcasted successfully',
                sentCount: result.sentCount,
                failedCount: result.failedCount
            });
        } catch (error) {
            res.status(500).json({ error: 'Error broadcasting notification' });
        }
    }
);

module.exports = router; 