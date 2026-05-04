import nodemailer from "nodemailer";

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
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
  } else {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
}

export async function sendVerificationEmail(toEmail: string, code: string) {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Ryvon Intelligence" <noreply@ryvon.ai>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: "Your Ryvon Verification Code",
      text: `Your Ryvon Intelligence verification code is: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0D14; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #4facfe; text-align: center;">Ryvon Intelligence</h2>
          <p style="font-size: 16px;">Hello,</p>
          <p style="font-size: 16px;">Your verification code is:</p>
          <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; font-size: 36px; letter-spacing: 5px; color: #4facfe;">${code}</h1>
          </div>
          <p style="font-size: 14px; color: #888;">This code will expire in 15 minutes.</p>
        </div>
      `,
    });

    console.log("Verification email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(toEmail: string) {
  try {
    const transporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Ryvon Intelligence" <noreply@ryvon.ai>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: "Welcome to Ryvon Intelligence!",
      text: `Welcome to Ryvon! Your account is now verified.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0A0D14; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #4facfe; text-align: center;">Welcome to Ryvon Intelligence</h2>
          <p style="font-size: 16px;">Your account has been successfully verified!</p>
          <p style="font-size: 16px;">You now have full access to our intelligent workflow automation and AI agents.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.ryvon.ai/" style="background-color: #4facfe; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">Launch Ryvon Dashboard</a>
          </div>
          <p style="font-size: 14px; color: #888;">If you have any questions, just reply to this email.</p>
        </div>
      `,
    });

    console.log("Welcome email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}
