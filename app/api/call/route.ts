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

    const { phoneNumber, assistantId, language, customPrompt, advancedSettings } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!process.env.VAPI_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'API configuration error - Private key missing' },
        { status: 500 }
      );
    }

    if (!process.env.VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { success: false, error: 'Phone number configuration error' },
        { status: 500 }
      );
    }

    const targetAssistantId = assistantId || process.env.VAPI_ASSISTANT_ID;

    // ─── Build Assistant Overrides (CLEAN) ───
    // Philosophy:
    //   - The Call Script is the PRIMARY instruction (what to talk about)
    //   - The Persona defines the CHARACTER/STYLE (how to talk)
    //   - The trained assistant on the Vapi dashboard handles voice, model, and tools natively
    //   - We ONLY override: system prompt, firstMessage, maxDuration, serverUrl
    const assistantOverrides: Record<string, any> = {};

    // 1. Build the system prompt: Persona character + Call Script
    let systemPrompt = '';

    // If a persona prompt is provided, it defines the character
    if (advancedSettings?.persona) {
      systemPrompt += `### YOUR CHARACTER ###\n${advancedSettings.persona}\n\n`;
    }

    // The call script is the PRIMARY conversation directive
    if (customPrompt && customPrompt.trim().length > 0) {
      systemPrompt += `### CALL SCRIPT (FOLLOW THIS STRICTLY) ###\n${customPrompt}\n\n`;
      systemPrompt += `IMPORTANT: Your entire conversation must follow the call script above. `;
      systemPrompt += `Introduce yourself as described in the script. Stay on topic. `;
      systemPrompt += `If the person asks something outside the script scope, politely redirect back to the script objective.\n`;
    }

    // Language directive
    if (language && language !== 'en') {
      const langMap: Record<string, string> = {
        hi: 'Hindi (हिन्दी)',
        es: 'Spanish (Español)',
        fr: 'French (Français)',
      };
      const langName = langMap[language] || language;
      systemPrompt += `\nCRITICAL: You MUST speak entirely in ${langName}. Do not use English.\n`;
    }

    // Max call duration
    if (advancedSettings?.maxDuration) {
      const maxSecs = parseInt(advancedSettings.maxDuration) * 60;
      if (!isNaN(maxSecs) && maxSecs > 0) {
        assistantOverrides.maxDurationSeconds = maxSecs;
      }
    }

    // Webhook for call events
    const defaultWebhook = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/vapi`;
    assistantOverrides.serverMessages = ["end-of-call-report", "status-update", "hang"];
    assistantOverrides.serverUrl = defaultWebhook;

    // 2. Only set model override if we have a call script or custom prompt
    //    Otherwise, let the trained assistant use its native dashboard config
    if (systemPrompt.trim().length > 0) {
      assistantOverrides.model = {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
      };

      // Set a first message based on persona name or generic
      if (advancedSettings?.personaName) {
        assistantOverrides.firstMessage = `Hello, this is ${advancedSettings.personaName}. How are you doing today?`;
      } else {
        assistantOverrides.firstMessage = "Hello, how are you doing today?";
      }
      assistantOverrides.firstMessageMode = 'assistant-speaks-first';
    }

    console.log('[Call API] Initiating call:', {
      phoneNumber,
      assistantId: targetAssistantId,
      hasScript: !!(customPrompt && customPrompt.trim().length > 0),
      hasPersona: !!advancedSettings?.persona,
      language,
    });

    // 3. Make request to VAPI
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

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      console.error('[Call API] VAPI Error:', {
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

    // 4. Save to database (non-blocking for speed)
    const [logRecord] = await saveCallLog({
      userId: session.user.id,
      phoneNumber: phoneNumber,
      assistantId: targetAssistantId,
      status: 'queued',
      metadata: {
        language,
        customPrompt,
        callId: data.id,
        controlUrl: data.monitor?.controlUrl || null,
        listenUrl: data.monitor?.listenUrl || null,
        personaName: advancedSettings?.personaName || null,
      },
    });

    return NextResponse.json({
      success: true,
      callId: data.id,
      logId: logRecord?.id,
      status: data.status,
      controlUrl: data.monitor?.controlUrl || null,
      listenUrl: data.monitor?.listenUrl || null,
    });

  } catch (error) {
    console.error('[Call API] Error:', error);
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

    if (!process.env.VAPI_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
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

      return NextResponse.json(
        {
          success: false,
          error: errorData.message || 'Failed to fetch call status'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If call is finished, update database
    if (data.status === 'completed' || data.status === 'ended' || data.status === 'failed') {
      if (logId) {
        try {
          await updateCallLogStatus({
            id: logId,
            status: data.status === 'ended' ? 'completed' : data.status,
            transcript: data.transcript || undefined,
            summary: data.summary || undefined,
            duration: data.duration?.toString() || undefined,
            recordingUrl: data.recordingUrl || undefined,
          });
        } catch (err) {
          console.error('[Call API] Failed to update log:', err);
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
    console.error('[Call API] Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}