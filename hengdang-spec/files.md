# Files and Directories

## Abstract

This document specifies the file and directory operations API for Hengdang homeservers, defining how clients read, write, and manage files and directories.

## Specification

### Path Format

File and directory paths MUST:
- Start with `/`
- Not contain `..` (path traversal)
- Not contain control characters (0x00-0x1F, 0x7F)
- Not exceed 4096 characters
- Not contain empty segments (`//`)

### Directory Operations

#### Creating Directories

**POST** `/<path>/`

Creates a new directory. Parent directories must exist.

Request body:
```json
{
  "description": "Optional description"
}
```

Response (201):
```json
{
  "path": "/documents/",
  "owner": "abc123...",
  "created": 1736726400000
}
```

Error responses:
- `409 Conflict` - Directory already exists
- `400 Bad Request` - Parent directory does not exist
- `403 Forbidden` - No permission to create in parent directory

#### Deleting Directories

**DELETE** `/<path>/`

Removes an empty directory.

Response: `204 No Content` or `404 Not Found`

Error responses:
- `409 Conflict` - Directory is not empty
- `403 Forbidden` - No permission to delete directory

### File Metadata

**HEAD** `/<path>`

Returns file metadata without content.

Response headers:
- `Content-Type`: File MIME type
- `Content-Length`: File size in bytes
- `ETag`: Content hash and timestamp
- `Last-Modified`: HTTP date format

Response: `200 OK` or `404 Not Found`

### Reading Files and Listing Directories

**GET** `/<path>`

Returns file content or directory listing.

#### Conditional Requests

Supports conditional headers:
- `If-None-Match`: ETag value
- `If-Modified-Since`: HTTP date

Returns `304 Not Modified` if conditions match.

#### File Response

Response headers:
- `Content-Type`: File MIME type
- `Content-Length`: File size
- `ETag`: `"<hash>-<timestamp>"`
- `Last-Modified`: HTTP date
- `Cache-Control`: `public, max-age=3600`

Response body: File content

#### Directory Response

Query parameters:
- `limit`: Maximum entries (default 100, max 1000)
- `cursor`: Pagination cursor
- `reverse`: Boolean (default false)
- `shallow`: Boolean (default true)

Response (200):
```json
{
  "entries": [
    {
      "path": "/documents/file.txt",
      "type": "file",
      "size": 1024,
      "contentType": "text/plain",
      "lastModified": 1736726400000
    },
    {
      "path": "/documents/subfolder/",
      "type": "directory",
      "lastModified": 1736726400000
    }
  ],
  "nextCursor": "/documents/file2.txt",
  "hasMore": true
}
```

### Writing Files

**PUT** `/<path>`

Writes file content. Parent directories are created automatically.

Request body: File content (binary)

#### Conditional Writes

Supports conditional headers:
- `If-Match`: Only write if ETag matches
- `If-None-Match`: Only write if ETag doesn't match or `*`
- `If-Unmodified-Since`: Only write if not modified since date

Returns `412 Precondition Failed` if conditions fail.

#### Response

Response headers:
- `ETag`: New content hash and timestamp
- `Last-Modified`: Creation/modification time
- `Location`: File path

Response (201 for new, 200 for update):
```json
{
  "path": "/documents/file.txt",
  "size": 1024,
  "contentType": "text/plain",
  "hash": "abc123...",
  "timestamp": 1736726400000,
  "created": true
}
```

### Deleting Files

**DELETE** `/<path>`

Removes a file.

Response: `204 No Content` or `404 Not Found`

### Content Type Detection

Content types are determined by:
1. Magic byte detection (PNG, JPEG, PDF, etc.)
2. Content analysis (JSON validation)
3. File extension fallback
4. Default: `application/octet-stream`

### ETag Format

ETags use format: `"<content_hash>-<timestamp>"`

Where:
- `content_hash`: SHA-256 hex of file content
- `timestamp`: Unix timestamp in milliseconds

### Cache Headers

Files include cache headers:
- `Cache-Control: public, max-age=3600` (files)
- `Cache-Control: public, max-age=300` (directories)

### Directory Structure

- Directories are explicit entities that must be created before use
- Parent directories are automatically created when uploading files
- Directories must be empty before deletion
- Directory listings show both files and subdirectories
