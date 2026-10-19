const cloudinary = require("cloudinary").v2;
const { config } = require("../../config");
const logger = require("../../config/logger");
const { validateFileBuffer, validateBase64Image } = require("./file-validator");

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

function uploadBuffer(buffer, options = {}) {
  // Validate magic bytes file signature before upload
  const allowedCategories = options.allowedCategories || ["image", "document"];
  validateFileBuffer(buffer, {
    originalName: options.originalName,
    allowedCategories,
    maxSizeBytes: options.maxSizeBytes || 10 * 1024 * 1024,
  });

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: "residentone",
      resource_type: "auto",
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error("Cloudinary upload error:", error);
        return reject(error);
      }
      resolve(result);
    });

    stream.end(buffer);
  });
}

async function uploadBase64(dataUri, options = {}) {
  // Validate magic bytes and payload size
  validateBase64Image(dataUri, {
    maxSizeBytes: options.maxSizeBytes || 5 * 1024 * 1024,
  });

  const uploadOptions = {
    folder: "residentone",
    resource_type: "auto",
    ...options,
  };
  return cloudinary.uploader.upload(dataUri, uploadOptions);
}

module.exports = {
  cloudinary,
  uploadBuffer,
  uploadBase64,
};
