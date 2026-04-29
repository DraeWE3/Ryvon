import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

// PATCH endpoint - Control an active call (end, transfer, mute/unmute)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, action, transferNumber } = await request.json();

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.VAPI_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }

    // ─── END CALL ───
    if (action === 'end') {
      const response = await fetch(`https://api.vapi.ai/call/${callId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Control] End call error:', errorText);

        // Fallback: try DELETE
        try {
          await fetch(`https://api.vapi.ai/call/${callId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
            },
          });
        } catch (e) {
          console.error('[Control] DELETE fallback failed:', e);
        }

        return NextResponse.json(
          { success: false, error: 'Failed to end call' },
          { status: response.status }
        );
      }

      return NextResponse.json({ success: true, message: 'Call terminated' });

    // ─── MUTE / UNMUTE ───
    } else if (action === 'mute' || action === 'unmute') {
      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantOverrides: {
            voice: {
              volume: action === 'mute' ? 0 : 1
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Control] Mute/Unmute error:', errorText);
        return NextResponse.json({ success: false, error: 'Failed to toggle mute' }, { status: response.status });
      }

      return NextResponse.json({ 
        success: true, 
        message: action === 'mute' ? 'Assistant muted' : 'Assistant unmuted'
      });

    // ─── TRANSFER ───
    } else if (action === 'transfer') {
      if (!transferNumber) {
        return NextResponse.json(
          { success: false, error: 'Transfer number is required' },
          { status: 400 }
        );
      }

      const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistantOverrides: {
            transferPlan: {
              mode: 'blind-transfer',
              destinations: [
                {
                  type: 'number',
                  number: transferNumber,
                  message: 'Transferring your call now. Please hold.',
                }
              ]
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Control] Transfer error:', errorText);
        return NextResponse.json(
          { success: false, error: 'Failed to transfer call' },
          { status: response.status }
        );
      }

      return NextResponse.json({ success: true, message: 'Call transferred' });

    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[Control] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
