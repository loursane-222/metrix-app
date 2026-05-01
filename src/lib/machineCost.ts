export function toSafeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getMachineMinuteCost(machine: any): number {
  if (!machine) return 0;

  const candidates = [
    machine.dakikaMaliyeti,
    machine.dkMaliyeti,
    machine.dakikaMaliyet,
    machine.dkMaliyet,
    machine.birimDakikaMaliyeti,
    machine.dakikaBirimMaliyet,
    machine.maliyetDakika,
    machine.minuteCost,
    machine.costPerMinute,
    machine.dkBirimMaliyet,
    machine.makineDakikaMaliyeti,
    machine.hesaplananDakikaMaliyeti,
    machine.calculatedMinuteCost,
  ];

  for (const candidate of candidates) {
    const n = toSafeNumber(candidate);
    if (n > 0) return Math.round(n * 100) / 100;
  }

  return 0;
}

export function formatMachineMinuteCost(machine: any): string {
  const cost = getMachineMinuteCost(machine);
  if (!cost) return "Maliyet tanımsız";
  return `${cost.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}₺/dk`;
}
