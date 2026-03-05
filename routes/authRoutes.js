// import express from "express";
// import { registerUser, loginUser } from "../controllers/authController.js";

// const router = express.Router();

// router.post("/register", registerUser);
// router.post("/login", loginUser);

// export default router;


import express from "express";
import {
  registerUser,
  loginUser,
  verifyEmailOTP,
  resendVerificationOTP,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";
import {
  validateRegister,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
} from "../middleware/validators.js";

const router = express.Router();

// Public routes
router.post("/register", authLimiter, validateRegister, registerUser);
router.post("/login", authLimiter, validateLogin, loginUser);
router.post("/verify-email", otpLimiter, validateOTP, verifyEmailOTP);
router.post("/resend-otp", otpLimiter, validateForgotPassword, resendVerificationOTP);
router.post("/forgot-password", otpLimiter, validateForgotPassword, forgotPassword);
router.post("/reset-password", otpLimiter, validateResetPassword, resetPassword);

// Protected routes
router.get("/me", authMiddleware, getMe);

export default router;