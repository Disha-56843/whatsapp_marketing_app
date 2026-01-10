// import mongoose from "mongoose";

// const contactSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     phone: { type: String, required: true },
//     batchName: { type: String, required: true }, // unique for each upload
//   },
//   { timestamps: true }
// );

// const Contact = mongoose.model("Contact", contactSchema);
// export default Contact;


import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    phone: { 
      type: String, 
      required: true 
    },
    email: {
      type: String,
      default: null
    },
    tags: [{
      type: String
    }],
    batchName: { 
      type: String, 
      required: true 
    },
    owner: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    }
  },
  { timestamps: true }
);

// Index for faster queries
contactSchema.index({ owner: 1, phone: 1 });

const Contact = mongoose.model("Contact", contactSchema);
export default Contact;