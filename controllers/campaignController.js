
// // import Campaign from "../models/campaignModel.js";
// // import MessageLog from "../models/messageLogModel.js";
// // import Contact from "../models/contactModel.js";

// // // NOTE: We'll import whatsappClient from server.js in a moment
// // // For now, we'll handle it differently

// // // Helper function to add delay
// // function sleep(ms) {
// //   return new Promise(resolve => setTimeout(resolve, ms));
// // }

// // // ============================================
// // // CREATE NEW CAMPAIGN
// // // ============================================
// // export const createCampaign = async (req, res) => {
// //   try {
// //     const { name, message, targetContacts, scheduledAt } = req.body;
// //     const userId = req.userId; // From auth middleware

// //     if (!name || !message) {
// //       return res.status(400).json({ 
// //         success: false,
// //         message: "Name and message are required" 
// //       });
// //     }

// //     const campaign = await Campaign.create({
// //       name,
// //       message,
// //       targetContacts: targetContacts || [],
// //       scheduledAt,
// //       owner: userId,
// //       status: 'draft'
// //     });

// //     res.status(201).json({ 
// //       success: true, 
// //       message: "Campaign created successfully", 
// //       campaign 
// //     });
// //   } catch (error) {
// //     console.error("Error creating campaign:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // GET ALL CAMPAIGNS FOR USER
// // // ============================================
// // export const getCampaigns = async (req, res) => {
// //   try {
// //     const userId = req.userId;
    
// //     const campaigns = await Campaign.find({ owner: userId })
// //       .populate('targetContacts', 'name phone')
// //       .sort({ createdAt: -1 });
    
// //     res.json({ 
// //       success: true, 
// //       campaigns 
// //     });
// //   } catch (error) {
// //     console.error("Error fetching campaigns:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // GET SINGLE CAMPAIGN BY ID
// // // ============================================
// // export const getCampaignById = async (req, res) => {
// //   try {
// //     const { id } = req.params;
    
// //     const campaign = await Campaign.findById(id)
// //       .populate('targetContacts', 'name phone');
    
// //     if (!campaign) {
// //       return res.status(404).json({ 
// //         success: false,
// //         message: "Campaign not found" 
// //       });
// //     }
    
// //     res.json({ 
// //       success: true, 
// //       campaign 
// //     });
// //   } catch (error) {
// //     console.error("Error fetching campaign:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // SEND CAMPAIGN (Important - this doesn't use whatsapp-web.js)
// // // Mobile app handles actual sending via native WhatsApp
// // // ============================================
// // export const sendCampaign = async (req, res) => {
// //   try {
// //     const { id } = req.params;
    
// //     const campaign = await Campaign.findById(id)
// //       .populate('targetContacts', 'name phone');
    
// //     if (!campaign) {
// //       return res.status(404).json({ 
// //         success: false,
// //         message: "Campaign not found" 
// //       });
// //     }

// //     if (campaign.status === 'sending') {
// //       return res.status(400).json({ 
// //         success: false,
// //         message: "Campaign is already being sent" 
// //       });
// //     }

// //     // Update campaign status to sending
// //     campaign.status = 'sending';
// //     await campaign.save();

// //     // Note: The actual message sending happens on the mobile app
// //     // The app will call this endpoint to get campaign data
// //     // and then send messages via native WhatsApp

// //     res.json({ 
// //       success: true, 
// //       message: "Campaign data ready for sending", 
// //       campaign,
// //       totalContacts: campaign.targetContacts.length 
// //     });

// //   } catch (error) {
// //     console.error("Error preparing campaign:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // UPDATE CAMPAIGN STATUS (Called by mobile app)
// // // ============================================
// // export const updateCampaignStatus = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { status, stats } = req.body;

// //     const campaign = await Campaign.findById(id);
    
// //     if (!campaign) {
// //       return res.status(404).json({ 
// //         success: false,
// //         message: "Campaign not found" 
// //       });
// //     }

// //     // Update status
// //     if (status) {
// //       campaign.status = status;
// //     }

// //     // Update stats if provided
// //     if (stats) {
// //       campaign.stats = {
// //         ...campaign.stats,
// //         ...stats
// //       };
// //     }

// //     await campaign.save();

// //     res.json({ 
// //       success: true, 
// //       message: "Campaign updated successfully",
// //       campaign 
// //     });

// //   } catch (error) {
// //     console.error("Error updating campaign:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // LOG MESSAGE (Called by mobile app after each send)
// // // ============================================
// // export const logMessage = async (req, res) => {
// //   try {
// //     const { campaignId, contactId, status, error } = req.body;

// //     // Create message log
// //     const messageLog = await MessageLog.create({
// //       campaignId,
// //       contactId,
// //       status: status || 'sent',
// //       type: 'outgoing',
// //       error: error || null,
// //       timestamp: new Date()
// //     });

// //     // Update campaign stats
// //     const campaign = await Campaign.findById(campaignId);
    
// //     if (campaign) {
// //       if (status === 'sent' || status === 'delivered') {
// //         campaign.stats.sent += 1;
// //       } else if (status === 'failed') {
// //         campaign.stats.failed += 1;
// //       }
// //       await campaign.save();
// //     }

// //     res.json({ 
// //       success: true, 
// //       message: "Message logged successfully",
// //       log: messageLog 
// //     });

// //   } catch (error) {
// //     console.error("Error logging message:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // GET CAMPAIGN STATISTICS
// // // ============================================
// // export const getCampaignStats = async (req, res) => {
// //   try {
// //     const { id } = req.params;
    
// //     const campaign = await Campaign.findById(id)
// //       .populate('targetContacts', 'name phone');
    
// //     if (!campaign) {
// //       return res.status(404).json({ 
// //         success: false,
// //         message: "Campaign not found" 
// //       });
// //     }
    
// //     // Get message logs for this campaign
// //     const messages = await MessageLog.find({ campaignId: id })
// //       .populate('contactId', 'name phone')
// //       .sort({ timestamp: -1 });
    
// //     const stats = {
// //       total: campaign.targetContacts.length,
// //       sent: campaign.stats.sent,
// //       delivered: campaign.stats.delivered || 0,
// //       failed: campaign.stats.failed,
// //       pending: campaign.targetContacts.length - campaign.stats.sent - campaign.stats.failed
// //     };
    
// //     res.json({ 
// //       success: true, 
// //       campaign, 
// //       stats, 
// //       messages 
// //     });
// //   } catch (error) {
// //     console.error("Error fetching campaign stats:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // DELETE CAMPAIGN
// // // ============================================
// // export const deleteCampaign = async (req, res) => {
// //   try {
// //     const { id } = req.params;
    
// //     const campaign = await Campaign.findById(id);
    
// //     if (!campaign) {
// //       return res.status(404).json({ 
// //         success: false,
// //         message: "Campaign not found" 
// //       });
// //     }
    
// //     // Delete associated message logs
// //     await MessageLog.deleteMany({ campaignId: id });
    
// //     // Delete campaign
// //     await campaign.deleteOne();
    
// //     res.json({ 
// //       success: true, 
// //       message: "Campaign deleted successfully" 
// //     });
// //   } catch (error) {
// //     console.error("Error deleting campaign:", error);
// //     res.status(500).json({ 
// //       success: false,
// //       message: "Server error", 
// //       error: error.message 
// //     });
// //   }
// // };

// // // ============================================
// // // EXPORT ALL FUNCTIONS
// // // ============================================
// // // Make sure all functions are exported!
// // export default {
// //   createCampaign,
// //   getCampaigns,
// //   getCampaignById,
// //   sendCampaign,
// //   updateCampaignStatus,
// //   logMessage,
// //   getCampaignStats,
// //   deleteCampaign
// // };
// import Campaign from "../models/campaignModel.js";
// import MessageLog from "../models/messageLogModel.js";
// import Contact from "../models/contactModel.js";

// // ============================================
// // CREATE NEW CAMPAIGN
// // ============================================
// export const createCampaign = async (req, res) => {
//   try {
//     const {
//       name,
//       message,
//       targetContacts,
//       scheduledAt,
//       mediaPath,
//       mediaType
//     } = req.body;
//     const userId = req.userId; // From auth middleware

//     console.log('📥 POST /campaigns');
//     console.log('Name:', name);
//     console.log('Message:', message);
//     console.log('Target Contacts:', targetContacts?.length);
//     console.log('User ID:', userId);

//     if (!name || !message) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Name and message are required" 
//       });
//     }

//     if (!targetContacts || targetContacts.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one contact is required"
//       });
//     }

//     // Verify contacts exist and belong to user
//     const contacts = await Contact.find({
//       _id: { $in: targetContacts },
//       owner: userId
//     });

//     if (contacts.length !== targetContacts.length) {
//       return res.status(400).json({
//         success: false,
//         message: `Found ${contacts.length} contacts out of ${targetContacts.length} requested`
//       });
//     }

//     const campaign = await Campaign.create({
//       name,
//       message,
//       targetContacts,
//       scheduledAt,
//       mediaPath,
//       mediaType,
//       owner: userId,
//       status: 'draft',
//       stats: {
//         sent: 0,
//         delivered: 0,
//         read: 0,
//         failed: 0
//       }
//     });

//     console.log('✅ Campaign created:', campaign._id);

//     res.status(201).json({ 
//       success: true, 
//       message: "Campaign created successfully", 
//       campaign 
//     });
//   } catch (error) {
//     console.error("❌ Error creating campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // GET ALL CAMPAIGNS FOR USER
// // ============================================
// export const getCampaigns = async (req, res) => {
//   try {
//     const userId = req.userId;
    
//     console.log('📥 GET /campaigns - User:', userId);
    
//     const campaigns = await Campaign.find({ owner: userId })
//       .populate('targetContacts', 'name phone')
//       .sort({ createdAt: -1 });
    
//     console.log(`✅ Found ${campaigns.length} campaigns`);
    
//     // Return campaigns directly as array (not wrapped in object)
//     res.json(campaigns);
    
//   } catch (error) {
//     console.error("❌ Error fetching campaigns:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // GET SINGLE CAMPAIGN BY ID
// // ============================================
// export const getCampaignById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.userId;
    
//     const campaign = await Campaign.findOne({
//       _id: id,
//       owner: userId
//     }).populate('targetContacts', 'name phone');
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }
    
//     res.json({ 
//       success: true, 
//       campaign 
//     });
//   } catch (error) {
//     console.error("❌ Error fetching campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // SEND CAMPAIGN
// // ============================================
// export const sendCampaign = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.userId;
    
//     const campaign = await Campaign.findOne({
//       _id: id,
//       owner: userId
//     }).populate('targetContacts', 'name phone');
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }

//     if (campaign.status === 'sending') {
//       return res.status(400).json({ 
//         success: false,
//         message: "Campaign is already being sent" 
//       });
//     }

//     // Update campaign status
//     campaign.status = 'sending';
//     await campaign.save();

//     console.log('✅ Campaign status updated to sending');

//     res.json({ 
//       success: true, 
//       message: "Campaign data ready for sending", 
//       campaign,
//       totalContacts: campaign.targetContacts.length 
//     });

//   } catch (error) {
//     console.error("❌ Error preparing campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // UPDATE CAMPAIGN STATUS
// // ============================================
// export const updateCampaignStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, stats } = req.body;
//     const userId = req.userId;

//     const campaign = await Campaign.findOne({
//       _id: id,
//       owner: userId
//     });
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }

//     if (status) {
//       campaign.status = status;
//     }

//     if (stats) {
//       campaign.stats = {
//         ...campaign.stats,
//         ...stats
//       };
//     }

//     await campaign.save();

//     res.json({ 
//       success: true, 
//       message: "Campaign updated successfully",
//       campaign 
//     });

//   } catch (error) {
//     console.error("❌ Error updating campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // LOG MESSAGE
// // ============================================
// export const logMessage = async (req, res) => {
//   try {
//     const { campaignId, contactId, status, error } = req.body;

//     const messageLog = await MessageLog.create({
//       campaignId,
//       contactId,
//       status: status || 'sent',
//       type: 'outgoing',
//       error: error || null,
//       timestamp: new Date()
//     });

//     // Update campaign stats
//     const campaign = await Campaign.findById(campaignId);
    
//     if (campaign) {
//       if (status === 'sent' || status === 'delivered') {
//         campaign.stats.sent += 1;
//       } else if (status === 'failed') {
//         campaign.stats.failed += 1;
//       }
//       await campaign.save();
//     }

//     res.json({ 
//       success: true, 
//       message: "Message logged successfully",
//       log: messageLog 
//     });

//   } catch (error) {
//     console.error("❌ Error logging message:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // GET CAMPAIGN STATISTICS
// // ============================================
// export const getCampaignStats = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.userId;
    
//     const campaign = await Campaign.findOne({
//       _id: id,
//       owner: userId
//     }).populate('targetContacts', 'name phone');
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }
    
//     // Get message logs
//     const messages = await MessageLog.find({ campaignId: id })
//       .populate('contactId', 'name phone')
//       .sort({ timestamp: -1 });
    
//     const stats = {
//       total: campaign.targetContacts.length,
//       sent: campaign.stats.sent,
//       delivered: campaign.stats.delivered || 0,
//       failed: campaign.stats.failed,
//       pending: campaign.targetContacts.length - campaign.stats.sent - campaign.stats.failed
//     };
    
//     res.json({ 
//       success: true, 
//       campaign, 
//       stats, 
//       messages 
//     });
//   } catch (error) {
//     console.error("❌ Error fetching campaign stats:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // DELETE CAMPAIGN
// // ============================================
// export const deleteCampaign = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.userId;
    
//     const campaign = await Campaign.findOne({
//       _id: id,
//       owner: userId
//     });
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }
    
//     // Delete message logs
//     await MessageLog.deleteMany({ campaignId: id });
    
//     // Delete campaign
//     await campaign.deleteOne();
    
//     console.log('✅ Campaign deleted:', id);
    
//     res.json({ 
//       success: true, 
//       message: "Campaign deleted successfully" 
//     });
//   } catch (error) {
//     console.error("❌ Error deleting campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ⚠️ REMOVED: No default export - use named exports only


import Campaign from "../models/campaignModel.js";
import MessageLog from "../models/messageLogModel.js";
import Contact from "../models/contactModel.js";
import { validationResult } from "express-validator";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse.js";

// ─── CREATE CAMPAIGN ──────────────────────────────────────────────────────────
export const createCampaign = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { name, message, targetContacts, scheduledAt, mediaPath, mediaType } = req.body;

    // Verify all contacts belong to this user
    const contacts = await Contact.find({ _id: { $in: targetContacts }, owner: req.userId });
    if (contacts.length !== targetContacts.length) {
      return errorResponse(res, `Only ${contacts.length} of ${targetContacts.length} contacts found. Ensure all contacts belong to your account.`, 400);
    }

    const campaign = await Campaign.create({
      name, message, targetContacts, scheduledAt,
      mediaPath, mediaType,
      owner: req.userId,
      status: "draft",
    });

    return successResponse(res, { campaign }, "Campaign created successfully.", 201);
  } catch (error) {
    console.error("❌ Create campaign error:", error);
    return errorResponse(res, "Failed to create campaign.");
  }
};

// ─── GET ALL CAMPAIGNS ────────────────────────────────────────────────────────
export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ owner: req.userId })
      .populate("targetContacts", "name phone")
      .sort({ createdAt: -1 });

    return successResponse(res, { campaigns, count: campaigns.length });
  } catch (error) {
    console.error("❌ Get campaigns error:", error);
    return errorResponse(res, "Failed to fetch campaigns.");
  }
};

// ─── GET SINGLE CAMPAIGN ──────────────────────────────────────────────────────
export const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner: req.userId })
      .populate("targetContacts", "name phone");

    if (!campaign) return errorResponse(res, "Campaign not found.", 404);
    return successResponse(res, { campaign });
  } catch (error) {
    console.error("❌ Get campaign error:", error);
    return errorResponse(res, "Failed to fetch campaign.");
  }
};

// ─── SEND CAMPAIGN ────────────────────────────────────────────────────────────
export const sendCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner: req.userId })
      .populate("targetContacts", "name phone");

    if (!campaign) return errorResponse(res, "Campaign not found.", 404);
    if (campaign.status === "sending") return errorResponse(res, "Campaign is already being sent.", 400);
    if (campaign.status === "completed") return errorResponse(res, "Campaign has already been completed.", 400);

    campaign.status = "sending";
    await campaign.save();

    return successResponse(res, {
      campaign,
      totalContacts: campaign.targetContacts.length,
    }, "Campaign is ready. Start sending from your mobile app.");
  } catch (error) {
    console.error("❌ Send campaign error:", error);
    return errorResponse(res, "Failed to start campaign.");
  }
};

// ─── UPDATE CAMPAIGN STATUS ───────────────────────────────────────────────────
export const updateCampaignStatus = async (req, res) => {
  try {
    const { status, stats } = req.body;

    const campaign = await Campaign.findOne({ _id: req.params.id, owner: req.userId });
    if (!campaign) return errorResponse(res, "Campaign not found.", 404);

    const validStatuses = ["draft", "scheduled", "sending", "completed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
    }

    if (status) campaign.status = status;
    if (stats) campaign.stats = { ...campaign.stats.toObject(), ...stats };

    await campaign.save();
    return successResponse(res, { campaign }, "Campaign updated successfully.");
  } catch (error) {
    console.error("❌ Update campaign error:", error);
    return errorResponse(res, "Failed to update campaign.");
  }
};

// ─── LOG MESSAGE ──────────────────────────────────────────────────────────────
export const logMessage = async (req, res) => {
  try {
    const { campaignId, contactId, status, error: msgError } = req.body;

    if (!campaignId || !contactId) {
      return errorResponse(res, "campaignId and contactId are required.", 400);
    }

    const messageLog = await MessageLog.create({
      campaignId, contactId,
      status: status || "sent",
      type: "outgoing",
      error: msgError || null,
      timestamp: new Date(),
    });

    // Update campaign stats atomically
    const updateField = status === "failed" ? "stats.failed" : "stats.sent";
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { [updateField]: 1 } });

    return successResponse(res, { log: messageLog }, "Message logged.");
  } catch (error) {
    console.error("❌ Log message error:", error);
    return errorResponse(res, "Failed to log message.");
  }
};

// ─── GET CAMPAIGN STATS ───────────────────────────────────────────────────────
export const getCampaignStats = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, owner: req.userId })
      .populate("targetContacts", "name phone");

    if (!campaign) return errorResponse(res, "Campaign not found.", 404);

    const messages = await MessageLog.find({ campaignId: req.params.id })
      .populate("contactId", "name phone")
      .sort({ timestamp: -1 });

    const stats = {
      total: campaign.targetContacts.length,
      sent: campaign.stats.sent,
      delivered: campaign.stats.delivered,
      read: campaign.stats.read,
      failed: campaign.stats.failed,
      pending: campaign.targetContacts.length - campaign.stats.sent - campaign.stats.failed,
    };

    return successResponse(res, { campaign, stats, messages });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    return errorResponse(res, "Failed to fetch campaign stats.");
  }
};

// ─── DELETE CAMPAIGN ──────────────────────────────────────────────────────────
export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!campaign) return errorResponse(res, "Campaign not found.", 404);

    await MessageLog.deleteMany({ campaignId: req.params.id });
    return successResponse(res, {}, "Campaign deleted successfully.");
  } catch (error) {
    console.error("❌ Delete campaign error:", error);
    return errorResponse(res, "Failed to delete campaign.");
  }
};