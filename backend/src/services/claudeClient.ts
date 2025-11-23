import 'dotenv/config';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
// Using Claude 3 Haiku for speed and reliability
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307'; 

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function generateInsightsFromClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is not defined in environment variables');
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as ClaudeResponse;

    if (!data.content || data.content.length === 0 || data.content[0].type !== 'text') {
      throw new Error('Invalid response format from Claude API');
    }

    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

