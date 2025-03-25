const cloudinary = require('cloudinary').v2

exports.cloudnairyconnect = () => {
    try {
        // Check if required environment variables are present
        if (!process.env.CLOUD_NAME || !process.env.API_KEY || !process.env.API_SECRET) {
            throw new Error('Missing required Cloudinary environment variables');
        }

        cloudinary.config({
            cloud_name: process.env.CLOUD_NAME,
            api_key: process.env.API_KEY,
            api_secret: process.env.API_SECRET
        });

        console.log("Cloudinary connected successfully");
    } catch (error) {
        console.error("Error connecting to Cloudinary:", error.message);
        throw error; // Re-throw to handle it in the calling code
    }
}