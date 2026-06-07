import { env } from "../config/env.config.js";
import type { ILLMProvider } from "./llm.interface.js";
import { AzureOpenAIProvider } from "./providers/azure-openai.provider.js";
import { OpenAIProvider } from "./providers/openai.provider.js";

function createProvider(providerName: string): ILLMProvider {
  switch (providerName) {
    case "openai":
      return new OpenAIProvider();
    case "azure-openai":
      return new AzureOpenAIProvider();
    default:
      throw new Error(
        `Unknown LLM provider "${providerName}". Supported: openai, azure-openai`,
      );
  }
}

export const llmProvider: ILLMProvider = createProvider(env.LLM_PROVIDER);
