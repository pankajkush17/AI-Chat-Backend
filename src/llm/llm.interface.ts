export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMChatOptions {
  model: string;
  maxTokens?: number;
}

export interface ILLMProvider {
  readonly supportedModels: readonly string[];
  readonly defaultModel: string;
  chat(
    userMessage: string,
    history: LLMMessage[],
    options: LLMChatOptions,
  ): Promise<string>;
}
