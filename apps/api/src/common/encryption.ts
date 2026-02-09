import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const algo = "aes-256-gcm";

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string, secret: string): string {
  const key = getKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algo, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(payload: string, secret: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Malformed encrypted token payload");
  }
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const key = getKey(secret);
  const decipher = createDecipheriv(algo, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function decryptTokenWithFallback(payload: string, secrets: string[]): { token: string; usedSecret: string } {
  const uniqueSecrets = [...new Set(secrets.map((secret) => String(secret ?? "").trim()).filter(Boolean))];
  if (uniqueSecrets.length === 0) {
    throw new Error("No encryption key configured");
  }

  let lastError: unknown;
  for (const secret of uniqueSecrets) {
    try {
      return { token: decryptToken(payload, secret), usedSecret: secret };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Token decryption failed");
}
