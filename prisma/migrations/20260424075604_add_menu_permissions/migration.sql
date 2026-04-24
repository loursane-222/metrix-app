/*
  Warnings:

  - A unique constraint covering the columns `[personelId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Is" ADD COLUMN     "isTarihi" TIMESTAMP(3),
ADD COLUMN     "kaybedilmeTarihi" TIMESTAMP(3),
ADD COLUMN     "musteriId" TEXT,
ADD COLUMN     "onaylanmaTarihi" TIMESTAMP(3),
ADD COLUMN     "tahsilat" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "tasDurumu" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedMenus" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "personelId" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "Musteri" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "firmaAdi" TEXT NOT NULL DEFAULT '',
    "ad" TEXT NOT NULL DEFAULT '',
    "soyad" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "acilisBakiyesi" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bakiyeTipi" TEXT NOT NULL DEFAULT 'borc',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Musteri_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tahsilat" (
    "id" TEXT NOT NULL,
    "musteriId" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "tutar" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tahsilat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personel" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "soyad" TEXT NOT NULL,
    "gorevi" TEXT NOT NULL,
    "bagliOlduguId" TEXT,
    "calismaYili" INTEGER NOT NULL DEFAULT 0,
    "telefon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faz_atamalar" (
    "id" TEXT NOT NULL,
    "schedulePhaseId" TEXT NOT NULL,
    "personelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faz_atamalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personel_login_invites" (
    "id" TEXT NOT NULL,
    "personelId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "allowedMenus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personel_login_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuKey" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "faz_atamalar_schedulePhaseId_personelId_key" ON "faz_atamalar"("schedulePhaseId", "personelId");

-- CreateIndex
CREATE UNIQUE INDEX "personel_login_invites_token_key" ON "personel_login_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MenuPermission_userId_menuKey_key" ON "MenuPermission"("userId", "menuKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_personelId_key" ON "User"("personelId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Musteri" ADD CONSTRAINT "Musteri_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tahsilat" ADD CONSTRAINT "Tahsilat_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Musteri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Is" ADD CONSTRAINT "Is_musteriId_fkey" FOREIGN KEY ("musteriId") REFERENCES "Musteri"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personel" ADD CONSTRAINT "personel_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personel" ADD CONSTRAINT "personel_bagliOlduguId_fkey" FOREIGN KEY ("bagliOlduguId") REFERENCES "personel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faz_atamalar" ADD CONSTRAINT "faz_atamalar_schedulePhaseId_fkey" FOREIGN KEY ("schedulePhaseId") REFERENCES "schedule_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faz_atamalar" ADD CONSTRAINT "faz_atamalar_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "personel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personel_login_invites" ADD CONSTRAINT "personel_login_invites_personelId_fkey" FOREIGN KEY ("personelId") REFERENCES "personel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuPermission" ADD CONSTRAINT "MenuPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
