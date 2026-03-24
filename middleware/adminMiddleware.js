import User from "../models/userModel.js";

const getAdminEmails = () =>
  new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    const user = await User.findById(req.userId).select("name email isAdmin");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const adminEmails = getAdminEmails();
    const isAllowedAdmin = user.isAdmin || adminEmails.has(user.email.toLowerCase());

    if (!isAllowedAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    req.admin = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Admin auth error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to verify admin access",
    });
  }
};

