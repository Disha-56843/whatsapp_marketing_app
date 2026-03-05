// import express from "express";
// import {
//   createCampaign,
//   getCampaigns,
//   getCampaignById,
//   sendCampaign,
//   updateCampaignStatus,
//   logMessage,
//   getCampaignStats,
//   deleteCampaign
// } from "../controllers/campaignController.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";


// const router = express.Router();

// // Campaign CRUD routes
// router.post("/", authMiddleware, createCampaign);           // Create campaign
// router.get("/", authMiddleware, getCampaigns);              // Get all campaigns
// router.get("/:id", authMiddleware, getCampaignById);        // Get single campaign
// router.delete("/:id", authMiddleware, deleteCampaign);      // Delete campaign

// // Campaign sending routes
// router.post("/:id/send", authMiddleware, sendCampaign);     // Start sending
// router.patch("/:id/status", authMiddleware, updateCampaignStatus); // Update status
// router.get("/:id/stats", authMiddleware, getCampaignStats); // Get statistics

// // Message logging route (called by mobile app)
// router.post("/log-message", authMiddleware, logMessage);    // Log each message

// export default router;

import express from "express";
import {
  createCampaign, getCampaigns, getCampaignById,
  sendCampaign, updateCampaignStatus, logMessage,
  getCampaignStats, deleteCampaign,
} from "../controllers/campaignController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateCampaign, validateMongoId } from "../middleware/validators.js";

const router = express.Router();

router.use(authMiddleware); // All campaign routes require auth

router.post("/", validateCampaign, createCampaign);
router.get("/", getCampaigns);
router.post("/log-message", logMessage);         // BEFORE /:id routes
router.get("/:id", validateMongoId, getCampaignById);
router.delete("/:id", validateMongoId, deleteCampaign);
router.post("/:id/send", validateMongoId, sendCampaign);
router.patch("/:id/status", validateMongoId, updateCampaignStatus);
router.get("/:id/stats", validateMongoId, getCampaignStats);

export default router;