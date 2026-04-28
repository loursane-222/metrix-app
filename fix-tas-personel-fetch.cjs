const fs = require("fs");

const file = "src/components/schedule/PremiumWorkCalendar.tsx";
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
fs.copyFileSync(file, `${file}.bak-tas-personel-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// useEffect import ekle
if (!s.includes("useEffect")) {
  s = s.replace(
    `import { useMemo, useState } from "react";`,
    `import { useMemo, useState, useEffect } from "react";`
  );
}

// personel fetch hook ekle
if (!s.includes("fetch('/api/personel'")) {
  const hook = `
  useEffect(() => {
    async function loadPersonel() {
      try {
        const res = await fetch('/api/personel', { cache: 'no-store' })
        const data = await res.json()
        setPersoneller(Array.isArray(data) ? data : data.personeller || [])
      } catch (e) {
        console.error("Personel yüklenemedi", e)
      }
    }

    loadPersonel()
  }, []);
  `;

  s = s.replace(
    `const [tasModal, setTasModal] = useState<any | null>(null);`,
    `const [tasModal, setTasModal] = useState<any | null>(null);\n${hook}`
  );
}

fs.writeFileSync(file, s);

console.log("✅ Taş görevine personel listesi bağlandı.");
