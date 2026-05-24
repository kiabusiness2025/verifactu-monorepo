export type AIProvider = 'openai' | 'anthropic' | 'gateway';

export type AIResponseFormat = 'text' | 'json_object';

export type AIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AITool = {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
};

export type AIToolChoice =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

export type AIToolUse = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type AIToolResult = {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

// Assistant message in a tool-calling exchange can carry both text and
// tool_use blocks. We expose a structured variant for tool loops; the simple
// AIMessage stays text-only for backwards compatibility.
export type AIAssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

export type AIToolResultBlock = {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type AIRichMessage =
  | { role: 'user'; content: string | AIToolResultBlock[] }
  | { role: 'assistant'; content: string | AIAssistantBlock[] };

export type AIInputImage = {
  /** Public URL (https://...) or data URL (data:image/jpeg;base64,...) */
  url: string;
  /** "auto" | "low" | "high" — fed straight to OpenAI's detail parameter */
  detail?: 'auto' | 'low' | 'high';
};

export type CallLLMParams = {
  provider?: AIProvider;
  model?: string;
  feature?: string;
  instructions?: string;
  messages?: AIMessage[];
  richMessages?: AIRichMessage[];
  inputText?: string;
  inputImages?: AIInputImage[];
  temperature?: number;
  maxOutputTokens?: number;
  responseFormat?: AIResponseFormat;
  tools?: AITool[];
  toolChoice?: AIToolChoice;
  /** Try the other provider automatically on transient failures (rate_limit, network, quota, empty_response). Default: true. */
  enableFallback?: boolean;
};

export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type NormalizedLLMResponse = {
  text: string;
  provider: AIProvider;
  model: string;
  latencyMs?: number;
  usage?: AIUsage;
  toolUses?: AIToolUse[];
  stopReason?: string;
  raw?: unknown;
};
