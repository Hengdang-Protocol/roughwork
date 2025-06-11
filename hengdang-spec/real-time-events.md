# Real-time Events

## Abstract

This document specifies the real-time event system for Hengdang homeservers using Server-Sent Events (SSE) to notify clients of file changes.

## Specification

### Event Stream Connection

**GET** `/events/stream`

Establishes a Server-Sent Events connection for real-time file change notifications.

Requires authentication (session token).

#### Request Headers

```
Accept: text/event-stream
Cache-Control: no-cache
```

#### Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Access-Control-Allow-Origin: *
```

### Path Filtering

Optional query parameter:
- `path`: Filter events to specific path or path prefix

Examples:
- `/events/stream` - All file changes
- `/events/stream?path=/documents` - Only `/documents` changes
- `/events/stream?path=/documents/*` - All files under `/documents/`
- `/events/stream?path=/documents/file.txt` - Only specific file

### Event Format

Events use standard SSE format:

```
data: {"type":"file_change","path":"/documents/file.txt","operation":"PUT","timestamp":1736726400000}

data: {"type":"file_change","path":"/documents/old.txt","operation":"DELETE","timestamp":1736726401000}
```

#### Connection Event

Sent immediately upon connection:

```
data: {"type":"connected","timestamp":1736726400000}
```

#### File Change Event

Sent when files are modified:

```json
{
  "type": "file_change",
  "path": "/documents/file.txt",
  "operation": "PUT",
  "timestamp": 1736726400000
}
```

Fields:
- `type`: Always `"file_change"`
- `path`: Full file path
- `operation`: `"PUT"` (create/update) or `"DELETE"`
- `timestamp`: Unix timestamp in milliseconds

### Event Delivery

- Events are only sent to connections authenticated with the file owner's session
- Path filtering is applied server-side
- No event history or replay - only live events
- Connection drops on authentication failure

### Client Implementation

```javascript
const eventSource = new EventSource('/events/stream?path=/documents/*');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  if (data.type === 'file_change') {
    console.log(`File ${data.operation}: ${data.path}`);
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error');
};
```

### Connection Management

- Clients should handle connection drops and reconnect
- Servers may close idle connections
- No ping/keepalive messages defined</parameter>
</invoke>
</artifacts:function_calls>
