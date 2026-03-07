// import Contact from "../models/contactModel.js";

// /**
//  * Add a single contact manually
//  */
// export const addContact = async (req, res) => {
//   try {
//     const { name, phone, email, tags, owner } = req.body;

//     if (!name || !phone || !owner)
//       return res.status(400).json({ message: "Name, phone, and owner are required." });

//     const contactExists = await Contact.findOne({ phone, owner });
//     if (contactExists)
//       return res.status(400).json({ message: "Contact already exists." });

//     const contact = await Contact.create({ name, phone, email, tags, owner });

//     res.status(201).json({ message: "Contact added successfully.", contact });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// /**
//  * Get all contacts for a user
//  */
// export const getContacts = async (req, res) => {
//   try {
//     const { owner } = req.query;

//     const contacts = await Contact.find({ owner }).sort({ createdAt: -1 });
//     res.json(contacts);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// /**
//  * Delete a contact by ID
//  */
// export const deleteContact = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const contact = await Contact.findById(id);
//     if (!contact) return res.status(404).json({ message: "Contact not found" });

//     await contact.deleteOne();
//     res.json({ message: "Contact deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// /**
//  * Import multiple contacts (future CSV/Excel upload)
//  */
// export const importContacts = async (req, res) => {
//   try {
//     const { contacts, batchName } = req.body;

//     if (!contacts || contacts.length === 0) {
//       return res.status(400).json({ message: "No contacts provided" });
//     }

//     // Generate a batch name if not provided (timestamp based)
//     const batch = batchName || `batch_${Date.now()}`;

//     // Add batch name to each contact
//     const contactsWithBatch = contacts.map((c) => ({
//       ...c,
//       batchName: batch,
//     }));

//     // Save contacts in MongoDB
//     const savedContacts = await Contact.insertMany(contactsWithBatch);

//     res.status(201).json({
//       message: "Contacts imported successfully",
//       batch: batch,
//       count: savedContacts.length,
//     });
//   } catch (error) {
//     console.error("Error importing contacts:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };


import Contact from "../models/contactModel.js";

/**
 * Get all contacts for logged-in user
 */
export const getContacts = async (req, res) => {
  try {
    const userId = req.userId; // From auth middleware
    
    console.log('📥 GET /contacts - User:', userId);
    
    const contacts = await Contact.find({ owner: userId })
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${contacts.length} contacts`);
    
    // Return contacts directly as array for Flutter
    res.json(contacts);
    
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

/**
 * Add a single contact manually
 */
export const addContact = async (req, res) => {
  try {
    const { name, phone, email, tags } = req.body;
    const userId = req.userId; // From auth middleware

    if (!name || !phone) {
      return res.status(400).json({ 
        success: false,
        message: "Name and phone are required" 
      });
    }

    // Check if contact already exists for this user
    const contactExists = await Contact.findOne({ 
      phone, 
      owner: userId 
    });
    
    if (contactExists) {
      return res.status(400).json({ 
        success: false,
        message: "Contact already exists" 
      });
    }

    const contact = await Contact.create({ 
      name, 
      phone, 
      email, 
      tags,
      batchName: 'manual',
      owner: userId 
    });

    res.status(201).json({ 
      success: true,
      message: "Contact added successfully", 
      contact 
    });
    
  } catch (error) {
    console.error('❌ Error adding contact:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

/**
 * Delete a contact by ID
 */
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // From auth middleware

    const contact = await Contact.findOne({ 
      _id: id, 
      owner: userId 
    });
    
    if (!contact) {
      return res.status(404).json({ 
        success: false,
        message: "Contact not found" 
      });
    }

    await contact.deleteOne();
    
    res.json({ 
      success: true,
      message: "Contact deleted successfully" 
    });
    
  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};

/**
 * Import multiple contacts from Excel/CSV
 */
export const importContacts = async (req, res) => {
  try {
    const { contacts, batchName } = req.body;
    const userId = req.userId; // From auth middleware

    console.log('📥 POST /contacts/import');
    console.log('User:', userId);
    console.log('Contacts to import:', contacts?.length);

    if (!contacts || contacts.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No contacts provided" 
      });
    }

    // Generate batch name if not provided
    const batch = batchName || `batch_${Date.now()}`;

    // Add batch name and owner to each contact
    const contactsWithMeta = contacts.map((c) => ({
      name: c.name || 'Unknown',
      phone: c.phone,
      email: c.email || null,
      tags: c.tags || [],
      batchName: batch,
      owner: userId
    }));

    // Filter out contacts with missing phone numbers
    const validContacts = contactsWithMeta.filter(c => c.phone && c.phone.trim() !== '');

    if (validContacts.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No valid contacts found" 
      });
    }

    console.log(`✅ Importing ${validContacts.length} valid contacts`);

    // Save contacts in MongoDB
    const savedContacts = await Contact.insertMany(validContacts, {
      ordered: false // Continue on duplicates
    });

    console.log(`✅ Successfully imported ${savedContacts.length} contacts`);

    res.status(201).json({
      success: true,
      message: "Contacts imported successfully",
      batch: batch,
      count: savedContacts.length,
      total: contacts.length,
      skipped: contacts.length - savedContacts.length
    });
    
  } catch (error) {
    console.error("❌ Error importing contacts:", error);
    
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "Contacts imported with some duplicates skipped",
        error: "Some contacts already exist"
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error", 
      error: error.message 
    });
  }
};