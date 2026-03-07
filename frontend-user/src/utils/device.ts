function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function getDeviceFingerprint(): string {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const scr = typeof screen !== 'undefined' ? screen : ({ width: 0, height: 0 } as Screen);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  const raw = [
    nav.userAgent || '',
    nav.language || '',
    nav.platform || '',
    String(scr.width || 0),
    String(scr.height || 0),
    tz,
  ].join('|');
  return 'dev_' + simpleHash(raw);
}
