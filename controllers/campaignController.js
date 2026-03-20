
// import Campaign from "../models/campaignModel.js";
// import MessageLog from "../models/messageLogModel.js";
// import Contact from "../models/contactModel.js";

// // NOTE: We'll import whatsappClient from server.js in a moment
// // For now, we'll handle it differently

// // Helper function to add delay
// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// // ============================================
// // CREATE NEW CAMPAIGN
// // ============================================
// export const createCampaign = async (req, res) => {
//   try {
//     const { name, message, targetContacts, scheduledAt } = req.body;
//     const userId = req.userId; // From auth middleware

//     if (!name || !message) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Name and message are required" 
//       });
//     }

//     const campaign = await Campaign.create({
//       name,
//       message,
//       targetContacts: targetContacts || [],
//       scheduledAt,
//       owner: userId,
//       status: 'draft'
//     });

//     res.status(201).json({ 
//       success: true, 
//       message: "Campaign created successfully", 
//       campaign 
//     });
//   } catch (error) {
//     console.error("Error creating campaign:", error);
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
    
//     const campaigns = await Campaign.find({ owner: userId })
//       .populate('targetContacts', 'name phone')
//       .sort({ createdAt: -1 });
    
//     res.json({ 
//       success: true, 
//       campaigns 
//     });
//   } catch (error) {
//     console.error("Error fetching campaigns:", error);
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
    
//     const campaign = await Campaign.findById(id)
//       .populate('targetContacts', 'name phone');
    
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
//     console.error("Error fetching campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // SEND CAMPAIGN (Important - this doesn't use whatsapp-web.js)
// // Mobile app handles actual sending via native WhatsApp
// // ============================================
// export const sendCampaign = async (req, res) => {
//   try {
//     const { id } = req.params;
    
//     const campaign = await Campaign.findById(id)
//       .populate('targetContacts', 'name phone');
    
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

//     // Update campaign status to sending
//     campaign.status = 'sending';
//     await campaign.save();

//     // Note: The actual message sending happens on the mobile app
//     // The app will call this endpoint to get campaign data
//     // and then send messages via native WhatsApp

//     res.json({ 
//       success: true, 
//       message: "Campaign data ready for sending", 
//       campaign,
//       totalContacts: campaign.targetContacts.length 
//     });

//   } catch (error) {
//     console.error("Error preparing campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // UPDATE CAMPAIGN STATUS (Called by mobile app)
// // ============================================
// export const updateCampaignStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, stats } = req.body;

//     const campaign = await Campaign.findById(id);
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }

//     // Update status
//     if (status) {
//       campaign.status = status;
//     }

//     // Update stats if provided
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
//     console.error("Error updating campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // LOG MESSAGE (Called by mobile app after each send)
// // ============================================
// export const logMessage = async (req, res) => {
//   try {
//     const { campaignId, contactId, status, error } = req.body;

//     // Create message log
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
//     console.error("Error logging message:", error);
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
    
//     const campaign = await Campaign.findById(id)
//       .populate('targetContacts', 'name phone');
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }
    
//     // Get message logs for this campaign
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
//     console.error("Error fetching campaign stats:", error);
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
    
//     const campaign = await Campaign.findById(id);
    
//     if (!campaign) {
//       return res.status(404).json({ 
//         success: false,
//         message: "Campaign not found" 
//       });
//     }
    
//     // Delete associated message logs
//     await MessageLog.deleteMany({ campaignId: id });
    
//     // Delete campaign
//     await campaign.deleteOne();
    
//     res.json({ 
//       success: true, 
//       message: "Campaign deleted successfully" 
//     });
//   } catch (error) {
//     console.error("Error deleting campaign:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // EXPORT ALL FUNCTIONS
// // ============================================
// // Make sure all functions are exported!
// export default {
//   createCampaign,
//   getCampaigns,
//   getCampaignById,
//   sendCampaign,
//   updateCampaignStatus,
//   logMessage,
//   getCampaignStats,
//   deleteCampaign
// };
import Campaign from "../models/campaignModel.js";
import MessageLog from "../models/messageLogModel.js";
import Contact from "../models/contactModel.js";
import { sendWhatsAppMessage, validateWhatsAppConfig } from "../utils/whatsappCloudService.js";

const getPublicBaseUrl = (req) =>
  process.env.BACKEND_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `${req.protocol}://${req.get("host")}`;

const dispatchCampaignMessages = async ({ campaignId, userId }) => {
  const campaign = await Campaign.findOne({
    _id: campaignId,
    owner: userId,
  }).populate("targetContacts", "name phone");

  if (!campaign) return;

  const mediaUrl =
    campaign.mediaPath && /^https?:\/\//i.test(campaign.mediaPath)
      ? campaign.mediaPath
      : null;

  let sent = 0;
  let failed = 0;

  for (const contact of campaign.targetContacts) {
    try {
      const result = await sendWhatsAppMessage({
        to: contact.phone,
        text: campaign.message,
        mediaUrl,
        mediaType: campaign.mediaType,
      });

      await MessageLog.create({
        campaignId: campaign._id,
        contactId: contact._id,
        to: contact.phone,
        body: campaign.message,
        status: "sent",
        type: "outgoing",
        error: null,
        timestamp: new Date(),
      });

      if (result?.messages?.length) {
        sent += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      await MessageLog.create({
        campaignId: campaign._id,
        contactId: contact._id,
        to: contact.phone,
        body: campaign.message,
        status: "failed",
        type: "outgoing",
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  campaign.stats = {
    sent,
    delivered: 0,
    read: 0,
    failed,
  };
  campaign.sentAt = new Date();
  campaign.status = failed === campaign.targetContacts.length ? "failed" : "completed";
  await campaign.save();
};

// ============================================
// CREATE NEW CAMPAIGN
// ============================================
export const createCampaign = async (req, res) => {
  try {
    const {
      name,
      message,
      targetContacts,
      scheduledAt,
      mediaPath,
      mediaType
    } = req.body;
    const userId = req.userId; // From auth middleware

    console.log('📥 POST /campaigns');
    console.log('Name:', name);
    console.log('Message:', message);
    console.log('Target Contacts:', targetContacts?.length);
    console.log('User ID:', userId);

    if (!name || !message) {
      return res.status(400).json({ 
        success: false,
        message: "Name and message are required" 
      });
    }

    if (!targetContacts || targetContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one contact is required"
      });
    }

    // Verify contacts exist and belong to user
    const contacts = await Contact.find({
      _id: { $in: targetContacts },
      owner: userId
    });

    if (contacts.length !== targetContacts.length) {
      return res.status(400).json({
        success: false,
        message: `Found ${contacts.length} contacts out of ${targetContacts.length} requested`
      });
    }

    const campaign = await Campaign.create({
      name,
      message,
      targetContacts,
      scheduledAt,
      mediaPath,
      mediaType,
      owner: userId,
      status: 'draft',
      stats: {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      }
    });

    console.log('✅ Campaign created:', campaign._id);

    res.status(201).json({ 
      success: true, 
      message: "Campaign created successfully", 
      campaign 
    });
  } catch (error) {
    console.error("❌ Error creating campaign:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// GET ALL CAMPAIGNS FOR USER
// ============================================
export const getCampaigns = async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log('📥 GET /campaigns - User:', userId);
    
    const campaigns = await Campaign.find({ owner: userId })
      .populate('targetContacts', 'name phone')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${campaigns.length} campaigns`);
    
    // ✅ FIX: Wrap in object — Flutter reads response['campaigns']
    // Previously returned raw array which Flutter couldn't parse
    res.json({ success: true, campaigns, count: campaigns.length });
    
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// GET SINGLE CAMPAIGN BY ID
// ============================================
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId
    }).populate('targetContacts', 'name phone');
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: "Campaign not found" 
      });
    }
    
    res.json({ 
      success: true, 
      campaign 
    });
  } catch (error) {
    console.error("❌ Error fetching campaign:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// SEND CAMPAIGN
// ============================================
export const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId
    }).populate('targetContacts', 'name phone');
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: "Campaign not found" 
      });
    }

    if (campaign.status === 'sending') {
      return res.status(400).json({ 
        success: false,
        message: "Campaign is already being sent" 
      });
    }

    if (!validateWhatsAppConfig()) {
      return res.status(500).json({
        success: false,
        message: "WhatsApp Cloud API is not configured on the server"
      });
    }

    await MessageLog.deleteMany({ campaignId: campaign._id });
    campaign.status = 'sending';
    campaign.sentAt = null;
    campaign.stats = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0
    };
    await campaign.save();

    setImmediate(() => {
      dispatchCampaignMessages({
        campaignId: campaign._id,
        userId
      }).catch(async (error) => {
        console.error("❌ Background campaign dispatch error:", error);
        await Campaign.updateOne(
          { _id: campaign._id, owner: userId },
          {
            $set: {
              status: "failed"
            }
          }
        );
      });
    });

    console.log('✅ Campaign dispatch started on server');

    res.json({ 
      success: true, 
      message: "Campaign started on server",
      campaignId: campaign._id,
      totalContacts: campaign.targetContacts.length 
    });

  } catch (error) {
    console.error("❌ Error sending campaign:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

export const uploadCampaignMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Media file is required"
      });
    }

    const mediaUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      mediaUrl,
      mediaType: req.body.mediaType || null,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error("❌ Error uploading campaign media:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// ============================================
// UPDATE CAMPAIGN STATUS
// ============================================
export const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, stats } = req.body;
    const userId = req.userId;

    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId
    });
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: "Campaign not found" 
      });
    }

    if (status) {
      campaign.status = status;
    }

    if (stats) {
      campaign.stats = {
        ...campaign.stats,
        ...stats
      };
    }

    await campaign.save();

    res.json({ 
      success: true, 
      message: "Campaign updated successfully",
      campaign 
    });

  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// LOG MESSAGE
// ============================================
export const logMessage = async (req, res) => {
  try {
    const { campaignId, contactId, status, error } = req.body;

    const messageLog = await MessageLog.create({
      campaignId,
      contactId,
      status: status || 'sent',
      type: 'outgoing',
      error: error || null,
      timestamp: new Date()
    });

    // Update campaign stats
    const campaign = await Campaign.findById(campaignId);
    
    if (campaign) {
      if (status === 'sent' || status === 'delivered') {
        campaign.stats.sent += 1;
      } else if (status === 'failed') {
        campaign.stats.failed += 1;
      }
      await campaign.save();
    }

    res.json({ 
      success: true, 
      message: "Message logged successfully",
      log: messageLog 
    });

  } catch (error) {
    console.error("❌ Error logging message:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// GET CAMPAIGN STATISTICS
// ============================================
export const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId
    }).populate('targetContacts', 'name phone');
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: "Campaign not found" 
      });
    }
    
    // Get message logs
    const messages = await MessageLog.find({ campaignId: id })
      .populate('contactId', 'name phone')
      .sort({ timestamp: -1 });
    
    const stats = {
      total: campaign.targetContacts.length,
      sent: campaign.stats.sent,
      delivered: campaign.stats.delivered || 0,
      failed: campaign.stats.failed,
      pending: campaign.targetContacts.length - campaign.stats.sent - campaign.stats.failed
    };
    
    res.json({ 
      success: true, 
      campaign, 
      stats, 
      messages 
    });
  } catch (error) {
    console.error("❌ Error fetching campaign stats:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ============================================
// DELETE CAMPAIGN
// ============================================
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId
    });
    
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: "Campaign not found" 
      });
    }
    
    // Delete message logs
    await MessageLog.deleteMany({ campaignId: id });
    
    // Delete campaign
    await campaign.deleteOne();
    
    console.log('✅ Campaign deleted:', id);
    
    res.json({ 
      success: true, 
      message: "Campaign deleted successfully" 
    });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

// ⚠️ REMOVED: No default export - use named exports only
