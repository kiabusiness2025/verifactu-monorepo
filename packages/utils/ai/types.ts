export type AIProvider = 'openai' | 'anthropic' | 'gateway';

export type AIResponseFormat = 'text' | 'json_object';

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type CallLLMParams = {
  provider?: AIProvider;
  model?: string;
  feature?: string;
  instructions?: string;
  messages?: AIMessage[];
  inputText?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: AIResponseFormat;
};

export type NormalizedLLMResponse = {
  text: string;
  provider: AIProvider;
  model: string;
  latencyMs?: number;
  raw?: unknown;
};
