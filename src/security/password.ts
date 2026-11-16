import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { getRandomBytesAsync } from 'expo-crypto';

const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = await getRandomBytesAsync(SALT_BYTES);
  const key = await pbkdf2Async(sha256, password, salt, {
    c: ITERATIONS, dkLen: KEY_BYTES, asyncTick: 10,
  });
  return `pbkdf2-sha256$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(key)}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  // Bound the work and reject malformed/unsupported records without treating them as plaintext.
  const match = /^pbkdf2-sha256\$600000\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(encoded);
  if (!match) return false;
  const expected = hexToBytes(match[2]);
  const actual = await pbkdf2Async(sha256, password, hexToBytes(match[1]), {
    c: ITERATIONS, dkLen: KEY_BYTES, asyncTick: 10,
  });
  // Compare every byte; do not stop at the first mismatch.
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= expected[index] ^ actual[index];
  }
  return difference === 0;
}
