import dayjs from 'dayjs';

export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}米`;
  return `${(meters / 1000).toFixed(1)}公里`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}小时${remainMins}分钟` : `${hours}小时`;
}

export function formatTime(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DD HH:mm:ss');
}

export function formatDate(ts: number): string {
  return dayjs(ts).format('YYYY-MM-DD');
}

export function formatShortTime(ts: number): string {
  const d = dayjs(ts);
  const now = dayjs();
  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `昨天 ${d.format('HH:mm')}`;
  if (d.isSame(now, 'year')) return d.format('MM-DD HH:mm');
  return d.format('YYYY-MM-DD HH:mm');
}

export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateOrderId(): string {
  const d = dayjs().format('YYYYMMDDHHmmss');
  const r = Math.random().toString().slice(2, 8);
  return `DD${d}${r}`;
}

export function generateTransactionId(): string {
  return `TXN${Date.now()}${Math.random().toString().slice(2, 6)}`;
}
