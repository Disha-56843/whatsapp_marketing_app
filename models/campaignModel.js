// ─── CHANGED FROM ORIGINAL ────────────────────────────────────────────────────
// Added mediaPath and mediaType fields to the schema.
// Previously these fields were sent by Flutter but silently dropped because
// they were not in the schema, causing media to be null on every campaign fetch.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    message: { type: String, required: true },

    // ✅ ADDED: These two fields were missing — that was the bug
    mediaPath: { type: String, default: null },
    mediaType: {
      type: String,
      enum: ["image", "video", "document", null],
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "completed", "failed"],
      default: "draft",
    },
    targetContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    stats: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);