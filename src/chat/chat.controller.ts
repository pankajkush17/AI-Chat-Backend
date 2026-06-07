import { Request, Response } from "express";
import { CustomError } from "../errors/index.js";
import { llmProvider } from "../llm/llm.factory.js";
import { logger } from "../utils/logger/index.js";
import { chatService } from "./chat.service.js";
import type { SendMessageInput } from "./chat.types.js";

export class ChatController {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId, model } =
        req.validatedData as SendMessageInput;
      const resolvedModel = model ?? llmProvider.defaultModel;
      const result = await chatService.handleMessage(
        message,
        sessionId,
        resolvedModel,
      );
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const messages = await chatService.getConversationHistory(sessionId);
      res.status(200).json({ status: "success", data: messages });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  getModels(_req: Request, res: Response): void {
    res.status(200).json({
      status: "success",
      data: chatService.getAvailableModels(),
    });
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.json());
    } else {
      const message =
        error instanceof Error ? error.message : "Internal server error";
      logger.error("ChatController", "Unhandled error", { message });
      res.status(500).json({
        status: "error",
        statusCode: 500,
        errors: [{ message: "Internal server error. Please try again." }],
      });
    }
  }
}

export const chatController = new ChatController();
