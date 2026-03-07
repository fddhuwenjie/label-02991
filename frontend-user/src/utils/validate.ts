export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isValidVerifyCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function isValidNickname(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 20;
}
