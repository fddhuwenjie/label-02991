import { delay } from './mock/delay';
import { storage } from '../utils/storage';
import { generateId } from '../utils/format';
import { getCurrentUser } from './auth';
import type { FeedbackItem } from '../types';

export async function submitFeedback(
  type: 'suggestion' | 'bug',
  content: string,
  images: string[]
): Promise<{ success: boolean; message: string }> {
  await delay(800);
  const user = getCurrentUser();
  if (!user) return { success: false, message: '请先登录' };

  if (!content.trim()) return { success: false, message: '请输入反馈内容' };

  const item: FeedbackItem = {
    id: generateId(),
    type,
    content: content.trim(),
    images,
    status: 'pending',
    createdAt: Date.now(),
  };

  const key = 'feedback_' + user.id;
  const list = storage.get<FeedbackItem[]>(key, []);
  list.unshift(item);
  storage.set(key, list);

  return { success: true, message: '反馈提交成功，我们会尽快处理' };
}

export function getFeedbackList(): FeedbackItem[] {
  const user = getCurrentUser();
  if (!user) return [];
  return storage.get<FeedbackItem[]>('feedback_' + user.id, []);
}
