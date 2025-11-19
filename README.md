# Focus Lock-In Chrome Extension

A Chrome Extension (Manifest V3) that tracks focus sessions with lock-in detection, idle monitoring, and productivity metrics.

## Features

- **Focus Session Tracking**: Start and end focus sessions with detailed metrics
- **Lock-In Detection**: Automatically detects when you're genuinely focused vs distracted
- **Idle Monitoring**: Tracks idle time with a 2-minute forgiveness threshold
- **Random Focus Checks**: Periodic popups to verify you're still focused
- **Productive/Unproductive Site Classification**: Pre-configured domain lists
- **Activity Segmentation**: Tracks time segments with detailed reasons
- **Backend Integration**: Uploads session data to your backend API

## Project Structure

```
Anchor/
├── manifest.json              # Chrome extension manifest
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── build.config.js            # Build configuration (esbuild)
├── src/
│   ├── background.ts          # Service worker (core logic)
│   ├── popup.html             # Popup HTML container
│   ├── popup.tsx              # React popup UI
│   ├── types.ts               # TypeScript type definitions
│   ├── config/
│   │   ├── domains.ts         # Productive/unproductive domain lists
│   │   └── api.ts             # API configuration
│   ├── utils/
│   │   ├── domain.ts          # Domain extraction utilities
│   │   └── time.ts            # Time formatting utilities
│   └── api/
│       └── client.ts          # Backend API client
└── public/                    # Build output (load this in Chrome)
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `public/` directory

## Development

- **Build once**: `npm run build`
- **Watch mode**: `npm run watch` (coming soon)

## Configuration

### API Endpoint

Update `src/config/api.ts` to set your backend API base URL:

```typescript
export const API_BASE_URL = 'https://your-api.com';
```

### Domain Lists

Edit `src/config/domains.ts` to customize productive and unproductive domain lists.

### Dashboard URL

Update the `DASHBOARD_URL` constant in `src/popup.tsx` to point to your web app dashboard.

## Authentication

The extension expects an `authToken` to be stored in `chrome.storage.local`. You'll need to implement a login flow (outside this extension) that stores the token:

```javascript
chrome.storage.local.set({ authToken: 'your-token-here' });
```

## How It Works

### Lock-In Detection

A period is considered **Locked-In** when:
- Active tab is on a productive domain
- User is not idle beyond 2 minutes
- User has not failed a random focus check

A period is **Non-Lock** when:
- Active tab is on an unproductive domain
- User has been idle for 2+ minutes (time beyond 2 minutes counts)
- User fails a random "Still focused?" check

### State Machine

The extension maintains three states:
- `noSession`: No active session
- `sessionActive_lockedIn`: Session active, user is focused
- `sessionActive_notLockedIn`: Session active, user is distracted

### Activity Segments

The extension tracks activity in segments, each recording:
- Start/end timestamps
- Domain
- Productive status
- Lock-in status
- Reason (productive, idle-beyond-2m, unproductive-domain, failed-check, other)

### Metrics

For each session, the extension calculates:
- `totalSessionSeconds`: Total session duration
- `lockedInSeconds`: Time spent locked in
- `nonLockSeconds`: Time spent not locked in
- `focusRate`: `lockedInSeconds / totalSessionSeconds`
- `idleBeyond2minSeconds`: Idle time beyond 2-minute threshold
- `tabSwitchCount`: Number of domain changes

## API Endpoints

The extension expects these backend endpoints:

### POST /sessions/start
**Request**: `{ authToken }`  
**Response**: `{ sessionId }`

### POST /sessions/activity
**Request**: 
```json
{
  "sessionId": "123",
  "segments": [ /* ActivitySegment[] */ ]
}
```

### POST /sessions/end
**Request**:
```json
{
  "sessionId": "123",
  "sessionStartTimestamp": 1234567890,
  "sessionEndTimestamp": 1234567890,
  "totalSessionSeconds": 3600,
  "lockedInSeconds": 3000,
  "nonLockSeconds": 600,
  "focusRate": 0.833,
  "idleBeyond2minSeconds": 120,
  "tabSwitchCount": 5,
  "segments": [ /* ActivitySegment[] */ ]
}
```

## Permissions

The extension requires:
- `tabs`: Track active tabs
- `activeTab`: Access current tab info
- `storage`: Store session state and auth token
- `idle`: Detect user idle state
- `notifications`: Show random focus checks
- `scripting`: Inject content scripts (if needed)
- `<all_urls>`: Track domains on any website

## License

MIT

