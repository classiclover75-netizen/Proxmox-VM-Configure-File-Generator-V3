/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppInputs, HardwareIdentity } from './types';
import { diskDB, pcDB } from './lib/data';
import { getAlNum, getDate, getHex } from './lib/utils';
import { sanitizeCpuFlags } from './lib/cpuSafety';
import { getIntelSignature } from './lib/intelCpuid';
import { selectHardwareIdentity } from './lib/cpuVendorFilter';
import { getCpuModelList } from './lib/cpuModelList';
import { CodePanel } from './components/CodePanel';
import { Copy, RefreshCw, Download, Check, Shield, Server, HardDrive, Cpu, AlertCircle, Terminal, HelpCircle, History, Trash2 } from "lucide-react";

const INITIAL_INPUTS: AppInputs = {
  vmId: '100',
  diskBus: 'sata',
  diskBrand: 'random',
  netModel: 'e1000e',
  typeSelect: 'H',
  brandSelect: 'random',
  cpuVendor: 'random',
  cpuArch: 'default',
  cpuModel: 'auto',
  cd1: 'local:iso/virtio-win-0.1.285.iso,media=cdrom',
  cd2: 'local:iso/unattend-2026.iso,media=cdrom',
  cd3: 'local:iso/Win10_22H2_English_x64v1.iso,media=cdrom',
  bootOrder: 'sata1;sata2;sata3;sata0;net0'
};

export interface HistoryItem {
  id: string;
  vmId: string;
  friendlyName: string;
  inputs: AppInputs;
  identity: HardwareIdentity;
}

export default function App() {
  const [inputs, setInputs] = useState<AppInputs>(INITIAL_INPUTS);
  const [defaults, setDefaults] = useState<AppInputs>(INITIAL_INPUTS);
  const [identity, setIdentity] = useState<HardwareIdentity | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedNotif, setSavedNotif] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [blockedCombo, setBlockedCombo] = useState<string | null>(null);

  // Load defaults and history on mount
  useEffect(() => {
    let currentInputs = INITIAL_INPUTS;
    const saved = localStorage.getItem('pmoxDefaults');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDefaults(parsed);
        setInputs((prev) => ({ ...prev, ...parsed }));
        currentInputs = { ...currentInputs, ...parsed };
      } catch (e) {
        console.error('Failed to parse defaults', e);
      }
    }
    
    const savedHistory = localStorage.getItem('pmoxHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }

    // Defer initial generation slightly to ensure state is ready
    generateIdentity(false, currentInputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof AppInputs, value: string) => {
    setInputs(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'diskBus') {
        if (value === 'scsi') {
          next.bootOrder = 'sata0;sata1;sata2;scsi0;net0';
        } else {
          next.bootOrder = 'sata1;sata2;sata3;sata0;net0';
        }
      }
      return next;
    });
  };

  const handleGenerateClick = () => {
    generateIdentity(true);
  };

  const generateIdentity = (recordHistory = false, currentInputs = inputs) => {
    // Current input references
    const selectedHardware = selectHardwareIdentity(
      pcDB,
      currentInputs.brandSelect,
      currentInputs.typeSelect,
      currentInputs.cpuVendor,
      currentInputs.cpuArch,
      currentInputs.cpuModel
    );

    if (!selectedHardware) {
      setIdentity(null);
      setBlockedCombo("No PC model matches this combination (e.g. Dell/ASUS + AMD + Home/Office). Please change the Brand, Type, or CPU Vendor selection.");
      return;
    }

    setBlockedCombo(null);
    const { brand, model, emulatedCpu } = selectedHardware;

    const dKeyTarget = currentInputs.diskBrand === 'random' ? undefined : currentInputs.diskBrand;
    let diskInfo = dKeyTarget 
      ? diskDB.find(d => d.vendor === dKeyTarget)! 
      : diskDB[Math.floor(Math.random() * diskDB.length)];
    
    // Fallback if not found
    if (!diskInfo) diskInfo = diskDB[0];

    const diskSelected = diskInfo.models[Math.floor(Math.random() * diskInfo.models.length)];
    const sysSerial = brand.sGen ? brand.sGen() : getAlNum(10);

    const newIdentity: HardwareIdentity = {
      manuf: brand.n,
      biosVendor: brand.bv,
      prod: model.p,
      fam: model.f,
      sku: model.s,
      ver: brand.v(model),
      biosDate: getDate(),
      uuid: `${getHex(8)}-${getHex(4)}-4${getHex(3)}-${['8', '9', 'A', 'B'][Math.floor(Math.random() * ['8', '9', 'A', 'B'].length)]}${getHex(3)}-${getHex(12)}`,
      serial: sysSerial,
      mac: `${brand.macs[Math.floor(Math.random() * brand.macs.length)]}:${getHex(2)}:${getHex(2)}:${getHex(2)}`,
      dVendor: diskInfo.vendor,
      dModel: diskSelected.m,
      dType: diskSelected.t,
      dSerial: diskInfo.serialGen(),
      hvVendor: getAlNum(12),
      vmGenId: `${getHex(8)}-${getHex(4)}-4${getHex(3)}-${['8', '9', 'A', 'B'][Math.floor(Math.random() * ['8', '9', 'A', 'B'].length)]}${getHex(3)}-${getHex(12)}`,
      emulatedCpu: emulatedCpu,
      emulatedPc: model
    };

    setIdentity(newIdentity);

    if (recordHistory) {
      setHistory(prev => {
        const newItem: HistoryItem = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
          vmId: currentInputs.vmId,
          friendlyName: `${newIdentity.dVendor} ${newIdentity.dModel}`,
          inputs: { ...currentInputs },
          identity: newIdentity
        };
        const next = [newItem, ...prev].slice(0, 5);
        localStorage.setItem('pmoxHistory', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleSaveDefaults = () => {
    localStorage.setItem('pmoxDefaults', JSON.stringify(inputs));
    setDefaults(inputs);
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 1500);
  };

  const copyAdvCmd = async () => {
    const cmd = `ls -1 /var/lib/vz/template/iso/ | awk '{print "local:iso/"$1",media=cdrom"}'`;
    await navigator.clipboard.writeText(cmd);
    alert('Command Copied!');
  };

  const isDef = (field: keyof AppInputs) => inputs[field] === defaults[field];

  const restoreHistory = (item: HistoryItem) => {
    setInputs(item.inputs);
    setIdentity(item.identity);
  };

  const clearHistory = () => {
    localStorage.removeItem('pmoxHistory');
    setHistory([]);
  };

  // Derived Values
  const scsiMode = inputs.diskBus === 'scsi';
  const cd1Port = scsiMode ? 'sata0' : 'sata1';
  const cd2Port = scsiMode ? 'sata1' : 'sata2';
  const cd3Port = scsiMode ? 'sata2' : 'sata3';

  // Output 1: Delete CD-ROMs
  const safeVmId = inputs.vmId?.trim() || '<vmId>';
  const safeCd1 = cd1Port || 'sata1';
  const safeCd2 = cd2Port || 'sata2';
  const safeCd3 = cd3Port || 'sata3';
  const cdDelCmd = `qm set ${safeVmId} --delete ${safeCd1} --delete ${safeCd2} --delete ${safeCd3}`;

  // Common Args
  const getCommonArgs = () => {
    if (!identity) return '';
    const smbiosEscape = (v: string) => String(v ?? '').replace(/,/g, ',,');

    let diskGlobalArg = '';
    if (scsiMode) {
      diskGlobalArg = `-global scsi-hd.vendor="${identity.dVendor}" -global scsi-hd.product="${identity.dModel}"`;
    } else {
      diskGlobalArg = `-global ide-hd.model="${identity.dVendor} ${identity.dModel}"`;
    }

    const hvVendorId = (identity.emulatedCpu.base === 'EPYC' || identity.emulatedCpu.base === 'EPYC-Milan') ? 'AuthenticAMD' : 'GenuineIntel';
    let cpuArgsStr = `${identity.emulatedCpu.base},+aes,-hypervisor,kvm=off,hv_vendor_id=${hvVendorId},hv_relaxed,hv_spinlocks=0x1fff,hv_vapic,hv_time,model-id=${identity.emulatedCpu.name}`;
    
    if (identity.emulatedCpu.base.startsWith('Skylake-Client')) {
      const sig = getIntelSignature(identity.emulatedCpu.codename);
      cpuArgsStr += `,family=${sig.family},model=${sig.model},stepping=${sig.stepping}`;
    }

    const cpuArgs = sanitizeCpuFlags(cpuArgsStr);
    return `-cpu '${cpuArgs}' ` +
      `-smbios type=0,vendor="${smbiosEscape(identity.biosVendor)}",version="${smbiosEscape(identity.ver)}",date="${smbiosEscape(identity.biosDate)}" ` +
      `-smbios type=1,manufacturer="${smbiosEscape(identity.manuf)}",product="${smbiosEscape(identity.prod)}",version="${smbiosEscape(identity.ver)}",serial="${smbiosEscape(identity.serial)}",sku="${smbiosEscape(identity.sku)}",family="${smbiosEscape(identity.fam)}" ` +
      `-smbios type=2,manufacturer="${smbiosEscape(identity.manuf)}",product="${smbiosEscape(identity.prod)}",version="${smbiosEscape(identity.ver)}",serial="${smbiosEscape(identity.serial)}",asset="${smbiosEscape(identity.sku)}" ` +
      diskGlobalArg;
  };

  // Output 2: Config output
  const getConfigOutput = () => {
    if (!identity) return '';
    const ctime = Math.floor(Date.now() / 1000);
    let diskLine = '';
    let scsiHwLine = '';
    let cdromLinesArr = [];

    if (scsiMode) {
      diskLine = `scsi0: local-lvm:vm-${inputs.vmId}-disk-0,discard=on,iothread=1,serial=${identity.dSerial},size=50G,ssd=1`;
      scsiHwLine = `\nscsihw: virtio-scsi-single`;
    } else {
      diskLine = `sata0: local-lvm:vm-${inputs.vmId}-disk-0,discard=on,serial=${identity.dSerial},size=50G,ssd=1`;
      scsiHwLine = `\nscsihw: virtio-scsi-pci`;
    }

    if (inputs.cd1) cdromLinesArr.push(`${cd1Port}: ${inputs.cd1}`);
    if (inputs.cd2) cdromLinesArr.push(`${cd2Port}: ${inputs.cd2}`);
    if (inputs.cd3) cdromLinesArr.push(`${cd3Port}: ${inputs.cd3}`);
    const cdromLines = cdromLinesArr.join('\n');

    const args = getCommonArgs();

    return `agent: 1
args: ${args}
balloon: 3072
bios: ovmf
boot: order=${inputs.bootOrder}
cores: 4
cpu: ${sanitizeCpuFlags(`${identity.emulatedCpu.base},hidden=1,flags=+aes`)}
efidisk0: local-lvm:vm-${inputs.vmId}-disk-1,efitype=4m,pre-enrolled-keys=1,size=4M
machine: q35
memory: 4096
meta: creation-qemu=9.2.0,ctime=${ctime}
name: Windows10-${inputs.vmId}
net0: ${inputs.netModel}=${identity.mac},bridge=vmbr0,firewall=1
ostype: win10
${cdromLines ? cdromLines + '\n' : ''}${diskLine}${scsiHwLine}
sockets: 1
vga: std,memory=128
vmgenid: ${identity.vmGenId}`;
  };

  // Output 3: Bash Script
  const getBashScript = () => {
    if (!identity) return '';
    const args = getCommonArgs();

    const addMainDiskStr = scsiMode
      ? `qm set $VMID --scsi0 $STORAGE:\${DISK_SIZE},discard=on,iothread=1,serial=${identity.dSerial},ssd=1`
      : `qm set $VMID --sata0 $STORAGE:\${DISK_SIZE},discard=on,serial=${identity.dSerial},ssd=1`;

    return `#!/bin/bash
# Proxmox OEM VM Installer
# Auto-generated by Proxmox OEM Generator

clear
echo "=========================================="
echo "   PROXMOX OEM VM INSTALLER"
echo "=========================================="

# 1. VM ID Selection
while true; do
    echo ""
    read -p "Enter VM ID (Default: ${inputs.vmId}): " VMID_INPUT
    VMID=\${VMID_INPUT:-${inputs.vmId}}
    if [ -f "/etc/pve/qemu-server/$VMID.conf" ]; then
        echo "❌ Error: VM ID $VMID already exists! Try another."
    else
        echo "✅ VM ID $VMID selected."
        break
    fi
done

# 2. VM Name Selection
echo ""
read -p "Enter VM Name (Default: Windows10-$VMID): " NAME_INPUT
VM_NAME=\${NAME_INPUT:-Windows10-$VMID}

# 3. Storage Selection
echo ""
echo "Available Storage:"
echo "-----------------------------------------------------------------------"
printf "%-20s %-10s %-10s %-10s %-10s\\n" "Name" "Type" "Total" "Used" "Avail"
echo "-----------------------------------------------------------------------"
pvesm status -content images | awk 'function h(n){if(n<1024)return sprintf("%.2fKB",n);n/=1024;if(n<1024)return sprintf("%.2fMB",n);n/=1024;if(n<1024)return sprintf("%.2fGB",n);n/=1024;return sprintf("%.2fTB",n)} NR>1 {printf "%-20s %-10s %-10s %-10s %-10s\\n", $1, $2, h($4), h($5), h($6)}'
echo "-----------------------------------------------------------------------"

while true; do
    echo ""
    read -p "Enter Storage Name (Default: local-lvm): " STORAGE_INPUT
    STORAGE=\${STORAGE_INPUT:-local-lvm}
    
    if pvesm status | grep -q "^$STORAGE "; then
        echo "✅ Storage '$STORAGE' selected."
        break
    else
        echo "❌ Error: Storage '$STORAGE' not found! Please check the list above."
    fi
done

# 4. Disk Size Selection
echo ""
read -p "Enter Disk Size in GB (Default: 50): " DISK_SIZE_INPUT
DISK_SIZE=\${DISK_SIZE_INPUT:-50}

echo ""
echo "------------------------------------------"
echo "Creating VM $VMID ($VM_NAME)..."
echo "Storage: $STORAGE | Size: \${DISK_SIZE}GB"
echo "------------------------------------------"

# Create VM Base
qm create $VMID --name "$VM_NAME" \\
  --memory 4096 --balloon 3072 --cores 4 --sockets 1 --cpu "${sanitizeCpuFlags(`${identity.emulatedCpu.base},hidden=1,flags=+aes`)}" \\
  --net0 ${inputs.netModel}=${identity.mac},bridge=vmbr0,firewall=1 \\
  --bios ovmf --machine q35 --ostype win10 --agent 1 --vga std,memory=128 \\
  --scsihw ${scsiMode ? 'virtio-scsi-single' : 'virtio-scsi-pci'} \\
  --efidisk0 $STORAGE:4,efitype=4m,pre-enrolled-keys=1

# Add Main Disk
${addMainDiskStr}

# Add ISOs
${inputs.cd1 ? `qm set $VMID --${cd1Port} "${inputs.cd1}"` : ''}
${inputs.cd2 ? `qm set $VMID --${cd2Port} "${inputs.cd2}"` : ''}
${inputs.cd3 ? `qm set $VMID --${cd3Port} "${inputs.cd3}"` : ''}

# Set Boot Order
qm set $VMID --boot "order=${inputs.bootOrder}"

# Inject OEM Args safely
cat <<'EOF' >> /etc/pve/qemu-server/$VMID.conf
args: ${args}
vmgenid: ${identity.vmGenId}
meta: creation-qemu=9.2.0,ctime=${Math.floor(Date.now() / 1000)}
EOF

echo ""
echo "✅ SUCCESS! VM $VMID has been created with OEM settings."
echo "You can now start the VM from Proxmox GUI."
`;
  };

  // Calculate dynamically emulated RAM for UI display
  let emulatedRam = "8 GB";
  let pcCategoryName = "Unknown";
  if (identity) {
    if (identity.emulatedPc.t === "G") {
      // Stable random calculation using uuid
      emulatedRam = parseInt(identity.uuid[0], 16) % 2 === 0 ? "32 GB" : "16 GB";
      pcCategoryName = "Gaming PC";
    } else if (
      identity.emulatedPc.t === "H" &&
      /OptiPlex|EliteDesk|ProDesk|ThinkCentre|ExpertCenter|Vostro/i.test(identity.emulatedPc.f)
    ) {
      emulatedRam = "16 GB";
      pcCategoryName = "Office / Business PC";
    } else {
      pcCategoryName = "Home PC";
    }
  }

  return (
    <div className="min-h-screen bg-[#2d3436] font-sans text-[#dfe6e9] p-5">
      <div className="max-w-[1050px] mx-auto bg-[#353b48] p-8 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <h2 className="text-center text-[#00b894] border-b-2 border-[#00b894] pb-4 uppercase tracking-widest mb-8 text-2xl font-bold">
          Factory Level Emulation (Bash Script Logic)
        </h2>

        {/* Controls */}
        <div className="flex flex-wrap justify-start gap-4 mb-8">
          <input
            type="number"
            min="100"
            className={`w-[140px] text-center bg-[#dfe6e9] text-[#2d3436] p-3 rounded-md font-bold text-base outline-none transition-all ${isDef('vmId') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            placeholder="VM ID"
            value={inputs.vmId}
            onChange={(e) => handleChange('vmId', e.target.value)}
          />

          <select
            title="Select Disk Bus"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('diskBus') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.diskBus}
            onChange={(e) => handleChange('diskBus', e.target.value)}
          >
            <option value="scsi">SCSI Disk (VirtIO){defaults.diskBus === 'scsi' && ' (Default)'}</option>
            <option value="sata">SATA Disk (Safe/Compatible){defaults.diskBus === 'sata' && ' (Default)'}</option>
          </select>

          <select
            title="Select Disk Brand"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('diskBrand') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.diskBrand}
            onChange={(e) => { handleChange('diskBrand', e.target.value); generateIdentity(false, { ...inputs, diskBrand: e.target.value }); }}
          >
            <option value="random">Random Disk Brand{defaults.diskBrand === 'random' && ' (Default)'}</option>
            <option value="Samsung">Samsung{defaults.diskBrand === 'Samsung' && ' (Default)'}</option>
            <option value="Western Digital">Western Digital{defaults.diskBrand === 'Western Digital' && ' (Default)'}</option>
            <option value="Seagate">Seagate{defaults.diskBrand === 'Seagate' && ' (Default)'}</option>
            <option value="Crucial">Crucial{defaults.diskBrand === 'Crucial' && ' (Default)'}</option>
          </select>

          <select
            title="Select Network Adapter"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('netModel') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.netModel}
            onChange={(e) => handleChange('netModel', e.target.value)}
          >
            <option value="e1000e">Intel e1000e (PCIe - Compatible){defaults.netModel === 'e1000e' && ' (Default)'}</option>
            <option value="e1000">Intel e1000 (Standard){defaults.netModel === 'e1000' && ' (Default)'}</option>
            <option value="vmxnet3">VMware vmxnet3{defaults.netModel === 'vmxnet3' && ' (Default)'}</option>
            <option value="virtio">VirtIO (Fast but unsafe){defaults.netModel === 'virtio' && ' (Default)'}</option>
          </select>

          <select
            title="Select System Type"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('typeSelect') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.typeSelect}
            onChange={(e) => { handleChange('typeSelect', e.target.value); generateIdentity(false, { ...inputs, typeSelect: e.target.value }); }}
          >
            <option value="random">Random Type{defaults.typeSelect === 'random' && ' (Default)'}</option>
            <option value="H">Home / Office PC{defaults.typeSelect === 'H' && ' (Default)'}</option>
            <option value="G">Gaming PC{defaults.typeSelect === 'G' && ' (Default)'}</option>
          </select>

          <select
            title="Select PC Brand"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('brandSelect') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.brandSelect}
            onChange={(e) => { handleChange('brandSelect', e.target.value); generateIdentity(false, { ...inputs, brandSelect: e.target.value }); }}
          >
            <option value="random">Random PC Brand{defaults.brandSelect === 'random' && ' (Default)'}</option>
            <option value="dell">Dell{defaults.brandSelect === 'dell' && ' (Default)'}</option>
            <option value="hp">HP{defaults.brandSelect === 'hp' && ' (Default)'}</option>
            <option value="lenovo">Lenovo{defaults.brandSelect === 'lenovo' && ' (Default)'}</option>
            <option value="asus">ASUS{defaults.brandSelect === 'asus' && ' (Default)'}</option>
            <option value="MSI">MSI{defaults.brandSelect === 'MSI' && ' (Default)'}</option>
            <option value="GIGABYTE">Gigabyte{defaults.brandSelect === 'GIGABYTE' && ' (Default)'}</option>
            <option value="ACER">Acer{defaults.brandSelect === 'ACER' && ' (Default)'}</option>
          </select>

          <select
            title="Select CPU Vendor"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('cpuVendor') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.cpuVendor}
            onChange={(e) => { handleChange('cpuVendor', e.target.value); handleChange('cpuArch', 'default'); handleChange('cpuModel', 'auto'); generateIdentity(false, { ...inputs, cpuVendor: e.target.value, cpuArch: 'default', cpuModel: 'auto' }); }}
          >
            <option value="random">Random CPU Vendor{defaults.cpuVendor === 'random' && ' (Default)'}</option>
            <option value="intel">Intel{defaults.cpuVendor === 'intel' && ' (Default)'}</option>
            <option value="amd">AMD{defaults.cpuVendor === 'amd' && ' (Default)'}</option>
          </select>
          <select
            title="Select CPU Architecture"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('cpuArch') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.cpuArch}
            onChange={(e) => { handleChange('cpuArch', e.target.value); handleChange('cpuModel', 'auto'); generateIdentity(false, { ...inputs, cpuArch: e.target.value, cpuModel: 'auto' }); }}
            disabled={inputs.cpuVendor === 'random'}
          >
            {inputs.cpuVendor === 'intel' && (
              <>
                <option value="default">Skylake-Client-noTSX-IBRS (v3){defaults.cpuArch === 'default' && ' (Default)'}</option>
                <option value="Skylake-Client-v4">Skylake-Client-v4{defaults.cpuArch === 'Skylake-Client-v4' && ' (Default)'}</option>
              </>
            )}
            {inputs.cpuVendor === 'random' && <option value="default">Auto</option>}
            {inputs.cpuVendor === 'amd' && (
              <>
                <option value="default">Auto (Zen2 or Zen3){defaults.cpuArch === 'default' && ' (Default)'}</option>
                <option value="EPYC">EPYC — Zen2 (Matisse){defaults.cpuArch === 'EPYC' && ' (Default)'}</option>
                <option value="EPYC-Milan">EPYC-Milan — Zen3 (Vermeer/Cezanne){defaults.cpuArch === 'EPYC-Milan' && ' (Default)'}</option>
              </>
            )}
          </select>
          <select
            title="Select CPU Model"
            className={`bg-[#dfe6e9] text-[#2d3436] p-3 border-none rounded-md text-[15px] font-bold cursor-pointer outline-none transition-all ${isDef('cpuModel') ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
            value={inputs.cpuModel}
            onChange={(e) => { handleChange('cpuModel', e.target.value); generateIdentity(false, { ...inputs, cpuModel: e.target.value }); }}
            disabled={inputs.cpuVendor === 'random'}
          >
            <option value="auto">Auto (Random CPU){defaults.cpuModel === 'auto' && ' (Default)'}</option>
            {inputs.cpuVendor !== 'random' && getCpuModelList(pcDB, inputs.cpuVendor, inputs.cpuArch).map(cpuName => (
              <option key={cpuName} value={cpuName}>{cpuName}{defaults.cpuModel === cpuName && ' (Default)'}</option>
            ))}
          </select>

          {blockedCombo && (
            <div className="w-full basis-full mt-2 p-4 bg-[#fdcb6e] rounded-md text-[#2d3436] font-bold flex items-center justify-center gap-3 shadow-[0_0_8px_rgba(253,203,110,0.4)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{blockedCombo}</span>
            </div>
          )}

          <button
            onClick={handleSaveDefaults}
            className="flex-grow max-w-[250px] bg-[#fdcb6e] text-[#2d3436] font-bold text-[15px] rounded-md transition-colors hover:bg-[#ffeaa7]"
          >
            {savedNotif ? 'SAVED!' : 'SET AS DEFAULT'}
          </button>
          
          <button
            onClick={handleGenerateClick}
            className="flex-grow max-w-[250px] bg-[#00b894] hover:bg-[#55efc4] text-[#2d3436] font-bold text-[15px] rounded-md transition-colors"
          >
            GENERATE IDENTITY
          </button>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="bg-[#2f3640] p-4 rounded-lg mb-6 flex flex-wrap items-center gap-3 border-l-4 border-l-[#00b894]">
            <span className="text-[#b2bec3] text-sm uppercase font-semibold flex items-center gap-2">
              <History size={16} /> History:
            </span>
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => restoreHistory(item)}
                className="bg-[#353b48] hover:bg-[#dfe6e9] hover:text-[#2d3436] text-[#b2bec3] text-[13px] font-bold py-1.5 px-3 rounded border border-[#636e72] transition-colors flex items-center gap-2"
                title="Restore this configuration"
              >
                <span className="text-[#fdcb6e]">VM {item.vmId}</span>
                <span className="opacity-70">|</span>
                <span>{item.friendlyName}</span>
              </button>
            ))}
            <div className="flex-grow"></div>
            <button
              onClick={clearHistory}
              className="bg-[#c0392b] hover:bg-[#e74c3c] text-white text-[13px] font-bold py-1.5 px-3 rounded transition-colors flex items-center gap-2"
              title="Clear all history"
            >
              <Trash2 size={14} /> Clear History
            </button>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="bg-[#2f3640] p-5 rounded-lg mb-6 border-l-4 border-l-[#a29bfe]">
          <h3 className="text-[#b2bec3] text-sm uppercase border-b border-[#636e72] pb-2 mb-4 font-semibold">Custom ISOs & Boot Order</h3>
          
          <div className="bg-[#1e272e] p-4 rounded-md mb-5 border-l-4 border-l-[#00b894] text-[13px] leading-relaxed relative">
            <p className="text-[#b2bec3] mb-2"><strong className="text-[#dfe6e9]">💡 Proxmox se ISO Paths copy karne ka aasaan tarika:</strong></p>
            <p className="text-[#b2bec3] mb-3">Apne Proxmox ke <strong className="text-[#dfe6e9]">Shell</strong> (terminal) mein jayen aur neechay di gayi command run karein. Yeh server mein mojood tamaam ISO files ko exact us format mein nikal dega jo neechay in boxes mein lagta hai (Click to copy command):</p>
            <code 
              title="Click kar ke Copy karein"
              onClick={copyAdvCmd}
              className="bg-black text-[#ff7675] px-3 py-2 rounded font-mono block cursor-pointer transition-colors hover:bg-[#2d3436] select-all"
            >
              ls -1 /var/lib/vz/template/iso/ | awk {'{print "local:iso/"$1",media=cdrom"}'}
            </code>
          </div>

          <div className="space-y-3">
            {[
              { id: 'cd1', label: scsiMode ? 'SATA0 (ISO):' : 'SATA1 (ISO):', val: inputs.cd1 },
              { id: 'cd2', label: scsiMode ? 'SATA1 (ISO):' : 'SATA2 (ISO):', val: inputs.cd2 },
              { id: 'cd3', label: scsiMode ? 'SATA2 (ISO):' : 'SATA3 (ISO):', val: inputs.cd3 },
              { id: 'bootOrder', label: 'Boot Order:', val: inputs.bootOrder }
            ].map((field) => (
              <div key={field.id} className="flex items-center gap-4">
                <label className="w-[130px] font-bold text-[#b2bec3] text-sm text-right flex items-center justify-end">
                  {field.label}
                  {isDef(field.id as keyof AppInputs) && (
                    <span className="text-[#fdcb6e] text-[10px] bg-[rgba(253,203,110,0.15)] px-1.5 py-0.5 rounded border border-[#fdcb6e] ml-2 font-bold inline-block leading-tight">DEFAULT</span>
                  )}
                </label>
                <input
                  type="text"
                  className={`flex-1 bg-[#dfe6e9] text-[#2d3436] p-2.5 rounded text-sm font-normal outline-none transition-all ${isDef(field.id as keyof AppInputs) ? 'ring-2 ring-[#fdcb6e] shadow-[0_0_8px_rgba(253,203,110,0.3)]' : ''}`}
                  value={field.val}
                  onChange={(e) => handleChange(field.id as keyof AppInputs, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Identity Split Box */}
        {identity && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-[#2f3640] p-5 rounded-lg border-l-4 border-l-[#0984e3]">
              <h3 className="text-[#b2bec3] text-sm uppercase border-b border-[#636e72] pb-2 mb-4 font-semibold">System Identity</h3>
              <div className="space-y-2">
                {[
                  { label: "UUID:", val: identity.uuid },
                  { label: "Manufacturer:", val: identity.manuf },
                  { label: "Product:", val: identity.prod },
                  { label: "Version:", val: identity.ver },
                  { label: "BIOS Date:", val: identity.biosDate },
                  { label: "Serial:", val: identity.serial },
                  { label: "SKU:", val: identity.sku },
                  { label: "Family:", val: identity.fam },
                  { label: "PC Category:", val: pcCategoryName },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-[13px] border-b border-[#4a5568] pb-1.5 last:border-b-0">
                    <span className="text-[#b2bec3] font-semibold">{item.label}</span>
                    <span className="font-mono text-[#fab1a0] font-bold text-right truncate pl-4">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#2f3640] p-5 rounded-lg border-l-4 border-l-[#e17055]">
              <h3 className="text-[#b2bec3] text-sm uppercase border-b border-[#636e72] pb-2 mb-4 font-semibold">Hardware IDs</h3>
              <div className="space-y-2">
                {[
                  { label: "VM Gen ID:", val: identity.vmGenId, color: "text-[#fab1a0]" },
                  { label: "HV Vendor ID:", val: identity.hvVendor, color: "text-[#fab1a0]" },
                  { label: "Mac Address:", val: identity.mac, color: "text-[#55efc4] drop-shadow-[0_0_5px_rgba(85,239,196,0.2)]" },
                  { label: "Disk Serial:", val: identity.dSerial, color: "text-[#55efc4] drop-shadow-[0_0_5px_rgba(85,239,196,0.2)]" },
                  { spacer: true },
                  { label: "Emulated CPU:", val: identity.emulatedCpu.name, color: "text-[#55efc4] drop-shadow-[0_0_5px_rgba(85,239,196,0.2)]" },
                  { label: "QEMU Architecture:", val: identity.emulatedCpu.base, color: "text-[#74b9ff]" },
                  { label: "CPU Codename Real World:", val: identity.emulatedCpu.codename, color: "text-[#74b9ff]" },
                  { label: "Hardware Concurrency:", val: `${identity.emulatedCpu.threads || 12}`, color: "text-[#ffeaa7]" },
                  { label: "System RAM:", val: emulatedRam, color: "text-[#ffeaa7]" },
                  { label: "Friendly Name:", val: `${identity.dVendor} ${identity.dModel}`, color: "text-[#55efc4] drop-shadow-[0_0_5px_rgba(85,239,196,0.2)]" },
                  { label: "Disk Brand:", val: identity.dVendor, color: "text-[#ffeaa7]" },
                  { label: "Disk Type:", val: identity.dType, color: "text-[#74b9ff]" },
                  { label: "Hypervisor Compatibility:", val: "ENABLED (KVM Off)", color: "text-[#74b9ff]" },
                ].map((item, idx) => item.spacer ? (
                  <div key={`spacer-${idx}`} className="h-2 border-b border-[#4a5568] mb-2" />
                ) : (
                  <div key={item.label} className="flex justify-between text-[13px] border-b border-[#4a5568] pb-1.5 last:border-b-0">
                    <span className="text-[#b2bec3] font-semibold">{item.label}</span>
                    <span className={`font-mono font-bold text-right truncate pl-4 ${item.color}`}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code Outputs */}
        <CodePanel 
          title="Remove CD-ROMs (Post-Install Command)"
          titleColor="#fd79a8"
          titleBg="#2d3436"
          content={cdDelCmd}
          copyBtnColor="#e84393"
          borderColor="#e84393"
          singleLine
        />

        <CodePanel 
          title={`nano /etc/pve/qemu-server/${inputs.vmId}.conf`}
          content={getConfigOutput()}
          copyBtnColor="#e17055"
          downloadFilename={`${inputs.vmId}.conf`}
        />

        <CodePanel 
          title="Bash Installer (Paste in Proxmox Shell)"
          titleColor="#a29bfe"
          titleBg="#2d3436"
          content={getBashScript()}
          copyBtnColor="#6c5ce7"
          borderColor="#6c5ce7"
          downloadFilename={`install_vm_${inputs.vmId}.sh`}
        />
        
      </div>
    </div>
  );
}

