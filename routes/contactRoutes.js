// import express from "express";
// import {
//   addContact,
//   getContacts,
//   deleteContact,
//   importContacts,
// } from "../controllers/contactController.js";


// const router = express.Router();

// router.post("/", importContacts);
// router.get("/", getContacts);
// router.delete("/:id", deleteContact);
// router.post("/import", importContacts); // for future CSV import

// export default router;


import express from "express";
import {
  addContact,
  getContacts,
  deleteContact,
  importContacts,
} from "../controllers/contactController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.get("/", authMiddleware, getContacts);
router.post("/", authMiddleware, addContact);
router.post("/import", authMiddleware, importContacts);
router.delete("/:id", authMiddleware, deleteContact);

export default router;