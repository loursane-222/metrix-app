export type LaborV2OperationCategory =
  | "FABRICATION_BASE"
  | "EDGE"
  | "CUT_45"
  | "CUTOUT"
  | "GLUE"
  | "SETUP"
  | "MEASURE"
  | "FIELD_INSTALL"
  | "TRANSPORT"
  | "QUALITY_RISK"
  | "ADJUSTMENT";

export type LaborV2WarningSeverity = "info" | "warning" | "critical";
export type LaborV2WarningAudience = "user" | "debug";

export interface LaborV2Warning {
  key: string;
  severity: LaborV2WarningSeverity;
  audience: LaborV2WarningAudience;
  message: string;
  source?: string;
}

export interface BreakdownRow {
  key: string;
  label: string;
  category: LaborV2OperationCategory;
  minutes: number;
  minuteCost: number;
  cost: number;
  formula?: string;
  source?: string;
  applied: boolean;
}

export interface Adjustment {
  key: string;
  label: string;
  category: LaborV2OperationCategory;
  amount: number;
  minutes?: number;
  reason?: string;
  applied: boolean;
}

export interface CostBreakdown {
  directOperationCost: number;
  setupCost: number;
  minimumFloorAdjustment: number;
  shapeDifficultyCost: number;
  projectDifficultyCost: number;
  damarBookmatchCost: number;
  fieldInstallCost: number;
  transportCost: number;
  inefficiencyCost: number;
  riskFireBufferCost: number;
  totalLaborCost: number;
}

export interface LaborV2SetupConfig {
  baseMinutes: number;
  perMachineChangeMinutes: number;
  perComplexShapeMinutes: number;
  bookmatchMinutes: number;
}

export interface LaborV2RiskConfig {
  laborRiskRate: number;
  fireRiskRate: number;
  inefficiencyRate: number;
}

export interface LaborV2FloorConfig {
  minimumMinutes: number;
  minimumCost: number;
}

export interface LaborV2MultiplierConfig {
  shape: Record<string, number>;
  projectDifficulty: Record<string, number>;
  damarTakibi: number;
  bookmatch: number;
}

export interface LaborV2Config {
  setup: LaborV2SetupConfig;
  risk: LaborV2RiskConfig;
  floor: LaborV2FloorConfig;
  multipliers: LaborV2MultiplierConfig;
}

export interface LaborV2ConfigInput {
  setup?: Partial<LaborV2SetupConfig>;
  risk?: Partial<LaborV2RiskConfig>;
  floor?: Partial<LaborV2FloorConfig>;
  multipliers?: Partial<Omit<LaborV2MultiplierConfig, "shape" | "projectDifficulty">> & {
    shape?: Record<string, number>;
    projectDifficulty?: Record<string, number>;
  };
}

export interface LaborV2EconomicsInput {
  shopMinuteCost?: number;
  defaultMachineMinuteCost?: number;
  personnelMinuteCost?: number;
  fixedOverheadMinuteCost?: number;
  machineAmortizationMinuteCost?: number;
  vehicleMinuteCost?: number;
  consumablesMinuteCost?: number;
  maintenanceMinuteCost?: number;
  electricityMinuteCost?: number;
}

export interface LaborV2ProjectInput {
  totalMtul?: number;
  totalAreaCm2?: number;
  pieceCount?: number;
  hasDamarTakibi?: boolean;
  hasBookmatch?: boolean;
  layoutFireRate?: number;
  projectDifficulty?: string;
}

export interface LaborV2OperationInput {
  key: string;
  label: string;
  category: LaborV2OperationCategory;
  quantity?: number;
  minutesPerUnit?: number;
  totalMinutes?: number;
  minuteCost?: number;
  machineId?: string;
  shapeType?: string;
  source?: string;
}

export interface LaborV2Input {
  version?: "labor-v2";
  project?: LaborV2ProjectInput;
  economics?: LaborV2EconomicsInput;
  operations?: LaborV2OperationInput[];
  config?: LaborV2ConfigInput;
  metadata?: Record<string, unknown>;
}

export interface LaborV2Result {
  version: "labor-v2";
  totalMinutes: number;
  totalLaborCost: number;
  effectiveMinuteCost: number;
  costBreakdown: CostBreakdown;
  operationBreakdown: BreakdownRow[];
  breakdownRows: BreakdownRow[];
  adjustments: Adjustment[];
  warnings: LaborV2Warning[];
  explain: string[];
}

export interface LaborV1Comparable {
  totalMinutes?: number;
  laborCost?: number;
  totalCost?: number;
}

export interface LaborV2Comparison {
  v1LaborCost: number;
  v2LaborCost: number;
  deltaAmount: number;
  deltaPercent: number;
  severity: "neutral" | "info" | "warning" | "critical";
  v1: {
    totalMinutes: number;
    laborCost: number;
    totalCost: number;
  };
  v2: {
    totalMinutes: number;
    laborCost: number;
  };
  delta: {
    minutes: number;
    laborCost: number;
    laborCostPercent: number;
  };
  warnings: LaborV2Warning[];
}
