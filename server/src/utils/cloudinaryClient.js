const cloudinary = require('cloudinary').v2;
const config = require('../config/env');
const fs = require('fs');

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
});

/**
 * Upload a file to Cloudinary for knowledge base storage.
 * @param {Buffer|string} fileBuffer - File buffer or local path
 * @param {string} fileName - Original filename (used as public_id)
 * @returns {Promise<Object>} { url, public_id, secure_url }
 */
async function uploadToCloudinary(fileBuffer, fileName) {
  const publicId = fileName.replace(/\.[^.]+$/, ''); // Remove extension

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'medical-knowledge-base',
        public_id: publicId,
        type: 'upload',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    if (Buffer.isBuffer(fileBuffer)) {
      stream.end(fileBuffer);
    } else {
      fs.createReadStream(fileBuffer).pipe(stream);
    }
  });
}

/**
 * Delete a file from Cloudinary.
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'auto',
  });
}

/**
 * Get a signed URL for a Cloudinary file (optional, for expiring links).
 * @param {string} publicId - Cloudinary public ID
 * @param {number} expirySeconds - URL expiry in seconds (default: never)
 * @returns {string} Signed URL
 */
function getSignedUrl(publicId, expirySeconds = null) {
  return cloudinary.url(publicId, {
    sign_url: expirySeconds ? true : false,
    type: 'upload',
    resource_type: 'auto',
    expires_at: expirySeconds ? Math.floor(Date.now() / 1000) + expirySeconds : undefined,
  });
}

/**
 * Check if Cloudinary is configured.
 * @returns {boolean}
 */
function isConfigured() {
  return !!(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getSignedUrl,
  isConfigured,
  cloudinary, // Export raw client for advanced usage
};
