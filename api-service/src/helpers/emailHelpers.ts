import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import { createHash } from "crypto";

// Try to load .env from backend root directory
const envPaths = [
  path.join(__dirname, "../../../.env"), // backend/.env
  path.join(__dirname, "../../../../.env"), // backend/.env (alternative)
  path.join(process.cwd(), ".env"), // Current working directory
  path.join(process.cwd(), "../.env"), // Parent directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

// Fallback: try default dotenv.config() if no file found
if (!envLoaded) {
  dotenv.config();
}
// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Verify email configuration
console.log("🔍 Email configuration check:");
console.log(
  "RESEND_API_KEY:",
  process.env.RESEND_API_KEY ? "✅ Set" : "❌ Not set"
);
console.log("EMAIL_FROM:", process.env.EMAIL_FROM ? "✅ Set" : "❌ Not set");

// Generate verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate password reset code
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Send verification email using Resend
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationCode: string
): Promise<boolean> {
  // TEMPORARY: Email verification disabled - always return true
  console.log("⚠️ Email verification disabled - skipping email send");
  console.log("📧 Verification code for", email, ":", verificationCode);
  return true;

  // Check if Resend configuration is available
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log("⚠️ Resend configuration not available, skipping email send");
    console.log("📧 Verification code for", email, ":", verificationCode);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "",
      to: [email],
      subject: "تحقق من بريدك الإلكتروني - QMenus",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">مرحباً ${firstName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              شكراً لانضمامك إلى QMenus! لتفعيل حسابك، يرجى استخدام رمز التحقق التالي:
            </p>
            
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <h1 style="font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              هذا الرمز صالح لمدة 15 دقيقة. إذا لم تطلب هذا التحقق، يرجى تجاهل هذا البريد الإلكتروني.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                © 2024 QMenus. جميع الحقوق محفوظة.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Error sending verification email:", error);
      return false;
    }

    console.log(`✅ Verification email sent to ${email}`, data?.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    return false;
  }
}

// Send password reset email using Resend
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetCode: string
): Promise<boolean> {
  // Check if Resend configuration is available
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log("⚠️ Resend configuration not available, skipping email send");
    console.log("📧 Reset code for", email, ":", resetCode);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "",
      to: [email],
      subject: "إعادة تعيين كلمة المرور - QMenus",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">مرحباً ${firstName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. استخدم الرمز التالي لإعادة تعيين كلمة المرور:
            </p>
            
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <h1 style="font-size: 32px; margin: 0; letter-spacing: 5px;">${resetCode}</h1>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              هذا الرمز صالح لمدة 1 ساعة. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                © 2024 QMenus. جميع الحقوق محفوظة.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Error sending password reset email:", error);
      return false;
    }

    console.log(`✅ Password reset email sent to ${email}`, data?.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    return false;
  }
}

// Send English verification email using Resend
export async function sendVerificationEmailEN(
  email: string,
  firstName: string,
  verificationCode: string
): Promise<boolean> {
  // Check if Resend configuration is available
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log("⚠️ Resend configuration not available, skipping email send");
    console.log("📧 Verification code for", email, ":", verificationCode);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "",
      to: [email],
      subject: "Verify Your Email - QMenus",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">Hello ${firstName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              Thank you for joining QMenus! To activate your account, please use the following verification code:
            </p>
            
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <h1 style="font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              This code is valid for 15 minutes. If you didn't request this verification, please ignore this email.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                © 2024 QMenus. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Error sending verification email:", error);
      return false;
    }

    console.log(`✅ Verification email sent to ${email}`, data?.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    return false;
  }
}

// Send English password reset email using Resend
export async function sendPasswordResetEmailEN(
  email: string,
  firstName: string,
  resetCode: string
): Promise<boolean> {
  // Check if Resend configuration is available
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log("⚠️ Resend configuration not available, skipping email send");
    console.log("📧 Reset code for", email, ":", resetCode);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "",
      to: [email],
      subject: "Reset Your Password - QMenus",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">Hello ${firstName}!</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              We received a request to reset your password. Use the following code to reset your password:
            </p>
            
            <div style="background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <h1 style="font-size: 32px; margin: 0; letter-spacing: 5px;">${resetCode}</h1>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              This code is valid for 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #999;">
                © 2024 QMenus. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Error sending password reset email:", error);
      return false;
    }

    console.log(`✅ Password reset email sent to ${email}`, data?.id);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    return false;
  }
}
