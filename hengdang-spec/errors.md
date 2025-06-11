# Error Handling

## Abstract

This document specifies the error response format and status codes for Hengdang homeservers.

## Specification

### Error Response Format

All errors MUST return JSON with this structure:

```json
{
  "error": "Brief error type",
  "message": "Human readable description"
}
```

Optional fields:
- `code`: Application-specific error code
- Additional context fields

### Authentication Errors

#### 401 Unauthorized

No valid session or expired session:

```json
{
  "error": "Authentication required",
  "message": "No session cookie or authorization header found"
}
```

Invalid signature or event:

```json
{
  "error": "Invalid signature", 
  "message": "Event signature verification failed"
}
```

#### 403 Forbidden

Wrong pubkey or insufficient permissions:

```json
{
  "error": "Unauthorized",
  "message": "Only the server owner can create sessions"
}
```

```json
{
  "error": "Insufficient permissions",
  "message": "Required permissions: write",
  "userPermissions": ["read"]
}
```

### File Operation Errors

#### 400 Bad Request

Invalid path:

```json
{
  "error": "Invalid path",
  "message": "Path traversal not allowed"
}
```

Invalid headers:

```json
{
  "error": "Invalid If-Match header format",
  "message": "If-Match must be a quoted ETag value"
}
```

#### 404 Not Found

File or directory not found:

```json
{
  "error": "File not found",
  "message": "The specified file does not exist"
}
```

#### 412 Precondition Failed

Conditional request failed:

```json
{
  "error": "Precondition Failed",
  "message": "File has been modified by another client",
  "currentETag": "\"abc123-1736726400000\""
}
```

#### 423 Locked

File is locked:

```json
{
  "error": "File is locked",
  "message": "This file is currently being edited by another session",
  "lockedBy": "session123...",
  "lockedAt": 1736726400000,
  "expiresAt": 1736728200000
}
```

### Server Errors

#### 500 Internal Server Error

Generic server error:

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

### Status Code Summary

- `200` - Success
- `201` - Created (new file)
- `204` - No Content (successful deletion)
- `304` - Not Modified (conditional request)
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (access denied)
- `404` - Not Found (resource missing)
- `412` - Precondition Failed (conditional request failed)
- `423` - Locked (file locked by another session)
- `500` - Internal Server Error</parameter>
