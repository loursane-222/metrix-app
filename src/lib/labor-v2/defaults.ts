import type { LaborV2Config } from "./types";

export const LABOR_V2_VERSION = "labor-v2" as const;

export const DEFAULT_LABOR_V2_CONFIG: LaborV2Config = {
  setup: {
    baseMinutes: 10,
    perMachineChangeMinutes: 0,
    perComplexShapeMinutes: 5,
    bookmatchMinutes: 8,
  },
  risk: {
    laborRiskRate: 0,
    fireRiskRate: 0,
    inefficiencyRate: 0,
  },
  floor: {
    minimumMinutes: 0,
    minimumCost: 0,
  },
  multipliers: {
    shape: {
      dikdortgen: 1,
      oval: 1.15,
      kapsul: 1.12,
      l_parca: 1.2,
      ozel_sablon: 1.35,
    },
    projectDifficulty: {
      LOW: 1,
      NORMAL: 1,
      HIGH: 1.15,
      PREMIUM: 1.3,
    },
    damarTakibi: 1.05,
    bookmatch: 1.12,
  },
};
