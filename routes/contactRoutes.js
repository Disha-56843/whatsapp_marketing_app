import express from "express";
import {
  addContact,
  getContacts,
  deleteContact,
  importContacts,
} from "../controllers/contactController.js";


const router = express.Router();

router.post("/", importContacts);
router.get("/", getContacts);
router.delete("/:id", deleteContact);
router.post("/import", importContacts); // for future CSV import

export default router;
