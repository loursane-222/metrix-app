const fs = require("fs");

const file = "src/app/dashboard/isler/page.tsx"; // teklif gönder butonunun olduğu sayfa
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);

if (!fs.existsSync(file)) {
  console.log("Dosya bulunamadı, doğru sayfayı belirtmemiz gerekebilir.");
  process.exit();
}

fs.copyFileSync(file, `${file}.bak-whatsapp-${stamp}`);

let s = fs.readFileSync(file, "utf8");

// helper ekle
if (!s.includes("function whatsappTeklifGonder")) {
  const helper = `
function whatsappTeklifGonder(is) {
  if (!is?.musteriTelefonu) {
    alert("Müşteri telefon numarası yok.");
    return;
  }

  // telefon temizleme
  let phone = is.musteriTelefonu.replace(/\\D/g, "");
  if (phone.startsWith("0")) phone = "90" + phone.slice(1);
  if (!phone.startsWith("90")) phone = "90" + phone;

  const teklifLink = \`\${window.location.origin}/teklif/\${is.teklifNo}\`;

  const mesaj = \`Merhaba \${is.musteriAdi || ""},

Sizin için hazırladığımız teklifi aşağıdaki linkten inceleyebilirsiniz:

\${teklifLink}

Herhangi bir sorunuz olursa memnuniyetle yardımcı olurum.\`;

  const url = \`https://wa.me/\${phone}?text=\${encodeURIComponent(mesaj)}\`;

  window.open(url, "_blank");
}
`;

  s = s.replace(
    /export default function/g,
    `${helper}\nexport default function`
  );
}

// butona bağla (yaygın pattern)
s = s.replace(
  /onClick=\{\(\)\s*=>\s*[^}]*teklif[^}]*\}/gi,
  `onClick={() => whatsappTeklifGonder(is)}`
);

// eğer özel buton varsa ekle
if (!s.includes("whatsappTeklifGonder(is)")) {
  s = s.replace(
    /(<button[^>]*>[^<]*Teklif[^<]*<\/button>)/i,
    `<button onClick={() => whatsappTeklifGonder(is)} className="bg-green-600 text-white px-3 py-2 rounded-xl">
WhatsApp'tan Gönder
</button>`
  );
}

fs.writeFileSync(file, s);

console.log("✅ WhatsApp teklif gönder özelliği eklendi.");
