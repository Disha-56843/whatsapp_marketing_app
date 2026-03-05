// // import mongoose from "mongoose";

// // const contactSchema = new mongoose.Schema(
// //   {
// //     name: { type: String, required: true },
// //     phone: { type: String, required: true },
// //     batchName: { type: String, required: true }, // unique for each upload
// //   },
// //   { timestamps: true }
// // );

// // const Contact = mongoose.model("Contact", contactSchema);
// // export default Contact;

// import mongoose from "mongoose";

// const contactSchema = new mongoose.Schema(
//   {
//     name: { 
//       type: String, 
//       required: true 
//     },
//     phone: { 
//       type: String, 
//       required: true 
//     },
//     email: {
//       type: String,
//       default: null
//     },
//     tags: [{
//       type: String
//     }],
//     batchName: { 
//       type: String, 
//       default: 'default'  // ← Changed: not required anymore
//     },
//     owner: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'User',
//       required: true  // ← This is why you're getting the error
//     }
//   },
//   { timestamps: true }
// );

// // Index for faster queries
// contactSchema.index({ owner: 1, phone: 1 });

// const Contact = mongoose.model("Contact", contactSchema);
// export default Contact;

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    tags: [{ type: String, trim: true }],
    batchName: {
      type: String,
      default: "default",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index: one phone per user
contactSchema.index({ owner: 1, phone: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);