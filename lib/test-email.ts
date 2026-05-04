import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testEmail() {
  console.log("Testing SMTP Configuration...");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_PASS:", process.env.SMTP_PASS ? "Set" : "Not Set");
  console.log("SMTP_FROM:", process.env.SMTP_FROM);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("Missing SMTP configuration in .env.local");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Ryvon" <noreply@ryvon.ai>',
      to: "test@example.com", // Just a dummy test target to see if auth succeeds
      subject: "Test Email",
      text: "Testing 123",
    });
    console.log("Success! Message sent:", info.messageId);
  } catch (error) {
    console.error("\n=== SMTP ERROR ===");
    console.error(error);
  }
}

testEmail().then(() => process.exit(0));
