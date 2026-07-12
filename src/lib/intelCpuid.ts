export interface CpuSignature {
  family: number;
  model: number;
  stepping: number;
}

const intelSignatures: Record<string, CpuSignature> = {
  "Alder Lake": { family: 6, model: 151, stepping: 2 },
  "Rocket Lake": { family: 6, model: 167, stepping: 1 },
  "Comet Lake": { family: 6, model: 165, stepping: 5 },
  "Coffee Lake Refresh": { family: 6, model: 158, stepping: 13 },
  "Coffee Lake": { family: 6, model: 158, stepping: 10 },
  "Skylake": { family: 6, model: 94, stepping: 3 },
};

export function getIntelSignature(codename: string): CpuSignature {
  return intelSignatures[codename] || { family: 6, model: 94, stepping: 3 };
}
