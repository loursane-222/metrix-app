-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Atolye" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "atolyeAdi" TEXT NOT NULL,
    "sehir" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "toplamMaas" DECIMAL NOT NULL DEFAULT 0,
    "sgkGideri" DECIMAL NOT NULL DEFAULT 0,
    "yemekGideri" DECIMAL NOT NULL DEFAULT 0,
    "yolGideri" DECIMAL NOT NULL DEFAULT 0,
    "kira" DECIMAL NOT NULL DEFAULT 0,
    "elektrik" DECIMAL NOT NULL DEFAULT 0,
    "su" DECIMAL NOT NULL DEFAULT 0,
    "dogalgaz" DECIMAL NOT NULL DEFAULT 0,
    "internet" DECIMAL NOT NULL DEFAULT 0,
    "sarfMalzeme" DECIMAL NOT NULL DEFAULT 0,
    "aylikPorselenPlaka" INTEGER NOT NULL DEFAULT 0,
    "aylikKuvarsPlaka" INTEGER NOT NULL DEFAULT 0,
    "aylikDogaltasPlaka" INTEGER NOT NULL DEFAULT 0,
    "plakaBasinaMtul" DECIMAL NOT NULL DEFAULT 3.20,
    "dakikaMaliyeti" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Atolye_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Makine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atolyeId" TEXT NOT NULL,
    "makineAdi" TEXT NOT NULL,
    "alinanBedel" DECIMAL NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "amortismanSuresiAy" INTEGER NOT NULL,
    "aylikAktifCalismaSaati" DECIMAL NOT NULL,
    "aylikAmortisman" DECIMAL NOT NULL DEFAULT 0,
    "saatlikMaliyet" DECIMAL NOT NULL DEFAULT 0,
    "dakikalikMaliyet" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Makine_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Arac" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atolyeId" TEXT NOT NULL,
    "aracAdi" TEXT NOT NULL,
    "aracTipi" TEXT NOT NULL,
    "alinanBedel" DECIMAL NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "amortismanSuresiAy" INTEGER NOT NULL,
    "aylikBakim" DECIMAL NOT NULL DEFAULT 0,
    "aylikSigortaKasko" DECIMAL NOT NULL DEFAULT 0,
    "aylikVergiMuayene" DECIMAL NOT NULL DEFAULT 0,
    "aylikAmortisman" DECIMAL NOT NULL DEFAULT 0,
    "aylikToplamSabitMaliyet" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Arac_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Is" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atolyeId" TEXT NOT NULL,
    "urunAdi" TEXT NOT NULL,
    "malzemeTipi" TEXT NOT NULL,
    "musteriTipi" TEXT NOT NULL,
    "plakaFiyatiEuro" DECIMAL NOT NULL,
    "metrajMtul" DECIMAL NOT NULL,
    "birMtulDakika" DECIMAL NOT NULL,
    "kullanilanKur" DECIMAL NOT NULL DEFAULT 0,
    "kullanilanPlakaSayisi" DECIMAL NOT NULL DEFAULT 0,
    "karYuzdesi" DECIMAL NOT NULL,
    "toplamSureDakika" DECIMAL NOT NULL DEFAULT 0,
    "iscilikMaliyeti" DECIMAL NOT NULL DEFAULT 0,
    "malzemeMaliyeti" DECIMAL NOT NULL DEFAULT 0,
    "toplamMaliyet" DECIMAL NOT NULL DEFAULT 0,
    "satisFiyati" DECIMAL NOT NULL DEFAULT 0,
    "mtulSatisFiyati" DECIMAL NOT NULL DEFAULT 0,
    "durum" TEXT NOT NULL DEFAULT 'teklif_verildi',
    "notlar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Is_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsOperasyon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isId" TEXT NOT NULL,
    "operasyonTipi" TEXT NOT NULL,
    "makineId" TEXT,
    "adet" INTEGER NOT NULL,
    "birimDakika" DECIMAL NOT NULL,
    "toplamDakika" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IsOperasyon_isId_fkey" FOREIGN KEY ("isId") REFERENCES "Is" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IsOperasyon_makineId_fkey" FOREIGN KEY ("makineId") REFERENCES "Makine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Atolye_userId_key" ON "Atolye"("userId");
