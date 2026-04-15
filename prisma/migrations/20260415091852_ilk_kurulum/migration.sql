-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atolye" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "atolyeAdi" TEXT NOT NULL DEFAULT '',
    "sehir" TEXT NOT NULL DEFAULT '',
    "ilce" TEXT NOT NULL DEFAULT '',
    "telefon" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "adres" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "toplamMaas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sgkGideri" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "yemekGideri" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "yolGideri" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kira" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "elektrik" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "su" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dogalgaz" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "internet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sarfMalzeme" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aylikPorselenPlaka" INTEGER NOT NULL DEFAULT 0,
    "aylikKuvarsPlaka" INTEGER NOT NULL DEFAULT 0,
    "aylikDogaltasPlaka" INTEGER NOT NULL DEFAULT 0,
    "plakaBasinaMtul" DECIMAL(65,30) NOT NULL DEFAULT 3.20,
    "dakikaMaliyeti" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kdvOrani" INTEGER NOT NULL DEFAULT 20,
    "teklifGecerlilik" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atolye_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Makine" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "makineAdi" TEXT NOT NULL,
    "alinanBedel" DECIMAL(65,30) NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "amortismanSuresiAy" INTEGER NOT NULL,
    "aylikAktifCalismaSaati" DECIMAL(65,30) NOT NULL,
    "aylikAmortisman" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saatlikMaliyet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "dakikalikMaliyet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Makine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arac" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "aracAdi" TEXT NOT NULL,
    "aracTipi" TEXT NOT NULL,
    "alinanBedel" DECIMAL(65,30) NOT NULL,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "amortismanSuresiAy" INTEGER NOT NULL,
    "aylikBakim" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aylikSigortaKasko" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aylikVergiMuayene" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aylikAmortisman" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "aylikToplamSabitMaliyet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Is" (
    "id" TEXT NOT NULL,
    "atolyeId" TEXT NOT NULL,
    "teklifNo" TEXT NOT NULL DEFAULT '',
    "musteriAdi" TEXT NOT NULL DEFAULT '',
    "urunAdi" TEXT NOT NULL,
    "malzemeTipi" TEXT NOT NULL,
    "musteriTipi" TEXT NOT NULL,
    "plakaFiyatiEuro" DECIMAL(65,30) NOT NULL,
    "metrajMtul" DECIMAL(65,30) NOT NULL,
    "birMtulDakika" DECIMAL(65,30) NOT NULL,
    "tezgahArasiMtul" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tezgahArasiDakika" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adaTezgahMtul" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adaTezgahDakika" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kullanilanKur" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plakaGenislikCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plakaUzunlukCm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "plakadanAlinanMtul" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kullanilanPlakaSayisi" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "karYuzdesi" DECIMAL(65,30) NOT NULL,
    "toplamSureDakika" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "iscilikMaliyeti" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "malzemeMaliyeti" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "toplamMaliyet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kdvTutari" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kdvDahilFiyat" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "satisFiyati" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "mtulSatisFiyati" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "teklifGecerlilikTarihi" TIMESTAMP(3),
    "durum" TEXT NOT NULL DEFAULT 'teklif_verildi',
    "notlar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Is_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsOperasyon" (
    "id" TEXT NOT NULL,
    "isId" TEXT NOT NULL,
    "operasyonTipi" TEXT NOT NULL,
    "makineId" TEXT,
    "adet" INTEGER NOT NULL,
    "birimDakika" DECIMAL(65,30) NOT NULL,
    "toplamDakika" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IsOperasyon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Atolye_userId_key" ON "Atolye"("userId");

-- AddForeignKey
ALTER TABLE "Atolye" ADD CONSTRAINT "Atolye_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Makine" ADD CONSTRAINT "Makine_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arac" ADD CONSTRAINT "Arac_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Is" ADD CONSTRAINT "Is_atolyeId_fkey" FOREIGN KEY ("atolyeId") REFERENCES "Atolye"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsOperasyon" ADD CONSTRAINT "IsOperasyon_isId_fkey" FOREIGN KEY ("isId") REFERENCES "Is"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsOperasyon" ADD CONSTRAINT "IsOperasyon_makineId_fkey" FOREIGN KEY ("makineId") REFERENCES "Makine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
