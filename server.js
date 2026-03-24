import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cron from "node-cron";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import Campaign from "./models/campaignModel.js";
import { dispatchCampaignMessages } from "./controllers/campaignController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── Connect DB ────────────────────────────────────────────────────────────────
await connectDB();

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  // Allow images to be served cross-origin (needed for media in campaigns)
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: "*", // Tighten this to your Flutter app's origin in production
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
}));

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── FIX: Serve uploaded media files as static assets ────────────────────────
// Without this the mediaUrl returned by /upload-media is a dead link.
app.use("/uploads", express.static(uploadsDir));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WhatsApp Marketing API is running",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ─── FIX: Cron job — resumes campaigns stuck in "sending" on server restart ───
// Render free tier restarts frequently. Without this, campaigns that were
// mid-send become stuck in "sending" forever after a restart.
// Runs every 5 minutes. Only picks up campaigns with status="sending"
// that have not been touched in the last 10 minutes (avoids re-firing active ones).
cron.schedule("*/5 * * * *", async () => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckCampaigns = await Campaign.find({
      status: "sending",
      updatedAt: { $lt: tenMinutesAgo },
    });

    if (stuckCampaigns.length > 0) {
      console.log(`⚠️ Found ${stuckCampaigns.length} stuck campaign(s) — resuming`);
    }

    for (const campaign of stuckCampaigns) {
      console.log(`🔄 Resuming campaign: ${campaign._id}`);
      dispatchCampaignMessages({
        campaignId: campaign._id,
        userId: campaign.owner,
      }).catch((err) => {
        console.error(`❌ Resume failed for ${campaign._id}:`, err.message);
      });
    }
  } catch (err) {
    console.error("❌ Cron job error:", err.message);
  }
});

// ─── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads served at /uploads`);
  console.log(`🔁 Campaign resume cron active (every 5 min)`);
});