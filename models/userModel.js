// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// }, { timestamps: true });

// export default mongoose.model("User", userSchema);


import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },

    // ─── Email Verification ───────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyOTP: {
      type: String,
      default: null,
    },
    emailVerifyOTPExpires: {
      type: Date,
      default: null,
    },

    // ─── Password Reset ───────────────────────────────────
    passwordResetOTP: {
      type: String,
      default: null,
    },
    passwordResetOTPExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hide sensitive fields in JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerifyOTP;
  delete obj.emailVerifyOTPExpires;
  delete obj.passwordResetOTP;
  delete obj.passwordResetOTPExpires;
  return obj;
};

export default mongoose.model("User", userSchema);