// emailService.js - Using Resend (resend.com)
// Install: npm install resend

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email via Resend
export const sendOTPEmail = async (email, otp, type = "verify") => {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "WhatsApp Marketing <onboarding@resend.dev>",
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
    });

    if (error) {
      console.error("❌ Resend error:", error);
      throw new Error(error.message);
    }

    console.log(`✅ OTP email sent to: ${email} (id: ${data.id})`);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    throw new Error("Failed to send OTP email. Check your RESEND_API_KEY.");
  }
};