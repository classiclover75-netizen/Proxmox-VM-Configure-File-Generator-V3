import { PcBrand } from '../types';

export function getCpuModelList(
  pcDB: Record<string, PcBrand>,
  cpuVendor: string,
  cpuArch: string
): string[] {
  if (cpuVendor === 'random') return [];

  const isCpuMatch = (cpu: any) => {
    if (cpuVendor === 'intel') {
      return cpu.base === 'Skylake-Client-noTSX-IBRS';
    }
    if (cpuVendor === 'amd') {
      if (cpuArch === 'EPYC' || cpuArch.startsWith('EPYC-Rome')) return cpu.base === 'EPYC';
      if (cpuArch === 'EPYC-Milan' || cpuArch === 'EPYC-Milan-v2') return cpu.base === 'EPYC-Milan';
      return cpu.base === 'EPYC' || cpu.base === 'EPYC-Milan';
    }
    return true;
  };

  const nameSet = new Set<string>();

  for (const brandKey in pcDB) {
    const brand = pcDB[brandKey];
    for (const model of brand.m) {
      if (!model.compatibleCpus) continue;
      for (const cpu of model.compatibleCpus) {
        if (isCpuMatch(cpu) && cpu.name) {
          nameSet.add(cpu.name);
        }
      }
    }
  }

  const result = Array.from(nameSet);
  result.sort();
  return result;
}
