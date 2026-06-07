# AI Chat Backend

A production-ready Node.js + TypeScript backend for an AI live chat agent. Built with Express 5, Prisma, PostgreSQL, Redis, and the OpenAI SDK — supporting both OpenAI and Azure OpenAI as swappable LLM providers.

---

## Running Locally

### Prerequisites

- **Node.js 25** — install via [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  nvm install 25
  nvm use 25
  ```
- **PostgreSQL** — running locally (the default config expects a local instance)
- **Redis** (optional) — omit `REDIS_URL` to run without caching

---

### 1. Clone and Install

```bash
git clone <repository-url>
cd AI-Chat-Backend
npm install
```

---

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in the required values. At minimum you need a `DATABASE_URL` and credentials for your chosen LLM provider:

**OpenAI:**
```env
DATABASE_URL=postgresql://<user>@localhost:5432/<database>
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

**Azure OpenAI:**
```env
DATABASE_URL=postgresql://<user>@localhost:5432/<database>
LLM_PROVIDER=azure-openai
AZURE_OPENAI_KEY=your-azure-openai-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
```

All other values have sensible defaults and can be left as-is for local development.

---

### 3. Set Up the Database

Create the database, generate the Prisma client, and run migrations:

```bash
# Create the database (if it doesn't exist yet)
createdb chat_agent

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

When prompted by `db:migrate`, enter a migration name (e.g. `init`).

To inspect the database visually:

```bash
npm run db:studio
```

---

### 4. Start the Dev Server

```bash
npm run dev
```

Expected output:

```
2026-06-08T00:00:00.000Z INFO  [Redis] Connected successfully
2026-06-08T00:00:00.000Z INFO  [Server] Server running on port 3000
```

If `REDIS_URL` is not set, you will see a warning instead — the server still starts normally.

---

### 5. Verify the Setup

**Health check:**
```bash
curl http://localhost:3000/
# → 200 OK
```

**List available models:**
```bash
curl http://localhost:3000/api/chat/models
# → { "status": "success", "data": { "models": ["gpt-4o", "gpt-5"], "default": "gpt-4o" } }
```

**Send a message (new session):**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! What can you do?"}'
# → { "status": "success", "data": { "reply": "...", "sessionId": "<uuid>", "model": "gpt-4o" } }
```

**Continue an existing session:**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me more.", "sessionId": "<uuid-from-previous-response>"}'
```

**Fetch conversation history:**
```bash
curl http://localhost:3000/api/chat/<sessionId>/messages
```

---

### Running in Production

```bash
npm start                    # build + run compiled output
npm run db:migrate:deploy    # apply pending migrations (no new ones created)
```

Set `NODE_ENV=production` to enable JSON log output and disable dev formatting.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture & Design Patterns](#architecture--design-patterns)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [npm Scripts](#npm-scripts)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 25 |
| Language | TypeScript (ESM) |
| Web Framework | Express 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Cache | Redis (optional, via `@redis/client`) |
| LLM | OpenAI SDK v6 (OpenAI + Azure OpenAI) |
| Validation | Zod v4 (env + request validation) |
| Dev Server | tsx + nodemon |
| Build | tsc + ts-add-js-extension |
| Pre-commit | Husky + lint-staged |

---

## Project Structure

```
.
├── index.ts                    # Entry point — bootstraps server
├── prisma/                     # Prisma schema + migrations
├── src/
│   ├── app.ts                  # App class — Express setup, middleware, router init
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment variables (process.exit on invalid)
│   │   └── config.constants.ts
│   ├── chat/
│   │   ├── chat.controller.ts  # ChatController — sendMessage, getMessages, getModels
│   │   ├── chat.routes.ts      # ChatRoutes extends BaseApiRoutes
│   │   ├── chat.service.ts     # ChatService — core business logic
│   │   ├── chat.types.ts       # TypeScript types for the chat layer
│   │   └── chat.validator.ts   # Zod schemas: sendMessage, getMessages
│   ├── common/
│   │   ├── base.controller.ts  # BaseController — abstract CRUD base
│   │   ├── base.routes.ts      # BaseApiRoutes — abstract route base with addRestRoutes()
│   │   ├── base.validator.ts   # BaseValidator — Zod middleware + validate + validateBulk
│   │   ├── base.messages.ts    # Standard response message templates
│   │   └── base.types.ts       # Shared TypeScript interfaces
│   ├── errors/
│   │   ├── customError.ts           # Abstract CustomError base class
│   │   ├── validationError.ts       # 400
│   │   ├── notFoundError.ts         # 404
│   │   ├── rateLimitError.ts        # 429
│   │   ├── llmError.ts              # 502
│   │   ├── timeoutError.ts          # 504
│   │   ├── unprocessableEntityError.ts # 422
│   │   ├── somethingWentWrongError.ts  # 500
│   │   └── index.ts                 # Re-exports all errors
│   ├── llm/
│   │   ├── llm.interface.ts    # ILLMProvider interface + LLMMessage, LLMChatOptions
│   │   ├── llm.factory.ts      # createProvider() factory — reads LLM_PROVIDER env
│   │   ├── prompt.builder.ts   # PromptBuilder — system prompt + message builder
│   │   └── providers/
│   │       ├── openai.provider.ts        # OpenAIProvider implements ILLMProvider
│   │       └── azure-openai.provider.ts  # AzureOpenAIProvider implements ILLMProvider
│   ├── models/
│   │   ├── prismaClient.ts     # Singleton Prisma client
│   │   └── index.ts
│   ├── redis/
│   │   ├── redis.client.ts     # RedisService singleton with graceful fallback
│   │   ├── redis.constants.ts  # Key helpers, TTL constants
│   │   └── index.ts            # Re-exports redisService, chatHistoryKey, CHAT_HISTORY_TTL_S
│   ├── routes/
│   │   ├── index.ts            # Router class — wires all routes to Express app
│   │   ├── api.routes.ts       # Mounts /api prefix
│   │   ├── healthCheck.routes.ts # GET / → 200
│   │   └── notFound.routes.ts  # Catch-all 404
│   └── utils/
│       └── logger/
│           ├── logger.ts       # Logger singleton (colorized dev, JSON prod)
│           └── index.ts
```

---

## Architecture & Design Patterns

### 1. App Bootstrap

The server starts in two steps:

1. `index.ts` connects to Redis, calls `appInstance.initialize()`, then starts an `http.createServer`.
2. The `App` class owns the Express `Application` and a `Router` instance. `App.initializeMiddlewares()` sets up:
   - CORS (origin from `CORS_ORIGIN` env var)
   - `express.json` with a 1 MB body limit
   - Morgan request logging (health check and favicon paths are skipped)

---

### 2. Base Classes

#### BaseController (`src/common/base.controller.ts`)

An abstract class that provides ready-made CRUD methods any controller can inherit:

| Method | Description |
|--------|-------------|
| `index` | Paginated list |
| `showAll` | Unpaginated list |
| `show` | Single record by ID |
| `create` | Create a record |
| `update` | Update a record |
| `destroy` | Delete a record |

`handleError(error, res)` checks `instanceof CustomError` and uses its `statusCode`, falling back to 422 for unknown errors. Protected hooks that subclasses can override: `getFilters`, `getSearchableFields`, `getInclude`, `getOrderBy`, `transformData`, `afterSave`, `getRelationFilters`.

---

#### BaseApiRoutes (`src/common/base.routes.ts`)

An abstract class all route files extend. `addRestRoutes(controller, middlewares)` introspects the controller prototype chain (using `getAllMethods()` which walks the full prototype chain) and automatically wires the standard REST routes:

```
POST   /all    → controller.index
GET    /       → controller.showAll
GET    /:id    → controller.show
POST   /       → controller.create
PUT    /:id    → controller.update
DELETE /:id    → controller.destroy
```

Only methods that actually exist on the controller are wired — missing methods are skipped silently.

---

#### BaseValidator (`src/common/base.validator.ts`)

Holds a map of `{ operationName → ZodSchema }` and exposes three utilities:

- **`middleware(operation, source)`** — Express middleware that runs `safeParseAsync` on `req[source]` (body, query, or params) and attaches the result to `req.validatedData`. Responds with a `ValidationError` if parsing fails.
- **`validate(operation, data)`** — Synchronous validation for use outside of Express middleware.
- **`validateBulk(items, schema)`** — Validates an array and groups errors by index, useful for batch operations.

---

#### CustomError Hierarchy (`src/errors/`)

```
CustomError (abstract)
├── ValidationError          → 400
├── NotFoundError            → 404
├── RateLimitError           → 429
├── UnprocessableEntityError → 422
├── LLMError                 → 502
├── TimeoutError             → 504
└── SomethingWentWrongError  → 500
```

All errors implement `json()` which returns a consistent shape:

```json
{
  "status": "error",
  "statusCode": 400,
  "errors": [{ "message": "Descriptive message here" }]
}
```

---

### 3. LLM Layer

The LLM layer is built around an interface + factory pattern, making it straightforward to add new providers.

#### ILLMProvider (`src/llm/llm.interface.ts`)

```ts
interface ILLMProvider {
  readonly supportedModels: readonly string[];
  readonly defaultModel: string;
  chat(
    userMessage: string,
    history: LLMMessage[],
    options: LLMChatOptions
  ): Promise<string>;
}
```

#### Factory (`src/llm/llm.factory.ts`)

`createProvider(providerName)` reads the `LLM_PROVIDER` env var and returns the correct implementation. Adding a new provider requires only a new class implementing `ILLMProvider` and one new `case` in the factory switch.

#### OpenAIProvider (`src/llm/providers/openai.provider.ts`)

Wraps the OpenAI SDK and maps SDK-level errors to typed custom errors:

| SDK Error | Custom Error |
|-----------|-------------|
| `OpenAI.RateLimitError` | `RateLimitError` (429) |
| `OpenAI.APIConnectionTimeoutError` | `TimeoutError` (504) |
| `OpenAI.AuthenticationError` | `LLMError` (502) |

#### AzureOpenAIProvider (`src/llm/providers/azure-openai.provider.ts`)

Wraps the `AzureOpenAI` SDK. Maps logical model names (e.g. `gpt-4o`, `gpt-5`) to Azure deployment names via a `deploymentMap`, populated from `AZURE_OPENAI_GPT4O_DEPLOYMENT` and `AZURE_OPENAI_GPT5_DEPLOYMENT` env vars.

---

### 4. ChatService (`src/chat/chat.service.ts`)

The core orchestration logic for every message:

```
1. Create or fetch a Conversation row in PostgreSQL
2. Build cacheKey = chat:history:{conversationId}
3. Try Redis GET(cacheKey)
   ├── HIT  → use cached CachedHistoryEntry[]
   └── MISS → fetch message history from PostgreSQL
4. Write the user message to PostgreSQL
5. Call llmProvider.chat(userMessage, history, { model })
6. Write the AI reply to PostgreSQL
7. Append both messages to history → write back to Redis (TTL: 3600s)
8. Return { reply, sessionId, model }
```

Redis is used as a read-through cache for conversation history, significantly reducing database load on active sessions.

---

### 5. RedisService (`src/redis/redis.client.ts`)

- Singleton via `static getInstance()`
- **Graceful degradation**: if `REDIS_URL` is not set, `connect()` is a no-op and all `get/setEx/del` calls return `null`/`undefined` silently — the app works fully without Redis
- Reconnect uses exponential backoff
- All operations catch and log errors internally — they never throw, so Redis failures are never fatal

---

### 6. Logger (`src/utils/logger/logger.ts`)

- Singleton via `static getInstance()`
- **Development**: colorized pretty output using ANSI codes
- **Production**: newline-delimited JSON — `info/debug/warn` to stdout, `error` to stderr
- Domain-specific helpers: `userMessage()`, `aiReply()`, `cacheHit()`, `cacheMiss()`, `cacheWrite()`

---

### 7. Environment Validation

`src/config/env.config.ts` uses Zod to parse `process.env` at startup. If any required variable is missing or invalid, the full Zod error is printed and `process.exit(1)` is called — no silent configuration failures.

---

## Database Schema

```prisma
model Conversation {
  id        String    @id @default(uuid()) @db.Uuid
  createdAt DateTime  @default(now()) @map("created_at")
  metadata  Json?     @default("{}")
  messages  Message[]

  @@map("conversations")
}

model Message {
  id             String        @id @default(uuid()) @db.Uuid
  conversationId String        @map("conversation_id") @db.Uuid
  sender         MessageSender  // enum: user | ai
  text           String
  timestamp      DateTime      @default(now())
  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("messages")
}
```

- `Message.conversationId` is indexed for fast history lookups.
- Deleting a conversation cascades to all its messages.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check — returns 200 |
| `GET` | `/api/chat/models` | Returns available models and default model |
| `POST` | `/api/chat/message` | Send a message and receive an AI reply |
| `GET` | `/api/chat/:sessionId/messages` | Fetch full conversation history for a session |

---

### GET /

Health check. Returns `200 OK`. Use for load balancer or uptime monitoring probes.

---

### GET /api/chat/models

Returns the list of models supported by the active LLM provider.

**Response:**
```json
{
  "status": "success",
  "data": {
    "models": ["gpt-4o", "gpt-5"],
    "default": "gpt-4o"
  }
}
```

---

### POST /api/chat/message

Send a user message and receive an AI reply. If `sessionId` is omitted, a new conversation is created.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "model": "gpt-4o"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User message (max `MAX_MESSAGE_LENGTH` chars) |
| `sessionId` | string (UUID) | No | Existing conversation ID. Omit to start a new session |
| `model` | string | No | Model to use. Falls back to provider default if omitted |

**Response:**
```json
{
  "status": "success",
  "data": {
    "reply": "I'm doing great! How can I help you?",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "model": "gpt-4o"
  }
}
```

**Error Responses:**

| Status | Cause |
|--------|-------|
| 400 | Validation error (missing or invalid fields) |
| 429 | LLM provider rate limit exceeded |
| 502 | LLM provider authentication or upstream error |
| 504 | LLM request timed out |
| 500 | Unexpected server error |

---

### GET /api/chat/:sessionId/messages

Fetch the full message history for an existing conversation.

**Response:**
```json
{
  "status": "success",
  "data": [
    { "sender": "user", "text": "Hello!", "timestamp": "2026-06-08T12:00:00.000Z" },
    { "sender": "ai", "text": "Hi there! How can I help?", "timestamp": "2026-06-08T12:00:01.000Z" }
  ]
}
```

---

## Environment Variables

All variables are validated with Zod at startup. The app will refuse to start if required variables are missing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `LLM_PROVIDER` | No | `openai` | `openai` or `azure-openai` |
| `OPENAI_API_KEY` | If `LLM_PROVIDER=openai` | — | OpenAI API key |
| `AZURE_OPENAI_KEY` | If `LLM_PROVIDER=azure-openai` | — | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | If `LLM_PROVIDER=azure-openai` | — | Azure OpenAI resource URL |
| `AZURE_OPENAI_API_VERSION` | No | `2025-01-01-preview` | Azure OpenAI API version |
| `AZURE_OPENAI_GPT4O_DEPLOYMENT` | No | `gpt-4o` | Azure deployment name for GPT-4o |
| `AZURE_OPENAI_GPT5_DEPLOYMENT` | No | `gpt-5` | Azure deployment name for GPT-5 |
| `LLM_MAX_TOKENS` | No | `1024` | Maximum tokens per LLM response |
| `LLM_TIMEOUT_MS` | No | `30000` | LLM request timeout (ms) |
| `MAX_MESSAGE_LENGTH` | No | `4000` | Maximum user message length (chars) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `REDIS_URL` | No | — | Redis URL. If omitted, caching is disabled and all reads go to PostgreSQL |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with nodemon + tsx (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` with correct ESM `.js` extensions |
| `npm start` | Build then run the compiled output |
| `npm run db:generate` | Generate the Prisma client from the schema |
| `npm run db:migrate` | Create and apply a new migration (development) |
| `npm run db:migrate:deploy` | Apply pending migrations without creating new ones (production) |
| `npm run db:studio` | Open Prisma Studio GUI in the browser |
| `npm run db:reset` | Drop the database and re-run all migrations from scratch |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format `src/**/*.ts` with Prettier |
