export interface DiskModel {
  m: string;
  t: string;
}

export interface DiskVendor {
  vendor: string;
  models: DiskModel[];
  serialGen: () => string;
}

export interface PcModel {
  p: string;
  f: string;
  s: string;
  bp: string;
  t: string;
  compatibleCpus: { base: string; name: string; codename: string; threads?: number }[];
}

export interface PcBrand {
  n: string;
  bv: string;
  macs: string[];
  m: PcModel[];
  v: (m: PcModel) => string;
  sGen: () => string;
}

export interface AppInputs {
  vmId: string;
  diskBus: string;
  diskBrand: string;
  netModel: string;
  typeSelect: string;
  brandSelect: string;
  cpuVendor: string;
  cpuArch: string;
  cpuModel: string;
  cd1: string;
  cd2: string;
  cd3: string;
  bootOrder: string;
}

export interface HardwareIdentity {
  manuf: string;
  biosVendor: string;
  prod: string;
  fam: string;
  sku: string;
  ver: string;
  biosDate: string;
  uuid: string;
  serial: string;
  mac: string;
  dVendor: string;
  dModel: string;
  dType: string;
  dSerial: string;
  hvVendor: string;
  vmGenId: string;
  emulatedCpu: { base: string; name: string; codename: string; threads?: number };
  emulatedPc: PcModel;
}
