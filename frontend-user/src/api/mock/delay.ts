export function delay(ms: number = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 400));
}
