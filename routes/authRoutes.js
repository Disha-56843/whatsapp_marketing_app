import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/userModel.js";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/register", registerUser);
router.post("/login", loginUser);

// ── Google Login ──────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { idToken, email, name } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    if (!ticket) {
      return res.status(401).json({ success: false, message: "Invalid Google token" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: "google_oauth",
        isEmailVerified: true,
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error("❌ Google login error:", error);
    return res.status(500).json({ success: false, message: "Google login failed", error: error.message });
  }
});

export default router;