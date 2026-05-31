CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "atolyeId" TEXT NOT NULL,
  "personelId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "inApp" BOOLEAN NOT NULL DEFAULT true,
  "push" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_personelId_category_key" ON "NotificationPreference"("personelId", "category");
CREATE INDEX "NotificationPreference_atolyeId_idx" ON "NotificationPreference"("atolyeId");
CREATE INDEX "NotificationPreference_category_idx" ON "NotificationPreference"("category");

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_atolyeId_fkey"
  FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
  ADD CONSTRAINT "NotificationPreference_personelId_fkey"
  FOREIGN KEY ("personelId") REFERENCES "personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
