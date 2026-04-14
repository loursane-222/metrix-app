-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Atolye" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "atolyeAdi" TEXT NOT NULL DEFAULT '',
    "sehir" TEXT NOT NULL DEFAULT '',
    "ilce" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Atolye" ("atolyeAdi", "aylikDogaltasPlaka", "aylikKuvarsPlaka", "aylikPorselenPlaka", "createdAt", "dakikaMaliyeti", "dogalgaz", "elektrik", "id", "ilce", "internet", "kira", "plakaBasinaMtul", "sarfMalzeme", "sehir", "sgkGideri", "su", "toplamMaas", "updatedAt", "userId", "yemekGideri", "yolGideri") SELECT "atolyeAdi", "aylikDogaltasPlaka", "aylikKuvarsPlaka", "aylikPorselenPlaka", "createdAt", "dakikaMaliyeti", "dogalgaz", "elektrik", "id", "ilce", "internet", "kira", "plakaBasinaMtul", "sarfMalzeme", "sehir", "sgkGideri", "su", "toplamMaas", "updatedAt", "userId", "yemekGideri", "yolGideri" FROM "Atolye";
DROP TABLE "Atolye";
ALTER TABLE "new_Atolye" RENAME TO "Atolye";
CREATE UNIQUE INDEX "Atolye_userId_key" ON "Atolye"("userId");
CREATE TABLE "new_Is" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atolyeId" TEXT NOT NULL,
    "musteriAdi" TEXT NOT NULL DEFAULT '',
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
INSERT INTO "new_Is" ("atolyeId", "birMtulDakika", "createdAt", "durum", "id", "iscilikMaliyeti", "karYuzdesi", "kullanilanKur", "kullanilanPlakaSayisi", "malzemeMaliyeti", "malzemeTipi", "metrajMtul", "mtulSatisFiyati", "musteriTipi", "notlar", "plakaFiyatiEuro", "satisFiyati", "toplamMaliyet", "toplamSureDakika", "updatedAt", "urunAdi") SELECT "atolyeId", "birMtulDakika", "createdAt", "durum", "id", "iscilikMaliyeti", "karYuzdesi", "kullanilanKur", "kullanilanPlakaSayisi", "malzemeMaliyeti", "malzemeTipi", "metrajMtul", "mtulSatisFiyati", "musteriTipi", "notlar", "plakaFiyatiEuro", "satisFiyati", "toplamMaliyet", "toplamSureDakika", "updatedAt", "urunAdi" FROM "Is";
DROP TABLE "Is";
ALTER TABLE "new_Is" RENAME TO "Is";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
