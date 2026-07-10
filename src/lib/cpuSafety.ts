export const SAFE_CPU_FLAGS = new Set([
  'aes',
  'sse4.1',
  'sse4.2',
  'sse4_1',
  'sse4_2',
  'ssse3',
  'popcnt',
  'avx',
  'avx2',
  'fma'
]);

export function sanitizeCpuFlags(flagsString: string): string {
  if (!flagsString) return '';
  const tokens = flagsString.split(',');
  const sanitizedTokens = tokens.filter(token => {
    // Keep QEMU operational and passthrough arguments
    if (
      token.startsWith('kvm=') ||
      token.startsWith('hv_') ||
      token.startsWith('model-id=') ||
      token.startsWith('model_id=') ||
      token.startsWith('hidden=') ||
      token.startsWith('family=') ||
      token.startsWith('model=') ||
      token.startsWith('stepping=') ||
      token === '-hypervisor' ||
      (!token.startsWith('+') && !token.startsWith('-') && !token.includes('='))
    ) {
      return true;
    }

    // Process direct +/- flags
    if (token.startsWith('+') || token.startsWith('-')) {
      const flagName = token.slice(1);
      return SAFE_CPU_FLAGS.has(flagName);
    }

    // Process Proxmox flags property e.g. flags=+aes;-pclmulqdq
    if (token.startsWith('flags=')) {
      return true;
    }

    return false;
  });

  return sanitizedTokens.map(token => {
    if (token.startsWith('flags=')) {
      const innerFlags = token.slice(6).split(/;/);
      const safeInner = innerFlags.filter(f => {
        if (f.startsWith('+') || f.startsWith('-')) {
          return SAFE_CPU_FLAGS.has(f.slice(1));
        }
        return false;
      });
      if (safeInner.length === 0) return '';
      return `flags=${safeInner.join(';')}`;
    }
    return token;
  }).filter(t => t !== '').join(',');
}
