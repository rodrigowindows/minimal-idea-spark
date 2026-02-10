# LifeOS API Documentation

## Overview

The LifeOS API provides programmatic access to your productivity data. Use it to build integrations, automate workflows, and connect with external tools like Zapier and Make.

**Base URL:** `https://<your-supabase-project>.supabase.co/functions/v1`

## Authentication

All API requests require an API key. Generate one from **Settings > Integrations > API Keys**.

Keys follow the format: `lsk_<random>` (e.g., `lsk_a1b2c3d4e5f6...`)

### Using the API key

For the main API endpoint (`api-auth`), include it in the JSON body:

```json
{
  "api_key": "lsk_your_key_here",
  "action": "...",
  ...
}
```

For inbound webhooks (`webhook-inbound`), use an HTTP header:

```
Authorization: Bearer lsk_your_key_here
```

or:

```
x-api-key: lsk_your_key_here
```

### Scopes

API keys can have the following scopes:

| Scope | Description |
|-------|-------------|
| `read` | Read opportunities, journal entries, and other data |
| `write` | Create, update, and delete data |

---

## Endpoints

### Validate API Key

Verify that your API key is valid and check its scopes.

```http
POST /functions/v1/api-auth
Content-Type: application/json
```

```json
{
  "api_key": "lsk_...",
  "action": "validate"
}
```

**Response (200):**

```json
{
  "ok": true,
  "user_id": "uuid",
  "scopes": ["read", "write"]
}
```

---

### List Opportunities

Retrieve opportunities (tasks) for the authenticated user.

**Scope required:** `read`

```json
{
  "api_key": "lsk_...",
  "action": "opportunities",
  "method": "GET",
  "status": "backlog",
  "limit": 50,
  "offset": 0
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: `backlog`, `doing`, `review`, `done` |
| `limit` | number | No | Max results (default: 50) |
| `offset` | number | No | Pagination offset |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "...",
      "description": "...",
      "status": "backlog",
      "created_at": "2026-02-09T..."
    }
  ],
  "count": 1
}
```

---

### Create Opportunity

Create a new opportunity.

**Scope required:** `write`

```json
{
  "api_key": "lsk_...",
  "action": "opportunities",
  "method": "POST",
  "data": {
    "title": "New Opportunity",
    "description": "Details about this opportunity",
    "status": "backlog"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Title of the opportunity |
| `description` | string | No | Detailed description |
| `status` | string | No | Initial status (default: `backlog`) |
| `domain_id` | string | No | Associated life domain ID |

**Response (201):**

```json
{
  "data": {
    "id": "uuid",
    "title": "New Opportunity",
    "status": "backlog",
    ...
  }
}
```

---

### List Journal Entries

Retrieve journal entries for the authenticated user.

**Scope required:** `read`

```json
{
  "api_key": "lsk_...",
  "action": "journal",
  "method": "GET",
  "limit": 20
}
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "...",
      "mood": "good",
      "energy": 8,
      "created_at": "2026-02-09T..."
    }
  ],
  "count": 1
}
```

---

### Create Journal Entry

Create a new daily journal entry.

**Scope required:** `write`

```json
{
  "api_key": "lsk_...",
  "action": "journal",
  "method": "POST",
  "data": {
    "content": "Today I focused on...",
    "mood": "good",
    "energy": 8
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Entry content |
| `mood` | string | No | Mood indicator (e.g., `great`, `good`, `neutral`, `bad`) |
| `energy` | number | No | Energy level (1-10) |

---

### Batch Import

Create multiple opportunities at once.

**Scope required:** `write`

```json
{
  "api_key": "lsk_...",
  "action": "import",
  "items": [
    { "title": "Task 1", "status": "backlog", "description": "..." },
    { "title": "Task 2", "status": "doing" },
    { "title": "Task 3" }
  ]
}
```

**Response (201):**

```json
{
  "imported": 3,
  "total": 3
}
```

---

## Inbound Webhooks

External services can push data into your LifeOS workspace via the inbound webhook endpoint.

```http
POST /functions/v1/webhook-inbound
Authorization: Bearer lsk_your_key_here
Content-Type: application/json
```

### Create Single Item

```json
{
  "type": "opportunity",
  "data": {
    "title": "From External Service",
    "description": "Automatically created",
    "status": "backlog"
  }
}
```

### Batch Items

```json
{
  "items": [
    {
      "type": "opportunity",
      "data": { "title": "Task from Zapier", "status": "backlog" }
    },
    {
      "type": "journal",
      "data": { "content": "Auto-generated journal entry" }
    }
  ]
}
```

**Supported types:** `opportunity`, `journal`

**Response (201):**

```json
{
  "processed": 2,
  "success": 2,
  "failed": 0,
  "results": [
    { "index": 0, "type": "opportunity", "success": true, "id": "uuid" },
    { "index": 1, "type": "journal", "success": true, "id": "uuid" }
  ]
}
```

---

## Outgoing Webhooks

Configure webhook endpoints in **Settings > Integrations > Webhooks** to receive real-time notifications when events occur in your workspace.

### Delivery Format

```http
POST https://your-url.com/webhook
Content-Type: application/json
X-LifeOS-Signature: sha256=<hmac_hex>
X-LifeOS-Event: opportunity_created
X-LifeOS-Delivery: <uuid>
```

```json
{
  "event": "opportunity_created",
  "data": {
    "id": "uuid",
    "title": "New Opportunity",
    "status": "backlog",
    ...
  },
  "timestamp": "2026-02-09T21:00:00.000Z"
}
```

### Verifying Signatures

Compute HMAC-SHA256 of the raw request body using your webhook secret, and compare with the `X-LifeOS-Signature` header value (after removing the `sha256=` prefix).

```javascript
const crypto = require('crypto');

function verifySignature(secret, body, signature) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

### Supported Events

| Event | Description |
|-------|-------------|
| `opportunity_created` | A new opportunity was added |
| `opportunity_updated` | An opportunity was updated (status, title, etc.) |
| `opportunity_deleted` | An opportunity was deleted |
| `journal_created` | A new journal entry was created |
| `habit_completed` | A habit was marked as completed |
| `goal_completed` | A goal was achieved |
| `import_completed` | A batch import was completed |

### Retry Policy

Failed deliveries (non-2xx response or network error) are retried up to **3 times** with exponential backoff (2s, 4s, 6s). Delivery logs are available in the Supabase `webhook_logs` table.

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Per minute | 60 requests |
| Per day | 10,000 requests |
| Per month | 100,000 requests |

Exceeding any limit returns HTTP **429 Too Many Requests**.

Usage logs are tracked per API key and viewable in the integrations dashboard.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (invalid JSON, missing fields) |
| 401 | Unauthorized (missing or invalid API key) |
| 403 | Forbidden (insufficient scope) |
| 404 | Not found (unknown action) |
| 405 | Method not allowed |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Zapier / Make Integration

### As a Trigger (Outgoing Webhooks)

1. Create a webhook endpoint in LifeOS pointing to your Zapier/Make webhook URL
2. Select which events should trigger the webhook
3. In Zapier/Make, set up a "Webhook" trigger and paste the same URL

### As an Action (Inbound Webhooks)

1. Create an API key in LifeOS with `write` scope
2. In Zapier/Make, add an HTTP action:
   - **URL:** `https://<project>.supabase.co/functions/v1/webhook-inbound`
   - **Method:** POST
   - **Headers:** `Authorization: Bearer lsk_your_key` and `Content-Type: application/json`
   - **Body:** `{ "type": "opportunity", "data": { "title": "{{trigger_data}}" } }`

---

## CSV Import Format

For batch imports via the UI or API:

```csv
title,description,status,domain_id,tags
"My Task","A description","backlog","domain-uuid","tag1;tag2"
"Another Task","","doing","",""
```

- **title** (required): Task title
- **description** (optional): Task description
- **status** (optional): `backlog`, `doing`, `review`, `done` (default: `backlog`)
- **domain_id** (optional): Life domain UUID
- **tags** (optional): Semicolon-separated tag names
