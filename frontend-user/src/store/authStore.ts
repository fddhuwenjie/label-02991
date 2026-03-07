import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  init: () => void;
  login: (
    phone: string,
    code: string
  ) => Promise<{
    success: boolean;
    message: string;
    requiresDeviceVerification?: boolean;
    verificationTicket?: string;
    verifyCode?: string;
  }>;
  wechatLogin: () => Promise<{ success: boolean; message: string }>;
  register: (phone: string, code: string) => Promise<{ success: boolean; message: string }>;
  verifyDeviceLogin: (ticket: string, verifyCode: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  sendCode: (phone: string) => Promise<{ success: boolean; message: string; verifyCode?: string }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authApi.getCurrentUser(),
  isLoggedIn: !!authApi.getCurrentUser(),
  loading: false,

  init() {
    const user = authApi.getCurrentUser();
    set({ user, isLoggedIn: !!user });
  },

  async sendCode(phone) {
    return await authApi.sendVerifyCode(phone);
  },

  async login(phone, code) {
    set({ loading: true });
    try {
      const res = await authApi.login(phone, code);
      if (res.success && res.user) {
        set({ user: res.user, isLoggedIn: true });
      }
      return {
        success: res.success,
        message: res.message,
        requiresDeviceVerification: res.requiresDeviceVerification,
        verificationTicket: res.verificationTicket,
        verifyCode: res.verifyCode,
      };
    } finally {
      set({ loading: false });
    }
  },

  async wechatLogin() {
    set({ loading: true });
    try {
      const res = await authApi.wechatLogin();
      if (res.success && res.user) {
        set({ user: res.user, isLoggedIn: true });
      }
      return { success: res.success, message: res.message };
    } finally {
      set({ loading: false });
    }
  },

  async register(phone, code) {
    set({ loading: true });
    try {
      const res = await authApi.register(phone, code);
      if (res.success && res.user) {
        set({ user: res.user, isLoggedIn: true });
      }
      return { success: res.success, message: res.message };
    } finally {
      set({ loading: false });
    }
  },

  async verifyDeviceLogin(ticket, verifyCode) {
    set({ loading: true });
    try {
      const res = await authApi.verifyDeviceLogin(ticket, verifyCode);
      if (res.success && res.user) {
        set({ user: res.user, isLoggedIn: true });
      }
      return { success: res.success, message: res.message };
    } finally {
      set({ loading: false });
    }
  },

  logout() {
    authApi.logout();
    set({ user: null, isLoggedIn: false });
  },

  async updateUser(data) {
    set({ loading: true });
    try {
      const res = await authApi.updateUser(data);
      if (res.success) {
        set({ user: res.user });
      }
      return { success: res.success, message: res.message };
    } finally {
      set({ loading: false });
    }
  },
}));
