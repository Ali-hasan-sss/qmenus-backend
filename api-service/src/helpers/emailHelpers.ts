import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { createHash } from "crypto";
import https from "https";
import fs from "fs";

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

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "mail.qmenussy.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10); // Default to 465 (SSL)
const SMTP_SECURE = process.env.SMTP_SECURE !== "false"; // Default: true (SSL for port 465)
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_FROM || "Q-menus";
const SMTP_PASS = process.env.SMTP_PASS || "";
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
// Email sender name (displayed in email clients)
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "Q-menus";
// Logo URL for emails (can be absolute URL or relative path)
const EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL || "https://www.qmenussy.com/images/logo.png";
// Contact form recipient email (Gmail or any email to receive contact form messages)
const CONTACT_RECIPIENT_EMAIL =
  process.env.CONTACT_RECIPIENT_EMAIL || "emonate8@gmail.com";
const SMTP_IGNORE_TLS = process.env.SMTP_IGNORE_TLS === "true"; // Ignore TLS/STARTTLS if true
// requireTLS is only for STARTTLS (port 587), NOT for SSL (port 465)
// Default: false - TLS is optional for port 587, not needed for port 465
const SMTP_REQUIRE_TLS = process.env.SMTP_REQUIRE_TLS === "true"; // Default: false

// Create nodemailer transporter configuration
const transporterConfig: any = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // Connection timeout (increased for better reliability)
  connectionTimeout: 30000, // 30 seconds (increased from 15)
  // Socket timeout (increased for better reliability)
  socketTimeout: 30000, // 30 seconds (increased from 15)
  // Greeting timeout
  greetingTimeout: 30000, // 30 seconds
  // Connection pooling - disabled for now to avoid connection issues
  // Some SMTP servers don't handle connection pooling well
  pool: false, // Disable pooling to avoid ECONNRESET issues
  // Additional connection options
  requireTLS: false, // Will be set based on SMTP_SECURE below
  // Disable automatic connection closing
  disableFileAccess: true,
  disableUrlAccess: true,
};

// TLS/SSL configuration
if (!SMTP_IGNORE_TLS) {
  transporterConfig.tls = {
    // Do not fail on invalid certificates (useful for self-signed certs in development)
    // In production with valid certificates, you can set this to true for better security
    rejectUnauthorized: false,
    // Use TLS 1.2 as minimum (more secure than TLSv1, compatible with most servers)
    // This allows TLS 1.2 and TLS 1.3
    minVersion: "TLSv1.2",
    // Enable SNI (Server Name Indication) for better TLS handshake
    servername: SMTP_HOST,
    // Additional options for better connection stability
    // Don't reuse sessions to avoid connection issues
    sessionReuse: false,
    // Don't specify ciphers - let Node.js choose the best available
  };

  // requireTLS is ONLY for STARTTLS (port 587), NOT for SSL (port 465)
  // When using SSL (port 465), secure=true handles encryption automatically
  // requireTLS should NEVER be true when using SSL - this will cause connection failures
  if (SMTP_SECURE) {
    // Port 465 with SSL - requireTLS MUST be false
    // SSL encryption is handled by secure=true, requireTLS is not needed
    transporterConfig.requireTLS = false;

    // Warn if someone tries to set requireTLS=true with SSL (this is incorrect)
    if (SMTP_REQUIRE_TLS === true) {
      console.warn(
        "⚠️ Warning: SMTP_REQUIRE_TLS=true is ignored when using SSL (port 465)"
      );
      console.warn(
        "   requireTLS is only for STARTTLS (port 587), not for SSL"
      );
    }
  } else {
    // Port 587 with STARTTLS - make TLS optional by default
    // Only require TLS if explicitly set to true
    // Default is false to avoid "TLS not available" errors
    transporterConfig.requireTLS =
      SMTP_REQUIRE_TLS === true && !SMTP_IGNORE_TLS;
  }
} else {
  // Ignore TLS completely (for servers that don't support it)
  transporterConfig.ignoreTLS = true;
  transporterConfig.requireTLS = false;
}

// Debug mode (set to true for troubleshooting)
if (process.env.SMTP_DEBUG === "true") {
  transporterConfig.debug = true;
  transporterConfig.logger = true;
}

// Create nodemailer transporter
const transporter = nodemailer.createTransport(transporterConfig);

// Verify email configuration
console.log("🔍 Email configuration check:");
console.log("SMTP_HOST:", SMTP_HOST ? `✅ ${SMTP_HOST}` : "❌ Not set");
console.log("SMTP_PORT:", SMTP_PORT ? `✅ ${SMTP_PORT}` : "❌ Not set");
console.log(
  "SMTP_SECURE:",
  SMTP_SECURE ? "✅ true (SSL)" : "❌ false (STARTTLS)"
);
console.log("SMTP_USER:", SMTP_USER ? "✅ Set" : "❌ Not set");
console.log("SMTP_PASS:", SMTP_PASS ? "✅ Set" : "❌ Not set");
console.log("EMAIL_FROM:", EMAIL_FROM ? `✅ ${EMAIL_FROM}` : "❌ Not set");
console.log(
  "SMTP_IGNORE_TLS:",
  SMTP_IGNORE_TLS ? "⚠️ TLS ignored" : "✅ TLS enabled"
);
console.log(
  "SMTP_REQUIRE_TLS:",
  SMTP_REQUIRE_TLS ? "✅ TLS required" : "❌ TLS optional"
);

// Verify transporter connection (optional, non-blocking)
// Note: This runs in background and won't block the application
transporter.verify((error) => {
  if (error) {
    console.error("⚠️ SMTP connection error:", error.message);
    if (
      error.message.includes("STARTTLS") ||
      error.message.includes("TLS not available")
    ) {
      console.error(
        "💡 Tip: Use SMTP_PORT=465 with SMTP_SECURE=true to avoid STARTTLS issues"
      );
      console.error("   Or set SMTP_REQUIRE_TLS=false if using port 587");
    }
  } else {
    console.log("✅ SMTP server is ready to send emails");
    console.log(
      `   Configuration: ${SMTP_HOST}:${SMTP_PORT} (${
        SMTP_SECURE ? "SSL" : "STARTTLS"
      })`
    );
  }
});

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

// Helper function to download logo for email attachment (if URL is provided)
async function downloadLogoForEmail(logoUrl: string): Promise<Buffer | null> {
  // If logo URL is a local file path, read it directly
  if (
    logoUrl.startsWith("/") ||
    logoUrl.startsWith("./") ||
    logoUrl.startsWith("../")
  ) {
    try {
      const logoPath = path.isAbsolute(logoUrl)
        ? logoUrl
        : path.join(process.cwd(), logoUrl);
      if (fs.existsSync(logoPath)) {
        return fs.readFileSync(logoPath);
      }
    } catch (error) {
      console.warn("⚠️ Could not read local logo file:", logoUrl);
    }
  }

  // If logo URL is HTTP/HTTPS, download it
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    try {
      return new Promise((resolve, reject) => {
        https
          .get(logoUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(
                new Error(`Failed to download logo: ${response.statusCode}`)
              );
              return;
            }

            const chunks: Buffer[] = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => resolve(Buffer.concat(chunks)));
            response.on("error", reject);
          })
          .on("error", reject);
      });
    } catch (error) {
      console.warn("⚠️ Could not download logo from URL:", logoUrl);
      return null;
    }
  }

  return null;
}

// Helper function to send email using nodemailer with retry logic
async function sendEmail(
  options: {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
    includeLogo?: boolean; // Whether to include logo as attachment
  },
  retries: number = 2
): Promise<boolean> {
  if (!EMAIL_FROM || !SMTP_USER || !SMTP_PASS) {
    console.error(
      "❌ Email configuration not complete. Please set SMTP_USER, SMTP_PASS, and EMAIL_FROM"
    );
    return false;
  }

  // Prepare attachments if logo should be included
  const attachments: any[] = [];
  let processedHtml = options.html;

  if (options.includeLogo && EMAIL_LOGO_URL) {
    try {
      const logoBuffer = await downloadLogoForEmail(EMAIL_LOGO_URL);
      if (logoBuffer) {
        // Determine content type from URL extension
        const contentType = EMAIL_LOGO_URL.toLowerCase().endsWith(".png")
          ? "image/png"
          : EMAIL_LOGO_URL.toLowerCase().endsWith(".jpg") ||
            EMAIL_LOGO_URL.toLowerCase().endsWith(".jpeg")
          ? "image/jpeg"
          : EMAIL_LOGO_URL.toLowerCase().endsWith(".svg")
          ? "image/svg+xml"
          : "image/png"; // Default to PNG

        attachments.push({
          filename: "qmenus-logo.png",
          content: logoBuffer,
          cid: "qmenus-logo", // Content-ID for inline image
          contentType: contentType,
        });

        // Replace logo URL in HTML with CID reference for better deliverability
        processedHtml = processedHtml.replace(
          new RegExp(
            EMAIL_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          ),
          "cid:qmenus-logo"
        );
      } else {
        // If download failed, use HTTPS URL as fallback (more reliable than HTTP)
        // Ensure URL is HTTPS for better email deliverability
        const httpsUrl = EMAIL_LOGO_URL.replace(/^http:/, "https:");
        processedHtml = processedHtml.replace(
          new RegExp(
            EMAIL_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "g"
          ),
          httpsUrl
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ Could not attach logo, using HTTPS URL fallback:",
        error
      );
      // Use HTTPS URL as fallback
      const httpsUrl = EMAIL_LOGO_URL.replace(/^http:/, "https:");
      processedHtml = processedHtml.replace(
        new RegExp(EMAIL_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        httpsUrl
      );
    }
  } else if (EMAIL_LOGO_URL) {
    // Even if not attaching, ensure HTTPS for better deliverability
    const httpsUrl = EMAIL_LOGO_URL.replace(/^http:/, "https:");
    processedHtml = processedHtml.replace(
      new RegExp(EMAIL_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      httpsUrl
    );
  }

  const mailOptions = {
    from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`, // Format: "Q-menus <info@qmenussy.com>"
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: processedHtml,
    replyTo: options.replyTo,
    attachments: attachments.length > 0 ? attachments : undefined,
  };

  // Retry logic for transient errors
  for (let attempt = 0; attempt <= retries; attempt++) {
    let currentTransporter = transporter;
    let shouldCloseTransporter = false;

    try {
      // Create a fresh transporter for retry attempts to avoid connection reuse issues
      // This helps with ECONNRESET errors that occur when reusing stale connections
      if (attempt > 0) {
        // Create a new transporter with fresh config for retry attempts
        // This ensures we don't reuse a potentially broken connection
        currentTransporter = nodemailer.createTransport({
          ...transporterConfig,
          // Ensure TLS config is properly copied
          tls: transporterConfig.tls ? { ...transporterConfig.tls } : undefined,
        });
        shouldCloseTransporter = true;
      }

      const info = await currentTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully. Message ID: ${info.messageId}`);

      // Close the new transporter if we created one
      if (shouldCloseTransporter) {
        currentTransporter.close();
      }

      return true;
    } catch (error: any) {
      // Close the new transporter if we created one and it failed
      if (shouldCloseTransporter && currentTransporter !== transporter) {
        try {
          currentTransporter.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
      const isLastAttempt = attempt === retries;
      const errorMessage = error.message || String(error);

      // Check if error is retryable (transient network errors)
      const isRetryable =
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("socket") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("TLS") ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (isRetryable && !isLastAttempt) {
        const waitTime = (attempt + 1) * 1000; // Exponential backoff: 1s, 2s, 3s...
        console.warn(
          `⚠️ SMTP connection error (attempt ${attempt + 1}/${
            retries + 1
          }): ${errorMessage}`
        );
        console.log(`   Retrying in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue; // Retry
      }

      // Non-retryable error or last attempt
      console.error(
        `❌ Error sending email (attempt ${attempt + 1}/${retries + 1}):`,
        errorMessage
      );

      // Provide helpful error messages
      if (
        errorMessage.includes("STARTTLS") ||
        errorMessage.includes("TLS not available")
      ) {
        console.error(
          "💡 Tip: If using port 587, try switching to port 465 with SMTP_SECURE=true"
        );
        console.error("   Or set SMTP_REQUIRE_TLS=false if using port 587");
      } else if (errorMessage.includes("authentication")) {
        console.error("💡 Tip: Check your SMTP_USER and SMTP_PASS credentials");
      } else if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("timeout")
      ) {
        console.error("💡 Tip: Check your SMTP_HOST and SMTP_PORT settings");
      } else if (errorMessage.includes("ECONNRESET")) {
        console.error(
          "💡 Tip: SMTP server closed the connection. This might be a temporary network issue."
        );
        console.error(
          "   The system will retry automatically. If it persists, check:"
        );
        console.error("   - Network connectivity to SMTP server");
        console.error("   - SMTP server status");
        console.error("   - Firewall settings");
      }

      if (isLastAttempt) {
        return false;
      }
    }
  }

  return false;
}

// Test email sending function (for debugging)
export async function testEmailSending(
  testEmail: string = "test@example.com"
): Promise<boolean> {
  console.log("🧪 Testing email sending...");
  console.log(`   To: ${testEmail}`);
  console.log(`   From: ${EMAIL_FROM}`);
  console.log(
    `   SMTP: ${SMTP_HOST}:${SMTP_PORT} (${SMTP_SECURE ? "SSL" : "STARTTLS"})`
  );

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: "Test Email - QMenus SMTP Configuration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f97316;">Email Test Successful! 🎉</h2>
          <p>This is a test email to verify SMTP configuration.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${SMTP_HOST}</li>
            <li>Port: ${SMTP_PORT}</li>
            <li>Secure: ${SMTP_SECURE ? "Yes (SSL)" : "No (STARTTLS)"}</li>
            <li>From: ${EMAIL_FROM}</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            If you received this email, your SMTP configuration is working correctly!
          </p>
        </div>
      `,
    });

    if (result) {
      console.log("✅ Test email sent successfully!");
      return true;
    } else {
      console.error("❌ Test email failed to send");
      return false;
    }
  } catch (error: any) {
    console.error("❌ Error in test email:", error.message);
    return false;
  }
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationCode: string
): Promise<boolean> {
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;" />
        </div>
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
  `;

  return await sendEmail({
    to: email,
    subject: "تحقق من بريدك الإلكتروني - QMenus",
    html,
    includeLogo: true, // Include logo as attachment for better deliverability
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetCode: string
): Promise<boolean> {
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;" />
        </div>
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
  `;

  return await sendEmail({
    to: email,
    subject: "إعادة تعيين كلمة المرور - QMenus",
    html,
    includeLogo: true, // Include logo as attachment for better deliverability
  });
}

// Send English verification email
export async function sendVerificationEmailEN(
  email: string,
  firstName: string,
  verificationCode: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;" />
        </div>
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
  `;

  return await sendEmail({
    to: email,
    subject: "Verify Your Email - QMenus",
    html,
    includeLogo: true, // Include logo as attachment for better deliverability
  });
}

// Send English password reset email
export async function sendPasswordResetEmailEN(
  email: string,
  firstName: string,
  resetCode: string
): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${EMAIL_LOGO_URL}" alt="Q-menus Logo" title="Q-menus" style="max-width: 120px; height: auto; display: block; margin: 0 auto;" />
        </div>
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
  `;

  return await sendEmail({
    to: email,
    subject: "Reset Your Password - QMenus",
    html,
    includeLogo: true, // Include logo as attachment for better deliverability
  });
}

// Send contact us email
export async function sendContactUsEmail(
  name: string,
  email: string,
  message: string,
  toEmail?: string
): Promise<boolean> {
  // Priority: 1. CONTACT_RECIPIENT_EMAIL (Gmail), 2. provided toEmail, 3. CONTACT_EMAIL, 4. EMAIL_FROM
  const recipientEmail =
    CONTACT_RECIPIENT_EMAIL ||
    toEmail ||
    process.env.CONTACT_EMAIL ||
    EMAIL_FROM;

  if (!recipientEmail) {
    console.error(
      "❌ Contact email not configured. Please set CONTACT_EMAIL or EMAIL_FROM environment variable."
    );
    return false;
  }

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">رسالة جديدة من نموذج اتصل بنا</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
            <strong style="color: #333;">الاسم:</strong> ${name}
          </p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
            <strong style="color: #333;">البريد الإلكتروني:</strong> 
            <a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a>
          </p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">الرسالة:</h3>
          <p style="font-size: 16px; line-height: 1.8; color: #333; white-space: pre-wrap; margin: 0;">${message}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            © 2024 QMenus. جميع الحقوق محفوظة.
          </p>
          <p style="font-size: 11px; color: #999; margin-top: 10px;">
            يمكنك الرد مباشرة على هذا البريد للتواصل مع ${name}
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    subject: `رسالة جديدة من نموذج اتصل بنا - ${name}`,
    html,
    replyTo: email, // Allow replying directly to the sender
  });
}

// Send contact us email (English version)
export async function sendContactUsEmailEN(
  name: string,
  email: string,
  message: string,
  toEmail?: string
): Promise<boolean> {
  // Priority: 1. CONTACT_RECIPIENT_EMAIL (Gmail), 2. provided toEmail, 3. CONTACT_EMAIL, 4. EMAIL_FROM
  const recipientEmail =
    CONTACT_RECIPIENT_EMAIL ||
    toEmail ||
    process.env.CONTACT_EMAIL ||
    EMAIL_FROM;

  if (!recipientEmail) {
    console.error(
      "❌ Contact email not configured. Please set CONTACT_EMAIL or EMAIL_FROM environment variable."
    );
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #f97316; text-align: center; margin-bottom: 30px;">New Contact Form Message</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
            <strong style="color: #333;">Name:</strong> ${name}
          </p>
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
            <strong style="color: #333;">Email:</strong> 
            <a href="mailto:${email}" style="color: #f97316; text-decoration: none;">${email}</a>
          </p>
        </div>
        
        <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Message:</h3>
          <p style="font-size: 16px; line-height: 1.8; color: #333; white-space: pre-wrap; margin: 0;">${message}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            © 2024 QMenus. All rights reserved.
          </p>
          <p style="font-size: 11px; color: #999; margin-top: 10px;">
            You can reply directly to this email to contact ${name}
          </p>
        </div>
      </div>
    </div>
  `;

  return await sendEmail({
    to: recipientEmail,
    subject: `New Contact Form Message - ${name}`,
    html,
    replyTo: email, // Allow replying directly to the sender
  });
}
