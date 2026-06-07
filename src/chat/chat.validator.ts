import { z } from "zod";
import { BaseValidator } from "../common/base.validator.js";
import { env } from "../config/env.config.js";
import { llmProvider } from "../llm/llm.factory.js";

const schemas = {
  sendMessage: z.object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty.")
      .max(
        env.MAX_MESSAGE_LENGTH,
        `Message exceeds the ${env.MAX_MESSAGE_LENGTH} character limit.`,
      ),
    sessionId: z.string().uuid("sessionId must be a valid UUID.").optional(),
    model: z
      .string()
      .refine(
        (m) => (llmProvider.supportedModels as readonly string[]).includes(m),
        {
          message: `Unsupported model. Available: ${llmProvider.supportedModels.join(", ")}`,
        },
      )
      .optional(),
  }),
  getMessages: z.object({
    sessionId: z.string().uuid("sessionId must be a valid UUID."),
  }),
};

export const chatValidator = new BaseValidator(schemas);
