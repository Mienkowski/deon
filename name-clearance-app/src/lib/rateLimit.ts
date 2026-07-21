// Prosty rate limiter w pamięci (sekcja 16). Okno przesuwne per-klucz (IP).
// Etap 3: wymień na Redis dla wielu instancji.

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, perMinute: number): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const arr = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (arr.length >= perMinute) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}
