// AES-256-GCM for cookie values. The cookie's name is bound in, so values can't be swapped between cookies.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_BYTES = 12;
const TAG_BYTES = 16;

const keyFrom = (secret: string) => createHash("sha256").update(secret).digest();

export function seal(name: string, value: unknown, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(name));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function open<T>(name: string, sealed: string, secret: string): T | undefined {
  try {
    const bytes = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), bytes.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(name));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const body = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
    return JSON.parse(body.toString("utf8")) as T;
  } catch {
    return undefined;
  }
}
