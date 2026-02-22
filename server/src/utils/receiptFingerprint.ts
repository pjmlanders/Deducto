import crypto from 'crypto';

/**
 * Compute a short fingerprint for duplicate receipt detection.
 * Same vendor + amount + date produces the same fingerprint.
 */
export function computeReceiptFingerprint(
  vendor: string,
  amount: number,
  date: string
): string {
  const normalized = `${vendor.toLowerCase().trim()}|${amount.toFixed(2)}|${date}`;
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
