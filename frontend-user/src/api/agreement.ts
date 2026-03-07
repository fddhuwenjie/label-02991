import { delay } from './mock/delay';
import { storage } from '../utils/storage';
import { MOCK_AGREEMENTS } from './mock/data';
import type { Agreement } from '../types';

const AGREEMENT_KEY = 'agreements_config';

function readAgreementConfig(): Agreement[] {
  const saved = storage.get<Agreement[] | null>(AGREEMENT_KEY, null);
  if (saved && saved.length > 0) return saved;
  storage.set(AGREEMENT_KEY, MOCK_AGREEMENTS);
  return MOCK_AGREEMENTS;
}

export async function getAgreementByType(type: string): Promise<Agreement | null> {
  await delay(400);
  const agreements = readAgreementConfig();
  return agreements.find((a) => a.id === type) || null;
}

export async function updateAgreement(
  type: string,
  payload: Pick<Agreement, 'content' | 'updatedAt'>
): Promise<{ success: boolean; message: string }> {
  await delay(400);
  const agreements = readAgreementConfig();
  const idx = agreements.findIndex((a) => a.id === type);
  if (idx < 0) return { success: false, message: '协议不存在' };

  agreements[idx] = {
    ...agreements[idx],
    content: payload.content,
    updatedAt: payload.updatedAt,
  };
  storage.set(AGREEMENT_KEY, agreements);
  return { success: true, message: '协议已更新' };
}
