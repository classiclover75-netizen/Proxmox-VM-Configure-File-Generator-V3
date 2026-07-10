export function getHex(len: number): string {
  let r = '';
  const h = '0123456789ABCDEF';
  for (let i = 0; i < len; i++) r += h.charAt(Math.floor(Math.random() * 16));
  return r;
}

export function getAlNum(len: number): string {
  let r = '';
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < len; i++) r += c.charAt(Math.floor(Math.random() * c.length));
  return r;
}

export function getDate(): string {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}
