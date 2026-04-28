const fs = require("fs");

const backup = "src/app/dashboard/musteriler/page.tsx.bak-premium-ekstre-20260427-225939";
const target = "src/app/dashboard/musteriler/page.tsx";

let s = fs.readFileSync(backup, "utf8");

s = s.replace(
  `function musteriAdi(m: any) {
  return m.firmaAdi || [m.ad, m.soyad].filter(Boolean).join(' ') || 'İsimsiz müşteri'
}`,
  `function musteriAdi(m: any) {
  if (!m) return 'İsimsiz müşteri'
  return m?.firmaAdi || [m?.ad, m?.soyad].filter(Boolean).join(' ') || 'İsimsiz müşteri'
}`
);

s = s.replace(
  `const liste = d.musteriler || []`,
  `const liste = Array.isArray(d.musteriler) ? d.musteriler.filter(Boolean) : []`
);

fs.writeFileSync(target, s);
console.log("OK");
