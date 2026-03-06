import { NextRequest, NextResponse } from 'next/server';

// Rate limiting helper (optional, using in-memory store)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get Zapier webhook URL from environment
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (!zapierWebhookUrl) {
      console.error('ZAPIER_WEBHOOK_URL not configured');
      return NextResponse.json(
        { success: false, message: 'Automation service not configured' },
        { status: 500 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // 3. Rate limiting (optional but recommended)
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { success: false, message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 4. Prepare payload for Zapier
    const zapierPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      source: 'automation_page'
    };

    // 5. Send to Zapier webhook
    const zapierResponse = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(zapierPayload)
    });

    if (!zapierResponse.ok) {
      console.error('Zapier webhook error:', zapierResponse.status, zapierResponse.statusText);
      
      // Don't expose Zapier errors to client
      return NextResponse.json(
        { success: false, message: 'Unable to process automation. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Optional: Log success (can integrate with Postgres/Redis)
    console.log('Automation triggered successfully for:', email);

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: 'Your request has been submitted successfully!'
    });

  } catch (error) {
    console.error('Automation API error:', error);
    
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}