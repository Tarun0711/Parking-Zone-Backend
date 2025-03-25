const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

exports.uploadImageToCloudinary = async (file, folder = 'default', height, quality) => {
    try {
        let uploadSource;

        // Handle different input types
        if (Buffer.isBuffer(file)) {
            // If input is a buffer, create a temporary file
            const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}.png`);
            await fs.writeFile(tempFilePath, file);
            uploadSource = tempFilePath;
        } else if (typeof file === 'string' && file.startsWith('data:image')) {
            // If input is a base64 string
            uploadSource = file;
        } else if (file && file.tempFilePath) {
            // If input is a file object with tempFilePath
            uploadSource = file.tempFilePath;
        } else {
            throw new Error('Invalid file input: Must be a Buffer, base64 string, or file object with tempFilePath');
        }

        // Configure upload options
        const options = {
            folder,
            resource_type: "auto",
            ...(height && { height }),
            ...(quality && { quality })
        };

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(uploadSource, options);

        // Clean up temporary file if it was created from a buffer
        if (Buffer.isBuffer(file)) {
            await fs.unlink(uploadSource).catch(console.error);
        }

        if (!result?.secure_url) {
            throw new Error('Upload failed: No secure URL returned from Cloudinary');
        }

        return result;
    } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        throw new Error(`Failed to upload image: ${error.message}`);
    }
};