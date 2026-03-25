# Real-Time IPL Auction Multiplayer Web App

Full-stack scaffold for a production-oriented IPL auction simulator using:

- `frontend`: Next.js App Router, React, Tailwind CSS, Framer Motion
- `backend`: Express, Socket.IO, Prisma, PostgreSQL-ready APIs
- `prisma`: shared Prisma schema for room, user, team, and player persistence

## Run locally

1. Install dependencies:
   - `npm install`
2. Generate Prisma client:
   - `cd backend && npx prisma generate --schema ../prisma/schema.prisma`
3. Apply database migrations after creating PostgreSQL database:
   - `cd backend && npx prisma migrate dev --schema ../prisma/schema.prisma`
4. Start apps in separate terminals:
   - `npm run dev:backend`
   - `npm run dev:frontend`

## Notes

- Live auction timing and bid concurrency are managed in-memory on the backend.
- Database writes are intended for room metadata, player catalog, retentions, and replacement validation.
- The UI is scaffolded for lobby, synchronized team randomizer, retention lock, and live bidding dashboard.
