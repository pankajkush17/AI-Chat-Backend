export const ENV_REDIS_URL = "REDIS_URL";

export const CHAT_HISTORY_TTL_S = 3600;

export const chatHistoryKey = (sessionId: string): string =>
  `chat:history:${sessionId}`;

export const RECONNECT_DELAY_PER_RETRY_MS = 100;
export const RECONNECT_MAX_DELAY_MS = 3000;
