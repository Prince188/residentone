const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const documentController = require("./document.controller");
const { authenticate, requireSociety } = require("../../middlewares/auth.middleware");
const { resolveSocietyContext } = require("../../middlewares/society.context.middleware");
const { requirePermission } = require("../../middlewares/permission.middleware");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../../uploads/documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    cb(null, `DOC-${Date.now()}-${safeName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];
  // Also allow by extension for some browsers
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
  if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and images (jpg, png, webp) are allowed (max 10MB)"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.use(authenticate, resolveSocietyContext, requireSociety);

// All members can list and download
router.get("/", (req, res, next) => documentController.list(req, res, next));
router.get("/:id/download", (req, res, next) => documentController.download(req, res, next));

// Only permission holders can upload/delete
router.post("/", requirePermission("manage_documents"), upload.single("file"), (req, res, next) => documentController.create(req, res, next));
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
