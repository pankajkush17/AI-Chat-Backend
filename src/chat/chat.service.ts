import { NotFoundError } from "../errors/index.js";
import { llmProvider } from "../llm/llm.factory.js";
import type { LLMMessage } from "../llm/llm.interface.js";
import prisma from "../models/prismaClient.js";
import {
  redisService,
  chatHistoryKey,
  CHAT_HISTORY_TTL_S,
} from "../redis/index.js";
import { logger } from "../utils/logger/index.js";
import type {
  SendMessageResult,
  CachedHistoryEntry,
  MessageResponse,
} from "./chat.types.js";

export class ChatService {
  async handleMessage(
    userMessage: string,
    sessionId: string | undefined,
    model: string,
  ): Promise<SendMessageResult> {
    const conversation = sessionId
      ? await this.findOrThrowConversation(sessionId)
      : await prisma.conversation.create({ data: {} });

    const cacheKey = chatHistoryKey(conversation.id);
    const history = await this.getHistory(cacheKey, conversation.id);

    logger.userMessage(conversation.id, model, userMessage);

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "user",
        text: userMessage,
      },
    });

    const llmHistory: LLMMessage[] = history.map((h) => ({
      role: h.sender === "user" ? "user" : "assistant",
      content: h.text,
    }));

    const t0 = Date.now();
    const aiReply = await llmProvider.chat(userMessage, llmHistory, { model });
    logger.aiReply(conversation.id, model, aiReply, Date.now() - t0);

    await prisma.message.create({
      data: { conversationId: conversation.id, sender: "ai", text: aiReply },
    });

    const updatedHistory: CachedHistoryEntry[] = [
      ...history,
      { sender: "user", text: userMessage },
      { sender: "ai", text: aiReply },
    ];
    await redisService.setEx(
      cacheKey,
      CHAT_HISTORY_TTL_S,
      JSON.stringify(updatedHistory),
    );
    logger.cacheWrite(conversation.id, CHAT_HISTORY_TTL_S);

    return { reply: aiReply, sessionId: conversation.id, model };
  }

  async getConversationHistory(sessionId: string): Promise<MessageResponse[]> {
    await this.findOrThrowConversation(sessionId);

    const messages = await prisma.message.findMany({
      where: { conversationId: sessionId },
      orderBy: { timestamp: "asc" },
    });

    return messages as MessageResponse[];
  }

  getAvailableModels(): { models: readonly string[]; default: string } {
    return {
      models: llmProvider.supportedModels,
      default: llmProvider.defaultModel,
    };
  }

  private async findOrThrowConversation(sessionId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: sessionId },
    });
    if (!conversation) {
      throw new NotFoundError(`Conversation with id "${sessionId}" not found.`);
    }
    return conversation;
  }

  private async getHistory(
    cacheKey: string,
    conversationId: string,
  ): Promise<CachedHistoryEntry[]> {
    const cached = await redisService.get(cacheKey);
    if (cached) {
      try {
        const history = JSON.parse(cached) as CachedHistoryEntry[];
        logger.cacheHit(conversationId, history.length);
        return history;
      } catch {
        // corrupted cache entry — fall through to DB
      }
    }

    const dbMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "asc" },
      select: { sender: true, text: true },
    });

    logger.cacheMiss(conversationId, dbMessages.length);
    return dbMessages as CachedHistoryEntry[];
  }
}

export const chatService = new ChatService();
