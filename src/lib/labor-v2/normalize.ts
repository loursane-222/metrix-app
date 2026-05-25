import { DEFAULT_LABOR_V2_CONFIG, LABOR_V2_VERSION } from "./defaults";
import type { LaborV2Config, LaborV2ConfigInput, LaborV2Input } from "./types";

function mergeConfig(config?: LaborV2ConfigInput): LaborV2Config {
  return {
    setup: { ...DEFAULT_LABOR_V2_CONFIG.setup, ...(config?.setup || {}) },
    risk: { ...DEFAULT_LABOR_V2_CONFIG.risk, ...(config?.risk || {}) },
    floor: { ...DEFAULT_LABOR_V2_CONFIG.floor, ...(config?.floor || {}) },
    multipliers: {
      ...DEFAULT_LABOR_V2_CONFIG.multipliers,
      ...(config?.multipliers || {}),
      shape: {
        ...DEFAULT_LABOR_V2_CONFIG.multipliers.shape,
        ...(config?.multipliers?.shape || {}),
      },
      projectDifficulty: {
        ...DEFAULT_LABOR_V2_CONFIG.multipliers.projectDifficulty,
        ...(config?.multipliers?.projectDifficulty || {}),
      },
    },
  };
}

export function normalizeLaborV2Input(input: LaborV2Input = {}): LaborV2Input & { config: LaborV2Config } {
  return {
    version: LABOR_V2_VERSION,
    project: { ...(input.project || {}) },
    economics: { ...(input.economics || {}) },
    operations: [...(input.operations || [])],
    config: mergeConfig(input.config),
    metadata: { ...(input.metadata || {}) },
  };
}
