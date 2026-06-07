export interface SendMessageInput {
  message: string;
  sessionId?: string;
  model?: string;
}

export interface SendMessageResult {
  reply: string;
  sessionId: string;
  model: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export interface CachedHistoryEntry {
  sender: "user" | "ai";
  text: string;
}
