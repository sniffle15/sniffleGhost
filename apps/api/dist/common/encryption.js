"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.decryptTokenWithFallback = decryptTokenWithFallback;
const crypto_1 = require("crypto");
const algo = "aes-256-gcm";
function getKey(secret) {
    return (0, crypto_1.createHash)("sha256").update(secret).digest();
}
function encryptToken(token, secret) {
    const key = getKey(secret);
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)(algo, key, iv);
    const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}
function decryptToken(payload, secret) {
    const [ivHex, tagHex, encryptedHex] = payload.split(":");
    if (!ivHex || !tagHex || !encryptedHex) {
        throw new Error("Malformed encrypted token payload");
    }
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const key = getKey(secret);
    const decipher = (0, crypto_1.createDecipheriv)(algo, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
function decryptTokenWithFallback(payload, secrets) {
    const uniqueSecrets = [...new Set(secrets.map((secret) => String(secret ?? "").trim()).filter(Boolean))];
    if (uniqueSecrets.length === 0) {
        throw new Error("No encryption key configured");
    }
    let lastError;
    for (const secret of uniqueSecrets) {
        try {
            return { token: decryptToken(payload, secret), usedSecret: secret };
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Token decryption failed");
}
//# sourceMappingURL=encryption.js.map