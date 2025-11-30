// ============================================
// authController.js - COMPLETE & FIXED
// Location: backend/controllers/authController.js
// ============================================

import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ============================================
// REGISTER USER
// ============================================
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide name, email, and password" 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: "User already exists with this email" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ 
      name, 
      email, 
      password: hashedPassword 
    });

    // Return success (without password)
    res.status(201).json({ 
      success: true,
      message: "User registered successfully", 
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during registration", 
      error: error.message 
    });
  }
};

// ============================================
// LOGIN USER
// ============================================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📝 Login attempt for:", email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Please provide email and password" 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(400).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined in .env file!");
      return res.status(500).json({ 
        success: false,
        message: "Server configuration error" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful for:", email);

    // Return success
    res.json({ 
      success: true,
      message: "Login successful",
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during login", 
      error: error.message 
    });
  }
};

// ============================================
// GET CURRENT USER (Optional - for profile)
// ============================================
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};