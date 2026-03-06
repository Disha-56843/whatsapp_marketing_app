// import nodemailer from "nodemailer";

// // Create transporter
// const createTransporter = () => {
//   return nodemailer.createTransport({
//     host: process.env.EMAIL_HOST || "smtp.gmail.com",
//     port: parseInt(process.env.EMAIL_PORT) || 587,
//     secure: false, // true for port 465
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });
// };

// // Generate 6-digit OTP
// export const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Send OTP email
// export const sendOTPEmail = async (email, otp, type = "verify") => {
//   try {
//     const transporter = createTransporter();

//     const subjects = {
//       verify: "Verify Your Email - WhatsApp Marketing",
//       reset: "Password Reset OTP - WhatsApp Marketing",
//       login: "Login OTP - WhatsApp Marketing",
//     };

//     const messages = {
//       verify: `Welcome! Your email verification OTP is: <strong>${otp}</strong>`,
//       reset: `Your password reset OTP is: <strong>${otp}</strong>`,
//       login: `Your login verification OTP is: <strong>${otp}</strong>`,
//     };

//     const mailOptions = {
//       from: process.env.EMAIL_FROM || `"WhatsApp Marketing" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: subjects[type] || subjects.verify,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
//           <h2 style="color: #25D366; margin-bottom: 8px;">WhatsApp Marketing</h2>
//           <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
//           <p style="color: #374151; font-size: 15px;">${messages[type] || messages.verify}</p>
//           <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
//             <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otp}</span>
//           </div>
//           <p style="color: #6b7280; font-size: 13px;">This OTP expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>. Do not share it with anyone.</p>
//           <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
//         </div>
//       `,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`✅ OTP email sent to: ${email}`);
//     return true;
//   } catch (error) {
//     console.error("❌ Email send error:", error.message);
//     throw new Error("Failed to send OTP email. Check your email configuration.");
//   }
// };

import nodemailer from "nodemailer";

// Create transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 465;
  const secure = port === 465; // true for 465, false for 587

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // helps on some cloud platforms
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp, type = "verify") => {
  try {
    const transporter = createTransporter();

    const subjects = {
      verify: "Verify Your Email - WhatsApp Marketing",
      reset: "Password Reset OTP - WhatsApp Marketing",
      login: "Login OTP - WhatsApp Marketing",
    };

    const messages = {
      verify: `Welcome! Your email verification OTP is: <strong>${otp}</strong>`,
      reset: `Your password reset OTP is: <strong>${otp}</strong>`,
      login: `Your login verification OTP is: <strong>${otp}</strong>`,
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"WhatsApp Marketing" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subjects[type] || subjects.verify,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #25D366; margin-bottom: 8px;">WhatsApp Marketing</h2>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #374151; font-size: 15px;">${messages[type] || messages.verify}</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This OTP expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to: ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    throw new Error("Failed to send OTP email. Check your email configuration.");
  }
};