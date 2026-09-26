# ReachInbox Troubleshooting Guide

## Common Scenarios & Resolutions

### 1. Redis Connection Refused (`ECONNREFUSED 127.0.0.1:6379`)
- **Cause**: Redis server is not running on the configured port.
- **Fix**: Run `npm run docker:up` or launch Redis locally (`redis-server`). Check `.env` `REDIS_HOST` and `REDIS_PORT`.

### 2. MySQL Authentication or Database Missing
- **Cause**: MySQL container not initialized or user permissions incorrect.
- **Fix**: Verify `DATABASE_URL` in `.env`. Run:
  ```bash
  npm run prisma:push
  npm run seed
  ```

### 3. Elasticsearch Single-Node Warnings
- **Cause**: Elasticsearch requires at least 512MB RAM in single-node mode.
- **Fix**: Ensure Docker has sufficient memory. In local development without Elasticsearch, ReachInbox automatically falls back to MySQL database queries so the platform remains fully functional.

### 4. Bull Board 401 Unauthorized
- **Cause**: Accessing `/admin/queues` in production mode without the admin key.
- **Fix**: Pass `?key=admin_reachinbox_secret_queue_2026` in the URL or set header `x-admin-key: admin_reachinbox_secret_queue_2026`.

### 5. Google OAuth Redirect URI Mismatch
- **Cause**: The authorized redirect URI in Google Cloud Console does not match `GOOGLE_CALLBACK_URL`.
- **Fix**: Add `http://localhost:8383/api/auth/google/callback` to Authorized Redirect URIs in your Google Cloud OAuth Client ID settings. Alternatively, use the **Quick Workspace Demo** button on the login screen for instant local testing.

### 6. Slack OAuth Scopes
- **Cause**: Slack app is missing required permissions.
- **Fix**: Ensure your Slack app has `chat:write` and `incoming-webhook` scopes under *OAuth & Permissions*.
