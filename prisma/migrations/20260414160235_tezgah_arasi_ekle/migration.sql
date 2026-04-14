-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "tezgahArasiMtul" DECIMAL NOT NULL DEFAULT 0,
    "tezgahArasiDakika" DECIMAL NOT NULL DEFAULT 0,
    "kullanilanKur" DECIMAL NOT NULL DEFAULT 0,
    "plakaGenislikCm" DECIMAL NOT NULL DEFAULT 0,
    "plakaUzunlukCm" DECIMAL NOT NULL DEFAULT 0,
    "plakadanAlinanMtul" DECIMAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_Is" ("atolyeId", "birMtulDakika", "createdAt", "durum", "id", "iscilikMaliyeti", "karYuzdesi", "kullanilanKur", "kullanilanPlakaSayisi", "malzemeMaliyeti", "malzemeTipi", "metrajMtul", "mtulSatisFiyati", "musteriAdi", "musteriTipi", "notlar", "plakaFiyatiEuro", "plakaGenislikCm", "plakaUzunlukCm", "plakadanAlinanMtul", "satisFiyati", "toplamMaliyet", "toplamSureDakika", "updatedAt", "urunAdi") SELECT "atolyeId", "birMtulDakika", "createdAt", "durum", "id", "iscilikMaliyeti", "karYuzdesi", "kullanilanKur", "kullanilanPlakaSayisi", "malzemeMaliyeti", "malzemeTipi", "metrajMtul", "mtulSatisFiyati", "musteriAdi", "musteriTipi", "notlar", "plakaFiyatiEuro", "plakaGenislikCm", "plakaUzunlukCm", "plakadanAlinanMtul", "satisFiyati", "toplamMaliyet", "toplamSureDakika", "updatedAt", "urunAdi" FROM "Is";
DROP TABLE "Is";
ALTER TABLE "new_Is" RENAME TO "Is";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
