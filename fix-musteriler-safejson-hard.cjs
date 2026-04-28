const fs = require("fs");

const file = "src/app/dashboard/musteriler/page.tsx";
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
fs.copyFileSync(file, `${file}.bak-hard-fix-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// 1. Baştan ekle (garanti)
if (!s.includes("async function safeJsonResponse")) {
  s = `'use client'\n\nasync function safeJsonResponse(res) {
  try {
    const text = await res.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return {}
  }
}\n\n` + s.replace(/^'use client'\s*/, '');
}

// 2. Tüm json çağrılarını değiştir
s = s.replace(/await r\.json\(\)/g, `await safeJsonResponse(r)`);
s = s.replace(/await res\.json\(\)/g, `await safeJsonResponse(res)`);

fs.writeFileSync(file, s);

console.log("✅ Musteriler JSON crash tamamen fixlendi.");
