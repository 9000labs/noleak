export interface LLMProvider {
  name: string;
  analyze(prompt: string): Promise<string>;
}
