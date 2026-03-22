import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { saveCallLog, updateCallLogStatus } from '@/lib/db/queries';

// POST endpoint - Initiate call
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, assistantId, language, customPrompt } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.VAPI_PRIVATE_KEY) {
      console.error('VAPI_PRIVATE_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'API configuration error - Private key missing' },
        { status: 500 }
      );
    }

    if (!process.env.VAPI_PHONE_NUMBER_ID) {
      console.error('VAPI_PHONE_NUMBER_ID is not configured');
      return NextResponse.json(
        { success: false, error: 'Phone number configuration error' },
        { status: 500 }
      );
    }

    const targetAssistantId = assistantId || process.env.VAPI_ASSISTANT_ID;

    // Construct Assistant Overrides
    const assistantOverrides: any = {};
    
    if (customPrompt) {
      assistantOverrides.model = {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: customPrompt,
          },
        ],
      };
    }

    if (language === 'hi') {
      assistantOverrides.transcriber = {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'hi',
      };
      // Optionally set a Hindi voice if needed, otherwise Vapi uses default
    }

    console.log('Initiating call with:', {
      phoneNumber,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      assistantId: targetAssistantId,
      overrides: assistantOverrides,
    });

    // Make request to VAPI to initiate call
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phoneNumber,
        },
        assistantId: targetAssistantId,
        assistantOverrides,
      }),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('VAPI API Error:', {
        status: response.status,
        error: errorData,
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.message || errorText || `Failed to initiate call: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Save to database and get the returned record
    const [logRecord] = await saveCallLog({
      userId: session.user.id,
      phoneNumber: phoneNumber,
      assistantId: targetAssistantId,
      status: 'queued',
      metadata: {
        language,
        customPrompt,
        callId: data.id,
      },
    });

    return NextResponse.json({
      success: true,
      callId: data.id,
      logId: logRecord?.id,
      status: data.status,
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint - Check call status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    const logId = searchParams.get('logId');

    if (!callId) {
      return NextResponse.json(
        { success: false, error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Validate environment variable
    if (!process.env.VAPI_PRIVATE_KEY) {
      console.error('VAPI_PRIVATE_KEY is not configured');
      return NextResponse.json(
        { success: false, error: 'API configuration error - Private key missing' },
        { status: 500 }
      );
    }

    // Fetch call status from VAPI using PRIVATE key
    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`, // PRIVATE key
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('VAPI Status Check Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.message || 'Failed to fetch call status' 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If call is finished, update database with final status
    if (data.status === 'completed' || data.status === 'ended' || data.status === 'failed') {
      if (logId) {
        try {
          await updateCallLogStatus({
            id: logId,
            status: data.status,
            transcript: data.transcript || undefined,
            summary: data.summary || undefined,
            duration: data.duration?.toString() || undefined,
            recordingUrl: data.recordingUrl || undefined,
          });
          console.log('Call log updated successfully for logId:', logId);
        } catch (err) {
          console.error('Failed to update call log status:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: data.status,
      callId: data.id,
      duration: data.duration,
      endedReason: data.endedReason,
      transcript: data.transcript,
      summary: data.summary,
      recordingUrl: data.recordingUrl,
    });

  } catch (error) {
    console.error('Error checking call status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}