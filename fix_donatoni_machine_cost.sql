UPDATE "Makine"
SET
  "amortismanSuresiAy" = 60,
  "aylikAmortisman" = "alinanBedel" / 60,
  "saatlikMaliyet" = ("alinanBedel" / 60) / "aylikAktifCalismaSaati",
  "dakikalikMaliyet" = (("alinanBedel" / 60) / "aylikAktifCalismaSaati") / 60,
  "updatedAt" = NOW()
WHERE LOWER("makineAdi") LIKE LOWER('%donatoni%')
  AND "dakikalikMaliyet" < 1;
