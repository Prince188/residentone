const { AppError } = require("./errors");

// Dangerous extensions that must never be permitted regardless of claimed mime-type
const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bash", "php", "phtml", "php3", "php4", "php5", "phps",
  "pl", "cgi", "py", "pyc", "js", "jsp", "asp", "aspx", "dll", "scr", "vbs", "msi",
  "jar", "html", "htm", "shtml", "xhtml", "svg", "xml", "bin", "com"
]);

/**
 * Detects the real file format by inspecting its cryptographic magic bytes (file signature)
 * @param {Buffer} buffer
 * @returns {{ ext: string, mime: string, category: 'image' | 'document' } | null}
 */
function detectFileTypeFromBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // 1. JPEG / JPG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: "jpg", mime: "image/jpeg", category: "image" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 && // P
    buffer[2] === 0x4E && // N
    buffer[3] === 0x47 && // G
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { ext: "png", mime: "image/png", category: "image" };
  }

  // 3. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp", category: "image" };
  }

  // 4. PDF: %PDF (25 50 44 46)
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF") {
    return { ext: "pdf", mime: "application/pdf", category: "document" };
  }

  return null;
}

/**
 * Checks for double-extension spoofing (e.g. malware.php.jpg or exploit.exe.png)
 * @param {string} originalName
 */
function hasDoubleExtension(originalName) {
  if (!originalName || typeof originalName !== "string") return false;
  const parts = originalName.toLowerCase().split(".").filter(Boolean);
  if (parts.length <= 1) return false;
  // If any preceding part is a known executable/script extension
  for (let i = 0; i < parts.length - 1; i++) {
    if (DANGEROUS_EXTENSIONS.has(parts[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Validates a file buffer before processing or uploading to cloud storage
 * @param {Buffer} buffer
 * @param {Object} options
 * @param {string} [options.originalName]
 * @param {string[]} [options.allowedCategories=['image']] - 'image' and/or 'document'
 * @param {number} [options.maxSizeBytes=10*1024*1024]
 */
function validateFileBuffer(buffer, options = {}) {
  const {
    originalName = "",
    allowedCategories = ["image"],
    maxSizeBytes = 10 * 1024 * 1024,
  } = options;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError("Empty or invalid file buffer provided", 400);
  }

  if (buffer.length > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new AppError(`File exceeds maximum allowed size of ${maxMb}MB`, 400);
  }

  // Check double-extension tricks
  if (originalName && hasDoubleExtension(originalName)) {
    throw new AppError("Suspicious file name detected (nested executable extensions are blocked)", 400);
  }

  // Magic bytes inspection
  const detected = detectFileTypeFromBuffer(buffer);
  if (!detected) {
    throw new AppError("File content validation failed. The file format is not a genuine image or supported document.", 400);
  }

  if (!allowedCategories.includes(detected.category)) {
    throw new AppError(`Uploaded file type (.${detected.ext}) is not permitted for this action. Allowed: ${allowedCategories.join(", ")}`, 400);
  }

  return detected;
}

/**
 * Decodes and validates base64 image data URIs
 * @param {string} dataUri
 * @param {Object} options
 */
function validateBase64Image(dataUri, options = {}) {
  const { maxSizeBytes = 5 * 1024 * 1024 } = options;

  if (typeof dataUri !== "string" || !dataUri.trim()) {
    throw new AppError("Invalid or empty base64 image data", 400);
  }

  // Extract raw base64 string
  let base64String = dataUri;
  const match = dataUri.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
  if (match) {
    base64String = match[1];
  }

  const buffer = Buffer.from(base64String, "base64");
  if (buffer.length === 0) {
    throw new AppError("Corrupted base64 image payload", 400);
  }

  return validateFileBuffer(buffer, {
    allowedCategories: ["image"],
    maxSizeBytes,
  });
}

module.exports = {
  detectFileTypeFromBuffer,
  hasDoubleExtension,
  validateFileBuffer,
  validateBase64Image,
};
