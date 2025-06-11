# Auth

## Abstract

This document specifies how applications authenticate with Hengdang homeservers using NIP-98 authorization events to obtain session tokens.

## Specification

### Authorization Flow

Applications authenticate by:
1. Creating a NIP-98 HTTP Auth event signed by the server owner's key
2. Sending this event to obtain a session token
3. Using the session token for subsequent requests

### NIP-98 Authorization Event

The application creates a NIP-98 event targeting the session endpoint:

```json
{
  "pubkey": "<server_owner_pubkey>",
  "created_at": 1736726400,
  "kind": 27235,
  "tags": [
    ["u", "https://example.com/auth/session"],
    ["method", "POST"]
  ],
  "content": "",
  "sig": "<signature>"
}
```

The `pubkey` MUST be the server owner's public key.

### Session Creation

**POST** `/auth/session`

Request body contains the NIP-98 authorization event.

Response (201):
```json
{
  "sessionId": "abc123def456...",
  "permissions": ["read", "write"],
  "expiresAt": 1737331200000
}
```

The server validates:
- Event follows NIP-98 specification
- `pubkey` matches the configured server owner
- Event targets the correct URL and method

### Using Session Tokens

Applications authenticate subsequent requests using:
- Cookie: `hengdang_session=<sessionId>`
- Header: `Authorization: Bearer <sessionId>`

### Session Information

**GET** `/auth/session`

Response (200):
```json
{
  "sessionId": "abc123def456...",
  "permissions": ["read", "write"],
  "createdAt": 1736726400000,
  "lastUsed": 1736812800000,
  "expiresAt": 1737331200000
}
```

### Session Deletion (Logout)

**DELETE** `/auth/session`

Response: 204 No Content
