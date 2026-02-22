import { describe, it, expect } from 'vitest';
import { computeReceiptFingerprint } from './receiptFingerprint.js';

describe('computeReceiptFingerprint', () => {
  it('returns same fingerprint for same vendor, amount, and date', () => {
    const a = computeReceiptFingerprint('Acme Corp', 42.5, '2025-02-20');
    const b = computeReceiptFingerprint('Acme Corp', 42.5, '2025-02-20');
    expect(a).toBe(b);
  });

  it('returns different fingerprint for different amount', () => {
    const a = computeReceiptFingerprint('Acme', 10, '2025-02-20');
    const b = computeReceiptFingerprint('Acme', 20, '2025-02-20');
    expect(a).not.toBe(b);
  });

  it('returns different fingerprint for different date', () => {
    const a = computeReceiptFingerprint('Acme', 10, '2025-02-20');
    const b = computeReceiptFingerprint('Acme', 10, '2025-02-21');
    expect(a).not.toBe(b);
  });

  it('normalizes vendor case and whitespace', () => {
    const a = computeReceiptFingerprint('  Acme Corp  ', 10, '2025-02-20');
    const b = computeReceiptFingerprint('acme corp', 10, '2025-02-20');
    expect(a).toBe(b);
  });

  it('returns 16-character hex string', () => {
    const fp = computeReceiptFingerprint('Store', 99.99, '2025-01-01');
    expect(fp).toMatch(/^[a-f0-9]{16}$/);
    expect(fp.length).toBe(16);
  });
});
