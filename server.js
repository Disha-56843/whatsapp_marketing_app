import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";
import connectDB from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/api", apiLimiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/contacts", contactRoutes);
app.use("/api/v1/campaigns", campaignRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "WhatsApp Marketing API v2.0",
    docs: "/api/health",
    endpoints: {
      auth: "/api/v1/auth",
      contacts: "/api/v1/contacts",
      campaigns: "/api/v1/campaigns",
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong on our end. Please try again.",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("");
    console.log("=========================================");
    console.log("🚀  WhatsApp Marketing API  v2.0");
    console.log("=========================================");
    console.log(`📡  Port     : ${PORT}`);
    console.log(`🌍  Env      : ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗  Base URL : http://localhost:${PORT}/api/v1`);
    console.log("=========================================");
    console.log("");
  });
});