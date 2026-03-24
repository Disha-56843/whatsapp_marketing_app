import Campaign from "../models/campaignModel.js";
import MessageLog from "../models/messageLogModel.js";
import Contact from "../models/contactModel.js";
import {
  sendWhatsAppMessage,
  validateWhatsAppConfig,
  getWhatsAppConfigStatus,
} from "../utils/whatsappCloudService.js";

// ─── Helper ────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPublicBaseUrl = (req) =>
  process.env.BACKEND_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `${req.protocol}://${req.get("host")}`;

// ─── Background dispatcher (called by sendCampaign and the resume cron) ────────
// FIX 1: Added per-message delay (1–3 s random) to avoid WhatsApp rate-limiting.
// FIX 2: Skips contacts that already have a successful log (safe to resume after crash).
// FIX 3: Uses $inc for atomic stat updates — no read-modify-write race condition.
export const dispatchCampaignMessages = async ({ campaignId, userId }) => {
  const campaign = await Campaign.findOne({
    _id: campaignId,
    owner: userId,
  }).populate("targetContacts", "name phone");

  if (!campaign) return;

  // Mark running so the cron job doesn't double-fire
  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { status: "sending" } }
  );

  const mediaUrl =
    campaign.mediaPath && /^https?:\/\//i.test(campaign.mediaPath)
      ? campaign.mediaPath
      : null;

  for (const contact of campaign.targetContacts) {
    // FIX 2: Skip already-sent contacts (safe resume after server restart)
    const alreadySent = await MessageLog.findOne({
      campaignId: campaign._id,
      contactId: contact._id,
      status: "sent",
    });
    if (alreadySent) continue;

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

      // FIX 3: Atomic increment — no race condition
      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { "stats.sent": result?.messages?.length ? 1 : 0, "stats.failed": result?.messages?.length ? 0 : 1 } }
      );
    } catch (error) {
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

      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { "stats.failed": 1 } }
      );
    }

    // FIX 1: Random 1–3 second delay between messages
    const delayMs = 1000 + Math.floor(Math.random() * 2000);
    await sleep(delayMs);
  }

  // Final status update
  const updated = await Campaign.findById(campaign._id);
  const allFailed =
    updated.stats.failed > 0 && updated.stats.sent === 0;

  await Campaign.updateOne(
    { _id: campaign._id },
    {
      $set: {
        status: allFailed ? "failed" : "completed",
        sentAt: new Date(),
      },
    }
  );

  console.log(
    `✅ Campaign ${campaign._id} finished — sent: ${updated.stats.sent}, failed: ${updated.stats.failed}`
  );
};

// ─── CREATE CAMPAIGN ───────────────────────────────────────────────────────────
export const createCampaign = async (req, res) => {
  try {
    const { name, message, targetContacts, scheduledAt, mediaPath, mediaType } =
      req.body;
    const userId = req.userId;

    if (!name || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Name and message are required" });
    }

    if (!targetContacts || targetContacts.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one contact is required" });
    }

    // Verify all contacts belong to this user
    const contacts = await Contact.find({
      _id: { $in: targetContacts },
      owner: userId,
    });

    if (contacts.length !== targetContacts.length) {
      return res.status(400).json({
        success: false,
        message: `Found ${contacts.length} contacts out of ${targetContacts.length} requested`,
      });
    }

    const campaign = await Campaign.create({
      name,
      message,
      targetContacts,
      scheduledAt,
      mediaPath: mediaPath || null,
      mediaType: mediaType || null,
      owner: userId,
      status: "draft",
      stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
    });

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    console.error("❌ Error creating campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── GET ALL CAMPAIGNS ────────────────────────────────────────────────────────
export const getCampaigns = async (req, res) => {
  try {
    const userId = req.userId;

    const campaigns = await Campaign.find({ owner: userId })
      .populate("targetContacts", "name phone")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── GET SINGLE CAMPAIGN ──────────────────────────────────────────────────────
export const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const campaign = await Campaign.findOne({ _id: id, owner: userId }).populate(
      "targetContacts",
      "name phone"
    );

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    return res.json({ success: true, campaign });
  } catch (error) {
    console.error("❌ Error fetching campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── SEND CAMPAIGN ────────────────────────────────────────────────────────────
// FIX: Uses setImmediate so the response returns immediately, then runs in bg.
export const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId,
    }).populate("targetContacts", "name phone");

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    if (campaign.status === "sending") {
      return res
        .status(400)
        .json({ success: false, message: "Campaign is already being sent" });
    }

    if (!validateWhatsAppConfig()) {
      const cfg = getWhatsAppConfigStatus();
      return res.status(500).json({
        success: false,
        message: "WhatsApp Cloud API is not configured on the server",
        config: {
          hasPhoneNumberId: cfg.hasPhoneNumberId,
          hasAccessToken: cfg.hasAccessToken,
        },
      });
    }

    // Clear old logs and reset stats for a fresh send
    await MessageLog.deleteMany({ campaignId: campaign._id });
    await Campaign.updateOne(
      { _id: campaign._id },
      {
        $set: {
          status: "sending",
          sentAt: null,
          stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        },
      }
    );

    // Kick off in background — response returns immediately
    setImmediate(() => {
      dispatchCampaignMessages({ campaignId: campaign._id, userId }).catch(
        async (error) => {
          console.error("❌ Background campaign dispatch error:", error);
          await Campaign.updateOne(
            { _id: campaign._id },
            { $set: { status: "failed" } }
          );
        }
      );
    });

    console.log(`✅ Campaign ${campaign._id} dispatch started`);

    return res.json({
      success: true,
      message: "Campaign started on server",
      campaignId: campaign._id,
      totalContacts: campaign.targetContacts.length,
    });
  } catch (error) {
    console.error("❌ Error sending campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── UPLOAD MEDIA ────────────────────────────────────────────────────────────
export const uploadCampaignMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Media file is required" });
    }

    const mediaUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      mediaUrl,
      mediaType: req.body.mediaType || null,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("❌ Error uploading campaign media:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── UPDATE CAMPAIGN STATUS ───────────────────────────────────────────────────
export const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, stats } = req.body;
    const userId = req.userId;

    const updateFields = {};
    if (status) updateFields.status = status;
    if (stats) {
      Object.entries(stats).forEach(([k, v]) => {
        updateFields[`stats.${k}`] = v;
      });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: updateFields },
      { new: true }
    );

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    return res.json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── LOG MESSAGE ─────────────────────────────────────────────────────────────
// FIX: Uses $inc for atomic stat update
export const logMessage = async (req, res) => {
  try {
    const { campaignId, contactId, status, error } = req.body;

    const messageLog = await MessageLog.create({
      campaignId,
      contactId,
      status: status || "sent",
      type: "outgoing",
      error: error || null,
      timestamp: new Date(),
    });

    // FIX: Atomic increment — no race condition on concurrent logs
    const incField =
      status === "sent" || status === "delivered"
        ? { "stats.sent": 1 }
        : status === "failed"
        ? { "stats.failed": 1 }
        : {};

    if (Object.keys(incField).length > 0) {
      await Campaign.updateOne({ _id: campaignId }, { $inc: incField });
    }

    return res.json({
      success: true,
      message: "Message logged successfully",
      log: messageLog,
    });
  } catch (error) {
    console.error("❌ Error logging message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── GET CAMPAIGN STATS ───────────────────────────────────────────────────────
export const getCampaignStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId,
    }).populate("targetContacts", "name phone");

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    const messages = await MessageLog.find({ campaignId: id })
      .populate("contactId", "name phone")
      .sort({ timestamp: -1 });

    const stats = {
      total: campaign.targetContacts.length,
      sent: campaign.stats.sent,
      delivered: campaign.stats.delivered || 0,
      failed: campaign.stats.failed,
      pending:
        campaign.targetContacts.length -
        campaign.stats.sent -
        campaign.stats.failed,
    };

    return res.json({ success: true, campaign, stats, messages });
  } catch (error) {
    console.error("❌ Error fetching campaign stats:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── DELETE CAMPAIGN ─────────────────────────────────────────────────────────
export const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const campaign = await Campaign.findOne({ _id: id, owner: userId });

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: "Campaign not found" });
    }

    await MessageLog.deleteMany({ campaignId: id });
    await campaign.deleteOne();

    return res.json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};