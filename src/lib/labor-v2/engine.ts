import { LABOR_V2_VERSION } from "./defaults";
import { normalizeLaborV2Input } from "./normalize";
import { roundMoney, roundMinutes } from "./rounding";
import type {
  Adjustment,
  BreakdownRow,
  CostBreakdown,
  LaborV2Input,
  LaborV2OperationCategory,
  LaborV2OperationInput,
  LaborV2Result,
  LaborV2Warning,
} from "./types";

function emptyCostBreakdown(): CostBreakdown {
  return {
    directOperationCost: 0,
    setupCost: 0,
    minimumFloorAdjustment: 0,
    shapeDifficultyCost: 0,
    projectDifficultyCost: 0,
    damarBookmatchCost: 0,
    fieldInstallCost: 0,
    transportCost: 0,
    inefficiencyCost: 0,
    riskFireBufferCost: 0,
    totalLaborCost: 0,
  };
}

function safeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function operationMinutes(operation: LaborV2OperationInput): number {
  const explicit = safeNumber(operation.totalMinutes);
  if (explicit > 0) return explicit;
  return safeNumber(operation.quantity) * safeNumber(operation.minutesPerUnit);
}

function uniqueMachineCount(operations: LaborV2OperationInput[]): number {
  return new Set(operations.map((op) => op.machineId).filter(Boolean)).size;
}

function pushWarningOnce(warnings: LaborV2Warning[], warning: LaborV2Warning) {
  if (warnings.some((item) => item.key === warning.key)) return;
  warnings.push(warning);
}

function adjustmentRow(adjustment: Adjustment, minuteCost: number): BreakdownRow {
  return {
    key: adjustment.key,
    label: adjustment.label,
    category: adjustment.category,
    minutes: roundMinutes(adjustment.minutes || 0),
    minuteCost: roundMoney(minuteCost),
    cost: roundMoney(adjustment.amount),
    formula: adjustment.reason,
    source: "labor-v2",
    applied: adjustment.applied,
  };
}

function costBreakdownFromRows(rows: BreakdownRow[]): CostBreakdown {
  const sum = (categories: LaborV2OperationCategory[]) =>
    roundMoney(rows.filter((row) => row.applied && categories.includes(row.category)).reduce((acc, row) => acc + row.cost, 0));

  const minimumFloorAdjustment = roundMoney(rows.find((row) => row.key === "minimum_floor")?.cost || 0);
  const shapeDifficultyCost = roundMoney(rows.find((row) => row.key === "shape_difficulty")?.cost || 0);
  const projectDifficultyCost = roundMoney(rows.find((row) => row.key === "project_difficulty")?.cost || 0);
  const damarBookmatchCost = roundMoney(rows.find((row) => row.key === "damar_bookmatch")?.cost || 0);
  const inefficiencyCost = roundMoney(rows.find((row) => row.key === "inefficiency_buffer")?.cost || 0);
  const riskFireBufferCost = roundMoney(rows.find((row) => row.key === "risk_fire_buffer")?.cost || 0);
  const totalLaborCost = roundMoney(rows.filter((row) => row.applied).reduce((acc, row) => acc + row.cost, 0));

  return {
    directOperationCost: sum(["FABRICATION_BASE", "EDGE", "CUT_45", "CUTOUT", "GLUE", "MEASURE"]),
    setupCost: sum(["SETUP"]),
    minimumFloorAdjustment,
    shapeDifficultyCost,
    projectDifficultyCost,
    damarBookmatchCost,
    fieldInstallCost: sum(["FIELD_INSTALL"]),
    transportCost: sum(["TRANSPORT"]),
    inefficiencyCost,
    riskFireBufferCost,
    totalLaborCost,
  };
}

export function calculateLaborV2(input: LaborV2Input = {}): LaborV2Result {
  const normalized = normalizeLaborV2Input(input);
  const warnings: LaborV2Warning[] = [];
  const operations = normalized.operations || [];
  const economics = normalized.economics || {};
  const config = normalized.config;
  const shopMinuteCost = safeNumber(economics.shopMinuteCost);
  const defaultMachineMinuteCost = safeNumber(economics.defaultMachineMinuteCost);
  const fallbackMinuteCost = defaultMachineMinuteCost || shopMinuteCost;

  if (!input.config) {
    warnings.push({
      key: "default_config_used",
      severity: "info",
      audience: "debug",
      message: "Labor V2 default config kullanıldı.",
      source: "config",
    });
  }

  if (operations.length > 0 && shopMinuteCost <= 0) {
    warnings.push({
      key: "missing_shop_minute_cost",
      severity: "warning",
      audience: "user",
      message: "Atölye dakika maliyeti eksik veya sıfır.",
      source: "economics.shopMinuteCost",
    });
  }

  const rows: BreakdownRow[] = [];
  const adjustments: Adjustment[] = [];

  for (const operation of operations) {
    const minutes = roundMinutes(operationMinutes(operation));
    if (minutes <= 0) continue;

    const minuteCost = safeNumber(operation.minuteCost) || fallbackMinuteCost;
    if (minuteCost <= 0) {
      pushWarningOnce(warnings, {
        key: "missing_machine_cost",
        severity: "warning",
        audience: "user",
        message: "Operasyon için makine/dakika maliyeti eksik veya sıfır.",
        source: "operation.minuteCost",
      });
    }

    const cost = roundMoney(minutes * minuteCost);
    rows.push({
      key: operation.key,
      label: operation.label,
      category: operation.category,
      minutes,
      minuteCost: roundMoney(minuteCost),
      cost,
      formula: `${operation.label}: ${minutes} dk`,
      source: operation.source || "operation",
      applied: true,
    });
  }

  const directRows = rows.filter((row) => !["SETUP", "QUALITY_RISK", "ADJUSTMENT"].includes(row.category));
  const directMinutes = directRows.reduce((acc, row) => acc + row.minutes, 0);
  const directCost = directRows.reduce((acc, row) => acc + row.cost, 0);
  const effectiveBaseMinuteCost = fallbackMinuteCost || (directMinutes > 0 ? directCost / directMinutes : 0);

  const machineChanges = Math.max(0, uniqueMachineCount(operations) - 1);
  const complexShapeOperations = operations.filter((operation) => {
    const multiplier = config.multipliers.shape[operation.shapeType || "dikdortgen"] || 1;
    return multiplier > 1;
  }).length;
  const setupMinutes = operations.length > 0
    ? roundMinutes(
        config.setup.baseMinutes +
          machineChanges * config.setup.perMachineChangeMinutes +
          complexShapeOperations * config.setup.perComplexShapeMinutes +
          (normalized.project?.hasBookmatch ? config.setup.bookmatchMinutes : 0)
      )
    : 0;
  if (setupMinutes > 0) {
    const setupCost = roundMoney(setupMinutes * effectiveBaseMinuteCost);
    rows.push({
      key: "setup",
      label: "Setup",
      category: "SETUP",
      minutes: setupMinutes,
      minuteCost: roundMoney(effectiveBaseMinuteCost),
      cost: setupCost,
      formula: `Setup: ${setupMinutes} dk`,
      source: "config.setup",
      applied: true,
    });
  }

  const shapeExtraMinutes = operations.reduce((acc, operation) => {
    const minutes = operationMinutes(operation);
    const multiplier = config.multipliers.shape[operation.shapeType || "dikdortgen"] || 1;
    return multiplier > 1 ? acc + minutes * (multiplier - 1) : acc;
  }, 0);
  if (shapeExtraMinutes > 0) {
    const amount = roundMoney(shapeExtraMinutes * effectiveBaseMinuteCost);
    const adjustment: Adjustment = {
      key: "shape_difficulty",
      label: "Shape zorluğu",
      category: "ADJUSTMENT",
      amount,
      minutes: roundMinutes(shapeExtraMinutes),
      reason: `Shape zorluğu: +${roundMinutes(shapeExtraMinutes)} dk`,
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, effectiveBaseMinuteCost));
  }

  const projectDifficulty = normalized.project?.projectDifficulty || "NORMAL";
  const projectMultiplier = config.multipliers.projectDifficulty[projectDifficulty] || 1;
  if (projectMultiplier > 1 && directMinutes > 0) {
    const extraMinutes = roundMinutes(directMinutes * (projectMultiplier - 1));
    const amount = roundMoney(extraMinutes * effectiveBaseMinuteCost);
    const adjustment: Adjustment = {
      key: "project_difficulty",
      label: "Proje zorluğu",
      category: "ADJUSTMENT",
      amount,
      minutes: extraMinutes,
      reason: `Proje zorluğu ${projectDifficulty}: +${extraMinutes} dk`,
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, effectiveBaseMinuteCost));
  }

  const damarMultiplier = normalized.project?.hasDamarTakibi ? config.multipliers.damarTakibi : 1;
  const bookmatchMultiplier = normalized.project?.hasBookmatch ? config.multipliers.bookmatch : 1;
  const damarBookmatchMultiplier = damarMultiplier * bookmatchMultiplier;
  if (damarBookmatchMultiplier > 1 && directMinutes > 0) {
    const extraMinutes = roundMinutes(directMinutes * (damarBookmatchMultiplier - 1));
    const amount = roundMoney(extraMinutes * effectiveBaseMinuteCost);
    const adjustment: Adjustment = {
      key: "damar_bookmatch",
      label: "Damar/bookmatch",
      category: "ADJUSTMENT",
      amount,
      minutes: extraMinutes,
      reason: `Damar/bookmatch çarpanı: +${extraMinutes} dk`,
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, effectiveBaseMinuteCost));
  }

  const minutesBeforeFloor = rows.filter((row) => row.applied).reduce((acc, row) => acc + row.minutes, 0);
  const costBeforeFloor = rows.filter((row) => row.applied).reduce((acc, row) => acc + row.cost, 0);
  const minimumMinutesCost = Math.max(0, config.floor.minimumMinutes - minutesBeforeFloor) * effectiveBaseMinuteCost;
  const minimumCostAdjustment = Math.max(0, config.floor.minimumCost - costBeforeFloor);
  const floorAmount = roundMoney(Math.max(minimumMinutesCost, minimumCostAdjustment));
  const floorMinutes = effectiveBaseMinuteCost > 0 ? roundMinutes(floorAmount / effectiveBaseMinuteCost) : 0;
  if (floorAmount > 0) {
    const adjustment: Adjustment = {
      key: "minimum_floor",
      label: "Minimum işçilik tabanı",
      category: "ADJUSTMENT",
      amount: floorAmount,
      minutes: floorMinutes,
      reason: "Minimum işçilik tabanı uygulandı",
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, effectiveBaseMinuteCost));
    warnings.push({
      key: "minimum_floor_applied",
      severity: "info",
      audience: "user",
      message: "Minimum işçilik tabanı uygulandı.",
      source: "config.floor",
    });
  }

  const subtotalBeforeRisk = rows.filter((row) => row.applied).reduce((acc, row) => acc + row.cost, 0);
  const inefficiencyAmount = roundMoney(subtotalBeforeRisk * config.risk.inefficiencyRate);
  if (inefficiencyAmount > 0) {
    const adjustment: Adjustment = {
      key: "inefficiency_buffer",
      label: "Operasyon verimsizlik payı",
      category: "QUALITY_RISK",
      amount: inefficiencyAmount,
      reason: `Operasyon verimsizlik payı: +${inefficiencyAmount} TL`,
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, 0));
  }

  const riskBase = rows.filter((row) => row.applied).reduce((acc, row) => acc + row.cost, 0);
  const riskRate = config.risk.laborRiskRate + config.risk.fireRiskRate;
  const riskAmount = roundMoney(riskBase * riskRate);
  if (riskAmount > 0) {
    const adjustment: Adjustment = {
      key: "risk_fire_buffer",
      label: "Risk/fire buffer",
      category: "QUALITY_RISK",
      amount: riskAmount,
      reason: `Risk buffer: +${riskAmount} TL`,
      applied: true,
    };
    adjustments.push(adjustment);
    rows.push(adjustmentRow(adjustment, 0));
    warnings.push({
      key: "risk_buffer_applied",
      severity: "info",
      audience: "debug",
      message: "Risk/fire buffer uygulandı.",
      source: "config.risk",
    });
  }

  const costBreakdown = costBreakdownFromRows(rows);
  const totalMinutes = roundMinutes(rows.filter((row) => row.applied).reduce((acc, row) => acc + row.minutes, 0));
  const totalLaborCost = roundMoney(costBreakdown.totalLaborCost);
  const effectiveMinuteCost = totalMinutes > 0 ? roundMoney(totalLaborCost / totalMinutes) : 0;
  const explain = rows
    .filter((row) => row.applied)
    .map((row) => row.formula || `${row.label}: ${row.minutes} dk`);

  return {
    version: LABOR_V2_VERSION,
    totalMinutes,
    totalLaborCost,
    effectiveMinuteCost,
    costBreakdown,
    operationBreakdown: rows,
    breakdownRows: rows,
    adjustments,
    warnings,
    explain,
  };
}
