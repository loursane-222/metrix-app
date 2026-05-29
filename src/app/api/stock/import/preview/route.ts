import { NextResponse } from "next/server";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { buildStockImportPreview, normalizeStockImportRows, parseStockImportFile } from "@/lib/stock/import";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
      return NextResponse.json({ error: "Sadece .xlsx veya .csv dosyası yüklenebilir." }, { status: 400 });
    }

    const rawRows = await parseStockImportFile(file);
    const normalizedRows = normalizeStockImportRows(rawRows);
    const preview = await buildStockImportPreview(auth.atolyeId, normalizedRows);

    return NextResponse.json(preview);
  } catch (error) {
    console.error("[stock/import/preview]", error);
    return NextResponse.json({ error: "Stok import önizlemesi oluşturulamadı." }, { status: 500 });
  }
}
