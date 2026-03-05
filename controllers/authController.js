// // ============================================
// // authController.js - COMPLETE & FIXED
// // Location: backend/controllers/authController.js
// // ============================================

// import User from "../models/userModel.js";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// // ============================================
// // REGISTER USER
// // ============================================
// export const registerUser = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     // Validate input
//     if (!name || !email || !password) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Please provide name, email, and password" 
//       });
//     }

//     // Check if user already exists
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ 
//         success: false,
//         message: "User already exists with this email" 
//       });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create user
//     const user = await User.create({ 
//       name, 
//       email, 
//       password: hashedPassword 
//     });

//     // Return success (without password)
//     res.status(201).json({ 
//       success: true,
//       message: "User registered successfully", 
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email
//       }
//     });
//   } catch (error) {
//     console.error("❌ Register error:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error during registration", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // LOGIN USER
// // ============================================
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     console.log("📝 Login attempt for:", email);

//     // Validate input
//     if (!email || !password) {
//       return res.status(400).json({ 
//         success: false,
//         message: "Please provide email and password" 
//       });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });
    
//     if (!user) {
//       console.log("❌ User not found:", email);
//       return res.status(400).json({ 
//         success: false,
//         message: "Invalid email or password" 
//       });
//     }

//     // Compare password
//     const isMatch = await bcrypt.compare(password, user.password);
    
//     if (!isMatch) {
//       console.log("❌ Password mismatch for:", email);
//       return res.status(400).json({ 
//         success: false,
//         message: "Invalid email or password" 
//       });
//     }

//     // Check if JWT_SECRET exists
//     if (!process.env.JWT_SECRET) {
//       console.error("❌ JWT_SECRET is not defined in .env file!");
//       return res.status(500).json({ 
//         success: false,
//         message: "Server configuration error" 
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user._id }, 
//       process.env.JWT_SECRET, 
//       { expiresIn: "7d" }
//     );

//     console.log("✅ Login successful for:", email);

//     // Return success
//     res.json({ 
//       success: true,
//       message: "Login successful",
//       token, 
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email
//       }
//     });
//   } catch (error) {
//     console.error("❌ Login error:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error during login", 
//       error: error.message 
//     });
//   }
// };

// // ============================================
// // GET CURRENT USER (Optional - for profile)
// // ============================================
// export const getCurrentUser = async (req, res) => {
//   try {
//     const userId = req.userId; // From auth middleware

//     const user = await User.findById(userId).select('-password');
    
//     if (!user) {
//       return res.status(404).json({ 
//         success: false,
//         message: "User not found" 
//       });
//     }

//     res.json({ 
//       success: true,
//       user 
//     });
//   } catch (error) {
//     console.error("❌ Get user error:", error);
//     res.status(500).json({ 
//       success: false,
//       message: "Server error", 
//       error: error.message 
//     });
//   }
// };

import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { generateOTP, sendOTPEmail } from "../utils/emailService.js";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse.js";

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, "An account with this email already exists.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerifyOTP: otp,
      emailVerifyOTPExpires: otpExpires,
    });

    // Send OTP email
    await sendOTPEmail(email, otp, "verify");

    return successResponse(
      res,
      { userId: user._id },
      `Account created! Please check ${email} for your verification OTP.`,
      201
    );
  } catch (error) {
    console.error("❌ Register error:", error);
    return errorResponse(res, error.message || "Registration failed. Please try again.");
  }
};

// ─── VERIFY EMAIL OTP ─────────────────────────────────────────────────────────
export const verifyEmailOTP = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select(
      "+emailVerifyOTP +emailVerifyOTPExpires"
    );

    if (!user) return errorResponse(res, "Account not found.", 404);
    if (user.isEmailVerified) return errorResponse(res, "Email is already verified.", 400);
    if (!user.emailVerifyOTP) return errorResponse(res, "No pending OTP. Please request a new one.", 400);
    if (new Date() > user.emailVerifyOTPExpires) {
      return errorResponse(res, "OTP has expired. Please request a new one.", 400);
    }
    if (user.emailVerifyOTP !== otp) {
      return errorResponse(res, "Invalid OTP. Please check and try again.", 400);
    }

    // Mark verified and clear OTP
    user.isEmailVerified = true;
    user.emailVerifyOTP = null;
    user.emailVerifyOTPExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email },
    }, "Email verified successfully! You are now logged in.");
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    return errorResponse(res, "Verification failed. Please try again.");
  }
};

// ─── RESEND VERIFICATION OTP ──────────────────────────────────────────────────
export const resendVerificationOTP = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return errorResponse(res, "Account not found.", 404);
    if (user.isEmailVerified) return errorResponse(res, "Email is already verified.", 400);

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    user.emailVerifyOTP = otp;
    user.emailVerifyOTPExpires = otpExpires;
    await user.save();

    await sendOTPEmail(email, otp, "verify");

    return successResponse(res, {}, `A new OTP has been sent to ${email}.`);
  } catch (error) {
    console.error("❌ Resend OTP error:", error);
    return errorResponse(res, error.message || "Failed to resend OTP.");
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return errorResponse(res, "Invalid email or password.", 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return errorResponse(res, "Invalid email or password.", 401);

    // Block login if email not verified
    if (!user.isEmailVerified) {
      // Re-send OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
      user.emailVerifyOTP = otp;
      user.emailVerifyOTPExpires = otpExpires;
      await user.save();
      await sendOTPEmail(email, otp, "verify");

      return errorResponse(
        res,
        "Please verify your email before logging in. A new OTP has been sent.",
        403
      );
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    console.log(`✅ Login successful: ${email}`);

    return successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email },
    }, "Login successful");
  } catch (error) {
    console.error("❌ Login error:", error);
    return errorResponse(res, "Login failed. Please try again.");
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse(res, {}, "If an account with that email exists, a reset OTP has been sent.");
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    user.passwordResetOTP = otp;
    user.passwordResetOTPExpires = otpExpires;
    await user.save();

    await sendOTPEmail(email, otp, "reset");

    return successResponse(res, {}, "If an account with that email exists, a reset OTP has been sent.");
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return errorResponse(res, error.message || "Failed to process request.");
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select(
      "+password +passwordResetOTP +passwordResetOTPExpires"
    );

    if (!user) return errorResponse(res, "Account not found.", 404);
    if (!user.passwordResetOTP) return errorResponse(res, "No reset request found. Please request a new OTP.", 400);
    if (new Date() > user.passwordResetOTPExpires) {
      return errorResponse(res, "OTP has expired. Please request a new one.", 400);
    }
    if (user.passwordResetOTP !== otp) {
      return errorResponse(res, "Invalid OTP. Please check and try again.", 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetOTP = null;
    user.passwordResetOTPExpires = null;
    await user.save();

    return successResponse(res, {}, "Password reset successfully. Please login with your new password.");
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return errorResponse(res, "Password reset failed. Please try again.");
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return errorResponse(res, "User not found.", 404);
    return successResponse(res, { user });
  } catch (error) {
    console.error("❌ Get me error:", error);
    return errorResponse(res, "Failed to fetch user.");
  }
};