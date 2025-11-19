# Anchor Backend API

Backend API server for the Anchor focus tracking system. Provides authentication, session management, and data APIs for both the Chrome extension and web application.

## Tech Stack

- **Node.js** with **TypeScript**
- **Express** for HTTP server
- **PostgreSQL** database
- **Prisma** ORM
- **JWT** for authentication
- **bcrypt** for password hashing

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb anchor_db
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your database URL:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/anchor_db?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   PORT=3000
   NODE_ENV=development
   ```

4. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

5. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the PORT specified in `.env`).

## API Endpoints

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "clx123...",
    "email": "user@example.com",
    "createdAt": "2025-01-17T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/login
Login an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as register.

### Session Management (Extension APIs)

All session endpoints require `Authorization: Bearer <token>` header.

#### POST /sessions/start
Create a new focus session.

**Request:**
```json
{}
```

**Response:**
```json
{
  "sessionId": "clx456..."
}
```

#### POST /sessions/activity
Upload activity segments and update metrics incrementally.

**Request:**
```json
{
  "sessionId": "clx456...",
  "segments": [
    {
      "start": "2025-01-17T21:00:00.000Z",
      "end": "2025-01-17T21:05:00.000Z",
      "domain": "docs.google.com",
      "productive": true,
      "lockedIn": true,
      "reason": null
    },
    {
      "start": "2025-01-17T21:05:00.000Z",
      "end": "2025-01-17T21:10:00.000Z",
      "domain": "youtube.com",
      "productive": false,
      "lockedIn": false,
      "reason": "unproductive_domain"
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok"
}
```

#### POST /sessions/end
Finalize a session with complete metrics.

**Request:**
```json
{
  "sessionId": "clx456...",
  "sessionStartTimestamp": "2025-01-17T21:00:00.000Z",
  "sessionEndTimestamp": "2025-01-17T22:10:00.000Z",
  "totalSessionSeconds": 4200,
  "lockedInSeconds": 3300,
  "nonLockSeconds": 900,
  "focusRate": 0.7857,
  "idleBeyond2minSeconds": 300,
  "tabSwitchCount": 18,
  "lockBreakCount": 3,
  "segments": [ /* same format as /activity */ ]
}
```

**Response:**
```json
{
  "sessionId": "clx456...",
  "focusRate": 0.7857
}
```

### Read APIs (Website)

#### GET /me/dashboard
Get current user's dashboard (requires auth).

**Response:**
```json
{
  "user": {
    "id": "clx123...",
    "email": "user@example.com"
  },
  "today": {
    "lockedInSeconds": 5400,
    "totalSessionSeconds": 7200,
    "averageFocusRate": 0.75,
    "sessionCount": 3
  },
  "last7Days": {
    "lockedInSeconds": 21000,
    "totalSessionSeconds": 28000,
    "averageFocusRate": 0.72
  },
  "recentSessions": [ /* ... */ ]
}
```

#### GET /feed?limit=20&offset=0
Get feed of posted sessions.

**Response:**
```json
{
  "sessions": [
    {
      "id": "clx456...",
      "user": {
        "id": "clx123...",
        "email": "user@example.com"
      },
      "startedAt": "2025-01-17T...",
      "endedAt": "2025-01-17T...",
      "lockedInSeconds": 3300,
      "totalSessionSeconds": 4200,
      "focusRate": 0.7857,
      "title": "ECE244 midterm prep",
      "aiSummary": "..."
    }
  ]
}
```

#### GET /sessions/:id
Get full session details with segments.

**Response:**
```json
{
  "id": "clx456...",
  "user": { "id": "...", "email": "..." },
  "startedAt": "...",
  "endedAt": "...",
  "lockedInSeconds": 3300,
  "totalSessionSeconds": 4200,
  "focusRate": 0.7857,
  "idleBeyond2minSeconds": 300,
  "tabSwitchCount": 18,
  "lockBreakCount": 3,
  "title": "...",
  "description": null,
  "aiSummary": "...",
  "activitySegments": [ /* ... */ ]
}
```

#### GET /users/:id/profile
Get user profile and stats.

**Response:**
```json
{
  "user": {
    "id": "clx123...",
    "email": "user@example.com"
  },
  "stats": {
    "totalLockedInSeconds": 123456,
    "totalSessionSeconds": 180000,
    "averageFocusRate": 0.68,
    "bestFocusRate": 0.95,
    "bestLockedInStreakSeconds": 3600
  },
  "recentSessions": [ /* ... */ ]
}
```

#### GET /leaderboard?range=weekly
Get leaderboard (weekly or all_time).

**Response:**
```json
{
  "range": "weekly",
  "entries": [
    {
      "user": { "id": "...", "email": "..." },
      "totalLockedInSeconds": 21000,
      "sessionCount": 12,
      "averageFocusRate": 0.75
    }
  ]
}
```

### Domain Configuration

#### GET /domains
Get all domain configurations.

#### POST /domains
Create or update a domain config.

**Request:**
```json
{
  "domain": "docs.google.com",
  "type": "PRODUCTIVE"
}
```

## Example cURL Commands

### Register a user
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Start a session
```bash
curl -X POST http://localhost:3000/sessions/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### Get dashboard
```bash
curl -X GET http://localhost:3000/me/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get feed
```bash
curl -X GET "http://localhost:3000/feed?limit=10&offset=0"
```

## Database Migrations

### Create a new migration
```bash
npm run prisma:migrate
```

### View database in Prisma Studio
```bash
npm run prisma:studio
```

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Use a production PostgreSQL database
4. Build the TypeScript code:
   ```bash
   npm run build
   ```
5. Start the server:
   ```bash
   npm start
   ```

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── server.ts              # Express app entry point
│   ├── config/
│   │   └── database.ts        # Prisma client
│   ├── middleware/
│   │   ├── auth.ts            # JWT auth middleware
│   │   └── errorHandler.ts   # Error handling
│   ├── routes/                # Route definitions
│   ├── controllers/           # Business logic
│   └── utils/                 # Utilities (JWT, password)
├── package.json
├── tsconfig.json
└── .env                       # Environment variables
```

## Notes

- Session metrics are updated incrementally in `/sessions/activity`
- Focus rate is calculated as `lockedInSeconds / totalSessionSeconds` (with division-by-zero guard)
- Timestamps are handled as ISO strings in API, DateTime in database
- AI fields (`aiSummary`, `aiTags`) are nullable and ready for future AI integration
- Leaderboard aggregates using `SUM(lockedInSeconds)` grouped by `userId`

