import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pitch = searchParams.get('pitch') || '';
  const productName = searchParams.get('productName') || '';
  const voice = searchParams.get('voice') || 'Polly.Joanna'; 

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const safePitch = escapeXml(pitch);
  const safeProductName = escapeXml(productName);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">
    Hello! This is a call from ${safeProductName}. How are you doing today?
  </Say>
  <Pause length="1"/>
  <Say voice="${voice}">
    ${safePitch}
  </Say>
  <Pause length="2"/>
  <Say voice="${voice}">
    Thank you for your time. Have a great day!
  </Say>
</Response>`;

  return new NextResponse(twiml, {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

// POST should NOT take a Twilio request
export const POST = GET;
