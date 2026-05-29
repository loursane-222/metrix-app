import { prisma } from "@/lib/prisma";

type RawRow = Record<string, unknown>;

export type NormalizedStockImportRow = {
  rowNumber: number;
  productName: string;
  materialType: string | null;
  brand: string | null;
  colorName: string | null;
  shadeCode: string | null;
  thicknessMm: number | null;
  widthCm: number;
  heightCm: number;
  quantity: number;
  warehouseName: string;
  purchaseCurrency: string;
  purchaseUnitCost: number;
  purchaseTotalCost: number;
  supplierName: string | null;
  batchNo: string | null;
  notes: string | null;
  status: "AVAILABLE";
  totalAreaCm2: number;
  remainingAreaCm2: number;
  errors: string[];
  warnings: string[];
};

export type StockImportPreview = {
  validRows: NormalizedStockImportRow[];
  invalidRows: NormalizedStockImportRow[];
  warnings: string[];
  totalPlateCount: number;
  estimatedTotalValue: number;
};

const FIELD_ALIASES: Record<string, keyof NormalizedStockImportRow> = {
  "urun": "productName",
  "urun adi": "productName",
  "ürün": "productName",
  "ürün adı": "productName",
  "product name": "productName",
  "genislik": "widthCm",
  "genislik cm": "widthCm",
  "genişlik": "widthCm",
  "genişlik cm": "widthCm",
  "width": "widthCm",
  "yukseklik": "heightCm",
  "yukseklik cm": "heightCm",
  "yükseklik": "heightCm",
  "yükseklik cm": "heightCm",
  "boy": "heightCm",
  "height": "heightCm",
  "adet": "quantity",
  "quantity": "quantity",
  "qty": "quantity",
  "depo": "warehouseName",
  "warehouse": "warehouseName",
  "alis maliyeti": "purchaseTotalCost",
  "alış maliyeti": "purchaseTotalCost",
  "maliyet": "purchaseTotalCost",
  "cost": "purchaseTotalCost",
  "para birimi": "purchaseCurrency",
  "currency": "purchaseCurrency",
  "malzeme tipi": "materialType",
  "marka": "brand",
  "brand": "brand",
  "renk": "colorName",
  "renk desen": "colorName",
  "renk / desen": "colorName",
  "desen": "colorName",
  "shade": "shadeCode",
  "shade code": "shadeCode",
  "shade / ton kodu": "shadeCode",
  "shade ton kodu": "shadeCode",
  "ton kodu": "shadeCode",
  "renk kodu": "shadeCode",
  "uretim tonu": "shadeCode",
  "üretim tonu": "shadeCode",
  "batch shade": "shadeCode",
  "kalinlik mm": "thicknessMm",
  "kalınlık mm": "thicknessMm",
  "tedarikci": "supplierName",
  "tedarikçi": "supplierName",
  "supplier": "supplierName",
  "parti no": "batchNo",
  "partino": "batchNo",
  "batch no": "batchNo",
  "not": "notes",
  "notes": "notes",
};

function headerKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ");
}

function text(value: unknown) {
  const s = String(value ?? "").trim();
  return s || "";
}

function optionalText(value: unknown) {
  const s = text(value);
  return s || null;
}

function numberValue(value: unknown) {
  if (value == null || value === "") return NaN;
  if (typeof value === "number") return value;
  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/[₺$€]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else if (char === ";" && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function rowsFromMatrix(matrix: unknown[][]): RawRow[] {
  const headers = (matrix[0] ?? []).map(headerKey);
  const mapped = headers.map((h) => FIELD_ALIASES[h] ?? null);
  return matrix.slice(1).flatMap((cells, index) => {
    const hasValue = cells.some((cell) => text(cell));
    if (!hasValue) return [];
    const row: RawRow = { rowNumber: index + 2 };
    cells.forEach((cell, cellIndex) => {
      const field = mapped[cellIndex];
      if (field) row[field] = cell;
    });
    return [row];
  });
}

export async function parseStockImportFile(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv")) {
    const textContent = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const matrix = textContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseCsvLine);
    return rowsFromMatrix(matrix);
  }

  const loadExcelJs = Function("return import('exceljs')") as () => Promise<any>;
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const matrix: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row: any) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    matrix.push(values);
  });
  return rowsFromMatrix(matrix);
}

export function normalizeStockImportRows(rows: RawRow[]): NormalizedStockImportRow[] {
  return rows.map((row) => {
    const widthCm = numberValue(row.widthCm);
    const heightCm = numberValue(row.heightCm);
    const quantity = Math.floor(numberValue(row.quantity));
    const purchaseTotalCost = numberValue(row.purchaseTotalCost);
    const totalAreaCm2 = Number.isFinite(widthCm) && Number.isFinite(heightCm) ? widthCm * heightCm : 0;
    const errors: string[] = [];
    const productName = text(row.productName);
    const warehouseName = text(row.warehouseName);

    if (!productName) errors.push("Ürün adı zorunlu.");
    if (!Number.isFinite(widthCm) || widthCm <= 0) errors.push("Genişlik Cm 0'dan büyük olmalı.");
    if (!Number.isFinite(heightCm) || heightCm <= 0) errors.push("Yükseklik Cm 0'dan büyük olmalı.");
    if (!Number.isFinite(quantity) || quantity < 1) errors.push("Adet en az 1 olmalı.");
    if (!warehouseName) errors.push("Depo zorunlu.");
    if (!Number.isFinite(purchaseTotalCost) || purchaseTotalCost < 0) errors.push("Alış Maliyeti geçerli sayı olmalı.");

    const safeQuantity = Number.isFinite(quantity) && quantity >= 1 ? quantity : 0;
    const safeCost = Number.isFinite(purchaseTotalCost) && purchaseTotalCost >= 0 ? purchaseTotalCost : 0;

    return {
      rowNumber: Number(row.rowNumber) || 0,
      productName,
      materialType: optionalText(row.materialType),
      brand: optionalText(row.brand),
      colorName: optionalText(row.colorName),
      shadeCode: optionalText(row.shadeCode),
      thicknessMm: Number.isFinite(numberValue(row.thicknessMm)) ? numberValue(row.thicknessMm) : null,
      widthCm: Number.isFinite(widthCm) ? widthCm : 0,
      heightCm: Number.isFinite(heightCm) ? heightCm : 0,
      quantity: safeQuantity,
      warehouseName,
      purchaseCurrency: text(row.purchaseCurrency) || "TRY",
      purchaseUnitCost: safeQuantity > 0 ? safeCost / safeQuantity : 0,
      purchaseTotalCost: safeCost,
      supplierName: optionalText(row.supplierName),
      batchNo: optionalText(row.batchNo),
      notes: optionalText(row.notes),
      status: "AVAILABLE",
      totalAreaCm2,
      remainingAreaCm2: totalAreaCm2,
      errors,
      warnings: [],
    };
  });
}

export async function buildStockImportPreview(atolyeId: string, rows: NormalizedStockImportRow[]): Promise<StockImportPreview> {
  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.errors.length > 0);
  const warnings: string[] = [];

  const warehouseNames = [...new Set(validRows.map((row) => row.warehouseName))];
  const warehouses = warehouseNames.length
    ? await prisma.stockWarehouse.findMany({
        where: { atolyeId, name: { in: warehouseNames } },
        select: { id: true, name: true },
      })
    : [];
  const warehouseByName = new Map(warehouses.map((w) => [headerKey(w.name), w]));

  for (const row of validRows) {
    const warehouse = warehouseByName.get(headerKey(row.warehouseName));
    if (!warehouse) continue;
    const existing = await prisma.stockPlate.findFirst({
      where: {
        atolyeId,
        productName: row.productName,
        widthCm: row.widthCm,
        heightCm: row.heightCm,
        warehouseId: warehouse.id,
        batchNo: row.batchNo,
        supplierName: row.supplierName,
        purchaseTotalCost: row.purchaseTotalCost,
        shadeCode: row.shadeCode,
      },
      select: { id: true },
    });
    if (existing) {
      const message = `Satır ${row.rowNumber}: Aynı ürün/ölçü/depo/parti/tedarikçi/maliyet kombinasyonu stokta zaten görünüyor.`;
      row.warnings.push(message);
      warnings.push(message);
    }
  }

  return {
    validRows,
    invalidRows,
    warnings,
    totalPlateCount: validRows.reduce((sum, row) => sum + row.quantity, 0),
    estimatedTotalValue: validRows.reduce((sum, row) => sum + row.purchaseTotalCost, 0),
  };
}

export async function commitStockImportRows(atolyeId: string, rows: NormalizedStockImportRow[]) {
  const validRows = rows.filter((row) => row.errors.length === 0);
  if (validRows.length === 0) {
    return { createdPlateCount: 0, createdWarehouseCount: 0, totalValue: 0, warehouses: [] as string[] };
  }

  return prisma.$transaction(async (tx) => {
    const existingWarehouseCount = await tx.stockWarehouse.count({ where: { atolyeId } });
    const warehouseMap = new Map<string, { id: string; name: string }>();
    const createdWarehouses: string[] = [];

    for (const row of validRows) {
      const key = headerKey(row.warehouseName);
      if (warehouseMap.has(key)) continue;

      const existing = await tx.stockWarehouse.findFirst({
        where: { atolyeId, name: { equals: row.warehouseName, mode: "insensitive" } },
        select: { id: true, name: true },
      });
      if (existing) {
        warehouseMap.set(key, existing);
        continue;
      }

      const created = await tx.stockWarehouse.create({
        data: {
          atolyeId,
          name: row.warehouseName,
          code: row.warehouseName.toLocaleUpperCase("tr-TR").replace(/\s+/g, "-").slice(0, 24),
          isDefault: existingWarehouseCount === 0 && createdWarehouses.length === 0,
          isActive: true,
        },
        select: { id: true, name: true },
      });
      warehouseMap.set(key, created);
      createdWarehouses.push(created.name);
    }

    const prefix = `PLK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    const existingCodes = await tx.stockPlate.findMany({
      where: { atolyeId, plateCode: { startsWith: prefix } },
      select: { plateCode: true },
    });
    let sequence = existingCodes.reduce((max, row) => {
      const last = Number(row.plateCode.split("-").pop());
      return Number.isFinite(last) ? Math.max(max, last) : max;
    }, 0);

    let createdPlateCount = 0;
    let totalValue = 0;

    for (const row of validRows) {
      const warehouse = warehouseMap.get(headerKey(row.warehouseName));
      const unitCost = row.quantity > 0 ? row.purchaseTotalCost / row.quantity : 0;

      for (let i = 0; i < row.quantity; i++) {
        sequence += 1;
        const plateCode = `${prefix}-${String(sequence).padStart(4, "0")}`;
        const plate = await tx.stockPlate.create({
          data: {
            atolyeId,
            plateCode,
            productName: row.productName,
            materialType: row.materialType,
            brand: row.brand,
            colorName: row.colorName,
            shadeCode: row.shadeCode,
            batchNo: row.batchNo,
            supplierName: row.supplierName,
            warehouseId: warehouse?.id,
            widthCm: row.widthCm,
            heightCm: row.heightCm,
            thicknessMm: row.thicknessMm,
            totalAreaCm2: row.totalAreaCm2,
            remainingAreaCm2: row.remainingAreaCm2,
            purchaseCurrency: row.purchaseCurrency,
            purchaseUnitCost: unitCost,
            purchaseTotalCost: unitCost,
            status: row.status,
            sourceType: "EXCEL_IMPORT",
            notes: row.notes,
          },
          select: { id: true },
        });

        await tx.stockMovement.create({
          data: {
            atolyeId,
            stockPlateId: plate.id,
            movementType: "IN",
            quantityAreaCm2: row.totalAreaCm2,
            toWarehouseId: warehouse?.id,
            reasonCode: "EXCEL_IMPORT",
            note: "Excel stok başlangıç yüklemesi",
          },
        });

        createdPlateCount += 1;
        totalValue += unitCost;
      }
    }

    return {
      createdPlateCount,
      createdWarehouseCount: createdWarehouses.length,
      totalValue,
      warehouses: createdWarehouses,
    };
  });
}
