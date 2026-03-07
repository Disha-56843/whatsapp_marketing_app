import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import xlsx from "xlsx";
import cors from "cors";
import fs from "fs";
import path from "path";
import 'dotenv/config';

// FIX: Import whatsapp-web.js as CommonJS module
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

// Import QRCode
import QRCode from 'qrcode';

// Import routes
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("📦 Connected to MongoDB Atlas"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// const app = express();
// app.use(cors());
// app.use(express.json());

// // ✅ Connect MongoDB (database name = contact)
// // mongoose.connect("mongodb://172.20.10.2:27017/whatsapp_marketing", {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // });
// console.log("📦 Connected to MongoDB (Database: contact)");

// // 📁 Setup Multer for file upload
// const upload = multer({ dest: "uploads/" });

// // ✅ Convert Excel/CSV to JSON
// function convertToJson(filePath) {
//   const workbook = xlsx.readFile(filePath);
//   const sheet = workbook.Sheets[workbook.SheetNames[0]];
//   return xlsx.utils.sheet_to_json(sheet);
// }

// // -------------------------------------------------------
// // 🚀 MAIN UPLOAD API
// // -------------------------------------------------------

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "File not found" });
//     }

//     const uploadedFilePath = req.file.path;

//     // Extract file name without extension (this becomes collection name)
//     const originalFileName = req.file.originalname;
//     const collectionName = path.parse(originalFileName).name;

//     // Convert to JSON
//     const jsonData = convertToJson(uploadedFilePath);

//     // Insert data into a dynamic collection
//     const db = mongoose.connection.db;
//     const dynamicCollection = db.collection(collectionName);

//     await dynamicCollection.insertMany(jsonData);

//     // Delete uploaded file
//     fs.unlinkSync(uploadedFilePath);

//     res.status(200).json({
//       success: true,
//       message: `File imported successfully`,
//       collection: collectionName,
//       recordsInserted: jsonData.length,
//     });
//   } catch (error) {
//     console.error("❌ Error:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// // -------------------------------------------------------

// // app.listen(5000, () => console.log("🚀 Server running on port 5000"));
// app.listen(process.env.PORT || 5000, () =>
//   console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
// );


// WhatsApp Client Setup



const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// MONGODB CONNECTION
// ============================================
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("📦 Connected to MongoDB Atlas"))
// .catch((err) => console.error("❌ MongoDB connection error:", err));

// ============================================
// WHATSAPP CLIENT SETUP
// ============================================
let whatsappClient = null;
let isWhatsAppReady = false;
let qrCodeData = null;
let whatsappNumber = null;

function initializeWhatsAppClient() {
  console.log("🔄 Initializing WhatsApp client...");
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp-session'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('📱 QR Code received - scan with WhatsApp');
    try {
      qrCodeData = await QRCode.toDataURL(qr);
      console.log('✅ QR Code generated as data URL');
    } catch (err) {
      console.error('❌ QR Code generation error:', err);
      qrCodeData = qr; // Fallback to raw QR string
    }
  });

  whatsappClient.on('ready', async () => {
    console.log('✅ WhatsApp Client is ready!');
    isWhatsAppReady = true;
    qrCodeData = null;
    
    try {
      const info = whatsappClient.info;
      whatsappNumber = info.wid.user;
      console.log(`📱 Connected as: ${whatsappNumber}`);
    } catch (err) {
      console.log('📱 WhatsApp connected');
    }
  });

  whatsappClient.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated successfully');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    isWhatsAppReady = false;
    qrCodeData = null;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp disconnected:', reason);
    isWhatsAppReady = false;
    qrCodeData = null;
  });

  whatsappClient.on('message', async (message) => {
    console.log(`📩 Received: ${message.body} from ${message.from}`);
  });

  whatsappClient.initialize();
}

// Initialize WhatsApp on server start
// COMMENTED OUT FOR NOW - Mobile app handles WhatsApp directly
// Uncomment if you want server-side WhatsApp integration
// initializeWhatsAppClient();

// ============================================
// FILE UPLOAD SETUP
// ============================================
const upload = multer({ dest: "uploads/" });

function convertToJson(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

// ============================================
// ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);

// ============================================
// WHATSAPP ROUTES (Optional - for server-side integration)
// ============================================

// Get WhatsApp connection status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected: isWhatsAppReady,
    qrCode: qrCodeData,
    phoneNumber: whatsappNumber,
    message: isWhatsAppReady 
      ? 'Connected' 
      : qrCodeData 
        ? 'Waiting for QR scan' 
        : 'Not initialized'
  });
});

// Logout WhatsApp
app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.logout();
      isWhatsAppReady = false;
      qrCodeData = null;
      whatsappNumber = null;
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restart WhatsApp connection
app.post('/api/whatsapp/restart', async (req, res) => {
  try {
    if (whatsappClient) {
      await whatsappClient.destroy();
    }
    isWhatsAppReady = false;
    qrCodeData = null;
    whatsappNumber = null;
    
    initializeWhatsAppClient();
    
    res.json({ success: true, message: 'WhatsApp client restarting...' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LEGACY UPLOAD ROUTE
// ============================================
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File not found" });
    }

    const uploadedFilePath = req.file.path;
    const originalFileName = req.file.originalname;
    const collectionName = path.parse(originalFileName).name;

    const jsonData = convertToJson(uploadedFilePath);
    const db = mongoose.connection.db;
    const dynamicCollection = db.collection(collectionName);

    await dynamicCollection.insertMany(jsonData);
    fs.unlinkSync(uploadedFilePath);

    res.status(200).json({
      success: true,
      message: `File imported successfully`,
      collection: collectionName,
      recordsInserted: jsonData.length,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============================================
// HEALTH CHECK ROUTE
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    whatsapp: isWhatsAppReady ? 'Connected' : 'Not Connected'
  });
});

// ============================================
// ROOT ROUTE
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Marketing Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      contacts: '/api/contacts',
      campaigns: '/api/campaigns',
      whatsapp: '/api/whatsapp',
      health: '/api/health'
    }
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('🚀 WhatsApp Marketing Backend');
  console.log('========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔗 API: http://172.20.10.2:${PORT}`);
  console.log(`📊 Health: http://172.20.10.2:${PORT}/api/health`);
  console.log('========================================');
  console.log('');
  console.log('📱 Note: WhatsApp integration happens on mobile app');
  console.log('   Server-side WhatsApp is commented out.');
  console.log('');
});

// Export for use in other files (if needed)
export { whatsappClient, isWhatsAppReady };