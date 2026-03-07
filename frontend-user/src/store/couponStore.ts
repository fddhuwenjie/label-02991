import { create } from 'zustand';
import type { Coupon } from '../types';
import * as couponApi from '../api/coupon';

interface CouponState {
  coupons: Coupon[];
  availableCoupons: Coupon[];
  loading: boolean;
  loadAll: () => void;
  loadAvailable: (minPrice?: number) => void;
  claim: (type: 'newUser' | 'daily' | 'invite') => Promise<{ success: boolean; message: string }>;
  getInviteCode: () => string;
  getInviteQr: (code: string) => string;
  recordInviteScan: (code: string) => { success: boolean; message: string };
  getInviteScanCount: () => number;
}

export const useCouponStore = create<CouponState>((set) => ({
  coupons: [],
  availableCoupons: [],
  loading: false,

  loadAll() {
    set({ coupons: couponApi.getAllCoupons() });
  },

  loadAvailable(minPrice) {
    set({ availableCoupons: couponApi.getAvailableCoupons(minPrice) });
  },

  async claim(type) {
    set({ loading: true });
    try {
      const res = await couponApi.claimCoupon(type);
      if (res.success) {
        set({ coupons: couponApi.getAllCoupons() });
      }
      return { success: res.success, message: res.message };
    } finally {
      set({ loading: false });
    }
  },

  getInviteCode() {
    return couponApi.generateInviteCode();
  },

  getInviteQr(code) {
    return couponApi.generateInviteQrSvg(code);
  },

  recordInviteScan(code) {
    return couponApi.recordInviteScan(code);
  },

  getInviteScanCount() {
    return couponApi.getInviteScanCount();
  },
}));
