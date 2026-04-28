const fs = require("fs");

function backup(file) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  fs.copyFileSync(file, `${file}.bak-fix-scroll-json-${stamp}`);
}

function replaceOrFail(file, from, to) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes(from)) {
    throw new Error("Beklenen parça bulunamadı: " + from.slice(0, 120));
  }
  s = s.replace(from, to);
  fs.writeFileSync(file, s);
}

/* 1) Atölye sol panel: iç hücre gerçekten kaydırılabilir olsun */
const atolye = "src/app/dashboard/atolye/page.tsx";
backup(atolye);

replaceOrFail(
  atolye,
  `className="mt-4 flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-3 overflow-hidden metrix-atolye-scroll-panel"`,
  `className="mt-4 min-h-0 flex-1 rounded-2xl border border-slate-800 bg-[#111827] p-3 max-h-[58dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] md:max-h-none md:overflow-y-auto metrix-atolye-scroll-panel"`
);

/* 2) /dashboard/isler: boş response gelirse sayfayı patlatmasın */
const isler = "src/app/dashboard/isler/page.tsx";
backup(isler);

let s = fs.readFileSync(isler, "utf8");

s = s.replace(
  /fetch\('\/api\/isler'\)\s*\.then\(r => r\.json\(\)\)/g,
  `fetch('/api/isler').then(async r => {
        const text = await r.text()
        if (!text) return []
        try { return JSON.parse(text) } catch { return [] }
      })`
);

s = s.replace(
  /fetch\("\/api\/isler"\)\s*\.then\(r => r\.json\(\)\)/g,
  `fetch("/api/isler").then(async r => {
        const text = await r.text()
        if (!text) return []
        try { return JSON.parse(text) } catch { return [] }
      })`
);

s = s.replace(
  /fetch\(`\/api\/isler`\)\s*\.then\(r => r\.json\(\)\)/g,
  `fetch(\`/api/isler\`).then(async r => {
        const text = await r.text()
        if (!text) return []
        try { return JSON.parse(text) } catch { return [] }
      })`
);

fs.writeFileSync(isler, s);

console.log("✅ Atölye scroll ve /dashboard/isler JSON guard patch tamamlandı.");
