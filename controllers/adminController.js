import mongoose from "mongoose";
import User from "../models/userModel.js";
import Contact from "../models/contactModel.js";
import Campaign from "../models/campaignModel.js";
import MessageLog from "../models/messageLogModel.js";
import { getWhatsAppConfigStatus } from "../utils/whatsappCloudService.js";

const MB = 1024 * 1024;

const toMB = (value = 0) => Number((value / MB).toFixed(2));

const getSinceDate = (days) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date;
};

const buildDailySeries = (rows, since, days) => {
  const map = new Map(rows.map((row) => [row._id, row.count]));
  const series = [];

  for (let i = 0; i < days; i += 1) {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + i);
    const label = date.toISOString().slice(0, 10);
    series.push({
      date: label,
      count: map.get(label) || 0,
    });
  }

  return series;
};

const getDailyCounts = async (Model, dateField, days, extraMatch = {}) => {
  const since = getSinceDate(days);
  const rows = await Model.aggregate([
    { $match: { ...extraMatch, [dateField]: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: {
            date: `$${dateField}`,
            format: "%Y-%m-%d",
            timezone: "UTC",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return buildDailySeries(rows, since, days);
};

const toBreakdownMap = (rows) =>
  rows.reduce((acc, row) => {
    const key = row._id || "unknown";
    acc[key] = row.count;
    return acc;
  }, {});

export const getAdminOverview = async (req, res) => {
  try {
    const since7d = getSinceDate(7);

    const [
      userCount,
      adminCount,
      contactCount,
      campaignCount,
      messageCount,
      newUsers7d,
      campaigns7d,
      messages7d,
      campaignsByStatusRows,
      messagesByStatusRows,
      usersLast30Days,
      campaignsLast30Days,
      messagesLast30Days,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      Contact.countDocuments(),
      Campaign.countDocuments(),
      MessageLog.countDocuments(),
      User.countDocuments({ createdAt: { $gte: since7d } }),
      Campaign.countDocuments({ createdAt: { $gte: since7d } }),
      MessageLog.countDocuments({ createdAt: { $gte: since7d } }),
      Campaign.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      MessageLog.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      getDailyCounts(User, "createdAt", 30),
      getDailyCounts(Campaign, "createdAt", 30),
      getDailyCounts(MessageLog, "createdAt", 30),
    ]);

    let dbStats = null;
    try {
      const rawStats = await mongoose.connection.db.stats();
      dbStats = {
        db: rawStats.db,
        collections: rawStats.collections,
        objects: rawStats.objects,
        avgObjSizeBytes: rawStats.avgObjSize || 0,
        dataSizeMB: toMB(rawStats.dataSize),
        storageSizeMB: toMB(rawStats.storageSize),
        indexSizeMB: toMB(rawStats.indexSize),
      };
    } catch (error) {
      dbStats = { error: "Unable to fetch DB stats in current environment" };
    }

    const wa = getWhatsAppConfigStatus();

    return res.json({
      success: true,
      admin: req.admin,
      generatedAt: new Date().toISOString(),
      app: {
        name: "WhatsApp Marketing API",
        version: "2.0.0",
        nodeEnv: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
        whatsappCloud: {
          valid: wa.valid,
          hasPhoneNumberId: wa.hasPhoneNumberId,
          hasAccessToken: wa.hasAccessToken,
          graphApiVersion: wa.graphApiVersion,
        },
      },
      totals: {
        users: userCount,
        admins: adminCount,
        contacts: contactCount,
        campaigns: campaignCount,
        messages: messageCount,
      },
      usage7d: {
        newUsers: newUsers7d,
        campaignsCreated: campaigns7d,
        messagesLogged: messages7d,
      },
      campaignStatusBreakdown: toBreakdownMap(campaignsByStatusRows),
      messageStatusBreakdown: toBreakdownMap(messagesByStatusRows),
      charts: {
        usersLast30Days,
        campaignsLast30Days,
        messagesLast30Days,
      },
      database: dbStats,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load admin overview",
      error: error.message,
    });
  }
};

export const getAdminRecentActivity = async (req, res) => {
  try {
    const [recentUsers, recentCampaigns, recentMessages] = await Promise.all([
      User.find({}, "name email isAdmin createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Campaign.find({}, "name status owner createdAt updatedAt stats")
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("owner", "name email")
        .lean(),
      MessageLog.find({}, "campaignId contactId to status error createdAt")
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("campaignId", "name")
        .populate("contactId", "name phone")
        .lean(),
    ]);

    return res.json({
      success: true,
      recentUsers,
      recentCampaigns,
      recentMessages,
    });
  } catch (error) {
    console.error("Admin recent activity error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load recent activity",
      error: error.message,
    });
  }
};

export const getAdminDatabaseDetails = async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();

    const details = await Promise.all(
      collections.map(async (collection) => {
        const [count, indexes] = await Promise.all([
          mongoose.connection.db.collection(collection.name).countDocuments(),
          mongoose.connection.db.collection(collection.name).indexes(),
        ]);

        return {
          name: collection.name,
          documents: count,
          indexes: indexes.length,
        };
      })
    );

    return res.json({
      success: true,
      totalCollections: details.length,
      collections: details.sort((a, b) => b.documents - a.documents),
    });
  } catch (error) {
    console.error("Admin DB details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load database details",
      error: error.message,
    });
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email isAdmin createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load users list",
      error: error.message,
    });
  }
};

export const getAdminUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    const user = await User.findById(userId, "name email isAdmin createdAt updatedAt").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const since7d = getSinceDate(7);

    const [contactsCount, campaignsCount, recentContacts, recentCampaigns, campaignStatusRows, campaignIds] =
      await Promise.all([
        Contact.countDocuments({ owner: userId }),
        Campaign.countDocuments({ owner: userId }),
        Contact.find({ owner: userId }, "name phone email batchName tags createdAt")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        Campaign.find(
          { owner: userId },
          "name message mediaPath mediaType status scheduledAt sentAt stats createdAt updatedAt"
        )
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        Campaign.aggregate([
          { $match: { owner: new mongoose.Types.ObjectId(userId) } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Campaign.find({ owner: userId }, "_id").lean(),
      ]);

    const campaignIdList = campaignIds.map((c) => c._id);
    const messageFilter = campaignIdList.length ? { campaignId: { $in: campaignIdList } } : null;

    const [
      messagesCount,
      messagesLast7d,
      campaignsLast7d,
      contactsLast7d,
      messageStatusRows,
      recentMessages,
      campaignsLast30Days,
      contactsLast30Days,
      messagesLast30Days,
    ] = await Promise.all([
      messageFilter ? MessageLog.countDocuments(messageFilter) : 0,
      messageFilter ? MessageLog.countDocuments({ ...messageFilter, createdAt: { $gte: since7d } }) : 0,
      Campaign.countDocuments({ owner: userId, createdAt: { $gte: since7d } }),
      Contact.countDocuments({ owner: userId, createdAt: { $gte: since7d } }),
      messageFilter
        ? MessageLog.aggregate([
            { $match: messageFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
        : [],
      messageFilter
        ? MessageLog.find(messageFilter, "campaignId contactId to body status error createdAt")
            .sort({ createdAt: -1 })
            .limit(30)
            .populate("campaignId", "name")
            .populate("contactId", "name phone")
            .lean()
        : [],
      getDailyCounts(Campaign, "createdAt", 30, { owner: new mongoose.Types.ObjectId(userId) }),
      getDailyCounts(Contact, "createdAt", 30, { owner: new mongoose.Types.ObjectId(userId) }),
      campaignIdList.length
        ? getDailyCounts(MessageLog, "createdAt", 30, { campaignId: { $in: campaignIdList } })
        : buildDailySeries([], getSinceDate(30), 30),
    ]);

    return res.json({
      success: true,
      user,
      totals: {
        contacts: contactsCount,
        campaigns: campaignsCount,
        messages: messagesCount,
      },
      usage7d: {
        contactsCreated: contactsLast7d,
        campaignsCreated: campaignsLast7d,
        messagesLogged: messagesLast7d,
      },
      campaignStatusBreakdown: toBreakdownMap(campaignStatusRows),
      messageStatusBreakdown: toBreakdownMap(messageStatusRows),
      charts: {
        contactsLast30Days,
        campaignsLast30Days,
        messagesLast30Days,
      },
      recent: {
        contacts: recentContacts,
        campaigns: recentCampaigns,
        messages: recentMessages,
      },
    });
  } catch (error) {
    console.error("Admin user details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user details",
      error: error.message,
    });
  }
};
