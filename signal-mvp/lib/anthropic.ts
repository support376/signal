import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const MODEL = 'claude-sonnet-4-5-20250929';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaude(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const r = await client.messages.create({
    model: MODEL,
    system: opts.system,
    messages: opts.messages,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.7,
  });
  const block = r.content[0];
  if (block.type !== 'text') throw new Error('non-text response');
  return block.text;
}

/** Force JSON output by stripping markdown fences and parsing. */
export function parseJsonResponse<T = any>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
  }
  // Find first { and last }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}
