import { delay } from './mock/delay';
import { storage } from '../utils/storage';
import { generateId } from '../utils/format';
import { generateMockCoupons } from './mock/data';
import type { User, VerifyCode } from '../types';
import { getDeviceFingerprint } from '../utils/device';

export async function sendVerifyCode(
  phone: string
): Promise<{ success: boolean; message: string; verifyCode?: string }> {
  await delay(800);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const record: VerifyCode = { phone, code, expireAt: Date.now() + 5 * 60 * 1000 };
  storage.set('verify_code', record);
  console.log(`[Mock] 验证码已发送至 ${phone}: ${code}`);
  return { success: true, message: '验证码已发送', verifyCode: code };
}

export async function verifyCode(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  await delay(500);
  const record = storage.get<VerifyCode | null>('verify_code', null);
  if (!record) return { success: false, message: '请先获取验证码' };
  if (record.phone !== phone) return { success: false, message: '手机号不匹配' };
  if (Date.now() > record.expireAt) return { success: false, message: '验证码已过期，请重新获取' };
  if (record.code !== code) return { success: false, message: '验证码错误' };
  return { success: true, message: '验证成功' };
}

export async function register(phone: string, code: string): Promise<{ success: boolean; user?: User; message: string }> {
  const verify = await verifyCode(phone, code);
  if (!verify.success) return { success: false, message: verify.message };

  const users = storage.get<User[]>('users', []);
  if (users.find((u) => u.phone === phone)) {
    return { success: false, message: '该手机号已注册，请直接登录' };
  }

  const user: User = {
    id: generateId(),
    phone,
    nickname: `用户${phone.slice(-4)}`,
    avatar: '',
    gender: '',
    birthday: '',
    homeAddress: '',
    companyAddress: '',
    emergencyContact: '',
    emergencyPhone: '',
    lastNicknameChange: '',
    loginProtection: false,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  storage.set('users', users);
  storage.set('current_user', user);
  storage.remove('verify_code');

  if (!storage.get('coupons_' + user.id, null)) {
    storage.set('coupons_' + user.id, generateMockCoupons());
  }
  if (storage.get<number | null>('prepaid_balance_' + user.id, null) === null) {
    storage.set('prepaid_balance_' + user.id, 20);
  }
  storage.set('trusted_devices_' + user.id, [getDeviceFingerprint()]);

  return { success: true, user, message: '注册成功' };
}

export async function login(phone: string, code: string): Promise<{
  success: boolean;
  user?: User;
  message: string;
  requiresDeviceVerification?: boolean;
  verificationTicket?: string;
  verifyCode?: string;
}> {
  const verify = await verifyCode(phone, code);
  if (!verify.success) return { success: false, message: verify.message };

  const users = storage.get<User[]>('users', []);
  let user = users.find((u) => u.phone === phone);

  if (!user) {
    user = {
      id: generateId(),
      phone,
      nickname: `用户${phone.slice(-4)}`,
      avatar: '',
      gender: '',
      birthday: '',
      homeAddress: '',
      companyAddress: '',
      emergencyContact: '',
      emergencyPhone: '',
      lastNicknameChange: '',
      loginProtection: false,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    storage.set('users', users);
    if (!storage.get('coupons_' + user.id, null)) {
      storage.set('coupons_' + user.id, generateMockCoupons());
    }
    if (storage.get<number | null>('prepaid_balance_' + user.id, null) === null) {
      storage.set('prepaid_balance_' + user.id, 20);
    }
    storage.set('trusted_devices_' + user.id, [getDeviceFingerprint()]);
  }

  const fp = getDeviceFingerprint();
  const trustedDevices = storage.get<string[]>('trusted_devices_' + user.id, []);
  const isTrusted = trustedDevices.includes(fp);
  if (user.loginProtection && !isTrusted) {
    const verifyCode = String(Math.floor(1000 + Math.random() * 9000));
    const verificationTicket = generateId();
    storage.set('pending_device_login_' + verificationTicket, {
      userId: user.id,
      verifyCode,
      expireAt: Date.now() + 5 * 60 * 1000,
      deviceFingerprint: fp,
    });
    return {
      success: false,
      message: '检测到陌生设备，请完成二次验证',
      requiresDeviceVerification: true,
      verificationTicket,
      verifyCode,
    };
  }

  if (!isTrusted) {
    storage.set('trusted_devices_' + user.id, [...trustedDevices, fp]);
  }

  storage.set('current_user', user);
  storage.remove('verify_code');
  return { success: true, user, message: '登录成功' };
}

export async function verifyDeviceLogin(
  verificationTicket: string,
  verifyCode: string
): Promise<{ success: boolean; user?: User; message: string }> {
  await delay(400);
  const pending = storage.get<{
    userId: string;
    verifyCode: string;
    expireAt: number;
    deviceFingerprint: string;
  } | null>('pending_device_login_' + verificationTicket, null);
  if (!pending) return { success: false, message: '验证凭证无效' };
  if (Date.now() > pending.expireAt) return { success: false, message: '验证已过期，请重新登录' };
  if (pending.verifyCode !== verifyCode) return { success: false, message: '二次验证码错误' };

  const users = storage.get<User[]>('users', []);
  const user = users.find((u) => u.id === pending.userId);
  if (!user) return { success: false, message: '用户不存在' };

  const trustedKey = 'trusted_devices_' + user.id;
  const trusted = storage.get<string[]>(trustedKey, []);
  if (!trusted.includes(pending.deviceFingerprint)) {
    trusted.push(pending.deviceFingerprint);
    storage.set(trustedKey, trusted);
  }

  storage.set('current_user', user);
  storage.remove('pending_device_login_' + verificationTicket);
  return { success: true, user, message: '设备验证成功，已登录' };
}

export async function wechatLogin(): Promise<{
  success: boolean;
  user?: User;
  message: string;
}> {
  await delay(1200);

  // 模拟微信授权获取的用户信息
  const mockWechatOpenId = 'wx_' + generateId().slice(0, 16);
  const mockNickname = ['小明', '小红', '阳光', '微风', '星辰', '流云'][Math.floor(Math.random() * 6)] + Math.floor(Math.random() * 1000);

  // 检查是否已有通过微信登录的用户（基于模拟的openId存储）
  const wechatUsers = storage.get<Record<string, string>>('wechat_users', {});
  let userId = wechatUsers[mockWechatOpenId];

  const users = storage.get<User[]>('users', []);
  let user: User | undefined;

  if (userId) {
    user = users.find((u) => u.id === userId);
  }

  if (!user) {
    // 创建新用户（微信登录无需手机号）
    const genderOptions: Array<'男' | '女' | ''> = ['男', '女', ''];
    user = {
      id: generateId(),
      phone: '',
      nickname: mockNickname,
      avatar: '',
      gender: genderOptions[Math.floor(Math.random() * 3)],
      birthday: '',
      homeAddress: '',
      companyAddress: '',
      emergencyContact: '',
      emergencyPhone: '',
      lastNicknameChange: '',
      loginProtection: false,
      createdAt: new Date().toISOString(),
      wechatOpenId: mockWechatOpenId,
    };

    users.push(user);
    storage.set('users', users);
    wechatUsers[mockWechatOpenId] = user.id;
    storage.set('wechat_users', wechatUsers);

    // 初始化新用户数据
    if (!storage.get('coupons_' + user.id, null)) {
      storage.set('coupons_' + user.id, generateMockCoupons());
    }
    if (storage.get<number | null>('prepaid_balance_' + user.id, null) === null) {
      storage.set('prepaid_balance_' + user.id, 20);
    }
    storage.set('trusted_devices_' + user.id, [getDeviceFingerprint()]);
  }

  // 此时 user 必定已赋值
  const validUser = user as User;

  storage.set('current_user', validUser);
  return { success: true, user: validUser, message: '微信登录成功' };
}

export function logout(): void {
  storage.remove('current_user');
}

export function getCurrentUser(): User | null {
  return storage.get<User | null>('current_user', null);
}

export async function updateUser(data: Partial<User>): Promise<{ success: boolean; user: User; message: string }> {
  await delay(400);
  const current = getCurrentUser();
  if (!current) throw new Error('未登录');

  if (data.nickname !== undefined && data.nickname !== current.nickname) {
    if (current.lastNicknameChange) {
      const lastChangeDate = new Date(current.lastNicknameChange);
      const now = new Date();
      // 检查是否在同一自然月内（年份和月份相同则不允许修改）
      if (
        lastChangeDate.getFullYear() === now.getFullYear() &&
        lastChangeDate.getMonth() === now.getMonth()
      ) {
        return { success: false, user: current, message: '每月仅可修改一次昵称，请下月再试' };
      }
    }
    // 昵称修改成功时更新修改时间
    data.lastNicknameChange = new Date().toISOString();
  }

  const updated = { ...current, ...data };
  storage.set('current_user', updated);

  const users = storage.get<User[]>('users', []);
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx >= 0) users[idx] = updated;
  storage.set('users', users);

  return { success: true, user: updated, message: '更新成功' };
}
