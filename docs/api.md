# ReachInbox REST API Documentation

Base URL: `http://localhost:8383/api`

## Authentication

All protected endpoints require an active session via an HttpOnly cookie (`reachinbox_session`) or an `Authorization: Bearer <token>` header.

### Endpoints

#### 1. Authentication
- `GET /api/auth/google/url` - Returns Google OAuth 2.0 authorization URL and state token.
- `GET /api/auth/google/callback?code=...&state=...` - Validates Google OAuth code and establishes session.
- `GET /api/auth/me` - Returns profile of currently authenticated user.
- `POST /api/auth/logout` - Terminates user session.

#### 2. Email Scheduling & Management
- `POST /api/emails/schedule` - Schedules an outreach campaign.
  - Body:
    ```json
    {
      "senderId": "sender_cuid",
      "subject": "Outreach Subject",
      "body": "Email body content",
      "recipients": ["user1@domain.com", "user2@domain.com"],
      "startAt": "2026-10-01T10:00:00.000Z",
      "minimumDelaySeconds": 2,
      "hourlyLimit": 100
    }
    ```
- `GET /api/emails/scheduled?page=1&limit=20` - Returns paginated scheduled emails.
- `GET /api/emails/sent?page=1&limit=20` - Returns paginated sent / failed email history.
- `GET /api/emails/metrics` - Returns aggregate workspace metrics (scheduled, sent, failed, processing counts).
- `GET /api/emails/:id` - Returns details and event audit history for an individual email.
- `POST /api/emails/:id/cancel` - Cancels a scheduled email if not yet processing.

#### 3. Campaigns
- `GET /api/campaigns?page=1&limit=20` - Lists campaigns for the user.
- `GET /api/campaigns/:id` - Returns campaign details and breakdown of email statuses.

#### 4. Email Senders
- `GET /api/senders` - Lists user's configured senders (sanitizes passwords).
- `POST /api/senders/test` - Tests SMTP connectivity before saving.
- `POST /api/senders` - Creates a new sender account with encrypted credentials.
- `PATCH /api/senders/:id` - Updates rate limits, minimum delay, or active status.
- `DELETE /api/senders/:id` - Deletes a sender safely.

#### 5. Search
- `GET /api/search/emails?q=term&page=1&limit=20` - Performs user-scoped search across recipient, subject, sender, and status using Elasticsearch.

#### 6. Slack Integration
- `GET /api/slack/connect` - Initiates Slack OAuth 2.0 connection.
- `GET /api/slack/callback?code=...&state=...` - Validates code and stores encrypted workspace tokens.
- `GET /api/slack/status` - Returns whether Slack is connected.
- `POST /api/slack/disconnect` - Revokes Slack connection.

#### 7. Observability & Health
- `GET /api/health` - Returns JSON health status of MySQL, Redis, and Elasticsearch.
- `GET /admin/queues` - Live Bull Board web UI (requires `x-admin-key` header or dev mode).
