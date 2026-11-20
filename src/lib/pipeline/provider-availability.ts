export function isFalAvailable(): boolean {
  return Boolean(process.env.FAL_API_KEY);
}
