// Cifrado en reposo (AES-256-GCM) de los tokens de transmisión de cada comunidad.
// Copia de ghosty-studio/app/lib/secret-vault.server.ts (12-nov-2026).
//
// La llave maestra vive en el env `STREAM_KEYS_MASTER` (32 bytes en hex = 64 caracteres,
// `openssl rand -hex 32`). Cada cifrado usa un IV nuevo de 12 bytes.
// Lo que se guarda en el campo `Bytes` de Prisma: [iv(12) | tag(16) | cifrado(N)].
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

export function vaultIsConfigured(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(process.env.STREAM_KEYS_MASTER ?? "");
}

function masterKey(): Buffer {
  if (!vaultIsConfigured()) throw new Error("STREAM_KEYS_MASTER falta o no son 64 caracteres hex");
  return Buffer.from(process.env.STREAM_KEYS_MASTER as string, "hex");
}

export function encryptSecret(plaintext: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, masterKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptSecret(blob: Buffer | Uint8Array): string {
  const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("encrypted blob too short");
  const decipher = createDecipheriv(ALGO, masterKey(), buf.subarray(0, IV_LEN));
  decipher.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN));
  return Buffer.concat([decipher.update(buf.subarray(IV_LEN + TAG_LEN)), decipher.final()]).toString("utf8");
}

/** Llave derivada para firmar (el `state` del OAuth): nunca se firma con la maestra directa. */
export function signingKey(purpose: string): Buffer {
  return createHmac("sha256", masterKey()).update(`sign:${purpose}`).digest();
}
