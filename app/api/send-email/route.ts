import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, toName, from, fromName, subject, html } = await request.json();

    console.log('Sending email to:', to);

    // Validate required fields
    if (!to || !from || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Missing required email fields' },
        { status: 400 }
      );
    }

    // Use server-side SMTP configuration from environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('SMTP connection verified');

    // Send email
    const info = await transporter.sendMail({
      from: fromName ? `${fromName} <${from}>` : from,
      to: toName ? `${toName} <${to}>` : to,
      subject,
      html
    });

    console.log('Email sent successfully:', info.messageId);

    return NextResponse.json({ 
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully' 
    });

  } catch (error: unknown) {
    console.error('Error sending email:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}