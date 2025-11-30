import mongoose from "mongoose";

const messageLogSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign',
    required: true
  },
  contactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contact',
    required: true
  },
  from: String,
  to: String,
  body: String,
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'failed', 'incoming'], 
    default: 'sent' 
  },
  type: { 
    type: String, 
    enum: ['outgoing', 'incoming'], 
    default: 'outgoing' 
  },
  error: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export default mongoose.model('MessageLog', messageLogSchema);