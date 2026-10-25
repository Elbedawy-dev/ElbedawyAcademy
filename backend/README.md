# Elbedawy Academy Backend (Node.js / Express / MongoDB)

> Complete, production-grade backend API and realtime engine for **Elbedawy Academy**, an online Quran memorization and Egyptian curriculum academy.

---

## 📖 Table of Contents
1. [Product Overview](#-product-overview)
2. [Architecture & Design Principles](#-architecture--design-principles)
3. [Tech Stack](#-tech-stack)
4. [Folder Structure](#-folder-structure)
5. [Environment Variables](#-environment-variables)
6. [Quick Start & Installation](#-quick-start--installation)
7. [Running with Docker Compose](#-running-with-docker-compose)
8. [Database Seeding](#-database-seeding)
9. [Running Tests](#-running-tests)
10. [Realtime Engine (Socket.io)](#-realtime-engine-socketio)
11. [Live Streaming (Agora Integration)](#-live-streaming-agora-integration)
12. [Payment & Subscriptions (Paymob)](#-payment--subscriptions-paymob)
13. [API Documentation & Postman](#-api-documentation--postman)

---

## 🌟 Product Overview
- **Clients**: Admin web dashboard (React), Mobile app (React Native) for Teachers, Students, and Parents.
- **Academic Scope**:
  - **Quran Memorization**: New memorization (*Hifz*), Tafsir of newly memorized portion, and near/far revision (*Muraja'ah*). Includes Matn Tuhfat al-Atfal and Matn al-Jazariyyah taught every Sunday and Thursday.
  - **Egyptian School Curriculum**: Primary 1 through Secondary 3 (12 grades total).
- **Classroom Model**: Private-lesson style. Approved teachers own one dedicated private **Room** and host **Groups** with custom pricing, schedules, and gender specifications (*boys*, *girls*, or *mixed*).
- **Strict Privacy Isolation**: Students only see groups they are actively enrolled in. Querying or inferring unauthorized groups returns `404 Not Found` (never 403) to prevent resource leakage. Group chats never expose personal student contact info to peers. Direct private messaging between teachers and minors is strictly prohibited.

---

## 🏗 Architecture & Design Principles
- **Thin Controllers, Rich Services**: Business logic lives in `src/services/`; controllers only handle request validation, response formatting, and error forwarding.
- **MongoDB Transactions**: Used across critical multi-document operations (enrollments + payments, user registration + profile initialization, payouts) with automatic fallback for standalone development instances.
- **Security In-Depth**: Helmet, HPP, express-mongo-sanitize, XSS protection, bcrypt password hashing, and configurable CORS origins.
- **Stateless Authentication**: 15-minute JWT access tokens paired with 7-day database-hashed refresh tokens that rotate upon every use. Token reuse attacks automatically revoke all active sessions.

---

## 🛠 Tech Stack
- **Runtime**: Node.js (v20+ LTS, Native ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Realtime**: Socket.io 4.8+
- **Live Video**: Agora RTC Token Builder (abstracted service)
- **File Storage**: Cloudinary (memory storage upload stream, automatic face-cropping for avatars, authenticated/private delivery for teacher qualifications)
- **Push Notifications**: Firebase Cloud Messaging (FCM multicast)
- **Payment Gateway**: Paymob (Card & Mobile Wallet integration with HMAC-SHA512 verification)
- **Scheduled Cron**: Node-Cron (30-min session alerts, subscription grace management, monthly payouts)
- **Validation**: Zod schema validation on body, query, and params
- **PDF Generation**: PDFKit (custom progress report card and verifiable landscape certificates)

---

## 📁 Folder Structure
```text
backend/
├── src/
│   ├── config/              # Validated environment, db, cloudinary, firebase, agora, paymob
│   ├── controllers/         # Thin HTTP request handlers
│   ├── docs/                # OpenAPI/Swagger 3.0 documentation
│   ├── jobs/                # Background cron schedules (reminders, subscriptions, payouts)
│   ├── middlewares/         # Auth, role, validation, multer, error, rateLimit, ownership
│   ├── models/              # Mongoose schemas with indexes, virtuals, and methods
│   ├── routes/              # Express API versioned routes (/api/v1)
│   ├── seeds/               # Comprehensive seed script
│   ├── services/            # Core business logic and external integrations
│   ├── sockets/             # Socket.io authentication, chat, live presence, notifications
│   ├── utils/               # AppError, asyncHandler, apiFeatures, crypto, time, quran
│   ├── validators/          # Zod validation schemas
│   ├── app.js               # Express application configuration
│   └── server.js            # HTTP and WebSocket server bootstrap
├── tests/                   # Jest + Supertest test suites
├── postman/                 # Ready-to-import Postman collection
├── Dockerfile               # Production multi-stage Alpine image
├── docker-compose.yml       # API + Mongo replica-set stack
└── package.json             # Manifest and dependencies
```

---

## 🔑 Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration properties:
- `MONGO_URI`: MongoDB connection string.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Secrets (at least 32 characters).
- `ENCRYPTION_KEY`: 64 hex characters (32 bytes) for AES-256-GCM encryption of payout info.
- `AGORA_APP_ID` & `AGORA_APP_CERTIFICATE`: Live video streaming credentials.
- `PAYMOB_API_KEY` & `PAYMOB_HMAC_SECRET`: Paymob payment integration keys.
- `CLOUDINARY_*`: Cloudinary storage credentials.

---

## 🚀 Quick Start & Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start MongoDB locally (or via Docker).
3. Seed the database:
   ```bash
   npm run seed:fresh
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. Server will run on `http://localhost:5000`.

---

## 🐳 Running with Docker Compose
To run both MongoDB (configured as a single-node replica set for transactions) and the API:
```bash
docker-compose up --build
```
The API is available at `http://localhost:5000`, with healthcheck at `/api/v1/health`.

---

## 👥 Seed Accounts
When running `npm run seed:fresh`, the following test users are created (**Password for all accounts**: `Password123!`):

| Role | Email | Details |
|---|---|---|
| **Admin** | `admin@elbedawy-academy.com` | Full administrative access |
| **Teacher** | `ahmed.elbedawy@academy.com` | Sheikh Ahmed (Quran & Tajweed) |
| **Teacher** | `fatima.zahra@academy.com` | Sheikha Fatima (Girls Quran Group) |
| **Teacher** | `mahmoud.ibrahim@academy.com` | Mr. Mahmoud (School Arabic) |
| **Parent** | `parent1@elbedawy-academy.com` | Father of students 1, 2, 3 |
| **Parent** | `parent2@elbedawy-academy.com` | Mother of students 4, 5, 6 |
| **Student** | `student1@elbedawy-academy.com` | Enrolled in Boys Quran group |
| **Student** | `student6@elbedawy-academy.com` | Enrolled in Girls Quran group |

---

## 🧪 Running Tests
Unit and integration tests run with an embedded in-memory MongoDB server:
```bash
npm test
```
To run tests with code coverage:
```bash
npm run test:coverage
```

---

## ⚡ Realtime Engine (Socket.io)
Connect with JWT in the handshake:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_ACCESS_TOKEN' }
});
```

### Events:
- **`chat:send`**: Emit message to group (`{ groupId, content, replyTo }`).
- **`chat:message`**: Broadcasted when a new message arrives in your group.
- **`chat:typing`**: Typing indicator in group.
- **`chat:read`**: Read receipt notification.
- **`live:join` / `live:leave`**: Automatic session presence tracking.
- **`presence:update`**: Live participant join/leave alerts.
- **`notification:new`**: Realtime push of in-app notifications.
- **`session:started` / `session:ended`**: Live broadcast state.

---

## 💳 Payment & Webhooks
Paymob webhook endpoint:
```text
POST /api/v1/payments/webhook
```
Verifies HMAC SHA512 signature, processes transaction idempotency, credits teacher payout splits, and activates student subscription records.

---

## 📚 API Documentation & Postman
- **Swagger Interactive UI**: Navigate to `http://localhost:5000/api/docs`
- **Postman Collection**: Located in `postman/Elbedawy_Academy.postman_collection.json`. Import into Postman to test all endpoints.

---
*Built with ❤️ for Elbedawy Academy.*
