import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { leadName, company, useCase } = await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `
You write VERY SHORT, clean sales emails.

Rules you MUST follow:
- Max 90 words
- 4–6 sentences only
- Sound human, calm, and confident
- No hype, no buzzwords, no emojis
- No generic phrases like "hope this finds you well"
- One clear value Ryvon AI provides
- One soft CTA (not pushy)
- End with this exact signature:

Ryvon AI  
Sales Team
`
        },
        {
          role: 'user',
          content: `
Write a short cold email to ${leadName || 'the client'} at ${
            company || 'their company'
          } explaining how Ryvon AI can help with ${
            useCase || 'automation and AI workflows'
          }.
`
        }
      ],
      temperature: 0.3,
      max_tokens: 180
    });

    const emailContent =
      completion.choices[0].message.content?.trim() || '';

    return NextResponse.json({
      success: true,
      emailContent
    });
  } catch (error: unknown) {
    console.error('Error generating email:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate email'
      },
      { status: 500 }
    );
  }
}
