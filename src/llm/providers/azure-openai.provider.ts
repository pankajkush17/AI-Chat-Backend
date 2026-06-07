import { AzureOpenAI } from "openai";
import { env } from "../../config/env.config.js";
import { LLMError, RateLimitError, TimeoutError } from "../../errors/index.js";
import type {
  ILLMProvider,
  LLMMessage,
  LLMChatOptions,
} from "../llm.interface.js";
import { promptBuilder } from "../prompt.builder.js";

// Azure deployments are named separately from model IDs.
// We store the mapping so callers can use logical model names (gpt-4o, gpt-5)
// while the provider transparently resolves to the correct Azure deployment.
const deploymentMap: Record<string, string> = {
  "gpt-4o": env.AZURE_OPENAI_GPT4O_DEPLOYMENT,
  "gpt-5": env.AZURE_OPENAI_GPT5_DEPLOYMENT,
};

export class AzureOpenAIProvider implements ILLMProvider {
  readonly supportedModels = ["gpt-4o"] as const;
  readonly defaultModel = "gpt-4o";

  private readonly client: AzureOpenAI;

  constructor() {
    if (!env.AZURE_OPENAI_KEY) {
      throw new Error(
        "AZURE_OPENAI_KEY is required when LLM_PROVIDER=azure-openai",
      );
    }
    if (!env.AZURE_OPENAI_ENDPOINT) {
      throw new Error(
        "AZURE_OPENAI_ENDPOINT is required when LLM_PROVIDER=azure-openai",
      );
    }

    this.client = new AzureOpenAI({
      apiKey: env.AZURE_OPENAI_KEY,
      endpoint: env.AZURE_OPENAI_ENDPOINT,
      apiVersion: env.AZURE_OPENAI_API_VERSION,
      timeout: env.LLM_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  async chat(
    userMessage: string,
    history: LLMMessage[],
    options: LLMChatOptions,
  ): Promise<string> {
    const deployment = deploymentMap[options.model] ?? options.model;
    const messages = promptBuilder.buildMessages(userMessage, history);

    try {
      const response = await this.client.chat.completions.create({
        model: deployment,
        max_tokens: options.maxTokens ?? env.LLM_MAX_TOKENS,
        messages: [
          { role: "system", content: promptBuilder.systemPrompt },
          ...messages,
        ],
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new LLMError("Azure OpenAI returned an empty response.");
      }

      return text;
    } catch (error) {
      if (error instanceof LLMError) throw error;

      if (error instanceof AzureOpenAI.RateLimitError) {
        throw new RateLimitError();
      }
      if (error instanceof AzureOpenAI.APIConnectionTimeoutError) {
        throw new TimeoutError();
      }
      if (error instanceof AzureOpenAI.AuthenticationError) {
        throw new LLMError("Invalid Azure OpenAI key. Check AZURE_OPENAI_KEY.");
      }
      if (error instanceof AzureOpenAI.APIError) {
        throw new LLMError(`Azure OpenAI error: ${(error as Error).message}`);
      }

      throw error;
    }
  }
}
