import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";
import {
  getAdminOverview,
  getAdminRecentActivity,
  getAdminDatabaseDetails,
  getAdminUsers,
  getAdminUserDetails,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get("/overview", getAdminOverview);
router.get("/recent-activity", getAdminRecentActivity);
router.get("/database", getAdminDatabaseDetails);
router.get("/users", getAdminUsers);
router.get("/users/:userId", getAdminUserDetails);

export default router;
