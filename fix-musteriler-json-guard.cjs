const fs = require("fs");

const file = "src/app/dashboard/musteriler/page.tsx";
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
fs.copyFileSync(file, `${file}.bak-json-guard-${stamp}`);

let s = fs.readFileSync(file, "utf8");

const helper = `
async function safeJsonResponse(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}
`;

if (!s.includes("function safeJsonResponse")) {
  s = s.replace(/('use client'\\s*)/, `$1\n${helper}\n`);
}

s = s.replace(
  /const d = await r\.json\(\)/g,
  `const d = await safeJsonResponse(r)`
);

s = s.replace(
  /const json = await r\.json\(\)/g,
  `const json = await safeJsonResponse(r)`
);

s = s.replace(
  /const data = await r\.json\(\)/g,
  `const data = await safeJsonResponse(r)`
);

s = s.replace(
  /const d = await res\.json\(\)/g,
  `const d = await safeJsonResponse(res)`
);

s = s.replace(
  /const json = await res\.json\(\)/g,
  `const json = await safeJsonResponse(res)`
);

s = s.replace(
  /const data = await res\.json\(\)/g,
  `const data = await safeJsonResponse(res)`
);

fs.writeFileSync(file, s);

console.log("✅ Musteriler JSON guard eklendi.");
