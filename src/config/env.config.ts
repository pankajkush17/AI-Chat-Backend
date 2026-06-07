import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // LLM provider selection
  LLM_PROVIDER: z.enum(["openai", "azure-openai"]).default("openai"),

  // Standard OpenAI (required when LLM_PROVIDER=openai)
  OPENAI_API_KEY: z.string().optional(),

  // Azure OpenAI (required when LLM_PROVIDER=azure-openai)
  AZURE_OPENAI_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_API_VERSION: z.string().default("2025-01-01-preview"),
  // Deployment names for each model (Azure maps deployment → model)
  AZURE_OPENAI_GPT4O_DEPLOYMENT: z.string().default("gpt-4o"),
  AZURE_OPENAI_GPT5_DEPLOYMENT: z.string().default("gpt-5"),

  // Shared LLM settings
  LLM_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_TIMEOUT_MS: z.coerce.number().default(30000),

  // Input limits
  MAX_MESSAGE_LENGTH: z.coerce.number().default(4000),

  // CORS
  CORS_ORIGIN: z.string().default("*"),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
