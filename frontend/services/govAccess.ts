const STORAGE_KEY = 'civicpulse_gov_access_key';

export function getGovAccessKey(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setGovAccessKey(key: string): void {
  sessionStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearGovAccessKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function govHeaders(extra?: HeadersInit): HeadersInit {
  const key = getGovAccessKey();
  return {
    ...(extra || {}),
    ...(key ? { 'X-Gov-Access-Key': key } : {}),
  };
}
