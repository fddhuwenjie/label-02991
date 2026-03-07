import { delay } from './mock/delay';
import { storage } from '../utils/storage';
import { generateId } from '../utils/format';
import { getCurrentUser } from './auth';
import type { Coupon } from '../types';

function getCoupons(): Coupon[] {
  const user = getCurrentUser();
  if (!user) return [];
  return storage.get<Coupon[]>('coupons_' + user.id, []);
}

function saveCoupons(coupons: Coupon[]): void {
  const user = getCurrentUser();
  if (!user) return;
  storage.set('coupons_' + user.id, coupons);
}

export function getAvailableCoupons(minPrice?: number): Coupon[] {
  const now = Date.now();
  let coupons = getCoupons().filter((c) => !c.used && c.expireAt > now);
  if (minPrice !== undefined) {
    coupons = coupons.filter((c) => minPrice >= c.minSpend);
  }
  return coupons.sort((a, b) => b.expireAt - a.expireAt);
}

export function getAllCoupons(): Coupon[] {
  return getCoupons().sort((a, b) => {
    if (a.used !== b.used) return a.used ? 1 : -1;
    return b.expireAt - a.expireAt;
  });
}

export async function claimCoupon(type: 'newUser' | 'daily' | 'invite'): Promise<{ success: boolean; coupon?: Coupon; message: string }> {
  await delay(600);
  const user = getCurrentUser();
  if (!user) return { success: false, message: '请先登录' };

  const day = 86400000;
  const configs: Record<string, { typeName: string; amount: number; minSpend: number; days: number }> = {
    newUser: { typeName: '新人专享', amount: 8, minSpend: 20, days: 30 },
    daily: { typeName: '每日签到', amount: 2, minSpend: 10, days: 3 },
    invite: { typeName: '邀请好友', amount: 15, minSpend: 30, days: 14 },
  };

  const config = configs[type];
  if (!config) return { success: false, message: '优惠券类型无效' };

  const coupons = getCoupons();

  // New user coupon can only be claimed once per account.
  if (type === 'newUser') {
    const hasClaimedNewUserCoupon = coupons.some((c) => c.type === 'newUser');
    if (hasClaimedNewUserCoupon) {
      return { success: false, message: '新人专享券每个账号仅可领取一次' };
    }
  }

  if (type === 'daily') {
    const lastClaimKey = `last_daily_claim_${user.id}`;
    const lastClaim = storage.get<number>(lastClaimKey, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    if (lastClaim >= today) return { success: false, message: '今日已签到领取，明天再来吧' };
    storage.set(lastClaimKey, Date.now());
  }

  const coupon: Coupon = {
    id: generateId(),
    type,
    typeName: config.typeName,
    amount: config.amount,
    minSpend: config.minSpend,
    expireAt: Date.now() + config.days * day,
    used: false,
  };

  coupons.push(coupon);
  saveCoupons(coupons);

  return { success: true, coupon, message: '领取成功' };
}

export function generateInviteCode(): string {
  const user = getCurrentUser();
  return user ? `INVITE_${user.id}_${Date.now().toString(36)}` : '';
}

export function generateInviteQrSvg(code: string): string {
  const dark = '#333333';
  const light = '#FFFFFF';
  const size = 21;
  const cell = 8;
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }

  function isFinder(x: number, y: number, ox: number, oy: number) {
    const rx = x - ox;
    const ry = y - oy;
    if (rx < 0 || ry < 0 || rx > 6 || ry > 6) return false;
    if (rx === 0 || ry === 0 || rx === 6 || ry === 6) return true;
    if (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4) return true;
    return false;
  }

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const finder =
        isFinder(x, y, 0, 0) ||
        isFinder(x, y, size - 7, 0) ||
        isFinder(x, y, 0, size - 7);
      const noise = ((x * 17 + y * 13 + hash) % 7) < 3;
      if (finder || noise) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${dark}" />`;
      }
    }
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size * cell}" height="${size * cell}" viewBox="0 0 ${size * cell} ${
      size * cell
    }"><rect width="100%" height="100%" fill="${light}"/>${rects}</svg>`
  )}`;
}

export function recordInviteScan(code: string): { success: boolean; message: string } {
  const user = getCurrentUser();
  if (!user) return { success: false, message: '请先登录' };
  const key = `invite_scan_records_${user.id}`;
  const list = storage.get<Array<{ code: string; scannedAt: number }>>(key, []);
  list.push({ code, scannedAt: Date.now() });
  storage.set(key, list);
  return { success: true, message: '已记录扫码邀请' };
}

export function getInviteScanCount(): number {
  const user = getCurrentUser();
  if (!user) return 0;
  const key = `invite_scan_records_${user.id}`;
  const list = storage.get<Array<{ code: string; scannedAt: number }>>(key, []);
  return list.length;
}
