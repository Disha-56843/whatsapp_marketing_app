import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'sending', 'completed', 'failed'], 
    default: 'draft' 
  },
  targetContacts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contact' 
  }],
  scheduledAt: { 
    type: Date 
  },
  mediaPath: {
    type: String
  },
  mediaType: {
    type: String
  },
  stats: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 }
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
