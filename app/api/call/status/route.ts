import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const duration = formData.get('CallDuration');
    
    console.log('Call Status Update:', {
      callSid,
      callStatus,
      duration,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Status webhook error:', error);
    return NextResponse.json({ error: 'Failed to process status' }, { status: 500 });
  }
}