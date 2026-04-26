export function teklifSkoru(is:any) {
  let skor = 30; // daha düşük taban

  const fiyat = Number(is.satisFiyati || 0);

  // 1) Fiyat
  if (fiyat < 80000) skor += 15;
  else if (fiyat < 150000) skor += 8;
  else if (fiyat > 300000) skor -= 12;

  // 2) Teklif yaşı
  const gun = (Date.now() - new Date(is.createdAt).getTime()) / (1000*60*60*24);
  if (gun <= 2) skor += 25;
  else if (gun <= 5) skor += 10;
  else if (gun > 10) skor -= 20;

  // 3) Taş
  if (is.tasDurumu === "alindi") skor += 15;

  // 4) Tahsilat
  if (Number(is.tahsilat || 0) > 0) skor += 10;

  // 5) Kar
  const kar = Number(is.karYuzdesi || 0);
  if (kar > 120) skor -= 10;

  return Math.max(15, Math.min(90, Math.round(skor)));
}
