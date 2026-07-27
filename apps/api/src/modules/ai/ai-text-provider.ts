/**
 * Provider-agnostic text generation surface. The interpretation layer depends
 * only on this — swapping DeepSeek for Claude/OpenAI is a new class + one-line
 * rebind in ai.module.ts.
 */

export interface GenerateTextParams {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateJsonParams extends GenerateTextParams {
  /** A short hint describing the expected JSON shape, appended to the prompt. */
  schemaHint?: string;
}

export interface AiTextProvider {
  /** True when the provider is configured (e.g. an API key is present). */
  readonly available: boolean;
  readonly model: string;

  generateText(params: GenerateTextParams): Promise<string>;
  generateJson<T>(params: GenerateJsonParams): Promise<T>;
}

/** DI token for the active AiTextProvider implementation. */
export const AI_TEXT_PROVIDER = Symbol('AI_TEXT_PROVIDER');
