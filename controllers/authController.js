import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import { validateEmailDomain } from "../utils/emailValidator.js";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse.js";

const getAdminEmails = () =>
  new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

// ─── REGISTER ─────────────────────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return validationErrorResponse(res, errors);

  try {
    const { name, email, password } = req.body;

    // ✅ Check if email domain is real (has MX records)
    const domainCheck = await validateEmailDomain(email);
    if (!domainCheck.valid) {
      return errorResponse(res, domainCheck.reason, 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return errorResponse(res, "An account with this email already exists.", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isAdmin = getAdminEmails().has(email.toLowerCase());

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: true,
      isAdmin,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return successResponse(
      res,
      {
        token,
        user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
      },
      "Account created successfully!",
      201
    );
  } catch (error) {
    console.error("❌ Register error:", error);
    return errorResponse(res, "Registration failed. Please try again.");
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    console.log(`✅ Login successful: ${email}`);

    return successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin },
    }, "Login successful");
  } catch (error) {
    console.error("❌ Login error:", error);
    return errorResponse(res, "Login failed. Please try again.");
  }
};

// ─── FORGOT PASSWORD (disabled until domain ready) ────────────────────────────
export const forgotPassword = async (req, res) => {
  return errorResponse(res, "Password reset is not available yet.", 503);
};

// ─── RESET PASSWORD (disabled until domain ready) ─────────────────────────────
export const resetPassword = async (req, res) => {
  return errorResponse(res, "Password reset is not available yet.", 503);
};

// ─── VERIFY EMAIL (disabled until domain ready) ───────────────────────────────
export const verifyEmailOTP = async (req, res) => {
  return errorResponse(res, "Email verification is not required.", 400);
};

// ─── RESEND OTP (disabled until domain ready) ─────────────────────────────────
export const resendVerificationOTP = async (req, res) => {
  return errorResponse(res, "Email verification is not required.", 400);
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

// ─── Google Login ─────────────────────────────────────────────────────────

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/auth/google', async (req, res) => {
  const { idToken, email, name } = req.body;
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  // Find or create user by email, then return your normal JWT
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ name, email, password: '' });
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({ success: true, token });
});
