const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const documentController = require("./document.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

const fileFilter = (req, file, cb) => {
  const allowed = /\.(pdf|png|jpg|jpeg|webp)$/i;
  const isAllowedExt = file.originalname && file.originalname.match(allowed);
  const isAllowedMime = file.mimetype && (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf" || file.mimetype === "application/octet-stream");
  if (!isAllowedExt && !isAllowedMime) {
    return cb(new Error("Only PDF and images (PNG, JPG, JPEG, WEBP) are allowed"), false);
  }
  cb(null, true);
};

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authenticate, resolveSocietyContext, requireSociety);

// All members can list and download
router.get("/", (req, res, next) => documentController.list(req, res, next));
router.get("/:id/download", (req, res, next) => documentController.download(req, res, next));

// Only permission holders can upload/update/delete
router.post("/", requirePermission("manage_documents"), memoryUpload.single("file"), (req, res, next) => documentController.create(req, res, next));
router.patch("/:id", requirePermission("manage_documents"), (req, res, next) => documentController.update(req, res, next));
router.delete("/:id", requirePermission("manage_documents"), (req, res, next) => documentController.remove(req, res, next));

// Multer error handler for this router
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, error: { code: "FILE_TOO_LARGE", message: "File too large. Max 10MB allowed (pdf/images only)" } });
    }
    return res.status(400).json({ success: false, error: { code: err.code, message: err.message } });
  }
  if (err && err.message && err.message.includes("Only PDF and images")) {
    return res.status(400).json({ success: false, error: { code: "INVALID_FILE", message: err.message } });
  }
  next(err);
});

module.exports = router;
