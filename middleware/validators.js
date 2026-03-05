import { body, param } from "express-validator";

// ─── Auth Validators ──────────────────────────────────────────────────────────

export const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

export const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

export const validateOTP = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
];

export const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),
];

export const validateResetPassword = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

// ─── Contact Validators ───────────────────────────────────────────────────────

export const validateContact = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ max: 100 }).withMessage("Name too long"),

  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage("Please enter a valid phone number (e.g. +919876543210)"),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage("Please enter a valid email address"),
];

// ─── Campaign Validators ──────────────────────────────────────────────────────

export const validateCampaign = [
  body("name")
    .trim()
    .notEmpty().withMessage("Campaign name is required")
    .isLength({ max: 100 }).withMessage("Campaign name too long"),

  body("message")
    .trim()
    .notEmpty().withMessage("Message is required")
    .isLength({ max: 4096 }).withMessage("Message too long (max 4096 characters)"),

  body("targetContacts")
    .isArray({ min: 1 }).withMessage("At least one contact is required")
    .custom((ids) => ids.every((id) => /^[a-f\d]{24}$/i.test(id)))
    .withMessage("Invalid contact IDs"),

  body("scheduledAt")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage("scheduledAt must be a valid date"),
];

export const validateMongoId = [
  param("id")
    .matches(/^[a-f\d]{24}$/i)
    .withMessage("Invalid ID format"),
];