# AI Chat Backend

AI-powered customer support chat backend built with Node.js + TypeScript, PostgreSQL, Redis, and the Anthropic Claude API.

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (running locally or a connection URL)
- Redis (optional — app degrades gracefully if `REDIS_URL` is unset)
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/chat_agent
ANTHROPIC_API_KEY=sk-ant-...        # required
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_TOKENS=1024
ANTHROPIC_TIMEOUT_MS=30000
MAX_MESSAGE_LENGTH=4000
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379    # optional
```

### 3. Set up the database

Create the database:

```bash
createdb chat_agent
```

Run Prisma migrations:

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Server starts on `http://localhost:3000`.

---

## API Reference

### POST /api/chat/message

**Request:**
```json
{ "message": "What is your return policy?", "sessionId": "uuid-optional" }
```

**Response 200:**
```json
{ "status": "success", "data": { "reply": "...", "sessionId": "uuid" } }
```

Store the returned `sessionId` and pass it on subsequent requests to maintain conversation context.

**Error codes:** `422` validation, `404` session not found, `429` rate limited, `502` LLM error, `504` timeout.

### GET /api/chat/:sessionId/messages

Returns the full message history for a session.

---

## Database Commands

```bash
npm run db:migrate          # apply pending migrations (dev)
npm run db:migrate:deploy   # apply migrations without prompts (production)
npm run db:studio           # open Prisma Studio GUI
npm run db:reset            # drop and rerun all migrations (dev only)
```

---

## Architecture Overview

```
src/
├── config/env.config.ts      # Zod-validated env vars — fail-fast at startup
├── chat/                     # Chat feature (routes → controller → service)
│   ├── chat.routes.ts        # Route definitions (auto-discovered by api.routes.ts)
│   ├── chat.controller.ts    # Thin request/response layer
│   ├── chat.service.ts       # Orchestration: DB + Redis + LLM
│   ├── chat.validator.ts     # Zod schemas via BaseValidator
│   └── chat.types.ts         # TypeScript interfaces
├── llm/
│   ├── anthropic.client.ts   # Anthropic SDK wrapper, maps SDK errors → HTTP errors
│   └── prompt.builder.ts     # System prompt (store FAQ) + history shaping
├── redis/
│   ├── redis.client.ts       # Singleton, skipped gracefully if REDIS_URL unset
│   └── redis.constants.ts    # TTL (1h), key builder
└── errors/                   # LLMError (502), RateLimitError (429), TimeoutError (504)
```

**Request flow (POST /api/chat/message):**
1. Zod validator — rejects empty/overlong messages, validates UUID format
2. Service resolves or creates a `Conversation` in PostgreSQL
3. History is fetched from Redis (cache hit) or PostgreSQL (cache miss)
4. User message persisted to PostgreSQL
5. Claude called with system prompt + conversation history
6. AI reply persisted to PostgreSQL; Redis cache updated
7. `{ reply, sessionId }` returned to client

**LLM design:**
- Provider: Anthropic Claude (`claude-sonnet-4-6`)
- Store knowledge (shipping, returns, support hours) embedded in the system prompt
- Full conversation history passed as alternating `user`/`assistant` turns
- `maxRetries: 0` — SDK errors are caught explicitly and mapped to typed error classes
- `ANTHROPIC_MAX_TOKENS` defaults to 1024 (adjustable via env)

**Redis caching:**
- Key: `chat:history:<sessionId>`, TTL: 1 hour
- Stores compact `{ sender, text }[]` — sufficient for LLM context, skips full metadata
- Falls through to PostgreSQL on any Redis error or if `REDIS_URL` unset

---

## Trade-offs & If I Had More Time

- **Streaming** — Claude supports streaming; SSE would make replies feel more real-time
- **History truncation** — currently sends full history; long sessions may hit token limits
- **Per-session rate limiting** — no `express-rate-limit` yet
- **Tests** — integration tests with `supertest` against a test DB would be first priority
