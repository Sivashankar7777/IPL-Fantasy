-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "adminUserId" TEXT,
    "currentPlayerId" TEXT,
    "randomizerSeed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "socketId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "budgetRemaining" INTEGER NOT NULL DEFAULT 1000,
    "retainedLocked" BOOLEAN NOT NULL DEFAULT false,
    "assignedTeamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "logoUrl" TEXT,
    "totalDream11Points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Team_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT,
    "originalTeamId" TEXT,
    "currentTeamId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryType" TEXT NOT NULL,
    "baseTeam" TEXT,
    "lot" TEXT,
    "basePrice" INTEGER NOT NULL DEFAULT 50,
    "soldPrice" INTEGER,
    "battingStyle" TEXT,
    "bowlingStyle" TEXT,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER,
    "dream11Points" INTEGER NOT NULL DEFAULT 0,
    "statsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isRetained" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Player_originalTeamId_fkey" FOREIGN KEY ("originalTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Player_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_roomId_username_key" ON "User"("roomId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Team_ownerUserId_key" ON "Team"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_roomId_code_key" ON "Team"("roomId", "code");

-- CreateIndex
CREATE INDEX "Player_roomId_status_idx" ON "Player"("roomId", "status");

-- CreateIndex
CREATE INDEX "Player_currentTeamId_idx" ON "Player"("currentTeamId");

-- CreateIndex
CREATE INDEX "Player_originalTeamId_countryType_idx" ON "Player"("originalTeamId", "countryType");

