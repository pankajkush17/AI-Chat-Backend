import { env } from "node:process";
import { createClient, type RedisClientType } from "@redis/client";
import { logger } from "../utils/logger/index.js";
import {
  ENV_REDIS_URL,
  RECONNECT_DELAY_PER_RETRY_MS,
  RECONNECT_MAX_DELAY_MS,
} from "./redis.constants.js";

class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private connectPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): RedisService {
    return (this.instance ??= new RedisService());
  }

  public async connect(): Promise<void> {
    const url = env[ENV_REDIS_URL]?.trim();
    if (!url) {
      logger.warn(
        "Redis",
        "REDIS_URL not set — caching disabled, using PostgreSQL for all reads",
      );
      return;
    }
    if (this.client?.isOpen) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.initConnection(url).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private async initConnection(url: string): Promise<void> {
    const reconnectStrategy = (retries: number) =>
      Math.min(retries * RECONNECT_DELAY_PER_RETRY_MS, RECONNECT_MAX_DELAY_MS);

    try {
      this.client = createClient({
        url,
        socket: { reconnectStrategy },
      }) as RedisClientType;

      this.client.on("error", (err: Error) =>
        logger.error("Redis", `Connection error: ${err.message}`),
      );

      await this.client.connect();
      logger.info("Redis", "Connected successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Redis", `Failed to connect: ${msg}`);
      this.client = null;
    }
  }

  public get isConnected(): boolean {
    return !!this.client?.isOpen;
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client!.get(key);
    } catch (err) {
      logger.error("Redis", `get failed for key "${key}"`, {
        error: (err as Error).message,
      });
      return null;
    }
  }

  public async setEx(
    key: string,
    ttlSeconds: number,
    value: string,
  ): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client!.setEx(key, ttlSeconds, value);
    } catch (err) {
      logger.error("Redis", `setEx failed for key "${key}"`, {
        error: (err as Error).message,
      });
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client!.del(key);
    } catch (err) {
      logger.error("Redis", `del failed for key "${key}"`, {
        error: (err as Error).message,
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
      logger.info("Redis", "Disconnected");
    } finally {
      this.client = null;
    }
  }
}

export const redisService = RedisService.getInstance();
