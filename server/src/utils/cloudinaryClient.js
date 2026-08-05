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

// `resource_type: 'auto'` is an UPLOAD-only convenience — the destroy endpoint
// needs the concrete type, and silently reports "not found" when given 'auto'.
// PDFs/TXT land under `raw`, JPEG/PNG under `image`.
const DESTROY_RESOURCE_TYPES = ['image', 'raw', 'video'];

/** Read the resource type back out of a stored delivery URL, if it has one. */
function resourceTypeFromUrl(url) {
  const match = /\/(image|raw|video)\/upload\//.exec(String(url || ''));
  return match ? match[1] : null;
}

/**
 * Delete a file from Cloudinary.
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} [options]
 * @param {string} [options.resourceType] - 'image' | 'raw' | 'video' when known
 * @param {string} [options.url] - stored delivery URL, used to infer the type
 * @returns {Promise<Object>} Cloudinary's result, plus the resource_type used
 */
async function deleteFromCloudinary(publicId, options = {}) {
  const known = options.resourceType || resourceTypeFromUrl(options.url);
  // Without a hint, try each type: destroy on the wrong one is a no-op.
  const candidates = known ? [known] : DESTROY_RESOURCE_TYPES;

  let last = null;
  for (const resourceType of candidates) {
    // eslint-disable-next-line no-await-in-loop -- stop at the first type that matches
    last = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    if (last?.result === 'ok') return { ...last, resource_type: resourceType };
  }

  return last || { result: 'not found' };
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
  resourceTypeFromUrl,
  getSignedUrl,
  isConfigured,
  cloudinary, // Export raw client for advanced usage
};
