import express from "express";
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  sendCampaign,
  updateCampaignStatus,
  logMessage,
  getCampaignStats,
  deleteCampaign
} from "../controllers/campaignController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";


const router = express.Router();

// Campaign CRUD routes
router.post("/", authMiddleware, createCampaign);           // Create campaign
router.get("/", authMiddleware, getCampaigns);              // Get all campaigns
router.get("/:id", authMiddleware, getCampaignById);        // Get single campaign
router.delete("/:id", authMiddleware, deleteCampaign);      // Delete campaign

// Campaign sending routes
router.post("/:id/send", authMiddleware, sendCampaign);     // Start sending
router.patch("/:id/status", authMiddleware, updateCampaignStatus); // Update status
router.get("/:id/stats", authMiddleware, getCampaignStats); // Get statistics

// Message logging route (called by mobile app)
router.post("/log-message", authMiddleware, logMessage);    // Log each message

export default router;