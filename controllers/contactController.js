import Contact from "../models/contactModel.js";

/**
 * Add a single contact manually
 */
export const addContact = async (req, res) => {
  try {
    const { name, phone, email, tags, owner } = req.body;

    if (!name || !phone || !owner)
      return res.status(400).json({ message: "Name, phone, and owner are required." });

    const contactExists = await Contact.findOne({ phone, owner });
    if (contactExists)
      return res.status(400).json({ message: "Contact already exists." });

    const contact = await Contact.create({ name, phone, email, tags, owner });

    res.status(201).json({ message: "Contact added successfully.", contact });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Get all contacts for a user
 */
export const getContacts = async (req, res) => {
  try {
    const { owner } = req.query;

    const contacts = await Contact.find({ owner }).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Delete a contact by ID
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    await contact.deleteOne();
    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Import multiple contacts (future CSV/Excel upload)
 */
export const importContacts = async (req, res) => {
  try {
    const { contacts, batchName } = req.body;

    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ message: "No contacts provided" });
    }

    // Generate a batch name if not provided (timestamp based)
    const batch = batchName || `batch_${Date.now()}`;

    // Add batch name to each contact
    const contactsWithBatch = contacts.map((c) => ({
      ...c,
      batchName: batch,
    }));

    // Save contacts in MongoDB
    const savedContacts = await Contact.insertMany(contactsWithBatch);

    res.status(201).json({
      message: "Contacts imported successfully",
      batch: batch,
      count: savedContacts.length,
    });
  } catch (error) {
    console.error("Error importing contacts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

