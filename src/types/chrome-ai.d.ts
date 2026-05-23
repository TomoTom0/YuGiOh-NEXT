/**
 * Chrome Built-in AI (Prompt API) の型定義
 * @see https://developer.chrome.com/docs/ai/prompt-api
 */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | Content[];
  prefix?: boolean;
}

interface Content {
  type: 'text' | 'image' | 'audio';
  value?: string;
  language?: string;
}

interface PromptOptions {
  signal?: AbortSignal;
}

interface CreateOptions {
  initialPrompts?: Message[];
  monitor?: (m: LanguageModel) => void;
  signal?: AbortSignal;
}

interface AvailabilityOptions {
  expectedInputs?: Content[];
  expectedOutputs?: Content[];
}

interface Params {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

interface LanguageModel {
  prompt(prompt: string | Message[], options?: PromptOptions): Promise<string>;
  promptStreaming(prompt: string | Message[], options?: PromptOptions): ReadableStream<string>;
  destroy(): void;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModel>;
  inputUsage: number;
  inputQuota: number;
}

interface LanguageModelConstructor {
  availability(options?: AvailabilityOptions): Promise<'readily' | 'after-download' | 'unavailable' | 'downloading'>;
  create(options?: CreateOptions): Promise<LanguageModel>;
  params(): Promise<Params>;
}

interface Window {
  LanguageModel: LanguageModelConstructor;
}
