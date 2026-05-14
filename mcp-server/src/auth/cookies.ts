/**
 * AES-256-GCM cookie encryption (paridade LinkedIn).
 *
 * Blob layout (single bytea column in `accounts.cookie_encrypted`):
 *   IV (12 bytes) || Auth Tag (16 bytes) || Ciphertext (variable)
 *
 * `MASTER_KEY` is validated by env.ts as 64 hex chars (32 bytes), so the
 * `Buffer.from(..., 'hex')` here is always exactly 32 bytes (AES-256 requirement).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../env.js';
import { AppError } from '../errors.js';

const KEY = Buffer.from(env.MASTER_KEY, 'hex');

const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = IV_LEN + TAG_LEN;

export function encryptCookie(plaintext: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]);
}

export function decryptCookie(blob: Buffer): string {
  if (blob.length < HEADER_LEN) {
    throw new AppError('COOKIE_DECRYPT_FAIL', 'Cookie blob too short', {
      length: blob.length,
    });
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, HEADER_LEN);
  const ct = blob.subarray(HEADER_LEN);
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch (err) {
    throw new AppError('COOKIE_DECRYPT_FAIL', 'GCM tag verification failed', undefined, err);
  }
}
