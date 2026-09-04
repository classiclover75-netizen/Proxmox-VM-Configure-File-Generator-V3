import { PcBrand, PcModel } from '../types';

export function selectHardwareIdentity(
  pcDB: Record<string, PcBrand>,
  brandSelect: string,
  typeSelect: string,
  cpuVendor: string,
  cpuArch: string = 'default',
  cpuModel: string = 'auto'
): { brand: PcBrand; model: PcModel; emulatedCpu: any } | null {
  const isCpuMatch = (cpu: any) => {
    // If user explicitly requests a CPU model, must match its name exactly
    if (cpuModel !== 'auto' && cpu.name !== cpuModel) {
      return false;
    }

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

  const hasValidCpu = (model: PcModel) => model.compatibleCpus.some(isCpuMatch);

  const filterModels = (brand: PcBrand, typeFilter: string) => {
    let models = brand.m;
    if (typeFilter !== 'random') {
      const typeFiltered = models.filter(m => m.t === typeFilter);
      if (typeFiltered.length > 0) {
        models = typeFiltered;
      }
    }
    // Only return models that have at least one valid CPU
    return models.filter(hasValidCpu);
  };

  // 1. Find valid brands
  const brandKeys = brandSelect === 'random' ? Object.keys(pcDB) : [brandSelect];
  let validBrands = brandKeys.map(key => ({
    key,
    brand: pcDB[key],
    validModels: pcDB[key] ? filterModels(pcDB[key], typeSelect) : []
  })).filter(b => b.validModels.length > 0);

  // If no combination is valid with a specific cpuModel, fall back safely to 'auto'
  if (validBrands.length === 0 && cpuModel !== 'auto') {
    return selectHardwareIdentity(pcDB, brandSelect, typeSelect, cpuVendor, cpuArch, 'auto');
  }

  // If no combination is valid even with 'auto', return null instead of falling back
  if (validBrands.length === 0) {
    return null;
  }

  // 2. Pick brand
  const selectedBrandObj = validBrands[Math.floor(Math.random() * validBrands.length)];
  const brand = selectedBrandObj.brand;

  // 3. Pick model
  const validModels = selectedBrandObj.validModels;
  const model = validModels[Math.floor(Math.random() * validModels.length)];

  // 4. Pick CPU
  const validCpus = model.compatibleCpus.filter(isCpuMatch);
  let emulatedCpu = validCpus[Math.floor(Math.random() * validCpus.length)];

  if (cpuVendor === 'intel' && cpuArch === 'Skylake-Client-v4') {
    emulatedCpu = { ...emulatedCpu, base: 'Skylake-Client-v4' };
  }
  if (cpuVendor === 'amd' && cpuArch === 'EPYC-Milan-v2') {
    emulatedCpu = { ...emulatedCpu, base: 'EPYC-Milan-v2' };
  }
  if (cpuVendor === 'amd' && cpuArch.startsWith('EPYC-Rome')) {
    emulatedCpu = { ...emulatedCpu, base: cpuArch };
  }

  return { brand, model, emulatedCpu };
}
