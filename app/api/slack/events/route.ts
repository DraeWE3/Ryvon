import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Handle Slack URL Verification
    if (body.type === 'url_verification') {
      return new NextResponse(body.challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Process other events here in the future
    // e.g., body.event.type === 'message'
    
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling Slack event:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
