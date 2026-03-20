import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  sendCampaign,
  uploadCampaignMedia,
  updateCampaignStatus,
  logMessage,
  getCampaignStats,
  deleteCampaign
} from "../controllers/campaignController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";


const router = express.Router();
const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({ storage });

// Campaign CRUD routes
router.post("/", authMiddleware, createCampaign);           // Create campaign
router.get("/", authMiddleware, getCampaigns);              // Get all campaigns
router.get("/:id", authMiddleware, getCampaignById);        // Get single campaign
router.delete("/:id", authMiddleware, deleteCampaign);      // Delete campaign
router.post("/upload-media", authMiddleware, upload.single("media"), uploadCampaignMedia);

// Campaign sending routes
router.post("/:id/send", authMiddleware, sendCampaign);     // Start sending
router.patch("/:id/status", authMiddleware, updateCampaignStatus); // Update status
router.get("/:id/stats", authMiddleware, getCampaignStats); // Get statistics

// Message logging route (called by mobile app)
router.post("/log-message", authMiddleware, logMessage);    // Log each message

export default router;
