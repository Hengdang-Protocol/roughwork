# File Locking

**Status**: Draft  
**Type**: Standards Track  
**Created**: 2025-01-12

## Abstract

This document specifies the file locking mechanism for Hengdang homeservers to coordinate concurrent access between clients.

## Specification

### Lock Acquisition

File locks are automatically acquired during PUT operations and can be explicitly managed via query parameters.

#### Automatic Locking

**PUT** `/<path>`

Servers MUST attempt to acquire a lock before writing. If the file is locked by another session, return 423 Locked.

#### Explicit Lock Management

Query parameters for lock operations:
- `?lock=acquire` - Acquire lock without writing
- `?lock=release` - Release existing lock  
- `?lock=refresh` - Extend lock expiry
- `?lock=status` - Check lock status

### Lock Responses

#### 423 Locked

When a file is locked by another session:

```json
{
  "error": "File is locked",
  "message": "This file is currently being edited by another session",
  "lockedBy": "session123...",
  "lockedAt": 1736726400000,
  "expiresAt": 1736728200000
}
```

#### Lock Acquisition Success

**GET** `/<path>?lock=acquire`

Response (200):
```json
{
  "message": "Lock acquired",
  "path": "/documents/file.txt",
  "sessionId": "session456..."
}
```

#### Lock Status

**GET** `/<path>?lock=status`

Response (200):
```json
{
  "locked": true,
  "lock": {
    "lockedBy": "session123...",
    "lockedAt": 1736726400000,
    "expiresAt": 1736728200000
  },
  "ownedByThisSession": false
}
```

### Lock Properties

- **Duration**: Locks expire after 1800 seconds (30 minutes)
- **Ownership**: Only the locking session can release or refresh
- **Scope**: Locks apply to individual files, not directories
- **Auto-release**: Locks are released after successful PUT operations

### Lock Refresh

**GET** `/<path>?lock=refresh`

Extends lock expiry by 30 minutes for the owning session.

Response (200):
```json
{
  "message": "Lock refreshed",
  "path": "/documents/file.txt"
}
```

### Lock Release

**GET** `/<path>?lock=release`

Releases lock if owned by current session.

Response (200):
```json
{
  "message": "Lock released",
  "path": "/documents/file.txt"
}
```

### Session Cleanup

When sessions expire or are deleted, all associated locks MUST be released automatically.
