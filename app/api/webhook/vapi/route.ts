import { NextRequest, NextResponse } from 'next/server';
import { getCallLogByCallId, updateCallLogStatus } from '@/lib/db/queries';

// Vapi Webhook Handler
// This endpoint receives real-time updates from Vapi regarding call status and results.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json({ success: false, error: 'No message in body' }, { status: 400 });
    }

    console.log(`[Vapi Webhook] Received event: ${message.type}`);

    // Handle end-of-call-report for final data and status
    if (message.type === 'end-of-call-report' || message.type === 'status-update') {
      const call = message.call;
      const callId = call?.id;

      if (!callId) {
        return NextResponse.json({ success: false, error: 'No call ID found in message' });
      }

      // Look up the log record in our database
      const logRecord = await getCallLogByCallId({ callId });

      if (logRecord) {
        const finalStatus = call.status === 'ended' ? 'completed' : call.status;
        
        // Update the log with the latest information
        await updateCallLogStatus({
          id: logRecord.id,
          status: finalStatus,
          transcript: call.transcript || undefined,
          summary: call.summary || undefined,
          duration: call.duration?.toString() || undefined,
          recordingUrl: call.recordingUrl || undefined,
        });

        console.log(`[Vapi Webhook] Updated call log ${logRecord.id} for call ${callId} to ${finalStatus}`);
      } else {
        console.warn(`[Vapi Webhook] No matching log record found for call ID: ${callId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vapi Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
