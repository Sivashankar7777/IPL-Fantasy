# Real-Time IPL Auction Multiplayer Web App

Full-stack IPL auction simulator using:

- `frontend`: Next.js App Router, React, Tailwind CSS, Framer Motion
- `backend`: Express, Socket.IO, Prisma APIs
- `database`: Prisma connected to your Neon Postgres database

## Run locally

1. Install dependencies:
   - `npm install`
2. Make sure `backend/.env` contains your Neon `DATABASE_URL` and `DIRECT_URL`
3. Generate Prisma client:
   - `npx prisma generate --schema backend/prisma/schema.prisma`
4. Start the app:
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Notes

- The app now runs as a local frontend and local backend.
- The backend defaults to `http://localhost:3001`.
- The frontend defaults to `http://localhost:3000`.

## Live Points Sync Setup

The `Sync Points` button now triggers this flow:

1. Frontend calls `POST /api/fantasy/live-sync`
2. Backend calls your Google Apps Script web app
3. Apps Script updates the sheet and posts points back to `POST /api/fantasy/sync-points`
4. The leaderboard is refreshed from the database

### Backend env

Add these to `backend/.env`:

```env
FRONTEND_URL="http://localhost:3000"
GOOGLE_APPS_SCRIPT_SYNC_URL="https://script.google.com/macros/s/your-web-app-id/exec"
GOOGLE_APPS_SCRIPT_SYNC_SECRET="replace-this-with-a-secret"
```

### Apps Script webhook

Add this to your Apps Script project so your local app can trigger the sync:

```javascript
function doPost(e) {
  try {
    const body = e.postData?.contents ? JSON.parse(e.postData.contents) : {};
    const expectedSecret = "replace-this-with-a-secret";

    if (body.secret !== expectedSecret) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    updateIPL2026FantasyPoints();

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: "Live sync triggered" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Deploy it as a Web App:

1. `Deploy` -> `New deployment`
2. Type: `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone with the link`

### Expose local backend to Apps Script

Apps Script cannot call `http://localhost:3001` directly, so expose your backend temporarily.

Using `ngrok`:

```bash
ngrok http 3001
```

Using `localtunnel`:

```bash
npx localtunnel --port 3001
```

Take the public HTTPS URL and update your Apps Script:

```javascript
const API_URL = "https://your-public-url/api/fantasy/sync-points";
```

Also include the same secret when Apps Script pushes points back:

```javascript
const payload = JSON.stringify({
  secret: "replace-this-with-a-secret",
  pointsData: pointsData
});
```

### Minimal Apps Script change

Update your existing `syncDream11PointsToApp()` to send both the tunnel URL and the secret:

```javascript
function syncDream11PointsToApp() {
  const API_URL = "https://your-public-url/api/fantasy/sync-points";

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  let pointsData = [];

  for (let i = 1; i < data.length; i++) {
    let playerName = data[i][0];
    let points = data[i][1];

    if (playerName && typeof points === "number") {
      pointsData.push({
        name: playerName,
        points: points
      });
    }
  }

  const payload = JSON.stringify({
    secret: "replace-this-with-a-secret",
    pointsData: pointsData
  });

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(API_URL, options);
  Logger.log(response.getContentText());
}
```
