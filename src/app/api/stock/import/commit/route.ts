import { NextResponse } from "next/server";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { buildStockImportPreview, commitStockImportRows, normalizeStockImportRows } from "@/lib/stock/import";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const inputRows = Array.isArray(body?.rows) ? body.rows : Array.isArray(body?.importRows) ? body.importRows : [];
    if (inputRows.length === 0) {
      return NextResponse.json({ error: "İçe aktarılacak geçerli satır bulunamadı." }, { status: 400 });
    }

    const normalizedRows = normalizeStockImportRows(inputRows);
    const preview = await buildStockImportPreview(auth.atolyeId, normalizedRows);
    if (preview.validRows.length === 0) {
      return NextResponse.json({ error: "Geçerli satır yok.", invalidRows: preview.invalidRows }, { status: 400 });
    }

    const result = await commitStockImportRows(auth.atolyeId, preview.validRows);
    return NextResponse.json({
      ok: true,
      ...result,
      warnings: preview.warnings,
    });
  } catch (error) {
    console.error("[stock/import/commit]", error);
    return NextResponse.json({ error: "Stok import işlemi tamamlanamadı." }, { status: 500 });
  }
}
