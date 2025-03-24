const healthRoutes = require('./routes/health');
const express = require('express');
const path = require('path');

const app = express();

// Health check route
app.use('/health', healthRoutes);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ... existing code ... 