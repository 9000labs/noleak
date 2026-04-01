import type { LLMProvider } from './provider.js';

export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? 'claude-sonnet-4-20250514';
  }

  async analyze(prompt: string): Promise<string> {
    // Dynamic import to keep @anthropic-ai/sdk as optional peer dep
    const { default: Anthropic } = await import('@anthropic-ai/sdk').catch(() => {
      throw new Error(
        'Install @anthropic-ai/sdk for Claude LLM analysis: npm i -D @anthropic-ai/sdk'
      );
    });

    const client = new Anthropic({ apiKey: this.apiKey });
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === 'text'
    ) as { type: 'text'; text: string } | undefined;

    return textBlock?.text ?? '';
  }
}
