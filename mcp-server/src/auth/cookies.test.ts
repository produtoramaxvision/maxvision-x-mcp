import { describe, it, expect } from 'vitest';
import { encryptCookie, decryptCookie } from './cookies.js';
import { AppError } from '../errors.js';

describe('encryptCookie / decryptCookie', () => {
  it('round-trips a short auth_token', () => {
    const plaintext = 'auth_token_value_short';
    const blob = encryptCookie(plaintext);
    expect(decryptCookie(blob)).toBe(plaintext);
  });

  it('round-trips a JSON payload with cookie array', () => {
    const payload = JSON.stringify([
      { name: 'auth_token', value: 'abc123', domain: '.x.com' },
      { name: 'ct0', value: 'csrf-token-here', domain: '.x.com' },
    ]);
    const blob = encryptCookie(payload);
    expect(decryptCookie(blob)).toBe(payload);
  });

  it('round-trips empty string', () => {
    const blob = encryptCookie('');
    expect(decryptCookie(blob)).toBe('');
  });

  it('round-trips utf-8 multibyte chars', () => {
    const plaintext = 'usuário ações çãéõ 中文 🔐';
    const blob = encryptCookie(plaintext);
    expect(decryptCookie(blob)).toBe(plaintext);
  });

  it('produces blob of length 28 + plaintext bytes (IV+tag+CT)', () => {
    const plaintext = 'abc';
    const blob = encryptCookie(plaintext);
    // IV(12) + tag(16) + ciphertext(3 bytes for "abc" UTF-8)
    expect(blob.length).toBe(28 + Buffer.byteLength(plaintext, 'utf8'));
  });

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same input';
    const blob1 = encryptCookie(plaintext);
    const blob2 = encryptCookie(plaintext);
    expect(blob1.equals(blob2)).toBe(false);
    // Both decrypt to same plaintext
    expect(decryptCookie(blob1)).toBe(plaintext);
    expect(decryptCookie(blob2)).toBe(plaintext);
  });

  it('throws COOKIE_DECRYPT_FAIL on blob shorter than header', () => {
    const tooShort = Buffer.alloc(27); // < 28 (IV+tag)
    expect(() => decryptCookie(tooShort)).toThrow(AppError);
    try {
      decryptCookie(tooShort);
    } catch (err) {
      expect((err as AppError).code).toBe('COOKIE_DECRYPT_FAIL');
    }
  });

  it('throws COOKIE_DECRYPT_FAIL on tampered ciphertext (GCM tag mismatch)', () => {
    const plaintext = 'sensitive_cookie_value';
    const blob = encryptCookie(plaintext);
    // Flip last byte of ciphertext
    const tampered = Buffer.from(blob);
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0xff;
    expect(() => decryptCookie(tampered)).toThrow(AppError);
    try {
      decryptCookie(tampered);
    } catch (err) {
      expect((err as AppError).code).toBe('COOKIE_DECRYPT_FAIL');
    }
  });

  it('throws COOKIE_DECRYPT_FAIL on tampered auth tag', () => {
    const blob = encryptCookie('plaintext');
    const tampered = Buffer.from(blob);
    // Flip byte in auth tag region (offset 12-27)
    tampered[20] = tampered[20]! ^ 0xff;
    expect(() => decryptCookie(tampered)).toThrow(AppError);
  });

  it('throws COOKIE_DECRYPT_FAIL on tampered IV', () => {
    const blob = encryptCookie('plaintext');
    const tampered = Buffer.from(blob);
    // Flip byte in IV region (offset 0-11)
    tampered[5] = tampered[5]! ^ 0xff;
    expect(() => decryptCookie(tampered)).toThrow(AppError);
  });
});
