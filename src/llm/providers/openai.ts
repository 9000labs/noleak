import type { LLMProvider } from './provider.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? 'gpt-4o';
  }

  async analyze(prompt: string): Promise<string> {
    const { default: OpenAI } = await import('openai').catch(() => {
      throw new Error(
        'Install openai for OpenAI LLM analysis: npm i -D openai'
      );
    });

    const client = new OpenAI({ apiKey: this.apiKey });
    const response = await client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
