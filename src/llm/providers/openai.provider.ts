import OpenAI from "openai";
import { env } from "../../config/env.config.js";
import { LLMError, RateLimitError, TimeoutError } from "../../errors/index.js";
import type {
  ILLMProvider,
  LLMMessage,
  LLMChatOptions,
} from "../llm.interface.js";
import { promptBuilder } from "../prompt.builder.js";

export class OpenAIProvider implements ILLMProvider {
  readonly supportedModels = ["gpt-4o", "gpt-5"] as const;
  readonly defaultModel = "gpt-4o";

  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: env.LLM_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  async chat(
    userMessage: string,
    history: LLMMessage[],
    options: LLMChatOptions,
  ): Promise<string> {
    const messages = promptBuilder.buildMessages(userMessage, history);

    try {
      const response = await this.client.chat.completions.create({
        model: options.model,
        max_tokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
        messages: [
          { role: "system", content: promptBuilder.systemPrompt },
          ...messages,
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new LLMError("AI service returned an empty response.");
      }

      return text;
    } catch (error) {
      if (error instanceof LLMError) throw error;

      if (error instanceof OpenAI.RateLimitError) {
        throw new RateLimitError();
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new TimeoutError();
      }
      if (error instanceof OpenAI.AuthenticationError) {
        throw new LLMError(
          "Invalid OpenAI API key. Please check your configuration.",
        );
      }
      if (error instanceof OpenAI.APIError) {
        throw new LLMError(`AI service error: ${error.message}`);
      }

      throw error;
    }
  }
}
