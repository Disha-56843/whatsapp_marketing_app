import Campaign from "../models/campaignModel.js";
import MessageLog from "../models/messageLogModel.js";
import Contact from "../models/contactModel.js";
import {
  sendWhatsAppMessage,
  validateWhatsAppConfig,
  getWhatsAppConfigStatus,
} from "../utils/whatsappCloudService.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPublicBaseUrl = (req) =>
  process.env.BACKEND_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  `${req.protocol}://${req.get("host")}`;

// ─── Background dispatcher ────────────────────────────────────────────────────
export const dispatchCampaignMessages = async ({ campaignId, userId }) => {
  const campaign = await Campaign.findOne({
    _id: campaignId,
    owner: userId,
  }).populate("targetContacts", "name phone");

  if (!campaign) {
    console.error(`❌ Campaign ${campaignId} not found for dispatch`);
    return;
  }

  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { status: "sending" } }
  );

  const mediaUrl =
    campaign.mediaPath && /^https?:\/\//i.test(campaign.mediaPath)
      ? campaign.mediaPath
      : null;

  console.log(
    `📤 Dispatching to ${campaign.targetContacts.length} contacts for campaign ${campaign._id}`
  );

  for (const contact of campaign.targetContacts) {
    // Skip contacts already successfully sent (safe resume after crash)
    const alreadySent = await MessageLog.findOne({
      campaignId: campaign._id,
      contactId: contact._id,
      status: "sent",
    });
    if (alreadySent) {
      console.log(`⏭️  Skipping ${contact.phone} — already sent`);
      continue;
    }

    try {
      console.log(`📨 Sending to ${contact.phone}...`);
      const result = await sendWhatsAppMessage({
        to: contact.phone,
        text: campaign.message,
        mediaUrl,
        mediaType: campaign.mediaType,
      });

      // FIX: Any non-throwing return from sendWhatsAppMessage is a success.
      // The old code checked result?.messages?.length in the $inc ternary which
      // caused the failed counter to increment even on successful sends when the
      // response shape was unexpected. Now success = no exception thrown.
      console.log(`✅ Sent to ${contact.phone} — wamid: ${result?.messages?.[0]?.id}`);

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

      await Campaign.updateOne(
        { _id: campaign._id },
        { $inc: { "stats.sent": 1 } }
      );
    } catch (error) {
      // FIX: Log the FULL error message from Meta so it appears in Render logs.
      // Previously this was swallowed silently, making it impossible to debug why
      // every campaign finished with sent:0, failed:1.
      console.error(`❌ Failed to send to ${contact.phone}: ${error.message}`);

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

    // Random 1–3 s delay between messages
    await sleep(1000 + Math.floor(Math.random() * 2000));
  }

  const updated = await Campaign.findById(campaign._id);
  const totalSent = updated?.stats?.sent ?? 0;
  const totalFailed = updated?.stats?.failed ?? 0;

  await Campaign.updateOne(
    { _id: campaign._id },
    {
      $set: {
        status: totalSent === 0 && totalFailed > 0 ? "failed" : "completed",
        sentAt: new Date(),
      },
    }
  );

  console.log(
    `✅ Campaign ${campaign._id} finished — sent: ${totalSent}, failed: ${totalFailed}`
  );
};

// ─── CREATE CAMPAIGN ──────────────────────────────────────────────────────────
export const createCampaign = async (req, res) => {
  try {
    const { name, message, targetContacts, scheduledAt, mediaPath, mediaType } =
      req.body;
    const userId = req.userId;

    if (!name || !message)
      return res
        .status(400)
        .json({ success: false, message: "Name and message are required" });

    if (!targetContacts || targetContacts.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "At least one contact is required" });

    const contacts = await Contact.find({
      _id: { $in: targetContacts },
      owner: userId,
    });

    if (contacts.length !== targetContacts.length)
      return res.status(400).json({
        success: false,
        message: `Found ${contacts.length} of ${targetContacts.length} contacts`,
      });

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

    return res
      .status(201)
      .json({ success: true, message: "Campaign created successfully", campaign });
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
    const campaigns = await Campaign.find({ owner: req.userId })
      .populate("targetContacts", "name phone")
      .sort({ createdAt: -1 });

    return res.json({ success: true, campaigns, count: campaigns.length });
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
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      owner: req.userId,
    }).populate("targetContacts", "name phone");

    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    return res.json({ success: true, campaign });
  } catch (error) {
    console.error("❌ Error fetching campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── SEND CAMPAIGN ────────────────────────────────────────────────────────────
export const sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const campaign = await Campaign.findOne({
      _id: id,
      owner: userId,
    }).populate("targetContacts", "name phone");

    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    if (campaign.status === "sending")
      return res.status(400).json({ success: false, message: "Campaign already sending" });

    // FIX: Log config status so missing credentials show up clearly in Render logs
    if (!validateWhatsAppConfig()) {
      const cfg = getWhatsAppConfigStatus();
      console.error("❌ WhatsApp Cloud API not configured:", cfg);
      return res.status(500).json({
        success: false,
        message:
          "WhatsApp Cloud API is not configured. Add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_CLOUD_API_TOKEN to your Render environment variables.",
        config: cfg,
      });
    }

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

    setImmediate(() => {
      dispatchCampaignMessages({ campaignId: campaign._id, userId }).catch(
        async (error) => {
          console.error("❌ Dispatch error:", error);
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

// ─── UPLOAD MEDIA ─────────────────────────────────────────────────────────────
export const uploadCampaignMedia = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: "Media file is required" });

    const mediaUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;
    return res.status(201).json({
      success: true,
      mediaUrl,
      mediaType: req.body.mediaType || null,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("❌ Error uploading media:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── UPDATE CAMPAIGN STATUS ───────────────────────────────────────────────────
export const updateCampaignStatus = async (req, res) => {
  try {
    const { status, stats } = req.body;
    const updateFields = {};
    if (status) updateFields.status = status;
    if (stats) {
      Object.entries(stats).forEach(([k, v]) => {
        updateFields[`stats.${k}`] = v;
      });
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: updateFields },
      { new: true }
    );

    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    return res.json({ success: true, message: "Campaign updated", campaign });
  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── LOG MESSAGE ──────────────────────────────────────────────────────────────
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

    const incField =
      status === "sent" || status === "delivered"
        ? { "stats.sent": 1 }
        : status === "failed"
        ? { "stats.failed": 1 }
        : {};

    if (Object.keys(incField).length > 0) {
      await Campaign.updateOne({ _id: campaignId }, { $inc: incField });
    }

    return res.json({ success: true, message: "Logged", log: messageLog });
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
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      owner: req.userId,
    }).populate("targetContacts", "name phone");

    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    const messages = await MessageLog.find({ campaignId: req.params.id })
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
    console.error("❌ Error fetching stats:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// ─── DELETE CAMPAIGN ──────────────────────────────────────────────────────────
export const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!campaign)
      return res.status(404).json({ success: false, message: "Campaign not found" });

    await MessageLog.deleteMany({ campaignId: req.params.id });
    await campaign.deleteOne();

    return res.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};