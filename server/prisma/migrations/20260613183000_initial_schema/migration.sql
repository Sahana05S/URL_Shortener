CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "publicStats" BOOLEAN NOT NULL DEFAULT false,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorHash" TEXT,
    "country" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "referrer" TEXT,
    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BulkImportRow" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BulkImportRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AbuseReport" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "Link_shortCode_key" ON "Link"("shortCode");
CREATE INDEX "Link_userId_createdAt_idx" ON "Link"("userId", "createdAt" DESC);
CREATE INDEX "Visit_linkId_visitedAt_idx" ON "Visit"("linkId", "visitedAt" DESC);
CREATE INDEX "Visit_visitedAt_idx" ON "Visit"("visitedAt");
CREATE UNIQUE INDEX "BulkImportRow_idempotencyKey_key" ON "BulkImportRow"("idempotencyKey");
CREATE UNIQUE INDEX "BulkImportRow_linkId_key" ON "BulkImportRow"("linkId");
CREATE INDEX "BulkImportRow_userId_createdAt_idx" ON "BulkImportRow"("userId", "createdAt" DESC);
CREATE INDEX "AbuseReport_linkId_createdAt_idx" ON "AbuseReport"("linkId", "createdAt" DESC);

ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Link"
ADD CONSTRAINT "Link_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Visit"
ADD CONSTRAINT "Visit_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BulkImportRow"
ADD CONSTRAINT "BulkImportRow_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BulkImportRow"
ADD CONSTRAINT "BulkImportRow_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AbuseReport"
ADD CONSTRAINT "AbuseReport_linkId_fkey"
FOREIGN KEY ("linkId") REFERENCES "Link"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
