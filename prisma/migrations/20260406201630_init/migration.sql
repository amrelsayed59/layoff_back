-- CreateTable
CREATE TABLE "LayoffStory" (
    "id" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "layoffDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "story" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayoffStory_pkey" PRIMARY KEY ("id")
);
