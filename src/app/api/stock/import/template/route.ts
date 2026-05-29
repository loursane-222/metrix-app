import { NextResponse } from "next/server";
import { getAtolyeAuth } from "@/lib/getAtolyeId";

export const runtime = "nodejs";

const TEMPLATE_COLUMNS = [
  "Ürün Adı",
  "Malzeme Tipi",
  "Marka",
  "Renk / Desen",
  "Shade / Ton Kodu",
  "Genişlik Cm",
  "Yükseklik Cm",
  "Kalınlık Mm",
  "Adet",
  "Depo",
  "Alış Maliyeti",
  "Para Birimi",
  "Tedarikçi",
  "Parti No",
  "Not",
];

const EXAMPLE_ROW = [
  "Laminam Calacatta",
  "Porselen",
  "Laminam",
  "Calacatta Oro",
  "B_0451",
  324,
  162,
  12,
  4,
  "İzmir Depo",
  14500,
  "TRY",
  "Laminam Türkiye",
  "LOT-001",
  "Aynı shade grubundaki plakalar",
];

export async function GET() {
  const auth = await getAtolyeAuth();
  if (!auth?.atolyeId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  workbook.creator = "Metrix";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Stok Import");
  sheet.addRow(TEMPLATE_COLUMNS);
  sheet.addRow(EXAMPLE_ROW);
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  header.alignment = { vertical: "middle", horizontal: "center" };

  sheet.columns.forEach((column) => {
    column.width = 18;
  });
  sheet.getColumn(1).width = 26;
  sheet.getColumn(5).width = 20;
  sheet.getColumn(10).width = 20;
  sheet.getColumn(15).width = 34;

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="metrix-stok-import-sablonu.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
