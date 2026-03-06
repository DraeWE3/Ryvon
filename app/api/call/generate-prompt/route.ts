import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: `You are an expert at writing system prompts for Vapi AI voice assistants. 
      Your goal is to create a highly effective, professional, and natural-sounding system prompt based on the user's description.
      
      Guidelines:
      1. Define a clear persona.
      2. State the primary objective clearly.
      3. Use a natural, conversational tone.
      4. Include instructions for handling common scenarios (greeting, objections, closing).
      5. Keep the prompt concise but comprehensive for a voice interaction.
      6. Output ONLY the prompt text, no explanations or markdown formatting.`,
      prompt: `Generate a Vapi system prompt for: ${description}`,
    });

    return NextResponse.json({
      success: true,
      prompt: text.trim(),
    });

  } catch (error) {
    console.error('Error generating prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
