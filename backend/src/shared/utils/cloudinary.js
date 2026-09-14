const cloudinary = require("cloudinary").v2;
const { config } = require("../../config");
const logger = require("../../config/logger");

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

function uploadBuffer(buffer, options = {}) {
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
