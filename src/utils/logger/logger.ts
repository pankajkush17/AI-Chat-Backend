import { env } from "../../config/env.config.js";

export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
}

class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    return (this.instance ??= new Logger());
  }

  // ── core emit ────────────────────────────────────────────────────────────────

  private emit(
    level: LogLevel,
    context: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    };

    const line =
      env.NODE_ENV === "production"
        ? JSON.stringify(entry)
        : this.format(entry);

    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  // ── pretty format for development ────────────────────────────────────────────

  private format(entry: LogEntry): string {
    const RESET = "\x1b[0m";
    const DIM = "\x1b[2m";
    const colors: Record<LogLevel, string> = {
      info: "\x1b[36m", // cyan
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
      debug: "\x1b[35m", // magenta
    };

    const color = colors[entry.level];
    const lvl = `${color}${entry.level.toUpperCase().padEnd(5)}${RESET}`;
    const ts = `${DIM}${entry.timestamp}${RESET}`;
    const ctx = `\x1b[90m[${entry.context}]${RESET}`;
    const data = entry.data
      ? `\n  ${DIM}${JSON.stringify(entry.data, null, 2).replace(/\n/g, "\n  ")}${RESET}`
      : "";

    return `${ts} ${lvl} ${ctx} ${entry.message}${data}`;
  }

  // ── public levels ────────────────────────────────────────────────────────────

  info(context: string, message: string, data?: Record<string, unknown>) {
    this.emit("info", context, message, data);
  }
  warn(context: string, message: string, data?: Record<string, unknown>) {
    this.emit("warn", context, message, data);
  }
  error(context: string, message: string, data?: Record<string, unknown>) {
    this.emit("error", context, message, data);
  }
  debug(context: string, message: string, data?: Record<string, unknown>) {
    this.emit("debug", context, message, data);
  }

  // ── domain-specific helpers ──────────────────────────────────────────────────

  /** Log an incoming user message before LLM call */
  userMessage(sessionId: string, model: string, text: string): void {
    this.info("Chat", "User message received", {
      sessionId,
      model,
      length: text.length,
      preview: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    });
  }

  /** Log the AI reply returned from the LLM */
  aiReply(
    sessionId: string,
    model: string,
    text: string,
    latencyMs: number,
  ): void {
    this.info("Chat", "AI reply generated", {
      sessionId,
      model,
      latencyMs,
      length: text.length,
      preview: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    });
  }

  /** Log a Redis cache HIT — history served without a DB round-trip */
  cacheHit(sessionId: string, messageCount: number): void {
    this.info("Redis", "Cache HIT — history served from Redis", {
      sessionId,
      cachedMessages: messageCount,
    });
  }

  /** Log a Redis cache MISS — history fetched from PostgreSQL */
  cacheMiss(sessionId: string, messageCount: number): void {
    this.info("Redis", "Cache MISS — history fetched from PostgreSQL", {
      sessionId,
      dbMessages: messageCount,
    });
  }

  /** Log when updated history is written back to Redis */
  cacheWrite(sessionId: string, ttlSeconds: number): void {
    this.debug("Redis", "Cache updated", { sessionId, ttlSeconds });
  }
}

export const logger = Logger.getInstance();
