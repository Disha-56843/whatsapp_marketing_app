
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


import express from 'express';
import Campaign from '../models/campaignModel.js';
import Contact from '../models/contactModel.js';

const router = express.Router();

// Get all campaigns for logged-in user
router.get('/', async (req, res) => {
  try {
    console.log('📥 GET /campaigns - User:', req.user?.id);
    
    const campaigns = await Campaign.find({ owner: req.user.id })
      .populate('targetContacts', 'name phone')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${campaigns.length} campaigns`);
    
    // Return campaigns directly as array (matches Flutter expectation)
    res.json(campaigns);
  } catch (error) {
    console.error('❌ Get campaigns error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch campaigns',
      error: error.message 
    });
  }
});

// Create new campaign
router.post('/', async (req, res) => {
  try {
    const { name, message, targetContacts, scheduledAt } = req.body;
    
    console.log('📥 POST /campaigns');
    console.log('Name:', name);
    console.log('Message:', message);
    console.log('Target Contacts:', targetContacts?.length);
    
    // Validate
    if (!name || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name and message are required'
      });
    }

    if (!targetContacts || targetContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one contact is required'
      });
    }

    // Verify contacts exist and belong to user
    const contacts = await Contact.find({
      _id: { $in: targetContacts },
      owner: req.user.id
    });

    if (contacts.length !== targetContacts.length) {
      return res.status(400).json({
        success: false,
        message: 'Some contacts not found or do not belong to you'
      });
    }

    // Create campaign
    const campaign = new Campaign({
      name,
      message,
      targetContacts,
      owner: req.user.id,
      scheduledAt: scheduledAt || null,
      status: 'draft',
      stats: {
        total: targetContacts.length,
        sent: 0,
        delivered: 0,
        failed: 0
      }
    });

    await campaign.save();
    
    // Populate for response
    await campaign.populate('targetContacts', 'name phone');
    
    console.log('✅ Campaign created:', campaign._id);
    
    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    console.error('❌ Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

// Get campaign stats
router.get('/:id/stats', async (req, res) => {
  try {
    console.log('📥 GET /campaigns/:id/stats -', req.params.id);
    
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('targetContacts', 'name phone');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    console.log('✅ Campaign stats retrieved');
    
    res.json({
      success: true,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
        targetContacts: campaign.targetContacts,
        stats: campaign.stats,
        createdAt: campaign.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign stats',
      error: error.message
    });
  }
});

// Send campaign (update status to sending)
router.post('/:id/send', async (req, res) => {
  try {
    console.log('📥 POST /campaigns/:id/send -', req.params.id);
    
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Update status
    campaign.status = 'sending';
    campaign.sentAt = new Date();
    await campaign.save();

    console.log('✅ Campaign status updated to sending');
    
    res.json({
      success: true,
      message: 'Campaign started',
      campaign
    });
  } catch (error) {
    console.error('❌ Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start campaign',
      error: error.message
    });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    console.log('📥 DELETE /campaigns/:id -', req.params.id);
    
    const campaign = await Campaign.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    console.log('✅ Campaign deleted');
    
    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    });
  }
});

export default router;